import type { MarkCompiler } from '../compiler/types.js';
import { strideSampleIndices } from '../data/sample.js';
import { createEncodingResolver } from '../encoding/resolve.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode, PathNode, RectNode, SceneNode, TextNode } from '../scene/types.js';
import { scaleInput, themedPointFill, themedPointStroke } from './utils.js';

export const compilePointMark: MarkCompiler = (context) => {
  const { table, layer, xScale, yScale, color, theme, performance } = context;
  const encoding = createEncodingResolver(context);
  const indices = encoding.orderedIndices(
    strideSampleIndices(table.length, performance.maxPointMarks),
  );
  const nodes: SceneNode[] = [];

  for (const rowIndex of indices) {
    const xInput = scaleInput(table.value(rowIndex, layer.x.field));
    const yInput = scaleInput(table.value(rowIndex, layer.y.field));
    if (xInput === null || yInput === null) continue;
    const cx = xScale.map(xInput);
    const cy = yScale.map(yInput);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    const seriesColor = encoding.color('color', rowIndex, color);
    const fill = encoding.color(
      'fill',
      rowIndex,
      encoding.has('color')
        ? seriesColor
        : (layer.mark.fill ??
            themedPointFill(theme, seriesColor, theme.mark.defaultColor ?? seriesColor)),
    );
    const stroke = encoding.color(
      'stroke',
      rowIndex,
      encoding.has('color')
        ? seriesColor
        : (layer.mark.stroke ?? themedPointStroke(theme, seriesColor, theme.colors.background)),
    );
    const encodedSize = encoding.number('size', rowIndex, Number.NaN);
    const radius = encoding.number(
      'radius',
      rowIndex,
      Number.isFinite(encodedSize)
        ? Math.sqrt(Math.max(0, encodedSize) / Math.PI)
        : (layer.mark.radius ?? theme.mark.pointRadius),
    );
    const opacity = encoding.number('opacity', rowIndex, layer.mark.opacity);
    const lineWidth = encoding.number(
      'strokeWidth',
      rowIndex,
      layer.mark.lineWidth ?? theme.mark.pointStrokeWidth ?? 1.75,
    );
    const dash = encoding.dash(rowIndex);
    const base = nodeBase(`${layer.id}:point:${rowIndex}`, {
      zIndex: layer.zIndex,
      opacity,
      interactive: performance.enableHitTesting,
      datum: {
        layerId: layer.id,
        rowIndex,
        datum: table.row(rowIndex),
        ...(encoding.tooltip(rowIndex) === undefined
          ? {}
          : { tooltip: encoding.tooltip(rowIndex)! }),
      },
    });
    const shape = encoding.shape(rowIndex);
    if (shape === 'circle') {
      const node: CircleNode = {
        type: 'circle',
        ...base,
        cx,
        cy,
        radius,
        fill,
        stroke,
        lineWidth,
        ...(dash.length === 0 ? {} : { dash }),
      };
      nodes.push(node);
    } else if (shape === 'square') {
      const node: RectNode = {
        type: 'rect',
        ...base,
        x: cx - radius,
        y: cy - radius,
        width: radius * 2,
        height: radius * 2,
        fill,
        stroke,
        lineWidth,
        cornerRadius: 0,
        ...(dash.length === 0 ? {} : { dash }),
      };
      nodes.push(node);
    } else {
      const points =
        shape === 'triangle'
          ? [
              { x: cx, y: cy - radius },
              { x: cx + radius * 0.866, y: cy + radius * 0.5 },
              { x: cx - radius * 0.866, y: cy + radius * 0.5 },
            ]
          : shape === 'cross'
            ? [
                { x: cx - radius, y: cy - radius / 3 },
                { x: cx - radius / 3, y: cy - radius / 3 },
                { x: cx - radius / 3, y: cy - radius },
                { x: cx + radius / 3, y: cy - radius },
                { x: cx + radius / 3, y: cy - radius / 3 },
                { x: cx + radius, y: cy - radius / 3 },
                { x: cx + radius, y: cy + radius / 3 },
                { x: cx + radius / 3, y: cy + radius / 3 },
                { x: cx + radius / 3, y: cy + radius },
                { x: cx - radius / 3, y: cy + radius },
                { x: cx - radius / 3, y: cy + radius / 3 },
                { x: cx - radius, y: cy + radius / 3 },
              ]
            : [
                { x: cx, y: cy - radius },
                { x: cx + radius, y: cy },
                { x: cx, y: cy + radius },
                { x: cx - radius, y: cy },
              ];
      const node: PathNode = {
        type: 'path',
        ...base,
        points,
        closed: true,
        fill,
        stroke,
        lineWidth,
        ...(dash.length === 0 ? {} : { dash }),
      };
      nodes.push(node);
    }
    const label = encoding.text(rowIndex);
    if (label !== undefined) {
      const text: TextNode = {
        type: 'text',
        ...nodeBase(`${layer.id}:point-label:${rowIndex}`, { zIndex: layer.zIndex + 0.1, opacity }),
        x: cx,
        y: cy - radius - 4,
        text: label,
        fill: encoding.color('color', rowIndex, theme.colors.text),
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.fontSize,
        fontWeight: theme.typography.fontWeight ?? 400,
        align: 'center',
        baseline: 'bottom',
        rotation: 0,
      };
      nodes.push(text);
    }
  }
  return nodes;
};
