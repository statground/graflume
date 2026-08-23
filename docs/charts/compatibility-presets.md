# Compatibility preset index

Graflume exposes 41 representative chart families while preserving compatible names. This index maps the 160 family presets to the one manual that documents their data contract, functional differences, and current compiled output.

Use `resolveSeriesType(identifier)` from `graflume/complete` when an integration receives names with mixed case, spaces, hyphens, or underscores. The returned `familyId` selects the representative manual and `variantId` preserves the requested preset.

The two function-free adapter names are documented separately in [Adapters](./adapters.md).

## [Annotation chart](./annotation.md#integrated-presets)

| Identifier           | Compatible name                                                  | Quick API             | Mode          | Portable mark |
| -------------------- | ---------------------------------------------------------------- | --------------------- | ------------- | ------------- |
| `annotation`         | [Annotation chart](./annotation.md#variant-annotation)           | `annotation()`        | `default`     | `annotation`  |
| `annotated-timeline` | [Annotated timeline](./annotation.md#variant-annotated-timeline) | `annotatedTimeline()` | `timeline`    | `annotation`  |
| `event-flags`        | [Event flags](./annotation.md#variant-event-flags)               | `eventFlags()`        | `event-flags` | `flags`       |

## [Area chart](./area.md#integrated-presets)

| Identifier     | Compatible name                                      | Quick API       | Mode          | Portable mark  |
| -------------- | ---------------------------------------------------- | --------------- | ------------- | -------------- |
| `area`         | [Area chart](./area.md#variant-area)                 | `area()`        | `default`     | `area`         |
| `stepped-area` | [Stepped area chart](./area.md#variant-stepped-area) | `steppedArea()` | `stepped`     | `stepped-area` |
| `theme-river`  | [Theme river chart](./area.md#variant-theme-river)   | `themeRiver()`  | `stream`      | `theme-river`  |
| `area-spline`  | [Smooth area chart](./area.md#variant-area-spline)   | `areaSpline()`  | `area-spline` | `smooth`       |
| `polygon`      | [Polygon chart](./area.md#variant-polygon)           | `polygon()`     | `polygon`     | `polygon`      |
| `streamgraph`  | [Streamgraph](./area.md#variant-streamgraph)         | `streamgraph()` | `streamgraph` | `theme-river`  |

## [Bar chart](./bar.md#integrated-presets)

| Identifier         | Compatible name                                                | Quick API           | Mode               | Portable mark   |
| ------------------ | -------------------------------------------------------------- | ------------------- | ------------------ | --------------- |
| `bar`              | [Bar chart](./bar.md#variant-bar)                              | `horizontalBar()`   | `horizontal`       | `bar`           |
| `column`           | [Column chart](./bar.md#variant-column)                        | `column()`          | `vertical`         | `bar`           |
| `pictorial-bar`    | [Pictorial bar chart](./bar.md#variant-pictorial-bar)          | `pictorialBar()`    | `pictorial`        | `pictorial-bar` |
| `bullet`           | [Bullet chart](./bar.md#variant-bullet)                        | `bullet()`          | `bullet`           | `bullet`        |
| `column-pyramid`   | [Column pyramid chart](./bar.md#variant-column-pyramid)        | `columnPyramid()`   | `column-pyramid`   | `pyramid`       |
| `cylinder`         | [Cylinder chart](./bar.md#variant-cylinder)                    | `cylinder()`        | `cylinder`         | `cylinder`      |
| `lollipop`         | [Lollipop chart](./bar.md#variant-lollipop)                    | `lollipop()`        | `lollipop`         | `lollipop`      |
| `pictorial-column` | [Pictorial column chart](./bar.md#variant-pictorial-column)    | `pictorialColumn()` | `pictorial-column` | `pictorial-bar` |
| `variable-width`   | [Variable width column chart](./bar.md#variant-variable-width) | `variableWidth()`   | `variable-width`   | `variwide`      |

## [Bubble chart](./bubble.md#integrated-presets)

| Identifier      | Compatible name                                          | Quick API        | Mode            | Portable mark   |
| --------------- | -------------------------------------------------------- | ---------------- | --------------- | --------------- |
| `bubble`        | [Bubble chart](./bubble.md#variant-bubble)               | `bubble()`       | `default`       | `bubble`        |
| `packed-bubble` | [Packed bubble chart](./bubble.md#variant-packed-bubble) | `packedBubble()` | `packed-bubble` | `packed-bubble` |

## [Calendar chart](./calendar.md#integrated-presets)

| Identifier | Compatible name                                  | Quick API    | Mode      | Portable mark |
| ---------- | ------------------------------------------------ | ------------ | --------- | ------------- |
| `calendar` | [Calendar chart](./calendar.md#variant-calendar) | `calendar()` | `default` | `calendar`    |

## [Candlestick chart](./candlestick.md#integrated-presets)

| Identifier            | Compatible name                                                           | Quick API             | Mode                  | Portable mark |
| --------------------- | ------------------------------------------------------------------------- | --------------------- | --------------------- | ------------- |
| `candlestick`         | [Candlestick chart](./candlestick.md#variant-candlestick)                 | `candlestick()`       | `default`             | `candlestick` |
| `heikin-ashi`         | [Heikin-Ashi chart](./candlestick.md#variant-heikin-ashi)                 | `heikinAshi()`        | `heikin-ashi`         | `financial`   |
| `high-low-close`      | [High-low-close chart](./candlestick.md#variant-high-low-close)           | `highLowClose()`      | `high-low-close`      | `financial`   |
| `hollow-candlestick`  | [Hollow candlestick chart](./candlestick.md#variant-hollow-candlestick)   | `hollowCandlestick()` | `hollow-candlestick`  | `financial`   |
| `open-high-low-close` | [Open-high-low-close chart](./candlestick.md#variant-open-high-low-close) | `openHighLowClose()`  | `open-high-low-close` | `financial`   |

## [Combination chart](./combination.md#integrated-presets)

| Identifier | Compatible name                                 | Quick API  | Mode      | Portable mark |
| ---------- | ----------------------------------------------- | ---------- | --------- | ------------- |
| `combo`    | [Combo chart](./combination.md#variant-combo)   | `combo()`  | `default` | `multiple`    |
| `pareto`   | [Pareto chart](./combination.md#variant-pareto) | `pareto()` | `pareto`  | `pareto`      |

## [Difference chart](./difference.md#integrated-presets)

| Identifier | Compatible name                            | Quick API | Mode      | Portable mark |
| ---------- | ------------------------------------------ | --------- | --------- | ------------- |
| `diff`     | [Diff chart](./difference.md#variant-diff) | `diff()`  | `default` | `diff`        |

## [Pie chart](./pie.md#integrated-presets)

| Identifier     | Compatible name                                            | Quick API       | Mode           | Portable mark  |
| -------------- | ---------------------------------------------------------- | --------------- | -------------- | -------------- |
| `donut`        | [Donut chart](./pie.md#variant-donut)                      | `donut()`       | `donut`        | `pie`          |
| `pie`          | [Pie chart](./pie.md#variant-pie)                          | `pie()`         | `default`      | `pie`          |
| `variable-pie` | [Variable radius pie chart](./pie.md#variant-variable-pie) | `variablePie()` | `variable-pie` | `variable-pie` |

## [Timeline and range chart](./timeline.md#integrated-presets)

| Identifier | Compatible name                                         | Quick API    | Mode      | Portable mark |
| ---------- | ------------------------------------------------------- | ------------ | --------- | ------------- |
| `gantt`    | [Gantt chart](./timeline.md#variant-gantt)              | `gantt()`    | `gantt`   | `gantt`       |
| `timeline` | [Timeline](./timeline.md#variant-timeline)              | `timeline()` | `default` | `timeline`    |
| `x-range`  | [Horizontal range chart](./timeline.md#variant-x-range) | `xRange()`   | `x-range` | `timeline`    |

## [Gauge chart](./gauge.md#integrated-presets)

| Identifier     | Compatible name                                     | Quick API       | Mode          | Portable mark |
| -------------- | --------------------------------------------------- | --------------- | ------------- | ------------- |
| `gauge`        | [Gauge chart](./gauge.md#variant-gauge)             | `gauge()`       | `default`     | `gauge`       |
| `gauge-number` | [Number indicator](./gauge.md#variant-gauge-number) | `gaugeNumber()` | `number`      | `gauge`       |
| `gauge-delta`  | [Delta indicator](./gauge.md#variant-gauge-delta)   | `gaugeDelta()`  | `delta`       | `gauge`       |
| `gauge-bullet` | [Bullet gauge](./gauge.md#variant-gauge-bullet)     | `gaugeBullet()` | `bullet`      | `gauge`       |
| `solid-gauge`  | [Solid gauge](./gauge.md#variant-solid-gauge)       | `solidGauge()`  | `solid-gauge` | `solid-gauge` |

## [Map chart](./map.md#integrated-presets)

| Identifier    | Compatible name                                    | Quick API      | Mode          | Portable mark |
| ------------- | -------------------------------------------------- | -------------- | ------------- | ------------- |
| `geo`         | [Geographic region chart](./map.md#variant-geo)    | `geo()`        | `region`      | `geo`         |
| `map`         | [Map](./map.md#variant-map)                        | `map()`        | `default`     | `map`         |
| `flow-map`    | [Flow map](./map.md#variant-flow-map)              | `flowMap()`    | `flow-map`    | `geo-flow`    |
| `geo-heatmap` | [Geographic heatmap](./map.md#variant-geo-heatmap) | `geoHeatmap()` | `geo-heatmap` | `geo-heatmap` |
| `map-bubble`  | [Map bubble chart](./map.md#variant-map-bubble)    | `mapBubble()`  | `map-bubble`  | `map`         |
| `map-line`    | [Map line chart](./map.md#variant-map-line)        | `mapLine()`    | `map-line`    | `geo-line`    |
| `map-point`   | [Map point chart](./map.md#variant-map-point)      | `mapPoint()`   | `map-point`   | `map`         |
| `tiled-map`   | [Tiled map](./map.md#variant-tiled-map)            | `tiledMap()`   | `tiled-map`   | `tiled-map`   |

## [Distribution chart](./distribution.md#integrated-presets)

| Identifier             | Compatible name                                                              | Quick API              | Mode                   | Portable mark  |
| ---------------------- | ---------------------------------------------------------------------------- | ---------------------- | ---------------------- | -------------- |
| `distribution`         | [Distribution chart](./distribution.md#variant-distribution)                 | `distribution()`       | `histogram`            | `distribution` |
| `histogram`            | [Histogram](./distribution.md#variant-histogram)                             | `histogram()`          | `histogram`            | `histogram`    |
| `histogram-2d`         | [Bivariate histogram](./distribution.md#variant-histogram-2d)                | `histogram2d()`        | `histogram-2d`         | `distribution` |
| `histogram-2d-contour` | [Bivariate density contours](./distribution.md#variant-histogram-2d-contour) | `histogram2dContour()` | `histogram-2d-contour` | `distribution` |
| `violin`               | [Violin chart](./distribution.md#variant-violin)                             | `violin()`             | `violin`               | `distribution` |
| `boxplot`              | [Boxplot](./distribution.md#variant-boxplot)                                 | `boxplot()`            | `boxplot`              | `boxplot`      |
| `bell-curve`           | [Bell curve](./distribution.md#variant-bell-curve)                           | `bellCurve()`          | `bell-curve`           | `distribution` |

## [Interval chart](./interval.md#integrated-presets)

| Identifier          | Compatible name                                                    | Quick API           | Mode                | Portable mark |
| ------------------- | ------------------------------------------------------------------ | ------------------- | ------------------- | ------------- |
| `intervals`         | [Intervals](./interval.md#variant-intervals)                       | `intervals()`       | `default`           | `interval`    |
| `area-range`        | [Area range chart](./interval.md#variant-area-range)               | `areaRange()`       | `area-range`        | `range`       |
| `area-spline-range` | [Smooth area range chart](./interval.md#variant-area-spline-range) | `areaSplineRange()` | `area-spline-range` | `range`       |
| `column-range`      | [Column range chart](./interval.md#variant-column-range)           | `columnRange()`     | `column-range`      | `range`       |
| `dumbbell`          | [Dumbbell chart](./interval.md#variant-dumbbell)                   | `dumbbell()`        | `dumbbell`          | `range`       |
| `error-bar`         | [Error bar chart](./interval.md#variant-error-bar)                 | `errorBar()`        | `error-bar`         | `interval`    |

## [Line chart](./line.md#integrated-presets)

| Identifier  | Compatible name                          | Quick API     | Mode      | Portable mark |
| ----------- | ---------------------------------------- | ------------- | --------- | ------------- |
| `line`      | [Line chart](./line.md#variant-line)     | `line()`      | `default` | `line`        |
| `trendline` | [Trendline](./line.md#variant-trendline) | `trendline()` | `trend`   | `trendline`   |
| `spline`    | [Spline chart](./line.md#variant-spline) | `spline()`    | `spline`  | `smooth`      |

## [Motion chart](./motion.md#integrated-presets)

| Identifier | Compatible name                            | Quick API  | Mode      | Portable mark |
| ---------- | ------------------------------------------ | ---------- | --------- | ------------- |
| `motion`   | [Motion chart](./motion.md#variant-motion) | `motion()` | `default` | `motion`      |

## [Hierarchy chart](./hierarchy.md#integrated-presets)

| Identifier             | Compatible name                                                     | Quick API               | Mode                   | Portable mark |
| ---------------------- | ------------------------------------------------------------------- | ----------------------- | ---------------------- | ------------- |
| `org`                  | [Organization chart](./hierarchy.md#variant-org)                    | `org()`                 | `organization`         | `org`         |
| `treemap`              | [Tree map](./hierarchy.md#variant-treemap)                          | `treemap()`             | `treemap`              | `treemap`     |
| `icicle`               | [Icicle chart](./hierarchy.md#variant-icicle)                       | `icicle()`              | `icicle`               | `treemap`     |
| `tree`                 | [Tree chart](./hierarchy.md#variant-tree)                           | `tree()`                | `tree`                 | `tree`        |
| `sunburst`             | [Sunburst chart](./hierarchy.md#variant-sunburst)                   | `sunburst()`            | `sunburst`             | `sunburst`    |
| `organization-network` | [Organization network](./hierarchy.md#variant-organization-network) | `organizationNetwork()` | `organization-network` | `org`         |
| `tree-graph`           | [Tree graph](./hierarchy.md#variant-tree-graph)                     | `treeGraph()`           | `tree-graph`           | `tree`        |

## [Flow diagram](./flow.md#integrated-presets)

| Identifier | Compatible name                            | Quick API  | Mode      | Portable mark |
| ---------- | ------------------------------------------ | ---------- | --------- | ------------- |
| `sankey`   | [Sankey diagram](./flow.md#variant-sankey) | `sankey()` | `default` | `sankey`      |

## [Scatter chart](./scatter.md#integrated-presets)

| Identifier       | Compatible name                                             | Quick API         | Mode         | Portable mark    |
| ---------------- | ----------------------------------------------------------- | ----------------- | ------------ | ---------------- |
| `scatter`        | [Scatter chart](./scatter.md#variant-scatter)               | `scatter()`       | `default`    | `point`          |
| `effect-scatter` | [Effect scatter chart](./scatter.md#variant-effect-scatter) | `effectScatter()` | `emphasis`   | `effect-scatter` |
| `scatter-3d`     | [Three-axis scatter chart](./scatter.md#variant-scatter-3d) | `scatter3d()`     | `scatter-3d` | `scatter-3d`     |

## [Table chart](./table.md#integrated-presets)

| Identifier | Compatible name                         | Quick API | Mode      | Portable mark |
| ---------- | --------------------------------------- | --------- | --------- | ------------- |
| `table`    | [Table chart](./table.md#variant-table) | `table()` | `default` | `table`       |

## [Waterfall chart](./waterfall.md#integrated-presets)

| Identifier  | Compatible name                                     | Quick API     | Mode      | Portable mark |
| ----------- | --------------------------------------------------- | ------------- | --------- | ------------- |
| `waterfall` | [Waterfall chart](./waterfall.md#variant-waterfall) | `waterfall()` | `default` | `waterfall`   |

## [Word tree](./word-tree.md#integrated-presets)

| Identifier  | Compatible name                               | Quick API    | Mode      | Portable mark |
| ----------- | --------------------------------------------- | ------------ | --------- | ------------- |
| `word-tree` | [Word tree](./word-tree.md#variant-word-tree) | `wordTree()` | `default` | `word-tree`   |

## [Polar chart](./polar.md#integrated-presets)

| Identifier      | Compatible name                                         | Quick API        | Mode      | Portable mark |
| --------------- | ------------------------------------------------------- | ---------------- | --------- | ------------- |
| `polar`         | [Polar chart](./polar.md#variant-polar)                 | `polar()`        | `default` | `polar`       |
| `radar`         | [Radar chart](./polar.md#variant-radar)                 | `radar()`        | `radar`   | `radar`       |
| `polar-line`    | [Polar line chart](./polar.md#variant-polar-line)       | `polarLine()`    | `line`    | `polar`       |
| `polar-scatter` | [Polar scatter chart](./polar.md#variant-polar-scatter) | `polarScatter()` | `scatter` | `polar`       |
| `polar-bar`     | [Polar bar chart](./polar.md#variant-polar-bar)         | `polarBar()`     | `bar`     | `polar`       |

## [Network chart](./network.md#integrated-presets)

| Identifier      | Compatible name                                     | Quick API        | Mode            | Portable mark |
| --------------- | --------------------------------------------------- | ---------------- | --------------- | ------------- |
| `graph`         | [Graph chart](./network.md#variant-graph)           | `graph()`        | `node-link`     | `graph`       |
| `lines`         | [Connection lines](./network.md#variant-lines)      | `lines()`        | `connections`   | `lines`       |
| `arc-diagram`   | [Arc diagram](./network.md#variant-arc-diagram)     | `arcDiagram()`   | `arc-diagram`   | `arc-diagram` |
| `network-graph` | [Network graph](./network.md#variant-network-graph) | `networkGraph()` | `network-graph` | `graph`       |

## [Chord diagram](./chord.md#integrated-presets)

| Identifier         | Compatible name                                         | Quick API           | Mode               | Portable mark |
| ------------------ | ------------------------------------------------------- | ------------------- | ------------------ | ------------- |
| `chord`            | [Chord diagram](./chord.md#variant-chord)               | `chord()`           | `default`          | `chord`       |
| `dependency-wheel` | [Dependency wheel](./chord.md#variant-dependency-wheel) | `dependencyWheel()` | `dependency-wheel` | `chord`       |

## [Funnel chart](./funnel.md#integrated-presets)

| Identifier    | Compatible name                                       | Quick API      | Mode         | Portable mark |
| ------------- | ----------------------------------------------------- | -------------- | ------------ | ------------- |
| `funnel`      | [Funnel chart](./funnel.md#variant-funnel)            | `funnel()`     | `default`    | `funnel`      |
| `funnel-area` | [Funnel area chart](./funnel.md#variant-funnel-area)  | `funnelArea()` | `area`       | `funnel`      |
| `funnel-3d`   | [Depth funnel chart](./funnel.md#variant-funnel-3d)   | `funnel3d()`   | `funnel-3d`  | `pyramid`     |
| `pyramid`     | [Pyramid chart](./funnel.md#variant-pyramid)          | `pyramid()`    | `pyramid`    | `pyramid`     |
| `pyramid-3d`  | [Depth pyramid chart](./funnel.md#variant-pyramid-3d) | `pyramid3d()`  | `pyramid-3d` | `pyramid`     |

## [Parallel coordinates](./parallel.md#integrated-presets)

| Identifier            | Compatible name                                                  | Quick API              | Mode         | Portable mark |
| --------------------- | ---------------------------------------------------------------- | ---------------------- | ------------ | ------------- |
| `parallel`            | [Parallel coordinates](./parallel.md#variant-parallel)           | `parallel()`           | `default`    | `parallel`    |
| `parallel-categories` | [Parallel categories](./parallel.md#variant-parallel-categories) | `parallelCategories()` | `categories` | `parallel`    |

## [Heatmap](./heatmap.md#integrated-presets)

| Identifier | Compatible name                           | Quick API   | Mode       | Portable mark |
| ---------- | ----------------------------------------- | ----------- | ---------- | ------------- |
| `heatmap`  | [Heatmap](./heatmap.md#variant-heatmap)   | `heatmap()` | `default`  | `heatmap`     |
| `tile-map` | [Tile map](./heatmap.md#variant-tile-map) | `tileMap()` | `tile-map` | `tilemap`     |

## [Raster image](./image.md#integrated-presets)

| Identifier | Compatible name                          | Quick API | Mode      | Portable mark |
| ---------- | ---------------------------------------- | --------- | --------- | ------------- |
| `image`    | [Raster image](./image.md#variant-image) | `image()` | `default` | `image`       |

## [Ternary chart](./ternary.md#integrated-presets)

| Identifier | Compatible name                               | Quick API   | Mode      | Portable mark |
| ---------- | --------------------------------------------- | ----------- | --------- | ------------- |
| `ternary`  | [Ternary chart](./ternary.md#variant-ternary) | `ternary()` | `default` | `ternary`     |

## [Smith chart](./smith.md#integrated-presets)

| Identifier | Compatible name                         | Quick API | Mode      | Portable mark |
| ---------- | --------------------------------------- | --------- | --------- | ------------- |
| `smith`    | [Smith chart](./smith.md#variant-smith) | `smith()` | `default` | `smith`       |

## [Scatter matrix](./scatter-matrix.md#integrated-presets)

| Identifier       | Compatible name                                              | Quick API         | Mode      | Portable mark    |
| ---------------- | ------------------------------------------------------------ | ----------------- | --------- | ---------------- |
| `scatter-matrix` | [Scatter matrix](./scatter-matrix.md#variant-scatter-matrix) | `scatterMatrix()` | `default` | `scatter-matrix` |

## [Carpet chart](./carpet.md#integrated-presets)

| Identifier       | Compatible name                                              | Quick API         | Mode      | Portable mark |
| ---------------- | ------------------------------------------------------------ | ----------------- | --------- | ------------- |
| `carpet`         | [Carpet chart](./carpet.md#variant-carpet)                   | `carpet()`        | `default` | `carpet`      |
| `carpet-scatter` | [Carpet scatter overlay](./carpet.md#variant-carpet-scatter) | `carpetScatter()` | `scatter` | `carpet`      |
| `carpet-contour` | [Carpet contour overlay](./carpet.md#variant-carpet-contour) | `carpetContour()` | `contour` | `carpet`      |

## [Contour chart](./contour.md#integrated-presets)

| Identifier | Compatible name                               | Quick API   | Mode      | Portable mark |
| ---------- | --------------------------------------------- | ----------- | --------- | ------------- |
| `contour`  | [Contour chart](./contour.md#variant-contour) | `contour()` | `default` | `contour`     |

## [Item chart](./item.md#integrated-presets)

| Identifier | Compatible name                      | Quick API     | Mode      | Portable mark |
| ---------- | ------------------------------------ | ------------- | --------- | ------------- |
| `item`     | [Item chart](./item.md#variant-item) | `itemChart()` | `default` | `item`        |

## [Vector field chart](./vector-field.md#integrated-presets)

| Identifier  | Compatible name                                        | Quick API    | Mode        | Portable mark |
| ----------- | ------------------------------------------------------ | ------------ | ----------- | ------------- |
| `vector`    | [Vector field chart](./vector-field.md#variant-vector) | `vector()`   | `vector`    | `vector`      |
| `wind-barb` | [Wind barb chart](./vector-field.md#variant-wind-barb) | `windBarb()` | `wind-barb` | `wind-barb`   |

## [Venn diagram](./venn.md#integrated-presets)

| Identifier | Compatible name                        | Quick API | Mode      | Portable mark |
| ---------- | -------------------------------------- | --------- | --------- | ------------- |
| `venn`     | [Venn diagram](./venn.md#variant-venn) | `venn()`  | `default` | `venn`        |

## [Word cloud](./word-cloud.md#integrated-presets)

| Identifier   | Compatible name                                  | Quick API     | Mode      | Portable mark |
| ------------ | ------------------------------------------------ | ------------- | --------- | ------------- |
| `word-cloud` | [Word cloud](./word-cloud.md#variant-word-cloud) | `wordCloud()` | `default` | `word-cloud`  |

## [Price blocks chart](./price-blocks.md#integrated-presets)

| Identifier         | Compatible name                                                      | Quick API          | Mode               | Portable mark  |
| ------------------ | -------------------------------------------------------------------- | ------------------ | ------------------ | -------------- |
| `point-and-figure` | [Point and figure chart](./price-blocks.md#variant-point-and-figure) | `pointAndFigure()` | `point-and-figure` | `point-figure` |
| `renko`            | [Renko chart](./price-blocks.md#variant-renko)                       | `renko()`          | `renko`            | `renko`        |

## [Volume profile chart](./volume-profile.md#integrated-presets)

| Identifier        | Compatible name                                                | Quick API         | Mode              | Portable mark    |
| ----------------- | -------------------------------------------------------------- | ----------------- | ----------------- | ---------------- |
| `volume-by-price` | [Volume by price](./volume-profile.md#variant-volume-by-price) | `volumeByPrice()` | `volume-by-price` | `volume-profile` |

## [Technical indicator chart](./technical-indicator.md#integrated-presets)

| Identifier                              | Compatible name                                                                                                 | Quick API                              | Mode                                    | Portable mark |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------- | ------------- |
| `acceleration-bands`                    | [Acceleration bands](./technical-indicator.md#variant-acceleration-bands)                                       | `accelerationBands()`                  | `acceleration-bands`                    | `indicator`   |
| `awesome-oscillator`                    | [Awesome oscillator](./technical-indicator.md#variant-awesome-oscillator)                                       | `awesomeOscillator()`                  | `awesome-oscillator`                    | `indicator`   |
| `absolute-price-oscillator`             | [Absolute price oscillator](./technical-indicator.md#variant-absolute-price-oscillator)                         | `absolutePriceOscillator()`            | `absolute-price-oscillator`             | `indicator`   |
| `aroon`                                 | [Aroon indicator](./technical-indicator.md#variant-aroon)                                                       | `aroon()`                              | `aroon`                                 | `indicator`   |
| `aroon-oscillator`                      | [Aroon oscillator](./technical-indicator.md#variant-aroon-oscillator)                                           | `aroonOscillator()`                    | `aroon-oscillator`                      | `indicator`   |
| `average-true-range`                    | [Average true range](./technical-indicator.md#variant-average-true-range)                                       | `averageTrueRange()`                   | `average-true-range`                    | `indicator`   |
| `volatility-bands`                      | [Volatility bands](./technical-indicator.md#variant-volatility-bands)                                           | `volatilityBands()`                    | `volatility-bands`                      | `indicator`   |
| `commodity-channel-index`               | [Commodity channel index](./technical-indicator.md#variant-commodity-channel-index)                             | `commodityChannelIndex()`              | `commodity-channel-index`               | `indicator`   |
| `chaikin-oscillator`                    | [Chaikin oscillator](./technical-indicator.md#variant-chaikin-oscillator)                                       | `chaikinOscillator()`                  | `chaikin-oscillator`                    | `indicator`   |
| `chaikin-money-flow`                    | [Chaikin money flow](./technical-indicator.md#variant-chaikin-money-flow)                                       | `chaikinMoneyFlow()`                   | `chaikin-money-flow`                    | `indicator`   |
| `chande-momentum-oscillator`            | [Chande momentum oscillator](./technical-indicator.md#variant-chande-momentum-oscillator)                       | `chandeMomentumOscillator()`           | `chande-momentum-oscillator`            | `indicator`   |
| `double-exponential-average`            | [Double exponential moving average](./technical-indicator.md#variant-double-exponential-average)                | `doubleExponentialMovingAverage()`     | `double-exponential-average`            | `indicator`   |
| `disparity-index`                       | [Disparity index](./technical-indicator.md#variant-disparity-index)                                             | `disparityIndex()`                     | `disparity-index`                       | `indicator`   |
| `directional-movement-index`            | [Directional movement index](./technical-indicator.md#variant-directional-movement-index)                       | `directionalMovementIndex()`           | `directional-movement-index`            | `indicator`   |
| `detrended-price-oscillator`            | [Detrended price oscillator](./technical-indicator.md#variant-detrended-price-oscillator)                       | `detrendedPriceOscillator()`           | `detrended-price-oscillator`            | `indicator`   |
| `exponential-moving-average`            | [Exponential moving average](./technical-indicator.md#variant-exponential-moving-average)                       | `exponentialMovingAverage()`           | `exponential-moving-average`            | `indicator`   |
| `ichimoku-cloud`                        | [Ichimoku cloud](./technical-indicator.md#variant-ichimoku-cloud)                                               | `ichimokuCloud()`                      | `ichimoku-cloud`                        | `indicator`   |
| `keltner-channels`                      | [Keltner channels](./technical-indicator.md#variant-keltner-channels)                                           | `keltnerChannels()`                    | `keltner-channels`                      | `indicator`   |
| `klinger-oscillator`                    | [Klinger oscillator](./technical-indicator.md#variant-klinger-oscillator)                                       | `klingerOscillator()`                  | `klinger-oscillator`                    | `indicator`   |
| `linear-regression`                     | [Linear regression](./technical-indicator.md#variant-linear-regression)                                         | `linearRegression()`                   | `linear-regression`                     | `indicator`   |
| `linear-regression-angle`               | [Linear regression angle](./technical-indicator.md#variant-linear-regression-angle)                             | `linearRegressionAngle()`              | `linear-regression-angle`               | `indicator`   |
| `linear-regression-intercept`           | [Linear regression intercept](./technical-indicator.md#variant-linear-regression-intercept)                     | `linearRegressionIntercept()`          | `linear-regression-intercept`           | `indicator`   |
| `linear-regression-slope`               | [Linear regression slope](./technical-indicator.md#variant-linear-regression-slope)                             | `linearRegressionSlope()`              | `linear-regression-slope`               | `indicator`   |
| `moving-average-convergence-divergence` | [Moving average convergence divergence](./technical-indicator.md#variant-moving-average-convergence-divergence) | `movingAverageConvergenceDivergence()` | `moving-average-convergence-divergence` | `indicator`   |
| `money-flow-index`                      | [Money flow index](./technical-indicator.md#variant-money-flow-index)                                           | `moneyFlowIndex()`                     | `money-flow-index`                      | `indicator`   |
| `momentum`                              | [Momentum indicator](./technical-indicator.md#variant-momentum)                                                 | `momentumIndicator()`                  | `momentum`                              | `indicator`   |
| `normalized-average-true-range`         | [Normalized average true range](./technical-indicator.md#variant-normalized-average-true-range)                 | `normalizedAverageTrueRange()`         | `normalized-average-true-range`         | `indicator`   |
| `on-balance-volume`                     | [On-balance volume](./technical-indicator.md#variant-on-balance-volume)                                         | `onBalanceVolume()`                    | `on-balance-volume`                     | `indicator`   |
| `price-channel`                         | [Price channel](./technical-indicator.md#variant-price-channel)                                                 | `priceChannel()`                       | `price-channel`                         | `indicator`   |
| `pivot-points`                          | [Pivot points](./technical-indicator.md#variant-pivot-points)                                                   | `pivotPoints()`                        | `pivot-points`                          | `indicator`   |
| `percentage-price-oscillator`           | [Percentage price oscillator](./technical-indicator.md#variant-percentage-price-oscillator)                     | `percentagePriceOscillator()`          | `percentage-price-oscillator`           | `indicator`   |
| `price-envelopes`                       | [Price envelopes](./technical-indicator.md#variant-price-envelopes)                                             | `priceEnvelopes()`                     | `price-envelopes`                       | `indicator`   |
| `parabolic-stop-and-reverse`            | [Parabolic stop and reverse](./technical-indicator.md#variant-parabolic-stop-and-reverse)                       | `parabolicStopAndReverse()`            | `parabolic-stop-and-reverse`            | `indicator`   |
| `rate-of-change`                        | [Rate of change](./technical-indicator.md#variant-rate-of-change)                                               | `rateOfChange()`                       | `rate-of-change`                        | `indicator`   |
| `relative-strength-index`               | [Relative strength index](./technical-indicator.md#variant-relative-strength-index)                             | `relativeStrengthIndex()`              | `relative-strength-index`               | `indicator`   |
| `slow-stochastic`                       | [Slow stochastic oscillator](./technical-indicator.md#variant-slow-stochastic)                                  | `slowStochastic()`                     | `slow-stochastic`                       | `indicator`   |
| `simple-moving-average`                 | [Simple moving average](./technical-indicator.md#variant-simple-moving-average)                                 | `simpleMovingAverage()`                | `simple-moving-average`                 | `indicator`   |
| `stochastic`                            | [Stochastic oscillator](./technical-indicator.md#variant-stochastic)                                            | `stochastic()`                         | `stochastic`                            | `indicator`   |
| `supertrend`                            | [Supertrend](./technical-indicator.md#variant-supertrend)                                                       | `supertrend()`                         | `supertrend`                            | `indicator`   |
| `triple-exponential-average`            | [Triple exponential moving average](./technical-indicator.md#variant-triple-exponential-average)                | `tripleExponentialMovingAverage()`     | `triple-exponential-average`            | `indicator`   |
| `triple-exponential-oscillator`         | [Triple exponential average oscillator](./technical-indicator.md#variant-triple-exponential-oscillator)         | `tripleExponentialAverageOscillator()` | `triple-exponential-oscillator`         | `indicator`   |
| `volume-weighted-average-price`         | [Volume weighted average price](./technical-indicator.md#variant-volume-weighted-average-price)                 | `volumeWeightedAveragePrice()`         | `volume-weighted-average-price`         | `indicator`   |
| `williams-range`                        | [Williams range](./technical-indicator.md#variant-williams-range)                                               | `williamsRange()`                      | `williams-range`                        | `indicator`   |
| `weighted-moving-average`               | [Weighted moving average](./technical-indicator.md#variant-weighted-moving-average)                             | `weightedMovingAverage()`              | `weighted-moving-average`               | `indicator`   |
| `zigzag`                                | [Zigzag indicator](./technical-indicator.md#variant-zigzag)                                                     | `zigzag()`                             | `zigzag`                                | `indicator`   |

[Back to chart guides](./README.md)
