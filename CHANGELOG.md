# Changelog

All notable changes to Graflume will be recorded here.

## Unreleased

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
