import test from 'node:test';
import assert from 'node:assert/strict';

import { contourThresholds, extractIsolines } from '../.tmp/src/data/contours.js';
import { compile } from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const gridPoints = (height, width) =>
  Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => ({ x, y })));

test('marching squares stitches exact scalar-grid topology and preserves holes', () => {
  const values = [
    [0, 1, 2],
    [0, 1, 2],
    [0, 1, 2],
  ];
  const lines = extractIsolines(values, gridPoints(3, 3), [0.5]);
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0].points, [
    { x: 0.5, y: 0 },
    { x: 0.5, y: 1 },
    { x: 0.5, y: 2 },
  ]);
  assert.equal(lines[0].closed, false);

  const hill = [
    [0, 0, 0],
    [0, 2, 0],
    [0, 0, 0],
  ];
  const closed = extractIsolines(hill, gridPoints(3, 3), [1]);
  assert.equal(closed.length, 1);
  assert.equal(closed[0].closed, true);
  assert.deepEqual(closed[0].points[0], closed[0].points.at(-1));

  const hole = [
    [0, 1, 2],
    [0, null, 2],
    [0, 1, 2],
  ];
  assert.deepEqual(extractIsolines(hole, gridPoints(3, 3), [0.5]), []);
});

test('asymptotic saddle decider uses Q rather than the corner average', () => {
  const values = [
    [10, -1],
    [-3, 0.2],
  ];
  assert.ok(values.flat().reduce((sum, value) => sum + value, 0) / 4 > 0);
  assert.ok(10 * 0.2 - -1 * -3 < 0);
  const points = gridPoints(2, 2);
  const asymptotic = extractIsolines(values, points, [0], undefined, { saddle: 'asymptotic' });
  const low = extractIsolines(values, points, [0], undefined, { saddle: 'low' });
  const high = extractIsolines(values, points, [0], undefined, { saddle: 'high' });
  assert.deepEqual(
    asymptotic,
    low,
    'Q=10*0.2-(-1*-3) is negative although the corner mean is positive',
  );
  assert.notDeepEqual(asymptotic, high);

  const case10HighValues = [
    [-1, 10],
    [3, -0.2],
  ];
  const case10Asymptotic = extractIsolines(case10HighValues, points, [0], undefined, {
    saddle: 'asymptotic',
  });
  assert.deepEqual(
    case10Asymptotic,
    extractIsolines(case10HighValues, points, [0], undefined, { saddle: 'high' }),
    'case 10 connects high corners when Q=(-1*-0.2)-(10*3) is negative',
  );
  assert.notDeepEqual(
    case10Asymptotic,
    extractIsolines(case10HighValues, points, [0], undefined, { saddle: 'low' }),
  );
});

test('threshold selection and output budgets are deterministic', () => {
  const values = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
  ];
  assert.deepEqual(contourThresholds(values, { thresholds: [7, 2, 2, 99] }), [2, 7]);
  assert.deepEqual(contourThresholds(values, { levels: 3, method: 'quantile' }), [2, 4, 6]);
  const first = extractIsolines(values, gridPoints(3, 3), [1, 2, 3, 4], undefined, {
    maximumSegments: 3,
  });
  const second = extractIsolines(values, gridPoints(3, 3), [1, 2, 3, 4], undefined, {
    maximumSegments: 3,
  });
  assert.deepEqual(first, second);
  assert.ok(first.reduce((sum, line) => sum + line.points.length, 0) <= 6);
});

test('affine-grid isolines satisfy their threshold and grid bounds', () => {
  for (const [xCoefficient, yCoefficient, offset] of [
    [1, 2, -3],
    [-2, 0.5, 4],
    [0.25, -1.5, 2],
  ]) {
    const points = gridPoints(6, 7);
    const values = points.map((row) =>
      row.map(({ x, y }) => xCoefficient * x + yCoefficient * y + offset),
    );
    for (const level of contourThresholds(values, { levels: 4 })) {
      const first = extractIsolines(values, points, [level]);
      assert.deepEqual(first, extractIsolines(values, points, [level]));
      for (const line of first) {
        for (const point of line.points) {
          assert.ok(point.x >= 0 && point.x <= 6 && point.y >= 0 && point.y <= 5);
          assert.ok(
            Math.abs(xCoefficient * point.x + yCoefficient * point.y + offset - level) < 1e-9,
          );
        }
      }
    }
  }
});

test('canonical contour compiler uses scalar isolines with tooltip provenance', () => {
  const data = Array.from({ length: 9 }, (_, index) => ({
    x: index % 3,
    y: Math.floor(index / 3),
    value: index === 4 ? 8 : 0,
  }));
  const nodes = flattenScene(
    compile(
      {
        data,
        mark: {
          type: 'contour',
          fields: { value: 'value' },
          options: { thresholds: [4], showCells: false },
        },
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
      },
      { width: 500, height: 360 },
    ).scene.root,
  );
  const isoline = nodes.find((node) => node.type === 'path' && node.id.includes(':contour-line:'));
  assert.ok(isoline);
  assert.equal(isoline.closed, true);
  assert.equal(isoline.datum.tooltip.kind, 'scalar-isoline');
  assert.equal(isoline.datum.tooltip.level, 4);
  assert.deepEqual(isoline.datum.tooltip.sourceRowIndices, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(!nodes.some((node) => node.id.includes(':contour-cell:')));
});
