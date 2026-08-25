import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateOhlc,
  areaRadius,
  areaSizeGuide,
  calendarCells,
  calendarWeekdayLabels,
  calendarWeekStart,
  differenceSeries,
  estimateInterval,
  navigatorWindow,
  prepareOrderedSeries,
  rugStrip,
  sharedHistogramBins,
  waterfallSteps,
  weightedBoxSummary,
  weightedCount,
} from '../.tmp/src/data/family-analytics.js';

test('weighted count and absolute-area bubble sizing expose explicit policies and guide values', () => {
  assert.equal(
    weightedCount(
      [
        { category: 'a', weight: 1.5 },
        { category: 'b', weight: 2.5 },
      ],
      'weight',
    ),
    4,
  );
  const radius = areaRadius(25, [0, 100], { minRadius: 0, maxRadius: 20 });
  assert.ok(radius !== null && Math.abs(Math.PI * radius * radius - Math.PI * 100) < 1e-9);
  assert.equal(areaRadius(-1, [0, 10], { negative: 'hide' }), null);
  assert.equal(areaRadius(0, [0, 10], { zero: 'zero' }), 0);
  assert.throws(() => areaRadius(-1, [0, 10]), /Negative bubble sizes/);
  const guide = areaSizeGuide([0, 100], { minRadius: 0, maxRadius: 20, count: 3 });
  assert.deepEqual(
    guide.map(({ value }) => value),
    [0, 50, 100],
  );
  assert.ok(guide[2].area > guide[1].area && guide[1].area > guide[0].area);
});

test('calendar cells support mode, week start, time zone, leap, missing, zero, and month boundaries', () => {
  const cells = calendarCells(
    [
      { date: '2024-02-28T23:00:00Z', value: 2 },
      { date: '2024-02-29T23:00:00Z', value: 0 },
    ],
    {
      dateField: 'date',
      valueField: 'value',
      mode: 'month',
      weekStart: 1,
      timeZone: 'UTC',
      missing: 'zero',
    },
  );
  assert.equal(cells.length, 29);
  assert.equal(cells[0].monthBoundary, true);
  assert.equal(cells.find(({ date }) => date === '2024-02-29').leapDay, true);
  assert.equal(cells.find(({ date }) => date === '2024-02-27').value, 0);
  assert.equal(cells.find(({ date }) => date === '2024-02-29').value, 0);
  assert.equal(cells.find(({ date }) => date === '2024-02-28').value, 2);
});

test('calendar locale resolves week starts, localized labels, explicit overrides, and timezone civil dates', () => {
  assert.equal(calendarWeekStart({ locale: 'en-US' }), 0);
  assert.equal(calendarWeekStart({ locale: 'en-GB' }), 1);
  assert.equal(calendarWeekStart({ locale: 'ko-KR' }), 0);
  assert.equal(calendarWeekStart({ locale: 'en-US', weekStart: 3 }), 3);

  const usLabels = calendarWeekdayLabels({ locale: 'en-US', timeZone: 'UTC' });
  const gbLabels = calendarWeekdayLabels({ locale: 'en-GB', timeZone: 'UTC' });
  assert.equal(usLabels[0].weekday, 0);
  assert.equal(gbLabels[0].weekday, 1);
  assert.equal(
    usLabels[0].label,
    new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
      Date.UTC(2024, 0, 7, 12),
    ),
  );
  assert.equal(
    gbLabels[0].label,
    new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
      Date.UTC(2024, 0, 8, 12),
    ),
  );

  const instant = [{ date: '2026-01-01T12:30:00Z', value: 7 }];
  const utc = calendarCells(instant, {
    dateField: 'date',
    valueField: 'value',
    mode: 'day',
    timeZone: 'UTC',
  });
  const kiritimati = calendarCells(instant, {
    dateField: 'date',
    valueField: 'value',
    mode: 'day',
    timeZone: 'Pacific/Kiritimati',
  });
  assert.deepEqual(
    utc.map(({ date, value }) => [date, value]),
    [['2026-01-01', 7]],
  );
  assert.deepEqual(
    kiritimati.map(({ date, value }) => [date, value]),
    [['2026-01-02', 7]],
  );
});

test('calendar locale keeps deterministic region week starts without Intl.Locale week information', () => {
  const Locale = Intl.Locale;
  try {
    Intl.Locale = undefined;
    assert.equal(calendarWeekStart({ locale: 'en-US' }), 0);
    assert.equal(calendarWeekStart({ locale: 'en-GB' }), 1);
    assert.equal(calendarWeekStart({ locale: 'ko-KR' }), 0);
    assert.equal(calendarWeekStart({ locale: 'ar-EG' }), 6);
    assert.equal(calendarWeekStart({ locale: 'dv-MV' }), 5);
  } finally {
    Intl.Locale = Locale;
  }
});

test('OHLC aggregation applies session policy, produces a gapless axis, and exposes a navigator window', () => {
  const rows = [
    { time: '2026-01-02T14:29:00Z', price: 9, volume: 2 },
    { time: '2026-01-02T14:30:10Z', price: 10, volume: 3 },
    { time: '2026-01-02T14:30:40Z', price: 12, volume: 4 },
    { time: '2026-01-02T14:31:10Z', price: 11, volume: 5 },
  ];
  const aggregated = aggregateOhlc(rows, {
    timeField: 'time',
    priceField: 'price',
    volumeField: 'volume',
    intervalMs: 60_000,
    timeZone: 'America/New_York',
    session: { startMinute: 9 * 60 + 30, endMinute: 16 * 60 },
    extendedHours: 'exclude',
  });
  assert.deepEqual(
    aggregated.map(({ tradingIndex, open, high, low, close, volume, sourceRows }) => ({
      tradingIndex,
      open,
      high,
      low,
      close,
      volume,
      sourceRows,
    })),
    [
      { tradingIndex: 0, open: 10, high: 12, low: 10, close: 12, volume: 7, sourceRows: [1, 2] },
      { tradingIndex: 1, open: 11, high: 11, low: 11, close: 11, volume: 5, sourceRows: [3] },
    ],
  );
  assert.deepEqual(navigatorWindow(aggregated.length, -4, 1.2), [0, 2]);
  const separated = aggregateOhlc(rows, {
    timeField: 'time',
    priceField: 'price',
    volumeField: 'volume',
    intervalMs: 60 * 60_000,
    timeZone: 'America/New_York',
    session: { startMinute: 9 * 60 + 30, endMinute: 16 * 60 },
    extendedHours: 'separate',
  });
  assert.deepEqual(
    separated.map(({ extended, sourceRows, tradingIndex }) => ({
      extended,
      sourceRows,
      tradingIndex,
    })),
    [
      { extended: true, sourceRows: [0], tradingIndex: 0 },
      { extended: false, sourceRows: [1, 2, 3], tradingIndex: 1 },
    ],
  );

  const localDays = [
    { time: '2026-01-03T01:00:00Z', price: 10 },
    { time: '2026-01-03T15:00:00Z', price: 20 },
  ];
  const daily = aggregateOhlc(localDays, {
    timeField: 'time',
    priceField: 'price',
    intervalMs: 86_400_000,
    timeZone: 'America/New_York',
    session: { startMinute: 9 * 60 + 30, endMinute: 16 * 60 },
    tradingDays: [0, 1, 2, 3, 4, 5, 6],
    extendedHours: 'include',
  });
  assert.deepEqual(
    daily.map(({ sourceRows }) => sourceRows),
    [[0], [1]],
    'daily buckets must follow local civil trading dates rather than UTC epoch days',
  );
  const weekendClosed = aggregateOhlc(localDays, {
    timeField: 'time',
    priceField: 'price',
    intervalMs: 86_400_000,
    timeZone: 'America/New_York',
    extendedHours: 'include',
  });
  assert.deepEqual(
    weekendClosed.flatMap(({ sourceRows }) => sourceRows),
    [0],
  );
  const weekendOverride = aggregateOhlc(localDays, {
    timeField: 'time',
    priceField: 'price',
    intervalMs: 86_400_000,
    timeZone: 'America/New_York',
    includedDates: ['2026-01-03'],
    extendedHours: 'include',
  });
  assert.deepEqual(
    weekendOverride.flatMap(({ sourceRows }) => sourceRows),
    [0, 1],
  );
  const overnight = aggregateOhlc(
    [
      { time: '2026-01-02T23:00:00Z', price: 10 },
      { time: '2026-01-03T01:00:00Z', price: 12 },
    ],
    {
      timeField: 'time',
      priceField: 'price',
      intervalMs: 86_400_000,
      timeZone: 'UTC',
      session: { startMinute: 22 * 60, endMinute: 2 * 60 },
      extendedHours: 'exclude',
    },
  );
  assert.deepEqual(
    overnight.map(({ open, close, extended, sourceRows }) => ({
      open,
      close,
      extended,
      sourceRows,
    })),
    [{ open: 10, close: 12, extended: false, sourceRows: [0, 1] }],
  );
});

test('difference policies align values and interpolate numeric crossings', () => {
  const points = differenceSeries(
    [
      { x: 0, baseline: 10, comparison: 5 },
      { x: 10, baseline: 10, comparison: 15 },
    ],
    {
      keyField: 'x',
      baselineField: 'baseline',
      comparisonField: 'comparison',
      policy: 'percent',
      interpolateCrossings: true,
    },
  );
  assert.equal(points.length, 3);
  assert.deepEqual(
    points.map(({ key, difference }) => [key, difference]),
    [
      [0, -50],
      [5, 0],
      [10, 50],
    ],
  );
  assert.equal(points[1].crossing, true);
  assert.deepEqual(points[1].sourceRows, [0, 1]);

  const long = [
    { x: 0, series: 'baseline', value: 10 },
    { x: 1, series: 'comparison', value: 15 },
    { x: 0, series: 'comparison', value: 12 },
    { x: 2, series: 'baseline', value: 20 },
  ];
  assert.throws(
    () =>
      differenceSeries(long, {
        keyField: 'x',
        seriesField: 'series',
        valueField: 'value',
        baselineSeries: 'baseline',
        comparisonSeries: 'comparison',
      }),
    /Unmatched difference series key/u,
  );
  assert.deepEqual(
    differenceSeries(long, {
      keyField: 'x',
      seriesField: 'series',
      valueField: 'value',
      baselineSeries: 'baseline',
      comparisonSeries: 'comparison',
      unmatched: 'zero',
    }).map(({ key, baseline, comparison, sourceRows }) => [key, baseline, comparison, sourceRows]),
    [
      [0, 10, 12, [0, 2]],
      [1, 0, 15, [1]],
      [2, 20, 0, [3]],
    ],
  );
  assert.throws(
    () =>
      differenceSeries([{ x: 0, baseline: 0, comparison: 2 }], {
        keyField: 'x',
        baselineField: 'baseline',
        comparisonField: 'comparison',
        policy: 'percent',
      }),
    /zero baseline/u,
  );
  assert.deepEqual(
    differenceSeries([{ x: 0, baseline: 0, comparison: 2 }], {
      keyField: 'x',
      baselineField: 'baseline',
      comparisonField: 'comparison',
      policy: 'relative',
      zeroBaseline: 'absolute',
    }).map(({ difference }) => difference),
    [2],
  );
});

test('difference interpolation preserves gaps created by skip and drop policies', () => {
  const skippedZero = differenceSeries(
    [
      { x: 0, baseline: 10, comparison: 5 },
      { x: 1, baseline: 0, comparison: 1 },
      { x: 2, baseline: 10, comparison: 15 },
    ],
    {
      keyField: 'x',
      baselineField: 'baseline',
      comparisonField: 'comparison',
      policy: 'percent',
      zeroBaseline: 'skip',
      interpolateCrossings: true,
    },
  );
  assert.deepEqual(
    skippedZero.map(({ key, crossing, continuousFromPrevious }) => ({
      key,
      crossing: crossing ?? false,
      continuousFromPrevious,
    })),
    [
      { key: 0, crossing: false, continuousFromPrevious: false },
      { key: 2, crossing: false, continuousFromPrevious: false },
    ],
  );

  const droppedUnmatched = differenceSeries(
    [
      { x: 0, series: 'base', value: 10 },
      { x: 0, series: 'compare', value: 5 },
      { x: 1, series: 'base', value: 10 },
      { x: 2, series: 'base', value: 10 },
      { x: 2, series: 'compare', value: 15 },
    ],
    {
      keyField: 'x',
      seriesField: 'series',
      valueField: 'value',
      baselineSeries: 'base',
      comparisonSeries: 'compare',
      unmatched: 'drop',
      interpolateCrossings: true,
    },
  );
  assert.deepEqual(
    droppedUnmatched.map(({ key, crossing, continuousFromPrevious }) => ({
      key,
      crossing: crossing ?? false,
      continuousFromPrevious,
    })),
    [
      { key: 0, crossing: false, continuousFromPrevious: false },
      { key: 2, crossing: false, continuousFromPrevious: false },
    ],
  );
});

test('shared bins, weighted notches, and seeded rug or strip layouts are deterministic', () => {
  const bins = sharedHistogramBins(
    [
      [
        { value: 0, weight: 2 },
        { value: 2, weight: 1 },
      ],
      [
        { value: 1, weight: 3 },
        { value: 2, weight: 4 },
      ],
    ],
    2,
  );
  assert.deepEqual(
    bins.map(({ counts }) => counts),
    [
      [1, 0],
      [1, 2],
    ],
  );
  assert.deepEqual(
    bins.map(({ weights }) => weights),
    [
      [2, 0],
      [1, 7],
    ],
  );
  const constantBins = sharedHistogramBins([[{ value: 5 }]], 2);
  assert.ok(constantBins.every(({ start, end }) => start < end));
  assert.deepEqual(
    constantBins.map(({ counts }) => counts),
    [[0], [1]],
  );
  const summary = weightedBoxSummary([
    { value: 1, weight: 1, rowIndex: 4 },
    { value: 2, weight: 2, rowIndex: 5 },
    { value: 8, weight: 1, rowIndex: 6 },
  ]);
  assert.equal(summary.median, 2);
  assert.deepEqual(summary.sourceRows, [4, 5, 6]);
  assert.ok(summary.notch[0] <= summary.median && summary.notch[1] >= summary.median);
  assert.deepEqual(
    rugStrip([1, 2, 3], { spread: 10, seed: 7 }),
    rugStrip([1, 2, 3], { spread: 10, seed: 7 }),
  );
  assert.deepEqual(
    rugStrip([1, 2], { spread: 0 }).map(({ offset }) => offset),
    [0, 0],
  );
});

test('raw interval estimation covers CI, PI, SE, SD, IQR, and HDI with orientation and provenance', () => {
  for (const kind of ['CI', 'PI', 'SE', 'SD', 'IQR', 'HDI']) {
    const interval = estimateInterval([1, 2, 3, 4, 5, Number.NaN], {
      kind,
      confidence: 0.8,
      estimator: kind === 'HDI' ? 'median' : 'mean',
      orientation: 'horizontal',
    });
    assert.equal(interval.kind, kind);
    assert.equal(interval.orientation, 'horizontal');
    assert.ok(interval.low <= interval.estimate || kind === 'HDI');
    assert.ok(interval.high >= interval.estimate || kind === 'HDI');
    assert.deepEqual(interval.sourceRows, [0, 1, 2, 3, 4]);
    assert.match(interval.summary, new RegExp(`^${kind}`));
  }
  const arbitrary = estimateInterval([1, 2, 3, 4, 5], {
    kind: 'CI',
    confidence: 0.92,
  });
  assert.ok(Math.abs(arbitrary.low - 1.762077) < 1e-5);
  assert.ok(Math.abs(arbitrary.high - 4.237923) < 1e-5);
});

test('line preparation makes sorting and duplicate policies explicit', () => {
  const rows = [
    { x: 2, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 4 },
  ];
  assert.throws(
    () => prepareOrderedSeries(rows, { keyField: 'x', valueField: 'y' }),
    /Duplicate series key/,
  );
  assert.deepEqual(
    prepareOrderedSeries(rows, {
      keyField: 'x',
      valueField: 'y',
      duplicates: 'mean',
      sort: 'ascending',
    }),
    [
      { key: 1, value: 3, sourceRows: [1] },
      { key: 2, value: 3, sourceRows: [0, 2] },
    ],
  );
  assert.throws(
    () =>
      prepareOrderedSeries(rows.slice(0, 2), {
        keyField: 'x',
        valueField: 'y',
        duplicates: 'first',
        sort: 'error',
      }),
    /not ascending/,
  );
});

test('waterfalls implement explicit relative, absolute, subtotal, and total semantics', () => {
  assert.deepEqual(
    waterfallSteps([
      { value: 10, kind: 'absolute', label: 'start' },
      { value: 3, kind: 'relative' },
      { value: 0, kind: 'subtotal' },
      { value: 20, kind: 'total' },
    ]).map(({ kind, start, end, change }) => ({ kind, start, end, change })),
    [
      { kind: 'absolute', start: 0, end: 10, change: 10 },
      { kind: 'relative', start: 10, end: 13, change: 3 },
      { kind: 'subtotal', start: 10, end: 13, change: 3 },
      { kind: 'total', start: 0, end: 20, change: 20 },
    ],
  );
});
