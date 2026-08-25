import test from 'node:test';
import assert from 'node:assert/strict';

import { hitTestAxisTooltip } from '../.tmp/src/interaction/axis-hit-test.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
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
    this.chartSurface = target.ownerDocument.createElement('canvas');
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

function createHarness(document) {
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

function closeEnough(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);
}
