# Public catalog contract

`graflume.catalog.json` is the generated integration contract for downstream
documentation sites. It contains the exact runtime family, mode, compatibility,
theme, representative sample, and current capability boundaries. Counts are
derived from those arrays; consumers must not copy numeric totals by hand.

A mode may carry an optional `introducedIn` release identifier copied directly
from its runtime variant entry. This is provenance for release-aware discovery,
not a new canonical-family boundary: missing metadata means the mode predates
the marker or has not been attributed, not that the mode is unsupported. The
`research-foundations-2026-08-25` release introduces `ecdf`, `ccdf`, and `kde`
inside the existing `distribution` family.

`runtimeCapabilities` is the closed name-function contract for the shared
Area/Bar/Theme river stack engine, all 47 technical-indicator entry points, and
the deprecated `tiled-map` embedded-basemap alias. Indicator support is declared
per preset as `computed` or `precomputed-required`; a public name alone never
implies a built-in formula. The 47-entry total means 45 named preset functions
plus the two canonical surfaces, `technicalIndicator()` and the portable
`indicator` mark.

The series-stack capability also enumerates the canonical encoding channels the
specialized path consumes. Its `positionalConflicts` record is normative:
stack-owned boundaries make Bar `x2`/`y2` and Area/Theme river `y2` invalid,
so hosts can reject those combinations before rendering.

`graflume.features.json` is the audited development source. Its status words are
strict:

- `supported`: executable and covered by semantic tests;
- `partial`: an executable subset exists and its missing contract is listed;
- `planned`: accepted direction without a public runtime promise;
- `research`: a candidate whose data or computational contract is not settled.

The `composition-resolve` common foundation is the public boundary for the
closed Canvas layer/facet/repeat/concat/inset compiler. It records the supported
primary x/y shared-domain subset separately from planned shared axes, legends,
linked state, streaming, pagination, and Spatial composition.

Generate both the public manifest and the human-readable matrix with:

```sh
npm run catalog:generate
```

CI and consumers use `npm run catalog:check`. The manifest deliberately omits a
source commit because a file cannot truthfully contain the commit that first
includes itself. A consumer owns its exact Git SHA and verifies the manifest,
bundle bytes, SRI, manuals, and snapshots at that same SHA.
