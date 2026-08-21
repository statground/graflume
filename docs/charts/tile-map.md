# Tile map

![Current Tile map output](../assets/charts/tile-map.svg)

This page documents the currently implemented **Tile map** family in Graflume `0.1.0-alpha.0`. The image above is generated from the same compiled Scene used by the Canvas renderer.

## When to use it

Use this map chart when the visual relationship represented by **tile map** is more informative than a plain line, bar, or table. Prefer a simpler chart when the extra geometry does not add analytical meaning.

## Quick API

Import the Quick API from the opt-in complete entrypoint:

```ts
import { tileMap } from 'graflume/complete';

const data = [
  {
    x: 0,
    y: 0,
    value: 10.430428503760513,
  },
  {
    x: 1,
    y: 0,
    value: 22.60710064972478,
  },
  {
    x: 2,
    y: 0,
    value: 32.82057616633438,
  },
  {
    x: 3,
    y: 0,
    value: 27.90803476586867,
  },
  {
    x: 4,
    y: 0,
    value: 14.663045869774965,
  },
];

tileMap('#chart', data, {
  x: {
    field: 'x',
    type: 'quantitative',
    title: 'x',
  },
  y: {
    field: 'y',
    type: 'quantitative',
    title: 'y',
  },
  mark: {
    fields: {
      value: 'value',
    },
  },
  title: {
    text: 'Tile map',
    subtitle: 'map · tile-map',
  },
  accessibility: {
    label: 'Tile map example',
    description: 'A compiled tile map example using the tile-map family.',
  },
});
```

## Portable ChartSpec

```json
{
  "data": [
    {
      "x": 0,
      "y": 0,
      "value": 10.430428503760513
    },
    {
      "x": 1,
      "y": 0,
      "value": 22.60710064972478
    },
    {
      "x": 2,
      "y": 0,
      "value": 32.82057616633438
    },
    {
      "x": 3,
      "y": 0,
      "value": 27.90803476586867
    },
    {
      "x": 4,
      "y": 0,
      "value": 14.663045869774965
    }
  ],
  "mark": {
    "type": "tilemap",
    "fields": {
      "value": "value"
    }
  },
  "x": {
    "field": "x",
    "type": "quantitative",
    "title": "x"
  },
  "y": {
    "field": "y",
    "type": "quantitative",
    "title": "y"
  },
  "title": {
    "text": "Tile map",
    "subtitle": "map · tile-map"
  },
  "accessibility": {
    "label": "Tile map example",
    "description": "A compiled tile map example using the tile-map family."
  },
  "axes": {
    "x": false,
    "y": false
  }
}
```

## Canonical mapping

- User-facing family: `tile-map`
- Quick API: `tileMap()`
- Portable mark: `tilemap`
- Canonical family: `tile-map`
- Category: `map`

When the canonical family differs from the user-facing name, the Quick API supplies safe mark defaults and then enters the same normalize, validate, scale, compiler, Scene, renderer, interaction, and accessibility path. No parallel rendering engine is created.

## Data, ordering, and missing values

Longitude and latitude are quantitative `x` and `y` fields. Routes add destination coordinates, and intensity or size uses a named value field. Input order is preserved unless the mark explicitly documents a deterministic sort. Missing required values skip only the affected row; invalid specs still fail validation before compilation.

## Implemented rendering behavior

Maps scalar rows into equal-area square, circle, diamond, or hexagonal tiles. The output uses only groups, paths, lines, rectangles, circles, and text, so Canvas, snapshots, export adapters, and future renderers share the same geometry contract.

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
