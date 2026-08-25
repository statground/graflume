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

| Research section                  | Versioned destination                                   | Completion evidence                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Conclusions                    | `architecture-roadmap.md`, catalog principles           | Dependency order and no-silent-downgrade policy                                                                                                                                                         |
| 1. Themes versus features         | theme families, capability profiles, catalog principles | Theme IDs remain independent of renderer and family availability                                                                                                                                        |
| 2. Baseline and semantic gaps     | 44 audited `families` entries                           | Exact runtime family set and explicit P0 limitations                                                                                                                                                    |
| 3.1 Data/visual grammar           | `transform-dataflow`, transform schema and tests        | Ordered top-level/layer methods, deterministic lineage and counts; named DAG remains P0                                                                                                                 |
| 3.2 Encoding and scales           | `encoding-scale-registry`, `crossCuttingContracts`      | Closed portable channels and scale registries plus compatible primary x/y shared domains; geographic/trading channels and shared multi-view axes/legends remain P0                                      |
| 3.3 Composition and linked views  | `composition-resolve`, `analytic-interaction`           | Closed bounded Canvas composition and scoped identities are current; shared axes/legends, linked stores, streaming and Spatial composition remain P0                                                    |
| 3.4 Labels and authoring          | `label-layout-authoring`                                | Placement, connector, edit, persistence, and export backlog                                                                                                                                             |
| 3.5 Renderer/streaming/large data | renderer and streaming contracts                        | Stable-key mutation, retention, watermark, bounded replay/queue, and opt-in transform worker are current; ring buffers, incremental recomputation, worker rendering, Arrow/WASM, and LOD remain backlog |
| 3.6 Accessibility/export          | semantic index, accessibility and export contracts      | Canvas-wide bounded index, native mirror, roving keyboard and scoped composed-view identity are current; GPU and linked-focus parity plus deterministic export remain backlog                           |
| 4. Canonical candidates           | 16 `candidates` entries                                 | Promotion criteria, host family, and computation contract                                                                                                                                               |
| 5. Existing families              | 44 `families` entries                                   | Current/P0/P1/P2/dependency fields for every family                                                                                                                                                     |
| 6. Unlock matrix                  | seven `commonFoundations` plus dependencies             | Reverse links from shared engine to affected families                                                                                                                                                   |
| 7. Mode backlog                   | 35 `modeBacklog` groups                                 | The full 253-name research intake is retained for traceability; current delivery is determined only by runtime modes and family `supported` evidence                                                    |
| 8. Library landscape              | 25 `ecosystemInputs` entries                            | Feature-placement decisions without public borrowed IDs                                                                                                                                                 |
| 9. Priority                       | foundation and family ordering                          | Delivery sequence in `architecture-roadmap.md`                                                                                                                                                          |
| 10. API proposal                  | catalog principles and normalized portable spec         | Orthogonal theme/capability/family contracts                                                                                                                                                            |
| 11. Verification                  | `verificationContracts` and repository checks           | Semantic, interaction, renderer/export, accessibility, and docs gates                                                                                                                                   |
| 12. Final decisions               | candidates, profiles, theme families                    | Conservative family promotion and package boundaries                                                                                                                                                    |

## Machine-checked cardinalities

`tests/public-catalog.test.mjs` rejects drift in these audited sets:

- 44 canonical families: 41 Canvas and 3 Spatial;
- all runtime modes and compatibility identifiers derived from registries;
- all registered themes;
- exactly one audited family row per canonical family;
- 16 canonical/optional/domain candidates;
- 7 shared foundations, 12 neutral theme families, and 25 ecosystem inputs;
- 35 mode-backlog groups containing 253 accepted mode/recipe names;
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

| Intake surface              |    Research/catalog cardinality | Audit result                                                                          |
| --------------------------- | ------------------------------: | ------------------------------------------------------------------------------------- |
| Top-level sections          | 13 numbered headings (`0`–`12`) | All routed in the section table above                                                 |
| Canonical families          |  44 (`41` Canvas + `3` Spatial) | Exact ID set; one partial-status audit row per runtime family                         |
| Candidate families/packages |                              16 | All remain `planned` or `research`                                                    |
| Common foundations          |                               7 | Exact inventory; three stale implementation summaries corrected                       |
| Capability profiles         |                               7 | Exact inventory; none promoted beyond current evidence                                |
| Cross-cutting contracts     |                               9 | Exact inventory; encoding and scale registries corrected to `partial`                 |
| Mode research inventory     |           35 groups / 253 names | All retained; presence is not a runtime support claim                                 |
| Ecosystem/library inputs    |                              25 | Exact inventory and placement retained                                                |
| Verification groups         |                               5 | Exact semantic, interaction, renderer/export, accessibility, and documentation groups |
| Neutral theme families      |                              12 | Exact inventory; independent of runtime theme IDs                                     |
| Research references         |            95 unique HTTPS URLs | Exact sorted set; no missing or extra URL                                             |

The implementation-state correction moved only independently tested subsets
into current evidence: ordered transforms, portable encodings/scales, the
Canvas semantic mirror, Area/Bar stack semantics, Line curves and missing-value
policies, Table semantic keyboard traversal, embedded-map attribution, and 17
calculated Technical Indicators. Family status remains `partial`. Named and
branched transform DAGs, worker-owned rendering and incremental transform
recomputation, analytic data-domain navigation, provider tile lifecycle, the 28 precomputed-only indicators,
finance panes/crosshair, and every unimplemented family mode remain P0/P1/P2 or
research work.

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
