# Development contracts

This directory contains generated, verified implementation boundaries. The
source feature matrix lives in `catalog/graflume.features.json`; generated
documents must be refreshed with `npm run catalog:generate`.

- `architecture-roadmap.md` defines the capability layers, delivery gates, and
  dependency order used to turn research into runtime contracts.
- `research-traceability.md` maps every section of the 2026-08-25 feature-gap
  research to a versioned artifact so that accepted work cannot disappear from
  later releases.
- `verified-feature-matrix.md` is generated from executable runtime registries
  and the audited feature source. Do not edit it by hand.
