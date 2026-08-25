import type { MarkLabelSceneEntry, Rect } from '../scene/types.js';
import type {
  DatumTargetSpec,
  MarkLabelPositionSpec,
  NormalizedMarkLabelSnapSpec,
} from '../spec/types.js';

function cloneTarget(target: DatumTargetSpec): DatumTargetSpec {
  return {
    ...target,
    ...(Array.isArray(target.rowIndex) ? { rowIndex: [...target.rowIndex] } : {}),
    ...(target.values === undefined ? {} : { values: [...target.values] }),
  };
}

export function cloneMarkLabelPosition(position: MarkLabelPositionSpec): MarkLabelPositionSpec {
  return { ...position, target: cloneTarget(position.target) };
}

export function cloneMarkLabelPositions(
  positions: readonly MarkLabelPositionSpec[],
): readonly MarkLabelPositionSpec[] {
  return positions.map(cloneMarkLabelPosition);
}

function targetKey(target: DatumTargetSpec): string {
  return JSON.stringify({
    type: 'datum',
    ...(target.layerId === undefined ? {} : { layerId: target.layerId }),
    ...(target.rowIndex === undefined
      ? {}
      : {
          rowIndex: Array.isArray(target.rowIndex)
            ? [...target.rowIndex].sort((left, right) => left - right)
            : target.rowIndex,
        }),
    ...(target.field === undefined ? {} : { field: target.field }),
    ...(target.value === undefined ? {} : { value: target.value }),
    ...(target.values === undefined
      ? {}
      : {
          values: [...target.values].sort((left, right) =>
            JSON.stringify(left).localeCompare(JSON.stringify(right)),
          ),
        }),
  });
}

function positionsKey(positions: readonly MarkLabelPositionSpec[]): string {
  return JSON.stringify(
    positions.map((position) => ({
      target: targetKey(position.target),
      offsetX: position.offsetX ?? 0,
      offsetY: position.offsetY ?? 0,
      hidden: position.hidden ?? false,
    })),
  );
}

export function setMarkLabelOffset(
  positions: readonly MarkLabelPositionSpec[],
  target: DatumTargetSpec,
  offsetX: number,
  offsetY: number,
  hidden = false,
): readonly MarkLabelPositionSpec[] {
  const key = targetKey(target);
  const next = positions.filter((position) => targetKey(position.target) !== key);
  if (offsetX === 0 && offsetY === 0 && !hidden) return next.map(cloneMarkLabelPosition);
  return [
    ...next.map(cloneMarkLabelPosition),
    {
      target: cloneTarget(target),
      ...(offsetX === 0 ? {} : { offsetX }),
      ...(offsetY === 0 ? {} : { offsetY }),
      ...(hidden ? { hidden: true } : {}),
    },
  ];
}

/** Bounded snapshot history shared by pointer, keyboard, and host-driven label edits. */
export class MarkLabelHistory {
  #positions: readonly MarkLabelPositionSpec[] = [];
  #undo: (readonly MarkLabelPositionSpec[])[] = [];
  #redo: (readonly MarkLabelPositionSpec[])[] = [];
  #limit = 50;

  constructor(positions: readonly MarkLabelPositionSpec[] = [], limit = 50) {
    this.reset(positions, limit);
  }

  reset(positions: readonly MarkLabelPositionSpec[], limit = this.#limit): void {
    this.#positions = cloneMarkLabelPositions(positions);
    this.#undo = [];
    this.#redo = [];
    this.#limit = Math.max(1, Math.trunc(limit));
  }

  positions(): readonly MarkLabelPositionSpec[] {
    return cloneMarkLabelPositions(this.#positions);
  }

  replace(positions: readonly MarkLabelPositionSpec[]): boolean {
    const next = cloneMarkLabelPositions(positions);
    if (positionsKey(next) === positionsKey(this.#positions)) return false;
    this.#pushUndo(this.#positions);
    this.#positions = next;
    this.#redo = [];
    return true;
  }

  preview(positions: readonly MarkLabelPositionSpec[]): boolean {
    const next = cloneMarkLabelPositions(positions);
    if (positionsKey(next) === positionsKey(this.#positions)) return false;
    this.#positions = next;
    return true;
  }

  commit(previous: readonly MarkLabelPositionSpec[]): boolean {
    if (positionsKey(previous) === positionsKey(this.#positions)) return false;
    this.#pushUndo(previous);
    this.#redo = [];
    return true;
  }

  restore(positions: readonly MarkLabelPositionSpec[]): void {
    this.#positions = cloneMarkLabelPositions(positions);
  }

  undo(): boolean {
    const previous = this.#undo.pop();
    if (previous === undefined) return false;
    this.#redo.push(cloneMarkLabelPositions(this.#positions));
    this.#positions = cloneMarkLabelPositions(previous);
    return true;
  }

  redo(): boolean {
    const next = this.#redo.pop();
    if (next === undefined) return false;
    this.#pushUndo(this.#positions);
    this.#positions = cloneMarkLabelPositions(next);
    return true;
  }

  canUndo(): boolean {
    return this.#undo.length > 0;
  }

  canRedo(): boolean {
    return this.#redo.length > 0;
  }

  #pushUndo(positions: readonly MarkLabelPositionSpec[]): void {
    this.#undo.push(cloneMarkLabelPositions(positions));
    if (this.#undo.length > this.#limit) this.#undo.splice(0, this.#undo.length - this.#limit);
  }
}

export function hitTestMarkLabel(
  entries: readonly MarkLabelSceneEntry[],
  x: number,
  y: number,
  tolerance = 5,
  activeId?: string,
): MarkLabelSceneEntry | null {
  const hits = entries.filter(
    ({ bounds }) =>
      x >= bounds.x - tolerance &&
      x <= bounds.x + bounds.width + tolerance &&
      y >= bounds.y - tolerance &&
      y <= bounds.y + bounds.height + tolerance,
  );
  if (hits.length === 0) return null;
  return (
    hits.find(({ id }) => id === activeId) ??
    [...hits].sort(
      (left, right) =>
        left.bounds.width * left.bounds.height - right.bounds.width * right.bounds.height,
    )[0] ??
    null
  );
}

function shiftedBounds(entry: MarkLabelSceneEntry, offsetX: number, offsetY: number): Rect {
  return {
    ...entry.bounds,
    x: entry.bounds.x + offsetX - entry.offsetX,
    y: entry.bounds.y + offsetY - entry.offsetY,
  };
}

/** Apply deterministic grid, mark-anchor, and plot-edge snapping in scene pixels. */
export function snapMarkLabelOffset(options: {
  readonly entry: MarkLabelSceneEntry;
  readonly entries: readonly MarkLabelSceneEntry[];
  readonly plot: Rect;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly snap: false | NormalizedMarkLabelSnapSpec;
}): { readonly offsetX: number; readonly offsetY: number } {
  if (options.snap === false) return { offsetX: options.offsetX, offsetY: options.offsetY };
  const { entry, snap } = options;
  let offsetX = options.offsetX;
  let offsetY = options.offsetY;
  if (snap.grid !== false) {
    offsetX = Math.round(offsetX / snap.grid) * snap.grid;
    offsetY = Math.round(offsetY / snap.grid) * snap.grid;
  }
  if (snap.marks) {
    const center = { x: entry.baseCenter.x + offsetX, y: entry.baseCenter.y + offsetY };
    let bestX: { distance: number; value: number } | null = null;
    let bestY: { distance: number; value: number } | null = null;
    for (const candidate of options.entries) {
      if (candidate.id === entry.id) continue;
      const distanceX = Math.abs(candidate.anchor.x - center.x);
      const distanceY = Math.abs(candidate.anchor.y - center.y);
      if (distanceX <= snap.distance && (bestX === null || distanceX < bestX.distance)) {
        bestX = { distance: distanceX, value: candidate.anchor.x - entry.baseCenter.x };
      }
      if (distanceY <= snap.distance && (bestY === null || distanceY < bestY.distance)) {
        bestY = { distance: distanceY, value: candidate.anchor.y - entry.baseCenter.y };
      }
    }
    if (bestX !== null) offsetX = bestX.value;
    if (bestY !== null) offsetY = bestY.value;
  }
  if (snap.plot) {
    let bounds = shiftedBounds(entry, offsetX, offsetY);
    const leftGap = bounds.x - options.plot.x;
    const rightGap = options.plot.x + options.plot.width - (bounds.x + bounds.width);
    const topGap = bounds.y - options.plot.y;
    const bottomGap = options.plot.y + options.plot.height - (bounds.y + bounds.height);
    if (Math.abs(leftGap) <= snap.distance) offsetX -= leftGap;
    else if (Math.abs(rightGap) <= snap.distance) offsetX += rightGap;
    if (Math.abs(topGap) <= snap.distance) offsetY -= topGap;
    else if (Math.abs(bottomGap) <= snap.distance) offsetY += bottomGap;
    bounds = shiftedBounds(entry, offsetX, offsetY);
    if (bounds.x < options.plot.x) offsetX += options.plot.x - bounds.x;
    if (bounds.x + bounds.width > options.plot.x + options.plot.width) {
      offsetX -= bounds.x + bounds.width - (options.plot.x + options.plot.width);
    }
    if (bounds.y < options.plot.y) offsetY += options.plot.y - bounds.y;
    if (bounds.y + bounds.height > options.plot.y + options.plot.height) {
      offsetY -= bounds.y + bounds.height - (options.plot.y + options.plot.height);
    }
  }
  return { offsetX, offsetY };
}
