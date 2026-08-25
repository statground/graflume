import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createIncrementalStackPipeline,
  createIncrementalTransformPipeline,
} from '../.tmp/src/data/incremental-transform.js';
import { createIncrementalDataStore } from '../.tmp/src/data/incremental.js';
import { createBoundedRingBuffer } from '../.tmp/src/data/ring-buffer.js';
import { createIncrementalStreamRuntime } from '../.tmp/src/data/stream-runtime.js';
import {
  createAutomaticWorkerRuntime,
  installWorkerRuntime,
  workerRuntimeProtocolVersion,
} from '../.tmp/src/data/worker-runtime.js';
import { createSemanticFocusStore } from '../.tmp/src/interaction/semantic-focus-store.js';
import { createVirtualDataExplorer } from '../.tmp/src/interaction/virtual-data-explorer.js';
import { createSpatialSemanticNavigator } from '../.tmp/src/spatial/semantic-navigation.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';
import { executeTransforms } from '../.tmp/src/data/transforms.js';

function semantic(id, viewId, key, index = 0) {
  return {
    id,
    viewId,
    layerId: `${viewId}-layer`,
    rowIndex: index,
    role: 'point',
    channels: {},
    datum: { key, value: index },
    lineage: { sourceId: viewId, sourceRowIndices: [index], truncated: false },
    bounds: { x: index, y: index * 2, width: 4, height: 4 },
    visible: true,
    label: `${viewId} ${key}`,
  };
}

test('bounded ring buffer retains fixed-capacity logical order across wraparound', () => {
  const ring = createBoundedRingBuffer(3, [1, 2]);
  assert.equal(ring.push(3), undefined);
  assert.equal(ring.push(4), 1);
  assert.deepEqual(ring.values(), [2, 3, 4]);
  ring.set(1, 30);
  assert.deepEqual(ring.values(), [2, 30, 4]);
  assert.equal(ring.shift(), 2);
  ring.pushMany([5, 6]);
  assert.deepEqual(ring.values(), [4, 5, 6]);
  assert.throws(() => createBoundedRingBuffer(0), /capacity/);
});

test('incremental queue drop and coalesce policies are explicit, bounded and observable', async () => {
  const dropping = createIncrementalDataStore([], {
    key: 'id',
    queue: { maxBatches: 1, maxRows: 4, overflow: 'drop-oldest' },
  });
  const dropped = dropping.enqueue({ rows: [{ id: 'old', value: 1 }] });
  const retained = dropping.enqueue({ rows: [{ id: 'new', value: 2 }] });
  await assert.rejects(dropped, /dropped by explicit overflow policy/);
  await retained;
  assert.deepEqual(
    dropping.rows().map(({ id }) => id),
    ['new'],
  );
  assert.equal(dropping.state().queueDroppedBatches, 1);

  const coalescing = createIncrementalDataStore([], {
    key: 'id',
    mode: 'upsert',
    queue: { maxBatches: 1, maxRows: 4, overflow: 'coalesce' },
  });
  const first = coalescing.enqueue({ rows: [{ id: 'same', value: 1 }] });
  const second = coalescing.enqueue({ rows: [{ id: 'same', value: 2 }] });
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.rows[0].value, 2);
  assert.equal(secondResult.rows[0].value, 2);
  assert.equal(coalescing.state().queueCoalescedBatches, 1);
});

test('row-local transforms recompute changed stable keys while global stages fall back exactly', () => {
  const local = createIncrementalTransformPipeline(
    [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ],
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
      {
        type: 'filter',
        expr: {
          op: 'greaterThan',
          left: { op: 'field', field: 'double' },
          right: { op: 'literal', value: 2 },
        },
      },
    ],
    { streaming: { key: 'id', mode: 'upsert', retention: { maxRows: 20 } } },
  );
  const updated = local.apply({ rows: [{ id: 'a', value: 3 }] });
  assert.deepEqual(
    updated.transformed.data.map(({ id, double }) => [id, double]),
    [
      ['a', 6],
      ['b', 4],
    ],
  );
  assert.deepEqual(updated.transformState.last, {
    sequence: 1,
    mode: 'incremental',
    inputRows: 2,
    outputRows: 2,
    recomputedRows: 1,
    reusedRows: 1,
    removedRows: 0,
    reason: 'row-local',
  });

  local.setTransforms([
    {
      type: 'aggregate',
      fields: [{ op: 'sum', field: 'value', as: 'total' }],
    },
  ]);
  const global = local.apply({ rows: [{ id: 'c', value: 4 }] });
  assert.equal(global.transformState.last.mode, 'full');
  assert.equal(global.transformState.last.reason, 'global-transform');
  assert.equal(global.transformed.data[0].total, 9);
});

test('incremental Area stack recomputes only affected groups and exposes exact fallback provenance', () => {
  const source = [
    { id: 'a-one', x: 'A', series: 'one', value: 2 },
    { id: 'a-two', x: 'A', series: 'two', value: 3 },
    { id: 'b-one', x: 'B', series: 'one', value: 4 },
    { id: 'b-two', x: 'B', series: 'two', value: 5 },
  ];
  const transform = {
    type: 'stack',
    field: 'value',
    groupby: ['x'],
    series: ['series'],
    as: ['y0', 'y1'],
    offset: 'zero',
    order: 'input',
  };
  const pipeline = createIncrementalStackPipeline(source, transform, {
    streaming: { key: 'id', mode: 'upsert', retention: { maxRows: 20 } },
    maxRows: 20,
  });
  const local = pipeline.apply({ rows: [{ id: 'a-one', value: 10 }] });
  assert.equal(local.stackState.last.mode, 'incremental');
  assert.equal(local.stackState.last.reason, 'affected-groups');
  assert.equal(local.stackState.last.recomputedRows, 2);
  assert.equal(local.stackState.last.reusedRows, 2);
  assert.equal(local.stackState.last.recomputedGroups.length, 1);
  assert.equal(local.stackState.last.reusedGroups.length, 1);
  assert.deepEqual(
    local.transformed.data,
    executeTransforms(
      source.map((row) => (row.id === 'a-one' ? { ...row, value: 10 } : row)),
      [transform],
    ).data,
  );
  assert.equal(local.transformed.lineage.rowSources.length, 4);
  assert.doesNotThrow(() => structuredClone(local.stackSnapshot));
  assert.throws(
    () =>
      createIncrementalStackPipeline([], transform, {
        streaming: { key: '__proto__', mode: 'upsert', retention: { maxRows: 20 } },
      }),
    /Unsafe key/,
  );

  const newSeries = pipeline.apply({
    mode: 'append',
    rows: [{ id: 'c-three', x: 'C', series: 'three', value: 7 }],
  });
  assert.equal(newSeries.stackState.last.mode, 'full');
  assert.equal(newSeries.stackState.last.reason, 'series-order-change');
  assert.equal(newSeries.stackState.last.recomputedRows, 5);

  const wiggle = createIncrementalStackPipeline(
    source,
    { ...transform, offset: 'wiggle' },
    {
      streaming: { key: 'id', mode: 'upsert', retention: { maxRows: 20 } },
    },
  );
  assert.equal(
    wiggle.apply({ rows: [{ id: 'a-one', value: 8 }] }).stackState.last.reason,
    'global-wiggle',
  );

  const ordered = createIncrementalStackPipeline(
    source,
    { ...transform, order: 'sumDescending' },
    { streaming: { key: 'id', mode: 'upsert', retention: { maxRows: 20 } } },
  );
  assert.equal(
    ordered.apply({ rows: [{ id: 'a-one', value: 8 }] }).stackState.last.reason,
    'global-order',
  );
});

class ManualFrameScheduler {
  callbacks = [];
  cancelled = new Set();
  sequence = 0;

  request(callback) {
    const id = ++this.sequence;
    this.callbacks.push({ id, callback });
    return id;
  }

  cancel(handle) {
    this.cancelled.add(handle);
  }

  flush() {
    const item = this.callbacks.shift();
    if (item !== undefined && !this.cancelled.has(item.id)) item.callback(16.7 * item.id);
  }
}

test('stream runtime coalesces one RAF, supports pause/follow-live, cancellation and lazy history', async () => {
  const scheduler = new ManualFrameScheduler();
  const stream = createIncrementalStreamRuntime(
    [{ id: 'a', value: 1 }],
    [],
    {
      key: 'id',
      mode: 'upsert',
      retention: { maxRows: 20 },
      queue: { maxBatches: 2, maxRows: 20, overflow: 'reject' },
    },
    {
      schedule: 'animation-frame',
      maxBatchesPerFrame: 8,
      overflow: 'coalesce',
      followLive: false,
      history: { maxBatches: 4, pageRows: 1 },
    },
    scheduler,
  );
  const first = stream.enqueue({ rows: [{ id: 'a', value: 2 }] });
  const second = stream.enqueue({ rows: [{ id: 'b', value: 3 }] });
  assert.equal(scheduler.callbacks.length, 1, 'updates share one requested animation frame');
  scheduler.flush();
  await Promise.all([first, second]);
  assert.equal(stream.state().appliedBatches, 2);
  assert.equal(stream.visible(), null, 'follow-live=false holds the presented snapshot');
  stream.setFollowLive(true);
  assert.equal(stream.visible().rows.at(-1).id, 'b');

  stream.pause();
  const paused = stream.enqueue({ rows: [{ id: 'c', value: 4 }] });
  assert.equal(scheduler.callbacks.length, 0);
  stream.resume();
  scheduler.flush();
  await paused;
  const firstPage = stream.historyPage();
  assert.equal(firstPage.entries.length, 1);
  assert.notEqual(firstPage.nextCursor, null);
  assert.equal(stream.historyPage(firstPage.nextCursor).entries.length, 1);

  stream.pause();
  const controller = new AbortController();
  const cancelled = stream.enqueue(
    { rows: [{ id: 'd', value: 5 }] },
    { signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  assert.equal(stream.state().cancelledBatches, 1);
  stream.destroy();
});

test('virtual explorer traverses every semantic row while materializing only a bounded window', () => {
  const rows = Array.from({ length: 1_000 }, (_, index) =>
    semantic(`mark-${index}`, 'plot', index, index),
  );
  const explorer = createVirtualDataExplorer({ windowRows: 20, overscanRows: 4, rowHeight: 30 });
  let window = explorer.setRows(rows);
  assert.equal(window.rows.length, 24);
  assert.equal(window.totalRows, 1_000);
  window = explorer.move('End');
  assert.equal(window.activeIndex, 999);
  assert.equal(window.end, 1_000);
  assert.ok(window.start >= 976);
  assert.equal(explorer.active().id, 'mark-999');
  window = explorer.setScrollOffset(15_000);
  assert.equal(window.viewportStart, 500);
  assert.ok(window.rows.length <= 28);
});

test('linked semantic focus synchronizes stable datum identity across bounded views', () => {
  const store = createSemanticFocusStore({ maxViews: 3, maxRowsPerView: 10 });
  const left = [semantic('left-a', 'left', 'a'), semantic('left-b', 'left', 'b', 1)];
  const right = [semantic('right-b', 'right', 'b'), semantic('right-c', 'right', 'c', 1)];
  store.registerView('left', { group: 'sales', key: 'key' }, left);
  store.registerView('right', { group: 'sales', key: 'key' }, right);
  const changes = [];
  store.subscribe((change) => changes.push(change));
  store.focus('left', left[1]);
  assert.deepEqual(
    store.state().matches.map(({ viewId, semanticId }) => [viewId, semanticId]),
    [
      ['left', 'left-b'],
      ['right', 'right-b'],
    ],
  );
  assert.doesNotThrow(() => JSON.stringify(store.state()));
  store.clear();
  assert.equal(changes.at(-1).reason, 'clear');
});

test('portable spec and JSON Schema expose bounded explorer, linked-focus, stream and Worker contracts', async () => {
  const valid = {
    data: [{ id: 'a', category: 'A', value: 1 }],
    mark: 'bar',
    x: 'category',
    y: 'value',
    accessibility: {
      table: true,
      navigation: true,
      explorer: { windowRows: 20, overscanRows: 4, rowHeight: 28 },
      linkedFocus: { group: 'sales-dashboard', key: 'id' },
    },
    streaming: {
      key: 'id',
      queue: { overflow: 'drop-oldest' },
      runtime: {
        schedule: 'animation-frame',
        maxBatchesPerFrame: 4,
        overflow: 'coalesce',
        paused: false,
        followLive: true,
        history: { maxBatches: 16, pageRows: 100 },
      },
      worker: {
        moduleURL: '/assets/graflume.worker.js',
        maxInputRows: 10_000,
        overflow: 'coalesce',
        engine: { type: 'wasm', adapter: 'analytics-wasm' },
      },
    },
  };
  assert.deepEqual(validateSpec(valid), []);
  assert.ok(
    validateSpec({
      ...valid,
      accessibility: {
        explorer: { windowRows: 0 },
        linkedFocus: { group: 'bad group', key: '__proto__' },
      },
    }).length >= 3,
  );
  assert.ok(
    validateSpec({
      ...valid,
      streaming: {
        key: 'id',
        runtime: { overflow: 'silent-drop' },
        worker: { moduleURL: '', engine: { type: 'wasm' } },
      },
    }).length >= 3,
  );

  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.equal(
    schema.properties.accessibility.properties.explorer.oneOf[1].additionalProperties,
    false,
  );
  assert.deepEqual(schema.$defs.streaming.properties.queue.properties.overflow.enum, [
    'reject',
    'drop-oldest',
    'coalesce',
  ]);
  assert.equal(schema.$defs.streaming.properties.worker.required[0], 'moduleURL');
  assert.equal(
    schema.$defs.streaming.properties.runtime.properties.history.additionalProperties,
    false,
  );
});

test('GPU semantic navigator keeps roving target and projected focus synchronized', () => {
  const targets = Array.from({ length: 12 }, (_, index) => ({
    layerId: 'points',
    layerIndex: 0,
    datumIndex: index,
    nodeId: `point-${index}`,
    position: [index, index * 2, 0],
    datum: { id: index },
  }));
  const focused = [];
  const navigator = createSpatialSemanticNavigator(
    {
      focus: (value) => focused.push(value),
      activate: (value) => focused.push(value),
    },
    { maxRows: 20, pageRows: 5 },
  );
  navigator.setProjector((pick) => ({
    x: pick.position[0] * 10,
    y: pick.position[1] * 10,
    depth: 0.5,
    visible: true,
  }));
  navigator.setTargets(targets);
  navigator.move('PageDown');
  assert.equal(navigator.state().activeNodeId, 'point-5');
  assert.equal(navigator.state().projected.x, 50);
  navigator.setProjector((pick) => ({
    x: pick.position[0],
    y: pick.position[1],
    depth: 0,
    visible: true,
  }));
  assert.equal(navigator.reproject().projected.x, 5);
  navigator.activate();
  assert.equal(focused.at(-1).pick.nodeId, 'point-5');
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

test('automatic Worker v2 handles Arrow/WASM adapters, owned rendering and cancellation', async () => {
  const { client, worker } = linkedPorts();
  const rendered = [];
  let releaseSlow;
  const uninstall = installWorkerRuntime(worker, {
    maxInputRows: 20,
    binaryAdapters: [
      {
        id: 'arrow',
        formats: ['arrow-ipc'],
        decode(data) {
          return JSON.parse(new TextDecoder().decode(data.buffer));
        },
      },
    ],
    wasmAdapters: [
      {
        id: 'math-wasm',
        execute(data, transforms, signal) {
          const rows = Array.isArray(data) ? data : [];
          if (rows[0]?.slow !== true) return executeTransforms(data, transforms);
          return new Promise((resolve, reject) => {
            releaseSlow = () => resolve(executeTransforms(data, transforms));
            signal.addEventListener(
              'abort',
              () => reject(new DOMException('cancelled', 'AbortError')),
              {
                once: true,
              },
            );
          });
        },
      },
    ],
    renderers: [
      {
        id: 'canvas2d',
        render(scene, canvas, viewport) {
          rendered.push({ scene, canvas, viewport });
        },
      },
    ],
  });
  const created = [];
  const runtime = createAutomaticWorkerRuntime(
    {
      moduleURL: '/assets/graflume.worker.js',
      name: 'graflume-worker',
      maxInputRows: 20,
      maxQueueBatches: 3,
      overflow: 'coalesce',
    },
    {
      create(url, options) {
        created.push({ url, options });
        return client;
      },
    },
  );
  assert.deepEqual(created, [
    {
      url: '/assets/graflume.worker.js',
      options: { type: 'module', name: 'graflume-worker' },
    },
  ]);
  assert.equal(workerRuntimeProtocolVersion, 2);

  const arrowRows = [{ value: 2 }, { value: 3 }];
  const encoded = new TextEncoder().encode(JSON.stringify(arrowRows));
  const transformed = await runtime.transformBinary(
    {
      kind: 'binary',
      format: 'arrow-ipc',
      adapter: 'arrow',
      buffer: encoded.buffer,
      rowCount: 2,
      schema: { fields: ['value'] },
    },
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
    { type: 'wasm', adapter: 'math-wasm' },
  );
  assert.deepEqual(
    transformed.data.map(({ double }) => double),
    [4, 6],
  );

  const renderResult = await runtime.render({
    renderer: 'canvas2d',
    canvas: { token: 'deterministic-offscreen-canvas' },
    scene: { width: 10, height: 8, background: '#fff', root: {}, accessibility: {} },
    width: 10,
    height: 8,
    pixelRatio: 2,
  });
  assert.deepEqual(renderResult, {
    renderer: 'canvas2d',
    width: 10,
    height: 8,
    pixelRatio: 2,
  });
  assert.equal(rendered.length, 1);

  const controller = new AbortController();
  const cancelled = runtime.transformBinary(
    {
      kind: 'binary',
      format: 'arrow-ipc',
      adapter: 'arrow',
      buffer: new TextEncoder().encode(JSON.stringify([{ slow: true }])).buffer,
      rowCount: 1,
    },
    [],
    { type: 'wasm', adapter: 'math-wasm' },
    { signal: controller.signal },
  );
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  assert.equal(runtime.state().cancelled, 1);
  releaseSlow?.();
  runtime.close({ terminate: true });
  uninstall();
});

test('Worker coalesce overflow supersedes a queued operation without unbounded growth', async () => {
  const { client, worker } = linkedPorts();
  let release;
  const uninstall = installWorkerRuntime(worker, {
    wasmAdapters: [
      {
        id: 'gate',
        execute(data, transforms) {
          return new Promise((resolve) => {
            release = () => resolve(executeTransforms(data, transforms));
          });
        },
      },
    ],
  });
  const runtime = createAutomaticWorkerRuntime(
    {
      moduleURL: '/worker.js',
      maxQueueBatches: 2,
      maxQueueRows: 10,
      overflow: 'coalesce',
    },
    { create: () => client },
  );
  const active = runtime.execute({
    kind: 'transform',
    data: { kind: 'rows', rows: [{ value: 1 }] },
    transforms: [],
    engine: { type: 'wasm', adapter: 'gate' },
  });
  // Use row data for queued requests; they do not require a binary adapter.
  const earlier = runtime.execute(
    { kind: 'transform', data: { kind: 'rows', rows: [{ value: 2 }] }, transforms: [] },
    { coalesceKey: 'viewport' },
  );
  const latest = runtime.execute(
    { kind: 'transform', data: { kind: 'rows', rows: [{ value: 3 }] }, transforms: [] },
    { coalesceKey: 'viewport' },
  );
  assert.equal(runtime.state().queuedBatches, 1);
  assert.equal(runtime.state().coalesced, 1);
  await new Promise((resolve) => setImmediate(resolve));
  release();
  await active;
  const [firstResult, latestResult] = await Promise.all([earlier, latest]);
  assert.equal(firstResult.result.data[0].value, 3);
  assert.equal(latestResult.result.data[0].value, 3);
  runtime.close();
  uninstall();
});

test('Worker v2 runs portable affected-group stacks and bounded bar virtualization transitions', async () => {
  const { client, worker } = linkedPorts();
  const uninstall = installWorkerRuntime(worker, { maxInputRows: 100 });
  const runtime = createAutomaticWorkerRuntime(
    { moduleURL: '/portable-analytics-worker.js', maxInputRows: 100 },
    { create: () => client },
  );
  const stack = {
    type: 'stack',
    field: 'value',
    groupby: ['x'],
    series: ['series'],
    as: ['y0', 'y1'],
    offset: 'zero',
    order: 'input',
  };
  const initialRows = [
    { id: 'a-one', x: 'A', series: 'one', value: 2 },
    { id: 'a-two', x: 'A', series: 'two', value: 3 },
    { id: 'b-one', x: 'B', series: 'one', value: 4 },
    { id: 'b-two', x: 'B', series: 'two', value: 5 },
  ];
  const firstStack = await runtime.incrementalStack({
    key: 'id',
    maxRows: 20,
    input: initialRows,
    transform: stack,
  });
  const nextStack = await runtime.incrementalStack({
    key: 'id',
    maxRows: 20,
    input: initialRows.map((row) => (row.id === 'a-one' ? { ...row, value: 9 } : row)),
    transform: stack,
    previous: firstStack.snapshot,
  });
  assert.equal(nextStack.state.last.mode, 'incremental');
  assert.equal(nextStack.state.last.recomputedRows, 2);
  assert.equal(nextStack.state.last.reusedRows, 2);

  const firstBars = await runtime.barVirtualization({
    options: {
      key: 'id',
      category: 'category',
      value: 'value',
      maxRows: 12,
      windowRows: 3,
      overscanRows: 1,
    },
    action: {
      type: 'replace',
      rows: Array.from({ length: 8 }, (_, index) => ({
        id: `row-${index}`,
        category: `Category ${index}`,
        value: 8 - index,
      })),
    },
  });
  const nextBars = await runtime.barVirtualization({
    previous: firstBars.snapshot,
    action: { type: 'navigate', command: 'PageDown' },
  });
  assert.ok(nextBars.window.rows.length <= 5);
  assert.equal(nextBars.state.last.recomputedRanks, 0);
  assert.ok(nextBars.state.last.reusedWindowRows > 0);
  assert.doesNotThrow(() => structuredClone(nextBars.snapshot));
  runtime.close();
  uninstall();
});
