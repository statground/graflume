import { GraflumeError } from '../core/errors.js';

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite number.`, { path });
  }
  return value;
}

function label(value: string, path: string): string {
  const normalized = value.trim();
  if (normalized === '')
    throw new GraflumeError('INVALID_DATA', `${path} must be non-empty.`, { path });
  return normalized;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export interface PieDatum {
  readonly id: string;
  readonly value: number;
  readonly label?: string;
}

export interface PieOptions {
  readonly negative?: 'reject' | 'absolute' | 'hide';
  readonly zero?: 'hide' | 'minimum';
  readonly minimumAngle?: number;
  readonly sort?: 'input' | 'ascending' | 'descending';
  readonly padAngle?: number;
  readonly startAngle?: number;
  readonly endAngle?: number;
}

export interface PieSlice {
  readonly id: string;
  readonly label: string;
  readonly rawValue: number;
  readonly value: number;
  readonly proportion: number;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly padAngle: number;
  readonly minimumApplied: boolean;
  readonly tabIndex: number;
  readonly accessibleLabel: string;
}

/** Resolves pie zero/negative, minimum-slice, sorting, padding and keyboard traversal semantics. */
export function layoutPie(
  data: readonly PieDatum[],
  options: PieOptions = {},
): readonly PieSlice[] {
  const negative = options.negative ?? 'reject';
  const zero = options.zero ?? 'hide';
  const values = data.flatMap((datum, index) => {
    const id = label(datum.id, `$.data[${index}].id`);
    const rawValue = finite(datum.value, `$.data[${index}].value`);
    if (rawValue < 0 && negative === 'reject')
      throw new GraflumeError('INVALID_DATA', 'Negative pie values require an explicit policy.');
    if (rawValue < 0 && negative === 'hide') return [];
    if (rawValue === 0 && zero === 'hide') return [];
    return [
      {
        id,
        label: datum.label?.trim() || id,
        rawValue,
        value: Math.abs(rawValue),
        inputIndex: index,
      },
    ];
  });
  if (new Set(values.map(({ id }) => id)).size !== values.length)
    throw new GraflumeError('INVALID_DATA', 'Pie ids must be unique.');
  if (options.sort === 'ascending')
    values.sort((a, b) => a.value - b.value || a.inputIndex - b.inputIndex);
  if (options.sort === 'descending')
    values.sort((a, b) => b.value - a.value || a.inputIndex - b.inputIndex);
  const start = finite(options.startAngle ?? -Math.PI / 2, '$.startAngle');
  const end = finite(options.endAngle ?? start + Math.PI * 2, '$.endAngle');
  if (end <= start || end - start > Math.PI * 2 + 1e-9)
    throw new GraflumeError(
      'INVALID_SPEC',
      'Pie angle range must be ascending and at most one turn.',
    );
  const pad = clamp(
    finite(options.padAngle ?? 0, '$.padAngle'),
    0,
    (end - start) / Math.max(1, values.length * 2),
  );
  const minimum = clamp(
    finite(options.minimumAngle ?? (zero === 'minimum' ? 0.01 : 0), '$.minimumAngle'),
    0,
    (end - start) / Math.max(1, values.length),
  );
  const available = end - start - pad * values.length;
  const rawTotal = values.reduce((sum, { value }) => sum + value, 0);
  const provisional = values.map(({ value }) =>
    rawTotal === 0 ? 0 : (value / rawTotal) * available,
  );
  const fixed = provisional.map((angle) => angle < minimum);
  const fixedTotal = fixed.filter(Boolean).length * minimum;
  const flexibleTotal = provisional.reduce(
    (sum, angle, index) => sum + (fixed[index] ? 0 : angle),
    0,
  );
  if (fixedTotal > available + 1e-9)
    throw new GraflumeError('INVALID_SPEC', 'minimumAngle cannot fit all pie slices.');
  const angles = provisional.map((angle, index) =>
    fixed[index]
      ? minimum
      : flexibleTotal === 0
        ? 0
        : (angle * (available - fixedTotal)) / flexibleTotal,
  );
  let cursor = start;
  return values.map((datum, index) => {
    const sliceStart = cursor + pad / 2;
    const sliceEnd = sliceStart + angles[index]!;
    cursor += angles[index]! + pad;
    const proportion = rawTotal === 0 ? 0 : datum.value / rawTotal;
    return {
      id: datum.id,
      label: datum.label,
      rawValue: datum.rawValue,
      value: datum.value,
      proportion,
      startAngle: sliceStart,
      endAngle: sliceEnd,
      padAngle: pad,
      minimumApplied: fixed[index]!,
      tabIndex: index === 0 ? 0 : -1,
      accessibleLabel: `${datum.label}: ${datum.value} (${(proportion * 100).toFixed(1)}%)`,
    };
  });
}

/** Roving keyboard focus for circular slice traversal. */
export function nextPieSlice(
  slices: readonly Pick<PieSlice, 'id'>[],
  current: string | null,
  direction: 'next' | 'previous' | 'first' | 'last',
): string | null {
  if (slices.length === 0) return null;
  if (direction === 'first') return slices[0]!.id;
  if (direction === 'last') return slices.at(-1)!.id;
  const index = Math.max(
    0,
    slices.findIndex(({ id }) => id === current),
  );
  const delta = direction === 'next' ? 1 : -1;
  return slices[(index + delta + slices.length) % slices.length]!.id;
}

export interface TimelineDatum {
  readonly id: string;
  readonly start: number;
  readonly end?: number;
  readonly group?: string;
  readonly label?: string;
  readonly milestone?: boolean;
  readonly dependencies?: readonly string[];
}

export interface TimelineOptions {
  readonly domain?: readonly [number, number];
  readonly groupOrder?: readonly string[];
  readonly clip?: boolean;
}

export interface TimelineItem {
  readonly id: string;
  readonly group: string;
  readonly lane: number;
  readonly start: number;
  readonly end: number;
  readonly clippedStart: number;
  readonly clippedEnd: number;
  readonly duration: number;
  readonly visibleDuration: number;
  readonly milestone: boolean;
  readonly clipped: boolean;
  readonly dependencies: readonly string[];
  readonly durationLabel: string;
}

/** Packs overlapping intervals into grouped lanes with milestones, clipping, durations and navigator domain. */
export function layoutTimeline(data: readonly TimelineDatum[], options: TimelineOptions = {}) {
  const normalized = data.map((datum, index) => {
    const id = label(datum.id, `$.data[${index}].id`);
    const start = finite(datum.start, `$.data[${index}].start`);
    const end = datum.end === undefined ? start : finite(datum.end, `$.data[${index}].end`);
    if (end < start)
      throw new GraflumeError('INVALID_DATA', 'Timeline end must be at or after start.');
    return {
      id,
      start,
      end,
      group: datum.group?.trim() || 'default',
      label: datum.label?.trim() || id,
      milestone: datum.milestone === true || end === start,
      dependencies: [...(datum.dependencies ?? [])],
    };
  });
  if (new Set(normalized.map(({ id }) => id)).size !== normalized.length)
    throw new GraflumeError('INVALID_DATA', 'Timeline ids must be unique.');
  const ids = new Set(normalized.map(({ id }) => id));
  normalized.forEach(({ dependencies, id }) =>
    dependencies.forEach((dependency) => {
      if (!ids.has(dependency))
        throw new GraflumeError(
          'INVALID_DATA',
          `Timeline item "${id}" references unknown dependency "${dependency}".`,
        );
    }),
  );
  const rawObserved: readonly [number, number] =
    normalized.length === 0
      ? [0, 1]
      : [
          Math.min(...normalized.map(({ start }) => start)),
          Math.max(...normalized.map(({ end }) => end)),
        ];
  const observed: readonly [number, number] =
    rawObserved[0] === rawObserved[1]
      ? [
          rawObserved[0] - (rawObserved[0] === 0 ? 1 : Math.abs(rawObserved[0]) * 0.05),
          rawObserved[1] + (rawObserved[1] === 0 ? 1 : Math.abs(rawObserved[1]) * 0.05),
        ]
      : rawObserved;
  const authoredDomain = options.domain ?? observed;
  if (authoredDomain[1] < authoredDomain[0])
    throw new GraflumeError('INVALID_SPEC', 'Timeline domain must be ascending.');
  const domain: readonly [number, number] =
    authoredDomain[0] === authoredDomain[1]
      ? [
          authoredDomain[0] - (authoredDomain[0] === 0 ? 1 : Math.abs(authoredDomain[0]) * 0.05),
          authoredDomain[1] + (authoredDomain[1] === 0 ? 1 : Math.abs(authoredDomain[1]) * 0.05),
        ]
      : authoredDomain;
  const groupOrder = options.groupOrder ?? [...new Set(normalized.map(({ group }) => group))];
  const groupIndex = new Map(groupOrder.map((group, index) => [group, index]));
  normalized.forEach(({ group }) => {
    if (!groupIndex.has(group))
      throw new GraflumeError('INVALID_SPEC', `Timeline groupOrder omits "${group}".`);
  });
  const laneEnds = new Map<string, number[]>();
  const items = [...normalized]
    .sort(
      (a, b) =>
        groupIndex.get(a.group)! - groupIndex.get(b.group)! ||
        a.start - b.start ||
        a.end - b.end ||
        a.id.localeCompare(b.id),
    )
    .flatMap((datum): TimelineItem[] => {
      const clip = options.clip !== false;
      const clippedStart = clip ? Math.max(domain[0], datum.start) : datum.start;
      const clippedEnd = clip ? Math.min(domain[1], datum.end) : datum.end;
      if (clip && clippedEnd < clippedStart) return [];
      const lanes = laneEnds.get(datum.group) ?? [];
      let lane = lanes.findIndex((end) => end <= datum.start);
      if (lane < 0) {
        lane = lanes.length;
        lanes.push(datum.end);
      } else lanes[lane] = datum.end;
      laneEnds.set(datum.group, lanes);
      const duration = datum.end - datum.start;
      const visibleDuration = Math.max(0, clippedEnd - clippedStart);
      return [
        {
          id: datum.id,
          group: datum.group,
          lane,
          start: datum.start,
          end: datum.end,
          clippedStart,
          clippedEnd,
          duration,
          visibleDuration,
          milestone: datum.milestone,
          clipped: clip && (clippedStart !== datum.start || clippedEnd !== datum.end),
          dependencies: datum.dependencies,
          durationLabel: datum.milestone ? 'milestone' : `${duration}`,
        },
      ];
    });
  const maximumLane = Math.max(0, ...items.map(({ lane }) => lane));
  return {
    domain,
    groups: groupOrder.map((group) => ({ group, lanes: laneEnds.get(group)?.length ?? 0 })),
    items,
    navigator: { minimum: observed[0], maximum: observed[1], start: domain[0], end: domain[1] },
    laneCount: maximumLane + 1,
  };
}

export interface GaugeBand {
  readonly from: number;
  readonly to: number;
  readonly color?: string;
  readonly label?: string;
}

export interface GaugeOptions {
  readonly type?: 'radial' | 'linear';
  readonly minimum?: number;
  readonly maximum?: number;
  readonly targets?: readonly number[];
  readonly bands?: readonly GaugeBand[];
  readonly ticks?: readonly number[] | number;
  readonly format?: (value: number) => string;
}

/** Builds radial/linear gauge bands, targets, custom ticks and an exact accessible numeric summary. */
export function gaugeModel(value: number, options: GaugeOptions = {}) {
  const minimum = finite(options.minimum ?? 0, '$.minimum');
  const maximum = finite(options.maximum ?? 100, '$.maximum');
  if (maximum <= minimum)
    throw new GraflumeError('INVALID_SPEC', 'Gauge maximum must exceed minimum.');
  const current = finite(value, '$.value');
  const format = options.format ?? ((number: number) => String(Number(number.toPrecision(8))));
  const bands = (options.bands ?? []).map((band, index) => {
    const from = finite(band.from, `$.bands[${index}].from`);
    const to = finite(band.to, `$.bands[${index}].to`);
    if (to <= from || from < minimum || to > maximum)
      throw new GraflumeError(
        'INVALID_SPEC',
        'Gauge bands must be ascending and inside the domain.',
      );
    return { ...band, from, to };
  });
  for (let index = 1; index < bands.length; index += 1)
    if (bands[index]!.from < bands[index - 1]!.to)
      throw new GraflumeError('INVALID_SPEC', 'Gauge bands must not overlap.');
  const authoredTicks = typeof options.ticks === 'number' ? undefined : options.ticks;
  const tickCount = clamp(Math.floor(typeof options.ticks === 'number' ? options.ticks : 5), 2, 50);
  const ticks: number[] =
    authoredTicks === undefined
      ? Array.from(
          { length: tickCount },
          (_, index) => minimum + ((maximum - minimum) * index) / (tickCount - 1),
        )
      : authoredTicks.map((tick, index) => finite(tick, `$.ticks[${index}]`));
  const targets = (options.targets ?? []).map((target, index) =>
    finite(target, `$.targets[${index}]`),
  );
  const activeBand = bands.find((band) => current >= band.from && current <= band.to) ?? null;
  return {
    type: options.type ?? 'radial',
    value: current,
    minimum,
    maximum,
    position: clamp((current - minimum) / (maximum - minimum), 0, 1),
    bands: bands.map((band) => ({
      ...band,
      start: (band.from - minimum) / (maximum - minimum),
      end: (band.to - minimum) / (maximum - minimum),
    })),
    activeBand,
    targets: targets.map((target) => ({
      value: target,
      position: (target - minimum) / (maximum - minimum),
    })),
    ticks: ticks.map((tick) => ({
      value: tick,
      position: (tick - minimum) / (maximum - minimum),
      label: format(tick),
    })),
    accessibleSummary: `Value ${format(current)}; range ${format(minimum)} to ${format(maximum)}${targets.length === 0 ? '' : `; targets ${targets.map(format).join(', ')}`}${activeBand?.label === undefined ? '' : `; band ${activeBand.label}`}.`,
  };
}

export type TableFilter =
  | {
      readonly field: string;
      readonly operator: 'equals' | 'not-equals' | 'contains';
      readonly value: unknown;
    }
  | {
      readonly field: string;
      readonly operator: 'greater' | 'greater-or-equal' | 'less' | 'less-or-equal';
      readonly value: number;
    };

export interface TableSort {
  readonly field: string;
  readonly direction?: 'ascending' | 'descending';
}
export interface TableGroup {
  readonly fields: readonly string[];
  readonly aggregates: readonly {
    readonly field: string;
    readonly op: 'count' | 'sum' | 'mean' | 'min' | 'max';
    readonly as: string;
  }[];
}
export interface TablePivot {
  readonly row: string;
  readonly column: string;
  readonly value: string;
  readonly op?: 'count' | 'sum' | 'mean';
}

export interface TableModelOptions {
  readonly filters?: readonly TableFilter[];
  readonly sort?: readonly TableSort[];
  readonly group?: TableGroup;
  readonly pivot?: TablePivot;
  readonly window?: { readonly offset?: number; readonly limit?: number };
  readonly columnWindow?: { readonly offset?: number; readonly limit?: number };
  readonly frozenRows?: number;
  readonly frozenColumns?: number;
}

export type TableFormatter = (
  value: unknown,
  row: Readonly<Record<string, unknown>>,
  locale?: string,
) => string;

export class TableFormatterRegistry {
  readonly #formatters = new Map<string, TableFormatter>();

  register(id: string, formatter: TableFormatter): void {
    const normalized = label(id, '$.id');
    if (this.#formatters.has(normalized))
      throw new GraflumeError('INVALID_SPEC', `Duplicate table formatter "${id}".`);
    this.#formatters.set(normalized, formatter);
  }

  format(
    id: string,
    value: unknown,
    row: Readonly<Record<string, unknown>>,
    locale?: string,
  ): string {
    const formatter = this.#formatters.get(id);
    if (formatter === undefined)
      throw new GraflumeError('INVALID_SPEC', `Unknown table formatter "${id}".`);
    return formatter(value, row, locale);
  }

  ids(): readonly string[] {
    return [...this.#formatters.keys()];
  }
}

function tableDate(value: unknown): Date | null {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

/** Creates the locale-aware built-in registry used by compiled tables and custom runtimes. */
export function createTableFormatterRegistry(): TableFormatterRegistry {
  const registry = new TableFormatterRegistry();
  registry.register('string', (value) => String(value ?? ''));
  registry.register('number', (value, _row, locale) =>
    typeof value === 'number'
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value)
      : String(value ?? ''),
  );
  registry.register('integer', (value, _row, locale) =>
    typeof value === 'number'
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
      : String(value ?? ''),
  );
  registry.register('percent', (value, _row, locale) =>
    typeof value === 'number'
      ? new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(value)
      : String(value ?? ''),
  );
  registry.register('date', (value, _row, locale) => {
    const date = tableDate(value);
    return date === null
      ? String(value ?? '')
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
  });
  registry.register('datetime', (value, _row, locale) => {
    const date = tableDate(value);
    return date === null
      ? String(value ?? '')
      : new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'medium',
          timeZone: 'UTC',
        }).format(date);
  });
  registry.register('json', (value) => JSON.stringify(value));
  return registry;
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true });
}

function matchesFilter(row: Readonly<Record<string, unknown>>, filter: TableFilter): boolean {
  const value = row[filter.field];
  if (filter.operator === 'equals') return Object.is(value, filter.value);
  if (filter.operator === 'not-equals') return !Object.is(value, filter.value);
  if (filter.operator === 'contains')
    return String(value ?? '')
      .toLocaleLowerCase()
      .includes(String(filter.value ?? '').toLocaleLowerCase());
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return false;
  const threshold = finite(filter.value, `$.filters.${filter.field}.value`);
  if (filter.operator === 'greater') return numeric > threshold;
  if (filter.operator === 'greater-or-equal') return numeric >= threshold;
  if (filter.operator === 'less') return numeric < threshold;
  return numeric <= threshold;
}

function aggregateRows(rows: readonly Readonly<Record<string, unknown>>[], group: TableGroup) {
  const buckets = new Map<
    string,
    { keys: Record<string, unknown>; rows: readonly Readonly<Record<string, unknown>>[] }
  >();
  rows.forEach((row) => {
    const keyValues = group.fields.map((field) => row[field]);
    const key = JSON.stringify(keyValues);
    const bucket = buckets.get(key);
    if (bucket === undefined)
      buckets.set(key, {
        keys: Object.fromEntries(group.fields.map((field, index) => [field, keyValues[index]])),
        rows: [row],
      });
    else buckets.set(key, { ...bucket, rows: [...bucket.rows, row] });
  });
  return [...buckets.values()].map(({ keys, rows: values }) => ({
    ...keys,
    ...Object.fromEntries(
      group.aggregates.map(({ field, op, as }) => {
        const numeric = values.map((row) => Number(row[field])).filter(Number.isFinite);
        const result =
          op === 'count'
            ? values.length
            : numeric.length === 0
              ? null
              : op === 'sum'
                ? numeric.reduce((sum, value) => sum + value, 0)
                : op === 'mean'
                  ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
                  : op === 'min'
                    ? Math.min(...numeric)
                    : Math.max(...numeric);
        return [as, result];
      }),
    ),
    __count: values.length,
  }));
}

function pivotRows(rows: readonly Readonly<Record<string, unknown>>[], pivot: TablePivot) {
  const grouped = new Map<string, Map<string, number[]>>();
  rows.forEach((row) => {
    const rowKey = String(row[pivot.row] ?? '');
    const columnKey = String(row[pivot.column] ?? '');
    const columns = grouped.get(rowKey) ?? new Map<string, number[]>();
    const values = columns.get(columnKey) ?? [];
    if ((pivot.op ?? 'sum') === 'count') values.push(1);
    else {
      const value = Number(row[pivot.value]);
      if (Number.isFinite(value)) values.push(value);
    }
    columns.set(columnKey, values);
    grouped.set(rowKey, columns);
  });
  return [...grouped].map(([rowKey, columns]) => ({
    [pivot.row]: rowKey,
    ...Object.fromEntries(
      [...columns].map(([column, values]) => [
        column,
        (pivot.op ?? 'sum') === 'mean'
          ? values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
          : values.reduce((sum, value) => sum + value, 0),
      ]),
    ),
  }));
}

/** Applies filter→group/pivot→sort→two-dimensional virtual windows with frozen regions. */
export function buildTableModel(
  rows: readonly Readonly<Record<string, unknown>>[],
  options: TableModelOptions = {},
) {
  const sourceColumns = [
    ...new Set(rows.flatMap((row) => Object.keys(row).filter((field) => !field.startsWith('__')))),
  ];
  const schemaColumns =
    options.group !== undefined
      ? [...options.group.fields, ...options.group.aggregates.map(({ as }) => as)]
      : options.pivot !== undefined
        ? [
            options.pivot.row,
            ...new Set(
              rows
                .map((row) => row[options.pivot!.column])
                .filter((value) => value !== null && value !== undefined)
                .map(String),
            ),
          ]
        : sourceColumns;
  let output: Readonly<Record<string, unknown>>[] = rows.map((row, sourceIndex) => ({
    ...row,
    __sourceIndex: sourceIndex,
  }));
  output = output.filter((row) =>
    (options.filters ?? []).every((filter) => matchesFilter(row, filter)),
  );
  if (options.group !== undefined) output = aggregateRows(output, options.group);
  if (options.pivot !== undefined) output = pivotRows(output, options.pivot);
  output = [...output].sort((left, right) => {
    for (const sort of options.sort ?? []) {
      const comparison = compareValues(left[sort.field], right[sort.field]);
      if (comparison !== 0) return sort.direction === 'descending' ? -comparison : comparison;
    }
    return compareValues(left.__sourceIndex, right.__sourceIndex);
  });
  const totalRows = output.length;
  const offset = clamp(Math.floor(options.window?.offset ?? 0), 0, totalRows);
  const limit = clamp(Math.floor(options.window?.limit ?? totalRows), 0, 100_000);
  const columns = [
    ...new Set([
      ...schemaColumns,
      ...output.flatMap((row) => Object.keys(row).filter((field) => !field.startsWith('__'))),
    ]),
  ];
  const frozenRows = clamp(Math.floor(options.frozenRows ?? 0), 0, totalRows);
  const frozenColumns = clamp(Math.floor(options.frozenColumns ?? 0), 0, columns.length);
  const visibleIndices = [
    ...new Set([
      ...Array.from({ length: frozenRows }, (_, index) => index),
      ...Array.from(
        { length: Math.max(0, Math.min(totalRows, offset + limit) - offset) },
        (_, index) => offset + index,
      ),
    ]),
  ];
  const rowEntries = visibleIndices.map((index) => ({
    row: output[index]!,
    index,
    frozen: index < frozenRows,
  }));
  const columnOffset = clamp(Math.floor(options.columnWindow?.offset ?? 0), 0, columns.length);
  const columnLimit = clamp(Math.floor(options.columnWindow?.limit ?? columns.length), 0, 10_000);
  const visibleColumnIndices = [
    ...new Set([
      ...Array.from({ length: frozenColumns }, (_, index) => index),
      ...Array.from(
        {
          length: Math.max(0, Math.min(columns.length, columnOffset + columnLimit) - columnOffset),
        },
        (_, index) => columnOffset + index,
      ),
    ]),
  ];
  const columnEntries = visibleColumnIndices.map((index) => ({
    field: columns[index]!,
    index,
    frozen: index < frozenColumns,
  }));
  return {
    rows: rowEntries.map(({ row }) => row),
    rowEntries,
    columns,
    columnEntries,
    totalRows,
    totalColumns: columns.length,
    window: { offset, limit, end: Math.min(totalRows, offset + limit) },
    columnWindow: {
      offset: columnOffset,
      limit: columnLimit,
      end: Math.min(columns.length, columnOffset + columnLimit),
    },
    frozen: {
      rows: frozenRows,
      columns: frozenColumns,
    },
  };
}

/** WAI-ARIA-grid style bounded keyboard cell navigation. */
export function moveTableCell(
  position: { readonly row: number; readonly column: number },
  key:
    'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End' | 'PageUp' | 'PageDown',
  bounds: { readonly rows: number; readonly columns: number; readonly pageSize?: number },
) {
  let row = clamp(Math.floor(position.row), 0, Math.max(0, bounds.rows - 1));
  let column = clamp(Math.floor(position.column), 0, Math.max(0, bounds.columns - 1));
  if (key === 'ArrowUp') row -= 1;
  if (key === 'ArrowDown') row += 1;
  if (key === 'ArrowLeft') column -= 1;
  if (key === 'ArrowRight') column += 1;
  if (key === 'Home') column = 0;
  if (key === 'End') column = bounds.columns - 1;
  if (key === 'PageUp') row -= Math.max(1, Math.floor(bounds.pageSize ?? 10));
  if (key === 'PageDown') row += Math.max(1, Math.floor(bounds.pageSize ?? 10));
  return {
    row: clamp(row, 0, Math.max(0, bounds.rows - 1)),
    column: clamp(column, 0, Math.max(0, bounds.columns - 1)),
  };
}

export interface PolarDatum {
  readonly angle: number;
  readonly value: number;
  readonly series?: string;
  readonly id?: string;
}

export interface PolarOptions {
  readonly zero?: number;
  readonly direction?: 'clockwise' | 'counterclockwise';
  readonly wrap?: readonly [number, number];
  readonly radiusScale?: 'linear' | 'sqrt' | 'log';
  readonly bins?: number;
  readonly stack?: 'none' | 'stack' | 'normalize';
}

/** Resolves zero/direction/wrap, radial transforms, angular bins and stacked/normalized radial bars. */
export function layoutPolar(data: readonly PolarDatum[], options: PolarOptions = {}) {
  const wrap = options.wrap ?? [0, 360];
  if (wrap[1] <= wrap[0]) throw new GraflumeError('INVALID_SPEC', 'Polar wrap must be ascending.');
  const bins = clamp(Math.floor(options.bins ?? Math.max(1, data.length)), 1, 720);
  const binWidth = (wrap[1] - wrap[0]) / bins;
  const normalizeAngle = (angle: number) => {
    const span = wrap[1] - wrap[0];
    const wrapped = ((((angle - wrap[0]) % span) + span) % span) + wrap[0];
    const directed =
      (options.direction ?? 'clockwise') === 'clockwise' ? wrapped : wrap[1] - (wrapped - wrap[0]);
    return directed + (options.zero ?? 0);
  };
  const normalized = data.map((datum, index) => ({
    id: datum.id?.trim() || `polar-${index}`,
    series: datum.series?.trim() || 'series',
    angle: normalizeAngle(finite(datum.angle, `$.data[${index}].angle`)),
    value: finite(datum.value, `$.data[${index}].value`),
  }));
  if (options.radiusScale === 'log' && normalized.some(({ value }) => value <= 0)) {
    throw new GraflumeError('INVALID_DATA', 'Polar log radius requires positive values.');
  }
  const grouped = new Map<number, typeof normalized>();
  normalized.forEach((datum) => {
    const bin = clamp(
      Math.floor(
        ((((datum.angle - (options.zero ?? 0) - wrap[0]) % (wrap[1] - wrap[0])) +
          (wrap[1] - wrap[0])) %
          (wrap[1] - wrap[0])) /
          binWidth,
      ),
      0,
      bins - 1,
    );
    const values = grouped.get(bin) ?? [];
    values.push(datum);
    grouped.set(bin, values);
  });
  const stackMode = options.stack ?? 'none';
  const maximum =
    stackMode === 'normalize'
      ? 1
      : stackMode === 'stack'
        ? Math.max(
            ...[...grouped.values()].map((values) =>
              values.reduce((sum, { value }) => sum + Math.max(0, value), 0),
            ),
            Number.EPSILON,
          )
        : Math.max(...normalized.map(({ value }) => value), Number.EPSILON);
  const radius = (value: number) => {
    if (options.radiusScale === 'log') {
      if (value < 0)
        throw new GraflumeError('INVALID_DATA', 'Polar log radius requires positive values.');
      if (value === 0) return 0;
      return Math.log1p(value) / Math.log1p(maximum);
    }
    if (options.radiusScale === 'sqrt') return Math.sqrt(Math.max(0, value) / maximum);
    return Math.max(0, value) / maximum;
  };
  const segments = [...grouped.entries()].flatMap(([bin, values]) => {
    const total = values.reduce((sum, { value }) => sum + Math.max(0, value), 0);
    let cursor = 0;
    return values.map((datum) => {
      const amount =
        stackMode === 'normalize'
          ? total === 0
            ? 0
            : Math.max(0, datum.value) / total
          : Math.max(0, datum.value);
      const inner = stackMode === 'none' ? 0 : cursor;
      const outer = inner + amount;
      cursor = outer;
      return {
        ...datum,
        bin,
        startAngle: (options.zero ?? 0) + wrap[0] + bin * binWidth,
        endAngle: (options.zero ?? 0) + wrap[0] + (bin + 1) * binWidth,
        innerValue: inner,
        outerValue: outer,
        innerRadius: radius(inner),
        outerRadius: radius(outer),
        proportion: total === 0 ? 0 : Math.max(0, datum.value) / total,
      };
    });
  });
  return {
    wrap,
    zero: options.zero ?? 0,
    direction: options.direction ?? 'clockwise',
    bins,
    binWidth,
    segments,
  };
}

export interface RankedBarDatum {
  readonly id: string;
  readonly value?: number;
  readonly weight?: number;
  readonly category?: string;
}

/** Computes weighted counts, deterministic sort/rank and stable rank-change metadata for interactive bars. */
export function rankBars(
  data: readonly RankedBarDatum[],
  options: {
    readonly aggregate?: 'value' | 'count' | 'weighted-count';
    readonly previousRanks?: Readonly<Record<string, number>>;
    readonly direction?: 'ascending' | 'descending';
  } = {},
) {
  const grouped = new Map<string, { value: number; sourceIds: string[] }>();
  data.forEach((datum, index) => {
    const category = datum.category?.trim() || label(datum.id, `$.data[${index}].id`);
    const contribution =
      options.aggregate === 'count'
        ? 1
        : options.aggregate === 'weighted-count'
          ? finite(datum.weight ?? 1, `$.data[${index}].weight`)
          : finite(datum.value ?? 0, `$.data[${index}].value`);
    if (contribution < 0 && options.aggregate === 'weighted-count')
      throw new GraflumeError('INVALID_DATA', 'Bar weights must be non-negative.');
    const bucket = grouped.get(category) ?? { value: 0, sourceIds: [] };
    bucket.value += contribution;
    bucket.sourceIds.push(datum.id);
    grouped.set(category, bucket);
  });
  const direction = options.direction ?? 'descending';
  return [...grouped]
    .sort((a, b) =>
      direction === 'descending'
        ? b[1].value - a[1].value || a[0].localeCompare(b[0])
        : a[1].value - b[1].value || a[0].localeCompare(b[0]),
    )
    .map(([id, value], index) => {
      const rank = index + 1;
      const previous = options.previousRanks?.[id] ?? null;
      return {
        id,
        rank,
        previousRank: previous,
        rankChange: previous === null ? null : previous - rank,
        ...value,
      };
    });
}
