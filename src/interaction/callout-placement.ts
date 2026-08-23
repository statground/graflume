export type CalloutPlacement = 'top' | 'right' | 'bottom' | 'left';

export interface CalloutRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CalloutPlacementOptions {
  readonly target: CalloutRect;
  readonly width: number;
  readonly height: number;
  readonly boundary: CalloutRect;
  readonly placement?: 'auto' | CalloutPlacement;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly gap?: number;
  readonly dataObstacles?: readonly CalloutRect[];
  readonly protectedObstacles?: readonly CalloutRect[];
  readonly occupiedCallouts?: readonly CalloutRect[];
}

export interface CalloutPlacementResult {
  readonly x: number;
  readonly y: number;
  readonly bounds: CalloutRect;
  readonly placement: CalloutPlacement;
}

interface Candidate extends CalloutPlacementResult {
  readonly rawBounds: CalloutRect;
  readonly order: number;
}

function intersectionArea(left: CalloutRect, right: CalloutRect): number {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x),
  );
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y),
  );
  return width * height;
}

function overlapArea(bounds: CalloutRect, obstacles: readonly CalloutRect[]): number {
  return obstacles.reduce((sum, obstacle) => sum + intersectionArea(bounds, obstacle), 0);
}

function outsideArea(bounds: CalloutRect, boundary: CalloutRect): number {
  return Math.max(0, bounds.width * bounds.height - intersectionArea(bounds, boundary));
}

function clampBounds(bounds: CalloutRect, boundary: CalloutRect): CalloutRect {
  const minimumX = boundary.x;
  const minimumY = boundary.y;
  const maximumX = Math.max(minimumX, boundary.x + boundary.width - bounds.width);
  const maximumY = Math.max(minimumY, boundary.y + boundary.height - bounds.height);
  return {
    ...bounds,
    x: Math.max(minimumX, Math.min(maximumX, bounds.x)),
    y: Math.max(minimumY, Math.min(maximumY, bounds.y)),
  };
}

function candidateBounds(
  placement: CalloutPlacement,
  alignment: -1 | 0 | 1,
  options: CalloutPlacementOptions,
): CalloutRect {
  const gap = options.gap ?? 18;
  const targetCenterX = options.target.x + options.target.width / 2;
  const targetCenterY = options.target.y + options.target.height / 2;
  let x = targetCenterX - options.width / 2;
  let y = targetCenterY - options.height / 2;
  if (placement === 'top' || placement === 'bottom') {
    x += alignment * Math.max(options.width * 0.58, options.target.width / 2 + gap);
    y =
      placement === 'top'
        ? options.target.y - options.height - gap
        : options.target.y + options.target.height + gap;
  } else {
    y += alignment * Math.max(options.height * 0.58, options.target.height / 2 + gap);
    x =
      placement === 'left'
        ? options.target.x - options.width - gap
        : options.target.x + options.target.width + gap;
  }
  return {
    x: x + (options.offsetX ?? 0),
    y: y + (options.offsetY ?? 0),
    width: options.width,
    height: options.height,
  };
}

function score(candidate: Candidate, options: CalloutPlacementOptions): number {
  const rawOverflow = outsideArea(candidate.rawBounds, options.boundary);
  const protectedOverlap = overlapArea(candidate.bounds, options.protectedObstacles ?? []);
  const occupiedOverlap = overlapArea(candidate.bounds, options.occupiedCallouts ?? []);
  const targetOverlap = intersectionArea(candidate.bounds, options.target);
  const dataOverlap = overlapArea(candidate.bounds, options.dataObstacles ?? []);
  const targetCenterX = options.target.x + options.target.width / 2;
  const targetCenterY = options.target.y + options.target.height / 2;
  const candidateCenterX = candidate.bounds.x + candidate.bounds.width / 2;
  const candidateCenterY = candidate.bounds.y + candidate.bounds.height / 2;
  const distance = Math.hypot(candidateCenterX - targetCenterX, candidateCenterY - targetCenterY);
  return (
    rawOverflow * 1_000_000 +
    occupiedOverlap * 80_000 +
    protectedOverlap * 60_000 +
    targetOverlap * 40_000 +
    dataOverlap * 16 +
    distance * 0.01 +
    candidate.order * 0.0001
  );
}

function explicitIsUnsafe(candidate: Candidate, options: CalloutPlacementOptions): boolean {
  const area = Math.max(1, candidate.bounds.width * candidate.bounds.height);
  return (
    outsideArea(candidate.rawBounds, options.boundary) > 0.5 ||
    overlapArea(candidate.bounds, options.protectedObstacles ?? []) > area * 0.08 ||
    overlapArea(candidate.bounds, options.occupiedCallouts ?? []) > area * 0.08 ||
    intersectionArea(candidate.bounds, options.target) > area * 0.25 ||
    overlapArea(candidate.bounds, options.dataObstacles ?? []) > area * 0.72
  );
}

/**
 * Select a deterministic, renderer-neutral perimeter position for a callout.
 * Authored cardinal placement wins while it remains in bounds and avoids a
 * severe collision; `auto` and unsafe authored positions use the lowest score.
 */
export function placeCallout(options: CalloutPlacementOptions): CalloutPlacementResult {
  const targetCenterX = options.target.x + options.target.width / 2;
  const targetCenterY = options.target.y + options.target.height / 2;
  const boundaryCenterX = options.boundary.x + options.boundary.width / 2;
  const boundaryCenterY = options.boundary.y + options.boundary.height / 2;
  const horizontalFirst: readonly CalloutPlacement[] =
    targetCenterX <= boundaryCenterX ? ['right', 'left'] : ['left', 'right'];
  const verticalFirst: readonly CalloutPlacement[] =
    targetCenterY <= boundaryCenterY ? ['bottom', 'top'] : ['top', 'bottom'];
  const preferred = options.placement === undefined ? 'auto' : options.placement;
  const placements: readonly CalloutPlacement[] =
    preferred === 'auto'
      ? [horizontalFirst[0]!, verticalFirst[0]!, horizontalFirst[1]!, verticalFirst[1]!]
      : [preferred, ...[...horizontalFirst, ...verticalFirst].filter((item) => item !== preferred)];
  const candidates: Candidate[] = [];
  let order = 0;
  for (const placement of placements) {
    for (const alignment of [0, -1, 1] as const) {
      const rawBounds = candidateBounds(placement, alignment, options);
      const bounds = clampBounds(rawBounds, options.boundary);
      candidates.push({
        x: bounds.x,
        y: bounds.y,
        bounds,
        placement,
        rawBounds,
        order,
      });
      order += 1;
    }
  }
  const explicit = candidates[0]!;
  if (preferred !== 'auto' && !explicitIsUnsafe(explicit, options)) {
    return {
      x: explicit.x,
      y: explicit.y,
      bounds: explicit.bounds,
      placement: explicit.placement,
    };
  }
  const best = candidates.reduce((winner, candidate) =>
    score(candidate, options) < score(winner, options) ? candidate : winner,
  );
  return { x: best.x, y: best.y, bounds: best.bounds, placement: best.placement };
}
