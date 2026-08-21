# Chart guides

Graflume `0.1.0-alpha.0` exposes 141 user-facing chart families through two package entrypoints. The default entrypoint keeps the established 31-family catalog, while `graflume/complete` adds 14 advanced families and 96 specialized series without duplicating the shared compiler, theme, Scene, Canvas renderer, interaction, or accessibility contracts. The unified catalog covers 117 public series identifiers through canonical aliases and purpose-built marks.

Every family below is implemented today. Compatibility names normalize to canonical portable marks rather than creating parallel rendering paths.

Use `resolveSeriesType(identifier)` from `graflume/complete` to resolve case, spaces, hyphens, or underscores into the catalog's single representative family. `seriesCompatibilityCatalog` exposes all 117 identifier-to-family mappings for adapters and migration tools.

## Choose a chart

### Default entrypoint

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

### Complete opt-in entrypoint

Import these families from `graflume/complete`, or use the dedicated complete browser bundle.

| Chart                                 | Quick API         | Portable mark    |
| ------------------------------------- | ----------------- | ---------------- |
| [Radar](./radar.md)                   | `radar()`         | `radar`          |
| [Tree](./tree.md)                     | `tree()`          | `tree`           |
| [Graph](./graph.md)                   | `graph()`         | `graph`          |
| [Chord](./chord.md)                   | `chord()`         | `chord`          |
| [Funnel](./funnel.md)                 | `funnel()`        | `funnel`         |
| [Parallel coordinates](./parallel.md) | `parallel()`      | `parallel`       |
| [Boxplot](./boxplot.md)               | `boxplot()`       | `boxplot`        |
| [Effect scatter](./effect-scatter.md) | `effectScatter()` | `effect-scatter` |
| [Connection lines](./lines.md)        | `lines()`         | `lines`          |
| [Heatmap](./heatmap.md)               | `heatmap()`       | `heatmap`        |
| [Pictorial bar](./pictorial-bar.md)   | `pictorialBar()`  | `pictorial-bar`  |
| [Theme river](./theme-river.md)       | `themeRiver()`    | `theme-river`    |
| [Sunburst](./sunburst.md)             | `sunburst()`      | `sunburst`       |
| [Declarative custom](./custom.md)     | `custom()`        | `custom`         |

## Unified specialized series

The following catalog is generated from the runtime metadata. Families that overlap with an established chart reuse its canonical compiler; distinct data meanings use one of the new portable marks.

<!-- SERIES_CATALOG_START -->

### Relationship series

| Chart                                             | Quick API               | Portable mark   | Canonical family |
| ------------------------------------------------- | ----------------------- | --------------- | ---------------- |
| [Arc diagram](./arc-diagram.md)                   | `arcDiagram()`          | `arc-diagram`   | `arc-diagram`    |
| [Dependency wheel](./dependency-wheel.md)         | `dependencyWheel()`     | `chord`         | `chord`          |
| [Network graph](./network-graph.md)               | `networkGraph()`        | `graph`         | `graph`          |
| [Organization network](./organization-network.md) | `organizationNetwork()` | `org`           | `org`            |
| [Packed bubble chart](./packed-bubble.md)         | `packedBubble()`        | `packed-bubble` | `packed-bubble`  |
| [Tree graph](./tree-graph.md)                     | `treeGraph()`           | `tree`          | `tree`           |
| [Venn diagram](./venn.md)                         | `venn()`                | `venn`          | `venn`           |
| [Word cloud](./word-cloud.md)                     | `wordCloud()`           | `word-cloud`    | `word-cloud`     |

### Cartesian series

| Chart                                              | Quick API           | Portable mark   | Canonical family    |
| -------------------------------------------------- | ------------------- | --------------- | ------------------- |
| [Area range chart](./area-range.md)                | `areaRange()`       | `range`         | `area-range`        |
| [Smooth area chart](./area-spline.md)              | `areaSpline()`      | `smooth`        | `area-spline`       |
| [Smooth area range chart](./area-spline-range.md)  | `areaSplineRange()` | `range`         | `area-spline-range` |
| [Bullet chart](./bullet.md)                        | `bullet()`          | `bullet`        | `bullet`            |
| [Column pyramid chart](./column-pyramid.md)        | `columnPyramid()`   | `pyramid`       | `column-pyramid`    |
| [Column range chart](./column-range.md)            | `columnRange()`     | `range`         | `column-range`      |
| [Cylinder chart](./cylinder.md)                    | `cylinder()`        | `cylinder`      | `cylinder`          |
| [Dumbbell chart](./dumbbell.md)                    | `dumbbell()`        | `range`         | `dumbbell`          |
| [Error bar chart](./error-bar.md)                  | `errorBar()`        | `interval`      | `intervals`         |
| [Lollipop chart](./lollipop.md)                    | `lollipop()`        | `lollipop`      | `lollipop`          |
| [Pictorial column chart](./pictorial-column.md)    | `pictorialColumn()` | `pictorial-bar` | `pictorial-bar`     |
| [Polygon chart](./polygon.md)                      | `polygon()`         | `polygon`       | `polygon`           |
| [Three-axis scatter chart](./scatter-3d.md)        | `scatter3d()`       | `scatter-3d`    | `scatter-3d`        |
| [Spline chart](./spline.md)                        | `spline()`          | `smooth`        | `spline`            |
| [Variable width column chart](./variable-width.md) | `variableWidth()`   | `variwide`      | `variable-width`    |
| [Vector field chart](./vector.md)                  | `vector()`          | `vector`        | `vector`            |
| [Wind barb chart](./wind-barb.md)                  | `windBarb()`        | `wind-barb`     | `wind-barb`         |
| [Horizontal range chart](./x-range.md)             | `xRange()`          | `timeline`      | `timeline`          |

### Distribution series

| Chart                           | Quick API       | Portable mark  | Canonical family |
| ------------------------------- | --------------- | -------------- | ---------------- |
| [Bell curve](./bell-curve.md)   | `bellCurve()`   | `distribution` | `bell-curve`     |
| [Contour chart](./contour.md)   | `contour()`     | `contour`      | `contour`        |
| [Pareto chart](./pareto.md)     | `pareto()`      | `pareto`       | `pareto`         |
| [Streamgraph](./streamgraph.md) | `streamgraph()` | `theme-river`  | `theme-river`    |

### Radial series

| Chart                                          | Quick API       | Portable mark  | Canonical family |
| ---------------------------------------------- | --------------- | -------------- | ---------------- |
| [Depth funnel chart](./funnel-3d.md)           | `funnel3d()`    | `pyramid`      | `funnel-3d`      |
| [Item chart](./item.md)                        | `itemChart()`   | `item`         | `item`           |
| [Pyramid chart](./pyramid.md)                  | `pyramid()`     | `pyramid`      | `pyramid`        |
| [Depth pyramid chart](./pyramid-3d.md)         | `pyramid3d()`   | `pyramid`      | `pyramid`        |
| [Solid gauge](./solid-gauge.md)                | `solidGauge()`  | `solid-gauge`  | `solid-gauge`    |
| [Variable radius pie chart](./variable-pie.md) | `variablePie()` | `variable-pie` | `variable-pie`   |

### Map series

| Chart                                  | Quick API      | Portable mark | Canonical family |
| -------------------------------------- | -------------- | ------------- | ---------------- |
| [Tile map](./tile-map.md)              | `tileMap()`    | `tilemap`     | `tile-map`       |
| [Flow map](./flow-map.md)              | `flowMap()`    | `geo-flow`    | `flow-map`       |
| [Geographic heatmap](./geo-heatmap.md) | `geoHeatmap()` | `geo-heatmap` | `geo-heatmap`    |
| [Map bubble chart](./map-bubble.md)    | `mapBubble()`  | `map`         | `map`            |
| [Map line chart](./map-line.md)        | `mapLine()`    | `geo-line`    | `map-line`       |
| [Map point chart](./map-point.md)      | `mapPoint()`   | `map`         | `map`            |
| [Tiled map](./tiled-map.md)            | `tiledMap()`   | `tiled-map`   | `tiled-map`      |

### Indicator series

| Chart                                                                               | Quick API                              | Portable mark | Canonical family                        |
| ----------------------------------------------------------------------------------- | -------------------------------------- | ------------- | --------------------------------------- |
| [Acceleration bands](./acceleration-bands.md)                                       | `accelerationBands()`                  | `indicator`   | `acceleration-bands`                    |
| [Awesome oscillator](./awesome-oscillator.md)                                       | `awesomeOscillator()`                  | `indicator`   | `awesome-oscillator`                    |
| [Absolute price oscillator](./absolute-price-oscillator.md)                         | `absolutePriceOscillator()`            | `indicator`   | `absolute-price-oscillator`             |
| [Aroon indicator](./aroon.md)                                                       | `aroon()`                              | `indicator`   | `aroon`                                 |
| [Aroon oscillator](./aroon-oscillator.md)                                           | `aroonOscillator()`                    | `indicator`   | `aroon-oscillator`                      |
| [Average true range](./average-true-range.md)                                       | `averageTrueRange()`                   | `indicator`   | `average-true-range`                    |
| [Volatility bands](./volatility-bands.md)                                           | `volatilityBands()`                    | `indicator`   | `volatility-bands`                      |
| [Commodity channel index](./commodity-channel-index.md)                             | `commodityChannelIndex()`              | `indicator`   | `commodity-channel-index`               |
| [Chaikin oscillator](./chaikin-oscillator.md)                                       | `chaikinOscillator()`                  | `indicator`   | `chaikin-oscillator`                    |
| [Chaikin money flow](./chaikin-money-flow.md)                                       | `chaikinMoneyFlow()`                   | `indicator`   | `chaikin-money-flow`                    |
| [Chande momentum oscillator](./chande-momentum-oscillator.md)                       | `chandeMomentumOscillator()`           | `indicator`   | `chande-momentum-oscillator`            |
| [Double exponential moving average](./double-exponential-average.md)                | `doubleExponentialMovingAverage()`     | `indicator`   | `double-exponential-average`            |
| [Disparity index](./disparity-index.md)                                             | `disparityIndex()`                     | `indicator`   | `disparity-index`                       |
| [Directional movement index](./directional-movement-index.md)                       | `directionalMovementIndex()`           | `indicator`   | `directional-movement-index`            |
| [Detrended price oscillator](./detrended-price-oscillator.md)                       | `detrendedPriceOscillator()`           | `indicator`   | `detrended-price-oscillator`            |
| [Exponential moving average](./exponential-moving-average.md)                       | `exponentialMovingAverage()`           | `indicator`   | `exponential-moving-average`            |
| [Ichimoku cloud](./ichimoku-cloud.md)                                               | `ichimokuCloud()`                      | `indicator`   | `ichimoku-cloud`                        |
| [Keltner channels](./keltner-channels.md)                                           | `keltnerChannels()`                    | `indicator`   | `keltner-channels`                      |
| [Klinger oscillator](./klinger-oscillator.md)                                       | `klingerOscillator()`                  | `indicator`   | `klinger-oscillator`                    |
| [Linear regression](./linear-regression.md)                                         | `linearRegression()`                   | `indicator`   | `linear-regression`                     |
| [Linear regression angle](./linear-regression-angle.md)                             | `linearRegressionAngle()`              | `indicator`   | `linear-regression-angle`               |
| [Linear regression intercept](./linear-regression-intercept.md)                     | `linearRegressionIntercept()`          | `indicator`   | `linear-regression-intercept`           |
| [Linear regression slope](./linear-regression-slope.md)                             | `linearRegressionSlope()`              | `indicator`   | `linear-regression-slope`               |
| [Moving average convergence divergence](./moving-average-convergence-divergence.md) | `movingAverageConvergenceDivergence()` | `indicator`   | `moving-average-convergence-divergence` |
| [Money flow index](./money-flow-index.md)                                           | `moneyFlowIndex()`                     | `indicator`   | `money-flow-index`                      |
| [Momentum indicator](./momentum.md)                                                 | `momentumIndicator()`                  | `indicator`   | `momentum`                              |
| [Normalized average true range](./normalized-average-true-range.md)                 | `normalizedAverageTrueRange()`         | `indicator`   | `normalized-average-true-range`         |
| [On-balance volume](./on-balance-volume.md)                                         | `onBalanceVolume()`                    | `indicator`   | `on-balance-volume`                     |
| [Price channel](./price-channel.md)                                                 | `priceChannel()`                       | `indicator`   | `price-channel`                         |
| [Pivot points](./pivot-points.md)                                                   | `pivotPoints()`                        | `indicator`   | `pivot-points`                          |
| [Percentage price oscillator](./percentage-price-oscillator.md)                     | `percentagePriceOscillator()`          | `indicator`   | `percentage-price-oscillator`           |
| [Price envelopes](./price-envelopes.md)                                             | `priceEnvelopes()`                     | `indicator`   | `price-envelopes`                       |
| [Parabolic stop and reverse](./parabolic-stop-and-reverse.md)                       | `parabolicStopAndReverse()`            | `indicator`   | `parabolic-stop-and-reverse`            |
| [Rate of change](./rate-of-change.md)                                               | `rateOfChange()`                       | `indicator`   | `rate-of-change`                        |
| [Relative strength index](./relative-strength-index.md)                             | `relativeStrengthIndex()`              | `indicator`   | `relative-strength-index`               |
| [Slow stochastic oscillator](./slow-stochastic.md)                                  | `slowStochastic()`                     | `indicator`   | `slow-stochastic`                       |
| [Simple moving average](./simple-moving-average.md)                                 | `simpleMovingAverage()`                | `indicator`   | `simple-moving-average`                 |
| [Stochastic oscillator](./stochastic.md)                                            | `stochastic()`                         | `indicator`   | `stochastic`                            |
| [Supertrend](./supertrend.md)                                                       | `supertrend()`                         | `indicator`   | `supertrend`                            |
| [Triple exponential moving average](./triple-exponential-average.md)                | `tripleExponentialMovingAverage()`     | `indicator`   | `triple-exponential-average`            |
| [Triple exponential average oscillator](./triple-exponential-oscillator.md)         | `tripleExponentialAverageOscillator()` | `indicator`   | `triple-exponential-oscillator`         |
| [Volume weighted average price](./volume-weighted-average-price.md)                 | `volumeWeightedAveragePrice()`         | `indicator`   | `volume-weighted-average-price`         |
| [Williams range](./williams-range.md)                                               | `williamsRange()`                      | `indicator`   | `williams-range`                        |
| [Weighted moving average](./weighted-moving-average.md)                             | `weightedMovingAverage()`              | `indicator`   | `weighted-moving-average`               |
| [Zigzag indicator](./zigzag.md)                                                     | `zigzag()`                             | `indicator`   | `zigzag`                                |

### Financial series

| Chart                                                 | Quick API             | Portable mark    | Canonical family      |
| ----------------------------------------------------- | --------------------- | ---------------- | --------------------- |
| [Event flags](./event-flags.md)                       | `eventFlags()`        | `flags`          | `event-flags`         |
| [Heikin-Ashi chart](./heikin-ashi.md)                 | `heikinAshi()`        | `financial`      | `heikin-ashi`         |
| [High-low-close chart](./high-low-close.md)           | `highLowClose()`      | `financial`      | `high-low-close`      |
| [Hollow candlestick chart](./hollow-candlestick.md)   | `hollowCandlestick()` | `financial`      | `hollow-candlestick`  |
| [Open-high-low-close chart](./open-high-low-close.md) | `openHighLowClose()`  | `financial`      | `open-high-low-close` |
| [Point and figure chart](./point-and-figure.md)       | `pointAndFigure()`    | `point-figure`   | `point-and-figure`    |
| [Renko chart](./renko.md)                             | `renko()`             | `renko`          | `renko`               |
| [Volume by price](./volume-by-price.md)               | `volumeByPrice()`     | `volume-profile` | `volume-by-price`     |

<!-- SERIES_CATALOG_END -->

The [31-family default gallery](../../examples/cdn/complete-chart-types.html), [14-family advanced gallery](../../examples/cdn/additional-chart-types.html), and [96-family specialized series gallery](../../examples/cdn/series-chart-types.html) together render the complete 141-family catalog. The smaller [introductory gallery](../../examples/cdn/chart-types.html) remains useful for a quick start.

Every chart-specific guide includes a current visual snapshot generated from the actual Graflume `compile()` Scene. Run `npm run docs:snapshots` after a rendering change to rebuild and verify all 141 assets deterministically.

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
