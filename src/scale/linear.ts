import { clamp as clampNumber } from '../utils/object.js';
import type { Scale, Tick } from './types.js';

function tickStep(start: number, stop: number, count: number): number {
  const span = Math.abs(stop - start);
  if (span === 0 || count <= 0) return 0;
  const raw = span / count;
  const power = Math.floor(Math.log10(raw));
  const magnitude = 10 ** power;
  const error = raw / magnitude;
  const factor =
    error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
  return factor * magnitude;
}

export function niceDomain(
  domain: readonly [number, number],
  count = 5,
): readonly [number, number] {
  let [start, stop] = domain;
  if (start === stop) {
    const delta = start === 0 ? 1 : Math.abs(start) * 0.05;
    return [start - delta, stop + delta];
  }
  const step = tickStep(start, stop, count);
  if (step === 0) return domain;
  const reverse = stop < start;
  if (reverse) [start, stop] = [stop, start];
  const niceStart = Math.floor(start / step) * step;
  const niceStop = Math.ceil(stop / step) * step;
  return reverse ? [niceStop, niceStart] : [niceStart, niceStop];
}

export class LinearScale implements Scale {
  readonly kind: 'linear' | 'time';
  readonly bandwidth = 0;
  readonly #domain: readonly [number, number];
  readonly #range: readonly [number, number];
  readonly #clamp: boolean;

  constructor(options: {
    domain: readonly [number, number];
    range: readonly [number, number];
    kind?: 'linear' | 'time';
    clamp?: boolean;
    nice?: boolean;
  }) {
    this.kind = options.kind ?? 'linear';
    this.#domain = options.nice === false ? options.domain : niceDomain(options.domain);
    this.#range = options.range;
    this.#clamp = options.clamp ?? false;
  }

  domain(): readonly [number, number] {
    return this.#domain;
  }

  map(input: number | string | Date): number {
    const value =
      input instanceof Date
        ? input.getTime()
        : typeof input === 'string'
          ? Date.parse(input)
          : input;
    if (!Number.isFinite(value)) return Number.NaN;
    const [domainStart, domainEnd] = this.#domain;
    const [rangeStart, rangeEnd] = this.#range;
    const denominator = domainEnd - domainStart;
    const ratio = denominator === 0 ? 0.5 : (value - domainStart) / denominator;
    const normalized = this.#clamp ? clampNumber(ratio, 0, 1) : ratio;
    return rangeStart + normalized * (rangeEnd - rangeStart);
  }

  invert(position: number): number {
    const [domainStart, domainEnd] = this.#domain;
    const [rangeStart, rangeEnd] = this.#range;
    const denominator = rangeEnd - rangeStart;
    const ratio = denominator === 0 ? 0.5 : (position - rangeStart) / denominator;
    const normalized = this.#clamp ? clampNumber(ratio, 0, 1) : ratio;
    return domainStart + normalized * (domainEnd - domainStart);
  }

  ticks(count: number, locale?: string): readonly Tick[] {
    const [start, stop] = this.#domain;
    const step = tickStep(start, stop, Math.max(1, count));
    if (step === 0) {
      const position = this.map(start);
      return [{ value: start, label: this.#format(start, locale), position }];
    }

    const first = Math.ceil(Math.min(start, stop) / step) * step;
    const last = Math.floor(Math.max(start, stop) / step) * step;
    const values: number[] = [];
    for (let value = first; value <= last + step / 2; value += step) values.push(value);
    if (stop < start) values.reverse();
    return values.map((value) => ({
      value,
      label: this.#format(value, locale),
      position: this.map(value),
    }));
  }

  #format(value: number, locale?: string): string {
    if (this.kind === 'time') {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(value));
    }
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
  }
}
