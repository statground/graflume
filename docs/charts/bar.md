# Bar charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `bar` family. Its canonical Quick API is `bar()` from `graflume`, and its representative portable mark is `bar`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                                        | Quick API           | Mode               | Portable mark   | Functional difference                                              |
| ------------------------------------------------------ | ------------------- | ------------------ | --------------- | ------------------------------------------------------------------ |
| [Bar chart](#variant-bar)                              | `horizontalBar()`   | `horizontal`       | `bar`           | Uses the canonical horizontal comparison orientation.              |
| [Column chart](#variant-column)                        | `column()`          | `vertical`         | `bar`           | Rotates the shared bar geometry into vertical columns.             |
| [Pictorial bar chart](#variant-pictorial-bar)          | `pictorialBar()`    | `pictorial`        | `pictorial-bar` | Repeats symbols inside the shared categorical bar layout.          |
| [Bullet chart](#variant-bullet)                        | `bullet()`          | `bullet`           | `bullet`        | Adds qualitative ranges and a target rule around the observed bar. |
| [Column pyramid chart](#variant-column-pyramid)        | `columnPyramid()`   | `column-pyramid`   | `pyramid`       | Uses tapered vertical column bodies.                               |
| [Cylinder chart](#variant-cylinder)                    | `cylinder()`        | `cylinder`         | `cylinder`      | Adds portable elliptical caps to a column body.                    |
| [Lollipop chart](#variant-lollipop)                    | `lollipop()`        | `lollipop`         | `lollipop`      | Uses a baseline stem and emphasized endpoint.                      |
| [Pictorial column chart](#variant-pictorial-column)    | `pictorialColumn()` | `pictorial-column` | `pictorial-bar` | Uses repeated symbols in the vertical column orientation.          |
| [Variable width column chart](#variant-variable-width) | `variableWidth()`   | `variable-width`   | `variwide`      | Allocates category width from an additional quantitative field.    |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                                                                         |                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Bar chart](#variant-bar)**<br>[![Current Bar chart output](../assets/charts/bar.svg)](../assets/charts/bar.svg)                                                                      | **[Column chart](#variant-column)**<br>[![Current Column chart output](../assets/charts/column.svg)](../assets/charts/column.svg)                                                   |
| **[Pictorial bar chart](#variant-pictorial-bar)**<br>[![Current Pictorial bar chart output](../assets/charts/pictorial-bar.svg)](../assets/charts/pictorial-bar.svg)                    | **[Bullet chart](#variant-bullet)**<br>[![Current Bullet chart output](../assets/charts/bullet.svg)](../assets/charts/bullet.svg)                                                   |
| **[Column pyramid chart](#variant-column-pyramid)**<br>[![Current Column pyramid chart output](../assets/charts/column-pyramid.svg)](../assets/charts/column-pyramid.svg)               | **[Cylinder chart](#variant-cylinder)**<br>[![Current Cylinder chart output](../assets/charts/cylinder.svg)](../assets/charts/cylinder.svg)                                         |
| **[Lollipop chart](#variant-lollipop)**<br>[![Current Lollipop chart output](../assets/charts/lollipop.svg)](../assets/charts/lollipop.svg)                                             | **[Pictorial column chart](#variant-pictorial-column)**<br>[![Current Pictorial column chart output](../assets/charts/pictorial-column.svg)](../assets/charts/pictorial-column.svg) |
| **[Variable width column chart](#variant-variable-width)**<br>[![Current Variable width column chart output](../assets/charts/variable-width.svg)](../assets/charts/variable-width.svg) |                                                                                                                                                                                     |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family uses `trigger: "axis"` with `axis: "x"`. An exact rendered-mark hit still has priority; otherwise Graflume selects the nearest actual datum on that axis without inventing an interpolated row. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-bar"></a>

### Bar chart

Use this preset when you need to compare values across discrete categories. Uses the canonical horizontal comparison orientation.

- **Quick API:** `horizontalBar()`
- **Mode:** `horizontal`
- **Portable mark:** `bar`
- **Required example fields:** `category`, `value`

```js
import { horizontalBar } from 'graflume';

const data = [
  {
    category: 'Insights',
    value: 86,
  },
  {
    category: 'Dashboards',
    value: 78,
  },
  {
    category: 'Reports',
    value: 69,
  },
  {
    category: 'Alerts',
    value: 61,
  },
];

horizontalBar('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Bar chart',
    subtitle: 'bar family · horizontal mode',
  },
  accessibility: {
    label: 'Bar chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    orientation: 'horizontal',
    cornerRadius: 6,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Bar chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-column"></a>

### Column chart

Use this preset when you need to compare values across discrete categories. Rotates the shared bar geometry into vertical columns.

- **Quick API:** `column()`
- **Mode:** `vertical`
- **Portable mark:** `bar`
- **Required example fields:** `category`, `value`

```js
import { column } from 'graflume';

const data = [
  {
    category: 'Insights',
    value: 86,
  },
  {
    category: 'Dashboards',
    value: 78,
  },
  {
    category: 'Reports',
    value: 69,
  },
  {
    category: 'Alerts',
    value: 61,
  },
];

column('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Column chart',
    subtitle: 'bar family · vertical mode',
  },
  accessibility: {
    label: 'Column chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    orientation: 'vertical',
    cornerRadius: 6,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Column chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-pictorial-bar"></a>

### Pictorial bar chart

Use this preset when you need to compare values across discrete categories. Repeats symbols inside the shared categorical bar layout.

- **Quick API:** `pictorialBar()`
- **Mode:** `pictorial`
- **Portable mark:** `pictorial-bar`
- **Required example fields:** `category`, `value`

```js
import { pictorialBar } from 'graflume/complete';

const data = [
  {
    category: 'Insights',
    value: 86,
  },
  {
    category: 'Dashboards',
    value: 78,
  },
  {
    category: 'Reports',
    value: 69,
  },
  {
    category: 'Alerts',
    value: 61,
  },
];

pictorialBar('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Pictorial bar chart',
    subtitle: 'bar family · pictorial mode',
  },
  accessibility: {
    label:
      'Pictorial bar chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    options: {
      symbol: 'diamond',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Pictorial bar chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-bullet"></a>

### Bullet chart

Use this preset when you need to compare values across discrete categories. Adds qualitative ranges and a target rule around the observed bar.

- **Quick API:** `bullet()`
- **Mode:** `bullet`
- **Portable mark:** `bullet`
- **Required example fields:** `category`, `value`, `target`

```js
import { bullet } from 'graflume/complete';

const data = [
  {
    category: 'Reliability',
    value: 99.93,
    target: 99.9,
  },
  {
    category: 'Fast responses',
    value: 94,
    target: 92,
  },
  {
    category: 'Accessible flows',
    value: 91,
    target: 95,
  },
  {
    category: 'Successful exports',
    value: 97,
    target: 98,
  },
];

bullet('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Bullet chart',
    subtitle: 'bar family · bullet mode',
  },
  accessibility: {
    label: 'Bullet chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    fields: {
      target: 'target',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Bullet chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
        {
          field: 'target',
          label: 'Target',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-column-pyramid"></a>

### Column pyramid chart

Use this preset when you need to compare values across discrete categories. Uses tapered vertical column bodies.

- **Quick API:** `columnPyramid()`
- **Mode:** `column-pyramid`
- **Portable mark:** `pyramid`
- **Required example fields:** `category`, `value`

```js
import { columnPyramid } from 'graflume/complete';

const data = [
  {
    category: 'Insights',
    value: 86,
  },
  {
    category: 'Dashboards',
    value: 78,
  },
  {
    category: 'Reports',
    value: 69,
  },
  {
    category: 'Alerts',
    value: 61,
  },
];

columnPyramid('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Column pyramid chart',
    subtitle: 'bar family · column-pyramid mode',
  },
  accessibility: {
    label:
      'Column pyramid chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    options: {
      variant: 'column-pyramid',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Column pyramid chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-cylinder"></a>

### Cylinder chart

Use this preset when you need to compare values across discrete categories. Adds portable elliptical caps to a column body.

- **Quick API:** `cylinder()`
- **Mode:** `cylinder`
- **Portable mark:** `cylinder`
- **Required example fields:** `category`, `value`

```js
import { cylinder } from 'graflume/complete';

const data = [
  {
    category: 'Insights',
    value: 86,
  },
  {
    category: 'Dashboards',
    value: 78,
  },
  {
    category: 'Reports',
    value: 69,
  },
  {
    category: 'Alerts',
    value: 61,
  },
];

cylinder('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Cylinder chart',
    subtitle: 'bar family · cylinder mode',
  },
  accessibility: {
    label:
      'Cylinder chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Cylinder chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-lollipop"></a>

### Lollipop chart

Use this preset when you need to compare values across discrete categories. Uses a baseline stem and emphasized endpoint.

- **Quick API:** `lollipop()`
- **Mode:** `lollipop`
- **Portable mark:** `lollipop`
- **Required example fields:** `category`, `value`

```js
import { lollipop } from 'graflume/complete';

const data = [
  {
    category: 'Insights',
    value: 86,
  },
  {
    category: 'Dashboards',
    value: 78,
  },
  {
    category: 'Reports',
    value: 69,
  },
  {
    category: 'Alerts',
    value: 61,
  },
];

lollipop('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Lollipop chart',
    subtitle: 'bar family · lollipop mode',
  },
  accessibility: {
    label:
      'Lollipop chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Lollipop chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-pictorial-column"></a>

### Pictorial column chart

Use this preset when you need to compare values across discrete categories. Uses repeated symbols in the vertical column orientation.

- **Quick API:** `pictorialColumn()`
- **Mode:** `pictorial-column`
- **Portable mark:** `pictorial-bar`
- **Required example fields:** `category`, `value`

```js
import { pictorialColumn } from 'graflume/complete';

const data = [
  {
    category: 'Insights',
    value: 86,
  },
  {
    category: 'Dashboards',
    value: 78,
  },
  {
    category: 'Reports',
    value: 69,
  },
  {
    category: 'Alerts',
    value: 61,
  },
];

pictorialColumn('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Pictorial column chart',
    subtitle: 'bar family · pictorial-column mode',
  },
  accessibility: {
    label:
      'Pictorial column chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    options: {
      symbol: 'diamond',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Pictorial column chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-variable-width"></a>

### Variable width column chart

Use this preset when you need to compare values across discrete categories. Allocates category width from an additional quantitative field.

- **Quick API:** `variableWidth()`
- **Mode:** `variable-width`
- **Portable mark:** `variwide`
- **Required example fields:** `category`, `value`, `width`

```js
import { variableWidth } from 'graflume/complete';

const data = [
  {
    category: 'Insights',
    value: 86,
    width: 24,
  },
  {
    category: 'Dashboards',
    value: 78,
    width: 21,
  },
  {
    category: 'Reports',
    value: 69,
    width: 18,
  },
  {
    category: 'Alerts',
    value: 61,
    width: 15,
  },
];

variableWidth('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Adoption (%)',
  },
  title: {
    text: 'Variable width column chart',
    subtitle: 'bar family · variable-width mode',
  },
  accessibility: {
    label:
      'Variable width column chart: Feature adoption, ordered so the leading capability is immediately clear',
    description:
      'Feature adoption, ordered so the leading capability is immediately clear. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    fields: {
      width: 'width',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Variable width column chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Adoption (%)',
          format: 'number',
        },
        {
          field: 'width',
          label: 'Width',
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

Use a bar chart to compare quantitative values across discrete categories. In the explicit orientation APIs, `horizontalBar()` renders horizontal bars and `column()` renders vertical columns. The original `bar()` API remains a backward-compatible vertical alias.

## Implemented appearance

The following snapshot is generated from the current Graflume `compile()` Scene and uses the same primitives, coordinates, colors, opacity, clipping, and typography instructions as the Canvas renderer.

| Horizontal bar                                                                                    | Vertical column                                                                                          |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ![Graflume bar chart showing monthly sales as six blue horizontal bars](../assets/charts/bar.svg) | ![Graflume column chart showing monthly sales as six blue vertical columns](../assets/charts/column.svg) |

## Quick API

```ts
import { horizontalBar } from 'graflume';

const chart = horizontalBar('#chart', data, {
  title: 'Monthly sales',
  x: {
    field: 'sales',
    type: 'quantitative',
    title: 'Sales',
    scale: { zero: true, nice: true },
  },
  y: {
    field: 'month',
    type: 'ordinal',
    title: 'Month',
    axis: { grid: false },
  },
  mark: {
    fill: '#4f46e5',
    stroke: '#3730a3',
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
  mark: {
    type: 'bar',
    orientation: 'horizontal',
    fill: '#4f46e5',
    cornerRadius: 8,
  },
  x: {
    field: 'sales',
    type: 'quantitative',
    scale: { zero: true, nice: true },
  },
  y: { field: 'month', type: 'ordinal' },
};

Graflume.create('#chart', spec);
```

`horizontalBar()`, `column()`, and the existing `bar()` all compile to the same portable `bar` mark. Orientation is stored explicitly in `mark.orientation`, so serialization is unambiguous.

## Data behavior

- Horizontal bars use quantitative x and categorical y; vertical columns use categorical x and quantitative y.
- Both axes now support categorical, quantitative, or temporal scales when the selected mark can use them.
- Bar domains include zero automatically, even when `scale.zero` is omitted.
- Positive and negative values extend in opposite directions from the zero baseline.
- Rows with missing or non-mappable x/y pairs are skipped.
- Input category order is preserved unless an explicit categorical domain is supplied.

## Grouped bars

For long-form data, keep all series in one layer with `mark.fields.series` and the function-free `mark.options.stack` contract. `grouped` dodges series, `stacked` and `diverging` use separate positive and negative cursors, and `100-percent` divides signed widths by the category's total absolute magnitude.

```ts
Graflume.bar('#chart', data, {
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'sales', type: 'quantitative' },
  mark: {
    fields: { series: 'region' },
    options: {
      stack: { mode: '100-percent', order: 'sumDescending' },
    },
  },
});
```

Every rectangle retains the source row and adds `stackStart`, `stackEnd`, `stackTotal`, positive/negative/net totals, and signed `stackPercent` to its derived tooltip row. The compiler's data lineage records the total calculation and exact stack offset/order. One source row per category-series pair is the portable input contract; aggregate duplicates explicitly before stacking.

Canonical `encoding` remains active on this series path: `color`, `fill`, `stroke`, `opacity`, `strokeWidth`, `strokeDash`, draw `order`, and `tooltip` are resolved for every source row. The stack transform owns both quantitative boundaries, so `x2` and `y2` are explicit validation errors when `mark.options.stack` is present; they are never accepted and then ignored. Use `mark.options.stack.order` for stack-layer order—`encoding.order` controls only Scene draw order.

For wide data, set `position: 'group'` on every bar layer that should occupy a separate slot.

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
      mark: { type: 'bar', position: 'group', fill: '#7c3aed' },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'plan', type: 'quantitative' },
    },
    {
      id: 'actual',
      mark: { type: 'bar', position: 'group', fill: '#4f46e5' },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'actual', type: 'quantitative' },
    },
  ],
});
```

Without `position: 'group'`, multiple bar layers use overlay positioning.

## Interactive ranking and bounded virtualization

`createBarVirtualizationController()` owns the mutable retained-row window, deterministic aggregate ranking, keyboard/page navigation, and the much smaller materialized chart window. Raw retention never exceeds `maxRows`; rendered/controller output never exceeds `windowRows + 2 * overscanRows`.

```ts
import { createBarVirtualizationController } from 'graflume';

const bars = createBarVirtualizationController(rows, {
  key: 'id',
  category: 'team',
  value: 'sales',
  aggregate: 'value',
  direction: 'descending',
  maxRows: 50_000,
  windowRows: 100,
  overscanRows: 20,
});

let visible = bars.navigate('PageDown').window;
visible = bars.upsert([{ id: 'team-a', sales: 420 }]).window;
const movement = bars.state().last.rankChanges;
```

`append()`, `upsert()`, and `replace()` mutate the bounded retained snapshot. `sort()` changes ascending/descending rank order. `navigate()` accepts `ArrowUp`, `ArrowDown`, `Home`, `End`, `PageUp`, and `PageDown`; `setWindowStart()` supports scroll-driven hosts. The active category survives reranking by stable identity whenever it is still present.

Each transition reports accepted, updated, evicted, reused retained, recomputed rank, reused rank, reused window, and materialized row counts. Rank entries carry `previousRank` and signed `rankChange`; navigation does not recompute rank. `snapshot()` is structured-cloneable and Worker protocol v2 accepts the identical request through `worker.barVirtualization()`.

## Interaction

Each rendered rectangle carries its layer id, row index, and original datum. Hover and click events work in the standard profile:

```ts
chart.on('click', ({ hit }) => {
  if (hit) console.log(hit.datum.layerId, hit.datum.datum);
});
```

Large and ultra profiles reduce rendered bars and disable per-bar and axis-nearest tooltip lookup. In the standard profile, the generated example enables x-axis lookup while exact rectangle hits retain priority.

## Current limitations

None remain in the audited P0/current-limitations boundary as of 2026-08-26. The `current-limitations-2026-08-26` implementation moved these former limitations into executable support:

- weighted count
- interactive sort and rank
- automatic total and segment labels
- worker-bounded virtualization

The separately cataloged P1/P2 research roadmap remains future work and is not presented as current runtime support. Exact implementation and test paths are recorded in [the completion evidence](../../catalog/graflume.current-limitations.evidence.json).

## Runnable examples and tests

- [single-series example](../../examples/bar/index.html)
- [standalone grouped CDN example](../../examples/cdn/bar-chart.html)
- [chart type gallery](../../examples/cdn/chart-types.html)
- [default-family chart gallery](../../examples/cdn/complete-chart-types.html)
- [bar regression tests](../../tests/bar.test.mjs)
- [series stack and indicator contract tests](../../tests/series-stack-indicator.test.mjs)

[Back to chart guides](./README.md)
