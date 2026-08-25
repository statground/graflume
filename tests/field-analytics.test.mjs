import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeVectorField, contourField } from '../.tmp/src/data/field-analytics.js';
import { compile } from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

test('regular contour fields support explicit and quantile thresholds, isolines, and filled bands', () => {
  const field = {
    width: 3,
    height: 3,
    values: [0, 1, 2, 1, 2, 3, 2, 3, 4],
    x: [10, 20, 40],
    y: [100, 120, 160],
  };
  const explicit = contourField(field, { thresholds: [1, 2, 3], filled: true });
  assert.deepEqual(explicit.thresholds, [1, 2, 3]);
  assert.ok(explicit.isolines.some(({ level, points }) => level === 2 && points.length >= 2));
  assert.ok(explicit.bands.length >= 2);
  assert.ok(
    explicit.bands.every(
      ({ outer, sourceTriangles }) => outer.length >= 4 && sourceTriangles.length > 0,
    ),
  );
  assert.equal(explicit.input, 'regular-grid');

  const quantile = contourField(field, { levels: 2, method: 'quantile', filled: false });
  assert.ok(Math.abs(quantile.thresholds[0] - 5 / 3) < 1e-12);
  assert.ok(Math.abs(quantile.thresholds[1] - 7 / 3) < 1e-12);
  assert.deepEqual(quantile.bands, []);
});

test('regular contour fields keep missing masks out of isoline and polygon provenance', () => {
  const result = contourField(
    {
      width: 4,
      height: 4,
      values: [0, 0, 0, 0, 0, 5, 5, 0, 0, 5, 5, 0, 0, 0, 0, 0],
      mask: [
        true,
        true,
        true,
        true,
        true,
        false,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
      ],
    },
    { thresholds: [2.5], filled: true },
  );
  assert.ok(result.isolines.every(({ sourceRows }) => !sourceRows.includes(0)));
  assert.ok(result.bands.every(({ sourceTriangles }) => !sourceTriangles.includes(0)));
});

test('triangulated irregular samples preserve topology, provenance, and deterministic smoothing', () => {
  const field = {
    points: [
      { x: 0, y: 0, value: 0, source: 10 },
      { x: 2, y: 0, value: 2, source: 11 },
      { x: 2, y: 1, value: 4, source: 12 },
      { x: 0, y: 2, value: 2, source: 13 },
    ],
    triangles: [
      [0, 1, 2],
      [0, 2, 3],
    ],
  };
  const rough = contourField(field, { thresholds: [1, 3], smoothing: 0 });
  const smooth = contourField(field, { thresholds: [1, 3], smoothing: 2 });
  assert.equal(rough.input, 'triangulated-irregular');
  assert.ok(rough.isolines.length >= 2);
  assert.ok(
    smooth.isolines.reduce((count, line) => count + line.points.length, 0) >
      rough.isolines.reduce((count, line) => count + line.points.length, 0),
  );
  assert.deepEqual(smooth, contourField(field, { thresholds: [1, 3], smoothing: 2 }));
  assert.ok(
    rough.isolines.every(({ sourceRows }) => sourceRows.every((row) => row === 0 || row === 1)),
  );
});

test('ambiguous regular saddles expose deterministic high, low, and asymptotic topology policies', () => {
  const field = { width: 2, height: 2, values: [1, 0, 0, 1] };
  const high = contourField(field, { thresholds: [0.5], filled: false, saddle: 'high' });
  const low = contourField(field, { thresholds: [0.5], filled: false, saddle: 'low' });
  const asymptotic = contourField(field, {
    thresholds: [0.5],
    filled: false,
    saddle: 'asymptotic',
  });
  assert.equal(high.isolines.length, 2);
  assert.equal(low.isolines.length, 2);
  assert.notDeepEqual(high.isolines, low.isolines);
  assert.deepEqual(asymptotic.isolines, high.isolines);
});

test('vector fields expose magnitude, direction, normalization, and bounded grid sampling', () => {
  const data = [
    { id: 'a', x: 0, y: 0, u: 3, v: 4 },
    { id: 'b', x: 10, y: 0, u: 0, v: 2 },
    { id: 'c', x: 0, y: 10, u: -1, v: 0 },
    { id: 'd', x: 10, y: 10, u: 0, v: -4 },
  ];
  const unit = analyzeVectorField(data, {
    normalize: 'unit',
    sample: { columns: 2, rows: 2 },
    seeds: [],
  });
  assert.equal(unit.vectors.length, 4);
  const a = unit.vectors.find(({ id }) => id === 'a');
  assert.equal(a.magnitude, 5);
  assert.ok(Math.abs(a.u - 0.6) < 1e-12 && Math.abs(a.v - 0.8) < 1e-12);
  assert.ok(Math.abs(a.direction - Math.atan2(4, 3)) < 1e-12);
  assert.deepEqual(unit.bounds, [0, 0, 10, 10]);

  const maximum = analyzeVectorField(data, {
    normalize: 'maximum',
    sample: { columns: 1, rows: 1 },
    seeds: [],
  });
  assert.equal(maximum.vectors.length, 1);
  assert.ok(Math.abs(maximum.vectors[0].u) <= 1 && Math.abs(maximum.vectors[0].v) <= 1);
});

test('adaptive vector integration is seeded, deterministic, directional, and step bounded', () => {
  const data = [];
  for (let y = 0; y <= 4; y += 1) {
    for (let x = 0; x <= 4; x += 1) data.push({ x, y, u: 1, v: 0 });
  }
  const options = {
    seeds: [[2, 2]],
    direction: 'both',
    step: 0.4,
    tolerance: 1e-6,
    maximumSteps: 20,
  };
  const result = analyzeVectorField(data, options);
  assert.equal(result.streamlines.length, 1);
  assert.ok(result.streamlines[0].points.some(({ x }) => x < 2));
  assert.ok(result.streamlines[0].points.some(({ x }) => x > 2));
  assert.ok(result.streamlines[0].points.length <= 41);
  assert.ok(result.streamlines[0].points.every(({ y }) => Math.abs(y - 2) < 1e-12));
  assert.deepEqual(result, analyzeVectorField(data, options));
});

test('field validation rejects degenerate triangles and mismatched regular dimensions', () => {
  assert.throws(() => contourField({ width: 2, height: 2, values: [0, 1, 2] }), /width\*height/);
  assert.throws(
    () =>
      contourField({
        points: [
          { x: 0, y: 0, value: 0 },
          { x: 1, y: 1, value: 1 },
          { x: 2, y: 2, value: 2 },
        ],
        triangles: [[0, 1, 2]],
      }),
    /degenerate/,
  );
});

test('complete compiler renders regular filled contour bands, isolines, and portable hole topology', () => {
  const data = [];
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      data.push({ x, y, value: (x - 4) ** 2 + (y - 4) ** 2 });
    }
  }
  const topology = contourField(
    { width: 9, height: 9, values: data.map(({ value }) => value) },
    { thresholds: [4, 12], filled: true, smoothing: 1 },
  );
  const annulus = topology.bands.find(({ low, high }) => low === 4 && high === 12);
  assert.equal(annulus.holes.length, 1);
  assert.deepEqual(annulus.outer[0], annulus.outer.at(-1));
  assert.deepEqual(annulus.holes[0][0], annulus.holes[0].at(-1));
  const { scene } = compile({
    width: 600,
    height: 400,
    data,
    mark: {
      type: 'contour',
      fields: { value: 'value' },
      options: {
        thresholds: [4, 12],
        filled: true,
        smoothing: 1,
        saddle: 'asymptotic',
      },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  assert.ok(nodes.some(({ id }) => id.includes(':contour-band:')));
  assert.ok(nodes.some(({ id }) => id.includes(':contour-line:')));
  assert.ok(
    nodes
      .filter(({ id }) => id.includes(':contour-band:'))
      .every(({ type, fillRule }) => type === 'path' && fillRule === 'evenodd'),
  );
  const renderedAnnulus = nodes.find(
    ({ id, datum }) => id.includes(':contour-band:') && datum?.tooltip?.holes === 1,
  );
  assert.equal(renderedAnnulus.fillRule, 'evenodd');
  assert.equal(renderedAnnulus.subpaths.length, 1);
  assert.ok(renderedAnnulus.subpaths[0].length >= 4);
  assert.deepEqual(renderedAnnulus.subpaths[0][0], renderedAnnulus.subpaths[0].at(-1));
});

test('complete compiler renders triangulated irregular contour input from portable triangle options', () => {
  const { scene } = compile({
    data: [
      { x: 0, y: 0, value: 0 },
      { x: 3, y: 0, value: 2 },
      { x: 2, y: 2, value: 4 },
      { x: 0, y: 3, value: 2 },
    ],
    mark: {
      type: 'contour',
      fields: { value: 'value' },
      options: {
        triangles: [
          [0, 1, 2],
          [0, 2, 3],
        ],
        thresholds: [1, 3],
      },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  const tooltip = flattenScene(scene.root).find(({ datum }) => datum?.tooltip?.input)?.datum
    ?.tooltip;
  assert.equal(tooltip.input, 'triangulated-irregular');
});

test('complete compiler renders normalized sampled vectors and seeded adaptive streamlines', () => {
  const data = [];
  for (let y = 0; y <= 4; y += 1) {
    for (let x = 0; x <= 4; x += 1) data.push({ x, y, u: 1, v: 0 });
  }
  const { scene } = compile({
    width: 600,
    height: 400,
    data,
    mark: {
      type: 'vector',
      fields: { u: 'u', v: 'v' },
      options: {
        normalize: 'unit',
        sampleColumns: 3,
        sampleRows: 3,
        seeds: [[2, 2]],
        streamlineDirection: 'both',
        streamlineStep: 0.4,
      },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  assert.equal(nodes.filter(({ id }) => id.includes(':vector:')).length, 9);
  assert.equal(nodes.filter(({ id }) => id.includes(':streamline:')).length, 1);
  const tooltip = nodes.find(({ id }) => id.includes(':vector:'))?.datum?.tooltip;
  assert.equal(tooltip.magnitude, 1);
  assert.equal(tooltip.directionRadians, 0);
});

test('vector compiler applies none, unit, and maximum normalization to rendered arrow lengths', () => {
  const lengths = (normalize) => {
    const { scene } = compile({
      width: 600,
      height: 400,
      data: [
        { id: 'small', x: 0, y: 0, u: 1, v: 0 },
        { id: 'large', x: 10, y: 0, u: 10, v: 0 },
      ],
      mark: {
        type: 'vector',
        fields: { u: 'u', v: 'v' },
        options: { normalize, sampleColumns: 2, sampleRows: 1, seeds: [] },
      },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    });
    return flattenScene(scene.root)
      .filter(({ type, id }) => type === 'line' && id.includes(':vector:'))
      .map(({ x1, y1, x2, y2, datum }) => ({
        id: datum.tooltip.id,
        length: Math.hypot(x2 - x1, y2 - y1),
        normalization: datum.tooltip.normalization,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  };
  const none = lengths('none');
  const unit = lengths('unit');
  const maximum = lengths('maximum');
  assert.ok(none[0].length > none[1].length);
  assert.equal(unit[0].length, unit[1].length);
  assert.ok(maximum[0].length > maximum[1].length);
  assert.notDeepEqual(
    none.map(({ length }) => length),
    maximum.map(({ length }) => length),
  );
  assert.ok(unit.every(({ normalization }) => normalization === 'unit'));
});
