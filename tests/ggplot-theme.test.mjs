import test from 'node:test';
import assert from 'node:assert/strict';

import { compile, createRegistry, graflumeGgplot } from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { categoricalColor, continuousColor, ggplotHuePalette } from '../.tmp/src/theme/color.js';
import { graflumeLight } from '../.tmp/src/theme/defaults.js';

const pointToCssPixel = 96 / 72;
const millimeterToCssPixel = 96 / 25.4;
const data = [
  { x: 0, y: 0 },
  { x: 5, y: 8 },
  { x: 10, y: 4 },
];

function ggplotSpec(overrides = {}) {
  return {
    data,
    mark: { type: 'line', point: true },
    x: { field: 'x', type: 'quantitative', scale: { nice: false } },
    y: { field: 'y', type: 'quantitative', scale: { nice: false } },
    theme: 'ggplot',
    title: { text: 'ggplot2 theme_gray', subtitle: 'Browser reference at 96 dpi' },
    ...overrides,
  };
}

test('registers and exports the ggplot2 v4.0.3 theme_gray token contract', () => {
  assert.equal(graflumeGgplot.name, 'ggplot');
  assert.equal(graflumeGgplot.colors.background, '#FFFFFF');
  assert.equal(graflumeGgplot.colors.panel, '#EBEBEB');
  assert.equal(graflumeGgplot.colors.grid, '#FFFFFF');
  assert.equal(graflumeGgplot.colors.focus, '#3366FF');
  assert.equal(graflumeGgplot.typography.fontSize, 11 * pointToCssPixel);
  assert.equal(graflumeGgplot.typography.axisLabelSize, 8.8 * pointToCssPixel);
  assert.equal(graflumeGgplot.typography.titleSize, 13.2 * pointToCssPixel);
  assert.equal(graflumeGgplot.axis.gridLineWidth, 0.5 * millimeterToCssPixel);
  assert.equal(graflumeGgplot.axis.minorGridLineWidth, 0.25 * millimeterToCssPixel);
  assert.equal(graflumeGgplot.mark.pointRadius, 0.75 * millimeterToCssPixel);
  assert.equal(graflumeGgplot.mark.pointStrokeWidth, 0.5 * millimeterToCssPixel);
  assert.equal(graflumeGgplot.mark.barWidthRatio, 0.9);
  assert.ok(createRegistry().capabilities().themes.includes('ggplot'));
});

test('normalizes ggplot structural defaults without changing the one-argument API', () => {
  const spec = normalizeSpec(ggplotSpec({ title: undefined }));
  assert.equal(spec.axes.x.line.visible, false);
  assert.equal(spec.axes.y.line.visible, false);
  assert.equal(spec.axes.x.grid.visible, true);
  assert.equal(spec.axes.y.grid.visible, true);
  assert.equal(spec.axes.x2.grid.visible, false);
  assert.equal(spec.axes.y2.grid.visible, false);
  assert.equal(spec.axes.x.ticks.visible, true);
  assert.equal(spec.axes.x.title.themeGap, 2.75 * pointToCssPixel);
  assert.deepEqual(spec.padding, {
    top: 5.5 * pointToCssPixel,
    right: 5.5 * pointToCssPixel,
    bottom: 5.5 * pointToCssPixel,
    left: 5.5 * pointToCssPixel,
  });
});

test('compiles the gray panel, white major and minor grid, blank axes, and ggplot text roles', () => {
  const { scene, spec } = compile(ggplotSpec(), { width: 520, height: 360 });
  const nodes = flattenScene(scene.root);
  const panel = nodes.find((node) => node.id === 'chart:panel');
  const majorGrid = nodes.filter((node) => /^axis-[xy]:grid:\d+$/.test(node.id));
  const minorGrid = nodes.filter((node) => /^axis-[xy]:grid-minor:\d+$/.test(node.id));
  const ticks = nodes.filter((node) => /^axis-[xy]:tick:\d+$/.test(node.id));
  const points = nodes.filter((node) => node.type === 'circle' && node.id.includes(':point:'));
  const axisLabels = nodes.filter(
    (node) => node.type === 'text' && /^axis-[xy]:label:\d+$/.test(node.id),
  );
  const axisTitles = nodes.filter(
    (node) => node.type === 'text' && /^axis-[xy]:title$/.test(node.id),
  );
  const title = nodes.find((node) => node.id === 'chart:title');
  const subtitle = nodes.find((node) => node.id === 'chart:subtitle');
  const xTitle = nodes.find((node) => node.id === 'axis-x:title');

  assert.equal(scene.background, '#FFFFFF');
  assert.equal(panel?.type, 'rect');
  assert.equal(panel?.fill, '#EBEBEB');
  assert.ok(majorGrid.length > 0);
  assert.ok(minorGrid.length > 0);
  assert.ok(ticks.length > 0);
  assert.ok(points.length > 0);
  assert.ok(nodes.every((node) => node.id !== 'axis-x:line' && node.id !== 'axis-y:line'));
  assert.ok(
    majorGrid.every(
      (node) =>
        node.type === 'line' &&
        node.stroke === '#FFFFFF' &&
        node.lineWidth === 0.5 * millimeterToCssPixel &&
        node.opacity === 1 &&
        node.lineCap === 'butt',
    ),
  );
  assert.ok(
    minorGrid.every(
      (node) =>
        node.type === 'line' &&
        node.stroke === '#FFFFFF' &&
        node.lineWidth === 0.25 * millimeterToCssPixel &&
        node.opacity === 1 &&
        node.lineCap === 'butt',
    ),
  );
  assert.ok(
    ticks.every(
      (node) =>
        node.type === 'line' &&
        node.stroke === '#333333' &&
        node.lineWidth === 0.5 * millimeterToCssPixel &&
        node.lineCap === 'butt',
    ),
  );
  assert.ok(
    points.every(
      (node) =>
        node.type === 'circle' &&
        node.radius === 0.75 * millimeterToCssPixel &&
        node.fill === '#000000' &&
        node.stroke === '#000000' &&
        node.lineWidth === 0.5 * millimeterToCssPixel,
    ),
  );
  assert.ok(
    axisLabels.every(
      (node) =>
        node.type === 'text' &&
        node.fill === '#4D4D4D' &&
        node.fontSize === 8.8 * pointToCssPixel &&
        node.fontWeight === 400,
    ),
  );
  assert.ok(
    axisTitles.every(
      (node) =>
        node.type === 'text' &&
        node.fill === '#000000' &&
        node.fontSize === 11 * pointToCssPixel &&
        node.fontWeight === 400,
    ),
  );
  assert.equal(title?.type, 'text');
  assert.equal(title?.x, panel?.x);
  assert.equal(title?.fontSize, 13.2 * pointToCssPixel);
  assert.equal(title?.fontWeight, 400);
  assert.equal(subtitle?.type, 'text');
  assert.equal(subtitle?.fontSize, 11 * pointToCssPixel);
  assert.ok(Math.abs(subtitle?.y - (title?.y + title?.fontSize) - 5.5 * pointToCssPixel) < 1e-10);
  assert.ok(
    Math.abs(panel?.y - (subtitle?.y + subtitle?.fontSize) - 5.5 * pointToCssPixel) < 1e-10,
  );
  assert.equal(xTitle?.type, 'text');
  assert.ok(
    Math.abs(xTitle?.y - (panel?.y + panel?.height) - (2.75 + 2.2 + 8.8 + 2.75) * pointToCssPixel) <
      1e-10,
  );
  assert.equal(spec.axes.x2.grid.visible, false);
  assert.equal(spec.axes.y2.grid.visible, false);
});

test('explicit axis declarations override the ggplot defaults', () => {
  const { scene, spec } = compile(
    ggplotSpec({
      title: undefined,
      axes: {
        x: { line: true, grid: false, ticks: false, title: { padding: 50 } },
        y: { grid: { color: '#123456', width: 3, opacity: 0.4 } },
      },
    }),
    { width: 520, height: 360 },
  );
  const nodes = flattenScene(scene.root);
  const xLine = nodes.find((node) => node.id === 'axis-x:line');
  const yGrid = nodes.filter((node) => /^axis-y:grid:\d+$/.test(node.id));

  assert.equal(spec.axes.x.line.visible, true);
  assert.equal(spec.axes.x.grid.visible, false);
  assert.equal(spec.axes.x.ticks.visible, false);
  assert.equal(spec.axes.x.title.padding, 50);
  assert.equal(spec.axes.x.title.themeGap, undefined);
  assert.equal(xLine?.type, 'line');
  assert.ok(nodes.every((node) => !node.id.startsWith('axis-x:grid:')));
  assert.ok(nodes.every((node) => !node.id.startsWith('axis-x:grid-minor:')));
  assert.ok(nodes.every((node) => !node.id.startsWith('axis-x:tick:')));
  assert.ok(
    yGrid.every(
      (node) =>
        node.type === 'line' &&
        node.stroke === '#123456' &&
        node.lineWidth === 3 &&
        node.opacity === 0.4,
    ),
  );
});

test('ggplot legends use theme_gray surfaces, typography, and key geometry', () => {
  const { scene } = compile(
    {
      data,
      layers: [
        {
          id: 'trend',
          name: 'Trend',
          mark: { type: 'line' },
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'y', type: 'quantitative' },
        },
        {
          id: 'observations',
          name: 'Observations',
          mark: { type: 'point' },
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'y', type: 'quantitative' },
        },
      ],
      legend: { title: 'Series' },
      theme: 'ggplot',
    },
    { width: 520, height: 360 },
  );
  const nodes = flattenScene(scene.root);
  const surface = nodes.find((node) => node.id === 'legend:surface');
  const title = nodes.find((node) => node.id === 'legend:title');
  const labels = nodes.filter(
    (node) => node.type === 'text' && /^legend:item:.*:label$/.test(node.id),
  );
  const lineKey = nodes.find(
    (node) => node.type === 'line' && /^legend:item:.*:swatch$/.test(node.id),
  );
  const pointKey = nodes.find(
    (node) => node.type === 'circle' && /^legend:item:.*:swatch$/.test(node.id),
  );

  assert.equal(surface?.type, 'rect');
  assert.equal(surface?.fill, '#FFFFFF');
  assert.equal(surface?.lineWidth, 0);
  assert.equal(surface?.cornerRadius, 0);
  assert.equal(title?.type, 'text');
  assert.equal(title?.fontSize, 11 * pointToCssPixel);
  assert.equal(title?.fontWeight, 400);
  assert.ok(
    labels.every(
      (node) =>
        node.type === 'text' && node.fontSize === 8.8 * pointToCssPixel && node.fontWeight === 400,
    ),
  );
  assert.equal(lineKey?.type, 'line');
  assert.equal(lineKey?.lineWidth, 0.5 * millimeterToCssPixel);
  assert.equal(lineKey?.lineCap, 'butt');
  assert.ok(Math.abs(lineKey?.x2 - lineKey?.x1 - 1.2 * 11 * pointToCssPixel) < 1e-10);
  assert.equal(pointKey?.type, 'circle');
  assert.equal(pointKey?.radius, 0.75 * millimeterToCssPixel);
  assert.equal(pointKey?.lineWidth, 0.5 * millimeterToCssPixel);
  assert.equal(pointKey?.stroke, pointKey?.fill);
});

test('custom themes inherit ggplot structure before normalization', () => {
  const { spec, theme } = compile(
    ggplotSpec({
      title: undefined,
      theme: {
        extends: 'ggplot',
        name: 'custom-ggplot',
        axis: { gridX: false },
      },
    }),
    { width: 420, height: 280 },
  );

  assert.equal(theme.name, 'custom-ggplot');
  assert.equal(spec.axes.x.grid.visible, false);
  assert.equal(spec.axes.y.grid.visible, true);
  assert.equal(spec.axes.x.line.visible, false);
});

test('matches ggplot2 discrete hue output and keeps legacy fixed palettes stable', () => {
  assert.deepEqual(ggplotHuePalette(1), ['#F8766D']);
  assert.deepEqual(ggplotHuePalette(3), ['#F8766D', '#00BA38', '#619CFF']);
  assert.deepEqual(ggplotHuePalette(5), ['#F8766D', '#A3A500', '#00BF7D', '#00B0F6', '#E76BF3']);
  assert.equal(categoricalColor(graflumeGgplot, 3, 5), '#00B0F6');
  assert.equal(categoricalColor(graflumeLight, 11, 20), '#0f9f8a');
});

test('uses Lab interpolation for ggplot continuous colour and preserves legacy sequential stops', () => {
  assert.equal(continuousColor(graflumeGgplot, 0), '#132B43');
  assert.equal(continuousColor(graflumeGgplot, 0.5), '#336A98');
  assert.equal(continuousColor(graflumeGgplot, 1), '#56B1F7');
  assert.deepEqual(
    Array.from({ length: 12 }, (_value, index) => continuousColor(graflumeGgplot, index / 11)),
    [
      '#132B43',
      '#183652',
      '#1E4160',
      '#244C70',
      '#2A5880',
      '#306490',
      '#3670A0',
      '#3C7DB1',
      '#428AC2',
      '#4996D3',
      '#4FA4E5',
      '#56B1F7',
    ],
  );
  assert.equal(continuousColor(graflumeLight, 0.3), '#c7d2fe');
  assert.equal(continuousColor(graflumeLight, 0.5), '#818cf8');
});
