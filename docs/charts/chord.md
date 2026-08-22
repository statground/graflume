# Chord diagrams

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `chord` family. Its canonical Quick API is `chord()` from `graflume/complete`, and its representative portable mark is `chord`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name  | Quick API           | Mode               | Portable mark | Functional difference                                |
| ---------------- | ------------------- | ------------------ | ------------- | ---------------------------------------------------- |
| Chord diagram    | `chord()`           | `default`          | `chord`       | Uses circular weighted relationship bands.           |
| Dependency wheel | `dependencyWheel()` | `dependency-wheel` | `chord`       | Uses chord geometry with dependency-oriented naming. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 2 compiled preset snapshots</summary>

| Preset           | Current compiled output                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Chord diagram    | [![Current Chord diagram output](../assets/charts/chord.svg)](../assets/charts/chord.svg)                          |
| Dependency wheel | [![Current Dependency wheel output](../assets/charts/dependency-wheel.svg)](../assets/charts/dependency-wheel.svg) |

</details>
<!-- FAMILY_PRESETS_END -->
[Back to the chart guide index](./README.md)

![Current Graflume chord diagrams output](../assets/charts/chord.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a chord diagram for weighted flows among a limited set of categories when circular symmetry is useful.

## Data contract

`x` defaults to source, `mark.fields.target` names the target, and `y` or `mark.fields.value` supplies a non-negative weight.

### Named fields

`source`, `target`, and `value` form the flow table. Category order follows first appearance.

### Portable options

The current layout derives group arc lengths from incident totals. Standard mark colors, stroke, opacity, and line width remain available.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { chord } from 'graflume/complete';

chord('#chart', flows, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'amount', type: 'quantitative' },
  mark: { fields: { target: 'target', value: 'amount' } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'chord'`.

## Rendering behavior

The compiler aggregates category totals, allocates annular group sectors, labels them, and draws renderer-neutral weighted connection bands between source and target midpoints.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Group sectors and connection bands preserve datum metadata where available. Include an ordered flow table because thickness and crossings are not sufficient for precise non-visual reading.

## Performance

Keep category counts small. This alpha compiler favors deterministic scene portability over iterative crossing minimization.

## Current limitations

Subgroup arc allocation, directed arrow treatment, crossing minimization, ribbon tooltips, selection dimming, and label collision solving remain planned.
