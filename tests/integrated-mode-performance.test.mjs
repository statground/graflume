import test from 'node:test';
import assert from 'node:assert/strict';

import * as Graflume from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const compileNodes = (spec, options = { width: 680, height: 440 }) =>
  flattenScene(Graflume.compile(spec, options).scene.root);

const hierarchicalSpec = (data) => ({
  data,
  mark: { type: 'treemap', fields: { parent: 'parent' }, options: { mode: 'icicle' } },
  x: { field: 'name', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  performance: 'ultra',
});

test('icicle handles a 5k-deep chain iteratively and obeys the ultra bar budget', () => {
  const data = Array.from({ length: 5_250 }, (_, index) => ({
    name: `node-${index}`,
    parent: index === 0 ? '' : `node-${index - 1}`,
    value: 1,
  }));
  const nodes = compileNodes(hierarchicalSpec(data));
  const bars = nodes.filter((node) => node.type === 'rect' && node.id.includes(':icicle:'));
  assert.equal(bars.length, 5_000);
  assert.equal(bars[0]?.datum?.tooltip?.depth, 0);
  assert.equal(bars.at(-1)?.datum?.tooltip?.depth, 4_999);

  const cycleNodes = compileNodes(
    hierarchicalSpec([
      { name: 'A', parent: 'C', value: 1 },
      { name: 'B', parent: 'A', value: 1 },
      { name: 'C', parent: 'B', value: 1 },
    ]),
  );
  assert.equal(
    cycleNodes.filter((node) => node.type === 'rect' && node.id.includes(':icicle:')).length,
    3,
  );

  const star = Array.from({ length: 100_000 }, (_, index) => ({
    name: index === 0 ? 'root' : `leaf-${index}`,
    parent: index === 0 ? '' : 'root',
    value: 1,
  }));
  const starNodes = compileNodes(hierarchicalSpec(star));
  assert.equal(
    starNodes.filter((node) => node.type === 'rect' && node.id.includes(':icicle:')).length,
    5_000,
  );
});

const parallelSpec = (data) => ({
  data,
  mark: {
    type: 'parallel',
    options: { mode: 'categories', dimensions: ['first', 'second'] },
  },
  x: { field: 'first', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  performance: 'ultra',
});

test('parallel category ribbons preserve counts and stack inside category blocks', () => {
  const nodes = compileNodes(
    parallelSpec([
      { first: 'A', second: 'X', value: 1 },
      { first: 'A', second: 'X', value: 1 },
      { first: 'A', second: 'Y', value: 1 },
      { first: 'B', second: 'X', value: 1 },
    ]),
  );
  const ribbons = new Map(
    nodes
      .filter((node) => node.type === 'path' && node.id.includes(':parallel-ribbon:'))
      .map((node) => [node.datum?.tooltip?.path, node]),
  );
  const ax = ribbons.get('A → X');
  const ay = ribbons.get('A → Y');
  const bx = ribbons.get('B → X');
  assert.ok(ax && ay && bx);
  assert.equal(ax.datum?.tooltip?.count, 2);
  assert.equal(ay.datum?.tooltip?.count, 1);
  assert.equal(bx.datum?.tooltip?.count, 1);

  const thicknessAt = (ribbon, dimension) => {
    const top = ribbon.points[dimension]?.y;
    const bottom = ribbon.points[ribbon.points.length - 1 - dimension]?.y;
    assert.equal(typeof top, 'number');
    assert.equal(typeof bottom, 'number');
    return bottom - top;
  };
  assert.equal(thicknessAt(ax, 0), thicknessAt(ax, 1));
  assert.equal(thicknessAt(ax, 0), thicknessAt(ay, 0) * 2);
  assert.equal(thicknessAt(ax, 1), thicknessAt(bx, 1) * 2);
  assert.equal(ax.points.at(-1)?.y, ay.points[0]?.y);
  assert.equal(ax.points[2]?.y, bx.points[1]?.y);
  assert.equal(bx.points[2]?.y, ay.points[1]?.y);
});

test('parallel categories cap high-cardinality unique combinations deterministically', () => {
  const data = Array.from({ length: 6_000 }, (_, index) => ({
    first: `A-${index}`,
    second: `B-${index}`,
    value: 1,
  }));
  const nodes = compileNodes(parallelSpec(data));
  const ribbons = nodes.filter(
    (node) => node.type === 'path' && node.id.includes(':parallel-ribbon:'),
  );
  assert.equal(ribbons.length, 500);
  assert.equal(ribbons[0]?.datum?.tooltip?.path, 'A-0 → B-0');
  assert.equal(ribbons.at(-1)?.datum?.tooltip?.path, 'A-499 → B-499');
  assert.ok(nodes.length <= 5_000, nodes.length);
  assert.ok(ribbons.reduce((sum, ribbon) => sum + ribbon.points.length, 0) <= 2_000);
});

test('parallel categories jointly budget wide dimensions, blocks, labels, and ribbon points', () => {
  const dimensions = Array.from({ length: 100 }, (_, index) => `dimension-${index}`);
  const data = Array.from({ length: 100 }, (_, rowIndex) => {
    const row = { value: 1 };
    dimensions.forEach((dimension) => {
      row[dimension] = `${dimension}-value-${rowIndex}`;
    });
    return row;
  });
  const nodes = compileNodes(
    {
      data,
      mark: { type: 'parallel', options: { mode: 'categories', dimensions } },
      x: { field: dimensions[0], type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 5_000, height: 500 },
  );
  const ribbons = nodes.filter(
    (node) => node.type === 'path' && node.id.includes(':parallel-ribbon:'),
  );
  const pathPointCount = ribbons.reduce((sum, ribbon) => sum + ribbon.points.length, 0);
  assert.equal(ribbons.length, 24);
  assert.ok(pathPointCount <= 8_000, pathPointCount);
  assert.ok(nodes.length <= 5_000, nodes.length);
});

const gaugeSpec = (data, mode) => ({
  data,
  mark: {
    type: 'gauge',
    fields: { reference: 'reference', target: 'target' },
    options: { mode },
  },
  x: { field: 'label', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  performance: 'ultra',
});

test('number, delta, and bullet gauges keep large-input output inside the profile budget', () => {
  const data = Array.from({ length: 6_000 }, (_, index) => ({
    label: `Metric ${index}`,
    value: index % 101,
    reference: (index + 95) % 101,
    target: 80,
  }));
  for (const mode of ['number', 'delta', 'bullet']) {
    const nodes = compileNodes(gaugeSpec(data, mode));
    const gaugeNodes = nodes.filter((node) => node.id.includes(`:gauge-${mode}`));
    assert.ok(gaugeNodes.length > 0, mode);
    assert.ok(gaugeNodes.length <= 5_000, `${mode}: ${gaugeNodes.length}`);
  }
});

test('funnel length, area, and pyramid modes sample large inputs within the bar budget', () => {
  const data = Array.from({ length: 130_000 }, (_, index) => ({
    stage: `Stage ${index}`,
    value: 130_000 - index,
  }));
  for (const mode of ['length', 'area', 'pyramid']) {
    const nodes = compileNodes({
      data,
      mark: { type: 'funnel', options: { mode } },
      x: { field: 'stage', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
      performance: 'ultra',
    });
    const funnelNodes = nodes.filter((node) => node.id.includes(':funnel'));
    const paths = funnelNodes.filter((node) => node.type === 'path');
    assert.ok(paths.length > 0, mode);
    assert.ok(paths.length <= 5_000, `${mode}: ${paths.length}`);
    assert.ok(funnelNodes.length <= 5_000, `${mode}: ${funnelNodes.length}`);
  }
});

test('radar groups once and budgets all path points and datum point marks', () => {
  const data = Array.from({ length: 1_000 }, (_, index) => ({
    category: `Category ${index}`,
    series: `Series ${index}`,
    value: (index % 100) + 1,
  }));
  const nodes = compileNodes(
    {
      data,
      mark: {
        type: 'polar',
        fields: { series: 'series' },
        options: { mode: 'radar', rings: 5 },
      },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 5_000, height: 500 },
  );
  const paths = nodes.filter(
    (node) =>
      node.type === 'path' &&
      (node.id.includes(':radar-grid:') || node.id.includes(':radar-series:')),
  );
  const pathPointCount = paths.reduce((sum, path) => sum + path.points.length, 0);
  const pointMarks = nodes.filter(
    (node) => node.type === 'circle' && node.id.includes(':radar-point:'),
  );
  assert.ok(pathPointCount <= 8_000, pathPointCount);
  assert.ok(pointMarks.length <= 8_000, pointMarks.length);
  assert.ok(nodes.filter((node) => node.id.includes(':radar-axis:')).length <= 89);
  assert.ok(nodes.filter((node) => node.id.includes(':radar-series:')).length <= 89);
});
