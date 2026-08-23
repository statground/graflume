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
  readonly reverse?: boolean;
  readonly paddingInner?: number;
  readonly paddingOuter?: number;
}

export type AxisId = 'x' | 'x2' | 'y' | 'y2';
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
  /** Bind this encoding to the primary or secondary axis for its channel. */
  readonly axisId?: AxisId;
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

export type PlaybackMode = 'frame' | 'cumulative' | 'window';

export interface PlaybackSpec {
  readonly field: string;
  readonly layerId?: string;
  readonly mode?: PlaybackMode;
  readonly interval?: number;
  readonly rate?: number;
  readonly loop?: boolean;
  readonly windowSize?: number;
  readonly autoplay?: boolean;
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
  readonly playback?: boolean;
  readonly labels?: ControlLabelsSpec;
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
  readonly playback?: false | PlaybackSpec;
  readonly controls?: boolean | ControlsSpec;
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
    readonly x2?: AxisSpec | false;
    readonly y?: AxisSpec | false;
    readonly y2?: AxisSpec | false;
  };
  readonly interaction?: InteractionSpec;
  readonly accessibility?: AccessibilitySpec;
}

export interface NormalizedEncodingSpec {
  readonly field: string;
  readonly type?: FieldType;
  readonly title: string;
  readonly scale: ScaleSpec;
  readonly axisId: AxisId;
  readonly axis: NormalizedAxisSpec | false;
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
  readonly color?: string;
  readonly font: NormalizedAxisFontSpec;
}

export interface NormalizedAxisSpec {
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

export interface NormalizedNavigationSpec {
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly wheel: NavigationWheelMode;
  readonly drag: boolean;
  readonly pinch: boolean;
  readonly keyboard: boolean;
}

export interface NormalizedPlaybackSpec {
  readonly field: string;
  readonly layerId?: string;
  readonly mode: PlaybackMode;
  readonly interval: number;
  readonly rate: number;
  readonly loop: boolean;
  readonly windowSize: number;
  readonly autoplay: boolean;
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
  readonly playback: boolean;
  readonly labels: NormalizedControlLabelsSpec;
}

export interface NormalizedInteractionSpec {
  readonly hover: boolean;
  readonly click: boolean;
  readonly tooltip: false | NormalizedTooltipSpec;
  readonly navigation: false | NormalizedNavigationSpec;
  readonly playback: false | NormalizedPlaybackSpec;
  readonly controls: false | NormalizedControlsSpec;
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
    readonly x: NormalizedAxisSpec | false;
    readonly x2: NormalizedAxisSpec | false;
    readonly y: NormalizedAxisSpec | false;
    readonly y2: NormalizedAxisSpec | false;
  };
  readonly interaction: NormalizedInteractionSpec;
  readonly accessibility: AccessibilitySpec;
}
