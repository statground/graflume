export interface SpatialSizeInput {
  readonly fullscreen: boolean;
  readonly measuredWidth: number;
  readonly measuredHeight: number;
  readonly requestedWidth?: number;
  readonly requestedHeight?: number;
  readonly configuredWidth?: number;
  readonly configuredHeight?: number;
}

export interface SpatialSize {
  readonly width: number;
  readonly height: number;
}

function usableDimension(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 1 ? value : fallback;
}

function explicitDimension(...values: readonly (number | undefined)[]): number | undefined {
  return values.find((value) => value !== undefined && Number.isFinite(value) && value > 0);
}

/**
 * Fullscreen always follows the fullscreen element's measured box. Explicit creation and resize
 * dimensions apply only to the embedded chart.
 */
export function resolveSpatialSize(input: SpatialSizeInput): SpatialSize {
  const measuredWidth = usableDimension(input.measuredWidth, 640);
  const measuredHeight = usableDimension(input.measuredHeight, 420);
  if (input.fullscreen) return { width: measuredWidth, height: measuredHeight };
  return {
    width: explicitDimension(input.requestedWidth, input.configuredWidth) ?? measuredWidth,
    height: explicitDimension(input.requestedHeight, input.configuredHeight) ?? measuredHeight,
  };
}
