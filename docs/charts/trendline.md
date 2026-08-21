# Trendlines

Use a trendline to summarize the linear relationship between quantitative x and y values.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume trendlines output](../assets/charts/trendline.svg)

## Quick API

`Graflume.trendline()` creates the portable `trendline` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.trendline('#chart', data, {
  x: { field: 'hours', type: 'quantitative' },
  y: { field: 'score', type: 'quantitative' },
});
```

## Portable ChartSpec mapping

`x` and `y` must be quantitative or temporal values convertible to numbers.

The same result can be created with `Graflume.create()` and `mark: { type: 'trendline' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

The compiler renders source points, computes ordinary least squares, and overlays a dashed linear regression path spanning observed x.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Exponential/polynomial models, confidence bands, equation/R² labels, robust regression, and transform pipelines remain planned.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/trendline.svg)

[Back to chart guides](./README.md)
