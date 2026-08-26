import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const write = process.argv.includes('--write') || !check;
const outputPath = path.join(root, 'catalog/graflume.adaptive-profiles.json');
const complete = await import(pathToFileURL(path.join(root, 'dist/graflume.complete.js')));

const capabilities = complete.adaptiveCapabilityCatalog;
const profiles = complete.adaptiveProfileCatalog;
assert.equal(complete.adaptiveContractVersion, '0.1');
assert.ok(capabilities.length >= 17, 'adaptive capability registry lost a baseline capability');
assert.ok(profiles.length >= 23, 'adaptive profile registry lost a baseline profile');
assert.equal(new Set(capabilities.map(({ id }) => id)).size, capabilities.length);
assert.equal(new Set(profiles.map(({ id }) => id)).size, profiles.length);
assert.deepEqual(
  profiles.map(({ order }) => order),
  profiles.map((_, index) => index),
  'adaptive profile order must remain contiguous and deterministic',
);
assert.deepEqual(
  profiles.filter(({ kind }) => kind === 'capability').map(({ id }) => id),
  capabilities.map(({ id }) => id),
  'capability profile order must follow the capability registry',
);
assert.deepEqual(
  profiles.slice(0, 6).map(({ id }) => id),
  ['responsive-fluid', 'mobile-touch', 'smartwatch', 'ebook-paper', 'monochrome', 'dot-matrix'],
  'the six baseline scenario IDs and their order are a stable host contract',
);
const capabilityIds = new Set(capabilities.map(({ id }) => id));
for (const profile of profiles) {
  assert.ok(profile.capabilities.length > 0, `${profile.id} must declare a capability`);
  for (const id of profile.capabilities) {
    assert.ok(capabilityIds.has(id), `${profile.id} references unknown capability ${id}`);
  }
}

const catalog = {
  $schema: '../schema/graflume.adaptive-profiles.schema.json',
  schemaVersion: 1,
  contractVersion: complete.adaptiveContractVersion,
  totals: {
    profiles: profiles.length,
    scenarios: profiles.filter(({ kind }) => kind === 'scenario').length,
    capabilities: capabilities.length,
  },
  capabilities,
  profiles,
};

const source = await format(`${JSON.stringify(catalog, null, 2)}\n`, {
  ...((await resolveConfig(outputPath)) ?? {}),
  filepath: outputPath,
});

if (check) {
  const actual = await readFile(outputPath, 'utf8').catch(() => '');
  assert.equal(
    actual,
    source,
    'catalog/graflume.adaptive-profiles.json is stale; run npm run catalog:generate',
  );
} else if (write) {
  await writeFile(outputPath, source);
}

console.log(
  check
    ? `Verified ${profiles.length} Graflume adaptive profiles.`
    : `Generated ${profiles.length} Graflume adaptive profiles.`,
);
