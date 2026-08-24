import { specVersion } from '../version.js';
import { graflumeGgplot } from '../theme/defaults.js';
import type { ThemeTokens } from '../theme/types.js';
import { assertValidSpec } from './validate.js';
import type {
  AxisFormatInput,
  AxisFontSpec,
  AxisId,
  AxisLabelSpec,
  AxisSpec,
  AxisStrokeSpec,
  AxisTickSpec,
  AxisTitleSpec,
  AnnotationSpec,
  ChartSpec,
  DataInput,
  DecorationTargetSpec,
  EncodingInput,
  LayerSpec,
  LegendItemSpec,
  LegendSpec,
  MarkInput,
  NormalizedAxisFontSpec,
  NormalizedAxisFormatSpec,
  NormalizedAxisLabelSpec,
  NormalizedAxisSpec,
  NormalizedAxisStrokeSpec,
  NormalizedAxisTickSpec,
  NormalizedAxisTitleSpec,
  NormalizedChartSpec,
  NormalizedEncodingSpec,
  NormalizedInteractionSpec,
  NormalizedLegendSpec,
  NormalizedLayerSpec,
  NormalizedMarkSpec,
  NormalizedTooltipFieldSpec,
  PaddingInput,
  PaddingSpec,
  TitleSpec,
  TooltipFieldInput,
} from './types.js';

const defaultControlLabels = {
  controls: 'Chart controls',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset view',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  exportPng: 'Download PNG',
  showAnnotations: 'Show annotations',
  hideAnnotations: 'Hide annotations',
  previousFrame: 'Previous frame',
  play: 'Play',
  pause: 'Pause',
  nextFrame: 'Next frame',
  seek: 'Playback position',
  speed: 'Playback speed',
  loop: 'Loop playback',
} as const;

const defaultLegendLabels = {
  show: 'Show',
  hide: 'Hide',
} as const;

function normalizePadding(input: PaddingInput | undefined, theme?: ThemeTokens): PaddingSpec {
  if (typeof input === 'number') {
    return { top: input, right: input, bottom: input, left: input };
  }
  const themedMargin = theme?.spacing.plotMargin;
  return {
    top: input?.top ?? themedMargin ?? 24,
    right: input?.right ?? themedMargin ?? 24,
    bottom: input?.bottom ?? themedMargin ?? 44,
    left: input?.left ?? themedMargin ?? 56,
  };
}

function normalizeTitle(input: ChartSpec['title']): TitleSpec | undefined {
  if (input === undefined) return undefined;
  if (typeof input === 'string') return { text: input, align: 'left' };
  return { ...input, align: input.align ?? 'left' };
}

function humanizeField(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function normalizeTooltipField(input: TooltipFieldInput): NormalizedTooltipFieldSpec {
  const field = typeof input === 'string' ? input : input.field;
  return {
    field,
    label: typeof input === 'string' ? humanizeField(field) : (input.label ?? humanizeField(field)),
    format: typeof input === 'string' ? 'auto' : (input.format ?? 'auto'),
    ...(typeof input === 'string' || input.fractionDigits === undefined
      ? {}
      : { fractionDigits: input.fractionDigits }),
    prefix: typeof input === 'string' ? '' : (input.prefix ?? ''),
    suffix: typeof input === 'string' ? '' : (input.suffix ?? ''),
  };
}

function normalizeInteraction(input: ChartSpec['interaction']): NormalizedInteractionSpec {
  const hover = input?.hover ?? true;
  const tooltipInput = input?.tooltip;
  const tooltip =
    !hover || tooltipInput === undefined || tooltipInput === false
      ? false
      : {
          trigger:
            typeof tooltipInput === 'object' ? (tooltipInput.trigger ?? 'mark') : ('mark' as const),
          ...(typeof tooltipInput === 'object' && tooltipInput.axis !== undefined
            ? { axis: tooltipInput.axis }
            : {}),
          ...(typeof tooltipInput === 'object' && tooltipInput.title !== undefined
            ? { title: tooltipInput.title }
            : {}),
          fields:
            typeof tooltipInput === 'object'
              ? (tooltipInput.fields ?? []).map(normalizeTooltipField)
              : [],
        };
  const navigationInput = input?.navigation;
  const navigation =
    navigationInput === undefined || navigationInput === false
      ? false
      : {
          minZoom: typeof navigationInput === 'object' ? (navigationInput.minZoom ?? 1) : 1,
          maxZoom: typeof navigationInput === 'object' ? (navigationInput.maxZoom ?? 6) : 6,
          wheel:
            typeof navigationInput === 'object'
              ? (navigationInput.wheel ?? 'modifier')
              : ('modifier' as const),
          drag: typeof navigationInput === 'object' ? (navigationInput.drag ?? true) : true,
          pinch: typeof navigationInput === 'object' ? (navigationInput.pinch ?? true) : true,
          keyboard: typeof navigationInput === 'object' ? (navigationInput.keyboard ?? true) : true,
        };
  const playbackInput = input?.playback;
  const playback =
    playbackInput === undefined || playbackInput === false
      ? false
      : typeof playbackInput === 'object'
        ? {
            field: playbackInput.field,
            ...(playbackInput.key === undefined ? {} : { key: playbackInput.key }),
            ...(playbackInput.layerId === undefined ? {} : { layerId: playbackInput.layerId }),
            mode: playbackInput.mode ?? 'frame',
            interval: playbackInput.interval ?? 1_000,
            rate: playbackInput.rate ?? 1,
            loop: playbackInput.loop ?? false,
            windowSize: playbackInput.windowSize ?? 1,
            autoplay: playbackInput.autoplay ?? false,
            transition:
              playbackInput.transition === undefined || playbackInput.transition === false
                ? (false as const)
                : {
                    duration: playbackInput.transition.duration ?? 400,
                    easing: playbackInput.transition.easing ?? 'ease-in-out',
                  },
            filter: playbackInput.filter ?? false,
          }
        : false;
  const controlsInput = input?.controls;
  const controls =
    controlsInput === undefined || controlsInput === false
      ? false
      : {
          zoom: typeof controlsInput === 'object' ? (controlsInput.zoom ?? false) : true,
          reset: typeof controlsInput === 'object' ? (controlsInput.reset ?? false) : true,
          fullscreen:
            typeof controlsInput === 'object' ? (controlsInput.fullscreen ?? false) : true,
          export: typeof controlsInput === 'object' ? (controlsInput.export ?? false) : true,
          annotations:
            typeof controlsInput === 'object' ? (controlsInput.annotations ?? false) : true,
          playback: typeof controlsInput === 'object' ? (controlsInput.playback ?? false) : true,
          labels: {
            ...defaultControlLabels,
            ...(typeof controlsInput === 'object' ? controlsInput.labels : undefined),
          },
        };
  const selectionInput = input?.selection;
  const selection =
    selectionInput === undefined || selectionInput === false
      ? false
      : {
          mode: typeof selectionInput === 'object' ? (selectionInput.mode ?? 'single') : 'single',
          toggle: typeof selectionInput === 'object' ? (selectionInput.toggle ?? true) : true,
          ...(typeof selectionInput === 'object' && selectionInput.key !== undefined
            ? { key: selectionInput.key }
            : {}),
          clearOnBackground:
            typeof selectionInput === 'object' ? (selectionInput.clearOnBackground ?? true) : true,
          clearOnEscape:
            typeof selectionInput === 'object' ? (selectionInput.clearOnEscape ?? true) : true,
          ariaLabel:
            typeof selectionInput === 'object'
              ? (selectionInput.ariaLabel ?? 'Chart selection')
              : 'Chart selection',
          highlight: {
            fill:
              typeof selectionInput === 'object'
                ? (selectionInput.highlight?.fill ?? 'rgba(79,70,229,0.12)')
                : 'rgba(79,70,229,0.12)',
            stroke:
              typeof selectionInput === 'object'
                ? (selectionInput.highlight?.stroke ?? '#4f46e5')
                : '#4f46e5',
            opacity:
              typeof selectionInput === 'object' ? (selectionInput.highlight?.opacity ?? 1) : 1,
            lineWidth:
              typeof selectionInput === 'object'
                ? (selectionInput.highlight?.lineWidth ?? 2.5)
                : 2.5,
            dash:
              typeof selectionInput === 'object' ? [...(selectionInput.highlight?.dash ?? [])] : [],
            padding:
              typeof selectionInput === 'object' ? (selectionInput.highlight?.padding ?? 5) : 5,
            radius:
              typeof selectionInput === 'object' ? (selectionInput.highlight?.radius ?? 7) : 7,
          },
        };
  return {
    hover,
    click: input?.click ?? true,
    tooltip,
    navigation,
    playback,
    controls,
    selection,
  };
}

function normalizeLegendItem(item: LegendItemSpec, index: number) {
  return {
    id: item.id ?? `item-${index}`,
    label: item.label,
    ...(item.color === undefined ? {} : { color: item.color }),
    ...(item.layerId === undefined ? {} : { layerId: item.layerId }),
    ...(item.value === undefined ? {} : { value: item.value }),
    symbol: item.symbol ?? 'auto',
  };
}

function normalizeLegend(input: ChartSpec['legend']): false | NormalizedLegendSpec {
  if (input === undefined || input === false) return false;
  const legend: LegendSpec = typeof input === 'object' ? input : {};
  const position = legend.position ?? 'right';
  return {
    visible: legend.visible ?? true,
    mode: legend.mode ?? 'auto',
    position,
    orientation:
      legend.orientation === undefined || legend.orientation === 'auto'
        ? position === 'top' || position === 'bottom'
          ? 'horizontal'
          : 'vertical'
        : legend.orientation,
    ...(legend.title === undefined ? {} : { title: legend.title }),
    ...(legend.field === undefined ? {} : { field: legend.field }),
    ...(legend.layerId === undefined ? {} : { layerId: legend.layerId }),
    items: (legend.items ?? []).map(normalizeLegendItem),
    maxItems: legend.maxItems ?? 24,
    interactive: legend.interactive ?? false,
    labels: { ...defaultLegendLabels, ...legend.labels },
  };
}

function cloneDecorationTarget(target: DecorationTargetSpec): DecorationTargetSpec {
  switch (target.type) {
    case 'datum':
      return {
        ...target,
        ...(Array.isArray(target.rowIndex) ? { rowIndex: [...target.rowIndex] } : {}),
        ...(target.values === undefined ? {} : { values: [...target.values] }),
      };
    case 'range':
      return {
        type: 'range',
        ...(target.x === undefined ? {} : { x: { ...target.x } }),
        ...(target.y === undefined ? {} : { y: { ...target.y } }),
      };
    case 'layer':
      return { ...target };
    case 'plot':
      return { ...target };
  }
}

function cloneAnnotation(annotation: AnnotationSpec): AnnotationSpec {
  return {
    ...annotation,
    target: cloneDecorationTarget(annotation.target),
    ...(typeof annotation.connector !== 'object'
      ? {}
      : { connector: { ...annotation.connector, dash: [...(annotation.connector.dash ?? [])] } }),
    ...(annotation.style === undefined ? {} : { style: { ...annotation.style } }),
  };
}

const axisDefaults: Readonly<
  Record<
    AxisId,
    {
      readonly position: NormalizedAxisSpec['position'];
      readonly grid: boolean;
      readonly titlePadding: number;
    }
  >
> = {
  x: { position: 'bottom', grid: false, titlePadding: 32 },
  x2: { position: 'top', grid: false, titlePadding: 32 },
  y: { position: 'left', grid: true, titlePadding: 46 },
  y2: { position: 'right', grid: false, titlePadding: 46 },
};

function axisGridDefault(id: AxisId, theme: ThemeTokens | undefined): boolean {
  const themed =
    id === 'x'
      ? theme?.axis.gridX
      : id === 'x2'
        ? theme?.axis.gridX2
        : id === 'y'
          ? theme?.axis.gridY
          : theme?.axis.gridY2;
  return themed ?? axisDefaults[id].grid;
}

function normalizeAxisFont(input: AxisFontSpec | undefined): NormalizedAxisFontSpec {
  return {
    ...(input?.family === undefined ? {} : { family: input.family }),
    ...(input?.size === undefined ? {} : { size: input.size }),
    ...(input?.weight === undefined ? {} : { weight: input.weight }),
    style: input?.style ?? 'normal',
  };
}

function normalizeAxisStroke(
  input: boolean | AxisStrokeSpec | undefined,
  defaultVisible: boolean,
  defaultOpacity = 1,
): NormalizedAxisStrokeSpec {
  const stroke = typeof input === 'object' ? input : undefined;
  return {
    visible: typeof input === 'boolean' ? input : (stroke?.visible ?? defaultVisible),
    ...(stroke?.color === undefined ? {} : { color: stroke.color }),
    ...(stroke?.width === undefined ? {} : { width: stroke.width }),
    opacity: stroke?.opacity ?? defaultOpacity,
    dash: [...(stroke?.dash ?? [])],
  };
}

function normalizeAxisTicks(
  input: boolean | AxisTickSpec | undefined,
  legacyCount: number | undefined,
  defaultVisible = true,
): NormalizedAxisTickSpec {
  const ticks = typeof input === 'object' ? input : undefined;
  const count = ticks?.count ?? legacyCount;
  return {
    ...normalizeAxisStroke(input, defaultVisible),
    ...(count === undefined ? {} : { count }),
    spacing: ticks?.spacing ?? 0,
    ...(ticks?.size === undefined ? {} : { size: ticks.size }),
    ...(ticks?.values === undefined ? {} : { values: [...ticks.values] }),
  };
}

function normalizeAxisLabels(
  input: boolean | AxisLabelSpec | undefined,
  legacyAngle: number | undefined,
): NormalizedAxisLabelSpec {
  const labels = typeof input === 'object' ? input : undefined;
  const angle = labels?.angle ?? legacyAngle;
  return {
    visible: typeof input === 'boolean' ? input : (labels?.visible ?? true),
    orientation: labels?.orientation ?? 'auto',
    ...(angle === undefined ? {} : { angle }),
    align: labels?.align ?? 'auto',
    ...(labels?.padding === undefined ? {} : { padding: labels.padding }),
    ...(labels?.maxLength === undefined ? {} : { maxLength: labels.maxLength }),
    ...(labels?.color === undefined ? {} : { color: labels.color }),
    font: normalizeAxisFont(labels?.font),
  };
}

function normalizeAxisTitle(
  input: AxisSpec['title'],
  defaultPadding: number,
  themeGap: number | undefined,
): NormalizedAxisTitleSpec {
  const title = typeof input === 'object' ? input : undefined;
  return {
    ...(typeof input === 'string'
      ? { text: input }
      : title?.text === undefined
        ? {}
        : { text: title.text }),
    visible: input === false ? false : (title?.visible ?? true),
    align: title?.align ?? 'center',
    ...(title?.angle === undefined ? {} : { angle: title.angle }),
    padding: title?.padding ?? defaultPadding,
    ...(title?.padding === undefined && themeGap !== undefined ? { themeGap } : {}),
    ...(title?.color === undefined ? {} : { color: title.color }),
    font: normalizeAxisFont(title?.font),
  };
}

function normalizeAxisFormat(input: AxisFormatInput | undefined): NormalizedAxisFormatSpec {
  const format = typeof input === 'string' ? { type: input } : (input ?? {});
  const type = format.type ?? 'auto';
  return {
    type,
    ...(format.fractionDigits === undefined ? {} : { fractionDigits: format.fractionDigits }),
    notation:
      format.notation ??
      (type === 'compact' ? 'compact' : type === 'scientific' ? 'scientific' : 'standard'),
    useGrouping: format.useGrouping ?? true,
    ...(format.currency === undefined && type !== 'currency'
      ? {}
      : { currency: format.currency ?? 'USD' }),
    currencyDisplay: format.currencyDisplay ?? 'symbol',
    dateStyle: format.dateStyle ?? 'medium',
    timeStyle: format.timeStyle ?? 'short',
    timeZone: format.timeZone ?? 'UTC',
    prefix: format.prefix ?? '',
    suffix: format.suffix ?? '',
  };
}

function mergeBooleanObject<T extends object>(
  base: boolean | T | undefined,
  override: boolean | T | undefined,
): boolean | T | undefined {
  if (override === undefined) return base;
  if (typeof override === 'boolean') return override;
  const baseObject = typeof base === 'object' ? base : base === undefined ? {} : { visible: base };
  return { ...baseObject, ...override } as T;
}

function mergeFont(
  base: AxisFontSpec | undefined,
  override: AxisFontSpec | undefined,
): AxisFontSpec | undefined {
  if (override === undefined) return base;
  return { ...base, ...override };
}

function mergeLabels(
  base: boolean | AxisLabelSpec | undefined,
  override: boolean | AxisLabelSpec | undefined,
): boolean | AxisLabelSpec | undefined {
  const merged = mergeBooleanObject(base, override);
  if (typeof merged !== 'object' || typeof override !== 'object') return merged;
  const baseFont = typeof base === 'object' ? base.font : undefined;
  const font = mergeFont(baseFont, override.font);
  return { ...merged, ...(font === undefined ? {} : { font }) };
}

function mergeTitle(base: AxisSpec['title'], override: AxisSpec['title']): AxisSpec['title'] {
  if (override === undefined) return base;
  if (typeof override !== 'object') return override;
  const baseObject: AxisTitleSpec =
    typeof base === 'object'
      ? base
      : typeof base === 'string'
        ? { text: base }
        : base === false
          ? { visible: false }
          : {};
  const font = mergeFont(baseObject.font, override.font);
  return { ...baseObject, ...override, ...(font === undefined ? {} : { font }) };
}

function mergeFormat(
  base: AxisFormatInput | undefined,
  override: AxisFormatInput | undefined,
): AxisFormatInput | undefined {
  if (override === undefined) return base;
  if (typeof override === 'string') return override;
  const baseObject = typeof base === 'string' ? { type: base } : base;
  return { ...baseObject, ...override };
}

function mergeAxis(
  base: AxisSpec | false | undefined,
  override: AxisSpec | false | undefined,
): AxisSpec | false | undefined {
  if (override === undefined) return base;
  if (override === false) return false;
  if (base === false || base === undefined) return override;

  const line = mergeBooleanObject(base.line, override.line);
  const grid = mergeBooleanObject(base.grid, override.grid);
  const ticks = mergeBooleanObject(base.ticks, override.ticks);
  const labels = mergeLabels(base.labels, override.labels);
  const title = mergeTitle(base.title, override.title);
  const format = mergeFormat(base.format, override.format);
  return {
    ...base,
    ...override,
    ...(line === undefined ? {} : { line }),
    ...(grid === undefined ? {} : { grid }),
    ...(ticks === undefined ? {} : { ticks }),
    ...(labels === undefined ? {} : { labels }),
    ...(title === undefined ? {} : { title }),
    ...(format === undefined ? {} : { format }),
  };
}

function normalizeAxis(
  input: AxisSpec | false | undefined,
  id: AxisId,
  theme: ThemeTokens | undefined,
): NormalizedAxisSpec | false {
  if (input === false) return false;
  const defaults = axisDefaults[id];
  return {
    visible: input?.visible ?? true,
    position: input?.position ?? defaults.position,
    offset: input?.offset ?? 0,
    line: normalizeAxisStroke(input?.line, theme?.axis.lineVisible ?? true),
    grid: normalizeAxisStroke(
      input?.grid,
      axisGridDefault(id, theme),
      theme?.axis.gridOpacity ?? 0.82,
    ),
    ticks: normalizeAxisTicks(input?.ticks, input?.tickCount, theme?.axis.ticksVisible ?? true),
    labels: normalizeAxisLabels(input?.labels, input?.labelAngle),
    title: normalizeAxisTitle(input?.title, defaults.titlePadding, theme?.axis.titleGap),
    format: normalizeAxisFormat(input?.format),
  };
}

function normalizeEncoding(
  input: EncodingInput,
  channel: 'x' | 'y',
  chartAxes: NonNullable<ChartSpec['axes']>,
  theme: ThemeTokens | undefined,
): NormalizedEncodingSpec {
  const encoding = typeof input === 'string' ? { field: input } : input;
  const axisId = encoding.axisId ?? channel;
  const axis = mergeAxis(chartAxes[axisId], encoding.axis);
  return {
    field: encoding.field,
    ...(encoding.type === undefined ? {} : { type: encoding.type }),
    title: encoding.title ?? encoding.field,
    scale: { ...encoding.scale },
    axisId,
    axis: normalizeAxis(axis, axisId, theme),
  };
}

function normalizeMark(input: MarkInput): NormalizedMarkSpec {
  const mark = typeof input === 'string' ? { type: input } : input;
  return {
    type: mark.type,
    ...(mark.stroke === undefined ? {} : { stroke: mark.stroke }),
    ...(mark.fill === undefined ? {} : { fill: mark.fill }),
    opacity: mark.opacity ?? 1,
    ...(mark.lineWidth === undefined ? {} : { lineWidth: mark.lineWidth }),
    ...(mark.radius === undefined ? {} : { radius: mark.radius }),
    ...(mark.cornerRadius === undefined ? {} : { cornerRadius: mark.cornerRadius }),
    point: mark.point ?? false,
    position: mark.position ?? 'overlay',
    orientation: mark.orientation ?? 'vertical',
    fields: { ...mark.fields },
    options: { ...mark.options },
  };
}

function normalizeLayer(
  layer: LayerSpec,
  index: number,
  parentData: DataInput | undefined,
  chartAxes: NonNullable<ChartSpec['axes']>,
  theme: ThemeTokens | undefined,
): NormalizedLayerSpec {
  const data = layer.data ?? parentData;
  if (data === undefined) {
    throw new Error('Spec validation should guarantee layer data.');
  }
  return {
    id: layer.id ?? `layer-${index}`,
    name: layer.name ?? layer.id ?? `Series ${index + 1}`,
    data,
    mark: normalizeMark(layer.mark),
    x: normalizeEncoding(layer.x, 'x', chartAxes, theme),
    y: normalizeEncoding(layer.y, 'y', chartAxes, theme),
    visible: layer.visible ?? true,
    zIndex: layer.zIndex ?? index,
  };
}

export function normalizeSpec(input: ChartSpec, resolvedTheme?: ThemeTokens): NormalizedChartSpec {
  assertValidSpec(input);

  // Keep the one-argument public normalizer backward compatible while allowing
  // the built-in ggplot contract to be inspected without constructing a runtime.
  const theme = resolvedTheme ?? (input.theme === 'ggplot' ? graflumeGgplot : undefined);

  const chartAxes = input.axes ?? {};
  const axes = {
    x: normalizeAxis(chartAxes.x, 'x', theme),
    x2: normalizeAxis(chartAxes.x2, 'x2', theme),
    y: normalizeAxis(chartAxes.y, 'y', theme),
    y2: normalizeAxis(chartAxes.y2, 'y2', theme),
  } as const;

  const shorthandLayer: LayerSpec | undefined =
    input.mark === undefined || input.x === undefined || input.y === undefined
      ? undefined
      : {
          ...(input.data === undefined ? {} : { data: input.data }),
          mark: input.mark,
          x: input.x,
          y: input.y,
        };

  const sourceLayers = input.layers ?? (shorthandLayer === undefined ? [] : [shorthandLayer]);
  const layers = sourceLayers.map((layer, index) =>
    normalizeLayer(layer, index, input.data, chartAxes, theme),
  );

  const title = normalizeTitle(input.title);

  const normalized: NormalizedChartSpec = {
    specVersion,
    layers,
    width: input.width ?? 'container',
    height: input.height ?? 400,
    padding: normalizePadding(input.padding, theme),
    renderer: input.renderer ?? 'auto',
    performance: input.performance ?? 'auto',
    theme: input.theme ?? 'graflume-light',
    axes,
    legend: normalizeLegend(input.legend),
    highlights: (input.highlights ?? []).map((highlight) => ({
      ...highlight,
      target: cloneDecorationTarget(highlight.target),
      ...(highlight.dash === undefined ? {} : { dash: [...highlight.dash] }),
    })),
    annotations: (input.annotations ?? []).map(cloneAnnotation),
    interaction: normalizeInteraction(input.interaction),
    accessibility: {
      ...(input.accessibility?.label === undefined ? {} : { label: input.accessibility.label }),
      ...(input.accessibility?.description === undefined
        ? {}
        : { description: input.accessibility.description }),
    },
    ...(title === undefined ? {} : { title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.locale === undefined ? {} : { locale: input.locale }),
  };

  return normalized;
}
