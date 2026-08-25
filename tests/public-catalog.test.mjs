import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import * as Complete from '../.tmp/src/complete.js';
import {
  spatialCatalogBoundary,
  spatialChartFamilies,
  spatialCompatibilityModes,
} from '../.tmp/src/spatial.js';

const manifest = JSON.parse(
  await readFile(new URL('../catalog/graflume.catalog.json', import.meta.url)),
);
const features = JSON.parse(
  await readFile(new URL('../catalog/graflume.features.json', import.meta.url)),
);
const catalogSchema = JSON.parse(
  await readFile(new URL('../schema/graflume.catalog.schema.json', import.meta.url)),
);

test('public catalog is derived from the exact runtime family, mode, theme and identifier sets', () => {
  const canvasFamilyIds = Complete.fullCatalog.map(({ id }) => id);
  const spatialFamilyIds = spatialChartFamilies.map(({ familyId }) => familyId);
  assert.deepEqual(
    manifest.families.map(({ id }) => id),
    [...canvasFamilyIds, ...spatialFamilyIds],
  );
  assert.equal(manifest.samples.length, manifest.families.length);
  assert.equal(manifest.totals.canonicalFamilies, spatialCatalogBoundary.totalCanonicalFamilies);
  assert.equal(manifest.totals.presetsAndModes, spatialCatalogBoundary.totalPresetsAndModes);
  assert.equal(manifest.totals.canvasPresets, Complete.fullVariantCatalog.length);
  assert.equal(
    manifest.totals.spatialVariants,
    spatialChartFamilies.reduce((sum, family) => sum + family.variants.length, 0),
  );
  assert.equal(manifest.totals.integratedSpatialModes, spatialCompatibilityModes.length);
  assert.equal(
    manifest.totals.compatibilityIdentifiers,
    Complete.seriesCompatibilityCatalog.length,
  );
  assert.deepEqual(
    manifest.themes.map(({ id }) => id),
    Complete.builtInThemeCatalog.map(({ id }) => id),
  );
});

test('verified feature matrix covers all 44 families and does not promote research to support', () => {
  const canonical = new Set(manifest.families.map(({ id }) => id));
  assert.equal(features.families.length, 44);
  assert.deepEqual(new Set(features.families.map(({ id }) => id)), canonical);
  assert.equal(new Set(features.families.map(({ id }) => id)).size, features.families.length);
  for (const family of features.families) {
    assert.ok(family.supported.length > 0, `${family.id} current support`);
    assert.ok(family.p0.length > 0, `${family.id} P0 boundary`);
    assert.equal(family.status, 'partial');
  }
  for (const candidate of features.candidates) {
    assert.ok(candidate.status === 'planned' || candidate.status === 'research');
  }
  assert.equal(features.candidates.length, 16);
  assert.equal(features.commonFoundations.length, 7);
  assert.equal(features.themeFamilies.length, 12);
  assert.equal(features.ecosystemInputs.length, 25);
  assert.equal(features.researchSources.length, 95);
  assert.equal(new Set(features.researchSources).size, 95);
  assert.ok(features.researchSources.every((url) => url.startsWith('https://')));
  assert.equal(features.crossCuttingContracts.length, 9);
  assert.equal(Object.keys(features.modeBacklog).length, 35);
  assert.equal(
    Object.values(features.modeBacklog).reduce((sum, modes) => sum + modes.length, 0),
    253,
  );
  assert.equal(features.capabilityProfiles.length, 7);
  assert.equal(features.verificationContracts.length, 5);
  assert.equal(
    createHash('sha256').update(features.researchSources.join('\n')).digest('hex'),
    '69e5f8a28cf405041d47468449879e797591b91fabae3cf5854308b5436f977d',
  );
  assert.deepEqual(manifest.commonFoundations, features.commonFoundations);
  assert.deepEqual(manifest.candidates, features.candidates);
  assert.deepEqual(manifest.themeFamilies, features.themeFamilies);
  assert.deepEqual(manifest.ecosystemInputs, features.ecosystemInputs);
  assert.deepEqual(manifest.researchSources, features.researchSources);
  assert.deepEqual(manifest.crossCuttingContracts, features.crossCuttingContracts);
  assert.deepEqual(manifest.modeBacklog, features.modeBacklog);
});

test('audited status boundaries follow current semantic evidence without closing P0 work', () => {
  const foundation = (id) => features.commonFoundations.find((entry) => entry.id === id);
  const family = (id) => features.families.find((entry) => entry.id === id);
  const contract = (id) => features.crossCuttingContracts.find((entry) => entry.id === id);

  assert.equal(foundation('transform-dataflow').status, 'partial');
  assert.match(foundation('transform-dataflow').summary, /named sources, branches/);
  assert.equal(foundation('encoding-scale-registry').status, 'partial');
  assert.match(foundation('encoding-scale-registry').summary, /shared-domain resolve/);
  assert.match(foundation('encoding-scale-registry').summary, /shared multi-view axes/);
  assert.equal(foundation('composition-resolve').status, 'partial');
  assert.match(foundation('composition-resolve').summary, /layer\/facet\/repeat/);
  assert.match(foundation('composition-resolve').summary, /streaming composition.*remain planned/);
  assert.match(foundation('semantic-index-accessibility').summary, /native table mirror/);
  assert.match(foundation('semantic-index-accessibility').summary, /scoped semantic/);
  assert.equal(foundation('incremental-worker-binary').status, 'partial');
  assert.match(
    foundation('incremental-worker-binary').summary,
    /stable-key append\/upsert\/replaceLast/,
  );
  assert.match(
    foundation('incremental-worker-binary').summary,
    /worker-owned chart rendering.*remain planned/,
  );
  assert.equal(contract('encoding-channels').status, 'partial');
  assert.equal(contract('scale-registry').status, 'partial');
  assert.equal(contract('composition').status, 'partial');
  assert.ok(contract('composition').items.includes('supported: nested bounded Canvas grid'));
  assert.ok(
    contract('composition').items.includes('planned: streaming and Spatial/WebGL composition'),
  );
  assert.ok(contract('streaming').items.includes('supported: stable-key upsert'));
  assert.ok(contract('streaming').items.includes('planned: ring-buffer storage'));

  assert.ok(family('area').supported.some((item) => item.includes('wiggle offsets')));
  assert.ok(family('area').p0.some((item) => item.includes('named and branched')));
  assert.ok(family('bar').supported.some((item) => item.includes('100 percent')));
  assert.ok(family('line').supported.some((item) => item.includes('curve registry')));
  assert.ok(family('line').p0.includes('data-domain navigation'));
  assert.ok(family('table').supported.some((item) => item.includes('native semantic HTML')));
  assert.ok(family('map').p0.some((item) => item.includes('provider-backed tile lifecycle')));
  assert.ok(
    family('technical-indicator').supported.some((item) =>
      item.includes('17 registry-audited calculated indicators'),
    ),
  );
  assert.ok(
    family('technical-indicator').p0.some((item) =>
      item.includes('panes and synchronized crosshair'),
    ),
  );

  for (const entry of features.families) assert.equal(entry.status, 'partial');
  for (const entry of features.candidates) {
    assert.ok(entry.status === 'planned' || entry.status === 'research');
  }
});

test('every mode resolves to a canonical family or the explicit adapter surface', () => {
  const familyIds = new Set(manifest.families.map(({ id }) => id));
  const modeIds = new Set(manifest.modes.map(({ id }) => id));
  assert.equal(modeIds.size, manifest.modes.length);
  for (const mode of manifest.modes) {
    if (mode.kind === 'adapter') assert.equal(mode.familyId, null);
    else assert.ok(familyIds.has(mode.familyId), `${mode.id} -> ${mode.familyId}`);
  }
  for (const compatibility of manifest.compatibilityIdentifiers) {
    assert.ok(familyIds.has(compatibility.familyId), compatibility.id);
    assert.ok(modeIds.has(compatibility.modeId), compatibility.id);
  }
  const tiledMap = manifest.modes.find(({ id }) => id === 'tiled-map');
  assert.equal(tiledMap.deprecated, true);
  assert.equal(tiledMap.preferredModeId, 'map');
  assert.match(tiledMap.compatibilityNote, /no tile request/);
});

test('runtime capability catalog keeps stack, indicator, and tiled-map names honest', () => {
  assert.deepEqual(manifest.runtimeCapabilities, Complete.runtimeCapabilities);
  const { seriesStack, technicalIndicators, tiledMap } = manifest.runtimeCapabilities;
  assert.deepEqual(seriesStack.modes, [
    'grouped',
    'stacked',
    '100-percent',
    'diverging',
    'streamgraph',
  ]);
  assert.equal(seriesStack.signedBaseline, true);
  assert.deepEqual(technicalIndicators.publicEntryPoints.canonical, [
    { id: 'technicalIndicator', kind: 'quick-api', entryPoint: 'graflume/complete' },
    { id: 'indicator', kind: 'portable-mark', entryPoint: 'ChartSpec' },
  ]);
  assert.equal(technicalIndicators.publicEntryPoints.canonicalSurfaces, 2);
  assert.equal(technicalIndicators.publicEntryPoints.namedPresets, 45);
  assert.equal(technicalIndicators.publicEntryPoints.total, 47);
  assert.equal(technicalIndicators.calculations.computed, 17);
  assert.equal(technicalIndicators.calculations.precomputedRequired, 28);
  assert.equal(
    technicalIndicators.presets.filter(({ support }) => support === 'computed').length,
    17,
  );
  assert.equal(
    technicalIndicators.presets.filter(({ support }) => support === 'precomputed-required').length,
    28,
  );
  assert.deepEqual(tiledMap, {
    id: 'tiled-map',
    status: 'deprecated',
    behavior: 'embedded-basemap-alias',
    preferredFamily: 'map',
    basemap: 'natural-earth-embedded',
    tileLifecycle: false,
    networkRequests: false,
  });
});

test('runtime capability schema is closed at every name-function boundary', () => {
  assert.equal(catalogSchema.properties.runtimeCapabilities.$ref, '#/$defs/runtimeCapabilities');
  for (const definition of [
    'runtimeCapabilities',
    'seriesStackCapability',
    'seriesStackEncodingCapability',
    'technicalIndicatorRuntimeCapability',
    'technicalIndicatorEntryPoints',
    'technicalIndicatorCanonicalSurface',
    'technicalIndicatorCalculationBoundary',
    'technicalIndicatorCapability',
    'indicatorParameter',
    'indicatorDependencyNode',
    'indicatorWarmUp',
    'tiledMapCapability',
  ]) {
    assert.equal(catalogSchema.$defs[definition].additionalProperties, false, definition);
  }
  assert.equal(catalogSchema.$defs.technicalIndicatorEntryPoints.properties.total.const, 47);
  assert.equal(
    catalogSchema.$defs.technicalIndicatorCalculationBoundary.properties.computed.const,
    17,
  );
  assert.deepEqual(
    catalogSchema.$defs.seriesStackEncodingCapability.properties.positionalConflicts.properties.bar
      .items.enum,
    ['x2', 'y2'],
  );
  assert.equal(catalogSchema.$defs.tiledMapCapability.properties.tileLifecycle.const, false);
  assert.equal(catalogSchema.$defs.tiledMapCapability.properties.networkRequests.const, false);
});

test('manifest documentation and representative snapshots exist', async () => {
  for (const family of manifest.families) {
    await access(new URL(`../${family.manual}`, import.meta.url));
    await access(new URL(`../${family.representativeSnapshot}`, import.meta.url));
  }
  await access(new URL('../docs/development/architecture-roadmap.md', import.meta.url));
  await access(new URL('../docs/development/research-traceability.md', import.meta.url));
});
