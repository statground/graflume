import type { Tick } from '../scale/types.js';
import type { NormalizedAxisFormatSpec } from '../spec/types.js';

function numberFormatter(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat(undefined, options);
  }
}

function dateFormatter(
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

function finiteFractionDigits(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.max(0, Math.min(20, Math.trunc(value)));
}

function numericValue(value: number | string): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
}

interface ParsedDate {
  readonly value: Date;
  readonly dateOnly: boolean;
}

function dateValue(value: number | string): ParsedDate | null {
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? { value: date, dateOnly: false } : null;
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly !== null) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return { value: date, dateOnly: true };
    }
    return null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? { value: date, dateOnly: false } : null;
}

function formatNumber(
  value: number,
  format: NormalizedAxisFormatSpec,
  locale: string | undefined,
): string {
  const fractionDigits = finiteFractionDigits(format.fractionDigits);
  const notation =
    format.type === 'compact'
      ? 'compact'
      : format.type === 'scientific'
        ? 'scientific'
        : format.notation;
  const options: Intl.NumberFormatOptions = {
    notation,
    useGrouping: format.useGrouping,
    ...(fractionDigits === undefined
      ? format.type === 'integer'
        ? { maximumFractionDigits: 0 }
        : format.type === 'percent'
          ? { maximumFractionDigits: 1 }
          : { maximumFractionDigits: 6 }
      : { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }),
  };
  if (format.type === 'percent') options.style = 'percent';
  if (format.type === 'currency') {
    options.style = 'currency';
    options.currency = format.currency ?? 'USD';
    options.currencyDisplay = format.currencyDisplay;
  }
  try {
    return numberFormatter(locale, options).format(value);
  } catch {
    return numberFormatter(locale, {
      useGrouping: format.useGrouping,
      maximumFractionDigits: fractionDigits ?? 6,
    }).format(value);
  }
}

function formatDate(
  parsed: ParsedDate,
  format: NormalizedAxisFormatSpec,
  locale: string | undefined,
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: parsed.dateOnly && format.type === 'date' ? 'UTC' : format.timeZone || 'UTC',
  };
  if (format.type === 'time') {
    options.timeStyle = format.timeStyle;
  } else if (format.type === 'datetime') {
    options.dateStyle = format.dateStyle;
    options.timeStyle = format.timeStyle;
  } else {
    options.dateStyle = format.dateStyle;
  }
  return dateFormatter(locale, options).format(parsed.value);
}

/** Format a scale tick without accepting callbacks or executable formatter expressions. */
export function formatAxisTick(
  tick: Tick,
  format: NormalizedAxisFormatSpec,
  locale?: string,
): string {
  let value = tick.label;
  if (format.type === 'date' || format.type === 'time' || format.type === 'datetime') {
    const date = dateValue(tick.value);
    if (date !== null) value = formatDate(date, format, locale);
  } else if (format.type !== 'auto') {
    const numeric = numericValue(tick.value);
    if (numeric !== null) value = formatNumber(numeric, format, locale);
  }
  return `${format.prefix}${value}${format.suffix}`;
}

/** Truncate by Unicode code point so surrogate pairs are never split. */
export function truncateAxisLabel(value: string, maxLength: number | undefined): string {
  if (maxLength === undefined) return value;
  const characters = Array.from(value);
  if (characters.length <= maxLength) return value;
  if (maxLength <= 1) return '…';
  return `${characters.slice(0, maxLength - 1).join('')}…`;
}
