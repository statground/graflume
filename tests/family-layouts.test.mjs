import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTableModel,
  createTableFormatterRegistry,
  gaugeModel,
  layoutPie,
  layoutPolar,
  layoutTimeline,
  moveTableCell,
  nextPieSlice,
  rankBars,
  TableFormatterRegistry,
} from '../.tmp/src/data/family-layouts.js';

const close = (actual, expected, tolerance = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);

test('pie semantics cover zero/negative policies, minimum slices, sorting, padding and roving traversal', () => {
  assert.throws(() => layoutPie([{ id: 'negative', value: -1 }]), /Negative pie/);
  const slices = layoutPie(
    [
      { id: 'large', value: 100 },
      { id: 'tiny', value: 0 },
      { id: 'negative', value: -5 },
    ],
    {
      negative: 'absolute',
      zero: 'minimum',
      minimumAngle: 0.05,
      sort: 'descending',
      padAngle: 0.01,
    },
  );
  assert.deepEqual(
    slices.map(({ id }) => id),
    ['large', 'negative', 'tiny'],
  );
  assert.equal(slices[2].minimumApplied, true);
  assert.ok(slices.every(({ endAngle, startAngle }) => endAngle > startAngle));
  assert.match(slices[0].accessibleLabel, /%/);
  assert.equal(nextPieSlice(slices, 'large', 'previous'), 'tiny');
  assert.equal(nextPieSlice(slices, 'tiny', 'next'), 'large');
});

test('timeline packs grouped overlap lanes, milestones, dependencies, clipping, duration and navigator', () => {
  const result = layoutTimeline(
    [
      { id: 'a', start: 0, end: 10, group: 'G' },
      { id: 'b', start: 5, end: 12, group: 'G', dependencies: ['a'] },
      { id: 'm', start: 8, group: 'H', milestone: true },
      { id: 'outside', start: 20, end: 30, group: 'H' },
    ],
    { domain: [3, 15], groupOrder: ['G', 'H'], clip: true },
  );
  assert.equal(result.groups.find(({ group }) => group === 'G').lanes, 2);
  assert.equal(result.items.find(({ id }) => id === 'a').clippedStart, 3);
  assert.equal(result.items.find(({ id }) => id === 'a').duration, 10);
  assert.equal(result.items.find(({ id }) => id === 'm').milestone, true);
  assert.equal(
    result.items.some(({ id }) => id === 'outside'),
    false,
  );
  assert.deepEqual(result.navigator, { minimum: 0, maximum: 30, start: 3, end: 15 });

  const unclipped = layoutTimeline(
    [
      { id: 'partial', start: -5, end: 5 },
      { id: 'outside', start: 20, end: 30 },
    ],
    { domain: [0, 10], clip: false },
  );
  assert.deepEqual(
    unclipped.items.map(({ id, clippedStart, clippedEnd, visibleDuration, clipped }) => [
      id,
      clippedStart,
      clippedEnd,
      visibleDuration,
      clipped,
    ]),
    [
      ['partial', -5, 5, 10, false],
      ['outside', 20, 30, 10, false],
    ],
  );

  const milestoneOnly = layoutTimeline([{ id: 'm', start: 100, milestone: true }]);
  assert.ok(milestoneOnly.domain[0] < 100 && milestoneOnly.domain[1] > 100);
  assert.ok(milestoneOnly.navigator.minimum < milestoneOnly.navigator.maximum);
  assert.equal(milestoneOnly.items[0].milestone, true);
});

test('gauge model exposes radial/linear bands, thresholds, targets, custom ticks and exact accessible summary', () => {
  const model = gaugeModel(72, {
    type: 'linear',
    minimum: 0,
    maximum: 100,
    bands: [
      { from: 0, to: 50, label: 'low', color: '#00ff00' },
      { from: 50, to: 80, label: 'review', color: '#ffff00' },
      { from: 80, to: 100, label: 'high', color: '#ff0000' },
    ],
    targets: [75, 90],
    ticks: [0, 25, 50, 75, 100],
    format: (value) => `${value}%`,
  });
  assert.equal(model.type, 'linear');
  assert.equal(model.activeBand.label, 'review');
  assert.equal(model.ticks[3].label, '75%');
  assert.deepEqual(
    model.targets.map(({ position }) => position),
    [0.75, 0.9],
  );
  assert.match(model.accessibleSummary, /Value 72%.*targets 75%, 90%.*band review/);
});

test('table model applies filter, group, pivot, sort, virtual window and frozen regions in order', () => {
  const rows = [
    { region: 'A', product: 'x', value: 2 },
    { region: 'A', product: 'y', value: 3 },
    { region: 'B', product: 'x', value: 7 },
    { region: 'B', product: 'y', value: 11 },
  ];
  const grouped = buildTableModel(rows, {
    filters: [{ field: 'value', operator: 'greater', value: 2 }],
    group: { fields: ['region'], aggregates: [{ field: 'value', op: 'sum', as: 'total' }] },
    sort: [{ field: 'total', direction: 'descending' }],
    window: { offset: 0, limit: 1 },
    frozenRows: 1,
    frozenColumns: 1,
  });
  assert.equal(grouped.totalRows, 2);
  assert.deepEqual(grouped.rows, [{ region: 'B', total: 18, __count: 2 }]);
  assert.deepEqual(grouped.frozen, { rows: 1, columns: 1 });

  const moved = buildTableModel(rows, {
    window: { offset: 2, limit: 1 },
    columnWindow: { offset: 2, limit: 1 },
    frozenRows: 1,
    frozenColumns: 1,
  });
  assert.deepEqual(moved.rows, [
    { region: 'A', product: 'x', value: 2, __sourceIndex: 0 },
    { region: 'B', product: 'x', value: 7, __sourceIndex: 2 },
  ]);
  assert.deepEqual(
    moved.rowEntries.map(({ index, frozen }) => ({ index, frozen })),
    [
      { index: 0, frozen: true },
      { index: 2, frozen: false },
    ],
  );
  assert.deepEqual(
    moved.columnEntries.map(({ field, index, frozen }) => ({ field, index, frozen })),
    [
      { field: 'region', index: 0, frozen: true },
      { field: 'value', index: 2, frozen: false },
    ],
  );
  assert.deepEqual(moved.columnWindow, { offset: 2, limit: 1, end: 3 });

  const pivoted = buildTableModel(rows, {
    pivot: { row: 'region', column: 'product', value: 'value', op: 'sum' },
  });
  assert.deepEqual(pivoted.rows, [
    { region: 'A', x: 2, y: 3 },
    { region: 'B', x: 7, y: 11 },
  ]);

  const empty = buildTableModel(rows, {
    filters: [{ field: 'value', operator: 'equals', value: 999 }],
  });
  assert.equal(empty.totalRows, 0);
  assert.deepEqual(empty.rows, []);
  assert.deepEqual(empty.columns, ['region', 'product', 'value']);

  const emptyGrouped = buildTableModel(rows, {
    filters: [{ field: 'value', operator: 'equals', value: 999 }],
    group: { fields: ['region'], aggregates: [{ field: 'value', op: 'sum', as: 'total' }] },
  });
  assert.deepEqual(emptyGrouped.columns, ['region', 'total']);

  const emptyPivot = buildTableModel(rows, {
    filters: [{ field: 'value', operator: 'equals', value: 999 }],
    pivot: { row: 'region', column: 'product', value: 'value', op: 'sum' },
  });
  assert.deepEqual(emptyPivot.columns, ['region', 'x', 'y']);
});

test('table formatter registry and keyboard grid navigation are closed and bounded', () => {
  const registry = new TableFormatterRegistry();
  registry.register('currency', (value) => `$${Number(value).toFixed(2)}`);
  assert.equal(registry.format('currency', 3.5, {}), '$3.50');
  assert.throws(() => registry.register('currency', String), /Duplicate/);
  assert.throws(() => registry.format('missing', 1, {}), /Unknown/);
  const builtins = createTableFormatterRegistry();
  assert.equal(builtins.format('number', 1234.5, {}, 'en-US'), '1,234.5');
  assert.equal(builtins.format('number', 1234.5, {}, 'de-DE'), '1.234,5');
  assert.deepEqual(
    moveTableCell({ row: 4, column: 2 }, 'PageDown', { rows: 8, columns: 4, pageSize: 3 }),
    { row: 7, column: 2 },
  );
  assert.deepEqual(moveTableCell({ row: 0, column: 0 }, 'ArrowLeft', { rows: 8, columns: 4 }), {
    row: 0,
    column: 0,
  });
});

test('polar layout implements zero/direction/wrap, log/sqrt radius, angular bins and stacked normalized radial bars', () => {
  const data = [
    { id: 'a', angle: 10, value: 1, series: 'A' },
    { id: 'b', angle: 20, value: 3, series: 'B' },
    { id: 'c', angle: 190, value: 4, series: 'A' },
  ];
  const normalized = layoutPolar(data, {
    zero: 90,
    direction: 'clockwise',
    wrap: [0, 360],
    radiusScale: 'sqrt',
    bins: 2,
    stack: 'normalize',
  });
  assert.equal(normalized.bins, 2);
  const firstBin = normalized.segments.filter(({ bin }) => bin === 0);
  assert.deepEqual(
    firstBin.map(({ proportion }) => proportion),
    [0.25, 0.75],
  );
  close(firstBin.at(-1).outerRadius, 1);
  const stacked = layoutPolar(
    [
      { angle: 10, value: 6 },
      { angle: 20, value: 8 },
    ],
    { bins: 1, stack: 'stack' },
  );
  assert.deepEqual(
    stacked.segments.map(({ outerRadius }) => outerRadius),
    [6 / 14, 1],
  );
  const normalizedLinear = layoutPolar(
    [
      { angle: 10, value: 6 },
      { angle: 20, value: 8 },
    ],
    { bins: 1, stack: 'normalize' },
  );
  assert.deepEqual(
    normalizedLinear.segments.map(({ outerRadius }) => outerRadius),
    [6 / 14, 1],
  );
  const log = layoutPolar([{ angle: 0, value: 10 }], { radiusScale: 'log' });
  close(log.segments[0].outerRadius, 1);
  assert.throws(() => layoutPolar([{ angle: 0, value: 0 }], { radiusScale: 'log' }), /positive/);
});

test('bar ranking supports weighted count, stable sorting and rank-change metadata', () => {
  const ranked = rankBars(
    [
      { id: 'a1', category: 'A', weight: 2 },
      { id: 'b1', category: 'B', weight: 5 },
      { id: 'a2', category: 'A', weight: 4 },
    ],
    { aggregate: 'weighted-count', previousRanks: { A: 2, B: 1 } },
  );
  assert.deepEqual(
    ranked.map(({ id, value, rank, rankChange }) => [id, value, rank, rankChange]),
    [
      ['A', 6, 1, 1],
      ['B', 5, 2, -1],
    ],
  );
  assert.deepEqual(ranked[0].sourceIds, ['a1', 'a2']);
});
