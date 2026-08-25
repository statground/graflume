import type { QuickChartOptions, ChartFactory } from './quick.js';
import { quickChart } from './quick.js';
import type { ChartTarget } from '../runtime/chart.js';
import type { Chart } from '../runtime/chart.js';
import type { ColumnarData, DataInput } from '../spec/types.js';

/** Above this bounded row count the chart-oriented scatter API uses the hybrid WebGL renderer. */
export const automaticScatterWebGLThreshold = 5_000;

export type ScatterRendererDispatchReason =
  'explicit-canvas' | 'explicit-webgl' | 'explicit-renderer' | 'threshold' | 'small';

export interface ScatterRendererDispatch {
  /** Concrete registered renderer name selected for the ordinary Chart runtime. */
  readonly renderer: Exclude<NonNullable<QuickChartOptions['renderer']>, 'auto'>;
  readonly reason: ScatterRendererDispatchReason;
  readonly rowCount: number;
  readonly threshold: number;
}

export function dataInputRowCount(data: DataInput): number {
  if (Array.isArray(data)) return data.length;
  const columnar = data as ColumnarData;
  if (
    typeof columnar.length === 'number' &&
    Number.isInteger(columnar.length) &&
    columnar.length >= 0
  ) {
    return columnar.length;
  }
  const lengths = Object.values(columnar.columns).map(({ length }) => length);
  return lengths.length === 0 ? 0 : Math.min(...lengths);
}

/** Pure, observable dispatch policy shared by default and complete scatter quick APIs. */
export function resolveScatterRendererDispatch(
  data: DataInput,
  preference: QuickChartOptions['renderer'] = 'auto',
  threshold = automaticScatterWebGLThreshold,
): ScatterRendererDispatch {
  if (!Number.isInteger(threshold) || threshold < 1) {
    throw new RangeError('Scatter WebGL threshold must be a positive integer.');
  }
  const rowCount = dataInputRowCount(data);
  if (preference === 'canvas')
    return { renderer: 'canvas', reason: 'explicit-canvas', rowCount, threshold };
  if (preference === 'webgl')
    return { renderer: 'webgl', reason: 'explicit-webgl', rowCount, threshold };
  if (preference !== 'auto') {
    return { renderer: preference, reason: 'explicit-renderer', rowCount, threshold };
  }
  return rowCount >= threshold
    ? { renderer: 'webgl', reason: 'threshold', rowCount, threshold }
    : { renderer: 'canvas', reason: 'small', rowCount, threshold };
}

/** Chart-oriented scatter creation with automatic WebGL dispatch and the ordinary Chart API. */
export function quickScatter(
  chartFactory: ChartFactory,
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  const dispatch = resolveScatterRendererDispatch(data, options.renderer);
  return quickChart(chartFactory, 'point', target, data, {
    ...options,
    renderer: dispatch.renderer,
  });
}
