# Adaptive output and constrained environments

Graflume adapts from observable capabilities, explicit host signals, and container measurements. It does not inspect a browser name, operating-system name, or user-agent string. The same chart can therefore respond consistently on a small browser window, a zoomed desktop page, a watch-sized WebView, an e-paper reader, a remote-controlled display, or an accessibility test harness.

The adaptive layer is runtime presentation state. It never mutates the authored `ChartSpec` or `SpatialSpec`, never changes source data silently, and never registers a hidden theme. Canvas and Spatial expose the resolved state through their chart instances so a host can explain and test what changed.

## Automatic adaptation

Adaptive behavior is enabled by default. The runtime measures the live container and combines it with supported media queries and bounded browser hints. It can respond to:

- narrow, micro, round, segmented, cutout, zoomed, ultrawide, paged, and virtual-keyboard-constrained viewports;
- fine, coarse, absent, keyboard, switch, and remote input;
- forced colors, increased contrast, monochrome, grid, e-ink-like slow update, reduced motion, reduced transparency, and reduced data;
- constrained memory, CPU, pixel ratio, or data budgets;
- right-to-left and vertical writing modes; and
- explicit screen-reader, braille, XR, projection, or no-script host signals that browsers cannot reliably infer.

Automatic resolution is capability-based and deliberately conservative. A screen reader, braille display, switch controller, XR surface, or device posture is not inferred from a user agent. Pass an explicit runtime environment override when the embedding application has trustworthy information that the browser does not expose.

```js
const chart = Graflume.create('#chart', spec, {
  adaptive: {
    profiles: 'auto',
    largeDataNavigation: true,
    largeDataThreshold: 50_000,
  },
});

console.log(chart.getAdaptiveState());
chart.on('adaptivechange', ({ state, previous }) => {
  console.log(previous.viewport, '→', state.viewport);
});
```

Quick APIs place runtime options under `create` so they do not become part of the portable chart specification:

```js
Graflume.bar('#adoption', rows, {
  x: { field: 'capability', type: 'ordinal', title: 'Capability' },
  y: { field: 'adoption', type: 'quantitative', title: 'Adoption (%)' },
  title: {
    text: 'Feature adoption',
    subtitle: 'Ordered current adoption across six capabilities',
  },
  create: {
    adaptive: {
      profiles: 'mobile-touch',
    },
  },
});
```

`adaptive: false` disables the layer for an exact compatibility test. `layout: false` keeps authored layout while retaining other selected display, motion, resource, and accessibility behavior. `colorAdaptation: false` preserves authored color when the host has another validated forced-color or monochrome strategy.

## Reproducible profiles

`adaptiveProfileCatalog` is the ordered source of truth. Consumers must iterate it instead of copying an allowlist or assuming the catalog will always contain the same number of entries. `catalog/graflume.adaptive-profiles.json` publishes the same registry for non-JavaScript hosts, with its closed schema at `schema/graflume.adaptive-profiles.schema.json`.

The first six scenario profiles are the product demonstrations requested most often:

| Profile            | Reproducible environment                                           |
| ------------------ | ------------------------------------------------------------------ |
| `responsive-fluid` | continuously resized ordinary container                            |
| `mobile-touch`     | narrow portrait viewport, coarse pointer, and virtual keyboard     |
| `smartwatch`       | round micro viewport with safe insets and a constrained budget     |
| `ebook-paper`      | paged monochrome display with slow updates and static-first output |
| `monochrome`       | colorless display with outlines and ordered gray ramps             |
| `dot-matrix`       | low-resolution grid display with bounded density and pixel ratio   |

The remaining entries isolate capabilities that can also combine in automatic mode: `zoom-reflow`, `foldable-dual`, `tv-remote`, `print-paged`, `forced-colors`, `reduced-effects`, `coarse-touch`, `keyboard-switch`, `low-resource`, `rtl`, `vertical-writing`, `ultrawide-projection`, `screenreader-braille`, `no-script`, `spatial-xr`, `cutout-round`, and `virtual-keyboard`.

Pass one ID or an ordered array to reproduce a case. Unknown IDs fail rather than silently falling back.

```js
const state = Graflume.resolveAdaptiveProfile(
  { width: 320, height: 480, rowCount: 75_000 },
  { profiles: ['zoom-reflow', 'forced-colors'] },
);
```

## What the runtime changes

The resolved state can make the following bounded presentation changes:

- reflow chart padding, axis label length and tick spacing, and an unauthored legend position;
- preserve a minimum control target and safe-area insets;
- enable inspection zoom for constrained or explicitly large-data views when it does not conflict with domain navigation, analytic selection, or mark-label authoring;
- cap the renderer pixel ratio and disable autoplay or interpolation under constrained motion or update conditions;
- apply high-contrast, monochrome, e-ink, or pixel-grid presentation without changing the registered theme;
- recommend or expose the semantic table for paged, nonvisual, or static fallbacks; and
- publish resolved capability, display, input, motion, resource, and large-data state as observable host metadata.

Authored choices win where ambiguity would be harmful. Graflume does not replace an explicit axis position, legend position, navigation mode, selection gesture, padding, or playback policy merely because a profile is active. It also does not aggregate or sample data inside the adaptive layer.

## Large data is a separate data contract

`largeDataNavigation` provides inspection controls and a bounded rendering environment; it is not a claim that arbitrary source rows can be duplicated or sent directly to a renderer. Aggregate, bin, sample, decimate, or otherwise derive a family-appropriate view before rendering, retain extrema/events/outliers when required by the analysis, and disclose source, derived, and rendered counts.

When a host knows a logical source cardinality that is larger than the materialized view, pass that count as an explicit environment hint:

```js
Graflume.create('#chart', reducedSpec, {
  adaptive: {
    profiles: 'responsive-fluid',
    environment: { rowCount: 250_000 },
    largeDataNavigation: true,
  },
});
```

### Reproducible high-volume examples

The public Canvas, complete, and Spatial entry points export the same closed demo-recipe API. A host can keep a large example compact in server-rendered HTML, ask for consent, and materialize it only when the user opens the example:

```js
const example = edgeCatalog.examples.find((item) => item.id === 'network-volume');
const { data, previewRows, plan } = Graflume.materializeDemoRecipe(example.recipe);

Graflume.network('#chart', data, {
  ...example.options,
  create: {
    adaptive: {
      largeDataNavigation: true,
      environment: { rowCount: plan.sourceRows },
    },
  },
});
```

The 18 registered recipes do not repeat a small payload until it looks large. They use family-specific aggregation, time bins, stratified samples, graph or hierarchy level of detail, exact set intersections, spatial grids, and bounded vector fields. `previewRows` contains at most 12 semantic rows for a table fallback. `plan` discloses the logical input, derived data, rendered rows, reduction method, and renderer budget. Unknown parameters, incompatible shapes, invalid cardinality units, and mismatched output resources are rejected.

The source cardinality is explanatory runtime metadata. It never causes Graflume to invent missing rows.

## Static and assistive fallbacks

JavaScript cannot execute when scripting is unavailable. The `no-script` profile therefore describes a host obligation rather than pretending the runtime can repair its own absence. Pair every important chart with a verified static image, a meaningful caption, and a semantic data table. Keep the table closed by default only when its summary and disclosure remain reachable without script; critical exact values must not exist only in Canvas pixels or color.

Canvas accessibility mirrors and Spatial projected focus remain documented in [Common chart interactions](charts/interactions.md#accessibility-and-motion). A host should still provide a domain-specific summary when a chart contains derived statistics, uncertainty, depth, or a reduced large-data view that needs interpretation.

## Verification boundary

The catalog generator checks ordered IDs, unique capabilities, closed environment fields, stable presentation metadata, and regeneration drift. Runtime tests cover Canvas and Spatial state changes, resize transitions, input target sizing, motion suppression, color adaptation, pixel-ratio limits, safe areas, and large-data navigation. Product hosts should additionally test their real CSS and fallback markup at representative desktop, mobile, 320 CSS px reflow, watch, e-paper, forced-color, RTL, print, and no-script surfaces.

These profiles do not claim native device emulation, operating-system certification, a general GIS viewport, medical-volume rendering, XR immersion, or automatic assistive-technology detection. They provide a deterministic capability contract that a host can extend without forking chart semantics.
