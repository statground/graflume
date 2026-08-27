import test from 'node:test';
import assert from 'node:assert/strict';

import { hitTestAxisTooltip } from '../.tmp/src/interaction/axis-hit-test.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { createCompleteRegistry } from '../.tmp/src/complete.js';
import { LinkedViewStateStore } from '../.tmp/src/interaction/linked-view-store.js';
import { createSemanticFocusStore } from '../.tmp/src/interaction/semantic-focus-store.js';
import { compileAdvancedGraphMark } from '../.tmp/src/marks/relationship-advanced.js';
import { Chart } from '../.tmp/src/runtime/chart.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';

class TrackedEventTarget extends EventTarget {
  listeners = new Map();

  addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
    let listeners = this.listeners.get(type);
    if (listeners === undefined) {
      listeners = new Set();
      this.listeners.set(type, listeners);
    }
    listeners.add(listener);
  }

  removeEventListener(type, listener, options) {
    super.removeEventListener(type, listener, options);
    const listeners = this.listeners.get(type);
    listeners?.delete(listener);
    if (listeners?.size === 0) this.listeners.delete(type);
  }

  listenerCount() {
    return [...this.listeners.values()].reduce((total, listeners) => total + listeners.size, 0);
  }
}

function fakeStyle() {
  return {
    cssText: '',
    touchAction: 'pan-y',
    cursor: 'crosshair',
    setProperty(name, value) {
      this[name] = value;
    },
  };
}

class FakeElement extends TrackedEventTarget {
  constructor(tagName, ownerDocument) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.dataset = {};
    this.style = fakeStyle();
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.captures = new Set();
    this.clientWidth = 240;
    this.clientHeight = 160;
    this.rect = { left: 0, top: 0, width: 240, height: 160 };
    this.fullscreenRect = { left: 0, top: 0, width: 800, height: 600 };
    this.textContent = '';
    this.className = '';
    this.id = '';
    this.title = '';
    this.type = '';
    this.value = '';
    this.min = '';
    this.max = '';
    this.step = '';
    this.disabled = false;
    this.hidden = false;
    this.tabIndex = -1;
  }

  append(...children) {
    for (const child of children) {
      child.remove?.();
      child.parentElement = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    this.append(...children);
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
    return this.ownerDocument.fullscreenElement === this ? this.fullscreenRect : this.rect;
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

  async requestFullscreen() {
    this.ownerDocument.fullscreenElement = this;
    this.ownerDocument.dispatchEvent(new Event('fullscreenchange'));
  }

  click() {
    this.dispatchEvent(new Event('click', { cancelable: true }));
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  get options() {
    return this.children.filter(({ tagName }) => tagName === 'OPTION');
  }
}

class FakeDocument extends TrackedEventTarget {
  constructor() {
    super();
    this.hidden = false;
    this.fullscreenElement = null;
    this.activeElement = null;
    this.documentElement = new FakeElement('html', this);
    this.head = new FakeElement('head', this);
    this.body = new FakeElement('body', this);
    this.documentElement.append(this.head, this.body);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createElementNS(_namespace, tagName) {
    return new FakeElement(tagName, this);
  }

  querySelector() {
    return null;
  }

  async exitFullscreen() {
    this.fullscreenElement = null;
    this.dispatchEvent(new Event('fullscreenchange'));
  }
}

class FakeMediaQueryList extends TrackedEventTarget {
  constructor(matches) {
    super();
    this.matches = matches;
    this.media = '(prefers-reduced-motion: reduce)';
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

class FakeWheelEvent extends Event {
  constructor(type, init = {}) {
    super(type, { cancelable: true });
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
    this.deltaY = init.deltaY ?? 0;
    this.ctrlKey = init.ctrlKey ?? false;
    this.metaKey = init.metaKey ?? false;
  }
}

class FakeKeyboardEvent extends Event {
  constructor(type, init = {}) {
    super(type, { cancelable: true });
    this.key = init.key ?? '';
    this.altKey = init.altKey ?? false;
    this.ctrlKey = init.ctrlKey ?? false;
    this.metaKey = init.metaKey ?? false;
    this.shiftKey = init.shiftKey ?? false;
  }
}

function installEnvironment({ reducedMotion = false } = {}) {
  const previous = new Map();
  const setGlobal = (name, value) => {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  const document = new FakeDocument();
  const media = new FakeMediaQueryList(reducedMotion);
  const animationFrames = new Map();
  let nextAnimationFrame = 0;
  const window = new TrackedEventTarget();
  window.devicePixelRatio = 1;
  window.innerWidth = 800;
  window.innerHeight = 600;
  window.matchMedia = () => media;

  setGlobal('document', document);
  setGlobal('window', window);
  setGlobal('PointerEvent', FakePointerEvent);
  setGlobal('WheelEvent', FakeWheelEvent);
  setGlobal('KeyboardEvent', FakeKeyboardEvent);
  setGlobal('requestAnimationFrame', (callback) => {
    nextAnimationFrame += 1;
    animationFrames.set(nextAnimationFrame, callback);
    return nextAnimationFrame;
  });
  setGlobal('cancelAnimationFrame', (handle) => animationFrames.delete(handle));

  return {
    document,
    media,
    tick(timestamp) {
      const entry = animationFrames.entries().next().value;
      assert.notEqual(entry, undefined, 'expected one scheduled animation frame');
      const [handle, callback] = entry;
      animationFrames.delete(handle);
      callback(timestamp);
    },
    pendingFrames() {
      return animationFrames.size;
    },
    restore() {
      for (const [name, descriptor] of previous) {
        if (descriptor === undefined) delete globalThis[name];
        else Object.defineProperty(globalThis, name, descriptor);
      }
    },
  };
}

class FakeRenderer {
  name = 'canvas';
  surfaceTag = 'canvas';
  capabilities = {
    vector: false,
    gpu: false,
    worker: false,
    exportFormats: ['image/png'],
    inspectionViewport: true,
  };
  host = null;
  chartSurface = null;
  scene = null;
  view = { zoom: 1, offsetX: 0, offsetY: 0 };
  sizes = [];
  exportCalls = 0;
  destroyed = false;

  mount(target, options) {
    this.host = target.ownerDocument.createElement('div');
    this.chartSurface = target.ownerDocument.createElement(this.surfaceTag);
    this.host.append(this.chartSurface);
    target.append(this.host);
    this.resize(options.width, options.height, options.pixelRatio);
    this.chartSurface.setAttribute('aria-label', options.ariaLabel);
  }

  resize(width, height, pixelRatio) {
    this.sizes.push({ width, height, pixelRatio });
    this.host.rect = { left: 0, top: 0, width, height };
    this.chartSurface.rect = { left: 0, top: 0, width, height };
    this.chartSurface.clientWidth = width;
    this.chartSurface.clientHeight = height;
  }

  render(scene) {
    this.scene = scene;
  }

  surface() {
    return this.chartSurface;
  }

  overlayHost() {
    return this.host;
  }

  setInspectionView(view) {
    this.view = { ...view };
  }

  toDataURL() {
    this.exportCalls += 1;
    return 'data:image/png;base64,graflume';
  }

  destroy() {
    this.host?.remove();
    this.destroyed = true;
  }
}

function createHarness(document, registry = createDefaultRegistry()) {
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
  const target = document.createElement('main');
  target.clientWidth = 240;
  target.clientHeight = 160;
  return { registry, target, renderers };
}

function walk(element) {
  return [element, ...element.children.flatMap(walk)];
}

function sceneNodes(node) {
  return node.type === 'group' ? [node, ...node.children.flatMap(sceneNodes)] : [node];
}

function byAria(root, label) {
  return walk(root).find((element) => element.getAttribute('aria-label') === label);
}

function byControl(root, control) {
  return walk(root).find((element) => element.dataset.graflumeControl === control);
}

function findAxisOnlyPoint(scene) {
  for (let y = 0; y <= scene.height; y += 2) {
    for (let x = 0; x <= scene.width; x += 2) {
      if (hitTestScene(scene, x, y, 8) === null && hitTestAxisTooltip(scene, x, y) !== null) {
        return { x, y };
      }
    }
  }
  return null;
}

function findSceneNode(scene, predicate) {
  const visit = (node) => {
    if (predicate(node)) return node;
    if (node.type !== 'group') return null;
    for (const child of node.children) {
      const match = visit(child);
      if (match !== null) return match;
    }
    return null;
  };
  return visit(scene.root);
}

test('Chart inverses transformed hit tests and axis tooltips', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: [
        { month: 'Jan', value: 10 },
        { month: 'Feb', value: 14 },
        { month: 'Mar', value: 12 },
      ],
      mark: 'line',
      x: 'month',
      y: 'value',
      interaction: {
        navigation: true,
        tooltip: { trigger: 'axis', axis: 'x' },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );

  try {
    const renderer = renderers[0];
    const axisPoint = findAxisOnlyPoint(chart.getScene());
    assert.notEqual(axisPoint, null);
    chart.zoomBy(2, axisPoint);
    assert.equal(renderer.view.zoom, 2);

    renderer.chartSurface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        clientX: axisPoint.x,
        clientY: axisPoint.y,
      }),
    );
    const tooltip = walk(renderer.host).find(({ dataset }) => dataset.graflumeTooltip === 'true');
    assert.notEqual(tooltip, undefined);
    assert.equal(tooltip.hidden, false);
    assert.equal(renderer.chartSurface.getAttribute('aria-describedby'), tooltip.id);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('keyboard navigation prevents browser defaults only when the view changes', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: [
        { category: 'A', value: 10 },
        { category: 'B', value: 14 },
      ],
      mark: 'point',
      x: 'category',
      y: 'value',
      interaction: { navigation: { maxZoom: 2, keyboard: true } },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  const surface = renderers[0].chartSurface;
  const press = (key) => {
    const event = new FakeKeyboardEvent('keydown', { key });
    surface.dispatchEvent(event);
    return event;
  };

  try {
    assert.equal(press('ArrowLeft').defaultPrevented, false);
    assert.equal(press('Home').defaultPrevented, false);
    assert.equal(press('-').defaultPrevented, false);
    assert.equal(press('+').defaultPrevented, true);
    assert.ok(chart.getViewState().zoom > 1);
    assert.equal(press('ArrowLeft').defaultPrevented, true);
    assert.equal(press('Home').defaultPrevented, true);
    assert.equal(press('Home').defaultPrevented, false);

    chart.zoomBy(100);
    assert.equal(chart.getViewState().zoom, 2);
    assert.equal(press('+').defaultPrevented, false);
    assert.equal(press('PageDown').defaultPrevented, false);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('adaptive runtime adds bounded large-data inspection zoom and reflows without mutating ChartSpec', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const spec = {
    data: [
      { category: 'A', value: 10 },
      { category: 'B', value: 14 },
      { category: 'C', value: 12 },
    ],
    mark: 'bar',
    x: 'category',
    y: 'value',
  };
  const chart = new Chart(target, spec, registry, {
    width: 800,
    height: 400,
    autoResize: false,
    adaptive: { largeDataThreshold: 2 },
  });

  try {
    const renderer = renderers[0];
    assert.equal(chart.getSpec(), spec);
    assert.equal(chart.getAdaptiveState().largeData, true);
    assert.equal(chart.getViewState().enabled, true);
    assert.equal(renderer.host.dataset.graflumeAdaptiveLargeData, 'true');
    assert.notEqual(byControl(renderer.host, 'zoom-in'), undefined);
    assert.notEqual(byControl(renderer.host, 'reset'), undefined);

    chart.zoomBy(100);
    assert.equal(chart.getViewState().zoom, 6);

    const changes = [];
    chart.on('adaptivechange', ({ state, previous }) => changes.push({ state, previous }));
    chart.resize(184, 224);
    assert.equal(chart.getAdaptiveState().viewport, 'micro');
    assert.ok(chart.getAdaptiveState().profiles.includes('zoom-reflow'));
    assert.equal(renderer.host.dataset.graflumeAdaptiveViewport, 'micro');
    assert.equal(renderer.host.style['--graflume-control-target'], '36px');
    assert.equal(changes.length, 1);
    assert.equal(changes[0].previous.viewport, 'wide');
    assert.equal(changes[0].state.viewport, 'micro');
    assert.equal(chart.getSpec(), spec);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('drag and two-touch pinch transition, cancel, reset stale click suppression, and clean up', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: [
        { category: 'A', value: 10 },
        { category: 'B', value: 14 },
      ],
      mark: 'point',
      x: 'category',
      y: 'value',
      interaction: { navigation: { wheel: 'always', drag: true, pinch: true } },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  const renderer = renderers[0];
  const surface = renderer.chartSurface;
  let clicks = 0;
  chart.on('click', () => {
    clicks += 1;
  });

  try {
    assert.equal(surface.style.touchAction, 'pan-y');
    assert.equal(surface.style.cursor, 'grab');
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 60,
        clientY: 60,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 120,
        clientY: 60,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 180,
        clientY: 60,
      }),
    );
    assert.ok(chart.getViewState().zoom > 1.5);
    assert.equal(surface.style.touchAction, 'none');

    const offsetBeforeDrag = chart.getViewState().offsetX;
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 180,
        clientY: 60,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 75,
        clientY: 60,
      }),
    );
    assert.notEqual(chart.getViewState().offsetX, offsetBeforeDrag);
    surface.dispatchEvent(
      new FakePointerEvent('pointercancel', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 75,
        clientY: 60,
      }),
    );
    assert.equal(surface.captures.size, 0);

    chart.resetView();
    assert.equal(surface.style.touchAction, 'pan-y');

    // A browser may omit click after a canceled drag. A fresh primary gesture
    // must clear the stale suppression flag before its normal click.
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 3,
        pointerType: 'mouse',
        clientX: 20,
        clientY: 20,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 3,
        pointerType: 'mouse',
        clientX: 20,
        clientY: 20,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('click', {
        pointerId: 3,
        pointerType: 'mouse',
        clientX: 20,
        clientY: 20,
      }),
    );
    assert.equal(clicks, 1);

    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 4,
        pointerType: 'mouse',
        clientX: 30,
        clientY: 30,
      }),
    );
    assert.equal(surface.captures.has(4), true);
    chart.setSpec({ ...chart.getSpec(), interaction: { navigation: false } });
    assert.equal(surface.captures.size, 0);
    assert.equal(surface.style.touchAction, 'pan-y');
  } finally {
    chart.destroy();
    assert.equal(surface.listenerCount(), 0);
    assert.equal(surface.captures.size, 0);
    assert.equal(surface.style.touchAction, 'pan-y');
    assert.equal(surface.style.cursor, 'crosshair');
    assert.equal(environment.document.listenerCount(), 0);
    environment.restore();
  }
});

test('compact controls stay top-right and keep technical LTR order inside an RTL host', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  target.setAttribute('dir', 'rtl');
  const chart = new Chart(
    target,
    {
      data: [
        { category: 'A', value: 10 },
        { category: 'B', value: 14 },
      ],
      mark: 'point',
      x: 'category',
      y: 'value',
      interaction: {
        navigation: true,
        controls: { zoom: true, reset: true, fullscreen: true, export: true },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );

  try {
    const toolbar = walk(renderers[0].host).find(
      (element) => element.dataset.graflumeControls === 'true',
    );
    assert.notEqual(toolbar, undefined);
    assert.equal(toolbar.dataset.graflumeControlsPlacement, 'top-right');
    assert.equal(toolbar.getAttribute('dir'), 'ltr');
    const strip = walk(toolbar).find((element) => element.dataset.graflumeControlsStrip === 'true');
    assert.deepEqual(
      strip.children
        .filter((element) => element.dataset.graflumeControl !== undefined)
        .map((element) => element.dataset.graflumeControl),
      ['zoom-out', 'zoom-in', 'reset', 'fullscreen', 'export-png'],
    );
  } finally {
    chart.destroy();
    assert.equal(environment.document.listenerCount(), 0);
    environment.restore();
  }
});

test('compact controls share one document stylesheet until the final chart is destroyed', () => {
  const environment = installEnvironment();
  const first = createHarness(environment.document);
  const second = createHarness(environment.document);
  const spec = {
    data: [
      { category: 'A', value: 10 },
      { category: 'B', value: 14 },
    ],
    mark: 'point',
    x: 'category',
    y: 'value',
    interaction: { navigation: true, controls: { zoom: true, reset: true } },
  };
  const firstChart = new Chart(first.target, spec, first.registry, {
    width: 240,
    height: 160,
    autoResize: false,
  });
  const secondChart = new Chart(second.target, spec, second.registry, {
    width: 240,
    height: 160,
    autoResize: false,
  });
  const styles = () =>
    walk(environment.document.documentElement).filter(
      (element) => element.dataset.graflumeControlStyles === 'compact',
    );

  try {
    assert.equal(styles().length, 1);
    firstChart.destroy();
    assert.equal(styles().length, 1);
    secondChart.destroy();
    assert.equal(styles().length, 0);
    assert.equal(environment.document.listenerCount(), 0);
  } finally {
    firstChart.destroy();
    secondChart.destroy();
    environment.restore();
  }
});

test('compact controls omit the entire toolbar when no menu can be rendered', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const spec = {
    data: [{ category: 'A', value: 10 }],
    mark: 'point',
    x: 'category',
    y: 'value',
    interaction: { controls: { annotations: true } },
  };
  const chart = new Chart(target, spec, registry, {
    width: 240,
    height: 160,
    autoResize: false,
    adaptive: false,
  });
  const toolbar = () =>
    walk(renderers[0].host).find((element) => element.dataset.graflumeControls === 'true');

  try {
    assert.equal(toolbar(), undefined);
    assert.equal(
      walk(environment.document.documentElement).some(
        (element) => element.dataset.graflumeControlStyles === 'compact',
      ),
      false,
    );
    chart.addAnnotation({
      target: { type: 'datum', rowIndex: 0 },
      text: 'Visible control',
    });
    assert.notEqual(toolbar(), undefined);
    assert.notEqual(byControl(renderers[0].host, 'annotations'), undefined);
    chart.setAnnotations([]);
    assert.equal(toolbar(), undefined);
    assert.equal(
      walk(environment.document.documentElement).some(
        (element) => element.dataset.graflumeControlStyles === 'compact',
      ),
      false,
    );
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('playback keeps its base spec, advances on the core clock, and controls stay accessible', async () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const spec = {
    width: 240,
    height: 160,
    data: [
      { period: 'Q1', category: 'A', value: 10 },
      { period: 'Q1', category: 'B', value: 12 },
      { period: 'Q2', category: 'A', value: 14 },
      { period: 'Q3', category: 'A', value: 18 },
    ],
    mark: 'point',
    x: 'category',
    y: 'value',
    interaction: {
      navigation: true,
      playback: {
        field: 'period',
        mode: 'cumulative',
        interval: 100,
        filter: true,
      },
      controls: {
        zoom: true,
        reset: true,
        fullscreen: true,
        export: true,
        playback: true,
        labels: {
          controls: '차트 제어',
          loop: '<img src=x onerror=alert(1)>',
        },
      },
    },
  };
  const chart = new Chart(target, spec, registry, {
    width: 240,
    height: 160,
    autoResize: false,
  });
  const renderer = renderers[0];
  const reasons = [];
  chart.on('playbackchange', ({ reason }) => reasons.push(reason));

  try {
    assert.equal(chart.getSpec(), spec);
    assert.deepEqual(chart.getPlaybackState().frames, ['Q1', 'Q2', 'Q3']);
    assert.equal(chart.getPlaybackState().index, 2);
    assert.equal(chart.getScene().metadata.rowCount, 4);

    const toolbar = walk(renderer.host).find(
      (element) => element.getAttribute('role') === 'toolbar',
    );
    assert.notEqual(toolbar, undefined);
    assert.equal(toolbar.getAttribute('aria-label'), '차트 제어');
    assert.equal(toolbar.dataset.graflumeControlsDensity, 'compact');
    assert.equal(toolbar.dataset.graflumeControlsPlacement, 'top-right');
    assert.equal(toolbar.dataset.graflumeControlsOpen, 'false');
    assert.equal(toolbar.getAttribute('dir'), 'ltr');
    const strip = walk(toolbar).find((element) => element.dataset.graflumeControlsStrip === 'true');
    assert.notEqual(strip, undefined);
    const styles = walk(environment.document.documentElement).find(
      (element) => element.dataset.graflumeControlStyles === 'compact',
    );
    assert.match(styles.textContent, /height:30px/);
    assert.match(styles.textContent, /width:28px/);
    assert.match(styles.textContent, /pointer:coarse/);
    assert.match(styles.textContent, /width:44px/);
    assert.match(styles.textContent, /top:2px;right:2px/);
    for (const control of [
      'zoom-out',
      'zoom-in',
      'reset',
      'fullscreen',
      'export-png',
      'previous-frame',
      'playback',
      'next-frame',
      'playback-options',
    ]) {
      const element = byControl(strip, control);
      assert.notEqual(element, undefined, `expected compact ${control} control`);
      assert.equal(element.children.length, 1);
      assert.equal(element.children[0].tagName, 'SVG');
      assert.equal(element.children[0].getAttribute('aria-hidden'), 'true');
      assert.notEqual(element.title, '');
      assert.notEqual(element.getAttribute('aria-label'), null);
    }
    const loop = byAria(renderer.host, '<img src=x onerror=alert(1)>');
    assert.notEqual(loop, undefined);
    assert.equal(loop.children.length, 1);
    assert.equal(loop.children[0].tagName, 'SVG');
    assert.equal(
      walk(loop).some(({ tagName }) => tagName === 'IMG'),
      false,
    );
    assert.equal(loop.getAttribute('aria-pressed'), 'false');
    const status = walk(toolbar).find((element) => element.getAttribute('aria-live') === 'polite');
    assert.notEqual(status, undefined);

    const playbackOptions = byControl(toolbar, 'playback-options');
    const playbackPanel = walk(toolbar).find(
      (element) => element.dataset.graflumePlaybackPanel === 'true',
    );
    assert.equal(playbackOptions.getAttribute('aria-expanded'), 'false');
    assert.equal(playbackOptions.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(
      playbackOptions.getAttribute('aria-label'),
      'Playback position · Playback speed · <img src=x onerror=alert(1)>',
    );
    assert.equal(playbackPanel.hidden, true);
    assert.equal(playbackPanel.getAttribute('role'), 'dialog');
    const listenersBeforePanel = environment.document.listenerCount();
    playbackOptions.click();
    assert.equal(playbackOptions.getAttribute('aria-expanded'), 'true');
    assert.equal(playbackPanel.hidden, false);
    assert.equal(toolbar.dataset.graflumeControlsOpen, 'true');
    assert.equal(environment.document.listenerCount(), listenersBeforePanel + 2);
    environment.document.dispatchEvent(new FakePointerEvent('pointerdown'));
    assert.equal(playbackOptions.getAttribute('aria-expanded'), 'false');
    assert.equal(playbackPanel.hidden, true);
    assert.equal(toolbar.dataset.graflumeControlsOpen, 'false');
    assert.equal(environment.document.listenerCount(), listenersBeforePanel);

    playbackOptions.click();
    environment.document.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(playbackPanel.hidden, true);
    assert.equal(environment.document.activeElement, playbackOptions);
    assert.equal(environment.document.listenerCount(), listenersBeforePanel);

    const reset = byAria(renderer.host, 'Reset view');
    assert.equal(reset.disabled, true);
    chart.zoomBy(2);
    assert.equal(reset.disabled, false);
    chart.resetView();
    assert.equal(reset.disabled, true);

    loop.click();
    assert.equal(chart.getPlaybackState().loop, true);
    assert.equal(loop.getAttribute('aria-pressed'), 'true');
    assert.equal(chart.getSpec(), spec);
    chart.setPlaybackLoop(false);
    assert.throws(() => chart.setPlaybackLoop('yes'), TypeError);

    chart.play();
    assert.equal(chart.getPlaybackState().index, 0);
    assert.equal(chart.getPlaybackState().playing, true);
    assert.equal(chart.getScene().metadata.rowCount, 2);
    environment.tick(0);
    environment.tick(100);
    assert.equal(chart.getPlaybackState().index, 1);
    chart.setPlaybackRate(2);
    environment.tick(150);
    assert.equal(chart.getPlaybackState().index, 2);
    assert.equal(chart.getPlaybackState().playing, false);
    assert.equal(environment.pendingFrames(), 0);
    assert.deepEqual(reasons, ['loop', 'loop', 'seek', 'play', 'step', 'rate', 'step', 'pause']);

    const seek = byControl(renderer.host, 'playback-seek');
    assert.equal(seek.getAttribute('aria-valuetext'), 'Q3');
    assert.equal(seek.value, '2');
    assert.equal(byControl(renderer.host, 'playback-rate').value, '2');

    byAria(renderer.host, 'Download PNG').click();
    assert.equal(renderer.exportCalls, 1);

    const fullscreenEvents = [];
    chart.on('fullscreenchange', ({ active }) => fullscreenEvents.push(active));
    await chart.toggleFullscreen();
    assert.deepEqual(renderer.sizes.at(-1), { width: 800, height: 600, pixelRatio: 1 });
    await chart.toggleFullscreen();
    assert.deepEqual(renderer.sizes.at(-1), { width: 240, height: 160, pixelRatio: 1 });
    assert.deepEqual(fullscreenEvents, [true, false]);
    await chart.toggleFullscreen();
    assert.equal(environment.document.fullscreenElement, renderer.host);
  } finally {
    chart.destroy();
    await Promise.resolve();
    assert.equal(environment.pendingFrames(), 0);
    assert.equal(environment.document.fullscreenElement, null);
    assert.equal(environment.document.listenerCount(), 0);
    assert.equal(environment.media.listenerCount(), 0);
    environment.restore();
  }
});

test('reverse playback composes named seeks with inclusive loop ranges on SVG surfaces', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  registry.registerRenderer({
    name: 'svg',
    capabilities: {
      vector: true,
      gpu: false,
      worker: false,
      exportFormats: ['image/svg+xml'],
    },
    create() {
      const renderer = new FakeRenderer();
      renderer.name = 'svg';
      renderer.surfaceTag = 'svg';
      renderer.capabilities = {
        vector: true,
        gpu: false,
        worker: false,
        exportFormats: ['image/svg+xml'],
      };
      renderers.push(renderer);
      return renderer;
    },
  });
  const chart = new Chart(
    target,
    {
      renderer: 'svg',
      width: 240,
      height: 160,
      data: [
        { period: 'Q1', category: 'A', value: 8 },
        { period: 'Q2', category: 'A', value: 10 },
        { period: 'Q3', category: 'A', value: 12 },
        { period: 'Q4', category: 'A', value: 14 },
      ],
      mark: 'point',
      x: 'category',
      y: 'value',
      interaction: {
        playback: {
          field: 'period',
          mode: 'cumulative',
          interval: 100,
          filter: true,
          direction: 'reverse',
          loop: true,
          namedFrames: [
            { name: 'Prelude', value: 'Q1' },
            { name: 'Opening', value: 'Q2' },
            { name: 'Focus', value: 'Q3' },
            { name: 'Closing', value: 'Q4' },
          ],
          range: { start: 'Opening', end: 'Closing' },
        },
        controls: { playback: true },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  const renderer = renderers.at(-1);
  const frameEvents = [];
  chart.on('playbackframechange', ({ reason, previousIndex, state, label }) =>
    frameEvents.push({ reason, previousIndex, index: state.index, label }),
  );

  try {
    assert.equal(renderer.chartSurface.tagName, 'SVG');
    assert.equal(chart.getScene().metadata.rowCount, 3);
    assert.deepEqual(chart.getPlaybackState(), {
      enabled: true,
      frames: ['Q1', 'Q2', 'Q3', 'Q4'],
      index: 3,
      frame: 'Q4',
      playing: false,
      rate: 1,
      loop: true,
      mode: 'cumulative',
      direction: 'reverse',
      range: { start: 1, end: 3, startFrame: 'Q2', endFrame: 'Q4' },
      namedFrames: [
        { name: 'Prelude', value: 'Q1', index: 0 },
        { name: 'Opening', value: 'Q2', index: 1 },
        { name: 'Focus', value: 'Q3', index: 2 },
        { name: 'Closing', value: 'Q4', index: 3 },
      ],
      name: 'Closing',
      label: 'Closing',
    });
    const seek = byControl(renderer.host, 'playback-seek');
    assert.equal(seek.min, '1');
    assert.equal(seek.max, '3');
    assert.equal(seek.getAttribute('aria-valuetext'), 'Closing');

    chart.play('Focus');
    assert.equal(chart.getPlaybackState().index, 2);
    assert.equal(chart.getScene().metadata.rowCount, 2);
    environment.tick(0);
    environment.tick(100);
    assert.equal(chart.getPlaybackState().name, 'Opening');
    environment.tick(200);
    assert.equal(chart.getPlaybackState().name, 'Closing');
    assert.equal(chart.getPlaybackState().playing, true);
    chart.pause();

    chart.setPlaybackLoop(false);
    chart.setPlaybackDirection('forward');
    chart.setPlaybackRange({ start: 'Focus', end: 'Closing' });
    assert.deepEqual(chart.getPlaybackState().range, {
      start: 2,
      end: 3,
      startFrame: 'Q3',
      endFrame: 'Q4',
    });
    assert.throws(() => chart.seek('Opening'), /outside the active range/);
    assert.throws(() => chart.play('Missing'), /Unknown playback frame name/);
    assert.throws(() => chart.setPlaybackDirection('sideways'), TypeError);
    assert.throws(() => chart.setPlaybackRange({ start: 5 }), /available frame indices/);
    chart.seek(-100);
    assert.equal(chart.getPlaybackState().name, 'Focus');
    chart.play('Focus');
    environment.tick(300);
    environment.tick(400);
    assert.equal(chart.getPlaybackState().name, 'Closing');
    assert.equal(chart.getPlaybackState().playing, false);
    assert.equal(environment.pendingFrames(), 0);

    assert.deepEqual(
      frameEvents.map(({ reason, index, label }) => ({ reason, index, label })),
      [
        { reason: 'seek', index: 2, label: 'Focus' },
        { reason: 'step', index: 1, label: 'Opening' },
        { reason: 'step', index: 3, label: 'Closing' },
        { reason: 'seek', index: 2, label: 'Focus' },
        { reason: 'step', index: 3, label: 'Closing' },
      ],
    );
    const status = walk(renderer.host).find(
      (element) => element.getAttribute('aria-live') === 'polite',
    );
    assert.match(status.textContent, /Closing/);
  } finally {
    chart.destroy();
    assert.equal(environment.pendingFrames(), 0);
    environment.restore();
  }
});

test('playback transitions interpolate stable datum keys on one RAF and suppress transient hits', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      width: 240,
      height: 160,
      data: [
        { period: 'Q1', entity: 'A', x: 20, value: 8 },
        { period: 'Q2', entity: 'A', x: 80, value: 24 },
      ],
      mark: { type: 'point', radius: 8 },
      x: { field: 'x', scale: { domain: [0, 100] } },
      y: { field: 'value', scale: { domain: [0, 30] } },
      interaction: {
        playback: {
          field: 'period',
          key: 'entity',
          mode: 'frame',
          filter: true,
          transition: { duration: 600, easing: 'linear' },
        },
        selection: { key: 'entity' },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  const renderer = renderers[0];
  const datumPoint = (scene) =>
    findSceneNode(scene, (node) => node.type === 'circle' && node.datum?.datum.entity === 'A');
  const initialScene = renderer.scene;
  const initialPoint = datumPoint(initialScene);
  const renderScenes = [];
  const hoverHits = [];
  const clickHits = [];
  chart.on('render', ({ scene }) => renderScenes.push(scene));
  chart.on('hover', ({ hit }) => hoverHits.push(hit));
  chart.on('click', ({ hit }) => clickHits.push(hit));

  try {
    chart.seek(1);
    const endpointScene = chart.getScene();
    const endpointPoint = datumPoint(endpointScene);
    assert.notEqual(initialPoint.cx, endpointPoint.cx);
    assert.equal(renderer.scene, initialScene, 'the compiled endpoint must not flash before RAF');
    assert.equal(renderScenes.length, 1, 'render emits once for the authoritative endpoint');
    assert.equal(renderScenes[0], endpointScene);
    assert.equal(environment.pendingFrames(), 1, 'playback and tween share one RAF owner');

    environment.tick(0);
    environment.tick(300);
    const midpointScene = renderer.scene;
    const midpoint = datumPoint(midpointScene);
    assert.equal(midpoint.cx, (initialPoint.cx + endpointPoint.cx) / 2);
    assert.equal(chart.getScene(), endpointScene, 'getScene remains the authoritative endpoint');
    assert.equal(environment.pendingFrames(), 1);

    renderer.chartSurface.dispatchEvent(
      new FakePointerEvent('pointermove', { clientX: midpoint.cx, clientY: midpoint.cy }),
    );
    renderer.chartSurface.dispatchEvent(
      new FakePointerEvent('click', { clientX: midpoint.cx, clientY: midpoint.cy }),
    );
    assert.deepEqual(hoverHits, [null]);
    assert.deepEqual(clickHits, [null]);
    assert.equal(
      chart.getSelection().items.length,
      0,
      'selection never targets transient geometry',
    );

    environment.tick(600);
    assert.equal(renderer.scene, endpointScene);
    assert.equal(environment.pendingFrames(), 0);
    assert.equal(renderScenes.length, 1, 'RAF frames do not emit extra endpoint render events');

    chart.seek(0);
    environment.tick(700);
    environment.tick(850);
    const interruptedScene = renderer.scene;
    const interruptedPoint = datumPoint(interruptedScene);
    assert.notEqual(interruptedPoint.cx, initialPoint.cx);
    assert.notEqual(interruptedPoint.cx, endpointPoint.cx);
    chart.seek(1);
    assert.equal(
      renderer.scene,
      interruptedScene,
      'seek restarts from the currently displayed scene',
    );
    assert.equal(environment.pendingFrames(), 1);
    chart.pause();
    assert.equal(renderer.scene, chart.getScene(), 'pause settles the current endpoint');
    assert.equal(environment.pendingFrames(), 0);

    const finalPoint = datumPoint(renderer.scene);
    renderer.chartSurface.dispatchEvent(
      new FakePointerEvent('click', { clientX: finalPoint.cx, clientY: finalPoint.cy }),
    );
    assert.equal(clickHits.at(-1)?.datum.entity, 'A');
    assert.equal(chart.getSelection().items.length, 1);
  } finally {
    chart.destroy();
    assert.equal(environment.pendingFrames(), 0);
    environment.restore();
  }
});

test('fast autoplay clamps transitions below intervals and never accumulates transient exits', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      width: 240,
      height: 160,
      data: [
        { period: 'Q1', entity: 'A', category: 'Alpha', value: 8 },
        { period: 'Q2', entity: 'A', category: 'Beta', value: 14 },
        { period: 'Q3', entity: 'A', category: 'Gamma', value: 20 },
        { period: 'Q4', entity: 'A', category: 'Delta', value: 26 },
      ],
      mark: 'point',
      x: 'category',
      y: { field: 'value', scale: { domain: [0, 30] } },
      interaction: {
        playback: {
          field: 'period',
          key: 'entity',
          mode: 'frame',
          filter: true,
          interval: 100,
          autoplay: true,
          transition: { duration: 600, easing: 'linear' },
        },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  const renderer = renderers[0];
  const transientExitIds = () =>
    sceneNodes(renderer.scene.root)
      .map(({ id }) => id)
      .filter((id) => id.startsWith('transition-exit-'));

  try {
    environment.tick(0);
    environment.tick(100);
    assert.equal(chart.getPlaybackState().index, 1);

    environment.tick(125);
    assert.ok(transientExitIds().length > 0, 'changed endpoint text uses a visible crossfade');

    environment.tick(199);
    assert.equal(
      renderer.scene,
      chart.getScene(),
      'the effective 99ms transition settles before the 100ms frame boundary',
    );
    assert.deepEqual(transientExitIds(), []);

    environment.tick(200);
    assert.equal(chart.getPlaybackState().index, 2);
    assert.deepEqual(
      transientExitIds(),
      [],
      'the next autoplay transition starts from a clean authoritative endpoint',
    );

    environment.tick(225);
    const secondCrossfade = transientExitIds();
    assert.ok(secondCrossfade.length > 0);
    assert.equal(
      secondCrossfade.some((id) => id.includes(':transition-exit-')),
      false,
      'exit prefixes never nest across interrupted automatic transitions',
    );

    environment.tick(300);
    assert.equal(chart.getPlaybackState().index, 3);
    assert.deepEqual(transientExitIds(), []);
  } finally {
    chart.destroy();
    assert.equal(environment.pendingFrames(), 0);
    environment.restore();
  }
});

test('reduced motion blocks autoplay and an existing motion frame selects the initial index', () => {
  const environment = installEnvironment({ reducedMotion: true });
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: [
        { period: 'Q1', category: 'A', value: 10 },
        { period: 'Q2', category: 'A', value: 14 },
        { period: 'Q3', category: 'A', value: 18 },
      ],
      mark: { type: 'motion', options: { frame: 'Q2' } },
      x: 'category',
      y: 'value',
      interaction: {
        playback: {
          field: 'period',
          key: 'category',
          autoplay: true,
          transition: { duration: 600, easing: 'ease-in-out' },
        },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );

  try {
    assert.equal(chart.getPlaybackState().index, 1);
    assert.equal(chart.getPlaybackState().frame, 'Q2');
    assert.equal(chart.getPlaybackState().playing, false);
    assert.equal(environment.pendingFrames(), 0);
    chart.seek(2);
    assert.equal(chart.getPlaybackState().frame, 'Q3');
    assert.equal(renderers[0].scene, chart.getScene());
    assert.equal(environment.pendingFrames(), 0, 'reduced motion keeps transitions immediate');
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('constructor failure destroys a partially mounted renderer and global listeners', () => {
  const environment = installEnvironment();
  const { registry, target } = createHarness(environment.document);
  let renderer;
  registry.registerRenderer({
    name: 'canvas',
    capabilities: {
      vector: false,
      gpu: false,
      worker: false,
      exportFormats: [],
      inspectionViewport: true,
    },
    create() {
      renderer = new FakeRenderer();
      renderer.mount = (mountTarget) => {
        renderer.host = mountTarget.ownerDocument.createElement('div');
        mountTarget.append(renderer.host);
        throw new Error('mount failed');
      };
      return renderer;
    },
  });

  try {
    assert.throws(
      () =>
        new Chart(
          target,
          {
            data: [{ category: 'A', value: 10 }],
            mark: 'point',
            x: 'category',
            y: 'value',
          },
          registry,
          { autoResize: false },
        ),
      /mount failed/,
    );
    assert.equal(renderer.destroyed, true);
    assert.equal(renderer.host.parentElement, null);
    assert.equal(environment.document.listenerCount(), 0);
    assert.equal(environment.media.listenerCount(), 0);
    assert.equal(environment.pendingFrames(), 0);
  } finally {
    environment.restore();
  }
});

test('legend, selection, and annotation runtime state stay transient and emit one lifecycle event', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const spec = {
    layers: [
      {
        id: 'actual',
        name: 'Actual',
        data: [
          { category: 'A', value: 10 },
          { category: 'B', value: 14 },
        ],
        mark: 'line',
        x: 'category',
        y: 'value',
      },
      {
        id: 'plan',
        name: 'Plan',
        data: [
          { category: 'A', value: 11 },
          { category: 'B', value: 13 },
        ],
        mark: 'point',
        x: 'category',
        y: 'value',
      },
    ],
    legend: { mode: 'layers', interactive: true },
    annotations: [
      { id: 'base-note', target: { type: 'datum', layerId: 'actual', rowIndex: 0 }, text: 'Base' },
    ],
    highlights: [{ id: 'persistent', target: { type: 'plot', x: 0.1, y: 0.1 } }],
    interaction: {
      navigation: false,
      selection: { clearOnEscape: true },
      controls: {
        annotations: true,
        labels: { showAnnotations: '주석 보기', hideAnnotations: '주석 숨기기' },
      },
    },
  };
  const chart = new Chart(target, spec, registry, {
    width: 240,
    height: 160,
    autoResize: false,
  });
  const renderer = renderers[0];
  const legendReasons = [];
  const selectionReasons = [];
  const annotationReasons = [];
  const annotationVisibility = [];
  chart.on('legendchange', ({ reason }) => legendReasons.push(reason));
  chart.on('selectionchange', ({ reason }) => selectionReasons.push(reason));
  chart.on('annotationchange', ({ reason }) => annotationReasons.push(reason));
  chart.on('annotationvisibilitychange', ({ visible, reason }) =>
    annotationVisibility.push({ visible, reason }),
  );

  try {
    assert.equal(chart.getLegendState().items.length, 2);
    const actual = chart.getLegendState().items.find(({ layerId }) => layerId === 'actual');
    const button = walk(renderer.host).find(
      (element) => element.dataset.graflumeLegendItem === actual.id,
    );
    button.click();
    assert.equal(chart.getLegendState().items.find(({ id }) => id === actual.id).visible, false);
    assert.deepEqual(legendReasons, ['toggle']);
    chart.setLegendItemVisible(actual.id, true);
    assert.deepEqual(legendReasons, ['toggle', 'programmatic']);
    chart.resetLegend();
    assert.deepEqual(legendReasons, ['toggle', 'programmatic']);

    assert.equal(renderer.chartSurface.tabIndex, 0, 'selection-only Escape path is focusable');
    chart.setSelection([{ type: 'datum', layerId: 'actual', rowIndex: 1 }]);
    assert.equal(chart.getSelection().items.length, 1);
    assert.deepEqual(selectionReasons, ['programmatic']);
    assert.throws(
      () =>
        chart.setSelection([
          { type: 'datum', layerId: 'actual', rowIndex: 0 },
          { type: 'datum', layerId: 'actual', rowIndex: 1 },
        ]),
      /at most one/,
    );
    assert.throws(
      () =>
        chart.setSelection([
          { type: 'datum', layerId: 'actual', rowIndex: 1 },
          { type: 'datum', layerId: 'actual', rowIndex: 1 },
        ]),
      /at most one/,
    );
    const escape = new FakeKeyboardEvent('keydown', { key: 'Escape' });
    renderer.chartSurface.dispatchEvent(escape);
    assert.equal(escape.defaultPrevented, true);
    assert.equal(chart.getSelection().items.length, 0);
    assert.deepEqual(selectionReasons, ['programmatic', 'clear']);

    const annotationsButton = byControl(renderer.host, 'annotations');
    assert.notEqual(annotationsButton, undefined);
    assert.equal(annotationsButton.getAttribute('aria-label'), '주석 숨기기');
    assert.equal(chart.getAnnotationsVisible(), true);
    annotationsButton.click();
    assert.equal(chart.getAnnotationsVisible(), false);
    assert.equal(annotationsButton.getAttribute('aria-label'), '주석 보기');
    const hiddenSceneNodes = sceneNodes(chart.getScene().root);
    assert.equal(
      hiddenSceneNodes.some(({ id }) => id === 'annotation:base-note:bubble'),
      false,
    );
    assert.equal(
      hiddenSceneNodes.some(({ id }) => id === 'annotation:base-note:connector'),
      false,
    );
    assert.equal(
      hiddenSceneNodes.some(({ id }) => id === 'decoration:persistent'),
      true,
    );
    assert.match(chart.getScene().accessibility.description, /Base/);
    chart.setAnnotationsVisible(false);
    chart.setAnnotationsVisible(true);
    assert.deepEqual(annotationVisibility, [
      { visible: false, reason: 'toggle' },
      { visible: true, reason: 'programmatic' },
    ]);

    const runtimeId = chart.addAnnotation({
      target: { type: 'datum', layerId: 'plan', rowIndex: 1 },
      text: 'Runtime',
    });
    chart.updateAnnotation(runtimeId, { detail: 'Updated safely' });
    assert.equal(
      chart.getAnnotations().find(({ id }) => id === runtimeId).detail,
      'Updated safely',
    );
    assert.equal(chart.removeAnnotation(runtimeId), true);
    assert.deepEqual(annotationReasons, ['add', 'update', 'remove']);
    chart.setAnnotations([]);
    assert.equal(byControl(renderer.host, 'annotations'), undefined);
    chart.toggleAnnotations();
    chart.setSpec(spec);
    assert.equal(chart.getAnnotationsVisible(), true);
    assert.notEqual(byControl(renderer.host, 'annotations'), undefined);
    assert.deepEqual(annotationVisibility.slice(-2), [
      { visible: false, reason: 'toggle' },
      { visible: true, reason: 'spec' },
    ]);
    assert.equal(chart.getSpec(), spec);
    assert.equal(spec.annotations.length, 1);
    chart.destroy();
    assert.throws(() => chart.getAnnotationsVisible(), /destroyed/i);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('interactive legend controls follow the Canvas inspection transform', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      layers: [
        { id: 'a', data: [{ x: 'A', y: 1 }], mark: 'line', x: 'x', y: 'y' },
        { id: 'b', data: [{ x: 'A', y: 2 }], mark: 'point', x: 'x', y: 'y' },
      ],
      legend: { mode: 'layers', interactive: true, title: 'Before' },
      interaction: { navigation: { maxZoom: 2 } },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );

  try {
    const host = renderers[0].host;
    const before = walk(host).find(({ dataset }) => dataset.graflumeLegendItem === 'layer-a-0');
    const group = walk(host).find(({ dataset }) => dataset.graflumeLegendControls === 'true');
    assert.equal(group.getAttribute('aria-label'), 'Before');
    before.focus();
    before.click();
    const restored = walk(host).find(({ dataset }) => dataset.graflumeLegendItem === 'layer-a-0');
    assert.equal(environment.document.activeElement, restored);
    chart.setSpec({
      ...chart.getSpec(),
      legend: { mode: 'layers', interactive: true, title: 'After' },
    });
    assert.equal(group.getAttribute('aria-label'), 'After');
    const x = Number.parseFloat(before.style.left);
    const y = Number.parseFloat(before.style.top);
    const width = Number.parseFloat(before.style.width);
    chart.zoomBy(2, { x: 0, y: 0 });
    const zoomed = walk(host).find(({ dataset }) => dataset.graflumeLegendItem === 'layer-a-0');
    assert.equal(Number.parseFloat(zoomed.style.left), x * 2);
    assert.equal(Number.parseFloat(zoomed.style.top), y * 2);
    assert.equal(Number.parseFloat(zoomed.style.width), width * 2);
    chart.panBy(-10, -5);
    const panned = walk(host).find(({ dataset }) => dataset.graflumeLegendItem === 'layer-a-0');
    assert.equal(Number.parseFloat(panned.style.left), x * 2 - 10);
    assert.equal(Number.parseFloat(panned.style.top), y * 2 - 5);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('multiple selection keys preserve compound rows and canonicalize selector sets', () => {
  const environment = installEnvironment();
  const { registry, target } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: [
        { category: 'A', value: 10 },
        { category: 'A', value: 14 },
      ],
      mark: 'point',
      x: 'category',
      y: 'value',
      interaction: { selection: { mode: 'multiple' } },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  try {
    chart.setSelection([
      { type: 'datum', rowIndex: 0, field: 'category', value: 'A' },
      { type: 'datum', rowIndex: 1, field: 'category', value: 'A' },
    ]);
    assert.equal(chart.getSelection().items.length, 2);
    assert.throws(
      () =>
        chart.setSelection([
          { type: 'datum', rowIndex: [0, 1], field: 'category', values: ['A', 'B'] },
          { type: 'datum', rowIndex: [1, 0], field: 'category', values: ['B', 'A'] },
        ]),
      /unique/,
    );
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('Canvas native semantic table supports roving keys, focus ring, tooltip, and selection sync', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: [
        { category: '서울', value: 10 },
        { category: 'بوسان', value: 14 },
        { category: '제주', value: 8 },
      ],
      mark: 'bar',
      x: 'category',
      y: 'value',
      interaction: {
        tooltip: true,
        selection: { mode: 'multiple', clearOnEscape: true },
      },
      accessibility: {
        table: 'hidden',
        navigation: true,
        maxRows: 10,
        summary: '지역별 값',
        live: { throttleMs: 0 },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  try {
    assert.equal(chart.getSemanticIndex().length, 3);
    assert.equal(chart.toAccessibleRows().length, 3);
    assert.deepEqual(chart.getAccessibilityState(), {
      enabled: true,
      table: 'hidden',
      navigation: true,
      rowCount: 3,
    });
    const host = renderers[0].host;
    const mirror = walk(host).find(
      ({ dataset }) => dataset.graflumeAccessibilityMirror === 'hidden',
    );
    assert.notEqual(mirror, undefined);
    assert.equal(mirror.getAttribute('dir'), 'auto');
    let rows = walk(mirror).filter(({ dataset }) => dataset.graflumeSemanticId !== undefined);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].tabIndex, 0);
    assert.match(rows[0].getAttribute('aria-label'), /서울/);

    rows[0].focus();
    rows[0].dispatchEvent(new Event('focus'));
    const ring = walk(host).find(({ dataset }) => dataset.graflumeSemanticFocus === 'true');
    assert.equal(ring.hidden, false);
    assert.ok(Number.parseFloat(ring.style.width) >= 8);
    const tooltip = walk(host).find(({ dataset }) => dataset.graflumeTooltip === 'true');
    assert.equal(tooltip.hidden, false);

    rows[0].dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowDown' }));
    assert.equal(
      environment.document.activeElement.dataset.graflumeSemanticId,
      rows[1].dataset.graflumeSemanticId,
    );
    environment.document.activeElement.dispatchEvent(new Event('focus'));
    environment.document.activeElement.dispatchEvent(
      new FakeKeyboardEvent('keydown', { key: ' ' }),
    );
    assert.equal(chart.getSelection().items.length, 1);
    rows = walk(host).filter(({ dataset }) => dataset.graflumeSemanticId !== undefined);
    assert.equal(rows[1].getAttribute('aria-selected'), 'true');

    rows[1].dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'End' }));
    assert.equal(
      environment.document.activeElement.dataset.graflumeSemanticId,
      rows[2].dataset.graflumeSemanticId,
    );
    rows[2].dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(chart.getSelection().items.length, 0);
    assert.equal(environment.document.activeElement, renderers[0].chartSurface);
    assert.equal(ring.hidden, true);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('Canvas Table mirror uses one merge anchor and authored multilingual date-time text', () => {
  const environment = installEnvironment();
  const { registry, target } = createHarness(environment.document);
  const data = [
    { region: '서울', team: '분석팀', updated: '2026-08-27T15:30:00Z' },
    { region: '서울', team: 'فريق البيانات', updated: '2026-08-28T01:15:00Z' },
    { region: '부산', team: '검토 완료', updated: '2026-08-28T04:45:00Z' },
  ];
  const chart = new Chart(
    target,
    {
      data,
      mark: {
        type: 'table',
        options: {
          columns: [
            { field: 'region', header: '지역' },
            { field: 'team', header: 'الفريق' },
            {
              field: 'updated',
              header: '수정 시각',
              formatter: 'datetime',
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'Asia/Seoul',
            },
          ],
          mergeRepeats: [{ field: 'region' }],
          merges: [{ row: 2, column: 'team', columnSpan: 2 }],
        },
      },
      x: 'region',
      y: 'team',
      locale: 'ko-KR',
      accessibility: { table: 'visible', navigation: true, maxRows: 20 },
    },
    registry,
    { width: 720, height: 400, autoResize: false },
  );

  try {
    const mirror = walk(target).find(
      ({ dataset }) => dataset.graflumeAccessibilityMirror === 'visible',
    );
    assert.notEqual(mirror, undefined);
    const table = walk(mirror).find(({ dataset }) => dataset.graflumeAccessibilityTable === 'true');
    assert.equal(table.getAttribute('aria-rowcount'), '4');
    assert.equal(table.getAttribute('aria-colcount'), '4');
    const rows = walk(mirror).filter(({ dataset }) => dataset.graflumeSemanticId !== undefined);
    assert.equal(rows.length, 3);
    assert.equal(new Set(rows.map(({ dataset }) => dataset.graflumeSemanticId)).size, 3);

    const regionCells = walk(mirror).filter(
      ({ dataset }) => dataset.graflumeTableField === 'region',
    );
    assert.deepEqual(
      regionCells.map(({ textContent }) => textContent),
      ['서울', '부산'],
      'the second 서울 cell is covered by the first merge anchor',
    );
    assert.equal(regionCells[0].rowSpan, 2);
    assert.equal(regionCells[0].colSpan, 1);
    const horizontal = walk(mirror).find(
      ({ dataset }) => dataset.graflumeTableField === 'team' && dataset.graflumeTableRow === '2',
    );
    assert.equal(horizontal.rowSpan, 1);
    assert.equal(horizontal.colSpan, 2);
    assert.equal(
      walk(mirror).some(
        ({ dataset }) =>
          dataset.graflumeTableField === 'updated' && dataset.graflumeTableRow === '2',
      ),
      false,
    );

    const expected = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(new Date(data[0].updated));
    const firstUpdated = walk(mirror).find(
      ({ dataset }) => dataset.graflumeTableField === 'updated' && dataset.graflumeTableRow === '0',
    );
    assert.equal(firstUpdated.textContent, expected);
    assert.equal(firstUpdated.getAttribute('dir'), 'auto');
    assert.ok(
      walk(mirror).some(({ textContent, tagName }) => tagName === 'TH' && textContent === 'الفريق'),
    );
    assert.match(rows[1].getAttribute('aria-label'), /فريق البيانات/u);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('Canvas Table explorer clips and re-anchors row spans inside its bounded DOM window', () => {
  const environment = installEnvironment();
  const { registry, target } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: Array.from({ length: 30 }, (_value, index) => ({ region: '전체', value: index })),
      mark: {
        type: 'table',
        options: {
          columns: ['region', 'value'],
          rowHeight: 18,
          mergeRepeats: [{ field: 'region' }],
        },
      },
      x: 'region',
      y: 'value',
      accessibility: {
        table: 'visible',
        navigation: true,
        maxRows: 40,
        explorer: { windowRows: 5, overscanRows: 0, rowHeight: 32 },
      },
    },
    registry,
    { width: 640, height: 720, autoResize: false },
  );

  try {
    const mirror = walk(target).find(
      ({ dataset }) => dataset.graflumeAccessibilityMirror === 'visible',
    );
    const materializedRows = () =>
      walk(mirror).filter(({ dataset }) => dataset.graflumeSemanticId !== undefined);
    const regionCells = () =>
      walk(mirror).filter(({ dataset }) => dataset.graflumeTableField === 'region');
    assert.equal(materializedRows().length, 5);
    assert.equal(regionCells().length, 1);
    assert.equal(regionCells()[0].rowSpan, 5);

    mirror.scrollTop = 10 * 32;
    mirror.dispatchEvent(new Event('scroll'));
    assert.equal(materializedRows().length, 5);
    assert.equal(materializedRows()[0].dataset.graflumeTableRow, '10');
    assert.equal(regionCells().length, 1);
    assert.equal(regionCells()[0].dataset.graflumeTableRow, '0');
    assert.equal(regionCells()[0].rowSpan, 5);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('Canvas semantic data explorer virtualizes large mirrors without truncating roving traversal', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: Array.from({ length: 80 }, (_, index) => ({ category: `row-${index}`, value: index })),
      mark: 'bar',
      x: 'category',
      y: 'value',
      accessibility: { table: 'visible', navigation: true, maxRows: 100 },
    },
    registry,
    { width: 640, height: 360, autoResize: false },
  );
  try {
    const host = renderers[0].host;
    const mirror = walk(target).find(
      ({ dataset }) => dataset.graflumeAccessibilityMirror === 'visible',
    );
    assert.notEqual(mirror, undefined);
    assert.equal(mirror.dataset.graflumeVirtualRows, '80');
    let rows = walk(mirror).filter(({ dataset }) => dataset.graflumeSemanticId !== undefined);
    assert.ok(rows.length < 40, 'only the first viewport and overscan are materialized');
    rows[0].dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'End' }));
    rows = walk(mirror).filter(({ dataset }) => dataset.graflumeSemanticId !== undefined);
    assert.ok(rows.length < 40, 'the final viewport remains bounded');
    assert.equal(environment.document.activeElement.dataset.graflumeSemanticIndex, '79');
    assert.equal(
      environment.document.activeElement.dataset.graflumeSemanticId,
      'layer-0:observation:79',
    );
    assert.equal(
      walk(host).filter(({ dataset }) => dataset.graflumeSemanticFocus === 'true').length,
      1,
    );
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('Canvas views synchronize linked focus through an injected stable-key store', () => {
  const environment = installEnvironment();
  const leftHarness = createHarness(environment.document);
  const rightHarness = createHarness(environment.document);
  const focusStore = createSemanticFocusStore();
  const common = {
    mark: 'bar',
    x: 'category',
    y: 'value',
    accessibility: {
      table: true,
      navigation: true,
      linkedFocus: { group: 'linked-sales', key: 'id' },
    },
  };
  const left = new Chart(
    leftHarness.target,
    {
      ...common,
      data: [
        { id: 'a', category: 'A', value: 1 },
        { id: 'b', category: 'B', value: 2 },
      ],
    },
    leftHarness.registry,
    { width: 240, height: 160, autoResize: false, focusStore },
  );
  const right = new Chart(
    rightHarness.target,
    {
      ...common,
      data: [
        { id: 'b', category: 'B mirror', value: 20 },
        { id: 'c', category: 'C', value: 30 },
      ],
    },
    rightHarness.registry,
    { width: 240, height: 160, autoResize: false, focusStore },
  );
  try {
    const leftRows = walk(leftHarness.renderers[0].host).filter(
      ({ dataset }) => dataset.graflumeSemanticId !== undefined,
    );
    leftRows[1].focus();
    leftRows[1].dispatchEvent(new Event('focus'));
    assert.equal(focusStore.state().matches.length, 2);
    assert.match(environment.document.activeElement.getAttribute('aria-label'), /B mirror/);
    assert.equal(right.getAccessibilityState().enabled, true);
  } finally {
    left.destroy();
    right.destroy();
    environment.restore();
  }
});

test('Chart streaming runtime coalesces frames and applies follow-live snapshots', async () => {
  const environment = installEnvironment();
  const { registry, target } = createHarness(environment.document);
  const callbacks = [];
  const cancelled = new Set();
  let sequence = 0;
  const scheduler = {
    request(callback) {
      sequence += 1;
      callbacks.push({ id: sequence, callback });
      return sequence;
    },
    cancel(id) {
      cancelled.add(id);
    },
    flush() {
      const entry = callbacks.shift();
      assert.notEqual(entry, undefined);
      if (!cancelled.has(entry.id)) entry.callback(entry.id * 16.7);
    },
  };
  const chart = new Chart(
    target,
    {
      data: [{ id: 'a', x: 1, value: 1 }],
      mark: 'line',
      x: 'x',
      y: 'value',
      streaming: {
        key: 'id',
        mode: 'upsert',
        retention: { maxRows: 20 },
        queue: { maxBatches: 4, maxRows: 20, overflow: 'coalesce' },
        runtime: {
          schedule: 'animation-frame',
          maxBatchesPerFrame: 4,
          overflow: 'coalesce',
          followLive: false,
          history: { maxBatches: 8, pageRows: 2 },
        },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false, streamScheduler: scheduler },
  );
  try {
    const first = chart.enqueueData({ rows: [{ id: 'a', value: 2 }] });
    const second = chart.enqueueData({ rows: [{ id: 'b', x: 2, value: 3 }] });
    assert.equal(callbacks.length, 1);
    scheduler.flush();
    await Promise.all([first, second]);
    assert.equal(
      chart.getSemanticIndex().length,
      1,
      'follow-live=false holds the rendered snapshot',
    );
    assert.equal(chart.getStreamRuntimeState().appliedBatches, 2);
    chart.setStreamingFollowLive(true);
    assert.equal(chart.getSemanticIndex().length, 2);
    assert.equal(chart.getStreamingHistoryPage().entries.length, 2);

    chart.pauseStreaming();
    const paused = chart.enqueueData({ rows: [{ id: 'c', x: 3, value: 4 }] });
    assert.equal(callbacks.length, 0);
    chart.resumeStreaming();
    scheduler.flush();
    await paused;
    assert.equal(chart.getSemanticIndex().length, 3);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('semantic mirror and selection live region follow the target owner document', () => {
  const environment = installEnvironment();
  const secondaryDocument = new FakeDocument();
  const { registry, target, renderers } = createHarness(secondaryDocument);
  const chart = new Chart(
    target,
    {
      data: [{ category: '서울', value: 10 }],
      mark: 'bar',
      x: 'category',
      y: 'value',
      interaction: { tooltip: true, selection: true },
      accessibility: { table: true, navigation: true, live: { throttleMs: 0 } },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  try {
    const host = renderers[0].host;
    const mirror = walk(host).find(
      ({ dataset }) => dataset.graflumeAccessibilityMirror === 'hidden',
    );
    const live = walk(host).find(({ dataset }) => dataset.graflumeSelectionStatus === 'true');
    assert.equal(mirror.ownerDocument, secondaryDocument);
    assert.equal(live.ownerDocument, secondaryDocument);
    const row = walk(mirror).find(({ dataset }) => dataset.graflumeSemanticId !== undefined);
    row.focus();
    row.dispatchEvent(new Event('focus'));
    const tooltip = walk(host).find(({ dataset }) => dataset.graflumeTooltip === 'true');
    assert.equal(tooltip.ownerDocument, secondaryDocument);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('data-domain navigation supports wheel, pointer drag, keyboard reset, and coordinate round-trip', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const spec = {
    data: [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ],
    mark: 'line',
    encoding: {
      x: { field: 'x', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
      y: { field: 'y', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
    },
    annotations: [{ id: 'guide', target: { type: 'plot', x: 0.5, y: 0.5 }, text: 'Guide' }],
    interaction: {
      domainNavigation: { axes: ['x'], maxZoom: 8, wheel: 'always', drag: true, keyboard: true },
    },
  };
  const chart = new Chart(target, spec, registry, {
    width: 240,
    height: 160,
    autoResize: false,
  });
  try {
    const surface = renderers[0].chartSurface;
    closeEnough(chart.pixelToDomain('x', chart.domainToPixel('x', 4)), 4);
    const reasons = [];
    chart.on('domainviewchange', ({ reason }) => reasons.push(reason));
    const anchor = chart.domainToPixel('x', 5);
    const wheel = new FakeWheelEvent('wheel', { clientX: anchor, clientY: 80, deltaY: -120 });
    surface.dispatchEvent(wheel);
    assert.equal(wheel.defaultPrevented, true);
    assert.ok(chart.getDomainViewState().axes.x.end - chart.getDomainViewState().axes.x.start < 1);
    assert.equal(chart.getSpec(), spec);
    assert.ok(sceneNodes(chart.getScene().root).some(({ id }) => id === 'annotation:guide:bubble'));

    const beforePan = chart.getDomainViewState().axes.x.start;
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', { pointerId: 7, clientX: anchor, clientY: 80 }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', { pointerId: 7, clientX: anchor + 20, clientY: 80 }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', { pointerId: 7, clientX: anchor + 20, clientY: 80 }),
    );
    assert.notEqual(chart.getDomainViewState().axes.x.start, beforePan);
    const reset = new FakeKeyboardEvent('keydown', { key: 'Home' });
    surface.dispatchEvent(reset);
    assert.equal(reset.defaultPrevented, true);
    assert.deepEqual(chart.getDomainViewState(), { version: 1, axes: {} });
    assert.ok(reasons.includes('zoom'));
    assert.ok(reasons.includes('pan'));
    assert.ok(reasons.includes('reset'));
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('rectangle, lasso, and axis pointer selections use bounded serializable domain state', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const base = {
    data: [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ],
    mark: 'point',
    encoding: {
      x: { field: 'x', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
      y: { field: 'y', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
    },
  };
  const chart = new Chart(
    target,
    {
      ...base,
      interaction: {
        selection: {
          kind: 'rectangle',
          mode: 'multiple',
          combine: 'union',
          minPixelSpan: 1,
        },
      },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );
  try {
    const pointerReasons = [];
    chart.on('analyticselectionchange', ({ reason }) => pointerReasons.push(reason));
    const surface = renderers[0].chartSurface;
    const start = { x: chart.domainToPixel('x', 2), y: chart.domainToPixel('y', 3) };
    const end = { x: chart.domainToPixel('x', 8), y: chart.domainToPixel('y', 9) };
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 11,
        pointerType: 'touch',
        clientX: start.x,
        clientY: start.y,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 11,
        pointerType: 'touch',
        clientX: end.x,
        clientY: end.y,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 11,
        pointerType: 'touch',
        clientX: end.x,
        clientY: end.y,
      }),
    );
    const rectangle = chart.getAnalyticSelection();
    assert.equal(rectangle.selections[0].type, 'rectangle');
    assert.deepEqual(JSON.parse(JSON.stringify(rectangle)), rectangle);
    assert.ok(sceneNodes(chart.getScene().root).some(({ id }) => id === 'analytic-selection:0'));

    const escape = new FakeKeyboardEvent('keydown', { key: 'Escape' });
    surface.dispatchEvent(escape);
    assert.equal(escape.defaultPrevented, true);
    assert.equal(chart.getAnalyticSelection().selections.length, 0);

    chart.setSpec({
      ...base,
      interaction: {
        selection: { kind: 'lasso', maxLassoPoints: 8, minPixelSpan: 1 },
      },
    });
    const lassoSurface = renderers.at(-1).chartSurface;
    const points = [
      [2, 2],
      [8, 2],
      [8, 8],
      [2, 8],
    ].map(([x, y]) => ({ x: chart.domainToPixel('x', x), y: chart.domainToPixel('y', y) }));
    lassoSurface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 12,
        clientX: points[0].x,
        clientY: points[0].y,
      }),
    );
    for (const point of points.slice(1, -1)) {
      lassoSurface.dispatchEvent(
        new FakePointerEvent('pointermove', { pointerId: 12, clientX: point.x, clientY: point.y }),
      );
    }
    lassoSurface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 12,
        clientX: points.at(-1).x,
        clientY: points.at(-1).y,
      }),
    );
    assert.equal(chart.getAnalyticSelection().selections[0].type, 'lasso');
    assert.ok(chart.getAnalyticSelection().selections[0].points.length <= 8);

    chart.setSpec({
      ...base,
      interaction: { selection: { kind: 'axis', axis: 'x', minPixelSpan: 1 } },
    });
    const axisSurface = renderers.at(-1).chartSurface;
    axisSurface.dispatchEvent(
      new FakePointerEvent('pointerdown', { pointerId: 13, clientX: start.x, clientY: start.y }),
    );
    axisSurface.dispatchEvent(
      new FakePointerEvent('pointerup', { pointerId: 13, clientX: end.x, clientY: start.y }),
    );
    assert.equal(chart.getAnalyticSelection().selections[0].type, 'axis');
    assert.ok(pointerReasons.includes('pointer'));
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('keyboard authors analytic geometry with a visible draft and accessible shortcuts', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      mark: 'point',
      encoding: {
        x: { field: 'x', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
        y: { field: 'y', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
      },
      interaction: {
        selection: { kind: 'rectangle', keyboard: true, keyboardStep: 12, minPixelSpan: 1 },
      },
    },
    registry,
    { width: 320, height: 220, autoResize: false },
  );
  try {
    const surface = renderers[0].chartSurface;
    const reasons = [];
    chart.on('analyticselectionchange', ({ reason }) => reasons.push(reason));
    assert.match(surface.getAttribute('aria-keyshortcuts'), /\bS\b/);
    assert.match(surface.getAttribute('aria-keyshortcuts'), /\bSpace\b/);
    assert.match(chart.getScene().accessibility.description, /Press S to start/);

    const start = new FakeKeyboardEvent('keydown', { key: 's' });
    surface.dispatchEvent(start);
    assert.equal(start.defaultPrevented, true);
    assert.ok(
      sceneNodes(chart.getScene().root).some(({ id }) => id === 'analytic-selection:draft:0'),
    );
    const move = new FakeKeyboardEvent('keydown', { key: 'ArrowRight' });
    surface.dispatchEvent(move);
    assert.equal(move.defaultPrevented, true);
    const apply = new FakeKeyboardEvent('keydown', { key: 'Enter' });
    surface.dispatchEvent(apply);
    assert.equal(apply.defaultPrevented, true);
    assert.equal(chart.getAnalyticSelection().selections[0].type, 'rectangle');
    assert.ok(
      sceneNodes(chart.getScene().root).every(({ id }) => id !== 'analytic-selection:draft:0'),
    );
    assert.ok(sceneNodes(chart.getScene().root).some(({ id }) => id === 'analytic-selection:0'));
    assert.deepEqual(reasons, ['keyboard']);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('composed Chart routes pointer geometry and domain zoom through addressable leaf coordinates', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const unit = (offset) => ({
    data: [
      { x: 0, y: offset },
      { x: 10, y: offset + 10 },
    ],
    mark: 'point',
    encoding: {
      x: { field: 'x', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
      y: { field: 'y', type: 'quantitative', scale: { domain: [0, 20], nice: false } },
    },
  });
  const chart = new Chart(
    target,
    {
      hconcat: [unit(0), unit(5)],
      interaction: {
        selection: { kind: 'rectangle', minPixelSpan: 1 },
        domainNavigation: {
          axes: ['x'],
          wheel: 'always',
          drag: false,
          keyboard: true,
        },
      },
      width: 640,
      height: 280,
    },
    registry,
    { width: 640, height: 280, autoResize: false },
  );
  try {
    const ids = chart.getCoordinateViewIds();
    assert.deepEqual(ids, ['hconcat-0', 'hconcat-1']);
    const firstFive = chart.domainToPixel('x', 5, ids[0]);
    const secondFive = chart.domainToPixel('x', 5, ids[1]);
    assert.ok(secondFive > firstFive);
    closeEnough(chart.pixelToDomain('x', secondFive, ids[1]), 5);

    const surface = renderers[0].chartSurface;
    const start = {
      x: chart.domainToPixel('x', 2, ids[1]),
      y: chart.domainToPixel('y', 3, ids[1]),
    };
    const end = {
      x: chart.domainToPixel('x', 8, ids[1]),
      y: chart.domainToPixel('y', 9, ids[1]),
    };
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 21,
        clientX: start.x,
        clientY: start.y,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 21,
        clientX: end.x,
        clientY: end.y,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 21,
        clientX: end.x,
        clientY: end.y,
      }),
    );
    const selection = chart.getAnalyticSelection().selections[0];
    assert.equal(selection.type, 'rectangle');
    closeEnough(selection.x[0], 2);
    closeEnough(selection.x[1], 8);
    closeEnough(selection.y[0], 3);
    closeEnough(selection.y[1], 9);

    const wheel = new FakeWheelEvent('wheel', {
      clientX: secondFive,
      clientY: chart.domainToPixel('y', 10, ids[1]),
      deltaY: -120,
    });
    surface.dispatchEvent(wheel);
    assert.equal(wheel.defaultPrevented, true);
    assert.ok(chart.getDomainViewState().axes.x.end - chart.getDomainViewState().axes.x.start < 1);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('categorical Canvas brush and domain navigation use stable band identities', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      data: [
        { category: 'A', value: 2 },
        { category: 'B', value: 5 },
        { category: 'C', value: 8 },
      ],
      mark: 'bar',
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
      },
      interaction: {
        selection: { kind: 'rectangle', minPixelSpan: 1 },
        domainNavigation: { axes: ['x'], wheel: 'always', drag: false },
      },
    },
    registry,
    { width: 360, height: 240, autoResize: false },
  );
  try {
    const surface = renderers[0].chartSurface;
    const start = {
      x: chart.domainToPixel('x', 'A'),
      y: chart.domainToPixel('y', 2),
    };
    const end = {
      x: chart.domainToPixel('x', 'B'),
      y: chart.domainToPixel('y', 8),
    };
    assert.equal(chart.pixelToDomain('x', end.x), 'B');
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 31,
        clientX: start.x,
        clientY: start.y,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 31,
        clientX: end.x,
        clientY: end.y,
      }),
    );
    const selection = chart.getAnalyticSelection().selections[0];
    assert.equal(selection.type, 'rectangle');
    assert.deepEqual(selection.x, { values: ['A', 'B'] });

    const wheel = new FakeWheelEvent('wheel', {
      clientX: end.x,
      clientY: end.y,
      deltaY: -180,
    });
    surface.dispatchEvent(wheel);
    assert.equal(wheel.defaultPrevented, true);
    assert.ok(chart.getDomainViewState().axes.x.end - chart.getDomainViewState().axes.x.start < 1);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('injected linked view store synchronizes analytic selection and domain state without loops', () => {
  const environment = installEnvironment();
  const first = createHarness(environment.document);
  const second = createHarness(environment.document);
  const store = new LinkedViewStateStore();
  const spec = {
    data: [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ],
    mark: 'point',
    encoding: {
      x: { field: 'x', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
      y: { field: 'y', type: 'quantitative', scale: { domain: [0, 10], nice: false } },
    },
    interaction: {
      selection: { kind: 'rectangle' },
      domainNavigation: { axes: ['x'], drag: false },
    },
  };
  const left = new Chart(first.target, spec, first.registry, {
    width: 320,
    height: 220,
    autoResize: false,
    linkedViewStore: store,
  });
  const right = new Chart(second.target, spec, second.registry, {
    width: 320,
    height: 220,
    autoResize: false,
    linkedViewStore: store,
  });
  try {
    const selectionReasons = [];
    const domainReasons = [];
    right.on('analyticselectionchange', ({ reason }) => selectionReasons.push(reason));
    right.on('domainviewchange', ({ reason }) => domainReasons.push(reason));
    const state = {
      version: 1,
      combine: 'union',
      selections: [{ type: 'rectangle', xAxis: 'x', yAxis: 'y', x: [2, 8], y: [1, 9] }],
    };
    left.setAnalyticSelection(state);
    assert.deepEqual(right.getAnalyticSelection(), state);
    assert.deepEqual(selectionReasons, ['linked']);

    left.zoomDomainBy(2);
    assert.deepEqual(right.getDomainViewState(), left.getDomainViewState());
    assert.deepEqual(domainReasons, ['linked']);
    assert.deepEqual(store.get().domainView, left.getDomainViewState());
  } finally {
    right.destroy();
    left.destroy();
    environment.restore();
  }
});

function closeEnough(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);
}

test('pie and table family keyboard controls update focus, selection, transforms, and events', () => {
  const environment = installEnvironment();
  const pieHarness = createHarness(environment.document);
  const pie = new Chart(
    pieHarness.target,
    {
      data: [
        { id: 'A', value: 4 },
        { id: 'B', value: 3 },
        { id: 'C', value: 2 },
      ],
      mark: { type: 'pie', fields: { id: 'id', label: 'id' } },
      x: { field: 'id', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      interaction: { selection: { kind: 'point', key: 'id' } },
    },
    pieHarness.registry,
    { width: 360, height: 260, autoResize: false },
  );
  const tableHarness = createHarness(environment.document);
  const table = new Chart(
    tableHarness.target,
    {
      data: [
        { region: 'East', quarter: 'Q1', amount: 10 },
        { region: 'West', quarter: 'Q1', amount: 30 },
        { region: 'East', quarter: 'Q2', amount: 20 },
      ],
      mark: { type: 'table', options: { windowLimit: 2 } },
      x: { field: 'region', type: 'nominal' },
      y: { field: 'amount', type: 'quantitative' },
      interaction: { selection: { kind: 'point' } },
    },
    tableHarness.registry,
    { width: 420, height: 280, autoResize: false },
  );
  try {
    const pieSurface = pieHarness.renderers[0].chartSurface;
    const focusReasons = [];
    pie.on('familyfocuschange', ({ reason }) => focusReasons.push(reason));
    pieSurface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowRight' }));
    assert.deepEqual(pie.getFamilyFocus(), { kind: 'pie-slice', layerId: 'layer-0', id: 'A' });
    pieSurface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowRight' }));
    assert.equal(pie.getFamilyFocus().id, 'B');
    const focusedSlice = findSceneNode(
      pie.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'pie-slice' && datum.familyInteraction.id === 'B',
    );
    assert.ok(focusedSlice.lineWidth >= 3);
    pieSurface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'Enter' }));
    assert.deepEqual(pie.getSelection().items, [
      { type: 'datum', layerId: 'layer-0', field: 'id', value: 'B' },
    ]);
    assert.deepEqual(focusReasons, ['keyboard', 'keyboard']);

    const tableReasons = [];
    table.on('tablechange', ({ reason }) => tableReasons.push(reason));
    table.setTableSort('layer-0', [{ field: 'amount', direction: 'descending' }]);
    let amountCells = sceneNodes(table.getScene().root).filter(
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'table-cell' && datum.tooltip.column === 'amount',
    );
    assert.equal(amountCells[0].datum.tooltip.value, 30);
    table.setTableFilters('layer-0', [
      { field: 'amount', operator: 'greater-or-equal', value: 20 },
    ]);
    assert.equal(table.getTableRuntimeState('layer-0').filters.length, 1);
    table.setTableFilters('layer-0', [{ field: 'amount', operator: 'equals', value: 999 }]);
    assert.ok(sceneNodes(table.getScene().root).some(({ id }) => id.endsWith(':table-empty')));
    assert.equal(
      sceneNodes(table.getScene().root).filter(({ id }) => id.includes(':table-header:')).length,
      3,
    );
    table.setTableFilters('layer-0', []);
    assert.ok(
      sceneNodes(table.getScene().root).some(
        ({ datum }) =>
          datum?.familyInteraction?.kind === 'table-cell' && datum.tooltip.column === 'amount',
      ),
    );
    table.setTableFilters('layer-0', [
      { field: 'amount', operator: 'greater-or-equal', value: 20 },
    ]);
    table.setTableGroup('layer-0', {
      fields: ['region'],
      aggregates: [{ field: 'amount', op: 'sum', as: 'total' }],
    });
    assert.ok(
      sceneNodes(table.getScene().root).some(
        ({ datum }) =>
          datum?.familyInteraction?.kind === 'table-cell' && datum.tooltip.column === 'total',
      ),
    );
    table.setTablePivot('layer-0', {
      row: 'region',
      column: 'quarter',
      value: 'amount',
      op: 'sum',
    });
    assert.equal(table.getTableRuntimeState('layer-0').group, null);
    assert.notEqual(table.getTableRuntimeState('layer-0').pivot, null);
    assert.doesNotThrow(() => JSON.stringify(table.getTableRuntimeState('layer-0')));
    assert.throws(
      () =>
        table.setTableFilters(
          'layer-0',
          Array.from({ length: 17 }, (_, index) => ({
            field: `field-${index}`,
            operator: 'equals',
            value: index,
          })),
        ),
      /limited to 16/u,
    );
    table.resetTableRuntime('layer-0');
    const tableSurface = tableHarness.renderers[0].chartSurface;
    const amountHeader = findSceneNode(
      table.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'table-header' &&
        datum.familyInteraction.field === 'amount',
    );
    tableSurface.dispatchEvent(
      new FakePointerEvent('click', {
        clientX: amountHeader.x + amountHeader.width / 2,
        clientY: amountHeader.y + amountHeader.height / 2,
      }),
    );
    assert.deepEqual(table.getTableRuntimeState('layer-0').sort, [
      { field: 'amount', direction: 'ascending' },
    ]);
    table.resetTableRuntime('layer-0');
    table.focusTableCell('layer-0', 0, 0);
    tableSurface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowRight' }));
    assert.equal(table.getFamilyFocus().column, 1);
    const focusedCell = findSceneNode(
      table.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'table-cell' &&
        datum.familyInteraction.row === 0 &&
        datum.familyInteraction.column === 1,
    );
    assert.equal(focusedCell.lineWidth, 2.5);
    assert.deepEqual(tableReasons, [
      'programmatic',
      'programmatic',
      'programmatic',
      'programmatic',
      'programmatic',
      'programmatic',
      'programmatic',
      'reset',
      'pointer',
      'reset',
    ]);
  } finally {
    table.destroy();
    pie.destroy();
    environment.restore();
  }
});

test('table runtime preserves frozen regions while API and keyboard move the virtual window', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      width: 480,
      height: 320,
      data: Array.from({ length: 7 }, (_, index) => ({
        id: `row-${index}`,
        amount: index * 10,
        note: `note-${index}`,
      })),
      mark: {
        type: 'table',
        options: { windowLimit: 2, frozenRows: 1, frozenColumns: 1 },
      },
      x: { field: 'id', type: 'nominal' },
      y: { field: 'amount', type: 'quantitative' },
    },
    registry,
    { width: 480, height: 320, autoResize: false },
  );
  const tableCells = () =>
    sceneNodes(chart.getScene().root).filter(
      ({ datum }) => datum?.familyInteraction?.kind === 'table-cell',
    );
  const visibleRows = () => [
    ...new Set(tableCells().map(({ datum }) => datum.familyInteraction.row)),
  ];
  const reasons = [];
  chart.on('tablechange', ({ reason }) => reasons.push(reason));
  try {
    chart.setTableRuntimeState('layer-0', { windowOffset: 3 });
    assert.deepEqual(visibleRows(), [0, 3, 4]);
    assert.ok(
      tableCells()
        .filter(({ datum }) => datum.familyInteraction.row === 0)
        .every(({ datum }) => datum.tooltip.frozenRow === true),
    );
    assert.ok(
      tableCells()
        .filter(({ datum }) => datum.familyInteraction.column === 0)
        .every(({ datum }) => datum.tooltip.frozenColumn === true),
    );
    assert.equal(
      tableCells().find(
        ({ datum }) => datum.familyInteraction.row === 3 && datum.familyInteraction.column === 1,
      ).datum.tooltip.frozen,
      false,
    );

    const surface = renderers[0].chartSurface;
    surface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowRight' }));
    assert.deepEqual(chart.getFamilyFocus(), {
      kind: 'table-cell',
      layerId: 'layer-0',
      row: 0,
      column: 0,
      field: 'id',
    });
    assert.equal(chart.getTableRuntimeState('layer-0').windowOffset, 3);
    chart.clearFamilyFocus();

    chart.focusTableCell('layer-0', 0, 1);
    assert.equal(chart.getTableRuntimeState('layer-0').windowOffset, 3);
    surface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowRight' }));
    assert.deepEqual(chart.getFamilyFocus(), {
      kind: 'table-cell',
      layerId: 'layer-0',
      row: 0,
      column: 2,
      field: 'note',
    });
    assert.equal(chart.getTableRuntimeState('layer-0').windowOffset, 3);

    surface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowDown' }));
    assert.equal(chart.getFamilyFocus().row, 1);
    assert.equal(chart.getTableRuntimeState('layer-0').windowOffset, 1);
    assert.deepEqual(visibleRows(), [0, 1, 2]);
    surface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowUp' }));
    assert.equal(chart.getFamilyFocus().row, 0);
    assert.equal(
      chart.getTableRuntimeState('layer-0').windowOffset,
      1,
      'returning to a frozen row must not reset the scroll window',
    );
    const focused = tableCells().find(
      ({ datum }) => datum.familyInteraction.row === 0 && datum.familyInteraction.column === 2,
    );
    assert.equal(focused.lineWidth, 2.5);
    assert.deepEqual(reasons, ['programmatic', 'keyboard']);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('table runtime moves a horizontal virtual window without displacing frozen columns', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      width: 560,
      height: 300,
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
        options: { columnLimit: 2, frozenColumns: 1 },
      },
      x: { field: 'identity', type: 'nominal' },
      y: { field: 'metricA', type: 'quantitative' },
    },
    registry,
    { width: 560, height: 300, autoResize: false },
  );
  const visibleColumns = () =>
    sceneNodes(chart.getScene().root)
      .filter(({ datum }) => datum?.familyInteraction?.kind === 'table-cell')
      .map(({ datum }) => datum.familyInteraction.column);
  try {
    chart.setTableRuntimeState('layer-0', { columnOffset: 3 });
    assert.deepEqual(visibleColumns(), [0, 3, 4]);
    chart.focusTableCell('layer-0', 0, 0);
    assert.equal(chart.getTableRuntimeState('layer-0').columnOffset, 3);

    chart.focusTableCell('layer-0', 0, 5);
    assert.equal(chart.getTableRuntimeState('layer-0').columnOffset, 4);
    assert.deepEqual(visibleColumns(), [0, 4, 5]);
    assert.equal(chart.getFamilyFocus().field, 'metricE');

    const surface = renderers[0].chartSurface;
    surface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowLeft' }));
    assert.equal(chart.getFamilyFocus().column, 4);
    assert.equal(chart.getTableRuntimeState('layer-0').columnOffset, 4);
    surface.dispatchEvent(new FakeKeyboardEvent('keydown', { key: 'ArrowLeft' }));
    assert.equal(chart.getFamilyFocus().column, 3);
    assert.equal(chart.getTableRuntimeState('layer-0').columnOffset, 3);
    assert.deepEqual(visibleColumns(), [0, 3, 4]);
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('network pointer controls drag, pin, collapse, and lasso through transient runtime state', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  registry.registerMark('graph', compileAdvancedGraphMark);
  const data = [
    { node: 'group', source: 'a', target: 'b', edge: 'ab-1', weight: 2 },
    { node: 'a', parent: 'group', source: 'a', target: 'b', edge: 'ab-2', weight: 1 },
    { node: 'b', parent: 'group', source: 'b', target: 'c', edge: 'bc', weight: 1 },
    { node: 'c', source: 'c', target: 'a', edge: 'ca', weight: 1 },
  ];
  const chart = new Chart(
    target,
    {
      width: 440,
      height: 320,
      data,
      mark: {
        type: 'graph',
        fields: {
          node: 'node',
          parent: 'parent',
          source: 'source',
          target: 'target',
          edgeId: 'edge',
          weight: 'weight',
        },
        options: { layout: 'grid', iterations: 8 },
      },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'target', type: 'nominal' },
    },
    registry,
    { width: 440, height: 320, autoResize: false },
  );
  try {
    const surface = renderers[0].chartSurface;
    const changes = [];
    chart.on('networkchange', ({ reason }) => changes.push(reason));
    let node = findSceneNode(
      chart.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'network-node' && datum.familyInteraction.id === 'a',
    );
    const before = { x: node.cx, y: node.cy };
    assert.equal(
      hitTestScene(chart.getScene(), before.x, before.y)?.familyInteraction?.kind,
      'network-node',
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', { pointerId: 71, clientX: before.x, clientY: before.y }),
    );
    assert.equal(surface.hasPointerCapture(71), true);
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 71,
        clientX: before.x + 42,
        clientY: before.y + 28,
      }),
    );
    assert.equal(surface.hasPointerCapture(71), true);
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 71,
        clientX: before.x + 42,
        clientY: before.y + 28,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('click', { clientX: before.x + 42, clientY: before.y + 28 }),
    );
    assert.equal(chart.getNetworkRuntimeState('layer-0').positions.a.pinned, true);
    node = findSceneNode(
      chart.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'network-node' && datum.familyInteraction.id === 'a',
    );
    assert.ok(Math.hypot(node.cx - before.x, node.cy - before.y) > 20);
    surface.dispatchEvent(
      new FakePointerEvent('click', { clientX: node.cx, clientY: node.cy, ctrlKey: true }),
    );
    assert.equal(chart.getNetworkRuntimeState('layer-0').positions.a.pinned, false);

    const group = findSceneNode(
      chart.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'network-node' && datum.familyInteraction.id === 'group',
    );
    surface.dispatchEvent(
      new FakePointerEvent('click', { clientX: group.cx, clientY: group.cy, altKey: true }),
    );
    assert.deepEqual(chart.getNetworkRuntimeState('layer-0').collapsed, ['group']);
    assert.ok(
      sceneNodes(chart.getScene().root).filter(
        ({ datum }) => datum?.familyInteraction?.kind === 'network-node',
      ).length < 4,
    );

    chart.resetNetworkRuntime('layer-0');
    chart.moveNetworkNode('layer-0', 'a', { x: 0.5, y: 0.5 });
    node = findSceneNode(
      chart.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'network-node' && datum.familyInteraction.id === 'a',
    );
    const plot = node.datum.familyInteraction.plot;
    const corners = [
      { x: plot.x + plot.width * 0.35, y: plot.y + plot.height * 0.35 },
      { x: plot.x + plot.width * 0.65, y: plot.y + plot.height * 0.35 },
      { x: plot.x + plot.width * 0.65, y: plot.y + plot.height * 0.65 },
      { x: plot.x + plot.width * 0.35, y: plot.y + plot.height * 0.65 },
    ];
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 72,
        shiftKey: true,
        clientX: corners[0].x,
        clientY: corners[0].y,
      }),
    );
    corners.slice(1).forEach((point) =>
      surface.dispatchEvent(
        new FakePointerEvent('pointermove', {
          pointerId: 72,
          shiftKey: true,
          clientX: point.x,
          clientY: point.y,
        }),
      ),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 72,
        shiftKey: true,
        clientX: corners[0].x,
        clientY: corners[0].y,
      }),
    );
    assert.ok(chart.getNetworkRuntimeState('layer-0').lasso.length >= 3);
    assert.ok(
      sceneNodes(chart.getScene().root)
        .filter(({ datum }) => datum?.familyInteraction?.kind === 'network-node')
        .some(({ datum }) => datum.tooltip.selected === true),
    );
    assert.deepEqual(changes, [
      'pointer',
      'pointer',
      'pointer',
      'reset',
      'programmatic',
      'pointer',
    ]);
    assert.throws(
      () => chart.moveNetworkNode('layer-0', 'a', { x: 2, y: 0.5 }),
      /normalized x\/y/u,
    );
    assert.throws(
      () =>
        chart.setNetworkLasso('layer-0', [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ]),
      /at least three/u,
    );
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('flow node pointer drag recompiles authored positions and emits a bounded runtime event', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(environment.document);
  const chart = new Chart(
    target,
    {
      width: 440,
      height: 300,
      data: [
        { edge: 'ab', source: 'A', target: 'B', value: 8 },
        { edge: 'bc', source: 'B', target: 'C', value: 6 },
        { edge: 'bd', source: 'B', target: 'D', value: 2 },
      ],
      mark: {
        type: 'sankey',
        fields: { id: 'edge', source: 'source', target: 'target', value: 'value' },
        options: { alignment: 'justify', iterations: 4 },
      },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    registry,
    { width: 440, height: 300, autoResize: false },
  );
  try {
    const surface = renderers[0].chartSurface;
    const reasons = [];
    chart.on('flowchange', ({ reason }) => reasons.push(reason));
    let node = findSceneNode(
      chart.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'flow-node' && datum.familyInteraction.id === 'B',
    );
    const before = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    surface.dispatchEvent(
      new FakePointerEvent('pointerdown', { pointerId: 81, clientX: before.x, clientY: before.y }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 81,
        clientX: before.x + 35,
        clientY: before.y - 24,
      }),
    );
    surface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 81,
        clientX: before.x + 35,
        clientY: before.y - 24,
      }),
    );
    const state = chart.getFlowRuntimeState('layer-0');
    assert.ok(state.positions.B.x >= 0 && state.positions.B.x <= 1);
    assert.ok(state.positions.B.y >= 0 && state.positions.B.y <= 1);
    assert.doesNotThrow(() => JSON.stringify(state));
    node = findSceneNode(
      chart.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'flow-node' && datum.familyInteraction.id === 'B',
    );
    assert.ok(
      Math.hypot(node.x + node.width / 2 - before.x, node.y + node.height / 2 - before.y) > 20,
    );
    assert.deepEqual(reasons, ['pointer']);
    assert.throws(
      () => chart.moveFlowNode('layer-0', 'B', { x: -0.1, y: 0.5 }),
      /normalized x\/y/u,
    );
  } finally {
    chart.destroy();
    environment.restore();
  }
});

test('advanced family pointer gestures recompile navigator, hierarchy, and parallel scenes', () => {
  const environment = installEnvironment();
  const navigatorHarness = createHarness(environment.document, createCompleteRegistry());
  const navigator = new Chart(
    navigatorHarness.target,
    {
      width: 480,
      height: 320,
      data: Array.from({ length: 8 }, (_, time) => ({
        time,
        open: 10 + time,
        high: 13 + time,
        low: 9 + time,
        close: 12 + time,
      })),
      mark: {
        type: 'candlestick',
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        options: { navigator: true, navigatorStart: 0, navigatorEnd: 3 },
      },
      x: { field: 'time', type: 'quantitative' },
      y: { field: 'close', type: 'quantitative' },
    },
    navigatorHarness.registry,
    { width: 480, height: 320, autoResize: false },
  );
  const hierarchyHarness = createHarness(environment.document, createCompleteRegistry());
  const hierarchy = new Chart(
    hierarchyHarness.target,
    {
      width: 440,
      height: 320,
      data: [
        { id: 'root', parent: null, value: 5 },
        { id: 'a', parent: 'root', value: 3 },
        { id: 'a1', parent: 'a', value: 1 },
        { id: 'b', parent: 'root', value: 2 },
      ],
      mark: {
        type: 'tree',
        fields: { id: 'id', parent: 'parent', value: 'value' },
        options: { layout: 'circle-pack' },
      },
      x: { field: 'id', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    hierarchyHarness.registry,
    { width: 440, height: 320, autoResize: false },
  );
  const parallelHarness = createHarness(environment.document, createCompleteRegistry());
  const parallel = new Chart(
    parallelHarness.target,
    {
      width: 460,
      height: 320,
      data: [
        { a: 1, b: 10, c: 100 },
        { a: 5, b: 50, c: 500 },
        { a: 9, b: 90, c: 900 },
      ],
      mark: {
        type: 'parallel',
        options: {
          axes: [
            { field: 'a', domain: [0, 10] },
            { field: 'b', domain: [0, 100] },
            { field: 'c', domain: [0, 1000] },
          ],
        },
      },
      x: { field: 'a', type: 'quantitative' },
      y: { field: 'b', type: 'quantitative' },
    },
    parallelHarness.registry,
    { width: 460, height: 320, autoResize: false },
  );
  try {
    const navigatorReasons = [];
    navigator.on('navigatorchange', ({ reason }) => navigatorReasons.push(reason));
    const navigatorSurface = navigatorHarness.renderers[0].chartSurface;
    const windowBefore = findSceneNode(
      navigator.getScene(),
      ({ datum }) => datum?.familyInteraction?.kind === 'navigator-window',
    );
    const windowCenter = {
      x: windowBefore.x + windowBefore.width / 2,
      y: windowBefore.y + windowBefore.height / 2,
    };
    navigatorSurface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 91,
        clientX: windowCenter.x,
        clientY: windowCenter.y,
      }),
    );
    navigatorSurface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 91,
        clientX: windowCenter.x + 80,
        clientY: windowCenter.y,
      }),
    );
    navigatorSurface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 91,
        clientX: windowCenter.x + 80,
        clientY: windowCenter.y,
      }),
    );
    assert.ok(navigator.getNavigatorWindow('layer-0').start > 0);
    assert.notEqual(
      findSceneNode(
        navigator.getScene(),
        ({ datum }) => datum?.familyInteraction?.kind === 'navigator-window',
      ).x,
      windowBefore.x,
    );
    assert.deepEqual(navigatorReasons, ['pointer']);

    const hierarchyReasons = [];
    hierarchy.on('hierarchychange', ({ reason }) => hierarchyReasons.push(reason));
    const hierarchySurface = hierarchyHarness.renderers[0].chartSurface;
    const hierarchyNode = (id) =>
      findSceneNode(
        hierarchy.getScene(),
        ({ datum }) =>
          datum?.familyInteraction?.kind === 'hierarchy-node' && datum.familyInteraction.id === id,
      );
    let nodeA = hierarchyNode('a');
    hierarchySurface.dispatchEvent(
      new FakePointerEvent('click', { clientX: nodeA.cx, clientY: nodeA.cy }),
    );
    assert.deepEqual(hierarchy.getHierarchyRuntimeState('layer-0').collapsed, ['a']);
    nodeA = hierarchyNode('a');
    hierarchySurface.dispatchEvent(
      new FakePointerEvent('click', { clientX: nodeA.cx, clientY: nodeA.cy }),
    );
    nodeA = hierarchyNode('a');
    hierarchySurface.dispatchEvent(
      new FakePointerEvent('click', { clientX: nodeA.cx, clientY: nodeA.cy, shiftKey: true }),
    );
    assert.equal(hierarchy.getHierarchyRuntimeState('layer-0').root, 'a');
    const nodeA1 = hierarchyNode('a1');
    hierarchySurface.dispatchEvent(
      new FakePointerEvent('click', { clientX: nodeA1.cx, clientY: nodeA1.cy, altKey: true }),
    );
    assert.equal(hierarchy.getHierarchyRuntimeState('layer-0').zoomTo, 'a1');
    assert.deepEqual(hierarchyReasons, ['pointer', 'pointer', 'pointer', 'pointer']);

    const parallelReasons = [];
    parallel.on('parallelchange', ({ reason }) => parallelReasons.push(reason));
    const parallelSurface = parallelHarness.renderers[0].chartSurface;
    let axis = findSceneNode(
      parallel.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'parallel-axis' && datum.familyInteraction.field === 'a',
    );
    parallelSurface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 92,
        shiftKey: true,
        clientX: axis.x + axis.width / 2,
        clientY: axis.y + axis.height * 0.2,
      }),
    );
    parallelSurface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 92,
        shiftKey: true,
        clientX: axis.x + axis.width / 2,
        clientY: axis.y + axis.height * 0.7,
      }),
    );
    parallelSurface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 92,
        shiftKey: true,
        clientX: axis.x + axis.width / 2,
        clientY: axis.y + axis.height * 0.7,
      }),
    );
    parallelSurface.dispatchEvent(
      new FakePointerEvent('click', {
        shiftKey: true,
        clientX: axis.x + axis.width / 2,
        clientY: axis.y + axis.height * 0.7,
      }),
    );
    assert.equal(parallel.getParallelRuntimeState('layer-0').brushes.length, 1);
    assert.ok(
      sceneNodes(parallel.getScene().root).some(({ id }) => id.includes(':parallel-brush:a:')),
    );
    axis = findSceneNode(
      parallel.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'parallel-axis' && datum.familyInteraction.field === 'a',
    );
    parallelSurface.dispatchEvent(
      new FakePointerEvent('click', {
        altKey: true,
        clientX: axis.x + axis.width / 2,
        clientY: axis.y + axis.height / 2,
      }),
    );
    assert.equal(parallel.getParallelRuntimeState('layer-0').axes[0].invert, true);
    assert.deepEqual(parallelReasons, ['pointer', 'pointer']);
  } finally {
    parallel.destroy();
    hierarchy.destroy();
    navigator.destroy();
    environment.restore();
  }
});

test('heatmap and scatter-matrix pointer brushes update linked runtime scenes', () => {
  const environment = installEnvironment();
  const heatmapHarness = createHarness(environment.document, createCompleteRegistry());
  const heatmap = new Chart(
    heatmapHarness.target,
    {
      width: 420,
      height: 300,
      data: [
        { column: 'A', row: 'North', value: 1 },
        { column: 'B', row: 'North', value: 2 },
        { column: 'A', row: 'South', value: 3 },
        { column: 'B', row: 'South', value: 4 },
      ],
      mark: { type: 'heatmap', fields: { value: 'value' }, options: { colorMode: 'quantile' } },
      x: { field: 'column', type: 'nominal' },
      y: { field: 'row', type: 'nominal' },
    },
    heatmapHarness.registry,
    { width: 420, height: 300, autoResize: false },
  );
  const matrixHarness = createHarness(environment.document, createCompleteRegistry());
  const matrix = new Chart(
    matrixHarness.target,
    {
      width: 450,
      height: 340,
      data: [
        { a: 1, b: 10, c: 100 },
        { a: 2, b: 20, c: 200 },
        { a: 3, b: 30, c: 300 },
        { a: 4, b: 40, c: 400 },
      ],
      mark: {
        type: 'scatter-matrix',
        options: {
          variables: ['a', 'b', 'c'],
          diagonal: 'kde',
          upper: 'scatter',
          lower: 'scatter',
        },
      },
      x: { field: 'a', type: 'quantitative' },
      y: { field: 'b', type: 'quantitative' },
    },
    matrixHarness.registry,
    { width: 450, height: 340, autoResize: false },
  );
  try {
    const heatmapReasons = [];
    heatmap.on('heatmapchange', ({ reason }) => heatmapReasons.push(reason));
    const heatmapSurface = heatmapHarness.renderers[0].chartSurface;
    const cell = (row, column) =>
      findSceneNode(
        heatmap.getScene(),
        ({ datum }) =>
          datum?.familyInteraction?.kind === 'heatmap-cell' &&
          datum.familyInteraction.row === row &&
          datum.familyInteraction.column === column,
      );
    const first = cell('North', 'A');
    const last = cell('South', 'B');
    heatmapSurface.dispatchEvent(
      new FakePointerEvent('pointerdown', {
        pointerId: 93,
        clientX: first.x + first.width / 2,
        clientY: first.y + first.height / 2,
      }),
    );
    heatmapSurface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 93,
        clientX: last.x + last.width / 2,
        clientY: last.y + last.height / 2,
      }),
    );
    heatmapSurface.dispatchEvent(
      new FakePointerEvent('pointerup', {
        pointerId: 93,
        clientX: last.x + last.width / 2,
        clientY: last.y + last.height / 2,
      }),
    );
    assert.deepEqual(heatmap.getHeatmapBrush('layer-0'), {
      rows: ['North', 'South'],
      columns: ['A', 'B'],
    });
    assert.equal(
      sceneNodes(heatmap.getScene().root).filter(
        ({ datum }) => datum?.familyInteraction?.kind === 'heatmap-cell' && datum.tooltip.brushed,
      ).length,
      4,
    );
    assert.deepEqual(heatmapReasons, ['pointer']);

    const matrixReasons = [];
    matrix.on('scattermatrixchange', ({ reason }) => matrixReasons.push(reason));
    const matrixSurface = matrixHarness.renderers[0].chartSurface;
    const matrixCell = findSceneNode(
      matrix.getScene(),
      ({ datum }) =>
        datum?.familyInteraction?.kind === 'scatter-matrix-cell' &&
        datum.familyInteraction.xField === 'a' &&
        datum.familyInteraction.yField === 'b',
    );
    const matrixPoint = (rowIndex) =>
      findSceneNode(
        matrix.getScene(),
        ({ id, datum }) =>
          id.includes(':analytic-scatter-matrix-point:') &&
          datum?.tooltip?.matrixX === 'a' &&
          datum.tooltip.matrixY === 'b' &&
          datum.rowIndex === rowIndex,
      );
    const firstPoint = matrixPoint(0);
    const thirdPoint = matrixPoint(2);
    const start = { x: firstPoint.cx, y: firstPoint.cy };
    const end = { x: thirdPoint.cx, y: thirdPoint.cy };
    assert.equal(
      hitTestScene(matrix.getScene(), start.x, start.y)?.familyInteraction?.kind,
      undefined,
      'a higher-z point proves the cell-containment fallback is exercised',
    );
    matrixSurface.dispatchEvent(
      new FakePointerEvent('pointerdown', { pointerId: 94, clientX: start.x, clientY: start.y }),
    );
    matrixSurface.dispatchEvent(
      new FakePointerEvent('pointermove', { pointerId: 94, clientX: end.x, clientY: end.y }),
    );
    matrixSurface.dispatchEvent(
      new FakePointerEvent('pointerup', { pointerId: 94, clientX: end.x, clientY: end.y }),
    );
    const brush = matrix.getScatterMatrixBrush('layer-0');
    assert.ok(brush.x[1] > brush.x[0]);
    assert.ok(brush.y[1] > brush.y[0]);
    assert.ok(brush.selectedRows.length > 0);
    assert.equal(
      sceneNodes(matrix.getScene().root).filter(({ id }) =>
        id.endsWith(':analytic-scatter-matrix-linked-brush'),
      ).length,
      1,
    );
    assert.deepEqual(matrixReasons, ['pointer']);
  } finally {
    matrix.destroy();
    heatmap.destroy();
    environment.restore();
  }
});

test('technical indicator pointer crosshair synchronizes every pane and clears on leave', () => {
  const environment = installEnvironment();
  const { registry, target, renderers } = createHarness(
    environment.document,
    createCompleteRegistry(),
  );
  const rows = Array.from({ length: 36 }, (_, index) => ({
    x: index,
    open: 100 + index * 0.4,
    high: 102 + index * 0.4,
    low: 98 + index * 0.4,
    close: 101 + index * 0.4,
  }));
  const chart = new Chart(
    target,
    {
      width: 720,
      height: 620,
      data: rows,
      layers: [
        {
          id: 'price',
          mark: {
            type: 'candlestick',
            fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
          },
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'close', type: 'quantitative' },
        },
        {
          id: 'atr',
          data: rows,
          mark: {
            type: 'indicator',
            fields: { high: 'high', low: 'low', close: 'close' },
            options: { kind: 'atr', calculate: true, period: 5 },
          },
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'close', type: 'quantitative' },
        },
      ],
    },
    registry,
    { width: 720, height: 620, autoResize: false },
  );
  try {
    const surface = renderers[0].chartSurface;
    const panels = chart.getScene().metadata.technicalIndicatorPanels;
    assert.equal(panels.length, 2);
    const price = panels[0].bounds;
    surface.dispatchEvent(
      new FakePointerEvent('pointermove', {
        pointerId: 95,
        clientX: price.x + price.width * 0.55,
        clientY: price.y + price.height * 0.5,
      }),
    );
    assert.equal(chart.getScene().metadata.technicalIndicatorCrosshair.positions.length, 2);
    assert.equal(
      sceneNodes(chart.getScene().root).filter(({ id }) => id.startsWith('technical-crosshair:'))
        .length,
      2,
    );
    surface.dispatchEvent(new FakePointerEvent('pointerleave', { pointerId: 95 }));
    assert.equal(chart.getScene().metadata.technicalIndicatorCrosshair, undefined);
    assert.equal(
      sceneNodes(chart.getScene().root).filter(({ id }) => id.startsWith('technical-crosshair:'))
        .length,
      0,
    );
  } finally {
    chart.destroy();
    environment.restore();
  }
});
