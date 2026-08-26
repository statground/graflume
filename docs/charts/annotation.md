# Annotation charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `annotation` family. Its canonical Quick API is `annotation()` from `graflume`, and its representative portable mark is `annotation`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name                                   | Quick API             | Mode          | Portable mark | Functional difference                                                  |
| ------------------------------------------------- | --------------------- | ------------- | ------------- | ---------------------------------------------------------------------- |
| [Annotation chart](#variant-annotation)           | `annotation()`        | `default`     | `annotation`  | The canonical annotated trend presentation.                            |
| [Annotated timeline](#variant-annotated-timeline) | `annotatedTimeline()` | `timeline`    | `annotation`  | Uses the annotation family with the timeline compatibility name.       |
| [Event flags](#variant-event-flags)               | `eventFlags()`        | `event-flags` | `flags`       | Replaces long annotation pills with compact labels anchored to events. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                                                       |                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Annotation chart](#variant-annotation)**<br>[![Current Annotation chart output](../assets/charts/annotation.svg)](../assets/charts/annotation.svg) | **[Annotated timeline](#variant-annotated-timeline)**<br>[![Current Annotated timeline output](../assets/charts/annotated-timeline.svg)](../assets/charts/annotated-timeline.svg) |
| **[Event flags](#variant-event-flags)**<br>[![Current Event flags output](../assets/charts/event-flags.svg)](../assets/charts/event-flags.svg)        |                                                                                                                                                                                   |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family uses `trigger: "axis"` with `axis: "x"`. An exact rendered-mark hit still has priority; otherwise Graflume selects the nearest actual datum on that axis without inventing an interpolated row. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-annotation"></a>

### Annotation chart

Use this preset when you need to place named events or notes on an ordered series. The canonical annotated trend presentation.

- **Quick API:** `annotation()`
- **Mode:** `default`
- **Portable mark:** `annotation`
- **Required example fields:** `date`, `value`, `annotation`

```js
import { annotation } from 'graflume';

const data = [
  {
    date: '2026-01-01',
    value: 48,
    annotation: null,
  },
  {
    date: '2026-02-01',
    value: 53,
    annotation: null,
  },
  {
    date: '2026-03-01',
    value: 51,
    annotation: 'Spring release',
  },
  {
    date: '2026-04-01',
    value: 59,
    annotation: null,
  },
];

annotation('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'Month',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Active teams',
  },
  title: {
    text: 'Annotation chart',
    subtitle: 'annotation family · default mode',
  },
  accessibility: {
    label: 'Annotation chart: Monthly active teams with the releases that changed adoption',
    description:
      'Monthly active teams with the releases that changed adoption. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    fields: {
      annotation: 'annotation',
    },
    point: true,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Annotation chart',
      fields: [
        {
          field: 'date',
          label: 'Month',
          format: 'date',
        },
        {
          field: 'value',
          label: 'Active teams',
          format: 'number',
        },
        {
          field: 'annotation',
          label: 'Annotation',
          format: 'auto',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-annotated-timeline"></a>

### Annotated timeline

Use this preset when you need to place named events or notes on an ordered series. Uses the annotation family with the timeline compatibility name.

- **Quick API:** `annotatedTimeline()`
- **Mode:** `timeline`
- **Portable mark:** `annotation`
- **Required example fields:** `date`, `value`, `annotation`

```js
import { annotatedTimeline } from 'graflume';

const data = [
  {
    date: '2026-01-01',
    value: 48,
    annotation: null,
  },
  {
    date: '2026-02-01',
    value: 53,
    annotation: null,
  },
  {
    date: '2026-03-01',
    value: 51,
    annotation: 'Spring release',
  },
  {
    date: '2026-04-01',
    value: 59,
    annotation: null,
  },
];

annotatedTimeline('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'Month',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Active teams',
  },
  title: {
    text: 'Annotated timeline',
    subtitle: 'annotation family · timeline mode',
  },
  accessibility: {
    label: 'Annotated timeline: Monthly active teams with the releases that changed adoption',
    description:
      'Monthly active teams with the releases that changed adoption. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    fields: {
      annotation: 'annotation',
    },
    point: true,
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Annotated timeline',
      fields: [
        {
          field: 'date',
          label: 'Month',
          format: 'date',
        },
        {
          field: 'value',
          label: 'Active teams',
          format: 'number',
        },
        {
          field: 'annotation',
          label: 'Annotation',
          format: 'auto',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

<a id="variant-event-flags"></a>

### Event flags

Use this preset when you need to place named events or notes on an ordered series. Replaces long annotation pills with compact labels anchored to events.

- **Quick API:** `eventFlags()`
- **Mode:** `event-flags`
- **Portable mark:** `flags`
- **Required example fields:** `date`, `value`, `title`

```js
import { eventFlags } from 'graflume/complete';

const data = [
  {
    date: '2026-03-01',
    value: 51,
    title: 'Spring release',
  },
  {
    date: '2026-09-01',
    value: 80,
    title: 'Team plan launch',
  },
];

eventFlags('#chart', data, {
  x: {
    field: 'date',
    type: 'temporal',
    title: 'Month',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Active teams',
  },
  title: {
    text: 'Event flags',
    subtitle: 'annotation family · event-flags mode',
  },
  accessibility: {
    label: 'Event flags: Monthly active teams with the releases that changed adoption',
    description:
      'Monthly active teams with the releases that changed adoption. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    fields: {
      title: 'title',
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Event flags',
      fields: [
        {
          field: 'date',
          label: 'Month',
          format: 'date',
        },
        {
          field: 'value',
          label: 'Active teams',
          format: 'number',
        },
        {
          field: 'title',
          label: 'Title',
          format: 'auto',
        },
      ],
      trigger: 'axis',
      axis: 'x',
    },
  },
});
```

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

None remain in the audited P0/current-limitations boundary as of 2026-08-26. The `current-limitations-2026-08-26` implementation moved these former limitations into executable support:

- data-coordinate primitive registry
- keyboard authoring
- drag and resize handles
- undo and redo

The separately cataloged P1/P2 research roadmap remains future work and is not presented as current runtime support. Exact implementation and test paths are recorded in [the completion evidence](../../catalog/graflume.current-limitations.evidence.json).

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/annotation.svg)

[Back to chart guides](./README.md)
