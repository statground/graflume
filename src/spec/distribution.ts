export type EffectiveDistributionMode =
  | 'histogram'
  | 'boxplot'
  | 'violin'
  | 'curve'
  | 'kde'
  | 'ecdf'
  | 'ccdf'
  | 'histogram-2d'
  | 'histogram-2d-contour';

/** Resolves canonical/default labels and unknown compatibility values to histogram mode. */
export function resolveDistributionMode(value: unknown): EffectiveDistributionMode {
  if (value === 'box' || value === 'boxplot') return 'boxplot';
  if (value === 'violin') return 'violin';
  if (value === 'curve' || value === 'bell-curve') return 'curve';
  if (value === 'kde' || value === 'density') return 'kde';
  if (value === 'ecdf') return 'ecdf';
  if (value === 'ccdf' || value === 'survival') return 'ccdf';
  if (value === 'histogram-2d' || value === 'bivariate') return 'histogram-2d';
  if (value === 'histogram-2d-contour' || value === 'bivariate-contour') {
    return 'histogram-2d-contour';
  }
  return 'histogram';
}
