import type { MarkCompiler } from '../compiler/types.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode, LineNode, PathNode, Point, SceneNode, TextNode } from '../scene/types.js';
import { mixColor, readableTextColor } from '../theme/color.js';
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
    const fill = theme.colors.palette[index % theme.colors.palette.length] ?? theme.colors.focus;
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
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 2,
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

export const compileGaugeMark: MarkCompiler = (context) => {
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
    const fill =
      layer.mark.fill ??
      theme.colors.palette[rowIndex % theme.colors.palette.length] ??
      theme.colors.focus;
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
