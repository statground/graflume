import type { DeepPartial } from '../utils/object.js';
import type { ThemeTokens } from '../theme/types.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type DataValue = JsonPrimitive | Date | readonly JsonPrimitive[] | undefined;
export type DataRow = Readonly<Record<string, DataValue>>;
export type ColumnLike = ArrayLike<DataValue>;

export interface ColumnarData {
  readonly columns: Readonly<Record<string, ColumnLike>>;
  readonly length?: number;
}

export type DataInput = readonly DataRow[] | ColumnarData;

/** A portable reference to a named source or transform node in the enclosing dataflow. */
export interface NamedDataReference {
  readonly source: string;
}

export type StreamingMode = 'append' | 'upsert' | 'replaceLast';
export type StreamingOverflowPolicy = 'reject' | 'drop-oldest' | 'coalesce';

export interface StreamingRuntimeSpec {
  /** Coalesce queued rendering work through one animation frame by default. */
  readonly schedule?: 'animation-frame' | 'microtask';
  readonly maxBatchesPerFrame?: number;
  readonly overflow?: StreamingOverflowPolicy;
  readonly paused?: boolean;
  readonly followLive?: boolean;
  readonly history?: {
    readonly maxBatches?: number;
    readonly pageRows?: number;
  };
}

export interface WorkerRuntimeSpec {
  /** Module URL used for automatic Worker construction. */
  readonly moduleURL: string;
  readonly name?: string;
  readonly maxQueueBatches?: number;
  readonly maxQueueRows?: number;
  readonly maxInputRows?: number;
  readonly maxBinaryBytes?: number;
  readonly maxTransforms?: number;
  readonly overflow?: StreamingOverflowPolicy;
  readonly engine?:
    { readonly type: 'javascript' } | { readonly type: 'wasm'; readonly adapter: string };
}

export interface StreamingSpec {
  /** Stable scalar identity field used by every incremental mutation. */
  readonly key: string;
  readonly mode?: StreamingMode;
  /** Per-update input limit. Defaults to 100,000 rows. */
  readonly maxBatchRows?: number;
  readonly retention?: {
    /** Maximum retained rows. Defaults to 100,000. */
    readonly maxRows?: number;
    readonly time?: {
      readonly field: string;
      readonly durationMs: number;
    };
  };
  readonly eventTime?: {
    readonly field: string;
    readonly allowedLatenessMs?: number;
    readonly lateData?: 'reject' | 'drop' | 'accept';
  };
  readonly queue?: {
    readonly maxBatches?: number;
    readonly maxRows?: number;
    /** Drop is explicit and rejects affected callers; coalesce resolves callers with the latest batch. */
    readonly overflow?: StreamingOverflowPolicy;
  };
  readonly replay?: {
    readonly maxBatches?: number;
    readonly maxRows?: number;
  };
  /** Browser scheduling, pause/follow-live, and lazy retained-history policy. */
  readonly runtime?: StreamingRuntimeSpec;
  /** Optional automatic Transform/Render Worker module. */
  readonly worker?: WorkerRuntimeSpec;
}

/** Function-free expression tree used by calculate and filter transforms. */
export type TransformExpression =
  | { readonly op: 'literal'; readonly value: JsonPrimitive }
  | { readonly op: 'field'; readonly field: string }
  | {
      readonly op: 'not' | 'negate' | 'isValid' | 'toNumber' | 'toString';
      readonly value: TransformExpression;
    }
  | {
      readonly op:
        | 'add'
        | 'subtract'
        | 'multiply'
        | 'divide'
        | 'modulo'
        | 'equal'
        | 'notEqual'
        | 'lessThan'
        | 'lessThanOrEqual'
        | 'greaterThan'
        | 'greaterThanOrEqual'
        | 'and'
        | 'or';
      readonly left: TransformExpression;
      readonly right: TransformExpression;
    }
  | {
      readonly op: 'if';
      readonly condition: TransformExpression;
      readonly then: TransformExpression;
      readonly else: TransformExpression;
    }
  | { readonly op: 'coalesce'; readonly values: readonly TransformExpression[] };

export interface TransformSortField {
  readonly field: string;
  readonly order?: 'ascending' | 'descending';
}

export type AggregateOperation =
  | 'count'
  | 'valid'
  | 'missing'
  | 'sum'
  | 'mean'
  | 'weightedMean'
  | 'min'
  | 'max'
  | 'median'
  | 'variance'
  | 'stdev';

export interface AggregateFieldSpec {
  readonly op: AggregateOperation;
  readonly field?: string;
  readonly weight?: string;
  readonly as: string;
}

export interface WindowFieldSpec {
  readonly op:
    | 'rowNumber'
    | 'rank'
    | 'denseRank'
    | 'lag'
    | 'lead'
    | 'sum'
    | 'mean'
    | 'min'
    | 'max'
    | 'count'
    | 'cumulativeSum'
    | 'movingAverage';
  readonly field?: string;
  readonly as: string;
  readonly offset?: number;
}

/** Ordered, deterministic and JSON-serializable dataflow transform. */
export type TransformSpec =
  | { readonly type: 'filter'; readonly expr: TransformExpression }
  | { readonly type: 'sort'; readonly by: readonly TransformSortField[] }
  | { readonly type: 'calculate'; readonly as: string; readonly expr: TransformExpression }
  | {
      readonly type: 'aggregate' | 'joinaggregate';
      readonly groupby?: readonly string[];
      readonly fields: readonly AggregateFieldSpec[];
    }
  | {
      readonly type: 'bin';
      readonly field: string;
      readonly as: readonly [string, string];
      readonly maxbins?: number;
      readonly step?: number;
      readonly extent?: readonly [number, number];
    }
  | {
      readonly type: 'bin2d';
      readonly x: string;
      readonly y: string;
      readonly as: readonly [string, string, string, string, string];
      readonly maxbins?: readonly [number, number];
    }
  | {
      readonly type: 'density1d';
      readonly field: string;
      readonly as: readonly [string, string];
      readonly groupby?: readonly string[];
      readonly points?: number;
      readonly bandwidth?: number;
    }
  | {
      readonly type: 'density2d';
      readonly x: string;
      readonly y: string;
      readonly as: readonly [string, string, string];
      readonly bins?: readonly [number, number];
      readonly bandwidth?: readonly [number, number];
    }
  | {
      readonly type: 'stack';
      readonly field: string;
      readonly groupby: readonly string[];
      readonly series?: readonly string[];
      readonly sort?: readonly TransformSortField[];
      readonly as: readonly [string, string];
      readonly offset?: 'zero' | 'normalize' | 'expand' | 'center' | 'silhouette' | 'wiggle';
      readonly order?:
        'input' | 'ascending' | 'descending' | 'sumAscending' | 'sumDescending' | 'insideOut';
    }
  | {
      readonly type: 'window';
      readonly fields: readonly WindowFieldSpec[];
      readonly groupby?: readonly string[];
      readonly sort?: readonly TransformSortField[];
      readonly frame?: readonly [number | null, number | null];
    }
  | {
      readonly type: 'regression';
      readonly x: string;
      readonly y: string;
      readonly as: readonly [string, string];
      readonly groupby?: readonly string[];
    }
  | {
      readonly type: 'fold';
      readonly fields: readonly string[];
      readonly as: readonly [string, string];
    }
  | {
      readonly type: 'flatten';
      readonly fields: readonly string[];
      readonly as?: readonly string[];
    }
  | {
      readonly type: 'pivot';
      readonly field: string;
      readonly value: string;
      readonly groupby?: readonly string[];
      readonly op?: 'sum' | 'mean' | 'min' | 'max' | 'count' | 'first';
    }
  | {
      readonly type: 'impute';
      readonly field: string;
      readonly key: string;
      readonly groupby?: readonly string[];
      readonly method?: 'value' | 'mean' | 'median' | 'min' | 'max';
      readonly value?: JsonPrimitive;
    }
  | {
      readonly type: 'lookup';
      readonly field: string;
      readonly from: DataInput;
      readonly key: string;
      readonly values: readonly string[];
      readonly as?: readonly string[];
      readonly default?: JsonPrimitive;
    }
  | {
      readonly type: 'quantile';
      readonly field: string;
      readonly probs?: readonly number[];
      readonly as: readonly [string, string];
      readonly groupby?: readonly string[];
    }
  | { readonly type: 'sample'; readonly size: number; readonly seed?: number }
  | {
      readonly type: 'resample';
      readonly field: string;
      readonly interval: number;
      readonly groupby?: readonly string[];
      readonly method?: 'linear' | 'previous' | 'next';
    }
  | {
      readonly type: 'timeUnit';
      readonly field: string;
      readonly unit:
        'year' | 'quarter' | 'month' | 'week' | 'date' | 'day' | 'hours' | 'minutes' | 'seconds';
      readonly as: string;
      readonly utc?: boolean;
    };

/** One reusable branch in a closed, single-parent transform DAG. */
export interface TransformDataflowNodeSpec {
  readonly id: string;
  readonly source: string;
  readonly transform: readonly TransformSpec[];
}

/** Function-free named sources and reusable transform branches. */
export interface TransformDataflowSpec {
  readonly sources: Readonly<Record<string, DataInput>>;
  readonly nodes?: readonly TransformDataflowNodeSpec[];
}

export type FieldType = 'quantitative' | 'temporal' | 'ordinal' | 'nominal';
export type MarkType =
  | 'annotation'
  | 'arc-diagram'
  | 'area'
  | 'bar'
  | 'boxplot'
  | 'bubble'
  | 'bullet'
  | 'calendar'
  | 'candlestick'
  | 'chord'
  | 'custom'
  | 'contour'
  | 'cylinder'
  | 'diff'
  | 'distribution'
  | 'effect-scatter'
  | 'financial'
  | 'flags'
  | 'funnel'
  | 'gantt'
  | 'gauge'
  | 'geo'
  | 'geo-flow'
  | 'geo-heatmap'
  | 'geo-line'
  | 'graph'
  | 'heatmap'
  | 'histogram'
  | 'image'
  | 'interval'
  | 'indicator'
  | 'item'
  | 'line'
  | 'lines'
  | 'lollipop'
  | 'map'
  | 'motion'
  | 'org'
  | 'parallel'
  | 'packed-bubble'
  | 'pareto'
  | 'pictorial-bar'
  | 'pie'
  | 'point-figure'
  | 'point'
  | 'polygon'
  | 'pyramid'
  | 'radar'
  | 'polar'
  | 'range'
  | 'renko'
  | 'sankey'
  | 'scatter-matrix'
  | 'scatter-3d'
  | 'smooth'
  | 'solid-gauge'
  | 'stepped-area'
  | 'sunburst'
  | 'smith'
  | 'table'
  | 'theme-river'
  | 'tiled-map'
  | 'tilemap'
  | 'timeline'
  | 'ternary'
  | 'tree'
  | 'treemap'
  | 'trendline'
  | 'variable-pie'
  | 'variwide'
  | 'vega'
  | 'vector'
  | 'venn'
  | 'volume-profile'
  | 'waterfall'
  | 'wind-barb'
  | 'word-cloud'
  | 'word-tree'
  | 'carpet';
export type PerformanceProfile = 'auto' | 'standard' | 'large' | 'ultra';
export type RendererPreference = 'auto' | 'canvas' | 'svg' | 'webgl' | 'webgpu' | string;

export type ScaleType =
  | 'linear'
  | 'log'
  | 'symlog'
  | 'asinh'
  | 'pow'
  | 'sqrt'
  | 'time'
  | 'utc'
  | 'band'
  | 'point'
  | 'ordinal'
  | 'quantile'
  | 'quantize'
  | 'threshold'
  | 'sequential'
  | 'diverging'
  | 'cyclic'
  | 'probability'
  | 'logit'
  | 'probit';

export type ScaleOutOfBounds = 'extrapolate' | 'clamp' | 'error' | 'unknown';

export interface ScaleSpec {
  readonly type?: ScaleType;
  readonly domain?: readonly (number | string)[];
  /** Explicit output range for non-layout channels and standalone scale construction. */
  readonly range?: readonly (number | string)[];
  readonly zero?: boolean;
  readonly nice?: boolean;
  /** Compatibility alias for outOfBounds: "clamp". */
  readonly clamp?: boolean;
  readonly reverse?: boolean;
  readonly outOfBounds?: ScaleOutOfBounds;
  readonly base?: number;
  readonly exponent?: number;
  readonly constant?: number;
  readonly paddingInner?: number;
  readonly paddingOuter?: number;
}

/** Portable, author-defined axis identifier. Runtime validation applies the safe axis-id grammar. */
export type AxisId = string;
export type AxisChannel = 'x' | 'y';
export type AxisPosition = 'top' | 'bottom' | 'left' | 'right';
export type AxisLabelOrientation = 'auto' | 'horizontal' | 'vertical-up' | 'vertical-down';
export type AxisValueFormat =
  | 'auto'
  | 'number'
  | 'integer'
  | 'percent'
  | 'compact'
  | 'scientific'
  | 'currency'
  | 'date'
  | 'time'
  | 'datetime';

export interface AxisFontSpec {
  readonly family?: string;
  readonly size?: number;
  readonly weight?: number | 'normal' | 'medium' | 'semibold' | 'bold';
  readonly style?: 'normal' | 'italic';
}

export interface AxisFormatSpec {
  readonly type?: AxisValueFormat;
  readonly fractionDigits?: number;
  readonly notation?: 'standard' | 'compact' | 'scientific' | 'engineering';
  readonly useGrouping?: boolean;
  readonly currency?: string;
  readonly currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  readonly dateStyle?: 'short' | 'medium' | 'long' | 'full';
  readonly timeStyle?: 'short' | 'medium' | 'long';
  readonly timeZone?: string;
  readonly prefix?: string;
  readonly suffix?: string;
}

export type AxisFormatInput = AxisValueFormat | AxisFormatSpec;

export interface AxisStrokeSpec {
  readonly visible?: boolean;
  readonly color?: string;
  readonly width?: number;
  readonly opacity?: number;
  readonly dash?: readonly number[];
}

export interface AxisTickSpec extends AxisStrokeSpec {
  readonly count?: number;
  readonly spacing?: number;
  readonly size?: number;
  readonly values?: readonly (number | string)[];
}

export interface AxisLabelSpec {
  readonly visible?: boolean;
  readonly orientation?: AxisLabelOrientation;
  readonly angle?: number;
  readonly align?: 'auto' | 'start' | 'center' | 'end';
  readonly padding?: number;
  readonly maxLength?: number;
  readonly color?: string;
  readonly font?: AxisFontSpec;
}

export interface AxisTitleSpec {
  readonly text?: string;
  readonly visible?: boolean;
  readonly align?: 'start' | 'center' | 'end';
  readonly angle?: number;
  readonly padding?: number;
  readonly color?: string;
  readonly font?: AxisFontSpec;
}

export interface AxisSpec {
  /** Required on named axes; built-in x/x2/y/y2 axes infer their Cartesian channel. */
  readonly channel?: AxisChannel;
  readonly title?: string | false | AxisTitleSpec;
  readonly visible?: boolean;
  readonly position?: AxisPosition;
  readonly offset?: number;
  readonly line?: boolean | AxisStrokeSpec;
  readonly grid?: boolean | AxisStrokeSpec;
  readonly ticks?: boolean | AxisTickSpec;
  readonly labels?: boolean | AxisLabelSpec;
  /** Compatibility alias for ticks.count. */
  readonly tickCount?: number;
  readonly format?: AxisFormatInput;
  /** Compatibility alias for labels.angle. */
  readonly labelAngle?: number;
}

export interface EncodingSpec {
  readonly field: string;
  readonly type?: FieldType;
  readonly title?: string;
  readonly scale?: ScaleSpec;
  readonly axis?: AxisSpec | false;
  /** Bind this encoding to a built-in or declared named axis for its channel. */
  readonly axisId?: AxisId;
}

export type EncodingInput = string | EncodingSpec;

export type EncodingChannel =
  | 'x'
  | 'x2'
  | 'y'
  | 'y2'
  | 'color'
  | 'fill'
  | 'stroke'
  | 'size'
  | 'radius'
  | 'shape'
  | 'symbol'
  | 'icon'
  | 'opacity'
  | 'strokeWidth'
  | 'strokeDash'
  | 'text'
  | 'angle'
  | 'theta'
  | 'longitude'
  | 'latitude'
  | 'open'
  | 'high'
  | 'low'
  | 'close'
  | 'volume'
  | 'order'
  | 'detail'
  | 'tooltip';

export interface EncodingConditionSpec {
  readonly test: TransformExpression;
  readonly field?: string;
  readonly value?: JsonPrimitive | readonly number[];
}

/** Function-free channel encoding. Exactly one of field or value is required. */
export interface ChannelEncodingSpec {
  readonly field?: string;
  readonly value?: JsonPrimitive | readonly number[];
  readonly type?: FieldType;
  readonly title?: string;
  readonly scale?: ScaleSpec;
  readonly axis?: AxisSpec | false;
  readonly axisId?: AxisId;
  readonly condition?: EncodingConditionSpec | readonly EncodingConditionSpec[];
}

export type ChannelEncodingInput = string | ChannelEncodingSpec;

export interface EncodingMap {
  readonly x?: ChannelEncodingInput;
  readonly x2?: ChannelEncodingInput;
  readonly y?: ChannelEncodingInput;
  readonly y2?: ChannelEncodingInput;
  readonly color?: ChannelEncodingInput;
  readonly fill?: ChannelEncodingInput;
  readonly stroke?: ChannelEncodingInput;
  readonly size?: ChannelEncodingInput;
  readonly radius?: ChannelEncodingInput;
  readonly shape?: ChannelEncodingInput;
  readonly symbol?: ChannelEncodingInput;
  readonly icon?: ChannelEncodingInput;
  readonly opacity?: ChannelEncodingInput;
  readonly strokeWidth?: ChannelEncodingInput;
  readonly strokeDash?: ChannelEncodingInput;
  readonly text?: ChannelEncodingInput;
  readonly angle?: ChannelEncodingInput;
  readonly theta?: ChannelEncodingInput;
  readonly longitude?: ChannelEncodingInput;
  readonly latitude?: ChannelEncodingInput;
  readonly open?: ChannelEncodingInput;
  readonly high?: ChannelEncodingInput;
  readonly low?: ChannelEncodingInput;
  readonly close?: ChannelEncodingInput;
  readonly volume?: ChannelEncodingInput;
  readonly order?: ChannelEncodingInput;
  readonly detail?: ChannelEncodingInput;
  readonly tooltip?: ChannelEncodingInput;
}

export interface MarkSpec {
  readonly type: MarkType | string;
  readonly stroke?: string;
  readonly fill?: string;
  readonly opacity?: number;
  readonly lineWidth?: number;
  readonly radius?: number;
  readonly cornerRadius?: number;
  readonly point?: boolean;
  readonly position?: 'overlay' | 'group';
  readonly orientation?: 'vertical' | 'horizontal';
  /** Named data fields used by multi-channel marks such as candlestick, Sankey, or Gantt. */
  readonly fields?: Readonly<Record<string, string>>;
  /** Function-free, JSON-serializable options interpreted by the selected portable mark. */
  readonly options?: Readonly<Record<string, JsonValue>>;
}

export type MarkInput = MarkType | MarkSpec;

export interface LayerSpec {
  readonly id?: string;
  /** Human-readable series name used by automatic layer legends. */
  readonly name?: string;
  readonly data?: DataInput;
  /** Named dataflow source or branch used when inline data is omitted. */
  readonly source?: string;
  readonly transform?: readonly TransformSpec[];
  readonly mark: MarkInput;
  /** Legacy position facade. Use either x/y or encoding, not both. */
  readonly x?: EncodingInput;
  readonly y?: EncodingInput;
  readonly encoding?: EncodingMap;
  /** Omitted/true preserves plot clipping; false disables it; objects author a bounded clip. */
  readonly clip?: LayerClipSpec;
  readonly visible?: boolean;
  readonly zIndex?: number;
}

export interface LayerPlotClipSpec {
  readonly type: 'plot';
  /** Plot-relative coordinates in the closed 0..1 interval. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LayerDomainClipSpec {
  readonly type: 'domain';
  readonly x?: AxisRangeTargetSpec;
  readonly y?: AxisRangeTargetSpec;
}

export type LayerClipSpec = boolean | LayerPlotClipSpec | LayerDomainClipSpec;

export interface PaddingSpec {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export type PaddingInput = number | Partial<PaddingSpec>;

export interface TitleSpec {
  readonly text: string;
  readonly subtitle?: string;
  readonly align?: 'left' | 'center' | 'right';
}

export interface AccessibilitySpec {
  readonly label?: string;
  readonly description?: string;
  /** Native Canvas data mirror. `true` is visually hidden; `visible` displays it. */
  readonly table?: boolean | 'hidden' | 'visible';
  /** Maximum semantic/native rows retained by the compiler and runtime. */
  readonly maxRows?: number;
  /** Enable roving keyboard traversal of the native mark mirror. */
  readonly navigation?: boolean;
  /** Virtualized native data explorer; `true` uses bounded defaults. */
  readonly explorer?:
    | boolean
    | {
        readonly windowRows?: number;
        readonly overscanRows?: number;
        readonly rowHeight?: number;
      };
  /** Synchronize focus by one stable scalar datum field across live views. */
  readonly linkedFocus?: {
    readonly group: string;
    readonly key: string;
  };
  /** Optional text placed before the native table. */
  readonly summary?: string;
  /** Configure polite selection announcements, or disable them. */
  readonly live?: boolean | AccessibilityLiveSpec;
}

export interface AccessibilityLiveSpec {
  readonly enabled?: boolean;
  readonly throttleMs?: number;
}

export type LegendMode = 'auto' | 'layers' | 'categories' | 'continuous';
export type LegendPosition =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'inside-top-left'
  | 'inside-top-right'
  | 'inside-bottom-left'
  | 'inside-bottom-right';

export interface LegendItemSpec {
  readonly id?: string;
  readonly label: string;
  readonly color?: string;
  /** Optional layer controlled by this item when interactive toggling is enabled. */
  readonly layerId?: string;
  /** Optional portable category value controlled by this item. */
  readonly value?: JsonPrimitive;
  /** Compact glyph used for this series/category. Auto follows the owning mark. */
  readonly symbol?: 'auto' | 'line' | 'point' | 'rect';
}

export interface LegendLabelsSpec {
  readonly show?: string;
  readonly hide?: string;
}

export interface LegendSpec {
  readonly visible?: boolean;
  readonly mode?: LegendMode;
  readonly position?: LegendPosition;
  readonly orientation?: 'auto' | 'horizontal' | 'vertical';
  readonly title?: string;
  /** Category field for categories/continuous legends. */
  readonly field?: string;
  /** Restrict an inferred category legend to one layer. */
  readonly layerId?: string;
  /** Explicit items are the safe fallback when a family has no unambiguous auto semantics. */
  readonly items?: readonly LegendItemSpec[];
  readonly maxItems?: number;
  readonly interactive?: boolean;
  readonly labels?: LegendLabelsSpec;
}

export interface DatumTargetSpec {
  readonly type: 'datum';
  readonly layerId?: string;
  readonly rowIndex?: number | readonly number[];
  readonly field?: string;
  readonly value?: JsonPrimitive;
  readonly values?: readonly JsonPrimitive[];
}

export interface LayerTargetSpec {
  readonly type: 'layer';
  readonly layerId: string;
}

export interface AxisRangeTargetSpec {
  readonly axis?: AxisId;
  readonly from: number | string;
  readonly to: number | string;
}

export interface RangeTargetSpec {
  readonly type: 'range';
  readonly x?: AxisRangeTargetSpec;
  readonly y?: AxisRangeTargetSpec;
}

/** A renderer-neutral plot-relative target where every value is in the 0..1 interval. */
export interface PlotTargetSpec {
  readonly type: 'plot';
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
}

export type DecorationTargetSpec =
  DatumTargetSpec | LayerTargetSpec | RangeTargetSpec | PlotTargetSpec;

export interface HighlightStyleSpec {
  readonly fill?: string;
  readonly stroke?: string;
  readonly opacity?: number;
  readonly lineWidth?: number;
  readonly dash?: readonly number[];
  readonly padding?: number;
  readonly radius?: number;
}

export interface HighlightSpec extends HighlightStyleSpec {
  readonly id?: string;
  readonly target: DecorationTargetSpec;
}

export interface AnnotationConnectorSpec {
  readonly visible?: boolean;
  readonly color?: string;
  readonly width?: number;
  readonly dash?: readonly number[];
}

export interface AnnotationStyleSpec {
  readonly background?: string;
  readonly border?: string;
  readonly color?: string;
  readonly opacity?: number;
  readonly fontSize?: number;
  readonly maxWidth?: number;
  readonly padding?: number;
  /** Logical text alignment. Start/end follow the chart locale direction. */
  readonly align?: 'start' | 'center' | 'end';
}

export interface AnnotationSpec {
  readonly id?: string;
  /** Closed data-coordinate primitive compiled by the annotation registry. */
  readonly primitive?: 'callout' | 'label' | 'point' | 'rule' | 'band';
  readonly target: DecorationTargetSpec;
  readonly text: string;
  readonly detail?: string;
  readonly placement?: 'auto' | 'top' | 'right' | 'bottom' | 'left';
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly connector?: boolean | AnnotationConnectorSpec;
  readonly style?: AnnotationStyleSpec;
}

export type MarkLabelPlacement = 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'center';
export type MarkLabelCollision = 'avoid' | 'hide' | 'none';

/** Function-free visual styling for reusable labels attached to rendered marks. */
export interface MarkLabelStyleSpec {
  readonly color?: string;
  readonly background?: string;
  readonly border?: string;
  readonly opacity?: number;
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly maxWidth?: number;
  readonly padding?: number;
  readonly radius?: number;
}

export interface MarkLabelConnectorSpec {
  readonly visible?: boolean;
  readonly color?: string;
  readonly width?: number;
  readonly dash?: readonly number[];
}

/** A portable authored displacement from a datum's automatically resolved label position. */
export interface MarkLabelPositionSpec {
  readonly target: DatumTargetSpec;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly hidden?: boolean;
}

export interface MarkLabelSnapSpec {
  /** Pixel grid size, or false to disable grid snapping. */
  readonly grid?: number | false;
  /** Align the label center with nearby mark anchors. */
  readonly marks?: boolean;
  /** Keep labels inside and snap them to the plot boundary. */
  readonly plot?: boolean;
  readonly distance?: number;
}

export interface MarkLabelAuthoringSpec {
  readonly pointer?: boolean;
  readonly keyboard?: boolean;
  readonly step?: number;
  readonly historyLimit?: number;
  readonly snap?: false | MarkLabelSnapSpec;
}

/**
 * Reusable automatic mark labels. Every option and authored position remains
 * JSON-serializable; executable formatters or layout callbacks are not accepted.
 */
export interface MarkLabelSpec {
  readonly visible?: boolean;
  /** Label value field. Defaults to encoding.text, then the layer y field. */
  readonly field?: string;
  /** Stable datum key used by exported positions across row reordering. */
  readonly key?: string;
  readonly layerIds?: readonly string[];
  readonly placement?: MarkLabelPlacement;
  readonly offset?: number;
  readonly collision?: MarkLabelCollision;
  readonly connector?: boolean | MarkLabelConnectorSpec;
  readonly maxLabels?: number;
  readonly positions?: readonly MarkLabelPositionSpec[];
  readonly style?: MarkLabelStyleSpec;
  readonly authoring?: boolean | MarkLabelAuthoringSpec;
}

export type TooltipValueFormat = 'auto' | 'number' | 'integer' | 'percent' | 'date' | 'datetime';
export type TooltipTrigger = 'mark' | 'axis';
export type TooltipAxis = AxisId;

export interface TooltipFieldSpec {
  readonly field: string;
  readonly label?: string;
  readonly format?: TooltipValueFormat;
  readonly fractionDigits?: number;
  readonly prefix?: string;
  readonly suffix?: string;
}

export type TooltipFieldInput = string | TooltipFieldSpec;

export interface TooltipSpec {
  /** Resolve the exact mark by default, or the nearest datum along an explicit axis. */
  readonly trigger?: TooltipTrigger;
  /** Required when trigger is "axis" and invalid for mark-triggered tooltips. */
  readonly axis?: TooltipAxis;
  readonly title?: string;
  readonly fields?: readonly TooltipFieldInput[];
}

export type NavigationWheelMode = 'off' | 'modifier' | 'always';

/**
 * Inspect the already rendered Canvas by magnifying and translating the complete
 * chart surface. This does not change data domains, projections, or mark layout.
 */
export interface NavigationSpec {
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly wheel?: NavigationWheelMode;
  readonly drag?: boolean;
  readonly pinch?: boolean;
  readonly keyboard?: boolean;
}

/** Recompute Cartesian position domains instead of magnifying the rendered surface. */
export interface DomainNavigationSpec {
  readonly axes?: readonly AxisId[];
  readonly maxZoom?: number;
  readonly wheel?: NavigationWheelMode;
  readonly drag?: boolean;
  readonly keyboard?: boolean;
}

export type PlaybackMode = 'frame' | 'cumulative' | 'window';

export type PlaybackDirection = 'forward' | 'reverse';

/** A zero-based frame index or the name of one declared named frame. */
export type PlaybackFrameReference = number | string;

/** Portable label for one discovered scalar frame value. */
export interface PlaybackNamedFrameSpec {
  readonly name: string;
  readonly value: string | number | boolean;
}

/** Inclusive playback bounds, resolved after frame values have been collected. */
export interface PlaybackRangeSpec {
  readonly start?: PlaybackFrameReference;
  readonly end?: PlaybackFrameReference;
}

export type PlaybackTransitionEasing = 'linear' | 'ease-in-out';

export interface PlaybackTransitionSpec {
  /** Requested maximum; runtime clamps below the playback interval for autoplay safety. */
  readonly duration?: number;
  readonly easing?: PlaybackTransitionEasing;
}

export interface PlaybackSpec {
  readonly field: string;
  /** Stable scalar datum field used to match the same entity between frames. */
  readonly key?: string;
  readonly layerId?: string;
  readonly mode?: PlaybackMode;
  readonly interval?: number;
  readonly rate?: number;
  readonly loop?: boolean;
  /** Automatic playback direction; manual signed steps retain their historical meaning. */
  readonly direction?: PlaybackDirection;
  /** Inclusive bounds for seeking, stepping, autoplay, and looping. */
  readonly range?: PlaybackRangeSpec;
  /** Stable portable names that resolve to discovered scalar frame values. */
  readonly namedFrames?: readonly PlaybackNamedFrameSpec[];
  readonly windowSize?: number;
  readonly autoplay?: boolean;
  /** Smoothly interpolate compatible rendered geometry without changing source data. */
  readonly transition?: false | PlaybackTransitionSpec;
  /**
   * Apply a generic transient data filter. Keep this off unless the host has
   * explicitly approved the selected chart family; motion marks use frame
   * selection without this option.
   */
  readonly filter?: boolean;
}

export interface ControlLabelsSpec {
  readonly controls?: string;
  readonly zoomIn?: string;
  readonly zoomOut?: string;
  readonly reset?: string;
  readonly enterFullscreen?: string;
  readonly exitFullscreen?: string;
  readonly exportPng?: string;
  readonly showAnnotations?: string;
  readonly hideAnnotations?: string;
  readonly previousFrame?: string;
  readonly play?: string;
  readonly pause?: string;
  readonly nextFrame?: string;
  readonly seek?: string;
  readonly speed?: string;
  readonly loop?: string;
}

export interface ControlsSpec {
  readonly zoom?: boolean;
  readonly reset?: boolean;
  readonly fullscreen?: boolean;
  readonly export?: boolean;
  readonly annotations?: boolean;
  readonly playback?: boolean;
  readonly labels?: ControlLabelsSpec;
}

export interface SelectionSpec {
  /** Point preserves the historical click/datum behavior; other kinds author domain geometry. */
  readonly kind?: 'point' | 'interval' | 'rectangle' | 'axis' | 'lasso';
  readonly combine?: 'union' | 'intersection';
  readonly mode?: 'single' | 'multiple';
  readonly toggle?: boolean;
  readonly key?: string;
  readonly clearOnBackground?: boolean;
  readonly clearOnEscape?: boolean;
  readonly ariaLabel?: string;
  readonly highlight?: HighlightStyleSpec;
  /** Required only for axis selection. */
  readonly axis?: AxisId;
  readonly xAxis?: AxisId;
  readonly yAxis?: AxisId;
  readonly maxSelections?: number;
  readonly maxLassoPoints?: number;
  readonly minPixelSpan?: number;
  /** Enable S/Arrow/Space/Enter geometry authoring on the focused chart surface. */
  readonly keyboard?: boolean;
  readonly keyboardStep?: number;
  /** Recompile marks from rows matching the current analytic selection. */
  readonly filter?: boolean;
  /** Share stable-key point identity across composed views instead of scoping it to one layer. */
  readonly linked?: boolean;
}

export interface InteractionSpec {
  readonly hover?: boolean;
  readonly click?: boolean;
  /**
   * Enable the built-in text-only datum tooltip or declare its portable fields.
   * Executable and raw-HTML formatters are intentionally unsupported.
   */
  readonly tooltip?: boolean | TooltipSpec;
  readonly navigation?: boolean | NavigationSpec;
  readonly domainNavigation?: boolean | DomainNavigationSpec;
  readonly playback?: false | PlaybackSpec;
  readonly controls?: boolean | ControlsSpec;
  /** Click-driven, renderer-neutral datum selection. */
  readonly selection?: boolean | SelectionSpec;
}

export type CompositionResolveMode = 'shared' | 'independent';

/** Position-scale, axis, and legend ownership for a composed Canvas scene. */
export interface CompositionResolveSpec {
  readonly scale?: CompositionResolveMode;
  readonly axis?: CompositionResolveMode;
  readonly legend?: CompositionResolveMode;
  /** Continuous-color guide ownership, independent from categorical/layer legends. */
  readonly colorbar?: CompositionResolveMode;
}

export interface FacetFieldSpec {
  readonly field: string;
  readonly title?: string;
  readonly sort?: 'input' | 'ascending' | 'descending';
}

export type FacetFieldInput = string | FacetFieldSpec;

/** Row/column or wrapped small-multiple partition. */
export interface FacetCompositionSpec {
  readonly row?: FacetFieldInput;
  readonly column?: FacetFieldInput;
  readonly wrap?: FacetFieldInput;
  readonly columns?: number;
}

/** Explicit encoding-field substitution for one repeated view. */
export interface RepeatItemSpec {
  readonly id: string;
  readonly label?: string;
  readonly x?: string;
  readonly y?: string;
}

export interface RepeatCompositionSpec {
  readonly items: readonly RepeatItemSpec[];
  readonly columns?: number;
}

/** Plot-relative independent child view rendered over a base view. */
export interface InsetCompositionSpec {
  readonly base: ChartSpec;
  readonly view: ChartSpec;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label?: string;
}

export interface ChartSpec {
  readonly $schema?: string;
  readonly specVersion?: '0.1';
  readonly data?: DataInput;
  /** Named dataflow source or branch used when inline data is omitted. */
  readonly source?: string;
  /** Named sources and reusable transform branches available to this chart subtree. */
  readonly dataflow?: TransformDataflowSpec;
  readonly transform?: readonly TransformSpec[];
  readonly mark?: MarkInput;
  readonly x?: EncodingInput;
  readonly y?: EncodingInput;
  readonly encoding?: EncodingMap;
  readonly layers?: readonly LayerSpec[];
  /** Shared-scale compositional layering. Existing `layers` remains the flat layer facade. */
  readonly layer?: readonly ChartSpec[];
  readonly facet?: FacetCompositionSpec;
  readonly repeat?: RepeatCompositionSpec;
  readonly hconcat?: readonly ChartSpec[];
  readonly vconcat?: readonly ChartSpec[];
  readonly concat?: readonly ChartSpec[];
  readonly inset?: InsetCompositionSpec;
  /** Template used by facet and repeat compositions. */
  readonly spec?: ChartSpec;
  /** Wrapped concat column count. */
  readonly columns?: number;
  readonly spacing?: number;
  readonly resolve?: CompositionResolveSpec;
  readonly width?: number | 'container';
  readonly height?: number | 'container';
  readonly padding?: PaddingInput;
  readonly title?: string | TitleSpec;
  readonly description?: string;
  readonly renderer?: RendererPreference;
  readonly performance?: PerformanceProfile;
  readonly theme?: string | (DeepPartial<ThemeTokens> & { readonly extends?: string });
  readonly locale?: string;
  readonly axes?: Readonly<Record<AxisId, AxisSpec | false | undefined>>;
  readonly legend?: boolean | LegendSpec;
  readonly highlights?: readonly HighlightSpec[];
  readonly annotations?: readonly AnnotationSpec[];
  readonly markLabels?: boolean | MarkLabelSpec;
  readonly interaction?: InteractionSpec;
  readonly accessibility?: AccessibilitySpec;
  /** Optional bounded incremental data contract. */
  readonly streaming?: StreamingSpec;
}

export interface NormalizedEncodingSpec {
  readonly field: string;
  readonly type?: FieldType;
  readonly title: string;
  readonly scale: ScaleSpec;
  readonly axisId: AxisId;
  readonly axis: NormalizedAxisSpec | false;
}

export interface NormalizedChannelEncodingSpec {
  readonly field?: string;
  readonly value?: JsonPrimitive | readonly number[];
  readonly type?: FieldType;
  readonly title?: string;
  readonly scale: ScaleSpec;
  readonly axisId?: AxisId;
  readonly axis?: NormalizedAxisSpec | false;
  readonly condition: readonly EncodingConditionSpec[];
}

export interface NormalizedEncodingMap {
  readonly x: NormalizedEncodingSpec;
  readonly y: NormalizedEncodingSpec;
  readonly x2?: NormalizedChannelEncodingSpec;
  readonly y2?: NormalizedChannelEncodingSpec;
  readonly color?: NormalizedChannelEncodingSpec;
  readonly fill?: NormalizedChannelEncodingSpec;
  readonly stroke?: NormalizedChannelEncodingSpec;
  readonly size?: NormalizedChannelEncodingSpec;
  readonly radius?: NormalizedChannelEncodingSpec;
  readonly shape?: NormalizedChannelEncodingSpec;
  readonly symbol?: NormalizedChannelEncodingSpec;
  readonly icon?: NormalizedChannelEncodingSpec;
  readonly opacity?: NormalizedChannelEncodingSpec;
  readonly strokeWidth?: NormalizedChannelEncodingSpec;
  readonly strokeDash?: NormalizedChannelEncodingSpec;
  readonly text?: NormalizedChannelEncodingSpec;
  readonly angle?: NormalizedChannelEncodingSpec;
  readonly theta?: NormalizedChannelEncodingSpec;
  readonly longitude?: NormalizedChannelEncodingSpec;
  readonly latitude?: NormalizedChannelEncodingSpec;
  readonly open?: NormalizedChannelEncodingSpec;
  readonly high?: NormalizedChannelEncodingSpec;
  readonly low?: NormalizedChannelEncodingSpec;
  readonly close?: NormalizedChannelEncodingSpec;
  readonly volume?: NormalizedChannelEncodingSpec;
  readonly order?: NormalizedChannelEncodingSpec;
  readonly detail?: NormalizedChannelEncodingSpec;
  readonly tooltip?: NormalizedChannelEncodingSpec;
}

export interface NormalizedAxisFontSpec {
  readonly family?: string;
  readonly size?: number;
  readonly weight?: number | 'normal' | 'medium' | 'semibold' | 'bold';
  readonly style: 'normal' | 'italic';
}

export interface NormalizedAxisFormatSpec {
  readonly type: AxisValueFormat;
  readonly fractionDigits?: number;
  readonly notation: 'standard' | 'compact' | 'scientific' | 'engineering';
  readonly useGrouping: boolean;
  readonly currency?: string;
  readonly currencyDisplay: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  readonly dateStyle: 'short' | 'medium' | 'long' | 'full';
  readonly timeStyle: 'short' | 'medium' | 'long';
  readonly timeZone: string;
  readonly prefix: string;
  readonly suffix: string;
}

export interface NormalizedAxisStrokeSpec {
  readonly visible: boolean;
  readonly color?: string;
  readonly width?: number;
  readonly opacity: number;
  readonly dash: readonly number[];
}

export interface NormalizedAxisTickSpec extends NormalizedAxisStrokeSpec {
  readonly count?: number;
  readonly spacing: number;
  readonly size?: number;
  readonly values?: readonly (number | string)[];
}

export interface NormalizedAxisLabelSpec {
  readonly visible: boolean;
  readonly orientation: AxisLabelOrientation;
  readonly angle?: number;
  readonly align: 'auto' | 'start' | 'center' | 'end';
  readonly padding?: number;
  readonly maxLength?: number;
  readonly color?: string;
  readonly font: NormalizedAxisFontSpec;
}

export interface NormalizedAxisTitleSpec {
  readonly text?: string;
  readonly visible: boolean;
  readonly align: 'start' | 'center' | 'end';
  readonly angle?: number;
  readonly padding: number;
  /** Theme-owned margin resolved against measured tick labels by the compiler. */
  readonly themeGap?: number;
  readonly color?: string;
  readonly font: NormalizedAxisFontSpec;
}

export interface NormalizedAxisSpec {
  readonly channel: AxisChannel;
  readonly visible: boolean;
  readonly position: AxisPosition;
  readonly offset: number;
  readonly line: NormalizedAxisStrokeSpec;
  readonly grid: NormalizedAxisStrokeSpec;
  readonly ticks: NormalizedAxisTickSpec;
  readonly labels: NormalizedAxisLabelSpec;
  readonly title: NormalizedAxisTitleSpec;
  readonly format: NormalizedAxisFormatSpec;
}

export interface NormalizedMarkSpec {
  readonly type: string;
  readonly stroke?: string;
  readonly fill?: string;
  readonly opacity: number;
  readonly lineWidth?: number;
  readonly radius?: number;
  readonly cornerRadius?: number;
  readonly point: boolean;
  readonly position: 'overlay' | 'group';
  readonly orientation: 'vertical' | 'horizontal';
  readonly fields: Readonly<Record<string, string>>;
  readonly options: Readonly<Record<string, JsonValue>>;
}

export interface NormalizedLayerSpec {
  readonly id: string;
  readonly name: string;
  readonly data: DataInput;
  readonly transform: readonly TransformSpec[];
  readonly mark: NormalizedMarkSpec;
  readonly encoding: NormalizedEncodingMap;
  readonly x: NormalizedEncodingSpec;
  readonly y: NormalizedEncodingSpec;
  readonly clip: LayerClipSpec;
  readonly visible: boolean;
  readonly zIndex: number;
}

export interface NormalizedLegendItemSpec {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
  readonly layerId?: string;
  readonly value?: JsonPrimitive;
  readonly symbol: 'auto' | 'line' | 'point' | 'rect';
}

export interface NormalizedLegendSpec {
  readonly visible: boolean;
  readonly mode: LegendMode;
  readonly position: LegendPosition;
  readonly orientation: 'horizontal' | 'vertical';
  readonly title?: string;
  readonly field?: string;
  readonly layerId?: string;
  readonly items: readonly NormalizedLegendItemSpec[];
  readonly maxItems: number;
  readonly interactive: boolean;
  readonly labels: Required<LegendLabelsSpec>;
}

export interface NormalizedTooltipFieldSpec {
  readonly field: string;
  readonly label: string;
  readonly format: TooltipValueFormat;
  readonly fractionDigits?: number;
  readonly prefix: string;
  readonly suffix: string;
}

export interface NormalizedTooltipSpec {
  readonly trigger: TooltipTrigger;
  readonly axis?: TooltipAxis;
  readonly title?: string;
  readonly fields: readonly NormalizedTooltipFieldSpec[];
}

export interface NormalizedNavigationSpec {
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly wheel: NavigationWheelMode;
  readonly drag: boolean;
  readonly pinch: boolean;
  readonly keyboard: boolean;
}

export interface NormalizedDomainNavigationSpec {
  readonly axes: readonly AxisId[];
  readonly maxZoom: number;
  readonly wheel: NavigationWheelMode;
  readonly drag: boolean;
  readonly keyboard: boolean;
}

export interface NormalizedPlaybackSpec {
  readonly field: string;
  readonly key?: string;
  readonly layerId?: string;
  readonly mode: PlaybackMode;
  readonly interval: number;
  readonly rate: number;
  readonly loop: boolean;
  readonly direction: PlaybackDirection;
  readonly range: false | PlaybackRangeSpec;
  readonly namedFrames: readonly PlaybackNamedFrameSpec[];
  readonly windowSize: number;
  readonly autoplay: boolean;
  readonly transition:
    | false
    | {
        readonly duration: number;
        readonly easing: PlaybackTransitionEasing;
      };
  readonly filter: boolean;
}

export interface NormalizedControlLabelsSpec {
  readonly controls: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly reset: string;
  readonly enterFullscreen: string;
  readonly exitFullscreen: string;
  readonly exportPng: string;
  readonly showAnnotations: string;
  readonly hideAnnotations: string;
  readonly previousFrame: string;
  readonly play: string;
  readonly pause: string;
  readonly nextFrame: string;
  readonly seek: string;
  readonly speed: string;
  readonly loop: string;
}

export interface NormalizedControlsSpec {
  readonly zoom: boolean;
  readonly reset: boolean;
  readonly fullscreen: boolean;
  readonly export: boolean;
  readonly annotations: boolean;
  readonly playback: boolean;
  readonly labels: NormalizedControlLabelsSpec;
}

export interface NormalizedSelectionSpec {
  readonly kind: 'point' | 'interval' | 'rectangle' | 'axis' | 'lasso';
  readonly combine: 'union' | 'intersection';
  readonly mode: 'single' | 'multiple';
  readonly toggle: boolean;
  readonly key?: string;
  readonly clearOnBackground: boolean;
  readonly clearOnEscape: boolean;
  readonly ariaLabel: string;
  readonly highlight: Required<HighlightStyleSpec>;
  readonly axis?: AxisId;
  readonly xAxis: AxisId;
  readonly yAxis: AxisId;
  readonly maxSelections: number;
  readonly maxLassoPoints: number;
  readonly minPixelSpan: number;
  readonly keyboard: boolean;
  readonly keyboardStep: number;
  readonly filter: boolean;
  readonly linked: boolean;
}

export interface NormalizedInteractionSpec {
  readonly hover: boolean;
  readonly click: boolean;
  readonly tooltip: false | NormalizedTooltipSpec;
  readonly navigation: false | NormalizedNavigationSpec;
  readonly domainNavigation: false | NormalizedDomainNavigationSpec;
  readonly playback: false | NormalizedPlaybackSpec;
  readonly controls: false | NormalizedControlsSpec;
  readonly selection: false | NormalizedSelectionSpec;
}

export interface NormalizedMarkLabelSnapSpec {
  readonly grid: number | false;
  readonly marks: boolean;
  readonly plot: boolean;
  readonly distance: number;
}

export interface NormalizedMarkLabelAuthoringSpec {
  readonly pointer: boolean;
  readonly keyboard: boolean;
  readonly step: number;
  readonly historyLimit: number;
  readonly snap: false | NormalizedMarkLabelSnapSpec;
}

export interface NormalizedMarkLabelSpec {
  readonly visible: boolean;
  readonly field?: string;
  readonly key?: string;
  readonly layerIds: readonly string[];
  readonly placement: MarkLabelPlacement;
  readonly offset: number;
  readonly collision: MarkLabelCollision;
  readonly connector: false | MarkLabelConnectorSpec;
  readonly maxLabels: number;
  readonly positions: readonly MarkLabelPositionSpec[];
  readonly style: MarkLabelStyleSpec;
  readonly authoring: false | NormalizedMarkLabelAuthoringSpec;
}

export interface NormalizedChartSpec {
  readonly specVersion: '0.1';
  readonly layers: readonly NormalizedLayerSpec[];
  readonly width: number | 'container';
  readonly height: number | 'container';
  readonly padding: PaddingSpec;
  readonly title?: TitleSpec;
  readonly description?: string;
  readonly renderer: RendererPreference;
  readonly performance: PerformanceProfile;
  readonly theme: NonNullable<ChartSpec['theme']>;
  readonly locale?: string;
  readonly axes: Readonly<Record<AxisId, NormalizedAxisSpec | false>>;
  readonly legend: false | NormalizedLegendSpec;
  readonly highlights: readonly HighlightSpec[];
  readonly annotations: readonly AnnotationSpec[];
  readonly markLabels: false | NormalizedMarkLabelSpec;
  readonly interaction: NormalizedInteractionSpec;
  readonly accessibility: NormalizedAccessibilitySpec;
}

export interface NormalizedAccessibilitySpec {
  readonly label?: string;
  readonly description?: string;
  readonly table: false | 'hidden' | 'visible';
  readonly maxRows: number;
  readonly navigation: boolean;
  readonly explorer:
    | false
    | {
        readonly windowRows: number;
        readonly overscanRows: number;
        readonly rowHeight: number;
      };
  readonly linkedFocus: false | { readonly group: string; readonly key: string };
  readonly summary?: string;
  readonly live: false | { readonly throttleMs: number };
}
