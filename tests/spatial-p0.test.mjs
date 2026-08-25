import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileSpatial,
  computeSurfaceNormalGeometry,
  evaluateVolumeTransfer,
  extractSurfaceContourSegments,
  generateVectorFieldSeeds,
  integrateVectorField,
  normalizeVolumeValue,
  projectVolumeRays,
  sampleVectorField,
  sampleVolumeSlice,
  sampleVolumeValue,
  validateSpatialSpec,
  vectorField,
} from '../.tmp/src/spatial.js';

function roles(scene) {
  return scene.geometries.map(({ role }) => role);
}

test('surface P0 compiles flat shading, filled wire overlay and bounded contour projections', () => {
  const spec = {
    layers: [
      {
        id: 'terrain',
        mark: {
          type: 'surface',
          normalMode: 'flat',
          wireOverlay: { color: '#111827', opacity: 0.8 },
          contours: {
            levels: [0.25, 0.75],
            projection: 'both',
            baseHeight: -1,
            maxSegments: 20,
          },
        },
        data: { rows: 2, columns: 2, z: [0, 0.5, 0.25, 1] },
      },
    ],
  };
  assert.deepEqual(validateSpatialSpec(spec), []);
  const scene = compileSpatial(spec);
  assert.deepEqual(roles(scene), ['primary', 'wire-overlay', 'contour', 'contour']);
  const fill = scene.geometries[0];
  assert.equal(fill.primitive, 'triangles');
  assert.equal(fill.indices, undefined);
  assert.equal(fill.positions.length / 3, 6);
  assert.equal(fill.provenance.operation, 'flat-normal-surface');
  assert.equal(scene.geometries[1].primitive, 'lines');
  assert.equal(scene.geometries[1].picks.length, 0);
  const contours = scene.geometries.filter(({ role }) => role === 'contour');
  assert.ok(
    contours.every(({ primitive, positions }) => primitive === 'lines' && positions.length > 0),
  );
  const base = contours.find(({ id }) => id.endsWith(':base'));
  for (let index = 1; index < base.positions.length; index += 3)
    assert.equal(base.positions[index], -1);
  assert.ok(
    contours
      .flatMap(({ picks }) => picks)
      .every(({ datum }) => ['surface', 'base'].includes(datum.projection)),
  );
});

test('surface CPU references preserve smooth topology and exact flat face normals', () => {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1]);
  const indices = new Uint32Array([0, 1, 2, 1, 3, 2]);
  const smooth = computeSurfaceNormalGeometry(positions, indices, 'smooth');
  const flat = computeSurfaceNormalGeometry(positions, indices, 'flat');
  assert.equal(smooth.positions, positions);
  assert.equal(smooth.indices, indices);
  assert.equal(smooth.normals.length, positions.length);
  assert.equal(flat.indices, undefined);
  assert.equal(flat.positions.length / 3, indices.length);
  assert.deepEqual(Array.from(flat.normals.slice(0, 3)), Array.from(flat.normals.slice(3, 6)));
  assert.notDeepEqual(Array.from(flat.normals.slice(0, 3)), Array.from(flat.normals.slice(9, 12)));
  const contours = extractSurfaceContourSegments(positions, indices, [0, 1, 0, 1], {
    levels: [0.5],
    maxSegments: 1,
  });
  assert.equal(contours.length, 1);
  assert.equal(contours[0].level, 0.5);
});

const volumeData = {
  dimensions: [3, 3, 3],
  values: Array.from({ length: 27 }, (_, index) => {
    const z = Math.floor(index / 9);
    const y = Math.floor((index - z * 9) / 3);
    const x = index % 3;
    return x + y * 2 + z * 3;
  }),
  origin: [0, 0, 0],
  spacing: [1, 1, 1],
};

const volumeContext = {
  data: volumeData,
  minimum: 0,
  maximum: 12,
  transfer: [
    { offset: 0, color: [0, 0, 1, 0.05] },
    { offset: 1, color: [1, 0, 0, 0.9] },
  ],
  transferInterpolation: 'linear',
};

test('step transfer reaches authored stops and transparent point volumes are not pickable', () => {
  const stops = [
    { offset: 0, color: [0, 0, 1, 0] },
    { offset: 0.5, color: [0, 1, 0, 0.4] },
    { offset: 1, color: [1, 0, 0, 0.8] },
  ];
  assert.deepEqual(evaluateVolumeTransfer(stops, 0.499, 'step'), stops[0].color);
  assert.deepEqual(evaluateVolumeTransfer(stops, 0.5, 'step'), stops[1].color);
  assert.deepEqual(evaluateVolumeTransfer(stops, 0.999, 'step'), stops[1].color);
  assert.deepEqual(evaluateVolumeTransfer(stops, 1, 'step'), stops[2].color);

  const transparent = compileSpatial({
    layers: [
      {
        id: 'transparent-volume',
        mark: {
          type: 'volume',
          transferFunction: {
            stops: [
              { offset: 0, color: '#000000', opacity: 0 },
              { offset: 1, color: '#ffffff', opacity: 0 },
            ],
          },
        },
        data: { dimensions: [2, 2, 2], values: Array(8).fill(1) },
      },
    ],
  }).geometries[0];
  assert.equal(transparent.picks.length, 0);
  assert.ok(
    Array.from(transparent.colors).every((channel, index) => index % 4 !== 3 || channel === 0),
  );
});

test('raycast opacity is optical-step corrected and depth converges as sample count increases', () => {
  const homogeneousData = {
    dimensions: [2, 2, 9],
    values: Array(36).fill(1),
    spacing: [1, 1, 1],
  };
  const homogeneousContext = {
    data: homogeneousData,
    minimum: 0,
    maximum: 1,
    transfer: [
      { offset: 0, color: [0.25, 0.5, 0.75, 0.2] },
      { offset: 1, color: [0.25, 0.5, 0.75, 0.2] },
    ],
    transferInterpolation: 'linear',
  };
  const ray = (samples) =>
    projectVolumeRays(homogeneousContext, {
      method: 'raycast',
      axis: 'z',
      resolution: [2, 2],
      samples,
      interpolation: 'linear',
    })[0];
  const coarse = ray(17);
  const fine = ray(129);
  const expectedAlpha = 1 - 0.8 ** 8;
  const extinction = -Math.log(0.8);
  const expectedDepth = (1 / extinction - 8 / Math.expm1(extinction * 8)) / 8;
  assert.ok(Math.abs(coarse.color[3] - expectedAlpha) < 1e-12);
  assert.ok(Math.abs(fine.color[3] - expectedAlpha) < 1e-12);
  assert.ok(Math.abs(fine.depth - expectedDepth) < Math.abs(coarse.depth - expectedDepth));
  assert.ok(Math.abs(fine.depth - coarse.depth) < 0.001);
});

test('oblique slices choose a non-degenerate least-parallel basis when up matches normal', () => {
  const samples = sampleVolumeSlice(
    volumeContext,
    {
      type: 'oblique',
      origin: [1, 1, 1],
      normal: [1, 0, 0],
      up: [1, 0, 0],
      size: [2, 2],
    },
    { resolution: [3, 3], interpolation: 'linear', opacity: 1 },
  );
  assert.equal(new Set(samples.map(({ position }) => position.join(','))).size, 9);
  assert.ok(samples.every(({ position }) => Math.abs(position[0] - 1) < 1e-12));
  assert.deepEqual(
    [
      Math.min(...samples.map(({ position }) => position[1])),
      Math.max(...samples.map(({ position }) => position[1])),
      Math.min(...samples.map(({ position }) => position[2])),
      Math.max(...samples.map(({ position }) => position[2])),
    ],
    [0, 2, 0, 2],
  );
  assert.ok(samples.every(({ rawValue }) => rawValue !== null));
});

test('volume CPU reference executes raycast, MIP, minIP, average, window-level and slices', () => {
  assert.equal(sampleVolumeValue(volumeData, [1, 1, 1], 'nearest'), 6);
  assert.equal(sampleVolumeValue(volumeData, [0.5, 0.5, 0.5], 'linear'), 3);
  assert.equal(normalizeVolumeValue(6, 0, 12, { window: 4, level: 6 }), 0.5);
  const projected = Object.fromEntries(
    ['raycast', 'mip', 'minip', 'average'].map((method) => [
      method,
      projectVolumeRays(volumeContext, {
        method,
        axis: 'z',
        resolution: [2, 2],
        samples: 3,
        interpolation: 'nearest',
      })[0],
    ]),
  );
  assert.equal(projected.mip.rawValue, 6);
  assert.equal(projected.minip.rawValue, 0);
  assert.equal(projected.average.rawValue, 3);
  assert.ok(projected.raycast.color[3] > 0 && projected.raycast.color[3] <= 1);
  const orthogonal = sampleVolumeSlice(
    volumeContext,
    { type: 'orthogonal', axis: 'z', position: 0.5 },
    { resolution: [3, 3], interpolation: 'nearest', opacity: 1 },
  );
  const oblique = sampleVolumeSlice(
    volumeContext,
    { type: 'oblique', origin: [1, 1, 1], normal: [1, 1, 0], size: [2, 2] },
    { resolution: [3, 3], interpolation: 'linear', opacity: 0.8 },
  );
  assert.equal(orthogonal.length, 9);
  assert.equal(orthogonal[4].rawValue, 6);
  assert.equal(oblique.length, 9);
  assert.equal(oblique[4].rawValue, 6);
});

test('volume P0 emits actual WebGL triangle geometry for projection, caps and arbitrary slices', () => {
  const spec = {
    layers: [
      {
        id: 'scan',
        mark: {
          type: 'volume',
          transferFunction: {
            stops: [
              { offset: 0, color: '#0000ff', opacity: 0 },
              { offset: 0.5, color: '#22c55e', opacity: 0.35 },
              { offset: 1, color: '#ef4444', opacity: 0.9 },
            ],
          },
          windowLevel: { window: 8, level: 5 },
          render: {
            method: 'mip',
            axis: 'z',
            resolution: [4, 4],
            samples: 5,
            caps: 'both',
          },
          slices: [
            { type: 'orthogonal', axis: 'x', position: 0.5, resolution: [4, 4] },
            {
              type: 'oblique',
              origin: [1, 1, 1],
              normal: [1, 1, 0],
              size: [2, 2],
              resolution: [4, 4],
            },
          ],
        },
        data: volumeData,
      },
    ],
  };
  assert.deepEqual(validateSpatialSpec(spec), []);
  const scene = compileSpatial(spec);
  assert.deepEqual(roles(scene), [
    'volume-projection',
    'volume-cap',
    'volume-cap',
    'volume-slice',
    'volume-slice',
  ]);
  assert.ok(scene.geometries.every(({ primitive }) => primitive === 'triangles'));
  assert.ok(scene.geometries.every(({ indices }) => indices.length === 54));
  assert.ok(scene.geometries.every(({ provenance }) => provenance?.bounded === true));
  assert.ok(
    scene.geometries
      .flatMap(({ picks }) => picks)
      .some(({ datum }) => datum.renderMethod === 'mip' && datum.sampleCount === 5),
  );
});

const vectorFieldData = {
  dimensions: [3, 3, 3],
  vectors: Array.from({ length: 27 }, () => [1, 0, 0]),
  origin: [0, 0, 0],
  spacing: [1, 1, 1],
  seeds: [[0.1, 1, 1]],
  labels: ['center seed'],
};

test('seeded adaptive 3D field integration is deterministic, bounded and provenance-rich', () => {
  assert.deepEqual(sampleVectorField(vectorFieldData, [1, 1, 1]), {
    vector: [1, 0, 0],
    magnitude: 1,
  });
  const options = {
    direction: 'forward',
    initialStep: 0.2,
    minStep: 0.025,
    maxStep: 0.4,
    tolerance: 1e-6,
    maxSteps: 20,
    maxLength: 4,
  };
  const first = integrateVectorField(vectorFieldData, options);
  const second = integrateVectorField(vectorFieldData, options);
  assert.deepEqual(first, second);
  assert.equal(first.seeds.length, 1);
  assert.ok(first.paths[0].points.length >= 3);
  assert.ok(
    first.paths[0].points.every(
      (point, index, points) => index === 0 || point[0] > points[index - 1][0],
    ),
  );
  assert.ok(first.acceptedSteps > 0);

  const generatedA = generateVectorFieldSeeds({
    ...vectorFieldData,
    seeds: undefined,
    labels: undefined,
    seedGrid: { dimensions: [2, 2, 2], jitter: 0.2, seed: 42 },
  });
  const generatedB = generateVectorFieldSeeds({
    ...vectorFieldData,
    seeds: undefined,
    labels: undefined,
    seedGrid: { dimensions: [2, 2, 2], jitter: 0.2, seed: 42 },
  });
  assert.deepEqual(generatedA, generatedB);
  assert.equal(generatedA.length, 8);
});

test('filtered explicit vector seeds retain original label, color, and provenance indices', () => {
  const authored = {
    ...vectorFieldData,
    seeds: [
      [-1, 1, 1],
      [0.1, 1, 1],
      [0.1, 1, 1],
      [0.2, 1, 1],
    ],
    labels: ['outside', 'first retained', 'duplicate', 'second retained'],
    colors: ['#ff0000', '#00ff00', '#ffff00', '#0000ff'],
  };
  const integrationOptions = {
    direction: 'forward',
    initialStep: 0.2,
    minStep: 0.025,
    maxStep: 0.4,
    tolerance: 1e-6,
    maxSteps: 20,
    maxLength: 4,
  };
  const integrated = integrateVectorField(authored, integrationOptions);
  assert.equal(integrated.sourceSeedCount, 4);
  assert.deepEqual(integrated.seedSourceIndices, [1, 3]);
  assert.deepEqual(
    integrated.paths.map(({ seedIndex, seedSource }) => [seedIndex, seedSource]),
    [
      [1, 'explicit'],
      [3, 'explicit'],
    ],
  );

  const geometry = compileSpatial({
    layers: [
      {
        id: 'filtered-flow',
        mark: {
          type: 'vector',
          mode: 'streamtube',
          segments: 5,
          integration: integrationOptions,
        },
        data: authored,
      },
    ],
  }).geometries[0];
  assert.deepEqual([...new Set(geometry.picks.map(({ datum }) => datum.seedIndex))], [1, 3]);
  assert.deepEqual(
    [...new Set(geometry.picks.map(({ datum }) => datum.label))],
    ['first retained', 'second retained'],
  );
  assert.deepEqual(geometry.provenance.parameters.seedSourceIndices, [1, 3]);
  assert.equal(geometry.provenance.sourceElements, 4);
  assert.equal(geometry.provenance.parameters.retainedSeeds, 2);
  assert.deepEqual(Array.from(geometry.colors.slice(0, 4)), [0, 1, 0, 1]);
  assert.deepEqual(Array.from(geometry.colors.slice(-4)), [0, 0, 1, 1]);
});

test('raw vector fields compile through integrated streamtube WebGL geometry and public API', () => {
  assert.equal(typeof vectorField, 'function');
  const spec = {
    layers: [
      {
        id: 'flow',
        mark: {
          type: 'vector',
          mode: 'streamtube',
          segments: 5,
          magnitudeEncoding: 'color-radius',
          integration: {
            direction: 'forward',
            initialStep: 0.2,
            minStep: 0.025,
            maxStep: 0.4,
            tolerance: 1e-6,
            maxSteps: 20,
            maxLength: 4,
          },
        },
        data: vectorFieldData,
      },
    ],
  };
  assert.deepEqual(validateSpatialSpec(spec), []);
  const geometry = compileSpatial(spec).geometries[0];
  assert.equal(geometry.primitive, 'triangles');
  assert.equal(geometry.role, 'integrated-streamtube');
  assert.equal(geometry.provenance.operation, 'adaptive-rk4-step-doubling');
  assert.ok(geometry.indices.length > 0);
  assert.ok(geometry.picks.length >= 3);
  assert.ok(geometry.picks.every(({ datum }) => datum.magnitude === 1));
  assert.equal(geometry.picks[0].datum.seedIndex, 0);
});

test('spatial P0 validation and JSON Schema remain closed, portable and bounded', async () => {
  const invalid = [
    {
      layers: [
        {
          mark: {
            type: 'surface',
            wireframe: true,
            wireOverlay: true,
            contours: { levels: [1], count: 4 },
          },
          data: { rows: 2, columns: 2, z: [0, 0, 0, 1] },
        },
      ],
    },
    {
      layers: [
        {
          mark: {
            type: 'volume',
            transferFunction: {
              stops: [
                { offset: 0.8, color: 'red' },
                { offset: 0.2, color: 'blue' },
              ],
            },
            slices: [{ type: 'oblique', origin: [0, 0, 0], normal: [0, 0, 0] }],
          },
          data: volumeData,
        },
      ],
    },
    {
      layers: [
        {
          mark: {
            type: 'vector',
            mode: 'streamtube',
            integration: { minStep: 1, maxStep: 0.1 },
          },
          data: { ...vectorFieldData, vectors: [[1, 0, 0]] },
        },
      ],
    },
  ];
  assert.match(
    validateSpatialSpec(invalid[0])
      .map(({ message }) => message)
      .join(' '),
    /cannot also|either/,
  );
  assert.match(
    validateSpatialSpec(invalid[1])
      .map(({ message }) => message)
      .join(' '),
    /increasing|non-zero/,
  );
  assert.match(
    validateSpatialSpec(invalid[2])
      .map(({ message }) => message)
      .join(' '),
    /exactly|maxStep/,
  );

  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.spatial.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(schema.$defs.layer.oneOf.length, 8);
  assert.equal(schema.$defs.surfaceGridMark.properties.normalMode.enum[0], 'flat');
  assert.deepEqual(schema.$defs.volumeRender.properties.method.enum, [
    'raycast',
    'mip',
    'minip',
    'average',
  ]);
  assert.equal(schema.$defs.volumeSlice.oneOf.length, 2);
  assert.equal(schema.$defs.vectorFieldData.additionalProperties, false);
  assert.equal(schema.$defs.vectorIntegration.properties.maxSteps.maximum, 4096);
});
