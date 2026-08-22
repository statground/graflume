import type { DatumReference, Rect, Scene } from '../scene/types.js';
import type { TooltipAxis } from '../spec/types.js';
import type { HitResult } from './hit-test.js';

export interface AxisTooltipTarget extends DatumReference {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly order: number;
}

export interface AxisTooltipRegistration {
  readonly axis: TooltipAxis;
  readonly plot: Rect;
  readonly axisVisible: boolean;
  readonly axisStripSize: number;
  readonly targets: readonly AxisTooltipTarget[];
}

interface AxisTooltipIndex extends Omit<AxisTooltipRegistration, 'targets'> {
  readonly targets: readonly AxisTooltipTarget[];
}

const indexByScene = new WeakMap<Scene, AxisTooltipIndex>();
const coordinateEpsilon = 1e-6;

function primary(target: AxisTooltipTarget, axis: TooltipAxis): number {
  return axis === 'x' ? target.x : target.y;
}

function perpendicular(target: AxisTooltipTarget, axis: TooltipAxis): number {
  return axis === 'x' ? target.y : target.x;
}

export function registerAxisTooltipIndex(
  scene: Scene,
  registration: AxisTooltipRegistration,
): void {
  const targets = registration.targets
    .filter((target) => Number.isFinite(target.x) && Number.isFinite(target.y))
    .sort((left, right) => {
      const coordinate = primary(left, registration.axis) - primary(right, registration.axis);
      if (Math.abs(coordinate) > coordinateEpsilon) return coordinate;
      if (left.order !== right.order) return right.order - left.order;
      return left.nodeId.localeCompare(right.nodeId);
    });
  indexByScene.set(scene, { ...registration, targets });
}

export function axisTooltipTargetCount(scene: Scene): number {
  return indexByScene.get(scene)?.targets.length ?? 0;
}

function insideActivationRegion(index: AxisTooltipIndex, x: number, y: number): boolean {
  const { plot, axis, axisVisible, axisStripSize } = index;
  const right = plot.x + plot.width;
  const bottom = plot.y + plot.height;
  if (axis === 'x') {
    const stripBottom = bottom + (axisVisible ? axisStripSize : 0);
    return x >= plot.x && x <= right && y >= plot.y && y <= stripBottom;
  }
  const stripLeft = plot.x - (axisVisible ? axisStripSize : 0);
  return x >= stripLeft && x <= right && y >= plot.y && y <= bottom;
}

function lowerBound(
  targets: readonly AxisTooltipTarget[],
  axis: TooltipAxis,
  value: number,
): number {
  let low = 0;
  let high = targets.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const target = targets[middle];
    if (target !== undefined && primary(target, axis) < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function nearestCoordinate(index: AxisTooltipIndex, pointer: number): number | null {
  const insertion = lowerBound(index.targets, index.axis, pointer);
  const before = index.targets[insertion - 1];
  const after = index.targets[insertion];
  if (before === undefined && after === undefined) return null;
  if (before === undefined) return primary(after as AxisTooltipTarget, index.axis);
  if (after === undefined) return primary(before, index.axis);
  const beforeCoordinate = primary(before, index.axis);
  const afterCoordinate = primary(after, index.axis);
  return pointer - beforeCoordinate <= afterCoordinate - pointer
    ? beforeCoordinate
    : afterCoordinate;
}

export function hitTestAxisTooltip(scene: Scene, x: number, y: number): HitResult | null {
  const index = indexByScene.get(scene);
  if (
    index === undefined ||
    index.targets.length === 0 ||
    !scene.metadata.hitTestingEnabled ||
    !insideActivationRegion(index, x, y)
  ) {
    return null;
  }

  const pointerPrimary = index.axis === 'x' ? x : y;
  const pointerPerpendicular = index.axis === 'x' ? y : x;
  const coordinate = nearestCoordinate(index, pointerPrimary);
  if (coordinate === null) return null;

  const start = lowerBound(index.targets, index.axis, coordinate - coordinateEpsilon);
  let best: AxisTooltipTarget | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let cursor = start; cursor < index.targets.length; cursor += 1) {
    const target = index.targets[cursor];
    if (target === undefined) continue;
    if (Math.abs(primary(target, index.axis) - coordinate) > coordinateEpsilon) break;
    const distance = Math.abs(perpendicular(target, index.axis) - pointerPerpendicular);
    if (
      distance < bestDistance - coordinateEpsilon ||
      (Math.abs(distance - bestDistance) <= coordinateEpsilon &&
        (best === null || target.order > best.order))
    ) {
      best = target;
      bestDistance = distance;
    }
  }
  if (best === null) return null;
  return {
    layerId: best.layerId,
    rowIndex: best.rowIndex,
    datum: best.datum,
    ...(best.tooltip === undefined ? {} : { tooltip: best.tooltip }),
    nodeId: best.nodeId,
    x,
    y,
    distance: Math.abs(pointerPrimary - coordinate),
  };
}
