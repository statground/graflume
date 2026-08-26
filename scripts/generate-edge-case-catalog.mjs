import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

import { buildEdgeCaseCatalog } from './edge-case-samples.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const write = process.argv.includes('--write') || !check;
const publicCatalogPath = path.join(root, 'catalog/graflume.catalog.json');
const outputPath = path.join(root, 'catalog/graflume.edge-cases.json');

const publicCatalog = JSON.parse(await readFile(publicCatalogPath, 'utf8'));
const catalog = buildEdgeCaseCatalog(publicCatalog);

assert.equal(catalog.schemaVersion, 1);
assert.equal(catalog.totals.canonicalFamilies, 44);
assert.equal(catalog.totals.profiles, 3);
assert.equal(catalog.totals.examples, 132);
assert.equal(catalog.examples.length, 132);

const source = await format(`${JSON.stringify(catalog, null, 2)}\n`, {
  ...((await resolveConfig(outputPath)) ?? {}),
  filepath: outputPath,
});

if (check) {
  const actual = await readFile(outputPath, 'utf8').catch(() => '');
  assert.equal(
    actual,
    source,
    'catalog/graflume.edge-cases.json is stale; run npm run catalog:generate',
  );
} else if (write) {
  await writeFile(outputPath, source);
}

console.log(
  check
    ? 'Verified 132 compact Graflume edge-case examples.'
    : 'Generated 132 compact Graflume edge-case examples.',
);
