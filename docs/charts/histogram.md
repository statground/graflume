# Histograms

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `histogram` family. Its canonical Quick API is `histogram()` from `graflume`, and its representative portable mark is `histogram`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                   | Quick API     | Mode         | Portable mark  | Functional difference                                |
| --------------------------------- | ------------- | ------------ | -------------- | ---------------------------------------------------- |
| [Histogram](#variant-histogram)   | `histogram()` | `default`    | `histogram`    | Bins samples into counts.                            |
| [Bell curve](#variant-bell-curve) | `bellCurve()` | `bell-curve` | `distribution` | Derives and overlays a sampled normal-density curve. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                      |                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **[Histogram](#variant-histogram)**<br>[![Current Histogram output](../assets/charts/histogram.svg)](../assets/charts/histogram.svg) | **[Bell curve](#variant-bell-curve)**<br>[![Current Bell curve output](../assets/charts/bell-curve.svg)](../assets/charts/bell-curve.svg) |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

<a id="variant-histogram"></a>

### Histogram

Use this preset when the shape of a numeric distribution is more important than individual rows. Bins samples into counts.

- **Quick API:** `histogram()`
- **Mode:** `default`
- **Portable mark:** `histogram`
- **Required example fields:** `value`

```js
import { histogram } from 'graflume';

const data = [
  {
    value: 24,
  },
  {
    value: 29.916,
  },
  {
    value: 33.54,
  },
  {
    value: 33.72,
  },
];

histogram('#chart', data, {
  x: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  title: {
    text: 'Histogram',
    subtitle: 'histogram family · default mode',
  },
  accessibility: {
    label: 'Histogram example',
    description: 'A compiled histogram example using the histogram family.',
  },
  mark: {
    options: {
      bins: 8,
    },
  },
});
```

<a id="variant-bell-curve"></a>

### Bell curve

Use this preset when the shape of a numeric distribution is more important than individual rows. Derives and overlays a sampled normal-density curve.

- **Quick API:** `bellCurve()`
- **Mode:** `bell-curve`
- **Portable mark:** `distribution`
- **Required example fields:** `category`, `value`

```js
import { bellCurve } from 'graflume/complete';

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

bellCurve('#chart', data, {
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
    text: 'Bell curve',
    subtitle: 'histogram family · bell-curve mode',
  },
  accessibility: {
    label: 'Bell curve example',
    description: 'A compiled bell curve example using the histogram family.',
  },
});
```

<!-- FAMILY_PRESETS_END -->

Use a histogram to inspect the distribution of one quantitative field.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume histograms output](../assets/charts/histogram.svg)

## Quick API

`Graflume.histogram()` creates the portable `histogram` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.histogram('#chart', data, {
  x: { field: 'score', type: 'quantitative' },
  y: { field: 'score', type: 'quantitative', title: 'Count' },
  mark: { options: { bins: 12 } },
});
```

## Portable ChartSpec mapping

`x` names the measured field. `y` repeats that field as a portable placeholder while the compiler derives counts. `mark.options.bins` controls 1–100 equal-width bins.

The same result can be created with `Graflume.create()` and `mark: { type: 'histogram' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Finite values are binned between the observed minimum and maximum. The y domain is derived from bin counts rather than source values.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Automatic bin heuristics, unequal bins, density normalization, cumulative mode, and weighted counts are not implemented yet.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/histogram.svg)

[Back to chart guides](./README.md)
