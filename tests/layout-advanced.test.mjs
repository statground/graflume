import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '../.tmp/src/complete.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

test('pie compiler resolves negative/zero/minimum/sort/pad policy and dense roving labels', () => {
  const { scene } = compile({
    width: 720,
    height: 420,
    data: [
      { id: 'A', value: 100 },
      { id: 'B', value: -2 },
      { id: 'C', value: 0 },
      { id: 'D', value: 1 },
      { id: 'E', value: 1 },
      { id: 'F', value: 1 },
      { id: 'G', value: 1 },
      { id: 'H', value: 1 },
    ],
    mark: {
      type: 'pie',
      fields: { id: 'id', label: 'id' },
      options: {
        negative: 'absolute',
        zero: 'minimum',
        minimumAngle: 0.03,
        sort: 'descending',
        padAngle: 0.01,
      },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  const slices = nodes.filter(({ id }) => id.includes(':slice:'));
  assert.equal(slices.length, 8);
  assert.ok(
    slices.every(
      ({ datum }, index) =>
        datum.familyInteraction.kind === 'pie-slice' &&
        datum.familyInteraction.index === index &&
        datum.familyInteraction.count === slices.length,
    ),
  );
  assert.equal(slices.filter(({ datum }) => datum.tooltip.tabIndex === 0).length, 1);
  assert.ok(slices.some(({ datum }) => datum.tooltip.rawValue === -2 && datum.tooltip.value === 2));
  assert.ok(
    slices.some(({ datum }) => datum.tooltip.rawValue === 0 && datum.tooltip.minimumApplied),
  );
  assert.equal(nodes.filter(({ id }) => id.includes(':slice-label:')).length, 8);
  const labelYs = nodes.filter(({ id }) => id.includes(':slice-label:')).map(({ y }) => y);
  assert.equal(new Set(labelYs.map((value) => value.toFixed(4))).size, labelYs.length);

  const dense = compile({
    width: 720,
    height: 420,
    data: Array.from({ length: 80 }, (_, index) => ({ id: `slice-${index}`, value: 1 })),
    mark: { type: 'pie', fields: { id: 'id', label: 'id' } },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const denseLabels = flattenScene(dense.scene.root).filter(({ id }) =>
    id.includes(':slice-label:'),
  );
  const plot = dense.coordinates.plot;
  assert.equal(denseLabels.length, 80);
  assert.ok(
    denseLabels.every(({ y }) => y >= plot.y + 6 - 1e-7 && y <= plot.y + plot.height - 6 + 1e-7),
  );
  for (const side of new Set(denseLabels.map(({ x }) => x))) {
    const sideLabels = denseLabels
      .filter(({ x }) => x === side)
      .sort((left, right) => left.y - right.y);
    assert.ok(
      sideLabels
        .slice(1)
        .every((label, index) => label.y - sideLabels[index].y >= label.fontSize - 1e-7),
    );
  }

  const overflow = compile({
    width: 720,
    height: 420,
    data: Array.from({ length: 160 }, (_, index) => ({ id: `slice-${index}`, value: 1 })),
    mark: { type: 'pie', fields: { id: 'id', label: 'id' } },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const overflowLabels = flattenScene(overflow.scene.root).filter(({ id }) =>
    id.includes(':slice-label:'),
  );
  assert.ok(
    overflowLabels.length < 160,
    'unreadable overflow labels are deterministically sampled',
  );
  assert.ok(
    overflowLabels.every(
      ({ y }) =>
        y >= overflow.coordinates.plot.y + 6 - 1e-7 &&
        y <= overflow.coordinates.plot.y + overflow.coordinates.plot.height - 6 + 1e-7,
    ),
  );
});

test('pie compiler exposes every source row after duplicate category aggregation', () => {
  const { scene } = compile({
    width: 720,
    height: 420,
    data: [
      { id: 'A', label: 'First A', value: 2 },
      { id: 'B', label: 'B', value: 5 },
      { id: 'A', label: 'Later A', value: 3 },
    ],
    mark: { type: 'pie', fields: { id: 'id', label: 'label' } },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const slices = flattenScene(scene.root).filter(({ id }) => id.includes(':slice:'));
  assert.equal(slices.length, 2);
  const aggregated = slices.find(({ datum }) => datum.familyInteraction.id === 'A');
  assert.deepEqual(aggregated.datum.datum.sourceRows, [0, 2]);
  assert.deepEqual(aggregated.datum.tooltip.sourceRowIndices, [0, 2]);
  assert.equal(aggregated.datum.tooltip.sourceRowCount, 2);
  assert.equal(aggregated.datum.tooltip.value, 5);
  assert.equal(aggregated.datum.tooltip.label, 'First A');
});

test('radial and linear gauge render bands, custom ticks, targets, and exact accessible summaries', () => {
  for (const type of ['radial', 'linear']) {
    const { scene } = compile({
      data: [{ label: 'CPU', value: 73 }],
      mark: {
        type: 'gauge',
        options: {
          type,
          minimum: 0,
          maximum: 100,
          bands: [
            { from: 0, to: 60, color: '#22c55e', label: 'normal' },
            { from: 60, to: 85, color: '#eab308', label: 'warning' },
            { from: 85, to: 100, color: '#ef4444', label: 'critical' },
          ],
          targets: [80],
          ticks: [0, 25, 50, 75, 100],
        },
      },
      x: { field: 'label', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    });
    const nodes = flattenScene(scene.root);
    assert.equal(nodes.filter(({ id }) => id.includes(':gauge-band:')).length, 3);
    assert.equal(nodes.filter(({ id }) => id.includes(':gauge-target:')).length, 1);
    assert.equal(nodes.filter(({ id }) => id.includes(':gauge-tick:')).length, 5);
    const tooltip = nodes.find(({ id }) => id.endsWith(':gauge-value')).datum.tooltip;
    assert.equal(tooltip.summary, 'Value 73; range 0 to 100; targets 80; band warning.');
    assert.ok(nodes.find(({ id }) => id.endsWith(':gauge-summary')).text.includes('Value 73'));
  }
});

test('timeline compiler packs groups/lanes, renders milestones/dependencies/clipping/duration and navigator', () => {
  const { scene } = compile({
    width: 760,
    height: 440,
    data: [
      { id: 'a', group: 'G1', start: 0, end: 10, label: 'A', dependencies: [] },
      { id: 'b', group: 'G1', start: 3, end: 8, label: 'B', dependencies: ['a'] },
      { id: 'c', group: 'G2', start: 7, end: 7, label: 'C', milestone: true, dependencies: ['b'] },
      { id: 'd', group: 'G2', start: 9, end: 16, label: 'D', dependencies: ['c'] },
    ],
    mark: {
      type: 'timeline',
      fields: {
        id: 'id',
        start: 'start',
        end: 'end',
        group: 'group',
        label: 'label',
        milestone: 'milestone',
        dependencies: 'dependencies',
      },
      options: { domain: [2, 12], groupOrder: ['G1', 'G2'], clip: true, navigator: true },
    },
    x: { field: 'start', type: 'quantitative' },
    y: { field: 'end', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  const items = nodes.filter(({ id }) => id.includes(':timeline:'));
  assert.equal(items.length, 4);
  assert.ok(items.some(({ datum }) => datum.tooltip.milestone === true));
  assert.ok(items.some(({ datum }) => datum.tooltip.clipped === true));
  assert.ok(items.every(({ datum }) => Number.isFinite(datum.tooltip.duration)));
  assert.equal(nodes.filter(({ id }) => id.includes(':timeline-dependency:')).length, 3);
  assert.ok(nodes.some(({ id }) => id.endsWith(':timeline-navigator-track')));
  assert.ok(nodes.some(({ id }) => id.endsWith(':timeline-navigator-window')));
  const lanes = items
    .filter(({ datum }) => datum.tooltip.group === 'G1')
    .map(({ datum }) => datum.tooltip.lane);
  assert.deepEqual(lanes.sort(), [0, 1]);
});

test('timeline compiler preserves authored off-domain geometry when clipping is disabled', () => {
  const spec = {
    width: 640,
    height: 320,
    data: [
      { id: 'partial', start: -5, end: 5 },
      { id: 'outside', start: 20, end: 30 },
    ],
    mark: {
      type: 'timeline',
      fields: { id: 'id', start: 'start', end: 'end' },
      options: { domain: [0, 10], navigator: false },
    },
    x: { field: 'start', type: 'quantitative' },
    y: { field: 'end', type: 'quantitative' },
  };
  const clipped = compile({
    ...spec,
    mark: { ...spec.mark, options: { ...spec.mark.options, clip: true } },
  });
  const unclipped = compile({
    ...spec,
    mark: { ...spec.mark, options: { ...spec.mark.options, clip: false } },
  });
  const clippedItems = flattenScene(clipped.scene.root).filter(({ id }) =>
    id.includes(':timeline:'),
  );
  const unclippedItems = flattenScene(unclipped.scene.root).filter(({ id }) =>
    id.includes(':timeline:'),
  );
  assert.deepEqual(
    clippedItems.map(({ datum }) => datum.tooltip.id),
    ['partial'],
  );
  assert.deepEqual(
    unclippedItems.map(({ datum }) => datum.tooltip.id),
    ['partial', 'outside'],
  );
  const clippedPartial = clippedItems[0];
  const unclippedPartial = unclippedItems.find(({ datum }) => datum.tooltip.id === 'partial');
  const outside = unclippedItems.find(({ datum }) => datum.tooltip.id === 'outside');
  assert.ok(unclippedPartial.x < clippedPartial.x);
  assert.ok(unclippedPartial.width > clippedPartial.width);
  assert.equal(unclippedPartial.datum.tooltip.visibleDuration, 10);
  assert.equal(unclippedPartial.datum.tooltip.clipped, false);
  assert.ok(outside.x > clippedPartial.x + clippedPartial.width * 2);
  assert.ok(outside.width > 0);
});

test('table compiler applies filter/group/sort, virtual window, frozen cells, keyboard metadata, and formatters', () => {
  const { scene } = compile({
    width: 760,
    height: 420,
    data: [
      { region: 'East', product: 'A', amount: 10 },
      { region: 'East', product: 'B', amount: 20 },
      { region: 'West', product: 'A', amount: 50 },
      { region: 'West', product: 'B', amount: 5 },
    ],
    mark: {
      type: 'table',
      options: {
        filters: [{ field: 'amount', operator: 'greater-or-equal', value: 10 }],
        group: {
          fields: ['region'],
          aggregates: [{ field: 'amount', op: 'sum', as: 'total' }],
        },
        sort: [{ field: 'total', direction: 'descending' }],
        windowOffset: 0,
        windowLimit: 1,
        frozenRows: 1,
        frozenColumns: 1,
        formatters: { total: 'number' },
      },
    },
    x: { field: 'region', type: 'nominal' },
    y: { field: 'amount', type: 'quantitative' },
  });
  const cells = flattenScene(scene.root).filter(({ id }) => id.includes(':table-cell:'));
  assert.equal(cells.length, 2);
  assert.ok(cells.every(({ datum }) => datum.familyInteraction.kind === 'table-cell'));
  assert.equal(
    flattenScene(scene.root).filter(
      ({ datum }) => datum?.familyInteraction?.kind === 'table-header',
    ).length,
    2,
  );
  assert.ok(cells.every(({ datum }) => datum.tooltip.totalRows === 2));
  assert.ok(cells.every(({ datum }) => datum.tooltip.frozen === true));
  assert.deepEqual(
    cells.map(({ datum }) => [datum.datum.row, datum.datum.column]),
    [
      [0, 0],
      [0, 1],
    ],
  );
  const total = cells.find(({ datum }) => datum.tooltip.column === 'total').datum.tooltip;
  assert.equal(total.value, 50);
  assert.equal(total.formatted, '50');
  assert.equal(total.formatter, 'number');
});

test('table virtualization keeps authored frozen rows and columns outside the moving window', () => {
  const { scene } = compile({
    width: 640,
    height: 360,
    data: Array.from({ length: 6 }, (_, index) => ({
      id: `row-${index}`,
      amount: index * 10,
      note: `note-${index}`,
    })),
    mark: {
      type: 'table',
      options: {
        windowOffset: 3,
        windowLimit: 2,
        frozenRows: 1,
        frozenColumns: 1,
      },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'amount', type: 'quantitative' },
  });
  const cells = flattenScene(scene.root).filter(
    ({ datum }) => datum?.familyInteraction?.kind === 'table-cell',
  );
  assert.deepEqual(
    [...new Set(cells.map(({ datum }) => datum.familyInteraction.row))].sort(
      (left, right) => left - right,
    ),
    [0, 3, 4],
  );
  assert.ok(
    cells
      .filter(({ datum }) => datum.familyInteraction.row === 0)
      .every(({ datum }) => datum.tooltip.frozenRow === true),
  );
  assert.ok(
    cells
      .filter(({ datum }) => datum.familyInteraction.column === 0)
      .every(({ datum }) => datum.tooltip.frozenColumn === true),
  );
  const body = cells.find(
    ({ datum }) => datum.familyInteraction.row === 3 && datum.familyInteraction.column === 1,
  );
  assert.equal(body.datum.tooltip.frozen, false);
  assert.equal(body.datum.tooltip.frozenRow, false);
  assert.equal(body.datum.tooltip.frozenColumn, false);
  assert.ok(
    Math.max(...cells.filter(({ datum }) => datum.familyInteraction.row === 0).map(({ y }) => y)) <
      Math.min(...cells.filter(({ datum }) => datum.familyInteraction.row === 3).map(({ y }) => y)),
  );
});

test('table compiler virtualizes columns while retaining frozen columns and absolute identities', () => {
  const { scene } = compile({
    width: 640,
    height: 320,
    data: [
      {
        identity: 'row-0',
        metricA: 1,
        metricB: 2,
        metricC: 3,
        metricD: 4,
        metricE: 5,
      },
    ],
    mark: {
      type: 'table',
      options: {
        columnOffset: 3,
        columnLimit: 2,
        frozenColumns: 1,
      },
    },
    x: { field: 'identity', type: 'nominal' },
    y: { field: 'metricA', type: 'quantitative' },
  });
  const cells = flattenScene(scene.root).filter(
    ({ datum }) => datum?.familyInteraction?.kind === 'table-cell',
  );
  assert.deepEqual(
    cells
      .map(({ datum }) => [
        datum.datum.displayColumn,
        datum.familyInteraction.column,
        datum.familyInteraction.field,
      ])
      .sort((left, right) => left[0] - right[0])
      .map(([, column, field]) => [column, field]),
    [
      [0, 'identity'],
      [3, 'metricC'],
      [4, 'metricD'],
    ],
  );
  assert.equal(
    cells.find(({ datum }) => datum.familyInteraction.column === 0).datum.tooltip.frozenColumn,
    true,
  );
  assert.ok(
    cells
      .filter(({ datum }) => datum.familyInteraction.column > 0)
      .every(({ datum }) => datum.tooltip.frozenColumn === false),
  );
  assert.ok(cells.every(({ datum }) => datum.familyInteraction.columns === 6));
  assert.ok(cells.every(({ datum }) => datum.familyInteraction.columnOffset === 3));
});

test('table compiler uses locale-aware built-ins, host formatters, and rejects unknown ids', () => {
  const registry = createDefaultRegistry();
  registry.registerTableFormatter('currency-code', (value, row, locale) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: String(row.currency),
      currencyDisplay: 'code',
    }).format(Number(value)),
  );
  const spec = {
    locale: 'de-DE',
    data: [{ label: 'Revenue', amount: 1234.5, currency: 'EUR' }],
    mark: {
      type: 'table',
      options: { formatters: { amount: 'currency-code' } },
    },
    x: { field: 'label', type: 'nominal' },
    y: { field: 'amount', type: 'quantitative' },
  };
  const { scene } = compileWithRegistry(spec, registry);
  const amount = flattenScene(scene.root).find(
    ({ datum }) =>
      datum?.familyInteraction?.kind === 'table-cell' && datum.familyInteraction.field === 'amount',
  );
  assert.match(amount.datum.tooltip.formatted, /1\.234,50\sEUR/u);
  assert.throws(
    () =>
      compileWithRegistry(
        {
          ...spec,
          mark: { type: 'table', options: { formatters: { amount: 'unregistered' } } },
        },
        registry,
      ),
    /Unknown table formatter "unregistered"/u,
  );
});

test('table compiler formats epoch milliseconds with authored temporal style and time zone', () => {
  const observedAt = Date.UTC(2026, 6, 15, 4, 30, 0);
  const { scene } = compile({
    locale: 'ko-KR',
    data: [{ id: 'event-1', observedAt }],
    mark: {
      type: 'table',
      options: {
        columns: [
          'id',
          {
            field: 'observedAt',
            formatter: 'datetime',
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'Asia/Seoul',
          },
        ],
      },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'observedAt', type: 'temporal' },
  });
  const cell = flattenScene(scene.root).find(
    ({ datum }) =>
      datum?.familyInteraction?.kind === 'table-cell' &&
      datum.familyInteraction.field === 'observedAt',
  );
  assert.equal(
    cell.datum.tooltip.formatted,
    new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(new Date(observedAt)),
  );
  assert.equal(cell.datum.datum.observedAt, observedAt);
});

test('table compiler pivots matrix rows before rendering', () => {
  const { scene } = compile({
    data: [
      { region: 'East', quarter: 'Q1', amount: 10 },
      { region: 'East', quarter: 'Q2', amount: 20 },
      { region: 'West', quarter: 'Q1', amount: 30 },
    ],
    mark: {
      type: 'table',
      options: {
        pivot: { row: 'region', column: 'quarter', value: 'amount', op: 'sum' },
        windowLimit: 10,
      },
    },
    x: { field: 'region', type: 'nominal' },
    y: { field: 'amount', type: 'quantitative' },
  });
  const cells = flattenScene(scene.root).filter(({ id }) => id.includes(':table-cell:'));
  assert.ok(cells.some(({ datum }) => datum.tooltip.column === 'Q1' && datum.tooltip.value === 30));
  assert.ok(cells.some(({ datum }) => datum.tooltip.column === 'Q2' && datum.tooltip.value === 20));
});

test('table compiler restores column and row sizing while supporting closed object column definitions', () => {
  const { scene } = compile({
    width: 760,
    height: 420,
    data: [
      {
        id: 'alpha',
        value: 900,
        status: 'Ready',
        amount: 42,
        target: 50,
        trend: [31, 35, 34, 40, 42],
      },
      {
        id: 'beta',
        value: 700,
        status: 'Review',
        amount: 28,
        target: 44,
        trend: [34, 32, 30, 31, 28],
      },
    ],
    mark: {
      type: 'table',
      options: {
        headerHeight: 42,
        rowHeight: 36,
        cellPadding: 12,
        grid: { color: '#cbd5e1', width: 1.2 },
        editing: { key: 'id', commit: 'enter' },
        columns: [
          {
            field: 'id',
            header: 'Team',
            width: 240,
            editable: true,
            editor: { type: 'text' },
            validation: { pattern: '^[a-z]{1,24}$' },
            style: { fontWeight: 700 },
          },
          {
            field: 'status',
            header: 'State',
            width: 100,
            visual: {
              type: 'status-badge',
              colors: { Ready: '#047857', Review: '#b45309' },
            },
          },
          {
            field: 'amount',
            header: 'Actual',
            width: 120,
            align: 'right',
            formatter: 'integer',
            editable: true,
            editor: { type: 'integer' },
            validation: { required: true, min: 0, max: 100 },
            visual: { type: 'data-bar', min: 0, max: 100, color: '#4f46e5' },
          },
          {
            field: 'trend',
            header: 'Trend',
            width: 150,
            formatter: 'json',
            visual: { type: 'sparkline', color: '#0f766e', fill: '#ccfbf1' },
          },
          { field: 'target', header: 'Hidden target', visible: false },
        ],
      },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'amount', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  const headers = nodes.filter(({ id }) => id.includes(':table-header:'));
  const cells = nodes.filter(({ id }) => id.includes(':table-cell:'));
  assert.equal(headers.length, 4);
  assert.equal(cells.length, 8);
  assert.equal(headers[0].height, 42);
  assert.equal(cells[0].height, 36);
  assert.ok(headers[0].width > headers[1].width);
  assert.equal(headers[0].lineWidth, 0);
  assert.equal(
    nodes.find(({ id }) => id.includes(':table-grid-header:0:grid-bottom')).lineWidth,
    1.2,
  );
  assert.equal(nodes.find(({ id }) => id.includes(':table-header-label:0')).text, 'Team');
  assert.ok(!cells.some(({ datum }) => datum.tooltip.column === 'target'));
  const amount = cells.find(
    ({ datum }) => datum.tooltip.column === 'amount' && datum.tooltip.row === 0,
  );
  assert.equal(amount.datum.datum.id, 'alpha', 'source fields remain available to tooltips');
  assert.equal(amount.datum.datum.value, 900, 'source fields win generic cell metadata names');
  assert.equal(
    amount.datum.tooltip.value,
    900,
    'configured tooltips receive the complete source row',
  );
  assert.equal(
    amount.datum.datum.cellValue,
    42,
    'cell metadata remains available by reserved name',
  );
  assert.equal(amount.datum.datum.editEnabled, true);
  assert.equal(amount.datum.datum.editCommit, 'enter');
  assert.equal(amount.datum.datum.editEditorType, 'integer');
  assert.equal(amount.datum.datum.editKeyField, 'id');
  assert.equal(amount.datum.datum.editKeyValue, 'alpha');
  assert.equal(amount.datum.datum.editRequired, true);
  assert.equal(amount.datum.datum.editMin, 0);
  assert.equal(amount.datum.datum.editMax, 100);
  assert.equal(cells[0].datum.datum.editPattern, '^[a-z]{1,24}$');
  assert.ok(nodes.some(({ id }) => id.includes(':data-bar')));
  assert.ok(nodes.some(({ id }) => id.includes(':status-badge')));
  assert.ok(nodes.some(({ id }) => id.endsWith(':sparkline')));
});

test('table compiler accepts bounded validation patterns and rejects unsafe regular expressions', () => {
  const base = {
    data: [{ id: 'SG-2026', amount: 1 }],
    mark: {
      type: 'table',
      options: {
        columns: [
          {
            field: 'id',
            editable: true,
            editor: { type: 'text' },
            validation: { pattern: '^[A-Z]{2}-\\d{4}$' },
          },
          'amount',
        ],
      },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'amount', type: 'quantitative' },
  };
  assert.doesNotThrow(() => compile(base));
  for (const pattern of ['[', '^a+$', '^(a|b)$', '(a+)+$', '(?=a)a', '(a)\\1', 'a{1,10001}']) {
    assert.throws(
      () =>
        compile({
          ...base,
          mark: {
            ...base.mark,
            options: {
              columns: [
                {
                  field: 'id',
                  editable: true,
                  validation: { pattern },
                },
              ],
            },
          },
        }),
      /bounded safe regular-expression subset/u,
    );
  }
});

test('table compiler applies column, row, cell, and closed conditional styles in deterministic order', () => {
  const { scene } = compile({
    width: 640,
    height: 320,
    data: [
      { item: 'Growth', status: 'Healthy', delta: 18, progress: 0.82 },
      { item: 'Churn', status: 'Risk', delta: -12, progress: 0.31 },
    ],
    mark: {
      type: 'table',
      options: {
        columns: [
          { field: 'item', header: 'Metric' },
          {
            field: 'status',
            visual: {
              type: 'status-badge',
              colors: { Healthy: '#047857', Risk: '#be123c' },
            },
          },
          { field: 'delta', visual: { type: 'heatmap', min: -20, max: 20 } },
          {
            field: 'progress',
            formatter: 'percent',
            visual: { type: 'progress', min: 0, max: 1, color: '#4f46e5' },
          },
        ],
        style: { textColor: '#334155' },
        columnStyles: { delta: { fill: '#eef2ff' } },
        rowStyles: [{ row: 1, style: { fill: '#fff7ed' } }],
        cellStyles: [{ row: 0, field: 'item', style: { fill: '#ecfeff' } }],
        conditionalFormats: [
          {
            target: 'cell',
            field: 'delta',
            when: { operator: 'less', value: 0 },
            style: { fill: '#ffe4e6', textColor: '#9f1239', fontWeight: 700 },
          },
          {
            target: 'row',
            when: { field: 'status', operator: 'equals', value: 'Risk' },
            style: { stroke: '#fb7185', lineWidth: 1.5 },
          },
        ],
      },
    },
    x: { field: 'item', type: 'nominal' },
    y: { field: 'delta', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  const cells = nodes.filter(({ id }) => id.includes(':table-cell:'));
  const item = cells.find(
    ({ datum }) => datum.tooltip.row === 0 && datum.tooltip.column === 'item',
  );
  const negative = cells.find(
    ({ datum }) => datum.tooltip.row === 1 && datum.tooltip.column === 'delta',
  );
  assert.equal(item.fill, '#ecfeff');
  assert.equal(negative.fill, '#ffe4e6');
  assert.equal(negative.stroke, '#fb7185');
  assert.equal(negative.lineWidth, 1.5);
  const negativeLabel = nodes.find(({ id }) => id.includes(':table-cell-label:1:2'));
  assert.equal(negativeLabel.fill, '#9f1239');
  assert.equal(negativeLabel.fontWeight, 700);
  assert.ok(nodes.some(({ id }) => id.endsWith(':progress-track')));
  assert.ok(nodes.some(({ id }) => id.endsWith(':progress')));

  const verticalGrid = flattenScene(
    compile({
      width: 480,
      height: 240,
      data: [{ item: 'Only', delta: 1 }],
      mark: {
        type: 'table',
        options: { grid: { rows: false, columns: true, width: 2 } },
      },
      x: { field: 'item', type: 'nominal' },
      y: { field: 'delta', type: 'quantitative' },
    }).scene.root,
  );
  assert.ok(verticalGrid.some(({ id }) => id.endsWith(':grid-right')));
  assert.ok(!verticalGrid.some(({ id }) => id.endsWith(':grid-bottom')));
});

test('table compiler renders explicit and repeated merges once with anchor span metadata', () => {
  const { scene } = compile({
    width: 600,
    height: 320,
    data: [
      { region: 'North', metric: 'Revenue', value: 72 },
      { region: 'North', metric: 'Margin', value: 48 },
      { region: 'Summary', metric: 'All metrics', value: 120 },
    ],
    mark: {
      type: 'table',
      options: {
        columns: ['region', 'metric', 'value'],
        rowHeight: 40,
        mergeRepeats: ['region'],
        merges: [{ row: 2, column: 'region', columnSpan: 2 }],
      },
    },
    x: { field: 'region', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const cells = flattenScene(scene.root).filter(({ id }) => id.includes(':table-cell:'));
  assert.equal(cells.length, 7, 'two covered cells are omitted from the nine-cell grid');
  const repeated = cells.find(
    ({ datum }) => datum.tooltip.row === 0 && datum.tooltip.column === 'region',
  );
  assert.equal(repeated.height, 80);
  assert.equal(repeated.datum.datum.merged, true);
  assert.equal(repeated.datum.datum.rowSpan, 2);
  assert.equal(repeated.datum.datum.columnSpan, 1);
  const explicit = cells.find(
    ({ datum }) => datum.tooltip.row === 2 && datum.tooltip.column === 'region',
  );
  const ordinaryWidth = cells.find(
    ({ datum }) => datum.tooltip.row === 0 && datum.tooltip.column === 'metric',
  ).width;
  assert.ok(explicit.width > ordinaryWidth);
  assert.equal(explicit.datum.datum.columnSpan, 2);
  assert.ok(
    !cells.some(({ datum }) => datum.tooltip.row === 1 && datum.tooltip.column === 'region'),
  );
  assert.ok(
    !cells.some(({ datum }) => datum.tooltip.row === 2 && datum.tooltip.column === 'metric'),
  );
});

test('table compiler rejects unknown style, visual, condition, and unsafe merge contracts', () => {
  const base = {
    data: [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ],
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  };
  assert.throws(
    () =>
      compile({
        ...base,
        mark: { type: 'table', options: { columns: [{ field: 'id', style: { shadow: 1 } }] } },
      }),
    /Unknown table option "shadow"/u,
  );
  assert.throws(
    () =>
      compile({
        ...base,
        mark: {
          type: 'table',
          options: { columns: [{ field: 'value', visual: { type: 'meter' } }] },
        },
      }),
    /Unknown table cell visual/u,
  );
  assert.throws(
    () =>
      compile({
        ...base,
        mark: {
          type: 'table',
          options: {
            conditionalFormats: [
              { when: { operator: 'matches', value: '.*' }, style: { fill: '#ffffff' } },
            ],
          },
        },
      }),
    /Unknown table condition/u,
  );
  assert.throws(
    () =>
      compile({
        ...base,
        mark: { type: 'table', options: { merges: [{ row: 0, column: 0, rowSpan: 3 }] } },
      }),
    /bounds/u,
  );
});

test('polar compiler supports zero/direction/wrap, nonlinear radius, bins, stack, and normalization', () => {
  for (const radiusScale of ['linear', 'sqrt', 'log']) {
    for (const stack of ['none', 'stack', 'normalize']) {
      const { scene } = compile({
        data: [
          { id: 'a', angle: 10, value: 2, series: 'S1' },
          { id: 'b', angle: 20, value: 4, series: 'S2' },
          { id: 'c', angle: 190, value: 8, series: 'S1' },
        ],
        mark: {
          type: 'polar',
          fields: { id: 'id', angle: 'angle', value: 'value', series: 'series' },
          options: {
            zero: 30,
            direction: 'counterclockwise',
            wrap: [0, 360],
            radiusScale,
            bins: 4,
            radialStack: stack,
          },
        },
        x: { field: 'angle', type: 'quantitative' },
        y: { field: 'value', type: 'quantitative' },
      });
      const segments = flattenScene(scene.root).filter(({ id }) => id.includes(':polar:'));
      assert.equal(segments.length, 3);
      assert.ok(segments.every(({ datum }) => datum.tooltip.direction === 'counterclockwise'));
      assert.ok(segments.every(({ datum }) => datum.tooltip.zero === 30));
      if (stack === 'normalize') {
        assert.ok(
          segments.every(
            ({ datum }) => datum.tooltip.proportion >= 0 && datum.tooltip.proportion <= 1,
          ),
        );
      }
      if (stack === 'stack' || stack === 'normalize') {
        assert.equal(Math.max(...segments.map(({ datum }) => datum.tooltip.outerRadius)), 1);
        assert.ok(segments.every(({ datum }) => datum.tooltip.outerRadius <= 1));
      }
    }
  }
});
