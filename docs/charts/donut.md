# Donut charts

Use a donut chart for a small part-to-whole comparison when the center space is useful.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume donut charts output](../assets/charts/donut.svg)

## Quick API

`Graflume.donut()` creates the portable `pie` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.donut('#chart', data, {
  x: { field: 'channel', type: 'nominal' },
  y: { field: 'share', type: 'quantitative' },
});
```

## Portable ChartSpec mapping

`donut()` normalizes to `pie` with `mark.options.innerRadius: 0.56`. `x` supplies labels and positive `y` values supply slice angles. The center shows a total with the optional `mark.options.centerLabel` caption.

The same result can be created with `Graflume.create()` and `mark: { type: 'pie' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Slices retain input order, use the theme categorical palette, show percentage-aware labels, and carry row-level hit-test metadata. Non-positive and missing values are omitted.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Dense-label collision solving, nested rings, and custom center value formatting are not implemented yet.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/donut.svg)

[Back to chart guides](./README.md)
