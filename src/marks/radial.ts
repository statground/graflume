import type { MarkCompiler } from '../compiler/types.js';
import { nodeBase } from '../scene/factory.js';
import type { LineNode, PathNode, Point, SceneNode, TextNode } from '../scene/types.js';
import { numericDataValue } from './utils.js';

function optionNumber(
  options: Readonly<Record<string, unknown>>,
  name: string,
  fallback: number,
): number {
  const value = options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: context.layer.zIndex + 1 }),
    x,
    y,
    text,
    fill: context.theme.colors.text,
    fontFamily: context.theme.typography.fontFamily,
    fontSize,
    fontWeight: 600,
    align: 'center',
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
  const radius = Math.max(8, Math.min(plot.width, plot.height) * 0.39);
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
    if (index < labelLimit && next - angle >= 0.18) {
      const labelRadius = innerRadius > 0 ? (innerRadius + radius) / 2 : radius * 0.65;
      nodes.push(
        labelNode(
          `${layer.id}:label:${item.rowIndex}`,
          cx + Math.cos(mid) * labelRadius,
          cy + Math.sin(mid) * labelRadius,
          item.label,
          context,
          11,
        ),
      );
    }
    angle = next;
  });

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
    const inner = radius * 0.72;
    nodes.push({
      type: 'path',
      ...nodeBase(`${layer.id}:gauge-background:${rowIndex}`, { zIndex: layer.zIndex }),
      points: arcPoints(cx, cy, radius, Math.PI, Math.PI * 2, inner),
      closed: true,
      fill: theme.colors.grid,
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
      fill:
        layer.mark.fill ??
        theme.colors.palette[rowIndex % theme.colors.palette.length] ??
        theme.colors.focus,
      lineWidth: 0,
    });
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
    };
    nodes.push(needle);
    nodes.push(
      labelNode(
        `${layer.id}:gauge-value-label:${rowIndex}`,
        cx,
        cy + 18,
        String(value),
        context,
        16,
      ),
    );
    nodes.push(
      labelNode(`${layer.id}:gauge-label:${rowIndex}`, cx, cy + 39, String(label), context, 11),
    );
  }

  return nodes;
};
