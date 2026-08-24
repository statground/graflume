import type { ThemeTokens } from './types.js';

function normalizedHex(color: string): string | null {
  const value = color.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(value)) {
    return value
      .split('')
      .map((channel) => `${channel}${channel}`)
      .join('');
  }
  return /^[0-9a-f]{6}$/i.test(value) ? value : null;
}

function hexColor(channels: readonly number[], uppercase = false): string {
  const value = `#${channels
    .map((channelValue) =>
      Math.round(Math.max(0, Math.min(255, channelValue)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
  return uppercase ? value.toUpperCase() : value;
}

function linearToSrgb(value: number): number {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Convert the polar CIELUV scale used by grDevices::hcl() into clipped sRGB. */
function hclColor(hue: number, chroma: number, luminance: number): string {
  if (luminance <= 0) return '#000000';
  const radians = (hue * Math.PI) / 180;
  const u = Math.cos(radians) * chroma;
  const v = Math.sin(radians) * chroma;
  const referenceU = 0.19783000664283;
  const referenceV = 0.46831999493879;
  const y = luminance > 8 ? ((luminance + 16) / 116) ** 3 : luminance / 903.2962962962963;
  const uPrime = u / (13 * luminance) + referenceU;
  const vPrime = v / (13 * luminance) + referenceV;
  const x = (9 * y * uPrime) / (4 * vPrime);
  const z = (y * (12 - 3 * uPrime - 20 * vPrime)) / (4 * vPrime);
  const red = linearToSrgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z);
  const green = linearToSrgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
  const blue = linearToSrgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);
  return hexColor([red * 255, green * 255, blue * 255], true);
}

/** ggplot2's default discrete hue scale: h = c(15, 375), c = 100, l = 65. */
export function ggplotHuePalette(count: number): readonly string[] {
  const size = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (size === 0) return [];
  return Array.from({ length: size }, (_value, index) =>
    hclColor(15 + (360 * index) / size, 100, 65),
  );
}

/** Resolve a category colour while preserving fixed-palette behaviour for existing themes. */
export function categoricalColor(theme: ThemeTokens, index: number, count: number): string {
  const paletteSize = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  const paletteIndex = Number.isFinite(index) ? Math.floor(index) : 0;
  const normalizedIndex = ((paletteIndex % paletteSize) + paletteSize) % paletteSize;
  if (theme.colors.paletteMode === 'ggplot2-hue') {
    return hclColor(15 + (360 * normalizedIndex) / paletteSize, 100, 65);
  }
  const palette = theme.colors.palette;
  if (palette.length === 0) return theme.colors.focus;
  const fixedIndex = ((paletteIndex % palette.length) + palette.length) % palette.length;
  return palette[fixedIndex] ?? theme.colors.focus;
}

interface LabColor {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

function labFunction(value: number): number {
  const delta = 6 / 29;
  return value > delta ** 3 ? Math.cbrt(value) : value / (3 * delta ** 2) + 4 / 29;
}

function inverseLabFunction(value: number): number {
  const delta = 6 / 29;
  return value > delta ? value ** 3 : 3 * delta ** 2 * (value - 4 / 29);
}

function hexToLab(color: string): LabColor | null {
  const hex = normalizedHex(color);
  if (hex === null) return null;
  const red = srgbToLinear(channel(hex, 0) / 255);
  const green = srgbToLinear(channel(hex, 1) / 255);
  const blue = srgbToLinear(channel(hex, 2) / 255);
  const x = (0.4124564 * red + 0.3575761 * green + 0.1804375 * blue) / 0.95047;
  const y = 0.2126729 * red + 0.7151522 * green + 0.072175 * blue;
  const z = (0.0193339 * red + 0.119192 * green + 0.9503041 * blue) / 1.08883;
  const fx = labFunction(x);
  const fy = labFunction(y);
  const fz = labFunction(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function labToHex(color: LabColor): string {
  const fy = (color.l + 16) / 116;
  const fx = fy + color.a / 500;
  const fz = fy - color.b / 200;
  const x = 0.95047 * inverseLabFunction(fx);
  const y = inverseLabFunction(fy);
  const z = 1.08883 * inverseLabFunction(fz);
  const red = linearToSrgb(3.2404542 * x - 1.5371385 * y - 0.4985314 * z);
  const green = linearToSrgb(-0.969266 * x + 1.8760108 * y + 0.041556 * z);
  const blue = linearToSrgb(0.0556434 * x - 0.2040259 * y + 1.0572252 * z);
  return hexColor([red * 255, green * 255, blue * 255], true);
}

function mixLabColor(start: string, end: string, ratio: number): string {
  const startLab = hexToLab(start);
  const endLab = hexToLab(end);
  if (startLab === null || endLab === null) return mixColor(start, end, ratio);
  const bounded = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  return labToHex({
    l: startLab.l + (endLab.l - startLab.l) * bounded,
    a: startLab.a + (endLab.a - startLab.a) * bounded,
    b: startLab.b + (endLab.b - startLab.b) * bounded,
  });
}

/** Resolve a continuous colour; an explicit interpolation token wins over palette defaults. */
export function continuousColor(theme: ThemeTokens, ratio: number): string {
  const palette = theme.colors.sequential;
  if (palette.length === 0) return theme.colors.focus;
  if (palette.length === 1) return palette[0] ?? theme.colors.focus;
  const bounded = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  if (
    theme.colors.paletteMode === 'ggplot2-hue' &&
    theme.colors.continuousInterpolation === undefined
  ) {
    return mixLabColor(
      palette[0] ?? theme.colors.focus,
      palette[palette.length - 1] ?? theme.colors.focus,
      bounded,
    );
  }
  if (
    theme.colors.continuousInterpolation === 'rgb' ||
    theme.colors.continuousInterpolation === 'lab'
  ) {
    const scaled = bounded * (palette.length - 1);
    const startIndex = Math.min(palette.length - 2, Math.floor(scaled));
    const start = palette[startIndex] ?? theme.colors.focus;
    const end = palette[startIndex + 1] ?? start;
    const localRatio = scaled - startIndex;
    return theme.colors.continuousInterpolation === 'lab'
      ? mixLabColor(start, end, localRatio)
      : mixColor(start, end, localRatio);
  }
  if (theme.colors.continuousInterpolation === 'step') {
    const index = Math.min(palette.length - 1, Math.floor(bounded * palette.length));
    return palette[index] ?? theme.colors.focus;
  }
  return palette[Math.round(bounded * (palette.length - 1))] ?? theme.colors.focus;
}

function channel(color: string, index: number): number {
  return Number.parseInt(color.slice(index * 2, index * 2 + 2), 16);
}

export function mixColor(start: string, end: string, ratio: number): string {
  const startHex = normalizedHex(start);
  const endHex = normalizedHex(end);
  if (startHex === null || endHex === null) return ratio < 0.5 ? start : end;
  const bounded = Math.max(0, Math.min(1, ratio));
  const channels = [0, 1, 2].map((index) =>
    Math.round(
      channel(startHex, index) + (channel(endHex, index) - channel(startHex, index)) * bounded,
    ),
  );
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function colorWithOpacity(color: string, opacity: number): string {
  const hex = normalizedHex(color);
  if (hex === null) return color;
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${hex}${alpha}`;
}

export function readableTextColor(color: string, light: string, dark: string): string {
  const hex = normalizedHex(color);
  if (hex === null) return light;
  const linear = [0, 1, 2].map((index) => {
    const value = channel(hex, index) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
  return luminance > 0.42 ? dark : light;
}
