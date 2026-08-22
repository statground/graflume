# Technical indicator chart

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `technical-indicator` family. Its canonical Quick API is `technicalIndicator()` from `graflume/complete`, and its representative portable mark is `indicator`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                       | Quick API                              | Mode                                    | Portable mark | Functional difference                                                                                                         |
| ------------------------------------- | -------------------------------------- | --------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Acceleration bands                    | `accelerationBands()`                  | `acceleration-bands`                    | `indicator`   | Selects acceleration bands semantics and uses supplied indicator columns in the current release.                              |
| Awesome oscillator                    | `awesomeOscillator()`                  | `awesome-oscillator`                    | `indicator`   | Selects awesome oscillator semantics and uses supplied indicator columns in the current release.                              |
| Absolute price oscillator             | `absolutePriceOscillator()`            | `absolute-price-oscillator`             | `indicator`   | Selects absolute price oscillator semantics and uses supplied indicator columns in the current release.                       |
| Aroon indicator                       | `aroon()`                              | `aroon`                                 | `indicator`   | Selects aroon indicator semantics and uses supplied indicator columns in the current release.                                 |
| Aroon oscillator                      | `aroonOscillator()`                    | `aroon-oscillator`                      | `indicator`   | Selects aroon oscillator semantics and uses supplied indicator columns in the current release.                                |
| Average true range                    | `averageTrueRange()`                   | `average-true-range`                    | `indicator`   | Selects average true range semantics and uses supplied indicator columns in the current release.                              |
| Volatility bands                      | `volatilityBands()`                    | `volatility-bands`                      | `indicator`   | Selects volatility bands semantics and uses supplied indicator columns in the current release.                                |
| Commodity channel index               | `commodityChannelIndex()`              | `commodity-channel-index`               | `indicator`   | Selects commodity channel index semantics and uses supplied indicator columns in the current release.                         |
| Chaikin oscillator                    | `chaikinOscillator()`                  | `chaikin-oscillator`                    | `indicator`   | Selects chaikin oscillator semantics and uses supplied indicator columns in the current release.                              |
| Chaikin money flow                    | `chaikinMoneyFlow()`                   | `chaikin-money-flow`                    | `indicator`   | Selects chaikin money flow semantics and uses supplied indicator columns in the current release.                              |
| Chande momentum oscillator            | `chandeMomentumOscillator()`           | `chande-momentum-oscillator`            | `indicator`   | Selects chande momentum oscillator semantics and uses supplied indicator columns in the current release.                      |
| Double exponential moving average     | `doubleExponentialMovingAverage()`     | `double-exponential-average`            | `indicator`   | Selects double exponential moving average semantics and supports supplied values and the current `calculate: true` transform. |
| Disparity index                       | `disparityIndex()`                     | `disparity-index`                       | `indicator`   | Selects disparity index semantics and uses supplied indicator columns in the current release.                                 |
| Directional movement index            | `directionalMovementIndex()`           | `directional-movement-index`            | `indicator`   | Selects directional movement index semantics and uses supplied indicator columns in the current release.                      |
| Detrended price oscillator            | `detrendedPriceOscillator()`           | `detrended-price-oscillator`            | `indicator`   | Selects detrended price oscillator semantics and uses supplied indicator columns in the current release.                      |
| Exponential moving average            | `exponentialMovingAverage()`           | `exponential-moving-average`            | `indicator`   | Selects exponential moving average semantics and supports supplied values and the current `calculate: true` transform.        |
| Ichimoku cloud                        | `ichimokuCloud()`                      | `ichimoku-cloud`                        | `indicator`   | Selects ichimoku cloud semantics and uses supplied indicator columns in the current release.                                  |
| Keltner channels                      | `keltnerChannels()`                    | `keltner-channels`                      | `indicator`   | Selects keltner channels semantics and uses supplied indicator columns in the current release.                                |
| Klinger oscillator                    | `klingerOscillator()`                  | `klinger-oscillator`                    | `indicator`   | Selects klinger oscillator semantics and uses supplied indicator columns in the current release.                              |
| Linear regression                     | `linearRegression()`                   | `linear-regression`                     | `indicator`   | Selects linear regression semantics and uses supplied indicator columns in the current release.                               |
| Linear regression angle               | `linearRegressionAngle()`              | `linear-regression-angle`               | `indicator`   | Selects linear regression angle semantics and uses supplied indicator columns in the current release.                         |
| Linear regression intercept           | `linearRegressionIntercept()`          | `linear-regression-intercept`           | `indicator`   | Selects linear regression intercept semantics and uses supplied indicator columns in the current release.                     |
| Linear regression slope               | `linearRegressionSlope()`              | `linear-regression-slope`               | `indicator`   | Selects linear regression slope semantics and uses supplied indicator columns in the current release.                         |
| Moving average convergence divergence | `movingAverageConvergenceDivergence()` | `moving-average-convergence-divergence` | `indicator`   | Selects moving average convergence divergence semantics and uses supplied indicator columns in the current release.           |
| Money flow index                      | `moneyFlowIndex()`                     | `money-flow-index`                      | `indicator`   | Selects money flow index semantics and uses supplied indicator columns in the current release.                                |
| Momentum indicator                    | `momentumIndicator()`                  | `momentum`                              | `indicator`   | Selects momentum indicator semantics and supports supplied values and the current `calculate: true` transform.                |
| Normalized average true range         | `normalizedAverageTrueRange()`         | `normalized-average-true-range`         | `indicator`   | Selects normalized average true range semantics and uses supplied indicator columns in the current release.                   |
| On-balance volume                     | `onBalanceVolume()`                    | `on-balance-volume`                     | `indicator`   | Selects on-balance volume semantics and uses supplied indicator columns in the current release.                               |
| Price channel                         | `priceChannel()`                       | `price-channel`                         | `indicator`   | Selects price channel semantics and uses supplied indicator columns in the current release.                                   |
| Pivot points                          | `pivotPoints()`                        | `pivot-points`                          | `indicator`   | Selects pivot points semantics and uses supplied indicator columns in the current release.                                    |
| Percentage price oscillator           | `percentagePriceOscillator()`          | `percentage-price-oscillator`           | `indicator`   | Selects percentage price oscillator semantics and uses supplied indicator columns in the current release.                     |
| Price envelopes                       | `priceEnvelopes()`                     | `price-envelopes`                       | `indicator`   | Selects price envelopes semantics and uses supplied indicator columns in the current release.                                 |
| Parabolic stop and reverse            | `parabolicStopAndReverse()`            | `parabolic-stop-and-reverse`            | `indicator`   | Selects parabolic stop and reverse semantics and uses supplied indicator columns in the current release.                      |
| Rate of change                        | `rateOfChange()`                       | `rate-of-change`                        | `indicator`   | Selects rate of change semantics and supports supplied values and the current `calculate: true` transform.                    |
| Relative strength index               | `relativeStrengthIndex()`              | `relative-strength-index`               | `indicator`   | Selects relative strength index semantics and supports supplied values and the current `calculate: true` transform.           |
| Slow stochastic oscillator            | `slowStochastic()`                     | `slow-stochastic`                       | `indicator`   | Selects slow stochastic oscillator semantics and uses supplied indicator columns in the current release.                      |
| Simple moving average                 | `simpleMovingAverage()`                | `simple-moving-average`                 | `indicator`   | Selects simple moving average semantics and supports supplied values and the current `calculate: true` transform.             |
| Stochastic oscillator                 | `stochastic()`                         | `stochastic`                            | `indicator`   | Selects stochastic oscillator semantics and uses supplied indicator columns in the current release.                           |
| Supertrend                            | `supertrend()`                         | `supertrend`                            | `indicator`   | Selects supertrend semantics and uses supplied indicator columns in the current release.                                      |
| Triple exponential moving average     | `tripleExponentialMovingAverage()`     | `triple-exponential-average`            | `indicator`   | Selects triple exponential moving average semantics and supports supplied values and the current `calculate: true` transform. |
| Triple exponential average oscillator | `tripleExponentialAverageOscillator()` | `triple-exponential-oscillator`         | `indicator`   | Selects triple exponential average oscillator semantics and uses supplied indicator columns in the current release.           |
| Volume weighted average price         | `volumeWeightedAveragePrice()`         | `volume-weighted-average-price`         | `indicator`   | Selects volume weighted average price semantics and uses supplied indicator columns in the current release.                   |
| Williams range                        | `williamsRange()`                      | `williams-range`                        | `indicator`   | Selects williams range semantics and uses supplied indicator columns in the current release.                                  |
| Weighted moving average               | `weightedMovingAverage()`              | `weighted-moving-average`               | `indicator`   | Selects weighted moving average semantics and supports supplied values and the current `calculate: true` transform.           |
| Zigzag indicator                      | `zigzag()`                             | `zigzag`                                | `indicator`   | Selects zigzag indicator semantics and uses supplied indicator columns in the current release.                                |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 45 compiled preset snapshots</summary>

| Preset                                | Current compiled output                                                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acceleration bands                    | [![Current Acceleration bands output](../assets/charts/acceleration-bands.svg)](../assets/charts/acceleration-bands.svg)                                                          |
| Awesome oscillator                    | [![Current Awesome oscillator output](../assets/charts/awesome-oscillator.svg)](../assets/charts/awesome-oscillator.svg)                                                          |
| Absolute price oscillator             | [![Current Absolute price oscillator output](../assets/charts/absolute-price-oscillator.svg)](../assets/charts/absolute-price-oscillator.svg)                                     |
| Aroon indicator                       | [![Current Aroon indicator output](../assets/charts/aroon.svg)](../assets/charts/aroon.svg)                                                                                       |
| Aroon oscillator                      | [![Current Aroon oscillator output](../assets/charts/aroon-oscillator.svg)](../assets/charts/aroon-oscillator.svg)                                                                |
| Average true range                    | [![Current Average true range output](../assets/charts/average-true-range.svg)](../assets/charts/average-true-range.svg)                                                          |
| Volatility bands                      | [![Current Volatility bands output](../assets/charts/volatility-bands.svg)](../assets/charts/volatility-bands.svg)                                                                |
| Commodity channel index               | [![Current Commodity channel index output](../assets/charts/commodity-channel-index.svg)](../assets/charts/commodity-channel-index.svg)                                           |
| Chaikin oscillator                    | [![Current Chaikin oscillator output](../assets/charts/chaikin-oscillator.svg)](../assets/charts/chaikin-oscillator.svg)                                                          |
| Chaikin money flow                    | [![Current Chaikin money flow output](../assets/charts/chaikin-money-flow.svg)](../assets/charts/chaikin-money-flow.svg)                                                          |
| Chande momentum oscillator            | [![Current Chande momentum oscillator output](../assets/charts/chande-momentum-oscillator.svg)](../assets/charts/chande-momentum-oscillator.svg)                                  |
| Double exponential moving average     | [![Current Double exponential moving average output](../assets/charts/double-exponential-average.svg)](../assets/charts/double-exponential-average.svg)                           |
| Disparity index                       | [![Current Disparity index output](../assets/charts/disparity-index.svg)](../assets/charts/disparity-index.svg)                                                                   |
| Directional movement index            | [![Current Directional movement index output](../assets/charts/directional-movement-index.svg)](../assets/charts/directional-movement-index.svg)                                  |
| Detrended price oscillator            | [![Current Detrended price oscillator output](../assets/charts/detrended-price-oscillator.svg)](../assets/charts/detrended-price-oscillator.svg)                                  |
| Exponential moving average            | [![Current Exponential moving average output](../assets/charts/exponential-moving-average.svg)](../assets/charts/exponential-moving-average.svg)                                  |
| Ichimoku cloud                        | [![Current Ichimoku cloud output](../assets/charts/ichimoku-cloud.svg)](../assets/charts/ichimoku-cloud.svg)                                                                      |
| Keltner channels                      | [![Current Keltner channels output](../assets/charts/keltner-channels.svg)](../assets/charts/keltner-channels.svg)                                                                |
| Klinger oscillator                    | [![Current Klinger oscillator output](../assets/charts/klinger-oscillator.svg)](../assets/charts/klinger-oscillator.svg)                                                          |
| Linear regression                     | [![Current Linear regression output](../assets/charts/linear-regression.svg)](../assets/charts/linear-regression.svg)                                                             |
| Linear regression angle               | [![Current Linear regression angle output](../assets/charts/linear-regression-angle.svg)](../assets/charts/linear-regression-angle.svg)                                           |
| Linear regression intercept           | [![Current Linear regression intercept output](../assets/charts/linear-regression-intercept.svg)](../assets/charts/linear-regression-intercept.svg)                               |
| Linear regression slope               | [![Current Linear regression slope output](../assets/charts/linear-regression-slope.svg)](../assets/charts/linear-regression-slope.svg)                                           |
| Moving average convergence divergence | [![Current Moving average convergence divergence output](../assets/charts/moving-average-convergence-divergence.svg)](../assets/charts/moving-average-convergence-divergence.svg) |
| Money flow index                      | [![Current Money flow index output](../assets/charts/money-flow-index.svg)](../assets/charts/money-flow-index.svg)                                                                |
| Momentum indicator                    | [![Current Momentum indicator output](../assets/charts/momentum.svg)](../assets/charts/momentum.svg)                                                                              |
| Normalized average true range         | [![Current Normalized average true range output](../assets/charts/normalized-average-true-range.svg)](../assets/charts/normalized-average-true-range.svg)                         |
| On-balance volume                     | [![Current On-balance volume output](../assets/charts/on-balance-volume.svg)](../assets/charts/on-balance-volume.svg)                                                             |
| Price channel                         | [![Current Price channel output](../assets/charts/price-channel.svg)](../assets/charts/price-channel.svg)                                                                         |
| Pivot points                          | [![Current Pivot points output](../assets/charts/pivot-points.svg)](../assets/charts/pivot-points.svg)                                                                            |
| Percentage price oscillator           | [![Current Percentage price oscillator output](../assets/charts/percentage-price-oscillator.svg)](../assets/charts/percentage-price-oscillator.svg)                               |
| Price envelopes                       | [![Current Price envelopes output](../assets/charts/price-envelopes.svg)](../assets/charts/price-envelopes.svg)                                                                   |
| Parabolic stop and reverse            | [![Current Parabolic stop and reverse output](../assets/charts/parabolic-stop-and-reverse.svg)](../assets/charts/parabolic-stop-and-reverse.svg)                                  |
| Rate of change                        | [![Current Rate of change output](../assets/charts/rate-of-change.svg)](../assets/charts/rate-of-change.svg)                                                                      |
| Relative strength index               | [![Current Relative strength index output](../assets/charts/relative-strength-index.svg)](../assets/charts/relative-strength-index.svg)                                           |
| Slow stochastic oscillator            | [![Current Slow stochastic oscillator output](../assets/charts/slow-stochastic.svg)](../assets/charts/slow-stochastic.svg)                                                        |
| Simple moving average                 | [![Current Simple moving average output](../assets/charts/simple-moving-average.svg)](../assets/charts/simple-moving-average.svg)                                                 |
| Stochastic oscillator                 | [![Current Stochastic oscillator output](../assets/charts/stochastic.svg)](../assets/charts/stochastic.svg)                                                                       |
| Supertrend                            | [![Current Supertrend output](../assets/charts/supertrend.svg)](../assets/charts/supertrend.svg)                                                                                  |
| Triple exponential moving average     | [![Current Triple exponential moving average output](../assets/charts/triple-exponential-average.svg)](../assets/charts/triple-exponential-average.svg)                           |
| Triple exponential average oscillator | [![Current Triple exponential average oscillator output](../assets/charts/triple-exponential-oscillator.svg)](../assets/charts/triple-exponential-oscillator.svg)                 |
| Volume weighted average price         | [![Current Volume weighted average price output](../assets/charts/volume-weighted-average-price.svg)](../assets/charts/volume-weighted-average-price.svg)                         |
| Williams range                        | [![Current Williams range output](../assets/charts/williams-range.svg)](../assets/charts/williams-range.svg)                                                                      |
| Weighted moving average               | [![Current Weighted moving average output](../assets/charts/weighted-moving-average.svg)](../assets/charts/weighted-moving-average.svg)                                           |
| Zigzag indicator                      | [![Current Zigzag indicator output](../assets/charts/zigzag.svg)](../assets/charts/zigzag.svg)                                                                                    |

</details>
<!-- FAMILY_PRESETS_END -->
![Current Technical indicator chart output](../assets/charts/technical-indicator.svg)

This page documents the currently implemented **Technical indicator chart** family in Graflume `0.1.0-alpha.0`. The image above is generated from the same compiled Scene used by the Canvas renderer.

## When to use it

Use this indicator chart when the visual relationship represented by **technical indicator chart** is more informative than a plain line, bar, or table. Prefer a simpler chart when the extra geometry does not add analytical meaning.

## Quick API

Import the Quick API from the opt-in complete entrypoint:

```ts
import { technicalIndicator } from 'graflume/complete';

const data = [
  {
    date: '2026-01-01',
    category: 'P1',
    value: 24,
    low: 14,
    high: 33,
    lower: 16,
    upper: 31,
    target: 29,
    width: 3,
    radius: 9,
    z: 5,
    direction: 0,
    magnitude: 5,
    speed: 10,
    signal: 20,
    secondary: 18,
    up: 42,
    down: 66,
    plus: 25,
    minus: 34,
    conversion: 21,
    base: 19,
    support: 14,
    resistance: 34,
    volume: 120,
    price: 24,
    title: 'A',
    open: 22,
    close: 25,
  },
  {
    date: '2026-02-01',
    category: 'P2',
    value: 29.915692703800314,
    low: 14.8,
    high: 34.1,
    lower: 16.8,
    upper: 32,
    target: 30,
    width: 4,
    radius: 11,
    z: 6,
    direction: 37,
    magnitude: 8,
    speed: 13,
    signal: 21.2,
    secondary: 19,
    up: 44,
    down: 64,
    plus: 26,
    minus: 33.4,
    conversion: 22,
    base: 19.9,
    support: 14.8,
    resistance: 35,
    volume: 151,
    price: 25.2,
    title: 'B',
    open: 23,
    close: 22,
  },
  {
    date: '2026-03-01',
    category: 'P3',
    value: 33.5402084373418,
    low: 15.6,
    high: 35.2,
    lower: 17.6,
    upper: 33,
    target: 31,
    width: 5,
    radius: 13,
    z: 7,
    direction: 74,
    magnitude: 11,
    speed: 16,
    signal: 22.4,
    secondary: 20,
    up: 46,
    down: 62,
    plus: 27,
    minus: 32.8,
    conversion: 23,
    base: 20.8,
    support: 15.6,
    resistance: 36,
    volume: 182,
    price: 26.4,
    title: 'C',
    open: 24,
    close: 27,
  },
  {
    date: '2026-04-01',
    category: 'P4',
    value: 33.719684225450784,
    low: 16.4,
    high: 36.3,
    lower: 18.4,
    upper: 34,
    target: 32,
    width: 6,
    radius: 15,
    z: 8,
    direction: 111,
    magnitude: 14,
    speed: 19,
    signal: 23.6,
    secondary: 21,
    up: 48,
    down: 60,
    plus: 28,
    minus: 32.2,
    conversion: 24,
    base: 21.7,
    support: 16.4,
    resistance: 37,
    volume: 213,
    price: 27.6,
    title: 'D',
    open: 25,
    close: 24,
  },
  {
    date: '2026-05-01',
    category: 'P5',
    value: 31.010335447627774,
    low: 17.2,
    high: 37.4,
    lower: 19.2,
    upper: 35,
    target: 33,
    width: 3,
    radius: 17,
    z: 9,
    direction: 148,
    magnitude: 17,
    speed: 22,
    signal: 24.8,
    secondary: 22,
    up: 50,
    down: 58,
    plus: 29,
    minus: 31.6,
    conversion: 25,
    base: 22.6,
    support: 17.2,
    resistance: 38,
    volume: 244,
    price: 28.8,
    title: 'E',
    open: 26,
    close: 29,
  },
];

technicalIndicator('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'date',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  mark: {
    fields: {
      lower: 'lower',
      upper: 'upper',
    },
    options: {
      kind: 'sma',
      fields: ['value', 'signal'],
    },
  },
  title: {
    text: 'Technical indicator chart',
    subtitle: 'indicator · technical-indicator',
  },
  accessibility: {
    label: 'Technical indicator chart example',
    description:
      'A compiled technical indicator chart example using the technical-indicator family.',
  },
});
```

## Portable ChartSpec

```json
{
  "data": [
    {
      "date": "2026-01-01",
      "category": "P1",
      "value": 24,
      "low": 14,
      "high": 33,
      "lower": 16,
      "upper": 31,
      "target": 29,
      "width": 3,
      "radius": 9,
      "z": 5,
      "direction": 0,
      "magnitude": 5,
      "speed": 10,
      "signal": 20,
      "secondary": 18,
      "up": 42,
      "down": 66,
      "plus": 25,
      "minus": 34,
      "conversion": 21,
      "base": 19,
      "support": 14,
      "resistance": 34,
      "volume": 120,
      "price": 24,
      "title": "A",
      "open": 22,
      "close": 25
    },
    {
      "date": "2026-02-01",
      "category": "P2",
      "value": 29.915692703800314,
      "low": 14.8,
      "high": 34.1,
      "lower": 16.8,
      "upper": 32,
      "target": 30,
      "width": 4,
      "radius": 11,
      "z": 6,
      "direction": 37,
      "magnitude": 8,
      "speed": 13,
      "signal": 21.2,
      "secondary": 19,
      "up": 44,
      "down": 64,
      "plus": 26,
      "minus": 33.4,
      "conversion": 22,
      "base": 19.9,
      "support": 14.8,
      "resistance": 35,
      "volume": 151,
      "price": 25.2,
      "title": "B",
      "open": 23,
      "close": 22
    },
    {
      "date": "2026-03-01",
      "category": "P3",
      "value": 33.5402084373418,
      "low": 15.6,
      "high": 35.2,
      "lower": 17.6,
      "upper": 33,
      "target": 31,
      "width": 5,
      "radius": 13,
      "z": 7,
      "direction": 74,
      "magnitude": 11,
      "speed": 16,
      "signal": 22.4,
      "secondary": 20,
      "up": 46,
      "down": 62,
      "plus": 27,
      "minus": 32.8,
      "conversion": 23,
      "base": 20.8,
      "support": 15.6,
      "resistance": 36,
      "volume": 182,
      "price": 26.4,
      "title": "C",
      "open": 24,
      "close": 27
    },
    {
      "date": "2026-04-01",
      "category": "P4",
      "value": 33.719684225450784,
      "low": 16.4,
      "high": 36.3,
      "lower": 18.4,
      "upper": 34,
      "target": 32,
      "width": 6,
      "radius": 15,
      "z": 8,
      "direction": 111,
      "magnitude": 14,
      "speed": 19,
      "signal": 23.6,
      "secondary": 21,
      "up": 48,
      "down": 60,
      "plus": 28,
      "minus": 32.2,
      "conversion": 24,
      "base": 21.7,
      "support": 16.4,
      "resistance": 37,
      "volume": 213,
      "price": 27.6,
      "title": "D",
      "open": 25,
      "close": 24
    },
    {
      "date": "2026-05-01",
      "category": "P5",
      "value": 31.010335447627774,
      "low": 17.2,
      "high": 37.4,
      "lower": 19.2,
      "upper": 35,
      "target": 33,
      "width": 3,
      "radius": 17,
      "z": 9,
      "direction": 148,
      "magnitude": 17,
      "speed": 22,
      "signal": 24.8,
      "secondary": 22,
      "up": 50,
      "down": 58,
      "plus": 29,
      "minus": 31.6,
      "conversion": 25,
      "base": 22.6,
      "support": 17.2,
      "resistance": 38,
      "volume": 244,
      "price": 28.8,
      "title": "E",
      "open": 26,
      "close": 29
    }
  ],
  "mark": {
    "type": "indicator",
    "fields": {
      "lower": "lower",
      "upper": "upper"
    },
    "options": {
      "kind": "sma",
      "fields": ["value", "signal"]
    }
  },
  "x": {
    "field": "date",
    "type": "temporal",
    "title": "date"
  },
  "y": {
    "field": "value",
    "type": "quantitative",
    "title": "value"
  },
  "title": {
    "text": "Technical indicator chart",
    "subtitle": "indicator · technical-indicator"
  },
  "accessibility": {
    "label": "Technical indicator chart example",
    "description": "A compiled technical indicator chart example using the technical-indicator family."
  }
}
```

## Canonical mapping

- User-facing family: `technical-indicator`
- Quick API: `technicalIndicator()`
- Portable mark: `indicator`
- Canonical family: `technical-indicator`
- Category: `indicator`

The family API and every compatible preset enter the same normalize, validate, scale, compiler, Scene, renderer, interaction, and accessibility path. No parallel rendering engine is created.

## Data, ordering, and missing values

The portable chart renders precomputed indicator columns. The primary line uses `y`; optional lower, upper, signal, and secondary fields are declared in `mark.fields` or `mark.options.fields`. Input order is preserved unless the mark explicitly documents a deterministic sort. Missing required values skip only the affected row; invalid specs still fail validation before compilation.

## Implemented rendering behavior

Renders portable precomputed indicator lines, bands, points, and oscillator columns using one canonical compiler. The output uses only groups, paths, lines, rectangles, circles, and text, so Canvas, snapshots, export adapters, and future renderers share the same geometry contract.

## Styling

Common `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` properties override theme defaults when the geometry supports them. Mark-specific function-free values live under `mark.options`. Themes remain responsible for background, text, grid, focus, categorical, sequential, and diverging tokens.

## Interaction and hit testing

Rendered datum shapes keep `layerId`, `rowIndex`, and the source row. Standard mode enables hit testing; large and ultra profiles may disable per-mark hit testing. Decorative grid, shadow, depth, label, and arrowhead nodes do not create duplicate datum targets.

## Accessibility

Provide a concise `accessibility.label` and a description of the main pattern. Canvas output should be paired with the runtime data-table fallback. Do not encode a required distinction only with color, depth, angle, or area.

## Performance

Scene cost is linear in rows for ordinary cases. Relationship crossings, repeated symbols, sampled curves, dense labels, and multi-line indicators can produce more than one node per row. Use `auto`, `large`, or `ultra` with aggregation when row counts grow beyond the analytical value of individual marks.

## Current limitations

Indicator values are precomputed by default. `calculate: true` currently derives SMA, EMA, WMA, DEMA, TEMA, momentum, rate of change, and relative strength; the remaining named indicators deliberately render supplied columns until the transform DAG is introduced.

## Runnable references

- Snapshot generator: [`scripts/render-series-chart-snapshots.mjs`](../../scripts/render-series-chart-snapshots.mjs)
- Catalog test: [`tests/series-chart-types.test.mjs`](../../tests/series-chart-types.test.mjs)
- Complete CDN gallery: [`examples/cdn/series-chart-types.html`](../../examples/cdn/series-chart-types.html)
