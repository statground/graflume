# Scales and encodings

Graflume exposes a function-free scale registry and a canonical `encoding` map while preserving the
original `x`/`y` facade. Both forms serialize as `ChartSpec 0.1`; use one form per chart or layer,
never both.

## Canonical encoding map

```js
Graflume.compile({
  data: [
    { category: 'A', value: 4, group: 'control' },
    { category: 'B', value: 9, group: 'treated' },
  ],
  mark: 'point',
  encoding: {
    x: { field: 'category', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative', scale: { type: 'sqrt' } },
    color: { field: 'group', type: 'nominal' },
    radius: { field: 'value', type: 'quantitative', scale: { range: [3, 14] } },
    shape: { field: 'group', type: 'nominal' },
    opacity: {
      value: 0.55,
      condition: {
        test: {
          op: 'greaterThan',
          left: { op: 'field', field: 'value' },
          right: { op: 'literal', value: 5 },
        },
        value: 1,
      },
    },
    tooltip: 'group',
  },
});
```

Conditions use the same closed expression tree as dataflow filters and calculations. A conditional
`value` is a literal visual value; a conditional `field` is passed through the channel scale. There
are no executable callbacks. Conditional Cartesian positions are not implemented: use a `calculate`
transform to materialize the desired field first.

The precedence is deterministic: a resolved channel value wins over an explicit mark property,
which wins over the active theme. If a channel is absent, existing mark and theme behavior is
unchanged.

## Implemented channel boundary

| Mark               | Implemented optional channels                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Point / scatter    | `color`, `fill`, `stroke`, `size`, `radius`, `shape`, `opacity`, `strokeWidth`, `strokeDash`, `text`, `order`, `tooltip`                       |
| Bar                | `x2`, `y2`, `color`, `fill`, `stroke`, `opacity`, `strokeWidth`, `strokeDash`, `order`, `tooltip`                                              |
| Line               | `color`, `stroke`, `opacity`, `strokeWidth`, `strokeDash`, `order`, `detail`; point-only size/fill/tooltip channels require `mark.point: true` |
| Area, stepped area | `y2`, `color`, `fill`, `stroke`, `opacity`, `strokeWidth`, `strokeDash`, `order`, `detail`; point-only channels require `mark.point: true`     |
| Heatmap            | `x2`, `y2`, `color`, `fill`, `stroke`, `opacity`, `strokeWidth`, `strokeDash`, `text`, `order`, `tooltip`                                      |

Runtime validation rejects a channel outside this matrix. It does not silently ignore shape, text,
or range requests on another mark. `shape` currently has a closed Canvas registry: `circle`,
`square`, `diamond`, `triangle`, and `cross`. `shape`, `strokeDash`, `text`, `order`, `detail`, and
`tooltip` consume raw values or a closed registry and therefore reject authored `scale` objects.

In the encoding map, `x2` and `y2` are per-datum range endpoints that share the primary position
scale. They are different from `axisId: 'x2'` and `axisId: 'y2'`, which bind a legacy `x` or `y`
encoding to an independent top or right axis. Layout owns Cartesian pixel ranges, so an authored
`scale.range` is rejected on `x`, `x2`, `y`, and `y2`.

`detail` and row-driven line/area styles form stable series groups before curve interpolation.
`order` performs a stable row ordering inside the compiled layer. This is an opt-in semantic change;
source data is not mutated.

Series-stack Bar and Area layouts consume the same implemented style, order, detail, point, and
tooltip channels. Stack geometry owns its interval boundaries, so Bar `x2`/`y2` and Area `y2` are
rejected when a stack layout is active rather than silently replacing one of the two contracts.

## Position scale registry

`createPositionScale(scaleSpec, { domain, range, type })` returns an immutable descriptor plus
`map()`, `ticks()`, and `invert()` when the mapping has a single-valued inverse.

| Type               | Domain and mapping                                                  |
| ------------------ | ------------------------------------------------------------------- |
| `linear`           | Affine numeric mapping                                              |
| `log`              | Positive values only; configurable positive `base` other than 1     |
| `symlog`           | Signed `log1p` mapping with positive `constant`                     |
| `asinh`            | Signed inverse-hyperbolic mapping with positive `constant`          |
| `pow` / `sqrt`     | Sign-preserving power mapping; `pow` requires a positive `exponent` |
| `time`             | Epoch or parseable timestamp mapping; ticks use the host local zone |
| `utc`              | Epoch or parseable timestamp mapping; ticks are formatted in UTC    |
| `probability`      | Linear probability domain constrained to `[0, 1]`                   |
| `logit` / `probit` | Probability domain strictly inside `(0, 1)`                         |
| `band` / `point`   | Named categorical positions; no numeric inverse                     |
| `ordinal`          | Named or scalar domain lookup into explicit numeric range entries   |
| `quantile`         | Type-7 sample quantiles select discrete numeric range entries       |
| `quantize`         | A two-endpoint numeric domain is divided into equal, clamped bins   |
| `threshold`        | One or more ascending thresholds select one additional range entry  |

An omitted scale type on a temporal Cartesian encoding resolves to `utc`. This portable default
keeps date ticks and generated output identical across browser, server, and CI time zones. Request
`scale: { type: 'time' }` explicitly when the host's civil-time zone is the intended contract.

Cartesian axes currently accept the continuous families above plus `band` and `point`. `ordinal`,
`quantile`, `quantize`, and `threshold` are available to the standalone registry and compatible
non-axis visual channels; they are rejected as Cartesian axis scales instead of being approximated.

`descriptor.reverse` records the authored `reverse` flag. `descriptor.rangeDirection` separately
records whether the effective numeric range ascends or descends, so a normal y-axis does not falsely
claim that the author requested reversal. Descriptor domain and range arrays are frozen copies.

## Color scale registry

`createColorScale()` is deliberately separate because string color ranges cannot satisfy the
numeric `Scale` contract.

| Type         | Behavior                                                        |
| ------------ | --------------------------------------------------------------- |
| `ordinal`    | Category-to-color lookup                                        |
| `sequential` | Two-endpoint numeric domain interpolated through 2+ color stops |
| `diverging`  | Three ascending domain points and 3+ colors with a center       |
| `cyclic`     | Two-endpoint numeric period; 2+ colors interpolate through wrap |

Encoding channels also allow a transformed numeric scale such as `log` or `symlog` with the active
theme's sequential palette. An explicit color range requires `ordinal`, `sequential`, `diverging`,
or `cyclic` so the request is never silently discarded.

## Out-of-bounds policy

`outOfBounds` is explicit:

- `extrapolate` extends a continuous numeric mapping.
- `clamp` (statistical “squish”) pins it to the nearest endpoint.
- `error` raises a typed data error.
- `unknown` (statistical “censor”) returns `NaN` for positions or `transparent` for colors.

The legacy `clamp: true` spelling remains available, but cannot be combined with `outOfBounds`.
Band, point, and ordinal scales accept only `error` or `unknown` for unseen categories. Quantize
defaults to endpoint bins (`clamp`) and can explicitly use `error` or `unknown`. Quantile and
threshold scales define bins rather than a bounded extrapolation interval. Cyclic color scales
always report `wrap`. Color extrapolation is rejected because RGB output is bounded; use `clamp`,
`error`, or `unknown`.

Mathematical domain failures are never coerced. In particular, zero or negative log domains and the
closed endpoints of logit/probit domains fail validation and construction.

Inputs outside a scale's mathematical support cannot use `extrapolate`: the runtime raises a typed
data error. An explicit `clamp` maps them to the nearest valid authored endpoint, while `unknown`
censors them. This applies to non-positive log inputs, values outside `[0, 1]` for probability, and
the closed endpoints or exterior of `(0, 1)` for logit/probit.

## Interaction coordinate contract

Every compiled Cartesian result exposes `coordinates: { plot, axes }`, using the exact immutable
scale instances that produced its Scene. The public `domainToPixel()` and `pixelToDomain()` helpers,
and the same methods on `Chart`, clamp pointer input to the resolved scale range and preserve
authored reversal independently from the layout's normal descending y range. Linear, transformed,
probability, and temporal scales use their real inverse. Time and UTC both serialize selection
coordinates as epoch numbers; their timezone difference remains a tick-formatting policy.

Band and point scales have no single-valued continuous inverse. Point lookup therefore selects the
nearest authored category, while interval, rectangle, axis, lasso, and data-domain navigation reject
them. Ordinal, quantile, quantize, and threshold ranges are also rejected for geometric inversion.
This boundary prevents a discrete bin or category from being presented as a continuous domain.

Domain navigation stores normalized authored-domain windows rather than transformed data values.
The compiler converts each window through the base scale inverse before rebuilding marks and axes,
so log, symlog, asinh, power, probability, logit, probit, time, and UTC zoom preserve their actual
mathematics. Windows are finite, ordered, clamped to `0..1`, and bounded by `maxZoom`.

## Current limits

The portable map does not yet claim icon/image glyphs, angular `theta` channels, geographic
longitude/latitude channels, nested facet channels, gradients, color-space selection, or
selection-driven conditional predicates. These remain planned registry extensions. Scale and
encoding resolution is synchronous and cached once per mark compilation; it does not yet share
domain caches across charts or workers. Analytic state can be serialized and shared by a host, but
Graflume does not yet link multiple chart instances or apply selection predicates as data transforms.

Regression coverage lives in `tests/scale-encoding.test.mjs` and
`tests/analytic-interaction.test.mjs`, with legacy scale checks in
`tests/scale.test.mjs` and family-specific rendering tests alongside each mark.
