# Timelines

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `timeline` family. Its canonical Quick API is `timeline()` from `graflume`, and its representative portable mark is `timeline`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                            | Quick API    | Mode      | Portable mark | Functional difference                                   |
| ------------------------------------------ | ------------ | --------- | ------------- | ------------------------------------------------------- |
| [Gantt chart](#variant-gantt)              | `gantt()`    | `gantt`   | `gantt`       | Adds task intervals, progress, and dependency fields.   |
| [Timeline](#variant-timeline)              | `timeline()` | `default` | `timeline`    | Uses dated events or intervals on an ordered time axis. |
| [Horizontal range chart](#variant-x-range) | `xRange()`   | `x-range` | `timeline`    | Uses horizontal start/end intervals per category.       |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                                          |                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **[Gantt chart](#variant-gantt)**<br>[![Current Gantt chart output](../assets/charts/gantt.svg)](../assets/charts/gantt.svg)                             | **[Timeline](#variant-timeline)**<br>[![Current Timeline output](../assets/charts/timeline.svg)](../assets/charts/timeline.svg) |
| **[Horizontal range chart](#variant-x-range)**<br>[![Current Horizontal range chart output](../assets/charts/x-range.svg)](../assets/charts/x-range.svg) |                                                                                                                                 |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

<a id="variant-gantt"></a>

### Gantt chart

Use this preset when events or intervals must be placed on a temporal axis. Adds task intervals, progress, and dependency fields.

- **Quick API:** `gantt()`
- **Mode:** `gantt`
- **Portable mark:** `gantt`
- **Required example fields:** `start`, `task`, `id`, `end`, `progress`

```js
import { gantt } from 'graflume';

const data = [
  {
    start: '2026-01-01',
    task: 'Research',
    id: 'research',
    end: '2026-01-07',
    progress: 100,
  },
  {
    start: '2026-01-06',
    task: 'Design',
    id: 'design',
    end: '2026-01-14',
    progress: 80,
  },
  {
    start: '2026-01-13',
    task: 'Build',
    id: 'build',
    end: '2026-01-27',
    progress: 45,
  },
];

gantt('#chart', data, {
  x: {
    field: 'start',
    type: 'temporal',
    title: 'start',
  },
  y: {
    field: 'task',
    type: 'ordinal',
    title: 'task',
  },
  title: {
    text: 'Gantt chart',
    subtitle: 'timeline family · gantt mode',
  },
  accessibility: {
    label: 'Gantt chart example',
    description: 'A compiled gantt chart example using the timeline family.',
  },
  mark: {
    fields: {
      id: 'id',
      end: 'end',
      progress: 'progress',
    },
  },
});
```

<a id="variant-timeline"></a>

### Timeline

Use this preset when events or intervals must be placed on a temporal axis. Uses dated events or intervals on an ordered time axis.

- **Quick API:** `timeline()`
- **Mode:** `default`
- **Portable mark:** `timeline`
- **Required example fields:** `start`, `category`, `end`

```js
import { timeline } from 'graflume';

const data = [
  {
    start: '2026-01-01',
    category: 'A',
    end: '2026-01-08',
  },
  {
    start: '2026-01-05',
    category: 'B',
    end: '2026-01-15',
  },
];

timeline('#chart', data, {
  x: {
    field: 'start',
    type: 'temporal',
    title: 'start',
  },
  y: {
    field: 'category',
    type: 'ordinal',
    title: 'category',
  },
  title: {
    text: 'Timeline',
    subtitle: 'timeline family · default mode',
  },
  accessibility: {
    label: 'Timeline example',
    description: 'A compiled timeline example using the timeline family.',
  },
  mark: {
    fields: {
      end: 'end',
    },
  },
});
```

<a id="variant-x-range"></a>

### Horizontal range chart

Use this preset when events or intervals must be placed on a temporal axis. Uses horizontal start/end intervals per category.

- **Quick API:** `xRange()`
- **Mode:** `x-range`
- **Portable mark:** `timeline`
- **Required example fields:** `start`, `category`, `end`

```js
import { xRange } from 'graflume/complete';

const data = [
  {
    start: '2026-01-01',
    category: 'A',
    end: '2026-01-08',
  },
  {
    start: '2026-01-05',
    category: 'B',
    end: '2026-01-15',
  },
];

xRange('#chart', data, {
  x: {
    field: 'start',
    type: 'temporal',
    title: 'start',
  },
  y: {
    field: 'category',
    type: 'ordinal',
    title: 'category',
  },
  title: {
    text: 'Horizontal range chart',
    subtitle: 'timeline family · x-range mode',
  },
  accessibility: {
    label: 'Horizontal range chart example',
    description: 'A compiled horizontal range chart example using the timeline family.',
  },
  mark: {
    fields: {
      end: 'end',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

Use a timeline to compare resource or event intervals across rows.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume timelines output](../assets/charts/timeline.svg)

## Quick API

`Graflume.timeline()` creates the portable `timeline` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.timeline('#chart', data, {
  x: { field: 'start', type: 'temporal' },
  y: { field: 'resource', type: 'ordinal' },
  mark: { fields: { end: 'end' } },
});
```

## Portable ChartSpec mapping

`x` names start, `fields.end` names end, and categorical `y` names the row.

The same result can be created with `Graflume.create()` and `mark: { type: 'timeline' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Start and end jointly determine the temporal domain. Each interval becomes an interactive rounded horizontal bar on a categorical y scale.

Rows keep source order unless the compiler must establish a deterministic temporal or hierarchy order. Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

The mark uses shared `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` options where the geometry makes them meaningful. Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Complex layout marks currently favor deterministic bounded Scene output; aggregate or filter very large source data before rendering specialized diagrams.

## Current limitations

Overlapping interval packing, grouped labels, duration labels, and timeline zoom are not implemented yet.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/timeline.svg)

[Back to chart guides](./README.md)
