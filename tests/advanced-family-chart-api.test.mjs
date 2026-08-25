import assert from 'node:assert/strict';
import test from 'node:test';

import { createCompleteRegistry } from '../.tmp/src/complete.js';
import { Chart } from '../.tmp/src/runtime/chart.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const silentRendererFactory = {
  name: 'silent-family-test',
  capabilities: { vector: false, gpu: false, worker: false, exportFormats: [] },
  create: () => ({
    name: 'silent-family-test',
    capabilities: silentRendererFactory.capabilities,
    mount() {},
    resize() {},
    render() {},
    surface: () => null,
    overlayHost: () => null,
    destroy() {},
  }),
};

function chart(spec) {
  const registry = createCompleteRegistry();
  registry.registerRenderer(silentRendererFactory);
  return new Chart(
    { clientWidth: 720, clientHeight: 460 },
    { width: 720, height: 460, renderer: silentRendererFactory.name, ...spec },
    registry,
    { autoResize: false },
  );
}

function nodes(instance) {
  return flattenScene(instance.getScene().root);
}

test('Chart navigator API changes candlestick and timeline data windows and emits state', () => {
  const candles = chart({
    data: [
      { time: 0, open: 10, high: 14, low: 9, close: 13 },
      { time: 1, open: 13, high: 15, low: 11, close: 12 },
      { time: 2, open: 12, high: 16, low: 12, close: 15 },
      { time: 3, open: 15, high: 17, low: 13, close: 14 },
    ],
    mark: {
      type: 'candlestick',
      fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
      options: { navigator: true },
    },
    x: { field: 'time', type: 'quantitative' },
    y: { field: 'close', type: 'quantitative' },
  });
  const events = [];
  candles.on('navigatorchange', ({ state, reason }) => events.push({ state, reason }));
  candles.setNavigatorWindow('layer-0', { start: 1, end: 3 });
  assert.deepEqual(candles.getNavigatorWindow('layer-0'), { start: 1, end: 3 });
  const visibleCandles = nodes(candles).filter(({ id }) => id.includes(':ohlc:'));
  assert.equal(visibleCandles.length, 2);
  assert.ok(
    visibleCandles.every(
      ({ x, width, datum }) =>
        Math.abs(x + width / 2 - candles.domainToPixel('x', datum.tooltip.time)) < 1e-9,
    ),
  );
  assert.equal(
    visibleCandles[1].x - visibleCandles[0].x,
    Math.abs(candles.domainToPixel('x', 2) - candles.domainToPixel('x', 1)),
  );
  assert.deepEqual(events, [{ state: { start: 1, end: 3 }, reason: 'programmatic' }]);
  candles.destroy();

  const timeline = chart({
    data: [
      { id: 'a', start: 0, end: 3, group: 'G' },
      { id: 'b', start: 4, end: 8, group: 'G' },
      { id: 'c', start: 9, end: 12, group: 'G' },
    ],
    mark: {
      type: 'timeline',
      fields: { id: 'id', start: 'start', end: 'end', group: 'group' },
      options: { navigator: true },
    },
    x: { field: 'start', type: 'quantitative' },
    y: { field: 'end', type: 'quantitative' },
  });
  const beforeA = nodes(timeline).find(({ id }) => id.endsWith(':timeline:a'));
  timeline.setNavigatorWindow('layer-0', { start: 3, end: 9 });
  const window = nodes(timeline).find(({ id }) => id.endsWith(':timeline-navigator-window'));
  assert.deepEqual(window.datum.tooltip, { minimum: 0, maximum: 12, start: 3, end: 9 });
  const afterItems = nodes(timeline).filter(
    ({ id }) => id.startsWith('layer-0:timeline:') && !id.includes('navigator'),
  );
  const afterA = afterItems.find(({ id }) => id.endsWith(':timeline:a'));
  const afterB = afterItems.find(({ id }) => id.endsWith(':timeline:b'));
  const afterC = afterItems.find(({ id }) => id.endsWith(':timeline:c'));
  assert.ok(afterA.width < beforeA.width);
  assert.equal(afterA.datum.tooltip.visibleDuration, 0);
  assert.equal(afterB.datum.tooltip.visibleDuration, 4);
  assert.equal(afterC.datum.tooltip.visibleDuration, 0);
  assert.ok(Math.abs(afterA.x - timeline.domainToPixel('x', 3)) < 1e-9);
  assert.ok(Math.abs(afterB.x - timeline.domainToPixel('x', 4)) < 1e-9);
  assert.ok(Math.abs(afterB.x + afterB.width - timeline.domainToPixel('x', 8)) < 1e-9);
  assert.ok(Math.abs(afterC.x - timeline.domainToPixel('x', 9)) < 1e-9);
  timeline.destroy();

  const milestone = chart({
    data: [{ id: 'release', start: 5, end: 5, group: 'G', milestone: true }],
    mark: {
      type: 'timeline',
      fields: { id: 'id', start: 'start', end: 'end', group: 'group', milestone: 'milestone' },
      options: { navigator: true },
    },
    x: { field: 'start', type: 'quantitative' },
    y: { field: 'end', type: 'quantitative' },
  });
  const milestoneBounds = milestone.getNavigatorWindow('layer-0');
  assert.ok(milestoneBounds.start < milestoneBounds.end);
  assert.doesNotThrow(() =>
    milestone.setNavigatorWindow('layer-0', {
      start: milestoneBounds.start + (milestoneBounds.end - milestoneBounds.start) * 0.25,
      end: milestoneBounds.start + (milestoneBounds.end - milestoneBounds.start) * 0.75,
    }),
  );
  assert.ok(nodes(milestone).some(({ id }) => id.endsWith(':timeline:release')));
  milestone.destroy();
});

test('Chart hierarchy API collapses, reroots, zooms and searches the rendered hierarchy', () => {
  const instance = chart({
    data: [
      { id: 'root', parent: null, value: 5, label: 'Company' },
      { id: 'a', parent: 'root', value: 3, label: 'Analytics' },
      { id: 'a1', parent: 'a', value: 1, label: 'Research' },
      { id: 'b', parent: 'root', value: 2, label: 'Platform' },
    ],
    mark: {
      type: 'tree',
      fields: { id: 'id', parent: 'parent', value: 'value', label: 'label' },
      options: { layout: 'circle-pack', breadcrumbs: true },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  instance.setHierarchyNodeCollapsed('layer-0', 'a', true);
  assert.equal(
    nodes(instance).some(({ id }) => id.endsWith(':hierarchy-node:a1')),
    false,
  );
  instance.rerootHierarchy('layer-0', 'a');
  assert.equal(
    nodes(instance).find(({ id }) => id.endsWith(':hierarchy-node:a')).datum.tooltip.root,
    'a',
  );
  instance.zoomHierarchy('layer-0', 'a1');
  const zoomed = nodes(instance).filter(({ id }) => id.includes(':hierarchy-node:'));
  assert.deepEqual(
    zoomed.map(({ datum }) => datum.tooltip.id),
    ['a', 'a1'],
  );
  assert.ok(zoomed.every(({ datum }) => datum.tooltip.root === 'a'));
  assert.ok(zoomed.every(({ datum }) => datum.tooltip.zoomTo === 'a1'));
  assert.ok(zoomed.every(({ datum }) => datum.tooltip.viewScale > 1));
  assert.deepEqual(
    zoomed.find(({ datum }) => datum.tooltip.id === 'a1').datum.tooltip.autoExpanded,
    ['a'],
  );
  assert.deepEqual(instance.getHierarchyRuntimeState('layer-0').collapsed, ['a']);
  instance
    .zoomHierarchy('layer-0', null)
    .setHierarchyNodeCollapsed('layer-0', 'a', false)
    .setHierarchyQuery('layer-0', 'research');
  assert.equal(
    nodes(instance).find(({ id }) => id.endsWith(':hierarchy-node:a1')).datum.tooltip.matched,
    true,
  );
  instance.destroy();
});

test('Chart parallel API reorders/inverts axes and applies a linked multi-axis filter', () => {
  const instance = chart({
    data: [
      { a: 1, b: 10, c: 'low' },
      { a: 5, b: 50, c: 'mid' },
      { a: 9, b: 90, c: 'high' },
    ],
    mark: {
      type: 'parallel',
      options: {
        axes: [
          { field: 'a', type: 'linear', domain: [0, 10] },
          { field: 'b', type: 'linear', domain: [0, 100] },
          { field: 'c', type: 'ordinal', domain: ['low', 'mid', 'high'] },
        ],
      },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  instance.reorderParallelAxis('layer-0', 'c', 0).invertParallelAxis('layer-0', 'b', true);
  instance.setParallelBrush('layer-0', 'a', [[0.4, 0.6]]);
  assert.deepEqual(
    instance.getParallelRuntimeState('layer-0').axes.map(({ field, invert }) => [field, invert]),
    [
      ['c', false],
      ['a', false],
      ['b', true],
    ],
  );
  const rowPaths = nodes(instance).filter(({ id }) => id.includes(':parallel-row:'));
  assert.ok(rowPaths.some(({ datum }) => datum.tooltip.selected === true));
  assert.ok(rowPaths.some(({ datum }) => datum.tooltip.selected === false));
  assert.equal(nodes(instance).filter(({ id }) => id.includes(':parallel-brush:')).length, 1);
  instance.destroy();
});

test('Chart heatmap and scatter-matrix brush APIs change linked scene selection', () => {
  const heatmap = chart({
    data: [
      { column: 'A', row: 'North', value: 1 },
      { column: 'B', row: 'North', value: 2 },
      { column: 'A', row: 'South', value: 3 },
      { column: 'B', row: 'South', value: 4 },
    ],
    mark: { type: 'heatmap', fields: { value: 'value' }, options: { colorMode: 'quantile' } },
    x: { field: 'column', type: 'nominal' },
    y: { field: 'row', type: 'nominal' },
  });
  heatmap.setHeatmapBrush('layer-0', { rows: ['South'], columns: ['B'] });
  const brushed = nodes(heatmap).filter(
    ({ id, datum }) => id.includes(':analytic-heatmap:') && datum.tooltip.brushed,
  );
  assert.deepEqual(
    brushed.map(({ datum }) => [datum.tooltip.row, datum.tooltip.column]),
    [['South', 'B']],
  );
  heatmap.destroy();

  const matrix = chart({
    data: [
      { a: 1, b: 10, c: 100 },
      { a: 2, b: 20, c: 200 },
      { a: 3, b: 30, c: 300 },
      { a: 4, b: 40, c: 400 },
    ],
    mark: {
      type: 'scatter-matrix',
      options: { variables: ['a', 'b', 'c'], diagonal: 'kde', upper: 'scatter', lower: 'scatter' },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  matrix.setScatterMatrixBrush('layer-0', {
    xField: 'a',
    yField: 'b',
    x: [1.5, 3.5],
    y: [15, 35],
  });
  assert.deepEqual(matrix.getScatterMatrixBrush('layer-0').selectedRows, [1, 2]);
  const points = nodes(matrix).filter(({ id }) => id.includes(':analytic-scatter-matrix-point:'));
  assert.deepEqual(
    [
      ...new Set(
        points
          .filter(({ datum }) => datum.tooltip.linkedSelected)
          .map(({ datum }) => datum.rowIndex),
      ),
    ],
    [1, 2],
  );
  assert.equal(
    nodes(matrix).filter(({ id }) => id.endsWith(':analytic-scatter-matrix-linked-brush')).length,
    1,
  );
  matrix.destroy();
});
