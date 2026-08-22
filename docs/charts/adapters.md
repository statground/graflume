# Declarative adapters

Adapters translate a constrained external or custom declarative shape into Graflume's portable specification. They are compatibility surfaces, not additional chart families, so they do not appear in the 37-family discovery catalog.

| Adapter                  | Quick API     | Portable mark | Contract                                                              |
| ------------------------ | ------------- | ------------- | --------------------------------------------------------------------- |
| Portable adapter chart   | `vegaChart()` | `vega`        | Translates the supported function-free embedded mark subset.          |
| Declarative custom chart | `custom()`    | `custom`      | Builds row-level declarative primitives without executable callbacks. |

Both adapters reject executable callbacks and enter the ordinary validation, Scene compilation, rendering, interaction, and accessibility pipeline. Prefer a representative family Quick API when the data meaning already matches one of the [37 chart families](./README.md#choose-a-chart).

## Embedded mark adapter

`vegaChart()` accepts the documented safe mark subset under `mark.options.mark`. It is intended for migration of function-free line, area, bar, or point declarations; arbitrary transforms, expressions, signals, and remote loading are outside the portable contract.

## Declarative primitive adapter

`custom()` maps row fields such as shape, size, and label to built-in portable primitives. It does not execute a per-row rendering function or permit raw HTML.

## Verification

- Compiled snapshots: [embedded mark](../assets/charts/vega.svg) and [declarative primitives](../assets/charts/custom.svg)
- Runtime catalog: [`src/catalog`](../../src/catalog)
- Catalog tests: [`tests`](../../tests)

[Back to chart guides](./README.md)
