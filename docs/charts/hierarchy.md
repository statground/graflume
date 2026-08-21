# Hierarchy chart

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

## Integrated presets

These names remain source-compatible, but discovery surfaces count them as modes of this family.

| Preset               | Quick API               | Mode                   | Portable mark |
| -------------------- | ----------------------- | ---------------------- | ------------- |
| Organization chart   | `org()`                 | `organization`         | `org`         |
| Tree map             | `treemap()`             | `treemap`              | `treemap`     |
| Tree chart           | `tree()`                | `tree`                 | `tree`        |
| Sunburst chart       | `sunburst()`            | `sunburst`             | `sunburst`    |
| Organization network | `organizationNetwork()` | `organization-network` | `org`         |
| Tree graph           | `treeGraph()`           | `tree-graph`           | `tree`        |

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
