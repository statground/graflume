import type { MarkCompileContext, MarkCompiler } from '../compiler/types.js';
import { GraflumeError } from '../core/errors.js';
import {
  analyzeSets,
  buildWordTree,
  chordMatrixToEdges,
  funnelStages,
  hitSetRegion,
  layoutChord,
  layoutFlow,
  layoutHierarchy,
  layoutWordCloud,
  projectParallelRows,
  querySetRegion,
  tokenizeWords,
  traverseFlowPath,
  type ChordEdge,
  type ChordMatrixInput,
  type FlowEdge,
  type FunnelStageInput,
  type HierarchyDatum,
  type ParallelAxis,
  type ParallelBrush,
  type SetIntersectionDatum,
  type SetMembershipDatum,
  type WordTokenOptions,
} from '../data/structured-analytics.js';
import {
  layoutNetwork,
  selectNetworkNodes,
  type NetworkEdgeInput,
  type NetworkNodeInput,
} from '../data/network-analytics.js';
import { nodeBase } from '../scene/factory.js';
import type { FamilyDatumInteraction, Point, SceneNode, TextNode } from '../scene/types.js';
import type { DataRow, DataValue, JsonValue } from '../spec/types.js';
import { categoricalColor, colorWithOpacity, readableTextColor } from '../theme/color.js';
import {
  compileChordMark,
  compileFunnelMark,
  compileGraphMark,
  compileParallelMark,
  compileTreeMark,
} from './advanced.js';
import { compileVennMark, compileWordCloudMark } from './series.js';
import { compileSankeyMark, compileWordTreeMark, sankeyBandPoints } from './structured.js';

const TAU = Math.PI * 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function stringValue(value: DataValue): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(String).join(', ');
  return String(value);
}

function numericValue(value: DataValue): number | null {
  const number = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionObject(value: JsonValue | undefined): Readonly<Record<string, JsonValue>> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Readonly<Record<string, JsonValue>>)
    : null;
}

function optionNumber(value: JsonValue | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionBoolean(value: JsonValue | undefined, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function optionString<T extends string>(
  value: JsonValue | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function optionStrings(value: JsonValue | undefined): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];
}

function optionNumbers(value: JsonValue | undefined): readonly number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : [];
}

function hasAnyOption(context: MarkCompileContext, keys: readonly string[]): boolean {
  return keys.some((key) => context.layer.mark.options[key] !== undefined);
}

function rowIndex(index: number, context: MarkCompileContext): number {
  return clamp(Math.floor(index), 0, Math.max(0, context.table.length - 1));
}

function publicRow(row: DataRow): DataRow {
  return Object.fromEntries(
    Object.entries(row).filter(([field]) => !field.startsWith('__graflume_')),
  );
}

function datumBase(
  context: MarkCompileContext,
  id: string,
  index: number,
  offset = 0,
  tooltip?: DataRow,
  familyInteraction?: FamilyDatumInteraction,
) {
  const safeIndex = rowIndex(index, context);
  return nodeBase(id, {
    zIndex: context.layer.zIndex + offset,
    opacity: context.layer.mark.opacity,
    interactive: context.performance.enableHitTesting,
    datum: {
      layerId: context.layer.id,
      rowIndex: safeIndex,
      datum: publicRow(context.table.row(safeIndex)),
      ...(tooltip === undefined ? {} : { tooltip }),
      ...(familyInteraction === undefined ? {} : { familyInteraction }),
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
    readonly zIndex?: number;
  } = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: options.zIndex ?? context.layer.zIndex + 3 }),
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

function palette(context: MarkCompileContext, index: number, count: number): string {
  return categoricalColor(context.theme, index, Math.max(1, count));
}

function toPlot(context: MarkCompileContext, point: Point): Point {
  return {
    x: context.plot.x + point.x * context.plot.width,
    y: context.plot.y + point.y * context.plot.height,
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
  const count = Math.max(2, segments);
  return Array.from({ length: count + 1 }, (_, index) =>
    pointOnCircle(cx, cy, radius, start + ((end - start) * index) / count),
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
  const segments = Math.max(4, Math.ceil((Math.abs(end - start) / TAU) * 64));
  return [
    ...sampledArc(cx, cy, outerRadius, start, end, segments),
    ...sampledArc(cx, cy, innerRadius, end, start, segments),
  ];
}

function quadratic(points: readonly Point[], segments = 24): readonly Point[] {
  if (points.length !== 3) return points;
  const [start, control, end] = points as readonly [Point, Point, Point];
  return Array.from({ length: segments + 1 }, (_, index) => {
    const ratio = index / segments;
    const inverse = 1 - ratio;
    return {
      x: inverse * inverse * start.x + 2 * inverse * ratio * control.x + ratio * ratio * end.x,
      y: inverse * inverse * start.y + 2 * inverse * ratio * control.y + ratio * ratio * end.y,
    };
  });
}

function sourceRowsTooltip(indices: readonly number[]): readonly number[] {
  return [...new Set(indices)].sort((left, right) => left - right).slice(0, 256);
}

function tokenOptions(context: MarkCompileContext): WordTokenOptions {
  const options = context.layer.mark.options;
  return {
    case: optionString(options.case, ['lower', 'upper', 'preserve'], 'lower'),
    stopwords: optionStrings(options.stopwords),
    ngram: Math.floor(optionNumber(options.ngram, 1)),
    stemming: optionString(options.stemming, ['none', 'simple-en'], 'none'),
    ...(typeof options.locale === 'string' ? { locale: options.locale } : {}),
  };
}

function fieldValue(context: MarkCompileContext, index: number, field: string): DataValue {
  return context.table.has(field) ? context.table.value(index, field) : null;
}

function parsePositions(value: JsonValue | undefined): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const object = optionObject(value);
  if (object === null) return positions;
  for (const [id, raw] of Object.entries(object)) {
    const position = optionObject(raw);
    if (
      position !== null &&
      typeof position.x === 'number' &&
      Number.isFinite(position.x) &&
      typeof position.y === 'number' &&
      Number.isFinite(position.y)
    ) {
      positions[id] = { x: position.x, y: position.y };
    }
  }
  return positions;
}

export const compileAdvancedTreeMark: MarkCompiler = (context) => {
  if (
    !hasAnyOption(context, [
      'layout',
      'mode',
      'root',
      'zoomTo',
      'collapsed',
      'query',
      'padding',
      'breadcrumbs',
    ])
  )
    return compileTreeMark(context);
  if (context.table.length === 0) return [];
  const { layer, table, plot, theme } = context;
  const idField = layer.mark.fields.id ?? layer.x.field;
  const parentField = layer.mark.fields.parent ?? 'parent';
  const labelField = layer.mark.fields.label ?? idField;
  const valueField = layer.mark.fields.value ?? layer.y.field;
  const data: HierarchyDatum[] = [];
  const rows = new Map<string, number>();
  for (let index = 0; index < table.length; index += 1) {
    const id = stringValue(fieldValue(context, index, idField));
    if (id === null || id === '') continue;
    const parent = stringValue(fieldValue(context, index, parentField));
    const label = stringValue(fieldValue(context, index, labelField)) ?? id;
    const value = numericValue(fieldValue(context, index, valueField)) ?? 1;
    data.push({
      id,
      parent: parent === null || parent === '' || parent === id ? null : parent,
      label,
      value,
    });
    rows.set(id, index);
  }
  if (data.length === 0) return [];
  const mode = optionString(
    layer.mark.options.layout ?? layer.mark.options.mode,
    ['circle-pack', 'dendrogram', 'radial-tree'],
    'circle-pack',
  );
  const authoredRoot =
    typeof layer.mark.options.root === 'string' ? layer.mark.options.root : undefined;
  const zoomTo = typeof layer.mark.options.zoomTo === 'string' ? layer.mark.options.zoomTo : null;
  const collapsed = new Set(optionStrings(layer.mark.options.collapsed));
  const autoExpanded: string[] = [];
  if (zoomTo !== null) {
    const parents = new Map(data.map(({ id, parent }) => [id, parent ?? null]));
    let current: string | null | undefined = zoomTo;
    const visited = new Set<string>();
    while (current !== null && current !== undefined && !visited.has(current)) {
      visited.add(current);
      if (collapsed.delete(current)) autoExpanded.push(current);
      current = parents.get(current);
    }
  }
  const result = layoutHierarchy(data, {
    mode,
    ...(authoredRoot === undefined ? {} : { root: authoredRoot }),
    collapsed: [...collapsed],
    ...(typeof layer.mark.options.query === 'string' ? { query: layer.mark.options.query } : {}),
    padding: optionNumber(layer.mark.options.padding, 0.004),
  });
  let viewScale = 1;
  let viewCenter: Point = { x: 0.5, y: 0.5 };
  if (zoomTo !== null) {
    const target = result.nodes.find(({ id }) => id === zoomTo);
    if (target === undefined)
      throw new GraflumeError(
        'INVALID_SPEC',
        `Unknown or hidden hierarchy zoom target "${zoomTo}".`,
      );
    const byId = new Map(result.nodes.map((node) => [node.id, node]));
    const descendants = result.nodes.filter((node) => {
      let current: typeof node | undefined = node;
      const visited = new Set<string>();
      while (current !== undefined && !visited.has(current.id)) {
        if (current.id === target.id) return true;
        visited.add(current.id);
        current = current.parent === null ? undefined : byId.get(current.parent);
      }
      return false;
    });
    const minimumX = Math.min(...descendants.map(({ x, radius }) => x - radius));
    const maximumX = Math.max(...descendants.map(({ x, radius }) => x + radius));
    const minimumY = Math.min(...descendants.map(({ y, radius }) => y - radius));
    const maximumY = Math.max(...descendants.map(({ y, radius }) => y + radius));
    viewCenter = { x: (minimumX + maximumX) / 2, y: (minimumY + maximumY) / 2 };
    viewScale = Math.max(
      1,
      Math.min(
        32,
        0.84 / Math.max(0.01, maximumX - minimumX),
        0.84 / Math.max(0.01, maximumY - minimumY),
      ),
    );
  }
  const positions = new Map(
    result.nodes.map((node) => [
      node.id,
      toPlot(context, {
        x: 0.5 + (node.x - viewCenter.x) * viewScale,
        y: 0.5 + (node.y - viewCenter.y) * viewScale,
      }),
    ]),
  );
  const nodes: SceneNode[] = [];
  if (result.mode !== 'circle-pack') {
    result.links.forEach((link, index) => {
      const source = positions.get(link.source);
      const target = positions.get(link.target);
      if (source === undefined || target === undefined) return;
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:hierarchy-link:${index}`, { zIndex: layer.zIndex - 1 }),
        points:
          result.mode === 'dendrogram'
            ? [source, { x: source.x, y: target.y }, target]
            : [source, target],
        closed: false,
        stroke: colorWithOpacity(theme.colors.axis, 0.7),
        lineWidth: 1.5,
        lineCap: 'round',
        lineJoin: 'round',
      });
    });
  }
  result.nodes
    .slice()
    .sort((left, right) => left.depth - right.depth)
    .forEach((item, index) => {
      const position = positions.get(item.id)!;
      const sourceRows = sourceRowsTooltip(
        data.flatMap((candidate) => {
          let current: HierarchyDatum | undefined = candidate;
          const visited = new Set<string>();
          while (current !== undefined && !visited.has(current.id)) {
            if (current.id === item.id) return [rows.get(candidate.id) ?? 0];
            visited.add(current.id);
            current =
              current.parent === null || current.parent === undefined
                ? undefined
                : data.find(({ id }) => id === current?.parent);
          }
          return [];
        }),
      );
      const sourceRow = sourceRows[0] ?? rows.get(item.id) ?? 0;
      const radius = Math.max(4, item.radius * Math.min(plot.width, plot.height) * viewScale);
      const color = palette(
        context,
        item.depth,
        Math.max(1, ...result.nodes.map(({ depth }) => depth + 1)),
      );
      const tooltip: DataRow = {
        kind: 'hierarchy-node',
        layout: result.mode,
        id: item.id,
        parent: item.parent,
        label: item.label,
        depth: item.depth,
        value: item.value,
        aggregate: item.aggregate,
        leaf: item.leaf,
        collapsed: item.collapsed,
        matched: item.matched,
        root: result.root,
        zoomTo,
        viewScale,
        autoExpanded,
        breadcrumbs: result.breadcrumbs,
        interaction: ['collapse', 'reroot', 'zoom', 'search'],
        sourceRowIndices: sourceRows,
      };
      nodes.push({
        type: 'circle',
        ...datumBase(
          context,
          `${layer.id}:hierarchy-node:${item.id}`,
          sourceRow,
          item.depth * 0.01,
          tooltip,
          {
            kind: 'hierarchy-node',
            id: item.id,
            parent: item.parent,
            root: result.root,
            leaf: item.leaf,
            collapsed: item.collapsed,
          },
        ),
        cx: position.x,
        cy: position.y,
        radius,
        fill: colorWithOpacity(
          layer.mark.fill ?? color,
          result.mode === 'circle-pack' ? 0.25 : 0.9,
        ),
        stroke: item.matched ? theme.colors.focus : (layer.mark.stroke ?? color),
        lineWidth: item.matched ? 3 : item.collapsed ? 2.5 : (layer.mark.lineWidth ?? 1.5),
        ...(item.collapsed ? { dash: [4, 3] } : {}),
      });
      if (result.mode !== 'circle-pack' || radius >= 14 || item.id === result.root) {
        const label = textNode(
          context,
          `${layer.id}:hierarchy-label:${item.id}`,
          position.x,
          result.mode === 'circle-pack' ? position.y : position.y + radius + 9,
          item.label,
          {
            fill:
              result.mode === 'circle-pack'
                ? readableTextColor(color, '#ffffff', theme.colors.text)
                : theme.colors.mutedText,
            size: Math.max(9, theme.typography.fontSize - 1),
            weight: item.matched ? 800 : 600,
          },
        );
        nodes.push({
          ...label,
          ...datumBase(context, label.id, sourceRow, 2, tooltip, {
            kind: 'hierarchy-node',
            id: item.id,
            parent: item.parent,
            root: result.root,
            leaf: item.leaf,
            collapsed: item.collapsed,
          }),
        });
      }
      void index;
    });
  if (optionBoolean(layer.mark.options.breadcrumbs, true) && result.breadcrumbs.length > 0) {
    nodes.push(
      textNode(
        context,
        `${layer.id}:hierarchy-breadcrumbs`,
        plot.x + 4,
        plot.y + 4,
        result.breadcrumbs.join(' / '),
        {
          align: 'left',
          baseline: 'top',
          fill: theme.colors.mutedText,
          size: Math.max(9, theme.typography.fontSize - 2),
        },
      ),
    );
  }
  return nodes;
};

export const compileAdvancedSankeyMark: MarkCompiler = (context) => {
  const sourceField = context.layer.mark.fields.source ?? context.layer.x.field;
  const targetField = context.layer.mark.fields.target ?? 'target';
  const sources = new Set(
    Array.from({ length: context.table.length }, (_, index) =>
      stringValue(fieldValue(context, index, sourceField)),
    ),
  );
  const sharedNode = Array.from({ length: context.table.length }, (_, index) =>
    stringValue(fieldValue(context, index, targetField)),
  ).some((id) => id !== null && sources.has(id));
  if (
    !sharedNode &&
    !hasAnyOption(context, [
      'alignment',
      'order',
      'linkSort',
      'linkOrder',
      'iterations',
      'cycle',
      'positions',
      'balanceTolerance',
      'pathStart',
      'pathDirection',
      'nodePadding',
    ])
  )
    return compileSankeyMark(context);
  if (context.table.length === 0) return [];
  const { layer, table, plot, theme } = context;
  const valueField = layer.mark.fields.value ?? layer.y.field;
  const idField = layer.mark.fields.id;
  const edges: FlowEdge[] = [];
  const edgeRows = new Map<string, number>();
  for (let index = 0; index < table.length; index += 1) {
    const source = stringValue(fieldValue(context, index, sourceField));
    const target = stringValue(fieldValue(context, index, targetField));
    const value = numericValue(fieldValue(context, index, valueField));
    if (source === null || target === null || value === null || value < 0) continue;
    const id =
      idField === undefined
        ? `flow-${index}`
        : (stringValue(fieldValue(context, index, idField)) ?? `flow-${index}`);
    edges.push({ id, source, target, value });
    edgeRows.set(id, index);
  }
  if (edges.length === 0) return [];
  const result = layoutFlow(edges, {
    alignment: optionString(
      layer.mark.options.alignment,
      ['left', 'right', 'center', 'justify'],
      'left',
    ),
    order: optionString(layer.mark.options.order, ['input', 'ascending', 'descending'], 'input'),
    linkSort: optionString(
      layer.mark.options.linkSort,
      ['input', 'ascending', 'descending', 'authored'],
      'input',
    ),
    linkOrder: optionStrings(layer.mark.options.linkOrder),
    iterations: Math.floor(optionNumber(layer.mark.options.iterations, 8)),
    cycle: optionString(layer.mark.options.cycle, ['reject', 'allow'], 'reject'),
    positions: parsePositions(layer.mark.options.positions),
    balanceTolerance: optionNumber(layer.mark.options.balanceTolerance, 1e-9),
    nodePadding: optionNumber(layer.mark.options.nodePadding, 0.025),
  });
  const pathStart =
    typeof layer.mark.options.pathStart === 'string' ? layer.mark.options.pathStart : undefined;
  const path =
    pathStart === undefined
      ? { nodes: [] as readonly string[], links: [] as readonly string[] }
      : traverseFlowPath(
          result,
          pathStart,
          optionString(
            layer.mark.options.pathDirection,
            ['upstream', 'downstream', 'both'] as const,
            'both',
          ),
        );
  const nodeRows = new Map<string, number[]>();
  edges.forEach((edge) => {
    const index = edgeRows.get(edge.id ?? '') ?? 0;
    nodeRows.set(edge.source, [...(nodeRows.get(edge.source) ?? []), index]);
    nodeRows.set(edge.target, [...(nodeRows.get(edge.target) ?? []), index]);
  });
  const nodeWidth = Math.max(10, Math.min(18, plot.width * 0.035));
  const feedbackSpace = result.cycles.length > 0 ? Math.min(32, plot.width * 0.12) : 0;
  const flowWidth = Math.max(1, plot.width - nodeWidth - feedbackSpace);
  const toFlowPlot = (point: Point): Point => ({
    x: plot.x + nodeWidth / 2 + point.x * flowWidth,
    y: plot.y + point.y * plot.height,
  });
  const nodes: SceneNode[] = [];
  result.links.forEach((link, index) => {
    if (link.value === 0) return;
    const sourceRow = edgeRows.get(link.id) ?? index;
    const selected = path.links.includes(link.id);
    const source = toFlowPlot(link.path[0]!);
    const target = toFlowPlot(link.path[link.path.length - 1]!);
    const feedback = source.x >= target.x;
    const height = link.height * plot.height;
    const points = sankeyBandPoints(
      source.x + nodeWidth / 2,
      source.y - height / 2,
      height,
      target.x + (feedback ? nodeWidth / 2 : -nodeWidth / 2),
      target.y - height / 2,
      height,
      feedback,
      feedbackSpace,
    );
    const color = palette(context, link.sourceOrder, result.nodes.length);
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:flow-link:${link.id}`, sourceRow, -1, {
        kind: 'flow-link',
        id: link.id,
        source: link.source,
        target: link.target,
        value: link.value,
        sourceLinkOrder: link.sourceLinkOrder,
        targetLinkOrder: link.targetLinkOrder,
        linkSort: optionString(
          layer.mark.options.linkSort,
          ['input', 'ascending', 'descending', 'authored'],
          'input',
        ),
        selectedPath: selected,
        directed: true,
        feedback,
        interaction: ['path', 'drag'],
        sourceRowIndices: [sourceRow],
      }),
      points,
      closed: true,
      fill: colorWithOpacity(layer.mark.fill ?? color, selected ? 0.8 : 0.28),
      lineWidth: 0,
      lineCap: 'round',
      lineJoin: 'round',
    });
  });
  result.nodes.forEach((item, index) => {
    const center = toFlowPlot(item);
    const height = item.height * plot.height;
    const rows = sourceRowsTooltip(nodeRows.get(item.id) ?? [0]);
    const sourceRow = rows[0] ?? 0;
    const selected = path.nodes.includes(item.id);
    const color = palette(
      context,
      item.column,
      Math.max(1, ...result.nodes.map(({ column }) => column + 1)),
    );
    const tooltip: DataRow = {
      kind: 'flow-node',
      id: item.id,
      stage: item.column,
      order: item.order,
      input: item.input,
      output: item.output,
      value: item.value,
      balanced: item.balanced,
      draggable: true,
      selectedPath: selected,
      cycles: result.cycles.map((cycle) => cycle.join(' -> ')),
      imbalance: result.imbalances.find(({ id }) => id === item.id)?.difference ?? 0,
      interaction: ['drag', 'path'],
      sourceRowIndices: rows,
    };
    nodes.push({
      type: 'rect',
      ...datumBase(context, `${layer.id}:flow-node:${item.id}`, sourceRow, 1, tooltip, {
        kind: 'flow-node',
        id: item.id,
        position: { x: item.x, y: item.y },
        plot: { x: plot.x + nodeWidth / 2, y: plot.y, width: flowWidth, height: plot.height },
      }),
      x: center.x - nodeWidth / 2,
      y: center.y - height / 2,
      width: nodeWidth,
      height,
      fill: layer.mark.fill ?? color,
      stroke: selected ? theme.colors.focus : (layer.mark.stroke ?? theme.colors.background),
      lineWidth: selected ? 3 : (layer.mark.lineWidth ?? 1.5),
      cornerRadius: layer.mark.cornerRadius ?? 2,
    });
    const label = textNode(
      context,
      `${layer.id}:flow-label:${item.id}`,
      center.x + (item.x > 0.8 ? -nodeWidth / 2 - 5 : nodeWidth / 2 + 5),
      center.y,
      item.id,
      {
        align: item.x > 0.8 ? 'right' : 'left',
        fill: theme.colors.text,
        size: Math.max(9, theme.typography.fontSize - 1),
      },
    );
    nodes.push({ ...label, ...datumBase(context, label.id, sourceRow, 2, tooltip) });
    void index;
  });
  return nodes;
};

function dataValueStrings(value: DataValue): readonly string[] {
  if (Array.isArray(value))
    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  if (typeof value !== 'string') return [];
  return value
    .split(/[|,;]/u)
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function networkInputs(context: MarkCompileContext): {
  readonly nodes: readonly NetworkNodeInput[];
  readonly edges: readonly NetworkEdgeInput[];
  readonly nodeRows: ReadonlyMap<string, number>;
  readonly edgeRows: ReadonlyMap<string, number>;
  readonly labels: ReadonlyMap<string, string>;
} {
  const { layer, table } = context;
  const sourceField = layer.mark.fields.source ?? layer.x.field;
  const targetField = layer.mark.fields.target ?? layer.y.field;
  const nodeField = layer.mark.fields.node ?? layer.mark.fields.nodeId;
  const edgeIdField = layer.mark.fields.edgeId ?? layer.mark.fields.id;
  const nodeRows = new Map<string, number>();
  const edgeRows = new Map<string, number>();
  const labels = new Map<string, string>();
  const nodes = new Map<string, NetworkNodeInput>();
  const edges: NetworkEdgeInput[] = [];
  const ensureNode = (id: string, index: number): void => {
    if (!nodes.has(id)) nodes.set(id, { id });
    if (!nodeRows.has(id)) nodeRows.set(id, index);
    if (!labels.has(id)) labels.set(id, id);
  };
  for (let index = 0; index < table.length; index += 1) {
    const source = stringValue(fieldValue(context, index, sourceField));
    const target = stringValue(fieldValue(context, index, targetField));
    if (source !== null && source !== '' && target !== null && target !== '') {
      ensureNode(source, index);
      ensureNode(target, index);
      const edgeId =
        edgeIdField === undefined
          ? `edge-${index}`
          : (stringValue(fieldValue(context, index, edgeIdField)) ?? `edge-${index}`);
      const sourcePortField = layer.mark.fields.sourcePort;
      const targetPortField = layer.mark.fields.targetPort;
      const directedField = layer.mark.fields.directed;
      const weightField = layer.mark.fields.weight ?? layer.mark.fields.value;
      const sourcePort =
        sourcePortField === undefined
          ? null
          : stringValue(fieldValue(context, index, sourcePortField));
      const targetPort =
        targetPortField === undefined
          ? null
          : stringValue(fieldValue(context, index, targetPortField));
      const directedRaw =
        directedField === undefined ? null : fieldValue(context, index, directedField);
      const weight =
        weightField === undefined
          ? (numericValue(fieldValue(context, index, layer.y.field)) ?? 1)
          : (numericValue(fieldValue(context, index, weightField)) ?? 1);
      edges.push({
        id: edgeId,
        source,
        target,
        weight,
        ...(sourcePort === null || sourcePort === '' ? {} : { sourcePort }),
        ...(targetPort === null || targetPort === '' ? {} : { targetPort }),
        ...(typeof directedRaw === 'boolean' ? { directed: directedRaw } : {}),
      });
      edgeRows.set(edgeId, index);
    }
    const nodeId =
      nodeField === undefined
        ? source === null && target === null
          ? stringValue(fieldValue(context, index, layer.x.field))
          : null
        : stringValue(fieldValue(context, index, nodeField));
    if (nodeId === null || nodeId === '') continue;
    ensureNode(nodeId, index);
    nodeRows.set(nodeId, index);
    const current = nodes.get(nodeId)!;
    const parent =
      layer.mark.fields.parent === undefined
        ? null
        : stringValue(fieldValue(context, index, layer.mark.fields.parent));
    const group =
      layer.mark.fields.group === undefined
        ? null
        : stringValue(fieldValue(context, index, layer.mark.fields.group));
    const radius =
      layer.mark.fields.radius === undefined
        ? null
        : numericValue(fieldValue(context, index, layer.mark.fields.radius));
    const x =
      layer.mark.fields.nodeX === undefined
        ? null
        : numericValue(fieldValue(context, index, layer.mark.fields.nodeX));
    const y =
      layer.mark.fields.nodeY === undefined
        ? null
        : numericValue(fieldValue(context, index, layer.mark.fields.nodeY));
    const pinnedRaw =
      layer.mark.fields.pinned === undefined
        ? null
        : fieldValue(context, index, layer.mark.fields.pinned);
    const portsField = layer.mark.fields.ports ?? layer.mark.fields.port;
    const portValues =
      portsField === undefined ? [] : dataValueStrings(fieldValue(context, index, portsField));
    const portAngle =
      layer.mark.fields.portAngle === undefined
        ? null
        : numericValue(fieldValue(context, index, layer.mark.fields.portAngle));
    const label =
      layer.mark.fields.label === undefined
        ? nodeId
        : (stringValue(fieldValue(context, index, layer.mark.fields.label)) ?? nodeId);
    labels.set(nodeId, label);
    nodes.set(nodeId, {
      ...current,
      ...(parent === null || parent === '' || parent === nodeId ? {} : { parent }),
      ...(group === null || group === '' ? {} : { group }),
      ...(radius === null ? {} : { radius }),
      ...(x === null ? {} : { x }),
      ...(y === null ? {} : { y }),
      ...(typeof pinnedRaw === 'boolean' ? { pinned: pinnedRaw } : {}),
      ...(portValues.length === 0
        ? {}
        : {
            ports: portValues.map((id) => (portAngle === null ? { id } : { id, angle: portAngle })),
          }),
    });
    if (parent !== null && parent !== '' && parent !== nodeId) ensureNode(parent, index);
  }
  const authored = optionObject(layer.mark.options.positions);
  if (authored !== null) {
    for (const [id, value] of Object.entries(authored)) {
      const position = optionObject(value);
      const node = nodes.get(id);
      if (position === null || node === undefined) continue;
      const x =
        typeof position.x === 'number' && Number.isFinite(position.x) ? position.x : undefined;
      const y =
        typeof position.y === 'number' && Number.isFinite(position.y) ? position.y : undefined;
      const pinned = typeof position.pinned === 'boolean' ? position.pinned : true;
      nodes.set(id, {
        ...node,
        ...(x === undefined ? {} : { x }),
        ...(y === undefined ? {} : { y }),
        ...(x === undefined || y === undefined ? {} : { pinned }),
      });
    }
  }
  optionStrings(layer.mark.options.pinned).forEach((id) => {
    const node = nodes.get(id);
    if (node !== undefined && node.x !== undefined && node.y !== undefined)
      nodes.set(id, { ...node, pinned: true });
  });
  return { nodes: [...nodes.values()], edges, nodeRows, edgeRows, labels };
}

function lassoPolygon(value: JsonValue | undefined): readonly Point[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const point = optionObject(raw);
    return point !== null &&
      typeof point.x === 'number' &&
      Number.isFinite(point.x) &&
      typeof point.y === 'number' &&
      Number.isFinite(point.y)
      ? [{ x: point.x, y: point.y }]
      : [];
  });
}

export const compileAdvancedGraphMark: MarkCompiler = (context) => {
  if (
    !hasAnyOption(context, [
      'layout',
      'routing',
      'directed',
      'allowMultiedges',
      'allowSelfLoops',
      'collapsed',
      'iterations',
      'seed',
      'nodeSpacing',
      'positions',
      'pinned',
      'lasso',
    ]) &&
    context.layer.mark.fields.node === undefined &&
    context.layer.mark.fields.nodeId === undefined
  )
    return compileGraphMark(context);
  if (context.table.length === 0) return [];
  const { layer, plot, theme } = context;
  const input = networkInputs(context);
  if (input.nodes.length === 0) return [];
  const routing = optionString(
    layer.mark.options.routing,
    ['straight', 'quadratic', 'orthogonal'],
    'quadratic',
  );
  const result = layoutNetwork(input.nodes, input.edges, {
    layout: optionString(layer.mark.options.layout, ['force', 'radial', 'grid', 'dag'], 'force'),
    routing,
    directed: optionBoolean(layer.mark.options.directed),
    allowMultiedges: optionBoolean(layer.mark.options.allowMultiedges, true),
    allowSelfLoops: optionBoolean(layer.mark.options.allowSelfLoops, true),
    collapsed: optionStrings(layer.mark.options.collapsed),
    iterations: Math.floor(optionNumber(layer.mark.options.iterations, 120)),
    seed: optionNumber(layer.mark.options.seed, 1),
    nodeSpacing: optionNumber(layer.mark.options.nodeSpacing, 0.08),
  });
  const lasso = lassoPolygon(layer.mark.options.lasso);
  const selected = new Set(lasso.length >= 3 ? selectNetworkNodes(result, lasso) : []);
  const parentById = new Map(
    input.nodes.map(({ id, parent }) => [id, parent === undefined ? null : parent]),
  );
  const collapsed = new Set(optionStrings(layer.mark.options.collapsed));
  const owner = (id: string): string => {
    let current = id;
    const visited = new Set<string>();
    while (!visited.has(current)) {
      visited.add(current);
      const parent = parentById.get(current);
      if (parent === null || parent === undefined) return current;
      if (collapsed.has(parent)) return parent;
      current = parent;
    }
    return id;
  };
  const edgeSourceRows = (source: string, target: string, id?: string): readonly number[] =>
    sourceRowsTooltip(
      input.edges.flatMap((candidate) => {
        if (
          (id === undefined || candidate.id === id || id.startsWith('collapsed:')) &&
          owner(candidate.source) === source &&
          owner(candidate.target) === target
        )
          return [input.edgeRows.get(candidate.id ?? '') ?? 0];
        return [];
      }),
    );
  const maxWeight = Math.max(1, ...result.edges.map(({ weight }) => weight));
  const nodes: SceneNode[] = [];
  result.edges.forEach((edge, index) => {
    const sourceRows = edgeSourceRows(edge.source, edge.target, edge.id);
    const sourceRow = sourceRows[0] ?? input.edgeRows.get(edge.id) ?? 0;
    const normalized = edge.points;
    const plotPoints = normalized.map((point) => toPlot(context, point));
    const points =
      routing === 'quadratic' && plotPoints.length === 3 ? quadratic(plotPoints) : plotPoints;
    const color = palette(context, index, result.edges.length);
    const tooltip: DataRow = {
      kind: 'network-edge',
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      directed: edge.directed,
      multiedge: edge.parallelCount > 1,
      parallelIndex: edge.parallelIndex,
      parallelCount: edge.parallelCount,
      selfLoop: edge.selfLoop,
      routing,
      sourcePort: edge.sourcePort,
      targetPort: edge.targetPort,
      interaction: ['path', 'lasso'],
      sourceRowIndices: sourceRows.length === 0 ? [sourceRow] : sourceRows,
    };
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:network-edge:${edge.id}`, sourceRow, -1, tooltip),
      points,
      closed: false,
      stroke: colorWithOpacity(layer.mark.stroke ?? color, 0.68),
      lineWidth: Math.max(1.2, (edge.weight / maxWeight) * 5),
      lineCap: 'round',
      lineJoin: 'round',
    });
    if (edge.directed && points.length >= 2) {
      const end = points.at(-1)!;
      const before = points.at(-2)!;
      const angle = Math.atan2(end.y - before.y, end.x - before.x);
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:network-arrow:${edge.id}`, { zIndex: layer.zIndex + 0.5 }),
        points: [
          end,
          pointOnCircle(end.x, end.y, 7, angle + Math.PI * 0.8),
          pointOnCircle(end.x, end.y, 7, angle - Math.PI * 0.8),
        ],
        closed: true,
        fill: layer.mark.stroke ?? color,
        lineWidth: 0,
      });
    }
  });
  result.nodes.forEach((item, index) => {
    const center = toPlot(context, item);
    const radius = Math.max(5, item.radius * Math.min(plot.width, plot.height));
    const sourceRows = sourceRowsTooltip([
      input.nodeRows.get(item.id) ?? 0,
      ...input.nodes.flatMap(({ id }) =>
        owner(id) === item.id && id !== item.id ? [input.nodeRows.get(id) ?? 0] : [],
      ),
      ...input.edges.flatMap((edge) =>
        owner(edge.source) === item.id || owner(edge.target) === item.id
          ? [input.edgeRows.get(edge.id ?? '') ?? 0]
          : [],
      ),
    ]);
    const sourceRow = sourceRows[0] ?? input.nodeRows.get(item.id) ?? 0;
    const color = palette(context, index, result.nodes.length);
    const tooltip: DataRow = {
      kind: 'network-node',
      id: item.id,
      label: input.labels.get(item.id) ?? item.id,
      layout: result.layout,
      parent: item.parent,
      group: item.group,
      pinned: item.pinned,
      compound: item.compound,
      collapsed: item.collapsed,
      hiddenCount: item.hiddenCount,
      ports: item.ports.map(({ id }) => id),
      selected: selected.has(item.id),
      draggable: true,
      lassoEligible: true,
      cycles: result.cycles.map((cycle) => cycle.join(' -> ')),
      topologicalOrder: result.topologicalOrder,
      interaction: ['drag', 'pin', 'collapse', 'lasso'],
      sourceRowIndices: sourceRows,
    };
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:network-node:${item.id}`, sourceRow, 1, tooltip, {
        kind: 'network-node',
        id: item.id,
        position: { x: item.x, y: item.y },
        plot: { ...plot },
        pinned: item.pinned,
        compound: item.compound,
        collapsed: item.collapsed,
      }),
      cx: center.x,
      cy: center.y,
      radius,
      fill: colorWithOpacity(layer.mark.fill ?? color, item.compound ? 0.38 : 0.92),
      stroke: selected.has(item.id)
        ? theme.colors.focus
        : (layer.mark.stroke ?? theme.colors.background),
      lineWidth: selected.has(item.id) ? 3 : item.collapsed ? 2.5 : (layer.mark.lineWidth ?? 1.5),
      ...(item.collapsed ? { dash: [4, 3] } : {}),
    });
    item.ports.forEach((port) => {
      const position = toPlot(context, port);
      nodes.push({
        type: 'circle',
        ...datumBase(context, `${layer.id}:network-port:${item.id}:${port.id}`, sourceRow, 2, {
          kind: 'network-port',
          node: item.id,
          port: port.id,
          draggable: true,
          sourceRowIndices: [sourceRow],
        }),
        cx: position.x,
        cy: position.y,
        radius: 3,
        fill: theme.colors.background,
        stroke: color,
        lineWidth: 1.5,
      });
    });
    const label = textNode(
      context,
      `${layer.id}:network-label:${item.id}`,
      center.x,
      center.y + radius + 9,
      input.labels.get(item.id) ?? item.id,
      { fill: theme.colors.mutedText, size: Math.max(9, theme.typography.fontSize - 1) },
    );
    nodes.push({ ...label, ...datumBase(context, label.id, sourceRow, 3, tooltip) });
  });
  return nodes;
};

function chordEdges(context: MarkCompileContext): {
  readonly edges: readonly ChordEdge[];
  readonly rows: readonly number[];
} {
  const { layer, table } = context;
  const sourceField = layer.mark.fields.source ?? layer.x.field;
  const targetField = layer.mark.fields.target ?? layer.y.field;
  const valueField = layer.mark.fields.value ?? layer.mark.fields.weight;
  const edges: ChordEdge[] = [];
  const rows: number[] = [];
  for (let index = 0; index < table.length; index += 1) {
    const source = stringValue(fieldValue(context, index, sourceField));
    const target = stringValue(fieldValue(context, index, targetField));
    const value =
      valueField === undefined
        ? numericValue(fieldValue(context, index, layer.y.field))
        : numericValue(fieldValue(context, index, valueField));
    if (source === null || target === null || value === null || value < 0) continue;
    edges.push({ source, target, value });
    rows.push(index);
  }
  return { edges, rows };
}

function chordInput(context: MarkCompileContext): {
  readonly source: readonly ChordEdge[] | ChordMatrixInput;
  readonly edges: readonly ChordEdge[];
  readonly rows: readonly number[];
} {
  const rawMatrix = context.layer.mark.options.matrix;
  if (Array.isArray(rawMatrix)) {
    if (!rawMatrix.every(Array.isArray))
      throw new GraflumeError('INVALID_DATA', 'Chord matrix rows must be arrays.', {
        path: '$.mark.options.matrix',
      });
    const authoredIds = context.layer.mark.options.matrixIds;
    const ids = Array.isArray(authoredIds)
      ? authoredIds.map((id) => String(id))
      : rawMatrix.map((_row, index) => String(index));
    const source: ChordMatrixInput = {
      ids,
      matrix: rawMatrix as readonly (readonly number[])[],
    };
    const directed = optionBoolean(context.layer.mark.options.directed);
    const edges = chordMatrixToEdges(source, { directed });
    return { source, edges, rows: edges.map(() => 0) };
  }
  const input = chordEdges(context);
  return { source: input.edges, edges: input.edges, rows: input.rows };
}

export const compileAdvancedChordMark: MarkCompiler = (context) => {
  if (
    !hasAnyOption(context, [
      'directed',
      'padAngle',
      'groupOrder',
      'subgroupOrder',
      'matrix',
      'matrixIds',
    ])
  )
    return compileChordMark(context);
  if (context.table.length === 0) return [];
  const { layer, plot, theme } = context;
  const input = chordInput(context);
  if (input.edges.length === 0 && Array.isArray(input.source)) return [];
  const result = layoutChord(input.source, {
    directed: optionBoolean(layer.mark.options.directed),
    padAngle: optionNumber(layer.mark.options.padAngle, 0.02),
    groupOrder: optionString(
      layer.mark.options.groupOrder,
      ['input', 'ascending', 'descending'],
      'input',
    ),
    subgroupOrder: optionString(
      layer.mark.options.subgroupOrder,
      ['input', 'ascending', 'descending'],
      'input',
    ),
  });
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const outerRadius = Math.max(24, Math.min(plot.width, plot.height) * 0.42);
  const innerRadius = outerRadius * 0.78;
  const nodes: SceneNode[] = [];
  const availableRibbonRows = input.edges.map((edge, index) => ({
    edge,
    row: input.rows[index] ?? 0,
    used: false,
  }));
  result.ribbons.forEach((ribbon, index) => {
    const sourceAngle = (ribbon.sourceStartAngle + ribbon.sourceEndAngle) / 2;
    const targetAngle = (ribbon.targetStartAngle + ribbon.targetEndAngle) / 2;
    const source = pointOnCircle(cx, cy, innerRadius, sourceAngle);
    const target = pointOnCircle(cx, cy, innerRadius, targetAngle);
    const points = ribbon.selfLoop
      ? [
          source,
          pointOnCircle(cx, cy, innerRadius * 0.45, sourceAngle - 0.45),
          pointOnCircle(cx, cy, innerRadius * 0.45, sourceAngle + 0.45),
          source,
        ]
      : quadratic([source, { x: cx, y: cy }, target]);
    const provenance = availableRibbonRows.find(
      (candidate) =>
        !candidate.used &&
        candidate.edge.source === ribbon.source &&
        candidate.edge.target === ribbon.target &&
        candidate.edge.value === ribbon.value,
    );
    if (provenance !== undefined) provenance.used = true;
    const sourceRow = provenance?.row ?? input.rows[index] ?? 0;
    const color = palette(context, index, result.ribbons.length);
    const tooltip: DataRow = {
      kind: 'chord-ribbon',
      source: ribbon.source,
      target: ribbon.target,
      value: ribbon.value,
      directed: ribbon.directed,
      selfLoop: ribbon.selfLoop,
      sourceStartAngle: ribbon.sourceStartAngle,
      sourceEndAngle: ribbon.sourceEndAngle,
      targetStartAngle: ribbon.targetStartAngle,
      targetEndAngle: ribbon.targetEndAngle,
      sourceSubgroupOrder: ribbon.sourceSubgroupOrder,
      targetSubgroupOrder: ribbon.targetSubgroupOrder,
      subgroupOrder: optionString(
        layer.mark.options.subgroupOrder,
        ['input', 'ascending', 'descending'],
        'input',
      ),
      sourceRowIndices: [sourceRow],
    };
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:chord-ribbon:${index}`, sourceRow, -1, tooltip),
      points,
      closed: false,
      stroke: colorWithOpacity(color, 0.52),
      lineWidth: Math.max(2, Math.sqrt(ribbon.value) * 4),
      lineCap: 'round',
      lineJoin: 'round',
    });
    if (ribbon.directed && !ribbon.selfLoop) {
      const before = points.at(-2)!;
      const end = points.at(-1)!;
      const angle = Math.atan2(end.y - before.y, end.x - before.x);
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:chord-arrow:${index}`, { zIndex: layer.zIndex + 0.5 }),
        points: [
          end,
          pointOnCircle(end.x, end.y, 7, angle + 2.45),
          pointOnCircle(end.x, end.y, 7, angle - 2.45),
        ],
        closed: true,
        fill: color,
        lineWidth: 0,
      });
    }
  });
  result.groups.forEach((group, index) => {
    const relatedRows = input.edges.flatMap((edge, edgeIndex) =>
      edge.source === group.id || edge.target === group.id ? [input.rows[edgeIndex] ?? 0] : [],
    );
    const sourceRow = relatedRows[0] ?? 0;
    const color = palette(context, index, result.groups.length);
    const matrixRow = result.matrix[result.ids.indexOf(group.id)] ?? [];
    const tooltip: DataRow = {
      kind: 'chord-group',
      id: group.id,
      value: group.value,
      inbound: group.inbound,
      outbound: group.outbound,
      matrix: matrixRow,
      groupOrder: optionString(
        layer.mark.options.groupOrder,
        ['input', 'ascending', 'descending'],
        'input',
      ),
      padAngle: optionNumber(layer.mark.options.padAngle, 0.02),
      sourceRowIndices: sourceRowsTooltip(relatedRows),
    };
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:chord-group:${group.id}`, sourceRow, 1, tooltip),
      points: annularSector(cx, cy, innerRadius, outerRadius, group.startAngle, group.endAngle),
      closed: true,
      fill: layer.mark.fill ?? color,
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineJoin: 'round',
    });
    const middle = (group.startAngle + group.endAngle) / 2;
    const label = pointOnCircle(cx, cy, outerRadius + 14, middle);
    nodes.push(
      textNode(context, `${layer.id}:chord-label:${group.id}`, label.x, label.y, group.id, {
        fill: theme.colors.mutedText,
        size: Math.max(9, theme.typography.fontSize - 1),
      }),
    );
  });
  return nodes;
};

export const compileAdvancedFunnelMark: MarkCompiler = (context) => {
  if (
    !hasAnyOption(context, ['neckWidth', 'neckHeight', 'labelGap', 'outsideLabels', 'semantics']) &&
    typeof context.layer.mark.options.sort !== 'string'
  )
    return compileFunnelMark(context);
  if (context.table.length === 0) return [];
  const { layer, table, plot, theme } = context;
  const idField = layer.mark.fields.stage ?? layer.mark.fields.id ?? layer.x.field;
  const valueField = layer.mark.fields.value ?? layer.y.field;
  const orderField = layer.mark.fields.order;
  const labelField = layer.mark.fields.label;
  const input: FunnelStageInput[] = [];
  const rows = new Map<string, number>();
  for (let index = 0; index < table.length; index += 1) {
    const id = stringValue(fieldValue(context, index, idField));
    const value = numericValue(fieldValue(context, index, valueField));
    if (id === null || id === '' || value === null || value < 0) continue;
    const order =
      orderField === undefined ? null : numericValue(fieldValue(context, index, orderField));
    const label =
      labelField === undefined ? id : (stringValue(fieldValue(context, index, labelField)) ?? id);
    input.push({ id, value, label, ...(order === null ? {} : { order }) });
    rows.set(id, index);
  }
  if (input.length === 0) return [];
  const stages = funnelStages(input, {
    sort: optionString(layer.mark.options.sort, ['input', 'value-descending', 'order'], 'input'),
    neckWidth: optionNumber(layer.mark.options.neckWidth, 0.3),
    neckHeight: optionNumber(layer.mark.options.neckHeight, 0.25),
    labelGap: optionNumber(layer.mark.options.labelGap, 0.055),
  });
  const outside = optionBoolean(layer.mark.options.outsideLabels);
  const bodyWidth = plot.width * (outside ? 0.72 : 1);
  const cx = plot.x + bodyWidth / 2;
  const nodes: SceneNode[] = [];
  stages.forEach((stage, index) => {
    const sourceRows = sourceRowsTooltip([
      rows.get(stage.id) ?? 0,
      rows.get(stages[index - 1]?.id ?? stage.id) ?? 0,
      rows.get(stages[0]?.id ?? stage.id) ?? 0,
    ]);
    const sourceRow = sourceRows[0] ?? rows.get(stage.id) ?? 0;
    const y0 = plot.y + stage.y0 * plot.height;
    const y1 = plot.y + stage.y1 * plot.height;
    const topWidth = stage.topWidth * bodyWidth;
    const bottomWidth = stage.bottomWidth * bodyWidth;
    const fill = layer.mark.fill ?? palette(context, index, stages.length);
    const tooltip: DataRow = {
      kind: 'funnel-stage',
      stage: stage.id,
      label: stage.label,
      value: stage.value,
      input: stage.input,
      output: stage.output,
      conversion: stage.conversion,
      dropoff: stage.dropoff,
      dropoffRate: stage.dropoffRate,
      cumulative: stage.cumulative,
      neckWidth: optionNumber(layer.mark.options.neckWidth, 0.3),
      neckHeight: optionNumber(layer.mark.options.neckHeight, 0.25),
      outsideLabel: outside,
      sourceRowIndices: sourceRows,
    };
    nodes.push({
      type: 'path',
      ...datumBase(context, `${layer.id}:funnel-stage:${stage.id}`, sourceRow, 0, tooltip),
      points: [
        { x: cx - topWidth / 2, y: y0 + 1 },
        { x: cx + topWidth / 2, y: y0 + 1 },
        { x: cx + bottomWidth / 2, y: y1 - 1 },
        { x: cx - bottomWidth / 2, y: y1 - 1 },
      ],
      closed: true,
      fill,
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1.5,
      lineJoin: 'round',
    });
    const y = plot.y + stage.labelY * plot.height;
    const labelX = outside ? plot.x + bodyWidth + 12 : cx;
    if (outside) {
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:funnel-label-rule:${stage.id}`, { zIndex: layer.zIndex + 1 }),
        x1: cx + Math.max(topWidth, bottomWidth) / 2,
        y1: (y0 + y1) / 2,
        x2: labelX - 4,
        y2: y,
        stroke: theme.colors.axis,
        lineWidth: 1,
      });
    }
    const label = textNode(
      context,
      `${layer.id}:funnel-label:${stage.id}`,
      labelX,
      y,
      `${stage.label}  ${stage.value}`,
      {
        align: outside ? 'left' : 'center',
        fill: outside ? theme.colors.text : readableTextColor(fill, '#ffffff', '#0f172a'),
        size: Math.max(9, theme.typography.fontSize - 1),
        weight: 700,
      },
    );
    nodes.push({ ...label, ...datumBase(context, label.id, sourceRow, 2, tooltip) });
  });
  return nodes;
};

function parallelAxes(context: MarkCompileContext): readonly ParallelAxis[] {
  const authored = context.layer.mark.options.axes;
  if (Array.isArray(authored)) {
    return authored.flatMap((raw) => {
      const axis = optionObject(raw);
      if (axis === null || typeof axis.field !== 'string' || axis.field.trim() === '') return [];
      const type = optionString(axis.type, ['linear', 'log', 'ordinal'], 'linear');
      const missing = optionString(axis.missing, ['gap', 'top', 'bottom', 'middle'], 'gap');
      const domain = Array.isArray(axis.domain)
        ? axis.domain.filter(
            (value): value is number | string =>
              typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)),
          )
        : undefined;
      return [
        {
          field: axis.field,
          type,
          invert: axis.invert === true,
          missing,
          ...(domain === undefined ? {} : { domain }),
        } satisfies ParallelAxis,
      ];
    });
  }
  const fields = optionStrings(context.layer.mark.options.dimensions);
  const fallback = fields.length >= 2 ? fields : [context.layer.x.field, context.layer.y.field];
  return [...new Set(fallback)].map((field) => ({ field, type: 'linear', missing: 'gap' }));
}

function parallelBrushes(value: JsonValue | undefined): readonly ParallelBrush[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const brush = optionObject(raw);
    if (brush === null || typeof brush.field !== 'string' || !Array.isArray(brush.extents))
      return [];
    const extents = brush.extents.flatMap((rawExtent) => {
      if (
        !Array.isArray(rawExtent) ||
        rawExtent.length !== 2 ||
        typeof rawExtent[0] !== 'number' ||
        !Number.isFinite(rawExtent[0]) ||
        typeof rawExtent[1] !== 'number' ||
        !Number.isFinite(rawExtent[1])
      )
        return [];
      return [[rawExtent[0], rawExtent[1]] as const];
    });
    return [{ field: brush.field, extents }];
  });
}

export const compileAdvancedParallelMark: MarkCompiler = (context) => {
  if (!hasAnyOption(context, ['axes', 'brushes', 'combine'])) return compileParallelMark(context);
  if (context.table.length === 0) return [];
  const { layer, table, plot, theme } = context;
  const axes = parallelAxes(context);
  const brushes = parallelBrushes(layer.mark.options.brushes);
  const combine = optionString(
    layer.mark.options.combine,
    ['union', 'intersection'],
    'intersection',
  );
  const rows = Array.from({ length: table.length }, (_, index) => table.row(index));
  const projection = projectParallelRows(rows, axes, brushes, combine);
  const xFor = (index: number) => plot.x + (index / Math.max(1, axes.length - 1)) * plot.width;
  const nodes: SceneNode[] = [];
  projection.axes.forEach((axis, index) => {
    const x = xFor(index);
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:parallel-axis:${axis.field}`, { zIndex: layer.zIndex }),
      x1: x,
      y1: plot.y,
      x2: x,
      y2: plot.y + plot.height,
      stroke: theme.colors.axis,
      lineWidth: 1.25,
      lineCap: 'round',
    });
    nodes.push({
      type: 'rect',
      ...datumBase(
        context,
        `${layer.id}:parallel-axis-hit:${axis.field}`,
        0,
        0.25,
        {
          kind: 'parallel-axis',
          field: axis.field,
          index,
          count: axes.length,
          invert: axis.invert === true,
        },
        {
          kind: 'parallel-axis',
          field: axis.field,
          index,
          count: axes.length,
          invert: axis.invert === true,
          plot: { ...plot },
        },
      ),
      x: x - 7,
      y: plot.y,
      width: 14,
      height: plot.height,
      fill: 'rgba(0, 0, 0, 0)',
      lineWidth: 0,
      cornerRadius: 0,
    });
    nodes.push(
      textNode(
        context,
        `${layer.id}:parallel-axis-label:${axis.field}`,
        x,
        plot.y - 7,
        `${axis.field}${axis.invert === true ? ' ↓' : ''}${axis.type === 'log' ? ' (log)' : ''}`,
        {
          baseline: 'bottom',
          fill: theme.colors.mutedText,
          size: Math.max(9, theme.typography.fontSize - 1),
          weight: 700,
        },
      ),
    );
    const brush = brushes.find(({ field }) => field === axis.field);
    brush?.extents.forEach((extent, extentIndex) => {
      const low = clamp(Math.min(...extent), 0, 1);
      const high = clamp(Math.max(...extent), 0, 1);
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:parallel-brush:${axis.field}:${extentIndex}`, {
          zIndex: layer.zIndex + 0.5,
          opacity: 0.22,
        }),
        x: x - 7,
        y: plot.y + (1 - high) * plot.height,
        width: 14,
        height: Math.max(1, (high - low) * plot.height),
        fill: theme.colors.focus,
        stroke: theme.colors.focus,
        lineWidth: 1,
        cornerRadius: 2,
      });
    });
  });
  const colorField = layer.mark.fields.color ?? layer.mark.fields.group;
  const colorValues =
    colorField === undefined || !table.has(colorField) ? [] : table.unique(colorField);
  projection.rows.forEach((item) => {
    const segments: Point[][] = [];
    let current: Point[] = [];
    axes.forEach((axis, axisIndex) => {
      const value = item.values[axis.field] ?? null;
      if (value === null) {
        if (current.length >= 2) segments.push(current);
        current = [];
        return;
      }
      current.push({ x: xFor(axisIndex), y: plot.y + (1 - value) * plot.height });
    });
    if (current.length >= 2) segments.push(current);
    const colorKey =
      colorField === undefined || !table.has(colorField)
        ? null
        : stringValue(table.value(item.index, colorField));
    const colorIndex = colorKey === null ? item.index : Math.max(0, colorValues.indexOf(colorKey));
    const color = palette(context, colorIndex, colorValues.length || table.length);
    const tooltip: DataRow = {
      kind: 'parallel-row',
      selected: item.selected,
      axes: axes.map(
        ({ field, type, invert, missing }) =>
          `${field}:${type ?? 'linear'}:${invert === true ? 'inverted' : 'normal'}:${missing ?? 'gap'}`,
      ),
      projected: axes.map(({ field }) => `${field}=${item.values[field] ?? 'gap'}`),
      brushCombine: combine,
      brushes: brushes.map(
        ({ field, extents }) => `${field}:${extents.map((extent) => extent.join('-')).join('|')}`,
      ),
      interaction: ['axis-reorder', 'axis-invert', 'axis-brush'],
      sourceRowIndices: [item.index],
    };
    segments.forEach((points, segmentIndex) => {
      nodes.push({
        type: 'path',
        ...datumBase(
          context,
          `${layer.id}:parallel-row:${item.index}:${segmentIndex}`,
          item.index,
          1,
          tooltip,
        ),
        points,
        closed: false,
        stroke: colorWithOpacity(layer.mark.stroke ?? color, item.selected ? 0.82 : 0.12),
        lineWidth: item.selected ? (layer.mark.lineWidth ?? 1.8) : 1,
        lineCap: 'round',
        lineJoin: 'round',
      });
    });
  });
  return nodes;
};

type SetInputRows =
  | {
      readonly kind: 'membership';
      readonly data: readonly SetMembershipDatum[];
      readonly rows: ReadonlyMap<string, number>;
      readonly regionRows: ReadonlyMap<string, readonly number[]>;
    }
  | {
      readonly kind: 'intersection';
      readonly data: readonly SetIntersectionDatum[];
      readonly rows: ReadonlyMap<string, number>;
      readonly regionRows: ReadonlyMap<string, readonly number[]>;
    };

function setRegionKey(sets: readonly string[]): string {
  return [...new Set(sets)].sort().join('\u0000');
}

function membershipRows(context: MarkCompileContext): SetInputRows {
  const { layer, table } = context;
  const idField = layer.mark.fields.id ?? layer.x.field;
  const setsField = layer.mark.fields.sets ?? layer.mark.fields.memberships ?? 'sets';
  const sizeField = layer.mark.fields.size ?? layer.mark.fields.count;
  const membersField = layer.mark.fields.members;
  const regionRows = new Map<string, number[]>();
  if (sizeField !== undefined) {
    const data: SetIntersectionDatum[] = [];
    const rows = new Map<string, number>();
    for (let index = 0; index < table.length; index += 1) {
      const sets = dataValueStrings(fieldValue(context, index, setsField));
      const size = numericValue(fieldValue(context, index, sizeField));
      if (size === null || size < 0) continue;
      const members =
        membersField === undefined
          ? []
          : dataValueStrings(fieldValue(context, index, membersField));
      data.push({ sets, size, ...(members.length === 0 ? {} : { members }) });
      const key = setRegionKey(sets);
      rows.set(key, index);
      regionRows.set(key, [...(regionRows.get(key) ?? []), index]);
    }
    return { kind: 'intersection', data, rows, regionRows };
  }
  const data: SetMembershipDatum[] = [];
  const rows = new Map<string, number>();
  for (let index = 0; index < table.length; index += 1) {
    const id = stringValue(fieldValue(context, index, idField));
    if (id === null || id === '') continue;
    const sets = dataValueStrings(fieldValue(context, index, setsField));
    data.push({ id, sets });
    rows.set(id, index);
    const key = setRegionKey(sets);
    regionRows.set(key, [...(regionRows.get(key) ?? []), index]);
  }
  return { kind: 'membership', data, rows, regionRows };
}

export const compileAdvancedVennMark: MarkCompiler = (context) => {
  if (
    context.layer.mark.fields.sets === undefined &&
    context.layer.mark.fields.memberships === undefined &&
    context.layer.mark.fields.size === undefined &&
    context.layer.mark.fields.count === undefined &&
    !hasAnyOption(context, ['query', 'proportional', 'quality'])
  )
    return compileVennMark(context);
  if (context.table.length === 0) return [];
  const { layer, plot, theme } = context;
  const membership = membershipRows(context);
  if (membership.data.length === 0) return [];
  const result = analyzeSets(membership.data);
  if (result.circles.length === 0) return [];
  const minX = Math.min(...result.circles.map(({ x, radius }) => x - radius));
  const maxX = Math.max(...result.circles.map(({ x, radius }) => x + radius));
  const minY = Math.min(...result.circles.map(({ y, radius }) => y - radius));
  const maxY = Math.max(...result.circles.map(({ y, radius }) => y + radius));
  const sourceWidth = Math.max(Number.EPSILON, maxX - minX);
  const sourceHeight = Math.max(Number.EPSILON, maxY - minY);
  const scale = Math.min((plot.width * 0.86) / sourceWidth, (plot.height * 0.8) / sourceHeight);
  const offsetX = plot.x + (plot.width - sourceWidth * scale) / 2 - minX * scale;
  const offsetY = plot.y + (plot.height - sourceHeight * scale) / 2 - minY * scale;
  const mappedCircles = result.circles.map((circle) => ({
    ...circle,
    x: offsetX + circle.x * scale,
    y: offsetY + circle.y * scale,
    radius: circle.radius * scale,
  }));
  const query = optionObject(layer.mark.options.query);
  const included = optionStrings(query?.included);
  const excluded = optionStrings(query?.excluded);
  const queriedIntersections =
    membership.kind === 'intersection'
      ? membership.data.filter(
          ({ sets }) =>
            included.every((set) => sets.includes(set)) &&
            excluded.every((set) => !sets.includes(set)),
        )
      : [];
  const queryMembers =
    membership.kind === 'membership'
      ? querySetRegion(membership.data, included, excluded)
      : queriedIntersections.flatMap(({ members = [] }) => members);
  const querySize =
    membership.kind === 'membership'
      ? queryMembers.length
      : queriedIntersections.reduce((sum, { size }) => sum + size, 0);
  const nodes: SceneNode[] = [];
  mappedCircles.forEach((circle, index) => {
    const memberIds =
      membership.kind === 'membership'
        ? querySetRegion(membership.data, [circle.id])
        : membership.data.flatMap(({ sets, members = [] }) =>
            sets.includes(circle.id) ? members : [],
          );
    const rows = sourceRowsTooltip(
      membership.kind === 'membership'
        ? memberIds.map((id) => membership.rows.get(id) ?? 0)
        : membership.data.flatMap(({ sets }) =>
            sets.includes(circle.id) ? (membership.regionRows.get(setRegionKey(sets)) ?? []) : [],
          ),
    );
    const sourceRow = rows[0] ?? 0;
    const color = palette(context, index, mappedCircles.length);
    const tooltip: DataRow = {
      kind: 'venn-set',
      set: circle.id,
      size: circle.size,
      members: memberIds,
      input: membership.kind,
      proportional: true,
      qualityStress: result.quality.stress,
      maximumRelativeError: result.quality.maximumRelativeError,
      hitRegion: hitSetRegion(result.circles, result.circles[index]!),
      interaction: ['region-query', 'region-hit'],
      sourceRowIndices: rows,
    };
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:venn-set:${circle.id}`, sourceRow, index * 0.01, tooltip),
      cx: circle.x,
      cy: circle.y,
      radius: circle.radius,
      fill: colorWithOpacity(layer.mark.fill ?? color, 0.3),
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 2,
    });
    nodes.push(
      textNode(
        context,
        `${layer.id}:venn-label:${circle.id}`,
        circle.x,
        circle.y - circle.radius + 14,
        `${circle.id} (${circle.size})`,
        {
          fill: theme.colors.text,
          size: Math.max(9, theme.typography.fontSize - 1),
          weight: 750,
        },
      ),
    );
  });
  result.intersections.forEach((intersection, index) => {
    if (intersection.sets.length === 0) return;
    const circles = intersection.sets.flatMap((id) => {
      const circle = mappedCircles.find((candidate) => candidate.id === id);
      return circle === undefined ? [] : [circle];
    });
    if (circles.length === 0) return;
    const x = circles.reduce((sum, circle) => sum + circle.x, 0) / circles.length;
    const y = circles.reduce((sum, circle) => sum + circle.y, 0) / circles.length;
    const rows = sourceRowsTooltip(
      membership.kind === 'membership'
        ? intersection.members.map((id) => membership.rows.get(id) ?? 0)
        : (membership.regionRows.get(setRegionKey(intersection.sets)) ?? []),
    );
    const sourceRow = rows[0] ?? 0;
    const tooltip: DataRow = {
      kind: 'venn-region',
      sets: intersection.sets,
      size: intersection.size,
      members: intersection.members,
      queryIncluded: included,
      queryExcluded: excluded,
      queryMembers,
      querySize,
      input: membership.kind,
      hitRegion: hitSetRegion(result.circles, {
        x: circles.reduce((sum, circle) => sum + (circle.x - offsetX) / scale, 0) / circles.length,
        y: circles.reduce((sum, circle) => sum + (circle.y - offsetY) / scale, 0) / circles.length,
      }),
      qualityStress: result.quality.stress,
      maximumRelativeError: result.quality.maximumRelativeError,
      interaction: ['region-query', 'region-hit'],
      sourceRowIndices: rows,
    };
    nodes.push({
      type: 'circle',
      ...datumBase(context, `${layer.id}:venn-region:${index}`, sourceRow, 2, tooltip),
      cx: x,
      cy: y,
      radius: Math.max(5, Math.min(12, 5 + intersection.size)),
      fill:
        included.length > 0 && included.every((id) => intersection.sets.includes(id))
          ? theme.colors.focus
          : theme.colors.background,
      stroke: theme.colors.text,
      lineWidth: 1.5,
    });
    nodes.push(
      textNode(context, `${layer.id}:venn-region-label:${index}`, x, y, String(intersection.size), {
        size: 9,
        weight: 750,
        fill:
          included.length > 0 && included.every((id) => intersection.sets.includes(id))
            ? theme.colors.background
            : theme.colors.text,
      }),
    );
  });
  if (query !== null) {
    nodes.push(
      textNode(
        context,
        `${layer.id}:venn-query`,
        plot.x + 4,
        plot.y + 4,
        membership.kind === 'membership'
          ? `query: ${queryMembers.join(', ') || '∅'}`
          : `query count: ${querySize}`,
        {
          align: 'left',
          baseline: 'top',
          fill: theme.colors.mutedText,
          size: Math.max(9, theme.typography.fontSize - 2),
        },
      ),
    );
  }
  return nodes;
};

export const compileAdvancedWordTreeMark: MarkCompiler = (context) => {
  const rootPhrase = context.layer.mark.options.rootPhrase;
  if (typeof rootPhrase !== 'string') return compileWordTreeMark(context);
  if (context.table.length === 0) return [];
  const { layer, table, plot, theme } = context;
  const textField = layer.mark.fields.text ?? layer.x.field;
  const texts = Array.from(
    { length: table.length },
    (_, index) => stringValue(fieldValue(context, index, textField)) ?? '',
  );
  const direction = optionString(
    layer.mark.options.direction,
    ['prefix', 'suffix', 'reverse'],
    'prefix',
  );
  const tree = buildWordTree(texts, rootPhrase, {
    ...tokenOptions(context),
    direction,
    minimumCount: Math.floor(optionNumber(layer.mark.options.minimumCount, 1)),
    maximumDepth: Math.floor(optionNumber(layer.mark.options.maximumDepth, 6)),
    maximumChildren: Math.floor(optionNumber(layer.mark.options.maximumChildren, 12)),
  });
  const byDepth = new Map<number, typeof tree>();
  tree.forEach((item) => byDepth.set(item.depth, [...(byDepth.get(item.depth) ?? []), item]));
  const maximumDepth = Math.max(0, ...tree.map(({ depth }) => depth));
  const positions = new Map<string, Point>();
  byDepth.forEach((items, depth) => {
    items.forEach((item, index) => {
      positions.set(item.id, {
        x: plot.x + ((depth + 0.5) / Math.max(1, maximumDepth + 1)) * plot.width,
        y: plot.y + ((index + 1) / (items.length + 1)) * plot.height,
      });
    });
  });
  const parentFor = (item: (typeof tree)[number]) =>
    item.parent === null ? undefined : tree.find(({ id }) => id === item.parent);
  const nodes: SceneNode[] = [];
  const sourceTokens = texts.map((text) => [
    ...tokenizeWords(text, { ...tokenOptions(context), ngram: 1 }),
  ]);
  tree.forEach((item, index) => {
    const position = positions.get(item.id)!;
    const parent = parentFor(item);
    const parentPosition = parent === undefined ? undefined : positions.get(parent.id);
    if (parentPosition !== undefined) {
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:word-tree-link:${item.id}`, { zIndex: layer.zIndex - 1 }),
        x1: parentPosition.x,
        y1: parentPosition.y,
        x2: position.x,
        y2: position.y,
        stroke: theme.colors.grid,
        lineWidth: Math.max(1, Math.sqrt(item.count)),
        lineCap: 'round',
      });
    }
    const phrase = item.phrase.split(' ');
    const sourceRows = sourceRowsTooltip(
      sourceTokens.flatMap((tokens, row) => {
        for (let offset = 0; offset <= tokens.length - phrase.length; offset += 1) {
          if (phrase.every((value, tokenIndex) => tokens[offset + tokenIndex] === value))
            return [row];
        }
        return [];
      }),
    );
    const sourceRow = sourceRows[0] ?? 0;
    const color = palette(context, item.depth, maximumDepth + 1);
    const tooltip: DataRow = {
      kind: 'word-tree-node',
      token: item.token,
      phrase: item.phrase,
      count: item.count,
      depth: item.depth,
      parent: parent?.id ?? null,
      direction,
      rootPhrase,
      minimumCount: Math.floor(optionNumber(layer.mark.options.minimumCount, 1)),
      maximumDepth: Math.floor(optionNumber(layer.mark.options.maximumDepth, 6)),
      maximumChildren: Math.floor(optionNumber(layer.mark.options.maximumChildren, 12)),
      sourceRowIndices: sourceRows,
    };
    const label = textNode(
      context,
      `${layer.id}:word-tree-node:${item.id}`,
      position.x,
      position.y,
      item.token,
      {
        fill: color,
        size: clamp(10 + Math.sqrt(item.count) * 3, 10, 28),
        weight: item.depth === 0 ? 800 : 650,
      },
    );
    nodes.push({
      ...label,
      ...datumBase(context, label.id, sourceRow, 1 + index * 0.001, tooltip),
    });
  });
  return nodes;
};

export const compileAdvancedWordCloudMark: MarkCompiler = (context) => {
  if (
    context.layer.mark.fields.text === undefined &&
    !hasAnyOption(context, [
      'tokenize',
      'case',
      'stopwords',
      'ngram',
      'stemming',
      'locale',
      'seed',
      'padding',
      'rotations',
      'minimumFrequency',
      'maximumWords',
    ])
  )
    return compileWordCloudMark(context);
  if (context.table.length === 0) return [];
  const { layer, table, plot } = context;
  const textField = layer.mark.fields.text ?? layer.x.field;
  const texts = Array.from(
    { length: table.length },
    (_, index) => stringValue(fieldValue(context, index, textField)) ?? '',
  );
  const token = tokenOptions(context);
  const rotations = optionNumbers(layer.mark.options.rotations);
  const placements = layoutWordCloud(texts, {
    ...token,
    width: plot.width,
    height: plot.height,
    seed: optionNumber(layer.mark.options.seed, 1),
    padding: optionNumber(layer.mark.options.padding, 2),
    rotations: rotations.length === 0 ? [0] : rotations,
    minimumFrequency: Math.floor(optionNumber(layer.mark.options.minimumFrequency, 1)),
    maximumWords: Math.min(
      context.performance.maxPointMarks,
      Math.floor(optionNumber(layer.mark.options.maximumWords, 200)),
    ),
  });
  return placements.map((placement, index) => {
    const sourceRows = sourceRowsTooltip(
      texts.flatMap((text, row) =>
        tokenizeWords(text, token).includes(placement.word) ? [row] : [],
      ),
    );
    const sourceRow = sourceRows[0] ?? 0;
    const tooltip: DataRow = {
      kind: 'word-cloud-token',
      word: placement.word,
      frequency: placement.frequency,
      seed: optionNumber(layer.mark.options.seed, 1),
      padding: optionNumber(layer.mark.options.padding, 2),
      rotation: placement.rotation,
      ngram: token.ngram ?? 1,
      stemming: token.stemming ?? 'none',
      sourceRowIndices: sourceRows,
    };
    const node = textNode(
      context,
      `${layer.id}:word-cloud-token:${encodeURIComponent(placement.word)}`,
      plot.x + placement.x,
      plot.y + placement.y,
      placement.word,
      {
        fill: layer.mark.fill ?? palette(context, index, placements.length),
        size: placement.fontSize,
        weight: 520 + Math.round((placement.fontSize / 54) * 220),
        rotation: placement.rotation,
      },
    );
    return { ...node, ...datumBase(context, node.id, sourceRow, index * 0.001, tooltip) };
  });
};
