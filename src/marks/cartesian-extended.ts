import type { MarkCompiler } from '../compiler/types.js';
import {
  weightedHistogram,
  type HistogramNormalization,
  type WeightedObservation,
} from '../data/statistics.js';
import { BandScale } from '../scale/band.js';
import { nodeBase } from '../scene/factory.js';
import type {
  CircleNode,
  LineNode,
  PathNode,
  Point,
  RectNode,
  SceneNode,
  TextNode,
} from '../scene/types.js';
import { categoricalColor, colorWithOpacity, mixColor } from '../theme/color.js';
import { compileAreaMark, compileAreaSeries } from './area.js';
import { compileBarMark } from './bar.js';
import { compileLineMark } from './line.js';
import { compilePointMark } from './point.js';
import { numericDataValue, scaleInput, themedPointFill, themedPointStroke } from './utils.js';

function optionNumber(
  options: Readonly<Record<string, unknown>>,
  name: string,
  fallback: number,
): number {
  const value = options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionString(
  options: Readonly<Record<string, unknown>>,
  name: string,
): string | undefined {
  const value = options[name];
  return typeof value === 'string' ? value : undefined;
}

function textNode(
  id: string,
  x: number,
  y: number,
  text: string,
  context: Parameters<MarkCompiler>[0],
  options: {
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    size?: number;
    weight?: number;
  } = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: context.layer.zIndex + 2 }),
    x,
    y,
    text,
    fill: context.theme.colors.text,
    fontFamily: context.theme.typography.fontFamily,
    fontSize: options.size ?? context.theme.typography.fontSize,
    fontWeight: options.weight ?? 500,
    align: options.align ?? 'center',
    baseline: options.baseline ?? 'middle',
    rotation: 0,
  };
}

export const compileSteppedAreaMark: MarkCompiler = (context) =>
  compileAreaSeries(context, {
    curve: 'step-after',
    missing: 'connect',
    idStem: 'stepped-area',
  });

export const compileBubbleMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, theme, color, performance } = context;
  const sizeField = layer.mark.fields.size;
  const colorField = layer.mark.fields.color;
  const timeField = layer.mark.fields.time;
  const frame = layer.mark.options.frame;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  if (sizeField !== undefined && table.has(sizeField)) {
    const extent = table.extent(sizeField);
    if (extent !== null) [minimum, maximum] = extent;
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    minimum = 1;
    maximum = 1;
  }
  const categoryColors = new Map<string, string>();
  const categoryCount =
    colorField === undefined
      ? 0
      : new Set(
          Array.from({ length: table.length }, (_, rowIndex) => {
            if (
              timeField !== undefined &&
              frame !== undefined &&
              String(table.value(rowIndex, timeField)) !== String(frame)
            ) {
              return null;
            }
            return String(table.value(rowIndex, colorField) ?? '');
          }).filter((value): value is string => value !== null),
        ).size;
  const nodes: CircleNode[] = [];
  const minimumRadius = optionNumber(layer.mark.options, 'minRadius', layer.mark.radius ?? 5);
  const maximumRadius = optionNumber(layer.mark.options, 'maxRadius', 24);

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    if (
      timeField !== undefined &&
      frame !== undefined &&
      String(table.value(rowIndex, timeField)) !== String(frame)
    ) {
      continue;
    }
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const yInput = scaleInput(table.value(rowIndex, layer.y.field));
    if (xInput === null || yInput === null) continue;
    const cx = xScale.map(xInput);
    const cy = yScale.map(yInput);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    const size =
      sizeField === undefined ? maximum : numericDataValue(table.value(rowIndex, sizeField));
    const ratio =
      size === null || maximum === minimum
        ? 0.5
        : Math.max(0, Math.min(1, (size - minimum) / (maximum - minimum)));
    let fill = layer.mark.fill ?? themedPointFill(theme, color, theme.mark.defaultColor ?? color);
    if (layer.mark.fill === undefined && colorField !== undefined) {
      const category = String(table.value(rowIndex, colorField) ?? '');
      let categoryColor = categoryColors.get(category);
      if (categoryColor === undefined) {
        categoryColor = categoricalColor(theme, categoryColors.size, categoryCount);
        categoryColors.set(category, categoryColor);
      }
      fill = categoryColor;
    }
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:bubble:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      cx,
      cy,
      radius: minimumRadius + Math.sqrt(ratio) * (maximumRadius - minimumRadius),
      fill,
      stroke: layer.mark.stroke ?? themedPointStroke(theme, fill, theme.colors.background),
      lineWidth: layer.mark.lineWidth ?? theme.mark.pointStrokeWidth ?? 2,
    });
  }
  return nodes;
};

export const compileCandlestickMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, plot, theme, performance } = context;
  const openField = layer.mark.fields.open ?? 'open';
  const highField = layer.mark.fields.high ?? 'high';
  const lowField = layer.mark.fields.low ?? 'low';
  const closeField = layer.mark.fields.close ?? layer.y.field;
  const width = Math.max(
    3,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.58
      : (plot.width / Math.max(1, table.length)) * 0.56,
  );
  const nodes: SceneNode[] = [];

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const open = numericDataValue(table.value(rowIndex, openField));
    const high = numericDataValue(table.value(rowIndex, highField));
    const low = numericDataValue(table.value(rowIndex, lowField));
    const close = numericDataValue(table.value(rowIndex, closeField));
    if (xInput === null || open === null || high === null || low === null || close === null)
      continue;
    const x = xScale.map(xInput);
    const yOpen = yScale.map(open);
    const yHigh = yScale.map(high);
    const yLow = yScale.map(low);
    const yClose = yScale.map(close);
    if (![x, yOpen, yHigh, yLow, yClose].every(Number.isFinite)) continue;
    const rising = close >= open;
    const fill =
      layer.mark.fill ??
      (rising
        ? (optionString(layer.mark.options, 'risingColor') ?? categoricalColor(theme, 1, 4))
        : (optionString(layer.mark.options, 'fallingColor') ?? categoricalColor(theme, 3, 4)));
    const datum = { layerId: layer.id, rowIndex, datum: table.row(rowIndex) };
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:wick:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
      }),
      x1: x,
      y1: yHigh,
      x2: x,
      y2: yLow,
      stroke: layer.mark.stroke ?? mixColor(fill, theme.colors.text, 0.28),
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineCap: theme.mark.lineCap ?? 'round',
    });
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:body:${rowIndex}`, {
        zIndex: layer.zIndex + 0.1,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum,
      }),
      x: x - width / 2,
      y: Math.min(yOpen, yClose),
      width,
      height: Math.max(1.5, Math.abs(yOpen - yClose)),
      fill,
      stroke: layer.mark.stroke ?? fill,
      lineWidth: layer.mark.lineWidth ?? 1,
      cornerRadius: layer.mark.cornerRadius ?? 1,
    });
  }
  return nodes;
};

export const compileHistogramMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, theme, color, performance } = context;
  const binCount = Math.max(
    1,
    Math.min(100, Math.floor(optionNumber(layer.mark.options, 'bins', 10))),
  );
  const extent = table.extent(layer.x.field, layer.x.type === 'temporal');
  if (extent === null) return [];
  const weightField = layer.mark.fields.weight ?? optionString(layer.mark.options, 'weightField');
  const observations: WeightedObservation[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(
      table.value(rowIndex, layer.x.field),
      layer.x.type === 'temporal',
    );
    if (value === null) continue;
    const weight =
      weightField === undefined ? 1 : numericDataValue(table.value(rowIndex, weightField));
    if (weight === null || weight < 0) continue;
    observations.push({ value, weight, rowIndex });
  }
  const normalizationOption = optionString(layer.mark.options, 'normalization');
  const normalization: HistogramNormalization =
    normalizationOption === 'probability' ||
    normalizationOption === 'normalized' ||
    layer.mark.options.normalized === true
      ? 'probability'
      : normalizationOption === 'density'
        ? 'density'
        : 'count';
  const bins = weightedHistogram(observations, {
    bins: binCount,
    extent,
    normalization,
    cumulative: layer.mark.options.cumulative === true,
  });
  const baseline = yScale.map(0);
  const nodes: RectNode[] = [];
  const histogramGap = Math.max(0, theme.mark.histogramGap ?? 2);
  bins.forEach((bin, index) => {
    const x1 = xScale.map(bin.start);
    const x2 = xScale.map(bin.end);
    const y = yScale.map(bin.value);
    const rowIndex = bin.rowIndices[0];
    if (![x1, x2, y, baseline].every(Number.isFinite)) return;
    const stroke =
      layer.mark.stroke ??
      theme.mark.barStroke ??
      (theme.mark.barFill === undefined ? theme.colors.background : undefined);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:bin:${index}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting && rowIndex !== undefined,
        ...(rowIndex === undefined
          ? {}
          : {
              datum: {
                layerId: layer.id,
                rowIndex,
                datum: table.row(rowIndex),
                tooltip: {
                  kind: 'histogram-bin',
                  binStart: bin.start,
                  binEnd: bin.end,
                  count: bin.count,
                  weight: bin.weight,
                  value: bin.value,
                  proportion: bin.proportion,
                  normalization,
                  cumulative: layer.mark.options.cumulative === true,
                  weightField: weightField ?? null,
                  sourceRowCount: bin.rowIndices.length,
                  sourceRowIndices: bin.rowIndices.slice(0, 256),
                },
              },
            }),
      }),
      x: Math.min(x1, x2) + histogramGap,
      y: Math.min(y, baseline),
      width: Math.max(1, Math.abs(x2 - x1) - histogramGap * 2),
      height: Math.max(0.5, Math.abs(baseline - y)),
      fill: layer.mark.fill ?? theme.mark.histogramFill ?? theme.mark.barFill ?? color,
      ...(stroke === undefined ? {} : { stroke }),
      lineWidth:
        layer.mark.lineWidth ?? (stroke === undefined ? 0 : (theme.mark.barStrokeWidth ?? 1)),
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
  });
  return nodes;
};

export const compileIntervalMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, color, theme, performance } = context;
  const lowField = layer.mark.fields.low ?? 'low';
  const highField = layer.mark.fields.high ?? 'high';
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const low = numericDataValue(table.value(rowIndex, lowField));
    const high = numericDataValue(table.value(rowIndex, highField));
    if (xInput === null || value === null || low === null || high === null) continue;
    const x = xScale.map(xInput);
    const y = yScale.map(value);
    const yLow = yScale.map(low);
    const yHigh = yScale.map(high);
    if (![x, y, yLow, yHigh].every(Number.isFinite)) continue;
    const stroke = layer.mark.stroke ?? theme.mark.lineColor ?? theme.mark.defaultColor ?? color;
    const cap = Math.max(4, (xScale instanceof BandScale ? xScale.bandwidth : 14) * 0.25);
    const base = `${layer.id}:interval:${rowIndex}`;
    const lineWidth = layer.mark.lineWidth ?? 2;
    const lines: LineNode[] = [
      {
        type: 'line',
        ...nodeBase(`${base}:range`, { zIndex: layer.zIndex }),
        x1: x,
        y1: yHigh,
        x2: x,
        y2: yLow,
        stroke,
        lineWidth,
        lineCap: theme.mark.lineCap ?? 'round',
      },
      {
        type: 'line',
        ...nodeBase(`${base}:high`, { zIndex: layer.zIndex }),
        x1: x - cap,
        y1: yHigh,
        x2: x + cap,
        y2: yHigh,
        stroke,
        lineWidth,
        lineCap: theme.mark.lineCap ?? 'round',
      },
      {
        type: 'line',
        ...nodeBase(`${base}:low`, { zIndex: layer.zIndex }),
        x1: x - cap,
        y1: yLow,
        x2: x + cap,
        y2: yLow,
        stroke,
        lineWidth,
        lineCap: theme.mark.lineCap ?? 'round',
      },
    ];
    nodes.push(...lines);
    nodes.push({
      type: 'circle',
      ...nodeBase(`${base}:value`, {
        zIndex: layer.zIndex + 0.1,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      cx: x,
      cy: y,
      radius: layer.mark.radius ?? theme.mark.pointRadius + 1,
      fill: layer.mark.fill ?? themedPointFill(theme, stroke, theme.colors.background),
      stroke: layer.mark.stroke ?? themedPointStroke(theme, stroke, stroke),
      lineWidth: layer.mark.lineWidth ?? theme.mark.pointStrokeWidth ?? lineWidth,
    });
  }
  return nodes;
};

export const compileTrendlineMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, color, theme } = context;
  const points = compilePointMark(context);
  const pairs: { x: number; y: number }[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const x = numericDataValue(table.value(rowIndex, layer.x.field), layer.x.type === 'temporal');
    const y = numericDataValue(table.value(rowIndex, layer.y.field), layer.y.type === 'temporal');
    if (x !== null && y !== null) pairs.push({ x, y });
  }
  if (pairs.length < 2) return points;
  const meanX = pairs.reduce((sum, point) => sum + point.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, point) => sum + point.y, 0) / pairs.length;
  const numerator = pairs.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = pairs.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0) || 1;
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const minimum = Math.min(...pairs.map((point) => point.x));
  const maximum = Math.max(...pairs.map((point) => point.x));
  const line: PathNode = {
    type: 'path',
    ...nodeBase(`${layer.id}:trendline`, {
      zIndex: layer.zIndex + 0.2,
      opacity: layer.mark.opacity,
    }),
    points: [
      { x: xScale.map(minimum), y: yScale.map(intercept + slope * minimum) },
      { x: xScale.map(maximum), y: yScale.map(intercept + slope * maximum) },
    ],
    closed: false,
    stroke: layer.mark.stroke ?? theme.mark.lineColor ?? theme.mark.defaultColor ?? color,
    lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth + 0.5,
    dash: [7, 4],
    lineCap: theme.mark.lineCap ?? 'round',
    lineJoin: theme.mark.lineJoin ?? 'round',
  };
  return [...points, line];
};

export const compileWaterfallMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, theme, performance, plot } = context;
  const width = Math.max(
    3,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.62
      : (plot.width / Math.max(1, table.length)) * 0.6,
  );
  const nodes: SceneNode[] = [];
  let total = 0;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const delta = numericDataValue(table.value(rowIndex, layer.y.field));
    if (xInput === null || delta === null) continue;
    const previous = total;
    total += delta;
    const x = xScale.map(xInput);
    const y1 = yScale.map(previous);
    const y2 = yScale.map(total);
    if (![x, y1, y2].every(Number.isFinite)) continue;
    const fill =
      layer.mark.fill ??
      (delta >= 0
        ? (optionString(layer.mark.options, 'positiveColor') ?? categoricalColor(theme, 1, 4))
        : (optionString(layer.mark.options, 'negativeColor') ?? categoricalColor(theme, 3, 4)));
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:waterfall:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      x: x - width / 2,
      y: Math.min(y1, y2),
      width,
      height: Math.max(1, Math.abs(y2 - y1)),
      fill,
      lineWidth: 0,
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
    const nextInput =
      rowIndex + 1 < table.length ? scaleInput(table.value(rowIndex + 1, layer.x.field)) : null;
    if (nextInput !== null) {
      const nextX = xScale.map(nextInput);
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:connector:${rowIndex}`, { zIndex: layer.zIndex - 0.1 }),
        x1: x + width / 2,
        y1: y2,
        x2: nextX - width / 2,
        y2,
        stroke: theme.colors.axis,
        lineWidth: 1,
        dash: [3, 3],
        lineCap: theme.mark.lineCap ?? 'round',
      });
    }
  }
  return nodes;
};

export const compileDiffMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, theme, performance, plot } = context;
  const oldField = layer.mark.fields.old ?? 'old';
  const newField = layer.mark.fields.new ?? layer.y.field;
  const width = Math.max(
    4,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.64
      : (plot.width / Math.max(1, table.length)) * 0.62,
  );
  const baseline = yScale.map(0);
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const oldValue = numericDataValue(table.value(rowIndex, oldField));
    const newValue = numericDataValue(table.value(rowIndex, newField));
    if (xInput === null || oldValue === null || newValue === null) continue;
    const x = xScale.map(xInput);
    const oldY = yScale.map(oldValue);
    const newY = yScale.map(newValue);
    if (![x, oldY, newY, baseline].every(Number.isFinite)) continue;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:old:${rowIndex}`, { zIndex: layer.zIndex, opacity: 0.28 }),
      x: x - width / 2,
      y: Math.min(oldY, baseline),
      width,
      height: Math.max(1, Math.abs(baseline - oldY)),
      fill: optionString(layer.mark.options, 'oldColor') ?? theme.colors.mutedText,
      lineWidth: 0,
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:new:${rowIndex}`, {
        zIndex: layer.zIndex + 0.1,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      x: x - width * 0.32,
      y: Math.min(newY, baseline),
      width: width * 0.64,
      height: Math.max(1, Math.abs(baseline - newY)),
      fill: layer.mark.fill ?? theme.colors.focus,
      lineWidth: 0,
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:delta:${rowIndex}`, { zIndex: layer.zIndex + 0.2 }),
      x1: x,
      y1: oldY,
      x2: x,
      y2: newY,
      stroke: theme.colors.text,
      lineWidth: 1.5,
      lineCap: theme.mark.lineCap ?? 'round',
    });
  }
  return nodes;
};

export const compileAnnotationMark: MarkCompiler = (context) => {
  const nodes: SceneNode[] = [...compileLineMark(context)];
  const { table, layer, xScale, plot, theme } = context;
  const titleField = layer.mark.fields.annotation ?? 'annotation';
  const textField = layer.mark.fields.annotationText;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    if (!table.has(titleField)) break;
    const annotation = table.value(rowIndex, titleField);
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    if (annotation === null || annotation === undefined || annotation === '' || xInput === null)
      continue;
    const x = xScale.map(xInput);
    if (!Number.isFinite(x)) continue;
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:annotation-line:${rowIndex}`, { zIndex: layer.zIndex + 0.5 }),
      x1: x,
      y1: plot.y,
      x2: x,
      y2: plot.y + plot.height,
      stroke: layer.mark.stroke ?? theme.colors.focus,
      lineWidth: 1.25,
      dash: [4, 3],
    });
    const suffix =
      textField !== undefined && table.has(textField)
        ? table.value(rowIndex, textField)
        : undefined;
    const label =
      suffix === undefined || suffix === null
        ? String(annotation)
        : `${String(annotation)} — ${String(suffix)}`;
    const width = Math.min(190, Math.max(54, label.length * 6.1 + 16));
    const labelX = Math.min(plot.x + plot.width - width - 4, x + 6);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:annotation-pill:${rowIndex}`, {
        zIndex: layer.zIndex + 0.6,
        opacity: 0.96,
      }),
      x: labelX,
      y: plot.y + 4,
      width,
      height: 22,
      fill: theme.colors.surface,
      stroke: colorWithOpacity(layer.mark.stroke ?? theme.colors.focus, 0.46),
      lineWidth: 1,
      cornerRadius: 6,
    });
    nodes.push(
      textNode(
        `${layer.id}:annotation-label:${rowIndex}`,
        labelX + 8,
        plot.y + 15,
        label,
        context,
        { align: 'left', baseline: 'middle', size: 10, weight: 650 },
      ),
    );
  }
  return nodes;
};

export const compileVegaMark: MarkCompiler = (context) => {
  const mark = optionString(context.layer.mark.options, 'mark') ?? 'line';
  if (mark === 'bar') return compileBarMark(context);
  if (mark === 'area') return compileAreaMark(context);
  if (mark === 'point' || mark === 'circle') return compilePointMark(context);
  return compileLineMark(context);
};
