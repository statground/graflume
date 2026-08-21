export interface ChartFamilyEntry {
  readonly id: string;
  readonly name: string;
  readonly quickApi: string;
  readonly mark: string;
}

export interface ChartVariantEntry extends ChartFamilyEntry {
  readonly familyId: string;
  readonly mode: string;
}

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

/** Established chart families shown in discovery surfaces. */
export const chartTypeCatalog = [
  family('annotation', 'Annotation chart', 'annotation', 'annotation'),
  family('area', 'Area chart', 'area', 'area'),
  family('bar', 'Bar chart', 'bar', 'bar'),
  family('bubble', 'Bubble chart', 'bubble', 'bubble'),
  family('calendar', 'Calendar chart', 'calendar', 'calendar'),
  family('candlestick', 'Candlestick chart', 'candlestick', 'candlestick'),
  family('combination', 'Combination chart', 'combo', 'multiple'),
  family('difference', 'Difference chart', 'diff', 'diff'),
  family('pie', 'Pie chart', 'pie', 'pie'),
  family('timeline', 'Timeline and range chart', 'timeline', 'timeline'),
  family('gauge', 'Gauge chart', 'gauge', 'gauge'),
  family('map', 'Map chart', 'map', 'map'),
  family('histogram', 'Histogram', 'histogram', 'histogram'),
  family('interval', 'Interval chart', 'intervals', 'interval'),
  family('line', 'Line chart', 'line', 'line'),
  family('motion', 'Motion chart', 'motion', 'motion'),
  family('hierarchy', 'Hierarchy chart', 'treemap', 'treemap'),
  family('flow', 'Flow diagram', 'sankey', 'sankey'),
  family('scatter', 'Scatter chart', 'scatter', 'point'),
  family('table', 'Table chart', 'table', 'table'),
  family('waterfall', 'Waterfall chart', 'waterfall', 'waterfall'),
  family('word-tree', 'Word tree', 'wordTree', 'word-tree'),
] as const;

/** Existing Quick API names retained as compatible presets. */
export const chartVariantCatalog = [
  variant('annotation', 'Annotation chart', 'annotation', 'annotation', 'annotation'),
  variant(
    'annotated-timeline',
    'Annotated timeline',
    'annotatedTimeline',
    'annotation',
    'annotation',
    'timeline',
  ),
  variant('area', 'Area chart', 'area', 'area', 'area'),
  variant('bar', 'Bar chart', 'horizontalBar', 'bar', 'bar', 'horizontal'),
  variant('bubble', 'Bubble chart', 'bubble', 'bubble', 'bubble'),
  variant('calendar', 'Calendar chart', 'calendar', 'calendar', 'calendar'),
  variant('candlestick', 'Candlestick chart', 'candlestick', 'candlestick', 'candlestick'),
  variant('column', 'Column chart', 'column', 'bar', 'bar', 'vertical'),
  variant('combo', 'Combo chart', 'combo', 'multiple', 'combination'),
  variant('diff', 'Diff chart', 'diff', 'diff', 'difference'),
  variant('donut', 'Donut chart', 'donut', 'pie', 'pie', 'donut'),
  variant('gantt', 'Gantt chart', 'gantt', 'gantt', 'timeline', 'gantt'),
  variant('gauge', 'Gauge chart', 'gauge', 'gauge', 'gauge'),
  variant('geo', 'Geographic region chart', 'geo', 'geo', 'map', 'region'),
  variant('histogram', 'Histogram', 'histogram', 'histogram', 'histogram'),
  variant('intervals', 'Intervals', 'intervals', 'interval', 'interval'),
  variant('line', 'Line chart', 'line', 'line', 'line'),
  variant('map', 'Map', 'map', 'map', 'map'),
  variant('motion', 'Motion chart', 'motion', 'motion', 'motion'),
  variant('org', 'Organization chart', 'org', 'org', 'hierarchy', 'organization'),
  variant('pie', 'Pie chart', 'pie', 'pie', 'pie'),
  variant('sankey', 'Sankey diagram', 'sankey', 'sankey', 'flow'),
  variant('scatter', 'Scatter chart', 'scatter', 'point', 'scatter'),
  variant('stepped-area', 'Stepped area chart', 'steppedArea', 'stepped-area', 'area', 'stepped'),
  variant('table', 'Table chart', 'table', 'table', 'table'),
  variant('timeline', 'Timeline', 'timeline', 'timeline', 'timeline'),
  variant('treemap', 'Tree map', 'treemap', 'treemap', 'hierarchy', 'treemap'),
  variant('trendline', 'Trendline', 'trendline', 'trendline', 'line', 'trend'),
  variant('vega', 'Portable adapter chart', 'vegaChart', 'vega', 'custom', 'adapter'),
  variant('waterfall', 'Waterfall chart', 'waterfall', 'waterfall', 'waterfall'),
  variant('word-tree', 'Word tree', 'wordTree', 'word-tree', 'word-tree'),
] as const;

export type ChartTypeId = (typeof chartTypeCatalog)[number]['id'];
export type ChartVariantId = (typeof chartVariantCatalog)[number]['id'];
