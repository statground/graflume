# Calendar charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `calendar` family. Its canonical Quick API is `calendar()` from `graflume`, and its representative portable mark is `calendar`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                     | Quick API    | Mode      | Portable mark | Functional difference                            |
| ----------------------------------- | ------------ | --------- | ------------- | ------------------------------------------------ |
| [Calendar chart](#variant-calendar) | `calendar()` | `default` | `calendar`    | Uses the canonical presentation for this family. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                             |     |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **[Calendar chart](#variant-calendar)**<br>[![Current Calendar chart output](../assets/charts/calendar.svg)](../assets/charts/calendar.svg) |     |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Tooltip interaction is a pointer-only convenience, so keep a readable summary or data table available for exact values and keyboard access. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

<a id="variant-calendar"></a>

### Calendar chart

Use this preset when daily values need to be scanned in calendar order. Uses the canonical presentation for this family.

- **Quick API:** `calendar()`
- **Mode:** `default`
- **Portable mark:** `calendar`
- **Required example fields:** `date`, `value`

```js
import { calendar } from 'graflume';

const data = [
  {
    date: '2026-01-01',
    value: 0,
  },
  {
    date: '2026-01-02',
    value: 13,
  },
  {
    date: '2026-01-03',
    value: 26,
  },
  {
    date: '2026-01-04',
    value: 39,
  },
];

calendar('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'date',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  title: {
    text: 'Calendar chart',
    subtitle: 'calendar family · default mode',
  },
  accessibility: {
    label: 'Calendar chart example',
    description: 'A compiled calendar chart example using the calendar family.',
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Calendar chart',
      fields: [
        {
          field: 'date',
          label: 'date',
          format: 'date',
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

Use a calendar chart to reveal daily intensity, seasonality, and gaps.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume calendar charts output](../assets/charts/calendar.svg)

## Quick API

`Graflume.calendar()` creates the portable `calendar` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.calendar('#chart', data, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'activity', type: 'quantitative' },
});
```

## Portable ChartSpec mapping

`x` is a Date or parseable temporal string and `y` is quantitative. Input dates are sorted before week/day placement.

The same result can be created with `Graflume.create()` and `mark: { type: 'calendar' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

The compiler places days in week columns and weekday rows, then maps values through the theme sequential palette. Invalid dates and missing values are skipped.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

The current alpha view draws one continuous year grid; month boundaries, multiple-year rows, localized weekday labels, and patterned no-data cells remain planned.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/calendar.svg)

[Back to chart guides](./README.md)
