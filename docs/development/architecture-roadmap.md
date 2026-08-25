# Architecture and delivery roadmap

This roadmap converts the 2026-08-25 chart-feature research into versioned
engineering contracts. It is not a claim that every accepted feature is
already executable. Current support is always the intersection of the runtime
registries, semantic tests, and `catalog/graflume.catalog.json`.

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

1. complete the current ordered transform dataflow with named sources,
   branches, reusable DAG execution and worker ownership;
2. complete the current portable encoding and invertible scale registries with
   the remaining geographic/trading channels and shared multi-view axis/legend
   resolve;
3. extend continuous data-domain navigation and analytic selection with
   categorical geometry and linked selection state;
4. extend the current layer/facet/repeat/concat/inset Canvas composition foundation with shared
   multi-view axes/legends, linked state, pagination/virtualization, streaming ownership, and Spatial
   composition;
5. extend the current Canvas-wide semantic index, native mirror, and scoped
   composition identity to GPU and linked multi-view focus;
6. shared label/collision/connector and authoring primitives;
7. extend the current stable-key incremental store and transferable typed-column
   transform adapter with ring-buffer storage, incremental recomputation,
   worker-owned rendering, and Arrow/WASM binary ownership;
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
Named sources and branches may extend the ordered pipeline without changing the
meaning of an existing list. Unsafe string evaluation is never part of the
portable spec.

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
nested grids, and plot-relative inset. Compatible unit children can union their
primary x/y domains while keeping independent axes and legends. Shared
multi-view axes/legends/colorbars, linked stores, pagination/virtualization,
streaming ownership, per-view interactions, and Spatial/WebGL composition remain
open gates and fail explicitly.

### Accessibility and export

All renderers consume the same semantic mark index. Canvas and GPU output must
provide a bounded native HTML mirror; SVG may additionally expose DOM marks.
Keyboard order, focus persistence, selection announcements, live-update
throttling, reduced motion, locale, RTL/CJK, and a user-authored summary are
part of the contract.

Export preserves the normalized spec, current domain, selection/filter state,
annotations, semantic summary, theme identity, locale, and deterministic font
inputs. Raster or GPU fallback never discards this metadata.

## Family completion sequence

Name-to-function correctness is completed before adding aliases:

1. preserve the completed Area/Bar shared series stack and Line curve/missing
   engines while adding named DAG reuse, bounded workers and data-domain
   navigation;
2. add a truthful Map source/layer/projection and provider-backed tile
   lifecycle without weakening the current embedded-basemap attribution;
3. extend the 17 calculated Technical Indicators to the 28 explicitly
   precomputed-only presets, then add session warm-up, panes and crosshair;
4. preserve Motion stable identity/tween/scrubber and the Canvas native
   semantic mirror while adding Table virtualization, cell-grid navigation and
   formatter controls;
5. Distribution, Interval, Hierarchy, Network, Heatmap, Timeline, Map,
   Finance, and vector/spatial high-impact features;
6. Set analysis evolution and bounded proximity/mosaic proofs;
7. diagnostic, model-evaluation, survival, signal, control, genomic,
   atmospheric, and market packages only after their computation contracts are
   independently testable.

The complete per-family P0/P1/P2 backlog and all accepted mode names live in
`catalog/graflume.features.json`; this document intentionally does not duplicate
that machine-readable source.

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
