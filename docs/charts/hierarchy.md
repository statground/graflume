# Hierarchy chart

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `hierarchy` family. Its canonical Quick API is `treemap()` from `graflume`, and its representative portable mark is `treemap`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name      | Quick API               | Mode                   | Portable mark | Functional difference                                        |
| -------------------- | ----------------------- | ---------------------- | ------------- | ------------------------------------------------------------ |
| Organization chart   | `org()`                 | `organization`         | `org`         | Uses a compact organization-card layout.                     |
| Tree map             | `treemap()`             | `treemap`              | `treemap`     | Allocates nested rectangles by hierarchy value.              |
| Tree chart           | `tree()`                | `tree`                 | `tree`        | Uses a parent-child node-link tree layout.                   |
| Sunburst chart       | `sunburst()`            | `sunburst`             | `sunburst`    | Uses radial hierarchy partitions.                            |
| Organization network | `organizationNetwork()` | `organization-network` | `org`         | Uses organization semantics with relationship styling.       |
| Tree graph           | `treeGraph()`           | `tree-graph`           | `tree`        | Uses the hierarchy data contract with graph-like connectors. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 6 compiled preset snapshots</summary>

| Preset               | Current compiled output                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Organization chart   | [![Current Organization chart output](../assets/charts/org.svg)](../assets/charts/org.svg)                                     |
| Tree map             | [![Current Tree map output](../assets/charts/treemap.svg)](../assets/charts/treemap.svg)                                       |
| Tree chart           | [![Current Tree chart output](../assets/charts/tree.svg)](../assets/charts/tree.svg)                                           |
| Sunburst chart       | [![Current Sunburst chart output](../assets/charts/sunburst.svg)](../assets/charts/sunburst.svg)                               |
| Organization network | [![Current Organization network output](../assets/charts/organization-network.svg)](../assets/charts/organization-network.svg) |
| Tree graph           | [![Current Tree graph output](../assets/charts/tree-graph.svg)](../assets/charts/tree-graph.svg)                               |

</details>
<!-- FAMILY_PRESETS_END -->
![Current Hierarchy chart output](../assets/charts/hierarchy.svg)

This guide documents the consolidated **Hierarchy chart** family. The image is generated from the actual compiled Scene used by the runtime renderer.

## When to use it

Explore parent-child structure. Tree, organization, nested rectangles, and radial partitions are layouts of the same hierarchy meaning.

## Canonical Quick API

```ts
import { treemap } from 'graflume';

treemap('#chart', data, {
  x: { field: 'id', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { parent: 'parent' } },
});
```

## Data contract

Supply a node id plus a parent field. Root rows use an empty parent; an optional quantitative value controls area or angular extent. Missing required values skip only the affected row. Input order remains stable unless the selected layout documents a deterministic sort.

## Rendering and portability

Every preset normalizes into the same ChartSpec, validation, scale, compiler, renderer-neutral Scene, interaction, and accessibility pipeline. Mode differences use function-free `mark.fields` and `mark.options`; they do not create a second engine or a second top-level family.

## Styling and interaction

Use theme tokens or common `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` properties where the selected geometry supports them. Interactive datum shapes retain their source row and layer metadata; decorative labels, grids, and depth faces do not create duplicate targets.

## Accessibility and performance

Provide a concise `accessibility.label`, describe the principal comparison or structure, and pair Canvas output with the data-table fallback. Dense labels, relationship crossings, and multi-part interval geometry can produce several Scene nodes per row, so aggregate when individual marks stop adding analytical value.

## Verification

- Snapshot: [`docs/assets/charts/hierarchy.svg`](../assets/charts/hierarchy.svg)
- Runtime catalogs: [`src/catalog`](../../src/catalog)
- Catalog tests: [`tests`](../../tests)
