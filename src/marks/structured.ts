import type { MarkCompiler } from '../compiler/types.js';
import { BandScale } from '../scale/band.js';
import { nodeBase } from '../scene/factory.js';
import type { LineNode, PathNode, Point, RectNode, SceneNode, TextNode } from '../scene/types.js';
import { numericDataValue, scaleInput } from './utils.js';

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

function optionStrings(
  options: Readonly<Record<string, unknown>>,
  name: string,
): readonly string[] | undefined {
  const value = options[name];
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : undefined;
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
    weight?: string | number;
    fill?: string;
  } = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: context.layer.zIndex + 2 }),
    x,
    y,
    text,
    fill: options.fill ?? context.theme.colors.text,
    fontFamily: context.theme.typography.fontFamily,
    fontSize: options.size ?? context.theme.typography.fontSize,
    fontWeight: options.weight ?? 500,
    align: options.align ?? 'center',
    baseline: options.baseline ?? 'middle',
    rotation: 0,
  };
}

function hexChannel(color: string, index: number): number {
  const normalized = color.replace('#', '');
  const offset = normalized.length === 3 ? index : index * 2;
  const raw =
    normalized.length === 3 ? normalized[offset]?.repeat(2) : normalized.slice(offset, offset + 2);
  return Number.parseInt(raw ?? '00', 16);
}

function mixColor(start: string, end: string, ratio: number): string {
  const bounded = Math.max(0, Math.min(1, ratio));
  const channels = [0, 1, 2].map((index) =>
    Math.round(
      hexChannel(start, index) + (hexChannel(end, index) - hexChannel(start, index)) * bounded,
    ),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export const compileCalendarMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const values: { rowIndex: number; date: Date; value: number }[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const rawDate = table.value(rowIndex, layer.x.field);
    const date = rawDate instanceof Date ? rawDate : new Date(String(rawDate));
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (!Number.isFinite(date.getTime()) || value === null) continue;
    values.push({ rowIndex, date, value });
  }
  if (values.length === 0) return [];
  values.sort((left, right) => left.date.getTime() - right.date.getTime());
  const minimum = Math.min(...values.map((item) => item.value));
  const maximum = Math.max(...values.map((item) => item.value));
  const first = values[0]?.date;
  if (first === undefined) return [];
  const start = new Date(Date.UTC(first.getUTCFullYear(), 0, 1));
  const day = 24 * 60 * 60 * 1000;
  const weekCount = Math.max(
    1,
    Math.ceil(
      (Math.max(...values.map((item) => item.date.getTime())) - start.getTime()) / day / 7,
    ) + 1,
  );
  const gap = 2;
  const cell = Math.max(
    3,
    Math.min((plot.width - 36) / weekCount - gap, (plot.height - 34) / 7 - gap),
  );
  const originX = plot.x + 34;
  const originY = plot.y + 20;
  const nodes: SceneNode[] = [];
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((label, index) =>
    nodes.push(
      textNode(
        `${layer.id}:weekday:${index}`,
        plot.x + 18,
        originY + index * (cell + gap) + cell / 2,
        label,
        context,
        { size: 9 },
      ),
    ),
  );
  values.forEach((item) => {
    const offset = Math.floor((item.date.getTime() - start.getTime()) / day);
    const week = Math.floor((offset + start.getUTCDay()) / 7);
    const weekday = item.date.getUTCDay();
    const ratio = maximum === minimum ? 0.6 : (item.value - minimum) / (maximum - minimum);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:day:${item.rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
      }),
      x: originX + week * (cell + gap),
      y: originY + weekday * (cell + gap),
      width: cell,
      height: cell,
      fill: mixColor(
        theme.colors.sequential[0] ?? '#eff6ff',
        theme.colors.sequential.at(-1) ?? '#1e3a8a',
        ratio,
      ),
      stroke: theme.colors.background,
      lineWidth: 0.5,
      cornerRadius: Math.min(2, cell * 0.15),
    });
  });
  return nodes;
};

const countryCentroids: Readonly<Record<string, readonly [number, number]>> = {
  KR: [127.8, 36.4],
  KOREA: [127.8, 36.4],
  US: [-98.5, 39.5],
  USA: [-98.5, 39.5],
  CA: [-106, 56],
  CANADA: [-106, 56],
  BR: [-51.9, -14.2],
  BRAZIL: [-51.9, -14.2],
  GB: [-3.4, 55.4],
  UK: [-3.4, 55.4],
  FR: [2.2, 46.2],
  DE: [10.4, 51.2],
  RU: [105.3, 61.5],
  RUSSIA: [105.3, 61.5],
  IN: [78.9, 20.6],
  INDIA: [78.9, 20.6],
  CN: [104.2, 35.9],
  CHINA: [104.2, 35.9],
  JP: [138.3, 36.2],
  JAPAN: [138.3, 36.2],
  AU: [133.8, -25.3],
  AUSTRALIA: [133.8, -25.3],
  ZA: [22.9, -30.6],
};

const continents: readonly (readonly [number, number])[][] = [
  [
    [-168, 72],
    [-52, 72],
    [-60, 15],
    [-100, 8],
    [-126, 30],
  ],
  [
    [-82, 12],
    [-34, 6],
    [-52, -56],
    [-76, -50],
  ],
  [
    [-12, 70],
    [42, 70],
    [55, 35],
    [15, 34],
    [-10, 45],
  ],
  [
    [-18, 35],
    [52, 35],
    [48, -35],
    [12, -35],
    [-5, 5],
  ],
  [
    [35, 72],
    [178, 70],
    [150, 5],
    [95, 2],
    [55, 28],
  ],
  [
    [112, -10],
    [155, -10],
    [153, -44],
    [116, -38],
  ],
];

function project(
  plot: Parameters<MarkCompiler>[0]['plot'],
  longitude: number,
  latitude: number,
): Point {
  return {
    x: plot.x + ((longitude + 180) / 360) * plot.width,
    y: plot.y + ((90 - latitude) / 180) * plot.height,
  };
}

function worldBackground(context: Parameters<MarkCompiler>[0]): SceneNode[] {
  return continents.map((polygon, index): PathNode => ({
    type: 'path',
    ...nodeBase(`${context.layer.id}:continent:${index}`, {
      zIndex: context.layer.zIndex - 2,
      opacity: 0.86,
    }),
    points: polygon.map(([longitude, latitude]) => project(context.plot, longitude, latitude)),
    closed: true,
    fill: context.theme.colors.grid,
    stroke: context.theme.colors.axis,
    lineWidth: 0.8,
  }));
}

export const compileGeoMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const nodes: SceneNode[] = worldBackground(context);
  const extent = table.extent(layer.y.field);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const region = String(table.value(rowIndex, layer.x.field) ?? '').trim();
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const centroid = countryCentroids[region.toUpperCase()];
    if (centroid === undefined || value === null) continue;
    const ratio =
      extent === null || extent[1] === extent[0]
        ? 0.6
        : (value - extent[0]) / (extent[1] - extent[0]);
    const point = project(plot, centroid[0], centroid[1]);
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:region:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      cx: point.x,
      cy: point.y,
      radius: 5 + Math.sqrt(Math.max(0, ratio)) * 12,
      fill: layer.mark.fill ?? theme.colors.focus,
      stroke: theme.colors.background,
      lineWidth: 1.5,
    });
  }
  return nodes;
};

export const compileMapMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const nodes: SceneNode[] = worldBackground(context);
  const sizeField = layer.mark.fields.size;
  const extent = sizeField === undefined || !table.has(sizeField) ? null : table.extent(sizeField);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
    const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
    if (longitude === null || latitude === null) continue;
    const rawSize =
      sizeField === undefined ? null : numericDataValue(table.value(rowIndex, sizeField));
    const ratio =
      rawSize === null || extent === null || extent[1] === extent[0]
        ? 0.5
        : (rawSize - extent[0]) / (extent[1] - extent[0]);
    const point = project(plot, longitude, latitude);
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:map-point:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      cx: point.x,
      cy: point.y,
      radius: layer.mark.radius ?? 5 + Math.sqrt(Math.max(0, ratio)) * 10,
      fill: layer.mark.fill ?? theme.colors.focus,
      stroke: theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1.5,
    });
  }
  return nodes;
};

interface TreeItem {
  readonly rowIndex: number;
  readonly id: string;
  readonly parent: string;
  readonly weight: number;
}

function treeItems(context: Parameters<MarkCompiler>[0]): TreeItem[] {
  const { table, layer } = context;
  const parentField = layer.mark.fields.parent ?? layer.y.field;
  const weightField = layer.mark.fields.weight;
  const idField = layer.mark.fields.id ?? layer.x.field;
  const items: TreeItem[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const rawId = table.value(rowIndex, idField);
    if (rawId === null || rawId === undefined) continue;
    const rawParent = table.has(parentField) ? table.value(rowIndex, parentField) : null;
    const weight =
      weightField !== undefined && table.has(weightField)
        ? (numericDataValue(table.value(rowIndex, weightField)) ?? 1)
        : (numericDataValue(table.value(rowIndex, layer.y.field)) ?? 1);
    items.push({
      rowIndex,
      id: String(rawId),
      parent: rawParent === null || rawParent === undefined ? '' : String(rawParent),
      weight,
    });
  }
  return items;
}

function treeDepths(items: readonly TreeItem[]): Map<string, number> {
  const parents = new Map(items.map((item) => [item.id, item.parent]));
  const depths = new Map<string, number>();
  const resolve = (id: string, trail: Set<string>): number => {
    const existing = depths.get(id);
    if (existing !== undefined) return existing;
    const parent = parents.get(id);
    if (parent === undefined || parent === '' || !parents.has(parent) || trail.has(id)) {
      depths.set(id, 0);
      return 0;
    }
    const nextTrail = new Set(trail);
    nextTrail.add(id);
    const depth = resolve(parent, nextTrail) + 1;
    depths.set(id, depth);
    return depth;
  };
  items.forEach((item) => resolve(item.id, new Set()));
  return depths;
}

export const compileOrgMark: MarkCompiler = (context) => {
  const { layer, plot, theme, table, performance } = context;
  const items = treeItems(context);
  const depths = treeDepths(items);
  const groups = new Map<number, TreeItem[]>();
  items.forEach((item) => {
    const depth = depths.get(item.id) ?? 0;
    const group = groups.get(depth) ?? [];
    group.push(item);
    groups.set(depth, group);
  });
  const maxDepth = Math.max(0, ...groups.keys());
  const positions = new Map<string, Point>();
  const nodeWidth = Math.max(
    64,
    Math.min(
      128,
      plot.width / Math.max(2, Math.max(...[...groups.values()].map((group) => group.length))) - 16,
    ),
  );
  const nodeHeight = Math.max(28, Math.min(44, plot.height / Math.max(2, maxDepth + 1) - 18));
  for (const [depth, group] of groups) {
    group.forEach((item, index) => {
      positions.set(item.id, {
        x: plot.x + (plot.width * (index + 1)) / (group.length + 1),
        y: plot.y + (plot.height * (depth + 0.5)) / Math.max(1, maxDepth + 1),
      });
    });
  }
  const nodes: SceneNode[] = [];
  items.forEach((item) => {
    const position = positions.get(item.id);
    const parent = positions.get(item.parent);
    if (position === undefined || parent === undefined) return;
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:edge:${item.rowIndex}`, { zIndex: layer.zIndex - 1 }),
      x1: parent.x,
      y1: parent.y + nodeHeight / 2,
      x2: position.x,
      y2: position.y - nodeHeight / 2,
      stroke: theme.colors.axis,
      lineWidth: 1.3,
    });
  });
  items.forEach((item) => {
    const position = positions.get(item.id);
    if (position === undefined) return;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:node:${item.rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
      }),
      x: position.x - nodeWidth / 2,
      y: position.y - nodeHeight / 2,
      width: nodeWidth,
      height: nodeHeight,
      fill: layer.mark.fill ?? theme.colors.surface,
      stroke: layer.mark.stroke ?? theme.colors.focus,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      cornerRadius: layer.mark.cornerRadius ?? 7,
    });
    nodes.push(
      textNode(
        `${layer.id}:node-label:${item.rowIndex}`,
        position.x,
        position.y,
        item.id,
        context,
        { size: 10, weight: 650 },
      ),
    );
  });
  return nodes;
};

export const compileSankeyMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const targetField = layer.mark.fields.target ?? 'target';
  const edges: { rowIndex: number; source: string; target: string; value: number }[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const source = table.value(rowIndex, layer.x.field);
    const target = table.has(targetField) ? table.value(rowIndex, targetField) : null;
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (
      source === null ||
      source === undefined ||
      target === null ||
      target === undefined ||
      value === null ||
      value <= 0
    )
      continue;
    edges.push({ rowIndex, source: String(source), target: String(target), value });
  }
  const sources = [...new Set(edges.map((edge) => edge.source))];
  const targets = [...new Set(edges.map((edge) => edge.target))];
  const sourceTotals = new Map(
    sources.map((source) => [
      source,
      edges.filter((edge) => edge.source === source).reduce((sum, edge) => sum + edge.value, 0),
    ]),
  );
  const targetTotals = new Map(
    targets.map((target) => [
      target,
      edges.filter((edge) => edge.target === target).reduce((sum, edge) => sum + edge.value, 0),
    ]),
  );
  const maxTotal = Math.max(1, ...sourceTotals.values(), ...targetTotals.values());
  const nodeWidth = 14;
  const sourcePositions = new Map<string, { y: number; height: number }>();
  const targetPositions = new Map<string, { y: number; height: number }>();
  const position = (
    names: readonly string[],
    totals: Map<string, number>,
    output: Map<string, { y: number; height: number }>,
  ) => {
    const gap = 12;
    const available = Math.max(1, plot.height - gap * Math.max(0, names.length - 1));
    const sum = names.reduce((total, name) => total + (totals.get(name) ?? 0), 0) || 1;
    let y = plot.y;
    names.forEach((name) => {
      const height = Math.max(10, ((totals.get(name) ?? 0) / sum) * available);
      output.set(name, { y, height });
      y += height + gap;
    });
  };
  position(sources, sourceTotals, sourcePositions);
  position(targets, targetTotals, targetPositions);
  const sourceOffsets = new Map<string, number>();
  const targetOffsets = new Map<string, number>();
  const nodes: SceneNode[] = [];
  edges.forEach((edge, index) => {
    const source = sourcePositions.get(edge.source);
    const target = targetPositions.get(edge.target);
    if (source === undefined || target === undefined) return;
    const sourceHeight = Math.max(
      2,
      (edge.value / (sourceTotals.get(edge.source) ?? maxTotal)) * source.height,
    );
    const targetHeight = Math.max(
      2,
      (edge.value / (targetTotals.get(edge.target) ?? maxTotal)) * target.height,
    );
    const sy = source.y + (sourceOffsets.get(edge.source) ?? 0);
    const ty = target.y + (targetOffsets.get(edge.target) ?? 0);
    sourceOffsets.set(edge.source, (sourceOffsets.get(edge.source) ?? 0) + sourceHeight);
    targetOffsets.set(edge.target, (targetOffsets.get(edge.target) ?? 0) + targetHeight);
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:flow:${edge.rowIndex}`, {
        zIndex: layer.zIndex - 0.5,
        opacity: Math.min(0.75, layer.mark.opacity * 0.55),
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex: edge.rowIndex, datum: table.row(edge.rowIndex) },
      }),
      points: [
        { x: plot.x + nodeWidth, y: sy },
        { x: plot.x + plot.width * 0.46, y: sy },
        { x: plot.x + plot.width * 0.54, y: ty },
        { x: plot.x + plot.width - nodeWidth, y: ty },
        { x: plot.x + plot.width - nodeWidth, y: ty + targetHeight },
        { x: plot.x + plot.width * 0.54, y: ty + targetHeight },
        { x: plot.x + plot.width * 0.46, y: sy + sourceHeight },
        { x: plot.x + nodeWidth, y: sy + sourceHeight },
      ],
      closed: true,
      fill: theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus,
      lineWidth: 0,
    });
  });
  sources.forEach((name, index) => {
    const item = sourcePositions.get(name);
    if (item === undefined) return;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:source:${index}`, { zIndex: layer.zIndex }),
      x: plot.x,
      y: item.y,
      width: nodeWidth,
      height: item.height,
      fill: theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus,
      lineWidth: 0,
      cornerRadius: 2,
    });
    nodes.push(
      textNode(
        `${layer.id}:source-label:${index}`,
        plot.x + nodeWidth + 5,
        item.y + item.height / 2,
        name,
        context,
        { align: 'left', size: 10 },
      ),
    );
  });
  targets.forEach((name, index) => {
    const item = targetPositions.get(name);
    if (item === undefined) return;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:target:${index}`, { zIndex: layer.zIndex }),
      x: plot.x + plot.width - nodeWidth,
      y: item.y,
      width: nodeWidth,
      height: item.height,
      fill:
        theme.colors.palette[(sources.length + index) % theme.colors.palette.length] ??
        theme.colors.focus,
      lineWidth: 0,
      cornerRadius: 2,
    });
    nodes.push(
      textNode(
        `${layer.id}:target-label:${index}`,
        plot.x + plot.width - nodeWidth - 5,
        item.y + item.height / 2,
        name,
        context,
        { align: 'right', size: 10 },
      ),
    );
  });
  return nodes;
};

export const compileTableMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const columns = optionStrings(layer.mark.options, 'columns')?.filter((field) =>
    table.has(field),
  ) ?? [layer.x.field, layer.y.field];
  const uniqueColumns = [...new Set(columns)];
  const headerHeight = 30;
  const rowHeight = Math.max(22, optionNumber(layer.mark.options, 'rowHeight', 28));
  const maximumRows = Math.max(0, Math.floor((plot.height - headerHeight) / rowHeight));
  const visibleRows = Math.min(table.length, maximumRows);
  const columnWidth = plot.width / Math.max(1, uniqueColumns.length);
  const nodes: SceneNode[] = [];
  uniqueColumns.forEach((field, columnIndex) => {
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:header-cell:${columnIndex}`, { zIndex: layer.zIndex }),
      x: plot.x + columnIndex * columnWidth,
      y: plot.y,
      width: columnWidth,
      height: headerHeight,
      fill: theme.colors.grid,
      stroke: theme.colors.axis,
      lineWidth: 0.5,
      cornerRadius: 0,
    });
    nodes.push(
      textNode(
        `${layer.id}:header-label:${columnIndex}`,
        plot.x + columnIndex * columnWidth + 8,
        plot.y + headerHeight / 2,
        field,
        context,
        { align: 'left', size: 10, weight: 700 },
      ),
    );
  });
  for (let rowIndex = 0; rowIndex < visibleRows; rowIndex += 1) {
    uniqueColumns.forEach((field, columnIndex) => {
      const y = plot.y + headerHeight + rowIndex * rowHeight;
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:cell:${rowIndex}:${columnIndex}`, {
          zIndex: layer.zIndex,
          opacity: layer.mark.opacity,
          interactive: performance.enableHitTesting,
          datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
        }),
        x: plot.x + columnIndex * columnWidth,
        y,
        width: columnWidth,
        height: rowHeight,
        fill: rowIndex % 2 === 0 ? theme.colors.surface : theme.colors.background,
        stroke: theme.colors.grid,
        lineWidth: 0.5,
        cornerRadius: 0,
      });
      nodes.push(
        textNode(
          `${layer.id}:cell-label:${rowIndex}:${columnIndex}`,
          plot.x + columnIndex * columnWidth + 8,
          y + rowHeight / 2,
          String(table.value(rowIndex, field) ?? ''),
          context,
          { align: 'left', size: 10 },
        ),
      );
    });
  }
  return nodes;
};

function compileTimeline(
  context: Parameters<MarkCompiler>[0],
  gantt: boolean,
): readonly SceneNode[] {
  const { table, layer, xScale, yScale, theme, performance } = context;
  const endField = layer.mark.fields.end ?? 'end';
  const progressField = layer.mark.fields.progress;
  const idField = layer.mark.fields.id;
  const dependencyField = layer.mark.fields.dependencies;
  const barHeight = Math.max(8, yScale instanceof BandScale ? yScale.bandwidth * 0.58 : 18);
  const nodes: SceneNode[] = [];
  const positions = new Map<string, { x: number; y: number; width: number }>();
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const start = scaleInput(table.value(rowIndex, layer.x.field));
    const end = table.has(endField) ? scaleInput(table.value(rowIndex, endField)) : null;
    const row = scaleInput(table.value(rowIndex, layer.y.field));
    if (start === null || end === null || row === null) continue;
    const x1 = xScale.map(start);
    const x2 = xScale.map(end);
    const y = yScale.map(row);
    if (![x1, x2, y].every(Number.isFinite)) continue;
    const fill = theme.colors.palette[rowIndex % theme.colors.palette.length] ?? theme.colors.focus;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:${gantt ? 'task' : 'interval'}:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      x: Math.min(x1, x2),
      y: y - barHeight / 2,
      width: Math.max(2, Math.abs(x2 - x1)),
      height: barHeight,
      fill: layer.mark.fill ?? fill,
      ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
      lineWidth: layer.mark.lineWidth ?? 0,
      cornerRadius: layer.mark.cornerRadius ?? 4,
    });
    if (gantt && progressField !== undefined && table.has(progressField)) {
      const progress = numericDataValue(table.value(rowIndex, progressField));
      if (progress !== null) {
        nodes.push({
          type: 'rect',
          ...nodeBase(`${layer.id}:progress:${rowIndex}`, {
            zIndex: layer.zIndex + 0.1,
            opacity: 0.45,
          }),
          x: Math.min(x1, x2),
          y: y - barHeight / 2,
          width: Math.max(0, (Math.abs(x2 - x1) * Math.max(0, Math.min(100, progress))) / 100),
          height: barHeight,
          fill: theme.colors.text,
          lineWidth: 0,
          cornerRadius: layer.mark.cornerRadius ?? 4,
        });
      }
    }
    if (idField !== undefined && table.has(idField)) {
      positions.set(String(table.value(rowIndex, idField)), {
        x: Math.max(x1, x2),
        y,
        width: Math.abs(x2 - x1),
      });
    }
  }
  if (
    gantt &&
    dependencyField !== undefined &&
    idField !== undefined &&
    table.has(dependencyField)
  ) {
    for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
      const id = String(table.value(rowIndex, idField) ?? '');
      const task = positions.get(id);
      const dependencies = String(table.value(rowIndex, dependencyField) ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      if (task === undefined) continue;
      dependencies.forEach((dependency, index) => {
        const parent = positions.get(dependency);
        if (parent === undefined) return;
        nodes.push({
          type: 'line',
          ...nodeBase(`${layer.id}:dependency:${rowIndex}:${index}`, {
            zIndex: layer.zIndex + 0.5,
          }),
          x1: parent.x,
          y1: parent.y,
          x2: task.x - task.width,
          y2: task.y,
          stroke: theme.colors.axis,
          lineWidth: 1.2,
          dash: [4, 2],
        });
      });
    }
  }
  return nodes;
}

export const compileTimelineMark: MarkCompiler = (context) => compileTimeline(context, false);
export const compileGanttMark: MarkCompiler = (context) => compileTimeline(context, true);

export const compileTreemapMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const items: { rowIndex: number; label: string; value: number }[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const label = table.value(rowIndex, layer.x.field);
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (label === null || label === undefined || value === null || value <= 0) continue;
    items.push({ rowIndex, label: String(label), value });
  }
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return [];
  const nodes: SceneNode[] = [];
  let x = plot.x;
  items.forEach((item, index) => {
    const width =
      index === items.length - 1 ? plot.x + plot.width - x : (item.value / total) * plot.width;
    const fill = theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:treemap:${item.rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
      }),
      x,
      y: plot.y,
      width: Math.max(1, width),
      height: plot.height,
      fill: layer.mark.fill ?? fill,
      stroke: theme.colors.background,
      lineWidth: 2,
      cornerRadius: layer.mark.cornerRadius ?? 3,
    });
    if (width > 42) {
      nodes.push(
        textNode(
          `${layer.id}:treemap-label:${item.rowIndex}`,
          x + width / 2,
          plot.y + plot.height / 2,
          item.label,
          context,
          { size: Math.max(9, Math.min(15, width / 8)), weight: 700, fill: '#ffffff' },
        ),
      );
    }
    x += width;
  });
  return nodes;
};

export const compileWordTreeMark: MarkCompiler = (context) => {
  const { layer, plot, theme, table, performance } = context;
  const items = treeItems(context);
  const depths = treeDepths(items);
  const groups = new Map<number, TreeItem[]>();
  items.forEach((item) => {
    const depth = depths.get(item.id) ?? 0;
    const group = groups.get(depth) ?? [];
    group.push(item);
    groups.set(depth, group);
  });
  const maxDepth = Math.max(0, ...groups.keys());
  const positions = new Map<string, Point>();
  for (const [depth, group] of groups) {
    group.forEach((item, index) => {
      positions.set(item.id, {
        x: plot.x + (plot.width * (depth + 0.5)) / Math.max(1, maxDepth + 1),
        y: plot.y + (plot.height * (index + 1)) / (group.length + 1),
      });
    });
  }
  const maximumWeight = Math.max(1, ...items.map((item) => item.weight));
  const nodes: SceneNode[] = [];
  items.forEach((item) => {
    const position = positions.get(item.id);
    const parent = positions.get(item.parent);
    if (position === undefined) return;
    if (parent !== undefined) {
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:branch:${item.rowIndex}`, { zIndex: layer.zIndex - 1 }),
        x1: parent.x,
        y1: parent.y,
        x2: position.x,
        y2: position.y,
        stroke: theme.colors.grid,
        lineWidth: 1.5,
      });
    }
    const fontSize = 10 + Math.sqrt(item.weight / maximumWeight) * 16;
    const label = textNode(
      `${layer.id}:word:${item.rowIndex}`,
      position.x,
      position.y,
      item.id,
      context,
      {
        size: fontSize,
        weight: 650,
        fill:
          theme.colors.palette[(depths.get(item.id) ?? 0) % theme.colors.palette.length] ??
          theme.colors.focus,
      },
    );
    Object.assign(label, {
      interactive: performance.enableHitTesting,
      datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
    });
    nodes.push(label);
  });
  return nodes;
};
