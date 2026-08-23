import test from 'node:test';
import assert from 'node:assert/strict';

import { collectAxisTooltipTargets } from '../.tmp/src/compiler/axis-tooltip.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { CanvasRenderer } from '../.tmp/src/renderer/canvas.js';

function compoundPath() {
  return {
    id: 'map:compound',
    type: 'path',
    zIndex: 0,
    opacity: 1,
    visible: true,
    interactive: true,
    datum: {
      layerId: 'map',
      rowIndex: 0,
      datum: { country: 'Compound' },
    },
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
    subpaths: [
      [
        { x: 30, y: 30 },
        { x: 70, y: 30 },
        { x: 70, y: 70 },
        { x: 30, y: 70 },
      ],
      [
        { x: 120, y: 0 },
        { x: 160, y: 0 },
        { x: 160, y: 40 },
        { x: 120, y: 40 },
      ],
    ],
    closed: true,
    fill: '#4f46e5',
    fillRule: 'evenodd',
    stroke: '#111827',
    lineWidth: 1,
  };
}

function sceneWith(node) {
  return {
    width: 200,
    height: 120,
    background: '#ffffff',
    root: {
      id: 'root',
      type: 'group',
      zIndex: 0,
      opacity: 1,
      visible: true,
      children: [node],
    },
    accessibility: { label: 'Compound path test' },
    metadata: {
      rowCount: 1,
      renderedNodeCount: 1,
      performanceProfile: 'standard',
      hitTestingEnabled: true,
    },
  };
}

test('compound path hit testing applies even-odd containment and measures every ring', () => {
  const scene = sceneWith(compoundPath());

  assert.equal(hitTestScene(scene, 10, 10, 0)?.datum.country, 'Compound');
  assert.equal(hitTestScene(scene, 50, 50, 19), null);
  assert.equal(hitTestScene(scene, 50, 50, 20)?.distance, 20);
  assert.equal(hitTestScene(scene, 130, 10, 0)?.datum.country, 'Compound');
  assert.equal(hitTestScene(scene, -1, 50, 1)?.distance, 1);
});

test('axis tooltip targets use the bounds of the primary path and every subpath', () => {
  const node = compoundPath();
  const targets = collectAxisTooltipTargets({
    axis: 'x',
    layerGroups: [sceneWith(node).root],
    scales: { layers: [] },
    plot: { x: 0, y: 0, width: 200, height: 120 },
    performance: { enableHitTesting: true, maxPointMarks: 100 },
  });

  assert.equal(targets.length, 1);
  assert.equal(targets[0].x, 80);
  assert.equal(targets[0].y, 50);
});

test('canvas renderer emits one compound path and uses its explicit fill rule', () => {
  const operations = [];
  const context = {
    globalAlpha: 1,
    save() {},
    restore() {},
    setTransform() {},
    translate(x, y) {
      operations.push(['translate', x, y]);
    },
    scale(x, y) {
      operations.push(['scale', x, y]);
    },
    clearRect() {},
    fillRect() {},
    beginPath() {
      operations.push(['beginPath']);
    },
    moveTo(x, y) {
      operations.push(['moveTo', x, y]);
    },
    lineTo(x, y) {
      operations.push(['lineTo', x, y]);
    },
    closePath() {
      operations.push(['closePath']);
    },
    setLineDash(value) {
      operations.push(['setLineDash', value]);
    },
    fill(rule) {
      operations.push(['fill', rule]);
    },
    stroke() {
      operations.push(['stroke']);
    },
  };
  const canvas = {
    dataset: {},
    style: {},
    setAttribute() {},
    getContext: () => context,
    toDataURL: () => 'data:image/png;base64,',
  };
  const root = {
    dataset: {},
    style: {},
    append() {},
    remove() {},
  };
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return tagName === 'canvas' ? canvas : root;
    },
  };

  try {
    const renderer = new CanvasRenderer();
    renderer.mount(
      { append() {} },
      { width: 200, height: 120, pixelRatio: 1, ariaLabel: 'Compound path test' },
    );
    renderer.render(sceneWith(compoundPath()));

    assert.deepEqual(
      operations.filter(([operation]) => operation === 'moveTo'),
      [
        ['moveTo', 0, 0],
        ['moveTo', 30, 30],
        ['moveTo', 120, 0],
      ],
    );
    assert.equal(operations.filter(([operation]) => operation === 'closePath').length, 3);
    assert.deepEqual(
      operations.find(([operation]) => operation === 'fill'),
      ['fill', 'evenodd'],
    );

    operations.length = 0;
    renderer.setInspectionView({ zoom: 2, offsetX: -20, offsetY: -10 });
    renderer.render(sceneWith(compoundPath()));
    assert.deepEqual(operations.slice(0, 2), [
      ['translate', -20, -10],
      ['scale', 2, 2],
    ]);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
