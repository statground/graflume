# Table charts

Use the table chart when exact values matter more than shape.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume table charts output](../assets/charts/table.svg)

## Quick API

`Graflume.table()` creates the portable `table` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.table('#chart', data, {
  x: { field: 'name', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { columns: ['name', 'value', 'status'], rowHeight: 28 } },
});
```

## Portable ChartSpec mapping

`mark.options.columns` is an ordered string array of data fields. Without it, x and y fields are shown.

The same result can be created with `Graflume.create()` and `mark: { type: 'table' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Headers, alternating row fills, grid cells, and text are compiled to Scene primitives. Rows that fit in the plot are interactive.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Sorting UI, paging, frozen columns, cell formatters, text wrapping, and native HTML accessibility are not implemented. Provide an HTML table fallback for production accessibility.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/table.svg)

[Back to chart guides](./README.md)
