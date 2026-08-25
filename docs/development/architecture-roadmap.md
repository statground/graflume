# Architecture and delivery roadmap

This roadmap converts the 2026-08-25 chart-feature research into versioned
engineering contracts. It is not a claim that every accepted feature is
already executable. Current support is always the intersection of the runtime
registries, semantic tests, and `catalog/graflume.catalog.json`.

## 2026-08-26 completion boundary

The `current-limitations-2026-08-26` release completes all 161/161 capabilities that
were previously listed as P0/current limitations across the 44 canonical
families. All seven common foundations and all 44 family rows are now
`supported`; their P0 arrays are empty. The exact 161 capability strings and
their implementation and test paths are retained in
`catalog/graflume.current-limitations.evidence.json` and checked against the
feature catalog. The catalog still keeps P1/P2 evolution and all 16 candidate
families/packages conservative—completion of the old current boundary is not a
blanket claim for those separate research contracts.

This boundary retains 44 family cards while adding `kagi()`,
`threeLineBreak()`, and `rangeBars()` as three executable modes of Price blocks.
It therefore exposes 168 Canvas presets and 176 total presets/modes, alongside
120 compatibility identifiers and the existing 17 built-in themes.

## Three independent layers

Graflume keeps these concerns orthogonal:

1. **Theme** controls visual tokens and defaults: palette, typography,
   background, axes, grid, legends, tooltips, annotations, and motion style.
2. **Capability profile** selects renderer, interaction, accessibility, data,
   and performance behavior. The accepted neutral profiles are `print`,
   `dashboard`, `realtime`, `dense-data`, `accessible`, `geo`, and `spatial`.
3. **Family mode or recipe** owns data meaning, transforms, layout, and the
   semantic invariants of a chart.

External library names are research provenance, not public neutral theme or API
IDs. The accepted neutral theme families are executable visual profiles in the
ordered `builtInThemeCatalog`; their audited vocabulary remains recorded in
`catalog/graflume.features.json`. They do not enable capabilities or family
semantics.

## Dependency order

The implementation graph is deliberately ordered so that one foundation can
unlock many families:

1. preserve the completed named-source, branched, memoized transform DAG and
   extend its bounded worker ownership where a runtime profile requires it;
2. preserve the completed geographic/trading/angular/icon channels and direct
   Canvas multi-view axis/legend/colorbar resolution while extending renderer
   and nested-composition parity;
3. extend continuous data-domain navigation and analytic selection with
   categorical geometry and linked selection state;
4. extend the current layer/facet/repeat/concat/inset Canvas composition foundation with linked
   state, pagination/virtualization, streaming ownership, nested shared-guide parity, and Spatial
   composition;
5. preserve the completed Canvas virtual semantic explorer, GPU projected
   traversal, and bounded stable-key linked Canvas/Spatial focus foundation;
6. preserve the completed Canvas mark-label/collision/connector and authoring
   foundation while routing future composed-view and renderer-specific ownership explicitly;
7. preserve the completed ring-backed stable-key store, incremental transform
   cache, frame runtime, and automatic Worker v2 adapter/rendering foundation;
8. family-specific semantic completion;
9. optional analytic and scientific packages.

A later stage may depend on an earlier stage, but it must not silently emulate
an unavailable capability. It returns a typed validation issue, a documented
fallback, or an explicit unsupported-capability error.

## Delivery gates

Each status in the feature source has an observable gate:

| Status      | Required evidence                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `research`  | A bounded data/computation contract and a decision owner are recorded.                                                                     |
| `planned`   | The contract, dependencies, compatibility policy, and semantic tests are designed.                                                         |
| `partial`   | An executable subset exists; every excluded semantic is named as a limitation.                                                             |
| `supported` | Runtime implementation, public types/schema, semantic tests, manual, representative sample, accessibility fallback, and catalog all agree. |

Promotion is one-way within a release. A regression that invalidates a
supported contract requires either a fix before release or a documented
deprecation with a compatibility window.

## Common contract definitions

### Transform dataflow

Transforms are ordered, deterministic, function-free, and JSON serializable.
Every result carries source identity and an ordered lineage containing method,
parameters, seed when applicable, input/output counts, and aggregation count.
Named sources and branches extend the ordered pipeline without changing the
meaning of an existing list. Dependencies are closed and acyclic, shared
ancestors are memoized, and lineage remains attached across composition and
facet boundaries. Unsafe string evaluation is never part of the portable spec.

### Encoding and scales

Position, color, fill, stroke, size, radius, shape, symbol, icon, opacity,
stroke width/dash, text, angle/theta, longitude/latitude, order, detail,
tooltip, and condition are independent channels. The legacy `x`/`y` facade is
preserved while canonical normalized layers use the common encoding map.

Scales expose domain, range, forward mapping, inversion where mathematically
defined, ticks, clamping/out-of-bounds policy, and a serializable descriptor.
Specialized Smith, ternary, geographic, and trading-time coordinates adapt the
same contract rather than creating unrelated scale semantics.

### Interaction and composition

Inspection zoom remains a display magnifier. Analytic navigation changes data
domains and round-trips pixel and domain coordinates. Selection state has a
stable identifier, projection, resolve rule, operation, serializable value, and
keyboard-equivalent transition. Cross-highlight and cross-filter are distinct.

Composition owns layout and scale/axis/legend/colorbar resolution. Child specs
retain their semantic identity so that linked state, export, and accessibility
can address a facet or inset without parsing generated scene IDs.

The current executable subset is a closed Canvas grammar for layer, observed
row/column or wrap facet, explicit repeat, horizontal/vertical/wrapped concat,
nested grids, and plot-relative inset. Compatible direct unit children can
union all active x/x2/y/y2 domains, keep only labeled outer axes, and render one
shared categorical/layer legend or continuous colorbar with optional root-level
filtering. Bounded linked view/focus state and direct-view shared guides are
current. Nested shared-guide ownership, generalized cross-filter routing,
facet pagination/virtualization, streaming ownership, per-view interactions,
and Spatial/WebGL composition remain later contracts and fail explicitly.

### Mark-label layout and authoring

All canonical Canvas families share one function-free `markLabels` contract.
The compiler resolves bounded semantic datum geometry, stable-key portable
targets, automatic collision placement and connectors; the Scene exposes
selected editing handles without duplicating semantic data rows. Runtime state
owns pointer drag, keyboard selection and nudging, grid/mark/plot snapping,
bounded undo/redo, import/export of portable positions, lifecycle events, and
accessible instructions/live status. Top-level annotation callouts keep their
existing target, placement, CRUD, and visibility semantics.

The supported boundary is the 41 Canvas families. Composed-view interaction
routing and Spatial/WebGL label authoring require their own explicit ownership
contracts; they are not silently inferred from this two-dimensional Scene
foundation.

### Accessibility and export

All renderers consume the same semantic mark index. Canvas and GPU output must
provide a bounded native HTML mirror; SVG may additionally expose DOM marks.
Keyboard order, focus persistence, selection announcements, live-update
throttling, reduced motion, locale, RTL/CJK, and a user-authored summary are
part of the contract.

Export preserves the normalized spec, current domain, selection/filter state,
annotations, semantic summary, theme identity, locale, and deterministic font
inputs. Raster or GPU fallback never discards this metadata.

## Post-completion evolution sequence

The 161-item current boundary is complete. Further work preserves its
name-to-function contracts and advances the separately listed P1/P2 and
candidate scopes in this order:

1. preserve the completed Area/Bar shared series stack, Line curve/missing
   engines, named DAG reuse, bounded workers, and data-domain navigation;
2. extend the completed Map source/layer/projection and provider-backed tile
   lifecycle without weakening embedded-basemap or provider attribution;
3. preserve all 45 built-in Technical Indicator calculations, their
   session-aware warm-up/reset policy, panel metadata, synchronized crosshair,
   and bounded incremental Worker execution;
4. preserve Motion stable identity/tween/scrubber and the Canvas native
   semantic mirror together with completed Table virtualization, cell-grid
   navigation, and formatter controls;
5. advance the documented P1/P2 scopes for Distribution, Interval, Hierarchy,
   Network, Heatmap, Timeline, Map, Finance, and vector/spatial families;
6. Set analysis evolution and bounded proximity/mosaic proofs;
7. diagnostic, model-evaluation, survival, signal, control, genomic,
   atmospheric, and market packages only after their computation contracts are
   independently testable.

The now-empty per-family P0 arrays, remaining P1/P2 roadmap, and all accepted
mode names live in `catalog/graflume.features.json`. The historical 161-item
closure and exact source/test mappings live in
`catalog/graflume.current-limitations.evidence.json`; this document intentionally
does not duplicate either machine-readable source.

## Release and downstream synchronization

1. Build and run all type, semantic, snapshot, documentation, catalog, and
   bundle-budget checks.
2. Publish Graflume and obtain the immutable commit SHA.
3. Verify exact jsDelivr bundle bytes and integrity metadata at that SHA.
4. Import `catalog/graflume.catalog.json` into each downstream site with strict
   schema, count, identifier, and source-SHA validation.
5. Generate user-facing current-support pages from that manifest. Research and
   planned entries remain in the upstream roadmap and are never presented as
   supported runtime behavior.

This order prevents a source push, a CDN cache, a documentation deployment, and
a production rollout from being mistaken for the same event.
