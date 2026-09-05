import type { DatumReference, Rect, Scene } from '../scene/types.js';
import type { AxisPosition, TooltipAxis } from '../spec/types.js';
import { builtInAxisChannel } from '../spec/axes.js';
import type { HitResult } from './hit-test.js';

export interface AxisTooltipTarget extends DatumReference {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly order: number;
  readonly color?: string;
}

export interface AxisTooltipHit extends HitResult {
  readonly color?: string;
}

export interface SharedAxisTooltipHit {
  readonly hits: readonly AxisTooltipHit[];
  /** Nearest-category lane in untransformed scene coordinates. */
  readonly pointer: Rect;
}

export interface AxisTooltipRegistration {
  readonly axis: TooltipAxis;
  readonly channel?: 'x' | 'y';
  readonly position?: AxisPosition;
  readonly plot: Rect;
  readonly axisVisible: boolean;
  readonly axisStripSize: number;
  readonly categoryStep?: number;
  readonly targets: readonly AxisTooltipTarget[];
}

interface AxisTooltipIndex extends Omit<AxisTooltipRegistration, 'targets' | 'channel'> {
  readonly channel: 'x' | 'y';
  readonly targets: readonly AxisTooltipTarget[];
}

const indexByScene = new WeakMap<Scene, AxisTooltipIndex>();
const coordinateEpsilon = 1e-6;

function primary(target: AxisTooltipTarget, channel: 'x' | 'y'): number {
  return channel === 'x' ? target.x : target.y;
}

function perpendicular(target: AxisTooltipTarget, channel: 'x' | 'y'): number {
  return channel === 'x' ? target.y : target.x;
}

export function registerAxisTooltipIndex(
  scene: Scene,
  registration: AxisTooltipRegistration,
): void {
  const channel = registration.channel ?? builtInAxisChannel(registration.axis) ?? 'x';
  const targets = registration.targets
    .filter((target) => Number.isFinite(target.x) && Number.isFinite(target.y))
    .sort((left, right) => {
      const coordinate = primary(left, channel) - primary(right, channel);
      if (Math.abs(coordinate) > coordinateEpsilon) return coordinate;
      if (left.order !== right.order) return right.order - left.order;
      return left.nodeId.localeCompare(right.nodeId);
    });
  indexByScene.set(scene, { ...registration, channel, targets });
}

export function axisTooltipTargetCount(scene: Scene): number {
  return indexByScene.get(scene)?.targets.length ?? 0;
}

function insideActivationRegion(index: AxisTooltipIndex, x: number, y: number): boolean {
  const { plot, axis, channel, axisVisible, axisStripSize } = index;
  const right = plot.x + plot.width;
  const bottom = plot.y + plot.height;
  const horizontal = channel === 'x';
  const position =
    index.position ??
    (horizontal ? (axis === 'x2' ? 'top' : 'bottom') : axis === 'y2' ? 'right' : 'left');
  if (horizontal) {
    const strip = axisVisible ? axisStripSize : 0;
    const top = position === 'top' ? plot.y - strip : plot.y;
    const stripBottom = position === 'bottom' ? bottom + strip : bottom;
    return x >= plot.x && x <= right && y >= top && y <= stripBottom;
  }
  const strip = axisVisible ? axisStripSize : 0;
  const left = position === 'left' ? plot.x - strip : plot.x;
  const stripRight = position === 'right' ? right + strip : right;
  return x >= left && x <= stripRight && y >= plot.y && y <= bottom;
}

function lowerBound(
  targets: readonly AxisTooltipTarget[],
  channel: 'x' | 'y',
  value: number,
): number {
  let low = 0;
  let high = targets.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const target = targets[middle];
    if (target !== undefined && primary(target, channel) < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function nearestCoordinate(index: AxisTooltipIndex, pointer: number): number | null {
  const insertion = lowerBound(index.targets, index.channel, pointer);
  const before = index.targets[insertion - 1];
  const after = index.targets[insertion];
  if (before === undefined && after === undefined) return null;
  if (before === undefined) return primary(after as AxisTooltipTarget, index.channel);
  if (after === undefined) return primary(before, index.channel);
  const beforeCoordinate = primary(before, index.channel);
  const afterCoordinate = primary(after, index.channel);
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

  const horizontal = index.channel === 'x';
  const pointerPrimary = horizontal ? x : y;
  const pointerPerpendicular = horizontal ? y : x;
  const coordinate = nearestCoordinate(index, pointerPrimary);
  if (coordinate === null) return null;

  const start = lowerBound(index.targets, index.channel, coordinate - coordinateEpsilon);
  let best: AxisTooltipTarget | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let cursor = start; cursor < index.targets.length; cursor += 1) {
    const target = index.targets[cursor];
    if (target === undefined) continue;
    if (Math.abs(primary(target, index.channel) - coordinate) > coordinateEpsilon) break;
    const distance = Math.abs(perpendicular(target, index.channel) - pointerPerpendicular);
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

/** Resolve visible series at one actual coordinate without interpolating missing rows. */
export function hitTestSharedAxisTooltip(
  scene: Scene,
  x: number,
  y: number,
): SharedAxisTooltipHit | null {
  const index = indexByScene.get(scene);
  if (
    index === undefined ||
    !scene.metadata.hitTestingEnabled ||
    !insideActivationRegion(index, x, y)
  )
    return null;
  const pointer = index.channel === 'x' ? x : y;
  const coordinate = nearestCoordinate(index, pointer);
  if (coordinate === null) return null;
  const start = lowerBound(index.targets, index.channel, coordinate - coordinateEpsilon);
  const byLayer = new Map<string, AxisTooltipTarget>();
  let end = start;
  for (; end < index.targets.length; end += 1) {
    const target = index.targets[end]!;
    if (Math.abs(primary(target, index.channel) - coordinate) > coordinateEpsilon) break;
    // Index order already puts the uppermost target first for repeated layer geometry.
    if (!byLayer.has(target.layerId)) byLayer.set(target.layerId, target);
  }
  const hits = [...byLayer.values()].map((target): AxisTooltipHit => ({
    ...target,
    x,
    y,
    distance: Math.abs(pointer - coordinate),
  }));
  if (hits.length === 0) return null;
  const before = index.targets[start - 1];
  const after = index.targets[end];
  const horizontal = index.channel === 'x';
  const plotStart = horizontal ? index.plot.x : index.plot.y;
  const plotEnd = plotStart + (horizontal ? index.plot.width : index.plot.height);
  const laneStart = Math.max(
    plotStart,
    index.categoryStep !== undefined
      ? coordinate - index.categoryStep / 2
      : before === undefined
        ? plotStart
        : (primary(before, index.channel) + coordinate) / 2,
  );
  const laneEnd = Math.min(
    plotEnd,
    index.categoryStep !== undefined
      ? coordinate + index.categoryStep / 2
      : after === undefined
        ? plotEnd
        : (primary(after, index.channel) + coordinate) / 2,
  );
  return {
    hits,
    pointer: horizontal
      ? {
          x: laneStart,
          y: index.plot.y,
          width: Math.max(0, laneEnd - laneStart),
          height: index.plot.height,
        }
      : {
          x: index.plot.x,
          y: laneStart,
          width: index.plot.width,
          height: Math.max(0, laneEnd - laneStart),
        },
  };
}
