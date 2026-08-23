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
  assert.equal(spec.layers[0].x.axis.grid.visible, false);
  assert.equal(spec.layers[0].y.axis.grid.visible, true);
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

test('normalizes named mark fields and function-free specialist options', () => {
  const spec = normalizeSpec({
    data: [
      { day: 'Mon', open: 10, high: 14, low: 8, close: 12 },
      { day: 'Tue', open: 12, high: 15, low: 9, close: 11 },
    ],
    mark: {
      type: 'candlestick',
      fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
      options: { risingColor: '#10b981', thresholds: [10, 20] },
    },
    x: { field: 'day', type: 'ordinal' },
    y: { field: 'close', type: 'quantitative' },
  });

  assert.equal(spec.layers[0].mark.fields.high, 'high');
  assert.equal(spec.layers[0].mark.options.risingColor, '#10b981');
  assert.deepEqual(spec.layers[0].mark.options.thresholds, [10, 20]);
});

test('rejects unsafe named mark fields and non-object options', () => {
  const issues = validateSpec({
    data,
    mark: { type: 'pie', fields: { label: 'constructor' }, options: ['not-an-object'] },
    x: 'month',
    y: 'value',
  });

  assert.ok(issues.some((issue) => issue.path === '$.mark.fields.label'));
  assert.ok(issues.some((issue) => issue.path === '$.mark.options'));
});
