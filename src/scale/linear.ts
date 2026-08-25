import { clamp as clampNumber } from '../utils/object.js';
import { GraflumeError } from '../core/errors.js';
import type { PositionScaleDescriptor, Scale, ScaleOutOfBounds, Tick } from './types.js';

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
  readonly kind: 'linear' | 'time' | 'utc';
  readonly bandwidth = 0;
  readonly descriptor: PositionScaleDescriptor;
  readonly #domain: readonly [number, number];
  readonly #range: readonly [number, number];
  readonly #outOfBounds: ScaleOutOfBounds;

  constructor(options: {
    domain: readonly [number, number];
    range: readonly [number, number];
    kind?: 'linear' | 'time' | 'utc';
    clamp?: boolean;
    nice?: boolean;
    outOfBounds?: ScaleOutOfBounds;
    reverse?: boolean;
  }) {
    this.kind = options.kind ?? 'linear';
    this.#domain = Object.freeze([
      ...(options.nice === false ? options.domain : niceDomain(options.domain)),
    ]) as unknown as readonly [number, number];
    this.#range = Object.freeze(
      options.reverse === true ? [options.range[1], options.range[0]] : [...options.range],
    ) as unknown as readonly [number, number];
    this.#outOfBounds = options.outOfBounds ?? (options.clamp === true ? 'clamp' : 'extrapolate');
    this.descriptor = Object.freeze({
      type: this.kind,
      domain: this.#domain,
      range: this.#range,
      reverse: options.reverse ?? false,
      rangeDirection: this.#range[1] < this.#range[0] ? 'descending' : 'ascending',
      outOfBounds: this.#outOfBounds,
    });
  }

  domain(): readonly [number, number] {
    return this.#domain;
  }

  range(): readonly [number, number] {
    return this.#range;
  }

  #ratio(value: number, start: number, end: number): number {
    const denominator = end - start;
    let ratio = denominator === 0 ? 0.5 : (value - start) / denominator;
    if (ratio < 0 || ratio > 1) {
      if (this.#outOfBounds === 'unknown') return Number.NaN;
      if (this.#outOfBounds === 'error') {
        throw new GraflumeError('INVALID_DATA', 'Scale input is outside the domain.', {
          path: '$.data',
        });
      }
      if (this.#outOfBounds === 'clamp') ratio = clampNumber(ratio, 0, 1);
    }
    return ratio;
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
    const ratio = this.#ratio(value, domainStart, domainEnd);
    return rangeStart + ratio * (rangeEnd - rangeStart);
  }

  readonly invert = (position: number): number => {
    const [domainStart, domainEnd] = this.#domain;
    const [rangeStart, rangeEnd] = this.#range;
    const ratio = this.#ratio(position, rangeStart, rangeEnd);
    return domainStart + ratio * (domainEnd - domainStart);
  };

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
    if (this.kind === 'time' || this.kind === 'utc') {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(this.kind === 'utc' ? { timeZone: 'UTC' } : {}),
      }).format(new Date(value));
    }
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
  }
}
