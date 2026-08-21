# Radar charts

[Back to the chart guide index](./README.md)

![Current Graflume radar charts output](../assets/charts/radar.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a radar chart to compare several normalized indicators across a small number of series.

## Data contract

`x` names the indicator, `y` supplies its numeric value, and `mark.fields.series` identifies the series. At least three distinct indicators are required.

### Named fields

`series` groups rows into polygons. The primary `x` and `y` encodings supply indicator and value.

### Portable options

`max` fixes the radial maximum and `rings` controls 1–8 reference polygons. Without `max`, the compiler derives a positive maximum from the data.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { radar } from 'graflume/complete';

radar('#chart', data, {
  x: { field: 'indicator', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { series: 'series' }, options: { max: 100, rings: 5 } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'radar'`.

## Rendering behavior

The compiler creates renderer-neutral polygon grids, radial axes, labels, translucent series areas, outlines, and interactive data points. Each series follows the first-seen indicator order.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Each visible point carries its original row for hover and click hit testing. Provide an accessibility label and a textual table fallback when exact multi-axis comparison matters.

## Performance

Scene size grows with indicators × series. Keep the number of axes and polygons modest; dense radar overlays become difficult to read before rendering cost becomes the main constraint.

## Current limitations

Axis-specific maxima, negative radial domains, built-in legends, polygon-label collision solving, and drag editing are not implemented yet.
