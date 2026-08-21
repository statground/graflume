# Effect scatter charts

[Back to the chart guide index](./README.md)

![Current Graflume effect scatter charts output](../assets/charts/effect-scatter.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use an effect scatter chart to emphasize a few quantitative observations with quiet concentric rings.

## Data contract

`x` and `y` are quantitative positions. Optional `mark.fields.size` scales the primary circle and emphasis rings.

### Named fields

`size` supplies a numeric magnitude. Without it, the standard mark radius is used.

### Portable options

`rings` controls 1–4 emphasis rings. Standard point fill, stroke, opacity, radius, and line width options apply.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { effectScatter } from 'graflume/complete';

effectScatter('#chart', data, {
  x: { field: 'reach', type: 'quantitative' },
  y: { field: 'impact', type: 'quantitative' },
  mark: { fields: { size: 'priority' }, options: { rings: 2 } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'effect-scatter'`.

## Rendering behavior

Every valid row becomes an interactive foreground circle plus non-interactive translucent rings. The output is static and respects reduced-motion expectations.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Only the foreground point is a hit target, so decorative rings do not create duplicate focus targets. Include the highlighted reason in labels or supporting text.

## Performance

Each row creates one point plus several rings. Limit this style to noteworthy observations rather than using it for very large scatter data.

## Current limitations

Animated ripple propagation is intentionally absent from the portable scene. Label placement, clustering, and collision handling remain planned.
