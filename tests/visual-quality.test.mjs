import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

test('the default visual system uses refined theme tokens and rounded data strokes', () => {
  const { scene, theme } = compile(
    {
      data: [
        { month: 'Jan', value: 12 },
        { month: 'Feb', value: 19 },
        { month: 'Mar', value: 16 },
      ],
      mark: { type: 'line', point: true },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );
  const nodes = flattenScene(scene.root);
  const line = nodes.find((node) => node.type === 'path' && node.id.includes(':line:'));
  const points = nodes.filter((node) => node.type === 'circle');

  assert.equal(theme.colors.focus, '#4f46e5');
  assert.equal(theme.colors.axis, '#cbd5e1');
  assert.equal(theme.typography.titleSize, 20);
  assert.equal(line?.lineCap, 'round');
  assert.equal(line?.lineJoin, 'round');
  assert.ok(points.every((point) => point.fill === theme.colors.background));
  assert.ok(points.every((point) => point.stroke === line?.stroke));
  assert.ok(nodes.every((node) => !node.id.includes(':tick:')));
  assert.ok(nodes.filter((node) => node.id.includes(':grid:')).every((node) => node.opacity < 1));
});

test('radial charts add readable percentages, donut center context, and gauge details', () => {
  const data = [
    { channel: 'Search', value: 56 },
    { channel: 'Direct', value: 28 },
    { channel: 'Other', value: 16 },
  ];
  const donut = compile(
    {
      data,
      mark: { type: 'pie', options: { innerRadius: 0.56 } },
      x: { field: 'channel', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );
  const donutNodes = flattenScene(donut.scene.root);
  assert.ok(donutNodes.some((node) => node.type === 'text' && node.text.includes('%')));
  assert.ok(donutNodes.some((node) => node.id.endsWith(':center-label')));
  assert.ok(donutNodes.some((node) => node.id.endsWith(':center-value')));

  const gauge = compile(
    {
      data: [{ metric: 'SLA', value: 91 }],
      mark: { type: 'gauge', options: { min: 0, max: 100 } },
      x: { field: 'metric', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 640, height: 400 },
  );
  const gaugeNodes = flattenScene(gauge.scene.root);
  assert.equal(gaugeNodes.filter((node) => node.id.includes(':gauge-tick:')).length, 5);
  assert.ok(gaugeNodes.some((node) => node.id.includes(':gauge-hub:')));
});

test('structured charts use two-dimensional treemap tiles and smooth Sankey bands', () => {
  const treemap = compile(
    {
      data: [
        { product: 'Core', value: 42 },
        { product: 'Cloud', value: 27 },
        { product: 'Mobile', value: 18 },
        { product: 'Other', value: 10 },
      ],
      mark: 'treemap',
      x: { field: 'product', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 680, height: 400 },
  );
  const tiles = flattenScene(treemap.scene.root).filter(
    (node) => node.type === 'rect' && node.id.includes(':treemap:'),
  );
  assert.equal(tiles.length, 4);
  assert.ok(new Set(tiles.map((tile) => tile.y)).size > 1);
  assert.ok(new Set(tiles.map((tile) => tile.height)).size > 1);

  const sankey = compile(
    {
      data: [
        { source: 'Visits', target: 'Signup', value: 70 },
        { source: 'Visits', target: 'Leave', value: 30 },
      ],
      mark: { type: 'sankey', fields: { target: 'target' } },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 680, height: 400 },
  );
  const flows = flattenScene(sankey.scene.root).filter(
    (node) => node.type === 'path' && node.id.includes(':flow:'),
  );
  assert.equal(flows.length, 2);
  assert.ok(flows.every((flow) => flow.points.length === 26));
});

test('maps render the 177-country Natural Earth basemap, optional graticule, and marker halos', () => {
  const { scene } = compile(
    {
      data: [{ longitude: 126.98, latitude: 37.57, size: 50 }],
      mark: { type: 'map', fields: { size: 'size' }, options: { graticule: true } },
      x: { field: 'longitude', type: 'quantitative' },
      y: { field: 'latitude', type: 'quantitative' },
    },
    { width: 680, height: 400 },
  );
  const nodes = flattenScene(scene.root);
  const countryPaths = nodes.filter(
    (node) => node.type === 'path' && node.id.includes(':natural-earth:country:'),
  );
  const countryIds = new Set(
    countryPaths.map((node) => node.id.match(/:natural-earth:country:([^:]+):/)?.[1]),
  );

  assert.equal(nodes.filter((node) => node.id.includes(':natural-earth:longitude:')).length, 5);
  assert.equal(nodes.filter((node) => node.id.includes(':natural-earth:latitude:')).length, 5);
  assert.ok(nodes.some((node) => node.id.includes(':map-halo:')));
  assert.equal(countryIds.size, 177);
  assert.ok(countryPaths.length >= 177);
  assert.ok(countryPaths.every((node) => node.closed && node.fillRule === 'evenodd'));
  assert.ok(countryPaths.some((node) => (node.subpaths?.length ?? 0) > 0));
  assert.ok(nodes.some((node) => node.id.includes(':natural-earth:attribution')));
});
