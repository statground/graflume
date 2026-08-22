# Boxplots

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `boxplot` family. Its canonical Quick API is `boxplot()` from `graflume/complete`, and its representative portable mark is `boxplot`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name             | Quick API   | Mode      | Portable mark | Functional difference                            |
| --------------------------- | ----------- | --------- | ------------- | ------------------------------------------------ |
| [Boxplot](#variant-boxplot) | `boxplot()` | `default` | `boxplot`     | Uses the canonical presentation for this family. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                            |     |
| -------------------------------------------------------------------------------------------------------------------------- | --- |
| **[Boxplot](#variant-boxplot)**<br>[![Current Boxplot output](../assets/charts/boxplot.svg)](../assets/charts/boxplot.svg) |     |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

<a id="variant-boxplot"></a>

### Boxplot

Use this preset when you need to compare distributions through quartiles and extremes. Uses the canonical presentation for this family.

- **Quick API:** `boxplot()`
- **Mode:** `default`
- **Portable mark:** `boxplot`
- **Required example fields:** `category`, `value`, `low`, `q1`, `median`, `q3`, `high`

```js
import { boxplot } from 'graflume/complete';

const data = [
  {
    category: 'Alpha',
    low: 12,
    q1: 19,
    median: 27,
    q3: 34,
    high: 43,
  },
  {
    category: 'Beta',
    low: 17,
    q1: 24,
    median: 31,
    q3: 39,
    high: 48,
  },
  {
    category: 'Gamma',
    low: 9,
    q1: 16,
    median: 22,
    q3: 29,
    high: 38,
  },
];

boxplot('#chart', data, {
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
    text: 'Boxplot',
    subtitle: 'boxplot family · default mode',
  },
  accessibility: {
    label: 'Boxplot example',
    description: 'A compiled boxplot example using the boxplot family.',
  },
  mark: {
    fields: {
      low: 'low',
      q1: 'q1',
      median: 'median',
      q3: 'q3',
      high: 'high',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

[Back to the chart guide index](./README.md)

![Current Graflume boxplots output](../assets/charts/boxplot.svg)

> This image is generated from the actual renderer-neutral `compile()` Scene and checked for staleness in CI.

## When to use it

Use a boxplot to compare five-number summaries across categories.

## Data contract

`x` supplies category and the named fields supply `min`, `q1`, `median`, `q3`, and `max`. `y` normally points to the median.

### Named fields

`min`, `q1`, `median`, `q3`, and `max` default to fields with those names except median, which defaults to `y`.

### Portable options

Standard mark style properties control the box, whisker, median line, and category palette.

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

```js
import { boxplot } from 'graflume/complete';

boxplot('#chart', summaries, {
  x: { field: 'group', type: 'nominal' },
  y: { field: 'median', type: 'quantitative' },
  mark: {
    fields: { min: 'min', q1: 'q1', median: 'median', q3: 'q3', max: 'max' },
  },
});
```

The same chart can be represented as a function-free portable specification with `mark.type: 'boxplot'`.

## Rendering behavior

The y domain includes all five summary fields. Each valid row becomes whiskers, caps, an interactive quartile box, and a contrasting median line.

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

The quartile box carries the complete source row. Make all five statistics available in a table and mention the median and spread in the chart description.

## Performance

Scene cost is linear in categories. Hundreds of boxes remain feasible, but labels and category bandwidth become the practical limit.

## Current limitations

Raw-sample quartile calculation, notches, variable widths, outlier points, violin overlays, and horizontal orientation remain planned.
