import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '../.tmp/src/complete.js';
import {
  createBarVirtualizationController,
  executePortableBarVirtualization,
} from '../.tmp/src/data/bar-virtualization.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

test('bar compiler aggregates weighted counts and exposes deterministic rank changes', () => {
  const { scene } = compile({
    data: [
      { id: 'a1', category: 'A', value: 1, weight: 2 },
      { id: 'a2', category: 'A', value: 1, weight: 3 },
      { id: 'b1', category: 'B', value: 1, weight: 4 },
    ],
    mark: {
      type: 'bar',
      fields: { category: 'category', value: 'value', weight: 'weight', id: 'id' },
      options: {
        aggregate: 'weighted-count',
        rank: true,
        sortDirection: 'descending',
        previousRanks: { A: 2, B: 1 },
      },
    },
    x: { field: 'category', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const marks = flattenScene(scene.root).filter(({ id }) => id.includes(':ranked-bar:'));
  assert.equal(marks.length, 2);
  assert.deepEqual(
    marks.map(({ datum }) => [
      datum.tooltip.category,
      datum.tooltip.value,
      datum.tooltip.rankChange,
    ]),
    [
      ['A', 5, 1],
      ['B', 4, -1],
    ],
  );
  assert.deepEqual(marks[0].datum.datum.sourceIds, ['a1', 'a2']);
});

test('bar virtualization controller bounds mutable rows, reuses windows, and reports live rank changes', () => {
  const source = Array.from({ length: 6 }, (_, index) => ({
    id: `row-${index}`,
    category: String.fromCharCode(65 + index),
    value: 6 - index,
  }));
  const controller = createBarVirtualizationController(source, {
    key: 'id',
    category: 'category',
    value: 'value',
    maxRows: 6,
    windowRows: 3,
    overscanRows: 1,
  });
  assert.equal(controller.state().retainedRows, 6);
  assert.ok(controller.window().rows.length <= 5);

  const navigated = controller.navigate('ArrowDown');
  assert.equal(navigated.window.activeIndex, 1);
  assert.equal(navigated.state.last.recomputedRanks, 0);
  assert.deepEqual(navigated.state.last.rankChanges, []);
  assert.equal(navigated.state.last.reusedWindowRows, navigated.window.rows.length);

  const ascending = controller.sort('ascending');
  assert.deepEqual(
    ascending.snapshot.ranked.map(({ id }) => id),
    ['F', 'E', 'D', 'C', 'B', 'A'],
  );
  assert.equal(ascending.window.activeId, 'B');
  assert.equal(ascending.window.activeIndex, 4);
  assert.equal(ascending.state.last.recomputedRanks, 6);
  assert.deepEqual(
    ascending.state.last.rankChanges.find(({ id }) => id === 'F'),
    { id: 'F', previousRank: 6, rank: 1, change: 5 },
  );
  const descending = controller.sort('descending');
  assert.deepEqual(
    descending.snapshot.ranked.map(({ id }) => id),
    ['A', 'B', 'C', 'D', 'E', 'F'],
  );
  assert.equal(descending.window.activeId, 'B');
  assert.equal(descending.window.activeIndex, 1);
  assert.equal(descending.state.last.action, 'sort');

  const updated = controller.upsert([{ id: 'row-5', value: 10 }]);
  assert.equal(updated.state.last.updatedRows, 1);
  assert.equal(updated.state.last.reusedRetainedRows, 5);
  assert.ok(updated.window.rows.length <= updated.state.maxMaterializedRows);
  assert.deepEqual(
    updated.state.last.rankChanges.find(({ id }) => id === 'F'),
    { id: 'F', previousRank: 6, rank: 1, change: 5 },
  );
  assert.equal(updated.snapshot.ranked[0].id, 'F');

  const appended = controller.append([
    { id: 'row-6', category: 'G', value: 9 },
    { id: 'row-7', category: 'H', value: 8 },
  ]);
  assert.equal(appended.state.retainedRows, 6);
  assert.equal(appended.state.last.evictedRows, 2);
  assert.ok(appended.window.rows.length <= 5);
  assert.doesNotThrow(() => structuredClone(appended.snapshot));
  assert.throws(
    () =>
      executePortableBarVirtualization({
        previous: appended.snapshot,
        options: { key: 'other', category: 'category', value: 'value' },
        action: { type: 'navigate', command: 'Home' },
      }),
    /options are immutable/,
  );
});

test('bubble compiler uses proportional area, explicit negative/zero policies, and a truthful size guide', () => {
  const { scene } = compile({
    data: [
      { x: 1, y: 1, size: -4 },
      { x: 2, y: 2, size: 0 },
      { x: 3, y: 3, size: 16 },
    ],
    mark: {
      type: 'bubble',
      fields: { size: 'size' },
      options: {
        negativeSize: 'absolute',
        zeroSize: 'zero',
        minRadius: 0,
        maxRadius: 20,
        sizeGuide: true,
      },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  const bubbles = nodes.filter(({ id }) => id.includes(':bubble:'));
  assert.equal(bubbles.length, 3);
  assert.equal(bubbles.find(({ datum }) => datum.rowIndex === 1).radius, 0);
  const small = bubbles.find(({ datum }) => datum.rowIndex === 0).datum.tooltip;
  const large = bubbles.find(({ datum }) => datum.rowIndex === 2).datum.tooltip;
  assert.ok(large.area > small.area);
  assert.equal(nodes.filter(({ id }) => id.includes(':size-guide:')).length, 3);

  assert.throws(
    () =>
      compile({
        data: [{ x: 1, y: 1, size: -1 }],
        mark: { type: 'bubble', fields: { size: 'size' } },
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
      }),
    /Negative bubble sizes/,
  );
});

test('calendar compiler renders every range mode with week-start, timezone, leap, zero, missing, and month-boundary metadata', () => {
  for (const mode of ['year', 'month', 'week', 'day']) {
    const { scene } = compile({
      data: [
        { date: '2024-02-28T12:00:00Z', value: 0 },
        { date: '2024-02-29T12:00:00Z', value: 5 },
        { date: '2024-03-02T12:00:00Z', value: 2 },
      ],
      mark: {
        type: 'calendar',
        fields: { date: 'date', value: 'value' },
        options: { mode, weekStart: 0, timeZone: 'UTC', missing: 'explicit' },
      },
      x: { field: 'date', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
    });
    const nodes = flattenScene(scene.root);
    const cells = nodes.filter(({ id }) => id.includes(':calendar:'));
    assert.ok(cells.length >= (mode === 'day' ? 3 : 7), `${mode} cell range`);
    assert.ok(cells.some(({ datum }) => datum?.tooltip?.leapDay === true));
    assert.ok(cells.some(({ datum }) => datum?.tooltip?.monthBoundary === true));
    assert.ok(nodes.some(({ id }) => id.includes(':calendar-missing:')));
    assert.ok(cells.some(({ datum }) => datum?.tooltip?.value === 0));
  }
});

test('calendar compiler renders locale and timezone semantics into weekday headers and civil-date cells', () => {
  const compileCalendar = (locale, options = {}) =>
    compile({
      data: [{ date: '2026-01-01T12:30:00Z', value: 7 }],
      locale,
      mark: {
        type: 'calendar',
        fields: { date: 'date', value: 'value' },
        options: { mode: 'week', timeZone: 'UTC', ...options },
      },
      x: { field: 'date', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
    }).scene;
  const weekdayHeaders = (scene) =>
    flattenScene(scene.root)
      .filter(({ id }) => id.includes(':calendar-weekday:'))
      .sort((left, right) => left.y - right.y);

  const usScene = compileCalendar('en-US');
  const gbScene = compileCalendar('en-GB');
  const usHeaders = weekdayHeaders(usScene);
  const gbHeaders = weekdayHeaders(gbScene);
  assert.equal(usHeaders.length, 7);
  assert.equal(gbHeaders.length, 7);
  assert.ok(usHeaders[0].id.endsWith(':calendar-weekday:0'));
  assert.ok(gbHeaders[0].id.endsWith(':calendar-weekday:1'));
  assert.equal(
    usHeaders[0].text,
    new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
      Date.UTC(2024, 0, 7, 12),
    ),
  );
  assert.equal(
    gbHeaders[0].text,
    new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
      Date.UTC(2024, 0, 8, 12),
    ),
  );
  const usCell = flattenScene(usScene.root).find(({ id }) => id.includes(':calendar:2026-01-01'));
  const gbCell = flattenScene(gbScene.root).find(({ id }) => id.includes(':calendar:2026-01-01'));
  assert.ok(usCell.y > gbCell.y);
  assert.equal(usCell.datum.tooltip.weekStart, 0);
  assert.equal(gbCell.datum.tooltip.weekStart, 1);

  const overrideHeaders = weekdayHeaders(compileCalendar('en-US', { weekStart: 3 }));
  assert.ok(overrideHeaders[0].id.endsWith(':calendar-weekday:3'));

  const timezoneScene = compileCalendar('ko-KR', {
    mode: 'day',
    timeZone: 'Pacific/Kiritimati',
  });
  const timezoneCell = flattenScene(timezoneScene.root).find(({ id }) =>
    id.includes(':calendar:2026-01-02'),
  );
  const timezoneHeaders = weekdayHeaders(timezoneScene);
  assert.ok(timezoneHeaders[0].id.endsWith(':calendar-weekday:0'));
  assert.equal(
    timezoneHeaders[0].text,
    new Intl.DateTimeFormat('ko-KR', {
      weekday: 'short',
      timeZone: 'Pacific/Kiritimati',
    }).format(Date.UTC(2024, 0, 13, 12)),
  );
  assert.ok(timezoneCell);
  assert.equal(timezoneCell.datum.tooltip.locale, 'ko-KR');
  assert.equal(timezoneCell.datum.tooltip.timeZone, 'Pacific/Kiritimati');
  assert.equal(timezoneCell.datum.tooltip.weekStart, 0);
  assert.equal(timezoneCell.datum.tooltip.value, 7);
});

test('candlestick compiler aggregates OHLCV, separates sessions, uses a gapless trading axis, and renders a navigator', () => {
  const hour = 3_600_000;
  const start = Date.UTC(2026, 0, 5, 9);
  const data = [
    { time: start, open: 10, high: 12, low: 9, close: 11, volume: 5 },
    { time: start + hour / 2, open: 11, high: 13, low: 10, close: 12, volume: 7 },
    { time: start + (hour * 3) / 4, open: 12, high: 14, low: 11, close: 13, volume: 8 },
    { time: start + hour * 3, open: 12, high: 14, low: 11, close: 13, volume: 9 },
  ];
  const { scene } = compile({
    data,
    mark: {
      type: 'candlestick',
      fields: { open: 'open', high: 'high', low: 'low', close: 'close', volume: 'volume' },
      options: {
        aggregateIntervalMs: hour,
        timeZone: 'UTC',
        sessionStartMinute: 9 * 60 + 30,
        sessionEndMinute: 11 * 60,
        extendedHours: 'separate',
        navigator: true,
        navigatorStart: 0,
        navigatorEnd: 3,
      },
    },
    x: { field: 'time', type: 'temporal' },
    y: { field: 'close', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  const bodies = nodes.filter(({ id }) => id.includes(':ohlc:'));
  assert.ok(bodies.length >= 2);
  assert.ok(bodies.every(({ datum }, index) => datum.tooltip.tradingIndex === index));
  assert.ok(bodies.some(({ datum }) => datum.tooltip.sourceRows.includes(',')));
  const regularBody = bodies.find(({ datum }) => datum.tooltip.extended === false);
  const extendedBody = bodies.find(({ datum }) => datum.tooltip.extended === true);
  assert.equal(regularBody.opacity, 1);
  assert.equal(extendedBody.opacity, 0.45);
  assert.notEqual(regularBody.x, extendedBody.x);
  assert.ok(nodes.some(({ id }) => id.endsWith(':navigator-track')));
  assert.ok(nodes.some(({ id }) => id.endsWith(':navigator-window')));

  const weekendSpec = {
    data: [
      {
        time: '2026-01-03T10:00:00Z',
        open: 10,
        high: 12,
        low: 9,
        close: 11,
      },
    ],
    mark: {
      type: 'candlestick',
      fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
      options: { aggregateIntervalMs: 3_600_000, timeZone: 'UTC', extendedHours: 'include' },
    },
    x: { field: 'time', type: 'temporal' },
    y: { field: 'close', type: 'quantitative' },
  };
  assert.equal(
    flattenScene(compile(weekendSpec).scene.root).filter(({ id }) => id.includes(':ohlc:')).length,
    0,
  );
  const included = compile({
    ...weekendSpec,
    mark: {
      ...weekendSpec.mark,
      options: { ...weekendSpec.mark.options, includedDates: ['2026-01-03'] },
    },
  });
  assert.equal(
    flattenScene(included.scene.root).filter(({ id }) => id.includes(':ohlc:')).length,
    1,
  );

  const sessions = [Date.UTC(2026, 0, 2, 12), Date.UTC(2026, 0, 5, 12), Date.UTC(2026, 0, 6, 12)];
  const navigated = compile({
    width: 660,
    height: 400,
    data: sessions.map((time, index) => ({
      time,
      open: 10 + index,
      high: 12 + index,
      low: 9 + index,
      close: 11 + index,
    })),
    mark: {
      type: 'candlestick',
      fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
      options: {
        aggregateIntervalMs: 86_400_000,
        timeZone: 'UTC',
        extendedHours: 'include',
        navigator: true,
        navigatorStart: 1,
        navigatorEnd: 3,
      },
    },
    x: { field: 'time', type: 'temporal' },
    y: { field: 'close', type: 'quantitative' },
  });
  const navigatedBodies = flattenScene(navigated.scene.root).filter(({ id }) =>
    id.includes(':ohlc:'),
  );
  const tradingAxis = navigated.coordinates.axes.x;
  assert.equal(navigatedBodies.length, 2);
  assert.deepEqual(
    tradingAxis.ticks(10).map(({ value }) => value),
    navigatedBodies.map(({ datum }) => datum.tooltip.time),
  );
  assert.ok(
    navigatedBodies.every(
      ({ x, width, datum }) => Math.abs(x + width / 2 - tradingAxis.map(datum.tooltip.time)) < 1e-9,
    ),
  );
  assert.equal(
    navigatedBodies[1].x - navigatedBodies[0].x,
    Math.abs(tradingAxis.range()[1] - tradingAxis.range()[0]) / 2,
  );
  assert.deepEqual(tradingAxis.domain(), [
    navigatedBodies[0].datum.tooltip.time,
    navigatedBodies[1].datum.tooltip.time,
  ]);
});

test('difference compiler aligns baseline/comparison, applies percentage policy, and inserts exact crossings', () => {
  const { scene } = compile({
    data: [
      { x: 0, baseline: 10, comparison: 5 },
      { x: 1, baseline: 10, comparison: 15 },
      { x: 2, baseline: 20, comparison: 30 },
    ],
    mark: {
      type: 'diff',
      fields: { baseline: 'baseline', comparison: 'comparison' },
      options: { policy: 'percent', interpolateCrossings: true },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'comparison', type: 'quantitative' },
  });
  const points = flattenScene(scene.root).filter(({ id }) => id.includes(':difference:'));
  assert.equal(points.length, 4);
  const crossing = points.find(({ datum }) => datum.tooltip.crossing === true).datum.tooltip;
  assert.equal(crossing.difference, 0);
  assert.equal(crossing.policy, 'percent');
  assert.deepEqual(crossing.sourceRows, '0, 1');

  const temporal = compile({
    data: [
      { x: '2026-01-01', baseline: 10, comparison: 5 },
      { x: '2026-01-03', baseline: 10, comparison: 15 },
    ],
    mark: {
      type: 'diff',
      fields: { baseline: 'baseline', comparison: 'comparison' },
      options: { interpolateCrossings: true },
    },
    x: { field: 'x', type: 'temporal' },
    y: { field: 'comparison', type: 'quantitative' },
  });
  const temporalPoints = flattenScene(temporal.scene.root).filter(({ id }) =>
    id.includes(':difference:'),
  );
  assert.equal(temporalPoints.length, 3);
  assert.equal(
    temporalPoints.find(({ datum }) => datum.tooltip.crossing).datum.tooltip.key,
    Date.parse('2026-01-02'),
  );

  const long = compile({
    data: [
      { x: 0, series: 'base', value: 100 },
      { x: 0, series: 'compare', value: 10 },
      { x: 1, series: 'base', value: 100 },
      { x: 1, series: 'compare', value: 15 },
    ],
    mark: {
      type: 'diff',
      fields: { series: 'series', value: 'value' },
      options: { baselineSeries: 'base', comparisonSeries: 'compare' },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  });
  const longNodes = flattenScene(long.scene.root);
  const longPoints = longNodes.filter(({ id }) => id.includes(':difference:'));
  assert.deepEqual(
    longPoints.map(({ datum }) => [
      datum.tooltip.baseline,
      datum.tooltip.comparison,
      datum.tooltip.sourceRows,
    ]),
    [
      [100, 10, '0, 1'],
      [100, 15, '2, 3'],
    ],
  );
  const longGroup = long.scene.root.children.find(
    ({ type, id }) => type === 'group' && id.endsWith(':group'),
  );
  const area = longNodes.find(({ id }) => id.includes(':difference-area:'));
  assert.ok(
    area.points.every(
      ({ y }) => y >= longGroup.clip.y && y <= longGroup.clip.y + longGroup.clip.height,
    ),
  );
});

test('difference compiler leaves skipped and dropped keys as true discontinuities', () => {
  const skipped = compile({
    data: [
      { x: 0, baseline: 10, comparison: 5 },
      { x: 1, baseline: 0, comparison: 1 },
      { x: 2, baseline: 10, comparison: 15 },
    ],
    mark: {
      type: 'diff',
      fields: { baseline: 'baseline', comparison: 'comparison' },
      options: {
        policy: 'percent',
        zeroBaseline: 'skip',
        interpolateCrossings: true,
      },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'comparison', type: 'quantitative' },
  });
  const skippedNodes = flattenScene(skipped.scene.root);
  assert.deepEqual(
    skippedNodes
      .filter(({ id }) => id.includes(':difference:'))
      .map(({ datum }) => [datum.tooltip.key, datum.tooltip.crossing]),
    [
      [0, false],
      [2, false],
    ],
  );
  assert.equal(skippedNodes.filter(({ id }) => id.includes(':difference-area:')).length, 0);

  const dropped = compile({
    data: [
      { x: 0, series: 'base', value: 10 },
      { x: 0, series: 'compare', value: 5 },
      { x: 1, series: 'base', value: 10 },
      { x: 2, series: 'base', value: 10 },
      { x: 2, series: 'compare', value: 15 },
    ],
    mark: {
      type: 'diff',
      fields: { series: 'series', value: 'value' },
      options: {
        baselineSeries: 'base',
        comparisonSeries: 'compare',
        unmatched: 'drop',
        interpolateCrossings: true,
      },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  });
  const droppedNodes = flattenScene(dropped.scene.root);
  assert.deepEqual(
    droppedNodes
      .filter(({ id }) => id.includes(':difference:'))
      .map(({ datum }) => [datum.tooltip.key, datum.tooltip.crossing]),
    [
      [0, false],
      [2, false],
    ],
  );
  assert.equal(droppedNodes.filter(({ id }) => id.includes(':difference-area:')).length, 0);
});

test('interval compiler estimates all six interval kinds and horizontal provenance from raw rows', () => {
  for (const kind of ['CI', 'PI', 'SE', 'SD', 'IQR', 'HDI']) {
    const { scene } = compile({
      data: [
        { group: 'A', value: 1 },
        { group: 'A', value: 2 },
        { group: 'A', value: 4 },
        { group: 'B', value: 5 },
        { group: 'B', value: 8 },
      ],
      mark: { type: 'interval', options: { rawEstimator: true, kind } },
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    });
    const estimates = flattenScene(scene.root).filter(({ id }) => id.endsWith(':estimate'));
    assert.equal(estimates.length, 2);
    assert.ok(estimates.every(({ datum }) => datum.tooltip.kind === kind));
    assert.ok(estimates.every(({ datum }) => datum.tooltip.sourceRows.length > 0));
  }

  const horizontal = compile({
    data: [
      { value: 1, group: 'A' },
      { value: 3, group: 'A' },
    ],
    mark: {
      type: 'interval',
      options: { rawEstimator: true, kind: 'IQR', orientation: 'horizontal' },
    },
    x: { field: 'value', type: 'quantitative' },
    y: { field: 'group', type: 'nominal' },
  });
  assert.ok(flattenScene(horizontal.scene.root).some(({ id }) => id.endsWith(':estimate')));

  for (const orientation of ['vertical', 'horizontal']) {
    const valueAxis = orientation === 'vertical' ? 'y' : 'x';
    const result = compile({
      width: 640,
      height: 360,
      data: [
        { group: 'A', value: 0 },
        { group: 'A', value: 100 },
      ],
      mark: {
        type: 'interval',
        options: { rawEstimator: true, kind: 'PI', confidence: 0.92, orientation },
      },
      x:
        valueAxis === 'x'
          ? { field: 'value', type: 'quantitative' }
          : { field: 'group', type: 'nominal' },
      y:
        valueAxis === 'y'
          ? { field: 'value', type: 'quantitative' }
          : { field: 'group', type: 'nominal' },
    });
    const nodes = flattenScene(result.scene.root);
    const group = result.scene.root.children.find(
      ({ type, id }) => type === 'group' && id.endsWith(':group'),
    );
    const range = nodes.find(({ id }) => id.endsWith(':estimated-interval:0:range'));
    if (orientation === 'vertical') {
      assert.ok(range.y1 >= group.clip.y && range.y1 <= group.clip.y + group.clip.height);
      assert.ok(range.y2 >= group.clip.y && range.y2 <= group.clip.y + group.clip.height);
    } else {
      assert.ok(range.x1 >= group.clip.x && range.x1 <= group.clip.x + group.clip.width);
      assert.ok(range.x2 >= group.clip.x && range.x2 <= group.clip.x + group.clip.width);
    }
  }
});

test('line compiler enforces duplicate and implicit sort policy while retaining source rows', () => {
  const { scene } = compile({
    data: [
      { x: 2, y: 4 },
      { x: 1, y: 1 },
      { x: 2, y: 6 },
    ],
    mark: { type: 'line', options: { duplicates: 'mean', sortPolicy: 'ascending' } },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  const points = flattenScene(scene.root).filter(({ id }) => id.includes(':ordered-line-point:'));
  assert.deepEqual(
    points.map(({ datum }) => datum.tooltip.value),
    [1, 5],
  );
  assert.equal(points[1].datum.tooltip.sourceRows, '0, 2');

  assert.throws(
    () =>
      compile({
        data: [
          { x: 2, y: 2 },
          { x: 1, y: 1 },
        ],
        mark: { type: 'line', options: { sortPolicy: 'error' } },
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
      }),
    /not ascending/,
  );

  const chronological = compile({
    data: [
      { x: '12/31/2025', y: 1 },
      { x: '1/1/2026', y: 2 },
    ],
    mark: { type: 'line', options: { sortPolicy: 'error' } },
    x: { field: 'x', type: 'temporal' },
    y: { field: 'y', type: 'quantitative' },
  });
  const chronologicalPath = flattenScene(chronological.scene.root).find(({ id }) =>
    id.endsWith(':ordered-line'),
  );
  assert.ok(chronologicalPath.points[0].x < chronologicalPath.points[1].x);

  const instant = Date.parse('2026-01-01T00:00:00.000Z');
  const canonical = compile({
    data: [
      { x: new Date(instant), y: 1 },
      { x: '2026-01-01T00:00:00.000Z', y: 3 },
      { x: instant, y: 5 },
      { x: '2026-01-02T00:00:00.000Z', y: 2 },
    ],
    mark: { type: 'line', options: { duplicates: 'mean', sortPolicy: 'ascending' } },
    x: { field: 'x', type: 'temporal' },
    y: { field: 'y', type: 'quantitative' },
  });
  const canonicalPoints = flattenScene(canonical.scene.root).filter(({ id }) =>
    id.includes(':ordered-line-point:'),
  );
  assert.deepEqual(
    canonicalPoints.map(({ datum }) => [datum.tooltip.key, datum.tooltip.value]),
    [
      [instant, 3],
      [Date.parse('2026-01-02T00:00:00.000Z'), 2],
    ],
  );
  assert.equal(canonicalPoints[0].datum.tooltip.sourceRows, '0, 1, 2');
});

test('waterfall compiler honors explicit relative, absolute, subtotal, and total rows', () => {
  const { scene } = compile({
    data: [
      { label: 'start', value: 10, kind: 'absolute' },
      { label: 'gain', value: 5, kind: 'relative' },
      { label: 'subtotal', value: 0, kind: 'subtotal' },
      { label: 'final', value: 20, kind: 'total' },
    ],
    mark: { type: 'waterfall', fields: { kind: 'kind' }, options: { explicitSemantics: true } },
    x: { field: 'label', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const steps = flattenScene(scene.root).filter(({ id }) => id.includes(':semantic-waterfall:'));
  assert.deepEqual(
    steps.map(({ datum }) => datum.tooltip.kind),
    ['absolute', 'relative', 'subtotal', 'total'],
  );
  assert.deepEqual(
    steps.map(({ datum }) => [datum.tooltip.start, datum.tooltip.end]),
    [
      [0, 10],
      [10, 15],
      [10, 15],
      [0, 20],
    ],
  );
});
