# Graflume

Graflume is an experimental, CDN-first visualization engine built around a portable chart specification, composable layers, a renderer boundary, and a data pipeline that can grow from ordinary dashboards to large-data rendering.

> Status: `0.1.0-alpha.0`. The public contracts are intentionally small and versioned, but they are not stable yet.

## What already works

- 79 portable `ChartSpec` marks covering 41 Canvas 2D families and 168 compatible presets, plus 5 portable `SpatialSpec` marks covering 3 opt-in WebGL families and 7 spatial variants
- 44 canonical families and 176 callable presets or modes in total, including one WebGL globe mode integrated into the existing Map family and 120 preserved public compatibility identifiers
- Cartesian, radial, distribution, financial, interval, calendar, timeline/Gantt, table, hierarchy, flow, word, and statistical world-map Scenes backed by built-in Natural Earth 1:110m country boundaries
- all 45 named technical-indicator presets calculated in-process from their declared numeric or OHLCV inputs, with formula provenance, session reset policy, overlay/panel metadata, synchronized-x-crosshair contracts, and bounded incremental/Worker execution
- mixed layers such as bar + line + points on shared or independent `x`/`x2`/`y`/`y2` axes
- row-oriented data and zero-copy `TypedArray` columnar input
- ordered, function-free [data transforms](docs/data-transforms.md) with deterministic execution and source-row lineage
- closed, bounded [Canvas composition and resolve](docs/composition.md) for layer, facet, repeat,
  horizontal/vertical/wrapped concat, nested grids, and plot-relative inset views
- bounded ring-backed stable-key updates, incremental transforms, frame-coalesced live streams,
  and automatic [portable transform/render Workers](docs/data-streaming-workers.md)
- a function-free [scale and encoding registry](docs/scales-and-encodings.md) with explicit mathematical domains, OOB policy, conditional visual channels, and a legacy `x`/`y` facade
- a versioned, function-free `ChartSpec 0.1` plus JSON Schema for portable JSON data
- runtime validation and canonical normalization
- Canvas 2D rendering behind a renderer interface, plus an independent opt-in WebGL spatial renderer for flat- or smooth-normal surfaces, filled meshes with wire and contour overlays, transfer-mapped volume projections and slices, isosurfaces, vector cones, supplied or adaptively integrated streamtubes, sphere-shaded spatial scatter, and a real Natural Earth globe
- an ordered catalog of 17 built-in themes with polished light/dark designs, a `ggplot` profile matching
  ggplot2 `theme_gray()`, an R 4.6.1 base-graphics profile, a Matplotlib 3.11.1 default-style
  profile, and custom theme registration
- custom mark, renderer, and theme plugins
- responsive chart instances, mark-aware legends with keyboard visibility controls, portable static
  highlights and reference bands, click/programmatic point selection, bounded serializable
  interval/rectangle/axis/lasso selection with explicit union/intersection, continuous and categorical
  Cartesian domain zoom/pan and pixel/domain round-trip, keyboard-authored geometry, selection-driven
  filtering, composed leaf routing, and injected linked-view state, collision-aware text-only runtime callouts with an accessible visibility toggle,
  reusable function-free mark labels with automatic collision placement, Canvas editing handles,
  pointer/keyboard authoring, snapping, portable positions, and bounded undo/redo,
  pointer hit testing, mark or axis-nearest tooltips, whole-Canvas inspection controls, fullscreen,
  PNG export, and named/ranged forward or reverse playback with opt-in smooth Scene transitions
- capability-driven adaptive output for fluid/mobile/watch/e-paper/monochrome/grid displays and
  zoomed, foldable, remote, paged, forced-color, reduced-effect, low-resource, RTL, vertical-writing,
  assistive, no-script, XR, cutout, and virtual-keyboard environments without user-agent branching
- standard/large/ultra performance profiles with bounded line, point, and bar rendering
- deterministic product-quality demo data and 18 closed high-row-count recipes that actually
  generate and process every logical observation before bounded aggregation or sampling, while
  disclosing source, generated, processed, derived, and rendered counts
- a DOM-free `compile()` path for wrappers, SSR pipelines, testing, and future language bindings

The 2026-08-26 `current-limitations` completion release moved all 161/161 items that had been listed under the 44 family manuals' **Current limitations** boundary into executable, tested support. Its exact per-family capability, source, and test mapping is checked in at [`catalog/graflume.current-limitations.evidence.json`](catalog/graflume.current-limitations.evidence.json); the seven common foundations and all 44 families now have `supported` status with zero remaining P0/current-limitations items. This does not promote the separately researched candidate families or claim the P1/P2 roadmap. The same release adds executable `kagi()`, `threeLineBreak()`, and `rangeBars()` modes to the existing Price blocks family, without creating duplicate family cards.

WebGPU, full raster/vector tile GIS, roads and place layers, geocoding, additional geographic projections, and Python/R/Java wrappers remain future work rather than being inferred from that closure. The automatic Worker v2 boundary executes closed transforms and bounded incremental technical indicators, decodes Arrow-compatible binary envelopes through named adapters, can use injected JavaScript/WASM transform engines, and can hand a Scene to an injected worker-owned renderer; it does not guess an Arrow decoder, WASM module, or renderer implementation. The Canvas inspection viewport magnifies the complete already-rendered chart, including titles and axes; `interaction.domainNavigation` is the separate Cartesian scale-domain path for continuous and band/point axes. Keyboard-authored selection, selection-driven filtering, composition leaf routing, and an injected bounded linked-view store use the same portable analytic/domain state; Spatial domain navigation remains separate. The WebGL spatial entry provides camera orbit, pan, zoom, projection switching, picking, projected GPU mark traversal, compact controls, fullscreen, and PNG export, but it is deliberately separate from a general GIS or medical-volume toolkit. Some specialist marks intentionally expose a bounded alpha surface; every chart manual states its exact supported and future boundaries.

## Local development

```bash
npm install
npm run check
```

Build outputs:

```text
dist/graflume.js                   default ESM
dist/graflume.global.js            default readable browser global
dist/graflume.min.js               default minified CDN bundle
dist/graflume.complete.js          complete-catalog ESM
dist/graflume.complete.global.js   complete-catalog browser global
dist/graflume.complete.min.js      complete-catalog minified bundle
dist/graflume.spatial.js           opt-in spatial ESM
dist/graflume.spatial.global.js    opt-in spatial browser global
dist/graflume.spatial.min.js       opt-in spatial minified bundle
dist/index.d.ts                    default TypeScript declarations
dist/complete.d.ts                 complete-catalog declarations
dist/spatial.d.ts                  spatial declarations
```

## CDN usage

After an npm release, load an **exact version** from jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/npm/graflume@0.1.0-alpha.0/dist/graflume.min.js"></script>
<div id="chart" style="height: 420px"></div>
<script>
  const data = [
    { month: 'Jan', actual: 42, target: 38 },
    { month: 'Feb', actual: 51, target: 47 },
    { month: 'Mar', actual: 49, target: 52 },
  ];

  Graflume.create('#chart', {
    data,
    title: 'Revenue',
    layers: [
      {
        mark: { type: 'bar', opacity: 0.3 },
        x: 'month',
        y: { field: 'target', type: 'quantitative' },
      },
      {
        mark: { type: 'line', point: true },
        x: 'month',
        y: { field: 'actual', type: 'quantitative' },
      },
    ],
    locale: 'en-US',
    interaction: {
      tooltip: {
        title: 'Revenue details',
        trigger: 'axis',
        axis: 'x',
        fields: [
          { field: 'month', label: 'Month' },
          { field: 'actual', label: 'Actual', format: 'number' },
          { field: 'target', label: 'Target', format: 'number' },
        ],
      },
    },
  });
</script>
```

The exact npm CDN URL becomes valid only after that package version is published.

For pre-npm alpha testing, the repository maintains source-controlled default, complete, and spatial browser snapshots at `cdn/graflume.global.js`, `cdn/graflume.complete.global.js`, and `cdn/graflume.spatial.global.js`. The snapshot workflow builds all three entrypoints, commits the browser bundles, rewrites every downloadable example to exact Git commit URLs with independent SHA-384 Subresource Integrity, and verifies the jsDelivr responses byte for byte. Moving aliases such as `@main` and `@latest` are not used.

## Chart types and examples

The Canvas 2D catalog covers 41 distinct chart families and 120 compatibility identifiers. The default `graflume` entrypoint exposes 22 established families. The optional `graflume/complete` entrypoint adds 11 advanced and 8 specialized families while reusing the same data table, validation, normalization, scales, theme tokens, renderer-neutral Scene, Canvas renderer, interactions, and accessibility metadata. All 168 documented 2D names remain compatible presets rather than duplicate discovery entries. The independent `graflume/spatial` entrypoint adds 3 canonical WebGL families with 7 variants; `globe()` remains a mode of Map, producing a combined boundary of 44 families and 176 callable presets or modes.

Canvas compilation also exposes a bounded renderer-neutral semantic index for every family. Opt into a hidden or visible native table with `accessibility.table`, cap it with `maxRows`, and tune its bounded DOM window with `explorer`. Arrow/Home/End/Page roving traversal reaches every retained semantic row without materializing the entire table; Enter/Space follows the chart selection contract and Escape clears it. `linkedFocus` synchronizes one stable scalar datum key across Canvas and Spatial views, while Spatial `navigation` projects the active GPU pick into a visible ring and `aria-activedescendant`. Hosts can inspect Canvas state through `getSemanticIndex()`, `toAccessibleRows()`, and `getAccessibilityState()`. See [Common chart interactions](docs/charts/interactions.md#accessibility-and-motion) for exact bounds, lineage, multilingual behavior and live announcements.

| Family group                  | Distinct chart guides                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cartesian and comparison      | [Bar](docs/charts/bar.md), [Line](docs/charts/line.md), [Area](docs/charts/area.md), [Scatter](docs/charts/scatter.md), [Combination](docs/charts/combination.md), [Difference](docs/charts/difference.md), [Interval](docs/charts/interval.md), [Waterfall](docs/charts/waterfall.md)                                                                                                                                        |
| Distribution and statistics   | [Bubble](docs/charts/bubble.md), [Distribution](docs/charts/distribution.md), [Heatmap](docs/charts/heatmap.md), [Contour](docs/charts/contour.md), [Scatter matrix](docs/charts/scatter-matrix.md)                                                                                                                                                                                                                           |
| Radial and financial          | [Pie](docs/charts/pie.md), [Gauge](docs/charts/gauge.md), [Candlestick](docs/charts/candlestick.md), [Polar](docs/charts/polar.md), [Smith](docs/charts/smith.md), [Ternary](docs/charts/ternary.md), [Chord](docs/charts/chord.md), [Funnel](docs/charts/funnel.md), [Price blocks](docs/charts/price-blocks.md), [Volume profile](docs/charts/volume-profile.md), [Technical indicator](docs/charts/technical-indicator.md) |
| Time and projects             | [Annotation](docs/charts/annotation.md), [Calendar](docs/charts/calendar.md), [Timeline and range](docs/charts/timeline.md), [Motion](docs/charts/motion.md)                                                                                                                                                                                                                                                                  |
| Hierarchy, flow, and networks | [Hierarchy](docs/charts/hierarchy.md), [Flow](docs/charts/flow.md), [Network](docs/charts/network.md), [Parallel coordinates](docs/charts/parallel.md), [Word tree](docs/charts/word-tree.md), [Table](docs/charts/table.md)                                                                                                                                                                                                  |
| Geographic and specialized    | [Map](docs/charts/map.md), [Carpet](docs/charts/carpet.md), [Raster image](docs/charts/image.md), [Vector field](docs/charts/vector-field.md), [Venn](docs/charts/venn.md), [Word cloud](docs/charts/word-cloud.md), [Item](docs/charts/item.md), and the [full catalog index](docs/charts/README.md#unified-specialized-series)                                                                                              |

Start with the [chart guide index and common options](docs/charts/README.md). The [composition and resolve manual](docs/composition.md) defines the portable layer/facet/repeat/concat/inset grammar, deterministic view identity, shared-domain boundary, limits, and explicit exclusions. The [scale and encoding manual](docs/scales-and-encodings.md) defines the immutable registry, channel/mark matrix, conditional values, strict domain constraints, OOB policy, and interaction coordinate bridge. The [theme manual](docs/charts/themes.md) documents the registry-driven built-in catalog, including the ggplot2-compatible, R 4.6.1 base-graphics, and Matplotlib 3.11.1 default-style profiles, exact precedence, and the boundary for chart types without a direct reference counterpart. The dedicated [Cartesian axis manual](docs/charts/axes.md) covers formatting, label layout, styling, reversed domains, secondary axes, and axis-nearest tooltips. The [common interaction manual](docs/charts/interactions.md) documents legends, highlights, reference bands, point and analytic selection, continuous data-domain navigation, runtime callouts, automatic mark-label layout and authoring, the inspection viewport, controls, fullscreen, PNG export, playback, optional stable-key Scene transitions, and the exact unsupported boundary. [Adaptive output and constrained environments](docs/adaptive-output.md) documents the registry-driven Canvas/Spatial runtime, reproducible device and capability profiles, large-data boundary, and static fallback responsibilities without user-agent branching. Every representative family page includes its compatible names, functional mode differences, a visible compiled-output gallery, and type-by-type runnable Quick API examples with required fields and stable links, followed by the shared portable contract, missing-value behavior, interaction/accessibility guidance, performance notes, and explicit limitations. Use the [compatibility preset index](docs/charts/compatibility-presets.md) to map any compatible name to its family manual; function-free compatibility adapters are documented separately in [Declarative adapters](docs/charts/adapters.md).

The [spatial guide index](docs/spatial/README.md) documents `SpatialSpec 0.1`, the separate bundle boundary, camera and picking interactions, accessibility fallbacks, and actual generated previews for Surface/Mesh, Volume/Isosurface, Spatial Vector modes, and the Map globe mode. The [spatial browser gallery](examples/cdn/spatial-chart-types.html) renders filled multi-peak terrain and shell geometry, a sampled multi-lobe scalar field, a cyclone, multiple helical tubes, and a clustered galaxy with the real WebGL runtime.

The default Graflume visual system is intentionally presentation-ready: horizontal grid lines remain available for quantitative comparison, categorical vertical grids are suppressed by default, data strokes use rounded joins and caps, point marks receive a contrasting outline, and structural charts use the same spacing, surface, and palette tokens. Select `theme: 'ggplot'` for ggplot2 4.0.3 `theme_gray()` structure, `theme: 'r-base'` for the common R 4.6.1 base-graphics appearance, or `theme: 'matplotlib'` for Matplotlib 3.11.1's default white axes, four black spines, outward ticks, DejaVu Sans typography, per-series tab10 cycle, zero-radian counterclockwise pies, and exact 256-entry viridis scale and continuous legend. The reference profiles cover the full Canvas and Spatial catalog while specialist and Spatial families retain their own geometry. Explicit mark, axis, background, and datum styles still win.

[`examples/cdn/complete-chart-types.html`](examples/cdn/complete-chart-types.html) renders the 22 default families. [`examples/cdn/additional-chart-types.html`](examples/cdn/additional-chart-types.html) renders 11 advanced families, and [`examples/cdn/series-chart-types.html`](examples/cdn/series-chart-types.html) renders 8 specialized families with their integrated preset modes. Together they cover the 41-family Canvas catalog. [`examples/cdn/spatial-chart-types.html`](examples/cdn/spatial-chart-types.html) renders the 3 opt-in spatial families and the Map globe mode. The smaller [`examples/cdn/chart-types.html`](examples/cdn/chart-types.html) remains the introductory gallery.

Aliases remain canonical and serializable: `scatter()` maps to `point`, `donut()` maps to `pie` plus an inner radius, Bar and Column share `bar` plus orientation, Annotated Timeline maps to `annotation`, and Combo maps to ordinary `layers`.

### Complete-catalog ESM usage

```ts
import { areaRange, flowMap, openHighLowClose, relativeStrengthIndex } from 'graflume/complete';

areaRange('#forecast', forecastRows, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'midpoint', type: 'quantitative' },
  mark: { fields: { low: 'minimum', high: 'maximum' } },
});

openHighLowClose('#prices', priceRows, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'close', type: 'quantitative' },
  mark: { fields: { open: 'open', high: 'high', low: 'low', close: 'close' } },
});
```

`flowMap()` and `relativeStrengthIndex()` follow the same Quick API shape for geographic routes and indicator columns. The technical-indicator capability registry exposes all 45 named presets as formula-tested `computed` kinds with exact numeric/OHLCV inputs, parameter schemas, dependency DAGs, provenance, and null warm-up policy; `calculate: true` never silently reuses the source column for an invalid name or missing input. The 47-entry public total is exactly 45 named presets plus two canonical surfaces: `technicalIndicator()` and the portable `indicator` mark.

Area and Bar accept one-layer long-form series through `mark.fields.series` plus `mark.options.stack`. Grouped, stacked, 100-percent, and diverging layouts share the ordered stack transform; `streamgraph()` selects a true wiggle offset with `insideOut` order while `themeRiver()` retains its centered silhouette default. Totals, stack boundaries, signed percentages, source-row lineage, and per-row hit targets remain renderer-neutral.

`resolveSeriesType('area-spline-range')` returns the single canonical family used for a supported compatibility identifier, so overlapping catalog names never create a second renderer path. Importing `graflume/complete` registers only additional portable mark compilers and re-exports the default API. It does not embed a second rendering engine. Portable custom charts remain function-free and may emit only the declared Scene primitive subset. `runtimeCapabilities` publishes the same closed name-function contract in `catalog/graflume.catalog.json`; its `tiledMap` member identifies the deprecated compatibility name as an embedded Natural Earth basemap alias with no tile lifecycle or network request.

### Bar chart

The shortest bar chart API is `Graflume.bar()`:

```html
<div id="chart" style="height: 420px"></div>
<script>
  const data = [
    { month: 'Jan', sales: 42 },
    { month: 'Feb', sales: 51 },
    { month: 'Mar', sales: 49 },
  ];

  Graflume.bar('#chart', data, {
    title: 'Monthly sales',
    x: { field: 'month', type: 'ordinal' },
    y: {
      field: 'sales',
      type: 'quantitative',
      scale: { zero: true, nice: true },
    },
    mark: { fill: '#4f46e5', cornerRadius: 8 },
  });
</script>
```

Runnable examples:

- [`examples/bar/index.html`](examples/bar/index.html): local single-series bar chart using the committed browser snapshot
- [`examples/cdn/bar-chart.html`](examples/cdn/bar-chart.html): standalone grouped bar chart that can be downloaded and opened directly; it uses an exact jsDelivr commit pin and SRI
- [`examples/cdn/chart-types.html`](examples/cdn/chart-types.html): standalone bar, line, area, scatter, and mixed-chart gallery
- [`examples/cdn/complete-chart-types.html`](examples/cdn/complete-chart-types.html): the 22 default families
- [`examples/cdn/additional-chart-types.html`](examples/cdn/additional-chart-types.html): the 11 distinct advanced families from the complete browser bundle
- [`examples/cdn/series-chart-types.html`](examples/cdn/series-chart-types.html): the 8 distinct specialized families and their 99 compatible presets

The CDN examples also demonstrate responsive, catalog-driven built-in theme switching, pointer hit testing, PNG export, and a readable data-table fallback.

## ESM usage

```ts
import { create, type ChartSpec } from 'graflume';

const spec: ChartSpec = {
  data: [
    { x: 1, y: 2 },
    { x: 2, y: 5 },
    { x: 3, y: 4 },
  ],
  mark: { type: 'line', point: true },
  x: { field: 'x', type: 'quantitative' },
  y: { field: 'y', type: 'quantitative' },
  interaction: {
    tooltip: {
      title: 'Point details',
      trigger: 'axis',
      axis: 'x',
      fields: [
        { field: 'x', label: 'X', format: 'number' },
        { field: 'y', label: 'Y', format: 'number' },
      ],
    },
  },
};

const chart = create('#chart', spec);
chart.on('click', ({ hit }) => console.log(hit?.datum));
```

For a shorter API:

```ts
import { line } from 'graflume';

line('#chart', data, {
  x: 'month',
  y: { field: 'sales', type: 'quantitative' },
  title: 'Monthly sales',
  mark: { point: true },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Monthly sales',
      trigger: 'axis',
      axis: 'x',
      fields: ['month', { field: 'sales', label: 'Sales', format: 'number' }],
    },
  },
});
```

Built-in tooltips are opt-in. `tooltip: true`, or an object without `trigger`, keeps exact
`mark` hit testing. Ordered charts can explicitly set `trigger: 'axis'` and select `x`, `x2`, `y`,
or `y2`: an exact rendered-mark hit still wins, while other pointer positions in the plot or
corresponding axis region resolve the nearest actual datum from layers bound to that axis without
interpolation. This fallback changes only the tooltip; structured hover and click events continue
to report exact rendered-mark hits. Tooltip content is rendered with DOM `textContent`; raw HTML
and executable formatter callbacks are not part of the portable spec. Number and date formatting
follows `locale`, and ISO date-only values retain their calendar date across browser time zones.
Axis lookup is pointer-only, so applications should keep a readable summary or data table available
for exact values and keyboard access.

## Cartesian axes

Graflume resolves `x`, `x2`, `y`, and `y2` independently. The primary defaults are bottom x and
left y; secondary axes default to top x2 and right y2. Only the primary y grid is enabled by
default. Temporal encodings without an explicit scale use portable UTC ticks; request
`scale: { type: 'time' }` when host-local civil time is intentional. Axis formatting and styling
remain declarative and serializable:

```ts
import { line } from 'graflume';

const revenueRows = [
  { date: '2026-08-01', revenue: 124000 },
  { date: '2026-08-08', revenue: 151000 },
  { date: '2026-08-15', revenue: 143000 },
];

line('#revenue', revenueRows, {
  x: {
    field: 'date',
    type: 'temporal',
    scale: { type: 'time' },
  },
  y: {
    field: 'revenue',
    type: 'quantitative',
    scale: { domain: [0, 200000] },
  },
  axes: {
    x: {
      format: { type: 'date', dateStyle: 'medium', timeZone: 'Asia/Seoul' },
      labels: { angle: -35, font: { size: 11 } },
    },
    y: {
      title: 'Revenue',
      format: { type: 'currency', currency: 'KRW', fractionDigits: 0 },
    },
  },
  locale: 'ko-KR',
});
```

Bind an encoding to a secondary axis with `axisId: 'x2'` or `axisId: 'y2'`. Chart-level `axes`
settings are deeply merged with encoding-level `axis` overrides. See the [Cartesian axis
manual](docs/charts/axes.md) for label orientation, fonts, spacing, styles, reversed domains,
independent dual-axis layers, and axis-nearest tooltip examples.

## Inspection, analytic interaction, controls, and playback

The built-in Canvas renderer can magnify and translate the complete compiled chart surface, enter browser fullscreen, and export the current Canvas as PNG. This inspection viewport moves the title and axes with the marks; it is not scale-domain, brush, tile, or GIS zoom. Use the separate `domainNavigation` contract for invertible continuous plus categorical band/point Cartesian axes and `selection.kind` for point, interval, rectangle, axis, or lasso state. Ambiguous drag controllers and arbitrary non-invertible geometry fail explicitly.

```ts
line('#revenue', revenueRows, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'revenue', type: 'quantitative' },
  interaction: {
    navigation: { maxZoom: 4, wheel: 'modifier' },
    controls: { zoom: true, reset: true, fullscreen: true, export: true, annotations: true },
  },
});
```

Analytic state is closed and portable: `getAnalyticSelection()` returns versioned union/intersection clauses, while `getDomainViewState()` returns normalized axis windows. `domainToPixel()` and `pixelToDomain()` use an exact addressable leaf scale. Pointer, touch, and S/Arrow/Space/Enter keyboard commands author geometry; wheel, drag, and keyboard operate enabled domain navigation; Escape clears or cancels selection. Optional filtering retains full-data axes, compositions route state through deterministic leaf IDs, and `LinkedViewStateStore` synchronizes independently-created charts without callbacks in the spec. These transient APIs recompile the Scene without mutating `getSpec()`. See [Common chart interactions](docs/charts/interactions.md) for bounds and the remaining Spatial/non-Cartesian boundary.

Playback is opt-in and frame selection remains discrete. A `motion` chart can select its native frame while retaining the full domain; other families show playback only through an explicitly approved transient filter, which may recompile domains and layouts. An explicit transition smoothly interpolates compatible compiled geometry and safely crossfades incompatible topology without inventing source values:

```ts
interaction: {
  playback: {
    field: 'year',
    key: 'country',
    mode: 'frame',
    interval: 1000,
    direction: 'reverse',
    namedFrames: [{ name: 'Review', value: 2026 }],
    range: { start: 0, end: 'Review' },
    transition: { duration: 600, easing: 'ease-in-out' },
    filter: false,
  },
  controls: { playback: true },
}
```

Frame order follows each value's first occurrence in source rows, not an automatic chronological sort. Sort temporal input before chart creation. Named scalar values can anchor `seek()`/`play()` and inclusive loop ranges; direction changes autoplay without changing signed manual steps. Transitions default to `false`; when enabled, a stable scalar `key` is recommended, the effective duration is clamped below the frame interval, and reduced-motion keeps endpoint changes immediate. Distribution, volume-profile, timeline intervals, Renko/Point & Figure, waterfall, and calculated-indicator playback need additional semantic review because generic row filtering can change aggregation, path history, or interval meaning. See [Common chart interactions](docs/charts/interactions.md) for the complete API, lifecycle methods/events, renderer-neutral behavior, transition fallback rules, safe starter allowlist, and all-family matrix.

## Streaming-shaped updates

Without `streaming`, `appendData()` retains its original copy-compatible behavior. Opt in with an explicit stable key for deterministic `upsertData()`, `replaceLastData()`, retention, watermark/late-data policy, bounded replay, and serialized provenance:

```ts
const chart = create('#revenue', {
  data: [{ id: 'a', timestamp: 1000, value: 70 }],
  mark: 'line',
  x: 'timestamp',
  y: 'value',
  streaming: {
    key: 'id',
    mode: 'upsert',
    retention: { maxRows: 10_000, time: { field: 'timestamp', durationMs: 60_000 } },
    eventTime: { field: 'timestamp', allowedLatenessMs: 2_000, lateData: 'drop' },
    queue: { maxBatches: 8, maxRows: 20_000, overflow: 'coalesce' },
    runtime: {
      schedule: 'animation-frame',
      maxBatchesPerFrame: 4,
      overflow: 'coalesce',
      followLive: true,
      history: { maxBatches: 128, pageRows: 1_000 },
    },
  },
});

await chart.enqueueData({ mode: 'upsert', rows: [{ id: 'a', value: 71, timestamp: 1500 }] });
await chart.enqueueData({
  mode: 'replaceLast',
  rows: [{ id: 'a', value: 72, timestamp: 2000 }],
});
const history = chart.getStreamingHistoryPage();
```

`enqueueData()` applies the authored frame, overflow, pause/follow-live and lazy-history policy. `createIncrementalTransformPipeline()` reuses unchanged stable-key results for row-local filter/calculate stages and performs an exact full fallback for order-dependent or aggregate stages. `createAutomaticWorkerRuntime()` constructs the declared module Worker and exposes bounded transform, binary-adapter and worker-owned render operations with cancellation. See [Incremental data and portable workers](docs/data-streaming-workers.md) for ownership, adapters, queue semantics and hard limits.

## Architectural boundary

```text
Quick API / ChartSpec / language builders
                  │
          validation + normalize
                  │
        DataTable + performance profile
                  │
        scales + layout + mark compilers
                  │
              Scene Graph
                  │
       renderer registry / Canvas 2D
                  │
     WebGL · WebGPU · SVG · server later
```

`ChartSpec` remains portable and function-free. JavaScript-only escape hatches belong in explicit plugins rather than silently making the common spec impossible to serialize in Python, R, Java, notebooks, or AI tooling.

## Plugin example

```ts
import { pluginApiVersion, use } from 'graflume';

use({
  name: 'my-mark-pack',
  apiVersion: pluginApiVersion,
  install(api) {
    api.registerMark('custom-mark', (context) => {
      // Return renderer-neutral scene nodes.
      return [];
    });
  },
});
```

## Specification

The machine-readable schema is in [`schema/graflume.schema.json`](schema/graflume.schema.json) and uses the stable identifier `urn:graflume:schema:0.1`.

Any change to the portable spec must update all three together:

1. TypeScript public types
2. runtime validation/normalization
3. JSON Schema and regression tests

## Security defaults

- portable specs reject functions
- unsafe object keys such as `__proto__` are rejected
- chart events return structured data rather than raw HTML
- the opt-in built-in tooltip accepts only declarative fields and renders untrusted values as text
- the core has no raw-HTML tooltip formatter or runtime code evaluation
- importing the package does not touch `window` or `document`

## License

No public software license has been selected yet. The repository is intentionally marked `UNLICENSED` until the project owner chooses the release model before the first public package publication.
