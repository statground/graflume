# Area charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `area` family. Its canonical Quick API is `area()` from `graflume`, and its representative portable mark is `area`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name    | Quick API       | Mode          | Portable mark  | Functional difference                                          |
| ------------------ | --------------- | ------------- | -------------- | -------------------------------------------------------------- |
| Area chart         | `area()`        | `default`     | `area`         | Fills an ordered series to its baseline.                       |
| Stepped area chart | `steppedArea()` | `stepped`     | `stepped-area` | Uses horizontal and vertical steps instead of direct segments. |
| Theme river chart  | `themeRiver()`  | `stream`      | `theme-river`  | Centers stacked category bands around a shared baseline.       |
| Smooth area chart  | `areaSpline()`  | `area-spline` | `smooth`       | Uses a sampled smooth upper path with an area fill.            |
| Polygon chart      | `polygon()`     | `polygon`     | `polygon`      | Closes ordered coordinates into a filled polygon.              |
| Streamgraph        | `streamgraph()` | `streamgraph` | `theme-river`  | Uses the centered multi-series stream presentation.            |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 6 compiled preset snapshots</summary>

| Preset             | Current compiled output                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Area chart         | [![Current Area chart output](../assets/charts/area.svg)](../assets/charts/area.svg)                         |
| Stepped area chart | [![Current Stepped area chart output](../assets/charts/stepped-area.svg)](../assets/charts/stepped-area.svg) |
| Theme river chart  | [![Current Theme river chart output](../assets/charts/theme-river.svg)](../assets/charts/theme-river.svg)    |
| Smooth area chart  | [![Current Smooth area chart output](../assets/charts/area-spline.svg)](../assets/charts/area-spline.svg)    |
| Polygon chart      | [![Current Polygon chart output](../assets/charts/polygon.svg)](../assets/charts/polygon.svg)                |
| Streamgraph        | [![Current Streamgraph output](../assets/charts/streamgraph.svg)](../assets/charts/streamgraph.svg)          |

</details>
<!-- FAMILY_PRESETS_END -->
Use an area chart to show an ordered trend while emphasizing magnitude relative to a baseline. The current Graflume area mark fills a single line down to zero.

## Implemented appearance

This snapshot shows the current zero-baseline fill, separate crisp top line, quiet axes, and title layout. The baseline is no longer outlined as part of the area stroke.

![Graflume area chart showing monthly visitors as a teal area filled to zero](../assets/charts/area.svg)

## Quick API

```ts
import { area } from 'graflume';

const chart = area('#chart', data, {
  title: 'Monthly visitors',
  x: { field: 'month', type: 'ordinal', axis: { grid: false } },
  y: {
    field: 'visitors',
    type: 'quantitative',
    title: 'Visitors (thousands)',
    scale: { zero: true, nice: true },
  },
  mark: {
    fill: '#ccfbf1',
    stroke: '#0f766e',
    lineWidth: 2.5,
    opacity: 0.9,
  },
  accessibility: {
    label: 'Monthly visitors area chart',
    description: 'The filled area shows visitor growth from January through June.',
  },
});
```

## Portable ChartSpec

```ts
Graflume.create('#chart', {
  specVersion: '0.1',
  data,
  mark: {
    type: 'area',
    fill: '#ccfbf1',
    stroke: '#0f766e',
    opacity: 0.9,
  },
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'visitors', type: 'quantitative' },
});
```

## Baseline and data behavior

- The area mark always includes zero in the y domain.
- Valid top-line points form a fill polygon closed to zero plus a separate open stroke path.
- Input-row order determines the top-line order; data is not sorted automatically.
- Invalid x/y pairs are omitted. The current single polygon may bridge across omitted rows, so pre-filter or split discontinuous data into explicit layers.
- Min/max sampling uses the line-point performance budget.

## Interaction

The filled polygon does not currently expose per-row datum hit targets. For hover or click details, overlay a point or line-with-points layer:

```ts
Graflume.create('#chart', {
  data,
  layers: [
    {
      id: 'area',
      mark: { type: 'area', fill: '#dbeafe', opacity: 0.85 },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    {
      id: 'points',
      mark: { type: 'point', fill: '#4f46e5', radius: 4 },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
});
```

## Current limitations

- zero baseline only;
- no stacked, normalized, streamgraph, or between-two-lines area;
- one closed polygon per area layer;
- missing rows do not create separate area segments;
- no area-level datum hit testing or native tooltip;
- no SVG/WebGL renderer parity yet.

## Runnable examples and tests

- [chart type gallery](../../examples/cdn/chart-types.html)
- [area regression test](../../tests/chart-types.test.mjs)

[Back to chart guides](./README.md)
