# Annotation charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `annotation` family. Its canonical Quick API is `annotation()` from `graflume`, and its representative portable mark is `annotation`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name    | Quick API             | Mode          | Portable mark | Functional difference                                                  |
| ------------------ | --------------------- | ------------- | ------------- | ---------------------------------------------------------------------- |
| Annotation chart   | `annotation()`        | `default`     | `annotation`  | The canonical annotated trend presentation.                            |
| Annotated timeline | `annotatedTimeline()` | `timeline`    | `annotation`  | Uses the annotation family with the timeline compatibility name.       |
| Event flags        | `eventFlags()`        | `event-flags` | `flags`       | Replaces long annotation pills with compact labels anchored to events. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.

<details>
<summary>Open 3 compiled preset snapshots</summary>

| Preset             | Current compiled output                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Annotation chart   | [![Current Annotation chart output](../assets/charts/annotation.svg)](../assets/charts/annotation.svg)                   |
| Annotated timeline | [![Current Annotated timeline output](../assets/charts/annotated-timeline.svg)](../assets/charts/annotated-timeline.svg) |
| Event flags        | [![Current Event flags output](../assets/charts/event-flags.svg)](../assets/charts/event-flags.svg)                      |

</details>
<!-- FAMILY_PRESETS_END -->
Use an annotation chart when a time series must explain named events at specific dates.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume annotation charts output](../assets/charts/annotation.svg)

## Quick API

`Graflume.annotation()` creates the portable `annotation` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.annotation('#chart', data, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'value', type: 'quantitative' },
  mark: {
    fields: { annotation: 'event', annotationText: 'detail' },
    point: true,
  },
});
```

## Portable ChartSpec mapping

`x` is temporal, `y` is quantitative, and `mark.fields.annotation` names the short event-label field. `annotationText` may name a longer detail field.

The same result can be created with `Graflume.create()` and `mark: { type: 'annotation' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

The compiler draws the canonical line path first, then adds a clipped vertical guide and theme-aware label pill for every non-empty annotation value. Missing x/y values split the line; missing annotations only suppress the guide.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Annotation label collision avoidance, a side detail panel, range navigation, and multi-series annotation arbitration are not implemented yet.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/annotation.svg)

[Back to chart guides](./README.md)
