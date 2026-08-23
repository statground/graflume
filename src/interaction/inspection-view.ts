import type { InspectionViewTransform } from '../renderer/types.js';

export interface InspectionViewState extends InspectionViewTransform {}

export interface InspectionViewBounds {
  readonly width: number;
  readonly height: number;
  readonly minZoom: number;
  readonly maxZoom: number;
}

export interface InspectionViewPoint {
  readonly x: number;
  readonly y: number;
}

export const identityInspectionView: InspectionViewState = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function constrainInspectionView(
  input: InspectionViewState,
  bounds: InspectionViewBounds,
): InspectionViewState {
  const minZoom = Math.max(1, finite(bounds.minZoom, 1));
  const maxZoom = Math.max(minZoom, finite(bounds.maxZoom, 6));
  const zoom = Math.max(minZoom, Math.min(maxZoom, finite(input.zoom, minZoom)));
  const width = Math.max(1, finite(bounds.width, 1));
  const height = Math.max(1, finite(bounds.height, 1));
  return {
    zoom,
    offsetX: Math.max(width - width * zoom, Math.min(0, finite(input.offsetX, 0))),
    offsetY: Math.max(height - height * zoom, Math.min(0, finite(input.offsetY, 0))),
  };
}

export function zoomInspectionView(
  current: InspectionViewState,
  factor: number,
  anchor: InspectionViewPoint,
  bounds: InspectionViewBounds,
): InspectionViewState {
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('Zoom factor must be > 0.');
  const nextZoom = Math.max(bounds.minZoom, Math.min(bounds.maxZoom, current.zoom * factor));
  const ratio = nextZoom / current.zoom;
  return constrainInspectionView(
    {
      zoom: nextZoom,
      offsetX: anchor.x - (anchor.x - current.offsetX) * ratio,
      offsetY: anchor.y - (anchor.y - current.offsetY) * ratio,
    },
    bounds,
  );
}

export function panInspectionView(
  current: InspectionViewState,
  deltaX: number,
  deltaY: number,
  bounds: InspectionViewBounds,
): InspectionViewState {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    throw new RangeError('Pan deltas must be finite numbers.');
  }
  return constrainInspectionView(
    {
      ...current,
      offsetX: current.offsetX + deltaX,
      offsetY: current.offsetY + deltaY,
    },
    bounds,
  );
}

export function inverseInspectionPoint(
  view: InspectionViewState,
  point: InspectionViewPoint,
): InspectionViewPoint {
  return {
    x: (point.x - view.offsetX) / view.zoom,
    y: (point.y - view.offsetY) / view.zoom,
  };
}
