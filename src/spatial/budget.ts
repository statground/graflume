import type {
  CompiledSpatialGeometry,
  SpatialChartSpec,
  SpatialGlobeLayer,
  SpatialLayerSpec,
  SpatialMeshData,
  SpatialScatterLayer,
  SpatialStreamtubeData,
  SpatialSurfaceGridData,
  SpatialSurfaceLayer,
  SpatialVectorLayer,
  SpatialVectorFieldData,
  SpatialVolumeLayer,
} from './types.js';

const BYTES_PER_DERIVED_VERTEX = 44;
const BYTES_PER_DERIVED_INDEX = 4;
const ESTIMATED_BYTES_PER_PICK_TARGET = 192;
const GLOBE_BASE_VERTICES = 120_000;
const GLOBE_BASE_INDICES = 13_000;
const GLOBE_BASE_PICK_TARGETS = 200;

export const spatialOutputLimits = Object.freeze({
  vertices: 2_000_000,
  indices: 6_000_000,
  pickTargets: 500_000,
  estimatedBytes: 256 * 1024 * 1024,
});

export interface SpatialOutputEstimate {
  readonly vertices: number;
  readonly indices: number;
  readonly pickTargets: number;
  readonly estimatedBytes: number;
}

export interface SpatialOutputBudgetViolation {
  readonly resource: keyof typeof spatialOutputLimits;
  readonly actual: number;
  readonly maximum: number;
}

interface MutableOutputCounts {
  vertices: number;
  indices: number;
  pickTargets: number;
}

function inferredSurfaceMode(layer: SpatialSurfaceLayer): 'surface' | 'mesh' {
  return layer.mark.mode ?? ('positions' in layer.data ? 'mesh' : 'surface');
}

function inferredVectorMode(layer: SpatialVectorLayer): 'cone' | 'streamtube' {
  return layer.mark.mode ?? ('paths' in layer.data ? 'streamtube' : 'cone');
}

function boundedSegments(value: number | undefined, fallback: number): number {
  return Math.max(5, Math.min(48, Math.trunc(value ?? fallback)));
}

function estimateLayer(layer: SpatialLayerSpec): MutableOutputCounts {
  if (layer.mark.type === 'surface') {
    const surfaceLayer = layer as SpatialSurfaceLayer;
    const contourSegments = surfaceLayer.mark.contours?.maxSegments ?? 100_000;
    const contourMultiplier = surfaceLayer.mark.contours === undefined ? 0 : 1;
    if (inferredSurfaceMode(surfaceLayer) === 'mesh') {
      const data = surfaceLayer.data as SpatialMeshData;
      const triangles = data.triangles.length;
      const flat = surfaceLayer.mark.normalMode === 'flat' && surfaceLayer.mark.wireframe !== true;
      const baseVertices = flat ? triangles * 3 : data.positions.length;
      const baseIndices = surfaceLayer.mark.wireframe ? triangles * 6 : flat ? 0 : triangles * 3;
      const overlay = surfaceLayer.mark.wireOverlay ? data.positions.length : 0;
      const overlayIndices = surfaceLayer.mark.wireOverlay ? triangles * 6 : 0;
      return {
        vertices: baseVertices + overlay + contourSegments * 2 * contourMultiplier,
        indices: baseIndices + overlayIndices,
        pickTargets: data.positions.length + contourSegments * contourMultiplier,
      };
    }
    const data = surfaceLayer.data as SpatialSurfaceGridData;
    const vertices = data.rows * data.columns;
    const cells = (data.rows - 1) * (data.columns - 1);
    const flat = surfaceLayer.mark.normalMode === 'flat' && surfaceLayer.mark.wireframe !== true;
    const baseVertices = flat ? cells * 6 : vertices;
    const indices = surfaceLayer.mark.wireframe
      ? cells * 4 + (data.rows - 1) * 2 + (data.columns - 1) * 2
      : flat
        ? 0
        : cells * 6;
    const overlayIndices = surfaceLayer.mark.wireOverlay
      ? cells * 4 + (data.rows - 1) * 2 + (data.columns - 1) * 2
      : 0;
    return {
      vertices:
        baseVertices +
        (surfaceLayer.mark.wireOverlay ? vertices : 0) +
        contourSegments * 2 * contourMultiplier,
      indices: indices + overlayIndices,
      pickTargets: vertices + contourSegments * contourMultiplier,
    };
  }
  if (layer.mark.type === 'volume') {
    const volumeLayer = layer as SpatialVolumeLayer;
    const [x, y, z] = volumeLayer.data.dimensions;
    if ((volumeLayer.mark.mode ?? 'volume') === 'isosurface') {
      const cells = (x - 1) * (y - 1) * (z - 1);
      const triangles = cells * 12;
      return { vertices: triangles * 3, indices: 0, pickTargets: triangles };
    }
    const render = volumeLayer.mark.render;
    const slices = volumeLayer.mark.slices ?? [];
    if (render !== undefined || slices.length > 0) {
      const defaultResolution = (axis: 'x' | 'y' | 'z'): readonly [number, number] =>
        axis === 'x'
          ? [Math.min(256, z), Math.min(256, y)]
          : axis === 'y'
            ? [Math.min(256, x), Math.min(256, z)]
            : [Math.min(256, x), Math.min(256, y)];
      const plane = (resolution: readonly [number, number]): MutableOutputCounts => ({
        vertices: resolution[0] * resolution[1],
        indices: Math.max(0, resolution[0] - 1) * Math.max(0, resolution[1] - 1) * 6,
        pickTargets: resolution[0] * resolution[1],
      });
      const total: MutableOutputCounts = { vertices: 0, indices: 0, pickTargets: 0 };
      const add = (counts: MutableOutputCounts): void => {
        total.vertices += counts.vertices;
        total.indices += counts.indices;
        total.pickTargets += counts.pickTargets;
      };
      if (render !== undefined) {
        const resolution = render.resolution ?? defaultResolution(render.axis ?? 'z');
        add(plane(resolution));
        const caps = render.caps ?? 'none';
        if (caps === 'front' || caps === 'back') add(plane(resolution));
        else if (caps === 'both') {
          add(plane(resolution));
          add(plane(resolution));
        }
      }
      for (const slice of slices) {
        const resolution =
          slice.resolution ??
          (slice.type === 'orthogonal'
            ? defaultResolution(slice.axis)
            : [Math.min(128, Math.max(x, z)), Math.min(128, y)]);
        add(plane(resolution));
      }
      return total;
    }
    const maximumSamples = Math.max(1, Math.trunc(volumeLayer.mark.maxSamples ?? 80_000));
    const vertices = Math.min(x * y * z, maximumSamples);
    return { vertices, indices: 0, pickTargets: vertices };
  }
  if (layer.mark.type === 'vector') {
    const vectorLayer = layer as SpatialVectorLayer;
    if ('dimensions' in vectorLayer.data) {
      const data = vectorLayer.data as SpatialVectorFieldData;
      const seedCount =
        (data.seeds?.length ?? 0) +
        (data.seedGrid === undefined
          ? data.seeds === undefined || data.seeds.length === 0
            ? 8
            : 0
          : data.seedGrid.dimensions[0] *
            data.seedGrid.dimensions[1] *
            data.seedGrid.dimensions[2]);
      const maxSteps = Math.trunc(vectorLayer.mark.integration?.maxSteps ?? 512);
      const directions =
        vectorLayer.mark.integration?.direction === 'both' ||
        vectorLayer.mark.integration?.direction === undefined
          ? 2
          : 1;
      const points = seedCount * (maxSteps * directions + 1);
      const segments = boundedSegments(vectorLayer.mark.segments, 10);
      return {
        vertices: points * segments,
        indices: Math.max(0, points - seedCount) * segments * 6,
        pickTargets: points,
      };
    }
    if (inferredVectorMode(vectorLayer) === 'streamtube') {
      const data = vectorLayer.data as SpatialStreamtubeData;
      const segments = boundedSegments(vectorLayer.mark.segments, 10);
      const points = data.paths.reduce((total, path) => total + path.length, 0);
      const links = data.paths.reduce((total, path) => total + Math.max(0, path.length - 1), 0);
      return {
        vertices: points * segments,
        indices: links * segments * 6,
        pickTargets: points,
      };
    }
    const count = 'origins' in vectorLayer.data ? vectorLayer.data.origins.length : 0;
    const segments = boundedSegments(vectorLayer.mark.segments, 12);
    return {
      vertices: count * (segments + 2),
      indices: count * segments * 6,
      pickTargets: count,
    };
  }
  if (layer.mark.type === 'scatter') {
    const vertices = (layer as SpatialScatterLayer).data.positions.length;
    return { vertices, indices: 0, pickTargets: vertices };
  }
  const globeLayer = layer as SpatialGlobeLayer;
  const points = globeLayer.data?.points?.length ?? 0;
  const routes = globeLayer.data?.routes?.length ?? 0;
  const routeSegments = Math.max(8, Math.min(128, Math.trunc(globeLayer.mark.routeSegments ?? 32)));
  return {
    vertices: GLOBE_BASE_VERTICES + points + routes * routeSegments * 2,
    indices: GLOBE_BASE_INDICES,
    pickTargets: GLOBE_BASE_PICK_TARGETS + points + routes,
  };
}

function withEstimatedBytes(counts: MutableOutputCounts): SpatialOutputEstimate {
  return {
    ...counts,
    estimatedBytes:
      counts.vertices * BYTES_PER_DERIVED_VERTEX +
      counts.indices * BYTES_PER_DERIVED_INDEX +
      counts.pickTargets * ESTIMATED_BYTES_PER_PICK_TARGET,
  };
}

export function estimateSpatialOutput(spec: SpatialChartSpec): SpatialOutputEstimate {
  const counts: MutableOutputCounts = { vertices: 0, indices: 0, pickTargets: 0 };
  for (const layer of spec.layers) {
    const layerCounts = estimateLayer(layer);
    counts.vertices += layerCounts.vertices;
    counts.indices += layerCounts.indices;
    counts.pickTargets += layerCounts.pickTargets;
  }
  return withEstimatedBytes(counts);
}

export function measureCompiledSpatialOutput(
  geometries: readonly CompiledSpatialGeometry[],
): SpatialOutputEstimate {
  const counts: MutableOutputCounts = { vertices: 0, indices: 0, pickTargets: 0 };
  let typedArrayBytes = 0;
  for (const geometry of geometries) {
    counts.vertices += geometry.positions.length / 3;
    counts.indices += geometry.indices?.length ?? 0;
    counts.pickTargets += geometry.picks.length;
    typedArrayBytes +=
      geometry.positions.byteLength +
      geometry.normals.byteLength +
      geometry.colors.byteLength +
      geometry.sizes.byteLength +
      (geometry.indices?.byteLength ?? 0);
  }
  return {
    ...counts,
    estimatedBytes: typedArrayBytes + counts.pickTargets * ESTIMATED_BYTES_PER_PICK_TARGET,
  };
}

export function spatialOutputBudgetViolations(
  estimate: SpatialOutputEstimate,
): readonly SpatialOutputBudgetViolation[] {
  return (Object.keys(spatialOutputLimits) as readonly (keyof typeof spatialOutputLimits)[])
    .filter((resource) => estimate[resource] > spatialOutputLimits[resource])
    .map((resource) => ({
      resource,
      actual: estimate[resource],
      maximum: spatialOutputLimits[resource],
    }));
}

export function assertCompiledSpatialOutputBudget(
  geometries: readonly CompiledSpatialGeometry[],
): void {
  const violation = spatialOutputBudgetViolations(measureCompiledSpatialOutput(geometries))[0];
  if (violation === undefined) return;
  throw new RangeError(
    `Compiled spatial output ${violation.resource} (${violation.actual}) exceeds the safe limit (${violation.maximum}).`,
  );
}
