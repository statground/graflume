# Interval chart

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `interval` family. Its canonical Quick API is `intervals()` from `graflume`, and its representative portable mark is `interval`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name         | Quick API           | Mode                | Portable mark | Functional difference                                     |
| ----------------------- | ------------------- | ------------------- | ------------- | --------------------------------------------------------- |
| Intervals               | `intervals()`       | `default`           | `interval`    | Uses a central point with low/high stems and caps.        |
| Area range chart        | `areaRange()`       | `area-range`        | `range`       | Fills the band between low and high values.               |
| Smooth area range chart | `areaSplineRange()` | `area-spline-range` | `range`       | Smooths both edges of a low/high band.                    |
| Column range chart      | `columnRange()`     | `column-range`      | `range`       | Uses one floating vertical column per low/high pair.      |
| Dumbbell chart          | `dumbbell()`        | `dumbbell`          | `range`       | Connects two endpoints and emphasizes both values.        |
| Error bar chart         | `errorBar()`        | `error-bar`         | `interval`    | Uses a low/high stem and compact caps around an estimate. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 6 compiled preset snapshots</summary>

| Preset                  | Current compiled output                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Intervals               | [![Current Intervals output](../assets/charts/intervals.svg)](../assets/charts/intervals.svg)                               |
| Area range chart        | [![Current Area range chart output](../assets/charts/area-range.svg)](../assets/charts/area-range.svg)                      |
| Smooth area range chart | [![Current Smooth area range chart output](../assets/charts/area-spline-range.svg)](../assets/charts/area-spline-range.svg) |
| Column range chart      | [![Current Column range chart output](../assets/charts/column-range.svg)](../assets/charts/column-range.svg)                |
| Dumbbell chart          | [![Current Dumbbell chart output](../assets/charts/dumbbell.svg)](../assets/charts/dumbbell.svg)                            |
| Error bar chart         | [![Current Error bar chart output](../assets/charts/error-bar.svg)](../assets/charts/error-bar.svg)                         |

</details>
<!-- FAMILY_PRESETS_END -->
![Current Interval chart output](../assets/charts/interval.svg)

This guide documents the consolidated **Interval chart** family. The image is generated from the actual compiled Scene used by the runtime renderer.

## When to use it

Show uncertainty, a low/high band, a column range, or a two-endpoint comparison without presenting those layouts as unrelated chart families.

## Canonical Quick API

```ts
import { intervals } from 'graflume';

intervals('#chart', data, {
  x: { field: 'month', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { low: 'low', high: 'high' }, options: { mode: 'area' } },
});
```

## Data contract

Declare `low` and `high` in `mark.fields`. Choose area, column, dumbbell, or error presentation through the listed preset API and its function-free mark options. Missing required values skip only the affected row. Input order remains stable unless the selected layout documents a deterministic sort.

## Rendering and portability

Every preset normalizes into the same ChartSpec, validation, scale, compiler, renderer-neutral Scene, interaction, and accessibility pipeline. Mode differences use function-free `mark.fields` and `mark.options`; they do not create a second engine or a second top-level family.

## Styling and interaction

Use theme tokens or common `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` properties where the selected geometry supports them. Interactive datum shapes retain their source row and layer metadata; decorative labels, grids, and depth faces do not create duplicate targets.

## Accessibility and performance

Provide a concise `accessibility.label`, describe the principal comparison or structure, and pair Canvas output with the data-table fallback. Dense labels, relationship crossings, and multi-part interval geometry can produce several Scene nodes per row, so aggregate when individual marks stop adding analytical value.

## Verification

- Snapshot: [`docs/assets/charts/interval.svg`](../assets/charts/interval.svg)
- Runtime catalogs: [`src/catalog`](../../src/catalog)
- Catalog tests: [`tests`](../../tests)
