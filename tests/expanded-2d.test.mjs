import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import * as Graflume from '../.tmp/src/complete.js';
import { summarizeNormalDistribution } from '../.tmp/src/data/distribution.js';
import { exactStrideSampleIndices } from '../.tmp/src/data/sample.js';
import { LinearScale } from '../.tmp/src/scale/linear.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const compileNodes = (spec) =>
  flattenScene(Graflume.compile(spec, { width: 680, height: 440 }).scene.root);

const compileNodesAt = (spec, width, height) =>
  flattenScene(Graflume.compile(spec, { width, height }).scene.root);

test('the consolidated catalog exposes 41 canonical families with compatibility modes', () => {
  assert.equal(Graflume.fullCatalog.length, 41);
  assert.equal(new Set(Graflume.fullCatalog.map(({ id }) => id)).size, 41);
  assert.ok(Graflume.fullCatalog.some(({ id }) => id === 'distribution'));
  assert.ok(Graflume.fullCatalog.some(({ id }) => id === 'polar'));
  assert.ok(!Graflume.fullCatalog.some(({ id }) => id === 'histogram'));
  assert.ok(!Graflume.fullCatalog.some(({ id }) => id === 'boxplot'));
  assert.ok(!Graflume.fullCatalog.some(({ id }) => id === 'radar'));
  const variants = new Map(Graflume.fullVariantCatalog.map((entry) => [entry.id, entry]));
  assert.deepEqual(
    ['histogram', 'boxplot', 'violin'].map((id) => variants.get(id)?.familyId),
    ['distribution', 'distribution', 'distribution'],
  );
  assert.equal(variants.get('radar')?.familyId, 'polar');
  assert.equal(variants.get('distribution')?.mode, 'histogram');
  assert.deepEqual(
    [
      'icicle',
      'funnel-area',
      'parallel-categories',
      'gauge-number',
      'gauge-delta',
      'gauge-bullet',
    ].map((id) => [variants.get(id)?.familyId, variants.get(id)?.mode]),
    [
      ['hierarchy', 'icicle'],
      ['funnel', 'area'],
      ['parallel', 'categories'],
      ['gauge', 'number'],
      ['gauge', 'delta'],
      ['gauge', 'bullet'],
    ],
  );
  for (const id of ['image', 'ternary', 'smith', 'scatter-matrix', 'carpet']) {
    assert.ok(
      Graflume.fullCatalog.some((entry) => entry.id === id),
      id,
    );
  }
});

test('the bellCurve compatibility helper selects the density curve mode', async () => {
  const completeSource = await readFile(new URL('../src/complete.ts', import.meta.url), 'utf8');
  assert.match(
    completeSource,
    /export const bellCurve = makeSeriesQuick\('distribution', \{ options: \{ mode: 'curve' \} \}\);/,
  );

  const nodes = compileNodes({
    data: [{ value: 1 }, { value: 2 }, { value: 3 }],
    mark: { type: 'distribution', options: { mode: 'curve' } },
    x: { field: 'value', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  });
  assert.ok(nodes.some((node) => node.id.includes(':distribution-line')));
  assert.ok(!nodes.some((node) => node.id.includes(':histogram:')));
});

test('distribution defaults and aliases share histogram domains while curves share derived axes', () => {
  const samples = [12, 15, 18, 22, 25, 27].map((value) => ({ value }));
  for (const mode of [undefined, 'distribution', 'unknown-compatibility-label']) {
    const nodes = compileNodes({
      data: samples,
      mark: {
        type: 'distribution',
        ...(mode === undefined ? {} : { options: { mode } }),
      },
      x: { field: 'value', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    });
    const bins = nodes.filter((node) => node.type === 'rect' && node.id.includes(':bin:'));
    assert.ok(bins.length > 0, mode ?? 'omitted');
    assert.ok(
      bins.every(
        (node) =>
          [node.x, node.y, node.width, node.height].every(Number.isFinite) &&
          node.x >= 0 &&
          node.y >= 0 &&
          node.x + node.width <= 680 &&
          node.y + node.height <= 440,
      ),
      mode ?? 'omitted',
    );
  }

  const curveSpec = {
    data: samples,
    mark: {
      type: 'distribution',
      fields: { value: 'value' },
      options: { mode: 'curve', samples: 72 },
    },
    x: { field: 'value', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  };
  const nodes = compileNodes(curveSpec);
  const line = nodes.find((node) => node.type === 'path' && node.id.includes(':distribution-line'));
  const xAxis = nodes.find((node) => node.type === 'line' && node.id === 'axis-x:line');
  const yAxis = nodes.find((node) => node.type === 'line' && node.id === 'axis-y:line');
  const summary = summarizeNormalDistribution(samples.map(({ value }) => value));
  assert.ok(line && xAxis && yAxis && summary);
  const xScale = new LinearScale({
    domain: [summary.domainMinimum, summary.domainMaximum],
    range: [xAxis.x1, xAxis.x2],
  });
  const yScale = new LinearScale({
    domain: [0, summary.maximumDensity],
    range: [yAxis.y2, yAxis.y1],
  });
  assert.ok(Math.abs(line.points[0].x - xScale.map(summary.domainMinimum)) < 1e-6);
  assert.ok(Math.abs(line.points.at(-1).x - xScale.map(summary.domainMaximum)) < 1e-6);
  assert.ok(
    Math.abs(
      line.points[Math.floor(line.points.length / 2)].y - yScale.map(summary.maximumDensity),
    ) < 1e-6,
  );
});

test('the exact stride sampler never exceeds its deterministic endpoint-preserving budget', () => {
  assert.deepEqual(exactStrideSampleIndices(10, 4), [0, 3, 6, 9]);
  assert.deepEqual(exactStrideSampleIndices(24, 1), [11]);
  assert.equal(exactStrideSampleIndices(1_000, 143).length, 143);
  assert.deepEqual(exactStrideSampleIndices(1_000, 143), exactStrideSampleIndices(1_000, 143));
});

test('image rows compile to interactive RGB raster cells', () => {
  const nodes = compileNodes({
    data: [
      { x: 'A', y: '1', red: 255, green: 0, blue: 0 },
      { x: 'B', y: '1', red: 0, green: 128, blue: 255 },
      { x: 'A', y: '2', red: 20, green: 200, blue: 80 },
      { x: 'B', y: '2', red: 240, green: 180, blue: 20 },
    ],
    mark: 'image',
    x: { field: 'x', type: 'ordinal' },
    y: { field: 'y', type: 'ordinal' },
  });
  const pixels = nodes.filter((node) => node.type === 'rect' && node.id.includes(':image:'));
  assert.equal(pixels.length, 4);
  assert.ok(pixels.every((node) => node.interactive === true));
  assert.match(pixels[0].fill, /^rgba\(/);
});

test('distribution family renders violin, bivariate cells, and bivariate isolines', () => {
  const sample = [
    { group: 'A', value: 2, other: 7 },
    { group: 'A', value: 3, other: 6 },
    { group: 'A', value: 5, other: 8 },
    { group: 'B', value: 6, other: 3 },
    { group: 'B', value: 8, other: 4 },
    { group: 'B', value: 9, other: 2 },
  ];
  const violin = compileNodes({
    data: sample,
    mark: {
      type: 'distribution',
      fields: { group: 'group', value: 'value' },
      options: { mode: 'violin' },
    },
    x: { field: 'group', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  });
  assert.equal(
    violin.filter((node) => node.type === 'path' && node.id.includes(':violin:')).length,
    2,
  );

  const evenViolin = compileNodes({
    data: [
      { group: 'A', value: 2 },
      { group: 'A', value: 4 },
      { group: 'A', value: 8 },
      { group: 'A', value: 10 },
    ],
    mark: {
      type: 'distribution',
      fields: { group: 'group', value: 'value' },
      options: { mode: 'violin' },
    },
    x: { field: 'group', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const evenViolinBody = evenViolin.find(
    (node) => node.type === 'path' && node.id.includes(':violin:'),
  );
  assert.equal(evenViolinBody?.datum?.tooltip?.median, 6);

  const bivariate = sample.map(({ value, other }) => ({ value, other }));
  const heat = compileNodes({
    data: bivariate,
    mark: { type: 'distribution', options: { mode: 'histogram-2d', binsX: 3, binsY: 3 } },
    x: { field: 'value', type: 'quantitative' },
    y: { field: 'other', type: 'quantitative' },
  });
  assert.ok(heat.some((node) => node.type === 'rect' && node.id.includes(':histogram-2d:')));

  const contourData = Array.from({ length: 49 }, (_, index) => ({
    x: index % 7,
    y: Math.floor(index / 7),
  })).flatMap((point) => Array.from({ length: 1 + ((point.x + point.y) % 4) }, () => point));
  const contour = compileNodes({
    data: contourData,
    mark: {
      type: 'distribution',
      options: { mode: 'histogram-2d-contour', binsX: 7, binsY: 7, levels: 4 },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  assert.ok(
    contour.some((node) => node.type === 'path' && node.id.includes(':histogram-2d-contour:')),
  );
  assert.ok(!contour.some((node) => node.type === 'rect' && node.id.includes(':histogram-2d:')));

  const sparseContour = compileNodes({
    data: [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: 6 },
      { x: 6, y: 6 },
      ...Array.from({ length: 24 }, () => ({ x: 3, y: 3 })),
    ],
    mark: {
      type: 'distribution',
      options: { mode: 'histogram-2d-contour', binsX: 7, binsY: 7, levels: 4 },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  assert.ok(
    sparseContour.some(
      (node) => node.type === 'path' && node.id.includes(':histogram-2d-contour:'),
    ),
    'zero-density bin centers preserve isolines around sparse peaks',
  );
  const densityIsoline = sparseContour.find(
    (node) => node.type === 'path' && node.id.includes(':histogram-2d-contour:'),
  );
  assert.equal(densityIsoline?.interactive, true);
  assert.equal(densityIsoline?.datum?.tooltip?.kind, 'density-isoline');
  assert.equal(typeof densityIsoline?.datum?.tooltip?.level, 'number');
  assert.equal(densityIsoline?.datum?.tooltip?.maximumCount, 24);

  const curve = compileNodes({
    data: sample,
    mark: {
      type: 'distribution',
      fields: { value: 'value' },
      options: { mode: 'curve' },
    },
    x: { field: 'value', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  });
  const curveArea = curve.find(
    (node) => node.type === 'path' && node.id.includes(':distribution-area'),
  );
  assert.equal(curveArea?.interactive, true);
  assert.equal(curveArea?.datum?.tooltip?.kind, 'normal-density');
  assert.equal(curveArea?.datum?.tooltip?.sampleCount, sample.length);
  assert.equal(typeof curveArea?.datum?.tooltip?.mean, 'number');
  assert.equal(typeof curveArea?.datum?.tooltip?.standardDeviation, 'number');
  const curveLine = curve.find(
    (node) => node.type === 'path' && node.id.includes(':distribution-line'),
  );
  assert.equal(curveLine?.interactive, true);
  assert.deepEqual(curveLine?.datum?.tooltip, curveArea?.datum?.tooltip);
});

test('violin KDE bounds a large deterministic density source while keeping exact summaries', () => {
  const length = 500_000;
  const groups = Array(length).fill('A');
  const values = Float64Array.from({ length }, (_, index) => index % 101);
  const spec = {
    data: { columns: { group: groups, value: values }, length },
    performance: 'ultra',
    mark: {
      type: 'distribution',
      fields: { group: 'group', value: 'value' },
      options: { mode: 'violin', samples: 160 },
    },
    x: { field: 'group', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  };
  const first = compileNodes(spec);
  const second = compileNodes(spec);
  const firstBody = first.find((node) => node.type === 'path' && node.id.includes(':violin:'));
  const secondBody = second.find((node) => node.type === 'path' && node.id.includes(':violin:'));
  assert.ok(firstBody && secondBody);
  assert.equal(firstBody.points.length, 322);
  assert.deepEqual(firstBody.points, secondBody.points);
  assert.deepEqual(firstBody.datum.tooltip, secondBody.datum.tooltip);
  assert.equal(firstBody.datum.tooltip.count, length);
  assert.equal(firstBody.datum.tooltip.minimum, 0);
  assert.equal(firstBody.datum.tooltip.maximum, 100);
  assert.equal(firstBody.datum.tooltip.median, 50);
  assert.ok(Math.abs(firstBody.datum.tooltip.mean - 49.99745) < 1e-9);
  assert.equal(firstBody.datum.tooltip.densitySampleCount, 8_000);
});

test('bivariate histogram grids and contour segments obey ultra output budgets', () => {
  const data = Array.from({ length: 80 * 80 }, (_, index) => ({
    x: index % 80,
    y: Math.floor(index / 80),
  })).flatMap((point, index) => Array.from({ length: 1 + (index % 4) }, () => point));
  const spec = (mode) => ({
    data,
    performance: 'ultra',
    mark: {
      type: 'distribution',
      options: { mode, binsX: 80, binsY: 80, levels: 16, empty: true },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  const heat = compileNodes(spec('histogram-2d'));
  assert.ok(
    heat.filter((node) => node.type === 'rect' && node.id.includes(':histogram-2d:')).length <=
      5_000,
  );
  const contour = compileNodes(spec('histogram-2d-contour'));
  assert.ok(
    contour
      .filter((node) => node.type === 'path' && node.id.includes(':histogram-2d-contour:'))
      .reduce((total, node) => total + node.points.length, 0) <= 2_000,
  );
});

test('polar, ternary, Smith, and scatter matrix use distinct Scene grammars', () => {
  const polar = compileNodes({
    data: [
      { angle: 0, value: 4 },
      { angle: 90, value: 8 },
      { angle: 180, value: 5 },
    ],
    mark: { type: 'polar', options: { mode: 'bar' } },
    x: { field: 'angle', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  });
  const hugePolarBar = compileNodes({
    data: [{ angle: 0, value: 10 }],
    performance: 'ultra',
    mark: { type: 'polar', options: { mode: 'bar', barAngle: 1e9 } },
    x: { field: 'angle', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  });
  const hugeWedge = hugePolarBar.find(
    (node) => node.type === 'path' && node.id.includes(':polar-bar:'),
  );
  assert.ok(hugeWedge);
  assert.ok(hugeWedge.points.length <= 74);
  assert.equal(
    polar.filter((node) => node.type === 'path' && node.id.includes(':polar-bar:')).length,
    3,
  );

  const ternary = compileNodes({
    data: [
      { a: 60, b: 30, c: 10 },
      { a: 20, b: 50, c: 30 },
    ],
    mark: { type: 'ternary', fields: { c: 'c' } },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  assert.ok(ternary.some((node) => node.type === 'path' && node.id.includes(':ternary-frame')));
  assert.equal(
    ternary.filter((node) => node.type === 'circle' && node.id.includes(':ternary-point:')).length,
    2,
  );

  const smith = compileNodes({
    data: [
      { real: 0.2, imaginary: -1 },
      { real: 1, imaginary: 0 },
      { real: 2, imaginary: 1 },
    ],
    mark: 'smith',
    x: { field: 'real', type: 'quantitative' },
    y: { field: 'imaginary', type: 'quantitative' },
  });
  assert.ok(smith.some((node) => node.type === 'path' && node.id.includes(':smith-resistance:')));
  assert.equal(
    smith.filter((node) => node.type === 'circle' && node.id.includes(':smith-point:')).length,
    3,
  );

  const matrix = compileNodes({
    data: [
      { a: 1, b: 5, c: 3 },
      { a: 2, b: 3, c: 7 },
      { a: 4, b: 7, c: 2 },
    ],
    mark: { type: 'scatter-matrix', options: { dimensions: ['a', 'b', 'c'] } },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  assert.equal(
    matrix.filter((node) => node.type === 'rect' && node.id.includes(':matrix-cell:')).length,
    9,
  );
  assert.ok(matrix.some((node) => node.type === 'circle' && node.id.includes(':matrix-point:')));
});

test('scatter-matrix applies the point budget across the complete matrix', () => {
  const data = Array.from({ length: 1_000 }, (_, row) =>
    Object.fromEntries(Array.from({ length: 8 }, (_, column) => [`d${column}`, row + column * 3])),
  );
  const spec = {
    data,
    performance: 'ultra',
    mark: {
      type: 'scatter-matrix',
      options: { dimensions: Array.from({ length: 8 }, (_, index) => `d${index}`) },
    },
    x: { field: 'd0', type: 'quantitative' },
    y: { field: 'd1', type: 'quantitative' },
  };
  const first = compileNodes(spec).filter(
    (node) => node.type === 'circle' && node.id.includes(':matrix-point:'),
  );
  const second = compileNodes(spec).filter(
    (node) => node.type === 'circle' && node.id.includes(':matrix-point:'),
  );
  assert.equal(first.length, 8_000);
  assert.deepEqual(
    first.map(({ id }) => id),
    second.map(({ id }) => id),
  );
  assert.ok(first.every(({ datum }) => Number.isInteger(datum?.rowIndex)));
});

test('carpet scatter and contour overlays share the warped coordinate grid', () => {
  const data = [
    { a: '0', b: '0', px: 0, py: 0, value: 1 },
    { a: '1', b: '0', px: 1.2, py: 0.1, value: 4 },
    { a: '2', b: '0', px: 2.3, py: 0.3, value: 2 },
    { a: '0', b: '1', px: 0.1, py: 1.1, value: 3 },
    { a: '1', b: '1', px: 1.4, py: 1.3, value: 8 },
    { a: '2', b: '1', px: 2.5, py: 1.5, value: 5 },
    { a: '0', b: '2', px: 0.3, py: 2.2, value: 2 },
    { a: '1', b: '2', px: 1.6, py: 2.5, value: 6 },
    { a: '2', b: '2', px: 2.7, py: 2.8, value: 9 },
  ];
  const base = (mode) => ({
    data,
    mark: {
      type: 'carpet',
      fields: { x: 'px', y: 'py', value: 'value' },
      options: { mode, levels: 3 },
    },
    x: { field: 'a', type: 'ordinal' },
    y: { field: 'b', type: 'ordinal' },
  });
  const scatter = compileNodes(base('scatter'));
  const carpetGrid = scatter.find(
    (node) => node.type === 'path' && node.id.includes(':carpet-grid:'),
  );
  assert.ok(carpetGrid);
  assert.equal(carpetGrid.interactive, true);
  assert.equal(carpetGrid.datum?.tooltip?.kind, 'carpet-axis');
  assert.equal(typeof carpetGrid.datum?.tooltip?.axis, 'string');
  assert.equal(typeof carpetGrid.datum?.tooltip?.key, 'string');
  assert.equal(
    scatter.filter((node) => node.type === 'circle' && node.id.includes(':carpet-point:')).length,
    9,
  );
  const contour = compileNodes(base('contour'));
  const carpetIsoline = contour.find(
    (node) => node.type === 'path' && node.id.includes(':carpet-contour:'),
  );
  assert.ok(carpetIsoline);
  assert.equal(carpetIsoline.interactive, true);
  assert.equal(carpetIsoline.datum?.tooltip?.kind, 'value-isoline');
  assert.equal(typeof carpetIsoline.datum?.tooltip?.level, 'number');
  assert.equal(carpetIsoline.datum?.tooltip?.minimumValue, 1);
  assert.equal(carpetIsoline.datum?.tooltip?.maximumValue, 9);
  assert.ok(
    !contour.some((node) => node.type === 'circle' && node.id.includes(':carpet-contour:')),
  );
});

test('carpet compiles 140k rows with indexed groups and bounded scatter and contour output', () => {
  const columns = 400;
  const rows = 350;
  const data = Array.from({ length: columns * rows }, (_, index) => {
    const a = index % columns;
    const b = Math.floor(index / columns);
    return {
      a: String(a),
      b: String(b),
      px: a + Math.sin(b / 19) * 0.25,
      py: b + Math.cos(a / 23) * 0.25,
      value: Math.sin(a / 21) + Math.cos(b / 17),
    };
  });
  const spec = (mode) => ({
    data,
    performance: 'ultra',
    mark: {
      type: 'carpet',
      fields: { x: 'px', y: 'py', value: 'value' },
      options: { mode, levels: 16 },
    },
    x: { field: 'a', type: 'ordinal' },
    y: { field: 'b', type: 'ordinal' },
  });
  const scatter = compileNodes(spec('scatter'));
  assert.equal(
    scatter.filter((node) => node.type === 'circle' && node.id.includes(':carpet-point:')).length,
    8_000,
  );
  assert.ok(
    scatter
      .filter((node) => node.type === 'path' && node.id.includes(':carpet-grid:'))
      .reduce((total, node) => total + node.points.length, 0) <= 2_000,
  );
  const contour = compileNodes(spec('contour'));
  const boundedPaths = contour.filter(
    (node) =>
      node.type === 'path' &&
      (node.id.includes(':carpet-grid:') || node.id.includes(':carpet-contour:')),
  );
  assert.ok(boundedPaths.reduce((total, node) => total + node.points.length, 0) <= 2_000);
  const isoline = boundedPaths.find((node) => node.id.includes(':carpet-contour:'));
  assert.ok(isoline);
  assert.ok(isoline.datum.tooltip.minimumValue < -1.9);
  assert.ok(isoline.datum.tooltip.maximumValue > 1.9);
});

test('row-proportional analytical compilers obey ultra budgets and tall ternary stays upright', () => {
  const imageNodes = compileNodes({
    data: Array.from({ length: 20_000 }, (_, index) => ({
      x: index % 200,
      y: Math.floor(index / 200),
      red: index % 256,
      green: (index * 3) % 256,
      blue: (index * 7) % 256,
    })),
    performance: 'ultra',
    mark: 'image',
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  assert.equal(
    imageNodes.filter((node) => node.type === 'rect' && node.id.includes(':image:')).length,
    5_000,
  );

  const groups = Array.from({ length: 1_000 }, (_, index) => ({
    group: `G${index}`,
    value: index % 17,
  }));
  const violin = compileNodes({
    data: groups,
    performance: 'ultra',
    mark: {
      type: 'distribution',
      fields: { group: 'group', value: 'value' },
      options: { mode: 'violin', samples: 160 },
    },
    x: { field: 'group', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const violinBodies = violin.filter(
    (node) => node.type === 'path' && node.id.includes(':violin:'),
  );
  assert.ok(violinBodies.reduce((total, node) => total + node.points.length, 0) <= 2_000);

  const multiSeries = Array.from({ length: 10_000 }, (_, index) => ({
    angle: index % 360,
    value: 1 + (index % 80),
    series: `S${index % 100}`,
    a: 1 + (index % 7),
    b: 1 + (index % 11),
    c: 1 + (index % 13),
    real: (index % 300) / 100,
    imaginary: ((index % 200) - 100) / 80,
  }));
  const polar = compileNodes({
    data: multiSeries,
    performance: 'ultra',
    mark: { type: 'polar', fields: { series: 'series' }, options: { mode: 'line' } },
    x: { field: 'angle', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  });
  const ternary = compileNodes({
    data: multiSeries,
    performance: 'ultra',
    mark: {
      type: 'ternary',
      fields: { c: 'c', series: 'series' },
      options: { mode: 'line' },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  const smith = compileNodes({
    data: multiSeries,
    performance: 'ultra',
    mark: { type: 'smith', fields: { series: 'series' }, options: { mode: 'line' } },
    x: { field: 'real', type: 'quantitative' },
    y: { field: 'imaginary', type: 'quantitative' },
  });
  for (const [nodes, pointId, lineId] of [
    [polar, ':polar-point:', ':polar-line:'],
    [ternary, ':ternary-point:', ':ternary-line:'],
    [smith, ':smith-point:', ':smith-line:'],
  ]) {
    assert.ok(
      nodes.filter((node) => node.type === 'circle' && node.id.includes(pointId)).length <= 2_000,
    );
    assert.ok(
      nodes
        .filter((node) => node.type === 'path' && node.id.includes(lineId))
        .reduce((total, node) => total + node.points.length, 0) <= 2_000,
    );
  }

  const tall = compileNodesAt(
    {
      data: [{ a: 60, b: 30, c: 10 }],
      mark: { type: 'ternary', fields: { c: 'c' } },
      x: { field: 'a', type: 'quantitative' },
      y: { field: 'b', type: 'quantitative' },
    },
    200,
    800,
  );
  const frame = tall.find((node) => node.type === 'path' && node.id.includes(':ternary-frame'));
  assert.ok(frame);
  assert.ok(frame.points[0].y > frame.points[2].y);
  assert.equal(frame.points[0].y, frame.points[1].y);
});

test('integrated hierarchy, funnel, parallel, and gauge modes compile distinct marks', () => {
  const icicle = compileNodes({
    data: [
      { name: 'All', parent: '', value: 12 },
      { name: 'A', parent: 'All', value: 7 },
      { name: 'B', parent: 'All', value: 5 },
      { name: 'A1', parent: 'A', value: 4 },
    ],
    mark: { type: 'treemap', fields: { parent: 'parent' }, options: { mode: 'icicle' } },
    x: { field: 'name', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  });
  assert.equal(
    icicle.filter((node) => node.type === 'rect' && node.id.includes(':icicle:')).length,
    4,
  );

  const funnelArea = compileNodes({
    data: [
      { stage: 'Visit', value: 100 },
      { stage: 'Trial', value: 49 },
      { stage: 'Paid', value: 16 },
    ],
    mark: { type: 'funnel', options: { mode: 'area' } },
    x: { field: 'stage', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  });
  assert.equal(
    funnelArea.filter((node) => node.type === 'path' && node.id.includes(':funnel-area:')).length,
    3,
  );

  const parallelCategories = compileNodes({
    data: [
      { region: 'East', channel: 'Web', outcome: 'Won', value: 1 },
      { region: 'East', channel: 'Web', outcome: 'Won', value: 1 },
      { region: 'West', channel: 'Store', outcome: 'Lost', value: 1 },
    ],
    mark: {
      type: 'parallel',
      options: { mode: 'categories', dimensions: ['region', 'channel', 'outcome'] },
    },
    x: { field: 'region', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  });
  assert.ok(
    parallelCategories.some(
      (node) => node.type === 'path' && node.closed && node.id.includes(':parallel-ribbon:'),
    ),
  );
  const crowdedParallel = compileNodes({
    data: Array.from({ length: 180 }, (_, index) => ({
      first: `A${index}`,
      second: `B${index % 5}`,
      value: 1,
    })),
    mark: {
      type: 'parallel',
      options: { mode: 'categories', dimensions: ['first', 'second'] },
    },
    x: { field: 'first', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const categoryRects = crowdedParallel.filter(
    (node) => node.type === 'rect' && node.id.includes(':parallel-category:'),
  );
  assert.ok(categoryRects.length > 180);
  assert.ok(categoryRects.every((node) => node.y >= 0 && node.y + node.height <= 440));

  const gaugeData = [{ label: 'Revenue', value: 72, reference: 64, target: 85 }];
  const gaugeSpec = (mode) => ({
    data: gaugeData,
    mark: {
      type: 'gauge',
      fields: { reference: 'reference', target: 'target' },
      options: { mode },
    },
    x: { field: 'label', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const number = compileNodes(gaugeSpec('number'));
  const delta = compileNodes(gaugeSpec('delta'));
  const bullet = compileNodes(gaugeSpec('bullet'));
  assert.ok(number.some((node) => node.type === 'rect' && node.id.includes(':gauge-number:')));
  assert.ok(delta.some((node) => node.type === 'text' && node.id.includes(':gauge-delta-value:')));
  assert.ok(
    bullet.some((node) => node.type === 'line' && node.id.includes(':gauge-bullet-target:')),
  );
});

test('new Quick APIs are exported without removing compatibility calls', () => {
  for (const name of [
    'distribution',
    'histogram',
    'boxplot',
    'violin',
    'histogram2d',
    'histogram2dContour',
    'polar',
    'radar',
    'polarLine',
    'polarScatter',
    'polarBar',
    'image',
    'ternary',
    'smith',
    'scatterMatrix',
    'carpet',
    'carpetScatter',
    'carpetContour',
    'icicle',
    'funnelArea',
    'parallelCategories',
    'gaugeNumber',
    'gaugeDelta',
    'gaugeBullet',
  ]) {
    assert.equal(typeof Graflume[name], 'function', name);
  }
});
