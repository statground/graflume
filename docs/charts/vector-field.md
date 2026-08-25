# Vector field chart

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `vector-field` family. Its canonical Quick API is `vectorField()` from `graflume/complete`, and its representative portable mark is `vector`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                       | Quick API    | Mode        | Portable mark | Functional difference                                           |
| ------------------------------------- | ------------ | ----------- | ------------- | --------------------------------------------------------------- |
| [Vector field chart](#variant-vector) | `vector()`   | `vector`    | `vector`      | Draws direction and magnitude as arrow shafts and heads.        |
| [Wind barb chart](#variant-wind-barb) | `windBarb()` | `wind-barb` | `wind-barb`   | Converts speed and direction into meteorological barb feathers. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                               |                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[Vector field chart](#variant-vector)**<br>[![Current Vector field chart output](../assets/charts/vector.svg)](../assets/charts/vector.svg) | **[Wind barb chart](#variant-wind-barb)**<br>[![Current Wind barb chart output](../assets/charts/wind-barb.svg)](../assets/charts/wind-barb.svg) |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-vector"></a>

### Vector field chart

Use this preset when direction and magnitude must be read at each coordinate. Draws direction and magnitude as arrow shafts and heads.

- **Quick API:** `vector()`
- **Mode:** `vector`
- **Portable mark:** `vector`
- **Required example fields:** `value`, `high`, `direction`, `magnitude`

```js
import { vector } from 'graflume/complete';

const data = [
  {
    value: 24,
    high: 33,
    direction: 0,
    magnitude: 5,
  },
  {
    value: 29.916,
    high: 34.1,
    direction: 37,
    magnitude: 8,
  },
  {
    value: 33.54,
    high: 35.2,
    direction: 74,
    magnitude: 11,
  },
  {
    value: 33.72,
    high: 36.3,
    direction: 111,
    magnitude: 14,
  },
];

vector('#chart', data, {
  x: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  y: {
    field: 'high',
    type: 'quantitative',
    title: 'high',
  },
  title: {
    text: 'Vector field chart',
    subtitle: 'vector-field family · vector mode',
  },
  accessibility: {
    label: 'Vector field chart example',
    description: 'A compiled vector field chart example using the vector-field family.',
  },
  mark: {
    fields: {
      direction: 'direction',
      magnitude: 'magnitude',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Vector field chart',
      fields: [
        {
          field: 'value',
          label: 'value',
          format: 'number',
        },
        {
          field: 'high',
          label: 'high',
          format: 'number',
        },
        {
          field: 'direction',
          label: 'Direction',
          format: 'number',
        },
        {
          field: 'magnitude',
          label: 'Magnitude',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-wind-barb"></a>

### Wind barb chart

Use this preset when direction and magnitude must be read at each coordinate. Converts speed and direction into meteorological barb feathers.

- **Quick API:** `windBarb()`
- **Mode:** `wind-barb`
- **Portable mark:** `wind-barb`
- **Required example fields:** `value`, `high`, `speed`, `direction`

```js
import { windBarb } from 'graflume/complete';

const data = [
  {
    value: 24,
    high: 33,
    speed: 10,
    direction: 0,
  },
  {
    value: 29.916,
    high: 34.1,
    speed: 13,
    direction: 37,
  },
  {
    value: 33.54,
    high: 35.2,
    speed: 16,
    direction: 74,
  },
  {
    value: 33.72,
    high: 36.3,
    speed: 19,
    direction: 111,
  },
];

windBarb('#chart', data, {
  x: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  y: {
    field: 'high',
    type: 'quantitative',
    title: 'high',
  },
  title: {
    text: 'Wind barb chart',
    subtitle: 'vector-field family · wind-barb mode',
  },
  accessibility: {
    label: 'Wind barb chart example',
    description: 'A compiled wind barb chart example using the vector-field family.',
  },
  mark: {
    fields: {
      speed: 'speed',
      direction: 'direction',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Wind barb chart',
      fields: [
        {
          field: 'value',
          label: 'value',
          format: 'number',
        },
        {
          field: 'high',
          label: 'high',
          format: 'number',
        },
        {
          field: 'speed',
          label: 'Speed',
          format: 'number',
        },
        {
          field: 'direction',
          label: 'Direction',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

![Current Vector field chart output](../assets/charts/vector-field.svg)

This page documents the currently implemented **Vector field chart** family in Graflume `0.1.0-alpha.0`. The image above is generated from the same compiled Scene used by the Canvas renderer.

## When to use it

Use this cartesian chart when the visual relationship represented by **vector field chart** is more informative than a plain line, bar, or table. Prefer a simpler chart when the extra geometry does not add analytical meaning.

## Quick API

Import the Quick API from the opt-in complete entrypoint:

```ts
import { vectorField } from 'graflume/complete';

const data = [
  {
    date: '2026-01-01',
    category: 'P1',
    value: 24,
    low: 14,
    high: 33,
    lower: 16,
    upper: 31,
    target: 29,
    width: 3,
    radius: 9,
    z: 5,
    direction: 0,
    magnitude: 5,
    speed: 10,
    signal: 20,
    secondary: 18,
    up: 42,
    down: 66,
    plus: 25,
    minus: 34,
    conversion: 21,
    base: 19,
    support: 14,
    resistance: 34,
    volume: 120,
    price: 24,
    title: 'A',
    open: 22,
    close: 25,
  },
  {
    date: '2026-02-01',
    category: 'P2',
    value: 29.915692703800314,
    low: 14.8,
    high: 34.1,
    lower: 16.8,
    upper: 32,
    target: 30,
    width: 4,
    radius: 11,
    z: 6,
    direction: 37,
    magnitude: 8,
    speed: 13,
    signal: 21.2,
    secondary: 19,
    up: 44,
    down: 64,
    plus: 26,
    minus: 33.4,
    conversion: 22,
    base: 19.9,
    support: 14.8,
    resistance: 35,
    volume: 151,
    price: 25.2,
    title: 'B',
    open: 23,
    close: 22,
  },
  {
    date: '2026-03-01',
    category: 'P3',
    value: 33.5402084373418,
    low: 15.6,
    high: 35.2,
    lower: 17.6,
    upper: 33,
    target: 31,
    width: 5,
    radius: 13,
    z: 7,
    direction: 74,
    magnitude: 11,
    speed: 16,
    signal: 22.4,
    secondary: 20,
    up: 46,
    down: 62,
    plus: 27,
    minus: 32.8,
    conversion: 23,
    base: 20.8,
    support: 15.6,
    resistance: 36,
    volume: 182,
    price: 26.4,
    title: 'C',
    open: 24,
    close: 27,
  },
  {
    date: '2026-04-01',
    category: 'P4',
    value: 33.719684225450784,
    low: 16.4,
    high: 36.3,
    lower: 18.4,
    upper: 34,
    target: 32,
    width: 6,
    radius: 15,
    z: 8,
    direction: 111,
    magnitude: 14,
    speed: 19,
    signal: 23.6,
    secondary: 21,
    up: 48,
    down: 60,
    plus: 28,
    minus: 32.2,
    conversion: 24,
    base: 21.7,
    support: 16.4,
    resistance: 37,
    volume: 213,
    price: 27.6,
    title: 'D',
    open: 25,
    close: 24,
  },
  {
    date: '2026-05-01',
    category: 'P5',
    value: 31.010335447627774,
    low: 17.2,
    high: 37.4,
    lower: 19.2,
    upper: 35,
    target: 33,
    width: 3,
    radius: 17,
    z: 9,
    direction: 148,
    magnitude: 17,
    speed: 22,
    signal: 24.8,
    secondary: 22,
    up: 50,
    down: 58,
    plus: 29,
    minus: 31.6,
    conversion: 25,
    base: 22.6,
    support: 17.2,
    resistance: 38,
    volume: 244,
    price: 28.8,
    title: 'E',
    open: 26,
    close: 29,
  },
];

vectorField('#chart', data, {
  x: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  y: {
    field: 'high',
    type: 'quantitative',
    title: 'high',
  },
  mark: {
    fields: {
      direction: 'direction',
      magnitude: 'magnitude',
    },
  },
  title: {
    text: 'Vector field chart',
    subtitle: 'cartesian · vector-field',
  },
  accessibility: {
    label: 'Vector field chart example',
    description: 'A compiled vector field chart example using the vector-field family.',
  },
});
```

## Portable ChartSpec

```json
{
  "data": [
    {
      "date": "2026-01-01",
      "category": "P1",
      "value": 24,
      "low": 14,
      "high": 33,
      "lower": 16,
      "upper": 31,
      "target": 29,
      "width": 3,
      "radius": 9,
      "z": 5,
      "direction": 0,
      "magnitude": 5,
      "speed": 10,
      "signal": 20,
      "secondary": 18,
      "up": 42,
      "down": 66,
      "plus": 25,
      "minus": 34,
      "conversion": 21,
      "base": 19,
      "support": 14,
      "resistance": 34,
      "volume": 120,
      "price": 24,
      "title": "A",
      "open": 22,
      "close": 25
    },
    {
      "date": "2026-02-01",
      "category": "P2",
      "value": 29.915692703800314,
      "low": 14.8,
      "high": 34.1,
      "lower": 16.8,
      "upper": 32,
      "target": 30,
      "width": 4,
      "radius": 11,
      "z": 6,
      "direction": 37,
      "magnitude": 8,
      "speed": 13,
      "signal": 21.2,
      "secondary": 19,
      "up": 44,
      "down": 64,
      "plus": 26,
      "minus": 33.4,
      "conversion": 22,
      "base": 19.9,
      "support": 14.8,
      "resistance": 35,
      "volume": 151,
      "price": 25.2,
      "title": "B",
      "open": 23,
      "close": 22
    },
    {
      "date": "2026-03-01",
      "category": "P3",
      "value": 33.5402084373418,
      "low": 15.6,
      "high": 35.2,
      "lower": 17.6,
      "upper": 33,
      "target": 31,
      "width": 5,
      "radius": 13,
      "z": 7,
      "direction": 74,
      "magnitude": 11,
      "speed": 16,
      "signal": 22.4,
      "secondary": 20,
      "up": 46,
      "down": 62,
      "plus": 27,
      "minus": 32.8,
      "conversion": 23,
      "base": 20.8,
      "support": 15.6,
      "resistance": 36,
      "volume": 182,
      "price": 26.4,
      "title": "C",
      "open": 24,
      "close": 27
    },
    {
      "date": "2026-04-01",
      "category": "P4",
      "value": 33.719684225450784,
      "low": 16.4,
      "high": 36.3,
      "lower": 18.4,
      "upper": 34,
      "target": 32,
      "width": 6,
      "radius": 15,
      "z": 8,
      "direction": 111,
      "magnitude": 14,
      "speed": 19,
      "signal": 23.6,
      "secondary": 21,
      "up": 48,
      "down": 60,
      "plus": 28,
      "minus": 32.2,
      "conversion": 24,
      "base": 21.7,
      "support": 16.4,
      "resistance": 37,
      "volume": 213,
      "price": 27.6,
      "title": "D",
      "open": 25,
      "close": 24
    },
    {
      "date": "2026-05-01",
      "category": "P5",
      "value": 31.010335447627774,
      "low": 17.2,
      "high": 37.4,
      "lower": 19.2,
      "upper": 35,
      "target": 33,
      "width": 3,
      "radius": 17,
      "z": 9,
      "direction": 148,
      "magnitude": 17,
      "speed": 22,
      "signal": 24.8,
      "secondary": 22,
      "up": 50,
      "down": 58,
      "plus": 29,
      "minus": 31.6,
      "conversion": 25,
      "base": 22.6,
      "support": 17.2,
      "resistance": 38,
      "volume": 244,
      "price": 28.8,
      "title": "E",
      "open": 26,
      "close": 29
    }
  ],
  "mark": {
    "type": "vector",
    "fields": {
      "direction": "direction",
      "magnitude": "magnitude"
    }
  },
  "x": {
    "field": "value",
    "type": "quantitative",
    "title": "value"
  },
  "y": {
    "field": "high",
    "type": "quantitative",
    "title": "high"
  },
  "title": {
    "text": "Vector field chart",
    "subtitle": "cartesian · vector-field"
  },
  "accessibility": {
    "label": "Vector field chart example",
    "description": "A compiled vector field chart example using the vector-field family."
  }
}
```

## Canonical mapping

- User-facing family: `vector-field`
- Quick API: `vectorField()`
- Portable mark: `vector`
- Canonical family: `vector-field`
- Category: `cartesian`

The family API and every compatible preset enter the same normalize, validate, scale, compiler, Scene, renderer, interaction, and accessibility path. No parallel rendering engine is created.

## Data, ordering, and missing values

The primary `x` and `y` encodings locate rows. Additional quantitative channels are named in `mark.fields`, and rows with missing required coordinates are skipped. Input order is preserved unless the mark explicitly documents a deterministic sort. Missing required values skip only the affected row; invalid specs still fail validation before compilation.

## Implemented rendering behavior

Converts direction and magnitude fields into arrow shafts and heads at each coordinate. The output uses only groups, paths, lines, rectangles, circles, and text, so Canvas, snapshots, export adapters, and future renderers share the same geometry contract.

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
