import { specVersion } from '../version.js';
import { builtInTheme, defaultThemeId } from '../theme/defaults.js';
import type { ThemeTokens } from '../theme/types.js';
import { assertValidSpec } from './validate.js';
import { materializeSpecDataflow } from '../data/dataflow.js';
import { axisChannel, builtInAxisChannel, declaredAxisIds, defaultAxisPosition } from './axes.js';
import type {
  AxisChannel,
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
  ChannelEncodingInput,
  DataInput,
  DataValue,
  ColumnarData,
  DecorationTargetSpec,
  EncodingInput,
  EncodingMap,
  EncodingChannel,
  FieldType,
  LayerSpec,
  LegendItemSpec,
  LegendSpec,
  MarkInput,
  MarkLabelPositionSpec,
  NormalizedAxisFontSpec,
  NormalizedAxisFormatSpec,
  NormalizedAxisLabelSpec,
  NormalizedAxisSpec,
  NormalizedAxisStrokeSpec,
  NormalizedAxisTickSpec,
  NormalizedAxisTitleSpec,
  NormalizedChartSpec,
  NormalizedEncodingSpec,
  NormalizedChannelEncodingSpec,
  NormalizedEncodingMap,
  NormalizedInteractionSpec,
  NormalizedLegendSpec,
  NormalizedLayerSpec,
  NormalizedMarkLabelSpec,
  NormalizedMarkSpec,
  NormalizedTooltipFieldSpec,
  PaddingInput,
  PaddingSpec,
  TitleSpec,
  TooltipFieldInput,
  TransformSpec,
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
  const themedPadding = theme?.spacing.plotPadding;
  return {
    top: input?.top ?? themedPadding?.top ?? themedMargin ?? 24,
    right: input?.right ?? themedPadding?.right ?? themedMargin ?? 24,
    bottom: input?.bottom ?? themedPadding?.bottom ?? themedMargin ?? 44,
    left: input?.left ?? themedPadding?.left ?? themedMargin ?? 56,
  };
}

function normalizeTitle(
  input: ChartSpec['title'],
  theme: ThemeTokens | undefined,
): TitleSpec | undefined {
  if (input === undefined) return undefined;
  const align = theme?.typography.titleAlign ?? 'left';
  if (typeof input === 'string') return { text: input, align };
  return { ...input, align: input.align ?? align };
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
  const domainNavigationInput = input?.domainNavigation;
  const domainNavigation =
    domainNavigationInput === undefined || domainNavigationInput === false
      ? false
      : {
          axes:
            typeof domainNavigationInput === 'object'
              ? [...(domainNavigationInput.axes ?? ['x', 'y'])]
              : (['x', 'y'] as const),
          maxZoom:
            typeof domainNavigationInput === 'object' ? (domainNavigationInput.maxZoom ?? 64) : 64,
          wheel:
            typeof domainNavigationInput === 'object'
              ? (domainNavigationInput.wheel ?? 'modifier')
              : ('modifier' as const),
          drag:
            typeof domainNavigationInput === 'object' ? (domainNavigationInput.drag ?? true) : true,
          keyboard:
            typeof domainNavigationInput === 'object'
              ? (domainNavigationInput.keyboard ?? true)
              : true,
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
            direction: playbackInput.direction ?? 'forward',
            range:
              playbackInput.range === undefined
                ? (false as const)
                : {
                    ...(playbackInput.range.start === undefined
                      ? {}
                      : { start: playbackInput.range.start }),
                    ...(playbackInput.range.end === undefined
                      ? {}
                      : { end: playbackInput.range.end }),
                  },
            namedFrames: (playbackInput.namedFrames ?? []).map((frame) => ({ ...frame })),
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
          kind:
            typeof selectionInput === 'object'
              ? (selectionInput.kind ?? 'point')
              : ('point' as const),
          combine:
            typeof selectionInput === 'object'
              ? (selectionInput.combine ?? 'union')
              : ('union' as const),
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
          ...(typeof selectionInput === 'object' && selectionInput.axis !== undefined
            ? { axis: selectionInput.axis }
            : {}),
          xAxis:
            typeof selectionInput === 'object' ? (selectionInput.xAxis ?? 'x') : ('x' as const),
          yAxis:
            typeof selectionInput === 'object' ? (selectionInput.yAxis ?? 'y') : ('y' as const),
          maxSelections:
            typeof selectionInput === 'object' ? (selectionInput.maxSelections ?? 64) : 64,
          maxLassoPoints:
            typeof selectionInput === 'object' ? (selectionInput.maxLassoPoints ?? 512) : 512,
          minPixelSpan: typeof selectionInput === 'object' ? (selectionInput.minPixelSpan ?? 3) : 3,
          keyboard: typeof selectionInput === 'object' ? (selectionInput.keyboard ?? true) : true,
          keyboardStep: typeof selectionInput === 'object' ? (selectionInput.keyboardStep ?? 8) : 8,
          filter: typeof selectionInput === 'object' ? (selectionInput.filter ?? false) : false,
          linked: typeof selectionInput === 'object' ? (selectionInput.linked ?? false) : false,
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
    domainNavigation,
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

function cloneMarkLabelPosition(position: MarkLabelPositionSpec): MarkLabelPositionSpec {
  return {
    ...position,
    target: cloneDecorationTarget(position.target) as MarkLabelPositionSpec['target'],
  };
}

function normalizeMarkLabels(input: ChartSpec['markLabels']): false | NormalizedMarkLabelSpec {
  if (input === undefined || input === false) return false;
  const labels = input === true ? {} : input;
  const connector =
    labels.connector === undefined || labels.connector === false
      ? false
      : labels.connector === true
        ? {}
        : {
            ...labels.connector,
            ...(labels.connector.dash === undefined ? {} : { dash: [...labels.connector.dash] }),
          };
  const authoringInput = labels.authoring;
  const authoring =
    authoringInput === undefined || authoringInput === false
      ? false
      : (() => {
          const resolved = typeof authoringInput === 'object' ? authoringInput : {};
          const snapInput = resolved.snap;
          const snapResolved = typeof snapInput === 'object' ? snapInput : {};
          return {
            pointer: resolved.pointer ?? true,
            keyboard: resolved.keyboard ?? true,
            step: resolved.step ?? 1,
            historyLimit: resolved.historyLimit ?? 50,
            snap:
              snapInput === false
                ? (false as const)
                : {
                    grid: snapResolved.grid ?? false,
                    marks: snapResolved.marks ?? true,
                    plot: snapResolved.plot ?? true,
                    distance: snapResolved.distance ?? 6,
                  },
          };
        })();
  return {
    visible: labels.visible ?? true,
    ...(labels.field === undefined ? {} : { field: labels.field }),
    ...(labels.key === undefined ? {} : { key: labels.key }),
    layerIds: [...(labels.layerIds ?? [])],
    placement: labels.placement ?? 'auto',
    offset: labels.offset ?? 6,
    collision: labels.collision ?? 'avoid',
    connector,
    maxLabels: labels.maxLabels ?? 128,
    positions: (labels.positions ?? []).map(cloneMarkLabelPosition),
    style: { ...labels.style },
    authoring,
  };
}

function axisGridDefault(
  channel: AxisChannel,
  position: NormalizedAxisSpec['position'],
  theme: ThemeTokens | undefined,
): boolean {
  const themed =
    channel === 'x' && position === 'bottom'
      ? theme?.axis.gridX
      : channel === 'x'
        ? theme?.axis.gridX2
        : position === 'left'
          ? theme?.axis.gridY
          : theme?.axis.gridY2;
  return themed ?? (channel === 'y' && position === 'left');
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
  channel: AxisChannel,
  theme: ThemeTokens | undefined,
): NormalizedAxisSpec | false {
  if (input === false) return false;
  const position = input?.position ?? defaultAxisPosition(id, channel);
  const titlePadding = channel === 'x' ? 32 : 46;
  return {
    channel,
    visible: input?.visible ?? true,
    position,
    offset: input?.offset ?? 0,
    line: normalizeAxisStroke(input?.line, theme?.axis.lineVisible ?? true),
    grid: normalizeAxisStroke(
      input?.grid,
      axisGridDefault(channel, position, theme),
      theme?.axis.gridOpacity ?? 0.82,
    ),
    ticks: normalizeAxisTicks(input?.ticks, input?.tickCount, theme?.axis.ticksVisible ?? true),
    labels: normalizeAxisLabels(input?.labels, input?.labelAngle),
    title: normalizeAxisTitle(input?.title, titlePadding, theme?.axis.titleGap),
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
    axis: normalizeAxis(axis, axisId, channel, theme),
  };
}

function normalizeChannelEncoding(
  input: ChannelEncodingInput,
  channel: EncodingChannel,
): NormalizedChannelEncodingSpec {
  const encoding = typeof input === 'string' ? { field: input } : input;
  const conditions =
    encoding.condition === undefined
      ? []
      : Array.isArray(encoding.condition)
        ? encoding.condition
        : [encoding.condition];
  return {
    ...(encoding.field === undefined ? {} : { field: encoding.field }),
    ...(encoding.value === undefined ? {} : { value: encoding.value }),
    ...(encoding.type === undefined ? {} : { type: encoding.type }),
    ...(encoding.title === undefined ? {} : { title: encoding.title }),
    scale: { ...encoding.scale },
    ...(encoding.axisId === undefined ? {} : { axisId: encoding.axisId }),
    condition: [...conditions],
  };
}

function normalizeEncodingMap(
  legacyX: EncodingInput | undefined,
  legacyY: EncodingInput | undefined,
  input: EncodingMap | undefined,
  chartAxes: NonNullable<ChartSpec['axes']>,
  theme: ThemeTokens | undefined,
): NormalizedEncodingMap {
  const x = input?.x ?? legacyX;
  const y = input?.y ?? legacyY;
  if (x === undefined || y === undefined) {
    throw new Error('Spec validation should guarantee x and y encodings.');
  }
  const normalized: Record<string, NormalizedChannelEncodingSpec> = {};
  if (input !== undefined) {
    for (const [channel, encoding] of Object.entries(input)) {
      if (encoding === undefined || channel === 'x' || channel === 'y') continue;
      normalized[channel] = normalizeChannelEncoding(
        encoding as ChannelEncodingInput,
        channel as EncodingChannel,
      );
    }
  }
  return {
    x: normalizeEncoding(x as EncodingInput, 'x', chartAxes, theme),
    y: normalizeEncoding(y as EncodingInput, 'y', chartAxes, theme),
    ...normalized,
  } as unknown as NormalizedEncodingMap;
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

function encodingField(input: EncodingInput | undefined): string | undefined {
  return typeof input === 'string' ? input : input?.field;
}

function authoredFieldType(input: EncodingInput | undefined): FieldType | undefined {
  return typeof input === 'string' ? undefined : input?.type;
}

function resolvedInputFieldType(
  input: EncodingInput | undefined,
  data: DataInput,
): FieldType | undefined {
  const authored = authoredFieldType(input);
  if (authored !== undefined) return authored;
  const field = encodingField(input);
  if (field === undefined) return undefined;
  const typeOfValue = (value: DataValue): FieldType | null => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return 'temporal';
    if (typeof value === 'number') return 'quantitative';
    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) &&
      Number.isFinite(Date.parse(value))
    ) {
      return 'temporal';
    }
    return 'nominal';
  };
  if (Array.isArray(data)) {
    for (const row of data) {
      const type = typeOfValue(row[field]);
      if (type !== null) return type;
    }
    return 'nominal';
  }
  const column = (data as ColumnarData).columns[field];
  if (column === undefined) return undefined;
  for (let index = 0; index < column.length; index += 1) {
    const type = typeOfValue(column[index]);
    if (type !== null) return type;
  }
  return 'nominal';
}

/**
 * Horizontal bars use a quantitative x axis and a categorical y axis. Authors
 * commonly start from the vertical `x: category, y: value` form and then set
 * only `orientation: 'horizontal'`. Treat that unambiguous combination as a
 * request to transpose the positional channels, including interval endpoints,
 * so a harmless orientation change cannot turn values into overlapping bands.
 */
function orientHorizontalBarEncoding(
  data: DataInput,
  legacyX: EncodingInput | undefined,
  legacyY: EncodingInput | undefined,
  input: EncodingMap | undefined,
): {
  readonly x: EncodingInput | undefined;
  readonly y: EncodingInput | undefined;
  readonly encoding: EncodingMap | undefined;
} {
  const x = input?.x ?? legacyX;
  const y = input?.y ?? legacyY;
  const xType = resolvedInputFieldType(x as EncodingInput | undefined, data);
  const yType = resolvedInputFieldType(y as EncodingInput | undefined, data);
  const transpose =
    x !== undefined &&
    y !== undefined &&
    (xType === 'nominal' || xType === 'ordinal' || xType === 'temporal') &&
    yType === 'quantitative';
  if (!transpose) return { x: legacyX, y: legacyY, encoding: input };
  if (input === undefined) {
    return { x: y as EncodingInput, y: x as EncodingInput, encoding: undefined };
  }
  const { x2, y2, ...channels } = input;
  return {
    x: legacyX,
    y: legacyY,
    encoding: {
      ...channels,
      x: y,
      y: x,
      ...(y2 === undefined ? {} : { x2: y2 }),
      ...(x2 === undefined ? {} : { y2: x2 }),
    },
  };
}

function resolveSpecializedEncoding(
  markType: string,
  input: EncodingMap | undefined,
): EncodingMap | undefined {
  if (input === undefined) return undefined;
  const specialized = { ...input };
  if (['map', 'geo-flow', 'geo-line', 'geo-heatmap', 'tiled-map', 'tilemap'].includes(markType)) {
    if (specialized.x === undefined && specialized.longitude !== undefined) {
      specialized.x = specialized.longitude;
    }
    if (specialized.y === undefined && specialized.latitude !== undefined) {
      specialized.y = specialized.latitude;
    }
  }
  if (markType === 'polar') {
    const angle = specialized.theta ?? specialized.angle;
    if (specialized.x === undefined && angle !== undefined) specialized.x = angle;
    if (specialized.y === undefined && specialized.radius !== undefined) {
      specialized.y = specialized.radius;
    }
  }
  if (markType === 'pie' || markType === 'variable-pie') {
    const angle = specialized.theta ?? specialized.angle;
    if (specialized.y === undefined && angle !== undefined) specialized.y = angle;
  }
  if (['candlestick', 'financial', 'renko', 'point-figure', 'indicator'].includes(markType)) {
    if (specialized.y === undefined && specialized.close !== undefined) {
      specialized.y = specialized.close;
    }
  }
  return specialized;
}

function normalizeLayer(
  layer: LayerSpec,
  index: number,
  parentData: DataInput | undefined,
  chartAxes: NonNullable<ChartSpec['axes']>,
  theme: ThemeTokens | undefined,
  parentTransforms: readonly TransformSpec[],
): NormalizedLayerSpec {
  const data = layer.data ?? parentData;
  if (data === undefined) {
    throw new Error('Spec validation should guarantee layer data.');
  }
  const markType = typeof layer.mark === 'string' ? layer.mark : layer.mark.type;
  const specialized = resolveSpecializedEncoding(markType, layer.encoding);
  const normalizedMark = normalizeMark(layer.mark);
  const oriented =
    markType === 'bar' && normalizedMark.orientation === 'horizontal'
      ? orientHorizontalBarEncoding(data, layer.x, layer.y, specialized)
      : { x: layer.x, y: layer.y, encoding: specialized };
  const encoding = normalizeEncodingMap(
    oriented.x,
    oriented.y,
    oriented.encoding,
    chartAxes,
    theme,
  );
  const semanticFields = Object.fromEntries(
    ['longitude', 'latitude', 'open', 'high', 'low', 'close', 'volume', 'angle', 'theta'].flatMap(
      (channel) => {
        const field = encoding[channel as keyof typeof encoding]?.field;
        return field === undefined ? [] : [[channel, field]];
      },
    ),
  );
  return {
    id: layer.id ?? `layer-${index}`,
    name: layer.name ?? layer.id ?? `Series ${index + 1}`,
    data,
    transform: [...parentTransforms, ...(layer.transform ?? [])],
    mark: {
      ...normalizedMark,
      fields: { ...normalizedMark.fields, ...semanticFields },
    },
    encoding,
    x: encoding.x,
    y: encoding.y,
    clip:
      layer.clip === undefined || layer.clip === true
        ? true
        : layer.clip === false
          ? false
          : layer.clip.type === 'plot'
            ? { ...layer.clip }
            : {
                type: 'domain',
                ...(layer.clip.x === undefined ? {} : { x: { ...layer.clip.x } }),
                ...(layer.clip.y === undefined ? {} : { y: { ...layer.clip.y } }),
              },
    visible: layer.visible ?? true,
    zIndex: layer.zIndex ?? index,
  };
}

export function normalizeSpec(input: ChartSpec, resolvedTheme?: ThemeTokens): NormalizedChartSpec {
  input = materializeSpecDataflow(input);
  assertValidSpec(input);

  // Keep the one-argument public normalizer registry-driven so every built-in
  // theme receives its structural defaults without constructing a runtime.
  const theme =
    resolvedTheme ?? (typeof input.theme === 'string' ? builtInTheme(input.theme) : undefined);

  const chartAxes = input.axes ?? {};
  const axes = Object.freeze(
    Object.fromEntries(
      declaredAxisIds(chartAxes).map((id) => {
        const channel = axisChannel(id, chartAxes) ?? builtInAxisChannel(id);
        if (channel === undefined) {
          throw new Error(`Spec validation should guarantee a channel for named axis "${id}".`);
        }
        return [id, normalizeAxis(chartAxes[id], id, channel, theme)] as const;
      }),
    ),
  ) as Readonly<Record<AxisId, NormalizedAxisSpec | false>>;

  const shorthandEncoding = resolveSpecializedEncoding(
    typeof input.mark === 'string' ? input.mark : (input.mark?.type ?? ''),
    input.encoding,
  );
  const shorthandLayer: LayerSpec | undefined =
    input.mark === undefined ||
    ((shorthandEncoding?.x === undefined || shorthandEncoding.y === undefined) &&
      (input.x === undefined || input.y === undefined))
      ? undefined
      : {
          ...(input.data === undefined ? {} : { data: input.data }),
          mark: input.mark,
          ...(shorthandEncoding === undefined
            ? { x: input.x as EncodingInput, y: input.y as EncodingInput }
            : { encoding: shorthandEncoding }),
        };

  const sourceLayers = input.layers ?? (shorthandLayer === undefined ? [] : [shorthandLayer]);
  const layers = sourceLayers.map((layer, index) =>
    normalizeLayer(layer, index, input.data, chartAxes, theme, input.transform ?? []),
  );

  const title = normalizeTitle(input.title, theme);

  const normalized: NormalizedChartSpec = {
    specVersion,
    layers,
    width: input.width ?? 'container',
    height: input.height ?? 400,
    padding: normalizePadding(input.padding, theme),
    renderer: input.renderer ?? 'auto',
    performance: input.performance ?? 'auto',
    theme: input.theme ?? defaultThemeId,
    axes,
    legend: normalizeLegend(input.legend),
    highlights: (input.highlights ?? []).map((highlight) => ({
      ...highlight,
      target: cloneDecorationTarget(highlight.target),
      ...(highlight.dash === undefined ? {} : { dash: [...highlight.dash] }),
    })),
    annotations: (input.annotations ?? []).map(cloneAnnotation),
    markLabels: normalizeMarkLabels(input.markLabels),
    interaction: normalizeInteraction(input.interaction),
    accessibility: {
      ...(input.accessibility?.label === undefined ? {} : { label: input.accessibility.label }),
      ...(input.accessibility?.description === undefined
        ? {}
        : { description: input.accessibility.description }),
      table:
        input.accessibility?.table === true
          ? 'hidden'
          : input.accessibility?.table === false || input.accessibility?.table === undefined
            ? false
            : input.accessibility.table,
      maxRows: input.accessibility?.maxRows ?? 500,
      navigation: input.accessibility?.navigation ?? false,
      explorer:
        input.accessibility?.explorer === false ||
        (input.accessibility?.explorer === undefined &&
          input.accessibility?.navigation !== true &&
          input.accessibility?.linkedFocus === undefined &&
          input.accessibility?.table !== 'visible')
          ? false
          : {
              windowRows:
                typeof input.accessibility?.explorer === 'object'
                  ? (input.accessibility.explorer.windowRows ?? 24)
                  : 24,
              overscanRows:
                typeof input.accessibility?.explorer === 'object'
                  ? (input.accessibility.explorer.overscanRows ?? 6)
                  : 6,
              rowHeight:
                typeof input.accessibility?.explorer === 'object'
                  ? (input.accessibility.explorer.rowHeight ?? 32)
                  : 32,
            },
      linkedFocus:
        input.accessibility?.linkedFocus === undefined
          ? false
          : { ...input.accessibility.linkedFocus },
      ...(input.accessibility?.summary === undefined
        ? {}
        : { summary: input.accessibility.summary }),
      live:
        input.accessibility?.live === false ||
        (typeof input.accessibility?.live === 'object' &&
          input.accessibility.live.enabled === false)
          ? false
          : {
              throttleMs:
                typeof input.accessibility?.live === 'object'
                  ? (input.accessibility.live.throttleMs ?? 150)
                  : 150,
            },
    },
    ...(title === undefined ? {} : { title }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.locale === undefined ? {} : { locale: input.locale }),
  };

  return normalized;
}
