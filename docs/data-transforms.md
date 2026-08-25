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

## Provenance

`executeTransforms(data, transforms, { sourceId })` can run the dataflow independently. It returns derived rows and a lineage sidecar with per-step input/output counts, a JSON-safe snapshot of the declared transform parameters, the effective sample seed, aggregate/joinaggregate/stack group count, and the contributing source-row indices for each output row. Dates become ISO strings and typed arrays become ordinary arrays in the parameter snapshot. `compile()` exposes the same sidecars as `result.dataLineage`; each layer summary is also included in Scene metadata and the accessible description when transforms ran.

Lineage is descriptive provenance, not an inverse transform or a security boundary. Empty `sources` on an imputed row means that the row was created by the dataflow rather than copied from one source record.

## Determinism and limits

Ordered transforms are synchronous and run on the main thread. Stable sorting preserves source order for equal values. Sampling uses an explicit deterministic pseudo-random generator and defaults to seed `0`. Runtime validation limits a pipeline to 128 transforms, expression depth to 32, and field/output collections to bounded sizes.

For very large data, pre-aggregate upstream or use a future worker/streaming execution profile. This release does not claim named-node DAG caching, worker execution, binary interchange, geographic transforms, nonlinear regression, density contour extraction, or inverse lineage.
