import { clamp } from '../utils/object.js';
import type { Scale, Tick } from './types.js';

export class BandScale implements Scale {
  readonly kind = 'band' as const;
  readonly #domain: readonly string[];
  readonly #positions = new Map<string, number>();
  readonly bandwidth: number;

  constructor(options: {
    domain: readonly string[];
    range: readonly [number, number];
    paddingInner?: number;
    paddingOuter?: number;
  }) {
    this.#domain = [...options.domain];
    const paddingInner = clamp(options.paddingInner ?? 0.1, 0, 1);
    const paddingOuter = Math.max(0, options.paddingOuter ?? 0.05);
    const [start, end] = options.range;
    const direction = end >= start ? 1 : -1;
    const span = Math.abs(end - start);
    const denominator = Math.max(1, this.#domain.length - paddingInner + paddingOuter * 2);
    const step = span / denominator;
    this.bandwidth = step * (1 - paddingInner);

    this.#domain.forEach((value, index) => {
      const position = start + direction * step * (paddingOuter + index);
      this.#positions.set(value, position);
    });
  }

  domain(): readonly string[] {
    return this.#domain;
  }

  map(input: number | string | Date): number {
    const value = input instanceof Date ? input.toISOString() : String(input);
    const position = this.#positions.get(value);
    return position === undefined ? Number.NaN : position + this.bandwidth / 2;
  }

  start(input: number | string | Date): number {
    return this.map(input) - this.bandwidth / 2;
  }

  ticks(count: number): readonly Tick[] {
    const step = Math.max(1, Math.ceil(this.#domain.length / Math.max(1, count)));
    const ticks: Tick[] = [];
    for (let index = 0; index < this.#domain.length; index += step) {
      const value = this.#domain[index];
      if (value === undefined) continue;
      ticks.push({ value, label: value, position: this.map(value) });
    }
    const last = this.#domain.at(-1);
    if (last !== undefined && ticks.at(-1)?.value !== last) {
      ticks.push({ value: last, label: last, position: this.map(last) });
    }
    return ticks;
  }
}
