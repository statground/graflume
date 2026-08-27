import type { MarkCompileContext } from '../compiler/types.js';
import { exactStrideSampleIndices, minMaxSampleIndices } from '../data/sample.js';
import { createEncodingResolver } from '../encoding/resolve.js';
import {
  interpolateCurve,
  resolveCurveName,
  type CurveName,
  type CurveOptions,
  type MissingValuePolicy,
} from '../curve/registry.js';
import type { Point } from '../scene/types.js';
import { orderAreaByX, pairedAreaSampleIndices } from './area-topology.js';
import { numericDataValue, scaleInput } from './utils.js';

export interface CurveDatumPoint {
  readonly point: Point;
  readonly rowIndex: number;
  readonly value: number;
  readonly lowerValue?: number;
}

export interface CurveSegment {
  readonly source: readonly CurveDatumPoint[];
  readonly points: readonly Point[];
}

function boundedSampleIndices(values: ArrayLike<number | null>, budget: number): readonly number[] {
  const target = Math.max(1, Math.floor(budget));
  return target < 4
    ? exactStrideSampleIndices(values.length, target)
    : minMaxSampleIndices(values, target);
}

function allocateSegmentBudgets(
  lengths: readonly number[],
  maximumPoints: number,
): readonly number[] {
  let remainingPoints = Math.max(0, Math.floor(maximumPoints));
  let remainingWeight = lengths.reduce((total, length) => total + length, 0);
  return lengths.map((length, index) => {
    const remainingSegments = lengths.length - index - 1;
    const maximum = Math.max(1, remainingPoints - remainingSegments);
    const proportional = Math.max(
      1,
      Math.floor((remainingPoints * length) / Math.max(1, remainingWeight)),
    );
    const budget = Math.min(length, maximum, proportional);
    remainingPoints -= budget;
    remainingWeight -= length;
    return budget;
  });
}

export function resolveMissingValuePolicy(
  value: unknown,
  fallback: MissingValuePolicy,
): MissingValuePolicy {
  return value === 'gap' || value === 'zero' || value === 'connect' ? value : fallback;
}

export function curveOptionsForMark(options: Readonly<Record<string, unknown>>): CurveOptions {
  const tension = options.tension;
  const samples = options.curveSamples;
  return {
    ...(typeof tension === 'number' && Number.isFinite(tension) ? { tension } : {}),
    ...(typeof samples === 'number' && Number.isFinite(samples) ? { samples } : {}),
  };
}

export function curveNameForMark(
  options: Readonly<Record<string, unknown>>,
  fallback: CurveName,
): CurveName {
  return resolveCurveName(options.curve, fallback);
}

export function collectCurveSegments(
  context: MarkCompileContext,
  defaultMissing: MissingValuePolicy,
  order: 'input' | 'x' = 'input',
  pairedBoundary = false,
): readonly CurveDatumPoint[][] {
  const { table, layer, xScale, yScale, performance } = context;
  const encoding = createEncodingResolver(context);
  const missing = resolveMissingValuePolicy(layer.mark.options.missing, defaultMissing);
  const mappedZero = pairedBoundary ? yScale.map(0) : Number.NaN;
  const pairedBaseline = Number.isFinite(mappedZero)
    ? mappedZero
    : yScale.map(yScale.domain()[0] ?? 0);
  const rawSegments: CurveDatumPoint[][] = [];
  const allIndices = encoding.orderedIndices(
    Array.from({ length: table.length }, (_value, index) => index),
  );
  const grouped = new Map<string, number[]>();
  for (const rowIndex of allIndices) {
    const group = encoding.groupKey(rowIndex);
    const indices = grouped.get(group) ?? [];
    indices.push(rowIndex);
    grouped.set(group, indices);
  }

  for (const groupedIndices of grouped.values()) {
    const indices =
      order === 'x'
        ? orderAreaByX(groupedIndices, (rowIndex) => {
            const input = scaleInput(table.value(rowIndex, layer.x.field));
            return input === null ? Number.NaN : xScale.map(input);
          })
        : groupedIndices;
    let current: CurveDatumPoint[] = [];
    const flush = (): void => {
      if (current.length > 0) rawSegments.push(current);
      current = [];
    };
    for (const rowIndex of indices) {
      const xInput = scaleInput(table.value(rowIndex, layer.x.field));
      const yInput = scaleInput(table.value(rowIndex, layer.y.field));
      if (xInput === null) {
        if (missing !== 'connect') flush();
        continue;
      }
      const x = xScale.map(xInput);
      let sourceValue = numericDataValue(
        table.value(rowIndex, layer.y.field),
        layer.y.type === 'temporal',
      );
      let yValue: number | string | Date;
      if (yInput === null) {
        if (missing === 'zero') {
          yValue = 0;
          sourceValue = 0;
        } else {
          if (missing === 'gap') flush();
          continue;
        }
      } else yValue = yInput;
      const y = yScale.map(yValue);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        if (missing !== 'connect') flush();
        continue;
      }
      const encodedLower = pairedBoundary ? encoding.position('y2', rowIndex) : null;
      const lowerValue = encodedLower ?? pairedBaseline;
      current.push({
        point: { x, y },
        rowIndex,
        value: sourceValue ?? y,
        ...(pairedBoundary && Number.isFinite(lowerValue) ? { lowerValue } : {}),
      });
    }
    flush();
  }

  const maximumPoints = Math.max(1, Math.floor(performance.maxLinePoints));
  const retainedSegments = exactStrideSampleIndices(rawSegments.length, maximumPoints).flatMap(
    (index) => (rawSegments[index] === undefined ? [] : [rawSegments[index]!]),
  );
  const budgets = allocateSegmentBudgets(
    retainedSegments.map(({ length }) => length),
    maximumPoints,
  );
  return retainedSegments.map((segment, segmentIndex) => {
    const budget = budgets[segmentIndex] ?? 1;
    const indices = pairedBoundary
      ? pairedAreaSampleIndices(
          segment.map(({ point }) => point.y),
          segment.map(({ point, lowerValue }) => lowerValue ?? point.y),
          budget,
        )
      : boundedSampleIndices(
          segment.map(({ value }) => value),
          budget,
        );
    return indices
      .map((index) => segment[index])
      .filter((entry): entry is CurveDatumPoint => entry !== undefined);
  });
}

export function interpolateSegments(
  segments: readonly (readonly CurveDatumPoint[])[],
  curve: CurveName,
  options: CurveOptions,
  maxPoints = Number.POSITIVE_INFINITY,
): readonly CurveSegment[] {
  const interpolated = segments.map((source) => ({
    source,
    points: interpolateCurve(
      source.map(({ point }) => point),
      curve,
      options,
    ),
  }));
  if (!Number.isFinite(maxPoints)) return interpolated;
  const maximumPoints = Math.max(1, Math.floor(maxPoints));
  const retained = exactStrideSampleIndices(interpolated.length, maximumPoints).flatMap((index) =>
    interpolated[index] === undefined ? [] : [interpolated[index]!],
  );
  const budgets = allocateSegmentBudgets(
    retained.map(({ points }) => points.length),
    maximumPoints,
  );
  return retained.map(({ source, points }, segmentIndex) => {
    const budget = budgets[segmentIndex] ?? 1;
    if (points.length <= budget) return { source, points };
    const indices = boundedSampleIndices(
      points.map(({ y }) => y),
      budget,
    );
    return {
      source,
      points: indices
        .map((index) => points[index])
        .filter((point): point is Point => point !== undefined),
    };
  });
}
