import { GraflumeError } from '../core/errors.js';
import type { DataRow, DataValue } from '../spec/types.js';
import { isPlainObject, ownValue } from '../utils/object.js';
import { rankBars } from './family-layouts.js';
import { BoundedRingBuffer } from './ring-buffer.js';

export type BarSortDirection = 'ascending' | 'descending';
export type BarAggregate = 'value' | 'count' | 'weighted-count';
export type BarVirtualNavigation = 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'PageUp' | 'PageDown';

export interface BarVirtualizationOptions {
  readonly key: string;
  readonly category: string;
  readonly value: string;
  readonly weight?: string;
  readonly aggregate?: BarAggregate;
  readonly direction?: BarSortDirection;
  readonly maxRows?: number;
  readonly windowRows?: number;
  readonly overscanRows?: number;
}

export interface NormalizedBarVirtualizationOptions {
  readonly key: string;
  readonly category: string;
  readonly value: string;
  readonly weight?: string;
  readonly aggregate: BarAggregate;
  readonly direction: BarSortDirection;
  readonly maxRows: number;
  readonly windowRows: number;
  readonly overscanRows: number;
}

export interface VirtualRankedBarRow {
  readonly id: string;
  readonly value: number;
  readonly rank: number;
  readonly previousRank: number | null;
  readonly rankChange: number | null;
  readonly sourceIds: readonly string[];
}

export interface BarRankChange {
  readonly id: string;
  readonly previousRank: number;
  readonly rank: number;
  readonly change: number;
}

export interface BarVirtualWindow {
  readonly totalRows: number;
  readonly viewportStart: number;
  readonly viewportEnd: number;
  readonly start: number;
  readonly end: number;
  readonly activeIndex: number;
  readonly activeId: string | null;
  readonly rows: readonly VirtualRankedBarRow[];
}

export interface BarVirtualizationStep {
  readonly sequence: number;
  readonly action: 'initial' | 'replace' | 'append' | 'upsert' | 'navigate' | 'sort' | 'window';
  readonly retainedRows: number;
  readonly acceptedRows: number;
  readonly updatedRows: number;
  readonly evictedRows: number;
  readonly reusedRetainedRows: number;
  readonly recomputedRanks: number;
  readonly reusedRankRows: number;
  readonly reusedWindowRows: number;
  readonly materializedRows: number;
  readonly rankChanges: readonly BarRankChange[];
}

export interface BarVirtualizationState {
  readonly version: 1;
  readonly portable: true;
  readonly sequence: number;
  readonly retainedRows: number;
  readonly rankedRows: number;
  readonly materializedRows: number;
  readonly maxRows: number;
  readonly maxMaterializedRows: number;
  readonly totalAcceptedRows: number;
  readonly totalUpdatedRows: number;
  readonly totalEvictedRows: number;
  readonly last: BarVirtualizationStep;
}

export interface BarVirtualizationSnapshot {
  readonly version: 1;
  readonly options: NormalizedBarVirtualizationOptions;
  readonly retained: readonly DataRow[];
  readonly ranked: readonly VirtualRankedBarRow[];
  readonly window: BarVirtualWindow;
  readonly state: BarVirtualizationState;
}

export type BarVirtualizationAction =
  | { readonly type: 'replace'; readonly rows: readonly DataRow[] }
  | { readonly type: 'append'; readonly rows: readonly DataRow[] }
  | { readonly type: 'upsert'; readonly rows: readonly DataRow[] }
  | { readonly type: 'navigate'; readonly command: BarVirtualNavigation }
  | { readonly type: 'sort'; readonly direction: BarSortDirection }
  | { readonly type: 'window'; readonly start: number };

export interface PortableBarVirtualizationRequest {
  readonly previous?: BarVirtualizationSnapshot;
  readonly options?: BarVirtualizationOptions;
  readonly action: BarVirtualizationAction;
}

export interface BarVirtualizationResult {
  readonly snapshot: BarVirtualizationSnapshot;
  readonly state: BarVirtualizationState;
  readonly window: BarVirtualWindow;
}

const absoluteMaximumRows = 1_000_000;

function closedObject(
  value: unknown,
  allowed: ReadonlySet<string>,
  path: string,
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be an object.`, { path });
  }
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    throw new GraflumeError('INVALID_SPEC', `Unknown ${path} property "${unknown}".`, {
      path: `${path}.${unknown}`,
    });
  }
  return value;
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

function boundedNonNegativeInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
  path: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 0 || resolved > maximum) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be an integer from 0 to ${maximum}.`, {
      path,
    });
  }
  return resolved;
}

function field(value: string | undefined, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new GraflumeError('INVALID_SPEC', `${path} must be a non-empty field name.`, { path });
  }
  // ownValue() applies the shared unsafe-key guard.
  ownValue(Object.create(null) as DataRow, value);
  return value;
}

function normalizeOptions(options: BarVirtualizationOptions): NormalizedBarVirtualizationOptions {
  closedObject(
    options,
    new Set([
      'key',
      'category',
      'value',
      'weight',
      'aggregate',
      'direction',
      'maxRows',
      'windowRows',
      'overscanRows',
    ]),
    '$.barVirtualization.options',
  );
  const maxRows = boundedInteger(
    options.maxRows,
    100_000,
    absoluteMaximumRows,
    '$.barVirtualization.maxRows',
  );
  const windowRows = boundedInteger(
    options.windowRows,
    100,
    Math.min(maxRows, 10_000),
    '$.barVirtualization.windowRows',
  );
  const overscanRows = boundedNonNegativeInteger(
    options.overscanRows,
    Math.min(20, windowRows),
    windowRows,
    '$.barVirtualization.overscanRows',
  );
  if (
    options.aggregate !== undefined &&
    !['value', 'count', 'weighted-count'].includes(options.aggregate)
  ) {
    throw new GraflumeError('INVALID_SPEC', '$.barVirtualization.aggregate is unsupported.');
  }
  if (
    options.direction !== undefined &&
    options.direction !== 'ascending' &&
    options.direction !== 'descending'
  ) {
    throw new GraflumeError('INVALID_SPEC', '$.barVirtualization.direction is unsupported.');
  }
  return {
    key: field(options.key, '$.barVirtualization.key'),
    category: field(options.category, '$.barVirtualization.category'),
    value: field(options.value, '$.barVirtualization.value'),
    ...(options.weight === undefined
      ? {}
      : { weight: field(options.weight, '$.barVirtualization.weight') }),
    aggregate: options.aggregate ?? 'value',
    direction: options.direction ?? 'descending',
    maxRows,
    windowRows,
    overscanRows,
  };
}

function validateAction(action: BarVirtualizationAction): void {
  const object = closedObject(
    action,
    new Set(['type', 'rows', 'command', 'direction', 'start']),
    '$.barVirtualization.action',
  );
  if (
    !['replace', 'append', 'upsert', 'navigate', 'sort', 'window'].includes(String(object.type))
  ) {
    throw new GraflumeError('INVALID_SPEC', '$.barVirtualization.action.type is unsupported.');
  }
  const expected =
    object.type === 'replace' || object.type === 'append' || object.type === 'upsert'
      ? new Set(['type', 'rows'])
      : object.type === 'navigate'
        ? new Set(['type', 'command'])
        : object.type === 'sort'
          ? new Set(['type', 'direction'])
          : new Set(['type', 'start']);
  const unexpected = Object.keys(object).find((key) => !expected.has(key));
  if (unexpected !== undefined) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `Property "${unexpected}" is not valid for bar virtualization action "${String(object.type)}".`,
    );
  }
  if (
    (object.type === 'replace' || object.type === 'append' || object.type === 'upsert') &&
    !Array.isArray(object.rows)
  ) {
    throw new GraflumeError('INVALID_DATA', '$.barVirtualization.action.rows must be an array.');
  }
  if (
    object.type === 'navigate' &&
    !['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(String(object.command))
  ) {
    throw new GraflumeError('INVALID_SPEC', '$.barVirtualization.action.command is unsupported.');
  }
  if (
    object.type === 'sort' &&
    object.direction !== 'ascending' &&
    object.direction !== 'descending'
  ) {
    throw new GraflumeError('INVALID_SPEC', '$.barVirtualization.action.direction is unsupported.');
  }
  if (
    object.type === 'window' &&
    (typeof object.start !== 'number' || !Number.isFinite(object.start))
  ) {
    throw new GraflumeError('INVALID_SPEC', '$.barVirtualization.action.start must be finite.');
  }
}

function validatePreviousSnapshot(
  previous: BarVirtualizationSnapshot,
  options: NormalizedBarVirtualizationOptions,
): void {
  if (
    previous.version !== 1 ||
    previous.state.version !== 1 ||
    previous.state.portable !== true ||
    !Array.isArray(previous.retained) ||
    !Array.isArray(previous.ranked) ||
    !Array.isArray(previous.window.rows)
  ) {
    throw new GraflumeError('INVALID_DATA', 'Bar virtualization snapshot is malformed.');
  }
  if (previous.retained.length > options.maxRows || previous.ranked.length > options.maxRows) {
    throw new GraflumeError('INVALID_DATA', 'Bar virtualization snapshot exceeds maxRows.');
  }
  if (previous.window.rows.length > options.windowRows + options.overscanRows * 2) {
    throw new GraflumeError(
      'INVALID_DATA',
      'Bar virtualization snapshot exceeds its materialized-row bound.',
    );
  }
}

function scalarKey(value: DataValue, path: string): string {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return `date:${value.toISOString()}`;
  if (typeof value === 'string' && value !== '') return `string:${value}`;
  if (typeof value === 'number' && Number.isFinite(value)) return `number:${value}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  throw new GraflumeError(
    'INVALID_DATA',
    'Virtual bar keys must be non-empty strings, finite numbers, booleans, or valid Dates.',
    { path },
  );
}

function finite(value: DataValue, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite number.`, { path });
  }
  return value;
}

function canonical(value: unknown): string {
  if (value instanceof Date) return `{"$date":${JSON.stringify(value.toISOString())}}`;
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function cloneRows(rows: readonly DataRow[]): readonly DataRow[] {
  return structuredClone(rows) as readonly DataRow[];
}

function rowKey(row: DataRow, options: NormalizedBarVirtualizationOptions, index: number): string {
  return scalarKey(
    ownValue(row, options.key) as DataValue,
    `$.barVirtualization.rows[${index}].${options.key}`,
  );
}

function uniqueRows(
  rows: readonly DataRow[],
  options: NormalizedBarVirtualizationOptions,
): readonly DataRow[] {
  const keys = new Set<string>();
  return cloneRows(rows).map((row, index) => {
    const key = rowKey(row, options, index);
    if (keys.has(key)) {
      throw new GraflumeError('INVALID_DATA', 'Virtual bar update keys must be unique.', {
        path: `$.barVirtualization.rows[${index}].${options.key}`,
      });
    }
    keys.add(key);
    return row;
  });
}

function retainedAfterAction(
  previous: BarVirtualizationSnapshot | undefined,
  options: NormalizedBarVirtualizationOptions,
  action: BarVirtualizationAction,
): {
  readonly rows: readonly DataRow[];
  readonly accepted: number;
  readonly updated: number;
  readonly evicted: number;
  readonly reused: number;
} {
  const before = previous?.retained ?? [];
  if (action.type === 'replace') {
    const incoming = uniqueRows(action.rows, options);
    const ring = new BoundedRingBuffer<DataRow>(options.maxRows, incoming);
    const next = ring.values();
    const beforeByKey = new Map(before.map((row, index) => [rowKey(row, options, index), row]));
    const reused = next.filter((row, index) => {
      const old = beforeByKey.get(rowKey(row, options, index));
      return old !== undefined && canonical(old) === canonical(row);
    }).length;
    return {
      rows: next,
      accepted: incoming.length,
      updated: 0,
      evicted: Math.max(0, incoming.length - options.maxRows),
      reused,
    };
  }
  if (action.type !== 'append' && action.type !== 'upsert') {
    return { rows: before, accepted: 0, updated: 0, evicted: 0, reused: before.length };
  }
  const incoming = uniqueRows(action.rows, options);
  const ring = new BoundedRingBuffer<DataRow>(options.maxRows, before);
  const indexes = new Map<string, number>();
  ring.values().forEach((row, index) => indexes.set(rowKey(row, options, index), index));
  let updated = 0;
  let evicted = 0;
  for (let index = 0; index < incoming.length; index += 1) {
    const row = incoming[index]!;
    const key = rowKey(row, options, index);
    const existing = indexes.get(key);
    if (existing !== undefined) {
      if (action.type === 'append') {
        throw new GraflumeError('INVALID_DATA', `Virtual bar append key ${key} already exists.`);
      }
      const merged = { ...ring.at(existing), ...row } as DataRow;
      ring.set(existing, merged);
      updated += 1;
      continue;
    }
    const removed = ring.push(row);
    if (removed !== undefined) evicted += 1;
    indexes.clear();
    ring
      .values()
      .forEach((retained, retainedIndex) =>
        indexes.set(rowKey(retained, options, retainedIndex), retainedIndex),
      );
  }
  const next = ring.values();
  const beforeByKey = new Map(before.map((row, index) => [rowKey(row, options, index), row]));
  const reused = next.filter((row, index) => {
    const old = beforeByKey.get(rowKey(row, options, index));
    return old !== undefined && canonical(old) === canonical(row);
  }).length;
  return { rows: next, accepted: incoming.length, updated, evicted, reused };
}

function rankedRows(
  retained: readonly DataRow[],
  options: NormalizedBarVirtualizationOptions,
  previous: BarVirtualizationSnapshot | undefined,
): readonly VirtualRankedBarRow[] {
  const previousRanks = Object.fromEntries(
    (previous?.ranked ?? []).map(({ id, rank }) => [id, rank]),
  );
  return rankBars(
    retained.map((row, index) => {
      const idValue = ownValue(row, options.key) as DataValue;
      const categoryValue = ownValue(row, options.category) as DataValue;
      return {
        id: scalarKey(idValue, `$.barVirtualization.retained[${index}].${options.key}`),
        category:
          categoryValue instanceof Date ? categoryValue.toISOString() : String(categoryValue ?? ''),
        value: finite(
          ownValue(row, options.value) as DataValue,
          `$.barVirtualization.retained[${index}].${options.value}`,
        ),
        ...(options.weight === undefined
          ? {}
          : {
              weight: finite(
                ownValue(row, options.weight) as DataValue,
                `$.barVirtualization.retained[${index}].${options.weight}`,
              ),
            }),
      };
    }),
    {
      aggregate: options.aggregate,
      direction: options.direction,
      previousRanks,
    },
  );
}

function movedIndex(
  current: number,
  total: number,
  command: BarVirtualNavigation,
  page: number,
): number {
  if (total === 0) return -1;
  if (command === 'Home') return 0;
  if (command === 'End') return total - 1;
  const start = Math.max(0, current);
  const delta =
    command === 'ArrowUp' ? -1 : command === 'ArrowDown' ? 1 : command === 'PageUp' ? -page : page;
  return Math.max(0, Math.min(total - 1, start + delta));
}

function virtualWindow(
  ranked: readonly VirtualRankedBarRow[],
  options: NormalizedBarVirtualizationOptions,
  activeIndex: number,
  authoredStart: number,
): BarVirtualWindow {
  const total = ranked.length;
  if (total === 0) {
    return {
      totalRows: 0,
      viewportStart: 0,
      viewportEnd: 0,
      start: 0,
      end: 0,
      activeIndex: -1,
      activeId: null,
      rows: [],
    };
  }
  const maximumStart = Math.max(0, total - options.windowRows);
  let viewportStart = Math.max(0, Math.min(maximumStart, Math.floor(authoredStart)));
  if (activeIndex < viewportStart) viewportStart = activeIndex;
  if (activeIndex >= viewportStart + options.windowRows) {
    viewportStart = Math.min(maximumStart, activeIndex - options.windowRows + 1);
  }
  const viewportEnd = Math.min(total, viewportStart + options.windowRows);
  const start = Math.max(0, viewportStart - options.overscanRows);
  const end = Math.min(total, viewportEnd + options.overscanRows);
  return {
    totalRows: total,
    viewportStart,
    viewportEnd,
    start,
    end,
    activeIndex,
    activeId: ranked[activeIndex]?.id ?? null,
    rows: ranked.slice(start, end),
  };
}

/** Pure protocol payload reducer used identically on the main thread and in Workers. */
export function executePortableBarVirtualization(
  request: PortableBarVirtualizationRequest,
): BarVirtualizationResult {
  validateAction(request.action);
  if (request.previous === undefined && request.options === undefined) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Initial bar virtualization requires portable options.',
    );
  }
  const previous = request.previous;
  if (previous !== undefined && request.options !== undefined) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Bar virtualization options are immutable after initialization; use the sort action for direction changes.',
    );
  }
  const options = normalizeOptions(
    request.options ??
      ({
        ...previous!.options,
        ...(request.action.type === 'sort' ? { direction: request.action.direction } : {}),
      } satisfies BarVirtualizationOptions),
  );
  if (previous !== undefined) validatePreviousSnapshot(previous, options);
  const retention = retainedAfterAction(previous, options, request.action);
  const rerank =
    previous === undefined ||
    request.action.type === 'replace' ||
    request.action.type === 'append' ||
    request.action.type === 'upsert' ||
    request.action.type === 'sort';
  const ranked = rerank ? rankedRows(retention.rows, options, previous) : previous!.ranked;
  const previousRanked = new Map((previous?.ranked ?? []).map((row) => [row.id, row]));
  const reusedRankRows = ranked.filter((row) => {
    const old = previousRanked.get(row.id);
    return old !== undefined && canonical(old) === canonical(row);
  }).length;
  const rankChanges = rerank
    ? ranked.flatMap((row): BarRankChange[] =>
        row.previousRank !== null && row.rankChange !== null && row.rankChange !== 0
          ? [
              {
                id: row.id,
                previousRank: row.previousRank,
                rank: row.rank,
                change: row.rankChange,
              },
            ]
          : [],
      )
    : [];
  const previousActiveId = previous?.window.activeId ?? null;
  let activeIndex = Math.max(
    0,
    previousActiveId === null ? 0 : ranked.findIndex(({ id }) => id === previousActiveId),
  );
  if (ranked.length === 0) activeIndex = -1;
  if (request.action.type === 'navigate') {
    activeIndex = movedIndex(
      previous?.window.activeIndex ?? activeIndex,
      ranked.length,
      request.action.command,
      options.windowRows,
    );
  }
  const authoredStart =
    request.action.type === 'window' ? request.action.start : (previous?.window.viewportStart ?? 0);
  const window = virtualWindow(ranked, options, activeIndex, authoredStart);
  const previousWindowIds = new Set((previous?.window.rows ?? []).map(({ id }) => id));
  const reusedWindowRows = window.rows.filter(({ id }) => previousWindowIds.has(id)).length;
  const action = previous === undefined ? 'initial' : request.action.type;
  const step: BarVirtualizationStep = {
    sequence: (previous?.state.sequence ?? -1) + 1,
    action,
    retainedRows: retention.rows.length,
    acceptedRows: retention.accepted,
    updatedRows: retention.updated,
    evictedRows: retention.evicted,
    reusedRetainedRows: retention.reused,
    recomputedRanks: rerank ? ranked.length : 0,
    reusedRankRows,
    reusedWindowRows,
    materializedRows: window.rows.length,
    rankChanges,
  };
  const state: BarVirtualizationState = {
    version: 1,
    portable: true,
    sequence: step.sequence,
    retainedRows: retention.rows.length,
    rankedRows: ranked.length,
    materializedRows: window.rows.length,
    maxRows: options.maxRows,
    maxMaterializedRows: options.windowRows + options.overscanRows * 2,
    totalAcceptedRows: (previous?.state.totalAcceptedRows ?? 0) + retention.accepted,
    totalUpdatedRows: (previous?.state.totalUpdatedRows ?? 0) + retention.updated,
    totalEvictedRows: (previous?.state.totalEvictedRows ?? 0) + retention.evicted,
    last: step,
  };
  const snapshot: BarVirtualizationSnapshot = {
    version: 1,
    options,
    retained: cloneRows(retention.rows),
    ranked: structuredClone(ranked) as readonly VirtualRankedBarRow[],
    window: structuredClone(window) as BarVirtualWindow,
    state,
  };
  try {
    structuredClone(snapshot);
  } catch (error) {
    throw new GraflumeError('INVALID_DATA', 'Bar virtualization state is not Worker-portable.', {
      cause: error,
    });
  }
  return { snapshot, state, window: snapshot.window };
}

export class BarVirtualizationController {
  #current: BarVirtualizationResult;

  constructor(rows: readonly DataRow[], options: BarVirtualizationOptions) {
    this.#current = executePortableBarVirtualization({
      options,
      action: { type: 'replace', rows },
    });
  }

  replace(rows: readonly DataRow[]): BarVirtualizationResult {
    return this.#transition({ type: 'replace', rows });
  }

  append(rows: readonly DataRow[]): BarVirtualizationResult {
    return this.#transition({ type: 'append', rows });
  }

  upsert(rows: readonly DataRow[]): BarVirtualizationResult {
    return this.#transition({ type: 'upsert', rows });
  }

  navigate(command: BarVirtualNavigation): BarVirtualizationResult {
    return this.#transition({ type: 'navigate', command });
  }

  sort(direction: BarSortDirection): BarVirtualizationResult {
    return this.#transition({ type: 'sort', direction });
  }

  setWindowStart(start: number): BarVirtualizationResult {
    if (!Number.isFinite(start)) {
      throw new GraflumeError('INVALID_SPEC', 'Virtual bar window start must be finite.');
    }
    return this.#transition({ type: 'window', start });
  }

  snapshot(): BarVirtualizationSnapshot {
    return structuredClone(this.#current.snapshot) as BarVirtualizationSnapshot;
  }

  state(): BarVirtualizationState {
    return structuredClone(this.#current.state) as BarVirtualizationState;
  }

  window(): BarVirtualWindow {
    return structuredClone(this.#current.window) as BarVirtualWindow;
  }

  #transition(action: BarVirtualizationAction): BarVirtualizationResult {
    this.#current = executePortableBarVirtualization({
      previous: this.#current.snapshot,
      action,
    });
    return {
      snapshot: this.snapshot(),
      state: this.state(),
      window: this.window(),
    };
  }
}

export function createBarVirtualizationController(
  rows: readonly DataRow[],
  options: BarVirtualizationOptions,
): BarVirtualizationController {
  return new BarVirtualizationController(rows, options);
}
