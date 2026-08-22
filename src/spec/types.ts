import type { DeepPartial } from '../utils/object.js';
import type { ThemeTokens } from '../theme/types.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type DataValue = JsonPrimitive | Date | undefined;
export type DataRow = Readonly<Record<string, DataValue>>;
export type ColumnLike = ArrayLike<DataValue>;

export interface ColumnarData {
  readonly columns: Readonly<Record<string, ColumnLike>>;
  readonly length?: number;
}

export type DataInput = readonly DataRow[] | ColumnarData;
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
  | 'range'
  | 'renko'
  | 'sankey'
  | 'scatter-3d'
  | 'smooth'
  | 'solid-gauge'
  | 'stepped-area'
  | 'sunburst'
  | 'table'
  | 'theme-river'
  | 'tiled-map'
  | 'tilemap'
  | 'timeline'
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
  | 'word-tree';
export type PerformanceProfile = 'auto' | 'standard' | 'large' | 'ultra';
export type RendererPreference = 'auto' | 'canvas' | 'svg' | 'webgl' | 'webgpu' | string;

export interface ScaleSpec {
  readonly type?: 'linear' | 'band' | 'time';
  readonly domain?: readonly (number | string)[];
  readonly zero?: boolean;
  readonly nice?: boolean;
  readonly clamp?: boolean;
  readonly paddingInner?: number;
  readonly paddingOuter?: number;
}

export interface AxisSpec {
  readonly title?: string;
  readonly visible?: boolean;
  readonly grid?: boolean;
  readonly tickCount?: number;
  readonly format?: string;
  readonly labelAngle?: number;
}

export interface EncodingSpec {
  readonly field: string;
  readonly type?: FieldType;
  readonly title?: string;
  readonly scale?: ScaleSpec;
  readonly axis?: AxisSpec | false;
}

export type EncodingInput = string | EncodingSpec;

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
  readonly data?: DataInput;
  readonly mark: MarkInput;
  readonly x: EncodingInput;
  readonly y: EncodingInput;
  readonly visible?: boolean;
  readonly zIndex?: number;
}

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
}

export type TooltipValueFormat = 'auto' | 'number' | 'integer' | 'percent' | 'date' | 'datetime';
export type TooltipTrigger = 'mark' | 'axis';
export type TooltipAxis = 'x' | 'y';

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

export interface InteractionSpec {
  readonly hover?: boolean;
  readonly click?: boolean;
  /**
   * Enable the built-in text-only datum tooltip or declare its portable fields.
   * Executable and raw-HTML formatters are intentionally unsupported.
   */
  readonly tooltip?: boolean | TooltipSpec;
}

export interface ChartSpec {
  readonly $schema?: string;
  readonly specVersion?: '0.1';
  readonly data?: DataInput;
  readonly mark?: MarkInput;
  readonly x?: EncodingInput;
  readonly y?: EncodingInput;
  readonly layers?: readonly LayerSpec[];
  readonly width?: number | 'container';
  readonly height?: number | 'container';
  readonly padding?: PaddingInput;
  readonly title?: string | TitleSpec;
  readonly description?: string;
  readonly renderer?: RendererPreference;
  readonly performance?: PerformanceProfile;
  readonly theme?: string | (DeepPartial<ThemeTokens> & { readonly extends?: string });
  readonly locale?: string;
  readonly axes?: {
    readonly x?: AxisSpec | false;
    readonly y?: AxisSpec | false;
  };
  readonly interaction?: InteractionSpec;
  readonly accessibility?: AccessibilitySpec;
}

export interface NormalizedEncodingSpec {
  readonly field: string;
  readonly type?: FieldType;
  readonly title: string;
  readonly scale: ScaleSpec;
  readonly axis: AxisSpec | false;
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
  readonly data: DataInput;
  readonly mark: NormalizedMarkSpec;
  readonly x: NormalizedEncodingSpec;
  readonly y: NormalizedEncodingSpec;
  readonly visible: boolean;
  readonly zIndex: number;
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

export interface NormalizedInteractionSpec {
  readonly hover: boolean;
  readonly click: boolean;
  readonly tooltip: false | NormalizedTooltipSpec;
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
  readonly axes: {
    readonly x: AxisSpec | false;
    readonly y: AxisSpec | false;
  };
  readonly interaction: NormalizedInteractionSpec;
  readonly accessibility: AccessibilitySpec;
}
