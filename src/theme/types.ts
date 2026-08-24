export interface ThemeTokens {
  readonly name: string;
  readonly mode: 'light' | 'dark';
  readonly colors: {
    readonly background: string;
    readonly surface: string;
    /** Plot-panel fill. When omitted, no separate panel rectangle is emitted. */
    readonly panel?: string;
    readonly text: string;
    readonly mutedText: string;
    readonly subtitle?: string;
    readonly axisTitle?: string;
    readonly axis: string;
    readonly grid: string;
    readonly minorGrid?: string;
    readonly focus: string;
    readonly palette: readonly string[];
    /** Dynamic categorical scale used by ggplot2-compatible themes. */
    readonly paletteMode?: 'fixed' | 'ggplot2-hue';
    /** Interpolation used between authored continuous colour stops. */
    readonly continuousInterpolation?: 'step' | 'rgb' | 'lab';
    readonly sequential: readonly string[];
    readonly diverging: readonly string[];
  };
  readonly typography: {
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontWeight?: number;
    readonly titleSize: number;
    readonly titleWeight?: number;
    readonly subtitleSize: number;
    readonly subtitleWeight?: number;
    readonly axisLabelSize?: number;
    readonly axisLabelWeight?: number;
    readonly axisTitleSize?: number;
    readonly axisTitleWeight?: number;
    readonly legendLabelSize?: number;
    readonly legendLabelWeight?: number;
    readonly legendTitleSize?: number;
    readonly legendTitleWeight?: number;
    readonly titlePosition?: 'plot' | 'panel';
    readonly titleAlign?: 'left' | 'center' | 'right';
    readonly lineHeight: number;
  };
  readonly spacing: {
    readonly xs: number;
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
    readonly xl: number;
    readonly plotMargin?: number;
    readonly plotPadding?: {
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
      readonly left: number;
    };
    /** Minimum vertical space reserved above the plot, even without a title. */
    readonly minimumTitleBlock?: number;
  };
  readonly axis: {
    readonly lineWidth: number;
    readonly tickLength: number;
    readonly labelPadding: number;
    readonly gridLineWidth: number;
    readonly lineVisible?: boolean;
    /** Draw a complete plot-region box behind the primary axes. */
    readonly boxVisible?: boolean;
    readonly boxLineWidth?: number;
    /** Mark types whose native visual grammar omits the enclosing plot box. */
    readonly boxExcludedMarks?: readonly string[];
    readonly ticksVisible?: boolean;
    readonly gridX?: boolean;
    readonly gridX2?: boolean;
    readonly gridY?: boolean;
    readonly gridY2?: boolean;
    readonly gridOpacity?: number;
    readonly minorGridVisible?: boolean;
    readonly minorGridLineWidth?: number;
    readonly minorGridOpacity?: number;
    readonly emphasizeZero?: boolean;
    readonly lineCap?: 'butt' | 'round' | 'square';
    /** Gap between the outermost tick label and an automatically positioned axis title. */
    readonly titleGap?: number;
  };
  readonly mark: {
    readonly lineWidth: number;
    readonly pointRadius: number;
    readonly barRadius: number;
    readonly opacity: number;
    readonly defaultColor?: string;
    readonly lineColor?: string;
    readonly pointFill?: string;
    readonly pointStroke?: string;
    readonly pointStrokeWidth?: number;
    /** Whether point faces and edges follow the resolved per-series colour. */
    readonly pointColorMode?: 'theme' | 'series';
    readonly barFill?: string;
    readonly barStroke?: string;
    readonly barStrokeWidth?: number;
    readonly barWidthRatio?: number;
    readonly histogramFill?: string;
    /** Inset from each side of a generated histogram bin. */
    readonly histogramGap?: number;
    readonly boxplotFill?: string;
    readonly boxplotLineWidth?: number;
    readonly boxplotRadius?: number;
    readonly boxplotMedianStroke?: string;
    readonly piePalette?: readonly string[];
    readonly pieStroke?: string;
    readonly pieStrokeWidth?: number;
    /** Default pie start angle in Canvas radians when the mark does not override it. */
    readonly pieStartAngle?: number;
    readonly pieDirection?: 'clockwise' | 'counterclockwise';
    readonly areaFill?: string;
    readonly areaStroke?: string;
    /** Whether an area gets its theme-default outline when no explicit stroke is authored. */
    readonly areaStrokeVisible?: boolean;
    /** Whether area faces and outlines follow the resolved per-series colour. */
    readonly areaColorMode?: 'theme' | 'series';
    readonly lineCap?: 'butt' | 'round' | 'square';
    readonly lineJoin?: 'bevel' | 'round' | 'miter';
  };
  readonly legend?: {
    readonly surfaceOpacity?: number;
    readonly borderWidth?: number;
    readonly borderColor?: string;
    readonly cornerRadius?: number;
    readonly swatchRadius?: number;
    readonly swatchSize?: number;
    readonly lineWidth?: number;
    readonly pointRadius?: number;
    readonly pointStrokeWidth?: number;
    readonly lineCap?: 'butt' | 'round' | 'square';
    /** Number of samples used to draw a continuous legend scale. */
    readonly continuousSamples?: number;
  };
  readonly motion: {
    readonly duration: number;
    readonly easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
}
