import { quickChart, type QuickChartOptions } from './api/quick.js';
import { compileWithRegistry, type CompileOptions, type CompileResult } from './compiler/compile.js';
import type { MarkCompiler } from './compiler/types.js';
import type { GraflumePlugin } from './core/plugin.js';
import type { RendererFactory } from './renderer/types.js';
import { Chart, type ChartCreateOptions, type ChartTarget } from './runtime/chart.js';
import { createDefaultRegistry, defaultRegistry } from './runtime/default-registry.js';
import type { RuntimeRegistry } from './runtime/registry.js';
import type { ChartSpec, DataInput } from './spec/types.js';
import type { ThemeTokens } from './theme/types.js';
import { specVersion, version } from './version.js';

export function create(
  target: ChartTarget,
  spec: ChartSpec,
  options?: ChartCreateOptions,
): Chart {
  return new Chart(target, spec, defaultRegistry, options);
}

export function compile(spec: ChartSpec, options?: CompileOptions): CompileResult {
  return compileWithRegistry(spec, defaultRegistry, options);
}

export function line(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return quickChart(create, 'line', target, data, options);
}

export function bar(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return quickChart(create, 'bar', target, data, options);
}

export function point(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return quickChart(create, 'point', target, data, options);
}

export function area(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return quickChart(create, 'area', target, data, options);
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

export type { QuickChartOptions } from './api/quick.js';
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
