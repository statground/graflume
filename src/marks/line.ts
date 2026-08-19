import { minMaxSampleIndices, strideSampleIndices } from '../data/sample.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode, PathNode, Point, SceneNode } from '../scene/types.js';
import type { MarkCompiler } from '../compiler/types.js';
import { numericDataValue, scaleInput } from './utils.js';

export const compileLineMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, color, theme, performance } = context;
  const yValues = Array.from({ length: table.length }, (_, index) =>
    numericDataValue(table.value(index, layer.y.field), layer.y.type === 'temporal'),
  );
  const indices = minMaxSampleIndices(yValues, performance.maxLinePoints);
  const nodes: SceneNode[] = [];
  const pointRows = new Set(
    strideSampleIndices(indices.length, performance.maxPointMarks)
      .map((sampleIndex) => indices[sampleIndex])
      .filter((rowIndex): rowIndex is number => rowIndex !== undefined),
  );
  const segments: { points: Point[]; rowIndices: number[] }[] = [];
  let current: { points: Point[]; rowIndices: number[] } = { points: [], rowIndices: [] };

  const flush = (): void => {
    if (current.points.length > 0) segments.push(current);
    current = { points: [], rowIndices: [] };
  };

  for (const rowIndex of indices) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const yInput = scaleInput(table.value(rowIndex, layer.y.field));
    if (xInput === null || yInput === null) {
      flush();
      continue;
    }
    const x = xScale.map(xInput);
    const y = yScale.map(yInput);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      flush();
      continue;
    }
    current.points.push({ x, y });
    current.rowIndices.push(rowIndex);
  }
  flush();

  const stroke = layer.mark.stroke ?? color;
  const lineWidth = layer.mark.lineWidth ?? theme.mark.lineWidth;

  segments.forEach((segment, segmentIndex) => {
    const path: PathNode = {
      type: 'path',
      ...nodeBase(`${layer.id}:line:${segmentIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
      }),
      points: segment.points,
      closed: false,
      stroke,
      lineWidth,
    };
    nodes.push(path);

    if (layer.mark.point) {
      segment.points.forEach((point, pointIndex) => {
        const rowIndex = segment.rowIndices[pointIndex];
        if (rowIndex === undefined || !pointRows.has(rowIndex)) return;
        const circle: CircleNode = {
          type: 'circle',
          ...nodeBase(`${layer.id}:point:${rowIndex}`, {
            zIndex: layer.zIndex + 0.1,
            opacity: layer.mark.opacity,
            interactive: performance.enableHitTesting,
            datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
          }),
          cx: point.x,
          cy: point.y,
          radius: layer.mark.radius ?? theme.mark.pointRadius,
          fill: layer.mark.fill ?? theme.colors.background,
          stroke,
          lineWidth: Math.max(1, lineWidth),
        };
        nodes.push(circle);
      });
    }
  });

  return nodes;
};
