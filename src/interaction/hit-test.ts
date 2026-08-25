import type { DatumReference, PathNode, Rect, Scene, SceneNode, TextNode } from '../scene/types.js';
import { sceneNodeBounds } from '../scene/bounds.js';
import { UniformSpatialIndex, type SpatialIndexStats } from './spatial-index.js';

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

interface SceneHitCandidates {
  readonly candidates: readonly HitCandidate[];
  readonly index: UniformSpatialIndex<HitCandidate>;
}

function tooltipKind(candidate: HitCandidate): unknown {
  return candidate.node.datum?.tooltip?.kind;
}

function tooltipStrings(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) return null;
  return value;
}

/**
 * Resolve a Venn/Euler region from the actual overlapping set circles. Region
 * labels are deliberately small and must not be the hit geometry: a pointer
 * anywhere inside the exact visual membership combination resolves the
 * corresponding membership datum.
 */
function hitTestVennRegion(
  candidates: readonly HitCandidate[],
  x: number,
  y: number,
): HitResult | null {
  const setCircles = candidates.filter(
    (candidate) =>
      candidate.node.type === 'circle' &&
      tooltipKind(candidate) === 'venn-set' &&
      insideClips(candidate.clips, x, y),
  );
  if (setCircles.length < 2 || setCircles.length > 3) return null;
  const included = setCircles
    .flatMap((candidate) => {
      const node = candidate.node;
      if (node.type !== 'circle' || Math.hypot(x - node.cx, y - node.cy) > node.radius) return [];
      const set = node.datum?.tooltip?.set;
      return typeof set === 'string' ? [set] : [];
    })
    .sort();
  if (included.length === 0) return null;
  const region = candidates.find((candidate) => {
    if (tooltipKind(candidate) !== 'venn-region' || candidate.node.datum === undefined)
      return false;
    const sets = tooltipStrings(candidate.node.datum.tooltip?.sets)?.slice().sort();
    return (
      sets !== undefined &&
      sets !== null &&
      sets.length === included.length &&
      sets.every((set, index) => set === included[index])
    );
  });
  if (region?.node.datum === undefined) return null;
  return {
    ...region.node.datum,
    nodeId: region.node.id,
    x,
    y,
    distance: 0,
  };
}

const hitCandidateCache = new WeakMap<Scene, SceneHitCandidates>();

function sceneHitCandidates(scene: Scene): SceneHitCandidates {
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
  const index = new UniformSpatialIndex<HitCandidate>(64, 256);
  for (const candidate of candidates) {
    const bounds = sceneNodeBounds(candidate.node);
    if (bounds !== null) index.insert(candidate, bounds);
  }
  const result = Object.freeze({ candidates: Object.freeze(candidates), index });
  hitCandidateCache.set(scene, result);
  return result;
}

/** Inspect the bounded screen-space index used by scatter and all other interactive marks. */
export function hitTestSpatialIndexStats(scene: Scene): SpatialIndexStats {
  return sceneHitCandidates(scene).index.stats();
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
  const paths = [node.points, ...(node.subpaths ?? [])];
  if (node.closed) {
    let inside = false;
    for (const points of paths) {
      if (points.length < 3) continue;
      for (
        let index = 0, previous = points.length - 1;
        index < points.length;
        previous = index, index += 1
      ) {
        const currentPoint = points[index];
        const previousPoint = points[previous];
        if (currentPoint === undefined || previousPoint === undefined) continue;
        const crosses =
          currentPoint.y > y !== previousPoint.y > y &&
          x <
            ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) /
              (previousPoint.y - currentPoint.y || Number.EPSILON) +
              currentPoint.x;
        if (crosses) inside = !inside;
      }
    }
    if (inside) return 0;
  }
  let minimum = Number.POSITIVE_INFINITY;
  for (const points of paths) {
    const only = points[0];
    if (points.length === 1 && only !== undefined) {
      minimum = Math.min(minimum, Math.hypot(x - only.x, y - only.y));
      continue;
    }
    for (let index = 1; index < points.length; index += 1) {
      const first = points[index - 1];
      const second = points[index];
      if (first === undefined || second === undefined) continue;
      minimum = Math.min(minimum, distanceToSegment(x, y, first.x, first.y, second.x, second.y));
    }
    if (node.closed && points.length > 1) {
      const first = points[0];
      const last = points[points.length - 1];
      if (first !== undefined && last !== undefined) {
        minimum = Math.min(minimum, distanceToSegment(x, y, last.x, last.y, first.x, first.y));
      }
    }
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
  const { candidates: allCandidates, index } = sceneHitCandidates(scene);
  const vennRegion = hitTestVennRegion(allCandidates, x, y);
  if (vennRegion !== null) return vennRegion;
  const candidates = index.query(x, y, tolerance);
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
