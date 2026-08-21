# Theme river charts

[Back to the chart guide index](./README.md)

![Current Graflume theme river charts output](../assets/charts/theme-river.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a theme river chart to compare how several non-negative series expand and contract over time.

## Data contract

`x` is temporal or ordered, `y` is a non-negative magnitude, and `mark.fields.series` or `category` identifies the stream.

### Named fields

`series` is preferred; `category` is accepted as a compatibility alias.

### Portable options

Standard fill, stroke, opacity, and line width options apply to each stream.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { themeRiver } from 'graflume/complete';

themeRiver('#chart', data, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { series: 'channel' } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'theme-river'`.

## Rendering behavior

Rows are grouped by x and series, totals are centered around zero at each x position, and each series becomes a closed renderer-neutral stream polygon.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Each stream carries a representative source row. Add a time-by-series table and describe major changes because stacked thickness is difficult to compare precisely.

## Performance

Scene size grows with series × time positions. Pre-aggregate long time series and limit series count to preserve readability.

## Current limitations

Smooth spline interpolation, negative values, missing-series interpolation, ordering optimization, label placement, and built-in legends remain planned.
