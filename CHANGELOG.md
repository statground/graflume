# Changelog

All notable changes to Graflume will be recorded here.

## Unreleased

- Expand the public catalog to 31 user-facing chart types and compatibility APIs backed by 27 canonical marks or layers.
- Add portable named mark fields and function-free JSON mark options for OHLC, interval, hierarchy, flow, size, date-range, frame, and adapter channels.
- Add Canvas Scene compilers for bubble, calendar, candlestick, diff, Gantt, gauge, geo, histogram, interval, map, motion, organization, pie/donut, Sankey, stepped area, table, timeline, treemap, trendline, waterfall, word tree, annotation, and a safe Vega mark subset.
- Add horizontal categorical y scales, horizontal bars, specialist domain resolution, and whole-polygon hit testing.
- Add a standalone 31-type exact-commit CDN gallery, one detailed guide and compiled visual snapshot per chart, and exhaustive catalog/compile regression tests.
- Restore a clean repository-wide Prettier gate and exclude the generated CDN bundle from source formatting.
- Add reproducible visual snapshots of the implemented output to every chart-specific guide.
- Add detailed, chart-specific guides for bar, line, area, scatter, and shared-scale combination charts.
- Add dedicated line, area, scatter, and mixed-composition chart examples in a responsive chart-type gallery.
- Add `scatter()` as a chart-oriented quick API alias for the portable `point` mark.
- Add regression coverage for line, area, scatter, and mixed chart scene output.
- Extend exact-commit CDN pinning and SRI updates to the standalone chart-type gallery.
- Add dedicated single-series and grouped bar chart examples.
- Add regression coverage for styled, negative-value, and grouped bar rendering.
- Add a reproducible browser snapshot workflow that pins the downloadable jsDelivr example to an exact bundle commit with SHA-384 Subresource Integrity.

## 0.1.0-alpha.0 - 2026-08-19

- Establish the portable `ChartSpec 0.1` contract and JSON Schema.
- Add Canvas-first scene rendering for line, bar, point, and area marks.
- Add shared-scale layer composition, light/dark themes, and plugin registries.
- Add row and zero-copy columnar data ingestion with bounded large-data sampling.
- Add responsive chart instances, structured pointer events, export, tests, and CDN builds.
