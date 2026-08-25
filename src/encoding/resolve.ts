import type { MarkCompileContext } from '../compiler/types.js';
import { evaluateTransformExpression } from '../data/transforms.js';
import { createColorScale, createPositionScale } from '../scale/registry.js';
import type { ColorScale, PositionScaleType, Scale } from '../scale/types.js';
import type {
  DataRow,
  DataValue,
  EncodingChannel,
  JsonPrimitive,
  NormalizedChannelEncodingSpec,
  ScaleType,
} from '../spec/types.js';
import { categoricalColor, continuousColor } from '../theme/color.js';

const shapeRange = ['circle', 'square', 'diamond', 'triangle', 'cross'] as const;
const dashRange: readonly (readonly number[])[] = [[], [7, 4], [2, 3], [10, 3, 2, 3], [1, 3]];

function truthy(value: DataValue): boolean {
  return value !== false && value !== null && value !== undefined && value !== 0 && value !== '';
}

function key(value: DataValue | readonly number[]): string {
  if (value instanceof Date) return value.toISOString();
  return Array.isArray(value) ? JSON.stringify(value) : `${typeof value}:${String(value)}`;
}

function numeric(value: DataValue | readonly number[]): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
    const date = Date.parse(value);
    return Number.isFinite(date) ? date : null;
  }
  return null;
}

function channelSpec(
  context: MarkCompileContext,
  channel: EncodingChannel,
): NormalizedChannelEncodingSpec | undefined {
  if (channel === 'x' || channel === 'y') {
    return { ...context.layer.encoding[channel], condition: [] };
  }
  return context.layer.encoding[channel];
}

interface ResolvedEncodingValue {
  readonly value: DataValue | readonly number[];
  readonly literal: boolean;
}

function resolvedFrom(spec: NormalizedChannelEncodingSpec, row: DataRow): ResolvedEncodingValue {
  for (const condition of spec.condition) {
    if (!truthy(evaluateTransformExpression(condition.test, row))) continue;
    if (condition.field !== undefined) return { value: row[condition.field], literal: false };
    return { value: condition.value, literal: true };
  }
  if (spec.field !== undefined) return { value: row[spec.field], literal: false };
  return { value: spec.value, literal: true };
}

function rawFrom(spec: NormalizedChannelEncodingSpec, row: DataRow): DataValue | readonly number[] {
  return resolvedFrom(spec, row).value;
}

function fieldValues(
  context: MarkCompileContext,
  spec: NormalizedChannelEncodingSpec,
): readonly (DataValue | readonly number[])[] {
  const values: Array<DataValue | readonly number[]> = [];
  for (let rowIndex = 0; rowIndex < context.table.length; rowIndex += 1) {
    const resolved = resolvedFrom(spec, context.table.row(rowIndex));
    if (!resolved.literal && resolved.value !== null && resolved.value !== undefined) {
      values.push(resolved.value);
    }
  }
  return values;
}

function uniqueValues(
  values: readonly (DataValue | readonly number[])[],
): readonly (number | string)[] {
  const seen = new Set<string>();
  const result: Array<number | string> = [];
  for (const value of values) {
    if ((typeof value === 'object' && !(value instanceof Date)) || typeof value === 'boolean')
      continue;
    const normalized = value instanceof Date ? value.getTime() : value;
    if (normalized === null || normalized === undefined) continue;
    const id = key(normalized);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(normalized);
  }
  return result;
}

function numericExtent(
  values: readonly (DataValue | readonly number[])[],
  includeZero = false,
): readonly [number, number] {
  let minimum = includeZero ? 0 : Number.POSITIVE_INFINITY;
  let maximum = includeZero ? 0 : Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const number = numeric(value);
    if (number === null) continue;
    minimum = Math.min(minimum, number);
    maximum = Math.max(maximum, number);
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return [0, 1];
  if (minimum === maximum) {
    const delta = minimum === 0 ? 1 : Math.abs(minimum) * 0.05;
    minimum -= delta;
    maximum += delta;
  }
  return [minimum, maximum];
}

function numericSamples(values: readonly (DataValue | readonly number[])[]): readonly number[] {
  return values.map(numeric).filter((value): value is number => value !== null);
}

function scaleType(spec: NormalizedChannelEncodingSpec): ScaleType | undefined {
  return spec.scale.type;
}

function isCategorical(
  spec: NormalizedChannelEncodingSpec,
  values: readonly (DataValue | readonly number[])[],
): boolean {
  if (spec.type === 'nominal' || spec.type === 'ordinal') return true;
  if (spec.type === 'quantitative' || spec.type === 'temporal') return false;
  return values.some(
    (value) =>
      typeof value === 'string' &&
      !Number.isFinite(Number(value)) &&
      !Number.isFinite(Date.parse(value)),
  );
}

function defaultNumericRange(channel: EncodingChannel): readonly [number, number] {
  switch (channel) {
    case 'size':
      return [16, 400];
    case 'radius':
      return [2, 18];
    case 'opacity':
      return [0.15, 1];
    case 'strokeWidth':
      return [0.5, 8];
    default:
      return [0, 1];
  }
}

interface PreparedChannel {
  readonly spec: NormalizedChannelEncodingSpec;
  readonly values: readonly (DataValue | readonly number[])[];
  readonly categories: readonly (number | string)[];
  readonly categoryIndices: ReadonlyMap<string, number>;
  readonly positionScale?: Scale;
  readonly colorScale?: ColorScale;
}

export class EncodingResolver {
  readonly #channels = new Map<EncodingChannel, PreparedChannel | null>();

  constructor(readonly context: MarkCompileContext) {}

  #prepare(channel: EncodingChannel): PreparedChannel | undefined {
    if (this.#channels.has(channel)) return this.#channels.get(channel) ?? undefined;
    const spec = channelSpec(this.context, channel);
    if (spec === undefined) {
      this.#channels.set(channel, null);
      return undefined;
    }
    const values = fieldValues(this.context, spec);
    const categories = uniqueValues(values);
    const categoryIndices = new Map(categories.map((value, index) => [key(value), index]));
    const type = scaleType(spec);
    const usesField =
      spec.field !== undefined || spec.condition.some((condition) => condition.field !== undefined);
    let positionScale: Scale | undefined;
    let colorScale: ColorScale | undefined;

    if (channel === 'x2') positionScale = this.context.xScale;
    else if (channel === 'y2') positionScale = this.context.yScale;
    else if (usesField && (channel === 'color' || channel === 'fill' || channel === 'stroke')) {
      const categorical = type === undefined ? isCategorical(spec, values) : type === 'ordinal';
      if (categorical || type === 'ordinal') {
        colorScale = createColorScale(
          { ...spec.scale, type: 'ordinal' },
          {
            domain: categories,
            range: categories.map((_value, index) =>
              categoricalColor(this.context.theme, index, categories.length),
            ),
          },
        );
      } else if (type === 'sequential' || type === 'diverging' || type === 'cyclic') {
        const domain =
          type === 'diverging'
            ? (() => {
                const [minimum, maximum] = numericExtent(values, spec.scale.zero === true);
                return [minimum, (minimum + maximum) / 2, maximum];
              })()
            : numericExtent(values, spec.scale.zero === true);
        colorScale = createColorScale(spec.scale, {
          domain,
          range:
            type === 'diverging'
              ? this.context.theme.colors.diverging
              : this.context.theme.colors.sequential,
        });
      } else {
        const numericDomain =
          type === 'quantile'
            ? numericSamples(values)
            : type === 'threshold' && spec.scale.domain !== undefined
              ? spec.scale.domain
              : numericExtent(values, spec.scale.zero === true);
        const thresholdCount =
          type === 'threshold' && spec.scale.domain !== undefined
            ? spec.scale.domain.length + 1
            : 2;
        const thresholdRange = Array.from(
          { length: thresholdCount },
          (_value, index) => index / Math.max(1, thresholdCount - 1),
        );
        const numericColorScale =
          spec.scale.outOfBounds === undefined && spec.scale.clamp === undefined
            ? { ...spec.scale, nice: false as const, outOfBounds: 'clamp' as const }
            : { ...spec.scale, nice: false as const };
        positionScale = createPositionScale(numericColorScale, {
          domain: numericDomain,
          range: thresholdRange,
          type: (type ?? 'linear') as PositionScaleType,
        });
      }
    } else if (
      usesField &&
      (channel === 'size' ||
        channel === 'radius' ||
        channel === 'opacity' ||
        channel === 'strokeWidth')
    ) {
      const categorical = isCategorical(spec, values) || type === 'ordinal';
      const output = defaultNumericRange(channel);
      const categoryCount = Math.max(1, categories.length);
      const range = categorical
        ? Array.from(
            { length: categoryCount },
            (_value, index) =>
              output[0] + ((output[1] - output[0]) * index) / Math.max(1, categoryCount - 1),
          )
        : output;
      positionScale = createPositionScale(
        { ...spec.scale, nice: false },
        {
          domain:
            type === 'quantile'
              ? numericSamples(values)
              : categorical
                ? categories
                : numericExtent(values, spec.scale.zero === true),
          range,
          type: (categorical ? 'ordinal' : (type ?? 'linear')) as PositionScaleType,
        },
      );
    }

    const prepared: PreparedChannel = {
      spec,
      values,
      categories,
      categoryIndices,
      ...(positionScale === undefined ? {} : { positionScale }),
      ...(colorScale === undefined ? {} : { colorScale }),
    };
    this.#channels.set(channel, prepared);
    return prepared;
  }

  has(channel: EncodingChannel): boolean {
    return channelSpec(this.context, channel) !== undefined;
  }

  raw(channel: EncodingChannel, rowIndex: number): DataValue | readonly number[] {
    const prepared = this.#prepare(channel);
    return prepared === undefined
      ? undefined
      : rawFrom(prepared.spec, this.context.table.row(rowIndex));
  }

  number(channel: EncodingChannel, rowIndex: number, fallback: number): number {
    const prepared = this.#prepare(channel);
    if (prepared === undefined) return fallback;
    const resolved = resolvedFrom(prepared.spec, this.context.table.row(rowIndex));
    const value = resolved.value;
    if (resolved.literal) return numeric(value) ?? fallback;
    if (prepared.positionScale !== undefined) {
      const input =
        value instanceof Date || typeof value === 'number' || typeof value === 'string'
          ? value
          : null;
      if (input === null) return fallback;
      const mapped = prepared.positionScale.map(input);
      return Number.isFinite(mapped) ? mapped : fallback;
    }
    return numeric(value) ?? fallback;
  }

  position(channel: 'x2' | 'y2', rowIndex: number): number | null {
    const prepared = this.#prepare(channel);
    if (prepared?.positionScale === undefined) return null;
    const value = rawFrom(prepared.spec, this.context.table.row(rowIndex));
    const input =
      value instanceof Date || typeof value === 'number' || typeof value === 'string'
        ? value
        : null;
    if (input === null) return null;
    const mapped = prepared.positionScale.map(input);
    return Number.isFinite(mapped) ? mapped : null;
  }

  color(channel: 'color' | 'fill' | 'stroke', rowIndex: number, fallback: string): string {
    const prepared = this.#prepare(channel);
    if (prepared === undefined) return fallback;
    const resolved = resolvedFrom(prepared.spec, this.context.table.row(rowIndex));
    const value = resolved.value;
    if (resolved.literal) return typeof value === 'string' ? value : fallback;
    if (
      prepared.colorScale !== undefined &&
      (value instanceof Date || typeof value === 'number' || typeof value === 'string')
    ) {
      return prepared.colorScale.map(value);
    }
    if (
      prepared.positionScale !== undefined &&
      (value instanceof Date || typeof value === 'number' || typeof value === 'string')
    ) {
      const ratio = prepared.positionScale.map(value);
      return Number.isFinite(ratio)
        ? continuousColor(this.context.theme, ratio)
        : prepared.spec.scale.outOfBounds === 'unknown'
          ? 'transparent'
          : fallback;
    }
    return typeof value === 'string' ? value : fallback;
  }

  dash(rowIndex: number, fallback: readonly number[] = []): readonly number[] {
    const prepared = this.#prepare('strokeDash');
    if (prepared === undefined) return fallback;
    const value = rawFrom(prepared.spec, this.context.table.row(rowIndex));
    if (Array.isArray(value)) return value;
    const index = prepared.categoryIndices.get(key(value));
    return index === undefined ? fallback : (dashRange[index % dashRange.length] ?? fallback);
  }

  shape(rowIndex: number, fallback = 'circle'): string {
    const channel: EncodingChannel = this.has('shape') ? 'shape' : 'symbol';
    const prepared = this.#prepare(channel);
    if (prepared === undefined) return fallback;
    const resolved = resolvedFrom(prepared.spec, this.context.table.row(rowIndex));
    const value = resolved.value;
    if (resolved.literal && typeof value === 'string') return value;
    const index = prepared.categoryIndices.get(key(value));
    return index === undefined ? fallback : (shapeRange[index % shapeRange.length] ?? fallback);
  }

  icon(rowIndex: number): string | undefined {
    const value = this.raw('icon', rowIndex);
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    if (normalized === '' || /[\u0000-\u001f\u007f]/u.test(normalized)) return undefined;
    return Array.from(normalized).slice(0, 8).join('');
  }

  text(rowIndex: number, fallback?: string): string | undefined {
    const value = this.raw('text', rowIndex);
    if (value === null || value === undefined || Array.isArray(value)) return fallback;
    return String(value);
  }

  tooltip(rowIndex: number): Readonly<Record<string, JsonPrimitive>> | undefined {
    const value = this.raw('tooltip', rowIndex);
    if (value === undefined || Array.isArray(value) || value instanceof Date) return undefined;
    return { encoded: value as JsonPrimitive };
  }

  groupKey(rowIndex: number): string {
    return ['detail', 'color', 'fill', 'stroke', 'strokeDash', 'strokeWidth', 'opacity']
      .filter((channel) => this.has(channel as EncodingChannel))
      .map((channel) => key(this.raw(channel as EncodingChannel, rowIndex)))
      .join('|');
  }

  orderedIndices(indices: readonly number[]): readonly number[] {
    if (!this.has('order')) return indices;
    return [...indices].sort((left, right) => {
      const a = this.raw('order', left);
      const b = this.raw('order', right);
      const an = numeric(a);
      const bn = numeric(b);
      if (an !== null && bn !== null) return an - bn || left - right;
      return String(a ?? '').localeCompare(String(b ?? '')) || left - right;
    });
  }
}

export function createEncodingResolver(context: MarkCompileContext): EncodingResolver {
  return new EncodingResolver(context);
}
