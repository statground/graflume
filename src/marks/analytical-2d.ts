import type { MarkCompileContext, MarkCompiler } from '../compiler/types.js';
import { exactStrideSampleIndices, minMaxSampleIndices } from '../data/sample.js';
import type { DataRow, DataValue, JsonValue } from '../spec/types.js';
import { nodeBase } from '../scene/factory.js';
import type { Point, SceneNode, TextNode } from '../scene/types.js';
import { BandScale } from '../scale/band.js';
import { colorWithOpacity, mixColor, readableTextColor } from '../theme/color.js';
import { compileBoxplotMark, compileRadarMark } from './advanced.js';
import { compileHistogramMark } from './cartesian-extended.js';
import { compileDistributionMark } from './series.js';
import { resolveDistributionMode } from '../spec/distribution.js';
import { numericDataValue, scaleInput } from './utils.js';

const TAU = Math.PI * 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function optionNumber(options: Readonly<Record<string, JsonValue>>, key: string, fallback: number) {
  const value = options[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionString(options: Readonly<Record<string, JsonValue>>, key: string, fallback: string) {
  const value = options[key];
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function optionStrings(value: JsonValue | undefined): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function allocatedBudget(total: number, count: number, index: number): number {
  if (total <= 0 || count <= 0 || index < 0 || index >= count) return 0;
  const base = Math.floor(total / count);
  return base + (index < total % count ? 1 : 0);
}

function sampledItems<T>(values: readonly T[], target: number): readonly T[] {
  return exactStrideSampleIndices(values.length, target).flatMap((index) => {
    const value = values[index];
    return value === undefined ? [] : [value];
  });
}

function sampledLineItems<T>(
  values: readonly T[],
  target: number,
  metric: (value: T) => number,
): readonly T[] {
  if (target < 4 || values.length <= target) return sampledItems(values, target);
  return minMaxSampleIndices(values.map(metric), target).flatMap((index) => {
    const value = values[index];
    return value === undefined ? [] : [value];
  });
}

function stringValue(value: DataValue): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function paletteColor(context: MarkCompileContext, index: number): string {
  return (
    context.theme.colors.palette[index % context.theme.colors.palette.length] ??
    context.theme.colors.focus
  );
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
    ...nodeBase(id, { zIndex: context.layer.zIndex + 4 }),
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

function datumBase(
  context: MarkCompileContext,
  id: string,
  rowIndex: number,
  zIndex = 1,
  tooltip?: DataRow,
) {
  return nodeBase(id, {
    zIndex: context.layer.zIndex + zIndex,
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

function inferredCellSpan(values: readonly number[], fallback: number): number {
  const sorted = [...new Set(values.filter(Number.isFinite))].sort((left, right) => left - right);
  let smallest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < sorted.length; index += 1) {
    smallest = Math.min(smallest, (sorted[index] ?? 0) - (sorted[index - 1] ?? 0));
  }
  return Number.isFinite(smallest) ? Math.max(1, smallest) : Math.max(1, fallback);
}

interface ContourSegment {
  readonly levelIndex: number;
  readonly points: readonly [Point, Point];
}

function interpolateContourPoint(
  start: Point,
  end: Point,
  startValue: number,
  endValue: number,
  level: number,
): Point {
  const ratio = clamp((level - startValue) / (endValue - startValue || 1), 0, 1);
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

/** Deterministic marching-squares segments for regular or warped grids. */
function contourSegments(
  values: readonly (readonly (number | null)[])[],
  points: readonly (readonly (Point | null)[])[],
  levels: readonly number[],
  maximumSegments = Number.POSITIVE_INFINITY,
): readonly ContourSegment[] {
  const limit = Math.max(0, Math.trunc(maximumSegments));
  if (limit === 0) return [];
  const segments: ContourSegment[] = [];
  for (let row = 0; row < values.length - 1; row += 1) {
    const current = values[row];
    const next = values[row + 1];
    const currentPoints = points[row];
    const nextPoints = points[row + 1];
    if (
      current === undefined ||
      next === undefined ||
      currentPoints === undefined ||
      nextPoints === undefined
    )
      continue;
    const width = Math.min(current.length, next.length, currentPoints.length, nextPoints.length);
    for (let column = 0; column < width - 1; column += 1) {
      const cellValues = [current[column], current[column + 1], next[column + 1], next[column]];
      const cellPoints = [
        currentPoints[column],
        currentPoints[column + 1],
        nextPoints[column + 1],
        nextPoints[column],
      ];
      if (
        cellValues.some((value) => value === null || value === undefined) ||
        cellPoints.some((point) => point === null || point === undefined)
      )
        continue;
      const numeric = cellValues as [number, number, number, number];
      const corners = cellPoints as [Point, Point, Point, Point];
      for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
        const level = levels[levelIndex];
        if (level === undefined) continue;
        const crossings: Point[] = [];
        for (let edge = 0; edge < 4; edge += 1) {
          const nextEdge = (edge + 1) % 4;
          const startValue = numeric[edge] ?? 0;
          const endValue = numeric[nextEdge] ?? 0;
          if (
            (startValue < level && endValue >= level) ||
            (endValue < level && startValue >= level)
          ) {
            crossings.push(
              interpolateContourPoint(
                corners[edge] ?? corners[0],
                corners[nextEdge] ?? corners[0],
                startValue,
                endValue,
                level,
              ),
            );
          }
        }
        if (crossings.length === 2 && crossings[0] !== undefined && crossings[1] !== undefined) {
          segments.push({ levelIndex, points: [crossings[0], crossings[1]] });
          if (segments.length >= limit) return segments;
        } else if (crossings.length === 4) {
          const first = crossings[0];
          const second = crossings[1];
          const third = crossings[2];
          const fourth = crossings[3];
          if (first !== undefined && second !== undefined) {
            segments.push({ levelIndex, points: [first, second] });
            if (segments.length >= limit) return segments;
          }
          if (third !== undefined && fourth !== undefined) {
            segments.push({ levelIndex, points: [third, fourth] });
            if (segments.length >= limit) return segments;
          }
        }
      }
    }
  }
  return segments;
}

function byteChannel(value: DataValue, fallback: number): number {
  const numeric = numericDataValue(value);
  return numeric === null ? fallback : Math.round(clamp(numeric, 0, 255));
}

/** A raster compiler that keeps every pixel portable as a data row. */
export const compileImageMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, plot, theme } = context;
  const colorField = layer.mark.fields.color;
  const redField = layer.mark.fields.red ?? 'red';
  const greenField = layer.mark.fields.green ?? 'green';
  const blueField = layer.mark.fields.blue ?? 'blue';
  const alphaField = layer.mark.fields.alpha;
  const xPositions: number[] = [];
  const yPositions: number[] = [];
  const rasterRows: { readonly rowIndex: number; readonly x: number; readonly y: number }[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const x = scaleInput(table.value(rowIndex, layer.x.field));
    const y = scaleInput(table.value(rowIndex, layer.y.field));
    if (x === null || y === null) continue;
    const mappedX = xScale.map(x);
    const mappedY = yScale.map(y);
    if (!Number.isFinite(mappedX) || !Number.isFinite(mappedY)) continue;
    xPositions.push(mappedX);
    yPositions.push(mappedY);
    rasterRows.push({ rowIndex, x: mappedX, y: mappedY });
  }
  const cellWidth =
    xScale instanceof BandScale
      ? xScale.bandwidth
      : inferredCellSpan(xPositions, plot.width / Math.max(1, Math.sqrt(table.length)));
  const cellHeight =
    yScale instanceof BandScale
      ? yScale.bandwidth
      : inferredCellSpan(yPositions, plot.height / Math.max(1, Math.sqrt(table.length)));
  const gap = clamp(optionNumber(layer.mark.options, 'cellGap', 0), 0, 8);
  const nodes: SceneNode[] = [];
  for (const { rowIndex, x, y } of sampledItems(rasterRows, context.performance.maxBarMarks)) {
    const explicit =
      colorField === undefined || !table.has(colorField)
        ? null
        : stringValue(table.value(rowIndex, colorField));
    const red = table.has(redField) ? byteChannel(table.value(rowIndex, redField), 0) : 0;
    const green = table.has(greenField) ? byteChannel(table.value(rowIndex, greenField), 0) : 0;
    const blue = table.has(blueField) ? byteChannel(table.value(rowIndex, blueField), 0) : 0;
    const alpha =
      alphaField !== undefined && table.has(alphaField)
        ? clamp(byteChannel(table.value(rowIndex, alphaField), 255) / 255, 0, 1)
        : 1;
    const fill = layer.mark.fill ?? explicit ?? `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:image:${rowIndex}`, rowIndex, 1, {
        x: table.value(rowIndex, layer.x.field) ?? null,
        y: table.value(rowIndex, layer.y.field) ?? null,
        red,
        green,
        blue,
        alpha,
      }),
      x: x - cellWidth / 2 + gap / 2,
      y: y - cellHeight / 2 + gap / 2,
      width: Math.max(1, cellWidth - gap),
      height: Math.max(1, cellHeight - gap),
      fill,
      ...(layer.mark.stroke === undefined && gap <= 0
        ? {}
        : { stroke: layer.mark.stroke ?? theme.colors.background }),
      lineWidth: gap > 0 ? (layer.mark.lineWidth ?? 1) : 0,
      cornerRadius: layer.mark.cornerRadius ?? 0,
    });
  }
  return nodes;
};

interface ViolinGroup {
  readonly name: string;
  readonly rows: readonly number[];
  readonly values: number[];
}

function gaussianKernel(distance: number): number {
  return Math.exp(-0.5 * distance * distance) / Math.sqrt(TAU);
}

function swapNumbers(values: number[], left: number, right: number): void {
  const value = values[left];
  if (value === undefined || values[right] === undefined) return;
  values[left] = values[right];
  values[right] = value;
}

/** Deterministic three-way quickselect that does not allocate a sorted copy. */
function selectNumber(values: number[], target: number): number {
  let left = 0;
  let right = values.length - 1;
  while (left < right) {
    const pivot = values[Math.floor((left + right) / 2)];
    if (pivot === undefined) break;
    let lower = left;
    let cursor = left;
    let upper = right;
    while (cursor <= upper) {
      const value = values[cursor];
      if (value === undefined) break;
      if (value < pivot) {
        swapNumbers(values, lower, cursor);
        lower += 1;
        cursor += 1;
      } else if (value > pivot) {
        swapNumbers(values, cursor, upper);
        upper -= 1;
      } else cursor += 1;
    }
    if (target < lower) right = lower - 1;
    else if (target > upper) left = upper + 1;
    else return values[target] ?? pivot;
  }
  return values[left] ?? 0;
}

function exactMedianInPlace(values: number[]): number {
  const middle = Math.floor(values.length / 2);
  const upper = selectNumber(values, middle);
  return values.length % 2 === 0
    ? (selectNumber(values, Math.max(0, middle - 1)) + upper) / 2
    : upper;
}

function summarizeViolinValues(values: readonly number[]): {
  readonly minimum: number;
  readonly maximum: number;
  readonly mean: number;
  readonly deviation: number;
} | null {
  if (values.length === 0) return null;
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  let mean = 0;
  let squaredDifference = 0;
  values.forEach((value, index) => {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    const count = index + 1;
    const difference = value - mean;
    mean += difference / count;
    squaredDifference += difference * (value - mean);
  });
  return {
    minimum,
    maximum,
    mean,
    deviation: Math.sqrt(squaredDifference / Math.max(1, values.length - 1)),
  };
}

function compileViolin(context: MarkCompileContext): readonly SceneNode[] {
  const { layer, table, xScale, yScale, plot, theme } = context;
  const valueField = layer.mark.fields.value ?? layer.y.field;
  const groupField = layer.mark.fields.group ?? layer.x.field;
  const groups = new Map<string, { rows: number[]; values: number[] }>();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const group = stringValue(table.value(rowIndex, groupField));
    const value = numericDataValue(table.value(rowIndex, valueField));
    if (group === null || value === null) continue;
    const bucket = groups.get(group) ?? { rows: [], values: [] };
    bucket.rows.push(rowIndex);
    bucket.values.push(value);
    groups.set(group, bucket);
  }
  const allViolins: ViolinGroup[] = [...groups].map(([name, values]) => ({ name, ...values }));
  if (allViolins.length === 0) return [];
  const samples = clamp(Math.floor(optionNumber(layer.mark.options, 'samples', 56)), 20, 160);
  const maximumGroups = Math.max(
    1,
    Math.min(
      context.performance.maxBarMarks,
      Math.floor(context.performance.maxLinePoints / (2 * (samples + 1))),
    ),
  );
  const violins = sampledItems(allViolins, maximumGroups);
  const width =
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.78
      : plot.width / Math.max(3, violins.length * 1.6);
  const nodes: SceneNode[] = [];
  violins.forEach((violin, groupIndex) => {
    const summary = summarizeViolinValues(violin.values);
    if (summary === null) return;
    const { minimum, maximum, mean, deviation } = summary;
    const densitySource = sampledItems(
      violin.values,
      Math.max(1, allocatedBudget(context.performance.maxPointMarks, violins.length, groupIndex)),
    );
    const span = maximum - minimum || Math.max(1, Math.abs(mean) * 0.1);
    const bandwidth = Math.max(
      span / samples,
      optionNumber(
        layer.mark.options,
        'bandwidth',
        1.06 * (deviation || span / 4) * violin.values.length ** -0.2,
      ),
    );
    const density = Array.from({ length: samples + 1 }, (_, index) => {
      const value = minimum - bandwidth + ((span + bandwidth * 2) * index) / samples;
      const amount =
        densitySource.reduce(
          (sum, sample) => sum + gaussianKernel((value - sample) / bandwidth),
          0,
        ) /
        (densitySource.length * bandwidth);
      return { value, amount };
    });
    const maxDensity = Math.max(...density.map(({ amount }) => amount), Number.EPSILON);
    const xInput = scaleInput(table.value(violin.rows[0] ?? 0, groupField));
    if (xInput === null) return;
    const center = xScale.map(xInput);
    const right = density.map(({ value, amount }) => ({
      x: center + (amount / maxDensity) * width * 0.5,
      y: yScale.map(value),
    }));
    const left = [...density].reverse().map(({ value, amount }) => ({
      x: center - (amount / maxDensity) * width * 0.5,
      y: yScale.map(value),
    }));
    const fill = layer.mark.fill ?? colorWithOpacity(paletteColor(context, groupIndex), 0.28);
    const stroke = layer.mark.stroke ?? paletteColor(context, groupIndex);
    const representative = violin.rows[0] ?? 0;
    const median = exactMedianInPlace(violin.values);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:violin:${groupIndex}`, representative, 1, {
        group: violin.name,
        count: violin.values.length,
        minimum,
        maximum,
        mean,
        median,
        densitySampleCount: densitySource.length,
      }),
      points: [...right, ...left],
      closed: true,
      fill,
      stroke,
      lineWidth: layer.mark.lineWidth ?? 1.8,
      lineJoin: 'round',
    });
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:violin-median:${groupIndex}`, { zIndex: layer.zIndex + 3 }),
      x1: center - width * 0.18,
      y1: yScale.map(median),
      x2: center + width * 0.18,
      y2: yScale.map(median),
      stroke: mixColor(stroke, theme.colors.text, 0.25),
      lineWidth: 2.2,
      lineCap: 'round',
    });
  });
  return nodes;
}

function boundedGridDimensions(
  requestedX: number,
  requestedY: number,
  maximumCells: number,
): readonly [number, number] {
  const budget = Math.max(4, Math.trunc(maximumCells));
  if (requestedX * requestedY <= budget) return [requestedX, requestedY];
  const scale = Math.sqrt(budget / (requestedX * requestedY));
  let x = Math.max(2, Math.min(requestedX, Math.floor(requestedX * scale)));
  let y = Math.max(2, Math.min(requestedY, Math.floor(budget / x)));
  x = Math.max(2, Math.min(requestedX, Math.floor(budget / y)));
  while (x * y > budget) {
    if (x >= y && x > 2) x -= 1;
    else if (y > 2) y -= 1;
    else break;
  }
  return [x, y];
}

function compileHistogram2d(context: MarkCompileContext, contours = false): readonly SceneNode[] {
  const { layer, table, xScale, yScale, theme } = context;
  const xExtent = table.extent(layer.x.field, layer.x.type === 'temporal');
  const yExtent = table.extent(layer.y.field, layer.y.type === 'temporal');
  if (xExtent === null || yExtent === null) return [];
  const requestedBinsX = clamp(Math.floor(optionNumber(layer.mark.options, 'binsX', 12)), 2, 80);
  const requestedBinsY = clamp(Math.floor(optionNumber(layer.mark.options, 'binsY', 10)), 2, 80);
  const [binsX, binsY] = boundedGridDimensions(
    requestedBinsX,
    requestedBinsY,
    context.performance.maxBarMarks,
  );
  const counts = Array.from({ length: binsY }, () => Array.from({ length: binsX }, () => 0));
  const rows = Array.from({ length: binsY }, () => Array.from({ length: binsX }, () => -1));
  const xSpan = xExtent[1] - xExtent[0] || 1;
  const ySpan = yExtent[1] - yExtent[0] || 1;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const x = numericDataValue(table.value(rowIndex, layer.x.field), layer.x.type === 'temporal');
    const y = numericDataValue(table.value(rowIndex, layer.y.field), layer.y.type === 'temporal');
    if (x === null || y === null) continue;
    const xBin = clamp(Math.floor(((x - xExtent[0]) / xSpan) * binsX), 0, binsX - 1);
    const yBin = clamp(Math.floor(((y - yExtent[0]) / ySpan) * binsY), 0, binsY - 1);
    const rowCounts = counts[yBin];
    const rowRefs = rows[yBin];
    if (rowCounts === undefined || rowRefs === undefined) continue;
    rowCounts[xBin] = (rowCounts[xBin] ?? 0) + 1;
    if ((rowRefs[xBin] ?? -1) < 0) rowRefs[xBin] = rowIndex;
  }
  const maximum = Math.max(1, ...counts.flat());
  const nodes: SceneNode[] = [];
  const centerPoints: Point[][] = Array.from({ length: binsY }, () => []);
  for (let yBin = 0; yBin < binsY; yBin += 1) {
    for (let xBin = 0; xBin < binsX; xBin += 1) {
      const count = counts[yBin]?.[xBin] ?? 0;
      const xStart = xExtent[0] + (xSpan * xBin) / binsX;
      const xEnd = xExtent[0] + (xSpan * (xBin + 1)) / binsX;
      const yStart = yExtent[0] + (ySpan * yBin) / binsY;
      const yEnd = yExtent[0] + (ySpan * (yBin + 1)) / binsY;
      const left = xScale.map(xStart);
      const right = xScale.map(xEnd);
      const top = yScale.map(yEnd);
      const bottom = yScale.map(yStart);
      const ratio = count / maximum;
      const palette = theme.colors.sequential;
      const fill =
        layer.mark.fill ?? palette[Math.round(ratio * (palette.length - 1))] ?? theme.colors.focus;
      const rowIndex = Math.max(0, rows[yBin]?.[xBin] ?? 0);
      const centerRow = centerPoints[yBin];
      if (centerRow !== undefined) {
        centerRow[xBin] = { x: (left + right) / 2, y: (top + bottom) / 2 };
      }
      if (contours) continue;
      if (count === 0 && layer.mark.options.empty !== true) continue;
      nodes.push({
        type: 'rect',
        ...datumBase(context, `${layer.id}:histogram-2d:${xBin}:${yBin}`, rowIndex, 1, {
          xStart,
          xEnd,
          yStart,
          yEnd,
          count,
        }),
        x: Math.min(left, right),
        y: Math.min(top, bottom),
        width: Math.max(1, Math.abs(right - left)),
        height: Math.max(1, Math.abs(bottom - top)),
        fill,
        stroke: layer.mark.stroke ?? colorWithOpacity(theme.colors.background, 0.55),
        lineWidth: layer.mark.lineWidth ?? 0.8,
        cornerRadius: layer.mark.cornerRadius ?? 0,
      });
    }
  }
  if (contours) {
    const levelCount = clamp(Math.floor(optionNumber(layer.mark.options, 'levels', 6)), 2, 16);
    const levels = Array.from(
      { length: levelCount },
      (_, index) => ((index + 1) / (levelCount + 1)) * maximum,
    );
    contourSegments(
      counts,
      centerPoints,
      levels,
      Math.floor(context.performance.maxLinePoints / 2),
    ).forEach((segment, index) => {
      const ratio = segment.levelIndex / Math.max(1, levelCount - 1);
      const palette = theme.colors.sequential;
      const stroke =
        layer.mark.stroke ??
        palette[Math.round(ratio * (palette.length - 1))] ??
        theme.colors.focus;
      nodes.push({
        type: 'path',
        ...datumBase(
          context,
          `${layer.id}:histogram-2d-contour:${segment.levelIndex}:${index}`,
          0,
          1,
          {
            kind: 'density-isoline',
            level: levels[segment.levelIndex] ?? 0,
            minimumCount: 0,
            maximumCount: maximum,
            binsX,
            binsY,
          },
        ),
        points: segment.points,
        closed: false,
        stroke,
        lineWidth: layer.mark.lineWidth ?? 1.8,
        lineCap: 'round',
        lineJoin: 'round',
      });
    });
  }
  return nodes;
}

/** One implementation surface for histogram, box, violin, curve, and bivariate modes. */
export const compileDistributionFamilyMark: MarkCompiler = (context) => {
  const mode = resolveDistributionMode(context.layer.mark.options.mode);
  if (mode === 'boxplot') return compileBoxplotMark(context);
  if (mode === 'violin') return compileViolin(context);
  if (mode === 'curve') return compileDistributionMark(context);
  if (mode === 'histogram-2d') return compileHistogram2d(context);
  if (mode === 'histogram-2d-contour') {
    return compileHistogram2d(context, true);
  }
  return compileHistogramMark(context);
};

function angleValue(value: DataValue, categories: readonly string[], unit: string): number | null {
  const numeric = numericDataValue(value);
  if (numeric !== null) return unit === 'radians' ? numeric : (numeric * Math.PI) / 180;
  const category = stringValue(value);
  if (category === null) return null;
  const index = categories.indexOf(category);
  return index < 0 ? null : -Math.PI / 2 + (index * TAU) / Math.max(1, categories.length);
}

function circlePoint(cx: number, cy: number, radius: number, angle: number): Point {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function arcPoints(cx: number, cy: number, radius: number, start: number, end: number): Point[] {
  const segments = Math.max(4, Math.ceil((Math.abs(end - start) / TAU) * 72));
  return Array.from({ length: segments + 1 }, (_, index) =>
    circlePoint(cx, cy, radius, start + ((end - start) * index) / segments),
  );
}

export const compilePolarMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const mode = optionString(layer.mark.options, 'mode', 'line');
  if (mode === 'radar') return compileRadarMark(context);
  const unit = optionString(layer.mark.options, 'angleUnit', 'degrees');
  const seriesField = layer.mark.fields.series;
  const categoriesSeen = new Set<string>();
  const rowsBySeries = new Map<
    string,
    { readonly angleValue: DataValue; readonly rowIndex: number; readonly value: number }[]
  >();
  let maximum = optionNumber(layer.mark.options, 'max', 0);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const angle = table.value(rowIndex, layer.x.field);
    const category = stringValue(angle);
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (category !== null) categoriesSeen.add(category);
    if (value === null) continue;
    const seriesName =
      seriesField === undefined
        ? 'Series'
        : (stringValue(table.value(rowIndex, seriesField)) ?? 'Series');
    const rows = rowsBySeries.get(seriesName) ?? [];
    rows.push({ angleValue: angle, rowIndex, value });
    rowsBySeries.set(seriesName, rows);
    maximum = Math.max(maximum, value);
  }
  const allCategories = [...categoriesSeen];
  const categoricalAngles =
    allCategories.length > 0 && allCategories.every((value) => Number.isNaN(Number(value)));
  const maximumSpokes = Math.max(
    1,
    Math.min(360, Math.floor(context.performance.maxPointMarks / 4)),
  );
  const categories = categoricalAngles ? sampledItems(allCategories, maximumSpokes) : allCategories;
  if (maximum <= 0) maximum = 1;
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(18, Math.min(plot.width, plot.height) * 0.42);
  const nodes: SceneNode[] = [];
  for (let ring = 1; ring <= 4; ring += 1) {
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:polar-ring:${ring}`, { zIndex: layer.zIndex }),
      points: arcPoints(cx, cy, (radius * ring) / 4, 0, TAU),
      closed: true,
      stroke: colorWithOpacity(theme.colors.grid, 0.78),
      lineWidth: 1,
    });
  }
  const spokes = categoricalAngles
    ? categories.map((value, index) => ({
        value,
        angle: -Math.PI / 2 + (index * TAU) / categories.length,
      }))
    : Array.from({ length: 8 }, (_, index) => ({
        value: String(index * 45),
        angle: (index * TAU) / 8,
      }));
  spokes.forEach((spoke, index) => {
    const edge = circlePoint(cx, cy, radius, spoke.angle);
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:polar-spoke:${index}`, { zIndex: layer.zIndex }),
      x1: cx,
      y1: cy,
      x2: edge.x,
      y2: edge.y,
      stroke: colorWithOpacity(theme.colors.grid, 0.7),
      lineWidth: 1,
    });
    const label = circlePoint(cx, cy, radius + 14, spoke.angle);
    nodes.push(
      textNode(context, `${layer.id}:polar-label:${index}`, label.x, label.y, spoke.value, {
        fill: theme.colors.mutedText,
        size: Math.max(9, theme.typography.fontSize - 2),
      }),
    );
  });
  const rowBudget =
    mode === 'bar'
      ? context.performance.maxBarMarks
      : mode === 'line' || mode === 'area'
        ? Math.min(context.performance.maxPointMarks, context.performance.maxLinePoints)
        : context.performance.maxPointMarks;
  const series = sampledItems([...rowsBySeries.keys()], rowBudget);
  series.forEach((seriesName, seriesIndex) => {
    const availableRows = (rowsBySeries.get(seriesName) ?? []).flatMap((row) => {
      const angle = angleValue(row.angleValue, categories, unit);
      if (angle === null) return [];
      return [
        {
          point: circlePoint(cx, cy, radius * clamp(row.value / maximum, 0, 1), angle),
          angle,
          rowIndex: row.rowIndex,
          value: row.value,
        },
      ];
    });
    availableRows.sort((left, right) => left.angle - right.angle);
    const seriesBudget = allocatedBudget(rowBudget, series.length, seriesIndex);
    const rows =
      mode === 'line' || mode === 'area'
        ? sampledLineItems(availableRows, seriesBudget, ({ value }) => value)
        : sampledItems(availableRows, seriesBudget);
    const color = layer.mark.stroke ?? paletteColor(context, seriesIndex);
    if (mode === 'bar') {
      const barSpan = optionNumber(
        layer.mark.options,
        'barAngle',
        TAU / Math.max(16, rows.length * 2),
      );
      const boundedBarSpan = clamp(barSpan, 0.000001, TAU);
      rows.forEach((row) => {
        const outer = radius * clamp(row.value / maximum, 0, 1);
        nodes.push({
          type: 'path',
          ...datumBase(context, `${layer.id}:polar-bar:${row.rowIndex}`, row.rowIndex),
          points: [
            { x: cx, y: cy },
            ...arcPoints(
              cx,
              cy,
              outer,
              row.angle - boundedBarSpan / 2,
              row.angle + boundedBarSpan / 2,
            ),
          ],
          closed: true,
          fill: layer.mark.fill ?? colorWithOpacity(color, 0.72),
          stroke: color,
          lineWidth: layer.mark.lineWidth ?? 1,
          lineJoin: 'round',
        });
      });
      return;
    }
    if ((mode === 'line' || mode === 'area') && rows.length > 1) {
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:polar-line:${seriesIndex}`, { zIndex: layer.zIndex + 1 }),
        points: rows.map(({ point }) => point),
        closed: layer.mark.options.closed === true,
        ...(mode === 'area' ? { fill: layer.mark.fill ?? colorWithOpacity(color, 0.18) } : {}),
        stroke: color,
        lineWidth: layer.mark.lineWidth ?? 2,
        lineCap: 'round',
        lineJoin: 'round',
      });
    }
    rows.forEach((row) => {
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:polar-point:${row.rowIndex}`, row.rowIndex, 2),
        cx: row.point.x,
        cy: row.point.y,
        radius: layer.mark.radius ?? 4,
        fill: layer.mark.fill ?? color,
        stroke: theme.colors.background,
        lineWidth: 1.2,
      });
    });
  });
  return nodes;
};

export const compileTernaryMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const aField = layer.mark.fields.a ?? layer.x.field;
  const bField = layer.mark.fields.b ?? layer.y.field;
  const cField = layer.mark.fields.c ?? 'c';
  if (!table.has(aField) || !table.has(bField) || !table.has(cField)) return [];
  const height = Math.min(plot.height, (plot.width * Math.sqrt(3)) / 2) * 0.88;
  const width = (height * 2) / Math.sqrt(3);
  const topY = plot.y + (plot.height - height) / 2;
  const left = { x: plot.x + (plot.width - width) / 2, y: topY + height };
  const right = { x: left.x + width, y: left.y };
  const top = { x: plot.x + plot.width / 2, y: topY };
  const nodes: SceneNode[] = [
    {
      type: 'path',
      ...nodeBase(`${layer.id}:ternary-frame`, { zIndex: layer.zIndex }),
      points: [left, right, top],
      closed: true,
      stroke: theme.colors.axis,
      lineWidth: 1.5,
      lineJoin: 'round',
    },
  ];
  for (let step = 1; step < 5; step += 1) {
    const ratio = step / 5;
    const pairs: readonly [Point, Point][] = [
      [
        { x: left.x + (top.x - left.x) * ratio, y: left.y + (top.y - left.y) * ratio },
        { x: right.x + (top.x - right.x) * ratio, y: right.y + (top.y - right.y) * ratio },
      ],
      [
        { x: left.x + (right.x - left.x) * ratio, y: left.y },
        { x: top.x + (right.x - top.x) * ratio, y: top.y + (right.y - top.y) * ratio },
      ],
      [
        { x: right.x + (left.x - right.x) * ratio, y: right.y },
        { x: top.x + (left.x - top.x) * ratio, y: top.y + (left.y - top.y) * ratio },
      ],
    ];
    pairs.forEach(([start, end], index) =>
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:ternary-grid:${step}:${index}`, { zIndex: layer.zIndex }),
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        stroke: colorWithOpacity(theme.colors.grid, 0.65),
        lineWidth: 1,
      }),
    );
  }
  const labels = optionStrings(layer.mark.options.labels);
  [labels[0] ?? aField, labels[1] ?? bField, labels[2] ?? cField].forEach((label, index) => {
    const point = [top, right, left][index] ?? top;
    nodes.push(
      textNode(
        context,
        `${layer.id}:ternary-label:${index}`,
        point.x,
        point.y + (index === 0 ? -15 : 15),
        label,
        {
          fill: theme.colors.mutedText,
          weight: 700,
        },
      ),
    );
  });
  const mode = optionString(layer.mark.options, 'mode', 'scatter');
  const seriesField = layer.mark.fields.series;
  const pointsBySeries = new Map<
    string,
    { readonly point: Point; readonly rowIndex: number; readonly component: number }[]
  >();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const a = numericDataValue(table.value(rowIndex, aField));
    const b = numericDataValue(table.value(rowIndex, bField));
    const c = numericDataValue(table.value(rowIndex, cField));
    if (a === null || b === null || c === null || a < 0 || b < 0 || c < 0) continue;
    const total = a + b + c;
    if (total <= 0) continue;
    const series =
      seriesField === undefined
        ? 'Series'
        : (stringValue(table.value(rowIndex, seriesField)) ?? 'Series');
    const points = pointsBySeries.get(series) ?? [];
    points.push({
      point: {
        x: (a * top.x + b * right.x + c * left.x) / total,
        y: (a * top.y + b * right.y + c * left.y) / total,
      },
      rowIndex,
      component: a / total,
    });
    pointsBySeries.set(series, points);
  }
  const pointBudget =
    mode === 'line'
      ? Math.min(context.performance.maxPointMarks, context.performance.maxLinePoints)
      : context.performance.maxPointMarks;
  const seriesValues = sampledItems([...pointsBySeries.keys()], pointBudget);
  seriesValues.forEach((series, seriesIndex) => {
    const seriesBudget = allocatedBudget(pointBudget, seriesValues.length, seriesIndex);
    const available = pointsBySeries.get(series) ?? [];
    const points =
      mode === 'line'
        ? sampledLineItems(available, seriesBudget, ({ component }) => component)
        : sampledItems(available, seriesBudget);
    const color = layer.mark.stroke ?? paletteColor(context, seriesIndex);
    if (mode === 'line' && points.length > 1)
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:ternary-line:${seriesIndex}`, { zIndex: layer.zIndex + 1 }),
        points: points.map(({ point }) => point),
        closed: layer.mark.options.closed === true,
        stroke: color,
        lineWidth: layer.mark.lineWidth ?? 2,
        lineCap: 'round',
        lineJoin: 'round',
      });
    points.forEach(({ point, rowIndex }) =>
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:ternary-point:${rowIndex}`, rowIndex, 2),
        cx: point.x,
        cy: point.y,
        radius: layer.mark.radius ?? 4.5,
        fill: layer.mark.fill ?? color,
        stroke: theme.colors.background,
        lineWidth: 1.2,
      }),
    );
  });
  return nodes;
};

/** Maps normalized impedance to reflection coefficient coordinates. */
function smithPoint(
  real: number,
  imaginary: number,
  cx: number,
  cy: number,
  radius: number,
): Point {
  const denominator = (real + 1) ** 2 + imaginary ** 2;
  if (denominator <= Number.EPSILON) return { x: cx - radius, y: cy };
  const reflectedReal = (real * real + imaginary * imaginary - 1) / denominator;
  const reflectedImaginary = (2 * imaginary) / denominator;
  return {
    x: cx + reflectedReal * radius,
    y: cy - reflectedImaginary * radius,
  };
}

export const compileSmithMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const realField = layer.mark.fields.real ?? layer.x.field;
  const imaginaryField = layer.mark.fields.imaginary ?? layer.y.field;
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(18, Math.min(plot.width, plot.height) * 0.44);
  const nodes: SceneNode[] = [
    {
      type: 'path',
      ...nodeBase(`${layer.id}:smith-frame`, { zIndex: layer.zIndex }),
      points: arcPoints(cx, cy, radius, 0, TAU),
      closed: true,
      stroke: theme.colors.axis,
      lineWidth: 1.5,
    },
    {
      type: 'line',
      ...nodeBase(`${layer.id}:smith-axis`, { zIndex: layer.zIndex }),
      x1: cx - radius,
      y1: cy,
      x2: cx + radius,
      y2: cy,
      stroke: theme.colors.axis,
      lineWidth: 1,
    },
  ];
  for (const resistance of [0, 0.2, 0.5, 1, 2, 5]) {
    const center = cx + (radius * resistance) / (resistance + 1);
    const ringRadius = radius / (resistance + 1);
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:smith-resistance:${resistance}`, { zIndex: layer.zIndex }),
      points: arcPoints(center, cy, ringRadius, 0, TAU),
      closed: true,
      stroke: colorWithOpacity(theme.colors.grid, 0.72),
      lineWidth: 1,
    });
  }
  for (const reactance of [-5, -2, -1, -0.5, 0.5, 1, 2, 5]) {
    const sampled: Point[] = [];
    for (let index = 0; index <= 80; index += 1) {
      const real = (index / 80) * 12;
      sampled.push(smithPoint(real, reactance, cx, cy, radius));
    }
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:smith-reactance:${reactance}`, { zIndex: layer.zIndex }),
      points: sampled,
      closed: false,
      stroke: colorWithOpacity(theme.colors.grid, 0.72),
      lineWidth: 1,
      lineCap: 'round',
    });
  }
  const mode = optionString(layer.mark.options, 'mode', 'line');
  const seriesField = layer.mark.fields.series;
  const pointsBySeries = new Map<
    string,
    { readonly point: Point; readonly rowIndex: number; readonly magnitude: number }[]
  >();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const real = numericDataValue(table.value(rowIndex, realField));
    const imaginary = numericDataValue(table.value(rowIndex, imaginaryField));
    if (real === null || imaginary === null) continue;
    const name =
      seriesField === undefined
        ? 'Series'
        : (stringValue(table.value(rowIndex, seriesField)) ?? 'Series');
    const points = pointsBySeries.get(name) ?? [];
    points.push({
      point: smithPoint(real, imaginary, cx, cy, radius),
      rowIndex,
      magnitude: Math.hypot(real, imaginary),
    });
    pointsBySeries.set(name, points);
  }
  const pointBudget =
    mode === 'scatter'
      ? context.performance.maxPointMarks
      : Math.min(context.performance.maxPointMarks, context.performance.maxLinePoints);
  const series = sampledItems([...pointsBySeries.keys()], pointBudget);
  series.forEach((name, seriesIndex) => {
    const seriesBudget = allocatedBudget(pointBudget, series.length, seriesIndex);
    const available = pointsBySeries.get(name) ?? [];
    const points =
      mode === 'scatter'
        ? sampledItems(available, seriesBudget)
        : sampledLineItems(available, seriesBudget, ({ magnitude }) => magnitude);
    const color = layer.mark.stroke ?? paletteColor(context, seriesIndex);
    if (mode !== 'scatter' && points.length > 1)
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:smith-line:${seriesIndex}`, { zIndex: layer.zIndex + 1 }),
        points: points.map(({ point }) => point),
        closed: false,
        stroke: color,
        lineWidth: layer.mark.lineWidth ?? 2,
        lineCap: 'round',
        lineJoin: 'round',
      });
    points.forEach(({ point, rowIndex }) =>
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:smith-point:${rowIndex}`, rowIndex, 2),
        cx: point.x,
        cy: point.y,
        radius: layer.mark.radius ?? 4,
        fill: layer.mark.fill ?? color,
        stroke: theme.colors.background,
        lineWidth: 1.2,
      }),
    );
  });
  return nodes;
};

interface MatrixDimension {
  readonly field: string;
  readonly minimum: number;
  readonly maximum: number;
}

export const compileScatterMatrixMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const requested = optionStrings(layer.mark.options.dimensions);
  const candidates =
    requested.length > 0
      ? requested
      : [layer.x.field, layer.y.field, ...Object.values(layer.mark.fields)];
  const dimensions: MatrixDimension[] = candidates
    .filter((field, index, all) => all.indexOf(field) === index && table.has(field))
    .flatMap((field) => {
      const extent = table.extent(field);
      return extent === null ? [] : [{ field, minimum: extent[0], maximum: extent[1] }];
    })
    .slice(0, 8);
  if (dimensions.length < 2) return [];
  const gap = clamp(optionNumber(layer.mark.options, 'gap', 5), 0, 18);
  const cellWidth = plot.width / dimensions.length;
  const cellHeight = plot.height / dimensions.length;
  const colorField = layer.mark.fields.color ?? layer.mark.fields.group;
  const colorKeys =
    colorField === undefined || !table.has(colorField) ? [] : table.unique(colorField);
  const colorIndexByKey = new Map(colorKeys.map((key, index) => [key, index]));
  const valuesByField = new Map<string, Float64Array>();
  for (const dimension of dimensions) {
    const values = new Float64Array(table.length);
    values.fill(Number.NaN);
    for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
      const value = numericDataValue(table.value(rowIndex, dimension.field));
      if (value !== null) values[rowIndex] = value;
    }
    valuesByField.set(dimension.field, values);
  }
  const nodes: SceneNode[] = [];
  const offDiagonalCells = dimensions.length * (dimensions.length - 1);
  let offDiagonalIndex = 0;
  const mapCell = (value: number, dimension: MatrixDimension, start: number, span: number) =>
    start + ((value - dimension.minimum) / (dimension.maximum - dimension.minimum || 1)) * span;
  dimensions.forEach((yDimension, row) => {
    dimensions.forEach((xDimension, column) => {
      const x = plot.x + column * cellWidth + gap / 2;
      const y = plot.y + row * cellHeight + gap / 2;
      const width = Math.max(1, cellWidth - gap);
      const height = Math.max(1, cellHeight - gap);
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:matrix-cell:${row}:${column}`, { zIndex: layer.zIndex }),
        x,
        y,
        width,
        height,
        fill: colorWithOpacity(theme.colors.surface, 0.55),
        stroke: theme.colors.grid,
        lineWidth: 1,
        cornerRadius: 2,
      });
      if (row === column) {
        const bins = Array.from({ length: 10 }, () => 0);
        const dimensionValues = valuesByField.get(xDimension.field);
        if (dimensionValues === undefined) return;
        for (const value of dimensionValues) {
          if (!Number.isFinite(value)) continue;
          const bin = clamp(
            Math.floor(
              ((value - xDimension.minimum) / (xDimension.maximum - xDimension.minimum || 1)) *
                bins.length,
            ),
            0,
            bins.length - 1,
          );
          bins[bin] = (bins[bin] ?? 0) + 1;
        }
        const maximum = Math.max(1, ...bins);
        bins.forEach((count, index) =>
          nodes.push({
            type: 'rect',
            ...nodeBase(`${layer.id}:matrix-hist:${row}:${index}`, { zIndex: layer.zIndex + 1 }),
            x: x + (index / bins.length) * width,
            y: y + height - (count / maximum) * height * 0.72,
            width: Math.max(1, width / bins.length - 1),
            height: Math.max(1, (count / maximum) * height * 0.72),
            fill: colorWithOpacity(context.color, 0.62),
            lineWidth: 0,
            cornerRadius: 1,
          }),
        );
        nodes.push(
          textNode(
            context,
            `${layer.id}:matrix-label:${row}`,
            x + width / 2,
            y + 12,
            xDimension.field,
            {
              fill: theme.colors.mutedText,
              size: Math.max(8, theme.typography.fontSize - 2),
              weight: 700,
            },
          ),
        );
        return;
      }
      const cellBudget = allocatedBudget(
        context.performance.maxPointMarks,
        offDiagonalCells,
        offDiagonalIndex,
      );
      offDiagonalIndex += 1;
      const xValues = valuesByField.get(xDimension.field);
      const yValues = valuesByField.get(yDimension.field);
      if (xValues === undefined || yValues === undefined) return;
      const validRows: number[] = [];
      for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
        if (Number.isFinite(xValues[rowIndex]) && Number.isFinite(yValues[rowIndex])) {
          validRows.push(rowIndex);
        }
      }
      for (const rowIndex of sampledItems(validRows, cellBudget)) {
        const xValue = xValues[rowIndex];
        const yValue = yValues[rowIndex];
        if (xValue === undefined || yValue === undefined) continue;
        const key =
          colorField === undefined ? null : stringValue(table.value(rowIndex, colorField));
        const colorIndex = key === null ? 0 : (colorIndexByKey.get(key) ?? 0);
        nodes.push({
          type: 'circle',
          ...datumBase(
            context,
            `${layer.id}:matrix-point:${row}:${column}:${rowIndex}`,
            rowIndex,
            1,
          ),
          cx: mapCell(xValue, xDimension, x + 3, width - 6),
          cy: y + height - 3 - mapCell(yValue, yDimension, 0, height - 6),
          radius: clamp(layer.mark.radius ?? 2.2, 1, 6),
          fill: layer.mark.fill ?? colorWithOpacity(paletteColor(context, colorIndex), 0.72),
          stroke: theme.colors.background,
          lineWidth: 0.5,
        });
      }
    });
  });
  return nodes;
};

interface CarpetDatum {
  readonly rowIndex: number;
  readonly a: string;
  readonly b: string;
  readonly x: number;
  readonly y: number;
  readonly value: number | null;
}

function boundedGridKeys(
  aKeys: readonly string[],
  bKeys: readonly string[],
  maximumCells: number,
): readonly [readonly string[], readonly string[]] {
  const cellBudget = Math.max(1, Math.trunc(maximumCells));
  if (aKeys.length * bKeys.length <= cellBudget) return [aKeys, bKeys];
  const ratio = aKeys.length / Math.max(1, bKeys.length);
  let aCount = Math.max(1, Math.min(aKeys.length, Math.floor(Math.sqrt(cellBudget * ratio))));
  let bCount = Math.max(1, Math.min(bKeys.length, Math.floor(cellBudget / aCount)));
  aCount = Math.max(1, Math.min(aKeys.length, Math.floor(cellBudget / bCount)));
  while (aCount * bCount > cellBudget) {
    if (aCount >= bCount && aCount > 1) aCount -= 1;
    else if (bCount > 1) bCount -= 1;
    else break;
  }
  return [sampledItems(aKeys, aCount), sampledItems(bKeys, bCount)];
}

export const compileCarpetMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const aField = layer.mark.fields.a ?? layer.x.field;
  const bField = layer.mark.fields.b ?? layer.y.field;
  const xField = layer.mark.fields.x ?? 'x';
  const yField = layer.mark.fields.y ?? 'y';
  const valueField = layer.mark.fields.value;
  if (![aField, bField, xField, yField].every((field) => table.has(field))) return [];
  const data: CarpetDatum[] = [];
  const aGroups = new Map<string, CarpetDatum[]>();
  const bGroups = new Map<string, CarpetDatum[]>();
  const indexed = new Map<string, Map<string, CarpetDatum>>();
  let xMinimum = Number.POSITIVE_INFINITY;
  let xMaximum = Number.NEGATIVE_INFINITY;
  let yMinimum = Number.POSITIVE_INFINITY;
  let yMaximum = Number.NEGATIVE_INFINITY;
  let valueMinimum = Number.POSITIVE_INFINITY;
  let valueMaximum = Number.NEGATIVE_INFINITY;
  let valueCount = 0;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const a = stringValue(table.value(rowIndex, aField));
    const b = stringValue(table.value(rowIndex, bField));
    const x = numericDataValue(table.value(rowIndex, xField));
    const y = numericDataValue(table.value(rowIndex, yField));
    if (a === null || b === null || x === null || y === null) continue;
    const datum: CarpetDatum = {
      rowIndex,
      a,
      b,
      x,
      y,
      value:
        valueField === undefined || !table.has(valueField)
          ? null
          : numericDataValue(table.value(rowIndex, valueField)),
    };
    data.push(datum);
    const aGroup = aGroups.get(a) ?? [];
    aGroup.push(datum);
    aGroups.set(a, aGroup);
    const bGroup = bGroups.get(b) ?? [];
    bGroup.push(datum);
    bGroups.set(b, bGroup);
    const row = indexed.get(a) ?? new Map<string, CarpetDatum>();
    if (!row.has(b)) row.set(b, datum);
    indexed.set(a, row);
    xMinimum = Math.min(xMinimum, x);
    xMaximum = Math.max(xMaximum, x);
    yMinimum = Math.min(yMinimum, y);
    yMaximum = Math.max(yMaximum, y);
    if (datum.value !== null) {
      valueMinimum = Math.min(valueMinimum, datum.value);
      valueMaximum = Math.max(valueMaximum, datum.value);
      valueCount += 1;
    }
  }
  if (data.length === 0) return [];
  const position = (datum: CarpetDatum): Point => ({
    x: plot.x + ((datum.x - xMinimum) / (xMaximum - xMinimum || 1)) * plot.width,
    y: plot.y + plot.height - ((datum.y - yMinimum) / (yMaximum - yMinimum || 1)) * plot.height,
  });
  const nodes: SceneNode[] = [];
  const mode = optionString(layer.mark.options, 'mode', 'base');
  const totalLineBudget = context.performance.maxLinePoints;
  const gridLineBudget = mode === 'contour' ? Math.floor(totalLineBudget / 2) : totalLineBudget;
  const gridAxes = [
    { axis: 'a' as const, groups: aGroups, budget: Math.ceil(gridLineBudget / 2) },
    { axis: 'b' as const, groups: bGroups, budget: Math.floor(gridLineBudget / 2) },
  ];
  for (const { axis, groups, budget } of gridAxes) {
    const candidates = [...groups].map(([key, path], index) => ({ key, path, index }));
    const selected = sampledItems(candidates, Math.floor(budget / 2));
    selected.forEach(({ key, path: unsorted, index }, selectedIndex) => {
      const groupBudget = allocatedBudget(budget, selected.length, selectedIndex);
      const ordered = [...unsorted].sort((left, right) =>
        axis === 'a' ? left.y - right.y : left.x - right.x,
      );
      const path = sampledItems(ordered, groupBudget);
      if (path.length < 2) return;
      const representative = path[0];
      if (representative === undefined) return;
      nodes.push({
        type: 'path',
        ...datumBase(
          context,
          `${layer.id}:carpet-grid:${axis}:${index}`,
          representative.rowIndex,
          0,
          {
            kind: 'carpet-axis',
            axis: axis === 'a' ? aField : bField,
            key,
            logicalCoordinate: axis,
          },
        ),
        points: path.map(position),
        closed: false,
        stroke:
          axis === 'a'
            ? colorWithOpacity(theme.colors.axis, 0.82)
            : colorWithOpacity(theme.colors.grid, 0.9),
        lineWidth: axis === 'a' ? 1.35 : 1,
        lineCap: 'round',
        lineJoin: 'round',
      });
    });
  }
  if (mode === 'contour') {
    if (valueCount > 0) {
      const contourPointBudget = totalLineBudget - gridLineBudget;
      const maximumSegments = Math.floor(contourPointBudget / 2);
      const [aKeys, bKeys] = boundedGridKeys(
        [...aGroups.keys()],
        [...bGroups.keys()],
        Math.min(context.performance.maxBarMarks, Math.max(1, contourPointBudget)),
      );
      const gridValues = bKeys.map((b) => aKeys.map((a) => indexed.get(a)?.get(b)?.value ?? null));
      const gridPoints = bKeys.map((b) =>
        aKeys.map((a) => {
          const datum = indexed.get(a)?.get(b);
          return datum === undefined ? null : position(datum);
        }),
      );
      const levelCount = clamp(Math.floor(optionNumber(layer.mark.options, 'levels', 6)), 2, 16);
      const levels = Array.from(
        { length: levelCount },
        (_, index) =>
          valueMinimum + ((index + 1) / (levelCount + 1)) * (valueMaximum - valueMinimum || 1),
      );
      contourSegments(gridValues, gridPoints, levels, maximumSegments).forEach((segment, index) => {
        const ratio = segment.levelIndex / Math.max(1, levelCount - 1);
        const palette = theme.colors.sequential;
        const stroke =
          layer.mark.stroke ??
          palette[Math.round(ratio * (palette.length - 1))] ??
          theme.colors.focus;
        nodes.push({
          type: 'path',
          ...datumBase(
            context,
            `${layer.id}:carpet-contour:${segment.levelIndex}:${index}`,
            data[0]?.rowIndex ?? 0,
            2,
            {
              kind: 'value-isoline',
              level: levels[segment.levelIndex] ?? valueMinimum,
              minimumValue: valueMinimum,
              maximumValue: valueMaximum,
              valueField: valueField ?? 'value',
            },
          ),
          points: segment.points,
          closed: false,
          stroke,
          lineWidth: layer.mark.lineWidth ?? 1.8,
          lineCap: 'round',
          lineJoin: 'round',
        });
      });
    }
  } else if (mode === 'scatter') {
    sampledItems(data, context.performance.maxPointMarks).forEach((datum) => {
      const point = position(datum);
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:carpet-point:${datum.rowIndex}`, datum.rowIndex, 2),
        cx: point.x,
        cy: point.y,
        radius: layer.mark.radius ?? 4,
        fill: layer.mark.fill ?? context.color,
        stroke: theme.colors.background,
        lineWidth: 1.2,
      });
    });
  }
  return nodes;
};
