import { specVersion } from '../version.js';
import { assertValidSpec } from './validate.js';
import type {
  AxisSpec,
  ChartSpec,
  DataInput,
  EncodingInput,
  LayerSpec,
  MarkInput,
  NormalizedChartSpec,
  NormalizedEncodingSpec,
  NormalizedLayerSpec,
  NormalizedMarkSpec,
  PaddingInput,
  PaddingSpec,
  TitleSpec,
} from './types.js';

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

function normalizeAxis(
  input: AxisSpec | false | undefined,
  defaultGrid: boolean,
): AxisSpec | false {
  if (input === false) return false;
  return {
    visible: input?.visible ?? true,
    grid: input?.grid ?? defaultGrid,
    ...(input?.title === undefined ? {} : { title: input.title }),
    ...(input?.tickCount === undefined ? {} : { tickCount: input.tickCount }),
    ...(input?.format === undefined ? {} : { format: input.format }),
    ...(input?.labelAngle === undefined ? {} : { labelAngle: input.labelAngle }),
  };
}

function normalizeEncoding(
  input: EncodingInput,
  fallbackAxis: AxisSpec | false,
): NormalizedEncodingSpec {
  const encoding = typeof input === 'string' ? { field: input } : input;
  return {
    field: encoding.field,
    ...(encoding.type === undefined ? {} : { type: encoding.type }),
    title: encoding.title ?? encoding.field,
    scale: { ...encoding.scale },
    axis:
      encoding.axis === undefined
        ? fallbackAxis
        : normalizeAxis(
            encoding.axis,
            fallbackAxis === false ? false : fallbackAxis.grid !== false,
          ),
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
  chartAxes: { readonly x: AxisSpec | false; readonly y: AxisSpec | false },
): NormalizedLayerSpec {
  const data = layer.data ?? parentData;
  if (data === undefined) {
    throw new Error('Spec validation should guarantee layer data.');
  }
  return {
    id: layer.id ?? `layer-${index}`,
    data,
    mark: normalizeMark(layer.mark),
    x: normalizeEncoding(layer.x, chartAxes.x),
    y: normalizeEncoding(layer.y, chartAxes.y),
    visible: layer.visible ?? true,
    zIndex: layer.zIndex ?? index,
  };
}

export function normalizeSpec(input: ChartSpec): NormalizedChartSpec {
  assertValidSpec(input);

  const axes = {
    x: normalizeAxis(input.axes?.x, false),
    y: normalizeAxis(input.axes?.y, true),
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
  const layers = sourceLayers.map((layer, index) => normalizeLayer(layer, index, input.data, axes));

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
    interaction: {
      hover: input.interaction?.hover ?? true,
      click: input.interaction?.click ?? true,
    },
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
