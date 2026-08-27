import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import { compile as compileComplete } from '../.tmp/src/complete.js';
import { pairedAreaSampleIndices } from '../.tmp/src/marks/area-topology.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

function path(result, token) {
  const found = flattenScene(result.scene.root).find(
    (node) => node.type === 'path' && node.id.includes(token),
  );
  assert.ok(found, `expected a Scene path containing ${token}`);
  return found;
}

function paths(result, token) {
  return flattenScene(result.scene.root).filter(
    (node) => node.type === 'path' && node.id.includes(token),
  );
}

function assertAreaTopology(node) {
  assert.equal(node.closed, true, `${node.id} must be closed`);
  assert.equal(node.points.length % 2, 0, `${node.id} must retain aligned boundary pairs`);
  const boundaryLength = node.points.length / 2;
  assert.ok(boundaryLength > 0, `${node.id} must retain at least one boundary pair`);
  const upper = node.points.slice(0, boundaryLength);
  const lower = node.points.slice(boundaryLength).reverse();
  for (let index = 0; index < boundaryLength; index += 1) {
    const top = upper[index];
    const bottom = lower[index];
    assert.ok(top.x >= (upper[index - 1]?.x ?? Number.NEGATIVE_INFINITY), `${node.id} upper x`);
    assert.ok(bottom.x >= (lower[index - 1]?.x ?? Number.NEGATIVE_INFINITY), `${node.id} lower x`);
    assert.ok(Math.abs(top.x - bottom.x) < 1e-8, `${node.id} aligned x pair ${index}`);
    assert.ok(top.y <= bottom.y, `${node.id} ordered y pair ${index}`);
  }
  assert.ok(
    Math.abs(node.points[boundaryLength - 1].x - node.points[boundaryLength].x) < 1e-8,
    `${node.id} must join its right boundaries vertically`,
  );
  assert.ok(
    Math.abs(node.points.at(-1).x - node.points[0].x) < 1e-8,
    `${node.id} must close its left boundaries vertically`,
  );
}

function cartesianSpec(mark, data) {
  return {
    data,
    mark,
    x: { field: 'date', type: 'temporal' },
    y: { field: 'value', type: 'quantitative', scale: { zero: true } },
  };
}

test('zero-baseline Area closes corresponding endpoints instead of drawing a bow tie', () => {
  const result = compile(
    cartesianSpec(
      { type: 'area', fill: '#c7d2fe', stroke: '#4f46e5' },
      [48, 53, 51, 66, 70, 82, 80, 89, 104].map((value, index) => ({
        date: new Date(Date.UTC(2026, index, 1)).toISOString(),
        value,
      })),
    ),
    { width: 1_200, height: 720 },
  );
  const fill = path(result, ':area-fill');
  assertAreaTopology(fill);
  const boundaryLength = fill.points.length / 2;
  assert.equal(boundaryLength, 9);
});

test('paired Area sampling retains upper, lower, and thickness extrema in one bounded index set', () => {
  const upper = Array.from({ length: 101 }, () => 20);
  const lower = Array.from({ length: 101 }, () => 10);
  upper[23] = 80;
  lower[67] = -90;
  upper[84] = 55;
  lower[84] = 54;
  const indices = pairedAreaSampleIndices(upper, lower, 16);
  assert.ok(indices.length <= 16);
  assert.ok(indices.includes(23), 'upper-only spike');
  assert.ok(indices.includes(67), 'lower-only spike');
  assert.ok(indices.includes(84), 'minimum-thickness event');
  assert.deepEqual([indices[0], indices.at(-1)], [0, 100]);
});

test('Area sorts temporal rows before applying missing-value gaps', () => {
  const result = compile(
    cartesianSpec({ type: 'area', options: { missing: 'gap' } }, [
      { date: '2026-05-01', value: 24 },
      { date: '2026-01-01', value: 12 },
      { date: '2026-03-01', value: null },
      { date: '2026-06-01', value: 30 },
      { date: '2026-02-01', value: 18 },
      { date: '2026-04-01', value: 20 },
    ]),
    { width: 720, height: 420 },
  );
  const fills = paths(result, 'area-fill');
  assert.equal(fills.length, 2);
  fills.forEach(assertAreaTopology);
});

test('stepped and y2 Area variants retain aligned non-crossing boundaries', () => {
  const stepped = compile(
    cartesianSpec('stepped-area', [
      { date: '2026-03-01', value: 28 },
      { date: '2026-01-01', value: 12 },
      { date: '2026-02-01', value: 22 },
    ]),
    { width: 720, height: 420 },
  );
  assertAreaTopology(path(stepped, 'stepped-area-fill'));

  const ranged = compile(
    {
      data: [
        { date: '2026-03-01', high: 18, low: 26 },
        { date: '2026-01-01', high: 24, low: 8 },
        { date: '2026-02-01', high: 14, low: 20 },
      ],
      mark: { type: 'area', options: { curve: 'natural', curveSamples: 6 } },
      encoding: {
        x: { field: 'date', type: 'temporal' },
        y: { field: 'high', type: 'quantitative' },
        y2: 'low',
      },
    },
    { width: 720, height: 420 },
  );
  assertAreaTopology(path(ranged, ':area-fill'));
});

test('tight Area LOD preserves a lower-only y2 spike and its authored tooltip row', () => {
  const length = 12_001;
  const spike = 6_137;
  const data = Array.from({ length }, (_value, x) => ({
    x,
    high: 100,
    low: x === spike ? -500 : 94 + Math.sin(x / 41),
    note: x === spike ? 'Lower-bound incident' : 'Nominal interval',
  }));
  const result = compile(
    {
      data,
      performance: 'ultra',
      mark: { type: 'area', point: true },
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'high', type: 'quantitative' },
        y2: 'low',
        tooltip: 'note',
      },
    },
    { width: 600, height: 420 },
  );
  const fill = path(result, ':area-fill');
  assertAreaTopology(fill);
  assert.ok(fill.points.length <= 4_000, `${fill.points.length} paired Scene points`);
  const spikePoint = flattenScene(result.scene.root).find(
    (node) => node.type === 'circle' && node.id.endsWith(`:area-point:${spike}`),
  );
  assert.ok(spikePoint, 'lower-only spike survives the tight maxLinePoints source budget');
  assert.equal(spikePoint.datum.datum.high, 100);
  assert.equal(spikePoint.datum.datum.low, -500);
  assert.equal(spikePoint.datum.tooltip.encoded, 'Lower-bound incident');
});

test('reversed and duplicate x values use x as the topology key and order as a stable tie-break', () => {
  const result = compile(
    {
      data: [
        { x: 2, high: 32, low: 18, rank: 0, note: 'right' },
        { x: 1, high: 28, low: 16, rank: 3, note: 'later duplicate' },
        { x: 1, high: 21, low: 26, rank: 1, note: 'earlier duplicate' },
        { x: 0, high: 17, low: 9, rank: 2, note: 'left' },
      ],
      mark: { type: 'area', point: true },
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'high', type: 'quantitative' },
        y2: 'low',
        order: 'rank',
        tooltip: 'note',
      },
    },
    { width: 720, height: 420 },
  );
  assertAreaTopology(path(result, ':area-fill'));
  const line = path(result, ':area-line');
  assert.ok(line.points.every((point, index) => point.x >= (line.points[index - 1]?.x ?? -1)));
  const points = flattenScene(result.scene.root).filter(
    (node) => node.type === 'circle' && node.id.includes(':area-point:'),
  );
  assert.deepEqual(
    points.map((node) => node.datum.rowIndex),
    [3, 2, 1, 0],
  );
  assert.equal(points[1].datum.datum.high, 21);
  assert.equal(points[1].datum.datum.low, 26);
  assert.equal(points[1].datum.tooltip.encoded, 'earlier duplicate');
});

test('smooth Area and both interval bands share the topology-safe boundary contract', () => {
  const data = [
    { date: '2026-04-01', value: 31, low: 22, high: 36 },
    { date: '2026-01-01', value: 16, low: 9, high: 22 },
    { date: '2026-03-01', value: 25, low: 28, high: 20 },
    { date: '2026-02-01', value: 21, low: 13, high: 27 },
  ];
  const smooth = compileComplete(cartesianSpec({ type: 'smooth', options: { area: true } }, data), {
    width: 720,
    height: 420,
  });
  assertAreaTopology(path(smooth, 'smooth-area'));

  for (const smoothBand of [false, true]) {
    const interval = compileComplete(
      {
        data,
        mark: {
          type: 'range',
          fields: { low: 'low', high: 'high' },
          options: { mode: 'area', smooth: smoothBand },
        },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'value', type: 'quantitative' },
      },
      { width: 720, height: 420 },
    );
    assertAreaTopology(path(interval, ':range-band'));
  }
});

test('stacked, diverging, and stream Area paths remain topology-safe with shuffled rows', () => {
  const data = [
    { x: 2, series: 'Platform', value: 8 },
    { x: 0, series: 'Library', value: 5 },
    { x: 1, series: 'Platform', value: -3 },
    { x: 0, series: 'Platform', value: 7 },
    { x: 2, series: 'Library', value: 6 },
    { x: 1, series: 'Library', value: 4 },
  ];
  for (const stack of ['stacked', 'diverging']) {
    const result = compile(
      {
        data,
        mark: { type: 'area', fields: { series: 'series' }, options: { stack } },
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'value', type: 'quantitative' },
      },
      { width: 720, height: 420 },
    );
    const fills = paths(result, ':series-area:');
    assert.equal(fills.length, 2);
    fills.forEach(assertAreaTopology);
  }

  const stream = compileComplete(
    {
      data: data.map((row) => ({ ...row, value: Math.abs(row.value) })),
      mark: {
        type: 'theme-river',
        fields: { series: 'series' },
        options: { stack: { mode: 'streamgraph', offset: 'wiggle', order: 'insideOut' } },
      },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 720, height: 420 },
  );
  const rivers = paths(stream, ':river:');
  assert.equal(rivers.length, 2);
  rivers.forEach(assertAreaTopology);
});

test('stack order owns series layering while encoding order cannot reverse x traversal', () => {
  const data = [
    { x: 2, series: 'Alpha', value: 2, traversal: 0 },
    { x: 0, series: 'Beta', value: 5, traversal: 2 },
    { x: 1, series: 'Gamma', value: 3, traversal: 1 },
    { x: 0, series: 'Alpha', value: 1, traversal: 2 },
    { x: 2, series: 'Gamma', value: 3, traversal: 0 },
    { x: 1, series: 'Beta', value: 4, traversal: 1 },
    { x: 0, series: 'Gamma', value: 3, traversal: 2 },
    { x: 2, series: 'Beta', value: 5, traversal: 0 },
    { x: 1, series: 'Alpha', value: 1, traversal: 1 },
  ];
  const stacked = compile(
    {
      data,
      mark: {
        type: 'area',
        fields: { series: 'series' },
        options: { stack: { mode: 'stacked', order: 'sumDescending' } },
      },
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'value', type: 'quantitative' },
        order: 'traversal',
      },
    },
    { width: 720, height: 420 },
  );
  const targets = flattenScene(stacked.scene.root).filter(
    (node) => node.type === 'circle' && node.id.includes(':series-area-target:'),
  );
  assert.deepEqual(
    [...new Set(targets.map((node) => node.datum.tooltip.stackSeries))],
    ['Beta', 'Gamma', 'Alpha'],
  );
  for (const series of ['Beta', 'Gamma', 'Alpha']) {
    const x = targets
      .filter((node) => node.datum.tooltip.stackSeries === series)
      .map((node) => node.datum.datum.x);
    assert.deepEqual(x, [0, 1, 2]);
  }
  paths(stacked, ':series-area:').forEach(assertAreaTopology);

  const stream = compileComplete(
    {
      data,
      mark: {
        type: 'theme-river',
        fields: { series: 'series' },
        options: { stack: { mode: 'streamgraph', offset: 'wiggle', order: 'insideOut' } },
      },
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'value', type: 'quantitative' },
        order: 'traversal',
      },
    },
    { width: 720, height: 420 },
  );
  assert.equal(stream.dataLineage['layer-0'].transforms.at(-1).parameters.order, 'insideOut');
  paths(stream, ':river:').forEach(assertAreaTopology);
  const streamTargets = flattenScene(stream.scene.root).filter(
    (node) => node.type === 'circle' && node.id.includes(':river-target:'),
  );
  for (const series of new Set(streamTargets.map((node) => node.datum.tooltip.stackSeries))) {
    const x = streamTargets
      .filter((node) => node.datum.tooltip.stackSeries === series)
      .map((node) => node.datum.datum.x);
    assert.deepEqual(x, [0, 1, 2]);
  }
});
