# Gantt charts

Use a Gantt chart for project tasks, progress, and dependencies over time.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume gantt charts output](../assets/charts/gantt.svg)

## Quick API

`Graflume.gantt()` creates the portable `gantt` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.gantt('#chart', data, {
  x: { field: 'start', type: 'temporal' },
  y: { field: 'task', type: 'ordinal' },
  mark: { fields: { end: 'end', id: 'id', progress: 'progress', dependencies: 'dependencies' } },
});
```

## Portable ChartSpec mapping

`x` names start, `y` names the task row, and fields may name `end`, `id`, `progress`, and comma-separated `dependencies`.

The same result can be created with `Graflume.create()` and `mark: { type: 'gantt' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

The x domain includes start and end. Each task becomes a rounded interval, progress overlays the interval, and dependencies are drawn between resolved ids.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Critical-path calculation, working calendars, drag editing, milestone diamonds, and routed arrowheads remain planned.

## Runnable example and regression coverage

- [31-type standalone CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/gantt.svg)

[Back to chart guides](./README.md)
