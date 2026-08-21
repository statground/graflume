# Tree maps

Use a treemap for part-to-whole comparison when rectangles are more space-efficient than slices.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume tree maps output](../assets/charts/treemap.svg)

## Quick API

`Graflume.treemap()` creates the portable `treemap` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.treemap('#chart', data, {
  x: { field: 'product', type: 'nominal' },
  y: { field: 'revenue', type: 'quantitative' },
});
```

## Portable ChartSpec mapping

`x` supplies labels and positive `y` values supply area. Input order is retained.

The same result can be created with `Graflume.create()` and `mark: { type: 'treemap' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

The compiler recursively splits the available width and height into deterministic two-dimensional area tiles. Input order remains stable, area is proportional to positive `y`, and tiles with sufficient room show both label and value.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Nested hierarchy, optimized squarification, drill-down, color-value encodings, and breadcrumb navigation are not implemented yet.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/treemap.svg)

[Back to chart guides](./README.md)
