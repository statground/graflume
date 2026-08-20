# Bar charts

Use a bar chart to compare quantitative values across discrete categories. Graflume currently implements vertical bars, negative/positive values around a zero baseline, grouped bar layers, styling, sampling, and rectangle hit testing.

## Quick API

```ts
import { bar } from 'graflume';

const chart = bar('#chart', data, {
  title: 'Monthly sales',
  x: {
    field: 'month',
    type: 'ordinal',
    title: 'Month',
    axis: { grid: false },
  },
  y: {
    field: 'sales',
    type: 'quantitative',
    title: 'Sales',
    scale: { zero: true, nice: true },
  },
  mark: {
    fill: '#2563eb',
    stroke: '#1d4ed8',
    lineWidth: 1,
    cornerRadius: 8,
    opacity: 0.94,
  },
  accessibility: {
    label: 'Monthly sales bar chart',
    description: 'Three bars compare sales for January, February, and March.',
  },
});
```

## Portable ChartSpec

```ts
const spec = {
  specVersion: '0.1',
  data,
  mark: { type: 'bar', fill: '#2563eb', cornerRadius: 8 },
  x: { field: 'month', type: 'ordinal' },
  y: {
    field: 'sales',
    type: 'quantitative',
    scale: { zero: true, nice: true },
  },
};

Graflume.create('#chart', spec);
```

`Graflume.bar()` compiles to this same portable `bar` mark.

## Data behavior

- The typical x encoding is `ordinal` or `nominal`.
- The y encoding must be quantitative or temporal in the initial runtime.
- Bar domains include zero automatically, even when `scale.zero` is omitted.
- Positive and negative values extend in opposite directions from the zero baseline.
- Rows with missing or non-mappable x/y pairs are skipped.
- Input category order is preserved unless an explicit categorical domain is supplied.

## Grouped bars

Set `position: 'group'` on every bar layer that should occupy a separate slot.

```ts
Graflume.create('#chart', {
  data: [
    { month: 'Jan', plan: 38, actual: 42 },
    { month: 'Feb', plan: 47, actual: 51 },
    { month: 'Mar', plan: 52, actual: 49 },
  ],
  layers: [
    {
      id: 'plan',
      mark: { type: 'bar', position: 'group', fill: '#8b5cf6' },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'plan', type: 'quantitative' },
    },
    {
      id: 'actual',
      mark: { type: 'bar', position: 'group', fill: '#2563eb' },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'actual', type: 'quantitative' },
    },
  ],
});
```

Without `position: 'group'`, multiple bar layers use overlay positioning.

## Interaction

Each rendered rectangle carries its layer id, row index, and original datum. Hover and click events work in the standard profile:

```ts
chart.on('click', ({ hit }) => {
  if (hit) console.log(hit.datum.layerId, hit.datum.datum);
});
```

Large and ultra profiles reduce rendered bars and disable per-bar hit testing.

## Current limitations

- vertical orientation only;
- no stacked or normalized stack calculation;
- no horizontal, range, floating, waterfall, or funnel semantics;
- no native legend, tooltip, or data-label layout;
- no keyboard traversal of individual bars;
- no SVG/WebGL renderer parity yet.

## Runnable examples and tests

- [single-series example](../../examples/bar/index.html)
- [standalone grouped CDN example](../../examples/cdn/bar-chart.html)
- [chart type gallery](../../examples/cdn/chart-types.html)
- [bar regression tests](../../tests/bar.test.mjs)

[Back to chart guides](./README.md)
