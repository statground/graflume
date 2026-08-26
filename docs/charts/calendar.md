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

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

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
    date: '2025-01-01',
    value: 59,
  },
  {
    date: '2025-01-02',
    value: 60,
  },
  {
    date: '2025-01-03',
    value: 61,
  },
  {
    date: '2025-01-04',
    value: 45,
  },
];

calendar('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'Date',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Daily sessions',
  },
  title: {
    text: 'Calendar chart',
    subtitle: 'calendar family · default mode',
  },
  accessibility: {
    label:
      'Calendar chart: A complete year of daily activity with weekday rhythm and a release lift',
    description:
      'A complete year of daily activity with weekday rhythm and a release lift. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  axes: {
    x: false,
    y: false,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Calendar chart',
      fields: [
        {
          field: 'date',
          label: 'Date',
          format: 'date',
        },
        {
          field: 'value',
          label: 'Daily sessions',
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

## Locale, week start, and timezone

The top-level `locale` controls both the localized weekday header text and, when `mark.options.weekStart` is omitted, the first row of the week. For example, `en-US` and `ko-KR` start on Sunday while `en-GB` starts on Monday. Graflume uses the runtime's `Intl.Locale` week information when available and applies deterministic region rules on older runtimes.

`mark.options.timeZone` assigns each input instant to its civil calendar date before aggregation and formats the weekday headers in that same IANA timezone. Set `weekStart` to an integer from `0` (Sunday) through `6` (Saturday) to override the locale explicitly:

```ts
Graflume.calendar('#chart', data, {
  locale: 'en-GB',
  x: { field: 'date', type: 'temporal' },
  y: { field: 'activity', type: 'quantitative' },
  mark: {
    options: {
      mode: 'month',
      timeZone: 'Europe/London',
      weekStart: 2, // Explicit Tuesday start wins over en-GB's Monday start.
    },
  },
});
```

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

None remain in the audited P0/current-limitations boundary as of 2026-08-26. The `current-limitations-2026-08-26` implementation moved these former limitations into executable support:

- year/month/week/day modes
- locale week start and timezone
- leap/no-data/zero policy
- month boundaries

The separately cataloged P1/P2 research roadmap remains future work and is not presented as current runtime support. Exact implementation and test paths are recorded in [the completion evidence](../../catalog/graflume.current-limitations.evidence.json).

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/calendar.svg)

[Back to chart guides](./README.md)
