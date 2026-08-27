import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { compile } from '../.tmp/src/index.js';
import { compile as compileComplete } from '../.tmp/src/complete.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { resolveTooltipContent } from '../.tmp/src/interaction/tooltip.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const tooltipSourceUrl = new URL('../src/interaction/tooltip.ts', import.meta.url);

function chartSpec(interaction, locale = 'en-US') {
  return normalizeSpec({
    data: [{ date: '2026-08-23', value: 1234.5, ratio: 0.425 }],
    mark: { type: 'point' },
    x: { field: 'date', type: 'temporal', title: 'Observed date' },
    y: { field: 'value', type: 'quantitative', title: 'Observed value' },
    locale,
    interaction,
  });
}

function hit(datum, tooltip) {
  return {
    layerId: 'layer-0',
    rowIndex: 0,
    datum,
    ...(tooltip === undefined ? {} : { tooltip }),
    nodeId: 'layer-0:datum-0',
    x: 100,
    y: 100,
    distance: 0,
  };
}

test('built-in tooltips are opt-in and remain disabled when hover is disabled', () => {
  assert.equal(chartSpec(undefined).interaction.tooltip, false);
  assert.deepEqual(chartSpec({ tooltip: true }).interaction.tooltip, {
    trigger: 'mark',
    fields: [],
  });
  assert.equal(chartSpec({ hover: false, tooltip: true }).interaction.tooltip, false);
});

test('normalizes a portable tooltip title and explicit field formatting', () => {
  const spec = chartSpec(
    {
      tooltip: {
        title: 'Observation',
        fields: [
          'date',
          {
            field: 'value',
            label: 'Revenue',
            format: 'number',
            fractionDigits: 1,
            prefix: '$',
            suffix: ' USD',
          },
        ],
      },
    },
    'de-DE',
  );

  assert.equal(spec.locale, 'de-DE');
  assert.deepEqual(spec.interaction.tooltip, {
    trigger: 'mark',
    title: 'Observation',
    fields: [
      {
        field: 'date',
        label: 'Date',
        format: 'auto',
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
        prefix: '',
        suffix: '',
      },
      {
        field: 'value',
        label: 'Revenue',
        format: 'number',
        fractionDigits: 1,
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
        prefix: '$',
        suffix: ' USD',
      },
    ],
  });
});

test('formats explicit tooltip fields with the chart locale and preserves their order', () => {
  const spec = chartSpec(
    {
      tooltip: {
        title: 'Localized observation',
        fields: [
          { field: 'value', label: 'Revenue', format: 'number', fractionDigits: 1, suffix: ' kg' },
          { field: 'ratio', label: 'Share', format: 'percent', fractionDigits: 1 },
        ],
      },
    },
    'de-DE',
  );
  const content = resolveTooltipContent(
    hit({ date: '2026-08-23', value: 1234.5, ratio: 0.425 }),
    spec,
  );

  assert.equal(content.title, 'Localized observation');
  assert.deepEqual(
    content.rows.map(({ field, label }) => ({ field, label })),
    [
      { field: 'value', label: 'Revenue' },
      { field: 'ratio', label: 'Share' },
    ],
  );
  assert.equal(
    content.rows[0].value,
    `${new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(1234.5)} kg`,
  );
  assert.equal(
    content.rows[1].value,
    new Intl.NumberFormat('de-DE', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(0.425),
  );
});

test('mark-derived tooltip values take precedence over representative source rows', () => {
  const spec = normalizeSpec({
    data: [{ sample: 11, count: 99 }],
    mark: { type: 'histogram' },
    x: { field: 'sample', type: 'quantitative' },
    y: { field: 'count', type: 'quantitative' },
    interaction: {
      tooltip: {
        title: 'Histogram bin',
        fields: [
          { field: 'binStart', label: 'From', format: 'number' },
          { field: 'binEnd', label: 'To', format: 'number' },
          { field: 'count', label: 'Count', format: 'integer' },
        ],
      },
    },
  });
  const content = resolveTooltipContent(
    hit(
      { sample: 11, count: 99 },
      {
        binStart: 10,
        binEnd: 12,
        count: 7,
      },
    ),
    spec,
  );

  assert.deepEqual(
    content.rows.map(({ field, value }) => [field, value]),
    [
      ['binStart', '10'],
      ['binEnd', '12'],
      ['count', '7'],
    ],
  );
});

test('auto formatting never treats ordinary finite numbers as epoch timestamps', () => {
  const spec = normalizeSpec({
    data: [{ category: 'A', value: 42, ratio: 0.8 }],
    mark: 'point',
    x: { field: 'category', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
    interaction: { tooltip: { fields: ['value', 'ratio'] } },
  });
  const content = resolveTooltipContent(hit({ category: 'A', value: 42, ratio: 0.8 }), spec);

  assert.deepEqual(
    content.rows.map(({ field, value }) => [field, value]),
    [
      ['value', '42'],
      ['ratio', '0.8'],
    ],
  );
});

test('auto temporal inference is strict and parses zone-less ISO datetimes as UTC', () => {
  const labels = normalizeSpec({
    data: [{ category: 'A', year: '2024', month: 'May 2026', invalid: '2026-02-30T12:00' }],
    mark: 'point',
    x: { field: 'category', type: 'nominal' },
    y: { field: 'year', type: 'nominal' },
    interaction: { tooltip: { fields: ['year', 'month', 'invalid'] } },
  });
  assert.deepEqual(
    resolveTooltipContent(
      hit({ category: 'A', year: '2024', month: 'May 2026', invalid: '2026-02-30T12:00' }),
      labels,
    ).rows.map(({ value }) => value),
    ['2024', 'May 2026', '2026-02-30T12:00'],
  );

  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    const timestamp = '2026-08-27T00:30:00';
    const spec = normalizeSpec({
      data: [{ timestamp }],
      mark: 'point',
      x: { field: 'timestamp', type: 'temporal' },
      y: { field: 'timestamp', type: 'temporal' },
      locale: 'en-US',
      interaction: { tooltip: { fields: ['timestamp'] } },
    });
    assert.equal(
      resolveTooltipContent(hit({ timestamp }), spec).rows[0].value,
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(`${timestamp}Z`)),
    );
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('all compiler-derived temporal tooltip families retain temporal display semantics', () => {
  const cases = [
    {
      name: 'advanced timeline end',
      field: 'end',
      node: ':timeline:',
      spec: {
        data: [{ id: 'a', task: 'Research', start: '2026-01-01', end: '2026-01-05' }],
        mark: {
          type: 'timeline',
          fields: { id: 'id', start: 'start', end: 'end', group: 'task' },
          options: { navigator: true },
        },
        x: { field: 'start', type: 'temporal' },
        y: { field: 'task', type: 'ordinal' },
      },
    },
    {
      name: 'aggregated candlestick time',
      field: 'time',
      node: ':ohlc:',
      spec: {
        data: [
          { date: '2026-01-01T00:00:00Z', open: 10, high: 13, low: 9, close: 12 },
          { date: '2026-01-01T01:00:00Z', open: 12, high: 14, low: 11, close: 13 },
        ],
        mark: {
          type: 'candlestick',
          fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
          options: { aggregateIntervalMs: 3_600_000, navigator: true },
        },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'close', type: 'quantitative' },
      },
    },
    {
      name: 'price block start',
      field: 'timeStart',
      node: ':renko:',
      spec: {
        data: [
          { date: '2026-01-01', close: 10 },
          { date: '2026-01-02', close: 13 },
          { date: '2026-01-03', close: 11 },
        ],
        mark: { type: 'renko', options: { brickSize: 1 } },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'close', type: 'quantitative' },
      },
    },
    {
      name: 'temporal histogram bin',
      field: 'binStart',
      node: ':bin:',
      spec: {
        data: [
          { date: '2026-01-01', count: 1 },
          { date: '2026-01-03', count: 1 },
          { date: '2026-01-05', count: 1 },
        ],
        mark: { type: 'histogram', options: { bins: 2 } },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'count', type: 'quantitative' },
      },
    },
    {
      name: 'ordered line key',
      field: 'key',
      node: ':ordered-line-point:',
      spec: {
        data: [
          { date: '2026-01-03', value: 3 },
          { date: '2026-01-01', value: 1 },
          { date: '2026-01-02', value: 2 },
        ],
        mark: { type: 'line', options: { sortPolicy: 'ascending' } },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'value', type: 'quantitative' },
      },
    },
    {
      name: 'difference key',
      field: 'key',
      node: ':difference:',
      spec: {
        data: [
          { date: '2026-01-01', baseline: 10, comparison: 12 },
          { date: '2026-01-02', baseline: 12, comparison: 11 },
        ],
        mark: {
          type: 'diff',
          fields: { baseline: 'baseline', comparison: 'comparison' },
          options: { policy: 'absolute' },
        },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'comparison', type: 'quantitative' },
      },
    },
  ];

  for (const item of cases) {
    const result = compileComplete(
      {
        ...item.spec,
        locale: 'en-CA',
        interaction: { hover: true, tooltip: { fields: [item.field] } },
      },
      { width: 640, height: 400 },
    );
    const node = flattenScene(result.scene.root).find(
      (candidate) =>
        candidate.id.includes(item.node) && candidate.interactive === true && candidate.datum,
    );
    assert.ok(node?.datum, `${item.name} interactive datum`);
    const content = resolveTooltipContent(
      { ...node.datum, nodeId: node.id, x: 0, y: 0, distance: 0 },
      result.spec,
    );
    const row = content.rows.find(({ field }) => field === item.field);
    assert.ok(row, `${item.name} row`);
    assert.doesNotMatch(row.value, /^-?\d{11,17}$/, `${item.name} raw epoch`);
    assert.doesNotMatch(row.value, /Invalid Date|NaN|Infinity/, `${item.name} invalid output`);
    assert.match(row.value, /2026/, `${item.name} formatted year`);
  }
});

test('remaining analytical, statistical, stacked, and finance families preserve temporal tooltips', () => {
  const cases = [
    ...['rug', 'strip'].map((mode) => ({
      name: `distribution ${mode}`,
      field: 'value',
      node: `:${mode}:`,
      spec: {
        data: [
          { date: '2026-01-01', value: 1 },
          { date: '2026-01-03', value: 1 },
        ],
        mark: { type: 'distribution', fields: { value: 'date' }, options: { mode, seed: 7 } },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'value', type: 'quantitative' },
      },
    })),
    ...['ecdf', 'ccdf'].map((mode) => ({
      name: `distribution ${mode}`,
      field: 'value',
      node: `:${mode}-point:`,
      spec: {
        data: [
          { date: '2026-01-01', probability: 0 },
          { date: '2026-01-03', probability: 0 },
        ],
        mark: { type: 'distribution', fields: { value: 'date' }, options: { mode } },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'probability', type: 'quantitative', scale: { domain: [0, 1] } },
      },
    })),
    {
      name: 'estimated interval category',
      field: 'category',
      node: ':estimated-interval:',
      spec: {
        data: [
          { date: '2026-01-01', value: 1 },
          { date: '2026-01-01', value: 3 },
          { date: '2026-01-02', value: 2 },
          { date: '2026-01-02', value: 4 },
        ],
        mark: { type: 'interval', options: { rawEstimator: true, kind: 'CI' } },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'value', type: 'quantitative' },
      },
    },
    {
      name: 'horizontal estimated interval category',
      field: 'category',
      node: ':estimated-interval:',
      spec: {
        data: [
          { date: '2026-01-01', value: 1 },
          { date: '2026-01-01', value: 3 },
          { date: '2026-01-02', value: 2 },
          { date: '2026-01-02', value: 4 },
        ],
        mark: {
          type: 'interval',
          options: { rawEstimator: true, kind: 'CI', orientation: 'horizontal' },
        },
        x: { field: 'value', type: 'quantitative' },
        y: { field: 'date', type: 'temporal' },
      },
    },
    {
      name: 'ranked bar category',
      field: 'category',
      node: ':ranked-bar:',
      spec: {
        data: [
          { id: 'a', date: '2026-01-01', value: 4 },
          { id: 'b', date: '2026-01-02', value: 2 },
        ],
        mark: {
          type: 'bar',
          fields: { id: 'id', category: 'date', value: 'value' },
          options: { rank: true },
        },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'value', type: 'quantitative' },
      },
    },
    {
      name: 'waterfall label',
      field: 'label',
      node: ':semantic-waterfall:',
      spec: {
        data: [
          { date: '2026-01-01', value: 4, kind: 'absolute' },
          { date: '2026-01-02', value: 2, kind: 'relative' },
        ],
        mark: {
          type: 'waterfall',
          fields: { kind: 'kind' },
          options: { explicitSemantics: true },
        },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'value', type: 'quantitative' },
      },
    },
    {
      name: 'horizontal ranked bar category',
      field: 'category',
      node: ':ranked-bar:',
      spec: {
        data: [
          { id: 'a', date: '2026-01-01', value: 4 },
          { id: 'b', date: '2026-01-02', value: 2 },
        ],
        mark: {
          type: 'bar',
          orientation: 'horizontal',
          fields: { id: 'id', category: 'date', value: 'value' },
          options: { rank: true },
        },
        x: { field: 'value', type: 'quantitative' },
        y: { field: 'date', type: 'temporal' },
      },
    },
    {
      name: 'stack category',
      field: 'stackCategory',
      node: ':series-bar:',
      spec: {
        data: [
          { date: '2026-01-01', series: 'A', value: 2 },
          { date: '2026-01-01', series: 'B', value: 3 },
          { date: '2026-01-02', series: 'A', value: 4 },
          { date: '2026-01-02', series: 'B', value: 1 },
        ],
        mark: { type: 'bar', fields: { series: 'series' }, options: { stack: 'stacked' } },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'value', type: 'quantitative' },
      },
    },
    {
      name: 'volume profile start',
      field: 'timeStart',
      node: ':profile:fixed:',
      spec: {
        data: [
          { date: '2026-01-01', open: 10, high: 13, low: 9, close: 12, volume: 100 },
          { date: '2026-01-02', open: 12, high: 14, low: 11, close: 13, volume: 80 },
        ],
        mark: {
          type: 'volume-profile',
          fields: {
            open: 'open',
            high: 'high',
            low: 'low',
            close: 'close',
            volume: 'volume',
          },
          options: { rowMode: 'count', bins: 4 },
        },
        x: { field: 'date', type: 'temporal' },
        y: { field: 'close', type: 'quantitative' },
      },
    },
    {
      name: 'horizontal stack category',
      field: 'stackCategory',
      node: ':series-bar:',
      spec: {
        data: [
          { date: '2026-01-01', series: 'A', value: 2 },
          { date: '2026-01-01', series: 'B', value: 3 },
          { date: '2026-01-02', series: 'A', value: 4 },
          { date: '2026-01-02', series: 'B', value: 1 },
        ],
        mark: {
          type: 'bar',
          orientation: 'horizontal',
          fields: { series: 'series' },
          options: { stack: 'stacked' },
        },
        x: { field: 'value', type: 'quantitative' },
        y: { field: 'date', type: 'temporal' },
      },
    },
  ];

  for (const item of cases) {
    const result = compileComplete(
      {
        ...item.spec,
        locale: 'en-CA',
        interaction: { hover: true, tooltip: { fields: [item.field] } },
      },
      { width: 640, height: 400 },
    );
    const node = flattenScene(result.scene.root).find(
      (candidate) =>
        candidate.id.includes(item.node) && candidate.interactive === true && candidate.datum,
    );
    assert.ok(node?.datum, `${item.name} interactive datum`);
    const value = node.datum.tooltip?.[item.field];
    assert.ok(typeof value === 'string' || value instanceof Date, `${item.name} temporal payload`);
    const content = resolveTooltipContent(
      { ...node.datum, nodeId: node.id, x: 0, y: 0, distance: 0 },
      result.spec,
    );
    const row = content.rows.find(({ field }) => field === item.field);
    assert.ok(row, `${item.name} row`);
    assert.match(row.value, /2026/, `${item.name} formatted year`);
    assert.doesNotMatch(row.value, /^-?\d{11,17}$/, `${item.name} raw epoch`);
  }
});

test('timeline navigator formats temporal bounds while its public datum stays numeric', () => {
  const result = compileComplete(
    {
      data: [
        { id: 'a', task: 'A', start: '2026-01-01', end: '2026-01-03' },
        { id: 'b', task: 'B', start: '2026-01-04', end: '2026-01-06' },
      ],
      mark: {
        type: 'timeline',
        fields: { id: 'id', start: 'start', end: 'end', group: 'task' },
        options: { navigator: true },
      },
      x: { field: 'start', type: 'temporal' },
      y: { field: 'task', type: 'ordinal' },
      locale: 'en-CA',
      interaction: { tooltip: { fields: ['start'] } },
    },
    { width: 640, height: 400 },
  );
  const nodes = flattenScene(result.scene.root);
  const item = nodes.find(({ id }) => id.endsWith(':timeline:a'));
  const navigator = nodes.find(({ id }) => id.endsWith(':timeline-navigator-window'));
  assert.equal(item.datum.tooltip.start, '2026-01-01');
  assert.equal(typeof item.datum.datum.start, 'number');
  assert.equal(navigator.datum.tooltip.start, '2026-01-01');
  assert.equal(typeof navigator.datum.datum.start, 'number');
  const content = resolveTooltipContent(
    { ...navigator.datum, nodeId: navigator.id, x: 0, y: 0, distance: 0 },
    result.spec,
  );
  assert.match(content.rows[0].value, /2026/);
});

test('tooltip encodings retain Date values and their authored field without removing encoded', () => {
  const when = new Date('2026-01-02T03:04:05Z');
  const result = compileComplete({
    data: [{ category: 'A', value: 1, when }],
    mark: 'point',
    encoding: {
      x: { field: 'category', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      tooltip: { field: 'when', type: 'temporal' },
    },
    interaction: { tooltip: { fields: ['when'] } },
  });
  const point = flattenScene(result.scene.root).find(({ id }) => id.includes(':point:'));
  assert.strictEqual(point.datum.datum.when, when);
  assert.strictEqual(point.datum.tooltip.when, when);
  assert.strictEqual(point.datum.tooltip.encoded, when);
  assert.match(
    resolveTooltipContent(
      { ...point.datum, nodeId: point.id, x: 0, y: 0, distance: 0 },
      result.spec,
    ).rows[0].value,
    /2026/,
  );

  const epoch = when.getTime();
  const numeric = compileComplete({
    data: [{ category: 'A', value: 1, when: epoch }],
    mark: 'point',
    encoding: {
      x: { field: 'category', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      tooltip: { field: 'when', type: 'temporal' },
    },
  });
  const numericPoint = flattenScene(numeric.scene.root).find(({ id }) => id.includes(':point:'));
  assert.equal(numericPoint.datum.datum.when, epoch);
  assert.equal(numericPoint.datum.tooltip.encoded, epoch);
  assert.equal(numericPoint.datum.tooltip.when.getTime(), epoch);
});

test('aggregate and relationship compilers attach truthful semantic tooltip payloads', () => {
  const histogram = compile(
    {
      data: [{ value: 10 }, { value: 10.5 }, { value: 14 }],
      mark: { type: 'histogram', options: { bins: 2 } },
      x: { field: 'value', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 480, height: 320 },
  );
  const bin = flattenScene(histogram.scene.root).find((node) => node.id.includes(':bin:'));
  assert.ok(bin?.datum?.tooltip);
  assert.equal(bin.datum.tooltip.count, 2);
  assert.equal(bin.datum.tooltip.proportion, 2 / 3);

  const volumeProfile = compileComplete(
    {
      data: [
        { date: '2026-01-01', price: 20, volume: 120 },
        { date: '2026-01-02', price: 20.5, volume: 80 },
        { date: '2026-01-03', price: 24, volume: 50 },
      ],
      mark: {
        type: 'volume-profile',
        fields: { price: 'price', volume: 'volume' },
        options: { bins: 4 },
      },
      x: { field: 'date', type: 'temporal' },
      y: { field: 'price', type: 'quantitative' },
    },
    { width: 480, height: 320 },
  );
  const volumeBin = flattenScene(volumeProfile.scene.root).find(
    (node) => node.datum?.tooltip?.volume === 200,
  );
  assert.ok(volumeBin?.datum?.tooltip);
  assert.equal(volumeBin.datum.tooltip.proportion, 0.8);
  assert.equal(Object.hasOwn(volumeBin.datum.tooltip, 'date'), false);

  const network = compileComplete(
    {
      data: [
        { source: 'A', target: 'B', value: 4 },
        { source: 'A', target: 'C', value: 6 },
      ],
      mark: { type: 'graph', fields: { source: 'source', target: 'target', value: 'value' } },
      x: { field: 'source', type: 'ordinal' },
      y: { field: 'target', type: 'ordinal' },
    },
    { width: 480, height: 320 },
  );
  const graphNodes = flattenScene(network.scene.root);
  const edge = graphNodes.find((node) => node.id.includes(':graph-edge:'));
  const nodeA = graphNodes.find((node) => node.id.endsWith(':graph-node:A'));
  assert.deepEqual(edge?.datum?.tooltip, {
    kind: 'edge',
    source: 'A',
    target: 'B',
    value: 4,
  });
  assert.deepEqual(nodeA?.datum?.tooltip, { kind: 'node', node: 'A', degree: 2, total: 10 });
});

test('date-only tooltip values do not move to the previous day in western time zones', () => {
  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    const spec = chartSpec({
      tooltip: {
        fields: [{ field: 'date', label: 'Date', format: 'date' }],
      },
    });
    const content = resolveTooltipContent(
      hit({ date: '2026-08-23', value: 1234.5, ratio: 0.425 }),
      spec,
    );

    assert.equal(content.rows[0].value, 'Aug 23, 2026');
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('formats compiler-derived epoch milliseconds as dates instead of raw numbers', () => {
  const spec = normalizeSpec({
    data: [{ task: 'Research', start: '2024-01-01', end: '2024-12-04' }],
    mark: { type: 'timeline', fields: { end: 'end' } },
    x: { field: 'start', type: 'temporal' },
    y: { field: 'task', type: 'ordinal' },
    locale: 'ko-KR',
    interaction: {
      tooltip: {
        fields: [
          { field: 'start', label: '시작', format: 'date', timeZone: 'Asia/Seoul' },
          { field: 'end', label: '종료', format: 'date', timeZone: 'Asia/Seoul' },
        ],
      },
    },
  });
  const content = resolveTooltipContent(
    hit(
      { task: 'Research', start: '2024-01-01', end: '2024-12-04' },
      { start: Date.UTC(2024, 0, 1), end: Date.UTC(2024, 11, 4) },
    ),
    spec,
  );

  assert.deepEqual(
    content.rows.map(({ field, value }) => [field, value]),
    [
      [
        'start',
        new Intl.DateTimeFormat('ko-KR', {
          dateStyle: 'medium',
          timeZone: 'Asia/Seoul',
        }).format(new Date(Date.UTC(2024, 0, 1))),
      ],
      [
        'end',
        new Intl.DateTimeFormat('ko-KR', {
          dateStyle: 'medium',
          timeZone: 'Asia/Seoul',
        }).format(new Date(Date.UTC(2024, 11, 4))),
      ],
    ],
  );
});

test('lets authors choose date, time, and datetime styles and time zones', () => {
  const timestamp = '2026-08-27T13:45:30Z';
  const spec = normalizeSpec({
    data: [{ timestamp }],
    mark: 'point',
    x: { field: 'timestamp', type: 'temporal' },
    y: { field: 'timestamp', type: 'temporal' },
    locale: 'en-GB',
    interaction: {
      tooltip: {
        fields: [
          {
            field: 'timestamp',
            label: 'Seoul time',
            format: 'time',
            timeStyle: 'medium',
            timeZone: 'Asia/Seoul',
          },
        ],
      },
    },
  });
  const content = resolveTooltipContent(hit({ timestamp }), spec);

  assert.equal(
    content.rows[0].value,
    new Intl.DateTimeFormat('en-GB', {
      timeStyle: 'medium',
      timeZone: 'Asia/Seoul',
    }).format(new Date(timestamp)),
  );
  assert.deepEqual(spec.interaction.tooltip.fields[0], {
    field: 'timestamp',
    label: 'Seoul time',
    format: 'time',
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Seoul',
    prefix: '',
    suffix: '',
  });
});

test('invalid tooltip time zones fall back safely without interrupting rendering', () => {
  const timestamp = Date.UTC(2026, 7, 27, 13, 45, 30);
  const spec = normalizeSpec({
    data: [{ timestamp }],
    mark: 'point',
    x: { field: 'timestamp', type: 'temporal' },
    y: { field: 'timestamp', type: 'temporal' },
    locale: 'en-US',
    interaction: {
      tooltip: {
        fields: [
          {
            field: 'timestamp',
            format: 'datetime',
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'Not/A_Time_Zone',
          },
        ],
      },
    },
  });

  assert.doesNotThrow(() => resolveTooltipContent(hit({ timestamp }), spec));
  assert.equal(
    resolveTooltipContent(hit({ timestamp }), spec).rows[0].value,
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(timestamp)),
  );
});

test('temporal formatting covers epoch boundaries, offsets, DST, and invalid input safely', () => {
  const values = [
    0,
    Date.UTC(1900, 0, 1),
    Date.UTC(2100, 11, 31, 23, 59, 59),
    '2026-03-08T01:30:00-05:00',
    '2026-11-01T01:30:00-04:00',
  ];
  for (const timestamp of values) {
    const spec = normalizeSpec({
      data: [{ timestamp }],
      mark: 'point',
      x: { field: 'timestamp', type: 'temporal' },
      y: { field: 'timestamp', type: 'temporal' },
      locale: 'en-US',
      interaction: {
        tooltip: {
          fields: [
            {
              field: 'timestamp',
              format: 'datetime',
              dateStyle: 'long',
              timeStyle: 'medium',
              timeZone: 'America/New_York',
            },
          ],
        },
      },
    });
    const content = resolveTooltipContent(hit({ timestamp }), spec);
    assert.equal(
      content.rows[0].value,
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeStyle: 'medium',
        timeZone: 'America/New_York',
      }).format(new Date(timestamp)),
    );
  }

  const invalid = normalizeSpec({
    data: [{ timestamp: 'not-a-date' }],
    mark: 'point',
    x: { field: 'timestamp', type: 'temporal' },
    y: { field: 'timestamp', type: 'temporal' },
    interaction: { tooltip: { fields: [{ field: 'timestamp', format: 'datetime' }] } },
  });
  assert.doesNotThrow(() => resolveTooltipContent(hit({ timestamp: 'not-a-date' }), invalid));
  assert.equal(
    resolveTooltipContent(hit({ timestamp: 'not-a-date' }), invalid).rows[0].value,
    'not-a-date',
  );
});

test('tooltip validation rejects executable and unsafe formatting declarations', () => {
  const issues = validateSpec({
    data: [{ category: 'A', value: 1 }],
    mark: 'bar',
    x: 'category',
    y: 'value',
    interaction: {
      tooltip: {
        formatter: () => '<strong>unsafe</strong>',
        fields: [
          { field: '__proto__' },
          {
            field: 'value',
            format: 'html',
            fractionDigits: 7,
            dateStyle: 'verbose',
            timeStyle: 'tiny',
            timeZone: '   ',
          },
        ],
      },
    },
  });

  assert.ok(issues.some(({ message }) => message.includes('Functions are not allowed')));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[0].field'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[1].format'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[1].fractionDigits'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[1].dateStyle'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[1].timeStyle'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[1].timeZone'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.formatter'));
});

test('JSON Schema publishes the same temporal tooltip format contract', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  const field = schema.$defs.tooltipField.oneOf[1].properties;

  assert.ok(field.format.enum.includes('time'));
  assert.deepEqual(field.dateStyle.enum, ['short', 'medium', 'long', 'full']);
  assert.deepEqual(field.timeStyle.enum, ['short', 'medium', 'long', 'full']);
  assert.equal(field.timeZone.minLength, 1);
  assert.equal(field.timeZone.pattern, '\\S');
  assert.equal(schema.$defs.axisFormatObject.properties.timeZone.pattern, '\\S');
});

test('tooltip DOM rendering stays text-only for untrusted titles, labels, and values', async () => {
  const source = await readFile(tooltipSourceUrl, 'utf8');

  assert.doesNotMatch(source, /\binnerHTML\b|insertAdjacentHTML|DOMParser/);
  assert.match(source, /\.textContent\s*=/);

  const spec = normalizeSpec({
    data: [{ category: 'A', value: '<img src=x onerror=alert(1)>' }],
    mark: 'bar',
    x: 'category',
    y: 'value',
    interaction: {
      tooltip: {
        title: '<strong>Unsafe title</strong>',
        fields: [{ field: 'value', label: '<em>Unsafe label</em>' }],
      },
    },
  });
  const content = resolveTooltipContent(
    hit({ category: 'A', value: '<img src=x onerror=alert(1)>' }),
    spec,
  );

  assert.equal(content.title, '<strong>Unsafe title</strong>');
  assert.equal(content.rows[0].label, '<em>Unsafe label</em>');
  assert.equal(content.rows[0].value, '<img src=x onerror=alert(1)>');
});

test('interactive text nodes participate in pointer hit testing while hidden nodes do not', () => {
  const textNode = {
    type: 'text',
    id: 'word-0',
    zIndex: 1,
    opacity: 1,
    visible: true,
    interactive: true,
    datum: { layerId: 'words', rowIndex: 0, datum: { word: 'Analytics', weight: 92 } },
    x: 120,
    y: 80,
    text: 'Analytics',
    fill: '#111827',
    fontFamily: 'sans-serif',
    fontSize: 20,
    fontWeight: 700,
    align: 'center',
    baseline: 'middle',
    rotation: -12,
  };
  const scene = {
    width: 240,
    height: 160,
    background: '#ffffff',
    root: {
      type: 'group',
      id: 'root',
      zIndex: 0,
      opacity: 1,
      visible: true,
      children: [textNode],
    },
    accessibility: { label: 'Word cloud' },
    metadata: {
      rowCount: 1,
      renderedNodeCount: 1,
      performanceProfile: 'standard',
      hitTestingEnabled: true,
    },
  };

  assert.equal(hitTestScene(scene, textNode.x, textNode.y, 0)?.datum.word, 'Analytics');
  assert.equal(
    hitTestScene(
      { ...scene, root: { ...scene.root, children: [{ ...textNode, visible: false }] } },
      textNode.x,
      textNode.y,
      8,
    ),
    null,
  );
  assert.equal(
    hitTestScene({ ...scene, root: { ...scene.root, opacity: 0 } }, textNode.x, textNode.y, 8),
    null,
  );
  assert.equal(
    hitTestScene(
      {
        ...scene,
        root: { ...scene.root, clip: { x: 0, y: 0, width: 20, height: 20 } },
      },
      textNode.x,
      textNode.y,
      8,
    ),
    null,
  );
});

test('area points expose datum hit targets when point rendering is requested', () => {
  const data = [
    { month: 'Jan', value: 12 },
    { month: 'Feb', value: 18 },
    { month: 'Mar', value: 15 },
  ];
  const { scene } = compile(
    {
      data,
      mark: { type: 'area', point: true },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
      interaction: { tooltip: true },
    },
    { width: 480, height: 320 },
  );
  const points = flattenScene(scene.root).filter(
    (node) => node.type === 'circle' && node.interactive === true && node.datum !== undefined,
  );

  assert.equal(points.length, data.length);
  assert.equal(hitTestScene(scene, points[1].cx, points[1].cy, 0)?.rowIndex, 1);
});
