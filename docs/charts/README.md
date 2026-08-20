# Chart guides

Graflume `0.1.0-alpha.0` currently renders four portable marks—`bar`, `line`, `area`, and `point`—and composes them as shared-scale layers. `scatter()` is the chart-oriented Quick API name for the portable `point` mark.

This guide documents the behavior that is implemented today. Planned chart families are listed separately and are not presented as supported features.

## Choose a chart

| Goal                                              | Chart                           | Quick API            | Portable mark  |
| ------------------------------------------------- | ------------------------------- | -------------------- | -------------- |
| Compare values across categories                  | [Bar](./bar.md)                 | `Graflume.bar()`     | `bar`          |
| Show an ordered trend                             | [Line](./line.md)               | `Graflume.line()`    | `line`         |
| Emphasize a trend and its magnitude from zero     | [Area](./area.md)               | `Graflume.area()`    | `area`         |
| Explore a relationship between two numeric fields | [Scatter](./scatter.md)         | `Graflume.scatter()` | `point`        |
| Overlay different views on shared axes            | [Combination](./combination.md) | `Graflume.create()`  | multiple marks |

The standalone [chart type gallery](../../examples/cdn/chart-types.html) renders all five choices on one responsive page.

Every chart-specific guide includes a current visual snapshot generated from the actual Graflume `compile()` Scene. Run `npm run docs:snapshots` after a rendering change to rebuild all five assets deterministically.

## Current rendered output

| Bar                                                                        | Line                                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [![Current Graflume bar chart output](../assets/charts/bar.svg)](./bar.md) | [![Current Graflume line chart output](../assets/charts/line.svg)](./line.md) |

| Area                                                                          | Scatter                                                                                |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [![Current Graflume area chart output](../assets/charts/area.svg)](./area.md) | [![Current Graflume scatter chart output](../assets/charts/scatter.svg)](./scatter.md) |

[![Current Graflume combination chart output](../assets/charts/combination.svg)](./combination.md)

## Common Quick API shape

Every Quick API accepts a target, a row-oriented or columnar data source, and chart options:

```ts
import { line } from 'graflume';

const chart = line('#chart', data, {
  title: {
    text: 'Monthly sales',
    subtitle: 'USD thousands',
  },
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
    scale: { zero: false, nice: true },
  },
  mark: {
    stroke: '#2563eb',
    lineWidth: 3,
    point: true,
  },
  theme: 'graflume-light',
  locale: 'en-US',
  accessibility: {
    label: 'Monthly sales line chart',
    description: 'Sales rise from January through June with one dip in March.',
  },
});
```

The Quick API creates the same portable `ChartSpec 0.1` shape that can be passed to `create()`. JavaScript callbacks are not embedded in the portable spec.

## Data and encodings

### Row-oriented data

```ts
const data = [
  { month: 'Jan', sales: 42 },
  { month: 'Feb', sales: 51 },
  { month: 'Mar', sales: 49 },
];
```

### Columnar data

```ts
const data = {
  columns: {
    month: ['Jan', 'Feb', 'Mar'],
    sales: new Float64Array([42, 51, 49]),
  },
  length: 3,
};
```

Columnar `TypedArray` values remain zero-copy until a mutation-style operation requires row materialization.

### Encoding options

An encoding may be a field-name shorthand or a full object.

| Option                                | Meaning                                             |
| ------------------------------------- | --------------------------------------------------- |
| `field`                               | Data field to read                                  |
| `type`                                | `quantitative`, `temporal`, `ordinal`, or `nominal` |
| `title`                               | Axis title; defaults to the field name              |
| `scale.domain`                        | Explicit numeric pair or ordered categorical values |
| `scale.zero`                          | Include zero in a numeric domain                    |
| `scale.nice`                          | Expand a numeric domain to readable boundaries      |
| `scale.clamp`                         | Clamp numeric values to the scale range             |
| `scale.paddingInner` / `paddingOuter` | Category-band spacing                               |
| `axis`                                | Axis options or `false` to hide the axis            |

The initial runtime requires a quantitative or temporal y-axis. Layers sharing an axis must use compatible field-type families.

## Common chart options

| Option          | Current behavior                                              |
| --------------- | ------------------------------------------------------------- |
| `width`         | Number or `container`; defaults to responsive container width |
| `height`        | Number or `container`; defaults to `400`                      |
| `padding`       | One number or per-side values                                 |
| `title`         | String or `{ text, subtitle, align }`                         |
| `description`   | Fallback accessible description                               |
| `theme`         | `graflume-light`, `graflume-dark`, or a theme override        |
| `locale`        | Number/date formatting locale for axes                        |
| `renderer`      | `auto` or a registered renderer name; Canvas 2D is built in   |
| `performance`   | `auto`, `standard`, `large`, or `ultra`                       |
| `interaction`   | Enable or disable hover and click handling                    |
| `accessibility` | Canvas ARIA label and description                             |
| `axes`          | Chart-level x/y axis defaults                                 |

Quick APIs also accept `create` options for `autoResize`, manual width/height, and pixel ratio.

## Styling marks

The shared mark style surface is intentionally small:

| Option         | Used by                                 |
| -------------- | --------------------------------------- |
| `fill`         | bar, area, point, optional line points  |
| `stroke`       | line, area, point, optional bar outline |
| `opacity`      | all marks                               |
| `lineWidth`    | line/area stroke, point/bar outline     |
| `radius`       | point and optional line points          |
| `cornerRadius` | bar                                     |
| `point`        | line; renders interactive point circles |
| `position`     | bar layers; `overlay` or `group`        |

Unsupported options are rejected by portable spec validation rather than silently evaluated as code.

## Events and chart lifecycle

```ts
const unsubscribe = chart.on('hover', ({ hit }) => {
  if (hit) console.log(hit.datum.datum);
});

chart.on('click', ({ hit }) => console.log(hit?.datum));
chart.on('resize', ({ width, height }) => console.log(width, height));
chart.on('error', ({ error }) => console.error(error));

chart.setData(nextData);
chart.appendData([{ month: 'Apr', sales: 63 }]);
chart.setSpec(nextSpec);
chart.resize();
const png = chart.toDataURL('image/png');

unsubscribe();
chart.destroy();
```

`hover` and `click` return structured datum references. Graflume does not provide a raw-HTML tooltip formatter. The current `appendData()` implementation is copy-based; a ring-buffer/incremental engine is planned behind the same API.

## Interaction by mark

| Mark          | Current hit target                                            |
| ------------- | ------------------------------------------------------------- |
| bar           | each rendered rectangle                                       |
| point/scatter | each rendered circle                                          |
| line          | optional circles when `mark.point: true`; not the path itself |
| area          | no per-row hit target in the area path                        |

For an interactive area or plain line, add a point layer or enable line points. Large and ultra performance profiles disable per-mark hit testing.

## Performance profiles

`auto` currently selects `standard` below 50,000 total rows, `large` below 1,000,000 rows, and `ultra` above that. The profiles bound rendered line points, circles, and bars to keep the browser responsive.

These thresholds are alpha safety limits, not a universal performance guarantee. Measure real devices and use aggregation or sampling before treating raw row counts as a rendering target.

## Accessibility checklist

Canvas charts should provide both structured Canvas metadata and a readable alternative near the chart.

```ts
accessibility: {
  label: 'Monthly sales bar chart',
  description: 'Six vertical bars compare January through June sales.',
}
```

Recommended page-level additions:

- a visible or collapsible text summary;
- a data table for exact values;
- keyboard-accessible controls outside the Canvas;
- a high-contrast or dark theme option;
- reduced-motion handling in surrounding UI.

Automatic data tables and keyboard traversal of individual marks are not implemented yet.

## Currently planned, not yet supported

- stacked and normalized stacks;
- horizontal, range, floating, waterfall, and funnel bars;
- histogram/bin transforms, box plots, violin plots, and error bars;
- heatmaps, density/hexbin, financial, network, hierarchy, flow, map, and 3D charts;
- independent or dual scales, facets, concat, dashboards, and linked views;
- native legends, tooltip layout, annotations, and regression/forecast layers;
- built-in SVG, WebGL2, and WebGPU renderer parity.
