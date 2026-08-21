import { mkdir, writeFile } from 'node:fs/promises';
import { format } from 'prettier';

const directory = new URL('../docs/charts/', import.meta.url);

const guides = [
  {
    id: 'annotation',
    title: 'Annotation charts',
    api: 'annotation',
    mark: 'annotation',
    use: 'Use an annotation chart when a time series must explain named events at specific dates.',
    contract:
      '`x` is temporal, `y` is quantitative, and `mark.fields.annotation` names the short event-label field. `annotationText` may name a longer detail field.',
    behavior:
      'The compiler draws the canonical line path first, then adds a clipped vertical guide and theme-aware label pill for every non-empty annotation value. Missing x/y values split the line; missing annotations only suppress the guide.',
    example: `Graflume.annotation('#chart', data, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { annotation: 'event', annotationText: 'detail' }, point: true },
});`,
    limits:
      'Annotation label collision avoidance, a side detail panel, range navigation, and multi-series annotation arbitration are not implemented yet.',
  },
  {
    id: 'annotated-timeline',
    title: 'Annotated timelines',
    api: 'annotatedTimeline',
    mark: 'annotation',
    use: 'Use this compatibility API when migrating code that calls the older Annotated Timeline name.',
    contract:
      'It accepts the same temporal x, quantitative y, and annotation fields as `annotation()` and normalizes to the same `annotation` mark.',
    behavior:
      'Rendering is identical to the Annotation chart. The alias exists for discoverability and migration; it does not create a second portable mark.',
    example: `Graflume.annotatedTimeline('#chart', data, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { annotation: 'event' } },
});`,
    limits: 'The legacy range selector and side annotation list are not reproduced.',
  },
  {
    id: 'bubble',
    title: 'Bubble charts',
    api: 'bubble',
    mark: 'bubble',
    use: 'Use a bubble chart to compare two quantitative positions plus magnitude and an optional category.',
    contract:
      '`x` and `y` are quantitative. `mark.fields.size` supplies bubble area magnitude and `color` supplies a categorical palette key. `minRadius` and `maxRadius` are portable numeric options.',
    behavior:
      'Bubble radius uses a square-root scale so perceived area tracks magnitude. Missing positions are skipped; missing size uses the middle radius. Motion charts reuse this compiler after frame filtering.',
    example: `Graflume.bubble('#chart', data, {
  x: { field: 'reach', type: 'quantitative' },
  y: { field: 'impact', type: 'quantitative' },
  mark: { fields: { size: 'budget', color: 'team' }, options: { minRadius: 6, maxRadius: 26 } },
});`,
    limits:
      'Automatic bubble-label placement, collision packing, and categorical legends are not implemented yet.',
  },
  {
    id: 'calendar',
    title: 'Calendar charts',
    api: 'calendar',
    mark: 'calendar',
    use: 'Use a calendar chart to reveal daily intensity, seasonality, and gaps.',
    contract:
      '`x` is a Date or parseable temporal string and `y` is quantitative. Input dates are sorted before week/day placement.',
    behavior:
      'The compiler places days in week columns and weekday rows, then maps values through the theme sequential palette. Invalid dates and missing values are skipped.',
    example: `Graflume.calendar('#chart', data, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'activity', type: 'quantitative' },
});`,
    limits:
      'The current alpha view draws one continuous year grid; month boundaries, multiple-year rows, localized weekday labels, and patterned no-data cells remain planned.',
  },
  {
    id: 'candlestick',
    title: 'Candlestick charts',
    api: 'candlestick',
    mark: 'candlestick',
    use: 'Use a candlestick chart for ordered open-high-low-close observations.',
    contract:
      '`x` is an ordered category or time. `y` normally names close, while `fields.open`, `high`, `low`, and `close` identify OHLC columns.',
    behavior:
      'The y domain includes every OHLC channel. Each row becomes a high-low wick and an open-close body; rising and falling bodies use separate colors.',
    example: `Graflume.candlestick('#chart', data, {
  x: { field: 'day', type: 'ordinal' },
  y: { field: 'close', type: 'quantitative' },
  mark: { fields: { open: 'open', high: 'high', low: 'low', close: 'close' } },
});`,
    limits:
      'Volume panels, trading-session gaps, hollow-candle conventions, and financial indicators are not implemented yet.',
  },
  {
    id: 'column',
    title: 'Column charts',
    api: 'column',
    mark: 'bar',
    use: 'Use a column chart for vertical comparison across ordered or nominal categories.',
    contract:
      '`column()` sets `orientation: "vertical"` on the canonical `bar` mark. It does not introduce a separate portable mark.',
    behavior:
      'Values extend from a zero baseline; negative values extend below it. Category order follows the data or an explicit scale domain.',
    example: `Graflume.column('#chart', data, {
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'sales', type: 'quantitative' },
});`,
    limits:
      'Stack calculation, data labels, and native legends remain planned. Grouped layers are supported through `position: "group"`.',
  },
  {
    id: 'diff',
    title: 'Diff charts',
    api: 'diff',
    mark: 'diff',
    use: 'Use a diff chart to make before/after changes more visible than two independent charts.',
    contract:
      '`x` is the category, `y` is the new value, and `mark.fields.old`/`new` name the comparable numeric columns.',
    behavior:
      'The old value is rendered as a muted full-width bar, the new value as a narrower foreground bar, and a connector shows the signed movement.',
    example: `Graflume.diff('#chart', data, {
  x: { field: 'category', type: 'ordinal' },
  y: { field: 'current', type: 'quantitative' },
  mark: { fields: { old: 'previous', new: 'current' } },
});`,
    limits:
      'The alpha compiler implements the bar/column comparison form. Diff pie and diff scatter rendering are not yet separate modes.',
  },
  {
    id: 'donut',
    title: 'Donut charts',
    api: 'donut',
    mark: 'pie',
    use: 'Use a donut chart for a small part-to-whole comparison when the center space is useful.',
    contract:
      '`donut()` normalizes to `pie` with `mark.options.innerRadius: 0.56`. `x` supplies labels and positive `y` values supply slice angles. The center shows a total with the optional `mark.options.centerLabel` caption.',
    behavior:
      'Slices retain input order, use the theme categorical palette, show percentage-aware labels, and carry row-level hit-test metadata. Non-positive and missing values are omitted.',
    example: `Graflume.donut('#chart', data, {
  x: { field: 'channel', type: 'nominal' },
  y: { field: 'share', type: 'quantitative' },
});`,
    limits:
      'Dense-label collision solving, nested rings, and custom center value formatting are not implemented yet.',
  },
  {
    id: 'gantt',
    title: 'Gantt charts',
    api: 'gantt',
    mark: 'gantt',
    use: 'Use a Gantt chart for project tasks, progress, and dependencies over time.',
    contract:
      '`x` names start, `y` names the task row, and fields may name `end`, `id`, `progress`, and comma-separated `dependencies`.',
    behavior:
      'The x domain includes start and end. Each task becomes a rounded interval, progress overlays the interval, and dependencies are drawn between resolved ids.',
    example: `Graflume.gantt('#chart', data, {
  x: { field: 'start', type: 'temporal' },
  y: { field: 'task', type: 'ordinal' },
  mark: { fields: { end: 'end', id: 'id', progress: 'progress', dependencies: 'dependencies' } },
});`,
    limits:
      'Critical-path calculation, working calendars, drag editing, milestone diamonds, and routed arrowheads remain planned.',
  },
  {
    id: 'gauge',
    title: 'Gauge charts',
    api: 'gauge',
    mark: 'gauge',
    use: 'Use gauges for a few current values against a common bounded range.',
    contract:
      '`x` supplies gauge labels, `y` supplies values, and `mark.options.min`/`max` define the range.',
    behavior:
      'Each row receives a semicircular track, proportional colored arc, five quiet reference ticks, a rounded needle and hub, value, and label. Values are clamped to the configured range.',
    example: `Graflume.gauge('#chart', data, {
  x: { field: 'metric', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { min: 0, max: 100 } },
});`,
    limits:
      'Threshold bands, custom tick labels, animation, and needle easing are not implemented yet.',
  },
  {
    id: 'geo',
    title: 'GeoCharts',
    api: 'geo',
    mark: 'geo',
    use: 'Use a GeoChart for a quick country-level distribution view.',
    contract:
      '`x` supplies a supported country code/name and `y` supplies marker magnitude. Rendering stays local and sends no data to a map service.',
    behavior:
      'A theme-aware map surface, quiet latitude/longitude graticule, and built-in renderer-neutral world outline are drawn first. Known country centroids receive haloed, size-scaled markers with row hit testing.',
    example: `Graflume.geo('#chart', data, {
  x: { field: 'country', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
});`,
    limits:
      'This alpha implementation has a deliberately small centroid catalog and simplified continent geometry. Full ISO coverage, choropleth boundaries, projections, and zoom belong in the future maps package.',
  },
  {
    id: 'histogram',
    title: 'Histograms',
    api: 'histogram',
    mark: 'histogram',
    use: 'Use a histogram to inspect the distribution of one quantitative field.',
    contract:
      '`x` names the measured field. `y` repeats that field as a portable placeholder while the compiler derives counts. `mark.options.bins` controls 1–100 equal-width bins.',
    behavior:
      'Finite values are binned between the observed minimum and maximum. The y domain is derived from bin counts rather than source values.',
    example: `Graflume.histogram('#chart', data, {
  x: { field: 'score', type: 'quantitative' },
  y: { field: 'score', type: 'quantitative', title: 'Count' },
  mark: { options: { bins: 12 } },
});`,
    limits:
      'Automatic bin heuristics, unequal bins, density normalization, cumulative mode, and weighted counts are not implemented yet.',
  },
  {
    id: 'intervals',
    title: 'Interval charts',
    api: 'intervals',
    mark: 'interval',
    use: 'Use intervals for confidence bands, error ranges, or low/central/high estimates.',
    contract:
      '`x` identifies the observation, `y` is the central value, and `fields.low`/`high` identify the bounds.',
    behavior:
      'Each valid row becomes a low-high line with caps plus an interactive central point. The y domain includes all three numeric fields.',
    example: `Graflume.intervals('#chart', data, {
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'estimate', type: 'quantitative' },
  mark: { fields: { low: 'lower', high: 'upper' } },
});`,
    limits: 'Line, box, stick, area, and mixed interval styles are not yet separate style modes.',
  },
  {
    id: 'map',
    title: 'Maps',
    api: 'map',
    mark: 'map',
    use: 'Use a map for longitude/latitude point locations without a remote tile dependency.',
    contract: '`x` is longitude, `y` is latitude, and optional `fields.size` scales marker radius.',
    behavior:
      'Coordinates use an equirectangular projection against a theme-aware surface, graticule, and built-in world outline. Markers use a quiet halo plus an interactive foreground circle.',
    example: `Graflume.map('#chart', data, {
  x: { field: 'longitude', type: 'quantitative' },
  y: { field: 'latitude', type: 'quantitative' },
  mark: { fields: { size: 'population' } },
});`,
    limits:
      'Tiles, geocoding, roads, places, pan/zoom, wrapped longitude, and other projections are reserved for the maps package.',
  },
  {
    id: 'motion',
    title: 'Motion charts',
    api: 'motion',
    mark: 'motion',
    use: 'Use the Motion compatibility type to render a chosen time frame as a bubble scene.',
    contract:
      '`x`/`y` are positions; fields may name `size`, `color`, and `time`; `mark.options.frame` selects rows whose time value matches.',
    behavior:
      'The selected frame is rendered with the bubble compiler. Change the frame with `chart.setSpec()` to build a controlled animation outside the portable spec.',
    example: `Graflume.motion('#chart', data, {
  x: { field: 'income', type: 'quantitative' },
  y: { field: 'lifeExpectancy', type: 'quantitative' },
  mark: { fields: { size: 'population', color: 'country', time: 'year' }, options: { frame: '2026' } },
});`,
    limits:
      'Automatic playback controls, trails, interpolation, and frame tweening are not implemented. The historical Flash Motion Chart is treated as a compatibility category.',
  },
  {
    id: 'org',
    title: 'Organization charts',
    api: 'org',
    mark: 'org',
    use: 'Use an organization chart for a modest parent-child hierarchy.',
    contract:
      '`x` names node ids/labels and `mark.fields.parent` names the parent field. A blank or missing parent creates a root.',
    behavior:
      'Depth is resolved without evaluating code. Nodes are placed in depth rows, joined by rounded elbow connectors, and rendered as interactive surface cards with depth-colored accents.',
    example: `Graflume.org('#chart', data, {
  x: { field: 'person', type: 'nominal' },
  y: { field: 'manager', type: 'nominal' },
  mark: { fields: { parent: 'manager' } },
});`,
    limits:
      'Advanced tidy-tree layout, collapsing, multiple parents, HTML cards, and keyboard traversal are not implemented yet.',
  },
  {
    id: 'pie',
    title: 'Pie charts',
    api: 'pie',
    mark: 'pie',
    use: 'Use a pie chart for a small number of positive part-to-whole values.',
    contract:
      '`x` supplies labels and positive quantitative `y` values determine angles. Slice order follows input order.',
    behavior:
      'The compiler emits closed polygonal arc paths with palette colors, percentage-aware labels, and whole-slice hit testing. Large slices use high-contrast internal labels; smaller visible slices use short leader lines. Non-positive values are omitted.',
    example: `Graflume.pie('#chart', data, {
  x: { field: 'channel', type: 'nominal' },
  y: { field: 'share', type: 'quantitative' },
});`,
    limits:
      'Automatic collision solving for dense external labels, exploded slices, 3D, and hierarchical rings are not implemented yet. Use a small number of slices or lower `mark.options.labelLimit` for dense data.',
  },
  {
    id: 'sankey',
    title: 'Sankey diagrams',
    api: 'sankey',
    mark: 'sankey',
    use: 'Use a Sankey diagram to show weighted flow from sources to targets.',
    contract:
      '`x` names source, `fields.target` names target, and positive `y` values are link weights.',
    behavior:
      'The alpha layout creates source and target columns, proportional node heights, and smooth sampled cubic flow bands with whole-band row hit testing.',
    example: `Graflume.sankey('#chart', data, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'amount', type: 'quantitative' },
  mark: { fields: { target: 'target' } },
});`,
    limits:
      'This is a two-column layout. Multi-stage DAG depth assignment, cycle handling, and crossing minimization remain planned.',
  },
  {
    id: 'stepped-area',
    title: 'Stepped area charts',
    api: 'steppedArea',
    mark: 'stepped-area',
    use: 'Use a stepped area chart when values change at discrete boundaries rather than continuously.',
    contract:
      '`x` is ordered and `y` is quantitative. The mark uses step-after transitions, fills to zero, and keeps the stepped top stroke separate so the baseline is not outlined.',
    behavior:
      'Each new x adds a horizontal segment at the previous y and then a vertical transition. Missing values are skipped.',
    example: `Graflume.steppedArea('#chart', data, {
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'inventory', type: 'quantitative' },
});`,
    limits:
      'Step-before/center modes, stacking, and missing-value segment breaks are not configurable yet.',
  },
  {
    id: 'table',
    title: 'Table charts',
    api: 'table',
    mark: 'table',
    use: 'Use the table chart when exact values matter more than shape.',
    contract:
      '`mark.options.columns` is an ordered string array of data fields. Without it, x and y fields are shown.',
    behavior:
      'Theme-tinted headers, alternating row surfaces, subtle grid cells, and stronger type hierarchy are compiled to Scene primitives. Rows that fit in the plot are interactive.',
    example: `Graflume.table('#chart', data, {
  x: { field: 'name', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { columns: ['name', 'value', 'status'], rowHeight: 28 } },
});`,
    limits:
      'Sorting UI, paging, frozen columns, cell formatters, text wrapping, and native HTML accessibility are not implemented. Provide an HTML table fallback for production accessibility.',
  },
  {
    id: 'timeline',
    title: 'Timelines',
    api: 'timeline',
    mark: 'timeline',
    use: 'Use a timeline to compare resource or event intervals across rows.',
    contract: '`x` names start, `fields.end` names end, and categorical `y` names the row.',
    behavior:
      'Start and end jointly determine the temporal domain. Each interval becomes an interactive rounded horizontal bar on a categorical y scale.',
    example: `Graflume.timeline('#chart', data, {
  x: { field: 'start', type: 'temporal' },
  y: { field: 'resource', type: 'ordinal' },
  mark: { fields: { end: 'end' } },
});`,
    limits:
      'Overlapping interval packing, grouped labels, duration labels, and timeline zoom are not implemented yet.',
  },
  {
    id: 'treemap',
    title: 'Tree maps',
    api: 'treemap',
    mark: 'treemap',
    use: 'Use a treemap for part-to-whole comparison when rectangles are more space-efficient than slices.',
    contract: '`x` supplies labels and positive `y` values supply area. Input order is retained.',
    behavior:
      'The compiler recursively splits the available width and height into deterministic two-dimensional area tiles. Input order remains stable, area is proportional to positive `y`, and tiles with sufficient room show both label and value.',
    example: `Graflume.treemap('#chart', data, {
  x: { field: 'product', type: 'nominal' },
  y: { field: 'revenue', type: 'quantitative' },
});`,
    limits:
      'Nested hierarchy, optimized squarification, drill-down, color-value encodings, and breadcrumb navigation are not implemented yet.',
  },
  {
    id: 'trendline',
    title: 'Trendlines',
    api: 'trendline',
    mark: 'trendline',
    use: 'Use a trendline to summarize the linear relationship between quantitative x and y values.',
    contract: '`x` and `y` must be quantitative or temporal values convertible to numbers.',
    behavior:
      'The compiler renders source points, computes ordinary least squares, and overlays a dashed linear regression path spanning observed x.',
    example: `Graflume.trendline('#chart', data, {
  x: { field: 'hours', type: 'quantitative' },
  y: { field: 'score', type: 'quantitative' },
});`,
    limits:
      'Exponential/polynomial models, confidence bands, equation/R² labels, robust regression, and transform pipelines remain planned.',
  },
  {
    id: 'vega',
    title: 'VegaChart adapter',
    api: 'vegaChart',
    mark: 'vega',
    use: 'Use the VegaChart compatibility type for a safe, small embedded mark vocabulary without runtime evaluation.',
    contract:
      '`mark.options.mark` accepts `line`, `bar`, `area`, `point`, or `circle`; x/y remain Graflume encodings. The result is normalized to Graflume Scene primitives.',
    behavior:
      'The adapter dispatches to the corresponding built-in compiler. It never evaluates expressions, callbacks, signals, or arbitrary Vega transforms.',
    example: `Graflume.vegaChart('#chart', data, {
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'sales', type: 'quantitative' },
  mark: { options: { mark: 'line' }, point: true },
});`,
    limits:
      'This is explicitly not full Vega/Vega-Lite grammar compatibility. A future optional adapter package can provide audited broader conversion.',
  },
  {
    id: 'waterfall',
    title: 'Waterfall charts',
    api: 'waterfall',
    mark: 'waterfall',
    use: 'Use a waterfall chart to explain how signed changes lead from one cumulative state to another.',
    contract: '`x` supplies ordered step labels and quantitative `y` supplies signed deltas.',
    behavior:
      'The y domain includes every cumulative intermediate total. Positive and negative bars use different colors and connectors preserve the running level.',
    example: `Graflume.waterfall('#chart', data, {
  x: { field: 'step', type: 'ordinal' },
  y: { field: 'delta', type: 'quantitative' },
});`,
    limits:
      'Explicit subtotal/total rows, horizontal orientation, stack segments, and data labels are not implemented yet.',
  },
  {
    id: 'word-tree',
    title: 'Word trees',
    api: 'wordTree',
    mark: 'word-tree',
    use: 'Use a word tree to show an explicit weighted hierarchy of terms.',
    contract:
      '`x` names the word/node, `y` supplies weight, and `fields.parent` supplies the parent word. A blank parent creates a root.',
    behavior:
      'Words are arranged by hierarchy depth, connected with branch lines, and sized by the square root of weight.',
    example: `Graflume.wordTree('#chart', data, {
  x: { field: 'word', type: 'nominal' },
  y: { field: 'weight', type: 'quantitative' },
  mark: { fields: { parent: 'parent' } },
});`,
    limits:
      'Implicit phrase tokenization, prefix/suffix/double modes, collision avoidance, and click-to-reroot navigation are not implemented yet.',
  },
  ,
  {
    id: 'radar',
    title: 'Radar charts',
    api: 'radar',
    mark: 'radar',
    entrypoint: 'complete',
    use: 'Use a radar chart to compare a small number of profiles across the same three-or-more indicators.',
    contract:
      '`x` names the indicator, quantitative `y` supplies the score, and `mark.fields.series` optionally groups rows into overlaid profiles. `mark.options.max` fixes the shared maximum and `rings` controls the polygon grid count.',
    behavior:
      'Indicator order follows first appearance. The compiler draws shared polygon rings and spokes, one filled/stroked profile per series, and interactive points for observed rows. Missing indicators fall back to zero inside a profile; negative values are clamped to zero.',
    example: `import { radar } from 'graflume/complete';

radar('#chart', data, {
  x: { field: 'indicator', type: 'nominal' },
  y: { field: 'score', type: 'quantitative' },
  mark: { fields: { series: 'profile' }, options: { max: 100, rings: 5 } },
});`,
    limits:
      'Per-indicator minima/maxima, automatic legends, dense-label collision solving, filled-area stacking, and polar interaction gestures are not implemented yet.',
  },
  {
    id: 'tree',
    title: 'Tree charts',
    api: 'tree',
    mark: 'tree',
    entrypoint: 'complete',
    use: 'Use a tree chart for an explicit parent-child hierarchy where ancestry matters more than area.',
    contract:
      '`x` or `mark.fields.id` names the node id, `mark.fields.parent` names its parent, `label` may override displayed text, and `value` may provide weight. Blank or missing parents create roots. `mark.options.orientation` accepts `vertical` or `horizontal`.',
    behavior:
      'The compiler resolves deterministic hierarchy depths, distributes nodes evenly within each level, draws elbow connectors, and places every row in a theme-aware interactive card. Duplicate ids use the final position while source-row metadata stays attached to the rendered node.',
    example: `import { tree } from 'graflume/complete';

tree('#chart', data, {
  x: { field: 'id', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { parent: 'parent', label: 'name' } },
});`,
    limits:
      'Tidy-tree leaf balancing, collapse/expand, drag editing, routed cross-links, duplicate-id diagnostics, and animated rerooting remain planned.',
  },
  {
    id: 'graph',
    title: 'Graph charts',
    api: 'graph',
    mark: 'graph',
    entrypoint: 'complete',
    use: 'Use a graph chart to show weighted relationships among a modest set of nodes.',
    contract:
      '`x` or `mark.fields.source` names the edge source, `mark.fields.target` names the target, and quantitative `y` or `fields.value` supplies edge weight. Optional `id`/`label` fields can add explicit node rows.',
    behavior:
      'Nodes are deduplicated by id and placed in deterministic circular order. Edge width follows weight, node radius follows degree, and both nodes and edges retain source-row hit-test metadata.',
    example: `import { graph } from 'graflume/complete';

graph('#chart', links, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'weight', type: 'quantitative' },
  mark: { fields: { target: 'target' } },
});`,
    limits:
      'Force-directed layout, clustering, directed arrowheads, multi-edge separation, node pinning, pan/zoom, and WebGL acceleration are not implemented yet.',
  },
  {
    id: 'chord',
    title: 'Chord diagrams',
    api: 'chord',
    mark: 'chord',
    entrypoint: 'complete',
    use: 'Use a chord diagram for weighted many-to-many relationships among a small number of categories.',
    contract:
      '`x` or `fields.source` supplies source, `fields.target` supplies target, and quantitative `y` or `fields.value` supplies the relationship weight.',
    behavior:
      'Category arcs are sized from total incident weight and separated by deterministic gaps. Each row becomes a curved, width-scaled connection through the center, while arcs and connections remain interactive Scene paths.',
    example: `import { chord } from 'graflume/complete';

chord('#chart', flows, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'amount', type: 'quantitative' },
  mark: { fields: { target: 'target' } },
});`,
    limits:
      'Connections are rounded weighted strokes rather than fully allocated source/target ribbons. Directional split arcs, crossing minimization, custom ordering, gradients, and bundled labels remain planned.',
  },
  {
    id: 'funnel',
    title: 'Funnel charts',
    api: 'funnel',
    mark: 'funnel',
    entrypoint: 'complete',
    use: 'Use a funnel chart for ordered stages whose retained volume decreases through a process.',
    contract:
      '`x` supplies the stage label and non-negative quantitative `y` supplies stage volume. Rows sort descending by default; set `mark.options.sort: false` to preserve source order.',
    behavior:
      'Every stage becomes an interactive trapezoid. Top and bottom widths follow the current and next values, labels show stage and raw value, and theme colors maintain readable foreground contrast.',
    example: `import { funnel } from 'graflume/complete';

funnel('#chart', stages, {
  x: { field: 'stage', type: 'ordinal' },
  y: { field: 'users', type: 'quantitative' },
});`,
    limits:
      'Neck configuration, side labels, conversion percentages, multi-series comparison, horizontal orientation, and negative/diverging funnels are not implemented yet.',
  },
  {
    id: 'parallel',
    title: 'Parallel-coordinate charts',
    api: 'parallel',
    mark: 'parallel',
    entrypoint: 'complete',
    use: 'Use parallel coordinates to compare several dimensions for each row and reveal trade-offs or clusters.',
    contract:
      '`mark.options.dimensions` is the preferred ordered array of field names. Without it, x, y, and named mark fields become dimensions. Numeric dimensions normalize by extent; categorical dimensions normalize by first-seen order. `fields.color` or `group` assigns palette groups.',
    behavior:
      'The compiler draws one vertical axis per dimension and one interactive polyline per complete row. A row with a missing or unmappable dimension is skipped rather than partially connected.',
    example: `import { parallel } from 'graflume/complete';

parallel('#chart', products, {
  x: { field: 'name', type: 'nominal' },
  y: { field: 'speed', type: 'quantitative' },
  mark: { options: { dimensions: ['speed', 'quality', 'cost'] } },
});`,
    limits:
      'Per-axis ticks and formatting, axis inversion/reordering, brushing, bundled polylines, missing-value gaps, and large-data density rendering remain planned.',
  },
  {
    id: 'boxplot',
    title: 'Boxplot charts',
    api: 'boxplot',
    mark: 'boxplot',
    entrypoint: 'complete',
    use: 'Use a boxplot to compare precomputed distribution summaries across categories.',
    contract:
      '`x` supplies the group and named fields supply `min`, `q1`, `median`, `q3`, and `max`. Quantitative `y` normally points to the median so the shared axis remains explicit.',
    behavior:
      'The y domain includes all five summary channels. Each row creates a whisker, end caps, an interactive interquartile box, and a distinct median line. Input should satisfy min ≤ q1 ≤ median ≤ q3 ≤ max.',
    example: `import { boxplot } from 'graflume/complete';

boxplot('#chart', summaries, {
  x: { field: 'group', type: 'nominal' },
  y: { field: 'median', type: 'quantitative' },
  mark: { fields: { min: 'min', q1: 'q1', median: 'median', q3: 'q3', max: 'max' } },
});`,
    limits:
      'Raw-sample quartile calculation, outlier points, notches, variable box width, horizontal orientation, and invalid-order diagnostics are not implemented yet.',
  },
  {
    id: 'effect-scatter',
    title: 'Emphasis scatter charts',
    api: 'effectScatter',
    mark: 'effect-scatter',
    entrypoint: 'complete',
    use: 'Use an emphasis scatter chart to call attention to a small set of important quantitative points.',
    contract:
      '`x` and `y` define point position. `mark.fields.size` optionally scales point radius and `mark.options.rings` controls one to four static emphasis rings.',
    behavior:
      'Each valid row draws quiet concentric halos below an interactive foreground point. Radius uses the square root of normalized size so visual area responds more naturally to magnitude.',
    example: `import { effectScatter } from 'graflume/complete';

effectScatter('#chart', data, {
  x: { field: 'reach', type: 'quantitative' },
  y: { field: 'impact', type: 'quantitative' },
  mark: { fields: { size: 'priority' }, options: { rings: 2 } },
});`,
    limits:
      'The rings are intentionally static and reduced-motion safe. Pulse animation, ripple timing, symbol images, label collision handling, and GPU particle effects are not implemented yet.',
  },
  {
    id: 'lines',
    title: 'Connection-line charts',
    api: 'lines',
    mark: 'lines',
    entrypoint: 'complete',
    use: 'Use connection lines to show directed links between start and end coordinates on a shared Cartesian plane.',
    contract:
      '`x`/`y` supply start coordinates, `mark.fields.x2`/`y2` supply end coordinates, and optional `fields.value` scales line width. `mark.options.curvature` accepts -1 through 1.',
    behavior:
      'Every valid row compiles to a straight or sampled quadratic path plus a terminal arrowhead. Start and end fields jointly expand both numeric domains, and the path carries the row hit target.',
    example: `import { lines } from 'graflume/complete';

lines('#chart', links, {
  x: { field: 'startX', type: 'quantitative' },
  y: { field: 'startY', type: 'quantitative' },
  mark: { fields: { x2: 'endX', y2: 'endY', value: 'weight' } },
});`,
    limits:
      'Geographic projections, obstacle routing, edge bundling, moving particles, endpoint symbols, and automatic label placement are not implemented yet.',
  },
  {
    id: 'heatmap',
    title: 'Heatmaps',
    api: 'heatmap',
    mark: 'heatmap',
    entrypoint: 'complete',
    use: 'Use a heatmap to compare intensity across a two-dimensional categorical or numeric grid.',
    contract:
      '`x` and `y` locate each cell and `mark.fields.value` names the quantitative intensity field, defaulting to `value`.',
    behavior:
      'Cell width and height use categorical bandwidth or the smallest numeric spacing. Values map through the active sequential palette, large enough cells show contrast-aware values, and missing cells remain blank.',
    example: `import { heatmap } from 'graflume/complete';

heatmap('#chart', cells, {
  x: { field: 'day', type: 'ordinal' },
  y: { field: 'period', type: 'ordinal' },
  mark: { fields: { value: 'activity' } },
});`,
    limits:
      'A built-in color legend, configurable color domain, missing-value pattern, clustering, dendrograms, tiled large-data rendering, and continuous raster mode remain planned.',
  },
  {
    id: 'pictorial-bar',
    title: 'Pictorial bar charts',
    api: 'pictorialBar',
    mark: 'pictorial-bar',
    entrypoint: 'complete',
    use: 'Use a pictorial bar when repeated simple symbols make modest category totals easier to scan.',
    contract:
      '`x` supplies category and quantitative `y` supplies magnitude. `mark.options.symbol` accepts `circle`, `square`, or `diamond`; `unit`, `maxSymbols`, and `symbolSize` control repetition.',
    behavior:
      'Symbols repeat from the zero baseline toward the value and remain tied to the source row for hit testing. Positive and negative values use the same axis semantics as ordinary bars.',
    example: `import { pictorialBar } from 'graflume/complete';

pictorialBar('#chart', data, {
  x: { field: 'category', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { symbol: 'diamond', unit: 5, maxSymbols: 12 } },
});`,
    limits:
      'Arbitrary SVG/image symbols, partial-symbol clipping, horizontal orientation, stacking, symbol rotation, and labels are not implemented yet.',
  },
  {
    id: 'theme-river',
    title: 'Theme-river charts',
    api: 'themeRiver',
    mark: 'theme-river',
    entrypoint: 'complete',
    use: 'Use a theme river to compare how several non-negative series expand and contract over an ordered x domain.',
    contract:
      '`x` is ordered or temporal, quantitative `y` supplies magnitude, and `mark.fields.series` or `category` names the series. Series order follows first appearance.',
    behavior:
      'At each x value the compiler sums series, centers the stack around zero, and connects each series lower/upper boundaries into an interactive closed band. The y domain uses the maximum stacked total rather than raw rows.',
    example: `import { themeRiver } from 'graflume/complete';

themeRiver('#chart', data, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { series: 'channel' } },
});`,
    limits:
      'Bands use deterministic linear boundary segments. Smooth interpolation, missing-time imputation, negative streams, ordering optimization, legends, and direct labels remain planned.',
  },
  {
    id: 'sunburst',
    title: 'Sunburst charts',
    api: 'sunburst',
    mark: 'sunburst',
    entrypoint: 'complete',
    use: 'Use a sunburst for part-to-whole hierarchy when both ancestry and angular share matter.',
    contract:
      '`x` or `fields.id` names the node, `fields.parent` names its parent, optional `fields.label` changes text, and quantitative `y` or `fields.value` supplies weight. Blank parents create roots.',
    behavior:
      'Hierarchy depth determines rings and recursive totals determine angular spans. Each node becomes an interactive annular sector; sufficiently large sectors receive contrast-aware rotated labels.',
    example: `import { sunburst } from 'graflume/complete';

sunburst('#chart', nodes, {
  x: { field: 'id', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { parent: 'parent', label: 'name' } },
});`,
    limits:
      'Drill-down, breadcrumbs, focus-root transitions, minimum-angle aggregation, sophisticated label collision solving, and hierarchy validation diagnostics remain planned.',
  },
  {
    id: 'custom',
    title: 'Declarative custom charts',
    api: 'custom',
    mark: 'custom',
    entrypoint: 'complete',
    use: 'Use the declarative custom mark for a small function-free set of row-level Scene primitives while keeping the spec portable.',
    contract:
      '`x`/`y` locate rows. `fields.shape` or `primitive` may select `circle`, `diamond`, `rect`, `round-rect`, `square`, `text`, or `line`; `size`, `radius`, `width`, `height`, `label`, `x2`, and `y2` supply optional channels. A default primitive may be set in `mark.options`.',
    behavior:
      'Each row is converted only into audited renderer-neutral primitives. No callback, expression, runtime evaluation, raw HTML, or shader is accepted. Non-text shapes may add a simple label when a label field is present.',
    example: `import { custom } from 'graflume/complete';

custom('#chart', data, {
  x: { field: 'x', type: 'quantitative' },
  y: { field: 'y', type: 'quantitative' },
  mark: { fields: { shape: 'shape', size: 'size', label: 'label' } },
});`,
    limits:
      'The portable custom vocabulary is intentionally bounded. Arbitrary callbacks, Canvas commands, DOM nodes, and shaders belong in explicit JavaScript plugins or future versioned scene/shader packages.',
  },
];

function page(guide) {
  return `# ${guide.title}

${guide.use}

## Implemented appearance

This image is generated from the current Graflume \`compile()\` Scene, not a hand-drawn mockup.

![Current Graflume ${guide.title.toLowerCase()} output](../assets/charts/${guide.id}.svg)

## Quick API

\`Graflume.${guide.api}()\` creates the portable \`${guide.mark}\` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

\`\`\`ts
${guide.example}
\`\`\`

## Portable ChartSpec mapping

${guide.contract}

The same result can be created with \`Graflume.create()\` and \`mark: { type: '${guide.mark}' }\`. Named \`mark.fields\` and \`mark.options\` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

${guide.behavior}

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared \`fill\`, \`stroke\`, \`opacity\`, \`lineWidth\`, \`radius\`, and \`cornerRadius\` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise \`accessibility.label\`, a useful \`description\`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same \`standard\`, \`large\`, \`ultra\`, and \`auto\` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

${guide.limits}

## Runnable example and regression coverage

- [45-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Established catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Additional catalog compile tests](../../tests/complete-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/${guide.id}.svg)

[Back to chart guides](./README.md)
`;
}

await mkdir(directory, { recursive: true });
for (const guide of guides) {
  await writeFile(
    new URL(`${guide.id}.md`, directory),
    await format(page(guide), {
      parser: 'markdown',
      printWidth: 100,
      singleQuote: true,
      trailingComma: 'all',
      semi: true,
    }),
    'utf8',
  );
}

console.log(`Generated ${guides.length} extended chart guides.`);
