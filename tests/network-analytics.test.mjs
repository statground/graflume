import assert from 'node:assert/strict';
import test from 'node:test';

import {
  layoutNetwork,
  moveNetworkNode,
  selectNetworkNodes,
} from '../.tmp/src/data/network-analytics.js';

const nodes = [
  { id: 'group' },
  { id: 'a', parent: 'group', ports: [{ id: 'east', angle: 0 }] },
  { id: 'b', parent: 'group', ports: [{ id: 'west', angle: 180 }] },
  { id: 'c' },
];

const edges = [
  {
    id: 'ab-1',
    source: 'a',
    target: 'b',
    sourcePort: 'east',
    targetPort: 'west',
    directed: true,
    weight: 2,
  },
  { id: 'ab-2', source: 'a', target: 'b', directed: true, weight: 1 },
  { id: 'bc', source: 'b', target: 'c', directed: true, weight: 1 },
  { id: 'cc', source: 'c', target: 'c', directed: true, weight: 0.5 },
];

test('network model supports directed multiedges, self-loops, compound nodes and explicit ports', () => {
  const result = layoutNetwork(nodes, edges, {
    layout: 'grid',
    routing: 'quadratic',
    directed: true,
  });
  assert.equal(result.nodes.find(({ id }) => id === 'group').compound, true);
  assert.equal(result.nodes.find(({ id }) => id === 'a').ports[0].id, 'east');
  assert.deepEqual(
    result.edges
      .filter(({ source, target }) => source === 'a' && target === 'b')
      .map(({ parallelIndex, parallelCount }) => [parallelIndex, parallelCount]),
    [
      [0, 2],
      [1, 2],
    ],
  );
  assert.equal(result.edges.find(({ id }) => id === 'cc').selfLoop, true);
  assert.equal(result.edges.find(({ id }) => id === 'cc').points.length, 4);
  assert.ok(
    result.edges.every(({ points }) =>
      points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
    ),
  );
});

test('network layout registry covers deterministic force, radial, grid and DAG modes', () => {
  for (const layout of ['force', 'radial', 'grid', 'dag']) {
    const first = layoutNetwork(
      nodes,
      edges.filter(({ id }) => id !== 'cc'),
      {
        layout,
        directed: true,
        seed: 9,
        iterations: 40,
      },
    );
    const second = layoutNetwork(
      nodes,
      edges.filter(({ id }) => id !== 'cc'),
      {
        layout,
        directed: true,
        seed: 9,
        iterations: 40,
      },
    );
    assert.deepEqual(first, second, `${layout} is deterministic`);
    assert.ok(first.nodes.every(({ x, y }) => x >= 0 && x <= 1 && y >= 0 && y <= 1));
  }
  const dag = layoutNetwork(
    nodes,
    edges.filter(({ id }) => id !== 'cc'),
    { layout: 'dag', directed: true },
  );
  assert.ok(dag.topologicalOrder.indexOf('a') < dag.topologicalOrder.indexOf('b'));
  assert.ok(dag.topologicalOrder.indexOf('b') < dag.topologicalOrder.indexOf('c'));
});

test('network collapse aggregates child edges and exposes hidden-count navigation state', () => {
  const result = layoutNetwork(nodes, edges, {
    layout: 'grid',
    collapsed: ['group'],
    directed: true,
  });
  assert.deepEqual(
    result.nodes.map(({ id }) => id),
    ['group', 'c'],
  );
  assert.equal(result.nodes.find(({ id }) => id === 'group').hiddenCount, 2);
  assert.ok(
    result.edges.some(
      ({ source, target, weight }) => source === 'group' && target === 'group' && weight === 3,
    ),
  );
  assert.ok(result.edges.some(({ source, target }) => source === 'group' && target === 'c'));
});

test('network orthogonal routing, drag/pin and polygon lasso are serializable', () => {
  const moved = moveNetworkNode(nodes, 'a', { x: 0.2, y: 0.3 });
  const result = layoutNetwork(moved, edges, { layout: 'grid', routing: 'orthogonal' });
  const a = result.nodes.find(({ id }) => id === 'a');
  assert.equal(a.pinned, true);
  assert.equal(a.x, 0.2);
  assert.equal(a.y, 0.3);
  assert.ok(
    result.edges.filter(({ selfLoop }) => !selfLoop).every(({ points }) => points.length === 4),
  );
  const parallel = result.edges.filter(({ source, target }) => source === 'a' && target === 'b');
  assert.equal(parallel.length, 2);
  assert.notDeepEqual(parallel[0].points, parallel[1].points);
  assert.notEqual(parallel[0].points[1].x, parallel[1].points[1].x);
  const selected = selectNetworkNodes(result, [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0.5, y: 0.6 },
    { x: 0, y: 0.6 },
  ]);
  assert.ok(selected.includes('a'));
  assert.doesNotThrow(() => JSON.stringify({ moved, result, selected }));
});

test('orthogonal multiedges use distinct visible corridors for horizontal and vertical peers', () => {
  for (const [first, second, corridor] of [
    [{ id: 'a', x: 0.2, y: 0.5, pinned: true }, { id: 'b', x: 0.8, y: 0.5, pinned: true }, 'y'],
    [{ id: 'a', x: 0.5, y: 0.2, pinned: true }, { id: 'b', x: 0.5, y: 0.8, pinned: true }, 'x'],
  ]) {
    const result = layoutNetwork(
      [first, second],
      [
        { id: 'first', source: 'a', target: 'b' },
        { id: 'second', source: 'a', target: 'b' },
      ],
      { routing: 'orthogonal' },
    );
    const peers = result.edges.map(({ points }) => points);
    assert.equal(peers.length, 2);
    assert.notEqual(peers[0][1][corridor], peers[1][1][corridor]);
    assert.notEqual(peers[0][2][corridor], peers[1][2][corridor]);
    assert.notEqual(peers[0][1][corridor], peers[0][0][corridor]);
    assert.notEqual(peers[1][1][corridor], peers[1][0][corridor]);
  }
});

test('network validation explicitly enforces self-loop, multiedge, port, pin and compound contracts', () => {
  assert.throws(() => layoutNetwork(nodes, edges, { allowSelfLoops: false }), /Self-loop/);
  assert.throws(() => layoutNetwork(nodes, edges, { allowMultiedges: false }), /Multiedges/);
  assert.throws(
    () => layoutNetwork(nodes, [{ source: 'a', target: 'b', sourcePort: 'missing' }]),
    /source port/,
  );
  assert.throws(() => layoutNetwork([{ id: 'x', pinned: true }], []), /needs x and y/);
  assert.throws(() => layoutNetwork([{ id: 'x', parent: 'missing' }], []), /compound parent/);
  assert.throws(
    () => layoutNetwork([{ id: 'x', parent: 'x' }], [], { layout: 'grid' }),
    /cannot be its own compound parent/,
  );
  assert.throws(
    () =>
      layoutNetwork(
        [
          { id: 'a', parent: 'b' },
          { id: 'b', parent: 'a' },
        ],
        [],
        { layout: 'grid' },
      ),
    /compound parent cycle detected: a -> b -> a/i,
  );
});
