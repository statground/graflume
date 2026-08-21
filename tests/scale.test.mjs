import test from 'node:test';
import assert from 'node:assert/strict';

import { BandScale } from '../.tmp/src/scale/band.js';
import { LinearScale } from '../.tmp/src/scale/linear.js';

test('linear scales map and invert values', () => {
  const scale = new LinearScale({ domain: [0, 100], range: [10, 210], nice: false });
  assert.equal(scale.map(50), 110);
  assert.equal(scale.invert(110), 50);
  assert.ok(scale.ticks(5).length >= 5);
});

test('band scales allocate stable category bands', () => {
  const scale = new BandScale({ domain: ['a', 'b', 'c'], range: [0, 300] });
  assert.ok(scale.bandwidth > 0);
  assert.ok(scale.map('a') < scale.map('b'));
  assert.equal(scale.ticks(3).length, 3);
});
