# Candlestick charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `candlestick` family. Its canonical Quick API is `candlestick()` from `graflume`, and its representative portable mark is `candlestick`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                                           | Quick API             | Mode                  | Portable mark | Functional difference                                          |
| --------------------------------------------------------- | --------------------- | --------------------- | ------------- | -------------------------------------------------------------- |
| [Candlestick chart](#variant-candlestick)                 | `candlestick()`       | `default`             | `candlestick` | Uses conventional open-high-low-close bodies and wicks.        |
| [Heikin-Ashi chart](#variant-heikin-ashi)                 | `heikinAshi()`        | `heikin-ashi`         | `financial`   | Uses derived Heikin-Ashi open and close values.                |
| [High-low-close chart](#variant-high-low-close)           | `highLowClose()`      | `high-low-close`      | `financial`   | Shows high-low stems plus the close tick without an open tick. |
| [Hollow candlestick chart](#variant-hollow-candlestick)   | `hollowCandlestick()` | `hollow-candlestick`  | `financial`   | Uses hollow and filled bodies to distinguish direction.        |
| [Open-high-low-close chart](#variant-open-high-low-close) | `openHighLowClose()`  | `open-high-low-close` | `financial`   | Shows open and close ticks on a high-low stem.                 |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                                                                                    |                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Candlestick chart](#variant-candlestick)**<br>[![Current Candlestick chart output](../assets/charts/candlestick.svg)](../assets/charts/candlestick.svg)                                         | **[Heikin-Ashi chart](#variant-heikin-ashi)**<br>[![Current Heikin-Ashi chart output](../assets/charts/heikin-ashi.svg)](../assets/charts/heikin-ashi.svg)                                    |
| **[High-low-close chart](#variant-high-low-close)**<br>[![Current High-low-close chart output](../assets/charts/high-low-close.svg)](../assets/charts/high-low-close.svg)                          | **[Hollow candlestick chart](#variant-hollow-candlestick)**<br>[![Current Hollow candlestick chart output](../assets/charts/hollow-candlestick.svg)](../assets/charts/hollow-candlestick.svg) |
| **[Open-high-low-close chart](#variant-open-high-low-close)**<br>[![Current Open-high-low-close chart output](../assets/charts/open-high-low-close.svg)](../assets/charts/open-high-low-close.svg) |                                                                                                                                                                                               |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family uses `trigger: "axis"` with `axis: "x"`. An exact rendered-mark hit still has priority; otherwise Graflume selects the nearest actual datum on that axis without inventing an interpolated row. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-candlestick"></a>

### Candlestick chart

Use this preset when open, high, low, and close values must remain visually distinct. Uses conventional open-high-low-close bodies and wicks.

- **Quick API:** `candlestick()`
- **Mode:** `default`
- **Portable mark:** `candlestick`
- **Required example fields:** `date`, `close`, `open`, `high`, `low`

```js
import { candlestick } from 'graflume';

const data = [
  {
    date: '2026-01-01',
    close: 25,
    open: 22,
    high: 33,
    low: 14,
  },
  {
    date: '2026-02-01',
    close: 22,
    open: 23,
    high: 34.1,
    low: 14.8,
  },
  {
    date: '2026-03-01',
    close: 27,
    open: 24,
    high: 35.2,
    low: 15.6,
  },
  {
    date: '2026-04-01',
    close: 24,
    open: 25,
    high: 36.3,
    low: 16.4,
  },
];

candlestick('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'date',
  },
  y: {
    field: 'close',
    type: 'quantitative',
    title: 'close',
  },
  title: {
    text: 'Candlestick chart',
    subtitle: 'candlestick family · default mode',
  },
  accessibility: {
    label: 'Candlestick chart example',
    description: 'A compiled candlestick chart example using the candlestick family.',
  },
  mark: {
    fields: {
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Candlestick chart',
      fields: [
        {
          field: 'date',
          label: 'date',
          format: 'date',
        },
        {
          field: 'close',
          label: 'close',
          format: 'number',
        },
        {
          field: 'open',
          label: 'Open',
          format: 'number',
        },
        {
          field: 'high',
          label: 'High',
          format: 'number',
        },
        {
          field: 'low',
          label: 'Low',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-heikin-ashi"></a>

### Heikin-Ashi chart

Use this preset when open, high, low, and close values must remain visually distinct. Uses derived Heikin-Ashi open and close values.

- **Quick API:** `heikinAshi()`
- **Mode:** `heikin-ashi`
- **Portable mark:** `financial`
- **Required example fields:** `date`, `close`, `open`, `high`, `low`

```js
import { heikinAshi } from 'graflume/complete';

const data = [
  {
    date: '2026-01-01',
    close: 25,
    open: 22,
    high: 33,
    low: 14,
  },
  {
    date: '2026-02-01',
    close: 22,
    open: 23,
    high: 34.1,
    low: 14.8,
  },
  {
    date: '2026-03-01',
    close: 27,
    open: 24,
    high: 35.2,
    low: 15.6,
  },
  {
    date: '2026-04-01',
    close: 24,
    open: 25,
    high: 36.3,
    low: 16.4,
  },
];

heikinAshi('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'date',
  },
  y: {
    field: 'close',
    type: 'quantitative',
    title: 'close',
  },
  title: {
    text: 'Heikin-Ashi chart',
    subtitle: 'candlestick family · heikin-ashi mode',
  },
  accessibility: {
    label: 'Heikin-Ashi chart example',
    description: 'A compiled heikin-ashi chart example using the candlestick family.',
  },
  mark: {
    fields: {
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
    },
    options: {
      kind: 'heikin-ashi',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Heikin-Ashi chart',
      fields: [
        {
          field: 'date',
          label: 'date',
          format: 'date',
        },
        {
          field: 'close',
          label: 'close',
          format: 'number',
        },
        {
          field: 'open',
          label: 'Open',
          format: 'number',
        },
        {
          field: 'high',
          label: 'High',
          format: 'number',
        },
        {
          field: 'low',
          label: 'Low',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-high-low-close"></a>

### High-low-close chart

Use this preset when open, high, low, and close values must remain visually distinct. Shows high-low stems plus the close tick without an open tick.

- **Quick API:** `highLowClose()`
- **Mode:** `high-low-close`
- **Portable mark:** `financial`
- **Required example fields:** `date`, `close`, `open`, `high`, `low`

```js
import { highLowClose } from 'graflume/complete';

const data = [
  {
    date: '2026-01-01',
    close: 25,
    open: 22,
    high: 33,
    low: 14,
  },
  {
    date: '2026-02-01',
    close: 22,
    open: 23,
    high: 34.1,
    low: 14.8,
  },
  {
    date: '2026-03-01',
    close: 27,
    open: 24,
    high: 35.2,
    low: 15.6,
  },
  {
    date: '2026-04-01',
    close: 24,
    open: 25,
    high: 36.3,
    low: 16.4,
  },
];

highLowClose('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'date',
  },
  y: {
    field: 'close',
    type: 'quantitative',
    title: 'close',
  },
  title: {
    text: 'High-low-close chart',
    subtitle: 'candlestick family · high-low-close mode',
  },
  accessibility: {
    label: 'High-low-close chart example',
    description: 'A compiled high-low-close chart example using the candlestick family.',
  },
  mark: {
    fields: {
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
    },
    options: {
      kind: 'high-low-close',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'High-low-close chart',
      fields: [
        {
          field: 'date',
          label: 'date',
          format: 'date',
        },
        {
          field: 'close',
          label: 'close',
          format: 'number',
        },
        {
          field: 'open',
          label: 'Open',
          format: 'number',
        },
        {
          field: 'high',
          label: 'High',
          format: 'number',
        },
        {
          field: 'low',
          label: 'Low',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-hollow-candlestick"></a>

### Hollow candlestick chart

Use this preset when open, high, low, and close values must remain visually distinct. Uses hollow and filled bodies to distinguish direction.

- **Quick API:** `hollowCandlestick()`
- **Mode:** `hollow-candlestick`
- **Portable mark:** `financial`
- **Required example fields:** `date`, `close`, `open`, `high`, `low`

```js
import { hollowCandlestick } from 'graflume/complete';

const data = [
  {
    date: '2026-01-01',
    close: 25,
    open: 22,
    high: 33,
    low: 14,
  },
  {
    date: '2026-02-01',
    close: 22,
    open: 23,
    high: 34.1,
    low: 14.8,
  },
  {
    date: '2026-03-01',
    close: 27,
    open: 24,
    high: 35.2,
    low: 15.6,
  },
  {
    date: '2026-04-01',
    close: 24,
    open: 25,
    high: 36.3,
    low: 16.4,
  },
];

hollowCandlestick('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'date',
  },
  y: {
    field: 'close',
    type: 'quantitative',
    title: 'close',
  },
  title: {
    text: 'Hollow candlestick chart',
    subtitle: 'candlestick family · hollow-candlestick mode',
  },
  accessibility: {
    label: 'Hollow candlestick chart example',
    description: 'A compiled hollow candlestick chart example using the candlestick family.',
  },
  mark: {
    fields: {
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
    },
    options: {
      kind: 'hollow-candlestick',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Hollow candlestick chart',
      fields: [
        {
          field: 'date',
          label: 'date',
          format: 'date',
        },
        {
          field: 'close',
          label: 'close',
          format: 'number',
        },
        {
          field: 'open',
          label: 'Open',
          format: 'number',
        },
        {
          field: 'high',
          label: 'High',
          format: 'number',
        },
        {
          field: 'low',
          label: 'Low',
          format: 'number',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-open-high-low-close"></a>

### Open-high-low-close chart

Use this preset when open, high, low, and close values must remain visually distinct. Shows open and close ticks on a high-low stem.

- **Quick API:** `openHighLowClose()`
- **Mode:** `open-high-low-close`
- **Portable mark:** `financial`
- **Required example fields:** `date`, `close`, `open`, `high`, `low`

```js
import { openHighLowClose } from 'graflume/complete';

const data = [
  {
    date: '2026-01-01',
    close: 25,
    open: 22,
    high: 33,
    low: 14,
  },
  {
    date: '2026-02-01',
    close: 22,
    open: 23,
    high: 34.1,
    low: 14.8,
  },
  {
    date: '2026-03-01',
    close: 27,
    open: 24,
    high: 35.2,
    low: 15.6,
  },
  {
    date: '2026-04-01',
    close: 24,
    open: 25,
    high: 36.3,
    low: 16.4,
  },
];

openHighLowClose('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'date',
  },
  y: {
    field: 'close',
    type: 'quantitative',
    title: 'close',
  },
  title: {
    text: 'Open-high-low-close chart',
    subtitle: 'candlestick family · open-high-low-close mode',
  },
  accessibility: {
    label: 'Open-high-low-close chart example',
    description: 'A compiled open-high-low-close chart example using the candlestick family.',
  },
  mark: {
    fields: {
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
    },
    options: {
      kind: 'open-high-low-close',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Open-high-low-close chart',
      fields: [
        {
          field: 'date',
          label: 'date',
          format: 'date',
        },
        {
          field: 'close',
          label: 'close',
          format: 'number',
        },
        {
          field: 'open',
          label: 'Open',
          format: 'number',
        },
        {
          field: 'high',
          label: 'High',
          format: 'number',
        },
        {
          field: 'low',
          label: 'Low',
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

Use a candlestick chart for ordered open-high-low-close observations.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume candlestick charts output](../assets/charts/candlestick.svg)

## Quick API

`Graflume.candlestick()` creates the portable `candlestick` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.candlestick('#chart', data, {
  x: { field: 'day', type: 'ordinal' },
  y: { field: 'close', type: 'quantitative' },
  mark: { fields: { open: 'open', high: 'high', low: 'low', close: 'close' } },
});
```

## Portable ChartSpec mapping

`x` is an ordered category or time. `y` normally names close, while `fields.open`, `high`, `low`, and `close` identify OHLC columns.

The same result can be created with `Graflume.create()` and `mark: { type: 'candlestick' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

The y domain includes every OHLC channel. Each row becomes a high-low wick and an open-close body; rising and falling bodies use separate colors.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Volume panels, trading-session gaps, hollow-candle conventions, and financial indicators are not implemented yet.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/candlestick.svg)

[Back to chart guides](./README.md)
