import type { Rect, SceneNode, TextNode } from './types.js';

function union(left: Rect | null, right: Rect | null): Rect | null {
  if (left === null) return right;
  if (right === null) return left;
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const endX = Math.max(left.x + left.width, right.x + right.width);
  const endY = Math.max(left.y + left.height, right.y + right.height);
  return { x, y, width: endX - x, height: endY - y };
}

function textBounds(node: TextNode): Rect {
  const width = Math.max(node.fontSize * 0.6, Array.from(node.text).length * node.fontSize * 0.6);
  const height = Math.max(1, node.fontSize * 1.2);
  const left =
    node.align === 'center'
      ? -width / 2
      : node.align === 'right' || node.align === 'end'
        ? -width
        : 0;
  const top =
    node.baseline === 'middle'
      ? -height / 2
      : node.baseline === 'bottom' || node.baseline === 'ideographic'
        ? -height
        : node.baseline === 'alphabetic'
          ? -height * 0.8
          : 0;
  if (node.rotation === 0) return { x: node.x + left, y: node.y + top, width, height };
  const angle = (node.rotation * Math.PI) / 180;
  const corners = [
    [left, top],
    [left + width, top],
    [left + width, top + height],
    [left, top + height],
  ] as const;
  const points = corners.map(([x, y]) => ({
    x: node.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: node.y + x * Math.sin(angle) + y * Math.cos(angle),
  }));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function sceneNodeBounds(node: SceneNode): Rect | null {
  if (!node.visible || node.opacity <= 0) return null;
  switch (node.type) {
    case 'circle':
      return {
        x: node.cx - node.radius,
        y: node.cy - node.radius,
        width: node.radius * 2,
        height: node.radius * 2,
      };
    case 'rect':
      return {
        x: Math.min(node.x, node.x + node.width),
        y: Math.min(node.y, node.y + node.height),
        width: Math.abs(node.width),
        height: Math.abs(node.height),
      };
    case 'line': {
      const padding = Math.max(0.5, node.lineWidth / 2);
      const x = Math.min(node.x1, node.x2) - padding;
      const y = Math.min(node.y1, node.y2) - padding;
      return {
        x,
        y,
        width: Math.abs(node.x2 - node.x1) + padding * 2,
        height: Math.abs(node.y2 - node.y1) + padding * 2,
      };
    }
    case 'path': {
      const points = [node.points, ...(node.subpaths ?? [])].flat();
      if (points.length === 0) return null;
      const padding = Math.max(0, node.lineWidth / 2);
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const x = Math.min(...xs) - padding;
      const y = Math.min(...ys) - padding;
      return {
        x,
        y,
        width: Math.max(...xs) - Math.min(...xs) + padding * 2,
        height: Math.max(...ys) - Math.min(...ys) + padding * 2,
      };
    }
    case 'text':
      return textBounds(node);
    case 'group': {
      let bounds: Rect | null = null;
      for (const child of node.children) bounds = union(bounds, sceneNodeBounds(child));
      if (bounds === null || node.clip === undefined) return bounds;
      const x = Math.max(bounds.x, node.clip.x);
      const y = Math.max(bounds.y, node.clip.y);
      const endX = Math.min(bounds.x + bounds.width, node.clip.x + node.clip.width);
      const endY = Math.min(bounds.y + bounds.height, node.clip.y + node.clip.height);
      return endX < x || endY < y ? null : { x, y, width: endX - x, height: endY - y };
    }
  }
}

export function unionSceneBounds(nodes: readonly SceneNode[]): Rect | null {
  let bounds: Rect | null = null;
  for (const node of nodes) bounds = union(bounds, sceneNodeBounds(node));
  return bounds;
}

export function nodePaint(node: SceneNode): string | undefined {
  if (node.type === 'rect' || node.type === 'circle' || node.type === 'path') {
    return node.fill ?? node.stroke;
  }
  if (node.type === 'line') return node.stroke;
  if (node.type === 'text') return node.fill;
  for (const child of node.children) {
    const paint = nodePaint(child);
    if (paint !== undefined) return paint;
  }
  return undefined;
}
