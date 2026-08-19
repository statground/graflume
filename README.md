# Graflume

Graflume is an experimental, CDN-first visualization engine built around a portable chart specification, composable layers, a renderer boundary, and a data pipeline that can grow from ordinary dashboards to large-data rendering.

> Status: `0.1.0-alpha.0`. The public contracts are intentionally small and versioned, but they are not stable yet.

## What already works

- `line`, `bar`, `point`, and `area` marks
- mixed layers such as bar + line + points on shared axes
- row-oriented data and zero-copy `TypedArray` columnar input
- a versioned, function-free `ChartSpec 0.1` plus JSON Schema for portable JSON data
- runtime validation and canonical normalization
- Canvas 2D rendering behind a renderer interface
- light/dark design-token themes and custom theme registration
- custom mark, renderer, and theme plugins
- responsive chart instances, pointer hit testing, safe data events, and image export
- standard/large/ultra performance profiles with bounded line, point, and bar rendering
- a DOM-free `compile()` path for wrappers, SSR pipelines, testing, and future language bindings

WebGL/WebGPU renderers, workers, Arrow/WASM ingestion, statistical transforms, multi-view dashboards, maps, 3D, and Python/R/Java wrappers are planned rather than claimed as complete.

## Local development

```bash
npm install
npm run check
```

Build outputs:

```text
dist/graflume.js          ESM
dist/graflume.global.js   readable browser global
dist/graflume.min.js      minified CDN bundle
dist/index.d.ts            TypeScript declarations
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

For pre-npm alpha testing, the repository also maintains a source-controlled browser snapshot at `cdn/graflume.global.js`. The snapshot workflow builds the library, commits the browser bundle, then rewrites the downloadable example to an exact Git commit URL with SHA-384 Subresource Integrity. Moving aliases such as `@main` and `@latest` are not used.

## Bar chart examples

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
    mark: { fill: '#2563eb', cornerRadius: 8 },
  });
</script>
```

Runnable examples:

- [`examples/bar/index.html`](examples/bar/index.html): local single-series bar chart using the committed browser snapshot
- [`examples/cdn/bar-chart.html`](examples/cdn/bar-chart.html): standalone grouped bar chart that can be downloaded and opened directly; it uses an exact jsDelivr commit pin and SRI

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
