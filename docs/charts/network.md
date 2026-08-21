# Network chart

![Current Network chart output](../assets/charts/network.svg)

This guide documents the consolidated **Network chart** family. The image is generated from the actual compiled Scene used by the runtime renderer.

## When to use it

Show relationships among nodes while choosing node-link, arc, or direct connection geometry as a layout mode.

## Canonical Quick API

```ts
import { network } from 'graflume/complete';

network('#chart', data, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { target: 'target' }, options: { mode: 'arc' } },
});
```

## Integrated presets

These names remain source-compatible, but discovery surfaces count them as modes of this family.

| Preset           | Quick API        | Mode            | Portable mark |
| ---------------- | ---------------- | --------------- | ------------- |
| Graph chart      | `graph()`        | `node-link`     | `graph`       |
| Connection lines | `lines()`        | `connections`   | `lines`       |
| Arc diagram      | `arcDiagram()`   | `arc-diagram`   | `arc-diagram` |
| Network graph    | `networkGraph()` | `network-graph` | `graph`       |

## Data contract

Declare source and target fields and an optional weight. `network()` accepts `mark.options.mode` values `node-link`, `arc`, and `connections`. Missing required values skip only the affected row. Input order remains stable unless the selected layout documents a deterministic sort.

## Rendering and portability

Every preset normalizes into the same ChartSpec, validation, scale, compiler, renderer-neutral Scene, interaction, and accessibility pipeline. Mode differences use function-free `mark.fields` and `mark.options`; they do not create a second engine or a second top-level family.

## Styling and interaction

Use theme tokens or common `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` properties where the selected geometry supports them. Interactive datum shapes retain their source row and layer metadata; decorative labels, grids, and depth faces do not create duplicate targets.

## Accessibility and performance

Provide a concise `accessibility.label`, describe the principal comparison or structure, and pair Canvas output with the data-table fallback. Dense labels, relationship crossings, and multi-part interval geometry can produce several Scene nodes per row, so aggregate when individual marks stop adding analytical value.

## Verification

- Snapshot: [`docs/assets/charts/network.svg`](../assets/charts/network.svg)
- Runtime catalogs: [`src/catalog`](../../src/catalog)
- Catalog tests: [`tests`](../../tests)
