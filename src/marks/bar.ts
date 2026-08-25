import type { MarkCompiler } from '../compiler/types.js';
import { strideSampleIndices } from '../data/sample.js';
import { createEncodingResolver } from '../encoding/resolve.js';
import { BandScale } from '../scale/band.js';
import { nodeBase } from '../scene/factory.js';
import type { RectNode } from '../scene/types.js';
import { compileSeriesBarMark } from './stacked-series.js';
import { scaleInput } from './utils.js';

export const compileBarMark: MarkCompiler = (context) => {
  const series = compileSeriesBarMark(context);
  if (series !== null) return series;
  const { table, layer, xScale, yScale, color, theme, barGroup, performance, plot } = context;
  const encoding = createEncodingResolver(context);
  const themedWidthRatio = theme.mark.barWidthRatio;
  if (layer.mark.orientation === 'horizontal') {
    const defaultBaseline = xScale.map(0);
    const slotHeight =
      yScale instanceof BandScale
        ? (themedWidthRatio === undefined ? yScale.bandwidth : yScale.step) /
          Math.max(1, barGroup.count)
        : Math.max(
            1,
            ((plot.height / Math.max(1, table.length)) *
              (themedWidthRatio === undefined ? 0.8 : 1)) /
              Math.max(1, barGroup.count),
          );
    const barHeight = Math.max(1, slotHeight * (themedWidthRatio ?? 0.74));
    const nodes: RectNode[] = [];
    const indices = encoding.orderedIndices(
      strideSampleIndices(table.length, performance.maxBarMarks),
    );

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
  const slotWidth =
    xScale instanceof BandScale
      ? (themedWidthRatio === undefined ? xScale.bandwidth : xScale.step) /
        Math.max(1, barGroup.count)
      : Math.max(
          1,
          ((plot.width / Math.max(1, table.length)) * (themedWidthRatio === undefined ? 0.8 : 1)) /
            Math.max(1, barGroup.count),
        );
  const barWidth = Math.max(1, slotWidth * (themedWidthRatio ?? 0.74));

  const indices = encoding.orderedIndices(
    strideSampleIndices(table.length, performance.maxBarMarks),
  );

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
