import type { MarkCompiler } from '../compiler/types.js';
import { minMaxSampleIndices } from '../data/sample.js';
import { nodeBase } from '../scene/factory.js';
import type { PathNode, Point } from '../scene/types.js';
import { colorWithOpacity } from '../theme/color.js';
import { numericDataValue, scaleInput } from './utils.js';

export const compileAreaMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, color, theme, performance } = context;
  const yValues = Array.from({ length: table.length }, (_, index) =>
    numericDataValue(table.value(index, layer.y.field), layer.y.type === 'temporal'),
  );
  const indices = minMaxSampleIndices(yValues, performance.maxLinePoints);
  const baseline = yScale.map(0);
  const top: Point[] = [];

  for (const rowIndex of indices) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const yInput = scaleInput(table.value(rowIndex, layer.y.field));
    if (xInput === null || yInput === null) continue;
    const x = xScale.map(xInput);
    const y = yScale.map(yInput);
    if (Number.isFinite(x) && Number.isFinite(y)) top.push({ x, y });
  }
  if (top.length === 0) return [];

  const first = top[0];
  const last = top.at(-1);
  if (first === undefined || last === undefined) return [];
  const points: Point[] = [...top, { x: last.x, y: baseline }, { x: first.x, y: baseline }];
  const fill: PathNode = {
    type: 'path',
    ...nodeBase(`${layer.id}:area-fill`, {
      zIndex: layer.zIndex,
      opacity: layer.mark.opacity,
    }),
    points,
    closed: true,
    fill: layer.mark.fill ?? colorWithOpacity(color, theme.mode === 'dark' ? 0.28 : 0.2),
    lineWidth: 0,
  };
  const stroke: PathNode = {
    type: 'path',
    ...nodeBase(`${layer.id}:area-line`, {
      zIndex: layer.zIndex + 0.1,
      opacity: layer.mark.opacity,
    }),
    points: top,
    closed: false,
    stroke: layer.mark.stroke ?? color,
    lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth,
    lineCap: 'round',
    lineJoin: 'round',
  };
  return [fill, stroke];
};
