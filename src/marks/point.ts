import type { MarkCompiler } from '../compiler/types.js';
import { strideSampleIndices } from '../data/sample.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode } from '../scene/types.js';
import { scaleInput } from './utils.js';

export const compilePointMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, color, theme, performance } = context;
  const indices = strideSampleIndices(table.length, performance.maxPointMarks);
  const nodes: CircleNode[] = [];

  for (const rowIndex of indices) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const yInput = scaleInput(table.value(rowIndex, layer.y.field));
    if (xInput === null || yInput === null) continue;
    const cx = xScale.map(xInput);
    const cy = yScale.map(yInput);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    nodes.push({
      type: 'circle',
      ...nodeBase(`${layer.id}:point:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      cx,
      cy,
      radius: layer.mark.radius ?? theme.mark.pointRadius,
      fill: layer.mark.fill ?? color,
      stroke: layer.mark.stroke ?? theme.colors.background,
      lineWidth: layer.mark.lineWidth ?? 1.75,
    });
  }
  return nodes;
};
