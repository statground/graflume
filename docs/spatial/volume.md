# Volume and isosurface

The `volume` canonical family consumes a bounded scalar lattice. `dimensions` are `[x, y, z]`, `values` use `z * x * y + y * x + x` order, and optional `origin` and positive `spacing` place the lattice in the scene.

## Volume sampling

![Compiled volume preview](../assets/spatial/volume.svg)

`volume()` samples evenly across the flattened lattice order and draws depth-tested GPU point spheres. It is useful for an overview of scalar density where every retained voxel needs a tooltip target. It is a sampled scalar cloud, not ray-marched continuous volume rendering.

The generated preview and browser gallery evaluate a deterministic 19³ field with two anisotropic lobes, a ring, and a small saddle term. They retain 5,200 samples. The low and high scalar colors carry alpha from 0.01 to 0.82 while mark opacity stays at 1, so dense high-value regions remain legible without turning every voxel into an equally opaque block.

```js
const values = [0, 0.1, 0.2, 0.4, 0.3, 0.5, 0.7, 1];
const chart = GraflumeSpatial.volume(
  '#volume',
  { dimensions: [2, 2, 2], values, origin: [-1, -1, -1], spacing: [2, 2, 2] },
  {
    maxSamples: 80000,
    pointSize: 5,
    opacity: 1,
    colorLow: 'rgba(56, 189, 248, 0.01)',
    colorHigh: 'rgba(251, 113, 133, 0.82)',
  },
);
```

`maxSamples` is a strict upper bound from 1 through 250,000, including anisotropic lattices. Selection is deterministic, preserves both ends when the budget allows, and never emits an extra endpoint beyond the requested count.

## Isosurface extraction

![Compiled isosurface preview](../assets/spatial/isosurface.svg)

`isosurface()` extracts the requested constant-value boundary into triangles with marching tetrahedra, then calculates face-derived lighting normals.

The representative extraction uses the same 19³ multi-lobe field at `isoValue: 0.43`, producing more than 12,000 filled vertices. An opaque material, derived normals, and a close positive-pitch camera make the lobes and central ring readable as a solid boundary.

```js
const chart = GraflumeSpatial.isosurface(
  '#iso',
  { dimensions: [2, 2, 2], values: [0, 0, 0, 0, 0, 0, 0, 1] },
  { isoValue: 0.5, colorHigh: '#7c3aed', opacity: 1 },
);
```

When `isoValue` is omitted, the compiler uses the midpoint of the finite minimum and maximum. Cells entirely on one side of the threshold emit no triangles.

## Contract, picking, and limits

Each dimension is an integer from 2 through 256, the product is at most 4,194,304, and `values.length` must equal that product. All values, origins, and spacing entries are finite; spacing must be positive.

Volume picks expose lattice `x`, `y`, `z`, and `value`. Isosurface picks expose source cell `x`, `y`, `z`, and `isoValue`. Both feed tooltips and the accessible table. Sample points use sphere-shaped, center-lit point impostors; opaque point edges are discarded before writing depth, while translucent point edges can remain soft. The current volume appearance is bounded point sampling rather than ray marching. Isosurface polygons are ordered in their extraction plane with low-to-high scalar winding before triangulation; the extractor does not smooth or decimate its output. The scene-level derived-output budget rejects an extraction whose safe worst-case geometry would be too large.
