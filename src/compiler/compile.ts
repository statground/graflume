import { resolvePerformanceSettings } from '../data/performance.js';
import { group, nodeBase } from '../scene/factory.js';
import { countSceneNodes } from '../scene/walk.js';
import type { Scene, SceneNode, TextNode } from '../scene/types.js';
import type { ChartSpec, NormalizedChartSpec } from '../spec/types.js';
import { normalizeSpec } from '../spec/normalize.js';
import type { ThemeTokens } from '../theme/types.js';
import type { RuntimeRegistry } from '../runtime/registry.js';
import { compileXAxis, compileYAxis } from './axis.js';
import { resolveScales } from './domain.js';
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

function titleNodes(
  spec: NormalizedChartSpec,
  theme: ThemeTokens,
  width: number,
  titleY: number,
  subtitleY: number,
): readonly SceneNode[] {
  if (spec.title === undefined) return [];
  const align = spec.title.align ?? 'left';
  const x = align === 'left' ? spec.padding.left : align === 'right' ? width - spec.padding.right : width / 2;
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
  const layout = createLayout(spec, width, height, theme);
  const scales = resolveScales(spec, layout.plot);
  const totalRows = scales.layers.reduce((sum, layer) => sum + layer.table.length, 0);
  const performance = resolvePerformanceSettings(spec.performance, totalRows, layout.plot.width);

  const axisNodes: SceneNode[] = [
    ...compileXAxis({
      axis: scales.layers[0]?.layer.x.axis ?? spec.axes.x,
      scale: scales.xScale,
      plot: layout.plot,
      theme,
      title: scales.layers[0]?.layer.x.title ?? '',
      ...(spec.locale === undefined ? {} : { locale: spec.locale }),
    }),
    ...compileYAxis({
      axis: scales.layers[0]?.layer.y.axis ?? spec.axes.y,
      scale: scales.yScale,
      plot: layout.plot,
      theme,
      title: scales.layers[0]?.layer.y.title ?? '',
      ...(spec.locale === undefined ? {} : { locale: spec.locale }),
    }),
  ];

  const barLayers = scales.layers.filter(
    ({ layer }) => layer.mark.type === 'bar' && layer.mark.position === 'group',
  );
  const layerGroups: SceneNode[] = scales.layers.map((layerData, layerIndex) => {
    const color =
      theme.colors.palette[layerIndex % theme.colors.palette.length] ?? theme.colors.focus;
    const barGroupIndex = barLayers.findIndex(({ layer }) => layer.id === layerData.layer.id);
    const compiler = registry.mark(layerData.layer.mark.type);
    const children = compiler({
      ...layerData,
      xScale: scales.xScale,
      yScale: scales.yScale,
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
    },
  };

  return { scene, spec, theme };
}
