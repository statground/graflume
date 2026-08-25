import { GraflumeError } from '../core/errors.js';

const absoluteMaximumCapacity = 1_000_000;

function checkedCapacity(capacity: number): number {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > absoluteMaximumCapacity) {
    throw new GraflumeError(
      'INVALID_DATA',
      `Ring-buffer capacity must be an integer from 1 to ${absoluteMaximumCapacity}.`,
      { path: '$.streaming.retention.maxRows' },
    );
  }
  return capacity;
}

/**
 * A fixed-capacity, allocation-stable ring used by streaming data paths.
 *
 * The container never grows beyond `capacity`. `push()` returns the evicted
 * value so callers can keep stable-key and transform caches synchronized.
 */
export class BoundedRingBuffer<T> {
  readonly #capacity: number;
  readonly #slots: (T | undefined)[];
  #start = 0;
  #length = 0;

  constructor(capacity: number, initial: readonly T[] = []) {
    this.#capacity = checkedCapacity(capacity);
    this.#slots = Array<T | undefined>(this.#capacity);
    const retained = initial.slice(-this.#capacity);
    for (const value of retained) this.push(value);
  }

  get capacity(): number {
    return this.#capacity;
  }

  get length(): number {
    return this.#length;
  }

  at(index: number): T | undefined {
    const resolved = index < 0 ? this.#length + index : index;
    if (!Number.isInteger(resolved) || resolved < 0 || resolved >= this.#length) return undefined;
    return this.#slots[(this.#start + resolved) % this.#capacity];
  }

  set(index: number, value: T): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.#length) {
      throw new GraflumeError('INVALID_DATA', 'Ring-buffer index is outside retained rows.');
    }
    this.#slots[(this.#start + index) % this.#capacity] = value;
  }

  push(value: T): T | undefined {
    if (this.#length < this.#capacity) {
      const slot = (this.#start + this.#length) % this.#capacity;
      this.#slots[slot] = value;
      this.#length += 1;
      return undefined;
    }
    const evicted = this.#slots[this.#start];
    this.#slots[this.#start] = value;
    this.#start = (this.#start + 1) % this.#capacity;
    return evicted;
  }

  pushMany(values: readonly T[]): readonly T[] {
    const evicted: T[] = [];
    for (const value of values) {
      const removed = this.push(value);
      if (removed !== undefined) evicted.push(removed);
    }
    return evicted;
  }

  shift(): T | undefined {
    if (this.#length === 0) return undefined;
    const value = this.#slots[this.#start];
    this.#slots[this.#start] = undefined;
    this.#start = (this.#start + 1) % this.#capacity;
    this.#length -= 1;
    if (this.#length === 0) this.#start = 0;
    return value;
  }

  clear(): void {
    this.#slots.fill(undefined);
    this.#start = 0;
    this.#length = 0;
  }

  replace(values: readonly T[]): void {
    this.clear();
    this.pushMany(values);
  }

  retain(predicate: (value: T, index: number) => boolean): readonly T[] {
    const retained: T[] = [];
    const removed: T[] = [];
    this.values().forEach((value, index) => {
      (predicate(value, index) ? retained : removed).push(value);
    });
    this.clear();
    this.pushMany(retained);
    return removed;
  }

  values(): T[] {
    return Array.from({ length: this.#length }, (_, index) => this.at(index)!);
  }

  clone(): BoundedRingBuffer<T> {
    return new BoundedRingBuffer(this.#capacity, this.values());
  }
}

export function createBoundedRingBuffer<T>(
  capacity: number,
  initial: readonly T[] = [],
): BoundedRingBuffer<T> {
  return new BoundedRingBuffer(capacity, initial);
}
