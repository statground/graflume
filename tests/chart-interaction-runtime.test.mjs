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

  get options() {
    return this.children.filter(({ tagName }) => tagName === 'OPTION');
  }
}

class FakeDocument extends TrackedEventTarget {
  constructor() {
    super();
    this.hidden = false;
    this.fullscreenElement = null;
    this.body = new FakeElement('body', this);
  }

  createElement(tagName) {
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

function byAria(root, label) {
  return walk(root).find((element) => element.getAttribute('aria-label') === label);
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
    const loop = byAria(renderer.host, '<img src=x onerror=alert(1)>');
    assert.notEqual(loop, undefined);
    assert.equal(loop.textContent, '↻');
    assert.equal(loop.children.length, 0);
    assert.equal(loop.getAttribute('aria-pressed'), 'false');
    const status = walk(toolbar).find((element) => element.getAttribute('aria-live') === 'polite');
    assert.notEqual(status, undefined);

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

    const seek = byAria(renderer.host, 'Playback position');
    assert.equal(seek.getAttribute('aria-valuetext'), 'Q3');

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

test('reduced motion blocks autoplay and an existing motion frame selects the initial index', () => {
  const environment = installEnvironment({ reducedMotion: true });
  const { registry, target } = createHarness(environment.document);
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
      interaction: { playback: { field: 'period', autoplay: true } },
    },
    registry,
    { width: 240, height: 160, autoResize: false },
  );

  try {
    assert.equal(chart.getPlaybackState().index, 1);
    assert.equal(chart.getPlaybackState().frame, 'Q2');
    assert.equal(chart.getPlaybackState().playing, false);
    assert.equal(environment.pendingFrames(), 0);
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
