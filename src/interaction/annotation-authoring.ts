import type { Rect } from '../scene/types.js';
import type { AnnotationSpec } from '../spec/types.js';

export type AnnotationResizeHandle =
  | 'move'
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west';

export interface AnnotationAuthoringHandle {
  readonly id: AnnotationResizeHandle;
  readonly x: number;
  readonly y: number;
  readonly cursor: string;
}

function cloneAnnotation(annotation: AnnotationSpec): AnnotationSpec {
  return {
    ...annotation,
    target: { ...annotation.target },
    ...(typeof annotation.connector === 'object'
      ? { connector: { ...annotation.connector, dash: [...(annotation.connector.dash ?? [])] } }
      : {}),
    ...(annotation.style === undefined ? {} : { style: { ...annotation.style } }),
  };
}

function snapshotKey(annotations: readonly AnnotationSpec[]): string {
  return JSON.stringify(annotations);
}

export class AnnotationAuthoringHistory {
  #annotations: readonly AnnotationSpec[];
  #undo: (readonly AnnotationSpec[])[] = [];
  #redo: (readonly AnnotationSpec[])[] = [];
  readonly #limit: number;

  constructor(annotations: readonly AnnotationSpec[] = [], limit = 50) {
    this.#annotations = annotations.map(cloneAnnotation);
    this.#limit = Math.max(1, Math.trunc(limit));
  }

  reset(annotations: readonly AnnotationSpec[]): void {
    this.#annotations = annotations.map(cloneAnnotation);
    this.#undo = [];
    this.#redo = [];
  }

  annotations(): readonly AnnotationSpec[] {
    return this.#annotations.map(cloneAnnotation);
  }

  replace(annotations: readonly AnnotationSpec[]): boolean {
    const next = annotations.map(cloneAnnotation);
    if (snapshotKey(next) === snapshotKey(this.#annotations)) return false;
    this.#undo.push(this.annotations());
    if (this.#undo.length > this.#limit) this.#undo.splice(0, this.#undo.length - this.#limit);
    this.#annotations = next;
    this.#redo = [];
    return true;
  }

  preview(annotations: readonly AnnotationSpec[]): boolean {
    const next = annotations.map(cloneAnnotation);
    if (snapshotKey(next) === snapshotKey(this.#annotations)) return false;
    this.#annotations = next;
    return true;
  }

  commit(previous: readonly AnnotationSpec[]): boolean {
    if (snapshotKey(previous) === snapshotKey(this.#annotations)) return false;
    this.#undo.push(previous.map(cloneAnnotation));
    if (this.#undo.length > this.#limit) this.#undo.splice(0, this.#undo.length - this.#limit);
    this.#redo = [];
    return true;
  }

  restore(annotations: readonly AnnotationSpec[]): void {
    this.#annotations = annotations.map(cloneAnnotation);
  }

  update(id: string, patch: Partial<Omit<AnnotationSpec, 'id'>>): boolean {
    const index = this.#annotations.findIndex((annotation) => annotation.id === id);
    if (index < 0) return false;
    return this.replace(
      this.#annotations.map((annotation, candidate) =>
        candidate === index
          ? cloneAnnotation({ ...annotation, ...patch, id } as AnnotationSpec)
          : annotation,
      ),
    );
  }

  undo(): boolean {
    const previous = this.#undo.pop();
    if (previous === undefined) return false;
    this.#redo.push(this.annotations());
    this.#annotations = previous.map(cloneAnnotation);
    return true;
  }

  redo(): boolean {
    const next = this.#redo.pop();
    if (next === undefined) return false;
    this.#undo.push(this.annotations());
    this.#annotations = next.map(cloneAnnotation);
    return true;
  }

  canUndo(): boolean {
    return this.#undo.length > 0;
  }

  canRedo(): boolean {
    return this.#redo.length > 0;
  }
}

/** Nine pointer targets: the callout body plus eight deterministic resize handles. */
export function annotationAuthoringHandles(bounds: Rect): readonly AnnotationAuthoringHandle[] {
  const left = bounds.x;
  const centerX = bounds.x + bounds.width / 2;
  const right = bounds.x + bounds.width;
  const top = bounds.y;
  const centerY = bounds.y + bounds.height / 2;
  const bottom = bounds.y + bounds.height;
  return Object.freeze([
    { id: 'move', x: centerX, y: centerY, cursor: 'move' },
    { id: 'north', x: centerX, y: top, cursor: 'ns-resize' },
    { id: 'north-east', x: right, y: top, cursor: 'nesw-resize' },
    { id: 'east', x: right, y: centerY, cursor: 'ew-resize' },
    { id: 'south-east', x: right, y: bottom, cursor: 'nwse-resize' },
    { id: 'south', x: centerX, y: bottom, cursor: 'ns-resize' },
    { id: 'south-west', x: left, y: bottom, cursor: 'nesw-resize' },
    { id: 'west', x: left, y: centerY, cursor: 'ew-resize' },
    { id: 'north-west', x: left, y: top, cursor: 'nwse-resize' },
  ]);
}

export function hitTestAnnotationHandle(
  bounds: Rect,
  x: number,
  y: number,
  tolerance = 8,
): AnnotationResizeHandle | null {
  const handles = annotationAuthoringHandles(bounds);
  const resize = handles
    .slice(1)
    .find((handle) => Math.hypot(handle.x - x, handle.y - y) <= tolerance);
  if (resize !== undefined) return resize.id;
  return x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
    ? 'move'
    : null;
}

function snapped(value: number, grid: number | false): number {
  return grid === false ? value : Math.round(value / grid) * grid;
}

/** Applies a pointer drag/resize as portable annotation offsets and maxWidth. */
export function editAnnotationByPointer(options: {
  readonly annotation: AnnotationSpec;
  readonly handle: AnnotationResizeHandle;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly bounds: Rect;
  readonly grid?: number | false;
  readonly minimumWidth?: number;
}): AnnotationSpec {
  const grid = options.grid ?? false;
  const minimumWidth = Math.max(24, options.minimumWidth ?? 48);
  if (options.handle === 'move') {
    return cloneAnnotation({
      ...options.annotation,
      offsetX: snapped((options.annotation.offsetX ?? 0) + options.deltaX, grid),
      offsetY: snapped((options.annotation.offsetY ?? 0) + options.deltaY, grid),
    });
  }
  const west = options.handle.includes('west');
  const east = options.handle.includes('east');
  const north = options.handle.includes('north');
  const south = options.handle.includes('south');
  const widthDelta = east ? options.deltaX : west ? -options.deltaX : 0;
  const nextWidth = snapped(
    Math.max(
      minimumWidth,
      (options.annotation.style?.maxWidth ?? options.bounds.width) + widthDelta,
    ),
    grid,
  );
  return cloneAnnotation({
    ...options.annotation,
    offsetX:
      (options.annotation.offsetX ?? 0) +
      (west ? options.deltaX / 2 : east ? options.deltaX / 2 : 0),
    offsetY:
      (options.annotation.offsetY ?? 0) + (north ? options.deltaY : south ? options.deltaY : 0),
    style: { ...options.annotation.style, maxWidth: Math.max(minimumWidth, nextWidth) },
  });
}

/** Arrow-key authoring mirrors pointer move; Alt+horizontal arrows resize the label. */
export function editAnnotationByKeyboard(options: {
  readonly annotation: AnnotationSpec;
  readonly key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
  readonly step?: number;
  readonly coarse?: boolean;
  readonly resize?: boolean;
  readonly minimumWidth?: number;
}): AnnotationSpec {
  const step = Math.max(0.1, options.step ?? 1) * (options.coarse === true ? 10 : 1);
  const horizontal = options.key === 'ArrowLeft' ? -step : options.key === 'ArrowRight' ? step : 0;
  const vertical = options.key === 'ArrowUp' ? -step : options.key === 'ArrowDown' ? step : 0;
  if (options.resize === true && horizontal !== 0) {
    const minimumWidth = Math.max(24, options.minimumWidth ?? 48);
    return cloneAnnotation({
      ...options.annotation,
      style: {
        ...options.annotation.style,
        maxWidth: Math.max(minimumWidth, (options.annotation.style?.maxWidth ?? 220) + horizontal),
      },
    });
  }
  return cloneAnnotation({
    ...options.annotation,
    offsetX: (options.annotation.offsetX ?? 0) + horizontal,
    offsetY: (options.annotation.offsetY ?? 0) + vertical,
  });
}
