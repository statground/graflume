# Area charts

Use an area chart to show an ordered trend while emphasizing magnitude relative to a baseline. The current Graflume area mark fills a single line down to zero.

## Implemented appearance

This snapshot shows the current zero-baseline polygon, fill opacity, outline, axes, and title layout.

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
    fill: '#99f6e4',
    stroke: '#0f766e',
    lineWidth: 2.5,
    opacity: 0.78,
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
    fill: '#99f6e4',
    stroke: '#0f766e',
    opacity: 0.78,
  },
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'visitors', type: 'quantitative' },
});
```

## Baseline and data behavior

- The area mark always includes zero in the y domain.
- Valid top-line points are closed to the zero baseline at the first and last x positions.
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
      mark: { type: 'area', fill: '#bfdbfe', opacity: 0.7 },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    {
      id: 'points',
      mark: { type: 'point', fill: '#2563eb', radius: 4 },
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
