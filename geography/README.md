# Graflume world boundary packs

`natural-earth-10m/` is Graflume's versioned, lazy-loadable world geography
dataset. It is generated from the Natural Earth vector repository snapshot
`f1890d9f152c896d250a77557a5751a93d494776` and is intentionally kept outside
the default browser bundles.

The catalog contains:

- country or territory geometry for all 249 ISO 3166-1 alpha-2 entries;
- the commonly used `XK` user-assigned Kosovo entry;
- 13 separately selectable source-defined or disputed map units;
- 4,501 unique principal-region features produced from all 4,596 Natural
  Earth Admin-1 source features, including Korean and English names when the
  source provides them;
- one country source plus 247 country-specific region shards, so an
  application loads only the selected geography.

The 1:10m geometry is quantized to 0.001 degrees (about 111 metres at the
equator) without line simplification. Duplicate ISO subdivision features are
merged into one compound geometry. `manifest.json` is the closed runtime
loader contract; `catalog.json` is the searchable country/region registry.
Every geometry source records an exact byte length and SHA-256 digest.

Run `npm run geography:update` to reproduce both the embedded 1:110m world
basemap and these lazy 1:10m assets. Run `npm run geography:check` for the
offline coverage, geometry, manifest, byte-length, and digest audit.

Natural Earth is public-domain data. Its default de facto boundary policy is
appropriate for statistical reference, not legal or diplomatic authority.
Applications must retain that distinction when presenting disputed areas.
