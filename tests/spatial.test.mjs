import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { spatialSampleSpecs } from '../scripts/spatial-samples.mjs';

import {
  compileSpatial,
  spatialCapabilities,
  spatialCatalogBoundary,
  spatialChartFamilies,
  spatialCompatibilityModes,
  spatialOutputLimits,
  validateSpatialSpec,
} from '../.tmp/src/spatial.js';
import {
  collectAccessibleSpatialPicks,
  spatialAccessibleDescription,
} from '../.tmp/src/spatial/accessibility.js';
import { resolveSpatialSize } from '../.tmp/src/spatial/layout.js';
import {
  cross3,
  length3,
  normalizedCamera,
  projectPoint,
  subtract3,
  viewProjectionMat4,
} from '../.tmp/src/spatial/math.js';
import {
  assertFiniteSpatialNumber,
  resolveSpatialCameraPatch,
} from '../.tmp/src/spatial/programmatic.js';
import {
  isGlobePickFrontFacing,
  spatialGeometryAlphaClass,
} from '../.tmp/src/spatial/webgl-renderer.js';

const surfaceSpec = {
  specVersion: '0.1',
  title: 'Terrain',
  layers: [
    {
      id: 'terrain',
      mark: { type: 'surface' },
      data: {
        rows: 3,
        columns: 3,
        x: [-1, 0, 1],
        y: [-1, 0, 1],
        z: [0, 0.5, 0, 0.5, 1, 0.5, 0, 0.5, 0],
      },
    },
  ],
};

function distinctSpatialColors(geometry) {
  const colors = new Set();
  for (let offset = 0; offset < geometry.colors.length; offset += 4) {
    colors.add(
      Array.from(geometry.colors.slice(offset, offset + 4), (value) => value.toFixed(4)).join(','),
    );
  }
  return colors.size;
}

function projectedSceneCoverage(spec, scene, width = 720, height = 420) {
  const camera = normalizedCamera(
    spec.projection ?? 'perspective',
    scene.bounds.center,
    scene.bounds.radius,
    spec.camera,
  );
  const matrix = viewProjectionMat4(camera, width, height);
  let minimumX = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  let visiblePoints = 0;
  for (const geometry of scene.geometries) {
    for (let offset = 0; offset < geometry.positions.length; offset += 3) {
      const projected = projectPoint(
        matrix,
        [
          geometry.positions[offset],
          geometry.positions[offset + 1],
          geometry.positions[offset + 2],
        ],
        width,
        height,
      );
      if (!projected.visible) continue;
      visiblePoints += 1;
      minimumX = Math.min(minimumX, projected.x);
      maximumX = Math.max(maximumX, projected.x);
      minimumY = Math.min(minimumY, projected.y);
      maximumY = Math.max(maximumY, projected.y);
    }
  }
  return {
    visiblePoints,
    width: (maximumX - minimumX) / width,
    height: (maximumY - minimumY) / height,
  };
}

test('spatial catalog adds three canonical families without duplicating map', () => {
  assert.deepEqual(
    spatialChartFamilies.map(({ familyId }) => familyId),
    ['surface', 'volume', 'spatial-vector'],
  );
  assert.deepEqual(
    spatialChartFamilies.flatMap(({ variants }) => variants.map(({ id }) => id)),
    ['surface', 'mesh', 'volume', 'isosurface', 'vector-cone', 'streamtube', 'spatial-scatter'],
  );
  assert.equal(spatialCompatibilityModes.length, 1);
  assert.equal(spatialCompatibilityModes[0].id, 'globe');
  assert.equal(spatialCompatibilityModes[0].canonicalFamilyId, 'map');
  assert.deepEqual(spatialCatalogBoundary, {
    coreAndCompleteCanonicalFamilies: 41,
    coreAndCompletePresets: 168,
    spatialCanonicalFamilies: 3,
    totalCanonicalFamilies: 44,
    spatialVariants: 7,
    integratedExistingFamilyModes: 1,
    totalPresetsAndModes: 176,
  });
  assert.deepEqual(spatialCapabilities().projections, ['perspective', 'orthographic']);
});

test('surface and indexed mesh compile into real triangle geometry and pick targets', () => {
  const surface = compileSpatial(surfaceSpec);
  assert.equal(surface.geometries.length, 1);
  assert.equal(surface.geometries[0].primitive, 'triangles');
  assert.equal(surface.geometries[0].positions.length, 27);
  assert.equal(surface.geometries[0].indices.length, 24);
  assert.equal(surface.geometries[0].picks.length, 9);
  assert.ok(surface.bounds.radius > 0);

  const mesh = compileSpatial({
    layers: [
      {
        mark: { type: 'surface', mode: 'mesh' },
        data: {
          positions: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ],
          triangles: [
            [0, 1, 2],
            [0, 1, 3],
          ],
          labels: ['origin', 'east', 'north', 'front'],
        },
      },
    ],
  });
  assert.equal(mesh.geometries[0].positions.length, 12);
  assert.equal(mesh.geometries[0].indices.length, 6);
  assert.equal(mesh.geometries[0].picks[0].datum.label, 'origin');
});

test('spatial gallery samples compile rich geometry, color depth, and readable camera framing', () => {
  const expected = {
    surface: { vertices: 1_225, indices: 6_900, picks: 1_225, colors: 900 },
    mesh: { vertices: 900, indices: 5_100, picks: 900, colors: 6 },
    volume: { vertices: 5_200, indices: 0, picks: 5_200, colors: 2_000 },
    isosurface: { vertices: 12_000, indices: 0, picks: 4_000, colors: 1 },
    'vector-cone': { vertices: 1_400, indices: 7_000, picks: 121, colors: 7 },
    streamtube: { vertices: 4_100, indices: 24_000, picks: 522, colors: 9 },
    'spatial-scatter': { vertices: 576, indices: 0, picks: 576, colors: 10 },
  };

  for (const [name, minimum] of Object.entries(expected)) {
    const spec = spatialSampleSpecs[name];
    const scene = compileSpatial(spec);
    const geometry = scene.geometries[0];
    assert.ok(geometry.positions.length / 3 >= minimum.vertices, `${name} vertex density`);
    assert.ok((geometry.indices?.length ?? 0) >= minimum.indices, `${name} index density`);
    assert.ok(geometry.picks.length >= minimum.picks, `${name} semantic pick density`);
    assert.ok(distinctSpatialColors(geometry) >= minimum.colors, `${name} color depth`);
    assert.ok(spec.camera.pitch >= 0.35 && spec.camera.pitch <= 0.5, `${name} camera pitch`);

    const coverage = projectedSceneCoverage(spec, scene);
    assert.ok(coverage.visiblePoints > 0, `${name} has visible projected geometry`);
    assert.ok(
      coverage.width >= 0.28 && coverage.width <= 0.6,
      `${name} projected width ${(coverage.width * 100).toFixed(1)}%`,
    );
    assert.ok(
      coverage.height >= 0.6 && coverage.height <= 0.78,
      `${name} projected height ${(coverage.height * 100).toFixed(1)}%`,
    );
  }

  const volumeColors = spatialSampleSpecs.volume.layers[0].mark;
  assert.equal(volumeColors.opacity, 1);
  assert.match(volumeColors.colorLow, /0\.01\)/);
  assert.match(volumeColors.colorHigh, /0\.82\)/);
  for (const name of ['surface', 'mesh', 'isosurface']) {
    assert.equal(spatialSampleSpecs[name].layers[0].mark.opacity, 1);
  }
});

test('volume and isosurface modes compile bounded depth geometry', () => {
  const values = [0, 0, 0, 0, 0, 0, 0, 1];
  const volume = compileSpatial({
    layers: [
      {
        mark: { type: 'volume', mode: 'volume', maxSamples: 8 },
        data: { dimensions: [2, 2, 2], values },
      },
    ],
  });
  assert.equal(volume.geometries[0].primitive, 'points');
  assert.equal(volume.geometries[0].picks.length, 8);

  const anisotropic = compileSpatial({
    layers: [
      {
        mark: { type: 'volume', mode: 'volume', maxSamples: 1 },
        data: { dimensions: [24, 2, 2], values: Array.from({ length: 96 }, (_, index) => index) },
      },
    ],
  });
  assert.equal(anisotropic.geometries[0].picks.length, 1);

  const isosurface = compileSpatial({
    layers: [
      {
        mark: { type: 'volume', mode: 'isosurface', isoValue: 0.5 },
        data: { dimensions: [2, 2, 2], values },
      },
    ],
  });
  assert.equal(isosurface.geometries[0].primitive, 'triangles');
  assert.ok(isosurface.geometries[0].positions.length >= 9);
  assert.ok(isosurface.geometries[0].picks.length >= 1);
});

test('isosurface polygons have nonzero area, shared edges, and consistent winding', () => {
  const geometry = compileSpatial({
    layers: [
      {
        mark: { type: 'volume', mode: 'isosurface', isoValue: 0.5 },
        data: { dimensions: [2, 2, 2], values: [0, 1, 0, 1, 0, 1, 0, 1] },
      },
    ],
  }).geometries[0];
  const edgeCounts = new Map();
  const pointKey = (point) => point.map((value) => value.toFixed(6)).join(',');
  for (let offset = 0; offset < geometry.positions.length; offset += 9) {
    const points = [0, 1, 2].map((vertex) => [
      geometry.positions[offset + vertex * 3],
      geometry.positions[offset + vertex * 3 + 1],
      geometry.positions[offset + vertex * 3 + 2],
    ]);
    const area =
      length3(cross3(subtract3(points[1], points[0]), subtract3(points[2], points[0]))) / 2;
    assert.ok(area > 1e-8);
    assert.ok(geometry.normals[offset] > 0.99);
    for (const [left, right] of [
      [points[0], points[1]],
      [points[1], points[2]],
      [points[2], points[0]],
    ]) {
      const edge = [pointKey(left), pointKey(right)].sort().join('|');
      edgeCounts.set(edge, (edgeCounts.get(edge) ?? 0) + 1);
    }
  }
  assert.ok([...edgeCounts.values()].some((count) => count === 2));
  assert.ok([...edgeCounts.values()].every((count) => count <= 2));
});

test('cone, streamtube, and spatial scatter compile distinct geometry and semantic picks', () => {
  const cones = compileSpatial({
    layers: [
      {
        mark: { type: 'vector', mode: 'cone', segments: 8 },
        data: {
          origins: [[0, 0, 0]],
          vectors: [[1, 2, 0]],
          labels: ['wind'],
        },
      },
    ],
  });
  assert.equal(cones.geometries[0].primitive, 'triangles');
  assert.equal(cones.geometries[0].picks[0].datum.label, 'wind');
  assert.ok(cones.geometries[0].picks[0].datum.magnitude > 2);

  const streamtube = compileSpatial({
    layers: [
      {
        mark: { type: 'vector', mode: 'streamtube', segments: 6 },
        data: {
          paths: [
            [
              [0, 0, 0],
              [1, 1, 0],
              [2, 1, 1],
            ],
          ],
        },
      },
    ],
  });
  assert.equal(streamtube.geometries[0].primitive, 'triangles');
  assert.equal(streamtube.geometries[0].picks.length, 3);

  const scatter = compileSpatial({
    layers: [
      {
        mark: { type: 'scatter' },
        data: {
          positions: [
            [-1, 0, 0],
            [1, 0, 0],
          ],
          values: [10, 20],
          sizes: [5, 9],
          labels: ['low', 'high'],
        },
      },
    ],
  });
  assert.equal(scatter.geometries[0].primitive, 'points');
  assert.deepEqual(Array.from(scatter.geometries[0].sizes), [5, 9]);
  assert.equal(scatter.geometries[0].picks[1].datum.value, 20);
});

test('globe compiles bundled land, borders, points, and great-circle routes without a provider', () => {
  const scene = compileSpatial({
    layers: [
      {
        id: 'earth',
        mark: { type: 'globe', routeSegments: 12 },
        data: {
          points: [{ longitude: 126.978, latitude: 37.5665, label: 'Seoul', value: 10 }],
          routes: [
            {
              from: [126.978, 37.5665],
              to: [-74.006, 40.7128],
              label: 'Seoul to New York',
            },
          ],
        },
      },
    ],
  });
  assert.deepEqual(
    scene.geometries.map(({ id }) => id),
    ['earth:ocean', 'earth:land', 'earth:borders', 'earth:points', 'earth:routes'],
  );
  assert.ok(scene.geometries.find(({ id }) => id === 'earth:land').positions.length > 10_000);
  assert.equal(scene.geometries.find(({ id }) => id === 'earth:land').picks.length, 177);
  assert.equal(
    scene.geometries.find(({ id }) => id === 'earth:points').picks[0].datum.label,
    'Seoul',
  );
  assert.equal(
    scene.geometries.find(({ id }) => id === 'earth:routes').positions.length,
    12 * 2 * 3,
  );
});

test('exact and near-antipodal globe routes follow a finite continuous great circle', () => {
  for (const to of [
    [180, 0],
    [179.999999, 0.000001],
  ]) {
    const scene = compileSpatial({
      layers: [
        {
          id: 'antipodal',
          mark: { type: 'globe', routeSegments: 32 },
          data: { routes: [{ from: [0, 0], to }] },
        },
      ],
    });
    const positions = scene.geometries.find(({ id }) => id === 'antipodal:routes').positions;
    const points = [Array.from(positions.slice(0, 3))];
    for (let segment = 0; segment < 32; segment += 1) {
      const offset = segment * 6 + 3;
      points.push(Array.from(positions.slice(offset, offset + 3)));
    }
    assert.ok(points.flat().every(Number.isFinite));
    for (let index = 1; index < points.length; index += 1) {
      const distance = length3(subtract3(points[index], points[index - 1]));
      assert.ok(distance > 0.02, `route segment ${index} must not collapse`);
      assert.ok(distance < 0.25, `route segment ${index} must remain continuous`);
    }
    assert.ok(points[Math.floor(points.length / 2)][1] > 1);
  }
});

test('camera matrices project visible data for perspective and orthographic modes', () => {
  for (const projection of ['perspective', 'orthographic']) {
    const camera = normalizedCamera(projection, [0, 0, 0], 1, {
      yaw: 0,
      pitch: 0,
      distance: 5,
      near: 0.1,
      far: 100,
    });
    const projected = projectPoint(viewProjectionMat4(camera, 640, 360), [0, 0, 0], 640, 360);
    assert.equal(projected.visible, true);
    assert.ok(Math.abs(projected.x - 320) < 0.01);
    assert.ok(Math.abs(projected.y - 180) < 0.01);
  }
});

test('programmatic camera and interaction inputs reject non-finite values', () => {
  const current = normalizedCamera('perspective', [0, 0, 0], 1);
  assert.throws(
    () => resolveSpatialCameraPatch(surfaceSpec, current, { yaw: Number.NaN }, 1),
    /finite/,
  );
  assert.throws(() => assertFiniteSpatialNumber('pan deltaX', Number.POSITIVE_INFINITY), /finite/);
  assert.equal(resolveSpatialCameraPatch(surfaceSpec, current, { yaw: 0.25 }, 1).yaw, 0.25);
});

test('fullscreen layout ignores embedded fixed dimensions', () => {
  assert.deepEqual(
    resolveSpatialSize({
      fullscreen: true,
      measuredWidth: 1_920,
      measuredHeight: 1_080,
      configuredWidth: 640,
      configuredHeight: 420,
    }),
    { width: 1_920, height: 1_080 },
  );
  assert.deepEqual(
    resolveSpatialSize({
      fullscreen: false,
      measuredWidth: 1_920,
      measuredHeight: 1_080,
      configuredWidth: 640,
      configuredHeight: 420,
    }),
    { width: 640, height: 420 },
  );
});

test('globe fallback picking rejects an antipodal target hidden by the sphere', () => {
  const scene = compileSpatial({
    layers: [
      {
        mark: { type: 'globe' },
        data: {
          points: [
            { longitude: -90, latitude: 0, label: 'front' },
            { longitude: 90, latitude: 0, label: 'back' },
          ],
        },
      },
    ],
  });
  const picks = scene.geometries.find(({ id }) => id.endsWith(':points')).picks;
  const camera = normalizedCamera('perspective', [0, 0, 0], 1, {
    yaw: 0,
    pitch: 0,
    distance: 5,
  });
  assert.equal(isGlobePickFrontFacing(picks[0], camera), true);
  assert.equal(isGlobePickFrontFacing(picks[1], camera), false);
  assert.equal(
    isGlobePickFrontFacing(
      {
        ...picks[1],
        occlusion: undefined,
        datum: { country: 'ordinary scatter category' },
      },
      camera,
    ),
    true,
  );
});

test('accessible rows stop before traversing later dense geometry', () => {
  const pick = (datumIndex) => ({
    layerId: 'priority',
    layerIndex: 0,
    datumIndex,
    nodeId: `priority:${datumIndex}`,
    position: [datumIndex, 0, 0],
    datum: { datumIndex },
  });
  const empty = new Float32Array();
  const first = {
    id: 'priority:points',
    primitive: 'points',
    positions: empty,
    normals: empty,
    colors: empty,
    sizes: empty,
    picks: [pick(0), pick(1), pick(2)],
  };
  const later = {
    id: 'later',
    primitive: 'points',
    positions: empty,
    normals: empty,
    colors: empty,
    sizes: empty,
    get picks() {
      throw new Error('later picks must not be traversed');
    },
  };
  assert.deepEqual(
    collectAccessibleSpatialPicks([first, later], 2).map(({ datumIndex }) => datumIndex),
    [0, 1],
  );
});

test('custom spatial descriptions remain available together with interaction instructions', () => {
  assert.equal(
    spatialAccessibleDescription('Temperature volume.', 'Drag to orbit.'),
    'Temperature volume. Drag to orbit.',
  );
  assert.equal(spatialAccessibleDescription(undefined, 'Drag to orbit.'), 'Drag to orbit.');
  assert.equal(spatialAccessibleDescription('Drag to orbit.', 'Drag to orbit.'), 'Drag to orbit.');
});

test('fully transparent geometry is excluded while partial alpha keeps a transparent pass', () => {
  assert.equal(
    spatialGeometryAlphaClass({ colors: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0]) }),
    'hidden',
  );
  assert.equal(
    spatialGeometryAlphaClass({ colors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1]) }),
    'opaque',
  );
  assert.equal(
    spatialGeometryAlphaClass({ colors: new Float32Array([1, 0, 0, 0.5, 0, 1, 0, 1]) }),
    'transparent',
  );
});

test('SpatialSpec validation is closed, portable, bounded, and mode-aware', () => {
  assert.deepEqual(validateSpatialSpec(surfaceSpec), []);
  assert.deepEqual(
    validateSpatialSpec({
      ...surfaceSpec,
      interaction: {
        labels: {
          chart: '3D 온도 지도',
          toolbar: '차트 제어',
          instructions: '드래그하여 회전합니다.',
          contextLost: '그래픽 문맥을 복원하고 있습니다.',
          unavailable: '이 환경에서는 공간 차트를 표시할 수 없습니다.',
        },
      },
    }),
    [],
  );
  assert.match(
    validateSpatialSpec({
      ...surfaceSpec,
      interaction: { labels: { toolbar: () => '차트 제어' } },
    })
      .map(({ message }) => message)
      .join(' '),
    /JSON-serializable|Must be a string/,
  );
  assert.match(
    validateSpatialSpec({ ...surfaceSpec, callback: () => true })
      .map(({ message }) => message)
      .join(' '),
    /JSON-serializable|Unknown property/,
  );
  const unsafe = JSON.parse(
    '{"layers":[{"mark":{"type":"scatter"},"data":{"positions":[[0,0,0]],"__proto__":{}}}]}',
  );
  assert.match(
    validateSpatialSpec(unsafe)
      .map(({ message }) => message)
      .join(' '),
    /Unsafe key/,
  );
  assert.match(
    validateSpatialSpec({
      layers: [
        {
          mark: { type: 'volume', maxSamples: 250_001 },
          data: { dimensions: [2, 2, 2], values: Array(8).fill(0) },
        },
      ],
    })
      .map(({ path }) => path)
      .join(' '),
    /maxSamples/,
  );
  assert.match(
    validateSpatialSpec({
      layers: [
        {
          mark: { type: 'vector', mode: 'cone', segments: 49 },
          data: { origins: [[0, 0, 0]], vectors: [[1, 0, 0]] },
        },
      ],
    })
      .map(({ path }) => path)
      .join(' '),
    /segments/,
  );
  assert.match(
    validateSpatialSpec({
      layers: [
        { mark: { type: 'surface', mode: 'mesh' }, data: { rows: 2, columns: 2, z: [0, 0, 0, 0] } },
      ],
    })
      .map(({ path }) => path)
      .join(' '),
    /positions|triangles|rows/,
  );
});

test('omitted surface and vector modes are inferred consistently from data shape', () => {
  const mesh = {
    layers: [
      {
        mark: { type: 'surface' },
        data: {
          positions: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
          ],
          triangles: [[0, 1, 2]],
        },
      },
    ],
  };
  const streamtube = {
    layers: [
      {
        mark: { type: 'vector' },
        data: {
          paths: [
            [
              [0, 0, 0],
              [1, 1, 0],
            ],
          ],
        },
      },
    ],
  };
  assert.deepEqual(validateSpatialSpec(mesh), []);
  assert.deepEqual(validateSpatialSpec(streamtube), []);
  assert.equal(compileSpatial(mesh).geometries[0].primitive, 'triangles');
  assert.equal(compileSpatial(streamtube).geometries[0].picks.length, 2);
});

test('derived isosurface, streamtube, and globe route output is bounded before allocation', () => {
  const oversized = [
    {
      layers: [
        {
          mark: { type: 'volume', mode: 'isosurface', isoValue: 0.5 },
          data: { dimensions: [40, 40, 40], values: Array(40 * 40 * 40).fill(0) },
        },
      ],
    },
    {
      layers: [
        {
          mark: { type: 'vector', mode: 'streamtube', segments: 48 },
          data: { paths: [Array(42_000).fill([0, 0, 0])] },
        },
      ],
    },
    {
      layers: [
        {
          mark: { type: 'globe', routeSegments: 128 },
          data: {
            routes: Array(8_000).fill({ from: [0, 0], to: [10, 10] }),
          },
        },
      ],
    },
  ];
  for (const spec of oversized) {
    assert.match(
      validateSpatialSpec(spec)
        .map(({ message }) => message)
        .join(' '),
      /Derived output/,
    );
  }
  assert.throws(() => compileSpatial(oversized[0]), /Derived output/);
});

test('spatial JSON schema is versioned and closes every object declaration', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.spatial.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(schema['x-graflume-spec-version'], '0.1');
  assert.deepEqual(schema['x-graflume-runtime-output-limits'], spatialOutputLimits);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ['layers']);
  const openObjects = [];
  const visit = (value, path = '$') => {
    if (value === null || typeof value !== 'object') return;
    if (value.type === 'object' && value.additionalProperties !== false) openObjects.push(path);
    for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`);
  };
  visit(schema);
  assert.deepEqual(openObjects, []);
  assert.equal(schema.$defs.layer.oneOf.length, 8);
  assert.deepEqual(schema.$defs.meshMark.required, ['type']);
  assert.deepEqual(schema.$defs.streamtubeMark.required, ['type']);
  assert.equal(schema.$defs.coneMark.properties.segments.maximum, 48);
  assert.equal(schema.$defs.streamtubeMark.properties.segments.maximum, 48);
  assert.deepEqual(
    Object.keys(schema.$defs.controlLabels.properties).filter((key) =>
      ['chart', 'toolbar', 'instructions', 'contextLost', 'unavailable'].includes(key),
    ),
    ['chart', 'toolbar', 'instructions', 'contextLost', 'unavailable'],
  );
  assert.equal(schema.$defs.controls.properties.annotations.type, 'boolean');
  assert.deepEqual(schema.$defs.interaction.properties.controls.oneOf, [
    { type: 'boolean' },
    { $ref: '#/$defs/controls' },
  ]);
  assert.equal(schema.$defs.controlLabels.properties.showAnnotations.type, 'string');
  assert.equal(schema.$defs.controlLabels.properties.hideAnnotations.type, 'string');
  assert.deepEqual(schema.$defs.controls.additionalProperties, false);
});

test('spatial annotation controls and localized visibility labels validate portably', () => {
  const base = {
    interaction: {
      controls: { annotations: true },
      labels: { showAnnotations: '주석 보기', hideAnnotations: '주석 숨기기' },
    },
    layers: [
      {
        mark: { type: 'scatter' },
        data: { positions: [[0, 0, 0]] },
      },
    ],
  };
  assert.deepEqual(validateSpatialSpec(base), []);
  const issues = validateSpatialSpec({
    ...base,
    interaction: {
      controls: { annotations: 'yes', html: true },
      labels: { showAnnotations: 1, hideAnnotations: () => 'unsafe' },
    },
  });
  const paths = new Set(issues.map(({ path }) => path));
  assert.ok(paths.has('$.interaction.controls.annotations'));
  assert.ok(paths.has('$.interaction.controls.html'));
  assert.ok(paths.has('$.interaction.labels.showAnnotations'));
  assert.ok(paths.has('$.interaction.labels.hideAnnotations'));
});
