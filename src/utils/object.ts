import { GraflumeError } from '../core/errors.js';

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export function assertSafeKey(key: string, path = key): void {
  if (UNSAFE_KEYS.has(key)) {
    throw new GraflumeError('UNSAFE_KEY', `Unsafe key "${key}" is not allowed.`, { path });
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const output = { ...base } as Record<string, unknown>;

  for (const [key, overrideValue] of Object.entries(override)) {
    assertSafeKey(key);
    if (overrideValue === undefined) continue;

    const baseValue = output[key];
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      output[key] = deepMerge(baseValue, overrideValue);
    } else if (Array.isArray(overrideValue)) {
      output[key] = [...overrideValue];
    } else {
      output[key] = overrideValue;
    }
  }

  return output as T;
}

export function ownValue(record: Readonly<Record<string, unknown>>, key: string): unknown {
  assertSafeKey(key, `data.${key}`);
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function finiteNumber(value: unknown): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}
