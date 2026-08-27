# Maps

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `map` family. Its canonical Quick API is `map()` from `graflume`, and its representative portable mark is `map`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                            | Quick API      | Mode          | Portable mark | Functional difference                                                                                                                           |
| ------------------------------------------ | -------------- | ------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [Geographic region chart](#variant-geo)    | `geo()`        | `region`      | `geo`         | Joins named regions to the built-in 177-feature Natural Earth world basemap; the example uses choropleth mode while bubble remains the default. |
| [Map](#variant-map)                        | `map()`        | `default`     | `map`         | Projects valid longitude and latitude rows over the built-in Natural Earth world basemap.                                                       |
| [Flow map](#variant-flow-map)              | `flowMap()`    | `flow-map`    | `geo-flow`    | Adds weighted directional routes over the shared static political basemap.                                                                      |
| [Geographic heatmap](#variant-geo-heatmap) | `geoHeatmap()` | `geo-heatmap` | `geo-heatmap` | Maps geographic intensity into nested heat circles over country boundaries.                                                                     |
| [Map bubble chart](#variant-map-bubble)    | `mapBubble()`  | `map-bubble`  | `map`         | Scales projected point radius by value over country boundaries.                                                                                 |
| [Map line chart](#variant-map-line)        | `mapLine()`    | `map-line`    | `geo-line`    | Draws curved geographic routes without flow weighting over the shared basemap.                                                                  |
| [Map point chart](#variant-map-point)      | `mapPoint()`   | `map-point`   | `map`         | Uses fixed-size projected point markers over the shared basemap.                                                                                |
| [Tiled map](#variant-tiled-map)            | `tiledMap()`   | `tiled-map`   | `tiled-map`   | Retains the historical compatibility name for projected points on the built-in political basemap; it does not request or simulate web tiles.    |

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

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-geo"></a>

### Geographic region chart

Use this preset when values or relationships must be interpreted geographically. Joins named regions to the built-in 177-feature Natural Earth world basemap; the example uses choropleth mode while bubble remains the default.

- **Quick API:** `geo()`
- **Mode:** `region`
- **Portable mark:** `geo`
- **Required example fields:** `region`, `value`

```js
import { geo } from 'graflume';

const data = [
  {
    region: 'KR',
    value: 92,
  },
  {
    region: 'JPN',
    value: 84,
  },
  {
    region: 'SGP',
    value: 79,
  },
  {
    region: 'USA',
    value: 88,
  },
];

geo('#chart', data, {
  x: {
    field: 'region',
    type: 'ordinal',
    title: 'Longitude',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Latitude',
  },
  title: {
    text: 'Geographic region chart',
    subtitle: 'map family · region mode',
  },
  accessibility: {
    label:
      'Geographic region chart: Regional adoption and routes connecting Statground teams around the world',
    description:
      'Regional adoption and routes connecting Statground teams around the world. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    options: {
      mode: 'choropleth',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Geographic region chart',
      fields: [
        {
          field: 'region',
          label: 'Longitude',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Latitude',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-map"></a>

### Map

Use this preset when values or relationships must be interpreted geographically. Projects valid longitude and latitude rows over the built-in Natural Earth world basemap.

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
    value: 92,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    value: 78,
  },
  {
    longitude: 103.82,
    latitude: 1.35,
    value: 64,
  },
  {
    longitude: 77.21,
    latitude: 28.61,
    value: 58,
  },
];

map('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'Longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'Latitude',
  },
  title: {
    text: 'Map',
    subtitle: 'map family · default mode',
  },
  accessibility: {
    label: 'Map: Regional adoption and routes connecting Statground teams around the world',
    description:
      'Regional adoption and routes connecting Statground teams around the world. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
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
      title: 'Map',
      fields: [
        {
          field: 'longitude',
          label: 'Longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'Latitude',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-flow-map"></a>

### Flow map

Use this preset when values or relationships must be interpreted geographically. Adds weighted directional routes over the shared static political basemap.

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
    longitude2: 139.69,
    latitude2: 35.68,
    value: 92,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    longitude2: 103.82,
    latitude2: 1.35,
    value: 78,
  },
  {
    longitude: 103.82,
    latitude: 1.35,
    longitude2: 77.21,
    latitude2: 28.61,
    value: 64,
  },
  {
    longitude: 77.21,
    latitude: 28.61,
    longitude2: 2.35,
    latitude2: 48.86,
    value: 58,
  },
];

flowMap('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'Longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'Latitude',
  },
  title: {
    text: 'Flow map',
    subtitle: 'map family · flow-map mode',
  },
  accessibility: {
    label: 'Flow map: Regional adoption and routes connecting Statground teams around the world',
    description:
      'Regional adoption and routes connecting Statground teams around the world. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
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
          label: 'Longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'Latitude',
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
      trigger: 'mark',
    },
  },
});
```

<a id="variant-geo-heatmap"></a>

### Geographic heatmap

Use this preset when values or relationships must be interpreted geographically. Maps geographic intensity into nested heat circles over country boundaries.

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
    value: 92,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    value: 78,
  },
  {
    longitude: 103.82,
    latitude: 1.35,
    value: 64,
  },
  {
    longitude: 77.21,
    latitude: 28.61,
    value: 58,
  },
];

geoHeatmap('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'Longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'Latitude',
  },
  title: {
    text: 'Geographic heatmap',
    subtitle: 'map family · geo-heatmap mode',
  },
  accessibility: {
    label:
      'Geographic heatmap: Regional adoption and routes connecting Statground teams around the world',
    description:
      'Regional adoption and routes connecting Statground teams around the world. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
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
          label: 'Longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'Latitude',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-map-bubble"></a>

### Map bubble chart

Use this preset when values or relationships must be interpreted geographically. Scales projected point radius by value over country boundaries.

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
    value: 92,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    value: 78,
  },
  {
    longitude: 103.82,
    latitude: 1.35,
    value: 64,
  },
  {
    longitude: 77.21,
    latitude: 28.61,
    value: 58,
  },
];

mapBubble('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'Longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'Latitude',
  },
  title: {
    text: 'Map bubble chart',
    subtitle: 'map family · map-bubble mode',
  },
  accessibility: {
    label:
      'Map bubble chart: Regional adoption and routes connecting Statground teams around the world',
    description:
      'Regional adoption and routes connecting Statground teams around the world. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
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
          label: 'Longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'Latitude',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-map-line"></a>

### Map line chart

Use this preset when values or relationships must be interpreted geographically. Draws curved geographic routes without flow weighting over the shared basemap.

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
    longitude2: 139.69,
    latitude2: 35.68,
    value: 92,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    longitude2: 103.82,
    latitude2: 1.35,
    value: 78,
  },
  {
    longitude: 103.82,
    latitude: 1.35,
    longitude2: 77.21,
    latitude2: 28.61,
    value: 64,
  },
  {
    longitude: 77.21,
    latitude: 28.61,
    longitude2: 2.35,
    latitude2: 48.86,
    value: 58,
  },
];

mapLine('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'Longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'Latitude',
  },
  title: {
    text: 'Map line chart',
    subtitle: 'map family · map-line mode',
  },
  accessibility: {
    label:
      'Map line chart: Regional adoption and routes connecting Statground teams around the world',
    description:
      'Regional adoption and routes connecting Statground teams around the world. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
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
          label: 'Longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'Latitude',
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
      trigger: 'mark',
    },
  },
});
```

<a id="variant-map-point"></a>

### Map point chart

Use this preset when values or relationships must be interpreted geographically. Uses fixed-size projected point markers over the shared basemap.

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
    value: 92,
  },
  {
    longitude: 139.69,
    latitude: 35.68,
    value: 78,
  },
  {
    longitude: 103.82,
    latitude: 1.35,
    value: 64,
  },
  {
    longitude: 77.21,
    latitude: 28.61,
    value: 58,
  },
];

mapPoint('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'Longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'Latitude',
  },
  title: {
    text: 'Map point chart',
    subtitle: 'map family · map-point mode',
  },
  accessibility: {
    label:
      'Map point chart: Regional adoption and routes connecting Statground teams around the world',
    description:
      'Regional adoption and routes connecting Statground teams around the world. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
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
          label: 'Longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'Latitude',
          format: 'number',
        },
        {
          field: 'value',
          label: 'Value',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-tiled-map"></a>

### Tiled map

Use this preset when values or relationships must be interpreted geographically. Retains the historical compatibility name for projected points on the built-in political basemap; it does not request or simulate web tiles.

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
    longitude: 139.69,
    latitude: 35.68,
  },
  {
    longitude: 103.82,
    latitude: 1.35,
  },
  {
    longitude: 77.21,
    latitude: 28.61,
  },
];

tiledMap('#chart', data, {
  x: {
    field: 'longitude',
    type: 'quantitative',
    title: 'Longitude',
  },
  y: {
    field: 'latitude',
    type: 'quantitative',
    title: 'Latitude',
  },
  title: {
    text: 'Tiled map',
    subtitle: 'map family · tiled-map mode',
  },
  accessibility: {
    label: 'Tiled map: Regional adoption and routes connecting Statground teams around the world',
    description:
      'Regional adoption and routes connecting Statground teams around the world. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    options: {
      graticule: true,
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Tiled map',
      fields: [
        {
          field: 'longitude',
          label: 'Longitude',
          format: 'number',
        },
        {
          field: 'latitude',
          label: 'Latitude',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

Use a map for country-level statistical comparison, longitude/latitude points, or routes without a remote tile dependency. Graflume embeds a versioned Natural Earth Admin-0 1:110m world basemap, so the same portable specification compiles deterministically in the browser, tests, and DOM-free environments.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume maps output](../assets/charts/map.svg)

## Quick API

`Graflume.map()` creates the portable `map` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.map('#chart', data, {
  x: { field: 'longitude', type: 'quantitative' },
  y: { field: 'latitude', type: 'quantitative' },
  mark: {
    fields: { size: 'population' },
    options: {
      basemap: 'natural-earth',
      graticule: true,
      attribution: true,
    },
  },
});
```

## Portable ChartSpec mapping

For `map`, `x` is longitude, `y` is latitude, and optional `fields.size` scales marker radius. Longitude must be between -180 and 180 and latitude between -90 and 90. Rows outside those bounds are skipped.

For `geo`, `x` is a country identifier or name and `y` is its quantitative value. Bubble mode remains the compatibility default. Set `mark.options.mode` to `choropleth` to fill matched country geometry instead. Region matching accepts the Natural Earth feature identifier, available ISO alpha-2/alpha-3 and numeric codes, names and aliases, plus compatibility names such as `KR`, `US`, `UK`, `South Korea`, and `대한민국`.

The same result can be created with `Graflume.create()` and `mark: { type: 'map' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Country and subdivision scopes

`mark.options.mapScope` is the shared, function-free geographic selection contract. A built-in map can focus one country or any list of countries by id, ISO code, name, or documented alias. The selected countries are the only boundaries drawn, point/route/heat overlays outside the selected bounds are omitted, and the default camera fits the selected geometry. Set `fit: false` to retain world coordinates or change the nonnegative `fitPadding`.

```js
map('#chart', offices, {
  x: { field: 'longitude', type: 'quantitative' },
  y: { field: 'latitude', type: 'quantitative' },
  mark: {
    options: {
      mapScope: {
        level: 'country',
        values: ['KR', 'JP', 'CN'],
      },
      labels: { field: 'iso2', collision: 'hide' },
    },
  },
});
```

Country subdivisions are supplied as ordinary GeoJSON or TopoJSON rather than compiled into the JavaScript bundle. The published Natural Earth 1:10m boundary pack has a versioned closed manifest, one country source, and per-country subdivision shards. `MapBoundaryLoader` fetches only the selected shards, resolves relative URLs against the pinned manifest URL, verifies their declared byte lengths and SHA-256 digests, enforces byte/concurrency/cache bounds, and returns attribution with the merged collection. Production URLs must use HTTPS; explicit `localhost`, `127.0.0.0/8`, and `[::1]` HTTP URLs are accepted only for local development.

```js
import { createMapBoundaryLoader, map } from 'graflume';

const loader = createMapBoundaryLoader();
const boundaries = await loader.loadFromURL(
  'https://cdn.jsdelivr.net/npm/graflume@0.1.0-alpha.0/geography/natural-earth-10m/manifest.json',
  { level: 'region', countries: ['KR', 'JP'] },
);

const data = [
  { region: 'KR-11', score: 92, longitude: 126.99, latitude: 37.54 },
  { region: 'KR-26', score: 78, longitude: 129.08, latitude: 35.18 },
  { region: 'JP-13', score: 88, longitude: 139.69, latitude: 35.69 },
  { region: 'JP-27', score: 74, longitude: 135.5, latitude: 34.69 },
];

map('#chart', data, {
  x: { field: 'longitude', type: 'quantitative' },
  y: { field: 'latitude', type: 'quantitative' },
  mark: {
    fields: {
      featureKey: 'isoSubdivision',
      dataKey: 'region',
      color: 'score',
    },
    options: {
      geojson: boundaries.collection,
      attribution: boundaries.attribution,
      mapScope: {
        level: 'region',
        property: 'isoSubdivision',
        values: ['KR-11', 'KR-26', 'JP-13', 'JP-27'],
        parentProperty: 'countryCode',
        parentValues: ['KR', 'JP'],
      },
      geometryDetail: 'auto',
      labels: { field: 'name_ko', collision: 'hide' },
    },
  },
});
```

Selection values are OR-ed, while an optional parent selection is AND-ed. Matching is case-insensitive for strings by default. Misspelled or empty selections fail closed unless `unmatched: "ignore"` or `empty: "allow"` is explicitly authored. Up to 50,000 scope values and 50,000 selected features are accepted; source order is preserved and no selected country or subdivision is sampled away.

For arbitrary GeoJSON, `property` names the selected feature property and `$id` selects `Feature.id`. `mark.fields.featureKey` and `dataKey` create an explicit feature-to-row join; optional `fields.color` drives the continuous fill. Duplicate and unmatched join policies default to `error` and `show`, and can be changed with `joinDuplicate` and `joinUnmatched`. Labels use an explicit label coordinate when the boundary properties provide one, otherwise a hole-aware representative point; area priority and collision suppression keep dense multi-region views legible.

## Geographic options

These options are stored under `mark.options` and apply to `map`, `geo`, `geo-line`, `geo-flow`, `geo-heatmap`, and `tiled-map` where relevant.

| Option              | Accepted values                                   | Default            | Effect                                                                                          |
| ------------------- | ------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `basemap`           | `"natural-earth"`, `"none"`                       | `"natural-earth"`  | Draws the embedded world surface and country boundaries, or suppresses the complete background. |
| `graticule`         | boolean                                           | `false`            | Draws five longitude and five latitude reference lines.                                         |
| `attribution`       | boolean                                           | `true`             | Shows the compact `Natural Earth · 1:110m` source label.                                        |
| `oceanFill`         | CSS color string                                  | theme-derived      | Sets the world viewport background.                                                             |
| `landFill`          | CSS color string                                  | theme-derived      | Sets the unbound country fill.                                                                  |
| `countryStroke`     | CSS color string                                  | theme-derived      | Sets country boundary color.                                                                    |
| `countryLineWidth`  | finite number greater than or equal to zero       | `0.55`             | Sets country boundary width in Canvas pixels.                                                   |
| `mode`              | `"bubble"`, `"choropleth"`                        | `"bubble"`         | Selects center-point bubbles or country fills for the `geo` mark.                               |
| `mapScope`          | closed scope object                               | all features       | Selects one or many countries, subdivisions, or arbitrary features and drives automatic fit.    |
| `fit`               | boolean                                           | `true` when scoped | Fits selected geometry; `false` retains the unscoped coordinate camera.                         |
| `fitPadding`        | nonnegative finite number                         | `18` when scoped   | Reserves Canvas pixels around automatically fitted geometry.                                    |
| `geometryDetail`    | `"auto"`, `"low"`, `"medium"`, `"high"`, `"full"` | `"auto"`           | Selects deterministic coordinate density for loaded GeoJSON/TopoJSON.                           |
| `geometryBudget`    | integer from 1,000 to 1,000,000                   | profile-derived    | Bounds rendered coordinate pairs without dropping a selected feature or valid ring.             |
| `maximumFeatures`   | integer from 1 to 50,000                          | `50,000`           | Fails before rendering when a loaded feature selection exceeds the authored safety budget.      |
| `labels`            | boolean or closed label object                    | `false`            | Draws collision-aware country/feature labels with an optional property and label coordinates.   |
| `joinCaseSensitive` | boolean                                           | `false`            | Controls string-key matching for explicit feature/data joins.                                   |
| `joinDuplicate`     | `"error"`, `"first"`, `"last"`                    | `"error"`          | Chooses a bounded deterministic policy for duplicate data keys.                                 |
| `joinUnmatched`     | `"show"`, `"hide"`, `"error"`                     | `"show"`           | Keeps, omits, or rejects selected boundary features without a joined data row.                  |

`basemap: "none"` removes the ocean surface, country geometry, graticule, and attribution while preserving data points, bubbles, heat circles, or routes.

## Data, ordering, and missing values

The generated basemap contains 177 Natural Earth v5.1.2 Admin-0 features at 1:110m resolution. It is compiled into the package and never fetched at runtime. The optional versioned 1:10m pack catalogs 263 selectable country/map-unit entities (all 249 ISO 3166-1 entries, user-assigned XK, and 13 source/disputed map-unit entries) and 4,501 deduplicated principal subdivisions across 247 country shards, derived from 4,596 Natural Earth Admin-1 source features. Those counts describe this pinned pack, not a claim that every political or administrative interpretation is universal. The catalog records names, aliases, source status, boundary policy, and the countries that have no matching principal subdivision shard.

Graflume projects boundaries into a centered equirectangular viewport and automatically fits a selected scope. Country polygons retain compound rings and use even-odd filling so holes remain visible. Natural Earth publishes this dataset in the public domain; pinned source commits and checksums are recorded by the reproducible generators, catalog, manifest, and third-party notice.

Markers use a quiet halo plus an interactive foreground circle. Choropleth countries carry the matched source row for the same mark-level tooltip and data-event behavior. Unrecognized region names and nonnumeric or out-of-range coordinates are skipped rather than guessed.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

GeoJSON input accepts every standard geometry, including recursively nested `GeometryCollection` members. A geographic `clip: [west, south, east, north]` is evaluated after `rotate` and longitude wrapping, matching `projectMapPosition()`: points outside the rectangle are omitted, line entries and exits retain their exact boundary intersections as independent Canvas subpaths, and polygon rings are clipped against all four edges. Multi-line and multi-polygon members use the same rules. Feature tooltip metadata continues to report the authored parent geometry and properties.

Bounds that cross the dateline retain their short unwrapped span for fitting—for example, `west: 179, east: 181` fits two degrees rather than 358. Great-circle routes and other geographic lines split at the antimeridian before projection, so the renderer never joins opposite world edges with a false long segment.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the data geometry makes them meaningful. `oceanFill`, `landFill`, `countryStroke`, and `countryLineWidth` style the basemap independently. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime. Choropleth values interpolate across the active sequential palette.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. The neutral basemap itself is noninteractive; choropleth overlays are interactive compound paths. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

The common inspection viewport can magnify and pan the complete rendered Canvas, including the title, basemap, and labels. `mapScope` and loaded boundary packs control the geographic fit independently; inspection still does not change the projection or request a different boundary shard. See [Common chart interactions](./interactions.md).

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. An unscoped built-in basemap compiles the fixed 177-feature boundary dataset; a country scope compiles only selected built-in boundaries. Loaded boundary sources are lazy, integrity-checked, concurrency-bounded, and cached. Automatic geometry detail reduces coordinate density deterministically but never removes a selected feature, polygon ring, or hole; it fails when the requested budget cannot be met safely. Aggregate or filter very large point, route, and heat datasets before rendering; set `basemap: "none"` when a geographic background is unnecessary.

## Current limitations

None remain in the audited P0/current-limitations boundary as of 2026-08-26. The `current-limitations-2026-08-26` implementation moved these former limitations into executable support:

- source/layer/projection lifecycle
- GeoJSON and TopoJSON
- general fit and clip policy
- flat geodesics
- provider-backed tile lifecycle, cache and attribution

The separately cataloged P1/P2 research roadmap remains future work and is not presented as current runtime support. Exact implementation and test paths are recorded in [the completion evidence](../../catalog/graflume.current-limitations.evidence.json).

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/map.svg)

[Back to chart guides](./README.md)
