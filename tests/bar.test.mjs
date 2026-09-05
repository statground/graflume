import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import { compile as compileComplete } from '../.tmp/src/complete.js';
import { resolveBarBandLayout } from '../.tmp/src/marks/bar-layout.js';
import { BandScale } from '../.tmp/src/scale/band.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const monthly = [
  { month: 'Jan', sales: 42 },
  { month: 'Feb', sales: 51 },
  { month: 'Mar', sales: 49 },
  { month: 'Apr', sales: 63 },
];

function barRects(scene, token = ':bar:') {
  return flattenScene(scene.root).filter((node) => node.type === 'rect' && node.id.includes(token));
}

function assertCrossAxisSeparated(rects, orientation, message) {
  const start = orientation === 'horizontal' ? 'y' : 'x';
  const size = orientation === 'horizontal' ? 'height' : 'width';
  const ordered = [...rects].sort((left, right) => left[start] - right[start]);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    assert.ok(
      previous[start] + previous[size] <= current[start] + 1e-8,
      `${message}: ${previous.id} overlaps ${current.id}`,
    );
  }
}

test('bar band resolver derives capped thickness and explicit grouped gaps from scale geometry', () => {
  const scale = new BandScale({
    domain: ['A', 'B', 'C'],
    range: [0, 300],
    paddingInner: 0.1,
    paddingOuter: 0.05,
  });
  const centers = ['A', 'B', 'C'].map((value) => scale.map(value));
  const ordinary = resolveBarBandLayout({
    scale,
    centers,
    plotSpan: 300,
    categoryCount: 3,
    barWidthRatio: 0.9,
  });
  assert.ok(Math.abs(ordinary.categoryStride - scale.step) < 1e-10);
  assert.ok(Math.abs(ordinary.slot - scale.step) < 1e-10);
  assert.equal(ordinary.thickness, 64);
  assert.equal(ordinary.gap, ordinary.slot - ordinary.thickness);

  const grouped = resolveBarBandLayout({
    scale,
    centers,
    plotSpan: 300,
    categoryCount: 3,
    groupCount: 3,
    barWidthRatio: 0.9,
  });
  assert.ok(Math.abs(grouped.slot - scale.step / 3) < 1e-10);
  assert.ok(Math.abs(grouped.thickness / grouped.slot - 0.82) < 1e-12);
  assert.ok(Math.abs(grouped.gap / grouped.slot - 0.18) < 1e-12);
  assert.ok(grouped.slot * 3 <= grouped.categoryStride);

  const reference = resolveBarBandLayout({
    scale,
    centers,
    plotSpan: 300,
    categoryCount: 3,
    groupCount: 3,
    barWidthRatio: 0.9,
    maxThickness: 64,
    preserveAuthoredRatio: true,
  });
  assert.ok(Math.abs(reference.thickness / reference.slot - 0.9) < 1e-12);

  const sparseReference = resolveBarBandLayout({
    scale: new BandScale({ domain: ['Only'], range: [0, 1_200] }),
    centers: [600],
    plotSpan: 1_200,
    categoryCount: 1,
    barWidthRatio: 0.9,
    maxThickness: 64,
    preserveAuthoredRatio: true,
  });
  assert.equal(sparseReference.thickness, 64);
});

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

test('horizontal bars automatically transpose conventional category-value encodings', () => {
  const data = [
    { capability: 'Insights', adoption: 86 },
    { capability: 'Dashboards', adoption: 78 },
    { capability: 'Reports', adoption: 69 },
    { capability: 'Alerts', adoption: 61 },
    { capability: 'Models', adoption: 53 },
    { capability: 'Exports', adoption: 45 },
  ];
  const result = compile(
    {
      data,
      mark: { type: 'bar', orientation: 'horizontal', cornerRadius: 6 },
      x: { field: 'capability', type: 'ordinal', title: 'Capability' },
      y: { field: 'adoption', type: 'quantitative', title: 'Adoption (%)' },
    },
    { width: 1_234, height: 820 },
  );

  const layer = result.spec.layers[0];
  assert.equal(layer.x.field, 'adoption');
  assert.equal(layer.y.field, 'capability');
  assert.equal(layer.x.title, 'Adoption (%)');
  assert.equal(layer.y.title, 'Capability');
  const bars = barRects(result.scene);
  assert.equal(bars.length, data.length);
  assertCrossAxisSeparated(bars, 'horizontal', 'auto-oriented horizontal bars');
  assert.ok(bars.every(({ height }) => height <= 64));
  assert.ok(bars[0].width > bars.at(-1).width);
});

test('horizontal bar auto-orientation also infers shorthand field types', () => {
  const { scene, spec } = compile(
    {
      data: [
        { category: 'A', value: 12 },
        { category: 'B', value: 31 },
        { category: 'C', value: 19 },
      ],
      mark: { type: 'bar', orientation: 'horizontal' },
      x: 'category',
      y: 'value',
    },
    { width: 480, height: 320 },
  );

  assert.equal(spec.layers[0].x.field, 'value');
  assert.equal(spec.layers[0].y.field, 'category');
  assertCrossAxisSeparated(barRects(scene), 'horizontal', 'inferred horizontal bars');
});

test('horizontal interval bars transpose y2 into x2 with the category-value axes', () => {
  const result = compile(
    {
      data: [
        { category: 'Committed', start: 18, end: 43 },
        { category: 'In review', start: 27, end: 58 },
      ],
      mark: { type: 'bar', orientation: 'horizontal' },
      encoding: {
        x: { field: 'category', type: 'ordinal' },
        y: { field: 'end', type: 'quantitative' },
        y2: { field: 'start', type: 'quantitative' },
      },
    },
    { width: 520, height: 300 },
  );
  const layer = result.spec.layers[0];
  assert.equal(layer.x.field, 'end');
  assert.equal(layer.y.field, 'category');
  assert.equal(layer.encoding.x2.field, 'start');
  assert.equal(layer.encoding.y2, undefined);
  const bars = barRects(result.scene);
  assert.equal(bars.length, 2);
  assertCrossAxisSeparated(bars, 'horizontal', 'horizontal interval bars');
  assert.ok(bars.every(({ width }) => width > 0));
});

test('dense horizontal and vertical bars use pixel-aware LOD without cross-axis collisions', () => {
  const data = Array.from({ length: 20_000 }, (_, index) => ({
    category: `Category ${index + 1}`,
    value: 40 + ((index * 37) % 61),
  }));
  for (const orientation of ['horizontal', 'vertical']) {
    const horizontal = orientation === 'horizontal';
    const { scene } = compile(
      {
        data,
        mark: { type: 'bar', orientation },
        x: {
          field: horizontal ? 'value' : 'category',
          type: horizontal ? 'quantitative' : 'ordinal',
        },
        y: {
          field: horizontal ? 'category' : 'value',
          type: horizontal ? 'ordinal' : 'quantitative',
        },
        performance: 'ultra',
      },
      { width: 460, height: 340 },
    );
    const bars = barRects(scene);
    const categorySpan = horizontal ? 340 : 460;
    assert.ok(bars.length <= Math.floor(categorySpan / 2));
    assertCrossAxisSeparated(bars, orientation, `${orientation} LOD bars`);
    assert.ok(bars.every((bar) => (horizontal ? bar.height : bar.width) <= 64));
  }
});

test('ranked bar LOD keeps leading ranks and collision-safe bands in both orientations', () => {
  const data = Array.from({ length: 4_000 }, (_, index) => ({
    id: `Metric ${index + 1}`,
    category: `Metric ${index + 1}`,
    value: 10_000 - index,
  }));
  for (const orientation of ['horizontal', 'vertical']) {
    const horizontal = orientation === 'horizontal';
    const { scene } = compile(
      {
        data,
        mark: {
          type: 'bar',
          orientation,
          fields: { id: 'id', category: 'category', value: 'value' },
          options: { rank: true },
        },
        x: {
          field: horizontal ? 'value' : 'category',
          type: horizontal ? 'quantitative' : 'ordinal',
        },
        y: {
          field: horizontal ? 'category' : 'value',
          type: horizontal ? 'ordinal' : 'quantitative',
        },
        performance: 'ultra',
      },
      { width: 480, height: 340 },
    );
    const bars = barRects(scene, ':ranked-bar:');
    assert.ok(bars.length < data.length);
    assert.ok(bars[0].id.endsWith(':Metric 1'));
    assertCrossAxisSeparated(bars, orientation, `${orientation} ranked bars`);
    assert.ok(bars.every((bar) => (horizontal ? bar.height : bar.width) <= 64));
  }
});

test('grouped series keep complete category groups, inner gaps, and max thickness under LOD', () => {
  const data = Array.from({ length: 1_200 }, (_, categoryIndex) =>
    ['North', 'Central', 'South'].map((series, seriesIndex) => ({
      category: `Portfolio ${categoryIndex + 1}`,
      series,
      value: 40 + ((categoryIndex * 13 + seriesIndex * 17) % 70),
    })),
  ).flat();
  const { scene } = compile(
    {
      data,
      mark: { type: 'bar', fields: { series: 'series' }, options: { stack: 'grouped' } },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 420, height: 320 },
  );
  const bars = barRects(scene, ':series-bar:');
  const categories = new Map();
  for (const bar of bars) {
    const category = bar.datum.datum.category;
    const entries = categories.get(category) ?? [];
    entries.push(bar);
    categories.set(category, entries);
  }
  assert.ok(categories.size <= Math.floor(420 / 4.5));
  assert.ok([...categories.values()].every((entries) => entries.length === 3));
  for (const entries of categories.values()) {
    assertCrossAxisSeparated(entries, 'vertical', 'grouped series bars');
    assert.ok(entries.every(({ width }) => width <= 52));
    const ordered = [...entries].sort((left, right) => left.x - right.x);
    assert.ok(ordered[0].x + ordered[0].width < ordered[1].x);
    assert.ok(ordered[1].x + ordered[1].width < ordered[2].x);
  }
});

test('stacked horizontal bars auto-orient and keep category bands separate', () => {
  const data = ['Alpha', 'Beta', 'Gamma'].flatMap((category, categoryIndex) =>
    ['Direct', 'Partner'].map((series, seriesIndex) => ({
      category,
      series,
      value: 18 + categoryIndex * 7 + seriesIndex * 5,
    })),
  );
  const result = compile(
    {
      data,
      mark: {
        type: 'bar',
        orientation: 'horizontal',
        fields: { series: 'series' },
        options: { stack: 'stacked' },
      },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 420 },
  );
  assert.equal(result.spec.layers[0].x.field, 'value');
  assert.equal(result.spec.layers[0].y.field, 'category');
  const bars = barRects(result.scene, ':series-bar:');
  const categoryBands = [...new Set(bars.map(({ y, height }) => `${y}:${height}`))].map((key) => {
    const [y, height] = key.split(':').map(Number);
    return { id: key, y, height };
  });
  assert.equal(categoryBands.length, 3);
  assertCrossAxisSeparated(categoryBands, 'horizontal', 'stacked category bands');
});

test('range columns and waterfall steps retain collision-safe categorical bands', () => {
  const data = [
    { category: 'A', value: 18, low: 12, high: 24 },
    { category: 'B', value: -7, low: 9, high: 21 },
    { category: 'C', value: 13, low: 15, high: 29 },
    { category: 'D', value: 6, low: 11, high: 19 },
  ];
  const range = compileComplete(
    {
      data,
      mark: { type: 'range', fields: { low: 'low', high: 'high' }, options: { mode: 'column' } },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 520, height: 340 },
  );
  const waterfall = compile(
    {
      data,
      mark: 'waterfall',
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 520, height: 340 },
  );
  assertCrossAxisSeparated(barRects(range.scene, ':range-column:'), 'vertical', 'range columns');
  const waterfallBars = barRects(waterfall.scene, ':waterfall:');
  assertCrossAxisSeparated(waterfallBars, 'vertical', 'waterfall steps');
  assert.ok(barRects(range.scene, ':range-column:').every(({ width }) => width <= 64));
  assert.ok(waterfallBars.every(({ width }) => width <= 64));
});

test('irregular continuous category positions bound ordinary and range-column widths by the nearest center', () => {
  const data = Array.from({ length: 120 }, (_, index) => ({
    position: Math.floor(index / 2) + (index % 2 === 0 ? 0 : 0.001),
    value: 40 + ((index * 17) % 37),
    low: 12 + ((index * 11) % 19),
    high: 35 + ((index * 13) % 29),
  }));
  const bar = compile(
    {
      data,
      mark: 'bar',
      x: { field: 'position', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 460, height: 320 },
  );
  const range = compileComplete(
    {
      data,
      mark: { type: 'range', fields: { low: 'low', high: 'high' }, options: { mode: 'column' } },
      x: { field: 'position', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 460, height: 320 },
  );
  const bars = barRects(bar.scene);
  const ranges = barRects(range.scene, ':range-column:');
  assert.equal(bars.length, data.length);
  assert.equal(ranges.length, data.length);
  assertCrossAxisSeparated(bars, 'vertical', 'irregular continuous bars');
  assertCrossAxisSeparated(ranges, 'vertical', 'irregular continuous range columns');
  assert.ok(bars.every(({ width }) => width > 0 && width <= 64));
  assert.ok(ranges.every(({ width }) => width > 0 && width <= 64));
});

test('dense waterfall LOD resolves every cumulative step before selecting output categories', () => {
  const rowCount = 4_000;
  const data = Array.from({ length: rowCount }, (_, index) => ({
    category: `Ledger ${index + 1}`,
    delta: index === rowCount - 1 ? 7 : index % 9 === 0 ? -2 : 3,
  }));
  const result = compile(
    {
      data,
      mark: 'waterfall',
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'delta', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 440, height: 320 },
  );
  const bars = barRects(result.scene, ':waterfall:');
  assert.ok(bars.length < data.length);
  assertCrossAxisSeparated(bars, 'vertical', 'dense waterfall steps');
  const final = bars.find(({ datum }) => datum?.rowIndex === rowCount - 1);
  assert.ok(final, 'endpoint-preserving LOD retains the final cumulative step');
  const total = data.reduce((sum, { delta }) => sum + delta, 0);
  const start = total - data.at(-1).delta;
  const yScale = result.coordinates.axes.y;
  assert.ok(Math.abs(final.y - Math.min(yScale.map(start), yScale.map(total))) < 1e-8);

  const semantic = compile(
    {
      data,
      mark: { type: 'waterfall', options: { explicitSemantics: true } },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'delta', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 440, height: 320 },
  );
  const semanticBars = barRects(semantic.scene, ':semantic-waterfall:');
  const semanticFinal = semanticBars.find(({ datum }) => datum?.rowIndex === rowCount - 1);
  assert.ok(semanticBars.length < data.length);
  assertCrossAxisSeparated(semanticBars, 'vertical', 'dense semantic waterfall steps');
  assert.equal(semanticFinal?.datum.tooltip.start, start);
  assert.equal(semanticFinal?.datum.tooltip.end, total);
});

test('reference themes preserve authored ratios below the cap and cap sparse and grouped bars', () => {
  for (const theme of ['ggplot', 'r-base', 'matplotlib']) {
    const sparse = compile(
      {
        data: [
          { category: 'Acquisition', value: 72 },
          { category: 'Activation', value: 58 },
          { category: 'Retention', value: 64 },
        ],
        mark: 'bar',
        x: { field: 'category', type: 'ordinal' },
        y: { field: 'value', type: 'quantitative' },
        theme,
      },
      { width: 1_240, height: 420 },
    );
    const sparseBars = barRects(sparse.scene);
    assert.ok(
      sparseBars.every(({ width }) => width === 64),
      `${theme} sparse cap`,
    );
    assertCrossAxisSeparated(sparseBars, 'vertical', `${theme} sparse bars`);

    const denseData = Array.from({ length: 64 }, (_, index) => ({
      category: `Segment ${index + 1}`,
      value: 30 + ((index * 19) % 61),
    }));
    const dense = compile(
      {
        data: denseData,
        mark: 'bar',
        x: { field: 'category', type: 'ordinal' },
        y: { field: 'value', type: 'quantitative' },
        theme,
      },
      { width: 720, height: 380 },
    );
    const denseBars = barRects(dense.scene);
    const denseCenters = denseBars.map(({ x, width }) => x + width / 2).sort((a, b) => a - b);
    const denseStep = denseCenters[1] - denseCenters[0];
    assertCrossAxisSeparated(denseBars, 'vertical', `${theme} dense bars`);
    assert.ok(
      Math.abs(denseBars[0].width / denseStep - dense.theme.mark.barWidthRatio) < 1e-10,
      `${theme} authored dense ratio`,
    );

    const groupedData = Array.from({ length: 18 }, (_, categoryIndex) =>
      ['Observed', 'Forecast'].map((series, seriesIndex) => ({
        category: `Cohort ${categoryIndex + 1}`,
        series,
        value: 40 + ((categoryIndex * 13 + seriesIndex * 23) % 51),
      })),
    ).flat();
    const grouped = compile(
      {
        data: groupedData,
        mark: { type: 'bar', fields: { series: 'series' }, options: { stack: 'grouped' } },
        x: { field: 'category', type: 'ordinal' },
        y: { field: 'value', type: 'quantitative' },
        theme,
      },
      { width: 760, height: 400 },
    );
    const groupedBars = barRects(grouped.scene, ':series-bar:');
    const firstPair = groupedBars
      .filter(({ datum }) => datum.datum.category === 'Cohort 1')
      .sort((left, right) => left.x - right.x);
    const innerStep =
      firstPair[1].x + firstPair[1].width / 2 - (firstPair[0].x + firstPair[0].width / 2);
    assertCrossAxisSeparated(groupedBars, 'vertical', `${theme} grouped bars`);
    assert.ok(
      groupedBars.every(({ width }) => width <= 52),
      `${theme} grouped cap`,
    );
    assert.ok(
      Math.abs(firstPair[0].width / innerStep - grouped.theme.mark.barWidthRatio) < 1e-10,
      `${theme} grouped authored ratio`,
    );
  }
});

test('dense candlestick, financial, and range-bar variants share collision-safe category bands', () => {
  const categorical = Array.from({ length: 2_000 }, (_, index) => {
    const open = 100 + Math.sin(index / 13) * 8 + index * 0.01;
    const close = open + (index % 2 === 0 ? 1.4 : -1.1);
    return {
      category: `Session ${index + 1}`,
      time: Math.floor(index / 2) + (index % 2 === 0 ? 0 : 0.001),
      open,
      high: Math.max(open, close) + 2,
      low: Math.min(open, close) - 2,
      close,
      volume: 100 + index,
    };
  });
  const candle = compile(
    {
      data: categorical,
      mark: {
        type: 'candlestick',
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
      },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'close', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 460, height: 330 },
  );
  const financial = compileComplete(
    {
      data: categorical,
      mark: {
        type: 'financial',
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        options: { kind: 'hollow-candlestick' },
      },
      x: { field: 'time', type: 'quantitative' },
      y: { field: 'close', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 460, height: 330 },
  );
  const minute = 60_000;
  const advancedData = categorical.map((row, index) => ({
    ...row,
    time: Date.UTC(2026, 0, 5, 0, 0) + index * minute,
  }));
  const advancedCandle = compile(
    {
      data: advancedData,
      mark: {
        type: 'candlestick',
        fields: {
          open: 'open',
          high: 'high',
          low: 'low',
          close: 'close',
          volume: 'volume',
        },
        options: {
          aggregateIntervalMs: minute,
          timeZone: 'UTC',
          extendedHours: 'include',
          navigator: false,
        },
      },
      x: { field: 'time', type: 'temporal' },
      y: { field: 'close', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 460, height: 330 },
  );
  const rangeBars = compileComplete(
    {
      data: categorical,
      mark: {
        type: 'renko',
        fields: {
          open: 'open',
          high: 'high',
          low: 'low',
          close: 'close',
          volume: 'volume',
        },
        options: { mode: 'range-bars', sizing: 'fixed', brickSize: 2 },
      },
      x: { field: 'time', type: 'quantitative' },
      y: { field: 'close', type: 'quantitative' },
      performance: 'ultra',
    },
    { width: 460, height: 330 },
  );
  const candleBodies = barRects(candle.scene, ':body:');
  const financialBodies = barRects(financial.scene, ':financial-body:');
  const advancedBodies = barRects(advancedCandle.scene, ':ohlc:');
  const rangeBodies = barRects(rangeBars.scene, ':range-bars:');
  assert.ok(candleBodies.length < categorical.length);
  assert.ok(financialBodies.length < categorical.length);
  assert.ok(advancedBodies.length > 1 && advancedBodies.length < advancedData.length);
  assert.ok(rangeBodies.length > 1);
  assertCrossAxisSeparated(candleBodies, 'vertical', 'dense candlestick bodies');
  assertCrossAxisSeparated(financialBodies, 'vertical', 'dense financial bodies');
  assertCrossAxisSeparated(advancedBodies, 'vertical', 'dense advanced candlestick bodies');
  assertCrossAxisSeparated(rangeBodies, 'vertical', 'dense range-bar blocks');
  assert.ok(
    [...candleBodies, ...financialBodies, ...advancedBodies, ...rangeBodies].every(
      ({ width }) => Number.isFinite(width) && width > 0 && width <= 64,
    ),
  );
});

test('sparse grouped-series bars pack capped widths around each category center', () => {
  const data = ['June', 'July', 'August', 'September'].flatMap((month, i) =>
    ['Visits', 'Views'].map((series, j) => ({ month, series, value: (i + 1) * (j + 1) * 10 })),
  );
  for (const orientation of ['vertical', 'horizontal']) {
    const horizontal = orientation === 'horizontal';
    const result = compile(
      {
        data,
        mark: {
          type: 'bar',
          orientation,
          maxThickness: 28,
          fields: { series: 'series' },
          options: { stack: 'grouped' },
        },
        x: { field: horizontal ? 'value' : 'month', type: horizontal ? 'quantitative' : 'ordinal' },
        y: { field: horizontal ? 'month' : 'value', type: horizontal ? 'ordinal' : 'quantitative' },
      },
      { width: 1200, height: 800 },
    );
    const cross = horizontal ? 'y' : 'x';
    const size = horizontal ? 'height' : 'width';
    for (const month of ['June', 'July', 'August', 'September']) {
      const pair = barRects(result.scene, ':series-bar:')
        .filter(({ datum }) => datum.datum.month === month)
        .sort((a, b) => a[cross] - b[cross]);
      assert.equal(pair.length, 2);
      const gap = pair[1][cross] - pair[0][cross] - pair[0][size];
      assert.ok(gap > 0 && gap < 10);
      assert.ok(pair.every((bar) => bar[size] > 0 && bar[size] <= 28));
      assert.ok(
        Math.abs(
          (pair[0][cross] + pair[0][size] / 2 + pair[1][cross] + pair[1][size] / 2) / 2 -
            result.coordinates.axes[cross].map(month),
        ) < 1e-8,
      );
    }
  }
});

test('nested grouped series keep separate external peer lanes under width caps', () => {
  for (const orientation of ['vertical', 'horizontal']) {
    const horizontal = orientation === 'horizontal';
    for (const internalCounts of [
      [1, 3, 1],
      [1, 1, 5, 1],
    ]) {
      for (const categoryCount of [1, 4]) {
        const categories = Array.from({ length: categoryCount }, (_, index) => `Month ${index}`);
        for (const caps of [
          internalCounts.map(() => 28),
          internalCounts.map((_n, i) => (i % 2 ? 28 : 12)),
        ]) {
          const layers = internalCounts.map((count, layerIndex) => ({
            id: `peer-${layerIndex}`,
            data: categories.flatMap((category) =>
              Array.from({ length: count }, (_, series) => ({
                category,
                series: `Series ${series}`,
                value: 10 + series,
              })),
            ),
            mark: {
              type: 'bar',
              orientation,
              position: 'group',
              maxThickness: caps[layerIndex],
              ...(count > 1 ? { fields: { series: 'series' }, options: { stack: 'grouped' } } : {}),
            },
            x: {
              field: horizontal ? 'value' : 'category',
              type: horizontal ? 'quantitative' : 'ordinal',
            },
            y: {
              field: horizontal ? 'category' : 'value',
              type: horizontal ? 'ordinal' : 'quantitative',
            },
          }));
          const { scene } = compile({ layers }, { width: 1200, height: 400 });
          const rects = [...barRects(scene), ...barRects(scene, ':series-bar:')];
          const fullCount = categoryCount * internalCounts.reduce((sum, count) => sum + count, 0);
          assert.equal(rects.length, fullCount);
          const size = horizontal ? 'height' : 'width';
          for (const [layerIndex, cap] of caps.entries()) {
            const peerRects = rects.filter(({ datum }) => datum.layerId === `peer-${layerIndex}`);
            assert.ok(
              peerRects.length > 0 &&
                peerRects.every((rect) => rect[size] > 0 && rect[size] <= cap),
            );
            const represented = new Set(peerRects.map(({ datum }) => datum.datum.category));
            for (const category of represented) {
              assert.equal(
                peerRects.filter(({ datum }) => datum.datum.category === category).length,
                internalCounts[layerIndex],
                'Every represented category retains all internal series',
              );
            }
          }
          for (const category of categories) {
            const group = rects.filter(({ datum }) => datum.datum.category === category);
            assertCrossAxisSeparated(
              group,
              orientation,
              `${orientation} ${internalCounts} ${category}`,
            );
          }
        }
      }
    }
  }
});
