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
