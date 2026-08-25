# Composition and resolve

Graflume `ChartSpec 0.1` can compile several unit charts into one renderer-neutral Canvas scene. The
portable grammar is closed, function-free, JSON-serializable, and uses the same family compilers as a
standalone chart. Existing flat `layers` remain unchanged; the singular `layer` operator is the new
compositional spelling.

## Operators

Exactly one unit form or composition operator is allowed at each spec node.

| Operator  | Current executable meaning                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `layer`   | Flattens up to 16 unit children into the established shared scale/axis/legend layer pipeline.                                                   |
| `facet`   | Partitions chart-level transformed data into observed row/column cells or a wrapped sequence. Empty Cartesian combinations are not synthesized. |
| `repeat`  | Reuses one unit template with an explicit, uniquely identified list of `x` and/or `y` field substitutions.                                      |
| `hconcat` | Lays child views out in one horizontal row.                                                                                                     |
| `vconcat` | Lays child views out in one vertical column.                                                                                                    |
| `concat`  | Lays child views out in a deterministic wrapped grid controlled by `columns`.                                                                   |
| `inset`   | Places one independent view over a base view with plot-relative `x`, `y`, `width`, and `height` fractions.                                      |

`facet` and `repeat` use `spec` as their template. Composition children inherit chart-level data when
they do not declare their own data. A facet executes the parent transform once, partitions the result,
then executes the template transform inside each observed cell while preserving original source-row
lineage.

## Layer

Use `layer` when each child is naturally authored as a unit chart. It produces the same normalized
layers and Scene nodes as the legacy flat form, then adds composition metadata.

```ts
import { compile, type ChartSpec } from 'graflume';

const spec: ChartSpec = {
  data: [
    { month: 'Jan', actual: 42, target: 38 },
    { month: 'Feb', actual: 51, target: 47 },
  ],
  layer: [
    { mark: { type: 'bar', opacity: 0.35 }, x: 'month', y: 'target' },
    { mark: { type: 'line', point: true }, x: 'month', y: 'actual' },
  ],
};

const result = compile(spec);
```

Layer composition always resolves `scale`, `axis`, `legend`, and `colorbar` as `shared`. A child may
use shorthand or flat `layers`, plus its own data and transforms, but it may not open another
composition or override the shared chart theme, dimensions, axes, legend, or interaction.

## Facet

```ts
const faceted: ChartSpec = {
  data: observations,
  transform: [{ type: 'filter', expr: { op: 'field', field: 'included' } }],
  facet: {
    row: { field: 'region', title: 'Region', sort: 'ascending' },
    column: 'segment',
  },
  spec: { mark: 'bar', x: 'category', y: 'value' },
  width: 960,
  height: 640,
};
```

For a wrapped facet, use `facet: { wrap: 'group', columns: 3 }`. Facet values must be scalar. Missing
values form an explicit `—` cell. Input order is stable by default; `ascending` and `descending` are
available on the object form.

## Repeat

Repeat never guesses a field list from the data. Every item has a stable `id`, optional display label,
and at least one explicit field substitution.

```ts
const repeated: ChartSpec = {
  data: metrics,
  repeat: {
    items: [
      { id: 'revenue', label: 'Revenue', y: 'revenue' },
      { id: 'cost', label: 'Cost', y: 'cost' },
    ],
    columns: 2,
  },
  spec: { mark: 'line', x: 'date', y: 'revenue' },
  width: 900,
  height: 420,
};
```

The template must currently be a unit chart so the `x`/`y` substitution has one unambiguous target.

## Concat and shared guides

`hconcat`, `vconcat`, and wrapped `concat` default to independent scale, axis, legend, and colorbar
ownership. Compatible unit children may opt into shared position domains and outer axes:

```ts
const compared: ChartSpec = {
  hconcat: [
    { data: actual, mark: 'line', x: 'date', y: 'value' },
    { data: forecast, mark: 'line', x: 'date', y: 'value' },
  ],
  resolve: {
    scale: 'shared',
    axis: 'shared',
    legend: 'independent',
    colorbar: 'independent',
  },
  spacing: 20,
  width: 960,
  height: 360,
};
```

Shared scale resolve independently unions every active `x`, `x2`, `y`, and `y2` domain before
rendering. All participating children must be unit views with the same scale type, mathematical
parameters, authored reverse direction, and out-of-bounds policy for an axis. Numeric and categorical
domains cannot be mixed. `axis: 'shared'` requires `scale: 'shared'`; it keeps one labeled outer axis
per row or column boundary and leaves interior grid lines available without duplicating interior
ticks, labels, lines, or titles. Container `axes` settings become the common guide policy.

Shared categorical and layer legends use `resolve.legend: 'shared'`; shared continuous color guides
use `resolve.colorbar: 'shared'`. One parent-level `legend` contract controls placement, mode, field,
and interactivity. Category/colorbar children must expose one common field through a portable
`color`, `fill`, or `stroke` encoding (or provide explicit colored items). The compiler unions that
visual domain, reserves one outer guide inset, removes child guide chrome, and emits unique stable
root item IDs. An interactive shared category or layer legend filters every participating view from
the same runtime state.

Nested independent concat is supported. For example, a `vconcat` may contain an `hconcat`; every
semantic view id is scoped through the nesting path.

## Inset

```ts
const overviewWithDetail: ChartSpec = {
  inset: {
    base: { data: series, mark: 'line', x: 'time', y: 'value' },
    view: { data: detail, mark: 'bar', x: 'category', y: 'value' },
    x: 0.62,
    y: 0.08,
    width: 0.34,
    height: 0.4,
    label: 'Detail',
  },
  width: 960,
  height: 540,
};
```

Inset bounds are fractions of the parent plot and must remain completely inside it. The base and inset
always own independent scale, axis, and legend systems.

## Resolve and identity

The public resolve type is:

```ts
interface CompositionResolveSpec {
  scale?: 'shared' | 'independent';
  axis?: 'shared' | 'independent';
  legend?: 'shared' | 'independent';
  colorbar?: 'shared' | 'independent';
}
```

Every compiled composition publishes `scene.metadata.composition` with the operator, resolved modes,
view count, and deterministic view ids. Scene node ids, datum hit targets, normalized layer ids,
semantic marks, accessibility labels, and transform lineage are scoped by those view ids. A facet's
semantic lineage maps back through the partition to the original chart-level source rows.

`CompileResult.coordinateViews` publishes every leaf's resolved Cartesian context, plot bounds, and
scene-space offset under the same deterministic ID. At runtime, `Chart.getCoordinateViewIds()`,
`domainToPixel(axis, value, viewId)`, and `pixelToDomain(axis, pixel, viewId)` address those leaves
without pretending that the composition container has one aggregate scale.

## Shared analytic interaction

Declare selection and domain navigation once on the composition container. Compatible leaves receive
the same portable `analyticSelection` and `domainView`; pointer input is localized to the leaf under
the pointer and committed clauses are reprojected into every leaf. Interval, rectangle, and axis
selection supports continuous plus band/point axes, while lasso requires continuous axes.
`selection.filter: true` filters each leaf's marks, semantic rows, hit targets, labels, and lineage
without shrinking the full-data scale domain. `selection.linked: true` makes a stable-key point target
view-independent. Independently-created charts can share the same versioned state through an injected
`LinkedViewStateStore`.

Children still cannot declare their own interaction. Every leaf participating in one shared selection
or domain window must resolve the requested axes with compatible interaction semantics; an absent or
arbitrary non-invertible axis fails explicitly.

## Bounds and explicit exclusions

The compiler and validator enforce these limits:

- at most four nested composition nodes;
- at most 64 materialized views and 128 compiled layers;
- at most 16 direct `layer` children and 16 grid columns;
- `spacing` from 0 through 64 pixels;
- at least 80 × 80 pixels of drawable space per cell after spacing and facet labels.

Composition currently targets Canvas with `renderer: 'auto'` or `renderer: 'canvas'`. Spatial/WebGL
composition is separate and unsupported. Shared scale/axis/guide resolution currently operates on
direct unit children; a nested composition must resolve its own guides. Multi-view containers support
exact mark tooltips, point and analytic geometry selection, selection-driven filtering, shared domain
navigation, injected linked-view state, shared root legend filtering, and whole-scene inspection
navigation. Axis-nearest tooltip, playback, streaming, parent-level runtime annotations, and per-view
interaction declarations remain rejected. Static child highlights and annotations remain available.
Independent child legends are visual-only.

These exclusions are also recorded in `catalog/graflume.features.json`; a planned item is never treated
as a runtime fallback.
