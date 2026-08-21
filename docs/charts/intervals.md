# Interval charts

Use intervals for confidence bands, error ranges, or low/central/high estimates.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume interval charts output](../assets/charts/intervals.svg)

## Quick API

`Graflume.intervals()` creates the portable `interval` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.intervals('#chart', data, {
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'estimate', type: 'quantitative' },
  mark: { fields: { low: 'lower', high: 'upper' } },
});
```

## Portable ChartSpec mapping

`x` identifies the observation, `y` is the central value, and `fields.low`/`high` identify the bounds.

The same result can be created with `Graflume.create()` and `mark: { type: 'interval' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Each valid row becomes a low-high line with caps plus an interactive central point. The y domain includes all three numeric fields.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Line, box, stick, area, and mixed interval styles are not yet separate style modes.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/intervals.svg)

[Back to chart guides](./README.md)
