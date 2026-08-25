import { GraflumeError } from '../core/errors.js';
import type { ColumnarData, DataInput, TransformSpec } from '../spec/types.js';
import { isPlainObject } from '../utils/object.js';
import { DataTable } from './table.js';
import { executeTransforms, type TransformResult } from './transforms.js';

export const transformWorkerProtocolVersion = 1 as const;

export interface TransformWorkerRequest {
  readonly protocol: 1;
  readonly type: 'graflume:transform';
  readonly id: number;
  readonly data: DataInput;
  readonly transforms: readonly TransformSpec[];
}

export interface TransformWorkerSuccess {
  readonly protocol: 1;
  readonly type: 'graflume:transform-result';
  readonly id: number;
  readonly ok: true;
  readonly result: TransformResult;
}

export interface TransformWorkerFailure {
  readonly protocol: 1;
  readonly type: 'graflume:transform-result';
  readonly id: number;
  readonly ok: false;
  readonly error: {
    readonly name: string;
    readonly message: string;
    readonly code?: string;
    readonly path?: string;
  };
}

export type TransformWorkerResponse = TransformWorkerSuccess | TransformWorkerFailure;

export interface TransformWorkerPort {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  terminate?(): void;
}

export interface TransformWorkerScope {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
}

export interface TransformWorkerAdapterOptions {
  readonly maxQueueBatches?: number;
  readonly maxQueueRows?: number;
  readonly maxInputRows?: number;
  readonly maxTransforms?: number;
}

export interface TransformWorkerExecuteOptions {
  /** Transfer caller-owned typed-array buffers. Defaults to false to preserve ownership. */
  readonly transferOwnership?: boolean;
}

export interface TransformWorkerState {
  readonly protocol: 1;
  readonly queuedBatches: number;
  readonly queuedRows: number;
  readonly inFlight: boolean;
  readonly completed: number;
  readonly rejected: number;
  readonly closed: boolean;
}

interface PendingRequest {
  readonly request: TransformWorkerRequest;
  readonly rows: number;
  readonly transfer: Transferable[];
  readonly resolve: (result: TransformResult) => void;
  readonly reject: (error: unknown) => void;
}

interface NormalizedWorkerOptions {
  readonly maxQueueBatches: number;
  readonly maxQueueRows: number;
  readonly maxInputRows: number;
  readonly maxTransforms: number;
}

const DEFAULT_MAX_QUEUE_BATCHES = 8;
const DEFAULT_MAX_ROWS = 100_000;
const ABSOLUTE_MAX_ROWS = 1_000_000;
const DEFAULT_MAX_TRANSFORMS = 128;
const ADAPTER_OPTION_KEYS = new Set([
  'maxQueueBatches',
  'maxQueueRows',
  'maxInputRows',
  'maxTransforms',
]);
const EXECUTE_OPTION_KEYS = new Set(['transferOwnership']);

function assertClosedOptions(value: unknown, allowed: ReadonlySet<string>, path: string): void {
  if (!isPlainObject(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be an object.`, { path });
  }
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    throw new GraflumeError('INVALID_DATA', `Unknown ${path} property "${unknown}".`, {
      path: `${path}.${unknown}`,
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
    throw new GraflumeError('INVALID_DATA', `${path} must be an integer from 1 to ${maximum}.`, {
      path,
    });
  }
  return resolved;
}

function normalizeOptions(options: TransformWorkerAdapterOptions): NormalizedWorkerOptions {
  assertClosedOptions(options, ADAPTER_OPTION_KEYS, '$.worker');
  const maxInputRows = boundedInteger(
    options.maxInputRows,
    DEFAULT_MAX_ROWS,
    ABSOLUTE_MAX_ROWS,
    'worker.maxInputRows',
  );
  return {
    maxQueueBatches: boundedInteger(
      options.maxQueueBatches,
      DEFAULT_MAX_QUEUE_BATCHES,
      1_024,
      'worker.maxQueueBatches',
    ),
    maxQueueRows: boundedInteger(
      options.maxQueueRows,
      maxInputRows,
      ABSOLUTE_MAX_ROWS,
      'worker.maxQueueRows',
    ),
    maxInputRows,
    maxTransforms: boundedInteger(
      options.maxTransforms,
      DEFAULT_MAX_TRANSFORMS,
      DEFAULT_MAX_TRANSFORMS,
      'worker.maxTransforms',
    ),
  };
}

function rowCount(data: DataInput): number {
  return DataTable.from(data).length;
}

function transferables(data: DataInput): Transferable[] {
  if (Array.isArray(data)) return [];
  const columnar = data as ColumnarData;
  const buffers = new Set<ArrayBuffer>();
  for (const column of Object.values(columnar.columns)) {
    if (ArrayBuffer.isView(column) && column.buffer instanceof ArrayBuffer) {
      buffers.add(column.buffer);
    }
  }
  return [...buffers];
}

function snapshotRequest(
  data: DataInput,
  transforms: readonly TransformSpec[],
  transferOwnership: boolean,
): {
  readonly data: DataInput;
  readonly transforms: readonly TransformSpec[];
  readonly transfer: Transferable[];
} {
  try {
    const transformSnapshot = structuredClone(transforms) as readonly TransformSpec[];
    const sourceTransfers = transferOwnership ? transferables(data) : [];
    const dataSnapshot = structuredClone(
      data,
      sourceTransfers.length === 0 ? undefined : { transfer: sourceTransfers },
    ) as DataInput;
    return {
      data: dataSnapshot,
      transforms: transformSnapshot,
      transfer: transferOwnership ? transferables(dataSnapshot) : [],
    };
  } catch (error) {
    throw new GraflumeError(
      'INVALID_DATA',
      'Worker data and transforms must be structured-clone portable; functions are unsupported.',
      { details: { cause: error instanceof Error ? error.message : String(error) } },
    );
  }
}

function isResponse(value: unknown): value is TransformWorkerResponse {
  if (value === null || typeof value !== 'object') return false;
  const response = value as Partial<TransformWorkerResponse>;
  return (
    response.protocol === transformWorkerProtocolVersion &&
    response.type === 'graflume:transform-result' &&
    typeof response.id === 'number' &&
    typeof response.ok === 'boolean'
  );
}

function isRequest(value: unknown): value is TransformWorkerRequest {
  if (value === null || typeof value !== 'object') return false;
  const request = value as Partial<TransformWorkerRequest>;
  return (
    request.protocol === transformWorkerProtocolVersion &&
    request.type === 'graflume:transform' &&
    typeof request.id === 'number' &&
    request.data !== undefined &&
    Array.isArray(request.transforms)
  );
}

function serializedError(error: unknown): TransformWorkerFailure['error'] {
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

export class TransformWorkerAdapter {
  readonly #port: TransformWorkerPort;
  readonly #options: NormalizedWorkerOptions;
  #queue: PendingRequest[] = [];
  #queuedRows = 0;
  #active: PendingRequest | null = null;
  #nextId = 1;
  #completed = 0;
  #rejected = 0;
  #closed = false;

  readonly #messageListener = (event: MessageEvent<unknown>): void => {
    if (!isResponse(event.data) || this.#active === null) return;
    if (event.data.id !== this.#active.request.id) return;
    const active = this.#active;
    this.#active = null;
    if (event.data.ok) {
      this.#completed += 1;
      active.resolve(event.data.result);
    } else {
      this.#rejected += 1;
      active.reject(
        new GraflumeError('INVALID_DATA', event.data.error.message, {
          ...(event.data.error.path === undefined ? {} : { path: event.data.error.path }),
          details: { workerCode: event.data.error.code ?? event.data.error.name },
        }),
      );
    }
    this.#dispatch();
  };

  constructor(port: TransformWorkerPort, options: TransformWorkerAdapterOptions = {}) {
    this.#port = port;
    this.#options = normalizeOptions(options);
    this.#port.addEventListener('message', this.#messageListener);
  }

  execute(
    data: DataInput,
    transforms: readonly TransformSpec[],
    options: TransformWorkerExecuteOptions = {},
  ): Promise<TransformResult> {
    if (this.#closed) {
      return this.#rejectRequest(
        new GraflumeError('INVALID_DATA', 'Transform worker adapter is closed.'),
      );
    }
    try {
      assertClosedOptions(options, EXECUTE_OPTION_KEYS, '$.worker.execute');
      if (
        options.transferOwnership !== undefined &&
        typeof options.transferOwnership !== 'boolean'
      ) {
        throw new GraflumeError(
          'INVALID_DATA',
          '$.worker.execute.transferOwnership must be boolean.',
          { path: '$.worker.execute.transferOwnership' },
        );
      }
    } catch (error) {
      return this.#rejectRequest(error);
    }
    const rows = rowCount(data);
    if (rows > this.#options.maxInputRows) {
      return this.#rejectRequest(
        new GraflumeError(
          'INVALID_DATA',
          `Worker input has ${rows} rows; the deterministic limit is ${this.#options.maxInputRows}.`,
        ),
      );
    }
    if (transforms.length > this.#options.maxTransforms) {
      return this.#rejectRequest(
        new GraflumeError(
          'INVALID_DATA',
          `Worker request has ${transforms.length} transforms; the deterministic limit is ${this.#options.maxTransforms}.`,
        ),
      );
    }
    if (
      this.#queue.length + (this.#active === null ? 0 : 1) >= this.#options.maxQueueBatches ||
      this.#queuedRows + (this.#active?.rows ?? 0) + rows > this.#options.maxQueueRows
    ) {
      return this.#rejectRequest(
        new GraflumeError(
          'INVALID_DATA',
          'Transform worker backpressure limit reached; the request was rejected without dispatch.',
        ),
      );
    }
    let snapshot: ReturnType<typeof snapshotRequest>;
    try {
      snapshot = snapshotRequest(data, transforms, options.transferOwnership === true);
    } catch (error) {
      return this.#rejectRequest(error);
    }
    const request: TransformWorkerRequest = {
      protocol: transformWorkerProtocolVersion,
      type: 'graflume:transform',
      id: this.#nextId,
      data: snapshot.data,
      transforms: snapshot.transforms,
    };
    this.#nextId += 1;
    return new Promise((resolve, reject) => {
      this.#queue.push({
        request,
        rows,
        transfer: snapshot.transfer,
        resolve,
        reject,
      });
      this.#queuedRows += rows;
      this.#dispatch();
    });
  }

  state(): TransformWorkerState {
    return {
      protocol: transformWorkerProtocolVersion,
      queuedBatches: this.#queue.length,
      queuedRows: this.#queuedRows,
      inFlight: this.#active !== null,
      completed: this.#completed,
      rejected: this.#rejected,
      closed: this.#closed,
    };
  }

  close(options: { readonly terminate?: boolean } = {}): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#port.removeEventListener('message', this.#messageListener);
    const error = new GraflumeError('INVALID_DATA', 'Transform worker adapter closed.');
    this.#rejected += (this.#active === null ? 0 : 1) + this.#queue.length;
    this.#active?.reject(error);
    this.#active = null;
    for (const item of this.#queue) item.reject(error);
    this.#queue = [];
    this.#queuedRows = 0;
    if (options.terminate === true) this.#port.terminate?.();
  }

  #rejectRequest(error: unknown): Promise<never> {
    this.#rejected += 1;
    return Promise.reject(error);
  }

  #dispatch(): void {
    if (this.#closed || this.#active !== null) return;
    const next = this.#queue.shift();
    if (next === undefined) return;
    this.#queuedRows -= next.rows;
    this.#active = next;
    try {
      this.#port.postMessage(next.request, next.transfer);
    } catch (error) {
      this.#active = null;
      this.#rejected += 1;
      next.reject(error);
      this.#dispatch();
    }
  }
}

export function createTransformWorkerAdapter(
  port: TransformWorkerPort,
  options: TransformWorkerAdapterOptions = {},
): TransformWorkerAdapter {
  return new TransformWorkerAdapter(port, options);
}

export function installTransformWorker(
  scope: TransformWorkerScope,
  options: Pick<TransformWorkerAdapterOptions, 'maxInputRows' | 'maxTransforms'> = {},
): () => void {
  const normalized = normalizeOptions(options);
  const listener = (event: MessageEvent<unknown>): void => {
    if (!isRequest(event.data)) return;
    const request = event.data;
    let response: TransformWorkerResponse;
    try {
      const rows = rowCount(request.data);
      if (rows > normalized.maxInputRows) {
        throw new GraflumeError(
          'INVALID_DATA',
          `Worker input has ${rows} rows; the deterministic limit is ${normalized.maxInputRows}.`,
        );
      }
      if (request.transforms.length > normalized.maxTransforms) {
        throw new GraflumeError(
          'INVALID_DATA',
          `Worker request has ${request.transforms.length} transforms; the deterministic limit is ${normalized.maxTransforms}.`,
        );
      }
      response = {
        protocol: transformWorkerProtocolVersion,
        type: 'graflume:transform-result',
        id: request.id,
        ok: true,
        result: executeTransforms(request.data, request.transforms),
      };
    } catch (error) {
      response = {
        protocol: transformWorkerProtocolVersion,
        type: 'graflume:transform-result',
        id: request.id,
        ok: false,
        error: serializedError(error),
      };
    }
    scope.postMessage(response);
  };
  scope.addEventListener('message', listener);
  return () => scope.removeEventListener('message', listener);
}
