import type { MarkCompiler } from '../compiler/types.js';
import { exactStrideSampleIndices } from '../data/sample.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode, LineNode, PathNode, Point, SceneNode, TextNode } from '../scene/types.js';
import { categoricalColor, mixColor, readableTextColor } from '../theme/color.js';
import { numericDataValue } from './utils.js';

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

function arcPoints(
  cx: number,
  cy: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  innerRadius: number,
): Point[] {
  const span = Math.abs(endAngle - startAngle);
  const steps = Math.max(8, Math.ceil((span / (Math.PI * 2)) * 72));
  const outer = Array.from({ length: steps + 1 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / steps;
    return { x: cx + Math.cos(angle) * outerRadius, y: cy + Math.sin(angle) * outerRadius };
  });
  if (innerRadius <= 0) return [{ x: cx, y: cy }, ...outer];
  const inner = Array.from({ length: steps + 1 }, (_, index) => {
    const angle = endAngle - ((endAngle - startAngle) * index) / steps;
    return { x: cx + Math.cos(angle) * innerRadius, y: cy + Math.sin(angle) * innerRadius };
  });
  return [...outer, ...inner];
}

function labelNode(
  id: string,
  x: number,
  y: number,
  text: string,
  context: Parameters<MarkCompiler>[0],
  fontSize = 12,
  options: {
    align?: CanvasTextAlign;
    fill?: string;
    weight?: string | number;
  } = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: context.layer.zIndex + 1 }),
    x,
    y,
    text,
    fill: options.fill ?? context.theme.colors.text,
    fontFamily: context.theme.typography.fontFamily,
    fontSize,
    fontWeight: options.weight ?? 600,
    align: options.align ?? 'center',
    baseline: 'middle',
    rotation: 0,
  };
}

export const compilePieMark: MarkCompiler = (context) => {
  const { table, layer, plot, theme, performance } = context;
  const values: { rowIndex: number; value: number; label: string }[] = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const rawLabel = table.value(rowIndex, layer.x.field);
    if (value === null || value <= 0 || rawLabel === null || rawLabel === undefined) continue;
    values.push({ rowIndex, value, label: String(rawLabel) });
  }
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return [];

  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(8, Math.min(plot.width, plot.height) * 0.36);
  const innerRatio = Math.max(0, Math.min(0.9, optionNumber(layer.mark.options, 'innerRadius', 0)));
  const innerRadius = radius * innerRatio;
  const startOffset = optionNumber(layer.mark.options, 'startAngle', -Math.PI / 2);
  const labelLimit = Math.max(0, Math.floor(optionNumber(layer.mark.options, 'labelLimit', 8)));
  const nodes: SceneNode[] = [];
  let angle = startOffset;

  values.forEach((item, index) => {
    const next = angle + (item.value / total) * Math.PI * 2;
    const mid = (angle + next) / 2;
    const piePalette = theme.mark.piePalette;
    const fill =
      layer.mark.fill ??
      (piePalette === undefined || piePalette.length === 0
        ? categoricalColor(theme, index, values.length)
        : (piePalette[index % piePalette.length] ?? categoricalColor(theme, index, values.length)));
    const wedge: PathNode = {
      type: 'path',
      ...nodeBase(`${layer.id}:slice:${item.rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex: item.rowIndex, datum: table.row(item.rowIndex) },
      }),
      points: arcPoints(cx, cy, radius, angle, next, innerRadius),
      closed: true,
      fill,
      stroke: layer.mark.stroke ?? theme.mark.pieStroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? theme.mark.pieStrokeWidth ?? 2,
    };
    nodes.push(wedge);
    const share = item.value / total;
    const span = next - angle;
    if (index < labelLimit && span >= 0.16) {
      const percentage = `${Math.round(share * 100)}%`;
      const inside = innerRadius > 0 || span >= 0.48;
      const labelRadius = innerRadius > 0 ? (innerRadius + radius) / 2 : radius * 0.64;
      const text = inside ? `${item.label} · ${percentage}` : `${item.label} ${percentage}`;
      if (!inside) {
        const side = Math.cos(mid) >= 0 ? 1 : -1;
        const edge = {
          x: cx + Math.cos(mid) * radius * 0.9,
          y: cy + Math.sin(mid) * radius * 0.9,
        };
        const elbow = {
          x: cx + Math.cos(mid) * radius * 1.06,
          y: cy + Math.sin(mid) * radius * 1.06,
        };
        nodes.push({
          type: 'path',
          ...nodeBase(`${layer.id}:leader:${item.rowIndex}`, { zIndex: layer.zIndex + 0.9 }),
          points: [edge, elbow, { x: elbow.x + side * 10, y: elbow.y }],
          closed: false,
          stroke: mixColor(fill, theme.colors.text, 0.18),
          lineWidth: 1.2,
          lineCap: 'round',
          lineJoin: 'round',
        });
        nodes.push(
          labelNode(
            `${layer.id}:label:${item.rowIndex}`,
            elbow.x + side * 14,
            elbow.y,
            text,
            context,
            10.5,
            { align: side > 0 ? 'left' : 'right', fill: theme.colors.text, weight: 650 },
          ),
        );
      } else {
        nodes.push(
          labelNode(
            `${layer.id}:label:${item.rowIndex}`,
            cx + Math.cos(mid) * labelRadius,
            cy + Math.sin(mid) * labelRadius,
            text,
            context,
            10.5,
            {
              fill: readableTextColor(fill, '#ffffff', '#0f172a'),
              weight: 700,
            },
          ),
        );
      }
    }
    angle = next;
  });

  if (innerRadius > radius * 0.34) {
    nodes.push(
      labelNode(
        `${layer.id}:center-label`,
        cx,
        cy - 9,
        optionString(layer.mark.options, 'centerLabel') ?? 'Total',
        context,
        10,
        { fill: theme.colors.mutedText, weight: 600 },
      ),
    );
    nodes.push(
      labelNode(`${layer.id}:center-value`, cx, cy + 10, String(total), context, 18, {
        fill: theme.colors.text,
        weight: 750,
      }),
    );
  }

  return nodes;
};

function compileNumberGauge(context: Parameters<MarkCompiler>[0], showDelta: boolean): SceneNode[] {
  const { table, layer, plot, theme, performance } = context;
  const referenceField = layer.mark.fields.reference ?? 'reference';
  const nodesPerRow = showDelta ? 4 : 3;
  const rowBudget = Math.max(1, Math.floor(performance.maxBarMarks / nodesPerRow));
  const rowIndices = exactStrideSampleIndices(table.length, rowBudget);
  const count = Math.max(1, rowIndices.length);
  const slotWidth = plot.width / count;
  const nodes: SceneNode[] = [];
  for (let outputIndex = 0; outputIndex < rowIndices.length; outputIndex += 1) {
    const rowIndex = rowIndices[outputIndex];
    if (rowIndex === undefined) continue;
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const rawLabel = table.value(rowIndex, layer.x.field);
    if (value === null || rawLabel === null || rawLabel === undefined) continue;
    const reference = table.has(referenceField)
      ? numericDataValue(table.value(rowIndex, referenceField))
      : null;
    const delta = reference === null ? null : value - reference;
    const x = plot.x + slotWidth * outputIndex + 4;
    const y = plot.y + 6;
    const width = Math.max(1, slotWidth - 8);
    const height = Math.max(1, plot.height - 12);
    const fill = layer.mark.fill ?? theme.colors.surface;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:gauge-${showDelta ? 'delta' : 'number'}:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: {
          layerId: layer.id,
          rowIndex,
          datum: table.row(rowIndex),
          tooltip: {
            label: String(rawLabel),
            value,
            ...(reference === null ? {} : { reference }),
            ...(delta === null ? {} : { delta }),
          },
        },
      }),
      x,
      y,
      width,
      height,
      fill,
      stroke: mixColor(theme.colors.grid, theme.colors.axis, 0.22),
      lineWidth: 1,
      cornerRadius: layer.mark.cornerRadius ?? 9,
    });
    nodes.push(
      labelNode(
        `${layer.id}:gauge-${showDelta ? 'delta' : 'number'}-label:${rowIndex}`,
        x + width / 2,
        y + height * 0.24,
        String(rawLabel),
        context,
        11,
        { fill: theme.colors.mutedText, weight: 650 },
      ),
      labelNode(
        `${layer.id}:gauge-${showDelta ? 'delta-current' : 'number-value'}:${rowIndex}`,
        x + width / 2,
        y + height * (showDelta ? 0.5 : 0.58),
        String(value),
        context,
        Math.max(18, Math.min(34, width * 0.2)),
        { fill: theme.colors.text, weight: 780 },
      ),
    );
    if (showDelta) {
      const positive = (delta ?? 0) >= 0;
      nodes.push(
        labelNode(
          `${layer.id}:gauge-delta-value:${rowIndex}`,
          x + width / 2,
          y + height * 0.75,
          delta === null ? '—' : `${positive ? '+' : ''}${delta}`,
          context,
          13,
          {
            fill: delta === null ? theme.colors.mutedText : positive ? '#15803d' : '#b91c1c',
            weight: 750,
          },
        ),
      );
    }
  }
  return nodes;
}

function compileBulletGauge(context: Parameters<MarkCompiler>[0]): SceneNode[] {
  const { table, layer, plot, theme, performance } = context;
  const minimum = optionNumber(layer.mark.options, 'min', 0);
  const maximum = optionNumber(layer.mark.options, 'max', 100);
  const span = maximum - minimum || 1;
  const targetField = layer.mark.fields.target ?? 'target';
  const rowBudget = Math.max(1, Math.floor(performance.maxBarMarks / 4));
  const rowIndices = exactStrideSampleIndices(table.length, rowBudget);
  const count = Math.max(1, rowIndices.length);
  const slotHeight = plot.height / count;
  const nodes: SceneNode[] = [];
  for (let outputIndex = 0; outputIndex < rowIndices.length; outputIndex += 1) {
    const rowIndex = rowIndices[outputIndex];
    if (rowIndex === undefined) continue;
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const rawLabel = table.value(rowIndex, layer.x.field);
    if (value === null || rawLabel === null || rawLabel === undefined) continue;
    const target = table.has(targetField)
      ? numericDataValue(table.value(rowIndex, targetField))
      : null;
    const ratio = Math.max(0, Math.min(1, (value - minimum) / span));
    const targetRatio =
      target === null ? null : Math.max(0, Math.min(1, (target - minimum) / span));
    const trackX = plot.x + Math.min(110, plot.width * 0.28);
    const trackWidth = Math.max(24, plot.x + plot.width - trackX - 12);
    const cy = plot.y + slotHeight * (outputIndex + 0.5);
    const trackHeight = Math.max(12, Math.min(28, slotHeight * 0.48));
    const fill = layer.mark.fill ?? categoricalColor(theme, rowIndex, table.length);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:gauge-bullet-track:${rowIndex}`, { zIndex: layer.zIndex }),
      x: trackX,
      y: cy - trackHeight / 2,
      width: trackWidth,
      height: trackHeight,
      fill: mixColor(theme.colors.grid, theme.colors.surface, 0.32),
      stroke: 'transparent',
      lineWidth: 0,
      cornerRadius: trackHeight / 2,
    });
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:gauge-bullet-value:${rowIndex}`, {
        zIndex: layer.zIndex + 0.2,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: {
          layerId: layer.id,
          rowIndex,
          datum: table.row(rowIndex),
          tooltip: {
            label: String(rawLabel),
            value,
            ...(target === null ? {} : { target }),
          },
        },
      }),
      x: trackX,
      y: cy - trackHeight * 0.28,
      width: Math.max(1, trackWidth * ratio),
      height: trackHeight * 0.56,
      fill,
      stroke: 'transparent',
      lineWidth: 0,
      cornerRadius: trackHeight * 0.28,
    });
    if (targetRatio !== null) {
      const targetX = trackX + trackWidth * targetRatio;
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:gauge-bullet-target:${rowIndex}`, {
          zIndex: layer.zIndex + 0.5,
        }),
        x1: targetX,
        y1: cy - trackHeight * 0.7,
        x2: targetX,
        y2: cy + trackHeight * 0.7,
        stroke: theme.colors.text,
        lineWidth: 2,
        lineCap: 'round',
      });
    }
    nodes.push(
      labelNode(
        `${layer.id}:gauge-bullet-label:${rowIndex}`,
        trackX - 8,
        cy,
        String(rawLabel),
        context,
        10,
        { align: 'right', fill: theme.colors.mutedText, weight: 650 },
      ),
    );
  }
  return nodes;
}

export const compileGaugeMark: MarkCompiler = (context) => {
  const mode = context.layer.mark.options.mode;
  if (mode === 'number') return compileNumberGauge(context, false);
  if (mode === 'delta') return compileNumberGauge(context, true);
  if (mode === 'bullet') return compileBulletGauge(context);
  const { table, layer, plot, theme, performance } = context;
  const minimum = optionNumber(layer.mark.options, 'min', 0);
  const maximum = optionNumber(layer.mark.options, 'max', 100);
  const span = maximum - minimum || 1;
  const count = Math.max(1, table.length);
  const slotWidth = plot.width / count;
  const radius = Math.max(12, Math.min(slotWidth * 0.42, plot.height * 0.36));
  const nodes: SceneNode[] = [];

  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const value = numericDataValue(table.value(rowIndex, layer.y.field));
    const label = table.value(rowIndex, layer.x.field);
    if (value === null || label === null || label === undefined) continue;
    const ratio = Math.max(0, Math.min(1, (value - minimum) / span));
    const cx = plot.x + slotWidth * (rowIndex + 0.5);
    const cy = plot.y + plot.height * 0.62;
    const inner = radius * 0.7;
    const fill = layer.mark.fill ?? categoricalColor(theme, rowIndex, table.length);
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:gauge-background:${rowIndex}`, { zIndex: layer.zIndex }),
      points: arcPoints(cx, cy, radius, Math.PI, Math.PI * 2, inner),
      closed: true,
      fill: mixColor(theme.colors.grid, theme.colors.surface, 0.3),
      lineWidth: 0,
    });
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:gauge-value:${rowIndex}`, {
        zIndex: layer.zIndex + 0.1,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      points: arcPoints(cx, cy, radius, Math.PI, Math.PI + Math.PI * ratio, inner),
      closed: true,
      fill,
      lineWidth: 0,
    });
    for (let tickIndex = 0; tickIndex <= 4; tickIndex += 1) {
      const tickAngle = Math.PI + (Math.PI * tickIndex) / 4;
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:gauge-tick:${rowIndex}:${tickIndex}`, {
          zIndex: layer.zIndex + 0.35,
          opacity: 0.72,
        }),
        x1: cx + Math.cos(tickAngle) * radius * 0.76,
        y1: cy + Math.sin(tickAngle) * radius * 0.76,
        x2: cx + Math.cos(tickAngle) * radius * 0.84,
        y2: cy + Math.sin(tickAngle) * radius * 0.84,
        stroke: theme.colors.background,
        lineWidth: 1.25,
        lineCap: 'round',
      });
    }
    const needleAngle = Math.PI + Math.PI * ratio;
    const needle: LineNode = {
      type: 'line',
      ...nodeBase(`${layer.id}:gauge-needle:${rowIndex}`, { zIndex: layer.zIndex + 0.5 }),
      x1: cx,
      y1: cy,
      x2: cx + Math.cos(needleAngle) * radius * 0.62,
      y2: cy + Math.sin(needleAngle) * radius * 0.62,
      stroke: theme.colors.text,
      lineWidth: 2,
      lineCap: 'round',
    };
    nodes.push(needle);
    const hub: CircleNode = {
      type: 'circle',
      ...nodeBase(`${layer.id}:gauge-hub:${rowIndex}`, { zIndex: layer.zIndex + 0.6 }),
      cx,
      cy,
      radius: 4,
      fill: theme.colors.text,
      stroke: theme.colors.background,
      lineWidth: 1.5,
    };
    nodes.push(hub);
    nodes.push(
      labelNode(
        `${layer.id}:gauge-value-label:${rowIndex}`,
        cx,
        cy - 15,
        String(value),
        context,
        17,
        { weight: 750 },
      ),
    );
    nodes.push(
      labelNode(`${layer.id}:gauge-label:${rowIndex}`, cx, cy + 23, String(label), context, 11, {
        fill: theme.colors.mutedText,
        weight: 650,
      }),
    );
  }

  return nodes;
};
