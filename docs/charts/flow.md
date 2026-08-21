# Flow diagram

![Current Flow diagram output](../assets/charts/flow.svg)

This guide documents the consolidated **Flow diagram** family. The image is generated from the actual compiled Scene used by the runtime renderer.

## When to use it

Explain weighted movement between categorical sources and targets.

## Canonical Quick API

```ts
import { sankey } from 'graflume';

sankey('#chart', data, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { target: 'target' } },
});
```

## Integrated presets

These names remain source-compatible, but discovery surfaces count them as modes of this family.

| Preset         | Quick API  | Mode      | Portable mark |
| -------------- | ---------- | --------- | ------------- |
| Sankey diagram | `sankey()` | `default` | `sankey`      |

## Data contract

Use the `x` field as source, declare `mark.fields.target`, and place the non-negative weight on `y` or `mark.fields.value`. Missing required values skip only the affected row. Input order remains stable unless the selected layout documents a deterministic sort.

## Rendering and portability

Every preset normalizes into the same ChartSpec, validation, scale, compiler, renderer-neutral Scene, interaction, and accessibility pipeline. Mode differences use function-free `mark.fields` and `mark.options`; they do not create a second engine or a second top-level family.

## Styling and interaction

Use theme tokens or common `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` properties where the selected geometry supports them. Interactive datum shapes retain their source row and layer metadata; decorative labels, grids, and depth faces do not create duplicate targets.

## Accessibility and performance

Provide a concise `accessibility.label`, describe the principal comparison or structure, and pair Canvas output with the data-table fallback. Dense labels, relationship crossings, and multi-part interval geometry can produce several Scene nodes per row, so aggregate when individual marks stop adding analytical value.

## Verification

- Snapshot: [`docs/assets/charts/flow.svg`](../assets/charts/flow.svg)
- Runtime catalogs: [`src/catalog`](../../src/catalog)
- Catalog tests: [`tests`](../../tests)
