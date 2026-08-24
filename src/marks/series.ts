import type { MarkCompileContext, MarkCompiler } from '../compiler/types.js';
import { normalDensity, summarizeNormalDistribution } from '../data/distribution.js';
import { BandScale } from '../scale/band.js';
import { nodeBase } from '../scene/factory.js';
import type { Point, SceneNode, TextNode } from '../scene/types.js';
import type { DataRow, DataValue, JsonValue } from '../spec/types.js';
import { categoricalColor, colorWithOpacity, mixColor, readableTextColor } from '../theme/color.js';
import {
  isGeographicPosition,
  projectGeographicPosition,
  worldBasemapNodes,
} from './geographic.js';
import {
  mappedContinuousColor,
  numericDataValue,
  scaleInput,
  themedAreaFill,
  themedAreaStroke,
  themedPointFill,
  themedPointStroke,
} from './utils.js';

const TAU = Math.PI * 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function optionNumber(value: JsonValue | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionString(value: JsonValue | undefined, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function stringValue(value: DataValue): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function paletteColor(context: MarkCompileContext, index: number, count: number): string {
  return categoricalColor(context.theme, index, count);
}

function datumBase(
  context: MarkCompileContext,
  id: string,
  rowIndex: number,
  offset = 0,
  tooltip?: DataRow,
) {
  return nodeBase(id, {
    zIndex: context.layer.zIndex + offset,
    opacity: context.layer.mark.opacity,
    interactive: context.performance.enableHitTesting,
    datum: {
      layerId: context.layer.id,
      rowIndex,
      datum: context.table.row(rowIndex),
      ...(tooltip === undefined ? {} : { tooltip }),
    },
  });
}

function textNode(
  context: MarkCompileContext,
  id: string,
  x: number,
  y: number,
  text: string,
  options: {
    readonly fill?: string;
    readonly size?: number;
    readonly weight?: number;
    readonly align?: CanvasTextAlign;
    readonly baseline?: CanvasTextBaseline;
    readonly rotation?: number;
  } = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: context.layer.zIndex + 3 }),
    x,
    y,
    text,
    fill: options.fill ?? context.theme.colors.text,
    fontFamily: context.theme.typography.fontFamily,
    fontSize: options.size ?? context.theme.typography.fontSize,
    fontWeight: options.weight ?? 600,
    align: options.align ?? 'center',
    baseline: options.baseline ?? 'middle',
    rotation: options.rotation ?? 0,
  };
}

function pointOnCircle(cx: number, cy: number, radius: number, angle: number): Point {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function sampledArc(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
  segments = 32,
): Point[] {
  return Array.from({ length: segments + 1 }, (_, index) =>
    pointOnCircle(cx, cy, radius, start + ((end - start) * index) / segments),
  );
}

function annularSector(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  start: number,
  end: number,
): Point[] {
  const segments = Math.max(6, Math.ceil((Math.abs(end - start) / TAU) * 64));
  return [
    ...sampledArc(cx, cy, outerRadius, start, end, segments),
    ...sampledArc(cx, cy, innerRadius, end, start, segments),
  ];
}

function quadraticPoints(start: Point, control: Point, end: Point, segments = 24): Point[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    };
  });
}

function smoothPoints(points: readonly Point[], subdivisions = 8): Point[] {
  if (points.length < 3) return [...points];
  const output: Point[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)] ?? points[0]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[Math.min(points.length - 1, index + 2)] ?? p2;
    for (let step = 0; step < subdivisions; step += 1) {
      const t = step / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      output.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  output.push(points.at(-1)!);
  return output;
}

function validCartesianRows(context: MarkCompileContext): Array<{
  readonly rowIndex: number;
  readonly x: number;
  readonly y: number;
}> {
  const { table, layer, xScale, yScale } = context;
  const rows = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    if (xValue === null || yValue === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(yValue);
    if (Number.isFinite(x) && Number.isFinite(y)) rows.push({ rowIndex, x, y });
  }
  return rows;
}

export const compileSmoothMark: MarkCompiler = (context) => {
  const rows = validCartesianRows(context);
  if (rows.length === 0) return [];
  const { layer, yScale, theme } = context;
  const stroke =
    layer.mark.stroke ?? theme.mark.lineColor ?? theme.mark.defaultColor ?? context.color;
  const points = smoothPoints(rows.map(({ x, y }) => ({ x, y })));
  const nodes: SceneNode[] = [];
  if (layer.mark.options.area === true) {
    const baseline = yScale.map(optionNumber(layer.mark.options.baseline, 0));
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:smooth-area`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
      }),
      points: [{ x: points[0]!.x, y: baseline }, ...points, { x: points.at(-1)!.x, y: baseline }],
      closed: true,
      fill: layer.mark.fill ?? themedAreaFill(theme, context.color, colorWithOpacity(stroke, 0.24)),
      lineWidth: 0,
    });
  }
  nodes.push({
    type: 'path',
    ...nodeBase(`${layer.id}:smooth-line`, {
      zIndex: layer.zIndex + 1,
      opacity: layer.mark.opacity,
    }),
    points,
    closed: false,
    stroke,
    lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth,
    lineCap: theme.mark.lineCap ?? 'round',
    lineJoin: theme.mark.lineJoin ?? 'round',
  });
  if (layer.mark.point) {
    for (const row of rows) {
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:smooth-point:${row.rowIndex}`, row.rowIndex, 2),
        cx: row.x,
        cy: row.y,
        radius: layer.mark.radius ?? theme.mark.pointRadius,
        fill: layer.mark.fill ?? themedPointFill(theme, stroke, theme.colors.background),
        stroke: layer.mark.stroke ?? themedPointStroke(theme, stroke, stroke),
        lineWidth: 2,
      });
    }
  } else {
    rows.forEach((row) => {
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:smooth-hit:${row.rowIndex}`, row.rowIndex, 2),
        cx: row.x,
        cy: row.y,
        radius: Math.max(2.5, layer.mark.radius ?? 3),
        fill: layer.mark.fill ?? themedPointFill(theme, stroke, stroke),
        stroke: layer.mark.stroke ?? themedPointStroke(theme, stroke, theme.colors.background),
        lineWidth: 1,
      });
    });
  }
  return nodes;
};

export const compileRangeMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme, plot } = context;
  const lowField = layer.mark.fields.low ?? 'low';
  const highField = layer.mark.fields.high ?? 'high';
  const mode = optionString(layer.mark.options.mode, 'area');
  const rows: Array<{
    rowIndex: number;
    x: number;
    low: number;
    high: number;
  }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const low = numericDataValue(table.value(rowIndex, lowField));
    const high = numericDataValue(table.value(rowIndex, highField));
    if (xValue === null || low === null || high === null) continue;
    const x = xScale.map(xValue);
    const yLow = yScale.map(low);
    const yHigh = yScale.map(high);
    if ([x, yLow, yHigh].every(Number.isFinite)) {
      rows.push({ rowIndex, x, low: yLow, high: yHigh });
    }
  }
  if (rows.length === 0) return [];
  const stroke =
    layer.mark.stroke ??
    themedAreaStroke(theme, context.color, theme.mark.lineColor ?? context.color);
  const nodes: SceneNode[] = [];
  if (mode === 'area') {
    const highPoints = rows.map((row) => ({ x: row.x, y: row.high }));
    const lowPoints = rows.map((row) => ({ x: row.x, y: row.low })).reverse();
    const smooth = layer.mark.options.smooth === true;
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:range-band`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
      }),
      points: [
        ...(smooth ? smoothPoints(highPoints) : highPoints),
        ...(smooth ? smoothPoints(lowPoints) : lowPoints),
      ],
      closed: true,
      fill: layer.mark.fill ?? themedAreaFill(theme, context.color, colorWithOpacity(stroke, 0.24)),
      stroke,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineJoin: theme.mark.lineJoin ?? 'round',
    });
    for (const row of rows) {
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:range-hit:${row.rowIndex}`, row.rowIndex, 1),
        cx: row.x,
        cy: (row.low + row.high) / 2,
        radius: Math.max(3, layer.mark.radius ?? 3.5),
        fill: layer.mark.fill ?? themedPointFill(theme, stroke, stroke),
        stroke: layer.mark.stroke ?? themedPointStroke(theme, stroke, theme.colors.background),
        lineWidth: 1,
      });
    }
    return nodes;
  }

  const width = Math.max(
    5,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.55
      : (plot.width / Math.max(2, rows.length * 1.5)) * 0.55,
  );
  for (const row of rows) {
    if (mode === 'column') {
      nodes.push({
        type: 'rect',
        ...datumBase(context, `${layer.id}:range-column:${row.rowIndex}`, row.rowIndex),
        x: row.x - width / 2,
        y: Math.min(row.low, row.high),
        width,
        height: Math.max(1, Math.abs(row.low - row.high)),
        fill: layer.mark.fill ?? colorWithOpacity(stroke, 0.72),
        stroke,
        lineWidth: layer.mark.lineWidth ?? 1,
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
      });
      continue;
    }
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:range-stem:${row.rowIndex}`, { zIndex: layer.zIndex }),
      x1: row.x,
      y1: row.low,
      x2: row.x,
      y2: row.high,
      stroke,
      lineWidth: layer.mark.lineWidth ?? 2,
      lineCap: theme.mark.lineCap ?? 'round',
    });
    const radius = Math.max(3, layer.mark.radius ?? 5);
    for (const [suffix, y, fill] of [
      ['low', row.low, layer.mark.fill ?? themedPointFill(theme, stroke, theme.colors.background)],
      ['high', row.high, layer.mark.fill ?? themedPointFill(theme, stroke, stroke)],
    ] as const) {
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:${suffix}:${row.rowIndex}`, row.rowIndex, 1),
        cx: row.x,
        cy: y,
        radius,
        fill,
        stroke: layer.mark.stroke ?? themedPointStroke(theme, stroke, stroke),
        lineWidth: 2,
      });
    }
  }
  return nodes;
};

export const compileDistributionMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, plot, theme } = context;
  const sourceField = layer.mark.fields.value ?? layer.y.field;
  const values: number[] = [];
  for (let index = 0; index < table.length; index += 1) {
    const value = numericDataValue(table.value(index, sourceField));
    if (value !== null) values.push(value);
  }
  const summary = summarizeNormalDistribution(values);
  if (summary === null) return [];
  const { mean, standardDeviation: sigma } = summary;
  const samples = clamp(Math.floor(optionNumber(layer.mark.options.samples, 72)), 24, 160);
  const densities = Array.from({ length: samples + 1 }, (_, index) => {
    const xValue =
      summary.domainMinimum + ((summary.domainMaximum - summary.domainMinimum) * index) / samples;
    const density = normalDensity(xValue, summary);
    return { xValue, density };
  });
  const points = densities.map(({ xValue, density }) => ({
    x: xScale.map(xValue),
    y: yScale.map(density),
  }));
  const baseline = yScale.map(0);
  const stroke =
    layer.mark.stroke ?? theme.mark.lineColor ?? theme.mark.defaultColor ?? context.color;
  const tooltip = {
    kind: 'normal-density',
    mean,
    standardDeviation: sigma,
    sampleCount: values.length,
    minimum: summary.observedMinimum,
    maximum: summary.observedMaximum,
  };
  return [
    {
      type: 'path',
      ...datumBase(context, `${layer.id}:distribution-area`, 0, 0, tooltip),
      points: [{ x: points[0]!.x, y: baseline }, ...points, { x: points.at(-1)!.x, y: baseline }],
      closed: true,
      fill: layer.mark.fill ?? themedAreaFill(theme, context.color, colorWithOpacity(stroke, 0.2)),
      lineWidth: 0,
    },
    {
      type: 'path',
      ...datumBase(context, `${layer.id}:distribution-line`, 0, 1, tooltip),
      points,
      closed: false,
      stroke,
      lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth + 0.5,
      lineCap: theme.mark.lineCap ?? 'round',
      lineJoin: theme.mark.lineJoin ?? 'round',
    },
    textNode(
      context,
      `${layer.id}:distribution-mean`,
      xScale.map(mean),
      plot.y + 14,
      `μ ${mean.toFixed(2)} · σ ${sigma.toFixed(2)}`,
      {
        fill: theme.colors.mutedText,
        size: Math.max(9, theme.typography.fontSize - 1),
      },
    ),
  ];
};

export const compileBulletMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme, plot } = context;
  const targetField = layer.mark.fields.target ?? 'target';
  const nodes: SceneNode[] = [];
  const width = Math.max(
    8,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.62
      : plot.width / Math.max(3, table.length * 2),
  );
  const ranges = Array.isArray(layer.mark.options.ranges)
    ? layer.mark.options.ranges.filter((value): value is number => typeof value === 'number')
    : [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const target = numericDataValue(table.value(rowIndex, targetField));
    if (xValue === null || value === null || target === null) continue;
    const x = xScale.map(xValue);
    const baseline = yScale.map(0);
    const rangeValues =
      ranges.length > 0 ? ranges : [value * 0.65, value * 0.85, Math.max(value, target) * 1.15];
    rangeValues
      .slice()
      .sort((left, right) => right - left)
      .forEach((range, index) => {
        const y = yScale.map(range);
        nodes.push({
          type: 'rect',
          ...nodeBase(`${layer.id}:bullet-range:${rowIndex}:${index}`, {
            zIndex: layer.zIndex - 2 + index * 0.1,
          }),
          x: x - width / 2,
          y: Math.min(y, baseline),
          width,
          height: Math.max(1, Math.abs(baseline - y)),
          fill: mixColor(theme.colors.background, theme.colors.mutedText, 0.15 + index * 0.12),
          lineWidth: 0,
          cornerRadius: 2,
        });
      });
    const valueY = yScale.map(value);
    const targetY = yScale.map(target);
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:bullet-value:${rowIndex}`, rowIndex),
      x: x - width * 0.22,
      y: Math.min(valueY, baseline),
      width: width * 0.44,
      height: Math.max(1, Math.abs(baseline - valueY)),
      fill: layer.mark.fill ?? context.color,
      lineWidth: 0,
      cornerRadius: layer.mark.cornerRadius ?? 2,
    });
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:bullet-target:${rowIndex}`, { zIndex: layer.zIndex + 2 }),
      x1: x - width * 0.42,
      y1: targetY,
      x2: x + width * 0.42,
      y2: targetY,
      stroke: layer.mark.stroke ?? theme.colors.text,
      lineWidth: layer.mark.lineWidth ?? 2.5,
      lineCap: theme.mark.lineCap ?? 'round',
    });
  }
  return nodes;
};

export const compileContourMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const valueField = layer.mark.fields.value ?? 'value';
  const rows: Array<{ rowIndex: number; x: number; y: number; value: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    const value = numericDataValue(table.value(rowIndex, valueField));
    if (xValue === null || yValue === null || value === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(yValue);
    if (Number.isFinite(x) && Number.isFinite(y)) rows.push({ rowIndex, x, y, value });
  }
  if (rows.length === 0) return [];
  const minimum = Math.min(...rows.map(({ value }) => value));
  const maximum = Math.max(...rows.map(({ value }) => value));
  const xValues = [...new Set(rows.map(({ x }) => x))].sort((left, right) => left - right);
  const yValues = [...new Set(rows.map(({ y }) => y))].sort((left, right) => left - right);
  const cellWidth = Math.max(5, ((xValues[1] ?? xValues[0]! + 18) - xValues[0]!) * 0.92);
  const cellHeight = Math.max(5, ((yValues[1] ?? yValues[0]! + 18) - yValues[0]!) * 0.92);
  const nodes: SceneNode[] = rows.map((row) => {
    const ratio = maximum === minimum ? 0.5 : (row.value - minimum) / (maximum - minimum);
    return {
      type: 'rect',
      ...datumBase(context, `${layer.id}:contour-cell:${row.rowIndex}`, row.rowIndex),
      x: row.x - cellWidth / 2,
      y: row.y - cellHeight / 2,
      width: cellWidth,
      height: cellHeight,
      fill: layer.mark.fill ?? mappedContinuousColor(theme, ratio),
      lineWidth: 0,
      cornerRadius: layer.mark.cornerRadius ?? 2,
    };
  });
  const levelCount = clamp(Math.floor(optionNumber(layer.mark.options.levels, 5)), 2, 10);
  for (let levelIndex = 1; levelIndex < levelCount; levelIndex += 1) {
    const target = minimum + ((maximum - minimum) * levelIndex) / levelCount;
    const candidates = rows.filter((row) => row.value >= target);
    if (candidates.length < 2) continue;
    const center = {
      x: candidates.reduce((sum, row) => sum + row.x, 0) / candidates.length,
      y: candidates.reduce((sum, row) => sum + row.y, 0) / candidates.length,
    };
    const radiusX =
      Math.max(...candidates.map((row) => Math.abs(row.x - center.x))) + cellWidth * 0.45;
    const radiusY =
      Math.max(...candidates.map((row) => Math.abs(row.y - center.y))) + cellHeight * 0.45;
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:contour-line:${levelIndex}`, { zIndex: layer.zIndex + 2 }),
      points: Array.from({ length: 37 }, (_, index) => {
        const angle = (index / 36) * TAU;
        return {
          x: center.x + Math.cos(angle) * radiusX,
          y: center.y + Math.sin(angle) * radiusY,
        };
      }),
      closed: true,
      stroke: layer.mark.stroke ?? colorWithOpacity(theme.colors.text, 0.72),
      lineWidth: layer.mark.lineWidth ?? 1.2,
      lineJoin: theme.mark.lineJoin ?? 'round',
    });
  }
  return nodes;
};

export const compileCylinderMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, plot, theme } = context;
  const width = Math.max(
    8,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.58
      : plot.width / Math.max(3, table.length * 1.8),
  );
  const ellipseHeight = clamp(width * 0.28, 4, 18);
  const baseline = yScale.map(0);
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (xValue === null || value === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(value);
    if (![x, y, baseline].every(Number.isFinite)) continue;
    const top = Math.min(y, baseline);
    const bottom = Math.max(y, baseline);
    const color = layer.mark.fill ?? paletteColor(context, rowIndex, table.length);
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:cylinder-body:${rowIndex}`, rowIndex),
      x: x - width / 2,
      y: top,
      width,
      height: Math.max(1, bottom - top),
      fill: color,
      stroke: layer.mark.stroke ?? mixColor(color, theme.colors.text, 0.25),
      lineWidth: layer.mark.lineWidth ?? 1,
      cornerRadius: 0,
    });
    for (const [suffix, centerY, fill] of [
      ['top', top, mixColor(color, '#ffffff', 0.22)],
      ['bottom', bottom, mixColor(color, theme.colors.text, 0.12)],
    ] as const) {
      const points = Array.from({ length: 25 }, (_, index) => {
        const angle = (index / 24) * TAU;
        return {
          x: x + Math.cos(angle) * (width / 2),
          y: centerY + Math.sin(angle) * (ellipseHeight / 2),
        };
      });
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:cylinder-${suffix}:${rowIndex}`, { zIndex: layer.zIndex + 1 }),
        points,
        closed: true,
        fill,
        stroke: layer.mark.stroke ?? mixColor(color, theme.colors.text, 0.25),
        lineWidth: layer.mark.lineWidth ?? 1,
      });
    }
  }
  return nodes;
};

export const compileArcDiagramMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const sourceField = layer.mark.fields.source ?? layer.x.field;
  const targetField = layer.mark.fields.target ?? 'target';
  const valueField = layer.mark.fields.value ?? layer.y.field;
  const names: string[] = [];
  const seen = new Set<string>();
  const links: Array<{ rowIndex: number; source: string; target: string; value: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const source = stringValue(table.value(rowIndex, sourceField));
    const target = table.has(targetField) ? stringValue(table.value(rowIndex, targetField)) : null;
    const value = numericDataValue(table.value(rowIndex, valueField)) ?? 1;
    if (source === null || target === null) continue;
    for (const name of [source, target]) {
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
    links.push({ rowIndex, source, target, value: Math.max(0, value) });
  }
  if (names.length === 0) return [];
  const baseline = plot.y + plot.height * 0.78;
  const positions = new Map(
    names.map((name, index) => [
      name,
      plot.x + (plot.width * (index + 0.5)) / Math.max(1, names.length),
    ]),
  );
  const maximum = Math.max(1, ...links.map(({ value }) => value));
  const nodes: SceneNode[] = [];
  for (const link of links) {
    const startX = positions.get(link.source);
    const endX = positions.get(link.target);
    if (startX === undefined || endX === undefined) continue;
    const height = Math.min(plot.height * 0.64, Math.abs(endX - startX) * 0.55 + 18);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:arc-link:${link.rowIndex}`, link.rowIndex),
      points: quadraticPoints(
        { x: startX, y: baseline },
        { x: (startX + endX) / 2, y: baseline - height },
        { x: endX, y: baseline },
        32,
      ),
      closed: false,
      stroke: layer.mark.stroke ?? paletteColor(context, names.indexOf(link.source), names.length),
      lineWidth: (layer.mark.lineWidth ?? 1.6) + (link.value / maximum) * 5,
      lineCap: theme.mark.lineCap ?? 'round',
      lineJoin: 'round',
    });
  }
  names.forEach((name, index) => {
    const x = positions.get(name)!;
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:arc-node:${index}`, { zIndex: layer.zIndex + 2 }),
      cx: x,
      cy: baseline,
      radius: layer.mark.radius ?? 6,
      fill: layer.mark.fill ?? paletteColor(context, index, names.length),
      stroke: theme.colors.background,
      lineWidth: 2,
    });
    nodes.push(
      textNode(context, `${layer.id}:arc-label:${index}`, x, baseline + 17, name, {
        fill: theme.colors.mutedText,
        size: Math.max(9, theme.typography.fontSize - 1),
      }),
    );
  });
  return nodes;
};

export const compileItemMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const values: Array<{ rowIndex: number; label: string; value: number }> = [];
  let total = 0;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const label = stringValue(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (label === null || value === null || value <= 0) continue;
    values.push({ rowIndex, label, value });
    total += value;
  }
  if (values.length === 0 || total <= 0) return [];
  const count = clamp(Math.floor(optionNumber(layer.mark.options.items, 100)), 20, 400);
  const columns = Math.ceil(Math.sqrt((count * plot.width) / Math.max(1, plot.height)));
  const rows = Math.ceil(count / columns);
  const gap = 2;
  const size = Math.max(2, Math.min(plot.width / columns, plot.height / rows) - gap);
  const assignments: Array<{ rowIndex: number; colorIndex: number }> = [];
  values.forEach((item, colorIndex) => {
    const itemCount = Math.max(1, Math.round((item.value / total) * count));
    for (let index = 0; index < itemCount && assignments.length < count; index += 1) {
      assignments.push({ rowIndex: item.rowIndex, colorIndex });
    }
  });
  while (assignments.length < count)
    assignments.push({ rowIndex: values[0]!.rowIndex, colorIndex: 0 });
  return assignments.map((assignment, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      type: 'circle',
      ...datumBase(context, `${layer.id}:item:${index}`, assignment.rowIndex),
      cx: plot.x + column * (size + gap) + size / 2,
      cy: plot.y + plot.height - row * (size + gap) - size / 2,
      radius: size / 2,
      fill: layer.mark.fill ?? paletteColor(context, assignment.colorIndex, values.length),
      stroke: theme.colors.background,
      lineWidth: 0.8,
    };
  });
};

export const compileLollipopMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const baseline = yScale.map(optionNumber(layer.mark.options.baseline, 0));
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    if (xValue === null || yValue === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(yValue);
    if (![x, y, baseline].every(Number.isFinite)) continue;
    const color = layer.mark.fill ?? paletteColor(context, rowIndex, table.length);
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:lollipop-stem:${rowIndex}`, { zIndex: layer.zIndex }),
      x1: x,
      y1: baseline,
      x2: x,
      y2: y,
      stroke: layer.mark.stroke ?? mixColor(color, theme.colors.background, 0.18),
      lineWidth: layer.mark.lineWidth ?? 2,
      lineCap: theme.mark.lineCap ?? 'round',
    });
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:lollipop-head:${rowIndex}`, rowIndex, 1),
      cx: x,
      cy: y,
      radius: layer.mark.radius ?? 7,
      fill: color,
      stroke: theme.colors.background,
      lineWidth: 2,
    });
  }
  return nodes;
};

export const compilePackedBubbleMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const values: Array<{ rowIndex: number; value: number; label: string }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const label = stringValue(table.value(rowIndex, layer.x.field));
    if (value !== null && value >= 0 && label !== null) values.push({ rowIndex, value, label });
  }
  if (values.length === 0) return [];
  const maximum = Math.max(1, ...values.map(({ value }) => value));
  const center = { x: plot.x + plot.width / 2, y: plot.y + plot.height / 2 };
  const maxRadius = Math.min(plot.width, plot.height) * 0.16;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const placed: Array<Point & { radius: number }> = [];
  const nodes: SceneNode[] = [];
  values
    .slice()
    .sort((left, right) => right.value - left.value)
    .forEach((item, index) => {
      const radius = Math.max(8, Math.sqrt(item.value / maximum) * maxRadius);
      let position = center;
      for (let attempt = 0; attempt < 240; attempt += 1) {
        const distance = attempt === 0 ? 0 : Math.sqrt(attempt) * (radius * 0.62 + 4);
        const candidate = {
          x: center.x + Math.cos(attempt * golden) * distance,
          y: center.y + Math.sin(attempt * golden) * distance,
        };
        const fits = placed.every(
          (other) =>
            Math.hypot(candidate.x - other.x, candidate.y - other.y) >= radius + other.radius + 2,
        );
        if (fits) {
          position = candidate;
          break;
        }
      }
      placed.push({ ...position, radius });
      const color = layer.mark.fill ?? paletteColor(context, index, values.length);
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:packed:${item.rowIndex}`, item.rowIndex),
        cx: position.x,
        cy: position.y,
        radius,
        fill: colorWithOpacity(color, 0.86),
        stroke: theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 2,
      });
      if (radius >= 18) {
        nodes.push(
          textNode(
            context,
            `${layer.id}:packed-label:${item.rowIndex}`,
            position.x,
            position.y,
            item.label,
            {
              fill: readableTextColor(color, '#ffffff', '#0f172a'),
              size: clamp(radius * 0.34, 9, 14),
            },
          ),
        );
      }
    });
  return nodes;
};

export const compileParetoMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, plot, theme } = context;
  const rows: Array<{ rowIndex: number; x: number; value: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (xValue === null || value === null) continue;
    const x = xScale.map(xValue);
    if (Number.isFinite(x)) rows.push({ rowIndex, x, value: Math.max(0, value) });
  }
  if (rows.length === 0) return [];
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const baseline = yScale.map(0);
  const width = Math.max(
    5,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.62
      : plot.width / Math.max(3, rows.length * 1.6),
  );
  let running = 0;
  const cumulative: Point[] = [];
  const nodes: SceneNode[] = [];
  for (const row of rows) {
    const y = yScale.map(row.value);
    running += row.value;
    cumulative.push({ x: row.x, y: plot.y + plot.height * (1 - running / total) });
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:pareto-bar:${row.rowIndex}`, row.rowIndex),
      x: row.x - width / 2,
      y: Math.min(y, baseline),
      width,
      height: Math.max(1, Math.abs(baseline - y)),
      fill: layer.mark.fill ?? context.color,
      stroke: theme.colors.background,
      lineWidth: 1,
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
  }
  nodes.push({
    type: 'path',
    ...nodeBase(`${layer.id}:pareto-line`, { zIndex: layer.zIndex + 2 }),
    points: cumulative,
    closed: false,
    stroke: layer.mark.stroke ?? paletteColor(context, 3, 4),
    lineWidth: layer.mark.lineWidth ?? 2.5,
    lineCap: theme.mark.lineCap ?? 'round',
    lineJoin: theme.mark.lineJoin ?? 'round',
  });
  cumulative.forEach((point, index) => {
    const row = rows[index]!;
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:pareto-point:${row.rowIndex}`, row.rowIndex, 3),
      cx: point.x,
      cy: point.y,
      radius: 3.5,
      fill: theme.colors.background,
      stroke: layer.mark.stroke ?? paletteColor(context, 3, 4),
      lineWidth: 2,
    });
  });
  return nodes;
};

export const compilePolygonMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const seriesField = layer.mark.fields.series;
  const groups = new Map<string, Array<{ rowIndex: number; point: Point }>>();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    if (xValue === null || yValue === null) continue;
    const point = { x: xScale.map(xValue), y: yScale.map(yValue) };
    if (![point.x, point.y].every(Number.isFinite)) continue;
    const key =
      seriesField === undefined || !table.has(seriesField)
        ? 'Series'
        : (stringValue(table.value(rowIndex, seriesField)) ?? 'Series');
    const group = groups.get(key) ?? [];
    group.push({ rowIndex, point });
    groups.set(key, group);
  }
  const nodes: SceneNode[] = [];
  [...groups.entries()].forEach(([key, rows], groupIndex) => {
    if (rows.length < 3) return;
    const color = layer.mark.fill ?? paletteColor(context, groupIndex, groups.size);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:polygon:${groupIndex}`, rows[0]!.rowIndex),
      points: rows.map(({ point }) => point),
      closed: true,
      fill: colorWithOpacity(color, 0.24),
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 2,
      lineJoin: theme.mark.lineJoin ?? 'round',
    });
    rows.forEach(({ rowIndex, point }) => {
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:polygon-point:${rowIndex}`, rowIndex, 1),
        cx: point.x,
        cy: point.y,
        radius: layer.mark.radius ?? 3.5,
        fill: theme.colors.background,
        stroke: layer.mark.stroke ?? color,
        lineWidth: 1.5,
      });
    });
    if (layer.mark.options.labels === true) {
      const center = rows.reduce(
        (sum, row) => ({
          x: sum.x + row.point.x / rows.length,
          y: sum.y + row.point.y / rows.length,
        }),
        { x: 0, y: 0 },
      );
      nodes.push(
        textNode(context, `${layer.id}:polygon-label:${groupIndex}`, center.x, center.y, key),
      );
    }
  });
  return nodes;
};

export const compilePyramidMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const rows: Array<{ rowIndex: number; label: string; value: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const label = stringValue(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (label !== null && value !== null && value >= 0) rows.push({ rowIndex, label, value });
  }
  if (rows.length === 0) return [];
  const variant = optionString(layer.mark.options.variant, 'pyramid');
  const reverse = variant.includes('funnel');
  const depth = variant.includes('3d')
    ? clamp(optionNumber(layer.mark.options.depth, 12), 4, 24)
    : 0;
  const sorted =
    layer.mark.options.sort === false ? rows : rows.slice().sort((a, b) => b.value - a.value);
  const maximum = Math.max(1, ...sorted.map(({ value }) => value));
  const height = plot.height / sorted.length;
  const centerX = plot.x + plot.width / 2 - depth / 2;
  const maxWidth = plot.width * 0.82;
  const nodes: SceneNode[] = [];
  sorted.forEach((row, index) => {
    const currentRatio = clamp(row.value / maximum, 0.06, 1);
    const nextRatio = clamp((sorted[index + 1]?.value ?? 0) / maximum, 0.03, 1);
    const topRatio = reverse ? currentRatio : nextRatio;
    const bottomRatio = reverse ? nextRatio : currentRatio;
    const y1 = plot.y + index * height + 1;
    const y2 = plot.y + (index + 1) * height - 1;
    const color = layer.mark.fill ?? paletteColor(context, index, sorted.length);
    const front = [
      { x: centerX - (maxWidth * topRatio) / 2, y: y1 },
      { x: centerX + (maxWidth * topRatio) / 2, y: y1 },
      { x: centerX + (maxWidth * bottomRatio) / 2, y: y2 },
      { x: centerX - (maxWidth * bottomRatio) / 2, y: y2 },
    ];
    if (depth > 0) {
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:pyramid-depth:${row.rowIndex}`, { zIndex: layer.zIndex }),
        points: [
          front[1]!,
          { x: front[1]!.x + depth, y: front[1]!.y - depth * 0.45 },
          { x: front[2]!.x + depth, y: front[2]!.y - depth * 0.45 },
          front[2]!,
        ],
        closed: true,
        fill: mixColor(color, theme.colors.text, 0.18),
        lineWidth: 0,
      });
    }
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:pyramid:${row.rowIndex}`, row.rowIndex, 1),
      points: front,
      closed: true,
      fill: color,
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1,
      lineJoin: 'round',
    });
    if (Math.min(maxWidth * topRatio, maxWidth * bottomRatio) > 62) {
      nodes.push(
        textNode(
          context,
          `${layer.id}:pyramid-label:${row.rowIndex}`,
          centerX,
          (y1 + y2) / 2,
          row.label,
          {
            fill: readableTextColor(color, '#ffffff', '#0f172a'),
            size: Math.max(9, theme.typography.fontSize - 1),
          },
        ),
      );
    }
  });
  return nodes;
};

export const compileScatter3dMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const zField = layer.mark.fields.z ?? 'z';
  const extent = table.has(zField) ? table.extent(zField) : null;
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    const z = table.has(zField) ? numericDataValue(table.value(rowIndex, zField)) : 0;
    if (xValue === null || yValue === null || z === null) continue;
    const ratio =
      extent === null || extent[1] === extent[0] ? 0.5 : (z - extent[0]) / (extent[1] - extent[0]);
    const perspective =
      (ratio - 0.5) * clamp(optionNumber(layer.mark.options.perspective, 18), 0, 42);
    const x = xScale.map(xValue) + perspective;
    const y = yScale.map(yValue) - perspective * 0.55;
    const radius = (layer.mark.radius ?? 5) * (0.72 + ratio * 0.9);
    const color = layer.mark.fill ?? paletteColor(context, rowIndex, table.length);
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:scatter-shadow:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: 0.16,
      }),
      cx: x + 3,
      cy: y + 4,
      radius: radius * 1.05,
      fill: theme.colors.text,
      lineWidth: 0,
    });
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:scatter-3d:${rowIndex}`, rowIndex, ratio),
      cx: x,
      cy: y,
      radius,
      fill: mixColor(color, '#ffffff', (1 - ratio) * 0.18),
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1.5,
    });
  }
  return nodes;
};

export const compileSolidGaugeMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const minimum = optionNumber(layer.mark.options.min, 0);
  const maximum = optionNumber(layer.mark.options.max, 100);
  const start = optionNumber(layer.mark.options.startAngle, -Math.PI * 0.75);
  const end = optionNumber(layer.mark.options.endAngle, Math.PI * 0.75);
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height * 0.58;
  const outer = Math.min(plot.width, plot.height) * 0.38;
  const thickness = clamp(
    optionNumber(layer.mark.options.thickness, outer * 0.18),
    6,
    outer * 0.45,
  );
  const nodes: SceneNode[] = [
    {
      type: 'path',
      ...nodeBase(`${layer.id}:solid-track`, { zIndex: layer.zIndex }),
      points: annularSector(cx, cy, outer - thickness, outer, start, end),
      closed: true,
      fill: colorWithOpacity(theme.colors.grid, 0.62),
      lineWidth: 0,
    },
  ];
  const count = Math.max(1, table.length);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (value === null) continue;
    const ratio = clamp((value - minimum) / Math.max(1e-9, maximum - minimum), 0, 1);
    const ringOuter = outer - rowIndex * (thickness + 5);
    const ringInner = Math.max(4, ringOuter - thickness);
    const color = layer.mark.fill ?? paletteColor(context, rowIndex, table.length);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:solid-value:${rowIndex}`, rowIndex, 1),
      points: annularSector(cx, cy, ringInner, ringOuter, start, start + (end - start) * ratio),
      closed: true,
      fill: color,
      stroke: theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1,
    });
    if (rowIndex === count - 1) {
      nodes.push(
        textNode(context, `${layer.id}:solid-label`, cx, cy + outer * 0.2, `${Math.round(value)}`, {
          size: clamp(outer * 0.2, 16, 30),
          weight: 700,
        }),
      );
    }
  }
  return nodes;
};

function tilePolygon(shape: string, x: number, y: number, width: number, height: number): Point[] {
  if (shape === 'diamond') {
    return [
      { x, y: y - height / 2 },
      { x: x + width / 2, y },
      { x, y: y + height / 2 },
      { x: x - width / 2, y },
    ];
  }
  return [
    { x: x - width / 2, y: y - height * 0.25 },
    { x, y: y - height / 2 },
    { x: x + width / 2, y: y - height * 0.25 },
    { x: x + width / 2, y: y + height * 0.25 },
    { x, y: y + height / 2 },
    { x: x - width / 2, y: y + height * 0.25 },
  ];
}

export const compileTilemapMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const valueField = layer.mark.fields.value ?? 'value';
  const values = table.has(valueField) ? table.extent(valueField) : null;
  const shape = optionString(layer.mark.options.shape, 'hexagon');
  const width = xScale instanceof BandScale ? xScale.bandwidth * 0.92 : 24;
  const height = yScale instanceof BandScale ? yScale.bandwidth * 0.92 : 22;
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    const value = table.has(valueField) ? numericDataValue(table.value(rowIndex, valueField)) : 0;
    if (xValue === null || yValue === null || value === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(yValue);
    const ratio =
      values === null || values[1] === values[0]
        ? 0.5
        : (value - values[0]) / (values[1] - values[0]);
    const color = layer.mark.fill ?? mappedContinuousColor(theme, ratio);
    if (shape === 'circle') {
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:tile:${rowIndex}`, rowIndex),
        cx: x,
        cy: y,
        radius: Math.min(width, height) / 2,
        fill: color,
        stroke: layer.mark.stroke ?? theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 1,
      });
    } else if (shape === 'square') {
      nodes.push({
        type: 'rect',
        ...datumBase(context, `${layer.id}:tile:${rowIndex}`, rowIndex),
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
        fill: color,
        stroke: layer.mark.stroke ?? theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 1,
        cornerRadius: layer.mark.cornerRadius ?? 2,
      });
    } else {
      nodes.push({
        type: 'path',
        ...datumBase(context, `${layer.id}:tile:${rowIndex}`, rowIndex),
        points: tilePolygon(shape, x, y, width, height),
        closed: true,
        fill: color,
        stroke: layer.mark.stroke ?? theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 1,
        lineJoin: 'round',
      });
    }
  }
  return nodes;
};

export const compileVariablePieMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const radiusField = layer.mark.fields.radius ?? layer.mark.fields.size ?? 'radius';
  const rows: Array<{ rowIndex: number; label: string; value: number; radius: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const label = stringValue(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const radius = table.has(radiusField)
      ? numericDataValue(table.value(rowIndex, radiusField))
      : value;
    if (label !== null && value !== null && radius !== null && value >= 0)
      rows.push({ rowIndex, label, value, radius: Math.max(0, radius) });
  }
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (rows.length === 0 || total <= 0) return [];
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const maxRadius = Math.min(plot.width, plot.height) * 0.42;
  const minRadius = maxRadius * 0.48;
  const radiusMaximum = Math.max(1, ...rows.map(({ radius }) => radius));
  let angle = -Math.PI / 2;
  const nodes: SceneNode[] = [];
  rows.forEach((row, index) => {
    const next = angle + (row.value / total) * TAU;
    const outer = minRadius + Math.sqrt(row.radius / radiusMaximum) * (maxRadius - minRadius);
    const color = layer.mark.fill ?? paletteColor(context, index, rows.length);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:variable-pie:${row.rowIndex}`, row.rowIndex),
      points: annularSector(
        cx,
        cy,
        optionNumber(layer.mark.options.innerRadius, 0),
        outer,
        angle,
        next,
      ),
      closed: true,
      fill: color,
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 2,
      lineJoin: 'round',
    });
    const mid = (angle + next) / 2;
    if (next - angle > 0.28) {
      const labelPoint = pointOnCircle(cx, cy, outer * 0.66, mid);
      nodes.push(
        textNode(
          context,
          `${layer.id}:variable-label:${row.rowIndex}`,
          labelPoint.x,
          labelPoint.y,
          row.label,
          {
            fill: readableTextColor(color, '#ffffff', '#0f172a'),
            size: Math.max(9, theme.typography.fontSize - 1),
          },
        ),
      );
    }
    angle = next;
  });
  return nodes;
};

export const compileVariwideMark: MarkCompiler = (context) => {
  const { layer, table, yScale, plot, theme } = context;
  const widthField = layer.mark.fields.width ?? 'width';
  const rows: Array<{ rowIndex: number; value: number; width: number; label: string }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const width = table.has(widthField) ? numericDataValue(table.value(rowIndex, widthField)) : 1;
    const label = stringValue(table.value(rowIndex, layer.x.field));
    if (value !== null && width !== null && width > 0 && label !== null)
      rows.push({ rowIndex, value, width, label });
  }
  const widthTotal = rows.reduce((sum, row) => sum + row.width, 0);
  if (rows.length === 0 || widthTotal <= 0) return [];
  const baseline = yScale.map(0);
  const nodes: SceneNode[] = [];
  let cursor = plot.x;
  rows.forEach((row, index) => {
    const width = (row.width / widthTotal) * plot.width;
    const y = yScale.map(row.value);
    const color = layer.mark.fill ?? paletteColor(context, index, rows.length);
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:variwide:${row.rowIndex}`, row.rowIndex),
      x: cursor + 1,
      y: Math.min(y, baseline),
      width: Math.max(1, width - 2),
      height: Math.max(1, Math.abs(baseline - y)),
      fill: color,
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1,
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
    if (width >= 36)
      nodes.push(
        textNode(
          context,
          `${layer.id}:variwide-label:${row.rowIndex}`,
          cursor + width / 2,
          baseline + 14,
          row.label,
          { fill: theme.colors.mutedText, size: 9 },
        ),
      );
    cursor += width;
  });
  return nodes;
};

export const compileVectorMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const directionField = layer.mark.fields.direction ?? 'direction';
  const magnitudeField = layer.mark.fields.magnitude ?? 'magnitude';
  const extent = table.has(magnitudeField) ? table.extent(magnitudeField) : null;
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    const direction = table.has(directionField)
      ? numericDataValue(table.value(rowIndex, directionField))
      : 0;
    const magnitude = table.has(magnitudeField)
      ? numericDataValue(table.value(rowIndex, magnitudeField))
      : 1;
    if (xValue === null || yValue === null || direction === null || magnitude === null) continue;
    const start = { x: xScale.map(xValue), y: yScale.map(yValue) };
    const ratio =
      extent === null || extent[1] === extent[0]
        ? 0.6
        : (magnitude - extent[0]) / (extent[1] - extent[0]);
    const length = 10 + clamp(ratio, 0, 1) * 26;
    const angle = (direction * Math.PI) / 180 - Math.PI / 2;
    const end = pointOnCircle(start.x, start.y, length, angle);
    const color = layer.mark.stroke ?? context.color;
    nodes.push({
      type: 'line',
      ...datumBase(context, `${layer.id}:vector:${rowIndex}`, rowIndex),
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: color,
      lineWidth: (layer.mark.lineWidth ?? 1.5) + ratio * 2,
      lineCap: theme.mark.lineCap ?? 'round',
    });
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:vector-head:${rowIndex}`, { zIndex: layer.zIndex + 1 }),
      points: [
        end,
        pointOnCircle(end.x, end.y, 6, angle + Math.PI * 0.78),
        pointOnCircle(end.x, end.y, 6, angle - Math.PI * 0.78),
      ],
      closed: true,
      fill: color,
      stroke: theme.colors.background,
      lineWidth: 0.6,
    });
  }
  return nodes;
};

export const compileVennMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const rows: Array<{ rowIndex: number; label: string; value: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const label = stringValue(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (label !== null && value !== null && value > 0) rows.push({ rowIndex, label, value });
  }
  if (rows.length === 0) return [];
  const maximum = Math.max(...rows.map(({ value }) => value));
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const orbit = Math.min(plot.width, plot.height) * 0.13;
  const maxRadius = Math.min(plot.width, plot.height) * 0.25;
  const nodes: SceneNode[] = [];
  rows.slice(0, 6).forEach((row, index, visibleRows) => {
    const angle = -Math.PI / 2 + (index * TAU) / Math.max(1, visibleRows.length);
    const center = pointOnCircle(cx, cy, visibleRows.length === 1 ? 0 : orbit, angle);
    const radius = Math.max(24, Math.sqrt(row.value / maximum) * maxRadius);
    const color = layer.mark.fill ?? paletteColor(context, index, visibleRows.length);
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:venn:${row.rowIndex}`, row.rowIndex, index * 0.01),
      cx: center.x,
      cy: center.y,
      radius,
      fill: colorWithOpacity(color, 0.34),
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 2,
    });
    nodes.push(
      textNode(context, `${layer.id}:venn-label:${row.rowIndex}`, center.x, center.y, row.label, {
        fill: theme.colors.text,
        size: Math.max(10, theme.typography.fontSize),
      }),
    );
  });
  return nodes;
};

export const compileWindBarbMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const speedField = layer.mark.fields.speed ?? 'speed';
  const directionField = layer.mark.fields.direction ?? 'direction';
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    const speed = table.has(speedField)
      ? numericDataValue(table.value(rowIndex, speedField))
      : null;
    const direction = table.has(directionField)
      ? numericDataValue(table.value(rowIndex, directionField))
      : null;
    if (xValue === null || yValue === null || speed === null || direction === null) continue;
    const start = { x: xScale.map(xValue), y: yScale.map(yValue) };
    const length = clamp(18 + speed * 0.35, 20, 44);
    const angle = (direction * Math.PI) / 180 - Math.PI / 2;
    const end = pointOnCircle(start.x, start.y, length, angle);
    const stroke = layer.mark.stroke ?? context.color;
    nodes.push({
      type: 'line',
      ...datumBase(context, `${layer.id}:wind:${rowIndex}`, rowIndex),
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke,
      lineWidth: layer.mark.lineWidth ?? 2,
      lineCap: 'round',
    });
    const featherCount = clamp(Math.round(speed / 10), 1, 6);
    for (let feather = 0; feather < featherCount; feather += 1) {
      const ratio = 0.32 + (feather / featherCount) * 0.58;
      const anchor = {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
      const tip = pointOnCircle(anchor.x, anchor.y, 8, angle - Math.PI * 0.7);
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:wind-feather:${rowIndex}:${feather}`, {
          zIndex: layer.zIndex + 1,
        }),
        x1: anchor.x,
        y1: anchor.y,
        x2: tip.x,
        y2: tip.y,
        stroke,
        lineWidth: 1.5,
        lineCap: 'round',
      });
    }
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:wind-origin:${rowIndex}`, { zIndex: layer.zIndex + 2 }),
      cx: start.x,
      cy: start.y,
      radius: 2.5,
      fill: theme.colors.background,
      stroke,
      lineWidth: 1.5,
    });
  }
  return nodes;
};

export const compileWordCloudMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const rows: Array<{ rowIndex: number; word: string; weight: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const word = stringValue(table.value(rowIndex, layer.x.field));
    const weight = numericDataValue(table.value(rowIndex, layer.y.field));
    if (word !== null && word !== '' && weight !== null && weight > 0)
      rows.push({ rowIndex, word, weight });
  }
  if (rows.length === 0) return [];
  const minimum = Math.min(...rows.map(({ weight }) => weight));
  const maximum = Math.max(...rows.map(({ weight }) => weight));
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const nodes: SceneNode[] = [];
  const placed: Array<{ left: number; right: number; top: number; bottom: number }> = [];
  const visibleCount = Math.min(rows.length, 160, context.performance.maxPointMarks);
  rows
    .slice()
    .sort((left, right) => right.weight - left.weight)
    .slice(0, visibleCount)
    .forEach((row, index) => {
      const ratio = maximum === minimum ? 0.5 : (row.weight - minimum) / (maximum - minimum);
      const size = 10 + ratio * 24;
      const rotation = index % 5 === 0 ? -18 : index % 7 === 0 ? 18 : 0;
      const textWidth = Math.max(size, row.word.length * size * 0.56);
      const textHeight = size * 1.08;
      const radians = (Math.abs(rotation) * Math.PI) / 180;
      const width = textWidth * Math.cos(radians) + textHeight * Math.sin(radians);
      const height = textWidth * Math.sin(radians) + textHeight * Math.cos(radians);
      let x = cx;
      let y = cy;
      let found = false;
      for (let attempt = 0; attempt < 1600; attempt += 1) {
        const angle = attempt * 0.42 + index * 1.17;
        const distance = 3.3 * Math.sqrt(attempt) * (1 + size / 40);
        const candidateX = cx + Math.cos(angle) * distance;
        const candidateY = cy + Math.sin(angle) * distance * 0.64;
        const box = {
          left: candidateX - width / 2 - 3,
          right: candidateX + width / 2 + 3,
          top: candidateY - height / 2 - 2,
          bottom: candidateY + height / 2 + 2,
        };
        const inside =
          box.left >= plot.x &&
          box.right <= plot.x + plot.width &&
          box.top >= plot.y &&
          box.bottom <= plot.y + plot.height;
        const free = placed.every(
          (other) =>
            box.right < other.left ||
            box.left > other.right ||
            box.bottom < other.top ||
            box.top > other.bottom,
        );
        if (inside && free) {
          x = candidateX;
          y = candidateY;
          placed.push(box);
          found = true;
          break;
        }
      }
      if (!found) return;
      const color = layer.mark.fill ?? paletteColor(context, index, visibleCount);
      const node = textNode(context, `${layer.id}:word-cloud:${row.rowIndex}`, x, y, row.word, {
        fill: color,
        size,
        weight: 520 + Math.round(ratio * 220),
        rotation,
      });
      nodes.push({ ...node, ...datumBase(context, node.id, row.rowIndex, ratio) });
    });
  return nodes;
};

function movingAverage(values: readonly (number | null)[], period: number): Array<number | null> {
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    const window = values.slice(index + 1 - period, index + 1);
    if (window.some((value) => value === null)) return null;
    return window.reduce<number>((sum, value) => sum + (value ?? 0), 0) / period;
  });
}

function exponentialAverage(
  values: readonly (number | null)[],
  period: number,
): Array<number | null> {
  const multiplier = 2 / (period + 1);
  let previous: number | null = null;
  return values.map((value) => {
    if (value === null) return null;
    previous = previous === null ? value : value * multiplier + previous * (1 - multiplier);
    return previous;
  });
}

function weightedAverage(values: readonly (number | null)[], period: number): Array<number | null> {
  const denominator = (period * (period + 1)) / 2;
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    const window = values.slice(index + 1 - period, index + 1);
    if (window.some((value) => value === null)) return null;
    return (
      window.reduce<number>((sum, value, offset) => sum + (value ?? 0) * (offset + 1), 0) /
      denominator
    );
  });
}

function relativeStrength(
  values: readonly (number | null)[],
  period: number,
): Array<number | null> {
  return values.map((_, index) => {
    if (index < period) return null;
    let gains = 0;
    let losses = 0;
    for (let offset = index - period + 1; offset <= index; offset += 1) {
      const current = values[offset];
      const previous = values[offset - 1];
      if (current === null || previous === null || current === undefined || previous === undefined)
        return null;
      const change = current - previous;
      if (change >= 0) gains += change;
      else losses -= change;
    }
    if (losses === 0) return 100;
    const ratio = gains / losses;
    return 100 - 100 / (1 + ratio);
  });
}

function calculatedIndicator(
  kind: string,
  values: readonly (number | null)[],
  period: number,
): Array<number | null> {
  if (kind === 'sma') return movingAverage(values, period);
  if (kind === 'ema') return exponentialAverage(values, period);
  if (kind === 'wma') return weightedAverage(values, period);
  if (kind === 'dema') {
    const once = exponentialAverage(values, period);
    const twice = exponentialAverage(once, period);
    return once.map((value, index) =>
      value === null || twice[index] === null ? null : 2 * value - (twice[index] ?? 0),
    );
  }
  if (kind === 'tema') {
    const once = exponentialAverage(values, period);
    const twice = exponentialAverage(once, period);
    const three = exponentialAverage(twice, period);
    return once.map((value, index) =>
      value === null || twice[index] === null || three[index] === null
        ? null
        : 3 * value - 3 * (twice[index] ?? 0) + (three[index] ?? 0),
    );
  }
  if (kind === 'momentum') {
    return values.map((value, index) =>
      value === null || index < period || values[index - period] === null
        ? null
        : value - (values[index - period] ?? 0),
    );
  }
  if (kind === 'roc') {
    return values.map((value, index) => {
      const previous = index < period ? null : values[index - period];
      return value === null || previous === null || previous === undefined || previous === 0
        ? null
        : ((value - previous) / previous) * 100;
    });
  }
  if (kind === 'rsi') return relativeStrength(values, period);
  return [...values];
}

function indicatorKind(context: MarkCompileContext): string {
  return optionString(context.layer.mark.options.kind, 'line');
}

function indicatorFields(context: MarkCompileContext): string[] {
  const fields = context.layer.mark.options.fields;
  if (Array.isArray(fields)) {
    const valid = fields.filter(
      (value): value is string => typeof value === 'string' && value !== '',
    );
    if (valid.length > 0) return valid;
  }
  const configured = [
    context.layer.mark.fields.middle,
    context.layer.mark.fields.signal,
    context.layer.mark.fields.secondary,
  ].filter((value): value is string => value !== undefined && context.table.has(value));
  return configured.length > 0 ? configured : [context.layer.y.field];
}

export const compileIndicatorMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme, plot } = context;
  const kind = indicatorKind(context);
  const lowerField = layer.mark.fields.lower ?? 'lower';
  const upperField = layer.mark.fields.upper ?? 'upper';
  const fields = indicatorFields(context);
  const period = clamp(Math.floor(optionNumber(layer.mark.options.period, 14)), 2, 200);
  const sourceValues = Array.from({ length: table.length }, (_, rowIndex) =>
    numericDataValue(table.value(rowIndex, layer.y.field)),
  );
  const calculated =
    layer.mark.options.calculate === true
      ? calculatedIndicator(kind, sourceValues, period)
      : sourceValues;
  const nodes: SceneNode[] = [];

  if (table.has(lowerField) && table.has(upperField)) {
    const upper: Point[] = [];
    const lower: Point[] = [];
    for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
      const xValue = scaleInput(table.value(rowIndex, layer.x.field));
      const low = numericDataValue(table.value(rowIndex, lowerField));
      const high = numericDataValue(table.value(rowIndex, upperField));
      if (xValue === null || low === null || high === null) continue;
      const x = xScale.map(xValue);
      upper.push({ x, y: yScale.map(high) });
      lower.push({ x, y: yScale.map(low) });
    }
    if (upper.length > 1 && lower.length > 1) {
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:indicator-band`, { zIndex: layer.zIndex, opacity: 0.24 }),
        points: [...upper, ...lower.reverse()],
        closed: true,
        fill: layer.mark.fill ?? colorWithOpacity(context.color, 0.28),
        stroke: layer.mark.stroke ?? context.color,
        lineWidth: 1,
        lineJoin: theme.mark.lineJoin ?? 'round',
      });
    }
  }

  const columnKinds = new Set(['ao', 'macd', 'volume', 'histogram']);
  fields.forEach((field, fieldIndex) => {
    const points: Array<{ rowIndex: number; point: Point; value: number }> = [];
    for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
      const xValue = scaleInput(table.value(rowIndex, layer.x.field));
      const value =
        layer.mark.options.calculate === true && field === layer.y.field
          ? calculated[rowIndex]
          : table.has(field)
            ? numericDataValue(table.value(rowIndex, field))
            : null;
      if (xValue === null || value === null || value === undefined) continue;
      const point = { x: xScale.map(xValue), y: yScale.map(value) };
      if ([point.x, point.y].every(Number.isFinite)) points.push({ rowIndex, point, value });
    }
    const color =
      fieldIndex === 0
        ? (layer.mark.stroke ?? context.color)
        : paletteColor(context, fieldIndex + 1, fields.length + 1);
    if (columnKinds.has(kind)) {
      const baseline = yScale.map(0);
      const width = Math.max(2, plot.width / Math.max(8, table.length * 1.6));
      points.forEach(({ rowIndex, point, value }) => {
        nodes.push({
          type: 'rect',
          ...datumBase(
            context,
            `${layer.id}:indicator-column:${fieldIndex}:${rowIndex}`,
            rowIndex,
            fieldIndex,
          ),
          x: point.x - width / 2,
          y: Math.min(point.y, baseline),
          width,
          height: Math.max(1, Math.abs(baseline - point.y)),
          fill: layer.mark.fill ?? (value >= 0 ? color : paletteColor(context, 3, 4)),
          lineWidth: 0,
          cornerRadius: 1,
        });
      });
    } else if (points.length > 0) {
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:indicator-line:${fieldIndex}`, {
          zIndex: layer.zIndex + fieldIndex + 1,
        }),
        points:
          kind === 'psar'
            ? points.map(({ point }) => point)
            : smoothPoints(
                points.map(({ point }) => point),
                4,
              ),
        closed: false,
        stroke: color,
        lineWidth: layer.mark.lineWidth ?? (fieldIndex === 0 ? 2.2 : 1.5),
        ...(fieldIndex > 0 ? { dash: [5, 3] } : {}),
        lineCap: theme.mark.lineCap ?? 'round',
        lineJoin: theme.mark.lineJoin ?? 'round',
      });
      points.forEach(({ rowIndex, point }, index) => {
        if (kind !== 'psar' && index % Math.max(1, Math.ceil(points.length / 24)) !== 0) return;
        nodes.push({
          type: 'circle',
          ...datumBase(
            context,
            `${layer.id}:indicator-point:${fieldIndex}:${rowIndex}`,
            rowIndex,
            fieldIndex + 2,
          ),
          cx: point.x,
          cy: point.y,
          radius: kind === 'psar' ? 3.2 : 2.2,
          fill: color,
          stroke: theme.colors.background,
          lineWidth: 0.8,
        });
      });
    }
  });
  return nodes;
};

export const compileFlagsMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const titleField = layer.mark.fields.title ?? 'title';
  const nodes: SceneNode[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    if (xValue === null || yValue === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(yValue);
    const label = table.has(titleField)
      ? (stringValue(table.value(rowIndex, titleField)) ?? '•')
      : '•';
    const color = layer.mark.fill ?? context.color;
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:flag-pole:${rowIndex}`, { zIndex: layer.zIndex }),
      x1: x,
      y1: y,
      x2: x,
      y2: y - 24,
      stroke: layer.mark.stroke ?? color,
      lineWidth: 1.5,
      lineCap: theme.mark.lineCap ?? 'round',
    });
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:flag:${rowIndex}`, rowIndex, 1),
      points: [
        { x, y: y - 27 },
        { x: x + 30, y: y - 27 },
        { x: x + 24, y: y - 17 },
        { x, y: y - 17 },
      ],
      closed: true,
      fill: color,
      stroke: theme.colors.background,
      lineWidth: 1,
      lineJoin: 'round',
    });
    nodes.push(
      textNode(context, `${layer.id}:flag-label:${rowIndex}`, x + 14, y - 22, label.slice(0, 4), {
        fill: readableTextColor(color, '#ffffff', '#0f172a'),
        size: 9,
      }),
    );
  }
  return nodes;
};

interface FinancialRow {
  readonly rowIndex: number;
  readonly x: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

function financialRows(context: MarkCompileContext): FinancialRow[] {
  const { layer, table, xScale } = context;
  const openField = layer.mark.fields.open ?? 'open';
  const highField = layer.mark.fields.high ?? 'high';
  const lowField = layer.mark.fields.low ?? 'low';
  const closeField = layer.mark.fields.close ?? layer.y.field;
  const rows: FinancialRow[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const open = table.has(openField) ? numericDataValue(table.value(rowIndex, openField)) : null;
    const high = table.has(highField) ? numericDataValue(table.value(rowIndex, highField)) : null;
    const low = table.has(lowField) ? numericDataValue(table.value(rowIndex, lowField)) : null;
    const close = table.has(closeField)
      ? numericDataValue(table.value(rowIndex, closeField))
      : null;
    if (xValue === null || high === null || low === null || close === null) continue;
    rows.push({ rowIndex, x: xScale.map(xValue), open: open ?? close, high, low, close });
  }
  return rows;
}

function heikinRows(rows: readonly FinancialRow[]): FinancialRow[] {
  let previousOpen: number | null = null;
  let previousClose: number | null = null;
  return rows.map((row) => {
    const close = (row.open + row.high + row.low + row.close) / 4;
    const open =
      previousOpen === null || previousClose === null
        ? (row.open + row.close) / 2
        : (previousOpen + previousClose) / 2;
    const transformed = {
      ...row,
      open,
      close,
      high: Math.max(row.high, open, close),
      low: Math.min(row.low, open, close),
    };
    previousOpen = open;
    previousClose = close;
    return transformed;
  });
}

export const compileFinancialMark: MarkCompiler = (context) => {
  const { layer, yScale, xScale, theme, plot } = context;
  const kind = optionString(layer.mark.options.kind, 'ohlc');
  const rows = kind === 'heikin-ashi' ? heikinRows(financialRows(context)) : financialRows(context);
  const width = Math.max(
    5,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.56
      : plot.width / Math.max(6, rows.length * 1.8),
  );
  const nodes: SceneNode[] = [];
  for (const row of rows) {
    const high = yScale.map(row.high);
    const low = yScale.map(row.low);
    const open = yScale.map(row.open);
    const close = yScale.map(row.close);
    const rising = row.close >= row.open;
    const color = rising ? paletteColor(context, 1, 4) : paletteColor(context, 3, 4);
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:financial-wick:${row.rowIndex}`, { zIndex: layer.zIndex }),
      x1: row.x,
      y1: high,
      x2: row.x,
      y2: low,
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineCap: theme.mark.lineCap ?? 'round',
    });
    if (kind === 'ohlc' || kind === 'hlc') {
      if (kind === 'ohlc')
        nodes.push({
          type: 'line',
          ...nodeBase(`${layer.id}:financial-open:${row.rowIndex}`, { zIndex: layer.zIndex + 1 }),
          x1: row.x - width / 2,
          y1: open,
          x2: row.x,
          y2: open,
          stroke: color,
          lineWidth: 1.8,
        });
      nodes.push({
        type: 'line',
        ...datumBase(context, `${layer.id}:financial-close:${row.rowIndex}`, row.rowIndex, 1),
        x1: row.x,
        y1: close,
        x2: row.x + width / 2,
        y2: close,
        stroke: color,
        lineWidth: 1.8,
      });
      continue;
    }
    const hollow = kind === 'hollow-candlestick' && rising;
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:financial-body:${row.rowIndex}`, row.rowIndex, 1),
      x: row.x - width / 2,
      y: Math.min(open, close),
      width,
      height: Math.max(1.5, Math.abs(open - close)),
      fill: hollow ? theme.colors.background : (layer.mark.fill ?? color),
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      cornerRadius: layer.mark.cornerRadius ?? 1.5,
    });
  }
  return nodes;
};

export const compilePointFigureMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const values: Array<{ rowIndex: number; value: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (value !== null) values.push({ rowIndex, value });
  }
  if (values.length < 2) return [];
  const minimum = Math.min(...values.map(({ value }) => value));
  const maximum = Math.max(...values.map(({ value }) => value));
  const box = Math.max(
    1e-9,
    optionNumber(layer.mark.options.boxSize, (maximum - minimum) / 10 || 1),
  );
  const cellWidth = plot.width / values.length;
  const cellHeight = plot.height / Math.max(4, Math.ceil((maximum - minimum) / box) + 1);
  const nodes: SceneNode[] = [];
  values.forEach((row, index) => {
    const previous = values[Math.max(0, index - 1)]?.value ?? row.value;
    const rising = row.value >= previous;
    const count = Math.max(1, Math.round(Math.abs(row.value - previous) / box));
    const color = rising ? paletteColor(context, 1, 4) : paletteColor(context, 3, 4);
    for (let level = 0; level < count; level += 1) {
      const x = plot.x + cellWidth * (index + 0.5);
      const baseLevel = Math.round((Math.min(row.value, previous) - minimum) / box);
      const y = plot.y + plot.height - cellHeight * (baseLevel + level + 0.5);
      nodes.push({
        ...textNode(
          context,
          `${layer.id}:point-figure:${row.rowIndex}:${level}`,
          x,
          y,
          rising ? '×' : '○',
          {
            fill: layer.mark.stroke ?? color,
            size: clamp(Math.min(cellWidth, cellHeight) * 0.82, 9, 22),
            weight: 700,
          },
        ),
        ...datumBase(context, `${layer.id}:point-figure:${row.rowIndex}:${level}`, row.rowIndex),
      });
    }
  });
  return nodes;
};

export const compileRenkoMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const values: Array<{ rowIndex: number; value: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (value !== null) values.push({ rowIndex, value });
  }
  if (values.length < 2) return [];
  const minimum = Math.min(...values.map(({ value }) => value));
  const maximum = Math.max(...values.map(({ value }) => value));
  const brickSize = Math.max(
    1e-9,
    optionNumber(layer.mark.options.brickSize, (maximum - minimum) / 12 || 1),
  );
  const bricks: Array<{ rowIndex: number; start: number; end: number }> = [];
  let level = values[0]!.value;
  for (const row of values.slice(1)) {
    while (Math.abs(row.value - level) >= brickSize) {
      const direction = Math.sign(row.value - level);
      const next = level + direction * brickSize;
      bricks.push({ rowIndex: row.rowIndex, start: level, end: next });
      level = next;
    }
  }
  if (bricks.length === 0) return [];
  const low = Math.min(...bricks.flatMap((brick) => [brick.start, brick.end]));
  const high = Math.max(...bricks.flatMap((brick) => [brick.start, brick.end]));
  const width = plot.width / Math.max(1, bricks.length);
  const mapY = (value: number) =>
    plot.y + plot.height - ((value - low) / Math.max(1e-9, high - low)) * plot.height;
  return bricks.map((brick, index) => {
    const rising = brick.end >= brick.start;
    const color = rising ? paletteColor(context, 1, 4) : paletteColor(context, 3, 4);
    const start = mapY(brick.start);
    const end = mapY(brick.end);
    return {
      type: 'rect',
      ...datumBase(context, `${layer.id}:renko:${index}`, brick.rowIndex, 0, {
        ...table.row(brick.rowIndex),
        brickStart: brick.start,
        brickEnd: brick.end,
        brickSize,
      }),
      x: plot.x + index * width + 1,
      y: Math.min(start, end),
      width: Math.max(2, width - 2),
      height: Math.max(2, Math.abs(start - end)),
      fill: layer.mark.fill ?? colorWithOpacity(color, 0.76),
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 1.4,
      cornerRadius: layer.mark.cornerRadius ?? 1,
    };
  });
};

export const compileVolumeProfileMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const priceField = layer.mark.fields.price ?? layer.y.field;
  const volumeField = layer.mark.fields.volume ?? 'volume';
  const bins = clamp(Math.floor(optionNumber(layer.mark.options.bins, 12)), 4, 50);
  const priceExtent = table.has(priceField) ? table.extent(priceField) : null;
  if (priceExtent === null || !table.has(volumeField)) return [];
  const totals = Array.from({ length: bins }, () => 0);
  const rowIndexes = Array.from({ length: bins }, () => -1);
  const span = priceExtent[1] - priceExtent[0] || 1;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const price = numericDataValue(table.value(rowIndex, priceField));
    const volume = numericDataValue(table.value(rowIndex, volumeField));
    if (price === null || volume === null) continue;
    const bin = clamp(Math.floor(((price - priceExtent[0]) / span) * bins), 0, bins - 1);
    totals[bin] = (totals[bin] ?? 0) + Math.max(0, volume);
    rowIndexes[bin] = rowIndex;
  }
  const maximum = Math.max(1, ...totals);
  const totalVolume = totals.reduce((sum, volume) => sum + volume, 0);
  const height = plot.height / bins;
  const nodes: SceneNode[] = [];
  totals.forEach((volume, index) => {
    const width = (volume / maximum) * plot.width * 0.48;
    const rowIndex = rowIndexes[index] ?? -1;
    const base =
      rowIndex >= 0
        ? datumBase(context, `${layer.id}:volume-profile:${index}`, rowIndex, 0, {
            priceStart: priceExtent[0] + (span * index) / bins,
            priceEnd: priceExtent[0] + (span * (index + 1)) / bins,
            volume,
            proportion: totalVolume === 0 ? 0 : volume / totalVolume,
          })
        : nodeBase(`${layer.id}:volume-profile:${index}`, { zIndex: layer.zIndex });
    nodes.push({
      type: 'rect',
      ...base,
      x: plot.x + plot.width - width,
      y: plot.y + plot.height - (index + 1) * height + 1,
      width,
      height: Math.max(1, height - 2),
      fill: layer.mark.fill ?? colorWithOpacity(context.color, 0.68),
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: 0.8,
      cornerRadius: 2,
    });
  });
  return nodes;
};

export const compileGeoLineMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const longitude2Field = layer.mark.fields.longitude2 ?? layer.mark.fields.x2 ?? 'longitude2';
  const latitude2Field = layer.mark.fields.latitude2 ?? layer.mark.fields.y2 ?? 'latitude2';
  const valueField = layer.mark.fields.value;
  const valueExtent =
    valueField !== undefined && table.has(valueField) ? table.extent(valueField) : null;
  const flow = layer.mark.options.flow === true;
  const nodes = worldBasemapNodes(context);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
    const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
    const longitude2 = table.has(longitude2Field)
      ? numericDataValue(table.value(rowIndex, longitude2Field))
      : null;
    const latitude2 = table.has(latitude2Field)
      ? numericDataValue(table.value(rowIndex, latitude2Field))
      : null;
    if (
      longitude === null ||
      latitude === null ||
      longitude2 === null ||
      latitude2 === null ||
      !isGeographicPosition(longitude, latitude) ||
      !isGeographicPosition(longitude2, latitude2)
    )
      continue;
    const start = projectGeographicPosition(plot, longitude, latitude);
    const end = projectGeographicPosition(plot, longitude2, latitude2);
    const control = {
      x: (start.x + end.x) / 2,
      y: Math.min(start.y, end.y) - Math.abs(end.x - start.x) * 0.16,
    };
    const value =
      valueField !== undefined && table.has(valueField)
        ? (numericDataValue(table.value(rowIndex, valueField)) ?? 1)
        : 1;
    const ratio =
      valueExtent === null || valueExtent[1] === valueExtent[0]
        ? 0.5
        : (value - valueExtent[0]) / (valueExtent[1] - valueExtent[0]);
    const points = quadraticPoints(start, control, end, 28);
    const color = layer.mark.stroke ?? paletteColor(context, rowIndex, table.length);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:geo-line:${rowIndex}`, rowIndex),
      points,
      closed: false,
      stroke: color,
      lineWidth: (layer.mark.lineWidth ?? 1.8) + ratio * 3,
      lineCap: 'round',
      lineJoin: 'round',
    });
    if (flow) {
      const previous = points.at(-2) ?? start;
      const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:geo-arrow:${rowIndex}`, { zIndex: layer.zIndex + 1 }),
        points: [
          end,
          pointOnCircle(end.x, end.y, 7, angle + Math.PI * 0.82),
          pointOnCircle(end.x, end.y, 7, angle - Math.PI * 0.82),
        ],
        closed: true,
        fill: color,
        stroke: theme.colors.background,
        lineWidth: 0.5,
      });
    }
  }
  return nodes;
};

export const compileGeoHeatmapMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const valueField = layer.mark.fields.value ?? 'value';
  const extent = table.has(valueField) ? table.extent(valueField) : null;
  const nodes = worldBasemapNodes(context);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
    const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
    const value = table.has(valueField)
      ? numericDataValue(table.value(rowIndex, valueField))
      : null;
    if (
      longitude === null ||
      latitude === null ||
      value === null ||
      !isGeographicPosition(longitude, latitude)
    )
      continue;
    const point = projectGeographicPosition(plot, longitude, latitude);
    const ratio =
      extent === null || extent[1] === extent[0]
        ? 0.5
        : (value - extent[0]) / (extent[1] - extent[0]);
    const color = layer.mark.fill ?? mappedContinuousColor(theme, ratio);
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:geo-heat-halo:${rowIndex}`, {
        zIndex: layer.zIndex - 0.5,
        opacity: 0.18,
      }),
      cx: point.x,
      cy: point.y,
      radius: 12 + ratio * 18,
      fill: color,
      lineWidth: 0,
    });
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:geo-heat:${rowIndex}`, rowIndex),
      cx: point.x,
      cy: point.y,
      radius: 5 + ratio * 9,
      fill: color,
      stroke: theme.colors.background,
      lineWidth: 1.2,
    });
  }
  return nodes;
};

export const compileTiledMapMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const nodes: SceneNode[] = worldBasemapNodes(context);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
    const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
    if (longitude === null || latitude === null || !isGeographicPosition(longitude, latitude))
      continue;
    const point = projectGeographicPosition(plot, longitude, latitude);
    const color = layer.mark.fill ?? paletteColor(context, rowIndex, table.length);
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:tiled-point:${rowIndex}`, rowIndex),
      cx: point.x,
      cy: point.y,
      radius: layer.mark.radius ?? 6,
      fill: color,
      stroke: theme.colors.background,
      lineWidth: 2,
    });
  }
  return nodes;
};

export const compileGeoFlowMark: MarkCompiler = (context) =>
  compileGeoLineMark({
    ...context,
    layer: {
      ...context.layer,
      mark: {
        ...context.layer.mark,
        options: { ...context.layer.mark.options, flow: true },
      },
    },
  });
