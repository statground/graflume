import {
  quickChart,
  quickCombo,
  type QuickChartOptions,
  type QuickComboOptions,
} from './api/quick.js';
import {
  compileWithRegistry,
  type CompileOptions,
  type CompileResult,
} from './compiler/compile.js';
import type { MarkCompiler } from './compiler/types.js';
import type { GraflumePlugin } from './core/plugin.js';
import type { RendererFactory } from './renderer/types.js';
import { Chart, type ChartCreateOptions, type ChartTarget } from './runtime/chart.js';
import { createDefaultRegistry, defaultRegistry } from './runtime/default-registry.js';
import type { RuntimeRegistry } from './runtime/registry.js';
import type { ChartSpec, DataInput } from './spec/types.js';
import type { ThemeTokens } from './theme/types.js';
import { specVersion, version } from './version.js';
import { chartTypeCatalog, chartVariantCatalog } from './catalog/chart-types.js';

export function create(target: ChartTarget, spec: ChartSpec, options?: ChartCreateOptions): Chart {
  return new Chart(target, spec, defaultRegistry, options);
}

export function compile(spec: ChartSpec, options?: CompileOptions): CompileResult {
  return compileWithRegistry(spec, defaultRegistry, options);
}

export function line(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'line', target, data, options);
}

export function bar(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'bar', target, data, options);
}

export function point(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'point', target, data, options);
}

/**
 * Creates a scatter chart. This is the chart-oriented alias of `point()`;
 * both APIs compile to the portable `point` mark in ChartSpec 0.1.
 */
export function scatter(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'point', target, data, options);
}

export function area(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'area', target, data, options);
}

function specialized(
  type: Parameters<typeof quickChart>[1],
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

export function registerTheme(theme: ThemeTokens): void {
  defaultRegistry.registerTheme(theme);
}

export function registerRenderer(factory: RendererFactory): void {
  defaultRegistry.registerRenderer(factory);
}

export function registerMark(type: string, compiler: MarkCompiler): void {
  defaultRegistry.registerMark(type, compiler);
}

export function use(plugin: GraflumePlugin): void {
  defaultRegistry.use(plugin);
}

export function capabilities(): ReturnType<RuntimeRegistry['capabilities']> {
  return defaultRegistry.capabilities();
}

export const createRegistry = createDefaultRegistry;
export { chartTypeCatalog, chartVariantCatalog };

export { Chart, specVersion, version };
export { assertValidSpec, validateSpec } from './spec/validate.js';
export { normalizeSpec } from './spec/normalize.js';
export { DataTable } from './data/table.js';
export { RuntimeRegistry } from './runtime/registry.js';
export { CanvasRenderer, canvasRendererFactory } from './renderer/canvas.js';
export { graflumeDark, graflumeLight } from './theme/defaults.js';
export { pluginApiVersion } from './core/plugin.js';
export { GraflumeError } from './core/errors.js';
export { hitTestScene } from './interaction/hit-test.js';

export type { QuickChartOptions, QuickComboOptions } from './api/quick.js';
export type {
  ChartFamilyEntry,
  ChartTypeId,
  ChartVariantEntry,
  ChartVariantId,
} from './catalog/chart-types.js';
export type {
  ChartCreateOptions,
  ChartEventMap,
  ChartPointerEvent,
  ChartRenderEvent,
  ChartResizeEvent,
  ChartTarget,
} from './runtime/chart.js';
export type { GraflumePlugin, PluginContext } from './core/plugin.js';
export type { MarkCompileContext, MarkCompiler, PlotArea } from './compiler/types.js';
export type { CompileOptions, CompileResult } from './compiler/compile.js';
export type { Renderer, RendererCapabilities, RendererFactory } from './renderer/types.js';
export type { Scene, SceneNode, DatumReference } from './scene/types.js';
export type {
  AccessibilitySpec,
  AxisSpec,
  ChartSpec,
  ColumnarData,
  DataInput,
  DataRow,
  DataValue,
  EncodingInput,
  EncodingSpec,
  FieldType,
  InteractionSpec,
  JsonValue,
  LayerSpec,
  MarkInput,
  MarkSpec,
  MarkType,
  NormalizedChartSpec,
  PerformanceProfile,
  RendererPreference,
  ScaleSpec,
  TitleSpec,
} from './spec/types.js';
export type { ThemeTokens } from './theme/types.js';
export type { DeepPartial } from './utils/object.js';
