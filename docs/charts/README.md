# Chart guides

Graflume `0.1.0-alpha.0` exposes 37 distinct chart families through two package entrypoints. The default entrypoint contains 22 established families, while `graflume/complete` adds 7 advanced and 8 specialized families. All 141 historical names remain available as compatible presets, including 117 public series identifiers, without duplicating the shared compiler, theme, Scene, Canvas renderer, interaction, or accessibility contracts.

Every family below is implemented today. Direction, curve, depth, radius, glyph, layout, and indicator differences are presets inside one family instead of separate discovery entries.

Use `resolveSeriesType(identifier)` from `graflume/complete` to resolve case, spaces, hyphens, or underscores into the catalog's single representative family. `seriesCompatibilityCatalog` exposes all 117 identifier-to-family mappings for adapters and migration tools.

## Choose a chart

### Default entrypoint

| Family                              | Quick API       | Integrated presets                                                                 |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| [Annotation](./annotation.md)       | `annotation()`  | timeline annotations, event flags                                                  |
| [Area](./area.md)                   | `area()`        | stepped, smooth, polygon, stream                                                   |
| [Bar](./bar.md)                     | `bar()`         | horizontal, column, pictorial, bullet, cylinder, pyramid, lollipop, variable width |
| [Bubble](./bubble.md)               | `bubble()`      | coordinate and packed layouts                                                      |
| [Calendar](./calendar.md)           | `calendar()`    | calendar cells                                                                     |
| [Candlestick](./candlestick.md)     | `candlestick()` | OHLC, HLC, derived, hollow bodies                                                  |
| [Combination](./combination.md)     | `combo()`       | layered series, Pareto                                                             |
| [Difference](./difference.md)       | `diff()`        | before/after difference                                                            |
| [Pie](./pie.md)                     | `pie()`         | pie, donut, variable radius                                                        |
| [Timeline and range](./timeline.md) | `timeline()`    | timeline, Gantt, horizontal range                                                  |
| [Gauge](./gauge.md)                 | `gauge()`       | dial and solid arc                                                                 |
| [Map](./map.md)                     | `map()`         | regions, points, bubbles, routes, density, tiles                                   |
| [Histogram](./histogram.md)         | `histogram()`   | bins and density curve                                                             |
| [Interval](./interval.md)           | `intervals()`   | error, area range, column range, dumbbell                                          |
| [Line](./line.md)                   | `line()`        | straight, smooth, trend                                                            |
| [Motion](./motion.md)               | `motion()`      | frame-filtered scatter                                                             |
| [Hierarchy](./hierarchy.md)         | `treemap()`     | tree, organization, treemap, sunburst                                              |
| [Flow](./flow.md)                   | `sankey()`      | weighted flow                                                                      |
| [Scatter](./scatter.md)             | `scatter()`     | standard, emphasis, depth projection                                               |
| [Table](./table.md)                 | `table()`       | data table                                                                         |
| [Waterfall](./waterfall.md)         | `waterfall()`   | cumulative bridge                                                                  |
| [Word tree](./word-tree.md)         | `wordTree()`    | weighted word hierarchy                                                            |

### Complete opt-in entrypoint

Import these families from `graflume/complete`, or use the dedicated complete browser bundle.

| Family                                | Quick API    | Integrated presets                    |
| ------------------------------------- | ------------ | ------------------------------------- |
| [Radar](./radar.md)                   | `radar()`    | radial multivariate comparison        |
| [Network](./network.md)               | `network()`  | node-link, arc, connection lines      |
| [Chord](./chord.md)                   | `chord()`    | chord and dependency wheel            |
| [Funnel](./funnel.md)                 | `funnel()`   | funnel, pyramid, portable depth faces |
| [Parallel coordinates](./parallel.md) | `parallel()` | multivariate paths                    |
| [Boxplot](./boxplot.md)               | `boxplot()`  | five-number summary                   |
| [Heatmap](./heatmap.md)               | `heatmap()`  | matrix and equal-area tile layouts    |

## Unified specialized series

The following catalog is generated from runtime metadata and contains only the eight specialized data meanings that remain distinct after consolidation.

<!-- SERIES_CATALOG_START -->

### Distribution series

| Chart                         | Quick API   | Portable mark | Canonical family |
| ----------------------------- | ----------- | ------------- | ---------------- |
| [Contour chart](./contour.md) | `contour()` | `contour`     | `contour`        |

### Radial series

| Chart                   | Quick API     | Portable mark | Canonical family |
| ----------------------- | ------------- | ------------- | ---------------- |
| [Item chart](./item.md) | `itemChart()` | `item`        | `item`           |

### Cartesian series

| Chart                                   | Quick API       | Portable mark | Canonical family |
| --------------------------------------- | --------------- | ------------- | ---------------- |
| [Vector field chart](./vector-field.md) | `vectorField()` | `vector`      | `vector-field`   |

### Relationship series

| Chart                         | Quick API     | Portable mark | Canonical family |
| ----------------------------- | ------------- | ------------- | ---------------- |
| [Venn diagram](./venn.md)     | `venn()`      | `venn`        | `venn`           |
| [Word cloud](./word-cloud.md) | `wordCloud()` | `word-cloud`  | `word-cloud`     |

### Financial series

| Chart                                       | Quick API         | Portable mark    | Canonical family |
| ------------------------------------------- | ----------------- | ---------------- | ---------------- |
| [Price blocks chart](./price-blocks.md)     | `priceBlocks()`   | `renko`          | `price-blocks`   |
| [Volume profile chart](./volume-profile.md) | `volumeProfile()` | `volume-profile` | `volume-profile` |

### Indicator series

| Chart                                                 | Quick API              | Portable mark | Canonical family      |
| ----------------------------------------------------- | ---------------------- | ------------- | --------------------- |
| [Technical indicator chart](./technical-indicator.md) | `technicalIndicator()` | `indicator`   | `technical-indicator` |

<!-- SERIES_CATALOG_END -->

The default, advanced, and specialized galleries render 37 distinct families. The specialized gallery shows eight cards and lists the compatible modes folded into each card. The smaller [introductory gallery](../../examples/cdn/chart-types.html) remains useful for a quick start.

Every canonical guide includes a current visual snapshot generated from the actual Graflume `compile()` Scene. Run `npm run docs:snapshots` after a rendering change to rebuild and verify the assets deterministically.

## Default visual system

The built-in light and dark themes share one presentation-ready visual language:

- a balanced ten-color categorical palette and coordinated sequential/diverging ramps;
- low-contrast domain lines and grids, with x grids off and y grids on by default;
- rounded line/path joins, outlined points, airier bars, and a clear title/subtitle rhythm;
- theme-aware surfaces and labels across radial, table, hierarchy, flow, and map charts;
- explicit `mark`, `axis`, and custom-theme values continuing to take precedence.

Area marks use separate fill and top-line Scene paths, pie and donut labels include percentages when space permits, donut charts add a center total, and the structured layouts use curved Sankey bands plus two-dimensional treemap tiles. These are compiled Scene primitives rather than CSS or renderer-specific decorations, so the committed snapshots and Canvas renderer follow the same geometry.

## Current rendered output

The individual pages above show full-width implemented output. The following contact grid links representative families directly to their manuals.

| Cartesian                                                                           | Radial / distribution                                                         | Structure / flow                                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [![Current line output](../assets/charts/line.svg)](./line.md)                      | [![Current pie output](../assets/charts/pie.svg)](./pie.md)                   | [![Current Sankey output](../assets/charts/sankey.svg)](./sankey.md) |
| [![Current candlestick output](../assets/charts/candlestick.svg)](./candlestick.md) | [![Current gauge output](../assets/charts/gauge.svg)](./gauge.md)             | [![Current organization output](../assets/charts/org.svg)](./org.md) |
| [![Current waterfall output](../assets/charts/waterfall.svg)](./waterfall.md)       | [![Current histogram output](../assets/charts/histogram.svg)](./histogram.md) | [![Current map output](../assets/charts/map.svg)](./map.md)          |
| [![Current heatmap output](../assets/charts/heatmap.svg)](./heatmap.md)             | [![Current radar output](../assets/charts/radar.svg)](./radar.md)             | [![Current graph output](../assets/charts/graph.svg)](./graph.md)    |
| [![Current boxplot output](../assets/charts/boxplot.svg)](./boxplot.md)             | [![Current sunburst output](../assets/charts/sunburst.svg)](./sunburst.md)    | [![Current tree output](../assets/charts/tree.svg)](./tree.md)       |

## Common Quick API shape

Every Quick API accepts a target, a row-oriented or columnar data source, and chart options:

```ts
import { line } from 'graflume';

const chart = line('#chart', data, {
  title: {
    text: 'Monthly sales',
    subtitle: 'USD thousands',
  },
  x: {
    field: 'month',
    type: 'ordinal',
    title: 'Month',
    axis: { grid: false },
  },
  y: {
    field: 'sales',
    type: 'quantitative',
    title: 'Sales',
    scale: { zero: false, nice: true },
  },
  mark: {
    stroke: '#4f46e5',
    lineWidth: 3,
    point: true,
  },
  theme: 'graflume-light',
  locale: 'en-US',
  accessibility: {
    label: 'Monthly sales line chart',
    description: 'Sales rise from January through June with one dip in March.',
  },
});
```

The Quick API creates the same portable `ChartSpec 0.1` shape that can be passed to `create()`. Additional-family Quick APIs use the same options shape after importing from `graflume/complete`. JavaScript callbacks are not embedded in the portable spec.

## Data and encodings

### Row-oriented data

```ts
const data = [
  { month: 'Jan', sales: 42 },
  { month: 'Feb', sales: 51 },
  { month: 'Mar', sales: 49 },
];
```

### Columnar data

```ts
const data = {
  columns: {
    month: ['Jan', 'Feb', 'Mar'],
    sales: new Float64Array([42, 51, 49]),
  },
  length: 3,
};
```

Columnar `TypedArray` values remain zero-copy until a mutation-style operation requires row materialization.

### Encoding options

An encoding may be a field-name shorthand or a full object.

| Option                                | Meaning                                             |
| ------------------------------------- | --------------------------------------------------- |
| `field`                               | Data field to read                                  |
| `type`                                | `quantitative`, `temporal`, `ordinal`, or `nominal` |
| `title`                               | Axis title; defaults to the field name              |
| `scale.domain`                        | Explicit numeric pair or ordered categorical values |
| `scale.zero`                          | Include zero in a numeric domain                    |
| `scale.nice`                          | Expand a numeric domain to readable boundaries      |
| `scale.clamp`                         | Clamp numeric values to the scale range             |
| `scale.paddingInner` / `paddingOuter` | Category-band spacing                               |
| `axis`                                | Axis options or `false` to hide the axis            |

Both axes can be categorical, quantitative, or temporal. Layers sharing an axis must use compatible field-type families. Specialized marks use `mark.fields` for additional channels such as `high`, `low`, `end`, `parent`, `target`, or `size`.

## Common chart options

| Option          | Current behavior                                              |
| --------------- | ------------------------------------------------------------- |
| `width`         | Number or `container`; defaults to responsive container width |
| `height`        | Number or `container`; defaults to `400`                      |
| `padding`       | One number or per-side values                                 |
| `title`         | String or `{ text, subtitle, align }`                         |
| `description`   | Fallback accessible description                               |
| `theme`         | `graflume-light`, `graflume-dark`, or a theme override        |
| `locale`        | Number/date formatting locale for axes                        |
| `renderer`      | `auto` or a registered renderer name; Canvas 2D is built in   |
| `performance`   | `auto`, `standard`, `large`, or `ultra`                       |
| `interaction`   | Enable or disable hover and click handling                    |
| `accessibility` | Canvas ARIA label and description                             |
| `axes`          | Chart-level x/y axis defaults                                 |

The default x axis uses `grid: false`; the default y axis uses `grid: true`. Set either value explicitly at the chart or encoding level when a different comparison grid is more appropriate, such as enabling both directions for scatter plots.

Quick APIs also accept `create` options for `autoResize`, manual width/height, and pixel ratio.

## Styling marks

The shared mark style surface is intentionally small:

| Option         | Used by                                 |
| -------------- | --------------------------------------- |
| `fill`         | bar, area, point, optional line points  |
| `stroke`       | line, area, point, optional bar outline |
| `opacity`      | all marks                               |
| `lineWidth`    | line/area stroke, point/bar outline     |
| `radius`       | point and optional line points          |
| `cornerRadius` | bar                                     |
| `point`        | line; renders interactive point circles |
| `position`     | bar layers; `overlay` or `group`        |
| `orientation`  | horizontal bar or vertical column       |
| `fields`       | named multi-channel data fields         |
| `options`      | mark-specific function-free JSON values |

Unsupported options are rejected by portable spec validation rather than silently evaluated as code.

## Events and chart lifecycle

```ts
const unsubscribe = chart.on('hover', ({ hit }) => {
  if (hit) console.log(hit.datum.datum);
});

chart.on('click', ({ hit }) => console.log(hit?.datum));
chart.on('resize', ({ width, height }) => console.log(width, height));
chart.on('error', ({ error }) => console.error(error));

chart.setData(nextData);
chart.appendData([{ month: 'Apr', sales: 63 }]);
chart.setSpec(nextSpec);
chart.resize();
const png = chart.toDataURL('image/png');

unsubscribe();
chart.destroy();
```

`hover` and `click` return structured datum references. Graflume does not provide a raw-HTML tooltip formatter. The current `appendData()` implementation is copy-based; a ring-buffer/incremental engine is planned behind the same API.

## Interaction by mark

| Geometry                     | Current hit target                                                             |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Rectangle/circle datum marks | the whole rendered shape                                                       |
| Closed path datum marks      | the filled polygon, including pie and Sankey flow shapes                       |
| Line/open path marks         | optional points or companion datum shapes; the path itself is not a row target |
| Text-only labels             | not individually hit tested                                                    |

For an interactive area or plain line, add a point layer or enable line points. Large and ultra performance profiles disable per-mark hit testing.

## Performance profiles

`auto` currently selects `standard` below 50,000 total rows, `large` below 1,000,000 rows, and `ultra` above that. The profiles bound rendered line points, circles, and bars to keep the browser responsive.

These thresholds are alpha safety limits, not a universal performance guarantee. Measure real devices and use aggregation or sampling before treating raw row counts as a rendering target.

## Accessibility checklist

Canvas charts should provide both structured Canvas metadata and a readable alternative near the chart.

```ts
accessibility: {
  label: 'Monthly sales bar chart',
  description: 'Six vertical bars compare January through June sales.',
}
```

Recommended page-level additions:

- a visible or collapsible text summary;
- a data table for exact values;
- keyboard-accessible controls outside the Canvas;
- a high-contrast or dark theme option;
- reduced-motion handling in surrounding UI.

Automatic data tables and keyboard traversal of individual marks are not implemented yet.

## Still planned, not presented as complete

- stacked and normalized stacks, violin and density plots, 3D, and editable annotations;
- full map boundary/projection packages, force-directed large-network layout, multi-stage Sankey layout, implicit Word Tree tokenization, and complete Vega grammar conversion;
- independent and dual scales, facets, concat, dashboards, and linked views;
- native legends, tooltip layout, label-collision routing, automatic data tables, and keyboard mark traversal;
- built-in SVG, WebGL2, and WebGPU renderer parity.
