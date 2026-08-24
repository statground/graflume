import { resolvePerformanceSettings } from '../data/performance.js';
import { registerAxisTooltipIndex } from '../interaction/axis-hit-test.js';
import { group, nodeBase } from '../scene/factory.js';
import { countSceneNodes } from '../scene/walk.js';
import type { Scene, SceneNode, TextNode } from '../scene/types.js';
import type { AxisId, ChartSpec, NormalizedAxisSpec, NormalizedChartSpec } from '../spec/types.js';
import { normalizeSpec } from '../spec/normalize.js';
import { categoricalColor } from '../theme/color.js';
import { defaultThemeId } from '../theme/defaults.js';
import type { ThemeTokens } from '../theme/types.js';
import type { RuntimeRegistry } from '../runtime/registry.js';
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
import {
  compileLegend,
  legendExternalInsets,
  legendItemToggleable,
  registerLegendLayout,
  resolveLegendModel,
} from './legend.js';

export interface CompileOptions {
  readonly width?: number;
  readonly height?: number;
}

export interface CompileResult {
  readonly scene: Scene;
  readonly spec: NormalizedChartSpec;
  readonly theme: ThemeTokens;
}

export interface CompileRuntimeState extends DecorationRuntimeState {
  readonly hiddenLegendItemIds?: ReadonlySet<string>;
}

const AXIS_ORDER = ['x', 'x2', 'y', 'y2'] as const;

interface ActiveAxis {
  readonly id: AxisId;
  readonly axis: NormalizedAxisSpec | false;
  readonly scale: NonNullable<ScaleResolution['axes'][AxisId]>['scale'];
  readonly title: string;
}

function activeAxes(scales: ScaleResolution): readonly ActiveAxis[] {
  return AXIS_ORDER.flatMap((id) => {
    const resolved = scales.axes[id];
    if (resolved === undefined) return [];
    const layerData = resolved.layers.find(({ layer }) => !isAxislessLayer(layer));
    if (layerData === undefined) return [];
    const encoding = resolved.channel === 'x' ? layerData.layer.x : layerData.layer.y;
    return [{ id, axis: encoding.axis, scale: resolved.scale, title: encoding.title }];
  });
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

export function compileWithRegistry(
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
  let scales = resolveScales(spec, layout.plot);
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
    scales = resolveScales(spec, layout.plot);
    axes = activeAxes(scales);
  }
  const totalRows = scales.layers.reduce((sum, layer) => sum + layer.table.length, 0);
  const performance = resolvePerformanceSettings(spec.performance, totalRows, layout.plot.width);

  const axisNodes: SceneNode[] = axes.flatMap((axis) =>
    compileAxis(axisContext(axis, layout.plot, theme, spec.locale)),
  );

  const groupedBarLayers = new Map<string, readonly (typeof scales.layers)[number][]>();
  for (const layerData of scales.layers) {
    if (layerData.layer.mark.type !== 'bar' || layerData.layer.mark.position !== 'group') continue;
    const key = `${layerData.layer.mark.orientation}:${layerData.xAxisId}:${layerData.yAxisId}`;
    groupedBarLayers.set(
      key,
      scales.layers.filter(
        (candidate) =>
          candidate.layer.mark.type === 'bar' &&
          candidate.layer.mark.position === 'group' &&
          candidate.layer.mark.orientation === layerData.layer.mark.orientation &&
          candidate.xAxisId === layerData.xAxisId &&
          candidate.yAxisId === layerData.yAxisId,
      ),
    );
  }
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
    const barGroupKey = `${layerData.layer.mark.orientation}:${layerData.xAxisId}:${layerData.yAxisId}`;
    const barLayers = groupedBarLayers.get(barGroupKey) ?? [];
    const barGroupIndex = barLayers.findIndex(({ layer }) => layer.id === layerData.layer.id);
    const compiler = registry.mark(layerData.layer.mark.type);
    const compiledChildren = compiler({
      ...layerData,
      xScale: layerData.xScale,
      yScale: layerData.yScale,
      plot: layout.plot,
      theme,
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
    return group(`${layerData.layer.id}:group`, children, {
      zIndex: layerData.layer.zIndex,
      clip: layout.plot,
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
  const children: SceneNode[] = [
    ...panelNode,
    ...decorations.underlay,
    ...axisNodes,
    ...layerGroups,
    ...plotBoxNode,
    ...decorations.overlay,
    ...legend.nodes,
    ...titleNodes(spec, theme, width, layout.plot, layout.titleY, layout.subtitleY),
  ];
  const root = group('scene:root', children);
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
        const description = [base, annotationText].filter(Boolean).join('. ');
        const legendText =
          legendModel === null
            ? ''
            : `${legendModel.spec.title ?? 'Legend'}: ${legendModel.items
                .slice(0, 12)
                .map((item) => item.label)
                .join(', ')}`;
        const accessibleDescription = [description, legendText].filter(Boolean).join('. ');
        return accessibleDescription === '' ? {} : { description: accessibleDescription };
      })(),
    },
    metadata: {
      rowCount: totalRows,
      renderedNodeCount: countSceneNodes(root),
      performanceProfile: performance.profile,
      hitTestingEnabled: performance.enableHitTesting,
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
      const horizontal = axis === 'x' || axis === 'x2';
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
      ...(activeAxis === undefined || activeAxis.axis === false
        ? {}
        : { position: activeAxis.axis.position }),
      plot: layout.plot,
      axisVisible,
      axisStripSize: Math.max(0, axisStripSize),
      targets: collectAxisTooltipTargets({
        axis,
        layerGroups,
        scales,
        plot: layout.plot,
        performance,
        datumVisible,
      }),
    });
  }

  return { scene, spec, theme };
}
