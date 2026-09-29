import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createCompleteRegistry } from '../.tmp/src/complete.js';
import { Chart } from '../.tmp/src/runtime/chart.js';
import {
  TableDataHistory,
  isSafeTableValidationPattern,
  parseTableEditorValue,
  parseTableTSV,
  tableCSV,
  tableEditingConfig,
  tableTSV,
  validateTableCellValue,
} from '../.tmp/src/runtime/table-edit.js';

const silentRendererFactory = {
  name: 'silent-table-edit-test',
  capabilities: { vector: false, gpu: false, worker: false, exportFormats: [] },
  create: () => ({
    name: 'silent-table-edit-test',
    capabilities: silentRendererFactory.capabilities,
    mount() {},
    resize() {},
    render() {},
    surface: () => null,
    overlayHost: () => null,
    destroy() {},
  }),
};

function createTableInstance(data, options = {}) {
  const registry = createCompleteRegistry();
  registry.registerRenderer(silentRendererFactory);
  return new Chart(
    { clientWidth: 720, clientHeight: 460 },
    {
      width: 720,
      height: 460,
      renderer: silentRendererFactory.name,
      data,
      mark: {
        type: 'table',
        options: {
          columns: [
            { field: 'id', header: 'ID' },
            {
              field: 'name',
              header: 'Name',
              editable: true,
              editor: { type: 'text' },
              validation: { required: true, minLength: 2 },
            },
            {
              field: 'amount',
              header: 'Amount',
              editable: true,
              editor: { type: 'number' },
              validation: { min: 0, max: 100 },
            },
            {
              field: 'status',
              header: 'Status',
              editable: true,
              editor: { type: 'select', options: ['ready', 'done'] },
            },
          ],
          editing: { enabled: true, key: 'id', commit: 'enter-or-blur' },
          ...options,
        },
      },
      x: { field: 'id', type: 'quantitative' },
      y: { field: 'amount', type: 'quantitative' },
    },
    registry,
    { autoResize: false },
  );
}

test('table source/view APIs preserve source identity across sort and replace rows immutably', () => {
  const authored = [
    { id: 1, name: 'Alpha', amount: 10, status: 'ready', when: new Date('2026-01-01T00:00:00Z') },
    { id: 2, name: 'Beta', amount: 20, status: 'done', when: new Date('2026-01-02T00:00:00Z') },
  ];
  const instance = createTableInstance(authored);
  instance.setTableSort('layer-0', [{ field: 'amount', direction: 'descending' }]);
  assert.deepEqual(
    instance.getTableData('layer-0', 'view').map(({ id }) => id),
    [2, 1],
  );

  const editEvents = [];
  const tableEvents = [];
  instance.on('tableeditchange', (event) => editEvents.push(event));
  instance.on('tablechange', ({ reason }) => tableEvents.push(reason));
  assert.equal(instance.setTableCellValue('layer-0', 0, 'amount', 25), true);
  assert.equal(instance.setTableCellValue('layer-0', { key: 1 }, 'name', 'Alpha+'), true);

  assert.deepEqual(
    instance
      .getTableData('layer-0', 'source')
      .map(({ id, name, amount }) => ({ id, name, amount })),
    [
      { id: 1, name: 'Alpha+', amount: 10 },
      { id: 2, name: 'Beta', amount: 25 },
    ],
  );
  assert.equal(authored[0].name, 'Alpha');
  assert.equal(authored[1].amount, 20);
  const detached = instance.getTableData('layer-0', 'source');
  detached[0].name = 'mutated-return-value';
  assert.equal(instance.getTableData('layer-0', 'source')[0].name, 'Alpha+');
  assert.deepEqual(
    editEvents.map(({ row, sourceRowIndex, field, previousValue, newValue, valid, reason }) => ({
      row,
      sourceRowIndex,
      field,
      previousValue,
      newValue,
      valid,
      reason,
    })),
    [
      {
        row: 0,
        sourceRowIndex: 1,
        field: 'amount',
        previousValue: 20,
        newValue: 25,
        valid: true,
        reason: 'programmatic',
      },
      {
        row: 1,
        sourceRowIndex: 0,
        field: 'name',
        previousValue: 'Alpha',
        newValue: 'Alpha+',
        valid: true,
        reason: 'programmatic',
      },
    ],
  );
  assert.deepEqual(tableEvents, ['programmatic', 'programmatic']);
  instance.destroy();
});

test('stable-key edits can address a source row outside the current runtime filter', () => {
  const instance = createTableInstance([
    { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
    { id: 2, name: 'Beta', amount: 20, status: 'done' },
  ]);
  const events = [];
  instance.on('tableeditchange', (event) => events.push(event));
  instance.setTableFilters('layer-0', [{ field: 'status', operator: 'equals', value: 'done' }]);

  assert.deepEqual(
    instance.getTableData('layer-0', 'view').map(({ id }) => id),
    [2],
  );
  assert.equal(instance.setTableCellValue('layer-0', { key: 1 }, 'name', 'Alpha hidden'), true);
  assert.equal(instance.setTableCellValue('layer-0', 0, 'amount', 25), true);
  assert.deepEqual(
    instance
      .getTableData('layer-0', 'source')
      .map(({ id, name, amount }) => ({ id, name, amount })),
    [
      { id: 1, name: 'Alpha hidden', amount: 10 },
      { id: 2, name: 'Beta', amount: 25 },
    ],
  );
  assert.equal(events[0].row, 0, 'a filtered-out key reports its stable source row index');
  assert.equal(events[1].row, 0, 'a numeric target keeps current-view index semantics');
  assert.equal(events[0].sourceRowIndex, 0);
  assert.equal(events[1].sourceRowIndex, 1);
  instance.destroy();
});

test('table editing validates typed columns and fails closed for derived output', () => {
  const instance = createTableInstance([
    { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
    { id: 2, name: 'Beta', amount: 20, status: 'done' },
  ]);
  const events = [];
  instance.on('tableeditchange', (event) => events.push(event));

  assert.equal(instance.setTableCellValue('layer-0', 0, 'amount', -1), false);
  assert.equal(instance.setTableCellValue('layer-0', 0, 'amount', '12'), false);
  assert.equal(instance.setTableCellValue('layer-0', 0, 'name', ''), false);
  assert.equal(instance.setTableCellValue('layer-0', 0, 'status', 'waiting'), false);
  assert.equal(instance.setTableCellValue('layer-0', 0, 'id', 3), false);
  assert.deepEqual(
    events.map(({ valid, reason }) => [valid, reason]),
    [
      [false, 'minimum'],
      [false, 'invalid-type'],
      [false, 'required'],
      [false, 'invalid-type'],
      [false, 'field-not-editable'],
    ],
  );
  assert.equal(instance.getTableData('layer-0', 'source')[0].amount, 10);

  instance.setTableGroup('layer-0', {
    fields: ['status'],
    aggregates: [{ field: 'amount', op: 'sum', as: 'total' }],
  });
  assert.equal(instance.setTableCellValue('layer-0', 0, 'amount', 12), false);
  assert.equal(events.at(-1).reason, 'derived-view-read-only');
  instance.destroy();

  const duplicate = createTableInstance([
    { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
    { id: 1, name: 'Beta', amount: 20, status: 'done' },
  ]);
  let duplicateReason;
  duplicate.on('tableeditchange', ({ reason }) => {
    duplicateReason = reason;
  });
  assert.equal(duplicate.setTableCellValue('layer-0', { key: 1 }, 'name', 'Changed'), false);
  assert.equal(duplicateReason, 'duplicate-key');
  duplicate.destroy();
});

test('stable-key edits fail closed when an authored transform has multi-row lineage', () => {
  const registry = createCompleteRegistry();
  registry.registerRenderer(silentRendererFactory);
  const instance = new Chart(
    { clientWidth: 720, clientHeight: 460 },
    {
      renderer: silentRendererFactory.name,
      data: [
        { id: 1, group: 'A', amount: 10 },
        { id: 2, group: 'A', amount: 20 },
      ],
      transform: [
        {
          type: 'aggregate',
          groupby: ['group'],
          fields: [{ op: 'sum', field: 'amount', as: 'total' }],
        },
      ],
      mark: {
        type: 'table',
        options: {
          columns: [
            'group',
            'total',
            { field: 'amount', editable: true, editor: { type: 'number' } },
          ],
          editing: { enabled: true, key: 'id' },
        },
      },
      x: { field: 'group', type: 'nominal' },
      y: { field: 'total', type: 'quantitative' },
    },
    registry,
    { autoResize: false },
  );
  let reason;
  instance.on('tableeditchange', (event) => {
    reason = event.reason;
  });
  assert.equal(instance.setTableCellValue('layer-0', { key: 1 }, 'amount', 99), false);
  assert.equal(reason, 'source-row-unavailable');
  assert.equal(instance.getTableData('layer-0', 'source')[0].amount, 10);
  instance.destroy();
});

test('table edit history resets, undoes, redoes, and emits cell transitions', () => {
  const instance = createTableInstance([
    { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
    { id: 2, name: 'Beta', amount: 20, status: 'done' },
  ]);
  const reasons = [];
  const batchReasons = [];
  instance.on('tableeditchange', ({ reason }) => reasons.push(reason));
  instance.on('tablebatchchange', ({ reason }) => batchReasons.push(reason));
  assert.equal(instance.undoTableEdit('layer-0'), false);
  assert.equal(instance.setTableCellValue('layer-0', { key: 1 }, 'name', 'Changed'), true);
  assert.equal(instance.undoTableEdit('layer-0'), true);
  assert.equal(instance.getTableData('layer-0', 'source')[0].name, 'Alpha');
  assert.equal(instance.redoTableEdit('layer-0'), true);
  assert.equal(instance.getTableData('layer-0', 'source')[0].name, 'Changed');
  assert.equal(instance.resetTableData('layer-0'), true);
  assert.equal(instance.getTableData('layer-0', 'source')[0].name, 'Alpha');
  assert.equal(instance.undoTableEdit('layer-0'), true);
  assert.equal(instance.getTableData('layer-0', 'source')[0].name, 'Changed');
  assert.deepEqual(reasons, ['programmatic', 'undo', 'redo', 'reset', 'undo']);
  assert.deepEqual(batchReasons, ['undo', 'redo', 'reset', 'undo']);
  instance.destroy();
});

test('table exports support source/view modes, portable dates, and inert spreadsheet formulas', () => {
  const instance = createTableInstance([
    {
      id: 1,
      name: '=HYPERLINK("https://invalid.example")',
      amount: 10,
      status: 'ready',
      when: new Date('2026-01-01T12:34:56Z'),
    },
  ]);
  const csv = instance.exportTableCSV('layer-0', 'source');
  assert.match(csv, /'=HYPERLINK/);
  assert.doesNotMatch(csv, /\r\n=HYPERLINK/);
  assert.equal(
    JSON.parse(instance.exportTableJSON('layer-0', 'source'))[0].when,
    '2026-01-01T12:34:56.000Z',
  );
  assert.deepEqual(Object.keys(JSON.parse(instance.exportTableJSON('layer-0', 'view'))[0]), [
    'id',
    'name',
    'amount',
    'status',
  ]);
  instance.destroy();
});

test('rectangular TSV paste is typed, atomic, source-addressable, and one undo transaction', () => {
  const instance = createTableInstance([
    { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
    { id: 2, name: 'Beta', amount: 20, status: 'done' },
  ]);
  const batches = [];
  const changes = [];
  const cells = [];
  instance.on('tablepaste', (event) => batches.push(event));
  instance.on('tablebatchchange', (event) => changes.push(event));
  instance.on('tableeditchange', (event) => cells.push(event));

  instance.setTableRange('layer-0', {
    anchor: { row: 0, column: 1 },
    focus: { row: 0, column: 1 },
  });
  const result = instance.pasteTableTSV('layer-0', 'Alpha pasted\t11\r\nBeta pasted\t22');
  assert.equal(result.applied, true);
  assert.equal(result.reason, 'paste');
  assert.deepEqual(
    result.edits.map(({ viewRow, sourceRowIndex, column, field, newValue }) => ({
      viewRow,
      sourceRowIndex,
      column,
      field,
      newValue,
    })),
    [
      { viewRow: 0, sourceRowIndex: 0, column: 1, field: 'name', newValue: 'Alpha pasted' },
      { viewRow: 0, sourceRowIndex: 0, column: 2, field: 'amount', newValue: 11 },
      { viewRow: 1, sourceRowIndex: 1, column: 1, field: 'name', newValue: 'Beta pasted' },
      { viewRow: 1, sourceRowIndex: 1, column: 2, field: 'amount', newValue: 22 },
    ],
  );
  assert.equal(batches.length, 1);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].reason, 'paste');
  assert.equal(cells.length, 0, 'one batch event prevents duplicate host mutations');
  assert.equal(instance.exportTableTSV('layer-0'), 'Alpha pasted\t11\r\nBeta pasted\t22');
  assert.equal(instance.undoTableEdit('layer-0'), true);
  assert.deepEqual(
    instance.getTableData('layer-0', 'source').map(({ name, amount }) => ({ name, amount })),
    [
      { name: 'Alpha', amount: 10 },
      { name: 'Beta', amount: 20 },
    ],
  );
  assert.equal(cells.length, 0, 'batch undo must not expand into cell events');
  assert.equal(changes.length, 2);
  assert.equal(changes[1].reason, 'undo');
  assert.equal(instance.undoTableEdit('layer-0'), false);
  assert.equal(instance.redoTableEdit('layer-0'), true);
  assert.equal(changes.at(-1).reason, 'redo');
  assert.equal(instance.resetTableData('layer-0'), true);
  assert.equal(changes.at(-1).reason, 'reset');
  assert.equal(cells.length, 0, 'batch redo and reset must stay atomic');
  instance.destroy();
});

test('rectangular TSV paste validates every cell before mutation and reports one failed batch', () => {
  const instance = createTableInstance([
    { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
    { id: 2, name: 'Beta', amount: 20, status: 'done' },
  ]);
  const batches = [];
  instance.on('tablepaste', (event) => batches.push(event));
  instance.setTableRange('layer-0', {
    anchor: { row: 0, column: 1 },
    focus: { row: 0, column: 1 },
  });

  const result = instance.pasteTableTSV('layer-0', 'Changed\t12\r\nAlso changed\t-1');
  assert.deepEqual(result, {
    applied: false,
    reason: 'minimum',
    range: {
      anchor: { row: 0, column: 1 },
      focus: { row: 1, column: 2 },
    },
    edits: [],
  });
  assert.equal(batches.length, 1);
  assert.equal(batches[0].applied, false);
  assert.deepEqual(
    instance.getTableData('layer-0', 'source').map(({ name, amount }) => ({ name, amount })),
    [
      { name: 'Alpha', amount: 10 },
      { name: 'Beta', amount: 20 },
    ],
  );
  assert.equal(instance.undoTableEdit('layer-0'), false);
  instance.destroy();
});

test('covered merged cells reject focus, range export, and paste without partial mutation', () => {
  const instance = createTableInstance(
    [
      { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
      { id: 2, name: 'Beta', amount: 20, status: 'done' },
    ],
    { merges: [{ row: 0, column: 'name', columnSpan: 2 }] },
  );
  assert.doesNotThrow(() => instance.focusTableCell('layer-0', 0, 1));
  assert.throws(() => instance.focusTableCell('layer-0', 0, 2), /covered merged cell/u);
  assert.throws(
    () =>
      instance.exportTableTSV('layer-0', {
        anchor: { row: 0, column: 1 },
        focus: { row: 0, column: 2 },
      }),
    /covered merged cell/u,
  );
  const result = instance.pasteTableTSV('layer-0', 'Changed\t12');
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'merged-cell-read-only');
  assert.deepEqual(instance.getTableData('layer-0', 'source')[0], {
    id: 1,
    name: 'Alpha',
    amount: 10,
    status: 'ready',
  });
  assert.equal(instance.undoTableEdit('layer-0'), false);
  instance.destroy();
});

test('sorted and filtered paste resolves every destination from the pre-paste view', () => {
  const instance = createTableInstance([
    { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
    { id: 2, name: 'Beta', amount: 20, status: 'done' },
    { id: 3, name: 'Gamma', amount: 30, status: 'ready' },
  ]);
  const batches = [];
  instance.on('tablepaste', (event) => batches.push(event));
  instance.setTableFilters('layer-0', [{ field: 'status', operator: 'equals', value: 'ready' }]);
  instance.setTableSort('layer-0', [{ field: 'amount', direction: 'descending' }]);
  instance.setTableRange('layer-0', {
    anchor: { row: 0, column: 1 },
    focus: { row: 0, column: 1 },
  });

  const result = instance.pasteTableTSV('layer-0', 'Gamma moved\t5\tdone\r\nAlpha moved\t40\tdone');
  assert.equal(result.applied, true);
  assert.deepEqual(
    result.edits.map(({ viewRow, sourceRowIndex, field }) => ({
      viewRow,
      sourceRowIndex,
      field,
    })),
    [
      { viewRow: 0, sourceRowIndex: 2, field: 'name' },
      { viewRow: 0, sourceRowIndex: 2, field: 'amount' },
      { viewRow: 0, sourceRowIndex: 2, field: 'status' },
      { viewRow: 1, sourceRowIndex: 0, field: 'name' },
      { viewRow: 1, sourceRowIndex: 0, field: 'amount' },
      { viewRow: 1, sourceRowIndex: 0, field: 'status' },
    ],
  );
  assert.deepEqual(
    instance.getTableData('layer-0', 'source').map(({ id, name, amount, status }) => ({
      id,
      name,
      amount,
      status,
    })),
    [
      { id: 1, name: 'Alpha moved', amount: 40, status: 'done' },
      { id: 2, name: 'Beta', amount: 20, status: 'done' },
      { id: 3, name: 'Gamma moved', amount: 5, status: 'done' },
    ],
  );
  assert.equal(batches.length, 1);
  assert.equal(instance.getTableRange('layer-0'), null, 'the filter now removes every pasted row');
  instance.destroy();
});

test('runtime filtering clamps or clears stale table ranges before export and paste', () => {
  const instance = createTableInstance([
    { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
    { id: 2, name: 'Beta', amount: 20, status: 'done' },
  ]);
  instance.setTableRange('layer-0', {
    anchor: { row: 1, column: 1 },
    focus: { row: 1, column: 2 },
  });
  instance.setTableFilters('layer-0', [{ field: 'status', operator: 'equals', value: 'ready' }]);
  assert.deepEqual(instance.getTableRange('layer-0'), {
    anchor: { row: 0, column: 1 },
    focus: { row: 0, column: 2 },
  });
  assert.equal(instance.exportTableTSV('layer-0'), 'Alpha\t10');

  instance.setTableFilters('layer-0', [{ field: 'status', operator: 'equals', value: 'missing' }]);
  assert.equal(instance.getTableRange('layer-0'), null);
  assert.equal(instance.exportTableTSV('layer-0'), '');
  assert.equal(instance.pasteTableTSV('layer-0', 'Changed').reason, 'no-selection');
  instance.destroy();
});

test('runtime-derived columns refresh focused field without changing valid range coordinates', () => {
  const instance = createTableInstance(
    [
      { id: 1, name: 'Alpha', amount: 10, status: 'ready' },
      { id: 2, name: 'Beta', amount: 20, status: 'done' },
    ],
    { columns: ['status', 'name', 'total'] },
  );
  instance.focusTableCell('layer-0', 0, 1);
  assert.equal(instance.getFamilyFocus().field, 'name');
  instance.setTableGroup('layer-0', {
    fields: ['status'],
    aggregates: [{ field: 'amount', op: 'sum', as: 'total' }],
  });
  assert.deepEqual(instance.getTableRange('layer-0'), {
    anchor: { row: 0, column: 1 },
    focus: { row: 0, column: 1 },
  });
  assert.equal(instance.getFamilyFocus().field, 'total');
  instance.destroy();
});

test('table ranges follow the single family-focus owner across layers and pie focus', () => {
  const registry = createCompleteRegistry();
  registry.registerRenderer(silentRendererFactory);
  const instance = new Chart(
    { clientWidth: 720, clientHeight: 460 },
    {
      width: 720,
      height: 460,
      renderer: silentRendererFactory.name,
      layers: [
        {
          id: 'first-table',
          data: [{ id: 1, value: 10 }],
          mark: { type: 'table', options: { columns: ['id', 'value'] } },
          x: { field: 'id', type: 'nominal' },
          y: 'value',
        },
        {
          id: 'second-table',
          data: [{ id: 2, value: 20 }],
          mark: { type: 'table', options: { columns: ['id', 'value'] } },
          x: { field: 'id', type: 'nominal' },
          y: 'value',
        },
        {
          id: 'pie',
          data: [
            { group: 'A', value: 1 },
            { group: 'B', value: 2 },
          ],
          mark: 'pie',
          x: 'group',
          y: 'value',
        },
      ],
    },
    registry,
    { autoResize: false },
  );
  const cleared = [];
  instance.on('tablerangechange', ({ layerId, range }) => {
    if (range === null) cleared.push(layerId);
  });

  instance.focusTableCell('first-table', 0, 0);
  instance.focusTableCell('second-table', 0, 0);
  assert.equal(instance.getTableRange('first-table'), null);
  assert.notEqual(instance.getTableRange('second-table'), null);
  const pieSlice = sceneNodes(instance.getScene().root).find(
    ({ datum }) => datum?.familyInteraction?.kind === 'pie-slice',
  );
  instance.focusPieSlice('pie', pieSlice.datum.familyInteraction.id);
  assert.equal(instance.getTableRange('second-table'), null);
  assert.deepEqual(cleared, ['first-table', 'second-table']);
  instance.destroy();
});

test('TSV helpers retain quoted cells, reject ragged grids, and keep formula text inert', () => {
  assert.deepEqual(parseTableTSV(''), [['']], 'an empty clipboard is one blank cell');
  assert.deepEqual(parseTableTSV('"a\tb"\t"line 1\r\nline 2"\r\nvalue\t2'), [
    ['a\tb', 'line 1\nline 2'],
    ['value', '2'],
  ]);
  assert.throws(() => parseTableTSV('a\tb\r\nc'), /rectangular/u);
  assert.throws(() => parseTableTSV('"a"junk\tb'), /delimiter/u);
  assert.equal(tableTSV([{ a: '=1+1', b: 'a\tb' }], ['a', 'b']), '\'=1+1\t"a\tb"');
});

test('portable editing helpers apply closed defaults and bounded immutable history', () => {
  const config = tableEditingConfig({
    editing: { key: 'id' },
    columns: [
      {
        field: 'count',
        editable: true,
        editor: { type: 'integer' },
        validation: { min: 1, max: 3 },
      },
    ],
  });
  const column = config.columns.get('count');
  assert.equal(config.commit, 'enter-or-blur');
  assert.deepEqual(validateTableCellValue(column, 2), { valid: true, reason: 'programmatic' });
  assert.deepEqual(validateTableCellValue(column, 2.5), { valid: false, reason: 'invalid-type' });
  assert.equal(parseTableEditorValue(column, '3'), 3);
  assert.equal(tableCSV([{ value: '+SUM(A1:A2)' }]), "value\r\n'+SUM(A1:A2)");
  assert.equal(tableCSV([{ value: -3 }]), 'value\r\n-3');

  const history = new TableDataHistory([{ value: 1 }], 2);
  const next = [{ value: 2 }];
  assert.equal(history.replace(next), true);
  next[0].value = 999;
  assert.deepEqual(history.rows(), [{ value: 2 }]);
  assert.deepEqual(history.undo().rows, [{ value: 1 }]);
  assert.deepEqual(history.redo().rows, [{ value: 2 }]);
});

test('table validation patterns and temporal editors use closed portable contracts', () => {
  assert.equal(isSafeTableValidationPattern('^[A-Z]{2}-\\d{4}$'), true);
  assert.equal(isSafeTableValidationPattern('^[a-z]{1,24}$'), true);
  assert.equal(isSafeTableValidationPattern('^a{0,4096}a{0,4096}a{0,4096}b$'), false);
  assert.equal(isSafeTableValidationPattern('^a?a?b$'), false);

  const config = tableEditingConfig({
    columns: [
      {
        field: 'code',
        editable: true,
        editor: { type: 'text' },
        validation: { pattern: '^[A-Z]{2}-\\d{4}$' },
      },
      { field: 'day', editable: true, editor: { type: 'date' } },
      { field: 'instant', editable: true, editor: { type: 'datetime' } },
    ],
  });
  assert.deepEqual(validateTableCellValue(config.columns.get('code'), 'SG-2026'), {
    valid: true,
    reason: 'programmatic',
  });
  assert.deepEqual(validateTableCellValue(config.columns.get('code'), 'sg-2026'), {
    valid: false,
    reason: 'pattern',
  });
  const numericPattern = tableEditingConfig({
    columns: [
      {
        field: 'numericCode',
        editor: { type: 'number' },
        validation: { pattern: '^42$' },
      },
    ],
  }).columns.get('numericCode');
  assert.deepEqual(validateTableCellValue(numericPattern, 42), {
    valid: false,
    reason: 'pattern',
  });

  const date = config.columns.get('day');
  assert.equal(validateTableCellValue(date, '2028-02-29').valid, true);
  for (const invalid of ['2026-2-01', '2026-02-30', 'May 1, 2026', '2026-02-01T00:00']) {
    assert.deepEqual(validateTableCellValue(date, invalid), {
      valid: false,
      reason: 'invalid-type',
    });
  }
  assert.equal(validateTableCellValue(date, new Date('2026-02-01T00:00:00Z')).valid, false);

  const datetime = config.columns.get('instant');
  for (const valid of [
    '2026-08-27T00:30',
    '2026-08-27T00:30:15.123Z',
    '2026-08-27T09:30:15+09:00',
    new Date('2026-08-27T00:30:00Z'),
  ]) {
    assert.equal(validateTableCellValue(datetime, valid).valid, true);
  }
  for (const invalid of ['2026-08-27', 'August 27, 2026 00:30', '08/27/2026']) {
    assert.deepEqual(validateTableCellValue(datetime, invalid), {
      valid: false,
      reason: 'invalid-type',
    });
  }
  assert.equal(parseTableEditorValue(date, '2026-08-27'), '2026-08-27');
  assert.equal(parseTableEditorValue(datetime, '2026-08-27T00:30'), '2026-08-27T00:30');

  for (const unsafe of [
    '[',
    '^a+$',
    '^(a|b)$',
    '(a+)+$',
    '(?=a)a',
    '(a)\\1',
    'a{1,10001}',
    '^a{0,4096}a{0,4096}a{0,4096}b$',
    '^a?a?b$',
  ]) {
    assert.throws(
      () =>
        tableEditingConfig({
          columns: [{ field: 'value', validation: { pattern: unsafe } }],
        }),
      /outside the safe subset/u,
    );
  }
});

test('large table history retains bounded cell patches instead of per-edit row snapshots', () => {
  const rowCount = 20_000;
  const history = new TableDataHistory(
    Array.from({ length: rowCount }, (_, id) => ({ id, value: id })),
  );
  for (let edit = 1; edit <= 120; edit += 1) {
    const next = history.rows();
    next[0].value = edit;
    assert.equal(history.replace(next), true);
  }
  for (let undo = 0; undo < 100; undo += 1) assert.notEqual(history.undo(), null);
  assert.equal(history.undo(), null, 'the default patch history is capped at 100 edits');
  assert.equal(history.rows()[0].value, 20);
  assert.equal(history.rows().at(-1).value, rowCount - 1);

  const cellBounded = new TableDataHistory(
    [
      { a: 0, b: 0 },
      { a: 0, b: 0 },
    ],
    100,
    3,
  );
  cellBounded.replace([
    { a: 1, b: 1 },
    { a: 0, b: 0 },
  ]);
  cellBounded.replace([
    { a: 1, b: 1 },
    { a: 2, b: 2 },
  ]);
  assert.notEqual(cellBounded.undo(), null);
  assert.equal(cellBounded.undo(), null, 'the cumulative patch-cell budget evicts old batches');
  assert.throws(
    () =>
      new TableDataHistory(
        [
          { a: 0, b: 0 },
          { a: 0, b: 0 },
        ],
        100,
        3,
      ).replace([
        { a: 1, b: 1 },
        { a: 2, b: 2 },
      ]),
    /limited to 3 changed cells/u,
  );

  const implementation = readFileSync(
    new URL('../src/runtime/table-edit.ts', import.meta.url),
    'utf8',
  );
  assert.match(implementation, /#past: TableDataPatch\[\]/u);
  assert.match(implementation, /#future: TableDataPatch\[\]/u);
  assert.doesNotMatch(implementation, /#past:\s*(?:readonly\s+)?DataRow/u);
  assert.doesNotMatch(implementation, /#future:\s*(?:readonly\s+)?DataRow/u);
});

class FakeElement extends EventTarget {
  constructor(tagName, ownerDocument) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.dataset = {};
    this.style = {
      touchAction: 'pan-y',
      cursor: 'default',
      setProperty(name, value) {
        this[name] = value;
      },
    };
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.clientWidth = 480;
    this.clientHeight = 320;
    this.rect = { left: 0, top: 0, width: 480, height: 320 };
    this.textContent = '';
    this.className = '';
    this.value = '';
    this.checked = false;
    this.selectedIndex = -1;
    this.type = '';
    this.step = '';
    this.tabIndex = -1;
  }

  append(...children) {
    for (const child of children) {
      child.remove?.();
      child.parentElement = this;
      this.children.push(child);
    }
  }

  remove() {
    if (this.parentElement === null) return;
    const index = this.parentElement.children.indexOf(this);
    if (index >= 0) this.parentElement.children.splice(index, 1);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getBoundingClientRect() {
    return this.rect;
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  select() {}
}

class FakeDocument extends EventTarget {
  constructor() {
    super();
    this.hidden = false;
    this.fullscreenElement = null;
    this.activeElement = null;
    this.documentElement = new FakeElement('html', this);
    this.body = new FakeElement('body', this);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  querySelector() {
    return null;
  }
}

class FakePointerEvent extends Event {
  constructor(type, init = {}) {
    super(type, { cancelable: true });
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
    this.button = init.button ?? 0;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
    this.ctrlKey = init.ctrlKey ?? false;
    this.metaKey = init.metaKey ?? false;
    this.altKey = init.altKey ?? false;
    this.shiftKey = init.shiftKey ?? false;
    this.detail = init.detail ?? 1;
  }
}

class FakeKeyboardEvent extends Event {
  constructor(type, init = {}) {
    super(type, { cancelable: true });
    this.key = init.key ?? '';
    this.ctrlKey = init.ctrlKey ?? false;
    this.metaKey = init.metaKey ?? false;
    this.altKey = init.altKey ?? false;
    this.shiftKey = init.shiftKey ?? false;
  }
}

class FakeClipboardEvent extends Event {
  constructor(type, text = '') {
    super(type, { cancelable: true });
    const values = new Map([['text/plain', text]]);
    this.clipboardData = {
      getData(format) {
        return values.get(format) ?? '';
      },
      setData(format, value) {
        values.set(format, value);
      },
    };
  }
}

class FakeRenderer {
  name = 'table-overlay-test';
  capabilities = {
    vector: false,
    gpu: false,
    worker: false,
    exportFormats: [],
    inspectionViewport: true,
  };
  host = null;
  surfaceElement = null;

  mount(target, options) {
    this.host = target.ownerDocument.createElement('div');
    this.surfaceElement = target.ownerDocument.createElement('canvas');
    this.host.append(this.surfaceElement);
    target.append(this.host);
    this.resize(options.width, options.height);
    this.surfaceElement.setAttribute('aria-label', options.ariaLabel);
  }

  resize(width, height) {
    this.host.rect = { left: 0, top: 0, width, height };
    this.surfaceElement.rect = { left: 0, top: 0, width, height };
  }

  render() {}
  surface() {
    return this.surfaceElement;
  }
  overlayHost() {
    return this.host;
  }
  setInspectionView() {}
  destroy() {
    this.host?.remove();
  }
}

function installFakeDOM() {
  const previous = new Map();
  const setGlobal = (name, value) => {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  const document = new FakeDocument();
  const window = new EventTarget();
  window.devicePixelRatio = 1;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  setGlobal('document', document);
  setGlobal('window', window);
  setGlobal('PointerEvent', FakePointerEvent);
  setGlobal('KeyboardEvent', FakeKeyboardEvent);
  return {
    document,
    restore() {
      for (const [name, descriptor] of previous) {
        if (descriptor === undefined) delete globalThis[name];
        else Object.defineProperty(globalThis, name, descriptor);
      }
    },
  };
}

function sceneNodes(node) {
  return node.type === 'group' ? [node, ...node.children.flatMap(sceneNodes)] : [node];
}

test('active table cells open a native editor with Enter/double-click and commit or cancel safely', () => {
  const environment = installFakeDOM();
  const registry = createCompleteRegistry();
  let renderer;
  registry.registerRenderer({
    name: 'table-overlay-test',
    capabilities: new FakeRenderer().capabilities,
    create() {
      renderer = new FakeRenderer();
      return renderer;
    },
  });
  const target = environment.document.createElement('main');
  const instance = new Chart(
    target,
    {
      renderer: 'table-overlay-test',
      data: [{ id: 1, name: 'Alpha', amount: 10 }],
      mark: {
        type: 'table',
        options: {
          columns: [
            { field: 'id' },
            {
              field: 'name',
              editable: true,
              editor: { type: 'text' },
              validation: { required: true },
            },
            { field: 'amount' },
          ],
          editing: { key: 'id', commit: 'enter-or-blur' },
        },
      },
      x: 'id',
      y: 'amount',
      interaction: { controls: false },
    },
    registry,
    { width: 480, height: 320, autoResize: false },
  );

  try {
    const shortcuts = renderer.surfaceElement.getAttribute('aria-keyshortcuts');
    assert.match(shortcuts, /Shift\+ArrowRight/u);
    assert.match(shortcuts, /Control\+C/u);
    assert.doesNotMatch(shortcuts, /Control\+Z/u);
    instance.focusTableCell('layer-0', 0, 1);
    const enter = new FakeKeyboardEvent('keydown', { key: 'Enter' });
    renderer.surfaceElement.dispatchEvent(enter);
    let editor = renderer.host.children.find(
      ({ className }) => className === 'graflume-table-editor',
    );
    assert.notEqual(editor, undefined);
    assert.equal(enter.defaultPrevented, true);
    editor.value = 'Edited';
    editor.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'Enter' }));
    assert.equal(instance.getTableData('layer-0', 'source')[0].name, 'Edited');
    assert.equal(
      renderer.host.children.some(({ className }) => className === 'graflume-table-editor'),
      false,
    );

    const cell = sceneNodes(instance.getScene().root).find(
      ({ id }) => id === 'layer-0:table-cell:0:1',
    );
    renderer.surfaceElement.dispatchEvent(
      new FakePointerEvent('click', {
        clientX: cell.x + cell.width / 2,
        clientY: cell.y + cell.height / 2,
        detail: 2,
      }),
    );
    editor = renderer.host.children.find(({ className }) => className === 'graflume-table-editor');
    assert.notEqual(editor, undefined);
    editor.value = 'Blurred';
    editor.dispatchEvent(new Event('blur'));
    assert.equal(instance.getTableData('layer-0', 'source')[0].name, 'Blurred');

    renderer.surfaceElement.dispatchEvent(
      new FakePointerEvent('click', {
        clientX: cell.x + cell.width / 2,
        clientY: cell.y + cell.height / 2,
        detail: 2,
      }),
    );
    editor = renderer.host.children.find(({ className }) => className === 'graflume-table-editor');
    assert.notEqual(editor, undefined);
    editor.value = '';
    editor.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'Enter' }));
    assert.equal(editor.getAttribute('aria-invalid'), 'true');
    assert.equal(instance.getTableData('layer-0', 'source')[0].name, 'Blurred');
    editor.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(
      renderer.host.children.some(({ className }) => className === 'graflume-table-editor'),
      false,
    );
  } finally {
    instance.destroy();
    environment.restore();
  }
});

test('table keyboard range selection drives visible styling and clipboard copy/paste events', () => {
  const environment = installFakeDOM();
  const registry = createCompleteRegistry();
  let renderer;
  registry.registerRenderer({
    name: 'table-range-test',
    capabilities: new FakeRenderer().capabilities,
    create() {
      renderer = new FakeRenderer();
      renderer.name = 'table-range-test';
      return renderer;
    },
  });
  const target = environment.document.createElement('main');
  const instance = new Chart(
    target,
    {
      renderer: 'table-range-test',
      data: [
        { id: 1, name: 'Alpha', amount: 10 },
        { id: 2, name: 'Beta', amount: 20 },
      ],
      mark: {
        type: 'table',
        options: {
          columns: [
            { field: 'id' },
            { field: 'name', editable: true, editor: { type: 'text' } },
            { field: 'amount', editable: true, editor: { type: 'number' } },
          ],
          editing: { key: 'id' },
        },
      },
      x: 'id',
      y: 'amount',
      interaction: { controls: false },
    },
    registry,
    { width: 480, height: 320, autoResize: false },
  );

  try {
    instance.focusTableCell('layer-0', 0, 1);
    renderer.surfaceElement.dispatchEvent(
      new FakeKeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }),
    );
    renderer.surfaceElement.dispatchEvent(
      new FakeKeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }),
    );
    assert.deepEqual(instance.getTableRange('layer-0'), {
      anchor: { row: 0, column: 1 },
      focus: { row: 1, column: 2 },
    });
    const selected = sceneNodes(instance.getScene().root).filter(
      ({ datum }) => datum?.datum?.selected === true,
    );
    assert.equal(selected.length, 4);
    assert.ok(selected.every(({ stroke }) => typeof stroke === 'string'));

    const copy = new FakeClipboardEvent('copy');
    renderer.surfaceElement.dispatchEvent(copy);
    assert.equal(copy.defaultPrevented, true);
    assert.equal(copy.clipboardData.getData('text/plain'), 'Alpha\t10\r\nBeta\t20');

    instance.focusTableCell('layer-0', 0, 1);
    const paste = new FakeClipboardEvent('paste', 'Changed\t12\r\nChanged too\t22');
    renderer.surfaceElement.dispatchEvent(paste);
    assert.equal(paste.defaultPrevented, true);
    assert.deepEqual(
      instance.getTableData('layer-0', 'source').map(({ name, amount }) => ({ name, amount })),
      [
        { name: 'Changed', amount: 12 },
        { name: 'Changed too', amount: 22 },
      ],
    );

    instance.focusTableCell('layer-0', 0, 1);
    const blankPaste = new FakeClipboardEvent('paste', '');
    renderer.surfaceElement.dispatchEvent(blankPaste);
    assert.equal(blankPaste.defaultPrevented, true);
    assert.equal(instance.getTableData('layer-0', 'source')[0].name, '');

    const blankCopy = new FakeClipboardEvent('copy', 'stale clipboard value');
    renderer.surfaceElement.dispatchEvent(blankCopy);
    assert.equal(blankCopy.defaultPrevented, true);
    assert.equal(blankCopy.clipboardData.getData('text/plain'), '');
  } finally {
    instance.destroy();
    environment.restore();
  }
});
