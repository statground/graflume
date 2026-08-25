import { GraflumeError } from '../core/errors.js';
import type { Scene } from '../scene/types.js';
import type {
  ColumnarData,
  DataInput,
  DataRow,
  JsonValue,
  StreamingSpec,
  TransformSpec,
  WorkerRuntimeSpec,
} from '../spec/types.js';
import {
  IncrementalDataStore,
  type IncrementalDataState,
  type IncrementalProvenanceStep,
  type IncrementalReplay,
  type IncrementalUpdate,
} from './incremental.js';
import { DataTable } from './table.js';
import {
  executePortableIncrementalStack,
  type PortableIncrementalStackRequest,
  type PortableIncrementalStackResult,
} from './incremental-transform.js';
import {
  executePortableBarVirtualization,
  type BarVirtualizationResult,
  type PortableBarVirtualizationRequest,
} from './bar-virtualization.js';
import {
  calculateTechnicalIndicatorIncremental,
  type TechnicalIndicatorIncrementalRequest,
  type TechnicalIndicatorIncrementalResult,
} from './technical-indicator-incremental.js';
import { executeTransforms, type TransformResult } from './transforms.js';

export const workerRuntimeProtocolVersion = 2 as const;

export type WorkerRuntimeOverflowPolicy = 'reject' | 'drop-oldest' | 'coalesce';

export type { WorkerRuntimeSpec } from '../spec/types.js';

export interface WorkerRuntimeFactory {
  create(
    moduleURL: string,
    options: { readonly type: 'module'; readonly name?: string },
  ): WorkerRuntimePort;
}

export interface WorkerRuntimePort {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  terminate?(): void;
}

export interface WorkerRuntimeScope {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
}

export type PortableWorkerData =
  | { readonly kind: 'rows'; readonly rows: readonly DataRow[] }
  | { readonly kind: 'columns'; readonly columns: ColumnarData }
  | {
      /** Arrow IPC is decoded by a named, runtime-injected adapter. */
      readonly kind: 'binary';
      readonly format: 'arrow-ipc' | 'graflume-columnar';
      readonly adapter: string;
      readonly buffer: ArrayBuffer;
      readonly rowCount: number;
      readonly schema?: JsonValue;
    };

export type WorkerTransformEngine =
  { readonly type: 'javascript' } | { readonly type: 'wasm'; readonly adapter: string };

export interface WorkerTransformOperation {
  readonly kind: 'transform';
  readonly data: PortableWorkerData;
  readonly transforms: readonly TransformSpec[];
  readonly engine?: WorkerTransformEngine;
}

export interface WorkerRenderOperation {
  readonly kind: 'render';
  readonly renderer: string;
  readonly canvas: OffscreenCanvas;
  readonly scene: Scene;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

export interface WorkerTechnicalIndicatorOperation {
  readonly kind: 'technical-indicator';
  readonly request: TechnicalIndicatorIncrementalRequest;
}

export interface WorkerIncrementalStackOperation {
  readonly kind: 'incremental-stack';
  readonly request: PortableIncrementalStackRequest;
}

export interface WorkerBarVirtualizationOperation {
  readonly kind: 'bar-virtualization';
  readonly request: PortableBarVirtualizationRequest;
}

export type WorkerStreamRetentionAction =
  | {
      readonly type: 'initialize';
      readonly data: PortableWorkerData;
      readonly streaming: StreamingSpec;
      readonly includeReplay?: boolean;
    }
  | {
      readonly type: 'restore';
      readonly replay: IncrementalReplay;
      readonly includeReplay?: boolean;
    }
  | {
      readonly type: 'update';
      readonly update: IncrementalUpdate;
      readonly includeReplay?: boolean;
    }
  | { readonly type: 'snapshot'; readonly includeReplay?: boolean }
  | { readonly type: 'close' };

/** Closed, structured-clone portable request for one stateful Worker-owned stream. */
export interface WorkerStreamRetentionRequest {
  readonly streamId: string;
  readonly action: WorkerStreamRetentionAction;
}

export interface WorkerStreamRetentionOperation {
  readonly kind: 'stream-retention';
  readonly request: WorkerStreamRetentionRequest;
}

export type WorkerRuntimeOperation =
  | WorkerTransformOperation
  | WorkerRenderOperation
  | WorkerTechnicalIndicatorOperation
  | WorkerIncrementalStackOperation
  | WorkerBarVirtualizationOperation
  | WorkerStreamRetentionOperation;

export interface WorkerRuntimeExecuteRequest {
  readonly protocol: 2;
  readonly type: 'graflume:worker-execute';
  readonly id: number;
  readonly operation: WorkerRuntimeOperation;
}

export interface WorkerRuntimeCancelRequest {
  readonly protocol: 2;
  readonly type: 'graflume:worker-cancel';
  readonly id: number;
}

export type WorkerRuntimeRequest = WorkerRuntimeExecuteRequest | WorkerRuntimeCancelRequest;

export interface WorkerRenderResult {
  readonly renderer: string;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

export interface WorkerStreamRetentionSnapshot {
  readonly version: 1;
  readonly streamId: string;
  readonly rows: readonly DataRow[];
  readonly state: IncrementalDataState;
  readonly replayStatus: 'omitted' | 'available' | 'truncated';
  readonly replay?: IncrementalReplay;
}

export type WorkerStreamRetentionResult =
  | {
      readonly action: 'initialize' | 'restore' | 'snapshot';
      readonly snapshot: WorkerStreamRetentionSnapshot;
    }
  | {
      readonly action: 'update';
      readonly snapshot: WorkerStreamRetentionSnapshot;
      readonly step: IncrementalProvenanceStep;
    }
  | { readonly action: 'close'; readonly streamId: string; readonly closed: true };

export type WorkerRuntimeResult =
  | { readonly kind: 'transform'; readonly result: TransformResult }
  | { readonly kind: 'render'; readonly result: WorkerRenderResult }
  | { readonly kind: 'technical-indicator'; readonly result: TechnicalIndicatorIncrementalResult }
  | { readonly kind: 'incremental-stack'; readonly result: PortableIncrementalStackResult }
  | { readonly kind: 'bar-virtualization'; readonly result: BarVirtualizationResult }
  | { readonly kind: 'stream-retention'; readonly result: WorkerStreamRetentionResult };

export interface WorkerRuntimeSuccess {
  readonly protocol: 2;
  readonly type: 'graflume:worker-result';
  readonly id: number;
  readonly ok: true;
  readonly result: WorkerRuntimeResult;
}

export interface WorkerRuntimeFailure {
  readonly protocol: 2;
  readonly type: 'graflume:worker-result';
  readonly id: number;
  readonly ok: false;
  readonly error: {
    readonly name: string;
    readonly message: string;
    readonly code?: string;
    readonly path?: string;
  };
}

export type WorkerRuntimeResponse = WorkerRuntimeSuccess | WorkerRuntimeFailure;

export interface WorkerBinaryAdapter {
  readonly id: string;
  readonly formats: readonly ('arrow-ipc' | 'graflume-columnar')[];
  decode(
    data: Extract<PortableWorkerData, { readonly kind: 'binary' }>,
    signal: AbortSignal,
  ): DataInput | Promise<DataInput>;
}

export interface WorkerWasmTransformAdapter {
  readonly id: string;
  execute(
    data: DataInput,
    transforms: readonly TransformSpec[],
    signal: AbortSignal,
  ): TransformResult | Promise<TransformResult>;
}

export interface WorkerOwnedRenderer {
  readonly id: string;
  render(
    scene: Scene,
    canvas: OffscreenCanvas,
    viewport: { readonly width: number; readonly height: number; readonly pixelRatio: number },
    signal: AbortSignal,
  ): void | Promise<void>;
}

export interface WorkerRuntimeInstallOptions {
  readonly maxInputRows?: number;
  readonly maxBinaryBytes?: number;
  readonly maxTransforms?: number;
  readonly maxStreamingSessions?: number;
  readonly maxStreamingReplayBatches?: number;
  readonly maxStreamingReplayRows?: number;
  readonly binaryAdapters?: readonly WorkerBinaryAdapter[];
  readonly wasmAdapters?: readonly WorkerWasmTransformAdapter[];
  readonly renderers?: readonly WorkerOwnedRenderer[];
}

export interface WorkerRuntimeExecuteOptions {
  readonly signal?: AbortSignal;
  readonly coalesceKey?: string;
  /** Transfer caller-owned typed/binary buffers. Defaults to false. */
  readonly transferOwnership?: boolean;
}

export interface WorkerRuntimeState {
  readonly protocol: 2;
  readonly queuedBatches: number;
  readonly queuedRows: number;
  readonly inFlight: boolean;
  readonly completed: number;
  readonly rejected: number;
  readonly dropped: number;
  readonly coalesced: number;
  readonly cancelled: number;
  readonly closed: boolean;
}

interface NormalizedWorkerRuntimeSpec {
  readonly moduleURL: string;
  readonly name?: string;
  readonly maxQueueBatches: number;
  readonly maxQueueRows: number;
  readonly maxInputRows: number;
  readonly maxBinaryBytes: number;
  readonly maxTransforms: number;
  readonly overflow: WorkerRuntimeOverflowPolicy;
  readonly engine?: WorkerTransformEngine;
}

interface PendingSubscriber {
  readonly resolve: (result: WorkerRuntimeResult) => void;
  readonly reject: (error: unknown) => void;
  readonly signal?: AbortSignal;
  abort?: () => void;
}

interface PendingOperation {
  request: WorkerRuntimeExecuteRequest;
  rows: number;
  transfer: Transferable[];
  readonly coalesceKey?: string;
  readonly subscribers: PendingSubscriber[];
}

const identifierPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/;

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

function validateIdentifier(value: string, path: string): string {
  if (typeof value !== 'string' || !identifierPattern.test(value)) {
    throw new GraflumeError('INVALID_SPEC', `${path} is not a portable adapter identifier.`, {
      path,
    });
  }
  return value;
}

function normalizeSpec(spec: WorkerRuntimeSpec): NormalizedWorkerRuntimeSpec {
  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new GraflumeError('INVALID_SPEC', '$.worker must be an object.');
  }
  const allowed = new Set([
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
  const unknown = Object.keys(spec).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    throw new GraflumeError('INVALID_SPEC', `Unknown worker property "${unknown}".`, {
      path: `$.worker.${unknown}`,
    });
  }
  if (
    typeof spec.moduleURL !== 'string' ||
    spec.moduleURL.trim() === '' ||
    spec.moduleURL.length > 2_048
  ) {
    throw new GraflumeError(
      'INVALID_SPEC',
      '$.worker.moduleURL must be a bounded non-empty URL string.',
    );
  }
  if (spec.name !== undefined) validateIdentifier(spec.name, '$.worker.name');
  if (
    spec.overflow !== undefined &&
    !['reject', 'drop-oldest', 'coalesce'].includes(spec.overflow)
  ) {
    throw new GraflumeError('INVALID_SPEC', '$.worker.overflow is unsupported.');
  }
  if (spec.engine !== undefined) {
    if (spec.engine === null || typeof spec.engine !== 'object' || Array.isArray(spec.engine)) {
      throw new GraflumeError('INVALID_SPEC', '$.worker.engine must be an object.');
    }
    const engineUnknown = Object.keys(spec.engine).find(
      (key) => !['type', 'adapter'].includes(key),
    );
    if (engineUnknown !== undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Unknown worker engine property "${engineUnknown}".`,
        { path: `$.worker.engine.${engineUnknown}` },
      );
    }
    if (spec.engine.type === 'wasm')
      validateIdentifier(spec.engine.adapter, '$.worker.engine.adapter');
    else if (spec.engine.type !== 'javascript' || 'adapter' in spec.engine) {
      throw new GraflumeError(
        'INVALID_SPEC',
        '$.worker.engine must be {type:"javascript"} or {type:"wasm",adapter}.',
      );
    }
  }
  const maxInputRows = boundedInteger(
    spec.maxInputRows,
    100_000,
    1_000_000,
    '$.worker.maxInputRows',
  );
  return {
    moduleURL: spec.moduleURL,
    ...(spec.name === undefined ? {} : { name: spec.name }),
    maxQueueBatches: boundedInteger(spec.maxQueueBatches, 8, 1_024, '$.worker.maxQueueBatches'),
    maxQueueRows: boundedInteger(
      spec.maxQueueRows,
      maxInputRows,
      1_000_000,
      '$.worker.maxQueueRows',
    ),
    maxInputRows,
    maxBinaryBytes: boundedInteger(
      spec.maxBinaryBytes,
      64 * 1024 * 1024,
      256 * 1024 * 1024,
      '$.worker.maxBinaryBytes',
    ),
    maxTransforms: boundedInteger(spec.maxTransforms, 128, 128, '$.worker.maxTransforms'),
    overflow: spec.overflow ?? 'reject',
    ...(spec.engine === undefined ? {} : { engine: { ...spec.engine } }),
  };
}

function runtimeRows(data: PortableWorkerData): number {
  if (data === null || typeof data !== 'object') {
    throw new GraflumeError('INVALID_DATA', 'Worker data envelope must be an object.');
  }
  if (data.kind === 'rows') {
    if (!Array.isArray(data.rows)) {
      throw new GraflumeError('INVALID_DATA', 'Worker row data must be an array.');
    }
    return data.rows.length;
  }
  if (data.kind === 'binary') {
    if (!Number.isInteger(data.rowCount) || data.rowCount < 0) {
      throw new GraflumeError('INVALID_DATA', 'Worker binary rowCount must be non-negative.');
    }
    return data.rowCount;
  }
  if (data.kind === 'columns') return DataTable.from(data.columns).length;
  throw new GraflumeError('INVALID_DATA', 'Worker data envelope kind is unsupported.');
}

function dataEnvelope(input: DataInput): PortableWorkerData {
  return Array.isArray(input)
    ? { kind: 'rows', rows: input }
    : { kind: 'columns', columns: input as ColumnarData };
}

function indicatorRequestRows(request: TechnicalIndicatorIncrementalRequest): number {
  const lengths = [
    request.append.value?.length,
    request.append.open?.length,
    request.append.high?.length,
    request.append.low?.length,
    request.append.close?.length,
    request.append.volume?.length,
    request.append.session?.length,
    request.append.time?.length,
  ].filter((length): length is number => length !== undefined);
  const appended = lengths[0] ?? 0;
  if (lengths.some((length) => length !== appended)) {
    throw new GraflumeError(
      'INVALID_DATA',
      'Worker technical-indicator append channels must have equal lengths.',
    );
  }
  return (request.previous?.length ?? 0) + appended;
}

function incrementalStackRequestRows(request: PortableIncrementalStackRequest): number {
  // Both snapshots describe one bounded logical dataset. Queue accounting uses
  // the larger retained view rather than double-counting unchanged identities.
  return Math.max(request.input.length, request.previous?.input.length ?? 0);
}

function barVirtualizationRequestRows(request: PortableBarVirtualizationRequest): number {
  const incoming =
    request.action.type === 'replace' ||
    request.action.type === 'append' ||
    request.action.type === 'upsert'
      ? request.action.rows.length
      : 0;
  return Math.max(request.previous?.retained.length ?? 0, incoming);
}

function closedRuntimeObject(
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be an object.`, { path });
  }
  const record = value as Readonly<Record<string, unknown>>;
  const unknown = Object.keys(record).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    throw new GraflumeError('INVALID_DATA', `Unknown ${path} property "${unknown}".`, {
      path: `${path}.${unknown}`,
    });
  }
  return record;
}

function includeReplayValue(value: unknown): boolean {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new GraflumeError('INVALID_DATA', 'includeReplay must be boolean.', {
      path: '$.operation.request.action.includeReplay',
    });
  }
  return value === true;
}

function validateStreamRetentionRequest(request: WorkerStreamRetentionRequest): number {
  const envelope = closedRuntimeObject(
    request,
    new Set(['streamId', 'action']),
    '$.operation.request',
  );
  validateIdentifier(envelope.streamId as string, '$.operation.request.streamId');
  const action = closedRuntimeObject(
    envelope.action,
    new Set(['type', 'data', 'streaming', 'replay', 'update', 'includeReplay']),
    '$.operation.request.action',
  );
  const actionType = action.type;
  if (actionType === 'initialize') {
    closedRuntimeObject(
      action,
      new Set(['type', 'data', 'streaming', 'includeReplay']),
      '$.operation.request.action',
    );
    includeReplayValue(action.includeReplay);
    if (action.streaming === null || typeof action.streaming !== 'object') {
      throw new GraflumeError('INVALID_DATA', 'Worker streaming contract must be an object.');
    }
    return runtimeRows(action.data as PortableWorkerData);
  }
  if (actionType === 'restore') {
    closedRuntimeObject(
      action,
      new Set(['type', 'replay', 'includeReplay']),
      '$.operation.request.action',
    );
    includeReplayValue(action.includeReplay);
    const replay = closedRuntimeObject(
      action.replay,
      new Set(['version', 'options', 'initial', 'updates']),
      '$.operation.request.action.replay',
    );
    if (!Array.isArray(replay.initial) || !Array.isArray(replay.updates)) {
      throw new GraflumeError('INVALID_DATA', 'Worker stream replay arrays are required.');
    }
    return (
      replay.initial.length +
      replay.updates.reduce((total, update, index) => {
        const item = closedRuntimeObject(
          update,
          new Set(['mode', 'rows', 'watermark']),
          `$.operation.request.action.replay.updates[${index}]`,
        );
        if (!Array.isArray(item.rows)) {
          throw new GraflumeError('INVALID_DATA', 'Worker stream replay rows must be arrays.');
        }
        return total + item.rows.length;
      }, 0)
    );
  }
  if (actionType === 'update') {
    closedRuntimeObject(
      action,
      new Set(['type', 'update', 'includeReplay']),
      '$.operation.request.action',
    );
    includeReplayValue(action.includeReplay);
    const update = closedRuntimeObject(
      action.update,
      new Set(['mode', 'rows', 'watermark']),
      '$.operation.request.action.update',
    );
    if (!Array.isArray(update.rows)) {
      throw new GraflumeError('INVALID_DATA', 'Worker stream update rows must be an array.');
    }
    return update.rows.length;
  }
  if (actionType === 'snapshot') {
    closedRuntimeObject(action, new Set(['type', 'includeReplay']), '$.operation.request.action');
    includeReplayValue(action.includeReplay);
    return 0;
  }
  if (actionType === 'close') {
    closedRuntimeObject(action, new Set(['type']), '$.operation.request.action');
    return 0;
  }
  throw new GraflumeError('INVALID_DATA', 'Worker stream retention action is unsupported.', {
    path: '$.operation.request.action.type',
  });
}

function streamRetentionData(
  operation: WorkerStreamRetentionOperation,
): PortableWorkerData | undefined {
  return operation.request.action.type === 'initialize' ? operation.request.action.data : undefined;
}

function transferables(
  data: PortableWorkerData,
  operation?: WorkerRenderOperation,
): Transferable[] {
  const output = new Set<Transferable>();
  if (data.kind === 'binary') output.add(data.buffer);
  if (data.kind === 'columns') {
    for (const column of Object.values(data.columns.columns)) {
      if (ArrayBuffer.isView(column) && column.buffer instanceof ArrayBuffer)
        output.add(column.buffer);
    }
  }
  if (
    operation !== undefined &&
    typeof OffscreenCanvas === 'function' &&
    operation.canvas instanceof OffscreenCanvas
  ) {
    output.add(operation.canvas);
  }
  return [...output];
}

function snapshotOperation(
  operation: WorkerRuntimeOperation,
  transferOwnership: boolean,
): { readonly operation: WorkerRuntimeOperation; readonly transfer: Transferable[] } {
  const sourceTransfers =
    operation.kind === 'transform'
      ? transferables(operation.data)
      : operation.kind === 'render'
        ? transferables({ kind: 'rows', rows: [] }, operation)
        : operation.kind === 'stream-retention'
          ? (() => {
              const data = streamRetentionData(operation);
              return data === undefined ? [] : transferables(data);
            })()
          : [];
  try {
    const transfer = operation.kind === 'render' || transferOwnership;
    const snapshot = structuredClone(
      operation,
      transfer && sourceTransfers.length > 0 ? { transfer: sourceTransfers } : undefined,
    ) as WorkerRuntimeOperation;
    return {
      operation: snapshot,
      transfer:
        operation.kind === 'render' || transferOwnership
          ? snapshot.kind === 'render'
            ? transferables({ kind: 'rows', rows: [] }, snapshot)
            : snapshot.kind === 'transform'
              ? transferables(snapshot.data)
              : snapshot.kind === 'stream-retention'
                ? (() => {
                    const data = streamRetentionData(snapshot);
                    return data === undefined ? [] : transferables(data);
                  })()
                : []
          : [],
    };
  } catch (error) {
    throw new GraflumeError(
      'INVALID_DATA',
      'Worker operations must be structured-clone portable; functions are unsupported.',
      { cause: error },
    );
  }
}

function abortedError(): DOMException {
  return new DOMException('The Worker operation was cancelled.', 'AbortError');
}

function droppedError(): GraflumeError {
  return new GraflumeError(
    'INVALID_DATA',
    'Worker request was dropped by explicit overflow policy.',
  );
}

function response(value: unknown): value is WorkerRuntimeResponse {
  if (value === null || typeof value !== 'object') return false;
  const item = value as Partial<WorkerRuntimeResponse>;
  return (
    item.protocol === workerRuntimeProtocolVersion &&
    item.type === 'graflume:worker-result' &&
    typeof item.id === 'number' &&
    typeof item.ok === 'boolean'
  );
}

function request(value: unknown): value is WorkerRuntimeRequest {
  if (value === null || typeof value !== 'object') return false;
  const item = value as Partial<WorkerRuntimeRequest>;
  return (
    item.protocol === workerRuntimeProtocolVersion &&
    typeof item.id === 'number' &&
    (item.type === 'graflume:worker-execute' || item.type === 'graflume:worker-cancel')
  );
}

function serializedError(error: unknown): WorkerRuntimeFailure['error'] {
  if (error instanceof GraflumeError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      ...(error.path === undefined ? {} : { path: error.path }),
    };
  }
  return {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
  };
}

function defaultWorkerFactory(): WorkerRuntimeFactory {
  return {
    create(moduleURL, options) {
      if (typeof Worker !== 'function') {
        throw new GraflumeError(
          'UNSUPPORTED_RENDERER',
          'This environment does not expose Worker; inject a WorkerRuntimeFactory.',
        );
      }
      return new Worker(moduleURL, options);
    },
  };
}

/** Client with automatic module Worker construction, cancellation and explicit overflow. */
export class AutomaticWorkerRuntime {
  readonly #port: WorkerRuntimePort;
  readonly #spec: NormalizedWorkerRuntimeSpec;
  #queue: PendingOperation[] = [];
  #queuedRows = 0;
  #active: PendingOperation | null = null;
  #nextId = 1;
  #completed = 0;
  #rejected = 0;
  #dropped = 0;
  #coalesced = 0;
  #cancelled = 0;
  #closed = false;

  readonly #listener = (event: MessageEvent<unknown>): void => {
    if (!response(event.data) || this.#active === null) return;
    if (event.data.id !== this.#active.request.id) return;
    const active = this.#active;
    this.#active = null;
    if (event.data.ok) {
      this.#completed += 1;
      this.#settle(active, 'resolve', event.data.result);
    } else {
      this.#rejected += active.subscribers.length;
      this.#settle(
        active,
        'reject',
        event.data.error.name === 'AbortError'
          ? abortedError()
          : new GraflumeError('INVALID_DATA', event.data.error.message, {
              ...(event.data.error.path === undefined ? {} : { path: event.data.error.path }),
              details: { workerCode: event.data.error.code ?? event.data.error.name },
            }),
      );
    }
    this.#dispatch();
  };

  constructor(spec: WorkerRuntimeSpec, factory: WorkerRuntimeFactory = defaultWorkerFactory()) {
    this.#spec = normalizeSpec(spec);
    this.#port = factory.create(this.#spec.moduleURL, {
      type: 'module',
      ...(this.#spec.name === undefined ? {} : { name: this.#spec.name }),
    });
    this.#port.addEventListener('message', this.#listener);
  }

  transform(
    input: DataInput,
    transforms: readonly TransformSpec[],
    options: WorkerRuntimeExecuteOptions = {},
  ): Promise<TransformResult> {
    return this.execute(
      {
        kind: 'transform',
        data: dataEnvelope(input),
        transforms,
        ...(this.#spec.engine === undefined ? {} : { engine: this.#spec.engine }),
      },
      options,
    ).then((result) => {
      if (result.kind !== 'transform')
        throw new GraflumeError('INVALID_DATA', 'Worker result kind mismatch.');
      return result.result;
    });
  }

  technicalIndicator(
    request: TechnicalIndicatorIncrementalRequest,
    options: WorkerRuntimeExecuteOptions = {},
  ): Promise<TechnicalIndicatorIncrementalResult> {
    return this.execute({ kind: 'technical-indicator', request }, options).then((result) => {
      if (result.kind !== 'technical-indicator') {
        throw new GraflumeError('INVALID_DATA', 'Worker result kind mismatch.');
      }
      return result.result;
    });
  }

  incrementalStack(
    request: PortableIncrementalStackRequest,
    options: WorkerRuntimeExecuteOptions = {},
  ): Promise<PortableIncrementalStackResult> {
    return this.execute({ kind: 'incremental-stack', request }, options).then((result) => {
      if (result.kind !== 'incremental-stack') {
        throw new GraflumeError('INVALID_DATA', 'Worker result kind mismatch.');
      }
      return result.result;
    });
  }

  barVirtualization(
    request: PortableBarVirtualizationRequest,
    options: WorkerRuntimeExecuteOptions = {},
  ): Promise<BarVirtualizationResult> {
    return this.execute({ kind: 'bar-virtualization', request }, options).then((result) => {
      if (result.kind !== 'bar-virtualization') {
        throw new GraflumeError('INVALID_DATA', 'Worker result kind mismatch.');
      }
      return result.result;
    });
  }

  /** Executes one mutation or snapshot against a Worker-owned bounded streaming session. */
  streamRetention(
    request: WorkerStreamRetentionRequest,
    options: WorkerRuntimeExecuteOptions = {},
  ): Promise<WorkerStreamRetentionResult> {
    return this.execute({ kind: 'stream-retention', request }, options).then((result) => {
      if (result.kind !== 'stream-retention') {
        throw new GraflumeError('INVALID_DATA', 'Worker result kind mismatch.');
      }
      return result.result;
    });
  }

  transformBinary(
    data: Extract<PortableWorkerData, { readonly kind: 'binary' }>,
    transforms: readonly TransformSpec[],
    engine: WorkerTransformEngine | undefined = this.#spec.engine,
    options: WorkerRuntimeExecuteOptions = {},
  ): Promise<TransformResult> {
    return this.execute(
      {
        kind: 'transform',
        data,
        transforms,
        ...(engine === undefined ? {} : { engine }),
      },
      options,
    ).then((result) => {
      if (result.kind !== 'transform')
        throw new GraflumeError('INVALID_DATA', 'Worker result kind mismatch.');
      return result.result;
    });
  }

  render(
    operation: Omit<WorkerRenderOperation, 'kind'>,
    options: WorkerRuntimeExecuteOptions = {},
  ): Promise<WorkerRenderResult> {
    return this.execute({ kind: 'render', ...operation }, options).then((result) => {
      if (result.kind !== 'render')
        throw new GraflumeError('INVALID_DATA', 'Worker result kind mismatch.');
      return result.result;
    });
  }

  execute(
    operation: WorkerRuntimeOperation,
    options: WorkerRuntimeExecuteOptions = {},
  ): Promise<WorkerRuntimeResult> {
    if (this.#closed)
      return Promise.reject(new GraflumeError('INVALID_DATA', 'Worker runtime is closed.'));
    if (options.signal?.aborted === true) return Promise.reject(abortedError());
    let snapshot: ReturnType<typeof snapshotOperation>;
    let rows = 0;
    try {
      if (options.coalesceKey !== undefined)
        validateIdentifier(options.coalesceKey, '$.worker.coalesceKey');
      if (operation.kind === 'transform') {
        rows = runtimeRows(operation.data);
        if (rows > this.#spec.maxInputRows) {
          throw new GraflumeError(
            'INVALID_DATA',
            `Worker input has ${rows} rows; the deterministic limit is ${this.#spec.maxInputRows}.`,
          );
        }
        if (operation.transforms.length > this.#spec.maxTransforms) {
          throw new GraflumeError(
            'INVALID_DATA',
            `Worker request has ${operation.transforms.length} transforms; the deterministic limit is ${this.#spec.maxTransforms}.`,
          );
        }
        if (
          operation.data.kind === 'binary' &&
          operation.data.buffer.byteLength > this.#spec.maxBinaryBytes
        ) {
          throw new GraflumeError('INVALID_DATA', 'Worker binary input exceeds the byte budget.');
        }
      } else if (operation.kind === 'render') {
        if (![operation.width, operation.height, operation.pixelRatio].every(Number.isFinite)) {
          throw new GraflumeError('INVALID_DATA', 'Worker render viewport must be finite.');
        }
      } else if (operation.kind === 'technical-indicator') {
        rows = indicatorRequestRows(operation.request);
        if (rows > this.#spec.maxInputRows) {
          throw new GraflumeError(
            'INVALID_DATA',
            `Worker technical-indicator state has ${rows} rows; the deterministic limit is ${this.#spec.maxInputRows}.`,
          );
        }
      } else if (operation.kind === 'incremental-stack') {
        rows = incrementalStackRequestRows(operation.request);
        if (rows > this.#spec.maxInputRows) {
          throw new GraflumeError(
            'INVALID_DATA',
            `Worker incremental-stack state has ${rows} rows; the deterministic limit is ${this.#spec.maxInputRows}.`,
          );
        }
      } else if (operation.kind === 'bar-virtualization') {
        rows = barVirtualizationRequestRows(operation.request);
        if (rows > this.#spec.maxInputRows) {
          throw new GraflumeError(
            'INVALID_DATA',
            `Worker bar-virtualization state has ${rows} rows; the deterministic limit is ${this.#spec.maxInputRows}.`,
          );
        }
      } else {
        rows = validateStreamRetentionRequest(operation.request);
        if (rows > this.#spec.maxInputRows) {
          throw new GraflumeError(
            'INVALID_DATA',
            `Worker stream-retention request has ${rows} rows; the deterministic limit is ${this.#spec.maxInputRows}.`,
          );
        }
      }
      snapshot = snapshotOperation(operation, options.transferOwnership === true);
    } catch (error) {
      this.#rejected += 1;
      return Promise.reject(error);
    }
    const pending: Omit<PendingOperation, 'subscribers'> = {
      request: {
        protocol: workerRuntimeProtocolVersion,
        type: 'graflume:worker-execute',
        id: this.#nextId,
        operation: snapshot.operation,
      },
      rows,
      transfer: snapshot.transfer,
      ...(options.coalesceKey === undefined ? {} : { coalesceKey: options.coalesceKey }),
    };
    this.#nextId += 1;
    return new Promise((resolve, reject) => {
      const subscriber: PendingSubscriber = {
        resolve,
        reject,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      };
      if (options.signal !== undefined) {
        subscriber.abort = () => this.#cancelSubscriber(subscriber);
        options.signal.addEventListener('abort', subscriber.abort, { once: true });
      }
      if (!this.#admit({ ...pending, subscribers: [subscriber] })) return;
      this.#dispatch();
    });
  }

  state(): WorkerRuntimeState {
    return {
      protocol: workerRuntimeProtocolVersion,
      queuedBatches: this.#queue.length,
      queuedRows: this.#queuedRows,
      inFlight: this.#active !== null,
      completed: this.#completed,
      rejected: this.#rejected,
      dropped: this.#dropped,
      coalesced: this.#coalesced,
      cancelled: this.#cancelled,
      closed: this.#closed,
    };
  }

  close(options: { readonly terminate?: boolean } = {}): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#port.removeEventListener('message', this.#listener);
    const error = new GraflumeError('INVALID_DATA', 'Worker runtime closed.');
    const rejected =
      (this.#active?.subscribers.length ?? 0) +
      this.#queue.reduce((count, pending) => count + pending.subscribers.length, 0);
    if (this.#active !== null) {
      this.#port.postMessage({
        protocol: workerRuntimeProtocolVersion,
        type: 'graflume:worker-cancel',
        id: this.#active.request.id,
      } satisfies WorkerRuntimeCancelRequest);
      this.#settle(this.#active, 'reject', error);
    }
    for (const pending of this.#queue) this.#settle(pending, 'reject', error);
    this.#rejected += rejected;
    this.#active = null;
    this.#queue = [];
    this.#queuedRows = 0;
    if (options.terminate === true) this.#port.terminate?.();
  }

  #admit(pending: PendingOperation): boolean {
    const over = () =>
      this.#queue.length + (this.#active === null ? 0 : 1) >= this.#spec.maxQueueBatches ||
      this.#queuedRows + (this.#active?.rows ?? 0) + pending.rows > this.#spec.maxQueueRows;
    if (over() && this.#spec.overflow === 'coalesce' && pending.coalesceKey !== undefined) {
      const existing = [...this.#queue]
        .reverse()
        .find(({ coalesceKey }) => coalesceKey === pending.coalesceKey);
      if (existing !== undefined) {
        const nextQueuedRows = this.#queuedRows - existing.rows + pending.rows;
        if (nextQueuedRows + (this.#active?.rows ?? 0) > this.#spec.maxQueueRows) {
          this.#rejected += 1;
          this.#settle(
            pending,
            'reject',
            new GraflumeError('INVALID_DATA', 'Worker coalesced request exceeds the row budget.'),
          );
          return false;
        }
        this.#queuedRows += pending.rows - existing.rows;
        existing.request = pending.request;
        existing.rows = pending.rows;
        existing.transfer = pending.transfer;
        existing.subscribers.push(...pending.subscribers);
        this.#coalesced += 1;
        return true;
      }
    }
    if (over() && this.#spec.overflow === 'drop-oldest') {
      while (over() && this.#queue.length > 0) {
        const dropped = this.#queue.shift()!;
        this.#queuedRows -= dropped.rows;
        this.#dropped += 1;
        this.#settle(dropped, 'reject', droppedError());
      }
    }
    if (over()) {
      this.#rejected += 1;
      this.#settle(
        pending,
        'reject',
        new GraflumeError('INVALID_DATA', 'Worker queue backpressure limit reached.'),
      );
      return false;
    }
    this.#queue.push(pending);
    this.#queuedRows += pending.rows;
    return true;
  }

  #dispatch(): void {
    if (this.#closed || this.#active !== null) return;
    const pending = this.#queue.shift();
    if (pending === undefined) return;
    this.#queuedRows -= pending.rows;
    this.#active = pending;
    try {
      this.#port.postMessage(pending.request, pending.transfer);
    } catch (error) {
      this.#active = null;
      this.#rejected += pending.subscribers.length;
      this.#settle(pending, 'reject', error);
      this.#dispatch();
    }
  }

  #cancelSubscriber(subscriber: PendingSubscriber): void {
    const queued = this.#queue.find((pending) => pending.subscribers.includes(subscriber));
    if (queued !== undefined) {
      queued.subscribers.splice(queued.subscribers.indexOf(subscriber), 1);
      subscriber.signal?.removeEventListener('abort', subscriber.abort!);
      subscriber.reject(abortedError());
      this.#cancelled += 1;
      if (queued.subscribers.length === 0) {
        this.#queue = this.#queue.filter((pending) => pending !== queued);
        this.#queuedRows -= queued.rows;
      }
      return;
    }
    if (this.#active?.subscribers.includes(subscriber) === true) {
      const active = this.#active;
      // One operation may have coalesced subscribers. Cancel the worker only
      // after all consumers have cancelled.
      active.subscribers.splice(active.subscribers.indexOf(subscriber), 1);
      subscriber.signal?.removeEventListener('abort', subscriber.abort!);
      subscriber.reject(abortedError());
      this.#cancelled += 1;
      if (active.subscribers.length === 0) {
        this.#port.postMessage({
          protocol: workerRuntimeProtocolVersion,
          type: 'graflume:worker-cancel',
          id: active.request.id,
        } satisfies WorkerRuntimeCancelRequest);
        this.#active = null;
        this.#dispatch();
      }
    }
  }

  #settle(
    pending: PendingOperation,
    action: 'resolve' | 'reject',
    value: WorkerRuntimeResult | unknown,
  ): void {
    for (const subscriber of pending.subscribers) {
      if (subscriber.abort !== undefined)
        subscriber.signal?.removeEventListener('abort', subscriber.abort);
      if (action === 'resolve') subscriber.resolve(value as WorkerRuntimeResult);
      else subscriber.reject(value);
    }
    pending.subscribers.splice(0);
  }
}

export function createAutomaticWorkerRuntime(
  spec: WorkerRuntimeSpec,
  factory?: WorkerRuntimeFactory,
): AutomaticWorkerRuntime {
  return new AutomaticWorkerRuntime(spec, factory);
}

/** Installs protocol v2 inside a WorkerGlobalScope-compatible injected scope. */
export function installWorkerRuntime(
  scope: WorkerRuntimeScope,
  options: WorkerRuntimeInstallOptions = {},
): () => void {
  const maxInputRows = boundedInteger(
    options.maxInputRows,
    100_000,
    1_000_000,
    '$.worker.maxInputRows',
  );
  const maxBinaryBytes = boundedInteger(
    options.maxBinaryBytes,
    64 * 1024 * 1024,
    256 * 1024 * 1024,
    '$.worker.maxBinaryBytes',
  );
  const maxTransforms = boundedInteger(options.maxTransforms, 128, 128, '$.worker.maxTransforms');
  const maxStreamingSessions = boundedInteger(
    options.maxStreamingSessions,
    64,
    1_024,
    '$.worker.maxStreamingSessions',
  );
  const maxStreamingReplayBatches = boundedInteger(
    options.maxStreamingReplayBatches,
    256,
    4_096,
    '$.worker.maxStreamingReplayBatches',
  );
  const maxStreamingReplayRows = boundedInteger(
    options.maxStreamingReplayRows,
    maxInputRows,
    1_000_000,
    '$.worker.maxStreamingReplayRows',
  );
  const binaries = new Map(
    (options.binaryAdapters ?? []).map((adapter) => [
      validateIdentifier(adapter.id, '$.worker.binaryAdapter.id'),
      adapter,
    ]),
  );
  const wasm = new Map(
    (options.wasmAdapters ?? []).map((adapter) => [
      validateIdentifier(adapter.id, '$.worker.wasmAdapter.id'),
      adapter,
    ]),
  );
  const renderers = new Map(
    (options.renderers ?? []).map((renderer) => [
      validateIdentifier(renderer.id, '$.worker.renderer.id'),
      renderer,
    ]),
  );
  const active = new Map<number, AbortController>();
  const streams = new Map<string, IncrementalDataStore>();

  const decodeData = async (data: PortableWorkerData, signal: AbortSignal): Promise<DataInput> => {
    let input: DataInput;
    if (data.kind === 'rows') input = data.rows;
    else if (data.kind === 'columns') input = data.columns;
    else {
      if (data.buffer.byteLength > maxBinaryBytes) {
        throw new GraflumeError('INVALID_DATA', 'Worker binary input exceeds the byte budget.');
      }
      const adapter = binaries.get(data.adapter);
      if (adapter === undefined) {
        throw new GraflumeError(
          'INVALID_DATA',
          `Binary adapter "${data.adapter}" is not registered.`,
        );
      }
      if (!(adapter.formats as readonly string[]).includes(data.format)) {
        throw new GraflumeError('INVALID_DATA', 'Binary adapter does not accept this format.');
      }
      input = await adapter.decode(data, signal);
    }
    if (signal.aborted) throw abortedError();
    if (DataTable.from(input).length > maxInputRows) {
      throw new GraflumeError('INVALID_DATA', 'Decoded Worker input exceeds the row budget.');
    }
    return input;
  };

  const assertStreamContractBudget = (streaming: StreamingSpec): void => {
    const maxRows = streaming.retention?.maxRows ?? 100_000;
    if (typeof maxRows === 'number' && maxRows > maxInputRows) {
      throw new GraflumeError(
        'INVALID_DATA',
        `Worker stream retention maxRows exceeds the installed ${maxInputRows}-row budget.`,
        { path: '$.streaming.retention.maxRows' },
      );
    }
  };

  const streamSnapshot = (
    streamId: string,
    store: IncrementalDataStore,
    includeReplay: boolean,
  ): WorkerStreamRetentionSnapshot => {
    const state = store.state();
    if (!includeReplay) {
      return {
        version: 1,
        streamId,
        rows: store.rows(),
        state,
        replayStatus: 'omitted',
      };
    }
    if (state.replayTruncated) {
      return {
        version: 1,
        streamId,
        rows: store.rows(),
        state,
        replayStatus: 'truncated',
      };
    }
    return {
      version: 1,
      streamId,
      rows: store.rows(),
      state,
      replayStatus: 'available',
      replay: store.exportReplay(),
    };
  };

  const listener = (event: MessageEvent<unknown>): void => {
    if (!request(event.data)) return;
    if (event.data.type === 'graflume:worker-cancel') {
      active.get(event.data.id)?.abort();
      return;
    }
    const message = event.data;
    const controller = new AbortController();
    active.set(message.id, controller);
    void (async () => {
      let output: WorkerRuntimeResponse;
      try {
        const operation = message.operation;
        let result: WorkerRuntimeResult;
        if (operation.kind === 'transform') {
          if (operation.transforms.length > maxTransforms) {
            throw new GraflumeError(
              'INVALID_DATA',
              'Worker transform count exceeds the deterministic limit.',
            );
          }
          const input = await decodeData(operation.data, controller.signal);
          const engine = operation.engine ?? { type: 'javascript' };
          const transformed =
            engine.type === 'javascript'
              ? executeTransforms(input, operation.transforms)
              : await (() => {
                  const adapter = wasm.get(engine.adapter);
                  if (adapter === undefined) {
                    throw new GraflumeError(
                      'INVALID_DATA',
                      `WASM adapter "${engine.adapter}" is not registered.`,
                    );
                  }
                  return adapter.execute(input, operation.transforms, controller.signal);
                })();
          if (controller.signal.aborted) throw abortedError();
          result = { kind: 'transform', result: transformed };
        } else if (operation.kind === 'render') {
          const renderer = renderers.get(operation.renderer);
          if (renderer === undefined) {
            throw new GraflumeError(
              'UNSUPPORTED_RENDERER',
              `Worker renderer "${operation.renderer}" is not registered.`,
            );
          }
          if (
            ![operation.width, operation.height, operation.pixelRatio].every(Number.isFinite) ||
            operation.width < 1 ||
            operation.height < 1 ||
            operation.pixelRatio <= 0
          ) {
            throw new GraflumeError('INVALID_DATA', 'Worker render viewport is invalid.');
          }
          await renderer.render(
            operation.scene,
            operation.canvas,
            { width: operation.width, height: operation.height, pixelRatio: operation.pixelRatio },
            controller.signal,
          );
          if (controller.signal.aborted) throw abortedError();
          result = {
            kind: 'render',
            result: {
              renderer: renderer.id,
              width: operation.width,
              height: operation.height,
              pixelRatio: operation.pixelRatio,
            },
          };
        } else if (operation.kind === 'technical-indicator') {
          const rows = indicatorRequestRows(operation.request);
          if (rows > maxInputRows) {
            throw new GraflumeError(
              'INVALID_DATA',
              'Worker technical-indicator state exceeds the row budget.',
            );
          }
          if (controller.signal.aborted) throw abortedError();
          const calculated = calculateTechnicalIndicatorIncremental(operation.request);
          if (calculated.snapshot.length > maxInputRows) {
            throw new GraflumeError(
              'INVALID_DATA',
              'Calculated technical-indicator state exceeds the row budget.',
            );
          }
          if (controller.signal.aborted) throw abortedError();
          result = { kind: 'technical-indicator', result: calculated };
        } else if (operation.kind === 'incremental-stack') {
          const rows = incrementalStackRequestRows(operation.request);
          if (rows > maxInputRows) {
            throw new GraflumeError(
              'INVALID_DATA',
              'Worker incremental-stack state exceeds the row budget.',
            );
          }
          if (controller.signal.aborted) throw abortedError();
          const calculated = executePortableIncrementalStack(operation.request);
          if (controller.signal.aborted) throw abortedError();
          result = { kind: 'incremental-stack', result: calculated };
        } else if (operation.kind === 'bar-virtualization') {
          const rows = barVirtualizationRequestRows(operation.request);
          if (rows > maxInputRows) {
            throw new GraflumeError(
              'INVALID_DATA',
              'Worker bar-virtualization state exceeds the row budget.',
            );
          }
          if (controller.signal.aborted) throw abortedError();
          const calculated = executePortableBarVirtualization(operation.request);
          if (controller.signal.aborted) throw abortedError();
          result = { kind: 'bar-virtualization', result: calculated };
        } else {
          const requestRows = validateStreamRetentionRequest(operation.request);
          const { streamId, action } = operation.request;
          if (action.type === 'restore') {
            if (action.replay.updates.length > maxStreamingReplayBatches) {
              throw new GraflumeError(
                'INVALID_DATA',
                'Worker stream replay exceeds the bounded batch budget.',
              );
            }
            if (requestRows > maxStreamingReplayRows) {
              throw new GraflumeError(
                'INVALID_DATA',
                'Worker stream replay exceeds the bounded row budget.',
              );
            }
          } else if (requestRows > maxInputRows) {
            throw new GraflumeError(
              'INVALID_DATA',
              'Worker stream-retention request exceeds the row budget.',
            );
          }
          if (controller.signal.aborted) throw abortedError();
          if (action.type === 'initialize') {
            if (streams.has(streamId)) {
              throw new GraflumeError(
                'INVALID_DATA',
                `Worker stream "${streamId}" is already initialized.`,
              );
            }
            if (streams.size >= maxStreamingSessions) {
              throw new GraflumeError(
                'INVALID_DATA',
                'Worker streaming session budget is exhausted.',
              );
            }
            assertStreamContractBudget(action.streaming);
            const input = await decodeData(action.data, controller.signal);
            if (controller.signal.aborted) throw abortedError();
            const store = new IncrementalDataStore(input, action.streaming);
            streams.set(streamId, store);
            result = {
              kind: 'stream-retention',
              result: {
                action: 'initialize',
                snapshot: streamSnapshot(streamId, store, includeReplayValue(action.includeReplay)),
              },
            };
          } else if (action.type === 'restore') {
            if (streams.has(streamId)) {
              throw new GraflumeError(
                'INVALID_DATA',
                `Worker stream "${streamId}" is already initialized.`,
              );
            }
            if (streams.size >= maxStreamingSessions) {
              throw new GraflumeError(
                'INVALID_DATA',
                'Worker streaming session budget is exhausted.',
              );
            }
            assertStreamContractBudget(action.replay.options);
            const store = IncrementalDataStore.replay(action.replay);
            if (controller.signal.aborted) throw abortedError();
            streams.set(streamId, store);
            result = {
              kind: 'stream-retention',
              result: {
                action: 'restore',
                snapshot: streamSnapshot(streamId, store, includeReplayValue(action.includeReplay)),
              },
            };
          } else {
            const store = streams.get(streamId);
            if (store === undefined) {
              throw new GraflumeError(
                'INVALID_DATA',
                `Worker stream "${streamId}" is not initialized.`,
              );
            }
            if (action.type === 'update') {
              const updated = store.apply(action.update);
              result = {
                kind: 'stream-retention',
                result: {
                  action: 'update',
                  step: updated.step,
                  snapshot: streamSnapshot(
                    streamId,
                    store,
                    includeReplayValue(action.includeReplay),
                  ),
                },
              };
            } else if (action.type === 'snapshot') {
              result = {
                kind: 'stream-retention',
                result: {
                  action: 'snapshot',
                  snapshot: streamSnapshot(
                    streamId,
                    store,
                    includeReplayValue(action.includeReplay),
                  ),
                },
              };
            } else {
              streams.delete(streamId);
              result = {
                kind: 'stream-retention',
                result: { action: 'close', streamId, closed: true },
              };
            }
          }
        }
        output = {
          protocol: workerRuntimeProtocolVersion,
          type: 'graflume:worker-result',
          id: message.id,
          ok: true,
          result,
        };
      } catch (error) {
        output = {
          protocol: workerRuntimeProtocolVersion,
          type: 'graflume:worker-result',
          id: message.id,
          ok: false,
          error: serializedError(error),
        };
      } finally {
        active.delete(message.id);
      }
      scope.postMessage(output);
    })();
  };
  scope.addEventListener('message', listener);
  return () => {
    scope.removeEventListener('message', listener);
    for (const controller of active.values()) controller.abort();
    active.clear();
    streams.clear();
  };
}
