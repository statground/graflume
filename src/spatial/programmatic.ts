import { normalizedCamera } from './math.js';
import type { SpatialCameraState, SpatialChartSpec } from './types.js';
import { assertValidSpatialSpec } from './validate.js';

export function assertFiniteSpatialNumber(label: string, value: number): void {
  if (!Number.isFinite(value)) throw new TypeError(`Spatial ${label} must be a finite number.`);
}

export function resolveSpatialCameraPatch(
  spec: SpatialChartSpec,
  current: SpatialCameraState,
  patch: Readonly<Partial<SpatialCameraState>>,
  sceneRadius: number,
): SpatialCameraState {
  const candidate = { ...current, ...patch };
  assertValidSpatialSpec({ ...spec, camera: candidate });
  return normalizedCamera(candidate.projection, candidate.target, sceneRadius, candidate);
}
