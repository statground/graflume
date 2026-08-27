import type { MarkCompiler } from '../compiler/types.js';
import { createEncodingResolver } from '../encoding/resolve.js';
import { nodeBase } from '../scene/factory.js';
import type { RectNode } from '../scene/types.js';
import {
  preservesReferenceBarRatio,
  resolveBarBandLayout,
  selectBarCategoryIndices,
} from './bar-layout.js';
import { compileSeriesBarMark } from './stacked-series.js';
import { scaleInput } from './utils.js';

export const compileBarMark: MarkCompiler = (context) => {
  const series = compileSeriesBarMark(context);
  if (series !== null) return series;
  const { table, layer, xScale, yScale, color, theme, barGroup, performance, plot } = context;
  const encoding = createEncodingResolver(context);
  const themedWidthRatio = theme.mark.barWidthRatio;
  const preserveReferenceWidth = preservesReferenceBarRatio(theme.name);
  const categorySpan = layer.mark.orientation === 'horizontal' ? plot.height : plot.width;
  const indices = encoding.orderedIndices(
    selectBarCategoryIndices({
      categoryCount: table.length,
      plotSpan: categorySpan,
      maximumMarks: performance.maxBarMarks,
      groupCount: barGroup.count,
    }),
  );
  if (layer.mark.orientation === 'horizontal') {
    const defaultBaseline = xScale.map(0);
    const categoryCenters = indices.flatMap((rowIndex) => {
      const input = scaleInput(table.value(rowIndex, layer.y.field));
      if (input === null) return [];
      const center = yScale.map(input);
      return Number.isFinite(center) ? [center] : [];
    });
    const band = resolveBarBandLayout({
      scale: yScale,
      centers: categoryCenters,
      plotSpan: plot.height,
      categoryCount: new Set(categoryCenters).size,
      groupCount: barGroup.count,
      lodSampled: indices.length < table.length,
      maxThickness: 64,
      preserveAuthoredRatio: preserveReferenceWidth,
      ...(themedWidthRatio === undefined ? {} : { barWidthRatio: themedWidthRatio }),
    });
    const slotHeight = band.slot;
    const barHeight = band.thickness;
    const nodes: RectNode[] = [];

    for (const rowIndex of indices) {
      const xInput = scaleInput(table.value(rowIndex, layer.x.field));
      const yInput = scaleInput(table.value(rowIndex, layer.y.field));
      if (xInput === null || yInput === null) continue;
      const xValue = xScale.map(xInput);
      const yCenter = yScale.map(yInput);
      const baseline =
        encoding.position('x2', rowIndex) ??
        (Number.isFinite(defaultBaseline) ? defaultBaseline : xScale.map(xScale.domain()[0] ?? 0));
      if (!Number.isFinite(xValue) || !Number.isFinite(yCenter) || !Number.isFinite(baseline))
        continue;
      const groupOffset =
        layer.mark.position === 'group'
          ? (barGroup.index - (barGroup.count - 1) / 2) * slotHeight
          : 0;
      const encodedY2 = encoding.position('y2', rowIndex);
      const seriesColor = encoding.color('color', rowIndex, color);
      const fill = encoding.color(
        'fill',
        rowIndex,
        encoding.has('color')
          ? seriesColor
          : (layer.mark.fill ?? theme.mark.barFill ?? seriesColor),
      );
      const fallbackStroke = layer.mark.stroke ?? theme.mark.barStroke;
      const stroke = encoding.color('stroke', rowIndex, fallbackStroke ?? seriesColor);
      const hasStroke = encoding.has('stroke') || fallbackStroke !== undefined;
      const lineWidth = encoding.number(
        'strokeWidth',
        rowIndex,
        layer.mark.lineWidth ??
          (hasStroke ? (theme.mark.barStrokeWidth ?? theme.mark.lineWidth) : 0),
      );
      const resolvedY =
        encodedY2 === null ? yCenter + groupOffset - barHeight / 2 : Math.min(yCenter, encodedY2);
      const resolvedHeight =
        encodedY2 === null ? barHeight : Math.max(0.5, Math.abs(encodedY2 - yCenter));
      const tooltip = encoding.tooltip(rowIndex);
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:bar:${rowIndex}`, {
          zIndex: layer.zIndex,
          opacity: encoding.number('opacity', rowIndex, layer.mark.opacity),
          interactive: performance.enableHitTesting,
          datum: {
            layerId: layer.id,
            rowIndex,
            datum: table.row(rowIndex),
            ...(tooltip === undefined ? {} : { tooltip }),
          },
        }),
        x: Math.min(xValue, baseline),
        y: resolvedY,
        width: Math.max(0.5, Math.abs(baseline - xValue)),
        height: resolvedHeight,
        fill,
        ...(hasStroke ? { stroke } : {}),
        lineWidth,
        ...(encoding.dash(rowIndex).length === 0 ? {} : { dash: encoding.dash(rowIndex) }),
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
      });
    }
    return nodes;
  }

  const defaultBaseline = yScale.map(0);
  const nodes: RectNode[] = [];
  const categoryCenters = indices.flatMap((rowIndex) => {
    const input = scaleInput(table.value(rowIndex, layer.x.field));
    if (input === null) return [];
    const center = xScale.map(input);
    return Number.isFinite(center) ? [center] : [];
  });
  const band = resolveBarBandLayout({
    scale: xScale,
    centers: categoryCenters,
    plotSpan: plot.width,
    categoryCount: new Set(categoryCenters).size,
    groupCount: barGroup.count,
    lodSampled: indices.length < table.length,
    maxThickness: 64,
    preserveAuthoredRatio: preserveReferenceWidth,
    ...(themedWidthRatio === undefined ? {} : { barWidthRatio: themedWidthRatio }),
  });
  const slotWidth = band.slot;
  const barWidth = band.thickness;

  for (const rowIndex of indices) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const yInput = scaleInput(table.value(rowIndex, layer.y.field));
    if (xInput === null || yInput === null) continue;
    const xCenter = xScale.map(xInput);
    const yValue = yScale.map(yInput);
    const baseline =
      encoding.position('y2', rowIndex) ??
      (Number.isFinite(defaultBaseline) ? defaultBaseline : yScale.map(yScale.domain()[0] ?? 0));
    if (!Number.isFinite(xCenter) || !Number.isFinite(yValue) || !Number.isFinite(baseline))
      continue;

    const groupOffset =
      layer.mark.position === 'group' ? (barGroup.index - (barGroup.count - 1) / 2) * slotWidth : 0;
    const encodedX2 = encoding.position('x2', rowIndex);
    const x =
      encodedX2 === null ? xCenter + groupOffset - barWidth / 2 : Math.min(xCenter, encodedX2);
    const width = encodedX2 === null ? barWidth : Math.max(0.5, Math.abs(encodedX2 - xCenter));
    const y = Math.min(yValue, baseline);
    const height = Math.max(0.5, Math.abs(baseline - yValue));

    const seriesColor = encoding.color('color', rowIndex, color);
    const fill = encoding.color(
      'fill',
      rowIndex,
      encoding.has('color') ? seriesColor : (layer.mark.fill ?? theme.mark.barFill ?? seriesColor),
    );
    const fallbackStroke = layer.mark.stroke ?? theme.mark.barStroke;
    const stroke = encoding.color('stroke', rowIndex, fallbackStroke ?? seriesColor);
    const hasStroke = encoding.has('stroke') || fallbackStroke !== undefined;
    const lineWidth = encoding.number(
      'strokeWidth',
      rowIndex,
      layer.mark.lineWidth ?? (hasStroke ? (theme.mark.barStrokeWidth ?? theme.mark.lineWidth) : 0),
    );
    const tooltip = encoding.tooltip(rowIndex);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:bar:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: encoding.number('opacity', rowIndex, layer.mark.opacity),
        interactive: performance.enableHitTesting,
        datum: {
          layerId: layer.id,
          rowIndex,
          datum: table.row(rowIndex),
          ...(tooltip === undefined ? {} : { tooltip }),
        },
      }),
      x,
      y,
      width,
      height,
      fill,
      ...(hasStroke ? { stroke } : {}),
      lineWidth,
      ...(encoding.dash(rowIndex).length === 0 ? {} : { dash: encoding.dash(rowIndex) }),
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
  }

  return nodes;
};
