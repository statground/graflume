import type { SpatialBounds, SpatialCameraState, SpatialProjection, SpatialVec3 } from './types.js';

export type Mat4 = Float32Array;

const epsilon = 1e-8;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function add3(left: SpatialVec3, right: SpatialVec3): SpatialVec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

export function subtract3(left: SpatialVec3, right: SpatialVec3): SpatialVec3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

export function scale3(value: SpatialVec3, amount: number): SpatialVec3 {
  return [value[0] * amount, value[1] * amount, value[2] * amount];
}

export function dot3(left: SpatialVec3, right: SpatialVec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

export function cross3(left: SpatialVec3, right: SpatialVec3): SpatialVec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

export function length3(value: SpatialVec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}

export function normalize3(value: SpatialVec3, fallback: SpatialVec3 = [0, 1, 0]): SpatialVec3 {
  const length = length3(value);
  return length <= epsilon ? fallback : scale3(value, 1 / length);
}

export function multiplyMat4(left: Mat4, right: Mat4): Mat4 {
  const output = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let inner = 0; inner < 4; inner += 1) {
        value += left[inner * 4 + row]! * right[column * 4 + inner]!;
      }
      output[column * 4 + row] = value;
    }
  }
  return output;
}

export function perspectiveMat4(
  fovDegrees: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
  const range = 1 / (near - far);
  return new Float32Array([
    f / Math.max(epsilon, aspect),
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * range,
    -1,
    0,
    0,
    2 * far * near * range,
    0,
  ]);
}

export function orthographicMat4(extent: number, aspect: number, near: number, far: number): Mat4 {
  const horizontal = extent * Math.max(1, aspect);
  const vertical = extent * Math.max(1, 1 / Math.max(epsilon, aspect));
  const left = -horizontal;
  const right = horizontal;
  const bottom = -vertical;
  const top = vertical;
  return new Float32Array([
    2 / (right - left),
    0,
    0,
    0,
    0,
    2 / (top - bottom),
    0,
    0,
    0,
    0,
    -2 / (far - near),
    0,
    -(right + left) / (right - left),
    -(top + bottom) / (top - bottom),
    -(far + near) / (far - near),
    1,
  ]);
}

export function lookAtMat4(eye: SpatialVec3, target: SpatialVec3, up: SpatialVec3): Mat4 {
  const forward = normalize3(subtract3(eye, target), [0, 0, 1]);
  const right = normalize3(cross3(up, forward), [1, 0, 0]);
  const cameraUp = cross3(forward, right);
  return new Float32Array([
    right[0],
    cameraUp[0],
    forward[0],
    0,
    right[1],
    cameraUp[1],
    forward[1],
    0,
    right[2],
    cameraUp[2],
    forward[2],
    0,
    -dot3(right, eye),
    -dot3(cameraUp, eye),
    -dot3(forward, eye),
    1,
  ]);
}

export function cameraEye(camera: SpatialCameraState): SpatialVec3 {
  const cosPitch = Math.cos(camera.pitch);
  return add3(camera.target, [
    camera.distance * cosPitch * Math.sin(camera.yaw),
    camera.distance * Math.sin(camera.pitch),
    camera.distance * cosPitch * Math.cos(camera.yaw),
  ]);
}

export function cameraBasis(camera: SpatialCameraState): {
  readonly right: SpatialVec3;
  readonly up: SpatialVec3;
  readonly forward: SpatialVec3;
} {
  const eye = cameraEye(camera);
  const forward = normalize3(subtract3(camera.target, eye), [0, 0, -1]);
  const right = normalize3(cross3(forward, [0, 1, 0]), [1, 0, 0]);
  return { right, up: normalize3(cross3(right, forward), [0, 1, 0]), forward };
}

export function viewProjectionMat4(
  camera: SpatialCameraState,
  width: number,
  height: number,
): Mat4 {
  const aspect = Math.max(epsilon, width / Math.max(1, height));
  const view = lookAtMat4(cameraEye(camera), camera.target, [0, 1, 0]);
  const projection =
    camera.projection === 'orthographic'
      ? orthographicMat4(camera.distance * 0.55, aspect, camera.near, camera.far)
      : perspectiveMat4(camera.fov, aspect, camera.near, camera.far);
  return multiplyMat4(projection, view);
}

export function projectPoint(
  matrix: Mat4,
  point: SpatialVec3,
  width: number,
  height: number,
): { readonly x: number; readonly y: number; readonly depth: number; readonly visible: boolean } {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const clipX = matrix[0]! * x + matrix[4]! * y + matrix[8]! * z + matrix[12]!;
  const clipY = matrix[1]! * x + matrix[5]! * y + matrix[9]! * z + matrix[13]!;
  const clipZ = matrix[2]! * x + matrix[6]! * y + matrix[10]! * z + matrix[14]!;
  const clipW = matrix[3]! * x + matrix[7]! * y + matrix[11]! * z + matrix[15]!;
  if (clipW <= epsilon) return { x: 0, y: 0, depth: 1, visible: false };
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  const ndcZ = clipZ / clipW;
  return {
    x: ((ndcX + 1) / 2) * width,
    y: ((1 - ndcY) / 2) * height,
    depth: (ndcZ + 1) / 2,
    visible:
      ndcX >= -1.08 && ndcX <= 1.08 && ndcY >= -1.08 && ndcY <= 1.08 && ndcZ >= -1 && ndcZ <= 1,
  };
}

export function boundsFromPositions(positionArrays: readonly Float32Array[]): SpatialBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const positions of positionArrays) {
    for (let index = 0; index + 2 < positions.length; index += 3) {
      const x = positions[index]!;
      const y = positions[index + 1]!;
      const z = positions[index + 2]!;
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
  }
  if (!Number.isFinite(minX)) {
    return { min: [-1, -1, -1], max: [1, 1, 1], center: [0, 0, 0], radius: 1 };
  }
  const min: SpatialVec3 = [minX, minY, minZ];
  const max: SpatialVec3 = [maxX, maxY, maxZ];
  const center: SpatialVec3 = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const radius = Math.max(epsilon, length3(subtract3(max, min)) / 2);
  return { min, max, center, radius };
}

export function normalizedCamera(
  projection: SpatialProjection,
  target: SpatialVec3,
  radius: number,
  input: Readonly<Partial<SpatialCameraState>> = {},
): SpatialCameraState {
  const distance = Math.max(0.001, input.distance ?? Math.max(2.5, radius * 3.2));
  const near = Math.max(0.0001, input.near ?? Math.max(0.001, distance / 1000));
  const far = Math.max(near + 1, input.far ?? distance + radius * 12 + 100);
  return {
    projection: input.projection ?? projection,
    target: input.target ?? target,
    yaw: input.yaw ?? Math.PI / 4,
    pitch: clamp(input.pitch ?? Math.PI / 6, -Math.PI * 0.49, Math.PI * 0.49),
    distance,
    fov: clamp(input.fov ?? 45, 10, 120),
    near,
    far,
  };
}
