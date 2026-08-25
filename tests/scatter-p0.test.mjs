import assert from 'node:assert/strict';
import test from 'node:test';

import * as Graflume from '../.tmp/src/complete.js';
import {
  automaticScatterWebGLThreshold,
  resolveScatterRendererDispatch,
} from '../.tmp/src/api/scatter-dispatch.js';
import { hitTestScene, hitTestSpatialIndexStats } from '../.tmp/src/interaction/hit-test.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';

test('scatter resolves portable color, radius, shape, and opacity encodings', () => {
  const result = Graflume.compile({
    data: [
      { x: 1, y: 2, color: '#e11d48', size: 314.159, shape: 'square', opacity: 0.35 },
      { x: 2, y: 3, color: '#2563eb', size: 78.54, shape: 'diamond', opacity: 0.8 },
    ],
    mark: 'point',
    encoding: {
      x: 'x',
      y: 'y',
      color: { field: 'color', type: 'nominal' },
      size: 'size',
      shape: 'shape',
      opacity: 'opacity',
    },
  });
  const marks = result.scene.root.children
    .flatMap((node) => (node.type === 'group' ? node.children : []))
    .filter(({ id }) => id.includes(':point:'));
  assert.equal(marks.length, 2);
  assert.deepEqual(
    marks.map(({ type }) => type),
    ['circle', 'rect'],
  );
  assert.notEqual(marks[0].fill, marks[1].fill);
  assert.ok(marks.every(({ fill }) => /^#[0-9a-f]{6}$/i.test(fill)));
  assert.deepEqual(
    marks.map(({ opacity }) => opacity),
    [0.15, 1],
  );
  assert.ok(marks[0].radius > marks[1].width / 2);
  assert.ok(marks[0].radius > 0 && marks[1].width > 0);
});

test('scatter hit testing uses a bounded screen-space spatial index', () => {
  const data = Array.from({ length: 2_500 }, (_, index) => ({
    x: index % 50,
    y: Math.floor(index / 50),
    key: `point-${index}`,
  }));
  const result = Graflume.compile({
    data,
    mark: 'point',
    x: 'x',
    y: 'y',
    width: 800,
    height: 500,
  });
  const stats = hitTestSpatialIndexStats(result.scene);
  assert.equal(stats.itemCount, 2_500);
  assert.equal(stats.indexedItemCount, 2_500);
  assert.ok(stats.bucketCount > 1);
  assert.ok(stats.bucketCount < 2_500);

  const node = result.scene.root.children
    .flatMap((candidate) => (candidate.type === 'group' ? candidate.children : []))
    .find(({ id }) => id === 'layer-0:point:1250');
  assert.equal(node.type, 'circle');
  const hit = hitTestScene(result.scene, node.cx, node.cy, 2);
  assert.equal(hit?.rowIndex, 1250);
  assert.equal(hit?.datum.key, 'point-1250');
});

test('ordinary Chart scatter selects its registered WebGL renderer by threshold or explicit choice', () => {
  const large = {
    columns: {
      x: new Float64Array(automaticScatterWebGLThreshold),
      y: new Float64Array(automaticScatterWebGLThreshold),
    },
  };
  assert.deepEqual(resolveScatterRendererDispatch(large), {
    renderer: 'webgl',
    reason: 'threshold',
    rowCount: automaticScatterWebGLThreshold,
    threshold: automaticScatterWebGLThreshold,
  });
  assert.equal(resolveScatterRendererDispatch([{ x: 1, y: 2 }], 'webgl').renderer, 'webgl');
  assert.equal(resolveScatterRendererDispatch(large, 'canvas').renderer, 'canvas');
  const factory = createDefaultRegistry().resolveRenderer('webgl');
  assert.equal(factory.capabilities.gpu, true);
  assert.equal(factory.create().name, 'webgl');
});
