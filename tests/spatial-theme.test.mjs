import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileSpatial, validateSpatialSpec } from '../.tmp/src/spatial.js';
import { spatialColor } from '../.tmp/src/spatial/compile.js';
import { continuousColor } from '../.tmp/src/theme/color.js';

const volumeData = {
  dimensions: [2, 2, 2],
  values: [0, 1, 1, 0, 1, 0, 0, 1],
};

const modeSpecs = {
  surface: {
    layers: [
      {
        mark: { type: 'surface', mode: 'surface' },
        data: { rows: 2, columns: 2, z: [0, 1, 1, 0] },
      },
    ],
  },
  mesh: {
    layers: [
      {
        mark: { type: 'surface', mode: 'mesh' },
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
  },
  volume: {
    layers: [{ mark: { type: 'volume', mode: 'volume' }, data: volumeData }],
  },
  isosurface: {
    layers: [{ mark: { type: 'volume', mode: 'isosurface', isoValue: 0.5 }, data: volumeData }],
  },
  'vector-cone': {
    layers: [
      {
        mark: { type: 'vector', mode: 'cone' },
        data: { origins: [[0, 0, 0]], vectors: [[1, 0.5, 0]] },
      },
    ],
  },
  streamtube: {
    layers: [
      {
        mark: { type: 'vector', mode: 'streamtube' },
        data: {
          paths: [
            [
              [0, 0, 0],
              [1, 0.5, 0],
              [2, 0.5, 1],
            ],
          ],
        },
      },
    ],
  },
  'spatial-scatter': {
    layers: [
      {
        mark: { type: 'scatter' },
        data: {
          positions: [
            [0, 0, 0],
            [1, 1, 1],
          ],
          values: [0, 1],
        },
      },
    ],
  },
  globe: {
    layers: [
      {
        id: 'world',
        mark: { type: 'globe', routeSegments: 8 },
        data: {
          points: [{ longitude: 126.978, latitude: 37.5665 }],
          routes: [{ from: [126.978, 37.5665], to: [-74.006, 40.7128] }],
        },
      },
    ],
  },
};

function rgbaAt(geometry, vertex = 0) {
  return Array.from(geometry.colors.slice(vertex * 4, vertex * 4 + 4));
}

function assertColor(actual, expected, message) {
  const wanted = spatialColor(expected);
  actual.forEach((value, index) =>
    assert.ok(Math.abs(value - wanted[index]) < 1e-6, `${message} channel ${index}`),
  );
}

test('ggplot theme covers all eight spatial modes without changing geometry or picks', () => {
  for (const [mode, spec] of Object.entries(modeSpecs)) {
    const baseline = compileSpatial(spec);
    const themed = compileSpatial({ ...spec, theme: 'ggplot' });
    assert.equal(themed.theme.name, 'ggplot', `${mode} resolves ggplot`);
    assert.equal(themed.theme.colors.background, '#FFFFFF', `${mode} chrome background`);
    assert.equal(themed.theme.colors.panel, '#EBEBEB', `${mode} viewport panel`);
    assert.equal(themed.theme.colors.text, '#000000', `${mode} text`);
    assert.equal(themed.theme.colors.mutedText, '#4D4D4D', `${mode} muted text`);
    assert.deepEqual(themed.bounds, baseline.bounds, `${mode} bounds`);
    assert.equal(themed.geometries.length, baseline.geometries.length, `${mode} geometry count`);
    themed.geometries.forEach((geometry, index) => {
      const prior = baseline.geometries[index];
      assert.deepEqual(geometry.positions, prior.positions, `${mode} positions ${index}`);
      assert.deepEqual(geometry.normals, prior.normals, `${mode} normals ${index}`);
      assert.deepEqual(geometry.sizes, prior.sizes, `${mode} sizes ${index}`);
      assert.deepEqual(geometry.indices, prior.indices, `${mode} indices ${index}`);
      assert.deepEqual(geometry.picks, prior.picks, `${mode} picks ${index}`);
    });
  }
});

test('ggplot spatial defaults use its continuous and categorical scales in every mode', () => {
  const surface = compileSpatial({ ...modeSpecs.surface, theme: 'ggplot' }).geometries[0];
  assertColor(rgbaAt(surface, 0), '#132B43', 'surface low');
  assertColor(rgbaAt(surface, 1), '#56B1F7', 'surface high');

  const mesh = compileSpatial({ ...modeSpecs.mesh, theme: 'ggplot' }).geometries[0];
  assertColor(rgbaAt(mesh), '#F8766D', 'mesh category');

  const volume = compileSpatial({ ...modeSpecs.volume, theme: 'ggplot' }).geometries[0];
  assertColor(rgbaAt(volume, 0).slice(0, 3), spatialColor('#132B43').slice(0, 3), 'volume low');
  assertColor(rgbaAt(volume, 1).slice(0, 3), spatialColor('#56B1F7').slice(0, 3), 'volume high');

  const isosurface = compileSpatial({ ...modeSpecs.isosurface, theme: 'ggplot' }).geometries[0];
  assertColor(rgbaAt(isosurface).slice(0, 3), spatialColor('#56B1F7').slice(0, 3), 'isosurface');

  const cone = compileSpatial({ ...modeSpecs['vector-cone'], theme: 'ggplot' }).geometries[0];
  assertColor(rgbaAt(cone), '#F8766D', 'cone category');

  const streamtube = compileSpatial({ ...modeSpecs.streamtube, theme: 'ggplot' }).geometries[0];
  assertColor(rgbaAt(streamtube), '#F8766D', 'streamtube category');

  const scatter = compileSpatial({
    ...modeSpecs['spatial-scatter'],
    theme: 'ggplot',
  }).geometries[0];
  assertColor(rgbaAt(scatter, 0), '#132B43', 'scatter low');
  assertColor(rgbaAt(scatter, 1), '#56B1F7', 'scatter high');

  const globe = compileSpatial({ ...modeSpecs.globe, theme: 'ggplot' });
  assertColor(
    rgbaAt(globe.geometries.find(({ id }) => id === 'world:ocean')),
    continuousColor(globe.theme, 0.12),
    'globe ocean',
  );
  assertColor(
    rgbaAt(globe.geometries.find(({ id }) => id === 'world:borders')),
    '#4D4D4D',
    'globe border',
  );
  assertColor(
    rgbaAt(globe.geometries.find(({ id }) => id === 'world:points')),
    '#F8766D',
    'globe point',
  );
  assertColor(
    rgbaAt(globe.geometries.find(({ id }) => id === 'world:routes')),
    '#00BFC4',
    'globe route',
  );
});

test('the default spatial theme preserves the pre-theme geometry colours', () => {
  const surface = compileSpatial(modeSpecs.surface).geometries[0];
  assertColor(rgbaAt(surface, 0), '#0ea5e9', 'surface low');
  assertColor(rgbaAt(surface, 1), '#7c3aed', 'surface high');

  const mesh = compileSpatial(modeSpecs.mesh).geometries[0];
  assertColor(rgbaAt(mesh), [0.31, 0.275, 0.898, 1], 'mesh');

  const volume = compileSpatial(modeSpecs.volume).geometries[0];
  assertColor(rgbaAt(volume, 0).slice(0, 3), spatialColor('#0ea5e9').slice(0, 3), 'volume low');
  assertColor(rgbaAt(volume, 1).slice(0, 3), spatialColor('#f43f5e').slice(0, 3), 'volume high');

  const isosurface = compileSpatial(modeSpecs.isosurface).geometries[0];
  assertColor(rgbaAt(isosurface).slice(0, 3), spatialColor('#7c3aed').slice(0, 3), 'isosurface');

  const cone = compileSpatial(modeSpecs['vector-cone']).geometries[0];
  assertColor(rgbaAt(cone), '#0f9f8a', 'cone');

  const streamtube = compileSpatial(modeSpecs.streamtube).geometries[0];
  assertColor(rgbaAt(streamtube), '#0284c7', 'streamtube');

  const scatter = compileSpatial(modeSpecs['spatial-scatter']).geometries[0];
  assertColor(rgbaAt(scatter, 0), '#06b6d4', 'scatter low');
  assertColor(rgbaAt(scatter, 1), '#7c3aed', 'scatter high');

  const globe = compileSpatial(modeSpecs.globe);
  assertColor(rgbaAt(globe.geometries.find(({ id }) => id === 'world:ocean')), '#bfdbfe', 'ocean');
  assertColor(rgbaAt(globe.geometries.find(({ id }) => id === 'world:land')), '#dce7d5', 'land');
  assertColor(
    rgbaAt(globe.geometries.find(({ id }) => id === 'world:borders')),
    '#64748b',
    'border',
  );
  assertColor(rgbaAt(globe.geometries.find(({ id }) => id === 'world:points')), '#dc2626', 'point');
  assertColor(rgbaAt(globe.geometries.find(({ id }) => id === 'world:routes')), '#f97316', 'route');
});

test('spatial authored background, mark colors, and datum colors override ggplot defaults', () => {
  const mesh = compileSpatial({
    theme: 'ggplot',
    background: '#010203',
    layers: [
      {
        mark: { type: 'surface', mode: 'mesh', color: '#203040' },
        data: {
          positions: [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
          ],
          triangles: [[0, 1, 2]],
          colors: ['#304050', '#405060', '#506070'],
        },
      },
    ],
  });
  assert.equal(mesh.spec.background, '#010203');
  assertColor(rgbaAt(mesh.geometries[0], 0), '#304050', 'mesh datum');

  const cone = compileSpatial({
    theme: 'ggplot',
    layers: [
      {
        mark: { type: 'vector', mode: 'cone', color: '#102030' },
        data: { origins: [[0, 0, 0]], vectors: [[1, 0, 0]], colors: ['#405060'] },
      },
    ],
  });
  assertColor(rgbaAt(cone.geometries[0]), '#405060', 'cone datum');

  const scatter = compileSpatial({
    theme: 'ggplot',
    layers: [
      {
        mark: { type: 'scatter', color: '#102030' },
        data: { positions: [[0, 0, 0]], colors: ['#506070'] },
      },
    ],
  });
  assertColor(rgbaAt(scatter.geometries[0]), '#506070', 'scatter datum');

  const globe = compileSpatial({
    theme: 'ggplot',
    layers: [
      {
        id: 'world',
        mark: { type: 'globe', pointColor: '#102030', routeColor: '#203040' },
        data: {
          points: [{ longitude: 0, latitude: 0, color: '#607080' }],
          routes: [{ from: [0, 0], to: [10, 10], color: '#708090' }],
        },
      },
    ],
  });
  assertColor(
    rgbaAt(globe.geometries.find(({ id }) => id === 'world:points')),
    '#607080',
    'globe point datum',
  );
  assertColor(
    rgbaAt(globe.geometries.find(({ id }) => id === 'world:routes')),
    '#708090',
    'globe route datum',
  );
});

test('spatial theme validation and schema accept registered names and closed custom overrides', async () => {
  assert.deepEqual(validateSpatialSpec({ ...modeSpecs.mesh, theme: 'ggplot' }), []);
  assert.deepEqual(
    validateSpatialSpec({
      ...modeSpecs.mesh,
      theme: {
        extends: 'ggplot',
        colors: { panel: '#E0E0E0', paletteMode: 'ggplot2-hue' },
        typography: { axisLabelSize: 12 },
        spacing: { plotMargin: 8 },
        axis: { lineVisible: false, titleGap: 6 },
        mark: { pointStrokeWidth: 1, barWidthRatio: 0.9, areaStrokeVisible: false },
        legend: {
          borderWidth: 0,
          swatchSize: 18,
          lineWidth: 2,
          pointRadius: 3,
          pointStrokeWidth: 1,
          lineCap: 'butt',
        },
      },
    }),
    [],
  );
  assert.ok(
    validateSpatialSpec({ ...modeSpecs.mesh, theme: '' }).some(({ path }) => path === '$.theme'),
  );
  assert.ok(
    validateSpatialSpec({ ...modeSpecs.mesh, theme: 42 }).some(({ path }) => path === '$.theme'),
  );
  assert.ok(
    validateSpatialSpec({ ...modeSpecs.mesh, theme: { mystery: true } }).some(
      ({ path }) => path === '$.theme.mystery',
    ),
  );
  assert.throws(
    () => compileSpatial({ ...modeSpecs.mesh, theme: 'missing-theme' }),
    /Unknown theme/,
  );

  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.spatial.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(schema.properties.theme.oneOf[1].$ref, '#/$defs/theme');
  assert.equal(schema.$defs.theme.additionalProperties, false);
  assert.equal(schema.$defs.themeColors.properties.panel.type, 'string');
  assert.deepEqual(schema.$defs.themeColors.properties.paletteMode.enum, ['fixed', 'ggplot2-hue']);
});
