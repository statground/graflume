import type { Point } from '../scene/types.js';
import { exactStrideSampleIndices, minMaxSampleIndices } from '../data/sample.js';

export interface AreaTopology {
  /** The visually upper boundary in ascending screen-x order. */
  readonly upper: readonly Point[];
  /** The visually lower boundary in ascending screen-x order. */
  readonly lower: readonly Point[];
  /** A closed-path point sequence: upper forward, then lower backward. */
  readonly polygon: readonly Point[];
}

function finite(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

interface SamplingChannel {
  readonly values: ArrayLike<number | null>;
  readonly first: number;
  readonly last: number;
  readonly span: number;
}

function samplingChannel(values: ArrayLike<number | null>, length: number): SamplingChannel {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < length; index += 1) {
    const value = finite(values[index]);
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return {
    values,
    first: finite(values[0]),
    last: finite(values[length - 1]),
    span: Math.max(1e-12, maximum - minimum),
  };
}

function topologySalience(
  channels: readonly SamplingChannel[],
  index: number,
  length: number,
): number {
  const ratio = length <= 1 ? 0 : index / (length - 1);
  return channels.reduce((score, channel) => {
    const expected = channel.first + (channel.last - channel.first) * ratio;
    return Math.max(score, Math.abs(finite(channel.values[index]) - expected) / channel.span);
  }, 0);
}

/**
 * Samples paired boundaries with one shared index set. Local extrema from the
 * upper edge, lower edge, and band thickness each receive part of the budget;
 * tight budgets retain the most topology-significant deviations plus endpoints.
 */
export function pairedAreaSampleIndices(
  upper: ArrayLike<number | null>,
  lower: ArrayLike<number | null>,
  target: number,
): readonly number[] {
  const length = Math.min(upper.length, lower.length);
  const budget = Math.min(length, Math.max(0, Math.floor(target)));
  if (budget === 0) return [];
  if (length <= budget) return Array.from({ length }, (_value, index) => index);
  if (budget <= 2) return exactStrideSampleIndices(length, budget);

  const thickness = Array.from({ length }, (_value, index) =>
    Math.abs(finite(upper[index]) - finite(lower[index])),
  );

  if (budget < 8) {
    const selected = new Set<number>([0, length - 1]);
    const channels = [
      samplingChannel(upper, length),
      samplingChannel(lower, length),
      samplingChannel(thickness, length),
    ];
    const candidates = Array.from({ length: Math.max(0, length - 2) }, (_value, offset) => {
      const index = offset + 1;
      return { index, salience: topologySalience(channels, index, length) };
    }).sort((left, right) => right.salience - left.salience || left.index - right.index);
    for (const { index } of candidates) {
      if (selected.size >= budget) break;
      selected.add(index);
    }
    return [...selected].sort((left, right) => left - right);
  }

  const channelBudget = Math.max(4, Math.floor((budget + 4) / 3));
  const selected = new Set<number>([0, length - 1]);
  for (const values of [upper, lower, thickness] as const) {
    for (const index of minMaxSampleIndices(values, channelBudget)) selected.add(index);
  }
  for (const index of exactStrideSampleIndices(length, budget)) {
    if (selected.size >= budget) break;
    selected.add(index);
  }
  return [...selected].sort((left, right) => left - right);
}

/**
 * Keeps an area series in plot order while retaining authored order as the
 * stable tie-break for coincident x positions.
 */
export function orderAreaByX<T>(
  values: readonly T[],
  position: (value: T) => number,
): readonly T[] {
  return values
    .map((value, index) => ({ value, index, x: position(value) }))
    .sort((left, right) => {
      const leftFinite = Number.isFinite(left.x);
      const rightFinite = Number.isFinite(right.x);
      if (leftFinite && rightFinite) return left.x - right.x || left.index - right.index;
      if (leftFinite) return -1;
      if (rightFinite) return 1;
      return left.index - right.index;
    })
    .map(({ value }) => value);
}

/**
 * Builds a topology-safe Cartesian area polygon from aligned boundaries.
 *
 * Both boundaries are paired before ordering, so independent sorting or
 * sampling can never join the last upper point to the first lower point. The
 * visual upper/lower normalization also keeps crossed range inputs and signed
 * baseline areas from producing bow-tie polygons.
 */
export function buildAreaTopology(
  upperBoundary: readonly Point[],
  lowerBoundary: readonly Point[],
): AreaTopology {
  const count = Math.min(upperBoundary.length, lowerBoundary.length);
  const pairs = orderAreaByX(
    Array.from({ length: count }, (_value, index) => {
      const upper = upperBoundary[index]!;
      const lower = lowerBoundary[index]!;
      return {
        index,
        x: (upper.x + lower.x) / 2,
        firstY: upper.y,
        secondY: lower.y,
      };
    }).filter(
      ({ x, firstY, secondY }) =>
        Number.isFinite(x) && Number.isFinite(firstY) && Number.isFinite(secondY),
    ),
    ({ x }) => x,
  );
  const upper = pairs.map(({ x, firstY, secondY }) => ({
    x,
    y: Math.min(firstY, secondY),
  }));
  const lower = pairs.map(({ x, firstY, secondY }) => ({
    x,
    y: Math.max(firstY, secondY),
  }));
  return {
    upper,
    lower,
    polygon: [...upper, ...[...lower].reverse()],
  };
}
