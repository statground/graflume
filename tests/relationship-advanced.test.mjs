import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '../.tmp/src/complete.js';
import * as Graflume from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

function nodesFor(spec) {
  return flattenScene(compile({ width: 720, height: 440, ...spec }).scene.root);
}

test('relationship analytics and host editing helpers are public API', () => {
  for (const name of [
    'layoutHierarchy',
    'layoutFlow',
    'traverseFlowPath',
    'layoutNetwork',
    'moveNetworkNode',
    'selectNetworkNodes',
    'layoutChord',
    'funnelStages',
    'projectParallelRows',
    'analyzeSets',
    'querySetRegion',
    'hitSetRegion',
    'tokenizeWords',
    'buildWordTree',
    'layoutWordCloud',
  ]) {
    assert.equal(typeof Graflume[name], 'function', name);
  }
});

test('derived relationship tooltips become truthful semantic-index lineage', () => {
  const { scene } = compile({
    data: [
      { id: 'root', parent: null, value: 4 },
      { id: 'a', parent: 'root', value: 2 },
      { id: 'b', parent: 'root', value: 2 },
    ],
    mark: {
      type: 'tree',
      fields: { id: 'id', parent: 'parent', value: 'value' },
      options: { layout: 'circle-pack' },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const root = scene.semanticIndex.find(
    ({ role, datum }) =>
      role === 'tree-aggregate' && datum.kind === 'hierarchy-node' && datum.id === 'root',
  );
  assert.deepEqual(root.lineage.sourceRowIndices, [0, 1, 2]);
  assert.equal(root.lineage.truncated, false);
});

test('advanced relationship wrappers preserve every existing simple-mode compiler', () => {
  const cases = [
    {
      token: ':tree-node:',
      data: [
        { id: 'root', parent: null, value: 2 },
        { id: 'child', parent: 'root', value: 1 },
      ],
      mark: { type: 'tree', fields: { id: 'id', parent: 'parent' } },
      x: { field: 'id', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    {
      token: ':flow:',
      data: [{ source: 'A', target: 'B', value: 1 }],
      mark: { type: 'sankey', fields: { target: 'target' } },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    {
      token: ':graph-node:',
      data: [{ source: 'A', target: 'B' }],
      mark: { type: 'graph', fields: { source: 'source', target: 'target' } },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'target', type: 'nominal' },
    },
    {
      token: ':chord-segment:',
      data: [{ source: 'A', target: 'B', value: 1 }],
      mark: { type: 'chord', fields: { source: 'source', target: 'target', value: 'value' } },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'target', type: 'nominal' },
    },
    {
      token: ':funnel:',
      data: [{ stage: 'A', value: 1 }],
      mark: 'funnel',
      x: { field: 'stage', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    {
      token: ':parallel-row:',
      data: [{ a: 1, b: 2 }],
      mark: { type: 'parallel', options: { dimensions: ['a', 'b'] } },
      x: { field: 'a', type: 'quantitative' },
      y: { field: 'b', type: 'quantitative' },
    },
    {
      token: ':venn:',
      data: [{ set: 'A', value: 1 }],
      mark: 'venn',
      x: { field: 'set', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    {
      token: ':word:',
      data: [{ word: 'root', parent: '', value: 1 }],
      mark: { type: 'word-tree', fields: { parent: 'parent' } },
      x: { field: 'word', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    {
      token: ':word-cloud:',
      data: [{ word: 'alpha', value: 1 }],
      mark: 'word-cloud',
      x: { field: 'word', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
  ];
  for (const item of cases) {
    const { token, ...spec } = item;
    assert.ok(
      nodesFor(spec).some(({ id }) => id.includes(token)),
      token,
    );
  }
});

test('advanced flow compiler applies link value sorting to visible stack endpoints', () => {
  const spec = {
    data: [
      { id: 'large', source: 'a', target: 'c', value: 3 },
      { id: 'small', source: 'a', target: 'b', value: 1 },
    ],
    mark: {
      type: 'sankey',
      fields: { id: 'id', source: 'source', target: 'target', value: 'value' },
      options: { iterations: 0, linkSort: 'ascending' },
    },
    x: { field: 'source', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  };
  const links = nodesFor(spec).filter(({ id }) => id.includes(':flow-link:'));
  const small = links.find(({ id }) => id.endsWith(':small'));
  const large = links.find(({ id }) => id.endsWith(':large'));
  assert.ok(small.points[0].y < large.points[0].y);
  assert.equal(small.datum.tooltip.sourceLinkOrder, 0);
  assert.equal(large.datum.tooltip.sourceLinkOrder, 1);

  const reversed = nodesFor({
    ...spec,
    mark: { ...spec.mark, options: { iterations: 0, linkSort: 'descending' } },
  }).filter(({ id }) => id.includes(':flow-link:'));
  assert.ok(
    reversed.find(({ id }) => id.endsWith(':small')).points[0].y >
      reversed.find(({ id }) => id.endsWith(':large')).points[0].y,
  );
});

test('hierarchy compiler renders circle-pack, dendrogram, and radial layouts with navigation state', () => {
  const data = [
    { id: 'root', parent: null, label: 'Root', value: 8 },
    { id: 'branch', parent: 'root', label: 'Branch', value: 5 },
    { id: 'leaf', parent: 'branch', label: 'Leaf match', value: 3 },
    { id: 'other', parent: 'root', label: 'Other', value: 2 },
  ];
  for (const layout of ['circle-pack', 'dendrogram', 'radial-tree']) {
    const nodes = nodesFor({
      data,
      mark: {
        type: 'tree',
        fields: { id: 'id', parent: 'parent', label: 'label', value: 'value' },
        options: { layout, root: 'root', query: 'match', breadcrumbs: true },
      },
      x: { field: 'id', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    });
    const hierarchy = nodes.filter(({ id }) => id.includes(':hierarchy-node:'));
    assert.equal(hierarchy.length, 4, layout);
    assert.ok(hierarchy.every(({ datum }) => datum.tooltip.layout === layout));
    assert.ok(hierarchy.some(({ datum }) => datum.tooltip.matched === true));
    assert.deepEqual(
      hierarchy.find(({ datum }) => datum.tooltip.id === 'root').datum.tooltip.sourceRowIndices,
      [0, 1, 2, 3],
    );
    assert.ok(nodes.some(({ id }) => id.endsWith(':hierarchy-breadcrumbs')));
  }
  const collapsed = nodesFor({
    data,
    mark: {
      type: 'tree',
      fields: { id: 'id', parent: 'parent', value: 'value' },
      options: { layout: 'dendrogram', collapsed: ['branch'], zoomTo: 'root' },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  }).filter(({ id }) => id.includes(':hierarchy-node:'));
  assert.equal(collapsed.length, 3);
  assert.equal(
    collapsed.find(({ datum }) => datum.tooltip.id === 'branch').datum.tooltip.collapsed,
    true,
  );

  const navigationSpec = {
    data,
    mark: {
      type: 'tree',
      fields: { id: 'id', parent: 'parent', value: 'value' },
      options: { layout: 'circle-pack', root: 'root' },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  };
  const zoomed = nodesFor({
    ...navigationSpec,
    mark: {
      ...navigationSpec.mark,
      options: { ...navigationSpec.mark.options, zoomTo: 'branch' },
    },
  });
  const rerooted = nodesFor({
    ...navigationSpec,
    mark: {
      ...navigationSpec.mark,
      options: { ...navigationSpec.mark.options, root: 'branch' },
    },
  });
  const zoomNodes = zoomed.filter(({ id }) => id.includes(':hierarchy-node:'));
  const rerootNodes = rerooted.filter(({ id }) => id.includes(':hierarchy-node:'));
  assert.equal(zoomNodes.length, 4, 'zoom keeps the original hierarchy context');
  assert.equal(rerootNodes.length, 2, 'reroot changes the visible subtree');
  assert.ok(zoomNodes.every(({ datum }) => datum.tooltip.root === 'root'));
  assert.ok(zoomNodes.every(({ datum }) => datum.tooltip.zoomTo === 'branch'));
  assert.ok(zoomNodes[0].datum.tooltip.viewScale > 1);
  assert.ok(rerootNodes.every(({ datum }) => datum.tooltip.root === 'branch'));
  assert.equal(zoomed.find(({ id }) => id.endsWith(':hierarchy-breadcrumbs')).text, 'root');
  assert.equal(
    rerooted.find(({ id }) => id.endsWith(':hierarchy-breadcrumbs')).text,
    'root / branch',
  );
});

test('flow compiler supports multi-stage layout, cycle/balance metadata, authored positions and path traversal', () => {
  const nodes = nodesFor({
    data: [
      { edge: 'ab', source: 'A', target: 'B', value: 8 },
      { edge: 'bc', source: 'B', target: 'C', value: 6 },
      { edge: 'bd', source: 'B', target: 'D', value: 1 },
      { edge: 'ca', source: 'C', target: 'A', value: 1 },
    ],
    mark: {
      type: 'sankey',
      fields: { id: 'edge', source: 'source', target: 'target', value: 'value' },
      options: {
        alignment: 'justify',
        order: 'descending',
        iterations: 12,
        cycle: 'allow',
        balanceTolerance: 0,
        positions: { A: { x: 0.08, y: 0.2 } },
        pathStart: 'B',
        pathDirection: 'downstream',
      },
    },
    x: { field: 'source', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const flowNodes = nodes.filter(({ id }) => id.includes(':flow-node:'));
  const links = nodes.filter(({ id }) => id.includes(':flow-link:'));
  assert.equal(flowNodes.length, 4);
  assert.equal(links.length, 4);
  assert.ok(flowNodes.some(({ datum }) => datum.tooltip.cycles.length > 0));
  assert.ok(flowNodes.some(({ datum }) => datum.tooltip.balanced === false));
  assert.ok(links.some(({ datum }) => datum.tooltip.selectedPath === true));
  assert.ok(flowNodes.every(({ datum }) => datum.tooltip.draggable === true));
  assert.ok(flowNodes.every(({ datum }) => datum.familyInteraction.kind === 'flow-node'));
});

test('network compiler renders four layouts and directed multiedge/self-loop/compound/port interactions', () => {
  const data = [
    { node: 'group', source: 'a', target: 'b', edge: 'ab-1', weight: 2, directed: true },
    {
      node: 'a',
      parent: 'group',
      ports: ['east'],
      portAngle: 0,
      source: 'a',
      target: 'b',
      edge: 'ab-2',
      weight: 1,
      directed: true,
      sourcePort: 'east',
      targetPort: 'west',
    },
    {
      node: 'b',
      parent: 'group',
      ports: ['west'],
      portAngle: 180,
      source: 'b',
      target: 'c',
      edge: 'bc',
      weight: 1,
      directed: true,
    },
    { node: 'c', source: 'c', target: 'c', edge: 'cc', weight: 0.5, directed: true },
  ];
  const base = {
    data,
    mark: {
      type: 'graph',
      fields: {
        node: 'node',
        parent: 'parent',
        ports: 'ports',
        portAngle: 'portAngle',
        source: 'source',
        target: 'target',
        edgeId: 'edge',
        weight: 'weight',
        directed: 'directed',
        sourcePort: 'sourcePort',
        targetPort: 'targetPort',
      },
    },
    x: { field: 'source', type: 'nominal' },
    y: { field: 'target', type: 'nominal' },
  };
  for (const layout of ['force', 'radial', 'grid', 'dag']) {
    const filtered = layout === 'dag' ? data.filter(({ edge }) => edge !== 'cc') : data;
    const nodes = nodesFor({
      ...base,
      data: filtered,
      mark: {
        ...base.mark,
        options: {
          layout,
          routing: 'quadratic',
          directed: true,
          seed: 11,
          iterations: 30,
          positions: { a: { x: 0.2, y: 0.3, pinned: true } },
          lasso: [
            { x: 0, y: 0 },
            { x: 0.55, y: 0 },
            { x: 0.55, y: 0.7 },
            { x: 0, y: 0.7 },
          ],
        },
      },
    });
    assert.ok(
      nodes.some(({ id }) => id.includes(':network-node:')),
      layout,
    );
    assert.ok(
      nodes
        .filter(({ id }) => id.includes(':network-node:'))
        .every(({ datum }) => datum.tooltip.layout === layout),
    );
  }
  const nodes = nodesFor({
    ...base,
    mark: {
      ...base.mark,
      options: { layout: 'grid', routing: 'orthogonal', directed: true },
    },
  });
  const edges = nodes.filter(({ id }) => id.includes(':network-edge:'));
  assert.ok(
    nodes
      .filter(({ id }) => id.includes(':network-node:'))
      .every(({ datum }) => datum.familyInteraction.kind === 'network-node'),
  );
  assert.ok(edges.some(({ datum }) => datum.tooltip.multiedge === true));
  const parallelEdges = edges.filter(
    ({ datum }) => datum.tooltip.source === 'a' && datum.tooltip.target === 'b',
  );
  assert.equal(parallelEdges.length, 2);
  assert.notDeepEqual(parallelEdges[0].points, parallelEdges[1].points);
  assert.ok(edges.some(({ datum }) => datum.tooltip.selfLoop === true));
  assert.ok(edges.every(({ datum }) => datum.tooltip.directed === true));
  assert.equal(
    nodes.find(({ datum }) => datum?.tooltip?.id === 'group').datum.tooltip.compound,
    true,
  );
  assert.deepEqual(
    nodes.find(({ datum }) => datum?.tooltip?.id === 'group').datum.tooltip.sourceRowIndices,
    [0, 1, 2],
  );
  assert.ok(nodes.some(({ id }) => id.includes(':network-port:a:east')));
  assert.ok(nodes.some(({ id }) => id.includes(':network-arrow:')));
});

test('orthogonal horizontal multiedges occupy distinct Scene corridors', () => {
  const nodes = nodesFor({
    data: [
      { edge: 'first', source: 'left', target: 'right', weight: 1 },
      { edge: 'second', source: 'left', target: 'right', weight: 1 },
    ],
    mark: {
      type: 'graph',
      fields: { edgeId: 'edge', source: 'source', target: 'target', weight: 'weight' },
      options: {
        routing: 'orthogonal',
        positions: {
          left: { x: 0.15, y: 0.5, pinned: true },
          right: { x: 0.85, y: 0.5, pinned: true },
        },
      },
    },
    x: { field: 'source', type: 'nominal' },
    y: { field: 'target', type: 'nominal' },
  });
  const edges = nodes.filter(({ id }) => id.includes(':network-edge:'));
  assert.equal(edges.length, 2);
  assert.notEqual(edges[0].points[1].y, edges[1].points[1].y);
  assert.notEqual(edges[0].points[2].y, edges[1].points[2].y);
  assert.notEqual(edges[0].points[1].y, edges[0].points[0].y);
  assert.notEqual(edges[1].points[1].y, edges[1].points[0].y);
});

test('chord compiler exposes matrix/subgroup sorting and directed self-loop ribbons', () => {
  const nodes = nodesFor({
    data: [
      { source: 'A', target: 'B', value: 5 },
      { source: 'B', target: 'A', value: 2 },
      { source: 'A', target: 'A', value: 1 },
    ],
    mark: {
      type: 'chord',
      fields: { source: 'source', target: 'target', value: 'value' },
      options: {
        directed: true,
        padAngle: 0.04,
        groupOrder: 'descending',
        subgroupOrder: 'ascending',
        matrix: true,
      },
    },
    x: { field: 'source', type: 'nominal' },
    y: { field: 'target', type: 'nominal' },
  });
  const ribbons = nodes.filter(({ id }) => id.includes(':chord-ribbon:'));
  const groups = nodes.filter(({ id }) => id.includes(':chord-group:'));
  assert.equal(ribbons.length, 3);
  assert.ok(ribbons.every(({ datum }) => datum.tooltip.directed === true));
  assert.ok(ribbons.some(({ datum }) => datum.tooltip.selfLoop === true));
  assert.deepEqual(
    ribbons
      .filter(({ datum }) => datum.tooltip.source === 'A')
      .map(({ datum }) => [datum.tooltip.target, datum.tooltip.sourceSubgroupOrder]),
    [
      ['B', 1],
      ['A', 0],
    ],
  );
  assert.ok(
    ribbons.every(
      ({ datum }) =>
        datum.tooltip.sourceEndAngle >= datum.tooltip.sourceStartAngle &&
        datum.tooltip.targetEndAngle >= datum.tooltip.targetStartAngle,
    ),
  );
  assert.deepEqual(
    ribbons.find(({ datum }) => datum.tooltip.selfLoop === true).datum.tooltip.sourceRowIndices,
    [2],
  );
  assert.ok(groups.every(({ datum }) => Array.isArray(datum.tooltip.matrix)));
  assert.ok(nodes.some(({ id }) => id.includes(':chord-arrow:')));
});

test('chord compiler accepts a portable matrix with stable authored ids', () => {
  const nodes = nodesFor({
    data: [{ source: 'placeholder', target: 'placeholder', value: 0 }],
    mark: {
      type: 'chord',
      fields: { source: 'source', target: 'target', value: 'value' },
      options: {
        directed: true,
        matrixIds: ['North', 'South', 'West'],
        matrix: [
          [0, 4, 0],
          [1, 0, 2],
          [3, 0, 0],
        ],
      },
    },
    x: { field: 'source', type: 'nominal' },
    y: { field: 'target', type: 'nominal' },
  });
  const groups = nodes.filter(({ id }) => id.includes(':chord-group:'));
  const ribbons = nodes.filter(({ id }) => id.includes(':chord-ribbon:'));
  assert.deepEqual(
    groups.map(({ datum }) => [datum.tooltip.id, datum.tooltip.matrix]),
    [
      ['North', [0, 4, 0]],
      ['South', [1, 0, 2]],
      ['West', [3, 0, 0]],
    ],
  );
  assert.deepEqual(
    ribbons.map(({ datum }) => [datum.tooltip.source, datum.tooltip.target, datum.tooltip.value]),
    [
      ['North', 'South', 4],
      ['South', 'North', 1],
      ['South', 'West', 2],
      ['West', 'North', 3],
    ],
  );
});

test('funnel compiler renders neck geometry, exact stage semantics and collision-safe outside labels', () => {
  const nodes = nodesFor({
    data: [
      { stage: 'Visit', value: 100, order: 1 },
      { stage: 'Trial', value: 40, order: 2 },
      { stage: 'Paid', value: 10, order: 3 },
    ],
    mark: {
      type: 'funnel',
      fields: { stage: 'stage', value: 'value', order: 'order' },
      options: {
        sort: 'order',
        neckWidth: 0.24,
        neckHeight: 0.34,
        labelGap: 0.08,
        outsideLabels: true,
        semantics: 'conversion-dropoff-cumulative',
      },
    },
    x: { field: 'stage', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const stages = nodes.filter(({ id }) => id.includes(':funnel-stage:'));
  assert.equal(stages.length, 3);
  assert.equal(stages[1].datum.tooltip.conversion, 0.4);
  assert.deepEqual(stages[1].datum.tooltip.sourceRowIndices, [0, 1]);
  assert.equal(stages[2].datum.tooltip.cumulative, 0.1);
  assert.equal(stages[2].datum.tooltip.dropoff, 30);
  assert.ok(stages.every(({ datum }) => datum.tooltip.outsideLabel === true));
  assert.equal(nodes.filter(({ id }) => id.includes(':funnel-label-rule:')).length, 3);

  const dense = compile({
    width: 720,
    height: 440,
    data: Array.from({ length: 20 }, (_, index) => ({
      stage: `Stage ${index + 1}`,
      value: 20 - index,
    })),
    mark: {
      type: 'funnel',
      fields: { stage: 'stage', value: 'value' },
      options: { labelGap: 0.08, outsideLabels: true },
    },
    x: { field: 'stage', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const denseLabels = flattenScene(dense.scene.root).filter(({ id }) =>
    id.includes(':funnel-label:'),
  );
  const plot = dense.coordinates.plot;
  assert.equal(denseLabels.length, 20);
  assert.equal(new Set(denseLabels.map(({ y }) => y.toFixed(7))).size, 20);
  assert.ok(denseLabels.every(({ y }) => y >= plot.y && y <= plot.y + plot.height));
});

test('parallel compiler applies reordered log/inverted/missing axes and per-axis multi-brush selection', () => {
  const nodes = nodesFor({
    data: [
      { a: 1, b: 10, c: 'x', group: 'g1' },
      { a: 10, b: null, c: 'y', group: 'g2' },
      { a: 100, b: 90, c: 'x', group: 'g1' },
    ],
    mark: {
      type: 'parallel',
      fields: { group: 'group' },
      options: {
        axes: [
          { field: 'c', type: 'ordinal', domain: ['y', 'x'], invert: true },
          { field: 'a', type: 'log', domain: [1, 100] },
          { field: 'b', type: 'linear', domain: [0, 100], missing: 'gap' },
        ],
        brushes: [
          { field: 'a', extents: [[0, 0.6]] },
          { field: 'c', extents: [[0.4, 1]] },
        ],
        combine: 'intersection',
      },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  const paths = nodes.filter(({ id }) => id.includes(':parallel-row:'));
  assert.ok(paths.length >= 2);
  assert.ok(paths.some(({ datum }) => datum.tooltip.selected === true));
  assert.ok(paths.some(({ datum }) => datum.tooltip.selected === false));
  assert.ok(paths.every(({ datum }) => datum.tooltip.axes[0].startsWith('c:ordinal:inverted')));
  assert.equal(nodes.filter(({ id }) => id.includes(':parallel-brush:')).length, 2);
});

test('Venn compiler derives memberships, proportional quality, exact query and hit metadata', () => {
  const nodes = nodesFor({
    data: [
      { id: 'ab', sets: ['A', 'B'], value: 1 },
      { id: 'a', sets: ['A'], value: 1 },
      { id: 'bc', sets: ['B', 'C'], value: 1 },
      { id: 'abc', sets: ['A', 'B', 'C'], value: 1 },
    ],
    mark: {
      type: 'venn',
      fields: { id: 'id', sets: 'sets' },
      options: {
        proportional: true,
        quality: true,
        query: { included: ['A', 'B'], excluded: ['C'] },
      },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const sets = nodes.filter(({ id }) => id.includes(':venn-set:'));
  const regions = nodes.filter(({ id }) => id.includes(':venn-region:'));
  assert.equal(sets.length, 3);
  assert.ok(sets.every(({ datum }) => Number.isFinite(datum.tooltip.qualityStress)));
  assert.ok(sets.every(({ datum }) => Array.isArray(datum.tooltip.hitRegion)));
  assert.ok(regions.some(({ datum }) => datum.tooltip.queryMembers.includes('ab')));
  assert.ok(regions.every(({ datum }) => Array.isArray(datum.tooltip.sourceRowIndices)));

  const proportional = nodesFor({
    data: [
      { id: 'a1', sets: ['A'], value: 1 },
      { id: 'a2', sets: ['A'], value: 1 },
      { id: 'a3', sets: ['A'], value: 1 },
      { id: 'b1', sets: ['B'], value: 1 },
      { id: 'ab', sets: ['A', 'B'], value: 1 },
    ],
    mark: {
      type: 'venn',
      fields: { id: 'id', sets: 'sets' },
      options: { proportional: true, quality: true },
    },
    x: { field: 'id', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  }).filter(({ id }) => id.includes(':venn-set:'));
  const setA = proportional.find(({ datum }) => datum.tooltip.set === 'A');
  const setB = proportional.find(({ datum }) => datum.tooltip.set === 'B');
  assert.ok(Math.abs(setA.radius ** 2 / setB.radius ** 2 - 2) < 1e-12);
  assert.ok(proportional.every(({ datum }) => datum.tooltip.qualityStress < 1e-12));
  assert.ok(proportional.every(({ datum }) => datum.tooltip.maximumRelativeError < 1e-12));
});

test('Venn compiler consumes pre-aggregated intersection rows and preserves count provenance', () => {
  const nodes = nodesFor({
    data: [
      { sets: ['A'], count: 5 },
      { sets: ['B'], count: 3 },
      { sets: ['A', 'B'], count: 2 },
    ],
    mark: {
      type: 'venn',
      fields: { sets: 'sets', count: 'count' },
      options: { proportional: true, query: { included: ['A'], excluded: ['B'] } },
    },
    x: { field: 'sets', type: 'nominal' },
    y: { field: 'count', type: 'quantitative' },
  });
  const sets = nodes.filter(({ id }) => id.includes(':venn-set:'));
  const regions = nodes.filter(({ id }) => id.includes(':venn-region:'));
  assert.deepEqual(
    sets.map(({ datum }) => [datum.tooltip.set, datum.tooltip.size, datum.tooltip.input]),
    [
      ['A', 7, 'intersection'],
      ['B', 5, 'intersection'],
    ],
  );
  const overlap = regions.find(({ datum }) => datum.tooltip.sets.join(',') === 'A,B');
  assert.equal(overlap.datum.tooltip.size, 2);
  assert.equal(overlap.datum.tooltip.input, 'intersection');
  assert.deepEqual(overlap.datum.tooltip.sourceRowIndices, [2]);
  assert.equal(overlap.datum.tooltip.querySize, 5);
  assert.ok(nodes.find(({ id }) => id.endsWith(':venn-query')).text.includes('query count: 5'));
});

test('word-tree compiler tokenizes and aggregates prefix/suffix/reverse trees with pruning', () => {
  const data = [
    { text: 'data science grows quickly', value: 1 },
    { text: 'data science grows safely', value: 1 },
    { text: 'modern data science grows', value: 1 },
  ];
  for (const direction of ['prefix', 'suffix', 'reverse']) {
    const rootPhrase =
      direction === 'suffix' ? 'grows' : direction === 'reverse' ? 'grows' : 'data science';
    const nodes = nodesFor({
      data,
      mark: {
        type: 'word-tree',
        fields: { text: 'text' },
        options: {
          rootPhrase,
          direction,
          case: 'lower',
          stemming: 'simple-en',
          minimumCount: 1,
          maximumDepth: 3,
          maximumChildren: 2,
        },
      },
      x: { field: 'text', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    });
    const words = nodes.filter(({ id }) => id.includes(':word-tree-node:'));
    assert.ok(words.length >= 1, direction);
    assert.ok(words.every(({ datum }) => datum.tooltip.direction === direction));
    assert.ok(words.every(({ datum }) => datum.tooltip.maximumChildren === 2));
  }
});

test('word-cloud compiler has deterministic tokenizer/ngram/seed/padding/rotation Scene output', () => {
  const spec = {
    data: [
      { text: 'data science data platform', value: 1 },
      { text: 'data science visual analytics', value: 1 },
      { text: 'visual analytics platform', value: 1 },
    ],
    mark: {
      type: 'word-cloud',
      fields: { text: 'text' },
      options: {
        tokenize: true,
        case: 'lower',
        stopwords: ['the'],
        ngram: 2,
        seed: 17,
        padding: 4,
        rotations: [0, 90],
        minimumFrequency: 1,
        maximumWords: 20,
      },
    },
    x: { field: 'text', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  };
  const first = nodesFor(spec).filter(({ id }) => id.includes(':word-cloud-token:'));
  const second = nodesFor(spec).filter(({ id }) => id.includes(':word-cloud-token:'));
  assert.ok(first.length >= 3);
  assert.deepEqual(
    first.map(({ text, x, y, rotation }) => [text, x, y, rotation]),
    second.map(({ text, x, y, rotation }) => [text, x, y, rotation]),
  );
  assert.ok(first.every(({ rotation }) => rotation === 0 || rotation === 90));
  assert.ok(first.every(({ datum }) => datum.tooltip.ngram === 2));
  assert.ok(first.some(({ text }) => text.includes(' ')));
});

test('default Sankey keeps shared identities in three stages with filled proportional ribbons', () => {
  const spec = {
    data: [
      { source: 'Collected', target: 'Validated', value: 86 },
      { source: 'Collected', target: 'Review', value: 14 },
      { source: 'Validated', target: 'Aggregated', value: 58 },
      { source: 'Validated', target: 'Exploration', value: 28 },
    ],
    mark: { type: 'sankey', fields: { target: 'target' } },
    x: { field: 'source', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  };
  const nodes = nodesFor(spec);
  const blocks = nodes.filter(({ id }) => id.includes(':flow-node:'));
  const bands = nodes.filter(({ id }) => id.includes(':flow-link:'));
  assert.equal(blocks.length, 5);
  assert.equal(new Set(blocks.map(({ x }) => x)).size, 3);
  assert.equal(blocks.filter(({ datum }) => datum.tooltip.id === 'Validated').length, 1);
  assert.equal(bands.length, 4);
  for (const band of bands) {
    assert.equal(band.closed, true);
    assert.equal(band.points.length, 26);
    assert.ok(band.fill);
    assert.ok(band.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
    assert.ok(
      Math.abs(band.points[25].y - band.points[0].y - (band.points[13].y - band.points[12].y)) <
        1e-9,
    );
  }
  assert.throws(
    () =>
      nodesFor({
        ...spec,
        data: [
          { source: 'A', target: 'B', value: 1 },
          { source: 'B', target: 'A', value: 1 },
        ],
      }),
    /cycle/i,
  );
});
