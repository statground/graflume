import test from 'node:test';
import assert from 'node:assert/strict';

import { compile, createRegistry, pluginApiVersion } from '../.tmp/src/index.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const data = [
  { month: 'Jan', actual: 12, target: 10 },
  { month: 'Feb', actual: 18, target: 16 },
  { month: 'Mar', actual: 15, target: 17 },
];

test('compiles a line + bar composition into one shared scene', () => {
  const { scene } = compile(
    {
      data,
      title: 'Revenue',
      layers: [
        {
          id: 'target',
          mark: { type: 'bar', opacity: 0.35 },
          x: 'month',
          y: { field: 'target', type: 'quantitative' },
        },
        {
          id: 'actual',
          mark: { type: 'line', point: true },
          x: 'month',
          y: { field: 'actual', type: 'quantitative' },
        },
      ],
    },
    { width: 640, height: 400 },
  );

  const nodes = flattenScene(scene.root);
  assert.equal(nodes.filter((node) => node.type === 'rect').length, 3);
  assert.equal(nodes.filter((node) => node.type === 'path').length, 1);
  assert.equal(nodes.filter((node) => node.type === 'circle').length, 3);
  assert.ok(nodes.some((node) => node.type === 'text' && node.text === 'Revenue'));
  assert.equal(scene.metadata.performanceProfile, 'standard');
  assert.match(scene.accessibility.label, /2 layers, 6 rows/);
});

test('ultra profile bounds point rendering and disables per-mark hit testing', () => {
  const length = 100_000;
  const x = new Float64Array(length);
  const y = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    x[index] = index;
    y[index] = Math.sin(index / 100);
  }

  const { scene } = compile(
    {
      data: { columns: { x, y } },
      mark: 'point',
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 800, height: 400 },
  );

  const points = flattenScene(scene.root).filter((node) => node.type === 'circle');
  assert.ok(points.length <= 20_001);
  assert.ok(points.every((node) => node.interactive !== true));
  assert.equal(scene.metadata.performanceProfile, 'ultra');
});


test('ultra profile bounds bar rendering and disables per-mark hit testing', () => {
  const length = 100_000;
  const x = new Float64Array(length);
  const y = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    x[index] = index;
    y[index] = index % 100;
  }

  const { scene } = compile(
    {
      data: { columns: { x, y } },
      mark: 'bar',
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 800, height: 400 },
  );

  const bars = flattenScene(scene.root).filter((node) => node.type === 'rect');
  assert.ok(bars.length <= 5_001);
  assert.ok(bars.every((node) => node.interactive !== true));
});

test('plugins can add a portable custom mark compiler through the stable API', () => {
  const registry = createRegistry();
  registry.use({
    name: 'test-mark',
    apiVersion: pluginApiVersion,
    install(context) {
      context.registerMark('noop', () => []);
    },
  });

  const result = compileWithRegistry(
    {
      data,
      mark: 'noop',
      x: 'month',
      y: { field: 'actual', type: 'quantitative' },
    },
    registry,
    { width: 320, height: 200 },
  );

  assert.ok(registry.capabilities().marks.includes('noop'));
  assert.equal(result.scene.metadata.rowCount, 3);
});
