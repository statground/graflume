import type { MarkCompileContext, MarkCompiler } from '../compiler/types.js';
import { GraflumeError } from '../core/errors.js';
import { rugStrip, sharedHistogramBins, weightedBoxSummary } from '../data/family-analytics.js';
import { exactStrideSampleIndices } from '../data/sample.js';
import { empiricalDistribution, kernelDensity1d } from '../data/statistics.js';
import {
  brushHeatmap,
  buildHeatmapMatrix,
  layoutItems,
  mapRasterColor,
  projectCarpet,
  projectSmith,
  projectTernary,
  sampleRaster,
  scatterMatrixPlan,
  type CarpetGrid,
  type HeatmapCell,
  type HeatmapColorMode,
  type HeatmapMatrixInput,
  type ImageOrigin,
  type ImageResampling,
  type RasterImage,
} from '../data/specialized-coordinate-analytics.js';
import { BandScale } from '../scale/band.js';
import { nodeBase } from '../scene/factory.js';
import type {
  AnalyticalFamilySceneMetadata,
  CircleNode,
  FamilyDatumInteraction,
  PathNode,
  Point,
  RectNode,
  SceneNode,
  TextNode,
} from '../scene/types.js';
import type { DataRow, DataValue, JsonValue, NormalizedLayerSpec } from '../spec/types.js';
import { resolveDistributionMode } from '../spec/distribution.js';
import { categoricalColor, colorWithOpacity, readableTextColor } from '../theme/color.js';
import { compileHeatmapMark as compileLegacyHeatmapMark } from './advanced.js';
import {
  compileCarpetMark as compileLegacyCarpetMark,
  compileDistributionFamilyMark as compileLegacyDistributionMark,
  compileImageMark as compileLegacyImageMark,
  compileScatterMatrixMark as compileLegacyScatterMatrixMark,
  compileSmithMark as compileLegacySmithMark,
  compileTernaryMark as compileLegacyTernaryMark,
} from './analytical-2d.js';
import { compileItemMark as compileLegacyItemMark } from './series.js';
import { mappedContinuousColor, numericDataValue, scaleInput } from './utils.js';

type JsonObject = Readonly<Record<string, JsonValue>>;

const analyticalFamilies = new Set([
  'distribution',
  'heatmap',
  'image',
  'ternary',
  'smith',
  'scatter-matrix',
  'carpet',
  'item',
]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function object(value: JsonValue | undefined): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function optionNumber(options: JsonObject, key: string, fallback: number): number {
  const value = options[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionString(options: JsonObject, key: string, fallback: string): string {
  const value = options[key];
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function optionChoice<const Choice extends string>(
  options: JsonObject,
  key: string,
  choices: readonly Choice[],
  fallback: Choice,
): Choice {
  const value = options[key];
  if (value === undefined) return fallback;
  if (typeof value === 'string' && choices.includes(value as Choice)) return value as Choice;
  throw new GraflumeError(
    'INVALID_SPEC',
    `$.mark.options.${key} must be one of ${choices.join(', ')}.`,
    { path: `$.mark.options.${key}` },
  );
}

function optionStrings(value: JsonValue | undefined): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
    : [];
}

function optionNumbers(value: JsonValue | undefined): readonly number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
    : [];
}

function stringNumber(value: DataValue): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return value;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  return null;
}

function stringValue(value: DataValue): string | null {
  const resolved = stringNumber(value);
  return resolved === null ? null : String(resolved);
}

function palette(context: MarkCompileContext, index: number, count: number): string {
  return categoricalColor(context.theme, index, Math.max(1, count));
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
    rotation: 0,
  };
}

function datumNode(
  context: MarkCompileContext,
  id: string,
  rowIndex: number,
  tooltip: DataRow,
  zIndex = 1,
  familyInteraction?: FamilyDatumInteraction,
) {
  return nodeBase(id, {
    zIndex: context.layer.zIndex + zIndex,
    opacity: context.layer.mark.opacity,
    interactive: context.performance.enableHitTesting,
    datum: {
      layerId: context.layer.id,
      rowIndex,
      datum: context.table.row(rowIndex),
      tooltip,
      ...(familyInteraction === undefined ? {} : { familyInteraction }),
    },
  });
}

function identity(value: string | number): string {
  return `${typeof value}:${String(value)}`;
}

function familyMode(layer: NormalizedLayerSpec): string {
  const type = layer.mark.type;
  if (type === 'distribution') return resolveDistributionMode(layer.mark.options.mode);
  if (type === 'heatmap') return optionString(layer.mark.options, 'colorMode', 'sequential');
  if (type === 'image') return object(layer.mark.options.raster) === null ? 'rows' : 'raster';
  if (type === 'ternary') return optionString(layer.mark.options, 'policy', 'reject');
  if (type === 'smith') return optionString(layer.mark.options, 'mode', 'reflection');
  if (type === 'scatter-matrix') {
    return `${optionString(layer.mark.options, 'diagonal', 'kde')}/${optionString(layer.mark.options, 'upper', 'scatter')}/${optionString(layer.mark.options, 'lower', 'scatter')}`;
  }
  if (type === 'carpet')
    return object(layer.mark.options.grid) === null ? 'row-grid' : 'projected-grid';
  if (type === 'item') return optionString(layer.mark.options, 'mode', 'waffle');
  return 'default';
}

/** Renderer-neutral metadata for the eight P0 analytical compiler contracts. */
export function resolveAnalyticalFamilySceneMetadata(
  layer: NormalizedLayerSpec,
): AnalyticalFamilySceneMetadata | null {
  if (!analyticalFamilies.has(layer.mark.type)) return null;
  const contracts: Record<string, readonly string[]> = {
    distribution: ['shared-bins', 'weighted-notched-box', 'deterministic-rug-strip'],
    heatmap: ['matrix-pivot', 'irregular-extents', 'missing-pattern', 'linked-brush'],
    image: ['extent-origin', 'nearest-bilinear-bicubic', 'window-colormap-alpha'],
    ternary: [
      'constant-sum',
      'explicit-normalization',
      'component-ticks-format',
      'barycentric-tooltip',
    ],
    smith: [
      'reflection-z-y-s',
      'reference-impedance',
      'impedance-admittance-combined-grid',
      'specialist-labels',
    ],
    'scatter-matrix': ['diagonal-plan', 'upper-lower-plan', 'linked-selection-key'],
    carpet: ['irregular-logical-grid', 'logical-axis-ticks', 'mask', 'dual-coordinate-tooltip'],
    item: ['waffle-isotype', 'partial-units', 'fill-direction'],
  };
  return {
    layerId: layer.id,
    family: layer.mark.type as AnalyticalFamilySceneMetadata['family'],
    mode: familyMode(layer),
    contracts: contracts[layer.mark.type] ?? [],
    interaction: {
      hitTesting: 'datum',
      selectionKey:
        layer.mark.type === 'scatter-matrix' ? 'scatter-matrix' : `${layer.mark.type}:${layer.id}`,
      linked: layer.mark.type === 'heatmap' || layer.mark.type === 'scatter-matrix',
    },
  };
}

interface HistogramObservation {
  readonly value: number;
  readonly weight: number;
  readonly rowIndex: number;
}

function compileSharedHistogram(context: MarkCompileContext): readonly SceneNode[] {
  const { layer, table, xScale, yScale, theme } = context;
  const valueField = layer.mark.fields.value ?? layer.x.field;
  const weightField =
    layer.mark.fields.weight ?? optionString(layer.mark.options, 'weightField', '');
  const seriesField = layer.mark.fields.series ?? layer.mark.fields.group;
  const groups = new Map<string, { label: string; observations: HistogramObservation[] }>();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, valueField), layer.x.type === 'temporal');
    if (value === null) continue;
    const weight = weightField === '' ? 1 : numericDataValue(table.value(rowIndex, weightField));
    if (weight === null || weight < 0) continue;
    const label =
      seriesField === undefined
        ? 'Series'
        : (stringValue(table.value(rowIndex, seriesField)) ?? '');
    const key = `${typeof table.value(rowIndex, seriesField ?? valueField)}:${label}`;
    const group = groups.get(key) ?? { label, observations: [] };
    group.observations.push({ value, weight, rowIndex });
    groups.set(key, group);
  }
  const availableEntries = [...groups.values()].filter(
    ({ observations }) => observations.length > 0,
  );
  if (availableEntries.length === 0) return [];
  const requestedBinCount = clamp(Math.floor(optionNumber(layer.mark.options, 'bins', 10)), 1, 100);
  const seriesLimit = Math.max(1, Math.floor(context.performance.maxBarMarks / requestedBinCount));
  const entries = exactStrideSampleIndices(
    availableEntries.length,
    Math.min(seriesLimit, availableEntries.length),
  ).map((index) => availableEntries[index]!);
  const binCount = Math.min(
    requestedBinCount,
    Math.max(1, Math.floor(context.performance.maxBarMarks / entries.length)),
  );
  const bins = sharedHistogramBins(
    entries.map(({ observations }) => observations),
    binCount,
  );
  const normalization = optionString(layer.mark.options, 'normalization', 'count');
  const cumulative = layer.mark.options.cumulative === true;
  const totals = entries.map(({ observations }) =>
    observations.reduce(
      (sum, observation) => sum + (weightField === '' ? 1 : observation.weight),
      0,
    ),
  );
  const running = entries.map(() => 0);
  const baseline = yScale.map(0);
  const gap = Math.max(0, theme.mark.histogramGap ?? 2);
  const nodes: SceneNode[] = [];
  bins.forEach((bin, binIndex) => {
    const x0 = xScale.map(bin.start);
    const x1 = xScale.map(bin.end);
    if (![x0, x1, baseline].every(Number.isFinite)) return;
    const span = Math.abs(x1 - x0);
    entries.forEach((entry, seriesIndex) => {
      const raw =
        weightField === '' ? (bin.counts[seriesIndex] ?? 0) : (bin.weights[seriesIndex] ?? 0);
      running[seriesIndex] = (running[seriesIndex] ?? 0) + raw;
      const total = totals[seriesIndex] ?? 0;
      const width = Math.max(Number.EPSILON, bin.end - bin.start);
      const normalized =
        normalization === 'probability' || normalization === 'normalized'
          ? total === 0
            ? 0
            : raw / total
          : normalization === 'density'
            ? total === 0
              ? 0
              : raw / total / width
            : raw;
      const value = cumulative
        ? normalization === 'density'
          ? total === 0
            ? 0
            : (running[seriesIndex] ?? 0) / total
          : normalization === 'probability' || normalization === 'normalized'
            ? total === 0
              ? 0
              : (running[seriesIndex] ?? 0) / total
            : (running[seriesIndex] ?? 0)
        : normalized;
      const y = yScale.map(value);
      if (!Number.isFinite(y)) return;
      const sourceRows = entry.observations
        .filter(({ value: observation }) =>
          binIndex === bins.length - 1
            ? observation >= bin.start && observation <= bin.end
            : observation >= bin.start && observation < bin.end,
        )
        .map(({ rowIndex }) => rowIndex);
      if (sourceRows.length === 0) return;
      const groupWidth = span / entries.length;
      const left = Math.min(x0, x1) + seriesIndex * groupWidth;
      nodes.push({
        type: 'rect',
        ...datumNode(context, `${layer.id}:shared-bin:${binIndex}:${seriesIndex}`, sourceRows[0]!, {
          analyticsFamily: 'distribution',
          analyticsMode: 'shared-histogram',
          series: entry.label,
          binStart: bin.start,
          binEnd: bin.end,
          count: bin.counts[seriesIndex] ?? 0,
          weight: bin.weights[seriesIndex] ?? 0,
          value,
          normalization,
          cumulative,
          sourceRowCount: sourceRows.length,
          sourceRowIndices: sourceRows.slice(0, 256),
        }),
        x: left + gap / 2,
        y: Math.min(y, baseline),
        width: Math.max(1, groupWidth - gap),
        height: Math.max(0.5, Math.abs(baseline - y)),
        fill: layer.mark.fill ?? palette(context, seriesIndex, entries.length),
        ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
        lineWidth: layer.mark.lineWidth ?? (layer.mark.stroke === undefined ? 0 : 1),
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
      });
    });
  });
  return nodes;
}

function compileWeightedBox(context: MarkCompileContext): readonly SceneNode[] {
  const { layer, table, xScale, yScale, theme, plot } = context;
  const summaryFields = [
    layer.mark.fields.min ?? layer.mark.fields.low ?? 'min',
    layer.mark.fields.q1 ?? 'q1',
    layer.mark.fields.median ?? layer.y.field,
    layer.mark.fields.q3 ?? 'q3',
    layer.mark.fields.max ?? layer.mark.fields.high ?? 'max',
  ];
  if (summaryFields.every((field) => table.has(field)))
    return compileLegacyDistributionMark(context);
  const valueField = layer.mark.fields.value ?? layer.y.field;
  const weightField =
    layer.mark.fields.weight ?? optionString(layer.mark.options, 'weightField', '');
  const grouped = new Map<
    string,
    {
      x: DataValue;
      observations: Array<{ value: number; weight: number; rowIndex: number }>;
    }
  >();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const x = table.value(rowIndex, layer.x.field);
    const category = stringValue(x);
    const value = numericDataValue(table.value(rowIndex, valueField));
    const weight = weightField === '' ? 1 : numericDataValue(table.value(rowIndex, weightField));
    if (category === null || value === null || weight === null || weight <= 0) continue;
    const group = grouped.get(category) ?? { x, observations: [] };
    group.observations.push({ value, weight, rowIndex });
    grouped.set(category, group);
  }
  const availableGroups = [...grouped];
  const retainedGroups = exactStrideSampleIndices(
    availableGroups.length,
    Math.min(availableGroups.length, Math.max(1, Math.floor(context.performance.maxBarMarks / 3))),
  ).map((index) => availableGroups[index]!);
  const boxWidth = Math.max(
    8,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.58
      : plot.width / Math.max(3, retainedGroups.length * 2),
  );
  const notched = layer.mark.options.notched === true;
  const nodes: SceneNode[] = [];
  retainedGroups.forEach(([category, group], groupIndex) => {
    const summary = weightedBoxSummary(group.observations);
    const input = scaleInput(group.x);
    if (summary === null || input === null) return;
    const x = xScale.map(input);
    const yMinimum = yScale.map(summary.minimum);
    const yQ1 = yScale.map(summary.q1);
    const yMedian = yScale.map(summary.median);
    const yQ3 = yScale.map(summary.q3);
    const yMaximum = yScale.map(summary.maximum);
    const yNotchLow = yScale.map(summary.notch[0]);
    const yNotchHigh = yScale.map(summary.notch[1]);
    if (![x, yMinimum, yQ1, yMedian, yQ3, yMaximum, yNotchLow, yNotchHigh].every(Number.isFinite))
      return;
    const stroke = layer.mark.stroke ?? theme.mark.areaStroke ?? context.color;
    const fill = layer.mark.fill ?? theme.mark.boxplotFill ?? colorWithOpacity(context.color, 0.24);
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:weighted-box-whisker:${groupIndex}`, {
        zIndex: layer.zIndex,
      }),
      x1: x,
      y1: yMinimum,
      x2: x,
      y2: yMaximum,
      stroke,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineCap: theme.mark.lineCap ?? 'round',
    });
    const tooltip: DataRow = {
      analyticsFamily: 'distribution',
      analyticsMode: notched ? 'weighted-notched-box' : 'weighted-box',
      category,
      valueField,
      weightField: weightField === '' ? null : weightField,
      minimum: summary.minimum,
      q1: summary.q1,
      median: summary.median,
      q3: summary.q3,
      maximum: summary.maximum,
      notch: summary.notch,
      effectiveSampleSize: summary.effectiveSampleSize,
      sourceRowCount: summary.sourceRows.length,
      sourceRowIndices: summary.sourceRows.slice(0, 256),
    };
    if (notched) {
      const half = boxWidth / 2;
      const inner = boxWidth * 0.24;
      nodes.push({
        type: 'path',
        ...datumNode(
          context,
          `${layer.id}:weighted-notch:${groupIndex}`,
          summary.sourceRows[0]!,
          tooltip,
        ),
        points: [
          { x: x - half, y: yQ3 },
          { x: x + half, y: yQ3 },
          { x: x + half, y: yNotchHigh },
          { x: x + inner, y: yMedian },
          { x: x + half, y: yNotchLow },
          { x: x + half, y: yQ1 },
          { x: x - half, y: yQ1 },
          { x: x - half, y: yNotchLow },
          { x: x - inner, y: yMedian },
          { x: x - half, y: yNotchHigh },
        ],
        closed: true,
        fill,
        stroke,
        lineWidth: layer.mark.lineWidth ?? 1.8,
        lineJoin: theme.mark.lineJoin ?? 'round',
      });
    } else {
      nodes.push({
        type: 'rect',
        ...datumNode(
          context,
          `${layer.id}:weighted-box:${groupIndex}`,
          summary.sourceRows[0]!,
          tooltip,
        ),
        x: x - boxWidth / 2,
        y: Math.min(yQ1, yQ3),
        width: boxWidth,
        height: Math.max(1, Math.abs(yQ3 - yQ1)),
        fill,
        stroke,
        lineWidth: layer.mark.lineWidth ?? 1.8,
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.boxplotRadius ?? 3,
      });
    }
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:weighted-box-median:${groupIndex}`, {
        zIndex: layer.zIndex + 2,
      }),
      x1: x - boxWidth * 0.28,
      y1: yMedian,
      x2: x + boxWidth * 0.28,
      y2: yMedian,
      stroke,
      lineWidth: layer.mark.lineWidth ?? 2.2,
      lineCap: theme.mark.lineCap ?? 'round',
    });
  });
  return nodes;
}

function compileRugStrip(context: MarkCompileContext, mode: 'rug' | 'strip'): readonly SceneNode[] {
  const { layer, table, xScale, plot, theme } = context;
  const valueField = layer.mark.fields.value ?? layer.x.field;
  const values: number[] = [];
  const sourceRows: number[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, valueField), layer.x.type === 'temporal');
    if (value === null) continue;
    values.push(value);
    sourceRows.push(rowIndex);
  }
  const spread = optionNumber(layer.mark.options, 'spread', mode === 'rug' ? 0 : 20);
  const seed = Math.floor(optionNumber(layer.mark.options, 'seed', 0));
  const points = rugStrip(values, { spread, seed });
  const sampled = exactStrideSampleIndices(points.length, context.performance.maxPointMarks).map(
    (index) => points[index]!,
  );
  const baseline = plot.y + plot.height - 4;
  return sampled.map((point, index): SceneNode => {
    const rowIndex = sourceRows[point.rowIndex]!;
    const x = xScale.map(point.value);
    const y = baseline - point.offset;
    const tooltip: DataRow = {
      analyticsFamily: 'distribution',
      analyticsMode: mode,
      value: point.value,
      offset: point.offset,
      seed,
      selectionKey: `distribution:${layer.id}`,
    };
    if (mode === 'rug') {
      return {
        type: 'line',
        ...datumNode(context, `${layer.id}:rug:${index}:${rowIndex}`, rowIndex, tooltip),
        x1: x,
        y1: baseline - 10,
        x2: x,
        y2: baseline,
        stroke: layer.mark.stroke ?? context.color,
        lineWidth: layer.mark.lineWidth ?? 1.4,
        lineCap: theme.mark.lineCap ?? 'round',
      };
    }
    return {
      type: 'circle',
      ...datumNode(context, `${layer.id}:strip:${index}:${rowIndex}`, rowIndex, tooltip),
      cx: x,
      cy: y,
      radius: layer.mark.radius ?? 3.5,
      fill: layer.mark.fill ?? context.color,
      stroke: theme.colors.background,
      lineWidth: 0.8,
    };
  });
}

export const compileAnalyticalDistributionMark: MarkCompiler = (context) => {
  const mode = resolveDistributionMode(context.layer.mark.options.mode);
  if (mode === 'histogram') {
    const shared =
      context.layer.mark.options.sharedBins === true ||
      context.layer.mark.fields.series !== undefined ||
      context.layer.mark.fields.group !== undefined;
    return shared ? compileSharedHistogram(context) : compileLegacyDistributionMark(context);
  }
  if (mode === 'boxplot') {
    const weightedOrNotched =
      context.layer.mark.options.notched === true ||
      context.layer.mark.fields.weight !== undefined ||
      typeof context.layer.mark.options.weightField === 'string';
    return weightedOrNotched ? compileWeightedBox(context) : compileLegacyDistributionMark(context);
  }
  if (mode === 'rug' || mode === 'strip') return compileRugStrip(context, mode);
  return compileLegacyDistributionMark(context);
};

function numericField(
  table: MarkCompileContext['table'],
  rowIndex: number,
  field: string | undefined,
) {
  return field === undefined || !table.has(field)
    ? undefined
    : (numericDataValue(table.value(rowIndex, field)) ?? undefined);
}

function heatmapKey(row: string | number, column: string | number): string {
  return `${identity(row)}\u0000${identity(column)}`;
}

function heatmapPattern(
  context: MarkCompileContext,
  cell: HeatmapCell,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  stroke: string,
): readonly SceneNode[] {
  if (cell.missingPattern === null) return [];
  const base = `${context.layer.id}:heatmap-missing:${cell.rowIndex}:${cell.columnIndex}`;
  if (cell.missingPattern === 'dots') {
    return [
      {
        type: 'circle',
        ...nodeBase(`${base}:dot`, { zIndex: context.layer.zIndex + 2 }),
        cx: rect.x + rect.width / 2,
        cy: rect.y + rect.height / 2,
        radius: Math.max(1.2, Math.min(3, Math.min(rect.width, rect.height) * 0.1)),
        fill: stroke,
        lineWidth: 0,
      },
    ];
  }
  if (cell.missingPattern === 'stripes') {
    return [-0.25, 0.25].map((offset, index) => ({
      type: 'line' as const,
      ...nodeBase(`${base}:stripe:${index}`, { zIndex: context.layer.zIndex + 2 }),
      x1: rect.x + rect.width * Math.max(0, offset),
      y1: rect.y + rect.height,
      x2: rect.x + rect.width * Math.min(1, 1 + offset),
      y2: rect.y,
      stroke,
      lineWidth: 1,
    }));
  }
  return [
    {
      type: 'line',
      ...nodeBase(`${base}:cross:0`, { zIndex: context.layer.zIndex + 2 }),
      x1: rect.x + 2,
      y1: rect.y + 2,
      x2: rect.x + rect.width - 2,
      y2: rect.y + rect.height - 2,
      stroke,
      lineWidth: 1,
    },
    {
      type: 'line',
      ...nodeBase(`${base}:cross:1`, { zIndex: context.layer.zIndex + 2 }),
      x1: rect.x + rect.width - 2,
      y1: rect.y + 2,
      x2: rect.x + 2,
      y2: rect.y + rect.height - 2,
      stroke,
      lineWidth: 1,
    },
  ];
}

function heatmapLabels(value: JsonValue | undefined): readonly (string | number)[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (!value.every((entry) => typeof entry === 'string' || typeof entry === 'number'))
    throw new GraflumeError('INVALID_SPEC', 'Heatmap matrix labels must be strings or numbers.');
  return value as readonly (string | number)[];
}

function heatmapExtents(
  value: JsonValue | undefined,
  path: string,
): readonly (readonly [number, number])[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    !value.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        entry.every((part) => typeof part === 'number' && Number.isFinite(part)),
    )
  )
    throw new GraflumeError('INVALID_SPEC', `${path} must contain finite [start, end] pairs.`);
  return value as readonly (readonly [number, number])[];
}

function heatmapMatrixOption(context: MarkCompileContext): HeatmapMatrixInput | null {
  const raw = context.layer.mark.options.matrix;
  if (raw === undefined) return null;
  const authored = object(raw);
  const values = authored?.values ?? raw;
  if (!Array.isArray(values) || !values.every(Array.isArray))
    throw new GraflumeError(
      'INVALID_SPEC',
      '$.mark.options.matrix must be a numeric matrix or an object containing values.',
    );
  const rows = heatmapLabels(authored?.rows ?? context.layer.mark.options.matrixRows);
  const columns = heatmapLabels(authored?.columns ?? context.layer.mark.options.matrixColumns);
  const xExtents = heatmapExtents(
    authored?.xExtents ?? context.layer.mark.options.xExtents,
    '$.mark.options.matrix.xExtents',
  );
  const yExtents = heatmapExtents(
    authored?.yExtents ?? context.layer.mark.options.yExtents,
    '$.mark.options.matrix.yExtents',
  );
  return {
    values: values as readonly (readonly (number | null)[])[],
    ...(rows === undefined ? {} : { rows }),
    ...(columns === undefined ? {} : { columns }),
    ...(xExtents === undefined ? {} : { xExtents }),
    ...(yExtents === undefined ? {} : { yExtents }),
  };
}

export const compileAnalyticalHeatmapMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const matrixInput = heatmapMatrixOption(context);
  const analyticalMatrix =
    matrixInput !== null ||
    ['x0', 'x1', 'y0', 'y1'].some((role) => layer.mark.fields[role] !== undefined) ||
    layer.encoding.x2 !== undefined ||
    layer.encoding.y2 !== undefined ||
    object(layer.mark.options.missing) !== null ||
    object(layer.mark.options.brush) !== null ||
    layer.mark.options.colorMode !== undefined ||
    layer.mark.options.color !== undefined ||
    layer.mark.options.rowOrder !== undefined ||
    layer.mark.options.columnOrder !== undefined;
  if (!analyticalMatrix) return compileLegacyHeatmapMark(context);
  const valueField = layer.mark.fields.value ?? 'value';
  if (matrixInput === null && !table.has(valueField)) return compileLegacyHeatmapMark(context);
  const x0Field = layer.mark.fields.x0;
  const x1Field = layer.mark.fields.x1 ?? layer.encoding.x2?.field;
  const y0Field = layer.mark.fields.y0;
  const y1Field = layer.mark.fields.y1 ?? layer.encoding.y2?.field;
  const rows: Array<{
    row: string | number;
    column: string | number;
    value: number | null;
    x0?: number;
    x1?: number;
    y0?: number;
    y1?: number;
  }> = [];
  const sourceByCell = new Map<string, number>();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const column = stringNumber(table.value(rowIndex, layer.x.field));
    const row = stringNumber(table.value(rowIndex, layer.y.field));
    if (row === null || column === null) continue;
    const value = numericDataValue(table.value(rowIndex, valueField));
    rows.push({
      row,
      column,
      value,
      ...(numericField(table, rowIndex, x0Field) === undefined
        ? {}
        : { x0: numericField(table, rowIndex, x0Field)! }),
      ...(numericField(table, rowIndex, x1Field) === undefined
        ? {}
        : { x1: numericField(table, rowIndex, x1Field)! }),
      ...(numericField(table, rowIndex, y0Field) === undefined
        ? {}
        : { y0: numericField(table, rowIndex, y0Field)! }),
      ...(numericField(table, rowIndex, y1Field) === undefined
        ? {}
        : { y1: numericField(table, rowIndex, y1Field)! }),
    });
    sourceByCell.set(heatmapKey(row, column), rowIndex);
  }
  if (matrixInput === null && rows.length === 0) return [];
  const colorMode = optionChoice(
    layer.mark.options,
    layer.mark.options.colorMode === undefined && layer.mark.options.color !== undefined
      ? 'color'
      : 'colorMode',
    ['sequential', 'diverging', 'log', 'symlog', 'quantile'],
    'sequential',
  );
  const missing = object(layer.mark.options.missing);
  const rowOrder = heatmapLabels(layer.mark.options.rowOrder);
  const columnOrder = heatmapLabels(layer.mark.options.columnOrder);
  const matrix = buildHeatmapMatrix(matrixInput ?? rows, {
    ...(rowOrder === undefined || rowOrder.length === 0 ? {} : { rowOrder }),
    ...(columnOrder === undefined || columnOrder.length === 0 ? {} : { columnOrder }),
    color: colorMode as HeatmapColorMode,
    midpoint: optionNumber(layer.mark.options, 'midpoint', 0),
    ...(missing === null
      ? {}
      : {
          missing: {
            ...(typeof missing.color === 'string' ? { color: missing.color } : {}),
            ...(missing.pattern === 'cross' ||
            missing.pattern === 'dots' ||
            missing.pattern === 'stripes'
              ? { pattern: missing.pattern }
              : {}),
          },
        }),
  });
  if (matrixInput !== null) {
    matrix.cells.forEach((cell) => sourceByCell.set(heatmapKey(cell.row, cell.column), 0));
  }
  if (matrix.cells.length === 0) return [];
  const brush = object(layer.mark.options.brush);
  const selected = new Set(
    brush === null
      ? []
      : brushHeatmap(matrix, {
          ...(Array.isArray(brush.rows)
            ? {
                rows: brush.rows.filter(
                  (entry): entry is string | number =>
                    typeof entry === 'string' || typeof entry === 'number',
                ),
              }
            : {}),
          ...(Array.isArray(brush.columns)
            ? {
                columns: brush.columns.filter(
                  (entry): entry is string | number =>
                    typeof entry === 'string' || typeof entry === 'number',
                ),
              }
            : {}),
          ...(optionNumbers(brush.value).length === 2
            ? { value: optionNumbers(brush.value) as readonly [number, number] }
            : {}),
        }).map(({ row, column }) => heatmapKey(row, column)),
  );
  const minimumX = Math.min(...matrix.cells.map(({ x0 }) => x0));
  const maximumX = Math.max(...matrix.cells.map(({ x1 }) => x1));
  const minimumY = Math.min(...matrix.cells.map(({ y0 }) => y0));
  const maximumY = Math.max(...matrix.cells.map(({ y1 }) => y1));
  const mapX = (value: number) =>
    plot.x + ((value - minimumX) / Math.max(Number.EPSILON, maximumX - minimumX)) * plot.width;
  const mapY = (value: number) =>
    plot.y +
    plot.height -
    ((value - minimumY) / Math.max(Number.EPSILON, maximumY - minimumY)) * plot.height;
  const retained = exactStrideSampleIndices(
    matrix.cells.length,
    Math.max(1, context.performance.maxBarMarks),
  ).map((index) => matrix.cells[index]!);
  const nodes: SceneNode[] = [];
  retained.forEach((cell) => {
    const x0 = mapX(cell.x0);
    const x1 = mapX(cell.x1);
    const y0 = mapY(cell.y0);
    const y1 = mapY(cell.y1);
    const rect = {
      x: Math.min(x0, x1) + 0.5,
      y: Math.min(y0, y1) + 0.5,
      width: Math.max(1, Math.abs(x1 - x0) - 1),
      height: Math.max(1, Math.abs(y1 - y0) - 1),
    };
    const key = heatmapKey(cell.row, cell.column);
    const sourceRow = sourceByCell.get(key);
    const brushed = selected.has(key);
    const familyInteraction = {
      kind: 'heatmap-cell',
      row: cell.row,
      column: cell.column,
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      rowCount: matrix.rows.length,
      columnCount: matrix.columns.length,
      value: cell.value,
    } satisfies FamilyDatumInteraction;
    const fill =
      cell.value === null
        ? typeof missing?.color === 'string'
          ? missing.color
          : colorWithOpacity(theme.colors.surface, 0.72)
        : (layer.mark.fill ?? mappedContinuousColor(theme, cell.colorPosition ?? 0.5));
    const tooltip: DataRow = {
      analyticsFamily: 'heatmap',
      analyticsMode: colorMode,
      row: cell.row,
      column: cell.column,
      value: cell.value,
      extent: [cell.x0, cell.x1, cell.y0, cell.y1],
      colorPosition: cell.colorPosition,
      missingPattern: cell.missingPattern,
      brushed,
      selectionKey: `heatmap:${key}`,
    };
    const base =
      sourceRow === undefined && table.length === 0
        ? nodeBase(`${layer.id}:analytic-heatmap:${cell.rowIndex}:${cell.columnIndex}`, {
            zIndex: layer.zIndex,
          })
        : datumNode(
            context,
            `${layer.id}:analytic-heatmap:${cell.rowIndex}:${cell.columnIndex}`,
            sourceRow ?? 0,
            tooltip,
            1,
            familyInteraction,
          );
    nodes.push({
      type: 'rect',
      ...base,
      ...rect,
      fill,
      stroke: brushed ? theme.colors.focus : (layer.mark.stroke ?? theme.colors.background),
      lineWidth: brushed ? 2.5 : (layer.mark.lineWidth ?? 1),
      cornerRadius: layer.mark.cornerRadius ?? 1,
    });
    nodes.push(...heatmapPattern(context, cell, rect, theme.colors.mutedText));
    if (
      cell.value !== null &&
      rect.width >= 32 &&
      rect.height >= 20 &&
      layer.mark.options.labels !== false
    ) {
      nodes.push(
        textNode(
          context,
          `${layer.id}:analytic-heatmap-label:${cell.rowIndex}:${cell.columnIndex}`,
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
          String(cell.value),
          { fill: readableTextColor(fill, '#ffffff', '#0f172a'), size: 10 },
        ),
      );
    }
  });
  return nodes;
};

function rasterOption(value: JsonValue | undefined): RasterImage | null {
  const input = object(value);
  if (input === null) return null;
  const width = input.width;
  const height = input.height;
  const channels = input.channels;
  const values = optionNumbers(input.values);
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof channels !== 'number' ||
    !Array.isArray(input.values) ||
    values.length !== input.values.length
  ) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Image raster requires numeric width, height, channels, and values.',
      {
        path: '$.mark.options.raster',
      },
    );
  }
  const extent = optionNumbers(input.extent);
  const origin: ImageOrigin = input.origin === 'lower' ? 'lower' : 'upper';
  return {
    width,
    height,
    channels,
    values,
    ...(extent.length === 4 ? { extent: extent as readonly [number, number, number, number] } : {}),
    origin,
  };
}

export const compileAnalyticalImageMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme, xScale, yScale } = context;
  const raster = rasterOption(layer.mark.options.raster);
  if (raster === null) return compileLegacyImageMark(context);
  const maximum = Math.max(1, context.performance.maxBarMarks);
  const requestedWidth = clamp(
    Math.floor(optionNumber(layer.mark.options, 'outputWidth', raster.width)),
    1,
    2_048,
  );
  const requestedHeight = clamp(
    Math.floor(optionNumber(layer.mark.options, 'outputHeight', raster.height)),
    1,
    2_048,
  );
  const ratio = Math.min(1, Math.sqrt(maximum / (requestedWidth * requestedHeight)));
  const width = Math.max(1, Math.floor(requestedWidth * ratio));
  const height = Math.max(1, Math.floor(requestedHeight * ratio));
  const extent = raster.extent ?? [0, raster.width, 0, raster.height];
  const resampling = optionString(layer.mark.options, 'resampling', 'nearest') as ImageResampling;
  if (!['nearest', 'bilinear', 'bicubic'].includes(resampling)) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Image resampling must be nearest, bilinear, or bicubic.',
      {
        path: '$.mark.options.resampling',
      },
    );
  }
  const window = optionNumbers(layer.mark.options.window);
  const colormap = optionStrings(layer.mark.options.colormap);
  if (layer.mark.options.window !== undefined && window.length !== 2)
    throw new GraflumeError(
      'INVALID_SPEC',
      'Image raster window must contain two finite numbers.',
      {
        path: '$.mark.options.window',
      },
    );
  if (layer.mark.options.colormap !== undefined && !Array.isArray(layer.mark.options.colormap))
    throw new GraflumeError('INVALID_SPEC', 'Image raster colormap must be an array.', {
      path: '$.mark.options.colormap',
    });
  const alpha = optionNumber(layer.mark.options, 'alpha', 1);
  const mapX = (value: number) => xScale.map(value);
  const mapY = (value: number) => yScale.map(value);
  const imageX0 = mapX(extent[0]);
  const imageX1 = mapX(extent[1]);
  const imageY0 = mapY(extent[2]);
  const imageY1 = mapY(extent[3]);
  if (![imageX0, imageX1, imageY0, imageY1].every(Number.isFinite))
    throw new GraflumeError(
      'INVALID_SPEC',
      'Image raster extent must map through finite quantitative x and y scales.',
      { path: '$.mark.options.raster.extent' },
    );
  const imageBounds = {
    x: Math.min(imageX0, imageX1),
    y: Math.min(imageY0, imageY1),
    width: Math.abs(imageX1 - imageX0),
    height: Math.abs(imageY1 - imageY0),
  };
  const nodes: SceneNode[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const dataX0 = extent[0] + (column / width) * (extent[1] - extent[0]);
      const dataX1 = extent[0] + ((column + 1) / width) * (extent[1] - extent[0]);
      const dataY0 = extent[2] + (row / height) * (extent[3] - extent[2]);
      const dataY1 = extent[2] + ((row + 1) / height) * (extent[3] - extent[2]);
      const x = (dataX0 + dataX1) / 2;
      const y = (dataY0 + dataY1) / 2;
      const channels = sampleRaster(raster, x, y, resampling);
      const rgba = mapRasterColor(channels, {
        ...(window.length === 2 ? { window: window as readonly [number, number] } : {}),
        ...(layer.mark.options.colormap === undefined ? {} : { colormap }),
        alpha,
      });
      const fill = `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
      const id = `${layer.id}:analytic-image:${row}:${column}`;
      const base =
        table.length === 0
          ? nodeBase(id, { zIndex: layer.zIndex })
          : datumNode(context, id, 0, {
              analyticsFamily: 'image',
              analyticsMode: 'raster',
              dataX: x,
              dataY: y,
              channels,
              rgba,
              resampling,
              origin: raster.origin ?? 'upper',
              extent,
              selectionKey: `image:${row}:${column}`,
            });
      nodes.push({
        type: 'rect',
        ...base,
        x: Math.min(mapX(dataX0), mapX(dataX1)),
        y: Math.min(mapY(dataY0), mapY(dataY1)),
        width: Math.max(1, Math.abs(mapX(dataX1) - mapX(dataX0)) + 0.25),
        height: Math.max(1, Math.abs(mapY(dataY1) - mapY(dataY0)) + 0.25),
        fill,
        ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
        lineWidth: layer.mark.stroke === undefined ? 0 : (layer.mark.lineWidth ?? 1),
        cornerRadius: 0,
      });
    }
  }
  if (layer.mark.options.frame === true) {
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:analytic-image-frame`, { zIndex: layer.zIndex + 2 }),
      ...imageBounds,
      stroke: layer.mark.stroke ?? theme.colors.axis,
      lineWidth: layer.mark.lineWidth ?? 1,
      cornerRadius: 0,
    });
  }
  return nodes;
};

function trianglePoint(
  plot: MarkCompileContext['plot'],
  point: { readonly x: number; readonly y: number },
): Point {
  const insetX = Math.min(24, plot.width * 0.05);
  const insetY = Math.min(18, plot.height * 0.05);
  return {
    x: plot.x + insetX + point.x * Math.max(1, plot.width - insetX * 2),
    y: plot.y + insetY + point.y * Math.max(1, plot.height - insetY * 2),
  };
}

function ternaryTickFormatter(
  context: MarkCompileContext,
  target: number,
): (value: number) => string {
  const mode = optionChoice(
    context.layer.mark.options,
    'tickFormat',
    ['auto', 'number', 'percent'],
    'auto',
  );
  const digits = clamp(
    Math.floor(
      optionNumber(context.layer.mark.options, 'tickFractionDigits', mode === 'auto' ? 6 : 1),
    ),
    mode === 'auto' ? 1 : 0,
    6,
  );
  return (value) => {
    if (mode === 'auto') return String(Number(value.toPrecision(digits)));
    const formatted = Number((mode === 'percent' ? (value / target) * 100 : value).toFixed(digits));
    return `${formatted}${mode === 'percent' ? '%' : ''}`;
  };
}

export const compileAnalyticalTernaryMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  if (
    !['sum', 'policy', 'tolerance', 'ticks', 'tickFormat', 'tickFractionDigits'].some(
      (option) => layer.mark.options[option] !== undefined,
    )
  ) {
    return compileLegacyTernaryMark(context);
  }
  const aField = layer.mark.fields.a ?? layer.x.field;
  const bField = layer.mark.fields.b ?? layer.y.field;
  const cField = layer.mark.fields.c ?? 'c';
  const idField = layer.mark.fields.id;
  if (![aField, bField, cField].every((field) => table.has(field))) return [];
  const input: Array<{ a: number; b: number; c: number; id: string }> = [];
  const sourceRows: number[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const a = numericDataValue(table.value(rowIndex, aField));
    const b = numericDataValue(table.value(rowIndex, bField));
    const c = numericDataValue(table.value(rowIndex, cField));
    if (a === null || b === null || c === null) continue;
    input.push({
      a,
      b,
      c,
      id:
        idField === undefined
          ? `ternary-${rowIndex}`
          : (stringValue(table.value(rowIndex, idField)) ?? `ternary-${rowIndex}`),
    });
    sourceRows.push(rowIndex);
  }
  if (input.length === 0) return [];
  const targetSum = optionNumber(layer.mark.options, 'sum', 1);
  const result = projectTernary(input, {
    sum: targetSum,
    policy: optionChoice(layer.mark.options, 'policy', ['reject', 'normalize'], 'reject'),
    tolerance: optionNumber(layer.mark.options, 'tolerance', 1e-9),
    ticks: Math.floor(optionNumber(layer.mark.options, 'ticks', 5)),
    tickFormat: ternaryTickFormatter(context, targetSum),
  });
  const frame = [
    trianglePoint(plot, { x: 0, y: 1 }),
    trianglePoint(plot, { x: 1, y: 1 }),
    trianglePoint(plot, { x: 0.5, y: 1 - Math.sqrt(3) / 2 }),
  ];
  const nodes: SceneNode[] = [
    {
      type: 'path',
      ...nodeBase(`${layer.id}:analytic-ternary-frame`, { zIndex: layer.zIndex }),
      points: frame,
      closed: true,
      stroke: layer.mark.stroke ?? theme.colors.axis,
      fill: colorWithOpacity(theme.colors.surface, 0.2),
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineJoin: theme.mark.lineJoin ?? 'round',
    },
  ];
  const tickCount = Math.max(1, result.axes.a.length - 1);
  for (let index = 1; index < tickCount; index += 1) {
    const ratio = index / tickCount;
    const gridLines = [
      {
        axis: 'a',
        first: { x: 1 - ratio, y: 1 },
        second: { x: (1 - ratio) * 0.5, y: 1 - (1 - ratio) * (Math.sqrt(3) / 2) },
      },
      {
        axis: 'b',
        first: { x: ratio, y: 1 },
        second: { x: (1 + ratio) * 0.5, y: 1 - (1 - ratio) * (Math.sqrt(3) / 2) },
      },
      {
        axis: 'c',
        first: { x: ratio * 0.5, y: 1 - ratio * (Math.sqrt(3) / 2) },
        second: { x: 1 - ratio * 0.5, y: 1 - ratio * (Math.sqrt(3) / 2) },
      },
    ] as const;
    gridLines.forEach(({ axis, first, second }) => {
      const start = trianglePoint(plot, first);
      const end = trianglePoint(plot, second);
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:analytic-ternary-grid:${axis}:${index}`, {
          zIndex: layer.zIndex,
        }),
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        stroke: colorWithOpacity(theme.colors.grid, 0.65),
        lineWidth: 1,
      });
    });
  }
  const seriesField = layer.mark.fields.series ?? layer.mark.fields.group;
  const series = new Map<string, Array<{ point: Point; sourceRow: number; pointIndex: number }>>();
  result.points.forEach((point, pointIndex) => {
    const sourceRow = sourceRows[pointIndex]!;
    const projected = trianglePoint(plot, point);
    const key =
      seriesField === undefined
        ? 'Series'
        : (stringValue(table.value(sourceRow, seriesField)) ?? 'Series');
    const entries = series.get(key) ?? [];
    entries.push({ point: projected, sourceRow, pointIndex });
    series.set(key, entries);
  });
  const retainedPointIndices = new Set(
    exactStrideSampleIndices(
      result.points.length,
      Math.min(result.points.length, context.performance.maxPointMarks),
    ),
  );
  const lineGroups = [...series].filter(([, entries]) => entries.length > 1);
  const retainedLineGroupKeys = new Set(
    exactStrideSampleIndices(
      lineGroups.length,
      Math.min(lineGroups.length, Math.max(1, Math.floor(context.performance.maxLinePoints / 2))),
    ).map((index) => lineGroups[index]![0]),
  );
  [...series].forEach(([name, entries], seriesIndex) => {
    const color = layer.mark.stroke ?? palette(context, seriesIndex, series.size);
    if (
      entries.length > 1 &&
      layer.mark.options.lines !== false &&
      retainedLineGroupKeys.has(name)
    ) {
      const lineBudget = Math.max(
        2,
        Math.floor(context.performance.maxLinePoints / retainedLineGroupKeys.size),
      );
      const lineEntries = exactStrideSampleIndices(
        entries.length,
        Math.min(entries.length, lineBudget),
      ).map((index) => entries[index]!);
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:analytic-ternary-series:${seriesIndex}`, {
          zIndex: layer.zIndex + 1,
        }),
        points: lineEntries.map(({ point }) => point),
        closed: false,
        stroke: color,
        lineWidth: layer.mark.lineWidth ?? 1.6,
        lineCap: theme.mark.lineCap ?? 'round',
        lineJoin: theme.mark.lineJoin ?? 'round',
      });
    }
    entries.forEach(({ point: projected, sourceRow, pointIndex }) => {
      if (!retainedPointIndices.has(pointIndex)) return;
      const point = result.points[pointIndex]!;
      nodes.push({
        type: 'circle',
        ...datumNode(context, `${layer.id}:analytic-ternary-point:${sourceRow}`, sourceRow, {
          analyticsFamily: 'ternary',
          analyticsMode: optionString(layer.mark.options, 'policy', 'reject'),
          id: point.id,
          series: name,
          raw: point.raw,
          normalized: point.normalized,
          projected: [point.x, point.y],
          sum: result.sum,
          detail: point.tooltip,
          selectionKey: `ternary:${point.id}`,
        }),
        cx: projected.x,
        cy: projected.y,
        radius: layer.mark.radius ?? 4.5,
        fill: layer.mark.fill ?? color,
        stroke: theme.colors.background,
        lineWidth: 1.2,
      });
    });
  });
  const labelSize = Math.max(9, theme.typography.fontSize - 1);
  result.axes.a.forEach((tick, index) => {
    const ratio = index / tickCount;
    const a = trianglePoint(plot, {
      x: (1 - ratio) * 0.5,
      y: 1 - (1 - ratio) * (Math.sqrt(3) / 2),
    });
    const b = trianglePoint(plot, {
      x: (1 + ratio) * 0.5,
      y: 1 - (1 - ratio) * (Math.sqrt(3) / 2),
    });
    const c = trianglePoint(plot, { x: ratio, y: 1 });
    nodes.push(
      textNode(context, `${layer.id}:ternary-tick:a:${index}`, a.x - 5, a.y, tick.label, {
        fill: theme.colors.mutedText,
        size: labelSize,
        align: 'right',
      }),
      textNode(
        context,
        `${layer.id}:ternary-tick:b:${index}`,
        b.x + 5,
        b.y,
        result.axes.b[index]!.label,
        {
          fill: theme.colors.mutedText,
          size: labelSize,
          align: 'left',
        },
      ),
      textNode(
        context,
        `${layer.id}:ternary-tick:c:${index}`,
        c.x,
        c.y + 9,
        result.axes.c[index]!.label,
        {
          fill: theme.colors.mutedText,
          size: labelSize,
        },
      ),
    );
  });
  nodes.push(
    textNode(context, `${layer.id}:ternary-axis:a`, frame[0]!.x - 8, frame[0]!.y + 13, aField, {
      fill: theme.colors.mutedText,
      size: labelSize,
      align: 'right',
    }),
    textNode(context, `${layer.id}:ternary-axis:b`, frame[1]!.x + 8, frame[1]!.y + 13, bField, {
      fill: theme.colors.mutedText,
      size: labelSize,
      align: 'left',
    }),
    textNode(context, `${layer.id}:ternary-axis:c`, frame[2]!.x, frame[2]!.y - 12, cField, {
      fill: theme.colors.mutedText,
      size: labelSize,
    }),
  );
  return nodes;
};

function smithPixel(
  plot: MarkCompileContext['plot'],
  radius: number,
  point: { readonly x: number; readonly y: number },
): Point {
  return {
    x: plot.x + plot.width / 2 + point.x * radius,
    y: plot.y + plot.height / 2 - point.y * radius,
  };
}

function circlePath(cx: number, cy: number, radius: number, segments = 72): readonly Point[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function smithReflection(resistance: number, reactance: number): Point {
  const denominator = (resistance + 1) ** 2 + reactance ** 2;
  return {
    x: (resistance ** 2 + reactance ** 2 - 1) / denominator,
    y: (2 * reactance) / denominator,
  };
}

function smithReactancePath(
  plot: MarkCompileContext['plot'],
  radius: number,
  reactance: number,
  admittance: boolean,
): readonly Point[] {
  return Array.from({ length: 65 }, (_, index) => {
    const ratio = index / 64;
    const resistance = ratio === 1 ? 1_000_000 : (12 * ratio) / (1 - ratio);
    const reflected = smithReflection(resistance, reactance);
    return smithPixel(plot, radius, {
      x: admittance ? -reflected.x : reflected.x,
      y: admittance ? -reflected.y : reflected.y,
    });
  });
}

export const compileAnalyticalSmithMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const requestedMode = layer.mark.options.mode;
  if (
    (requestedMode === undefined || requestedMode === 'line' || requestedMode === 'scatter') &&
    layer.mark.options.referenceImpedance === undefined &&
    layer.mark.options.grid === undefined
  ) {
    return compileLegacySmithMark(context);
  }
  const realField = layer.mark.fields.real ?? layer.x.field;
  const imaginaryField = layer.mark.fields.imaginary ?? layer.y.field;
  const idField = layer.mark.fields.id;
  const input: Array<{ real: number; imaginary: number; id: string }> = [];
  const sourceRows: number[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const real = numericDataValue(table.value(rowIndex, realField));
    const imaginary = numericDataValue(table.value(rowIndex, imaginaryField));
    if (real === null || imaginary === null) continue;
    input.push({
      real,
      imaginary,
      id:
        idField === undefined
          ? `smith-${rowIndex}`
          : (stringValue(table.value(rowIndex, idField)) ?? `smith-${rowIndex}`),
    });
    sourceRows.push(rowIndex);
  }
  if (input.length === 0) return [];
  const mode = optionChoice(
    layer.mark.options,
    'mode',
    ['reflection', 'z', 'y', 's'],
    'reflection',
  );
  const result = projectSmith(input, {
    mode,
    referenceImpedance: optionNumber(layer.mark.options, 'referenceImpedance', 50),
    grid: optionChoice(
      layer.mark.options,
      'grid',
      ['impedance', 'admittance', 'combined'],
      'impedance',
    ),
  });
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(18, Math.min(plot.width, plot.height) * 0.45);
  const nodes: SceneNode[] = [
    {
      type: 'path',
      ...nodeBase(`${layer.id}:analytic-smith-frame`, { zIndex: layer.zIndex }),
      points: circlePath(cx, cy, radius),
      closed: true,
      fill: colorWithOpacity(theme.colors.surface, 0.18),
      stroke: layer.mark.stroke ?? theme.colors.axis,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineJoin: 'round',
    },
    {
      type: 'line',
      ...nodeBase(`${layer.id}:analytic-smith-axis`, { zIndex: layer.zIndex }),
      x1: cx - radius,
      y1: cy,
      x2: cx + radius,
      y2: cy,
      stroke: theme.colors.grid,
      lineWidth: 1,
    },
  ];
  const labelSize = Math.max(8, theme.typography.fontSize - 2);
  const gridKinds = [
    ...(result.grid === 'impedance' || result.grid === 'combined'
      ? ([
          {
            id: 'impedance',
            admittance: false,
            radial: result.labels.resistance,
            curved: result.labels.reactance,
          },
        ] as const)
      : []),
    ...(result.grid === 'admittance' || result.grid === 'combined'
      ? ([
          {
            id: 'admittance',
            admittance: true,
            radial: result.labels.conductance,
            curved: result.labels.susceptance,
          },
        ] as const)
      : []),
  ];
  gridKinds.forEach(({ id, admittance, radial, curved }) => {
    const dash = admittance && result.grid === 'combined' ? ([3, 3] as const) : undefined;
    radial.slice(1).forEach(({ value, label }, index) => {
      const center = value / (1 + value);
      const normalizedRadius = 1 / (1 + value);
      const sign = admittance ? -1 : 1;
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:analytic-smith-grid:${id}:radial:${index}`, {
          zIndex: layer.zIndex,
        }),
        points: circlePath(cx + sign * center * radius, cy, normalizedRadius * radius, 48),
        closed: true,
        stroke: colorWithOpacity(theme.colors.grid, admittance ? 0.48 : 0.62),
        lineWidth: 1,
        ...(dash === undefined ? {} : { dash }),
      });
      const axisPosition = smithPixel(plot, radius, {
        x: sign * ((value - 1) / (value + 1)),
        y: 0,
      });
      nodes.push(
        textNode(
          context,
          `${layer.id}:analytic-smith-label:${id}:radial:${index}`,
          axisPosition.x,
          axisPosition.y + (admittance ? -8 : 8),
          label,
          { fill: theme.colors.mutedText, size: labelSize },
        ),
      );
    });
    curved.forEach(({ value, label }, index) => {
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:analytic-smith-grid:${id}:curved:${index}`, {
          zIndex: layer.zIndex,
        }),
        points: smithReactancePath(plot, radius, value, admittance),
        closed: false,
        stroke: colorWithOpacity(theme.colors.grid, admittance ? 0.48 : 0.62),
        lineWidth: 1,
        ...(dash === undefined ? {} : { dash }),
        lineCap: 'round',
        lineJoin: 'round',
      });
      const edge = smithReflection(0, value);
      const labelPosition = smithPixel(plot, radius, {
        x: admittance ? -edge.x : edge.x,
        y: admittance ? -edge.y : edge.y,
      });
      nodes.push(
        textNode(
          context,
          `${layer.id}:analytic-smith-label:${id}:curved:${index}`,
          labelPosition.x,
          labelPosition.y,
          label,
          { fill: theme.colors.mutedText, size: labelSize },
        ),
      );
    });
  });
  const seriesField = layer.mark.fields.series ?? layer.mark.fields.group;
  const grouped = new Map<string, Array<{ sourceRow: number; pointIndex: number; pixel: Point }>>();
  result.points.forEach((point, pointIndex) => {
    const sourceRow = sourceRows[pointIndex]!;
    const series =
      seriesField === undefined
        ? 'Series'
        : (stringValue(table.value(sourceRow, seriesField)) ?? 'Series');
    const entries = grouped.get(series) ?? [];
    entries.push({ sourceRow, pointIndex, pixel: smithPixel(plot, radius, point) });
    grouped.set(series, entries);
  });
  const retainedPointIndices = new Set(
    exactStrideSampleIndices(
      result.points.length,
      Math.min(result.points.length, context.performance.maxPointMarks),
    ),
  );
  const lineGroups = [...grouped].filter(([, entries]) => entries.length > 1);
  const retainedLineGroupKeys = new Set(
    exactStrideSampleIndices(
      lineGroups.length,
      Math.min(lineGroups.length, Math.max(1, Math.floor(context.performance.maxLinePoints / 2))),
    ).map((index) => lineGroups[index]![0]),
  );
  [...grouped].forEach(([series, entries], seriesIndex) => {
    const color = layer.mark.stroke ?? palette(context, seriesIndex, grouped.size);
    if (entries.length > 1 && retainedLineGroupKeys.has(series)) {
      const lineBudget = Math.max(
        2,
        Math.floor(context.performance.maxLinePoints / retainedLineGroupKeys.size),
      );
      const lineEntries = exactStrideSampleIndices(
        entries.length,
        Math.min(entries.length, lineBudget),
      ).map((index) => entries[index]!);
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:analytic-smith-series:${seriesIndex}`, {
          zIndex: layer.zIndex + 1,
        }),
        points: lineEntries.map(({ pixel }) => pixel),
        closed: false,
        stroke: color,
        lineWidth: layer.mark.lineWidth ?? 1.8,
        lineCap: theme.mark.lineCap ?? 'round',
        lineJoin: theme.mark.lineJoin ?? 'round',
      });
    }
    entries.forEach(({ sourceRow, pointIndex, pixel }) => {
      if (!retainedPointIndices.has(pointIndex)) return;
      const point = result.points[pointIndex]!;
      nodes.push({
        type: 'circle',
        ...datumNode(context, `${layer.id}:analytic-smith-point:${sourceRow}`, sourceRow, {
          analyticsFamily: 'smith',
          analyticsMode: result.mode,
          id: point.id,
          series,
          input: [point.input.real, point.input.imaginary],
          normalized:
            point.normalized === null ? null : [point.normalized.real, point.normalized.imaginary],
          openCircuit: point.openCircuit,
          reflection: [point.reflection.real, point.reflection.imaginary],
          magnitude: point.magnitude,
          phase: point.phase,
          referenceImpedance: result.referenceImpedance,
          grid: result.grid,
          detail: point.tooltip,
          selectionKey: `smith:${point.id}`,
        }),
        cx: pixel.x,
        cy: pixel.y,
        radius: layer.mark.radius ?? 4,
        fill: layer.mark.fill ?? color,
        stroke: theme.colors.background,
        lineWidth: 1.2,
      });
    });
  });
  return nodes;
};

interface ScatterDimension {
  readonly field: string;
  readonly minimum: number;
  readonly maximum: number;
  readonly values: ReadonlyMap<number, number>;
}

interface LinkedScatterMatrixBrush {
  readonly xField: string;
  readonly yField: string;
  readonly x: readonly [number, number];
  readonly y: readonly [number, number];
  readonly selectedRows: ReadonlySet<number>;
  readonly selectedRowsAuthored: boolean;
}

function linkedScatterMatrixBrush(value: JsonValue | undefined): LinkedScatterMatrixBrush | null {
  const brush = object(value);
  if (brush === null || typeof brush.xField !== 'string' || typeof brush.yField !== 'string') {
    return null;
  }
  const x = optionNumbers(brush.x);
  const y = optionNumbers(brush.y);
  const selectedRows = optionNumbers(brush.selectedRows).filter(
    (rowIndex) => Number.isInteger(rowIndex) && rowIndex >= 0,
  );
  if (x.length !== 2 || y.length !== 2) return null;
  return {
    xField: brush.xField,
    yField: brush.yField,
    x: [Math.min(x[0]!, x[1]!), Math.max(x[0]!, x[1]!)],
    y: [Math.min(y[0]!, y[1]!), Math.max(y[0]!, y[1]!)],
    selectedRows: new Set(selectedRows),
    selectedRowsAuthored: Array.isArray(brush.selectedRows),
  };
}

function extent(values: readonly number[]): readonly [number, number] {
  if (values.length === 0) return [0, 1];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return minimum === maximum ? [minimum - 0.5, maximum + 0.5] : [minimum, maximum];
}

function matrixValue(
  dimension: ScatterDimension,
  value: number,
  start: number,
  span: number,
): number {
  return (
    start +
    ((value - dimension.minimum) /
      Math.max(Number.EPSILON, dimension.maximum - dimension.minimum)) *
      span
  );
}

function pearson(
  x: ScatterDimension,
  y: ScatterDimension,
): { readonly value: number | null; readonly rows: readonly number[] } {
  const rows = [...x.values.keys()].filter((row) => y.values.has(row));
  if (rows.length < 2) return { value: null, rows };
  const xMean = rows.reduce((sum, row) => sum + x.values.get(row)!, 0) / rows.length;
  const yMean = rows.reduce((sum, row) => sum + y.values.get(row)!, 0) / rows.length;
  let numerator = 0;
  let xSquare = 0;
  let ySquare = 0;
  rows.forEach((row) => {
    const dx = x.values.get(row)! - xMean;
    const dy = y.values.get(row)! - yMean;
    numerator += dx * dy;
    xSquare += dx * dx;
    ySquare += dy * dy;
  });
  const denominator = Math.sqrt(xSquare * ySquare);
  return { value: denominator === 0 ? null : numerator / denominator, rows };
}

function hexagon(cx: number, cy: number, radius: number): readonly Point[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + (index * Math.PI) / 3;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

/** Compiles the helper plan into diagonal, upper, and lower cells with one linked row identity. */
export const compileAnalyticalScatterMatrixMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  if (
    !['variables', 'diagonal', 'upper', 'lower', 'hexColumns', 'linkedBrush'].some(
      (option) => layer.mark.options[option] !== undefined,
    )
  ) {
    return compileLegacyScatterMatrixMark(context);
  }
  const requested = optionStrings(layer.mark.options.variables);
  const dimensions = optionStrings(layer.mark.options.dimensions);
  const automatic = [layer.x.field, layer.y.field, ...Object.values(layer.mark.fields)].filter(
    (field, index, all) => all.indexOf(field) === index && table.has(field),
  );
  const variables = (
    requested.length > 0 ? requested : dimensions.length > 0 ? dimensions : automatic
  ).slice(0, 8);
  const rows = Array.from({ length: table.length }, (_, index) => table.row(index));
  const diagonal = optionChoice(
    layer.mark.options,
    'diagonal',
    ['histogram', 'kde', 'ecdf'],
    'kde',
  );
  const upper = optionChoice(
    layer.mark.options,
    'upper',
    ['scatter', 'hexbin', 'correlation', 'none'],
    'scatter',
  );
  const lower = optionChoice(
    layer.mark.options,
    'lower',
    ['scatter', 'hexbin', 'correlation', 'none'],
    'scatter',
  );
  const plan = scatterMatrixPlan(rows, {
    ...(variables.length > 0 ? { variables } : {}),
    diagonal,
    upper,
    lower,
  });
  const resolved: ScatterDimension[] = plan.variables.flatMap((field) => {
    if (!table.has(field)) return [];
    const values = new Map<number, number>();
    for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
      const value = numericDataValue(table.value(rowIndex, field));
      if (value !== null) values.set(rowIndex, value);
    }
    if (values.size === 0) return [];
    const [minimum, maximum] = extent([...values.values()]);
    return [{ field, minimum, maximum, values }];
  });
  if (resolved.length < 2) return [];
  const byField = new Map(resolved.map((dimension) => [dimension.field, dimension]));
  const cellCount = resolved.length;
  const cellWidth = plot.width / cellCount;
  const cellHeight = plot.height / cellCount;
  const gap = clamp(optionNumber(layer.mark.options, 'gap', 5), 0, 18);
  const linkedBrush = linkedScatterMatrixBrush(layer.mark.options.linkedBrush);
  const linkedBrushRows = new Set<number>();
  if (linkedBrush !== null) {
    if (linkedBrush.selectedRowsAuthored) {
      linkedBrush.selectedRows.forEach((rowIndex) => linkedBrushRows.add(rowIndex));
    } else {
      const brushX = byField.get(linkedBrush.xField);
      const brushY = byField.get(linkedBrush.yField);
      if (brushX !== undefined && brushY !== undefined) {
        for (const [rowIndex, xValue] of brushX.values) {
          const yValue = brushY.values.get(rowIndex);
          if (
            yValue !== undefined &&
            xValue >= linkedBrush.x[0] &&
            xValue <= linkedBrush.x[1] &&
            yValue >= linkedBrush.y[0] &&
            yValue <= linkedBrush.y[1]
          ) {
            linkedBrushRows.add(rowIndex);
          }
        }
      }
    }
  }
  const linkedSelected = (rowIndex: number): boolean =>
    linkedBrush === null || linkedBrushRows.has(rowIndex);
  const nodes: SceneNode[] = [];
  const maximumPoints = Math.max(1, context.performance.maxPointMarks);
  const drawableCells = Math.max(
    1,
    plan.cells.filter(({ kind }) => kind === 'scatter' || kind === 'hexbin').length,
  );
  const perCellBudget = Math.max(1, Math.floor(maximumPoints / drawableCells));
  for (const cell of plan.cells) {
    if (!byField.has(cell.x) || !byField.has(cell.y)) continue;
    const xDimension = byField.get(cell.x)!;
    const yDimension = byField.get(cell.y)!;
    const matrixRow = resolved.findIndex(({ field }) => field === cell.y);
    const matrixColumn = resolved.findIndex(({ field }) => field === cell.x);
    const x = plot.x + matrixColumn * cellWidth + gap / 2;
    const y = plot.y + matrixRow * cellHeight + gap / 2;
    const width = Math.max(1, cellWidth - gap);
    const height = Math.max(1, cellHeight - gap);
    const cellSourceRow =
      [...xDimension.values.keys()].find((rowIndex) => yDimension.values.has(rowIndex)) ?? 0;
    nodes.push({
      type: 'rect',
      ...datumNode(
        context,
        `${layer.id}:analytic-scatter-matrix-cell:${matrixRow}:${matrixColumn}`,
        cellSourceRow,
        {
          analyticsFamily: 'scatter-matrix',
          cellKind: 'interaction-surface',
          matrixX: cell.x,
          matrixY: cell.y,
          xDomain: [xDimension.minimum, xDimension.maximum],
          yDomain: [yDimension.minimum, yDimension.maximum],
          linkedSelectionKey: cell.linkedSelectionKey,
        },
        0,
        {
          kind: 'scatter-matrix-cell',
          xField: cell.x,
          yField: cell.y,
          row: matrixRow,
          column: matrixColumn,
          plot: { x, y, width, height },
          xDomain: [xDimension.minimum, xDimension.maximum],
          yDomain: [yDimension.minimum, yDimension.maximum],
        } satisfies FamilyDatumInteraction,
      ),
      x,
      y,
      width,
      height,
      fill: colorWithOpacity(theme.colors.surface, 0.56),
      stroke: theme.colors.grid,
      lineWidth: 1,
      cornerRadius: 2,
    });
    if (linkedBrush !== null && cell.x === linkedBrush.xField && cell.y === linkedBrush.yField) {
      const brushX0 = matrixValue(xDimension, linkedBrush.x[0], x, width);
      const brushX1 = matrixValue(xDimension, linkedBrush.x[1], x, width);
      const brushY0 = y + height - matrixValue(yDimension, linkedBrush.y[0], 0, height);
      const brushY1 = y + height - matrixValue(yDimension, linkedBrush.y[1], 0, height);
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:analytic-scatter-matrix-linked-brush`, {
          zIndex: layer.zIndex + 3,
          opacity: 0.2,
        }),
        x: Math.min(brushX0, brushX1),
        y: Math.min(brushY0, brushY1),
        width: Math.max(1, Math.abs(brushX1 - brushX0)),
        height: Math.max(1, Math.abs(brushY1 - brushY0)),
        fill: theme.colors.focus,
        stroke: theme.colors.focus,
        lineWidth: 1.5,
        cornerRadius: 1,
      });
    }
    if (cell.kind === 'none') continue;
    if (matrixRow === matrixColumn) {
      const observations = [...xDimension.values].map(([rowIndex, value]) => ({
        value,
        rowIndex,
      }));
      const bins = sharedHistogramBins(
        [observations],
        clamp(Math.floor(optionNumber(layer.mark.options, 'bins', 10)), 2, 32),
      );
      const maximum = Math.max(1, ...bins.map(({ counts }) => counts[0] ?? 0));
      if (cell.kind === 'histogram') {
        bins.forEach((bin, binIndex) => {
          const sourceRows = observations
            .filter(({ value }) =>
              binIndex === bins.length - 1
                ? value >= bin.start && value <= bin.end
                : value >= bin.start && value < bin.end,
            )
            .map(({ rowIndex }) => rowIndex);
          const count = bin.counts[0] ?? 0;
          const selectedCount = sourceRows.filter(linkedSelected).length;
          const base =
            sourceRows.length === 0
              ? nodeBase(`${layer.id}:analytic-scatter-matrix-hist:${matrixRow}:${binIndex}`, {
                  zIndex: layer.zIndex + 1,
                })
              : datumNode(
                  context,
                  `${layer.id}:analytic-scatter-matrix-hist:${matrixRow}:${binIndex}`,
                  sourceRows[0]!,
                  {
                    analyticsFamily: 'scatter-matrix',
                    cellKind: 'histogram',
                    matrixX: cell.x,
                    matrixY: cell.y,
                    binStart: bin.start,
                    binEnd: bin.end,
                    count,
                    sourceRowIndices: sourceRows.slice(0, 256),
                    linkedSelectedRows: selectedCount,
                    linkedSelectionKey: cell.linkedSelectionKey,
                    selectionKey: `scatter-matrix:${cell.x}:${binIndex}`,
                  },
                );
          nodes.push({
            type: 'rect',
            ...base,
            x: x + (binIndex / bins.length) * width,
            y: y + height - (count / maximum) * height * 0.72,
            width: Math.max(1, width / bins.length - 1),
            height: Math.max(1, (count / maximum) * height * 0.72),
            fill: colorWithOpacity(
              context.color,
              linkedBrush === null || selectedCount > 0 ? 0.68 : 0.1,
            ),
            lineWidth: 0,
            cornerRadius: 1,
          });
        });
      } else {
        const weighted = observations.map(({ value, rowIndex }) => ({
          value,
          weight: 1,
          rowIndex,
        }));
        const lineBudget = clamp(
          Math.floor(context.performance.maxLinePoints / Math.max(1, cellCount)),
          2,
          256,
        );
        let bandwidth: number | null = null;
        let points: readonly Point[];
        if (cell.kind === 'ecdf') {
          const empirical = empiricalDistribution(weighted);
          const retained = exactStrideSampleIndices(
            empirical.length,
            Math.min(lineBudget, empirical.length),
          ).map((index) => empirical[index]!);
          points = retained.map((point) => ({
            x: matrixValue(xDimension, point.value, x, width),
            y: y + height - point.probability * height * 0.72,
          }));
        } else {
          const density = kernelDensity1d(weighted, {
            points: lineBudget,
            ...(typeof layer.mark.options.bandwidth === 'number'
              ? { bandwidth: layer.mark.options.bandwidth }
              : {}),
          });
          bandwidth = density.bandwidth;
          const maximumDensity = Math.max(1e-12, ...density.points.map(({ density }) => density));
          const [densityMinimum, densityMaximum] = extent(density.points.map(({ value }) => value));
          points = density.points.map((point) => ({
            x:
              x +
              ((point.value - densityMinimum) /
                Math.max(Number.EPSILON, densityMaximum - densityMinimum)) *
                width,
            y: y + height - (point.density / maximumDensity) * height * 0.72,
          }));
        }
        if (points.length > 1) {
          const sourceRow = observations[0]?.rowIndex;
          const linkedSelectedRows = observations.filter(({ rowIndex }) =>
            linkedSelected(rowIndex),
          ).length;
          const id = `${layer.id}:analytic-scatter-matrix-${cell.kind}:${matrixRow}`;
          const base =
            sourceRow === undefined
              ? nodeBase(id, { zIndex: layer.zIndex + 1 })
              : datumNode(context, id, sourceRow, {
                  analyticsFamily: 'scatter-matrix',
                  cellKind: cell.kind,
                  matrixX: cell.x,
                  matrixY: cell.y,
                  sourceRowCount: observations.length,
                  linkedSelectedRows,
                  ...(bandwidth === null ? {} : { bandwidth }),
                  linkedSelectionKey: cell.linkedSelectionKey,
                  selectionKey: `scatter-matrix:${cell.x}:distribution`,
                });
          nodes.push({
            type: 'path',
            ...base,
            points,
            closed: false,
            stroke: colorWithOpacity(
              layer.mark.stroke ?? context.color,
              linkedBrush === null || linkedSelectedRows > 0 ? 1 : 0.14,
            ),
            lineWidth: layer.mark.lineWidth ?? 1.6,
            lineCap: theme.mark.lineCap ?? 'round',
            lineJoin: theme.mark.lineJoin ?? 'round',
          });
        }
      }
      nodes.push(
        textNode(
          context,
          `${layer.id}:analytic-scatter-matrix-label:${matrixRow}`,
          x + width / 2,
          y + 11,
          cell.x,
          { fill: theme.colors.mutedText, size: Math.max(8, theme.typography.fontSize - 2) },
        ),
      );
      continue;
    }
    const pairedRows = [...xDimension.values.keys()].filter((rowIndex) =>
      yDimension.values.has(rowIndex),
    );
    if (cell.kind === 'correlation') {
      const correlation = pearson(xDimension, yDimension);
      const sourceRow = correlation.rows[0];
      if (sourceRow !== undefined) {
        nodes.push({
          type: 'rect',
          ...datumNode(
            context,
            `${layer.id}:analytic-scatter-matrix-correlation-hit:${matrixRow}:${matrixColumn}`,
            sourceRow,
            {
              analyticsFamily: 'scatter-matrix',
              cellKind: 'correlation',
              matrixX: cell.x,
              matrixY: cell.y,
              correlation: correlation.value,
              sourceRowCount: correlation.rows.length,
              sourceRowIndices: correlation.rows.slice(0, 256),
              linkedSelectedRows: correlation.rows.filter(linkedSelected).length,
              linkedSelectionKey: cell.linkedSelectionKey,
              selectionKey: `scatter-matrix:${cell.x}:${cell.y}:correlation`,
            },
            1,
          ),
          x: x + 1,
          y: y + 1,
          width: Math.max(1, width - 2),
          height: Math.max(1, height - 2),
          fill: colorWithOpacity(context.color, 0.06),
          lineWidth: 0,
          cornerRadius: 2,
        });
      }
      nodes.push(
        textNode(
          context,
          `${layer.id}:analytic-scatter-matrix-correlation:${matrixRow}:${matrixColumn}`,
          x + width / 2,
          y + height / 2,
          correlation.value === null ? 'n/a' : correlation.value.toFixed(2),
          {
            fill: theme.colors.text,
            size: Math.max(10, Math.min(22, Math.min(width, height) * 0.22)),
            weight: 700,
          },
        ),
      );
      continue;
    }
    if (cell.kind === 'hexbin') {
      const columns = clamp(Math.floor(optionNumber(layer.mark.options, 'hexColumns', 7)), 2, 24);
      const rowsCount = Math.max(2, Math.round((columns * height) / Math.max(1, width)));
      const buckets = new Map<string, number[]>();
      pairedRows.forEach((rowIndex) => {
        const column = clamp(
          Math.floor(
            ((xDimension.values.get(rowIndex)! - xDimension.minimum) /
              Math.max(Number.EPSILON, xDimension.maximum - xDimension.minimum)) *
              columns,
          ),
          0,
          columns - 1,
        );
        const row = clamp(
          Math.floor(
            ((yDimension.values.get(rowIndex)! - yDimension.minimum) /
              Math.max(Number.EPSILON, yDimension.maximum - yDimension.minimum)) *
              rowsCount,
          ),
          0,
          rowsCount - 1,
        );
        const key = `${row}:${column}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(rowIndex);
        buckets.set(key, bucket);
      });
      const maximum = Math.max(1, ...[...buckets.values()].map((bucket) => bucket.length));
      const selectedBuckets = exactStrideSampleIndices(
        buckets.size,
        Math.min(perCellBudget, buckets.size),
      ).map((index) => [...buckets][index]!);
      selectedBuckets.forEach(([key, sourceRows]) => {
        const [row, column] = key.split(':').map(Number) as [number, number];
        const cx = x + ((column + 0.5) / columns) * width;
        const cy = y + height - ((row + 0.5) / rowsCount) * height;
        const radius = Math.max(2, Math.min(width / columns, height / rowsCount) * 0.52);
        const selectedCount = sourceRows.filter(linkedSelected).length;
        nodes.push({
          type: 'path',
          ...datumNode(
            context,
            `${layer.id}:analytic-scatter-matrix-hexbin:${matrixRow}:${matrixColumn}:${row}:${column}`,
            sourceRows[0]!,
            {
              analyticsFamily: 'scatter-matrix',
              cellKind: 'hexbin',
              matrixX: cell.x,
              matrixY: cell.y,
              count: sourceRows.length,
              sourceRowIndices: sourceRows.slice(0, 256),
              linkedSelectedRows: selectedCount,
              linkedSelectionKey: cell.linkedSelectionKey,
              selectionKey: `scatter-matrix:${sourceRows[0]!}`,
            },
          ),
          points: hexagon(cx, cy, radius),
          closed: true,
          fill: colorWithOpacity(
            mappedContinuousColor(theme, sourceRows.length / maximum),
            linkedBrush === null || selectedCount > 0 ? 1 : 0.12,
          ),
          stroke: theme.colors.background,
          lineWidth: 0.8,
          lineJoin: 'round',
        });
      });
      continue;
    }
    const sampled = exactStrideSampleIndices(
      pairedRows.length,
      Math.min(perCellBudget, pairedRows.length),
    ).map((index) => pairedRows[index]!);
    sampled.forEach((rowIndex) => {
      const xValue = xDimension.values.get(rowIndex)!;
      const yValue = yDimension.values.get(rowIndex)!;
      const selected = linkedSelected(rowIndex);
      nodes.push({
        type: 'circle',
        ...datumNode(
          context,
          `${layer.id}:analytic-scatter-matrix-point:${matrixRow}:${matrixColumn}:${rowIndex}`,
          rowIndex,
          {
            analyticsFamily: 'scatter-matrix',
            cellKind: 'scatter',
            matrixX: cell.x,
            matrixY: cell.y,
            x: xValue,
            y: yValue,
            linkedSelected: selected,
            linkedSelectionKey: cell.linkedSelectionKey,
            selectionKey: `scatter-matrix:${rowIndex}`,
          },
        ),
        cx: matrixValue(xDimension, xValue, x + 3, width - 6),
        cy: y + height - matrixValue(yDimension, yValue, 3, height - 6),
        radius: clamp(
          (layer.mark.radius ?? 2.2) + (linkedBrush !== null && selected ? 1 : 0),
          1,
          7,
        ),
        fill: colorWithOpacity(
          layer.mark.fill ?? context.color,
          linkedBrush === null ? 0.72 : selected ? 0.94 : 0.1,
        ),
        stroke: theme.colors.background,
        lineWidth: 0.5,
      });
    });
  }
  return nodes;
};

function numericVector(value: JsonValue | undefined, path: string): readonly number[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'number')) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be a numeric array.`, { path });
  }
  return value.map((entry, index) => {
    if (!Number.isFinite(entry as number)) {
      throw new GraflumeError('INVALID_SPEC', `${path}[${index}] must be finite.`, {
        path: `${path}[${index}]`,
      });
    }
    return entry as number;
  });
}

function numericMatrix(value: JsonValue | undefined, path: string): readonly (readonly number[])[] {
  if (!Array.isArray(value)) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be a numeric matrix.`, { path });
  }
  return value.map((row, index) => numericVector(row, `${path}[${index}]`));
}

function maskMatrix(
  value: JsonValue | undefined,
  path: string,
): readonly (readonly boolean[])[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.some((row) => !Array.isArray(row) || row.some((entry) => typeof entry !== 'boolean'))
  ) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be a boolean matrix.`, { path });
  }
  return value.map((row) => [...(row as readonly boolean[])]);
}

function carpetGrid(value: JsonValue | undefined): CarpetGrid | null {
  const grid = object(value);
  if (grid === null) return null;
  const a = numericVector(grid.a, '$.mark.options.grid.a');
  const b = numericVector(grid.b, '$.mark.options.grid.b');
  const x = numericMatrix(grid.x, '$.mark.options.grid.x');
  const y = numericMatrix(grid.y, '$.mark.options.grid.y');
  const mask = maskMatrix(grid.mask, '$.mark.options.grid.mask');
  if (
    mask !== undefined &&
    (mask.length !== b.length || mask.some((row) => row.length !== a.length))
  ) {
    throw new GraflumeError('INVALID_SPEC', 'Carpet mask dimensions must be b by a.', {
      path: '$.mark.options.grid.mask',
    });
  }
  return { a, b, x, y, ...(mask === undefined ? {} : { mask }) };
}

/** Compiles an authored irregular logical grid, its masked cells, and projected interactive points. */
export const compileAnalyticalCarpetMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  const grid = carpetGrid(layer.mark.options.grid);
  if (grid === null) return compileLegacyCarpetMark(context);
  const aField = layer.mark.fields.a ?? layer.x.field;
  const bField = layer.mark.fields.b ?? layer.y.field;
  const idField = layer.mark.fields.id;
  const input: Array<{ a: number; b: number; id: string }> = [];
  const sourceRows: number[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const a = numericDataValue(table.value(rowIndex, aField));
    const b = numericDataValue(table.value(rowIndex, bField));
    if (a === null || b === null) continue;
    input.push({
      a,
      b,
      id:
        idField === undefined
          ? `carpet-${rowIndex}`
          : (stringValue(table.value(rowIndex, idField)) ?? `carpet-${rowIndex}`),
    });
    sourceRows.push(rowIndex);
  }
  const projected = projectCarpet(grid, input);
  const xValues = [...grid.x.flat(), ...projected.points.map(({ projected: point }) => point.x)];
  const yValues = [...grid.y.flat(), ...projected.points.map(({ projected: point }) => point.y)];
  const [xMinimum, xMaximum] = extent(xValues);
  const [yMinimum, yMaximum] = extent(yValues);
  const pixel = (point: { readonly x: number; readonly y: number }): Point => ({
    x: plot.x + ((point.x - xMinimum) / Math.max(Number.EPSILON, xMaximum - xMinimum)) * plot.width,
    y:
      plot.y +
      plot.height -
      ((point.y - yMinimum) / Math.max(Number.EPSILON, yMaximum - yMinimum)) * plot.height,
  });
  const nodes: SceneNode[] = [];
  const bLineBudget = Math.floor(context.performance.maxLinePoints / 2);
  const aLineBudget = context.performance.maxLinePoints - bLineBudget;
  const bLineIndices = exactStrideSampleIndices(
    grid.b.length,
    Math.min(grid.b.length, Math.max(1, Math.floor(bLineBudget / 2))),
  );
  const aLineIndices = exactStrideSampleIndices(
    grid.a.length,
    Math.min(grid.a.length, Math.max(1, Math.floor(aLineBudget / 2))),
  );
  const bLinePointBudget = Math.max(2, Math.floor(bLineBudget / Math.max(1, bLineIndices.length)));
  const aLinePointBudget = Math.max(2, Math.floor(aLineBudget / Math.max(1, aLineIndices.length)));
  for (const bIndex of bLineIndices) {
    const points = exactStrideSampleIndices(
      grid.a.length,
      Math.min(grid.a.length, bLinePointBudget),
    ).map((aIndex) => pixel({ x: grid.x[bIndex]![aIndex]!, y: grid.y[bIndex]![aIndex]! }));
    if (points.length > 1) {
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:analytic-carpet-grid:b:${bIndex}`, { zIndex: layer.zIndex }),
        points,
        closed: false,
        stroke: colorWithOpacity(theme.colors.axis, 0.82),
        lineWidth: 1.3,
        lineCap: theme.mark.lineCap ?? 'round',
        lineJoin: theme.mark.lineJoin ?? 'round',
      });
    }
  }
  for (const aIndex of aLineIndices) {
    const points = exactStrideSampleIndices(
      grid.b.length,
      Math.min(grid.b.length, aLinePointBudget),
    ).map((bIndex) => pixel({ x: grid.x[bIndex]![aIndex]!, y: grid.y[bIndex]![aIndex]! }));
    if (points.length > 1) {
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:analytic-carpet-grid:a:${aIndex}`, { zIndex: layer.zIndex }),
        points,
        closed: false,
        stroke: colorWithOpacity(theme.colors.grid, 0.9),
        lineWidth: 1,
        lineCap: theme.mark.lineCap ?? 'round',
        lineJoin: theme.mark.lineJoin ?? 'round',
      });
    }
  }
  const carpetLabelSize = Math.max(8, theme.typography.fontSize - 2);
  aLineIndices.forEach((aIndex) => {
    const position = pixel({ x: grid.x[0]![aIndex]!, y: grid.y[0]![aIndex]! });
    nodes.push(
      {
        type: 'line',
        ...nodeBase(`${layer.id}:analytic-carpet-tick-line:a:${aIndex}`, {
          zIndex: layer.zIndex + 1,
        }),
        x1: position.x,
        y1: position.y,
        x2: position.x,
        y2: position.y + 4,
        stroke: theme.colors.axis,
        lineWidth: 1,
      },
      textNode(
        context,
        `${layer.id}:analytic-carpet-tick-label:a:${aIndex}`,
        position.x,
        position.y + 11,
        projected.ticks.a[aIndex]!.label,
        { fill: theme.colors.mutedText, size: carpetLabelSize, baseline: 'top' },
      ),
    );
  });
  bLineIndices.forEach((bIndex) => {
    const position = pixel({ x: grid.x[bIndex]![0]!, y: grid.y[bIndex]![0]! });
    nodes.push(
      {
        type: 'line',
        ...nodeBase(`${layer.id}:analytic-carpet-tick-line:b:${bIndex}`, {
          zIndex: layer.zIndex + 1,
        }),
        x1: position.x,
        y1: position.y,
        x2: position.x - 4,
        y2: position.y,
        stroke: theme.colors.axis,
        lineWidth: 1,
      },
      textNode(
        context,
        `${layer.id}:analytic-carpet-tick-label:b:${bIndex}`,
        position.x - 7,
        position.y,
        projected.ticks.b[bIndex]!.label,
        { fill: theme.colors.mutedText, size: carpetLabelSize, align: 'right' },
      ),
    );
  });
  if (aLineIndices.length > 0) {
    const aStart = pixel({ x: grid.x[0]![aLineIndices[0]!]!, y: grid.y[0]![aLineIndices[0]!]! });
    const aEnd = pixel({
      x: grid.x[0]![aLineIndices.at(-1)!]!,
      y: grid.y[0]![aLineIndices.at(-1)!]!,
    });
    nodes.push(
      textNode(
        context,
        `${layer.id}:analytic-carpet-axis-label:a`,
        (aStart.x + aEnd.x) / 2,
        Math.max(aStart.y, aEnd.y) + 24,
        aField,
        { fill: theme.colors.mutedText, size: carpetLabelSize, weight: 700 },
      ),
    );
  }
  if (bLineIndices.length > 0) {
    const bStart = pixel({ x: grid.x[bLineIndices[0]!]![0]!, y: grid.y[bLineIndices[0]!]![0]! });
    const bEnd = pixel({
      x: grid.x[bLineIndices.at(-1)!]![0]!,
      y: grid.y[bLineIndices.at(-1)!]![0]!,
    });
    nodes.push(
      textNode(
        context,
        `${layer.id}:analytic-carpet-axis-label:b`,
        Math.min(bStart.x, bEnd.x) - 18,
        (bStart.y + bEnd.y) / 2,
        bField,
        { fill: theme.colors.mutedText, size: carpetLabelSize, weight: 700 },
      ),
    );
  }
  const maskedCells: Array<readonly [number, number]> = [];
  for (let bIndex = 0; bIndex < grid.b.length - 1; bIndex += 1) {
    for (let aIndex = 0; aIndex < grid.a.length - 1; aIndex += 1) {
      const masked = [
        grid.mask?.[bIndex]?.[aIndex],
        grid.mask?.[bIndex]?.[aIndex + 1],
        grid.mask?.[bIndex + 1]?.[aIndex + 1],
        grid.mask?.[bIndex + 1]?.[aIndex],
      ].some((entry) => entry === false);
      if (!masked) continue;
      maskedCells.push([bIndex, aIndex]);
    }
  }
  const retainedMasks = exactStrideSampleIndices(
    maskedCells.length,
    Math.min(maskedCells.length, context.performance.maxBarMarks),
  ).map((index) => maskedCells[index]!);
  retainedMasks.forEach(([bIndex, aIndex]) => {
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:analytic-carpet-mask:${bIndex}:${aIndex}`, {
        zIndex: layer.zIndex + 1,
      }),
      points: [
        pixel({ x: grid.x[bIndex]![aIndex]!, y: grid.y[bIndex]![aIndex]! }),
        pixel({ x: grid.x[bIndex]![aIndex + 1]!, y: grid.y[bIndex]![aIndex + 1]! }),
        pixel({
          x: grid.x[bIndex + 1]![aIndex + 1]!,
          y: grid.y[bIndex + 1]![aIndex + 1]!,
        }),
        pixel({ x: grid.x[bIndex + 1]![aIndex]!, y: grid.y[bIndex + 1]![aIndex]! }),
      ],
      closed: true,
      fill: colorWithOpacity(theme.colors.mutedText, 0.16),
      stroke: colorWithOpacity(theme.colors.mutedText, 0.44),
      lineWidth: 1,
      lineJoin: 'round',
    });
  });
  const retainedPoints = exactStrideSampleIndices(
    projected.points.length,
    Math.min(projected.points.length, context.performance.maxPointMarks),
  );
  retainedPoints.forEach((pointIndex) => {
    const point = projected.points[pointIndex]!;
    const sourceRow = sourceRows[pointIndex]!;
    const position = pixel(point.projected);
    nodes.push({
      type: 'circle',
      ...datumNode(context, `${layer.id}:analytic-carpet-point:${sourceRow}`, sourceRow, {
        analyticsFamily: 'carpet',
        analyticsMode: 'projected-grid',
        id: point.id,
        logical: [point.logical.a, point.logical.b],
        projected: [point.projected.x, point.projected.y],
        masked: point.masked,
        detail: point.tooltip,
        selectionKey: `carpet:${point.id}`,
      }),
      cx: position.x,
      cy: position.y,
      radius: layer.mark.radius ?? 4.5,
      fill: layer.mark.fill ?? (point.masked ? theme.colors.mutedText : context.color),
      stroke: theme.colors.background,
      lineWidth: 1.2,
      opacity: point.masked ? Math.min(layer.mark.opacity, 0.45) : layer.mark.opacity,
    });
  });
  return nodes;
};

/** Compiles exact waffle/isotype units, including partial units and authored fill direction. */
export const compileAnalyticalItemMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme } = context;
  if (
    !['unit', 'mode', 'partial', 'direction', 'columns'].some(
      (option) => layer.mark.options[option] !== undefined,
    )
  ) {
    return compileLegacyItemMark(context);
  }
  const groups: Array<{ id: string; value: number }> = [];
  const sourceByGroup = new Map<string, number>();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const id = stringValue(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (id === null || value === null || value < 0) continue;
    const existing = groups.find((group) => group.id === id);
    if (existing === undefined) {
      groups.push({ id, value });
      sourceByGroup.set(id, rowIndex);
    } else {
      const index = groups.indexOf(existing);
      groups[index] = { id, value: existing.value + value };
    }
  }
  if (groups.length === 0) return compileLegacyItemMark(context);
  const total = groups.reduce((sum, group) => sum + group.value, 0);
  if (total <= 0) return [];
  const mode = optionChoice(layer.mark.options, 'mode', ['waffle', 'isotype'], 'waffle');
  const partial = optionChoice(
    layer.mark.options,
    'partial',
    ['fraction', 'round', 'floor', 'ceil'],
    'fraction',
  );
  const direction = optionChoice(
    layer.mark.options,
    'direction',
    ['row', 'column', 'row-reverse', 'column-reverse'],
    'row',
  );
  const requestedItems = clamp(
    Math.floor(optionNumber(layer.mark.options, 'items', 100)),
    1,
    context.performance.maxPointMarks,
  );
  const unit =
    typeof layer.mark.options.unit === 'number'
      ? optionNumber(layer.mark.options, 'unit', 1)
      : total / requestedItems;
  const defaultColumns = Math.max(
    1,
    Math.ceil(Math.sqrt((requestedItems * plot.width) / Math.max(1, plot.height))),
  );
  const layout = layoutItems(groups, {
    mode,
    unit,
    columns: Math.floor(optionNumber(layer.mark.options, 'columns', defaultColumns)),
    direction,
    partial,
  });
  if (layout.units.length > context.performance.maxPointMarks) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `Item unit expands to ${layout.units.length} marks, above the ${context.performance.maxPointMarks} mark budget.`,
      { path: '$.mark.options.unit' },
    );
  }
  const rowCount = Math.max(1, ...layout.units.map(({ row }) => row + 1));
  const columnCount = Math.max(1, ...layout.units.map(({ column }) => column + 1));
  const gap = clamp(optionNumber(layer.mark.options, 'gap', 2), 0, 12);
  const cellWidth = plot.width / columnCount;
  const cellHeight = plot.height / rowCount;
  const size = Math.max(1, Math.min(cellWidth, cellHeight) - gap);
  const colorByGroup = new Map(groups.map(({ id }, index) => [id, index]));
  return layout.units.map((item): SceneNode => {
    const rowIndex = sourceByGroup.get(item.group)!;
    const x = plot.x + item.column * cellWidth + (cellWidth - size) / 2;
    const y = plot.y + plot.height - (item.row + 1) * cellHeight + (cellHeight - size) / 2;
    const color =
      layer.mark.fill ?? palette(context, colorByGroup.get(item.group) ?? 0, groups.length);
    const tooltip: DataRow = {
      analyticsFamily: 'item',
      analyticsMode: layout.mode,
      group: item.group,
      amount: item.amount,
      fraction: item.fraction,
      unit: layout.unit,
      total: layout.total,
      accessibleLabel: item.accessibleLabel,
      direction,
      selectionKey: `item:${item.group}`,
    };
    if (layout.mode === 'isotype') {
      return {
        type: 'circle',
        ...datumNode(context, `${layer.id}:analytic-item:${item.index}`, rowIndex, tooltip),
        cx: x + size / 2,
        cy: y + size / 2,
        radius: (size / 2) * Math.sqrt(item.fraction),
        fill: color,
        stroke: theme.colors.background,
        lineWidth: 0.8,
      };
    }
    return {
      type: 'rect',
      ...datumNode(context, `${layer.id}:analytic-item:${item.index}`, rowIndex, tooltip),
      x,
      y,
      width: Math.max(0.5, size * item.fraction),
      height: size,
      fill: color,
      stroke: theme.colors.background,
      lineWidth: 0.8,
      cornerRadius: layer.mark.cornerRadius ?? 1.5,
    };
  });
};
