export interface NormalDistributionSummary {
  readonly mean: number;
  readonly standardDeviation: number;
  readonly observedMinimum: number;
  readonly observedMaximum: number;
  readonly domainMinimum: number;
  readonly domainMaximum: number;
  readonly maximumDensity: number;
}

const NORMAL_RANGE_SIGMAS = 3.5;
const SQRT_TWO_PI = Math.sqrt(Math.PI * 2);

export function normalDensity(value: number, summary: NormalDistributionSummary): number {
  const standardized = (value - summary.mean) / summary.standardDeviation;
  return Math.exp(-0.5 * standardized * standardized) / (summary.standardDeviation * SQRT_TWO_PI);
}

export function summarizeNormalDistribution(
  values: Iterable<number>,
): NormalDistributionSummary | null {
  const accepted: number[] = [];
  let sum = 0;
  let observedMinimum = Number.POSITIVE_INFINITY;
  let observedMaximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    accepted.push(value);
    sum += value;
    observedMinimum = Math.min(observedMinimum, value);
    observedMaximum = Math.max(observedMaximum, value);
  }
  if (accepted.length < 2) return null;
  const mean = sum / accepted.length;
  const variance =
    accepted.reduce((total, value) => total + (value - mean) ** 2, 0) /
    Math.max(1, accepted.length - 1);
  const standardDeviation = Math.sqrt(variance) || 1;
  return {
    mean,
    standardDeviation,
    observedMinimum,
    observedMaximum,
    domainMinimum: mean - standardDeviation * NORMAL_RANGE_SIGMAS,
    domainMaximum: mean + standardDeviation * NORMAL_RANGE_SIGMAS,
    maximumDensity: 1 / (standardDeviation * SQRT_TWO_PI),
  };
}
