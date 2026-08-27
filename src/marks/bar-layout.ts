import { BandScale } from '../scale/band.js';
import type { Scale } from '../scale/types.js';
import { exactStrideSampleIndices } from '../data/sample.js';

export interface BarBandLayoutOptions {
  readonly scale: Scale;
  readonly centers: readonly number[];
  readonly plotSpan: number;
  readonly categoryCount: number;
  readonly groupCount?: number;
  readonly barWidthRatio?: number;
  /** Expand sampled categorical bands across the distance between visible rows. */
  readonly lodSampled?: boolean;
  readonly maxThickness?: number;
  /** Keep a reference theme's authored ratio exact before the shared maximum-thickness cap. */
  readonly preserveAuthoredRatio?: boolean;
}

export interface BarBandLayout {
  /** Distance between the centers of adjacent bars inside one category. */
  readonly slot: number;
  /** Rendered cross-axis size of one bar. */
  readonly thickness: number;
  /** Full category-to-category stride used to enforce non-overlap. */
  readonly categoryStride: number;
  /** Clear space left between adjacent bars in the same category lane. */
  readonly gap: number;
}

export interface BarCategorySelectionOptions {
  readonly categoryCount: number;
  readonly plotSpan: number;
  readonly maximumMarks: number;
  readonly marksPerCategory?: number;
  readonly groupCount?: number;
}

/** Reference-style themes keep their authored bar ratio until the safety cap applies. */
export function preservesReferenceBarRatio(themeName: string): boolean {
  return themeName === 'ggplot' || themeName === 'r-base' || themeName === 'matplotlib';
}

/** Pixel- and mark-budgeted, endpoint-preserving category selection for bar-like families. */
export function selectBarCategoryIndices(options: BarCategorySelectionOptions): readonly number[] {
  const categoryCount = Math.max(0, Math.floor(options.categoryCount));
  if (categoryCount === 0) return [];
  const marksPerCategory = Math.max(1, Math.floor(options.marksPerCategory ?? 1));
  const groupCount = Math.max(1, Math.floor(options.groupCount ?? 1));
  const markBudget = Math.max(1, Math.floor(options.maximumMarks / marksPerCategory));
  const minimumClusterStride = Math.max(2, groupCount * 1.5);
  const pixelBudget = Math.max(1, Math.floor(options.plotSpan / minimumClusterStride));
  return exactStrideSampleIndices(categoryCount, Math.min(markBudget, pixelBudget));
}

function minimumPositiveGap(values: readonly number[]): number | null {
  const sorted = [...new Set(values.filter(Number.isFinite))].sort((left, right) => left - right);
  let gap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < sorted.length; index += 1) {
    gap = Math.min(gap, sorted[index]! - sorted[index - 1]!);
  }
  return Number.isFinite(gap) && gap > 0 ? gap : null;
}

/**
 * Resolve one collision-safe category band for bar-like marks.
 *
 * Band scales expose their exact category stride. Continuous/temporal category
 * axes instead use the nearest rendered center distance, so irregular or dense
 * categories cannot produce bars wider than the available lane. Grouped bars
 * subdivide that same lane rather than independently estimating their width.
 */
export function resolveBarBandLayout(options: BarBandLayoutOptions): BarBandLayout {
  const groupCount = Math.max(1, Math.floor(options.groupCount ?? 1));
  const visibleCategoryCount = Math.max(1, new Set(options.centers.filter(Number.isFinite)).size);
  const fallbackStride = Math.max(
    Number.EPSILON,
    options.plotSpan /
      Math.max(
        1,
        options.lodSampled === true ? visibleCategoryCount : Math.floor(options.categoryCount),
      ),
  );
  const visibleStride = minimumPositiveGap(options.centers);
  const categoryStride =
    options.scale instanceof BandScale
      ? (visibleStride ??
        (options.lodSampled === true
          ? Math.max(options.scale.step, fallbackStride)
          : options.scale.step))
      : (visibleStride ?? fallbackStride);
  const nativeBandRatio =
    options.scale instanceof BandScale && options.scale.step > 0
      ? options.scale.bandwidth / options.scale.step
      : 0.8;
  const occupiedCategoryBand = Math.min(
    categoryStride,
    options.barWidthRatio === undefined ? categoryStride * nativeBandRatio : categoryStride,
  );
  const slot = occupiedCategoryBand / groupCount;
  const authoredRatio = options.barWidthRatio ?? 0.74;
  const ratio = Math.max(
    0,
    Math.min(
      options.preserveAuthoredRatio === true ? 1 : groupCount > 1 ? 0.82 : 0.92,
      authoredRatio,
    ),
  );
  const proportionalGap =
    options.preserveAuthoredRatio === true
      ? slot * (1 - ratio)
      : slot * (groupCount > 1 ? 0.18 : 0.08);
  const maxThickness = Math.max(1, options.maxThickness ?? (groupCount > 1 ? 52 : 64));
  const thickness = Math.max(
    Number.EPSILON,
    Math.min(maxThickness, categoryStride / groupCount, slot * ratio, slot - proportionalGap),
  );
  return {
    slot,
    thickness,
    categoryStride,
    gap: Math.max(0, slot - thickness),
  };
}
