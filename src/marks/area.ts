import type { MarkCompiler } from '../compiler/types.js';
import { minMaxSampleIndices, strideSampleIndices } from '../data/sample.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode, PathNode, Point, SceneNode } from '../scene/types.js';
import { colorWithOpacity } from '../theme/color.js';
import {
  numericDataValue,
  scaleInput,
  themedAreaFill,
  themedAreaStroke,
  themedPointFill,
  themedPointStroke,
} from './utils.js';

export const compileAreaMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, color, theme, performance } = context;
  const yValues = Array.from({ length: table.length }, (_, index) =>
    numericDataValue(table.value(index, layer.y.field), layer.y.type === 'temporal'),
  );
  const indices = minMaxSampleIndices(yValues, performance.maxLinePoints);
  const baseline = yScale.map(0);
  const top: Point[] = [];
  const topRowIndices: number[] = [];

  for (const rowIndex of indices) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const yInput = scaleInput(table.value(rowIndex, layer.y.field));
    if (xInput === null || yInput === null) continue;
    const x = xScale.map(xInput);
    const y = yScale.map(yInput);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      top.push({ x, y });
      topRowIndices.push(rowIndex);
    }
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
    fill:
      layer.mark.fill ??
      themedAreaFill(theme, color, colorWithOpacity(color, theme.mode === 'dark' ? 0.28 : 0.2)),
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
    stroke:
      layer.mark.stroke ??
      themedAreaStroke(theme, color, theme.mark.lineColor ?? theme.mark.defaultColor ?? color),
    lineWidth: layer.mark.lineWidth ?? theme.mark.lineWidth,
    lineCap: theme.mark.lineCap ?? 'round',
    lineJoin: theme.mark.lineJoin ?? 'round',
  };
  const nodes: SceneNode[] = [
    fill,
    ...(layer.mark.stroke === undefined && theme.mark.areaStrokeVisible === false ? [] : [stroke]),
  ];
  if (layer.mark.point) {
    const pointIndices = new Set(
      strideSampleIndices(top.length, performance.maxPointMarks).filter(
        (index): index is number => index !== undefined,
      ),
    );
    top.forEach((point, pointIndex) => {
      const rowIndex = topRowIndices[pointIndex];
      if (rowIndex === undefined || !pointIndices.has(pointIndex)) return;
      const circle: CircleNode = {
        type: 'circle',
        ...nodeBase(`${layer.id}:area-point:${rowIndex}`, {
          zIndex: layer.zIndex + 0.2,
          opacity: layer.mark.opacity,
          interactive: performance.enableHitTesting,
          datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
        }),
        cx: point.x,
        cy: point.y,
        radius: layer.mark.radius ?? theme.mark.pointRadius,
        fill: layer.mark.fill ?? themedPointFill(theme, color, theme.colors.background),
        stroke:
          layer.mark.stroke ??
          themedPointStroke(
            theme,
            color,
            themedAreaStroke(theme, color, theme.mark.lineColor ?? color),
          ),
        lineWidth:
          layer.mark.lineWidth === undefined
            ? (theme.mark.pointStrokeWidth ?? Math.max(1.5, theme.mark.lineWidth * 0.68))
            : Math.max(1.5, layer.mark.lineWidth * 0.68),
      };
      nodes.push(circle);
    });
  }
  return nodes;
};
