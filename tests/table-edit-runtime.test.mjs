import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createCompleteRegistry } from '../.tmp/src/complete.js';
import { Chart } from '../.tmp/src/runtime/chart.js';
import {
  TableDataHistory,
  parseTableEditorValue,
  tableCSV,
  tableEditingConfig,
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
    editEvents.map(({ row, field, previousValue, newValue, valid, reason }) => ({
      row,
      field,
      previousValue,
      newValue,
      valid,
      reason,
    })),
    [
      {
        row: 0,
        field: 'amount',
        previousValue: 20,
        newValue: 25,
        valid: true,
        reason: 'programmatic',
      },
      {
        row: 1,
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
  instance.on('tableeditchange', ({ reason }) => reasons.push(reason));
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

  for (const unsafe of ['[', '^a+$', '^(a|b)$', '(a+)+$', '(?=a)a', '(a)\\1', 'a{1,10001}']) {
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
