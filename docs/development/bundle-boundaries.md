# Bundle boundaries and size budgets

## SVG and completed-chart snapshots

The 2026-09-05 build adds native SVG rendering, canonical resource-free SVG serialization,
bounded SVG vector import, and versioned Scene snapshot restoration to the default and complete
entries. The increase over the scoped-geography baseline is 22,733 / 22,752 / 0 raw bytes.
The existing Rollup graph guard and built-module verification still pass; Spatial remains
independent, and no API or required code is hidden in an uncounted runtime chunk.

| Browser file               |    Raw minified | Gzip level 9, no timestamp |                  Raw budget |  Headroom |
| -------------------------- | --------------: | -------------------------: | --------------------------: | --------: |
| `graflume.min.js`          | 1,233,375 bytes |              360,123 bytes | 1,205 KiB (1,233,920 bytes) | 545 bytes |
| `graflume.complete.min.js` | 1,431,388 bytes |              417,579 bytes | 1,398 KiB (1,431,552 bytes) | 164 bytes |
| `graflume.spatial.min.js`  |   397,648 bytes |              124,022 bytes |     389 KiB (398,336 bytes) | 688 bytes |

Each ceiling remains the next whole KiB. Snapshot and import limits apply to individual chart
payloads and do not replace these bundle budgets. Browser regression coverage is available in
`tests/browser/svg-snapshot.html` after building the distribution.

Graflume publishes three independent browser/module entry points. Bundle size is a release
contract, but a passing byte limit must not be obtained by silently removing a documented public
API or by moving required bytes into an uncounted runtime chunk.

| Entry point         | Owns                                                                                                               | Must not import                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `graflume`          | the 22 default Canvas families, shared public foundations, Canvas rendering, and the hybrid scatter WebGL renderer | complete-only catalogs/compilers and `src/spatial/*`                    |
| `graflume/complete` | the default surface plus the 19 opt-in Canvas families                                                             | `src/spatial/*`                                                         |
| `graflume/spatial`  | the independent Spatial/WebGL runtime and the Map globe mode                                                       | Canvas Quick API, compiler, mark, runtime, and renderer implementations |

`rollup.config.mjs` enforces these boundaries against modules that contribute rendered bytes to an
output chunk. It intentionally checks rendered modules instead of every parsed module: Rollup may
parse a shared source file and then remove every byte from it. `scripts/check-built-bundles.mjs`
also checks the positive shared API surface and the negative entry-specific API surface in both
ES modules and browser globals.

## 2026-08-26 limitation-completion audit

The import-graph audit found no Spatial implementation in the default or complete outputs and no
Canvas application/compiler implementation in the Spatial output. The complete output had only
the expected additional rendered modules beyond the default graph: the additional and series
catalogs, finance and field analytics/compilers, the runtime capability catalog, and the complete
entry module itself.

Some source modules are intentionally shared across the default and complete graphs. For example,
the default Distribution family uses the boxplot, empirical-distribution, and kernel-density
implementations that live in modules which also contain complete-only compilers. Rollup retains
only the reachable functions: during this audit, `marks/analytical-p0.ts` contributed about 19 KiB
of unminified code to the default graph and about 83 KiB to the complete graph, while
`marks/relationship-advanced.ts` contributed about 15 KiB and 67 KiB respectively. Treating a
parsed module name as leakage would therefore be inaccurate; rendered contribution is the relevant
boundary.

The embedded Natural Earth snapshot is also intentional in both Canvas and Spatial. Canvas Map
uses it for the provider-free basemap, and Spatial uses the same source for the globe. It is not a
Canvas-runtime dependency leaking into Spatial.

The new shared dataflow, bounded streaming/worker, map lifecycle, semantic interaction, public
analytics, validation, and runtime authoring APIs remain exported from `graflume` and inherited by
`graflume/complete`. Removing those exports would make the limitation implementation inaccessible
and is not an acceptable size optimization.

The final clean measurement after the last compiler/runtime behavior audit was:

| Browser file               |    Raw minified | GNU gzip `-9` |                  Raw budget |    Headroom |
| -------------------------- | --------------: | ------------: | --------------------------: | ----------: |
| `graflume.min.js`          | 1,062,342 bytes | 307,107 bytes | 1,038 KiB (1,062,912 bytes) |   570 bytes |
| `graflume.complete.min.js` | 1,258,519 bytes | 363,158 bytes | 1,230 KiB (1,259,520 bytes) | 1,001 bytes |
| `graflume.spatial.min.js`  |   343,846 bytes | 106,749 bytes |     336 KiB (344,064 bytes) |   218 bytes |

The default and complete increases over the preceding 610/715 KiB limits are the reachable cost of
the newly public limitation-completion behavior, including the final gapless trading scale,
discontinuity-aware difference compiler, hierarchy/table runtime state, orthographic horizon
clipping, orthogonal multiedge routing, and suffix-only incremental indicator engine. They are not
complete/Spatial cross-entry leakage. The Spatial increase from 294 KiB is its own
surface/volume/vector analysis, semantic navigation, and rendering behavior. A
`moduleSideEffects: false` Rollup setting now makes the existing `package.json` contract explicit;
the measured output was unchanged because Rollup had already removed the unreachable modules.

## Budget method

`scripts/check-bundle-size.mjs` gates the raw minified browser files produced by the same build that
is published to the CDN. Budgets are set only after a clean bundle and minify pass, rounded to a
whole KiB with less than 3 KiB of headroom. Raw size remains the hard gate; gzip size is recorded as
transfer context and never used to hide growth. Source maps and any hypothetical lazy chunks do not
substitute for counting required runtime bytes.

## 2026-08-27 adaptive and demo-recipe audit

The 23-profile adaptive registry is intentionally shared by Canvas and Spatial so both renderers
resolve the same environment capabilities. The closed demo-recipe v2 engine is also public from all
three entry points: the default and complete Canvas runtimes use it for every family, while the
independent Spatial runtime uses the same deterministic contract for surface, volume, and vector
examples. The graph-boundary checks continue to reject Canvas implementation leakage into Spatial
and Spatial implementation leakage into the Canvas entry points.

The clean measured artifacts are:

| Browser file               |    Raw minified | GNU gzip `-9` |                  Raw budget |  Headroom |
| -------------------------- | --------------: | ------------: | --------------------------: | --------: |
| `graflume.min.js`          | 1,113,017 bytes | 323,645 bytes | 1,087 KiB (1,113,088 bytes) |  71 bytes |
| `graflume.complete.min.js` | 1,309,365 bytes | 380,004 bytes | 1,279 KiB (1,309,696 bytes) | 331 bytes |
| `graflume.spatial.min.js`  |   390,590 bytes | 121,663 bytes |     382 KiB (391,168 bytes) | 578 bytes |

The increase is reachable product behavior: deterministic family-aware level-of-detail generation,
closed recipe validation, compact previews, named accounts, initiatives, regions, milestones and
spatial flows, explicit data plans, and capability-driven layout, input, motion, color, and resource
policies. These APIs are documented and consumed by the public Statground manuals, so removing them
from an entry point or hiding them in an uncounted chunk would break the published contract.

## 2026-08-27 row-cardinality, area-topology, and bar-band audit

The follow-up row-cardinality audit makes all 44 volume recipes process their complete logical input
and publishes deterministic first/middle/last-row evidence. The Canvas compiler also adds shared
topology-safe Area boundaries and one collision-safe, pixel-budgeted category-band resolver for
ordinary, grouped, stacked, ranked, range-column, waterfall, difference, candlestick, financial,
and price-block bodies. The reference-theme ratio check is shared rather than repeated at each
compiler call site. Spatial grows only through the public shared recipe contract; Canvas mark
implementations remain excluded by the existing graph-boundary checks.

Measured against the immediately preceding clean artifacts, raw minified size changes by
14,138/15,131/6,357 bytes before the shared reference-theme predicate deduplication. That
deduplication removes 246/363 bytes from the default/complete raw artifacts. The final clean
artifacts are:

| Browser file               |    Raw minified | GNU gzip `-9` | Brotli `-q 11` |                  Raw budget |  Headroom |
| -------------------------- | --------------: | ------------: | -------------: | --------------------------: | --------: |
| `graflume.min.js`          | 1,126,909 bytes | 327,572 bytes |  261,522 bytes | 1,101 KiB (1,127,424 bytes) | 515 bytes |
| `graflume.complete.min.js` | 1,324,133 bytes | 384,178 bytes |  303,516 bytes | 1,294 KiB (1,325,056 bytes) | 923 bytes |
| `graflume.spatial.min.js`  |   396,947 bytes | 123,568 bytes |  101,949 bytes |     388 KiB (397,312 bytes) | 365 bytes |

Each raw ceiling remains the next whole KiB. The compressed figures are transfer evidence only; the
raw minified artifacts remain the enforced gate.

When an entry grows, run the graph boundary check first. Raise a budget only when the remaining
increase is attributable to required reachable behavior or public API, then record the measured
bytes and rationale in the release change record.

## 2026-08-27 control-visibility audit

Canvas now removes its compact toolbar when no requested menu can actually render. Spatial adds a
closed, portable visibility contract for orbit, pan, grouped and per-direction zoom, reset,
projection, fullscreen, PNG export, and annotations; an all-hidden configuration likewise creates
no toolbar. The shared Canvas guard adds 175 raw bytes to the default and complete bundles. The
Spatial schema, validation, resolution, and live `setSpec()` structure synchronization add 701 raw
bytes to the independent Spatial bundle. The existing entry-boundary verifier confirms that this
does not introduce cross-entry implementation imports.

| Browser file               |    Raw minified | GNU gzip `-9` |                  Raw budget |  Headroom |
| -------------------------- | --------------: | ------------: | --------------------------: | --------: |
| `graflume.min.js`          | 1,127,084 bytes | 327,620 bytes | 1,101 KiB (1,127,424 bytes) | 340 bytes |
| `graflume.complete.min.js` | 1,324,308 bytes | 384,236 bytes | 1,294 KiB (1,325,056 bytes) | 748 bytes |
| `graflume.spatial.min.js`  |   397,648 bytes | 123,779 bytes |     389 KiB (398,336 bytes) | 688 bytes |

The Spatial ceiling moves by one whole KiB because the new menu-level public API is required
runtime behavior. All three ceilings remain below one KiB of raw headroom; compressed sizes remain
transfer evidence rather than the gate.

## 2026-08-28 temporal formatting and product Table audit

The Canvas entry points now share strict date/time parsing and locale-aware formatting across axes,
tooltips, semantic output, derived chart families, and Table cells. The default Table compiler adds
declarative layout, layered and conditional styles, safe merges, five bounded in-cell visuals, typed
editing metadata, and source-row provenance. The Canvas runtime adds immutable source/view reads,
validated edits, bounded reset/undo/redo, native editing overlays, edit events, and formula-safe
CSV/portable JSON export. These are public reachable contracts rather than optional documentation
payloads, so they remain in both the default and complete bundles. The independent Spatial import
graph is byte-identical.

| Browser file               |    Raw minified | GNU gzip `-9` |                  Raw budget |    Headroom |
| -------------------------- | --------------: | ------------: | --------------------------: | ----------: |
| `graflume.min.js`          | 1,177,381 bytes | 342,546 bytes | 1,150 KiB (1,177,600 bytes) |   219 bytes |
| `graflume.complete.min.js` | 1,375,243 bytes | 399,241 bytes | 1,344 KiB (1,376,256 bytes) | 1,013 bytes |
| `graflume.spatial.min.js`  |   397,648 bytes | 123,779 bytes |     389 KiB (398,336 bytes) |   688 bytes |

The default and complete raw artifacts grow by 50,297 and 50,935 bytes respectively from the
control-visibility snapshot; Spatial grows by zero bytes. Each enforced ceiling is again the next
whole KiB. Brotli was unavailable in the local verification environment, so this audit records raw
and gzip evidence only and does not infer a Brotli result.

## 2026-08-28 scoped-geography audit

The shared Canvas geography path now exposes function-free country, subdivision, and arbitrary
feature scopes; dateline-aware automatic fit; bounded coordinate detail; explicit feature/data
joins; and collision-aware labels. The public loader validates versioned manifests and performs
bounded, lazy, byte-length- and SHA-256-verified boundary loading. These APIs remain reachable from
the default entry point and are inherited by `graflume/complete`. The optional 31,619,754-byte
Natural Earth boundary pack is package data, not JavaScript hidden from the size gate. It loads by
selected country shard and is therefore recorded separately from executable bundle bytes. The
Spatial import graph is byte-identical.

| Browser file               |    Raw minified | GNU gzip `-9` |                  Raw budget |  Headroom |
| -------------------------- | --------------: | ------------: | --------------------------: | --------: |
| `graflume.min.js`          | 1,210,642 bytes | 352,262 bytes | 1,183 KiB (1,211,392 bytes) | 750 bytes |
| `graflume.complete.min.js` | 1,408,636 bytes | 408,841 bytes | 1,376 KiB (1,409,024 bytes) | 388 bytes |
| `graflume.spatial.min.js`  |   397,648 bytes | 123,779 bytes |     389 KiB (398,336 bytes) | 688 bytes |

The default and complete executable artifacts grow by 33,261 and 33,393 bytes respectively from
the product-Table snapshot; Spatial grows by zero bytes. The public scope normalizer, loader,
geometry preparation, built-in-country camera, and advanced map join/label compiler account for
the reachable increase. Every enforced ceiling is the next whole KiB, with less than one KiB of
headroom; gzip remains transfer evidence rather than the gate.
