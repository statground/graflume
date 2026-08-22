# Network chart

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `network` family. Its canonical Quick API is `network()` from `graflume/complete`, and its representative portable mark is `graph`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name  | Quick API        | Mode            | Portable mark | Functional difference                                     |
| ---------------- | ---------------- | --------------- | ------------- | --------------------------------------------------------- |
| Graph chart      | `graph()`        | `node-link`     | `graph`       | Uses the deterministic node-link layout.                  |
| Connection lines | `lines()`        | `connections`   | `lines`       | Shows direct source-to-target connection paths.           |
| Arc diagram      | `arcDiagram()`   | `arc-diagram`   | `arc-diagram` | Places nodes on one baseline and draws arcs between them. |
| Network graph    | `networkGraph()` | `network-graph` | `graph`       | Keeps the legacy network graph name for node-link mode.   |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 4 compiled preset snapshots</summary>

| Preset           | Current compiled output                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| Graph chart      | [![Current Graph chart output](../assets/charts/graph.svg)](../assets/charts/graph.svg)                   |
| Connection lines | [![Current Connection lines output](../assets/charts/lines.svg)](../assets/charts/lines.svg)              |
| Arc diagram      | [![Current Arc diagram output](../assets/charts/arc-diagram.svg)](../assets/charts/arc-diagram.svg)       |
| Network graph    | [![Current Network graph output](../assets/charts/network-graph.svg)](../assets/charts/network-graph.svg) |

</details>
<!-- FAMILY_PRESETS_END -->
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
