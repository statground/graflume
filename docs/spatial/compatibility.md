# Spatial compatibility and portable contract

## Machine-readable catalog

The spatial entry exports `spatialChartFamilies`, `spatialCompatibilityModes`, and `spatialCatalogBoundary`. These values are the source for consumer menus and documentation:

| Public ID         | Canonical family | Spatial mark/mode     | Quick API          | New family?       |
| ----------------- | ---------------- | --------------------- | ------------------ | ----------------- |
| `surface`         | `surface`        | `surface / surface`   | `surface()`        | yes               |
| `mesh`            | `surface`        | `surface / mesh`      | `mesh()`           | no                |
| `volume`          | `volume`         | `volume / volume`     | `volume()`         | yes               |
| `isosurface`      | `volume`         | `volume / isosurface` | `isosurface()`     | no                |
| `vector-cone`     | `spatial-vector` | `vector / cone`       | `vectorCone()`     | yes               |
| `streamtube`      | `spatial-vector` | `vector / streamtube` | `streamtube()`     | no                |
| `spatial-scatter` | `spatial-vector` | `scatter / scatter`   | `spatialScatter()` | no                |
| `globe`           | `map`            | `globe / globe`       | `globe()`          | existing map mode |

The boundary is 41 default/complete canonical families plus 3 spatial canonical families, totaling 44. The seven spatial variants and one integrated map mode must not be added again as canonical families. For presentation counts, `spatialCatalogBoundary` records 162 default/complete presets + 7 spatial variants + 1 integrated globe mode = 170.

## Serialization boundary

`SpatialSpec 0.1` is separate from `ChartSpec 0.1`; neither format silently accepts the other. A valid spatial specification is a plain JSON object with `layers`, optionally includes `specVersion: "0.1"`, and has no functions, class instances, typed arrays, cycles, non-finite numbers, unknown properties, or unsafe object keys.

Use `validateSpatialSpec(value)` to collect `{ path, message }` issues and `assertValidSpatialSpec(value)` to throw on the first invalid contract. `compileSpatial()` and every Quick API validate before compiling. The JSON schema is exported as `graflume/spatial-schema` and copied to `dist/graflume.spatial.schema.json` during the build.

## Renderer boundary

The spatial module registers no renderer or mark in the default/complete Canvas registry. It owns a WebGL surface and spatial compiler, while reusing only small environment-independent utilities. Consequently:

- importing the default or complete entry does not include the spatial renderer or Natural Earth globe code;
- importing `graflume/spatial` does not change default Canvas chart behavior;
- a page may place normal and spatial chart instances side by side;
- a spatial layer cannot currently be inserted into a normal `ChartSpec` layer array;
- PNG fallback, accessibility, context recovery, resize, and fullscreen are handled by `SpatialChart`.

`SpatialSpec 0.1` is deliberately closed to the five built-in spatial mark discriminators. The alpha entry does not expose a custom mark compiler registration or built-in override hook; a future extension contract must version its validator, types, schema, compiler, and safety budgets together.

## Bounded inputs

| Resource                |        Bound |
| ----------------------- | -----------: |
| Layers                  |           64 |
| Grid or scatter points  |    1,000,000 |
| Mesh triangles          |    2,000,000 |
| Volume cells            |    4,194,304 |
| Retained volume samples |      250,000 |
| Cone vectors            |      250,000 |
| Stream paths            |        4,096 |
| Total stream points     |    1,000,000 |
| Globe points or routes  | 100,000 each |
| Accessible rows         |        1,000 |

The runtime additionally estimates output across all layers before compilation. It rejects scenes above 2,000,000 derived vertices, 6,000,000 indices, 500,000 semantic pick targets, or an estimated 256 MiB for typed geometry and pick metadata. These cross-field limits are exported as `spatialOutputLimits` and mirrored in the JSON Schema's `x-graflume-runtime-output-limits` metadata.

Surface mesh and vector streamtube modes may omit `mark.mode` when their data shape is unambiguous (`positions` + `triangles`, or `paths`). The runtime validator, compiler, TypeScript contract, and schema use the same inference rule.
