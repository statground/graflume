import type { MarkCompiler, MarkCompileContext } from '../compiler/types.js';
import { GraflumeError } from '../core/errors.js';
import {
  buildTableModel,
  gaugeModel,
  layoutPie,
  layoutPolar,
  layoutTimeline,
  type GaugeBand,
  type TableFilter,
  type TableGroup,
  type TablePivot,
  type TableSort,
} from '../data/family-layouts.js';
import { nodeBase } from '../scene/factory.js';
import type { FamilyDatumInteraction, Point, SceneNode, TextNode } from '../scene/types.js';
import { categoricalColor, colorWithOpacity, readableTextColor } from '../theme/color.js';
import { compilePolarMark } from './analytical-2d.js';
import { compileGaugeMark } from './radial.js';
import { numericDataValue } from './utils.js';

function stringOption(context: MarkCompileContext, name: string): string | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'string' ? value : undefined;
}

function numberOption(context: MarkCompileContext, name: string): number | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanOption(context: MarkCompileContext, name: string): boolean | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'boolean' ? value : undefined;
}

function numberArrayOption(context: MarkCompileContext, name: string): number[] | undefined {
  const value = context.layer.mark.options[name];
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    ? [...value]
    : undefined;
}

function stringArrayOption(context: MarkCompileContext, name: string): string[] | undefined {
  const value = context.layer.mark.options[name];
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? [...value]
    : undefined;
}

function textNode(
  context: MarkCompileContext,
  id: string,
  x: number,
  y: number,
  text: string,
  options: {
    readonly align?: CanvasTextAlign;
    readonly baseline?: CanvasTextBaseline;
    readonly size?: number;
    readonly fill?: string;
    readonly weight?: string | number;
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

function arcPoints(
  cx: number,
  cy: number,
  outer: number,
  start: number,
  end: number,
  inner = 0,
): Point[] {
  const count = Math.max(6, Math.ceil((Math.abs(end - start) / (Math.PI * 2)) * 96));
  const outside = Array.from({ length: count + 1 }, (_, index) => {
    const angle = start + ((end - start) * index) / count;
    return { x: cx + Math.cos(angle) * outer, y: cy + Math.sin(angle) * outer };
  });
  if (inner <= 0) return [{ x: cx, y: cy }, ...outside];
  const inside = Array.from({ length: count + 1 }, (_, index) => {
    const angle = end - ((end - start) * index) / count;
    return { x: cx + Math.cos(angle) * inner, y: cy + Math.sin(angle) * inner };
  });
  return [...outside, ...inside];
}

/** Pie compiler with dense outside-label solver and roving slice semantics. */
export const compileAdvancedPieMark: MarkCompiler = (context) => {
  const idField = context.layer.mark.fields.id ?? context.layer.x.field;
  const labelField = context.layer.mark.fields.label ?? context.layer.x.field;
  const data = Array.from({ length: context.table.length }, (_, rowIndex) => {
    const rawId = context.table.value(rowIndex, idField);
    const rawLabel = context.table.value(rowIndex, labelField);
    return {
      rowIndex,
      id: rawId === null || rawId === undefined ? `slice-${rowIndex}` : String(rawId),
      label: rawLabel === null || rawLabel === undefined ? `slice-${rowIndex}` : String(rawLabel),
      value: numericDataValue(context.table.value(rowIndex, context.layer.y.field)) ?? 0,
    };
  });
  const negative = stringOption(context, 'negative');
  const zero = stringOption(context, 'zero');
  const sort = stringOption(context, 'sort');
  const startAngle =
    numberOption(context, 'startAngle') ?? context.theme.mark.pieStartAngle ?? -Math.PI / 2;
  const endAngle = numberOption(context, 'endAngle') ?? startAngle + Math.PI * 2;
  const direction =
    stringOption(context, 'direction') ?? context.theme.mark.pieDirection ?? 'clockwise';
  const runtimeFocusedSlice = stringOption(context, 'runtimeFocusedSlice');
  const slices = layoutPie(data, {
    negative: negative === 'absolute' || negative === 'hide' ? negative : 'reject',
    zero: zero === 'minimum' ? zero : 'hide',
    minimumAngle: numberOption(context, 'minimumAngle') ?? 0,
    sort: sort === 'ascending' || sort === 'descending' ? sort : 'input',
    padAngle: numberOption(context, 'padAngle') ?? 0,
    startAngle,
    endAngle,
  });
  if (slices.length === 0) return [];
  const { plot, layer, theme } = context;
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(8, Math.min(plot.width, plot.height) * 0.34);
  const inner = radius * Math.max(0, Math.min(0.9, numberOption(context, 'innerRadius') ?? 0));
  const nodes: SceneNode[] = [];
  const labels: Array<{
    id: string;
    label: string;
    side: -1 | 1;
    desiredY: number;
    edge: Point;
    elbow: Point;
    color: string;
  }> = [];
  slices.forEach((slice, index) => {
    const piePalette = theme.mark.piePalette;
    const color =
      layer.mark.fill ??
      (piePalette === undefined || piePalette.length === 0
        ? categoricalColor(theme, index, slices.length)
        : (piePalette[index % piePalette.length] ?? categoricalColor(theme, index, slices.length)));
    const renderAngle = (angle: number) =>
      direction === 'counterclockwise' ? startAngle - (angle - startAngle) : angle;
    const renderedStart = renderAngle(slice.startAngle);
    const renderedEnd = renderAngle(slice.endAngle);
    const middle = (renderedStart + renderedEnd) / 2;
    const rowIndex = data.find(({ id }) => id === slice.id)?.rowIndex ?? index;
    const focused = runtimeFocusedSlice === slice.id;
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:slice:${slice.id}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: layer.id,
          rowIndex,
          datum: {
            ...context.table.row(rowIndex),
            id: slice.id,
            label: slice.label,
            rawValue: slice.rawValue,
            value: slice.value,
            proportion: slice.proportion,
            minimumApplied: slice.minimumApplied,
            tabIndex: runtimeFocusedSlice === undefined ? slice.tabIndex : focused ? 0 : -1,
          },
          tooltip: {
            label: slice.label,
            rawValue: slice.rawValue,
            value: slice.value,
            proportion: slice.proportion,
            accessibleLabel: slice.accessibleLabel,
            minimumApplied: slice.minimumApplied,
            tabIndex: runtimeFocusedSlice === undefined ? slice.tabIndex : focused ? 0 : -1,
          },
          familyInteraction: {
            kind: 'pie-slice',
            id: slice.id,
            index,
            count: slices.length,
          },
        },
      }),
      points: arcPoints(cx, cy, radius, renderedStart, renderedEnd, inner),
      closed: true,
      fill: color,
      stroke: focused
        ? theme.colors.focus
        : (layer.mark.stroke ?? theme.mark.pieStroke ?? theme.colors.background),
      lineWidth: focused
        ? Math.max(3, layer.mark.lineWidth ?? theme.mark.pieStrokeWidth ?? 1.5)
        : (layer.mark.lineWidth ?? theme.mark.pieStrokeWidth ?? 1.5),
      lineJoin: 'round',
    });
    const side: -1 | 1 = Math.cos(middle) >= 0 ? 1 : -1;
    labels.push({
      id: slice.id,
      label: slice.accessibleLabel,
      side,
      desiredY: cy + Math.sin(middle) * radius * 1.1,
      edge: { x: cx + Math.cos(middle) * radius * 0.96, y: cy + Math.sin(middle) * radius * 0.96 },
      elbow: { x: cx + Math.cos(middle) * radius * 1.08, y: cy + Math.sin(middle) * radius * 1.08 },
      color,
    });
  });
  for (const side of [-1, 1] as const) {
    const group = labels
      .filter((label) => label.side === side)
      .sort((a, b) => a.desiredY - b.desiredY);
    const availableHeight = Math.max(0, plot.height - 12);
    const readableLimit = Math.max(1, Math.floor(availableHeight / 7) + 1);
    const visible =
      group.length <= readableLimit
        ? group
        : Array.from(
            { length: readableLimit },
            (_, index) =>
              group[Math.round((index * (group.length - 1)) / Math.max(1, readableLimit - 1))]!,
          );
    const preferredSpacing = Math.max(11, Math.min(18, plot.height / Math.max(3, slices.length)));
    const spacing =
      visible.length <= 1
        ? 0
        : Math.min(preferredSpacing, availableHeight / Math.max(1, visible.length - 1));
    const fontSize = Math.max(6, Math.min(10, spacing - 0.5));
    let cursor = plot.y + 6;
    visible.forEach((label, index) => {
      const remaining = visible.length - index - 1;
      const maximumY = plot.y + plot.height - 6 - remaining * spacing;
      const y = Math.max(cursor, Math.min(maximumY, label.desiredY));
      cursor = y + spacing;
      const x = side > 0 ? plot.x + plot.width - 4 : plot.x + 4;
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:slice-leader:${label.id}`, { zIndex: layer.zIndex + 1 }),
        points: [label.edge, label.elbow, { x: x - side * 4, y }],
        closed: false,
        stroke: label.color,
        lineWidth: 1,
        lineCap: 'round',
        lineJoin: 'round',
      });
      nodes.push(
        textNode(context, `${layer.id}:slice-label:${label.id}`, x, y, label.label, {
          align: side > 0 ? 'right' : 'left',
          size: fontSize,
        }),
      );
    });
  }
  if (inner > radius * 0.34) {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    nodes.push(
      textNode(
        context,
        `${layer.id}:center-label`,
        cx,
        cy - 9,
        stringOption(context, 'centerLabel') ?? 'Total',
        { size: 10, fill: theme.colors.mutedText, weight: 600 },
      ),
      textNode(context, `${layer.id}:center-value`, cx, cy + 10, String(total), {
        size: 18,
        fill: theme.colors.text,
        weight: 750,
      }),
    );
  }
  return nodes;
};

function gaugeBands(context: MarkCompileContext): GaugeBand[] {
  const value = context.layer.mark.options.bands;
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const from = Reflect.get(entry, 'from');
    const to = Reflect.get(entry, 'to');
    if (typeof from !== 'number' || typeof to !== 'number') return [];
    const color = Reflect.get(entry, 'color');
    const label = Reflect.get(entry, 'label');
    return [
      {
        from,
        to,
        ...(typeof color === 'string' ? { color } : {}),
        ...(typeof label === 'string' ? { label } : {}),
      },
    ];
  });
}

/** Radial/linear gauge compiler with threshold bands, targets, ticks, and exact numeric summary. */
export const compileAdvancedGaugeMark: MarkCompiler = (context) => {
  const legacyMode = stringOption(context, 'mode');
  if (legacyMode === 'number' || legacyMode === 'delta' || legacyMode === 'bullet') {
    return compileGaugeMark(context);
  }
  const advancedOptions = ['type', 'minimum', 'maximum', 'bands', 'targets', 'ticks', 'tickCount'];
  if (!advancedOptions.some((name) => Object.hasOwn(context.layer.mark.options, name))) {
    return compileGaugeMark(context);
  }
  const value = Array.from({ length: context.table.length }, (_, rowIndex) =>
    numericDataValue(context.table.value(rowIndex, context.layer.y.field)),
  ).find((entry): entry is number => entry !== null);
  if (value === undefined) return [];
  const type = stringOption(context, 'type') === 'linear' ? 'linear' : 'radial';
  const ticks = numberArrayOption(context, 'ticks') ?? numberOption(context, 'tickCount') ?? 5;
  const model = gaugeModel(value, {
    type,
    minimum: numberOption(context, 'minimum') ?? 0,
    maximum: numberOption(context, 'maximum') ?? 100,
    targets: numberArrayOption(context, 'targets') ?? [],
    bands: gaugeBands(context),
    ticks,
  });
  const { plot, layer, theme } = context;
  const nodes: SceneNode[] = [];
  if (model.type === 'linear') {
    const x = plot.x + plot.width * 0.1;
    const width = plot.width * 0.8;
    const y = plot.y + plot.height * 0.46;
    const height = Math.max(12, plot.height * 0.12);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:gauge-track`, { zIndex: layer.zIndex }),
      x,
      y,
      width,
      height,
      fill: theme.colors.surface,
      stroke: theme.colors.axis,
      lineWidth: 1,
      cornerRadius: height / 2,
    });
    model.bands.forEach((band, index) =>
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:gauge-band:${index}`, { zIndex: layer.zIndex + 1 }),
        x: x + band.start * width,
        y,
        width: Math.max(0, (band.end - band.start) * width),
        height,
        fill: band.color ?? categoricalColor(theme, index, model.bands.length),
        lineWidth: 0,
        cornerRadius: 0,
      }),
    );
    const currentX = x + model.position * width;
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:gauge-value`, {
        zIndex: layer.zIndex + 3,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: layer.id,
          rowIndex: 0,
          datum: { value: model.value, minimum: model.minimum, maximum: model.maximum },
          tooltip: {
            value: model.value,
            minimum: model.minimum,
            maximum: model.maximum,
            summary: model.accessibleSummary,
          },
        },
      }),
      x1: currentX,
      x2: currentX,
      y1: y - 8,
      y2: y + height + 8,
      stroke: layer.mark.stroke ?? theme.colors.focus,
      lineWidth: layer.mark.lineWidth ?? 3,
    });
    model.targets.forEach((target, index) => {
      const targetX = x + target.position * width;
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:gauge-target:${index}`, { zIndex: layer.zIndex + 4 }),
        x1: targetX,
        x2: targetX,
        y1: y - 5,
        y2: y + height + 5,
        stroke: theme.colors.text,
        lineWidth: 1.5,
        dash: [3, 2],
      });
    });
    model.ticks.forEach((tick, index) => {
      const tickX = x + tick.position * width;
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:gauge-tick:${index}`, { zIndex: layer.zIndex + 3 }),
        x1: tickX,
        x2: tickX,
        y1: y + height,
        y2: y + height + 5,
        stroke: theme.colors.axis,
        lineWidth: 1,
      });
      nodes.push(
        textNode(
          context,
          `${layer.id}:gauge-tick-label:${index}`,
          tickX,
          y + height + 13,
          tick.label,
          { size: 9 },
        ),
      );
    });
  } else {
    const cx = plot.x + plot.width / 2;
    const cy = plot.y + plot.height * 0.62;
    const radius = Math.min(plot.width * 0.34, plot.height * 0.48);
    const start = Math.PI * 0.8;
    const span = Math.PI * 1.4;
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:gauge-track`, { zIndex: layer.zIndex }),
      points: arcPoints(cx, cy, radius, start, start + span, radius * 0.72),
      closed: true,
      fill: theme.colors.surface,
      stroke: theme.colors.axis,
      lineWidth: 1,
    });
    model.bands.forEach((band, index) =>
      nodes.push({
        type: 'path',
        ...nodeBase(`${layer.id}:gauge-band:${index}`, { zIndex: layer.zIndex + 1 }),
        points: arcPoints(
          cx,
          cy,
          radius,
          start + band.start * span,
          start + band.end * span,
          radius * 0.72,
        ),
        closed: true,
        fill: band.color ?? categoricalColor(theme, index, model.bands.length),
        lineWidth: 0,
      }),
    );
    const angle = start + model.position * span;
    nodes.push({
      type: 'line',
      ...nodeBase(`${layer.id}:gauge-value`, {
        zIndex: layer.zIndex + 3,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: layer.id,
          rowIndex: 0,
          datum: { value: model.value, minimum: model.minimum, maximum: model.maximum },
          tooltip: {
            value: model.value,
            minimum: model.minimum,
            maximum: model.maximum,
            summary: model.accessibleSummary,
          },
        },
      }),
      x1: cx,
      y1: cy,
      x2: cx + Math.cos(angle) * radius * 0.82,
      y2: cy + Math.sin(angle) * radius * 0.82,
      stroke: layer.mark.stroke ?? theme.colors.focus,
      lineWidth: layer.mark.lineWidth ?? 3,
      lineCap: 'round',
    });
    model.targets.forEach((target, index) => {
      const targetAngle = start + target.position * span;
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:gauge-target:${index}`, { zIndex: layer.zIndex + 4 }),
        x1: cx + Math.cos(targetAngle) * radius * 0.69,
        y1: cy + Math.sin(targetAngle) * radius * 0.69,
        x2: cx + Math.cos(targetAngle) * radius * 1.04,
        y2: cy + Math.sin(targetAngle) * radius * 1.04,
        stroke: theme.colors.text,
        lineWidth: 1.5,
      });
    });
    model.ticks.forEach((tick, index) => {
      const tickAngle = start + tick.position * span;
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:gauge-tick:${index}`, { zIndex: layer.zIndex + 3 }),
        x1: cx + Math.cos(tickAngle) * radius * 0.92,
        y1: cy + Math.sin(tickAngle) * radius * 0.92,
        x2: cx + Math.cos(tickAngle) * radius * 1.02,
        y2: cy + Math.sin(tickAngle) * radius * 1.02,
        stroke: theme.colors.axis,
        lineWidth: 1,
      });
      nodes.push(
        textNode(
          context,
          `${layer.id}:gauge-tick-label:${index}`,
          cx + Math.cos(tickAngle) * radius * 1.13,
          cy + Math.sin(tickAngle) * radius * 1.13,
          tick.label,
          { size: 9 },
        ),
      );
    });
  }
  nodes.push(
    textNode(
      context,
      `${layer.id}:gauge-summary`,
      plot.x + plot.width / 2,
      plot.y + plot.height - 15,
      model.accessibleSummary,
      { size: 10, weight: 600 },
    ),
  );
  return nodes;
};

function dataArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/** Timeline compiler with group lane packing, milestones, dependency routes, clipping, duration, and navigator. */
export const compileAdvancedTimelineMark: MarkCompiler = (context) => {
  const idField = context.layer.mark.fields.id ?? 'id';
  const startField = context.layer.mark.fields.start ?? context.layer.x.field;
  const endField = context.layer.mark.fields.end ?? context.layer.y.field;
  const groupField = context.layer.mark.fields.group ?? 'group';
  const labelField = context.layer.mark.fields.label ?? 'label';
  const milestoneField = context.layer.mark.fields.milestone ?? 'milestone';
  const dependencyField = context.layer.mark.fields.dependencies ?? 'dependencies';
  const data = Array.from({ length: context.table.length }, (_, rowIndex) => {
    const rawId = context.table.has(idField) ? context.table.value(rowIndex, idField) : undefined;
    const rawGroup = context.table.has(groupField)
      ? context.table.value(rowIndex, groupField)
      : undefined;
    const rawLabel = context.table.has(labelField)
      ? context.table.value(rowIndex, labelField)
      : undefined;
    const end = context.table.has(endField)
      ? (numericDataValue(context.table.value(rowIndex, endField), true) ?? undefined)
      : undefined;
    return {
      id: rawId === null || rawId === undefined ? `item-${rowIndex}` : String(rawId),
      start: numericDataValue(context.table.value(rowIndex, startField), true) ?? rowIndex,
      ...(end === undefined ? {} : { end }),
      group: rawGroup === null || rawGroup === undefined ? 'default' : String(rawGroup),
      ...(rawLabel === null || rawLabel === undefined ? {} : { label: String(rawLabel) }),
      milestone: context.table.has(milestoneField)
        ? context.table.value(rowIndex, milestoneField) === true
        : false,
      dependencies: context.table.has(dependencyField)
        ? dataArray(context.table.value(rowIndex, dependencyField))
        : [],
    };
  });
  const domain = numberArrayOption(context, 'domain');
  const groupOrder = stringArrayOption(context, 'groupOrder');
  const model = layoutTimeline(data, {
    ...(domain !== undefined && domain.length === 2
      ? { domain: [domain[0]!, domain[1]!] as const }
      : {}),
    ...(groupOrder === undefined ? {} : { groupOrder }),
    clip: booleanOption(context, 'clip') !== false,
  });
  if (model.items.length === 0) return [];
  const navigatorHeight =
    booleanOption(context, 'navigator') === false ? 0 : Math.min(26, context.plot.height * 0.12);
  const usableHeight = context.plot.height - navigatorHeight - (navigatorHeight > 0 ? 5 : 0);
  const groupOffsets = new Map<string, number>();
  let laneCursor = 0;
  model.groups.forEach(({ group, lanes }) => {
    groupOffsets.set(group, laneCursor);
    laneCursor += Math.max(1, lanes);
  });
  const laneCount = Math.max(1, laneCursor);
  const laneHeight = usableHeight / laneCount;
  const span = Math.max(Number.EPSILON, model.domain[1] - model.domain[0]);
  const mapX = (value: number) =>
    context.plot.x + ((value - model.domain[0]) / span) * context.plot.width;
  const centers = new Map<string, Point>();
  const nodes: SceneNode[] = [];
  model.items.forEach((item, index) => {
    const globalLane = (groupOffsets.get(item.group) ?? 0) + item.lane;
    const y = context.plot.y + globalLane * laneHeight + laneHeight * 0.18;
    const height = Math.max(3, laneHeight * 0.64);
    const start = mapX(item.clippedStart);
    const end = mapX(item.clippedEnd);
    const color = categoricalColor(
      context.theme,
      model.groups.findIndex(({ group }) => group === item.group),
      model.groups.length,
    );
    centers.set(item.id, { x: item.milestone ? start : (start + end) / 2, y: y + height / 2 });
    const datum = {
      layerId: context.layer.id,
      rowIndex: data.findIndex(({ id }) => id === item.id),
      datum: {
        id: item.id,
        group: item.group,
        lane: item.lane,
        start: item.start,
        end: item.end,
        duration: item.duration,
        visibleDuration: item.visibleDuration,
        milestone: item.milestone,
        clipped: item.clipped,
        dependencies: [...item.dependencies],
      },
      tooltip: {
        id: item.id,
        group: item.group,
        lane: item.lane,
        start: item.start,
        end: item.end,
        duration: item.duration,
        visibleDuration: item.visibleDuration,
        durationLabel: item.durationLabel,
        milestone: item.milestone,
        clipped: item.clipped,
        dependencies: item.dependencies.join(', '),
      },
    };
    if (item.milestone) {
      const radius = Math.max(4, height * 0.46);
      nodes.push({
        type: 'path',
        ...nodeBase(`${context.layer.id}:timeline:${item.id}`, {
          zIndex: context.layer.zIndex + 2,
          interactive: context.performance.enableHitTesting,
          datum,
        }),
        points: [
          { x: start, y },
          { x: start + radius, y: y + height / 2 },
          { x: start, y: y + height },
          { x: start - radius, y: y + height / 2 },
        ],
        closed: true,
        fill: color,
        stroke: context.theme.colors.background,
        lineWidth: 1,
      });
    } else {
      nodes.push({
        type: 'rect',
        ...nodeBase(`${context.layer.id}:timeline:${item.id}`, {
          zIndex: context.layer.zIndex + 2,
          interactive: context.performance.enableHitTesting,
          datum,
        }),
        x: Math.min(start, end),
        y,
        width: Math.max(2, Math.abs(end - start)),
        height,
        fill: colorWithOpacity(color, item.clipped ? 0.5 : 0.78),
        stroke: color,
        lineWidth: 1,
        cornerRadius: context.layer.mark.cornerRadius ?? 2,
      });
    }
    if (height >= 12)
      nodes.push(
        textNode(
          context,
          `${context.layer.id}:timeline-label:${item.id}`,
          Math.max(
            context.plot.x + 3,
            Math.min(
              context.plot.x + context.plot.width - 3,
              item.milestone ? start + 8 : (start + end) / 2,
            ),
          ),
          y + height / 2,
          data[index]?.label ?? item.id,
          {
            align: item.milestone ? 'left' : 'center',
            size: Math.min(11, height * 0.52),
            fill: readableTextColor(color, '#ffffff', '#0f172a'),
          },
        ),
      );
  });
  model.items.forEach((item) => {
    const target = centers.get(item.id);
    if (target === undefined) return;
    item.dependencies.forEach((dependency, index) => {
      const source = centers.get(dependency);
      if (source === undefined) return;
      const middle = (source.x + target.x) / 2;
      nodes.push({
        type: 'path',
        ...nodeBase(`${context.layer.id}:timeline-dependency:${item.id}:${index}`, {
          zIndex: context.layer.zIndex,
        }),
        points: [source, { x: middle, y: source.y }, { x: middle, y: target.y }, target],
        closed: false,
        stroke: context.theme.colors.mutedText,
        lineWidth: 1,
        dash: [4, 2],
        lineCap: 'round',
        lineJoin: 'round',
      });
    });
  });
  if (navigatorHeight > 0) {
    const y = context.plot.y + context.plot.height - navigatorHeight;
    const observedSpan = Math.max(
      Number.EPSILON,
      model.navigator.maximum - model.navigator.minimum,
    );
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:timeline-navigator-track`, {
        zIndex: context.layer.zIndex + 3,
      }),
      x: context.plot.x,
      y,
      width: context.plot.width,
      height: navigatorHeight,
      fill: context.theme.colors.surface,
      stroke: context.theme.colors.axis,
      lineWidth: 1,
      cornerRadius: 2,
    });
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:timeline-navigator-window`, {
        zIndex: context.layer.zIndex + 4,
        interactive: true,
        datum: {
          layerId: context.layer.id,
          rowIndex: 0,
          datum: { ...model.navigator },
          tooltip: { ...model.navigator },
          familyInteraction: {
            kind: 'navigator-window',
            family: 'timeline',
            minimum: model.navigator.minimum,
            maximum: model.navigator.maximum,
            start: model.navigator.start,
            end: model.navigator.end,
            plot: {
              x: context.plot.x,
              y,
              width: context.plot.width,
              height: navigatorHeight,
            },
          },
        },
      }),
      x:
        context.plot.x +
        ((model.navigator.start - model.navigator.minimum) / observedSpan) * context.plot.width,
      y: y + 2,
      width: Math.max(
        4,
        ((model.navigator.end - model.navigator.start) / observedSpan) * context.plot.width,
      ),
      height: Math.max(2, navigatorHeight - 4),
      fill: colorWithOpacity(context.theme.colors.focus, 0.28),
      stroke: context.theme.colors.focus,
      lineWidth: 1,
      cornerRadius: 2,
    });
  }
  return nodes;
};

function safeObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;
}

function filtersOption(context: MarkCompileContext): TableFilter[] | undefined {
  const value = context.layer.mark.options.filters;
  if (!Array.isArray(value)) return undefined;
  const output: TableFilter[] = [];
  value.forEach((entry) => {
    const object = safeObject(entry);
    if (
      object === undefined ||
      typeof object.field !== 'string' ||
      typeof object.operator !== 'string'
    )
      return;
    if (['equals', 'not-equals', 'contains'].includes(object.operator))
      output.push({
        field: object.field,
        operator: object.operator as 'equals' | 'not-equals' | 'contains',
        value: object.value,
      });
    if (
      ['greater', 'greater-or-equal', 'less', 'less-or-equal'].includes(object.operator) &&
      typeof object.value === 'number'
    )
      output.push({
        field: object.field,
        operator: object.operator as 'greater' | 'greater-or-equal' | 'less' | 'less-or-equal',
        value: object.value,
      });
  });
  return output;
}

function portableValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function sortOption(context: MarkCompileContext): TableSort[] | undefined {
  const value = context.layer.mark.options.sort;
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) => {
    const object = safeObject(entry);
    return object !== undefined && typeof object.field === 'string'
      ? [
          {
            field: object.field,
            direction:
              object.direction === 'descending' ? ('descending' as const) : ('ascending' as const),
          },
        ]
      : [];
  });
}

function groupOption(context: MarkCompileContext): TableGroup | undefined {
  const object = safeObject(context.layer.mark.options.group);
  if (object === undefined || !Array.isArray(object.fields) || !Array.isArray(object.aggregates))
    return undefined;
  const fields = object.fields.filter((field): field is string => typeof field === 'string');
  const aggregates = object.aggregates.flatMap((entry) => {
    const aggregate = safeObject(entry);
    if (
      aggregate === undefined ||
      typeof aggregate.field !== 'string' ||
      typeof aggregate.as !== 'string' ||
      !['count', 'sum', 'mean', 'min', 'max'].includes(String(aggregate.op))
    )
      return [];
    return [
      {
        field: aggregate.field,
        as: aggregate.as,
        op: aggregate.op as 'count' | 'sum' | 'mean' | 'min' | 'max',
      },
    ];
  });
  return { fields, aggregates };
}

function pivotOption(context: MarkCompileContext): TablePivot | undefined {
  const object = safeObject(context.layer.mark.options.pivot);
  if (
    object === undefined ||
    typeof object.row !== 'string' ||
    typeof object.column !== 'string' ||
    typeof object.value !== 'string'
  )
    return undefined;
  return {
    row: object.row,
    column: object.column,
    value: object.value,
    op: object.op === 'count' || object.op === 'mean' ? object.op : 'sum',
  };
}

/** Table compiler with filter/group/pivot/sort, virtual windows, frozen regions, and formatter registry. */
export const compileAdvancedTableMark: MarkCompiler = (context) => {
  const group = groupOption(context);
  const pivot = pivotOption(context);
  const filters = filtersOption(context);
  const sort = sortOption(context);
  const model = buildTableModel(
    Array.from({ length: context.table.length }, (_, index) => context.table.row(index)),
    {
      ...(filters === undefined ? {} : { filters }),
      ...(sort === undefined ? {} : { sort }),
      ...(group === undefined ? {} : { group }),
      ...(pivot === undefined ? {} : { pivot }),
      window: {
        offset: numberOption(context, 'windowOffset') ?? 0,
        limit: numberOption(context, 'windowLimit') ?? Math.min(100, context.table.length),
      },
      columnWindow: {
        offset: numberOption(context, 'columnOffset') ?? 0,
        limit: numberOption(context, 'columnLimit') ?? 100,
      },
      frozenRows: numberOption(context, 'frozenRows') ?? 0,
      frozenColumns: numberOption(context, 'frozenColumns') ?? 0,
    },
  );
  if (model.columnEntries.length === 0) return [];
  const formatters = safeObject(context.layer.mark.options.formatters) ?? {};
  const registry = context.tableFormatters;
  const runtimeFocusedCell = safeObject(context.layer.mark.options.runtimeFocusedCell);
  const focusedRow =
    runtimeFocusedCell !== undefined &&
    typeof runtimeFocusedCell.row === 'number' &&
    Number.isInteger(runtimeFocusedCell.row)
      ? runtimeFocusedCell.row
      : -1;
  const focusedColumn =
    runtimeFocusedCell !== undefined &&
    typeof runtimeFocusedCell.column === 'number' &&
    Number.isInteger(runtimeFocusedCell.column)
      ? runtimeFocusedCell.column
      : -1;
  const rowCount = model.rowEntries.length + 1;
  const rowHeight = context.plot.height / Math.max(2, rowCount);
  const columnWidth = context.plot.width / model.columnEntries.length;
  const nodes: SceneNode[] = [];
  model.columnEntries.forEach(({ field: column, index: absoluteColumn, frozen }, displayColumn) => {
    const x = context.plot.x + displayColumn * columnWidth;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:table-header:${absoluteColumn}`, {
        zIndex: context.layer.zIndex + (frozen ? 5 : 2),
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: 0,
          datum: { field: column, column: absoluteColumn, displayColumn, frozen },
          tooltip: {
            kind: 'table-header',
            field: column,
            column: absoluteColumn,
            displayColumn,
            frozen,
          },
          familyInteraction: {
            kind: 'table-header',
            field: column,
            column: absoluteColumn,
            columns: model.totalColumns,
          } satisfies FamilyDatumInteraction,
        },
      }),
      x,
      y: context.plot.y,
      width: columnWidth,
      height: rowHeight,
      fill: frozen
        ? colorWithOpacity(context.theme.colors.focus, 0.2)
        : context.theme.colors.surface,
      stroke: context.theme.colors.axis,
      lineWidth: 0.7,
      cornerRadius: 0,
    });
    nodes.push(
      textNode(
        context,
        `${context.layer.id}:table-header-label:${absoluteColumn}`,
        x + 5,
        context.plot.y + rowHeight / 2,
        column,
        {
          align: 'left',
          size: Math.min(11, rowHeight * 0.42),
          weight: 700,
          zIndex: context.layer.zIndex + 6,
        },
      ),
    );
  });
  model.rowEntries.forEach(({ row, index: absoluteRow, frozen: frozenRow }, rowIndex) => {
    model.columnEntries.forEach(
      ({ field: column, index: absoluteColumn, frozen: frozenColumn }, displayColumn) => {
        const x = context.plot.x + displayColumn * columnWidth;
        const y = context.plot.y + (rowIndex + 1) * rowHeight;
        const frozen = frozenRow || frozenColumn;
        const rawFormatter = formatters[column];
        if (rawFormatter !== undefined && typeof rawFormatter !== 'string') {
          throw new GraflumeError(
            'INVALID_SPEC',
            `Table formatter for "${column}" must be a registered formatter id.`,
            { path: `$.layers[].mark.options.formatters.${column}` },
          );
        }
        const formatter = rawFormatter ?? 'string';
        const formatted = registry.format(formatter, row[column], row, context.locale);
        const value = portableValue(row[column]);
        const focused = absoluteRow === focusedRow && absoluteColumn === focusedColumn;
        nodes.push({
          type: 'rect',
          ...nodeBase(`${context.layer.id}:table-cell:${absoluteRow}:${absoluteColumn}`, {
            zIndex: context.layer.zIndex + (frozen ? 4 : 1),
            interactive: context.performance.enableHitTesting,
            datum: {
              layerId: context.layer.id,
              rowIndex: typeof row.__sourceIndex === 'number' ? row.__sourceIndex : absoluteRow,
              datum: {
                row: absoluteRow,
                displayRow: rowIndex,
                column: absoluteColumn,
                displayColumn,
                field: column,
                value,
                formatted,
                frozen,
                frozenRow,
                frozenColumn,
              },
              tooltip: {
                row: absoluteRow,
                column,
                columnIndex: absoluteColumn,
                displayColumn,
                value,
                formatted,
                formatter,
                frozen,
                frozenRow,
                frozenColumn,
                totalRows: model.totalRows,
              },
              familyInteraction: {
                kind: 'table-cell',
                field: column,
                row: absoluteRow,
                column: absoluteColumn,
                rows: model.totalRows,
                columns: model.totalColumns,
                windowOffset: model.window.offset,
                windowLimit: model.window.limit,
                columnOffset: model.columnWindow.offset,
                columnLimit: model.columnWindow.limit,
              },
            },
          }),
          x,
          y,
          width: columnWidth,
          height: rowHeight,
          fill: frozen
            ? colorWithOpacity(context.theme.colors.focus, 0.08)
            : rowIndex % 2 === 0
              ? context.theme.colors.background
              : context.theme.colors.surface,
          stroke: focused ? context.theme.colors.focus : context.theme.colors.axis,
          lineWidth: focused ? 2.5 : 0.45,
          cornerRadius: 0,
        });
        nodes.push(
          textNode(
            context,
            `${context.layer.id}:table-cell-label:${absoluteRow}:${absoluteColumn}`,
            x + 5,
            y + rowHeight / 2,
            formatted,
            {
              align: 'left',
              size: Math.min(11, rowHeight * 0.38),
              zIndex: context.layer.zIndex + (frozen ? 5 : 2),
            },
          ),
        );
      },
    );
  });
  if (model.totalRows === 0) {
    nodes.push(
      textNode(
        context,
        `${context.layer.id}:table-empty`,
        context.plot.x + context.plot.width / 2,
        context.plot.y + Math.min(context.plot.height - 12, rowHeight + 24),
        'No matching rows',
        {
          fill: context.theme.colors.mutedText,
          size: Math.min(12, context.theme.typography.fontSize),
          weight: 500,
          zIndex: context.layer.zIndex + 2,
        },
      ),
    );
  }
  return nodes;
};

/** Polar compiler with zero/direction/wrap, nonlinear radius, angular bins, and radial stacking. */
export const compileAdvancedPolarMark: MarkCompiler = (context) => {
  const advancedOptionNames = ['zero', 'direction', 'wrap', 'radiusScale', 'bins', 'radialStack'];
  if (!advancedOptionNames.some((name) => Object.hasOwn(context.layer.mark.options, name))) {
    return compilePolarMark(context);
  }
  const angleField = context.layer.mark.fields.angle ?? context.layer.x.field;
  const valueField = context.layer.mark.fields.value ?? context.layer.y.field;
  const seriesField = context.layer.mark.fields.series ?? 'series';
  const idField = context.layer.mark.fields.id ?? 'id';
  const data = Array.from({ length: context.table.length }, (_, rowIndex) => {
    const rawSeries = context.table.has(seriesField)
      ? context.table.value(rowIndex, seriesField)
      : undefined;
    const rawId = context.table.has(idField) ? context.table.value(rowIndex, idField) : undefined;
    return {
      angle: numericDataValue(context.table.value(rowIndex, angleField)) ?? 0,
      value: numericDataValue(context.table.value(rowIndex, valueField)) ?? 0,
      series: rawSeries === null || rawSeries === undefined ? 'series' : String(rawSeries),
      id: rawId === null || rawId === undefined ? `polar-${rowIndex}` : String(rawId),
    };
  });
  const wrap = numberArrayOption(context, 'wrap');
  const radiusScale = stringOption(context, 'radiusScale');
  const stack = stringOption(context, 'radialStack') ?? stringOption(context, 'stack');
  const model = layoutPolar(data, {
    zero: numberOption(context, 'zero') ?? 0,
    direction:
      stringOption(context, 'direction') === 'counterclockwise' ? 'counterclockwise' : 'clockwise',
    ...(wrap !== undefined && wrap.length === 2 ? { wrap: [wrap[0]!, wrap[1]!] as const } : {}),
    radiusScale: radiusScale === 'log' || radiusScale === 'sqrt' ? radiusScale : 'linear',
    bins: numberOption(context, 'bins') ?? Math.max(1, data.length),
    stack: stack === 'stack' || stack === 'normalize' ? stack : 'none',
  });
  const cx = context.plot.x + context.plot.width / 2;
  const cy = context.plot.y + context.plot.height / 2;
  const radius = Math.max(5, Math.min(context.plot.width, context.plot.height) * 0.42);
  const series = [...new Set(model.segments.map(({ series: value }) => value))];
  return model.segments.map((segment, index): SceneNode => {
    const start = (segment.startAngle * Math.PI) / 180;
    const end = (segment.endAngle * Math.PI) / 180;
    const color = categoricalColor(context.theme, series.indexOf(segment.series), series.length);
    return {
      type: 'path',
      ...nodeBase(`${context.layer.id}:polar:${segment.id}:${index}`, {
        zIndex: context.layer.zIndex,
        opacity: context.layer.mark.opacity,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: data.findIndex(({ id }) => id === segment.id),
          datum: { ...segment },
          tooltip: {
            id: segment.id,
            series: segment.series,
            angle: segment.angle,
            value: segment.value,
            bin: segment.bin,
            innerValue: segment.innerValue,
            outerValue: segment.outerValue,
            innerRadius: segment.innerRadius,
            outerRadius: segment.outerRadius,
            proportion: segment.proportion,
            direction: model.direction,
            zero: model.zero,
          },
        },
      }),
      points: arcPoints(
        cx,
        cy,
        radius * segment.outerRadius,
        start,
        end,
        radius * segment.innerRadius,
      ),
      closed: true,
      fill: context.layer.mark.fill ?? colorWithOpacity(color, 0.76),
      stroke: context.layer.mark.stroke ?? context.theme.colors.background,
      lineWidth: context.layer.mark.lineWidth ?? 1,
      lineJoin: 'round',
    };
  });
};
