# Cartesian axes

Graflume's portable Cartesian axis system supports four independently resolved axes: `x`, `x2`,
`y`, and `y2`. It covers declarative tick formatting, label layout, fonts, spacing, strokes,
explicit ticks, reversed scales, secondary-axis layers, and axis-nearest tooltips without accepting
formatter callbacks or executable expressions.

This manual applies to axis-bearing Cartesian marks. See [Axisless and mark-owned coordinates](#axisless-and-mark-owned-coordinates)
before applying it to radial, geographic, hierarchy, or other structural families.

## Defaults and configuration precedence

| Axis | Channel | Default position | Default grid |
| ---- | ------- | ---------------- | ------------ |
| `x`  | x       | `bottom`         | off          |
| `x2` | x       | `top`            | off          |
| `y`  | y       | `left`           | on           |
| `y2` | y       | `right`          | off          |

Declare reusable appearance under chart-level `axes`. Bind an encoding to its primary or secondary
axis with `axisId`, then optionally override that axis for the encoding. Graflume deeply merges the
chart axis and encoding override, including nested title and label fonts.

```ts
import { line } from 'graflume';

const rows = [
  { month: 'Jan', revenue: 120000 },
  { month: 'Feb', revenue: 148000 },
  { month: 'Mar', revenue: 139000 },
];

line('#chart', rows, {
  x: {
    field: 'month',
    type: 'ordinal',
    axis: { labels: { font: { weight: 'bold' } } },
  },
  y: { field: 'revenue', type: 'quantitative' },
  axes: {
    x: {
      title: 'Month',
      labels: { font: { family: 'Inter', size: 11 } },
    },
    y: { title: 'Revenue', grid: true },
  },
});
```

The x labels above inherit `family` and `size` from `axes.x`, then add `weight` from the encoding.
For several layers sharing one `axisId`, keep their scale declarations compatible and put shared
appearance in chart-level `axes`.

## Axis option map

An axis is `false` or an object with the following properties:

| Option       | Values and behavior                                        |
| ------------ | ---------------------------------------------------------- |
| `visible`    | Hide all primitives while retaining the scale when `false` |
| `position`   | `top`/`bottom` for x axes; `left`/`right` for y axes       |
| `offset`     | Non-negative distance outward from the plot                |
| `title`      | String, `false`, or a title object                         |
| `line`       | Boolean or stroke object for the domain line               |
| `grid`       | Boolean or stroke object for plot-spanning grid lines      |
| `ticks`      | Boolean or tick object                                     |
| `labels`     | Boolean or label object                                    |
| `format`     | A supported format name or declarative format object       |
| `tickCount`  | Compatibility alias for `ticks.count`                      |
| `labelAngle` | Compatibility alias for `labels.angle`                     |

Both `axis: false` and `visible: false` suppress the rendered primitives without removing the
scale used by bound marks.

`line` and `grid` objects accept `visible`, `color`, `width`, `opacity`, and `dash`. A `ticks`
object accepts the same stroke options plus `count`, `spacing`, `size`, and `values`.
`ticks.spacing` is the minimum on-screen separation in pixels; `ticks.values` supplies explicit
number or string values.

`labels` accepts `visible`, `orientation`, `angle`, `align`, `padding`, `maxLength`, `color`, and
`font`. `padding` is the gap after the tick, while `maxLength` truncates long labels with an
ellipsis. An axis title object accepts `text`, `visible`, `align`, `angle`, `padding`, `color`, and
`font`; title `padding` is its outward distance from the axis line.

Both label and title fonts accept:

```ts
font: {
  family: 'Inter, sans-serif',
  size: 12,
  weight: 600, // or normal, medium, semibold, bold
  style: 'italic',
}
```

## Declarative tick formatting

Set `locale` on the chart and `format` on an axis. This runnable example formats temporal x ticks
as Korean dates and y ticks as Korean won:

```ts
import { line } from 'graflume';

const rows = [
  { date: '2026-08-01', revenue: 124000 },
  { date: '2026-08-08', revenue: 151000 },
  { date: '2026-08-15', revenue: 143000 },
  { date: '2026-08-22', revenue: 168000 },
];

line('#formatted-axis', rows, {
  x: {
    field: 'date',
    type: 'temporal',
    scale: { type: 'time' },
  },
  y: {
    field: 'revenue',
    type: 'quantitative',
    scale: { domain: [100000, 180000] },
  },
  axes: {
    x: {
      title: 'Date',
      format: {
        type: 'date',
        dateStyle: 'medium',
        timeZone: 'Asia/Seoul',
      },
    },
    y: {
      title: 'Revenue',
      format: {
        type: 'currency',
        currency: 'KRW',
        currencyDisplay: 'symbol',
        fractionDigits: 0,
        useGrouping: true,
      },
    },
  },
  locale: 'ko-KR',
});
```

Time and ordinary number axes use the same contract:

```ts
import { line } from 'graflume';

const rows = [
  { timestamp: '2026-08-23T01:00:00Z', latency: 18.4 },
  { timestamp: '2026-08-23T02:00:00Z', latency: 21.7 },
  { timestamp: '2026-08-23T03:00:00Z', latency: 19.2 },
];

line('#time-number-axis', rows, {
  x: {
    field: 'timestamp',
    type: 'temporal',
    scale: { type: 'time' },
  },
  y: { field: 'latency', type: 'quantitative' },
  axes: {
    x: { format: { type: 'time', timeStyle: 'short', timeZone: 'UTC' } },
    y: { format: { type: 'number', fractionDigits: 1, suffix: ' ms' } },
  },
  locale: 'en-US',
});
```

The accepted format names are `auto`, `number`, `integer`, `percent`, `compact`, `scientific`,
`currency`, `date`, `time`, and `datetime`. Use an object when options are needed:

| Need           | Example `format`                                                | Input convention                      |
| -------------- | --------------------------------------------------------------- | ------------------------------------- |
| General number | `{ type: 'number', fractionDigits: 2 }`                         | Numeric tick value                    |
| Integer        | `{ type: 'integer' }`                                           | Numeric tick value                    |
| Percentage     | `{ type: 'percent', fractionDigits: 1 }`                        | Ratio such as `0.425` becomes `42.5%` |
| Compact number | `{ type: 'compact', fractionDigits: 1 }`                        | Numeric tick value                    |
| Scientific     | `{ type: 'scientific', fractionDigits: 2 }`                     | Numeric tick value                    |
| Currency       | `{ type: 'currency', currency: 'USD' }`                         | Uppercase three-letter currency code  |
| Date           | `{ type: 'date', dateStyle: 'long', timeZone: 'UTC' }`          | Timestamp or parseable date string    |
| Time           | `{ type: 'time', timeStyle: 'short', timeZone: 'UTC' }`         | Timestamp or parseable date string    |
| Date and time  | `{ type: 'datetime', dateStyle: 'medium', timeStyle: 'short' }` | Timestamp or parseable date string    |

Format objects also accept `notation` (`standard`, `compact`, `scientific`, or `engineering`),
`currencyDisplay` (`symbol`, `narrowSymbol`, `code`, or `name`), `prefix`, and `suffix`.
`fractionDigits` is an integer from 0 through 20. Formatting remains function-free; callback
formatters, expressions, and raw HTML are not part of `ChartSpec`.

## Horizontal, vertical, and angled labels

`orientation: 'horizontal'` keeps labels at 0 degrees. `vertical-up` uses -90 degrees and
`vertical-down` uses 90 degrees. An explicit `angle` takes precedence over `orientation`. In
`auto`, x band scales with more than ten visible ticks tilt to -35 degrees; other labels remain
horizontal.

The three calls below are independently runnable with matching target elements:

```ts
import { bar } from 'graflume';

const rows = [
  { category: 'North America', value: 68 },
  { category: 'Western Europe', value: 74 },
  { category: 'Asia Pacific', value: 81 },
];

bar('#labels-horizontal', rows, {
  x: {
    field: 'category',
    type: 'ordinal',
    axis: { labels: { orientation: 'horizontal' } },
  },
  y: { field: 'value', type: 'quantitative' },
});

bar('#labels-vertical', rows, {
  x: {
    field: 'category',
    type: 'ordinal',
    axis: { labels: { orientation: 'vertical-up' } },
  },
  y: { field: 'value', type: 'quantitative' },
});

bar('#labels-angled', rows, {
  x: {
    field: 'category',
    type: 'ordinal',
    axis: { labels: { angle: -35, align: 'end' } },
  },
  y: { field: 'value', type: 'quantitative' },
});
```

## Fonts, spacing, strokes, and positions

This example moves the primary axes to the opposite sides and styles each primitive independently.
Use `x2` and `y2` instead when the chart needs genuinely independent secondary scales.

```ts
import { bar } from 'graflume';

const rows = [
  { product: 'Alpha', score: 72 },
  { product: 'Beta', score: 84 },
  { product: 'Gamma', score: 91 },
];

bar('#styled-axes', rows, {
  x: { field: 'product', type: 'ordinal' },
  y: { field: 'score', type: 'quantitative' },
  axes: {
    x: {
      position: 'top',
      offset: 4,
      line: { color: '#475569', width: 2 },
      grid: { visible: true, color: '#e2e8f0', opacity: 0.65, dash: [4, 4] },
      ticks: { size: 7, spacing: 80, color: '#475569' },
      labels: {
        padding: 8,
        maxLength: 12,
        color: '#334155',
        font: { family: 'Inter, sans-serif', size: 11, weight: 600 },
      },
      title: {
        text: 'Product',
        align: 'center',
        padding: 34,
        color: '#0f172a',
        font: { size: 12, weight: 'bold' },
      },
    },
    y: {
      position: 'right',
      offset: 8,
      grid: { color: '#cbd5e1', opacity: 0.75 },
      ticks: { values: [0, 25, 50, 75, 100], size: 6 },
      labels: { padding: 7, font: { size: 11, style: 'italic' } },
      title: { text: 'Score', padding: 50 },
    },
  },
});
```

Axis layout reserves the measured label and title gutter automatically. `offset` can separate
multiple axes placed on the same side, but applications should still choose compact labels and
reasonable font sizes for narrow containers.

## Explicit domains and reversed scales

`scale.domain` fixes a numeric extent or categorical order. `scale.reverse: true` reverses the
rendered direction for linear, time, and band scales. It changes both marks and tick order.

```ts
import { bar } from 'graflume';

const rows = [
  { segment: 'Core', completion: 0.82 },
  { segment: 'Growth', completion: 0.67 },
  { segment: 'Enterprise', completion: 0.91 },
];

bar('#reversed-domain', rows, {
  x: {
    field: 'segment',
    type: 'ordinal',
    scale: {
      type: 'band',
      domain: ['Enterprise', 'Growth', 'Core'],
      reverse: true,
      paddingInner: 0.2,
      paddingOuter: 0.1,
    },
  },
  y: {
    field: 'completion',
    type: 'quantitative',
    scale: { domain: [0, 1], clamp: true },
  },
  axes: {
    y: { format: { type: 'percent', fractionDigits: 0 } },
  },
});
```

## Independent x2 and y2 axes

Only x encodings may bind to `x` or `x2`, and only y encodings may bind to `y` or `y2`. Each axis
derives its domain only from layers bound to that axis. This makes units independent instead of
forcing a percentage line onto a currency scale.

```ts
import { combo } from 'graflume';

const rows = [
  { month: 'Jan', periodCode: '2026-01', revenue: 120000, margin: 0.31 },
  { month: 'Feb', periodCode: '2026-02', revenue: 148000, margin: 0.37 },
  { month: 'Mar', periodCode: '2026-03', revenue: 139000, margin: 0.34 },
];

combo('#dual-axes', rows, {
  layers: [
    {
      id: 'revenue',
      mark: { type: 'bar', fill: '#93c5fd', cornerRadius: 5 },
      x: {
        field: 'month',
        type: 'ordinal',
        axisId: 'x',
      },
      y: {
        field: 'revenue',
        type: 'quantitative',
        axisId: 'y',
        scale: { domain: [0, 180000] },
      },
    },
    {
      id: 'margin',
      mark: { type: 'line', point: true, stroke: '#e05260', lineWidth: 3 },
      x: {
        field: 'periodCode',
        type: 'ordinal',
        axisId: 'x2',
      },
      y: {
        field: 'margin',
        type: 'quantitative',
        axisId: 'y2',
        scale: { domain: [0, 0.5] },
      },
    },
  ],
  axes: {
    x: { title: 'Month' },
    x2: { title: 'Period code', labels: { font: { size: 10 } } },
    y: {
      title: 'Revenue',
      format: { type: 'currency', currency: 'KRW', fractionDigits: 0 },
    },
    y2: {
      title: 'Margin',
      grid: false,
      format: { type: 'percent', fractionDigits: 0 },
    },
  },
  locale: 'ko-KR',
  interaction: {
    tooltip: {
      title: 'Margin by period',
      trigger: 'axis',
      axis: 'x2',
      fields: [
        { field: 'periodCode', label: 'Period' },
        { field: 'margin', label: 'Margin', format: 'percent', fractionDigits: 0 },
      ],
    },
  },
});
```

Secondary axes render only when a visible layer binds to them. The default secondary positions are
top and right, but `axes.x2.position` may be `top` or `bottom`, and `axes.y2.position` may be `left`
or `right`. Use `offset` when two axes intentionally share a side.

## Axis-nearest tooltips

`interaction.tooltip.trigger: 'axis'` requires an explicit `axis` of `x`, `x2`, `y`, or `y2`.
The dual-axis example above selects the nearest real datum from the layer bound to `x2` when the
pointer is over the plot or the bounded top-axis region. An exact rendered-mark hit retains
priority. Graflume does not interpolate a synthetic row, and selecting a secondary axis does not
pull in layers bound only to the primary axis.

Axis-nearest lookup changes tooltip presentation only. Structured `hover` and `click` events retain
exact rendered-mark semantics. Tooltips are pointer-only, and the `large` and `ultra` performance
profiles disable datum lookup, so keep a readable summary or data table available for exact values
and keyboard access.

## Axisless and mark-owned coordinates

The generic axis compiler intentionally skips an axis when every layer bound to it uses an
axisless or mark-owned coordinate system. This includes radial charts such as pie, gauge, radar,
chord, and sunburst; structural charts such as graph, hierarchy, Sankey, parallel coordinates,
table, Venn, and word tree; geographic and tiled maps; and families such as calendar, funnel,
packed bubble, item, and word cloud. Regular matrix `heatmap` remains Cartesian, while geographic
heatmaps and tile-map modes own their coordinates.

For those families, `axes` and encoding-level `axis` styles do not create or restyle the mark's
own rings, guides, labels, nodes, or map surface. Use the options documented by the relevant family
manual. Explicitly hiding generic axes is still useful for making portable intent clear:

```ts
import { pie } from 'graflume';

const rows = [
  { category: 'Direct', value: 58 },
  { category: 'Partner', value: 27 },
  { category: 'Other', value: 15 },
];

pie('#share', rows, {
  x: { field: 'category', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  axes: { x: false, y: false },
});
```

## Compatibility forms

Existing compact forms remain valid:

```ts
axes: {
  x: {
    title: 'Month',
    grid: false,
    tickCount: 6,
    format: 'date',
    labelAngle: -35,
  },
}
```

The canonical nested equivalents are `ticks.count` and `labels.angle`. When both a compatibility
alias and its nested equivalent are present, the nested value wins. Prefer the nested forms in new
specifications because they compose with the rest of the tick and label styles.

## Portability and validation

- Axis specifications are JSON-serializable and function-free.
- Unknown axis, scale, font, stroke, tick, label, and format properties are rejected.
- Positions and `axisId` values are checked against their x or y channel.
- Numeric sizes, opacity, angles, tick counts, and format precision are finite and bounded.
- The public TypeScript types, runtime validation and normalization, and
  [`graflume.schema.json`](../../schema/graflume.schema.json) describe the same contract.

Automatic label collision routing beyond the current auto tilt, spacing, and truncation controls is
not implemented. Crosshair guides and facets remain
separate future features. Legends, axis-aligned reference bands, and callouts use the shared
[portable interaction contract](./interactions.md#legends-highlights-selection-and-callouts).
