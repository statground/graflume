import test from 'node:test';
import assert from 'node:assert/strict';

import {
  empiricalDistribution,
  kernelDensity1d,
  rawBoxSummary,
  weightedHistogram,
} from '../.tmp/src/data/statistics.js';
import { compile } from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const observations = [
  { value: 0, weight: 1, rowIndex: 0 },
  { value: 0.5, weight: 2, rowIndex: 1 },
  { value: 1, weight: 1, rowIndex: 2 },
];

test('weighted histogram normalization and accumulation preserve mass', () => {
  assert.deepEqual(
    weightedHistogram(observations, { bins: 2 }).map(({ value }) => value),
    [1, 3],
  );
  assert.deepEqual(
    weightedHistogram(observations, { bins: 2, normalization: 'probability' }).map(
      ({ value }) => value,
    ),
    [0.25, 0.75],
  );
  assert.deepEqual(
    weightedHistogram(observations, {
      bins: 2,
      normalization: 'probability',
      cumulative: true,
    }).map(({ value }) => value),
    [0.25, 1],
  );
  const density = weightedHistogram(observations, { bins: 2, normalization: 'density' });
  assert.equal(
    density.reduce((mass, bin) => mass + bin.value * (bin.end - bin.start), 0),
    1,
  );
  assert.deepEqual(
    weightedHistogram(observations, {
      bins: 2,
      normalization: 'density',
      cumulative: true,
    }).map(({ value }) => value),
    [0.25, 1],
  );
});

test('ECDF and CCDF are weighted, tied, and monotone', () => {
  const tied = [...observations, { value: 0.5, weight: 1, rowIndex: 3 }];
  const ecdf = empiricalDistribution(tied);
  const ccdf = empiricalDistribution(tied, true);
  assert.deepEqual(
    ecdf.map(({ probability }) => probability),
    [0.2, 0.8, 1],
  );
  assert.ok(
    ccdf.every(({ probability }, index) => Math.abs(probability - [0.8, 0.2, 0][index]) < 1e-12),
  );
  assert.deepEqual(ecdf[1].rowIndices, [1, 3]);
});

test('robust KDE integrates to approximately one and raw boxes identify outliers', () => {
  const source = Array.from({ length: 101 }, (_, index) => ({
    value: index / 10,
    weight: 1,
    rowIndex: index,
  }));
  const kde = kernelDensity1d(source, { points: 401 });
  const rescaledWeights = kernelDensity1d(
    source.map((observation) => ({ ...observation, weight: observation.weight * 7 })),
    { points: 401 },
  );
  assert.ok(Math.abs(kde.bandwidth - rescaledWeights.bandwidth) < 1e-12);
  assert.ok(
    kde.points.every(
      (point, index) =>
        Math.abs(point.value - rescaledWeights.points[index].value) < 1e-12 &&
        Math.abs(point.density - rescaledWeights.points[index].density) < 1e-12,
    ),
  );
  let integral = 0;
  for (let index = 1; index < kde.points.length; index += 1) {
    const left = kde.points[index - 1];
    const right = kde.points[index];
    integral += ((left.density + right.density) / 2) * (right.value - left.value);
  }
  assert.ok(integral > 0.995 && integral < 1.005, integral);
  const box = rawBoxSummary(
    [0, 1, 2, 3, 100].map((value, rowIndex) => ({ value, weight: 1, rowIndex })),
  );
  assert.deepEqual(
    { q1: box.q1, median: box.median, q3: box.q3, low: box.lowerWhisker, high: box.upperWhisker },
    { q1: 1, median: 2, q3: 3, low: 0, high: 3 },
  );
  assert.deepEqual(
    box.outliers.map(({ value }) => value),
    [100],
  );
});

test('distribution modes compile semantic provenance with bounded output', () => {
  const data = Array.from({ length: 10_000 }, (_, index) => ({
    group: 'A',
    value: index / 10,
    weight: index % 2 ? 2 : 1,
  }));
  const nodesFor = (mode, performance) =>
    flattenScene(
      compile(
        {
          data,
          mark: {
            type: 'distribution',
            fields: { value: 'value', weight: 'weight' },
            options: { mode, bins: 10, normalization: 'probability', cumulative: true },
          },
          x: { field: 'value', type: 'quantitative' },
          y: { field: 'value', type: 'quantitative' },
          ...(performance === undefined ? {} : { performance }),
        },
        { width: 520, height: 360 },
      ).scene.root,
    );

  const histogram = nodesFor('histogram');
  const finalBin = histogram.filter((node) => node.id.includes(':bin:')).at(-1);
  assert.equal(finalBin.datum.tooltip.value, 1);
  assert.equal(finalBin.datum.tooltip.normalization, 'probability');
  assert.equal(finalBin.datum.tooltip.cumulative, true);

  const ecdf = nodesFor('ecdf', 'ultra');
  assert.ok(ecdf.some((node) => node.id.includes(':ecdf-line')));
  assert.ok(ecdf.filter((node) => node.id.includes(':ecdf-point:')).length <= 8000);
  assert.ok(ecdf.find((node) => node.id.includes(':ecdf-line')).points.length <= 8000);
  const ccdf = nodesFor('ccdf');
  assert.ok(ccdf.some((node) => node.id.includes(':ccdf-line')));
  const kde = nodesFor('kde');
  assert.equal(
    kde.find((node) => node.id.includes(':kde-line')).datum.tooltip.kind,
    'kernel-density',
  );

  const rawBoxNodes = flattenScene(
    compile(
      {
        data: [0, 1, 2, 3, 100].map((value) => ({ group: 'A', value })),
        mark: {
          type: 'distribution',
          fields: { value: 'value' },
          options: { mode: 'boxplot' },
        },
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
      },
      { width: 520, height: 360 },
    ).scene.root,
  );
  const rawBox = rawBoxNodes.find((node) => node.id.includes(':boxplot-box:'));
  assert.equal(rawBox.datum.tooltip.kind, 'raw-box-summary');
  assert.deepEqual(
    [rawBox.datum.tooltip.q1, rawBox.datum.tooltip.median, rawBox.datum.tooltip.q3],
    [1, 2, 3],
  );
  assert.equal(rawBoxNodes.filter((node) => node.id.includes(':boxplot-outlier:')).length, 1);
});
