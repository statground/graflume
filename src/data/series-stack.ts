import type {
  JsonValue,
  NormalizedLayerSpec,
  TransformSortField,
  TransformSpec,
} from '../spec/types.js';

export const seriesStackModes = [
  'grouped',
  'stacked',
  '100-percent',
  'diverging',
  'streamgraph',
] as const;

export type SeriesStackMode = (typeof seriesStackModes)[number];
export type SeriesStackOffset =
  'zero' | 'normalize' | 'expand' | 'center' | 'silhouette' | 'wiggle';
export type SeriesStackOrder =
  'input' | 'ascending' | 'descending' | 'sumAscending' | 'sumDescending' | 'insideOut';

/** Function-free options accepted by Area, Bar, and Theme river series layouts. */
export interface SeriesStackSpec {
  readonly mode?: SeriesStackMode;
  readonly offset?: SeriesStackOffset;
  readonly order?: SeriesStackOrder;
  readonly sort?: readonly TransformSortField[];
}

export interface ResolvedSeriesStackSpec {
  readonly mode: SeriesStackMode;
  readonly offset: SeriesStackOffset | null;
  readonly order: SeriesStackOrder;
  readonly sort?: readonly TransformSortField[];
  readonly seriesField: string;
  readonly categoryField: string;
  readonly valueField: string;
}

export interface SeriesStackFields {
  readonly source: string;
  readonly start: string;
  readonly end: string;
  readonly absoluteTotal: string;
  readonly positiveTotal: string;
  readonly negativeTotal: string;
  readonly netTotal: string;
  readonly series: string;
  readonly category: string;
}

export interface PreparedSeriesStack {
  readonly layer: NormalizedLayerSpec;
  readonly spec: ResolvedSeriesStackSpec;
  readonly fields: SeriesStackFields;
}

const STACK_FIELD_KEYS = {
  source: '__stackSource',
  start: '__stackStart',
  end: '__stackEnd',
  absoluteTotal: '__stackAbsoluteTotal',
  positiveTotal: '__stackPositiveTotal',
  negativeTotal: '__stackNegativeTotal',
  netTotal: '__stackNetTotal',
  series: '__stackSeries',
  category: '__stackCategory',
} as const;

function plainObject(value: JsonValue | undefined): Readonly<Record<string, JsonValue>> | null {
  return value !== null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Object]'
    ? (value as Readonly<Record<string, JsonValue>>)
    : null;
}

function stackMode(value: JsonValue | undefined): SeriesStackMode | null {
  return typeof value === 'string' && (seriesStackModes as readonly string[]).includes(value)
    ? (value as SeriesStackMode)
    : null;
}

function defaultOffset(mode: SeriesStackMode): SeriesStackOffset | null {
  if (mode === 'grouped') return null;
  if (mode === '100-percent') return 'normalize';
  if (mode === 'streamgraph') return 'wiggle';
  return 'zero';
}

function defaultOrder(mode: SeriesStackMode): SeriesStackOrder {
  return mode === 'streamgraph' ? 'insideOut' : 'input';
}

function safeToken(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function internalFields(layer: NormalizedLayerSpec): SeriesStackFields {
  const suffix = safeToken(
    `${layer.id}\u0000${layer.x.field}\u0000${layer.y.field}\u0000${layer.mark.fields.series ?? ''}`,
  );
  const field = (name: string): string => `__graflume_${name}_${suffix}`;
  return {
    source: field('stack_source'),
    start: field('stack_start'),
    end: field('stack_end'),
    absoluteTotal: field('stack_total'),
    positiveTotal: field('stack_positive_total'),
    negativeTotal: field('stack_negative_total'),
    netTotal: field('stack_net_total'),
    series: layer.mark.fields.series ?? layer.mark.fields.category ?? 'series',
    category:
      layer.mark.orientation === 'horizontal' && layer.mark.type === 'bar'
        ? layer.y.field
        : layer.x.field,
  };
}

function optionSort(value: JsonValue | undefined): readonly TransformSortField[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fields = value.flatMap((item) => {
    const object = plainObject(item);
    if (object === null || typeof object.field !== 'string') return [];
    const order = object.order;
    const entry: TransformSortField = {
      field: object.field,
      ...(order === 'ascending' || order === 'descending' ? { order } : {}),
    };
    return [entry];
  });
  return fields.length === value.length ? fields : undefined;
}

/**
 * Resolve the public series layout without executing data. Theme river keeps its
 * historical centered layout unless the streamgraph preset opts into wiggle.
 */
export function resolveSeriesStackSpec(layer: NormalizedLayerSpec): ResolvedSeriesStackSpec | null {
  if (!['area', 'bar', 'theme-river'].includes(layer.mark.type)) return null;
  const authored = layer.mark.options.stack;
  const object = plainObject(authored);
  const implicitThemeRiver = layer.mark.type === 'theme-river' && authored === undefined;
  const mode = implicitThemeRiver
    ? 'streamgraph'
    : (stackMode(authored) ?? stackMode(object?.mode) ?? null);
  if (mode === null) return null;
  const fields = internalFields(layer);
  const authoredOffset = object?.offset;
  const offset =
    typeof authoredOffset === 'string' &&
    ['zero', 'normalize', 'expand', 'center', 'silhouette', 'wiggle'].includes(authoredOffset)
      ? (authoredOffset as SeriesStackOffset)
      : implicitThemeRiver
        ? 'silhouette'
        : defaultOffset(mode);
  const authoredOrder = object?.order;
  const order =
    typeof authoredOrder === 'string' &&
    ['input', 'ascending', 'descending', 'sumAscending', 'sumDescending', 'insideOut'].includes(
      authoredOrder,
    )
      ? (authoredOrder as SeriesStackOrder)
      : implicitThemeRiver
        ? 'input'
        : defaultOrder(mode);
  const sort = object === null ? undefined : optionSort(object.sort);
  return {
    mode,
    offset,
    order,
    ...(sort === undefined ? {} : { sort }),
    seriesField: fields.series,
    categoryField: fields.category,
    valueField:
      layer.mark.orientation === 'horizontal' && layer.mark.type === 'bar'
        ? layer.x.field
        : layer.y.field,
  };
}

function calculatedTotalTransforms(
  spec: ResolvedSeriesStackSpec,
  fields: SeriesStackFields,
): readonly TransformSpec[] {
  const source = { op: 'field', field: spec.valueField } as const;
  const zero = { op: 'literal', value: 0 } as const;
  return [
    { type: 'calculate', as: fields.source, expr: source },
    {
      type: 'calculate',
      as: fields.absoluteTotal,
      expr: {
        op: 'if',
        condition: { op: 'lessThan', left: source, right: zero },
        then: { op: 'negate', value: source },
        else: source,
      },
    },
    {
      type: 'calculate',
      as: fields.positiveTotal,
      expr: {
        op: 'if',
        condition: { op: 'greaterThan', left: source, right: zero },
        then: source,
        else: zero,
      },
    },
    {
      type: 'calculate',
      as: fields.negativeTotal,
      expr: {
        op: 'if',
        condition: { op: 'lessThan', left: source, right: zero },
        then: { op: 'negate', value: source },
        else: zero,
      },
    },
    {
      type: 'joinaggregate',
      groupby: [spec.categoryField],
      fields: [
        { op: 'sum', field: fields.source, as: fields.netTotal },
        { op: 'sum', field: fields.absoluteTotal, as: fields.absoluteTotal },
        { op: 'sum', field: fields.positiveTotal, as: fields.positiveTotal },
        { op: 'sum', field: fields.negativeTotal, as: fields.negativeTotal },
      ],
    },
  ];
}

/** Append the shared transform and annotate only the internal layer copy. */
export function prepareSeriesStackLayer(layer: NormalizedLayerSpec): PreparedSeriesStack | null {
  const spec = resolveSeriesStackSpec(layer);
  if (spec === null) return null;
  const fields = internalFields(layer);
  const transforms: readonly TransformSpec[] =
    spec.offset === null
      ? []
      : [
          ...calculatedTotalTransforms(spec, fields),
          {
            type: 'stack',
            field: fields.source,
            groupby: [spec.categoryField],
            series: [spec.seriesField],
            ...(spec.sort === undefined ? {} : { sort: spec.sort }),
            as: [fields.start, fields.end],
            offset: spec.offset,
            order: spec.order,
          },
        ];
  return {
    spec,
    fields,
    layer: {
      ...layer,
      transform: [...layer.transform, ...transforms],
      mark: {
        ...layer.mark,
        fields: {
          ...layer.mark.fields,
          [STACK_FIELD_KEYS.source]: fields.source,
          [STACK_FIELD_KEYS.start]: fields.start,
          [STACK_FIELD_KEYS.end]: fields.end,
          [STACK_FIELD_KEYS.absoluteTotal]: fields.absoluteTotal,
          [STACK_FIELD_KEYS.positiveTotal]: fields.positiveTotal,
          [STACK_FIELD_KEYS.negativeTotal]: fields.negativeTotal,
          [STACK_FIELD_KEYS.netTotal]: fields.netTotal,
          [STACK_FIELD_KEYS.series]: fields.series,
          [STACK_FIELD_KEYS.category]: fields.category,
        },
      },
    },
  };
}

export function preparedSeriesStackFields(layer: NormalizedLayerSpec): SeriesStackFields | null {
  const read = (key: keyof typeof STACK_FIELD_KEYS): string | undefined =>
    layer.mark.fields[STACK_FIELD_KEYS[key]];
  const source = read('source');
  const start = read('start');
  const end = read('end');
  const absoluteTotal = read('absoluteTotal');
  const positiveTotal = read('positiveTotal');
  const negativeTotal = read('negativeTotal');
  const netTotal = read('netTotal');
  const series = read('series');
  const category = read('category');
  if (
    source === undefined ||
    start === undefined ||
    end === undefined ||
    absoluteTotal === undefined ||
    positiveTotal === undefined ||
    negativeTotal === undefined ||
    netTotal === undefined ||
    series === undefined ||
    category === undefined
  ) {
    return null;
  }
  return {
    source,
    start,
    end,
    absoluteTotal,
    positiveTotal,
    negativeTotal,
    netTotal,
    series,
    category,
  };
}
