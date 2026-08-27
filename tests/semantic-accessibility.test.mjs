import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compile,
  fullCatalog,
  fullVariantCatalog,
  toAccessibleRows,
} from '../.tmp/src/complete.js';
import { spatialChartFamilies } from '../.tmp/src/spatial.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';
import { seriesSampleSpec } from '../scripts/series-samples.mjs';

test('the 44-family catalog boundary keeps semantic coverage for every Canvas family', () => {
  assert.equal(fullCatalog.length + spatialChartFamilies.length, 44);
  for (const family of fullCatalog) {
    const variant = fullVariantCatalog.find(({ familyId }) => familyId === family.id);
    assert.notEqual(variant, undefined, `${family.id} representative variant`);
    const { scene } = compile(
      {
        ...seriesSampleSpec(variant),
        accessibility: { table: true, navigation: true, maxRows: 80 },
      },
      { width: 640, height: 400 },
    );
    assert.ok(scene.semanticIndex.length > 0, `${family.id} has semantic marks`);
    assert.ok(scene.semanticIndex.length <= 80, `${family.id} obeys the semantic bound`);
    for (const mark of scene.semanticIndex) {
      assert.equal(mark.viewId, 'plot');
      assert.equal(typeof mark.layerId, 'string');
      assert.equal(typeof mark.role, 'string');
      assert.equal(typeof mark.label, 'string');
      assert.ok(mark.label.length > 0);
      assert.ok(Number.isFinite(mark.bounds.x));
      assert.ok(Number.isFinite(mark.bounds.y));
      assert.ok(Number.isFinite(mark.bounds.width));
      assert.ok(Number.isFinite(mark.bounds.height));
      assert.ok(mark.bounds.width >= 0);
      assert.ok(mark.bounds.height >= 0);
      assert.ok(Array.isArray(mark.lineage.sourceRowIndices));
    }
  }
});

test('line and area semantic indices retain every source observation without point marks', () => {
  for (const mark of ['line', 'area']) {
    const data = [
      { category: '첫째', value: 2 },
      { category: '둘째', value: 5 },
      { category: 'ثالث', value: 3 },
    ];
    const { scene } = compile(
      {
        data,
        mark,
        x: 'category',
        y: 'value',
        accessibility: { maxRows: 10 },
      },
      { width: 360, height: 240 },
    );
    const observations = scene.semanticIndex.filter(({ role }) => role === mark);
    assert.deepEqual(
      observations.map(({ rowIndex }) => rowIndex),
      [0, 1, 2],
      `${mark} retains path observations`,
    );
    assert.match(observations[0].label, /첫째/);
    assert.match(observations[2].label, /ثالث/);
  }
});

test('semantic rows expose transform provenance and remain independently bounded', () => {
  const { scene } = compile(
    {
      data: [
        { group: 'A', value: 2 },
        { group: 'A', value: 3 },
        { group: 'B', value: 5 },
      ],
      transform: [
        {
          type: 'aggregate',
          groupby: ['group'],
          fields: [{ op: 'sum', field: 'value', as: 'total' }],
        },
      ],
      mark: 'bar',
      x: 'group',
      y: 'total',
      accessibility: { maxRows: 2 },
    },
    { width: 360, height: 240 },
  );
  assert.equal(scene.semanticIndex.length, 2);
  assert.deepEqual(scene.semanticIndex[0].lineage.sourceRowIndices, [0, 1]);
  assert.deepEqual(scene.semanticIndex[1].lineage.sourceRowIndices, [2]);
  const rows = toAccessibleRows(scene.semanticIndex, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].values.total, 5);
});

test('derived semantic rows use their own bounded tooltip provenance', () => {
  const { scene } = compile(
    {
      data: [{ value: 0 }, { value: 0.2 }, { value: 9.8 }, { value: 10 }],
      mark: { type: 'histogram', options: { bins: 2 } },
      x: 'value',
      y: 'value',
      accessibility: { maxRows: 20 },
    },
    { width: 360, height: 240 },
  );
  const bins = scene.semanticIndex.filter(({ role }) => role === 'histogram-aggregate');
  assert.equal(bins.length, 2);
  assert.deepEqual(
    bins.map(({ lineage }) => lineage.sourceRowIndices),
    [
      [0, 1],
      [2, 3],
    ],
  );
  assert.ok(bins.every(({ lineage }) => lineage.truncated === false));
});

test('semantic labels and table-ready rows never expose raw temporal epoch values', () => {
  const epoch = Date.UTC(2026, 0, 2, 3, 4, 5);
  const { scene } = compile(
    {
      data: [{ observedAt: epoch, value: 7 }],
      mark: 'point',
      x: { field: 'observedAt', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
      locale: 'en-US',
      accessibility: { table: true, maxRows: 10 },
    },
    { width: 360, height: 240 },
  );
  const mark = scene.semanticIndex[0];
  assert.ok(mark);
  assert.equal(mark.label.replaceAll(',', '').includes(String(epoch)), false);
  assert.match(mark.label, /2026/);

  const rows = toAccessibleRows(scene.semanticIndex);
  assert.equal(rows[0].values.observedAt, epoch);
  assert.equal(
    rows[0].displayValues.observedAt,
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(epoch)),
  );
});

test('semantic labels and accessible rows honor authored temporal axis presentation', () => {
  const epoch = Date.UTC(2026, 7, 28, 1, 15, 0);
  const expected = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(epoch));
  const { scene } = compile(
    {
      data: [{ observedAt: epoch, value: 7 }],
      mark: 'point',
      x: {
        field: 'observedAt',
        type: 'temporal',
        axis: {
          format: {
            type: 'datetime',
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'Asia/Seoul',
            prefix: '[',
            suffix: ']',
          },
        },
      },
      y: { field: 'value', type: 'quantitative' },
      locale: 'ko-KR',
      accessibility: { table: true, maxRows: 10 },
    },
    { width: 360, height: 240 },
  );
  const mark = scene.semanticIndex[0];
  assert.equal(mark.channels.x.displayValue, `[${expected}]`);
  assert.ok(mark.label.includes(`[${expected}]`));
  assert.equal(toAccessibleRows(scene.semanticIndex)[0].displayValues.observedAt, `[${expected}]`);
});

test('derived timeline semantic rows expose readable instants instead of epoch milliseconds', () => {
  const { scene } = compile(
    {
      data: [{ id: 'a', task: 'Research', start: '2026-01-01', end: '2026-01-05' }],
      mark: {
        type: 'timeline',
        fields: { id: 'id', start: 'start', end: 'end', group: 'task' },
        options: { navigator: true },
      },
      x: { field: 'start', type: 'temporal' },
      y: { field: 'task', type: 'ordinal' },
      accessibility: { table: true, maxRows: 20 },
    },
    { width: 480, height: 320 },
  );
  const derived = scene.semanticIndex.find(({ role }) => role === 'timeline-aggregate');
  assert.ok(derived);
  const rows = toAccessibleRows([derived]);
  assert.ok(rows[0].values.start instanceof Date);
  assert.ok(rows[0].values.end instanceof Date);
  assert.match(rows[0].displayValues.start, /2026/);
  assert.doesNotMatch(rows[0].displayValues.start, /^-?\d{11,17}$/);
  assert.match(rows[0].displayValues.end, /^2026-01-05T/);
});

test('Table semantic rows preserve authored formatting and expose merge anchors once', () => {
  const data = [
    { region: '서울', team: '분석팀', updated: '2026-08-27T15:30:00Z' },
    { region: '서울', team: 'فريق البيانات', updated: '2026-08-28T01:15:00Z' },
    { region: '부산', team: '검토 완료', updated: '2026-08-28T04:45:00Z' },
  ];
  const { scene } = compile(
    {
      data,
      mark: {
        type: 'table',
        options: {
          columns: [
            { field: 'region', header: '지역' },
            { field: 'team', header: 'الفريق' },
            {
              field: 'updated',
              header: '수정 시각',
              formatter: 'datetime',
              dateStyle: 'long',
              timeStyle: 'short',
              timeZone: 'Asia/Seoul',
            },
          ],
          mergeRepeats: [{ field: 'region' }],
          merges: [{ row: 2, column: 'team', columnSpan: 2 }],
        },
      },
      x: 'region',
      y: 'team',
      locale: 'ko-KR',
      accessibility: { table: 'visible', maxRows: 20 },
    },
    { width: 720, height: 400 },
  );

  assert.equal(scene.semanticIndex.length, 3, 'one semantic mark represents one logical row');
  assert.ok(scene.semanticIndex.every(({ role }) => role === 'table'));
  const [first, second, third] = scene.semanticIndex;
  const regionAnchor = first.tableRow.cells.find(({ field }) => field === 'region');
  assert.equal(regionAnchor.rowSpan, 2);
  assert.equal(regionAnchor.columnSpan, 1);
  assert.equal(
    second.tableRow.cells.some(({ field }) => field === 'region'),
    false,
    'the covered repeated cell is not emitted twice',
  );
  const teamAnchor = third.tableRow.cells.find(({ field }) => field === 'team');
  assert.equal(teamAnchor.rowSpan, 1);
  assert.equal(teamAnchor.columnSpan, 2);
  assert.equal(
    third.tableRow.cells.some(({ field }) => field === 'updated'),
    false,
    'the covered horizontal cell is not emitted twice',
  );

  const expected = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(data[0].updated));
  assert.equal(first.tableRow.formattedValues.updated, expected);
  assert.equal(toAccessibleRows([first])[0].displayValues.updated, expected);
  assert.match(first.label, /서울/u);
  assert.match(second.label, /فريق البيانات/u);
  assert.doesNotThrow(() => JSON.stringify(first.tableRow));
});

test('accessibility schema validates table, navigation, row, and live throttling limits', () => {
  const base = { data: [{ x: 'A', y: 1 }], mark: 'bar', x: 'x', y: 'y' };
  assert.deepEqual(
    validateSpec({
      ...base,
      accessibility: {
        table: 'visible',
        maxRows: 200,
        navigation: true,
        summary: '값 표',
        live: { enabled: true, throttleMs: 250 },
      },
    }),
    [],
  );
  assert.ok(
    validateSpec({ ...base, accessibility: { maxRows: 5_001 } }).some(
      ({ path }) => path === '$.accessibility.maxRows',
    ),
  );
  assert.ok(
    validateSpec({ ...base, accessibility: { live: { throttleMs: -1 } } }).some(
      ({ path }) => path === '$.accessibility.live.throttleMs',
    ),
  );
});

test('an authored accessibility summary participates in the Scene description without a table', () => {
  const { scene } = compile(
    {
      data: [{ category: 'A', value: 1 }],
      mark: 'bar',
      x: 'category',
      y: 'value',
      accessibility: { summary: 'One reviewed observation.' },
    },
    { width: 240, height: 160 },
  );
  assert.match(scene.accessibility.description, /One reviewed observation\./);
});
