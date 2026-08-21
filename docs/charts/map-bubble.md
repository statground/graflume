# Map bubble chart

![Current Map bubble chart output](../assets/charts/map-bubble.svg)

This page documents the currently implemented **Map bubble chart** family in Graflume `0.1.0-alpha.0`. The image above is generated from the same compiled Scene used by the Canvas renderer.

## When to use it

Use this map chart when the visual relationship represented by **map bubble chart** is more informative than a plain line, bar, or table. Prefer a simpler chart when the extra geometry does not add analytical meaning.

## Quick API

Import the Quick API from the opt-in complete entrypoint:

```ts
import { mapBubble } from 'graflume/complete';

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
  mark: {
    fields: {
      size: 'value',
    },
  },
  title: {
    text: 'Map bubble chart',
    subtitle: 'map · map',
  },
  accessibility: {
    label: 'Map bubble chart example',
    description: 'A compiled map bubble chart example using the map family.',
  },
});
```

## Portable ChartSpec

```json
{
  "data": [
    {
      "longitude": 126.98,
      "latitude": 37.57,
      "longitude2": 37.62,
      "latitude2": 55.75,
      "value": 72
    },
    {
      "longitude": -74,
      "latitude": 40.71,
      "longitude2": 2.35,
      "latitude2": 48.86,
      "value": 55
    },
    {
      "longitude": 139.69,
      "latitude": 35.68,
      "longitude2": 151.21,
      "latitude2": -33.87,
      "value": 43
    }
  ],
  "mark": {
    "type": "map",
    "fields": {
      "size": "value"
    }
  },
  "x": {
    "field": "longitude",
    "type": "quantitative",
    "title": "longitude"
  },
  "y": {
    "field": "latitude",
    "type": "quantitative",
    "title": "latitude"
  },
  "title": {
    "text": "Map bubble chart",
    "subtitle": "map · map"
  },
  "accessibility": {
    "label": "Map bubble chart example",
    "description": "A compiled map bubble chart example using the map family."
  },
  "axes": {
    "x": false,
    "y": false
  }
}
```

## Canonical mapping

- User-facing family: `map-bubble`
- Quick API: `mapBubble()`
- Portable mark: `map`
- Canonical family: `map`
- Category: `map`

When the canonical family differs from the user-facing name, the Quick API supplies safe mark defaults and then enters the same normalize, validate, scale, compiler, Scene, renderer, interaction, and accessibility path. No parallel rendering engine is created.

## Data, ordering, and missing values

Longitude and latitude are quantitative `x` and `y` fields. Routes add destination coordinates, and intensity or size uses a named value field. Input order is preserved unless the mark explicitly documents a deterministic sort. Missing required values skip only the affected row; invalid specs still fail validation before compilation.

## Implemented rendering behavior

Reuses the canonical geographic point compiler, including optional value-scaled bubbles. The output uses only groups, paths, lines, rectangles, circles, and text, so Canvas, snapshots, export adapters, and future renderers share the same geometry contract.

## Styling

Common `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` properties override theme defaults when the geometry supports them. Mark-specific function-free values live under `mark.options`. Themes remain responsible for background, text, grid, focus, categorical, sequential, and diverging tokens.

## Interaction and hit testing

Rendered datum shapes keep `layerId`, `rowIndex`, and the source row. Standard mode enables hit testing; large and ultra profiles may disable per-mark hit testing. Decorative grid, shadow, depth, label, and arrowhead nodes do not create duplicate datum targets.

## Accessibility

Provide a concise `accessibility.label` and a description of the main pattern. Canvas output should be paired with the runtime data-table fallback. Do not encode a required distinction only with color, depth, angle, or area.

## Performance

Scene cost is linear in rows for ordinary cases. Relationship crossings, repeated symbols, sampled curves, dense labels, and multi-line indicators can produce more than one node per row. Use `auto`, `large`, or `ultra` with aggregation when row counts grow beyond the analytical value of individual marks.

## Current limitations

This alpha implementation covers the documented data meaning and Scene output. Domain-specific editing tools, animation choreography, and very-large-data GPU paths remain separate follow-up work.

## Runnable references

- Snapshot generator: [`scripts/render-series-chart-snapshots.mjs`](../../scripts/render-series-chart-snapshots.mjs)
- Catalog test: [`tests/series-chart-types.test.mjs`](../../tests/series-chart-types.test.mjs)
- Complete CDN gallery: [`examples/cdn/series-chart-types.html`](../../examples/cdn/series-chart-types.html)
