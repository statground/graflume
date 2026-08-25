import assert from 'node:assert/strict';
import test from 'node:test';

import * as Graflume from '../.tmp/src/complete.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { defaultRegistry } from '../.tmp/src/runtime/default-registry.js';
import {
  annotationPrimitiveCatalog,
  annotationPrimitiveRegistry,
} from '../.tmp/src/annotation/primitives.js';
import {
  AnnotationAuthoringHistory,
  annotationAuthoringHandles,
  editAnnotationByKeyboard,
  editAnnotationByPointer,
  hitTestAnnotationHandle,
} from '../.tmp/src/interaction/annotation-authoring.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const datum = { type: 'datum', rowIndex: 0 };
const plot = { type: 'plot', x: 0.15, y: 0.2, width: 0.3, height: 0.25 };
const range = { type: 'range', x: { from: 1, to: 2 }, y: { from: 2, to: 5 } };

test('annotation primitive registry is closed and target-aware', () => {
  assert.deepEqual(
    annotationPrimitiveCatalog.map(({ id }) => id),
    ['callout', 'label', 'point', 'rule', 'band'],
  );
  annotationPrimitiveRegistry.validateTarget('point', datum);
  annotationPrimitiveRegistry.validateTarget('band', plot);
  assert.throws(
    () => annotationPrimitiveRegistry.validateTarget('point', range),
    /does not support/,
  );
  assert.equal(annotationPrimitiveRegistry.resolve('band').resizable, true);
});

test('all data-coordinate annotation primitives compile into scene geometry and authoring metadata', () => {
  const authored = {
    data: [
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ],
    mark: 'point',
    x: 'x',
    y: 'y',
    annotations: [
      { id: 'callout', primitive: 'callout', target: datum, text: 'Callout' },
      { id: 'label', primitive: 'label', target: datum, text: 'Label' },
      { id: 'point', primitive: 'point', target: datum, text: 'Point' },
      { id: 'rule', primitive: 'rule', target: range, text: 'Rule' },
      { id: 'band', primitive: 'band', target: plot, text: 'Band' },
    ],
    width: 640,
    height: 420,
  };
  assert.equal(validateSpec(JSON.parse(JSON.stringify(authored))).length, 0);
  const result = Graflume.compile(authored);
  const ids = flattenScene(result.scene.root).map(({ id }) => id);
  assert.ok(ids.includes('annotation:point:point'));
  assert.ok(ids.includes('annotation:rule:rule'));
  assert.ok(ids.includes('annotation:band:band'));
  assert.ok(ids.includes('annotation:label:bubble'));
  assert.deepEqual(
    result.scene.metadata.annotations.entries.map(({ id, primitive }) => ({ id, primitive })),
    [
      { id: 'callout', primitive: 'callout' },
      { id: 'label', primitive: 'label' },
      { id: 'point', primitive: 'point' },
      { id: 'rule', primitive: 'rule' },
      { id: 'band', primitive: 'band' },
    ],
  );
});

test('pointer handles move and resize portable annotation state', () => {
  const bounds = { x: 100, y: 80, width: 160, height: 70 };
  assert.equal(annotationAuthoringHandles(bounds).length, 9);
  assert.equal(hitTestAnnotationHandle(bounds, 260, 150), 'south-east');
  assert.equal(hitTestAnnotationHandle(bounds, 150, 100), 'move');

  const annotation = { id: 'a', primitive: 'callout', target: datum, text: 'Editable' };
  const moved = editAnnotationByPointer({
    annotation,
    handle: 'move',
    deltaX: 13,
    deltaY: -7,
    bounds,
    grid: 5,
  });
  assert.deepEqual([moved.offsetX, moved.offsetY], [15, -5]);
  const resized = editAnnotationByPointer({
    annotation: moved,
    handle: 'east',
    deltaX: 35,
    deltaY: 0,
    bounds,
  });
  assert.equal(resized.style.maxWidth, 195);
  assert.equal(resized.offsetX, 32.5);
});

test('keyboard authoring and bounded undo/redo preserve portable state', () => {
  const annotation = { id: 'a', target: datum, text: 'Keyboard' };
  const moved = editAnnotationByKeyboard({
    annotation,
    key: 'ArrowRight',
    step: 2,
    coarse: true,
  });
  assert.equal(moved.offsetX, 20);
  const resized = editAnnotationByKeyboard({
    annotation: moved,
    key: 'ArrowLeft',
    step: 10,
    resize: true,
  });
  assert.equal(resized.style.maxWidth, 210);

  const history = new AnnotationAuthoringHistory([annotation], 2);
  assert.equal(history.replace([moved]), true);
  assert.equal(history.replace([resized]), true);
  assert.equal(history.undo(), true);
  assert.equal(history.annotations()[0].offsetX, 20);
  assert.equal(history.redo(), true);
  assert.equal(history.annotations()[0].style.maxWidth, 210);
});

test('active annotation compiles visible resize handles', () => {
  const base = {
    data: [{ x: 1, y: 2 }],
    mark: 'point',
    x: 'x',
    y: 'y',
    annotations: [{ id: 'editable', target: datum, text: 'Editable' }],
  };
  const result = compileWithRegistry(
    base,
    defaultRegistry,
    {},
    {
      annotations: base.annotations,
      activeAnnotationId: 'editable',
    },
  );
  const ids = flattenScene(result.scene.root).map(({ id }) => id);
  assert.ok(ids.includes('annotation:editable:authoring-outline'));
  assert.equal(ids.filter((id) => id.startsWith('annotation:editable:handle:')).length, 8);
  assert.equal(result.scene.metadata.annotations.activeId, 'editable');
});
