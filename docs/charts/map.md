# Maps

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `map` family. Its canonical Quick API is `map()` from `graflume`, and its representative portable mark is `map`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name         | Quick API      | Mode          | Portable mark | Functional difference                                              |
| ----------------------- | -------------- | ------------- | ------------- | ------------------------------------------------------------------ |
| Geographic region chart | `geo()`        | `region`      | `geo`         | Maps named regions through the built-in geographic reference data. |
| Map                     | `map()`        | `default`     | `map`         | Projects longitude and latitude point rows.                        |
| Flow map                | `flowMap()`    | `flow-map`    | `geo-flow`    | Adds weighted directional routes between map coordinates.          |
| Geographic heatmap      | `geoHeatmap()` | `geo-heatmap` | `geo-heatmap` | Maps geographic intensity into nested heat circles.                |
| Map bubble chart        | `mapBubble()`  | `map-bubble`  | `map`         | Scales projected point radius by value.                            |
| Map line chart          | `mapLine()`    | `map-line`    | `geo-line`    | Draws curved geographic routes without flow weighting.             |
| Map point chart         | `mapPoint()`   | `map-point`   | `map`         | Uses fixed-size projected point markers.                           |
| Tiled map               | `tiledMap()`   | `tiled-map`   | `tiled-map`   | Adds a deterministic local tile surface under projected rows.      |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 8 compiled preset snapshots</summary>

| Preset                  | Current compiled output                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Geographic region chart | [![Current Geographic region chart output](../assets/charts/geo.svg)](../assets/charts/geo.svg)            |
| Map                     | [![Current Map output](../assets/charts/map.svg)](../assets/charts/map.svg)                                |
| Flow map                | [![Current Flow map output](../assets/charts/flow-map.svg)](../assets/charts/flow-map.svg)                 |
| Geographic heatmap      | [![Current Geographic heatmap output](../assets/charts/geo-heatmap.svg)](../assets/charts/geo-heatmap.svg) |
| Map bubble chart        | [![Current Map bubble chart output](../assets/charts/map-bubble.svg)](../assets/charts/map-bubble.svg)     |
| Map line chart          | [![Current Map line chart output](../assets/charts/map-line.svg)](../assets/charts/map-line.svg)           |
| Map point chart         | [![Current Map point chart output](../assets/charts/map-point.svg)](../assets/charts/map-point.svg)        |
| Tiled map               | [![Current Tiled map output](../assets/charts/tiled-map.svg)](../assets/charts/tiled-map.svg)              |

</details>
<!-- FAMILY_PRESETS_END -->
Use a map for longitude/latitude point locations without a remote tile dependency.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume maps output](../assets/charts/map.svg)

## Quick API

`Graflume.map()` creates the portable `map` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.map('#chart', data, {
  x: { field: 'longitude', type: 'quantitative' },
  y: { field: 'latitude', type: 'quantitative' },
  mark: { fields: { size: 'population' } },
});
```

## Portable ChartSpec mapping

`x` is longitude, `y` is latitude, and optional `fields.size` scales marker radius.

The same result can be created with `Graflume.create()` and `mark: { type: 'map' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Coordinates use an equirectangular projection against a theme-aware surface, graticule, and built-in world outline. Markers use a quiet halo plus an interactive foreground circle.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Tiles, geocoding, roads, places, pan/zoom, wrapped longitude, and other projections are reserved for the maps package.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/map.svg)

[Back to chart guides](./README.md)
