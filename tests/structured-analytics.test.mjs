import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeSets,
  buildWordTree,
  chordEdgesToMatrix,
  chordMatrixToEdges,
  funnelStages,
  hitSetRegion,
  layoutChord,
  layoutFlow,
  layoutHierarchy,
  layoutWordCloud,
  projectParallelRows,
  querySetRegion,
  tokenizeWords,
  traverseFlowPath,
} from '../.tmp/src/data/structured-analytics.js';

test('hierarchy layouts implement circle pack, dendrogram, radial tree, collapse, reroot, breadcrumbs, and search', () => {
  const data = [
    { id: 'root', value: 1 },
    { id: 'a', parent: 'root', value: 4, label: 'Alpha group' },
    { id: 'b', parent: 'root', value: 2, label: 'Beta group' },
    { id: 'a1', parent: 'a', value: 2, label: 'Needle observation' },
    { id: 'a2', parent: 'a', value: 2 },
  ];
  const packed = layoutHierarchy(data, { mode: 'circle-pack' });
  assert.equal(packed.nodes.length, 5);
  assert.ok(
    packed.nodes.every(({ x, y, radius }) => x >= 0 && x <= 1 && y >= 0 && y <= 1 && radius > 0),
  );
  assert.equal(packed.links.length, 4);

  const collapsed = layoutHierarchy(data, { mode: 'dendrogram', collapsed: ['a'] });
  assert.deepEqual(
    collapsed.nodes.map(({ id }) => id),
    ['root', 'a', 'b'],
  );
  assert.equal(collapsed.nodes.find(({ id }) => id === 'a').collapsed, true);

  const rerooted = layoutHierarchy(data, { root: 'a', mode: 'radial-tree', query: 'needle' });
  assert.deepEqual(rerooted.breadcrumbs, ['root', 'a']);
  assert.deepEqual(rerooted.matches, ['a1']);
  assert.deepEqual(
    rerooted.nodes.map(({ depth }) => depth),
    [0, 1, 1],
  );
  assert.throws(
    () =>
      layoutHierarchy([
        { id: 'a', parent: 'b' },
        { id: 'b', parent: 'a' },
      ]),
    /root|cycle/i,
  );
});

test('flow layout validates balance and cycles, supports order/alignment/iterations/drag, and traverses paths', () => {
  const edges = [
    { id: 'ab', source: 'a', target: 'b', value: 4 },
    { id: 'bc', source: 'b', target: 'c', value: 3 },
    { id: 'bd', source: 'b', target: 'd', value: 1 },
  ];
  const result = layoutFlow(edges, {
    alignment: 'justify',
    order: 'descending',
    iterations: 4,
    positions: { b: { x: 0.4, y: 0.25 } },
  });
  assert.equal(result.nodes.find(({ id }) => id === 'b').balanced, true);
  assert.equal(result.nodes.find(({ id }) => id === 'b').x, 0.4);
  assert.equal(result.links[0].path.length, 4);
  assert.deepEqual(traverseFlowPath(result, 'bc', 'both'), {
    nodes: ['b', 'c', 'a', 'd'],
    links: ['ab', 'bc', 'bd'],
  });

  const imbalance = layoutFlow([
    { source: 'a', target: 'b', value: 4 },
    { source: 'b', target: 'c', value: 2 },
  ]);
  assert.deepEqual(imbalance.imbalances, [{ id: 'b', difference: 2 }]);
  assert.throws(() => layoutFlow([{ source: 'a', target: 'a', value: 1 }]), /cycle/i);
  assert.equal(
    layoutFlow([{ source: 'a', target: 'a', value: 1 }], { cycle: 'allow' }).cycles.length,
    1,
  );
});

test('flow alignment assigns exact left, right, center, and justified columns', () => {
  const branches = [
    { source: 'A', target: 'B', value: 1 },
    { source: 'B', target: 'C', value: 1 },
    { source: 'D', target: 'E', value: 1 },
  ];
  const columns = (alignment) =>
    Object.fromEntries(
      layoutFlow(branches, { alignment, iterations: 0 }).nodes.map(({ id, column }) => [
        id,
        column,
      ]),
    );

  assert.deepEqual(columns('left'), { A: 0, D: 0, B: 1, E: 1, C: 2 });
  assert.deepEqual(columns('right'), { A: 0, B: 1, D: 1, C: 2, E: 2 });
  assert.deepEqual(columns('center'), { A: 0, D: 0, B: 1, E: 1, C: 2 });
  assert.deepEqual(columns('justify'), { A: 0, D: 0, B: 1, C: 2, E: 2 });

  const shortcut = [
    { source: 'A', target: 'B', value: 1 },
    { source: 'B', target: 'C', value: 1 },
    { source: 'X', target: 'C', value: 1 },
  ];
  const shortcutColumn = (alignment) =>
    layoutFlow(shortcut, { alignment, iterations: 0 }).nodes.find(({ id }) => id === 'X').column;
  assert.equal(shortcutColumn('left'), 0);
  assert.equal(shortcutColumn('center'), 1);
});

test('flow order independently sorts equal-column node values ascending and descending', () => {
  const edges = [
    { source: 'root', target: 'small', value: 1 },
    { source: 'root', target: 'large', value: 3 },
  ];
  const orderedTargets = (order) =>
    layoutFlow(edges, { order, iterations: 0 })
      .nodes.filter(({ column }) => column === 1)
      .map(({ id }) => id);

  assert.deepEqual(orderedTargets('ascending'), ['small', 'large']);
  assert.deepEqual(orderedTargets('descending'), ['large', 'small']);
});

test('flow iterations reorder a crossing while zero iterations preserve authored input order', () => {
  const edges = [
    { source: 's1', target: 't1', value: 0 },
    { source: 's1', target: 't2', value: 1 },
    { source: 's2', target: 't1', value: 1 },
  ];
  const targetOrder = (iterations) =>
    layoutFlow(edges, { iterations })
      .nodes.filter(({ column }) => column === 1)
      .map(({ id }) => id);

  assert.deepEqual(targetOrder(0), ['t1', 't2']);
  assert.deepEqual(targetOrder(1), ['t2', 't1']);
});

test('flow link sorting deterministically changes per-node stacking and authored order', () => {
  const edges = [
    { id: 'large', source: 'a', target: 'c', value: 3 },
    { id: 'small', source: 'a', target: 'b', value: 1 },
  ];
  const ascending = layoutFlow(edges, { iterations: 0, linkSort: 'ascending' });
  const descending = layoutFlow(edges, { iterations: 0, linkSort: 'descending' });
  assert.deepEqual(
    ascending.links.map(({ id }) => id),
    ['small', 'large'],
  );
  assert.deepEqual(
    descending.links.map(({ id }) => id),
    ['large', 'small'],
  );
  assert.ok(
    ascending.links.find(({ id }) => id === 'small').path[0].y <
      ascending.links.find(({ id }) => id === 'large').path[0].y,
  );
  assert.ok(
    descending.links.find(({ id }) => id === 'small').path[0].y >
      descending.links.find(({ id }) => id === 'large').path[0].y,
  );
  assert.deepEqual(
    layoutFlow(edges, {
      iterations: 0,
      linkSort: 'authored',
      linkOrder: ['small', 'large'],
    }).links.map(({ id, sourceLinkOrder }) => [id, sourceLinkOrder]),
    [
      ['small', 0],
      ['large', 1],
    ],
  );
  assert.throws(
    () => layoutFlow(edges, { linkSort: 'authored', linkOrder: ['small'] }),
    /every flow edge id exactly once/u,
  );
});

test('chord transform exposes matrix, sorting, padding, directed asymmetry, subgroups and self-loop semantics', () => {
  const result = layoutChord(
    [
      { source: 'A', target: 'B', value: 3 },
      { source: 'B', target: 'A', value: 1 },
      { source: 'A', target: 'A', value: 2 },
    ],
    { directed: true, groupOrder: 'descending', subgroupOrder: 'ascending', padAngle: 0.05 },
  );
  assert.deepEqual(result.matrix, [
    [2, 3],
    [1, 0],
  ]);
  assert.equal(result.groups[0].id, 'A');
  assert.ok(result.groups[0].endAngle > result.groups[0].startAngle);
  result.groups.forEach((group, index) => {
    const next = result.groups[(index + 1) % result.groups.length];
    const nextStart =
      index === result.groups.length - 1 ? next.startAngle + Math.PI * 2 : next.startAngle;
    assert.ok(Math.abs(nextStart - group.endAngle - 0.05) < 1e-12);
  });
  const withoutPadding = layoutChord(
    [
      { source: 'A', target: 'B', value: 3 },
      { source: 'B', target: 'A', value: 1 },
      { source: 'A', target: 'A', value: 2 },
    ],
    { directed: true, groupOrder: 'descending', padAngle: 0 },
  );
  assert.ok(
    Math.abs(
      withoutPadding.groups.reduce((sum, group) => sum + group.endAngle - group.startAngle, 0) -
        Math.PI * 2,
    ) < 1e-12,
  );
  assert.equal(
    result.ribbons.find(({ source, target }) => source === 'A' && target === 'A').selfLoop,
    true,
  );
  assert.ok(result.ribbons.every(({ directed }) => directed));
  const groupById = new Map(result.groups.map((group) => [group.id, group]));
  for (const ribbon of result.ribbons) {
    const source = groupById.get(ribbon.source);
    const target = groupById.get(ribbon.target);
    assert.ok(ribbon.sourceStartAngle >= source.startAngle - 1e-12);
    assert.ok(ribbon.sourceEndAngle <= source.endAngle + 1e-12);
    assert.ok(ribbon.targetStartAngle >= target.startAngle - 1e-12);
    assert.ok(ribbon.targetEndAngle <= target.endAngle + 1e-12);
  }

  const sortFixture = [
    { source: 'A', target: 'B', value: 5 },
    { source: 'A', target: 'C', value: 1 },
  ];
  const ascending = layoutChord(sortFixture, { directed: true, subgroupOrder: 'ascending' });
  const descending = layoutChord(sortFixture, {
    directed: true,
    subgroupOrder: 'descending',
  });
  assert.equal(ascending.ribbons.find(({ target }) => target === 'C').sourceSubgroupOrder, 0);
  assert.equal(descending.ribbons.find(({ target }) => target === 'B').sourceSubgroupOrder, 0);
  assert.ok(
    ascending.ribbons.find(({ target }) => target === 'C').sourceStartAngle <
      ascending.ribbons.find(({ target }) => target === 'B').sourceStartAngle,
  );
  assert.ok(
    descending.ribbons.find(({ target }) => target === 'B').sourceStartAngle <
      descending.ribbons.find(({ target }) => target === 'C').sourceStartAngle,
  );

  const undirectedSelf = layoutChord(
    [
      { source: 'A', target: 'A', value: 2 },
      { source: 'A', target: 'B', value: 3 },
    ],
    { subgroupOrder: 'descending' },
  );
  const loop = undirectedSelf.ribbons.find(({ selfLoop }) => selfLoop);
  assert.equal(loop.sourceStartAngle, loop.targetStartAngle);
  assert.equal(loop.sourceEndAngle, loop.targetEndAngle);
  assert.ok(
    undirectedSelf.ribbons.every((ribbon) => {
      const source = undirectedSelf.groups.find(({ id }) => id === ribbon.source);
      const target = undirectedSelf.groups.find(({ id }) => id === ribbon.target);
      return (
        ribbon.sourceEndAngle <= source.endAngle + 1e-12 &&
        ribbon.targetEndAngle <= target.endAngle + 1e-12
      );
    }),
  );
});

test('chord matrix and edge-list transforms round-trip stable ids, asymmetry, and zero cells', () => {
  const input = {
    ids: ['A', 'B', 'C'],
    matrix: [
      [2, 3, 0],
      [1, 0, 4],
      [0, 5, 0],
    ],
  };
  const edges = chordMatrixToEdges(input, { directed: true });
  assert.deepEqual(edges, [
    { source: 'A', target: 'A', value: 2 },
    { source: 'A', target: 'B', value: 3 },
    { source: 'B', target: 'A', value: 1 },
    { source: 'B', target: 'C', value: 4 },
    { source: 'C', target: 'B', value: 5 },
  ]);
  assert.deepEqual(chordEdgesToMatrix(edges, { directed: true, ids: input.ids }), input);
  const layout = layoutChord(input, { directed: true });
  assert.deepEqual(layout.ids, input.ids);
  assert.deepEqual(layout.matrix, input.matrix);
  assert.equal(layout.ribbons.length, edges.length);
  assert.throws(() => chordMatrixToEdges(input), /Undirected chord matrices must be symmetric/u);
  const symmetric = {
    ids: ['left', 'right'],
    matrix: [
      [1, 7],
      [7, 0],
    ],
  };
  assert.deepEqual(chordMatrixToEdges(symmetric), [
    { source: 'left', target: 'left', value: 1 },
    { source: 'left', target: 'right', value: 7 },
  ]);
  assert.deepEqual(
    chordEdgesToMatrix(chordMatrixToEdges(symmetric), { ids: symmetric.ids }),
    symmetric,
  );
});

test('funnel stages expose input/output/conversion/dropoff/cumulative meaning, neck geometry and non-overlapping outside labels', () => {
  const stages = funnelStages(
    [
      { id: 'visit', value: 100 },
      { id: 'trial', value: 60 },
      { id: 'paid', value: 20 },
    ],
    { neckWidth: 0.25, neckHeight: 0.34, labelGap: 0.08 },
  );
  assert.equal(stages[1].input, 100);
  assert.equal(stages[1].output, 60);
  assert.equal(stages[1].conversion, 0.6);
  assert.equal(stages[1].dropoff, 40);
  assert.equal(stages[2].cumulative, 0.2);
  assert.equal(stages.at(-1).bottomWidth, 0.25);
  assert.ok(
    stages.every(
      (stage, index) => index === 0 || stage.labelY - stages[index - 1].labelY >= 0.08 - 1e-9,
    ),
  );
  const dense = funnelStages(
    Array.from({ length: 20 }, (_, index) => ({
      id: `stage-${index}`,
      value: 20 - index,
    })),
    { labelGap: 0.08 },
  );
  assert.equal(new Set(dense.map(({ labelY }) => labelY)).size, 20);
  assert.ok(dense.every(({ labelY }) => labelY >= 0 && labelY <= 1));
  const denseGaps = dense.slice(1).map(({ labelY }, index) => labelY - dense[index].labelY);
  assert.ok(Math.min(...denseGaps) >= 1 / 19 - 1e-12);
});

test('parallel projection implements linear/log/ordinal axes, missing routes, invert/reorder and linked multi-brush filters', () => {
  const projection = projectParallelRows(
    [
      { linear: 0, log: 1, category: 'A' },
      { linear: 5, log: 10, category: 'B' },
      { linear: 10, log: 100, category: null },
    ],
    [
      { field: 'category', type: 'ordinal', missing: 'top' },
      { field: 'log', type: 'log', invert: true },
      { field: 'linear', type: 'linear' },
    ],
    [
      { field: 'linear', extents: [[0.4, 0.6]] },
      {
        field: 'category',
        extents: [
          [0.4, 0.6],
          [0.9, 1],
        ],
      },
    ],
    'intersection',
  );
  assert.deepEqual(
    projection.axes.map(({ field }) => field),
    ['category', 'log', 'linear'],
  );
  assert.equal(projection.rows[0].values.log, 1);
  assert.equal(projection.rows[2].values.category, 1);
  assert.deepEqual(
    projection.rows.map(({ selected }) => selected),
    [false, true, false],
  );
});

test('set analysis computes membership intersections, proportional circles, quality, queries and region hits', () => {
  const data = [
    { id: 'ab', sets: ['A', 'B'] },
    { id: 'a', sets: ['A'] },
    { id: 'b', sets: ['B'] },
    { id: 'abc', sets: ['A', 'B', 'C'] },
    { id: 'c', sets: ['C'] },
  ];
  const result = analyzeSets(data);
  assert.deepEqual(result.sets, [
    { id: 'A', size: 3 },
    { id: 'B', size: 3 },
    { id: 'C', size: 2 },
  ]);
  assert.equal(result.circles.length, 3);
  assert.ok(Number.isFinite(result.quality.stress));
  assert.deepEqual(querySetRegion(data, ['A', 'B'], ['C']), ['ab']);
  assert.ok(
    hitSetRegion(result.circles, { x: result.circles[0].x, y: result.circles[0].y }).includes('A'),
  );
  assert.throws(() => analyzeSets([{ id: 'x', sets: ['A', 'B', 'C', 'D'] }]), /two or three sets/);
});

test('set analysis accepts exact pre-aggregated intersection counts without materialized members', () => {
  const aggregate = analyzeSets([
    { sets: ['A'], size: 5 },
    { sets: ['B'], size: 3 },
    { sets: ['A', 'B'], size: 2, members: ['known-ab'] },
  ]);
  assert.deepEqual(aggregate.sets, [
    { id: 'A', size: 7 },
    { id: 'B', size: 5 },
  ]);
  assert.deepEqual(
    aggregate.intersections.map(({ sets, size, members }) => [sets, size, members]),
    [
      [['A'], 5, []],
      [['B'], 3, []],
      [['A', 'B'], 2, ['known-ab']],
    ],
  );
  const overlap = aggregate.quality.regions.find(({ sets }) => sets.join(',') === 'A,B');
  assert.ok(Math.abs(overlap.expected - 2 / 7) < 1e-12);
  assert.throws(() => analyzeSets([{ sets: ['A'], size: -1 }]), /must be non-negative/u);
  assert.throws(
    () =>
      analyzeSets([
        { id: 'x', sets: ['A'] },
        { sets: ['B'], size: 1 },
      ]),
    /either membership rows or pre-aggregated intersection rows/u,
  );
});

test('set solver preserves proportional areas and reports exact versus constrained quality', () => {
  const twoSet = analyzeSets([
    { id: 'a1', sets: ['A'] },
    { id: 'a2', sets: ['A'] },
    { id: 'a3', sets: ['A'] },
    { id: 'b1', sets: ['B'] },
    { id: 'ab', sets: ['A', 'B'] },
  ]);
  const circleA = twoSet.circles.find(({ id }) => id === 'A');
  const circleB = twoSet.circles.find(({ id }) => id === 'B');
  assert.ok(
    Math.abs((Math.PI * circleA.radius ** 2) / (Math.PI * circleB.radius ** 2) - 2) < 1e-12,
  );
  assert.ok(twoSet.quality.stress < 1e-12);
  assert.ok(twoSet.quality.maximumRelativeError < 1e-12);

  const feasibleThree = [];
  for (const id of ['a1', 'a2']) feasibleThree.push({ id, sets: ['A'] });
  for (const id of ['b1', 'b2']) feasibleThree.push({ id, sets: ['B'] });
  for (const id of ['c1', 'c2']) feasibleThree.push({ id, sets: ['C'] });
  feasibleThree.push(
    { id: 'ab', sets: ['A', 'B'] },
    { id: 'ac', sets: ['A', 'C'] },
    { id: 'bc', sets: ['B', 'C'] },
  );
  const threeSet = analyzeSets(feasibleThree);
  assert.ok(threeSet.quality.stress > 0);
  assert.ok(threeSet.quality.maximumRelativeError > 0);
  assert.ok(
    threeSet.quality.regions.find(({ sets }) => sets.join(',') === 'A,B,C').actual > 0,
    'three equal pairwise lenses necessarily create a triple-overlap error',
  );
  const [a, b, c] = threeSet.circles;
  assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(a.x - c.x, a.y - c.y)) < 1e-12);
  assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(b.x - c.x, b.y - c.y)) < 1e-12);

  const constrained = [];
  for (let index = 0; index < 5; index += 1) {
    constrained.push({ id: `ab-${index}`, sets: ['A', 'B'] });
    constrained.push({ id: `ac-${index}`, sets: ['A', 'C'] });
  }
  const imperfect = analyzeSets(constrained);
  assert.ok(imperfect.quality.stress > 0);
  assert.ok(imperfect.quality.maximumRelativeError > 0);
  assert.equal(imperfect.quality.regions.length, 7);
});

test('three-set solver distinguishes triple membership from pair-only atomic regions', () => {
  const tripleMembership = analyzeSets([
    { id: 'a', sets: ['A'] },
    { id: 'b', sets: ['B'] },
    { id: 'c', sets: ['C'] },
    { id: 'abc', sets: ['A', 'B', 'C'] },
  ]);
  const pairMembership = analyzeSets([
    { id: 'ab', sets: ['A', 'B'] },
    { id: 'ac', sets: ['A', 'C'] },
    { id: 'bc', sets: ['B', 'C'] },
  ]);
  const tripleRegion = (result) =>
    result.quality.regions.find(({ sets }) => sets.join(',') === 'A,B,C');
  assert.equal(tripleRegion(tripleMembership).expected, 0.5);
  assert.equal(tripleRegion(pairMembership).expected, 0);
  assert.notEqual(
    Number(tripleRegion(tripleMembership).actual.toFixed(6)),
    Number(tripleRegion(pairMembership).actual.toFixed(6)),
    'atomic triple targets must change the solved common-intersection area',
  );
  const distances = ({ circles }) =>
    circles.flatMap((circle, index) =>
      circles
        .slice(index + 1)
        .map((other) => Number(Math.hypot(circle.x - other.x, circle.y - other.y).toFixed(6))),
    );
  assert.notDeepEqual(distances(tripleMembership), distances(pairMembership));
  assert.ok(tripleMembership.quality.stress > 0);
  assert.ok(pairMembership.quality.stress > 0);
  assert.ok(
    tripleMembership.quality.regions.every(({ relativeError }) => Number.isFinite(relativeError)),
  );
});

test('shared text transform and word tree cover case, stopwords, stemming, n-grams, prefix/suffix/reverse and pruning', () => {
  assert.deepEqual(
    tokenizeWords('Running runners and running', {
      case: 'lower',
      stopwords: ['and'],
      stemming: 'simple-en',
      ngram: 2,
    }),
    ['runn runner', 'runner runn'],
  );
  const texts = ['data science grows', 'teams use data science', 'we like data science'];
  const prefix = buildWordTree(texts, 'data science', { direction: 'prefix', minimumCount: 1 });
  assert.equal(prefix[0].count, 3);
  assert.ok(prefix.some(({ token, count }) => token === 'grows' && count === 1));
  for (const direction of ['suffix', 'reverse']) {
    const backward = buildWordTree(texts, 'data science', { direction, maximumDepth: 4 });
    assert.equal(backward[0].count, 3);
    assert.ok(
      backward.some(
        ({ token, phrase, count, depth }) =>
          token === 'like' && phrase === 'like data science' && count === 1 && depth === 1,
      ),
    );
    assert.ok(
      backward.some(
        ({ token, phrase, count, depth }) =>
          token === 'we' && phrase === 'we like data science' && count === 1 && depth === 2,
      ),
      `${direction} preserves normal phrase order and traverses beyond one child level`,
    );
  }
});

test('word cloud is seeded, padded, rotation-bounded and collision-free', () => {
  const texts = ['alpha beta alpha gamma beta alpha delta epsilon zeta eta theta'];
  const options = {
    width: 420,
    height: 220,
    seed: 17,
    padding: 4,
    rotations: [0, 90],
    maximumWords: 20,
  };
  const first = layoutWordCloud(texts, options);
  const second = layoutWordCloud(texts, options);
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map(({ rotation }) => rotation).every((rotation) => rotation === 0 || rotation === 90),
    true,
  );
  for (let left = 0; left < first.length; left += 1) {
    const a = first[left];
    assert.ok(a.x - a.width / 2 >= 0 && a.x + a.width / 2 <= options.width);
    assert.ok(a.y - a.height / 2 >= 0 && a.y + a.height / 2 <= options.height);
    for (let right = left + 1; right < first.length; right += 1) {
      const b = first[right];
      const separated =
        Math.abs(a.x - b.x) * 2 >= a.width + b.width + options.padding * 2 ||
        Math.abs(a.y - b.y) * 2 >= a.height + b.height + options.padding * 2;
      assert.equal(separated, true, `${a.word} and ${b.word} do not overlap`);
    }
  }

  const angled = layoutWordCloud(
    [Array.from({ length: 80 }, (_, index) => `longword${index}`).join(' ')],
    { width: 640, height: 360, seed: 1, padding: 3, rotations: [45], maximumWords: 80 },
  );
  assert.ok(angled.length >= 3);
  assert.ok(angled.every(({ rotation }) => rotation === 45));
  for (let left = 0; left < angled.length; left += 1) {
    const first = angled[left];
    assert.ok(first.x - first.width / 2 >= 0 && first.x + first.width / 2 <= 640);
    assert.ok(first.y - first.height / 2 >= 0 && first.y + first.height / 2 <= 360);
    for (let right = left + 1; right < angled.length; right += 1) {
      const second = angled[right];
      assert.ok(
        Math.abs(first.x - second.x) * 2 >= first.width + second.width + 6 ||
          Math.abs(first.y - second.y) * 2 >= first.height + second.height + 6,
        `45-degree bounds overlap for ${first.word} and ${second.word}`,
      );
    }
  }
});

test('flow bands conserve one value scale across unequal columns and leave actual node gaps', () => {
  const flow = layoutFlow(
    [
      { source: 'Collected', target: 'Validated', value: 86 },
      { source: 'Collected', target: 'Review', value: 14 },
      { source: 'Validated', target: 'Aggregated', value: 58 },
      { source: 'Validated', target: 'Exploration', value: 28 },
    ],
    { iterations: 0 },
  );
  assert.equal(flow.nodes.length, 5);
  assert.equal(new Set(flow.nodes.map(({ x }) => x)).size, 3);
  const unit = flow.links[0].height / flow.links[0].value;
  for (const link of flow.links) assert.ok(Math.abs(link.height / link.value - unit) < 1e-12);
  for (const node of flow.nodes) {
    assert.ok(Math.abs(node.height / node.value - unit) < 1e-12);
    assert.ok(node.y - node.height / 2 >= -1e-12);
    assert.ok(node.y + node.height / 2 <= 1 + 1e-12);
  }
  const middle = flow.nodes.filter(({ column }) => column === 1).sort((a, b) => a.y - b.y);
  assert.ok(middle[1].y - middle[1].height / 2 > middle[0].y + middle[0].height / 2);
  assert.throws(
    () => layoutFlow([{ source: 'a', target: 'b', value: 1 }], { nodePadding: 0.3 }),
    /nodePadding/,
  );
});
