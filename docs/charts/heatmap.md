# Heatmaps

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `heatmap` family. Its canonical Quick API is `heatmap()` from `graflume/complete`, and its representative portable mark is `heatmap`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name               | Quick API   | Mode       | Portable mark | Functional difference                                        |
| ----------------------------- | ----------- | ---------- | ------------- | ------------------------------------------------------------ |
| [Heatmap](#variant-heatmap)   | `heatmap()` | `default`  | `heatmap`     | Uses a rectangular value matrix.                             |
| [Tile map](#variant-tile-map) | `tileMap()` | `tile-map` | `tilemap`     | Uses equal-area square, circle, diamond, or hexagonal tiles. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                            |                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **[Heatmap](#variant-heatmap)**<br>[![Current Heatmap output](../assets/charts/heatmap.svg)](../assets/charts/heatmap.svg) | **[Tile map](#variant-tile-map)**<br>[![Current Tile map output](../assets/charts/tile-map.svg)](../assets/charts/tile-map.svg) |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-heatmap"></a>

### Heatmap

Use this preset when two discrete dimensions and one value should be scanned as a matrix. Uses a rectangular value matrix.

- **Quick API:** `heatmap()`
- **Mode:** `default`
- **Portable mark:** `heatmap`
- **Required example fields:** `x`, `y`

```js
import { heatmap } from 'graflume/complete';

const data = [
  {
    x: 0,
    y: 0,
  },
  {
    x: 1,
    y: 0,
  },
  {
    x: 2,
    y: 0,
  },
  {
    x: 3,
    y: 0,
  },
];

heatmap('#chart', data, {
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
  title: {
    text: 'Heatmap',
    subtitle: 'heatmap family · default mode',
  },
  accessibility: {
    label: 'Heatmap example',
    description: 'A compiled heatmap example using the heatmap family.',
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Heatmap',
      fields: [
        {
          field: 'x',
          label: 'x',
          format: 'number',
        },
        {
          field: 'y',
          label: 'y',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-tile-map"></a>

### Tile map

Use this preset when two discrete dimensions and one value should be scanned as a matrix. Uses equal-area square, circle, diamond, or hexagonal tiles.

- **Quick API:** `tileMap()`
- **Mode:** `tile-map`
- **Portable mark:** `tilemap`
- **Required example fields:** `x`, `y`, `value`

```js
import { tileMap } from 'graflume/complete';

const data = [
  {
    x: 0,
    y: 0,
    value: 10.43,
  },
  {
    x: 1,
    y: 0,
    value: 22.607,
  },
  {
    x: 2,
    y: 0,
    value: 32.821,
  },
  {
    x: 3,
    y: 0,
    value: 27.908,
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
  title: {
    text: 'Tile map',
    subtitle: 'heatmap family · tile-map mode',
  },
  accessibility: {
    label: 'Tile map example',
    description: 'A compiled tile map example using the heatmap family.',
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
      title: 'Tile map',
      fields: [
        {
          field: 'x',
          label: 'x',
          format: 'number',
        },
        {
          field: 'y',
          label: 'y',
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

<!-- FAMILY_PRESETS_END -->

[Back to the chart guide index](./README.md)

![Current Graflume heatmaps output](../assets/charts/heatmap.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a heatmap to show intensity across two categorical dimensions.

## Data contract

`x` and `y` identify categorical cells. `mark.fields.value` or the primary `y` field supplies the numeric intensity; using a distinct value field is recommended.

### Named fields

`value` defaults to a field named `value`. The first-seen x and y categories determine cell order.

### Portable options

`labels: false` hides in-cell values. `cellGap` controls the clear space between neighboring cells and defaults to `1` pixel for the regular categorical matrix. Sequential colors are interpolated from the active theme and text contrast is chosen automatically. The analytical matrix contract accepts `colorMode` (`sequential`, `diverging`, `log`, `symlog`, or `quantile`), optional `midpoint`, authored `rowOrder`/`columnOrder`, and `missing: { color, pattern }`. `fields.x0`, `x1`, `y0`, and `y1` opt into irregular numeric cell extents. A function-free `brush` can filter rows, columns, and a two-value range; matching cells expose `brushed: true` and stable linked selection keys.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { heatmap } from 'graflume/complete';

heatmap('#chart', cells, {
  x: { field: 'day', type: 'ordinal' },
  y: { field: 'period', type: 'ordinal' },
  mark: { fields: { value: 'activity' }, options: { labels: true } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'heatmap'`.

## Rendering behavior

The regular compiler creates a band cell for each valid row. When analytical matrix options are authored, long-form rows are pivoted through one row/column matrix, missing combinations are retained explicitly, irregular extents are mapped into the plot, and each rendered rectangle reports its data extent, color position, missing pattern, brush state, and selection key.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Each cell retains its source row and has contrast-aware text when large enough. Provide a table fallback and describe the scale direction and strongest cells.

## Performance

Scene cost is linear in populated cells. Very dense matrices should use tiled aggregation and a WebGL renderer package.

## Current limitations

None remain in the audited P0/current-limitations boundary as of 2026-08-26. The `current-limitations-2026-08-26` implementation moved these former limitations into executable support:

- pivot/matrix input
- irregular extents
- explicit missing-value pattern
- diverging/log/symlog/quantile color
- brush

The separately cataloged P1/P2 research roadmap remains future work and is not presented as current runtime support. Exact implementation and test paths are recorded in [the completion evidence](../../catalog/graflume.current-limitations.evidence.json).
