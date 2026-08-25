import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  baselineSha256,
  buildCurrentLimitationEvidence,
  orderedCapabilityDigest,
} from '../scripts/close-current-limitations.mjs';
import {
  extractNodeTestNames,
  validateCapabilityTraceability,
} from '../scripts/current-limitations-traceability.mjs';

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
const currentLimitationEvidence = JSON.parse(
  await readFile(new URL('../catalog/graflume.current-limitations.evidence.json', import.meta.url)),
);
const catalogSchema = JSON.parse(
  await readFile(new URL('../schema/graflume.catalog.schema.json', import.meta.url)),
);
const currentLimitationSchema = JSON.parse(
  await readFile(new URL('../schema/graflume.current-limitations.schema.json', import.meta.url)),
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
  assert.equal(manifest.totals.canonicalFamilies, 44);
  assert.equal(manifest.totals.canvasPresets, 168);
  assert.equal(manifest.totals.presetsAndModes, 176);
  assert.equal(manifest.totals.compatibilityIdentifiers, 120);
  assert.equal(manifest.totals.themes, 17);
});

test('verified feature matrix closes current limitations without promoting research candidates', () => {
  const canonical = new Set(manifest.families.map(({ id }) => id));
  assert.equal(features.families.length, 44);
  assert.deepEqual(new Set(features.families.map(({ id }) => id)), canonical);
  assert.equal(new Set(features.families.map(({ id }) => id)).size, features.families.length);
  for (const family of features.families) {
    assert.ok(family.supported.length > 0, `${family.id} current support`);
    assert.deepEqual(family.p0, [], `${family.id} current limitations`);
    assert.equal(family.status, 'supported');
  }
  assert.equal(
    features.families.reduce((sum, family) => sum + family.p0.length, 0),
    0,
  );
  for (const candidate of features.candidates) {
    assert.ok(candidate.status === 'planned' || candidate.status === 'research');
  }
  assert.equal(features.candidates.length, 16);
  assert.equal(features.candidates.filter(({ status }) => status === 'planned').length, 1);
  assert.equal(features.candidates.filter(({ status }) => status === 'research').length, 15);
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
    156,
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

test('all 161 completed current limitations have exact source and test evidence', async () => {
  const familyIds = features.families.map(({ id }) => id);
  assert.equal(currentLimitationEvidence.release, 'current-limitations-2026-08-26');
  assert.equal(currentLimitationEvidence.verifiedAt, '2026-08-26');
  assert.equal(currentLimitationEvidence.schemaVersion, 2);
  assert.equal(currentLimitationEvidence.totalCompleted, 161);
  assert.equal(currentLimitationSchema.properties.schemaVersion.const, 2);
  assert.equal(currentLimitationSchema.properties.totalCompleted.const, 161);
  assert.equal(currentLimitationSchema.properties.families.minItems, 44);
  assert.equal(currentLimitationSchema.properties.families.maxItems, 44);
  assert.equal(currentLimitationSchema.$defs.family.additionalProperties, false);
  assert.equal(currentLimitationSchema.$defs.trace.additionalProperties, false);
  assert.equal(currentLimitationSchema.$defs.sourceEvidence.additionalProperties, false);
  assert.equal(currentLimitationSchema.$defs.testEvidence.additionalProperties, false);
  assert.deepEqual(
    currentLimitationEvidence.families.map(({ id }) => id),
    familyIds,
  );
  assert.equal(
    currentLimitationEvidence.families.reduce((sum, family) => sum + family.capabilities.length, 0),
    161,
  );
  assert.equal(orderedCapabilityDigest(currentLimitationEvidence.families), baselineSha256);

  const featuresByFamily = new Map(features.families.map((family) => [family.id, family]));
  for (const evidence of currentLimitationEvidence.families) {
    const family = featuresByFamily.get(evidence.id);
    const catalogFamily = manifest.families.find(({ id }) => id === evidence.id);
    assert.ok(family, evidence.id);
    assert.ok(catalogFamily, `${evidence.id} public catalog family`);
    assert.ok(evidence.capabilities.length > 0, `${evidence.id} capabilities`);
    assert.equal(new Set(evidence.capabilities).size, evidence.capabilities.length);
    for (const capability of evidence.capabilities) {
      assert.ok(family.supported.includes(capability), `${evidence.id}: ${capability}`);
    }
    assert.equal(evidence.traces.length, evidence.capabilities.length);
    assert.deepEqual(
      evidence.traces.map(({ capability }) => capability),
      evidence.capabilities,
    );
    for (const trace of evidence.traces) {
      assert.ok(trace.sources.length > 0, `${evidence.id}: ${trace.capability} source evidence`);
      assert.ok(trace.tests.length > 0, `${evidence.id}: ${trace.capability} test evidence`);
      for (const source of trace.sources) {
        assert.match(source.path, /^src\/.+\.ts$/);
        assert.match(source.token, /^[A-Za-z_$][A-Za-z0-9_$]*$/);
        await access(new URL(`../${source.path}`, import.meta.url));
      }
      for (const testEvidence of trace.tests) {
        assert.match(testEvidence.path, /^tests\/.+\.test\.mjs$/);
        assert.ok(testEvidence.name.length > 0);
        await access(new URL(`../${testEvidence.path}`, import.meta.url));
      }
    }
    assert.deepEqual(catalogFamily.implementationEvidence, {
      sources: [
        ...new Set(evidence.traces.flatMap((trace) => trace.sources.map(({ path }) => path))),
      ],
      tests: [...new Set(evidence.traces.flatMap((trace) => trace.tests.map(({ path }) => path)))],
    });
  }
  await validateCapabilityTraceability(currentLimitationEvidence.families);
  assert.deepEqual(
    currentLimitationEvidence,
    await buildCurrentLimitationEvidence(features, currentLimitationEvidence),
  );

  assert.deepEqual(manifest.currentLimitations, {
    release: 'current-limitations-2026-08-26',
    completed: 161,
    remaining: 0,
    evidence: 'catalog/graflume.current-limitations.evidence.json',
  });
  assert.equal(manifest.totals.completedCurrentLimitations, 161);
  assert.equal(manifest.totals.currentLimitations, 0);
  assert.equal(catalogSchema.$defs.implementationEvidence.properties.sources.minItems, 1);
  assert.equal(catalogSchema.$defs.implementationEvidence.properties.tests.minItems, 1);
});

test('current limitation traceability rejects duplicate, missing, empty, and false evidence', async () => {
  const valid = (await buildCurrentLimitationEvidence(features, currentLimitationEvidence))
    .families;
  const rejects = async (mutate, pattern) => {
    const candidate = structuredClone(valid);
    mutate(candidate[0]);
    await assert.rejects(() => validateCapabilityTraceability(candidate), pattern);
  };

  await rejects((family) => {
    family.capabilities[1] = family.capabilities[0];
    family.traces[1].capability = family.capabilities[0];
  }, /duplicate capability/);
  await rejects((family) => family.traces.pop(), /missing capability trace/);
  await rejects((family) => {
    family.traces[0].sources = [];
  }, /source evidence must not be empty/);
  await rejects((family) => {
    family.traces[0].tests = [];
  }, /test evidence must not be empty/);
  await rejects((family) => {
    family.traces[0].sources.push(structuredClone(family.traces[0].sources[0]));
  }, /duplicate source evidence/);
  await rejects((family) => {
    family.traces[0].tests.push(structuredClone(family.traces[0].tests[0]));
  }, /duplicate test evidence/);
  await rejects((family) => {
    family.traces[1].sources = structuredClone(family.traces[0].sources);
    family.traces[1].tests = structuredClone(family.traces[0].tests);
  }, /duplicate capability evidence/);
  await rejects((family) => {
    family.traces[0].sources[0].token = 'DefinitelyMissingTraceabilityToken';
  }, /missing source token/);
  await rejects((family) => {
    family.traces[0].tests[0].name = 'a filename is not a node:test name';
  }, /missing node:test name/);
  await rejects((family) => {
    family.traces[0].sources[0].path = '../outside.ts';
  }, /source path/);

  assert.throws(
    () =>
      extractNodeTestNames(
        `import test from 'node:test';\n// test('comment-only false evidence', () => {});`,
      ),
    /at least one static node:test/,
  );
  assert.throws(
    () =>
      extractNodeTestNames(
        `import test from 'node:test';\nconst name = 'dynamic';\ntest(name, () => {});`,
      ),
    /static string literals/,
  );
});

test('the seven common foundations and 44 family boundaries are supported', () => {
  const foundation = (id) => features.commonFoundations.find((entry) => entry.id === id);
  const family = (id) => features.families.find((entry) => entry.id === id);
  const contract = (id) => features.crossCuttingContracts.find((entry) => entry.id === id);

  assert.deepEqual(
    features.commonFoundations.map(({ id, status }) => ({ id, status })),
    [
      'transform-dataflow',
      'encoding-scale-registry',
      'analytic-interaction',
      'composition-resolve',
      'semantic-index-accessibility',
      'label-layout-authoring',
      'incremental-worker-binary',
    ].map((id) => ({ id, status: 'supported' })),
  );
  assert.match(
    foundation('transform-dataflow').summary,
    /named sources.*reusable branches.*shared transform DAG/,
  );
  assert.match(
    foundation('encoding-scale-registry').summary,
    /geographic and trading channels.*shared or independent multi-view domains, axes, legends and colorbars/,
  );
  assert.match(foundation('semantic-index-accessibility').summary, /native explorer/);
  assert.match(foundation('label-layout-authoring').summary, /All 41 Canvas families/);
  assert.match(
    foundation('incremental-worker-binary').summary,
    /Automatic module Workers.*worker-owned renderers/,
  );
  assert.equal(contract('encoding-channels').status, 'supported');
  assert.equal(contract('scale-registry').status, 'supported');
  assert.equal(contract('composition').status, 'partial');
  assert.ok(contract('composition').items.includes('supported: nested bounded Canvas grid'));
  assert.ok(
    contract('composition').items.includes('planned: streaming and Spatial/WebGL composition'),
  );
  assert.ok(contract('streaming').items.includes('supported: stable-key upsert'));
  assert.ok(contract('streaming').items.includes('supported: bounded ring-buffer storage'));

  assert.ok(family('area').supported.some((item) => item.includes('wiggle offsets')));
  assert.ok(family('area').supported.some((item) => item.includes('named and branched')));
  assert.ok(family('bar').supported.some((item) => item.includes('100 percent')));
  assert.ok(family('line').supported.some((item) => item.includes('curve registry')));
  assert.ok(family('line').supported.includes('data-domain navigation'));
  assert.ok(family('table').supported.some((item) => item.includes('native semantic HTML')));
  assert.ok(
    family('map').supported.some((item) => item.includes('provider-backed tile lifecycle')),
  );
  assert.ok(
    family('technical-indicator').supported.some((item) =>
      item.includes('calculation coverage for the 28 precomputed-only presets'),
    ),
  );
  assert.ok(
    family('technical-indicator').supported.some((item) =>
      item.includes('panes and synchronized crosshair'),
    ),
  );

  for (const entry of features.families) {
    assert.equal(entry.status, 'supported');
    assert.equal(entry.p0.length, 0);
  }
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

test('mode introduction metadata is source-derived without changing family counts', () => {
  const foundationReleaseId = 'research-foundations-2026-08-25';
  const limitationReleaseId = 'current-limitations-2026-08-26';
  const runtimeIntroductions = Complete.fullVariantCatalog
    .filter(({ introducedIn }) => introducedIn !== undefined)
    .map(({ id, familyId, introducedIn }) => ({ id, familyId, introducedIn }));
  const manifestIntroductions = manifest.modes
    .filter(({ introducedIn }) => introducedIn !== undefined)
    .map(({ id, familyId, introducedIn }) => ({ id, familyId, introducedIn }));

  assert.deepEqual(runtimeIntroductions, [
    { id: 'ecdf', familyId: 'distribution', introducedIn: foundationReleaseId },
    { id: 'ccdf', familyId: 'distribution', introducedIn: foundationReleaseId },
    { id: 'kde', familyId: 'distribution', introducedIn: foundationReleaseId },
    { id: 'kagi', familyId: 'price-blocks', introducedIn: limitationReleaseId },
    {
      id: 'three-line-break',
      familyId: 'price-blocks',
      introducedIn: limitationReleaseId,
    },
    { id: 'range-bars', familyId: 'price-blocks', introducedIn: limitationReleaseId },
  ]);
  assert.deepEqual(manifestIntroductions, runtimeIntroductions);
  assert.equal(manifest.totals.canonicalFamilies, 44);
  assert.equal(catalogSchema.$defs.mode.properties.introducedIn.$ref, '#/$defs/releaseId');
  assert.equal(catalogSchema.$defs.releaseId.pattern, '^[a-z0-9]+(?:[._-][a-z0-9]+)*$');
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
  assert.equal(technicalIndicators.status, 'supported');
  assert.equal(technicalIndicators.calculations.computed, 45);
  assert.equal(technicalIndicators.calculations.precomputedRequired, 0);
  assert.equal(
    technicalIndicators.presets.filter(({ support }) => support === 'computed').length,
    45,
  );
  assert.equal(
    technicalIndicators.presets.filter(({ support }) => support === 'precomputed-required').length,
    0,
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
    'analyticInteractionCapability',
    'analyticInteractionInputs',
    'analyticInteractionCoordinates',
    'analyticDomainNavigation',
    'analyticInteractionFiltering',
    'analyticInteractionComposition',
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
    45,
  );
  assert.equal(
    catalogSchema.$defs.technicalIndicatorCalculationBoundary.properties.precomputedRequired.const,
    0,
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
