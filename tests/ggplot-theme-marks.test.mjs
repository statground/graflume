import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const data = [
  { category: 'A', value: 2 },
  { category: 'B', value: 4 },
  { category: 'C', value: 3 },
];

const themedSpec = (mark) => ({
  data,
  mark,
  x: { field: 'category', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  theme: 'ggplot',
});

test('ggplot applies ggplot2 geom defaults to the core Canvas marks', () => {
  const bars = flattenScene(compile(themedSpec('bar')).scene.root).filter((node) =>
    node.id.includes(':bar:'),
  );
  assert.equal(bars.length, data.length);
  assert.ok(bars.every((node) => node.fill === '#595959'));
  assert.ok(bars.every((node) => node.stroke === undefined && node.lineWidth === 0));
  assert.ok(bars.every((node) => node.cornerRadius === 0));
  const categoryStep = bars[1].x + bars[1].width / 2 - (bars[0].x + bars[0].width / 2);
  assert.ok(Math.abs(bars[0].width / categoryStep - 0.9) < 1e-10);

  const pointChart = compile(themedSpec('point'));
  const points = flattenScene(pointChart.scene.root).filter((node) => node.id.includes(':point:'));
  assert.equal(points.length, data.length);
  assert.ok(points.every((node) => node.fill === '#000000'));
  assert.ok(points.every((node) => node.stroke === '#000000'));
  assert.ok(points.every((node) => node.radius === pointChart.theme.mark.pointRadius));
  assert.ok(points.every((node) => node.lineWidth === pointChart.theme.mark.pointStrokeWidth));

  const line = flattenScene(compile(themedSpec('line')).scene.root).find((node) =>
    node.id.includes(':line:'),
  );
  assert.equal(line?.stroke, '#000000');
  assert.equal(line?.lineCap, 'butt');
  assert.equal(line?.lineJoin, 'round');

  const areaNodes = flattenScene(compile(themedSpec('area')).scene.root);
  const area = areaNodes.find((node) => node.id.endsWith(':area-fill'));
  const outline = areaNodes.find((node) => node.id.endsWith(':area-line'));
  assert.equal(area?.fill, '#333333');
  assert.equal(outline, undefined);
});

test('ggplot categorical marks use the ggplot2 hue palette for the category count', () => {
  const slices = flattenScene(compile(themedSpec('pie')).scene.root).filter((node) =>
    node.id.includes(':slice:'),
  );
  assert.deepEqual(
    slices.map((node) => node.fill),
    ['#F8766D', '#00BA38', '#619CFF'],
  );
});

test('explicit mark fill and stroke stay above ggplot mapped and geom defaults', () => {
  const { scene } = compile({
    data: [
      { x: 1, y: 2, group: 'A' },
      { x: 2, y: 3, group: 'B' },
    ],
    mark: {
      type: 'bubble',
      fill: '#123456',
      stroke: '#654321',
      fields: { color: 'group' },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
    theme: 'ggplot',
  });
  const bubbles = flattenScene(scene.root).filter((node) => node.id.includes(':bubble:'));
  assert.equal(bubbles.length, 2);
  assert.ok(bubbles.every((node) => node.fill === '#123456'));
  assert.ok(bubbles.every((node) => node.stroke === '#654321'));
});
