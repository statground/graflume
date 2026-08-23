# Surface and mesh

The `surface` canonical family contains two modes with different data topology. Both compile to lit, depth-tested GPU triangles and expose vertex-level pick targets.

## Surface grid

![Compiled surface preview](../assets/spatial/surface.svg)

Use `surface()` for a regular `rows × columns` grid. `z` supplies height values in row-major order. Optional `x` and `y` arrays replace column and row indices; optional `values` drives the color gradient while `z` still controls geometry.

The compiled preview and browser gallery use a filled 35×35 terrain with two peaks, a basin, and a rippled ridge. Its 1,225 vertices receive a continuous scalar color gradient, generated normals, two-sided lighting, and a camera framed to keep the terrain prominent. `wireframe` remains an explicit diagnostic/style option rather than the representative default.

```html
<div id="terrain" style="height: 420px"></div>
<script>
  const chart = GraflumeSpatial.surface(
    '#terrain',
    {
      rows: 3,
      columns: 3,
      x: [-1, 0, 1],
      y: [-1, 0, 1],
      z: [0, 0.4, 0, 0.4, 1, 0.4, 0, 0.4, 0],
    },
    {
      title: 'Response surface',
      color: '#6d28d9',
      interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    },
  );
</script>
```

Required invariants:

- `rows` and `columns` are integers from 2 through 2,048.
- `rows × columns` is at most 1,000,000.
- `z` and `values` have exactly `rows × columns` finite values.
- `x` has exactly `columns` values and `y` exactly `rows` when provided.

`wireframe: true` switches the compiled primitive to the grid edge set without changing the data contract.

## Indexed mesh

![Compiled mesh preview](../assets/spatial/mesh.svg)

Use `mesh()` when connectivity is explicit. `positions` contains `[x, y, z]` vertices and `triangles` contains zero-based index triples. Optional `normals`, `colors`, and `labels` are parallel to `positions`; normals are derived when omitted.

The representative shell uses 900 vertices and 1,728 indexed triangles with a height- and angle-dependent palette. This exercises closed connectivity, per-vertex colors, derived smooth normals, filled back faces, depth testing, and lighting rather than reducing mesh mode to one tetrahedron.

```js
const chart = GraflumeSpatial.mesh(
  '#mesh',
  {
    positions: [
      [0, 1, 0],
      [-1, -1, 1],
      [1, -1, 1],
      [0, -1, -1],
    ],
    triangles: [
      [0, 1, 2],
      [0, 2, 3],
      [0, 3, 1],
      [1, 3, 2],
    ],
    labels: ['peak', 'west', 'east', 'back'],
  },
  { title: 'Indexed tetrahedron', opacity: 0.9 },
);
```

The code above is the minimum data shape; the generated preview is the richer shell scene described above. The input-shape limit is 1,000,000 vertices and 2,000,000 triangles. Every triangle index must address an existing vertex. `wireframe: true` renders all three triangle edges as GPU lines. The lower scene-wide derived-output and pick-target budgets still apply, so reaching both input maxima in one scene is intentionally rejected.

## Interaction, accessibility, and limits

Grid tooltips expose `row`, `column`, `x`, `y`, `z`, and `value`. Mesh tooltips expose `x`, `y`, `z`, and `label`. The same fields populate the accessible table. A surface does not add Cartesian axes; camera orbit, projection, lighting, and the geometry itself define the spatial view.

Missing grid cells are not inferred. Split discontinuous surfaces into separate layers rather than inserting non-finite values. For very large meshes, reduce labels and accessible table rows, use stable indices, and prefer precomputed normals when their exact smoothing is important.
