import type { ChartFamilyEntry, ChartVariantEntry } from './chart-types.js';

const family = (id: string, name: string, quickApi: string, mark: string): ChartFamilyEntry => ({
  id,
  name,
  quickApi,
  mark,
});

const variant = (
  id: string,
  name: string,
  quickApi: string,
  mark: string,
  familyId: string,
  mode = 'default',
): ChartVariantEntry => ({ id, name, quickApi, mark, familyId, mode });

/** Distinct families added by the complete entrypoint. */
export const additionalChartTypeCatalog = [
  family('radar', 'Radar chart', 'radar', 'radar'),
  family('network', 'Network chart', 'network', 'graph'),
  family('chord', 'Chord diagram', 'chord', 'chord'),
  family('funnel', 'Funnel chart', 'funnel', 'funnel'),
  family('parallel', 'Parallel coordinates', 'parallel', 'parallel'),
  family('boxplot', 'Boxplot', 'boxplot', 'boxplot'),
  family('heatmap', 'Heatmap', 'heatmap', 'heatmap'),
] as const;

/** Existing advanced names retained as compatible presets. */
export const additionalChartVariantCatalog = [
  variant('radar', 'Radar chart', 'radar', 'radar', 'radar'),
  variant('tree', 'Tree chart', 'tree', 'tree', 'hierarchy', 'tree'),
  variant('graph', 'Graph chart', 'graph', 'graph', 'network', 'node-link'),
  variant('chord', 'Chord diagram', 'chord', 'chord', 'chord'),
  variant('funnel', 'Funnel chart', 'funnel', 'funnel', 'funnel'),
  variant('parallel', 'Parallel coordinates', 'parallel', 'parallel', 'parallel'),
  variant('boxplot', 'Boxplot', 'boxplot', 'boxplot', 'boxplot'),
  variant(
    'effect-scatter',
    'Effect scatter chart',
    'effectScatter',
    'effect-scatter',
    'scatter',
    'emphasis',
  ),
  variant('lines', 'Connection lines', 'lines', 'lines', 'network', 'connections'),
  variant('heatmap', 'Heatmap', 'heatmap', 'heatmap', 'heatmap'),
  variant(
    'pictorial-bar',
    'Pictorial bar chart',
    'pictorialBar',
    'pictorial-bar',
    'bar',
    'pictorial',
  ),
  variant('theme-river', 'Theme river chart', 'themeRiver', 'theme-river', 'area', 'stream'),
  variant('sunburst', 'Sunburst chart', 'sunburst', 'sunburst', 'hierarchy', 'sunburst'),
  variant('custom', 'Declarative custom chart', 'custom', 'custom', 'custom'),
] as const;

export type AdditionalChartTypeId = (typeof additionalChartTypeCatalog)[number]['id'];
export type AdditionalChartVariantId = (typeof additionalChartVariantCatalog)[number]['id'];
