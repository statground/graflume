import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildEdgeCaseCatalog,
  edgeCaseFamilyPolicies,
  edgeCaseProfiles,
  edgeCaseRecipeCatalog,
} from '../scripts/edge-case-samples.mjs';
import { demoRecipeIds, materializeDemoRecipe } from '../.tmp/src/demo/recipes.js';
import * as PublicApi from '../.tmp/src/index.js';
import * as SpatialApi from '../.tmp/src/spatial.js';

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
const materializerSource = await readFile(
  new URL('../src/demo/recipes-engine.js', import.meta.url),
  'utf8',
);

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
  assert.equal(catalog.schemaVersion, 2);
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
  assert.ok(Buffer.byteLength(catalogSource) < 750_000, 'edge catalog must stay compact');
  finiteJson(catalog);

  assert.deepEqual(recipeIds, demoRecipeIds);
  for (const example of catalog.examples) {
    assert.equal(Object.hasOwn(example, 'data'), false, `${example.id} embeds no generated data`);
    assert.ok(recipeIds.includes(example.recipe.id), `${example.id} recipe id`);
    assert.equal(example.recipe.version, 2, `${example.id} recipe version`);
    const catalogShape = catalog.recipeCatalog.find(({ id }) => id === example.recipe.id).shape;
    assert.ok(
      catalogShape === example.recipe.shape ||
        (catalogShape === 'rows-or-vector-set' &&
          ['rows', 'vector-set'].includes(example.recipe.shape)),
      `${example.id} shape`,
    );
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
      example.recipe.cardinality.sourceRows,
      `${example.id} input rows`,
    );
    assert.equal(example.expectations.bounded, true, `${example.id} bounded`);
    assert.ok(example.expectations.outputBudget.maximum >= 1, `${example.id} output budget`);
    assert.deepEqual(
      example.recipe.outputBudget,
      example.expectations.outputBudget,
      `${example.id} recipe budget`,
    );
    assert.deepEqual(
      example.recipe.expectedInvariants,
      example.expectations.invariants,
      `${example.id} recipe invariants`,
    );
    assert.equal(example.recipe.preview.maximumRows, 12, `${example.id} preview contract`);
    assert.ok(example.recipe.initialView.zoom > 0, `${example.id} initial view`);
    const parameterKeys = new Set(
      catalog.recipeCatalog.find(({ id }) => id === example.recipe.id).parameterKeys,
    );
    assert.ok(
      Object.keys(example.recipe.parameters).every((key) => parameterKeys.has(key)),
      `${example.id} recipe-specific parameters`,
    );
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
    assert.ok(example.recipe.cardinality.sourceRows >= 5_000, `${example.id} logical input volume`);
    assert.ok(
      example.recipe.cardinality.sourceRows > example.tableData.length,
      `${example.id} compact preview`,
    );
    assert.ok(
      example.expectations.outputBudget.maximum <= 4_194_304,
      `${example.id} bounded output`,
    );
    assert.deepEqual(example.expectations.handling, [
      'deterministic-seed',
      'semantic-level-of-detail',
      'bounded-output',
      'lazy-materialization-after-consent',
    ]);
    assert.ok(
      example.expectations.dataPlan.derivedRows <= example.expectations.dataPlan.renderedMaximum,
      `${example.id} materialized budget`,
    );
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

  assert.equal(examplesForFamily('funnel')[2].recipe.cardinality.sourceRows, 130_000);
  assert.equal(examplesForFamily('hierarchy')[2].expectations.outputBudget.maximum, 5_000);
  assert.equal(examplesForFamily('calendar')[2].recipe.cardinality.sourceRows, 60_000);
  assert.equal(examplesForFamily('calendar')[2].recipe.parameters.dateCycleDays, 3_000);
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

test('all 18 public materializers are deterministic semantic LODs with catalog-identical previews', () => {
  assert.equal(PublicApi.materializeDemoRecipe, materializeDemoRecipe);
  assert.deepEqual(PublicApi.demoRecipeIds, demoRecipeIds);
  assert.equal(SpatialApi.materializeDemoRecipe, materializeDemoRecipe);
  assert.deepEqual(SpatialApi.demoRecipeIds, demoRecipeIds);
  assert.equal(
    materializerSource.includes('Math.random'),
    false,
    'ambient randomness is forbidden',
  );
  const usedRecipeIds = new Set();
  for (const family of publicCatalog.families) {
    const example = examplesForFamily(family.id)[2];
    usedRecipeIds.add(example.recipe.id);
    const first = materializeDemoRecipe(example.recipe);
    const second = materializeDemoRecipe(example.recipe);
    assert.deepEqual(first, second, `${example.id} same-seed stability`);
    assert.deepEqual(first.previewRows, example.tableData, `${example.id} catalog preview`);
    assert.deepEqual(first.plan, example.expectations.dataPlan, `${example.id} data plan`);
    assert.equal(
      first.plan.sourceRows,
      example.recipe.cardinality.sourceRows,
      `${example.id} source cardinality`,
    );
    assert.ok(first.plan.derivedRows <= first.plan.renderedMaximum, `${example.id} bounded LOD`);
    assert.equal(
      first.plan.renderedMaximum,
      example.recipe.outputBudget.maximum,
      `${example.id} budget`,
    );
  }
  assert.deepEqual([...usedRecipeIds].sort(), [...demoRecipeIds].sort());
});

test('materializer rejects irrelevant parameters and every mismatched closed-contract boundary', () => {
  const source = examplesForFamily('line')[2].recipe;
  const mutate = (callback) => {
    const recipe = structuredClone(source);
    callback(recipe);
    return recipe;
  };
  assert.throws(
    () => materializeDemoRecipe(mutate((recipe) => (recipe.parameters.nodeCount = 10))),
    /parameters\.nodeCount is not allowed/,
  );
  assert.throws(
    () => materializeDemoRecipe(mutate((recipe) => (recipe.unreviewed = true))),
    /recipe\.unreviewed is not allowed/,
  );
  assert.throws(
    () => materializeDemoRecipe(mutate((recipe) => (recipe.shape = 'volume-grid'))),
    /shape .* does not match/,
  );
  assert.throws(
    () => materializeDemoRecipe(mutate((recipe) => (recipe.cardinality.unit = 'edges'))),
    /cardinality\.unit/,
  );
  assert.throws(
    () => materializeDemoRecipe(mutate((recipe) => (recipe.cardinality.axes.nodeCount = 2))),
    /cardinality\.axes\.nodeCount is not allowed/,
  );
  assert.throws(
    () => materializeDemoRecipe(mutate((recipe) => delete recipe.initialView)),
    /initialView is required/,
  );
  assert.throws(
    () => materializeDemoRecipe(mutate((recipe) => (recipe.expectedInvariants = []))),
    /expectedInvariants/,
  );
  assert.throws(
    () => materializeDemoRecipe(mutate((recipe) => (recipe.outputBudget.resource = 'voxels'))),
    /outputBudget\.resource/,
  );
});

test('recipe-specific materializers preserve financial, hierarchy, simplex, set, grid, and vector invariants', () => {
  const materializeFamily = (familyId) =>
    materializeDemoRecipe(examplesForFamily(familyId)[2].recipe);

  for (const familyId of ['candlestick', 'technical-indicator']) {
    const { data } = materializeFamily(familyId);
    assert.ok(Array.isArray(data));
    for (const row of data) {
      assert.ok(row.low <= Math.min(row.open, row.close), `${familyId} low`);
      assert.ok(row.high >= Math.max(row.open, row.close), `${familyId} high`);
      assert.ok(row.volume >= 0, `${familyId} volume`);
    }
  }

  const ternary = materializeFamily('ternary').data;
  assert.ok(Array.isArray(ternary));
  for (const row of ternary) {
    assert.ok(row.a >= 0 && row.b >= 0 && row.c >= 0, 'ternary nonnegative');
    assert.ok(Math.abs(row.a + row.b + row.c - 1) <= 2e-7, 'ternary normalized');
  }

  for (const familyId of ['hierarchy', 'word-tree']) {
    const rows = materializeFamily(familyId).data;
    const idField = familyId === 'word-tree' ? 'word' : 'id';
    const ids = new Set(rows.map((row) => row[idField]));
    assert.equal(ids.size, rows.length, `${familyId} unique IDs`);
    assert.equal(rows.filter((row) => row.parent === '').length, 1, `${familyId} root`);
    assert.ok(
      rows.slice(1).every((row) => ids.has(row.parent)),
      `${familyId} parent closure`,
    );
  }

  const venn = materializeFamily('venn').data;
  const singletons = new Map(
    venn.filter((row) => row.sets.length === 1).map((row) => [row.sets[0], row.size]),
  );
  for (const row of venn) {
    assert.ok(
      row.sets.every((set) => row.size <= singletons.get(set)),
      `${row.category} bounded intersection`,
    );
  }

  const surface = materializeFamily('surface').data;
  assert.equal(surface.z.length, surface.rows * surface.columns);
  assert.equal(surface.values.length, surface.z.length);
  const volume = materializeFamily('volume').data;
  assert.equal(
    volume.values.length,
    volume.dimensions.reduce((total, value) => total * value, 1),
  );
  const vectors = materializeFamily('spatial-vector').data;
  assert.equal(vectors.origins.length, vectors.vectors.length);
  assert.ok(vectors.vectors.flat().every(Number.isFinite));
});

test('technical-indicator edge cases use finite precomputed series without warm-up-only output', () => {
  for (const example of examplesForFamily('technical-indicator')) {
    assert.equal(example.options.mark.options.kind, 'sma', example.id);
    assert.equal(Object.hasOwn(example.options.mark.options, 'calculate'), false, example.id);
    assert.deepEqual(example.options.mark.options.fields, ['value', 'signal'], example.id);
    assert.deepEqual(example.recipe.parameters.nullableFields, ['value', 'signal'], example.id);
    assert.deepEqual(example.options.mark.fields, {
      value: 'value',
      middle: 'value',
      signal: 'signal',
    });
    assert.ok(
      example.tableData.some(
        (row) => typeof row.value === 'number' && typeof row.signal === 'number',
      ),
      `${example.id} finite precomputed pair`,
    );
  }
});

test('spatial volume previews have a valid minimum 2 by 2 by 2 cardinality', () => {
  const [range, structure] = examplesForFamily('volume');
  for (const example of [range, structure]) {
    assert.equal(example.recipe.shape, 'volume-grid');
    assert.equal(example.tableData.length, 8);
    assert.equal(example.recipe.cardinality.sourceRows, 8);
    assert.equal(example.expectations.inputRows, 8);
  }
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
  assert.equal(schema.$id, 'urn:graflume:edge-cases:2');
  assert.equal(schema.properties.schemaVersion.const, 2);
  assert.equal(schema.properties.examples.minItems, 132);
  assert.equal(schema.properties.examples.maxItems, 132);
  assert.equal(schema.$defs.example.properties.tableData.maxItems, 12);
  assert.deepEqual(
    schema.$defs.recipeId.enum,
    edgeCaseRecipeCatalog.map(({ id }) => id),
  );
  assert.ok(edgeCaseRecipeCatalog.every(({ parameterKeys }) => parameterKeys.length >= 6));
  assert.equal(schema.$defs.recipe.allOf[0].oneOf.length, 18);
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
