import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';

import { compile, fullCatalog, fullVariantCatalog } from '../.tmp/src/complete.js';
import { seriesSampleSpec } from '../scripts/series-samples.mjs';

const chartDirectory = new URL('../docs/charts/', import.meta.url);
const assetDirectory = new URL('../docs/assets/charts/', import.meta.url);
const startMarker = '<!-- FAMILY_PRESETS_START -->';
const endMarker = '<!-- FAMILY_PRESETS_END -->';

function generatedBlock(source) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  assert.notEqual(start, -1, 'family guide has a generated preset start marker');
  assert.ok(end > start, 'family guide has an ordered preset end marker');
  assert.equal(source.indexOf(startMarker, start + 1), -1, 'family guide has one preset block');
  return source.slice(start, end + endMarker.length);
}

test('chart documentation contains one manual per representative family', async () => {
  const expected = [
    'README.md',
    'adapters.md',
    'compatibility-presets.md',
    ...fullCatalog.map(({ id }) => `${id}.md`),
  ].sort();
  const actual = (await readdir(chartDirectory)).filter((name) => name.endsWith('.md')).sort();

  assert.equal(fullCatalog.length, 37);
  assert.equal(fullVariantCatalog.length, 141);
  assert.deepEqual(actual, expected);
});

test('every compatible preset is integrated into its family manual', async () => {
  const assetNames = new Set(await readdir(assetDirectory));
  for (const family of fullCatalog) {
    const source = await readFile(new URL(`${family.id}.md`, chartDirectory), 'utf8');
    const block = generatedBlock(source);
    const variants = fullVariantCatalog.filter(({ familyId }) => familyId === family.id);

    assert.match(block, /## Integrated presets/);
    assert.match(block, /## Visual gallery/);
    assert.match(block, /## Type-by-type implementation/);
    assert.doesNotMatch(block, /<details>/, 'compiled outputs remain visible without expansion');
    assert.ok(block.includes(`canonical Quick API is \`${family.quickApi}()\``));
    for (const variant of variants) {
      const assetId = assetNames.has(`${variant.id}.svg`) ? variant.id : family.id;
      assert.ok(
        block.includes(`\`${variant.quickApi}()\``),
        `${variant.id} Quick API is documented`,
      );
      assert.ok(block.includes(`\`${variant.mode}\``), `${variant.id} mode is documented`);
      assert.ok(block.includes(`\`${variant.mark}\``), `${variant.id} mark is documented`);
      assert.ok(
        block.includes(`../assets/charts/${assetId}.svg`),
        `${variant.id} compiled output is embedded`,
      );
      assert.ok(
        block.includes(`<a id="variant-${variant.id}"></a>`),
        `${variant.id} has a stable implementation anchor`,
      );
      assert.ok(
        block.includes(`${variant.quickApi}('#chart', data,`),
        `${variant.id} has a runnable Quick API example`,
      );
      assert.ok(
        block.includes('**Required example fields:**'),
        `${variant.id} documents its example fields`,
      );
      await access(new URL(`${assetId}.svg`, assetDirectory));
    }
  }
});

test('compatibility index maps all names and keeps adapters separate', async () => {
  const index = await readFile(new URL('compatibility-presets.md', chartDirectory), 'utf8');
  const adapters = await readFile(new URL('adapters.md', chartDirectory), 'utf8');

  for (const variant of fullVariantCatalog) {
    if (variant.familyId === 'custom') {
      assert.ok(adapters.includes(`\`${variant.quickApi}()\``));
      assert.ok(adapters.includes(`<a id="variant-${variant.id}"></a>`));
      assert.ok(adapters.includes(`${variant.quickApi}('#chart', data,`));
      assert.ok(adapters.includes(`../assets/charts/${variant.id}.svg`));
      assert.ok(!index.includes(`| \`${variant.id}\` |`));
      continue;
    }
    assert.ok(index.includes(`\`${variant.id}\``), `${variant.id} is in the compatibility index`);
    assert.ok(
      index.includes(`./${variant.familyId}.md#integrated-presets`),
      `${variant.id} points to its family manual`,
    );
    assert.ok(
      index.includes(`./${variant.familyId}.md#variant-${variant.id}`),
      `${variant.id} points directly to its implementation example`,
    );
  }
});

test('every documented type example compiles through the shared Scene pipeline', () => {
  for (const variant of fullVariantCatalog) {
    const { scene } = compile(seriesSampleSpec(variant), { width: 640, height: 400 });
    assert.ok(scene.metadata.renderedNodeCount > 3, `${variant.id} example renders Scene nodes`);
  }
});
