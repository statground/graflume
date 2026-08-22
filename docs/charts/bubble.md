# Bubble charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `bubble` family. Its canonical Quick API is `bubble()` from `graflume`, and its representative portable mark is `bubble`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                               | Quick API        | Mode            | Portable mark   | Functional difference                                       |
| --------------------------------------------- | ---------------- | --------------- | --------------- | ----------------------------------------------------------- |
| [Bubble chart](#variant-bubble)               | `bubble()`       | `default`       | `bubble`        | Positions magnitude-scaled circles on coordinates.          |
| [Packed bubble chart](#variant-packed-bubble) | `packedBubble()` | `packed-bubble` | `packed-bubble` | Uses deterministic collision-aware packing instead of axes. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                   |                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Bubble chart](#variant-bubble)**<br>[![Current Bubble chart output](../assets/charts/bubble.svg)](../assets/charts/bubble.svg) | **[Packed bubble chart](#variant-packed-bubble)**<br>[![Current Packed bubble chart output](../assets/charts/packed-bubble.svg)](../assets/charts/packed-bubble.svg) |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

<a id="variant-bubble"></a>

### Bubble chart

Use this preset when position and an additional magnitude channel must be read together. Positions magnitude-scaled circles on coordinates.

- **Quick API:** `bubble()`
- **Mode:** `default`
- **Portable mark:** `bubble`
- **Required example fields:** `x`, `y`, `size`, `group`

```js
import { bubble } from 'graflume';

const data = [
  {
    x: 12,
    y: 42,
    size: 20,
    group: 'A',
  },
  {
    x: 24,
    y: 55,
    size: 85,
    group: 'B',
  },
  {
    x: 38,
    y: 33,
    size: 55,
    group: 'A',
  },
  {
    x: 51,
    y: 68,
    size: 120,
    group: 'C',
  },
];

bubble('#chart', data, {
  x: {
    field: 'x',
    type: 'quantitative',
    title: 'x',
  },
  y: {
    field: 'y',
    type: 'quantitative',
    title: 'y',
  },
  title: {
    text: 'Bubble chart',
    subtitle: 'bubble family · default mode',
  },
  accessibility: {
    label: 'Bubble chart example',
    description: 'A compiled bubble chart example using the bubble family.',
  },
  mark: {
    fields: {
      size: 'size',
      color: 'group',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Bubble chart',
      fields: [
        {
          field: 'x',
          label: 'x',
          format: 'number',
        },
        {
          field: 'y',
          label: 'y',
          format: 'number',
        },
        {
          field: 'size',
          label: 'Size',
          format: 'number',
        },
        {
          field: 'group',
          label: 'Group',
          format: 'auto',
        },
      ],
    },
  },
});
```

<a id="variant-packed-bubble"></a>

### Packed bubble chart

Use this preset when position and an additional magnitude channel must be read together. Uses deterministic collision-aware packing instead of axes.

- **Quick API:** `packedBubble()`
- **Mode:** `packed-bubble`
- **Portable mark:** `packed-bubble`
- **Required example fields:** `category`, `value`

```js
import { packedBubble } from 'graflume/complete';

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

packedBubble('#chart', data, {
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
    text: 'Packed bubble chart',
    subtitle: 'bubble family · packed-bubble mode',
  },
  accessibility: {
    label: 'Packed bubble chart example',
    description: 'A compiled packed bubble chart example using the bubble family.',
  },
  axes: {
    x: false,
    y: false,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Packed bubble chart',
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
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

Use a bubble chart to compare two quantitative positions plus magnitude and an optional category.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume bubble charts output](../assets/charts/bubble.svg)

## Quick API

`Graflume.bubble()` creates the portable `bubble` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.bubble('#chart', data, {
  x: { field: 'reach', type: 'quantitative' },
  y: { field: 'impact', type: 'quantitative' },
  mark: {
    fields: { size: 'budget', color: 'team' },
    options: { minRadius: 6, maxRadius: 26 },
  },
});
```

## Portable ChartSpec mapping

`x` and `y` are quantitative. `mark.fields.size` supplies bubble area magnitude and `color` supplies a categorical palette key. `minRadius` and `maxRadius` are portable numeric options.

The same result can be created with `Graflume.create()` and `mark: { type: 'bubble' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Bubble radius uses a square-root scale so perceived area tracks magnitude. Missing positions are skipped; missing size uses the middle radius. Motion charts reuse this compiler after frame filtering.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Automatic bubble-label placement, collision packing, and categorical legends are not implemented yet.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/bubble.svg)

[Back to chart guides](./README.md)
