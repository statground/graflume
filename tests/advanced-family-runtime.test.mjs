import assert from 'node:assert/strict';
import test from 'node:test';

import {
  heatmapRuntimeOptions,
  hierarchyRuntimeOptions,
  invertParallelAxis,
  navigatorRuntimeOptions,
  normalizeHeatmapRuntimeState,
  normalizeHierarchyRuntimeState,
  normalizeNavigatorRuntimeState,
  normalizeParallelRuntimeState,
  normalizeScatterMatrixRuntimeState,
  parallelRuntimeOptions,
  reorderParallelAxis,
  scatterMatrixPointerBrush,
  scatterMatrixRuntimeOptions,
  selectScatterMatrixRows,
  setParallelBrushExtents,
  translateNavigatorWindow,
} from '../.tmp/src/interaction/advanced-family-runtime.js';

test('navigator state translates, clamps, and becomes family compiler options', () => {
  const interaction = {
    kind: 'navigator-window',
    family: 'timeline',
    minimum: 0,
    maximum: 100,
    start: 20,
    end: 50,
    plot: { x: 10, y: 300, width: 200, height: 24 },
  };
  assert.deepEqual(translateNavigatorWindow(interaction, 100), { start: 70, end: 100 });
  assert.deepEqual(translateNavigatorWindow(interaction, -200), { start: 0, end: 30 });
  const normalized = normalizeNavigatorRuntimeState(
    { start: -10, end: 130 },
    { start: 20, end: 50 },
    { minimum: 0, maximum: 100 },
  );
  assert.deepEqual(normalized, { start: 0, end: 100 });
  assert.deepEqual(navigatorRuntimeOptions('timeline', normalized), { domain: [0, 100] });
  assert.deepEqual(navigatorRuntimeOptions('candlestick', { start: 1.2, end: 5.1 }), {
    navigatorStart: 1,
    navigatorEnd: 6,
  });
});

test('hierarchy runtime persists collapse, reroot, zoom and search as real compiler options', () => {
  const state = normalizeHierarchyRuntimeState({
    root: 'department',
    zoomTo: 'team-a',
    collapsed: ['team-b'],
    query: 'analyst',
  });
  assert.deepEqual(hierarchyRuntimeOptions(state), {
    root: 'department',
    zoomTo: 'team-a',
    collapsed: ['team-b'],
    query: 'analyst',
  });
  assert.throws(
    () => normalizeHierarchyRuntimeState({ collapsed: ['same', 'same'] }),
    /must be unique/,
  );
});

test('parallel runtime reorders, inverts and replaces a per-axis multi-brush', () => {
  const base = normalizeParallelRuntimeState(
    {
      axes: [
        { field: 'a', type: 'linear', invert: false, missing: 'gap' },
        { field: 'b', type: 'log', invert: false, missing: 'top', domain: [1, 100] },
        { field: 'c', type: 'ordinal', invert: false, missing: 'middle' },
      ],
      brushes: [],
      combine: 'intersection',
    },
    { axes: [], brushes: [], combine: 'intersection' },
  );
  const reordered = reorderParallelAxis(base, 'c', 0);
  const inverted = invertParallelAxis(reordered, 'b');
  const brushed = setParallelBrushExtents(inverted, 'a', [
    [0.8, 0.2],
    [0.9, 1],
  ]);
  assert.deepEqual(
    brushed.axes.map(({ field, invert }) => [field, invert]),
    [
      ['c', false],
      ['a', false],
      ['b', true],
    ],
  );
  assert.deepEqual(brushed.brushes, [
    {
      field: 'a',
      extents: [
        [0.2, 0.8],
        [0.9, 1],
      ],
    },
  ]);
  assert.deepEqual(parallelRuntimeOptions(brushed).combine, 'intersection');
});

test('heatmap pointer-derived row and column keys become an authored brush fragment', () => {
  const state = normalizeHeatmapRuntimeState({
    rows: ['North', 'South'],
    columns: [2024, 2025],
    value: [20, -5],
  });
  assert.deepEqual(heatmapRuntimeOptions(state), {
    brush: {
      rows: ['North', 'South'],
      columns: [2024, 2025],
      value: [-5, 20],
    },
  });
});

test('scatter-matrix brush converts cell pixels to domain and produces linked row identities', () => {
  const cell = {
    kind: 'scatter-matrix-cell',
    xField: 'height',
    yField: 'weight',
    row: 1,
    column: 0,
    plot: { x: 100, y: 50, width: 200, height: 100 },
    xDomain: [150, 190],
    yDomain: [40, 100],
  };
  const brush = scatterMatrixPointerBrush(cell, { x: 125, y: 125 }, { x: 175, y: 75 });
  assert.deepEqual(brush, {
    xField: 'height',
    yField: 'weight',
    x: [155, 165],
    y: [55, 85],
  });
  const rows = [
    { height: 154, weight: 70 },
    { height: 160, weight: 60 },
    { height: 165, weight: 85 },
    { height: 166, weight: 70 },
    { height: null, weight: 60 },
  ];
  const selectedRows = selectScatterMatrixRows(rows, brush);
  assert.deepEqual(selectedRows, [1, 2]);
  const state = normalizeScatterMatrixRuntimeState(
    { ...brush, selectedRows },
    { xField: 'height', yField: 'weight', x: [0, 1], y: [0, 1], selectedRows: [] },
  );
  assert.deepEqual(scatterMatrixRuntimeOptions(state), { linkedBrush: state });
});
