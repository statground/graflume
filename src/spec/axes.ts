import type { AxisChannel, AxisId, AxisPosition, AxisSpec } from './types.js';

export const builtInAxisIds = Object.freeze(['x', 'x2', 'y', 'y2'] as const);

const unsafeAxisIds = new Set(['__proto__', 'prototype', 'constructor']);
const safeAxisIdPattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u;

export function isSafeAxisId(value: unknown): value is AxisId {
  return typeof value === 'string' && safeAxisIdPattern.test(value) && !unsafeAxisIds.has(value);
}

export function builtInAxisChannel(id: AxisId): AxisChannel | undefined {
  if (id === 'x' || id === 'x2') return 'x';
  if (id === 'y' || id === 'y2') return 'y';
  return undefined;
}

export function axisChannel(
  id: AxisId,
  axes: Readonly<Record<AxisId, AxisSpec | false | undefined>> = {},
): AxisChannel | undefined {
  return builtInAxisChannel(id) ?? (axes[id] === false ? undefined : axes[id]?.channel);
}

export function defaultAxisPosition(id: AxisId, channel: AxisChannel): AxisPosition {
  if (id === 'x2') return 'top';
  if (id === 'y2') return 'right';
  return channel === 'x' ? 'bottom' : 'left';
}

export function axisPositionChannel(position: AxisPosition): AxisChannel {
  return position === 'top' || position === 'bottom' ? 'x' : 'y';
}

export function declaredAxisIds(
  axes: Readonly<Record<AxisId, AxisSpec | false | undefined>> = {},
): readonly AxisId[] {
  const ids: AxisId[] = [...builtInAxisIds];
  for (const id of Object.keys(axes)) if (!ids.includes(id)) ids.push(id);
  return Object.freeze(ids);
}
