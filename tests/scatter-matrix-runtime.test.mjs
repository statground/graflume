import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

test('one scatter-matrix cell brush highlights the same source rows across every cell', () => {
  const scene = compile({
    width: 720,
    height: 520,
    data: [
      { a: 1, b: 10, c: 100 },
      { a: 2, b: 20, c: 200 },
      { a: 3, b: 30, c: 300 },
      { a: 4, b: 40, c: 400 },
    ],
    mark: {
      type: 'scatter-matrix',
      options: {
        variables: ['a', 'b', 'c'],
        diagonal: 'kde',
        upper: 'scatter',
        lower: 'scatter',
        linkedBrush: {
          xField: 'a',
          yField: 'b',
          x: [1.5, 3.5],
          y: [15, 35],
          selectedRows: [0],
        },
      },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  }).scene;
  const nodes = flattenScene(scene.root);
  const points = nodes.filter(({ id }) => id.includes(':analytic-scatter-matrix-point:'));
  assert.ok(points.length >= 20);
  const selected = points.filter(({ datum }) => datum.tooltip.linkedSelected === true);
  const unselected = points.filter(({ datum }) => datum.tooltip.linkedSelected === false);
  assert.ok(selected.length >= 4);
  assert.ok(unselected.length >= 8);
  assert.deepEqual(
    [...new Set(selected.map(({ rowIndex, datum }) => datum.rowIndex ?? rowIndex))],
    [0],
  );
  assert.ok(
    selected.every(({ opacity, fill }) => opacity === 1 && fill.endsWith('f0')),
    'selected identities should remain prominent in every matrix cell',
  );
  assert.ok(
    unselected.every(({ fill }) => fill.endsWith('1a')),
    'unselected identities should be visibly filtered to context',
  );
  const brush = nodes.find(({ id }) => id.endsWith(':analytic-scatter-matrix-linked-brush'));
  assert.equal(brush?.type, 'rect');
  assert.ok(brush.width > 0 && brush.height > 0);
});
