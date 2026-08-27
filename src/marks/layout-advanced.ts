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
  type TableMerge,
  type TableMergeRepeat,
  type TablePivot,
  type TableSort,
} from '../data/family-layouts.js';
import { nodeBase } from '../scene/factory.js';
import type { FamilyDatumInteraction, Point, SceneNode, TextNode } from '../scene/types.js';
import { isSafeTableValidationPattern } from '../runtime/table-edit.js';
import { categoricalColor, colorWithOpacity, mixColor, readableTextColor } from '../theme/color.js';
import { compilePolarMark } from './analytical-2d.js';
import { compileGaugeMark } from './radial.js';
import { numericDataValue, temporalTooltipValue } from './utils.js';

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
    readonly style?: 'normal' | 'italic';
    readonly opacity?: number;
    readonly rotation?: number;
    readonly zIndex?: number;
  } = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, {
      zIndex: options.zIndex ?? context.layer.zIndex + 3,
      ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
    }),
    x,
    y,
    text,
    fill: options.fill ?? context.theme.colors.text,
    fontFamily: context.theme.typography.fontFamily,
    fontSize: options.size ?? context.theme.typography.fontSize,
    fontWeight: options.weight ?? 600,
    ...(options.style === undefined ? {} : { fontStyle: options.style }),
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
    const rowIndex = slice.sourceRows[0] ?? index;
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
            sourceRows: [...slice.sourceRows],
            rawValue: slice.rawValue,
            value: slice.value,
            proportion: slice.proportion,
            minimumApplied: slice.minimumApplied,
            tabIndex: runtimeFocusedSlice === undefined ? slice.tabIndex : focused ? 0 : -1,
          },
          tooltip: {
            label: slice.label,
            sourceRows: slice.sourceRows.join(', '),
            sourceRowCount: slice.sourceRows.length,
            sourceRowIndices: [...slice.sourceRows],
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
    const rowIndex = data.findIndex(({ id }) => id === item.id);
    const source = rowIndex < 0 ? {} : context.table.row(rowIndex);
    const tooltipStart =
      context.xType === 'temporal'
        ? temporalTooltipValue(source[startField] ?? item.start)
        : item.start;
    const tooltipEnd =
      context.xType === 'temporal' ? temporalTooltipValue(source[endField] ?? item.end) : item.end;
    const datum = {
      layerId: context.layer.id,
      rowIndex,
      datum: {
        ...source,
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
        start: tooltipStart,
        end: tooltipEnd,
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
    const temporalNavigatorValue = (value: number) => {
      const sourceRowIndex = data.findIndex(({ start, end }) => start === value || end === value);
      if (sourceRowIndex < 0) return temporalTooltipValue(value);
      const sourceField = data[sourceRowIndex]!.start === value ? startField : endField;
      return temporalTooltipValue(context.table.value(sourceRowIndex, sourceField) ?? value);
    };
    const navigatorTooltip =
      context.xType === 'temporal'
        ? {
            minimum: temporalNavigatorValue(model.navigator.minimum),
            maximum: temporalNavigatorValue(model.navigator.maximum),
            start: temporalNavigatorValue(model.navigator.start),
            end: temporalNavigatorValue(model.navigator.end),
          }
        : { ...model.navigator };
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
          tooltip: navigatorTooltip,
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

type TableCellAlign = 'left' | 'center' | 'right';

interface TableCellStyle {
  readonly fill?: string;
  readonly textColor?: string;
  readonly stroke?: string;
  readonly lineWidth?: number;
  readonly fontWeight?: string | number;
  readonly fontStyle?: 'normal' | 'italic';
  readonly opacity?: number;
  readonly align?: TableCellAlign;
}

interface TableCondition {
  readonly field?: string;
  readonly operator:
    | 'equals'
    | 'not-equals'
    | 'contains'
    | 'starts-with'
    | 'ends-with'
    | 'greater'
    | 'greater-or-equal'
    | 'less'
    | 'less-or-equal'
    | 'between'
    | 'in'
    | 'is-null'
    | 'not-null';
  readonly value?: unknown;
}

interface TableStyleRule {
  readonly target: 'row' | 'column' | 'cell';
  readonly row?: number;
  readonly field?: string;
  readonly when?: TableCondition;
  readonly style: TableCellStyle;
}

type TableCellVisual =
  | {
      readonly type: 'data-bar';
      readonly min?: number;
      readonly max?: number;
      readonly color?: string;
      readonly negativeColor?: string;
    }
  | {
      readonly type: 'heatmap';
      readonly min?: number;
      readonly max?: number;
      readonly lowColor?: string;
      readonly highColor?: string;
    }
  | {
      readonly type: 'progress';
      readonly min?: number;
      readonly max?: number;
      readonly color?: string;
      readonly trackColor?: string;
    }
  | {
      readonly type: 'sparkline';
      readonly color?: string;
      readonly fill?: string;
    }
  | {
      readonly type: 'status-badge';
      readonly colors: Readonly<Record<string, string>>;
      readonly defaultColor?: string;
    };

interface TableColumnDefinition {
  readonly field: string;
  readonly header: string;
  readonly width?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly align: TableCellAlign;
  readonly formatter?: string;
  readonly dateStyle?: 'short' | 'medium' | 'long' | 'full';
  readonly timeStyle?: 'short' | 'medium' | 'long' | 'full';
  readonly timeZone?: string;
  readonly visible: boolean;
  readonly editable: boolean;
  readonly editor?: TableEditorDefinition;
  readonly validation?: TableValidationDefinition;
  readonly style: TableCellStyle;
  readonly visual?: TableCellVisual;
}

type TableEditorValue = string | number | boolean | null;

interface TableEditorDefinition {
  readonly type: 'text' | 'number' | 'integer' | 'date' | 'datetime' | 'boolean' | 'select';
  readonly options?: readonly TableEditorValue[];
}

interface TableValidationDefinition {
  readonly required?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly values?: readonly TableEditorValue[];
}

interface TableGridStyle {
  readonly rows: boolean;
  readonly columns: boolean;
  readonly color: string;
  readonly width: number;
}

interface TableEditingDefinition {
  readonly enabled: boolean;
  readonly key?: string;
  readonly commit: 'enter' | 'blur' | 'enter-or-blur';
}

const tableStyleKeys = new Set([
  'fill',
  'textColor',
  'stroke',
  'lineWidth',
  'fontWeight',
  'fontStyle',
  'opacity',
  'align',
]);

function invalidTableOption(path: string, message: string): never {
  throw new GraflumeError('INVALID_SPEC', message, { path });
}

function assertTableKeys(
  object: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  path: string,
): void {
  const unknown = Object.keys(object).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    invalidTableOption(`${path}.${unknown}`, `Unknown table option "${unknown}".`);
  }
}

function tableField(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 128) {
    return invalidTableOption(path, `${path} must be a non-empty field name.`);
  }
  if (value === '__proto__' || value === 'prototype' || value === 'constructor') {
    return invalidTableOption(path, `${path} uses a forbidden field name.`);
  }
  return value;
}

function tableNumber(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    return invalidTableOption(
      path,
      `${path} must be a finite number from ${minimum} to ${maximum}.`,
    );
  }
  return value;
}

function tableColor(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    value.trim() === '' ||
    value.length > 128 ||
    /[;{}]/u.test(value) ||
    /url\s*\(/iu.test(value)
  ) {
    return invalidTableOption(path, `${path} must be a safe, non-empty color string.`);
  }
  return value;
}

function tableStyle(value: unknown, path: string): TableCellStyle {
  if (value === undefined) return {};
  const object = safeObject(value);
  if (object === undefined) return invalidTableOption(path, `${path} must be an object.`);
  assertTableKeys(object, tableStyleKeys, path);
  const align = object.align;
  if (align !== undefined && align !== 'left' && align !== 'center' && align !== 'right') {
    return invalidTableOption(`${path}.align`, 'Table alignment must be left, center, or right.');
  }
  const fontStyle = object.fontStyle;
  if (fontStyle !== undefined && fontStyle !== 'normal' && fontStyle !== 'italic') {
    return invalidTableOption(`${path}.fontStyle`, 'Table fontStyle must be normal or italic.');
  }
  const fontWeight = object.fontWeight;
  if (
    fontWeight !== undefined &&
    !(
      (typeof fontWeight === 'number' &&
        Number.isInteger(fontWeight) &&
        fontWeight >= 100 &&
        fontWeight <= 900) ||
      fontWeight === 'normal' ||
      fontWeight === 'bold'
    )
  ) {
    return invalidTableOption(
      `${path}.fontWeight`,
      'Table fontWeight must be normal, bold, or an integer from 100 to 900.',
    );
  }
  const fill = tableColor(object.fill, `${path}.fill`);
  const textColor = tableColor(object.textColor, `${path}.textColor`);
  const stroke = tableColor(object.stroke, `${path}.stroke`);
  const lineWidth = tableNumber(object.lineWidth, `${path}.lineWidth`, 0, 16);
  const opacity = tableNumber(object.opacity, `${path}.opacity`, 0, 1);
  return {
    ...(fill === undefined ? {} : { fill }),
    ...(textColor === undefined ? {} : { textColor }),
    ...(stroke === undefined ? {} : { stroke }),
    ...(lineWidth === undefined ? {} : { lineWidth }),
    ...(fontWeight === undefined ? {} : { fontWeight: fontWeight as string | number }),
    ...(fontStyle === undefined ? {} : { fontStyle }),
    ...(opacity === undefined ? {} : { opacity }),
    ...(align === undefined ? {} : { align }),
  };
}

function tableCellVisual(value: unknown, path: string): TableCellVisual | undefined {
  if (value === undefined) return undefined;
  const object = safeObject(value);
  if (object === undefined || typeof object.type !== 'string') {
    return invalidTableOption(path, `${path} must be a cell visual object with a type.`);
  }
  const type = object.type;
  const extent = {
    ...(tableNumber(object.min, `${path}.min`, -Number.MAX_VALUE, Number.MAX_VALUE) === undefined
      ? {}
      : { min: object.min as number }),
    ...(tableNumber(object.max, `${path}.max`, -Number.MAX_VALUE, Number.MAX_VALUE) === undefined
      ? {}
      : { max: object.max as number }),
  };
  if (extent.min !== undefined && extent.max !== undefined && extent.max <= extent.min) {
    return invalidTableOption(path, 'A table cell visual max must be greater than min.');
  }
  if (type === 'data-bar') {
    assertTableKeys(object, new Set(['type', 'min', 'max', 'color', 'negativeColor']), path);
    return {
      type,
      ...extent,
      ...(tableColor(object.color, `${path}.color`) === undefined
        ? {}
        : { color: object.color as string }),
      ...(tableColor(object.negativeColor, `${path}.negativeColor`) === undefined
        ? {}
        : { negativeColor: object.negativeColor as string }),
    };
  }
  if (type === 'heatmap') {
    assertTableKeys(object, new Set(['type', 'min', 'max', 'lowColor', 'highColor']), path);
    return {
      type,
      ...extent,
      ...(tableColor(object.lowColor, `${path}.lowColor`) === undefined
        ? {}
        : { lowColor: object.lowColor as string }),
      ...(tableColor(object.highColor, `${path}.highColor`) === undefined
        ? {}
        : { highColor: object.highColor as string }),
    };
  }
  if (type === 'progress') {
    assertTableKeys(object, new Set(['type', 'min', 'max', 'color', 'trackColor']), path);
    return {
      type,
      ...extent,
      ...(tableColor(object.color, `${path}.color`) === undefined
        ? {}
        : { color: object.color as string }),
      ...(tableColor(object.trackColor, `${path}.trackColor`) === undefined
        ? {}
        : { trackColor: object.trackColor as string }),
    };
  }
  if (type === 'sparkline') {
    assertTableKeys(object, new Set(['type', 'color', 'fill']), path);
    return {
      type,
      ...(tableColor(object.color, `${path}.color`) === undefined
        ? {}
        : { color: object.color as string }),
      ...(tableColor(object.fill, `${path}.fill`) === undefined
        ? {}
        : { fill: object.fill as string }),
    };
  }
  if (type === 'status-badge') {
    assertTableKeys(object, new Set(['type', 'colors', 'defaultColor']), path);
    const colors = safeObject(object.colors);
    if (colors === undefined) {
      return invalidTableOption(
        `${path}.colors`,
        'A status-badge visual requires a colors object.',
      );
    }
    if (Object.keys(colors).length > 64) {
      return invalidTableOption(`${path}.colors`, 'Status badge colors are limited to 64 values.');
    }
    const safeColors = Object.fromEntries(
      Object.entries(colors).map(([key, color]) => {
        if (key.length > 128) {
          return invalidTableOption(
            `${path}.colors`,
            'Status badge keys are limited to 128 characters.',
          );
        }
        return [key, tableColor(color, `${path}.colors.${key}`)!];
      }),
    );
    return {
      type,
      colors: safeColors,
      ...(tableColor(object.defaultColor, `${path}.defaultColor`) === undefined
        ? {}
        : { defaultColor: object.defaultColor as string }),
    };
  }
  return invalidTableOption(`${path}.type`, `Unknown table cell visual "${type}".`);
}

function tableEditorValue(value: unknown, path: string): TableEditorValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }
  return invalidTableOption(path, `${path} must be a finite JSON scalar.`);
}

function tableEditor(value: unknown, path: string): TableEditorDefinition | undefined {
  if (value === undefined) return undefined;
  const object = safeObject(value);
  if (object === undefined) return invalidTableOption(path, `${path} must be an object.`);
  assertTableKeys(object, new Set(['type', 'options']), path);
  const type = object.type;
  if (
    type !== 'text' &&
    type !== 'number' &&
    type !== 'integer' &&
    type !== 'date' &&
    type !== 'datetime' &&
    type !== 'boolean' &&
    type !== 'select'
  ) {
    return invalidTableOption(`${path}.type`, 'Unknown table editor type.');
  }
  if (type === 'select') {
    if (
      !Array.isArray(object.options) ||
      object.options.length === 0 ||
      object.options.length > 128
    ) {
      return invalidTableOption(
        `${path}.options`,
        'A select table editor requires from 1 to 128 scalar options.',
      );
    }
    return {
      type,
      options: object.options.map((entry, index) =>
        tableEditorValue(entry, `${path}.options[${index}]`),
      ),
    };
  }
  if (object.options !== undefined) {
    return invalidTableOption(`${path}.options`, 'Only a select table editor accepts options.');
  }
  return { type };
}

function tableValidation(value: unknown, path: string): TableValidationDefinition | undefined {
  if (value === undefined) return undefined;
  const object = safeObject(value);
  if (object === undefined) return invalidTableOption(path, `${path} must be an object.`);
  assertTableKeys(
    object,
    new Set(['required', 'min', 'max', 'minLength', 'maxLength', 'pattern', 'values']),
    path,
  );
  if (object.required !== undefined && typeof object.required !== 'boolean') {
    return invalidTableOption(`${path}.required`, 'Table validation required must be boolean.');
  }
  const min = tableNumber(object.min, `${path}.min`, -Number.MAX_VALUE, Number.MAX_VALUE);
  const max = tableNumber(object.max, `${path}.max`, -Number.MAX_VALUE, Number.MAX_VALUE);
  const minLength = tableNumber(object.minLength, `${path}.minLength`, 0, 100_000);
  const maxLength = tableNumber(object.maxLength, `${path}.maxLength`, 0, 100_000);
  if (min !== undefined && max !== undefined && max < min) {
    return invalidTableOption(path, 'Table validation max cannot be smaller than min.');
  }
  if (minLength !== undefined && maxLength !== undefined && maxLength < minLength) {
    return invalidTableOption(path, 'Table validation maxLength cannot be smaller than minLength.');
  }
  if (minLength !== undefined && !Number.isInteger(minLength)) {
    return invalidTableOption(`${path}.minLength`, 'Table minLength must be an integer.');
  }
  if (maxLength !== undefined && !Number.isInteger(maxLength)) {
    return invalidTableOption(`${path}.maxLength`, 'Table maxLength must be an integer.');
  }
  if (object.pattern !== undefined && !isSafeTableValidationPattern(object.pattern)) {
    return invalidTableOption(
      `${path}.pattern`,
      'Table validation pattern must use the bounded safe regular-expression subset.',
    );
  }
  let values: readonly TableEditorValue[] | undefined;
  if (object.values !== undefined) {
    if (!Array.isArray(object.values) || object.values.length > 128) {
      return invalidTableOption(
        `${path}.values`,
        'Table validation values are limited to 128 scalars.',
      );
    }
    values = object.values.map((entry, index) =>
      tableEditorValue(entry, `${path}.values[${index}]`),
    );
  }
  return {
    ...(object.required === undefined ? {} : { required: object.required }),
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
    ...(minLength === undefined ? {} : { minLength }),
    ...(maxLength === undefined ? {} : { maxLength }),
    ...(object.pattern === undefined ? {} : { pattern: object.pattern as string }),
    ...(values === undefined ? {} : { values }),
  };
}

function tableColumnsOption(context: MarkCompileContext): readonly TableColumnDefinition[] {
  const raw = context.layer.mark.options.columns;
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 128) {
    return invalidTableOption(
      '$.layers[].mark.options.columns',
      'Table columns must be an array of from 1 to 128 field names or column definitions.',
    );
  }
  const values = raw;
  const columns: TableColumnDefinition[] = [];
  const seen = new Set<string>();
  values.forEach((value, index) => {
    const path = `$.layers[].mark.options.columns[${index}]`;
    const object = safeObject(value);
    const field = tableField(typeof value === 'string' ? value : object?.field, `${path}.field`);
    if (seen.has(field)) return;
    seen.add(field);
    if (object !== undefined) {
      assertTableKeys(
        object,
        new Set([
          'field',
          'header',
          'width',
          'minWidth',
          'maxWidth',
          'align',
          'formatter',
          'dateStyle',
          'timeStyle',
          'timeZone',
          'visible',
          'editable',
          'editor',
          'validation',
          'style',
          'visual',
        ]),
        path,
      );
    }
    const header = object?.header ?? field;
    if (typeof header !== 'string' || header.trim() === '' || header.length > 256) {
      invalidTableOption(`${path}.header`, 'A table column header must be non-empty.');
    }
    const align = object?.align ?? 'left';
    if (align !== 'left' && align !== 'center' && align !== 'right') {
      invalidTableOption(`${path}.align`, 'Table alignment must be left, center, or right.');
    }
    if (object?.formatter !== undefined && typeof object.formatter !== 'string') {
      invalidTableOption(`${path}.formatter`, 'A table formatter must be a registered string id.');
    }
    const dateStyle = object?.dateStyle;
    if (
      dateStyle !== undefined &&
      dateStyle !== 'short' &&
      dateStyle !== 'medium' &&
      dateStyle !== 'long' &&
      dateStyle !== 'full'
    ) {
      invalidTableOption(`${path}.dateStyle`, 'Unknown table dateStyle.');
    }
    const timeStyle = object?.timeStyle;
    if (
      timeStyle !== undefined &&
      timeStyle !== 'short' &&
      timeStyle !== 'medium' &&
      timeStyle !== 'long' &&
      timeStyle !== 'full'
    ) {
      invalidTableOption(`${path}.timeStyle`, 'Unknown table timeStyle.');
    }
    if (
      object?.timeZone !== undefined &&
      (typeof object.timeZone !== 'string' ||
        object.timeZone.trim() === '' ||
        object.timeZone.length > 128)
    ) {
      invalidTableOption(`${path}.timeZone`, 'A table timeZone must be a non-empty identifier.');
    }
    if (object?.visible !== undefined && typeof object.visible !== 'boolean') {
      invalidTableOption(`${path}.visible`, 'Table column visibility must be boolean.');
    }
    if (object?.editable !== undefined && typeof object.editable !== 'boolean') {
      invalidTableOption(`${path}.editable`, 'Table column editable must be boolean.');
    }
    const width = tableNumber(object?.width, `${path}.width`, 24, 2_048);
    const minWidth = tableNumber(object?.minWidth, `${path}.minWidth`, 16, 2_048);
    const maxWidth = tableNumber(object?.maxWidth, `${path}.maxWidth`, 16, 4_096);
    if (minWidth !== undefined && maxWidth !== undefined && maxWidth < minWidth) {
      invalidTableOption(path, 'A table column maxWidth cannot be smaller than minWidth.');
    }
    const editor = tableEditor(object?.editor, `${path}.editor`);
    const validation = tableValidation(object?.validation, `${path}.validation`);
    const visual = tableCellVisual(object?.visual, `${path}.visual`);
    columns.push({
      field,
      header,
      ...(width === undefined ? {} : { width }),
      ...(minWidth === undefined ? {} : { minWidth }),
      ...(maxWidth === undefined ? {} : { maxWidth }),
      align,
      ...(object?.formatter === undefined ? {} : { formatter: object.formatter }),
      ...(dateStyle === undefined ? {} : { dateStyle }),
      ...(timeStyle === undefined ? {} : { timeStyle }),
      ...(object?.timeZone === undefined ? {} : { timeZone: object.timeZone }),
      visible: object?.visible !== false,
      editable: object?.editable === true,
      ...(editor === undefined ? {} : { editor }),
      ...(validation === undefined ? {} : { validation }),
      style: tableStyle(object?.style, `${path}.style`),
      ...(visual === undefined ? {} : { visual }),
    });
  });
  return columns;
}

function tableEditingOption(context: MarkCompileContext): TableEditingDefinition {
  const value = context.layer.mark.options.editing;
  if (value === false) return { enabled: false, commit: 'enter-or-blur' };
  if (value === undefined || value === true) {
    return { enabled: true, commit: 'enter-or-blur' };
  }
  const object = safeObject(value);
  if (object === undefined) {
    return invalidTableOption(
      '$.layers[].mark.options.editing',
      'Table editing must be boolean or an object.',
    );
  }
  assertTableKeys(object, new Set(['enabled', 'key', 'commit']), '$.layers[].mark.options.editing');
  if (object.enabled !== undefined && typeof object.enabled !== 'boolean') {
    return invalidTableOption(
      '$.layers[].mark.options.editing.enabled',
      'Table editing enabled must be boolean.',
    );
  }
  const commit = object.commit ?? 'enter-or-blur';
  if (commit !== 'enter' && commit !== 'blur' && commit !== 'enter-or-blur') {
    return invalidTableOption(
      '$.layers[].mark.options.editing.commit',
      'Table edit commit must be enter, blur, or enter-or-blur.',
    );
  }
  return {
    enabled: object.enabled !== false,
    ...(object.key === undefined
      ? {}
      : { key: tableField(object.key, '$.layers[].mark.options.editing.key') }),
    commit,
  };
}

function tableCondition(value: unknown, path: string): TableCondition {
  const object = safeObject(value);
  if (object === undefined || typeof object.operator !== 'string') {
    return invalidTableOption(path, `${path} must declare a condition operator.`);
  }
  assertTableKeys(object, new Set(['field', 'operator', 'value']), path);
  const operators = new Set([
    'equals',
    'not-equals',
    'contains',
    'starts-with',
    'ends-with',
    'greater',
    'greater-or-equal',
    'less',
    'less-or-equal',
    'between',
    'in',
    'is-null',
    'not-null',
  ]);
  if (!operators.has(object.operator)) {
    return invalidTableOption(`${path}.operator`, `Unknown table condition "${object.operator}".`);
  }
  const scalar = (entry: unknown): boolean =>
    entry === null ||
    typeof entry === 'string' ||
    typeof entry === 'boolean' ||
    (typeof entry === 'number' && Number.isFinite(entry));
  if (object.operator === 'is-null' || object.operator === 'not-null') {
    if (object.value !== undefined) {
      return invalidTableOption(
        `${path}.value`,
        `${object.operator} does not accept a comparison value.`,
      );
    }
  } else if (object.value === undefined) {
    return invalidTableOption(`${path}.value`, `${object.operator} requires a comparison value.`);
  }
  if (object.operator === 'between') {
    if (
      !Array.isArray(object.value) ||
      object.value.length !== 2 ||
      !object.value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    ) {
      return invalidTableOption(
        `${path}.value`,
        'The between condition requires two finite numbers.',
      );
    }
  }
  if (
    object.operator === 'in' &&
    (!Array.isArray(object.value) ||
      object.value.length === 0 ||
      object.value.length > 128 ||
      !object.value.every(scalar))
  ) {
    return invalidTableOption(
      `${path}.value`,
      'The in condition requires from 1 to 128 scalar values.',
    );
  }
  if (
    ['greater', 'greater-or-equal', 'less', 'less-or-equal'].includes(object.operator) &&
    (typeof object.value !== 'number' || !Number.isFinite(object.value))
  ) {
    return invalidTableOption(`${path}.value`, `${object.operator} requires a finite number.`);
  }
  if (
    ['equals', 'not-equals', 'contains', 'starts-with', 'ends-with'].includes(object.operator) &&
    !scalar(object.value)
  ) {
    return invalidTableOption(`${path}.value`, `${object.operator} requires a scalar value.`);
  }
  return {
    ...(object.field === undefined ? {} : { field: tableField(object.field, `${path}.field`) }),
    operator: object.operator as TableCondition['operator'],
    ...(object.value === undefined ? {} : { value: object.value }),
  };
}

function tableRule(
  value: unknown,
  path: string,
  target: TableStyleRule['target'],
  requireCondition: boolean,
): TableStyleRule {
  const object = safeObject(value);
  if (object === undefined) return invalidTableOption(path, `${path} must be an object.`);
  assertTableKeys(object, new Set(['target', 'row', 'field', 'when', 'style']), path);
  const resolvedTarget = object.target ?? target;
  if (resolvedTarget !== 'row' && resolvedTarget !== 'column' && resolvedTarget !== 'cell') {
    return invalidTableOption(`${path}.target`, 'Table style target must be row, column, or cell.');
  }
  const row = object.row;
  if (row !== undefined && (!Number.isInteger(row) || (row as number) < 0)) {
    return invalidTableOption(`${path}.row`, 'Table style row must be a non-negative integer.');
  }
  if (requireCondition && object.when === undefined) {
    return invalidTableOption(`${path}.when`, 'Conditional formatting requires a condition.');
  }
  return {
    target: resolvedTarget,
    ...(row === undefined ? {} : { row: row as number }),
    ...(object.field === undefined ? {} : { field: tableField(object.field, `${path}.field`) }),
    ...(object.when === undefined ? {} : { when: tableCondition(object.when, `${path}.when`) }),
    style: tableStyle(object.style, `${path}.style`),
  };
}

function tableStyleRules(context: MarkCompileContext): readonly TableStyleRule[] {
  const rules: TableStyleRule[] = [];
  const collect = (
    option: 'rowStyles' | 'cellStyles' | 'conditionalFormats',
    target: TableStyleRule['target'],
    requireCondition: boolean,
  ): void => {
    const value = context.layer.mark.options[option];
    if (value === undefined) return;
    if (!Array.isArray(value) || value.length > 256) {
      invalidTableOption(
        `$.layers[].mark.options.${option}`,
        `${option} must be an array of at most 256 rules.`,
      );
    }
    value.forEach((entry, index) =>
      rules.push(
        tableRule(entry, `$.layers[].mark.options.${option}[${index}]`, target, requireCondition),
      ),
    );
  };
  const columnStyles = context.layer.mark.options.columnStyles;
  if (columnStyles !== undefined) {
    const object = safeObject(columnStyles);
    if (object === undefined || Object.keys(object).length > 128) {
      invalidTableOption(
        '$.layers[].mark.options.columnStyles',
        'columnStyles must be an object with at most 128 fields.',
      );
    }
    for (const [field, style] of Object.entries(object)) {
      rules.push({
        target: 'column',
        field: tableField(field, '$.layers[].mark.options.columnStyles'),
        style: tableStyle(style, `$.layers[].mark.options.columnStyles.${field}`),
      });
    }
  }
  collect('rowStyles', 'row', false);
  collect('cellStyles', 'cell', false);
  collect('conditionalFormats', 'cell', true);
  return rules;
}

function tableMatchesCondition(
  condition: TableCondition,
  row: Readonly<Record<string, unknown>>,
  defaultField: string,
): boolean {
  const value = row[condition.field ?? defaultField];
  const expected = condition.value;
  if (condition.operator === 'is-null') return value === null || value === undefined;
  if (condition.operator === 'not-null') return value !== null && value !== undefined;
  if (condition.operator === 'equals') return Object.is(value, expected);
  if (condition.operator === 'not-equals') return !Object.is(value, expected);
  if (condition.operator === 'in')
    return (expected as readonly unknown[]).some((item) => Object.is(value, item));
  if (condition.operator === 'contains')
    return String(value ?? '')
      .toLocaleLowerCase()
      .includes(String(expected ?? '').toLocaleLowerCase());
  if (condition.operator === 'starts-with')
    return String(value ?? '')
      .toLocaleLowerCase()
      .startsWith(String(expected ?? '').toLocaleLowerCase());
  if (condition.operator === 'ends-with')
    return String(value ?? '')
      .toLocaleLowerCase()
      .endsWith(String(expected ?? '').toLocaleLowerCase());
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return false;
  if (condition.operator === 'between') {
    const [minimum, maximum] = expected as readonly number[];
    return numeric >= Math.min(minimum!, maximum!) && numeric <= Math.max(minimum!, maximum!);
  }
  const threshold = typeof expected === 'number' ? expected : Number(expected);
  if (!Number.isFinite(threshold)) return false;
  if (condition.operator === 'greater') return numeric > threshold;
  if (condition.operator === 'greater-or-equal') return numeric >= threshold;
  if (condition.operator === 'less') return numeric < threshold;
  return numeric <= threshold;
}

function resolvedTableStyle(
  base: TableCellStyle,
  column: TableColumnDefinition,
  row: Readonly<Record<string, unknown>>,
  rowIndex: number,
  rules: readonly TableStyleRule[],
): TableCellStyle {
  let style: TableCellStyle = { ...base, ...column.style };
  for (const rule of rules) {
    if (rule.row !== undefined && rule.row !== rowIndex) continue;
    if (rule.field !== undefined && rule.field !== column.field) {
      if (rule.target === 'column' || rule.target === 'cell') continue;
    }
    if (rule.target === 'column' && rule.field === undefined) continue;
    if (rule.when !== undefined && !tableMatchesCondition(rule.when, row, column.field)) continue;
    style = { ...style, ...rule.style };
  }
  return style;
}

function tableMergeOptions(context: MarkCompileContext): readonly TableMerge[] | undefined {
  const value = context.layer.mark.options.merges;
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 2_048) {
    return invalidTableOption(
      '$.layers[].mark.options.merges',
      'Table merges must be an array of at most 2048 regions.',
    );
  }
  return value.map((entry, index) => {
    const path = `$.layers[].mark.options.merges[${index}]`;
    const object = safeObject(entry);
    if (object === undefined) return invalidTableOption(path, 'A table merge must be an object.');
    assertTableKeys(object, new Set(['row', 'column', 'rowSpan', 'columnSpan']), path);
    if (!Number.isInteger(object.row) || (object.row as number) < 0) {
      return invalidTableOption(`${path}.row`, 'A table merge row must be a non-negative integer.');
    }
    if (typeof object.column !== 'string' && !Number.isInteger(object.column)) {
      return invalidTableOption(
        `${path}.column`,
        'A table merge column must be a field or integer.',
      );
    }
    return {
      row: object.row as number,
      column: object.column as string | number,
      ...(object.rowSpan === undefined ? {} : { rowSpan: object.rowSpan as number }),
      ...(object.columnSpan === undefined ? {} : { columnSpan: object.columnSpan as number }),
    };
  });
}

function tableMergeRepeatOptions(
  context: MarkCompileContext,
): readonly TableMergeRepeat[] | undefined {
  const value = context.layer.mark.options.mergeRepeats;
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 128) {
    return invalidTableOption(
      '$.layers[].mark.options.mergeRepeats',
      'mergeRepeats must be an array of at most 128 fields.',
    );
  }
  return value.map((entry, index) => {
    if (typeof entry === 'string') return { field: tableField(entry, `$.mergeRepeats[${index}]`) };
    const path = `$.layers[].mark.options.mergeRepeats[${index}]`;
    const object = safeObject(entry);
    if (object === undefined)
      return invalidTableOption(path, 'A repeated merge must be a field or object.');
    assertTableKeys(object, new Set(['field', 'includeNull']), path);
    if (object.includeNull !== undefined && typeof object.includeNull !== 'boolean') {
      return invalidTableOption(`${path}.includeNull`, 'includeNull must be boolean.');
    }
    return {
      field: tableField(object.field, `${path}.field`),
      ...(object.includeNull === undefined ? {} : { includeNull: object.includeNull }),
    };
  });
}

function tableGridStyle(context: MarkCompileContext): TableGridStyle {
  const value = context.layer.mark.options.grid;
  if (value === false) {
    return { rows: false, columns: false, color: context.theme.colors.grid, width: 0 };
  }
  if (value === undefined || value === true) {
    return { rows: true, columns: true, color: context.theme.colors.grid, width: 0.65 };
  }
  const object = safeObject(value);
  if (object === undefined) {
    return invalidTableOption(
      '$.layers[].mark.options.grid',
      'Table grid must be boolean or an object.',
    );
  }
  assertTableKeys(
    object,
    new Set(['rows', 'columns', 'color', 'width']),
    '$.layers[].mark.options.grid',
  );
  if (object.rows !== undefined && typeof object.rows !== 'boolean') {
    return invalidTableOption('$.layers[].mark.options.grid.rows', 'Grid rows must be boolean.');
  }
  if (object.columns !== undefined && typeof object.columns !== 'boolean') {
    return invalidTableOption(
      '$.layers[].mark.options.grid.columns',
      'Grid columns must be boolean.',
    );
  }
  return {
    rows: object.rows !== false,
    columns: object.columns !== false,
    color:
      tableColor(object.color, '$.layers[].mark.options.grid.color') ?? context.theme.colors.grid,
    width: tableNumber(object.width, '$.layers[].mark.options.grid.width', 0, 8) ?? 0.65,
  };
}

function tableGridNodes(
  id: string,
  geometry: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  grid: TableGridStyle,
  zIndex: number,
  edges: { readonly top?: boolean; readonly left?: boolean } = {},
): readonly SceneNode[] {
  if (grid.width <= 0) return [];
  const nodes: SceneNode[] = [];
  const line = (suffix: string, x1: number, y1: number, x2: number, y2: number): SceneNode => ({
    type: 'line',
    ...nodeBase(`${id}:grid-${suffix}`, { zIndex }),
    x1,
    y1,
    x2,
    y2,
    stroke: grid.color,
    lineWidth: grid.width,
  });
  if (grid.rows) {
    if (edges.top === true) {
      nodes.push(line('top', geometry.x, geometry.y, geometry.x + geometry.width, geometry.y));
    }
    nodes.push(
      line(
        'bottom',
        geometry.x,
        geometry.y + geometry.height,
        geometry.x + geometry.width,
        geometry.y + geometry.height,
      ),
    );
  }
  if (grid.columns) {
    if (edges.left === true) {
      nodes.push(line('left', geometry.x, geometry.y, geometry.x, geometry.y + geometry.height));
    }
    nodes.push(
      line(
        'right',
        geometry.x + geometry.width,
        geometry.y,
        geometry.x + geometry.width,
        geometry.y + geometry.height,
      ),
    );
  }
  return nodes;
}

function tableColumnWidths(
  columns: readonly TableColumnDefinition[],
  width: number,
): readonly number[] {
  if (columns.length === 0) return [];
  const equal = width / columns.length;
  const desired = columns.map((column) =>
    Math.max(column.minWidth ?? 16, Math.min(column.maxWidth ?? 4_096, column.width ?? equal)),
  );
  const total = desired.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return columns.map(() => equal);
  const scale = width / total;
  return desired.map((value) => value * scale);
}

function tableText(value: string, width: number, fontSize: number): string {
  const characters = Array.from(value);
  const budget = Math.max(1, Math.floor(width / Math.max(1, fontSize * 0.62)));
  if (characters.length <= budget) return value;
  if (budget <= 1) return '…';
  return `${characters.slice(0, budget - 1).join('')}…`;
}

function tableNumericExtent(
  rows: readonly Readonly<Record<string, unknown>>[],
  field: string,
  visual: Extract<TableCellVisual, { readonly min?: number; readonly max?: number }>,
): readonly [number, number] {
  const values = rows
    .map((row) => (typeof row[field] === 'number' ? row[field] : Number(row[field])))
    .filter((value): value is number => Number.isFinite(value));
  let minimum = visual.min ?? (values.length === 0 ? 0 : Math.min(...values));
  let maximum = visual.max ?? (values.length === 0 ? 1 : Math.max(...values));
  if (minimum === maximum) {
    const padding = Math.max(1, Math.abs(minimum) * 0.05);
    minimum -= padding;
    maximum += padding;
  }
  return [minimum, maximum];
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

function portableValue(
  value: unknown,
): string | number | boolean | null | readonly (string | number | boolean | null)[] {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (value instanceof Date) return value.toISOString();
  if (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry === null ||
        typeof entry === 'string' ||
        typeof entry === 'number' ||
        typeof entry === 'boolean',
    )
  ) {
    return value;
  }
  return JSON.stringify(value);
}

function portableTableDatum(
  row: Readonly<Record<string, unknown>>,
): Readonly<
  Record<string, string | number | boolean | null | readonly (string | number | boolean | null)[]>
> {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([field]) => !field.startsWith('__'))
      .map(([field, value]) => [field, portableValue(value)]),
  );
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

interface TableVisualResult {
  readonly background?: string;
  readonly foreground?: string;
  readonly nodes: readonly SceneNode[];
}

function tableVisualRatio(value: number, minimum: number, maximum: number): number {
  return Math.max(0, Math.min(1, (value - minimum) / Math.max(Number.EPSILON, maximum - minimum)));
}

function compileTableCellVisual(
  context: MarkCompileContext,
  id: string,
  visual: TableCellVisual | undefined,
  rawValue: unknown,
  formatted: string,
  rows: readonly Readonly<Record<string, unknown>>[],
  field: string,
  geometry: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  padding: number,
  zIndex: number,
): TableVisualResult {
  if (visual === undefined) return { nodes: [] };
  const innerX = geometry.x + padding;
  const innerY = geometry.y + Math.max(3, geometry.height * 0.2);
  const innerWidth = Math.max(0, geometry.width - padding * 2);
  const innerHeight = Math.max(2, geometry.height - Math.max(6, geometry.height * 0.4));
  if (visual.type === 'status-badge') {
    const color =
      visual.colors[String(rawValue ?? '')] ?? visual.defaultColor ?? context.theme.colors.focus;
    const badgeWidth = Math.min(
      innerWidth,
      Math.max(18, formatted.length * Math.min(7, geometry.height * 0.24) + padding * 1.5),
    );
    return {
      foreground: readableTextColor(color, '#ffffff', '#111827'),
      nodes: [
        {
          type: 'rect',
          ...nodeBase(`${id}:status-badge`, { zIndex }),
          x: innerX,
          y: geometry.y + Math.max(2, geometry.height * 0.14),
          width: badgeWidth,
          height: Math.max(4, geometry.height * 0.72),
          fill: color,
          lineWidth: 0,
          cornerRadius: Math.min(10, geometry.height * 0.36),
        },
      ],
    };
  }
  if (visual.type === 'sparkline') {
    if (!Array.isArray(rawValue)) return { nodes: [] };
    const values = rawValue.filter(
      (entry): entry is number => typeof entry === 'number' && Number.isFinite(entry),
    );
    if (values.length < 2 || innerWidth <= 4) return { nodes: [] };
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = Math.max(Number.EPSILON, maximum - minimum);
    const sparkWidth = Math.max(4, innerWidth * 0.58);
    const sparkX = geometry.x + geometry.width - padding - sparkWidth;
    const points = values.map((value, index) => ({
      x: sparkX + (index / Math.max(1, values.length - 1)) * sparkWidth,
      y: innerY + innerHeight - ((value - minimum) / range) * innerHeight,
    }));
    const nodes: SceneNode[] = [];
    if (visual.fill !== undefined) {
      nodes.push({
        type: 'path',
        ...nodeBase(`${id}:sparkline-fill`, { zIndex }),
        points: [
          { x: points[0]!.x, y: innerY + innerHeight },
          ...points,
          { x: points[points.length - 1]!.x, y: innerY + innerHeight },
        ],
        closed: true,
        fill: visual.fill,
        lineWidth: 0,
      });
    }
    nodes.push({
      type: 'path',
      ...nodeBase(`${id}:sparkline`, { zIndex: zIndex + 1 }),
      points,
      closed: false,
      stroke: visual.color ?? context.theme.colors.focus,
      lineWidth: 1.5,
      lineCap: 'round',
      lineJoin: 'round',
    });
    return { nodes };
  }
  const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  if (!Number.isFinite(numeric) || innerWidth <= 0) return { nodes: [] };
  const [minimum, maximum] = tableNumericExtent(rows, field, visual);
  const ratio = tableVisualRatio(numeric, minimum, maximum);
  if (visual.type === 'heatmap') {
    return {
      background: mixColor(
        visual.lowColor ?? context.theme.colors.surface,
        visual.highColor ?? context.theme.colors.focus,
        ratio,
      ),
      nodes: [],
    };
  }
  if (visual.type === 'progress') {
    const trackColor = visual.trackColor ?? colorWithOpacity(context.theme.colors.axis, 0.14);
    const color = visual.color ?? context.theme.colors.focus;
    return {
      nodes: [
        {
          type: 'rect',
          ...nodeBase(`${id}:progress-track`, { zIndex }),
          x: innerX,
          y: geometry.y + geometry.height - Math.max(5, geometry.height * 0.24) - 3,
          width: innerWidth,
          height: Math.max(3, geometry.height * 0.18),
          fill: trackColor,
          lineWidth: 0,
          cornerRadius: 3,
        },
        {
          type: 'rect',
          ...nodeBase(`${id}:progress`, { zIndex: zIndex + 1 }),
          x: innerX,
          y: geometry.y + geometry.height - Math.max(5, geometry.height * 0.24) - 3,
          width: innerWidth * ratio,
          height: Math.max(3, geometry.height * 0.18),
          fill: color,
          lineWidth: 0,
          cornerRadius: 3,
        },
      ],
    };
  }
  const zero = tableVisualRatio(0, minimum, maximum);
  const start = Math.min(zero, ratio);
  const end = Math.max(zero, ratio);
  return {
    nodes: [
      {
        type: 'rect',
        ...nodeBase(`${id}:data-bar`, { zIndex, opacity: 0.26 }),
        x: innerX + innerWidth * start,
        y: innerY,
        width: Math.max(1, innerWidth * (end - start)),
        height: innerHeight,
        fill:
          numeric < 0
            ? (visual.negativeColor ??
              context.theme.colors.diverging[0] ??
              context.theme.colors.focus)
            : (visual.color ?? context.theme.colors.focus),
        lineWidth: 0,
        cornerRadius: Math.min(3, innerHeight / 2),
      },
    ],
  };
}

/** Product table compiler with formatting, merges, cell visuals, and bounded interaction metadata. */
export const compileAdvancedTableMark: MarkCompiler = (context) => {
  const group = groupOption(context);
  const pivot = pivotOption(context);
  const filters = filtersOption(context);
  const sort = sortOption(context);
  const authoredColumns = tableColumnsOption(context);
  const explicitColumns = context.layer.mark.options.columns !== undefined;
  const visibleAuthoredColumns = authoredColumns.filter(({ visible }) => visible);
  const headerHeight =
    tableNumber(
      context.layer.mark.options.headerHeight,
      '$.layers[].mark.options.headerHeight',
      20,
      160,
    ) ?? 34;
  const rowHeight =
    tableNumber(
      context.layer.mark.options.rowHeight,
      '$.layers[].mark.options.rowHeight',
      18,
      160,
    ) ?? 30;
  const cellPadding =
    tableNumber(
      context.layer.mark.options.cellPadding,
      '$.layers[].mark.options.cellPadding',
      0,
      32,
    ) ?? 8;
  const maximumVisibleRows = Math.max(
    0,
    Math.floor((context.plot.height - headerHeight) / rowHeight),
  );
  const requestedWindowLimit = numberOption(context, 'windowLimit');
  const merges = tableMergeOptions(context);
  const mergeRepeats = tableMergeRepeatOptions(context);
  const model = buildTableModel(
    Array.from({ length: context.table.length }, (_, index) => context.table.row(index)),
    {
      ...(filters === undefined ? {} : { filters }),
      ...(sort === undefined ? {} : { sort }),
      ...(group === undefined ? {} : { group }),
      ...(pivot === undefined ? {} : { pivot }),
      ...(explicitColumns ? { columns: visibleAuthoredColumns.map(({ field }) => field) } : {}),
      ...(merges === undefined ? {} : { merges }),
      ...(mergeRepeats === undefined ? {} : { mergeRepeats }),
      window: {
        offset: numberOption(context, 'windowOffset') ?? 0,
        limit: Math.min(requestedWindowLimit ?? maximumVisibleRows, maximumVisibleRows),
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
  const rules = tableStyleRules(context);
  const baseStyle = tableStyle(context.layer.mark.options.style, '$.layers[].mark.options.style');
  const headerStyle = tableStyle(
    context.layer.mark.options.headerStyle,
    '$.layers[].mark.options.headerStyle',
  );
  const grid = tableGridStyle(context);
  const editing = tableEditingOption(context);
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
  const authoredByField = new Map(visibleAuthoredColumns.map((column) => [column.field, column]));
  const defaultColumn = (field: string): TableColumnDefinition => ({
    field,
    header: field,
    align: 'left',
    visible: true,
    editable: false,
    style: {},
  });
  const displayedColumns = model.columnEntries.map(
    ({ field }) => authoredByField.get(field) ?? defaultColumn(field),
  );
  const widths = tableColumnWidths(displayedColumns, context.plot.width);
  let columnX = context.plot.x;
  const columnGeometry = new Map<
    number,
    { readonly x: number; readonly width: number; readonly displayColumn: number }
  >();
  model.columnEntries.forEach(({ index }, displayColumn) => {
    const width = widths[displayColumn] ?? 0;
    columnGeometry.set(index, { x: columnX, width, displayColumn });
    columnX += width;
  });
  const rowGeometry = new Map<number, { readonly y: number; readonly displayRow: number }>();
  model.rowEntries.forEach(({ index }, displayRow) => {
    rowGeometry.set(index, {
      y: context.plot.y + headerHeight + displayRow * rowHeight,
      displayRow,
    });
  });
  const mergeByCell = new Map<
    string,
    (typeof model.merges)[number] & { readonly anchor: boolean }
  >();
  model.merges.forEach((merge) => {
    for (let row = merge.row; row < merge.row + merge.rowSpan; row += 1) {
      for (let column = merge.column; column < merge.column + merge.columnSpan; column += 1) {
        mergeByCell.set(`${row}:${column}`, {
          ...merge,
          anchor: row === merge.row && column === merge.column,
        });
      }
    }
  });
  const nodes: SceneNode[] = [];
  model.columnEntries.forEach(({ field: column, index: absoluteColumn, frozen }, displayColumn) => {
    const definition = displayedColumns[displayColumn] ?? defaultColumn(column);
    const geometry = columnGeometry.get(absoluteColumn)!;
    const align = headerStyle.align ?? definition.align;
    const fontSize = Math.max(8, Math.min(12, headerHeight * 0.34));
    const headerHasBorder = headerStyle.stroke !== undefined || headerStyle.lineWidth !== undefined;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:table-header:${absoluteColumn}`, {
        zIndex: context.layer.zIndex + (frozen ? 5 : 2),
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: 0,
          datum: {
            field: column,
            header: definition.header,
            column: absoluteColumn,
            displayColumn,
            frozen,
            editable: definition.editable && editing.enabled,
          },
          tooltip: {
            kind: 'table-header',
            field: column,
            header: definition.header,
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
      x: geometry.x,
      y: context.plot.y,
      width: geometry.width,
      height: headerHeight,
      fill:
        headerStyle.fill ??
        (frozen ? colorWithOpacity(context.theme.colors.focus, 0.2) : context.theme.colors.surface),
      ...(headerHasBorder ? { stroke: headerStyle.stroke ?? grid.color } : {}),
      lineWidth: headerHasBorder ? (headerStyle.lineWidth ?? Math.max(0.7, grid.width)) : 0,
      cornerRadius: 0,
    });
    if (!headerHasBorder) {
      nodes.push(
        ...tableGridNodes(
          `${context.layer.id}:table-grid-header:${absoluteColumn}`,
          { x: geometry.x, y: context.plot.y, width: geometry.width, height: headerHeight },
          grid,
          context.layer.zIndex + (frozen ? 6 : 3),
          { top: true, left: displayColumn === 0 },
        ),
      );
    }
    const availableTextWidth = Math.max(1, geometry.width - cellPadding * 2);
    const headerText = tableText(definition.header, availableTextWidth, fontSize);
    const textX =
      align === 'center'
        ? geometry.x + geometry.width / 2
        : align === 'right'
          ? geometry.x + geometry.width - cellPadding
          : geometry.x + cellPadding;
    nodes.push(
      textNode(
        context,
        `${context.layer.id}:table-header-label:${absoluteColumn}`,
        textX,
        context.plot.y + headerHeight / 2,
        headerText,
        {
          align,
          ...(headerStyle.textColor === undefined ? {} : { fill: headerStyle.textColor }),
          size: fontSize,
          weight: headerStyle.fontWeight ?? 700,
          ...(headerStyle.fontStyle === undefined ? {} : { style: headerStyle.fontStyle }),
          ...(headerStyle.opacity === undefined ? {} : { opacity: headerStyle.opacity }),
          zIndex: context.layer.zIndex + 6,
        },
      ),
    );
  });
  model.rowEntries.forEach(({ row, index: absoluteRow, frozen: frozenRow }, rowIndex) => {
    model.columnEntries.forEach(
      ({ field: column, index: absoluteColumn, frozen: frozenColumn }, displayColumn) => {
        const merge = mergeByCell.get(`${absoluteRow}:${absoluteColumn}`);
        if (merge !== undefined && !merge.anchor) return;
        const definition = displayedColumns[displayColumn] ?? defaultColumn(column);
        const firstColumn = columnGeometry.get(absoluteColumn)!;
        const firstRow = rowGeometry.get(absoluteRow)!;
        const rowSpan = merge?.rowSpan ?? 1;
        const columnSpan = merge?.columnSpan ?? 1;
        const width = Array.from(
          { length: columnSpan },
          (_value, index) => columnGeometry.get(absoluteColumn + index)?.width ?? 0,
        ).reduce((sum, value) => sum + value, 0);
        const height = rowHeight * rowSpan;
        const x = firstColumn.x;
        const y = firstRow.y;
        const frozen = frozenRow || frozenColumn;
        const rawFormatter = formatters[column];
        if (rawFormatter !== undefined && typeof rawFormatter !== 'string') {
          throw new GraflumeError(
            'INVALID_SPEC',
            `Table formatter for "${column}" must be a registered formatter id.`,
            { path: `$.layers[].mark.options.formatters.${column}` },
          );
        }
        const formatter = definition.formatter ?? rawFormatter ?? 'string';
        const formatted = registry.format(formatter, row[column], row, context.locale, {
          ...(definition.dateStyle === undefined ? {} : { dateStyle: definition.dateStyle }),
          ...(definition.timeStyle === undefined ? {} : { timeStyle: definition.timeStyle }),
          ...(definition.timeZone === undefined ? {} : { timeZone: definition.timeZone }),
        });
        const value = portableValue(row[column]);
        const focused = absoluteRow === focusedRow && absoluteColumn === focusedColumn;
        const sourceRowIndex =
          typeof row.__sourceIndex === 'number' ? row.__sourceIndex : absoluteRow;
        const editable =
          editing.enabled &&
          definition.editable &&
          group === undefined &&
          pivot === undefined &&
          typeof row.__sourceIndex === 'number';
        const keyValue = editing.key === undefined ? undefined : portableValue(row[editing.key]);
        const style = resolvedTableStyle(baseStyle, definition, row, absoluteRow, rules);
        const visual = compileTableCellVisual(
          context,
          `${context.layer.id}:table-cell-visual:${absoluteRow}:${absoluteColumn}`,
          definition.visual,
          row[column],
          formatted,
          model.allRows,
          column,
          { x, y, width, height },
          cellPadding,
          context.layer.zIndex + (frozen ? 5 : 2),
        );
        const editor = definition.editor ?? {
          type:
            typeof row[column] === 'number'
              ? ('number' as const)
              : typeof row[column] === 'boolean'
                ? ('boolean' as const)
                : ('text' as const),
        };
        const sourceDatum = portableTableDatum(row);
        const editMetadata = editable
          ? {
              editCommit: editing.commit,
              editEditorType: editor.type,
              ...(editor.options === undefined ? {} : { editEditorOptions: editor.options }),
              ...(editing.key === undefined
                ? {}
                : { editKeyField: editing.key, editKeyValue: keyValue }),
              ...(definition.validation?.required === undefined
                ? {}
                : { editRequired: definition.validation.required }),
              ...(definition.validation?.min === undefined
                ? {}
                : { editMin: definition.validation.min }),
              ...(definition.validation?.max === undefined
                ? {}
                : { editMax: definition.validation.max }),
              ...(definition.validation?.minLength === undefined
                ? {}
                : { editMinLength: definition.validation.minLength }),
              ...(definition.validation?.maxLength === undefined
                ? {}
                : { editMaxLength: definition.validation.maxLength }),
              ...(definition.validation?.pattern === undefined
                ? {}
                : { editPattern: definition.validation.pattern }),
              ...(definition.validation?.values === undefined
                ? {}
                : { editValues: definition.validation.values }),
            }
          : {};
        const cellHasBorder =
          focused || style.stroke !== undefined || style.lineWidth !== undefined;
        nodes.push({
          type: 'rect',
          ...nodeBase(`${context.layer.id}:table-cell:${absoluteRow}:${absoluteColumn}`, {
            zIndex: context.layer.zIndex + (frozen ? 4 : 1),
            interactive: context.performance.enableHitTesting,
            datum: {
              layerId: context.layer.id,
              rowIndex: sourceRowIndex,
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
                editable,
                merged: merge !== undefined,
                anchorRow: merge?.row ?? absoluteRow,
                anchorColumn: merge?.column ?? absoluteColumn,
                rowSpan,
                columnSpan,
                // Source values intentionally win generic names such as `value`, `row`,
                // and `column`, so configured tooltips retain the complete authored row.
                ...sourceDatum,
                // Runtime-critical identities use reserved names and cannot be shadowed.
                sourceRowIndex,
                editEnabled: editable,
                ...editMetadata,
                tableRow: absoluteRow,
                tableColumn: absoluteColumn,
                tableField: column,
                cellValue: value,
                cellFormatted: formatted,
              },
              tooltip: {
                row: absoluteRow,
                column,
                columnIndex: absoluteColumn,
                displayColumn,
                value,
                formatted,
                formatter,
                editable,
                merged: merge !== undefined,
                rowSpan,
                columnSpan,
                frozen,
                frozenRow,
                frozenColumn,
                totalRows: model.totalRows,
                ...sourceDatum,
                tableRow: absoluteRow,
                tableColumn: absoluteColumn,
                tableField: column,
                cellValue: value,
                cellFormatted: formatted,
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
          width,
          height,
          fill:
            style.fill ??
            visual.background ??
            (frozen
              ? colorWithOpacity(context.theme.colors.focus, 0.08)
              : rowIndex % 2 === 0
                ? context.theme.colors.background
                : context.theme.colors.surface),
          ...(cellHasBorder
            ? { stroke: focused ? context.theme.colors.focus : (style.stroke ?? grid.color) }
            : {}),
          lineWidth: focused ? 2.5 : cellHasBorder ? (style.lineWidth ?? 0.7) : 0,
          cornerRadius: 0,
        });
        if (!cellHasBorder) {
          nodes.push(
            ...tableGridNodes(
              `${context.layer.id}:table-grid-cell:${absoluteRow}:${absoluteColumn}`,
              { x, y, width, height },
              grid,
              context.layer.zIndex + (frozen ? 6 : 3),
              { left: displayColumn === 0 },
            ),
          );
        }
        nodes.push(...visual.nodes);
        const fontSize = Math.max(8, Math.min(12, rowHeight * 0.36));
        const align = style.align ?? definition.align;
        const visualTextReserve = definition.visual?.type === 'sparkline' ? width * 0.6 : 0;
        const availableTextWidth = Math.max(1, width - cellPadding * 2 - visualTextReserve);
        const renderedText = tableText(formatted, availableTextWidth, fontSize);
        const textX =
          align === 'center'
            ? x + width / 2
            : align === 'right'
              ? x + width - cellPadding
              : x + cellPadding;
        nodes.push(
          textNode(
            context,
            `${context.layer.id}:table-cell-label:${absoluteRow}:${absoluteColumn}`,
            textX,
            y + height / 2,
            renderedText,
            {
              align,
              ...((style.textColor ?? visual.foreground) === undefined
                ? {}
                : { fill: style.textColor ?? visual.foreground }),
              size: fontSize,
              weight: style.fontWeight ?? 500,
              ...(style.fontStyle === undefined ? {} : { style: style.fontStyle }),
              ...(style.opacity === undefined ? {} : { opacity: style.opacity }),
              zIndex: context.layer.zIndex + (frozen ? 7 : 4),
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
        context.plot.y + Math.min(context.plot.height - 12, headerHeight + rowHeight),
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
