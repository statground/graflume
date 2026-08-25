import { resolveTechnicalIndicatorPresentation } from '../data/technical-indicators.js';
import type { ChartSpec, LayerSpec, MarkSpec } from '../spec/types.js';

function calculatedIndicatorPanel(layer: LayerSpec): string | null {
  if (typeof layer.mark === 'string' || layer.mark.type !== 'indicator') return null;
  const mark = layer.mark as MarkSpec;
  if (mark.options?.calculate !== true) return null;
  const kind = typeof mark.options.kind === 'string' ? mark.options.kind : 'sma';
  const presentation = resolveTechnicalIndicatorPresentation(kind);
  return presentation?.placement === 'panel' ? presentation.panelId : null;
}

function paneChild(input: ChartSpec, layers: readonly LayerSpec[]): ChartSpec {
  return {
    layers,
    ...(input.axes === undefined ? {} : { axes: input.axes }),
    ...(input.markLabels === undefined ? {} : { markLabels: input.markLabels }),
    ...(input.interaction === undefined ? {} : { interaction: input.interaction }),
    ...(input.accessibility === undefined ? {} : { accessibility: input.accessibility }),
    ...(input.renderer === undefined ? {} : { renderer: input.renderer }),
    ...(input.performance === undefined ? {} : { performance: input.performance }),
    ...(input.locale === undefined ? {} : { locale: input.locale }),
  };
}

/**
 * Converts a flat price/indicator layer chart into independent vertically
 * stacked panes. Overlay indicators remain with price; oscillator-like
 * indicators are grouped by their stable registry panel ID.
 */
export function materializeTechnicalIndicatorPanes(input: ChartSpec): ChartSpec {
  if (input.layers === undefined || input.layers.length === 0) return input;
  const priceLayers: LayerSpec[] = [];
  const indicatorPanes = new Map<string, LayerSpec[]>();
  for (const layer of input.layers) {
    const panelId = calculatedIndicatorPanel(layer);
    if (panelId === null) {
      priceLayers.push(layer);
      continue;
    }
    const layers = indicatorPanes.get(panelId) ?? [];
    layers.push(layer);
    indicatorPanes.set(panelId, layers);
  }
  const viewCount = indicatorPanes.size + (priceLayers.length === 0 ? 0 : 1);
  if (indicatorPanes.size === 0 || viewCount < 2) return input;

  const parent = { ...input } as Record<string, unknown>;
  delete parent.layers;
  delete parent.mark;
  delete parent.x;
  delete parent.y;
  delete parent.encoding;
  const views = [
    ...(priceLayers.length === 0 ? [] : [paneChild(input, priceLayers)]),
    ...[...indicatorPanes.values()].map((layers) => paneChild(input, layers)),
  ];
  return {
    ...(parent as ChartSpec),
    vconcat: views,
    spacing: Math.min(12, input.spacing ?? 8),
    resolve: {
      ...input.resolve,
      scale: 'independent',
      axis: 'independent',
      legend: input.resolve?.legend ?? 'shared',
    },
  };
}
