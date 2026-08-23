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
  family('polar', 'Polar chart', 'polar', 'polar'),
  family('network', 'Network chart', 'network', 'graph'),
  family('chord', 'Chord diagram', 'chord', 'chord'),
  family('funnel', 'Funnel chart', 'funnel', 'funnel'),
  family('parallel', 'Parallel coordinates', 'parallel', 'parallel'),
  family('heatmap', 'Heatmap', 'heatmap', 'heatmap'),
  family('image', 'Raster image', 'image', 'image'),
  family('ternary', 'Ternary chart', 'ternary', 'ternary'),
  family('smith', 'Smith chart', 'smith', 'smith'),
  family('scatter-matrix', 'Scatter matrix', 'scatterMatrix', 'scatter-matrix'),
  family('carpet', 'Carpet chart', 'carpet', 'carpet'),
] as const;

/** Existing advanced names retained as compatible presets. */
export const additionalChartVariantCatalog = [
  variant('polar', 'Polar chart', 'polar', 'polar', 'polar'),
  variant('radar', 'Radar chart', 'radar', 'radar', 'polar', 'radar'),
  variant('polar-line', 'Polar line chart', 'polarLine', 'polar', 'polar', 'line'),
  variant('polar-scatter', 'Polar scatter chart', 'polarScatter', 'polar', 'polar', 'scatter'),
  variant('polar-bar', 'Polar bar chart', 'polarBar', 'polar', 'polar', 'bar'),
  variant('tree', 'Tree chart', 'tree', 'tree', 'hierarchy', 'tree'),
  variant('graph', 'Graph chart', 'graph', 'graph', 'network', 'node-link'),
  variant('chord', 'Chord diagram', 'chord', 'chord', 'chord'),
  variant('funnel', 'Funnel chart', 'funnel', 'funnel', 'funnel'),
  variant('funnel-area', 'Funnel area chart', 'funnelArea', 'funnel', 'funnel', 'area'),
  variant('parallel', 'Parallel coordinates', 'parallel', 'parallel', 'parallel'),
  variant(
    'parallel-categories',
    'Parallel categories',
    'parallelCategories',
    'parallel',
    'parallel',
    'categories',
  ),
  variant('boxplot', 'Boxplot', 'boxplot', 'boxplot', 'distribution', 'boxplot'),
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
  variant('image', 'Raster image', 'image', 'image', 'image'),
  variant('ternary', 'Ternary chart', 'ternary', 'ternary', 'ternary'),
  variant('smith', 'Smith chart', 'smith', 'smith', 'smith'),
  variant('scatter-matrix', 'Scatter matrix', 'scatterMatrix', 'scatter-matrix', 'scatter-matrix'),
  variant('carpet', 'Carpet chart', 'carpet', 'carpet', 'carpet'),
  variant(
    'carpet-scatter',
    'Carpet scatter overlay',
    'carpetScatter',
    'carpet',
    'carpet',
    'scatter',
  ),
  variant(
    'carpet-contour',
    'Carpet contour overlay',
    'carpetContour',
    'carpet',
    'carpet',
    'contour',
  ),
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
