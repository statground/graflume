import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compile,
  fullCatalog,
  fullVariantCatalog,
  resolveTechnicalIndicatorCapability,
} from '../.tmp/src/complete.js';
import { seriesSampleSpec } from '../scripts/series-samples.mjs';
import { spatialSampleSpecs } from '../scripts/spatial-samples.mjs';

function sample(entry) {
  const capability =
    entry.familyId === 'technical-indicator' ? resolveTechnicalIndicatorCapability(entry.id) : null;
  return seriesSampleSpec({
    ...entry,
    ...(capability === null ? {} : { technicalIndicatorCapability: capability }),
  });
}

function representative(family) {
  const modes = fullVariantCatalog.filter(({ familyId }) => familyId === family.id);
  return modes.find(({ quickApi }) => quickApi === family.quickApi) ?? modes[0];
}

function stringsIn(value, strings = []) {
  if (typeof value === 'string') {
    strings.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) stringsIn(item, strings);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) stringsIn(item, strings);
  }
  return strings;
}

function assertFiniteNumbers(value, path = 'data') {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${path} is finite`);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteNumbers(item, `${path}[${index}]`));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      assertFiniteNumbers(item, `${path}.${key}`);
    }
  }
}

const placeholderLabels = [
  /^(?:build|starter|growth|scale)\s+\d+$/i,
  /^s\d{3}$/i,
  /^(?:shell|cyclone)\s+\d+:\d+$/i,
  /^arm\s+\d+\s*·\s*star\s+\d+$/i,
  /^core star\s+\d+$/i,
  /^helical flow\s+\d+$/i,
];

test('every Canvas mode uses a curated story and remains legible at product viewports', () => {
  assert.ok(fullVariantCatalog.length >= 168);
  for (const entry of fullVariantCatalog) {
    const spec = sample(entry);
    assert.ok(Array.isArray(spec.data) && spec.data.length > 0, `${entry.id} has data`);
    assert.ok(
      typeof spec.title?.subtitle === 'string' && spec.title.subtitle.length >= 28,
      `${entry.id} has a meaningful subtitle`,
    );
    assert.ok(
      !spec.title.subtitle.includes(`general · ${entry.familyId}`),
      `${entry.id} does not expose catalog jargon`,
    );
    assert.match(spec.accessibility.description, /curated, deterministic data/);

    for (const viewport of [
      { width: 760, height: 440, id: 'desktop' },
      { width: 360, height: 360, id: 'mobile' },
    ]) {
      const { scene } = compile(spec, viewport);
      assert.ok(
        scene.metadata.renderedNodeCount > 3,
        `${entry.id} renders at the ${viewport.id} viewport`,
      );
    }
  }
});

test('every Canvas family representative avoids placeholder data', () => {
  assert.ok(fullCatalog.length >= 41);
  const placeholders = /^(?:p|sample|category|series|group)[ _-]?\d+$/i;
  for (const family of fullCatalog) {
    const entry = representative(family);
    assert.ok(entry, `${family.id} has a representative mode`);
    const spec = sample(entry);
    for (const row of spec.data) {
      for (const value of Object.values(row)) {
        if (typeof value === 'string') {
          assert.ok(!placeholders.test(value), `${family.id} avoids placeholder label ${value}`);
        }
      }
    }
  }
});

test('all 176 ordinary examples use finite, bounded product fixtures without generator labels', () => {
  const canvas = fullVariantCatalog.map((entry) => ({ id: entry.id, data: sample(entry).data }));
  const spatial = Object.entries(spatialSampleSpecs).map(([id, spec]) => ({
    id,
    data: spec.layers.map((layer) => layer.data),
  }));
  const examples = [...canvas, ...spatial];

  assert.equal(canvas.length, 168);
  assert.equal(spatial.length, 8);
  assert.equal(examples.length, 176);

  for (const example of examples) {
    assertFiniteNumbers(example.data, example.id);
    for (const label of stringsIn(example.data)) {
      for (const pattern of placeholderLabels) {
        assert.doesNotMatch(label, pattern, `${example.id} product label ${label}`);
      }
    }
  }

  for (const example of canvas) {
    assert.ok(example.data.length <= 365, `${example.id} keeps its ordinary fixture readable`);
  }
});

test('named cohorts preserve the intended distributions and compact label density', () => {
  const byId = new Map(fullVariantCatalog.map((entry) => [entry.id, entry]));
  const bubble = sample(byId.get('bubble')).data;
  assert.equal(new Set(bubble.map(({ name }) => name)).size, bubble.length);
  assert.ok(bubble.every(({ name }) => name.length <= 12));
  assert.deepEqual(
    new Set(bubble.map(({ group }) => group)),
    new Set(['Starter', 'Growth', 'Scale', 'Opportunity']),
  );

  const distribution = sample(byId.get('distribution')).data;
  const before = distribution.filter(({ series }) => series === 'Before launch');
  const after = distribution.filter(({ series }) => series === 'After launch');
  const mean = (rows) => rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
  assert.equal(before.length, 36);
  assert.equal(after.length, 36);
  assert.ok(mean(after) - mean(before) > 8);
  assert.equal(new Set(distribution.map(({ sample }) => sample)).size, distribution.length);

  const matrix = sample(byId.get('scatter-matrix')).data;
  assert.equal(new Set(matrix.map(({ name }) => name)).size, matrix.length);
  assert.equal(new Set(matrix.map(({ train }) => train)).size, 6);
  assert.equal(new Set(matrix.map(({ region }) => region)).size, 3);
  for (const field of ['speed', 'quality', 'cost']) {
    const values = matrix.map((row) => row[field]);
    assert.ok(Math.max(...values) - Math.min(...values) >= 18, `${field} has a useful range`);
  }
});

test('adapter stories and Spatial inspection labels are authored rather than generated', () => {
  const byId = new Map(fullVariantCatalog.map((entry) => [entry.id, entry]));
  for (const id of ['vega', 'custom']) {
    const spec = sample(byId.get(id));
    assert.doesNotMatch(spec.title.subtitle, /focused, executable/i);
    assert.match(spec.title.subtitle, /(?:monthly active teams|named customer teams)/i);
  }

  const meshLabels = spatialSampleSpecs.mesh.layers[0].data.labels;
  const coneLabels = spatialSampleSpecs['vector-cone'].layers[0].data.labels;
  const streamLabels = spatialSampleSpecs.streamtube.layers[0].data.labels;
  const scatterLabels = spatialSampleSpecs['spatial-scatter'].layers[0].data.labels;
  assert.ok(new Set(meshLabels).size >= 30);
  assert.ok(new Set(coneLabels).size >= 20);
  assert.equal(new Set(streamLabels).size, streamLabels.length);
  assert.ok(new Set(scatterLabels).size >= 12);

  const globePoints = spatialSampleSpecs.globe.layers[0].data.points;
  assert.equal(
    new Set(globePoints.map(({ longitude, latitude }) => `${longitude}:${latitude}`)).size,
    globePoints.length,
  );
});

test('composition, uncertainty, market, hierarchy, and set fixtures preserve their meaning', () => {
  const byId = new Map(fullVariantCatalog.map((entry) => [entry.id, entry]));

  const pie = sample(byId.get('pie'));
  assert.equal(
    pie.data.reduce((sum, row) => sum + row.value, 0),
    100,
  );

  const funnel = sample(byId.get('funnel'));
  assert.ok(
    funnel.data.every((row, index) => index === 0 || row.value < funnel.data[index - 1].value),
  );

  const interval = sample(byId.get('intervals'));
  assert.ok(interval.data.every(({ low, value, high }) => low <= value && value <= high));

  const market = sample(byId.get('candlestick'));
  assert.ok(
    market.data.every(
      ({ open, high, low, close, volume }, index) =>
        low <= Math.min(open, close) &&
        high >= Math.max(open, close) &&
        volume > 0 &&
        (index === 0 || market.data[index - 1].date < market.data[index].date),
    ),
  );

  const hierarchy = sample(byId.get('treemap'));
  const seen = new Set();
  for (const row of hierarchy.data) {
    assert.ok(row.parent === '' || seen.has(row.parent), `${row.id} follows its parent`);
    seen.add(row.id);
  }

  const venn = sample(byId.get('venn'));
  assert.equal(venn.data.length, 7);
  assert.deepEqual(
    new Set(venn.data.flatMap(({ sets }) => sets)),
    new Set(['Analysis', 'Engineering', 'Design']),
  );
  assert.equal(venn.mark.fields.sets, 'sets');
  assert.equal(venn.mark.fields.size, 'size');
});

test('all Spatial variants use bounded, named product scenes', () => {
  assert.equal(Object.keys(spatialSampleSpecs).length, 8);
  for (const [id, spec] of Object.entries(spatialSampleSpecs)) {
    assert.ok(spec.title.length >= 22, `${id} has an explanatory title`);
    assert.ok(spec.layers.length > 0, `${id} has a visible layer`);
    assert.equal(spec.interaction.tooltip, true, `${id} keeps inspection available`);
    assert.equal(spec.interaction.controls, true, `${id} keeps camera controls available`);
  }
});
