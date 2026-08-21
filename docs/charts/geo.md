# GeoCharts

Use a GeoChart for a quick country-level distribution view.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume geocharts output](../assets/charts/geo.svg)

## Quick API

`Graflume.geo()` creates the portable `geo` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.geo('#chart', data, {
  x: { field: 'country', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
});
```

## Portable ChartSpec mapping

`x` supplies a supported country code/name and `y` supplies marker magnitude. Rendering stays local and sends no data to a map service.

The same result can be created with `Graflume.create()` and `mark: { type: 'geo' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

A theme-aware map surface, quiet latitude/longitude graticule, and built-in renderer-neutral world outline are drawn first. Known country centroids receive haloed, size-scaled markers with row hit testing.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

This alpha implementation has a deliberately small centroid catalog and simplified continent geometry. Full ISO coverage, choropleth boundaries, projections, and zoom belong in the future maps package.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/geo.svg)

[Back to chart guides](./README.md)
