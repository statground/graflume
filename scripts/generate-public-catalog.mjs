import assert from 'node:assert/strict';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { format, resolveConfig } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const write = process.argv.includes('--write') || !check;
const featurePath = path.join(root, 'catalog/graflume.features.json');
const limitationEvidencePath = path.join(
  root,
  'catalog/graflume.current-limitations.evidence.json',
);
const outputPath = path.join(root, 'catalog/graflume.catalog.json');
const roadmapPath = path.join(root, 'docs/development/verified-feature-matrix.md');
const packagePath = path.join(root, 'package.json');

const complete = await import(pathToFileURL(path.join(root, 'dist/graflume.complete.js')));
const spatial = await import(pathToFileURL(path.join(root, 'dist/graflume.spatial.js')));
const features = JSON.parse(await readFile(featurePath, 'utf8'));
const limitationEvidence = JSON.parse(await readFile(limitationEvidencePath, 'utf8'));
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));

async function formatGenerated(source, filepath) {
  return format(source, {
    ...((await resolveConfig(filepath)) ?? {}),
    filepath,
  });
}

const unique = (items, label, key = (item) => item) => {
  const seen = new Set();
  for (const item of items) {
    const id = key(item);
    assert.ok(!seen.has(id), `${label} contains duplicate ${id}`);
    seen.add(id);
  }
};

const groups = [
  {
    id: 'default',
    name: 'Default families',
    entryPoint: 'graflume',
    renderer: 'canvas',
    familyIds: complete.chartTypeCatalog.map(({ id }) => id),
  },
  {
    id: 'advanced',
    name: 'Advanced families',
    entryPoint: 'graflume/complete',
    renderer: 'canvas',
    familyIds: complete.additionalChartTypeCatalog.map(({ id }) => id),
  },
  {
    id: 'specialized',
    name: 'Specialized families',
    entryPoint: 'graflume/complete',
    renderer: 'canvas',
    familyIds: complete.seriesChartTypeCatalog.map(({ id }) => id),
  },
  {
    id: 'spatial',
    name: 'Spatial families',
    entryPoint: 'graflume/spatial',
    renderer: 'webgl',
    familyIds: spatial.spatialChartFamilies.map(({ familyId }) => familyId),
  },
];

const groupByFamily = new Map(
  groups.flatMap((group) => group.familyIds.map((familyId) => [familyId, group])),
);
const featureByFamily = new Map(features.families.map((family) => [family.id, family]));
const limitationEvidenceByFamily = new Map(
  limitationEvidence.families.map((family) => [family.id, family]),
);
const canvasFamilyById = new Map(complete.fullCatalog.map((family) => [family.id, family]));
const spatialFamilyNames = new Map([
  ['surface', 'Surface'],
  ['volume', 'Volume'],
  ['spatial-vector', 'Spatial vector'],
]);
const allFamilyIds = groups.flatMap(({ familyIds }) => familyIds);

unique(allFamilyIds, 'canonical families');
unique(features.families, 'feature families', ({ id }) => id);
assert.deepEqual(
  [...featureByFamily.keys()].sort(),
  [...allFamilyIds].sort(),
  'feature matrix must cover the exact canonical family set',
);

const spatialFamilyById = new Map(
  spatial.spatialChartFamilies.map((family) => [family.familyId, family]),
);

function familyManual(id, renderer) {
  return renderer === 'webgl' ? `docs/spatial/${id}.md` : `docs/charts/${id}.md`;
}

function familySnapshot(id, renderer) {
  return renderer === 'webgl'
    ? `docs/assets/spatial/${id === 'spatial-vector' ? 'vector-cone' : id}.svg`
    : `docs/assets/charts/${id}.svg`;
}

const families = allFamilyIds.map((id, order) => {
  const group = groupByFamily.get(id);
  const feature = featureByFamily.get(id);
  const completed = limitationEvidenceByFamily.get(id);
  assert.ok(group && feature && completed, `missing catalog contract for ${id}`);
  const canvasFamily = canvasFamilyById.get(id);
  const spatialFamily = spatialFamilyById.get(id);
  const quickApi = canvasFamily?.quickApi ?? spatialFamily?.variants[0]?.quickApi;
  const mark = canvasFamily?.mark ?? spatialFamily?.variants[0]?.mark;
  assert.ok(quickApi && mark, `missing public API metadata for ${id}`);
  return {
    id,
    name: canvasFamily?.name ?? spatialFamilyNames.get(id) ?? id,
    order,
    group: group.id,
    entryPoint: group.entryPoint,
    renderer: group.renderer,
    quickApi,
    mark,
    coordinate: feature.coordinate,
    implementationStatus: feature.status,
    manual: familyManual(id, group.renderer),
    representativeSnapshot: familySnapshot(id, group.renderer),
    supportedFeatures: feature.supported,
    currentLimitations: feature.p0,
    completedCurrentLimitations: completed.capabilities,
    implementationEvidence: { sources: completed.sources, tests: completed.tests },
    developmentDependencies: feature.dependencies,
  };
});

function transformSemantics(entry) {
  const id = entry.id;
  const mode = entry.mode;
  if (id === 'theme-river') return ['stack:silhouette', 'order:input'];
  if (id === 'streamgraph') return ['stack:wiggle', 'order:insideOut'];
  if (id.includes('histogram')) return ['bin'];
  if (id === 'pareto') return ['sort:descending', 'window:cumulative'];
  if (id === 'waterfall') return ['window:running-sum'];
  if (['renko', 'point-and-figure', 'kagi', 'three-line-break', 'range-bars'].includes(id)) {
    return [`finance:${id}`];
  }
  if (entry.familyId === 'technical-indicator') {
    const capability =
      complete.resolveTechnicalIndicatorCapability(id) ??
      complete.resolveTechnicalIndicatorCapability(mode);
    assert.ok(capability, `missing technical-indicator capability for ${id}`);
    return capability.support === 'computed'
      ? ['indicator:computed', 'warm-up:null', 'provenance:formula-registry']
      : ['indicator:precomputed-required'];
  }
  if (mode === 'trend') return ['regression:linear'];
  return [];
}

function compatibilityNote(entry) {
  if (entry.id === 'tiled-map') {
    return 'Historical compatibility name: this mode uses the embedded political basemap and performs no tile request.';
  }
  if (entry.id === 'scatter-3d') {
    return 'Portable Canvas depth cues only; use spatialScatter() from graflume/spatial for depth-tested WebGL.';
  }
  return undefined;
}

function introductionMetadata(entry) {
  if (entry.introducedIn === undefined) return {};
  assert.equal(typeof entry.introducedIn, 'string', `${entry.id} introducedIn must be a string`);
  assert.match(
    entry.introducedIn,
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
    `${entry.id} introducedIn must be a stable release identifier`,
  );
  return { introducedIn: entry.introducedIn };
}

const canvasModes = complete.fullVariantCatalog.map((entry, order) => {
  const family = families.find(({ id }) => id === entry.familyId);
  const adapter = entry.familyId === 'custom';
  assert.ok(family || adapter, `mode ${entry.id} references unknown family ${entry.familyId}`);
  assert.equal(typeof complete[entry.quickApi], 'function', `missing Quick API ${entry.quickApi}`);
  const note = compatibilityNote(entry);
  return {
    id: entry.id,
    name: entry.name,
    order,
    familyId: adapter ? null : entry.familyId,
    mode: entry.mode,
    kind: adapter ? 'adapter' : 'preset',
    entryPoint:
      adapter && entry.id === 'vega' ? 'graflume' : (family?.entryPoint ?? 'graflume/complete'),
    renderer: 'canvas',
    quickApi: entry.quickApi,
    mark: entry.mark,
    requiredCapabilities: ['canvas'],
    transformSemantics: transformSemantics(entry),
    accessibilityFallback: 'host-provided-semantic-table',
    performanceProfile: 'auto',
    exampleRef: `${adapter ? 'docs/charts/adapters.md' : family.manual}#variant-${entry.id}`,
    ...introductionMetadata(entry),
    ...(entry.id === 'tiled-map' ? { deprecated: true, preferredModeId: 'map' } : {}),
    ...(note === undefined ? {} : { compatibilityNote: note }),
  };
});

const spatialModes = spatial.spatialChartFamilies.flatMap((family) =>
  family.variants.map((entry) => {
    assert.equal(
      typeof spatial[entry.quickApi],
      'function',
      `missing Spatial API ${entry.quickApi}`,
    );
    return {
      id: entry.id,
      name: entry.description,
      order: canvasModes.length + families.findIndex(({ id }) => id === family.familyId),
      familyId: family.familyId,
      mode: entry.mode,
      kind: 'spatial-variant',
      entryPoint: family.entryPoint,
      renderer: family.renderer,
      quickApi: entry.quickApi,
      mark: entry.mark,
      requiredCapabilities: ['webgl2'],
      transformSemantics: [],
      accessibilityFallback: 'bounded-semantic-table',
      performanceProfile: 'auto',
      exampleRef: `docs/spatial/${family.familyId}.md#${entry.id}`,
      ...introductionMetadata(entry),
    };
  }),
);

const integratedSpatialModes = spatial.spatialCompatibilityModes.map((entry) => ({
  id: entry.id,
  name: entry.description,
  order: canvasModes.length + spatialModes.length,
  familyId: entry.canonicalFamilyId,
  mode: entry.mode,
  kind: entry.integration,
  entryPoint: entry.entryPoint,
  renderer: entry.renderer,
  quickApi: entry.quickApi,
  mark: entry.mark,
  requiredCapabilities: ['webgl2'],
  transformSemantics: ['projection:spherical'],
  accessibilityFallback: 'bounded-semantic-table',
  performanceProfile: 'auto',
  exampleRef: 'docs/spatial/globe.md',
  ...introductionMetadata(entry),
}));

const modes = [...canvasModes, ...spatialModes, ...integratedSpatialModes];
unique(modes, 'modes', ({ id }) => id);

const compatibilityIdentifiers = complete.seriesCompatibilityCatalog.map((entry) => ({
  id: entry.identifier,
  familyId: entry.familyId,
  modeId: entry.variantId,
}));
unique(compatibilityIdentifiers, 'compatibility identifiers', ({ id }) => id);
const modeIds = new Set(modes.map(({ id }) => id));
for (const entry of compatibilityIdentifiers) {
  assert.ok(modeIds.has(entry.modeId), `compatibility ${entry.id} references ${entry.modeId}`);
}

const themes = complete.builtInThemeCatalog.map((entry, order) => ({
  id: entry.id,
  name: entry.id,
  order,
  default: entry.id === complete.defaultThemeId,
  mode: entry.tokens.mode,
  sourceBaseline: entry.sourceBaseline ?? null,
  snapshotRoot:
    entry.id === complete.defaultThemeId ? 'docs/assets' : `docs/assets/themes/${entry.id}`,
}));
unique(themes, 'themes', ({ id }) => id);
assert.equal(themes.filter(({ default: isDefault }) => isDefault).length, 1);

const samples = families.map((family) => {
  const familyModes = modes.filter((mode) => mode.familyId === family.id);
  const representative =
    familyModes.find((mode) => mode.quickApi === family.quickApi) ?? familyModes[0];
  assert.ok(representative, `family ${family.id} has no representative mode`);
  return {
    id: `${family.id}-representative`,
    familyId: family.id,
    modeId: representative.id,
    entryPoint: family.entryPoint,
    renderer: family.renderer,
    manual: family.manual,
    snapshot: family.representativeSnapshot,
  };
});

for (const family of families) {
  await access(path.join(root, family.manual));
  await access(path.join(root, family.representativeSnapshot));
}

const manifest = {
  $schema: '../schema/graflume.catalog.schema.json',
  schemaVersion: 1,
  package: {
    name: packageJson.name,
    version: packageJson.version,
    chartSpecVersion: complete.specVersion,
    spatialSpecVersion: spatial.spatialSpecVersion,
    bundles: {
      default: 'cdn/graflume.global.js',
      complete: 'cdn/graflume.complete.global.js',
      spatial: 'cdn/graflume.spatial.global.js',
    },
  },
  verifiedAt: features.verifiedAt,
  totals: {
    canonicalFamilies: families.length,
    canvasFamilies: families.filter(({ renderer }) => renderer === 'canvas').length,
    spatialFamilies: families.filter(({ renderer }) => renderer === 'webgl').length,
    presetsAndModes: modes.length,
    canvasPresets: canvasModes.length,
    spatialVariants: spatialModes.length,
    integratedSpatialModes: integratedSpatialModes.length,
    compatibilityIdentifiers: compatibilityIdentifiers.length,
    themes: themes.length,
    completedCurrentLimitations: limitationEvidence.totalCompleted,
    currentLimitations: families.reduce((sum, family) => sum + family.currentLimitations.length, 0),
    marks:
      complete.capabilities().marks.length +
      new Set([
        ...spatial.spatialChartFamilies.flatMap(({ variants }) => variants.map(({ mark }) => mark)),
        ...spatial.spatialCompatibilityModes.map(({ mark }) => mark),
      ]).size,
  },
  groups,
  currentLimitations: {
    release: limitationEvidence.release,
    completed: limitationEvidence.totalCompleted,
    remaining: families.reduce((sum, family) => sum + family.currentLimitations.length, 0),
    evidence: 'catalog/graflume.current-limitations.evidence.json',
  },
  families,
  modes,
  compatibilityIdentifiers,
  themes,
  samples,
  runtimeCapabilities: complete.runtimeCapabilities,
  principles: features.principles,
  crossCuttingContracts: features.crossCuttingContracts,
  modeBacklog: features.modeBacklog,
  ecosystemInputs: features.ecosystemInputs,
  researchSources: features.researchSources,
  verificationContracts: features.verificationContracts,
  commonFoundations: features.commonFoundations,
  candidates: features.candidates,
  capabilityProfiles: features.capabilityProfiles,
  themeFamilies: features.themeFamilies,
};

assert.equal(
  manifest.totals.canonicalFamilies,
  spatial.spatialCatalogBoundary.totalCanonicalFamilies,
);
assert.equal(manifest.totals.presetsAndModes, spatial.spatialCatalogBoundary.totalPresetsAndModes);
assert.equal(manifest.totals.canvasPresets, complete.fullVariantCatalog.length);
assert.equal(manifest.totals.compatibilityIdentifiers, complete.seriesCompatibilityCatalog.length);
assert.deepEqual(manifest.runtimeCapabilities.technicalIndicators.publicEntryPoints, {
  canonical: complete.technicalIndicatorCanonicalSurfaces,
  ...complete.technicalIndicatorPublicEntryPointCount,
});
assert.equal(manifest.runtimeCapabilities.technicalIndicators.calculations.computed, 45);
assert.equal(manifest.runtimeCapabilities.technicalIndicators.calculations.precomputedRequired, 0);

const json = await formatGenerated(`${JSON.stringify(manifest, null, 2)}\n`, outputPath);

const esc = (value) => String(value).replaceAll('|', '\\|');
const list = (values) =>
  values.length === 0 ? '—' : values.map((value) => `\`${esc(value)}\``).join(', ');
const introducedModes = modes.filter(({ introducedIn }) => introducedIn !== undefined);
const roadmapSource =
  `# Verified feature matrix\n\n` +
  `Generated from the runtime catalogs and \`catalog/graflume.features.json\`. Do not edit this file directly.\n\n` +
  `Verified: ${features.verifiedAt} · ${families.length} canonical families · ${modes.length} presets/modes · ${themes.length} themes.\n\n` +
  `Status is deliberately conservative: **supported** means an executable and tested contract, **partial** means the current boundary is listed, and **planned/research** is never advertised as runtime support.\n\n` +
  `The \`${limitationEvidence.release}\` implementation closes all ${limitationEvidence.totalCompleted} previously listed current limitations; ${families.reduce((sum, family) => sum + family.currentLimitations.length, 0)} remain in the current-limitations field. Source and test evidence is preserved in \`catalog/graflume.current-limitations.evidence.json\`.\n\n` +
  `## Runtime name-function contracts\n\n` +
  `- Long-form Area, Bar, and Theme river share the ${complete.runtimeCapabilities.seriesStack.id} engine: ${complete.runtimeCapabilities.seriesStack.modes.join(', ')}.\n` +
  `- Technical indicators expose ${complete.runtimeCapabilities.technicalIndicators.publicEntryPoints.namedPresets} named presets plus ${complete.runtimeCapabilities.technicalIndicators.publicEntryPoints.canonicalSurfaces} canonical surfaces (${complete.runtimeCapabilities.technicalIndicators.publicEntryPoints.total} total). Exactly ${complete.runtimeCapabilities.technicalIndicators.calculations.computed} are formula-tested computed; ${complete.runtimeCapabilities.technicalIndicators.calculations.precomputedRequired} are precomputed-required.\n` +
  `- tiled-map is a deprecated ${complete.runtimeCapabilities.tiledMap.behavior} with tile lifecycle and network requests both disabled.\n\n` +
  `## Release-introduced modes\n\n` +
  `\`introducedIn\` is emitted from the runtime variant registry. It records when a mode first became executable without promoting that mode to a separate canonical family.\n\n` +
  `| Release | Mode | Canonical family | Quick API |\n|---|---|---|---|\n` +
  (introducedModes.length === 0
    ? '| — | — | — | — |'
    : introducedModes
        .map(
          (item) =>
            `| \`${esc(item.introducedIn)}\` | \`${esc(item.id)}\` | ${item.familyId === null ? '—' : `\`${esc(item.familyId)}\``} | \`${esc(item.quickApi)}()\` |`,
        )
        .join('\n')) +
  `\n\n` +
  `## Common foundations\n\n` +
  `| Foundation | Status | Verified boundary | Unlocks |\n|---|---|---|---|\n` +
  features.commonFoundations
    .map(
      (item) =>
        `| \`${item.id}\` | ${item.status} | ${esc(item.summary)} | ${list(item.unlocks)} |`,
    )
    .join('\n') +
  `\n\n## Canonical families\n\n` +
  `| Family | Status | Current executable support | Completed current limitations | Current limitations | P1 | P2 | Dependencies |\n|---|---|---|---|---|---|---|---|\n` +
  features.families
    .map(
      (item) =>
        `| [\`${item.id}\`](../${item.id === 'surface' || item.id === 'volume' || item.id === 'spatial-vector' ? `spatial/${item.id}.md` : `charts/${item.id}.md`}) | ${item.status} | ${list(item.supported)} | ${list(limitationEvidenceByFamily.get(item.id).capabilities)} | ${list(item.p0)} | ${list(item.p1)} | ${list(item.p2)} | ${list(item.dependencies)} |`,
    )
    .join('\n') +
  `\n\n## Candidate contracts\n\n` +
  `| Candidate | Placement | Status | Host | Required contract |\n|---|---|---|---|---|\n` +
  features.candidates
    .map(
      (item) =>
        `| \`${item.id}\` | ${item.kind} | ${item.status} | ${item.host === undefined ? '—' : `\`${item.host}\``} | ${list(item.contract)} |`,
    )
    .join('\n') +
  `\n\n## Cross-cutting contracts\n\n` +
  `| Contract | Status | Complete scope |\n|---|---|---|\n` +
  features.crossCuttingContracts
    .map((item) => `| \`${item.id}\` | ${item.status} | ${list(item.items)} |`)
    .join('\n') +
  `\n\n## Mode backlog\n\n` +
  `| Host family | Modes and recipes |\n|---|---|\n` +
  Object.entries(features.modeBacklog)
    .map(([family, items]) => `| \`${family}\` | ${list(items)} |`)
    .join('\n') +
  `\n\n## Ecosystem inputs\n\n` +
  `| Source | Graflume layer | Functionality to evaluate |\n|---|---|---|\n` +
  features.ecosystemInputs
    .map((item) => `| ${esc(item.id)} | ${esc(item.placement)} | ${list(item.features)} |`)
    .join('\n') +
  `\n\n## Research sources\n\n` +
  `The audited research preserves ${features.researchSources.length} exact HTTPS source URLs in the machine-readable catalog.\n\n` +
  features.researchSources.map((url) => `- <${url}>`).join('\n') +
  `\n\n## Verification contracts\n\n` +
  features.verificationContracts
    .map((item) => `### ${item.id}\n\n${item.items.map((value) => `- ${value}`).join('\n')}`)
    .join('\n\n') +
  `\n\n## Public manifest\n\n` +
  `The machine-readable contract is [\`catalog/graflume.catalog.json\`](../../catalog/graflume.catalog.json). It is generated from the exact runtime catalog and is the integration source for downstream sites.\n`;
const roadmap = await formatGenerated(roadmapSource, roadmapPath);

async function compareOrWrite(filename, expected) {
  if (check) {
    const actual = await readFile(filename, 'utf8').catch(() => '');
    assert.equal(
      actual,
      expected,
      `${path.relative(root, filename)} is stale; run npm run catalog:generate`,
    );
  } else if (write) {
    await writeFile(filename, expected);
  }
}

await compareOrWrite(outputPath, json);
await compareOrWrite(roadmapPath, roadmap);
console.log(
  check
    ? 'Verified public catalog and feature matrix.'
    : 'Generated public catalog and feature matrix.',
);
