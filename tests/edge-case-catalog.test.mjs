import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildEdgeCaseCatalog,
  edgeCaseFamilyPolicies,
  edgeCaseProfiles,
  edgeCaseRecipeCatalog,
} from '../scripts/edge-case-samples.mjs';

const publicCatalog = JSON.parse(
  await readFile(new URL('../catalog/graflume.catalog.json', import.meta.url), 'utf8'),
);
const catalogSource = await readFile(
  new URL('../catalog/graflume.edge-cases.json', import.meta.url),
  'utf8',
);
const catalog = JSON.parse(catalogSource);
const schema = JSON.parse(
  await readFile(new URL('../schema/graflume.edge-cases.schema.json', import.meta.url), 'utf8'),
);
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const profileIds = ['range', 'structure', 'volume'];

function finiteJson(value, path = '$') {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${path} must be finite`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => finiteJson(entry, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => finiteJson(entry, `${path}.${key}`));
  }
}

function quantitativeValues(example) {
  const fields = new Set(
    example.fields.filter(({ type }) => type === 'quantitative').map(({ name }) => name),
  );
  return example.tableData.flatMap((row) =>
    Object.entries(row)
      .filter(([name, value]) => fields.has(name) && typeof value === 'number')
      .map(([, value]) => value),
  );
}

function examplesForFamily(familyId) {
  return catalog.examples.filter((example) => example.familyId === familyId);
}

test('edge-case catalog is a deterministic companion without changing public catalog v2', () => {
  assert.equal(publicCatalog.schemaVersion, 2);
  assert.equal(publicCatalog.manualExamples.length, 176);
  assert.equal(Object.hasOwn(publicCatalog, 'edgeCases'), false);
  assert.equal(Object.hasOwn(publicCatalog, 'edgeCaseExamples'), false);
  assert.deepEqual(buildEdgeCaseCatalog(publicCatalog), catalog);
  assert.equal(catalog.schemaVersion, 1);
  assert.deepEqual(catalog.sourceCatalog, {
    path: 'catalog/graflume.catalog.json',
    schemaVersion: 2,
  });
});

test('44 canonical families own exact ordered range, structure, and volume examples', async () => {
  assert.deepEqual(
    catalog.profiles.map(({ id }) => id),
    profileIds,
  );
  assert.deepEqual(
    edgeCaseProfiles.map(({ id }) => id),
    profileIds,
  );
  assert.deepEqual(
    Object.keys(edgeCaseFamilyPolicies).sort(),
    publicCatalog.families.map(({ id }) => id).sort(),
  );
  assert.deepEqual(catalog.totals, {
    canonicalFamilies: 44,
    profiles: 3,
    examples: 132,
    tablePreviewRowLimit: 12,
  });
  assert.equal(catalog.examples.length, 132);
  assert.equal(new Set(catalog.examples.map(({ id }) => id)).size, 132);

  const sampleByFamily = new Map(
    publicCatalog.samples.map((sample) => [sample.familyId, sample.modeId]),
  );
  const manualById = new Map(publicCatalog.manualExamples.map((example) => [example.id, example]));
  for (const family of publicCatalog.families) {
    const examples = examplesForFamily(family.id);
    assert.deepEqual(
      examples.map(({ id }) => id),
      profileIds.map((profileId) => `${family.id}-${profileId}`),
      family.id,
    );
    const representative = manualById.get(sampleByFamily.get(family.id));
    assert.ok(representative, `${family.id} representative`);
    for (const example of examples) {
      assert.equal(example.quickApi, family.quickApi, `${example.id} Quick API`);
      assert.equal(example.portableMark, family.mark, `${example.id} portable mark`);
      assert.equal(example.runtime, representative.runtime, `${example.id} runtime`);
      assert.equal(example.entryPoint, representative.entryPoint, `${example.id} entry point`);
      assert.equal(example.renderer, representative.renderer, `${example.id} renderer`);
      assert.equal(example.recipe.parameters.family, family.id, `${example.id} recipe family`);
      assert.equal(example.recipe.parameters.scenario, example.profileId, `${example.id} scenario`);
      const [sourcePath] = example.sourceRef.split('#');
      await access(new URL(`../${sourcePath}`, import.meta.url));
    }
  }
});

test('recipes are closed, seeded, JSON-safe, compact, and carry bounded table previews', () => {
  const recipeIds = edgeCaseRecipeCatalog.map(({ id }) => id);
  assert.deepEqual(
    catalog.recipeCatalog.map(({ id }) => id),
    recipeIds,
  );
  assert.equal(new Set(recipeIds).size, recipeIds.length);
  assert.equal(new Set(catalog.examples.map(({ recipe }) => recipe.seed)).size, 132);
  assert.ok(Buffer.byteLength(catalogSource) < 500_000, 'edge catalog must stay compact');
  finiteJson(catalog);

  const shapeByRecipe = new Map(catalog.recipeCatalog.map(({ id, shape }) => [id, shape]));
  for (const example of catalog.examples) {
    assert.equal(Object.hasOwn(example, 'data'), false, `${example.id} embeds no generated data`);
    assert.ok(recipeIds.includes(example.recipe.id), `${example.id} recipe id`);
    assert.equal(example.recipe.version, 1, `${example.id} recipe version`);
    assert.equal(example.recipe.shape, shapeByRecipe.get(example.recipe.id), `${example.id} shape`);
    assert.ok(example.recipe.seed >= 1 && example.recipe.seed <= 0xffffffff, `${example.id} seed`);
    assert.ok(
      example.tableData.length >= 1 && example.tableData.length <= 12,
      `${example.id} table rows`,
    );
    assert.equal(
      example.expectations.tablePreviewRows,
      example.tableData.length,
      `${example.id} preview count`,
    );
    assert.equal(
      example.expectations.inputRows,
      example.recipe.rowCount,
      `${example.id} input rows`,
    );
    assert.equal(example.expectations.bounded, true, `${example.id} bounded`);
    assert.ok(example.expectations.outputBudget.maximum >= 1, `${example.id} output budget`);
    assert.ok(
      example.expectations.invariants.includes('finite-json'),
      `${example.id} finite invariant`,
    );
    assert.equal(
      new Set(example.demonstrates).size,
      example.demonstrates.length,
      `${example.id} claims`,
    );
    assert.equal(
      new Set(example.expectations.invariants).size,
      example.expectations.invariants.length,
      `${example.id} invariants`,
    );
    assert.equal(
      new Set(example.expectations.handling).size,
      example.expectations.handling.length,
      `${example.id} handling`,
    );

    const fieldNames = example.fields.map(({ name }) => name);
    assert.equal(new Set(fieldNames).size, fieldNames.length, `${example.id} fields`);
    for (const [rowIndex, row] of example.tableData.entries()) {
      for (const field of fieldNames) {
        assert.ok(Object.hasOwn(row, field), `${example.id} row ${rowIndex} field ${field}`);
      }
    }
  }
});

test('range profiles show actual safe extremes and domain-specific boundaries', () => {
  for (const family of publicCatalog.families) {
    const example = examplesForFamily(family.id)[0];
    assert.equal(example.profileId, 'range');
    assert.ok(example.demonstrates.includes('extreme-range'), example.id);
    const values = quantitativeValues(example);
    if (example.demonstrates.includes('extreme-small')) {
      assert.ok(
        values.some((value) => Math.abs(value) > 0 && Math.abs(value) <= 1e-9),
        `${example.id} small`,
      );
    }
    if (example.demonstrates.includes('extreme-large')) {
      const threshold = family.id === 'item' ? 1e6 : 1e9;
      assert.ok(
        values.some((value) => Math.abs(value) >= threshold),
        `${example.id} large`,
      );
    }
    if (example.demonstrates.includes('mixed-sign')) {
      assert.ok(
        values.some((value) => value < 0),
        `${example.id} negative`,
      );
      assert.ok(
        values.some((value) => value > 0),
        `${example.id} positive`,
      );
    }
    if (example.demonstrates.includes('zero')) {
      assert.ok(
        values.some((value) => value === 0),
        `${example.id} zero`,
      );
    }
  }

  const timeline = examplesForFamily('timeline')[0];
  assert.equal(timeline.tableData[0].start, '1900-01-01');
  assert.equal(timeline.tableData.at(-1).end, '2100-01-01');
  const image = examplesForFamily('image')[0];
  assert.ok(
    image.tableData.every((row) =>
      ['red', 'green', 'blue'].every((field) => row[field] >= 0 && row[field] <= 255),
    ),
  );
});

test('structure profiles expose only reviewed irregular semantics', () => {
  for (const family of publicCatalog.families) {
    const example = examplesForFamily(family.id)[1];
    assert.equal(example.profileId, 'structure');
    assert.equal(example.demonstrates[0], 'irregular-structure', example.id);
    assert.ok(example.demonstrates.length >= 3, `${example.id} structural claims`);
    if (example.demonstrates.includes('null')) {
      assert.ok(
        example.tableData.some((row) => Object.values(row).some((value) => value === null)),
        `${example.id} null preview`,
      );
    }
    if (example.demonstrates.some((claim) => claim.startsWith('duplicate'))) {
      const rows = example.tableData.map((row) => JSON.stringify(row));
      assert.ok(new Set(rows).size < rows.length, `${example.id} duplicate preview`);
    }
  }

  for (const familyId of ['hierarchy', 'word-tree']) {
    const example = examplesForFamily(familyId)[1];
    assert.ok(example.expectations.handling.some((value) => value.includes('duplicate')));
    assert.ok(example.expectations.handling.some((value) => value.includes('forbidden')));
  }
  assert.ok(
    examplesForFamily('flow')[1].expectations.invariants.includes('acyclic-flow'),
    'flow must not advertise cyclic input as a valid Sankey case',
  );
});

test('volume profiles remain recipes and declare deterministic renderer budgets', () => {
  for (const family of publicCatalog.families) {
    const example = examplesForFamily(family.id)[2];
    assert.equal(example.profileId, 'volume');
    assert.deepEqual(example.demonstrates, [
      'high-volume',
      'deterministic-generation',
      'bounded-rendering',
    ]);
    assert.ok(example.recipe.rowCount >= 5_000, `${example.id} logical input volume`);
    assert.ok(example.recipe.rowCount > example.tableData.length, `${example.id} compact preview`);
    assert.ok(
      example.expectations.outputBudget.maximum <= 4_194_304,
      `${example.id} bounded output`,
    );
    assert.deepEqual(example.expectations.handling, [
      'deterministic-seed',
      'bounded-output',
      'compact-recipe-not-expanded-data',
    ]);
    if (example.runtime === 'core') {
      const explicit = example.recipe.parameters.explicitPerformance === true;
      assert.equal(
        example.options.performance,
        explicit ? example.expectations.performanceProfile : 'auto',
        `${example.id} performance option`,
      );
    } else {
      assert.equal(
        Object.hasOwn(example.options, 'performance'),
        false,
        `${example.id} spatial profile`,
      );
      assert.equal(example.expectations.performanceProfile, 'spatial-bounded');
    }
  }

  assert.equal(examplesForFamily('funnel')[2].recipe.rowCount, 130_000);
  assert.equal(examplesForFamily('hierarchy')[2].expectations.outputBudget.maximum, 5_000);
  assert.deepEqual(examplesForFamily('surface')[2].recipe.parameters, {
    family: 'surface',
    scenario: 'volume',
    valuePolicy: 'spatial-signed',
    valueFields: ['z', 'value'],
    positiveFields: [],
    nullableFields: [],
    rows: 257,
    columns: 257,
  });
  assert.deepEqual(examplesForFamily('volume')[2].recipe.parameters.dimensions, [64, 64, 64]);
});

test('family mathematical invariants are visible in the range preview', () => {
  for (const familyId of ['candlestick', 'technical-indicator']) {
    for (const row of examplesForFamily(familyId)[0].tableData) {
      assert.ok(row.low <= Math.min(row.open, row.close), `${familyId} low`);
      assert.ok(row.high >= Math.max(row.open, row.close), `${familyId} high`);
      if (typeof row.volume === 'number') assert.ok(row.volume >= 0, `${familyId} volume`);
    }
  }
  for (const row of examplesForFamily('interval')[0].tableData) {
    assert.ok(row.low <= row.high, 'interval low/high');
  }
  for (const row of examplesForFamily('ternary')[0].tableData) {
    assert.ok(row.a >= 0 && row.b >= 0 && row.c >= 0, 'ternary nonnegative');
    assert.ok(row.a + row.b + row.c > 0, 'ternary positive total');
  }
  for (const familyId of [
    'pie',
    'hierarchy',
    'flow',
    'chord',
    'funnel',
    'item',
    'venn',
    'word-cloud',
  ]) {
    const example = examplesForFamily(familyId)[0];
    const fields = new Set(example.recipe.parameters.valueFields);
    for (const row of example.tableData) {
      for (const [field, value] of Object.entries(row)) {
        if (fields.has(field) && typeof value === 'number') {
          assert.ok(value >= 0, `${familyId}.${field} nonnegative`);
        }
      }
    }
  }
});

test('schema and package exports publish the exact separate contract', () => {
  assert.equal(schema.$id, 'urn:graflume:edge-cases:1');
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.equal(schema.properties.examples.minItems, 132);
  assert.equal(schema.properties.examples.maxItems, 132);
  assert.equal(schema.$defs.example.properties.tableData.maxItems, 12);
  assert.deepEqual(
    schema.$defs.recipeId.enum,
    edgeCaseRecipeCatalog.map(({ id }) => id),
  );
  assert.equal(schema.$defs.recipe.additionalProperties, false);
  assert.equal(schema.$defs.example.additionalProperties, false);
  assert.equal(packageJson.exports['./edge-cases'], './catalog/graflume.edge-cases.json');
  assert.equal(
    packageJson.exports['./edge-cases-schema'],
    './schema/graflume.edge-cases.schema.json',
  );
  assert.match(packageJson.scripts['catalog:generate'], /generate-edge-case-catalog\.mjs --write/);
  assert.match(packageJson.scripts['catalog:check'], /generate-edge-case-catalog\.mjs --check/);
});
