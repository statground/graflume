import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { compile, curveNames, curveRegistry, interpolateCurve } from '../.tmp/src/index.js';
import { compile as compileComplete } from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const source = [
  { x: 0, y: 2 },
  { x: 10, y: 6 },
  { x: 20, y: 3 },
  { x: 30, y: 8 },
];

test('the public curve registry covers every portable curve with finite deterministic geometry', () => {
  assert.deepEqual(Object.keys(curveRegistry), curveNames);
  for (const name of curveNames) {
    const first = interpolateCurve(source, name, { tension: 0.25, samples: 6 });
    const second = interpolateCurve(source, name, { tension: 0.25, samples: 6 });
    assert.deepEqual(first, second, `${name} is deterministic`);
    assert.deepEqual(first[0], source[0], `${name} preserves the first endpoint`);
    assert.deepEqual(first.at(-1), source.at(-1), `${name} preserves the last endpoint`);
    assert.ok(
      first.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
      name,
    );
  }
});

test('step names encode when the new value takes effect', () => {
  const pair = source.slice(0, 2);
  assert.deepEqual(interpolateCurve(pair, 'step-before'), [pair[0], { x: 0, y: 6 }, pair[1]]);
  assert.deepEqual(interpolateCurve(pair, 'step-after'), [pair[0], { x: 10, y: 2 }, pair[1]]);
  assert.deepEqual(interpolateCurve(pair, 'step-mid'), [
    pair[0],
    { x: 5, y: 2 },
    { x: 5, y: 6 },
    pair[1],
  ]);
});

test('monotone-x interpolation does not overshoot monotone source values', () => {
  const increasing = [
    { x: 0, y: 0 },
    { x: 2, y: 3 },
    { x: 7, y: 4 },
    { x: 9, y: 10 },
  ];
  const points = interpolateCurve(increasing, 'monotone-x', { samples: 12 });
  assert.ok(points.every(({ x }) => x >= 0 && x <= 9));
  assert.ok(points.every(({ y }) => y >= 0 && y <= 10));
  for (let index = 1; index < points.length; index += 1) {
    assert.ok(points[index].x >= points[index - 1].x);
    assert.ok(points[index].y >= points[index - 1].y);
  }
});

function compiledPaths(mark, data, compiler = compile) {
  const { scene } = compiler(
    {
      data,
      mark,
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
    { width: 600, height: 360 },
  );
  return flattenScene(scene.root).filter((node) => node.type === 'path');
}

test('line missing policies distinguish gaps, zero substitution, and connection', () => {
  const data = [
    { x: 0, y: 2 },
    { x: 1, y: 4 },
    { x: 2, y: null },
    { x: 3, y: 3 },
    { x: 4, y: 7 },
  ];
  const gap = compiledPaths({ type: 'line', options: { missing: 'gap' } }, data);
  const zero = compiledPaths({ type: 'line', options: { missing: 'zero' } }, data);
  const connect = compiledPaths({ type: 'line', options: { missing: 'connect' } }, data);
  assert.equal(gap.length, 2);
  assert.equal(zero.length, 1);
  assert.equal(zero[0].points.length, data.length);
  assert.equal(connect.length, 1);
  assert.equal(connect[0].points.length, data.length - 1);
});

test('curve preparation preserves categorical y encodings', () => {
  const { scene } = compile(
    {
      data: [
        { x: 0, lane: 'A' },
        { x: 1, lane: 'B' },
        { x: 2, lane: 'A' },
      ],
      mark: { type: 'line', options: { curve: 'step-mid' } },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'lane', type: 'nominal' },
    },
    { width: 600, height: 360 },
  );
  const path = flattenScene(scene.root).find(
    (node) => node.type === 'path' && node.id.includes(':line:'),
  );
  assert.equal(path?.points.length, 7);
});

test('sampled curves stay inside the resolved line-point performance budget', () => {
  const data = Array.from({ length: 800 }, (_, x) => ({ x, y: Math.sin(x / 17) }));
  const { scene } = compile(
    {
      data,
      performance: 'ultra',
      mark: { type: 'line', options: { curve: 'natural', curveSamples: 64 } },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
    { width: 600, height: 360 },
  );
  const points = flattenScene(scene.root)
    .filter((node) => node.type === 'path' && node.id.includes(':line:'))
    .reduce((total, node) => total + node.points.length, 0);
  assert.ok(points <= 2_000, `expected at most 2,000 curve points, received ${points}`);
});

test('many missing-value gaps share one resolved line-point budget', () => {
  const data = Array.from({ length: 6_001 }, (_, x) => ({
    x,
    y: x % 2 === 0 ? Math.sin(x / 17) : null,
  }));
  const { scene } = compile(
    {
      data,
      performance: 'ultra',
      mark: { type: 'line', options: { missing: 'gap', curve: 'natural', curveSamples: 64 } },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
    { width: 600, height: 360 },
  );
  const paths = flattenScene(scene.root).filter(
    (node) => node.type === 'path' && node.id.includes(':line:'),
  );
  const points = paths.reduce((total, node) => total + node.points.length, 0);
  assert.equal(paths.length, 2_000);
  assert.equal(points, 2_000);
});

test('area gap policy creates independent baseline-closed polygons', () => {
  const paths = compiledPaths(
    { type: 'area', options: { missing: 'gap', curve: 'natural', curveSamples: 4 } },
    [
      { x: 0, y: 2 },
      { x: 1, y: 4 },
      { x: 2, y: null },
      { x: 3, y: 3 },
      { x: 4, y: 7 },
    ],
  );
  const fills = paths.filter((node) => node.id.includes('area-fill'));
  const lines = paths.filter((node) => node.id.includes('area-line'));
  assert.equal(fills.length, 2);
  assert.equal(lines.length, 2);
  assert.ok(fills.every((node) => node.closed === true));
  assert.ok(lines.every((node) => node.closed === false));
});

test('stepped and smooth compatibility marks converge on the shared curve engine', () => {
  const stepped = compiledPaths('stepped-area', source).find((node) =>
    node.id.includes('stepped-area-line'),
  );
  const explicitStep = compiledPaths(
    { type: 'area', options: { curve: 'step-after' } },
    source,
  ).find((node) => node.id.includes('area-line'));
  assert.deepEqual(stepped?.points, explicitStep?.points);

  const smooth = compiledPaths('smooth', source, compileComplete).find((node) =>
    node.id.includes('smooth-line'),
  );
  const explicitCardinal = compiledPaths(
    { type: 'line', options: { curve: 'cardinal' } },
    source,
  ).find((node) => node.id.includes(':line:'));
  assert.deepEqual(smooth?.points, explicitCardinal?.points);
});

test('curve options have closed runtime and JSON Schema validation contracts', async () => {
  const base = { data: source, mark: { type: 'line', options: {} }, x: 'x', y: 'y' };
  assert.equal(
    validateSpec({
      ...base,
      mark: {
        type: 'line',
        options: { curve: 'basis', missing: 'zero', tension: 0.4, curveSamples: 12 },
      },
    }).length,
    0,
  );
  for (const [key, value] of [
    ['curve', 'bezier'],
    ['missing', 'drop'],
    ['tension', 2],
    ['curveSamples', 0],
  ]) {
    const issues = validateSpec({
      ...base,
      mark: { type: 'line', options: { [key]: value } },
    });
    assert.ok(
      issues.some((issue) => issue.path === `$.mark.options.${key}`),
      key,
    );
  }

  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(schema.$defs.markObject.properties.options.properties.curve.enum, curveNames);
  assert.deepEqual(schema.$defs.markObject.properties.options.properties.missing.enum, [
    'gap',
    'zero',
    'connect',
  ]);
});
