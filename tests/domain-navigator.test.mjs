import test from 'node:test';
import assert from 'node:assert/strict';
import { attachDomainNavigator } from '../.tmp/src/interaction/domain-navigator.js';
import { normalizeDomainViewState } from '../.tmp/src/interaction/domain-navigation.js';

class Element extends EventTarget {
  constructor(tag, document) {
    super();
    this.tagName = tag;
    this.ownerDocument = document;
    this.children = [];
    this.dataset = {};
    this.style = { position: '' };
    this.attributes = new Map();
    this.parentElement = null;
    this.hidden = false;
    this.value = '';
    this.disabled = false;
    this.capture = new Set();
    this.listeners = new Set();
  }
  addEventListener(type, listener, capture) {
    super.addEventListener(type, listener, capture);
    this.listeners.add(listener);
  }
  removeEventListener(type, listener, capture) {
    super.removeEventListener(type, listener, capture);
    this.listeners.delete(listener);
  }
  append(...children) {
    for (const child of children) {
      child.remove();
      child.parentElement = this;
      this.children.push(child);
    }
  }
  remove() {
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.get(name);
  }
  contains(element) {
    return element === this || this.children.some((child) => child.contains(element));
  }
  querySelector(tag) {
    return (
      this.children.find((child) => child.tagName === tag) ??
      this.children.map((child) => child.querySelector(tag)).find(Boolean) ??
      null
    );
  }
  getBoundingClientRect() {
    return { left: 10, top: 20, width: parseFloat(this.style.width) || 800, height: 440 };
  }
  setPointerCapture(id) {
    this.capture.add(id);
  }
  hasPointerCapture(id) {
    return this.capture.has(id);
  }
  releasePointerCapture(id) {
    this.capture.delete(id);
  }
  click() {
    this.ownerDocument.clicked.push(this);
    this.dispatchEvent(new Event('click'));
  }
}
function documentFixture() {
  const document = {
    clicked: [],
    defaultView: {
      getComputedStyle: (element) => ({ position: element.style.position || 'static' }),
    },
  };
  document.createElement = (tag) => new Element(tag, document);
  document.createElementNS = (_ns, tag) => document.createElement(tag);
  return document;
}
function walk(element) {
  return [element, ...element.children.flatMap(walk)];
}
function node(host, key, value = '') {
  return walk(host).find((element) => element.dataset[key] === value);
}
function event(target, type, properties = {}, origin = target) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries({
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    ...properties,
  }))
    Object.defineProperty(event, key, { value });
  Object.defineProperty(event, 'target', { value: origin });
  target.dispatchEvent(event);
  return event;
}
class ModelChart {
  constructor() {
    this.state = normalizeDomainViewState({ version: 1, axes: { y: { start: 0.1, end: 0.9 } } });
    this.spec = { interaction: { domainNavigation: { axes: ['x', 'y'], maxZoom: 10 } } };
    this.listeners = new Map();
    this.views = ['unit'];
    this.specResets = 0;
  }
  getSpec() {
    return this.spec;
  }
  getDomainViewState() {
    return this.state;
  }
  setDomainViewState(state) {
    this.state = normalizeDomainViewState(state);
    this.emit('domainviewchange');
    return this;
  }
  setSpec(spec) {
    this.spec = spec;
    this.specResets += 1;
    this.state = normalizeDomainViewState({ version: 1, axes: {} });
    this.emit('render');
    return this;
  }
  getScene() {
    return { width: 800, height: 440 };
  }
  getCoordinateViewIds() {
    return this.views;
  }
  getCoordinateViewBounds(id) {
    if (id && !this.views.includes(id)) throw new Error('Unknown view');
    return { x: 80, y: 80, width: 640, height: 280 };
  }
  pixelToDomain(_axis, pixel) {
    return pixel === 80 ? 'First category' : 'Last category';
  }
  toDataURL(type) {
    assert.equal(type, 'image/png');
    return 'data:image/png;base64,chart';
  }
  on(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    return () => listeners.delete(listener);
  }
  emit(type) {
    for (const callback of this.listeners.get(type) ?? []) callback({ chart: this });
  }
  listenerCount() {
    return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0);
  }
}
function fixture(extra = {}) {
  const document = documentFixture();
  const host = document.createElement('main');
  host.append(document.createElement('canvas'));
  const chart = new ModelChart();
  const navigator = attachDomainNavigator(chart, {
    target: host,
    initialWindow: { start: 0.4, end: 1 },
    ...extra,
  });
  return { document, host, chart, navigator };
}
function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

test('navigator sliders preserve other axes, enforce minimum width, and follow external navigation', () => {
  const { host, chart, navigator } = fixture();
  try {
    assert.equal(host.style.position, 'relative');
    assert.equal(
      node(host, 'graflumeRange', 'start').getAttribute('aria-valuetext'),
      'First category',
    );
    const start = node(host, 'graflumeRange', 'start');
    start.value = '999';
    event(start, 'input');
    close(navigator.getState().window.start, 0.9);
    close(navigator.getState().window.end, 1);
    assert.deepEqual(chart.state.axes.y, { start: 0.1, end: 0.9 });
    chart.setDomainViewState({ version: 1, axes: { x: { start: 0.2, end: 0.5 } } });
    assert.equal(start.value, '200');
    assert.equal(node(host, 'graflumeRange', 'end').value, '500');
  } finally {
    navigator.destroy();
  }
  assert.equal(host.style.position, '');
  assert.equal(chart.listenerCount(), 0);
  assert.equal(host.listeners.size, 0);
});

test('area zoom stores bounded undo history, cancel is inert, reset restores initial spec/window', () => {
  const { host, chart, navigator } = fixture();
  try {
    navigator.setBoxZoom(true);
    const down = event(host, 'pointerdown', { clientX: 250, clientY: 150 });
    assert.equal(down.defaultPrevented, true);
    event(host, 'pointermove', { clientX: 570, clientY: 150 });
    assert.equal(node(host, 'graflumeZoomDraft').hidden, false);
    event(host, 'pointerup', { clientX: 570, clientY: 150 });
    close(navigator.getState().window.start, 0.55);
    close(navigator.getState().window.end, 0.85);
    assert.equal(navigator.getState().historyLength, 1);
    assert.equal(node(host, 'graflumeNavigationControl', 'back').disabled, false);
    navigator.zoomBack();
    assert.deepEqual(navigator.getState().window, { start: 0.4, end: 1 });
    event(host, 'pointerdown', { clientX: 250, clientY: 150 });
    event(host, 'pointercancel');
    assert.equal(navigator.getState().historyLength, 0);
    assert.equal(host.capture.size, 0);
    assert.equal(node(host, 'graflumeZoomDraft').hidden, true);
    event(host, 'keydown', { key: 'Escape' });
    assert.equal(navigator.getState().boxZoom, false);
    chart.setDomainViewState({ version: 1, axes: { x: { start: 0, end: 0.1 } } });
    navigator.reset();
    assert.equal(chart.specResets, 1);
    assert.deepEqual(navigator.getState().window, { start: 0.4, end: 1 });
    assert.deepEqual(chart.state.axes.y, { start: 0.1, end: 0.9 });
  } finally {
    navigator.destroy();
  }
});

test('slider band pans without changing window width and PNG uses authored filename', () => {
  const { host, document, navigator } = fixture({ filename: 'traffic.png' });
  try {
    const band = node(host, 'graflumeRangeWindow');
    event(host, 'pointerdown', { clientX: 500 }, band);
    event(host, 'pointermove', { clientX: 436 });
    event(host, 'pointerup', { clientX: 436 });
    close(navigator.getState().window.start, 0.3);
    close(navigator.getState().window.end, 0.9);
    node(host, 'graflumeNavigationControl', 'export').click();
    const link = document.clicked.find((element) => element.tagName === 'a');
    assert.equal(link.download, 'traffic.png');
    assert.equal(link.href, 'data:image/png;base64,chart');
  } finally {
    navigator.destroy();
  }
});

test('remount and chart destroy remove every control/listener and preserve authored host positioning', () => {
  const { host, chart, navigator } = fixture();
  navigator.destroy();
  host.style.position = 'absolute';
  const first = attachDomainNavigator(chart, { target: host, slider: false });
  const firstRoot = node(host, 'graflumeDomainNavigator');
  const second = attachDomainNavigator(chart, { target: host });
  assert.equal(firstRoot.parentElement, null);
  assert.equal(
    walk(host).filter((element) => element.dataset.graflumeDomainNavigator !== undefined).length,
    1,
  );
  chart.emit('destroy');
  assert.equal(node(host, 'graflumeDomainNavigator'), undefined);
  assert.equal(chart.listenerCount(), 0);
  assert.equal(host.listeners.size, 0);
  assert.equal(host.style.position, 'absolute');
  first.destroy();
  second.destroy();
});

test('invalid navigator contracts fail before mounting and compositions require a selected view', () => {
  const document = documentFixture();
  const host = document.createElement('main');
  const chart = new ModelChart();
  for (const options of [
    { axis: 'y' },
    { axis: 'missing' },
    { labels: { reset: '' } },
    { initialWindow: { start: 0.95, end: 1 } },
  ]) {
    assert.throws(() => attachDomainNavigator(chart, { target: host, ...options }));
    assert.equal(host.children.length, 0);
    assert.equal(chart.listenerCount(), 0);
  }
  chart.views = ['left', 'right'];
  assert.throws(() => attachDomainNavigator(chart, { target: host }), /viewId/);
  const navigator = attachDomainNavigator(chart, { target: host, viewId: 'right' });
  navigator.destroy();
  chart.spec.interaction.domainNavigation = false;
  assert.throws(() => attachDomainNavigator(chart, { target: host }), /Enable/);
});

test('area zoom ignores outside and tiny drags and bounds its history to sixty four entries', () => {
  const { host, navigator } = fixture();
  try {
    navigator.setBoxZoom(true);
    assert.equal(event(host, 'pointerdown', { clientX: 20, clientY: 30 }).defaultPrevented, false);
    event(host, 'pointerdown', { clientX: 250, clientY: 150 });
    event(host, 'pointerup', { clientX: 252, clientY: 150 });
    assert.equal(navigator.getState().historyLength, 0);
    for (let index = 0; index < 70; index += 1) {
      event(host, 'pointerdown', { clientX: 100, clientY: 150 });
      event(host, 'pointerup', { clientX: 700, clientY: 150 });
    }
    assert.equal(navigator.getState().historyLength, 64);
    assert.ok(navigator.getState().window.end - navigator.getState().window.start >= 0.1 - 1e-10);
    navigator.reset();
    assert.equal(navigator.getState().historyLength, 0);
  } finally {
    navigator.destroy();
  }
});
