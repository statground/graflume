import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAutomaticWorkerRuntime,
  createIncrementalDataStore,
  createWorkerStreamRetentionRuntime,
  executeTransforms,
  installWorkerRuntime,
  restoreWorkerStreamRetentionRuntime,
} from '../.tmp/src/index.js';

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

function workerRuntime(client, overrides = {}) {
  return createAutomaticWorkerRuntime(
    {
      moduleURL: '/graflume-stream.worker.js',
      maxInputRows: 20,
      maxQueueBatches: 8,
      maxQueueRows: 40,
      ...overrides,
    },
    { create: () => client },
  );
}

test('Worker-owned retention matches main-thread append/upsert/replaceLast and event-time policy', async () => {
  const { client, worker } = linkedPorts();
  const uninstall = installWorkerRuntime(worker, {
    maxInputRows: 20,
    maxStreamingSessions: 4,
    maxStreamingReplayBatches: 16,
    maxStreamingReplayRows: 40,
  });
  const runtime = workerRuntime(client);
  const streaming = {
    key: 'id',
    mode: 'append',
    maxBatchRows: 4,
    retention: { maxRows: 3, time: { field: 't', durationMs: 30 } },
    eventTime: { field: 't', allowedLatenessMs: 10, lateData: 'drop' },
    replay: { maxBatches: 8, maxRows: 20 },
  };
  const initial = [
    { id: 'a', t: 100, value: 1 },
    { id: 'b', t: 110, value: 2 },
  ];
  const main = createIncrementalDataStore(initial, streaming);
  const stream = await createWorkerStreamRetentionRuntime(
    runtime,
    'retention-parity',
    initial,
    streaming,
  );
  const updates = [
    { mode: 'append', rows: [{ id: 'c', t: 120, value: 3 }], watermark: 110 },
    { mode: 'upsert', rows: [{ id: 'b', t: 130, value: 20 }], watermark: 120 },
    { mode: 'replaceLast', rows: [{ id: 'c', t: 140, value: 30 }], watermark: 130 },
    {
      mode: 'append',
      rows: [
        { id: 'late', t: 80, value: -1 },
        { id: 'd', t: 150, value: 4 },
      ],
      watermark: 150,
    },
  ];
  for (const update of updates) {
    const expected = main.apply(update);
    const actual = await stream.enqueue(update);
    assert.deepEqual(
      actual.rows.map((row) => ({ ...row })),
      expected.rows.map((row) => ({ ...row })),
    );
    assert.deepEqual(actual.state, expected.state);
    assert.deepEqual(actual.state.provenance.at(-1), expected.step);
  }
  const retained = stream.latest();
  assert.deepEqual(
    retained.rows.map(({ id, value }) => [id, value]),
    [
      ['b', 20],
      ['c', 30],
      ['d', 4],
    ],
  );
  assert.equal(retained.state.watermark, 150);
  assert.equal(retained.state.droppedLateRows, 1);
  assert.equal(retained.state.rowCount, 3);
  assert.ok(
    client.posts.some(
      ({ message }) =>
        message.type === 'graflume:worker-execute' && message.operation.kind === 'stream-retention',
    ),
    'retention must cross the Worker protocol rather than run in the wrapper',
  );
  assert.doesNotThrow(() => structuredClone(retained));
  assert.doesNotThrow(() => JSON.stringify(retained));

  const replay = await stream.exportReplay();
  assert.equal(replay.updates.length, 4);
  const restored = await restoreWorkerStreamRetentionRuntime(
    runtime,
    'retention-restored',
    replay,
    { includeReplay: true },
  );
  assert.deepEqual(restored.latest().rows, retained.rows);
  assert.deepEqual(restored.latest().state, retained.state);
  assert.equal(restored.latest().replayStatus, 'available');

  const rejecting = await createWorkerStreamRetentionRuntime(runtime, 'late-reject', [], {
    key: 'id',
    retention: { maxRows: 3 },
    eventTime: { field: 't', lateData: 'reject' },
  });
  await rejecting.enqueue({ rows: [{ id: 'current', t: 100 }], watermark: 100 });
  await assert.rejects(
    rejecting.enqueue({ rows: [{ id: 'late', t: 90 }], watermark: 110 }),
    /Late event/u,
  );
  const afterReject = await rejecting.snapshot();
  assert.equal(afterReject.state.sequence, 1);
  assert.deepEqual(
    afterReject.rows.map(({ id }) => id),
    ['current'],
  );

  await rejecting.close();
  await restored.close();
  await stream.close();
  runtime.close();
  uninstall();
});

test('Worker streaming sessions bound replay, sessions, rows, and closed request shapes', async () => {
  const { client, worker } = linkedPorts();
  const uninstall = installWorkerRuntime(worker, {
    maxInputRows: 4,
    maxStreamingSessions: 1,
    maxStreamingReplayBatches: 2,
    maxStreamingReplayRows: 4,
  });
  const runtime = workerRuntime(client, {
    maxInputRows: 4,
    maxQueueRows: 8,
  });
  const stream = await createWorkerStreamRetentionRuntime(runtime, 'bounded', [], {
    key: 'id',
    retention: { maxRows: 2 },
    replay: { maxBatches: 2, maxRows: 2 },
  });
  await stream.enqueue({ rows: [{ id: 'a' }] });
  await stream.enqueue({ rows: [{ id: 'b' }] });
  await stream.enqueue({ rows: [{ id: 'c' }] });
  const snapshot = await stream.snapshot({ includeReplay: true });
  assert.equal(snapshot.state.rowCount, 2);
  assert.equal(snapshot.state.replayBatches, 2);
  assert.equal(snapshot.state.replayRows, 2);
  assert.equal(snapshot.state.replayTruncated, true);
  assert.equal(snapshot.replayStatus, 'truncated');
  assert.equal(snapshot.replay, undefined);
  await assert.rejects(stream.exportReplay(), /replay is truncated/u);
  assert.doesNotThrow(() => structuredClone(snapshot));

  await assert.rejects(
    createWorkerStreamRetentionRuntime(runtime, 'second', [], {
      key: 'id',
      retention: { maxRows: 2 },
    }),
    /session budget/u,
  );
  await assert.rejects(
    runtime.streamRetention({
      streamId: 'bounded',
      action: { type: 'snapshot', includeReplay: false, unexpected: true },
    }),
    /Unknown .*unexpected/u,
  );
  assert.equal((await stream.snapshot()).state.sequence, 3);
  await stream.close();

  await assert.rejects(
    createWorkerStreamRetentionRuntime(runtime, 'oversized-contract', [], {
      key: 'id',
      retention: { maxRows: 5 },
    }),
    /maxRows exceeds/u,
  );
  await assert.rejects(
    runtime.streamRetention({
      streamId: 'oversized-replay',
      action: {
        type: 'restore',
        replay: {
          version: 1,
          options: { key: 'id', retention: { maxRows: 2 } },
          initial: [],
          updates: [{ rows: [{ id: 'a' }] }, { rows: [{ id: 'b' }] }, { rows: [{ id: 'c' }] }],
        },
      },
    }),
    /bounded batch budget/u,
  );

  runtime.close();
  uninstall();
});

test('Worker stream updates are FIFO and queued cancellation or overflow never mutates retention', async () => {
  const { client, worker } = linkedPorts();
  let releaseSlow = null;
  const uninstall = installWorkerRuntime(worker, {
    maxInputRows: 10,
    maxStreamingSessions: 2,
    wasmAdapters: [
      {
        id: 'gate',
        execute(data, transforms, signal) {
          return new Promise((resolve, reject) => {
            releaseSlow = () => resolve(executeTransforms(data, transforms));
            signal.addEventListener(
              'abort',
              () => reject(new DOMException('cancelled', 'AbortError')),
              { once: true },
            );
          });
        },
      },
    ],
  });
  const runtime = workerRuntime(client, {
    maxInputRows: 10,
    maxQueueBatches: 2,
    maxQueueRows: 10,
    overflow: 'reject',
  });
  const stream = await createWorkerStreamRetentionRuntime(runtime, 'fifo', [], {
    key: 'id',
    retention: { maxRows: 5 },
  });

  const blocker = runtime.execute({
    kind: 'transform',
    data: { kind: 'rows', rows: [{ slow: true }] },
    transforms: [],
    engine: { type: 'wasm', adapter: 'gate' },
  });
  await new Promise((resolve) => setImmediate(resolve));
  const controller = new AbortController();
  const cancelled = stream.enqueue({ rows: [{ id: 'cancelled' }] }, { signal: controller.signal });
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  releaseSlow();
  await blocker;
  assert.deepEqual((await stream.snapshot()).rows, []);

  const [first, second] = await Promise.all([
    stream.enqueue({ rows: [{ id: 'a' }] }),
    stream.enqueue({ rows: [{ id: 'b' }] }),
  ]);
  assert.equal(first.state.sequence, 1);
  assert.equal(second.state.sequence, 2);
  assert.deepEqual(
    second.rows.map(({ id }) => id),
    ['a', 'b'],
  );

  const secondBlocker = runtime.execute({
    kind: 'transform',
    data: { kind: 'rows', rows: [{ slow: true }] },
    transforms: [],
    engine: { type: 'wasm', adapter: 'gate' },
  });
  await new Promise((resolve) => setImmediate(resolve));
  const admitted = stream.enqueue({ rows: [{ id: 'c' }] });
  await assert.rejects(stream.enqueue({ rows: [{ id: 'rejected' }] }), /backpressure limit/u);
  releaseSlow();
  await secondBlocker;
  const afterAdmitted = await admitted;
  assert.deepEqual(
    afterAdmitted.rows.map(({ id }) => id),
    ['a', 'b', 'c'],
  );
  assert.equal(runtime.state().cancelled, 1);
  assert.ok(runtime.state().rejected >= 1);

  await stream.close();
  runtime.close();
  uninstall();
});
