import { strideSampleIndices } from '../data/sample.js';
import { createEncodingResolver } from '../encoding/resolve.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode, PathNode, SceneNode } from '../scene/types.js';
import type { MarkCompiler } from '../compiler/types.js';
import {
  collectCurveSegments,
  curveNameForMark,
  curveOptionsForMark,
  interpolateSegments,
} from './curve-series.js';
import { themedPointFill, themedPointStroke } from './utils.js';

export const compileLineMark: MarkCompiler = (context) => {
  const { table, layer, color, theme, performance } = context;
  const encoding = createEncodingResolver(context);
  const segments = interpolateSegments(
    collectCurveSegments(context, 'gap'),
    curveNameForMark(layer.mark.options, 'straight'),
    curveOptionsForMark(layer.mark.options),
    performance.maxLinePoints,
  );
  const nodes: SceneNode[] = [];
  const sourcePoints = segments.flatMap(({ source }) => source);
  const pointRows = new Set(
    strideSampleIndices(sourcePoints.length, performance.maxPointMarks)
      .map((sampleIndex) => sourcePoints[sampleIndex]?.rowIndex)
      .filter((rowIndex): rowIndex is number => rowIndex !== undefined),
  );

  segments.forEach((segment, segmentIndex) => {
    const representative = segment.source[0]?.rowIndex ?? 0;
    const seriesColor = encoding.color('color', representative, color);
    const stroke = encoding.color(
      'stroke',
      representative,
      encoding.has('color')
        ? seriesColor
        : (layer.mark.stroke ?? theme.mark.lineColor ?? theme.mark.defaultColor ?? seriesColor),
    );
    const lineWidth = encoding.number(
      'strokeWidth',
      representative,
      layer.mark.lineWidth ?? theme.mark.lineWidth,
    );
    const dash = encoding.dash(representative);
    const path: PathNode = {
      type: 'path',
      ...nodeBase(`${layer.id}:line:${segmentIndex}`, {
        zIndex: layer.zIndex,
        opacity: encoding.number('opacity', representative, layer.mark.opacity),
      }),
      points: segment.points,
      closed: false,
      stroke,
      lineWidth,
      lineCap: theme.mark.lineCap ?? 'round',
      lineJoin: theme.mark.lineJoin ?? 'round',
      ...(dash.length === 0 ? {} : { dash }),
    };
    nodes.push(path);

    if (layer.mark.point) {
      segment.source.forEach(({ point, rowIndex }) => {
        if (rowIndex === undefined || !pointRows.has(rowIndex)) return;
        const pointColor = encoding.color('color', rowIndex, seriesColor);
        const pointStroke = encoding.color(
          'stroke',
          rowIndex,
          layer.mark.stroke ?? themedPointStroke(theme, pointColor, stroke),
        );
        const encodedSize = encoding.number('size', rowIndex, Number.NaN);
        const radius = encoding.number(
          'radius',
          rowIndex,
          Number.isFinite(encodedSize)
            ? Math.sqrt(Math.max(0, encodedSize) / Math.PI)
            : (layer.mark.radius ?? theme.mark.pointRadius),
        );
        const tooltip = encoding.tooltip(rowIndex);
        const circle: CircleNode = {
          type: 'circle',
          ...nodeBase(`${layer.id}:point:${rowIndex}`, {
            zIndex: layer.zIndex + 0.1,
            opacity: encoding.number('opacity', rowIndex, layer.mark.opacity),
            interactive: performance.enableHitTesting,
            datum: {
              layerId: layer.id,
              rowIndex,
              datum: table.row(rowIndex),
              ...(tooltip === undefined ? {} : { tooltip }),
            },
          }),
          cx: point.x,
          cy: point.y,
          radius,
          fill: encoding.color(
            'fill',
            rowIndex,
            layer.mark.fill ?? themedPointFill(theme, pointColor, theme.colors.background),
          ),
          stroke: pointStroke,
          lineWidth: encoding.number(
            'strokeWidth',
            rowIndex,
            layer.mark.lineWidth === undefined
              ? (theme.mark.pointStrokeWidth ?? Math.max(1.5, lineWidth * 0.68))
              : Math.max(1.5, lineWidth * 0.68),
          ),
          ...(encoding.dash(rowIndex).length === 0 ? {} : { dash: encoding.dash(rowIndex) }),
        };
        nodes.push(circle);
      });
    }
  });

  return nodes;
};
