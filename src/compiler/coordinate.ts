import type { NormalizedLayerSpec } from '../spec/types.js';

/** Marks whose geometry is usually laid out independently of Cartesian x/y axes. */
export const AXISLESS_MARKS: ReadonlySet<string> = new Set([
  'arc-diagram',
  'calendar',
  'carpet',
  'chord',
  'funnel',
  'gauge',
  'geo-flow',
  'geo-heatmap',
  'geo-line',
  'graph',
  'geo',
  'item',
  'map',
  'org',
  'packed-bubble',
  'parallel',
  'pie',
  'polar',
  'pyramid',
  'radar',
  'sankey',
  'scatter-matrix',
  'smith',
  'solid-gauge',
  'sunburst',
  'table',
  'ternary',
  'tiled-map',
  'tilemap',
  'tree',
  'treemap',
  'variable-pie',
  'venn',
  'word-cloud',
  'word-tree',
]);

/**
 * Resolve coordinate semantics from the normalized layer, not just the mark name.
 * `pyramid` serves both radial funnel/pyramid layouts and the Cartesian
 * `column-pyramid` compatibility variant.
 */
export function isAxislessLayer(layer: Pick<NormalizedLayerSpec, 'mark'>): boolean {
  if (layer.mark.type === 'pyramid') {
    return layer.mark.options.variant !== 'column-pyramid';
  }
  return AXISLESS_MARKS.has(layer.mark.type);
}
