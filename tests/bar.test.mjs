import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const monthly = [
  { month: 'Jan', sales: 42 },
  { month: 'Feb', sales: 51 },
  { month: 'Mar', sales: 49 },
  { month: 'Apr', sales: 63 },
];

test('basic bar chart creates one styled rectangle for each row', () => {
  const { scene } = compile(
    {
      data: monthly,
      title: 'Monthly sales',
      mark: {
        type: 'bar',
        fill: '#2563eb',
        cornerRadius: 8,
      },
      x: { field: 'month', type: 'ordinal' },
      y: {
        field: 'sales',
        type: 'quantitative',
        scale: { zero: true, nice: true },
      },
    },
    { width: 640, height: 420 },
  );

  const bars = flattenScene(scene.root).filter((node) => node.type === 'rect');
  assert.equal(bars.length, monthly.length);
  assert.ok(bars.every((bar) => bar.fill === '#2563eb'));
  assert.ok(bars.every((bar) => bar.cornerRadius === 8));
  assert.ok(bars.every((bar) => bar.width > 0 && bar.height > 0));
  assert.deepEqual(
    bars.map((bar) => bar.datum?.rowIndex),
    [0, 1, 2, 3],
  );
});

test('bar chart renders values on both sides of the zero baseline', () => {
  const { scene } = compile(
    {
      data: [
        { category: 'Loss', value: -12 },
        { category: 'Profit', value: 18 },
      ],
      mark: 'bar',
      x: { field: 'category', type: 'ordinal' },
      y: {
        field: 'value',
        type: 'quantitative',
        scale: { zero: true },
      },
    },
    { width: 480, height: 320 },
  );

  const bars = flattenScene(scene.root).filter((node) => node.type === 'rect');
  assert.equal(bars.length, 2);
  assert.ok(bars.every((bar) => bar.height > 0));
  assert.notEqual(bars[0]?.y, bars[1]?.y);
});

test('grouped bar layers occupy separate slots for every category', () => {
  const data = [
    { month: 'Jan', plan: 38, actual: 42 },
    { month: 'Feb', plan: 47, actual: 51 },
    { month: 'Mar', plan: 52, actual: 49 },
  ];
  const { scene } = compile(
    {
      data,
      layers: [
        {
          id: 'plan',
          mark: { type: 'bar', position: 'group', fill: '#8b5cf6' },
          x: { field: 'month', type: 'ordinal' },
          y: { field: 'plan', type: 'quantitative' },
        },
        {
          id: 'actual',
          mark: { type: 'bar', position: 'group', fill: '#2563eb' },
          x: { field: 'month', type: 'ordinal' },
          y: { field: 'actual', type: 'quantitative' },
        },
      ],
    },
    { width: 640, height: 420 },
  );

  const bars = flattenScene(scene.root).filter((node) => node.type === 'rect');
  assert.equal(bars.length, data.length * 2);

  for (let rowIndex = 0; rowIndex < data.length; rowIndex += 1) {
    const pair = bars.filter((bar) => bar.datum?.rowIndex === rowIndex);
    assert.equal(pair.length, 2);
    assert.notEqual(pair[0]?.x, pair[1]?.x);
    const left = pair[0].x < pair[1].x ? pair[0] : pair[1];
    const right = left === pair[0] ? pair[1] : pair[0];
    assert.ok(left.x + left.width <= right.x);
  }
});
