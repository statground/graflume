import type { Tick } from '../scale/types.js';
import type { NormalizedAxisFormatSpec } from '../spec/types.js';
import { formatTemporalValue, parseTemporalValue } from '../format/temporal.js';

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

function finiteFractionDigits(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.max(0, Math.min(20, Math.trunc(value)));
}

function numericValue(value: number | string): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
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

/** Format a scale tick without accepting callbacks or executable formatter expressions. */
export function formatAxisTick(
  tick: Tick,
  format: NormalizedAxisFormatSpec,
  locale?: string,
): string {
  let value = tick.label;
  if (format.type === 'date' || format.type === 'time' || format.type === 'datetime') {
    if (parseTemporalValue(tick.value) !== null) {
      value =
        formatTemporalValue(
          tick.value,
          {
            type: format.type,
            dateStyle: format.dateStyle,
            timeStyle: format.timeStyle,
            timeZone: format.timeZone,
          },
          locale,
        ) ?? tick.label;
    }
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
