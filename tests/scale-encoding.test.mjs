import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  colorScaleTypes,
  compile,
  createColorScale,
  createPositionScale,
  positionScaleTypes,
} from '../.tmp/src/index.js';
import { LinearScale } from '../.tmp/src/scale/linear.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const close = (actual, expected, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);

test('position scale registry maps and inverts every continuous mathematical family', () => {
  const cases = [
    ['linear', [1, 100], {}],
    ['log', [1, 100], { base: 10 }],
    ['symlog', [-100, 100], { constant: 2 }],
    ['asinh', [-100, 100], { constant: 2 }],
    ['pow', [-10, 10], { exponent: 3 }],
    ['sqrt', [0, 100], {}],
    ['probability', [0, 1], {}],
    ['logit', [0.01, 0.99], {}],
    ['probit', [0.01, 0.99], {}],
  ];
  for (const [type, domain, options] of cases) {
    const scale = createPositionScale(
      { type, domain, nice: false, ...options },
      { type, domain, range: [20, 420] },
    );
    for (const value of domain) close(scale.invert(scale.map(value)), value, 2e-6);
    assert.equal(scale.descriptor.type, type);
    assert.ok(Object.isFrozen(scale.descriptor));
    assert.ok(Object.isFrozen(scale.descriptor.domain));
    assert.ok(Object.isFrozen(scale.descriptor.range));
  }
  assert.deepEqual(positionScaleTypes, [
    'linear',
    'log',
    'symlog',
    'asinh',
    'pow',
    'sqrt',
    'time',
    'utc',
    'band',
    'point',
    'ordinal',
    'quantile',
    'quantize',
    'threshold',
    'probability',
    'logit',
    'probit',
  ]);
});

test('authored reverse is distinct from a layout-owned descending range', () => {
  const y = new LinearScale({ domain: [0, 10], range: [300, 20], nice: false });
  assert.equal(y.descriptor.reverse, false);
  assert.equal(y.descriptor.rangeDirection, 'descending');
  const reversed = createPositionScale(
    { type: 'linear', reverse: true, nice: false },
    { type: 'linear', domain: [0, 10], range: [300, 20] },
  );
  assert.equal(reversed.descriptor.reverse, true);
  assert.equal(reversed.descriptor.rangeDirection, 'ascending');
  assert.equal(reversed.map(0), 20);

  const direct = new LinearScale({
    domain: [0, 10],
    range: [20, 420],
    nice: false,
    reverse: true,
  });
  assert.equal(direct.descriptor.reverse, true);
  assert.deepEqual(direct.range(), [420, 20]);
  assert.equal(direct.map(0), 420);
});

test('discrete registry implements band, point, ordinal, quantile, quantize, and threshold semantics', () => {
  const band = createPositionScale(
    { type: 'band', reverse: true },
    { type: 'band', domain: ['A', 'B'], range: [0, 100] },
  );
  assert.deepEqual(
    band.ticks(10).map(({ value }) => value),
    ['B', 'A'],
  );
  assert.ok(band.map('A') > band.map('B'));
  assert.equal(band.invert, undefined);

  const point = createPositionScale(
    { type: 'point', reverse: true },
    { type: 'point', domain: ['A', 'B'], range: [0, 100] },
  );
  assert.deepEqual(
    point.ticks(10).map(({ value }) => value),
    ['B', 'A'],
  );
  assert.ok(point.map('A') > point.map('B'));
  assert.equal(point.invert, undefined);

  const ordinal = createPositionScale(
    { type: 'ordinal' },
    { type: 'ordinal', domain: ['A', 'B', 'C'], range: [10, 20] },
  );
  assert.equal(ordinal.map('A'), 10);
  assert.equal(ordinal.map('C'), 10);

  const quantile = createPositionScale(
    { type: 'quantile' },
    { type: 'quantile', domain: [1, 2, 3, 4], range: [10, 20] },
  );
  assert.equal(quantile.map(2), 10);
  assert.equal(quantile.map(3), 20);

  const quantize = createPositionScale(
    { type: 'quantize' },
    { type: 'quantize', domain: [0, 10], range: [10, 20] },
  );
  assert.equal(quantize.map(-1), 10);
  assert.equal(quantize.map(10), 20);

  const threshold = createPositionScale(
    { type: 'threshold' },
    { type: 'threshold', domain: [5], range: [10, 20] },
  );
  assert.equal(threshold.map(4), 10);
  assert.equal(threshold.map(5), 20);
  assert.throws(
    () =>
      createPositionScale(
        { type: 'threshold' },
        { type: 'threshold', domain: [7, 3], range: [10, 20, 30] },
      ),
    /strictly ascending/,
  );
});

test('time and utc scales expose distinct calendar policies', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const domain = [Date.UTC(2026, 0, 1, 1), Date.UTC(2026, 0, 2, 1)];
    const local = createPositionScale(
      { type: 'time', nice: false },
      { type: 'time', domain, range: [0, 100] },
    );
    const utc = createPositionScale(
      { type: 'utc', nice: false },
      { type: 'utc', domain, range: [0, 100] },
    );
    assert.notEqual(local.ticks(2, 'en-US')[0].label, utc.ticks(2, 'en-US')[0].label);
    assert.equal(utc.descriptor.type, 'utc');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('portable temporal encodings default to UTC while explicit time remains local', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const rows = [
      { date: '2026-01-01', value: 1 },
      { date: '2026-01-02', value: 2 },
    ];
    const base = {
      data: rows,
      mark: 'line',
      x: { field: 'date', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
    };
    const portable = compile(base);
    const local = compile({
      ...base,
      x: { ...base.x, scale: { type: 'time' } },
    });

    assert.equal(portable.coordinates.axes.x.kind, 'utc');
    assert.equal(local.coordinates.axes.x.kind, 'time');
    assert.notEqual(
      portable.coordinates.axes.x.ticks(2, 'en-US')[0].label,
      local.coordinates.axes.x.ticks(2, 'en-US')[0].label,
    );
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('scale constraints and out-of-bounds policies fail explicitly', () => {
  assert.throws(
    () => createPositionScale({ type: 'log' }, { type: 'log', domain: [0, 10], range: [0, 1] }),
    /greater than 0/,
  );
  assert.throws(
    () => createPositionScale({ type: 'logit' }, { type: 'logit', domain: [0, 1], range: [0, 1] }),
    /strictly between 0 and 1/,
  );
  const censored = createPositionScale(
    { type: 'linear', outOfBounds: 'unknown', nice: false },
    { type: 'linear', domain: [0, 10], range: [0, 100] },
  );
  assert.ok(Number.isNaN(censored.map(11)));
  const squished = createPositionScale(
    { type: 'linear', outOfBounds: 'clamp', nice: false },
    { type: 'linear', domain: [0, 10], range: [0, 100] },
  );
  assert.equal(squished.map(11), 100);
  assert.throws(
    () =>
      createColorScale(
        { type: 'sequential', outOfBounds: 'extrapolate' },
        { domain: [0, 1], range: ['#000000', '#ffffff'] },
      ),
    /do not extrapolate/,
  );
  assert.throws(
    () =>
      createColorScale(
        { type: 'ordinal', outOfBounds: 'clamp' },
        { domain: ['A'], range: ['#000000'] },
      ),
    /only error or unknown/,
  );
  assert.throws(
    () =>
      createPositionScale(
        { type: 'probability', nice: false },
        { type: 'probability', domain: [0, 1], range: [0, 100] },
      ).map(-0.1),
    /cannot be extrapolated/,
  );
  const clampedProbability = createPositionScale(
    { type: 'probability', outOfBounds: 'clamp', nice: false },
    { type: 'probability', domain: [0, 1], range: [0, 100] },
  );
  assert.equal(clampedProbability.map(-0.1), 0);
});

test('color registry separates ordinal, sequential, diverging, and wrapping cyclic contracts', () => {
  assert.deepEqual(colorScaleTypes, ['ordinal', 'sequential', 'diverging', 'cyclic']);
  const sequential = createColorScale(
    { type: 'sequential' },
    { domain: [0, 10], range: ['#000000', '#ffffff'] },
  );
  assert.equal(sequential.map(-1), '#000000');
  assert.equal(sequential.map(11), '#ffffff');
  const cyclic = createColorScale(
    { type: 'cyclic' },
    { domain: [0, 360], range: ['#ff0000', '#00ff00', '#ff0000'] },
  );
  assert.equal(cyclic.descriptor.outOfBounds, 'wrap');
  assert.equal(cyclic.map(30), cyclic.map(390));
});

test('ordinal registries preserve numeric and string category identity', () => {
  const position = createPositionScale(
    { type: 'ordinal' },
    { type: 'ordinal', domain: [1, '1'], range: [10, 20] },
  );
  assert.equal(position.map(1), 10);
  assert.equal(position.map('1'), 20);

  const color = createColorScale(
    { type: 'ordinal' },
    { domain: [1, '1'], range: ['#111111', '#eeeeee'] },
  );
  assert.equal(color.map(1), '#111111');
  assert.equal(color.map('1'), '#eeeeee');
});

test('canonical encoding map renders conditional point styles and keeps legacy facade stable', () => {
  const data = [
    { category: 'A', value: 2, group: 'g1', priority: 2 },
    { category: 'B', value: 8, group: 'g2', priority: 1 },
  ];
  const canonical = compile({
    data,
    mark: { type: 'point', fill: '#16a34a' },
    encoding: {
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
      fill: {
        value: '#2563eb',
        condition: {
          test: {
            op: 'greaterThan',
            left: { op: 'field', field: 'value' },
            right: { op: 'literal', value: 5 },
          },
          value: '#ef4444',
        },
      },
      radius: { field: 'value', type: 'quantitative', scale: { range: [3, 12] } },
      shape: { field: 'group', type: 'nominal' },
      opacity: { value: 0.7 },
      order: 'priority',
      tooltip: 'group',
    },
  });
  const marks = flattenScene(canonical.scene.root).filter((node) =>
    node.id.startsWith('layer-0:point:'),
  );
  assert.equal(marks.length, 2);
  assert.equal(marks[0].datum.rowIndex, 1);
  assert.equal(marks[0].fill, '#ef4444');
  assert.equal(marks[0].opacity, 0.7);
  assert.equal(marks[0].datum.tooltip.encoded, 'g2');
  assert.ok(marks[0].width / 2 > marks[1].radius);

  const legacy = compile({ data, mark: 'point', x: 'category', y: 'value' });
  assert.equal(
    flattenScene(legacy.scene.root).filter((node) => node.id.startsWith('layer-0:point:')).length,
    2,
  );
});

test('validation rejects mathematically invalid and unimplemented scale/channel combinations', () => {
  const base = {
    data: [
      { x: 1, y: 2, label: 'A' },
      { x: 2, y: 3, label: 'B' },
    ],
    mark: 'point',
  };
  assert.ok(
    validateSpec({
      ...base,
      encoding: {
        x: 'x',
        y: 'y',
        radius: {
          field: 'y',
          type: 'quantitative',
          scale: { type: 'threshold', domain: [7, 3], range: [2, 5, 8] },
        },
      },
    }).some((issue) => issue.path === '$.encoding.radius.scale.domain'),
  );
  assert.ok(
    validateSpec({
      ...base,
      encoding: {
        x: { field: 'x', type: 'quantitative', scale: { type: 'quantile' } },
        y: 'y',
      },
    }).some((issue) => issue.path === '$.encoding.x.scale.type'),
  );
  assert.ok(
    validateSpec({
      ...base,
      encoding: {
        x: 'x',
        y: 'y',
        tooltip: { field: 'label', scale: { type: 'ordinal' } },
      },
    }).some((issue) => issue.path === '$.encoding.tooltip.scale'),
  );
  assert.ok(
    validateSpec({
      ...base,
      mark: 'smooth',
      encoding: { x: 'x', y: 'y', fill: { value: '#2563eb' } },
    }).some((issue) => issue.path === '$.encoding.fill'),
  );
});

test('large canonical encodings stay inside the auto performance profile budget', () => {
  const length = 60_000;
  const data = Array.from({ length }, (_value, index) => ({
    x: index,
    y: Math.sin(index / 100),
    group: index,
    magnitude: index % 100,
  }));
  const result = compile(
    {
      data,
      mark: 'point',
      performance: 'auto',
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
        fill: { field: 'group', type: 'nominal' },
        radius: { field: 'magnitude', type: 'quantitative' },
      },
    },
    { width: 800, height: 400 },
  );
  const points = flattenScene(result.scene.root).filter((node) =>
    node.id.startsWith('layer-0:point:'),
  );
  assert.equal(result.scene.metadata.performanceProfile, 'large');
  assert.ok(points.length <= 20_001);
  assert.ok(points.every((node) => node.interactive !== true));
});

test('range encodings drive bar and heatmap boundaries without silent channel downgrades', () => {
  const bars = compile({
    data: [
      { start: 1, end: 3, low: 2, high: 7 },
      { start: 4, end: 6, low: 1, high: 5 },
    ],
    mark: 'bar',
    encoding: {
      x: { field: 'start', type: 'quantitative' },
      x2: 'end',
      y: { field: 'high', type: 'quantitative' },
      y2: 'low',
      fill: { value: '#0ea5e9' },
    },
  });
  const rects = flattenScene(bars.scene.root).filter((node) => node.id.includes(':bar:'));
  assert.equal(rects.length, 2);
  assert.ok(rects.every((node) => node.width > 0 && node.height > 0));

  const unsupported = validateSpec({
    data: [{ x: 1, y: 2 }],
    mark: 'line',
    encoding: { x: 'x', y: 'y', shape: { value: 'diamond' } },
  });
  assert.ok(unsupported.some((issue) => issue.path === '$.encoding.shape'));
});

test('portable schema exposes the closed scale and encoding registries', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(schema.$defs.scale.properties.type.enum, [
    'linear',
    'log',
    'symlog',
    'asinh',
    'pow',
    'sqrt',
    'time',
    'utc',
    'band',
    'point',
    'ordinal',
    'quantile',
    'quantize',
    'threshold',
    'sequential',
    'diverging',
    'cyclic',
    'probability',
    'logit',
    'probit',
  ]);
  assert.deepEqual(Object.keys(schema.$defs.encodingMap.properties), [
    'x',
    'x2',
    'y',
    'y2',
    'color',
    'fill',
    'stroke',
    'size',
    'radius',
    'shape',
    'opacity',
    'strokeWidth',
    'strokeDash',
    'text',
    'order',
    'detail',
    'tooltip',
  ]);
  assert.equal(schema.$defs.channelEncodingObject.additionalProperties, false);
  assert.ok(schema.$defs.scale.allOf.length >= 10);
  assert.equal(schema.$defs.scale.properties.domain.minItems, 1);
});
