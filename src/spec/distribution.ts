export type EffectiveDistributionMode =
  'histogram' | 'boxplot' | 'violin' | 'curve' | 'histogram-2d' | 'histogram-2d-contour';

/** Resolves canonical/default labels and unknown compatibility values to histogram mode. */
export function resolveDistributionMode(value: unknown): EffectiveDistributionMode {
  if (value === 'box' || value === 'boxplot') return 'boxplot';
  if (value === 'violin') return 'violin';
  if (value === 'curve' || value === 'bell-curve') return 'curve';
  if (value === 'histogram-2d' || value === 'bivariate') return 'histogram-2d';
  if (value === 'histogram-2d-contour' || value === 'bivariate-contour') {
    return 'histogram-2d-contour';
  }
  return 'histogram';
}
