import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import * as Graflume from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const {
  additionalChartTypeCatalog,
  additionalChartVariantCatalog,
  capabilities,
  compile,
  fullCatalog,
  fullVariantCatalog,
} = Graflume;

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
  [
    'polar',
    {
      data: [
        { angle: 0, radius: 7 },
        { angle: 60, radius: 10 },
        { angle: 120, radius: 6 },
        { angle: 180, radius: 9 },
      ],
      mark: { type: 'polar', options: { mode: 'line' } },
      x: { field: 'angle', type: 'quantitative' },
      y: { field: 'radius', type: 'quantitative' },
    },
  ],
  [
    'image',
    {
      data: [
        { column: 'A', row: '1', red: 239, green: 68, blue: 68 },
        { column: 'B', row: '1', red: 59, green: 130, blue: 246 },
        { column: 'A', row: '2', red: 16, green: 185, blue: 129 },
        { column: 'B', row: '2', red: 245, green: 158, blue: 11 },
      ],
      mark: { type: 'image' },
      x: { field: 'column', type: 'ordinal' },
      y: { field: 'row', type: 'ordinal' },
    },
  ],
  [
    'ternary',
    {
      data: [
        { a: 60, b: 30, c: 10 },
        { a: 25, b: 55, c: 20 },
        { a: 15, b: 20, c: 65 },
      ],
      mark: { type: 'ternary', fields: { c: 'c' } },
      x: { field: 'a', type: 'quantitative' },
      y: { field: 'b', type: 'quantitative' },
    },
  ],
  [
    'smith',
    {
      data: [
        { resistance: 0.2, reactance: -1 },
        { resistance: 0.7, reactance: -0.2 },
        { resistance: 1.2, reactance: 0.5 },
        { resistance: 2.4, reactance: 1.4 },
      ],
      mark: { type: 'smith' },
      x: { field: 'resistance', type: 'quantitative' },
      y: { field: 'reactance', type: 'quantitative' },
    },
  ],
  [
    'scatter-matrix',
    {
      data: [
        { speed: 3, quality: 8, cost: 4 },
        { speed: 5, quality: 6, cost: 7 },
        { speed: 8, quality: 4, cost: 9 },
        { speed: 9, quality: 7, cost: 3 },
      ],
      mark: { type: 'scatter-matrix', options: { dimensions: ['speed', 'quality', 'cost'] } },
      x: { field: 'speed', type: 'quantitative' },
      y: { field: 'quality', type: 'quantitative' },
    },
  ],
  [
    'carpet',
    {
      data: [
        { a: '0', b: '0', physicalX: 0, physicalY: 0, value: 1 },
        { a: '1', b: '0', physicalX: 1.1, physicalY: 0.2, value: 3 },
        { a: '0', b: '1', physicalX: 0.2, physicalY: 1.2, value: 4 },
        { a: '1', b: '1', physicalX: 1.3, physicalY: 1.4, value: 7 },
      ],
      mark: {
        type: 'carpet',
        fields: { x: 'physicalX', y: 'physicalY', value: 'value' },
        options: { mode: 'scatter' },
      },
      x: { field: 'a', type: 'ordinal' },
      y: { field: 'b', type: 'ordinal' },
    },
  ],
]);

fixtures.set('network', fixtures.get('graph'));

test('the opt-in catalog exposes distinct families and retains every preset', () => {
  assert.equal(additionalChartTypeCatalog.length, 11);
  assert.equal(additionalChartVariantCatalog.length, 27);
  assert.equal(fullCatalog.length, 41);
  assert.equal(fullVariantCatalog.length, 168);
  assert.deepEqual(
    fullVariantCatalog
      .filter(({ introducedIn }) => introducedIn !== undefined)
      .map(({ id, familyId, introducedIn }) => ({ id, familyId, introducedIn })),
    [
      {
        id: 'ecdf',
        familyId: 'distribution',
        introducedIn: 'research-foundations-2026-08-25',
      },
      {
        id: 'ccdf',
        familyId: 'distribution',
        introducedIn: 'research-foundations-2026-08-25',
      },
      {
        id: 'kde',
        familyId: 'distribution',
        introducedIn: 'research-foundations-2026-08-25',
      },
      {
        id: 'kagi',
        familyId: 'price-blocks',
        introducedIn: 'current-limitations-2026-08-26',
      },
      {
        id: 'three-line-break',
        familyId: 'price-blocks',
        introducedIn: 'current-limitations-2026-08-26',
      },
      {
        id: 'range-bars',
        familyId: 'price-blocks',
        introducedIn: 'current-limitations-2026-08-26',
      },
    ],
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
  assert.equal(catalog.defaultFamilyCount, 22);
  assert.equal(catalog.fullFamilyCount, 41);
  assert.equal(catalog.fullVariantCount, 165);
  for (const entry of additionalChartTypeCatalog) {
    assert.ok(catalog.additionalMarks.includes(entry.mark), entry.mark);
  }
  for (const mark of capabilities().marks) {
    assert.ok(catalog.builtInMarks.includes(mark), `${mark} is represented in schema metadata`);
  }
  assert.equal(schema.$defs.markObject.properties.type.type, 'string');
});

test('every additional catalog entry exposes its Quick API', () => {
  for (const entry of additionalChartVariantCatalog) {
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

test('heatmap cells form a continuous matrix with a quiet one-pixel boundary', () => {
  const spec = fixtures.get('heatmap');
  assert.ok(spec);
  const { scene } = compile(spec, { width: 720, height: 440 });
  const cells = flattenScene(scene.root).filter(
    (node) => node.type === 'rect' && node.id.includes(':heatmap:'),
  );
  assert.equal(cells.length, 4);

  const cell = (rowIndex) => cells.find((node) => node.datum?.rowIndex === rowIndex);
  const mondayMorning = cell(0);
  const mondayEvening = cell(1);
  const tuesdayMorning = cell(2);
  assert.ok(mondayMorning && mondayEvening && tuesdayMorning);
  assert.equal(tuesdayMorning.x - (mondayMorning.x + mondayMorning.width), 1);
  assert.equal(mondayEvening.y - (mondayMorning.y + mondayMorning.height), 1);
  assert.ok(cells.every((node) => node.lineWidth === 1 && node.cornerRadius === 1));
});

test('boxplot, connection lines, and theme river expand numeric domains beyond the primary field', () => {
  for (const id of ['boxplot', 'lines', 'theme-river']) {
    const spec = fixtures.get(id);
    assert.ok(spec);
    const { scene } = compile(spec, { width: 720, height: 440 });
    assert.ok(scene.metadata.renderedNodeCount > 4, `${id} compiles with its extended domain`);
  }
});
