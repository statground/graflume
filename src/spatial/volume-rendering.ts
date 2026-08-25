import { add3, clamp, cross3, length3, normalize3, scale3, subtract3 } from './math.js';
import type {
  SpatialVec3,
  SpatialVolumeData,
  SpatialVolumeObliqueSliceSpec,
  SpatialVolumeOrthogonalSliceSpec,
  SpatialVolumeWindowLevelSpec,
} from './types.js';

export type VolumeRgba = readonly [number, number, number, number];

export interface ResolvedVolumeTransferStop {
  readonly offset: number;
  readonly color: VolumeRgba;
}

export interface VolumeSamplingContext {
  readonly data: SpatialVolumeData;
  readonly minimum: number;
  readonly maximum: number;
  readonly windowLevel?: SpatialVolumeWindowLevelSpec;
  readonly transfer: readonly ResolvedVolumeTransferStop[];
  readonly transferInterpolation: 'linear' | 'step';
}

export interface VolumeProjectionOptions {
  readonly method: 'raycast' | 'mip' | 'minip' | 'average';
  readonly axis: 'x' | 'y' | 'z';
  readonly resolution: readonly [number, number];
  readonly samples: number;
  readonly interpolation: 'nearest' | 'linear';
}

export interface VolumeProjectionSample {
  readonly row: number;
  readonly column: number;
  readonly position: SpatialVec3;
  readonly rawValue: number;
  readonly normalizedValue: number;
  readonly color: VolumeRgba;
  readonly sampleCount: number;
  readonly depth: number;
}

export interface VolumeSliceSamplingOptions {
  readonly resolution: readonly [number, number];
  readonly interpolation: 'nearest' | 'linear';
  readonly opacity: number;
}

export interface VolumeSliceSample {
  readonly row: number;
  readonly column: number;
  readonly position: SpatialVec3;
  readonly rawValue: number | null;
  readonly normalizedValue: number | null;
  readonly color: VolumeRgba;
}

function dimensions(data: SpatialVolumeData): readonly [number, number, number] {
  return [
    Math.trunc(data.dimensions[0]),
    Math.trunc(data.dimensions[1]),
    Math.trunc(data.dimensions[2]),
  ];
}

function origin(data: SpatialVolumeData): SpatialVec3 {
  return data.origin ?? [0, 0, 0];
}

function spacing(data: SpatialVolumeData): SpatialVec3 {
  return data.spacing ?? [1, 1, 1];
}

function indexOf(x: number, y: number, z: number, size: readonly number[]): number {
  return z * size[0]! * size[1]! + y * size[0]! + x;
}

function gridCoordinate(data: SpatialVolumeData, point: SpatialVec3): SpatialVec3 {
  const start = origin(data);
  const step = spacing(data);
  return [
    (point[0] - start[0]) / step[0],
    (point[1] - start[1]) / step[1],
    (point[2] - start[2]) / step[2],
  ];
}

export function volumeWorldPosition(data: SpatialVolumeData, coordinate: SpatialVec3): SpatialVec3 {
  const start = origin(data);
  const step = spacing(data);
  return [
    start[0] + coordinate[0] * step[0],
    start[1] + coordinate[1] * step[1],
    start[2] + coordinate[2] * step[2],
  ];
}

export function volumeValueExtent(values: readonly number[]): readonly [number, number] {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return Number.isFinite(minimum) ? [minimum, maximum] : [0, 0];
}

/** Samples a scalar volume in world coordinates with a deterministic CPU path. */
export function sampleVolumeValue(
  data: SpatialVolumeData,
  point: SpatialVec3,
  interpolation: 'nearest' | 'linear' = 'linear',
): number | null {
  const size = dimensions(data);
  const coordinate = gridCoordinate(data, point);
  if (
    coordinate[0] < 0 ||
    coordinate[1] < 0 ||
    coordinate[2] < 0 ||
    coordinate[0] > size[0] - 1 ||
    coordinate[1] > size[1] - 1 ||
    coordinate[2] > size[2] - 1
  )
    return null;
  if (interpolation === 'nearest') {
    return data.values[
      indexOf(Math.round(coordinate[0]), Math.round(coordinate[1]), Math.round(coordinate[2]), size)
    ]!;
  }
  const lowX = Math.floor(coordinate[0]);
  const lowY = Math.floor(coordinate[1]);
  const lowZ = Math.floor(coordinate[2]);
  const highX = Math.min(size[0] - 1, lowX + 1);
  const highY = Math.min(size[1] - 1, lowY + 1);
  const highZ = Math.min(size[2] - 1, lowZ + 1);
  const tx = coordinate[0] - lowX;
  const ty = coordinate[1] - lowY;
  const tz = coordinate[2] - lowZ;
  const at = (x: number, y: number, z: number): number => data.values[indexOf(x, y, z, size)]!;
  const x00 = at(lowX, lowY, lowZ) * (1 - tx) + at(highX, lowY, lowZ) * tx;
  const x10 = at(lowX, highY, lowZ) * (1 - tx) + at(highX, highY, lowZ) * tx;
  const x01 = at(lowX, lowY, highZ) * (1 - tx) + at(highX, lowY, highZ) * tx;
  const x11 = at(lowX, highY, highZ) * (1 - tx) + at(highX, highY, highZ) * tx;
  const y0 = x00 * (1 - ty) + x10 * ty;
  const y1 = x01 * (1 - ty) + x11 * ty;
  return y0 * (1 - tz) + y1 * tz;
}

export function normalizeVolumeValue(
  value: number,
  minimum: number,
  maximum: number,
  windowLevel?: SpatialVolumeWindowLevelSpec,
): number {
  if (windowLevel !== undefined) {
    const low = windowLevel.level - windowLevel.window / 2;
    return clamp((value - low) / windowLevel.window, 0, 1);
  }
  return maximum === minimum ? 0.5 : clamp((value - minimum) / (maximum - minimum), 0, 1);
}

function mixColor(left: VolumeRgba, right: VolumeRgba, amount: number): VolumeRgba {
  return [
    left[0] + (right[0] - left[0]) * amount,
    left[1] + (right[1] - left[1]) * amount,
    left[2] + (right[2] - left[2]) * amount,
    left[3] + (right[3] - left[3]) * amount,
  ];
}

export function evaluateVolumeTransfer(
  stops: readonly ResolvedVolumeTransferStop[],
  normalizedValue: number,
  interpolation: 'linear' | 'step' = 'linear',
): VolumeRgba {
  if (stops.length === 0)
    return [normalizedValue, normalizedValue, normalizedValue, normalizedValue];
  const amount = clamp(normalizedValue, 0, 1);
  const first = stops[0]!;
  if (amount <= first.offset) return first.color;
  for (let index = 1; index < stops.length; index += 1) {
    const right = stops[index]!;
    const left = stops[index - 1]!;
    if (amount > right.offset) continue;
    if (interpolation === 'step') return amount === right.offset ? right.color : left.color;
    if (right.offset === left.offset) return left.color;
    return mixColor(left.color, right.color, (amount - left.offset) / (right.offset - left.offset));
  }
  return stops[stops.length - 1]!.color;
}

function rayOpticalSampling(
  data: SpatialVolumeData,
  axis: 'x' | 'y' | 'z',
  sampleCount: number,
): { readonly interval: number; readonly reference: number } {
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const size = dimensions(data);
  const step = spacing(data).map(Math.abs) as unknown as SpatialVec3;
  const reference = Math.min(...step.filter((value) => value > 1e-12));
  const rayLength = (size[axisIndex]! - 1) * step[axisIndex]!;
  return {
    interval: rayLength / Math.max(1, sampleCount - 1),
    reference: Number.isFinite(reference) ? reference : 1,
  };
}

function opacityForDistance(opacity: number, distance: number, reference: number): number {
  const bounded = clamp(opacity, 0, 1);
  if (bounded === 0 || distance <= 0) return 0;
  if (bounded === 1) return 1;
  return -Math.expm1(Math.log1p(-bounded) * (distance / reference));
}

function axisCoordinate(axis: 'x' | 'y' | 'z', u: number, v: number, depth: number): SpatialVec3 {
  if (axis === 'x') return [depth, v, u];
  if (axis === 'y') return [u, depth, v];
  return [u, v, depth];
}

function rayWorldPosition(
  data: SpatialVolumeData,
  axis: 'x' | 'y' | 'z',
  u: number,
  v: number,
  depth: number,
): SpatialVec3 {
  const size = dimensions(data);
  return volumeWorldPosition(
    data,
    axisCoordinate(
      axis,
      u * (axis === 'x' ? size[2] - 1 : size[0] - 1),
      v * (axis === 'y' ? size[2] - 1 : size[1] - 1),
      depth * (axis === 'x' ? size[0] - 1 : axis === 'y' ? size[1] - 1 : size[2] - 1),
    ),
  );
}

function aggregateRay(
  context: VolumeSamplingContext,
  options: VolumeProjectionOptions,
  u: number,
  v: number,
): Omit<VolumeProjectionSample, 'row' | 'column'> {
  const count = Math.max(2, Math.trunc(options.samples));
  const opticalSampling = rayOpticalSampling(context.data, options.axis, count);
  const samples: {
    raw: number;
    normalized: number;
    color: VolumeRgba;
    depth: number;
    opticalDistance: number;
    opticalDepth: number;
  }[] = [];
  for (let index = 0; index < count; index += 1) {
    const depth = index / (count - 1);
    const point = rayWorldPosition(context.data, options.axis, u, v, depth);
    const raw = sampleVolumeValue(context.data, point, options.interpolation);
    if (raw === null) continue;
    const normalized = normalizeVolumeValue(
      raw,
      context.minimum,
      context.maximum,
      context.windowLevel,
    );
    samples.push({
      raw,
      normalized,
      color: evaluateVolumeTransfer(context.transfer, normalized, context.transferInterpolation),
      depth,
      opticalDistance: opticalSampling.interval * (index === 0 || index === count - 1 ? 0.5 : 1),
      opticalDepth:
        index === 0
          ? 1 / (4 * (count - 1))
          : index === count - 1
            ? 1 - 1 / (4 * (count - 1))
            : depth,
    });
  }
  if (samples.length === 0)
    return {
      position: rayWorldPosition(context.data, options.axis, u, v, 0.5),
      rawValue: 0,
      normalizedValue: 0,
      color: [0, 0, 0, 0],
      sampleCount: 0,
      depth: 0.5,
    };

  if (options.method === 'raycast') {
    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 0;
    let weightedDepth = 0;
    let weightedRaw = 0;
    let weightTotal = 0;
    for (const sample of samples) {
      const correctedOpacity = opacityForDistance(
        sample.color[3],
        sample.opticalDistance,
        opticalSampling.reference,
      );
      const weight = (1 - alpha) * correctedOpacity;
      red += sample.color[0] * weight;
      green += sample.color[1] * weight;
      blue += sample.color[2] * weight;
      alpha += weight;
      weightedDepth += sample.opticalDepth * weight;
      weightedRaw += sample.raw * weight;
      weightTotal += weight;
    }
    const depth = weightTotal > 0 ? weightedDepth / weightTotal : 0.5;
    const rawValue = weightTotal > 0 ? weightedRaw / weightTotal : samples[0]!.raw;
    return {
      position: rayWorldPosition(context.data, options.axis, u, v, depth),
      rawValue,
      normalizedValue: normalizeVolumeValue(
        rawValue,
        context.minimum,
        context.maximum,
        context.windowLevel,
      ),
      color: alpha <= 1e-12 ? [0, 0, 0, 0] : [red / alpha, green / alpha, blue / alpha, alpha],
      sampleCount: samples.length,
      depth,
    };
  }

  let selected = samples[0]!;
  if (options.method === 'mip') {
    for (const sample of samples) if (sample.raw > selected.raw) selected = sample;
  } else if (options.method === 'minip') {
    for (const sample of samples) if (sample.raw < selected.raw) selected = sample;
  } else {
    const rawValue = samples.reduce((total, sample) => total + sample.raw, 0) / samples.length;
    const normalizedValue = normalizeVolumeValue(
      rawValue,
      context.minimum,
      context.maximum,
      context.windowLevel,
    );
    return {
      position: rayWorldPosition(context.data, options.axis, u, v, 0.5),
      rawValue,
      normalizedValue,
      color: evaluateVolumeTransfer(
        context.transfer,
        normalizedValue,
        context.transferInterpolation,
      ),
      sampleCount: samples.length,
      depth: 0.5,
    };
  }
  return {
    position: rayWorldPosition(context.data, options.axis, u, v, selected.depth),
    rawValue: selected.raw,
    normalizedValue: selected.normalized,
    color: selected.color,
    sampleCount: samples.length,
    depth: selected.depth,
  };
}

/** CPU reference used to compile a bounded projection mesh rendered by WebGL. */
export function projectVolumeRays(
  context: VolumeSamplingContext,
  options: VolumeProjectionOptions,
): readonly VolumeProjectionSample[] {
  const [columns, rows] = options.resolution;
  const output: VolumeProjectionSample[] = [];
  for (let row = 0; row < rows; row += 1) {
    const v = rows === 1 ? 0.5 : row / (rows - 1);
    for (let column = 0; column < columns; column += 1) {
      const u = columns === 1 ? 0.5 : column / (columns - 1);
      output.push({ row, column, ...aggregateRay(context, options, u, v) });
    }
  }
  return output;
}

function orthogonalPlane(
  data: SpatialVolumeData,
  slice: SpatialVolumeOrthogonalSliceSpec,
  u: number,
  v: number,
): SpatialVec3 {
  return rayWorldPosition(data, slice.axis, u, v, clamp(slice.position, 0, 1));
}

function volumeSize(data: SpatialVolumeData): SpatialVec3 {
  const size = dimensions(data);
  const step = spacing(data);
  return [(size[0] - 1) * step[0], (size[1] - 1) * step[1], (size[2] - 1) * step[2]];
}

function obliquePlane(
  data: SpatialVolumeData,
  slice: SpatialVolumeObliqueSliceSpec,
  u: number,
  v: number,
): SpatialVec3 {
  const normal = normalize3(slice.normal, [0, 0, 1]);
  const requestedUp = normalize3(slice.up ?? [0, 1, 0], [0, 1, 0]);
  let right = cross3(requestedUp, normal);
  if (length3(right) <= 1e-8) {
    const reference = (
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as const
    ).reduce((leastParallel, candidate) =>
      Math.abs(candidate[0] * normal[0] + candidate[1] * normal[1] + candidate[2] * normal[2]) <
      Math.abs(
        leastParallel[0] * normal[0] + leastParallel[1] * normal[1] + leastParallel[2] * normal[2],
      )
        ? candidate
        : leastParallel,
    );
    right = cross3(reference, normal);
  }
  right = normalize3(right, [1, 0, 0]);
  const up = normalize3(cross3(normal, right), [0, 1, 0]);
  const extent = volumeSize(data);
  const fallbackSize = Math.max(extent[0], extent[1], extent[2]);
  const width = slice.size?.[0] ?? fallbackSize;
  const height = slice.size?.[1] ?? fallbackSize;
  return add3(slice.origin, add3(scale3(right, (u - 0.5) * width), scale3(up, (v - 0.5) * height)));
}

export function sampleVolumeSlice(
  context: VolumeSamplingContext,
  slice: SpatialVolumeOrthogonalSliceSpec | SpatialVolumeObliqueSliceSpec,
  options: VolumeSliceSamplingOptions,
): readonly VolumeSliceSample[] {
  const [columns, rows] = options.resolution;
  const output: VolumeSliceSample[] = [];
  for (let row = 0; row < rows; row += 1) {
    const v = rows === 1 ? 0.5 : row / (rows - 1);
    for (let column = 0; column < columns; column += 1) {
      const u = columns === 1 ? 0.5 : column / (columns - 1);
      const position =
        slice.type === 'orthogonal'
          ? orthogonalPlane(context.data, slice, u, v)
          : obliquePlane(context.data, slice, u, v);
      const rawValue = sampleVolumeValue(context.data, position, options.interpolation);
      const normalizedValue =
        rawValue === null
          ? null
          : normalizeVolumeValue(rawValue, context.minimum, context.maximum, context.windowLevel);
      const baseColor =
        normalizedValue === null
          ? ([0, 0, 0, 0] as const)
          : evaluateVolumeTransfer(
              context.transfer,
              normalizedValue,
              context.transferInterpolation,
            );
      output.push({
        row,
        column,
        position,
        rawValue,
        normalizedValue,
        color: [baseColor[0], baseColor[1], baseColor[2], baseColor[3] * options.opacity],
      });
    }
  }
  return output;
}

export function volumeWorldBounds(data: SpatialVolumeData): readonly [SpatialVec3, SpatialVec3] {
  const start = origin(data);
  return [start, add3(start, volumeSize(data))];
}

export function pointInsideVolume(data: SpatialVolumeData, point: SpatialVec3): boolean {
  const [minimum, maximum] = volumeWorldBounds(data);
  return (
    point[0] >= minimum[0] &&
    point[0] <= maximum[0] &&
    point[1] >= minimum[1] &&
    point[1] <= maximum[1] &&
    point[2] >= minimum[2] &&
    point[2] <= maximum[2]
  );
}

export function volumePathLength(points: readonly SpatialVec3[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1)
    total += length3(subtract3(points[index]!, points[index - 1]!));
  return total;
}
