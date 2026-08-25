import { GraflumeError } from '../core/errors.js';

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite number.`, { path });
  }
  return value;
}

function name(value: string, path: string): string {
  const normalized = value.trim();
  if (normalized === '')
    throw new GraflumeError('INVALID_DATA', `${path} must be non-empty.`, { path });
  return normalized;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function seededRandom(seed: number): () => number {
  let state = Math.floor(seed) >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export interface NetworkPort {
  readonly id: string;
  readonly angle?: number;
}

export interface NetworkNodeInput {
  readonly id: string;
  readonly parent?: string | null;
  readonly group?: string;
  readonly radius?: number;
  readonly ports?: readonly NetworkPort[];
  readonly x?: number;
  readonly y?: number;
  readonly pinned?: boolean;
}

export interface NetworkEdgeInput {
  readonly id?: string;
  readonly source: string;
  readonly target: string;
  readonly sourcePort?: string;
  readonly targetPort?: string;
  readonly weight?: number;
  readonly directed?: boolean;
}

export type NetworkLayoutMode = 'force' | 'radial' | 'grid' | 'dag';
export type NetworkEdgeRouting = 'straight' | 'quadratic' | 'orthogonal';

export interface NetworkLayoutOptions {
  readonly layout?: NetworkLayoutMode;
  readonly routing?: NetworkEdgeRouting;
  readonly directed?: boolean;
  readonly allowMultiedges?: boolean;
  readonly allowSelfLoops?: boolean;
  readonly collapsed?: readonly string[];
  readonly iterations?: number;
  readonly seed?: number;
  readonly nodeSpacing?: number;
}

export interface NetworkLayoutNode {
  readonly id: string;
  readonly parent: string | null;
  readonly group: string | null;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly pinned: boolean;
  readonly compound: boolean;
  readonly collapsed: boolean;
  readonly hiddenCount: number;
  readonly ports: readonly { readonly id: string; readonly x: number; readonly y: number }[];
}

export interface NetworkLayoutEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly weight: number;
  readonly directed: boolean;
  readonly sourcePort: string | null;
  readonly targetPort: string | null;
  readonly parallelIndex: number;
  readonly parallelCount: number;
  readonly selfLoop: boolean;
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

export interface NetworkLayoutResult {
  readonly layout: NetworkLayoutMode;
  readonly nodes: readonly NetworkLayoutNode[];
  readonly edges: readonly NetworkLayoutEdge[];
  readonly topologicalOrder: readonly string[];
  readonly cycles: readonly (readonly string[])[];
}

interface MutableNetworkNode {
  id: string;
  parent: string | null;
  group: string | null;
  radius: number;
  ports: NetworkPort[];
  x: number;
  y: number;
  pinned: boolean;
  hiddenCount: number;
}

interface MutableNetworkEdge {
  id: string;
  source: string;
  target: string;
  sourcePort: string | null;
  targetPort: string | null;
  weight: number;
  directed: boolean;
}

function networkCycles(nodes: readonly string[], edges: readonly MutableNetworkEdge[]) {
  const outgoing = new Map(nodes.map((id) => [id, [] as string[]]));
  edges.forEach(({ source, target, directed }) => {
    outgoing.get(source)?.push(target);
    if (!directed && source !== target) outgoing.get(target)?.push(source);
  });
  const cycles: string[][] = [];
  const active = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];
  const walk = (id: string, parent: string | null): void => {
    if (active.has(id)) {
      const offset = path.indexOf(id);
      const cycle = [...path.slice(Math.max(0, offset)), id];
      const signature = [...new Set(cycle)].sort().join('\u0000');
      if (!cycles.some((existing) => [...new Set(existing)].sort().join('\u0000') === signature))
        cycles.push(cycle);
      return;
    }
    if (visited.has(id)) return;
    active.add(id);
    path.push(id);
    for (const next of outgoing.get(id) ?? [])
      if (next !== parent || edges.some((edge) => edge.directed)) walk(next, id);
    path.pop();
    active.delete(id);
    visited.add(id);
  };
  nodes.forEach((id) => walk(id, null));
  return cycles;
}

function topologicalOrder(
  nodes: readonly string[],
  edges: readonly MutableNetworkEdge[],
): string[] {
  const indegree = new Map(nodes.map((id) => [id, 0]));
  const outgoing = new Map(nodes.map((id) => [id, [] as string[]]));
  edges
    .filter(({ directed, source, target }) => directed && source !== target)
    .forEach(({ source, target }) => {
      indegree.set(target, (indegree.get(target) ?? 0) + 1);
      outgoing.get(source)?.push(target);
    });
  const queue = nodes.filter((id) => indegree.get(id) === 0).sort();
  const output: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    output.push(id);
    for (const target of outgoing.get(id) ?? []) {
      indegree.set(target, (indegree.get(target) ?? 1) - 1);
      if (indegree.get(target) === 0) {
        queue.push(target);
        queue.sort();
      }
    }
  }
  nodes
    .filter((id) => !output.includes(id))
    .sort()
    .forEach((id) => output.push(id));
  return output;
}

function collapseNetwork(
  nodes: readonly MutableNetworkNode[],
  edges: readonly MutableNetworkEdge[],
  collapsed: ReadonlySet<string>,
): { readonly nodes: MutableNetworkNode[]; readonly edges: MutableNetworkEdge[] } {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const owner = (id: string): string => {
    let current = byId.get(id);
    const visited = new Set<string>();
    while (current?.parent !== null && current?.parent !== undefined && !visited.has(current.id)) {
      visited.add(current.id);
      if (collapsed.has(current.parent)) return current.parent;
      current = byId.get(current.parent);
    }
    return id;
  };
  const visibleNodes = nodes.filter((node) => owner(node.id) === node.id);
  visibleNodes.forEach((node) => {
    node.hiddenCount = nodes.filter(
      (other) => other.id !== node.id && owner(other.id) === node.id,
    ).length;
  });
  const aggregated = new Map<string, MutableNetworkEdge>();
  edges.forEach((edge) => {
    const source = owner(edge.source);
    const target = owner(edge.target);
    const changed = source !== edge.source || target !== edge.target;
    const key = changed
      ? `collapsed\u0000${source}\u0000${target}\u0000${edge.directed}`
      : `edge\u0000${edge.id}`;
    const previous = aggregated.get(key);
    if (previous === undefined) {
      aggregated.set(key, {
        ...edge,
        id: changed ? `collapsed:${source}:${target}` : edge.id,
        source,
        target,
        sourcePort: source === edge.source ? edge.sourcePort : null,
        targetPort: target === edge.target ? edge.targetPort : null,
      });
    } else previous.weight += edge.weight;
  });
  return { nodes: visibleNodes, edges: [...aggregated.values()] };
}

function layoutGrid(nodes: readonly MutableNetworkNode[]): void {
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.max(1, Math.ceil(nodes.length / columns));
  nodes.forEach((node, index) => {
    if (node.pinned) return;
    node.x = columns === 1 ? 0.5 : (index % columns) / (columns - 1);
    node.y = rows === 1 ? 0.5 : Math.floor(index / columns) / (rows - 1);
  });
}

function layoutRadial(
  nodes: readonly MutableNetworkNode[],
  edges: readonly MutableNetworkEdge[],
): void {
  const degree = new Map(nodes.map(({ id }) => [id, 0]));
  edges.forEach(({ source, target }) => {
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  });
  const ordered = [...nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id),
  );
  const center = ordered[0];
  if (center !== undefined && !center.pinned) {
    center.x = 0.5;
    center.y = 0.5;
  }
  ordered.slice(1).forEach((node, index, values) => {
    if (node.pinned) return;
    const angle = -Math.PI / 2 + (index / Math.max(1, values.length)) * Math.PI * 2;
    const ring = 0.36 + 0.08 * (index % 2);
    node.x = 0.5 + Math.cos(angle) * ring;
    node.y = 0.5 + Math.sin(angle) * ring;
  });
}

function layoutDag(
  nodes: readonly MutableNetworkNode[],
  edges: readonly MutableNetworkEdge[],
): string[] {
  const order = topologicalOrder(
    nodes.map(({ id }) => id),
    edges,
  );
  const rank = new Map(order.map((id) => [id, 0]));
  for (let iteration = 0; iteration < nodes.length; iteration += 1) {
    let changed = false;
    edges
      .filter(({ directed }) => directed)
      .forEach(({ source, target }) => {
        const next = Math.max(rank.get(target) ?? 0, (rank.get(source) ?? 0) + 1);
        if (next !== rank.get(target)) {
          rank.set(target, next);
          changed = true;
        }
      });
    if (!changed) break;
  }
  const maximum = Math.max(...rank.values(), 0);
  const groups = new Map<number, MutableNetworkNode[]>();
  nodes.forEach((node) => {
    const value = rank.get(node.id) ?? 0;
    const list = groups.get(value) ?? [];
    list.push(node);
    groups.set(value, list);
  });
  groups.forEach((values, value) =>
    values
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
      .forEach((node, index) => {
        if (node.pinned) return;
        node.x = maximum === 0 ? 0.5 : value / maximum;
        node.y = (index + 1) / (values.length + 1);
      }),
  );
  return order;
}

function layoutForce(
  nodes: readonly MutableNetworkNode[],
  edges: readonly MutableNetworkEdge[],
  iterations: number,
  spacing: number,
  seed: number,
): void {
  const random = seededRandom(seed);
  nodes.forEach((node) => {
    if (!Number.isFinite(node.x)) node.x = 0.1 + random() * 0.8;
    if (!Number.isFinite(node.y)) node.y = 0.1 + random() * 0.8;
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const velocity = new Map(nodes.map(({ id }) => [id, { x: 0, y: 0 }]));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const temperature = 0.025 * (1 - iteration / Math.max(1, iterations));
    for (let left = 0; left < nodes.length; left += 1)
      for (let right = left + 1; right < nodes.length; right += 1) {
        const a = nodes[left]!;
        const b = nodes[right]!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 1e-6) {
          dx = (random() - 0.5) * 0.01;
          dy = (random() - 0.5) * 0.01;
          distance = Math.hypot(dx, dy);
        }
        const force = Math.min(0.02, (spacing * spacing) / (distance * distance));
        velocity.get(a.id)!.x += (dx / distance) * force;
        velocity.get(a.id)!.y += (dy / distance) * force;
        velocity.get(b.id)!.x -= (dx / distance) * force;
        velocity.get(b.id)!.y -= (dy / distance) * force;
      }
    edges.forEach(({ source, target, weight }) => {
      const a = byId.get(source)!;
      const b = byId.get(target)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(1e-6, Math.hypot(dx, dy));
      const force = (distance - spacing * 4) * 0.035 * Math.sqrt(Math.max(weight, 0.01));
      velocity.get(a.id)!.x += (dx / distance) * force;
      velocity.get(a.id)!.y += (dy / distance) * force;
      velocity.get(b.id)!.x -= (dx / distance) * force;
      velocity.get(b.id)!.y -= (dy / distance) * force;
    });
    nodes.forEach((node) => {
      if (node.pinned) return;
      const current = velocity.get(node.id)!;
      current.x *= 0.72;
      current.y *= 0.72;
      node.x = clamp(node.x + clamp(current.x, -temperature, temperature), 0.03, 0.97);
      node.y = clamp(node.y + clamp(current.y, -temperature, temperature), 0.03, 0.97);
    });
  }
}

function portPosition(node: MutableNetworkNode, portId: string | null, target: MutableNetworkNode) {
  if (portId !== null) {
    const port = node.ports.find(({ id }) => id === portId)!;
    const angle = ((port.angle ?? 0) * Math.PI) / 180;
    return { x: node.x + Math.cos(angle) * node.radius, y: node.y + Math.sin(angle) * node.radius };
  }
  const angle = Math.atan2(target.y - node.y, target.x - node.x);
  return { x: node.x + Math.cos(angle) * node.radius, y: node.y + Math.sin(angle) * node.radius };
}

function edgePoints(
  source: MutableNetworkNode,
  target: MutableNetworkNode,
  sourcePort: string | null,
  targetPort: string | null,
  routing: NetworkEdgeRouting,
  parallelIndex: number,
  parallelCount: number,
) {
  if (source.id === target.id) {
    const radius = source.radius * (2.5 + parallelIndex * 0.8);
    return [
      { x: source.x + source.radius, y: source.y },
      { x: source.x + radius, y: source.y - radius },
      { x: source.x - radius, y: source.y - radius },
      { x: source.x - source.radius, y: source.y },
    ];
  }
  const start = portPosition(source, sourcePort, target);
  const end = portPosition(target, targetPort, source);
  if (routing === 'straight' && parallelCount === 1) return [start, end];
  const offset = (parallelIndex - (parallelCount - 1) / 2) * 0.035;
  if (routing === 'orthogonal') {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const middle = (start.y + end.y) / 2 + offset;
      return [start, { x: start.x, y: middle }, { x: end.x, y: middle }, end];
    }
    const middle = (start.x + end.x) / 2 + offset;
    return [start, { x: middle, y: start.y }, { x: middle, y: end.y }, end];
  }
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1e-6, Math.hypot(dx, dy));
  return [
    start,
    {
      x: (start.x + end.x) / 2 - (dy / length) * offset,
      y: (start.y + end.y) / 2 + (dx / length) * offset,
    },
    end,
  ];
}

/** Validates and lays out directed, multiedge, self-loop, compound and port-aware networks. */
export function layoutNetwork(
  nodeInput: readonly NetworkNodeInput[],
  edgeInput: readonly NetworkEdgeInput[],
  options: NetworkLayoutOptions = {},
): NetworkLayoutResult {
  const nodes = nodeInput.map((node, index): MutableNetworkNode => {
    const id = name(node.id, `$.nodes[${index}].id`);
    const radius = finite(node.radius ?? 0.025, `$.nodes[${index}].radius`);
    if (radius <= 0 || radius > 0.25)
      throw new GraflumeError('INVALID_DATA', 'Network node radius must be in (0, 0.25].');
    const ports = (node.ports ?? []).map((port, portIndex) => ({
      id: name(port.id, `$.nodes[${index}].ports[${portIndex}].id`),
      ...(port.angle === undefined
        ? {}
        : { angle: finite(port.angle, `$.nodes[${index}].ports[${portIndex}].angle`) }),
    }));
    if (new Set(ports.map(({ id }) => id)).size !== ports.length)
      throw new GraflumeError('INVALID_DATA', `Network node "${id}" has duplicate ports.`);
    return {
      id,
      parent: node.parent == null || node.parent.trim() === '' ? null : node.parent.trim(),
      group: node.group?.trim() || null,
      radius,
      ports,
      x: node.x === undefined ? Number.NaN : finite(node.x, `$.nodes[${index}].x`),
      y: node.y === undefined ? Number.NaN : finite(node.y, `$.nodes[${index}].y`),
      pinned: node.pinned === true,
      hiddenCount: 0,
    };
  });
  if (new Set(nodes.map(({ id }) => id)).size !== nodes.length)
    throw new GraflumeError('INVALID_DATA', 'Network node ids must be unique.');
  const byId = new Map(nodes.map((node) => [node.id, node]));
  nodes.forEach((node) => {
    if (node.parent !== null && !byId.has(node.parent))
      throw new GraflumeError('INVALID_DATA', `Unknown compound parent "${node.parent}".`);
    if (node.parent === node.id)
      throw new GraflumeError(
        'INVALID_DATA',
        `Network node "${node.id}" cannot be its own compound parent.`,
      );
    if (node.pinned && (!Number.isFinite(node.x) || !Number.isFinite(node.y)))
      throw new GraflumeError('INVALID_DATA', `Pinned node "${node.id}" needs x and y.`);
  });
  const parentState = new Map<string, 'visiting' | 'visited'>();
  const parentStack: string[] = [];
  const visitParent = (id: string) => {
    const state = parentState.get(id);
    if (state === 'visited') return;
    if (state === 'visiting') {
      const start = parentStack.indexOf(id);
      const cycle = [...parentStack.slice(Math.max(0, start)), id];
      throw new GraflumeError(
        'INVALID_DATA',
        `Compound parent cycle detected: ${cycle.join(' -> ')}.`,
      );
    }
    parentState.set(id, 'visiting');
    parentStack.push(id);
    const parent = byId.get(id)?.parent;
    if (parent !== null && parent !== undefined) visitParent(parent);
    parentStack.pop();
    parentState.set(id, 'visited');
  };
  nodes.forEach(({ id }) => visitParent(id));
  const edges = edgeInput.map((edge, index): MutableNetworkEdge => {
    const source = name(edge.source, `$.edges[${index}].source`);
    const target = name(edge.target, `$.edges[${index}].target`);
    if (!byId.has(source) || !byId.has(target))
      throw new GraflumeError('INVALID_DATA', `Network edge ${index} references an unknown node.`);
    const sourcePort = edge.sourcePort?.trim() || null;
    const targetPort = edge.targetPort?.trim() || null;
    if (sourcePort !== null && !byId.get(source)!.ports.some(({ id }) => id === sourcePort))
      throw new GraflumeError('INVALID_DATA', `Unknown source port "${sourcePort}".`);
    if (targetPort !== null && !byId.get(target)!.ports.some(({ id }) => id === targetPort))
      throw new GraflumeError('INVALID_DATA', `Unknown target port "${targetPort}".`);
    return {
      id: edge.id?.trim() || `edge-${index}`,
      source,
      target,
      sourcePort,
      targetPort,
      weight: finite(edge.weight ?? 1, `$.edges[${index}].weight`),
      directed: edge.directed ?? options.directed ?? false,
    };
  });
  if (new Set(edges.map(({ id }) => id)).size !== edges.length)
    throw new GraflumeError('INVALID_DATA', 'Network edge ids must be unique.');
  if (edges.some(({ weight }) => weight < 0))
    throw new GraflumeError('INVALID_DATA', 'Network edge weights must be non-negative.');
  if (options.allowSelfLoops === false && edges.some(({ source, target }) => source === target))
    throw new GraflumeError('INVALID_DATA', 'Self-loop edges are disabled.');
  if (options.allowMultiedges === false) {
    const signatures = edges.map(({ source, target, directed }) =>
      directed ? `${source}\u0000${target}` : [source, target].sort().join('\u0000'),
    );
    if (new Set(signatures).size !== signatures.length)
      throw new GraflumeError('INVALID_DATA', 'Multiedges are disabled.');
  }
  const collapsed = new Set(options.collapsed ?? []);
  collapsed.forEach((id) => {
    if (!byId.has(id)) throw new GraflumeError('INVALID_SPEC', `Unknown collapsed node "${id}".`);
  });
  const visible = collapseNetwork(nodes, edges, collapsed);
  const layout = options.layout ?? 'force';
  let order: string[] = [];
  if (layout === 'grid') layoutGrid(visible.nodes);
  else if (layout === 'radial') layoutRadial(visible.nodes, visible.edges);
  else if (layout === 'dag') order = layoutDag(visible.nodes, visible.edges);
  else {
    const iterations = Math.floor(options.iterations ?? 120);
    if (iterations < 0 || iterations > 2_000)
      throw new GraflumeError('INVALID_SPEC', '$.iterations must be from 0 to 2000.');
    layoutForce(
      visible.nodes,
      visible.edges,
      iterations,
      clamp(options.nodeSpacing ?? 0.08, 0.01, 0.4),
      options.seed ?? 1,
    );
  }
  if (order.length === 0)
    order = topologicalOrder(
      visible.nodes.map(({ id }) => id),
      visible.edges,
    );
  const visibleById = new Map(visible.nodes.map((node) => [node.id, node]));
  const groups = new Map<string, MutableNetworkEdge[]>();
  visible.edges.forEach((edge) => {
    const key = edge.directed
      ? `${edge.source}\u0000${edge.target}`
      : [edge.source, edge.target].sort().join('\u0000');
    const values = groups.get(key) ?? [];
    values.push(edge);
    groups.set(key, values);
  });
  const routing = options.routing ?? 'quadratic';
  const outputEdges = [...groups.values()].flatMap((values) =>
    values.map((edge, index): NetworkLayoutEdge => ({
      ...edge,
      parallelIndex: index,
      parallelCount: values.length,
      selfLoop: edge.source === edge.target,
      points: edgePoints(
        visibleById.get(edge.source)!,
        visibleById.get(edge.target)!,
        edge.sourcePort,
        edge.targetPort,
        routing,
        index,
        values.length,
      ),
    })),
  );
  return {
    layout,
    topologicalOrder: order,
    cycles: networkCycles(
      visible.nodes.map(({ id }) => id),
      visible.edges,
    ),
    nodes: visible.nodes.map((node): NetworkLayoutNode => ({
      id: node.id,
      parent: node.parent,
      group: node.group,
      x: node.x,
      y: node.y,
      radius: node.radius,
      pinned: node.pinned,
      compound: nodes.some(({ parent }) => parent === node.id),
      collapsed: collapsed.has(node.id),
      hiddenCount: node.hiddenCount,
      ports: node.ports.map((port) => {
        const angle = ((port.angle ?? 0) * Math.PI) / 180;
        return {
          id: port.id,
          x: node.x + Math.cos(angle) * node.radius,
          y: node.y + Math.sin(angle) * node.radius,
        };
      }),
    })),
    edges: outputEdges,
  };
}

function pointInPolygon(
  point: { readonly x: number; readonly y: number },
  polygon: readonly { readonly x: number; readonly y: number }[],
): boolean {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const a = polygon[current]!;
    const b = polygon[previous]!;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

/** Polygon/lasso selection over laid-out nodes, suitable for linked selection stores. */
export function selectNetworkNodes(
  result: NetworkLayoutResult,
  polygon: readonly { readonly x: number; readonly y: number }[],
): readonly string[] {
  if (polygon.length < 3)
    throw new GraflumeError('INVALID_SPEC', 'Network lasso needs at least three points.');
  polygon.forEach((point, index) => {
    finite(point.x, `$.polygon[${index}].x`);
    finite(point.y, `$.polygon[${index}].y`);
  });
  return result.nodes.filter(({ x, y }) => pointInPolygon({ x, y }, polygon)).map(({ id }) => id);
}

/** Returns a new serializable node array after drag/pin without mutating source data. */
export function moveNetworkNode(
  nodes: readonly NetworkNodeInput[],
  id: string,
  position: { readonly x: number; readonly y: number },
  pin = true,
): readonly NetworkNodeInput[] {
  const x = finite(position.x, '$.position.x');
  const y = finite(position.y, '$.position.y');
  if (!nodes.some((node) => node.id === id))
    throw new GraflumeError('INVALID_SPEC', `Unknown network node "${id}".`);
  return nodes.map((node) => (node.id === id ? { ...node, x, y, pinned: pin } : { ...node }));
}
