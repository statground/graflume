import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '../.tmp/src/index.js';
import {
  automaticScatterWebGLThreshold,
  quickScatter,
  resolveScatterRendererDispatch,
} from '../.tmp/src/api/scatter-dispatch.js';
import { ScatterWebGLRenderer } from '../.tmp/src/renderer/scatter-webgl.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';

test('chart-oriented scatter dispatcher honors explicit renderers and automatic threshold', () => {
  const small = Array.from({ length: 10 }, (_, index) => ({ x: index, y: index }));
  const large = {
    columns: {
      x: new Float64Array(automaticScatterWebGLThreshold),
      y: new Float64Array(automaticScatterWebGLThreshold),
    },
  };
  assert.deepEqual(resolveScatterRendererDispatch(small), {
    renderer: 'canvas',
    reason: 'small',
    rowCount: 10,
    threshold: automaticScatterWebGLThreshold,
  });
  assert.deepEqual(resolveScatterRendererDispatch(large), {
    renderer: 'webgl',
    reason: 'threshold',
    rowCount: automaticScatterWebGLThreshold,
    threshold: automaticScatterWebGLThreshold,
  });
  assert.equal(resolveScatterRendererDispatch(small, 'webgl').reason, 'explicit-webgl');
  assert.deepEqual(resolveScatterRendererDispatch(small, 'svg'), {
    renderer: 'svg',
    reason: 'explicit-renderer',
    rowCount: 10,
    threshold: automaticScatterWebGLThreshold,
  });
  assert.equal(resolveScatterRendererDispatch(large, 'canvas').reason, 'explicit-canvas');
  assert.ok(createDefaultRegistry().capabilities().renderers.includes('webgl'));

  const authored = [];
  const factory = (_target, spec) => {
    authored.push(spec);
    return {};
  };
  quickScatter(factory, {}, large, { x: 'x', y: 'y' });
  quickScatter(factory, {}, small, { x: 'x', y: 'y', renderer: 'webgl' });
  quickScatter(factory, {}, small, { x: 'x', y: 'y', renderer: 'svg' });
  assert.deepEqual(
    authored.map(({ mark, renderer }) => [mark.type, renderer]),
    [
      ['point', 'webgl'],
      ['point', 'webgl'],
      ['point', 'svg'],
    ],
  );
});

test('hybrid Chart renderer issues actual WebGL POINTS and leaves Canvas axes intact', (context) => {
  const scene = compile({
    width: 320,
    height: 220,
    data: [
      { x: 1, y: 3, shape: 'circle' },
      { x: 2, y: 1, shape: 'square' },
      { x: 3, y: 2, shape: 'triangle' },
      { x: 4, y: 4, shape: 'diamond' },
      { x: 5, y: 2.5, shape: 'cross' },
    ],
    mark: 'point',
    encoding: { x: 'x', y: 'y', shape: 'shape' },
  }).scene;
  const canvasOperations = [];
  const drawingContext = new Proxy(
    { globalAlpha: 1 },
    {
      get(target, property) {
        if (property in target) return target[property];
        return (...args) => canvasOperations.push([property, ...args]);
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    },
  );
  const draws = [];
  let attribute = 0;
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STREAM_DRAW: 6,
    FLOAT: 7,
    COLOR_BUFFER_BIT: 8,
    DEPTH_BUFFER_BIT: 16,
    BLEND: 17,
    DEPTH_TEST: 18,
    SRC_ALPHA: 19,
    ONE_MINUS_SRC_ALPHA: 20,
    LEQUAL: 21,
    POINTS: 22,
    createShader: () => ({}),
    shaderSource() {},
    compileShader() {},
    getShaderParameter: () => true,
    deleteShader() {},
    createProgram: () => ({}),
    attachShader() {},
    linkProgram() {},
    getProgramParameter: () => true,
    deleteProgram() {},
    createBuffer: () => ({}),
    bindBuffer() {},
    bufferData() {},
    getAttribLocation: () => attribute++,
    enableVertexAttribArray() {},
    vertexAttribPointer() {},
    getUniformLocation: () => ({}),
    uniform2f() {},
    viewport() {},
    clearColor() {},
    clear() {},
    useProgram() {},
    enable() {},
    blendFunc() {},
    depthFunc() {},
    drawArrays(...args) {
      draws.push(args);
    },
    deleteBuffer() {},
  };
  const root = {
    dataset: {},
    style: {},
    children: [],
    ownerDocument: null,
    append(node) {
      this.children.push(node);
    },
    remove() {},
  };
  let canvasIndex = 0;
  const document = {
    createElement(tagName) {
      if (tagName !== 'canvas') {
        root.ownerDocument = document;
        return root;
      }
      const index = canvasIndex++;
      return {
        dataset: {},
        style: {},
        width: 0,
        height: 0,
        ownerDocument: document,
        setAttribute() {},
        getContext: (name) =>
          index === 0 && name === '2d'
            ? drawingContext
            : index === 1 && name.startsWith('webgl')
              ? gl
              : null,
        toDataURL: () => 'data:image/png;base64,',
        remove() {},
      };
    },
  };
  const previousDocument = globalThis.document;
  context.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  globalThis.document = document;

  const renderer = new ScatterWebGLRenderer();
  renderer.mount(
    { append() {} },
    { width: scene.width, height: scene.height, pixelRatio: 2, ariaLabel: 'GPU scatter' },
  );
  renderer.render(scene);
  assert.deepEqual(renderer.dispatchState(), { renderer: 'webgl', pointCount: 5, reason: 'gpu' });
  assert.deepEqual(draws, [[gl.POINTS, 0, 5]]);
  assert.equal(
    canvasOperations.filter(([operation]) => operation === 'arc').length,
    0,
    'GPU point nodes must not be duplicated on the Canvas plane',
  );

  const cssPaintScene = compile({
    width: 320,
    height: 220,
    data: [{ x: 1, y: 2 }],
    mark: { type: 'point', fill: 'red' },
    encoding: { x: 'x', y: 'y' },
  }).scene;
  renderer.render(cssPaintScene);
  assert.deepEqual(renderer.dispatchState(), {
    renderer: 'canvas',
    pointCount: 1,
    reason: 'unavailable',
  });
  assert.deepEqual(draws, [[gl.POINTS, 0, 5]], 'unsupported CSS paint must not reach GPU upload');
  assert.ok(
    canvasOperations.some(([operation]) => operation === 'arc'),
    'the authored CSS paint remains on the semantic Canvas path',
  );
  renderer.destroy();
  assert.equal(renderer.dispatchState().reason, 'destroyed');
});
