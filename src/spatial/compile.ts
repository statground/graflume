import {
  naturalEarthCountries110m,
  type NaturalEarthRing,
} from '../geography/natural-earth-world-110m.generated.js';
import { exactStrideSampleIndices } from '../data/sample.js';
import {
  add3,
  boundsFromPositions,
  clamp,
  cross3,
  dot3,
  length3,
  normalize3,
  scale3,
  subtract3,
} from './math.js';
import { assertCompiledSpatialOutputBudget } from './budget.js';
import { assertValidSpatialSpec } from './validate.js';
import type {
  CompiledSpatialGeometry,
  CompiledSpatialScene,
  SpatialChartSpec,
  SpatialColor,
  SpatialConeVectorData,
  SpatialGlobeLayer,
  SpatialLayerSpec,
  SpatialMeshData,
  SpatialPickTarget,
  SpatialScatterLayer,
  SpatialStreamtubeData,
  SpatialSurfaceGridData,
  SpatialSurfaceLayer,
  SpatialVec3,
  SpatialVectorLayer,
  SpatialVolumeLayer,
} from './types.js';

type Rgba = readonly [number, number, number, number];

export type SpatialMarkCompiler = (
  layer: SpatialLayerSpec,
  layerIndex: number,
) => readonly CompiledSpatialGeometry[];

const namedColors: Readonly<Record<string, Rgba>> = {
  black: [0, 0, 0, 1],
  blue: [0.145, 0.388, 0.922, 1],
  cyan: [0.024, 0.714, 0.831, 1],
  gray: [0.42, 0.45, 0.5, 1],
  green: [0.063, 0.725, 0.506, 1],
  orange: [0.961, 0.62, 0.043, 1],
  red: [0.88, 0.188, 0.247, 1],
  transparent: [0, 0, 0, 0],
  white: [1, 1, 1, 1],
  yellow: [0.984, 0.749, 0.141, 1],
};

function fail(message: string): never {
  throw new Error(`Invalid spatial chart: ${message}`);
}

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} must be finite.`);
  return value;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) fail(`${label} must be a positive integer.`);
  return value;
}

function validVec3(value: SpatialVec3, label: string): SpatialVec3 {
  return [
    finite(value[0], `${label}[0]`),
    finite(value[1], `${label}[1]`),
    finite(value[2], `${label}[2]`),
  ];
}

function parseRgbChannel(value: string): number {
  return clamp(Number(value) / 255, 0, 1);
}

export function spatialColor(color: SpatialColor | undefined, opacity = 1): Rgba {
  const boundedOpacity = clamp(Number.isFinite(opacity) ? opacity : 1, 0, 1);
  if (color === undefined) return [0.31, 0.275, 0.898, boundedOpacity];
  if (typeof color !== 'string') {
    const values = color as readonly number[];
    const scale = values.some((value) => value > 1) ? 255 : 1;
    return [
      clamp((values[0] ?? 0) / scale, 0, 1),
      clamp((values[1] ?? 0) / scale, 0, 1),
      clamp((values[2] ?? 0) / scale, 0, 1),
      clamp((values[3] ?? 1) / (values[3] !== undefined && values[3] > 1 ? 255 : 1), 0, 1) *
        boundedOpacity,
    ];
  }
  const input = color.trim().toLowerCase();
  const named = namedColors[input];
  if (named !== undefined) return [named[0], named[1], named[2], named[3] * boundedOpacity];
  const short = /^#([0-9a-f]{3,4})$/i.exec(input)?.[1];
  if (short !== undefined) {
    const values = [...short].map((digit) => Number.parseInt(`${digit}${digit}`, 16) / 255);
    return [values[0]!, values[1]!, values[2]!, (values[3] ?? 1) * boundedOpacity];
  }
  const full = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(input);
  if (full !== null) {
    const channels = full[1]!;
    return [
      Number.parseInt(channels.slice(0, 2), 16) / 255,
      Number.parseInt(channels.slice(2, 4), 16) / 255,
      Number.parseInt(channels.slice(4, 6), 16) / 255,
      (full[2] === undefined ? 1 : Number.parseInt(full[2], 16) / 255) * boundedOpacity,
    ];
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(
    input,
  );
  if (rgb !== null) {
    return [
      parseRgbChannel(rgb[1]!),
      parseRgbChannel(rgb[2]!),
      parseRgbChannel(rgb[3]!),
      clamp(Number(rgb[4] ?? 1), 0, 1) * boundedOpacity,
    ];
  }
  return [0.31, 0.275, 0.898, boundedOpacity];
}

function interpolateColor(low: Rgba, high: Rgba, amount: number): Rgba {
  const t = clamp(amount, 0, 1);
  return [
    low[0] + (high[0] - low[0]) * t,
    low[1] + (high[1] - low[1]) * t,
    low[2] + (high[2] - low[2]) * t,
    low[3] + (high[3] - low[3]) * t,
  ];
}

function pushVec3(output: number[], value: SpatialVec3): void {
  output.push(value[0], value[1], value[2]);
}

function pushColor(output: number[], value: Rgba): void {
  output.push(value[0], value[1], value[2], value[3]);
}

function repeatedValues(count: number, value: readonly number[]): Float32Array {
  const output = new Float32Array(count * value.length);
  for (let index = 0; index < count; index += 1) output.set(value, index * value.length);
  return output;
}

function triangleNormals(positions: Float32Array, indices?: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  const triangleCount = indices === undefined ? positions.length / 9 : indices.length / 3;
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const a = indices?.[triangle * 3] ?? triangle * 3;
    const b = indices?.[triangle * 3 + 1] ?? triangle * 3 + 1;
    const c = indices?.[triangle * 3 + 2] ?? triangle * 3 + 2;
    const pa: SpatialVec3 = [positions[a * 3]!, positions[a * 3 + 1]!, positions[a * 3 + 2]!];
    const pb: SpatialVec3 = [positions[b * 3]!, positions[b * 3 + 1]!, positions[b * 3 + 2]!];
    const pc: SpatialVec3 = [positions[c * 3]!, positions[c * 3 + 1]!, positions[c * 3 + 2]!];
    const normal = normalize3(cross3(subtract3(pb, pa), subtract3(pc, pa)), [0, 1, 0]);
    for (const vertex of [a, b, c]) {
      normals[vertex * 3] = (normals[vertex * 3] ?? 0) + normal[0];
      normals[vertex * 3 + 1] = (normals[vertex * 3 + 1] ?? 0) + normal[1];
      normals[vertex * 3 + 2] = (normals[vertex * 3 + 2] ?? 0) + normal[2];
    }
  }
  for (let index = 0; index < normals.length; index += 3) {
    const normal = normalize3([normals[index]!, normals[index + 1]!, normals[index + 2]!]);
    normals.set(normal, index);
  }
  return normals;
}

function layerId(layer: SpatialLayerSpec, index: number): string {
  return layer.id?.trim() || `spatial-layer-${index}`;
}

function isMeshData(data: SpatialSurfaceLayer['data']): data is SpatialMeshData {
  return 'positions' in data;
}

function compileSurfaceGrid(
  layer: SpatialSurfaceLayer,
  layerIndex: number,
  data: SpatialSurfaceGridData,
): readonly CompiledSpatialGeometry[] {
  const rows = positiveInteger(data.rows, 'surface.data.rows');
  const columns = positiveInteger(data.columns, 'surface.data.columns');
  if (rows < 2 || columns < 2) fail('surface grid needs at least two rows and two columns.');
  if (data.z.length !== rows * columns) fail('surface.data.z length must equal rows * columns.');
  if (data.values !== undefined && data.values.length !== data.z.length)
    fail('surface.data.values length must equal surface.data.z length.');
  if (data.x !== undefined && data.x.length !== columns)
    fail('surface.data.x length must equal columns.');
  if (data.y !== undefined && data.y.length !== rows)
    fail('surface.data.y length must equal rows.');

  const positions = new Float32Array(rows * columns * 3);
  const values = data.values ?? data.z;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    minimum = Math.min(minimum, finite(value, 'surface value'));
    maximum = Math.max(maximum, value);
  }
  const colors = new Float32Array(rows * columns * 4);
  const sizes = new Float32Array(rows * columns).fill(1);
  const low = spatialColor('#0ea5e9', layer.mark.opacity);
  const high = spatialColor(layer.mark.color ?? '#7c3aed', layer.mark.opacity);
  const picks: SpatialPickTarget[] = [];
  const id = layerId(layer, layerIndex);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const x = finite(data.x?.[column] ?? column, `surface x ${column}`);
      const depth = finite(data.y?.[row] ?? row, `surface y ${row}`);
      const height = finite(data.z[index], `surface z ${index}`);
      positions.set([x, height, depth], index * 3);
      const amount = maximum === minimum ? 0.5 : (values[index]! - minimum) / (maximum - minimum);
      colors.set(interpolateColor(low, high, amount), index * 4);
      picks.push({
        layerId: id,
        layerIndex,
        datumIndex: index,
        nodeId: `${id}:point:${index}`,
        position: [x, height, depth],
        datum: { row, column, x, y: depth, z: height, value: values[index] },
      });
    }
  }
  const triangleIndices: number[] = [];
  const lineIndices: number[] = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      triangleIndices.push(a, c, b, b, c, d);
      lineIndices.push(a, b, a, c);
      if (row === rows - 2) lineIndices.push(c, d);
      if (column === columns - 2) lineIndices.push(b, d);
    }
  }
  const indices = new Uint32Array(layer.mark.wireframe ? lineIndices : triangleIndices);
  return [
    {
      id,
      primitive: layer.mark.wireframe ? 'lines' : 'triangles',
      positions,
      normals: triangleNormals(positions, new Uint32Array(triangleIndices)),
      colors,
      sizes,
      indices,
      picks,
    },
  ];
}

function compileSurfaceMesh(
  layer: SpatialSurfaceLayer,
  layerIndex: number,
  data: SpatialMeshData,
): readonly CompiledSpatialGeometry[] {
  if (data.positions.length === 0) fail('surface mesh needs at least one position.');
  const positionValues: number[] = [];
  for (const [index, point] of data.positions.entries())
    pushVec3(positionValues, validVec3(point, `mesh position ${index}`));
  const positions = new Float32Array(positionValues);
  const indexValues: number[] = [];
  for (const [index, triangle] of data.triangles.entries()) {
    for (const vertex of triangle) {
      if (!Number.isInteger(vertex) || vertex < 0 || vertex >= data.positions.length)
        fail(`mesh triangle ${index} contains an invalid vertex index.`);
      indexValues.push(vertex);
    }
  }
  const indices = new Uint32Array(indexValues);
  const wireframeIndices = new Uint32Array(
    data.triangles.flatMap(([a, b, c]) => [a, b, b, c, c, a]),
  );
  const opacity = layer.mark.opacity ?? 1;
  const colors = new Float32Array(data.positions.length * 4);
  for (let index = 0; index < data.positions.length; index += 1)
    colors.set(spatialColor(data.colors?.[index] ?? layer.mark.color, opacity), index * 4);
  const suppliedNormals = data.normals;
  let normals: Float32Array;
  if (suppliedNormals !== undefined) {
    if (suppliedNormals.length !== data.positions.length)
      fail('mesh normals length must equal positions length.');
    const normalValues: number[] = [];
    for (const [index, normal] of suppliedNormals.entries())
      pushVec3(normalValues, normalize3(validVec3(normal, `mesh normal ${index}`)));
    normals = new Float32Array(normalValues);
  } else {
    normals = triangleNormals(positions, indices);
  }
  const id = layerId(layer, layerIndex);
  const picks = data.positions.map((position, datumIndex): SpatialPickTarget => ({
    layerId: id,
    layerIndex,
    datumIndex,
    nodeId: `${id}:vertex:${datumIndex}`,
    position,
    datum: { x: position[0], y: position[1], z: position[2], label: data.labels?.[datumIndex] },
  }));
  return [
    {
      id,
      primitive: layer.mark.wireframe ? 'lines' : 'triangles',
      positions,
      normals,
      colors,
      sizes: new Float32Array(data.positions.length).fill(1),
      indices: layer.mark.wireframe ? wireframeIndices : indices,
      picks,
    },
  ];
}

function compileSurface(
  layer: SpatialSurfaceLayer,
  layerIndex: number,
): readonly CompiledSpatialGeometry[] {
  const mode = layer.mark.mode ?? (isMeshData(layer.data) ? 'mesh' : 'surface');
  if (mode === 'mesh') {
    if (!isMeshData(layer.data)) fail('surface mesh mode requires positions and triangles.');
    return compileSurfaceMesh(layer, layerIndex, layer.data);
  }
  if (isMeshData(layer.data)) fail('surface mode requires rows, columns, and z values.');
  return compileSurfaceGrid(layer, layerIndex, layer.data);
}

function volumeDimensions(layer: SpatialVolumeLayer): readonly [number, number, number] {
  const dimensions = layer.data.dimensions;
  const x = positiveInteger(dimensions[0], 'volume dimensions[0]');
  const y = positiveInteger(dimensions[1], 'volume dimensions[1]');
  const z = positiveInteger(dimensions[2], 'volume dimensions[2]');
  if (layer.data.values.length !== x * y * z)
    fail('volume values length must equal the product of dimensions.');
  return [x, y, z];
}

function volumePosition(
  x: number,
  y: number,
  z: number,
  origin: SpatialVec3,
  spacing: SpatialVec3,
): SpatialVec3 {
  return [origin[0] + x * spacing[0], origin[1] + y * spacing[1], origin[2] + z * spacing[2]];
}

function volumeIndex(x: number, y: number, z: number, dimensions: readonly number[]): number {
  return z * dimensions[0]! * dimensions[1]! + y * dimensions[0]! + x;
}

function compileVolumePoints(
  layer: SpatialVolumeLayer,
  layerIndex: number,
): readonly CompiledSpatialGeometry[] {
  const dimensions = volumeDimensions(layer);
  const origin = validVec3(layer.data.origin ?? [0, 0, 0], 'volume origin');
  const spacing = validVec3(layer.data.spacing ?? [1, 1, 1], 'volume spacing');
  const values = layer.data.values;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    minimum = Math.min(minimum, finite(value, 'volume value'));
    maximum = Math.max(maximum, value);
  }
  const maximumSamples = Math.max(1, Math.trunc(layer.mark.maxSamples ?? 80_000));
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const picks: SpatialPickTarget[] = [];
  const low = spatialColor(layer.mark.colorLow ?? '#0ea5e9', layer.mark.opacity ?? 0.18);
  const high = spatialColor(layer.mark.colorHigh ?? '#f43f5e', layer.mark.opacity ?? 0.72);
  const id = layerId(layer, layerIndex);
  const plane = dimensions[0] * dimensions[1];
  for (const datumIndex of exactStrideSampleIndices(values.length, maximumSamples)) {
    const z = Math.floor(datumIndex / plane);
    const withinPlane = datumIndex - z * plane;
    const y = Math.floor(withinPlane / dimensions[0]);
    const x = withinPlane - y * dimensions[0];
    const value = values[datumIndex]!;
    const amount = maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum);
    const position = volumePosition(x, y, z, origin, spacing);
    pushVec3(positions, position);
    pushColor(colors, interpolateColor(low, high, amount));
    sizes.push(Math.max(1, (layer.mark.pointSize ?? 5) * (0.45 + amount * 0.75)));
    picks.push({
      layerId: id,
      layerIndex,
      datumIndex,
      nodeId: `${id}:voxel:${datumIndex}`,
      position,
      datum: { x, y, z, value },
    });
  }
  const positionArray = new Float32Array(positions);
  return [
    {
      id,
      primitive: 'points',
      positions: positionArray,
      normals: repeatedValues(positionArray.length / 3, [0, 1, 0]),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes),
      picks,
    },
  ];
}

const cubeCorners: readonly SpatialVec3[] = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];

const cubeTetrahedra = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
] as const;

const tetraEdges = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
] as const;

function isoIntersection(
  first: SpatialVec3,
  second: SpatialVec3,
  firstValue: number,
  secondValue: number,
  isoValue: number,
): SpatialVec3 {
  const denominator = secondValue - firstValue;
  const amount =
    Math.abs(denominator) < 1e-12 ? 0.5 : clamp((isoValue - firstValue) / denominator, 0, 1);
  return add3(first, scale3(subtract3(second, first), amount));
}

function averagePoints(points: readonly SpatialVec3[]): SpatialVec3 {
  if (points.length === 0) return [0, 0, 0];
  return scale3(
    points.reduce<SpatialVec3>((total, point) => add3(total, point), [0, 0, 0]),
    1 / points.length,
  );
}

function samePoint(first: SpatialVec3, second: SpatialVec3): boolean {
  return length3(subtract3(first, second)) <= 1e-9;
}

function orderedIsoPolygon(
  intersections: readonly SpatialVec3[],
  lowToHigh: SpatialVec3,
): readonly SpatialVec3[] {
  const unique: SpatialVec3[] = [];
  for (const point of intersections)
    if (!unique.some((candidate) => samePoint(candidate, point))) unique.push(point);
  if (unique.length < 3) return unique;
  const center = averagePoints(unique);
  let planeNormal = cross3(subtract3(unique[1]!, unique[0]!), subtract3(unique[2]!, unique[0]!));
  if (dot3(planeNormal, lowToHigh) < 0) planeNormal = scale3(planeNormal, -1);
  planeNormal = normalize3(planeNormal, normalize3(lowToHigh, [0, 1, 0]));
  const firstAxis = normalize3(subtract3(unique[0]!, center), [1, 0, 0]);
  const secondAxis = normalize3(cross3(planeNormal, firstAxis), [0, 0, 1]);
  const sorted = [...unique].sort((left, right) => {
    const leftOffset = subtract3(left, center);
    const rightOffset = subtract3(right, center);
    const leftAngle = Math.atan2(dot3(leftOffset, secondAxis), dot3(leftOffset, firstAxis));
    const rightAngle = Math.atan2(dot3(rightOffset, secondAxis), dot3(rightOffset, firstAxis));
    return leftAngle - rightAngle;
  });
  const winding = cross3(subtract3(sorted[1]!, sorted[0]!), subtract3(sorted[2]!, sorted[0]!));
  if (dot3(winding, lowToHigh) < 0) sorted.reverse();
  return sorted;
}

function compileIsosurface(
  layer: SpatialVolumeLayer,
  layerIndex: number,
): readonly CompiledSpatialGeometry[] {
  const dimensions = volumeDimensions(layer);
  if (dimensions.some((dimension) => dimension < 2))
    fail('isosurface mode needs dimensions of at least 2.');
  const origin = validVec3(layer.data.origin ?? [0, 0, 0], 'volume origin');
  const spacing = validVec3(layer.data.spacing ?? [1, 1, 1], 'volume spacing');
  const values = layer.data.values;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    minimum = Math.min(minimum, finite(value, 'volume value'));
    maximum = Math.max(maximum, value);
  }
  const isoValue = finite(layer.mark.isoValue ?? (minimum + maximum) / 2, 'volume isoValue');
  const vertices: number[] = [];
  const picks: SpatialPickTarget[] = [];
  const id = layerId(layer, layerIndex);
  let triangleIndex = 0;
  for (let z = 0; z < dimensions[2] - 1; z += 1) {
    for (let y = 0; y < dimensions[1] - 1; y += 1) {
      for (let x = 0; x < dimensions[0] - 1; x += 1) {
        const cornerPositions = cubeCorners.map((corner) =>
          volumePosition(x + corner[0], y + corner[1], z + corner[2], origin, spacing),
        );
        const cornerValues = cubeCorners.map(
          (corner) => values[volumeIndex(x + corner[0], y + corner[1], z + corner[2], dimensions)]!,
        );
        for (const tetrahedron of cubeTetrahedra) {
          const intersections: SpatialVec3[] = [];
          const low: SpatialVec3[] = [];
          const high: SpatialVec3[] = [];
          for (const corner of tetrahedron) {
            (cornerValues[corner]! < isoValue ? low : high).push(cornerPositions[corner]!);
          }
          for (const edge of tetraEdges) {
            const first = tetrahedron[edge[0]]!;
            const second = tetrahedron[edge[1]]!;
            const firstValue = cornerValues[first]!;
            const secondValue = cornerValues[second]!;
            if (firstValue < isoValue === secondValue < isoValue) continue;
            intersections.push(
              isoIntersection(
                cornerPositions[first]!,
                cornerPositions[second]!,
                firstValue,
                secondValue,
                isoValue,
              ),
            );
          }
          const polygon = orderedIsoPolygon(
            intersections,
            subtract3(averagePoints(high), averagePoints(low)),
          );
          if (polygon.length < 3) continue;
          const triangles: [SpatialVec3, SpatialVec3, SpatialVec3][] = [];
          for (let index = 1; index < polygon.length - 1; index += 1)
            triangles.push([polygon[0]!, polygon[index]!, polygon[index + 1]!]);
          for (const triangle of triangles) {
            for (const point of triangle) pushVec3(vertices, point);
            const center = scale3(add3(add3(triangle[0]!, triangle[1]!), triangle[2]!), 1 / 3);
            picks.push({
              layerId: id,
              layerIndex,
              datumIndex: triangleIndex,
              nodeId: `${id}:iso:${triangleIndex}`,
              position: center,
              datum: { x, y, z, isoValue },
            });
            triangleIndex += 1;
          }
        }
      }
    }
  }
  const positions = new Float32Array(vertices);
  const color = spatialColor(layer.mark.colorHigh ?? '#7c3aed', layer.mark.opacity ?? 0.82);
  return [
    {
      id,
      primitive: 'triangles',
      positions,
      normals: triangleNormals(positions),
      colors: repeatedValues(positions.length / 3, color),
      sizes: new Float32Array(positions.length / 3).fill(1),
      picks,
    },
  ];
}

function compileVolume(
  layer: SpatialVolumeLayer,
  layerIndex: number,
): readonly CompiledSpatialGeometry[] {
  return (layer.mark.mode ?? 'volume') === 'isosurface'
    ? compileIsosurface(layer, layerIndex)
    : compileVolumePoints(layer, layerIndex);
}

function isStreamtubeData(data: SpatialVectorLayer['data']): data is SpatialStreamtubeData {
  return 'paths' in data;
}

function vectorBasis(direction: SpatialVec3): readonly [SpatialVec3, SpatialVec3] {
  const normalized = normalize3(direction);
  const reference: SpatialVec3 = Math.abs(normalized[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const first = normalize3(cross3(normalized, reference), [1, 0, 0]);
  return [first, normalize3(cross3(normalized, first), [0, 0, 1])];
}

function compileCones(
  layer: SpatialVectorLayer,
  layerIndex: number,
  data: SpatialConeVectorData,
): readonly CompiledSpatialGeometry[] {
  if (data.origins.length !== data.vectors.length)
    fail('vector origins and vectors must have the same length.');
  const segments = Math.max(5, Math.min(48, Math.trunc(layer.mark.segments ?? 12)));
  const scale = Math.max(0.0001, layer.mark.scale ?? 1);
  const radiusFactor = Math.max(0.0001, layer.mark.radius ?? 0.12);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const picks: SpatialPickTarget[] = [];
  const id = layerId(layer, layerIndex);
  for (let datumIndex = 0; datumIndex < data.origins.length; datumIndex += 1) {
    const origin = validVec3(data.origins[datumIndex]!, `vector origin ${datumIndex}`);
    const vector = validVec3(data.vectors[datumIndex]!, `vector value ${datumIndex}`);
    const magnitude = length3(vector);
    if (magnitude <= 1e-12) continue;
    const direction = normalize3(vector);
    const tip = add3(origin, scale3(vector, scale));
    const [first, second] = vectorBasis(direction);
    const radius = Math.max(0.004, magnitude * scale * radiusFactor);
    const baseCenter = add3(origin, scale3(subtract3(tip, origin), 0.72));
    const color = spatialColor(
      data.colors?.[datumIndex] ?? layer.mark.color ?? '#0f9f8a',
      layer.mark.opacity,
    );
    const offset = positions.length / 3;
    pushVec3(positions, origin);
    pushColor(colors, color);
    pushVec3(positions, tip);
    pushColor(colors, color);
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const radial = add3(
        scale3(first, Math.cos(angle) * radius),
        scale3(second, Math.sin(angle) * radius),
      );
      pushVec3(positions, add3(baseCenter, radial));
      pushColor(colors, color);
    }
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      indices.push(offset, offset + 2 + next, offset + 2 + segment);
      indices.push(offset + 1, offset + 2 + segment, offset + 2 + next);
    }
    picks.push({
      layerId: id,
      layerIndex,
      datumIndex,
      nodeId: `${id}:vector:${datumIndex}`,
      position: tip,
      datum: {
        x: origin[0],
        y: origin[1],
        z: origin[2],
        dx: vector[0],
        dy: vector[1],
        dz: vector[2],
        magnitude,
        label: data.labels?.[datumIndex],
      },
    });
  }
  const positionArray = new Float32Array(positions);
  const indexArray = new Uint32Array(indices);
  return [
    {
      id,
      primitive: 'triangles',
      positions: positionArray,
      normals: triangleNormals(positionArray, indexArray),
      colors: new Float32Array(colors),
      sizes: new Float32Array(positionArray.length / 3).fill(1),
      indices: indexArray,
      picks,
    },
  ];
}

function tubePointBasis(
  path: readonly SpatialVec3[],
  index: number,
): readonly [SpatialVec3, SpatialVec3] {
  const previous = path[Math.max(0, index - 1)]!;
  const next = path[Math.min(path.length - 1, index + 1)]!;
  return vectorBasis(subtract3(next, previous));
}

function compileStreamtubes(
  layer: SpatialVectorLayer,
  layerIndex: number,
  data: SpatialStreamtubeData,
): readonly CompiledSpatialGeometry[] {
  const segments = Math.max(5, Math.min(48, Math.trunc(layer.mark.segments ?? 10)));
  const radius = Math.max(0.0001, layer.mark.radius ?? 0.035);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const picks: SpatialPickTarget[] = [];
  const id = layerId(layer, layerIndex);
  for (let datumIndex = 0; datumIndex < data.paths.length; datumIndex += 1) {
    const path = data.paths[datumIndex]!.map((point, index) =>
      validVec3(point, `stream path ${datumIndex}:${index}`),
    );
    if (path.length < 2) continue;
    const offset = positions.length / 3;
    const color = spatialColor(
      data.colors?.[datumIndex] ?? layer.mark.color ?? '#0284c7',
      layer.mark.opacity,
    );
    for (let pointIndex = 0; pointIndex < path.length; pointIndex += 1) {
      const [first, second] = tubePointBasis(path, pointIndex);
      for (let segment = 0; segment < segments; segment += 1) {
        const angle = (segment / segments) * Math.PI * 2;
        const radial = add3(
          scale3(first, Math.cos(angle) * radius),
          scale3(second, Math.sin(angle) * radius),
        );
        pushVec3(positions, add3(path[pointIndex]!, radial));
        pushColor(colors, color);
      }
    }
    for (let pointIndex = 0; pointIndex < path.length - 1; pointIndex += 1) {
      for (let segment = 0; segment < segments; segment += 1) {
        const next = (segment + 1) % segments;
        const a = offset + pointIndex * segments + segment;
        const b = offset + pointIndex * segments + next;
        const c = offset + (pointIndex + 1) * segments + segment;
        const d = offset + (pointIndex + 1) * segments + next;
        indices.push(a, c, b, b, c, d);
      }
    }
    for (let pointIndex = 0; pointIndex < path.length; pointIndex += 1) {
      picks.push({
        layerId: id,
        layerIndex,
        datumIndex,
        nodeId: `${id}:stream:${datumIndex}:${pointIndex}`,
        position: path[pointIndex]!,
        datum: {
          path: datumIndex,
          point: pointIndex,
          x: path[pointIndex]![0],
          y: path[pointIndex]![1],
          z: path[pointIndex]![2],
          label: data.labels?.[datumIndex],
        },
      });
    }
  }
  const positionArray = new Float32Array(positions);
  const indexArray = new Uint32Array(indices);
  return [
    {
      id,
      primitive: 'triangles',
      positions: positionArray,
      normals: triangleNormals(positionArray, indexArray),
      colors: new Float32Array(colors),
      sizes: new Float32Array(positionArray.length / 3).fill(1),
      indices: indexArray,
      picks,
    },
  ];
}

function compileVector(
  layer: SpatialVectorLayer,
  layerIndex: number,
): readonly CompiledSpatialGeometry[] {
  const mode = layer.mark.mode ?? (isStreamtubeData(layer.data) ? 'streamtube' : 'cone');
  if (mode === 'streamtube') {
    if (!isStreamtubeData(layer.data)) fail('streamtube mode requires paths.');
    return compileStreamtubes(layer, layerIndex, layer.data);
  }
  if (isStreamtubeData(layer.data)) fail('cone mode requires origins and vectors.');
  return compileCones(layer, layerIndex, layer.data);
}

function compileScatter(
  layer: SpatialScatterLayer,
  layerIndex: number,
): readonly CompiledSpatialGeometry[] {
  const data = layer.data;
  const count = data.positions.length;
  for (const [name, values] of [
    ['values', data.values],
    ['sizes', data.sizes],
    ['colors', data.colors],
    ['labels', data.labels],
  ] as const) {
    if (values !== undefined && values.length !== count)
      fail(`scatter ${name} length must equal positions length.`);
  }
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const picks: SpatialPickTarget[] = [];
  const id = layerId(layer, layerIndex);
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of data.values ?? []) {
    minimum = Math.min(minimum, finite(value, 'scatter value'));
    maximum = Math.max(maximum, value);
  }
  const low = spatialColor('#06b6d4', layer.mark.opacity);
  const high = spatialColor(layer.mark.color ?? '#7c3aed', layer.mark.opacity);
  for (let datumIndex = 0; datumIndex < count; datumIndex += 1) {
    const position = validVec3(data.positions[datumIndex]!, `scatter position ${datumIndex}`);
    const value = data.values?.[datumIndex];
    const amount =
      value === undefined || maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum);
    pushVec3(positions, position);
    pushColor(
      colors,
      data.colors?.[datumIndex] === undefined
        ? interpolateColor(low, high, amount)
        : spatialColor(data.colors[datumIndex], layer.mark.opacity),
    );
    sizes.push(Math.max(1, data.sizes?.[datumIndex] ?? layer.mark.pointSize ?? 7));
    picks.push({
      layerId: id,
      layerIndex,
      datumIndex,
      nodeId: `${id}:point:${datumIndex}`,
      position,
      datum: {
        x: position[0],
        y: position[1],
        z: position[2],
        value,
        label: data.labels?.[datumIndex],
      },
    });
  }
  const positionArray = new Float32Array(positions);
  return [
    {
      id,
      primitive: 'points',
      positions: positionArray,
      normals: repeatedValues(count, [0, 1, 0]),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes),
      picks,
    },
  ];
}

function longitudeLatitudeToSphere(
  longitude: number,
  latitude: number,
  radius: number,
): SpatialVec3 {
  const lon = (longitude * Math.PI) / 180;
  const lat = (latitude * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return [
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon),
  ];
}

function sphereGeometry(id: string, radius: number, color: Rgba): CompiledSpatialGeometry {
  const latitudeSegments = 32;
  const longitudeSegments = 64;
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let latitude = 0; latitude <= latitudeSegments; latitude += 1) {
    const angleLatitude = -Math.PI / 2 + (latitude / latitudeSegments) * Math.PI;
    for (let longitude = 0; longitude <= longitudeSegments; longitude += 1) {
      const angleLongitude = (longitude / longitudeSegments) * Math.PI * 2;
      const normal: SpatialVec3 = [
        Math.cos(angleLatitude) * Math.cos(angleLongitude),
        Math.sin(angleLatitude),
        -Math.cos(angleLatitude) * Math.sin(angleLongitude),
      ];
      pushVec3(positions, scale3(normal, radius));
      pushVec3(normals, normal);
      pushColor(colors, color);
    }
  }
  const stride = longitudeSegments + 1;
  for (let latitude = 0; latitude < latitudeSegments; latitude += 1) {
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const a = latitude * stride + longitude;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return {
    id,
    primitive: 'triangles',
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    sizes: new Float32Array(positions.length / 3).fill(1),
    indices: new Uint32Array(indices),
    picks: [],
  };
}

function greatCirclePoints(
  from: readonly [number, number],
  to: readonly [number, number],
  radius: number,
  segments: number,
): readonly SpatialVec3[] {
  const start = normalize3(longitudeLatitudeToSphere(from[0], from[1], 1));
  const end = normalize3(longitudeLatitudeToSphere(to[0], to[1], 1));
  const cosine = clamp(dot3(start, end), -1, 1);
  const angle = Math.acos(cosine);
  const tangentCandidate = subtract3(end, scale3(start, cosine));
  const tangentLength = length3(tangentCandidate);
  const leastAlignedAxis: SpatialVec3 =
    Math.abs(start[0]) <= Math.abs(start[1]) && Math.abs(start[0]) <= Math.abs(start[2])
      ? [1, 0, 0]
      : Math.abs(start[1]) <= Math.abs(start[2])
        ? [0, 1, 0]
        : [0, 0, 1];
  const tangent =
    tangentLength > 1e-7
      ? scale3(tangentCandidate, 1 / tangentLength)
      : normalize3(subtract3(leastAlignedAxis, scale3(start, dot3(leastAlignedAxis, start))));
  const output: SpatialVec3[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const amount = index / segments;
    const direction =
      index === 0
        ? start
        : index === segments
          ? end
          : add3(
              scale3(start, Math.cos(amount * angle)),
              scale3(tangent, Math.sin(amount * angle)),
            );
    const arc = 1 + Math.sin(amount * Math.PI) * 0.08;
    output.push(scale3(normalize3(direction), radius * arc));
  }
  return output;
}

interface PlanarRingPoint {
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
}

function planarCross(
  first: PlanarRingPoint,
  middle: PlanarRingPoint,
  last: PlanarRingPoint,
): number {
  return (middle.x - first.x) * (last.y - first.y) - (middle.y - first.y) * (last.x - first.x);
}

function planarRing(ring: NaturalEarthRing): readonly PlanarRingPoint[] {
  const output: PlanarRingPoint[] = [];
  let previousLongitude: number | undefined;
  for (let sourceIndex = 0; sourceIndex < ring.length; sourceIndex += 1) {
    const [rawLongitude, latitude] = ring[sourceIndex]!;
    let longitude = rawLongitude;
    if (previousLongitude !== undefined) {
      while (longitude - previousLongitude > 180) longitude -= 360;
      while (longitude - previousLongitude < -180) longitude += 360;
    }
    const previous = output.at(-1);
    if (
      previous !== undefined &&
      Math.abs(previous.x - longitude) < 1e-10 &&
      Math.abs(previous.y - latitude) < 1e-10
    )
      continue;
    output.push({ sourceIndex, x: longitude, y: latitude });
    previousLongitude = longitude;
  }
  const first = output[0];
  const last = output.at(-1);
  if (
    first !== undefined &&
    last !== undefined &&
    output.length > 1 &&
    Math.abs(Math.abs(first.x - last.x) % 360) < 1e-10 &&
    Math.abs(first.y - last.y) < 1e-10
  )
    output.pop();
  return output;
}

function planarArea(points: readonly PlanarRingPoint[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]!;
    const next = points[(index + 1) % points.length]!;
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function pointInsideTriangle(
  point: PlanarRingPoint,
  first: PlanarRingPoint,
  middle: PlanarRingPoint,
  last: PlanarRingPoint,
  orientation: number,
): boolean {
  const epsilon = 1e-10;
  return (
    planarCross(first, middle, point) * orientation >= -epsilon &&
    planarCross(middle, last, point) * orientation >= -epsilon &&
    planarCross(last, first, point) * orientation >= -epsilon
  );
}

function triangulateRing(ring: NaturalEarthRing): readonly (readonly [number, number, number])[] {
  const remaining = [...planarRing(ring)];
  if (remaining.length < 3) return [];
  const orientation = planarArea(remaining) >= 0 ? 1 : -1;
  const triangles: [number, number, number][] = [];
  let guard = remaining.length * remaining.length;
  while (remaining.length > 3 && guard > 0) {
    guard -= 1;
    let clipped = false;
    for (let index = 0; index < remaining.length; index += 1) {
      const previous = remaining[(index - 1 + remaining.length) % remaining.length]!;
      const current = remaining[index]!;
      const next = remaining[(index + 1) % remaining.length]!;
      if (planarCross(previous, current, next) * orientation <= 1e-10) continue;
      const minX = Math.min(previous.x, current.x, next.x);
      const maxX = Math.max(previous.x, current.x, next.x);
      const minY = Math.min(previous.y, current.y, next.y);
      const maxY = Math.max(previous.y, current.y, next.y);
      const containsVertex = remaining.some((candidate) => {
        if (candidate === previous || candidate === current || candidate === next) return false;
        if (candidate.x < minX || candidate.x > maxX || candidate.y < minY || candidate.y > maxY)
          return false;
        return pointInsideTriangle(candidate, previous, current, next, orientation);
      });
      if (containsVertex) continue;
      triangles.push([previous.sourceIndex, current.sourceIndex, next.sourceIndex]);
      remaining.splice(index, 1);
      clipped = true;
      break;
    }
    if (clipped) continue;
    let smallestIndex = -1;
    let smallestCross = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const value = Math.abs(
        planarCross(
          remaining[(index - 1 + remaining.length) % remaining.length]!,
          remaining[index]!,
          remaining[(index + 1) % remaining.length]!,
        ),
      );
      if (value < smallestCross) {
        smallestCross = value;
        smallestIndex = index;
      }
    }
    if (smallestIndex < 0 || smallestCross > 1e-7) break;
    remaining.splice(smallestIndex, 1);
  }
  if (remaining.length === 3)
    triangles.push([
      remaining[0]!.sourceIndex,
      remaining[1]!.sourceIndex,
      remaining[2]!.sourceIndex,
    ]);
  return triangles;
}

function sphericalAngle(first: SpatialVec3, second: SpatialVec3): number {
  return Math.acos(clamp(dot3(normalize3(first), normalize3(second)), -1, 1));
}

function pushSphericalTriangle(
  positions: number[],
  colors: number[],
  color: Rgba,
  first: SpatialVec3,
  middle: SpatialVec3,
  last: SpatialVec3,
  radius: number,
  depth = 0,
): void {
  const edges = [
    sphericalAngle(first, middle),
    sphericalAngle(middle, last),
    sphericalAngle(last, first),
  ] as const;
  const maximum = Math.max(...edges);
  if (maximum <= 0.1 || depth >= 8) {
    for (const point of [first, middle, last]) {
      pushVec3(positions, point);
      pushColor(colors, color);
    }
    return;
  }
  const edge = edges.indexOf(maximum);
  if (edge === 0) {
    const midpoint = scale3(normalize3(add3(first, middle)), radius);
    pushSphericalTriangle(positions, colors, color, first, midpoint, last, radius, depth + 1);
    pushSphericalTriangle(positions, colors, color, midpoint, middle, last, radius, depth + 1);
  } else if (edge === 1) {
    const midpoint = scale3(normalize3(add3(middle, last)), radius);
    pushSphericalTriangle(positions, colors, color, first, middle, midpoint, radius, depth + 1);
    pushSphericalTriangle(positions, colors, color, first, midpoint, last, radius, depth + 1);
  } else {
    const midpoint = scale3(normalize3(add3(last, first)), radius);
    pushSphericalTriangle(positions, colors, color, first, middle, midpoint, radius, depth + 1);
    pushSphericalTriangle(positions, colors, color, midpoint, middle, last, radius, depth + 1);
  }
}

function compileGlobe(
  layer: SpatialGlobeLayer,
  layerIndex: number,
): readonly CompiledSpatialGeometry[] {
  const id = layerId(layer, layerIndex);
  const radius = Math.max(0.001, layer.mark.radius ?? 1);
  const opacity = layer.mark.opacity ?? 1;
  const ocean = sphereGeometry(
    `${id}:ocean`,
    radius,
    spatialColor(layer.mark.oceanColor ?? '#bfdbfe', opacity),
  );
  const landPositions: number[] = [];
  const landColors: number[] = [];
  const borderPositions: number[] = [];
  const borderColors: number[] = [];
  const countryPicks: SpatialPickTarget[] = [];
  const landColor = spatialColor(layer.mark.landColor ?? '#dce7d5', opacity);
  const borderColor = spatialColor(layer.mark.borderColor ?? '#64748b', opacity);
  const landRadius = radius * 1.003;
  const countries = naturalEarthCountries110m();
  for (const [countryIndex, country] of countries.entries()) {
    const [countryId, iso2, iso3, , name, labelLongitude, labelLatitude, , polygons] = country;
    for (const polygon of polygons) {
      const outer = polygon[0];
      if (outer === undefined || outer.length < 3) continue;
      const outerPoints = outer.map((position) => {
        return longitudeLatitudeToSphere(position[0], position[1], landRadius);
      });
      for (const triangle of triangulateRing(outer)) {
        pushSphericalTriangle(
          landPositions,
          landColors,
          landColor,
          outerPoints[triangle[0]]!,
          outerPoints[triangle[1]]!,
          outerPoints[triangle[2]]!,
          landRadius,
        );
      }
      for (const ring of polygon) {
        for (let index = 0; index < ring.length - 1; index += 1) {
          pushVec3(
            borderPositions,
            longitudeLatitudeToSphere(ring[index]![0], ring[index]![1], radius * 1.006),
          );
          pushVec3(
            borderPositions,
            longitudeLatitudeToSphere(ring[index + 1]![0], ring[index + 1]![1], radius * 1.006),
          );
          pushColor(borderColors, borderColor);
          pushColor(borderColors, borderColor);
        }
      }
    }
    const pickPosition = longitudeLatitudeToSphere(labelLongitude, labelLatitude, radius * 1.02);
    countryPicks.push({
      layerId: id,
      layerIndex,
      datumIndex: countryIndex,
      nodeId: `${id}:country:${countryId}`,
      position: pickPosition,
      datum: { country: name, iso2, iso3, longitude: labelLongitude, latitude: labelLatitude },
      occlusion: 'globe-front',
    });
  }
  const landPositionArray = new Float32Array(landPositions);
  const land: CompiledSpatialGeometry = {
    id: `${id}:land`,
    primitive: 'triangles',
    positions: landPositionArray,
    normals: Float32Array.from(landPositionArray, (value, index) => {
      const axis = index % 3;
      const start = index - axis;
      const point: SpatialVec3 = [
        landPositionArray[start]!,
        landPositionArray[start + 1]!,
        landPositionArray[start + 2]!,
      ];
      return normalize3(point)[axis]!;
    }),
    colors: new Float32Array(landColors),
    sizes: new Float32Array(landPositionArray.length / 3).fill(1),
    picks: countryPicks,
  };
  const borderPositionArray = new Float32Array(borderPositions);
  const borders: CompiledSpatialGeometry = {
    id: `${id}:borders`,
    primitive: 'lines',
    positions: borderPositionArray,
    normals: repeatedValues(borderPositionArray.length / 3, [0, 1, 0]),
    colors: new Float32Array(borderColors),
    sizes: new Float32Array(borderPositionArray.length / 3).fill(1),
    picks: [],
  };
  const pointPositions: number[] = [];
  const pointColors: number[] = [];
  const pointSizes: number[] = [];
  const pointPicks: SpatialPickTarget[] = [];
  const defaultPointColor = layer.mark.pointColor ?? '#dc2626';
  for (const [datumIndex, point] of (layer.data?.points ?? []).entries()) {
    const position = longitudeLatitudeToSphere(
      finite(point.longitude, `globe point ${datumIndex} longitude`),
      finite(point.latitude, `globe point ${datumIndex} latitude`),
      radius * 1.025,
    );
    pushVec3(pointPositions, position);
    pushColor(pointColors, spatialColor(point.color ?? defaultPointColor, opacity));
    pointSizes.push(Math.max(2, point.size ?? 8));
    pointPicks.push({
      layerId: id,
      layerIndex,
      datumIndex,
      nodeId: `${id}:point:${datumIndex}`,
      position,
      datum: {
        longitude: point.longitude,
        latitude: point.latitude,
        value: point.value,
        label: point.label,
      },
      occlusion: 'globe-front',
    });
  }
  const pointPositionArray = new Float32Array(pointPositions);
  const points: CompiledSpatialGeometry = {
    id: `${id}:points`,
    primitive: 'points',
    positions: pointPositionArray,
    normals: repeatedValues(pointPositionArray.length / 3, [0, 1, 0]),
    colors: new Float32Array(pointColors),
    sizes: new Float32Array(pointSizes),
    picks: pointPicks,
  };
  const routePositions: number[] = [];
  const routeColors: number[] = [];
  const routePicks: SpatialPickTarget[] = [];
  const routeSegments = Math.max(8, Math.min(128, Math.trunc(layer.mark.routeSegments ?? 32)));
  for (const [datumIndex, route] of (layer.data?.routes ?? []).entries()) {
    const path = greatCirclePoints(route.from, route.to, radius * 1.025, routeSegments);
    const color = spatialColor(route.color ?? layer.mark.routeColor ?? '#f97316', opacity);
    for (let index = 0; index < path.length - 1; index += 1) {
      pushVec3(routePositions, path[index]!);
      pushVec3(routePositions, path[index + 1]!);
      pushColor(routeColors, color);
      pushColor(routeColors, color);
    }
    routePicks.push({
      layerId: id,
      layerIndex,
      datumIndex,
      nodeId: `${id}:route:${datumIndex}`,
      position: path[Math.floor(path.length / 2)]!,
      datum: {
        fromLongitude: route.from[0],
        fromLatitude: route.from[1],
        toLongitude: route.to[0],
        toLatitude: route.to[1],
        value: route.value,
        label: route.label,
      },
      occlusion: 'globe-front',
    });
  }
  const routePositionArray = new Float32Array(routePositions);
  const routes: CompiledSpatialGeometry = {
    id: `${id}:routes`,
    primitive: 'lines',
    positions: routePositionArray,
    normals: repeatedValues(routePositionArray.length / 3, [0, 1, 0]),
    colors: new Float32Array(routeColors),
    sizes: new Float32Array(routePositionArray.length / 3).fill(1),
    picks: routePicks,
  };
  return [ocean, land, borders, points, routes].filter((geometry) => geometry.positions.length > 0);
}

const builtInCompilers: Readonly<Record<string, SpatialMarkCompiler>> = {
  globe: (layer, layerIndex) => compileGlobe(layer as SpatialGlobeLayer, layerIndex),
  scatter: (layer, layerIndex) => compileScatter(layer as SpatialScatterLayer, layerIndex),
  surface: (layer, layerIndex) => compileSurface(layer as SpatialSurfaceLayer, layerIndex),
  vector: (layer, layerIndex) => compileVector(layer as SpatialVectorLayer, layerIndex),
  volume: (layer, layerIndex) => compileVolume(layer as SpatialVolumeLayer, layerIndex),
};

export function compileSpatial(spec: SpatialChartSpec): CompiledSpatialScene {
  assertValidSpatialSpec(spec);
  const geometries: CompiledSpatialGeometry[] = [];
  for (const [layerIndex, layer] of spec.layers.entries()) {
    const type = layer.mark.type.trim().toLowerCase();
    const compiler = builtInCompilers[type];
    if (compiler === undefined) fail(`unsupported spatial mark type "${type}".`);
    geometries.push(...compiler(layer, layerIndex));
    assertCompiledSpatialOutputBudget(geometries);
  }
  return {
    geometries,
    bounds: boundsFromPositions(geometries.map(({ positions }) => positions)),
    spec,
  };
}
