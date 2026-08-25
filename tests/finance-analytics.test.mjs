import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPriceBlocks, buildVolumeProfiles } from '../.tmp/src/data/finance-analytics.js';
import { compile } from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const bars = [
  {
    id: 'd0',
    time: Date.UTC(2026, 0, 1),
    open: 100,
    high: 102,
    low: 99,
    close: 100,
    volume: 10,
    session: 'A',
  },
  {
    id: 'd1',
    time: Date.UTC(2026, 0, 2),
    open: 100,
    high: 107,
    low: 100,
    close: 106,
    volume: 20,
    session: 'A',
  },
  {
    id: 'd2',
    time: Date.UTC(2026, 0, 3),
    open: 106,
    high: 113,
    low: 105,
    close: 112,
    volume: 30,
    session: 'A',
  },
  {
    id: 'd3',
    time: Date.UTC(2026, 0, 4),
    open: 112,
    high: 113,
    low: 103,
    close: 104,
    volume: 40,
    session: 'B',
  },
  {
    id: 'd4',
    time: Date.UTC(2026, 0, 5),
    open: 104,
    high: 105,
    low: 94,
    close: 95,
    volume: 50,
    session: 'B',
  },
  {
    id: 'd5',
    time: Date.UTC(2026, 1, 1),
    open: 95,
    high: 111,
    low: 94,
    close: 110,
    volume: 60,
    session: 'C',
  },
];

test('Renko builds every crossed brick with fixed sizing and full OHLCV provenance', () => {
  const blocks = buildPriceBlocks(bars, {
    mode: 'renko',
    sizing: { mode: 'fixed', value: 5 },
  });
  assert.deepEqual(
    blocks.slice(0, 4).map(({ open, close, direction }) => [open, close, direction]),
    [
      [100, 105, 'up'],
      [105, 110, 'up'],
      [110, 105, 'down'],
      [105, 100, 'down'],
    ],
  );
  assert.deepEqual(blocks[0].provenance.sourceIds, ['d0', 'd1']);
  assert.equal(blocks[0].provenance.sourceOpen, 100);
  assert.equal(blocks[0].provenance.sourceHigh, 107);
  assert.equal(blocks[0].provenance.sourceLow, 99);
  assert.equal(blocks[0].provenance.sourceClose, 106);
  assert.equal(blocks[0].provenance.sourceVolume, 30);
});

test('price blocks support percent, logarithmic, and ATR sizing plus session resets', () => {
  const percent = buildPriceBlocks(bars, {
    sizing: { mode: 'percent', value: 5 },
  });
  assert.ok(
    percent.length > 0 &&
      percent.every(({ size, open }) => Math.abs(size - Math.abs(open) * 0.05) < 1e-10),
  );

  const logarithmic = buildPriceBlocks(bars, {
    sizing: { mode: 'log', value: 5 },
  });
  assert.ok(logarithmic.length > 0);
  assert.ok(
    logarithmic.every(({ open, close, direction }) =>
      direction === 'up' ? close > open : close < open,
    ),
  );
  assert.ok(
    logarithmic.every(({ open, close, direction }) =>
      direction === 'up'
        ? Math.abs(close / open - 1.05) < 1e-12
        : Math.abs(close / open - 1 / 1.05) < 1e-12,
    ),
  );
  assert.notDeepEqual(
    logarithmic.map(({ open, close }) => [open, close]),
    percent.map(({ open, close }) => [open, close]),
  );

  const atr = buildPriceBlocks(bars, {
    sizing: { mode: 'atr', period: 3, multiplier: 0.5 },
  });
  assert.ok(atr.length > 0 && atr.every(({ size }) => Number.isFinite(size) && size > 0));

  const reset = buildPriceBlocks(bars, {
    sizing: { mode: 'fixed', value: 5 },
    resetBySession: true,
  });
  assert.ok(
    reset.every(({ provenance, session }) =>
      provenance.sourceIds.every((id) => bars.find((bar) => bar.id === id).session === session),
    ),
  );
});

test('Kagi applies reversal thresholds and yin-yang thickness changes', () => {
  const blocks = buildPriceBlocks(bars, {
    mode: 'kagi',
    sizing: { mode: 'fixed', value: 5 },
    reversal: 1,
  });
  assert.ok(blocks.some(({ reversal }) => reversal === true));
  assert.ok(blocks.some(({ direction }) => direction === 'up'));
  assert.ok(blocks.some(({ direction }) => direction === 'down'));
  assert.ok(blocks.every(({ provenance }) => provenance.sourceIndexes.length > 0));
  assert.deepEqual(
    blocks,
    buildPriceBlocks(bars, {
      mode: 'kagi',
      sizing: { mode: 'fixed', value: 5 },
      reversal: 1,
    }),
  );
});

test('three-line break only emits closes outside the previous line envelope', () => {
  const input = [100, 102, 104, 103, 101, 99, 105].map((close, index) => ({
    time: index,
    open: index === 0 ? close : [100, 102, 104, 103, 101, 99, 105][index - 1],
    high: Math.max(close, index === 0 ? close : [100, 102, 104, 103, 101, 99, 105][index - 1]),
    low: Math.min(close, index === 0 ? close : [100, 102, 104, 103, 101, 99, 105][index - 1]),
    close,
  }));
  const blocks = buildPriceBlocks(input, { mode: 'three-line-break', lineBreaks: 3 });
  assert.deepEqual(
    blocks.map(({ close }) => close),
    [102, 104, 99, 105],
  );
  assert.equal(blocks[2].reversal, true);
  assert.equal(blocks[3].reversal, true);
});

test('Kagi and line-break provenance follows chronological bars when source rows are unsorted', () => {
  const closes = [100, 102, 104, 103, 101, 99, 105];
  const chronological = closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1];
    return {
      id: `t${index}`,
      time: index,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
    };
  });
  const unsorted = [...chronological].reverse();
  const kagi = buildPriceBlocks(unsorted, {
    mode: 'kagi',
    sizing: { mode: 'fixed', value: 2 },
    reversal: 1,
  });
  assert.deepEqual(kagi[0].provenance.sourceIds, ['t0', 't1', 't2']);
  assert.deepEqual(kagi[0].provenance.sourceIndexes, [6, 5, 4]);
  const lineBreak = buildPriceBlocks(unsorted, { mode: 'three-line-break', lineBreaks: 3 });
  assert.deepEqual(lineBreak[1].provenance.sourceIds, ['t1', 't2']);
  assert.deepEqual(lineBreak[1].provenance.sourceIndexes, [5, 4]);
});

test('range bars consume deterministic intrabar paths and preserve exact range', () => {
  const input = [
    { time: 0, open: 100, high: 112, low: 99, close: 111, volume: 20 },
    { time: 1, open: 111, high: 112, low: 93, close: 95, volume: 30 },
  ];
  const lowHigh = buildPriceBlocks(input, {
    mode: 'range-bars',
    sizing: { mode: 'fixed', value: 5 },
    intrabarPath: 'low-high',
  });
  assert.ok(lowHigh.length >= 5);
  assert.ok(lowHigh.every(({ high, low, size }) => Math.abs(high - low - size) < 1e-12));
  assert.ok(lowHigh.every(({ provenance }) => provenance.sourceIndexes.length > 0));
  assert.notDeepEqual(
    lowHigh.map(({ direction }) => direction),
    buildPriceBlocks(input, {
      mode: 'range-bars',
      sizing: { mode: 'fixed', value: 5 },
      intrabarPath: 'high-low',
    }).map(({ direction }) => direction),
  );
});

test('fixed and visible volume profiles resolve row size, POC, VAH/VAL, placement, and provenance', () => {
  const fixed = buildVolumeProfiles(bars, {
    rows: { mode: 'size', size: 5 },
    allocation: 'close',
    valueArea: 0.7,
    placement: 'left',
  });
  assert.equal(fixed.length, 1);
  assert.equal(fixed[0].rowSize, 5);
  assert.equal(fixed[0].placement, 'left');
  assert.ok(fixed[0].rows.filter(({ pointOfControl }) => pointOfControl).length === 1);
  assert.ok(fixed[0].val <= fixed[0].poc && fixed[0].poc <= fixed[0].vah);
  assert.equal(
    fixed[0].totalVolume,
    bars.reduce((sum, { volume }) => sum + volume, 0),
  );
  assert.deepEqual(fixed[0].sourceIndexes, [0, 1, 2, 3, 4, 5]);

  const visible = buildVolumeProfiles(bars, {
    scope: { mode: 'visible', time: [bars[1].time, bars[3].time] },
    rows: { mode: 'tick', tick: 0.5, ticksPerRow: 4 },
    allocation: 'typical',
  });
  assert.deepEqual(visible[0].sourceIndexes, [1, 2, 3]);
  assert.equal(visible[0].rowSize, 2);
});

test('session and periodic profiles produce one ordered profile per scope partition', () => {
  const sessions = buildVolumeProfiles(bars, {
    scope: { mode: 'session' },
    rows: { mode: 'count', count: 4 },
  });
  assert.deepEqual(
    sessions.map(({ id }) => id),
    ['A', 'B', 'C'],
  );
  assert.deepEqual(
    sessions.map(({ sourceIndexes }) => sourceIndexes),
    [[0, 1, 2], [3, 4], [5]],
  );

  const months = buildVolumeProfiles(bars, {
    scope: { mode: 'periodic', period: 'month' },
    rows: { mode: 'count', count: 3 },
  });
  assert.deepEqual(
    months.map(({ id }) => id),
    ['2026-01', '2026-02'],
  );
  assert.deepEqual(
    months.map(({ sourceIndexes }) => sourceIndexes),
    [[0, 1, 2, 3, 4], [5]],
  );
});

test('financial analytics reject inconsistent OHLC and non-positive sizing', () => {
  assert.throws(
    () =>
      buildPriceBlocks([
        { time: 0, open: 5, high: 4, low: 3, close: 5 },
        { time: 1, open: 5, high: 6, low: 4, close: 6 },
      ]),
    /inconsistent OHLC/,
  );
  assert.throws(
    () => buildPriceBlocks(bars, { sizing: { mode: 'fixed', value: 0 } }),
    /greater than zero/,
  );
});

test('complete compiler renders every advanced price-block mode with portable options and provenance tooltips', () => {
  for (const mode of ['renko', 'kagi', 'three-line-break', 'range-bars']) {
    const { scene } = compile({
      width: 640,
      height: 400,
      data: bars,
      mark: {
        type: 'renko',
        fields: {
          open: 'open',
          high: 'high',
          low: 'low',
          close: 'close',
          volume: 'volume',
          session: 'session',
        },
        options: { mode, sizing: 'fixed', brickSize: 5, lineBreaks: 3 },
      },
      x: { field: 'time', type: 'temporal' },
      y: { field: 'close', type: 'quantitative' },
    });
    const marks = flattenScene(scene.root).filter(({ id }) => id.includes(`:${mode}:`));
    assert.ok(marks.length > 0, `${mode} rendered`);
    const tooltip = marks.find(({ datum }) => datum?.tooltip !== undefined)?.datum?.tooltip;
    assert.equal(tooltip.mode, mode);
    assert.ok(
      'sourceOpen' in tooltip &&
        'sourceHigh' in tooltip &&
        'sourceLow' in tooltip &&
        'sourceClose' in tooltip,
    );
  }
});

test('complete compiler renders left-side session profiles and explicit POC/VAH/VAL guides', () => {
  const { scene } = compile({
    width: 640,
    height: 400,
    data: bars,
    mark: {
      type: 'volume-profile',
      fields: {
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        volume: 'volume',
        session: 'session',
      },
      options: { scope: 'session', rowMode: 'size', rowSize: 5, placement: 'left' },
    },
    x: { field: 'time', type: 'temporal' },
    y: { field: 'close', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  assert.ok(nodes.some(({ id }) => id.includes(':profile:A:')));
  assert.ok(nodes.some(({ id }) => id.endsWith(':poc')));
  assert.ok(nodes.some(({ id }) => id.endsWith(':vah')));
  assert.ok(nodes.some(({ id }) => id.endsWith(':val')));
  const tooltip = nodes.find(({ datum }) => datum?.tooltip?.profile === 'A')?.datum?.tooltip;
  assert.ok('POC' in tooltip && 'VAH' in tooltip && 'VAL' in tooltip);
});

test('visible volume profile follows the active temporal x-domain without duplicate range options', () => {
  const { scene } = compile({
    width: 640,
    height: 400,
    data: bars,
    mark: {
      type: 'volume-profile',
      fields: {
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        volume: 'volume',
      },
      options: { scope: 'visible', rowMode: 'count', bins: 4 },
    },
    x: {
      field: 'time',
      type: 'temporal',
      scale: { domain: [bars[1].time, bars[3].time] },
    },
    y: { field: 'close', type: 'quantitative' },
  });
  const profiles = flattenScene(scene.root).filter(
    ({ id, datum }) => id.includes(':profile:visible:') && datum?.tooltip?.sourceRows,
  );
  assert.ok(profiles.length > 0);
  const referenced = new Set(
    profiles.flatMap(({ datum }) =>
      datum.tooltip.sourceRows.split(', ').filter(Boolean).map(Number),
    ),
  );
  assert.deepEqual(
    [...referenced].sort((left, right) => left - right),
    [1, 2, 3],
  );
});
