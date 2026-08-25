# Incremental data and portable transform workers

Graflume's first incremental foundation is opt-in, deterministic, and bounded.
It does not change the legacy `appendData()` path unless a chart declares a
`streaming` contract.

## Stable-key updates

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
    queue: { maxBatches: 8, maxRows: 20_000, overflow: 'reject' },
    replay: { maxBatches: 128, maxRows: 50_000 },
  },
});

chart.upsertData([{ id: 'a', time: 1_500, value: 11 }]);
chart.replaceLastData([{ id: 'a', time: 2_000, value: 12 }]);
const state = chart.getStreamingState();
const replay = chart.exportStreamingReplay();
```

`append` rejects an identity already in the retained rows. `upsert` merges a
partial row into its existing position or appends a new identity.
`replaceLast` may merge only the current final identity; a new identity is
appended, while an identity found earlier is an explicit error. `appendData()`
always means append even when the configured default mode is `upsert`.

Count retention keeps the newest rows. Time retention requires `eventTime` and
keeps rows whose retention-field timestamp is at least
`watermark - durationMs`. An explicit watermark must be finite and monotonic.
Otherwise a non-empty batch advances it to
`max(event time) - allowedLatenessMs`. Incoming rows behind the pre-update or
explicit watermark are rejected, dropped, or accepted according to
`lateData`. Every incoming row must include a valid event-time field, including
partial upserts.

Chart mutations are synchronous and recompile the current chart. Calling
`setData()` or `setSpec()` starts a new streaming session. For a bounded FIFO
ingestion queue use the standalone store:

```ts
import { createIncrementalDataStore } from 'graflume';

const store = createIncrementalDataStore(initialRows, spec.streaming);
await store.enqueue({ mode: 'upsert', rows: nextRows });
const state = store.state();
```

Queue overflow is reject-only and never silently discards a batch. State and
provenance are JSON-safe. Replay snapshots are structured-clone portable and
retain the original row value types, including `Date`; if bounded replay
history truncates, `exportReplay()` fails and requires a fresh snapshot rather
than returning an incomplete history. `Chart.replayData()` also requires the
replay's normalized streaming options to match the current chart contract; it
never silently continues under different retention or late-data rules.

Default limits are 100,000 retained/input rows, 100,000 rows per batch, 16
queued incremental batches, and 128 replay batches. The absolute row limit is
1,000,000; queue batches are capped at 1,024 and replay batches at 4,096.

## Portable transform worker adapter

Graflume does not create a Worker or serialize JavaScript functions. The host
creates a module worker, installs the versioned handler inside it, and gives
the Worker-like port to the adapter:

```ts
// transform.worker.ts
import { installTransformWorker } from 'graflume';
installTransformWorker(self);

// main.ts
import { createTransformWorkerAdapter } from 'graflume';

const worker = new Worker(new URL('./transform.worker.js', import.meta.url), {
  type: 'module',
});
const transforms = createTransformWorkerAdapter(worker, {
  maxQueueBatches: 8,
  maxQueueRows: 100_000,
  maxInputRows: 100_000,
  maxTransforms: 128,
});
const result = await transforms.execute(columnarData, closedTransformSpecs, {
  transferOwnership: true,
});
```

Requests run one at a time in FIFO order. Queue bounds include the in-flight
request; overflow rejects without dispatch. `transferOwnership` defaults to
`false`. When enabled for typed-column input, its unique `ArrayBuffer` objects
are transferred and the caller must treat the source arrays as detached.
Responses are matched by monotonically increasing request id, so stale or
foreign responses cannot resolve a request. Worker errors are returned as
explicit rejected promises.

This adapter executes only the existing closed, validated, function-free
`TransformSpec` AST. It returns ordinary row data. It does not yet provide
incremental transform recomputation, Arrow/WASM encoding, output-buffer
transfer, cancellation, automatic Worker creation, chart rendering in a
worker, or a drop/coalesce backpressure mode. Unsupported transform modes and
limits are errors rather than fallbacks.
