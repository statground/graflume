import type { MarkCompiler } from '../compiler/types.js';
import { safeDateTimeFormatter, temporalTimestamp } from '../format/temporal.js';
import { BandScale } from '../scale/band.js';
import { nodeBase } from '../scene/factory.js';
import type { LineNode, PathNode, Point, RectNode, SceneNode, TextNode } from '../scene/types.js';
import { categoricalColor, colorWithOpacity, mixColor, readableTextColor } from '../theme/color.js';
import {
  isGeographicPosition,
  geographicPositionInView,
  naturalEarthCountry,
  projectGeographicPosition,
  resolveGeographicMapView,
  worldBasemapNodes,
  worldCountryOverlayNodes,
} from './geographic.js';
import { mappedContinuousColor, numericDataValue, scaleInput, themedPointFill } from './utils.js';

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

export const compileCalendarMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const values: { rowIndex: number; date: Date; value: number }[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const rawDate = table.value(rowIndex, layer.x.field);
    const timestamp = temporalTimestamp(rawDate, true);
    const date = timestamp === null ? undefined : new Date(timestamp);
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (date === undefined || value === null) continue;
    values.push({ rowIndex, date, value });
  }
  if (values.length === 0) return [];
  values.sort((left, right) => left.date.getTime() - right.date.getTime());
  const minimum = Math.min(...values.map((item) => item.value));
  const maximum = Math.max(...values.map((item) => item.value));
  const first = values[0]?.date;
  if (first === undefined) return [];
  const calendarYear = first.getUTCFullYear();
  const start = new Date(Date.UTC(calendarYear, 0, 1));
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
  const monthPositions = new Map<number, number>();
  values.forEach((item) => {
    const offset = Math.floor((item.date.getTime() - start.getTime()) / day);
    const week = Math.floor((offset + start.getUTCDay()) / 7);
    const month = item.date.getUTCMonth();
    if (!monthPositions.has(month)) monthPositions.set(month, week);
  });
  const monthFormatter = safeDateTimeFormatter(context.locale, {
    month: 'short',
    timeZone: 'UTC',
  });
  monthPositions.forEach((week, month) => {
    nodes.push(
      textNode(
        `${layer.id}:month:${month}`,
        originX + week * (cell + gap),
        plot.y + 7,
        monthFormatter.format(new Date(Date.UTC(calendarYear, month, 1))),
        context,
        { align: 'left', size: 9, weight: 650, fill: theme.colors.mutedText },
      ),
    );
  });
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
      fill: layer.mark.fill ?? mappedContinuousColor(theme, ratio, 'endpoints'),
      stroke: theme.colors.background,
      lineWidth: 0.5,
      cornerRadius: Math.min(2, cell * 0.15),
    });
  });
  return nodes;
};

export const compileGeoMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const view = resolveGeographicMapView(context);
  const countryIds = new Set(view.countries.map((country) => country[0]));
  const nodes: SceneNode[] = worldBasemapNodes(context, view);
  const rows: {
    readonly rowIndex: number;
    readonly value: number;
    readonly country: NonNullable<ReturnType<typeof naturalEarthCountry>>;
  }[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const region = String(table.value(rowIndex, layer.x.field) ?? '').trim();
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const country = naturalEarthCountry(region);
    if (country === undefined || value === null || !countryIds.has(country[0])) continue;
    rows.push({ rowIndex, value, country });
  }
  if (rows.length === 0) return nodes;
  const minimum = Math.min(...rows.map(({ value }) => value));
  const maximum = Math.max(...rows.map(({ value }) => value));
  const mode = optionString(layer.mark.options, 'mode') ?? 'bubble';
  for (const { rowIndex, value, country } of rows) {
    const ratio = maximum === minimum ? 0.6 : (value - minimum) / (maximum - minimum);
    const fill =
      layer.mark.fill ??
      themedPointFill(theme, context.color, theme.mark.defaultColor ?? theme.colors.focus);
    if (mode === 'choropleth') {
      nodes.push(
        ...worldCountryOverlayNodes(
          context,
          country,
          rowIndex,
          layer.mark.fill ?? mappedContinuousColor(theme, ratio, 'endpoints'),
          view,
        ),
      );
      continue;
    }
    const point = projectGeographicPosition(plot, country[5], country[6], view);
    const radius = 5 + Math.sqrt(Math.max(0, ratio)) * 12;
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:region-halo:${rowIndex}`, {
        zIndex: layer.zIndex - 0.1,
      }),
      cx: point.x,
      cy: point.y,
      radius: radius + 4,
      fill: colorWithOpacity(fill, theme.mode === 'dark' ? 0.2 : 0.14),
      lineWidth: 0,
    });
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
      radius,
      fill,
      stroke: theme.colors.background,
      lineWidth: 1.5,
    });
  }
  return nodes;
};

export const compileMapMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const view = resolveGeographicMapView(context);
  const nodes: SceneNode[] = worldBasemapNodes(context, view);
  const sizeField = layer.mark.fields.size;
  const extent = sizeField === undefined || !table.has(sizeField) ? null : table.extent(sizeField);
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const longitude = numericDataValue(table.value(rowIndex, layer.x.field));
    const latitude = numericDataValue(table.value(rowIndex, layer.y.field));
    if (longitude === null || latitude === null || !isGeographicPosition(longitude, latitude))
      continue;
    if (!geographicPositionInView(longitude, latitude, view)) continue;
    const rawSize =
      sizeField === undefined ? null : numericDataValue(table.value(rowIndex, sizeField));
    const ratio =
      rawSize === null || extent === null || extent[1] === extent[0]
        ? 0.5
        : (rawSize - extent[0]) / (extent[1] - extent[0]);
    const point = projectGeographicPosition(plot, longitude, latitude, view);
    const radius = layer.mark.radius ?? 5 + Math.sqrt(Math.max(0, ratio)) * 10;
    const fill = layer.mark.fill ?? theme.colors.focus;
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:map-halo:${rowIndex}`, { zIndex: layer.zIndex - 0.1 }),
      cx: point.x,
      cy: point.y,
      radius: radius + 4,
      fill: colorWithOpacity(fill, theme.mode === 'dark' ? 0.2 : 0.14),
      lineWidth: 0,
    });
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
      radius,
      fill,
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
    const middleY = parent.y + (position.y - parent.y) / 2;
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:edge:${item.rowIndex}`, { zIndex: layer.zIndex - 1 }),
      points: [
        { x: parent.x, y: parent.y + nodeHeight / 2 },
        { x: parent.x, y: middleY },
        { x: position.x, y: middleY },
        { x: position.x, y: position.y - nodeHeight / 2 },
      ],
      closed: false,
      stroke: theme.colors.axis,
      lineWidth: 1.4,
      lineCap: 'round',
      lineJoin: 'round',
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
      stroke: layer.mark.stroke ?? theme.colors.axis,
      lineWidth: layer.mark.lineWidth ?? 1.2,
      cornerRadius: layer.mark.cornerRadius ?? 9,
    });
    const depth = depths.get(item.id) ?? 0;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:node-accent:${item.rowIndex}`, {
        zIndex: layer.zIndex + 0.1,
      }),
      x: position.x - nodeWidth / 2 + 1,
      y: position.y - nodeHeight / 2 + 1,
      width: nodeWidth - 2,
      height: 4,
      fill: categoricalColor(theme, depth, maxDepth + 1),
      lineWidth: 0,
      cornerRadius: 4,
    });
    nodes.push(
      textNode(
        `${layer.id}:node-label:${item.rowIndex}`,
        position.x,
        position.y,
        item.id,
        context,
        { size: 10.5, weight: 700 },
      ),
    );
  });
  return nodes;
};

function cubicPoint(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
  ratio: number,
): Point {
  const inverse = 1 - ratio;
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * ratio * control1.x +
      3 * inverse * ratio ** 2 * control2.x +
      ratio ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * ratio * control1.y +
      3 * inverse * ratio ** 2 * control2.y +
      ratio ** 3 * end.y,
  };
}

function sankeyBandPoints(
  sourceX: number,
  sourceY: number,
  sourceHeight: number,
  targetX: number,
  targetY: number,
  targetHeight: number,
): Point[] {
  const controlOffset = (targetX - sourceX) * 0.44;
  const sample = (startY: number, endY: number): Point[] =>
    Array.from({ length: 13 }, (_, index) => {
      const ratio = index / 12;
      return cubicPoint(
        { x: sourceX, y: startY },
        { x: sourceX + controlOffset, y: startY },
        { x: targetX - controlOffset, y: endY },
        { x: targetX, y: endY },
        ratio,
      );
    });
  return [
    ...sample(sourceY, targetY),
    ...sample(sourceY + sourceHeight, targetY + targetHeight).reverse(),
  ];
}

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
      points: sankeyBandPoints(
        plot.x + nodeWidth,
        sy,
        sourceHeight,
        plot.x + plot.width - nodeWidth,
        ty,
        targetHeight,
      ),
      closed: true,
      fill: layer.mark.fill ?? categoricalColor(theme, index, edges.length),
      lineWidth: 0,
      lineJoin: 'round',
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
      fill: layer.mark.fill ?? categoricalColor(theme, index, sources.length + targets.length),
      lineWidth: 0,
      cornerRadius: 4,
    });
    nodes.push(
      textNode(
        `${layer.id}:source-label:${index}`,
        plot.x + nodeWidth + 5,
        item.y + item.height / 2,
        name,
        context,
        { align: 'left', size: 10.5, weight: 650 },
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
        layer.mark.fill ??
        categoricalColor(theme, sources.length + index, sources.length + targets.length),
      lineWidth: 0,
      cornerRadius: 4,
    });
    nodes.push(
      textNode(
        `${layer.id}:target-label:${index}`,
        plot.x + plot.width - nodeWidth - 5,
        item.y + item.height / 2,
        name,
        context,
        { align: 'right', size: 10.5, weight: 650 },
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
      fill: mixColor(
        theme.colors.surface,
        theme.colors.focus,
        theme.mode === 'dark' ? 0.08 : 0.045,
      ),
      stroke: theme.colors.grid,
      lineWidth: 0.75,
      cornerRadius: 0,
    });
    nodes.push(
      textNode(
        `${layer.id}:header-label:${columnIndex}`,
        plot.x + columnIndex * columnWidth + 8,
        plot.y + headerHeight / 2,
        field,
        context,
        { align: 'left', size: 10.5, weight: 750 },
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
        fill: rowIndex % 2 === 0 ? theme.colors.background : theme.colors.surface,
        stroke: theme.colors.grid,
        lineWidth: 0.65,
        cornerRadius: 0,
      });
      nodes.push(
        textNode(
          `${layer.id}:cell-label:${rowIndex}:${columnIndex}`,
          plot.x + columnIndex * columnWidth + 8,
          y + rowHeight / 2,
          String(table.value(rowIndex, field) ?? ''),
          context,
          { align: 'left', size: 10.5, weight: 500 },
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
    const fill = categoricalColor(theme, rowIndex, table.length);
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
      cornerRadius: layer.mark.cornerRadius ?? 6,
    });
    if (gantt && progressField !== undefined && table.has(progressField)) {
      const progress = numericDataValue(table.value(rowIndex, progressField));
      if (progress !== null) {
        nodes.push({
          type: 'rect',
          ...nodeBase(`${layer.id}:progress:${rowIndex}`, {
            zIndex: layer.zIndex + 0.1,
            opacity: 0.58,
          }),
          x: Math.min(x1, x2),
          y: y - barHeight / 2,
          width: Math.max(0, (Math.abs(x2 - x1) * Math.max(0, Math.min(100, progress))) / 100),
          height: barHeight,
          fill: mixColor(fill, theme.colors.text, theme.mode === 'dark' ? 0.18 : 0.26),
          lineWidth: 0,
          cornerRadius: layer.mark.cornerRadius ?? 6,
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
          lineCap: 'round',
        });
      });
    }
  }
  return nodes;
}

export const compileTimelineMark: MarkCompiler = (context) => compileTimeline(context, false);
export const compileGanttMark: MarkCompiler = (context) => compileTimeline(context, true);

interface TreemapItem {
  readonly rowIndex: number;
  readonly label: string;
  readonly value: number;
}

interface TreemapTile extends TreemapItem {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface IcicleItem extends TreemapItem {
  readonly parent?: string;
}

interface IcicleNode extends IcicleItem {
  readonly children: IcicleNode[];
}

function compileIcicleMark(context: Parameters<MarkCompiler>[0]): readonly SceneNode[] {
  const { table, layer, plot, theme, performance } = context;
  const parentField = layer.mark.fields.parent ?? 'parent';
  const items: IcicleItem[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const rawLabel = table.value(rowIndex, layer.x.field);
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (rawLabel === null || rawLabel === undefined || value === null || value < 0) continue;
    const rawParent = table.has(parentField) ? table.value(rowIndex, parentField) : undefined;
    const parent =
      rawParent === null || rawParent === undefined || String(rawParent).trim() === ''
        ? undefined
        : String(rawParent);
    items.push({
      rowIndex,
      label: String(rawLabel),
      value,
      ...(parent === undefined ? {} : { parent }),
    });
  }
  if (items.length === 0) return [];

  const byLabel = new Map<string, IcicleNode>();
  items.forEach((item) => byLabel.set(item.label, { ...item, children: [] }));
  const orderedNodes = [...byLabel.values()];
  const parentByNode = new Map<IcicleNode, IcicleNode>();
  orderedNodes.forEach((node) => {
    const parent = node.parent === undefined ? undefined : byLabel.get(node.parent);
    if (parent !== undefined && parent !== node) parentByNode.set(node, parent);
  });

  // Each node has at most one parent, so cycles can be broken in linear time by
  // walking the parent chains once. Breaking the first repeated edge keeps the
  // result deterministic while making every malformed component renderable.
  const resolved = new Set<IcicleNode>();
  orderedNodes.forEach((start) => {
    if (resolved.has(start)) return;
    const path: IcicleNode[] = [];
    const positions = new Map<IcicleNode, number>();
    let cursor: IcicleNode | undefined = start;
    while (cursor !== undefined && !resolved.has(cursor)) {
      if (positions.has(cursor)) {
        parentByNode.delete(cursor);
        break;
      }
      positions.set(cursor, path.length);
      path.push(cursor);
      cursor = parentByNode.get(cursor);
    }
    path.forEach((node) => resolved.add(node));
  });

  parentByNode.forEach((parent, node) => parent.children.push(node));
  const roots = orderedNodes.filter((node) => !parentByNode.has(node));

  // Memoize subtree weight and depth in one iterative leaf-to-root pass. This
  // avoids both the previous repeated subtree scans and call-stack exhaustion
  // on deep, valid hierarchies without allocating one frame object per edge.
  const weights = new Map<IcicleNode, number>();
  const depths = new Map<IcicleNode, number>();
  const remainingChildren = new Map<IcicleNode, number>();
  const accumulatedWeights = new Map<IcicleNode, number>();
  const accumulatedDepths = new Map<IcicleNode, number>();
  const ready: IcicleNode[] = [];
  orderedNodes.forEach((node) => {
    remainingChildren.set(node, node.children.length);
    if (node.children.length === 0) ready.push(node);
  });
  for (let readyIndex = 0; readyIndex < ready.length; readyIndex += 1) {
    const node = ready[readyIndex];
    if (node === undefined) continue;
    const weight = Math.max(node.value, accumulatedWeights.get(node) ?? 0, 0.000001);
    const depth = 1 + (accumulatedDepths.get(node) ?? 0);
    weights.set(node, weight);
    depths.set(node, depth);
    const parent = parentByNode.get(node);
    if (parent === undefined) continue;
    accumulatedWeights.set(parent, (accumulatedWeights.get(parent) ?? 0) + weight);
    accumulatedDepths.set(parent, Math.max(accumulatedDepths.get(parent) ?? 0, depth));
    const remaining = (remainingChildren.get(parent) ?? 1) - 1;
    remainingChildren.set(parent, remaining);
    if (remaining === 0) ready.push(parent);
  }

  let maxDepth = 1;
  roots.forEach((root) => {
    maxDepth = Math.max(maxDepth, depths.get(root) ?? 1);
  });
  const levelHeight = plot.height / maxDepth;
  const rootTotal = roots.reduce((sum, root) => sum + (weights.get(root) ?? 0), 0);
  const nodes: SceneNode[] = [];
  const markBudget = Math.max(1, Math.floor(performance.maxBarMarks));
  interface IcicleFrame {
    readonly node: IcicleNode;
    readonly level: number;
    readonly x: number;
    readonly width: number;
    readonly colorIndex: number;
  }
  const renderStack: IcicleFrame[] = [];
  let rootX = plot.x;
  const rootFrames: IcicleFrame[] = [];
  roots.forEach((root, rootIndex) => {
    const rootWidth = plot.width * ((weights.get(root) ?? 0) / Math.max(rootTotal, 0.000001));
    if (rootIndex < markBudget) {
      rootFrames.push({ node: root, level: 0, x: rootX, width: rootWidth, colorIndex: rootIndex });
    }
    rootX += rootWidth;
  });
  for (let index = rootFrames.length - 1; index >= 0; index -= 1) {
    const frame = rootFrames[index];
    if (frame !== undefined) renderStack.push(frame);
  }

  let renderedMarks = 0;
  while (renderStack.length > 0 && renderedMarks < markBudget) {
    const frame = renderStack.pop();
    if (frame === undefined || frame.width <= 0) continue;
    const { node, level, x, width, colorIndex } = frame;
    const gap = Math.min(1.5, levelHeight * 0.12, width * 0.02);
    const y = plot.y + level * levelHeight;
    const fill =
      layer.mark.fill ??
      mixColor(
        categoricalColor(theme, colorIndex, items.length),
        theme.colors.background,
        Math.min(0.5, level * 0.1),
      );
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:icicle:${node.rowIndex}`, {
        zIndex: layer.zIndex + level * 0.01,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: {
          layerId: layer.id,
          rowIndex: node.rowIndex,
          datum: table.row(node.rowIndex),
          tooltip: { label: node.label, value: node.value, depth: level },
        },
      }),
      x: x + gap,
      y: y + gap,
      width: Math.max(1, width - gap * 2),
      height: Math.max(1, levelHeight - gap * 2),
      fill,
      stroke: colorWithOpacity(theme.colors.background, 0.78),
      lineWidth: 1,
      cornerRadius: layer.mark.cornerRadius ?? 3,
    });
    renderedMarks += 1;
    if (width > 42 && levelHeight > 20) {
      nodes.push(
        textNode(
          `${layer.id}:icicle-label:${node.rowIndex}`,
          x + 8,
          y + levelHeight / 2,
          node.label,
          context,
          {
            align: 'left',
            size: Math.max(8, Math.min(12, levelHeight * 0.28)),
            weight: 700,
            fill: readableTextColor(fill, '#ffffff', '#0f172a'),
          },
        ),
      );
    }
    if (node.children.length === 0 || level + 1 >= maxDepth) continue;
    const childTotal = node.children.reduce((sum, child) => sum + (weights.get(child) ?? 0), 0);
    let childX = x;
    const childFrames: IcicleFrame[] = [];
    const childLimit = Math.min(node.children.length, markBudget - renderedMarks);
    for (let childIndex = 0; childIndex < childLimit; childIndex += 1) {
      const child = node.children[childIndex];
      if (child === undefined) continue;
      const childWidth = width * ((weights.get(child) ?? 0) / Math.max(childTotal, 0.000001));
      childFrames.push({
        node: child,
        level: level + 1,
        x: childX,
        width: childWidth,
        colorIndex: colorIndex + childIndex + 1,
      });
      childX += childWidth;
    }
    for (let index = childFrames.length - 1; index >= 0; index -= 1) {
      const childFrame = childFrames[index];
      if (childFrame !== undefined) renderStack.push(childFrame);
    }
  }
  return nodes;
}

function layoutTreemap(
  items: readonly TreemapItem[],
  rectangle: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
): TreemapTile[] {
  if (items.length === 0) return [];
  const first = items[0];
  if (items.length === 1 && first !== undefined) return [{ ...first, ...rectangle }];

  const total = items.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;
  let splitIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < items.length; index += 1) {
    cumulative += items[index - 1]?.value ?? 0;
    const distance = Math.abs(total / 2 - cumulative);
    if (distance < bestDistance) {
      bestDistance = distance;
      splitIndex = index;
    }
  }
  const leading = items.slice(0, splitIndex);
  const trailing = items.slice(splitIndex);
  const leadingValue = leading.reduce((sum, item) => sum + item.value, 0);
  const ratio = total <= 0 ? 0.5 : leadingValue / total;

  if (rectangle.width >= rectangle.height) {
    const leadingWidth = rectangle.width * ratio;
    return [
      ...layoutTreemap(leading, { ...rectangle, width: leadingWidth }),
      ...layoutTreemap(trailing, {
        x: rectangle.x + leadingWidth,
        y: rectangle.y,
        width: rectangle.width - leadingWidth,
        height: rectangle.height,
      }),
    ];
  }
  const leadingHeight = rectangle.height * ratio;
  return [
    ...layoutTreemap(leading, { ...rectangle, height: leadingHeight }),
    ...layoutTreemap(trailing, {
      x: rectangle.x,
      y: rectangle.y + leadingHeight,
      width: rectangle.width,
      height: rectangle.height - leadingHeight,
    }),
  ];
}

export const compileTreemapMark: MarkCompiler = (context) => {
  if (context.layer.mark.options.mode === 'icicle') return compileIcicleMark(context);
  const { table, layer, plot, theme, performance } = context;
  const items: TreemapItem[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const label = table.value(rowIndex, layer.x.field);
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    if (label === null || label === undefined || value === null || value <= 0) continue;
    items.push({ rowIndex, label: String(label), value });
  }
  if (items.length === 0) return [];
  const nodes: SceneNode[] = [];
  const tiles = layoutTreemap(items, plot);
  tiles.forEach((item, index) => {
    const base = categoricalColor(theme, index, tiles.length);
    const fill = mixColor(base, theme.colors.background, theme.mode === 'dark' ? 0.06 : 0.02);
    const gap = 2;
    const x = item.x + gap;
    const y = item.y + gap;
    const width = Math.max(1, item.width - gap * 2);
    const height = Math.max(1, item.height - gap * 2);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:treemap:${item.rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
      }),
      x,
      y,
      width,
      height,
      fill: layer.mark.fill ?? fill,
      stroke: colorWithOpacity(theme.colors.background, 0.72),
      lineWidth: 1,
      cornerRadius: layer.mark.cornerRadius ?? 7,
    });
    if (width > 52 && height > 30) {
      const labelColor = readableTextColor(layer.mark.fill ?? fill, '#ffffff', '#0f172a');
      nodes.push(
        textNode(
          `${layer.id}:treemap-label:${item.rowIndex}`,
          x + 10,
          y + 13,
          item.label,
          context,
          {
            align: 'left',
            baseline: 'top',
            size: Math.max(9, Math.min(14, Math.min(width, height) / 6)),
            weight: 750,
            fill: labelColor,
          },
        ),
      );
      if (height > 52) {
        nodes.push(
          textNode(
            `${layer.id}:treemap-value:${item.rowIndex}`,
            x + 10,
            y + height - 10,
            String(item.value),
            context,
            {
              align: 'left',
              baseline: 'bottom',
              size: 10,
              weight: 600,
              fill: colorWithOpacity(labelColor, 0.82),
            },
          ),
        );
      }
    }
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
        lineWidth: 1.6,
        lineCap: 'round',
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
        fill: categoricalColor(theme, depths.get(item.id) ?? 0, maxDepth + 1),
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
