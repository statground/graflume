import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { compile } from '../dist/graflume.js';

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

    const common = {
      'data-scene-node': node.id,
      opacity: opacity(node),
    };

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
      })}/>`;
    }

    if (node.type === 'path') {
      if (node.points.length === 0) return '';
      const [first, ...remaining] = node.points;
      const commands = [
        `M ${number(first.x)} ${number(first.y)}`,
        ...remaining.map((point) => `L ${number(point.x)} ${number(point.y)}`),
        ...(node.closed ? ['Z'] : []),
      ].join(' ');
      return `<path${attributes({
        ...common,
        d: commands,
        fill: node.fill ?? 'none',
        stroke: node.stroke,
        'stroke-width': node.stroke === undefined ? undefined : number(node.lineWidth),
        'stroke-dasharray': dash(node),
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
  return {
    field,
    type,
    title,
    axis: { grid, tickCount: 5 },
  };
}

const monthly = [
  { month: 'Jan', actual: 42, target: 38, visitors: 21 },
  { month: 'Feb', actual: 51, target: 47, visitors: 29 },
  { month: 'Mar', actual: 49, target: 52, visitors: 27 },
  { month: 'Apr', actual: 63, target: 58, visitors: 38 },
  { month: 'May', actual: 71, target: 65, visitors: 46 },
  { month: 'Jun', actual: 68, target: 70, visitors: 51 },
];

const study = [
  { hours: 1, score: 52 },
  { hours: 1.7, score: 58 },
  { hours: 2.4, score: 61 },
  { hours: 3.2, score: 70 },
  { hours: 4.1, score: 76 },
  { hours: 4.8, score: 83 },
  { hours: 5.9, score: 88 },
  { hours: 6.8, score: 92 },
];

const snapshots = [
  {
    filename: 'bar.svg',
    width: 680,
    expected: { rect: 6 },
    spec: {
      data: monthly,
      title: { text: 'Monthly sales', subtitle: 'USD thousands' },
      mark: { type: 'bar', fill: '#2563eb', cornerRadius: 7, opacity: 0.94 },
      x: encoding('month', 'ordinal', 'Month', false),
      y: {
        ...encoding('actual', 'quantitative', 'Sales'),
        scale: { zero: true, nice: true },
      },
      accessibility: {
        label: 'Monthly sales bar chart',
        description: 'Six vertical bars compare sales from January through June.',
      },
    },
  },
  {
    filename: 'line.svg',
    width: 680,
    expected: { path: 1, circle: 6 },
    spec: {
      data: monthly,
      title: { text: 'Monthly sales trend', subtitle: 'Line chart with points' },
      mark: {
        type: 'line',
        stroke: '#f97316',
        fill: '#ffffff',
        lineWidth: 3,
        radius: 5,
        point: true,
      },
      x: encoding('month', 'ordinal', 'Month', false),
      y: {
        ...encoding('actual', 'quantitative', 'Sales'),
        scale: { zero: false, nice: true },
      },
      accessibility: {
        label: 'Monthly sales line chart',
        description: 'A connected line shows the sales trend from January through June.',
      },
    },
  },
  {
    filename: 'area.svg',
    width: 680,
    expected: { path: 1 },
    spec: {
      data: monthly,
      title: { text: 'Monthly visitors', subtitle: 'Area filled to the zero baseline' },
      mark: {
        type: 'area',
        fill: '#99f6e4',
        stroke: '#0f766e',
        lineWidth: 2.5,
        opacity: 0.78,
      },
      x: encoding('month', 'ordinal', 'Month', false),
      y: {
        ...encoding('visitors', 'quantitative', 'Visitors (thousands)'),
        scale: { zero: true, nice: true },
      },
      accessibility: {
        label: 'Monthly visitors area chart',
        description: 'The filled area shows visitor growth from January through June.',
      },
    },
  },
  {
    filename: 'scatter.svg',
    width: 680,
    expected: { circle: 8 },
    spec: {
      data: study,
      title: { text: 'Study time and score', subtitle: '8 observations' },
      mark: {
        type: 'point',
        fill: '#8b5cf6',
        stroke: '#ffffff',
        lineWidth: 2,
        radius: 7,
        opacity: 0.88,
      },
      x: {
        ...encoding('hours', 'quantitative', 'Study time (hours)'),
        scale: { zero: true, nice: true },
      },
      y: {
        ...encoding('score', 'quantitative', 'Score'),
        scale: { zero: false, nice: true },
      },
      accessibility: {
        label: 'Study time and score scatter chart',
        description: 'Eight points show higher scores as study time increases.',
      },
    },
  },
  {
    filename: 'combination.svg',
    width: 960,
    expected: { rect: 6, path: 1, circle: 6 },
    spec: {
      data: monthly,
      title: {
        text: 'Target and actual sales',
        subtitle: 'bar + line + point shared-scale composition',
      },
      layers: [
        {
          id: 'target',
          mark: { type: 'bar', fill: '#cbd5e1', cornerRadius: 7, opacity: 0.72 },
          x: encoding('month', 'ordinal', 'Month', false),
          y: {
            ...encoding('target', 'quantitative', 'Sales'),
            scale: { zero: true, nice: true },
          },
        },
        {
          id: 'actual',
          mark: {
            type: 'line',
            point: true,
            stroke: '#ef4444',
            fill: '#ffffff',
            lineWidth: 3,
            radius: 5,
          },
          x: encoding('month', 'ordinal', 'Month', false),
          y: {
            ...encoding('actual', 'quantitative', 'Sales'),
            scale: { zero: true, nice: true },
          },
        },
      ],
      accessibility: {
        label: 'Monthly target and actual sales combination chart',
        description: 'Target bars are overlaid with an actual-sales line and points.',
      },
    },
  },
];

await mkdir(outputDirectory, { recursive: true });
for (const snapshot of snapshots) {
  const { scene } = compile(snapshot.spec, { width: snapshot.width, height: 400 });
  const counts = countSceneTypes(scene.root);
  for (const [type, expectedCount] of Object.entries(snapshot.expected)) {
    assert.equal(counts.get(type), expectedCount, `${snapshot.filename}: unexpected ${type} count`);
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
  `${checkOnly ? 'Verified' : 'Rendered'} ${snapshots.length} chart guide snapshots from Graflume Scenes.`,
);
