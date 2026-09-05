import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compile } from '../.tmp/src/index.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';
import { hitTestSharedAxisTooltip } from '../.tmp/src/interaction/axis-hit-test.js';
import { resolveSharedTooltipContent } from '../.tmp/src/interaction/tooltip.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const dimensions = { width: 800, height: 440 };
function spec(
  data = [
    { label: '2026-09-01', visitors: 1234, pageviews: 98765 },
    { label: '2026-09-02', visitors: 20, pageviews: 500 },
  ],
) {
  return {
    data,
    locale: 'ko-KR',
    layers: ['visitors', 'pageviews'].map((field, index) => ({
      id: field,
      name: index === 0 ? '방문자 수' : '페이지 뷰',
      mark: {
        type: 'bar',
        position: 'group',
        maxThickness: 28,
        fill: index === 0 ? '#6366F1' : '#B8DE29',
      },
      x: { field: 'label', type: 'ordinal' },
      y: {
        field,
        type: 'quantitative',
        axisId: index === 0 ? 'y' : 'y2',
        scale: { zero: true, nice: true },
      },
    })),
    legend: { mode: 'layers', interactive: true },
    interaction: {
      tooltip: { trigger: 'axis', axis: 'x', shared: true, titleField: 'label', pointer: 'shadow' },
    },
  };
}
function bars(scene) {
  return flattenScene(scene.root).filter(
    (node) => node.type === 'rect' && node.id.includes(':bar:'),
  );
}
function shared(result, label = '2026-09-01') {
  return hitTestSharedAxisTooltip(
    result.scene,
    result.coordinates.axes.x.map(label),
    result.coordinates.plot.y + 2,
  );
}

test('grouped bars on independent value axes share nonoverlapping capped category slots', () => {
  for (const horizontal of [false, true]) {
    const input = spec();
    if (horizontal) {
      input.interaction.tooltip.axis = 'y';
      input.layers = input.layers.map((layer, index) => ({
        ...layer,
        mark: { ...layer.mark, orientation: 'horizontal' },
        x: { ...layer.y, axisId: index === 0 ? 'x' : 'x2' },
        y: layer.x,
      }));
    }
    const { scene, coordinates } = compile(input, dimensions);
    const rendered = bars(scene);
    const first = rendered.filter((bar) => bar.datum.rowIndex === 0);
    const cross = horizontal ? 'y' : 'x';
    const thickness = horizontal ? 'height' : 'width';
    assert.equal(first.length, 2);
    assert.ok(first[0][cross] + first[0][thickness] <= first[1][cross]);
    assert.ok(rendered.every((bar) => bar[thickness] <= 28));
    assert.notDeepEqual(
      coordinates.axes[horizontal ? 'x' : 'y'].domain(),
      coordinates.axes[horizontal ? 'x2' : 'y2'].domain(),
    );
  }
});

test('separate category axes do not acquire a shared bar offset', () => {
  const input = spec();
  input.layers[1].x.axisId = 'x2';
  const first = bars(compile(input, dimensions).scene).filter((bar) => bar.datum.rowIndex === 0);
  assert.equal(first[0].x, first[1].x);
});

test('maxThickness honors subpixel, grouped-series and ranked bar widths and rejects invalid declarations', () => {
  for (const options of [{}, { rank: true }]) {
    const input = spec();
    input.layers = input.layers.map((layer) => ({
      ...layer,
      mark: { ...layer.mark, maxThickness: 0.5, options },
    }));
    const rendered = flattenScene(compile(input, dimensions).scene.root).filter(
      (node) => node.type === 'rect' && node.datum !== undefined,
    );
    assert.ok(rendered.length > 0);
    assert.ok(rendered.every((bar) => bar.width <= 0.5));
  }
  const grouped = compile(
    {
      data: [
        { label: 'A', series: 'One', value: 10 },
        { label: 'A', series: 'Two', value: 20 },
      ],
      mark: {
        type: 'bar',
        maxThickness: 17,
        fields: { series: 'series' },
        options: { stack: 'grouped' },
      },
      x: { field: 'label', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
    },
    dimensions,
  );
  const groupedBars = flattenScene(grouped.scene.root).filter(
    (node) => node.type === 'rect' && node.datum !== undefined,
  );
  assert.equal(groupedBars.length, 2);
  assert.ok(groupedBars.every((bar) => bar.width <= 17));
  for (const maxThickness of [0, -1, Infinity, NaN, '28']) {
    const input = spec();
    input.layers[0].mark.maxThickness = maxThickness;
    assert.ok(validateSpec(input).some(({ path }) => path.endsWith('.maxThickness')));
  }
  const input = spec();
  input.layers[0].mark.type = 'line';
  assert.ok(validateSpec(input).some(({ path }) => path.endsWith('.maxThickness')));
});

test('shared axis tooltip reports both visible series in order, native colors and Korean grouping', () => {
  const result = compile(spec(), dimensions);
  const hit = shared(result);
  assert.equal(hit.hits.length, 2);
  const content = resolveSharedTooltipContent(hit.hits, result.spec);
  assert.equal(content.title, '2026-09-01');
  assert.deepEqual(
    content.rows.map(({ label, value, color }) => ({ label, value, color })),
    [
      { label: '방문자 수', value: '1,234', color: '#6366F1' },
      { label: '페이지 뷰', value: '98,765', color: '#B8DE29' },
    ],
  );
  const first = bars(result.scene).filter((bar) => bar.datum.rowIndex === 0);
  assert.ok(
    first.every(
      (bar) => bar.x >= hit.pointer.x && bar.x + bar.width <= hit.pointer.x + hit.pointer.width,
    ),
  );
  assert.equal(hitTestSharedAxisTooltip(result.scene, 0, 0), null);
});

test('shared tooltips omit hidden layers and absent values without inventing interpolated data', () => {
  const input = spec();
  const hidden = compileWithRegistry(input, createDefaultRegistry(), dimensions, {
    hiddenLegendItemIds: new Set(['layer-pageviews-1']),
  });
  const hiddenContent = resolveSharedTooltipContent(shared(hidden).hits, hidden.spec);
  assert.deepEqual(
    hiddenContent.rows.map(({ field }) => field),
    ['visitors'],
  );
  const missingSpec = spec([{ label: '2026-09-01', visitors: 0, pageviews: null }]);
  missingSpec.layers[1].y.scale.domain = [0, 1];
  const missing = compile(missingSpec, dimensions);
  assert.deepEqual(
    resolveSharedTooltipContent(shared(missing).hits, missing.spec).rows.map(({ value }) => value),
    ['0'],
  );
  const emptySpec = spec([]);
  for (const layer of emptySpec.layers) layer.y.scale.domain = [0, 1];
  const empty = compile(emptySpec, dimensions);
  assert.equal(
    hitTestSharedAxisTooltip(
      empty.scene,
      empty.coordinates.plot.x + 1,
      empty.coordinates.plot.y + 1,
    ),
    null,
  );
});

test('authored tooltip formatting and explicit legend labels remain portable', () => {
  const input = spec();
  input.legend.items = [
    { id: 'people', label: '사람', layerId: 'visitors' },
    { id: 'views', label: '열람', layerId: 'pageviews' },
  ];
  input.interaction.tooltip.fields = [
    { field: 'visitors', label: '명수', format: 'integer', suffix: ' 명' },
  ];
  const result = compile(input, dimensions);
  const content = resolveSharedTooltipContent(shared(result).hits, result.spec);
  assert.deepEqual(
    content.rows.map(({ label, value }) => ({ label, value })),
    [
      { label: '명수', value: '1,234 명' },
      { label: '열람', value: '98,765' },
    ],
  );
  assert.deepEqual(
    normalizeSpec(JSON.parse(JSON.stringify(input))).interaction.tooltip,
    result.spec.interaction.tooltip,
  );
});

test('shared tooltip declarations validate axis requirements and safe title fields in schema and runtime', async () => {
  for (const tooltip of [
    { shared: true },
    { pointer: 'shadow' },
    { trigger: 'axis', axis: 'x', shared: 'yes' },
    { trigger: 'axis', axis: 'x', pointer: 'line' },
    { titleField: '__proto__' },
    { titleField: '' },
  ]) {
    const input = spec();
    input.interaction.tooltip = tooltip;
    assert.ok(validateSpec(input).length > 0, JSON.stringify(tooltip));
  }
  assert.deepEqual(validateSpec(spec()), []);
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(schema.$defs.tooltip.properties.shared.type, 'boolean');
  assert.deepEqual(schema.$defs.tooltip.properties.pointer.enum, ['none', 'shadow']);
  assert.equal(schema.$defs.markObject.properties.maxThickness.exclusiveMinimum, 0);
});

test('legend-hidden bar layers release their category slot and visible layers recenter', () => {
  for (const horizontal of [false, true]) {
    const input = spec();
    if (horizontal) {
      input.interaction.tooltip.axis = 'y';
      input.layers = input.layers.map((layer, index) => ({
        ...layer,
        mark: { ...layer.mark, orientation: 'horizontal' },
        x: { ...layer.y, axisId: index === 0 ? 'x' : 'x2' },
        y: layer.x,
      }));
    }
    for (const hiddenIndex of [0, 1]) {
      const hiddenLayer = input.layers[hiddenIndex].id;
      const result = compileWithRegistry(input, createDefaultRegistry(), dimensions, {
        hiddenLegendItemIds: new Set([`layer-${hiddenLayer}-${hiddenIndex}`]),
      });
      const visibleBars = bars(result.scene).filter((bar) => bar.datum.layerId !== hiddenLayer);
      assert.equal(visibleBars.length, input.data.length);
      for (const bar of visibleBars) {
        const expected = result.coordinates.axes[horizontal ? 'y' : 'x'].map(bar.datum.datum.label);
        const center = horizontal ? bar.y + bar.height / 2 : bar.x + bar.width / 2;
        assert.ok(Math.abs(center - expected) < 1e-8);
      }
    }
  }
});

test('capped sparse bar pairs stay compact and centered in each category at every zoom density', () => {
  for (const horizontal of [false, true]) {
    for (const count of [1, 4, 6, 18, 24]) {
      const input = spec(
        Array.from({ length: count }, (_, i) => ({
          label: `Month ${i}`,
          visitors: i + 1,
          pageviews: (i + 1) * 100,
        })),
      );
      if (horizontal) {
        input.interaction.tooltip.axis = 'y';
        input.layers = input.layers.map((layer, i) => ({
          ...layer,
          mark: { ...layer.mark, orientation: 'horizontal' },
          x: { ...layer.y, axisId: i ? 'x2' : 'x' },
          y: layer.x,
        }));
      }
      for (const width of [600, 1062, 1600]) {
        const result = compile(input, { width, height: 800 });
        const cross = horizontal ? 'y' : 'x';
        const size = horizontal ? 'height' : 'width';
        for (let i = 0; i < count; i++) {
          const pair = bars(result.scene)
            .filter(({ datum }) => datum.rowIndex === i)
            .sort((a, b) => a[cross] - b[cross]);
          const gap = pair[1][cross] - pair[0][cross] - pair[0][size];
          assert.ok(gap > 0 && gap < 10, `${count} categories: gap ${gap}`);
          const middle =
            (pair[0][cross] + pair[0][size] / 2 + pair[1][cross] + pair[1][size] / 2) / 2;
          assert.ok(Math.abs(middle - result.coordinates.axes[cross].map(`Month ${i}`)) < 1e-8);
          assert.ok(pair.every((bar) => bar[size] <= 28));
        }
      }
    }
  }
});

test('peer bar layers with different width caps retain ordered nonoverlapping shared slots', () => {
  const input = spec();
  input.layers = [8, 28, 12, 28].map((maxThickness, i) => ({
    ...input.layers[i % 2],
    id: `series-${i}`,
    mark: { type: 'bar', position: 'group', maxThickness },
  }));
  const result = compile(input, { width: 1200, height: 440 });
  const first = bars(result.scene).filter(({ datum }) => datum.rowIndex === 0);
  const centers = first.map((bar) => bar.x + bar.width / 2);
  for (let i = 1; i < first.length; i++) {
    assert.ok(first[i].x >= first[i - 1].x + first[i - 1].width);
    assert.ok(Math.abs(centers[i] - centers[i - 1] - (centers[1] - centers[0])) < 1e-8);
  }
  assert.ok(
    Math.abs((centers[0] + centers.at(-1)) / 2 - result.coordinates.axes.x.map('2026-09-01')) <
      1e-8,
  );
});
