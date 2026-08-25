import { GraflumeError } from '../core/errors.js';
import type { Point } from '../scene/types.js';
import type { JsonPrimitive, JsonValue } from '../spec/types.js';

const MAX_TABLE_FILTERS = 16;
const MAX_TABLE_SORTS = 8;
const MAX_TABLE_GROUP_FIELDS = 8;
const MAX_TABLE_AGGREGATES = 16;
const MAX_RUNTIME_POSITIONS = 2_048;
const MAX_RUNTIME_COLLAPSED = 2_048;
const MAX_NETWORK_LASSO_POINTS = 256;
const MAX_TABLE_WINDOW = 10_000;

export type ChartTableFilter =
  | {
      readonly field: string;
      readonly operator: 'equals' | 'not-equals' | 'contains';
      readonly value: JsonPrimitive;
    }
  | {
      readonly field: string;
      readonly operator: 'greater' | 'greater-or-equal' | 'less' | 'less-or-equal';
      readonly value: number;
    };

export interface ChartTableSort {
  readonly field: string;
  readonly direction: 'ascending' | 'descending';
}

export interface ChartTableGroup {
  readonly fields: readonly string[];
  readonly aggregates: readonly {
    readonly field: string;
    readonly op: 'count' | 'sum' | 'mean' | 'min' | 'max';
    readonly as: string;
  }[];
}

export interface ChartTablePivot {
  readonly row: string;
  readonly column: string;
  readonly value: string;
  readonly op: 'count' | 'sum' | 'mean';
}

/** Function-free table transformation state owned by one live Chart instance. */
export interface ChartTableRuntimeState {
  readonly filters: readonly ChartTableFilter[];
  readonly sort: readonly ChartTableSort[];
  readonly group: ChartTableGroup | null;
  readonly pivot: ChartTablePivot | null;
  readonly windowOffset: number;
  readonly windowLimit: number;
  readonly columnOffset: number;
  readonly columnLimit: number;
}

export interface ChartRuntimeNodePosition {
  readonly x: number;
  readonly y: number;
  readonly pinned?: boolean;
}

/** Function-free network interaction state; all coordinates are plot-normalized. */
export interface ChartNetworkRuntimeState {
  readonly positions: Readonly<Record<string, ChartRuntimeNodePosition>>;
  readonly collapsed: readonly string[];
  readonly lasso: readonly Point[];
}

/** Function-free flow interaction state; all coordinates are plot-normalized. */
export interface ChartFlowRuntimeState {
  readonly positions: Readonly<Record<string, ChartRuntimeNodePosition>>;
}

function fail(path: string, message: string): never {
  throw new GraflumeError('INVALID_SPEC', message, { path });
}

function field(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 128) {
    return fail(path, `${path} must be a non-empty field name of at most 128 characters.`);
  }
  if (value === '__proto__' || value === 'prototype' || value === 'constructor') {
    return fail(path, `${path} uses a forbidden object key.`);
  }
  return value;
}

function id(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 256) {
    return fail(path, `${path} must be a non-empty id of at most 256 characters.`);
  }
  return value;
}

function object(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function primitive(value: unknown, path: string): JsonPrimitive {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }
  return fail(path, `${path} must be a finite JSON primitive.`);
}

function boundedInteger(value: unknown, fallback: number, maximum: number, path: string): number {
  const resolved = value === undefined ? fallback : value;
  if (
    typeof resolved !== 'number' ||
    !Number.isInteger(resolved) ||
    resolved < 0 ||
    resolved > maximum
  ) {
    return fail(path, `${path} must be an integer from 0 to ${maximum}.`);
  }
  return resolved;
}

export function normalizeTableRuntimeState(
  value: Partial<ChartTableRuntimeState>,
  fallback: ChartTableRuntimeState = {
    filters: [],
    sort: [],
    group: null,
    pivot: null,
    windowOffset: 0,
    windowLimit: 100,
    columnOffset: 0,
    columnLimit: 100,
  },
): ChartTableRuntimeState {
  const rawFilters = value.filters ?? fallback.filters;
  if (!Array.isArray(rawFilters) || rawFilters.length > MAX_TABLE_FILTERS) {
    return fail('$.filters', `Table runtime filters are limited to ${MAX_TABLE_FILTERS} entries.`);
  }
  const filters = rawFilters.map((candidate, index): ChartTableFilter => {
    const item = object(candidate);
    if (item === null) return fail(`$.filters[${index}]`, 'Table filters must be objects.');
    const operator = item.operator;
    if (
      operator !== 'equals' &&
      operator !== 'not-equals' &&
      operator !== 'contains' &&
      operator !== 'greater' &&
      operator !== 'greater-or-equal' &&
      operator !== 'less' &&
      operator !== 'less-or-equal'
    ) {
      return fail(`$.filters[${index}].operator`, 'Unknown table filter operator.');
    }
    const resolvedField = field(item.field, `$.filters[${index}].field`);
    const resolvedValue = primitive(item.value, `$.filters[${index}].value`);
    if (
      operator === 'greater' ||
      operator === 'greater-or-equal' ||
      operator === 'less' ||
      operator === 'less-or-equal'
    ) {
      if (typeof resolvedValue !== 'number') {
        return fail(`$.filters[${index}].value`, 'Numeric table filters require a number.');
      }
      return { field: resolvedField, operator, value: resolvedValue };
    }
    return { field: resolvedField, operator, value: resolvedValue };
  });

  const rawSort = value.sort ?? fallback.sort;
  if (!Array.isArray(rawSort) || rawSort.length > MAX_TABLE_SORTS) {
    return fail('$.sort', `Table runtime sort is limited to ${MAX_TABLE_SORTS} fields.`);
  }
  const sort = rawSort.map((candidate, index): ChartTableSort => {
    const item = object(candidate);
    if (item === null) return fail(`$.sort[${index}]`, 'Table sort entries must be objects.');
    const direction = item.direction ?? 'ascending';
    if (direction !== 'ascending' && direction !== 'descending') {
      return fail(`$.sort[${index}].direction`, 'Table sort direction is invalid.');
    }
    return { field: field(item.field, `$.sort[${index}].field`), direction };
  });

  const rawGroup = value.group === undefined ? fallback.group : value.group;
  let group: ChartTableGroup | null = null;
  if (rawGroup !== null) {
    const candidate = object(rawGroup);
    if (candidate === null) return fail('$.group', 'Table group must be an object or null.');
    if (!Array.isArray(candidate.fields) || candidate.fields.length > MAX_TABLE_GROUP_FIELDS) {
      return fail(
        '$.group.fields',
        `Table groups are limited to ${MAX_TABLE_GROUP_FIELDS} fields.`,
      );
    }
    if (
      !Array.isArray(candidate.aggregates) ||
      candidate.aggregates.length > MAX_TABLE_AGGREGATES
    ) {
      return fail(
        '$.group.aggregates',
        `Table groups are limited to ${MAX_TABLE_AGGREGATES} aggregates.`,
      );
    }
    group = {
      fields: candidate.fields.map((entry, index) => field(entry, `$.group.fields[${index}]`)),
      aggregates: candidate.aggregates.map((entry, index) => {
        const aggregate = object(entry);
        if (aggregate === null) {
          return fail(`$.group.aggregates[${index}]`, 'Table aggregates must be objects.');
        }
        const op = aggregate.op;
        if (op !== 'count' && op !== 'sum' && op !== 'mean' && op !== 'min' && op !== 'max') {
          return fail(`$.group.aggregates[${index}].op`, 'Unknown table aggregate operation.');
        }
        return {
          field: field(aggregate.field, `$.group.aggregates[${index}].field`),
          op,
          as: field(aggregate.as, `$.group.aggregates[${index}].as`),
        };
      }),
    };
  }

  const rawPivot = value.pivot === undefined ? fallback.pivot : value.pivot;
  let pivot: ChartTablePivot | null = null;
  if (rawPivot !== null) {
    const candidate = object(rawPivot);
    if (candidate === null) return fail('$.pivot', 'Table pivot must be an object or null.');
    const op = candidate.op ?? 'sum';
    if (op !== 'count' && op !== 'sum' && op !== 'mean') {
      return fail('$.pivot.op', 'Unknown table pivot operation.');
    }
    pivot = {
      row: field(candidate.row, '$.pivot.row'),
      column: field(candidate.column, '$.pivot.column'),
      value: field(candidate.value, '$.pivot.value'),
      op,
    };
  }
  if (group !== null && pivot !== null) {
    return fail('$.pivot', 'Runtime table group and pivot controls are mutually exclusive.');
  }

  return {
    filters,
    sort,
    group,
    pivot,
    windowOffset: boundedInteger(
      value.windowOffset,
      fallback.windowOffset,
      100_000,
      '$.windowOffset',
    ),
    windowLimit: boundedInteger(
      value.windowLimit,
      fallback.windowLimit,
      MAX_TABLE_WINDOW,
      '$.windowLimit',
    ),
    columnOffset: boundedInteger(
      value.columnOffset,
      fallback.columnOffset,
      MAX_TABLE_WINDOW,
      '$.columnOffset',
    ),
    columnLimit: boundedInteger(
      value.columnLimit,
      fallback.columnLimit,
      MAX_TABLE_WINDOW,
      '$.columnLimit',
    ),
  };
}

function normalizePositions(
  value: unknown,
  path: string,
): Readonly<Record<string, ChartRuntimeNodePosition>> {
  const source = object(value);
  if (source === null) return {};
  const entries = Object.entries(source);
  if (entries.length > MAX_RUNTIME_POSITIONS) {
    return fail(path, `Runtime positions are limited to ${MAX_RUNTIME_POSITIONS} nodes.`);
  }
  return Object.fromEntries(
    entries.map(([rawId, rawPosition]) => {
      const nodeId = id(rawId, `${path}.${rawId}`);
      const position = object(rawPosition);
      if (position === null) return fail(`${path}.${rawId}`, 'Node position must be an object.');
      const x = position.x;
      const y = position.y;
      if (
        typeof x !== 'number' ||
        !Number.isFinite(x) ||
        x < 0 ||
        x > 1 ||
        typeof y !== 'number' ||
        !Number.isFinite(y) ||
        y < 0 ||
        y > 1
      ) {
        return fail(`${path}.${rawId}`, 'Node positions must use finite normalized x/y values.');
      }
      const pinned = position.pinned;
      if (pinned !== undefined && typeof pinned !== 'boolean') {
        return fail(`${path}.${rawId}.pinned`, 'Node pinned state must be boolean.');
      }
      return [nodeId, { x, y, ...(pinned === undefined ? {} : { pinned }) }];
    }),
  );
}

function normalizeIds(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_RUNTIME_COLLAPSED) {
    return fail(path, `Runtime collapsed ids are limited to ${MAX_RUNTIME_COLLAPSED}.`);
  }
  const values = value.map((entry, index) => id(entry, `${path}[${index}]`));
  if (new Set(values).size !== values.length) return fail(path, 'Runtime ids must be unique.');
  return values;
}

function normalizeLasso(value: unknown): readonly Point[] {
  if (!Array.isArray(value)) return [];
  if (value.length !== 0 && value.length < 3) {
    return fail('$.lasso', 'Network lasso must be empty or contain at least three points.');
  }
  if (value.length > MAX_NETWORK_LASSO_POINTS) {
    return fail('$.lasso', `Network lasso is limited to ${MAX_NETWORK_LASSO_POINTS} points.`);
  }
  return value.map((entry, index) => {
    const point = object(entry);
    const x = point?.x;
    const y = point?.y;
    if (
      typeof x !== 'number' ||
      !Number.isFinite(x) ||
      x < 0 ||
      x > 1 ||
      typeof y !== 'number' ||
      !Number.isFinite(y) ||
      y < 0 ||
      y > 1
    ) {
      return fail(`$.lasso[${index}]`, 'Lasso points must use finite normalized x/y values.');
    }
    return { x, y };
  });
}

export function normalizeNetworkRuntimeState(
  value: Partial<ChartNetworkRuntimeState>,
  fallback: ChartNetworkRuntimeState = { positions: {}, collapsed: [], lasso: [] },
): ChartNetworkRuntimeState {
  return {
    positions: normalizePositions(value.positions ?? fallback.positions, '$.positions'),
    collapsed: normalizeIds(value.collapsed ?? fallback.collapsed, '$.collapsed'),
    lasso: normalizeLasso(value.lasso ?? fallback.lasso),
  };
}

export function normalizeFlowRuntimeState(
  value: Partial<ChartFlowRuntimeState>,
  fallback: ChartFlowRuntimeState = { positions: {} },
): ChartFlowRuntimeState {
  return { positions: normalizePositions(value.positions ?? fallback.positions, '$.positions') };
}

/** Converts a validated runtime state to an authored mark-options fragment. */
export function tableRuntimeOptions(
  state: ChartTableRuntimeState,
): Readonly<Record<string, JsonValue>> {
  return {
    filters: state.filters as unknown as JsonValue,
    sort: state.sort as unknown as JsonValue,
    group: state.group as unknown as JsonValue,
    pivot: state.pivot as unknown as JsonValue,
    windowOffset: state.windowOffset,
    windowLimit: state.windowLimit,
    columnOffset: state.columnOffset,
    columnLimit: state.columnLimit,
  };
}

export function networkRuntimeOptions(
  state: ChartNetworkRuntimeState,
): Readonly<Record<string, JsonValue>> {
  return {
    positions: state.positions as unknown as JsonValue,
    collapsed: state.collapsed,
    lasso: state.lasso as unknown as JsonValue,
  };
}

export function flowRuntimeOptions(
  state: ChartFlowRuntimeState,
): Readonly<Record<string, JsonValue>> {
  return { positions: state.positions as unknown as JsonValue };
}
