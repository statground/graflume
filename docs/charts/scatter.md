# Scatter charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `scatter` family. Its canonical Quick API is `scatter()` from `graflume`, and its representative portable mark is `point`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                                 | Quick API         | Mode         | Portable mark    | Functional difference                                 |
| ----------------------------------------------- | ----------------- | ------------ | ---------------- | ----------------------------------------------------- |
| [Scatter chart](#variant-scatter)               | `scatter()`       | `default`    | `point`          | Uses ordinary coordinate points.                      |
| [Effect scatter chart](#variant-effect-scatter) | `effectScatter()` | `emphasis`   | `effect-scatter` | Adds a portable emphasis halo to selected points.     |
| [Three-axis scatter chart](#variant-scatter-3d) | `scatter3d()`     | `scatter-3d` | `scatter-3d`     | Projects a third channel into portable 2D depth cues. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                                                       |                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Scatter chart](#variant-scatter)**<br>[![Current Scatter chart output](../assets/charts/scatter.svg)](../assets/charts/scatter.svg)                                | **[Effect scatter chart](#variant-effect-scatter)**<br>[![Current Effect scatter chart output](../assets/charts/effect-scatter.svg)](../assets/charts/effect-scatter.svg) |
| **[Three-axis scatter chart](#variant-scatter-3d)**<br>[![Current Three-axis scatter chart output](../assets/charts/scatter-3d.svg)](../assets/charts/scatter-3d.svg) |                                                                                                                                                                           |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-scatter"></a>

### Scatter chart

Use this preset when the relationship between quantitative coordinates must be inspected. Uses ordinary coordinate points.

- **Quick API:** `scatter()`
- **Mode:** `default`
- **Portable mark:** `point`
- **Required example fields:** `x`, `y`

```js
import { scatter } from 'graflume';

const data = [
  {
    x: 12,
    y: 42,
  },
  {
    x: 24,
    y: 55,
  },
  {
    x: 38,
    y: 33,
  },
  {
    x: 51,
    y: 68,
  },
];

scatter('#chart', data, {
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
    text: 'Scatter chart',
    subtitle: 'scatter family · default mode',
  },
  accessibility: {
    label: 'Scatter chart example',
    description: 'A compiled scatter chart example using the scatter family.',
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Scatter chart',
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

<a id="variant-effect-scatter"></a>

### Effect scatter chart

Use this preset when the relationship between quantitative coordinates must be inspected. Adds a portable emphasis halo to selected points.

- **Quick API:** `effectScatter()`
- **Mode:** `emphasis`
- **Portable mark:** `effect-scatter`
- **Required example fields:** `x`, `y`, `size`, `group`

```js
import { effectScatter } from 'graflume/complete';

const data = [
  {
    x: 12,
    y: 42,
    size: 20,
    group: 'A',
  },
  {
    x: 24,
    y: 55,
    size: 85,
    group: 'B',
  },
  {
    x: 38,
    y: 33,
    size: 55,
    group: 'A',
  },
  {
    x: 51,
    y: 68,
    size: 120,
    group: 'C',
  },
];

effectScatter('#chart', data, {
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
    text: 'Effect scatter chart',
    subtitle: 'scatter family · emphasis mode',
  },
  accessibility: {
    label: 'Effect scatter chart example',
    description: 'A compiled effect scatter chart example using the scatter family.',
  },
  mark: {
    fields: {
      size: 'size',
      color: 'group',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Effect scatter chart',
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
          field: 'size',
          label: 'Size',
          format: 'number',
        },
        {
          field: 'group',
          label: 'Group',
          format: 'auto',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-scatter-3d"></a>

### Three-axis scatter chart

Use this preset when the relationship between quantitative coordinates must be inspected. Projects a third channel into portable 2D depth cues.

- **Quick API:** `scatter3d()`
- **Mode:** `scatter-3d`
- **Portable mark:** `scatter-3d`
- **Required example fields:** `value`, `high`, `z`

```js
import { scatter3d } from 'graflume/complete';

const data = [
  {
    value: 24,
    high: 33,
    z: 5,
  },
  {
    value: 29.916,
    high: 34.1,
    z: 6,
  },
  {
    value: 33.54,
    high: 35.2,
    z: 7,
  },
  {
    value: 33.72,
    high: 36.3,
    z: 8,
  },
];

scatter3d('#chart', data, {
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
    text: 'Three-axis scatter chart',
    subtitle: 'scatter family · scatter-3d mode',
  },
  accessibility: {
    label: 'Three-axis scatter chart example',
    description: 'A compiled three-axis scatter chart example using the scatter family.',
  },
  mark: {
    fields: {
      z: 'z',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Three-axis scatter chart',
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
          field: 'z',
          label: 'Z',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

Use a scatter chart to explore the relationship, clustering, spread, or outliers between two quantitative fields. In Graflume, `scatter()` is an ergonomic alias for the portable `point` mark.

## Implemented appearance

The current point compiler renders one circle for every valid x/y pair. This snapshot uses the same canonical `point` mark produced by `scatter()`.

![Graflume scatter chart showing eight purple points for study time and score](../assets/charts/scatter.svg)

## Quick API

```ts
import { scatter } from 'graflume';

const chart = scatter('#chart', data, {
  title: 'Study time and score',
  x: {
    field: 'hours',
    type: 'quantitative',
    title: 'Study time (hours)',
    scale: { zero: true, nice: true },
  },
  y: {
    field: 'score',
    type: 'quantitative',
    title: 'Score',
    scale: { zero: false, nice: true },
  },
  mark: {
    fill: '#7c3aed',
    stroke: '#ffffff',
    lineWidth: 2,
    radius: 7,
    opacity: 0.88,
  },
});
```

`point()` accepts the same options:

```ts
import { point } from 'graflume';

point('#chart', data, options);
```

## Portable ChartSpec

There is no `scatter` portable mark in `ChartSpec 0.1`. Serialize the chart as `point`:

```json
{
  "specVersion": "0.1",
  "data": [
    { "hours": 1, "score": 52 },
    { "hours": 2.5, "score": 64 },
    { "hours": 4, "score": 79 }
  ],
  "mark": {
    "type": "point",
    "fill": "#7c3aed",
    "radius": 7
  },
  "x": { "field": "hours", "type": "quantitative" },
  "y": { "field": "score", "type": "quantitative" }
}
```

This keeps browser, server, AI, and future Python/R/Java builders on one canonical contract.

## Data behavior

- A circle is rendered for each row with valid, mappable x and y values.
- Rows with a missing or invalid pair are skipped without changing the original row indices.
- Quantitative x/y fields are the standard scatter configuration; temporal fields are also accepted by the shared scale runtime.
- `scale.zero` is opt-in for points, allowing a focused observed domain by default.
- Point order follows input order, but visual position is determined by the scales.

## Interaction and large data

Each circle is a structured hover/click target in the standard profile:

```ts
chart.on('hover', ({ hit }) => {
  if (hit) console.log(hit.datum.rowIndex, hit.datum.datum);
});
```

The standard profile renders at most 25,000 point marks. Its opt-in mark tooltip uses the same exact circle targets. Large and ultra profiles apply stronger bounds and disable per-point hit testing. For dense clouds, binning, hexbin, density, or WebGL rendering is planned but not yet implemented.

## Current limitations

None remain in the audited P0/current-limitations boundary as of 2026-08-26. The `current-limitations-2026-08-26` implementation moved these former limitations into executable support:

- color/radius/shape/opacity encodings
- brush/lasso/polygon selection
- data-domain navigation
- spatial index and WebGL dispatch

The separately cataloged P1/P2 research roadmap remains future work and is not presented as current runtime support. Exact implementation and test paths are recorded in [the completion evidence](../../catalog/graflume.current-limitations.evidence.json).

## Runnable examples and tests

- [chart type gallery](../../examples/cdn/chart-types.html)
- [scatter regression test](../../tests/chart-types.test.mjs)

[Back to chart guides](./README.md)
