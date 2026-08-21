import type { MarkCompiler } from '../compiler/types.js';
import { strideSampleIndices } from '../data/sample.js';
import { BandScale } from '../scale/band.js';
import { nodeBase } from '../scene/factory.js';
import type { RectNode } from '../scene/types.js';
import { scaleInput } from './utils.js';

export const compileBarMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, color, theme, barGroup, performance, plot } = context;
  if (layer.mark.orientation === 'horizontal') {
    const baseline = xScale.map(0);
    const slotHeight =
      yScale instanceof BandScale
        ? yScale.bandwidth / Math.max(1, barGroup.count)
        : Math.max(
            1,
            ((plot.height / Math.max(1, table.length)) * 0.8) / Math.max(1, barGroup.count),
          );
    const barHeight = Math.max(1, slotHeight * 0.86);
    const nodes: RectNode[] = [];
    const indices = strideSampleIndices(table.length, performance.maxBarMarks);

    for (const rowIndex of indices) {
      const xInput = scaleInput(table.value(rowIndex, layer.x.field));
      const yInput = scaleInput(table.value(rowIndex, layer.y.field));
      if (xInput === null || yInput === null) continue;
      const xValue = xScale.map(xInput);
      const yCenter = yScale.map(yInput);
      if (!Number.isFinite(xValue) || !Number.isFinite(yCenter) || !Number.isFinite(baseline))
        continue;
      const groupOffset =
        layer.mark.position === 'group'
          ? (barGroup.index - (barGroup.count - 1) / 2) * slotHeight
          : 0;
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:bar:${rowIndex}`, {
          zIndex: layer.zIndex,
          opacity: layer.mark.opacity,
          interactive: performance.enableHitTesting,
          datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
        }),
        x: Math.min(xValue, baseline),
        y: yCenter + groupOffset - barHeight / 2,
        width: Math.max(0.5, Math.abs(baseline - xValue)),
        height: barHeight,
        fill: layer.mark.fill ?? color,
        ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
        lineWidth: layer.mark.lineWidth ?? 0,
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
      });
    }
    return nodes;
  }

  const baseline = yScale.map(0);
  const nodes: RectNode[] = [];
  const slotWidth =
    xScale instanceof BandScale
      ? xScale.bandwidth / Math.max(1, barGroup.count)
      : Math.max(1, ((plot.width / Math.max(1, table.length)) * 0.8) / Math.max(1, barGroup.count));
  const barWidth = Math.max(1, slotWidth * 0.86);

  const indices = strideSampleIndices(table.length, performance.maxBarMarks);

  for (const rowIndex of indices) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const yInput = scaleInput(table.value(rowIndex, layer.y.field));
    if (xInput === null || yInput === null) continue;
    const xCenter = xScale.map(xInput);
    const yValue = yScale.map(yInput);
    if (!Number.isFinite(xCenter) || !Number.isFinite(yValue) || !Number.isFinite(baseline))
      continue;

    const groupOffset =
      layer.mark.position === 'group' ? (barGroup.index - (barGroup.count - 1) / 2) * slotWidth : 0;
    const x = xCenter + groupOffset - barWidth / 2;
    const y = Math.min(yValue, baseline);
    const height = Math.max(0.5, Math.abs(baseline - yValue));

    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:bar:${rowIndex}`, {
        zIndex: layer.zIndex,
        opacity: layer.mark.opacity,
        interactive: performance.enableHitTesting,
        datum: { layerId: layer.id, rowIndex, datum: table.row(rowIndex) },
      }),
      x,
      y,
      width: barWidth,
      height,
      fill: layer.mark.fill ?? color,
      ...(layer.mark.stroke === undefined ? {} : { stroke: layer.mark.stroke }),
      lineWidth: layer.mark.lineWidth ?? 0,
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
  }

  return nodes;
};
