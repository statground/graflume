import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createIncrementalDataStore,
  createTransformWorkerAdapter,
  installTransformWorker,
  replayIncrementalData,
  transformWorkerProtocolVersion,
} from '../.tmp/src/index.js';
import { Chart } from '../.tmp/src/runtime/chart.js';
import { createDefaultRegistry } from '../.tmp/src/runtime/default-registry.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

test('stable-key upsert and replaceLast preserve deterministic row order and provenance', () => {
  const store = createIncrementalDataStore(
    [
      { id: 1, value: 10, label: 'first' },
      { id: '1', value: 11, label: 'text key' },
      { id: 2, value: 20, label: 'last' },
    ],
    { key: 'id', retention: { maxRows: 10 } },
  );
  const upsert = store.apply({
    mode: 'upsert',
    rows: [
      { id: '1', value: 12 },
      { id: 3, value: 30 },
    ],
  });
  assert.deepEqual(
    upsert.rows.map(({ id, value, label }) => [id, value, label]),
    [
      [1, 10, 'first'],
      ['1', 12, 'text key'],
      [2, 20, 'last'],
      [3, 30, undefined],
    ],
  );
  const replaced = store.apply({
    mode: 'replaceLast',
    rows: [
      { id: 3, value: 31 },
      { id: 4, value: 40 },
    ],
  });
  assert.deepEqual(
    replaced.rows.map(({ id, value }) => [id, value]),
    [
      [1, 10],
      ['1', 12],
      [2, 20],
      [3, 31],
      [4, 40],
    ],
  );
  assert.equal(replaced.step.insertedRows, 1);
  assert.equal(replaced.step.updatedRows, 1);
  assert.throws(
    () => store.apply({ mode: 'replaceLast', rows: [{ id: 2, value: 21 }] }),
    /exists before the final row/,
  );
  assert.throws(
    () => store.apply({ mode: 'append', rows: [{ id: 4, value: 41 }] }),
    /duplicate stable key/,
  );
  assert.doesNotThrow(() => JSON.stringify(store.state()));
});

test('watermarks, late-data policy, and count/time retention are monotonic and bounded', () => {
  const store = createIncrementalDataStore([{ id: 'a', t: 100, value: 1 }], {
    key: 'id',
    retention: { maxRows: 3, time: { field: 't', durationMs: 30 } },
    eventTime: { field: 't', allowedLatenessMs: 10, lateData: 'drop' },
  });
  store.apply({
    rows: [
      { id: 'b', t: 110, value: 2 },
      { id: 'c', t: 130, value: 3 },
    ],
  });
  const result = store.apply({
    rows: [
      { id: 'late', t: 80, value: -1 },
      { id: 'd', t: 160, value: 4 },
    ],
  });
  assert.equal(result.state.watermark, 150);
  assert.deepEqual(
    result.rows.map(({ id }) => id),
    ['c', 'd'],
  );
  assert.equal(result.step.droppedLateRows, 1);
  assert.equal(result.step.evictedRows, 2);
  assert.throws(() => store.apply({ rows: [], watermark: 149 }), /monotonic/);

  const rejecting = createIncrementalDataStore([{ id: 1, t: 100 }], {
    key: 'id',
    eventTime: { field: 't', lateData: 'reject' },
  });
  rejecting.apply({ rows: [{ id: 2, t: 120 }] });
  assert.throws(() => rejecting.apply({ rows: [{ id: 3, t: 110 }] }), /Late event/);
  assert.deepEqual(
    rejecting.rows().map(({ id }) => id),
    [1, 2],
  );
});

test('bounded queue rejects overflow without mutation and exact replay is reproducible', async () => {
  const store = createIncrementalDataStore([{ id: 1, value: 1 }], {
    key: 'id',
    queue: { maxBatches: 1, maxRows: 2, overflow: 'reject' },
    replay: { maxBatches: 4, maxRows: 4 },
  });
  const first = store.enqueue({ mode: 'upsert', rows: [{ id: 1, value: 2 }] });
  await assert.rejects(
    store.enqueue({ mode: 'append', rows: [{ id: 2, value: 2 }] }),
    /backpressure limit/,
  );
  await first;
  store.apply({ mode: 'append', rows: [{ id: 2, value: 2 }] });
  const replay = store.exportReplay();
  const restored = replayIncrementalData(replay);
  assert.deepEqual(restored.rows(), store.rows());
  assert.deepEqual(
    restored.state().provenance.map(({ mode, outputRows }) => [mode, outputRows]),
    store.state().provenance.map(({ mode, outputRows }) => [mode, outputRows]),
  );

  const truncated = createIncrementalDataStore([], {
    key: 'id',
    replay: { maxBatches: 1, maxRows: 1 },
  });
  truncated.apply({ rows: [{ id: 1 }] });
  truncated.apply({ rows: [{ id: 2 }] });
  assert.equal(truncated.state().replayTruncated, true);
  assert.throws(() => truncated.exportReplay(), /fresh snapshot/);

  const mutableOptions = { key: 'id' };
  const protectedOptions = createIncrementalDataStore([{ id: 1 }], mutableOptions);
  mutableOptions.key = 'changed-after-construction';
  protectedOptions.apply({ rows: [{ id: 2 }] });
  assert.equal(protectedOptions.exportReplay().options.key, 'id');

  const queuedUpdate = { rows: [{ id: 3, value: 3 }] };
  const queued = protectedOptions.enqueue(queuedUpdate);
  queuedUpdate.rows[0].value = 300;
  await queued;
  assert.equal(protectedOptions.rows().at(-1).value, 3);
});

test('direct incremental and replay APIs reject open or incomplete envelopes', async () => {
  assert.throws(
    () => createIncrementalDataStore([], { key: 'id', unexpected: true }),
    /Unknown .*unexpected/,
  );
  assert.throws(() => createIncrementalDataStore([], {}), /streaming\.key/);
  assert.throws(
    () => createIncrementalDataStore([], { key: 'id', retention: { time: { field: 't' } } }),
    /durationMs is required/,
  );

  const store = createIncrementalDataStore([], { key: 'id' });
  assert.throws(() => store.apply({ rows: [], unexpected: true }), /Unknown .*unexpected/);
  await assert.rejects(store.enqueue({ rows: 'not-an-array' }), /rows must be an array/);
  assert.throws(
    () =>
      replayIncrementalData({
        version: 1,
        options: { key: 'id' },
        initial: [],
        updates: [],
        unexpected: true,
      }),
    /Unknown .*unexpected/,
  );
});

class LinkedPort extends EventTarget {
  peer = null;
  posts = [];

  postMessage(message, transfer = []) {
    this.posts.push({ message, transfer });
    queueMicrotask(() => {
      const event = new Event('message');
      Object.defineProperty(event, 'data', { value: message });
      this.peer?.dispatchEvent(event);
    });
  }
}

function linkedPorts() {
  const client = new LinkedPort();
  const worker = new LinkedPort();
  client.peer = worker;
  worker.peer = client;
  return { client, worker };
}

test('portable worker adapter runs closed transforms FIFO with transferable typed columns', async () => {
  const { client, worker } = linkedPorts();
  const uninstall = installTransformWorker(worker, { maxInputRows: 10, maxTransforms: 4 });
  const adapter = createTransformWorkerAdapter(client, {
    maxQueueBatches: 2,
    maxQueueRows: 10,
    maxInputRows: 10,
    maxTransforms: 4,
  });
  const values = new Float64Array([1, 2, 3]);
  const first = adapter.execute(
    { columns: { value: values } },
    [
      {
        type: 'calculate',
        as: 'double',
        expr: {
          op: 'multiply',
          left: { op: 'field', field: 'value' },
          right: { op: 'literal', value: 2 },
        },
      },
    ],
    { transferOwnership: true },
  );
  const queuedData = [{ value: 4 }];
  const queuedTransforms = [
    {
      type: 'calculate',
      as: 'double',
      expr: {
        op: 'multiply',
        left: { op: 'field', field: 'value' },
        right: { op: 'literal', value: 2 },
      },
    },
  ];
  const second = adapter.execute(queuedData, queuedTransforms);
  queuedData[0].value = 400;
  queuedTransforms[0].expr.right.value = 100;
  await assert.rejects(adapter.execute([{ value: 5 }], []), /backpressure limit/);
  const [result, secondResult] = await Promise.all([first, second]);
  assert.equal(transformWorkerProtocolVersion, 1);
  assert.deepEqual(
    result.data.map(({ double }) => double),
    [2, 4, 6],
  );
  assert.deepEqual(secondResult.data, [{ value: 4, double: 8 }]);
  assert.deepEqual(
    client.posts.map(({ message }) => message.id),
    [1, 2],
  );
  assert.equal(client.posts[0].transfer.length, 1);
  assert.equal(values.byteLength, 0);
  assert.equal(adapter.state().completed, 2);
  assert.equal(adapter.state().queuedBatches, 0);
  await assert.rejects(
    adapter.execute([{ value: 1 }], [{ type: 'not-a-transform' }]),
    /unsupported|not supported/i,
  );
  await assert.rejects(
    adapter.execute([{ value: 1 }], [], { transferOwnership: 'yes' }),
    /transferOwnership must be boolean/,
  );
  assert.equal(adapter.state().rejected, 3);
  assert.doesNotThrow(() => JSON.stringify(adapter.state()));
  adapter.close();
  uninstall();
});

test('worker adapter options reject unknown fields instead of silently downgrading', () => {
  const { client } = linkedPorts();
  assert.throws(
    () => createTransformWorkerAdapter(client, { maxInputRows: 10, unexpected: true }),
    /Unknown .*unexpected/,
  );
});

test('Chart streaming methods retain the legacy append default and expose replayable state', () => {
  const registry = createDefaultRegistry();
  registry.registerRenderer({
    name: 'canvas',
    capabilities: { vector: false, gpu: false, worker: false, exportFormats: [] },
    create: () => ({
      name: 'canvas',
      capabilities: { vector: false, gpu: false, worker: false, exportFormats: [] },
      mount() {},
      resize() {},
      render() {},
      surface() {
        return null;
      },
      destroy() {},
    }),
  });
  const target = { clientWidth: 300, clientHeight: 200 };
  const chart = new Chart(
    target,
    {
      data: [
        { id: 1, x: 1, y: 1 },
        { id: 2, x: 2, y: 2 },
      ],
      mark: 'line',
      x: 'x',
      y: 'y',
      streaming: { key: 'id', mode: 'upsert', retention: { maxRows: 2 } },
    },
    registry,
    { width: 300, height: 200 },
  );
  chart.upsertData([
    { id: 2, y: 20 },
    { id: 3, x: 3, y: 3 },
  ]);
  chart.replaceLastData([{ id: 3, y: 30 }]);
  assert.deepEqual(
    chart.getSpec().data.map(({ id, x, y }) => [id, x, y]),
    [
      [2, 2, 20],
      [3, 3, 30],
    ],
  );
  assert.equal(chart.getStreamingState().sequence, 2);
  const replay = chart.exportStreamingReplay();
  chart.replayData(replay);
  assert.deepEqual(chart.getSpec().data, replayIncrementalData(replay).rows());
  chart.setSpec({
    ...chart.getSpec(),
    streaming: { key: 'id', mode: 'upsert', retention: { maxRows: 3 } },
  });
  assert.throws(() => chart.replayData(replay), /Replay options do not match/);
  chart.destroy();

  const legacy = new Chart(
    target,
    { data: [{ x: 1, y: 1 }], mark: 'line', x: 'x', y: 'y' },
    registry,
    { width: 300, height: 200 },
  );
  legacy.appendData([{ x: 1, y: 2 }]);
  assert.equal(legacy.getSpec().data.length, 2);
  assert.throws(() => legacy.upsertData([{ id: 1 }]), /streaming contract/);
  legacy.destroy();
});

test('streaming runtime validation and JSON Schema expose the same closed contract', async () => {
  const base = {
    data: [{ id: 1, t: 0, x: 0, y: 1 }],
    mark: 'line',
    x: 'x',
    y: 'y',
  };
  assert.equal(
    validateSpec({
      ...base,
      streaming: {
        key: 'id',
        mode: 'upsert',
        maxBatchRows: 10,
        retention: { maxRows: 100, time: { field: 't', durationMs: 1_000 } },
        eventTime: { field: 't', allowedLatenessMs: 100, lateData: 'drop' },
        queue: { maxBatches: 2, maxRows: 20, overflow: 'reject' },
        replay: { maxBatches: 4, maxRows: 100 },
      },
    }).length,
    0,
  );
  for (const streaming of [
    {},
    { key: 'id', mode: 'merge' },
    { key: 'id', retention: { time: { field: 't', durationMs: 100 } } },
    { key: 'id', eventTime: { field: 't', lateData: 'reorder' } },
    { key: 'id', queue: { overflow: 'drop-oldest' } },
  ]) {
    assert.ok(
      validateSpec({ ...base, streaming }).some(({ path }) => path.startsWith('$.streaming')),
    );
  }
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(schema.$defs.streaming.required, ['key']);
  assert.deepEqual(schema.$defs.streaming.properties.mode.enum, [
    'append',
    'upsert',
    'replaceLast',
  ]);
  assert.equal(schema.$defs.streaming.properties.queue.properties.overflow.const, 'reject');
  assert.equal(schema.$defs.streaming.properties.queue.properties.maxBatches.maximum, 1_024);
  assert.equal(schema.$defs.streaming.properties.replay.properties.maxBatches.maximum, 4_096);
});
