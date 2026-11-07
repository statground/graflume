import assert from 'node:assert/strict';
import test from 'node:test';

import { generateNetworkTopology, networkTopologyCatalog } from '../.tmp/src/index.js';
import { compile } from '../.tmp/src/complete.js';
import { layoutNetwork } from '../.tmp/src/data/network-analytics.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const original = ['collapse', 'line', 'star', 'pseudo-loop', 'diamond', 'rhombus'];
const graphSpec = (graph) => ({
  data: graph.data,
  x: { field: 'source', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  axes: { x: false, y: false },
  mark: graph.mark,
});

test('reference motifs preserve exact node and edge counts at every illustrated size', () => {
  for (const topology of original) {
    for (const nodeCount of [3, 4, 6, 8, 10]) {
      if (nodeCount === 3 && ['diamond', 'rhombus'].includes(topology)) continue;
      const graph = generateNetworkTopology({ topology, nodeCount });
      assert.equal(graph.nodeCount, nodeCount, `${topology}/${nodeCount}`);
      const expected =
        topology === 'pseudo-loop'
          ? nodeCount
          : topology === 'diamond'
            ? 3 * nodeCount - 7
            : topology === 'rhombus'
              ? 2 * nodeCount - 4
              : nodeCount - 1;
      assert.equal(graph.edgeCount, expected, `${topology}/${nodeCount}`);
      const model = layoutNetwork(graph.nodes, graph.edges, { routing: 'straight' });
      assert.equal(model.nodes.length, nodeCount);
      assert.equal(model.edges.length, expected);
      assert.ok(model.nodes.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
      const { scene } = compile(graphSpec(graph), { width: 480, height: 320 });
      const nodes = flattenScene(scene.root);
      assert.equal(nodes.filter(({ id }) => id.includes(':network-node:')).length, nodeCount);
      assert.equal(nodes.filter(({ id }) => id.includes(':network-edge:')).length, expected);
    }
  }
});

test('collapse, star, diamond and rhombus expose distinct directed role/connection semantics', () => {
  const collapse = generateNetworkTopology({ topology: 'collapse', nodeCount: 8 });
  assert.ok(collapse.edges.every(({ target }) => target === 'n1'));
  assert.equal(collapse.nodes[0].role, 'sink');
  assert.ok(collapse.nodes.slice(1).every(({ role }) => role === 'source'));
  const star = generateNetworkTopology({ topology: 'star', nodeCount: 8 });
  assert.ok(star.edges.every(({ source }) => source === 'n1'));
  assert.equal(star.nodes[0].role, 'source');
  assert.ok(star.nodes.slice(1).every(({ role }) => role === 'sink'));
  const diamond = generateNetworkTopology({ topology: 'diamond', nodeCount: 8 });
  const rhombus = generateNetworkTopology({ topology: 'rhombus', nodeCount: 8 });
  assert.equal(diamond.nodes[0].role, 'source');
  assert.equal(diamond.nodes.at(-1).role, 'sink');
  assert.equal(diamond.edgeCount - rhombus.edgeCount, 5);
  assert.deepEqual(
    diamond.nodes.map(({ x, y }) => [x, y]),
    rhombus.nodes.map(({ x, y }) => [x, y]),
  );
  assert.ok(diamond.edges.some(({ source, target }) => source === 'n2' && target === 'n3'));
  assert.ok(!rhombus.edges.some(({ source, target }) => source === 'n2' && target === 'n3'));
});

test('line preserves its elbows and pseudo loop adds only the direct source-to-sink shortcut', () => {
  for (const nodeCount of [4, 6, 8, 10]) {
    const line = generateNetworkTopology({ topology: 'line', nodeCount });
    const loop = generateNetworkTopology({ topology: 'pseudo-loop', nodeCount });
    assert.deepEqual(
      line.nodes.map(({ x, y }) => [x, y]),
      loop.nodes.map(({ x, y }) => [x, y]),
    );
    assert.deepEqual(loop.edges.slice(0, -1), line.edges);
    assert.equal(loop.edges.at(-1).source, 'n1');
    assert.equal(loop.edges.at(-1).target, `n${nodeCount}`);
    assert.equal(loop.nodes[0].role, 'source');
    assert.equal(loop.nodes.at(-1).role, 'sink');
    for (const edge of line.edges) {
      const source = line.nodes.find(({ id }) => id === edge.source);
      const target = line.nodes.find(({ id }) => id === edge.target);
      assert.ok(
        Math.abs(source.x - target.x) < 1e-12 || Math.abs(source.y - target.y) < 1e-12,
        `${nodeCount} path has no diagonal shortcuts`,
      );
    }
    assert.ok(Math.abs(line.nodes[0].y - line.nodes.at(-1).y) < 1e-12);
  }
});

test('catalog presets are bounded, simple, deterministic, independent, and JSON portable', () => {
  assert.equal(networkTopologyCatalog.length, 14);
  assert.equal(new Set(networkTopologyCatalog.map(({ id }) => id)).size, 14);
  assert.ok(Object.isFrozen(networkTopologyCatalog));
  for (const descriptor of networkTopologyCatalog) {
    const options = {
      topology: descriptor.id,
      nodeCount: Math.max(8, descriptor.minNodes),
      seed: 17,
    };
    const graph = generateNetworkTopology(options);
    assert.deepEqual(graph, generateNetworkTopology(options));
    assert.deepEqual(JSON.parse(JSON.stringify(graph)), graph);
    assert.equal(graph.data.filter(({ node }) => node !== undefined).length, graph.nodeCount);
    assert.equal(graph.data.length, graph.nodeCount + graph.edgeCount);
    assert.ok(
      graph.data.every(
        ({ synthetic, topology }) => synthetic === true && topology === descriptor.id,
      ),
    );
    const ids = new Set(graph.nodes.map(({ id }) => id));
    const pairs = new Set();
    for (const { source, target } of graph.edges) {
      assert.ok(ids.has(source) && ids.has(target));
      assert.notEqual(source, target);
      const pair = [source, target].sort().join(':');
      assert.ok(!pairs.has(pair));
      pairs.add(pair);
    }
    assert.ok(
      graph.nodes.every(({ x, y, pinned }) => x >= 0 && x <= 1 && y >= 0 && y <= 1 && pinned),
    );
    assert.doesNotThrow(() =>
      generateNetworkTopology({ topology: descriptor.id, nodeCount: descriptor.maxNodes }),
    );
    assert.throws(
      () =>
        generateNetworkTopology({ topology: descriptor.id, nodeCount: descriptor.maxNodes + 1 }),
      /nodeCount/,
    );
  }
});

test('seeded random and small-world samples vary reproducibly and preserve isolates', () => {
  for (const topology of ['random', 'small-world']) {
    const options = { topology, nodeCount: 24, edgeProbability: 0.7 };
    assert.notDeepEqual(
      generateNetworkTopology({ ...options, seed: 1 }).edges,
      generateNetworkTopology({ ...options, seed: 2 }).edges,
    );
  }
  const empty = generateNetworkTopology({ topology: 'random', nodeCount: 10, edgeProbability: 0 });
  assert.equal(empty.edges.length, 0);
  assert.ok(empty.nodes.every(({ role }) => role === 'isolated'));
  const { scene } = compile(graphSpec(empty), { width: 480, height: 320 });
  assert.equal(
    flattenScene(scene.root).filter(({ id }) => id.includes(':network-node:')).length,
    10,
  );
  assert.equal(
    generateNetworkTopology({ topology: 'random', nodeCount: 10, edgeProbability: 1 }).edges.length,
    45,
  );
  const dense = generateNetworkTopology({ topology: 'complete', nodeCount: 10 });
  assert.equal(dense.edges.length, 45);
  assert.ok(dense.edges.every(({ directed }) => !directed));
  const bipartite = generateNetworkTopology({ topology: 'bipartite', nodeCount: 10 });
  assert.equal(bipartite.edges.length, 25);
});

test('generated geometry and role colors survive the portable ChartSpec compile', () => {
  const graph = generateNetworkTopology({ topology: 'rhombus', nodeCount: 8 });
  const spec = JSON.parse(JSON.stringify(graphSpec(graph)));
  const { scene } = compile(spec, { width: 560, height: 360 });
  const nodes = flattenScene(scene.root).filter(({ id }) => id.includes(':network-node:'));
  const relays = nodes.filter(({ datum }) => datum.tooltip.group === 'relay');
  assert.equal(new Set(relays.map(({ fill }) => fill)).size, 1);
  assert.equal(new Set(nodes.map(({ fill }) => fill)).size, 3);
  const model = layoutNetwork(graph.nodes, graph.edges, {
    layout: 'force',
    seed: 999,
    iterations: 2,
  });
  assert.deepEqual(
    model.nodes.map(({ x, y }) => [x, y]),
    graph.nodes.map(({ x, y }) => [x, y]),
  );
  assert.ok(
    nodes.every(
      ({ datum }) => datum.tooltip.pinned && datum.familyInteraction.kind === 'network-node',
    ),
  );
  const undirected = generateNetworkTopology({ topology: 'star', nodeCount: 6, directed: false });
  assert.ok(undirected.nodes.every(({ role }) => role === 'relay'));
  assert.ok(undirected.edges.every(({ directed }) => !directed));
});

test('invalid IDs, sizes, direction flags, seeds and probabilities fail explicitly', () => {
  for (const options of [
    null,
    undefined,
    {},
    { topology: 'missing' },
    { topology: 'diamond', nodeCount: 3 },
    { topology: 'rhombus', nodeCount: 3 },
    { topology: 'star', nodeCount: 2 },
    { topology: 'star', nodeCount: 3.5 },
    { topology: 'star', nodeCount: NaN },
    { topology: 'star', nodeCount: null },
    { topology: 'complete', nodeCount: 65 },
    { topology: 'star', directed: 'yes' },
    { topology: 'random', seed: -1 },
    { topology: 'random', seed: 0x1_0000_0000 },
    { topology: 'random', seed: 1.5 },
    { topology: 'random', edgeProbability: -0.1 },
    { topology: 'random', edgeProbability: 1.1 },
    { topology: 'random', edgeProbability: NaN },
  ])
    assert.throws(() => generateNetworkTopology(options), /Topology|topology|nodeCount/);
});
