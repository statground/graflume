import {
  quickChart,
  quickCombo,
  type QuickChartOptions,
  type QuickComboOptions,
} from './api/quick.js';
import { additionalChartTypeCatalog } from './catalog/additional-chart-types.js';
import { chartTypeCatalog } from './catalog/chart-types.js';
import {
  compileWithRegistry,
  type CompileOptions,
  type CompileResult,
} from './compiler/compile.js';
import type { MarkCompiler } from './compiler/types.js';
import type { GraflumePlugin } from './core/plugin.js';
import {
  compileBoxplotMark,
  compileChordMark,
  compileCustomMark,
  compileEffectScatterMark,
  compileFunnelMark,
  compileGraphMark,
  compileHeatmapMark,
  compileLinesMark,
  compileParallelMark,
  compilePictorialBarMark,
  compileRadarMark,
  compileSunburstMark,
  compileThemeRiverMark,
  compileTreeMark,
} from './marks/advanced.js';
import type { RendererFactory } from './renderer/types.js';
import { Chart, type ChartCreateOptions, type ChartTarget } from './runtime/chart.js';
import { createDefaultRegistry } from './runtime/default-registry.js';
import type { RuntimeRegistry } from './runtime/registry.js';
import type { ChartSpec, DataInput, MarkType } from './spec/types.js';
import type { ThemeTokens } from './theme/types.js';

const additionalMarkCompilers: readonly (readonly [MarkType, MarkCompiler])[] = [
  ['radar', compileRadarMark],
  ['tree', compileTreeMark],
  ['graph', compileGraphMark],
  ['chord', compileChordMark],
  ['funnel', compileFunnelMark],
  ['parallel', compileParallelMark],
  ['boxplot', compileBoxplotMark],
  ['effect-scatter', compileEffectScatterMark],
  ['lines', compileLinesMark],
  ['heatmap', compileHeatmapMark],
  ['pictorial-bar', compilePictorialBarMark],
  ['theme-river', compileThemeRiverMark],
  ['sunburst', compileSunburstMark],
  ['custom', compileCustomMark],
];

function installAdditionalMarks(registry: RuntimeRegistry): void {
  for (const [type, compiler] of additionalMarkCompilers) registry.registerMark(type, compiler);
}

export function createCompleteRegistry(): RuntimeRegistry {
  const registry = createDefaultRegistry();
  installAdditionalMarks(registry);
  return registry;
}

const completeRegistry = createCompleteRegistry();

export function registerAdditionalMarks(registry: RuntimeRegistry = completeRegistry): void {
  installAdditionalMarks(registry);
}

export function create(target: ChartTarget, spec: ChartSpec, options?: ChartCreateOptions): Chart {
  return new Chart(target, spec, completeRegistry, options);
}

export function compile(spec: ChartSpec, options?: CompileOptions): CompileResult {
  return compileWithRegistry(spec, completeRegistry, options);
}

export function registerTheme(theme: ThemeTokens): void {
  completeRegistry.registerTheme(theme);
}

export function registerRenderer(factory: RendererFactory): void {
  completeRegistry.registerRenderer(factory);
}

export function registerMark(type: string, compiler: MarkCompiler): void {
  completeRegistry.registerMark(type, compiler);
}

export function use(plugin: GraflumePlugin): void {
  completeRegistry.use(plugin);
}

export function capabilities(): ReturnType<RuntimeRegistry['capabilities']> {
  return completeRegistry.capabilities();
}

export const createRegistry = createCompleteRegistry;

export function line(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'line', target, data, options);
}

export function bar(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'bar', target, data, options);
}

export function point(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'point', target, data, options);
}

export function scatter(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return point(target, data, options);
}

export function area(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'area', target, data, options);
}

function specialized(
  type: MarkType,
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
  markDefaults: NonNullable<QuickChartOptions['mark']> = {},
): Chart {
  return quickChart(create, type, target, data, {
    ...options,
    mark: { ...markDefaults, ...options.mark },
  });
}

export function annotation(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('annotation', target, data, options, { point: true });
}

export function annotatedTimeline(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return annotation(target, data, options);
}

export function horizontalBar(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('bar', target, data, options, { orientation: 'horizontal' });
}

export function column(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('bar', target, data, options, { orientation: 'vertical' });
}

export function bubble(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('bubble', target, data, options);
}

export function calendar(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('calendar', target, data, options);
}

export function candlestick(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('candlestick', target, data, options);
}

export function combo(target: ChartTarget, data: DataInput, options: QuickComboOptions): Chart {
  return quickCombo(create, target, data, options);
}

export function diff(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('diff', target, data, options);
}

export function pie(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('pie', target, data, options);
}

export function donut(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('pie', target, data, options, { options: { innerRadius: 0.56 } });
}

export function gantt(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('gantt', target, data, options);
}

export function gauge(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('gauge', target, data, options);
}

export function geo(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('geo', target, data, options);
}

export function histogram(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('histogram', target, data, options);
}

export function intervals(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('interval', target, data, options);
}

export const interval = intervals;

export function map(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('map', target, data, options);
}

export function motion(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('motion', target, data, options);
}

export function org(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('org', target, data, options);
}

export function sankey(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('sankey', target, data, options);
}

export function steppedArea(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('stepped-area', target, data, options);
}

export function table(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('table', target, data, options);
}

export function timeline(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('timeline', target, data, options);
}

export function treemap(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('treemap', target, data, options);
}

export function trendline(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('trendline', target, data, options);
}

export function vegaChart(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('vega', target, data, options);
}

export function waterfall(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('waterfall', target, data, options);
}

export function wordTree(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('word-tree', target, data, options);
}

function additional(
  type: MarkType,
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return quickChart(create, type, target, data, options);
}

export function radar(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('radar', target, data, options);
}

export function tree(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('tree', target, data, options);
}

export function graph(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('graph', target, data, options);
}

export function chord(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('chord', target, data, options);
}

export function funnel(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('funnel', target, data, options);
}

export function parallel(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('parallel', target, data, options);
}

export function boxplot(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('boxplot', target, data, options);
}

export function effectScatter(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return additional('effect-scatter', target, data, options);
}

export function lines(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('lines', target, data, options);
}

export function heatmap(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('heatmap', target, data, options);
}

export function pictorialBar(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return additional('pictorial-bar', target, data, options);
}

export function themeRiver(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return additional('theme-river', target, data, options);
}

export function sunburst(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('sunburst', target, data, options);
}

export function custom(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('custom', target, data, options);
}

export const fullCatalog = [...chartTypeCatalog, ...additionalChartTypeCatalog] as const;

export { additionalChartTypeCatalog };
export * from './index.js';
export type { AdditionalChartTypeId } from './catalog/additional-chart-types.js';
