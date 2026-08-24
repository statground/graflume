import assert from 'node:assert/strict';
import test from 'node:test';

import {
  builtInThemeCatalog,
  compile,
  createRegistry,
  defaultThemeId,
  graflumeRBase,
} from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';

const data = [
  { category: 'A', value: 2 },
  { category: 'B', value: 4 },
  { category: 'C', value: 3 },
];

function rBaseSpec(mark = 'point', overrides = {}) {
  return {
    data,
    mark,
    x: { field: 'category', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
    title: 'R base graphics',
    theme: 'r-base',
    ...overrides,
  };
}

test('the built-in theme catalog is the ordered registry source of truth', () => {
  const ids = builtInThemeCatalog.map(({ id }) => id);
  assert.equal(defaultThemeId, 'graflume-light');
  assert.equal(ids[0], defaultThemeId);
  assert.ok(ids.includes('r-base'));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-z][a-z0-9-]*$/.test(id)));
  assert.deepEqual(createRegistry().capabilities().themes, [...ids].sort());
  for (const entry of builtInThemeCatalog) assert.equal(entry.id, entry.tokens.name);
  assert.equal(builtInThemeCatalog.find(({ id }) => id === 'r-base')?.sourceBaseline, 'R 4.6.1');
});

test('registers and exports the R 4.6.1 base graphics visual contract', () => {
  assert.equal(graflumeRBase.name, 'r-base');
  assert.equal(graflumeRBase.colors.background, '#FFFFFF');
  assert.equal(graflumeRBase.colors.panel, '#FFFFFF');
  assert.deepEqual(graflumeRBase.colors.palette, [
    '#000000',
    '#DF536B',
    '#61D04F',
    '#2297E6',
    '#28E2E5',
    '#CD0BBC',
    '#F5C710',
    '#9E9E9E',
  ]);
  assert.equal(graflumeRBase.axis.boxVisible, true);
  assert.equal(graflumeRBase.axis.gridX, false);
  assert.equal(graflumeRBase.axis.gridY, false);
  assert.equal(graflumeRBase.typography.titleAlign, 'center');
  assert.equal(graflumeRBase.mark.pointFill, 'transparent');
  assert.equal(graflumeRBase.mark.pointStroke, '#000000');
});

test('normalizes R base axes, title alignment, and asymmetric device-like margins', () => {
  const spec = normalizeSpec(rBaseSpec());
  assert.equal(spec.title.align, 'center');
  assert.equal(spec.axes.x.line.visible, true);
  assert.equal(spec.axes.y.line.visible, true);
  assert.equal(spec.axes.x.grid.visible, false);
  assert.equal(spec.axes.y.grid.visible, false);
  assert.equal(spec.axes.x.ticks.visible, true);
  assert.deepEqual(spec.padding, { top: 24, right: 30, bottom: 73, left: 59 });
});

test('compiles the white plot, four-sided box, black axes, and open-circle points', () => {
  const { scene } = compile(rBaseSpec(), { width: 640, height: 480 });
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
  assert.equal(box?.lineWidth, 1);
  assert.ok(nodes.every((node) => !/^axis-[xy]:grid:/.test(node.id)));
  assert.ok(nodes.some((node) => node.id === 'axis-x:line'));
  assert.ok(nodes.some((node) => node.id === 'axis-y:line'));
  assert.equal(title?.type, 'text');
  assert.equal(title?.align, 'center');
  assert.equal(title?.fontWeight, 700);
  assert.ok(points.length > 0);
  assert.ok(
    points.every(
      (node) =>
        node.fill === 'transparent' &&
        node.stroke === '#000000' &&
        node.lineWidth === 1 &&
        node.radius === 3.75,
    ),
  );
});

test('applies the corresponding base bar, histogram, boxplot, and pie defaults', () => {
  const bars = flattenScene(compile(rBaseSpec('bar')).scene.root).filter((node) =>
    node.id.includes(':bar:'),
  );
  assert.ok(
    bars.every(
      (node) => node.fill === '#BEBEBE' && node.stroke === '#000000' && node.lineWidth === 1,
    ),
  );
  assert.ok(
    flattenScene(compile(rBaseSpec('bar')).scene.root).every(
      (node) => node.id !== 'chart:plot-box',
    ),
  );

  const histogram = flattenScene(
    compile(
      rBaseSpec(
        { type: 'distribution', fields: { value: 'value' }, options: { mode: 'histogram' } },
        {
          x: { field: 'value', type: 'quantitative' },
          y: { field: 'value', type: 'quantitative' },
        },
      ),
    ).scene.root,
  ).filter((node) => node.id.includes(':bin:'));
  assert.ok(histogram.length > 0);
  assert.ok(
    histogram.every(
      (node) => node.fill === '#D3D3D3' && node.stroke === '#000000' && node.lineWidth === 1,
    ),
  );

  const boxplotData = [{ category: 'A', min: 1, q1: 2, median: 3, q3: 4, max: 5 }];
  const boxplot = flattenScene(
    compile({
      data: boxplotData,
      mark: { type: 'distribution', options: { mode: 'boxplot' } },
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'median', type: 'quantitative' },
      theme: 'r-base',
    }).scene.root,
  ).find((node) => node.id.includes(':boxplot-box:'));
  assert.equal(boxplot?.type, 'rect');
  assert.equal(boxplot?.fill, '#D3D3D3');
  assert.equal(boxplot?.stroke, '#000000');
  assert.equal(boxplot?.lineWidth, 1);
  assert.equal(boxplot?.cornerRadius, 0);

  const slices = flattenScene(compile(rBaseSpec('pie')).scene.root).filter((node) =>
    node.id.includes(':slice:'),
  );
  assert.deepEqual(
    slices.map(({ fill }) => fill),
    ['#FFFFFF', '#ADD8E6', '#FFE4E1'],
  );
  assert.ok(slices.every((node) => node.stroke === '#000000' && node.lineWidth === 1));
  assert.ok(
    flattenScene(compile(rBaseSpec('pie')).scene.root).every(
      (node) => node.id !== 'chart:plot-box',
    ),
  );
});

test('explicit visual values remain stronger than the R base theme', () => {
  const { scene } = compile(
    rBaseSpec({ type: 'bar', fill: '#123456', stroke: '#654321', lineWidth: 3 }),
  );
  const bars = flattenScene(scene.root).filter((node) => node.id.includes(':bar:'));
  assert.ok(
    bars.every(
      (node) => node.fill === '#123456' && node.stroke === '#654321' && node.lineWidth === 3,
    ),
  );
});
