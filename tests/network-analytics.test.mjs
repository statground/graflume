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

test('force networks keep weakly connected nodes apart and preserve relative count units', () => {
  const nodes = Array.from({ length: 24 }, (_, index) => ({ id: String(index) }));
  const edges = [];
  for (let source = 0; source < nodes.length; source += 1)
    for (let target = source + 1; target < nodes.length; target += 1)
      if (source % 6 === target % 6 || target - source === 1)
        edges.push({
          source: String(source),
          target: String(target),
          weight: source % 6 === target % 6 ? 1000 : 30,
        });
  const options = { layout: 'force', iterations: 240, seed: 1, nodeSpacing: 0.08 };
  const original = layoutNetwork(nodes, edges, options);
  assert.deepEqual(original, layoutNetwork(nodes, edges, options));
  const rescaled = layoutNetwork(
    nodes,
    edges.map((edge) => ({ ...edge, weight: edge.weight / 100000 })),
    options,
  );
  for (let index = 0; index < nodes.length; index += 1) {
    assert.ok(Math.abs(original.nodes[index].x - rescaled.nodes[index].x) < 0.002);
    assert.ok(Math.abs(original.nodes[index].y - rescaled.nodes[index].y) < 0.002);
  }
  for (let left = 0; left < original.nodes.length; left += 1) {
    const a = original.nodes[left];
    for (const b of original.nodes.slice(left + 1))
      assert.ok(
        Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius,
        `${a.id} and ${b.id} overlap`,
      );
  }
  const pinned = { id: '0', x: 0.2, y: 0.3, pinned: true };
  const withIsolated = layoutNetwork(
    [pinned, ...nodes.slice(1), { id: 'isolated' }],
    edges,
    options,
  );
  assert.equal(withIsolated.nodes.length, 25);
  assert.equal(withIsolated.nodes.find((node) => node.id === '0').x, 0.2);
  assert.equal(withIsolated.nodes.find((node) => node.id === '0').y, 0.3);
  assert.equal(withIsolated.edges.length, edges.length);
  assert.ok(withIsolated.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)));
});

test('100-node sparse and dense force graphs preserve topology without node collisions', () => {
  for (const dense of [false, true]) {
    const nodes = Array.from({ length: 100 }, (_, index) => ({
      id: String(index),
      radius: 0.009 + 0.014 * Math.sqrt(1 / (index + 1)),
    }));
    const edges = [];
    for (let source = 0; source < 99; source += 1)
      for (let target = source + 1; target < 99; target += 1)
        if (
          dense ? (source + target) % 3 === 0 : target === source + 1 || source % 10 === target % 10
        )
          edges.push({
            source: String(source),
            target: String(target),
            weight: 1 + ((source + target) % 39),
          });
    const result = layoutNetwork(nodes, edges, {
      layout: 'force',
      iterations: 220,
      nodeSpacing: 0.085,
      seed: 1,
    });
    assert.equal(result.nodes.length, 100);
    assert.equal(result.edges.length, edges.length);
    assert.equal(result.nodes.filter((node) => node.id === '99').length, 1);
    for (let left = 0; left < result.nodes.length; left += 1)
      for (const b of result.nodes.slice(left + 1)) {
        const a = result.nodes[left];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius - 1e-6);
      }
  }
});
