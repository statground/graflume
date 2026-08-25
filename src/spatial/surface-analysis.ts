import { cross3, length3, normalize3, subtract3 } from './math.js';
import type { SpatialVec3 } from './types.js';

export interface SurfaceNormalGeometry {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices?: Uint32Array;
  /** Original vertex index for every emitted vertex. */
  readonly sourceVertexIndices: Uint32Array;
}

export interface SurfaceContourSegment {
  readonly level: number;
  readonly from: SpatialVec3;
  readonly to: SpatialVec3;
  readonly triangleIndex: number;
}

export interface SurfaceContourExtractionOptions {
  readonly levels: readonly number[];
  readonly maxSegments: number;
}

function positionAt(positions: Float32Array, index: number): SpatialVec3 {
  const offset = index * 3;
  return [positions[offset]!, positions[offset + 1]!, positions[offset + 2]!];
}

function smoothNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let offset = 0; offset + 2 < indices.length; offset += 3) {
    const a = indices[offset]!;
    const b = indices[offset + 1]!;
    const c = indices[offset + 2]!;
    const normal = normalize3(
      cross3(
        subtract3(positionAt(positions, b), positionAt(positions, a)),
        subtract3(positionAt(positions, c), positionAt(positions, a)),
      ),
      [0, 1, 0],
    );
    for (const vertex of [a, b, c]) {
      normals[vertex * 3] = normals[vertex * 3]! + normal[0];
      normals[vertex * 3 + 1] = normals[vertex * 3 + 1]! + normal[1];
      normals[vertex * 3 + 2] = normals[vertex * 3 + 2]! + normal[2];
    }
  }
  for (let index = 0; index < normals.length; index += 3) {
    normals.set(normalize3([normals[index]!, normals[index + 1]!, normals[index + 2]!]), index);
  }
  return normals;
}

/**
 * Deterministic CPU reference for GPU surface normal input. Flat mode emits a
 * triangle soup so every face owns its exact normal; smooth mode keeps shared
 * topology and averages adjacent unit-face normals.
 */
export function computeSurfaceNormalGeometry(
  positions: Float32Array,
  indices: Uint32Array,
  mode: 'flat' | 'smooth' = 'smooth',
): SurfaceNormalGeometry {
  if (positions.length % 3 !== 0 || indices.length % 3 !== 0)
    throw new RangeError('Surface positions and triangle indices must contain complete tuples.');
  const vertexCount = positions.length / 3;
  for (const index of indices)
    if (index >= vertexCount) throw new RangeError('Surface triangle index is outside positions.');
  if (mode === 'smooth') {
    return {
      positions,
      normals: smoothNormals(positions, indices),
      indices,
      sourceVertexIndices: Uint32Array.from({ length: vertexCount }, (_, index) => index),
    };
  }

  const expandedPositions = new Float32Array(indices.length * 3);
  const normals = new Float32Array(indices.length * 3);
  const sourceVertexIndices = new Uint32Array(indices.length);
  for (let offset = 0; offset + 2 < indices.length; offset += 3) {
    const a = indices[offset]!;
    const b = indices[offset + 1]!;
    const c = indices[offset + 2]!;
    const pa = positionAt(positions, a);
    const pb = positionAt(positions, b);
    const pc = positionAt(positions, c);
    const normal = normalize3(cross3(subtract3(pb, pa), subtract3(pc, pa)), [0, 1, 0]);
    for (const [local, source] of [a, b, c].entries()) {
      expandedPositions.set(positionAt(positions, source), (offset + local) * 3);
      normals.set(normal, (offset + local) * 3);
      sourceVertexIndices[offset + local] = source;
    }
  }
  return { positions: expandedPositions, normals, sourceVertexIndices };
}

function contourIntersection(
  first: SpatialVec3,
  second: SpatialVec3,
  firstValue: number,
  secondValue: number,
  level: number,
): SpatialVec3 | null {
  const firstSide = firstValue - level;
  const secondSide = secondValue - level;
  if ((firstSide < 0 && secondSide < 0) || (firstSide > 0 && secondSide > 0)) return null;
  if (firstSide === 0 && secondSide === 0) return null;
  const denominator = secondValue - firstValue;
  const amount = Math.abs(denominator) <= 1e-12 ? 0.5 : (level - firstValue) / denominator;
  return [
    first[0] + (second[0] - first[0]) * amount,
    first[1] + (second[1] - first[1]) * amount,
    first[2] + (second[2] - first[2]) * amount,
  ];
}

function samePoint(left: SpatialVec3, right: SpatialVec3): boolean {
  return length3(subtract3(left, right)) <= 1e-9;
}

function farthestPair(points: readonly SpatialVec3[]): readonly [SpatialVec3, SpatialVec3] | null {
  if (points.length < 2) return null;
  let pair: readonly [SpatialVec3, SpatialVec3] = [points[0]!, points[1]!];
  let distance = length3(subtract3(pair[0], pair[1]));
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const candidate = length3(subtract3(points[left]!, points[right]!));
      if (candidate > distance) {
        distance = candidate;
        pair = [points[left]!, points[right]!];
      }
    }
  }
  return distance <= 1e-12 ? null : pair;
}

/** Extracts bounded isoline segments from any indexed triangle surface. */
export function extractSurfaceContourSegments(
  positions: Float32Array,
  indices: Uint32Array,
  values: readonly number[],
  options: SurfaceContourExtractionOptions,
): readonly SurfaceContourSegment[] {
  const vertexCount = positions.length / 3;
  if (values.length !== vertexCount)
    throw new RangeError('Surface contour values must match the source vertex count.');
  const maximum = Math.max(0, Math.trunc(options.maxSegments));
  const output: SurfaceContourSegment[] = [];
  outer: for (const level of options.levels) {
    for (let offset = 0; offset + 2 < indices.length; offset += 3) {
      if (output.length >= maximum) break outer;
      const vertices = [indices[offset]!, indices[offset + 1]!, indices[offset + 2]!] as const;
      const points: SpatialVec3[] = [];
      for (const [first, second] of [
        [0, 1],
        [1, 2],
        [2, 0],
      ] as const) {
        const firstIndex = vertices[first];
        const secondIndex = vertices[second];
        const point = contourIntersection(
          positionAt(positions, firstIndex),
          positionAt(positions, secondIndex),
          values[firstIndex]!,
          values[secondIndex]!,
          level,
        );
        if (point !== null && !points.some((candidate) => samePoint(candidate, point)))
          points.push(point);
      }
      const pair = farthestPair(points);
      if (pair === null) continue;
      output.push({
        level,
        from: pair[0],
        to: pair[1],
        triangleIndex: offset / 3,
      });
    }
  }
  return output;
}
