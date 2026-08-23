# Word trees

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `word-tree` family. Its canonical Quick API is `wordTree()` from `graflume`, and its representative portable mark is `word-tree`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                 | Quick API    | Mode      | Portable mark | Functional difference                            |
| ------------------------------- | ------------ | --------- | ------------- | ------------------------------------------------ |
| [Word tree](#variant-word-tree) | `wordTree()` | `default` | `word-tree`   | Uses the canonical presentation for this family. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                      |     |
| ------------------------------------------------------------------------------------------------------------------------------------ | --- |
| **[Word tree](#variant-word-tree)**<br>[![Current Word tree output](../assets/charts/word-tree.svg)](../assets/charts/word-tree.svg) |     |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Tooltip interaction is a pointer-only convenience, so keep a readable summary or data table available for exact values and keyboard access. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-word-tree"></a>

### Word tree

Use this preset when weighted terms must be read through explicit parent-child relationships. Uses the canonical presentation for this family.

- **Quick API:** `wordTree()`
- **Mode:** `default`
- **Portable mark:** `word-tree`
- **Required example fields:** `word`, `weight`, `parent`

```js
import { wordTree } from 'graflume';

const data = [
  {
    word: 'Analytics',
    weight: 92,
    parent: '',
  },
  {
    word: 'Canvas',
    weight: 76,
    parent: 'Analytics',
  },
  {
    word: 'Portable',
    weight: 69,
    parent: 'Analytics',
  },
  {
    word: 'Scene',
    weight: 61,
    parent: 'Canvas',
  },
];

wordTree('#chart', data, {
  x: {
    field: 'word',
    type: 'ordinal',
    title: 'word',
  },
  y: {
    field: 'weight',
    type: 'quantitative',
    title: 'weight',
  },
  title: {
    text: 'Word tree',
    subtitle: 'word-tree family · default mode',
  },
  accessibility: {
    label: 'Word tree example',
    description: 'A compiled word tree example using the word-tree family.',
  },
  mark: {
    fields: {
      parent: 'parent',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Word tree',
      fields: [
        {
          field: 'word',
          label: 'word',
          format: 'auto',
        },
        {
          field: 'weight',
          label: 'weight',
          format: 'number',
        },
        {
          field: 'parent',
          label: 'Parent',
          format: 'auto',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

Use a word tree to show an explicit weighted hierarchy of terms.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume word trees output](../assets/charts/word-tree.svg)

## Quick API

`Graflume.wordTree()` creates the portable `word-tree` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.wordTree('#chart', data, {
  x: { field: 'word', type: 'nominal' },
  y: { field: 'weight', type: 'quantitative' },
  mark: { fields: { parent: 'parent' } },
});
```

## Portable ChartSpec mapping

`x` names the word/node, `y` supplies weight, and `fields.parent` supplies the parent word. A blank parent creates a root.

The same result can be created with `Graflume.create()` and `mark: { type: 'word-tree' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Words are arranged by hierarchy depth, connected with branch lines, and sized by the square root of weight.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Implicit phrase tokenization, prefix/suffix/double modes, collision avoidance, and click-to-reroot navigation are not implemented yet.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/word-tree.svg)

[Back to chart guides](./README.md)
