# Connection lines

[Back to the chart guide index](./README.md)

![Current Graflume connection lines output](../assets/charts/lines.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use connection lines to draw explicit paths from one quantitative coordinate pair to another.

## Data contract

`x`/`y` define the start point and `mark.fields.x2`/`y2` define the end point. Optional `value` controls visual weight.

### Named fields

`x2` and `y2` default to fields with those names. `value` may provide a numeric weight for line width.

### Portable options

`curvature` ranges from -1 to 1 and bends the sampled path around its midpoint. Standard stroke, opacity, and line width options apply.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { lines } from 'graflume/complete';

lines('#chart', routes, {
  x: { field: 'x1', type: 'quantitative' },
  y: { field: 'y1', type: 'quantitative' },
  mark: { fields: { x2: 'x2', y2: 'y2', value: 'volume' }, options: { curvature: 0.2 } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'lines'`.

## Rendering behavior

The domain includes both endpoints. Each row compiles to a sampled renderer-neutral path plus a destination marker, retaining the original row for hit testing.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Paths and endpoint markers should be accompanied by a route table. Avoid encoding direction solely through geometry because arrowheads are not yet part of this mark.

## Performance

Curved paths are sampled into scene points. Large route sets should use aggregation, bundling, or a future GPU path renderer.

## Current limitations

Geographic projection, arrowheads, progressive animation, edge bundling, obstacle routing, and path labels are not implemented yet.
