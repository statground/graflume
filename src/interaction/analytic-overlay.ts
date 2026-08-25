import { group, nodeBase } from '../scene/factory.js';
import type { SceneNode } from '../scene/types.js';
import type { HighlightStyleSpec } from '../spec/types.js';
import type { AnalyticSelectionState } from './analytic-selection.js';
import { selectionToPixels, type CartesianCoordinateContext } from './cartesian-coordinates.js';

/** Compile completed domain selections into non-interactive, plot-clipped Scene nodes. */
export function compileAnalyticSelectionOverlay(
  state: AnalyticSelectionState,
  context: CartesianCoordinateContext,
  style: Required<HighlightStyleSpec>,
  idPrefix = 'analytic-selection',
): readonly SceneNode[] {
  const nodes: SceneNode[] = [];
  state.selections.forEach((selection, index) => {
    const points = selectionToPixels(context, selection);
    if (selection.type === 'point') {
      const point = points[0];
      if (point === undefined) return;
      nodes.push({
        type: 'circle',
        ...nodeBase(`${idPrefix}:${index}`, { zIndex: 760, opacity: style.opacity }),
        cx: point.x,
        cy: point.y,
        radius: style.radius,
        fill: style.fill,
        stroke: style.stroke,
        lineWidth: style.lineWidth,
        dash: style.dash,
      });
      return;
    }
    if (selection.type === 'lasso') {
      nodes.push({
        type: 'path',
        ...nodeBase(`${idPrefix}:${index}`, { zIndex: 760, opacity: style.opacity }),
        points,
        closed: true,
        fill: style.fill,
        stroke: style.stroke,
        lineWidth: style.lineWidth,
        dash: style.dash,
        lineJoin: 'round',
      });
      return;
    }
    const first = points[0];
    const last = points[1];
    if (first === undefined || last === undefined) return;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${idPrefix}:${index}`, { zIndex: 760, opacity: style.opacity }),
      x: Math.min(first.x, last.x),
      y: Math.min(first.y, last.y),
      width: Math.abs(last.x - first.x),
      height: Math.abs(last.y - first.y),
      fill: style.fill,
      stroke: style.stroke,
      lineWidth: style.lineWidth,
      dash: style.dash,
      cornerRadius: 0,
    });
  });
  return nodes.length === 0
    ? []
    : [group(`${idPrefix}:overlay`, nodes, { zIndex: 760, clip: context.plot })];
}
