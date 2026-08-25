import type { NormalizedSelectionSpec } from '../spec/types.js';
import type { AnalyticSelection } from './analytic-selection.js';
import {
  cartesianAxisChannel,
  clampPixelToPlot,
  pixelAxisToSelection,
  pixelLassoToSelection,
  pixelPointToDomain,
  pixelRectangleToSelection,
  type CartesianCoordinateContext,
  type PixelPoint,
} from './cartesian-coordinates.js';

export interface AnalyticKeyboardGesture {
  readonly kind: Exclude<NormalizedSelectionSpec['kind'], 'point'>;
  readonly start: PixelPoint;
  readonly current: PixelPoint;
  readonly points: readonly PixelPoint[];
}

function samePoint(left: PixelPoint, right: PixelPoint): boolean {
  return Math.abs(left.x - right.x) < 1e-9 && Math.abs(left.y - right.y) < 1e-9;
}

function defaultOrigin(context: CartesianCoordinateContext): PixelPoint {
  return Object.freeze({
    x: context.plot.x + context.plot.width / 2,
    y: context.plot.y + context.plot.height / 2,
  });
}

export function startAnalyticKeyboardGesture(
  context: CartesianCoordinateContext,
  kind: AnalyticKeyboardGesture['kind'],
  origin: PixelPoint = defaultOrigin(context),
): AnalyticKeyboardGesture {
  const point = clampPixelToPlot(context, origin);
  return Object.freeze({ kind, start: point, current: point, points: Object.freeze([point]) });
}

export function moveAnalyticKeyboardGesture(
  context: CartesianCoordinateContext,
  gesture: AnalyticKeyboardGesture,
  direction: 'left' | 'right' | 'up' | 'down',
  step: number,
): AnalyticKeyboardGesture {
  const amount = Number.isFinite(step) && step > 0 ? step : 1;
  const delta =
    direction === 'left'
      ? { x: -amount, y: 0 }
      : direction === 'right'
        ? { x: amount, y: 0 }
        : direction === 'up'
          ? { x: 0, y: -amount }
          : { x: 0, y: amount };
  const current = clampPixelToPlot(context, {
    x: gesture.current.x + delta.x,
    y: gesture.current.y + delta.y,
  });
  return Object.freeze({ ...gesture, current });
}

export function addAnalyticKeyboardVertex(
  gesture: AnalyticKeyboardGesture,
  maximumPoints: number,
): AnalyticKeyboardGesture {
  if (gesture.kind !== 'lasso') return gesture;
  const last = gesture.points.at(-1);
  if (last !== undefined && samePoint(last, gesture.current)) return gesture;
  if (gesture.points.length >= maximumPoints) return gesture;
  return Object.freeze({
    ...gesture,
    points: Object.freeze([...gesture.points, gesture.current]),
  });
}

function lassoPoints(gesture: AnalyticKeyboardGesture): readonly PixelPoint[] {
  const last = gesture.points.at(-1);
  return last !== undefined && samePoint(last, gesture.current)
    ? gesture.points
    : [...gesture.points, gesture.current];
}

export function previewAnalyticKeyboardSelection(
  context: CartesianCoordinateContext,
  gesture: AnalyticKeyboardGesture,
  config: NormalizedSelectionSpec,
): AnalyticSelection {
  if (gesture.kind === 'axis') {
    return pixelAxisToSelection(context, config.axis!, gesture.start, gesture.current);
  }
  if (gesture.kind === 'lasso') {
    const points = lassoPoints(gesture);
    if (points.length >= 3) {
      return pixelLassoToSelection(context, points, { x: config.xAxis, y: config.yAxis });
    }
    return pixelPointToDomain(context, gesture.current, {
      x: config.xAxis,
      y: config.yAxis,
    });
  }
  return pixelRectangleToSelection(context, gesture.start, gesture.current, {
    type: gesture.kind,
    xAxis: config.xAxis,
    yAxis: config.yAxis,
  });
}

export function completeAnalyticKeyboardSelection(
  context: CartesianCoordinateContext,
  gesture: AnalyticKeyboardGesture,
  config: NormalizedSelectionSpec,
): AnalyticSelection | null {
  const spanX = Math.abs(gesture.current.x - gesture.start.x);
  const spanY = Math.abs(gesture.current.y - gesture.start.y);
  if (gesture.kind === 'axis') {
    const span = cartesianAxisChannel(context, config.axis!) === 'x' ? spanX : spanY;
    return span < config.minPixelSpan
      ? null
      : pixelAxisToSelection(context, config.axis!, gesture.start, gesture.current);
  }
  if (gesture.kind === 'lasso') {
    const points = lassoPoints(gesture);
    return points.length < 3 || Math.max(spanX, spanY) < config.minPixelSpan
      ? null
      : pixelLassoToSelection(context, points, { x: config.xAxis, y: config.yAxis });
  }
  return Math.max(spanX, spanY) < config.minPixelSpan
    ? null
    : pixelRectangleToSelection(context, gesture.start, gesture.current, {
        type: gesture.kind,
        xAxis: config.xAxis,
        yAxis: config.yAxis,
      });
}
