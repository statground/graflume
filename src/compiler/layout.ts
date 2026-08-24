import type { NormalizedChartSpec } from '../spec/types.js';
import type { ThemeTokens } from '../theme/types.js';
import type { PlotArea } from './types.js';

export interface LayoutInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ChartLayout {
  readonly width: number;
  readonly height: number;
  readonly plot: PlotArea;
  readonly insets: LayoutInsets;
  readonly titleY: number;
  readonly subtitleY: number;
}

export function createLayout(
  spec: NormalizedChartSpec,
  width: number,
  height: number,
  theme: ThemeTokens,
  minimumInsets: Partial<LayoutInsets> = {},
  additionalInsets: Partial<LayoutInsets> = {},
): ChartLayout {
  const separatePlotMargin = theme.spacing.plotMargin !== undefined;
  const measuredTitleBlock =
    spec.title === undefined
      ? 0
      : theme.typography.titleSize +
        (spec.title.subtitle === undefined
          ? theme.spacing.lg
          : theme.typography.subtitleSize + theme.spacing.lg + theme.spacing.xs);
  const titleBlock = Math.max(measuredTitleBlock, theme.spacing.minimumTitleBlock ?? 0);
  const insets: LayoutInsets = {
    // A top axis shares the space between the chart heading and the plot. Keep
    // the caller's outer top padding for the heading, then reserve the measured
    // axis gutter inside it. The other sides retain the legacy contract where
    // the normalized padding already includes the primary-axis gutter.
    top:
      spec.padding.top +
      Math.max(0, minimumInsets.top ?? 0) +
      Math.max(0, additionalInsets.top ?? 0),
    right:
      (separatePlotMargin
        ? spec.padding.right + Math.max(0, minimumInsets.right ?? 0)
        : Math.max(spec.padding.right, minimumInsets.right ?? 0)) +
      Math.max(0, additionalInsets.right ?? 0),
    bottom:
      (separatePlotMargin
        ? spec.padding.bottom + Math.max(0, minimumInsets.bottom ?? 0)
        : Math.max(spec.padding.bottom, minimumInsets.bottom ?? 0)) +
      Math.max(0, additionalInsets.bottom ?? 0),
    left:
      (separatePlotMargin
        ? spec.padding.left + Math.max(0, minimumInsets.left ?? 0)
        : Math.max(spec.padding.left, minimumInsets.left ?? 0)) +
      Math.max(0, additionalInsets.left ?? 0),
  };
  const plotX = insets.left;
  const plotY = insets.top + titleBlock;
  const plotWidth = Math.max(1, width - insets.left - insets.right);
  const plotHeight = Math.max(1, height - plotY - insets.bottom);

  return {
    width,
    height,
    plot: { x: plotX, y: plotY, width: plotWidth, height: plotHeight },
    insets,
    titleY: spec.padding.top,
    subtitleY: spec.padding.top + theme.typography.titleSize + theme.spacing.xs,
  };
}
