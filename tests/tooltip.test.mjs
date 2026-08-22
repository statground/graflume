import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { compile } from '../.tmp/src/index.js';
import { compile as compileComplete } from '../.tmp/src/complete.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { resolveTooltipContent } from '../.tmp/src/interaction/tooltip.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const tooltipSourceUrl = new URL('../src/interaction/tooltip.ts', import.meta.url);

function chartSpec(interaction, locale = 'en-US') {
  return normalizeSpec({
    data: [{ date: '2026-08-23', value: 1234.5, ratio: 0.425 }],
    mark: { type: 'point' },
    x: { field: 'date', type: 'temporal', title: 'Observed date' },
    y: { field: 'value', type: 'quantitative', title: 'Observed value' },
    locale,
    interaction,
  });
}

function hit(datum, tooltip) {
  return {
    layerId: 'layer-0',
    rowIndex: 0,
    datum,
    ...(tooltip === undefined ? {} : { tooltip }),
    nodeId: 'layer-0:datum-0',
    x: 100,
    y: 100,
    distance: 0,
  };
}

test('built-in tooltips are opt-in and remain disabled when hover is disabled', () => {
  assert.equal(chartSpec(undefined).interaction.tooltip, false);
  assert.deepEqual(chartSpec({ tooltip: true }).interaction.tooltip, {
    trigger: 'mark',
    fields: [],
  });
  assert.equal(chartSpec({ hover: false, tooltip: true }).interaction.tooltip, false);
});

test('normalizes a portable tooltip title and explicit field formatting', () => {
  const spec = chartSpec(
    {
      tooltip: {
        title: 'Observation',
        fields: [
          'date',
          {
            field: 'value',
            label: 'Revenue',
            format: 'number',
            fractionDigits: 1,
            prefix: '$',
            suffix: ' USD',
          },
        ],
      },
    },
    'de-DE',
  );

  assert.equal(spec.locale, 'de-DE');
  assert.deepEqual(spec.interaction.tooltip, {
    trigger: 'mark',
    title: 'Observation',
    fields: [
      {
        field: 'date',
        label: 'Date',
        format: 'auto',
        prefix: '',
        suffix: '',
      },
      {
        field: 'value',
        label: 'Revenue',
        format: 'number',
        fractionDigits: 1,
        prefix: '$',
        suffix: ' USD',
      },
    ],
  });
});

test('formats explicit tooltip fields with the chart locale and preserves their order', () => {
  const spec = chartSpec(
    {
      tooltip: {
        title: 'Localized observation',
        fields: [
          { field: 'value', label: 'Revenue', format: 'number', fractionDigits: 1, suffix: ' kg' },
          { field: 'ratio', label: 'Share', format: 'percent', fractionDigits: 1 },
        ],
      },
    },
    'de-DE',
  );
  const content = resolveTooltipContent(
    hit({ date: '2026-08-23', value: 1234.5, ratio: 0.425 }),
    spec,
  );

  assert.equal(content.title, 'Localized observation');
  assert.deepEqual(
    content.rows.map(({ field, label }) => ({ field, label })),
    [
      { field: 'value', label: 'Revenue' },
      { field: 'ratio', label: 'Share' },
    ],
  );
  assert.equal(
    content.rows[0].value,
    `${new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(1234.5)} kg`,
  );
  assert.equal(
    content.rows[1].value,
    new Intl.NumberFormat('de-DE', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(0.425),
  );
});

test('mark-derived tooltip values take precedence over representative source rows', () => {
  const spec = normalizeSpec({
    data: [{ sample: 11, count: 99 }],
    mark: { type: 'histogram' },
    x: { field: 'sample', type: 'quantitative' },
    y: { field: 'count', type: 'quantitative' },
    interaction: {
      tooltip: {
        title: 'Histogram bin',
        fields: [
          { field: 'binStart', label: 'From', format: 'number' },
          { field: 'binEnd', label: 'To', format: 'number' },
          { field: 'count', label: 'Count', format: 'integer' },
        ],
      },
    },
  });
  const content = resolveTooltipContent(
    hit(
      { sample: 11, count: 99 },
      {
        binStart: 10,
        binEnd: 12,
        count: 7,
      },
    ),
    spec,
  );

  assert.deepEqual(
    content.rows.map(({ field, value }) => [field, value]),
    [
      ['binStart', '10'],
      ['binEnd', '12'],
      ['count', '7'],
    ],
  );
});

test('aggregate and relationship compilers attach truthful semantic tooltip payloads', () => {
  const histogram = compile(
    {
      data: [{ value: 10 }, { value: 10.5 }, { value: 14 }],
      mark: { type: 'histogram', options: { bins: 2 } },
      x: { field: 'value', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    },
    { width: 480, height: 320 },
  );
  const bin = flattenScene(histogram.scene.root).find((node) => node.id.includes(':bin:'));
  assert.ok(bin?.datum?.tooltip);
  assert.equal(bin.datum.tooltip.count, 2);
  assert.equal(bin.datum.tooltip.proportion, 2 / 3);

  const volumeProfile = compileComplete(
    {
      data: [
        { date: '2026-01-01', price: 20, volume: 120 },
        { date: '2026-01-02', price: 20.5, volume: 80 },
        { date: '2026-01-03', price: 24, volume: 50 },
      ],
      mark: {
        type: 'volume-profile',
        fields: { price: 'price', volume: 'volume' },
        options: { bins: 4 },
      },
      x: { field: 'date', type: 'temporal' },
      y: { field: 'price', type: 'quantitative' },
    },
    { width: 480, height: 320 },
  );
  const volumeBin = flattenScene(volumeProfile.scene.root).find(
    (node) => node.datum?.tooltip?.volume === 200,
  );
  assert.ok(volumeBin?.datum?.tooltip);
  assert.equal(volumeBin.datum.tooltip.proportion, 0.8);
  assert.equal(Object.hasOwn(volumeBin.datum.tooltip, 'date'), false);

  const network = compileComplete(
    {
      data: [
        { source: 'A', target: 'B', value: 4 },
        { source: 'A', target: 'C', value: 6 },
      ],
      mark: { type: 'graph', fields: { source: 'source', target: 'target', value: 'value' } },
      x: { field: 'source', type: 'ordinal' },
      y: { field: 'target', type: 'ordinal' },
    },
    { width: 480, height: 320 },
  );
  const graphNodes = flattenScene(network.scene.root);
  const edge = graphNodes.find((node) => node.id.includes(':graph-edge:'));
  const nodeA = graphNodes.find((node) => node.id.endsWith(':graph-node:A'));
  assert.deepEqual(edge?.datum?.tooltip, {
    kind: 'edge',
    source: 'A',
    target: 'B',
    value: 4,
  });
  assert.deepEqual(nodeA?.datum?.tooltip, { kind: 'node', node: 'A', degree: 2, total: 10 });
});

test('date-only tooltip values do not move to the previous day in western time zones', () => {
  const previousTimezone = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    const spec = chartSpec({
      tooltip: {
        fields: [{ field: 'date', label: 'Date', format: 'date' }],
      },
    });
    const content = resolveTooltipContent(
      hit({ date: '2026-08-23', value: 1234.5, ratio: 0.425 }),
      spec,
    );

    assert.equal(content.rows[0].value, 'Aug 23, 2026');
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test('tooltip validation rejects executable and unsafe formatting declarations', () => {
  const issues = validateSpec({
    data: [{ category: 'A', value: 1 }],
    mark: 'bar',
    x: 'category',
    y: 'value',
    interaction: {
      tooltip: {
        formatter: () => '<strong>unsafe</strong>',
        fields: [{ field: '__proto__' }, { field: 'value', format: 'html', fractionDigits: 7 }],
      },
    },
  });

  assert.ok(issues.some(({ message }) => message.includes('Functions are not allowed')));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[0].field'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[1].format'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.fields[1].fractionDigits'));
  assert.ok(issues.some(({ path }) => path === '$.interaction.tooltip.formatter'));
});

test('tooltip DOM rendering stays text-only for untrusted titles, labels, and values', async () => {
  const source = await readFile(tooltipSourceUrl, 'utf8');

  assert.doesNotMatch(source, /\binnerHTML\b|insertAdjacentHTML|DOMParser/);
  assert.match(source, /\.textContent\s*=/);

  const spec = normalizeSpec({
    data: [{ category: 'A', value: '<img src=x onerror=alert(1)>' }],
    mark: 'bar',
    x: 'category',
    y: 'value',
    interaction: {
      tooltip: {
        title: '<strong>Unsafe title</strong>',
        fields: [{ field: 'value', label: '<em>Unsafe label</em>' }],
      },
    },
  });
  const content = resolveTooltipContent(
    hit({ category: 'A', value: '<img src=x onerror=alert(1)>' }),
    spec,
  );

  assert.equal(content.title, '<strong>Unsafe title</strong>');
  assert.equal(content.rows[0].label, '<em>Unsafe label</em>');
  assert.equal(content.rows[0].value, '<img src=x onerror=alert(1)>');
});

test('interactive text nodes participate in pointer hit testing while hidden nodes do not', () => {
  const textNode = {
    type: 'text',
    id: 'word-0',
    zIndex: 1,
    opacity: 1,
    visible: true,
    interactive: true,
    datum: { layerId: 'words', rowIndex: 0, datum: { word: 'Analytics', weight: 92 } },
    x: 120,
    y: 80,
    text: 'Analytics',
    fill: '#111827',
    fontFamily: 'sans-serif',
    fontSize: 20,
    fontWeight: 700,
    align: 'center',
    baseline: 'middle',
    rotation: -12,
  };
  const scene = {
    width: 240,
    height: 160,
    background: '#ffffff',
    root: {
      type: 'group',
      id: 'root',
      zIndex: 0,
      opacity: 1,
      visible: true,
      children: [textNode],
    },
    accessibility: { label: 'Word cloud' },
    metadata: {
      rowCount: 1,
      renderedNodeCount: 1,
      performanceProfile: 'standard',
      hitTestingEnabled: true,
    },
  };

  assert.equal(hitTestScene(scene, textNode.x, textNode.y, 0)?.datum.word, 'Analytics');
  assert.equal(
    hitTestScene(
      { ...scene, root: { ...scene.root, children: [{ ...textNode, visible: false }] } },
      textNode.x,
      textNode.y,
      8,
    ),
    null,
  );
  assert.equal(
    hitTestScene({ ...scene, root: { ...scene.root, opacity: 0 } }, textNode.x, textNode.y, 8),
    null,
  );
  assert.equal(
    hitTestScene(
      {
        ...scene,
        root: { ...scene.root, clip: { x: 0, y: 0, width: 20, height: 20 } },
      },
      textNode.x,
      textNode.y,
      8,
    ),
    null,
  );
});

test('area points expose datum hit targets when point rendering is requested', () => {
  const data = [
    { month: 'Jan', value: 12 },
    { month: 'Feb', value: 18 },
    { month: 'Mar', value: 15 },
  ];
  const { scene } = compile(
    {
      data,
      mark: { type: 'area', point: true },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
      interaction: { tooltip: true },
    },
    { width: 480, height: 320 },
  );
  const points = flattenScene(scene.root).filter(
    (node) => node.type === 'circle' && node.interactive === true && node.datum !== undefined,
  );

  assert.equal(points.length, data.length);
  assert.equal(hitTestScene(scene, points[1].cx, points[1].cy, 0)?.rowIndex, 1);
});
