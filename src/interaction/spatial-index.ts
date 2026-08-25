import type { Rect } from '../scene/types.js';

export interface SpatialIndexStats {
  readonly itemCount: number;
  readonly indexedItemCount: number;
  readonly overflowItemCount: number;
  readonly bucketCount: number;
  readonly cellSize: number;
}

interface IndexedItem<T> {
  readonly item: T;
  readonly bounds: Rect;
  readonly order: number;
}

/**
 * A deterministic bounded uniform-grid index for screen-space geometry.
 *
 * Very large geometry is kept in a small overflow list instead of being
 * duplicated into an unbounded number of cells. Query results retain source
 * order so z-order hit testing is stable across indexed and linear paths.
 */
export class UniformSpatialIndex<T> {
  readonly #cellSize: number;
  readonly #maximumCellsPerItem: number;
  readonly #buckets = new Map<string, IndexedItem<T>[]>();
  readonly #overflow: IndexedItem<T>[] = [];
  readonly #items: IndexedItem<T>[] = [];

  constructor(cellSize = 64, maximumCellsPerItem = 256) {
    this.#cellSize = Math.max(8, Math.trunc(cellSize));
    this.#maximumCellsPerItem = Math.max(1, Math.trunc(maximumCellsPerItem));
  }

  insert(item: T, bounds: Rect): void {
    if (
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.y) ||
      !Number.isFinite(bounds.width) ||
      !Number.isFinite(bounds.height)
    ) {
      return;
    }
    const normalized: Rect = {
      x: Math.min(bounds.x, bounds.x + bounds.width),
      y: Math.min(bounds.y, bounds.y + bounds.height),
      width: Math.abs(bounds.width),
      height: Math.abs(bounds.height),
    };
    const indexed: IndexedItem<T> = {
      item,
      bounds: normalized,
      order: this.#items.length,
    };
    this.#items.push(indexed);
    const columns = this.#cellRange(normalized.x, normalized.x + normalized.width);
    const rows = this.#cellRange(normalized.y, normalized.y + normalized.height);
    if (columns.length * rows.length > this.#maximumCellsPerItem) {
      this.#overflow.push(indexed);
      return;
    }
    for (const column of columns) {
      for (const row of rows) {
        const key = `${column}:${row}`;
        const bucket = this.#buckets.get(key);
        if (bucket === undefined) this.#buckets.set(key, [indexed]);
        else bucket.push(indexed);
      }
    }
  }

  query(x: number, y: number, tolerance = 0): readonly T[] {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(tolerance)) return [];
    const radius = Math.max(0, tolerance);
    const columns = this.#cellRange(x - radius, x + radius);
    const rows = this.#cellRange(y - radius, y + radius);
    const matches = new Map<number, IndexedItem<T>>();
    for (const column of columns) {
      for (const row of rows) {
        for (const indexed of this.#buckets.get(`${column}:${row}`) ?? []) {
          if (this.#intersectsQuery(indexed.bounds, x, y, radius)) {
            matches.set(indexed.order, indexed);
          }
        }
      }
    }
    for (const indexed of this.#overflow) {
      if (this.#intersectsQuery(indexed.bounds, x, y, radius)) {
        matches.set(indexed.order, indexed);
      }
    }
    return [...matches.values()]
      .sort((left, right) => left.order - right.order)
      .map(({ item }) => item);
  }

  stats(): SpatialIndexStats {
    return Object.freeze({
      itemCount: this.#items.length,
      indexedItemCount: this.#items.length - this.#overflow.length,
      overflowItemCount: this.#overflow.length,
      bucketCount: this.#buckets.size,
      cellSize: this.#cellSize,
    });
  }

  #cellRange(start: number, end: number): readonly number[] {
    const first = Math.floor(Math.min(start, end) / this.#cellSize);
    const last = Math.floor(Math.max(start, end) / this.#cellSize);
    return Array.from({ length: Math.max(1, last - first + 1) }, (_, index) => first + index);
  }

  #intersectsQuery(bounds: Rect, x: number, y: number, tolerance: number): boolean {
    return (
      x + tolerance >= bounds.x &&
      x - tolerance <= bounds.x + bounds.width &&
      y + tolerance >= bounds.y &&
      y - tolerance <= bounds.y + bounds.height
    );
  }
}
