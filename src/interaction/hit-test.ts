import type { DatumReference, PathNode, Rect, Scene, SceneNode, TextNode } from '../scene/types.js';

export interface HitResult extends DatumReference {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly distance: number;
}

interface HitCandidate {
  readonly node: SceneNode;
  readonly clips: readonly Rect[];
}

const hitCandidateCache = new WeakMap<Scene, readonly HitCandidate[]>();

function sceneHitCandidates(scene: Scene): readonly HitCandidate[] {
  const cached = hitCandidateCache.get(scene);
  if (cached !== undefined) return cached;
  const candidates: HitCandidate[] = [];
  const visit = (node: SceneNode, parentOpacity: number, clips: readonly Rect[]): void => {
    const opacity = parentOpacity * node.opacity;
    if (!node.visible || opacity <= 0) return;
    if (node.type === 'group') {
      const nextClips = node.clip === undefined ? clips : [...clips, node.clip];
      const children = [...node.children].sort((left, right) => left.zIndex - right.zIndex);
      for (const child of children) visit(child, opacity, nextClips);
      return;
    }
    if (node.interactive === true && node.datum !== undefined) candidates.push({ node, clips });
  };
  visit(scene.root, 1, []);
  hitCandidateCache.set(scene, candidates);
  return candidates;
}

function insideClips(clips: readonly Rect[], x: number, y: number): boolean {
  return clips.every(
    (clip) => x >= clip.x && x <= clip.x + clip.width && y >= clip.y && y <= clip.y + clip.height,
  );
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

function textDistance(node: TextNode, x: number, y: number): number {
  const angle = (-node.rotation * Math.PI) / 180;
  const translatedX = x - node.x;
  const translatedY = y - node.y;
  const localX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
  const localY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);
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
  const dx = Math.max(left - localX, 0, localX - (left + width));
  const dy = Math.max(top - localY, 0, localY - (top + height));
  return Math.hypot(dx, dy);
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
      return textDistance(node, x, y);
    case 'group':
      return Number.POSITIVE_INFINITY;
  }
}

export function hitTestScene(scene: Scene, x: number, y: number, tolerance = 8): HitResult | null {
  const candidates = sceneHitCandidates(scene);
  let best: HitResult | null = null;

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const candidate = candidates[index];
    if (candidate === undefined || !insideClips(candidate.clips, x, y)) continue;
    const { node } = candidate;
    if (node.datum === undefined) continue;
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
