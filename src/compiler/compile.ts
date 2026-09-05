import { resolvePerformanceSettings } from '../data/performance.js';
import { GraflumeError } from '../core/errors.js';
import { materializeSpecDataflow } from '../data/dataflow.js';
import { registerAxisTooltipIndex } from '../interaction/axis-hit-test.js';
import { BandScale } from '../scale/band.js';
import { compileAnalyticSelectionOverlay } from '../interaction/analytic-overlay.js';
import {
  analyticSelectionVersion,
  type AnalyticSelection,
  type AnalyticSelectionState,
} from '../interaction/analytic-selection.js';
import type { CartesianCoordinateContext } from '../interaction/cartesian-coordinates.js';
import type { DomainViewState } from '../interaction/domain-navigation.js';
import { group, nodeBase } from '../scene/factory.js';
import { countSceneNodes } from '../scene/walk.js';
import type { Rect, Scene, SceneNode, TextNode } from '../scene/types.js';
import type { AxisId, ChartSpec, NormalizedAxisSpec, NormalizedChartSpec } from '../spec/types.js';
import { isCompositionSpec } from '../spec/composition.js';
import { normalizeSpec } from '../spec/normalize.js';
import { categoricalColor } from '../theme/color.js';
import { defaultThemeId } from '../theme/defaults.js';
import type { ThemeTokens } from '../theme/types.js';
import type { RuntimeRegistry } from '../runtime/registry.js';
import type { DataLineage } from '../data/transforms.js';
import { buildSemanticIndex } from '../scene/semantic.js';
import { resolveAnalyticalFamilySceneMetadata } from '../marks/analytical-p0.js';
import {
  compileAxis,
  measureAxisGutter,
  measureAxisLabelGutter,
  type AxisCompileContext,
} from './axis.js';
import { collectAxisTooltipTargets } from './axis-tooltip.js';
import { isAxislessLayer } from './coordinate.js';
import { resolveScales, type ScaleResolution } from './domain.js';
import { createLayout } from './layout.js';
import { compileDecorations, type DecorationRuntimeState } from './decorations.js';
import { compileMarkLabels, type MarkLabelRuntimeState } from './mark-labels.js';
import {
  compileLegend,
  legendExternalInsets,
  legendItemToggleable,
  registerLegendLayout,
  resolveLegendModel,
} from './legend.js';
import { compileCompositionWithRegistry } from './composition.js';
import { filterScaleResolutionByAnalyticSelection } from './analytic-filter.js';
import { materializeTechnicalIndicatorPanes } from './technical-indicator-panels.js';

export interface CompileOptions {
  readonly width?: number;
  readonly height?: number;
}

export interface CompileResult {
  readonly scene: Scene;
  readonly spec: NormalizedChartSpec;
  readonly theme: ThemeTokens;
  readonly dataLineage: Readonly<Record<string, DataLineage>>;
  /** Resolved Cartesian scales for deterministic pixel/domain interaction. */
  readonly coordinates: CartesianCoordinateContext;
  /** Leaf coordinate systems in a composed scene, with scene-space offsets. */
  readonly coordinateViews: readonly CompileCoordinateView[];
}

export interface CompileCoordinateView {
  readonly id: string;
  readonly label: string;
  readonly bounds: Rect;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly coordinates: CartesianCoordinateContext;
}

export interface CompileRuntimeState extends DecorationRuntimeState, MarkLabelRuntimeState {
  readonly hiddenLegendItemIds?: ReadonlySet<string>;
  readonly analyticSelection?: AnalyticSelectionState;
  readonly analyticSelectionDraft?: AnalyticSelection;
  readonly domainView?: DomainViewState;
  readonly technicalCrosshairValue?: number | string;
}

interface ActiveAxis {
  readonly id: AxisId;
  readonly channel: 'x' | 'y';
  readonly axis: NormalizedAxisSpec | false;
  readonly scale: NonNullable<ScaleResolution['axes'][AxisId]>['scale'];
  readonly title: string;
}

function activeAxes(scales: ScaleResolution): readonly ActiveAxis[] {
  return Object.values(scales.axes).flatMap((resolved) => {
    if (resolved === undefined) return [];
    const layerData = resolved.layers.find(({ layer }) => !isAxislessLayer(layer));
    if (layerData === undefined) return [];
    const encoding = resolved.channel === 'x' ? layerData.layer.x : layerData.layer.y;
    return [
      {
        id: resolved.id,
        channel: resolved.channel,
        axis: encoding.axis,
        scale: resolved.scale,
        title: encoding.title,
      },
    ];
  });
}

function intersectRects(left: Rect, right: Rect): Rect {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const endX = Math.min(left.x + left.width, right.x + right.width);
  const endY = Math.min(left.y + left.height, right.y + right.height);
  return { x, y, width: Math.max(0, endX - x), height: Math.max(0, endY - y) };
}

function resolveLayerClip(
  layerData: ScaleResolution['layers'][number],
  scales: ScaleResolution,
  plot: Rect,
): Rect | undefined {
  const authored = layerData.layer.clip;
  if (authored === false) return undefined;
  if (authored === true) return plot;
  if (authored.type === 'plot') {
    return intersectRects(plot, {
      x: plot.x + authored.x * plot.width,
      y: plot.y + authored.y * plot.height,
      width: authored.width * plot.width,
      height: authored.height * plot.height,
    });
  }
  const mapped = (
    channel: 'x' | 'y',
    range: NonNullable<(typeof authored)['x']>,
  ): readonly [number, number] => {
    const id = range.axis ?? (channel === 'x' ? layerData.xAxisId : layerData.yAxisId);
    const resolved = scales.axes[id];
    if (resolved === undefined || resolved.channel !== channel) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Layer "${layerData.layer.id}" clip references unresolved ${channel}-axis "${id}".`,
        { path: `$.layers[${layerData.layer.id}].clip.${channel}.axis` },
      );
    }
    const from = resolved.scale.map(range.from);
    const to = resolved.scale.map(range.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Layer "${layerData.layer.id}" clip range cannot be mapped on axis "${id}".`,
        { path: `$.layers[${layerData.layer.id}].clip.${channel}` },
      );
    }
    return [Math.min(from, to), Math.max(from, to)];
  };
  const x =
    authored.x === undefined ? ([plot.x, plot.x + plot.width] as const) : mapped('x', authored.x);
  const y =
    authored.y === undefined ? ([plot.y, plot.y + plot.height] as const) : mapped('y', authored.y);
  return intersectRects(plot, { x: x[0], y: y[0], width: x[1] - x[0], height: y[1] - y[0] });
}

function axisContext(
  axis: ActiveAxis,
  plot: AxisCompileContext['plot'],
  theme: ThemeTokens,
  locale: string | undefined,
): AxisCompileContext {
  return {
    ...axis,
    plot,
    theme,
    ...(locale === undefined ? {} : { locale }),
  };
}

function samePlot(left: AxisCompileContext['plot'], right: AxisCompileContext['plot']): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function titleNodes(
  spec: NormalizedChartSpec,
  theme: ThemeTokens,
  width: number,
  plot: AxisCompileContext['plot'],
  titleY: number,
  subtitleY: number,
): readonly SceneNode[] {
  if (spec.title === undefined) return [];
  const align = spec.title.align ?? 'left';
  const titleLeft = theme.typography.titlePosition === 'panel' ? plot.x : spec.padding.left;
  const titleRight =
    theme.typography.titlePosition === 'panel' ? plot.x + plot.width : width - spec.padding.right;
  const x =
    align === 'left' ? titleLeft : align === 'right' ? titleRight : (titleLeft + titleRight) / 2;
  const canvasAlign: CanvasTextAlign = align;
  const nodes: TextNode[] = [
    {
      type: 'text',
      ...nodeBase('chart:title', { zIndex: 200 }),
      x,
      y: titleY,
      text: spec.title.text,
      fill: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.titleSize,
      fontWeight: theme.typography.titleWeight ?? 700,
      align: canvasAlign,
      baseline: 'top',
      rotation: 0,
    },
  ];
  if (spec.title.subtitle !== undefined) {
    nodes.push({
      type: 'text',
      ...nodeBase('chart:subtitle', { zIndex: 200 }),
      x,
      y: subtitleY,
      text: spec.title.subtitle,
      fill: theme.colors.subtitle ?? theme.colors.mutedText,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.subtitleSize,
      fontWeight: theme.typography.subtitleWeight ?? 400,
      align: canvasAlign,
      baseline: 'top',
      rotation: 0,
    });
  }
  return nodes;
}

function accessibilityLabel(spec: NormalizedChartSpec, rowCount: number): string {
  if (spec.accessibility.label !== undefined) return spec.accessibility.label;
  const title = spec.title?.text ?? 'Graflume chart';
  const layerSummary = `${spec.layers.length} ${spec.layers.length === 1 ? 'layer' : 'layers'}`;
  const rowSummary = `${rowCount.toLocaleString()} ${rowCount === 1 ? 'row' : 'rows'}`;
  return `${title}. ${layerSummary}, ${rowSummary}.`;
}

function compileUnitWithRegistry(
  input: ChartSpec,
  registry: RuntimeRegistry,
  options: CompileOptions = {},
  runtime: CompileRuntimeState = {},
): CompileResult {
  const theme = registry.themes.resolve(input.theme ?? defaultThemeId);
  const spec = normalizeSpec(input, theme);
  const width = Math.max(1, spec.width === 'container' ? (options.width ?? 640) : spec.width);
  const height = Math.max(1, spec.height === 'container' ? (options.height ?? 400) : spec.height);
  const legendModel = resolveLegendModel(spec, theme, width, height);
  const legendInsets = legendExternalInsets(legendModel);
  let layout = createLayout(spec, width, height, theme, {}, legendInsets);
  let scales = resolveScales(spec, layout.plot, runtime.domainView?.axes);
  let axes = activeAxes(scales);
  const minimumInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const axis of axes) {
    if (axis.axis === false || axis.axis.visible === false) continue;
    const required = measureAxisGutter(axisContext(axis, layout.plot, theme, spec.locale));
    minimumInsets[axis.axis.position] = Math.max(minimumInsets[axis.axis.position], required);
  }
  const measuredLayout = createLayout(spec, width, height, theme, minimumInsets, legendInsets);
  if (!samePlot(layout.plot, measuredLayout.plot)) {
    layout = measuredLayout;
    scales = resolveScales(spec, layout.plot, runtime.domainView?.axes);
    axes = activeAxes(scales);
  }
  if (
    spec.interaction.selection !== false &&
    spec.interaction.selection.filter &&
    runtime.analyticSelection !== undefined
  ) {
    scales = filterScaleResolutionByAnalyticSelection(scales, runtime.analyticSelection).scales;
    axes = activeAxes(scales);
  }
  const totalRows = scales.layers.reduce((sum, layer) => sum + layer.table.length, 0);
  const dataLineage = Object.fromEntries(
    scales.layers.map(({ layer, lineage }) => [layer.id, lineage]),
  );
  const performance = resolvePerformanceSettings(spec.performance, totalRows, layout.plot.width);

  const axisNodes: SceneNode[] = axes.flatMap((axis) =>
    compileAxis(axisContext(axis, layout.plot, theme, spec.locale)),
  );

  // A shared category lane groups bars even when their value axes use different units.
  // Keep independent category axes and incompatible domains in separate groups.
  const barCategoryKey = (data: (typeof scales.layers)[number]): string => {
    const horizontal = data.layer.mark.orientation === 'horizontal';
    const scale = horizontal ? data.yScale : data.xScale;
    return JSON.stringify([
      data.layer.mark.orientation,
      horizontal ? data.yAxisId : data.xAxisId,
      scale.kind,
      scale.domain(),
      scale.range(),
    ]);
  };
  const hiddenLegendItems = runtime.hiddenLegendItemIds ?? new Set<string>();
  const hiddenLayerIds = new Set(
    (legendModel?.items ?? [])
      .filter(
        (item) =>
          hiddenLegendItems.has(item.id) &&
          legendModel !== null &&
          legendItemToggleable(legendModel, item) &&
          item.layerId !== undefined &&
          (legendModel.mode === 'layers' || item.value === undefined),
      )
      .map((item) => item.layerId!),
  );
  const groupedBarLayers = new Map<string, (typeof scales.layers)[number][]>();
  for (const layerData of scales.layers) {
    if (
      hiddenLayerIds.has(layerData.layer.id) ||
      layerData.layer.mark.type !== 'bar' ||
      layerData.layer.mark.position !== 'group'
    )
      continue;
    const key = barCategoryKey(layerData);
    const group = groupedBarLayers.get(key) ?? [];
    group.push(layerData);
    groupedBarLayers.set(key, group);
  }
  const hiddenCategories =
    legendModel?.mode === 'categories' && legendModel.field !== undefined
      ? legendModel.items.filter(
          (item) =>
            hiddenLegendItems.has(item.id) &&
            legendItemToggleable(legendModel, item) &&
            item.value !== undefined,
        )
      : [];
  const datumVisible = (
    layerId: string,
    _rowIndex: number,
    datum: Readonly<Record<string, unknown>>,
  ): boolean => {
    if (hiddenLayerIds.has(layerId)) return false;
    if (legendModel?.field === undefined) return true;
    return !hiddenCategories.some(
      (item) =>
        (item.layerId === undefined || item.layerId === layerId) &&
        datum[legendModel.field!] === item.value,
    );
  };
  const inheritSiblingDatum = (nodes: readonly SceneNode[]): readonly SceneNode[] => {
    const nested = nodes.map((node) =>
      node.type === 'group' ? { ...node, children: inheritSiblingDatum(node.children) } : node,
    );
    const owners = new Map<string, NonNullable<SceneNode['datum']> | null>();
    for (const node of nested) {
      if (node.datum === undefined) continue;
      const suffix = node.id.slice(node.id.lastIndexOf(':') + 1);
      const prior = owners.get(suffix);
      owners.set(suffix, prior === undefined ? node.datum : null);
    }
    return nested.map((node) => {
      if (node.datum !== undefined) return node;
      const suffix = node.id.slice(node.id.lastIndexOf(':') + 1);
      const owner = owners.get(suffix);
      return owner === undefined || owner === null ? node : { ...node, datum: owner };
    });
  };
  const layerGroups: SceneNode[] = scales.layers.map((layerData, layerIndex) => {
    const color = categoricalColor(theme, layerIndex, scales.layers.length);
    const barGroupKey = barCategoryKey(layerData);
    const barLayers = groupedBarLayers.get(barGroupKey) ?? [];
    const barGroupIndex = barLayers.findIndex(({ layer }) => layer.id === layerData.layer.id);
    const compiler = registry.mark(layerData.layer.mark.type);
    const compiledChildren = compiler({
      ...layerData,
      xScale: layerData.xScale,
      yScale: layerData.yScale,
      plot: layout.plot,
      theme,
      ...(spec.locale === undefined ? {} : { locale: spec.locale }),
      tableFormatters: registry.tableFormatters,
      color,
      performance,
      barGroup: {
        count: barGroupIndex < 0 ? 1 : barLayers.length,
        index: Math.max(0, barGroupIndex),
      },
    });
    let children =
      legendModel?.mode === 'categories' &&
      legendModel.categoryToggleableLayerIds.has(layerData.layer.id)
        ? inheritSiblingDatum(compiledChildren)
        : compiledChildren;
    if (legendModel?.mode === 'categories' && legendModel.field !== undefined) {
      if (hiddenCategories.length > 0) {
        const hide = (node: SceneNode): SceneNode => {
          if (node.type === 'group') return { ...node, children: node.children.map(hide) };
          const sources: Readonly<Record<string, unknown>>[] = [];
          if (node.datum?.tooltip !== undefined) sources.push(node.datum.tooltip);
          if (node.datum?.datum !== undefined) sources.push(node.datum.datum);
          const hidden =
            sources.length > 0 &&
            sources.some(
              (datum) => !datumVisible(layerData.layer.id, node.datum?.rowIndex ?? -1, datum),
            );
          return hidden ? { ...node, visible: false } : node;
        };
        children = children.map(hide);
      }
    }
    const clip = resolveLayerClip(layerData, scales, layout.plot);
    return group(`${layerData.layer.id}:group`, children, {
      zIndex: layerData.layer.zIndex,
      ...(clip === undefined ? {} : { clip }),
      visible: !hiddenLayerIds.has(layerData.layer.id),
    });
  });

  const legend = compileLegend(
    legendModel,
    layerGroups,
    layout.plot,
    width,
    height,
    theme,
    hiddenLegendItems,
  );
  const decorations = compileDecorations({
    spec,
    layerGroups,
    scales,
    plot: layout.plot,
    theme,
    width,
    ...(legend.layout === null ? {} : { legendBounds: legend.layout.bounds }),
    runtime,
    datumVisible,
  });
  const markLabels = compileMarkLabels({
    spec,
    layerGroups,
    scales,
    plot: layout.plot,
    theme,
    runtime,
  });
  const coordinates: CartesianCoordinateContext = Object.freeze({
    plot: Object.freeze({ ...layout.plot }),
    axes: Object.freeze(
      Object.fromEntries(
        Object.values(scales.axes).flatMap((resolved) =>
          resolved === undefined ? [] : [[resolved.id, resolved.scale] as const],
        ),
      ),
    ),
    channels: Object.freeze(
      Object.fromEntries(
        Object.values(scales.axes).flatMap((resolved) =>
          resolved === undefined ? [] : [[resolved.id, resolved.channel] as const],
        ),
      ),
    ),
  });
  const analyticSelectionNodes =
    runtime.analyticSelection === undefined || spec.interaction.selection === false
      ? []
      : compileAnalyticSelectionOverlay(
          runtime.analyticSelection,
          coordinates,
          spec.interaction.selection.highlight,
        );
  const analyticSelectionDraftNodes =
    runtime.analyticSelectionDraft === undefined || spec.interaction.selection === false
      ? []
      : compileAnalyticSelectionOverlay(
          {
            version: analyticSelectionVersion,
            combine: 'union',
            selections: [runtime.analyticSelectionDraft],
          },
          coordinates,
          {
            ...spec.interaction.selection.highlight,
            opacity: Math.min(1, spec.interaction.selection.highlight.opacity * 0.72),
            dash:
              spec.interaction.selection.highlight.dash.length === 0
                ? [5, 4]
                : spec.interaction.selection.highlight.dash,
          },
          'analytic-selection:draft',
        );

  const panelNode: SceneNode[] =
    theme.colors.panel === undefined
      ? []
      : [
          {
            type: 'rect',
            ...nodeBase('chart:panel', { zIndex: -1000 }),
            x: layout.plot.x,
            y: layout.plot.y,
            width: layout.plot.width,
            height: layout.plot.height,
            fill: theme.colors.panel,
            lineWidth: 0,
            cornerRadius: 0,
          },
        ];
  const boxExcludedMarks = new Set(theme.axis.boxExcludedMarks ?? []);
  const visibleMarkTypes = spec.layers
    .filter(({ visible }) => visible)
    .map(({ mark }) => mark.type);
  const plotBoxVisible =
    theme.axis.boxVisible === true &&
    (visibleMarkTypes.length === 0 || visibleMarkTypes.some((type) => !boxExcludedMarks.has(type)));
  const plotBoxNode: SceneNode[] = plotBoxVisible
    ? [
        {
          type: 'rect',
          ...nodeBase('chart:plot-box', { zIndex: 100 }),
          x: layout.plot.x,
          y: layout.plot.y,
          width: layout.plot.width,
          height: layout.plot.height,
          stroke: theme.colors.axis,
          lineWidth: theme.axis.boxLineWidth ?? theme.axis.lineWidth,
          cornerRadius: 0,
        },
      ]
    : [];
  const technicalIndicatorLayers = scales.layers.filter(
    ({ technicalIndicator }) => technicalIndicator !== undefined,
  );
  const technicalPanelId =
    technicalIndicatorLayers.find(
      ({ technicalIndicator }) => technicalIndicator?.presentation.placement === 'panel',
    )?.technicalIndicator?.presentation.panelId ?? 'price';
  const technicalCrosshairX =
    runtime.technicalCrosshairValue === undefined
      ? undefined
      : coordinates.axes[technicalIndicatorLayers[0]?.xAxisId ?? 'x']?.map(
          runtime.technicalCrosshairValue,
        );
  const technicalCrosshairNodes: SceneNode[] =
    technicalIndicatorLayers.length === 0 ||
    technicalCrosshairX === undefined ||
    !Number.isFinite(technicalCrosshairX) ||
    technicalCrosshairX < layout.plot.x ||
    technicalCrosshairX > layout.plot.x + layout.plot.width
      ? []
      : [
          {
            type: 'line',
            ...nodeBase(`technical-crosshair:${technicalPanelId}`, {
              zIndex: 850,
              opacity: 0.72,
            }),
            x1: technicalCrosshairX,
            y1: layout.plot.y,
            x2: technicalCrosshairX,
            y2: layout.plot.y + layout.plot.height,
            stroke: theme.colors.text,
            lineWidth: 1,
            dash: [4, 3],
          },
        ];
  const children: SceneNode[] = [
    ...panelNode,
    ...decorations.underlay,
    ...axisNodes,
    ...layerGroups,
    ...plotBoxNode,
    ...markLabels.nodes,
    ...decorations.overlay,
    ...analyticSelectionNodes,
    ...analyticSelectionDraftNodes,
    ...technicalCrosshairNodes,
    ...legend.nodes,
    ...titleNodes(spec, theme, width, layout.plot, layout.titleY, layout.subtitleY),
  ];
  const root = group('scene:root', children);
  const semanticIndex = buildSemanticIndex(
    root,
    scales.layers,
    spec.accessibility.maxRows,
    spec.locale,
  );
  const scene: Scene = {
    width,
    height,
    background: theme.colors.background,
    root,
    accessibility: {
      label: accessibilityLabel(spec, totalRows),
      ...(() => {
        const base = spec.accessibility.description ?? spec.description;
        const annotationText = (runtime.annotations ?? spec.annotations)
          .map((annotation) =>
            annotation.detail === undefined
              ? annotation.text
              : `${annotation.text}: ${annotation.detail}`,
          )
          .join('. ');
        const markLabelText =
          markLabels.entries.length === 0
            ? ''
            : `Mark labels: ${markLabels.entries
                .slice(0, 20)
                .map((entry) => entry.text)
                .join(', ')}${markLabels.entries.length > 20 ? ', and more' : ''}`;
        const authoringText =
          spec.markLabels !== false && spec.markLabels.authoring !== false
            ? 'Label authoring is enabled. Press Enter to select a label, use arrow keys to move it, Escape to clear the handle, and Control or Command Z to undo.'
            : '';
        const selectionAuthoringText =
          spec.interaction.selection !== false &&
          spec.interaction.selection.kind !== 'point' &&
          spec.interaction.selection.keyboard
            ? `Keyboard ${spec.interaction.selection.kind} selection is enabled. Press S to start, use arrow keys to shape the selection${
                spec.interaction.selection.kind === 'lasso'
                  ? ', Space to add each lasso vertex'
                  : ''
              }, Enter to apply, and Escape to cancel.`
            : '';
        const description = [
          base,
          spec.accessibility.summary,
          annotationText,
          markLabelText,
          authoringText,
          selectionAuthoringText,
        ]
          .filter(Boolean)
          .join('. ');
        const legendText =
          legendModel === null
            ? ''
            : `${legendModel.spec.title ?? 'Legend'}: ${legendModel.items
                .slice(0, 12)
                .map((item) => item.label)
                .join(', ')}`;
        const provenanceText = scales.layers
          .filter(({ lineage }) => lineage.transforms.length > 0)
          .map(({ lineage }) => lineage.summary)
          .join(' ');
        const accessibleDescription = [description, legendText, provenanceText]
          .filter(Boolean)
          .join('. ');
        return accessibleDescription === '' ? {} : { description: accessibleDescription };
      })(),
    },
    semanticIndex,
    metadata: {
      rowCount: totalRows,
      renderedNodeCount: countSceneNodes(root),
      performanceProfile: performance.profile,
      hitTestingEnabled: performance.enableHitTesting,
      dataLineage: scales.layers.map(({ lineage }) => lineage.summary),
      ...(decorations.annotations.length === 0
        ? {}
        : {
            annotations: {
              entries: decorations.annotations,
              ...(runtime.activeAnnotationId === undefined
                ? {}
                : { activeId: runtime.activeAnnotationId }),
            },
          }),
      ...(scales.layers.some(({ technicalIndicator }) => technicalIndicator !== undefined)
        ? {
            technicalIndicators: scales.layers.flatMap(({ layer, technicalIndicator }) =>
              technicalIndicator === undefined
                ? []
                : [
                    {
                      layerId: layer.id,
                      id: technicalIndicator.capability.id,
                      kind: technicalIndicator.capability.kind,
                      requiredInputs: [...technicalIndicator.capability.requiredInputs],
                      outputFields: technicalIndicator.capability.outputs.map((role) =>
                        role === 'value' ? layer.y.field : (layer.mark.fields[role] ?? role),
                      ),
                      warmUpRows: technicalIndicator.warmUpRows,
                      parameters: { ...technicalIndicator.parameters },
                      provenance: technicalIndicator.provenance,
                      session: {
                        mode: technicalIndicator.session.mode,
                        reset: technicalIndicator.session.reset,
                        boundaries: [...technicalIndicator.session.boundaries],
                      },
                      presentation: {
                        placement: technicalIndicator.presentation.placement,
                        panelId: technicalIndicator.presentation.panelId,
                        synchronizedCrosshair: {
                          axis: technicalIndicator.presentation.synchronizedCrosshair.axis,
                          sharedDomain:
                            technicalIndicator.presentation.synchronizedCrosshair.sharedDomain,
                          fields: technicalIndicator.presentation.synchronizedCrosshair.fields.map(
                            (role) =>
                              role === 'value' ? layer.y.field : (layer.mark.fields[role] ?? role),
                          ),
                        },
                      },
                    },
                  ],
            ),
            technicalIndicatorPanels: [
              {
                id: technicalPanelId,
                bounds: { ...layout.plot },
                layerIds: scales.layers.map(({ layer }) => layer.id),
                placement: technicalPanelId === 'price' ? 'price' : 'indicator',
              },
            ],
            ...(technicalCrosshairX === undefined || !Number.isFinite(technicalCrosshairX)
              ? {}
              : {
                  technicalIndicatorCrosshair: {
                    value: runtime.technicalCrosshairValue!,
                    panelIds: [technicalPanelId],
                    positions: [{ panelId: technicalPanelId, x: technicalCrosshairX }],
                  },
                }),
          }
        : {}),
      ...(() => {
        const analyticalFamilies = scales.layers.flatMap(({ layer }) => {
          const metadata = resolveAnalyticalFamilySceneMetadata(layer);
          return metadata === null ? [] : [metadata];
        });
        return analyticalFamilies.length === 0 ? {} : { analyticalFamilies };
      })(),
      ...(spec.markLabels === false
        ? {}
        : {
            markLabels: {
              entries: markLabels.entries,
              plot: { ...layout.plot },
              ...(runtime.activeMarkLabelId === undefined
                ? {}
                : { activeId: runtime.activeMarkLabelId }),
            },
          }),
    },
  };
  registerLegendLayout(scene, legend.layout);

  const tooltip = spec.interaction.tooltip;
  if (tooltip !== false && tooltip.trigger === 'axis' && tooltip.axis !== undefined) {
    const axis = tooltip.axis;
    const activeAxis = axes.find((candidate) => candidate.id === axis);
    const axisVisible =
      activeAxis !== undefined && activeAxis.axis !== false && activeAxis.axis.visible;
    const context =
      activeAxis === undefined
        ? undefined
        : axisContext(activeAxis, layout.plot, theme, spec.locale);
    let axisStripSize = context === undefined ? 0 : measureAxisLabelGutter(context);
    if (
      context !== undefined &&
      context.axis !== false &&
      (context.axis.labels.angle ?? 0) === 0 &&
      (context.axis.labels.orientation === 'auto' ||
        context.axis.labels.orientation === 'horizontal')
    ) {
      const horizontal = activeAxis?.channel === 'x';
      const tickSize = context.axis.ticks.visible
        ? (context.axis.ticks.size ?? theme.axis.tickLength)
        : 0;
      const labelPadding = context.axis.labels.padding ?? theme.axis.labelPadding;
      const fontSize =
        context.axis.labels.font.size ??
        theme.typography.axisLabelSize ??
        theme.typography.fontSize;
      const readableStrip =
        context.axis.offset + tickSize + labelPadding + fontSize * (horizontal ? 1.5 : 4);
      axisStripSize = Math.min(axisStripSize, readableStrip);
    }
    registerAxisTooltipIndex(scene, {
      axis,
      channel: activeAxis?.channel ?? 'x',
      ...(activeAxis === undefined || activeAxis.axis === false
        ? {}
        : { position: activeAxis.axis.position }),
      plot: layout.plot,
      axisVisible,
      axisStripSize: Math.max(0, axisStripSize),
      ...(activeAxis?.scale instanceof BandScale ? { categoryStep: activeAxis.scale.step } : {}),
      targets: collectAxisTooltipTargets({
        axis,
        channel: activeAxis?.channel ?? 'x',
        layerGroups,
        scales,
        plot: layout.plot,
        performance,
        datumVisible,
      }),
    });
  }

  return {
    scene,
    spec,
    theme,
    dataLineage,
    coordinates,
    coordinateViews: [
      {
        id: 'plot',
        label: '',
        bounds: { ...coordinates.plot },
        offsetX: 0,
        offsetY: 0,
        coordinates,
      },
    ],
  };
}

export function compileWithRegistry(
  input: ChartSpec,
  registry: RuntimeRegistry,
  options: CompileOptions = {},
  runtime: CompileRuntimeState = {},
): CompileResult {
  input = materializeSpecDataflow(input);
  if (!isCompositionSpec(input)) input = materializeTechnicalIndicatorPanes(input);
  if (!isCompositionSpec(input)) return compileUnitWithRegistry(input, registry, options, runtime);
  return compileCompositionWithRegistry(input, registry, options, runtime, {
    compile: compileWithRegistry,
    compileUnit: compileUnitWithRegistry,
  });
}
