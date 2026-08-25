import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compile,
  compositionOperators,
  maximumCompositionDepth,
  maximumCompositionLayers,
  maximumCompositionViews,
  maximumLayerCompositionChildren,
} from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const unit = (data, mark = 'bar') => ({ data, mark, x: 'x', y: 'y' });

test('public composition registry exposes the closed operator and limit contract', () => {
  assert.deepEqual(compositionOperators, [
    'layer',
    'facet',
    'repeat',
    'hconcat',
    'vconcat',
    'concat',
    'inset',
  ]);
  assert.equal(maximumCompositionDepth, 4);
  assert.equal(maximumCompositionViews, 64);
  assert.equal(maximumCompositionLayers, 128);
  assert.equal(maximumLayerCompositionChildren, 16);
});

test('new layer composition uses the flat shared compiler while legacy layers stay unchanged', () => {
  const data = [
    { x: 'A', y: 2 },
    { x: 'B', y: 4 },
  ];
  const legacy = compile({
    layers: [
      { id: 'layer-0', data, mark: 'bar', x: 'x', y: 'y' },
      { id: 'layer-1', data, mark: 'line', x: 'x', y: 'y' },
    ],
    width: 480,
    height: 300,
  });
  const composed = compile({
    layer: [unit(data), unit(data, 'line')],
    width: 480,
    height: 300,
  });

  assert.equal(legacy.scene.metadata.composition, undefined);
  assert.deepEqual(composed.spec.layers, legacy.spec.layers);
  assert.deepEqual(composed.scene.root, legacy.scene.root);
  assert.deepEqual(composed.scene.metadata.composition, {
    kind: 'layer',
    viewCount: 1,
    viewIds: ['plot'],
    resolve: { scale: 'shared', axis: 'shared', legend: 'shared', colorbar: 'shared' },
  });
});

test('concat layout scopes renderer, hit-target, semantic, and accessibility identities', () => {
  const result = compile(
    {
      hconcat: [unit([{ x: 'A', y: 1 }]), unit([{ x: 'B', y: 2 }])],
      interaction: { tooltip: true, selection: true },
      accessibility: { label: 'Two panels', maxRows: 10 },
      width: 800,
      height: 320,
      spacing: 20,
    },
    { width: 100, height: 100 },
  );

  assert.deepEqual(result.scene.metadata.composition, {
    kind: 'hconcat',
    viewCount: 2,
    viewIds: ['hconcat-0', 'hconcat-1'],
    resolve: {
      scale: 'independent',
      axis: 'independent',
      legend: 'independent',
      colorbar: 'independent',
    },
  });
  assert.equal(result.scene.accessibility.label, 'Two panels');
  assert.deepEqual(
    result.spec.layers.map(({ id }) => id),
    ['hconcat-0/layer-0', 'hconcat-1/layer-0'],
  );
  assert.deepEqual(
    result.scene.semanticIndex.map(({ viewId, layerId }) => [viewId, layerId]),
    [
      ['hconcat-0', 'hconcat-0/layer-0'],
      ['hconcat-1', 'hconcat-1/layer-0'],
    ],
  );
  const viewGroups = result.scene.root.children.filter(({ id }) =>
    id.startsWith('composition:view:'),
  );
  assert.equal(viewGroups.length, 2);
  assert.ok(viewGroups[0].clip.x + viewGroups[0].clip.width < viewGroups[1].clip.x);
  const datumLayers = flattenScene(result.scene.root)
    .filter(({ datum }) => datum !== undefined)
    .map(({ datum }) => datum.layerId);
  assert.ok(datumLayers.includes('hconcat-0/layer-0'));
  assert.ok(datumLayers.includes('hconcat-1/layer-0'));
  assert.deepEqual(result.coordinates.axes, {});
});

test('composition accessibility budget reaches children unless a child sets a stricter budget', () => {
  const rows = Array.from({ length: 550 }, (_, index) => ({ x: `item-${index}`, y: index }));
  const result = compile({
    hconcat: [unit(rows)],
    accessibility: { maxRows: 550 },
    width: 800,
    height: 320,
  });

  assert.equal(result.scene.semanticIndex.length, 550);
});

test('shared concat scales use a deterministic union domain in every child', () => {
  const result = compile({
    hconcat: [
      unit(
        [
          { x: 0, y: 1 },
          { x: 10, y: 2 },
        ],
        'line',
      ),
      unit(
        [
          { x: 100, y: -3 },
          { x: 200, y: 4 },
        ],
        'line',
      ),
    ],
    resolve: { scale: 'shared' },
    width: 800,
    height: 320,
  });

  assert.ok(result.spec.layers.every(({ x }) => x.scale.domain.join(',') === '0,200'));
  assert.ok(result.spec.layers.every(({ y }) => y.scale.domain.join(',') === '-3,4'));
  assert.equal(result.scene.metadata.composition.resolve.axis, 'independent');
  assert.equal(result.scene.metadata.composition.resolve.legend, 'independent');
});

test('facet materializes observed cells only and remaps semantic lineage to source rows', () => {
  const result = compile({
    data: [
      { row: 'A', column: 'X', x: 'one', y: 1 },
      { row: 'A', column: 'Y', x: 'two', y: 2 },
      { row: 'B', column: 'Y', x: 'three', y: 3 },
    ],
    facet: {
      row: { field: 'row', title: 'Row', sort: 'ascending' },
      column: { field: 'column', title: 'Column', sort: 'ascending' },
    },
    spec: { mark: 'bar', x: 'x', y: 'y' },
    width: 760,
    height: 520,
  });

  assert.equal(result.scene.metadata.composition.viewCount, 3);
  assert.deepEqual(result.scene.metadata.composition.viewIds, [
    'facet-0-0',
    'facet-0-1',
    'facet-1-1',
  ]);
  assert.deepEqual(
    result.scene.semanticIndex.map(({ viewId, lineage }) => [viewId, lineage.sourceRowIndices]),
    [
      ['facet-0-0', [0]],
      ['facet-0-1', [1]],
      ['facet-1-1', [2]],
    ],
  );
  assert.match(result.scene.semanticIndex[0].label, /Row = A/);
  assert.match(result.scene.semanticIndex[0].label, /Column = X/);
});

test('repeat performs explicit serializable x/y field substitution', () => {
  const authored = {
    data: [
      { category: 'A', revenue: 10, cost: 4 },
      { category: 'B', revenue: 14, cost: 7 },
    ],
    repeat: {
      items: [
        { id: 'revenue', label: 'Revenue', y: 'revenue' },
        { id: 'cost', label: 'Cost', y: 'cost' },
      ],
      columns: 2,
    },
    spec: { mark: 'bar', x: 'category', y: 'revenue' },
    width: 760,
    height: 320,
  };
  const roundTripped = JSON.parse(JSON.stringify(authored));
  assert.deepEqual(validateSpec(roundTripped), []);
  const result = compile(roundTripped);

  assert.deepEqual(
    result.spec.layers.map(({ id, x, y }) => [id, x.field, y.field]),
    [
      ['repeat-0-revenue/layer-0', 'category', 'revenue'],
      ['repeat-1-cost/layer-0', 'category', 'cost'],
    ],
  );
  assert.deepEqual(result.scene.metadata.composition.viewIds, [
    'repeat-0-revenue',
    'repeat-1-cost',
  ]);
});

test('inset creates deterministic plot-relative base and overlay bounds', () => {
  const result = compile({
    inset: {
      base: unit(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        'line',
      ),
      view: unit([{ x: 'detail', y: 5 }]),
      x: 0.6,
      y: 0.08,
      width: 0.35,
      height: 0.4,
      label: 'Detail',
    },
    width: 800,
    height: 480,
  });
  const groups = result.scene.root.children.filter(({ id }) => id.startsWith('composition:view:'));
  assert.deepEqual(result.scene.metadata.composition.viewIds, ['inset-base', 'inset-view']);
  assert.equal(groups.length, 2);
  assert.ok(groups[1].clip.width < groups[0].clip.width);
  assert.ok(groups[1].clip.height < groups[0].clip.height);
  assert.ok(groups[1].clip.x > groups[0].clip.x);
  assert.ok(groups[1].zIndex > groups[0].zIndex);
});

test('nested composition is bounded, deterministic, and keeps scoped semantic view identity', () => {
  const result = compile({
    vconcat: [
      { hconcat: [unit([{ x: 'A', y: 1 }]), unit([{ x: 'B', y: 2 }])] },
      unit([{ x: 'C', y: 3 }]),
    ],
    width: 800,
    height: 640,
  });
  assert.deepEqual(
    result.scene.semanticIndex.map(({ viewId }) => viewId),
    ['vconcat-0/hconcat-0', 'vconcat-0/hconcat-1', 'vconcat-1'],
  );
  assert.ok(
    result.scene.semanticIndex.every(
      ({ id, layerId, viewId }) => id.startsWith(`${viewId}/`) && layerId.startsWith(`${viewId}/`),
    ),
  );
});

test('unsupported composition mixes and child-owned interaction semantics fail closed', () => {
  const base = unit([{ x: 'A', y: 1 }]);
  const cases = [
    [{ hconcat: [base], vconcat: [base] }, 'exactly one composition operator'],
    [
      { layer: [base], resolve: { scale: 'independent' } },
      'requires shared scale, axis, legend, and colorbar',
    ],
    [
      { hconcat: [base], resolve: { axis: 'shared' } },
      'shared axis requires a shared position scale',
    ],
    [{ hconcat: [{ ...base, width: 200 }] }, 'child width/height are unsupported'],
    [{ hconcat: [{ ...base, legend: { interactive: true } }] }, 'legends are visual-only'],
    [
      { hconcat: [base], interaction: { tooltip: { trigger: 'axis' } } },
      'Axis-nearest tooltip is not supported',
    ],
    [
      { hconcat: [{ ...base, interaction: { selection: { kind: 'rectangle' } } }] },
      'Declare interaction once on the composition container',
    ],
    [{ hconcat: [base], streaming: { mode: 'append' } }, 'Streaming composition is not supported'],
    [
      { hconcat: [{ ...base, streaming: { mode: 'append' } }] },
      'Streaming composition children are unsupported',
    ],
    [{ hconcat: [base], unexpected: true }, 'Unknown composition property'],
  ];
  for (const [spec, message] of cases) {
    const issues = validateSpec(spec);
    assert.ok(
      issues.some((issue) => issue.message.includes(message)),
      `${message}: ${JSON.stringify(issues)}`,
    );
  }
  assert.throws(
    () => compile({ layer: [base], resolve: { scale: 'independent' } }),
    /requires shared scale, axis, legend, and colorbar/,
  );

  const functionIssues = validateSpec({
    hconcat: [base],
    resolve: { scale: () => 'shared' },
  });
  assert.ok(functionIssues.some(({ message }) => message.includes('Functions are not allowed')));
});

test('composition container owns analytic selection and data-domain navigation for every leaf', () => {
  const numeric = (offset = 0) => ({
    data: [
      { x: 0, y: offset },
      { x: 10, y: offset + 10 },
    ],
    mark: 'point',
    encoding: {
      x: { field: 'x', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
      y: { field: 'y', type: 'quantitative', scale: { domain: [0, 20], nice: false } },
    },
  });
  const spec = {
    hconcat: [numeric(), numeric(5)],
    interaction: {
      domainNavigation: { axes: ['x', 'y'], drag: false },
      selection: { kind: 'rectangle', filter: true, linked: true },
    },
    width: 800,
    height: 320,
  };
  assert.deepEqual(validateSpec(spec), []);
  const result = compile(spec);
  assert.deepEqual(
    result.coordinateViews.map(({ id }) => id),
    ['hconcat-0', 'hconcat-1'],
  );
  assert.ok(result.coordinateViews.every(({ coordinates }) => coordinates.axes.x !== undefined));
  assert.deepEqual(result.coordinates.axes, {});
});

test('view, layer, and minimum cell limits raise explicit errors', () => {
  const base = unit([{ x: 'A', y: 1 }]);
  assert.ok(
    validateSpec({
      repeat: {
        items: Array.from({ length: 65 }, (_, index) => ({ id: `r${index}`, y: 'y' })),
      },
      data: base.data,
      spec: { mark: 'bar', x: 'x', y: 'y' },
    }).some(({ message }) => message.includes('Repeat item count exceeds 64')),
  );
  assert.ok(
    validateSpec({ layer: Array.from({ length: 17 }, () => base) }).some(({ message }) =>
      message.includes('limit 16'),
    ),
  );
  assert.throws(
    () => compile({ hconcat: Array.from({ length: 8 }, () => base), width: 640, height: 300 }),
    /at least 80x80px/,
  );
  assert.throws(
    () =>
      compile({
        data: Array.from({ length: 65 }, (_, index) => ({ group: `g${index}`, x: 'A', y: 1 })),
        facet: { wrap: 'group' },
        spec: { mark: 'bar', x: 'x', y: 'y' },
      }),
    /Facet view count exceeds 64/,
  );
});

test('shared scale rejects incompatible child scale contracts instead of downgrading', () => {
  assert.throws(
    () =>
      compile({
        hconcat: [
          {
            data: [{ x: 1, y: 1 }],
            mark: 'line',
            x: { field: 'x', scale: { type: 'linear' } },
            y: 'y',
          },
          {
            data: [{ x: 1, y: 2 }],
            mark: 'line',
            x: { field: 'x', scale: { type: 'log' } },
            y: 'y',
          },
        ],
        resolve: { scale: 'shared' },
        width: 800,
        height: 320,
      }),
    /same mathematical parameters, scale type, reverse direction/,
  );
  assert.throws(
    () =>
      compile({
        hconcat: [
          {
            data: [
              { x: 0, y: 1 },
              { x: 10, y: 2 },
            ],
            mark: 'line',
            x: { field: 'x', scale: { type: 'pow', exponent: 1 } },
            y: 'y',
          },
          {
            data: [
              { x: 0, y: 1 },
              { x: 10, y: 2 },
            ],
            mark: 'line',
            x: { field: 'x', scale: { type: 'pow', exponent: 2 } },
            y: 'y',
          },
        ],
        resolve: { scale: 'shared' },
        width: 800,
        height: 320,
      }),
    /same mathematical parameters, scale type, reverse direction/,
  );
});

test('facet and repeat field names reject prototype keys in object and shorthand forms', () => {
  const base = { data: [{ x: 'A', y: 1 }], spec: { mark: 'bar', x: 'x', y: 'y' } };
  assert.ok(
    validateSpec({ ...base, facet: { wrap: { field: '__proto__' } } }).some(({ path }) =>
      path.endsWith('.field'),
    ),
  );
  assert.ok(
    validateSpec({ ...base, repeat: { items: [{ id: 'unsafe', y: '__proto__' }] } }).some(
      ({ path }) => path.endsWith('.y'),
    ),
  );
});

test('portable schema exposes closed recursive composition contracts and bounds', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.ok(schema.anyOf.some(({ required }) => required?.includes('hconcat')));
  assert.equal(schema.$defs.compositionChoice.oneOf.length, 7);
  assert.equal(schema.properties.layer.maxItems, 16);
  assert.equal(schema.properties.hconcat.maxItems, 64);
  assert.equal(schema.properties.spacing.maximum, 64);
  assert.equal(schema.properties.resolve.$ref, '#/$defs/compositionResolve');
  for (const definition of [
    'compositionResolve',
    'facetComposition',
    'repeatComposition',
    'repeatItem',
    'insetComposition',
    'layerCompositionChild',
    'chartNode',
  ]) {
    assert.equal(schema.$defs[definition].additionalProperties, false, definition);
  }
  assert.equal(schema.$defs.insetComposition.properties.base.$ref, '#/$defs/chartNode');
  assert.equal(schema.$defs.chartNode.properties.width, undefined);
  assert.equal(schema.$defs.chartNode.properties.interaction, undefined);
  assert.equal(schema.$defs.chartNode.properties.streaming, undefined);
  assert.equal(schema.$defs.facetField.oneOf[0].$ref, '#/$defs/fieldName');
  assert.equal(schema.$defs.facetField.oneOf[1].properties.field.$ref, '#/$defs/fieldName');
  assert.equal(schema.$defs.repeatItem.properties.x.$ref, '#/$defs/fieldName');
  assert.equal(schema.$defs.repeatItem.properties.y.$ref, '#/$defs/fieldName');
});
