import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

function nodes(spec) {
  return flattenScene(compile({ width: 720, height: 460, ...spec }).scene.root);
}

test('candlestick navigator alone selects the advanced compiler and emits a live window contract', () => {
  const output = nodes({
    data: [
      { time: 0, open: 10, high: 14, low: 9, close: 13 },
      { time: 1, open: 13, high: 15, low: 11, close: 12 },
      { time: 2, open: 12, high: 16, low: 12, close: 15 },
    ],
    mark: {
      type: 'candlestick',
      fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
      options: { navigator: true },
    },
    x: { field: 'time', type: 'quantitative' },
    y: { field: 'close', type: 'quantitative' },
  });
  const window = output.find(({ id }) => id.endsWith(':navigator-window'));
  assert.equal(window?.type, 'rect');
  assert.deepEqual(window.datum.familyInteraction, {
    kind: 'navigator-window',
    family: 'candlestick',
    minimum: 0,
    maximum: 3,
    start: 0,
    end: 3,
    plot: {
      x: window.datum.familyInteraction.plot.x,
      y: window.datum.familyInteraction.plot.y,
      width: window.datum.familyInteraction.plot.width,
      height: window.datum.familyInteraction.plot.height,
    },
  });
  assert.ok(window.datum.familyInteraction.plot.width > 0);
});

test('analytical heatmap and every scatter-matrix cell expose pointer-addressable runtime payloads', () => {
  const heatmap = nodes({
    data: [
      { column: 'A', row: 'North', value: 1 },
      { column: 'B', row: 'North', value: 2 },
      { column: 'A', row: 'South', value: 3 },
      { column: 'B', row: 'South', value: 4 },
    ],
    mark: { type: 'heatmap', fields: { value: 'value' }, options: { colorMode: 'quantile' } },
    x: { field: 'column', type: 'nominal' },
    y: { field: 'row', type: 'nominal' },
  }).filter(({ id }) => id.includes(':analytic-heatmap:'));
  assert.equal(heatmap.length, 4);
  assert.ok(heatmap.every(({ interactive }) => interactive));
  assert.deepEqual(
    heatmap.map(({ datum }) => [datum.familyInteraction.row, datum.familyInteraction.column]),
    [
      ['North', 'A'],
      ['North', 'B'],
      ['South', 'A'],
      ['South', 'B'],
    ],
  );

  const matrix = nodes({
    data: [
      { a: 1, b: 2, c: 3 },
      { a: 2, b: 3, c: 4 },
      { a: 3, b: 5, c: 8 },
    ],
    mark: {
      type: 'scatter-matrix',
      options: { variables: ['a', 'b', 'c'], diagonal: 'kde', upper: 'scatter', lower: 'scatter' },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  }).filter(({ id }) => id.includes(':analytic-scatter-matrix-cell:'));
  assert.equal(matrix.length, 9);
  assert.ok(matrix.every(({ interactive }) => interactive));
  assert.ok(
    matrix.every(
      ({ datum }) =>
        datum.familyInteraction.kind === 'scatter-matrix-cell' &&
        datum.familyInteraction.plot.width > 0 &&
        datum.familyInteraction.xDomain.length === 2 &&
        datum.familyInteraction.yDomain.length === 2,
    ),
  );
});
