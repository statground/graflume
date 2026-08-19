import test from 'node:test';
import assert from 'node:assert/strict';

import { DataTable } from '../.tmp/src/data/table.js';
import { minMaxSampleIndices } from '../.tmp/src/data/sample.js';


test('columnar typed arrays stay zero-copy until mutation is requested', () => {
  const x = new Float64Array([1, 2, 3]);
  const y = new Float32Array([10, 20, 30]);
  const table = DataTable.from({ columns: { x, y } });

  assert.equal(table.length, 3);
  assert.equal(table.column('x'), x);
  assert.equal(table.value(1, 'y'), 20);

  table.append([{ x: 4, y: 40 }]);
  assert.equal(table.length, 4);
  assert.deepEqual(Array.from(table.column('x')), [1, 2, 3, 4]);
});

test('min/max sampling keeps extrema and endpoints', () => {
  const values = [0, 1, 2, 100, 3, 4, -50, 5, 6, 7];
  const indices = minMaxSampleIndices(values, 6);

  assert.equal(indices[0], 0);
  assert.equal(indices.at(-1), values.length - 1);
  assert.ok(indices.includes(3));
  assert.ok(indices.includes(6));
});

test('mismatched column lengths are rejected', () => {
  assert.throws(
    () => DataTable.from({ columns: { x: [1, 2], y: [1] } }),
    /expected 2/,
  );
});
