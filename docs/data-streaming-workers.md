# Incremental data, live streams, and portable Workers

Graflume's incremental foundation is opt-in, deterministic, function-free, and
bounded. The synchronous APIs remain available, while the frame runtime and
automatic Worker v2 API add explicit scheduling, cancellation, binary-adapter,
and worker-owned rendering boundaries. Legacy `appendData()` behavior is
unchanged unless a chart declares `streaming`.

## Stable-key storage and updates

Every incremental row must provide the explicit `streaming.key`. Keys are
typed: the number `1` and string `"1"` are different identities. Supported keys
are non-empty strings, finite numbers, booleans, and valid `Date` values.
Duplicate keys in a batch or initial snapshot are errors.

```ts
import { create } from 'graflume';

const chart = create('#live', {
  data: [{ id: 'a', time: 1_000, value: 10 }],
  mark: 'line',
  x: 'time',
  y: 'value',
  streaming: {
    key: 'id',
    mode: 'upsert',
    maxBatchRows: 5_000,
    retention: {
      maxRows: 50_000,
      time: { field: 'time', durationMs: 60_000 },
    },
    eventTime: {
      field: 'time',
      allowedLatenessMs: 2_000,
      lateData: 'drop',
    },
    queue: { maxBatches: 8, maxRows: 20_000, overflow: 'coalesce' },
    replay: { maxBatches: 128, maxRows: 50_000 },
    runtime: {
      schedule: 'animation-frame',
      maxBatchesPerFrame: 4,
      overflow: 'coalesce',
      followLive: true,
      history: { maxBatches: 256, pageRows: 1_000 },
    },
  },
});

await chart.enqueueData({
  mode: 'upsert',
  rows: [{ id: 'a', time: 1_500, value: 11 }],
});
const streamState = chart.getStreamRuntimeState();
const history = chart.getStreamingHistoryPage();
```

`append` rejects an identity already in retained rows. `upsert` merges a partial
row into its existing position or appends a new identity. `replaceLast` may
merge only the current final identity; a new identity is appended, while an
identity found earlier is an explicit error. `appendData()` always means append
even when the configured default mode is `upsert`.

Retained rows use fixed-capacity ring storage rather than repeated front-array
copies. Count retention keeps the newest rows. Time retention requires
`eventTime` and keeps rows whose retention-field timestamp is at least
`watermark - durationMs`. Watermarks are finite and monotonic. Incoming rows
behind the pre-update or explicit watermark follow the authored `reject`,
`drop`, or `accept` late-data policy.

Both the store queue and live runtime support three explicit overflow modes:

- `reject` leaves queued work untouched and rejects the new caller.
- `drop-oldest` rejects affected callers before admitting newer work.
- `coalesce` replaces compatible queued stable-key work and resolves all
  coalesced callers with the final result.

No mode silently loses work. Drop/coalesce counters are observable in runtime
state. Replay snapshots are structured-clone portable and preserve `Date`
values. If bounded replay truncates, `exportReplay()` fails and requires a new
snapshot rather than presenting an incomplete log.

## Incremental transform recomputation

`createIncrementalTransformPipeline()` combines the same stable-key store with
a closed `TransformSpec` list. Function-free `filter` and `calculate` pipelines
cache output by typed stable key and recompute only added or changed rows.
Order-dependent and aggregate stages use an explicit exact full recomputation,
so an optimization never changes transform meaning. State reports recomputed,
reused, and removed rows plus the reason for every step.

```ts
import { createIncrementalTransformPipeline } from 'graflume';

const pipeline = createIncrementalTransformPipeline(initialRows, transforms, {
  streaming: spec.streaming,
});
const update = pipeline.apply({ mode: 'upsert', rows: nextRows });
console.log(update.transformed.data, update.transformState.last);
```

## Frame-coalesced live runtime

`createIncrementalStreamRuntime()` and `Chart.enqueueData()` schedule bounded
work through one `requestAnimationFrame` by default. `microtask` is available
for non-visual hosts. `maxBatchesPerFrame` bounds drain work. `AbortSignal`
cancels queued consumers; `pause()`/`resume()` stop and restart draining;
`setFollowLive(false)` continues calculation without moving the presented
snapshot. Lazy history returns newest-first pages bounded by both retained
batches and rows per page.

Chart convenience methods are `pauseStreaming()`, `resumeStreaming()`,
`setStreamingFollowLive()`, `getStreamRuntimeState()`, and
`getStreamingHistoryPage()`. `setData()` or an external `setSpec()` starts a new
stream session. Runtime-only `ChartCreateOptions.streamScheduler` is injectable
for deterministic tests and host scheduling; it is not serialized in
`ChartSpec`.

Default limits are 100,000 retained/input rows, 100,000 rows per batch, 16
queued batches, 128 replay batches, 256 lazy-history batches, and 1,000 history
rows per page. The absolute retained/queue row limit is 1,000,000; queues are
capped at 1,024 batches and histories at 4,096 batches.

## Automatic Worker protocol v2

The authored contract contains only data:

```ts
streaming: {
  key: 'id',
  worker: {
    moduleURL: '/assets/graflume.worker.js',
    name: 'graflume-analytics',
    maxQueueBatches: 8,
    maxQueueRows: 100_000,
    maxInputRows: 100_000,
    maxBinaryBytes: 67_108_864,
    maxTransforms: 128,
    overflow: 'coalesce',
    engine: { type: 'wasm', adapter: 'analytics-wasm' },
  },
}
```

Install the handler inside a module Worker and register environment-specific
adapters there. Functions remain outside the portable spec.

```ts
// graflume.worker.ts
import { installWorkerRuntime } from 'graflume';

installWorkerRuntime(self, {
  binaryAdapters: [arrowAdapter],
  wasmAdapters: [
    {
      id: 'analytics-wasm',
      execute(data, transforms, signal) {
        return wasmEngine.execute(data, transforms, signal);
      },
    },
  ],
  renderers: [canvas2dWorkerRenderer],
});

// main.ts
const worker = chart.getWorkerRuntime(); // constructs the declared module Worker lazily
const transformed = await worker.transform(rows, closedTransformSpecs, { signal });

const firstAtr = await worker.technicalIndicator({
  spec: { identifier: 'atr', options: { period: 14 }, maxRows: 4_096 },
  append: { high, low, close },
});
const nextAtr = await worker.technicalIndicator({
  spec: firstAtr.snapshot.spec,
  previous: firstAtr.snapshot,
  append: nextOhlc,
});

const firstStack = await worker.incrementalStack({
  key: 'id',
  maxRows: 50_000,
  input: rows,
  transform: {
    type: 'stack',
    field: 'value',
    groupby: ['time'],
    series: ['series'],
    as: ['y0', 'y1'],
    offset: 'zero',
    order: 'input',
  },
});
const nextStack = await worker.incrementalStack({
  key: firstStack.snapshot.key,
  maxRows: firstStack.snapshot.maxRows,
  input: updatedRows,
  transform: firstStack.snapshot.transform,
  previous: firstStack.snapshot,
});

const firstBars = await worker.barVirtualization({
  options: {
    key: 'id',
    category: 'team',
    value: 'sales',
    maxRows: 50_000,
    windowRows: 100,
    overscanRows: 20,
  },
  action: { type: 'replace', rows },
});
const nextBars = await worker.barVirtualization({
  previous: firstBars.snapshot,
  action: { type: 'navigate', command: 'PageDown' },
});
```

`createAutomaticWorkerRuntime()` is the standalone equivalent and accepts an
injectable `WorkerRuntimeFactory`. Protocol v2 operations are one of:

- row or typed-column transforms;
- Arrow-compatible or Graflume-columnar binary envelopes decoded by a named
  `WorkerBinaryAdapter`;
- JavaScript transforms or a named `WorkerWasmTransformAdapter`;
- structured-cloneable, bounded technical-indicator append requests that return
  the next explicit snapshot and use the same calculation/session contracts as
  synchronous `calculateTechnicalIndicatorIncremental()`. Version-1 snapshots
  now include cached outputs plus bounded rolling/cumulative checkpoints, so an
  append evaluates only its suffix. `diagnostics.evaluatedRows` and
  `recomputedPrefixRows` make that behavior observable; older snapshots without
  runtime checkpoints are replayed once and upgraded;
- structured-cloneable incremental stack transitions. Zero, normalized, center,
  and silhouette offsets recompute only changed `groupby` buckets when the
  global series order is stable. Global sum/value ordering, `insideOut`, and
  `wiggle` explicitly run the exact full transform;
- bounded bar rank/virtual-window transitions. The retained raw rows and
  materialized window have separate hard limits, and every update reports
  accepted, updated, evicted, reused, reranked, and rank-change counts;
- worker-owned rendering of a portable Scene into transferred
  `OffscreenCanvas` through a named `WorkerOwnedRenderer`.

Graflume intentionally does not bundle an Arrow parser, WASM module, or renderer
implementation. The adapter id makes that dependency explicit and testable.
Binary byte counts, decoded rows, transform counts, retained indicator rows,
incremental stack snapshots, virtual bar snapshots, queue batches, and queued
rows are bounded before work proceeds. Indicator requests reject rather than
silently dropping formula history. Stack state records the exact affected and
reused groups plus the reason for any full fallback. Virtual-bar state records
the bounded materialized range and rank movement. `AbortSignal` sends a protocol
cancel message; the Worker owns one `AbortController` per operation. Request ids
prevent stale or foreign responses from resolving current callers. Caller-owned
typed or binary buffers transfer only with `transferOwnership: true`; render
canvases are always worker-owned.

The older `installTransformWorker()` / `createTransformWorkerAdapter()` v1 API
remains compatible for hosts that already construct a Worker-like port. New
code should use protocol v2 when it needs automatic construction, cancellation,
binary/WASM adapters, drop/coalesce overflow, or worker-owned rendering.
