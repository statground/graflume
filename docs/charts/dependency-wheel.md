# Dependency wheel

![Current Dependency wheel output](../assets/charts/dependency-wheel.svg)

This page documents the currently implemented **Dependency wheel** family in Graflume `0.1.0-alpha.0`. The image above is generated from the same compiled Scene used by the Canvas renderer.

## When to use it

Use this relationship chart when the visual relationship represented by **dependency wheel** is more informative than a plain line, bar, or table. Prefer a simpler chart when the extra geometry does not add analytical meaning.

## Quick API

Import the Quick API from the opt-in complete entrypoint:

```ts
import { dependencyWheel } from 'graflume/complete';

const data = [
  {
    source: 'Input',
    target: 'Compiler',
    value: 9,
  },
  {
    source: 'Compiler',
    target: 'Scene',
    value: 8,
  },
  {
    source: 'Scene',
    target: 'Canvas',
    value: 6,
  },
  {
    source: 'Scene',
    target: 'Vector',
    value: 4,
  },
];

dependencyWheel('#chart', data, {
  x: {
    field: 'source',
    type: 'ordinal',
    title: 'source',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'value',
  },
  mark: {
    fields: {
      target: 'target',
      value: 'value',
    },
  },
  title: {
    text: 'Dependency wheel',
    subtitle: 'relationship · chord',
  },
  accessibility: {
    label: 'Dependency wheel example',
    description: 'A compiled dependency wheel example using the chord family.',
  },
});
```

## Portable ChartSpec

```json
{
  "data": [
    {
      "source": "Input",
      "target": "Compiler",
      "value": 9
    },
    {
      "source": "Compiler",
      "target": "Scene",
      "value": 8
    },
    {
      "source": "Scene",
      "target": "Canvas",
      "value": 6
    },
    {
      "source": "Scene",
      "target": "Vector",
      "value": 4
    }
  ],
  "mark": {
    "type": "chord",
    "fields": {
      "target": "target",
      "value": "value"
    }
  },
  "x": {
    "field": "source",
    "type": "ordinal",
    "title": "source"
  },
  "y": {
    "field": "value",
    "type": "quantitative",
    "title": "value"
  },
  "title": {
    "text": "Dependency wheel",
    "subtitle": "relationship · chord"
  },
  "accessibility": {
    "label": "Dependency wheel example",
    "description": "A compiled dependency wheel example using the chord family."
  },
  "axes": {
    "x": false,
    "y": false
  }
}
```

## Canonical mapping

- User-facing family: `dependency-wheel`
- Quick API: `dependencyWheel()`
- Portable mark: `chord`
- Canonical family: `chord`
- Category: `relationship`

When the canonical family differs from the user-facing name, the Quick API supplies safe mark defaults and then enters the same normalize, validate, scale, compiler, Scene, renderer, interaction, and accessibility path. No parallel rendering engine is created.

## Data, ordering, and missing values

Node, parent, source, target, set, or weight fields are declared explicitly. Input order is stable and becomes the deterministic layout order. Input order is preserved unless the mark explicitly documents a deterministic sort. Missing required values skip only the affected row; invalid specs still fail validation before compilation.

## Implemented rendering behavior

Reuses the canonical weighted circular relationship compiler. The output uses only groups, paths, lines, rectangles, circles, and text, so Canvas, snapshots, export adapters, and future renderers share the same geometry contract.

## Styling

Common `fill`, `stroke`, `opacity`, `lineWidth`, `radius`, and `cornerRadius` properties override theme defaults when the geometry supports them. Mark-specific function-free values live under `mark.options`. Themes remain responsible for background, text, grid, focus, categorical, sequential, and diverging tokens.

## Interaction and hit testing

Rendered datum shapes keep `layerId`, `rowIndex`, and the source row. Standard mode enables hit testing; large and ultra profiles may disable per-mark hit testing. Decorative grid, shadow, depth, label, and arrowhead nodes do not create duplicate datum targets.

## Accessibility

Provide a concise `accessibility.label` and a description of the main pattern. Canvas output should be paired with the runtime data-table fallback. Do not encode a required distinction only with color, depth, angle, or area.

## Performance

Scene cost is linear in rows for ordinary cases. Relationship crossings, repeated symbols, sampled curves, dense labels, and multi-line indicators can produce more than one node per row. Use `auto`, `large`, or `ultra` with aggregation when row counts grow beyond the analytical value of individual marks.

## Current limitations

This alpha implementation covers the documented data meaning and Scene output. Domain-specific editing tools, animation choreography, and very-large-data GPU paths remain separate follow-up work.

## Runnable references

- Snapshot generator: [`scripts/render-series-chart-snapshots.mjs`](../../scripts/render-series-chart-snapshots.mjs)
- Catalog test: [`tests/series-chart-types.test.mjs`](../../tests/series-chart-types.test.mjs)
- Complete CDN gallery: [`examples/cdn/series-chart-types.html`](../../examples/cdn/series-chart-types.html)
