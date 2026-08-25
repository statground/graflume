import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  calculateTechnicalIndicator,
  compile,
  runtimeCapabilities,
  technicalIndicatorCapabilities,
  technicalIndicatorPresetIds,
  technicalIndicatorPublicEntryPointCount,
  tiledMapCapability,
  validateSpec,
} from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const chartSchema = JSON.parse(
  await readFile(new URL('../schema/graflume.schema.json', import.meta.url)),
);

const mixedSeries = [
  { category: 'A', series: 'Positive 1', value: 4 },
  { category: 'A', series: 'Negative', value: -2 },
  { category: 'A', series: 'Positive 2', value: 1 },
  { category: 'B', series: 'Positive 1', value: 2 },
  { category: 'B', series: 'Negative', value: -3 },
  { category: 'B', series: 'Positive 2', value: 5 },
];

function stackedSpec(mark, data = mixedSeries) {
  return {
    data,
    mark,
    x: { field: 'category', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
    interaction: { tooltip: true },
    accessibility: { table: true },
  };
}

function marks(result, token) {
  return flattenScene(result.scene.root).filter((node) => node.id.includes(token));
}

test('one Bar layer renders exact diverging series stacks with totals, lineage, and datum hits', () => {
  const result = compile(
    stackedSpec({
      type: 'bar',
      fields: { series: 'series' },
      options: { stack: { mode: 'diverging', order: 'input' } },
    }),
    { width: 640, height: 400 },
  );
  const bars = marks(result, ':series-bar:');
  assert.equal(bars.length, mixedSeries.length);
  const firstCategory = bars.filter((node) => node.datum?.datum.category === 'A');
  assert.equal(firstCategory.length, 3);
  firstCategory.forEach((node) => {
    assert.equal(node.interactive, true);
    assert.equal(node.datum.tooltip.stackTotal, 7);
    assert.equal(node.datum.tooltip.stackPositiveTotal, 5);
    assert.equal(node.datum.tooltip.stackNegativeTotal, 2);
    assert.equal(node.datum.tooltip.stackNetTotal, 3);
  });
  const positive1 = firstCategory.find((node) => node.datum.datum.series === 'Positive 1');
  const positive2 = firstCategory.find((node) => node.datum.datum.series === 'Positive 2');
  const negative = firstCategory.find((node) => node.datum.datum.series === 'Negative');
  assert.equal(positive1.datum.tooltip.stackStart, 0);
  assert.equal(positive1.datum.tooltip.stackEnd, 4);
  assert.equal(positive2.datum.tooltip.stackStart, 4);
  assert.equal(positive2.datum.tooltip.stackEnd, 5);
  assert.equal(negative.datum.tooltip.stackStart, -2);
  assert.equal(negative.datum.tooltip.stackEnd, 0);
  assert.ok(Math.abs(positive2.y + positive2.height - positive1.y) < 1e-8);
  const lineage = result.dataLineage['layer-0'];
  assert.equal(lineage.transforms.at(-1).type, 'stack');
  assert.equal(lineage.transforms.at(-1).parameters.offset, 'zero');
  assert.match(lineage.summary, /ordered transforms/);
});

test('grouped and 100-percent Bar layouts retain series identity in one layer', () => {
  const grouped = compile(
    stackedSpec({ type: 'bar', fields: { series: 'series' }, options: { stack: 'grouped' } }),
    { width: 640, height: 400 },
  );
  const groupedBars = marks(grouped, ':series-bar:').filter(
    (node) => node.datum?.datum.category === 'A',
  );
  assert.equal(new Set(groupedBars.map(({ x }) => x)).size, 3);
  assert.equal(grouped.dataLineage['layer-0'].transforms.length, 0);

  const normalized = compile(
    stackedSpec({
      type: 'bar',
      fields: { series: 'series' },
      options: { stack: { mode: '100-percent' } },
    }),
    { width: 640, height: 400 },
  );
  const normalizedBars = marks(normalized, ':series-bar:').filter(
    (node) => node.datum?.datum.category === 'A',
  );
  const percentageMagnitude = normalizedBars.reduce(
    (sum, node) => sum + Math.abs(node.datum.tooltip.stackPercent),
    0,
  );
  assert.ok(Math.abs(percentageMagnitude - 1) < 1e-12);
  assert.equal(normalized.dataLineage['layer-0'].transforms.at(-1).parameters.offset, 'normalize');
});

test('series identity distinguishes numeric and string values with the same text', () => {
  const result = compile(
    stackedSpec({ type: 'bar', fields: { series: 'series' }, options: { stack: 'grouped' } }, [
      { category: 'A', series: 1, value: 2 },
      { category: 'A', series: '1', value: 3 },
    ]),
    { width: 640, height: 400 },
  );
  const bars = marks(result, ':series-bar:');
  assert.equal(bars.length, 2);
  assert.equal(new Set(bars.map(({ x }) => x)).size, 2);
});

test('series Bar and Area consume canonical styling, order, detail, point, and tooltip channels', () => {
  const data = [
    { category: 'A', series: 'First', value: 2, drawOrder: 2, note: 'first' },
    { category: 'A', series: 'Second', value: 3, drawOrder: 1, note: 'second' },
  ];
  const bar = compile({
    data,
    mark: { type: 'bar', fields: { series: 'series' }, options: { stack: 'stacked' } },
    encoding: {
      x: { field: 'category', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      fill: { value: '#123456' },
      stroke: { value: '#abcdef' },
      opacity: { value: 0.42 },
      strokeWidth: { value: 4 },
      strokeDash: { value: [3, 2] },
      order: 'drawOrder',
      tooltip: 'note',
    },
  });
  const bars = marks(bar, ':series-bar:');
  assert.deepEqual(
    bars.map(({ datum }) => datum.rowIndex),
    [1, 0],
  );
  assert.ok(
    bars.every(
      (node) =>
        node.fill === '#123456' &&
        node.stroke === '#abcdef' &&
        node.opacity === 0.42 &&
        node.lineWidth === 4 &&
        JSON.stringify(node.dash) === '[3,2]' &&
        typeof node.datum.tooltip.encoded === 'string',
    ),
  );

  const area = compile({
    data: [
      { x: 0, series: 'A', value: 1, note: 'a0' },
      { x: 1, series: 'A', value: 2, note: 'a1' },
      { x: 0, series: 'B', value: 2, note: 'b0' },
      { x: 1, series: 'B', value: 1, note: 'b1' },
    ],
    mark: {
      type: 'area',
      point: true,
      fields: { series: 'series' },
      options: { stack: 'stacked' },
    },
    encoding: {
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
      color: { value: '#2468ac' },
      fill: { value: '#13579b' },
      stroke: { value: '#fedcba' },
      opacity: { value: 0.55 },
      strokeWidth: { value: 3 },
      strokeDash: { value: [5, 1] },
      detail: 'series',
      radius: { value: 7 },
      tooltip: 'note',
    },
  });
  const paths = marks(area, ':series-area:');
  assert.equal(paths.length, 2);
  assert.ok(
    paths.every(
      (node) =>
        node.fill === '#13579b' &&
        node.stroke === '#fedcba' &&
        node.opacity === 0.55 &&
        node.lineWidth === 3 &&
        JSON.stringify(node.dash) === '[5,1]',
    ),
  );
  const points = marks(area, ':series-area-target:');
  assert.equal(points.length, 4);
  assert.ok(
    points.every(
      (node) =>
        node.radius === 7 &&
        node.opacity === 0.55 &&
        node.fill === '#13579b' &&
        node.stroke === '#fedcba' &&
        typeof node.datum.tooltip.encoded === 'string',
    ),
  );
});

test('series layouts reject positional range channels instead of silently replacing them', () => {
  const barIssues = validateSpec({
    data: mixedSeries,
    mark: { type: 'bar', fields: { series: 'series' }, options: { stack: 'stacked' } },
    encoding: {
      x: { field: 'category', type: 'nominal' },
      x2: 'value',
      y: { field: 'value', type: 'quantitative' },
    },
  });
  assert.ok(
    barIssues.some(({ path, message }) => path === '$.encoding.x2' && /conflicts/.test(message)),
  );
  const areaIssues = validateSpec({
    data: mixedSeries,
    mark: { type: 'area', fields: { series: 'series' }, options: { stack: 'stacked' } },
    encoding: {
      x: { field: 'category', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      y2: 'value',
    },
  });
  assert.ok(
    areaIssues.some(({ path, message }) => path === '$.encoding.y2' && /conflicts/.test(message)),
  );
  assert.deepEqual(runtimeCapabilities.seriesStack.encoding.positionalConflicts, {
    bar: ['x2', 'y2'],
    area: ['y2'],
    themeRiver: ['y2'],
  });
});

test('ChartSpec schema exposes function-free stack and indicator calculation options', () => {
  const options = chartSchema.$defs.markObject.properties.options.properties;
  assert.deepEqual(options.stack.oneOf[0].enum, [
    'grouped',
    'stacked',
    '100-percent',
    'diverging',
    'streamgraph',
  ]);
  assert.equal(options.stack.oneOf[1].additionalProperties, false);
  assert.deepEqual(options.stack.oneOf[1].properties.order.enum, [
    'input',
    'ascending',
    'descending',
    'sumAscending',
    'sumDescending',
    'insideOut',
  ]);
  assert.equal(options.calculate.type, 'boolean');
  for (const parameter of ['period', 'fastPeriod', 'slowPeriod', 'signalPeriod']) {
    assert.equal(options[parameter].minimum, 2);
    assert.equal(options[parameter].maximum, 200);
  }
});

test('Area and Theme river converge on shared silhouette/wiggle series geometry', () => {
  const data = [
    { x: 0, series: 'A', value: 1 },
    { x: 0, series: 'B', value: 5 },
    { x: 1, series: 'A', value: 5 },
    { x: 1, series: 'B', value: 1 },
    { x: 2, series: 'A', value: 2 },
    { x: 2, series: 'B', value: 6 },
  ];
  const area = compile(
    {
      data,
      mark: {
        type: 'area',
        fields: { series: 'series' },
        options: { stack: { mode: 'stacked', offset: 'silhouette' } },
      },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );
  assert.equal(marks(area, ':series-area:').length, 2);
  assert.equal(marks(area, ':series-area-target:').length, data.length);

  const river = compile(
    {
      data,
      mark: { type: 'theme-river', fields: { series: 'series' } },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );
  const stream = compile(
    {
      data,
      mark: {
        type: 'theme-river',
        fields: { series: 'series' },
        options: { stack: { mode: 'streamgraph', offset: 'wiggle', order: 'insideOut' } },
      },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );
  assert.equal(river.dataLineage['layer-0'].transforms.at(-1).parameters.offset, 'silhouette');
  assert.equal(stream.dataLineage['layer-0'].transforms.at(-1).parameters.offset, 'wiggle');
  assert.equal(stream.dataLineage['layer-0'].transforms.at(-1).parameters.order, 'insideOut');
  const riverStarts = marks(river, ':river-target:').map((node) => node.datum.tooltip.stackStart);
  const streamStarts = marks(stream, ':river-target:').map((node) => node.datum.tooltip.stackStart);
  assert.notDeepEqual(streamStarts, riverStarts);
});

test('stacked Area interpolation stays inside the resolved line-point budget', () => {
  const data = Array.from({ length: 800 }, (_, x) => ({
    x,
    series: 'A',
    value: 2 + Math.sin(x / 17),
  }));
  const result = compile(
    {
      data,
      performance: 'ultra',
      mark: {
        type: 'area',
        fields: { series: 'series' },
        options: { stack: 'stacked', curve: 'natural', curveSamples: 64 },
      },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 600, height: 400 },
  );
  const paths = marks(result, ':series-area:');
  assert.equal(paths.length, 1);
  assert.ok(
    paths[0].points.length <= 2_000,
    `expected at most 2,000 stacked-area points, received ${paths[0].points.length}`,
  );
});

test('indicator registry audits all 47 public entry points without overstating calculation', () => {
  assert.equal(technicalIndicatorPresetIds.length, 45);
  assert.equal(technicalIndicatorCapabilities.length, 45);
  assert.deepEqual(technicalIndicatorPublicEntryPointCount, {
    canonicalSurfaces: 2,
    namedPresets: 45,
    total: 47,
  });
  assert.equal(new Set(technicalIndicatorCapabilities.map(({ id }) => id)).size, 45);
  assert.equal(
    technicalIndicatorCapabilities.find(({ kind }) => kind === 'sma').support,
    'computed',
  );
  assert.equal(
    technicalIndicatorCapabilities.find(({ kind }) => kind === 'atr').support,
    'precomputed-required',
  );
  assert.match(
    technicalIndicatorCapabilities.find(({ kind }) => kind === 'atr').provenance,
    /supplied indicator columns/,
  );
  assert.deepEqual(tiledMapCapability, {
    id: 'tiled-map',
    status: 'deprecated',
    behavior: 'embedded-basemap-alias',
    preferredFamily: 'map',
    basemap: 'natural-earth-embedded',
    tileLifecycle: false,
    networkRequests: false,
  });
});

test('calculated indicators enforce formulas, parameters, DAGs, and null warm-up policy', () => {
  const values = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(calculateTechnicalIndicator('sma', values, { period: 3 }).outputs.value, [
    null,
    null,
    2,
    3,
    4,
    5,
  ]);
  assert.deepEqual(calculateTechnicalIndicator('ema', values, { period: 3 }).outputs.value, [
    null,
    null,
    2,
    3,
    4,
    5,
  ]);
  assert.deepEqual(calculateTechnicalIndicator('dema', values, { period: 2 }).outputs.value, [
    null,
    null,
    3,
    4,
    5,
    6,
  ]);
  assert.deepEqual(calculateTechnicalIndicator('tema', values, { period: 2 }).outputs.value, [
    null,
    null,
    null,
    4,
    5,
    6,
  ]);
  assert.deepEqual(calculateTechnicalIndicator('momentum', values, { period: 2 }).outputs.value, [
    null,
    null,
    2,
    2,
    2,
    2,
  ]);
  assert.equal(calculateTechnicalIndicator('roc', values, { period: 2 }).outputs.value[2], 200);
  assert.deepEqual(calculateTechnicalIndicator('rsi', values, { period: 3 }).outputs.value, [
    null,
    null,
    null,
    100,
    100,
    100,
  ]);
  assert.equal(
    calculateTechnicalIndicator('disparityindex', values, { period: 3 }).outputs.value[2],
    50,
  );
  const regression = calculateTechnicalIndicator('linearregression', [2, 4, 6], { period: 3 });
  assert.equal(regression.outputs.value[2], 6);
  assert.match(regression.provenance, /least-squares/);
  const macd = calculateTechnicalIndicator('macd', values, {
    fastPeriod: 2,
    slowPeriod: 3,
    signalPeriod: 2,
  });
  assert.equal(macd.outputs.value[2], 0.5);
  assert.equal(macd.outputs.signal[3], 0.5);
  assert.equal(macd.outputs.histogram[3], 0);
  assert.equal(macd.warmUpRows, 3);
  assert.ok(macd.capability.dependencyDag.some(({ id }) => id === 'signal'));
  assert.throws(
    () => calculateTechnicalIndicator('atr', values, { period: 3 }),
    /precomputed-required/,
  );
});

test('calculated indicator values are materialized before domains and expose provenance lineage', () => {
  const data = Array.from({ length: 8 }, (_, index) => ({ x: index, value: index + 1 }));
  const result = compile(
    {
      data,
      mark: { type: 'indicator', options: { kind: 'momentum', calculate: true, period: 2 } },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );
  const points = marks(result, ':indicator-point:');
  assert.ok(points.length > 0);
  assert.ok(points.every((node) => node.datum.tooltip.indicatorValue === 2));
  assert.ok(points.every((node) => node.datum.tooltip.indicatorSource >= 3));
  const lineage = result.dataLineage['layer-0'];
  assert.equal(lineage.transforms.at(-1).parameters.operation, 'technical-indicator');
  assert.equal(lineage.transforms.at(-1).parameters.warmUpPolicy, 'null');
  assert.match(lineage.summary, /dependency DAG/);

  assert.throws(
    () =>
      compile({
        data,
        mark: { type: 'indicator', options: { kind: 'atr', calculate: true } },
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'value', type: 'quantitative' },
      }),
    /precomputed-required/,
  );
});
