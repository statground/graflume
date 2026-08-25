import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { executeTransforms } from '../.tmp/src/data/transforms.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const rows = [
  { group: 'a', series: 'x', x: 1, y: 2, weight: 1, time: '2024-01-01T00:00:00Z' },
  { group: 'a', series: 'y', x: 2, y: 4, weight: 3, time: '2024-01-01T00:00:02Z' },
  { group: 'b', series: 'x', x: 3, y: 6, weight: 2, time: '2024-01-01T00:00:04Z' },
];

test('ordered filter, calculate, and stable sort use a closed expression AST', () => {
  const result = executeTransforms(rows, [
    {
      type: 'calculate',
      as: 'double',
      expr: {
        op: 'multiply',
        left: { op: 'field', field: 'y' },
        right: { op: 'literal', value: 2 },
      },
    },
    {
      type: 'filter',
      expr: {
        op: 'greaterThan',
        left: { op: 'field', field: 'double' },
        right: { op: 'literal', value: 4 },
      },
    },
    { type: 'sort', by: [{ field: 'double', order: 'descending' }] },
  ]);
  assert.deepEqual(
    result.data.map(({ double }) => double),
    [12, 8],
  );
  assert.deepEqual(result.lineage.rowSources, [[2], [1]]);
  assert.deepEqual(
    result.lineage.transforms.map(({ type }) => type),
    ['calculate', 'filter', 'sort'],
  );
});

test('aggregate and joinaggregate support weighted and ordinary summaries', () => {
  const aggregated = executeTransforms(rows, [
    {
      type: 'aggregate',
      groupby: ['group'],
      fields: [
        { op: 'sum', field: 'y', as: 'total' },
        { op: 'weightedMean', field: 'y', weight: 'weight', as: 'weighted' },
        { op: 'count', as: 'count' },
      ],
    },
  ]);
  assert.deepEqual(aggregated.data, [
    { group: 'a', total: 6, weighted: 3.5, count: 2 },
    { group: 'b', total: 6, weighted: 6, count: 1 },
  ]);
  const joined = executeTransforms(rows, [
    { type: 'joinaggregate', groupby: ['group'], fields: [{ op: 'mean', field: 'y', as: 'mean' }] },
  ]);
  assert.deepEqual(
    joined.data.map(({ mean }) => mean),
    [3, 3, 6],
  );
});

test('bin and density transforms are deterministic', () => {
  const binned = executeTransforms(rows, [
    { type: 'bin', field: 'x', as: ['x0', 'x1'], maxbins: 2 },
  ]);
  assert.deepEqual(
    binned.data.map(({ x0, x1 }) => [x0, x1]),
    [
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  );
  const binned2d = executeTransforms(rows, [
    { type: 'bin2d', x: 'x', y: 'y', as: ['x0', 'x1', 'y0', 'y1', 'count'], maxbins: [2, 2] },
  ]);
  assert.equal(
    binned2d.data.reduce((sum, row) => sum + row.count, 0),
    rows.length,
  );
  const density = executeTransforms(rows, [
    { type: 'density1d', field: 'x', as: ['value', 'density'], points: 5, bandwidth: 1 },
  ]);
  assert.equal(density.data.length, 5);
  assert.ok(density.data.every(({ density: value }) => Number.isFinite(value)));
  const density2d = executeTransforms(rows, [
    { type: 'density2d', x: 'x', y: 'y', as: ['bx', 'by', 'density'], bins: [2, 2] },
  ]);
  assert.equal(density2d.data.length, 4);
  assert.ok(density2d.data.every(({ density: value }) => Number.isFinite(value) && value >= 0));
});

test('stack offsets and window calculations preserve deterministic group order', () => {
  const stacked = executeTransforms(rows, [
    {
      type: 'stack',
      field: 'y',
      groupby: ['group'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'normalize',
      order: 'sumDescending',
    },
  ]);
  assert.deepEqual(
    stacked.data.filter(({ group }) => group === 'a').map(({ series, y0, y1 }) => [series, y0, y1]),
    [
      ['x', 0, 1 / 3],
      ['y', 1 / 3, 1],
    ],
  );
  const windowed = executeTransforms(rows, [
    {
      type: 'window',
      sort: [{ field: 'x' }],
      frame: [-1, 0],
      fields: [
        { op: 'rowNumber', as: 'row' },
        { op: 'cumulativeSum', field: 'y', as: 'cumulative' },
        { op: 'movingAverage', field: 'y', as: 'moving' },
        { op: 'lag', field: 'y', as: 'previous' },
      ],
    },
  ]);
  assert.deepEqual(
    windowed.data.map(({ row, cumulative, moving, previous }) => [
      row,
      cumulative,
      moving,
      previous,
    ]),
    [
      [1, 2, 2, null],
      [2, 6, 3, 2],
      [3, 12, 5, 4],
    ],
  );
});

test('diverging stacks accumulate both signs and aliases preserve offset semantics', () => {
  const diverging = [
    { x: 'a', series: 'p1', value: 4 },
    { x: 'a', series: 'n', value: -2 },
    { x: 'a', series: 'p2', value: 1 },
  ];
  const zero = executeTransforms(diverging, [
    {
      type: 'stack',
      field: 'value',
      groupby: ['x'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'zero',
    },
  ]).data;
  assert.deepEqual(
    zero.map(({ y0, y1 }) => [y0, y1]),
    [
      [0, 4],
      [-2, 0],
      [4, 5],
    ],
  );
  const normalized = executeTransforms(diverging, [
    {
      type: 'stack',
      field: 'value',
      groupby: ['x'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'normalize',
    },
  ]);
  const normalize = normalized.data;
  assert.ok(
    Math.abs(normalize.reduce((sum, row) => sum + Math.abs(row.y1 - row.y0), 0) - 1) < 1e-12,
  );
  assert.match(normalized.lineage.summary, /total absolute magnitude/);
  assert.equal(normalized.lineage.transforms[0].aggregationCount, 1);
  assert.equal(normalized.lineage.transforms[0].parameters.offset, 'normalize');
  const expand = executeTransforms(diverging, [
    {
      type: 'stack',
      field: 'value',
      groupby: ['x'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'expand',
    },
  ]).data;
  assert.deepEqual(expand, normalize);
  const center = executeTransforms(diverging, [
    {
      type: 'stack',
      field: 'value',
      groupby: ['x'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'center',
    },
  ]).data;
  assert.equal(Math.min(...center.map(({ y0 }) => y0)), -3.5);
  assert.equal(Math.max(...center.map(({ y1 }) => y1)), 3.5);
  const silhouette = executeTransforms(diverging, [
    {
      type: 'stack',
      field: 'value',
      groupby: ['x'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'silhouette',
    },
  ]).data;
  assert.deepEqual(silhouette, center);
  assert.throws(
    () =>
      executeTransforms(diverging, [
        {
          type: 'stack',
          field: 'value',
          groupby: ['x'],
          series: ['series'],
          as: ['y0', 'y1'],
          offset: 'wiggle',
        },
      ]),
    /non-negative/,
  );
});

test('wiggle computes a streamgraph baseline distinct from silhouette centering', () => {
  const stream = [
    { x: 0, series: 'a', value: 1 },
    { x: 0, series: 'b', value: 5 },
    { x: 1, series: 'a', value: 5 },
    { x: 1, series: 'b', value: 1 },
    { x: 2, series: 'a', value: 2 },
    { x: 2, series: 'b', value: 6 },
  ];
  const wiggle = executeTransforms(stream, [
    {
      type: 'stack',
      field: 'value',
      groupby: ['x'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'wiggle',
    },
  ]).data;
  const silhouette = executeTransforms(stream, [
    {
      type: 'stack',
      field: 'value',
      groupby: ['x'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'silhouette',
    },
  ]).data;
  const wiggleBaselines = wiggle.filter(({ series }) => series === 'a').map(({ y0 }) => y0);
  const silhouetteBaselines = silhouette.filter(({ series }) => series === 'a').map(({ y0 }) => y0);
  assert.ok(wiggleBaselines.every(Number.isFinite));
  assert.notDeepEqual(wiggleBaselines, silhouetteBaselines);
  for (const x of [0, 1, 2]) {
    const source = stream.filter((row) => row.x === x);
    const stacked = wiggle.filter((row) => row.x === x);
    assert.deepEqual(
      stacked.map((row) => row.y1 - row.y0),
      stacked.map((row) => source.find(({ series }) => series === row.series).value),
    );
    assert.ok(stacked.every((row, index) => index === 0 || row.y0 === stacked[index - 1].y1));
  }
  const insideOut = executeTransforms(stream, [
    {
      type: 'stack',
      field: 'value',
      groupby: ['x'],
      series: ['series'],
      as: ['y0', 'y1'],
      offset: 'wiggle',
      order: 'insideOut',
    },
  ]);
  assert.equal(insideOut.data.length, stream.length);
  assert.match(insideOut.lineage.summary, /non-negative streamgraph baseline/);
});

test('regression, reshape, impute, and lookup expose source lineage', () => {
  const regression = executeTransforms(rows, [
    { type: 'regression', x: 'x', y: 'y', as: ['rx', 'ry'] },
  ]);
  assert.deepEqual(regression.data, [
    { rx: 1, ry: 2 },
    { rx: 3, ry: 6 },
  ]);
  const folded = executeTransforms(
    [{ id: 1, a: 2, b: 3 }],
    [{ type: 'fold', fields: ['a', 'b'], as: ['key', 'value'] }],
  );
  assert.deepEqual(
    folded.data.map(({ key, value }) => [key, value]),
    [
      ['a', 2],
      ['b', 3],
    ],
  );
  const flattened = executeTransforms(
    [{ id: 1, values: [2, 3] }],
    [{ type: 'flatten', fields: ['values'], as: ['value'] }],
  );
  assert.deepEqual(
    flattened.data.map(({ value }) => value),
    [2, 3],
  );
  const pivoted = executeTransforms(rows, [
    { type: 'pivot', field: 'series', value: 'y', groupby: ['group'], op: 'sum' },
  ]);
  assert.deepEqual(pivoted.data, [
    { group: 'a', x: 2, y: 4 },
    { group: 'b', x: 6 },
  ]);
  const imputed = executeTransforms(
    [
      { g: 'a', key: 1, value: 2 },
      { g: 'a', key: 2, value: 4 },
      { g: 'b', key: 1, value: 8 },
    ],
    [{ type: 'impute', field: 'value', key: 'key', groupby: ['g'], method: 'mean' }],
  );
  assert.deepEqual(
    imputed.data.find(({ g, key }) => g === 'b' && key === 2),
    { g: 'b', key: 2, value: 8 },
  );
  const looked = executeTransforms(rows, [
    {
      type: 'lookup',
      field: 'group',
      from: [{ key: 'a', label: 'Alpha' }],
      key: 'key',
      values: ['label'],
      default: 'Unknown',
    },
  ]);
  assert.deepEqual(
    looked.data.map(({ label }) => label),
    ['Alpha', 'Alpha', 'Unknown'],
  );
  assert.deepEqual(regression.lineage.rowSources, [
    [0, 1, 2],
    [0, 1, 2],
  ]);
});

test('quantile, seeded sample, resample, and UTC timeUnit remain reproducible', () => {
  const quantiles = executeTransforms(rows, [
    { type: 'quantile', field: 'y', probs: [0, 0.5, 1], as: ['p', 'q'] },
  ]);
  assert.deepEqual(
    quantiles.data.map(({ q }) => q),
    [2, 4, 6],
  );
  const sampleA = executeTransforms(
    Array.from({ length: 20 }, (_, x) => ({ x })),
    [{ type: 'sample', size: 5, seed: 7 }],
  );
  const sampleB = executeTransforms(
    Array.from({ length: 20 }, (_, x) => ({ x })),
    [{ type: 'sample', size: 5, seed: 7 }],
  );
  assert.deepEqual(sampleA.data, sampleB.data);
  assert.equal(sampleA.lineage.transforms[0].seed, 7);
  assert.doesNotThrow(() => JSON.stringify(sampleA.lineage));
  const resampled = executeTransforms(
    [
      { t: 0, y: 0 },
      { t: 2, y: 4 },
    ],
    [{ type: 'resample', field: 't', interval: 1, method: 'linear' }],
  );
  assert.deepEqual(resampled.data, [
    { t: 0, y: 0 },
    { t: 1, y: 2 },
    { t: 2, y: 4 },
  ]);
  const temporal = executeTransforms(rows, [
    { type: 'timeUnit', field: 'time', unit: 'seconds', as: 'second' },
  ]);
  assert.deepEqual(
    temporal.data.map(({ second }) => second),
    [0, 2, 4],
  );
});

test('top-level then layer transforms feed domains, rendering, and provenance', () => {
  const spec = {
    data: rows,
    transform: [
      {
        type: 'filter',
        expr: {
          op: 'notEqual',
          left: { op: 'field', field: 'group' },
          right: { op: 'literal', value: 'b' },
        },
      },
    ],
    layers: [
      {
        mark: 'bar',
        x: 'series',
        y: 'total',
        transform: [
          {
            type: 'aggregate',
            groupby: ['series'],
            fields: [{ op: 'sum', field: 'y', as: 'total' }],
          },
        ],
      },
    ],
  };
  assert.equal(validateSpec(spec).length, 0);
  const result = compileWithRegistry(spec, createDefaultRegistry(), { width: 400, height: 300 });
  assert.equal(result.scene.metadata.rowCount, 2);
  assert.equal(result.dataLineage['layer-0'].transforms.length, 2);
  assert.match(result.scene.accessibility.description, /2 ordered transforms/);
});

test('validation rejects functions, unsafe fields, unknown keys, and invalid contracts', () => {
  const base = { data: rows, mark: 'line', x: 'x', y: 'y' };
  assert.ok(
    validateSpec({
      ...base,
      transform: [{ type: 'calculate', as: '__proto__', expr: { op: 'literal', value: 1 } }],
    }).length > 0,
  );
  assert.ok(
    validateSpec({ ...base, transform: [{ type: 'filter', expr: () => true }] }).some(
      ({ message }) => message.includes('Functions are not allowed'),
    ),
  );
  assert.ok(
    validateSpec({ ...base, transform: [{ type: 'sample', size: 0, surprise: true }] }).some(
      ({ path }) => path.endsWith('.surprise'),
    ),
  );
  assert.ok(
    validateSpec({
      ...base,
      transform: [
        { type: 'lookup', field: 'group', key: 'key', from: [], values: ['label'], as: ['a', 'b'] },
      ],
    }).some(({ path }) => path.endsWith('.as')),
  );
  assert.throws(() => executeTransforms(rows, [{ type: 'sample', size: 0 }]), /positive integer/);
});

test('aggregate, normalized stack, quantile, and seeded sample invariants hold across generated inputs', () => {
  for (let length = 1; length <= 40; length += 1) {
    const generated = Array.from({ length }, (_, index) => ({
      group: `g${index % 4}`,
      series: `s${index % 5}`,
      value: ((index * 17 + length * 11) % 97) + 1,
    }));
    const aggregate = executeTransforms(generated, [
      {
        type: 'aggregate',
        fields: [
          { op: 'sum', field: 'value', as: 'sum' },
          { op: 'count', as: 'count' },
        ],
      },
    ]).data[0];
    assert.equal(
      aggregate.sum,
      generated.reduce((sum, { value }) => sum + value, 0),
    );
    assert.equal(aggregate.count, length);

    const stack = executeTransforms(generated, [
      {
        type: 'stack',
        field: 'value',
        groupby: ['group'],
        series: ['series'],
        as: ['start', 'end'],
        offset: 'normalize',
      },
    ]).data;
    for (const group of new Set(stack.map(({ group }) => group))) {
      const selected = stack.filter((row) => row.group === group);
      assert.ok(Math.abs(selected.at(-1).end - 1) < 1e-12);
      assert.ok(
        selected.every(
          (row, index) =>
            row.start <= row.end && (index === 0 || row.start === selected[index - 1].end),
        ),
      );
    }

    const quantiles = executeTransforms(generated, [
      { type: 'quantile', field: 'value', probs: [0, 0.25, 0.5, 0.75, 1], as: ['p', 'q'] },
    ]).data;
    assert.ok(quantiles.every((row, index) => index === 0 || row.q >= quantiles[index - 1].q));

    const sample = executeTransforms(generated, [
      { type: 'sample', size: Math.min(7, length), seed: length },
    ]).data;
    assert.equal(sample.length, Math.min(7, length));
    assert.ok(sample.every(({ value }) => generated.some((row) => row.value === value)));
  }
});

test('JSON Schema exposes chart and layer transforms with closed nodes and required contracts', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(schema.properties.transform.$ref, '#/$defs/transformList');
  assert.equal(schema.$defs.layer.properties.transform.$ref, '#/$defs/transformList');
  assert.equal(schema.$defs.transform.additionalProperties, false);
  assert.equal(schema.$defs.transform.properties.points.maximum, 512);
  assert.equal(schema.$defs.transform.properties.probs.maxItems, 512);
  assert.ok(schema.$defs.transform.properties.type.enum.includes('density2d'));
  assert.ok(schema.$defs.transform.properties.offset.enum.includes('silhouette'));
  assert.ok(schema.$defs.transform.properties.order.enum.includes('insideOut'));
  assert.ok(schema.$defs.transform.allOf.some(({ then }) => then.required?.includes('interval')));
});

test('lineage parameter snapshots convert Dates and typed arrays to JSON-safe values', () => {
  const lookup = executeTransforms(
    [{ key: 1 }],
    [
      {
        type: 'lookup',
        field: 'key',
        from: {
          columns: {
            key: new Float64Array([1]),
            when: [new Date('2024-01-01T00:00:00Z')],
          },
        },
        key: 'key',
        values: ['when'],
      },
    ],
  );
  const snapshot = lookup.lineage.transforms[0].parameters;
  assert.deepEqual(snapshot.from.columns.key, [1]);
  assert.equal(snapshot.from.columns.when[0], '2024-01-01T00:00:00.000Z');
  assert.doesNotThrow(() => JSON.stringify(lookup.lineage));
});

test('derived transform work is bounded and oversized requests fail explicitly', () => {
  const largeExtent = executeTransforms(
    Array.from({ length: 200_000 }, (_, value) => ({ value })),
    [
      {
        type: 'aggregate',
        fields: [
          { op: 'min', field: 'value', as: 'minimum' },
          { op: 'max', field: 'value', as: 'maximum' },
        ],
      },
    ],
  );
  assert.deepEqual(largeExtent.data, [{ minimum: 0, maximum: 199_999 }]);

  assert.throws(
    () =>
      executeTransforms(
        [{ x: 0 }, { x: 1 }],
        [{ type: 'resample', field: 'x', interval: 0.000001 }],
      ),
    /deterministic limit is 100000/,
  );

  assert.throws(
    () =>
      executeTransforms(
        Array.from({ length: 2_001 }, (_, index) => ({
          bucket: index,
          series: `s-${index}`,
          value: 1,
        })),
        [
          {
            type: 'stack',
            field: 'value',
            groupby: ['bucket'],
            series: ['series'],
            as: ['y0', 'y1'],
            order: 'insideOut',
          },
        ],
      ),
    /Stack layout would require .* deterministic limit is 1000000/,
  );

  assert.throws(
    () =>
      executeTransforms(
        Array.from({ length: 1_000 }, (_, index) => ({ x: index, y: index % 17 })),
        [{ type: 'density2d', x: 'x', y: 'y', as: ['gx', 'gy', 'density'], bins: [128, 128] }],
      ),
    /density2d would require .* deterministic limit is 10000000/,
  );

  assert.throws(
    () =>
      executeTransforms(
        Array.from({ length: 20_000 }, (_, value) => ({ value })),
        [{ type: 'density1d', field: 'value', as: ['x', 'density'], points: 512 }],
      ),
    /density1d would require .* deterministic limit is 10000000/,
  );

  assert.throws(
    () =>
      executeTransforms(
        Array.from({ length: 5_000 }, (_, value) => ({ value })),
        [
          {
            type: 'window',
            fields: [{ op: 'cumulativeSum', field: 'value', as: 'cumulative' }],
          },
        ],
      ),
    /window transform would require .* deterministic limit is 10000000/,
  );

  assert.throws(
    () =>
      executeTransforms(
        [{ x: 1 }],
        [{ type: 'density1d', field: 'x', as: ['x', 'd'], points: 513 }],
      ),
    /points must not exceed 512/,
  );
});
