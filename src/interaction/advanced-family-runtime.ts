import { GraflumeError } from '../core/errors.js';
import type { DataRow, JsonValue } from '../spec/types.js';
import type { Rect } from '../scene/types.js';

const MAX_HIERARCHY_IDS = 2_048;
const MAX_PARALLEL_AXES = 32;
const MAX_PARALLEL_BRUSHES = 64;
const MAX_MATRIX_ROWS = 100_000;
const MAX_HEATMAP_KEYS = 4_096;

export type ChartNavigatorFamily = 'candlestick' | 'timeline';

/** Domain-valued window owned by one live navigator. End is exclusive for candlesticks. */
export interface ChartNavigatorRuntimeState {
  readonly start: number;
  readonly end: number;
}

export interface ChartHierarchyRuntimeState {
  /** Authored hierarchy root. Null restores the compiler-discovered root. */
  readonly root: string | null;
  /** Transient zoom root. Null shows the complete authored root. */
  readonly zoomTo: string | null;
  readonly collapsed: readonly string[];
  readonly query: string;
}

export interface ChartParallelAxisRuntimeState {
  readonly field: string;
  readonly type: 'linear' | 'log' | 'ordinal';
  readonly invert: boolean;
  readonly missing: 'gap' | 'top' | 'bottom' | 'middle';
  readonly domain?: readonly (number | string)[];
}

export interface ChartParallelBrushRuntimeState {
  readonly field: string;
  /** One or more normalized axis intervals in the inclusive 0..1 range. */
  readonly extents: readonly (readonly [number, number])[];
}

export interface ChartParallelRuntimeState {
  readonly axes: readonly ChartParallelAxisRuntimeState[];
  readonly brushes: readonly ChartParallelBrushRuntimeState[];
  readonly combine: 'union' | 'intersection';
}

export interface ChartHeatmapRuntimeState {
  readonly rows: readonly (string | number)[];
  readonly columns: readonly (string | number)[];
  readonly value?: readonly [number, number];
}

export interface ChartScatterMatrixRuntimeState {
  readonly xField: string;
  readonly yField: string;
  readonly x: readonly [number, number];
  readonly y: readonly [number, number];
  /** Stable original table row identities selected by the cell-local brush. */
  readonly selectedRows: readonly number[];
}

/** Renderer-neutral payload emitted by candlestick and timeline navigator windows. */
export interface NavigatorWindowInteraction {
  readonly kind: 'navigator-window';
  readonly family: ChartNavigatorFamily;
  readonly minimum: number;
  readonly maximum: number;
  readonly start: number;
  readonly end: number;
  readonly plot: Rect;
}

/** Renderer-neutral payload emitted by an interactive hierarchy node. */
export interface HierarchyNodeInteraction {
  readonly kind: 'hierarchy-node';
  readonly id: string;
  readonly parent: string | null;
  readonly root: string;
  readonly leaf: boolean;
  readonly collapsed: boolean;
}

/** Renderer-neutral payload emitted by a parallel-coordinate axis. */
export interface ParallelAxisInteraction {
  readonly kind: 'parallel-axis';
  readonly field: string;
  readonly index: number;
  readonly count: number;
  readonly invert: boolean;
  readonly plot: Rect;
}

/** Renderer-neutral payload emitted by every interactive analytical heatmap cell. */
export interface HeatmapCellInteraction {
  readonly kind: 'heatmap-cell';
  readonly row: string | number;
  readonly column: string | number;
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly value: number | null;
}

/** Cell-local coordinate contract used to translate one matrix brush into linked row identities. */
export interface ScatterMatrixCellInteraction {
  readonly kind: 'scatter-matrix-cell';
  readonly xField: string;
  readonly yField: string;
  readonly row: number;
  readonly column: number;
  readonly plot: Rect;
  readonly xDomain: readonly [number, number];
  readonly yDomain: readonly [number, number];
}

function fail(path: string, message: string): never {
  throw new GraflumeError('INVALID_SPEC', message, { path });
}

function object(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(path, `${path} must be a finite number.`);
  }
  return value;
}

function field(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    value.trim() === '' ||
    value.length > 128 ||
    value === '__proto__' ||
    value === 'prototype' ||
    value === 'constructor'
  ) {
    return fail(path, `${path} must be a safe non-empty field name of at most 128 characters.`);
  }
  return value;
}

function identifier(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 256) {
    return fail(path, `${path} must be a non-empty id of at most 256 characters.`);
  }
  return value;
}

function boundedString(value: unknown, path: string, maximum = 512): string {
  if (typeof value !== 'string' || value.length > maximum) {
    return fail(path, `${path} must be a string of at most ${maximum} characters.`);
  }
  return value;
}

function normalizedExtent(value: unknown, path: string): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    return fail(path, `${path} must contain two normalized numbers.`);
  }
  const first = finite(value[0], `${path}[0]`);
  const second = finite(value[1], `${path}[1]`);
  if (first < 0 || first > 1 || second < 0 || second > 1) {
    return fail(path, `${path} values must be inside the inclusive 0..1 range.`);
  }
  return [Math.min(first, second), Math.max(first, second)];
}

function uniqueIds(value: unknown, path: string, maximum: number): readonly string[] {
  if (!Array.isArray(value) || value.length > maximum) {
    return fail(path, `${path} must be an array with at most ${maximum} ids.`);
  }
  const ids = value.map((entry, index) => identifier(entry, `${path}[${index}]`));
  if (new Set(ids).size !== ids.length) return fail(path, `${path} ids must be unique.`);
  return ids;
}

export function normalizeNavigatorRuntimeState(
  value: Partial<ChartNavigatorRuntimeState>,
  fallback: ChartNavigatorRuntimeState,
  bounds?: { readonly minimum: number; readonly maximum: number },
): ChartNavigatorRuntimeState {
  const minimum =
    bounds === undefined ? Number.NEGATIVE_INFINITY : finite(bounds.minimum, '$.minimum');
  const maximum =
    bounds === undefined ? Number.POSITIVE_INFINITY : finite(bounds.maximum, '$.maximum');
  if (minimum >= maximum)
    return fail('$.maximum', 'Navigator maximum must be greater than minimum.');
  const start = Math.max(
    minimum,
    Math.min(maximum, finite(value.start ?? fallback.start, '$.start')),
  );
  const end = Math.max(minimum, Math.min(maximum, finite(value.end ?? fallback.end, '$.end')));
  if (end <= start) return fail('$.end', 'Navigator end must be greater than start.');
  return { start, end };
}

export function navigatorRuntimeOptions(
  family: ChartNavigatorFamily,
  state: ChartNavigatorRuntimeState,
): Readonly<Record<string, JsonValue>> {
  return family === 'candlestick'
    ? { navigatorStart: Math.floor(state.start), navigatorEnd: Math.ceil(state.end) }
    : { domain: [state.start, state.end] };
}

export function normalizeHierarchyRuntimeState(
  value: Partial<ChartHierarchyRuntimeState>,
  fallback: ChartHierarchyRuntimeState = {
    root: null,
    zoomTo: null,
    collapsed: [],
    query: '',
  },
): ChartHierarchyRuntimeState {
  const rawRoot = value.root === undefined ? fallback.root : value.root;
  const rawZoom = value.zoomTo === undefined ? fallback.zoomTo : value.zoomTo;
  return {
    root: rawRoot === null ? null : identifier(rawRoot, '$.root'),
    zoomTo: rawZoom === null ? null : identifier(rawZoom, '$.zoomTo'),
    collapsed: uniqueIds(value.collapsed ?? fallback.collapsed, '$.collapsed', MAX_HIERARCHY_IDS),
    query: boundedString(value.query ?? fallback.query, '$.query'),
  };
}

export function hierarchyRuntimeOptions(
  state: ChartHierarchyRuntimeState,
): Readonly<Record<string, JsonValue>> {
  return {
    root: state.root,
    zoomTo: state.zoomTo,
    collapsed: state.collapsed,
    query: state.query,
  };
}

function normalizeParallelAxis(value: unknown, index: number): ChartParallelAxisRuntimeState {
  const axis = object(value);
  if (axis === null) return fail(`$.axes[${index}]`, 'Parallel axes must be objects.');
  const type = axis.type ?? 'linear';
  if (type !== 'linear' && type !== 'log' && type !== 'ordinal') {
    return fail(`$.axes[${index}].type`, 'Parallel axis type is invalid.');
  }
  const missing = axis.missing ?? 'gap';
  if (missing !== 'gap' && missing !== 'top' && missing !== 'bottom' && missing !== 'middle') {
    return fail(`$.axes[${index}].missing`, 'Parallel missing-value routing is invalid.');
  }
  let domain: readonly (number | string)[] | undefined;
  if (axis.domain !== undefined) {
    if (!Array.isArray(axis.domain) || axis.domain.length === 0 || axis.domain.length > 4_096) {
      return fail(`$.axes[${index}].domain`, 'Parallel axis domain must contain 1..4096 values.');
    }
    domain = axis.domain.map((entry, domainIndex) => {
      if (typeof entry === 'string') return entry;
      return finite(entry, `$.axes[${index}].domain[${domainIndex}]`);
    });
  }
  if (axis.invert !== undefined && typeof axis.invert !== 'boolean') {
    return fail(`$.axes[${index}].invert`, 'Parallel axis invert must be boolean.');
  }
  return {
    field: field(axis.field, `$.axes[${index}].field`),
    type,
    invert: axis.invert === true,
    missing,
    ...(domain === undefined ? {} : { domain }),
  };
}

function normalizeParallelBrush(value: unknown, index: number): ChartParallelBrushRuntimeState {
  const brush = object(value);
  if (brush === null) return fail(`$.brushes[${index}]`, 'Parallel brushes must be objects.');
  if (!Array.isArray(brush.extents) || brush.extents.length === 0 || brush.extents.length > 16) {
    return fail(`$.brushes[${index}].extents`, 'A parallel brush needs 1..16 extents.');
  }
  return {
    field: field(brush.field, `$.brushes[${index}].field`),
    extents: brush.extents.map((extent, extentIndex) =>
      normalizedExtent(extent, `$.brushes[${index}].extents[${extentIndex}]`),
    ),
  };
}

export function normalizeParallelRuntimeState(
  value: Partial<ChartParallelRuntimeState>,
  fallback: ChartParallelRuntimeState,
): ChartParallelRuntimeState {
  const rawAxes = value.axes ?? fallback.axes;
  if (!Array.isArray(rawAxes) || rawAxes.length < 2 || rawAxes.length > MAX_PARALLEL_AXES) {
    return fail('$.axes', `Parallel runtime requires 2..${MAX_PARALLEL_AXES} axes.`);
  }
  const axes = rawAxes.map(normalizeParallelAxis);
  if (new Set(axes.map(({ field }) => field)).size !== axes.length) {
    return fail('$.axes', 'Parallel axis fields must be unique.');
  }
  const rawBrushes = value.brushes ?? fallback.brushes;
  if (!Array.isArray(rawBrushes) || rawBrushes.length > MAX_PARALLEL_BRUSHES) {
    return fail('$.brushes', `Parallel runtime accepts at most ${MAX_PARALLEL_BRUSHES} brushes.`);
  }
  const brushes = rawBrushes.map(normalizeParallelBrush);
  const fields = new Set(axes.map(({ field }) => field));
  if (brushes.some((brush) => !fields.has(brush.field))) {
    return fail('$.brushes', 'Every parallel brush field must reference a runtime axis.');
  }
  const combine = value.combine ?? fallback.combine;
  if (combine !== 'union' && combine !== 'intersection') {
    return fail('$.combine', 'Parallel brush combine must be union or intersection.');
  }
  return { axes, brushes, combine };
}

export function parallelRuntimeOptions(
  state: ChartParallelRuntimeState,
): Readonly<Record<string, JsonValue>> {
  return {
    axes: state.axes as unknown as JsonValue,
    brushes: state.brushes as unknown as JsonValue,
    combine: state.combine,
  };
}

export function reorderParallelAxis(
  state: ChartParallelRuntimeState,
  fieldName: string,
  index: number,
): ChartParallelRuntimeState {
  const current = state.axes.findIndex(({ field }) => field === fieldName);
  if (current < 0) return fail('$.field', `Parallel axis "${fieldName}" was not found.`);
  if (!Number.isInteger(index) || index < 0 || index >= state.axes.length) {
    return fail('$.index', 'Parallel axis destination index is outside the axis list.');
  }
  const axes = [...state.axes];
  const [axis] = axes.splice(current, 1);
  axes.splice(index, 0, axis!);
  return { ...state, axes };
}

export function invertParallelAxis(
  state: ChartParallelRuntimeState,
  fieldName: string,
  invert?: boolean,
): ChartParallelRuntimeState {
  let found = false;
  const axes = state.axes.map((axis) => {
    if (axis.field !== fieldName) return axis;
    found = true;
    return { ...axis, invert: invert ?? !axis.invert };
  });
  if (!found) return fail('$.field', `Parallel axis "${fieldName}" was not found.`);
  return { ...state, axes };
}

export function setParallelBrushExtents(
  state: ChartParallelRuntimeState,
  fieldName: string,
  extents: readonly (readonly [number, number])[],
): ChartParallelRuntimeState {
  if (!state.axes.some(({ field }) => field === fieldName)) {
    return fail('$.field', `Parallel axis "${fieldName}" was not found.`);
  }
  const retained = state.brushes.filter(({ field }) => field !== fieldName);
  const brushes =
    extents.length === 0
      ? retained
      : [...retained, normalizeParallelBrush({ field: fieldName, extents }, retained.length)];
  return normalizeParallelRuntimeState({ brushes }, state);
}

function heatmapKeys(value: unknown, path: string): readonly (string | number)[] {
  if (!Array.isArray(value) || value.length > MAX_HEATMAP_KEYS) {
    return fail(path, `${path} must contain at most ${MAX_HEATMAP_KEYS} row or column keys.`);
  }
  return value.map((entry, index) => {
    if (typeof entry === 'string') return entry;
    return finite(entry, `${path}[${index}]`);
  });
}

export function normalizeHeatmapRuntimeState(
  value: Partial<ChartHeatmapRuntimeState>,
  fallback: ChartHeatmapRuntimeState = { rows: [], columns: [] },
): ChartHeatmapRuntimeState {
  const rawValue = value.value === undefined ? fallback.value : value.value;
  let extent: readonly [number, number] | undefined;
  if (rawValue !== undefined) {
    if (!Array.isArray(rawValue) || rawValue.length !== 2) {
      return fail('$.value', 'Heatmap value brush must contain two finite numbers.');
    }
    const first = finite(rawValue[0], '$.value[0]');
    const second = finite(rawValue[1], '$.value[1]');
    extent = [Math.min(first, second), Math.max(first, second)];
  }
  return {
    rows: heatmapKeys(value.rows ?? fallback.rows, '$.rows'),
    columns: heatmapKeys(value.columns ?? fallback.columns, '$.columns'),
    ...(extent === undefined ? {} : { value: extent }),
  };
}

export function heatmapRuntimeOptions(
  state: ChartHeatmapRuntimeState,
): Readonly<Record<string, JsonValue>> {
  return { brush: state as unknown as JsonValue };
}

export function normalizeScatterMatrixRuntimeState(
  value: Partial<ChartScatterMatrixRuntimeState>,
  fallback: ChartScatterMatrixRuntimeState,
): ChartScatterMatrixRuntimeState {
  const normalizeDomain = (
    candidate: unknown,
    previous: readonly [number, number],
    path: string,
  ): readonly [number, number] => {
    const input = candidate ?? previous;
    if (!Array.isArray(input) || input.length !== 2) {
      return fail(path, `${path} must contain two finite numbers.`);
    }
    const first = finite(input[0], `${path}[0]`);
    const second = finite(input[1], `${path}[1]`);
    if (first === second) return fail(path, `${path} must have a non-zero span.`);
    return [Math.min(first, second), Math.max(first, second)];
  };
  const rawRows = value.selectedRows ?? fallback.selectedRows;
  if (!Array.isArray(rawRows) || rawRows.length > MAX_MATRIX_ROWS) {
    return fail(
      '$.selectedRows',
      `Scatter-matrix selection is limited to ${MAX_MATRIX_ROWS} rows.`,
    );
  }
  const selectedRows = rawRows.map((entry, index) => {
    if (!Number.isInteger(entry) || entry < 0) {
      return fail(
        `$.selectedRows[${index}]`,
        'Selected row identities must be non-negative integers.',
      );
    }
    return entry;
  });
  return {
    xField: field(value.xField ?? fallback.xField, '$.xField'),
    yField: field(value.yField ?? fallback.yField, '$.yField'),
    x: normalizeDomain(value.x, fallback.x, '$.x'),
    y: normalizeDomain(value.y, fallback.y, '$.y'),
    selectedRows: [...new Set(selectedRows)].sort((left, right) => left - right),
  };
}

export function scatterMatrixRuntimeOptions(
  state: ChartScatterMatrixRuntimeState,
): Readonly<Record<string, JsonValue>> {
  return { linkedBrush: state as unknown as JsonValue };
}

/** Computes stable row identities from a cell-local numeric brush. */
export function selectScatterMatrixRows(
  rows: readonly DataRow[],
  brush: Pick<ChartScatterMatrixRuntimeState, 'xField' | 'yField' | 'x' | 'y'>,
): readonly number[] {
  const [x0, x1] = brush.x;
  const [y0, y1] = brush.y;
  return rows.flatMap((row, rowIndex) => {
    const x = row[brush.xField];
    const y = row[brush.yField];
    return typeof x === 'number' &&
      Number.isFinite(x) &&
      typeof y === 'number' &&
      Number.isFinite(y) &&
      x >= x0 &&
      x <= x1 &&
      y >= y0 &&
      y <= y1
      ? [rowIndex]
      : [];
  });
}

/** Converts a pointer rectangle in one matrix cell into numeric data-domain extents. */
export function scatterMatrixPointerBrush(
  cell: ScatterMatrixCellInteraction,
  start: { readonly x: number; readonly y: number },
  end: { readonly x: number; readonly y: number },
): Pick<ChartScatterMatrixRuntimeState, 'xField' | 'yField' | 'x' | 'y'> {
  const mapX = (pixel: number) =>
    cell.xDomain[0] +
    ((Math.max(cell.plot.x, Math.min(cell.plot.x + cell.plot.width, pixel)) - cell.plot.x) /
      Math.max(1, cell.plot.width)) *
      (cell.xDomain[1] - cell.xDomain[0]);
  const mapY = (pixel: number) =>
    cell.yDomain[0] +
    (1 -
      (Math.max(cell.plot.y, Math.min(cell.plot.y + cell.plot.height, pixel)) - cell.plot.y) /
        Math.max(1, cell.plot.height)) *
      (cell.yDomain[1] - cell.yDomain[0]);
  const x = [mapX(start.x), mapX(end.x)].sort((left, right) => left - right) as [number, number];
  const y = [mapY(start.y), mapY(end.y)].sort((left, right) => left - right) as [number, number];
  return { xField: cell.xField, yField: cell.yField, x, y };
}

/** Converts a navigator pointer delta to a clamped translated domain window. */
export function translateNavigatorWindow(
  interaction: NavigatorWindowInteraction,
  deltaPixels: number,
): ChartNavigatorRuntimeState {
  const span = interaction.end - interaction.start;
  const delta =
    (deltaPixels / Math.max(1, interaction.plot.width)) *
    (interaction.maximum - interaction.minimum);
  const start = Math.max(
    interaction.minimum,
    Math.min(interaction.maximum - span, interaction.start + delta),
  );
  return { start, end: start + span };
}
