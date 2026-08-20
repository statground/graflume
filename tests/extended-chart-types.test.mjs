import test from 'node:test';
import assert from 'node:assert/strict';

import * as Graflume from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const { capabilities, compile, chartTypeCatalog } = Graflume;

const trend = [
  { date: '2026-01-01', category: 'Jan', value: 12, old: 9, low: 9, high: 15, annotation: 'A' },
  { date: '2026-02-01', category: 'Feb', value: 18, old: 14, low: 14, high: 21, annotation: null },
  { date: '2026-03-01', category: 'Mar', value: 15, old: 17, low: 11, high: 19, annotation: 'B' },
  { date: '2026-04-01', category: 'Apr', value: 24, old: 18, low: 20, high: 27, annotation: null },
];

const xy = [
  { x: 1, y: 3, size: 20, group: 'A', time: '2025' },
  { x: 2, y: 7, size: 70, group: 'B', time: '2025' },
  { x: 3, y: 5, size: 45, group: 'A', time: '2026' },
  { x: 4, y: 10, size: 100, group: 'B', time: '2026' },
];

const base = (
  mark,
  data = trend,
  x = { field: 'category', type: 'ordinal' },
  y = { field: 'value', type: 'quantitative' },
) => ({
  data,
  mark,
  x,
  y,
  title: typeof mark === 'string' ? mark : mark.type,
});

const specs = new Map([
  [
    'annotation',
    base({ type: 'annotation', fields: { annotation: 'annotation' }, point: true }, trend, {
      field: 'date',
      type: 'temporal',
    }),
  ],
  [
    'annotated-timeline',
    base({ type: 'annotation', fields: { annotation: 'annotation' } }, trend, {
      field: 'date',
      type: 'temporal',
    }),
  ],
  ['area', base('area')],
  [
    'bar',
    base(
      { type: 'bar', orientation: 'horizontal' },
      trend,
      { field: 'value', type: 'quantitative' },
      { field: 'category', type: 'ordinal' },
    ),
  ],
  [
    'bubble',
    base(
      { type: 'bubble', fields: { size: 'size', color: 'group' } },
      xy,
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
    ),
  ],
  ['calendar', base('calendar', trend, { field: 'date', type: 'temporal' })],
  [
    'candlestick',
    base(
      { type: 'candlestick', fields: { open: 'open', high: 'high', low: 'low', close: 'close' } },
      [
        { day: 'Mon', open: 12, high: 18, low: 10, close: 16 },
        { day: 'Tue', open: 16, high: 17, low: 11, close: 13 },
      ],
      { field: 'day', type: 'ordinal' },
      { field: 'close', type: 'quantitative' },
    ),
  ],
  ['column', base('bar')],
  [
    'combo',
    {
      data: trend,
      layers: [
        {
          mark: 'bar',
          x: { field: 'category', type: 'ordinal' },
          y: { field: 'old', type: 'quantitative' },
        },
        {
          mark: { type: 'line', point: true },
          x: { field: 'category', type: 'ordinal' },
          y: { field: 'value', type: 'quantitative' },
        },
      ],
    },
  ],
  ['diff', base({ type: 'diff', fields: { old: 'old', new: 'value' } })],
  ['donut', base({ type: 'pie', options: { innerRadius: 0.56 } })],
  [
    'gantt',
    base(
      {
        type: 'gantt',
        fields: { end: 'end', id: 'id', progress: 'progress', dependencies: 'dependencies' },
      },
      [
        {
          start: '2026-01-01',
          end: '2026-01-05',
          task: 'Research',
          id: 'research',
          progress: 100,
          dependencies: '',
        },
        {
          start: '2026-01-05',
          end: '2026-01-10',
          task: 'Build',
          id: 'build',
          progress: 55,
          dependencies: 'research',
        },
      ],
      { field: 'start', type: 'temporal' },
      { field: 'task', type: 'ordinal' },
    ),
  ],
  [
    'gauge',
    base(
      { type: 'gauge', options: { min: 0, max: 100 } },
      [
        { label: 'CPU', value: 68 },
        { label: 'Memory', value: 44 },
      ],
      { field: 'label', type: 'nominal' },
    ),
  ],
  [
    'geo',
    base(
      'geo',
      [
        { region: 'KR', value: 72 },
        { region: 'US', value: 88 },
        { region: 'BR', value: 41 },
      ],
      { field: 'region', type: 'nominal' },
    ),
  ],
  [
    'histogram',
    base(
      { type: 'histogram', options: { bins: 5 } },
      xy,
      { field: 'x', type: 'quantitative' },
      { field: 'x', type: 'quantitative' },
    ),
  ],
  ['intervals', base({ type: 'interval', fields: { low: 'low', high: 'high' } })],
  ['line', base({ type: 'line', point: true })],
  [
    'map',
    base(
      { type: 'map', fields: { size: 'size' } },
      [
        { longitude: 126.98, latitude: 37.57, size: 50 },
        { longitude: 37.62, latitude: 55.75, size: 80 },
      ],
      { field: 'longitude', type: 'quantitative' },
      { field: 'latitude', type: 'quantitative' },
    ),
  ],
  [
    'motion',
    base(
      {
        type: 'motion',
        fields: { size: 'size', color: 'group', time: 'time' },
        options: { frame: '2026' },
      },
      xy,
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
    ),
  ],
  [
    'org',
    base(
      { type: 'org', fields: { parent: 'parent' } },
      [
        { id: 'CEO', parent: '' },
        { id: 'Data', parent: 'CEO' },
        { id: 'Product', parent: 'CEO' },
      ],
      { field: 'id', type: 'nominal' },
      { field: 'parent', type: 'nominal' },
    ),
  ],
  ['pie', base('pie')],
  [
    'sankey',
    base(
      { type: 'sankey', fields: { target: 'target' } },
      [
        { source: 'Visits', target: 'Signup', value: 70 },
        { source: 'Visits', target: 'Leave', value: 30 },
        { source: 'Signup', target: 'Paid', value: 42 },
      ],
      { field: 'source', type: 'nominal' },
    ),
  ],
  [
    'scatter',
    base('point', xy, { field: 'x', type: 'quantitative' }, { field: 'y', type: 'quantitative' }),
  ],
  ['stepped-area', base('stepped-area')],
  ['table', base({ type: 'table', options: { columns: ['category', 'value', 'old'] } })],
  [
    'timeline',
    base(
      { type: 'timeline', fields: { end: 'end' } },
      [
        { start: '2026-01-01', end: '2026-01-04', row: 'A' },
        { start: '2026-01-03', end: '2026-01-09', row: 'B' },
      ],
      { field: 'start', type: 'temporal' },
      { field: 'row', type: 'ordinal' },
    ),
  ],
  ['treemap', base('treemap')],
  [
    'trendline',
    base(
      'trendline',
      xy,
      { field: 'x', type: 'quantitative' },
      { field: 'y', type: 'quantitative' },
    ),
  ],
  ['vega', base({ type: 'vega', options: { mark: 'line' }, point: true })],
  ['waterfall', base('waterfall')],
  [
    'word-tree',
    base(
      { type: 'word-tree', fields: { parent: 'parent' } },
      [
        { word: 'Data', parent: '', weight: 12 },
        { word: 'Charts', parent: 'Data', weight: 8 },
        { word: 'Stories', parent: 'Data', weight: 6 },
      ],
      { field: 'word', type: 'nominal' },
      { field: 'weight', type: 'quantitative' },
    ),
  ],
]);

test('catalog covers every supported chart family and compatibility name', () => {
  assert.equal(chartTypeCatalog.length, 31);
  assert.deepEqual(
    [...specs.keys()],
    chartTypeCatalog.map((entry) => entry.id),
  );
  const marks = capabilities().marks;
  for (const entry of chartTypeCatalog) {
    if (entry.mark !== 'multiple')
      assert.ok(marks.includes(entry.mark), `${entry.mark} is registered`);
  }
});

test('every catalog entry exposes its documented Quick API', () => {
  for (const entry of chartTypeCatalog) {
    assert.equal(typeof Graflume[entry.quickApi], 'function', `${entry.quickApi} is exported`);
  }
});

for (const entry of chartTypeCatalog) {
  test(`${entry.name} compiles to a non-empty renderer-neutral scene`, () => {
    const spec = specs.get(entry.id);
    assert.ok(spec, `fixture exists for ${entry.id}`);
    const { scene } = compile(spec, { width: 680, height: 400 });
    const nodes = flattenScene(scene.root);
    assert.ok(nodes.length > 2, `${entry.id} produced scene nodes`);
    assert.ok(scene.metadata.renderedNodeCount >= nodes.length);
    assert.ok(nodes.some((node) => node.type !== 'group' && !node.id.startsWith('axis-')));
  });
}
