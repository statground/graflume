import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import {
  compile as compileComplete,
  fullCatalog,
  fullVariantCatalog,
} from '../.tmp/src/complete.js';
import {
  MarkLabelHistory,
  setMarkLabelOffset,
  snapMarkLabelOffset,
} from '../.tmp/src/interaction/mark-label-authoring.js';
import { Chart } from '../.tmp/src/runtime/chart.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';
import { sceneNodeBounds } from '../.tmp/src/scene/bounds.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';
import { seriesSampleSpec } from '../scripts/series-samples.mjs';

function sceneNodes(node) {
  return node.type === 'group' ? [node, ...node.children.flatMap(sceneNodes)] : [node];
}

function overlap(left, right) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

test('portable mark label spec validates, normalizes bounded authoring, and stays in schema', async () => {
  const spec = {
    data: [
      { id: 'a', category: 'A', value: 10 },
      { id: 'b', category: 'B', value: 20 },
    ],
    mark: 'point',
    x: 'category',
    y: 'value',
    markLabels: {
      field: 'value',
      key: 'id',
      placement: 'auto',
      collision: 'avoid',
      connector: { color: '#334155', width: 1, dash: [3, 2] },
      positions: [
        {
          target: { type: 'datum', layerId: 'layer-0', field: 'id', value: 'a' },
          offsetX: 8,
          offsetY: -4,
        },
      ],
      authoring: {
        step: 2,
        historyLimit: 20,
        snap: { grid: 4, marks: true, plot: true, distance: 5 },
      },
    },
  };
  assert.deepEqual(validateSpec(spec), []);
  const normalized = normalizeSpec(spec);
  assert.notEqual(normalized.markLabels, false);
  assert.deepEqual(normalized.markLabels.authoring, {
    pointer: true,
    keyboard: true,
    step: 2,
    historyLimit: 20,
    snap: { grid: 4, marks: true, plot: true, distance: 5 },
  });
  assert.ok(
    validateSpec({
      ...spec,
      markLabels: { ...spec.markLabels, authoring: { snap: { grid: () => 8 } } },
    }).some(({ message }) => message.includes('Functions are not allowed')),
  );
  assert.ok(
    validateSpec({ ...spec, markLabels: { ...spec.markLabels, maxLabels: 1001 } }).some(
      ({ path }) => path === '$.markLabels.maxLabels',
    ),
  );

  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(schema.properties.markLabels.oneOf[1].$ref, '#/$defs/markLabels');
  assert.equal(schema.$defs.markLabelPosition.properties.target.$ref, '#/$defs/datumTarget');
  assert.equal(
    schema.$defs.markLabelAuthoring.properties.snap.oneOf[1].$ref,
    '#/$defs/markLabelSnap',
  );
});

test('automatic labels use stable datum keys, collision layout, connectors, and Canvas handles', () => {
  const registry = createDefaultRegistry();
  const spec = {
    data: [
      { id: 'a', category: 'same', value: 10 },
      { id: 'b', category: 'same', value: 10 },
      { id: 'c', category: 'same', value: 10 },
    ],
    mark: { type: 'point', radius: 5 },
    x: 'category',
    y: 'value',
    markLabels: {
      field: 'value',
      key: 'id',
      collision: 'avoid',
      connector: true,
      authoring: true,
      style: { background: '#ffffff', border: '#334155', padding: 3 },
    },
  };
  const first = compileWithRegistry(spec, registry, { width: 420, height: 300 });
  const metadata = first.scene.metadata.markLabels;
  assert.notEqual(metadata, undefined);
  assert.ok(metadata.entries.length >= 2);
  assert.ok(metadata.entries.every(({ target }) => target.field === 'id'));
  for (let left = 0; left < metadata.entries.length; left += 1) {
    for (let right = left + 1; right < metadata.entries.length; right += 1) {
      assert.equal(overlap(metadata.entries[left].bounds, metadata.entries[right].bounds), false);
    }
  }
  const flattened = sceneNodes(first.scene.root);
  assert.ok(flattened.some(({ id }) => id.endsWith(':connector')));

  const activeId = metadata.entries[0].id;
  const active = compileWithRegistry(
    spec,
    registry,
    { width: 420, height: 300 },
    {
      activeMarkLabelId: activeId,
    },
  );
  const activeNodes = sceneNodes(active.scene.root);
  assert.equal(activeNodes.filter(({ id }) => id.startsWith(`${activeId}:handle:`)).length, 4);
  assert.ok(activeNodes.some(({ id }) => id === `${activeId}:selection`));
  assert.match(active.scene.accessibility.description, /Label authoring is enabled/);
  assert.equal(
    active.scene.semanticIndex.some(({ id }) => id.startsWith('mark-label:')),
    false,
    'label handles do not duplicate data marks in the semantic index',
  );
});

test('every canonical Canvas family compiles reusable automatic mark labels', () => {
  for (const family of fullCatalog) {
    const variant = fullVariantCatalog.find((candidate) => candidate.familyId === family.id);
    assert.notEqual(variant, undefined, `${family.id} representative variant`);
    const sample = seriesSampleSpec(variant);
    const { scene } = compileComplete(
      { ...sample, markLabels: { collision: 'none', maxLabels: 8 } },
      { width: 640, height: 400 },
    );
    assert.ok(
      scene.metadata.markLabels?.entries.length > 0,
      `${family.id} compiles data-bearing labels`,
    );
  }
});

test('stacked Bar totals and segments and Area series endpoints use calculated semantics', () => {
  const data = [
    { category: 'A', series: 'First', value: 4 },
    { category: 'A', series: 'Loss', value: -2 },
    { category: 'A', series: 'Second', value: 1 },
    { category: 'B', series: 'First', value: 2 },
    { category: 'B', series: 'Loss', value: -3 },
    { category: 'B', series: 'Second', value: 5 },
  ];
  const base = {
    data,
    x: { field: 'category', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
    markLabels: { collision: 'none', maxLabels: 30 },
  };
  const bar = compileComplete(
    {
      ...base,
      mark: {
        type: 'bar',
        fields: { series: 'series' },
        options: { stack: { mode: 'diverging', order: 'input' } },
      },
    },
    { width: 640, height: 400 },
  );
  const barLabels = bar.scene.metadata.markLabels?.entries ?? [];
  assert.equal(
    barLabels.filter(({ target }) => String(target.value).startsWith('segment:')).length,
    6,
  );
  assert.deepEqual(
    barLabels
      .filter(({ target }) => String(target.value).startsWith('total:'))
      .map(({ text }) => text),
    ['3', '4'],
  );

  const area = compileComplete(
    {
      ...base,
      mark: {
        type: 'area',
        fields: { series: 'series' },
        options: { stack: { mode: 'diverging', order: 'input' } },
      },
    },
    { width: 640, height: 400 },
  );
  assert.deepEqual(
    (area.scene.metadata.markLabels?.entries ?? []).map(({ text }) => text),
    ['First', 'Loss', 'Second'],
  );
});

test('mark label history and snapping are deterministic and bounded', () => {
  const target = { type: 'datum', layerId: 'layer-0', field: 'id', value: 'a' };
  const history = new MarkLabelHistory([], 2);
  history.replace(setMarkLabelOffset(history.positions(), target, 4, 0));
  history.replace(setMarkLabelOffset(history.positions(), target, 8, 0));
  history.replace(setMarkLabelOffset(history.positions(), target, 12, 0));
  assert.equal(history.canUndo(), true);
  assert.equal(history.undo(), true);
  assert.equal(history.positions()[0].offsetX, 8);
  assert.equal(history.undo(), true);
  assert.equal(history.positions()[0].offsetX, 4);
  assert.equal(history.undo(), false, 'history limit drops the oldest snapshot');
  assert.equal(history.redo(), true);
  assert.equal(history.positions()[0].offsetX, 8);

  const entry = {
    id: 'mark-label:a',
    target,
    text: '10',
    anchor: { x: 50, y: 50 },
    baseCenter: { x: 50, y: 30 },
    bounds: { x: 40, y: 24, width: 20, height: 12 },
    offsetX: 0,
    offsetY: 0,
    editable: true,
  };
  const snapped = snapMarkLabelOffset({
    entry,
    entries: [entry],
    plot: { x: 0, y: 0, width: 100, height: 80 },
    offsetX: 47,
    offsetY: -29,
    snap: { grid: 8, marks: false, plot: true, distance: 6 },
  });
  assert.equal(snapped.offsetX, 40, 'grid snapping is applied');
  assert.equal(snapped.offsetY, -24, 'plot containment follows grid snapping');
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
    this.captures = new Set();
    this.clientWidth = 360;
    this.clientHeight = 280;
    this.rect = { left: 0, top: 0, width: 360, height: 280 };
    this.textContent = '';
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

  setPointerCapture(pointerId) {
    this.captures.add(pointerId);
  }

  hasPointerCapture(pointerId) {
    return this.captures.has(pointerId);
  }

  releasePointerCapture(pointerId) {
    this.captures.delete(pointerId);
  }
}

class FakeDocument extends EventTarget {
  constructor() {
    super();
    this.hidden = false;
    this.fullscreenElement = null;
    this.activeElement = null;
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
    this.shiftKey = init.shiftKey ?? false;
  }
}

class FakeKeyboardEvent extends Event {
  constructor(type, init = {}) {
    super(type, { cancelable: true });
    this.key = init.key ?? '';
    this.ctrlKey = init.ctrlKey ?? false;
    this.metaKey = init.metaKey ?? false;
    this.shiftKey = init.shiftKey ?? false;
  }
}

class FakeRenderer {
  name = 'canvas';
  capabilities = {
    vector: false,
    gpu: false,
    worker: false,
    exportFormats: ['image/png'],
    inspectionViewport: true,
  };
  host = null;
  surfaceElement = null;
  scene = null;

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

  render(scene) {
    this.scene = scene;
  }

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

function installEnvironment() {
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

test('Chart label authoring lifecycle supports keyboard, pointer, live status, and undo/redo', () => {
  const environment = installEnvironment();
  const registry = createDefaultRegistry();
  const renderers = [];
  registry.registerRenderer({
    name: 'canvas',
    capabilities: {
      vector: false,
      gpu: false,
      worker: false,
      exportFormats: ['image/png'],
      inspectionViewport: true,
    },
    create() {
      const renderer = new FakeRenderer();
      renderers.push(renderer);
      return renderer;
    },
  });
  const target = environment.document.createElement('main');
  const chart = new Chart(
    target,
    {
      data: [
        { id: 'a', category: 'A', value: 10 },
        { id: 'b', category: 'B', value: 20 },
      ],
      mark: 'point',
      x: 'category',
      y: 'value',
      markLabels: {
        field: 'value',
        key: 'id',
        collision: 'none',
        authoring: { step: 2, snap: false },
      },
    },
    registry,
    { width: 360, height: 280, autoResize: false },
  );
  const renderer = renderers[0];
  const surface = renderer.surfaceElement;
  const reasons = [];
  chart.on('marklabelchange', ({ reason }) => reasons.push(reason));

  try {
    assert.equal(chart.getMarkLabelState().labels.length, 2);
    assert.equal(surface.tabIndex, 0);
    assert.match(surface.getAttribute('aria-keyshortcuts'), /Control\+Z/);
    assert.equal(surface.style.cursor, 'move');
    assert.equal(surface.style.touchAction, 'none');
    assert.ok(renderer.host.children.some(({ dataset }) => dataset.graflumeMarkLabelStatus));

    const enter = new FakeKeyboardEvent('keydown', { key: 'Enter' });
    surface.dispatchEvent(enter);
    assert.equal(enter.defaultPrevented, true);
    let state = chart.getMarkLabelState();
    assert.notEqual(state.activeId, undefined);
    assert.equal(
      sceneNodes(chart.getScene().root).filter(({ id }) => id.includes(':handle:')).length,
      4,
    );

    const right = new FakeKeyboardEvent('keydown', { key: 'ArrowRight' });
    surface.dispatchEvent(right);
    state = chart.getMarkLabelState();
    assert.equal(state.positions[0].offsetX, 2);
    assert.equal(state.canUndo, true);
    assert.equal(right.defaultPrevented, true);

    const undo = new FakeKeyboardEvent('keydown', { key: 'z', ctrlKey: true });
    surface.dispatchEvent(undo);
    assert.equal(chart.getMarkLabelPositions().length, 0);
    const redo = new FakeKeyboardEvent('keydown', { key: 'y', ctrlKey: true });
    surface.dispatchEvent(redo);
    assert.equal(chart.getMarkLabelPositions()[0].offsetX, 2);

    chart.resetMarkLabelPositions();
    state = chart.getMarkLabelState();
    const entry = state.labels.find(({ id }) => id === state.activeId) ?? state.labels[0];
    const center = {
      x: entry.bounds.x + entry.bounds.width / 2,
      y: entry.bounds.y + entry.bounds.height / 2,
    };
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', { pointerId: 9, clientX: center.x, clientY: center.y }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 9,
        clientX: center.x + 13,
        clientY: center.y + 9,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 9,
        clientX: center.x + 13,
        clientY: center.y + 9,
      }),
    );
    const pointerPosition = chart.getMarkLabelPositions()[0];
    assert.ok(Math.abs(pointerPosition.offsetX - 13) < 1e-9);
    assert.ok(Math.abs(pointerPosition.offsetY - 9) < 1e-9);
    assert.equal(surface.captures.size, 0);
    assert.ok(reasons.includes('keyboard'));
    assert.ok(reasons.includes('undo'));
    assert.ok(reasons.includes('redo'));
    assert.ok(reasons.includes('pointer'));
    const status = renderer.host.children.find(({ dataset }) => dataset.graflumeMarkLabelStatus);
    assert.match(status.textContent, /horizontal offset 13/);

    assert.equal(chart.undoMarkLabelEdit(), true);
    assert.equal(chart.getMarkLabelPositions().length, 0);
    assert.equal(chart.redoMarkLabelEdit(), true);
    assert.ok(Math.abs(chart.getMarkLabelPositions()[0].offsetY - 9) < 1e-9);
  } finally {
    chart.destroy();
    environment.restore();
  }
});
