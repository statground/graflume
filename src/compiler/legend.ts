import { DataTable } from '../data/table.js';
import { nodePaint } from '../scene/bounds.js';
import { group, nodeBase } from '../scene/factory.js';
import type { Rect, RectNode, Scene, SceneNode, TextNode } from '../scene/types.js';
import type {
  JsonPrimitive,
  NormalizedChartSpec,
  NormalizedLegendItemSpec,
  NormalizedLegendSpec,
} from '../spec/types.js';
import { categoricalColor, continuousColor } from '../theme/color.js';
import type { ThemeTokens } from '../theme/types.js';
import type { LayoutInsets } from './layout.js';

export interface LegendEntryLayout extends NormalizedLegendItemSpec {
  readonly color: string;
  readonly bounds: Rect;
  readonly toggleable: boolean;
  readonly visible: boolean;
}

export interface LegendLayout {
  readonly mode: 'layers' | 'categories' | 'continuous';
  readonly entries: readonly LegendEntryLayout[];
  readonly bounds: Rect;
}

export interface LegendModel {
  readonly spec: NormalizedLegendSpec;
  readonly mode: LegendLayout['mode'];
  readonly items: readonly NormalizedLegendItemSpec[];
  readonly field?: string;
  readonly width: number;
  readonly height: number;
  readonly direction: 'ltr' | 'rtl';
  readonly categoryToggleableLayerIds: ReadonlySet<string>;
}

const legendByScene = new WeakMap<Scene, LegendLayout>();
const categoricalMarks = new Set([
  'pie',
  'variable-pie',
  'treemap',
  'sunburst',
  'packed-bubble',
  'funnel',
  'pyramid',
  'venn',
  'word-cloud',
]);
const continuousMarks = new Set([
  'heatmap',
  'geo',
  'geo-heatmap',
  'map',
  'contour',
  'volume-profile',
]);
const lineMarks = new Set([
  'annotation',
  'area',
  'diff',
  'line',
  'lines',
  'smooth',
  'stepped-area',
  'trendline',
]);
const pointMarks = new Set([
  'bubble',
  'effect-scatter',
  'item',
  'lollipop',
  'packed-bubble',
  'point',
  'scatter-3d',
  'scatter-matrix',
  'ternary',
]);

/** Category filtering is safe only when a row owns independent geometry. */
export const CATEGORY_LEGEND_TOGGLE_MARKS: ReadonlySet<string> = new Set([
  'bar',
  'bubble',
  'candlestick',
  'calendar',
  'cylinder',
  'effect-scatter',
  'financial',
  'flags',
  'funnel',
  'gantt',
  'heatmap',
  'interval',
  'item',
  'lollipop',
  'packed-bubble',
  'pie',
  'point',
  'pictorial-bar',
  'pyramid',
  'range',
  'scatter-3d',
  'scatter-matrix',
  'sunburst',
  'ternary',
  'timeline',
  'tilemap',
  'tiled-map',
  'treemap',
  'variable-pie',
  'variwide',
  'venn',
  'waterfall',
  'wind-barb',
  'word-cloud',
]);

function markSymbol(mark: string | undefined): 'line' | 'point' | 'rect' {
  if (mark !== undefined && lineMarks.has(mark)) return 'line';
  if (mark !== undefined && pointMarks.has(mark)) return 'point';
  return 'rect';
}

function valueKey(value: JsonPrimitive): string {
  return `${value === null ? 'null' : typeof value}:${String(value)}`;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

/** Keep inferred category state stable across row reordering and slug collisions. */
function stableCategoryId(value: JsonPrimitive): string {
  const canonical = JSON.stringify([value === null ? 'null' : typeof value, value]);
  let encoded = '';
  for (let index = 0; index < canonical.length; index += 1) {
    encoded += canonical.charCodeAt(index).toString(16).padStart(4, '0');
  }
  return encoded;
}

function autoMode(spec: NormalizedChartSpec): LegendLayout['mode'] {
  if (spec.legend === false) return 'layers';
  if (spec.legend.mode !== 'auto') return spec.legend.mode;
  if (spec.layers.length > 1) return 'layers';
  const mark = spec.layers[0]?.mark.type;
  if (mark !== undefined && continuousMarks.has(mark)) return 'continuous';
  if (mark !== undefined && categoricalMarks.has(mark)) return 'categories';
  return 'layers';
}

function categoryItems(
  spec: NormalizedChartSpec,
  legend: NormalizedLegendSpec,
): readonly NormalizedLegendItemSpec[] {
  const layer = spec.layers.find((candidate) => candidate.id === legend.layerId) ?? spec.layers[0];
  if (layer === undefined) return [];
  const field = legend.field ?? layer.x.field;
  const table = DataTable.from(layer.data);
  const seen = new Set<string>();
  const output: NormalizedLegendItemSpec[] = [];
  for (let index = 0; index < table.length && output.length < legend.maxItems; index += 1) {
    const raw = table.value(index, field);
    if (
      raw === undefined ||
      raw instanceof Date ||
      (typeof raw === 'number' && !Number.isFinite(raw))
    )
      continue;
    const value = raw as JsonPrimitive;
    const key = valueKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({
      id: `category-${stableCategoryId(value)}`,
      label: raw === null ? '—' : String(raw),
      layerId: layer.id,
      value,
      symbol: markSymbol(layer.mark.type),
    });
  }
  return output;
}

function layerItems(spec: NormalizedChartSpec): readonly NormalizedLegendItemSpec[] {
  return spec.layers.map((layer, index) => ({
    id: `layer-${safeId(layer.id)}-${index}`,
    label: layer.name,
    layerId: layer.id,
    symbol: markSymbol(layer.mark.type),
  }));
}

export function legendItemToggleable(model: LegendModel, item: NormalizedLegendItemSpec): boolean {
  return (
    model.spec.interactive &&
    model.mode !== 'continuous' &&
    item.layerId !== undefined &&
    (model.mode !== 'categories' || model.categoryToggleableLayerIds.has(item.layerId))
  );
}

function continuousItems(
  spec: NormalizedChartSpec,
  legend: NormalizedLegendSpec,
): readonly NormalizedLegendItemSpec[] {
  const layer = spec.layers.find((candidate) => candidate.id === legend.layerId) ?? spec.layers[0];
  if (layer === undefined) return [];
  const field = legend.field ?? layer.mark.fields.value ?? layer.y.field;
  const table = DataTable.from(layer.data);
  const extent = table.extent(field, false);
  if (extent === null)
    return [{ id: 'continuous-scale', label: field, layerId: layer.id, symbol: 'rect' }];
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(spec.locale, { maximumFractionDigits: 6 });
  } catch {
    formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 });
  }
  return [
    {
      id: 'continuous-min',
      label: formatter.format(extent[0]),
      layerId: layer.id,
      value: extent[0],
      symbol: 'rect',
    },
    {
      id: 'continuous-max',
      label: formatter.format(extent[1]),
      layerId: layer.id,
      value: extent[1],
      symbol: 'rect',
    },
  ];
}

export function resolveLegendModel(
  spec: NormalizedChartSpec,
  theme: ThemeTokens,
  availableWidth = 640,
  availableHeight = 400,
): LegendModel | null {
  const legend = spec.legend;
  if (legend === false || !legend.visible) return null;
  const mode = autoMode(spec);
  const selectedLayer =
    spec.layers.find((candidate) => candidate.id === legend.layerId) ?? spec.layers[0];
  const field =
    mode === 'categories'
      ? (legend.field ?? selectedLayer?.x.field)
      : mode === 'continuous'
        ? (legend.field ?? selectedLayer?.mark.fields.value ?? selectedLayer?.y.field)
        : undefined;
  const inferred =
    legend.items.length > 0
      ? legend.items
      : mode === 'layers'
        ? layerItems(spec)
        : mode === 'categories'
          ? categoryItems(spec, legend)
          : continuousItems(spec, legend);
  let items = inferred.slice(0, legend.maxItems).map((item) => {
    if (item.symbol !== 'auto') return item;
    const layer = spec.layers.find((candidate) => candidate.id === item.layerId);
    return { ...item, symbol: markSymbol(layer?.mark.type) };
  });
  if (items.length === 0) return null;
  const titleHeight =
    legend.title === undefined
      ? 0
      : (theme.typography.legendTitleSize ?? theme.typography.fontSize) + 8;
  const maxWidth = Math.max(1, availableWidth - 8);
  const maxHeight = Math.max(1, availableHeight - 8);
  const swatchSize = theme.legend?.swatchSize ?? 12;
  const horizontalItemPadding = swatchSize + 22;
  const direction =
    spec.locale !== undefined && /^(ar|fa|he|ur)(?:-|$)/i.test(spec.locale) ? 'rtl' : 'ltr';
  const categoryToggleableLayerIds = new Set(
    spec.layers
      .filter((layer) => CATEGORY_LEGEND_TOGGLE_MARKS.has(layer.mark.type))
      .map((layer) => layer.id),
  );
  if (mode === 'continuous' && items.length >= 2) {
    return {
      spec: legend,
      mode,
      items,
      ...(field === undefined ? {} : { field }),
      width: Math.min(
        maxWidth,
        Math.max(120, (legend.title?.length ?? 0) * 7 + (legend.title === undefined ? 0 : 24), 168),
      ),
      height: Math.min(maxHeight, titleHeight + 42),
      direction,
      categoryToggleableLayerIds,
    };
  }
  if (legend.orientation === 'horizontal') {
    const totalWidth = items.reduce(
      (sum, item) => sum + Math.max(64, item.label.length * 7 + horizontalItemPadding),
      0,
    );
    const modelWidth = Math.min(maxWidth, Math.max(96, totalWidth + 20));
    const usableWidth = Math.max(48, modelWidth - 20);
    let rowWidth = 0;
    let rows = 1;
    for (const item of items) {
      const itemWidth = Math.max(64, item.label.length * 7 + horizontalItemPadding);
      if (rowWidth > 0 && rowWidth + itemWidth > usableWidth) {
        rows += 1;
        rowWidth = 0;
      }
      rowWidth += itemWidth;
    }
    const visibleRows = Math.max(1, Math.floor((maxHeight - titleHeight - 12) / 24));
    if (rows > visibleRows) {
      let usedRows = 1;
      rowWidth = 0;
      items = items.filter((item) => {
        const itemWidth = Math.max(64, item.label.length * 7 + horizontalItemPadding);
        if (rowWidth > 0 && rowWidth + itemWidth > usableWidth) {
          usedRows += 1;
          rowWidth = 0;
        }
        if (usedRows > visibleRows) return false;
        rowWidth += itemWidth;
        return true;
      });
      rows = visibleRows;
    }
    return {
      spec: legend,
      mode,
      items,
      ...(field === undefined ? {} : { field }),
      width: modelWidth,
      height: Math.min(maxHeight, titleHeight + rows * 24 + 12),
      direction,
      categoryToggleableLayerIds,
    };
  }
  const maxVisibleItems = Math.max(1, Math.floor((maxHeight - titleHeight - 12) / 24));
  items = items.slice(0, maxVisibleItems);
  return {
    spec: legend,
    mode,
    items,
    ...(field === undefined ? {} : { field }),
    width: Math.min(
      maxWidth,
      Math.min(
        220,
        Math.max(
          72,
          legend.title === undefined ? 0 : legend.title.length * 7 + 20,
          ...items.map((item) => item.label.length * 7 + swatchSize + 30),
        ),
      ),
    ),
    height: Math.min(maxHeight, titleHeight + items.length * 24 + 12),
    direction,
    categoryToggleableLayerIds,
  };
}

function truncateText(text: string, width: number, fontSize: number): string {
  const maximum = Math.max(1, Math.floor(width / Math.max(5, fontSize * 0.58)));
  let graphemes: readonly string[];
  try {
    graphemes = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(
      ({ segment }) => segment,
    );
  } catch {
    graphemes = Array.from(text);
  }
  if (graphemes.length <= maximum) return text;
  return `${graphemes.slice(0, Math.max(1, maximum - 1)).join('')}…`;
}

export function legendExternalInsets(model: LegendModel | null): LayoutInsets {
  const empty = { top: 0, right: 0, bottom: 0, left: 0 };
  if (model === null) return empty;
  switch (model.spec.position) {
    case 'top':
      return { ...empty, top: model.height + 8 };
    case 'right':
      return { ...empty, right: model.width + 8 };
    case 'bottom':
      return { ...empty, bottom: model.height + 8 };
    case 'left':
      return { ...empty, left: model.width + 8 };
    default:
      return empty;
  }
}

function descendants(node: SceneNode): readonly SceneNode[] {
  if (node.type !== 'group') return [node];
  return node.children.flatMap(descendants);
}

function itemPaint(
  item: NormalizedLegendItemSpec,
  index: number,
  mode: LegendLayout['mode'],
  layerGroups: readonly SceneNode[],
  field: string | undefined,
  theme: ThemeTokens,
  itemCount: number,
): string {
  if (item.color !== undefined) return item.color;
  if (mode === 'continuous') {
    return continuousColor(theme, index === 0 ? 0 : 1);
  }
  const group = layerGroups.find((candidate) => candidate.id === `${item.layerId}:group`);
  if (group !== undefined) {
    const nodes = descendants(group);
    const matching =
      mode === 'categories' && field !== undefined && item.value !== undefined
        ? nodes.find((node) =>
            [node.datum?.tooltip, node.datum?.datum].some(
              (datum) =>
                datum !== undefined &&
                Object.prototype.hasOwnProperty.call(datum, field) &&
                valueKey(datum[field] as JsonPrimitive) === valueKey(item.value as JsonPrimitive),
            ),
          )
        : nodes.find((node) => nodePaint(node) !== undefined);
    const paint = matching === undefined ? undefined : nodePaint(matching);
    if (paint !== undefined) return paint;
  }
  return categoricalColor(theme, index, Math.max(1, itemCount));
}

function legendOrigin(
  model: LegendModel,
  plot: Rect,
  width: number,
  height: number,
): { x: number; y: number } {
  const gap = 8;
  const origin = (() => {
    switch (model.spec.position) {
      case 'top':
        return { x: plot.x, y: Math.max(gap, plot.y - model.height - gap) };
      case 'right':
        return { x: plot.x + plot.width + gap, y: plot.y };
      case 'bottom':
        return { x: plot.x, y: Math.min(height - model.height - gap, plot.y + plot.height + gap) };
      case 'left':
        return { x: Math.max(gap, plot.x - model.width - gap), y: plot.y };
      case 'inside-top-left':
        return { x: plot.x + gap, y: plot.y + gap };
      case 'inside-bottom-left':
        return { x: plot.x + gap, y: plot.y + plot.height - model.height - gap };
      case 'inside-bottom-right':
        return {
          x: plot.x + plot.width - model.width - gap,
          y: plot.y + plot.height - model.height - gap,
        };
      case 'inside-top-right':
      default:
        return { x: plot.x + plot.width - model.width - gap, y: plot.y + gap };
    }
  })();
  return {
    x: Math.max(4, Math.min(Math.max(4, width - model.width - 4), origin.x)),
    y: Math.max(4, Math.min(Math.max(4, height - model.height - 4), origin.y)),
  };
}

export function compileLegend(
  model: LegendModel | null,
  layerGroups: readonly SceneNode[],
  plot: Rect,
  width: number,
  height: number,
  theme: ThemeTokens,
  hiddenItems: ReadonlySet<string> = new Set(),
): { readonly nodes: readonly SceneNode[]; readonly layout: LegendLayout | null } {
  if (model === null) return { nodes: [], layout: null };
  const origin = legendOrigin(model, plot, width, height);
  const background: RectNode = {
    type: 'rect',
    ...nodeBase('legend:surface', {
      zIndex: 500,
      opacity: theme.legend?.surfaceOpacity ?? 0.94,
    }),
    x: origin.x,
    y: origin.y,
    width: model.width,
    height: model.height,
    fill: theme.colors.surface,
    stroke: theme.colors.axis,
    lineWidth: theme.legend?.borderWidth ?? 1,
    cornerRadius: theme.legend?.cornerRadius ?? 8,
  };
  const nodes: SceneNode[] = [background];
  const inset = Math.min(10, Math.max(0, model.width / 4));
  let cursorX = origin.x + inset;
  let cursorY = origin.y + 10;
  if (model.spec.title !== undefined) {
    nodes.push({
      type: 'text',
      ...nodeBase('legend:title', { zIndex: 502 }),
      x: model.direction === 'rtl' ? origin.x + model.width - inset : cursorX,
      y: cursorY,
      text: truncateText(model.spec.title, model.width - inset * 2, theme.typography.fontSize),
      fill: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.legendTitleSize ?? theme.typography.fontSize,
      fontWeight: theme.typography.legendTitleWeight ?? 700,
      align: model.direction === 'rtl' ? 'right' : 'left',
      baseline: 'top',
      rotation: 0,
    });
    cursorY += (theme.typography.legendTitleSize ?? theme.typography.fontSize) + 8;
  }
  const entries: LegendEntryLayout[] = [];
  const field = model.field;
  if (model.mode === 'continuous' && model.items.length >= 2) {
    const scaleX = origin.x + inset;
    const scaleWidth = Math.max(1, model.width - inset * 2);
    const paletteSize = Math.max(
      1,
      theme.colors.paletteMode === 'ggplot2-hue' ? 16 : theme.colors.sequential.length,
    );
    const palette: readonly string[] =
      model.spec.items.length > 0
        ? model.items.map((item, index) => {
            return (
              item.color ?? continuousColor(theme, index / Math.max(1, model.items.length - 1))
            );
          })
        : Array.from({ length: paletteSize }, (_value, index) =>
            continuousColor(theme, index / Math.max(1, paletteSize - 1)),
          );
    palette.forEach((paint, paletteIndex) => {
      nodes.push({
        type: 'rect',
        ...nodeBase(`legend:scale:${paletteIndex}`, { zIndex: 501 }),
        x: scaleX + (scaleWidth * paletteIndex) / palette.length,
        y: cursorY,
        width: scaleWidth / palette.length + 0.5,
        height: 10,
        fill: paint,
        lineWidth: 0,
        cornerRadius: 0,
      });
    });
    const endpoints = [model.items[0]!, model.items[model.items.length - 1]!] as const;
    endpoints.forEach((item, index) => {
      const color = itemPaint(
        item,
        index,
        model.mode,
        layerGroups,
        field,
        theme,
        model.items.length,
      );
      const left = index === 0;
      nodes.push({
        type: 'text',
        ...nodeBase(`legend:item:${item.id}:label`, { zIndex: 502 }),
        x:
          model.direction === 'rtl'
            ? left
              ? scaleX + scaleWidth
              : scaleX
            : left
              ? scaleX
              : scaleX + scaleWidth,
        y: cursorY + 14,
        text: truncateText(
          item.label,
          scaleWidth / 2 - 4,
          theme.typography.legendLabelSize ?? theme.typography.fontSize,
        ),
        fill: theme.colors.mutedText,
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.legendLabelSize ?? theme.typography.fontSize,
        fontWeight: theme.typography.legendLabelWeight ?? 500,
        align: model.direction === 'rtl' ? (left ? 'right' : 'left') : left ? 'left' : 'right',
        baseline: 'top',
        rotation: 0,
      });
      entries.push({
        ...item,
        color,
        bounds: {
          x: left ? scaleX : scaleX + scaleWidth / 2,
          y: cursorY + 12,
          width: scaleWidth / 2,
          height: 20,
        },
        toggleable: false,
        visible: true,
      });
    });
    return {
      nodes: [
        group('legend:group', nodes, {
          zIndex: 500,
          clip: { ...origin, width: model.width, height: model.height },
        }),
      ],
      layout: {
        mode: model.mode,
        entries,
        bounds: { ...origin, width: model.width, height: model.height },
      },
    };
  }
  const swatchSize = theme.legend?.swatchSize ?? 12;
  const lineSwatchLength = theme.legend?.swatchSize ?? 13;
  const rtlSwatchInset = theme.legend?.swatchSize ?? 16;
  const swatchLineWidth = theme.legend?.lineWidth ?? 2.5;
  const swatchPointRadius = theme.legend?.pointRadius ?? 5;
  const swatchPointStrokeWidth = theme.legend?.pointStrokeWidth ?? 0;
  for (const [index, item] of model.items.entries()) {
    const itemWidth = Math.max(64, item.label.length * 7 + swatchSize + 22);
    if (
      model.spec.orientation === 'horizontal' &&
      cursorX > origin.x + 10 &&
      cursorX + itemWidth > origin.x + model.width - 10
    ) {
      cursorX = origin.x + 10;
      cursorY += 24;
    }
    const bounds = {
      x: cursorX - 4,
      y: cursorY - 4,
      width:
        model.spec.orientation === 'horizontal'
          ? Math.max(1, Math.min(itemWidth, origin.x + model.width - (cursorX - 4) - 6))
          : model.width - 12,
      height: 22,
    };
    const visible = !hiddenItems.has(item.id);
    const color = itemPaint(item, index, model.mode, layerGroups, field, theme, model.items.length);
    const swatchX = model.direction === 'rtl' ? bounds.x + bounds.width - rtlSwatchInset : cursorX;
    if (item.symbol === 'line') {
      nodes.push({
        type: 'line',
        ...nodeBase(`legend:item:${item.id}:swatch`, {
          zIndex: 501,
          opacity: visible ? 1 : 0.28,
        }),
        x1: swatchX,
        y1: cursorY + swatchSize / 2,
        x2: swatchX + lineSwatchLength,
        y2: cursorY + swatchSize / 2,
        stroke: color,
        lineWidth: swatchLineWidth,
        lineCap: theme.legend?.lineCap ?? 'round',
      });
    } else if (item.symbol === 'point') {
      nodes.push({
        type: 'circle',
        ...nodeBase(`legend:item:${item.id}:swatch`, {
          zIndex: 501,
          opacity: visible ? 1 : 0.28,
        }),
        cx: swatchX + swatchSize / 2,
        cy: cursorY + swatchSize / 2,
        radius: swatchPointRadius,
        fill: color,
        ...(swatchPointStrokeWidth === 0 ? {} : { stroke: color }),
        lineWidth: swatchPointStrokeWidth,
      });
    } else {
      nodes.push({
        type: 'rect',
        ...nodeBase(`legend:item:${item.id}:swatch`, {
          zIndex: 501,
          opacity: visible ? 1 : 0.28,
        }),
        x: swatchX,
        y: cursorY,
        width: swatchSize,
        height: swatchSize,
        fill: color,
        lineWidth: 0,
        cornerRadius: theme.legend?.swatchRadius ?? 3,
      });
    }
    nodes.push({
      type: 'text',
      ...nodeBase(`legend:item:${item.id}:label`, { zIndex: 502, opacity: visible ? 1 : 0.45 }),
      x: model.direction === 'rtl' ? swatchX - 7 : cursorX + swatchSize + 7,
      y: cursorY + swatchSize / 2,
      text: truncateText(
        item.label,
        Math.max(8, bounds.width - swatchSize - 14),
        theme.typography.legendLabelSize ?? theme.typography.fontSize,
      ),
      fill: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.legendLabelSize ?? theme.typography.fontSize,
      fontWeight: theme.typography.legendLabelWeight ?? 500,
      align: model.direction === 'rtl' ? 'right' : 'left',
      baseline: 'middle',
      rotation: 0,
    });
    const toggleable = legendItemToggleable(model, item);
    entries.push({ ...item, color, bounds, toggleable, visible });
    if (model.spec.orientation === 'horizontal') cursorX += itemWidth;
    else cursorY += 24;
  }
  return {
    nodes: [
      group('legend:group', nodes, {
        zIndex: 500,
        clip: { ...origin, width: model.width, height: model.height },
      }),
    ],
    layout: {
      mode: model.mode,
      entries,
      bounds: { ...origin, width: model.width, height: model.height },
    },
  };
}

export function registerLegendLayout(scene: Scene, layout: LegendLayout | null): void {
  if (layout !== null) legendByScene.set(scene, layout);
}

export function sceneLegendLayout(scene: Scene): LegendLayout | null {
  return legendByScene.get(scene) ?? null;
}
