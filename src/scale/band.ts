import { clamp } from '../utils/object.js';
import { GraflumeError } from '../core/errors.js';
import type { PositionScaleDescriptor, Scale, ScaleOutOfBounds, Tick } from './types.js';

export class BandScale implements Scale {
  readonly kind = 'band' as const;
  readonly descriptor: PositionScaleDescriptor;
  readonly #domain: readonly string[];
  readonly #range: readonly [number, number];
  readonly #positions = new Map<string, number>();
  readonly #outOfBounds: ScaleOutOfBounds;
  readonly step: number;
  readonly bandwidth: number;

  constructor(options: {
    domain: readonly string[];
    range: readonly [number, number];
    paddingInner?: number;
    paddingOuter?: number;
    outOfBounds?: ScaleOutOfBounds;
    reverse?: boolean;
  }) {
    this.#domain = Object.freeze([...options.domain]);
    this.#range = Object.freeze(
      options.reverse === true ? [options.range[1], options.range[0]] : [...options.range],
    ) as unknown as readonly [number, number];
    this.#outOfBounds = options.outOfBounds ?? 'unknown';
    const paddingInner = clamp(options.paddingInner ?? 0.1, 0, 1);
    const paddingOuter = Math.max(0, options.paddingOuter ?? 0.05);
    const [start, end] = this.#range;
    const direction = end >= start ? 1 : -1;
    const span = Math.abs(end - start);
    const denominator = Math.max(1, this.#domain.length - paddingInner + paddingOuter * 2);
    const step = span / denominator;
    this.step = step;
    this.bandwidth = step * (1 - paddingInner);

    this.#domain.forEach((value, index) => {
      const position = start + direction * step * (paddingOuter + index);
      this.#positions.set(value, position);
    });
    this.descriptor = Object.freeze({
      type: this.kind,
      domain: this.#domain,
      range: this.#range,
      reverse: options.reverse ?? false,
      rangeDirection: end < start ? 'descending' : 'ascending',
      outOfBounds: this.#outOfBounds,
    });
  }

  domain(): readonly string[] {
    return this.#domain;
  }

  range(): readonly [number, number] {
    return this.#range;
  }

  map(input: number | string | Date): number {
    const value = input instanceof Date ? input.toISOString() : String(input);
    const position = this.#positions.get(value);
    if (position !== undefined) return position + this.bandwidth / 2;
    if (this.#outOfBounds === 'error') {
      throw new GraflumeError('INVALID_DATA', `Unknown band value: ${value}`, {
        path: '$.data',
      });
    }
    return Number.NaN;
  }

  start(input: number | string | Date): number {
    return this.map(input) - this.bandwidth / 2;
  }

  ticks(count: number): readonly Tick[] {
    const domain = this.#range[1] < this.#range[0] ? [...this.#domain].reverse() : this.#domain;
    const step = Math.max(1, Math.ceil(domain.length / Math.max(1, count)));
    const ticks: Tick[] = [];
    for (let index = 0; index < domain.length; index += step) {
      const value = domain[index];
      if (value === undefined) continue;
      ticks.push({ value, label: value, position: this.map(value) });
    }
    const last = domain.at(-1);
    if (last !== undefined && ticks.at(-1)?.value !== last) {
      ticks.push({ value: last, label: last, position: this.map(last) });
    }
    return ticks;
  }
}
