import { strideSampleIndices } from '../data/sample.js';
import type { AxisTooltipTarget } from '../interaction/axis-hit-test.js';
import type { Scale } from '../scale/types.js';
import type { PathNode, Rect, SceneNode } from '../scene/types.js';
import type { TooltipAxis } from '../spec/types.js';
import type { PerformanceSettings } from '../data/performance.js';
import type { ScaleResolution } from './domain.js';

const ROW_TARGET_MARKS = new Set(['area', 'line', 'smooth', 'stepped-area', 'trendline']);

interface AxisTooltipTargetContext {
  readonly axis: TooltipAxis;
  readonly layerGroups: readonly SceneNode[];
  readonly scales: ScaleResolution;
  readonly plot: Rect;
  readonly performance: PerformanceSettings;
  readonly datumVisible?: (
    layerId: string,
    rowIndex: number,
    datum: Readonly<Record<string, unknown>>,
  ) => boolean;
}

function pathBounds(node: PathNode): Rect | null {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const points of [node.points, ...(node.subpaths ?? [])]) {
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function anchor(node: Exclude<SceneNode, { readonly type: 'group' }>): {
  readonly x: number;
  readonly y: number;
} | null {
  switch (node.type) {
    case 'circle':
      return { x: node.cx, y: node.cy };
    case 'rect':
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    case 'line':
      return { x: (node.x1 + node.x2) / 2, y: (node.y1 + node.y2) / 2 };
    case 'text':
      return { x: node.x, y: node.y };
    case 'path': {
      const path = pathBounds(node);
      return path === null ? null : { x: path.x + path.width / 2, y: path.y + path.height / 2 };
    }
  }
}

function bounds(node: Exclude<SceneNode, { readonly type: 'group' }>): Rect {
  switch (node.type) {
    case 'circle':
      return {
        x: node.cx - node.radius,
        y: node.cy - node.radius,
        width: node.radius * 2,
        height: node.radius * 2,
      };
    case 'rect':
      return { x: node.x, y: node.y, width: node.width, height: node.height };
    case 'line':
      return {
        x: Math.min(node.x1, node.x2),
        y: Math.min(node.y1, node.y2),
        width: Math.abs(node.x2 - node.x1),
        height: Math.abs(node.y2 - node.y1),
      };
    case 'text':
      return { x: node.x, y: node.y, width: 0, height: 0 };
    case 'path': {
      return pathBounds(node) ?? { x: 0, y: 0, width: 0, height: 0 };
    }
  }
}

function intersectsPlot(plot: Rect, target: Rect): boolean {
  return (
    target.x + target.width >= plot.x &&
    target.x <= plot.x + plot.width &&
    target.y + target.height >= plot.y &&
    target.y <= plot.y + plot.height
  );
}

function clampToPlot(plot: Rect, x: number, y: number): { readonly x: number; readonly y: number } {
  return {
    x: Math.max(plot.x, Math.min(plot.x + plot.width, x)),
    y: Math.max(plot.y, Math.min(plot.y + plot.height, y)),
  };
}

function scaleValue(scale: Scale, value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    (typeof value !== 'number' && typeof value !== 'string' && !(value instanceof Date))
  ) {
    return null;
  }
  const position = scale.map(value);
  return Number.isFinite(position) ? position : null;
}

export function collectAxisTooltipTargets(
  context: AxisTooltipTargetContext,
): readonly AxisTooltipTarget[] {
  if (!context.performance.enableHitTesting) return [];
  const { axis, scales, plot } = context;
  const channel = axis === 'x' || axis === 'x2' ? 'x' : 'y';
  const layerDataById = new Map(scales.layers.map((layerData) => [layerData.layer.id, layerData]));
  const targets: AxisTooltipTarget[] = [];
  const representedRows = new Set<string>();
  let order = 0;

  const visit = (node: SceneNode, parentOpacity: number): void => {
    const opacity = parentOpacity * node.opacity;
    if (!node.visible || opacity <= 0) return;
    if (node.type === 'group') {
      const children = [...node.children].sort((left, right) => left.zIndex - right.zIndex);
      for (const child of children) visit(child, opacity);
      return;
    }
    if (node.interactive !== true || node.datum === undefined) return;
    const geometry = anchor(node);
    if (geometry === null || !intersectsPlot(plot, bounds(node))) return;
    const clippedGeometry = clampToPlot(plot, geometry.x, geometry.y);
    const layerData = layerDataById.get(node.datum.layerId);
    if (
      layerData !== undefined &&
      (channel === 'x' ? layerData.xAxisId : layerData.yAxisId) !== axis
    ) {
      return;
    }
    let x = clippedGeometry.x;
    let y = clippedGeometry.y;
    if (node.datum.tooltip === undefined && layerData !== undefined) {
      const encoding = layerData.layer[channel];
      const scale = channel === 'x' ? layerData.xScale : layerData.yScale;
      const encoded = scaleValue(scale, node.datum.datum[encoding.field]);
      if (encoded !== null) {
        if (channel === 'x') x = encoded;
        else y = encoded;
      }
    }
    targets.push({
      ...node.datum,
      nodeId: `axis:${node.id}`,
      x,
      y,
      order,
    });
    representedRows.add(`${node.datum.layerId}\u0000${node.datum.rowIndex}`);
    order += 1;
  };
  for (const group of context.layerGroups) visit(group, 1);

  for (const layerData of scales.layers) {
    if (!ROW_TARGET_MARKS.has(layerData.layer.mark.type)) continue;
    if ((channel === 'x' ? layerData.xAxisId : layerData.yAxisId) !== axis) continue;
    const indices = strideSampleIndices(layerData.table.length, context.performance.maxPointMarks);
    for (const rowIndex of indices) {
      if (representedRows.has(`${layerData.layer.id}\u0000${rowIndex}`)) continue;
      const datum = layerData.table.row(rowIndex);
      if (context.datumVisible?.(layerData.layer.id, rowIndex, datum) === false) continue;
      const x = scaleValue(layerData.xScale, datum[layerData.layer.x.field]);
      const y = scaleValue(layerData.yScale, datum[layerData.layer.y.field]);
      if (x === null || y === null) continue;
      const position = clampToPlot(plot, x, y);
      targets.push({
        layerId: layerData.layer.id,
        rowIndex,
        datum,
        nodeId: `axis:${layerData.layer.id}:row:${rowIndex}`,
        x: position.x,
        y: position.y,
        order,
      });
      order += 1;
    }
  }
  return targets;
}
