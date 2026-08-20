import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const trend = [
  { month: 'Jan', value: 28 },
  { month: 'Feb', value: 35 },
  { month: 'Mar', value: 32 },
  { month: 'Apr', value: 46 },
];

test('line charts create a styled path and optional interactive points', () => {
  const { scene } = compile(
    {
      data: trend,
      mark: {
        type: 'line',
        point: true,
        stroke: '#2563eb',
        lineWidth: 3,
        radius: 5,
      },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );

  const nodes = flattenScene(scene.root);
  const paths = nodes.filter((node) => node.type === 'path');
  const points = nodes.filter((node) => node.type === 'circle');

  assert.equal(paths.length, 1);
  assert.equal(paths[0].closed, false);
  assert.equal(paths[0].stroke, '#2563eb');
  assert.equal(paths[0].lineWidth, 3);
  assert.equal(points.length, trend.length);
  assert.ok(points.every((point) => point.radius === 5 && point.interactive === true));
});

test('area charts create a closed baseline polygon with fill and stroke', () => {
  const { scene } = compile(
    {
      data: trend,
      mark: {
        type: 'area',
        fill: '#bfdbfe',
        stroke: '#2563eb',
        opacity: 0.72,
      },
      x: { field: 'month', type: 'ordinal' },
      y: {
        field: 'value',
        type: 'quantitative',
        scale: { zero: true },
      },
    },
    { width: 640, height: 400 },
  );

  const areas = flattenScene(scene.root).filter((node) => node.type === 'path' && node.closed);
  assert.equal(areas.length, 1);
  assert.equal(areas[0].fill, '#bfdbfe');
  assert.equal(areas[0].stroke, '#2563eb');
  assert.equal(areas[0].opacity, 0.72);
  assert.equal(areas[0].points.length, trend.length + 2);
  assert.equal(areas[0].points.at(-1).y, areas[0].points.at(-2).y);
});

test('scatter charts create one styled point for each valid pair', () => {
  const data = [
    { hours: 1, score: 52 },
    { hours: 2.5, score: 64 },
    { hours: 4, score: 79 },
    { hours: null, score: 91 },
  ];
  const { scene } = compile(
    {
      data,
      mark: {
        type: 'point',
        fill: '#8b5cf6',
        stroke: '#ffffff',
        radius: 7,
        lineWidth: 2,
      },
      x: { field: 'hours', type: 'quantitative' },
      y: { field: 'score', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );

  const points = flattenScene(scene.root).filter((node) => node.type === 'circle');
  assert.equal(points.length, 3);
  assert.ok(points.every((point) => point.fill === '#8b5cf6'));
  assert.ok(points.every((point) => point.stroke === '#ffffff'));
  assert.deepEqual(
    points.map((point) => point.datum?.rowIndex),
    [0, 1, 2],
  );
});

test('bar, line, and point layers can form a shared-scale combination chart', () => {
  const data = [
    { month: 'Jan', target: 40, actual: 42 },
    { month: 'Feb', target: 46, actual: 51 },
    { month: 'Mar', target: 54, actual: 49 },
  ];
  const { scene } = compile(
    {
      data,
      layers: [
        {
          id: 'target',
          mark: { type: 'bar', fill: '#cbd5e1', cornerRadius: 5 },
          x: { field: 'month', type: 'ordinal' },
          y: { field: 'target', type: 'quantitative' },
        },
        {
          id: 'actual',
          mark: { type: 'line', point: true, stroke: '#f97316' },
          x: { field: 'month', type: 'ordinal' },
          y: { field: 'actual', type: 'quantitative' },
        },
      ],
    },
    { width: 640, height: 400 },
  );

  const nodes = flattenScene(scene.root);
  assert.equal(nodes.filter((node) => node.type === 'rect').length, data.length);
  assert.equal(nodes.filter((node) => node.type === 'path').length, 1);
  assert.equal(nodes.filter((node) => node.type === 'circle').length, data.length);
});
