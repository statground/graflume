# Sunburst charts

[Back to the chart guide index](./README.md)

![Current Graflume sunburst charts output](../assets/charts/sunburst.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a sunburst chart for a weighted hierarchy where ring depth and angular share should be visible together.

## Data contract

`x` supplies node id, `mark.fields.parent` supplies parent id, and `y` or `mark.fields.value` supplies non-negative weight.

### Named fields

`id`, `parent`, `label`, and `value` follow the same hierarchy contract as the tree mark. Child totals are reconciled safely with explicit parent values.

### Portable options

`innerRadius` controls the central hole from 0 to 0.7 of the outer radius. Standard mark styling remains available.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { sunburst } from 'graflume/complete';

sunburst('#chart', nodes, {
  x: { field: 'id', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { parent: 'parent', label: 'name' }, options: { innerRadius: 0.12 } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'sunburst'`.

## Rendering behavior

The compiler builds a safe hierarchy, allocates annular sectors recursively by weight, varies color by node, and labels sectors when angular and radial space are sufficient.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Every sector retains its source row. A nested-list or table fallback is essential because ring position alone does not expose the complete hierarchy to assistive technology.

## Performance

Scene cost is linear in nodes, but labels and tiny sectors become unreadable before rendering becomes expensive. Aggregate small leaves when possible.

## Current limitations

Interactive drill-down, re-rooting, minimum-angle aggregation, breadcrumb navigation, label collision solving, and depth-specific style tokens remain planned.
