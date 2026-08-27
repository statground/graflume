import { GraflumeError } from '../core/errors.js';
import { temporalTimestamp } from '../format/temporal.js';
import type {
  AggregateFieldSpec,
  DataInput,
  DataRow,
  DataValue,
  JsonPrimitive,
  JsonValue,
  TransformExpression,
  TransformSortField,
  TransformSpec,
  WindowFieldSpec,
} from '../spec/types.js';
import { DataTable } from './table.js';
import { kernelDensity1d, type WeightedObservation } from './statistics.js';
import { validateTransforms } from '../spec/transform-validation.js';

export interface TransformStepLineage {
  readonly index: number;
  readonly type: TransformSpec['type'];
  readonly inputRows: number;
  readonly outputRows: number;
  readonly parameters: JsonValue;
  readonly seed?: number;
  readonly aggregationCount?: number;
  readonly detail?: string;
}

export interface DataLineage {
  readonly sourceId: string;
  readonly sourceRows: number;
  readonly outputRows: number;
  readonly transforms: readonly TransformStepLineage[];
  /** Source row indices contributing to each output row. */
  readonly rowSources: readonly (readonly number[])[];
  readonly summary: string;
}

export interface TransformResult {
  readonly data: readonly DataRow[];
  readonly lineage: DataLineage;
}

interface WorkingRow {
  readonly value: Record<string, DataValue>;
  readonly sources: readonly number[];
}

const unsafeFields = new Set(['__proto__', 'prototype', 'constructor']);
const maximumDerivedRows = 100_000;
const maximumKernelEvaluations = 10_000_000;
const maximumStackMatrixCells = 1_000_000;
const maximumWindowEvaluations = 10_000_000;

function enforceWorkBudget(count: number, limit: number, operation: string, path: string): void {
  if (!Number.isFinite(count) || count > limit) {
    throw new GraflumeError(
      'INVALID_DATA',
      `${operation} would require ${Number.isFinite(count) ? Math.ceil(count) : 'an unbounded number of'} derived operations; the deterministic limit is ${limit}.`,
      { path },
    );
  }
}

function safeField(field: string): string {
  if (field.trim() === '' || unsafeFields.has(field)) {
    throw new GraflumeError('INVALID_SPEC', `Unsafe transform field "${field}".`, {
      path: '$.transform',
    });
  }
  return field;
}

function cloneRecord(row: Readonly<Record<string, unknown>>): Record<string, DataValue> {
  const output = Object.create(null) as Record<string, DataValue>;
  for (const [field, value] of Object.entries(row)) {
    safeField(field);
    output[field] = value as DataValue;
  }
  return output;
}

function jsonSafe(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  if (ArrayBuffer.isView(value)) {
    return Array.from(value as unknown as ArrayLike<unknown>, (entry) => jsonSafe(entry));
  }
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === 'object' && value !== null) {
    const output: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
    for (const [key, child] of Object.entries(value)) {
      safeField(key);
      if (child !== undefined) output[key] = jsonSafe(child);
    }
    return output;
  }
  throw new GraflumeError('INVALID_SPEC', 'Transform lineage parameters must be JSON-safe.', {
    path: '$.transform',
  });
}

function inputRows(input: DataInput): WorkingRow[] {
  const table = DataTable.from(input);
  return Array.from({ length: table.length }, (_, index) => ({
    value: cloneRecord(table.row(index)),
    sources: [index],
  }));
}

function scalar(value: unknown): DataValue {
  return value === undefined ||
    value === null ||
    value instanceof Date ||
    ['string', 'number', 'boolean'].includes(typeof value)
    ? (value as DataValue)
    : String(value);
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
    return temporalTimestamp(value, true);
  }
  return null;
}

function truthy(value: unknown): boolean {
  return value !== false && value !== null && value !== undefined && value !== 0 && value !== '';
}

function evaluate(expr: TransformExpression, row: Readonly<Record<string, DataValue>>): DataValue {
  switch (expr.op) {
    case 'literal':
      return expr.value;
    case 'field':
      return row[safeField(expr.field)];
    case 'not':
      return !truthy(evaluate(expr.value, row));
    case 'negate': {
      const value = numeric(evaluate(expr.value, row));
      return value === null ? null : -value;
    }
    case 'isValid': {
      const value = evaluate(expr.value, row);
      return (
        value !== null &&
        value !== undefined &&
        !(typeof value === 'number' && !Number.isFinite(value))
      );
    }
    case 'toNumber':
      return numeric(evaluate(expr.value, row));
    case 'toString': {
      const value = evaluate(expr.value, row);
      return value === null || value === undefined
        ? ''
        : value instanceof Date
          ? value.toISOString()
          : String(value);
    }
    case 'if':
      return evaluate(truthy(evaluate(expr.condition, row)) ? expr.then : expr.else, row);
    case 'coalesce': {
      for (const item of expr.values) {
        const value = evaluate(item, row);
        if (value !== null && value !== undefined) return value;
      }
      return null;
    }
    default: {
      const left = evaluate(expr.left, row);
      if (expr.op === 'and' && !truthy(left)) return false;
      if (expr.op === 'or' && truthy(left)) return true;
      const right = evaluate(expr.right, row);
      const a = numeric(left);
      const b = numeric(right);
      switch (expr.op) {
        case 'add':
          return a === null || b === null ? `${left ?? ''}${right ?? ''}` : a + b;
        case 'subtract':
          return a === null || b === null ? null : a - b;
        case 'multiply':
          return a === null || b === null ? null : a * b;
        case 'divide':
          return a === null || b === null || b === 0 ? null : a / b;
        case 'modulo':
          return a === null || b === null || b === 0 ? null : a % b;
        case 'equal':
          return Object.is(left, right);
        case 'notEqual':
          return !Object.is(left, right);
        case 'lessThan':
          return a !== null && b !== null ? a < b : String(left) < String(right);
        case 'lessThanOrEqual':
          return a !== null && b !== null ? a <= b : String(left) <= String(right);
        case 'greaterThan':
          return a !== null && b !== null ? a > b : String(left) > String(right);
        case 'greaterThanOrEqual':
          return a !== null && b !== null ? a >= b : String(left) >= String(right);
        case 'and':
          return truthy(right);
        case 'or':
          return truthy(right);
      }
    }
  }
}

function keyOf(row: Readonly<Record<string, DataValue>>, fields: readonly string[]): string {
  return JSON.stringify(
    fields.map((field) => {
      const value = row[safeField(field)];
      return value instanceof Date ? { date: value.toISOString() } : (value ?? null);
    }),
  );
}

function compareValue(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const an = numeric(a);
  const bn = numeric(b);
  if (an !== null && bn !== null) return an - bn;
  return String(a).localeCompare(String(b), 'en');
}

function sorted(rows: readonly WorkingRow[], by: readonly TransformSortField[]): WorkingRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      for (const sort of by) {
        const result = compareValue(
          a.row.value[safeField(sort.field)],
          b.row.value[safeField(sort.field)],
        );
        if (result !== 0) return sort.order === 'descending' ? -result : result;
      }
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

function groups(rows: readonly WorkingRow[], fields: readonly string[] = []): WorkingRow[][] {
  const grouped = new Map<string, WorkingRow[]>();
  for (const row of rows) {
    const key = keyOf(row.value, fields);
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }
  return [...grouped.values()];
}

function values(group: readonly WorkingRow[], field: string | undefined): number[] {
  if (field === undefined) return [];
  return group.flatMap(({ value }) => {
    const number = numeric(value[safeField(field)]);
    return number === null ? [] : [number];
  });
}

function quantileValue(input: readonly number[], probability: number): number | null {
  if (input.length === 0) return null;
  const ordered = [...input].sort((a, b) => a - b);
  return quantileFromSorted(ordered, probability);
}

function quantileFromSorted(ordered: readonly number[], probability: number): number | null {
  if (ordered.length === 0) return null;
  const position = Math.max(0, Math.min(1, probability)) * (ordered.length - 1);
  const low = Math.floor(position);
  const high = Math.ceil(position);
  const a = ordered[low]!;
  const b = ordered[high]!;
  return a + (b - a) * (position - low);
}

function aggregateValue(group: readonly WorkingRow[], spec: AggregateFieldSpec): DataValue {
  const numbers = values(group, spec.field);
  switch (spec.op) {
    case 'count':
      return group.length;
    case 'valid':
      return spec.field === undefined
        ? group.length
        : group.length - group.filter(({ value }) => value[spec.field!] == null).length;
    case 'missing':
      return spec.field === undefined
        ? 0
        : group.filter(({ value }) => value[spec.field!] == null).length;
    case 'sum':
      return numbers.reduce((sum, value) => sum + value, 0);
    case 'mean':
      return numbers.length === 0
        ? null
        : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    case 'weightedMean': {
      if (spec.field === undefined || spec.weight === undefined) return null;
      let weighted = 0;
      let weights = 0;
      for (const { value } of group) {
        const number = numeric(value[spec.field]);
        const weight = numeric(value[spec.weight]);
        if (number === null || weight === null) continue;
        weighted += number * weight;
        weights += weight;
      }
      return weights === 0 ? null : weighted / weights;
    }
    case 'min':
      return numbers.length === 0
        ? null
        : numbers.reduce((minimum, value) => Math.min(minimum, value), Number.POSITIVE_INFINITY);
    case 'max':
      return numbers.length === 0
        ? null
        : numbers.reduce((maximum, value) => Math.max(maximum, value), Number.NEGATIVE_INFINITY);
    case 'median':
      return quantileValue(numbers, 0.5);
    case 'variance': {
      if (numbers.length < 2) return null;
      const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      return numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (numbers.length - 1);
    }
    case 'stdev': {
      const variance = aggregateValue(group, { ...spec, op: 'variance' });
      return typeof variance === 'number' ? Math.sqrt(variance) : null;
    }
  }
}

function aggregate(
  rows: readonly WorkingRow[],
  transform: Extract<TransformSpec, { type: 'aggregate' | 'joinaggregate' }>,
): WorkingRow[] {
  const groupby = transform.groupby ?? [];
  return groups(rows, groupby).flatMap((group) => {
    const aggregated = Object.create(null) as Record<string, DataValue>;
    for (const field of groupby) aggregated[field] = group[0]?.value[field];
    for (const field of transform.fields)
      aggregated[safeField(field.as)] = aggregateValue(group, field);
    const sources = [...new Set(group.flatMap((row) => row.sources))].sort((a, b) => a - b);
    if (transform.type === 'aggregate') return [{ value: aggregated, sources }];
    return group.map((row) => ({ value: { ...row.value, ...aggregated }, sources: row.sources }));
  });
}

function extent(rows: readonly WorkingRow[], field: string): readonly [number, number] | null {
  const found = values(rows, field);
  if (found.length === 0) return null;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of found) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return [minimum, maximum];
}

function binStep(domain: readonly [number, number], maxbins: number): number {
  const span = Math.max(Number.EPSILON, domain[1] - domain[0]);
  const raw = span / Math.max(1, maxbins);
  const power = 10 ** Math.floor(Math.log10(raw));
  const error = raw / power;
  return (error >= 5 ? 5 : error >= 2 ? 2 : 1) * power;
}

function bin(
  rows: readonly WorkingRow[],
  transform: Extract<TransformSpec, { type: 'bin' }>,
): WorkingRow[] {
  const domain = transform.extent ?? extent(rows, transform.field);
  if (domain === null)
    return rows.map((row) => ({
      ...row,
      value: { ...row.value, [transform.as[0]]: null, [transform.as[1]]: null },
    }));
  const step = transform.step ?? binStep(domain, transform.maxbins ?? 10);
  return rows.map((row) => {
    const value = numeric(row.value[transform.field]);
    const start = value === null ? null : Math.floor((value - domain[0]) / step) * step + domain[0];
    return {
      ...row,
      value: {
        ...row.value,
        [transform.as[0]]: start,
        [transform.as[1]]: start === null ? null : start + step,
      },
    };
  });
}

function density1d(
  rows: readonly WorkingRow[],
  transform: Extract<TransformSpec, { type: 'density1d' }>,
): WorkingRow[] {
  let kernelEvaluations = 0;
  return groups(rows, transform.groupby).flatMap((group) => {
    const input: WeightedObservation[] = group.flatMap((row, index) => {
      const value = numeric(row.value[transform.field]);
      return value === null ? [] : [{ value, weight: 1, rowIndex: row.sources[0] ?? index }];
    });
    if (input.length === 0) return [];
    const pointCount = Math.max(2, transform.points ?? 64);
    kernelEvaluations += input.length * pointCount;
    enforceWorkBudget(
      kernelEvaluations,
      maximumKernelEvaluations,
      'density1d',
      '$.transform[].points',
    );
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;
    for (const { value } of input) {
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
    const estimate = kernelDensity1d(input, {
      points: pointCount,
      extent: [minimum, maximum],
      ...(transform.bandwidth === undefined ? {} : { bandwidth: transform.bandwidth }),
    });
    const prefix = Object.create(null) as Record<string, DataValue>;
    for (const field of transform.groupby ?? []) prefix[field] = group[0]?.value[field];
    const sources = [...new Set(group.flatMap((row) => row.sources))].sort((a, b) => a - b);
    return estimate.points.map(({ value, density }) => ({
      value: { ...prefix, [transform.as[0]]: value, [transform.as[1]]: density },
      sources,
    }));
  });
}

function stack(
  rows: readonly WorkingRow[],
  transform: Extract<TransformSpec, { type: 'stack' }>,
): WorkingRow[] {
  const seriesFields = transform.series ?? [];
  const buckets = groups(rows, transform.groupby);
  const seriesTotals = new Map<string, number>();
  const seriesOrder: string[] = [];
  for (const row of rows) {
    const key = keyOf(row.value, seriesFields);
    if (!seriesTotals.has(key)) seriesOrder.push(key);
    seriesTotals.set(
      key,
      (seriesTotals.get(key) ?? 0) + (numeric(row.value[transform.field]) ?? 0),
    );
  }
  if (transform.order === 'insideOut' || (transform.offset ?? 'zero') === 'wiggle') {
    enforceWorkBudget(
      buckets.length * seriesOrder.length,
      maximumStackMatrixCells,
      'Stack layout',
      '$.transform[].order',
    );
  }
  const matrixSeriesOrder = [...seriesOrder];
  const stackMatrix =
    transform.order === 'insideOut' || (transform.offset ?? 'zero') === 'wiggle'
      ? (() => {
          const seriesIndex = new Map(matrixSeriesOrder.map((key, index) => [key, index]));
          return buckets.map((bucket) => {
            const totals = Array.from({ length: matrixSeriesOrder.length }, () => 0);
            for (const row of bucket) {
              const index = seriesIndex.get(keyOf(row.value, seriesFields));
              if (index === undefined) continue;
              totals[index] =
                totals[index]! + Math.max(0, numeric(row.value[transform.field]) ?? 0);
            }
            return totals;
          });
        })()
      : undefined;
  if (transform.order === 'insideOut') {
    const appearances = seriesOrder
      .map((key, index) => {
        let peakIndex = 0;
        let peakValue = Number.NEGATIVE_INFINITY;
        stackMatrix!.forEach((bucket, bucketIndex) => {
          const value = bucket[index] ?? 0;
          if (value > peakValue) {
            peakValue = value;
            peakIndex = bucketIndex;
          }
        });
        return { key, index, peakIndex, total: seriesTotals.get(key) ?? 0 };
      })
      .sort((a, b) => a.peakIndex - b.peakIndex || a.index - b.index);
    const top: string[] = [];
    const bottom: string[] = [];
    let topTotal = 0;
    let bottomTotal = 0;
    for (const series of appearances) {
      if (topTotal < bottomTotal) {
        top.push(series.key);
        topTotal += series.total;
      } else {
        bottom.push(series.key);
        bottomTotal += series.total;
      }
    }
    seriesOrder.splice(0, seriesOrder.length, ...bottom.reverse(), ...top);
  } else if (transform.order !== undefined && transform.order !== 'input') {
    const sign = transform.order === 'descending' || transform.order === 'sumDescending' ? -1 : 1;
    seriesOrder.sort((a, b) => sign * ((seriesTotals.get(a) ?? 0) - (seriesTotals.get(b) ?? 0)));
  }
  const orderedBuckets = buckets.map((bucket) => {
    const authored = transform.sort === undefined ? [...bucket] : sorted(bucket, transform.sort);
    if (seriesFields.length === 0) return authored;
    const seriesIndex = new Map(seriesOrder.map((key, index) => [key, index]));
    return authored
      .map((row, index) => ({ row, index }))
      .sort(
        (a, b) =>
          (seriesIndex.get(keyOf(a.row.value, seriesFields)) ?? 0) -
            (seriesIndex.get(keyOf(b.row.value, seriesFields)) ?? 0) || a.index - b.index,
      )
      .map(({ row }) => row);
  });
  const wiggleBaselines = Array.from({ length: orderedBuckets.length }, () => 0);
  if (
    (transform.offset ?? 'zero') === 'wiggle' &&
    rows.some((row) => (numeric(row.value[transform.field]) ?? 0) < 0)
  ) {
    throw new GraflumeError(
      'INVALID_DATA',
      'The wiggle stack offset requires non-negative values; use zero, normalize, or center for diverging data.',
      { path: '$.transform[].offset' },
    );
  }
  if ((transform.offset ?? 'zero') === 'wiggle' && orderedBuckets.length > 1) {
    let baseline = 0;
    let minimum = 0;
    const originalSeriesIndex = new Map(matrixSeriesOrder.map((key, index) => [key, index]));
    const matrix = stackMatrix!.map((bucket) =>
      seriesOrder.map((key) => bucket[originalSeriesIndex.get(key) ?? 0] ?? 0),
    );
    for (let bucketIndex = 1; bucketIndex < matrix.length; bucketIndex += 1) {
      const current = matrix[bucketIndex]!;
      const previous = matrix[bucketIndex - 1]!;
      const total = current.reduce((sum, value) => sum + value, 0);
      let weightedSlope = 0;
      let precedingSlope = 0;
      for (let seriesIndex = 0; seriesIndex < current.length; seriesIndex += 1) {
        const slope = current[seriesIndex]! - previous[seriesIndex]!;
        weightedSlope += (slope / 2 + precedingSlope) * current[seriesIndex]!;
        precedingSlope += slope;
      }
      baseline -= total === 0 ? 0 : weightedSlope / total;
      wiggleBaselines[bucketIndex] = baseline;
      minimum = Math.min(minimum, baseline);
    }
    for (let index = 0; index < wiggleBaselines.length; index += 1) {
      wiggleBaselines[index] = wiggleBaselines[index]! - minimum;
    }
  }
  return orderedBuckets.flatMap((ordered, bucketIndex) => {
    const positiveTotal = ordered.reduce(
      (sum, row) => sum + Math.max(0, numeric(row.value[transform.field]) ?? 0),
      0,
    );
    const negativeTotal = ordered.reduce(
      (sum, row) => sum + Math.max(0, -(numeric(row.value[transform.field]) ?? 0)),
      0,
    );
    const absoluteTotal = positiveTotal + negativeTotal;
    const offset = transform.offset ?? 'zero';
    const centered = offset === 'center' || offset === 'silhouette';
    const normalized = offset === 'normalize' || offset === 'expand';
    const baseline = centered
      ? (negativeTotal - positiveTotal) / 2
      : offset === 'wiggle'
        ? wiggleBaselines[bucketIndex]!
        : 0;
    let positiveCursor = baseline;
    let negativeCursor = baseline;
    return ordered.map((row) => {
      let amount = numeric(row.value[transform.field]) ?? 0;
      if (normalized) amount = absoluteTotal === 0 ? 0 : amount / absoluteTotal;
      let start: number;
      let end: number;
      if (amount < 0) {
        end = negativeCursor;
        negativeCursor += amount;
        start = negativeCursor;
      } else {
        start = positiveCursor;
        positiveCursor += amount;
        end = positiveCursor;
      }
      return { ...row, value: { ...row.value, [transform.as[0]]: start, [transform.as[1]]: end } };
    });
  });
}

function frameRows(
  group: readonly WorkingRow[],
  index: number,
  frame: readonly [number | null, number | null],
): readonly WorkingRow[] {
  const start = frame[0] === null ? 0 : Math.max(0, index + frame[0]);
  const end = frame[1] === null ? group.length - 1 : Math.min(group.length - 1, index + frame[1]);
  return start > end ? [] : group.slice(start, end + 1);
}

function frameLength(
  length: number,
  index: number,
  frame: readonly [number | null, number | null],
): number {
  const start = frame[0] === null ? 0 : Math.max(0, index + frame[0]);
  const end = frame[1] === null ? length - 1 : Math.min(length - 1, index + frame[1]);
  return Math.max(0, end - start + 1);
}

function windowValue(
  group: readonly WorkingRow[],
  index: number,
  spec: WindowFieldSpec,
  frame: readonly [number | null, number | null],
): DataValue {
  if (spec.op === 'rowNumber') return index + 1;
  if (spec.op === 'lag' || spec.op === 'lead') {
    const direction = spec.op === 'lag' ? -1 : 1;
    return group[index + direction * (spec.offset ?? 1)]?.value[spec.field ?? ''] ?? null;
  }
  if (spec.op === 'rank' || spec.op === 'denseRank') return index + 1;
  const selected =
    spec.op === 'cumulativeSum' ? group.slice(0, index + 1) : frameRows(group, index, frame);
  if (spec.op === 'count') return selected.length;
  const input = values(selected, spec.field);
  if (spec.op === 'sum' || spec.op === 'cumulativeSum')
    return input.reduce((sum, value) => sum + value, 0);
  if (spec.op === 'mean' || spec.op === 'movingAverage')
    return input.length === 0 ? null : input.reduce((sum, value) => sum + value, 0) / input.length;
  if (spec.op === 'min')
    return input.length === 0
      ? null
      : input.reduce((minimum, value) => Math.min(minimum, value), Number.POSITIVE_INFINITY);
  if (spec.op === 'max')
    return input.length === 0
      ? null
      : input.reduce((maximum, value) => Math.max(maximum, value), Number.NEGATIVE_INFINITY);
  return null;
}

function windowTransform(
  rows: readonly WorkingRow[],
  transform: Extract<TransformSpec, { type: 'window' }>,
): WorkingRow[] {
  let windowEvaluations = 0;
  return groups(rows, transform.groupby).flatMap((raw) => {
    const group = transform.sort === undefined ? raw : sorted(raw, transform.sort);
    const frame = transform.frame ?? [null, 0];
    const aggregateFields = transform.fields.filter((field) =>
      ['sum', 'mean', 'min', 'max', 'count', 'cumulativeSum', 'movingAverage'].includes(field.op),
    );
    for (const field of aggregateFields) {
      for (let index = 0; index < group.length; index += 1) {
        windowEvaluations +=
          field.op === 'cumulativeSum' ? index + 1 : frameLength(group.length, index, frame);
      }
    }
    enforceWorkBudget(
      windowEvaluations,
      maximumWindowEvaluations,
      'window transform',
      '$.transform[].frame',
    );
    const rankKeys =
      transform.sort === undefined
        ? group.map((_, index) => String(index))
        : group.map((row) =>
            keyOf(
              row.value,
              transform.sort!.map(({ field }) => field),
            ),
          );
    const ranks: number[] = [];
    const denseRanks: number[] = [];
    let dense = 0;
    for (let index = 0; index < rankKeys.length; index += 1) {
      if (index === 0 || rankKeys[index] !== rankKeys[index - 1]) dense += 1;
      ranks[index] =
        index === 0 || rankKeys[index] !== rankKeys[index - 1] ? index + 1 : ranks[index - 1]!;
      denseRanks[index] = dense;
    }
    return group.map((row, index) => {
      const value = { ...row.value };
      for (const field of transform.fields) {
        if (field.op === 'rank') value[field.as] = ranks[index]!;
        else if (field.op === 'denseRank') value[field.as] = denseRanks[index]!;
        else value[field.as] = windowValue(group, index, field, frame);
      }
      return { ...row, value };
    });
  });
}

function regression(
  rows: readonly WorkingRow[],
  transform: Extract<TransformSpec, { type: 'regression' }>,
): WorkingRow[] {
  return groups(rows, transform.groupby).flatMap((group) => {
    const pairs = group.flatMap((row) => {
      const x = numeric(row.value[transform.x]);
      const y = numeric(row.value[transform.y]);
      return x === null || y === null ? [] : [{ x, y }];
    });
    if (pairs.length < 2) return [];
    const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
    const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
    const denominator = pairs.reduce((sum, pair) => sum + (pair.x - meanX) ** 2, 0);
    const slope =
      denominator === 0
        ? 0
        : pairs.reduce((sum, pair) => sum + (pair.x - meanX) * (pair.y - meanY), 0) / denominator;
    const intercept = meanY - slope * meanX;
    const prefix = Object.create(null) as Record<string, DataValue>;
    for (const field of transform.groupby ?? []) prefix[field] = group[0]?.value[field];
    const sources = [...new Set(group.flatMap((row) => row.sources))].sort((a, b) => a - b);
    const xExtent = pairs.reduce<readonly [number, number]>(
      ([minimum, maximum], { x }) => [Math.min(minimum, x), Math.max(maximum, x)],
      [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
    );
    return xExtent.map((x) => ({
      value: { ...prefix, [transform.as[0]]: x, [transform.as[1]]: intercept + slope * x },
      sources,
    }));
  });
}

function pivotAggregate(
  rows: readonly WorkingRow[],
  field: string,
  op: NonNullable<Extract<TransformSpec, { type: 'pivot' }>['op']>,
): DataValue {
  if (op === 'first') return rows[0]?.value[field];
  if (op === 'count') return rows.length;
  const input = values(rows, field);
  if (input.length === 0) return null;
  if (op === 'sum') return input.reduce((a, b) => a + b, 0);
  if (op === 'mean') return input.reduce((a, b) => a + b, 0) / input.length;
  return op === 'min'
    ? input.reduce((minimum, value) => Math.min(minimum, value), Number.POSITIVE_INFINITY)
    : input.reduce((maximum, value) => Math.max(maximum, value), Number.NEGATIVE_INFINITY);
}

function impute(
  rows: readonly WorkingRow[],
  transform: Extract<TransformSpec, { type: 'impute' }>,
): WorkingRow[] {
  const keyValues = [
    ...new Map(
      rows.map((row) => [JSON.stringify(row.value[transform.key]), row.value[transform.key]]),
    ).values(),
  ];
  return groups(rows, transform.groupby).flatMap((group) => {
    const existing = new Map(group.map((row) => [JSON.stringify(row.value[transform.key]), row]));
    const replacement =
      transform.method === undefined || transform.method === 'value'
        ? (transform.value ?? null)
        : aggregateValue(group, {
            op:
              transform.method === 'mean'
                ? 'mean'
                : transform.method === 'median'
                  ? 'median'
                  : transform.method,
            field: transform.field,
            as: transform.field,
          });
    return keyValues.map(
      (key) =>
        existing.get(JSON.stringify(key)) ?? {
          value: {
            ...Object.fromEntries(
              (transform.groupby ?? []).map((field) => [field, group[0]?.value[field]]),
            ),
            [transform.key]: key,
            [transform.field]: replacement,
          },
          sources: [],
        },
    );
  });
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function apply(rows: readonly WorkingRow[], transform: TransformSpec): WorkingRow[] {
  switch (transform.type) {
    case 'filter':
      return rows.filter((row) => truthy(evaluate(transform.expr, row.value)));
    case 'sort':
      return sorted(rows, transform.by);
    case 'calculate':
      return rows.map((row) => ({
        ...row,
        value: { ...row.value, [safeField(transform.as)]: evaluate(transform.expr, row.value) },
      }));
    case 'aggregate':
    case 'joinaggregate':
      return aggregate(rows, transform);
    case 'bin':
      return bin(rows, transform);
    case 'bin2d': {
      const [x0, x1, y0, y1, count] = transform.as;
      const xb = bin(rows, {
        type: 'bin',
        field: transform.x,
        as: [x0, x1],
        maxbins: transform.maxbins?.[0] ?? 10,
      });
      const both = bin(xb, {
        type: 'bin',
        field: transform.y,
        as: [y0, y1],
        maxbins: transform.maxbins?.[1] ?? 10,
      });
      return aggregate(both, {
        type: 'aggregate',
        groupby: [x0, x1, y0, y1],
        fields: [{ op: 'count', as: count }],
      });
    }
    case 'density1d':
      return density1d(rows, transform);
    case 'density2d': {
      const pairs = rows.flatMap((row) => {
        const x = numeric(row.value[transform.x]);
        const y = numeric(row.value[transform.y]);
        return x === null || y === null ? [] : [{ x, y }];
      });
      if (pairs.length === 0) return [];
      const [xBins, yBins] = transform.bins ?? [32, 32];
      enforceWorkBudget(
        pairs.length * xBins * yBins,
        maximumKernelEvaluations,
        'density2d',
        '$.transform[].bins',
      );
      let xMin = Number.POSITIVE_INFINITY;
      let xMax = Number.NEGATIVE_INFINITY;
      let yMin = Number.POSITIVE_INFINITY;
      let yMax = Number.NEGATIVE_INFINITY;
      for (const pair of pairs) {
        xMin = Math.min(xMin, pair.x);
        xMax = Math.max(xMax, pair.x);
        yMin = Math.min(yMin, pair.y);
        yMax = Math.max(yMax, pair.y);
      }
      const deviation = (input: readonly number[]): number => {
        const mean = input.reduce((sum, value) => sum + value, 0) / input.length;
        return Math.sqrt(
          input.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
            Math.max(1, input.length - 1),
        );
      };
      const [bandwidthX, bandwidthY] = transform.bandwidth ?? [
        Math.max(
          Number.EPSILON,
          1.06 *
            (deviation(pairs.map(({ x }) => x)) || (xMax - xMin) / 6 || 1) *
            pairs.length ** -0.2,
        ),
        Math.max(
          Number.EPSILON,
          1.06 *
            (deviation(pairs.map(({ y }) => y)) || (yMax - yMin) / 6 || 1) *
            pairs.length ** -0.2,
        ),
      ];
      const factor = 1 / (2 * Math.PI * bandwidthX * bandwidthY * pairs.length);
      const sources = [...new Set(rows.flatMap((row) => row.sources))].sort((a, b) => a - b);
      return Array.from({ length: xBins * yBins }, (_, index) => {
        const xIndex = index % xBins;
        const yIndex = Math.floor(index / xBins);
        const x = xMin + ((xMax - xMin || 1) * xIndex) / Math.max(1, xBins - 1);
        const y = yMin + ((yMax - yMin || 1) * yIndex) / Math.max(1, yBins - 1);
        const density =
          pairs.reduce((sum, pair) => {
            const zx = (x - pair.x) / bandwidthX;
            const zy = (y - pair.y) / bandwidthY;
            return sum + Math.exp(-0.5 * (zx * zx + zy * zy));
          }, 0) * factor;
        return {
          value: { [transform.as[0]]: x, [transform.as[1]]: y, [transform.as[2]]: density },
          sources,
        };
      });
    }
    case 'stack':
      return stack(rows, transform);
    case 'window':
      return windowTransform(rows, transform);
    case 'regression':
      return regression(rows, transform);
    case 'fold':
      return rows.flatMap((row) =>
        transform.fields.map((field) => ({
          ...row,
          value: { ...row.value, [transform.as[0]]: field, [transform.as[1]]: row.value[field] },
        })),
      );
    case 'flatten':
      return rows.flatMap((row) => {
        const arrays = transform.fields.map((field) =>
          Array.isArray((row.value as Record<string, unknown>)[field])
            ? ((row.value as Record<string, unknown>)[field] as unknown[])
            : [(row.value as Record<string, unknown>)[field]],
        );
        const length = Math.max(0, ...arrays.map((array) => array.length));
        return Array.from({ length }, (_, index) => ({
          ...row,
          value: {
            ...row.value,
            ...Object.fromEntries(
              transform.fields.map((field, fieldIndex) => [
                transform.as?.[fieldIndex] ?? field,
                scalar(arrays[fieldIndex]?.[index]),
              ]),
            ),
          },
        }));
      });
    case 'pivot':
      return groups(rows, transform.groupby).map((group) => {
        const output = Object.create(null) as Record<string, DataValue>;
        for (const field of transform.groupby ?? []) output[field] = group[0]?.value[field];
        for (const cell of groups(group, [transform.field])) {
          const column = String(cell[0]?.value[transform.field] ?? 'null');
          safeField(column);
          output[column] = pivotAggregate(cell, transform.value, transform.op ?? 'first');
        }
        return {
          value: output,
          sources: [...new Set(group.flatMap((row) => row.sources))].sort((a, b) => a - b),
        };
      });
    case 'impute':
      return impute(rows, transform);
    case 'lookup': {
      const lookup = new Map(
        inputRows(transform.from).map((row) => [
          JSON.stringify(row.value[transform.key]),
          row.value,
        ]),
      );
      return rows.map((row) => {
        const match = lookup.get(JSON.stringify(row.value[transform.field]));
        const additions = Object.fromEntries(
          transform.values.map((field, index) => [
            transform.as?.[index] ?? field,
            match?.[field] ?? transform.default ?? null,
          ]),
        );
        return { ...row, value: { ...row.value, ...additions } };
      });
    }
    case 'quantile':
      return groups(rows, transform.groupby).flatMap((group) => {
        const input = values(group, transform.field).sort((a, b) => a - b);
        const sources = [...new Set(group.flatMap((row) => row.sources))].sort((a, b) => a - b);
        return (transform.probs ?? [0.25, 0.5, 0.75]).map((probability) => ({
          value: {
            ...Object.fromEntries(
              (transform.groupby ?? []).map((field) => [field, group[0]?.value[field]]),
            ),
            [transform.as[0]]: probability,
            [transform.as[1]]: quantileFromSorted(input, probability),
          },
          sources,
        }));
      });
    case 'sample': {
      if (transform.size >= rows.length) return [...rows];
      const random = seeded(transform.seed ?? 0);
      const reservoir = rows.slice(0, transform.size).map((row, index) => ({ row, index }));
      for (let index = transform.size; index < rows.length; index += 1) {
        const selected = Math.floor(random() * (index + 1));
        if (selected < transform.size) reservoir[selected] = { row: rows[index]!, index };
      }
      return reservoir.sort((a, b) => a.index - b.index).map(({ row }) => row);
    }
    case 'resample': {
      const output: WorkingRow[] = [];
      for (const group of groups(rows, transform.groupby)) {
        const ordered = sorted(group, [{ field: transform.field }]);
        const domain = extent(ordered, transform.field);
        if (domain === null) continue;
        const expected = Math.floor((domain[1] - domain[0]) / transform.interval) + 1;
        enforceWorkBudget(
          output.length + expected,
          maximumDerivedRows,
          'resample',
          '$.transform[].interval',
        );
        let cursor = 0;
        let before: WorkingRow | undefined;
        for (
          let x = domain[0];
          x <= domain[1] + transform.interval / 1e9;
          x += transform.interval
        ) {
          while (cursor < ordered.length) {
            const row = ordered[cursor]!;
            const value = numeric(row.value[transform.field]);
            if (value === null) {
              cursor += 1;
              continue;
            }
            if (value >= x) break;
            before = row;
            cursor += 1;
          }
          const candidate = ordered[cursor];
          const candidateValue =
            candidate === undefined ? null : numeric(candidate.value[transform.field]);
          const after = candidateValue !== null && candidateValue >= x ? candidate : undefined;
          const exact = after !== undefined && candidateValue === x ? after : undefined;
          if (exact !== undefined) {
            output.push(exact);
            continue;
          }
          const method = transform.method ?? 'linear';
          const base = method === 'next' ? after : before;
          if (base === undefined) continue;
          const value = { ...base.value, [transform.field]: x };
          if (method === 'linear' && before !== undefined && after !== undefined) {
            const bx = numeric(before.value[transform.field])!;
            const ax = numeric(after.value[transform.field])!;
            const ratio = ax === bx ? 0 : (x - bx) / (ax - bx);
            for (const field of new Set([
              ...Object.keys(before.value),
              ...Object.keys(after.value),
            ])) {
              if (field === transform.field) continue;
              const b = numeric(before.value[field]);
              const a = numeric(after.value[field]);
              if (b !== null && a !== null) value[field] = b + (a - b) * ratio;
            }
          }
          output.push({
            value,
            sources: [...new Set([...(before?.sources ?? []), ...(after?.sources ?? [])])].sort(
              (a, b) => a - b,
            ),
          });
        }
      }
      return output;
    }
    case 'timeUnit':
      return rows.map((row) => {
        const raw = row.value[transform.field];
        const timestamp = temporalTimestamp(raw, true);
        const date = timestamp === null ? undefined : new Date(timestamp);
        let result: DataValue = null;
        if (date !== undefined) {
          const utc = transform.utc ?? true;
          const value = (
            name: 'FullYear' | 'Month' | 'Date' | 'Day' | 'Hours' | 'Minutes' | 'Seconds',
          ) => date[`get${utc ? 'UTC' : ''}${name}`]();
          result =
            transform.unit === 'year'
              ? value('FullYear')
              : transform.unit === 'quarter'
                ? Math.floor(value('Month') / 3) + 1
                : transform.unit === 'month'
                  ? value('Month') + 1
                  : transform.unit === 'week'
                    ? Math.floor(
                        (Date.UTC(value('FullYear'), value('Month'), value('Date')) -
                          Date.UTC(value('FullYear'), 0, 1)) /
                          604800000,
                      ) + 1
                    : transform.unit === 'date'
                      ? value('Date')
                      : transform.unit === 'day'
                        ? value('Day')
                        : transform.unit === 'hours'
                          ? value('Hours')
                          : transform.unit === 'minutes'
                            ? value('Minutes')
                            : value('Seconds');
        }
        return { ...row, value: { ...row.value, [transform.as]: result } };
      });
  }
}

export function executeTransforms(
  input: DataInput,
  transforms: readonly TransformSpec[] = [],
  options: { readonly sourceId?: string } = {},
): TransformResult {
  const issues: { path: string; message: string }[] = [];
  validateTransforms(transforms, '$.transform', issues);
  if (issues.length > 0) {
    throw new GraflumeError('INVALID_SPEC', issues[0]!.message, {
      path: issues[0]!.path,
      details: { issues },
    });
  }
  const source = inputRows(input);
  let rows = source;
  const steps: TransformStepLineage[] = [];
  transforms.forEach((transform, index) => {
    const before = rows.length;
    const aggregationCount =
      transform.type === 'aggregate' ||
      transform.type === 'joinaggregate' ||
      transform.type === 'stack'
        ? groups(rows, transform.groupby).length
        : undefined;
    rows = apply(rows, transform);
    const detail =
      transform.type !== 'stack'
        ? undefined
        : transform.offset === 'normalize' || transform.offset === 'expand'
          ? 'Diverging normalization uses each bucket total absolute magnitude.'
          : transform.offset === 'wiggle'
            ? 'Wiggle uses a non-negative streamgraph baseline and rejects negative values.'
            : undefined;
    steps.push({
      index,
      type: transform.type,
      inputRows: before,
      outputRows: rows.length,
      parameters: jsonSafe(transform),
      ...(transform.type === 'sample' ? { seed: transform.seed ?? 0 } : {}),
      ...(aggregationCount === undefined ? {} : { aggregationCount }),
      ...(detail === undefined ? {} : { detail }),
    });
  });
  const sourceId = options.sourceId ?? 'data';
  return {
    data: rows.map(({ value }) => ({ ...value })),
    lineage: {
      sourceId,
      sourceRows: source.length,
      outputRows: rows.length,
      transforms: steps,
      rowSources: rows.map(({ sources }) => sources),
      summary: `${sourceId}: ${source.length} source rows, ${steps.length} ordered transforms, ${rows.length} output rows.${steps.flatMap(({ detail }) => (detail === undefined ? [] : [` ${detail}`])).join('')}`,
    },
  };
}

export const evaluateTransformExpression = evaluate;
