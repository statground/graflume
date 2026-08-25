import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '../.tmp/src/complete.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

test('Venn hit testing resolves the actual overlap interior instead of its label marker', () => {
  const data = [
    ...Array.from({ length: 10 }, (_, index) => ({ id: `a-${index}`, sets: ['A'], value: 1 })),
    ...Array.from({ length: 10 }, (_, index) => ({ id: `b-${index}`, sets: ['B'], value: 1 })),
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `ab-${index}`,
      sets: ['A', 'B'],
      value: 1,
    })),
  ];
  const scene = compile({
    width: 720,
    height: 440,
    data,
    mark: { type: 'venn', fields: { id: 'id', sets: 'sets' }, options: { proportional: true } },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  }).scene;
  const nodes = flattenScene(scene.root);
  const circles = nodes.filter(
    (node) => node.type === 'circle' && node.datum?.tooltip?.kind === 'venn-set',
  );
  const marker = nodes.find(
    (node) =>
      node.type === 'circle' &&
      node.datum?.tooltip?.kind === 'venn-region' &&
      node.datum.tooltip.sets.join(',') === 'A,B',
  );
  assert.equal(circles.length, 2);
  assert.equal(marker?.type, 'circle');

  let point = null;
  for (let y = 0; y <= scene.height && point === null; y += 2) {
    for (let x = 0; x <= scene.width; x += 2) {
      if (!circles.every((circle) => Math.hypot(x - circle.cx, y - circle.cy) <= circle.radius)) {
        continue;
      }
      if (Math.hypot(x - marker.cx, y - marker.cy) <= marker.radius + 12) continue;
      point = { x, y };
      break;
    }
  }
  assert.notEqual(point, null, 'expected a lens-interior point away from the synthetic marker');
  const hit = hitTestScene(scene, point.x, point.y, 0.5);
  assert.equal(hit?.tooltip?.kind, 'venn-region');
  assert.deepEqual(hit?.tooltip?.sets, ['A', 'B']);
  assert.equal(hit?.nodeId, marker.id);
  assert.equal(hit?.distance, 0);
});
