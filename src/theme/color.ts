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
