# Gauge charts

Use gauges for a few current values against a common bounded range.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume gauge charts output](../assets/charts/gauge.svg)

## Quick API

`Graflume.gauge()` creates the portable `gauge` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.gauge('#chart', data, {
  x: { field: 'metric', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { min: 0, max: 100 } },
});
```

## Portable ChartSpec mapping

`x` supplies gauge labels, `y` supplies values, and `mark.options.min`/`max` define the range.

The same result can be created with `Graflume.create()` and `mark: { type: 'gauge' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Each row receives a semicircular track, proportional colored arc, needle, value, and label. Values are clamped to the configured range.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Threshold bands, custom tick labels, animation, and needle easing are not implemented yet.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/gauge.svg)

[Back to chart guides](./README.md)
