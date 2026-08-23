import assert from 'node:assert/strict';
import test from 'node:test';

import { createSpatial } from '../.tmp/src/spatial.js';

class FakeElement extends EventTarget {
  constructor(tagName, ownerDocument, webgl = null) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.webgl = webgl;
    this.attributes = new Map();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.parentNode = null;
    this.textContent = '';
    this.width = 0;
    this.height = 0;
    this.boundsReadCount = 0;
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this.append(...children);
  }

  remove() {
    if (this.parentNode === null) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  getBoundingClientRect() {
    this.boundsReadCount += 1;
    if (this.dataset.graflumeSpatialAnnotation !== undefined) {
      this.ownerDocument.annotationBoundsReadCount += 1;
    }
    return { left: 0, top: 0, width: 480, height: 320 };
  }

  getContext(type) {
    if (this.tagName !== 'CANVAS') return null;
    if (type === '2d') return null;
    return this.webgl;
  }

  toDataURL() {
    return 'data:image/png;base64,ZmFrZQ==';
  }

  click() {}

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

class FakeDocument extends EventTarget {
  constructor(webgl) {
    super();
    this.webgl = webgl;
    this.fullscreenElement = null;
    this.activeElement = null;
    this.annotationBoundsReadCount = 0;
  }

  createElement(tagName) {
    return new FakeElement(tagName, this, tagName === 'canvas' ? this.webgl : null);
  }

  createElementNS(_namespace, tagName) {
    return this.createElement(tagName);
  }

  querySelector() {
    return null;
  }
}

class FakePointerEvent extends Event {
  constructor(type, init = {}) {
    super(type, init);
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
    this.button = init.button ?? 0;
    this.buttons = init.buttons ?? 0;
    this.shiftKey = init.shiftKey ?? false;
  }
}

function fakeWebGL() {
  const value = {
    failInitialization: false,
    shaderSources: [],
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    ELEMENT_ARRAY_BUFFER: 6,
    STATIC_DRAW: 7,
    FLOAT: 8,
    UNSIGNED_SHORT: 9,
    UNSIGNED_INT: 10,
    POINTS: 11,
    LINES: 12,
    TRIANGLES: 13,
    COLOR_BUFFER_BIT: 14,
    DEPTH_BUFFER_BIT: 16,
    DEPTH_TEST: 17,
    LEQUAL: 18,
    CULL_FACE: 19,
    BLEND: 20,
    SRC_ALPHA: 21,
    ONE_MINUS_SRC_ALPHA: 22,
    createShader: () => (value.failInitialization ? null : {}),
    shaderSource(_shader, source) {
      value.shaderSources.push(source);
    },
    compileShader() {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => null,
    deleteShader() {},
    createProgram: () => ({}),
    attachShader() {},
    linkProgram() {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => null,
    deleteProgram() {},
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    createBuffer: () => ({}),
    bindBuffer() {},
    bufferData() {},
    viewport() {},
    clearColor() {},
    clear() {},
    enable() {},
    disable() {},
    depthFunc() {},
    blendFunc() {},
    useProgram() {},
    uniformMatrix4fv() {},
    uniform3f() {},
    uniform1f() {},
    depthMask() {},
    enableVertexAttribArray() {},
    vertexAttribPointer() {},
    drawArrays() {},
    drawElements() {},
    deleteBuffer() {},
  };
  return value;
}

function installDom(webgl) {
  const previous = new Map();
  for (const name of ['document', 'window', 'ResizeObserver', 'PointerEvent'])
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  const document = new FakeDocument(webgl);
  const window = new EventTarget();
  window.devicePixelRatio = 1;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'PointerEvent', {
    configurable: true,
    value: FakePointerEvent,
  });
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

function walk(element) {
  return [element, ...element.children.flatMap((child) => walk(child))];
}

function spatialSpec(labels = {}) {
  return {
    ariaLabel: '지역별 기온 입체 지도',
    interaction: { labels },
    layers: [
      {
        mark: { type: 'scatter' },
        data: { positions: [[0, 0, 0]], labels: ['서울'] },
      },
    ],
  };
}

test('localized labels keep the canvas name specific and replace renderer error copy', () => {
  const environment = installDom(null);
  try {
    const target = environment.document.createElement('div');
    const chart = createSpatial(
      target,
      spatialSpec({
        chart: '공간 차트',
        toolbar: '입체 차트 제어',
        instructions: '드래그하여 회전하고 화살표 키로 이동합니다.',
        contextLost: '그래픽 문맥을 복원하고 있습니다.',
        unavailable: '이 환경에서는 입체 차트를 표시할 수 없습니다.',
      }),
      { width: 480, height: 320, autoResize: false },
    );
    const elements = walk(target);
    const canvas = elements.find(({ dataset }) => dataset.graflumeSpatialSurface === 'true');
    const toolbar = elements.find(({ dataset }) => dataset.graflumeSpatialControls === 'true');
    const fallback = elements.find(({ dataset }) => dataset.graflumeSpatialFallback === 'true');
    assert.equal(canvas.getAttribute('aria-label'), '지역별 기온 입체 지도');
    assert.match(canvas.getAttribute('aria-description'), /드래그하여 회전/);
    assert.equal(toolbar.getAttribute('aria-label'), '입체 차트 제어');
    assert.equal(fallback.textContent, '이 환경에서는 입체 차트를 표시할 수 없습니다.');
    assert.equal(
      elements.some(({ dataset }) => dataset.graflumeSpatialSelectionStatus === 'true'),
      false,
    );
    assert.deepEqual(chart.getAvailability(), {
      status: 'unavailable',
      available: false,
      message: '이 환경에서는 입체 차트를 표시할 수 없습니다.',
    });

    const changes = [];
    chart.on('availabilitychange', ({ state }) => changes.push(state));
    chart.setSpec(
      spatialSpec({
        chart: '공간 차트',
        toolbar: '새 입체 차트 제어',
        instructions: '키보드로도 탐색할 수 있습니다.',
        contextLost: '새 그래픽 문맥 복원 안내',
        unavailable: '새 입체 차트 미지원 안내',
      }),
    );
    assert.equal(toolbar.getAttribute('aria-label'), '새 입체 차트 제어');
    assert.equal(fallback.textContent, '새 입체 차트 미지원 안내');
    assert.equal(changes.at(-1).message, '새 입체 차트 미지원 안내');
    chart.destroy();
    assert.deepEqual(chart.getAvailability(), { status: 'destroyed', available: false });
  } finally {
    environment.restore();
  }
});

test('availability distinguishes ready, context loss, and restored rendering', () => {
  const webgl = fakeWebGL();
  const environment = installDom(webgl);
  try {
    const target = environment.document.createElement('div');
    const chart = createSpatial(
      target,
      spatialSpec({
        contextLost: '그래픽 문맥 복원 중',
        unavailable: '그래픽 가속을 다시 시작할 수 없습니다.',
      }),
      { width: 480, height: 320, autoResize: false },
    );
    const canvas = walk(target).find(({ dataset }) => dataset.graflumeSpatialSurface === 'true');
    assert.deepEqual(chart.getAvailability(), { status: 'ready', available: true });
    const fragmentShader = webgl.shaderSources.find((source) => source.includes('gl_PointCoord'));
    assert.match(fragmentShader, /sqrt\(max\(0\.0, 1\.0 - radiusSquared\)\)/);
    assert.match(fragmentShader, /coverage < 0\.04/);
    assert.match(fragmentShader, /v_color\.a >= 0\.999/);
    assert.match(fragmentShader, /gl_FrontFacing/);

    const states = [];
    chart.on('availabilitychange', ({ state }) => states.push(state.status));
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    assert.deepEqual(chart.getAvailability(), {
      status: 'context-lost',
      available: false,
      message: '그래픽 문맥 복원 중',
    });
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    assert.deepEqual(chart.getAvailability(), { status: 'ready', available: true });

    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    webgl.failInitialization = true;
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    assert.deepEqual(chart.getAvailability(), {
      status: 'unavailable',
      available: false,
      message: '그래픽 가속을 다시 시작할 수 없습니다.',
    });
    assert.deepEqual(states, ['context-lost', 'ready', 'context-lost', 'unavailable']);
    chart.destroy();
  } finally {
    environment.restore();
  }
});

test('spatial legends, projected decorations, selection, and annotation APIs share transient lifecycle', () => {
  const environment = installDom(null);
  try {
    const target = environment.document.createElement('div');
    const spec = {
      interaction: { controls: false, selection: { key: 'label' } },
      legend: { mode: 'layers', interactive: true },
      highlights: [{ id: 'region', target: { type: 'box', min: [-1, -1, -1], max: [1, 1, 1] } }],
      annotations: [
        { id: 'origin', target: { type: 'point', position: [0, 0, 0] }, text: 'Origin' },
      ],
      layers: [
        {
          id: 'observed',
          name: 'Observed',
          mark: { type: 'scatter', color: '#2563eb' },
          data: { positions: [[0, 0, 0]], labels: ['A'] },
        },
        {
          id: 'forecast',
          name: 'Forecast',
          mark: { type: 'scatter', color: '#f97316' },
          data: { positions: [[1, 1, 1]], labels: ['B'] },
        },
      ],
    };
    const chart = createSpatial(target, spec, { width: 480, height: 320, autoResize: false });
    const legendReasons = [];
    const selectionReasons = [];
    const annotationReasons = [];
    chart.on('legendchange', ({ reason }) => legendReasons.push(reason));
    chart.on('selectionchange', ({ reason }) => selectionReasons.push(reason));
    chart.on('annotationchange', ({ reason }) => annotationReasons.push(reason));

    assert.equal(chart.getLegendState().items.length, 2);
    assert.equal(chart.getLegendState().items[0].symbol, 'point');
    const observed = chart.getLegendState().items.find(({ layerId }) => layerId === 'observed');
    const button = walk(target).find(
      (element) => element.dataset.graflumeSpatialLegendItem === observed.id,
    );
    button.focus();
    button.dispatchEvent(new Event('click'));
    const restoredButton = walk(target).find(
      (element) => element.dataset.graflumeSpatialLegendItem === observed.id,
    );
    assert.equal(environment.document.activeElement, restoredButton);
    assert.equal(chart.getLegendState().items.find(({ id }) => id === observed.id).visible, false);
    assert.deepEqual(legendReasons, ['toggle']);
    chart.resetLegend();
    assert.deepEqual(legendReasons, ['toggle', 'reset']);

    chart.setSelection([{ type: 'datum', layerId: 'observed', field: 'label', value: 'A' }]);
    assert.equal(chart.getSelection().items.length, 1);
    assert.throws(
      () =>
        chart.setSelection([
          { type: 'datum', layerId: 'observed', datumIndex: 0 },
          { type: 'datum', layerId: 'forecast', datumIndex: 0 },
        ]),
      /at most one/,
    );
    const live = walk(target).find(
      (element) => element.dataset.graflumeSpatialSelectionStatus === 'true',
    );
    const liveText = live.textContent;
    chart.render();
    assert.equal(
      walk(target).find((element) => element.dataset.graflumeSpatialSelectionStatus === 'true'),
      live,
    );
    assert.equal(live.textContent, liveText);
    chart.clearSelection();
    assert.deepEqual(selectionReasons, ['programmatic', 'clear']);

    const id = chart.addAnnotation({
      target: { type: 'point', position: [0.5, 0.5, 0.5] },
      text: '<strong>plain text only</strong>',
    });
    chart.updateAnnotation(id, { detail: 'safe detail' });
    assert.equal(chart.removeAnnotation(id), true);
    assert.deepEqual(annotationReasons, ['add', 'update', 'remove']);
    assert.equal(chart.getSpec(), spec);
    assert.ok(walk(target).some(({ dataset }) => dataset.graflumeSpatialOverlays === 'true'));
    const canvas = walk(target).find(({ dataset }) => dataset.graflumeSpatialSurface === 'true');
    assert.match(canvas.getAttribute('aria-description'), /Observed/);
    chart.destroy();
  } finally {
    environment.restore();
  }
});

test('spatial constructor rolls back a wrapper appended before a later target failure', () => {
  const environment = installDom(null);
  try {
    const target = environment.document.createElement('div');
    const append = target.append.bind(target);
    target.append = (...children) => {
      append(...children);
      throw new Error('host append failed');
    };
    assert.throws(
      () => createSpatial(target, spatialSpec(), { width: 480, height: 320, autoResize: false }),
      /host append failed/,
    );
    assert.equal(target.children.length, 0);
  } finally {
    environment.restore();
  }
});

test('spatial legend external positions reserve a plot rail while inside positions overlay it', () => {
  const environment = installDom(null);
  try {
    const positions = [
      'top',
      'right',
      'bottom',
      'left',
      'inside-top-left',
      'inside-top-right',
      'inside-bottom-left',
      'inside-bottom-right',
    ];
    for (const position of positions) {
      const target = environment.document.createElement('div');
      const chart = createSpatial(
        target,
        { ...spatialSpec(), legend: { position, mode: 'layers' } },
        { width: 480, height: 320, autoResize: false },
      );
      const elements = walk(target);
      const canvas = elements.find(({ dataset }) => dataset.graflumeSpatialSurface === 'true');
      const legend = elements.find(({ dataset }) => dataset.graflumeSpatialLegend === 'true');
      const left = Number.parseFloat(canvas.style.left);
      const top = Number.parseFloat(canvas.style.top);
      const width = Number.parseFloat(canvas.style.width);
      const height = Number.parseFloat(canvas.style.height);
      if (position === 'top') {
        assert.ok(top > 0);
        assert.ok(Number.parseFloat(legend.style.maxHeight) <= top);
      } else if (position === 'bottom') {
        assert.ok(height < 320);
        assert.ok(Number.parseFloat(legend.style.top) >= height);
      } else if (position === 'left') {
        assert.ok(left > 0);
        assert.ok(Number.parseFloat(legend.style.maxWidth) <= left);
      } else if (position === 'right') {
        assert.ok(width < 480);
        assert.ok(Number.parseFloat(legend.style.left) >= width);
      } else {
        assert.deepEqual(
          { left, top, width, height },
          { left: 0, top: 0, width: 480, height: 320 },
        );
      }
      chart.destroy();
    }
  } finally {
    environment.restore();
  }
});

test('spatial callout measurements invalidate when a same-size external legend changes plot bounds', () => {
  const environment = installDom(null);
  try {
    const target = environment.document.createElement('div');
    const annotation = {
      id: 'layout-note',
      target: { type: 'point', position: [0, 0, 0] },
      text: 'A long annotation whose wrapping responds to the remaining spatial plot width',
    };
    const base = {
      ...spatialSpec(),
      interaction: { controls: false },
      legend: { position: 'inside-top-right', mode: 'layers' },
      annotations: [annotation],
    };
    const chart = createSpatial(target, base, {
      width: 480,
      height: 320,
      autoResize: false,
    });
    assert.ok(environment.document.annotationBoundsReadCount > 0);

    const beforeRight = environment.document.annotationBoundsReadCount;
    chart.setSpec({ ...base, legend: { position: 'right', mode: 'layers' } });
    assert.ok(environment.document.annotationBoundsReadCount > beforeRight);

    const beforeTop = environment.document.annotationBoundsReadCount;
    chart.setSpec({ ...base, legend: { position: 'top', mode: 'layers' } });
    assert.ok(environment.document.annotationBoundsReadCount > beforeTop);
    chart.destroy();
  } finally {
    environment.restore();
  }
});

test('spatial callouts stay within a tiny real plot viewport', () => {
  const environment = installDom(null);
  try {
    const target = environment.document.createElement('div');
    const chart = createSpatial(
      target,
      {
        ...spatialSpec(),
        interaction: { controls: false },
        annotations: [
          {
            id: 'tiny',
            target: { type: 'point', position: [0, 0, 0] },
            text: 'A long callout in a tiny viewport',
          },
        ],
      },
      { width: 12, height: 10, autoResize: false },
    );
    const bubble = walk(target).find(({ dataset }) => dataset.graflumeSpatialAnnotation === 'tiny');
    const left = Number.parseFloat(bubble.style.left);
    const width = Number.parseFloat(bubble.style.width);
    const top = Number.parseFloat(bubble.style.top);
    assert.ok(left >= 0 && left + width <= 12);
    assert.ok(top >= 0);
    assert.ok(Number.parseFloat(bubble.style.maxHeight) <= 10);
    chart.destroy();
  } finally {
    environment.restore();
  }
});

test('spatial layer legend hide removes fallback picks and projected decorations until reset', () => {
  const environment = installDom(null);
  try {
    const target = environment.document.createElement('div');
    const chart = createSpatial(
      target,
      {
        interaction: { controls: false },
        legend: { mode: 'layers', position: 'inside-bottom-left', interactive: true },
        highlights: [{ id: 'point', target: { type: 'layer', layerId: 'points' } }],
        annotations: [
          { id: 'point-note', target: { type: 'layer', layerId: 'points' }, text: 'Point' },
        ],
        layers: [
          {
            id: 'points',
            mark: { type: 'scatter' },
            data: { positions: [[0, 0, 0]], labels: ['origin'] },
          },
        ],
      },
      { width: 480, height: 320, autoResize: false },
    );
    const canvas = walk(target).find(({ dataset }) => dataset.graflumeSpatialSurface === 'true');
    const hits = [];
    chart.on('click', ({ hit }) => hits.push(hit));
    const clickCenter = () =>
      canvas.dispatchEvent(new FakePointerEvent('click', { clientX: 240, clientY: 160 }));
    const decorationCount = () =>
      walk(target).filter(
        ({ dataset }) =>
          dataset.graflumeSpatialHighlight === 'point' ||
          dataset.graflumeSpatialAnnotation === 'point-note',
      ).length;
    assert.equal(decorationCount(), 2);
    clickCenter();
    assert.notEqual(hits.at(-1), null);
    const item = chart.getLegendState().items[0];
    chart.setLegendItemVisible(item.id, false);
    assert.equal(decorationCount(), 0);
    clickCenter();
    assert.equal(hits.at(-1), null);
    chart.resetLegend();
    assert.equal(decorationCount(), 2);
    clickCenter();
    assert.notEqual(hits.at(-1), null);
    chart.destroy();
  } finally {
    environment.restore();
  }
});

test('spatial multiple selection is independent of authored highlight limits and keeps compound keys', () => {
  const environment = installDom(null);
  try {
    const target = environment.document.createElement('div');
    const chart = createSpatial(
      target,
      {
        interaction: { controls: false, selection: { mode: 'multiple' } },
        highlights: Array.from({ length: 256 }, (_, index) => ({
          id: index === 0 ? 'selection-check-0' : `authored-${index}`,
          target: { type: 'point', position: [index, 0, 0] },
        })),
        layers: [
          {
            id: 'points',
            mark: { type: 'scatter' },
            data: {
              positions: [
                [0, 0, 0],
                [1, 0, 0],
              ],
              labels: ['A', 'A'],
            },
          },
        ],
      },
      { width: 480, height: 320, autoResize: false },
    );
    chart.setSelection([
      { type: 'datum', layerId: 'points', datumIndex: 0, field: 'label', value: 'A' },
      { type: 'datum', layerId: 'points', datumIndex: 1, field: 'label', value: 'A' },
    ]);
    assert.equal(chart.getSelection().items.length, 2);
    assert.throws(
      () =>
        chart.setSelection([
          { type: 'datum', datumIndex: [0, 1], field: 'label', values: ['A', 'B'] },
          { type: 'datum', datumIndex: [1, 0], field: 'label', values: ['B', 'A'] },
        ]),
      /unique/,
    );
    chart.destroy();
  } finally {
    environment.restore();
  }
});
