export interface ContourGridPoint {
  readonly x: number;
  readonly y: number;
}

export type ContourSaddlePolicy = 'asymptotic' | 'high' | 'low';

export interface ContourExtractionOptions {
  readonly maximumSegments?: number;
  readonly saddle?: ContourSaddlePolicy;
}

export interface ContourIsoline {
  readonly level: number;
  readonly levelIndex: number;
  readonly points: readonly ContourGridPoint[];
  readonly closed: boolean;
  readonly sourceRows: readonly number[];
}

interface Segment {
  readonly level: number;
  readonly levelIndex: number;
  readonly points: readonly [ContourGridPoint, ContourGridPoint];
  readonly sourceRows: readonly number[];
}

export interface ContourThresholdOptions {
  readonly levels?: number;
  readonly thresholds?: readonly number[];
  readonly method?: 'linear' | 'quantile';
}

function quantile(values: readonly number[], probability: number): number {
  const position = Math.max(0, Math.min(1, probability)) * (values.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const a = values[lower]!;
  const b = values[upper]!;
  return a + (b - a) * (position - lower);
}

/** Resolves sorted unique explicit, linear, or type-7 quantile thresholds. */
export function contourThresholds(
  grid: readonly (readonly (number | null)[])[],
  options: ContourThresholdOptions = {},
): readonly number[] {
  const values = grid
    .flatMap((row) => row)
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (values.length === 0) return [];
  const minimum = values[0]!;
  const maximum = values.at(-1)!;
  const explicit = options.thresholds
    ?.filter((value) => Number.isFinite(value) && value >= minimum && value <= maximum)
    .sort((left, right) => left - right);
  if (explicit !== undefined) return [...new Set(explicit)];
  if (minimum === maximum) return [minimum];
  const count = Math.max(1, Math.min(32, Math.trunc(options.levels ?? 5)));
  return Array.from({ length: count }, (_, index) => {
    const probability = (index + 1) / (count + 1);
    return options.method === 'quantile'
      ? quantile(values, probability)
      : minimum + probability * (maximum - minimum);
  }).filter((value, index, thresholds) => index === 0 || value !== thresholds[index - 1]);
}

function interpolate(
  start: ContourGridPoint,
  end: ContourGridPoint,
  startValue: number,
  endValue: number,
  level: number,
): ContourGridPoint {
  const denominator = endValue - startValue;
  const ratio =
    denominator === 0 ? 0.5 : Math.max(0, Math.min(1, (level - startValue) / denominator));
  return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
}

function pointKey(point: ContourGridPoint): string {
  return `${Math.round(point.x * 1e9)}:${Math.round(point.y * 1e9)}`;
}

function saddleHighConnected(
  values: readonly [number, number, number, number],
  level: number,
  policy: ContourSaddlePolicy,
  code: number,
): boolean {
  if (policy === 'high') return true;
  if (policy === 'low') return false;
  // Nielson-Hamann asymptotic decider for the bilinear cell. The sign of
  // Q=a*c-b*d selects which diagonally-opposed sign regions connect. Equality
  // consistently connects the high corners.
  const [a, b, c, d] = values.map((value) => value - level) as [number, number, number, number];
  const q = a * c - b * d;
  return code === 5 ? q >= 0 : q <= 0;
}

function cellSegments(
  values: readonly [number, number, number, number],
  points: readonly [ContourGridPoint, ContourGridPoint, ContourGridPoint, ContourGridPoint],
  level: number,
  levelIndex: number,
  sourceRows: readonly number[],
  saddle: ContourSaddlePolicy,
): readonly Segment[] {
  const high = values.map((value) => value >= level);
  const code = (high[0] ? 1 : 0) | (high[1] ? 2 : 0) | (high[2] ? 4 : 0) | (high[3] ? 8 : 0);
  if (code === 0 || code === 15) return [];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ] as const;
  const crossing = new Map<number, ContourGridPoint>();
  edges.forEach(([start, end], edge) => {
    if (high[start] === high[end]) return;
    crossing.set(edge, interpolate(points[start], points[end], values[start], values[end], level));
  });
  const pair = (a: number, b: number): Segment | null => {
    const start = crossing.get(a);
    const end = crossing.get(b);
    return start === undefined || end === undefined
      ? null
      : { level, levelIndex, points: [start, end], sourceRows };
  };
  if (crossing.size === 2) {
    const indices = [...crossing.keys()];
    const segment = pair(indices[0]!, indices[1]!);
    return segment === null ? [] : [segment];
  }
  const centerHigh = saddleHighConnected(values, level, saddle, code);
  // Corner order is top-left, top-right, bottom-right, bottom-left. Pairing is
  // chosen around low corners when the centre is high, and around high corners
  // when it is low, preserving topology through ambiguous saddles.
  const pairs =
    code === 5
      ? centerHigh
        ? ([
            [0, 1],
            [2, 3],
          ] as const)
        : ([
            [0, 3],
            [1, 2],
          ] as const)
      : centerHigh
        ? ([
            [0, 3],
            [1, 2],
          ] as const)
        : ([
            [0, 1],
            [2, 3],
          ] as const);
  return pairs.flatMap(([a, b]) => {
    const segment = pair(a, b);
    return segment === null ? [] : [segment];
  });
}

function stitchSegments(segments: readonly Segment[]): readonly ContourIsoline[] {
  const byLevel = new Map<number, Segment[]>();
  for (const segment of segments) {
    const group = byLevel.get(segment.levelIndex) ?? [];
    group.push(segment);
    byLevel.set(segment.levelIndex, group);
  }
  const output: ContourIsoline[] = [];
  for (const [, levelSegments] of [...byLevel].sort(([a], [b]) => a - b)) {
    const adjacency = new Map<string, Array<{ index: number; endpoint: 0 | 1 }>>();
    levelSegments.forEach((segment, index) => {
      segment.points.forEach((point, endpoint) => {
        const key = pointKey(point);
        const entries = adjacency.get(key) ?? [];
        entries.push({ index, endpoint: endpoint as 0 | 1 });
        adjacency.set(key, entries);
      });
    });
    const visited = new Set<number>();
    for (let seed = 0; seed < levelSegments.length; seed += 1) {
      if (visited.has(seed)) continue;
      const segment = levelSegments[seed]!;
      const firstDegree = adjacency.get(pointKey(segment.points[0]))?.length ?? 0;
      const secondDegree = adjacency.get(pointKey(segment.points[1]))?.length ?? 0;
      let current = firstDegree === 1 || secondDegree !== 1 ? segment.points[0] : segment.points[1];
      const startKey = pointKey(current);
      const points: ContourGridPoint[] = [current];
      const rows = new Set<number>();
      while (true) {
        const candidate = (adjacency.get(pointKey(current)) ?? []).find(
          ({ index }) => !visited.has(index),
        );
        if (candidate === undefined) break;
        visited.add(candidate.index);
        const nextSegment = levelSegments[candidate.index]!;
        nextSegment.sourceRows.forEach((row) => rows.add(row));
        current = nextSegment.points[candidate.endpoint === 0 ? 1 : 0];
        points.push(current);
        if (pointKey(current) === startKey) break;
      }
      if (points.length >= 2) {
        output.push({
          level: segment.level,
          levelIndex: segment.levelIndex,
          points,
          closed: points.length > 2 && pointKey(points[0]!) === pointKey(points.at(-1)!),
          sourceRows: [...rows].sort((a, b) => a - b),
        });
      }
    }
  }
  return output;
}

/** Extracts deterministic marching-squares isoline topology from a scalar grid. */
export function extractIsolines(
  values: readonly (readonly (number | null)[])[],
  points: readonly (readonly (ContourGridPoint | null)[])[],
  levels: readonly number[],
  sourceRows?: readonly (readonly (number | readonly number[] | null)[])[],
  options: ContourExtractionOptions = {},
): readonly ContourIsoline[] {
  const maximumSegments = Math.max(
    0,
    Math.trunc(options.maximumSegments ?? Number.MAX_SAFE_INTEGER),
  );
  if (maximumSegments === 0) return [];
  const segments: Segment[] = [];
  outer: for (let row = 0; row < values.length - 1; row += 1) {
    const width = Math.min(values[row]?.length ?? 0, values[row + 1]?.length ?? 0);
    for (let column = 0; column < width - 1; column += 1) {
      const cellValues = [
        values[row]?.[column],
        values[row]?.[column + 1],
        values[row + 1]?.[column + 1],
        values[row + 1]?.[column],
      ];
      const cellPoints = [
        points[row]?.[column],
        points[row]?.[column + 1],
        points[row + 1]?.[column + 1],
        points[row + 1]?.[column],
      ];
      if (
        cellValues.some(
          (value) => value === null || value === undefined || !Number.isFinite(value),
        ) ||
        cellPoints.some((point) => point === null || point === undefined)
      )
        continue;
      const rows = [
        sourceRows?.[row]?.[column],
        sourceRows?.[row]?.[column + 1],
        sourceRows?.[row + 1]?.[column + 1],
        sourceRows?.[row + 1]?.[column],
      ].flatMap((value) =>
        value === null || value === undefined ? [] : typeof value === 'number' ? [value] : value,
      );
      for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
        const level = levels[levelIndex];
        if (level === undefined) continue;
        for (const segment of cellSegments(
          cellValues as [number, number, number, number],
          cellPoints as [ContourGridPoint, ContourGridPoint, ContourGridPoint, ContourGridPoint],
          level,
          levelIndex,
          rows,
          options.saddle ?? 'asymptotic',
        )) {
          segments.push(segment);
          if (segments.length >= maximumSegments) break outer;
        }
      }
    }
  }
  return stitchSegments(segments);
}
