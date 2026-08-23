import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { fullVariantCatalog } from '../dist/graflume.complete.js';
import { seriesSampleSpec } from './series-samples.mjs';

const compile = await loadCompile();

async function loadCompile() {
  const candidates = ['../dist/graflume.complete.js', '../.tmp/src/complete.js'];
  for (const candidate of candidates) {
    try {
      const module = await import(new URL(candidate, import.meta.url));
      return module.compile;
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    }
  }
  throw new Error(
    'Build the complete entry point or compile the test sources before rendering snapshots.',
  );
}

const outputDirectory = new URL('../docs/assets/charts/', import.meta.url);
const checkOnly = process.argv.includes('--check');

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function number(value) {
  return Number(value.toFixed(3));
}

function attributes(values) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
    .join('');
}

function opacity(node) {
  return node.opacity === 1 ? undefined : number(node.opacity);
}

function dash(node) {
  return node.dash === undefined || node.dash.length === 0 ? undefined : node.dash.join(' ');
}

function textAnchor(align) {
  if (align === 'center') return 'middle';
  if (align === 'right' || align === 'end') return 'end';
  return 'start';
}

function dominantBaseline(baseline) {
  if (baseline === 'top' || baseline === 'hanging') return 'text-before-edge';
  if (baseline === 'middle') return 'central';
  if (baseline === 'bottom' || baseline === 'ideographic') return 'text-after-edge';
  return 'alphabetic';
}

function renderScene(scene) {
  const clipDefinitions = [];
  let clipIndex = 0;

  function renderNode(node) {
    if (!node.visible || node.opacity <= 0) return '';
    const common = { 'data-scene-node': node.id, opacity: opacity(node) };

    if (node.type === 'group') {
      const children = [...node.children]
        .sort((left, right) => left.zIndex - right.zIndex)
        .map(renderNode)
        .join('');
      let clipPath;
      if (node.clip !== undefined) {
        clipIndex += 1;
        const id = `clip-${clipIndex}`;
        clipDefinitions.push(
          `<clipPath id="${id}"><rect${attributes({
            x: number(node.clip.x),
            y: number(node.clip.y),
            width: number(node.clip.width),
            height: number(node.clip.height),
          })}/></clipPath>`,
        );
        clipPath = `url(#${id})`;
      }
      return `<g${attributes({ ...common, 'clip-path': clipPath })}>${children}</g>`;
    }

    if (node.type === 'line') {
      return `<line${attributes({
        ...common,
        x1: number(node.x1),
        y1: number(node.y1),
        x2: number(node.x2),
        y2: number(node.y2),
        fill: 'none',
        stroke: node.stroke,
        'stroke-width': number(node.lineWidth),
        'stroke-dasharray': dash(node),
        'stroke-linecap': node.lineCap,
      })}/>`;
    }

    if (node.type === 'path') {
      const commands = [node.points, ...(node.subpaths ?? [])]
        .filter((points) => points.length > 0)
        .map(([first, ...remaining]) =>
          [
            `M ${number(first.x)} ${number(first.y)}`,
            ...remaining.map((point) => `L ${number(point.x)} ${number(point.y)}`),
            ...(node.closed ? ['Z'] : []),
          ].join(' '),
        )
        .join(' ');
      if (commands.length === 0) return '';
      return `<path${attributes({
        ...common,
        d: commands,
        fill: node.fill ?? 'none',
        'fill-rule': node.fillRule,
        stroke: node.stroke,
        'stroke-width': node.stroke === undefined ? undefined : number(node.lineWidth),
        'stroke-dasharray': dash(node),
        'stroke-linecap': node.lineCap,
        'stroke-linejoin': node.lineJoin,
      })}/>`;
    }

    if (node.type === 'rect') {
      const radius = Math.max(
        0,
        Math.min(node.cornerRadius, Math.abs(node.width) / 2, Math.abs(node.height) / 2),
      );
      return `<rect${attributes({
        ...common,
        x: number(node.x),
        y: number(node.y),
        width: number(node.width),
        height: number(node.height),
        rx: number(radius),
        fill: node.fill ?? 'none',
        stroke: node.stroke,
        'stroke-width': node.stroke === undefined ? undefined : number(node.lineWidth),
        'stroke-dasharray': dash(node),
      })}/>`;
    }

    if (node.type === 'circle') {
      return `<circle${attributes({
        ...common,
        cx: number(node.cx),
        cy: number(node.cy),
        r: number(node.radius),
        fill: node.fill ?? 'none',
        stroke: node.stroke,
        'stroke-width': node.stroke === undefined ? undefined : number(node.lineWidth),
      })}/>`;
    }

    const transform =
      node.rotation === 0
        ? undefined
        : `rotate(${number(node.rotation)} ${number(node.x)} ${number(node.y)})`;
    return `<text${attributes({
      ...common,
      x: number(node.x),
      y: number(node.y),
      fill: node.fill,
      'font-family': node.fontFamily,
      'font-size': number(node.fontSize),
      'font-weight': node.fontWeight,
      'font-style': node.fontStyle,
      'text-anchor': textAnchor(node.align),
      'dominant-baseline': dominantBaseline(node.baseline),
      transform,
    })}>${escapeXml(node.text)}</text>`;
  }

  const body = renderNode(scene.root);
  const description = scene.accessibility.description ?? scene.accessibility.label;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-labelledby="title description">`,
    `<title id="title">${escapeXml(scene.accessibility.label)}</title>`,
    `<desc id="description">${escapeXml(description)}</desc>`,
    '<metadata>Generated from the Graflume compile() Scene using Canvas-equivalent primitives.</metadata>',
    `<defs>${clipDefinitions.join('')}</defs>`,
    `<rect width="100%" height="100%" fill="${escapeXml(scene.background)}"/>`,
    body,
    '</svg>',
    '',
  ].join('\n');
}

function countSceneTypes(root) {
  const counts = new Map();
  const visit = (node) => {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    if (node.type === 'group') node.children.forEach(visit);
  };
  visit(root);
  return counts;
}

function encoding(field, type, title, grid = true) {
  return { field, type, title, axis: { grid, tickCount: 5 } };
}

const snapshots = [
  {
    filename: 'radar.svg',
    minimum: { path: 6, circle: 6, text: 3 },
    spec: {
      data: [
        { indicator: 'Speed', series: 'Alpha', value: 82 },
        { indicator: 'Quality', series: 'Alpha', value: 74 },
        { indicator: 'Reach', series: 'Alpha', value: 91 },
        { indicator: 'Speed', series: 'Beta', value: 66 },
        { indicator: 'Quality', series: 'Beta', value: 88 },
        { indicator: 'Reach', series: 'Beta', value: 69 },
      ],
      title: { text: 'Capability profile', subtitle: 'Two series across three indicators' },
      mark: { type: 'radar', fields: { series: 'series' }, options: { rings: 5 } },
      x: encoding('indicator', 'nominal', 'Indicator', false),
      y: encoding('value', 'quantitative', 'Score'),
      accessibility: { label: 'Radar chart comparing Alpha and Beta capability scores' },
    },
  },
  {
    filename: 'tree.svg',
    minimum: { rect: 5, path: 4, text: 5 },
    spec: {
      data: [
        { id: 'Platform', parent: '', value: 12 },
        { id: 'Data', parent: 'Platform', value: 9 },
        { id: 'Design', parent: 'Platform', value: 7 },
        { id: 'Runtime', parent: 'Data', value: 5 },
        { id: 'Guides', parent: 'Design', value: 4 },
      ],
      title: { text: 'Product hierarchy', subtitle: 'Parent-child tree layout' },
      mark: { type: 'tree', fields: { parent: 'parent' } },
      x: encoding('id', 'nominal', 'Node', false),
      y: encoding('value', 'quantitative', 'Weight'),
      accessibility: { label: 'Product hierarchy tree chart' },
    },
  },
  {
    filename: 'graph.svg',
    minimum: { line: 5, circle: 5, text: 5 },
    spec: {
      data: [
        { source: 'API', target: 'Compiler', value: 8 },
        { source: 'Compiler', target: 'Scene', value: 7 },
        { source: 'Scene', target: 'Canvas', value: 6 },
        { source: 'Scene', target: 'SVG', value: 4 },
        { source: 'Data', target: 'Compiler', value: 5 },
      ],
      title: { text: 'Runtime dependencies', subtitle: 'Circular graph layout' },
      mark: { type: 'graph', fields: { target: 'target' } },
      x: encoding('source', 'nominal', 'Source', false),
      y: encoding('value', 'quantitative', 'Weight'),
      accessibility: { label: 'Runtime dependency graph chart' },
    },
  },
  {
    filename: 'chord.svg',
    minimum: { path: 8, text: 4 },
    spec: {
      data: [
        { source: 'North', target: 'East', value: 12 },
        { source: 'East', target: 'South', value: 8 },
        { source: 'South', target: 'West', value: 6 },
        { source: 'West', target: 'North', value: 10 },
      ],
      title: { text: 'Regional exchange', subtitle: 'Weighted relationships around a circle' },
      mark: { type: 'chord', fields: { target: 'target' } },
      x: encoding('source', 'nominal', 'Source', false),
      y: encoding('value', 'quantitative', 'Flow'),
      accessibility: { label: 'Regional exchange chord diagram' },
    },
  },
  {
    filename: 'funnel.svg',
    minimum: { path: 4, text: 4 },
    spec: {
      data: [
        { stage: 'Visits', value: 100 },
        { stage: 'Trials', value: 68 },
        { stage: 'Paid', value: 31 },
        { stage: 'Renewed', value: 21 },
      ],
      title: { text: 'Conversion funnel', subtitle: 'Ordered stages by remaining volume' },
      mark: { type: 'funnel' },
      x: encoding('stage', 'ordinal', 'Stage', false),
      y: encoding('value', 'quantitative', 'Users'),
      accessibility: { label: 'Conversion funnel chart' },
    },
  },
  {
    filename: 'parallel.svg',
    minimum: { line: 3, path: 4, text: 3 },
    spec: {
      data: [
        { product: 'A', speed: 82, quality: 71, cost: 43 },
        { product: 'B', speed: 64, quality: 91, cost: 58 },
        { product: 'C', speed: 73, quality: 79, cost: 36 },
        { product: 'D', speed: 91, quality: 68, cost: 77 },
      ],
      title: { text: 'Product trade-offs', subtitle: 'Three normalized dimensions' },
      mark: { type: 'parallel', options: { dimensions: ['speed', 'quality', 'cost'] } },
      x: encoding('product', 'nominal', 'Product', false),
      y: encoding('speed', 'quantitative', 'Speed'),
      accessibility: { label: 'Product trade-off parallel coordinates chart' },
    },
  },
  {
    filename: 'boxplot.svg',
    minimum: { rect: 4, line: 16 },
    spec: {
      data: [
        { group: 'A', min: 8, q1: 12, median: 18, q3: 23, max: 31 },
        { group: 'B', min: 11, q1: 17, median: 21, q3: 27, max: 35 },
        { group: 'C', min: 6, q1: 14, median: 19, q3: 25, max: 30 },
        { group: 'D', min: 14, q1: 19, median: 24, q3: 29, max: 38 },
      ],
      title: { text: 'Response distribution', subtitle: 'Min, quartiles, median, and max' },
      mark: {
        type: 'boxplot',
        fields: { min: 'min', q1: 'q1', median: 'median', q3: 'q3', max: 'max' },
      },
      x: encoding('group', 'nominal', 'Group', false),
      y: encoding('median', 'quantitative', 'Response'),
      accessibility: { label: 'Response distribution boxplot chart' },
    },
  },
  {
    filename: 'effect-scatter.svg',
    minimum: { circle: 12 },
    spec: {
      data: [
        { x: 1, y: 4, size: 12 },
        { x: 2, y: 8, size: 28 },
        { x: 3, y: 6, size: 19 },
        { x: 4, y: 10, size: 36 },
      ],
      title: { text: 'Highlighted observations', subtitle: 'Static emphasis rings around points' },
      mark: { type: 'effect-scatter', fields: { size: 'size' }, options: { rings: 2 } },
      x: encoding('x', 'quantitative', 'Input'),
      y: encoding('y', 'quantitative', 'Output'),
      accessibility: { label: 'Highlighted observation scatter chart' },
    },
  },
  {
    filename: 'lines.svg',
    minimum: { path: 6 },
    spec: {
      data: [
        { x: 1, y: 2, x2: 4, y2: 8, value: 3 },
        { x: 2, y: 7, x2: 5, y2: 3, value: 7 },
        { x: 3, y: 4, x2: 6, y2: 9, value: 5 },
      ],
      title: { text: 'Directed connections', subtitle: 'Curved weighted paths with arrowheads' },
      mark: {
        type: 'lines',
        fields: { x2: 'x2', y2: 'y2', value: 'value' },
        options: { curvature: 0.18 },
      },
      x: encoding('x', 'quantitative', 'Start / end x'),
      y: encoding('y', 'quantitative', 'Start / end y'),
      accessibility: { label: 'Directed connection lines chart' },
    },
  },
  {
    filename: 'heatmap.svg',
    minimum: { rect: 12, text: 12 },
    spec: {
      data: [
        { day: 'Mon', hour: 'AM', value: 12 },
        { day: 'Mon', hour: 'PM', value: 32 },
        { day: 'Tue', hour: 'AM', value: 20 },
        { day: 'Tue', hour: 'PM', value: 48 },
        { day: 'Wed', hour: 'AM', value: 34 },
        { day: 'Wed', hour: 'PM', value: 28 },
        { day: 'Thu', hour: 'AM', value: 42 },
        { day: 'Thu', hour: 'PM', value: 55 },
        { day: 'Fri', hour: 'AM', value: 25 },
        { day: 'Fri', hour: 'PM', value: 46 },
        { day: 'Sat', hour: 'AM', value: 18 },
        { day: 'Sat', hour: 'PM', value: 37 },
      ],
      title: { text: 'Activity intensity', subtitle: 'Day and period matrix' },
      mark: { type: 'heatmap', fields: { value: 'value' } },
      x: encoding('day', 'ordinal', 'Day', false),
      y: encoding('hour', 'ordinal', 'Period', false),
      accessibility: { label: 'Activity intensity heatmap' },
    },
  },
  {
    filename: 'pictorial-bar.svg',
    minimum: { path: 12 },
    spec: {
      data: [
        { category: 'Alpha', value: 24 },
        { category: 'Beta', value: 41 },
        { category: 'Gamma', value: 33 },
        { category: 'Delta', value: 18 },
      ],
      title: { text: 'Symbol totals', subtitle: 'Repeated diamonds encode magnitude' },
      mark: {
        type: 'pictorial-bar',
        options: { symbol: 'diamond', symbolSize: 12, maxSymbols: 12 },
      },
      x: encoding('category', 'ordinal', 'Category', false),
      y: encoding('value', 'quantitative', 'Value'),
      accessibility: { label: 'Symbol-based pictorial bar chart' },
    },
  },
  {
    filename: 'theme-river.svg',
    minimum: { path: 3 },
    spec: {
      data: [
        { date: '2026-01-01', category: 'Search', value: 18 },
        { date: '2026-01-01', category: 'Direct', value: 11 },
        { date: '2026-01-01', category: 'Referral', value: 7 },
        { date: '2026-02-01', category: 'Search', value: 25 },
        { date: '2026-02-01', category: 'Direct', value: 16 },
        { date: '2026-02-01', category: 'Referral', value: 12 },
        { date: '2026-03-01', category: 'Search', value: 19 },
        { date: '2026-03-01', category: 'Direct', value: 23 },
        { date: '2026-03-01', category: 'Referral', value: 15 },
        { date: '2026-04-01', category: 'Search', value: 27 },
        { date: '2026-04-01', category: 'Direct', value: 18 },
        { date: '2026-04-01', category: 'Referral', value: 10 },
      ],
      title: { text: 'Traffic mix over time', subtitle: 'Centered stacked river bands' },
      mark: { type: 'theme-river', fields: { category: 'category' } },
      x: encoding('date', 'temporal', 'Month', false),
      y: encoding('value', 'quantitative', 'Traffic'),
      accessibility: { label: 'Traffic mix theme river chart' },
    },
  },
  {
    filename: 'sunburst.svg',
    minimum: { path: 7, text: 4 },
    spec: {
      data: [
        { id: 'All', parent: '', value: 100 },
        { id: 'Data', parent: 'All', value: 58 },
        { id: 'Design', parent: 'All', value: 42 },
        { id: 'Tables', parent: 'Data', value: 25 },
        { id: 'Charts', parent: 'Data', value: 33 },
        { id: 'Themes', parent: 'Design', value: 20 },
        { id: 'Guides', parent: 'Design', value: 22 },
      ],
      title: { text: 'Capability hierarchy', subtitle: 'Nested angular partitions' },
      mark: { type: 'sunburst', fields: { parent: 'parent' } },
      x: encoding('id', 'nominal', 'Node', false),
      y: encoding('value', 'quantitative', 'Value'),
      accessibility: { label: 'Capability hierarchy sunburst chart' },
    },
  },
  {
    filename: 'custom.svg',
    minimum: { circle: 1, path: 1, rect: 1, text: 3 },
    spec: {
      data: [
        { x: 1, y: 5, shape: 'circle', size: 14, label: 'A' },
        { x: 2, y: 8, shape: 'diamond', size: 20, label: 'B' },
        { x: 3, y: 4, shape: 'round-rect', size: 18, label: 'C' },
      ],
      title: { text: 'Declarative primitives', subtitle: 'Function-free row-level shapes' },
      mark: {
        type: 'custom',
        fields: { shape: 'shape', size: 'size', label: 'label' },
      },
      x: encoding('x', 'quantitative', 'X'),
      y: encoding('y', 'quantitative', 'Y'),
      accessibility: { label: 'Declarative custom primitive chart' },
    },
  },
];

const graphSnapshot = snapshots.find((snapshot) => snapshot.filename === 'graph.svg');
assert.ok(graphSnapshot, 'graph representative exists');
snapshots.push({ ...graphSnapshot, filename: 'network.svg' });

const expanded2dSnapshotIds = new Set([
  'distribution',
  'histogram-2d',
  'histogram-2d-contour',
  'violin',
  'polar',
  'polar-line',
  'polar-scatter',
  'polar-bar',
  'image',
  'ternary',
  'smith',
  'scatter-matrix',
  'carpet',
  'carpet-scatter',
  'carpet-contour',
  'icicle',
  'funnel-area',
  'parallel-categories',
  'gauge-number',
  'gauge-delta',
  'gauge-bullet',
]);
for (const entry of fullVariantCatalog) {
  if (!expanded2dSnapshotIds.has(entry.id)) continue;
  snapshots.push({ filename: `${entry.id}.svg`, minimum: {}, spec: seriesSampleSpec(entry) });
}

await mkdir(outputDirectory, { recursive: true });
for (const snapshot of snapshots) {
  let scene;
  try {
    ({ scene } = compile(snapshot.spec, { width: 680, height: 400 }));
  } catch (error) {
    throw new Error(`${snapshot.filename}: ${error instanceof Error ? error.message : error}`, {
      cause: error,
    });
  }
  const counts = countSceneTypes(scene.root);
  for (const [type, minimumCount] of Object.entries(snapshot.minimum)) {
    assert.ok(
      (counts.get(type) ?? 0) >= minimumCount,
      `${snapshot.filename}: expected at least ${minimumCount} ${type} nodes`,
    );
  }
  const markup = renderScene(scene);
  assert.doesNotMatch(markup, /(?:NaN|undefined)/, `${snapshot.filename}: invalid SVG value`);
  const destination = new URL(snapshot.filename, outputDirectory);
  if (checkOnly) {
    const current = await readFile(destination, 'utf8').catch(() => '');
    assert.equal(
      current,
      markup,
      `${snapshot.filename} is stale; run npm run docs:snapshots and commit the result`,
    );
  } else {
    await writeFile(destination, markup, 'utf8');
  }
}

console.log(
  `${checkOnly ? 'Verified' : 'Rendered'} ${snapshots.length} additional chart guide snapshots from Graflume Scenes.`,
);
