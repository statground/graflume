import { GraflumeError } from '../core/errors.js';
import { parseTemporalValue, temporalTimestamp } from '../format/temporal.js';
import type { DataInput, DataRow, DataValue, FieldType } from '../spec/types.js';
import { DataTable } from './table.js';

const unsafeFields = new Set(['__proto__', 'prototype', 'constructor']);

function fieldName(value: string, path: string): string {
  if (value.trim() === '' || unsafeFields.has(value)) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be a safe non-empty field name.`, {
      path,
    });
  }
  return value;
}

function rowsFrom(input: DataInput): readonly DataRow[] {
  const table = DataTable.from(input);
  return Array.from({ length: table.length }, (_, index) => table.row(index));
}

function finite(value: DataValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function timestamp(value: DataValue, path: string): number {
  const resolved = temporalTimestamp(value, true) ?? Number.NaN;
  if (!Number.isFinite(resolved)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite timestamp.`, { path });
  }
  return resolved;
}

function positiveInteger(value: number, path: string, maximum = 100_000): number {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be an integer from 1 to ${maximum}.`, {
      path,
    });
  }
  return value;
}

function quantile(sorted: readonly number[], probability: number): number | null {
  if (sorted.length === 0) return null;
  const position = Math.max(0, Math.min(1, probability)) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
}

/** Exact weighted-count contract used by bars, histograms, and grouped summaries. */
export function weightedCount(input: DataInput, weightField?: string): number {
  const rows = rowsFrom(input);
  if (weightField === undefined) return rows.length;
  fieldName(weightField, '$.weightField');
  return rows.reduce((sum, row, index) => {
    const weight = finite(row[weightField]);
    if (weight === null || weight < 0) {
      throw new GraflumeError(
        'INVALID_DATA',
        `Weight at row ${index} must be a finite non-negative number.`,
        { path: `$.data[${index}].${weightField}` },
      );
    }
    return sum + weight;
  }, 0);
}

export type BubbleZeroPolicy = 'hide' | 'minimum' | 'zero';
export type BubbleNegativePolicy = 'reject' | 'absolute' | 'hide';

export interface AreaRadiusOptions {
  readonly minRadius?: number;
  readonly maxRadius?: number;
  readonly zero?: BubbleZeroPolicy;
  readonly negative?: BubbleNegativePolicy;
}

export interface AreaSizeGuideEntry {
  readonly value: number;
  readonly radius: number;
  readonly area: number;
}

function normalizedAreaValue(
  value: number,
  zero: BubbleZeroPolicy,
  negative: BubbleNegativePolicy,
): number | null {
  if (!Number.isFinite(value)) return null;
  if (value < 0) {
    if (negative === 'reject') {
      throw new GraflumeError('INVALID_DATA', 'Negative bubble sizes require an explicit policy.');
    }
    if (negative === 'hide') return null;
    return Math.abs(value);
  }
  if (value === 0 && zero === 'hide') return null;
  return value;
}

/** Maps a quantitative value so visual circle area, rather than radius, is proportional. */
export function areaRadius(
  value: number,
  domain: readonly [number, number],
  options: AreaRadiusOptions = {},
): number | null {
  const minimum = options.minRadius ?? 3;
  const maximum = options.maxRadius ?? 24;
  if (![minimum, maximum, domain[0], domain[1]].every(Number.isFinite) || minimum < 0) {
    throw new GraflumeError('INVALID_SPEC', 'Bubble radius and domain values must be finite.');
  }
  if (maximum < minimum || domain[1] < domain[0]) {
    throw new GraflumeError('INVALID_SPEC', 'Bubble ranges and domains must be ascending.');
  }
  const normalized = normalizedAreaValue(
    value,
    options.zero ?? 'minimum',
    options.negative ?? 'reject',
  );
  if (normalized === null) return null;
  if (normalized === 0 && (options.zero ?? 'minimum') === 'zero') return 0;
  const lower = Math.max(0, domain[0]);
  const upper = Math.max(lower, domain[1]);
  const ratio =
    upper === lower ? 0.5 : Math.max(0, Math.min(1, (normalized - lower) / (upper - lower)));
  const minimumArea = Math.PI * minimum * minimum;
  const maximumArea = Math.PI * maximum * maximum;
  return Math.sqrt((minimumArea + ratio * (maximumArea - minimumArea)) / Math.PI);
}

/** Generates an explicit, truthful size guide from the same absolute-area scale. */
export function areaSizeGuide(
  domain: readonly [number, number],
  options: AreaRadiusOptions & { readonly count?: number } = {},
): readonly AreaSizeGuideEntry[] {
  const count = positiveInteger(options.count ?? 3, '$.count', 12);
  return Array.from({ length: count }, (_, index) => {
    const value =
      count === 1 ? domain[1] : domain[0] + ((domain[1] - domain[0]) * index) / (count - 1);
    const radius = areaRadius(value, domain, options) ?? 0;
    return { value, radius, area: Math.PI * radius * radius };
  });
}

export type CalendarMode = 'year' | 'month' | 'week' | 'day';
export type CalendarMissingPolicy = 'gap' | 'zero' | 'explicit';

export interface CalendarLocaleOptions {
  readonly locale?: string;
  /** 0 is Sunday and 6 is Saturday. Explicit values override the locale. */
  readonly weekStart?: number;
  readonly timeZone?: string;
}

export interface CalendarOptions extends CalendarLocaleOptions {
  readonly dateField: string;
  readonly valueField?: string;
  readonly mode?: CalendarMode;
  readonly missing?: CalendarMissingPolicy;
  readonly start?: string | number | Date;
  readonly end?: string | number | Date;
}

export interface CalendarWeekdayLabel {
  /** 0 is Sunday and 6 is Saturday. */
  readonly weekday: number;
  readonly label: string;
}

export interface CalendarCell {
  readonly key: string;
  readonly date: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly weekday: number;
  readonly weekIndex: number;
  readonly monthBoundary: boolean;
  readonly leapDay: boolean;
  readonly value: number | null;
  readonly sourceRows: readonly number[];
}

interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly weekday: number;
}

interface RuntimeLocale {
  readonly region?: string;
  readonly weekInfo?: { readonly firstDay?: number };
  readonly getWeekInfo?: () => { readonly firstDay?: number };
  readonly maximize?: () => RuntimeLocale;
}

type RuntimeLocaleConstructor = new (locale: string) => RuntimeLocale;

// Stable CLDR-derived fallback rules for engines without Intl.Locale week information.
const saturdayFirstRegions = new Set([
  'AF',
  'BH',
  'DJ',
  'DZ',
  'EG',
  'IQ',
  'IR',
  'JO',
  'KW',
  'LY',
  'OM',
  'QA',
  'SD',
  'SY',
]);
const sundayFirstRegions = new Set([
  'AG',
  'AS',
  'BD',
  'BR',
  'BS',
  'BT',
  'BW',
  'BZ',
  'CA',
  'CN',
  'CO',
  'DM',
  'DO',
  'ET',
  'GT',
  'GU',
  'HK',
  'HN',
  'ID',
  'IL',
  'IN',
  'JM',
  'JP',
  'KE',
  'KH',
  'KR',
  'LA',
  'MH',
  'MM',
  'MO',
  'MT',
  'MX',
  'MZ',
  'NI',
  'NP',
  'PA',
  'PE',
  'PH',
  'PK',
  'PR',
  'PT',
  'PY',
  'SA',
  'SG',
  'SV',
  'TH',
  'TT',
  'TW',
  'UM',
  'US',
  'VE',
  'VI',
  'WS',
  'YE',
  'ZA',
  'ZW',
]);

function explicitCalendarWeekStart(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    throw new GraflumeError('INVALID_SPEC', '$.weekStart must be an integer from 0 to 6.', {
      path: '$.weekStart',
    });
  }
  return value;
}

function canonicalCalendarLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? locale;
  } catch {
    throw new GraflumeError('INVALID_SPEC', `Unsupported calendar locale "${locale}".`, {
      path: '$.locale',
    });
  }
}

function localeRegion(
  locale: string,
  runtimeLocale: RuntimeLocale | undefined,
): string | undefined {
  const runtimeRegion = runtimeLocale?.region ?? runtimeLocale?.maximize?.().region;
  if (runtimeRegion !== undefined) return runtimeRegion.toUpperCase();
  return locale
    .split('-')
    .slice(1)
    .find((part) => /^(?:[A-Z]{2}|\d{3})$/u.test(part.toUpperCase()))
    ?.toUpperCase();
}

/** Resolves the locale's first weekday, while always honoring an explicit override. */
export function calendarWeekStart(options: CalendarLocaleOptions = {}): number {
  const explicit = explicitCalendarWeekStart(options.weekStart);
  if (explicit !== undefined) return explicit;
  if (options.locale === undefined) return 1;
  const canonical = canonicalCalendarLocale(options.locale);
  const LocaleConstructor = (Intl as unknown as { readonly Locale?: RuntimeLocaleConstructor })
    .Locale;
  let runtimeLocale: RuntimeLocale | undefined;
  if (LocaleConstructor !== undefined) {
    try {
      runtimeLocale = new LocaleConstructor(canonical);
    } catch {
      throw new GraflumeError('INVALID_SPEC', `Unsupported calendar locale "${options.locale}".`, {
        path: '$.locale',
      });
    }
    const info = runtimeLocale.getWeekInfo?.() ?? runtimeLocale.weekInfo;
    const firstDay = info?.firstDay;
    if (firstDay !== undefined && Number.isInteger(firstDay) && firstDay >= 1 && firstDay <= 7) {
      return firstDay % 7;
    }
  }
  const region = localeRegion(canonical, runtimeLocale);
  if (region === 'MV') return 5;
  if (region !== undefined && saturdayFirstRegions.has(region)) return 6;
  if (region !== undefined && sundayFirstRegions.has(region)) return 0;
  return 1;
}

function civilDate(epoch: number, timeZone: string): CivilDate {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).formatToParts(epoch);
  } catch {
    throw new GraflumeError('INVALID_SPEC', `Unsupported calendar time zone "${timeZone}".`, {
      path: '$.timeZone',
    });
  }
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekdays = new Map([
    ['Sun', 0],
    ['Mon', 1],
    ['Tue', 2],
    ['Wed', 3],
    ['Thu', 4],
    ['Fri', 5],
    ['Sat', 6],
  ]);
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    weekday: weekdays.get(value('weekday')) ?? 0,
  };
}

/** Produces localized short weekday headers in the same order used by calendar cells. */
export function calendarWeekdayLabels(
  options: CalendarLocaleOptions = {},
): readonly CalendarWeekdayLabel[] {
  const weekStart = calendarWeekStart(options);
  const timeZone = options.timeZone ?? 'UTC';
  // Validate the zone independently so locale failures retain their own diagnostic path.
  civilDate(Date.UTC(2024, 0, 7, 12), timeZone);
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat(options.locale ?? 'en', {
      weekday: 'short',
      timeZone,
    });
  } catch {
    throw new GraflumeError(
      'INVALID_SPEC',
      `Unsupported calendar locale "${options.locale ?? 'en'}".`,
      { path: '$.locale' },
    );
  }
  const labels = new Map<number, string>();
  const anchor = Date.UTC(2024, 0, 7, 12);
  for (let offset = 0; offset < 14 && labels.size < 7; offset += 1) {
    const epoch = anchor + offset * 86_400_000;
    labels.set(civilDate(epoch, timeZone).weekday, formatter.format(epoch));
  }
  return Array.from({ length: 7 }, (_, row) => {
    const weekday = (weekStart + row) % 7;
    return { weekday, label: labels.get(weekday) ?? String(weekday) };
  });
}

function dateKey(date: Pick<CivilDate, 'year' | 'month' | 'day'>): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function utcNoon(date: Pick<CivilDate, 'year' | 'month' | 'day'>): number {
  return Date.UTC(date.year, date.month - 1, date.day, 12);
}

/** Produces locale-week-aware cells and explicit missing/zero/leap/month-boundary semantics. */
export function calendarCells(input: DataInput, options: CalendarOptions): readonly CalendarCell[] {
  const dateField = fieldName(options.dateField, '$.dateField');
  const valueField =
    options.valueField === undefined ? undefined : fieldName(options.valueField, '$.valueField');
  const weekStart = calendarWeekStart(options);
  const timeZone = options.timeZone ?? 'UTC';
  const rows = rowsFrom(input);
  const grouped = new Map<string, { date: CivilDate; values: number[]; sourceRows: number[] }>();
  rows.forEach((row, rowIndex) => {
    const date = civilDate(timestamp(row[dateField], `$.data[${rowIndex}].${dateField}`), timeZone);
    const key = dateKey(date);
    const bucket = grouped.get(key) ?? { date, values: [], sourceRows: [] };
    const value = valueField === undefined ? 1 : finite(row[valueField]);
    if (value !== null) bucket.values.push(value);
    bucket.sourceRows.push(rowIndex);
    grouped.set(key, bucket);
  });
  const observed = [...grouped.values()].sort((a, b) => utcNoon(a.date) - utcNoon(b.date));
  if (observed.length === 0) return [];
  const startCivil =
    options.start === undefined
      ? observed[0]!.date
      : civilDate(timestamp(options.start, '$.start'), timeZone);
  const endCivil =
    options.end === undefined
      ? observed.at(-1)!.date
      : civilDate(timestamp(options.end, '$.end'), timeZone);
  let start = utcNoon(startCivil);
  let end = utcNoon(endCivil);
  if (end < start) {
    throw new GraflumeError('INVALID_SPEC', '$.end must be at or after $.start.');
  }
  const mode = options.mode ?? 'year';
  if (mode === 'year') {
    start = Date.UTC(startCivil.year, 0, 1, 12);
    end = Date.UTC(endCivil.year, 11, 31, 12);
  } else if (mode === 'month') {
    start = Date.UTC(startCivil.year, startCivil.month - 1, 1, 12);
    end = Date.UTC(endCivil.year, endCivil.month, 0, 12);
  } else if (mode === 'week') {
    start -= ((startCivil.weekday - weekStart + 7) % 7) * 86_400_000;
    end += ((weekStart + 6 - endCivil.weekday + 7) % 7) * 86_400_000;
  }
  const maximumCells = 3_662;
  const count = Math.floor((end - start) / 86_400_000) + 1;
  if (count > maximumCells) {
    throw new GraflumeError(
      'INVALID_DATA',
      `Calendar range has ${count} days; the deterministic limit is ${maximumCells}.`,
    );
  }
  const first = civilDate(start, 'UTC');
  const firstWeekday = first.weekday;
  const missing = options.missing ?? 'gap';
  return Array.from({ length: count }, (_, index) => {
    const date = civilDate(start + index * 86_400_000, 'UTC');
    const key = dateKey(date);
    const bucket = grouped.get(key);
    const value =
      bucket === undefined
        ? missing === 'zero'
          ? 0
          : null
        : bucket.values.length === 0
          ? null
          : bucket.values.reduce((sum, item) => sum + item, 0);
    return {
      key,
      date: key,
      year: date.year,
      month: date.month,
      day: date.day,
      weekday: date.weekday,
      weekIndex: Math.floor((((firstWeekday - weekStart + 7) % 7) + index) / 7),
      monthBoundary: date.day === 1,
      leapDay: date.month === 2 && date.day === 29,
      value,
      sourceRows: bucket?.sourceRows ?? [],
    };
  });
}

export type ExtendedHoursPolicy = 'include' | 'exclude' | 'separate';

export interface OhlcAggregationOptions {
  readonly timeField: string;
  readonly priceField?: string;
  readonly openField?: string;
  readonly highField?: string;
  readonly lowField?: string;
  readonly closeField?: string;
  readonly volumeField?: string;
  readonly intervalMs: number;
  readonly timeZone?: string;
  readonly session?: { readonly startMinute: number; readonly endMinute: number };
  /** Local trading weekdays, Sunday=0. Defaults to Monday-Friday. */
  readonly tradingDays?: readonly number[];
  /** Portable local civil-date calendar overrides (`YYYY-MM-DD`). */
  readonly excludedDates?: readonly string[];
  readonly includedDates?: readonly string[];
  readonly extendedHours?: ExtendedHoursPolicy;
}

export interface OhlcBucket {
  readonly time: number;
  readonly tradingIndex: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly extended: boolean;
  readonly sourceRows: readonly number[];
}

interface LocalTradingTime {
  readonly minute: number;
  readonly civilEpoch: number;
  readonly dayEpoch: number;
  readonly offset: number;
}

function localTradingTime(epoch: number, timeZone: string): LocalTradingTime {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(epoch);
  } catch {
    throw new GraflumeError('INVALID_SPEC', `Unsupported trading time zone "${timeZone}".`);
  }
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? 0);
  const second = Number(parts.find((part) => part.type === 'second')?.value ?? 0);
  const millisecond = ((epoch % 1_000) + 1_000) % 1_000;
  const dayEpoch = Date.UTC(year, month - 1, day);
  const civilEpoch = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  return {
    minute: hour * 60 + minute,
    civilEpoch,
    dayEpoch,
    offset: civilEpoch - epoch,
  };
}

function civilDateKey(dayEpoch: number): string {
  return new Date(dayEpoch).toISOString().slice(0, 10);
}

function dateSet(values: readonly string[] | undefined, path: string): ReadonlySet<string> {
  const output = new Set<string>();
  (values ?? []).forEach((value, index) => {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || parseTemporalValue(value) === null)
      throw new GraflumeError('INVALID_SPEC', `${path}[${index}] must be YYYY-MM-DD.`);
    output.add(value);
  });
  return output;
}

/** Aggregates ticks or precomputed OHLC rows into deterministic, gapless trading buckets. */
export function aggregateOhlc(
  input: DataInput,
  options: OhlcAggregationOptions,
): readonly OhlcBucket[] {
  const timeField = fieldName(options.timeField, '$.timeField');
  const priceField = options.priceField;
  const openField = options.openField ?? 'open';
  const highField = options.highField ?? 'high';
  const lowField = options.lowField ?? 'low';
  const closeField = options.closeField ?? priceField ?? 'close';
  const volumeField = options.volumeField;
  [priceField, openField, highField, lowField, closeField, volumeField]
    .filter((field): field is string => field !== undefined)
    .forEach((field) => fieldName(field, '$.fields'));
  const intervalMs = positiveInteger(options.intervalMs, '$.intervalMs', 31_536_000_000);
  const timeZone = options.timeZone ?? 'UTC';
  const session = options.session ?? { startMinute: 9 * 60 + 30, endMinute: 16 * 60 };
  if (
    !Number.isInteger(session.startMinute) ||
    !Number.isInteger(session.endMinute) ||
    session.startMinute < 0 ||
    session.endMinute > 1_440 ||
    session.endMinute === session.startMinute
  ) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Trading session minutes must form a non-empty same-day or overnight range.',
    );
  }
  const tradingDays = options.tradingDays ?? [1, 2, 3, 4, 5];
  if (
    tradingDays.length === 0 ||
    new Set(tradingDays).size !== tradingDays.length ||
    tradingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  )
    throw new GraflumeError('INVALID_SPEC', '$.tradingDays must contain unique weekdays 0..6.');
  const openWeekdays = new Set(tradingDays);
  const excludedDates = dateSet(options.excludedDates, '$.excludedDates');
  const includedDates = dateSet(options.includedDates, '$.includedDates');
  const overnight = session.endMinute < session.startMinute;
  const policy = options.extendedHours ?? 'exclude';
  const points = rowsFrom(input)
    .map((row, rowIndex) => {
      const time = timestamp(row[timeField], `$.data[${rowIndex}].${timeField}`);
      const price = priceField === undefined ? null : finite(row[priceField]);
      const open = price ?? finite(row[openField]);
      const high = price ?? finite(row[highField]);
      const low = price ?? finite(row[lowField]);
      const close = price ?? finite(row[closeField]);
      const volume = volumeField === undefined ? 0 : (finite(row[volumeField]) ?? 0);
      if (open === null || high === null || low === null || close === null) return null;
      const local = localTradingTime(time, timeZone);
      const regular = overnight
        ? local.minute >= session.startMinute || local.minute < session.endMinute
        : local.minute >= session.startMinute && local.minute < session.endMinute;
      const tradingDayEpoch =
        overnight && local.minute < session.endMinute
          ? local.dayEpoch - 86_400_000
          : local.dayEpoch;
      const tradingDate = civilDateKey(tradingDayEpoch);
      const calendarOpen =
        !excludedDates.has(tradingDate) &&
        (includedDates.has(tradingDate) || openWeekdays.has(new Date(tradingDayEpoch).getUTCDay()));
      if (!calendarOpen) return null;
      const anchor = tradingDayEpoch + session.startMinute * 60_000;
      const bucketLocal =
        intervalMs >= 86_400_000
          ? Math.floor(anchor / intervalMs) * intervalMs
          : anchor + Math.floor((local.civilEpoch - anchor) / intervalMs) * intervalMs;
      const bucket = bucketLocal - local.offset;
      return {
        time,
        bucket,
        open,
        high,
        low,
        close,
        volume,
        extended: !regular,
        rowIndex,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null)
    .filter((point) => policy !== 'exclude' || !point.extended)
    .sort((a, b) => a.time - b.time || a.rowIndex - b.rowIndex);
  const buckets = new Map<string, typeof points>();
  for (const point of points) {
    const key = `${point.bucket}:${policy === 'separate' ? point.extended : false}`;
    const group = buckets.get(key) ?? [];
    group.push(point);
    buckets.set(key, group);
  }
  return [...buckets.entries()]
    .map(([key, group]) => ({ bucket: Number(key.split(':')[0]), group }))
    .sort(
      (a, b) => a.bucket - b.bucket || Number(a.group[0]!.extended) - Number(b.group[0]!.extended),
    )
    .map(({ bucket, group }, tradingIndex) => ({
      time: bucket,
      tradingIndex,
      open: group[0]!.open,
      high: Math.max(...group.map((point) => point.high)),
      low: Math.min(...group.map((point) => point.low)),
      close: group.at(-1)!.close,
      volume: group.reduce((sum, point) => sum + point.volume, 0),
      extended: group[0]!.extended,
      sourceRows: group.map((point) => point.rowIndex),
    }));
}

export function navigatorWindow(
  length: number,
  start: number,
  end: number,
): readonly [number, number] {
  if (!Number.isInteger(length) || length < 0) {
    throw new GraflumeError('INVALID_SPEC', 'Navigator length must be a non-negative integer.');
  }
  if (![start, end].every(Number.isFinite)) {
    throw new GraflumeError('INVALID_SPEC', 'Navigator bounds must be finite.');
  }
  const lower = Math.max(0, Math.min(length, Math.floor(Math.min(start, end))));
  const upper = Math.max(lower, Math.min(length, Math.ceil(Math.max(start, end))));
  return [lower, upper];
}

export type DifferencePolicy = 'absolute' | 'relative' | 'percent';
export type DifferenceUnmatchedPolicy = 'error' | 'drop' | 'zero';
export type DifferenceZeroBaselinePolicy = 'error' | 'skip' | 'absolute';

export interface DifferencePoint {
  readonly key: DataValue;
  readonly baseline: number;
  readonly comparison: number;
  readonly difference: number;
  readonly sourceRows: readonly number[];
  /** Whether this point directly follows the previous emitted point in the original input. */
  readonly continuousFromPrevious: boolean;
  readonly crossing?: boolean;
}

export interface DifferenceOptions {
  readonly keyField: string;
  readonly baselineField?: string;
  readonly comparisonField?: string;
  /** Long-form series discriminator and numeric value field. */
  readonly seriesField?: string;
  readonly valueField?: string;
  readonly baselineSeries?: string;
  readonly comparisonSeries?: string;
  readonly unmatched?: DifferenceUnmatchedPolicy;
  readonly zeroBaseline?: DifferenceZeroBaselinePolicy;
  readonly policy?: DifferencePolicy;
  readonly interpolateCrossings?: boolean;
  readonly keyType?: FieldType;
}

/** Aligns comparison series by stable key and inserts exact zero crossings when requested. */
export function differenceSeries(
  input: DataInput,
  options: DifferenceOptions,
): readonly DifferencePoint[] {
  const keyField = fieldName(options.keyField, '$.keyField');
  const policy = options.policy ?? 'absolute';
  const source = rowsFrom(input);
  const canonicalKey = (rawKey: DataValue, rowIndex: number) =>
    options.keyType === 'temporal' ? timestamp(rawKey, `$.data[${rowIndex}].${keyField}`) : rawKey;
  let aligned: Array<{
    key: DataValue;
    baseline: number;
    comparison: number;
    sourceRows: number[];
    sequenceIndex: number;
  }>;
  const longForm =
    options.seriesField !== undefined ||
    options.valueField !== undefined ||
    options.baselineSeries !== undefined ||
    options.comparisonSeries !== undefined;
  if (longForm) {
    const seriesField = fieldName(options.seriesField ?? '', '$.seriesField');
    const valueField = fieldName(options.valueField ?? '', '$.valueField');
    const baselineSeries = (options.baselineSeries ?? '').trim();
    const comparisonSeries = (options.comparisonSeries ?? '').trim();
    if (baselineSeries === '' || comparisonSeries === '')
      throw new GraflumeError(
        'INVALID_SPEC',
        '$.baselineSeries and $.comparisonSeries must be non-empty.',
      );
    if (baselineSeries === comparisonSeries)
      throw new GraflumeError(
        'INVALID_SPEC',
        'Difference long-form series roles must be distinct.',
      );
    const groups = new Map<
      string,
      {
        key: DataValue;
        baseline?: { value: number; row: number };
        comparison?: { value: number; row: number };
      }
    >();
    source.forEach((row, rowIndex) => {
      const rawKey = row[keyField];
      const value = finite(row[valueField]);
      const series = row[seriesField];
      if (rawKey === undefined || value === null || typeof series !== 'string') return;
      if (series !== baselineSeries && series !== comparisonSeries) return;
      const key = canonicalKey(rawKey, rowIndex);
      const signature = JSON.stringify(key);
      const group = groups.get(signature) ?? { key };
      const role = series === baselineSeries ? 'baseline' : 'comparison';
      if (group[role] !== undefined)
        throw new GraflumeError(
          'INVALID_DATA',
          `Duplicate ${role} series value for key "${String(key)}".`,
        );
      group[role] = { value, row: rowIndex };
      groups.set(signature, group);
    });
    const unmatched = options.unmatched ?? 'error';
    aligned = [...groups.values()].flatMap((group, sequenceIndex) => {
      if (group.baseline === undefined || group.comparison === undefined) {
        if (unmatched === 'error')
          throw new GraflumeError(
            'INVALID_DATA',
            `Unmatched difference series key "${String(group.key)}".`,
          );
        if (unmatched === 'drop') return [];
      }
      return [
        {
          key: group.key,
          baseline: group.baseline?.value ?? 0,
          comparison: group.comparison?.value ?? 0,
          sourceRows: [group.baseline?.row, group.comparison?.row].filter(
            (row): row is number => row !== undefined,
          ),
          sequenceIndex,
        },
      ];
    });
  } else {
    const baselineField = fieldName(options.baselineField ?? '', '$.baselineField');
    const comparisonField = fieldName(options.comparisonField ?? '', '$.comparisonField');
    aligned = source.flatMap((row, rowIndex) => {
      const baseline = finite(row[baselineField]);
      const comparison = finite(row[comparisonField]);
      const rawKey = row[keyField];
      if (baseline === null || comparison === null || rawKey === undefined) return [];
      return [
        {
          key: canonicalKey(rawKey, rowIndex),
          baseline,
          comparison,
          sourceRows: [rowIndex],
          sequenceIndex: rowIndex,
        },
      ];
    });
  }
  let previousSequenceIndex: number | undefined;
  const points = aligned.flatMap(
    ({ key, baseline, comparison, sourceRows, sequenceIndex }): DifferencePoint[] => {
      const absolute = comparison - baseline;
      let difference: number;
      if (policy === 'absolute') difference = absolute;
      else if (baseline === 0 && comparison === 0) difference = 0;
      else if (baseline === 0) {
        const zeroBaseline = options.zeroBaseline ?? 'error';
        if (zeroBaseline === 'error')
          throw new GraflumeError(
            'INVALID_DATA',
            `Difference ${policy} policy cannot divide by a zero baseline at key "${String(key)}".`,
          );
        if (zeroBaseline === 'skip') return [];
        difference = absolute;
      } else
        difference =
          policy === 'relative'
            ? absolute / Math.abs(baseline)
            : (absolute / Math.abs(baseline)) * 100;
      const continuousFromPrevious =
        previousSequenceIndex !== undefined && sequenceIndex === previousSequenceIndex + 1;
      previousSequenceIndex = sequenceIndex;
      return [{ key, baseline, comparison, difference, sourceRows, continuousFromPrevious }];
    },
  );
  if (options.interpolateCrossings !== true) return points;
  const output: DifferencePoint[] = [];
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (
      previous !== undefined &&
      point.continuousFromPrevious &&
      previous.difference * point.difference < 0
    ) {
      const ratio =
        Math.abs(previous.difference) /
        (Math.abs(previous.difference) + Math.abs(point.difference));
      const numericPrevious = finite(previous.key);
      const numericCurrent = finite(point.key);
      if (numericPrevious !== null && numericCurrent !== null) {
        const key = numericPrevious + (numericCurrent - numericPrevious) * ratio;
        const baseline = previous.baseline + (point.baseline - previous.baseline) * ratio;
        output.push({
          key,
          baseline,
          comparison: baseline,
          difference: 0,
          sourceRows: [...previous.sourceRows, ...point.sourceRows],
          continuousFromPrevious: true,
          crossing: true,
        });
      }
    }
    output.push(point);
  });
  return output;
}

export interface SharedHistogramBin {
  readonly start: number;
  readonly end: number;
  readonly counts: readonly number[];
  readonly weights: readonly number[];
}

/** Computes one set of bin edges for every series so comparisons stay aligned. */
export function sharedHistogramBins(
  series: readonly (readonly { readonly value: number; readonly weight?: number }[])[],
  binCount = 10,
): readonly SharedHistogramBin[] {
  const count = positiveInteger(binCount, '$.binCount', 1_000);
  const values = series.flatMap((items) => items.map(({ value }) => value).filter(Number.isFinite));
  if (values.length === 0) return [];
  const observedMinimum = Math.min(...values);
  const observedMaximum = Math.max(...values);
  const constantPadding = Math.max(1, Math.abs(observedMinimum) * 0.01);
  const minimum =
    observedMinimum === observedMaximum ? observedMinimum - constantPadding / 2 : observedMinimum;
  const maximum =
    observedMinimum === observedMaximum ? observedMaximum + constantPadding / 2 : observedMaximum;
  const step = (maximum - minimum) / count;
  const bins = Array.from({ length: count }, (_, index) => ({
    start: minimum + index * step,
    end: index === count - 1 ? maximum : minimum + (index + 1) * step,
    counts: Array.from({ length: series.length }, () => 0),
    weights: Array.from({ length: series.length }, () => 0),
  }));
  series.forEach((items, seriesIndex) => {
    items.forEach(({ value, weight = 1 }, rowIndex) => {
      if (!Number.isFinite(value) || !Number.isFinite(weight) || weight < 0) {
        throw new GraflumeError('INVALID_DATA', `Invalid histogram observation ${rowIndex}.`);
      }
      const index = Math.min(count - 1, Math.max(0, Math.floor((value - minimum) / step)));
      bins[index]!.counts[seriesIndex] = bins[index]!.counts[seriesIndex]! + 1;
      bins[index]!.weights[seriesIndex] = bins[index]!.weights[seriesIndex]! + weight;
    });
  });
  return bins;
}

export interface WeightedBoxSummary {
  readonly minimum: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  readonly maximum: number;
  readonly notch: readonly [number, number];
  readonly effectiveSampleSize: number;
  readonly sourceRows: readonly number[];
}

/** Weighted quartiles plus a bounded McGill-style median notch. */
export function weightedBoxSummary(
  observations: readonly {
    readonly value: number;
    readonly weight?: number;
    readonly rowIndex?: number;
  }[],
): WeightedBoxSummary | null {
  const ordered = observations
    .map((item, index) => ({ ...item, weight: item.weight ?? 1, rowIndex: item.rowIndex ?? index }))
    .filter(({ value, weight }) => Number.isFinite(value) && Number.isFinite(weight) && weight > 0)
    .sort((a, b) => a.value - b.value || a.rowIndex - b.rowIndex);
  if (ordered.length === 0) return null;
  const total = ordered.reduce((sum, item) => sum + item.weight, 0);
  const weightedQuantile = (probability: number): number => {
    const target = probability * total;
    let cumulative = 0;
    for (const item of ordered) {
      cumulative += item.weight;
      if (cumulative >= target) return item.value;
    }
    return ordered.at(-1)!.value;
  };
  const q1 = weightedQuantile(0.25);
  const median = weightedQuantile(0.5);
  const q3 = weightedQuantile(0.75);
  const squareWeights = ordered.reduce((sum, item) => sum + item.weight * item.weight, 0);
  const effectiveSampleSize = squareWeights === 0 ? 0 : (total * total) / squareWeights;
  const half = effectiveSampleSize <= 0 ? 0 : (1.57 * (q3 - q1)) / Math.sqrt(effectiveSampleSize);
  return {
    minimum: ordered[0]!.value,
    q1,
    median,
    q3,
    maximum: ordered.at(-1)!.value,
    notch: [Math.max(q1, median - half), Math.min(q3, median + half)],
    effectiveSampleSize,
    sourceRows: ordered.map(({ rowIndex }) => rowIndex),
  };
}

export interface RugStripPoint {
  readonly value: number;
  readonly offset: number;
  readonly rowIndex: number;
}

/** Deterministic centered strip offsets; `spread=0` is a conventional rug. */
export function rugStrip(
  values: readonly number[],
  options: { readonly spread?: number; readonly seed?: number } = {},
): readonly RugStripPoint[] {
  const spread = options.spread ?? 0;
  if (!Number.isFinite(spread) || spread < 0) {
    throw new GraflumeError('INVALID_SPEC', '$.spread must be finite and non-negative.');
  }
  let state = (options.seed ?? 0) >>> 0;
  const random = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
  return values.flatMap((value, rowIndex) =>
    Number.isFinite(value)
      ? [{ value, offset: spread === 0 ? 0 : (random() - 0.5) * spread, rowIndex }]
      : [],
  );
}

export type IntervalKind = 'CI' | 'PI' | 'SE' | 'SD' | 'IQR' | 'HDI';

export interface EstimatedInterval {
  readonly estimate: number;
  readonly low: number;
  readonly high: number;
  readonly kind: IntervalKind;
  readonly orientation: 'vertical' | 'horizontal';
  readonly confidence: number;
  readonly sourceRows: readonly number[];
  readonly summary: string;
}

export interface IntervalEstimatorOptions {
  readonly kind?: IntervalKind;
  readonly confidence?: number;
  readonly estimator?: 'mean' | 'median';
  readonly orientation?: 'vertical' | 'horizontal';
}

function normalCritical(confidence: number): number {
  const probability = 0.5 + confidence / 2;
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
    2.506628277459239,
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972,
    -13.28068155288572,
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (probability < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  if (probability > 1 - 0.02425) {
    const q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
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

/** Raw-data interval estimator with explicit kind, orientation, and provenance. */
export function estimateInterval(
  values: readonly number[],
  options: IntervalEstimatorOptions = {},
): EstimatedInterval | null {
  const indexed = values
    .map((value, rowIndex) => ({ value, rowIndex }))
    .filter(({ value }) => Number.isFinite(value))
    .sort((a, b) => a.value - b.value || a.rowIndex - b.rowIndex);
  if (indexed.length === 0) return null;
  const ordered = indexed.map(({ value }) => value);
  const mean = ordered.reduce((sum, value) => sum + value, 0) / ordered.length;
  const median = quantile(ordered, 0.5)!;
  const estimate = options.estimator === 'median' ? median : mean;
  const variance =
    ordered.length < 2
      ? 0
      : ordered.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (ordered.length - 1);
  const deviation = Math.sqrt(variance);
  const error = deviation / Math.sqrt(ordered.length);
  const confidence = options.confidence ?? 0.95;
  if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new GraflumeError('INVALID_SPEC', '$.confidence must be between 0 and 1.');
  }
  const kind = options.kind ?? 'CI';
  const critical = normalCritical(confidence);
  let low: number;
  let high: number;
  if (kind === 'SE') [low, high] = [estimate - error, estimate + error];
  else if (kind === 'SD') [low, high] = [estimate - deviation, estimate + deviation];
  else if (kind === 'PI') {
    const half = critical * deviation * Math.sqrt(1 + 1 / ordered.length);
    [low, high] = [estimate - half, estimate + half];
  } else if (kind === 'IQR') [low, high] = [quantile(ordered, 0.25)!, quantile(ordered, 0.75)!];
  else if (kind === 'HDI') {
    const windowLength = Math.max(1, Math.ceil(confidence * ordered.length));
    let start = 0;
    for (let index = 1; index + windowLength - 1 < ordered.length; index += 1) {
      if (
        ordered[index + windowLength - 1]! - ordered[index]! <
        ordered[start + windowLength - 1]! - ordered[start]!
      ) {
        start = index;
      }
    }
    [low, high] = [
      ordered[start]!,
      ordered[Math.min(ordered.length - 1, start + windowLength - 1)]!,
    ];
  } else {
    const half = critical * error;
    [low, high] = [estimate - half, estimate + half];
  }
  return {
    estimate,
    low,
    high,
    kind,
    orientation: options.orientation ?? 'vertical',
    confidence,
    sourceRows: indexed.map(({ rowIndex }) => rowIndex),
    summary: `${kind} ${Math.round(confidence * 100)}% from ${indexed.length} source rows`,
  };
}

export type DuplicatePolicy = 'error' | 'first' | 'last' | 'sum' | 'mean';
export type SortPolicy = 'preserve' | 'ascending' | 'descending' | 'error';

export interface OrderedSeriesPoint {
  readonly key: DataValue;
  readonly value: number;
  readonly sourceRows: readonly number[];
}

/** Makes duplicate and implicit sorting behavior explicit for line-like series. */
export function prepareOrderedSeries(
  input: DataInput,
  options: {
    readonly keyField: string;
    readonly valueField: string;
    readonly duplicates?: DuplicatePolicy;
    readonly sort?: SortPolicy;
    readonly keyType?: FieldType;
  },
): readonly OrderedSeriesPoint[] {
  const keyField = fieldName(options.keyField, '$.keyField');
  const valueField = fieldName(options.valueField, '$.valueField');
  const duplicatePolicy = options.duplicates ?? 'error';
  const source = rowsFrom(input).flatMap((row, rowIndex) => {
    const rawKey = row[keyField];
    const value = finite(row[valueField]);
    if (rawKey === undefined || value === null) return [];
    const key =
      options.keyType === 'temporal'
        ? timestamp(rawKey, `$.data[${rowIndex}].${keyField}`)
        : rawKey;
    return [{ key, value, rowIndex }];
  });
  const groups = new Map<string, typeof source>();
  for (const point of source) {
    const key = JSON.stringify(point.key);
    const group = groups.get(key) ?? [];
    group.push(point);
    groups.set(key, group);
  }
  let points = [...groups.values()].map((group) => {
    if (group.length > 1 && duplicatePolicy === 'error') {
      throw new GraflumeError('INVALID_DATA', `Duplicate series key "${String(group[0]!.key)}".`);
    }
    const value =
      duplicatePolicy === 'first'
        ? group[0]!.value
        : duplicatePolicy === 'last'
          ? group.at(-1)!.value
          : duplicatePolicy === 'sum' || duplicatePolicy === 'mean'
            ? group.reduce((sum, item) => sum + item.value, 0) /
              (duplicatePolicy === 'mean' ? group.length : 1)
            : group[0]!.value;
    return { key: group[0]!.key, value, sourceRows: group.map(({ rowIndex }) => rowIndex) };
  });
  const compare = (left: OrderedSeriesPoint, right: OrderedSeriesPoint): number => {
    const a = finite(left.key);
    const b = finite(right.key);
    return a !== null && b !== null
      ? a - b
      : String(left.key).localeCompare(String(right.key), 'en');
  };
  const ascending = points.every(
    (point, index) => index === 0 || compare(points[index - 1]!, point) <= 0,
  );
  if (options.sort === 'error' && !ascending) {
    throw new GraflumeError('INVALID_DATA', 'Series keys are not ascending.');
  }
  if (options.sort === 'ascending') points = points.slice().sort(compare);
  if (options.sort === 'descending') points = points.slice().sort((a, b) => -compare(a, b));
  return points;
}

export type WaterfallKind = 'relative' | 'absolute' | 'subtotal' | 'total';

export interface WaterfallInput {
  readonly value: number;
  readonly kind?: WaterfallKind;
  readonly label?: string;
}

export interface WaterfallStep extends WaterfallInput {
  readonly kind: WaterfallKind;
  readonly start: number;
  readonly end: number;
  readonly change: number;
  readonly index: number;
}

/** Resolves explicit relative, absolute, subtotal, and total waterfall semantics. */
export function waterfallSteps(input: readonly WaterfallInput[]): readonly WaterfallStep[] {
  let cursor = 0;
  let subtotalBase = 0;
  return input.map((item, index) => {
    if (!Number.isFinite(item.value)) {
      throw new GraflumeError('INVALID_DATA', `Waterfall value at ${index} must be finite.`);
    }
    const kind = item.kind ?? 'relative';
    let start: number;
    let end: number;
    if (kind === 'relative') {
      start = cursor;
      end = cursor + item.value;
      cursor = end;
    } else if (kind === 'absolute') {
      start = cursor;
      end = item.value;
      cursor = end;
      subtotalBase = end;
    } else if (kind === 'subtotal') {
      start = subtotalBase;
      end = cursor;
      subtotalBase = cursor;
    } else {
      start = 0;
      end = item.value;
      cursor = end;
      subtotalBase = end;
    }
    return { ...item, kind, start, end, change: end - start, index };
  });
}
