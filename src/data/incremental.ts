import { GraflumeError } from '../core/errors.js';
import { temporalTimestamp } from '../format/temporal.js';
import type { DataInput, DataRow, DataValue, StreamingMode, StreamingSpec } from '../spec/types.js';
import { assertSafeKey, isPlainObject, ownValue } from '../utils/object.js';
import { DataTable } from './table.js';
import { BoundedRingBuffer } from './ring-buffer.js';

export interface IncrementalUpdate {
  readonly mode?: StreamingMode;
  readonly rows: readonly DataRow[];
  /** Optional monotonic event-time watermark in epoch milliseconds. */
  readonly watermark?: number;
}

export interface IncrementalProvenanceStep {
  readonly sequence: number;
  readonly mode: StreamingMode;
  readonly inputRows: number;
  readonly acceptedRows: number;
  readonly insertedRows: number;
  readonly updatedRows: number;
  readonly droppedLateRows: number;
  readonly evictedRows: number;
  readonly outputRows: number;
  readonly watermark: number | null;
}

export interface IncrementalDataState {
  readonly version: 1;
  readonly key: string;
  readonly rowCount: number;
  readonly watermark: number | null;
  readonly sequence: number;
  readonly acceptedRows: number;
  readonly droppedLateRows: number;
  readonly evictedRows: number;
  readonly queuedBatches: number;
  readonly queuedRows: number;
  readonly queueDroppedBatches: number;
  readonly queueCoalescedBatches: number;
  readonly replayBatches: number;
  readonly replayRows: number;
  readonly replayTruncated: boolean;
  readonly provenance: readonly IncrementalProvenanceStep[];
}

export interface IncrementalReplay {
  readonly version: 1;
  readonly options: StreamingSpec;
  readonly initial: readonly DataRow[];
  readonly updates: readonly IncrementalUpdate[];
}

export interface IncrementalUpdateResult {
  readonly rows: readonly DataRow[];
  readonly state: IncrementalDataState;
  readonly step: IncrementalProvenanceStep;
}

interface QueuedSubscriber {
  readonly resolve: (result: IncrementalUpdateResult) => void;
  readonly reject: (error: unknown) => void;
}

interface QueuedUpdate {
  update: IncrementalUpdate;
  readonly subscribers: QueuedSubscriber[];
}

interface NormalizedStreamingOptions {
  readonly key: string;
  readonly mode: StreamingMode;
  readonly maxBatchRows: number;
  readonly retentionRows: number;
  readonly timeRetention: false | { readonly field: string; readonly durationMs: number };
  readonly eventTime:
    | false
    | {
        readonly field: string;
        readonly allowedLatenessMs: number;
        readonly lateData: 'reject' | 'drop' | 'accept';
      };
  readonly maxQueueBatches: number;
  readonly maxQueueRows: number;
  readonly overflow: 'reject' | 'drop-oldest' | 'coalesce';
  readonly maxReplayBatches: number;
  readonly maxReplayRows: number;
}

const DEFAULT_MAX_ROWS = 100_000;
const ABSOLUTE_MAX_ROWS = 1_000_000;
const DEFAULT_MAX_BATCH_ROWS = 100_000;
const DEFAULT_MAX_QUEUE_BATCHES = 16;
const DEFAULT_MAX_REPLAY_BATCHES = 128;
const STREAMING_OPTION_KEYS = new Set([
  'key',
  'mode',
  'maxBatchRows',
  'retention',
  'eventTime',
  'queue',
  'replay',
  'runtime',
  'worker',
]);
const RETENTION_KEYS = new Set(['maxRows', 'time']);
const TIME_RETENTION_KEYS = new Set(['field', 'durationMs']);
const EVENT_TIME_KEYS = new Set(['field', 'allowedLatenessMs', 'lateData']);
const QUEUE_KEYS = new Set(['maxBatches', 'maxRows', 'overflow']);
const REPLAY_KEYS = new Set(['maxBatches', 'maxRows']);
const RUNTIME_KEYS = new Set([
  'schedule',
  'maxBatchesPerFrame',
  'overflow',
  'paused',
  'followLive',
  'history',
]);
const RUNTIME_HISTORY_KEYS = new Set(['maxBatches', 'pageRows']);
const WORKER_KEYS = new Set([
  'moduleURL',
  'name',
  'maxQueueBatches',
  'maxQueueRows',
  'maxInputRows',
  'maxBinaryBytes',
  'maxTransforms',
  'overflow',
  'engine',
]);
const WORKER_ENGINE_KEYS = new Set(['type', 'adapter']);
const UPDATE_KEYS = new Set(['mode', 'rows', 'watermark']);
const REPLAY_ENVELOPE_KEYS = new Set(['version', 'options', 'initial', 'updates']);

function closedObject(
  value: unknown,
  keys: ReadonlySet<string>,
  path: string,
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be an object.`, { path });
  }
  const unknown = Object.keys(value).find((key) => !keys.has(key));
  if (unknown !== undefined) {
    throw new GraflumeError('INVALID_SPEC', `Unknown ${path} property "${unknown}".`, {
      path: `${path}.${unknown}`,
    });
  }
  return value;
}

function requiredSafeField(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new GraflumeError('INVALID_SPEC', `${path} must be a non-empty string.`, { path });
  }
  assertSafeKey(value, path);
}

function validateOptionsShape(value: unknown): asserts value is StreamingSpec {
  const options = closedObject(value, STREAMING_OPTION_KEYS, '$.streaming');
  requiredSafeField(options.key, '$.streaming.key');
  if (options.retention !== undefined) {
    const retention = closedObject(options.retention, RETENTION_KEYS, '$.streaming.retention');
    if (retention.time !== undefined) {
      const time = closedObject(retention.time, TIME_RETENTION_KEYS, '$.streaming.retention.time');
      requiredSafeField(time.field, '$.streaming.retention.time.field');
      if (time.durationMs === undefined) {
        throw new GraflumeError(
          'INVALID_SPEC',
          '$.streaming.retention.time.durationMs is required.',
          { path: '$.streaming.retention.time.durationMs' },
        );
      }
    }
  }
  if (options.eventTime !== undefined) {
    const eventTime = closedObject(options.eventTime, EVENT_TIME_KEYS, '$.streaming.eventTime');
    requiredSafeField(eventTime.field, '$.streaming.eventTime.field');
  }
  if (options.queue !== undefined) {
    closedObject(options.queue, QUEUE_KEYS, '$.streaming.queue');
  }
  if (options.replay !== undefined) {
    closedObject(options.replay, REPLAY_KEYS, '$.streaming.replay');
  }
  if (options.runtime !== undefined) {
    const runtime = closedObject(options.runtime, RUNTIME_KEYS, '$.streaming.runtime');
    if (runtime.history !== undefined) {
      closedObject(runtime.history, RUNTIME_HISTORY_KEYS, '$.streaming.runtime.history');
    }
  }
  if (options.worker !== undefined) {
    const worker = closedObject(options.worker, WORKER_KEYS, '$.streaming.worker');
    if (worker.engine !== undefined) {
      closedObject(worker.engine, WORKER_ENGINE_KEYS, '$.streaming.worker.engine');
    }
  }
}

function validateUpdateShape(value: unknown): asserts value is IncrementalUpdate {
  const update = closedObject(value, UPDATE_KEYS, '$.update');
  if (!Array.isArray(update.rows)) {
    throw new GraflumeError('INVALID_DATA', '$.update.rows must be an array.', {
      path: '$.update.rows',
    });
  }
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

function nonNegative(value: number | undefined, fallback: number, path: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be a finite non-negative number.`, {
      path,
    });
  }
  return resolved;
}

function normalizeOptions(options: StreamingSpec): NormalizedStreamingOptions {
  validateOptionsShape(options);
  if (!['append', 'upsert', 'replaceLast'].includes(options.mode ?? 'append')) {
    throw new GraflumeError('INVALID_SPEC', 'Streaming mode is not supported.', {
      path: '$.streaming.mode',
    });
  }
  const overflow = (options.queue?.overflow ?? 'reject') as string;
  if (!['reject', 'drop-oldest', 'coalesce'].includes(overflow)) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Streaming queue overflow must be "reject", "drop-oldest", or "coalesce".',
      { path: '$.streaming.queue.overflow' },
    );
  }
  const retentionRows = boundedInteger(
    options.retention?.maxRows,
    DEFAULT_MAX_ROWS,
    ABSOLUTE_MAX_ROWS,
    '$.streaming.retention.maxRows',
  );
  const timeRetention =
    options.retention?.time === undefined
      ? false
      : {
          field: options.retention.time.field,
          durationMs: nonNegative(
            options.retention.time.durationMs,
            0,
            '$.streaming.retention.time.durationMs',
          ),
        };
  if (timeRetention !== false) assertSafeKey(timeRetention.field, 'streaming.retention.time.field');
  const eventTime =
    options.eventTime === undefined
      ? false
      : {
          field: options.eventTime.field,
          allowedLatenessMs: nonNegative(
            options.eventTime.allowedLatenessMs,
            0,
            '$.streaming.eventTime.allowedLatenessMs',
          ),
          lateData: options.eventTime.lateData ?? 'reject',
        };
  if (eventTime !== false) {
    assertSafeKey(eventTime.field, 'streaming.eventTime.field');
    if (!['reject', 'drop', 'accept'].includes(eventTime.lateData)) {
      throw new GraflumeError('INVALID_SPEC', 'Late-data policy is not supported.', {
        path: '$.streaming.eventTime.lateData',
      });
    }
  }
  if (timeRetention !== false && eventTime === false) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Time retention requires an eventTime watermark contract.',
      { path: '$.streaming.retention.time' },
    );
  }
  return {
    key: options.key,
    mode: options.mode ?? 'append',
    maxBatchRows: boundedInteger(
      options.maxBatchRows,
      DEFAULT_MAX_BATCH_ROWS,
      ABSOLUTE_MAX_ROWS,
      '$.streaming.maxBatchRows',
    ),
    retentionRows,
    timeRetention,
    eventTime,
    maxQueueBatches: boundedInteger(
      options.queue?.maxBatches,
      DEFAULT_MAX_QUEUE_BATCHES,
      1_024,
      '$.streaming.queue.maxBatches',
    ),
    maxQueueRows: boundedInteger(
      options.queue?.maxRows,
      retentionRows,
      ABSOLUTE_MAX_ROWS,
      '$.streaming.queue.maxRows',
    ),
    overflow: overflow as NormalizedStreamingOptions['overflow'],
    maxReplayBatches: boundedInteger(
      options.replay?.maxBatches,
      DEFAULT_MAX_REPLAY_BATCHES,
      4_096,
      '$.streaming.replay.maxBatches',
    ),
    maxReplayRows: boundedInteger(
      options.replay?.maxRows,
      DEFAULT_MAX_ROWS,
      ABSOLUTE_MAX_ROWS,
      '$.streaming.replay.maxRows',
    ),
  };
}

function rowsFrom(input: DataInput): DataRow[] {
  if (Array.isArray(input)) return input.map(cloneRow);
  const table = DataTable.from(input);
  return Array.from({ length: table.length }, (_, index) => cloneRow(table.row(index)));
}

function cloneValue(value: DataValue): DataValue {
  if (value instanceof Date) return new Date(value);
  return Array.isArray(value) ? [...value] : value;
}

function cloneRow(row: DataRow): DataRow {
  if (!isPlainObject(row)) {
    throw new GraflumeError('INVALID_DATA', 'Incremental rows must be plain objects.', {
      path: '$.update.rows',
    });
  }
  const copy = Object.create(null) as Record<string, DataValue>;
  for (const [field, value] of Object.entries(row)) {
    assertSafeKey(field, `data.${field}`);
    copy[field] = cloneValue(value);
  }
  return copy;
}

function stableKey(value: DataValue, path: string): string {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return `date:${value.toISOString()}`;
  if (typeof value === 'number' && Number.isFinite(value)) return `number:${value}`;
  if (typeof value === 'string' && value !== '') return `string:${value}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  throw new GraflumeError(
    'INVALID_DATA',
    'Streaming stable keys must be non-empty strings, finite numbers, booleans, or valid Dates.',
    { path },
  );
}

function eventTimestamp(value: DataValue, path: string): number {
  const timestamp = temporalTimestamp(value, true) ?? Number.NaN;
  if (!Number.isFinite(timestamp)) {
    throw new GraflumeError(
      'INVALID_DATA',
      'Event time must be a finite epoch number, Date, or parseable date string.',
      { path },
    );
  }
  return timestamp;
}

function cloneUpdate(update: IncrementalUpdate): IncrementalUpdate {
  return {
    ...(update.mode === undefined ? {} : { mode: update.mode }),
    rows: update.rows.map(cloneRow),
    ...(update.watermark === undefined ? {} : { watermark: update.watermark }),
  };
}

function cloneOptions(options: StreamingSpec): StreamingSpec {
  return {
    key: options.key,
    ...(options.mode === undefined ? {} : { mode: options.mode }),
    ...(options.maxBatchRows === undefined ? {} : { maxBatchRows: options.maxBatchRows }),
    ...(options.retention === undefined
      ? {}
      : {
          retention: {
            ...(options.retention.maxRows === undefined
              ? {}
              : { maxRows: options.retention.maxRows }),
            ...(options.retention.time === undefined
              ? {}
              : { time: { ...options.retention.time } }),
          },
        }),
    ...(options.eventTime === undefined ? {} : { eventTime: { ...options.eventTime } }),
    ...(options.queue === undefined ? {} : { queue: { ...options.queue } }),
    ...(options.replay === undefined ? {} : { replay: { ...options.replay } }),
    ...(options.runtime === undefined
      ? {}
      : {
          runtime: {
            ...options.runtime,
            ...(options.runtime.history === undefined
              ? {}
              : { history: { ...options.runtime.history } }),
          },
        }),
    ...(options.worker === undefined
      ? {}
      : {
          worker: {
            ...options.worker,
            ...(options.worker.engine === undefined
              ? {}
              : { engine: { ...options.worker.engine } }),
          },
        }),
  };
}

/** Internal semantic comparison used before attaching replay state to a ChartSpec. */
export function incrementalContractsMatch(left: StreamingSpec, right: StreamingSpec): boolean {
  return JSON.stringify(normalizeOptions(left)) === JSON.stringify(normalizeOptions(right));
}

export class IncrementalDataStore {
  readonly #options: StreamingSpec;
  readonly #normalized: NormalizedStreamingOptions;
  readonly #initial: readonly DataRow[];
  #rows: BoundedRingBuffer<DataRow>;
  #watermark: number | null = null;
  #sequence = 0;
  #acceptedRows = 0;
  #droppedLateRows = 0;
  #evictedRows = 0;
  #provenance: IncrementalProvenanceStep[] = [];
  #replay: IncrementalUpdate[] = [];
  #replayRows = 0;
  #replayTruncated = false;
  #queue: QueuedUpdate[] = [];
  #queuedRows = 0;
  #queueDroppedBatches = 0;
  #queueCoalescedBatches = 0;
  #draining = false;

  constructor(input: DataInput, options: StreamingSpec) {
    this.#normalized = normalizeOptions(options);
    this.#options = cloneOptions(options);
    const initial = rowsFrom(input);
    this.#assertUniqueKeys(initial, '$.data');
    this.#rows = new BoundedRingBuffer(this.#normalized.retentionRows, initial);
    this.#initial = this.#rows.values().map(cloneRow);
  }

  rows(): readonly DataRow[] {
    return this.#rows.values().map(cloneRow);
  }

  state(): IncrementalDataState {
    return {
      version: 1,
      key: this.#normalized.key,
      rowCount: this.#rows.length,
      watermark: this.#watermark,
      sequence: this.#sequence,
      acceptedRows: this.#acceptedRows,
      droppedLateRows: this.#droppedLateRows,
      evictedRows: this.#evictedRows,
      queuedBatches: this.#queue.length,
      queuedRows: this.#queuedRows,
      queueDroppedBatches: this.#queueDroppedBatches,
      queueCoalescedBatches: this.#queueCoalescedBatches,
      replayBatches: this.#replay.length,
      replayRows: this.#replayRows,
      replayTruncated: this.#replayTruncated,
      provenance: this.#provenance.map((step) => ({ ...step })),
    };
  }

  apply(update: IncrementalUpdate): IncrementalUpdateResult {
    validateUpdateShape(update);
    const mode = update.mode ?? this.#normalized.mode;
    if (!['append', 'upsert', 'replaceLast'].includes(mode)) {
      throw new GraflumeError('INVALID_DATA', `Incremental mode "${String(mode)}" is unsupported.`);
    }
    if (update.rows.length > this.#normalized.maxBatchRows) {
      throw new GraflumeError(
        'INVALID_DATA',
        `Incremental batch has ${update.rows.length} rows; the deterministic limit is ${this.#normalized.maxBatchRows}.`,
      );
    }
    if (
      update.watermark !== undefined &&
      (!Number.isFinite(update.watermark) ||
        (this.#watermark !== null && update.watermark < this.#watermark))
    ) {
      throw new GraflumeError('INVALID_DATA', 'Streaming watermarks must be finite and monotonic.');
    }
    const incoming = update.rows.map(cloneRow);
    this.#assertUniqueKeys(incoming, '$.update.rows');
    const eventTime = this.#normalized.eventTime;
    const timestamps =
      eventTime === false
        ? []
        : incoming.map((row, index) =>
            eventTimestamp(
              ownValue(row, eventTime.field) as DataValue,
              `$.update.rows[${index}].${eventTime.field}`,
            ),
          );
    const latenessWatermark =
      update.watermark === undefined
        ? this.#watermark
        : Math.max(this.#watermark ?? Number.NEGATIVE_INFINITY, update.watermark);
    let nextWatermark = latenessWatermark;
    if (eventTime !== false && timestamps.length > 0) {
      const maximumTimestamp = timestamps.reduce(
        (maximum, value) => Math.max(maximum, value),
        Number.NEGATIVE_INFINITY,
      );
      nextWatermark = Math.max(
        nextWatermark ?? Number.NEGATIVE_INFINITY,
        maximumTimestamp - eventTime.allowedLatenessMs,
      );
    }
    if (update.watermark !== undefined) {
      nextWatermark = Math.max(nextWatermark ?? Number.NEGATIVE_INFINITY, update.watermark);
    }
    const accepted: DataRow[] = [];
    let droppedLateRows = 0;
    incoming.forEach((row, index) => {
      const late =
        latenessWatermark !== null &&
        timestamps[index] !== undefined &&
        timestamps[index]! < latenessWatermark;
      if (!late || eventTime === false || eventTime.lateData === 'accept') {
        accepted.push(row);
      } else if (eventTime.lateData === 'drop') {
        droppedLateRows += 1;
      } else {
        throw new GraflumeError(
          'INVALID_DATA',
          `Late event at row ${index} is behind watermark ${latenessWatermark}.`,
          { path: `$.update.rows[${index}].${eventTime.field}` },
        );
      }
    });
    const nextRows = this.#rows.values().map(cloneRow);
    const indexByKey = this.#keyIndex(nextRows, '$.data');
    let insertedRows = 0;
    let updatedRows = 0;
    for (const [incomingIndex, row] of accepted.entries()) {
      const key = stableKey(
        ownValue(row, this.#normalized.key) as DataValue,
        `$.update.rows[${incomingIndex}].${this.#normalized.key}`,
      );
      const existing = indexByKey.get(key);
      if (mode === 'append') {
        if (existing !== undefined) {
          throw new GraflumeError('INVALID_DATA', `Append would duplicate stable key "${key}".`);
        }
        indexByKey.set(key, nextRows.length);
        nextRows.push(row);
        insertedRows += 1;
      } else if (mode === 'upsert') {
        if (existing === undefined) {
          indexByKey.set(key, nextRows.length);
          nextRows.push(row);
          insertedRows += 1;
        } else {
          nextRows[existing] = { ...nextRows[existing], ...row };
          updatedRows += 1;
        }
      } else {
        const lastIndex = nextRows.length - 1;
        if (existing === lastIndex && lastIndex >= 0) {
          nextRows[lastIndex] = { ...nextRows[lastIndex], ...row };
          updatedRows += 1;
        } else if (existing === undefined) {
          indexByKey.set(key, nextRows.length);
          nextRows.push(row);
          insertedRows += 1;
        } else {
          throw new GraflumeError(
            'INVALID_DATA',
            `replaceLast key "${key}" exists before the final row; use upsert explicitly.`,
          );
        }
      }
    }
    let retained = nextRows;
    const timeRetention = this.#normalized.timeRetention;
    if (timeRetention !== false && nextWatermark !== null) {
      const threshold = nextWatermark - timeRetention.durationMs;
      retained = retained.filter(
        (row) =>
          eventTimestamp(
            ownValue(row, timeRetention.field) as DataValue,
            `$.data.${timeRetention.field}`,
          ) >= threshold,
      );
    }
    if (retained.length > this.#normalized.retentionRows) {
      retained = retained.slice(-this.#normalized.retentionRows);
    }
    const evictedRows = nextRows.length - retained.length;
    this.#rows.replace(retained);
    this.#watermark = nextWatermark;
    this.#sequence += 1;
    this.#acceptedRows += accepted.length;
    this.#droppedLateRows += droppedLateRows;
    this.#evictedRows += evictedRows;
    const step: IncrementalProvenanceStep = {
      sequence: this.#sequence,
      mode,
      inputRows: incoming.length,
      acceptedRows: accepted.length,
      insertedRows,
      updatedRows,
      droppedLateRows,
      evictedRows,
      outputRows: retained.length,
      watermark: this.#watermark,
    };
    this.#provenance.push(step);
    if (this.#provenance.length > this.#normalized.maxReplayBatches) this.#provenance.shift();
    this.#acceptedReplay(update);
    return { rows: this.rows(), state: this.state(), step: { ...step } };
  }

  enqueue(update: IncrementalUpdate): Promise<IncrementalUpdateResult> {
    let snapshot: IncrementalUpdate;
    try {
      validateUpdateShape(update);
      snapshot = cloneUpdate(update);
    } catch (error) {
      return Promise.reject(error);
    }
    return new Promise((resolve, reject) => {
      const over = (): boolean =>
        this.#queue.length >= this.#normalized.maxQueueBatches ||
        this.#queuedRows + snapshot.rows.length > this.#normalized.maxQueueRows;
      if (over() && this.#normalized.overflow === 'coalesce') {
        const target = this.#queue.at(-1);
        if (target !== undefined && this.#coalesceQueued(target, snapshot)) {
          target.subscribers.push({ resolve, reject });
          this.#queueCoalescedBatches += 1;
          return;
        }
      }
      if (over() && this.#normalized.overflow === 'drop-oldest') {
        while (over() && this.#queue.length > 0) {
          const dropped = this.#queue.shift()!;
          this.#queuedRows -= dropped.update.rows.length;
          this.#queueDroppedBatches += 1;
          const error = new GraflumeError(
            'INVALID_DATA',
            'Incremental batch was dropped by explicit overflow policy.',
          );
          for (const subscriber of dropped.subscribers) subscriber.reject(error);
        }
      }
      if (over()) {
        reject(
          new GraflumeError(
            'INVALID_DATA',
            'Incremental queue backpressure limit reached; the batch was rejected without mutation.',
          ),
        );
        return;
      }
      this.#queue.push({ update: snapshot, subscribers: [{ resolve, reject }] });
      this.#queuedRows += snapshot.rows.length;
      if (!this.#draining) queueMicrotask(() => this.#drain());
    });
  }

  exportReplay(): IncrementalReplay {
    if (this.#replayTruncated) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Replay history exceeded its bounded contract; export a fresh snapshot before replay.',
      );
    }
    return {
      version: 1,
      options: cloneOptions(this.#options),
      initial: this.#initial.map(cloneRow),
      updates: this.#replay.map(cloneUpdate),
    };
  }

  static replay(replay: IncrementalReplay): IncrementalDataStore {
    const envelope = closedObject(replay, REPLAY_ENVELOPE_KEYS, '$.replay');
    if (replay.version !== 1) {
      throw new GraflumeError('INVALID_DATA', 'Incremental replay version is unsupported.');
    }
    if (!Array.isArray(envelope.initial) || !Array.isArray(envelope.updates)) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Incremental replay rows and updates must be arrays.',
        {
          path: '$.replay',
        },
      );
    }
    const store = new IncrementalDataStore(replay.initial, replay.options);
    for (const update of replay.updates) store.apply(update);
    return store;
  }

  #assertUniqueKeys(rows: readonly DataRow[], path: string): void {
    this.#keyIndex(rows, path);
  }

  #keyIndex(rows: readonly DataRow[], path: string): Map<string, number> {
    const index = new Map<string, number>();
    rows.forEach((row, rowIndex) => {
      const key = stableKey(
        ownValue(row, this.#normalized.key) as DataValue,
        `${path}[${rowIndex}].${this.#normalized.key}`,
      );
      if (index.has(key)) {
        throw new GraflumeError('INVALID_DATA', `Duplicate stable key "${key}".`, {
          path: `${path}[${rowIndex}].${this.#normalized.key}`,
        });
      }
      index.set(key, rowIndex);
    });
    return index;
  }

  #acceptedReplay(update: IncrementalUpdate): void {
    const copy = cloneUpdate(update);
    this.#replay.push(copy);
    this.#replayRows += copy.rows.length;
    while (
      this.#replay.length > this.#normalized.maxReplayBatches ||
      this.#replayRows > this.#normalized.maxReplayRows
    ) {
      const removed = this.#replay.shift();
      if (removed === undefined) break;
      this.#replayRows -= removed.rows.length;
      this.#replayTruncated = true;
    }
  }

  #drain(): void {
    if (this.#draining) return;
    this.#draining = true;
    const next = (): void => {
      const item = this.#queue.shift();
      if (item === undefined) {
        this.#draining = false;
        return;
      }
      this.#queuedRows -= item.update.rows.length;
      try {
        const result = this.apply(item.update);
        for (const subscriber of item.subscribers) subscriber.resolve(result);
      } catch (error) {
        for (const subscriber of item.subscribers) subscriber.reject(error);
      }
      queueMicrotask(next);
    };
    next();
  }

  #coalesceQueued(target: QueuedUpdate, incoming: IncrementalUpdate): boolean {
    const targetMode = target.update.mode ?? this.#normalized.mode;
    const incomingMode = incoming.mode ?? this.#normalized.mode;
    if (targetMode !== incomingMode) return false;
    let rows: readonly DataRow[];
    if (targetMode === 'append') {
      rows = [...target.update.rows, ...incoming.rows];
    } else {
      const byKey = new Map<string, DataRow>();
      for (const [index, row] of [...target.update.rows, ...incoming.rows].entries()) {
        byKey.set(
          stableKey(
            ownValue(row, this.#normalized.key) as DataValue,
            `$.update.rows[${index}].${this.#normalized.key}`,
          ),
          row,
        );
      }
      rows = [...byKey.values()];
    }
    if (rows.length > this.#normalized.maxQueueRows) return false;
    this.#queuedRows += rows.length - target.update.rows.length;
    const watermark = Math.max(
      target.update.watermark ?? Number.NEGATIVE_INFINITY,
      incoming.watermark ?? Number.NEGATIVE_INFINITY,
    );
    target.update = {
      mode: targetMode,
      rows: rows.map(cloneRow),
      ...(Number.isFinite(watermark) ? { watermark } : {}),
    };
    return true;
  }
}

export function createIncrementalDataStore(
  input: DataInput,
  options: StreamingSpec,
): IncrementalDataStore {
  return new IncrementalDataStore(input, options);
}

export function replayIncrementalData(replay: IncrementalReplay): IncrementalDataStore {
  return IncrementalDataStore.replay(replay);
}
