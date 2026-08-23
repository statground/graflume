# Ternary charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `ternary` family. Its canonical Quick API is `ternary()` from `graflume/complete`, and its representative portable mark is `ternary`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                   | Quick API   | Mode      | Portable mark | Functional difference                                                 |
| --------------------------------- | ----------- | --------- | ------------- | --------------------------------------------------------------------- |
| [Ternary chart](#variant-ternary) | `ternary()` | `default` | `ternary`     | Normalizes three non-negative components into triangular coordinates. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                        |     |
| -------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **[Ternary chart](#variant-ternary)**<br>[![Current Ternary chart output](../assets/charts/ternary.svg)](../assets/charts/ternary.svg) |     |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Tooltip interaction is a pointer-only convenience, so keep a readable summary or data table available for exact values and keyboard access. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-ternary"></a>

### Ternary chart

Use this preset when three non-negative components must be compared as relative composition. Normalizes three non-negative components into triangular coordinates.

- **Quick API:** `ternary()`
- **Mode:** `default`
- **Portable mark:** `ternary`
- **Required example fields:** `a`, `b`, `c`, `series`

```js
import { ternary } from 'graflume/complete';

const data = [
  {
    a: 65,
    b: 25,
    c: 10,
    series: 'Mix',
  },
  {
    a: 42,
    b: 38,
    c: 20,
    series: 'Mix',
  },
  {
    a: 24,
    b: 31,
    c: 45,
    series: 'Mix',
  },
  {
    a: 12,
    b: 58,
    c: 30,
    series: 'Mix',
  },
];

ternary('#chart', data, {
  x: {
    field: 'a',
    type: 'quantitative',
    title: 'a',
  },
  y: {
    field: 'b',
    type: 'quantitative',
    title: 'b',
  },
  title: {
    text: 'Ternary chart',
    subtitle: 'ternary family · default mode',
  },
  accessibility: {
    label: 'Ternary chart example',
    description: 'A compiled ternary chart example using the ternary family.',
  },
  mark: {
    fields: {
      c: 'c',
      series: 'series',
    },
    options: {
      mode: 'line',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Ternary chart',
      fields: [
        {
          field: 'a',
          label: 'a',
          format: 'number',
        },
        {
          field: 'b',
          label: 'b',
          format: 'number',
        },
        {
          field: 'c',
          label: 'C',
          format: 'number',
        },
        {
          field: 'series',
          label: 'Series',
          format: 'auto',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

The `ternary` family compares three non-negative components whose relative shares place each row inside a triangular coordinate system.

## Data contract

Map the first two components through `x` and `y`, and name the third with `mark.fields.c`. Values are normalized per row, so they may be proportions, percentages, or positive totals. Rows with a non-positive combined total are ignored.

## Styling and interaction

The triangle, grid, and axis labels are compiled Scene primitives. Scatter is the default; line mode joins rows in source order and may close the path. Points retain source rows for native tooltips.

## Accessibility and limits

State the three component names and units in adjacent text. The current compiler supports scatter and ordered line paths; density estimation and filled ternary contours are not implied by this family. Series are grouped once and share the active point and line budgets. The triangular frame is centered from its actual top coordinate, so narrow and tall viewports keep the apex above the base.

## Verification

Tests assert the triangular frame, grid, and one interactive point per valid composition.
