# Graflume

Graflume is an experimental, CDN-first visualization engine built around a portable chart specification, composable layers, a renderer boundary, and a data pipeline that can grow from ordinary dashboards to large-data rendering.

> Status: `0.1.0-alpha.0`. The public contracts are intentionally small and versioned, but they are not stable yet.

## What already works

- 73 portable marks covering 37 distinct chart families, 141 compatible presets, and 117 public compatibility identifiers through default and opt-in entrypoints
- Cartesian, radial, distribution, financial, interval, calendar, timeline/Gantt, table, hierarchy, flow, word, and lightweight map Scenes
- mixed layers such as bar + line + points on shared axes
- row-oriented data and zero-copy `TypedArray` columnar input
- a versioned, function-free `ChartSpec 0.1` plus JSON Schema for portable JSON data
- runtime validation and canonical normalization
- Canvas 2D rendering behind a renderer interface
- polished light/dark design-token themes with an accessible categorical palette, quiet axes,
  rounded data strokes, and custom theme registration
- custom mark, renderer, and theme plugins
- responsive chart instances, pointer hit testing, safe data events, and image export
- standard/large/ultra performance profiles with bounded line, point, and bar rendering
- a DOM-free `compile()` path for wrappers, SSR pipelines, testing, and future language bindings

WebGL/WebGPU renderers, workers, Arrow/WASM ingestion, multi-view dashboards, full GIS/projection packages, 3D, and Python/R/Java wrappers are planned rather than claimed as complete. Some newly added specialist marks intentionally expose an alpha subset; every chart manual states its exact limits.

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
dist/index.d.ts                    default TypeScript declarations
dist/complete.d.ts                 complete-catalog declarations
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
  });
</script>
```

The exact npm CDN URL becomes valid only after that package version is published.

For pre-npm alpha testing, the repository maintains source-controlled default and complete browser snapshots at `cdn/graflume.global.js` and `cdn/graflume.complete.global.js`. The snapshot workflow builds both entrypoints, commits the browser bundles, rewrites every downloadable example to exact Git commit URLs with SHA-384 Subresource Integrity, and verifies the jsDelivr responses byte for byte. Moving aliases such as `@main` and `@latest` are not used.

## Chart types and examples

The public catalog covers 37 distinct chart families and 117 compatibility identifiers. The default `graflume` entrypoint exposes 22 established families. The optional `graflume/complete` entrypoint adds 7 advanced and 8 specialized families while reusing the same data table, validation, normalization, scales, theme tokens, renderer-neutral Scene, Canvas renderer, interactions, and accessibility metadata. All 141 historical names remain compatible presets rather than separate discovery entries.

| Family group                  | Distinct chart guides                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cartesian and comparison      | [Bar](docs/charts/bar.md), [Line](docs/charts/line.md), [Area](docs/charts/area.md), [Scatter](docs/charts/scatter.md), [Combination](docs/charts/combination.md), [Difference](docs/charts/difference.md), [Interval](docs/charts/interval.md), [Waterfall](docs/charts/waterfall.md)                                                                      |
| Distribution and statistics   | [Bubble](docs/charts/bubble.md), [Histogram](docs/charts/histogram.md), [Boxplot](docs/charts/boxplot.md), [Heatmap](docs/charts/heatmap.md), [Contour](docs/charts/contour.md)                                                                                                                                                                             |
| Radial and financial          | [Pie](docs/charts/pie.md), [Gauge](docs/charts/gauge.md), [Candlestick](docs/charts/candlestick.md), [Radar](docs/charts/radar.md), [Chord](docs/charts/chord.md), [Funnel](docs/charts/funnel.md), [Price blocks](docs/charts/price-blocks.md), [Volume profile](docs/charts/volume-profile.md), [Technical indicator](docs/charts/technical-indicator.md) |
| Time and projects             | [Annotation](docs/charts/annotation.md), [Calendar](docs/charts/calendar.md), [Timeline and range](docs/charts/timeline.md), [Motion](docs/charts/motion.md)                                                                                                                                                                                                |
| Hierarchy, flow, and networks | [Hierarchy](docs/charts/hierarchy.md), [Flow](docs/charts/flow.md), [Network](docs/charts/network.md), [Parallel coordinates](docs/charts/parallel.md), [Word tree](docs/charts/word-tree.md), [Table](docs/charts/table.md)                                                                                                                                |
| Geographic and specialized    | [Map](docs/charts/map.md), [Vector field](docs/charts/vector-field.md), [Venn](docs/charts/venn.md), [Word cloud](docs/charts/word-cloud.md), [Item](docs/charts/item.md), and the [full catalog index](docs/charts/README.md#unified-specialized-series)                                                                                                   |

Start with the [chart guide index and common options](docs/charts/README.md). Every representative family page includes its compatible names, functional mode differences, compiled preset gallery, Quick API example, portable field contract, missing-value behavior, interaction/accessibility guidance, performance notes, and explicit limitations. Use the [compatibility preset index](docs/charts/compatibility-presets.md) to map any historical name to its family manual; function-free compatibility adapters are documented separately in [Declarative adapters](docs/charts/adapters.md).

The default visual system is intentionally presentation-ready: horizontal grid lines remain available for quantitative comparison, categorical vertical grids are suppressed by default, data strokes use rounded joins and caps, point marks receive a contrasting outline, and structural charts use the same spacing, surface, and palette tokens. Explicit mark and axis styles still override these defaults.

[`examples/cdn/complete-chart-types.html`](examples/cdn/complete-chart-types.html) renders the 22 default families. [`examples/cdn/additional-chart-types.html`](examples/cdn/additional-chart-types.html) renders 7 advanced families, and [`examples/cdn/series-chart-types.html`](examples/cdn/series-chart-types.html) renders 8 specialized families with their integrated preset modes. Together they cover the 37-family catalog. The smaller [`examples/cdn/chart-types.html`](examples/cdn/chart-types.html) remains the introductory gallery.

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

`flowMap()` and `relativeStrengthIndex()` follow the same Quick API shape for geographic routes and precomputed indicator columns. `resolveSeriesType('area-spline-range')` returns the single canonical family used for a supported compatibility identifier, so overlapping catalog names never create a second renderer path. Importing `graflume/complete` registers only additional portable mark compilers and re-exports the default API. It does not embed a second rendering engine. Portable custom charts remain function-free and may emit only the declared Scene primitive subset.

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
- [`examples/cdn/additional-chart-types.html`](examples/cdn/additional-chart-types.html): the 7 distinct advanced families from the complete browser bundle
- [`examples/cdn/series-chart-types.html`](examples/cdn/series-chart-types.html): the 8 distinct specialized families and their 96 compatible presets

The CDN example also demonstrates responsive rendering, light/dark theme switching, pointer hit testing, PNG export, and a readable data-table fallback.

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
});
```

## Streaming-shaped updates

The alpha runtime exposes a portable update surface now; later engines can replace its current copy-based path with ring buffers and incremental transforms without changing the chart instance API.

```ts
chart.appendData([{ timestamp: '2026-08-19T12:00:00Z', value: 71 }]);
chart.setData(nextSnapshot);
chart.setSpec(nextSpec);
```

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
- the core has no HTML tooltip formatter or runtime code evaluation
- importing the package does not touch `window` or `document`

## License

No public software license has been selected yet. The repository is intentionally marked `UNLICENSED` until the project owner chooses the release model before the first public package publication.
