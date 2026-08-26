import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adaptChartSpec,
  adaptiveCapabilityCatalog,
  adaptiveProfileCatalog,
  compile,
  estimateSpecRowCount,
  fullCatalog,
  fullVariantCatalog,
  normalizeAdaptiveOptions,
  resolveAdaptiveProfile,
} from '../.tmp/src/complete.js';
import { compileSpatial } from '../.tmp/src/spatial.js';
import { seriesSampleSpec } from '../scripts/series-samples.mjs';
import { spatialSampleSpecs } from '../scripts/spatial-samples.mjs';

const requestedScenarios = [
  'responsive-fluid',
  'mobile-touch',
  'smartwatch',
  'ebook-paper',
  'monochrome',
  'dot-matrix',
];

const readJson = (relativePath) =>
  JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8'));

test('adaptive registry is one ordered 23-profile source of truth', () => {
  assert.equal(adaptiveCapabilityCatalog.length, 17);
  assert.equal(adaptiveProfileCatalog.length, 23);
  assert.deepEqual(
    adaptiveProfileCatalog.slice(0, 6).map(({ id }) => id),
    requestedScenarios,
  );
  assert.deepEqual(
    adaptiveProfileCatalog.slice(6).map(({ id }) => id),
    adaptiveCapabilityCatalog.map(({ id }) => id),
  );
  assert.deepEqual(
    adaptiveProfileCatalog.map(({ order }) => order),
    Array.from({ length: 23 }, (_, index) => index),
  );
  assert.equal(new Set(adaptiveProfileCatalog.map(({ id }) => id)).size, 23);
  assert.equal(Object.isFrozen(adaptiveProfileCatalog), true);
  assert.ok(adaptiveProfileCatalog.every(Object.isFrozen));
  assert.ok(adaptiveProfileCatalog.every(({ capabilities }) => Object.isFrozen(capabilities)));
  assert.ok(adaptiveCapabilityCatalog.every(Object.isFrozen));
  for (const profile of adaptiveProfileCatalog) {
    assert.ok(profile.label.length > 0, `${profile.id} label`);
    assert.ok(profile.compactLabel.length > 0, `${profile.id} compact label`);
    assert.ok(profile.summary.length > 0, `${profile.id} summary`);
    assert.ok(profile.capabilities.length > 0, `${profile.id} capabilities`);
    assert.ok(profile.presentation.width > 0, `${profile.id} presentation width`);
    assert.ok(profile.presentation.height > 0, `${profile.id} presentation height`);
  }
});

test('generated adaptive catalog, package exports, and open ID schema follow the runtime registry', () => {
  const catalog = readJson('catalog/graflume.adaptive-profiles.json');
  const schema = readJson('schema/graflume.adaptive-profiles.schema.json');
  const packageJson = readJson('package.json');
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.contractVersion, '0.1');
  assert.equal(catalog.totals.profiles, adaptiveProfileCatalog.length);
  assert.equal(catalog.totals.capabilities, adaptiveCapabilityCatalog.length);
  assert.deepEqual(
    catalog.profiles.map(({ id }) => id),
    adaptiveProfileCatalog.map(({ id }) => id),
  );
  assert.deepEqual(
    catalog.capabilities.map(({ id }) => id),
    adaptiveCapabilityCatalog.map(({ id }) => id),
  );
  assert.equal(
    packageJson.exports['./adaptive-profiles'],
    './catalog/graflume.adaptive-profiles.json',
  );
  assert.equal(
    packageJson.exports['./adaptive-profiles-schema'],
    './schema/graflume.adaptive-profiles.schema.json',
  );
  assert.equal(schema.$defs.id.enum, undefined);
  assert.equal(schema.properties.profiles.maxItems, undefined);
});

test('requested extreme environments resolve deterministic orthogonal capabilities', () => {
  const state = (profile) => {
    const definition = adaptiveProfileCatalog.find(({ id }) => id === profile);
    assert.notEqual(definition, undefined);
    return resolveAdaptiveProfile(
      {
        width: definition.presentation.width,
        height: definition.presentation.height,
        rowCount: 60_000,
      },
      { profiles: [profile] },
    );
  };

  const watch = state('smartwatch');
  assert.equal(watch.viewport, 'micro');
  assert.equal(watch.input, 'coarse');
  assert.equal(watch.motion, 'reduced');
  assert.equal(watch.layout.controlTarget, 44);
  assert.equal(watch.interaction.inspectionZoom, true);
  assert.ok(watch.capabilities.includes('cutout-round'));

  const ebook = state('ebook-paper');
  assert.equal(ebook.display, 'e-ink');
  assert.equal(ebook.motion, 'static');
  assert.equal(ebook.input, 'keyboard');
  assert.equal(ebook.rendering.pixelRatioCap, 1);
  assert.equal(ebook.accessibility.tableRecommended, true);

  const monochrome = state('monochrome');
  assert.equal(monochrome.display, 'monochrome');
  assert.match(monochrome.rendering.filter, /grayscale/);

  const dot = state('dot-matrix');
  assert.equal(dot.display, 'grid');
  assert.equal(dot.rendering.imageRendering, 'pixelated');
  assert.equal(dot.motion, 'static');
  assert.equal(dot.input, 'keyboard');

  const authoredColor = resolveAdaptiveProfile(
    { width: 320, height: 240, grid: true },
    { colorAdaptation: false },
  );
  assert.equal(authoredColor.display, 'grid');
  assert.equal(authoredColor.rendering.colorAdaptation, false);
  assert.equal(authoredColor.rendering.filter, '');

  const disabled = resolveAdaptiveProfile(
    { width: 184, height: 224, grid: true, update: 'none', rowCount: 100_000 },
    false,
  );
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.motion, 'full');
  assert.equal(disabled.rendering.colorAdaptation, false);
  assert.equal(disabled.rendering.pixelRatioCap, 3);
  assert.equal(disabled.rendering.imageRendering, 'auto');
  assert.equal(disabled.rendering.filter, '');
  assert.equal(disabled.interaction.inspectionZoom, false);
});

test('automatic capability resolution composes foldable, forced-color, RTL, input and resource signals', () => {
  const state = resolveAdaptiveProfile({
    width: 340,
    height: 720,
    rowCount: 80_000,
    pointer: 'coarse',
    hover: false,
    viewportSegments: 2,
    forcedColors: true,
    reducedMotion: true,
    deviceMemoryGB: 1,
    direction: 'rtl',
    virtualKeyboardInset: 240,
  });
  for (const id of [
    'zoom-reflow',
    'foldable-dual',
    'forced-colors',
    'reduced-effects',
    'coarse-touch',
    'low-resource',
    'rtl',
    'virtual-keyboard',
  ])
    assert.ok(state.capabilities.includes(id), id);
  assert.equal(state.display, 'high-contrast');
  assert.equal(state.largeData, true);
  assert.equal(state.interaction.inspectionZoom, true);
});

test('large-data detection counts independent layer and composition inputs without counting columns twice', () => {
  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 3 },
  ];
  assert.equal(
    estimateSpecRowCount({
      layers: [
        { data: rows, mark: 'line', x: 'x', y: 'y' },
        { data: rows, mark: 'point', x: 'x', y: 'y' },
      ],
      inset: {
        base: { data: rows, mark: 'bar', x: 'x', y: 'y' },
        view: { data: rows, mark: 'line', x: 'x', y: 'y' },
      },
    }),
    8,
  );
});

test('adaptive ChartSpec remains ephemeral and respects explicit interaction opt-outs', () => {
  const original = {
    data: [{ category: 'A', value: 1 }],
    mark: 'bar',
    x: 'category',
    y: 'value',
    legend: true,
    interaction: { playback: false },
  };
  const before = JSON.stringify(original);
  const state = resolveAdaptiveProfile(
    { width: 184, height: 224, rowCount: 60_000 },
    { profiles: 'smartwatch' },
  );
  const adapted = adaptChartSpec(original, state);
  assert.equal(JSON.stringify(original), before);
  assert.notEqual(adapted, original);
  assert.equal(adapted.legend.position, 'bottom');
  assert.equal(adapted.interaction.navigation.maxZoom, 6);
  assert.equal(adapted.interaction.controls.zoom, true);
  assert.equal(adapted.interaction.controls.reset, true);

  const optedOut = adaptChartSpec(
    {
      ...original,
      interaction: { navigation: false, controls: false },
    },
    state,
  );
  assert.equal(optedOut.interaction.navigation, false);
  assert.equal(optedOut.interaction.controls, false);
  const authoredColor = adaptChartSpec(
    original,
    resolveAdaptiveProfile(
      { width: 320, height: 240, grid: true },
      { profiles: 'dot-matrix', colorAdaptation: false },
    ),
  );
  assert.equal(authoredColor.theme.name, 'adaptive:motion');
  assert.equal(authoredColor.theme.colors, undefined);
  assert.equal(normalizeAdaptiveOptions(false).enabled, false);
});

test('every Canvas family compiles in smartwatch, electronic-paper and dot-matrix profiles', () => {
  const profileIds = ['smartwatch', 'ebook-paper', 'dot-matrix'];
  assert.equal(fullCatalog.length, 41);
  for (const family of fullCatalog) {
    const variant = fullVariantCatalog.find(({ familyId }) => family.id === familyId);
    assert.notEqual(variant, undefined, `${family.id} representative variant`);
    const base = seriesSampleSpec(variant);
    for (const profileId of profileIds) {
      const profile = adaptiveProfileCatalog.find(({ id }) => id === profileId);
      const state = resolveAdaptiveProfile(
        {
          width: profile.presentation.width,
          height: profile.presentation.height,
          rowCount: 100_000,
        },
        { profiles: profileId },
      );
      const result = compile(adaptChartSpec(base, state), {
        width: profile.presentation.width,
        height: profile.presentation.height,
      });
      assert.ok(result.scene.width > 0, `${family.id}.${profileId} width`);
      assert.ok(result.scene.height > 0, `${family.id}.${profileId} height`);
      assert.ok(result.scene.metadata.renderedNodeCount > 0, `${family.id}.${profileId} nodes`);
      assert.ok(result.scene.semanticIndex.length > 0, `${family.id}.${profileId} semantics`);
    }
  }
});

test('every Spatial mode keeps valid geometry under the same adaptive registry', () => {
  for (const profileId of ['smartwatch', 'ebook-paper', 'dot-matrix']) {
    const profile = adaptiveProfileCatalog.find(({ id }) => id === profileId);
    const state = resolveAdaptiveProfile(
      { width: profile.presentation.width, height: profile.presentation.height },
      { profiles: profileId },
    );
    assert.equal(state.profiles[0], profileId);
    for (const [mode, spec] of Object.entries(spatialSampleSpecs)) {
      const scene = compileSpatial(spec);
      assert.ok(scene.geometries.length > 0, `${mode}.${profileId} geometries`);
      assert.ok(scene.geometries.every(({ positions }) => positions.length > 0));
    }
  }
});
