# Feature research traceability

This index ensures every part of the 2026-08-25 feature-gap research has a
durable destination. It records acceptance and ownership; runtime support is
reported separately by the generated public catalog.

The 95 exact HTTPS references cited by that research are preserved in
`catalog/graflume.features.json` as `researchSources`, copied into the public
catalog, schema-validated for uniqueness, and checked by the catalog tests.

The reviewed source artifact is
`Graflume_chart_feature_gap_research_2026-08-25.md`: 1,013 lines, 8,207 words,
80,253 bytes, SHA-256
`eaa2df12cf8c8dfaf7f4ee73029ac6370354d2cbbaedb41900eeb9b0e89817bb`.
These fixed intake counts make later editorial drift distinguishable from an
intentional catalog update.

The follow-up `current-limitations-2026-08-26` release implements all 161/161
capabilities that this intake had placed in the 44 families' P0/current
boundary. `catalog/graflume.current-limitations.evidence.json` preserves the
original capability wording and the exact source and test paths for each
family. The feature catalog now reports all seven common foundations and all 44
families as `supported`, with zero remaining P0 entries. Candidate and P1/P2
research is deliberately unchanged.

| Research section                  | Versioned destination                                   | Completion evidence                                                                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Conclusions                    | `architecture-roadmap.md`, catalog principles           | Dependency order and no-silent-downgrade policy                                                                                                                                                                                                                                                                                                 |
| 1. Themes versus features         | theme families, capability profiles, catalog principles | Theme IDs remain independent of renderer and family availability                                                                                                                                                                                                                                                                                |
| 2. Baseline and semantic gaps     | 44 audited `families` entries plus completion evidence  | Exact runtime family set; all 161 former P0 items mapped to source and test evidence, with zero current limitations                                                                                                                                                                                                                             |
| 3.1 Data/visual grammar           | `transform-dataflow`, transform schema and tests        | Ordered top-level/layer methods plus closed named sources, memoized branches, reusable DAG execution, deterministic lineage and facet/composition source-row preservation                                                                                                                                                                       |
| 3.2 Encoding and scales           | `encoding-scale-registry`, `crossCuttingContracts`      | Closed portable channels include geographic, OHLCV trading, angular and bounded icon semantics; compatible direct Canvas views share x/x2/y/y2 domains, outer axes, categorical/layer legends and continuous colorbars                                                                                                                          |
| 3.3 Composition and linked views  | `composition-resolve`, `analytic-interaction`           | Closed bounded Canvas composition and scoped identities include direct-view shared axes/legends/colorbars, root legend filtering, and bounded linked state; generalized cross-filter routing, nested shared-guide parity, streaming, and Spatial composition remain later contracts                                                             |
| 3.4 Labels and authoring          | `label-layout-authoring`                                | All 41 Canvas families now share portable automatic labels, collision/connector layout, Canvas handles, pointer/keyboard edit, snapping, bounded undo/redo, position persistence/export, and accessible lifecycle evidence; composed-view routing and Spatial ownership stay separate explicit boundaries                                       |
| 3.5 Renderer/streaming/large data | renderer and streaming contracts                        | Ring-backed stable-key mutation, retention, watermark, explicit queue overflow, replay, incremental row-local transforms, frame coalescing, pause/follow-live, lazy history, automatic Worker creation, Arrow-compatible and WASM adapters, cancellation, and worker-owned rendering are current; family-specific LOD remains separately scoped |
| 3.6 Accessibility/export          | semantic index, accessibility and export contracts      | Canvas-wide bounded index, virtualized native exploration, roving keyboard and scoped composed-view identity are current; GPU traversal/projected focus and bounded stable-key linked Canvas/Spatial focus are current, while renderer-specific deterministic export remains separately scoped                                                  |
| 4. Canonical candidates           | 16 `candidates` entries                                 | Promotion criteria, host family, and computation contract                                                                                                                                                                                                                                                                                       |
| 5. Existing families              | 44 `families` entries plus 44 evidence rows             | Supported/P1/P2/dependency fields for every family; empty P0 arrays and an exact 161-capability historical completion ledger                                                                                                                                                                                                                    |
| 6. Unlock matrix                  | seven `commonFoundations` plus dependencies             | Reverse links from shared engine to affected families                                                                                                                                                                                                                                                                                           |
| 7. Mode backlog                   | 35 `modeBacklog` groups                                 | The intake contained 253 names; 97 implemented names moved to supported family evidence on 2026-08-26, leaving 156 future names in the backlog                                                                                                                                                                                                  |
| 8. Library landscape              | 25 `ecosystemInputs` entries                            | Feature-placement decisions without public borrowed IDs                                                                                                                                                                                                                                                                                         |
| 9. Priority                       | foundation and family ordering                          | Delivery sequence in `architecture-roadmap.md`                                                                                                                                                                                                                                                                                                  |
| 10. API proposal                  | catalog principles and normalized portable spec         | Orthogonal theme/capability/family contracts                                                                                                                                                                                                                                                                                                    |
| 11. Verification                  | `verificationContracts` and repository checks           | Semantic, interaction, renderer/export, accessibility, and docs gates                                                                                                                                                                                                                                                                           |
| 12. Final decisions               | candidates, profiles, theme families                    | Conservative family promotion and package boundaries                                                                                                                                                                                                                                                                                            |

## Machine-checked cardinalities

`tests/public-catalog.test.mjs` rejects drift in these audited sets:

- 44 canonical families: 41 Canvas and 3 Spatial;
- 176 runtime presets/modes and 120 compatibility identifiers derived from registries;
- all 17 registered themes;
- exactly one audited family row per canonical family;
- exactly 161 completed current limitations, zero remaining P0 entries, and at
  least one existing source and test path for every evidence row;
- six modes with source-derived introduction metadata: `ecdf`, `ccdf`, `kde`,
  `kagi`, `three-line-break`, and `range-bars`;
- 45 computed Technical Indicator presets and zero precomputed-required presets;
- 16 canonical/optional/domain candidates;
- 7 shared foundations, 12 neutral theme families, and 25 ecosystem inputs;
- 35 mode-backlog groups containing 156 remaining mode/recipe names, after 97
  implemented intake names moved to supported evidence;
- 9 cross-cutting contracts, 7 capability profiles, and 5 verification groups;
- 95 unique research URLs with the ordered-corpus SHA-256
  `69e5f8a28cf405041d47468449879e797591b91fabae3cf5854308b5436f977d`;
- a representative executable sample for every family;
- a documented status and limitation boundary for every catalog entry.

The generated `verified-feature-matrix.md` is the review surface for humans.
The JSON feature source and public catalog are the integration surfaces for CI
and downstream sites.

## Independent completeness audit (2026-08-25)

The fixed research artifact was compared item by item with the feature source,
generated catalog, generated matrix, and this roadmap. The audit covered all 13
numbered top-level sections (`0` plus the 12 substantive sections `1`–`12`),
all 44 family subsections, the promotion and domain candidates, every mode
inventory group, every library input, and every verification group.

| Intake surface              |    Research/catalog cardinality | Audit result                                                                           |
| --------------------------- | ------------------------------: | -------------------------------------------------------------------------------------- |
| Top-level sections          | 13 numbered headings (`0`–`12`) | All routed in the section table above                                                  |
| Canonical families          |  44 (`41` Canvas + `3` Spatial) | Exact ID set; at intake, one partial-status audit row per runtime family               |
| Candidate families/packages |                              16 | All remain `planned` or `research`                                                     |
| Common foundations          |                               7 | Exact inventory; three stale implementation summaries corrected                        |
| Capability profiles         |                               7 | Exact inventory; none promoted beyond current evidence                                 |
| Cross-cutting contracts     |                               9 | Exact inventory; encoding and scale registries corrected to `partial`                  |
| Mode research inventory     |           35 groups / 253 names | All retained at intake; presence was not a runtime support claim                       |
| Ecosystem/library inputs    |                              25 | Exact inventory and placement retained                                                 |
| Verification groups         |                               5 | Exact semantic, interaction, renderer/export, accessibility, and documentation groups  |
| Neutral theme families      |                              12 | Exact inventory and matching runtime IDs; independent of capability and family support |
| Research references         |            95 unique HTTPS URLs | Exact sorted set; no missing or extra URL                                              |

That 2026-08-25 audit remains the fixed intake record. It must not be rewritten
as if every research candidate had been accepted for implementation.

## Current-limitations completion audit (2026-08-26)

The follow-up audit joins the feature and evidence catalogs by the exact 44
family IDs. It verifies 161 counted per-family capability entries, confirms
each entry now occurs in that family's `supported` list, rejects any non-empty P0
array, and checks every declared `src/*.ts` and `tests/*.test.mjs` path on disk.
The generated public manifest repeats the immutable release ID, 161 completed,
zero remaining, and the evidence path so downstream sites do not infer closure
from prose.

Name-to-function growth is equally explicit: Kagi, Three Line Break, and Range
Bars are new Price blocks modes tagged with
`introducedIn: current-limitations-2026-08-26`. They raise the Canvas registry
from 165 to 168 modes and the combined Canvas/Spatial catalog from 173 to 176,
without changing the 44-family topology. Compatibility identifiers rise from
117 to 120. The runtime capability catalog separately proves all 45 named
Technical Indicator presets are computed and none remain
`precomputed-required`. Theme and capability growth stay orthogonal: the
runtime has 17 registered themes, of which 12 are the neutral families recorded
by the research intake.

The completion evidence applies only to the former Current limitations/P0
boundary. P1/P2 items, generalized platform contracts, and all 16 candidate
families/packages retain their own planned or research gates and are not
inferred from completion of a shared foundation.

The mode backlog is a remaining-work inventory rather than an append-only
history. This release removes 97 now-supported intake names from it, reducing
the live backlog from 253 to 156 names while retaining all 35 groups. The fixed
2026-08-25 research artifact and the 161-item completion evidence preserve the
historical intake and promotion trail.

## Rules for future additions

1. Add research vocabulary to the audited feature source before using it in a
   public preset name.
2. Link every new mode to a canonical family and every new family to a distinct
   data, layout, interaction, or authoring contract.
3. Add its semantic invariant, failure/fallback behavior, accessibility
   alternate, performance bound, schema, example, and manual before promotion.
4. Regenerate the catalog and matrix; never copy totals into downstream code.
5. Record incompatible changes through deprecation and compatibility mappings,
   not a second renderer path.
