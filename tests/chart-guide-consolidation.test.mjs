import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';

import { fullCatalog, fullVariantCatalog } from '../.tmp/src/complete.js';

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
      assert.ok(!index.includes(`| \`${variant.id}\` |`));
      continue;
    }
    assert.ok(index.includes(`\`${variant.id}\``), `${variant.id} is in the compatibility index`);
    assert.ok(
      index.includes(`./${variant.familyId}.md#integrated-presets`),
      `${variant.id} points to its family manual`,
    );
  }
});
