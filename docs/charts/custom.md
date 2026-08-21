# Declarative custom charts

[Back to the chart guide index](./README.md)

![Current Graflume declarative custom charts output](../assets/charts/custom.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a declarative custom chart for a small escape hatch that can still be serialized, validated, and rendered without runtime code execution.

## Data contract

`x` and `y` position each row. `mark.options.primitive` selects `circle`, `rect`, `line`, or `text`; named fields supply primitive dimensions and labels.

### Named fields

`x2`/`y2` define line endpoints; `width`/`height` define rectangles; `radius` defines circles; and `label` defines text.

### Portable options

`primitive`, numeric `width`, `height`, `radius`, `fontSize`, and string `label` are portable options. Functions, callbacks, raw HTML, shaders, and runtime evaluation are rejected by the portable-spec boundary.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { custom } from 'graflume/complete';

custom('#chart', rows, {
  x: { field: 'x', type: 'quantitative' },
  y: { field: 'y', type: 'quantitative' },
  mark: {
    fields: { width: 'width', height: 'height', label: 'label' },
    options: { primitive: 'rect' },
  },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'custom'`.

## Rendering behavior

Each row compiles directly to an existing Scene primitive and keeps row-level interaction metadata. The renderer never executes user-provided code.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Primitive rows retain normal hit-test metadata. Authors remain responsible for a meaningful chart label, description, and table fallback because custom geometry has no automatic semantic summary yet.

## Performance

The declarative path is lightweight and linear in rows. Complex scenes or shaders belong in a separately versioned plugin rather than a portable chart specification.

## Current limitations

Arbitrary paths, nested groups, custom shaders, callbacks, layout code, HTML, and renderer-specific objects are deliberately outside this portable alpha contract.
