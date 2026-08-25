import { add3, clamp, length3, normalize3, scale3, subtract3 } from './math.js';
import type {
  SpatialVec3,
  SpatialVectorFieldData,
  SpatialVectorIntegrationSpec,
  SpatialVectorSeedGridSpec,
} from './types.js';

export interface SpatialVectorFieldSample {
  readonly vector: SpatialVec3;
  readonly magnitude: number;
}

export interface IntegratedVectorPath {
  readonly seedIndex: number;
  readonly seedSource: 'explicit' | 'grid';
  readonly points: readonly SpatialVec3[];
  readonly magnitudes: readonly number[];
  readonly acceptedSteps: number;
  readonly rejectedSteps: number;
  readonly termination: 'bounds' | 'stagnation' | 'max-steps' | 'max-length' | 'minimum-step';
}

export interface IntegratedVectorField {
  readonly seeds: readonly SpatialVec3[];
  readonly seedSourceIndices: readonly number[];
  readonly sourceSeedCount: number;
  readonly paths: readonly IntegratedVectorPath[];
  readonly method: 'adaptive-rk4-step-doubling';
  readonly acceptedSteps: number;
  readonly rejectedSteps: number;
}

interface ResolvedVectorFieldSeed {
  readonly point: SpatialVec3;
  /** Index in the authored explicit-then-grid seed sequence, before filtering. */
  readonly sourceIndex: number;
  readonly source: 'explicit' | 'grid';
}

interface ResolvedIntegration {
  readonly direction: 'forward' | 'backward' | 'both';
  readonly initialStep: number;
  readonly minStep: number;
  readonly maxStep: number;
  readonly tolerance: number;
  readonly maxSteps: number;
  readonly maxLength: number;
  readonly minMagnitude: number;
}

function fieldDimensions(data: SpatialVectorFieldData): readonly [number, number, number] {
  return [
    Math.trunc(data.dimensions[0]),
    Math.trunc(data.dimensions[1]),
    Math.trunc(data.dimensions[2]),
  ];
}

function fieldOrigin(data: SpatialVectorFieldData): SpatialVec3 {
  return data.origin ?? [0, 0, 0];
}

function fieldSpacing(data: SpatialVectorFieldData): SpatialVec3 {
  return data.spacing ?? [1, 1, 1];
}

function fieldIndex(x: number, y: number, z: number, size: readonly number[]): number {
  return z * size[0]! * size[1]! + y * size[0]! + x;
}

export function vectorFieldWorldBounds(
  data: SpatialVectorFieldData,
): readonly [SpatialVec3, SpatialVec3] {
  const size = fieldDimensions(data);
  const start = fieldOrigin(data);
  const step = fieldSpacing(data);
  return [
    start,
    [
      start[0] + (size[0] - 1) * step[0],
      start[1] + (size[1] - 1) * step[1],
      start[2] + (size[2] - 1) * step[2],
    ],
  ];
}

function insideField(data: SpatialVectorFieldData, point: SpatialVec3): boolean {
  const [minimum, maximum] = vectorFieldWorldBounds(data);
  return (
    point[0] >= minimum[0] &&
    point[0] <= maximum[0] &&
    point[1] >= minimum[1] &&
    point[1] <= maximum[1] &&
    point[2] >= minimum[2] &&
    point[2] <= maximum[2]
  );
}

/** Trilinear CPU sampler shared by deterministic integration and tests. */
export function sampleVectorField(
  data: SpatialVectorFieldData,
  point: SpatialVec3,
): SpatialVectorFieldSample | null {
  if (!insideField(data, point)) return null;
  const size = fieldDimensions(data);
  const start = fieldOrigin(data);
  const step = fieldSpacing(data);
  const coordinate: SpatialVec3 = [
    (point[0] - start[0]) / step[0],
    (point[1] - start[1]) / step[1],
    (point[2] - start[2]) / step[2],
  ];
  const low = coordinate.map(Math.floor) as unknown as [number, number, number];
  const high: [number, number, number] = [
    Math.min(size[0] - 1, low[0] + 1),
    Math.min(size[1] - 1, low[1] + 1),
    Math.min(size[2] - 1, low[2] + 1),
  ];
  const amount: SpatialVec3 = [
    coordinate[0] - low[0],
    coordinate[1] - low[1],
    coordinate[2] - low[2],
  ];
  const at = (x: number, y: number, z: number): SpatialVec3 =>
    data.vectors[fieldIndex(x, y, z, size)]!;
  const interpolate = (left: SpatialVec3, right: SpatialVec3, value: number): SpatialVec3 => [
    left[0] + (right[0] - left[0]) * value,
    left[1] + (right[1] - left[1]) * value,
    left[2] + (right[2] - left[2]) * value,
  ];
  const z0y0 = interpolate(at(low[0], low[1], low[2]), at(high[0], low[1], low[2]), amount[0]);
  const z0y1 = interpolate(at(low[0], high[1], low[2]), at(high[0], high[1], low[2]), amount[0]);
  const z1y0 = interpolate(at(low[0], low[1], high[2]), at(high[0], low[1], high[2]), amount[0]);
  const z1y1 = interpolate(at(low[0], high[1], high[2]), at(high[0], high[1], high[2]), amount[0]);
  const z0 = interpolate(z0y0, z0y1, amount[1]);
  const z1 = interpolate(z1y0, z1y1, amount[1]);
  const vector = interpolate(z0, z1, amount[2]);
  return { vector, magnitude: length3(vector) };
}

function random01(state: { value: number }): number {
  let value = (state.value += 0x6d2b79f5);
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  state.value = value >>> 0;
  return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
}

function seedGrid(
  data: SpatialVectorFieldData,
  grid: SpatialVectorSeedGridSpec,
): readonly SpatialVec3[] {
  const count: readonly [number, number, number] = [
    Math.trunc(grid.dimensions[0]),
    Math.trunc(grid.dimensions[1]),
    Math.trunc(grid.dimensions[2]),
  ];
  const [minimum, maximum] = vectorFieldWorldBounds(data);
  const jitter = clamp(grid.jitter ?? 0, 0, 0.49);
  const randomState = { value: Math.trunc(grid.seed ?? 0x9e3779b9) >>> 0 };
  const output: SpatialVec3[] = [];
  for (let z = 0; z < count[2]; z += 1) {
    for (let y = 0; y < count[1]; y += 1) {
      for (let x = 0; x < count[0]; x += 1) {
        const position = [x, y, z].map((index, axis) => {
          const axisCount = count[axis]!;
          const base = axisCount === 1 ? 0.5 : index / (axisCount - 1);
          const cell = axisCount <= 1 ? 1 : 1 / (axisCount - 1);
          const offset = jitter === 0 ? 0 : (random01(randomState) * 2 - 1) * jitter * cell;
          const normalized = clamp(base + offset, 0, 1);
          return minimum[axis]! + (maximum[axis]! - minimum[axis]!) * normalized;
        }) as [number, number, number];
        output.push(position);
      }
    }
  }
  return output;
}

function resolveVectorFieldSeeds(data: SpatialVectorFieldData): {
  readonly records: readonly ResolvedVectorFieldSeed[];
  readonly sourceCount: number;
} {
  const explicit = data.seeds ?? [];
  const generated =
    data.seedGrid === undefined
      ? explicit.length === 0
        ? seedGrid(data, { dimensions: [2, 2, 2] })
        : []
      : seedGrid(data, data.seedGrid);
  const candidates: ResolvedVectorFieldSeed[] = [
    ...explicit.map((point, sourceIndex): ResolvedVectorFieldSeed => ({
      point: [point[0], point[1], point[2]],
      sourceIndex,
      source: 'explicit',
    })),
    ...generated.map((point, index): ResolvedVectorFieldSeed => ({
      point: [point[0], point[1], point[2]],
      sourceIndex: explicit.length + index,
      source: 'grid',
    })),
  ];
  const output: ResolvedVectorFieldSeed[] = [];
  for (const candidate of candidates) {
    const { point } = candidate;
    if (!insideField(data, point)) continue;
    if (output.some((retained) => length3(subtract3(retained.point, point)) <= 1e-9)) continue;
    output.push(candidate);
  }
  return { records: output, sourceCount: candidates.length };
}

/** Produces stable explicit-plus-grid seeds without executable callbacks. */
export function generateVectorFieldSeeds(data: SpatialVectorFieldData): readonly SpatialVec3[] {
  return resolveVectorFieldSeeds(data).records.map(({ point }) => point);
}

function resolveIntegration(
  data: SpatialVectorFieldData,
  input: SpatialVectorIntegrationSpec = {},
): ResolvedIntegration {
  const step = fieldSpacing(data);
  const characteristic = Math.min(step[0], step[1], step[2]);
  const [minimum, maximum] = vectorFieldWorldBounds(data);
  const diagonal = length3(subtract3(maximum, minimum));
  const minStep = input.minStep ?? characteristic / 128;
  const maxStep = input.maxStep ?? characteristic;
  return {
    direction: input.direction ?? 'both',
    initialStep: clamp(input.initialStep ?? characteristic * 0.35, minStep, maxStep),
    minStep,
    maxStep,
    tolerance: input.tolerance ?? Math.max(1e-8, characteristic * 1e-3),
    maxSteps: Math.trunc(input.maxSteps ?? 512),
    maxLength: input.maxLength ?? diagonal * 4,
    minMagnitude: input.minMagnitude ?? 1e-9,
  };
}

function directionAt(
  data: SpatialVectorFieldData,
  point: SpatialVec3,
  sign: 1 | -1,
  minimumMagnitude: number,
): SpatialVec3 | null {
  const sample = sampleVectorField(data, point);
  if (sample === null || sample.magnitude <= minimumMagnitude) return null;
  return scale3(normalize3(sample.vector), sign);
}

function rk4Step(
  data: SpatialVectorFieldData,
  point: SpatialVec3,
  step: number,
  sign: 1 | -1,
  minimumMagnitude: number,
): SpatialVec3 | null {
  const k1 = directionAt(data, point, sign, minimumMagnitude);
  if (k1 === null) return null;
  const k2 = directionAt(data, add3(point, scale3(k1, step / 2)), sign, minimumMagnitude);
  if (k2 === null) return null;
  const k3 = directionAt(data, add3(point, scale3(k2, step / 2)), sign, minimumMagnitude);
  if (k3 === null) return null;
  const k4 = directionAt(data, add3(point, scale3(k3, step)), sign, minimumMagnitude);
  if (k4 === null) return null;
  return add3(point, scale3(add3(add3(k1, scale3(k2, 2)), add3(scale3(k3, 2), k4)), step / 6));
}

interface DirectionPath {
  readonly points: readonly SpatialVec3[];
  readonly magnitudes: readonly number[];
  readonly acceptedSteps: number;
  readonly rejectedSteps: number;
  readonly termination: IntegratedVectorPath['termination'];
}

function integrateDirection(
  data: SpatialVectorFieldData,
  seed: SpatialVec3,
  sign: 1 | -1,
  options: ResolvedIntegration,
): DirectionPath {
  const first = sampleVectorField(data, seed);
  if (first === null || first.magnitude <= options.minMagnitude) {
    return {
      points: [seed],
      magnitudes: [first?.magnitude ?? 0],
      acceptedSteps: 0,
      rejectedSteps: 0,
      termination: 'stagnation',
    };
  }
  const points: SpatialVec3[] = [seed];
  const magnitudes: number[] = [first.magnitude];
  let acceptedSteps = 0;
  let rejectedSteps = 0;
  let pathLength = 0;
  let step = options.initialStep;
  let termination: IntegratedVectorPath['termination'] = 'max-steps';
  let attempts = 0;
  while (acceptedSteps < options.maxSteps && attempts < options.maxSteps * 8) {
    attempts += 1;
    const current = points[points.length - 1]!;
    const full = rk4Step(data, current, step, sign, options.minMagnitude);
    const half = rk4Step(data, current, step / 2, sign, options.minMagnitude);
    const refined =
      half === null ? null : rk4Step(data, half, step / 2, sign, options.minMagnitude);
    if (full === null || refined === null) {
      termination = insideField(data, current) ? 'stagnation' : 'bounds';
      break;
    }
    const error = length3(subtract3(refined, full));
    if (error > options.tolerance && step > options.minStep * 1.000001) {
      step = Math.max(
        options.minStep,
        step * Math.max(0.2, 0.9 * (options.tolerance / error) ** 0.2),
      );
      rejectedSteps += 1;
      continue;
    }
    if (!insideField(data, refined)) {
      termination = 'bounds';
      break;
    }
    const distance = length3(subtract3(refined, current));
    if (distance <= 1e-12) {
      termination = 'stagnation';
      break;
    }
    if (pathLength + distance > options.maxLength) {
      termination = 'max-length';
      break;
    }
    const sample = sampleVectorField(data, refined);
    if (sample === null || sample.magnitude <= options.minMagnitude) {
      termination = 'stagnation';
      break;
    }
    points.push(refined);
    magnitudes.push(sample.magnitude);
    pathLength += distance;
    acceptedSteps += 1;
    const factor = error <= 1e-16 ? 2 : clamp(0.9 * (options.tolerance / error) ** 0.2, 0.5, 2);
    step = clamp(step * factor, options.minStep, options.maxStep);
    if (step <= options.minStep && error > options.tolerance) {
      termination = 'minimum-step';
      break;
    }
  }
  return { points, magnitudes, acceptedSteps, rejectedSteps, termination };
}

/** Integrates a bounded raw 3D field with deterministic adaptive RK4 step doubling. */
export function integrateVectorField(
  data: SpatialVectorFieldData,
  input: SpatialVectorIntegrationSpec = {},
): IntegratedVectorField {
  const options = resolveIntegration(data, input);
  const resolvedSeeds = resolveVectorFieldSeeds(data);
  const seeds = resolvedSeeds.records.map(({ point }) => point);
  const paths: IntegratedVectorPath[] = [];
  let totalAccepted = 0;
  let totalRejected = 0;
  for (const seedRecord of resolvedSeeds.records) {
    const seed = seedRecord.point;
    const backward =
      options.direction === 'forward' ? null : integrateDirection(data, seed, -1, options);
    const forward =
      options.direction === 'backward' ? null : integrateDirection(data, seed, 1, options);
    const points = [
      ...(backward === null ? [] : [...backward.points].reverse().slice(0, -1)),
      ...(forward?.points ?? [seed]),
    ];
    const magnitudes = [
      ...(backward === null ? [] : [...backward.magnitudes].reverse().slice(0, -1)),
      ...(forward?.magnitudes ?? [sampleVectorField(data, seed)?.magnitude ?? 0]),
    ];
    const acceptedSteps = (backward?.acceptedSteps ?? 0) + (forward?.acceptedSteps ?? 0);
    const rejectedSteps = (backward?.rejectedSteps ?? 0) + (forward?.rejectedSteps ?? 0);
    totalAccepted += acceptedSteps;
    totalRejected += rejectedSteps;
    paths.push({
      seedIndex: seedRecord.sourceIndex,
      seedSource: seedRecord.source,
      points,
      magnitudes,
      acceptedSteps,
      rejectedSteps,
      termination: forward?.termination ?? backward?.termination ?? 'stagnation',
    });
  }
  return {
    seeds,
    seedSourceIndices: resolvedSeeds.records.map(({ sourceIndex }) => sourceIndex),
    sourceSeedCount: resolvedSeeds.sourceCount,
    paths,
    method: 'adaptive-rk4-step-doubling',
    acceptedSteps: totalAccepted,
    rejectedSteps: totalRejected,
  };
}
