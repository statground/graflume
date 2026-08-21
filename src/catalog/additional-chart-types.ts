export const additionalChartTypeCatalog = [
  { id: 'radar', name: 'Radar chart', quickApi: 'radar', mark: 'radar' },
  { id: 'tree', name: 'Tree chart', quickApi: 'tree', mark: 'tree' },
  { id: 'graph', name: 'Graph chart', quickApi: 'graph', mark: 'graph' },
  { id: 'chord', name: 'Chord diagram', quickApi: 'chord', mark: 'chord' },
  { id: 'funnel', name: 'Funnel chart', quickApi: 'funnel', mark: 'funnel' },
  { id: 'parallel', name: 'Parallel coordinates', quickApi: 'parallel', mark: 'parallel' },
  { id: 'boxplot', name: 'Boxplot', quickApi: 'boxplot', mark: 'boxplot' },
  {
    id: 'effect-scatter',
    name: 'Effect scatter chart',
    quickApi: 'effectScatter',
    mark: 'effect-scatter',
  },
  { id: 'lines', name: 'Connection lines', quickApi: 'lines', mark: 'lines' },
  { id: 'heatmap', name: 'Heatmap', quickApi: 'heatmap', mark: 'heatmap' },
  {
    id: 'pictorial-bar',
    name: 'Pictorial bar chart',
    quickApi: 'pictorialBar',
    mark: 'pictorial-bar',
  },
  {
    id: 'theme-river',
    name: 'Theme river chart',
    quickApi: 'themeRiver',
    mark: 'theme-river',
  },
  { id: 'sunburst', name: 'Sunburst chart', quickApi: 'sunburst', mark: 'sunburst' },
  { id: 'custom', name: 'Declarative custom chart', quickApi: 'custom', mark: 'custom' },
] as const;

export type AdditionalChartTypeId = (typeof additionalChartTypeCatalog)[number]['id'];
