import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const data = [
  { month: 'Jan', value: 10 },
  { month: 'Feb', value: 12 },
];

test('normalizes the quick mark/x/y shorthand into a canonical layer', () => {
  const spec = normalizeSpec({
    data,
    mark: { type: 'line', point: true },
    x: 'month',
    y: { field: 'value', type: 'quantitative' },
  });

  assert.equal(spec.specVersion, '0.1');
  assert.equal(spec.layers.length, 1);
  assert.equal(spec.layers[0].id, 'layer-0');
  assert.equal(spec.layers[0].mark.type, 'line');
  assert.equal(spec.layers[0].mark.point, true);
  assert.equal(spec.layers[0].x.field, 'month');
  assert.equal(spec.layers[0].y.title, 'value');
  assert.deepEqual(spec.padding, { top: 24, right: 24, bottom: 44, left: 56 });
});

test('portable specs reject functions and unsafe field names', () => {
  const issues = validateSpec({
    data,
    mark: 'line',
    x: '__proto__',
    y: 'value',
    tooltip: { formatter: () => 'unsafe' },
  });

  assert.ok(issues.some((issue) => issue.path === '$.x'));
  assert.ok(issues.some((issue) => issue.message.includes('Functions are not allowed')));
});
