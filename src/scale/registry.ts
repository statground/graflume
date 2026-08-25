import { GraflumeError } from '../core/errors.js';
import type { ScaleSpec } from '../spec/types.js';
import { mixColor } from '../theme/color.js';
import { clamp as clampNumber } from '../utils/object.js';
import { BandScale } from './band.js';
import { LinearScale } from './linear.js';
import type {
  ColorScale,
  ColorScaleDescriptor,
  ColorScaleType,
  PositionScaleDescriptor,
  PositionScaleType,
  Scale,
  ScaleOutOfBounds,
  Tick,
} from './types.js';

type NumericPair = readonly [number, number];

function ordinalKey(value: number | string): string {
  return `${typeof value}:${String(value)}`;
}

function frozen<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}

function fail(message: string, path = '$.scale'): never {
  throw new GraflumeError('INCOMPATIBLE_SCALE', message, { path });
}

function numericDomain(values: readonly (number | string)[], length = 2): readonly number[] {
  if (
    values.length !== length ||
    values.some((value) => typeof value !== 'number' || !Number.isFinite(value))
  ) {
    fail(`Scale domain must contain exactly ${length} finite numbers.`);
  }
  return values as readonly number[];
}

function numericRange(values: readonly (number | string)[], minimum = 2): readonly number[] {
  if (
    values.length < minimum ||
    values.some((value) => typeof value !== 'number' || !Number.isFinite(value))
  ) {
    fail(`Position scale range must contain at least ${minimum} finite numbers.`, '$.scale.range');
  }
  return values as readonly number[];
}

function numericRangePair(values: readonly (number | string)[]): NumericPair {
  const range = numericRange(values, 2);
  if (range.length !== 2) {
    fail(
      'Continuous, band, and point position ranges must contain exactly 2 numbers.',
      '$.scale.range',
    );
  }
  return range as NumericPair;
}

function resolvedPolicy(spec: ScaleSpec, fallback: ScaleOutOfBounds): ScaleOutOfBounds {
  return spec.outOfBounds ?? (spec.clamp === true ? 'clamp' : fallback);
}

function normalizeRatio(
  value: number,
  domain: NumericPair,
  policy: ScaleOutOfBounds,
  path: string,
): number {
  const denominator = domain[1] - domain[0];
  let ratio = denominator === 0 ? 0.5 : (value - domain[0]) / denominator;
  if (ratio >= 0 && ratio <= 1) return ratio;
  if (policy === 'clamp') return clampNumber(ratio, 0, 1);
  if (policy === 'unknown') return Number.NaN;
  if (policy === 'error') {
    throw new GraflumeError('INVALID_DATA', `Scale input ${value} is outside the domain.`, {
      path,
    });
  }
  return ratio;
}

function interpolateRange(range: readonly number[], ratio: number): number {
  if (!Number.isFinite(ratio)) return Number.NaN;
  const scaled = ratio * (range.length - 1);
  const index = Math.max(0, Math.min(range.length - 2, Math.floor(scaled)));
  const start = range[index] ?? Number.NaN;
  const end = range[index + 1] ?? start;
  return start + (end - start) * (scaled - index);
}

function inverseNormal(probability: number): number {
  // Acklam's rational approximation; absolute error is below 1.2e-9 over (0, 1).
  const a = [
    -39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472,
    2.50662827745924,
  ];
  const b = [
    -54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857,
  ];
  const c = [
    -0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373,
    4.37466414146497, 2.93816398269878,
  ];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const low = 0.02425;
  const high = 1 - low;
  if (probability < low) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  if (probability > high) {
    const q = Math.sqrt(-2 * Math.log(1 - probability));
    return (
      -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  const q = probability - 0.5;
  const r = q * q;
  return (
    ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  );
}

function normalCdf(value: number): number {
  // Abramowitz-Stegun 7.1.26, sufficient for stable interactive inversion.
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

interface TransformPair {
  readonly forward: (value: number) => number;
  readonly inverse: (value: number) => number;
  readonly validate: (domain: NumericPair) => void;
}

function transformFor(type: PositionScaleType, spec: ScaleSpec): TransformPair {
  const identity = (value: number): number => value;
  if (type === 'log') {
    const base = spec.base ?? 10;
    if (!(base > 0) || base === 1)
      fail('Log scale base must be positive and not equal to 1.', '$.scale.base');
    return {
      forward: (value) => Math.log(value) / Math.log(base),
      inverse: (value) => base ** value,
      validate: ([start, end]) => {
        if (!(start > 0 && end > 0))
          fail('Log scale domain values must be greater than 0.', '$.scale.domain');
      },
    };
  }
  if (type === 'symlog') {
    const constant = spec.constant ?? 1;
    if (!(constant > 0)) fail('Symlog constant must be greater than 0.', '$.scale.constant');
    return {
      forward: (value) => Math.sign(value) * Math.log1p(Math.abs(value) / constant),
      inverse: (value) => Math.sign(value) * Math.expm1(Math.abs(value)) * constant,
      validate: () => undefined,
    };
  }
  if (type === 'asinh') {
    const constant = spec.constant ?? 1;
    if (!(constant > 0)) fail('Asinh constant must be greater than 0.', '$.scale.constant');
    return {
      forward: (value) => Math.asinh(value / constant),
      inverse: (value) => Math.sinh(value) * constant,
      validate: () => undefined,
    };
  }
  if (type === 'pow' || type === 'sqrt') {
    const exponent = type === 'sqrt' ? 0.5 : (spec.exponent ?? 1);
    if (!(exponent > 0)) fail('Power scale exponent must be greater than 0.', '$.scale.exponent');
    return {
      forward: (value) => Math.sign(value) * Math.abs(value) ** exponent,
      inverse: (value) => Math.sign(value) * Math.abs(value) ** (1 / exponent),
      validate: () => undefined,
    };
  }
  if (type === 'logit') {
    return {
      forward: (value) => Math.log(value / (1 - value)),
      inverse: (value) => 1 / (1 + Math.exp(-value)),
      validate: ([start, end]) => {
        if (!(start > 0 && start < 1 && end > 0 && end < 1))
          fail('Logit scale domain values must be strictly between 0 and 1.', '$.scale.domain');
      },
    };
  }
  if (type === 'probit') {
    return {
      forward: inverseNormal,
      inverse: normalCdf,
      validate: ([start, end]) => {
        if (!(start > 0 && start < 1 && end > 0 && end < 1))
          fail('Probit scale domain values must be strictly between 0 and 1.', '$.scale.domain');
      },
    };
  }
  return {
    forward: identity,
    inverse: identity,
    validate: ([start, end]) => {
      if (type === 'probability' && !(start >= 0 && start <= 1 && end >= 0 && end <= 1)) {
        fail('Probability scale domain values must be between 0 and 1.', '$.scale.domain');
      }
    },
  };
}

class ContinuousScale implements Scale {
  readonly bandwidth = 0;
  readonly descriptor: PositionScaleDescriptor;
  readonly #domain: NumericPair;
  readonly #range: readonly number[];
  readonly #policy: ScaleOutOfBounds;
  readonly #transform: TransformPair;

  constructor(
    type: PositionScaleType,
    spec: ScaleSpec,
    domain: NumericPair,
    range: readonly number[],
  ) {
    this.kind = type;
    this.#domain = frozen(domain) as NumericPair;
    this.#range = frozen(spec.reverse === true ? [...range].reverse() : range);
    this.#policy = resolvedPolicy(spec, 'extrapolate');
    this.#transform = transformFor(type, spec);
    this.#transform.validate(this.#domain);
    if (this.#domain[0] === this.#domain[1])
      fail('Continuous scale domain endpoints must differ.', '$.scale.domain');
    this.descriptor = Object.freeze({
      type,
      domain: this.#domain,
      range: this.#range,
      reverse: spec.reverse === true,
      rangeDirection: this.#range.at(-1)! < this.#range[0]! ? 'descending' : 'ascending',
      outOfBounds: this.#policy,
    });
  }

  readonly kind: PositionScaleType;
  domain(): NumericPair {
    return this.#domain;
  }
  range(): readonly number[] {
    return this.#range;
  }

  map(input: number | string | Date): number {
    const value =
      input instanceof Date
        ? input.getTime()
        : typeof input === 'string'
          ? Date.parse(input)
          : input;
    if (!Number.isFinite(value)) return Number.NaN;
    const outsideMathematicalDomain =
      (this.kind === 'log' && value <= 0) ||
      (this.kind === 'probability' && !(value >= 0 && value <= 1)) ||
      ((this.kind === 'logit' || this.kind === 'probit') && !(value > 0 && value < 1));
    let supportedValue = value;
    if (outsideMathematicalDomain) {
      if (this.#policy === 'unknown') return Number.NaN;
      if (this.#policy === 'clamp') {
        const minimum = Math.min(this.#domain[0], this.#domain[1]);
        const maximum = Math.max(this.#domain[0], this.#domain[1]);
        supportedValue = clampNumber(value, minimum, maximum);
      } else {
        throw new GraflumeError(
          'INVALID_DATA',
          `Value ${value} is outside the mathematical domain of ${this.kind}; it cannot be extrapolated.`,
          { path: '$.data' },
        );
      }
    }
    const transformedDomain: NumericPair = [
      this.#transform.forward(this.#domain[0]),
      this.#transform.forward(this.#domain[1]),
    ];
    const ratio = normalizeRatio(
      this.#transform.forward(supportedValue),
      transformedDomain,
      this.#policy,
      '$.data',
    );
    return interpolateRange(this.#range, ratio);
  }

  readonly invert = (position: number): number => {
    const rangePair: NumericPair = [this.#range[0]!, this.#range.at(-1)!];
    const ratio = normalizeRatio(position, rangePair, this.#policy, '$.position');
    if (!Number.isFinite(ratio)) return Number.NaN;
    const start = this.#transform.forward(this.#domain[0]);
    const end = this.#transform.forward(this.#domain[1]);
    return this.#transform.inverse(start + (end - start) * ratio);
  };

  ticks(count: number, locale?: string): readonly Tick[] {
    const size = Math.max(1, Math.floor(count));
    const start = this.#transform.forward(this.#domain[0]);
    const end = this.#transform.forward(this.#domain[1]);
    return Array.from({ length: size + 1 }, (_, index) => {
      const value = this.#transform.inverse(start + ((end - start) * index) / size);
      const label =
        this.kind === 'time' || this.kind === 'utc'
          ? new Intl.DateTimeFormat(locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: this.kind === 'utc' ? 'UTC' : undefined,
            }).format(new Date(value))
          : new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
      return { value, label, position: this.map(value) };
    });
  }
}

class PointScale implements Scale {
  readonly kind = 'point' as const;
  readonly bandwidth = 0;
  readonly descriptor: PositionScaleDescriptor;
  readonly #domain: readonly string[];
  readonly #range: NumericPair;
  readonly #positions = new Map<string, number>();
  readonly #policy: ScaleOutOfBounds;

  constructor(spec: ScaleSpec, domain: readonly string[], range: NumericPair) {
    this.#domain = frozen(domain);
    this.#range = frozen(spec.reverse === true ? [range[1], range[0]] : range) as NumericPair;
    this.#policy = resolvedPolicy(spec, 'unknown');
    if (this.#policy === 'clamp' || this.#policy === 'extrapolate') {
      fail(
        'Point scales support only error or unknown for unseen categories.',
        '$.scale.outOfBounds',
      );
    }
    const padding = Math.max(0, spec.paddingOuter ?? 0.5);
    const denominator = Math.max(1, this.#domain.length - 1 + padding * 2);
    this.#domain.forEach((value, index) =>
      this.#positions.set(
        value,
        this.#range[0] + ((this.#range[1] - this.#range[0]) * (index + padding)) / denominator,
      ),
    );
    this.descriptor = Object.freeze({
      type: this.kind,
      domain: this.#domain,
      range: this.#range,
      reverse: spec.reverse === true,
      rangeDirection: this.#range[1] < this.#range[0] ? 'descending' : 'ascending',
      outOfBounds: this.#policy,
    });
  }
  domain(): readonly string[] {
    return this.#domain;
  }
  range(): NumericPair {
    return this.#range;
  }
  map(input: number | string | Date): number {
    const value = input instanceof Date ? input.toISOString() : String(input);
    const mapped = this.#positions.get(value);
    if (mapped !== undefined) return mapped;
    if (this.#policy === 'error')
      throw new GraflumeError('INVALID_DATA', `Unknown point scale value: ${value}`, {
        path: '$.data',
      });
    return Number.NaN;
  }
  ticks(count: number): readonly Tick[] {
    const domain = this.#range[1] < this.#range[0] ? [...this.#domain].reverse() : this.#domain;
    const step = Math.max(1, Math.ceil(domain.length / Math.max(1, count)));
    return domain
      .filter((_value, index) => index % step === 0)
      .map((value) => ({ value, label: value, position: this.map(value) }));
  }
}

function quantile(sorted: readonly number[], probability: number): number {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const start = sorted[lower] ?? sorted[0] ?? Number.NaN;
  const end = sorted[upper] ?? start;
  return start + (end - start) * (index - lower);
}

class DiscretePositionScale implements Scale {
  readonly bandwidth = 0;
  readonly descriptor: PositionScaleDescriptor;
  readonly #domain: readonly (number | string)[];
  readonly #range: readonly number[];
  readonly #policy: ScaleOutOfBounds;
  readonly #thresholds: readonly number[];
  readonly #ordinalIndices = new Map<string, number>();

  constructor(
    readonly kind: 'ordinal' | 'quantile' | 'quantize' | 'threshold',
    spec: ScaleSpec,
    domain: readonly (number | string)[],
    range: readonly number[],
  ) {
    this.#domain = frozen(domain);
    this.#range = frozen(spec.reverse === true ? [...range].reverse() : range);
    this.#policy = resolvedPolicy(spec, kind === 'quantize' ? 'clamp' : 'unknown');
    if (kind === 'ordinal' && (this.#policy === 'clamp' || this.#policy === 'extrapolate')) {
      fail(
        'Ordinal scales support only error or unknown for unseen categories.',
        '$.scale.outOfBounds',
      );
    }
    if (kind === 'quantize' && this.#policy === 'extrapolate') {
      fail('Quantize scales cannot extrapolate discrete range values.', '$.scale.outOfBounds');
    }
    if (
      (kind === 'quantile' || kind === 'threshold') &&
      (spec.outOfBounds !== undefined || spec.clamp !== undefined)
    ) {
      fail(`${kind} scale bin semantics do not accept outOfBounds.`, '$.scale.outOfBounds');
    }
    if (kind === 'ordinal' && this.#range.length < 1)
      fail('Ordinal scale requires at least one range value.', '$.scale.range');
    if (kind === 'ordinal') {
      this.#domain.forEach((value, index) => {
        const id = ordinalKey(value);
        if (!this.#ordinalIndices.has(id)) this.#ordinalIndices.set(id, index);
      });
    }
    if (kind !== 'ordinal' && this.#domain.some((value) => typeof value !== 'number'))
      fail(`${kind} scale domain must be numeric.`, '$.scale.domain');
    const authoredNumbers = this.#domain as readonly number[];
    const numbers = [...authoredNumbers].sort((a, b) => a - b);
    if (kind === 'quantile') {
      if (numbers.length < 2) {
        fail('Quantile scale domain must contain at least 2 numeric samples.', '$.scale.domain');
      }
      this.#thresholds = frozen(
        Array.from({ length: Math.max(0, this.#range.length - 1) }, (_, index) =>
          quantile(numbers, (index + 1) / this.#range.length),
        ),
      );
    } else if (kind === 'quantize') {
      if (numbers.length !== 2 || numbers[0] === numbers[1])
        fail('Quantize scale requires two distinct numeric domain endpoints.', '$.scale.domain');
      this.#thresholds = frozen(
        Array.from(
          { length: Math.max(0, this.#range.length - 1) },
          (_, index) =>
            numbers[0]! + ((numbers[1]! - numbers[0]!) * (index + 1)) / this.#range.length,
        ),
      );
    } else if (kind === 'threshold') {
      if (
        authoredNumbers.some((value, index) => index > 0 && value <= authoredNumbers[index - 1]!)
      ) {
        fail('Threshold scale domain must be strictly ascending.', '$.scale.domain');
      }
      if (this.#range.length !== numbers.length + 1)
        fail('Threshold scale range length must equal domain length + 1.', '$.scale.range');
      this.#thresholds = frozen(authoredNumbers);
    } else this.#thresholds = [];
    this.descriptor = Object.freeze({
      type: kind,
      domain: this.#domain,
      range: this.#range,
      reverse: spec.reverse === true,
      rangeDirection: this.#range.at(-1)! < this.#range[0]! ? 'descending' : 'ascending',
      outOfBounds: this.#policy,
    });
  }
  domain(): readonly (number | string)[] {
    return this.#domain;
  }
  range(): readonly number[] {
    return this.#range;
  }
  map(input: number | string | Date): number {
    const value = input instanceof Date ? input.getTime() : input;
    if (this.kind === 'ordinal') {
      const index = this.#ordinalIndices.get(ordinalKey(value));
      if (index !== undefined) return this.#range[index % this.#range.length]!;
      if (this.#policy === 'error')
        throw new GraflumeError('INVALID_DATA', `Unknown ordinal scale value: ${String(value)}`, {
          path: '$.data',
        });
      return Number.NaN;
    }
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return Number.NaN;
    if (this.kind === 'quantize') {
      const endpoints = this.#domain as readonly number[];
      const minimum = Math.min(endpoints[0]!, endpoints[1]!);
      const maximum = Math.max(endpoints[0]!, endpoints[1]!);
      if (number < minimum || number > maximum) {
        if (this.#policy === 'unknown') return Number.NaN;
        if (this.#policy === 'error') {
          throw new GraflumeError(
            'INVALID_DATA',
            `Quantize input ${number} is outside the domain.`,
            { path: '$.data' },
          );
        }
      }
    }
    let index = 0;
    while (index < this.#thresholds.length && number >= this.#thresholds[index]!) index += 1;
    return this.#range[Math.min(index, this.#range.length - 1)] ?? Number.NaN;
  }
  ticks(_count: number, locale?: string): readonly Tick[] {
    if (this.kind === 'ordinal')
      return this.#domain.map((value) => ({
        value,
        label: String(value),
        position: this.map(value),
      }));
    return this.#thresholds.map((value) => ({
      value,
      label: new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value),
      position: this.map(value),
    }));
  }
}

export interface PositionScaleOptions {
  readonly domain: readonly (number | string)[];
  readonly range: readonly number[];
  readonly type?: PositionScaleType;
}

export function createPositionScale(spec: ScaleSpec, options: PositionScaleOptions): Scale {
  if (spec.type !== undefined && options.type !== undefined && spec.type !== options.type) {
    fail(
      `Scale type ${spec.type} conflicts with the requested position scale type ${options.type}.`,
      '$.scale.type',
    );
  }
  const requestedType = spec.type ?? options.type ?? 'linear';
  if (
    requestedType === 'sequential' ||
    requestedType === 'diverging' ||
    requestedType === 'cyclic'
  ) {
    fail(`${requestedType} is a color scale and cannot produce positions.`, '$.scale.type');
  }
  const type: PositionScaleType = requestedType;
  const domain = spec.domain ?? options.domain;
  const range = spec.range === undefined ? options.range : numericRange(spec.range);
  if (type === 'band') {
    if (domain.some((value) => typeof value !== 'string'))
      fail('Band scale domain must contain strings.', '$.scale.domain');
    const pair = numericRangePair(range);
    const policy = resolvedPolicy(spec, 'unknown');
    if (policy === 'clamp' || policy === 'extrapolate') {
      fail(
        'Band scales support only error or unknown for unseen categories.',
        '$.scale.outOfBounds',
      );
    }
    return new BandScale({
      domain: domain as readonly string[],
      range: [pair[0]!, pair.at(-1)!],
      ...(spec.paddingInner === undefined ? {} : { paddingInner: spec.paddingInner }),
      ...(spec.paddingOuter === undefined ? {} : { paddingOuter: spec.paddingOuter }),
      outOfBounds: policy,
      ...(spec.reverse === undefined ? {} : { reverse: spec.reverse }),
    });
  }
  if (type === 'point') {
    if (domain.some((value) => typeof value !== 'string'))
      fail('Point scale domain must contain strings.', '$.scale.domain');
    const pair = numericRangePair(range);
    return new PointScale(spec, domain as readonly string[], [pair[0]!, pair.at(-1)!]);
  }
  if (type === 'ordinal' || type === 'quantile' || type === 'quantize' || type === 'threshold')
    return new DiscretePositionScale(type, spec, domain, numericRange(range, 1));
  const resolvedContinuousDomain =
    type === 'time' || type === 'utc'
      ? domain.map((value) => (typeof value === 'number' ? value : Date.parse(value)))
      : domain;
  const pair = numericDomain(resolvedContinuousDomain) as NumericPair;
  if (type === 'linear' || type === 'time' || type === 'utc') {
    const numeric = numericRangePair(range);
    return new LinearScale({
      domain: pair,
      range: [numeric[0]!, numeric.at(-1)!],
      kind: type,
      ...(spec.nice === undefined ? {} : { nice: spec.nice }),
      outOfBounds: resolvedPolicy(spec, 'extrapolate'),
      ...(spec.reverse === undefined ? {} : { reverse: spec.reverse }),
    });
  }
  return new ContinuousScale(type, spec, pair, numericRangePair(range));
}

function interpolateColors(range: readonly string[], ratio: number): string {
  const bounded = clampNumber(ratio, 0, 1);
  if (range.length === 1) return range[0]!;
  const scaled = bounded * (range.length - 1);
  const index = Math.min(range.length - 2, Math.floor(scaled));
  return mixColor(range[index]!, range[index + 1]!, scaled - index);
}

function interpolateCyclicColors(range: readonly string[], ratio: number): string {
  const wrapped = ((ratio % 1) + 1) % 1;
  const scaled = wrapped * range.length;
  const index = Math.floor(scaled) % range.length;
  const next = (index + 1) % range.length;
  return mixColor(range[index]!, range[next]!, scaled - Math.floor(scaled));
}

class RegisteredColorScale implements ColorScale {
  readonly descriptor: ColorScaleDescriptor;
  readonly #domain: readonly (number | string)[];
  readonly #range: readonly string[];
  readonly #policy: ScaleOutOfBounds;
  readonly #ordinalIndices = new Map<string, number>();
  constructor(
    readonly kind: ColorScaleType,
    spec: ScaleSpec,
    domain: readonly (number | string)[],
    range: readonly string[],
  ) {
    this.#domain = frozen(domain);
    this.#range = frozen(spec.reverse === true ? [...range].reverse() : range);
    this.#policy = resolvedPolicy(spec, kind === 'ordinal' ? 'unknown' : 'clamp');
    if (kind === 'cyclic' && (spec.outOfBounds !== undefined || spec.clamp !== undefined)) {
      fail('Cyclic scales always wrap and do not accept outOfBounds.', '$.scale.outOfBounds');
    }
    if (this.#policy === 'extrapolate' && kind !== 'cyclic') {
      fail(
        'Color scales do not extrapolate colors; use clamp, error, or unknown.',
        '$.scale.outOfBounds',
      );
    }
    if (kind === 'ordinal' && this.#policy === 'clamp') {
      fail(
        'Ordinal color scales support only error or unknown for unseen categories.',
        '$.scale.outOfBounds',
      );
    }
    if (kind === 'ordinal') {
      this.#domain.forEach((value, index) => {
        const id = ordinalKey(value);
        if (!this.#ordinalIndices.has(id)) this.#ordinalIndices.set(id, index);
      });
    }
    if (this.#range.length === 0)
      fail('Color scale requires at least one color in range.', '$.scale.range');
    if (kind === 'sequential' && this.#range.length < 2)
      fail('Sequential color scale requires at least 2 colors.', '$.scale.range');
    if (kind === 'diverging' && this.#range.length < 3)
      fail('Diverging color scale requires at least 3 colors.', '$.scale.range');
    if (kind === 'cyclic' && this.#range.length < 2)
      fail('Cyclic color scale requires at least 2 colors.', '$.scale.range');
    if (kind === 'diverging') numericDomain(domain, 3);
    else if (kind !== 'ordinal') numericDomain(domain);
    if (kind === 'diverging') {
      const [start, middle, end] = domain as readonly [number, number, number];
      if (!(start < middle && middle < end)) {
        fail('Diverging color scale domain must be strictly ascending.', '$.scale.domain');
      }
    } else if (kind !== 'ordinal') {
      const [start, end] = domain as NumericPair;
      if (start === end)
        fail(`${kind} color scale domain endpoints must differ.`, '$.scale.domain');
    }
    this.descriptor = Object.freeze({
      type: kind,
      domain: this.#domain,
      range: this.#range,
      reverse: spec.reverse === true,
      outOfBounds: kind === 'cyclic' ? 'wrap' : this.#policy,
    });
  }
  domain(): readonly (number | string)[] {
    return this.#domain;
  }
  range(): readonly string[] {
    return this.#range;
  }
  map(input: number | string | Date): string {
    const value = input instanceof Date ? input.getTime() : input;
    if (this.kind === 'ordinal') {
      const index = this.#ordinalIndices.get(ordinalKey(value));
      if (index !== undefined) return this.#range[index % this.#range.length]!;
      if (this.#policy === 'error')
        throw new GraflumeError('INVALID_DATA', `Unknown ordinal color value: ${String(value)}`, {
          path: '$.data',
        });
      return specUnknownColor(this.#policy);
    }
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return specUnknownColor(this.#policy);
    if (this.kind === 'cyclic') {
      const domain = this.#domain as NumericPair;
      const span = domain[1] - domain[0];
      const ratio = span === 0 ? 0 : ((((number - domain[0]) / span) % 1) + 1) % 1;
      return interpolateCyclicColors(this.#range, ratio);
    }
    if (this.kind === 'diverging') {
      const [start, middle, end] = this.#domain as readonly [number, number, number];
      const ratio =
        number <= middle
          ? normalizeRatio(number, [start, middle], this.#policy, '$.data') / 2
          : 0.5 + normalizeRatio(number, [middle, end], this.#policy, '$.data') / 2;
      return Number.isFinite(ratio)
        ? interpolateColors(this.#range, ratio)
        : specUnknownColor(this.#policy);
    }
    const ratio = normalizeRatio(number, this.#domain as NumericPair, this.#policy, '$.data');
    return Number.isFinite(ratio)
      ? interpolateColors(this.#range, ratio)
      : specUnknownColor(this.#policy);
  }
}

function specUnknownColor(policy: ScaleOutOfBounds): string {
  if (policy === 'error')
    throw new GraflumeError('INVALID_DATA', 'Color scale input is outside the domain.', {
      path: '$.data',
    });
  return 'transparent';
}

export function createColorScale(
  spec: ScaleSpec,
  fallback: { readonly domain: readonly (number | string)[]; readonly range: readonly string[] },
): ColorScale {
  if (
    spec.type !== undefined &&
    spec.type !== 'ordinal' &&
    spec.type !== 'sequential' &&
    spec.type !== 'diverging' &&
    spec.type !== 'cyclic'
  ) {
    fail(`${spec.type} is not a color registry scale.`, '$.scale.type');
  }
  const type: ColorScaleType =
    spec.type === 'sequential' || spec.type === 'diverging' || spec.type === 'cyclic'
      ? spec.type
      : 'ordinal';
  const domain = spec.domain ?? fallback.domain;
  const rawRange = spec.range ?? fallback.range;
  if (rawRange.some((value) => typeof value !== 'string'))
    fail('Color scale range must contain strings.', '$.scale.range');
  return new RegisteredColorScale(type, spec, domain, rawRange as readonly string[]);
}

export const positionScaleTypes: readonly PositionScaleType[] = Object.freeze([
  'linear',
  'log',
  'symlog',
  'asinh',
  'pow',
  'sqrt',
  'time',
  'utc',
  'band',
  'point',
  'ordinal',
  'quantile',
  'quantize',
  'threshold',
  'probability',
  'logit',
  'probit',
]);

export const colorScaleTypes: readonly ColorScaleType[] = Object.freeze([
  'ordinal',
  'sequential',
  'diverging',
  'cyclic',
]);
