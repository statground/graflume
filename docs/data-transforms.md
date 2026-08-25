# Ordered data transforms

Graflume `ChartSpec 0.1` supports an optional, function-free `transform` array at chart and layer level. Chart transforms run first for every layer; layer transforms then run in declaration order. The derived rows feed type inference, domains, marks, tooltips, legends, hit testing, and accessibility rather than forming a display-only side path.

```js
const spec = {
  data: rawRows,
  transform: [
    {
      type: 'filter',
      expr: {
        op: 'greaterThan',
        left: { op: 'field', field: 'amount' },
        right: { op: 'literal', value: 0 },
      },
    },
  ],
  layers: [
    {
      mark: 'bar',
      x: 'category',
      y: 'total',
      transform: [
        {
          type: 'aggregate',
          groupby: ['category'],
          fields: [{ op: 'sum', field: 'amount', as: 'total' }],
        },
      ],
    },
  ],
};
```

## Supported transforms

- Row and field operations: `filter`, stable `sort`, `calculate`, `fold`, `flatten`, `lookup`, `pivot`, and `impute`.
- Summaries: `aggregate`, `joinaggregate`, weighted mean, `quantile`, and linear `regression`.
- Statistical preparation: one- and two-dimensional `bin` plus deterministic Gaussian `density1d` and `density2d` grids. `density1d` shares the Distribution family's robust Silverman bandwidth and weight-normalized Gaussian kernel calculation; an explicit positive bandwidth remains authoritative.
- Series preparation: `stack`, `window`, seeded reservoir `sample`, numeric or temporal `resample`, and `timeUnit`.

`calculate` and `filter` use a closed expression AST. JavaScript functions, expression strings, dynamic property access, prototype keys, non-finite numeric literals, and unknown transform properties are rejected. This keeps specs JSON-serializable and safe to persist or exchange.

`stack` supports diverging positive/negative accumulation. `zero` keeps separate cursors around zero; `normalize` (alias `expand`) divides signed widths by the bucket's total absolute magnitude; `center` (alias `silhouette`) centers the complete signed extent; and `wiggle` computes a slope-minimizing streamgraph baseline across ordered groups. `wiggle` requires non-negative input and fails explicitly for diverging data. `order` can use input order, whole-series sums, or `insideOut`, which balances series by peak appearance and total weight for streamgraphs. The lineage step repeats the mixed-sign normalization denominator or wiggle input restriction so downstream accessibility/export tooling does not have to infer it.

`density2d` evaluates a bounded rectangular Gaussian kernel-density grid; it does not produce contour geometry. `regression` is linear only. `resample` supports fixed numeric intervals with `linear`, `previous`, or `next` fill; calendar-aware intervals are intentionally left to `timeUnit` plus authored data preparation. Local-time `timeUnit` is available with `utc: false`, but UTC is the deterministic default.

## Named sources and reusable branches

A chart can declare one closed `dataflow` graph and address its materialized outputs with `source`.
Each node names exactly one source or earlier/later node and applies the same validated ordered
`transform` list used by a chart or layer. Node declaration order is not execution order: dependencies
are resolved topologically, cycles and unknown names fail before compilation, and a shared ancestor is
computed once per graph instance.

```js
const spec = {
  dataflow: {
    sources: { observations: rawRows },
    nodes: [
      {
        id: 'included',
        source: 'observations',
        transform: [
          {
            type: 'filter',
            expr: {
              op: 'greaterThan',
              left: { op: 'field', field: 'amount' },
              right: { op: 'literal', value: 0 },
            },
          },
        ],
      },
      {
        id: 'categoryTotals',
        source: 'included',
        transform: [
          {
            type: 'aggregate',
            groupby: ['category'],
            fields: [{ op: 'sum', field: 'amount', as: 'total' }],
          },
        ],
      },
    ],
  },
  hconcat: [
    { source: 'included', mark: 'point', x: 'date', y: 'amount' },
    { source: 'categoryTotals', mark: 'bar', x: 'category', y: 'total' },
  ],
};
```

`source` is available on chart nodes and flat layers and is mutually exclusive with inline `data` at
that node. A composition child inherits its enclosing graph; a nested `dataflow` deliberately opens a
new local scope. `createTransformDataflow()` exposes the same executor for hosts that need to resolve
several outputs, inspect `executionOrder` and `cacheHits`, or clear and reuse the graph cache.

## Provenance

`executeTransforms(data, transforms, { sourceId })` can run one ordered pipeline independently. `executeTransformDataflow()` runs named graph targets. Both return derived rows and a lineage sidecar with per-step input/output counts, a JSON-safe snapshot of the declared transform parameters, the effective sample seed, aggregate/joinaggregate/stack group count, and the contributing source-row indices for each output row. Dates become ISO strings and typed arrays become ordinary arrays in the parameter snapshot. Named branches remap their row contributors through every ancestor rather than resetting at a branch boundary. `compile()` exposes the same sidecars as `result.dataLineage`; composition and facet scoping retain the original named-source row identity, and each layer summary is also included in Scene metadata and the accessible description when transforms ran.

Lineage is descriptive provenance, not an inverse transform or a security boundary. Empty `sources` on an imputed row means that the row was created by the dataflow rather than copied from one source record.

## Determinism and limits

Named-DAG execution is synchronous. Stable sorting preserves source order for equal values. Sampling uses an explicit deterministic pseudo-random generator and defaults to seed `0`. Runtime validation limits a graph to 128 named sources and 256 nodes, a pipeline to 128 transforms, expression depth to 32, and field/output collections to bounded sizes. Names are non-empty, bounded, and reject prototype keys; the graph cache contains copied row outputs for one executor or chart materialization.

For very large data, pre-aggregate upstream or use the bounded incremental/worker facilities described by the runtime guide. Named graphs do not imply distributed scheduling or cross-chart cache sharing. This release does not claim geographic transforms, nonlinear regression, density contour extraction, or inverse lineage.
