import { GraflumeError } from '../core/errors.js';
import {
  contourThresholds,
  extractIsolines,
  type ContourGridPoint,
  type ContourIsoline,
} from './contours.js';

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite number.`, { path });
  }
  return value;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

interface ScalarVertex {
  readonly x: number;
  readonly y: number;
  readonly value: number;
  readonly source: number;
}

interface ScalarTriangle {
  readonly vertices: readonly [ScalarVertex, ScalarVertex, ScalarVertex];
  readonly source: number;
}

export interface RegularScalarField {
  readonly width: number;
  readonly height: number;
  readonly values: readonly (number | null)[];
  readonly x?: readonly number[];
  readonly y?: readonly number[];
  readonly mask?: readonly boolean[];
}

export interface IrregularScalarField {
  readonly points: readonly {
    readonly x: number;
    readonly y: number;
    readonly value: number;
    readonly source?: number;
  }[];
  readonly triangles: readonly (readonly [number, number, number])[];
}

export type ScalarField = RegularScalarField | IrregularScalarField;

export interface ContourFieldOptions {
  readonly thresholds?: readonly number[];
  readonly levels?: number;
  readonly method?: 'linear' | 'quantile';
  readonly filled?: boolean;
  readonly smoothing?: number;
  readonly saddle?: 'asymptotic' | 'high' | 'low';
}

export interface ContourBandRegion {
  readonly low: number;
  readonly high: number;
  readonly outer: readonly ContourGridPoint[];
  readonly holes: readonly (readonly ContourGridPoint[])[];
  readonly sourceTriangles: readonly number[];
}

export interface ContourFieldResult {
  readonly thresholds: readonly number[];
  readonly isolines: readonly ContourIsoline[];
  readonly bands: readonly ContourBandRegion[];
  readonly input: 'regular-grid' | 'triangulated-irregular';
}

function isIrregular(field: ScalarField): field is IrregularScalarField {
  return 'points' in field;
}

function regularGrid(field: RegularScalarField): {
  readonly grid: readonly (readonly (number | null)[])[];
  readonly points: readonly (readonly (ContourGridPoint | null)[])[];
  readonly triangles: readonly ScalarTriangle[];
} {
  const width = Math.floor(finite(field.width, '$.width'));
  const height = Math.floor(finite(field.height, '$.height'));
  if (width < 2 || height < 2 || field.values.length !== width * height) {
    throw new GraflumeError(
      'INVALID_DATA',
      'Regular scalar field needs at least 2x2 values matching width*height.',
    );
  }
  if (field.x !== undefined && field.x.length !== width)
    throw new GraflumeError('INVALID_DATA', '$.x length must equal width.');
  if (field.y !== undefined && field.y.length !== height)
    throw new GraflumeError('INVALID_DATA', '$.y length must equal height.');
  if (field.mask !== undefined && field.mask.length !== field.values.length)
    throw new GraflumeError('INVALID_DATA', '$.mask length must equal values length.');
  const grid = Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, column) => {
      const index = row * width + column;
      if (field.mask?.[index] === false) return null;
      const value = field.values[index];
      return value === null ? null : finite(value, `$.values[${index}]`);
    }),
  );
  const points = Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, column) => ({
      x: field.x === undefined ? column : finite(field.x[column], `$.x[${column}]`),
      y: field.y === undefined ? row : finite(field.y[row], `$.y[${row}]`),
    })),
  );
  const triangles: ScalarTriangle[] = [];
  for (let row = 0; row < height - 1; row += 1) {
    for (let column = 0; column < width - 1; column += 1) {
      const indices = [
        row * width + column,
        row * width + column + 1,
        (row + 1) * width + column + 1,
        (row + 1) * width + column,
      ] as const;
      const vertices = indices.map((index) => {
        const value = field.mask?.[index] === false ? null : field.values[index];
        if (value === null) return null;
        const r = Math.floor(index / width);
        const c = index % width;
        return {
          x: points[r]![c]!.x,
          y: points[r]![c]!.y,
          value: finite(value, `$.values[${index}]`),
          source: index,
        };
      });
      if (vertices.some((vertex) => vertex === null)) continue;
      const [a, b, c, d] = vertices as [ScalarVertex, ScalarVertex, ScalarVertex, ScalarVertex];
      const source = row * (width - 1) + column;
      triangles.push({ vertices: [a, b, c], source }, { vertices: [a, c, d], source });
    }
  }
  return { grid, points, triangles };
}

function irregularTriangles(field: IrregularScalarField): ScalarTriangle[] {
  const points = field.points.map((point, index): ScalarVertex => ({
    x: finite(point.x, `$.points[${index}].x`),
    y: finite(point.y, `$.points[${index}].y`),
    value: finite(point.value, `$.points[${index}].value`),
    source: point.source ?? index,
  }));
  return field.triangles.map((triangle, index) => {
    const indices = [...triangle];
    if (
      new Set(indices).size !== 3 ||
      indices.some((value) => !Number.isInteger(value) || value < 0 || value >= points.length)
    ) {
      throw new GraflumeError(
        'INVALID_DATA',
        `$.triangles[${index}] must reference three unique points.`,
      );
    }
    const vertices = indices.map((pointIndex) => points[pointIndex]!) as [
      ScalarVertex,
      ScalarVertex,
      ScalarVertex,
    ];
    const area =
      (vertices[1].x - vertices[0].x) * (vertices[2].y - vertices[0].y) -
      (vertices[1].y - vertices[0].y) * (vertices[2].x - vertices[0].x);
    if (Math.abs(area) < 1e-12)
      throw new GraflumeError('INVALID_DATA', `$.triangles[${index}] is degenerate.`);
    return {
      vertices: area > 0 ? vertices : [vertices[0], vertices[2], vertices[1]],
      source: index,
    };
  });
}

function interpolateVertex(a: ScalarVertex, b: ScalarVertex, level: number): ScalarVertex {
  const ratio = a.value === b.value ? 0.5 : clamp((level - a.value) / (b.value - a.value), 0, 1);
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    value: level,
    source: a.source,
  };
}

function clipScalar(
  polygon: readonly ScalarVertex[],
  level: number,
  keepAbove: boolean,
): ScalarVertex[] {
  const output: ScalarVertex[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]!;
    const next = polygon[(index + 1) % polygon.length]!;
    const currentInside = keepAbove ? current.value >= level : current.value <= level;
    const nextInside = keepAbove ? next.value >= level : next.value <= level;
    if (currentInside) output.push(current);
    if (currentInside !== nextInside) output.push(interpolateVertex(current, next, level));
  }
  return output;
}

function pointKey(point: ContourGridPoint): string {
  return `${Math.round(point.x * 1e9)}:${Math.round(point.y * 1e9)}`;
}

function edgeKey(a: ContourGridPoint, b: ContourGridPoint): string {
  const first = pointKey(a);
  const second = pointKey(b);
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function signedArea(points: readonly ContourGridPoint[]): number {
  let area = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function pointInRing(point: ContourGridPoint, ring: readonly ContourGridPoint[]): boolean {
  let inside = false;
  for (
    let current = 0, previous = ring.length - 1;
    current < ring.length;
    previous = current, current += 1
  ) {
    const a = ring[current]!;
    const b = ring[previous]!;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function smoothRing(points: readonly ContourGridPoint[], iterations: number): ContourGridPoint[] {
  let output = [...points];
  const closed = pointKey(output[0]!) === pointKey(output.at(-1)!);
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const source = closed ? output.slice(0, -1) : output;
    const next: ContourGridPoint[] = [];
    for (let index = 0; index < source.length - (closed ? 0 : 1); index += 1) {
      const a = source[index]!;
      const b = source[(index + 1) % source.length]!;
      next.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 },
      );
    }
    if (!closed) (next.unshift(source[0]!), next.push(source.at(-1)!));
    else next.push(next[0]!);
    output = next;
  }
  return output;
}

function bandRegions(
  triangles: readonly ScalarTriangle[],
  low: number,
  high: number,
  smoothing: number,
): ContourBandRegion[] {
  const boundary = new Map<
    string,
    { readonly a: ContourGridPoint; readonly b: ContourGridPoint; readonly sources: Set<number> }
  >();
  triangles.forEach((triangle) => {
    const above = clipScalar(triangle.vertices, low, true);
    const polygon = above.length < 3 ? [] : clipScalar(above, high, false);
    if (polygon.length < 3) return;
    for (let index = 0; index < polygon.length; index += 1) {
      const a = polygon[index]!;
      const b = polygon[(index + 1) % polygon.length]!;
      const key = edgeKey(a, b);
      if (boundary.has(key)) boundary.delete(key);
      else boundary.set(key, { a, b, sources: new Set([triangle.source]) });
    }
  });
  const remaining = [...boundary.values()];
  const rings: { points: ContourGridPoint[]; sources: Set<number> }[] = [];
  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const points: ContourGridPoint[] = [seed.a, seed.b];
    const sources = new Set(seed.sources);
    let current = seed.b;
    for (let guard = 0; guard < boundary.size + 2; guard += 1) {
      const index = remaining.findIndex(
        ({ a, b }) => pointKey(a) === pointKey(current) || pointKey(b) === pointKey(current),
      );
      if (index < 0) break;
      const edge = remaining.splice(index, 1)[0]!;
      edge.sources.forEach((source) => sources.add(source));
      current = pointKey(edge.a) === pointKey(current) ? edge.b : edge.a;
      points.push(current);
      if (pointKey(current) === pointKey(points[0]!)) break;
    }
    if (points.length >= 4 && pointKey(points[0]!) === pointKey(points.at(-1)!))
      rings.push({ points: smoothRing(points, smoothing), sources });
  }
  const ordered = rings.sort(
    (a, b) => Math.abs(signedArea(b.points)) - Math.abs(signedArea(a.points)),
  );
  const regions: ContourBandRegion[] = [];
  ordered.forEach((ring) => {
    const parent = regions.find((region) => pointInRing(ring.points[0]!, region.outer));
    if (parent === undefined) {
      regions.push({
        low,
        high,
        outer: ring.points,
        holes: [],
        sourceTriangles: [...ring.sources].sort((a, b) => a - b),
      });
    } else {
      const index = regions.indexOf(parent);
      regions[index] = {
        ...parent,
        holes: [...parent.holes, ring.points],
        sourceTriangles: [...new Set([...parent.sourceTriangles, ...ring.sources])].sort(
          (a, b) => a - b,
        ),
      };
    }
  });
  return regions;
}

function triangleIsolines(
  triangles: readonly ScalarTriangle[],
  levels: readonly number[],
  smoothing: number,
): ContourIsoline[] {
  const output: ContourIsoline[] = [];
  levels.forEach((level, levelIndex) => {
    const segments: { a: ContourGridPoint; b: ContourGridPoint; source: number }[] = [];
    triangles.forEach((triangle) => {
      const intersections: ContourGridPoint[] = [];
      for (let index = 0; index < 3; index += 1) {
        const a = triangle.vertices[index]!;
        const b = triangle.vertices[(index + 1) % 3]!;
        if ((a.value < level && b.value >= level) || (b.value < level && a.value >= level))
          intersections.push(interpolateVertex(a, b, level));
      }
      if (intersections.length === 2)
        segments.push({ a: intersections[0]!, b: intersections[1]!, source: triangle.source });
    });
    while (segments.length > 0) {
      const seed = segments.shift()!;
      const points: ContourGridPoint[] = [seed.a, seed.b];
      const sources = new Set([seed.source]);
      let current = seed.b;
      for (;;) {
        const index = segments.findIndex(
          ({ a, b }) => pointKey(a) === pointKey(current) || pointKey(b) === pointKey(current),
        );
        if (index < 0) break;
        const segment = segments.splice(index, 1)[0]!;
        sources.add(segment.source);
        current = pointKey(segment.a) === pointKey(current) ? segment.b : segment.a;
        points.push(current);
        if (pointKey(current) === pointKey(points[0]!)) break;
      }
      output.push({
        level,
        levelIndex,
        points: smoothRing(points, smoothing),
        closed: pointKey(points[0]!) === pointKey(points.at(-1)!),
        sourceRows: [...sources].sort((a, b) => a - b),
      });
    }
  });
  return output;
}

/** Extracts regular or triangulated irregular isolines and filled/banded polygon-hole topology. */
export function contourField(
  field: ScalarField,
  options: ContourFieldOptions = {},
): ContourFieldResult {
  const smoothing = clamp(Math.floor(options.smoothing ?? 0), 0, 4);
  let triangles: readonly ScalarTriangle[];
  let grid: readonly (readonly (number | null)[])[] | null = null;
  let gridPoints: readonly (readonly (ContourGridPoint | null)[])[] | null = null;
  if (isIrregular(field)) triangles = irregularTriangles(field);
  else {
    const regular = regularGrid(field);
    triangles = regular.triangles;
    grid = regular.grid;
    gridPoints = regular.points;
  }
  const values = triangles.flatMap(({ vertices }) => vertices.map(({ value }) => value));
  const thresholdGrid = grid ?? [values];
  const thresholds = contourThresholds(thresholdGrid, {
    ...(options.thresholds === undefined ? {} : { thresholds: options.thresholds }),
    ...(options.levels === undefined ? {} : { levels: options.levels }),
    ...(options.method === undefined ? {} : { method: options.method }),
  });
  const isolines =
    grid !== null && gridPoints !== null
      ? extractIsolines(grid, gridPoints, thresholds, undefined, {
          saddle: options.saddle ?? 'asymptotic',
        }).map((line) => ({ ...line, points: smoothRing(line.points, smoothing) }))
      : triangleIsolines(triangles, thresholds, smoothing);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const bounds = [...new Set([minimum, ...thresholds, maximum])].sort((a, b) => a - b);
  const bands =
    options.filled === false
      ? []
      : bounds
          .slice(0, -1)
          .flatMap((low, index) => bandRegions(triangles, low, bounds[index + 1]!, smoothing));
  return {
    thresholds,
    isolines,
    bands,
    input: isIrregular(field) ? 'triangulated-irregular' : 'regular-grid',
  };
}

export interface Vector2FieldDatum {
  readonly x: number;
  readonly y: number;
  readonly u: number;
  readonly v: number;
  readonly id?: string;
}

export interface Vector2FieldOptions {
  readonly normalize?: 'none' | 'unit' | 'maximum';
  readonly sample?: { readonly columns?: number; readonly rows?: number };
  readonly seeds?: readonly (readonly [number, number])[];
  readonly direction?: 'forward' | 'backward' | 'both';
  readonly step?: number;
  readonly tolerance?: number;
  readonly maximumSteps?: number;
  readonly minimumMagnitude?: number;
}

export interface Vector2Sample {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly u: number;
  readonly v: number;
  readonly magnitude: number;
  readonly direction: number;
}

function nearestVector(data: readonly Vector2Sample[], x: number, y: number): Vector2Sample | null {
  let nearest: Vector2Sample | null = null;
  let distance = Infinity;
  data.forEach((datum) => {
    const current = (datum.x - x) ** 2 + (datum.y - y) ** 2;
    if (current < distance) {
      distance = current;
      nearest = datum;
    }
  });
  return nearest;
}

function integrateVector(
  field: readonly Vector2Sample[],
  seed: readonly [number, number],
  sign: number,
  bounds: readonly [number, number, number, number],
  options: Vector2FieldOptions,
): { x: number; y: number; magnitude: number }[] {
  const points: { x: number; y: number; magnitude: number }[] = [];
  let x = seed[0];
  let y = seed[1];
  let step = finite(
    options.step ?? Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]) / 80,
    '$.step',
  );
  const tolerance = finite(options.tolerance ?? step * 0.05, '$.tolerance');
  const maximumSteps = clamp(Math.floor(options.maximumSteps ?? 500), 1, 20_000);
  const minimumMagnitude = Math.max(
    0,
    finite(options.minimumMagnitude ?? 1e-9, '$.minimumMagnitude'),
  );
  const vectorAt = (px: number, py: number) => {
    const vector = nearestVector(field, px, py);
    if (vector === null) return null;
    const magnitude = Math.hypot(vector.u, vector.v);
    if (magnitude < minimumMagnitude) return null;
    return {
      u: (vector.u / magnitude) * sign,
      v: (vector.v / magnitude) * sign,
      magnitude,
    };
  };
  const advance = (px: number, py: number, amount: number) => {
    const first = vectorAt(px, py);
    if (first === null) return null;
    const second = vectorAt(px + (first.u * amount) / 2, py + (first.v * amount) / 2);
    if (second === null) return null;
    const third = vectorAt(px + (second.u * amount) / 2, py + (second.v * amount) / 2);
    if (third === null) return null;
    const fourth = vectorAt(px + third.u * amount, py + third.v * amount);
    if (fourth === null) return null;
    return {
      x: px + (amount * (first.u + 2 * second.u + 2 * third.u + fourth.u)) / 6,
      y: py + (amount * (first.v + 2 * second.v + 2 * third.v + fourth.v)) / 6,
      magnitude: first.magnitude,
    };
  };
  for (let index = 0; index < maximumSteps; index += 1) {
    const full = advance(x, y, step);
    const half = advance(x, y, step / 2);
    const twoHalf = half === null ? null : advance(half.x, half.y, step / 2);
    if (full === null || twoHalf === null) break;
    const error = Math.hypot(full.x - twoHalf.x, full.y - twoHalf.y);
    if (error > tolerance && step > 1e-9) {
      step *= 0.5;
      continue;
    }
    x = twoHalf.x;
    y = twoHalf.y;
    if (x < bounds[0] || x > bounds[2] || y < bounds[1] || y > bounds[3]) break;
    points.push({ x, y, magnitude: twoHalf.magnitude });
    if (error < tolerance / 4) step *= 1.5;
    if (points.length > 2 && Math.hypot(points[0]!.x - x, points[0]!.y - y) < step * 0.5) break;
  }
  return points;
}

/** Computes magnitude/direction, normalized/sampled quivers and seeded adaptive forward/backward streamlines. */
export function analyzeVectorField(
  data: readonly Vector2FieldDatum[],
  options: Vector2FieldOptions = {},
) {
  if (data.length === 0) return { vectors: [], streamlines: [], bounds: [0, 0, 1, 1] as const };
  const raw = data.map((datum, index): Vector2Sample => {
    const x = finite(datum.x, `$.data[${index}].x`);
    const y = finite(datum.y, `$.data[${index}].y`);
    const u = finite(datum.u, `$.data[${index}].u`);
    const v = finite(datum.v, `$.data[${index}].v`);
    return {
      id: datum.id?.trim() || `vector-${index}`,
      x,
      y,
      u,
      v,
      magnitude: Math.hypot(u, v),
      direction: Math.atan2(v, u),
    };
  });
  const maximum = Math.max(...raw.map(({ magnitude }) => magnitude), Number.EPSILON);
  const normalized = raw.map((datum) => {
    const divisor =
      options.normalize === 'unit'
        ? datum.magnitude || 1
        : options.normalize === 'maximum'
          ? maximum
          : 1;
    return { ...datum, u: datum.u / divisor, v: datum.v / divisor };
  });
  const bounds = [
    Math.min(...raw.map(({ x }) => x)),
    Math.min(...raw.map(({ y }) => y)),
    Math.max(...raw.map(({ x }) => x)),
    Math.max(...raw.map(({ y }) => y)),
  ] as const;
  const columns = clamp(
    Math.floor(options.sample?.columns ?? Math.ceil(Math.sqrt(raw.length))),
    1,
    1_000,
  );
  const rows = clamp(Math.floor(options.sample?.rows ?? columns), 1, 1_000);
  const sampled: Vector2Sample[] = [];
  const sampledIds = new Set<string>();
  for (let row = 0; row < rows; row += 1)
    for (let column = 0; column < columns; column += 1) {
      const x = bounds[0] + ((bounds[2] - bounds[0]) * (column + 0.5)) / columns;
      const y = bounds[1] + ((bounds[3] - bounds[1]) * (row + 0.5)) / rows;
      const nearest = nearestVector(normalized, x, y);
      if (nearest !== null && !sampledIds.has(nearest.id)) {
        sampledIds.add(nearest.id);
        sampled.push(nearest);
      }
    }
  const seeds = options.seeds ?? sampled.map(({ x, y }) => [x, y] as const);
  const direction = options.direction ?? 'both';
  const streamlines = seeds
    .map((seed, index) => {
      const forward =
        direction === 'backward' ? [] : integrateVector(normalized, seed, 1, bounds, options);
      const backward =
        direction === 'forward'
          ? []
          : integrateVector(normalized, seed, -1, bounds, options).reverse();
      return {
        id: `streamline-${index}`,
        seed: [...seed] as const,
        points: [
          ...backward,
          {
            x: seed[0],
            y: seed[1],
            magnitude: Math.hypot(
              nearestVector(normalized, seed[0], seed[1])?.u ?? 0,
              nearestVector(normalized, seed[0], seed[1])?.v ?? 0,
            ),
          },
          ...forward,
        ],
      };
    })
    .filter(({ points }) => points.length > 1);
  return { vectors: sampled, streamlines, bounds };
}
