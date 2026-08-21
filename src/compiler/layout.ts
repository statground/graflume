import type { NormalizedChartSpec } from '../spec/types.js';
import type { ThemeTokens } from '../theme/types.js';
import type { PlotArea } from './types.js';

export interface ChartLayout {
  readonly width: number;
  readonly height: number;
  readonly plot: PlotArea;
  readonly titleY: number;
  readonly subtitleY: number;
}

export function createLayout(
  spec: NormalizedChartSpec,
  width: number,
  height: number,
  theme: ThemeTokens,
): ChartLayout {
  const titleBlock =
    spec.title === undefined
      ? 0
      : theme.typography.titleSize +
        (spec.title.subtitle === undefined
          ? theme.spacing.lg
          : theme.typography.subtitleSize + theme.spacing.lg + theme.spacing.xs);
  const plotX = spec.padding.left;
  const plotY = spec.padding.top + titleBlock;
  const plotWidth = Math.max(1, width - spec.padding.left - spec.padding.right);
  const plotHeight = Math.max(1, height - plotY - spec.padding.bottom);

  return {
    width,
    height,
    plot: { x: plotX, y: plotY, width: plotWidth, height: plotHeight },
    titleY: spec.padding.top,
    subtitleY: spec.padding.top + theme.typography.titleSize + theme.spacing.xs,
  };
}
