import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as Graflume from '../.tmp/src/complete.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { sceneLegendLayout } from '../.tmp/src/compiler/legend.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const allSceneNodes = (node) =>
  node.type === 'group' ? [node, ...node.children.flatMap(allSceneNodes)] : [node];

const filterPositive = {
  type: 'filter',
  expr: {
    op: 'greaterThan',
    left: { op: 'field', field: 'value' },
    right: { op: 'literal', value: 0 },
  },
};

const namedDataflow = {
  sources: {
    raw: [
      { category: 'A', order: 1, value: 2 },
      { category: 'B', order: 2, value: -1 },
      { category: 'A', order: 3, value: 6 },
    ],
  },
  nodes: [
    { id: 'positive', source: 'raw', transform: [filterPositive] },
    {
      id: 'totals',
      source: 'positive',
      transform: [
        {
          type: 'aggregate',
          groupby: ['category'],
          fields: [{ op: 'sum', field: 'value', as: 'total' }],
        },
      ],
    },
    {
      id: 'scaled',
      source: 'positive',
      transform: [
        {
          type: 'calculate',
          as: 'scaledValue',
          expr: {
            op: 'multiply',
            left: { op: 'field', field: 'value' },
            right: { op: 'literal', value: 10 },
          },
        },
      ],
    },
  ],
};

test('named transform sources and branches reuse one memoized DAG ancestor', () => {
  const graph = Graflume.createTransformDataflow(namedDataflow);
  const execution = graph.execute(['totals', 'scaled']);

  assert.deepEqual(execution.outputs.totals.data, [{ category: 'A', total: 8 }]);
  assert.deepEqual(
    execution.outputs.scaled.data.map(({ scaledValue }) => scaledValue),
    [20, 60],
  );
  assert.deepEqual(execution.state.executionOrder, ['raw', 'positive', 'totals', 'scaled']);
  assert.equal(execution.state.cacheHits, 1);
  assert.deepEqual(execution.outputs.totals.lineage.rowSources, [[0, 2]]);
  assert.deepEqual(execution.outputs.scaled.lineage.rowSources, [[0], [2]]);
});

test('named dataflow compiles through reusable composition branches with source provenance', () => {
  const authored = {
    dataflow: namedDataflow,
    hconcat: [
      { source: 'totals', mark: 'bar', x: 'category', y: 'total' },
      { source: 'scaled', mark: 'line', x: 'order', y: 'scaledValue' },
    ],
    width: 760,
    height: 320,
  };
  const portable = JSON.parse(JSON.stringify(authored));
  assert.deepEqual(validateSpec(portable), []);

  const result = Graflume.compile(portable);
  assert.equal(result.scene.metadata.rowCount, 3);
  assert.deepEqual(
    Object.values(result.dataLineage).map(({ sourceId, sourceRows, rowSources, transforms }) => ({
      sourceId,
      sourceRows,
      rowSources,
      transforms: transforms.map(({ type }) => type),
    })),
    [
      {
        sourceId: 'hconcat-0/source:raw',
        sourceRows: 3,
        rowSources: [[0, 2]],
        transforms: ['filter', 'aggregate'],
      },
      {
        sourceId: 'hconcat-1/source:raw',
        sourceRows: 3,
        rowSources: [[0], [2]],
        transforms: ['filter', 'calculate'],
      },
    ],
  );
});

test('facets retain named-source row identity and parent transform provenance', () => {
  const result = Graflume.compile({
    dataflow: namedDataflow,
    source: 'positive',
    facet: { wrap: 'category' },
    spec: { mark: 'point', x: 'order', y: 'value' },
    width: 560,
    height: 280,
  });

  assert.deepEqual(
    result.scene.semanticIndex.map(({ lineage }) => lineage.sourceRowIndices),
    [[0], [2]],
  );
  const lineage = Object.values(result.dataLineage)[0];
  assert.equal(lineage.sourceRows, 3);
  assert.deepEqual(
    lineage.transforms.map(({ type }) => type),
    ['filter'],
  );
  assert.match(lineage.sourceId, /source:raw$/);
});

test('named dataflow fails closed for invalid graphs and orphan references', () => {
  assert.throws(
    () =>
      Graflume.createTransformDataflow({
        sources: { raw: [] },
        nodes: [
          { id: 'a', source: 'b', transform: [] },
          { id: 'b', source: 'a', transform: [] },
        ],
      }),
    /contains a cycle/,
  );
  assert.throws(
    () =>
      Graflume.createTransformDataflow({
        sources: { raw: [] },
        nodes: [{ id: 'branch', source: 'missing', transform: [] }],
      }),
    /Unknown dataflow source or node/,
  );
  assert.throws(
    () =>
      Graflume.createTransformDataflow({
        sources: { raw: [] },
        nodes: [{ id: 'raw', source: 'raw', transform: [] }],
      }),
    /Duplicate dataflow name/,
  );
  assert.ok(
    validateSpec({ source: 'orphan', mark: 'point', x: 'x', y: 'y' }).some(({ message }) =>
      message.includes('require an enclosing dataflow'),
    ),
  );
  assert.ok(
    validateSpec({
      dataflow: { sources: { raw: [] } },
      source: 'raw',
      data: [],
      mark: 'point',
      x: 'x',
      y: 'y',
    }).some(({ message }) => message.includes('either inline data or a named source')),
  );
});

test('specialized geographic, trading, and angular channels normalize into mark positions', () => {
  const map = Graflume.compile({
    data: [{ lon: 126.98, lat: 37.57, magnitude: 4 }],
    mark: { type: 'map', fields: { size: 'magnitude' } },
    encoding: {
      longitude: { field: 'lon', type: 'quantitative' },
      latitude: { field: 'lat', type: 'quantitative' },
    },
  });
  assert.equal(map.spec.layers[0].x.field, 'lon');
  assert.equal(map.spec.layers[0].y.field, 'lat');
  assert.ok(flattenScene(map.scene.root).some(({ id }) => id.includes(':map-point:')));

  const financial = Graflume.compile({
    data: [{ day: 'Mon', open: 12, high: 18, low: 10, close: 16, volume: 100 }],
    mark: { type: 'financial', options: { kind: 'candlestick' } },
    encoding: {
      x: { field: 'day', type: 'ordinal' },
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
      volume: 'volume',
    },
  });
  assert.equal(financial.spec.layers[0].y.field, 'close');
  assert.deepEqual(
    Object.fromEntries(
      ['open', 'high', 'low', 'close', 'volume'].map((field) => [
        field,
        financial.spec.layers[0].mark.fields[field],
      ]),
    ),
    { open: 'open', high: 'high', low: 'low', close: 'close', volume: 'volume' },
  );
  assert.ok(flattenScene(financial.scene.root).some(({ id }) => id.includes(':financial-')));

  const polar = Graflume.compile({
    data: [
      { direction: 0, radius: 3 },
      { direction: 180, radius: 7 },
    ],
    mark: 'polar',
    encoding: {
      theta: { field: 'direction', type: 'quantitative' },
      radius: { field: 'radius', type: 'quantitative' },
    },
  });
  assert.equal(polar.spec.layers[0].x.field, 'direction');
  assert.equal(polar.spec.layers[0].y.field, 'radius');
  assert.ok(flattenScene(polar.scene.root).some(({ id }) => id.includes(':polar-point:')));
});

test('point symbol and icon channels choose renderer-neutral glyph nodes', () => {
  const icon = Graflume.compile({
    data: [{ x: 1, y: 2, glyph: '★' }],
    mark: 'point',
    encoding: { x: 'x', y: 'y', icon: 'glyph' },
  });
  const iconNode = flattenScene(icon.scene.root).find(({ id }) => id === 'layer-0:point:0');
  assert.equal(iconNode.type, 'text');
  assert.equal(iconNode.text, '★');

  const symbol = Graflume.compile({
    data: [{ x: 1, y: 2 }],
    mark: 'point',
    encoding: { x: 'x', y: 'y', symbol: { value: 'diamond' } },
  });
  assert.equal(
    flattenScene(symbol.scene.root).find(({ id }) => id === 'layer-0:point:0').type,
    'path',
  );

  assert.ok(
    validateSpec({
      data: [{ x: 1, y: 2 }],
      mark: 'bar',
      encoding: { x: 'x', y: 'y', icon: { value: '★' } },
    }).some(({ message }) => message.includes('not implemented for mark')),
  );
  assert.ok(
    validateSpec({
      data: [{ x: 1, y: 2 }],
      mark: 'point',
      encoding: { x: 'x', y: 'y', symbol: { value: 'not-a-symbol' } },
    }).some(({ message }) => message.includes('must be circle')),
  );
});

test('shared axes keep only outer labels while sharing every active axis domain', () => {
  const child = (offset) => ({
    data: [
      { x: offset, y: offset + 1 },
      { x: offset + 5, y: offset + 3 },
    ],
    mark: 'line',
    x: { field: 'x', axisId: 'x2' },
    y: 'y',
  });
  const independent = Graflume.compile({
    vconcat: [child(0), child(100)],
    width: 560,
    height: 520,
  });
  const shared = Graflume.compile({
    vconcat: [child(0), child(100)],
    resolve: { scale: 'shared', axis: 'shared' },
    width: 560,
    height: 520,
  });
  assert.ok(shared.spec.layers.every(({ x }) => x.scale.domain.join(',') === '0,105'));
  assert.equal(shared.scene.metadata.composition.resolve.axis, 'shared');
  const axisTextCount = (result, axis) =>
    flattenScene(result.scene.root).filter(
      ({ id, type }) => type === 'text' && id.includes(`/axis-${axis}:`),
    ).length;
  assert.ok(axisTextCount(shared, 'x2') < axisTextCount(independent, 'x2'));

  const numericCategories = Graflume.compile({
    hconcat: [
      {
        data: [
          { category: 1, value: 1 },
          { category: 3, value: 2 },
        ],
        mark: 'bar',
        x: { field: 'category', type: 'nominal', scale: { type: 'band' } },
        y: 'value',
      },
      {
        data: [
          { category: 2, value: 3 },
          { category: 4, value: 4 },
        ],
        mark: 'bar',
        x: { field: 'category', type: 'nominal', scale: { type: 'band' } },
        y: 'value',
      },
    ],
    resolve: { scale: 'shared' },
    width: 600,
    height: 300,
  });
  assert.ok(numericCategories.spec.layers.every(({ x }) => x.scale.domain.join(',') === '1,3,2,4'));
});

test('shared category legends unify domains, ids, and interactive filtering across views', () => {
  const spec = {
    hconcat: [
      {
        data: [{ x: 1, y: 2, group: 'A' }],
        mark: 'point',
        encoding: { x: 'x', y: 'y', color: { field: 'group', type: 'nominal' } },
      },
      {
        data: [{ x: 2, y: 3, group: 'B' }],
        mark: 'point',
        encoding: { x: 'x', y: 'y', color: { field: 'group', type: 'nominal' } },
      },
    ],
    legend: { mode: 'categories', field: 'group', interactive: true },
    resolve: { legend: 'shared' },
    width: 720,
    height: 300,
  };
  const registry = Graflume.createCompleteRegistry();
  const visible = compileWithRegistry(spec, registry);
  const layout = sceneLegendLayout(visible.scene);
  assert.deepEqual(
    layout.entries.map(({ value }) => value),
    ['A', 'B'],
  );
  assert.equal(new Set(layout.entries.map(({ id }) => id)).size, 2);
  assert.ok(layout.entries.every(({ toggleable }) => toggleable));
  assert.equal(
    flattenScene(visible.scene.root).filter(({ id }) => id.endsWith('/legend:surface')).length,
    0,
  );
  assert.equal(
    flattenScene(visible.scene.root).filter(({ id }) => id === 'legend:surface').length,
    1,
  );
  assert.ok(
    visible.spec.layers.every(({ encoding }) => encoding.color.scale.domain.join(',') === 'A,B'),
  );

  const hiddenA = layout.entries.find(({ value }) => value === 'A').id;
  const hidden = compileWithRegistry(
    spec,
    registry,
    {},
    { hiddenLegendItemIds: new Set([hiddenA]) },
  );
  const datumNodes = allSceneNodes(hidden.scene.root).filter(
    ({ datum }) => datum?.datum?.group !== undefined,
  );
  assert.ok(datumNodes.some(({ datum, visible: shown }) => datum.datum.group === 'A' && !shown));
  assert.ok(datumNodes.some(({ datum, visible: shown }) => datum.datum.group === 'B' && shown));
});

test('shared continuous colorbars unify the visual domain and render one root guide', () => {
  const result = Graflume.compile({
    hconcat: [
      {
        data: [{ x: 1, y: 2, value: 1 }],
        mark: 'point',
        encoding: { x: 'x', y: 'y', color: { field: 'value', type: 'quantitative' } },
      },
      {
        data: [{ x: 2, y: 3, value: 10 }],
        mark: 'point',
        encoding: { x: 'x', y: 'y', color: { field: 'value', type: 'quantitative' } },
      },
    ],
    legend: { mode: 'continuous', field: 'value' },
    resolve: { colorbar: 'shared' },
    width: 720,
    height: 300,
  });

  assert.equal(result.scene.metadata.composition.resolve.colorbar, 'shared');
  assert.ok(
    result.spec.layers.every(({ encoding }) => encoding.color.scale.domain.join(',') === '1,10'),
  );
  assert.deepEqual(
    sceneLegendLayout(result.scene).entries.map(({ value }) => value),
    [1, 10],
  );
  assert.equal(
    flattenScene(result.scene.root).filter(({ id }) => id === 'legend:surface').length,
    1,
  );
});

test('portable schema exposes named dataflow and specialized channel contracts', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(schema.properties.dataflow.$ref, '#/$defs/dataflow');
  assert.equal(schema.properties.source.$ref, '#/$defs/fieldName');
  assert.equal(schema.$defs.dataflow.additionalProperties, false);
  assert.equal(schema.$defs.dataflowNode.additionalProperties, false);
  assert.equal(schema.$defs.dataflowNode.properties.transform.$ref, '#/$defs/transformList');
  assert.equal(schema.$defs.layer.properties.source.$ref, '#/$defs/fieldName');
  for (const channel of [
    'symbol',
    'icon',
    'angle',
    'theta',
    'longitude',
    'latitude',
    'open',
    'high',
    'low',
    'close',
    'volume',
  ]) {
    assert.equal(schema.$defs.encodingMap.properties[channel].$ref, '#/$defs/channelEncoding');
  }
  assert.deepEqual(schema.$defs.compositionResolve.properties.colorbar.enum, [
    'shared',
    'independent',
  ]);
});
