# Graph charts

[Back to the chart guide index](./README.md)

![Current Graflume graph charts output](../assets/charts/graph.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a graph chart for a general network of nodes and directed weighted relationships.

## Data contract

`x` defaults to the source id. `mark.fields.target` identifies the target id; optional `source`, `id`, `label`, and `value` fields refine the network contract.

### Named fields

`source` and `target` define edges. `value` controls edge weight and contributes to node size. Explicit node rows may use `id` and `label`.

### Portable options

The current circular layout is deterministic and has no required options. Mark stroke, fill, opacity, line width, and radius participate in normal style resolution.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { graph } from 'graflume/complete';

graph('#chart', links, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { target: 'target', value: 'value' } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'graph'`.

## Rendering behavior

Unique source and target ids become nodes arranged around a circle. Weighted paths connect them, and interactive circles carry representative source rows.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Visual nodes are interactive, but network structure should also be summarized as an adjacency table or edge list. A concise description should identify the most connected nodes.

## Performance

The current scene and circular placement are suitable for small networks. Dense edge sets grow quadratically in visual clutter and should move to a WebGL-backed graph package later.

## Current limitations

Force simulation, clustering, curved parallel edges, arrowheads, pan/zoom, selection propagation, and large-network spatial indexing are not implemented yet.
