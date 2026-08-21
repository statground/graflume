import type { ChartCreateOptions, ChartTarget } from '../runtime/chart.js';
import type {
  ChartSpec,
  DataInput,
  EncodingInput,
  MarkSpec,
  MarkType,
  LayerSpec,
} from '../spec/types.js';
import type { Chart } from '../runtime/chart.js';

export type QuickChartOptions = Omit<ChartSpec, 'data' | 'layers' | 'mark' | 'x' | 'y'> & {
  readonly x: EncodingInput;
  readonly y: EncodingInput;
  readonly mark?: Omit<MarkSpec, 'type'>;
  readonly create?: ChartCreateOptions;
};

export type ChartFactory = (
  target: ChartTarget,
  spec: ChartSpec,
  options?: ChartCreateOptions,
) => Chart;

export type QuickComboOptions = Omit<ChartSpec, 'data' | 'layers' | 'mark' | 'x' | 'y'> & {
  readonly layers: readonly Omit<LayerSpec, 'data'>[];
  readonly create?: ChartCreateOptions;
};

export function quickChart(
  chartFactory: ChartFactory,
  type: MarkType,
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  const { x, y, mark, create, ...chartOptions } = options;
  return chartFactory(
    target,
    {
      ...chartOptions,
      data,
      mark: { type, ...mark },
      x,
      y,
    },
    create,
  );
}

export function quickCombo(
  chartFactory: ChartFactory,
  target: ChartTarget,
  data: DataInput,
  options: QuickComboOptions,
): Chart {
  const { layers, create, ...chartOptions } = options;
  return chartFactory(target, { ...chartOptions, data, layers }, create);
}
