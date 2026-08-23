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
}

class FakeDocument extends EventTarget {
  constructor(webgl) {
    super();
    this.webgl = webgl;
    this.fullscreenElement = null;
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
  for (const name of ['document', 'window', 'ResizeObserver'])
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  const document = new FakeDocument(webgl);
  const window = new EventTarget();
  window.devicePixelRatio = 1;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: undefined });
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
