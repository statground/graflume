# Raster image charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `image` family. Its canonical Quick API is `image()` from `graflume/complete`, and its representative portable mark is `image`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                | Quick API | Mode      | Portable mark | Functional difference                                            |
| ------------------------------ | --------- | --------- | ------------- | ---------------------------------------------------------------- |
| [Raster image](#variant-image) | `image()` | `default` | `image`       | Renders explicit color or RGBA rows as interactive raster cells. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                |     |
| ------------------------------------------------------------------------------------------------------------------------------ | --- |
| **[Raster image](#variant-image)**<br>[![Current Raster image output](../assets/charts/image.svg)](../assets/charts/image.svg) |     |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Tooltip interaction is a pointer-only convenience, so keep a readable summary or data table available for exact values and keyboard access. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-image"></a>

### Raster image

Use this preset when a bounded color matrix must preserve row-level pixel semantics. Renders explicit color or RGBA rows as interactive raster cells.

- **Quick API:** `image()`
- **Mode:** `default`
- **Portable mark:** `image`
- **Required example fields:** `x`, `y`, `red`, `green`, `blue`

```js
import { image } from 'graflume/complete';

const data = [
  {
    x: 0,
    y: 0,
    red: 38,
    green: 72,
    blue: 210,
  },
  {
    x: 1,
    y: 0,
    red: 73,
    green: 72,
    blue: 186,
  },
  {
    x: 2,
    y: 0,
    red: 108,
    green: 72,
    blue: 162,
  },
  {
    x: 3,
    y: 0,
    red: 143,
    green: 72,
    blue: 138,
  },
];

image('#chart', data, {
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
    text: 'Raster image',
    subtitle: 'image family · default mode',
  },
  accessibility: {
    label: 'Raster image example',
    description: 'A compiled raster image example using the image family.',
  },
  mark: {
    fields: {
      red: 'red',
      green: 'green',
      blue: 'blue',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Raster image',
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
          field: 'red',
          label: 'Red',
          format: 'number',
        },
        {
          field: 'green',
          label: 'Green',
          format: 'number',
        },
        {
          field: 'blue',
          label: 'Blue',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

The `image` family renders a data-backed raster from discrete cell coordinates. Each input row becomes a real interactive Scene rectangle rather than a decorative bitmap overlay.

## Data contract

Use `x` and `y` for pixel or cell positions. Supply either a portable color field or numeric `red`, `green`, `blue`, and optional `alpha` fields. Duplicate coordinates follow input order.

## Styling and interaction

Cells use the declared color or RGBA channels and may opt into a small gap or stroke. Every rendered cell keeps its source row for text-only tooltips and hit testing.

## Performance and limits

This mode is intended for bounded matrices and raster previews. Valid rows are sampled deterministically against the active `maxBarMarks` budget before Scene rectangles are emitted, while every retained cell still points to its original row. Large photographic images should remain ordinary image assets; this compiler intentionally keeps row-level semantics and does not fetch remote pixels.

## Verification

The catalog fixture asserts one interactive RGB Scene cell per valid row and generates the committed SVG preview from compiled output.
