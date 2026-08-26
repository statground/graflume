# Line charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `line` family. Its canonical Quick API is `line()` from `graflume`, and its representative portable mark is `line`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                 | Quick API     | Mode      | Portable mark | Functional difference                                |
| ------------------------------- | ------------- | --------- | ------------- | ---------------------------------------------------- |
| [Line chart](#variant-line)     | `line()`      | `default` | `line`        | Uses direct ordered line segments.                   |
| [Trendline](#variant-trendline) | `trendline()` | `trend`   | `trendline`   | Derives a regression trend from the coordinate rows. |
| [Spline chart](#variant-spline) | `spline()`    | `spline`  | `smooth`      | Uses a sampled smooth path.                          |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                   |                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **[Line chart](#variant-line)**<br>[![Current Line chart output](../assets/charts/line.svg)](../assets/charts/line.svg)           | **[Trendline](#variant-trendline)**<br>[![Current Trendline output](../assets/charts/trendline.svg)](../assets/charts/trendline.svg) |
| **[Spline chart](#variant-spline)**<br>[![Current Spline chart output](../assets/charts/spline.svg)](../assets/charts/spline.svg) |                                                                                                                                      |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family uses `trigger: "axis"` with `axis: "x"`. An exact rendered-mark hit still has priority; otherwise Graflume selects the nearest actual datum on that axis without inventing an interpolated row. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-line"></a>

### Line chart

Use this preset when change across an ordered domain is the main reading task. Uses direct ordered line segments.

- **Quick API:** `line()`
- **Mode:** `default`
- **Portable mark:** `line`
- **Required example fields:** `category`, `value`

```js
import { line } from 'graflume';

const data = [
  {
    category: 'Jan',
    value: 48,
  },
  {
    category: 'Feb',
    value: 53,
  },
  {
    category: 'Mar',
    value: 51,
  },
  {
    category: 'Apr',
    value: 59,
  },
];

line('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Month',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Active teams',
  },
  title: {
    text: 'Line chart',
    subtitle: 'line family · default mode',
  },
  accessibility: {
    label: 'Line chart: Monthly active teams make the trend and two release moments easy to read',
    description:
      'Monthly active teams make the trend and two release moments easy to read. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    point: true,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Line chart',
      fields: [
        {
          field: 'category',
          label: 'Month',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Active teams',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-trendline"></a>

### Trendline

Use this preset when change across an ordered domain is the main reading task. Derives a regression trend from the coordinate rows.

- **Quick API:** `trendline()`
- **Mode:** `trend`
- **Portable mark:** `trendline`
- **Required example fields:** `category`, `value`

```js
import { trendline } from 'graflume';

const data = [
  {
    category: 'Jan',
    value: 48,
  },
  {
    category: 'Feb',
    value: 53,
  },
  {
    category: 'Mar',
    value: 51,
  },
  {
    category: 'Apr',
    value: 59,
  },
];

trendline('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Month',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Active teams',
  },
  title: {
    text: 'Trendline',
    subtitle: 'line family · trend mode',
  },
  accessibility: {
    label: 'Trendline: Monthly active teams make the trend and two release moments easy to read',
    description:
      'Monthly active teams make the trend and two release moments easy to read. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    point: true,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Trendline',
      fields: [
        {
          field: 'category',
          label: 'Month',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Active teams',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-spline"></a>

### Spline chart

Use this preset when change across an ordered domain is the main reading task. Uses a sampled smooth path.

- **Quick API:** `spline()`
- **Mode:** `spline`
- **Portable mark:** `smooth`
- **Required example fields:** `category`, `value`

```js
import { spline } from 'graflume/complete';

const data = [
  {
    category: 'Jan',
    value: 48,
  },
  {
    category: 'Feb',
    value: 53,
  },
  {
    category: 'Mar',
    value: 51,
  },
  {
    category: 'Apr',
    value: 59,
  },
];

spline('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Month',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Active teams',
  },
  title: {
    text: 'Spline chart',
    subtitle: 'line family · spline mode',
  },
  accessibility: {
    label: 'Spline chart: Monthly active teams make the trend and two release moments easy to read',
    description:
      'Monthly active teams make the trend and two release moments easy to read. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    point: true,
    options: {
      area: false,
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Spline chart',
      fields: [
        {
          field: 'category',
          label: 'Month',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Active teams',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

Use a line chart for an ordered sequence such as time, rank, distance, or another progression. Graflume connects valid input rows in their current order and can add interactive point circles.

## Implemented appearance

This is the current compiled output for a line chart with `mark.point: true`.

![Graflume line chart showing monthly sales as an orange line with circular points](../assets/charts/line.svg)

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
    stroke: '#ea580c',
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
    stroke: '#ea580c',
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
- `mark.options.missing: 'gap'` is the line default: an invalid x/y pair ends the current segment and a later valid row starts another.
- `'connect'` omits invalid pairs and connects the valid rows on either side. `'zero'` substitutes `0` only for a missing/invalid y value; an invalid x value still breaks the segment.
- `scale.zero` defaults to false for a line, so the y domain can focus on the observed range.
- Selecting `'zero'` includes zero in the resolved y domain unless an explicit domain overrides it.

```ts
const ordered = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
```

## Curves and steps

Line-like marks use one renderer-neutral, function-free curve registry. Set the curve in portable `mark.options`; no callback or renderer-specific path object enters `ChartSpec 0.1`.

```ts
mark: {
  type: 'line',
  options: {
    curve: 'monotone-x',
    missing: 'gap',
    curveSamples: 8,
  },
}
```

Supported names are:

- `straight`: direct segments and the `line` default;
- `step-before`, `step-after`, and `step-mid`: the new y value takes effect at the old x, new x, or midpoint respectively;
- `monotone-x`: sampled monotone cubic interpolation for strictly increasing or decreasing x coordinates; non-monotone or repeated x coordinates fall back to straight segments;
- `natural`: a sampled natural cubic spline through the source points;
- `basis`: a sampled uniform cubic B-spline, which smooths through a control-point basis rather than promising passage through every interior point;
- `cardinal`: a sampled cardinal spline and the `smooth`/`spline()` compatibility default. `tension` is limited to `0..1`; `0` retains the previous Catmull-Rom-compatible shape and `1` gives zero endpoint tangents per interval.

`curveSamples` is an integer from `1` to `64` and defaults to `8` sampled Scene segments per curved source interval. Step and straight curves do not use it. Curve sampling happens after the existing min/max source reduction, so the performance profile still bounds source observations before interpolated geometry is created.

## Line points and interaction

The line path itself is not a datum hit target. Enable `mark.point` to render interactive circles:

```ts
mark: {
  type: 'line',
  point: true,
  radius: 5,
}
```

Each circle retains the original row. Without points, structured `hover` and `click` events can still fire at the chart surface but normally return `hit: null` for the line. An explicit x-axis tooltip can still present the nearest actual row as a pointer-only fallback; it does not change those event results.

## Large data behavior

Line marks use min/max sampling to preserve endpoints and local extrema within the current point budget. Optional point circles use a separate stride-sampling budget.

- `standard`: up to 100,000 line points and hit-tested optional points;
- `large`: line points become viewport-aware and hit testing is disabled;
- `ultra`: stronger line reduction and no per-mark hit testing.

Pre-aggregate or downsample when every source observation is not visually distinguishable.

## Current limitations

None remain in the audited P0/current-limitations boundary as of 2026-08-26. The `current-limitations-2026-08-26` implementation moved these former limitations into executable support:

- duplicate and implicit sort policy
- data-domain navigation
- named transform DAG reuse
- worker-bounded streaming retention

The separately cataloged P1/P2 research roadmap remains future work and is not presented as current runtime support. Exact implementation and test paths are recorded in [the completion evidence](../../catalog/graflume.current-limitations.evidence.json).

## Runnable examples and tests

- [chart type gallery](../../examples/cdn/chart-types.html)
- [line regression test](../../tests/chart-types.test.mjs)
- [curve semantic tests](../../tests/curve.test.mjs)

[Back to chart guides](./README.md)
