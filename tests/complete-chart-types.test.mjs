import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import * as Graflume from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const { additionalChartTypeCatalog, capabilities, compile, fullCatalog } = Graflume;

const fixtures = new Map([
  [
    'radar',
    {
      data: [
        { indicator: 'Speed', series: 'A', value: 82 },
        { indicator: 'Quality', series: 'A', value: 74 },
        { indicator: 'Reach', series: 'A', value: 91 },
        { indicator: 'Speed', series: 'B', value: 66 },
        { indicator: 'Quality', series: 'B', value: 88 },
        { indicator: 'Reach', series: 'B', value: 69 },
      ],
      mark: { type: 'radar', fields: { series: 'series' } },
      x: { field: 'indicator', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  [
    'tree',
    {
      data: [
        { id: 'Root', parent: '', value: 10 },
        { id: 'Data', parent: 'Root', value: 7 },
        { id: 'Design', parent: 'Root', value: 5 },
        { id: 'Runtime', parent: 'Data', value: 4 },
      ],
      mark: { type: 'tree', fields: { parent: 'parent' } },
      x: { field: 'id', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  [
    'graph',
    {
      data: [
        { source: 'A', target: 'B', value: 8 },
        { source: 'B', target: 'C', value: 5 },
        { source: 'C', target: 'A', value: 3 },
        { source: 'A', target: 'D', value: 6 },
      ],
      mark: { type: 'graph', fields: { target: 'target' } },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  [
    'chord',
    {
      data: [
        { source: 'North', target: 'East', value: 12 },
        { source: 'East', target: 'South', value: 8 },
        { source: 'South', target: 'West', value: 6 },
        { source: 'West', target: 'North', value: 10 },
      ],
      mark: { type: 'chord', fields: { target: 'target' } },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  [
    'funnel',
    {
      data: [
        { stage: 'Visits', value: 100 },
        { stage: 'Trials', value: 68 },
        { stage: 'Paid', value: 31 },
        { stage: 'Renewed', value: 21 },
      ],
      mark: { type: 'funnel' },
      x: { field: 'stage', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  [
    'parallel',
    {
      data: [
        { product: 'A', speed: 82, quality: 71, cost: 43 },
        { product: 'B', speed: 64, quality: 91, cost: 58 },
        { product: 'C', speed: 73, quality: 79, cost: 36 },
      ],
      mark: { type: 'parallel', options: { dimensions: ['speed', 'quality', 'cost'] } },
      x: { field: 'product', type: 'nominal' },
      y: { field: 'speed', type: 'quantitative' },
    },
  ],
  [
    'boxplot',
    {
      data: [
        { group: 'A', min: 8, q1: 12, median: 18, q3: 23, max: 31 },
        { group: 'B', min: 11, q1: 17, median: 21, q3: 27, max: 35 },
      ],
      mark: {
        type: 'boxplot',
        fields: { min: 'min', q1: 'q1', median: 'median', q3: 'q3', max: 'max' },
      },
      x: { field: 'group', type: 'nominal' },
      y: { field: 'median', type: 'quantitative' },
    },
  ],
  [
    'effect-scatter',
    {
      data: [
        { x: 1, y: 4, size: 12 },
        { x: 2, y: 8, size: 28 },
        { x: 3, y: 6, size: 19 },
      ],
      mark: { type: 'effect-scatter', fields: { size: 'size' } },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
  ],
  [
    'lines',
    {
      data: [
        { x: 1, y: 2, x2: 4, y2: 8 },
        { x: 2, y: 7, x2: 5, y2: 3 },
      ],
      mark: { type: 'lines', fields: { x2: 'x2', y2: 'y2' } },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
  ],
  [
    'heatmap',
    {
      data: [
        { day: 'Mon', hour: 'AM', value: 12 },
        { day: 'Mon', hour: 'PM', value: 32 },
        { day: 'Tue', hour: 'AM', value: 20 },
        { day: 'Tue', hour: 'PM', value: 48 },
      ],
      mark: { type: 'heatmap', fields: { value: 'value' } },
      x: { field: 'day', type: 'ordinal' },
      y: { field: 'hour', type: 'ordinal' },
    },
  ],
  [
    'pictorial-bar',
    {
      data: [
        { category: 'A', value: 24 },
        { category: 'B', value: 41 },
        { category: 'C', value: 33 },
      ],
      mark: { type: 'pictorial-bar', options: { symbol: 'diamond', symbolSize: 12 } },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  [
    'theme-river',
    {
      data: [
        { date: '2026-01-01', category: 'Search', value: 18 },
        { date: '2026-01-01', category: 'Direct', value: 11 },
        { date: '2026-02-01', category: 'Search', value: 25 },
        { date: '2026-02-01', category: 'Direct', value: 16 },
        { date: '2026-03-01', category: 'Search', value: 19 },
        { date: '2026-03-01', category: 'Direct', value: 23 },
      ],
      mark: { type: 'theme-river', fields: { category: 'category' } },
      x: { field: 'date', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  [
    'sunburst',
    {
      data: [
        { id: 'All', parent: '', value: 100 },
        { id: 'Data', parent: 'All', value: 58 },
        { id: 'Design', parent: 'All', value: 42 },
        { id: 'Tables', parent: 'Data', value: 25 },
        { id: 'Charts', parent: 'Data', value: 33 },
      ],
      mark: { type: 'sunburst', fields: { parent: 'parent' } },
      x: { field: 'id', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ],
  [
    'custom',
    {
      data: [
        { x: 1, y: 5, shape: 'circle', size: 13, label: 'A' },
        { x: 2, y: 8, shape: 'diamond', size: 18, label: 'B' },
        { x: 3, y: 4, shape: 'round-rect', size: 16, label: 'C' },
      ],
      mark: {
        type: 'custom',
        fields: { shape: 'shape', size: 'size', label: 'label' },
      },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
  ],
]);

test('the opt-in catalog fuses the established and additional chart families', () => {
  assert.equal(additionalChartTypeCatalog.length, 14);
  assert.equal(fullCatalog.length, 45);
  assert.deepEqual(
    additionalChartTypeCatalog.map((entry) => entry.id),
    [...fixtures.keys()],
  );
  const marks = capabilities().marks;
  for (const entry of additionalChartTypeCatalog) {
    assert.ok(
      marks.includes(entry.mark),
      `${entry.mark} is registered by the complete entry point`,
    );
  }
});

test('the JSON Schema advertises the full built-in catalog without closing plugin marks', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  const catalog = schema['x-graflume-catalog'];
  assert.equal(catalog.defaultFamilyCount, 31);
  assert.equal(catalog.fullFamilyCount, 45);
  assert.deepEqual(
    catalog.additionalMarks,
    additionalChartTypeCatalog.map((entry) => entry.mark),
  );
  for (const mark of capabilities().marks) {
    assert.ok(catalog.builtInMarks.includes(mark), `${mark} is represented in schema metadata`);
  }
  assert.equal(schema.$defs.markObject.properties.type.type, 'string');
});

test('every additional catalog entry exposes its Quick API', () => {
  for (const entry of additionalChartTypeCatalog) {
    assert.equal(typeof Graflume[entry.quickApi], 'function', `${entry.quickApi} is exported`);
  }
});

for (const entry of additionalChartTypeCatalog) {
  test(`${entry.name} compiles to an interactive renderer-neutral scene`, () => {
    const spec = fixtures.get(entry.id);
    assert.ok(spec, `fixture exists for ${entry.id}`);
    const { scene } = compile(spec, { width: 720, height: 440 });
    const nodes = flattenScene(scene.root);
    assert.ok(nodes.length > 3, `${entry.id} produced scene nodes`);
    assert.ok(nodes.some((node) => node.type !== 'group' && !node.id.startsWith('axis-')));
    assert.ok(
      nodes.some((node) => node.interactive === true && node.datum !== undefined),
      `${entry.id} carries datum references`,
    );
  });
}

test('the complete entry point can create an isolated registry with every additional mark', () => {
  const registry = Graflume.createCompleteRegistry();
  for (const entry of additionalChartTypeCatalog) {
    assert.ok(
      registry.markNames().includes(entry.mark),
      `${entry.mark} is available in the registry`,
    );
  }
});

test('declarative custom rows select safe primitive shapes without callbacks', () => {
  const spec = fixtures.get('custom');
  assert.ok(spec);
  const { scene } = compile(spec, { width: 720, height: 440 });
  const nodes = flattenScene(scene.root);
  assert.ok(nodes.some((node) => node.type === 'circle'));
  assert.ok(nodes.some((node) => node.type === 'path' && node.id.includes('custom-diamond')));
  assert.ok(nodes.some((node) => node.type === 'rect'));
});

test('boxplot, connection lines, and theme river expand numeric domains beyond the primary field', () => {
  for (const id of ['boxplot', 'lines', 'theme-river']) {
    const spec = fixtures.get(id);
    assert.ok(spec);
    const { scene } = compile(spec, { width: 720, height: 440 });
    assert.ok(scene.metadata.renderedNodeCount > 4, `${id} compiles with its extended domain`);
  }
});
