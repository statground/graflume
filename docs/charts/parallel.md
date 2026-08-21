# Parallel coordinates

[Back to the chart guide index](./README.md)

![Current Graflume parallel coordinates output](../assets/charts/parallel.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use parallel coordinates to inspect multivariate profiles across several quantitative dimensions.

## Data contract

`mark.options.dimensions` is an array of two or more numeric field names. `x` normally identifies the row or series, while `y` may repeat the first numeric dimension.

### Named fields

`mark.fields.color` or `group` may provide a categorical palette key. Dimensions are declared in `mark.options.dimensions` because their count is dynamic.

### Portable options

`dimensions` controls axis order. Each dimension receives an independent finite min/max domain derived from its column.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { parallel } from 'graflume/complete';

parallel('#chart', products, {
  x: { field: 'product', type: 'nominal' },
  y: { field: 'speed', type: 'quantitative' },
  mark: { options: { dimensions: ['speed', 'quality', 'cost', 'reach'] } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'parallel'`.

## Rendering behavior

The compiler draws one vertical axis per dimension with min/max labels, then maps every valid row to an interactive polyline crossing those axes.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Each polyline carries a source row. Provide a data table and a description of the strongest trade-offs; exact values are hard to recover visually.

## Performance

Polyline count equals row count. Large data should use sampling, opacity reduction, density aggregation, or a future GPU renderer.

## Current limitations

Axis brushing, reordering, inversion, categorical dimensions, bundled polylines, density mode, and built-in legends are not implemented yet.
