import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import {
  axisTooltipTargetCount,
  hitTestAxisTooltip,
} from '../.tmp/src/interaction/axis-hit-test.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const dimensions = { width: 640, height: 400 };

test('layers bound to y and y2 use independent scales and rendered units', () => {
  const { scene } = compile(
    {
      width: 'container',
      height: 'container',
      data: [
        { period: 'Q1', revenue: 128, marginRate: 0.18 },
        { period: 'Q2', revenue: 156, marginRate: 0.22 },
        { period: 'Q3', revenue: 149, marginRate: 0.19 },
        { period: 'Q4', revenue: 184, marginRate: 0.27 },
      ],
      axes: {
        y: {
          title: 'Revenue',
          format: { type: 'currency', currency: 'KRW', fractionDigits: 0 },
        },
        y2: {
          title: 'Margin',
          format: { type: 'percent', fractionDigits: 0 },
        },
      },
      layers: [
        {
          id: 'revenue',
          mark: 'bar',
          x: { field: 'period', type: 'ordinal' },
          y: { field: 'revenue', type: 'quantitative', axisId: 'y' },
        },
        {
          id: 'margin',
          mark: { type: 'line', point: true },
          x: { field: 'period', type: 'ordinal' },
          y: { field: 'marginRate', type: 'quantitative', axisId: 'y2' },
        },
      ],
    },
    dimensions,
  );
  const nodes = flattenScene(scene.root);
  const primaryLine = nodes.find((node) => node.id === 'axis-y:line');
  const secondaryLine = nodes.find((node) => node.id === 'axis-y2:line');
  assert.equal(primaryLine?.type, 'line');
  assert.equal(secondaryLine?.type, 'line');
  assert.ok(secondaryLine.x1 > primaryLine.x1);

  const primaryLabels = nodes.filter(
    (node) => node.type === 'text' && node.id.startsWith('axis-y:label:'),
  );
  const secondaryLabels = nodes.filter(
    (node) => node.type === 'text' && node.id.startsWith('axis-y2:label:'),
  );
  assert.ok(primaryLabels.some((node) => node.text.includes('₩')));
  assert.ok(secondaryLabels.every((node) => node.text.endsWith('%')));
  assert.equal(
    nodes.some((node) => node.id.startsWith('axis-y2:grid:')),
    false,
  );

  const marginPoints = nodes.filter(
    (node) => node.type === 'circle' && node.id.startsWith('margin:point:'),
  );
  const positions = marginPoints.map((node) => node.cy);
  assert.ok(Math.max(...positions) - Math.min(...positions) > 200);
});

test('x2 axis-nearest tooltips follow the top axis and exclude primary-axis layers', () => {
  const { scene } = compile(
    {
      width: 'container',
      height: 'container',
      data: [
        { period: 'A', primary: 2, secondary: 8 },
        { period: 'B', primary: 4, secondary: 5 },
      ],
      layers: [
        {
          id: 'primary',
          mark: { type: 'line', point: true },
          x: { field: 'period', type: 'ordinal', axisId: 'x' },
          y: { field: 'primary', type: 'quantitative' },
        },
        {
          id: 'secondary',
          mark: { type: 'line', point: true },
          x: { field: 'period', type: 'ordinal', axisId: 'x2' },
          y: { field: 'secondary', type: 'quantitative' },
        },
      ],
      interaction: { tooltip: { trigger: 'axis', axis: 'x2' } },
    },
    dimensions,
  );
  const nodes = flattenScene(scene.root);
  const topAxis = nodes.find((node) => node.id === 'axis-x2:line');
  const point = nodes.find((node) => node.id === 'secondary:point:0');
  assert.equal(topAxis?.type, 'line');
  assert.equal(point?.type, 'circle');
  assert.equal(axisTooltipTargetCount(scene), 2);

  const hit = hitTestAxisTooltip(scene, point.cx, topAxis.y1 - 8);
  assert.equal(hit?.layerId, 'secondary');
  assert.equal(hit?.rowIndex, 0);
  assert.equal(hitTestAxisTooltip(scene, point.cx, topAxis.y1 - 30), null);
});

test('a top secondary axis reserves space below the chart title', () => {
  const { scene } = compile(
    {
      width: 'container',
      height: 'container',
      title: 'Primary and secondary periods',
      data: [
        { period: 'A', value: 2 },
        { period: 'B', value: 4 },
      ],
      mark: { type: 'line', point: true },
      x: { field: 'period', type: 'ordinal', axisId: 'x2' },
      y: { field: 'value', type: 'quantitative' },
    },
    dimensions,
  );
  const nodes = flattenScene(scene.root);
  const chartTitle = nodes.find((node) => node.id === 'chart:title');
  const axisTitle = nodes.find((node) => node.id === 'axis-x2:title');
  const axisLine = nodes.find((node) => node.id === 'axis-x2:line');
  assert.equal(chartTitle?.type, 'text');
  assert.equal(axisTitle?.type, 'text');
  assert.equal(axisLine?.type, 'line');
  assert.ok(axisTitle.y - axisTitle.fontSize >= chartTitle.y + chartTitle.fontSize);
  assert.ok(axisTitle.y < axisLine.y1);
});

test('reversing a categorical scale changes both marks and tick order', () => {
  const { scene } = compile(
    {
      width: 'container',
      height: 'container',
      data: [
        { category: 'First', value: 3 },
        { category: 'Second', value: 5 },
      ],
      mark: 'bar',
      x: { field: 'category', type: 'ordinal', scale: { reverse: true } },
      y: { field: 'value', type: 'quantitative' },
    },
    dimensions,
  );
  const nodes = flattenScene(scene.root);
  const first = nodes.find((node) => node.type === 'rect' && node.datum?.rowIndex === 0);
  const second = nodes.find((node) => node.type === 'rect' && node.datum?.rowIndex === 1);
  const firstLabel = nodes.find((node) => node.id === 'axis-x:label:0');
  assert.equal(first?.type, 'rect');
  assert.equal(second?.type, 'rect');
  assert.ok(first.x > second.x);
  assert.equal(firstLabel?.type, 'text');
  assert.equal(firstLabel.text, 'Second');
});
