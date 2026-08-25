import { GraflumeError } from '../core/errors.js';
import type { PlotArea } from '../compiler/types.js';
import type { Scale } from '../scale/types.js';
import type { AxisId } from '../spec/types.js';
import type {
  AnalyticAxisSelection,
  AnalyticDomainPoint,
  AnalyticIntervalSelection,
  AnalyticLassoSelection,
  AnalyticPointSelection,
  AnalyticRectangleSelection,
  AnalyticSelection,
} from './analytic-selection.js';

export interface CartesianCoordinateContext {
  readonly plot: PlotArea;
  readonly axes: Readonly<Partial<Record<AxisId, Scale>>>;
}

export interface PixelPoint {
  readonly x: number;
  readonly y: number;
}

function fail(message: string, path = '$.interaction.selection'): never {
  throw new GraflumeError('INCOMPATIBLE_SCALE', message, { path });
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) fail(`${label} must be finite.`);
  return value;
}

function scaleFor(context: CartesianCoordinateContext, axis: AxisId): Scale {
  const scale = context.axes[axis];
  if (scale === undefined) fail(`Axis "${axis}" is not resolved.`, `$.axes.${axis}`);
  return scale;
}

function clampToRange(scale: Scale, pixel: number): number {
  finite(pixel, 'Pixel coordinate');
  const range = scale.range();
  if (range.length === 0) fail(`Scale "${scale.kind}" has an empty range.`);
  const minimum = Math.min(...range);
  const maximum = Math.max(...range);
  return Math.max(minimum, Math.min(maximum, pixel));
}

function nearestCategorical(scale: Scale, pixel: number): string {
  if (scale.kind !== 'band' && scale.kind !== 'point') {
    fail(
      `Scale "${scale.kind}" has no single-valued inverse; analytic geometry supports invertible continuous, band, and point axes only.`,
    );
  }
  const candidates = scale.domain().map((value) => {
    const mapped = scale.map(value);
    return { value: String(value), distance: Math.abs(mapped - pixel) };
  });
  const nearest = candidates.reduce<(typeof candidates)[number] | undefined>(
    (best, candidate) =>
      best === undefined || candidate.distance < best.distance ? candidate : best,
    undefined,
  );
  if (nearest === undefined) fail(`Scale "${scale.kind}" has an empty domain.`);
  return nearest.value;
}

export function domainToPixel(
  context: CartesianCoordinateContext,
  axis: AxisId,
  value: number | string | Date,
): number {
  const mapped = scaleFor(context, axis).map(value);
  if (!Number.isFinite(mapped)) {
    fail(`Value ${String(value)} cannot be mapped on axis "${axis}".`, `$.axes.${axis}`);
  }
  return mapped;
}

export function pixelToDomain(
  context: CartesianCoordinateContext,
  axis: AxisId,
  pixel: number,
): number | string {
  const scale = scaleFor(context, axis);
  const bounded = clampToRange(scale, pixel);
  if (scale.invert === undefined) return nearestCategorical(scale, bounded);
  const value = scale.invert(bounded);
  if (typeof value === 'number' && !Number.isFinite(value)) {
    fail(`Pixel ${pixel} cannot be inverted on axis "${axis}".`, `$.axes.${axis}`);
  }
  return value;
}

export function clampPixelToPlot(
  context: CartesianCoordinateContext,
  point: PixelPoint,
): PixelPoint {
  finite(point.x, 'Pixel x');
  finite(point.y, 'Pixel y');
  return Object.freeze({
    x: Math.max(context.plot.x, Math.min(context.plot.x + context.plot.width, point.x)),
    y: Math.max(context.plot.y, Math.min(context.plot.y + context.plot.height, point.y)),
  });
}

export function pixelPointToDomain(
  context: CartesianCoordinateContext,
  point: PixelPoint,
  axes: { readonly x?: 'x' | 'x2'; readonly y?: 'y' | 'y2' } = {},
): AnalyticPointSelection {
  const bounded = clampPixelToPlot(context, point);
  const xAxis = axes.x ?? 'x';
  const yAxis = axes.y ?? 'y';
  return Object.freeze({
    type: 'point',
    xAxis,
    yAxis,
    x: pixelToDomain(context, xAxis, bounded.x),
    y: pixelToDomain(context, yAxis, bounded.y),
  });
}

export function domainPointToPixel(
  context: CartesianCoordinateContext,
  point: Pick<AnalyticPointSelection, 'xAxis' | 'yAxis' | 'x' | 'y'>,
): PixelPoint {
  if (point.x === undefined || point.y === undefined) {
    fail('A domain point requires both x and y to map to pixels.');
  }
  return Object.freeze({
    x: domainToPixel(context, point.xAxis ?? 'x', point.x),
    y: domainToPixel(context, point.yAxis ?? 'y', point.y),
  });
}

function continuousDomain(
  context: CartesianCoordinateContext,
  axis: AxisId,
  pixel: number,
): number {
  const scale = scaleFor(context, axis);
  if (scale.invert === undefined) {
    fail(
      `Selection geometry on axis "${axis}" requires an invertible continuous scale; "${scale.kind}" is unsupported.`,
      `$.axes.${axis}`,
    );
  }
  const value = pixelToDomain(context, axis, pixel);
  if (typeof value !== 'number') {
    fail(`Selection geometry on axis "${axis}" must invert to a number.`, `$.axes.${axis}`);
  }
  return value;
}

function extent(start: number, end: number): readonly [number, number] {
  return Object.freeze(start <= end ? [start, end] : [end, start]);
}

export function pixelRectangleToSelection(
  context: CartesianCoordinateContext,
  start: PixelPoint,
  end: PixelPoint,
  options: {
    readonly type?: 'interval' | 'rectangle';
    readonly xAxis?: 'x' | 'x2';
    readonly yAxis?: 'y' | 'y2';
  } = {},
): AnalyticIntervalSelection | AnalyticRectangleSelection {
  const first = clampPixelToPlot(context, start);
  const last = clampPixelToPlot(context, end);
  const xAxis = options.xAxis ?? 'x';
  const yAxis = options.yAxis ?? 'y';
  return Object.freeze({
    type: options.type ?? 'rectangle',
    xAxis,
    yAxis,
    x: extent(continuousDomain(context, xAxis, first.x), continuousDomain(context, xAxis, last.x)),
    y: extent(continuousDomain(context, yAxis, first.y), continuousDomain(context, yAxis, last.y)),
  });
}

export function pixelAxisToSelection(
  context: CartesianCoordinateContext,
  axis: AxisId,
  start: PixelPoint,
  end: PixelPoint,
): AnalyticAxisSelection {
  const first = clampPixelToPlot(context, start);
  const last = clampPixelToPlot(context, end);
  const horizontal = axis === 'x' || axis === 'x2';
  return Object.freeze({
    type: 'axis',
    axis,
    extent: extent(
      continuousDomain(context, axis, horizontal ? first.x : first.y),
      continuousDomain(context, axis, horizontal ? last.x : last.y),
    ),
  });
}

export function pixelLassoToSelection(
  context: CartesianCoordinateContext,
  points: readonly PixelPoint[],
  axes: { readonly x?: 'x' | 'x2'; readonly y?: 'y' | 'y2' } = {},
): AnalyticLassoSelection {
  if (points.length < 3) fail('A lasso gesture requires at least three points.');
  if (points.length > 512) fail('A lasso gesture exceeds the 512 point bound.');
  const xAxis = axes.x ?? 'x';
  const yAxis = axes.y ?? 'y';
  const domainPoints: AnalyticDomainPoint[] = points.map((point) => {
    const bounded = clampPixelToPlot(context, point);
    return Object.freeze({
      x: continuousDomain(context, xAxis, bounded.x),
      y: continuousDomain(context, yAxis, bounded.y),
    });
  });
  return Object.freeze({
    type: 'lasso',
    xAxis,
    yAxis,
    points: Object.freeze(domainPoints),
  });
}

export function selectionToPixels(
  context: CartesianCoordinateContext,
  selection: AnalyticSelection,
): readonly PixelPoint[] {
  if (selection.type === 'point') {
    if (selection.x === undefined || selection.y === undefined) return [];
    return [domainPointToPixel(context, selection)];
  }
  if (selection.type === 'interval' || selection.type === 'rectangle') {
    return [
      Object.freeze({
        x: domainToPixel(context, selection.xAxis, selection.x[0]),
        y: domainToPixel(context, selection.yAxis, selection.y[0]),
      }),
      Object.freeze({
        x: domainToPixel(context, selection.xAxis, selection.x[1]),
        y: domainToPixel(context, selection.yAxis, selection.y[1]),
      }),
    ];
  }
  if (selection.type === 'axis') {
    const horizontal = selection.axis === 'x' || selection.axis === 'x2';
    const start = domainToPixel(context, selection.axis, selection.extent[0]);
    const end = domainToPixel(context, selection.axis, selection.extent[1]);
    return horizontal
      ? [
          Object.freeze({ x: start, y: context.plot.y }),
          Object.freeze({ x: end, y: context.plot.y + context.plot.height }),
        ]
      : [
          Object.freeze({ x: context.plot.x, y: start }),
          Object.freeze({ x: context.plot.x + context.plot.width, y: end }),
        ];
  }
  return selection.points.map((point) =>
    Object.freeze({
      x: domainToPixel(context, selection.xAxis, point.x),
      y: domainToPixel(context, selection.yAxis, point.y),
    }),
  );
}
