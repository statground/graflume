import { specVersion } from '../version.js';
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
  ChartSpec,
  DataInput,
  EncodingInput,
  LayerSpec,
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
  previousFrame: 'Previous frame',
  play: 'Play',
  pause: 'Pause',
  nextFrame: 'Next frame',
  seek: 'Playback position',
  speed: 'Playback speed',
  loop: 'Loop playback',
} as const;

function normalizePadding(input: PaddingInput | undefined): PaddingSpec {
  if (typeof input === 'number') {
    return { top: input, right: input, bottom: input, left: input };
  }
  return {
    top: input?.top ?? 24,
    right: input?.right ?? 24,
    bottom: input?.bottom ?? 44,
    left: input?.left ?? 56,
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
            ...(playbackInput.layerId === undefined ? {} : { layerId: playbackInput.layerId }),
            mode: playbackInput.mode ?? 'frame',
            interval: playbackInput.interval ?? 1_000,
            rate: playbackInput.rate ?? 1,
            loop: playbackInput.loop ?? false,
            windowSize: playbackInput.windowSize ?? 1,
            autoplay: playbackInput.autoplay ?? false,
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
          playback: typeof controlsInput === 'object' ? (controlsInput.playback ?? false) : true,
          labels: {
            ...defaultControlLabels,
            ...(typeof controlsInput === 'object' ? controlsInput.labels : undefined),
          },
        };
  return {
    hover,
    click: input?.click ?? true,
    tooltip,
    navigation,
    playback,
    controls,
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
): NormalizedAxisTickSpec {
  const ticks = typeof input === 'object' ? input : undefined;
  const count = ticks?.count ?? legacyCount;
  return {
    ...normalizeAxisStroke(input, true),
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
): NormalizedAxisSpec | false {
  if (input === false) return false;
  const defaults = axisDefaults[id];
  return {
    visible: input?.visible ?? true,
    position: input?.position ?? defaults.position,
    offset: input?.offset ?? 0,
    line: normalizeAxisStroke(input?.line, true),
    grid: normalizeAxisStroke(input?.grid, defaults.grid, 0.82),
    ticks: normalizeAxisTicks(input?.ticks, input?.tickCount),
    labels: normalizeAxisLabels(input?.labels, input?.labelAngle),
    title: normalizeAxisTitle(input?.title, defaults.titlePadding),
    format: normalizeAxisFormat(input?.format),
  };
}

function normalizeEncoding(
  input: EncodingInput,
  channel: 'x' | 'y',
  chartAxes: NonNullable<ChartSpec['axes']>,
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
    axis: normalizeAxis(axis, axisId),
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
): NormalizedLayerSpec {
  const data = layer.data ?? parentData;
  if (data === undefined) {
    throw new Error('Spec validation should guarantee layer data.');
  }
  return {
    id: layer.id ?? `layer-${index}`,
    data,
    mark: normalizeMark(layer.mark),
    x: normalizeEncoding(layer.x, 'x', chartAxes),
    y: normalizeEncoding(layer.y, 'y', chartAxes),
    visible: layer.visible ?? true,
    zIndex: layer.zIndex ?? index,
  };
}

export function normalizeSpec(input: ChartSpec): NormalizedChartSpec {
  assertValidSpec(input);

  const chartAxes = input.axes ?? {};
  const axes = {
    x: normalizeAxis(chartAxes.x, 'x'),
    x2: normalizeAxis(chartAxes.x2, 'x2'),
    y: normalizeAxis(chartAxes.y, 'y'),
    y2: normalizeAxis(chartAxes.y2, 'y2'),
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
    normalizeLayer(layer, index, input.data, chartAxes),
  );

  const title = normalizeTitle(input.title);

  const normalized: NormalizedChartSpec = {
    specVersion,
    layers,
    width: input.width ?? 'container',
    height: input.height ?? 400,
    padding: normalizePadding(input.padding),
    renderer: input.renderer ?? 'auto',
    performance: input.performance ?? 'auto',
    theme: input.theme ?? 'graflume-light',
    axes,
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
