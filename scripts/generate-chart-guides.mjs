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
      'The compiler draws the canonical line path first, then adds a clipped vertical guide and text label for every non-empty annotation value. Missing x/y values split the line; missing annotations only suppress the guide.',
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
      '`donut()` normalizes to `pie` with `mark.options.innerRadius: 0.56`. `x` supplies labels and positive `y` values supply slice angles.',
    behavior:
      'Slices retain input order, use the theme categorical palette, and carry row-level hit-test metadata. Non-positive and missing values are omitted.',
    example: `Graflume.donut('#chart', data, {
  x: { field: 'channel', type: 'nominal' },
  y: { field: 'share', type: 'quantitative' },
});`,
    limits:
      'Leader-line collision handling, nested rings, and a center summary label are not implemented yet.',
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
      'Each row receives a semicircular track, proportional colored arc, needle, value, and label. Values are clamped to the configured range.',
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
      'A built-in renderer-neutral world outline is drawn first. Known country centroids receive size-scaled markers with row hit testing.',
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
      'Coordinates use an equirectangular projection against the built-in world outline. Markers are interactive scene circles.',
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
      'Depth is resolved without evaluating code. Nodes are placed in depth rows, connected to resolved parents, and rendered as interactive rounded rectangles.',
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
      'The compiler emits closed polygonal arc paths with palette colors, labels, and whole-slice hit testing. Non-positive values are omitted.',
    example: `Graflume.pie('#chart', data, {
  x: { field: 'channel', type: 'nominal' },
  y: { field: 'share', type: 'quantitative' },
});`,
    limits:
      'Label collision routing, exploded slices, 3D, and hierarchical rings are not implemented yet.',
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
      'The alpha layout creates source and target columns, proportional node heights, and closed flow polygons with row hit testing.',
    example: `Graflume.sankey('#chart', data, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'amount', type: 'quantitative' },
  mark: { fields: { target: 'target' } },
});`,
    limits:
      'This is a two-column layout. Multi-stage DAG depth assignment, cycle handling, crossing minimization, and curved links remain planned.',
  },
  {
    id: 'stepped-area',
    title: 'Stepped area charts',
    api: 'steppedArea',
    mark: 'stepped-area',
    use: 'Use a stepped area chart when values change at discrete boundaries rather than continuously.',
    contract:
      '`x` is ordered and `y` is quantitative. The mark uses step-after transitions and fills to zero.',
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
      'Headers, alternating row fills, grid cells, and text are compiled to Scene primitives. Rows that fit in the plot are interactive.',
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
      'The alpha compiler performs a deterministic slice-and-dice layout and labels rectangles that have enough width.',
    example: `Graflume.treemap('#chart', data, {
  x: { field: 'product', type: 'nominal' },
  y: { field: 'revenue', type: 'quantitative' },
});`,
    limits:
      'Nested hierarchy, squarified layout, drill-down, color values, and breadcrumb navigation are not implemented yet.',
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

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
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
