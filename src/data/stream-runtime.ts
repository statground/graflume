import { GraflumeError } from '../core/errors.js';
import type {
  ColumnarData,
  DataInput,
  DataRow,
  DataValue,
  StreamingRuntimeSpec,
  StreamingSpec,
  TransformSpec,
} from '../spec/types.js';
import { ownValue } from '../utils/object.js';
import {
  IncrementalTransformPipeline,
  type IncrementalTransformUpdateResult,
} from './incremental-transform.js';
import type { IncrementalReplay, IncrementalUpdate } from './incremental.js';
import { BoundedRingBuffer } from './ring-buffer.js';
import type {
  AutomaticWorkerRuntime,
  PortableWorkerData,
  WorkerStreamRetentionResult,
  WorkerStreamRetentionSnapshot,
} from './worker-runtime.js';

export type StreamOverflowPolicy = 'reject' | 'drop-oldest' | 'coalesce';

export type StreamRuntimeSpec = StreamingRuntimeSpec;

export interface StreamFrameScheduler {
  request(callback: (timestamp: number) => void): unknown;
  cancel(handle: unknown): void;
}

export interface StreamEnqueueOptions {
  readonly signal?: AbortSignal;
}

export interface StreamHistoryEntry {
  readonly sequence: number;
  readonly mode: NonNullable<IncrementalUpdate['mode']>;
  readonly watermark?: number;
  readonly rows: readonly DataRow[];
}

export interface StreamHistoryPage {
  readonly version: 1;
  readonly entries: readonly StreamHistoryEntry[];
  readonly nextCursor: number | null;
  readonly retainedBatches: number;
}

export interface IncrementalStreamRuntimeState {
  readonly version: 1;
  readonly paused: boolean;
  readonly followLive: boolean;
  readonly scheduled: boolean;
  readonly queuedBatches: number;
  readonly queuedRows: number;
  readonly appliedBatches: number;
  readonly droppedBatches: number;
  readonly coalescedBatches: number;
  readonly cancelledBatches: number;
  readonly visibleSequence: number;
  readonly liveSequence: number;
  readonly historyBatches: number;
}

interface PendingBatch {
  update: IncrementalUpdate;
  readonly subscribers: {
    readonly resolve: (result: IncrementalTransformUpdateResult) => void;
    readonly reject: (error: unknown) => void;
    readonly signal?: AbortSignal;
    abort?: () => void;
  }[];
}

interface NormalizedRuntimeSpec {
  readonly schedule: 'animation-frame' | 'microtask';
  readonly maxBatchesPerFrame: number;
  readonly overflow: StreamOverflowPolicy;
  readonly paused: boolean;
  readonly followLive: boolean;
  readonly historyBatches: number;
  readonly historyPageRows: number;
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
  path: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > maximum) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be an integer from 1 to ${maximum}.`, {
      path,
    });
  }
  return resolved;
}

function normalizeRuntimeSpec(spec: StreamRuntimeSpec): NormalizedRuntimeSpec {
  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new GraflumeError('INVALID_SPEC', '$.streaming.runtime must be an object.');
  }
  const keys = new Set([
    'schedule',
    'maxBatchesPerFrame',
    'overflow',
    'paused',
    'followLive',
    'history',
  ]);
  const unknown = Object.keys(spec).find((key) => !keys.has(key));
  if (unknown !== undefined) {
    throw new GraflumeError('INVALID_SPEC', `Unknown streaming runtime property "${unknown}".`, {
      path: `$.streaming.runtime.${unknown}`,
    });
  }
  if (spec.schedule !== undefined && !['animation-frame', 'microtask'].includes(spec.schedule)) {
    throw new GraflumeError('INVALID_SPEC', 'Streaming schedule is unsupported.');
  }
  if (
    spec.overflow !== undefined &&
    !['reject', 'drop-oldest', 'coalesce'].includes(spec.overflow)
  ) {
    throw new GraflumeError('INVALID_SPEC', 'Streaming overflow policy is unsupported.');
  }
  if (spec.paused !== undefined && typeof spec.paused !== 'boolean') {
    throw new GraflumeError('INVALID_SPEC', '$.streaming.runtime.paused must be boolean.');
  }
  if (spec.followLive !== undefined && typeof spec.followLive !== 'boolean') {
    throw new GraflumeError('INVALID_SPEC', '$.streaming.runtime.followLive must be boolean.');
  }
  if (
    spec.history !== undefined &&
    (spec.history === null || typeof spec.history !== 'object' || Array.isArray(spec.history))
  ) {
    throw new GraflumeError('INVALID_SPEC', '$.streaming.runtime.history must be an object.');
  }
  if (spec.history !== undefined) {
    const historyUnknown = Object.keys(spec.history).find(
      (key) => !['maxBatches', 'pageRows'].includes(key),
    );
    if (historyUnknown !== undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Unknown streaming history property "${historyUnknown}".`,
      );
    }
  }
  return {
    schedule: spec.schedule ?? 'animation-frame',
    maxBatchesPerFrame: boundedInteger(
      spec.maxBatchesPerFrame,
      8,
      1_024,
      '$.streaming.runtime.maxBatchesPerFrame',
    ),
    overflow: spec.overflow ?? 'reject',
    paused: spec.paused ?? false,
    followLive: spec.followLive ?? true,
    historyBatches: boundedInteger(
      spec.history?.maxBatches,
      256,
      4_096,
      '$.streaming.runtime.history.maxBatches',
    ),
    historyPageRows: boundedInteger(
      spec.history?.pageRows,
      1_000,
      100_000,
      '$.streaming.runtime.history.pageRows',
    ),
  };
}

function defaultScheduler(mode: NormalizedRuntimeSpec['schedule']): StreamFrameScheduler {
  if (mode === 'animation-frame' && typeof requestAnimationFrame === 'function') {
    return {
      request: (callback) => requestAnimationFrame(callback),
      cancel: (handle) => cancelAnimationFrame(handle as number),
    };
  }
  if (mode === 'microtask') {
    let sequence = 0;
    const cancelled = new Set<number>();
    return {
      request(callback) {
        sequence += 1;
        const id = sequence;
        queueMicrotask(() => {
          if (!cancelled.delete(id)) callback(performance.now());
        });
        return id;
      },
      cancel(handle) {
        cancelled.add(handle as number);
      },
    };
  }
  return {
    request: (callback) => setTimeout(() => callback(performance.now()), 16),
    cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

function cloneUpdate(update: IncrementalUpdate): IncrementalUpdate {
  return structuredClone(update) as IncrementalUpdate;
}

function updateRows(update: IncrementalUpdate): number {
  if (!Array.isArray(update.rows)) {
    throw new GraflumeError('INVALID_DATA', '$.update.rows must be an array.');
  }
  return update.rows.length;
}

function coalesceStableKey(value: DataValue, path: string): string {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return `date:${value.toISOString()}`;
  if (typeof value === 'string' && value !== '') return `string:${value}`;
  if (typeof value === 'number' && Number.isFinite(value)) return `number:${value}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  throw new GraflumeError('INVALID_DATA', 'Streaming coalesce keys must be portable scalars.', {
    path,
  });
}

function abortedError(): DOMException {
  return new DOMException('The streaming update was cancelled.', 'AbortError');
}

/** RAF-coalesced controller around the stable-key incremental transform pipeline. */
export class IncrementalStreamRuntime {
  readonly #pipeline: IncrementalTransformPipeline;
  readonly #streaming: StreamingSpec;
  readonly #runtime: NormalizedRuntimeSpec;
  readonly #scheduler: StreamFrameScheduler;
  readonly #history: BoundedRingBuffer<StreamHistoryEntry>;
  #queue: PendingBatch[] = [];
  #queuedRows = 0;
  #frame: unknown | null = null;
  #paused: boolean;
  #followLive: boolean;
  #visible: IncrementalTransformUpdateResult | null = null;
  #latest: IncrementalTransformUpdateResult | null = null;
  #appliedBatches = 0;
  #droppedBatches = 0;
  #coalescedBatches = 0;
  #cancelledBatches = 0;

  constructor(
    input: DataInput,
    transforms: readonly TransformSpec[],
    streaming: StreamingSpec,
    runtime: StreamRuntimeSpec = {},
    scheduler?: StreamFrameScheduler,
  ) {
    this.#runtime = normalizeRuntimeSpec(runtime);
    this.#streaming = structuredClone(streaming) as StreamingSpec;
    this.#pipeline = new IncrementalTransformPipeline(input, transforms, { streaming });
    this.#scheduler = scheduler ?? defaultScheduler(this.#runtime.schedule);
    this.#history = new BoundedRingBuffer(this.#runtime.historyBatches);
    this.#paused = this.#runtime.paused;
    this.#followLive = this.#runtime.followLive;
  }

  enqueue(
    update: IncrementalUpdate,
    options: StreamEnqueueOptions = {},
  ): Promise<IncrementalTransformUpdateResult> {
    if (options.signal?.aborted === true) return Promise.reject(abortedError());
    let snapshot: IncrementalUpdate;
    try {
      snapshot = cloneUpdate(update);
      updateRows(snapshot);
    } catch (error) {
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      const subscriber: PendingBatch['subscribers'][number] = {
        resolve,
        reject,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      };
      if (options.signal !== undefined) {
        subscriber.abort = () => this.#cancelSubscriber(subscriber);
        options.signal.addEventListener('abort', subscriber.abort, { once: true });
      }
      if (!this.#admit(snapshot, subscriber)) return;
      this.#schedule();
    });
  }

  pause(): void {
    this.#paused = true;
    if (this.#frame !== null) {
      this.#scheduler.cancel(this.#frame);
      this.#frame = null;
    }
  }

  resume(): void {
    if (!this.#paused) return;
    this.#paused = false;
    this.#schedule();
  }

  setFollowLive(follow: boolean): void {
    this.#followLive = follow;
    if (follow && this.#latest !== null) this.#visible = this.#latest;
  }

  state(): IncrementalStreamRuntimeState {
    return {
      version: 1,
      paused: this.#paused,
      followLive: this.#followLive,
      scheduled: this.#frame !== null,
      queuedBatches: this.#queue.length,
      queuedRows: this.#queuedRows,
      appliedBatches: this.#appliedBatches,
      droppedBatches: this.#droppedBatches,
      coalescedBatches: this.#coalescedBatches,
      cancelledBatches: this.#cancelledBatches,
      visibleSequence: this.#visible?.state.sequence ?? 0,
      liveSequence: this.#latest?.state.sequence ?? 0,
      historyBatches: this.#history.length,
    };
  }

  visible(): IncrementalTransformUpdateResult | null {
    return this.#visible === null
      ? null
      : (structuredClone(this.#visible) as IncrementalTransformUpdateResult);
  }

  latest(): IncrementalTransformUpdateResult | null {
    return this.#latest === null
      ? null
      : (structuredClone(this.#latest) as IncrementalTransformUpdateResult);
  }

  historyPage(cursor = 0): StreamHistoryPage {
    if (!Number.isInteger(cursor) || cursor < 0) {
      throw new GraflumeError('INVALID_DATA', 'Streaming history cursor must be non-negative.');
    }
    const entries = this.#history.values().reverse();
    const page: StreamHistoryEntry[] = [];
    let rowCount = 0;
    let index = cursor;
    while (index < entries.length) {
      const entry = entries[index]!;
      if (page.length > 0 && rowCount + entry.rows.length > this.#runtime.historyPageRows) break;
      page.push(structuredClone(entry) as StreamHistoryEntry);
      rowCount += entry.rows.length;
      index += 1;
      if (rowCount >= this.#runtime.historyPageRows) break;
    }
    return {
      version: 1,
      entries: page,
      nextCursor: index < entries.length ? index : null,
      retainedBatches: entries.length,
    };
  }

  destroy(): void {
    if (this.#frame !== null) this.#scheduler.cancel(this.#frame);
    this.#frame = null;
    const error = new GraflumeError('DESTROYED_CHART', 'Streaming runtime was destroyed.');
    for (const batch of this.#queue) this.#settle(batch, 'reject', error);
    this.#queue = [];
    this.#queuedRows = 0;
  }

  #admit(update: IncrementalUpdate, subscriber: PendingBatch['subscribers'][number]): boolean {
    const maxBatches = this.#streaming.queue?.maxBatches ?? 16;
    const maxRows = this.#streaming.queue?.maxRows ?? 100_000;
    const rows = updateRows(update);
    const over = () => this.#queue.length >= maxBatches || this.#queuedRows + rows > maxRows;
    if (over() && this.#runtime.overflow === 'coalesce') {
      const last = this.#queue.at(-1);
      if (last !== undefined && this.#coalesce(last, update, maxRows)) {
        last.subscribers.push(subscriber);
        this.#coalescedBatches += 1;
        return true;
      }
    }
    if (over() && this.#runtime.overflow === 'drop-oldest') {
      while (over() && this.#queue.length > 0) {
        const dropped = this.#queue.shift()!;
        this.#queuedRows -= updateRows(dropped.update);
        this.#droppedBatches += 1;
        this.#settle(
          dropped,
          'reject',
          new GraflumeError(
            'INVALID_DATA',
            'Streaming batch was dropped by explicit overflow policy.',
          ),
        );
      }
    }
    if (over()) {
      subscriber.signal?.removeEventListener('abort', subscriber.abort!);
      subscriber.reject(
        new GraflumeError(
          'INVALID_DATA',
          'Streaming queue backpressure limit reached; the batch was rejected without mutation.',
        ),
      );
      return false;
    }
    this.#queue.push({ update, subscribers: [subscriber] });
    this.#queuedRows += rows;
    return true;
  }

  #coalesce(batch: PendingBatch, incoming: IncrementalUpdate, maximumRows: number): boolean {
    const mode = incoming.mode ?? this.#streaming.mode ?? 'append';
    const batchMode = batch.update.mode ?? this.#streaming.mode ?? 'append';
    if (mode !== batchMode) return false;
    const key = this.#streaming.key;
    const combined = [...batch.update.rows, ...incoming.rows];
    if (mode === 'append') {
      if (combined.length > maximumRows) return false;
      this.#queuedRows += incoming.rows.length;
      batch.update = {
        mode,
        rows: combined,
        ...((incoming.watermark ?? batch.update.watermark) === undefined
          ? {}
          : {
              watermark: Math.max(
                incoming.watermark ?? -Infinity,
                batch.update.watermark ?? -Infinity,
              ),
            }),
      };
      return true;
    }
    const latest = new Map<string, DataRow>();
    for (const [index, row] of combined.entries()) {
      latest.set(
        coalesceStableKey(ownValue(row, key) as DataValue, `$.update.rows[${index}].${key}`),
        row,
      );
    }
    const rows = [...latest.values()];
    if (rows.length > maximumRows) return false;
    this.#queuedRows += rows.length - batch.update.rows.length;
    batch.update = {
      mode,
      rows,
      ...((incoming.watermark ?? batch.update.watermark) === undefined
        ? {}
        : {
            watermark: Math.max(
              incoming.watermark ?? -Infinity,
              batch.update.watermark ?? -Infinity,
            ),
          }),
    };
    return true;
  }

  #schedule(): void {
    if (this.#paused || this.#frame !== null || this.#queue.length === 0) return;
    this.#frame = this.#scheduler.request(() => {
      this.#frame = null;
      this.#drainFrame();
    });
  }

  #drainFrame(): void {
    if (this.#paused) return;
    let count = 0;
    while (count < this.#runtime.maxBatchesPerFrame) {
      const batch = this.#queue.shift();
      if (batch === undefined) break;
      this.#queuedRows -= updateRows(batch.update);
      if (batch.subscribers.length === 0) continue;
      try {
        const result = this.#pipeline.apply(batch.update);
        this.#latest = result;
        if (this.#followLive) this.#visible = result;
        this.#appliedBatches += 1;
        this.#history.push({
          sequence: result.state.sequence,
          mode: batch.update.mode ?? this.#streaming.mode ?? 'append',
          ...(batch.update.watermark === undefined ? {} : { watermark: batch.update.watermark }),
          rows: structuredClone(batch.update.rows) as readonly DataRow[],
        });
        this.#settle(batch, 'resolve', result);
      } catch (error) {
        this.#settle(batch, 'reject', error);
      }
      count += 1;
    }
    this.#schedule();
  }

  #cancelSubscriber(subscriber: PendingBatch['subscribers'][number]): void {
    for (const batch of this.#queue) {
      const index = batch.subscribers.indexOf(subscriber);
      if (index < 0) continue;
      batch.subscribers.splice(index, 1);
      subscriber.signal?.removeEventListener('abort', subscriber.abort!);
      subscriber.reject(abortedError());
      this.#cancelledBatches += 1;
      if (batch.subscribers.length === 0) {
        this.#queue = this.#queue.filter((candidate) => candidate !== batch);
        this.#queuedRows -= updateRows(batch.update);
      }
      return;
    }
  }

  #settle(
    batch: PendingBatch,
    action: 'resolve' | 'reject',
    value: IncrementalTransformUpdateResult | unknown,
  ): void {
    for (const subscriber of batch.subscribers) {
      if (subscriber.abort !== undefined) {
        subscriber.signal?.removeEventListener('abort', subscriber.abort);
      }
      if (action === 'resolve') subscriber.resolve(value as IncrementalTransformUpdateResult);
      else subscriber.reject(value);
    }
    batch.subscribers.splice(0);
  }
}

export function createIncrementalStreamRuntime(
  input: DataInput,
  transforms: readonly TransformSpec[],
  streaming: StreamingSpec,
  runtime: StreamRuntimeSpec = {},
  scheduler?: StreamFrameScheduler,
): IncrementalStreamRuntime {
  return new IncrementalStreamRuntime(input, transforms, streaming, runtime, scheduler);
}

export interface WorkerStreamRetentionRuntimeOptions {
  readonly signal?: AbortSignal;
  readonly includeReplay?: boolean;
}

function portableStreamData(input: DataInput): PortableWorkerData {
  return Array.isArray(input)
    ? { kind: 'rows', rows: input }
    : { kind: 'columns', columns: input as ColumnarData };
}

function resultSnapshot(
  result: WorkerStreamRetentionResult,
  expected: Exclude<WorkerStreamRetentionResult['action'], 'close'>,
): WorkerStreamRetentionSnapshot {
  if (result.action === 'close' || result.action !== expected) {
    throw new GraflumeError('INVALID_DATA', 'Worker stream retention result kind mismatch.');
  }
  return structuredClone(result.snapshot) as WorkerStreamRetentionSnapshot;
}

/**
 * Public session wrapper whose retained rows and watermark live inside the
 * Worker protocol rather than in the main-thread IncrementalStreamRuntime.
 */
export class WorkerStreamRetentionRuntime {
  readonly #worker: AutomaticWorkerRuntime;
  readonly #streamId: string;
  #latest: WorkerStreamRetentionSnapshot;
  #closed = false;

  private constructor(
    worker: AutomaticWorkerRuntime,
    streamId: string,
    snapshot: WorkerStreamRetentionSnapshot,
  ) {
    this.#worker = worker;
    this.#streamId = streamId;
    this.#latest = structuredClone(snapshot) as WorkerStreamRetentionSnapshot;
  }

  static async create(
    worker: AutomaticWorkerRuntime,
    streamId: string,
    input: DataInput,
    streaming: StreamingSpec,
    options: WorkerStreamRetentionRuntimeOptions = {},
  ): Promise<WorkerStreamRetentionRuntime> {
    const result = await worker.streamRetention(
      {
        streamId,
        action: {
          type: 'initialize',
          data: portableStreamData(input),
          streaming,
          ...(options.includeReplay === undefined ? {} : { includeReplay: options.includeReplay }),
        },
      },
      options.signal === undefined ? {} : { signal: options.signal },
    );
    return new WorkerStreamRetentionRuntime(worker, streamId, resultSnapshot(result, 'initialize'));
  }

  static async restore(
    worker: AutomaticWorkerRuntime,
    streamId: string,
    replay: IncrementalReplay,
    options: WorkerStreamRetentionRuntimeOptions = {},
  ): Promise<WorkerStreamRetentionRuntime> {
    const result = await worker.streamRetention(
      {
        streamId,
        action: {
          type: 'restore',
          replay,
          ...(options.includeReplay === undefined ? {} : { includeReplay: options.includeReplay }),
        },
      },
      options.signal === undefined ? {} : { signal: options.signal },
    );
    return new WorkerStreamRetentionRuntime(worker, streamId, resultSnapshot(result, 'restore'));
  }

  streamId(): string {
    return this.#streamId;
  }

  latest(): WorkerStreamRetentionSnapshot {
    return structuredClone(this.#latest) as WorkerStreamRetentionSnapshot;
  }

  async enqueue(
    update: IncrementalUpdate,
    options: WorkerStreamRetentionRuntimeOptions = {},
  ): Promise<WorkerStreamRetentionSnapshot> {
    this.#assertOpen();
    const result = await this.#worker.streamRetention(
      {
        streamId: this.#streamId,
        action: {
          type: 'update',
          update,
          ...(options.includeReplay === undefined ? {} : { includeReplay: options.includeReplay }),
        },
      },
      options.signal === undefined ? {} : { signal: options.signal },
    );
    this.#latest = resultSnapshot(result, 'update');
    return this.latest();
  }

  async snapshot(
    options: WorkerStreamRetentionRuntimeOptions = {},
  ): Promise<WorkerStreamRetentionSnapshot> {
    this.#assertOpen();
    const result = await this.#worker.streamRetention(
      {
        streamId: this.#streamId,
        action: {
          type: 'snapshot',
          ...(options.includeReplay === undefined ? {} : { includeReplay: options.includeReplay }),
        },
      },
      options.signal === undefined ? {} : { signal: options.signal },
    );
    this.#latest = resultSnapshot(result, 'snapshot');
    return this.latest();
  }

  async exportReplay(options: StreamEnqueueOptions = {}): Promise<IncrementalReplay> {
    const snapshot = await this.snapshot({ ...options, includeReplay: true });
    if (snapshot.replayStatus !== 'available' || snapshot.replay === undefined) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Worker stream replay is truncated; initialize a fresh bounded snapshot.',
      );
    }
    return structuredClone(snapshot.replay) as IncrementalReplay;
  }

  async close(options: StreamEnqueueOptions = {}): Promise<void> {
    if (this.#closed) return;
    const result = await this.#worker.streamRetention(
      { streamId: this.#streamId, action: { type: 'close' } },
      options.signal === undefined ? {} : { signal: options.signal },
    );
    if (result.action !== 'close' || !result.closed) {
      throw new GraflumeError('INVALID_DATA', 'Worker stream close result kind mismatch.');
    }
    this.#closed = true;
  }

  #assertOpen(): void {
    if (this.#closed) {
      throw new GraflumeError('INVALID_DATA', 'Worker stream retention runtime is closed.');
    }
  }
}

export function createWorkerStreamRetentionRuntime(
  worker: AutomaticWorkerRuntime,
  streamId: string,
  input: DataInput,
  streaming: StreamingSpec,
  options: WorkerStreamRetentionRuntimeOptions = {},
): Promise<WorkerStreamRetentionRuntime> {
  return WorkerStreamRetentionRuntime.create(worker, streamId, input, streaming, options);
}

export function restoreWorkerStreamRetentionRuntime(
  worker: AutomaticWorkerRuntime,
  streamId: string,
  replay: IncrementalReplay,
  options: WorkerStreamRetentionRuntimeOptions = {},
): Promise<WorkerStreamRetentionRuntime> {
  return WorkerStreamRetentionRuntime.restore(worker, streamId, replay, options);
}
