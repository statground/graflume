import { resolvePerformanceSettings } from '../data/performance.js';
import { registerAxisTooltipIndex } from '../interaction/axis-hit-test.js';
import { group, nodeBase } from '../scene/factory.js';
import { countSceneNodes } from '../scene/walk.js';
import type { Scene, SceneNode, TextNode } from '../scene/types.js';
import type { AxisId, ChartSpec, NormalizedAxisSpec, NormalizedChartSpec } from '../spec/types.js';
import { normalizeSpec } from '../spec/normalize.js';
import type { ThemeTokens } from '../theme/types.js';
import type { RuntimeRegistry } from '../runtime/registry.js';
import {
  compileAxis,
  measureAxisGutter,
  measureAxisLabelGutter,
  type AxisCompileContext,
} from './axis.js';
import { collectAxisTooltipTargets } from './axis-tooltip.js';
import { resolveScales, type ScaleResolution } from './domain.js';
import { createLayout } from './layout.js';

export interface CompileOptions {
  readonly width?: number;
  readonly height?: number;
}

export interface CompileResult {
  readonly scene: Scene;
  readonly spec: NormalizedChartSpec;
  readonly theme: ThemeTokens;
}

const AXISLESS_MARKS = new Set([
  'arc-diagram',
  'calendar',
  'chord',
  'funnel',
  'gauge',
  'geo-flow',
  'geo-heatmap',
  'geo-line',
  'graph',
  'geo',
  'item',
  'map',
  'org',
  'packed-bubble',
  'parallel',
  'pie',
  'radar',
  'sankey',
  'solid-gauge',
  'sunburst',
  'table',
  'tiled-map',
  'tilemap',
  'tree',
  'treemap',
  'venn',
  'word-cloud',
  'word-tree',
]);

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
    const layerData = resolved.layers.find(({ layer }) => !AXISLESS_MARKS.has(layer.mark.type));
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
  titleY: number,
  subtitleY: number,
): readonly SceneNode[] {
  if (spec.title === undefined) return [];
  const align = spec.title.align ?? 'left';
  const x =
    align === 'left'
      ? spec.padding.left
      : align === 'right'
        ? width - spec.padding.right
        : width / 2;
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
      fontWeight: 700,
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
      fill: theme.colors.mutedText,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.subtitleSize,
      fontWeight: 400,
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
): CompileResult {
  const spec = normalizeSpec(input);
  const width = Math.max(1, spec.width === 'container' ? (options.width ?? 640) : spec.width);
  const height = Math.max(1, spec.height === 'container' ? (options.height ?? 400) : spec.height);
  const theme = registry.themes.resolve(spec.theme);
  let layout = createLayout(spec, width, height, theme);
  let scales = resolveScales(spec, layout.plot);
  let axes = activeAxes(scales);
  const minimumInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const axis of axes) {
    if (axis.axis === false || axis.axis.visible === false) continue;
    const required = measureAxisGutter(axisContext(axis, layout.plot, theme, spec.locale));
    minimumInsets[axis.axis.position] = Math.max(minimumInsets[axis.axis.position], required);
  }
  const measuredLayout = createLayout(spec, width, height, theme, minimumInsets);
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
  const layerGroups: SceneNode[] = scales.layers.map((layerData, layerIndex) => {
    const color =
      theme.colors.palette[layerIndex % theme.colors.palette.length] ?? theme.colors.focus;
    const barGroupKey = `${layerData.layer.mark.orientation}:${layerData.xAxisId}:${layerData.yAxisId}`;
    const barLayers = groupedBarLayers.get(barGroupKey) ?? [];
    const barGroupIndex = barLayers.findIndex(({ layer }) => layer.id === layerData.layer.id);
    const compiler = registry.mark(layerData.layer.mark.type);
    const children = compiler({
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
    return group(`${layerData.layer.id}:group`, children, {
      zIndex: layerData.layer.zIndex,
      clip: layout.plot,
    });
  });

  const children: SceneNode[] = [
    ...axisNodes,
    ...layerGroups,
    ...titleNodes(spec, theme, width, layout.titleY, layout.subtitleY),
  ];
  const root = group('scene:root', children);
  const scene: Scene = {
    width,
    height,
    background: theme.colors.background,
    root,
    accessibility: {
      label: accessibilityLabel(spec, totalRows),
      ...(spec.accessibility.description === undefined
        ? spec.description === undefined
          ? {}
          : { description: spec.description }
        : { description: spec.accessibility.description }),
    },
    metadata: {
      rowCount: totalRows,
      renderedNodeCount: countSceneNodes(root),
      performanceProfile: performance.profile,
      hitTestingEnabled: performance.enableHitTesting,
    },
  };

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
      const fontSize = context.axis.labels.font.size ?? theme.typography.fontSize;
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
      }),
    });
  }

  return { scene, spec, theme };
}
