# Changelog

All notable changes to Graflume will be recorded here.

## Unreleased

- Add a portable four-axis Cartesian system with independently resolved `x`, `x2`, `y`, and `y2` scales; channel-safe `axisId` bindings; declarative number, percent, currency, date, and time formatting; horizontal, vertical, and angled labels; configurable fonts, spacing, strokes, positions, and explicit ticks; reversed scales; secondary-axis tooltip targeting; deep chart/encoding overrides; JSON Schema and runtime validation; and a runnable axis manual while preserving the legacy `title`, `grid`, `tickCount`, `format`, and `labelAngle` forms. The bounded axis compiler, scale, formatting, and renderer additions measure 117.5/202.9 KiB minified for the default/complete bundles, with budgets raised from 97/182 KiB to 120/205 KiB.
- Add the portable `interaction.tooltip.trigger: 'axis'` mode with explicit x/x2/y/y2 selection for ordered charts. Exact mark hits retain priority; other eligible pointer positions resolve the nearest actual datum without interpolation, while existing `tooltip: true` and omitted triggers remain mark-based and structured data events keep exact-hit semantics. Document the pointer-only behavior and accessible table fallback across every generated family guide, and raise the measured minified bundle budgets from 92/176 KiB to 97/182 KiB for the default/complete builds.
- Add opt-in, chart-surface-clamped, text-only hover tooltips with portable chart-specific fields, locale-aware number/date formatting, aggregate-derived values, text-mark hit targets, and area point targets; document the configuration in every generated family Quick API. Raise the default minified bundle budget from 80 KiB to 92 KiB for the native interaction controller while retaining the complete-bundle budget.
- Tighten the Heatmap compiler's default cell spacing to a one-pixel gap with subtle corners, preserving identifiable boundaries while presenting categorical cells as one continuous matrix.
- Expand every consolidated family manual into a visible type gallery with stable per-preset anchors, selection guidance, required fields, and minimal runnable Quick API examples for all 139 family presets; give both declarative adapters the same treatment.
- Merge 114 legacy name-by-name manuals into 37 representative family guides, with functional-difference tables, compiled preset galleries, one compatibility index, and a separate adapter reference.
- Consolidate visually or semantically overlapping names into 37 distinct chart families while retaining all 141 historical names as compatible presets.
- Add explicit family, variant, and mode metadata; resolve all 117 public series identifiers to both a canonical `familyId` and a preserved `variantId`.
- Fold orientation, smoothing, depth, glyph, radius, map layout, financial-body, and 45 indicator differences into discoverable modes instead of separate family cards.
- Regenerate canonical guides, compiled Scene snapshots, and galleries so only distinct families are presented while compatibility APIs continue to compile unchanged.
- Expand the opt-in complete catalog to 141 user-facing families by adding 96 specialized series and mapping the full 117-identifier compatibility surface onto shared canonical implementations.
- Add 32 renderer-neutral mark compilers for range, smooth, distribution, bullet, contour, depth, financial, indicator, geographic, vector, relationship, radial, and text-layout semantics while preserving the 31-family default entrypoint.
- Add a typed specialized-series catalog, Quick APIs for every new family, schema metadata, domain coverage, ESM/browser bundle assertions, and exhaustive compile tests.
- Preserve the 80 KiB default-bundle budget and set a 176 KiB budget for the opt-in complete bundle containing the full resolver catalog.
- Add 96 dedicated manuals, compiled Scene SVG snapshots, and a responsive exact-commit CDN gallery, with deterministic generation and staleness checks in CI.
- Add an opt-in complete catalog entrypoint with Radar, Tree, Graph, Chord, Funnel, Parallel Coordinates, Boxplot, Effect Scatter, Connection Lines, Heatmap, Pictorial Bar, Theme River, Sunburst, and function-free Declarative Custom charts.
- Compile all 14 specialist families into the existing renderer-neutral Scene and Canvas renderer while reusing the established data, scale, theme, interaction, and accessibility contracts.
- Extend portable mark types, specialist domain resolution, package exports, ESM/browser bundles, and schema catalog metadata without changing `ChartSpec 0.1` serialization.
- Add one detailed manual and compiled Scene SVG per specialist family, plus a responsive 14-family complete-bundle gallery.
- Build, size-check, pin, and byte-verify both default and complete browser snapshots through exact-commit CDN URLs and independent SHA-384 integrity values.
- Redesign the default light/dark visual system with a more cohesive categorical palette, quieter axes and grids, improved title spacing, rounded data strokes, outlined points, airier bars, and clearer table styling.
- Render area and stepped-area fills separately from their top strokes so the trend stays crisp without outlining the zero baseline.
- Add percentage-aware pie labels, donut center summaries, gauge ticks and hubs, annotation pills, map surfaces and marker halos, accented organization nodes, curved Sankey bands, and a deterministic two-dimensional treemap layout.
- Regenerate all 31 compiled Scene snapshots and add visual-quality regression coverage for the shared theme and specialist layouts.
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
