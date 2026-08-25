import type { Point } from '../scene/types.js';

/** Function-free curve names accepted by line-like portable marks. */
export const curveNames = [
  'straight',
  'step-before',
  'step-after',
  'step-mid',
  'monotone-x',
  'natural',
  'basis',
  'cardinal',
] as const;

export type CurveName = (typeof curveNames)[number];
export type MissingValuePolicy = 'gap' | 'zero' | 'connect';

export interface CurveOptions {
  /** Cardinal tension in the inclusive 0..1 range. Zero is Catmull-Rom compatible. */
  readonly tension?: number;
  /** Number of straight Scene segments sampled from each curved source interval. */
  readonly samples?: number;
}

export type CurveInterpolator = (
  points: readonly Point[],
  options?: CurveOptions,
) => readonly Point[];

function subdivisions(options: CurveOptions | undefined): number {
  const requested = options?.samples;
  return typeof requested === 'number' && Number.isFinite(requested)
    ? Math.max(1, Math.min(64, Math.floor(requested)))
    : 8;
}

function boundedTension(options: CurveOptions | undefined): number {
  const requested = options?.tension;
  return typeof requested === 'number' && Number.isFinite(requested)
    ? Math.max(0, Math.min(1, requested))
    : 0;
}

function straight(points: readonly Point[]): readonly Point[] {
  return [...points];
}

function stepBefore(points: readonly Point[]): readonly Point[] {
  const output: Point[] = [];
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (previous !== undefined) output.push({ x: previous.x, y: point.y });
    output.push(point);
  });
  return output;
}

function stepAfter(points: readonly Point[]): readonly Point[] {
  const output: Point[] = [];
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (previous !== undefined) output.push({ x: point.x, y: previous.y });
    output.push(point);
  });
  return output;
}

function stepMid(points: readonly Point[]): readonly Point[] {
  const first = points[0];
  if (first === undefined) return [];
  const output: Point[] = [first];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (previous === undefined || point === undefined) continue;
    const middle = (previous.x + point.x) / 2;
    output.push({ x: middle, y: previous.y }, { x: middle, y: point.y }, point);
  }
  return output;
}

function cardinal(points: readonly Point[], options?: CurveOptions): readonly Point[] {
  if (points.length < 3) return [...points];
  const samples = subdivisions(options);
  const tangentScale = 1 - boundedTension(options);
  const output: Point[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)] ?? points[0]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[Math.min(points.length - 1, index + 2)] ?? p2;
    const m1 = {
      x: ((p2.x - p0.x) * tangentScale) / 2,
      y: ((p2.y - p0.y) * tangentScale) / 2,
    };
    const m2 = {
      x: ((p3.x - p1.x) * tangentScale) / 2,
      y: ((p3.y - p1.y) * tangentScale) / 2,
    };
    for (let sample = 0; sample < samples; sample += 1) {
      const t = sample / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      output.push({
        x: h00 * p1.x + h10 * m1.x + h01 * p2.x + h11 * m2.x,
        y: h00 * p1.y + h10 * m1.y + h01 * p2.y + h11 * m2.y,
      });
    }
  }
  output.push(points.at(-1)!);
  return output;
}

function monotoneX(points: readonly Point[], options?: CurveOptions): readonly Point[] {
  if (points.length < 3) return [...points];
  const direction = Math.sign((points.at(-1)?.x ?? 0) - (points[0]?.x ?? 0));
  if (
    direction === 0 ||
    points.some((point, index) => {
      const previous = points[index - 1];
      return previous !== undefined && Math.sign(point.x - previous.x) !== direction;
    })
  ) {
    return [...points];
  }

  const slopes = Array.from({ length: points.length - 1 }, (_, index) => {
    const left = points[index]!;
    const right = points[index + 1]!;
    return (right.y - left.y) / (right.x - left.x);
  });
  const tangents = Array.from({ length: points.length }, (_, index) => {
    const left = slopes[index - 1];
    const right = slopes[index];
    if (left === undefined) return right ?? 0;
    if (right === undefined) return left;
    if (left === 0 || right === 0 || Math.sign(left) !== Math.sign(right)) return 0;
    return (2 * left * right) / (left + right);
  });
  const samples = subdivisions(options);
  const output: Point[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index]!;
    const right = points[index + 1]!;
    const span = right.x - left.x;
    for (let sample = 0; sample < samples; sample += 1) {
      const t = sample / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      output.push({
        x: left.x + span * t,
        y:
          h00 * left.y +
          h10 * span * (tangents[index] ?? 0) +
          h01 * right.y +
          h11 * span * (tangents[index + 1] ?? 0),
      });
    }
  }
  output.push(points.at(-1)!);
  return output;
}

function naturalCoordinate(values: readonly number[]): readonly number[] {
  const count = values.length;
  if (count < 3) return Array.from({ length: count }, () => 0);
  const second = Array.from({ length: count }, () => 0);
  const interiorCount = count - 2;
  const upper: number[] = [];
  const right: number[] = [];
  for (let interior = 0; interior < interiorCount; interior += 1) {
    const index = interior + 1;
    const source = 6 * (values[index - 1]! - 2 * values[index]! + values[index + 1]!);
    const denominator = 4 - (interior === 0 ? 0 : upper[interior - 1]!);
    upper[interior] = interior === interiorCount - 1 ? 0 : 1 / denominator;
    right[interior] = (source - (interior === 0 ? 0 : right[interior - 1]!)) / denominator;
  }
  for (let interior = interiorCount - 1; interior >= 0; interior -= 1) {
    second[interior + 1] =
      right[interior]! -
      (interior === interiorCount - 1 ? 0 : upper[interior]! * second[interior + 2]!);
  }
  return second;
}

function natural(points: readonly Point[], options?: CurveOptions): readonly Point[] {
  if (points.length < 3) return [...points];
  const xSecond = naturalCoordinate(points.map(({ x }) => x));
  const ySecond = naturalCoordinate(points.map(({ y }) => y));
  const samples = subdivisions(options);
  const output: Point[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index]!;
    const right = points[index + 1]!;
    for (let sample = 0; sample < samples; sample += 1) {
      const t = sample / samples;
      const inverse = 1 - t;
      const correctionLeft = (inverse * inverse * inverse - inverse) / 6;
      const correctionRight = (t * t * t - t) / 6;
      output.push({
        x:
          inverse * left.x +
          t * right.x +
          correctionLeft * xSecond[index]! +
          correctionRight * xSecond[index + 1]!,
        y:
          inverse * left.y +
          t * right.y +
          correctionLeft * ySecond[index]! +
          correctionRight * ySecond[index + 1]!,
      });
    }
  }
  output.push(points.at(-1)!);
  return output;
}

function basis(points: readonly Point[], options?: CurveOptions): readonly Point[] {
  if (points.length < 3) return [...points];
  const first = points[0]!;
  const last = points.at(-1)!;
  const controls = [first, first, ...points, last, last];
  const samples = subdivisions(options);
  const output: Point[] = [];
  for (let index = 0; index < controls.length - 3; index += 1) {
    const p0 = controls[index]!;
    const p1 = controls[index + 1]!;
    const p2 = controls[index + 2]!;
    const p3 = controls[index + 3]!;
    for (let sample = 0; sample < samples; sample += 1) {
      const t = sample / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const b0 = (1 - 3 * t + 3 * t2 - t3) / 6;
      const b1 = (4 - 6 * t2 + 3 * t3) / 6;
      const b2 = (1 + 3 * t + 3 * t2 - 3 * t3) / 6;
      const b3 = t3 / 6;
      output.push({
        x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
        y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
      });
    }
  }
  output[0] = first;
  output.push(last);
  return output;
}

/** Immutable renderer-neutral curve registry used by every line-like compiler. */
export const curveRegistry: Readonly<Record<CurveName, CurveInterpolator>> = Object.freeze({
  straight,
  'step-before': stepBefore,
  'step-after': stepAfter,
  'step-mid': stepMid,
  'monotone-x': monotoneX,
  natural,
  basis,
  cardinal,
});

export function isCurveName(value: unknown): value is CurveName {
  return typeof value === 'string' && curveNames.includes(value as CurveName);
}

export function resolveCurveName(value: unknown, fallback: CurveName): CurveName {
  return isCurveName(value) ? value : fallback;
}

export function interpolateCurve(
  points: readonly Point[],
  curve: CurveName,
  options?: CurveOptions,
): readonly Point[] {
  return curveRegistry[curve](points, options);
}
