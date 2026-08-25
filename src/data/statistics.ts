export type HistogramNormalization = 'count' | 'probability' | 'density';

export interface WeightedObservation {
  readonly value: number;
  readonly weight: number;
  readonly rowIndex: number;
}

export interface HistogramBin {
  readonly start: number;
  readonly end: number;
  readonly value: number;
  readonly weight: number;
  readonly count: number;
  readonly proportion: number;
  readonly rowIndices: readonly number[];
}

export interface EmpiricalPoint {
  readonly value: number;
  readonly probability: number;
  readonly weight: number;
  readonly count: number;
  readonly rowIndices: readonly number[];
}

export interface DensityPoint {
  readonly value: number;
  readonly density: number;
}

export interface RawBoxSummary {
  readonly minimum: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  readonly maximum: number;
  readonly lowerWhisker: number;
  readonly upperWhisker: number;
  readonly outliers: readonly WeightedObservation[];
  readonly rowIndices: readonly number[];
}

function sorted(input: readonly WeightedObservation[]): WeightedObservation[] {
  return input
    .filter(({ value, weight }) => Number.isFinite(value) && Number.isFinite(weight) && weight >= 0)
    .map((observation, index) => ({ observation, index }))
    .sort((a, b) => a.observation.value - b.observation.value || a.index - b.index)
    .map(({ observation }) => observation);
}

function quantile(values: readonly number[], probability: number): number {
  const position = Math.max(0, Math.min(1, probability)) * (values.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const a = values[lower]!;
  const b = values[upper]!;
  return a + (b - a) * (position - lower);
}

function weightedQuantile(
  observations: readonly WeightedObservation[],
  probability: number,
): number {
  const totalWeight = observations.reduce((sum, observation) => sum + observation.weight, 0);
  if (totalWeight <= 0) return observations[0]?.value ?? 0;
  const target = Math.max(0, Math.min(1, probability)) * totalWeight;
  let cumulative = 0;
  for (const observation of observations) {
    cumulative += observation.weight;
    if (cumulative >= target) return observation.value;
  }
  return observations.at(-1)?.value ?? 0;
}

export function weightedHistogram(
  input: readonly WeightedObservation[],
  options: {
    readonly bins: number;
    readonly extent?: readonly [number, number];
    readonly normalization?: HistogramNormalization;
    readonly cumulative?: boolean;
  },
): readonly HistogramBin[] {
  const observations = sorted(input);
  if (observations.length === 0) return [];
  const minimum = options.extent?.[0] ?? observations[0]!.value;
  const maximum = options.extent?.[1] ?? observations.at(-1)!.value;
  const bins = Math.max(1, Math.min(512, Math.trunc(options.bins)));
  const span = maximum - minimum || 1;
  const width = span / bins;
  const accumulators = Array.from({ length: bins }, () => ({
    weight: 0,
    count: 0,
    rows: [] as number[],
  }));
  for (const observation of observations) {
    if (observation.value < minimum || observation.value > maximum) continue;
    const index = Math.min(
      bins - 1,
      Math.max(0, Math.floor(((observation.value - minimum) / span) * bins)),
    );
    const accumulator = accumulators[index]!;
    accumulator.weight += observation.weight;
    accumulator.count += 1;
    accumulator.rows.push(observation.rowIndex);
  }
  const totalWeight = accumulators.reduce((sum, bin) => sum + bin.weight, 0);
  let cumulativeWeight = 0;
  return accumulators.map((bin, index) => {
    cumulativeWeight += bin.weight;
    const effectiveWeight = options.cumulative === true ? cumulativeWeight : bin.weight;
    const normalization = options.normalization ?? 'count';
    const value =
      normalization === 'probability'
        ? totalWeight === 0
          ? 0
          : effectiveWeight / totalWeight
        : normalization === 'density'
          ? totalWeight === 0
            ? 0
            : options.cumulative === true
              ? effectiveWeight / totalWeight
              : effectiveWeight / (totalWeight * width)
          : effectiveWeight;
    return {
      start: minimum + index * width,
      end: minimum + (index + 1) * width,
      value,
      weight: bin.weight,
      count: bin.count,
      proportion: totalWeight === 0 ? 0 : bin.weight / totalWeight,
      rowIndices: bin.rows,
    };
  });
}

export function empiricalDistribution(
  input: readonly WeightedObservation[],
  complementary = false,
): readonly EmpiricalPoint[] {
  const observations = sorted(input);
  const totalWeight = observations.reduce((sum, observation) => sum + observation.weight, 0);
  if (observations.length === 0 || totalWeight === 0) return [];
  const groups = new Map<number, WeightedObservation[]>();
  for (const observation of observations) {
    const group = groups.get(observation.value) ?? [];
    group.push(observation);
    groups.set(observation.value, group);
  }
  let cumulative = 0;
  return [...groups].map(([value, group]) => {
    const weight = group.reduce((sum, observation) => sum + observation.weight, 0);
    cumulative += weight;
    return {
      value,
      probability: complementary
        ? Math.max(0, 1 - cumulative / totalWeight)
        : cumulative / totalWeight,
      weight,
      count: group.length,
      rowIndices: group.map(({ rowIndex }) => rowIndex),
    };
  });
}

/** Gaussian KDE with a robust Silverman bandwidth and unit-integral density. */
export function kernelDensity1d(
  input: readonly WeightedObservation[],
  options: {
    readonly points?: number;
    readonly bandwidth?: number;
    readonly extent?: readonly [number, number];
  } = {},
): { readonly bandwidth: number; readonly points: readonly DensityPoint[] } {
  const observations = sorted(input).filter(({ weight }) => weight > 0);
  if (observations.length === 0) return { bandwidth: 1, points: [] };
  const totalWeight = observations.reduce((sum, observation) => sum + observation.weight, 0);
  const squaredWeight = observations.reduce((sum, observation) => sum + observation.weight ** 2, 0);
  const effectiveSampleSize = Math.max(1, totalWeight ** 2 / squaredWeight);
  const values = observations.map(({ value }) => value);
  const mean =
    observations.reduce((sum, observation) => sum + observation.value * observation.weight, 0) /
    totalWeight;
  const varianceDenominator = totalWeight - squaredWeight / totalWeight;
  const deviation = Math.sqrt(
    observations.reduce(
      (sum, observation) => sum + observation.weight * (observation.value - mean) ** 2,
      0,
    ) / Math.max(Number.EPSILON, varianceDenominator),
  );
  const iqr = weightedQuantile(observations, 0.75) - weightedQuantile(observations, 0.25);
  const robustScale = Math.min(
    deviation || Number.POSITIVE_INFINITY,
    iqr > 0 ? iqr / 1.34 : Number.POSITIVE_INFINITY,
  );
  const fallback = (values.at(-1)! - values[0]!) / 6 || Math.abs(mean) * 0.1 || 1;
  const automaticBandwidth = Math.max(
    Number.EPSILON,
    0.9 * (Number.isFinite(robustScale) ? robustScale : fallback) * effectiveSampleSize ** -0.2,
  );
  const bandwidth =
    options.bandwidth !== undefined && Number.isFinite(options.bandwidth) && options.bandwidth > 0
      ? options.bandwidth
      : automaticBandwidth;
  const extentStart = options.extent?.[0] ?? values[0]! - bandwidth * 3;
  const extentEnd = options.extent?.[1] ?? values.at(-1)! + bandwidth * 3;
  const minimum = Math.min(extentStart, extentEnd);
  const maximum = Math.max(extentStart, extentEnd);
  const count = Math.max(2, Math.min(512, Math.trunc(options.points ?? 96)));
  const normalizer = bandwidth * Math.sqrt(2 * Math.PI) * totalWeight;
  return {
    bandwidth,
    points: Array.from({ length: count }, (_, index) => {
      const value = minimum + ((maximum - minimum || 1) * index) / (count - 1);
      const density =
        observations.reduce((sum, observation) => {
          const z = (value - observation.value) / bandwidth;
          return sum + observation.weight * Math.exp(-0.5 * z * z);
        }, 0) / normalizer;
      return { value, density };
    }),
  };
}

export function rawBoxSummary(
  input: readonly WeightedObservation[],
  whisker = 1.5,
): RawBoxSummary | null {
  const observations = sorted(input);
  if (observations.length === 0) return null;
  const values = observations.map(({ value }) => value);
  const q1 = quantile(values, 0.25);
  const median = quantile(values, 0.5);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - Math.max(0, whisker) * iqr;
  const upperFence = q3 + Math.max(0, whisker) * iqr;
  const inliers = observations.filter(({ value }) => value >= lowerFence && value <= upperFence);
  const outliers = observations.filter(({ value }) => value < lowerFence || value > upperFence);
  return {
    minimum: values[0]!,
    q1,
    median,
    q3,
    maximum: values.at(-1)!,
    lowerWhisker: inliers[0]?.value ?? values[0]!,
    upperWhisker: inliers.at(-1)?.value ?? values.at(-1)!,
    outliers,
    rowIndices: observations.map(({ rowIndex }) => rowIndex),
  };
}
