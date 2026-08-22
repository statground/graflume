# Maps

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `map` family. Its canonical Quick API is `map()` from `graflume`, and its representative portable mark is `map`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                            | Quick API      | Mode          | Portable mark | Functional difference                                              |
| ------------------------------------------ | -------------- | ------------- | ------------- | ------------------------------------------------------------------ |
| [Geographic region chart](#variant-geo)    | `geo()`        | `region`      | `geo`         | Maps named regions through the built-in geographic reference data. |
| [Map](#variant-map)                        | `map()`        | `default`     | `map`         | Projects longitude and latitude point rows.                        |
| [Flow map](#variant-flow-map)              | `flowMap()`    | `flow-map`    | `geo-flow`    | Adds weighted directional routes between map coordinates.          |
| [Geographic heatmap](#variant-geo-heatmap) | `geoHeatmap()` | `geo-heatmap` | `geo-heatmap` | Maps geographic intensity into nested heat circles.                |
| [Map bubble chart](#variant-map-bubble)    | `mapBubble()`  | `map-bubble`  | `map`         | Scales projected point radius by value.                            |
| [Map line chart](#variant-map-line)        | `mapLine()`    | `map-line`    | `geo-line`    | Draws curved geographic routes without flow weighting.             |
| [Map point chart](#variant-map-point)      | `mapPoint()`   | `map-point`   | `map`         | Uses fixed-size projected point markers.                           |
| [Tiled map](#variant-tiled-map)            | `tiledMap()`   | `tiled-map`   | `tiled-map`   | Adds a deterministic local tile surface under projected rows.      |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                                       |                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[Geographic region chart](#variant-geo)**<br>[![Current Geographic region chart output](../assets/charts/geo.svg)](../assets/charts/geo.svg)        | **[Map](#variant-map)**<br>[![Current Map output](../assets/charts/map.svg)](../assets/charts/map.svg)                                                       |
| **[Flow map](#variant-flow-map)**<br>[![Current Flow map output](../assets/charts/flow-map.svg)](../assets/charts/flow-map.svg)                       | **[Geographic heatmap](#variant-geo-heatmap)**<br>[![Current Geographic heatmap output](../assets/charts/geo-heatmap.svg)](../assets/charts/geo-heatmap.svg) |
| **[Map bubble chart](#variant-map-bubble)**<br>[![Current Map bubble chart output](../assets/charts/map-bubble.svg)](../assets/charts/map-bubble.svg) | **[Map line chart](#variant-map-line)**<br>[![Current Map line chart output](../assets/charts/map-line.svg)](../assets/charts/map-line.svg)                  |
| **[Map point chart](#variant-map-point)**<br>[![Current Map point chart output](../assets/charts/map-point.svg)](../assets/charts/map-point.svg)      | **[Tiled map](#variant-tiled-map)**<br>[![Current Tiled map output](../assets/charts/tiled-map.svg)](../assets/charts/tiled-map.svg)                         |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

<a id="variant-geo"></a>

### Geographic region chart

Use this preset when values or relationships must be interpreted geographically. Maps named regions through the built-in geographic reference data.

- **Quick API:** `geo()`
- **Mode:** `region`
- **Portable mark:** `geo`
- **Required example fields:** `region`, `value`

```js
import { geo } from 'graflume';

const data = [
  {
    region: 'KR',
    value: 72,
  },
  {
    region: 'US',
    value: 88,
  },
  {
    region: 'BR',
    value: 41,
  },
  {
    region: 'RU',
    value: 63,
  },
];

geo('#chart', data, {
  x: {
    field: 'region',
    type: 'ordinal',
    title: 'region',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  title: {
    text: 'Geographic region chart',
    subtitle: 'map family · region mode',
  },
  accessibility: {
    label: 'Geographic region chart example',
    description: 'A compiled geographic region chart example using the map family.',
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Geographic region chart',
      fields: [
        {
          field: 'region',
          label: 'region',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'value',
          format: 'number',
        },
      ],
    },
  },
});
```

<a id="variant-map"></a>

### Map

Use this preset when values or relationships must be interpreted geographically. Projects longitude and latitude point rows.

- **Quick API:** `map()`
- **Mode:** `default`
- **Portable mark:** `map`
- **Required example fields:** `longitude`, `latitude`, `value`

```js
import { map } from 'graflume';

const data = [
  {
    longitude: 126.98,
    latitude: 37.57,
    value: 72,
  },
  {
    longitude: -74,
    latitude: 40.71,
    value: 55,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    value: 43,
  },
];

map('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'latitude',
  },
  title: {
    text: 'Map',
    subtitle: 'map family · default mode',
  },
  accessibility: {
    label: 'Map example',
    description: 'A compiled map example using the map family.',
  },
  mark: {
    fields: {
      size: 'value',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Map',
      fields: [
        {
          field: 'longitude',
          label: 'longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'latitude',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
    },
  },
});
```

<a id="variant-flow-map"></a>

### Flow map

Use this preset when values or relationships must be interpreted geographically. Adds weighted directional routes between map coordinates.

- **Quick API:** `flowMap()`
- **Mode:** `flow-map`
- **Portable mark:** `geo-flow`
- **Required example fields:** `longitude`, `latitude`, `longitude2`, `latitude2`, `value`

```js
import { flowMap } from 'graflume/complete';

const data = [
  {
    longitude: 126.98,
    latitude: 37.57,
    longitude2: 37.62,
    latitude2: 55.75,
    value: 72,
  },
  {
    longitude: -74,
    latitude: 40.71,
    longitude2: 2.35,
    latitude2: 48.86,
    value: 55,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    longitude2: 151.21,
    latitude2: -33.87,
    value: 43,
  },
];

flowMap('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'latitude',
  },
  title: {
    text: 'Flow map',
    subtitle: 'map family · flow-map mode',
  },
  accessibility: {
    label: 'Flow map example',
    description: 'A compiled flow map example using the map family.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    fields: {
      longitude2: 'longitude2',
      latitude2: 'latitude2',
      value: 'value',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Flow map',
      fields: [
        {
          field: 'longitude',
          label: 'longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'latitude',
          format: 'number',
        },
        {
          field: 'longitude2',
          label: 'Longitude2',
          format: 'number',
        },
        {
          field: 'latitude2',
          label: 'Latitude2',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
    },
  },
});
```

<a id="variant-geo-heatmap"></a>

### Geographic heatmap

Use this preset when values or relationships must be interpreted geographically. Maps geographic intensity into nested heat circles.

- **Quick API:** `geoHeatmap()`
- **Mode:** `geo-heatmap`
- **Portable mark:** `geo-heatmap`
- **Required example fields:** `longitude`, `latitude`, `value`

```js
import { geoHeatmap } from 'graflume/complete';

const data = [
  {
    longitude: 126.98,
    latitude: 37.57,
    value: 72,
  },
  {
    longitude: -74,
    latitude: 40.71,
    value: 55,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    value: 43,
  },
];

geoHeatmap('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'latitude',
  },
  title: {
    text: 'Geographic heatmap',
    subtitle: 'map family · geo-heatmap mode',
  },
  accessibility: {
    label: 'Geographic heatmap example',
    description: 'A compiled geographic heatmap example using the map family.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    fields: {
      value: 'value',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Geographic heatmap',
      fields: [
        {
          field: 'longitude',
          label: 'longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'latitude',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
    },
  },
});
```

<a id="variant-map-bubble"></a>

### Map bubble chart

Use this preset when values or relationships must be interpreted geographically. Scales projected point radius by value.

- **Quick API:** `mapBubble()`
- **Mode:** `map-bubble`
- **Portable mark:** `map`
- **Required example fields:** `longitude`, `latitude`, `value`

```js
import { mapBubble } from 'graflume/complete';

const data = [
  {
    longitude: 126.98,
    latitude: 37.57,
    value: 72,
  },
  {
    longitude: -74,
    latitude: 40.71,
    value: 55,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    value: 43,
  },
];

mapBubble('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'latitude',
  },
  title: {
    text: 'Map bubble chart',
    subtitle: 'map family · map-bubble mode',
  },
  accessibility: {
    label: 'Map bubble chart example',
    description: 'A compiled map bubble chart example using the map family.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    fields: {
      size: 'value',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Map bubble chart',
      fields: [
        {
          field: 'longitude',
          label: 'longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'latitude',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
    },
  },
});
```

<a id="variant-map-line"></a>

### Map line chart

Use this preset when values or relationships must be interpreted geographically. Draws curved geographic routes without flow weighting.

- **Quick API:** `mapLine()`
- **Mode:** `map-line`
- **Portable mark:** `geo-line`
- **Required example fields:** `longitude`, `latitude`, `longitude2`, `latitude2`, `value`

```js
import { mapLine } from 'graflume/complete';

const data = [
  {
    longitude: 126.98,
    latitude: 37.57,
    longitude2: 37.62,
    latitude2: 55.75,
    value: 72,
  },
  {
    longitude: -74,
    latitude: 40.71,
    longitude2: 2.35,
    latitude2: 48.86,
    value: 55,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    longitude2: 151.21,
    latitude2: -33.87,
    value: 43,
  },
];

mapLine('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'latitude',
  },
  title: {
    text: 'Map line chart',
    subtitle: 'map family · map-line mode',
  },
  accessibility: {
    label: 'Map line chart example',
    description: 'A compiled map line chart example using the map family.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    fields: {
      longitude2: 'longitude2',
      latitude2: 'latitude2',
      value: 'value',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Map line chart',
      fields: [
        {
          field: 'longitude',
          label: 'longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'latitude',
          format: 'number',
        },
        {
          field: 'longitude2',
          label: 'Longitude2',
          format: 'number',
        },
        {
          field: 'latitude2',
          label: 'Latitude2',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
    },
  },
});
```

<a id="variant-map-point"></a>

### Map point chart

Use this preset when values or relationships must be interpreted geographically. Uses fixed-size projected point markers.

- **Quick API:** `mapPoint()`
- **Mode:** `map-point`
- **Portable mark:** `map`
- **Required example fields:** `longitude`, `latitude`, `value`

```js
import { mapPoint } from 'graflume/complete';

const data = [
  {
    longitude: 126.98,
    latitude: 37.57,
    value: 72,
  },
  {
    longitude: -74,
    latitude: 40.71,
    value: 55,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    value: 43,
  },
];

mapPoint('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'latitude',
  },
  title: {
    text: 'Map point chart',
    subtitle: 'map family · map-point mode',
  },
  accessibility: {
    label: 'Map point chart example',
    description: 'A compiled map point chart example using the map family.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    fields: {
      size: 'value',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Map point chart',
      fields: [
        {
          field: 'longitude',
          label: 'longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'latitude',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
    },
  },
});
```

<a id="variant-tiled-map"></a>

### Tiled map

Use this preset when values or relationships must be interpreted geographically. Adds a deterministic local tile surface under projected rows.

- **Quick API:** `tiledMap()`
- **Mode:** `tiled-map`
- **Portable mark:** `tiled-map`
- **Required example fields:** `longitude`, `latitude`

```js
import { tiledMap } from 'graflume/complete';

const data = [
  {
    longitude: 126.98,
    latitude: 37.57,
  },
  {
    longitude: -74,
    latitude: 40.71,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
  },
];

tiledMap('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'latitude',
  },
  title: {
    text: 'Tiled map',
    subtitle: 'map family · tiled-map mode',
  },
  accessibility: {
    label: 'Tiled map example',
    description: 'A compiled tiled map example using the map family.',
  },
  axes: {
    x: false,
    y: false,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Tiled map',
      fields: [
        {
          field: 'longitude',
          label: 'longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'latitude',
          format: 'number',
        },
      ],
    },
  },
});
```

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
