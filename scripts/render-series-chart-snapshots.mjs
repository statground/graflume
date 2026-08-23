import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import {
  compile,
  seriesChartTypeCatalog,
  seriesChartVariantCatalog,
} from '../dist/graflume.complete.js';
import { seriesSampleSpec } from './series-samples.mjs';

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
      opacity: node.opacity === 1 ? undefined : number(node.opacity),
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
        'stroke-dasharray': node.dash?.join(' '),
        'stroke-linecap': node.lineCap,
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
        'stroke-dasharray': node.dash?.join(' '),
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

await mkdir(outputDirectory, { recursive: true });

const snapshotEntries = [
  ...new Map(
    [...seriesChartVariantCatalog, ...seriesChartTypeCatalog].map((entry) => [entry.id, entry]),
  ).values(),
];

for (const entry of snapshotEntries) {
  const { scene } = compile(seriesSampleSpec(entry), { width: 760, height: 440 });
  assert.ok(scene.metadata.renderedNodeCount > 3, `${entry.id} produced a non-empty Scene`);
  const output = renderScene(scene);
  const url = new URL(`${entry.id}.svg`, outputDirectory);
  if (checkOnly) {
    const existing = await readFile(url, 'utf8');
    assert.equal(existing, output, `${entry.id}.svg is current`);
  } else {
    await writeFile(url, output, 'utf8');
  }
}

console.log(
  `${checkOnly ? 'Verified' : 'Rendered'} ${snapshotEntries.length} family and preset series snapshots.`,
);
