# Word trees

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `word-tree` family. Its canonical Quick API is `wordTree()` from `graflume`, and its representative portable mark is `word-tree`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name | Quick API    | Mode      | Portable mark | Functional difference                            |
| --------------- | ------------ | --------- | ------------- | ------------------------------------------------ |
| Word tree       | `wordTree()` | `default` | `word-tree`   | Uses the canonical presentation for this family. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 1 compiled preset snapshot</summary>

| Preset    | Current compiled output                                                                       |
| --------- | --------------------------------------------------------------------------------------------- |
| Word tree | [![Current Word tree output](../assets/charts/word-tree.svg)](../assets/charts/word-tree.svg) |

</details>
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
