import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { builtInThemeCatalog, defaultThemeId } from '../.tmp/src/index.js';

const generatorUrl = new URL('../scripts/generate-series-gallery.mjs', import.meta.url);
const galleryUrl = new URL('../examples/cdn/series-chart-types.html', import.meta.url);

test('the generated series gallery follows the built-in theme catalog and declared default', async () => {
  const [generator, gallery] = await Promise.all([
    readFile(generatorUrl, 'utf8'),
    readFile(galleryUrl, 'utf8'),
  ]);

  assert.ok(builtInThemeCatalog.length > 0);
  assert.ok(builtInThemeCatalog.some(({ id }) => id === defaultThemeId));
  assert.match(generator, /builtInThemeCatalog/);
  assert.match(generator, /defaultThemeId/);
  assert.match(gallery, /Graflume\.builtInThemeCatalog/);
  assert.match(gallery, /Graflume\.defaultThemeId/);
  assert.match(gallery, /themeSelect\.replaceChildren/);
  assert.match(gallery, /theme: currentThemeId/);
  assert.doesNotMatch(gallery, /dark \? ['"]graflume-dark['"] : ['"]graflume-light['"]/);
});
