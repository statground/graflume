# Line charts

Use a line chart for an ordered sequence such as time, rank, distance, or another progression. Graflume connects valid input rows in their current order and can add interactive point circles.

## Quick API

```ts
import { line } from 'graflume';

const chart = line('#chart', data, {
  title: {
    text: 'Monthly revenue',
    subtitle: 'Actual result',
  },
  x: { field: 'month', type: 'ordinal', axis: { grid: false } },
  y: {
    field: 'revenue',
    type: 'quantitative',
    scale: { zero: false, nice: true },
  },
  mark: {
    stroke: '#f97316',
    lineWidth: 3,
    point: true,
    radius: 5,
    fill: '#ffffff',
  },
});
```

## Portable ChartSpec

```ts
Graflume.create('#chart', {
  specVersion: '0.1',
  data,
  mark: {
    type: 'line',
    stroke: '#f97316',
    lineWidth: 3,
    point: true,
  },
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'revenue', type: 'quantitative' },
});
```

## Ordering and missing values

- Graflume connects points in input-row order; it does not sort automatically.
- Sort temporal or quantitative x values before rendering when order matters.
- An invalid or missing x/y pair ends the current line segment.
- A later valid row starts a new segment.
- `scale.zero` defaults to false for a line, so the y domain can focus on the observed range.

```ts
const ordered = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
```

## Line points and interaction

The line path itself is not a datum hit target. Enable `mark.point` to render interactive circles:

```ts
mark: {
  type: 'line',
  point: true,
  radius: 5,
}
```

Each circle retains the original row. Without points, `hover` and `click` can still fire at the chart surface but normally return `hit: null` for the line.

## Large data behavior

Line marks use min/max sampling to preserve endpoints and local extrema within the current point budget. Optional point circles use a separate stride-sampling budget.

- `standard`: up to 100,000 line points and hit-tested optional points;
- `large`: line points become viewport-aware and hit testing is disabled;
- `ultra`: stronger line reduction and no per-mark hit testing.

Pre-aggregate or downsample when every source observation is not visually distinguishable.

## Current limitations

- straight connected segments only; no curve/interpolation setting;
- no step line, range line, confidence band, or error bar;
- no automatic sorting or time-window transform;
- no native line tooltip/legend;
- no path-level datum hit testing;
- no SVG/WebGL renderer parity yet.

## Runnable examples and tests

- [chart type gallery](../../examples/cdn/chart-types.html)
- [line regression test](../../tests/chart-types.test.mjs)

[Back to chart guides](./README.md)
