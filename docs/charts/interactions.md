# Common chart interactions

Graflume keeps interaction portable by separating the chart specification from the browser controls that operate it. The built-in Canvas renderer supports legends, static highlights, point and domain-geometry selection, text-only callouts, reusable automatic mark labels with direct authoring, opt-in inspection or data-domain navigation, reset, fullscreen, PNG export, and discrete playback. The same contract is available to every one of the 41 chart families only where its coordinate semantics are real; unsupported scale and gesture combinations fail validation instead of falling back silently.

## Inspection viewport, not data zoom

`interaction.navigation` magnifies and translates the complete Canvas after Graflume has compiled the chart. The title, axes, labels, marks, basemap, and annotations move together as one already-rendered surface.

This is useful for inspecting a dense chart, but it does **not**:

- change an x/y scale domain or request a smaller data window;
- re-bin, aggregate, sample, or recompile marks at a new analytical resolution;
- fit a map region, change its projection, load tiles, or provide GIS/slippy-map zoom;
- preserve the title and axes while zooming only the plot.

Reset returns the complete surface to the configured `minZoom` (default `1`) with zero offsets. Continuous Cartesian data-domain zoom and domain selection use the separate contracts below. Resampling, geographic fitting, and tile navigation remain outside the inspection viewport.

```ts
import { line } from 'graflume';

const chart = line('#chart', rows, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'value', type: 'quantitative' },
  interaction: {
    navigation: {
      minZoom: 1,
      maxZoom: 4,
      wheel: 'modifier',
      drag: true,
      pinch: true,
      keyboard: true,
    },
    controls: {
      zoom: true,
      reset: true,
      fullscreen: true,
      export: true,
    },
  },
});
```

### Navigation options

| Option     | Values                         | Default    | Meaning                                                                |
| ---------- | ------------------------------ | ---------- | ---------------------------------------------------------------------- |
| `minZoom`  | finite number from 1 through 6 | `1`        | Smallest inspection magnification                                      |
| `maxZoom`  | finite number from 1 through 6 | `6`        | Largest inspection magnification; must be at least `minZoom`           |
| `wheel`    | `off`, `modifier`, `always`    | `modifier` | Whether wheel input zooms the Canvas                                   |
| `drag`     | boolean                        | `true`     | Whether pointer dragging pans a magnified Canvas                       |
| `pinch`    | boolean                        | `true`     | Whether a two-pointer pinch changes inspection magnification           |
| `keyboard` | boolean                        | `true`     | Whether the focused chart surface accepts inspection keyboard commands |

`navigation: true` uses these defaults. `navigation: false` or omission leaves the inspection input controller off. `wheel: 'modifier'` avoids taking over ordinary page scrolling; Ctrl or Meta must be held while using the wheel over the chart.

When keyboard navigation is enabled, Graflume makes the Canvas focusable. `+` or `=` zooms in, `-` or `_` zooms out, the arrow keys pan by 24 Scene pixels, and `0` or Home resets the view. Pointer dragging pans, and two active touch pointers pinch when their corresponding options are enabled. At the identity view the Canvas uses `touch-action: pan-y`, so a one-finger vertical swipe can still scroll the page. Once the inspection view is actually zoomed or panned it switches to `none` so the enabled custom gesture owns movement; reset restores `pan-y`. Hit testing maps the pointer back through the inspection transform, so mark and axis-nearest tooltips still resolve against the underlying Scene.

The renderer advertises inspection support separately. The built-in Canvas renderer supports it; a custom renderer may decline it, so integrations must not present renderer-specific controls as universally operational.

## Cartesian data-domain navigation

`interaction.domainNavigation` changes the resolved x/x2/y/y2 domain and recompiles axes and marks. It is distinct from `interaction.navigation`, and enabling both is a validation error. Resolved continuous scales plus categorical band and point scales are supported. Categorical windows retain an ordered slice of the authored domain; arbitrary non-invertible ordinal, quantile, quantize, and threshold scales still fail closed. Map and Spatial navigation, resampling, and remote data-window requests remain separate contracts.

```ts
const chart = create('#chart', {
  data: rows,
  mark: 'line',
  encoding: {
    x: { field: 'time', type: 'temporal', scale: { type: 'utc' } },
    y: { field: 'value', type: 'quantitative', scale: { type: 'log' } },
  },
  interaction: {
    domainNavigation: {
      axes: ['x', 'y'],
      maxZoom: 32,
      wheel: 'modifier',
      drag: true,
      keyboard: true,
    },
    controls: { zoom: true, reset: true },
  },
});

chart.zoomDomainBy(2, { x: chart.domainToPixel('x', timestamp), y: 120 });
chart.panDomainBy(24, 0);
const portableWindow = chart.getDomainViewState(); // { version: 1, axes: ... }
chart.setDomainViewState(portableWindow);
chart.resetDomainView();
```

`axes` defaults to `['x', 'y']`, `maxZoom` defaults to `64`, wheel defaults to `modifier`, and drag and keyboard default to `true`. Wheel and controls zoom around the visible plot; grab-drag pans in pixel units. `+`/`-`, arrows, Home, and `0` mirror the inspection keyboard path. Every window is normalized to the authored domain and clamped to `0..1`; a window never becomes smaller than `1 / maxZoom`. Log, symlog, asinh, power, square-root, probability, logit, probit, time, UTC, and linear transforms reuse the scale registry's real inverse rather than linearizing their data values.

`domainToPixel(axis, value, viewId?)` and `pixelToDomain(axis, pixel, viewId?)` expose the same resolved leaf scale used by the current Scene. Continuous scales round-trip through `invert`; band and point axes return the nearest stable category. Interval, rectangle, and axis geometry supports those categorical scales by storing the exact bounded identity list, while lasso remains continuous. `getCoordinateViewIds()` returns the deterministic leaf IDs of a composition; supplying one to the coordinate APIs makes multi-view routing explicit. `domainviewchange` reports `zoom`, `pan`, `reset`, `linked`, `programmatic`, or `spec`. The state is transient, JSON-serializable, and never mutates `getSpec()`; `setSpec()` resets it.

## Controls, fullscreen, and export

`interaction.controls` adds a compact floating control strip at the chart's top-right corner. The closed desktop strip is icon-only: each 28 px control keeps its localized `title` tooltip and accessible name, while the single translucent surface becomes fully opaque on hover or keyboard focus. A boolean `true` requests every control group. When an object is used, every omitted group defaults to `false`, which makes an explicit object the safer choice for production interfaces.

| Option        | Effect                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| `zoom`        | Zoom-in and zoom-out buttons for the enabled inspection or domain view |
| `reset`       | Restore the enabled inspection or domain view                          |
| `fullscreen`  | Enter or exit browser fullscreen for the chart host                    |
| `export`      | Download the currently rendered Canvas as PNG                          |
| `annotations` | Show a callout visibility toggle when annotations exist                |
| `playback`    | Previous, play/pause, next, seek, speed, and loop controls             |
| `labels`      | Override control tooltips and accessible names without callbacks       |

The label keys are `controls` for the toolbar name plus `zoomIn`, `zoomOut`, `reset`, `enterFullscreen`, `exitFullscreen`, `exportPng`, `showAnnotations`, `hideAnnotations`, `previousFrame`, `play`, `pause`, `nextFrame`, `seek`, `speed`, and `loop`. Values must be non-empty strings. This keeps localization declarative and avoids executable formatters in the portable spec.

Previous, play/pause, and next remain in the closed strip. Seek, current frame, playback rate, and loop live in a secondary panel opened from the adjacent playback-options button, so temporal controls do not force a long permanent bar over the plot. The disclosure name combines the localized seek, speed, and loop labels; it declares the associated dialog, closes on an outside pointer press or Escape, and returns Escape focus to its trigger. The panel is the only user-triggered expanded surface.

The desktop strip is 30 CSS pixels high and sits 6 pixels from the chart's top and right edges. Coarse-pointer or narrow layouts use real 44 px button targets in a 44 px strip positioned 2 pixels from those edges; the SVG remains visually small, and the strip scrolls horizontally only if the host is narrower than the enabled control set. Hosts whose title or marks occupy the top-right corner should reserve at least 50 CSS pixels of top padding. Both LTR and RTL pages keep this technical control sequence LTR and anchored top-right. The diagnostic `data-graflume-controls`, `data-graflume-controls-density`, `data-graflume-controls-placement`, `data-graflume-control`, and playback-panel attributes support behavior tests; applications should prefer the portable options and labels instead of replacing internal control styles.

A control does not enable the underlying capability. Pair zoom/reset controls with exactly one of `navigation` or `domainNavigation`, pair playback controls with a valid `playback` object, and set `controls.annotations: true` to expose callout visibility. The annotation button is omitted while no authored or runtime annotation exists; renderer, browser, or playback controls whose prerequisites are temporarily unavailable remain disabled.

Fullscreen depends on the browser Fullscreen API and a live DOM target. Graflume requests fullscreen for the renderer overlay host, remeasures and renders at the temporary fullscreen size, and restores the ordinary measured dimensions after exit. PNG export depends on the active renderer exposing `toDataURL()`; the built-in Canvas renderer does, and the built-in control downloads `graflume-chart.png`. The exported image contains the current inspection transform but not DOM overlays such as the toolbar or tooltip. Neither action changes the underlying data specification.

## Legends, highlights, selection, and callouts

The same function-free customization contract applies to all Canvas families. Its behavior follows each family's geometry: line and area series use a line glyph, point and bubble families use a point glyph, categorical partitions use category swatches, and scalar surfaces such as heatmaps use one continuous scale with locale-formatted endpoints. `mode: "auto"` uses the compiled mark, palette, and scale meaning; choose `layers`, `categories`, or `continuous` explicitly when a domain requires a particular reading. A single-series family with no unambiguous category meaning may use explicit `items` as a portable fallback.

```ts
const chart = create('#chart', {
  layers: [
    {
      id: 'actual',
      name: 'Actual',
      data: rows,
      mark: { type: 'line', point: true },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    {
      id: 'target',
      name: 'Target',
      data: targetRows,
      mark: 'line',
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  legend: { mode: 'layers', interactive: true, position: 'top' },
  highlights: [
    {
      id: 'launch-window',
      target: { type: 'range', x: { from: 'Mar', to: 'May' } },
      fill: '#4f46e5',
      opacity: 0.12,
    },
  ],
  annotations: [
    {
      id: 'launch-note',
      target: { type: 'datum', layerId: 'actual', field: 'month', value: 'Apr' },
      text: 'Campaign launched',
      detail: 'The callout follows the matching source or derived semantic datum.',
      connector: true,
    },
  ],
  interaction: {
    selection: { mode: 'multiple', toggle: true, clearOnEscape: true },
    controls: {
      annotations: true,
      labels: { showAnnotations: 'Show notes', hideAnnotations: 'Hide notes' },
    },
  },
});
```

Legend items expose native keyboard-operable buttons when `interactive: true`. Layer items can toggle their complete compiled group. Category items are toggleable only for row-owned, independent geometry such as bars, heatmap cells, points, bubbles, pie/funnel/treemap partitions, intervals, and independent financial or glyph marks; Graflume filters the matching datum and every owned label or leader together. Connected or aggregate geometry such as line/area paths, density/violin shapes, motion trails, polar/radar paths, chord ribbons, and parallel-coordinate paths stays descriptive because removing one category would change the meaning of the whole compiled path. This capability follows the owning mark and cannot be bypassed by changing the legend glyph. A continuous scale is descriptive and is not a visibility switch. Hosts should inspect each item's resolved `toggleable` state rather than assuming that `interactive: true` makes every semantic item actionable. Hover and focus preserve the compact visual surface. `getLegendState()`, `setLegendItemVisible(id, visible)`, and `resetLegend()` expose the same transient state to the host, and `legendchange` reports `toggle`, `programmatic`, `reset`, or `spec` as its reason.

Horizontal legends include their outer padding in responsive measurement. Labels that fit the available surface remain complete; only labels whose measured item still exceeds the constrained chart width receive an ellipsis. The full label remains available to the accessibility description in either case.

Decoration targets are closed and portable:

- `datum` prefers a stable `layerId` plus `field` and one scalar `value` or a non-empty `values` list. `rowIndex` is the bounded fallback. Aggregate families may match compiler-derived semantic datum fields rather than a representative source row.
- `layer` highlights the compiled bounds of one existing layer.
- `range` creates an x, y, or rectangular reference band and supports `x2`/`y2` through the nested `axis` value. Reversed `from`/`to` values produce the same band.
- `plot` addresses a renderer-neutral location or rectangle using values from zero through one, so non-Cartesian families can still receive a stable highlight or callout.

Static `highlights` stay compiled in large and ultra profiles. Pointer selection follows the family's existing hit-test policy, so dense profiles that disable per-datum hit lookup also disable click selection; configured and programmatic targets remain stored and simply stop drawing when the selected datum is absent from a playback frame. Selection is opt-in. Click selects or toggles a datum, an enabled background clear removes it, and Escape clears it from a focused surface. Hosts use `getSelection()`, `setSelection()`, `clearSelection()`, and `selectionchange`; `setSelection()` requires `interaction.selection` to be enabled.

The default `kind: 'point'` preserves that point/datum facade. Cartesian charts may instead author a drag selection with `kind: 'interval'`, `'rectangle'`, `'axis'`, or `'lasso'`. Axis selection requires `axis`; two-dimensional geometry uses `xAxis`/`yAxis`, defaulting to x/y. Interval, rectangle, and axis brushes accept continuous, band, and point axes; lasso deliberately requires continuous axes. `mode: 'single'` replaces the prior clause. Multiple mode uses the explicit `combine: 'union' | 'intersection'` predicate; Graflume does not guess a boolean operator from modifier keys. `maxSelections` is bounded at 64, categorical identities and lasso vertices at 512, and `minPixelSpan` suppresses accidental micro-drags.

```ts
const chart = create('#chart', {
  data: rows,
  mark: 'point',
  x: { field: 'x', type: 'quantitative' },
  y: { field: 'y', type: 'quantitative' },
  interaction: {
    selection: {
      kind: 'lasso',
      mode: 'multiple',
      combine: 'intersection',
      maxLassoPoints: 256,
      clearOnEscape: true,
      keyboard: true,
      keyboardStep: 8,
      filter: true,
      linked: true,
    },
  },
});

const state = chart.getAnalyticSelection();
chart.setAnalyticSelection(state);
chart.applyAnalyticSelection(nextClause, 'union');
chart.clearAnalyticSelection();
```

The closed state shape is `{ version: 1, combine, selections }`; every clause is deeply copied, validated, bounded, frozen, deterministically deduplicated, and JSON-serializable. `AnalyticSelectionStore`, `analyticSelectionMatches()`, and the normalize-once `analyticSelectionPredicate()` allow a host to store or evaluate that state without executable predicates. `filter: true` recompiles mark, hit, label, semantic, and lineage rows from that predicate while retaining the authored/full-data axis domains. A point filter requires a stable `key`. `analyticselectionchange` reports pointer, keyboard, linked, programmatic, clear, and spec changes. Completed selections compile into the same clipped Scene and therefore remain aligned across playback and ordinary rerenders.

Non-point selection owns one pointer drag, including a single touch pointer. It cannot share that gesture with inspection drag/pinch or domain drag; those ambiguous combinations are validation errors, although wheel-only domain navigation may coexist when drag is disabled. With `keyboard: true` (the default for non-point selection), focus the Canvas and press S to start at the focused semantic mark or plot center. Arrow keys move the endpoint by `keyboardStep`, Shift+arrow moves ten steps, Space records a lasso vertex, Enter applies, and Escape cancels the draft. The Canvas publishes those shortcuts and a plain-language instruction in its accessible description. Point selection continues to synchronize the semantic accessibility mirror.

One composition container owns the selection and domain window shared by all compatible leaves. Runtime pointer input is routed through the leaf under the pointer; keyboard drafts and committed domain clauses reproject into every leaf's scale. Stable-key point selection with `linked: true` drops the leaf/layer qualifier so the same identity highlights and filters every participating view. Children may not declare a second interaction contract.

Independently-created charts can share the same bounded runtime state by injecting one `LinkedViewStateStore`; the authored spec remains function-free:

```ts
import { create, LinkedViewStateStore } from 'graflume';

const linkedViewStore = new LinkedViewStateStore();
const left = create('#left', leftSpec, { linkedViewStore });
const right = create('#right', rightSpec, { linkedViewStore });
```

The store carries version-1 `analyticSelection` and `domainView` state, suppresses source-view echo, permits at most 128 registered views, and can be replaced by an injected store in deterministic tests. Every linked view must declare compatible selection kinds and enabled domain axes; incompatible state emits the chart error path instead of being coerced.

Top-level `annotations` are general overlay callouts and are distinct from the canonical `mark: "annotation"` chart family. The mark turns an annotation field into an ordered event-series presentation; a top-level callout can target any compiled family without changing its mark. Callouts accept plain `text` and optional `detail`, placement, connector, and safe style fields. They never accept raw HTML or executable formatters. `placement: "auto"` evaluates perimeter candidates against chart bounds, the target, visible data geometry, the control strip, an inside legend, and previously placed callouts. An authored `top`, `right`, `bottom`, or `left` stays authoritative while it is safe; overflow or a severe collision triggers a bounded fallback. Canvas text uses grapheme-aware wrapping for unbroken Latin, CJK, emoji, and RTL text, applies an ellipsis only when the line budget is exhausted, and clips the text group to the bubble as a final rendering guard.

Runtime authoring uses `getAnnotations()`, `setAnnotations()`, `addAnnotation()`, `updateAnnotation()`, and `removeAnnotation()`; `annotationchange` reports `set`, `add`, `update`, `remove`, or `spec`. Visibility uses `getAnnotationsVisible()`, `setAnnotationsVisible(visible)`, and `toggleAnnotations()`. `annotationvisibilitychange` reports `toggle`, `programmatic`, or `spec`. Hiding annotations removes only bubbles and connectors: highlights, selection, and the full authored annotation text in the chart accessibility description remain available.

## Automatic mark labels and authoring

Top-level `markLabels` is the reusable data-label contract for all 41 Canvas families. It is separate from both the `mark: "annotation"` family and top-level `annotations`: enabling or editing a mark label never changes a callout, and annotation CRUD or visibility never changes mark-label positions. The label value comes from `field`, then `encoding.text`, then the layer's y field. `layerIds` narrows a multilayer chart, `maxLabels` bounds work at 1 through 1,000, and `key` turns each exported datum target into a stable `field`/`value` match instead of a row-index fallback.

```ts
const chart = create('#chart', {
  data: rows,
  mark: 'bar',
  x: { field: 'category', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  markLabels: {
    field: 'value',
    key: 'recordId',
    placement: 'auto',
    collision: 'avoid',
    connector: true,
    maxLabels: 128,
    style: {
      background: '#ffffff',
      border: '#94a3b8',
      padding: 3,
      maxWidth: 160,
    },
    authoring: {
      pointer: true,
      keyboard: true,
      step: 1,
      historyLimit: 50,
      snap: { grid: 8, marks: true, plot: true, distance: 6 },
    },
  },
});
```

`placement: "auto"` tries top, right, bottom, left, and center positions with bounded tangent shifts. `collision: "avoid"` selects the first in-plot position that does not overlap an earlier label or another mark; `"hide"` tests only the first requested position; `"none"` preserves the first in-plot position without collision rejection. An entry in `positions` is an authored displacement from that deterministic automatic base. Authored offsets remain authoritative across rerenders and can intentionally overlap; optional `hidden: true` suppresses the matching label. Labels use the bounded semantic geometry already shared by accessibility, including synthesized observations for connected Area/Line paths and aggregate mark rows, so the same contract compiles across every canonical Canvas family.

Pointer authoring starts by pressing a label body or one of the four selected Canvas handles, then dragging. The focused Canvas uses Enter and Shift+Enter to move forward and backward through labels, arrow keys to nudge the selected label, Shift+arrow for ten times the configured step, and Escape to clear the handles. Control/Command+Z undoes; Control+Y or Command+Y redoes, while Shift+Control/Command+Z is the alternate redo chord. When snapping is enabled, `grid` rounds the portable offset, `marks` aligns the label center to nearby mark anchors, and `plot` snaps to and constrains against the plot boundary within `distance` Scene pixels. Pointer ownership takes precedence only when the press hits a label; background selection and navigation keep their existing gesture paths.

The runtime lifecycle is transient until a host persists the returned portable positions:

```ts
const state = chart.getMarkLabelState();
const positions = chart.getMarkLabelPositions();
const first = state.labels[0];

if (first) {
  chart.selectMarkLabel(first.id);
  chart.setMarkLabelPosition(first.id, 16, -8);
}
chart.undoMarkLabelEdit();
chart.redoMarkLabelEdit();
chart.resetMarkLabelPositions();

// Reapply or serialize the function-free array.
chart.setMarkLabelPositions(positions);
const persisted = JSON.stringify(positions);
```

`getMarkLabelState()` returns current resolved label geometry, active ID, portable positions, and `canUndo`/`canRedo`. `marklabelchange` reports `set`, `programmatic`, `pointer`, `keyboard`, `undo`, `redo`, `reset`, `select`, or `spec`. `setSpec()` clears the edit history and restores the new spec's authored `positions`; ordinary rendering and editing never mutate `getSpec()`. History is a bounded snapshot stack, pointer preview produces one undo step per completed drag, and a canceled pointer restores its pre-drag state.

An authorable Canvas is focusable and exposes its keyboard shortcuts and plain-language instructions. Moving, undoing, redoing, selecting, or resetting a label updates a polite live status. Label text is included in the chart accessibility description but label/handle Scene nodes do not masquerade as extra data rows in `scene.semanticIndex`; the existing native semantic table remains one row per bounded mark observation.

Legend visibility, selection, runtime annotations, annotation visibility, and runtime mark-label positions are presentation state. They do not mutate the caller's specification. `setSpec()` installs the new base contract, restores annotation visibility, and resets transient state, while playback hides unresolved targets without deleting their configuration. IDs and referenced layer IDs are validated for uniqueness and existence so DOM controls, Scene nodes, and host state remain deterministic. Legend controls and selection summaries expose accessible names and a configurable throttled `aria-live` status. Canvas semantic rows gain a native mirror when `accessibility.table`, `accessibility.navigation`, or `accessibility.linkedFocus` is enabled.

![Compiled Graflume legend, reference band, highlight, and callout](../assets/charts/customization.svg)

## Playback and optional smooth transitions

Playback still advances over distinct values from one source field. By default every endpoint change is immediate, preserving the existing discrete behavior. An explicit `transition` can interpolate compatible numeric Scene geometry and styles between those already compiled endpoints. It never interpolates missing source observations, creates motion trails, or invents data values.

```ts
const chart = motion('#chart', rows, {
  x: { field: 'income', type: 'quantitative' },
  y: { field: 'lifeExpectancy', type: 'quantitative' },
  mark: {
    fields: { size: 'population', color: 'country', time: 'year' },
  },
  interaction: {
    playback: {
      field: 'year',
      key: 'country',
      mode: 'frame',
      interval: 1000,
      rate: 1,
      loop: false,
      direction: 'forward',
      namedFrames: [
        { name: 'Baseline', value: 2024 },
        { name: 'Launch', value: 2026 },
      ],
      range: { start: 'Baseline', end: 'Launch' },
      windowSize: 1,
      autoplay: false,
      transition: { duration: 600, easing: 'ease-in-out' },
      filter: false,
    },
    controls: { playback: true },
  },
});
```

`playback: true` is invalid because Graflume cannot infer a semantically correct field. Supply an object with `field` and opt into the playback controls separately.

### Playback options

| Option                | Values / range                  | Default             | Meaning                                                                                        |
| --------------------- | ------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| `field`               | non-empty safe field name       | required            | Selects the discrete frame values                                                              |
| `key`                 | non-empty safe field name       | omitted             | Matches the same scalar-keyed datum between filtered endpoint Scenes                           |
| `layerId`             | non-empty layer id              | all matching layers | Limits frame collection and transient changes to one layer; generated ids use `layer-N`        |
| `mode`                | `frame`, `cumulative`, `window` | `frame`             | Select one frame, a prefix through the current frame, or a rolling window                      |
| `interval`            | 100 through 60,000 milliseconds | `1000`              | Base playback interval                                                                         |
| `rate`                | 0.1 through 16                  | `1`                 | Playback and transition speed multiplier                                                       |
| `loop`                | boolean                         | `false`             | Continue from the first frame after the last                                                   |
| `direction`           | `forward`, `reverse`            | `forward`           | Direction used by autoplay; signed manual `step()` keeps its source-order meaning              |
| `namedFrames`         | `{ name, value }[]`             | `[]`                | Give unique portable names to collected string, number, or boolean frame values                |
| `range.start`         | zero-based index or frame name  | first frame         | Inclusive lower playback, seek, scrubber, and loop bound                                       |
| `range.end`           | zero-based index or frame name  | last frame          | Inclusive upper playback, seek, scrubber, and loop bound                                       |
| `windowSize`          | integer from 1 through 10,000   | `1`                 | Number of distinct frame values retained by `window` mode                                      |
| `autoplay`            | boolean                         | `false`             | Start advancing after initialization                                                           |
| `transition`          | `false` or object               | `false`             | Opt into render-only endpoint interpolation                                                    |
| `transition.duration` | 50 through 60,000 milliseconds  | `400`               | Requested maximum duration at playback rate `1`; runtime clamps it below `interval`            |
| `transition.easing`   | `linear`, `ease-in-out`         | `ease-in-out`       | Progress curve for compatible interpolation and crossfades                                     |
| `filter`              | boolean                         | `false`             | Apply the generic transient row filter; enable only from a reviewed host-side family allowlist |

Frame values follow the first occurrence of each unique non-null value in the selected source. Graflume does not sort strings, numbers, or dates. Sort input rows before chart creation when chronological playback is required. With `layerId`, only that layer's effective data source contributes frame values; without it, matching layers contribute in source/layer encounter order and duplicate values collapse to one frame.

Each `namedFrames` entry binds a unique human-facing `name` to one collected scalar `value` using type-preserving equality. An unmatched value, duplicate name, unknown range name, out-of-bounds index, or reversed range is rejected rather than silently retargeted. The range is inclusive and always stored in source order; `direction: 'reverse'` changes automatic movement, not the meaning of its `start` and `end` bounds. A loop wraps inside that range. Numeric `seek()` clamps to it, while a named seek outside it throws so an authored landmark cannot be mistaken for another frame.

The modes select these first-occurrence values as follows:

- `frame`: the current value only;
- `cumulative`: every value from the active range start through the current value;
- `window`: at most `windowSize` values ending at the current value without crossing the active range start.

If a mark already declares `mark.options.frame` and that value exists inside the active range, it selects the initial index. Otherwise `frame` mode or `autoplay: true` starts at the direction-aware range edge (the lower edge for forward and upper edge for reverse); a paused `cumulative` or `window` playback starts at the upper edge so the initial view shows the latest prefix or window. No matching values produces an enabled playback configuration with an empty, disabled control range unless an authored name or range requires a missing value, which is an error.

For a `motion` mark in `frame` mode, `filter: false` is the preferred path: Graflume keeps the full source data and derived domains, then changes the mark's selected frame. Motion `cumulative` and `window` modes necessarily filter to their selected history even when `filter` is false. For a non-motion family, the playback position is visible only when a host deliberately sets `filter: true`; Graflume then builds a transient filtered specification and recompiles it. Derived domains and layouts can therefore change between frames unless the specification fixes the relevant `scale.domain` values.

When `transition` is enabled, `key` should identify one stable scalar entity such as a country, series, or sensor. Matching keeps numeric structural tokens in compound mark IDs distinct from the transient filtered row index, so matrix cells and other multi-part marks do not swap roles. Compatible circles, rectangles, lines, paths with identical topology, groups, clips, and unchanged text interpolate numeric geometry and supported styles. Entering and exiting nodes fade. Changed text, incompatible node types, and paths whose point/subpath topology differs use a safe crossfade instead of a malformed geometry morph. Without `key`, deterministic Scene node IDs remain the fallback, which is suitable only when row identity is already stable.

`transition.duration` remains a valid requested maximum even when it exceeds `interval`. At runtime Graflume deterministically uses `min(duration, interval - 1ms)` (the validated minimum interval keeps this positive), and both clocks use the same playback-rate multiplier. Automatic playback also settles an endpoint before advancing when animation-frame delivery is sparse. Consequently a transient crossfade Scene never becomes the accumulated input to the next automatic frame; manual `seek()` and `step()` can still interrupt from the currently displayed Scene by design.

The compiled destination remains authoritative during a transition: `getScene()` and `render` events expose that endpoint, not synthetic in-between data. The renderer draws transient Scenes only. While one is active, tooltips are hidden, hover/click hits report `null`, and click selection is not changed, preventing endpoint metadata from being attached to a moving shape. A new `seek()` or `step()` starts from the currently displayed Scene; `pause()`, a same-index seek, ordinary `render()`, `setSpec()`, data replacement, resize/fullscreen re-render, and reduced-motion/hidden-document handling settle or cancel the pending RAF safely. `destroy()` cancels it without another draw.

Playback is a presentation state. It does not mutate the caller's base `ChartSpec` or input rows. Application code should treat the configured field, mode, and filtering policy as a closed allowlist, because the runtime cannot infer whether removing rows preserves a chart's statistical meaning.

Graflume suppresses configured autoplay when `prefers-reduced-motion: reduce` already matches, keeps configured transitions immediate while it matches, pauses and settles the current endpoint if that preference becomes active, and pauses when the document becomes hidden. Manual `play()` remains available as discrete playback, so the host still owns its complete reduced-motion and visibility policy.

## Programmatic state and events

The compact controls call the same public chart methods available to an application:

```ts
const view = chart.getViewState();
// { enabled, zoom, offsetX, offsetY }

chart.zoomBy(1.25); // optional second argument: { x, y } Scene anchor
chart.panBy(24, 0);
chart.resetView();

const playback = chart.getPlaybackState();
// { enabled, frames, index, frame?, name?, label, playing, rate, loop,
//   mode, direction, range?, namedFrames }

chart.play();
chart.play('Launch'); // seek to a named frame, then play in the active direction
chart.pause();
chart.step(1);
chart.seek(0);
chart.seek('Baseline');
chart.setPlaybackRate(2);
chart.setPlaybackLoop(true);
chart.setPlaybackDirection('reverse');
chart.setPlaybackRange({ start: 'Baseline', end: 'Launch' });
chart.setPlaybackRange(); // restore the full collected range

chart.getAnnotationsVisible();
chart.setAnnotationsVisible(false);
chart.toggleAnnotations();

await chart.toggleFullscreen();
```

The synchronous mutators return the chart instance for chaining. `toggleFullscreen()` returns `Promise<void>` and rejects when the active renderer/browser cannot enter fullscreen. `zoomBy()`, `panBy()`, and `resetView()` require enabled navigation and renderer support. `seek()` accepts a finite index or declared frame name; `step()` clamps or wraps inside the active range according to `loop`; `play(nameOrIndex)` composes an explicit starting landmark with the configured direction. `setPlaybackRate()` accepts 0.1 through 16. `setPlaybackRange()` validates both inclusive bounds against the current collected timeline.

`setSpec()`, `setData()`, and `appendData()` pause playback, recollect the configured frame values from the new effective sources, reset the interaction state according to the new spec, and emit a playback change with reason `spec`.

```ts
chart.on('viewchange', ({ view, reason }) => {
  // reason: 'zoom' | 'pan' | 'reset' | 'resize'
});

chart.on('playbackchange', ({ state, reason }) => {
  // reason also includes 'direction' and 'range'
});

chart.on('playbackframechange', ({ state, previousIndex, reason, label }) => {
  // renderer-neutral frame landmark for accessible host announcements
});

chart.on('fullscreenchange', ({ active }) => {
  // active is true only for this chart's renderer host
});
```

`viewchange` carries `{ chart, view, reason }`, `playbackchange` carries `{ chart, state, reason }`, `playbackframechange` carries `{ chart, state, previousIndex?, reason, label }`, and `fullscreenchange` carries `{ chart, active }`. Entering or leaving fullscreen also renders at the fullscreen host size and emits the existing `resize` event. Playback state exposes the actual ordered values, resolved named frames and range, and current accessible label so a host does not have to reconstruct timeline semantics. Built-in controls use the name as the scrubber's `aria-valuetext`; their polite status announces manual positions and named landmarks during playback without turning every unnamed automatic frame into speech.

Playback recompiles renderer-neutral endpoint Scenes, so Canvas and registered SVG renderers receive identical range, reverse, named-seek, and transition behavior. Renderer choice affects surface capabilities and export formats, not timeline state or event ordering.

## Conservative host allowlist

The following is a safe starting policy for examples whose data has the stated meaning. It is not automatic inference performed by Graflume.

| Family      | `field`              | `mode`       | `layerId` | `windowSize` | `filter` | Data meaning                                                                  |
| ----------- | -------------------- | ------------ | --------- | ------------ | -------- | ----------------------------------------------------------------------------- |
| Annotation  | ordered event date   | `cumulative` | omit      | `1`          | `true`   | Reveal source rows and their annotations through the current date             |
| Area        | ordered x/time field | `cumulative` | omit      | `1`          | `true`   | Reveal an ordered prefix; fixed domains improve transition stability          |
| Candlestick | trading date/time    | `cumulative` | omit      | `1`          | `true`   | Reveal complete OHLC rows in source order; do not use partial rows            |
| Combination | shared period field  | `cumulative` | omit      | `1`          | `true`   | Reveal the same ordered prefix across every layer that uses the shared source |
| Line        | ordered x/time field | `cumulative` | omit      | `1`          | `true`   | Reveal a source-ordered prefix; changing path topology crossfades safely      |
| Motion      | motion time field    | `frame`      | omit      | `1`          | `false`  | Select one native motion frame while retaining full data and domains          |

For a layered chart with independent sources, use a reviewed `layerId` or ensure every affected source contains the same frame field. An omitted `layerId` is intentional for the shared-source combination case above; it is not a wildcard guarantee that unrelated layers share temporal semantics. A layer whose effective source does not contain the playback field is treated as an untimed reference layer and remains unchanged rather than being replaced with an empty transient dataset.

## Capability matrix for all 41 families

All rows below support inspection/reset, fullscreen, and PNG export when they use the built-in Canvas renderer. The playback column describes semantic suitability, not only whether generic filtering can technically remove rows.

| Family                                          | Inspection / reset | Fullscreen | PNG | Playback policy                                                                                                                                                              |
| ----------------------------------------------- | ------------------ | ---------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Annotation](./annotation.md)                   | Yes                | Yes        | Yes | **Approved cumulative reveal** for an ordered event field; fixed domains avoid axis jumps.                                                                                   |
| [Area](./area.md)                               | Yes                | Yes        | Yes | **Approved cumulative reveal** for an ordered x/time field; a growing path uses topology-safe crossfade.                                                                     |
| [Bar](./bar.md)                                 | Yes                | Yes        | Yes | Snapshot only with an explicit frame field and a complete category set per frame; category slots may jump.                                                                   |
| [Bubble](./bubble.md)                           | Yes                | Yes        | Yes | Snapshot only with an explicit frame field; `key` enables stable point position, radius, and style interpolation.                                                            |
| [Calendar](./calendar.md)                       | Yes                | Yes        | Yes | **Off by default.** Prefix filtering currently recomputes the visible week extent, cell geometry, and color domain, so existing days can move or recolor.                    |
| [Candlestick](./candlestick.md)                 | Yes                | Yes        | Yes | **Approved cumulative reveal** of complete OHLC rows; prefer fixed x/y domains.                                                                                              |
| [Combination](./combination.md)                 | Yes                | Yes        | Yes | **Approved cumulative reveal** only when participating layers share an ordered frame field and compatible policy.                                                            |
| [Difference](./difference.md)                   | Yes                | Yes        | Yes | Snapshot only when every frame contains complete before/after pairs; compatible endpoint geometry may transition.                                                            |
| [Pie](./pie.md)                                 | Yes                | Yes        | Yes | Snapshot only with a complete partition per frame; wedge order and angles change discretely.                                                                                 |
| [Timeline and range](./timeline.md)             | Yes                | Yes        | Yes | **Do not generic-filter for time flow.** Filtering start rows is not active-interval clipping and can expose future interval ends.                                           |
| [Gauge](./gauge.md)                             | Yes                | Yes        | Yes | Snapshot only when each frame resolves to the intended complete gauge value; compatible needle geometry may transition.                                                      |
| [Map](./map.md)                                 | Yes                | Yes        | Yes | Snapshot only with a complete geographic state per frame; inspection remains whole-Canvas magnification, not GIS navigation.                                                 |
| [Distribution](./distribution.md)               | Yes                | Yes        | Yes | **Do not generic-filter by default.** Histogram, violin, contour, and summary modes may recompute bins, density, or domains; supplied box summaries require complete tuples. |
| [Interval](./interval.md)                       | Yes                | Yes        | Yes | Snapshot only when each frame contains complete center/lower/upper tuples; not temporal interval clipping.                                                                   |
| [Line](./line.md)                               | Yes                | Yes        | Yes | **Approved cumulative reveal** for a source-ordered x/time field; sort rows first.                                                                                           |
| [Motion](./motion.md)                           | Yes                | Yes        | Yes | **Preferred native frame playback:** `mode: 'frame'`, `filter: false`, and the motion time field.                                                                            |
| [Hierarchy](./hierarchy.md)                     | Yes                | Yes        | Yes | Snapshot only with a complete valid hierarchy per frame; layout recomputes and jumps.                                                                                        |
| [Flow](./flow.md)                               | Yes                | Yes        | Yes | Snapshot only with a complete source/target network per frame; partial filtering can orphan nodes or links.                                                                  |
| [Scatter](./scatter.md)                         | Yes                | Yes        | Yes | Snapshot only with an explicit frame field; use `key` for stable point identity interpolation.                                                                               |
| [Table](./table.md)                             | Yes                | Yes        | Yes | Usually off. Filtering can present a snapshot, but it is not paging and does not replace an accessible HTML table.                                                           |
| [Waterfall](./waterfall.md)                     | Yes                | Yes        | Yes | **Do not use frame/window filtering.** A cumulative prefix needs specialist review because every bar depends on prior rows.                                                  |
| [Word tree](./word-tree.md)                     | Yes                | Yes        | Yes | Snapshot only with a complete parent chain per frame; partial frames can orphan descendants and layout jumps.                                                                |
| [Polar](./polar.md)                             | Yes                | Yes        | Yes | Snapshot only with a complete angular series or radar indicator set per frame; partial frames change the path or profile meaning.                                            |
| [Network](./network.md)                         | Yes                | Yes        | Yes | Snapshot only with a complete graph per frame; node/link layout jumps and is not a force simulation.                                                                         |
| [Chord](./chord.md)                             | Yes                | Yes        | Yes | Snapshot only with a complete relationship matrix per frame; arcs and ribbons are recomputed discretely.                                                                     |
| [Funnel](./funnel.md)                           | Yes                | Yes        | Yes | Snapshot only with every stage present in each frame; stage removal changes the whole funnel comparison.                                                                     |
| [Parallel coordinates](./parallel.md)           | Yes                | Yes        | Yes | Snapshot only with complete observation rows; dimension domains can change between frames.                                                                                   |
| [Heatmap](./heatmap.md)                         | Yes                | Yes        | Yes | Snapshot only with a complete matrix per frame and stable category domains; missing cells change the comparison surface.                                                     |
| [Raster image](./image.md)                      | Yes                | Yes        | Yes | Snapshot only with a complete raster per frame; missing rows become missing cells rather than retained pixels.                                                               |
| [Ternary](./ternary.md)                         | Yes                | Yes        | Yes | Snapshot only with complete three-component rows; `key` can preserve point identity between compiled endpoints.                                                              |
| [Smith](./smith.md)                             | Yes                | Yes        | Yes | Snapshot only with a complete impedance trace per frame; transformed points and paths change discretely.                                                                     |
| [Scatter matrix](./scatter-matrix.md)           | Yes                | Yes        | Yes | Snapshot only with complete observation rows and fixed dimension choices; every pairwise cell is recomputed.                                                                 |
| [Carpet](./carpet.md)                           | Yes                | Yes        | Yes | Snapshot only with a complete curvilinear grid per frame; missing logical cells can break grid and contour continuity.                                                       |
| [Contour](./contour.md)                         | Yes                | Yes        | Yes | Snapshot only with a complete grid per frame; filtering an incomplete grid can create misleading contours.                                                                   |
| [Item](./item.md)                               | Yes                | Yes        | Yes | Snapshot only with a complete partition per frame; incompatible repeated-glyph layouts crossfade safely.                                                                     |
| [Vector field](./vector-field.md)               | Yes                | Yes        | Yes | Snapshot only with a complete sampled field per frame; compatible keyed vector geometry may transition.                                                                      |
| [Venn](./venn.md)                               | Yes                | Yes        | Yes | Snapshot only with complete, precomputed set/overlap semantics; circle placement changes discretely.                                                                         |
| [Word cloud](./word-cloud.md)                   | Yes                | Yes        | Yes | Snapshot only with a complete word-weight set; deterministic layout still jumps between frames.                                                                              |
| [Price blocks](./price-blocks.md)               | Yes                | Yes        | Yes | **Do not generic-filter by default.** Renko and Point & Figure are path-dependent; frame/window modes distort the path.                                                      |
| [Volume profile](./volume-profile.md)           | Yes                | Yes        | Yes | **Do not generic-filter by default.** Removing rows recomputes price bins and volume totals.                                                                                 |
| [Technical indicator](./technical-indicator.md) | Yes                | Yes        | Yes | Caution: cumulative playback may be reviewed for precomputed columns; calculated indicators need full warm-up history and window/frame filtering changes meaning.            |

`Snapshot only` means that a host may opt into `filter: true` only when its source has a separate frame field and each frame is a complete, independently meaningful dataset. It does not mean that Graflume can derive frames from the chart's ordinary category, value, or coordinate field.

## Accessibility and motion

Every Canvas compile now includes a bounded renderer-neutral `scene.semanticIndex`. Each record carries the plot view, layer, mark role, x/y channel values, semantic datum, source-row lineage, clipped bounds, visibility, and a text label. `chart.getSemanticIndex()` returns that sidecar, `chart.toAccessibleRows()` produces table-ready rows, and `chart.getAccessibilityState()` reports the current mirror configuration. Line and area paths retain one semantic observation per retained source row even when visible point marks are disabled; compiler-derived aggregate tooltip rows are added with bounded provenance instead of being presented as an arbitrary representative row.

The native mirror is opt-in:

```js
const chart = Graflume.bar('#chart', data, {
  accessibility: {
    table: 'visible', // true or 'hidden' keeps a screen-reader-only native table
    maxRows: 500,
    navigation: true,
    explorer: { windowRows: 24, overscanRows: 6, rowHeight: 32 },
    linkedFocus: { group: 'quarterly-dashboard', key: 'regionId' },
    summary: 'Quarterly revenue by region',
    live: { enabled: true, throttleMs: 200 },
  },
  interaction: { tooltip: true, selection: { mode: 'multiple' } },
});
```

The table uses text-only cells and `dir="auto"`, so CJK and RTL values remain intact without raw HTML. Its virtual explorer keeps only `windowRows` plus bounded overscan in the DOM while preserving the logical row count, spacer geometry, absolute `aria-rowindex`, and traversal across every retained semantic row. Arrows move one row, Home/End move to the boundary, Page Up/Page Down move one viewport, Enter/Space use the configured selection contract, and Escape clears selection and returns focus to the Canvas. `explorer: false` materializes the complete bounded mirror for hosts that require it. `maxRows` remains constrained to 1–5,000 and bounds the compiled semantic sidecar; virtualization controls DOM cost and does not claim an unbounded source.

Focus projects a bounded ring over the corresponding mark and uses the same safe tooltip content as pointer inspection. Pointer, keyboard, and programmatic selection all resynchronize `aria-selected`; polite selection announcements can be disabled or throttled. `linkedFocus` registers one stable scalar datum key in a bounded shared store. Independently-created Canvas or Spatial views in the same `group` focus their matching semantic mark without embedding callbacks in the spec. Pass `ChartCreateOptions.focusStore` to isolate dashboards or tests; omitted charts use the shared default store.

The mirror covers all 41 Canvas families. Spatial `accessibility.navigation` traverses the bounded GPU pick index with the same Arrow/Home/End/Page vocabulary, continuously reprojects its visible focus ring after camera or resize changes, and synchronizes the WebGL surface through `aria-activedescendant`. Enter/Space activates the existing depth-aware selection contract; Shift+Arrow preserves camera navigation. Spatial `linkedFocus` uses the same stable-key store, and `SpatialCreateOptions.focusStore` provides the same runtime-only injection boundary. Applications may still provide a domain-specific visible summary or larger external data table when the bounded sidecar omits rows or a derived chart needs more explanation.

Do not use autoplay as the only way to expose information. Host applications should honor their reduced-motion policy, provide pause and step controls, and avoid rapid flashing changes. Graflume playback defaults to paused with transitions off; enabled transitions interpolate compiled rendering only and never synthesize source observations.

## Related guides

- [Chart guide index](./README.md)
- [Cartesian axes](./axes.md)
- [Motion chart](./motion.md)
- [Timeline and range](./timeline.md)
- [Map chart](./map.md)

[Back to chart guides](./README.md)
