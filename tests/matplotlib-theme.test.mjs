import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  builtInThemeCatalog,
  compile,
  createRegistry,
  graflumeMatplotlib,
} from '../.tmp/src/index.js';
import { compile as compileComplete } from '../.tmp/src/complete.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { compileSpatial } from '../.tmp/src/spatial.js';
import { spatialColor } from '../.tmp/src/spatial/compile.js';
import { continuousColor, mixColor } from '../.tmp/src/theme/color.js';

const data = [
  { category: 'A', value: 2 },
  { category: 'B', value: 4 },
  { category: 'C', value: 3 },
];

function matplotlibSpec(mark = 'point', overrides = {}) {
  return {
    data,
    mark,
    x: { field: 'category', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
    title: 'Matplotlib default',
    theme: 'matplotlib',
    ...overrides,
  };
}

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not close to ${expected}`);
}

test('registers and exports the Matplotlib 3.11.1 default-style contract', () => {
  const entry = builtInThemeCatalog.find(({ id }) => id === 'matplotlib');
  assert.equal(entry?.sourceBaseline, 'Matplotlib 3.11.1');
  assert.equal(entry?.snapshot, true);
  assert.equal(entry?.tokens, graflumeMatplotlib);
  assert.ok(createRegistry().capabilities().themes.includes('matplotlib'));

  assert.equal(graflumeMatplotlib.name, 'matplotlib');
  assert.equal(graflumeMatplotlib.colors.background, '#FFFFFF');
  assert.equal(graflumeMatplotlib.colors.panel, '#FFFFFF');
  assert.equal(graflumeMatplotlib.colors.grid, '#B0B0B0');
  assert.deepEqual(graflumeMatplotlib.colors.palette, [
    '#1F77B4',
    '#FF7F0E',
    '#2CA02C',
    '#D62728',
    '#9467BD',
    '#8C564B',
    '#E377C2',
    '#7F7F7F',
    '#BCBD22',
    '#17BECF',
  ]);
  assert.deepEqual(
    [graflumeMatplotlib.colors.sequential[0], graflumeMatplotlib.colors.sequential.at(-1)],
    ['#440154', '#FDE725'],
  );
  assert.equal(graflumeMatplotlib.colors.sequential.length, 256);
  assert.equal(
    createHash('sha256').update(graflumeMatplotlib.colors.sequential.join('\n')).digest('hex'),
    '4e63bcab27cede151f4cd1a3d38c2230da0e141d59c0f0dbbd55d10412f5b9ca',
  );
  assert.equal(graflumeMatplotlib.colors.continuousInterpolation, 'step');
  assert.equal(graflumeMatplotlib.typography.titleAlign, 'center');
  closeTo(graflumeMatplotlib.typography.fontSize, (10 * 100) / 72);
  closeTo(graflumeMatplotlib.typography.titleSize, (12 * 100) / 72);
  closeTo(graflumeMatplotlib.axis.lineWidth, (0.8 * 100) / 72);
  closeTo(graflumeMatplotlib.mark.lineWidth, (1.5 * 100) / 72);
  assert.equal(graflumeMatplotlib.axis.boxVisible, true);
  assert.equal(graflumeMatplotlib.axis.gridX, false);
  assert.equal(graflumeMatplotlib.axis.gridY, false);
  assert.equal(graflumeMatplotlib.mark.histogramGap, 0);
  assert.equal(graflumeMatplotlib.mark.boxplotMedianStroke, '#FF7F0E');
  assert.equal(graflumeMatplotlib.mark.pointColorMode, 'series');
  assert.equal(graflumeMatplotlib.mark.areaColorMode, 'series');
  assert.equal(graflumeMatplotlib.mark.pieStartAngle, 0);
  assert.equal(graflumeMatplotlib.mark.pieDirection, 'counterclockwise');
  assert.equal(graflumeMatplotlib.legend?.borderColor, '#CCCCCC');
  assert.equal(graflumeMatplotlib.legend?.continuousSamples, 256);
  assert.equal(graflumeMatplotlib.motion.duration, 0);
});

test('normalizes centered titles, four-sided axes, disabled grids, and default subplot padding', () => {
  const spec = normalizeSpec(matplotlibSpec());
  assert.equal(spec.title.align, 'center');
  assert.equal(spec.axes.x.line.visible, true);
  assert.equal(spec.axes.y.line.visible, true);
  assert.equal(spec.axes.x.grid.visible, false);
  assert.equal(spec.axes.y.grid.visible, false);
  assert.equal(spec.axes.x.ticks.visible, true);
  assert.deepEqual(spec.padding, { top: 19, right: 64, bottom: 53, left: 80 });

  const titledBox = flattenScene(
    compile(matplotlibSpec(), { width: 640, height: 480 }).scene.root,
  ).find((node) => node.id === 'chart:plot-box');
  const titlelessBox = flattenScene(
    compile({ ...matplotlibSpec(), title: undefined }, { width: 640, height: 480 }).scene.root,
  ).find((node) => node.id === 'chart:plot-box');
  assert.equal(titledBox?.type, 'rect');
  assert.equal(titlelessBox?.type, 'rect');
  closeTo(titledBox?.y, titlelessBox?.y);
  closeTo(titledBox?.y, 19 + (28 * 100) / 72);
});

test('advances tab10 for point, line-marker, and area layers', () => {
  const layeredData = [
    { x: 0, first: 1, second: 2 },
    { x: 1, first: 2, second: 3 },
  ];
  const layers = (mark) => ({
    data: layeredData,
    layers: [
      { id: 'first', mark, x: 'x', y: 'first' },
      { id: 'second', mark, x: 'x', y: 'second' },
    ],
    theme: 'matplotlib',
  });

  const points = flattenScene(compile(layers('point')).scene.root).filter(
    (node) => node.type === 'circle' && node.id.includes(':point:'),
  );
  assert.ok(
    points.filter(({ id }) => id.startsWith('first:')).every(({ fill }) => fill === '#1F77B4'),
  );
  assert.ok(
    points.filter(({ id }) => id.startsWith('second:')).every(({ fill }) => fill === '#FF7F0E'),
  );
  assert.ok(points.every(({ fill, stroke }) => fill === stroke));

  const lineMarkers = flattenScene(
    compile(layers({ type: 'line', point: true })).scene.root,
  ).filter((node) => node.type === 'circle' && node.id.includes(':point:'));
  assert.ok(
    lineMarkers
      .filter(({ id }) => id.startsWith('second:'))
      .every(({ fill, stroke }) => fill === '#FF7F0E' && stroke === '#FF7F0E'),
  );

  const areas = flattenScene(compile(layers('area')).scene.root).filter((node) =>
    node.id.endsWith(':area-fill'),
  );
  assert.deepEqual(
    areas.map(({ fill }) => fill),
    ['#1F77B4', '#FF7F0E'],
  );
});

test('compiles the white axes, black spines, tab10 marks, and Matplotlib typography', () => {
  const { scene } = compile(matplotlibSpec(), { width: 640, height: 480 });
  const nodes = flattenScene(scene.root);
  const panel = nodes.find((node) => node.id === 'chart:panel');
  const box = nodes.find((node) => node.id === 'chart:plot-box');
  const title = nodes.find((node) => node.id === 'chart:title');
  const points = nodes.filter((node) => node.type === 'circle' && node.id.includes(':point:'));

  assert.equal(scene.background, '#FFFFFF');
  assert.equal(panel?.type, 'rect');
  assert.equal(panel?.fill, '#FFFFFF');
  assert.equal(box?.type, 'rect');
  assert.equal(box?.stroke, '#000000');
  closeTo(box?.lineWidth, (0.8 * 100) / 72);
  assert.ok(nodes.every((node) => !/^axis-[xy]:grid:/.test(node.id)));
  assert.ok(nodes.some((node) => node.id === 'axis-x:line'));
  assert.ok(nodes.some((node) => node.id === 'axis-y:line'));
  assert.equal(title?.type, 'text');
  assert.equal(title?.align, 'center');
  assert.equal(title?.fontWeight, 400);
  closeTo(title?.fontSize, (12 * 100) / 72);
  assert.ok(points.length > 0);
  assert.ok(points.every((node) => node.fill === '#1F77B4' && node.stroke === '#1F77B4'));
  for (const point of points) {
    closeTo(point.radius, (3 * 100) / 72);
    closeTo(point.lineWidth, (1 * 100) / 72);
  }
});

test('applies Matplotlib bar, histogram, boxplot, pie, and viridis defaults', () => {
  const bars = flattenScene(compile(matplotlibSpec('bar')).scene.root).filter((node) =>
    node.id.includes(':bar:'),
  );
  assert.ok(
    bars.every(
      (node) => node.fill === '#1F77B4' && node.stroke === 'transparent' && node.lineWidth === 0,
    ),
  );

  const histogram = flattenScene(
    compile(
      matplotlibSpec(
        { type: 'distribution', fields: { value: 'value' }, options: { mode: 'histogram' } },
        {
          x: { field: 'value', type: 'quantitative' },
          y: { field: 'value', type: 'quantitative' },
        },
      ),
    ).scene.root,
  ).filter((node) => node.id.includes(':bin:'));
  assert.ok(histogram.length > 1);
  assert.ok(
    histogram.every(
      (node) => node.fill === '#1F77B4' && node.stroke === 'transparent' && node.lineWidth === 0,
    ),
  );
  closeTo(histogram[0].x + histogram[0].width, histogram[1].x);

  const boxplot = flattenScene(
    compile({
      data: [{ category: 'A', min: 1, q1: 2, median: 3, q3: 4, max: 5 }],
      mark: { type: 'distribution', options: { mode: 'boxplot' } },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'median', type: 'quantitative' },
      theme: 'matplotlib',
    }).scene.root,
  );
  const box = boxplot.find((node) => node.id.includes(':boxplot-box:'));
  const median = boxplot.find((node) => node.id.includes(':boxplot-median:'));
  assert.equal(box?.type, 'rect');
  assert.equal(box?.fill, 'transparent');
  assert.equal(box?.stroke, '#000000');
  assert.equal(box?.cornerRadius, 0);
  assert.equal(median?.type, 'line');
  assert.equal(median?.stroke, '#FF7F0E');

  const explicitBoxplot = flattenScene(
    compile({
      data: [{ category: 'A', min: 1, q1: 2, median: 3, q3: 4, max: 5 }],
      mark: {
        type: 'distribution',
        stroke: '#654321',
        options: { mode: 'boxplot' },
      },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'median', type: 'quantitative' },
      theme: 'matplotlib',
    }).scene.root,
  ).find((node) => node.id.includes(':boxplot-median:'));
  assert.equal(explicitBoxplot?.type, 'line');
  assert.equal(explicitBoxplot?.stroke, '#654321');

  const pieNodes = flattenScene(compile(matplotlibSpec('pie')).scene.root);
  const slices = pieNodes.filter((node) => node.id.includes(':slice:'));
  assert.deepEqual(
    slices.map(({ fill }) => fill),
    ['#1F77B4', '#FF7F0E', '#2CA02C'],
  );
  assert.ok(slices.every((node) => node.stroke === 'transparent' && node.lineWidth === 0));
  assert.ok(pieNodes.every((node) => node.id !== 'chart:plot-box'));
  const firstSlice = slices[0];
  assert.equal(firstSlice?.type, 'path');
  const center = firstSlice?.points[0];
  const firstOuter = firstSlice?.points[1];
  const secondOuter = firstSlice?.points[2];
  assert.ok(center !== undefined && firstOuter !== undefined && secondOuter !== undefined);
  assert.ok(firstOuter.x > center.x);
  closeTo(firstOuter.y, center.y);
  assert.ok(secondOuter.y < center.y);

  const interpolated = continuousColor(graflumeMatplotlib, 0.05);
  assert.equal(interpolated, graflumeMatplotlib.colors.sequential[Math.floor(0.05 * 256)]);
  assert.equal(continuousColor(graflumeMatplotlib, 0), '#440154');
  assert.equal(continuousColor(graflumeMatplotlib, 1), '#FDE725');

  const heatmap = flattenScene(
    compileComplete({
      data: [
        { x: 'A', y: 'A', value: 0 },
        { x: 'B', y: 'A', value: 50 },
        { x: 'C', y: 'A', value: 100 },
      ],
      mark: { type: 'heatmap', fields: { value: 'value' } },
      x: { field: 'x', type: 'ordinal' },
      y: { field: 'y', type: 'ordinal' },
      theme: 'matplotlib',
    }).scene.root,
  ).find((node) => node.id.endsWith(':heatmap:1'));
  assert.equal(heatmap?.type, 'rect');
  assert.equal(heatmap?.fill, continuousColor(graflumeMatplotlib, 0.5));

  const continuousLegend = flattenScene(
    compileComplete({
      data: [
        { x: 'A', y: 'A', value: 0 },
        { x: 'B', y: 'A', value: 1 },
      ],
      mark: { type: 'heatmap', fields: { value: 'value' } },
      x: 'x',
      y: 'y',
      legend: { mode: 'continuous' },
      theme: 'matplotlib',
    }).scene.root,
  ).filter(({ id }) => id.startsWith('legend:scale:'));
  assert.equal(continuousLegend.length, 256);

  const explicitRgb = {
    ...graflumeMatplotlib,
    colors: {
      ...graflumeMatplotlib.colors,
      paletteMode: 'ggplot2-hue',
      continuousInterpolation: 'rgb',
      sequential: ['#000000', '#FFFFFF'],
    },
  };
  assert.equal(continuousColor(explicitRgb, 0.5), mixColor('#000000', '#FFFFFF', 0.5));
});

test('forwards Matplotlib through Spatial while keeping explicit values authoritative', () => {
  const spatial = compileSpatial({
    theme: 'matplotlib',
    layers: [
      {
        mark: { type: 'surface', mode: 'surface' },
        data: { rows: 2, columns: 2, z: [0, 0.5, 1, 0.5] },
      },
    ],
  });
  assert.equal(spatial.theme.name, 'matplotlib');
  assert.equal(spatial.theme.colors.background, '#FFFFFF');
  assert.deepEqual(spatial.theme.colors.palette, graflumeMatplotlib.colors.palette);
  const midpoint = spatial.geometries[0].colors.slice(4, 8);
  const expectedMidpoint = spatialColor(continuousColor(graflumeMatplotlib, 0.5));
  midpoint.forEach((channel, index) => closeTo(channel, expectedMidpoint[index], 1e-6));

  const volume = compileSpatial({
    theme: 'matplotlib',
    layers: [
      {
        mark: { type: 'volume', mode: 'volume' },
        data: { dimensions: [2, 2, 2], values: [0, 1, 0, 0, 0, 0, 0, 0] },
      },
    ],
  }).geometries[0];
  const lowVolume = volume.colors.slice(0, 4);
  const highVolume = volume.colors.slice(4, 8);
  spatialColor('#440154', 0.18).forEach((channel, index) =>
    closeTo(lowVolume[index], channel, 1e-6),
  );
  spatialColor('#FDE725', 0.72).forEach((channel, index) =>
    closeTo(highVolume[index], channel, 1e-6),
  );

  const { scene } = compile(
    matplotlibSpec({ type: 'bar', fill: '#123456', stroke: '#654321', lineWidth: 3 }),
  );
  const bars = flattenScene(scene.root).filter((node) => node.id.includes(':bar:'));
  assert.ok(
    bars.every(
      (node) => node.fill === '#123456' && node.stroke === '#654321' && node.lineWidth === 3,
    ),
  );
});
