import type { DataValue } from '../spec/types.js';

export type TemporalDisplayFormat = 'date' | 'time' | 'datetime';

export interface TemporalFormatOptions {
  readonly type: TemporalDisplayFormat;
  readonly dateStyle: 'short' | 'medium' | 'long' | 'full';
  readonly timeStyle: 'short' | 'medium' | 'long' | 'full';
  readonly timeZone: string;
}

export interface ParsedTemporalValue {
  readonly value: Date;
  readonly dateOnly: boolean;
}

const isoDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?$/i;

function validCalendarDate(year: number, month: number, day: number): boolean {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]!;
}

/** Parse the portable temporal inputs accepted by scales, axes, and tooltips. */
export function parseTemporalValue(value: DataValue | number | string): ParsedTemporalValue | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? { value, dateOnly: false } : null;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? { value: date, dateOnly: false } : null;
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match !== null) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!validCalendarDate(year, month, day)) return null;
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    return { value: date, dateOnly: true };
  }
  const dateTime = isoDateTimePattern.exec(value);
  // Date.parse accepts host-dependent prose and partial dates. The portable
  // contract intentionally stops at the strict ISO grammar above.
  if (dateTime === null) return null;
  const year = Number(dateTime[1]);
  const month = Number(dateTime[2]);
  const day = Number(dateTime[3]);
  const hour = Number(dateTime[4]);
  const minute = Number(dateTime[5]);
  const second = dateTime[6] === undefined ? 0 : Number(dateTime[6]);
  if (!validCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) return null;
  const zoneLessISO = dateTime[8] === undefined;
  // Portable ISO datetimes without an offset use UTC instead of the host machine's zone.
  const date = new Date(zoneLessISO ? `${value}Z` : value);
  return Number.isFinite(date.getTime()) ? { value: date, dateOnly: false } : null;
}

/**
 * Resolve a temporal input to epoch milliseconds. Portable callers keep `allowLegacy` false;
 * explicitly temporal runtime paths may retain historical parseable-string compatibility while
 * strict ISO values are still resolved first, making zone-less ISO datetimes deterministic UTC.
 */
export function temporalTimestamp(
  value: DataValue | number | string,
  allowLegacy = false,
): number | null {
  const parsed = parseTemporalValue(value);
  if (parsed !== null) return parsed.value.getTime();
  if (!allowLegacy || typeof value !== 'string') return null;
  const legacy = Date.parse(value);
  return Number.isFinite(legacy) ? legacy : null;
}

/** Construct Intl formatting with deterministic UTC fallback for invalid locale/zone input. */
export function safeDateTimeFormatter(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    try {
      return new Intl.DateTimeFormat(undefined, options);
    } catch {
      const utcOptions = { ...options, timeZone: 'UTC' };
      try {
        return new Intl.DateTimeFormat(locale, utcOptions);
      } catch {
        try {
          return new Intl.DateTimeFormat(undefined, utcOptions);
        } catch {
          return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
        }
      }
    }
  }
}

/** Format one temporal value without callbacks or executable format strings. */
export function formatTemporalValue(
  value: DataValue | number | string,
  format: TemporalFormatOptions,
  locale?: string,
): string | null {
  const parsed = parseTemporalValue(value);
  if (parsed === null) return null;
  const options: Intl.DateTimeFormatOptions = {
    // A calendar-only value has no instant. Keep it on the authored day.
    timeZone: parsed.dateOnly && format.type === 'date' ? 'UTC' : format.timeZone || 'UTC',
  };
  if (format.type === 'time') options.timeStyle = format.timeStyle;
  else if (format.type === 'datetime') {
    options.dateStyle = format.dateStyle;
    options.timeStyle = format.timeStyle;
  } else options.dateStyle = format.dateStyle;
  return safeDateTimeFormatter(locale, options).format(parsed.value);
}

/** Resolve whether an authored value contains a calendar date only or an instant. */
export function inferTemporalDisplayFormat(value: DataValue): TemporalDisplayFormat | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? 'datetime' : null;
  if (typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseTemporalValue(value) === null ? null : 'date';
  }
  // Automatic inference is intentionally strict. Human labels such as "2024"
  // and "May 2026" remain categorical even though Date.parse accepts them.
  if (!isoDateTimePattern.test(value)) {
    return null;
  }
  return parseTemporalValue(value) === null ? null : 'datetime';
}

/** Stable text for semantic/accessibility surfaces that must never expose raw epoch values. */
export function temporalISOText(value: DataValue): string | null {
  const parsed = parseTemporalValue(value);
  if (parsed === null) return null;
  return parsed.dateOnly && typeof value === 'string' ? value : parsed.value.toISOString();
}
