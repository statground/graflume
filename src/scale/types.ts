export interface Tick {
  readonly value: number | string;
  readonly label: string;
  readonly position: number;
}

export type PositionScaleType =
  | 'linear'
  | 'log'
  | 'symlog'
  | 'asinh'
  | 'pow'
  | 'sqrt'
  | 'time'
  | 'utc'
  | 'band'
  | 'point'
  | 'ordinal'
  | 'quantile'
  | 'quantize'
  | 'threshold'
  | 'probability'
  | 'logit'
  | 'probit';

export type ColorScaleType = 'ordinal' | 'sequential' | 'diverging' | 'cyclic';
export type ScaleOutOfBounds = 'extrapolate' | 'clamp' | 'error' | 'unknown';

export interface PositionScaleDescriptor {
  readonly type: PositionScaleType;
  readonly domain: readonly (number | string)[];
  readonly range: readonly number[];
  /** Authored reverse flag, independent from a layout-owned descending range. */
  readonly reverse: boolean;
  readonly rangeDirection: 'ascending' | 'descending';
  readonly outOfBounds: ScaleOutOfBounds;
}

export interface ColorScaleDescriptor {
  readonly type: ColorScaleType;
  readonly domain: readonly (number | string)[];
  readonly range: readonly string[];
  readonly reverse: boolean;
  readonly outOfBounds: ScaleOutOfBounds | 'wrap';
}

export interface Scale {
  readonly kind: PositionScaleType;
  readonly bandwidth: number;
  readonly descriptor: PositionScaleDescriptor;
  domain(): readonly (number | string)[];
  range(): readonly number[];
  map(value: number | string | Date): number;
  /** Present only when the scale has a single-valued inverse. */
  readonly invert?: (position: number) => number | string;
  ticks(count: number, locale?: string): readonly Tick[];
}

/** Colour scales are deliberately separate from numeric position scales. */
export interface ColorScale {
  readonly kind: ColorScaleType;
  readonly descriptor: ColorScaleDescriptor;
  domain(): readonly (number | string)[];
  range(): readonly string[];
  map(value: number | string | Date): string;
}
