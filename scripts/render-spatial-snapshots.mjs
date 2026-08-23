import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { compileSpatial } from '../dist/graflume.spatial.js';
import { spatialSampleSpecs } from './spatial-samples.mjs';

const outputDirectory = new URL('../docs/assets/spatial/', import.meta.url);
const checkOnly = process.argv.includes('--check');
const width = 720;
const height = 420;
const padding = 36;

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function transformed([x, y, z]) {
  const yaw = -0.67;
  const pitch = 0.48;
  const xzX = x * Math.cos(yaw) - z * Math.sin(yaw);
  const xzZ = x * Math.sin(yaw) + z * Math.cos(yaw);
  return [
    xzX,
    y * Math.cos(pitch) - xzZ * Math.sin(pitch),
    y * Math.sin(pitch) + xzZ * Math.cos(pitch),
  ];
}

function rgba(colors, vertex) {
  const offset = vertex * 4;
  const red = Math.round((colors[offset] ?? 0.31) * 255);
  const green = Math.round((colors[offset + 1] ?? 0.275) * 255);
  const blue = Math.round((colors[offset + 2] ?? 0.898) * 255);
  const alpha = Number((colors[offset + 3] ?? 1).toFixed(3));
  return `rgba(${red},${green},${blue},${alpha})`;
}

function renderScene(scene) {
  const projectedSource = scene.geometries.flatMap((geometry) => {
    const points = [];
    for (let index = 0; index < geometry.positions.length; index += 3) {
      points.push(
        transformed([
          geometry.positions[index],
          geometry.positions[index + 1],
          geometry.positions[index + 2],
        ]),
      );
    }
    return points;
  });
  const minX = Math.min(...projectedSource.map(([x]) => x));
  const maxX = Math.max(...projectedSource.map(([x]) => x));
  const minY = Math.min(...projectedSource.map(([, y]) => y));
  const maxY = Math.max(...projectedSource.map(([, y]) => y));
  const scale = Math.min(
    (width - padding * 2) / Math.max(0.001, maxX - minX),
    (height - padding * 2) / Math.max(0.001, maxY - minY),
  );
  const project = (point) => {
    const [x, y, depth] = transformed(point);
    return [padding + (x - minX) * scale, height - padding - (y - minY) * scale, depth];
  };
  const shapes = [];
  for (const [geometryIndex, geometry] of scene.geometries.entries()) {
    const indices = geometry.indices === undefined ? null : Array.from(geometry.indices);
    if (geometry.primitive === 'triangles') {
      const count = indices === null ? geometry.positions.length / 9 : indices.length / 3;
      if ((geometry.id.endsWith(':ocean') || geometry.id.endsWith(':land')) && count > 2_000) {
        const commands = [];
        for (let triangle = 0; triangle < count; triangle += 1) {
          const vertices = [0, 1, 2].map(
            (offset) => indices?.[triangle * 3 + offset] ?? triangle * 3 + offset,
          );
          const points = vertices.map((vertex) =>
            project([
              geometry.positions[vertex * 3],
              geometry.positions[vertex * 3 + 1],
              geometry.positions[vertex * 3 + 2],
            ]),
          );
          commands.push(
            `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}L${points[1][0].toFixed(1)},${points[1][1].toFixed(1)}L${points[2][0].toFixed(1)},${points[2][1].toFixed(1)}Z`,
          );
        }
        shapes.push({
          layer: geometryIndex,
          depth: 0,
          markup: `<path data-compiled-geometry="${escapeXml(geometry.id)}" d="${commands.join('')}" fill="${rgba(geometry.colors, 0)}"/>`,
        });
        continue;
      }
      const stride = Math.max(1, Math.ceil(count / 500));
      for (let triangle = 0; triangle < count; triangle += stride) {
        const vertices = [0, 1, 2].map(
          (offset) => indices?.[triangle * 3 + offset] ?? triangle * 3 + offset,
        );
        const points = vertices.map((vertex) =>
          project([
            geometry.positions[vertex * 3],
            geometry.positions[vertex * 3 + 1],
            geometry.positions[vertex * 3 + 2],
          ]),
        );
        shapes.push({
          layer: geometryIndex,
          depth: points.reduce((total, point) => total + point[2], 0) / 3,
          markup: `<polygon data-compiled-geometry="${escapeXml(geometry.id)}" points="${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}" fill="${rgba(geometry.colors, vertices[0])}" stroke="rgba(15,23,42,.12)" stroke-width=".45"/>`,
        });
      }
    } else if (geometry.primitive === 'lines') {
      const count = indices === null ? geometry.positions.length / 6 : indices.length / 2;
      const stride = Math.max(1, Math.ceil(count / 700));
      for (let line = 0; line < count; line += stride) {
        const vertices = [0, 1].map((offset) => indices?.[line * 2 + offset] ?? line * 2 + offset);
        const points = vertices.map((vertex) =>
          project([
            geometry.positions[vertex * 3],
            geometry.positions[vertex * 3 + 1],
            geometry.positions[vertex * 3 + 2],
          ]),
        );
        shapes.push({
          layer: geometryIndex,
          depth: (points[0][2] + points[1][2]) / 2,
          markup: `<line data-compiled-geometry="${escapeXml(geometry.id)}" x1="${points[0][0].toFixed(2)}" y1="${points[0][1].toFixed(2)}" x2="${points[1][0].toFixed(2)}" y2="${points[1][1].toFixed(2)}" stroke="${rgba(geometry.colors, vertices[0])}" stroke-width="1"/>`,
        });
      }
    } else {
      const count = geometry.positions.length / 3;
      const stride = Math.max(1, Math.ceil(count / 500));
      for (let vertex = 0; vertex < count; vertex += stride) {
        const point = project([
          geometry.positions[vertex * 3],
          geometry.positions[vertex * 3 + 1],
          geometry.positions[vertex * 3 + 2],
        ]);
        shapes.push({
          layer: geometryIndex,
          depth: point[2],
          markup: `<circle data-compiled-geometry="${escapeXml(geometry.id)}" cx="${point[0].toFixed(2)}" cy="${point[1].toFixed(2)}" r="${Math.max(1.25, Math.min(5, geometry.sizes[vertex] ?? 2)).toFixed(2)}" fill="${rgba(geometry.colors, vertex)}"/>`,
        });
      }
    }
  }
  shapes.sort((left, right) => left.layer - right.layer || left.depth - right.depth);
  const background = typeof scene.spec.background === 'string' ? scene.spec.background : '#f8fafc';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(scene.spec.title ?? 'Spatial chart')} compiled preview">
  <rect width="${width}" height="${height}" rx="18" fill="${escapeXml(background)}"/>
  <g>${shapes.map(({ markup }) => markup).join('')}</g>
  <text x="20" y="28" fill="${background === '#07111f' ? '#f8fafc' : '#0f172a'}" font-family="system-ui,sans-serif" font-size="15" font-weight="700">${escapeXml(scene.spec.title ?? 'Spatial chart')}</text>
</svg>
`;
}

await mkdir(outputDirectory, { recursive: true });
for (const [id, spec] of Object.entries(spatialSampleSpecs)) {
  const output = renderScene(compileSpatial(spec));
  const url = new URL(`${id}.svg`, outputDirectory);
  if (checkOnly) {
    assert.equal(
      await readFile(url, 'utf8'),
      output,
      `${id}.svg is stale; run npm run docs:spatial:snapshots`,
    );
  } else {
    await writeFile(url, output, 'utf8');
  }
}

console.log(
  `${checkOnly ? 'Verified' : 'Rendered'} ${Object.keys(spatialSampleSpecs).length} compiled spatial snapshots.`,
);
