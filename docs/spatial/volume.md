# Volume and isosurface

The `volume` canonical family consumes a bounded scalar lattice. `dimensions` are `[x, y, z]`, `values` use `z * x * y + y * x + x` order, and optional `origin` and positive `spacing` place the lattice in the scene.

## Volume sampling

![Compiled volume preview](../assets/spatial/volume.svg)

Without `render` or `slices`, `volume()` preserves the lightweight sampled-cloud path: it samples evenly across the flattened lattice order and draws depth-tested GPU point spheres. Use this overview when every retained voxel needs its own tooltip target.

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

## Transfer functions, window-level, and direct projection

`transferFunction.stops` maps normalized post-window values to color and opacity. Two through 64 strictly increasing stops support linear or step interpolation. `windowLevel` maps the raw interval `level ± window / 2` into `0..1` before the transfer is evaluated.

`render.method` performs a bounded object-space ray traversal along an authored `x`, `y`, or `z` axis. `raycast` uses front-to-back alpha compositing; `mip`, `minip`, and `average` use the corresponding scalar reduction. The deterministic CPU reference compiles the result into indexed, pickable triangle geometry, and the normal WebGL2/WebGL1 renderer draws that geometry with depth, blending, export, camera, and context-restoration behavior intact.

```js
GraflumeSpatial.volume('#volume', data, {
  windowLevel: { window: 800, level: 200 },
  transferFunction: {
    stops: [
      { offset: 0, color: '#0f172a', opacity: 0 },
      { offset: 0.45, color: '#38bdf8', opacity: 0.15 },
      { offset: 1, color: '#fb7185', opacity: 0.9 },
    ],
  },
  render: {
    method: 'raycast',
    axis: 'z',
    resolution: [128, 128],
    samples: 192,
    interpolation: 'linear',
    caps: 'both',
  },
});
```

Projection picks include `renderMethod`, `rayAxis`, `rayDepth`, `sampleCount`, raw `value`, and `normalizedValue`. `caps: "front" | "back" | "both"` adds transfer-mapped boundary planes using the same bounded slice compiler.

## Orthogonal and oblique slices

`slices` accepts up to 16 portable plane specifications. Orthogonal slices use an axis and normalized `position`. Oblique slices use a world-space `origin`, non-zero `normal`, optional `up`, physical `size`, and bounded two-dimensional resolution.

```js
const transferFunction = {
  stops: [
    { offset: 0, color: '#0f172a', opacity: 0 },
    { offset: 0.45, color: '#38bdf8', opacity: 0.15 },
    { offset: 1, color: '#fb7185', opacity: 0.9 },
  ],
};

GraflumeSpatial.volume('#volume', data, {
  transferFunction,
  slices: [
    { type: 'orthogonal', axis: 'x', position: 0.5, resolution: [96, 96] },
    {
      type: 'oblique',
      origin: [0, 0, 0],
      normal: [1, 1, 0.4],
      size: [4, 4],
      resolution: [128, 128],
      opacity: 0.85,
    },
  ],
});
```

Nearest and trilinear sampling are explicit. Slice picks expose plane identity, row, column, world position, raw value, and normalized value. `sampleVolumeValue()`, `projectVolumeRays()`, and `sampleVolumeSlice()` expose deterministic CPU references for worker use and reproducible tests.

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

Voxel, ray, cap, slice, and isosurface picks feed tooltips, the accessible table, and GPU keyboard traversal. Each derived geometry records its operation, source/derived counts, resolution or method, and bounded status as provenance. Sample points use sphere-shaped, center-lit point impostors; opaque point edges are discarded before writing depth, while translucent point edges can remain soft. Isosurface polygons are ordered in their extraction plane with low-to-high scalar winding before triangulation; the extractor does not smooth or decimate its output. The scene-level derived-output budget accounts for every projection, cap, and slice before allocation and rejects unsafe combinations.

## Current limitations

None remain in the audited P0/current-limitations boundary as of 2026-08-26. Transfer functions, raycast/MIP/minIP/average projections, orthogonal and oblique slices, caps, and window-level controls are executable and tested. Separately cataloged P1/P2 work such as segmentation, empty-space skipping, bricking, and WebGPU streaming remains future roadmap rather than current runtime support. Exact source and test paths are recorded in [the completion evidence](../../catalog/graflume.current-limitations.evidence.json).
