# Scatter charts

Use a scatter chart to explore the relationship, clustering, spread, or outliers between two quantitative fields. In Graflume, `scatter()` is an ergonomic alias for the portable `point` mark.

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
    fill: '#8b5cf6',
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
    "fill": "#8b5cf6",
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

The standard profile renders at most 25,000 point marks. Large and ultra profiles apply stronger bounds and disable per-point hit testing. For dense clouds, binning, hexbin, density, or WebGL rendering is planned but not yet implemented.

## Current limitations

- one shared radius and style per point layer;
- no field encoding for color, radius, shape, or opacity;
- no jitter, beeswarm, regression, density, hexbin, or brushing transform;
- no spatial index or GPU picking;
- no native legend/tooltip;
- no WebGL renderer yet.

## Runnable examples and tests

- [chart type gallery](../../examples/cdn/chart-types.html)
- [scatter regression test](../../tests/chart-types.test.mjs)

[Back to chart guides](./README.md)
