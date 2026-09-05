import { GraflumeError } from '../core/errors.js';
import type { Scale } from '../scale/types.js';
import type { AxisId } from '../spec/types.js';
import { isSafeAxisId } from '../spec/axes.js';
import type { CartesianCoordinateContext } from './cartesian-coordinates.js';

export const domainViewVersion = 1 as const;

export interface DomainAxisWindow {
  /** Normalized authored-domain start. */
  readonly start: number;
  /** Normalized authored-domain end. */
  readonly end: number;
}

export interface DomainViewState {
  readonly version: typeof domainViewVersion;
  readonly axes: Readonly<Partial<Record<AxisId, DomainAxisWindow>>>;
}

function invalid(message: string, path = '$.interaction.domainNavigation'): never {
  throw new GraflumeError('INVALID_SPEC', message, { path });
}

function assertPlainObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(`${label} must be an object.`);
  }
}

function assertClosedKeys(value: object, allowed: readonly string[], label: string): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknown.length > 0) invalid(`${label} contains unknown key "${unknown[0]}".`);
}

function normalizedWindow(input: DomainAxisWindow): DomainAxisWindow {
  assertPlainObject(input, 'Domain axis window');
  assertClosedKeys(input, ['start', 'end'], 'Domain axis window');
  if (
    !Number.isFinite(input.start) ||
    !Number.isFinite(input.end) ||
    input.start < 0 ||
    input.end > 1 ||
    input.start >= input.end
  ) {
    invalid('Domain axis windows require finite 0 <= start < end <= 1 values.');
  }
  return Object.freeze({ start: input.start, end: input.end });
}

export function normalizeDomainViewState(input: DomainViewState): DomainViewState {
  assertPlainObject(input, 'Domain view state');
  assertClosedKeys(input, ['version', 'axes'], 'Domain view state');
  if (input.version !== domainViewVersion) {
    invalid(`Domain view state.version must be ${domainViewVersion}.`);
  }
  assertPlainObject(input.axes, 'Domain view axes');
  const axes: Partial<Record<AxisId, DomainAxisWindow>> = {};
  for (const [axis, window] of Object.entries(input.axes)) {
    if (!isSafeAxisId(axis)) {
      invalid(`Unknown domain view axis "${axis}".`);
    }
    if (window !== undefined) axes[axis] = normalizedWindow(window);
  }
  return Object.freeze({ version: domainViewVersion, axes: Object.freeze(axes) });
}

export function emptyDomainViewState(): DomainViewState {
  return Object.freeze({ version: domainViewVersion, axes: Object.freeze({}) });
}

export function domainAxisWindow(state: DomainViewState, axis: AxisId): DomainAxisWindow {
  const window = state.axes[axis];
  return window === undefined ? Object.freeze({ start: 0, end: 1 }) : window;
}

function boundedWindow(start: number, width: number): DomainAxisWindow {
  const boundedWidth = Math.max(Number.EPSILON, Math.min(1, width));
  const boundedStart = Math.max(0, Math.min(1 - boundedWidth, start));
  return Object.freeze({ start: boundedStart, end: boundedStart + boundedWidth });
}

function withWindow(
  state: DomainViewState,
  axis: AxisId,
  window: DomainAxisWindow,
): DomainViewState {
  const axes = { ...state.axes };
  const normalized = normalizedWindow(window);
  if (Math.abs(normalized.start) < 1e-12 && Math.abs(normalized.end - 1) < 1e-12) {
    delete axes[axis];
  } else axes[axis] = normalized;
  return normalizeDomainViewState({ version: domainViewVersion, axes });
}

export function zoomDomainAxisWindow(
  state: DomainViewState,
  axis: AxisId,
  factor: number,
  anchor: number,
  maxZoom: number,
): DomainViewState {
  if (!Number.isFinite(factor) || factor <= 0) invalid('Domain zoom factor must be positive.');
  if (!Number.isFinite(anchor)) invalid('Domain zoom anchor must be finite.');
  if (!Number.isFinite(maxZoom) || maxZoom < 1) invalid('Domain maxZoom must be at least 1.');
  const current = domainAxisWindow(state, axis);
  const width = current.end - current.start;
  const boundedAnchor = Math.max(current.start, Math.min(current.end, anchor));
  const local = width === 0 ? 0.5 : (boundedAnchor - current.start) / width;
  const nextWidth = Math.max(1 / maxZoom, Math.min(1, width / factor));
  return withWindow(state, axis, boundedWindow(boundedAnchor - local * nextWidth, nextWidth));
}

export function panDomainAxisWindow(
  state: DomainViewState,
  axis: AxisId,
  delta: number,
): DomainViewState {
  if (!Number.isFinite(delta)) invalid('Domain pan delta must be finite.');
  const current = domainAxisWindow(state, axis);
  return withWindow(state, axis, boundedWindow(current.start + delta, current.end - current.start));
}

function scaleFor(context: CartesianCoordinateContext, axis: AxisId): Scale {
  const scale = context.axes[axis];
  if (scale === undefined) invalid(`Axis "${axis}" is not resolved.`, `$.axes.${axis}`);
  if (scale.invert === undefined && scale.kind !== 'band' && scale.kind !== 'point') {
    throw new GraflumeError('INCOMPATIBLE_SCALE', `Axis "${axis}" cannot be navigated.`, {
      path: `$.axes.${axis}`,
    });
  }
  return scale;
}

function rangeRatio(scale: Scale, pixel: number): number {
  if (!Number.isFinite(pixel)) invalid('Domain navigation pixel must be finite.');
  const range = scale.range();
  const start = range[0];
  const end = range.at(-1);
  if (start === undefined || end === undefined || start === end) {
    throw new GraflumeError('INCOMPATIBLE_SCALE', 'Navigable scale range must be non-empty.');
  }
  return Math.max(0, Math.min(1, (pixel - start) / (end - start)));
}

export function zoomDomainAtPixel(
  state: DomainViewState,
  context: CartesianCoordinateContext,
  axis: AxisId,
  factor: number,
  pixel: number,
  maxZoom: number,
): DomainViewState {
  const scale = scaleFor(context, axis);
  const current = domainAxisWindow(state, axis);
  const ratio = rangeRatio(scale, pixel);
  const anchor = current.start + ratio * (current.end - current.start);
  return zoomDomainAxisWindow(state, axis, factor, anchor, maxZoom);
}

export function panDomainByPixels(
  state: DomainViewState,
  context: CartesianCoordinateContext,
  axis: AxisId,
  deltaPixels: number,
): DomainViewState {
  const scale = scaleFor(context, axis);
  if (!Number.isFinite(deltaPixels)) invalid('Domain pan pixel delta must be finite.');
  const range = scale.range();
  const start = range[0];
  const end = range.at(-1);
  if (start === undefined || end === undefined || start === end) {
    throw new GraflumeError('INCOMPATIBLE_SCALE', 'Navigable scale range must be non-empty.');
  }
  const current = domainAxisWindow(state, axis);
  // Grab-to-pan: dragging marks toward positive pixels reveals the preceding
  // authored domain. A descending layout range naturally reverses this sign.
  const delta = (-deltaPixels / (end - start)) * (current.end - current.start);
  return panDomainAxisWindow(state, axis, delta);
}

export function domainForAxisWindow(
  scale: Scale,
  window: DomainAxisWindow,
): readonly (number | string)[] {
  if (scale.invert === undefined) {
    if (scale.kind !== 'band' && scale.kind !== 'point') {
      throw new GraflumeError(
        'INCOMPATIBLE_SCALE',
        `Data-domain navigation cannot resolve the "${scale.kind}" scale.`,
      );
    }
    const domain = scale.domain();
    if (domain.length === 0) {
      return Object.freeze([]);
    }
    const start = Math.min(domain.length - 1, Math.floor(window.start * domain.length));
    const end = Math.max(start + 1, Math.min(domain.length, Math.ceil(window.end * domain.length)));
    return Object.freeze(domain.slice(start, end));
  }
  const range = scale.range();
  const start = range[0];
  const end = range.at(-1);
  if (start === undefined || end === undefined || start === end) {
    throw new GraflumeError('INCOMPATIBLE_SCALE', 'Navigable scale range must be non-empty.');
  }
  const first = scale.invert(start + (end - start) * window.start);
  const last = scale.invert(start + (end - start) * window.end);
  if (
    typeof first !== 'number' ||
    typeof last !== 'number' ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first === last
  ) {
    throw new GraflumeError(
      'INCOMPATIBLE_SCALE',
      `Data-domain navigation requires finite numeric endpoints from "${scale.kind}".`,
    );
  }
  return Object.freeze([first, last]);
}

export function domainViewIsIdentity(state: DomainViewState): boolean {
  return Object.keys(state.axes).length === 0;
}
