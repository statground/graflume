import type {
  CircleNode,
  GroupNode,
  LineNode,
  PathNode,
  Point,
  Rect,
  RectNode,
  Scene,
  SceneNode,
  TextNode,
} from './types.js';

export interface SceneInterpolationOptions {
  /** Stable datum field used to match the same entity across filtered frames. */
  readonly keyField?: string;
}

export type SceneTransitionEasing = 'linear' | 'ease-in-out';

interface Rgba {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

export function easeSceneProgress(progress: number, easing: SceneTransitionEasing): number {
  if (!Number.isFinite(progress)) throw new RangeError('Scene transition progress must be finite.');
  const value = clamp(progress, 0, 1);
  return easing === 'ease-in-out' ? value * value * (3 - 2 * value) : value;
}

function mixRect(from: Rect, to: Rect, progress: number): Rect {
  return {
    x: mix(from.x, to.x, progress),
    y: mix(from.y, to.y, progress),
    width: mix(from.width, to.width, progress),
    height: mix(from.height, to.height, progress),
  };
}

function mixPoints(
  from: readonly Point[],
  to: readonly Point[],
  progress: number,
): readonly Point[] {
  return to.map((point, index) => {
    const previous = from[index]!;
    return {
      x: mix(previous.x, point.x, progress),
      y: mix(previous.y, point.y, progress),
    };
  });
}

function parseHexColor(input: string): Rgba | null {
  const value = input.slice(1);
  if (![3, 4, 6, 8].includes(value.length) || !/^[0-9a-f]+$/i.test(value)) return null;
  const expanded =
    value.length <= 4 ? [...value].map((character) => `${character}${character}`).join('') : value;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { red, green, blue, alpha };
}

function parseRgbChannel(input: string): number | null {
  const value = input.trim();
  const percentage = value.endsWith('%');
  const parsed = Number.parseFloat(percentage ? value.slice(0, -1) : value);
  if (!Number.isFinite(parsed)) return null;
  return clamp(percentage ? (parsed / 100) * 255 : parsed, 0, 255);
}

function parseAlpha(input: string): number | null {
  const value = input.trim();
  const percentage = value.endsWith('%');
  const parsed = Number.parseFloat(percentage ? value.slice(0, -1) : value);
  if (!Number.isFinite(parsed)) return null;
  return clamp(percentage ? parsed / 100 : parsed, 0, 1);
}

function parseFunctionalColor(input: string): Rgba | null {
  const match = /^rgba?\((.*)\)$/i.exec(input.trim());
  if (match === null) return null;
  const parts = match[1]!
    .trim()
    .replace(/\s*\/\s*/, ' ')
    .split(/[\s,]+/);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const red = parseRgbChannel(parts[0]!);
  const green = parseRgbChannel(parts[1]!);
  const blue = parseRgbChannel(parts[2]!);
  const alpha = parts[3] === undefined ? 1 : parseAlpha(parts[3]);
  if (red === null || green === null || blue === null || alpha === null) return null;
  return { red, green, blue, alpha };
}

function parseColor(input: string): Rgba | null {
  const value = input.trim();
  if (value.toLowerCase() === 'transparent') return { red: 0, green: 0, blue: 0, alpha: 0 };
  if (value.startsWith('#')) return parseHexColor(value);
  return parseFunctionalColor(value);
}

function colorCompatible(from: string | undefined, to: string | undefined): boolean {
  if (from === to) return true;
  if (from === undefined || to === undefined) return false;
  return parseColor(from) !== null && parseColor(to) !== null;
}

function mixColor(from: string, to: string, progress: number): string {
  if (from === to) return to;
  const left = parseColor(from)!;
  const right = parseColor(to)!;
  const red = Math.round(mix(left.red, right.red, progress));
  const green = Math.round(mix(left.green, right.green, progress));
  const blue = Math.round(mix(left.blue, right.blue, progress));
  const alpha = Math.round(mix(left.alpha, right.alpha, progress) * 1_000) / 1_000;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function mixOptionalColor(
  from: string | undefined,
  to: string | undefined,
  progress: number,
): string | undefined {
  if (from === undefined || to === undefined) return to;
  return mixColor(from, to, progress);
}

function normalizedDash(input: readonly number[] | undefined): readonly number[] {
  return input ?? [];
}

function dashCompatible(
  from: readonly number[] | undefined,
  to: readonly number[] | undefined,
): boolean {
  return normalizedDash(from).length === normalizedDash(to).length;
}

function mixDash(
  from: readonly number[] | undefined,
  to: readonly number[] | undefined,
  progress: number,
): readonly number[] | undefined {
  const left = normalizedDash(from);
  const right = normalizedDash(to);
  if (right.length === 0) return undefined;
  return right.map((value, index) => mix(left[index]!, value, progress));
}

function effectiveOpacity(node: SceneNode): number {
  return node.visible ? node.opacity : 0;
}

function baseTransition<T extends SceneNode>(
  from: SceneNode,
  to: T,
  progress: number,
): Pick<T, 'id' | 'zIndex' | 'opacity' | 'visible'> {
  const opacity = mix(effectiveOpacity(from), effectiveOpacity(to), progress);
  return {
    id: to.id,
    zIndex: to.zIndex,
    opacity,
    visible: opacity > 0,
  };
}

function scalarKey(value: unknown): string | null {
  if (value instanceof Date) return `date:${value.getTime()}`;
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${typeof value}:${String(value)}`;
  }
  return null;
}

function stableDatumIdentity(node: SceneNode, keyField: string | undefined): string | null {
  const datum = node.datum;
  if (keyField !== undefined && datum !== undefined) {
    const key = scalarKey(datum.datum[keyField] ?? datum.tooltip?.[keyField]);
    if (key !== null) {
      return `datum:${node.type}:${datum.layerId}:${key}`;
    }
  }
  return null;
}

function nodeIdentity(node: SceneNode, keyField: string | undefined): string {
  return stableDatumIdentity(node, keyField) ?? `node:${node.type}:${node.id}`;
}

function stableDatumRoleCandidates(node: SceneNode): ReadonlySet<string> {
  if (node.datum === undefined) return new Set();
  const parts = node.id.split(':');
  const rowIndex = String(node.datum.rowIndex);
  const roles = new Set<string>();
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index] !== rowIndex) continue;
    const candidate = [...parts];
    candidate[index] = '@datum';
    roles.add(candidate.join(':'));
  }
  return roles;
}

function sameStableDatumRole(from: SceneNode, to: SceneNode): boolean {
  if (from.id === to.id) return true;
  const left = stableDatumRoleCandidates(from);
  const right = stableDatumRoleCandidates(to);
  return [...left].some((role) => right.has(role));
}

function samePathTopology(from: PathNode, to: PathNode): boolean {
  if (from.closed !== to.closed || from.points.length !== to.points.length) return false;
  const left = from.subpaths ?? [];
  const right = to.subpaths ?? [];
  return (
    left.length === right.length &&
    left.every((subpath, index) => subpath.length === right[index]!.length)
  );
}

function nodeCompatible(from: SceneNode, to: SceneNode): boolean {
  if (from.type !== to.type) return false;
  switch (to.type) {
    case 'group': {
      const previous = from as GroupNode;
      return (previous.clip === undefined) === (to.clip === undefined);
    }
    case 'line': {
      const previous = from as LineNode;
      return (
        previous.lineCap === to.lineCap &&
        colorCompatible(previous.stroke, to.stroke) &&
        dashCompatible(previous.dash, to.dash)
      );
    }
    case 'path': {
      const previous = from as PathNode;
      return (
        samePathTopology(previous, to) &&
        previous.fillRule === to.fillRule &&
        previous.lineCap === to.lineCap &&
        previous.lineJoin === to.lineJoin &&
        colorCompatible(previous.fill, to.fill) &&
        colorCompatible(previous.stroke, to.stroke) &&
        dashCompatible(previous.dash, to.dash)
      );
    }
    case 'rect': {
      const previous = from as RectNode;
      return (
        colorCompatible(previous.fill, to.fill) &&
        colorCompatible(previous.stroke, to.stroke) &&
        dashCompatible(previous.dash, to.dash)
      );
    }
    case 'circle': {
      const previous = from as CircleNode;
      return colorCompatible(previous.fill, to.fill) && colorCompatible(previous.stroke, to.stroke);
    }
    case 'text': {
      const previous = from as TextNode;
      return (
        previous.text === to.text &&
        previous.fontFamily === to.fontFamily &&
        previous.fontWeight === to.fontWeight &&
        previous.fontStyle === to.fontStyle &&
        previous.align === to.align &&
        previous.baseline === to.baseline &&
        colorCompatible(previous.fill, to.fill)
      );
    }
  }
}

function interpolateCompatibleNode(
  from: SceneNode,
  to: SceneNode,
  progress: number,
  options: SceneInterpolationOptions,
): SceneNode {
  switch (to.type) {
    case 'group': {
      const previous = from as GroupNode;
      return {
        ...to,
        ...baseTransition(previous, to, progress),
        children: mergeChildren(previous.children, to.children, progress, options),
        ...(previous.clip === undefined || to.clip === undefined
          ? {}
          : { clip: mixRect(previous.clip, to.clip, progress) }),
      };
    }
    case 'line': {
      const previous = from as LineNode;
      const dash = mixDash(previous.dash, to.dash, progress);
      return {
        ...to,
        ...baseTransition(previous, to, progress),
        x1: mix(previous.x1, to.x1, progress),
        y1: mix(previous.y1, to.y1, progress),
        x2: mix(previous.x2, to.x2, progress),
        y2: mix(previous.y2, to.y2, progress),
        stroke: mixColor(previous.stroke, to.stroke, progress),
        lineWidth: mix(previous.lineWidth, to.lineWidth, progress),
        ...(dash === undefined ? {} : { dash }),
      };
    }
    case 'path': {
      const previous = from as PathNode;
      const leftSubpaths = previous.subpaths ?? [];
      const rightSubpaths = to.subpaths ?? [];
      const dash = mixDash(previous.dash, to.dash, progress);
      const fill = mixOptionalColor(previous.fill, to.fill, progress);
      const stroke = mixOptionalColor(previous.stroke, to.stroke, progress);
      return {
        ...to,
        ...baseTransition(previous, to, progress),
        points: mixPoints(previous.points, to.points, progress),
        ...(rightSubpaths.length === 0
          ? {}
          : {
              subpaths: rightSubpaths.map((subpath, index) =>
                mixPoints(leftSubpaths[index]!, subpath, progress),
              ),
            }),
        lineWidth: mix(previous.lineWidth, to.lineWidth, progress),
        ...(fill === undefined ? {} : { fill }),
        ...(stroke === undefined ? {} : { stroke }),
        ...(dash === undefined ? {} : { dash }),
      };
    }
    case 'rect': {
      const previous = from as RectNode;
      const dash = mixDash(previous.dash, to.dash, progress);
      const fill = mixOptionalColor(previous.fill, to.fill, progress);
      const stroke = mixOptionalColor(previous.stroke, to.stroke, progress);
      return {
        ...to,
        ...baseTransition(previous, to, progress),
        x: mix(previous.x, to.x, progress),
        y: mix(previous.y, to.y, progress),
        width: mix(previous.width, to.width, progress),
        height: mix(previous.height, to.height, progress),
        lineWidth: mix(previous.lineWidth, to.lineWidth, progress),
        cornerRadius: mix(previous.cornerRadius, to.cornerRadius, progress),
        ...(fill === undefined ? {} : { fill }),
        ...(stroke === undefined ? {} : { stroke }),
        ...(dash === undefined ? {} : { dash }),
      };
    }
    case 'circle': {
      const previous = from as CircleNode;
      const fill = mixOptionalColor(previous.fill, to.fill, progress);
      const stroke = mixOptionalColor(previous.stroke, to.stroke, progress);
      return {
        ...to,
        ...baseTransition(previous, to, progress),
        cx: mix(previous.cx, to.cx, progress),
        cy: mix(previous.cy, to.cy, progress),
        radius: mix(previous.radius, to.radius, progress),
        lineWidth: mix(previous.lineWidth, to.lineWidth, progress),
        ...(fill === undefined ? {} : { fill }),
        ...(stroke === undefined ? {} : { stroke }),
      };
    }
    case 'text': {
      const previous = from as TextNode;
      return {
        ...to,
        ...baseTransition(previous, to, progress),
        x: mix(previous.x, to.x, progress),
        y: mix(previous.y, to.y, progress),
        fill: mixColor(previous.fill, to.fill, progress),
        fontSize: mix(previous.fontSize, to.fontSize, progress),
        rotation: mix(previous.rotation, to.rotation, progress),
      };
    }
  }
}

function fadeNode(node: SceneNode, opacity: number, idPrefix?: string): SceneNode {
  const id = idPrefix === undefined ? node.id : `${idPrefix}:${node.id}`;
  if (node.type === 'group') {
    return {
      ...node,
      id,
      opacity: effectiveOpacity(node) * opacity,
      visible: node.visible && opacity > 0,
      children:
        idPrefix === undefined
          ? node.children
          : node.children.map((child) => fadeNode(child, 1, idPrefix)),
    };
  }
  return {
    ...node,
    id,
    opacity: effectiveOpacity(node) * opacity,
    visible: node.visible && opacity > 0,
  };
}

function mergeChildren(
  from: readonly SceneNode[],
  to: readonly SceneNode[],
  progress: number,
  options: SceneInterpolationOptions,
): readonly SceneNode[] {
  const previousByIdentity = new Map<string, SceneNode[]>();
  for (const node of from) {
    const identity = nodeIdentity(node, options.keyField);
    const candidates = previousByIdentity.get(identity) ?? [];
    candidates.push(node);
    previousByIdentity.set(identity, candidates);
  }

  let exitSequence = 0;
  const output: SceneNode[] = [];
  for (const node of to) {
    const identity = nodeIdentity(node, options.keyField);
    const candidates = previousByIdentity.get(identity);
    const stableIdentity = stableDatumIdentity(node, options.keyField) !== null;
    const candidateIndex =
      candidates === undefined
        ? -1
        : stableIdentity
          ? candidates.findIndex((candidate) => sameStableDatumRole(candidate, node))
          : 0;
    const previous = candidateIndex < 0 ? undefined : candidates?.splice(candidateIndex, 1)[0];
    if (candidates !== undefined && candidates.length === 0) previousByIdentity.delete(identity);
    if (previous === undefined) {
      output.push(fadeNode(node, progress));
      continue;
    }
    if (nodeCompatible(previous, node)) {
      output.push(interpolateCompatibleNode(previous, node, progress, options));
      continue;
    }
    exitSequence += 1;
    output.push(
      fadeNode(previous, 1 - progress, `transition-exit-${exitSequence}`),
      fadeNode(node, progress),
    );
  }
  for (const candidates of previousByIdentity.values()) {
    for (const node of candidates) {
      exitSequence += 1;
      output.push(fadeNode(node, 1 - progress, `transition-exit-${exitSequence}`));
    }
  }
  return output;
}

/**
 * Create a transient render-only Scene between two compiled endpoint Scenes.
 * The endpoint Scenes are never mutated and their data/accessibility contracts
 * remain authoritative; incompatible nodes safely crossfade.
 */
export function interpolateScene(
  from: Scene,
  to: Scene,
  progress: number,
  options: SceneInterpolationOptions = {},
): Scene {
  if (!Number.isFinite(progress)) throw new RangeError('Scene transition progress must be finite.');
  if (progress <= 0) return from;
  if (progress >= 1) return to;
  if (from.root.type !== 'group' || to.root.type !== 'group') return to;
  const background = colorCompatible(from.background, to.background)
    ? mixColor(from.background, to.background, progress)
    : to.background;
  return {
    ...to,
    background,
    root: interpolateCompatibleNode(from.root, to.root, progress, options) as GroupNode,
  };
}
