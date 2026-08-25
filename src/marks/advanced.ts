import type { MarkCompileContext, MarkCompiler } from '../compiler/types.js';
import { exactStrideSampleIndices } from '../data/sample.js';
import { rawBoxSummary, type WeightedObservation } from '../data/statistics.js';
import { createEncodingResolver } from '../encoding/resolve.js';
import type { DataRow, DataValue, JsonValue } from '../spec/types.js';
import { nodeBase } from '../scene/factory.js';
import type { Point, SceneNode, TextNode } from '../scene/types.js';
import { BandScale } from '../scale/band.js';
import { categoricalColor, colorWithOpacity, mixColor, readableTextColor } from '../theme/color.js';
import { compileSeriesAreaMark } from './stacked-series.js';
import {
  mappedContinuousColor,
  numericDataValue,
  scaleInput,
  themedPointFill,
  themedPointStroke,
} from './utils.js';

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOption(value: JsonValue | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: DataValue): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function optionStrings(value: JsonValue | undefined): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

function pointOnCircle(cx: number, cy: number, radius: number, angle: number): Point {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function sampledArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments = 24,
): Point[] {
  const count = Math.max(2, segments);
  return Array.from({ length: count + 1 }, (_, index) => {
    const ratio = index / count;
    return pointOnCircle(cx, cy, radius, startAngle + (endAngle - startAngle) * ratio);
  });
}

function annularSector(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): Point[] {
  const span = Math.abs(endAngle - startAngle);
  const segments = Math.max(4, Math.ceil((span / TAU) * 48));
  return [
    ...sampledArc(cx, cy, outerRadius, startAngle, endAngle, segments),
    ...sampledArc(cx, cy, innerRadius, endAngle, startAngle, segments),
  ];
}

function quadraticPoints(start: Point, control: Point, end: Point, segments = 20): Point[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    };
  });
}

function themeColor(context: MarkCompileContext, index: number, count: number): string {
  return categoricalColor(context.theme, index, count);
}

function textNode(
  id: string,
  x: number,
  y: number,
  text: string,
  context: MarkCompileContext,
  options: {
    readonly fill?: string;
    readonly size?: number;
    readonly weight?: number;
    readonly align?: CanvasTextAlign;
    readonly baseline?: CanvasTextBaseline;
    readonly rotation?: number;
    readonly zIndex?: number;
  } = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: options.zIndex ?? context.layer.zIndex + 2 }),
    x,
    y,
    text,
    fill: options.fill ?? context.theme.colors.text,
    fontFamily: context.theme.typography.fontFamily,
    fontSize: options.size ?? context.theme.typography.fontSize,
    fontWeight: options.weight ?? 500,
    align: options.align ?? 'center',
    baseline: options.baseline ?? 'middle',
    rotation: options.rotation ?? 0,
  };
}

function datumBase(
  context: MarkCompileContext,
  id: string,
  rowIndex: number,
  zIndex = 0,
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

export const compileRadarMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme, performance } = context;
  const seriesField = layer.mark.fields.series;
  const maxOption = finiteOption(layer.mark.options.max, Number.NaN);
  let maximum = Number.isFinite(maxOption) && maxOption > 0 ? maxOption : 0;
  const categoryNames: string[] = [];
  const categorySet = new Set<string>();
  const seriesNames: string[] = [];
  const seriesRows = new Map<
    string,
    Map<string, { readonly value: number; readonly rowIndex: number }>
  >();

  // Build the category/series matrix in one pass. The previous implementation
  // rescanned the full table once per series, which became quadratic when both
  // fields were high-cardinality.
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const category = stringValue(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const seriesName =
      seriesField === undefined ? 'Series' : stringValue(table.value(rowIndex, seriesField));
    if (category === null || value === null || seriesName === null) continue;
    maximum = Math.max(maximum, value);
    if (!categorySet.has(category)) {
      categorySet.add(category);
      categoryNames.push(category);
    }
    let rows = seriesRows.get(seriesName);
    if (rows === undefined) {
      rows = new Map();
      seriesRows.set(seriesName, rows);
      seriesNames.push(seriesName);
    }
    rows.set(category, { value, rowIndex });
  }
  if (categoryNames.length < 3 || seriesNames.length === 0) return [];
  if (maximum <= 0) maximum = 1;

  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(16, Math.min(plot.width, plot.height) * 0.34);
  const nodes: SceneNode[] = [];
  const rings = clamp(Math.floor(finiteOption(layer.mark.options.rings, 5)), 1, 8);
  const linePointBudget = Math.max(1, Math.floor(performance.maxLinePoints));
  const balancedSeriesLimit = Math.max(1, Math.floor(Math.sqrt(linePointBudget)));
  const plannedSeriesCount = Math.min(seriesNames.length, balancedSeriesLimit);
  const categoryLimit = Math.floor(linePointBudget / (rings + plannedSeriesCount));
  if (categoryLimit < 3) return [];
  const categories = categoryNames.slice(0, Math.min(categoryNames.length, categoryLimit));
  const seriesLimit = Math.max(0, Math.floor(linePointBudget / categories.length) - rings);
  const retainedSeries = seriesNames.slice(0, seriesLimit);
  if (retainedSeries.length === 0) return [];

  for (let ring = 1; ring <= rings; ring += 1) {
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:radar-grid:${ring}`, { zIndex: layer.zIndex }),
      points: categories.map((_, index) =>
        pointOnCircle(
          cx,
          cy,
          (radius * ring) / rings,
          -Math.PI / 2 + (index * TAU) / categories.length,
        ),
      ),
      closed: true,
      stroke: colorWithOpacity(theme.colors.grid, ring === rings ? 0.9 : 0.7),
      lineWidth: ring === rings ? 1.2 : 1,
      lineJoin: 'round',
    });
  }

  categories.forEach((category, index) => {
    const angle = -Math.PI / 2 + (index * TAU) / categories.length;
    const edge = pointOnCircle(cx, cy, radius, angle);
    const label = pointOnCircle(cx, cy, radius + 18, angle);
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:radar-axis:${index}`, { zIndex: layer.zIndex }),
      x1: cx,
      y1: cy,
      x2: edge.x,
      y2: edge.y,
      stroke: theme.colors.grid,
      lineWidth: 1,
      lineCap: 'round',
    });
    nodes.push(
      textNode(`${layer.id}:radar-label:${index}`, label.x, label.y, category, context, {
        fill: theme.colors.mutedText,
        size: Math.max(9, theme.typography.fontSize - 1),
        weight: 600,
      }),
    );
  });

  let renderedPointMarks = 0;
  retainedSeries.forEach((seriesName, seriesIndex) => {
    const rows = seriesRows.get(seriesName);
    if (rows === undefined) return;
    const color = themeColor(context, seriesIndex, retainedSeries.length);
    const points = categories.map((category, index) => {
      const ratio = clamp((rows.get(category)?.value ?? 0) / maximum, 0, 1);
      return pointOnCircle(
        cx,
        cy,
        radius * ratio,
        -Math.PI / 2 + (index * TAU) / categories.length,
      );
    });
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:radar-series:${seriesIndex}`, {
        zIndex: layer.zIndex + 1,
        opacity: layer.mark.opacity,
      }),
      points,
      closed: true,
      fill: colorWithOpacity(layer.mark.fill ?? color, 0.2),
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 2.25,
      lineJoin: 'round',
    });
    points.forEach((point, index) => {
      if (renderedPointMarks >= performance.maxPointMarks) return;
      const row = rows.get(categories[index] ?? '');
      if (row === undefined) return;
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:radar-point:${seriesIndex}:${index}`, row.rowIndex, 2),
        cx: point.x,
        cy: point.y,
        radius: layer.mark.radius ?? 3.6,
        fill: theme.colors.background,
        stroke: layer.mark.stroke ?? color,
        lineWidth: 2,
      });
      renderedPointMarks += 1;
    });
  });

  return nodes;
};

interface HierarchyItem {
  readonly id: string;
  readonly parent: string | null;
  readonly label: string;
  readonly rowIndex: number;
  readonly value: number;
}

function hierarchyItems(context: MarkCompileContext): HierarchyItem[] {
  const { layer, table } = context;
  const idField = layer.mark.fields.id ?? layer.x.field;
  const parentField = layer.mark.fields.parent ?? layer.y.field;
  const labelField = layer.mark.fields.label ?? idField;
  const valueField = layer.mark.fields.value;
  const items: HierarchyItem[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const id = stringValue(table.value(rowIndex, idField));
    if (id === null || id === '') continue;
    const parentRaw = stringValue(table.value(rowIndex, parentField));
    const label = stringValue(table.value(rowIndex, labelField)) ?? id;
    const value =
      valueField === undefined
        ? (numericDataValue(table.value(rowIndex, layer.y.field)) ?? 1)
        : (numericDataValue(table.value(rowIndex, valueField)) ?? 1);
    items.push({
      id,
      parent: parentRaw === null || parentRaw === '' || parentRaw === id ? null : parentRaw,
      label,
      rowIndex,
      value: Math.max(0, value),
    });
  }
  return items;
}

function hierarchyDepths(items: readonly HierarchyItem[]): Map<string, number> {
  const byId = new Map(items.map((item) => [item.id, item]));
  const depths = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    const known = depths.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const item = byId.get(id);
    const depth =
      item?.parent === null || item?.parent === undefined ? 0 : depthOf(item.parent) + 1;
    visiting.delete(id);
    depths.set(id, depth);
    return depth;
  };
  items.forEach((item) => depthOf(item.id));
  return depths;
}

export const compileTreeMark: MarkCompiler = (context) => {
  const { layer, plot, theme } = context;
  const items = hierarchyItems(context);
  if (items.length === 0) return [];
  const depths = hierarchyDepths(items);
  const maxDepth = Math.max(0, ...depths.values());
  const levels = Array.from({ length: maxDepth + 1 }, () => [] as HierarchyItem[]);
  items.forEach((item) => levels[depths.get(item.id) ?? 0]?.push(item));
  const orientation = layer.mark.options.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  const positions = new Map<string, Point>();

  levels.forEach((level, depth) => {
    level.forEach((item, index) => {
      const across = (index + 1) / (level.length + 1);
      const down = maxDepth === 0 ? 0.5 : depth / maxDepth;
      positions.set(
        item.id,
        orientation === 'horizontal'
          ? {
              x: plot.x + plot.width * (0.08 + down * 0.84),
              y: plot.y + plot.height * across,
            }
          : {
              x: plot.x + plot.width * across,
              y: plot.y + plot.height * (0.08 + down * 0.84),
            },
      );
    });
  });

  const nodes: SceneNode[] = [];
  items.forEach((item) => {
    const child = positions.get(item.id);
    const parent = item.parent === null ? undefined : positions.get(item.parent);
    if (child === undefined || parent === undefined) return;
    const elbow: Point =
      orientation === 'horizontal'
        ? { x: (parent.x + child.x) / 2, y: parent.y }
        : { x: parent.x, y: (parent.y + child.y) / 2 };
    const elbow2: Point =
      orientation === 'horizontal' ? { x: elbow.x, y: child.y } : { x: child.x, y: elbow.y };
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:tree-edge:${item.id}`, { zIndex: layer.zIndex }),
      points: [parent, elbow, elbow2, child],
      closed: false,
      stroke: colorWithOpacity(theme.colors.axis, 0.85),
      lineWidth: 1.5,
      lineCap: 'round',
      lineJoin: 'round',
    });
  });

  const cardWidth = clamp(
    plot.width / Math.max(3, Math.max(...levels.map((level) => level.length))),
    66,
    112,
  );
  const cardHeight = 30;
  items.forEach((item, index) => {
    const position = positions.get(item.id);
    if (position === undefined) return;
    const color = themeColor(context, depths.get(item.id) ?? index, maxDepth + 1);
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:tree-node:${item.id}`, item.rowIndex, 1),
      x: position.x - cardWidth / 2,
      y: position.y - cardHeight / 2,
      width: cardWidth,
      height: cardHeight,
      fill: layer.mark.fill ?? theme.colors.surface,
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      cornerRadius: layer.mark.cornerRadius ?? 8,
    });
    nodes.push(
      textNode(`${layer.id}:tree-label:${item.id}`, position.x, position.y, item.label, context, {
        size: Math.max(9, theme.typography.fontSize - 1),
        weight: 650,
        zIndex: layer.zIndex + 2,
      }),
    );
  });
  return nodes;
};

interface GraphNodeData {
  readonly id: string;
  readonly label: string;
  readonly rowIndex: number;
  degree: number;
}

interface GraphEdgeData {
  readonly source: string;
  readonly target: string;
  readonly value: number;
  readonly rowIndex: number;
}

function graphData(context: MarkCompileContext): {
  readonly nodes: GraphNodeData[];
  readonly edges: GraphEdgeData[];
} {
  const { layer, table } = context;
  const idField = layer.mark.fields.id;
  const sourceField = layer.mark.fields.source ?? layer.x.field;
  const targetField = layer.mark.fields.target ?? layer.y.field;
  const labelField = layer.mark.fields.label ?? idField;
  const valueField = layer.mark.fields.value;
  const nodesById = new Map<string, GraphNodeData>();
  const edges: GraphEdgeData[] = [];

  const ensureNode = (id: string, rowIndex: number, label = id): GraphNodeData => {
    const existing = nodesById.get(id);
    if (existing !== undefined) return existing;
    const node = { id, label, rowIndex, degree: 0 };
    nodesById.set(id, node);
    return node;
  };

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    if (idField !== undefined && table.has(idField)) {
      const id = stringValue(table.value(rowIndex, idField));
      if (id !== null && id !== '') {
        ensureNode(
          id,
          rowIndex,
          labelField !== undefined && table.has(labelField)
            ? (stringValue(table.value(rowIndex, labelField)) ?? id)
            : id,
        );
      }
    }
    if (!table.has(sourceField) || !table.has(targetField)) continue;
    const source = stringValue(table.value(rowIndex, sourceField));
    const target = stringValue(table.value(rowIndex, targetField));
    if (source === null || target === null || source === '' || target === '') continue;
    const sourceNode = ensureNode(source, rowIndex);
    const targetNode = ensureNode(target, rowIndex);
    sourceNode.degree += 1;
    targetNode.degree += 1;
    const value =
      valueField !== undefined && table.has(valueField)
        ? (numericDataValue(table.value(rowIndex, valueField)) ?? 1)
        : (numericDataValue(table.value(rowIndex, layer.y.field)) ?? 1);
    edges.push({ source, target, value: Math.max(0, value), rowIndex });
  }
  return { nodes: [...nodesById.values()], edges };
}

export const compileGraphMark: MarkCompiler = (context) => {
  const { layer, plot, theme } = context;
  const { nodes: graphNodes, edges } = graphData(context);
  if (graphNodes.length === 0) return [];
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(20, Math.min(plot.width, plot.height) * 0.34);
  const positions = new Map<string, Point>();
  graphNodes.forEach((node, index) => {
    positions.set(
      node.id,
      pointOnCircle(cx, cy, radius, -Math.PI / 2 + (index * TAU) / graphNodes.length),
    );
  });
  const maxEdge = Math.max(1, ...edges.map((edge) => edge.value));
  const totals = new Map(graphNodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => {
    totals.set(edge.source, (totals.get(edge.source) ?? 0) + edge.value);
    totals.set(edge.target, (totals.get(edge.target) ?? 0) + edge.value);
  });
  const nodes: SceneNode[] = [];

  edges.forEach((edge, index) => {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (source === undefined || target === undefined) return;
    nodes.push({
      type: 'line',
      ...datumBase(context, `${layer.id}:graph-edge:${index}`, edge.rowIndex, 0, {
        kind: 'edge',
        source: edge.source,
        target: edge.target,
        value: edge.value,
      }),
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
      stroke: colorWithOpacity(theme.colors.axis, 0.55),
      lineWidth: 1 + (edge.value / maxEdge) * 4,
      lineCap: 'round',
    });
  });

  const maxDegree = Math.max(1, ...graphNodes.map((node) => node.degree));
  graphNodes.forEach((node, index) => {
    const position = positions.get(node.id);
    if (position === undefined) return;
    const nodeRadius = (layer.mark.radius ?? 8) + (node.degree / maxDegree) * 6;
    const color = themeColor(context, index, graphNodes.length);
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:graph-node:${node.id}`, node.rowIndex, 1, {
        kind: 'node',
        node: node.label,
        degree: node.degree,
        total: totals.get(node.id) ?? 0,
      }),
      cx: position.x,
      cy: position.y,
      radius: nodeRadius,
      fill: layer.mark.fill ?? color,
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 2,
    });
    const label = pointOnCircle(
      cx,
      cy,
      radius + 20,
      -Math.PI / 2 + (index * TAU) / graphNodes.length,
    );
    nodes.push(
      textNode(`${layer.id}:graph-label:${node.id}`, label.x, label.y, node.label, context, {
        fill: theme.colors.mutedText,
        size: Math.max(9, theme.typography.fontSize - 1),
        weight: 600,
      }),
    );
  });
  return nodes;
};

export const compileChordMark: MarkCompiler = (context) => {
  const { layer, plot, theme } = context;
  const { nodes: graphNodes, edges } = graphData(context);
  if (graphNodes.length < 2) return [];
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(22, Math.min(plot.width, plot.height) * 0.34);
  const totals = new Map(graphNodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => {
    totals.set(edge.source, (totals.get(edge.source) ?? 0) + edge.value);
    totals.set(edge.target, (totals.get(edge.target) ?? 0) + edge.value);
  });
  const grandTotal = Math.max(
    1,
    [...totals.values()].reduce((sum, value) => sum + value, 0),
  );
  const gap = Math.min(0.06, TAU / graphNodes.length / 4);
  let cursor = -Math.PI / 2;
  const spans = new Map<string, { start: number; end: number; mid: number }>();
  graphNodes.forEach((node) => {
    const rawSpan =
      (Math.max(1, totals.get(node.id) ?? 1) / grandTotal) * (TAU - gap * graphNodes.length);
    const start = cursor;
    const end = start + rawSpan;
    spans.set(node.id, { start, end, mid: (start + end) / 2 });
    cursor = end + gap;
  });
  const maxEdge = Math.max(1, ...edges.map((edge) => edge.value));
  const nodes: SceneNode[] = [];

  edges.forEach((edge, index) => {
    const sourceSpan = spans.get(edge.source);
    const targetSpan = spans.get(edge.target);
    if (sourceSpan === undefined || targetSpan === undefined) return;
    const source = pointOnCircle(cx, cy, radius - 8, sourceSpan.mid);
    const target = pointOnCircle(cx, cy, radius - 8, targetSpan.mid);
    const control = { x: cx, y: cy };
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:chord-ribbon:${index}`, edge.rowIndex, 0, {
        kind: 'flow',
        source: edge.source,
        target: edge.target,
        value: edge.value,
      }),
      points: quadraticPoints(source, control, target, 24),
      closed: false,
      stroke: colorWithOpacity(themeColor(context, index, edges.length), 0.42),
      lineWidth: 2 + (edge.value / maxEdge) * 9,
      lineCap: 'round',
      lineJoin: 'round',
    });
  });

  graphNodes.forEach((node, index) => {
    const span = spans.get(node.id);
    if (span === undefined) return;
    const color = themeColor(context, index, graphNodes.length);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:chord-segment:${node.id}`, node.rowIndex, 1, {
        kind: 'segment',
        node: node.label,
        total: totals.get(node.id) ?? 0,
      }),
      points: sampledArc(cx, cy, radius, span.start, span.end, 24),
      closed: false,
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 13,
      lineCap: 'round',
      lineJoin: 'round',
    });
    const label = pointOnCircle(cx, cy, radius + 20, span.mid);
    nodes.push(
      textNode(`${layer.id}:chord-label:${node.id}`, label.x, label.y, node.label, context, {
        fill: theme.colors.mutedText,
        size: Math.max(9, theme.typography.fontSize - 1),
        weight: 650,
      }),
    );
  });
  return nodes;
};

export const compileFunnelMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme, performance } = context;
  const items: { label: string; value: number; rowIndex: number }[] = [];
  let maxValue = 1;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const label = stringValue(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (label === null || value === null || value < 0) continue;
    items.push({ label, value, rowIndex });
    maxValue = Math.max(maxValue, value);
  }
  if (layer.mark.options.sort !== false) items.sort((left, right) => right.value - left.value);
  if (items.length === 0) return [];
  const itemBudget = Math.max(1, Math.floor(performance.maxBarMarks / 2));
  const retainedItems = exactStrideSampleIndices(items.length, itemBudget).map(
    (index) => items[index],
  );
  const stageHeight = plot.height / retainedItems.length;
  const nodes: SceneNode[] = [];

  if (layer.mark.options.mode === 'area') {
    retainedItems.forEach((item, index) => {
      if (item === undefined) return;
      // Scaling both dimensions by sqrt(value) keeps the visible stage area
      // proportional while retaining a stable slot for labels and hit testing.
      const scale = Math.sqrt(clamp(item.value / maxValue, 0.015, 1));
      const width = plot.width * scale;
      const height = Math.max(8, (stageHeight - 4) * scale);
      const cx = plot.x + plot.width / 2;
      const cy = plot.y + stageHeight * (index + 0.5);
      const topWidth = width;
      const bottomWidth = width * 0.82;
      const fill = layer.mark.fill ?? themeColor(context, index, retainedItems.length);
      nodes.push({
        type: 'path',
        ...datumBase(context, `${layer.id}:funnel-area:${index}`, item.rowIndex, 0, {
          stage: item.label,
          value: item.value,
          share: item.value / maxValue,
        }),
        points: [
          { x: cx - topWidth / 2, y: cy - height / 2 },
          { x: cx + topWidth / 2, y: cy - height / 2 },
          { x: cx + bottomWidth / 2, y: cy + height / 2 },
          { x: cx - bottomWidth / 2, y: cy + height / 2 },
        ],
        closed: true,
        fill,
        stroke: layer.mark.stroke ?? theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 2,
        lineJoin: 'round',
      });
      if (width > 68 && height > 18) {
        nodes.push(
          textNode(
            `${layer.id}:funnel-area-label:${index}`,
            cx,
            cy,
            `${item.label}  ${item.value}`,
            context,
            {
              fill: readableTextColor(fill, '#ffffff', '#0f172a'),
              size: Math.max(9, Math.min(theme.typography.fontSize, height * 0.42)),
              weight: 700,
            },
          ),
        );
      }
    });
    return nodes;
  }

  retainedItems.forEach((item, index) => {
    if (item === undefined) return;
    const next = retainedItems[index + 1];
    const topWidth = plot.width * clamp(item.value / maxValue, 0.08, 1);
    const bottomWidth = plot.width * clamp((next?.value ?? item.value * 0.78) / maxValue, 0.06, 1);
    const y1 = plot.y + index * stageHeight + 2;
    const y2 = plot.y + (index + 1) * stageHeight - 2;
    const cx = plot.x + plot.width / 2;
    const fill = layer.mark.fill ?? themeColor(context, index, retainedItems.length);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:funnel:${index}`, item.rowIndex),
      points: [
        { x: cx - topWidth / 2, y: y1 },
        { x: cx + topWidth / 2, y: y1 },
        { x: cx + bottomWidth / 2, y: y2 },
        { x: cx - bottomWidth / 2, y: y2 },
      ],
      closed: true,
      fill,
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 2,
      lineJoin: 'round',
    });
    nodes.push(
      textNode(
        `${layer.id}:funnel-label:${index}`,
        cx,
        (y1 + y2) / 2,
        `${item.label}  ${item.value}`,
        context,
        {
          fill: readableTextColor(fill, '#ffffff', '#0f172a'),
          size: Math.max(10, theme.typography.fontSize),
          weight: 700,
        },
      ),
    );
  });
  return nodes;
};

interface ParallelDimension {
  readonly field: string;
  readonly values: readonly string[];
  readonly min: number;
  readonly max: number;
  readonly numeric: boolean;
}

function parallelDimensions(
  context: MarkCompileContext,
  maximumDimensions = Number.POSITIVE_INFINITY,
): ParallelDimension[] {
  const { layer, table } = context;
  const configured = optionStrings(layer.mark.options.dimensions);
  const candidates =
    configured.length > 0
      ? configured
      : [layer.x.field, layer.y.field, ...Object.values(layer.mark.fields)];
  const fields = candidates.filter(
    (field, index, all) => table.has(field) && all.indexOf(field) === index,
  );
  return fields.slice(0, maximumDimensions).map((field) => {
    const extent = table.extent(field);
    const values = table.unique(field);
    return extent === null
      ? { field, values, min: 0, max: Math.max(1, values.length - 1), numeric: false }
      : { field, values, min: extent[0], max: extent[1], numeric: true };
  });
}

function compileParallelCategories(
  context: MarkCompileContext,
  dimensions: readonly ParallelDimension[],
): readonly SceneNode[] {
  const { layer, table, plot, theme, performance } = context;
  const nodeBudget = Math.max(1, Math.floor(performance.maxBarMarks));
  const linePointBudget = Math.max(1, Math.floor(performance.maxLinePoints));
  // One retained combination can emit one ribbon, up to one block and one
  // label per dimension, plus one title per dimension. Reserve that worst-case
  // footprint up front so wide categorical tables cannot bypass the profile.
  const dimensionLimit = Math.min(
    dimensions.length,
    Math.floor((nodeBudget - 1) / 3),
    Math.floor(linePointBudget / 2),
  );
  if (dimensionLimit < 2) return [];
  const retainedDimensions = dimensions.slice(0, dimensionLimit);
  const xFor = (index: number) =>
    plot.x + (index / Math.max(1, retainedDimensions.length - 1)) * plot.width;
  const combinations = new Map<
    string,
    { readonly values: readonly string[]; count: number; readonly rowIndex: number }
  >();
  const combinationBudget = Math.min(
    Math.floor((nodeBudget - retainedDimensions.length) / (retainedDimensions.length * 2 + 1)),
    Math.floor(linePointBudget / (retainedDimensions.length * 2)),
  );
  if (combinationBudget < 1) return [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const values = retainedDimensions.map((dimension) =>
      stringValue(table.value(rowIndex, dimension.field)),
    );
    if (values.some((value) => value === null)) continue;
    const categories = values as string[];
    const key = JSON.stringify(categories);
    const existing = combinations.get(key);
    if (existing !== undefined) existing.count += 1;
    else if (combinations.size < combinationBudget) {
      combinations.set(key, { values: categories, count: 1, rowIndex });
    }
  }
  const retainedCombinations = [...combinations.values()];
  const retainedTotal = retainedCombinations.reduce(
    (sum, combination) => sum + combination.count,
    0,
  );
  if (retainedTotal <= 0) return [];

  const categoryCounts = retainedDimensions.map(() => new Map<string, number>());
  const categoryOrders = retainedDimensions.map(() => [] as string[]);
  retainedCombinations.forEach((combination) => {
    combination.values.forEach((value, dimensionIndex) => {
      const counts = categoryCounts[dimensionIndex];
      const order = categoryOrders[dimensionIndex];
      if (counts !== undefined) {
        if (!counts.has(value)) order?.push(value);
        counts.set(value, (counts.get(value) ?? 0) + combination.count);
      }
    });
  });
  const countScale = plot.height / retainedTotal;
  const categoryLayouts = retainedDimensions.map((_dimension, dimensionIndex) => {
    const counts = categoryCounts[dimensionIndex] ?? new Map<string, number>();
    let offset = 0;
    const layouts = new Map<
      string,
      { readonly start: number; readonly center: number; readonly height: number }
    >();
    categoryOrders[dimensionIndex]?.forEach((value) => {
      const count = counts.get(value) ?? 0;
      if (count <= 0) return;
      const height = count * countScale;
      const start = plot.y + offset * countScale;
      layouts.set(value, { start, center: start + height / 2, height });
      offset += count;
    });
    return layouts;
  });

  const nodes: SceneNode[] = [];
  const categoryOffsets = retainedDimensions.map(() => new Map<string, number>());
  retainedCombinations.forEach((combination, combinationIndex) => {
    const bands = combination.values.map((value, dimensionIndex) => {
      const layout = categoryLayouts[dimensionIndex]?.get(value);
      const offsets = categoryOffsets[dimensionIndex];
      const offset = offsets?.get(value) ?? 0;
      if (offsets !== undefined) offsets.set(value, offset + combination.count);
      const top = (layout?.start ?? plot.y) + offset * countScale;
      return {
        x: xFor(dimensionIndex),
        top,
        bottom: top + combination.count * countScale,
      };
    });
    const polygon = [
      ...bands.map(({ x, top }) => ({ x, y: top })),
      ...[...bands].reverse().map(({ x, bottom }) => ({ x, y: bottom })),
    ];
    const combinationColor = themeColor(context, combinationIndex, retainedCombinations.length);
    const fill = layer.mark.fill ?? colorWithOpacity(combinationColor, 0.34);
    nodes.push({
      type: 'path',
      ...datumBase(
        context,
        `${layer.id}:parallel-ribbon:${combinationIndex}`,
        combination.rowIndex,
        0,
        {
          path: combination.values.join(' → '),
          count: combination.count,
        },
      ),
      points: polygon,
      closed: true,
      fill,
      stroke: layer.mark.stroke ?? colorWithOpacity(combinationColor, 0.72),
      lineWidth: layer.mark.lineWidth ?? 1,
      lineJoin: 'round',
    });
  });
  retainedDimensions.forEach((dimension, dimensionIndex) => {
    const x = xFor(dimensionIndex);
    const layouts = categoryLayouts[dimensionIndex];
    categoryOrders[dimensionIndex]?.forEach((value, categoryIndex) => {
      const item = layouts?.get(value);
      if (item === undefined) return;
      const blockGap = Math.min(2, item.height * 0.08);
      const rectHeight = Math.max(Number.EPSILON, item.height - blockGap);
      const rectY = item.start + blockGap / 2;
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:parallel-category:${dimensionIndex}:${categoryIndex}`, {
          zIndex: layer.zIndex + 2,
        }),
        x: x - 6,
        y: rectY,
        width: 12,
        height: rectHeight,
        fill: theme.colors.surface,
        stroke: theme.colors.axis,
        lineWidth: 1,
        cornerRadius: 2,
      });
      if (item.height >= 10) {
        nodes.push(
          textNode(
            `${layer.id}:parallel-category-label:${dimensionIndex}:${categoryIndex}`,
            x + (dimensionIndex === retainedDimensions.length - 1 ? -10 : 10),
            item.center,
            value,
            context,
            {
              align: dimensionIndex === retainedDimensions.length - 1 ? 'right' : 'left',
              fill: theme.colors.mutedText,
              size: Math.max(8, theme.typography.fontSize - 2),
            },
          ),
        );
      }
    });
    nodes.push(
      textNode(
        `${layer.id}:parallel-category-title:${dimensionIndex}`,
        x,
        plot.y - 10,
        dimension.field,
        context,
        { fill: theme.colors.text, size: Math.max(9, theme.typography.fontSize - 1), weight: 700 },
      ),
    );
  });
  return nodes;
}

export const compileParallelMark: MarkCompiler = (context) => {
  const { layer, table, plot, theme, performance } = context;
  const mode =
    typeof layer.mark.options.mode === 'string' ? layer.mark.options.mode : 'coordinates';
  const categorical = mode === 'categories' || mode === 'categorical' || mode === 'ribbons';
  const dimensionScanLimit = categorical
    ? Math.min(
        Math.floor((performance.maxBarMarks - 1) / 3),
        Math.floor(performance.maxLinePoints / 2),
      )
    : Number.POSITIVE_INFINITY;
  const dimensions = parallelDimensions(context, dimensionScanLimit);
  if (dimensions.length < 2) return [];
  if (categorical) {
    return compileParallelCategories(context, dimensions);
  }
  const nodes: SceneNode[] = [];
  const xFor = (index: number) =>
    plot.x +
    (dimensions.length === 1 ? plot.width / 2 : (index / (dimensions.length - 1)) * plot.width);

  dimensions.forEach((dimension, index) => {
    const x = xFor(index);
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:parallel-axis:${dimension.field}`, { zIndex: layer.zIndex }),
      x1: x,
      y1: plot.y,
      x2: x,
      y2: plot.y + plot.height,
      stroke: theme.colors.axis,
      lineWidth: 1.2,
      lineCap: 'round',
    });
    nodes.push(
      textNode(
        `${layer.id}:parallel-label:${dimension.field}`,
        x,
        plot.y + 10,
        dimension.field,
        context,
        {
          fill: theme.colors.mutedText,
          size: Math.max(9, theme.typography.fontSize - 1),
          weight: 650,
          baseline: 'top',
        },
      ),
    );
  });

  const colorField = layer.mark.fields.color ?? layer.mark.fields.group;
  const colorKeys = colorField === undefined ? [] : table.unique(colorField);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const points: Point[] = [];
    dimensions.forEach((dimension, dimensionIndex) => {
      const raw = table.value(rowIndex, dimension.field);
      let ratio: number;
      if (dimension.numeric) {
        const value = numericDataValue(raw);
        if (value === null) return;
        ratio =
          dimension.max === dimension.min
            ? 0.5
            : (value - dimension.min) / (dimension.max - dimension.min);
      } else {
        const value = stringValue(raw);
        const index = value === null ? -1 : dimension.values.indexOf(value);
        if (index < 0) return;
        ratio = dimension.values.length <= 1 ? 0.5 : index / (dimension.values.length - 1);
      }
      points.push({ x: xFor(dimensionIndex), y: plot.y + plot.height * (1 - clamp(ratio, 0, 1)) });
    });
    if (points.length !== dimensions.length) continue;
    const key = colorField === undefined ? null : stringValue(table.value(rowIndex, colorField));
    const colorIndex = key === null ? rowIndex : Math.max(0, colorKeys.indexOf(key));
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:parallel-row:${rowIndex}`, rowIndex, 1),
      points,
      closed: false,
      stroke:
        layer.mark.stroke ??
        themeColor(context, colorIndex, colorKeys.length > 0 ? colorKeys.length : table.length),
      lineWidth: layer.mark.lineWidth ?? 1.8,
      lineCap: 'round',
      lineJoin: 'round',
    });
  }
  return nodes;
};

export const compileBoxplotMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const minField = layer.mark.fields.min ?? layer.mark.fields.low ?? 'min';
  const q1Field = layer.mark.fields.q1 ?? 'q1';
  const medianField = layer.mark.fields.median ?? layer.y.field;
  const q3Field = layer.mark.fields.q3 ?? 'q3';
  const maxField = layer.mark.fields.max ?? layer.mark.fields.high ?? 'max';
  const summaryFields = [minField, q1Field, medianField, q3Field, maxField];
  if (!summaryFields.every((field) => table.has(field))) {
    const valueField = layer.mark.fields.value ?? layer.y.field;
    const grouped = new Map<string, { xValue: DataValue; observations: WeightedObservation[] }>();
    for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
      const xValue = table.value(rowIndex, layer.x.field);
      const category = stringValue(xValue);
      const value = numericDataValue(table.value(rowIndex, valueField));
      if (category === null || value === null) continue;
      const group = grouped.get(category) ?? { xValue, observations: [] };
      group.observations.push({ value, weight: 1, rowIndex });
      grouped.set(category, group);
    }
    const boxWidth = Math.max(
      8,
      xScale instanceof BandScale
        ? xScale.bandwidth * 0.55
        : context.plot.width / Math.max(3, grouped.size * 2),
    );
    const nodes: SceneNode[] = [];
    [...grouped].forEach(([category, group], groupIndex) => {
      const summary = rawBoxSummary(
        group.observations,
        finiteOption(layer.mark.options.whisker, 1.5),
      );
      const input = scaleInput(group.xValue);
      if (summary === null || input === null) return;
      const x = xScale.map(input);
      const yLow = yScale.map(summary.lowerWhisker);
      const yQ1 = yScale.map(summary.q1);
      const yMedian = yScale.map(summary.median);
      const yQ3 = yScale.map(summary.q3);
      const yHigh = yScale.map(summary.upperWhisker);
      const rowIndex = summary.rowIndices[0] ?? 0;
      const fill =
        layer.mark.fill ??
        theme.mark.boxplotFill ??
        theme.mark.areaFill ??
        colorWithOpacity(context.color, 0.22);
      const stroke =
        layer.mark.stroke ?? theme.mark.areaStroke ?? theme.mark.lineColor ?? context.color;
      const tooltip = {
        kind: 'raw-box-summary',
        category,
        valueField,
        minimum: summary.minimum,
        q1: summary.q1,
        median: summary.median,
        q3: summary.q3,
        maximum: summary.maximum,
        lowerWhisker: summary.lowerWhisker,
        upperWhisker: summary.upperWhisker,
        outlierCount: summary.outliers.length,
        sourceRowCount: summary.rowIndices.length,
        sourceRowIndices: summary.rowIndices.slice(0, 256),
      };
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:boxplot-whisker:${groupIndex}`, { zIndex: layer.zIndex }),
        x1: x,
        y1: yLow,
        x2: x,
        y2: yHigh,
        stroke,
        lineWidth: layer.mark.lineWidth ?? theme.mark.boxplotLineWidth ?? 1.5,
        lineCap: theme.mark.lineCap ?? 'round',
      });
      [yLow, yHigh].forEach((y, capIndex) =>
        nodes.push({
          type: 'line',
          ...nodeBase(`${layer.id}:boxplot-cap:${groupIndex}:${capIndex}`, {
            zIndex: layer.zIndex + 0.5,
          }),
          x1: x - boxWidth * 0.3,
          y1: y,
          x2: x + boxWidth * 0.3,
          y2: y,
          stroke,
          lineWidth: layer.mark.lineWidth ?? theme.mark.boxplotLineWidth ?? 1.5,
          lineCap: theme.mark.lineCap ?? 'round',
        }),
      );
      nodes.push({
        type: 'rect',
        ...datumBase(context, `${layer.id}:boxplot-box:${groupIndex}`, rowIndex, 1, tooltip),
        x: x - boxWidth / 2,
        y: Math.min(yQ1, yQ3),
        width: boxWidth,
        height: Math.max(1, Math.abs(yQ3 - yQ1)),
        fill,
        stroke,
        lineWidth: layer.mark.lineWidth ?? theme.mark.boxplotLineWidth ?? 1.8,
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.boxplotRadius ?? 3,
      });
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:boxplot-median:${groupIndex}`, { zIndex: layer.zIndex + 2 }),
        x1: x - boxWidth / 2,
        y1: yMedian,
        x2: x + boxWidth / 2,
        y2: yMedian,
        stroke:
          layer.mark.stroke ??
          theme.mark.boxplotMedianStroke ??
          mixColor(stroke, theme.colors.text, 0.22),
        lineWidth: layer.mark.lineWidth ?? theme.mark.boxplotLineWidth ?? 2.2,
        lineCap: theme.mark.lineCap ?? 'round',
      });
      summary.outliers
        .slice(0, context.performance.maxPointMarks)
        .forEach((outlier, outlierIndex) =>
          nodes.push({
            type: 'circle',
            ...datumBase(
              context,
              `${layer.id}:boxplot-outlier:${groupIndex}:${outlierIndex}`,
              outlier.rowIndex,
              3,
              {
                kind: 'boxplot-outlier',
                category,
                value: outlier.value,
                valueField,
              },
            ),
            cx: x,
            cy: yScale.map(outlier.value),
            radius: layer.mark.radius ?? 3,
            fill: theme.colors.background,
            stroke,
            lineWidth: 1,
          }),
        );
    });
    return nodes;
  }
  const nodes: SceneNode[] = [];
  const boxWidth = Math.max(
    8,
    xScale instanceof BandScale
      ? xScale.bandwidth * 0.55
      : context.plot.width / Math.max(3, table.length * 2),
  );

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const values = [minField, q1Field, medianField, q3Field, maxField].map((field) =>
      table.has(field) ? numericDataValue(table.value(rowIndex, field)) : null,
    );
    if (xValue === null || values.some((value) => value === null)) continue;
    const [min, q1, median, q3, max] = values as [number, number, number, number, number];
    const x = xScale.map(xValue);
    const yMin = yScale.map(min);
    const yQ1 = yScale.map(q1);
    const yMedian = yScale.map(median);
    const yQ3 = yScale.map(q3);
    const yMax = yScale.map(max);
    if (![x, yMin, yQ1, yMedian, yQ3, yMax].every(Number.isFinite)) continue;
    const fill =
      layer.mark.fill ??
      theme.mark.boxplotFill ??
      theme.mark.areaFill ??
      colorWithOpacity(context.color, 0.22);
    const stroke =
      layer.mark.stroke ?? theme.mark.areaStroke ?? theme.mark.lineColor ?? context.color;
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:boxplot-whisker:${rowIndex}`, { zIndex: layer.zIndex }),
      x1: x,
      y1: yMin,
      x2: x,
      y2: yMax,
      stroke,
      lineWidth: layer.mark.lineWidth ?? theme.mark.boxplotLineWidth ?? 1.5,
      lineCap: theme.mark.lineCap ?? 'round',
    });
    [yMin, yMax].forEach((y, capIndex) => {
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:boxplot-cap:${rowIndex}:${capIndex}`, {
          zIndex: layer.zIndex + 0.5,
        }),
        x1: x - boxWidth * 0.3,
        y1: y,
        x2: x + boxWidth * 0.3,
        y2: y,
        stroke,
        lineWidth: layer.mark.lineWidth ?? theme.mark.boxplotLineWidth ?? 1.5,
        lineCap: theme.mark.lineCap ?? 'round',
      });
    });
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:boxplot-box:${rowIndex}`, rowIndex, 1),
      x: x - boxWidth / 2,
      y: Math.min(yQ1, yQ3),
      width: boxWidth,
      height: Math.max(1, Math.abs(yQ3 - yQ1)),
      fill,
      stroke,
      lineWidth: layer.mark.lineWidth ?? theme.mark.boxplotLineWidth ?? 1.8,
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.boxplotRadius ?? 3,
    });
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:boxplot-median:${rowIndex}`, { zIndex: layer.zIndex + 2 }),
      x1: x - boxWidth / 2,
      y1: yMedian,
      x2: x + boxWidth / 2,
      y2: yMedian,
      stroke:
        layer.mark.stroke ??
        theme.mark.boxplotMedianStroke ??
        mixColor(stroke, theme.colors.text, 0.22),
      lineWidth: layer.mark.lineWidth ?? theme.mark.boxplotLineWidth ?? 2.2,
      lineCap: theme.mark.lineCap ?? 'round',
    });
  }
  return nodes;
};

export const compileEffectScatterMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const sizeField = layer.mark.fields.size;
  let maxSize = 1;
  if (sizeField !== undefined && table.has(sizeField)) {
    const extent = table.extent(sizeField);
    maxSize = Math.max(1, extent?.[1] ?? 1);
  }
  const nodes: SceneNode[] = [];
  const ringCount = clamp(Math.floor(finiteOption(layer.mark.options.rings, 2)), 1, 4);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    if (xValue === null || yValue === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(yValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const size =
      sizeField === undefined || !table.has(sizeField)
        ? 1
        : (numericDataValue(table.value(rowIndex, sizeField)) ?? 1) / maxSize;
    const radius = (layer.mark.radius ?? 5.5) * (0.7 + Math.sqrt(Math.max(0, size)) * 0.8);
    const color =
      layer.mark.fill ??
      themedPointFill(theme, context.color, theme.mark.defaultColor ?? context.color);
    for (let ring = ringCount; ring >= 1; ring -= 1) {
      nodes.push({
        type: 'circle',
        ...nodeBase(`${layer.id}:effect-ring:${rowIndex}:${ring}`, {
          zIndex: layer.zIndex,
          opacity: 0.08 + (ringCount - ring) * 0.05,
        }),
        cx: x,
        cy: y,
        radius: radius * (1.45 + ring * 0.48),
        fill: colorWithOpacity(color, 0.16),
        stroke: colorWithOpacity(color, 0.38),
        lineWidth: 1,
      });
    }
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:effect-point:${rowIndex}`, rowIndex, 2),
      cx: x,
      cy: y,
      radius,
      fill: color,
      stroke: layer.mark.stroke ?? themedPointStroke(theme, color, theme.colors.background),
      lineWidth: layer.mark.lineWidth ?? 2,
    });
  }
  return nodes;
};

export const compileLinesMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const x2Field = layer.mark.fields.x2 ?? 'x2';
  const y2Field = layer.mark.fields.y2 ?? 'y2';
  const valueField = layer.mark.fields.value;
  const curvature = clamp(finiteOption(layer.mark.options.curvature, 0.18), -1, 1);
  const nodes: SceneNode[] = [];
  let maxValue = 1;
  if (valueField !== undefined && table.has(valueField))
    maxValue = Math.max(1, table.extent(valueField)?.[1] ?? 1);

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    if (!table.has(x2Field) || !table.has(y2Field)) continue;
    const startX = scaleInput(table.value(rowIndex, layer.x.field));
    const startY = scaleInput(table.value(rowIndex, layer.y.field));
    const endX = scaleInput(table.value(rowIndex, x2Field));
    const endY = scaleInput(table.value(rowIndex, y2Field));
    if (startX === null || startY === null || endX === null || endY === null) continue;
    const start = { x: xScale.map(startX), y: yScale.map(startY) };
    const end = { x: xScale.map(endX), y: yScale.map(endY) };
    if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) continue;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const control = {
      x: (start.x + end.x) / 2 - (dy / length) * length * curvature,
      y: (start.y + end.y) / 2 + (dx / length) * length * curvature,
    };
    const points =
      Math.abs(curvature) < 0.001 ? [start, end] : quadraticPoints(start, control, end, 24);
    const value =
      valueField === undefined || !table.has(valueField)
        ? 1
        : (numericDataValue(table.value(rowIndex, valueField)) ?? 1);
    const stroke =
      layer.mark.stroke ?? theme.mark.lineColor ?? theme.mark.defaultColor ?? context.color;
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:lines-path:${rowIndex}`, rowIndex),
      points,
      closed: false,
      stroke,
      lineWidth: (layer.mark.lineWidth ?? 1.8) + (value / maxValue) * 3,
      lineCap: theme.mark.lineCap ?? 'round',
      lineJoin: theme.mark.lineJoin ?? 'round',
    });
    const previous = points.at(-2) ?? start;
    const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
    const arrowSize = 5 + (value / maxValue) * 3;
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:lines-arrow:${rowIndex}`, { zIndex: layer.zIndex + 1 }),
      points: [
        end,
        pointOnCircle(end.x, end.y, arrowSize, angle + Math.PI * 0.82),
        pointOnCircle(end.x, end.y, arrowSize, angle - Math.PI * 0.82),
      ],
      closed: true,
      fill: stroke,
      lineWidth: 0,
    });
  }
  return nodes;
};

function heatmapCellSpan(positions: readonly number[], fallback: number, gap: number): number {
  const sorted = [...new Set(positions.filter(Number.isFinite))].sort(
    (left, right) => left - right,
  );
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 1; index < sorted.length; index += 1) {
    minimum = Math.min(minimum, (sorted[index] ?? 0) - (sorted[index - 1] ?? 0));
  }
  const span = Number.isFinite(minimum) ? minimum : fallback;
  return Math.max(1, span - Math.min(gap, Math.max(0, span - 1)));
}

export const compileHeatmapMark: MarkCompiler = (context) => {
  const { layer, table, plot, xScale, yScale, theme } = context;
  const encoding = createEncodingResolver(context);
  const valueField = layer.mark.fields.value ?? 'value';
  if (!table.has(valueField)) return [];
  const values: number[] = [];
  const xPositions: number[] = [];
  const yPositions: number[] = [];
  const indices = encoding.orderedIndices(
    Array.from({ length: table.length }, (_value, index) => index),
  );
  for (const rowIndex of indices) {
    const value = numericDataValue(table.value(rowIndex, valueField));
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    if (value === null || xValue === null || yValue === null) continue;
    values.push(value);
    xPositions.push(xScale.map(xValue));
    yPositions.push(yScale.map(yValue));
  }
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const cellGap = clamp(finiteOption(layer.mark.options.cellGap, 1), 0, 24);
  const xCellPositions =
    xScale instanceof BandScale ? xScale.domain().map((value) => xScale.map(value)) : xPositions;
  const yCellPositions =
    yScale instanceof BandScale ? yScale.domain().map((value) => yScale.map(value)) : yPositions;
  const cellWidth = heatmapCellSpan(
    xCellPositions,
    xScale instanceof BandScale ? plot.width / Math.max(1, xScale.domain().length) : 18,
    cellGap,
  );
  const cellHeight = heatmapCellSpan(
    yCellPositions,
    yScale instanceof BandScale ? plot.height / Math.max(1, yScale.domain().length) : 18,
    cellGap,
  );
  const nodes: SceneNode[] = [];

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, valueField));
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    if (value === null || xValue === null || yValue === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(yValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const ratio = max === min ? 0.5 : clamp((value - min) / (max - min), 0, 1);
    const seriesColor = encoding.color('color', rowIndex, mappedContinuousColor(theme, ratio));
    const color = encoding.color(
      'fill',
      rowIndex,
      encoding.has('color') ? seriesColor : (layer.mark.fill ?? seriesColor),
    );
    const x2 = encoding.position('x2', rowIndex);
    const y2 = encoding.position('y2', rowIndex);
    const cellX = x2 === null ? x - cellWidth / 2 : Math.min(x, x2);
    const cellY = y2 === null ? y - cellHeight / 2 : Math.min(y, y2);
    const width = x2 === null ? cellWidth : Math.max(1, Math.abs(x2 - x));
    const height = y2 === null ? cellHeight : Math.max(1, Math.abs(y2 - y));
    const stroke = encoding.color('stroke', rowIndex, layer.mark.stroke ?? theme.colors.background);
    const tooltip = encoding.tooltip(rowIndex);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:heatmap:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: encoding.number('opacity', rowIndex, layer.mark.opacity),
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: layer.id,
          rowIndex,
          datum: table.row(rowIndex),
          ...(tooltip === undefined ? {} : { tooltip }),
        },
      }),
      x: cellX,
      y: cellY,
      width,
      height,
      fill: color,
      stroke,
      lineWidth: encoding.number('strokeWidth', rowIndex, layer.mark.lineWidth ?? 1),
      ...(encoding.dash(rowIndex).length === 0 ? {} : { dash: encoding.dash(rowIndex) }),
      cornerRadius: layer.mark.cornerRadius ?? 1,
    });
    if (width >= 34 && height >= 24 && layer.mark.options.labels !== false) {
      nodes.push(
        textNode(
          `${layer.id}:heatmap-label:${rowIndex}`,
          cellX + width / 2,
          cellY + height / 2,
          encoding.text(rowIndex, String(value)) ?? String(value),
          context,
          {
            fill: readableTextColor(color, '#ffffff', '#0f172a'),
            size: Math.max(9, theme.typography.fontSize - 1),
            weight: 650,
          },
        ),
      );
    }
  }
  return nodes;
};

export const compilePictorialBarMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, plot, theme } = context;
  const maxSymbols = clamp(Math.floor(finiteOption(layer.mark.options.maxSymbols, 12)), 2, 40);
  let maxAbs = 0;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    maxAbs = Math.max(
      maxAbs,
      Math.abs(numericDataValue(table.value(rowIndex, layer.y.field)) ?? 0),
    );
  }
  const unit = Math.max(1e-9, finiteOption(layer.mark.options.unit, maxAbs / maxSymbols || 1));
  const symbol =
    typeof layer.mark.options.symbol === 'string' ? layer.mark.options.symbol : 'circle';
  const nodes: SceneNode[] = [];
  const zero = yScale.map(0);
  const band =
    xScale instanceof BandScale ? xScale.bandwidth : plot.width / Math.max(2, table.length * 1.5);

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const category = scaleInput(table.value(rowIndex, layer.x.field));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (category === null || value === null) continue;
    const x = xScale.map(category);
    const end = yScale.map(value);
    if (![x, end, zero].every(Number.isFinite)) continue;
    const count = Math.min(maxSymbols, Math.max(1, Math.ceil(Math.abs(value) / unit)));
    const step = Math.abs(end - zero) / count;
    const requestedSize = finiteOption(layer.mark.options.symbolSize, Number.NaN);
    const size = Number.isFinite(requestedSize)
      ? clamp(Math.abs(requestedSize), 3, Math.max(3, band * 0.9))
      : Math.max(3, Math.min(band * 0.62, step * 0.72, 18));
    const color = layer.mark.fill ?? themeColor(context, rowIndex, table.length);
    for (let index = 0; index < count; index += 1) {
      const y = zero + Math.sign(end - zero || -1) * step * (index + 0.5);
      const id = `${layer.id}:pictorial:${rowIndex}:${index}`;
      if (symbol === 'square') {
        nodes.push({
          type: 'rect',
          ...datumBase(context, id, rowIndex),
          x: x - size / 2,
          y: y - size / 2,
          width: size,
          height: size,
          fill: color,
          stroke: layer.mark.stroke ?? theme.colors.background,
          lineWidth: layer.mark.lineWidth ?? 1,
          cornerRadius: layer.mark.cornerRadius ?? 2,
        });
      } else if (symbol === 'diamond') {
        nodes.push({
          type: 'path',
          ...datumBase(context, id, rowIndex),
          points: [
            { x, y: y - size / 2 },
            { x: x + size / 2, y },
            { x, y: y + size / 2 },
            { x: x - size / 2, y },
          ],
          closed: true,
          fill: color,
          stroke: layer.mark.stroke ?? theme.colors.background,
          lineWidth: layer.mark.lineWidth ?? 1,
          lineJoin: 'round',
        });
      } else {
        nodes.push({
          type: 'circle',
          ...datumBase(context, id, rowIndex),
          cx: x,
          cy: y,
          radius: size / 2,
          fill: color,
          stroke: layer.mark.stroke ?? theme.colors.background,
          lineWidth: layer.mark.lineWidth ?? 1,
        });
      }
    }
  }
  return nodes;
};

export const compileThemeRiverMark: MarkCompiler = (context) => {
  return compileSeriesAreaMark(context) ?? [];
};

interface SunburstNode extends HierarchyItem {
  children: SunburstNode[];
  total: number;
}

function sunburstTree(items: readonly HierarchyItem[]): SunburstNode[] {
  const nodes = new Map<string, SunburstNode>();
  items.forEach((item) => nodes.set(item.id, { ...item, children: [], total: item.value }));
  const roots: SunburstNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parent === null ? undefined : nodes.get(node.parent);
    if (parent === undefined) roots.push(node);
    else parent.children.push(node);
  });
  const totalOf = (node: SunburstNode, visiting = new Set<string>()): number => {
    if (visiting.has(node.id)) return Math.max(1, node.value);
    visiting.add(node.id);
    const childTotal = node.children.reduce((sum, child) => sum + totalOf(child, visiting), 0);
    visiting.delete(node.id);
    node.total = node.value > 0 ? node.value : Math.max(1, childTotal);
    if (childTotal > node.total) node.total = childTotal;
    return node.total;
  };
  roots.forEach((root) => totalOf(root));
  return roots;
}

export const compileSunburstMark: MarkCompiler = (context) => {
  const { layer, plot, theme } = context;
  const items = hierarchyItems(context);
  const roots = sunburstTree(items);
  if (roots.length === 0) return [];
  const depths = hierarchyDepths(items);
  const maxDepth = Math.max(0, ...depths.values());
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const outerRadius = Math.max(20, Math.min(plot.width, plot.height) * 0.42);
  const innerHole = outerRadius * clamp(finiteOption(layer.mark.options.innerRadius, 0.12), 0, 0.7);
  const ringWidth = (outerRadius - innerHole) / Math.max(1, maxDepth + 1);
  const nodes: SceneNode[] = [];
  let colorIndex = 0;

  const drawNode = (node: SunburstNode, start: number, end: number, depth: number): void => {
    const inner = innerHole + depth * ringWidth + 1;
    const outer = innerHole + (depth + 1) * ringWidth - 1;
    const color = themeColor(context, colorIndex, items.length);
    colorIndex += 1;
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:sunburst:${node.id}`, node.rowIndex, depth / 100),
      points: annularSector(cx, cy, inner, outer, start, end),
      closed: true,
      fill: layer.mark.fill ?? mixColor(color, theme.colors.background, depth * 0.08),
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineJoin: 'round',
    });
    if (end - start > 0.18 && outer - inner > 18) {
      const angle = (start + end) / 2;
      const labelPoint = pointOnCircle(cx, cy, (inner + outer) / 2, angle);
      nodes.push(
        textNode(
          `${layer.id}:sunburst-label:${node.id}`,
          labelPoint.x,
          labelPoint.y,
          node.label,
          context,
          {
            fill: readableTextColor(layer.mark.fill ?? color, '#ffffff', '#0f172a'),
            size: Math.max(8, theme.typography.fontSize - 2),
            weight: 650,
            rotation: (angle * 180) / Math.PI + 90,
          },
        ),
      );
    }
    if (node.children.length === 0) return;
    const total = Math.max(
      1,
      node.children.reduce((sum, child) => sum + child.total, 0),
    );
    let cursor = start;
    node.children.forEach((child) => {
      const childEnd = cursor + ((end - start) * child.total) / total;
      drawNode(child, cursor, childEnd, depth + 1);
      cursor = childEnd;
    });
  };

  const rootTotal = Math.max(
    1,
    roots.reduce((sum, root) => sum + root.total, 0),
  );
  let cursor = -Math.PI / 2;
  roots.forEach((root) => {
    const end = cursor + (TAU * root.total) / rootTotal;
    drawNode(root, cursor, end, 0);
    cursor = end;
  });
  return nodes;
};

export const compileCustomMark: MarkCompiler = (context) => {
  const { layer, table, xScale, yScale, theme } = context;
  const defaultPrimitive =
    typeof layer.mark.options.primitive === 'string' ? layer.mark.options.primitive : 'circle';
  const primitiveField = layer.mark.fields.primitive ?? layer.mark.fields.shape;
  const x2Field = layer.mark.fields.x2;
  const y2Field = layer.mark.fields.y2;
  const labelField = layer.mark.fields.label;
  const sizeField = layer.mark.fields.size;
  const widthField = layer.mark.fields.width;
  const heightField = layer.mark.fields.height;
  const radiusField = layer.mark.fields.radius;
  const nodes: SceneNode[] = [];

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const xValue = scaleInput(table.value(rowIndex, layer.x.field));
    const yValue = scaleInput(table.value(rowIndex, layer.y.field));
    if (xValue === null || yValue === null) continue;
    const x = xScale.map(xValue);
    const y = yScale.map(yValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const primitive =
      primitiveField !== undefined && table.has(primitiveField)
        ? (stringValue(table.value(rowIndex, primitiveField)) ?? defaultPrimitive)
        : defaultPrimitive;
    const size =
      sizeField !== undefined && table.has(sizeField)
        ? Math.abs(numericDataValue(table.value(rowIndex, sizeField)) ?? 12)
        : Math.abs(finiteOption(layer.mark.options.size, 12));
    const fill = layer.mark.fill ?? themeColor(context, rowIndex, table.length);

    if (
      primitive === 'line' &&
      x2Field !== undefined &&
      y2Field !== undefined &&
      table.has(x2Field) &&
      table.has(y2Field)
    ) {
      const x2Value = scaleInput(table.value(rowIndex, x2Field));
      const y2Value = scaleInput(table.value(rowIndex, y2Field));
      if (x2Value === null || y2Value === null) continue;
      const x2 = xScale.map(x2Value);
      const y2 = yScale.map(y2Value);
      if (!Number.isFinite(x2) || !Number.isFinite(y2)) continue;
      nodes.push({
        type: 'line',
        ...datumBase(context, `${layer.id}:custom-line:${rowIndex}`, rowIndex),
        x1: x,
        y1: y,
        x2,
        y2,
        stroke: layer.mark.stroke ?? fill,
        lineWidth: layer.mark.lineWidth ?? 2,
        lineCap: 'round',
      });
    } else if (primitive === 'rect' || primitive === 'round-rect' || primitive === 'square') {
      const width =
        widthField !== undefined && table.has(widthField)
          ? (numericDataValue(table.value(rowIndex, widthField)) ?? size)
          : primitive === 'square'
            ? size
            : finiteOption(layer.mark.options.width, size);
      const height =
        heightField !== undefined && table.has(heightField)
          ? (numericDataValue(table.value(rowIndex, heightField)) ?? size)
          : primitive === 'square'
            ? size
            : finiteOption(layer.mark.options.height, size);
      nodes.push({
        type: 'rect',
        ...datumBase(context, `${layer.id}:custom-rect:${rowIndex}`, rowIndex),
        x: x - Math.abs(width) / 2,
        y: y - Math.abs(height) / 2,
        width: Math.abs(width),
        height: Math.abs(height),
        fill,
        stroke: layer.mark.stroke ?? theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 1,
        cornerRadius:
          primitive === 'round-rect'
            ? (layer.mark.cornerRadius ?? 6)
            : (layer.mark.cornerRadius ?? 2),
      });
    } else if (primitive === 'diamond') {
      const radius = Math.max(1, size / 2);
      nodes.push({
        type: 'path',
        ...datumBase(context, `${layer.id}:custom-diamond:${rowIndex}`, rowIndex),
        points: [
          { x, y: y - radius },
          { x: x + radius, y },
          { x, y: y + radius },
          { x: x - radius, y },
        ],
        closed: true,
        fill,
        stroke: layer.mark.stroke ?? theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 1.5,
        lineJoin: 'round',
      });
    } else if (primitive === 'text') {
      const label =
        labelField !== undefined && table.has(labelField)
          ? (stringValue(table.value(rowIndex, labelField)) ?? '')
          : String(layer.mark.options.label ?? '');
      nodes.push(
        textNode(`${layer.id}:custom-text:${rowIndex}`, x, y, label, context, {
          fill: layer.mark.stroke ?? fill,
          size: finiteOption(
            layer.mark.options.fontSize,
            Math.max(theme.typography.fontSize, size),
          ),
          weight: 650,
        }),
      );
    } else {
      const radius =
        radiusField !== undefined && table.has(radiusField)
          ? (numericDataValue(table.value(rowIndex, radiusField)) ?? layer.mark.radius ?? size / 2)
          : (layer.mark.radius ?? finiteOption(layer.mark.options.radius, size / 2));
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:custom-circle:${rowIndex}`, rowIndex),
        cx: x,
        cy: y,
        radius: Math.max(0, Math.abs(radius)),
        fill,
        stroke: layer.mark.stroke ?? theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 1.5,
      });
    }

    if (
      primitive !== 'text' &&
      layer.mark.options.labels !== false &&
      labelField !== undefined &&
      table.has(labelField)
    ) {
      const label = stringValue(table.value(rowIndex, labelField));
      if (label !== null && label !== '') {
        nodes.push(
          textNode(
            `${layer.id}:custom-label:${rowIndex}`,
            x,
            clamp(y - size / 2 - 8, context.plot.y + 8, context.plot.y + context.plot.height - 8),
            label,
            context,
            {
              fill: theme.colors.mutedText,
              size: Math.max(9, theme.typography.fontSize - 1),
              weight: 600,
              baseline: 'middle',
            },
          ),
        );
      }
    }
  }
  return nodes;
};
