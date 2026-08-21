import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import * as Graflume from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const {
  capabilities,
  compile,
  fullCatalog,
  resolveSeriesType,
  seriesChartTypeCatalog,
  seriesCompatibilityCatalog,
  seriesCompatibilityIds,
} = Graflume;

const trend = Array.from({ length: 12 }, (_, index) => ({
  date: `2026-${String(index + 1).padStart(2, '0')}-01`,
  category: `P${index + 1}`,
  value: 20 + Math.sin(index * 0.7) * 8 + index * 1.4,
  low: 12 + index * 0.8,
  high: 30 + index * 1.2,
  lower: 14 + index * 0.9,
  upper: 28 + index * 1.1,
  target: 26 + index,
  width: 3 + (index % 4),
  radius: 8 + index * 2,
  z: 4 + index,
  direction: (index * 31) % 360,
  magnitude: 4 + (index % 7) * 3,
  speed: 8 + index * 3,
  signal: 18 + index * 1.25,
  secondary: 16 + index * 1.1,
  up: 40 + index * 2,
  down: 65 - index * 2,
  plus: 24 + index,
  minus: 34 - index * 0.6,
  conversion: 19 + index,
  base: 18 + index * 0.9,
  support: 12 + index * 0.8,
  resistance: 32 + index,
  volume: 100 + index * 27,
  price: 22 + index * 1.2,
  title: String.fromCharCode(65 + index),
  open: 20 + index,
  close: 21 + index + (index % 2 === 0 ? 2 : -2),
}));

const relation = [
  { source: 'Input', target: 'Compiler', value: 9 },
  { source: 'Compiler', target: 'Scene', value: 8 },
  { source: 'Scene', target: 'Canvas', value: 6 },
  { source: 'Scene', target: 'Vector', value: 4 },
];

const hierarchy = [
  { id: 'All', parent: '', value: 12 },
  { id: 'Data', parent: 'All', value: 8 },
  { id: 'Design', parent: 'All', value: 7 },
  { id: 'Runtime', parent: 'Data', value: 5 },
];

const geo = [
  { longitude: 126.98, latitude: 37.57, longitude2: 37.62, latitude2: 55.75, value: 72 },
  { longitude: -74.0, latitude: 40.71, longitude2: 2.35, latitude2: 48.86, value: 55 },
  { longitude: 139.69, latitude: 35.68, longitude2: 151.21, latitude2: -33.87, value: 43 },
];

const grid = Array.from({ length: 20 }, (_, index) => ({
  x: index % 5,
  y: Math.floor(index / 5),
  value: Math.sin(index * 0.65) * 20 + 30,
}));

const base = (mark, data = trend, x = 'category', y = 'value') => ({
  data,
  mark,
  x: {
    field: x,
    type:
      x === 'date' || x === 'start'
        ? 'temporal'
        : x === 'category' || x === 'source' || x === 'id'
          ? 'ordinal'
          : 'quantitative',
  },
  y: { field: y, type: y === 'category' || y === 'parent' ? 'ordinal' : 'quantitative' },
});

function fixture(entry) {
  const { id, mark } = entry;
  if (mark === 'arc-diagram' || mark === 'chord' || mark === 'graph') {
    return base({ type: mark, fields: { target: 'target', value: 'value' } }, relation, 'source');
  }
  if (mark === 'org' || mark === 'tree') {
    return base({ type: mark, fields: { parent: 'parent' } }, hierarchy, 'id', 'value');
  }
  if (mark === 'range') {
    const mode = id.includes('column') ? 'column' : id === 'dumbbell' ? 'dumbbell' : 'area';
    return base({
      type: mark,
      fields: { low: 'low', high: 'high' },
      options: { mode, smooth: id.includes('spline') },
    });
  }
  if (mark === 'smooth')
    return base({ type: mark, point: true, options: { area: id.includes('area') } });
  if (mark === 'distribution') return base(mark);
  if (mark === 'bullet') return base({ type: mark, fields: { target: 'target' } });
  if (mark === 'contour') return base({ type: mark, fields: { value: 'value' } }, grid, 'x', 'y');
  if (
    mark === 'cylinder' ||
    mark === 'item' ||
    mark === 'lollipop' ||
    mark === 'packed-bubble' ||
    mark === 'pareto'
  )
    return base(mark);
  if (mark === 'interval') return base({ type: mark, fields: { low: 'low', high: 'high' } });
  if (mark === 'pictorial-bar') return base({ type: mark, options: { symbol: 'diamond' } });
  if (mark === 'polygon') {
    return base(
      { type: mark, fields: { series: 'series' } },
      [
        { x: 1, y: 2, series: 'A' },
        { x: 3, y: 7, series: 'A' },
        { x: 6, y: 3, series: 'A' },
        { x: 2, y: 3, series: 'B' },
        { x: 4, y: 8, series: 'B' },
        { x: 7, y: 4, series: 'B' },
      ],
      'x',
      'y',
    );
  }
  if (mark === 'pyramid')
    return base({
      type: mark,
      options: { variant: id.includes('3d') ? `${id.replace('-3d', '')}-3d` : id },
    });
  if (mark === 'scatter-3d')
    return base({ type: mark, fields: { z: 'z' } }, trend, 'value', 'high');
  if (mark === 'solid-gauge') return base({ type: mark, options: { min: 0, max: 100 } });
  if (mark === 'theme-river') {
    return base(
      { type: mark, fields: { category: 'series' } },
      [
        { date: '2026-01-01', series: 'A', value: 12 },
        { date: '2026-01-01', series: 'B', value: 8 },
        { date: '2026-02-01', series: 'A', value: 18 },
        { date: '2026-02-01', series: 'B', value: 11 },
        { date: '2026-03-01', series: 'A', value: 14 },
        { date: '2026-03-01', series: 'B', value: 16 },
      ],
      'date',
      'value',
    );
  }
  if (mark === 'tilemap') return base({ type: mark, fields: { value: 'value' } }, grid, 'x', 'y');
  if (mark === 'variable-pie') return base({ type: mark, fields: { radius: 'radius' } });
  if (mark === 'variwide') return base({ type: mark, fields: { width: 'width' } });
  if (mark === 'vector')
    return base(
      { type: mark, fields: { direction: 'direction', magnitude: 'magnitude' } },
      trend,
      'value',
      'high',
    );
  if (mark === 'venn') return base(mark, trend.slice(0, 3));
  if (mark === 'wind-barb')
    return base(
      { type: mark, fields: { speed: 'speed', direction: 'direction' } },
      trend,
      'value',
      'high',
    );
  if (mark === 'word-cloud') return base(mark);
  if (mark === 'timeline') {
    return base(
      { type: mark, fields: { end: 'end' } },
      [
        { start: '2026-01-01', end: '2026-01-08', category: 'A' },
        { start: '2026-01-05', end: '2026-01-15', category: 'B' },
      ],
      'start',
      'category',
    );
  }
  if (mark === 'indicator') {
    const options = { kind: id, fields: ['value', 'signal'] };
    return base(
      { type: mark, fields: { lower: 'lower', upper: 'upper' }, options },
      trend,
      'date',
      'value',
    );
  }
  if (mark === 'flags')
    return base({ type: mark, fields: { title: 'title' } }, trend.slice(0, 5), 'date', 'value');
  if (mark === 'financial')
    return base(
      {
        type: mark,
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        options: { kind: id },
      },
      trend,
      'date',
      'close',
    );
  if (mark === 'point-figure' || mark === 'renko') return base(mark, trend, 'date', 'close');
  if (mark === 'volume-profile')
    return base(
      { type: mark, fields: { price: 'price', volume: 'volume' } },
      trend,
      'date',
      'price',
    );
  if (mark === 'geo-flow' || mark === 'geo-line')
    return base(
      { type: mark, fields: { longitude2: 'longitude2', latitude2: 'latitude2', value: 'value' } },
      geo,
      'longitude',
      'latitude',
    );
  if (mark === 'geo-heatmap')
    return base({ type: mark, fields: { value: 'value' } }, geo, 'longitude', 'latitude');
  if (mark === 'map')
    return base({ type: mark, fields: { size: 'value' } }, geo, 'longitude', 'latitude');
  if (mark === 'tiled-map') return base(mark, geo, 'longitude', 'latitude');
  throw new Error(`Missing fixture for ${id} (${mark})`);
}

test('the unified series catalog covers every public series identifier', () => {
  assert.equal(seriesCompatibilityIds.length, 117);
  assert.equal(new Set(seriesCompatibilityIds).size, 117);
  assert.equal(seriesCompatibilityCatalog.length, 117);
  assert.equal(seriesChartTypeCatalog.length, 96);
  assert.equal(fullCatalog.length, 141);
  assert.equal(new Set(fullCatalog.map((entry) => entry.id)).size, 141);
  const familyIds = new Set(fullCatalog.map((entry) => entry.id));
  for (const item of seriesCompatibilityCatalog) {
    assert.ok(familyIds.has(item.familyId), `${item.identifier} resolves to ${item.familyId}`);
    assert.deepEqual(resolveSeriesType(item.identifier), item);
  }
  assert.equal(resolveSeriesType('area-spline-range')?.familyId, 'area-spline-range');
  assert.equal(resolveSeriesType('unknown-series'), undefined);
});

test('every specialized series exposes a Quick API and registered canonical mark', () => {
  const marks = capabilities().marks;
  for (const entry of seriesChartTypeCatalog) {
    assert.equal(typeof Graflume[entry.quickApi], 'function', `${entry.quickApi} is exported`);
    assert.ok(marks.includes(entry.mark), `${entry.mark} is registered`);
  }
});

for (const entry of seriesChartTypeCatalog) {
  test(`${entry.name} compiles to an interactive renderer-neutral scene`, () => {
    const { scene } = compile(fixture(entry), { width: 720, height: 440 });
    const nodes = flattenScene(scene.root);
    assert.ok(nodes.length > 3, `${entry.id} produced scene nodes`);
    assert.ok(nodes.some((node) => node.type !== 'group' && !node.id.startsWith('axis-')));
    assert.ok(
      nodes.some((node) => node.interactive === true && node.datum !== undefined),
      `${entry.id} carries datum references`,
    );
  });
}

test('schema metadata matches the unified runtime catalog', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  const catalog = schema['x-graflume-catalog'];
  assert.equal(catalog.fullFamilyCount, 141);
  assert.equal(catalog.seriesFamilyCount, 96);
  assert.equal(catalog.compatibilitySeriesCount, 117);
  for (const mark of capabilities().marks) assert.ok(catalog.builtInMarks.includes(mark), mark);
});
