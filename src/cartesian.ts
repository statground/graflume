import { compileWithRegistry, type CompileOptions } from './compiler/compile.js';
import { compileAreaMark } from './marks/area.js';
import { compilePointMark } from './marks/point.js';
import { compileOrderedLineMark, compileRankedBarMark } from './marks/statistical-advanced.js';
import { canvasRendererFactory } from './renderer/canvas.js';
import { Chart, type ChartCreateOptions, type ChartTarget } from './runtime/chart.js';
import { RuntimeRegistry } from './runtime/registry.js';
import type { ChartSpec } from './spec/types.js';

export { Chart, RuntimeRegistry };
export type { ChartCreateOptions, ChartTarget, ChartEventMap } from './runtime/chart.js';
export type { CompileOptions, CompileResult } from './compiler/compile.js';
export type * from './spec/types.js';
export { version, specVersion } from './version.js';
export { attachDomainNavigator } from './interaction/domain-navigator.js';
export type {
  DomainNavigator,
  DomainNavigatorLabels,
  DomainNavigatorOptions,
} from './interaction/domain-navigator.js';
export type { DomainAxisWindow, DomainViewState } from './interaction/domain-navigation.js';

/** Native Canvas entry for bar, line, area and point charts, with the shared runtime. */
export function createCartesianRegistry(): RuntimeRegistry {
  const registry = new RuntimeRegistry();
  registry.registerRenderer(canvasRendererFactory);
  registry.registerMark('bar', compileRankedBarMark);
  registry.registerMark('line', compileOrderedLineMark);
  registry.registerMark('area', compileAreaMark);
  registry.registerMark('point', compilePointMark);
  return registry;
}

let sharedRegistry: RuntimeRegistry | undefined;
function registry(): RuntimeRegistry {
  return (sharedRegistry ??= createCartesianRegistry());
}

export function create(target: ChartTarget, spec: ChartSpec, options?: ChartCreateOptions): Chart {
  return new Chart(target, spec, registry(), options);
}

export function compile(spec: ChartSpec, options?: CompileOptions) {
  return compileWithRegistry(spec, registry(), options);
}

export function capabilities() {
  return registry().capabilities();
}
