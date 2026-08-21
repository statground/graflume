import { flattenScene } from '../scene/walk.js';
import type { DatumReference, PathNode, Scene, SceneNode } from '../scene/types.js';

export interface HitResult extends DatumReference {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly distance: number;
}

function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function pathDistance(node: PathNode, x: number, y: number): number {
  if (node.closed && node.points.length >= 3) {
    let inside = false;
    for (
      let index = 0, previous = node.points.length - 1;
      index < node.points.length;
      previous = index, index += 1
    ) {
      const currentPoint = node.points[index];
      const previousPoint = node.points[previous];
      if (currentPoint === undefined || previousPoint === undefined) continue;
      const crosses =
        currentPoint.y > y !== previousPoint.y > y &&
        x <
          ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) /
            (previousPoint.y - currentPoint.y || Number.EPSILON) +
            currentPoint.x;
      if (crosses) inside = !inside;
    }
    if (inside) return 0;
  }
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 1; index < node.points.length; index += 1) {
    const first = node.points[index - 1];
    const second = node.points[index];
    if (first === undefined || second === undefined) continue;
    minimum = Math.min(minimum, distanceToSegment(x, y, first.x, first.y, second.x, second.y));
  }
  return minimum;
}

function nodeDistance(node: SceneNode, x: number, y: number): number {
  switch (node.type) {
    case 'circle':
      return Math.max(0, Math.hypot(x - node.cx, y - node.cy) - node.radius);
    case 'rect': {
      const dx = Math.max(node.x - x, 0, x - (node.x + node.width));
      const dy = Math.max(node.y - y, 0, y - (node.y + node.height));
      return Math.hypot(dx, dy);
    }
    case 'line':
      return distanceToSegment(x, y, node.x1, node.y1, node.x2, node.y2);
    case 'path':
      return pathDistance(node, x, y);
    case 'text':
    case 'group':
      return Number.POSITIVE_INFINITY;
  }
}

export function hitTestScene(scene: Scene, x: number, y: number, tolerance = 8): HitResult | null {
  const nodes = [...flattenScene(scene.root)].reverse();
  let best: HitResult | null = null;

  for (const node of nodes) {
    if (node.interactive !== true || node.datum === undefined) continue;
    const distance = nodeDistance(node, x, y);
    if (distance > tolerance || (best !== null && distance >= best.distance)) continue;
    best = {
      ...node.datum,
      nodeId: node.id,
      x,
      y,
      distance,
    };
  }
  return best;
}
