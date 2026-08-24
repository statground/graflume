import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

import { builtInThemeCatalog } from '../.tmp/src/theme/defaults.js';
import { fullCatalog } from '../.tmp/src/complete.js';
import { spatialChartFamilies } from '../.tmp/src/spatial/catalog.js';

const themeRoot = new URL('../docs/assets/themes/', import.meta.url);

async function svgNames(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
    .map(({ name }) => name)
    .sort();
}

test('snapshot inventory follows the built-in theme catalog without fixed theme counts', async () => {
  const expectedThemes = builtInThemeCatalog
    .filter(({ snapshot }) => snapshot)
    .map(({ id }) => id)
    .sort();
  const actualThemes = (await readdir(themeRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .sort();
  assert.deepEqual(actualThemes, expectedThemes);

  let canvasReference;
  let spatialReference;
  for (const theme of expectedThemes) {
    const charts = await svgNames(new URL(`${theme}/charts/`, themeRoot));
    const spatial = await svgNames(new URL(`${theme}/spatial/`, themeRoot));
    assert.equal(charts.length, fullCatalog.length, `${theme} Canvas snapshot count`);
    assert.equal(spatial.length, spatialChartFamilies.length, `${theme} Spatial snapshot count`);
    canvasReference ??= charts;
    spatialReference ??= spatial;
    assert.deepEqual(charts, canvasReference, `${theme} Canvas snapshot parity`);
    assert.deepEqual(spatial, spatialReference, `${theme} Spatial snapshot parity`);
  }
});
