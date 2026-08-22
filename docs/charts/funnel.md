# Funnel charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `funnel` family. Its canonical Quick API is `funnel()` from `graflume/complete`, and its representative portable mark is `funnel`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                            | Quick API     | Mode         | Portable mark | Functional difference                                    |
| ------------------------------------------ | ------------- | ------------ | ------------- | -------------------------------------------------------- |
| [Funnel chart](#variant-funnel)            | `funnel()`    | `default`    | `funnel`      | Uses decreasing centered stages.                         |
| [Depth funnel chart](#variant-funnel-3d)   | `funnel3d()`  | `funnel-3d`  | `pyramid`     | Adds portable depth faces to funnel stages.              |
| [Pyramid chart](#variant-pyramid)          | `pyramid()`   | `pyramid`    | `pyramid`     | Reverses the stage emphasis into a pyramid presentation. |
| [Depth pyramid chart](#variant-pyramid-3d) | `pyramid3d()` | `pyramid-3d` | `pyramid`     | Adds portable depth faces to pyramid stages.             |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                        |                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Funnel chart](#variant-funnel)**<br>[![Current Funnel chart output](../assets/charts/funnel.svg)](../assets/charts/funnel.svg)      | **[Depth funnel chart](#variant-funnel-3d)**<br>[![Current Depth funnel chart output](../assets/charts/funnel-3d.svg)](../assets/charts/funnel-3d.svg)      |
| **[Pyramid chart](#variant-pyramid)**<br>[![Current Pyramid chart output](../assets/charts/pyramid.svg)](../assets/charts/pyramid.svg) | **[Depth pyramid chart](#variant-pyramid-3d)**<br>[![Current Depth pyramid chart output](../assets/charts/pyramid-3d.svg)](../assets/charts/pyramid-3d.svg) |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Tooltip interaction is a pointer-only convenience, so keep a readable summary or data table available for exact values and keyboard access. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

<a id="variant-funnel"></a>

### Funnel chart

Use this preset when ordered stages and their decreasing or increasing magnitude must be compared. Uses decreasing centered stages.

- **Quick API:** `funnel()`
- **Mode:** `default`
- **Portable mark:** `funnel`
- **Required example fields:** `category`, `value`

```js
import { funnel } from 'graflume/complete';

const data = [
  {
    category: 'Search',
    value: 46,
  },
  {
    category: 'Direct',
    value: 28,
  },
  {
    category: 'Social',
    value: 17,
  },
  {
    category: 'Other',
    value: 9,
  },
];

funnel('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'category',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  title: {
    text: 'Funnel chart',
    subtitle: 'funnel family · default mode',
  },
  accessibility: {
    label: 'Funnel chart example',
    description: 'A compiled funnel chart example using the funnel family.',
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Funnel chart',
      fields: [
        {
          field: 'category',
          label: 'category',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'value',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-funnel-3d"></a>

### Depth funnel chart

Use this preset when ordered stages and their decreasing or increasing magnitude must be compared. Adds portable depth faces to funnel stages.

- **Quick API:** `funnel3d()`
- **Mode:** `funnel-3d`
- **Portable mark:** `pyramid`
- **Required example fields:** `category`, `value`

```js
import { funnel3d } from 'graflume/complete';

const data = [
  {
    category: 'P1',
    value: 24,
  },
  {
    category: 'P2',
    value: 29.916,
  },
  {
    category: 'P3',
    value: 33.54,
  },
  {
    category: 'P4',
    value: 33.72,
  },
];

funnel3d('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'category',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  title: {
    text: 'Depth funnel chart',
    subtitle: 'funnel family · funnel-3d mode',
  },
  accessibility: {
    label: 'Depth funnel chart example',
    description: 'A compiled depth funnel chart example using the funnel family.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    options: {
      variant: 'funnel-3d',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Depth funnel chart',
      fields: [
        {
          field: 'category',
          label: 'category',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'value',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-pyramid"></a>

### Pyramid chart

Use this preset when ordered stages and their decreasing or increasing magnitude must be compared. Reverses the stage emphasis into a pyramid presentation.

- **Quick API:** `pyramid()`
- **Mode:** `pyramid`
- **Portable mark:** `pyramid`
- **Required example fields:** `category`, `value`

```js
import { pyramid } from 'graflume/complete';

const data = [
  {
    category: 'P1',
    value: 24,
  },
  {
    category: 'P2',
    value: 29.916,
  },
  {
    category: 'P3',
    value: 33.54,
  },
  {
    category: 'P4',
    value: 33.72,
  },
];

pyramid('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'category',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  title: {
    text: 'Pyramid chart',
    subtitle: 'funnel family · pyramid mode',
  },
  accessibility: {
    label: 'Pyramid chart example',
    description: 'A compiled pyramid chart example using the funnel family.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    options: {
      variant: 'pyramid',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Pyramid chart',
      fields: [
        {
          field: 'category',
          label: 'category',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'value',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<a id="variant-pyramid-3d"></a>

### Depth pyramid chart

Use this preset when ordered stages and their decreasing or increasing magnitude must be compared. Adds portable depth faces to pyramid stages.

- **Quick API:** `pyramid3d()`
- **Mode:** `pyramid-3d`
- **Portable mark:** `pyramid`
- **Required example fields:** `category`, `value`

```js
import { pyramid3d } from 'graflume/complete';

const data = [
  {
    category: 'P1',
    value: 24,
  },
  {
    category: 'P2',
    value: 29.916,
  },
  {
    category: 'P3',
    value: 33.54,
  },
  {
    category: 'P4',
    value: 33.72,
  },
];

pyramid3d('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'category',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  title: {
    text: 'Depth pyramid chart',
    subtitle: 'funnel family · pyramid-3d mode',
  },
  accessibility: {
    label: 'Depth pyramid chart example',
    description: 'A compiled depth pyramid chart example using the funnel family.',
  },
  axes: {
    x: false,
    y: false,
  },
  mark: {
    options: {
      variant: 'pyramid-3d',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Depth pyramid chart',
      fields: [
        {
          field: 'category',
          label: 'category',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'value',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

[Back to the chart guide index](./README.md)

![Current Graflume funnel charts output](../assets/charts/funnel.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a funnel chart to show ordered stage attrition such as visits, trials, purchases, and renewals.

## Data contract

`x` supplies the stage label and `y` supplies a non-negative value. Rows are sorted descending by default.

### Named fields

No additional fields are required; the primary encodings define each stage.

### Portable options

`sort: false` preserves input order. Normal mark fill, stroke, opacity, and line width options apply to the stage polygons.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { funnel } from 'graflume/complete';

funnel('#chart', stages, {
  x: { field: 'stage', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { sort: true } },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'funnel'`.

## Rendering behavior

Each row becomes a centered trapezoid whose width is proportional to the largest value. Labels and rounded values are drawn inside sufficiently wide stages.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

Every stage polygon retains its source row. Include stage values and conversion rates in a table or description rather than relying only on width.

## Performance

Funnel charts are cheap to render and intended for a small ordered sequence. Long stage lists should use bars instead.

## Current limitations

Automatic conversion percentages, two-sided funnels, compare mode, label overflow handling, and editable stage order are not implemented yet.
