# Tree charts

[Back to the chart guide index](./README.md)

![Current Graflume tree charts output](../assets/charts/tree.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a tree chart for an explicit parent-child hierarchy such as components, ownership, or taxonomy.

## Data contract

`x` supplies the node id. `mark.fields.parent` names the parent id, while optional `id`, `label`, and `value` fields override the defaults.

### Named fields

`id` defaults to `x`; `parent` defaults to `y`; `label` defaults to the node id; and `value` may supply a numeric weight.

### Portable options

`orientation` accepts `vertical` or `horizontal`. Layout is deterministic and preserves first-seen node order within each depth.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { tree } from 'graflume/complete';

tree('#chart', data, {
  x: { field: 'id', type: 'nominal' },
  y: { field: 'weight', type: 'quantitative' },
  mark: { fields: { parent: 'parent', label: 'name' }, options: { orientation: 'vertical' } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'tree'`.

## Rendering behavior

The compiler resolves hierarchy depths, positions every level, draws elbow connectors, and renders theme-aware interactive node cards. Cycles are safely treated as roots instead of recursing indefinitely.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Node cards retain row-level interaction metadata. Add a description that explains the root and major branches, and expose the source rows as a nested list or table for keyboard and screen-reader use.

## Performance

The alpha layout is intended for tens to low hundreds of nodes. Large/deep trees should use progressive disclosure or a dedicated hierarchy package.

## Current limitations

Tidy-tree optimization, collapsed branches, zoom, edge routing around cards, subtree ordering, and editable hierarchy interactions remain planned.
