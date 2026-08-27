import { GraflumeError } from '../core/errors.js';
import { safeDateTimeFormatter, temporalTimestamp } from '../format/temporal.js';
import { summarizeNormalDistribution } from '../data/distribution.js';
import {
  kernelDensity1d,
  weightedHistogram,
  type HistogramNormalization,
  type WeightedObservation,
} from '../data/statistics.js';
import { inferFieldType } from '../data/infer.js';
import {
  aggregateOhlc,
  estimateInterval,
  navigatorWindow,
  type ExtendedHoursPolicy,
  type IntervalKind,
  type OhlcBucket,
} from '../data/family-analytics.js';
import { DataTable } from '../data/table.js';
import { prepareSeriesStackLayer, preparedSeriesStackFields } from '../data/series-stack.js';
import {
  prepareTechnicalIndicator,
  type TechnicalIndicatorCalculation,
} from '../data/technical-indicators.js';
import { executeTransformsWithNamedLineage } from '../data/dataflow.js';
import type { DataLineage } from '../data/transforms.js';
import { createPositionScale } from '../scale/registry.js';
import type { Scale } from '../scale/types.js';
import { domainForAxisWindow, type DomainAxisWindow } from '../interaction/domain-navigation.js';
import type {
  AxisId,
  FieldType,
  NormalizedChartSpec,
  NormalizedLayerSpec,
  ScaleType,
} from '../spec/types.js';
import { resolveDistributionMode } from '../spec/distribution.js';
import type { PlotArea } from './types.js';

export interface LayerData {
  readonly layer: NormalizedLayerSpec;
  readonly table: DataTable;
  readonly lineage: DataLineage;
  readonly xType: FieldType;
  readonly yType: FieldType;
  readonly xAxisId: AxisId;
  readonly yAxisId: AxisId;
  readonly xScale: Scale;
  readonly yScale: Scale;
  readonly technicalIndicator?: TechnicalIndicatorCalculation;
}

export interface ResolvedAxisScale {
  readonly id: AxisId;
  readonly channel: 'x' | 'y';
  readonly fieldType: FieldType;
  readonly scale: Scale;
  readonly layers: readonly LayerData[];
}

export interface ScaleResolution {
  readonly layers: readonly LayerData[];
  readonly axes: Readonly<Partial<Record<AxisId, ResolvedAxisScale>>>;
  /** Primary-axis compatibility aliases. Prefer `axes` and layer-local scales. */
  readonly xType: FieldType;
  readonly yType: FieldType;
  readonly xScale: Scale;
  readonly yScale: Scale;
}

interface PreparedLayerData {
  readonly layer: NormalizedLayerSpec;
  readonly table: DataTable;
  readonly lineage: DataLineage;
  readonly xType: FieldType;
  readonly yType: FieldType;
  readonly xAxisId: AxisId;
  readonly yAxisId: AxisId;
  readonly technicalIndicator?: TechnicalIndicatorCalculation;
}

const ADVANCED_CANDLESTICK_OPTIONS = Object.freeze([
  'aggregateIntervalMs',
  'timeZone',
  'sessionStartMinute',
  'sessionEndMinute',
  'tradingDays',
  'excludedDates',
  'includedDates',
  'extendedHours',
  'navigator',
  'navigatorStart',
  'navigatorEnd',
] as const);

function finiteMarkOption(layer: NormalizedLayerSpec, name: string): number | undefined {
  const value = layer.mark.options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function numberMarkArray(layer: NormalizedLayerSpec, name: string): number[] | undefined {
  const value = layer.mark.options[name];
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    ? [...value]
    : undefined;
}

function stringMarkArray(layer: NormalizedLayerSpec, name: string): string[] | undefined {
  const value = layer.mark.options[name];
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? [...value]
    : undefined;
}

function advancedCandlestick(layer: NormalizedLayerSpec): boolean {
  return (
    layer.mark.type === 'candlestick' &&
    ADVANCED_CANDLESTICK_OPTIONS.some((name) => layer.mark.options[name] !== undefined)
  );
}

function observedCandlestickInterval(layer: PreparedLayerData): number {
  const times = Array.from({ length: layer.table.length }, (_, index) =>
    layer.table.numericValue(index, layer.layer.x.field),
  )
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  const gaps = times
    .slice(1)
    .map((value, index) => value - times[index]!)
    .filter((value) => value > 0);
  return Math.max(1, Math.min(...gaps, 86_400_000));
}

function candlestickBuckets(layer: PreparedLayerData): readonly OhlcBucket[] {
  const mark = layer.layer.mark;
  const authoredExtended = mark.options.extendedHours;
  const extendedHours: ExtendedHoursPolicy =
    authoredExtended === 'exclude' || authoredExtended === 'separate'
      ? authoredExtended
      : 'include';
  const tradingDays = numberMarkArray(layer.layer, 'tradingDays');
  const excludedDates = stringMarkArray(layer.layer, 'excludedDates');
  const includedDates = stringMarkArray(layer.layer, 'includedDates');
  return aggregateOhlc(
    Array.from({ length: layer.table.length }, (_, rowIndex) => layer.table.row(rowIndex)),
    {
      timeField: layer.layer.x.field,
      openField: mark.fields.open ?? 'open',
      highField: mark.fields.high ?? 'high',
      lowField: mark.fields.low ?? 'low',
      closeField: mark.fields.close ?? layer.layer.y.field,
      ...(mark.fields.volume === undefined ? {} : { volumeField: mark.fields.volume }),
      intervalMs:
        finiteMarkOption(layer.layer, 'aggregateIntervalMs') ?? observedCandlestickInterval(layer),
      timeZone: typeof mark.options.timeZone === 'string' ? mark.options.timeZone : 'UTC',
      session: {
        startMinute: finiteMarkOption(layer.layer, 'sessionStartMinute') ?? 0,
        endMinute: finiteMarkOption(layer.layer, 'sessionEndMinute') ?? 1_440,
      },
      ...(tradingDays === undefined ? {} : { tradingDays }),
      ...(excludedDates === undefined ? {} : { excludedDates }),
      ...(includedDates === undefined ? {} : { includedDates }),
      extendedHours,
    },
  );
}

function visibleCandlestickBuckets(layer: PreparedLayerData): readonly OhlcBucket[] {
  const buckets = candlestickBuckets(layer);
  const [from, to] = navigatorWindow(
    buckets.length,
    finiteMarkOption(layer.layer, 'navigatorStart') ?? 0,
    finiteMarkOption(layer.layer, 'navigatorEnd') ?? buckets.length,
  );
  return buckets.slice(from, to);
}

function temporalInput(value: number | string | Date): number {
  if (value instanceof Date) return value.getTime();
  return typeof value === 'number' ? value : (temporalTimestamp(value, true) ?? Number.NaN);
}

function tradingScale(
  layer: PreparedLayerData,
  range: readonly [number, number],
  type: 'linear' | 'time' | 'utc',
  domainWindow?: DomainAxisWindow,
): Scale | null {
  let visible = [...visibleCandlestickBuckets(layer)];
  if (visible.length === 0) return null;
  if (domainWindow !== undefined) {
    const start = Math.floor(domainWindow.start * visible.length);
    const end = Math.max(start + 1, Math.ceil(domainWindow.end * visible.length));
    visible = visible.slice(start, Math.min(visible.length, end));
  }
  const timestamps = visible.map(({ time }) => time);
  const reverse = layer.layer.x.scale.reverse === true;
  const scaleRange = Object.freeze(reverse ? [range[1], range[0]] : [...range]) as readonly [
    number,
    number,
  ];
  const slot = (scaleRange[1] - scaleRange[0]) / timestamps.length;
  const positionForIndex = (index: number) => scaleRange[0] + (index + 0.5) * slot;
  const fractionalIndex = (timestamp: number): number => {
    if (timestamps.length === 1) return 0;
    if (timestamp <= timestamps[0]!) {
      const span = timestamps[1]! - timestamps[0]! || 1;
      return (timestamp - timestamps[0]!) / span;
    }
    const last = timestamps.length - 1;
    if (timestamp >= timestamps[last]!) {
      const span = timestamps[last]! - timestamps[last - 1]! || 1;
      return last + (timestamp - timestamps[last]!) / span;
    }
    let lower = 0;
    let upper = last;
    while (upper - lower > 1) {
      const middle = Math.floor((lower + upper) / 2);
      if (timestamps[middle]! <= timestamp) lower = middle;
      else upper = middle;
    }
    const span = timestamps[upper]! - timestamps[lower]! || 1;
    return lower + (timestamp - timestamps[lower]!) / span;
  };
  const rawDomain: readonly [number, number] =
    timestamps.length === 1
      ? [timestamps[0]! - 0.5, timestamps[0]! + 0.5]
      : [timestamps[0]!, timestamps.at(-1)!];
  const descriptor = Object.freeze({
    type,
    domain: Object.freeze([...rawDomain]),
    range: scaleRange,
    reverse,
    rangeDirection:
      scaleRange[1] < scaleRange[0] ? ('descending' as const) : ('ascending' as const),
    outOfBounds: 'extrapolate' as const,
  });
  const map = (value: number | string | Date): number => {
    const timestamp = temporalInput(value);
    return Number.isFinite(timestamp) ? positionForIndex(fractionalIndex(timestamp)) : Number.NaN;
  };
  const invert = (position: number): number => {
    const index = (position - scaleRange[0]) / slot - 0.5;
    if (timestamps.length === 1) return timestamps[0]!;
    const lower = Math.max(0, Math.min(timestamps.length - 2, Math.floor(index)));
    const amount = index - lower;
    return timestamps[lower]! + (timestamps[lower + 1]! - timestamps[lower]!) * amount;
  };
  const timeZone =
    typeof layer.layer.mark.options.timeZone === 'string'
      ? layer.layer.mark.options.timeZone
      : type === 'utc'
        ? 'UTC'
        : undefined;
  const interval = finiteMarkOption(layer.layer, 'aggregateIntervalMs') ?? 86_400_000;
  return Object.freeze({
    kind: type,
    bandwidth: Math.abs(slot),
    descriptor,
    domain: () => descriptor.domain,
    range: () => descriptor.range,
    map,
    invert,
    ticks: (count: number, locale?: string) => {
      const requested = Math.max(1, Math.floor(count));
      const step = Math.max(1, Math.ceil(timestamps.length / requested));
      const indices = timestamps
        .map((_timestamp, index) => index)
        .filter((index) => index % step === 0 || index === timestamps.length - 1);
      return indices.map((index) => {
        const value = timestamps[index]!;
        let label: string;
        if (type === 'linear')
          label = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
        else
          try {
            label = safeDateTimeFormatter(locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              ...(interval < 86_400_000 ? { hour: '2-digit', minute: '2-digit' } : {}),
              ...(timeZone === undefined ? {} : { timeZone }),
            }).format(new Date(value));
          } catch {
            label = new Date(value).toISOString();
          }
        return { value, label, position: map(value) };
      });
    },
  });
}

function typeFamily(type: FieldType): 'categorical' | 'numeric' | 'temporal' {
  if (type === 'nominal' || type === 'ordinal') return 'categorical';
  return type === 'temporal' ? 'temporal' : 'numeric';
}

function resolveCommonType(types: readonly FieldType[], axis: 'x' | 'y'): FieldType {
  const families = new Set(types.map(typeFamily));
  if (families.size > 1) {
    throw new GraflumeError(
      'INCOMPATIBLE_SCALE',
      `Layers use incompatible ${axis}-axis field types: ${[...families].join(', ')}.`,
      { path: `$.layers[].${axis}.type` },
    );
  }
  const first = types[0] ?? 'nominal';
  if (families.has('categorical')) return first === 'ordinal' ? 'ordinal' : 'nominal';
  return first;
}

function explicitNumericDomain(
  layers: readonly PreparedLayerData[],
  axis: 'x' | 'y',
): readonly [number, number] | null {
  for (const { layer } of layers) {
    const domain = layer[axis].scale.domain;
    if (domain?.length === 2 && typeof domain[0] === 'number' && typeof domain[1] === 'number') {
      return [domain[0], domain[1]];
    }
  }
  return null;
}

function numericDomain(
  layers: readonly PreparedLayerData[],
  axis: 'x' | 'y',
  fieldType: FieldType,
): readonly [number, number] {
  const explicit = explicitNumericDomain(layers, axis);
  if (explicit !== null) return explicit;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let includeZero = false;

  for (const { layer, table, technicalIndicator } of layers) {
    const encoding = layer[axis];
    const distributionMode =
      layer.mark.type === 'distribution' ? resolveDistributionMode(layer.mark.options.mode) : null;
    const densitySummary =
      distributionMode === 'curve'
        ? summarizeNormalDistribution(
            Array.from({ length: table.length }, (_, index) => {
              const value = table.value(index, layer.mark.fields.value ?? layer.y.field);
              return value instanceof Date ? value.getTime() : value;
            }).filter((value): value is number => typeof value === 'number'),
          )
        : null;
    const distributionObservations: WeightedObservation[] =
      distributionMode === 'kde' ||
      distributionMode === 'ecdf' ||
      distributionMode === 'ccdf' ||
      distributionMode === 'histogram'
        ? Array.from({ length: table.length }, (_, rowIndex) => {
            const field = layer.mark.fields.value ?? layer.x.field;
            const value = table.numericValue(rowIndex, field);
            const optionWeightField = layer.mark.options.weightField;
            const weightField =
              layer.mark.fields.weight ??
              (typeof optionWeightField === 'string' ? optionWeightField : undefined);
            const weight =
              weightField === undefined ? 1 : table.numericValue(rowIndex, weightField);
            return value === null || weight === null || weight < 0
              ? null
              : { value, weight, rowIndex };
          }).filter((value): value is WeightedObservation => value !== null)
        : [];
    const kde =
      distributionMode === 'kde'
        ? kernelDensity1d(distributionObservations, {
            points:
              typeof layer.mark.options.samples === 'number' ? layer.mark.options.samples : 96,
            ...(typeof layer.mark.options.bandwidth === 'number' && layer.mark.options.bandwidth > 0
              ? { bandwidth: layer.mark.options.bandwidth }
              : {}),
          })
        : null;
    const fields =
      densitySummary !== null ||
      (axis === 'y' &&
        (layer.mark.type === 'histogram' ||
          layer.mark.type === 'theme-river' ||
          distributionMode === 'histogram' ||
          distributionMode === 'kde' ||
          distributionMode === 'ecdf' ||
          distributionMode === 'ccdf'))
        ? []
        : [encoding.field];
    const rangeEncoding = axis === 'x' ? layer.encoding.x2 : layer.encoding.y2;
    if (rangeEncoding?.field !== undefined) fields.push(rangeEncoding.field);
    const stackFields = preparedSeriesStackFields(layer);
    const stackAxis =
      layer.mark.type === 'bar' && layer.mark.orientation === 'horizontal' ? 'x' : 'y';
    if (
      stackFields !== null &&
      axis === stackAxis &&
      table.has(stackFields.start) &&
      table.has(stackFields.end)
    ) {
      fields.splice(0, fields.length, stackFields.start, stackFields.end);
    }
    if (axis === 'x' && (layer.mark.type === 'timeline' || layer.mark.type === 'gantt')) {
      const authoredDomain = layer.mark.options.domain;
      if (
        Array.isArray(authoredDomain) &&
        authoredDomain.length === 2 &&
        authoredDomain.every((value) => typeof value === 'number' && Number.isFinite(value))
      ) {
        fields.splice(0, fields.length);
        min = Math.min(min, authoredDomain[0] as number, authoredDomain[1] as number);
        max = Math.max(max, authoredDomain[0] as number, authoredDomain[1] as number);
      } else fields.push(layer.mark.fields.end ?? 'end');
    }
    if (axis === 'x' && (layer.mark.type === 'lines' || layer.mark.type === 'custom')) {
      const x2 = layer.mark.fields.x2;
      if (x2 !== undefined) fields.push(x2);
    }
    if (axis === 'y' && layer.mark.type === 'candlestick') {
      fields.push(
        layer.mark.fields.open ?? 'open',
        layer.mark.fields.high ?? 'high',
        layer.mark.fields.low ?? 'low',
        layer.mark.fields.close ?? encoding.field,
      );
    }
    if (axis === 'y' && layer.mark.type === 'indicator' && technicalIndicator !== undefined) {
      const optionFields = Array.isArray(layer.mark.options.fields)
        ? layer.mark.options.fields.filter(
            (role): role is string =>
              typeof role === 'string' && technicalIndicator.outputs[role] !== undefined,
          )
        : [];
      const configuredFields = [
        layer.mark.fields.middle,
        layer.mark.fields.signal,
        layer.mark.fields.secondary,
      ].filter((field): field is string => field !== undefined && table.has(field));
      const renderedFields =
        optionFields.length > 0
          ? optionFields.map((role) =>
              role === 'value' ? layer.y.field : (layer.mark.fields[role] ?? role),
            )
          : configuredFields.length > 0
            ? configuredFields
            : [layer.y.field];
      for (const role of ['lower', 'upper']) {
        if (technicalIndicator.outputs[role] !== undefined) {
          renderedFields.push(layer.mark.fields[role] ?? role);
        }
      }
      fields.splice(0, fields.length, ...new Set(renderedFields));
    }
    if (
      axis === 'y' &&
      (layer.mark.type === 'financial' ||
        layer.mark.type === 'range' ||
        layer.mark.type === 'bullet' ||
        (layer.mark.type === 'indicator' && technicalIndicator === undefined) ||
        layer.mark.type === 'volume-profile')
    ) {
      fields.push(
        ...Object.entries(layer.mark.fields).flatMap(([role, field]) =>
          role.startsWith('__') ? [] : [field],
        ),
      );
      const optionFields = layer.mark.options.fields;
      if (Array.isArray(optionFields)) {
        fields.push(
          ...optionFields.filter(
            (field): field is string => typeof field === 'string' && field.trim() !== '',
          ),
        );
      }
    }
    if (axis === 'y' && (layer.mark.type === 'boxplot' || distributionMode === 'boxplot')) {
      const rawValueField = layer.mark.fields.value;
      if (rawValueField !== undefined) fields.push(rawValueField);
      fields.push(
        layer.mark.fields.min ?? layer.mark.fields.low ?? 'min',
        layer.mark.fields.q1 ?? 'q1',
        layer.mark.fields.median ?? encoding.field,
        layer.mark.fields.q3 ?? 'q3',
        layer.mark.fields.max ?? layer.mark.fields.high ?? 'max',
      );
    }
    if (axis === 'y' && (layer.mark.type === 'lines' || layer.mark.type === 'custom')) {
      const y2 = layer.mark.fields.y2;
      if (y2 !== undefined) fields.push(y2);
    }
    if (axis === 'y' && layer.mark.type === 'interval') {
      fields.push(layer.mark.fields.low ?? 'low', layer.mark.fields.high ?? 'high');
    }
    if (axis === 'y' && layer.mark.type === 'diff') {
      fields.push(
        layer.mark.fields.baseline ?? layer.mark.fields.old ?? 'old',
        layer.mark.fields.comparison ?? layer.mark.fields.new ?? encoding.field,
      );
    }
    if (layer.mark.type === 'image' && layer.mark.options.raster !== undefined) {
      const raster = layer.mark.options.raster;
      const extent =
        raster !== null && typeof raster === 'object' && !Array.isArray(raster)
          ? (raster as Readonly<Record<string, unknown>>).extent
          : undefined;
      if (
        Array.isArray(extent) &&
        extent.length === 4 &&
        extent.every((value) => typeof value === 'number' && Number.isFinite(value))
      ) {
        const first = axis === 'x' ? extent[0]! : extent[2]!;
        const second = axis === 'x' ? extent[1]! : extent[3]!;
        fields.splice(0, fields.length);
        min = Math.min(min, first, second);
        max = Math.max(max, first, second);
      }
    }

    for (const field of new Set(fields)) {
      if (!table.has(field)) continue;
      const extent = table.extent(field, fieldType === 'temporal');
      if (extent !== null) {
        min = Math.min(min, extent[0]);
        max = Math.max(max, extent[1]);
      }
    }

    const intervalOrientation =
      layer.mark.options.orientation === 'horizontal' ? 'horizontal' : 'vertical';
    const rawInterval =
      layer.mark.type === 'interval' &&
      (layer.mark.options.rawEstimator === true || typeof layer.mark.options.kind === 'string');
    const intervalValueAxis = intervalOrientation === 'vertical' ? 'y' : 'x';
    if (rawInterval && axis === intervalValueAxis) {
      const categoryField = intervalOrientation === 'vertical' ? layer.x.field : layer.y.field;
      const valueField = intervalOrientation === 'vertical' ? layer.y.field : layer.x.field;
      const grouped = new Map<string, number[]>();
      for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
        const key = table.value(rowIndex, categoryField);
        const value = table.numericValue(rowIndex, valueField);
        if (key === null || key === undefined || value === null) continue;
        const signature = key instanceof Date ? key.toISOString() : String(key);
        grouped.set(signature, [...(grouped.get(signature) ?? []), value]);
      }
      const authoredKind = layer.mark.options.kind;
      const kind: IntervalKind =
        authoredKind === 'PI' ||
        authoredKind === 'SE' ||
        authoredKind === 'SD' ||
        authoredKind === 'IQR' ||
        authoredKind === 'HDI'
          ? authoredKind
          : 'CI';
      for (const values of grouped.values()) {
        const interval = estimateInterval(values, {
          kind,
          confidence:
            typeof layer.mark.options.confidence === 'number'
              ? layer.mark.options.confidence
              : 0.95,
          estimator: layer.mark.options.estimator === 'median' ? 'median' : 'mean',
          orientation: intervalOrientation,
        });
        if (interval !== null) {
          min = Math.min(min, interval.low);
          max = Math.max(max, interval.high);
        }
      }
    }

    if (densitySummary !== null) {
      if (axis === 'x') {
        min = Math.min(min, densitySummary.domainMinimum);
        max = Math.max(max, densitySummary.domainMaximum);
      } else {
        min = Math.min(min, 0);
        max = Math.max(max, densitySummary.maximumDensity);
      }
    }

    if (kde !== null && kde.points.length > 0) {
      if (axis === 'x') {
        min = Math.min(min, kde.points[0]!.value);
        max = Math.max(max, kde.points.at(-1)!.value);
      } else {
        min = Math.min(min, 0);
        max = Math.max(max, ...kde.points.map(({ density }) => density));
      }
    }

    if (axis === 'y' && (distributionMode === 'ecdf' || distributionMode === 'ccdf')) {
      min = Math.min(min, 0);
      max = Math.max(max, 1);
    }

    if (axis === 'y' && (layer.mark.type === 'histogram' || distributionMode === 'histogram')) {
      const binCount = Math.max(
        1,
        Math.min(
          100,
          Math.floor(typeof layer.mark.options.bins === 'number' ? layer.mark.options.bins : 10),
        ),
      );
      const sourceExtent = table.extent(layer.x.field, layer.x.type === 'temporal');
      if (sourceExtent !== null) {
        const optionWeightField = layer.mark.options.weightField;
        const weightField =
          layer.mark.fields.weight ??
          (typeof optionWeightField === 'string' ? optionWeightField : undefined);
        const observations = Array.from({ length: table.length }, (_, rowIndex) => {
          const value = table.numericValue(rowIndex, layer.x.field);
          const weight = weightField === undefined ? 1 : table.numericValue(rowIndex, weightField);
          return value === null || weight === null || weight < 0
            ? null
            : { value, weight, rowIndex };
        }).filter((value): value is WeightedObservation => value !== null);
        const normalizationOption = layer.mark.options.normalization;
        const normalization: HistogramNormalization =
          normalizationOption === 'probability' ||
          normalizationOption === 'normalized' ||
          layer.mark.options.normalized === true
            ? 'probability'
            : normalizationOption === 'density'
              ? 'density'
              : 'count';
        const counts = weightedHistogram(observations, {
          bins: binCount,
          extent: sourceExtent,
          normalization,
          cumulative: layer.mark.options.cumulative === true,
        }).map(({ value }) => value);
        min = Math.min(min, 0);
        max = Math.max(max, ...counts);
      }
    }

    if (axis === 'y' && layer.mark.type === 'waterfall') {
      let total = 0;
      min = Math.min(min, 0);
      max = Math.max(max, 0);
      for (let index = 0; index < table.length; index += 1) {
        const value = table.numericValue(index, layer.y.field);
        if (value === null) continue;
        const previous = total;
        total += value;
        min = Math.min(min, previous, total);
        max = Math.max(max, previous, total);
      }
    }
    if (axis === 'y' && layer.mark.type === 'theme-river' && stackFields === null) {
      const totals = new Map<string, number>();
      for (let index = 0; index < table.length; index += 1) {
        const rawKey = table.value(index, layer.x.field);
        const key =
          rawKey instanceof Date
            ? `date:${rawKey.toISOString()}`
            : `${typeof rawKey}:${String(rawKey ?? '')}`;
        const value = table.numericValue(index, layer.y.field);
        if (value === null) continue;
        totals.set(key, (totals.get(key) ?? 0) + Math.max(0, value));
      }
      let maximumTotal = 1;
      for (const total of totals.values()) maximumTotal = Math.max(maximumTotal, total);
      min = Math.min(min, -maximumTotal / 2);
      max = Math.max(max, maximumTotal / 2);
    }
    const zeroCompatible = !['log', 'logit', 'probit'].includes(encoding.scale.type ?? '');
    if (
      zeroCompatible &&
      (encoding.scale.zero === true ||
        (axis === 'y' && layer.mark.options.missing === 'zero') ||
        (axis === 'y' &&
          (layer.mark.type === 'bar' ||
            layer.mark.type === 'area' ||
            layer.mark.type === 'bullet' ||
            layer.mark.type === 'cylinder' ||
            layer.mark.type === 'histogram' ||
            distributionMode === 'histogram' ||
            layer.mark.type === 'item' ||
            layer.mark.type === 'lollipop' ||
            layer.mark.type === 'packed-bubble' ||
            layer.mark.type === 'pareto' ||
            layer.mark.type === 'pictorial-bar' ||
            layer.mark.type === 'pyramid' ||
            layer.mark.type === 'solid-gauge' ||
            layer.mark.type === 'stepped-area' ||
            layer.mark.type === 'theme-river' ||
            layer.mark.type === 'variable-pie' ||
            layer.mark.type === 'variwide' ||
            layer.mark.type === 'volume-profile' ||
            layer.mark.type === 'waterfall')) ||
        (axis === 'x' && layer.mark.type === 'bar' && layer.mark.orientation === 'horizontal'))
    ) {
      includeZero = true;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new GraflumeError(
      'INVALID_DATA',
      `No numeric values are available for the ${axis}-axis.`,
      {
        path: `$.layers[].${axis}.field`,
      },
    );
  }

  if (includeZero && fieldType !== 'temporal') {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    const delta = min === 0 ? 1 : Math.abs(min) * 0.05;
    min -= delta;
    max += delta;
  }
  return [min, max];
}

function categoricalDomain(
  layers: readonly PreparedLayerData[],
  axis: 'x' | 'y',
): readonly string[] {
  const seen = new Set<string>();
  const domain: string[] = [];
  for (const { layer, table } of layers) {
    const explicit = layer[axis].scale.domain;
    const rangeEncoding = axis === 'x' ? layer.encoding.x2 : layer.encoding.y2;
    const values = explicit?.map(String) ?? [
      ...table.unique(layer[axis].field),
      ...(rangeEncoding?.field === undefined ? [] : table.unique(rangeEncoding.field)),
    ];
    for (const value of values) {
      if (seen.has(value)) continue;
      seen.add(value);
      domain.push(value);
    }
  }
  return domain;
}

function resolveAxisScale(
  id: AxisId,
  channel: 'x' | 'y',
  layers: readonly PreparedLayerData[],
  plot: PlotArea,
  domainWindow?: DomainAxisWindow,
): Omit<ResolvedAxisScale, 'layers'> {
  const fieldType = resolveCommonType(
    layers.map((layer) => (channel === 'x' ? layer.xType : layer.yType)),
    channel,
  );
  const firstEncoding = layers[0]?.layer[channel];
  const requestedScaleTypes = new Set(
    layers
      .map((layer) => layer.layer[channel].scale.type)
      .filter((type): type is ScaleType => type !== undefined),
  );
  if (requestedScaleTypes.size > 1) {
    throw new GraflumeError(
      'INCOMPATIBLE_SCALE',
      `Layers bound to ${id} request incompatible scale types: ${[...requestedScaleTypes].join(
        ', ',
      )}.`,
      { path: `$.layers[].${channel}.scale.type` },
    );
  }
  const requestedScaleType = [...requestedScaleTypes][0];
  const family = typeFamily(fieldType);
  const continuousAxisTypes = new Set<ScaleType>([
    'linear',
    'log',
    'symlog',
    'asinh',
    'pow',
    'sqrt',
    'time',
    'utc',
    'probability',
    'logit',
    'probit',
  ]);
  if (
    (requestedScaleType !== undefined &&
      !continuousAxisTypes.has(requestedScaleType) &&
      requestedScaleType !== 'band' &&
      requestedScaleType !== 'point') ||
    ((requestedScaleType === 'band' || requestedScaleType === 'point') &&
      family !== 'categorical') ||
    (requestedScaleType !== undefined &&
      continuousAxisTypes.has(requestedScaleType) &&
      requestedScaleType !== 'time' &&
      requestedScaleType !== 'utc' &&
      family !== 'numeric') ||
    ((requestedScaleType === 'time' || requestedScaleType === 'utc') && family !== 'temporal')
  ) {
    throw new GraflumeError(
      'INCOMPATIBLE_SCALE',
      `Scale type "${requestedScaleType}" is incompatible with the ${id} field type "${fieldType}".`,
      { path: `$.layers[].${channel}.scale.type` },
    );
  }
  const categorical =
    requestedScaleType === 'band' || requestedScaleType === 'point' || family === 'categorical';

  let scale: Scale;
  let usesTradingScale = false;
  if (categorical) {
    const domain = categoricalDomain(layers, channel);
    scale = createPositionScale(firstEncoding?.scale ?? {}, {
      type: requestedScaleType === 'point' ? 'point' : 'band',
      domain,
      range: channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y, plot.y + plot.height],
    });
  } else {
    const normalRange: readonly [number, number] =
      channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
    // Portable temporal encodings default to UTC so the same function-free
    // spec produces identical ticks and snapshots in every host time zone.
    // Authors who need civil-time semantics can still request `time`
    // explicitly; the registry keeps that scale's local-zone behavior.
    const type = requestedScaleType ?? (fieldType === 'temporal' ? 'utc' : 'linear');
    if (!continuousAxisTypes.has(type)) {
      throw new GraflumeError(
        'INCOMPATIBLE_SCALE',
        `Scale type "${type}" cannot be used as a Cartesian position scale.`,
        { path: `$.layers[].${channel}.scale.type` },
      );
    }
    const tradingLayer =
      channel === 'x' ? layers.find(({ layer }) => advancedCandlestick(layer)) : undefined;
    const resolvedTradingScale =
      tradingLayer === undefined || (type !== 'linear' && type !== 'time' && type !== 'utc')
        ? null
        : tradingScale(tradingLayer, normalRange, type, domainWindow);
    if (resolvedTradingScale === null) {
      scale = createPositionScale(firstEncoding?.scale ?? {}, {
        type: type as import('../scale/types.js').PositionScaleType,
        domain: numericDomain(layers, channel, fieldType),
        range: normalRange,
      });
    } else {
      scale = resolvedTradingScale;
      usesTradingScale = true;
    }
  }

  if (domainWindow !== undefined && !usesTradingScale) {
    const domain = domainForAxisWindow(scale, domainWindow);
    const range: readonly [number, number] =
      channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
    scale = createPositionScale(
      { ...(firstEncoding?.scale ?? {}), domain },
      { type: scale.kind, domain, range },
    );
  }

  return { id, channel, fieldType, scale };
}

export function resolveScales(
  spec: NormalizedChartSpec,
  plot: PlotArea,
  domainWindows: Readonly<Partial<Record<AxisId, DomainAxisWindow>>> = {},
): ScaleResolution {
  const preparedLayers: PreparedLayerData[] = spec.layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      const stacked = prepareSeriesStackLayer(layer);
      const preparedLayer = stacked?.layer ?? layer;
      const transformed = executeTransformsWithNamedLineage(
        preparedLayer.data,
        preparedLayer.transform,
        `layer:${layer.id}`,
      );
      const indicator = prepareTechnicalIndicator(preparedLayer, transformed);
      const resolvedLayer = indicator.layer;
      const table = DataTable.from(indicator.result.data);
      return {
        layer: resolvedLayer,
        table,
        lineage: indicator.result.lineage,
        xType: resolvedLayer.x.type ?? inferFieldType(table, resolvedLayer.x.field),
        yType: resolvedLayer.y.type ?? inferFieldType(table, resolvedLayer.y.field),
        xAxisId: resolvedLayer.x.axisId,
        yAxisId: resolvedLayer.y.axisId,
        ...(indicator.calculation === null ? {} : { technicalIndicator: indicator.calculation }),
      };
    });

  if (preparedLayers.length === 0) {
    throw new GraflumeError('INVALID_SPEC', 'At least one visible layer is required.', {
      path: '$.layers',
    });
  }

  const grouped = new Map<AxisId, PreparedLayerData[]>();
  for (const layer of preparedLayers) {
    for (const id of [layer.xAxisId, layer.yAxisId] as const) {
      const entries = grouped.get(id) ?? [];
      entries.push(layer);
      grouped.set(id, entries);
    }
  }

  const partialAxes: Partial<Record<AxisId, Omit<ResolvedAxisScale, 'layers'>>> = {};
  for (const [id, entries] of grouped) {
    if (entries === undefined || entries.length === 0) continue;
    const channel = entries[0]!.xAxisId === id ? 'x' : 'y';
    if (entries.some((entry) => (channel === 'x' ? entry.xAxisId : entry.yAxisId) !== id)) {
      throw new GraflumeError('INVALID_SPEC', `Axis "${id}" is bound across Cartesian channels.`, {
        path: '$.layers',
      });
    }
    partialAxes[id] = resolveAxisScale(id, channel, entries, plot, domainWindows[id]);
  }

  const layers: LayerData[] = preparedLayers.map((layer) => {
    const xResolved = partialAxes[layer.xAxisId];
    const yResolved = partialAxes[layer.yAxisId];
    if (xResolved === undefined || yResolved === undefined) {
      throw new GraflumeError('INVALID_SPEC', 'Unable to resolve layer axis scales.', {
        path: `$.layers[${layer.layer.id}]`,
      });
    }
    return {
      ...layer,
      xScale: xResolved.scale,
      yScale: yResolved.scale,
    };
  });

  const axes: Partial<Record<AxisId, ResolvedAxisScale>> = {};
  for (const [id, resolved] of Object.entries(partialAxes)) {
    if (resolved === undefined) continue;
    axes[id] = {
      ...resolved,
      layers: layers.filter((layer) =>
        resolved.channel === 'x' ? layer.xAxisId === id : layer.yAxisId === id,
      ),
    };
  }

  const resolvedX = axes.x ?? Object.values(axes).find((axis) => axis?.channel === 'x');
  const resolvedY = axes.y ?? Object.values(axes).find((axis) => axis?.channel === 'y');
  if (resolvedX === undefined || resolvedY === undefined) {
    throw new GraflumeError('INVALID_SPEC', 'Both x and y scales are required.', {
      path: '$.layers',
    });
  }

  return {
    layers,
    axes,
    xType: resolvedX.fieldType,
    yType: resolvedY.fieldType,
    xScale: resolvedX.scale,
    yScale: resolvedY.scale,
  };
}
