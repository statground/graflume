# Interval chart

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

## Integrated presets

These names remain source-compatible, but discovery surfaces count them as modes of this family.

| Preset                  | Quick API           | Mode                | Portable mark |
| ----------------------- | ------------------- | ------------------- | ------------- |
| Intervals               | `intervals()`       | `default`           | `interval`    |
| Area range chart        | `areaRange()`       | `area-range`        | `range`       |
| Smooth area range chart | `areaSplineRange()` | `area-spline-range` | `range`       |
| Column range chart      | `columnRange()`     | `column-range`      | `range`       |
| Dumbbell chart          | `dumbbell()`        | `dumbbell`          | `range`       |
| Error bar chart         | `errorBar()`        | `error-bar`         | `interval`    |

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
