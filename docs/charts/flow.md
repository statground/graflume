# Flow diagram

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `flow` family. Its canonical Quick API is `sankey()` from `graflume`, and its representative portable mark is `sankey`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                   | Quick API  | Mode      | Portable mark | Functional difference                            |
| --------------------------------- | ---------- | --------- | ------------- | ------------------------------------------------ |
| [Sankey diagram](#variant-sankey) | `sankey()` | `default` | `sankey`      | Uses proportional nodes and weighted flow bands. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                       |     |
| ------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **[Sankey diagram](#variant-sankey)**<br>[![Current Sankey diagram output](../assets/charts/sankey.svg)](../assets/charts/sankey.svg) |     |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Tooltip interaction is a pointer-only convenience, so keep a readable summary or data table available for exact values and keyboard access. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

<a id="variant-sankey"></a>

### Sankey diagram

Use this preset when weighted movement between stages or entities is the primary reading task. Uses proportional nodes and weighted flow bands.

- **Quick API:** `sankey()`
- **Mode:** `default`
- **Portable mark:** `sankey`
- **Required example fields:** `source`, `value`, `target`

```js
import { sankey } from 'graflume';

const data = [
  {
    source: 'Input',
    value: 9,
    target: 'Compiler',
  },
  {
    source: 'Compiler',
    value: 8,
    target: 'Scene',
  },
  {
    source: 'Scene',
    value: 6,
    target: 'Canvas',
  },
  {
    source: 'Scene',
    value: 4,
    target: 'Vector',
  },
];

sankey('#chart', data, {
  x: {
    field: 'source',
    type: 'ordinal',
    title: 'source',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  title: {
    text: 'Sankey diagram',
    subtitle: 'flow family · default mode',
  },
  accessibility: {
    label: 'Sankey diagram example',
    description: 'A compiled sankey diagram example using the flow family.',
  },
  mark: {
    fields: {
      target: 'target',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Sankey diagram',
      fields: [
        {
          field: 'source',
          label: 'source',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'value',
          format: 'number',
        },
        {
          field: 'target',
          label: 'Target',
          format: 'auto',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

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
