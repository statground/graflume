# Diff charts

Use a diff chart to make before/after changes more visible than two independent charts.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume diff charts output](../assets/charts/diff.svg)

## Quick API

`Graflume.diff()` creates the portable `diff` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.diff('#chart', data, {
  x: { field: 'category', type: 'ordinal' },
  y: { field: 'current', type: 'quantitative' },
  mark: { fields: { old: 'previous', new: 'current' } },
});
```

## Portable ChartSpec mapping

`x` is the category, `y` is the new value, and `mark.fields.old`/`new` name the comparable numeric columns.

The same result can be created with `Graflume.create()` and `mark: { type: 'diff' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

The old value is rendered as a muted full-width bar, the new value as a narrower foreground bar, and a connector shows the signed movement.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

The alpha compiler implements the bar/column comparison form. Diff pie and diff scatter rendering are not yet separate modes.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/diff.svg)

[Back to chart guides](./README.md)
