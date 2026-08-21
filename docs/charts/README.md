# Chart guides

Graflume `0.1.0-alpha.0` covers 31 user-facing chart families and compatibility names across Cartesian, radial, financial, time, hierarchy, flow, map, table, and adapter use cases. They normalize to 27 portable marks or a canonical multi-layer spec.

This guide documents the behavior that is implemented today. Planned chart families are listed separately and are not presented as supported features.

## Choose a chart

| Chart                                         | Quick API             | Portable mapping               |
| --------------------------------------------- | --------------------- | ------------------------------ |
| [Annotation](./annotation.md)                 | `annotation()`        | `annotation`                   |
| [Annotated Timeline](./annotated-timeline.md) | `annotatedTimeline()` | `annotation` alias             |
| [Area](./area.md)                             | `area()`              | `area`                         |
| [Bar](./bar.md)                               | `horizontalBar()`     | `bar` + horizontal orientation |
| [Bubble](./bubble.md)                         | `bubble()`            | `bubble`                       |
| [Calendar](./calendar.md)                     | `calendar()`          | `calendar`                     |
| [Candlestick](./candlestick.md)               | `candlestick()`       | `candlestick`                  |
| [Column](./column.md)                         | `column()`            | `bar` + vertical orientation   |
| [Combo](./combination.md)                     | `combo()`             | canonical `layers`             |
| [Diff](./diff.md)                             | `diff()`              | `diff`                         |
| [Donut](./donut.md)                           | `donut()`             | `pie` + inner radius           |
| [Gantt](./gantt.md)                           | `gantt()`             | `gantt`                        |
| [Gauge](./gauge.md)                           | `gauge()`             | `gauge`                        |
| [GeoChart](./geo.md)                          | `geo()`               | `geo`                          |
| [Histogram](./histogram.md)                   | `histogram()`         | `histogram`                    |
| [Intervals](./intervals.md)                   | `intervals()`         | `interval`                     |
| [Line](./line.md)                             | `line()`              | `line`                         |
| [Map](./map.md)                               | `map()`               | `map`                          |
| [Motion](./motion.md)                         | `motion()`            | frame-filtered `motion`        |
| [Organization](./org.md)                      | `org()`               | `org`                          |
| [Pie](./pie.md)                               | `pie()`               | `pie`                          |
| [Sankey](./sankey.md)                         | `sankey()`            | `sankey`                       |
| [Scatter](./scatter.md)                       | `scatter()`           | `point` alias                  |
| [Stepped Area](./stepped-area.md)             | `steppedArea()`       | `stepped-area`                 |
| [Table](./table.md)                           | `table()`             | `table`                        |
| [Timeline](./timeline.md)                     | `timeline()`          | `timeline`                     |
| [Tree Map](./treemap.md)                      | `treemap()`           | `treemap`                      |
| [Trendline](./trendline.md)                   | `trendline()`         | `trendline`                    |
| [VegaChart adapter](./vega.md)                | `vegaChart()`         | safe `vega` subset             |
| [Waterfall](./waterfall.md)                   | `waterfall()`         | `waterfall`                    |
| [Word Tree](./word-tree.md)                   | `wordTree()`          | `word-tree`                    |

The [31-type standalone gallery](../../examples/cdn/complete-chart-types.html) renders every entry on one responsive page. The smaller [core chart gallery](../../examples/cdn/chart-types.html) remains useful for a quick introduction.

Every chart-specific guide includes a current visual snapshot generated from the actual Graflume `compile()` Scene. Run `npm run docs:snapshots` after a rendering change to rebuild all 31 assets deterministically.

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

The Quick API creates the same portable `ChartSpec 0.1` shape that can be passed to `create()`. JavaScript callbacks are not embedded in the portable spec.

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

- stacked/normalized stacks, box/violin plots, heatmap/density, funnel, radar/polar, graph/network, and 3D;
- full map boundary/projection packages, multi-stage Sankey layout, nested treemap, implicit Word Tree tokenization, and complete Vega grammar conversion;
- independent/dual scales, facets, concat, dashboards, and linked views;
- native legends, tooltip layout, label-collision routing, automatic data tables, and keyboard mark traversal;
- built-in SVG, WebGL2, and WebGPU renderer parity.
