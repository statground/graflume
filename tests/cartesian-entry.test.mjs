import test from 'node:test';
import assert from 'node:assert/strict';
import { compile as compileDefault } from '../.tmp/src/index.js';
import { compile, capabilities, createCartesianRegistry } from '../.tmp/src/cartesian.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const dimensions = { width: 720, height: 400 };
const barData = [
  { id: 'a1', category: 'A', value: 1, weight: 2 },
  { id: 'a2', category: 'A', value: 1, weight: 3 },
  { id: 'b1', category: 'B', value: 1, weight: 4 },
];
function barSpec(options = {}) {
  return {
    data: barData,
    mark: {
      type: 'bar',
      maxThickness: 28,
      fields: { category: 'category', value: 'value', weight: 'weight', id: 'id' },
      options,
    },
    x: { field: 'category', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
    locale: 'ko-KR',
    interaction: { tooltip: { trigger: 'axis', axis: 'x' } },
  };
}
function dataRectangles(scene) {
  return flattenScene(scene.root).filter(
    (node) => node.type === 'rect' && node.datum !== undefined,
  );
}
function assertSceneParity(spec) {
  const focused = compile(spec, dimensions);
  const standard = compileDefault(spec, dimensions);
  assert.deepEqual(focused.scene, standard.scene);
  assert.deepEqual(focused.dataLineage, standard.dataLineage);
  return focused;
}

test('focused native bars preserve ranking, aggregate values and source provenance', () => {
  for (const aggregate of ['value', 'count', 'weighted-count']) {
    const result = assertSceneParity(
      barSpec({ rank: true, aggregate, previousRanks: { A: 2, B: 1 } }),
    );
    const bars = dataRectangles(result.scene);
    assert.equal(bars.length, 2);
    assert.ok(bars.every((bar) => bar.width <= 28));
    if (aggregate === 'weighted-count') {
      assert.deepEqual(
        bars.map(({ datum }) => [
          datum.tooltip.category,
          datum.tooltip.value,
          datum.tooltip.rankChange,
        ]),
        [
          ['A', 5, 1],
          ['B', 4, -1],
        ],
      );
      assert.deepEqual(bars[0].datum.datum.sourceIds, ['a1', 'a2']);
    }
  }
  const ranked = barSpec({ rank: true });
  ranked.data = [
    { category: 'Low', value: 1 },
    { category: 'High', value: 10 },
  ];
  assert.equal(dataRectangles(assertSceneParity(ranked).scene)[0].datum.datum.category, 'High');
});

test('focused line marks preserve temporal domains, missing-value gaps and semantic rows', () => {
  const result = assertSceneParity({
    data: [
      { day: '2026-09-01', value: 3 },
      { day: '2026-09-02', value: null },
      { day: '2026-09-03', value: 8 },
    ],
    mark: { type: 'line', point: true, options: { missing: 'gap' } },
    x: { field: 'day', type: 'temporal' },
    y: { field: 'value', type: 'quantitative' },
    interaction: { tooltip: { trigger: 'axis', axis: 'x' } },
    accessibility: { table: true, navigation: true },
  });
  const points = flattenScene(result.scene.root).filter(
    (node) => node.type === 'circle' && node.datum !== undefined,
  );
  assert.equal(points.length, 2);
  assert.deepEqual(
    points.map((node) => node.datum.datum.value),
    [3, 8],
  );
});

test('focused area and point marks preserve signed values, style, axes and semantic geometry', () => {
  for (const type of ['area', 'point']) {
    const result = assertSceneParity({
      data: [
        { x: -5, value: -3 },
        { x: 0, value: 2 },
        { x: 5, value: 8 },
      ],
      mark: { type, point: true, fill: '#B8DE29', radius: 5 },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
      axes: { y: { format: { type: 'number', useGrouping: true } } },
      locale: 'ko-KR',
    });
    assert.ok(flattenScene(result.scene.root).some((node) => node.datum !== undefined));
    assert.ok(result.coordinates.axes.y.domain()[0] <= -3);
  }
});

test('focused entry rejects unsupported marks without changing its declared capabilities', () => {
  assert.deepEqual(capabilities().marks, ['area', 'bar', 'line', 'point']);
  assert.deepEqual(capabilities().renderers, ['canvas']);
  const unsupported = {
    data: [{ category: 'A', value: 1 }],
    mark: 'pie',
    x: { field: 'category', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  };
  assert.throws(() => compile(unsupported), /Unsupported mark/);
  assert.doesNotThrow(() => compileDefault(unsupported));
  assert.deepEqual(capabilities().marks, ['area', 'bar', 'line', 'point']);
});

test('fresh Cartesian registries isolate compiler overrides from other instances and the shared entry', () => {
  const first = createCartesianRegistry();
  const second = createCartesianRegistry();
  first.registerMark('bar', () => []);
  first.registerMark('temporary', () => []);
  assert.ok(first.capabilities().marks.includes('temporary'));
  assert.equal(second.capabilities().marks.includes('temporary'), false);
  assert.equal(capabilities().marks.includes('temporary'), false);
  const spec = barSpec();
  assert.equal(dataRectangles(compileWithRegistry(spec, first, dimensions).scene).length, 0);
  assert.equal(dataRectangles(compileWithRegistry(spec, second, dimensions).scene).length, 3);
  assert.equal(dataRectangles(compile(spec, dimensions).scene).length, 3);
});
