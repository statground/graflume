import test from 'node:test';
import assert from 'node:assert/strict';

import { easeSceneProgress, interpolateScene } from '../.tmp/src/scene/interpolate.js';

function base(id, datum) {
  return {
    id,
    zIndex: 1,
    opacity: 1,
    visible: true,
    ...(datum === undefined ? {} : { datum }),
  };
}

function scene(children, background = '#ffffff') {
  return {
    width: 320,
    height: 200,
    background,
    root: { type: 'group', ...base('scene:root'), children },
    accessibility: { label: 'Transition test' },
    metadata: {
      rowCount: children.length,
      renderedNodeCount: children.length,
      performanceProfile: 'standard',
      hitTestingEnabled: true,
    },
  };
}

test('stable datum keys morph geometry, numeric style, and color across filtered row indices', () => {
  const previousDatum = {
    layerId: 'motion',
    rowIndex: 0,
    datum: { group: 'A', time: '2025' },
  };
  const nextDatum = {
    layerId: 'motion',
    rowIndex: 1,
    datum: { group: 'A', time: '2026' },
  };
  const previous = scene([
    {
      type: 'circle',
      ...base('motion:bubble:0', previousDatum),
      cx: 20,
      cy: 40,
      radius: 5,
      fill: '#000',
      stroke: 'rgba(0, 0, 0, 0.5)',
      lineWidth: 1,
    },
  ]);
  const next = scene([
    {
      type: 'circle',
      ...base('motion:bubble:1', nextDatum),
      cx: 80,
      cy: 100,
      radius: 15,
      fill: '#ffffff',
      stroke: 'rgba(255, 0, 0, 1)',
      lineWidth: 3,
    },
  ]);

  const result = interpolateScene(previous, next, 0.5, { keyField: 'group' });
  const node = result.root.children[0];
  assert.equal(node.type, 'circle');
  assert.equal(node.id, 'motion:bubble:1');
  assert.equal(node.cx, 50);
  assert.equal(node.cy, 70);
  assert.equal(node.radius, 10);
  assert.equal(node.lineWidth, 2);
  assert.equal(node.fill, 'rgba(128, 128, 128, 1)');
  assert.equal(node.stroke, 'rgba(128, 0, 0, 0.75)');
  assert.equal(node.datum, nextDatum);
});

test('stable datum keys preserve matrix and compound numeric roles before the row index', () => {
  const previousDatum = {
    layerId: 'matrix',
    rowIndex: 0,
    datum: { entity: 'A', frame: 'before' },
  };
  const nextDatum = {
    layerId: 'matrix',
    rowIndex: 3,
    datum: { entity: 'A', frame: 'after' },
  };
  const point = (id, datum, cx) => ({
    type: 'circle',
    ...base(id, datum),
    cx,
    cy: 40,
    radius: 5,
    fill: '#2563eb',
    lineWidth: 0,
  });
  const previous = scene([
    point('matrix:matrix-point:0:0:0', previousDatum, 10),
    point('matrix:matrix-point:0:1:0', previousDatum, 30),
  ]);
  const next = scene([
    point('matrix:matrix-point:0:0:3', nextDatum, 50),
    point('matrix:matrix-point:0:1:3', nextDatum, 90),
  ]);

  const result = interpolateScene(previous, next, 0.5, { keyField: 'entity' });
  assert.equal(result.root.children.length, 2, 'both compound roles morph instead of crossfading');
  assert.deepEqual(
    result.root.children.map(({ id, cx }) => [id, cx]),
    [
      ['matrix:matrix-point:0:0:3', 30],
      ['matrix:matrix-point:0:1:3', 60],
    ],
  );
  assert.equal(
    result.root.children.some(({ id }) => id.startsWith('transition-exit:')),
    false,
  );

  const changedStructuralRole = interpolateScene(
    scene([point('matrix:matrix-point:0:1:0', previousDatum, 10)]),
    scene([point('matrix:matrix-point:3:1:3', nextDatum, 50)]),
    0.5,
    { keyField: 'entity' },
  );
  assert.equal(
    changedStructuralRole.root.children.length,
    2,
    'a structural matrix coordinate that changes with the numeric row index still crossfades',
  );
});

test('entering, exiting, and incompatible path topology use a safe crossfade', () => {
  const previousPath = {
    type: 'path',
    ...base('series:path'),
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ],
    closed: false,
    stroke: '#2563eb',
    lineWidth: 2,
  };
  const nextPath = {
    ...previousPath,
    points: [...previousPath.points, { x: 20, y: 5 }],
  };
  const previous = scene([
    previousPath,
    {
      type: 'circle',
      ...base('point:old'),
      cx: 10,
      cy: 10,
      radius: 4,
      fill: '#2563eb',
      lineWidth: 0,
    },
  ]);
  const next = scene([
    nextPath,
    {
      type: 'rect',
      ...base('bar:new'),
      x: 20,
      y: 20,
      width: 10,
      height: 30,
      fill: '#16a34a',
      lineWidth: 0,
      cornerRadius: 2,
    },
  ]);

  const result = interpolateScene(previous, next, 0.25);
  const incompatibleExit = result.root.children.find(({ id }) => id.endsWith(':series:path'));
  const incompatibleEnter = result.root.children.find(({ id }) => id === 'series:path');
  const entering = result.root.children.find(({ id }) => id === 'bar:new');
  const exiting = result.root.children.find(({ id }) => id.endsWith(':point:old'));
  assert.equal(incompatibleExit.opacity, 0.75);
  assert.equal(incompatibleEnter.opacity, 0.25);
  assert.equal(entering.opacity, 0.25);
  assert.equal(exiting.opacity, 0.75);
  assert.equal(previous.root.children.length, 2, 'previous scene is immutable');
  assert.equal(next.root.children.length, 2, 'next scene is immutable');
});

test('compatible paths and clips interpolate while changed text crossfades', () => {
  const previous = scene([
    {
      type: 'group',
      ...base('layer:group'),
      clip: { x: 0, y: 0, width: 100, height: 80 },
      children: [
        {
          type: 'path',
          ...base('layer:path'),
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
          subpaths: [[{ x: 2, y: 2 }]],
          closed: false,
          stroke: '#000000',
          lineWidth: 1,
        },
      ],
    },
    {
      type: 'text',
      ...base('frame:label'),
      x: 10,
      y: 10,
      text: '2025',
      fill: '#000000',
      fontFamily: 'sans-serif',
      fontSize: 12,
      fontWeight: 400,
      align: 'left',
      baseline: 'top',
      rotation: 0,
    },
  ]);
  const next = scene([
    {
      type: 'group',
      ...base('layer:group'),
      clip: { x: 20, y: 10, width: 120, height: 100 },
      children: [
        {
          type: 'path',
          ...base('layer:path'),
          points: [
            { x: 20, y: 10 },
            { x: 30, y: 30 },
          ],
          subpaths: [[{ x: 6, y: 8 }]],
          closed: false,
          stroke: '#ffffff',
          lineWidth: 3,
        },
      ],
    },
    {
      type: 'text',
      ...base('frame:label'),
      x: 20,
      y: 10,
      text: '2026',
      fill: '#000000',
      fontFamily: 'sans-serif',
      fontSize: 12,
      fontWeight: 400,
      align: 'left',
      baseline: 'top',
      rotation: 0,
    },
  ]);

  const result = interpolateScene(previous, next, 0.5);
  const layer = result.root.children.find(({ id }) => id === 'layer:group');
  assert.equal(layer.type, 'group');
  assert.deepEqual(layer.clip, { x: 10, y: 5, width: 110, height: 90 });
  const path = layer.children[0];
  assert.equal(path.type, 'path');
  assert.deepEqual(path.points, [
    { x: 10, y: 5 },
    { x: 20, y: 20 },
  ]);
  assert.deepEqual(path.subpaths, [[{ x: 4, y: 5 }]]);
  const labels = result.root.children.filter(({ id }) => id.endsWith('frame:label'));
  assert.equal(labels.length, 2);
  assert.deepEqual(
    labels.map(({ opacity }) => opacity),
    [0.5, 0.5],
  );
});

test('transition endpoints preserve exact scene identity and invalid progress is rejected', () => {
  const previous = scene([]);
  const next = scene([], '#000000');
  assert.equal(interpolateScene(previous, next, 0), previous);
  assert.equal(interpolateScene(previous, next, 1), next);
  assert.throws(() => interpolateScene(previous, next, Number.NaN), RangeError);
  assert.equal(easeSceneProgress(0.5, 'linear'), 0.5);
  assert.equal(easeSceneProgress(0.25, 'ease-in-out'), 0.15625);
  assert.equal(easeSceneProgress(-1, 'ease-in-out'), 0);
  assert.equal(easeSceneProgress(2, 'ease-in-out'), 1);
});
