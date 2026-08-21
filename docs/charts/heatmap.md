# Heatmaps

[Back to the chart guide index](./README.md)

![Current Graflume heatmaps output](../assets/charts/heatmap.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a heatmap to show intensity across two categorical dimensions.

## Data contract

`x` and `y` identify categorical cells. `mark.fields.value` or the primary `y` field supplies the numeric intensity; using a distinct value field is recommended.

### Named fields

`value` defaults to a field named `value`. The first-seen x and y categories determine cell order.

### Portable options

`labels: false` hides in-cell values. Sequential colors are interpolated from the active theme and text contrast is chosen automatically.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { heatmap } from 'graflume/complete';

heatmap('#chart', cells, {
  x: { field: 'day', type: 'ordinal' },
  y: { field: 'period', type: 'ordinal' },
  mark: { fields: { value: 'activity' }, options: { labels: true } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'heatmap'`.

## Rendering behavior

The compiler creates a band cell for each valid row, normalizes values across the observed extent, and emits interactive rounded rectangles with optional labels.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Each cell retains its source row and has contrast-aware text when large enough. Provide a table fallback and describe the scale direction and strongest cells.

## Performance

Scene cost is linear in populated cells. Very dense matrices should use tiled aggregation and a WebGL renderer package.

## Current limitations

Missing-cell patterns, continuous axes, clustered ordering, dendrograms, color legends, and tile-level LOD are not implemented yet.
