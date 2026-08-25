import type { MarkCompileContext, MarkCompiler } from '../compiler/types.js';
import type { CurveName, MissingValuePolicy } from '../curve/registry.js';
import { interpolateCurve } from '../curve/registry.js';
import { minMaxSampleIndices, strideSampleIndices } from '../data/sample.js';
import { createEncodingResolver } from '../encoding/resolve.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode, PathNode, Point, SceneNode } from '../scene/types.js';
import { colorWithOpacity } from '../theme/color.js';
import {
  collectCurveSegments,
  curveNameForMark,
  curveOptionsForMark,
  interpolateSegments,
} from './curve-series.js';
import { compileSeriesAreaMark } from './stacked-series.js';
import { themedAreaFill, themedAreaStroke, themedPointFill, themedPointStroke } from './utils.js';

interface AreaCompilerDefaults {
  readonly curve: CurveName;
  readonly missing: MissingValuePolicy;
  readonly idStem: string;
}

export function compileAreaSeries(
  context: MarkCompileContext,
  defaults: AreaCompilerDefaults,
): readonly SceneNode[] {
  const { table, layer, yScale, color, theme, performance } = context;
  const encoding = createEncodingResolver(context);
  const curve = curveNameForMark(layer.mark.options, defaults.curve);
  const curveOptions = curveOptionsForMark(layer.mark.options);
  const segments = interpolateSegments(
    collectCurveSegments(context, defaults.missing),
    curve,
    curveOptions,
    performance.maxLinePoints,
  );
  if (segments.length === 0) return [];
  const mappedZero = yScale.map(0);
  const baseline = Number.isFinite(mappedZero) ? mappedZero : yScale.map(yScale.domain()[0] ?? 0);
  const nodes: SceneNode[] = [];

  segments.forEach((segment, segmentIndex) => {
    const first = segment.points[0];
    const last = segment.points.at(-1);
    if (first === undefined || last === undefined) return;
    const suffix = segments.length === 1 ? '' : `:${segmentIndex}`;
    const representative = segment.source[0]?.rowIndex ?? 0;
    const seriesColor = encoding.color('color', representative, color);
    const strokeColor = encoding.color(
      'stroke',
      representative,
      encoding.has('color')
        ? seriesColor
        : (layer.mark.stroke ??
            themedAreaStroke(
              theme,
              seriesColor,
              theme.mark.lineColor ?? theme.mark.defaultColor ?? seriesColor,
            )),
    );
    const lowerSource = segment.source.map(({ point, rowIndex }) => ({
      x: point.x,
      y: encoding.position('y2', rowIndex) ?? baseline,
    }));
    const interpolatedLower = encoding.has('y2')
      ? interpolateCurve(lowerSource, curve, curveOptions)
      : [
          { x: last.x, y: baseline },
          { x: first.x, y: baseline },
        ];
    const lower =
      interpolatedLower.length <= segment.points.length
        ? interpolatedLower
        : minMaxSampleIndices(
            interpolatedLower.map(({ y }) => y),
            segment.points.length,
          )
            .map((index) => interpolatedLower[index])
            .filter((point): point is Point => point !== undefined);
    const points: Point[] = [...segment.points, ...[...lower].reverse()];
    const opacity = encoding.number('opacity', representative, layer.mark.opacity);
    const fillColor = encoding.color(
      'fill',
      representative,
      encoding.has('color')
        ? seriesColor
        : (layer.mark.fill ??
            themedAreaFill(
              theme,
              seriesColor,
              colorWithOpacity(seriesColor, theme.mode === 'dark' ? 0.28 : 0.2),
            )),
    );
    const lineWidth = encoding.number(
      'strokeWidth',
      representative,
      layer.mark.lineWidth ?? theme.mark.lineWidth,
    );
    const dash = encoding.dash(representative);
    const fill: PathNode = {
      type: 'path',
      ...nodeBase(`${layer.id}:${defaults.idStem}-fill${suffix}`, {
        zIndex: layer.zIndex,
        opacity,
      }),
      points,
      closed: true,
      fill: fillColor,
      lineWidth: 0,
    };
    nodes.push(fill);
    if (layer.mark.stroke !== undefined || theme.mark.areaStrokeVisible !== false) {
      const stroke: PathNode = {
        type: 'path',
        ...nodeBase(`${layer.id}:${defaults.idStem}-line${suffix}`, {
          zIndex: layer.zIndex + 0.1,
          opacity,
        }),
        points: segment.points,
        closed: false,
        stroke: strokeColor,
        lineWidth,
        lineCap: theme.mark.lineCap ?? 'round',
        lineJoin: theme.mark.lineJoin ?? 'round',
        ...(dash.length === 0 ? {} : { dash }),
      };
      nodes.push(stroke);
    }
  });

  if (layer.mark.point) {
    const sourcePoints = segments.flatMap(({ source }) => source);
    const pointRows = new Set(
      strideSampleIndices(sourcePoints.length, performance.maxPointMarks)
        .map((index) => sourcePoints[index]?.rowIndex)
        .filter((rowIndex): rowIndex is number => rowIndex !== undefined),
    );
    for (const { source } of segments) {
      for (const { point, rowIndex } of source) {
        if (!pointRows.has(rowIndex)) continue;
        const pointColor = encoding.color('color', rowIndex, color);
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
          ...nodeBase(`${layer.id}:${defaults.idStem}-point:${rowIndex}`, {
            zIndex: layer.zIndex + 0.2,
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
            encoding.has('color')
              ? pointColor
              : (layer.mark.fill ?? themedPointFill(theme, pointColor, theme.colors.background)),
          ),
          stroke: encoding.color(
            'stroke',
            rowIndex,
            encoding.has('color')
              ? pointColor
              : (layer.mark.stroke ??
                  themedPointStroke(
                    theme,
                    pointColor,
                    themedAreaStroke(theme, pointColor, theme.mark.lineColor ?? pointColor),
                  )),
          ),
          lineWidth: encoding.number(
            'strokeWidth',
            rowIndex,
            layer.mark.lineWidth === undefined
              ? (theme.mark.pointStrokeWidth ?? Math.max(1.5, theme.mark.lineWidth * 0.68))
              : Math.max(1.5, layer.mark.lineWidth * 0.68),
          ),
          ...(encoding.dash(rowIndex).length === 0 ? {} : { dash: encoding.dash(rowIndex) }),
        };
        nodes.push(circle);
      }
    }
  }
  return nodes;
}

export const compileAreaMark: MarkCompiler = (context) => {
  const series = compileSeriesAreaMark(context);
  return (
    series ?? compileAreaSeries(context, { curve: 'straight', missing: 'connect', idStem: 'area' })
  );
};
