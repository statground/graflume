# Pie charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `pie` family. Its canonical Quick API is `pie()` from `graflume`, and its representative portable mark is `pie`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name           | Quick API       | Mode           | Portable mark  | Functional difference                                        |
| ------------------------- | --------------- | -------------- | -------------- | ------------------------------------------------------------ |
| Donut chart               | `donut()`       | `donut`        | `pie`          | Adds an inner radius and center summary to the pie geometry. |
| Pie chart                 | `pie()`         | `default`      | `pie`          | Uses equal-radius sectors for part-to-whole comparison.      |
| Variable radius pie chart | `variablePie()` | `variable-pie` | `variable-pie` | Uses a second value to vary each sector radius.              |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 3 compiled preset snapshots</summary>

| Preset                    | Current compiled output                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Donut chart               | [![Current Donut chart output](../assets/charts/donut.svg)](../assets/charts/donut.svg)                             |
| Pie chart                 | [![Current Pie chart output](../assets/charts/pie.svg)](../assets/charts/pie.svg)                                   |
| Variable radius pie chart | [![Current Variable radius pie chart output](../assets/charts/variable-pie.svg)](../assets/charts/variable-pie.svg) |

</details>
<!-- FAMILY_PRESETS_END -->
Use a pie chart for a small number of positive part-to-whole values.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume pie charts output](../assets/charts/pie.svg)

## Quick API

`Graflume.pie()` creates the portable `pie` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.pie('#chart', data, {
  x: { field: 'channel', type: 'nominal' },
  y: { field: 'share', type: 'quantitative' },
});
```

## Portable ChartSpec mapping

`x` supplies labels and positive quantitative `y` values determine angles. Slice order follows input order.

The same result can be created with `Graflume.create()` and `mark: { type: 'pie' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

The compiler emits closed polygonal arc paths with palette colors, percentage-aware labels, and whole-slice hit testing. Large slices use high-contrast internal labels; smaller visible slices use short leader lines. Non-positive values are omitted.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Automatic collision solving for dense external labels, exploded slices, 3D, and hierarchical rings are not implemented yet. Use a small number of slices or lower `mark.options.labelLimit` for dense data.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/pie.svg)

[Back to chart guides](./README.md)
