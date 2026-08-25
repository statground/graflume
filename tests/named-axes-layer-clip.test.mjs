import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compile } from '../.tmp/src/index.js';
import { hitTestAxisTooltip } from '../.tmp/src/interaction/axis-hit-test.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const dimensions = { width: 760, height: 520 };

test('three named x and y axes resolve independent channels, render positions, and filter axis tooltips', () => {
  const result = compile(
    {
      width: 'container',
      height: 'container',
      axes: {
        time: { channel: 'x', position: 'bottom', title: 'Time' },
        quarter: { channel: 'x', position: 'top', title: 'Quarter' },
        scenario: { channel: 'x', position: 'bottom', offset: 42, title: 'Scenario' },
        revenue: { channel: 'y', position: 'left', title: 'Revenue' },
        margin: { channel: 'y', position: 'right', title: 'Margin' },
        temperature: {
          channel: 'y',
          position: 'left',
          offset: 52,
          title: 'Temperature',
        },
      },
      layers: [
        {
          id: 'revenue-series',
          data: [
            { time: 1, revenue: 100 },
            { time: 2, revenue: 900 },
          ],
          mark: 'point',
          x: { field: 'time', type: 'quantitative', axisId: 'time' },
          y: { field: 'revenue', type: 'quantitative', axisId: 'revenue' },
        },
        {
          id: 'margin-series',
          data: [
            { quarter: 10, margin: 0.1 },
            { quarter: 20, margin: 0.9 },
          ],
          mark: 'point',
          x: { field: 'quarter', type: 'quantitative', axisId: 'quarter' },
          y: { field: 'margin', type: 'quantitative', axisId: 'margin' },
        },
        {
          id: 'temperature-series',
          data: [
            { scenario: 100, temperature: -20 },
            { scenario: 200, temperature: 40 },
          ],
          mark: 'point',
          x: { field: 'scenario', type: 'quantitative', axisId: 'scenario' },
          y: { field: 'temperature', type: 'quantitative', axisId: 'temperature' },
        },
      ],
      interaction: { tooltip: { trigger: 'axis', axis: 'quarter' } },
    },
    dimensions,
  );

  assert.deepEqual(Object.keys(result.coordinates.axes).sort(), [
    'margin',
    'quarter',
    'revenue',
    'scenario',
    'temperature',
    'time',
  ]);
  assert.deepEqual(result.coordinates.channels, {
    time: 'x',
    revenue: 'y',
    quarter: 'x',
    margin: 'y',
    scenario: 'x',
    temperature: 'y',
  });
  assert.deepEqual(result.coordinates.axes.time.domain(), [1, 2]);
  assert.deepEqual(result.coordinates.axes.quarter.domain(), [10, 20]);
  assert.deepEqual(result.coordinates.axes.scenario.domain(), [100, 200]);
  const contains = (axis, low, high) => {
    const domain = result.coordinates.axes[axis].domain();
    assert.ok(domain[0] <= low && domain.at(-1) >= high, `${axis} contains authored values`);
    return domain;
  };
  const revenueDomain = contains('revenue', 100, 900);
  const marginDomain = contains('margin', 0.1, 0.9);
  const temperatureDomain = contains('temperature', -20, 40);
  assert.notDeepEqual(revenueDomain, marginDomain);
  assert.notDeepEqual(marginDomain, temperatureDomain);

  const nodes = flattenScene(result.scene.root);
  for (const id of ['time', 'quarter', 'scenario', 'revenue', 'margin', 'temperature']) {
    assert.equal(nodes.find((node) => node.id === `axis-${id}:line`)?.type, 'line');
  }
  const timeLine = nodes.find((node) => node.id === 'axis-time:line');
  const scenarioLine = nodes.find((node) => node.id === 'axis-scenario:line');
  const revenueLine = nodes.find((node) => node.id === 'axis-revenue:line');
  const temperatureLine = nodes.find((node) => node.id === 'axis-temperature:line');
  assert.ok(scenarioLine.y1 > timeLine.y1);
  assert.ok(temperatureLine.x1 < revenueLine.x1);

  const target = hitTestAxisTooltip(
    result.scene,
    result.coordinates.axes.quarter.map(20),
    result.coordinates.axes.margin.map(0.9),
  );
  assert.equal(target?.layerId, 'margin-series');
  assert.equal(target?.datum.quarter, 20);
});

test('named axis references fail closed when undeclared, unsafe, or bound to the wrong channel', () => {
  const base = {
    data: [{ x: 1, y: 2 }],
    mark: 'point',
    x: { field: 'x', axisId: 'customX' },
    y: 'y',
  };
  assert.ok(validateSpec(base).some(({ path }) => path === '$.x.axisId'));
  assert.ok(
    validateSpec({
      ...base,
      axes: { customX: { channel: 'y', position: 'left' } },
    }).some(({ path, message }) => path === '$.x.axisId' && message.includes('not x')),
  );
  assert.ok(
    validateSpec({
      ...base,
      axes: { customX: { channel: 'x', position: 'bottom' } },
      x: { field: 'x', axisId: '__proto__' },
    }).some(({ path }) => path === '$.x.axisId'),
  );
  assert.deepEqual(
    validateSpec({
      ...base,
      axes: { customX: { channel: 'x', position: 'bottom' } },
    }),
    [],
  );
});

test('shared composition unions a named scale and keeps its authored boundary axis', () => {
  const unit = (data) => ({
    data,
    axes: { time: { channel: 'x', position: 'bottom', title: 'Shared time' } },
    mark: 'line',
    x: { field: 'time', type: 'quantitative', axisId: 'time' },
    y: { field: 'value', type: 'quantitative' },
  });
  const result = compile(
    {
      vconcat: [
        unit([
          { time: 0, value: 1 },
          { time: 4, value: 2 },
        ]),
        unit([
          { time: 6, value: 3 },
          { time: 10, value: 4 },
        ]),
      ],
      resolve: { scale: 'shared', axis: 'shared' },
      width: 620,
      height: 520,
    },
    dimensions,
  );
  assert.deepEqual(
    result.coordinateViews.map(({ coordinates }) => coordinates.axes.time.domain()),
    [
      [0, 10],
      [0, 10],
    ],
  );
  const labels = flattenScene(result.scene.root)
    .filter((node) => node.type === 'text' && node.id.includes('axis-time:label:'))
    .map(({ id }) => id);
  assert.equal(
    labels.some((id) => id.startsWith('vconcat-0/')),
    false,
  );
  assert.equal(
    labels.some((id) => id.startsWith('vconcat-1/')),
    true,
  );
});

test('layer clip supports default, opt-out, plot-relative, and data-domain scene contracts', () => {
  const result = compile(
    {
      width: 'container',
      height: 'container',
      layers: [
        {
          id: 'default',
          data: [{ x: 20, y: 5 }],
          mark: 'point',
          x: { field: 'x', type: 'quantitative', scale: { domain: [0, 10] } },
          y: { field: 'y', type: 'quantitative', scale: { domain: [0, 10] } },
        },
        {
          id: 'unclipped',
          data: [{ x: 20, y: 5 }],
          mark: 'point',
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'y', type: 'quantitative' },
          clip: false,
        },
        {
          id: 'plot-window',
          data: [{ x: 5, y: 5 }],
          mark: 'point',
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'y', type: 'quantitative' },
          clip: { type: 'plot', x: 0.25, y: 0.1, width: 0.5, height: 0.7 },
        },
        {
          id: 'domain-window',
          data: [{ x: 5, y: 5 }],
          mark: 'point',
          x: { field: 'x', type: 'quantitative' },
          y: { field: 'y', type: 'quantitative' },
          clip: {
            type: 'domain',
            x: { from: 2, to: 8 },
            y: { from: 3, to: 7 },
          },
        },
      ],
    },
    dimensions,
  );
  const groups = Object.fromEntries(
    result.scene.root.children
      .filter((node) => node.type === 'group' && node.id.endsWith(':group'))
      .map((node) => [node.id, node]),
  );
  const plot = result.coordinates.plot;
  assert.deepEqual(groups['default:group'].clip, plot);
  assert.equal(groups['unclipped:group'].clip, undefined);
  assert.deepEqual(groups['plot-window:group'].clip, {
    x: plot.x + plot.width * 0.25,
    y: plot.y + plot.height * 0.1,
    width: plot.width * 0.5,
    height: plot.height * 0.7,
  });
  const x = [result.coordinates.axes.x.map(2), result.coordinates.axes.x.map(8)].sort(
    (left, right) => left - right,
  );
  const y = [result.coordinates.axes.y.map(3), result.coordinates.axes.y.map(7)].sort(
    (left, right) => left - right,
  );
  assert.deepEqual(groups['domain-window:group'].clip, {
    x: x[0],
    y: y[0],
    width: x[1] - x[0],
    height: y[1] - y[0],
  });
  const unclippedPoint = flattenScene(groups['unclipped:group']).find(
    (node) => node.type === 'circle',
  );
  assert.ok(unclippedPoint.cx > plot.x + plot.width);
});

test('schema exposes dynamic named axes and every authored layer clip mode', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(schema.$defs.axisId.pattern, '^[A-Za-z][A-Za-z0-9_-]{0,63}$');
  assert.equal(schema.properties.axes.additionalProperties.$ref, '#/$defs/namedAxis');
  assert.equal(schema.$defs.encodingObject.properties.axisId.$ref, '#/$defs/axisId');
  assert.equal(schema.$defs.tooltip.properties.axis.$ref, '#/$defs/axisId');
  assert.equal(schema.$defs.layer.properties.clip.$ref, '#/$defs/layerClip');
  assert.deepEqual(
    schema.$defs.layerClip.oneOf.map((entry) => entry.properties?.type?.const ?? 'boolean'),
    ['boolean', 'plot', 'domain'],
  );
});
