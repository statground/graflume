import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const data = [
  { month: 'Jan', revenue: 1200, margin: 0.32 },
  { month: 'Feb', revenue: 1480, margin: 0.37 },
];

function baseSpec(overrides = {}) {
  return {
    data,
    mark: 'line',
    x: { field: 'month', type: 'ordinal' },
    y: { field: 'revenue', type: 'quantitative' },
    ...overrides,
  };
}

test('normalizes primary and secondary axis defaults without changing legacy spacing', () => {
  const spec = normalizeSpec(baseSpec());

  assert.equal(spec.axes.x.position, 'bottom');
  assert.equal(spec.axes.x.grid.visible, false);
  assert.equal(spec.axes.x.title.padding, 32);
  assert.equal(spec.axes.x2.position, 'top');
  assert.equal(spec.axes.x2.grid.visible, false);
  assert.equal(spec.axes.y.position, 'left');
  assert.equal(spec.axes.y.grid.visible, true);
  assert.equal(spec.axes.y.grid.opacity, 0.82);
  assert.equal(spec.axes.y.title.padding, 46);
  assert.equal(spec.axes.y2.position, 'right');
  assert.equal(spec.axes.y2.grid.visible, false);
  assert.equal(spec.layers[0].x.axisId, 'x');
  assert.equal(spec.layers[0].y.axisId, 'y');
  assert.equal(spec.layers[0].x.axis.labels.padding, undefined);
  assert.equal(spec.layers[0].y.axis.ticks.size, undefined);
});

test('promotes legacy axis aliases into the canonical normalized shape', () => {
  const spec = normalizeSpec(
    baseSpec({
      axes: {
        x: {
          title: 'Period',
          grid: true,
          tickCount: 7,
          labelAngle: -35,
          format: 'date',
        },
      },
    }),
  );
  const axis = spec.layers[0].x.axis;

  assert.equal(axis.title.text, 'Period');
  assert.equal(axis.grid.visible, true);
  assert.equal(axis.ticks.count, 7);
  assert.equal(axis.labels.angle, -35);
  assert.equal(axis.format.type, 'date');
  assert.equal(axis.format.timeZone, 'UTC');
});

test('deep merges chart axes with encoding overrides and binds x2/y2 independently', () => {
  const spec = normalizeSpec({
    data,
    axes: {
      x2: {
        title: { text: 'Reporting period', font: { family: 'Inter', size: 13 } },
        labels: { font: { family: 'Inter', size: 11 }, padding: 10 },
      },
      y2: {
        title: { text: 'Margin', font: { family: 'Inter', size: 12 } },
        grid: { visible: false, color: '#dbeafe', width: 2 },
        format: { type: 'percent', fractionDigits: 1 },
      },
    },
    layers: [
      {
        id: 'revenue',
        mark: 'bar',
        x: { field: 'month', type: 'ordinal' },
        y: { field: 'revenue', type: 'quantitative' },
      },
      {
        id: 'margin',
        mark: { type: 'line', point: true },
        x: {
          field: 'month',
          type: 'ordinal',
          axisId: 'x2',
          axis: { labels: { font: { weight: 'bold' } } },
        },
        y: {
          field: 'margin',
          type: 'quantitative',
          axisId: 'y2',
          axis: {
            grid: { opacity: 0.5 },
            title: { font: { weight: 700 } },
          },
        },
      },
    ],
  });

  const secondary = spec.layers[1];
  assert.equal(secondary.x.axisId, 'x2');
  assert.equal(secondary.x.axis.title.text, 'Reporting period');
  assert.deepEqual(secondary.x.axis.labels.font, {
    family: 'Inter',
    size: 11,
    weight: 'bold',
    style: 'normal',
  });
  assert.equal(secondary.y.axisId, 'y2');
  assert.equal(secondary.y.axis.position, 'right');
  assert.equal(secondary.y.axis.title.text, 'Margin');
  assert.equal(secondary.y.axis.title.font.family, 'Inter');
  assert.equal(secondary.y.axis.title.font.weight, 700);
  assert.equal(secondary.y.axis.grid.visible, false);
  assert.equal(secondary.y.axis.grid.color, '#dbeafe');
  assert.equal(secondary.y.axis.grid.width, 2);
  assert.equal(secondary.y.axis.grid.opacity, 0.5);
  assert.equal(secondary.y.axis.format.type, 'percent');
  assert.equal(secondary.y.axis.format.fractionDigits, 1);
});

test('normalizes declarative number, currency, and temporal format options', () => {
  const currency = normalizeSpec(
    baseSpec({
      axes: {
        y: {
          format: {
            type: 'currency',
            currency: 'KRW',
            currencyDisplay: 'narrowSymbol',
            fractionDigits: 0,
            notation: 'compact',
            useGrouping: false,
            prefix: '≈',
          },
        },
      },
    }),
  ).axes.y.format;
  assert.deepEqual(currency, {
    type: 'currency',
    fractionDigits: 0,
    notation: 'compact',
    useGrouping: false,
    currency: 'KRW',
    currencyDisplay: 'narrowSymbol',
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
    prefix: '≈',
    suffix: '',
  });

  assert.equal(
    normalizeSpec(baseSpec({ axes: { y: { format: 'compact' } } })).axes.y.format.notation,
    'compact',
  );
  assert.equal(
    normalizeSpec(baseSpec({ axes: { y: { format: 'scientific' } } })).axes.y.format.notation,
    'scientific',
  );
});

test('runtime validation closes the portable axis surface and enforces channel bindings', () => {
  const valid = validateSpec(
    baseSpec({
      x: {
        field: 'month',
        type: 'ordinal',
        axisId: 'x2',
        scale: { reverse: true },
        axis: {
          position: 'top',
          line: { width: 2, opacity: 0.8, dash: [4, 2] },
          ticks: { count: 6, size: 5, values: ['Jan', 'Feb'] },
          labels: {
            orientation: 'vertical-up',
            align: 'end',
            font: { family: 'Inter', size: 11, weight: 600, style: 'italic' },
          },
        },
      },
      y: {
        field: 'revenue',
        type: 'quantitative',
        axisId: 'y2',
        axis: {
          position: 'right',
          title: { text: 'Revenue', align: 'center', padding: 52 },
          format: { type: 'currency', currency: 'KRW', fractionDigits: 0 },
        },
      },
      interaction: { tooltip: { trigger: 'axis', axis: 'x2' } },
    }),
  );
  assert.deepEqual(valid, []);

  const invalid = validateSpec(
    baseSpec({
      axes: {
        x: { position: 'left', unknown: true },
        y2: { labels: { font: { size: 0 } } },
      },
      x: {
        field: 'month',
        axisId: 'y2',
        scale: { reverse: 'yes' },
        axis: { position: 'right' },
      },
      y: {
        field: 'revenue',
        axis: {
          ticks: { count: 0, values: [Number.NaN] },
          format: { type: 'currency', currency: 'krw' },
        },
      },
    }),
  );
  const paths = new Set(invalid.map(({ path }) => path));
  for (const path of [
    '$.axes.x.position',
    '$.axes.x.unknown',
    '$.axes.y2.labels.font.size',
    '$.x.axisId',
    '$.x.axis.position',
    '$.x.scale.reverse',
    '$.y.axis.ticks.count',
    '$.y.axis.ticks.values[0]',
    '$.y.axis.format.currency',
  ]) {
    assert.ok(paths.has(path), `validation reports ${path}`);
  }
});

test('JSON Schema exposes dynamic named-axis binding, style, and format contracts', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );

  assert.deepEqual(Object.keys(schema.properties.axes.properties), ['x', 'x2', 'y', 'y2']);
  assert.equal(schema.properties.axes.additionalProperties.$ref, '#/$defs/namedAxis');
  assert.equal(schema.$defs.encodingObject.properties.axisId.$ref, '#/$defs/axisId');
  assert.equal(schema.$defs.xEncoding.allOf[1].then.properties.axisId.$ref, '#/$defs/axisId');
  assert.equal(schema.$defs.yEncoding.allOf[1].then.properties.axisId.$ref, '#/$defs/axisId');
  assert.equal(schema.$defs.scale.properties.reverse.type, 'boolean');
  assert.equal(schema.$defs.axis.properties.format.$ref, '#/$defs/axisFormat');
  assert.equal(schema.$defs.axis.properties.labels.$ref, '#/$defs/axisLabelsOrBoolean');
  assert.equal(schema.$defs.axis.properties.ticks.$ref, '#/$defs/axisTicksOrBoolean');
  assert.equal(schema.$defs.tooltip.properties.axis.$ref, '#/$defs/axisId');
});

test('display label maps stay portable, copied, and bounded without changing category identity', () => {
  const values = { 'run-1': 'repo #42', 'run-2': 'repo #42' };
  const input = baseSpec({ axes: { x: { labels: { values } } } });
  assert.deepEqual(validateSpec(input), []);
  const normalized = normalizeSpec(input);
  values['run-1'] = 'mutated';
  assert.equal(normalized.axes.x.labels.values['run-1'], 'repo #42');
  for (const invalid of [[], { a: 4 }, { a: 'a'.repeat(2049) }, { ['a'.repeat(257)]: 'label' }]) {
    assert.ok(
      validateSpec(baseSpec({ axes: { x: { labels: { values: invalid } } } })).some(
        ({ path }) => path === '$.axes.x.labels.values',
      ),
    );
  }
});
