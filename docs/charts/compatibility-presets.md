# Compatibility preset index

Graflume exposes 37 representative chart families while preserving all historical names. This index maps the 139 family presets to the one manual that documents their data contract, functional differences, and current compiled output.

Use `resolveSeriesType(identifier)` from `graflume/complete` when an integration receives names with mixed case, spaces, hyphens, or underscores. The returned `familyId` selects the representative manual and `variantId` preserves the requested preset.

The two function-free adapter names are documented separately in [Adapters](./adapters.md).

## [Annotation chart](./annotation.md#integrated-presets)

| Identifier           | Compatible name    | Quick API             | Mode          | Portable mark |
| -------------------- | ------------------ | --------------------- | ------------- | ------------- |
| `annotation`         | Annotation chart   | `annotation()`        | `default`     | `annotation`  |
| `annotated-timeline` | Annotated timeline | `annotatedTimeline()` | `timeline`    | `annotation`  |
| `event-flags`        | Event flags        | `eventFlags()`        | `event-flags` | `flags`       |

## [Area chart](./area.md#integrated-presets)

| Identifier     | Compatible name    | Quick API       | Mode          | Portable mark  |
| -------------- | ------------------ | --------------- | ------------- | -------------- |
| `area`         | Area chart         | `area()`        | `default`     | `area`         |
| `stepped-area` | Stepped area chart | `steppedArea()` | `stepped`     | `stepped-area` |
| `theme-river`  | Theme river chart  | `themeRiver()`  | `stream`      | `theme-river`  |
| `area-spline`  | Smooth area chart  | `areaSpline()`  | `area-spline` | `smooth`       |
| `polygon`      | Polygon chart      | `polygon()`     | `polygon`     | `polygon`      |
| `streamgraph`  | Streamgraph        | `streamgraph()` | `streamgraph` | `theme-river`  |

## [Bar chart](./bar.md#integrated-presets)

| Identifier         | Compatible name             | Quick API           | Mode               | Portable mark   |
| ------------------ | --------------------------- | ------------------- | ------------------ | --------------- |
| `bar`              | Bar chart                   | `horizontalBar()`   | `horizontal`       | `bar`           |
| `column`           | Column chart                | `column()`          | `vertical`         | `bar`           |
| `pictorial-bar`    | Pictorial bar chart         | `pictorialBar()`    | `pictorial`        | `pictorial-bar` |
| `bullet`           | Bullet chart                | `bullet()`          | `bullet`           | `bullet`        |
| `column-pyramid`   | Column pyramid chart        | `columnPyramid()`   | `column-pyramid`   | `pyramid`       |
| `cylinder`         | Cylinder chart              | `cylinder()`        | `cylinder`         | `cylinder`      |
| `lollipop`         | Lollipop chart              | `lollipop()`        | `lollipop`         | `lollipop`      |
| `pictorial-column` | Pictorial column chart      | `pictorialColumn()` | `pictorial-column` | `pictorial-bar` |
| `variable-width`   | Variable width column chart | `variableWidth()`   | `variable-width`   | `variwide`      |

## [Bubble chart](./bubble.md#integrated-presets)

| Identifier      | Compatible name     | Quick API        | Mode            | Portable mark   |
| --------------- | ------------------- | ---------------- | --------------- | --------------- |
| `bubble`        | Bubble chart        | `bubble()`       | `default`       | `bubble`        |
| `packed-bubble` | Packed bubble chart | `packedBubble()` | `packed-bubble` | `packed-bubble` |

## [Calendar chart](./calendar.md#integrated-presets)

| Identifier | Compatible name | Quick API    | Mode      | Portable mark |
| ---------- | --------------- | ------------ | --------- | ------------- |
| `calendar` | Calendar chart  | `calendar()` | `default` | `calendar`    |

## [Candlestick chart](./candlestick.md#integrated-presets)

| Identifier            | Compatible name           | Quick API             | Mode                  | Portable mark |
| --------------------- | ------------------------- | --------------------- | --------------------- | ------------- |
| `candlestick`         | Candlestick chart         | `candlestick()`       | `default`             | `candlestick` |
| `heikin-ashi`         | Heikin-Ashi chart         | `heikinAshi()`        | `heikin-ashi`         | `financial`   |
| `high-low-close`      | High-low-close chart      | `highLowClose()`      | `high-low-close`      | `financial`   |
| `hollow-candlestick`  | Hollow candlestick chart  | `hollowCandlestick()` | `hollow-candlestick`  | `financial`   |
| `open-high-low-close` | Open-high-low-close chart | `openHighLowClose()`  | `open-high-low-close` | `financial`   |

## [Combination chart](./combination.md#integrated-presets)

| Identifier | Compatible name | Quick API  | Mode      | Portable mark |
| ---------- | --------------- | ---------- | --------- | ------------- |
| `combo`    | Combo chart     | `combo()`  | `default` | `multiple`    |
| `pareto`   | Pareto chart    | `pareto()` | `pareto`  | `pareto`      |

## [Difference chart](./difference.md#integrated-presets)

| Identifier | Compatible name | Quick API | Mode      | Portable mark |
| ---------- | --------------- | --------- | --------- | ------------- |
| `diff`     | Diff chart      | `diff()`  | `default` | `diff`        |

## [Pie chart](./pie.md#integrated-presets)

| Identifier     | Compatible name           | Quick API       | Mode           | Portable mark  |
| -------------- | ------------------------- | --------------- | -------------- | -------------- |
| `donut`        | Donut chart               | `donut()`       | `donut`        | `pie`          |
| `pie`          | Pie chart                 | `pie()`         | `default`      | `pie`          |
| `variable-pie` | Variable radius pie chart | `variablePie()` | `variable-pie` | `variable-pie` |

## [Timeline and range chart](./timeline.md#integrated-presets)

| Identifier | Compatible name        | Quick API    | Mode      | Portable mark |
| ---------- | ---------------------- | ------------ | --------- | ------------- |
| `gantt`    | Gantt chart            | `gantt()`    | `gantt`   | `gantt`       |
| `timeline` | Timeline               | `timeline()` | `default` | `timeline`    |
| `x-range`  | Horizontal range chart | `xRange()`   | `x-range` | `timeline`    |

## [Gauge chart](./gauge.md#integrated-presets)

| Identifier    | Compatible name | Quick API      | Mode          | Portable mark |
| ------------- | --------------- | -------------- | ------------- | ------------- |
| `gauge`       | Gauge chart     | `gauge()`      | `default`     | `gauge`       |
| `solid-gauge` | Solid gauge     | `solidGauge()` | `solid-gauge` | `solid-gauge` |

## [Map chart](./map.md#integrated-presets)

| Identifier    | Compatible name         | Quick API      | Mode          | Portable mark |
| ------------- | ----------------------- | -------------- | ------------- | ------------- |
| `geo`         | Geographic region chart | `geo()`        | `region`      | `geo`         |
| `map`         | Map                     | `map()`        | `default`     | `map`         |
| `flow-map`    | Flow map                | `flowMap()`    | `flow-map`    | `geo-flow`    |
| `geo-heatmap` | Geographic heatmap      | `geoHeatmap()` | `geo-heatmap` | `geo-heatmap` |
| `map-bubble`  | Map bubble chart        | `mapBubble()`  | `map-bubble`  | `map`         |
| `map-line`    | Map line chart          | `mapLine()`    | `map-line`    | `geo-line`    |
| `map-point`   | Map point chart         | `mapPoint()`   | `map-point`   | `map`         |
| `tiled-map`   | Tiled map               | `tiledMap()`   | `tiled-map`   | `tiled-map`   |

## [Histogram](./histogram.md#integrated-presets)

| Identifier   | Compatible name | Quick API     | Mode         | Portable mark  |
| ------------ | --------------- | ------------- | ------------ | -------------- |
| `histogram`  | Histogram       | `histogram()` | `default`    | `histogram`    |
| `bell-curve` | Bell curve      | `bellCurve()` | `bell-curve` | `distribution` |

## [Interval chart](./interval.md#integrated-presets)

| Identifier          | Compatible name         | Quick API           | Mode                | Portable mark |
| ------------------- | ----------------------- | ------------------- | ------------------- | ------------- |
| `intervals`         | Intervals               | `intervals()`       | `default`           | `interval`    |
| `area-range`        | Area range chart        | `areaRange()`       | `area-range`        | `range`       |
| `area-spline-range` | Smooth area range chart | `areaSplineRange()` | `area-spline-range` | `range`       |
| `column-range`      | Column range chart      | `columnRange()`     | `column-range`      | `range`       |
| `dumbbell`          | Dumbbell chart          | `dumbbell()`        | `dumbbell`          | `range`       |
| `error-bar`         | Error bar chart         | `errorBar()`        | `error-bar`         | `interval`    |

## [Line chart](./line.md#integrated-presets)

| Identifier  | Compatible name | Quick API     | Mode      | Portable mark |
| ----------- | --------------- | ------------- | --------- | ------------- |
| `line`      | Line chart      | `line()`      | `default` | `line`        |
| `trendline` | Trendline       | `trendline()` | `trend`   | `trendline`   |
| `spline`    | Spline chart    | `spline()`    | `spline`  | `smooth`      |

## [Motion chart](./motion.md#integrated-presets)

| Identifier | Compatible name | Quick API  | Mode      | Portable mark |
| ---------- | --------------- | ---------- | --------- | ------------- |
| `motion`   | Motion chart    | `motion()` | `default` | `motion`      |

## [Hierarchy chart](./hierarchy.md#integrated-presets)

| Identifier             | Compatible name      | Quick API               | Mode                   | Portable mark |
| ---------------------- | -------------------- | ----------------------- | ---------------------- | ------------- |
| `org`                  | Organization chart   | `org()`                 | `organization`         | `org`         |
| `treemap`              | Tree map             | `treemap()`             | `treemap`              | `treemap`     |
| `tree`                 | Tree chart           | `tree()`                | `tree`                 | `tree`        |
| `sunburst`             | Sunburst chart       | `sunburst()`            | `sunburst`             | `sunburst`    |
| `organization-network` | Organization network | `organizationNetwork()` | `organization-network` | `org`         |
| `tree-graph`           | Tree graph           | `treeGraph()`           | `tree-graph`           | `tree`        |

## [Flow diagram](./flow.md#integrated-presets)

| Identifier | Compatible name | Quick API  | Mode      | Portable mark |
| ---------- | --------------- | ---------- | --------- | ------------- |
| `sankey`   | Sankey diagram  | `sankey()` | `default` | `sankey`      |

## [Scatter chart](./scatter.md#integrated-presets)

| Identifier       | Compatible name          | Quick API         | Mode         | Portable mark    |
| ---------------- | ------------------------ | ----------------- | ------------ | ---------------- |
| `scatter`        | Scatter chart            | `scatter()`       | `default`    | `point`          |
| `effect-scatter` | Effect scatter chart     | `effectScatter()` | `emphasis`   | `effect-scatter` |
| `scatter-3d`     | Three-axis scatter chart | `scatter3d()`     | `scatter-3d` | `scatter-3d`     |

## [Table chart](./table.md#integrated-presets)

| Identifier | Compatible name | Quick API | Mode      | Portable mark |
| ---------- | --------------- | --------- | --------- | ------------- |
| `table`    | Table chart     | `table()` | `default` | `table`       |

## [Waterfall chart](./waterfall.md#integrated-presets)

| Identifier  | Compatible name | Quick API     | Mode      | Portable mark |
| ----------- | --------------- | ------------- | --------- | ------------- |
| `waterfall` | Waterfall chart | `waterfall()` | `default` | `waterfall`   |

## [Word tree](./word-tree.md#integrated-presets)

| Identifier  | Compatible name | Quick API    | Mode      | Portable mark |
| ----------- | --------------- | ------------ | --------- | ------------- |
| `word-tree` | Word tree       | `wordTree()` | `default` | `word-tree`   |

## [Radar chart](./radar.md#integrated-presets)

| Identifier | Compatible name | Quick API | Mode      | Portable mark |
| ---------- | --------------- | --------- | --------- | ------------- |
| `radar`    | Radar chart     | `radar()` | `default` | `radar`       |

## [Network chart](./network.md#integrated-presets)

| Identifier      | Compatible name  | Quick API        | Mode            | Portable mark |
| --------------- | ---------------- | ---------------- | --------------- | ------------- |
| `graph`         | Graph chart      | `graph()`        | `node-link`     | `graph`       |
| `lines`         | Connection lines | `lines()`        | `connections`   | `lines`       |
| `arc-diagram`   | Arc diagram      | `arcDiagram()`   | `arc-diagram`   | `arc-diagram` |
| `network-graph` | Network graph    | `networkGraph()` | `network-graph` | `graph`       |

## [Chord diagram](./chord.md#integrated-presets)

| Identifier         | Compatible name  | Quick API           | Mode               | Portable mark |
| ------------------ | ---------------- | ------------------- | ------------------ | ------------- |
| `chord`            | Chord diagram    | `chord()`           | `default`          | `chord`       |
| `dependency-wheel` | Dependency wheel | `dependencyWheel()` | `dependency-wheel` | `chord`       |

## [Funnel chart](./funnel.md#integrated-presets)

| Identifier   | Compatible name     | Quick API     | Mode         | Portable mark |
| ------------ | ------------------- | ------------- | ------------ | ------------- |
| `funnel`     | Funnel chart        | `funnel()`    | `default`    | `funnel`      |
| `funnel-3d`  | Depth funnel chart  | `funnel3d()`  | `funnel-3d`  | `pyramid`     |
| `pyramid`    | Pyramid chart       | `pyramid()`   | `pyramid`    | `pyramid`     |
| `pyramid-3d` | Depth pyramid chart | `pyramid3d()` | `pyramid-3d` | `pyramid`     |

## [Parallel coordinates](./parallel.md#integrated-presets)

| Identifier | Compatible name      | Quick API    | Mode      | Portable mark |
| ---------- | -------------------- | ------------ | --------- | ------------- |
| `parallel` | Parallel coordinates | `parallel()` | `default` | `parallel`    |

## [Boxplot](./boxplot.md#integrated-presets)

| Identifier | Compatible name | Quick API   | Mode      | Portable mark |
| ---------- | --------------- | ----------- | --------- | ------------- |
| `boxplot`  | Boxplot         | `boxplot()` | `default` | `boxplot`     |

## [Heatmap](./heatmap.md#integrated-presets)

| Identifier | Compatible name | Quick API   | Mode       | Portable mark |
| ---------- | --------------- | ----------- | ---------- | ------------- |
| `heatmap`  | Heatmap         | `heatmap()` | `default`  | `heatmap`     |
| `tile-map` | Tile map        | `tileMap()` | `tile-map` | `tilemap`     |

## [Contour chart](./contour.md#integrated-presets)

| Identifier | Compatible name | Quick API   | Mode      | Portable mark |
| ---------- | --------------- | ----------- | --------- | ------------- |
| `contour`  | Contour chart   | `contour()` | `default` | `contour`     |

## [Item chart](./item.md#integrated-presets)

| Identifier | Compatible name | Quick API     | Mode      | Portable mark |
| ---------- | --------------- | ------------- | --------- | ------------- |
| `item`     | Item chart      | `itemChart()` | `default` | `item`        |

## [Vector field chart](./vector-field.md#integrated-presets)

| Identifier  | Compatible name    | Quick API    | Mode        | Portable mark |
| ----------- | ------------------ | ------------ | ----------- | ------------- |
| `vector`    | Vector field chart | `vector()`   | `vector`    | `vector`      |
| `wind-barb` | Wind barb chart    | `windBarb()` | `wind-barb` | `wind-barb`   |

## [Venn diagram](./venn.md#integrated-presets)

| Identifier | Compatible name | Quick API | Mode      | Portable mark |
| ---------- | --------------- | --------- | --------- | ------------- |
| `venn`     | Venn diagram    | `venn()`  | `default` | `venn`        |

## [Word cloud](./word-cloud.md#integrated-presets)

| Identifier   | Compatible name | Quick API     | Mode      | Portable mark |
| ------------ | --------------- | ------------- | --------- | ------------- |
| `word-cloud` | Word cloud      | `wordCloud()` | `default` | `word-cloud`  |

## [Price blocks chart](./price-blocks.md#integrated-presets)

| Identifier         | Compatible name        | Quick API          | Mode               | Portable mark  |
| ------------------ | ---------------------- | ------------------ | ------------------ | -------------- |
| `point-and-figure` | Point and figure chart | `pointAndFigure()` | `point-and-figure` | `point-figure` |
| `renko`            | Renko chart            | `renko()`          | `renko`            | `renko`        |

## [Volume profile chart](./volume-profile.md#integrated-presets)

| Identifier        | Compatible name | Quick API         | Mode              | Portable mark    |
| ----------------- | --------------- | ----------------- | ----------------- | ---------------- |
| `volume-by-price` | Volume by price | `volumeByPrice()` | `volume-by-price` | `volume-profile` |

## [Technical indicator chart](./technical-indicator.md#integrated-presets)

| Identifier                              | Compatible name                       | Quick API                              | Mode                                    | Portable mark |
| --------------------------------------- | ------------------------------------- | -------------------------------------- | --------------------------------------- | ------------- |
| `acceleration-bands`                    | Acceleration bands                    | `accelerationBands()`                  | `acceleration-bands`                    | `indicator`   |
| `awesome-oscillator`                    | Awesome oscillator                    | `awesomeOscillator()`                  | `awesome-oscillator`                    | `indicator`   |
| `absolute-price-oscillator`             | Absolute price oscillator             | `absolutePriceOscillator()`            | `absolute-price-oscillator`             | `indicator`   |
| `aroon`                                 | Aroon indicator                       | `aroon()`                              | `aroon`                                 | `indicator`   |
| `aroon-oscillator`                      | Aroon oscillator                      | `aroonOscillator()`                    | `aroon-oscillator`                      | `indicator`   |
| `average-true-range`                    | Average true range                    | `averageTrueRange()`                   | `average-true-range`                    | `indicator`   |
| `volatility-bands`                      | Volatility bands                      | `volatilityBands()`                    | `volatility-bands`                      | `indicator`   |
| `commodity-channel-index`               | Commodity channel index               | `commodityChannelIndex()`              | `commodity-channel-index`               | `indicator`   |
| `chaikin-oscillator`                    | Chaikin oscillator                    | `chaikinOscillator()`                  | `chaikin-oscillator`                    | `indicator`   |
| `chaikin-money-flow`                    | Chaikin money flow                    | `chaikinMoneyFlow()`                   | `chaikin-money-flow`                    | `indicator`   |
| `chande-momentum-oscillator`            | Chande momentum oscillator            | `chandeMomentumOscillator()`           | `chande-momentum-oscillator`            | `indicator`   |
| `double-exponential-average`            | Double exponential moving average     | `doubleExponentialMovingAverage()`     | `double-exponential-average`            | `indicator`   |
| `disparity-index`                       | Disparity index                       | `disparityIndex()`                     | `disparity-index`                       | `indicator`   |
| `directional-movement-index`            | Directional movement index            | `directionalMovementIndex()`           | `directional-movement-index`            | `indicator`   |
| `detrended-price-oscillator`            | Detrended price oscillator            | `detrendedPriceOscillator()`           | `detrended-price-oscillator`            | `indicator`   |
| `exponential-moving-average`            | Exponential moving average            | `exponentialMovingAverage()`           | `exponential-moving-average`            | `indicator`   |
| `ichimoku-cloud`                        | Ichimoku cloud                        | `ichimokuCloud()`                      | `ichimoku-cloud`                        | `indicator`   |
| `keltner-channels`                      | Keltner channels                      | `keltnerChannels()`                    | `keltner-channels`                      | `indicator`   |
| `klinger-oscillator`                    | Klinger oscillator                    | `klingerOscillator()`                  | `klinger-oscillator`                    | `indicator`   |
| `linear-regression`                     | Linear regression                     | `linearRegression()`                   | `linear-regression`                     | `indicator`   |
| `linear-regression-angle`               | Linear regression angle               | `linearRegressionAngle()`              | `linear-regression-angle`               | `indicator`   |
| `linear-regression-intercept`           | Linear regression intercept           | `linearRegressionIntercept()`          | `linear-regression-intercept`           | `indicator`   |
| `linear-regression-slope`               | Linear regression slope               | `linearRegressionSlope()`              | `linear-regression-slope`               | `indicator`   |
| `moving-average-convergence-divergence` | Moving average convergence divergence | `movingAverageConvergenceDivergence()` | `moving-average-convergence-divergence` | `indicator`   |
| `money-flow-index`                      | Money flow index                      | `moneyFlowIndex()`                     | `money-flow-index`                      | `indicator`   |
| `momentum`                              | Momentum indicator                    | `momentumIndicator()`                  | `momentum`                              | `indicator`   |
| `normalized-average-true-range`         | Normalized average true range         | `normalizedAverageTrueRange()`         | `normalized-average-true-range`         | `indicator`   |
| `on-balance-volume`                     | On-balance volume                     | `onBalanceVolume()`                    | `on-balance-volume`                     | `indicator`   |
| `price-channel`                         | Price channel                         | `priceChannel()`                       | `price-channel`                         | `indicator`   |
| `pivot-points`                          | Pivot points                          | `pivotPoints()`                        | `pivot-points`                          | `indicator`   |
| `percentage-price-oscillator`           | Percentage price oscillator           | `percentagePriceOscillator()`          | `percentage-price-oscillator`           | `indicator`   |
| `price-envelopes`                       | Price envelopes                       | `priceEnvelopes()`                     | `price-envelopes`                       | `indicator`   |
| `parabolic-stop-and-reverse`            | Parabolic stop and reverse            | `parabolicStopAndReverse()`            | `parabolic-stop-and-reverse`            | `indicator`   |
| `rate-of-change`                        | Rate of change                        | `rateOfChange()`                       | `rate-of-change`                        | `indicator`   |
| `relative-strength-index`               | Relative strength index               | `relativeStrengthIndex()`              | `relative-strength-index`               | `indicator`   |
| `slow-stochastic`                       | Slow stochastic oscillator            | `slowStochastic()`                     | `slow-stochastic`                       | `indicator`   |
| `simple-moving-average`                 | Simple moving average                 | `simpleMovingAverage()`                | `simple-moving-average`                 | `indicator`   |
| `stochastic`                            | Stochastic oscillator                 | `stochastic()`                         | `stochastic`                            | `indicator`   |
| `supertrend`                            | Supertrend                            | `supertrend()`                         | `supertrend`                            | `indicator`   |
| `triple-exponential-average`            | Triple exponential moving average     | `tripleExponentialMovingAverage()`     | `triple-exponential-average`            | `indicator`   |
| `triple-exponential-oscillator`         | Triple exponential average oscillator | `tripleExponentialAverageOscillator()` | `triple-exponential-oscillator`         | `indicator`   |
| `volume-weighted-average-price`         | Volume weighted average price         | `volumeWeightedAveragePrice()`         | `volume-weighted-average-price`         | `indicator`   |
| `williams-range`                        | Williams range                        | `williamsRange()`                      | `williams-range`                        | `indicator`   |
| `weighted-moving-average`               | Weighted moving average               | `weightedMovingAverage()`              | `weighted-moving-average`               | `indicator`   |
| `zigzag`                                | Zigzag indicator                      | `zigzag()`                             | `zigzag`                                | `indicator`   |

[Back to chart guides](./README.md)
