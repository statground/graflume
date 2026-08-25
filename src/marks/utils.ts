import type { DataValue } from '../spec/types.js';
import { continuousColor, mixColor } from '../theme/color.js';
import type { ThemeTokens } from '../theme/types.js';

export function scaleInput(value: DataValue): number | string | Date | null {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    (typeof value === 'object' && !(value instanceof Date))
  )
    return null;
  return value;
}

export function numericDataValue(value: DataValue, temporal = false): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (temporal && typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  return null;
}

export function themedPointFill(theme: ThemeTokens, seriesColor: string, fallback: string): string {
  return theme.mark.pointColorMode === 'series' ? seriesColor : (theme.mark.pointFill ?? fallback);
}

export function themedPointStroke(
  theme: ThemeTokens,
  seriesColor: string,
  fallback: string,
): string {
  return theme.mark.pointColorMode === 'series'
    ? seriesColor
    : (theme.mark.pointStroke ?? fallback);
}

export function themedAreaFill(theme: ThemeTokens, seriesColor: string, fallback: string): string {
  return theme.mark.areaColorMode === 'series' ? seriesColor : (theme.mark.areaFill ?? fallback);
}

export function themedAreaStroke(
  theme: ThemeTokens,
  seriesColor: string,
  fallback: string,
): string {
  return theme.mark.areaColorMode === 'series' ? seriesColor : (theme.mark.areaStroke ?? fallback);
}

/**
 * Use a theme's declared continuous interpolation while retaining the exact
 * legacy sequential-stop behaviour of Graflume's light and dark themes.
 */
export function mappedContinuousColor(
  theme: ThemeTokens,
  ratio: number,
  legacyMode: 'stepped' | 'endpoints' = 'stepped',
): string {
  const bounded = Math.max(0, Math.min(1, ratio));
  if (
    theme.colors.paletteMode === 'ggplot2-hue' ||
    theme.colors.continuousInterpolation !== undefined
  ) {
    return continuousColor(theme, bounded);
  }
  const palette = theme.colors.sequential;
  if (palette.length === 0) return theme.colors.focus;
  if (legacyMode === 'endpoints') {
    return mixColor(
      palette[0] ?? theme.colors.focus,
      palette[palette.length - 1] ?? theme.colors.focus,
      bounded,
    );
  }
  return palette[Math.round(bounded * (palette.length - 1))] ?? theme.colors.focus;
}
