import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import {
  axisTooltipTargetCount,
  hitTestAxisTooltip,
} from '../.tmp/src/interaction/axis-hit-test.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const dimensions = { width: 480, height: 320 };

function axisLineSpec(axis = 'x') {
  return {
    width: 'container',
    height: 'container',
    data: [
      { period: 'Jan', value: 12 },
      { period: 'Feb', value: 21 },
      { period: 'Mar', value: 16 },
    ],
    mark: { type: 'line', point: false },
    x: { field: 'period', type: 'ordinal' },
    y: { field: 'value', type: 'quantitative' },
    interaction: { tooltip: { trigger: 'axis', axis } },
  };
}

test('axis tooltips are explicit while every existing tooltip form remains mark-triggered', () => {
  assert.equal(normalizeSpec(axisLineSpec()).interaction.tooltip.trigger, 'axis');
  assert.equal(normalizeSpec(axisLineSpec()).interaction.tooltip.axis, 'x');
  assert.equal(
    normalizeSpec({ ...axisLineSpec(), interaction: { tooltip: true } }).interaction.tooltip
      .trigger,
    'mark',
  );
  assert.equal(
    normalizeSpec({
      ...axisLineSpec(),
      interaction: { tooltip: { title: 'Existing object' } },
    }).interaction.tooltip.trigger,
    'mark',
  );
});

test('tooltip validation enforces the trigger and axis contract', () => {
  const cases = [
    [{ trigger: 'axis' }, '$.interaction.tooltip.axis'],
    [{ trigger: 'mark', axis: 'x' }, '$.interaction.tooltip.axis'],
    [{ axis: 'x' }, '$.interaction.tooltip.axis'],
    [{ trigger: 'nearest', axis: 'x' }, '$.interaction.tooltip.trigger'],
    [{ trigger: 'axis', axis: 'z' }, '$.interaction.tooltip.axis'],
    [{ trigger: 'axis', axis: 'x', html: true }, '$.interaction.tooltip.html'],
  ];
  for (const [tooltip, expectedPath] of cases) {
    const issues = validateSpec({ ...axisLineSpec(), interaction: { tooltip } });
    assert.ok(
      issues.some(({ path }) => path === expectedPath),
      `${JSON.stringify(tooltip)} should report ${expectedPath}`,
    );
  }
});

test('x-axis mode resolves a real line datum without requiring point marks', () => {
  const { scene } = compile(axisLineSpec(), dimensions);
  const path = flattenScene(scene.root).find(
    (node) => node.type === 'path' && node.id.includes(':line:'),
  );
  assert.ok(path && path.type === 'path');
  assert.equal(axisTooltipTargetCount(scene), 3);

  const second = path.points[1];
  assert.ok(second);
  assert.equal(hitTestScene(scene, second.x, 60), null);
  assert.equal(hitTestAxisTooltip(scene, second.x + 2, 60)?.rowIndex, 1);
});

test('axis mode includes the bounded visible tick strip but excludes unrelated padding', () => {
  const { scene } = compile(axisLineSpec(), dimensions);
  const path = flattenScene(scene.root).find(
    (node) => node.type === 'path' && node.id.includes(':line:'),
  );
  assert.ok(path && path.type === 'path');
  const first = path.points[0];
  assert.ok(first);
  const plotBottom = dimensions.height - 44;

  assert.equal(hitTestAxisTooltip(scene, first.x, plotBottom + 12)?.rowIndex, 0);
  assert.equal(hitTestAxisTooltip(scene, first.x, plotBottom + 28), null);
  assert.equal(hitTestAxisTooltip(scene, 20, plotBottom), null);
});

test('y-axis mode resolves the nearest horizontal category from its bounded axis strip', () => {
  const { scene } = compile(
    {
      data: [
        { task: 'Research', value: 18 },
        { task: 'Build', value: 31 },
        { task: 'Review', value: 24 },
      ],
      mark: { type: 'bar', orientation: 'horizontal' },
      width: 'container',
      height: 'container',
      padding: { left: 80 },
      x: { field: 'value', type: 'quantitative' },
      y: { field: 'task', type: 'ordinal' },
      interaction: { tooltip: { trigger: 'axis', axis: 'y' } },
    },
    dimensions,
  );
  const bars = flattenScene(scene.root).filter((node) => node.type === 'rect' && node.interactive);
  const second = bars.find((node) => node.datum?.rowIndex === 1);
  assert.ok(second && second.type === 'rect');
  const centerY = second.y + second.height / 2;

  assert.equal(hitTestAxisTooltip(scene, 40, centerY)?.rowIndex, 1);
  assert.equal(hitTestAxisTooltip(scene, 20, centerY), null);
});

test('derived histogram bins remain the semantic axis targets', () => {
  const { scene } = compile(
    {
      data: [{ value: 10 }, { value: 10.5 }, { value: 14 }],
      mark: { type: 'histogram', options: { bins: 2 } },
      x: { field: 'value', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
      interaction: { tooltip: { trigger: 'axis', axis: 'x' } },
    },
    dimensions,
  );
  const bin = flattenScene(scene.root).find(
    (node) => node.type === 'rect' && node.datum?.tooltip?.count === 2,
  );
  assert.ok(bin && bin.type === 'rect');
  const selected = hitTestAxisTooltip(scene, bin.x + bin.width / 2, 40);

  assert.equal(selected?.tooltip?.count, 2);
  assert.equal(selected?.tooltip?.proportion, 2 / 3);
});

test('mark-triggered and performance-disabled charts do not build an axis index', () => {
  const mark = compile(
    { ...axisLineSpec(), interaction: { tooltip: { trigger: 'mark' } } },
    dimensions,
  );
  const large = compile({ ...axisLineSpec(), performance: 'large' }, dimensions);

  assert.equal(axisTooltipTargetCount(mark.scene), 0);
  assert.equal(axisTooltipTargetCount(large.scene), 0);
  assert.equal(hitTestAxisTooltip(large.scene, 200, 100), null);
});
