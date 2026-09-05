import { GraflumeError } from '../core/errors.js';

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite number.`, { path });
  }
  return value;
}

function nonEmpty(value: string, path: string): string {
  const normalized = value.trim();
  if (normalized === '') {
    throw new GraflumeError('INVALID_DATA', `${path} must be a non-empty string.`, { path });
  }
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

export interface HierarchyDatum {
  readonly id: string;
  readonly parent?: string | null;
  readonly value?: number;
  readonly label?: string;
}

export type HierarchyLayoutMode = 'circle-pack' | 'dendrogram' | 'radial-tree';

export interface HierarchyLayoutOptions {
  readonly mode?: HierarchyLayoutMode;
  readonly root?: string;
  readonly collapsed?: readonly string[];
  readonly query?: string;
  readonly padding?: number;
}

export interface HierarchyLayoutNode {
  readonly id: string;
  readonly parent: string | null;
  readonly label: string;
  readonly depth: number;
  readonly value: number;
  readonly aggregate: number;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly leaf: boolean;
  readonly collapsed: boolean;
  readonly matched: boolean;
}

export interface HierarchyLayoutResult {
  readonly mode: HierarchyLayoutMode;
  readonly root: string;
  readonly nodes: readonly HierarchyLayoutNode[];
  readonly links: readonly { readonly source: string; readonly target: string }[];
  readonly breadcrumbs: readonly string[];
  readonly matches: readonly string[];
}

interface MutableHierarchyNode {
  id: string;
  parent: string | null;
  label: string;
  ownValue: number;
  aggregate: number;
  depth: number;
  x: number;
  y: number;
  radius: number;
  children: MutableHierarchyNode[];
}

function hierarchyTree(data: readonly HierarchyDatum[]): {
  readonly byId: Map<string, MutableHierarchyNode>;
  readonly roots: MutableHierarchyNode[];
} {
  if (data.length === 0) {
    throw new GraflumeError('INVALID_DATA', 'Hierarchy data must contain at least one node.');
  }
  const byId = new Map<string, MutableHierarchyNode>();
  data.forEach((datum, index) => {
    const id = nonEmpty(datum.id, `$.data[${index}].id`);
    if (byId.has(id)) {
      throw new GraflumeError('INVALID_DATA', `Duplicate hierarchy id "${id}".`, {
        path: `$.data[${index}].id`,
      });
    }
    const value = datum.value === undefined ? 1 : finite(datum.value, `$.data[${index}].value`);
    if (value < 0) {
      throw new GraflumeError('INVALID_DATA', 'Hierarchy values must be non-negative.', {
        path: `$.data[${index}].value`,
      });
    }
    byId.set(id, {
      id,
      parent: datum.parent == null || datum.parent.trim() === '' ? null : datum.parent.trim(),
      label: datum.label?.trim() || id,
      ownValue: value,
      aggregate: value,
      depth: 0,
      x: 0,
      y: 0,
      radius: 0,
      children: [],
    });
  });
  const roots: MutableHierarchyNode[] = [];
  for (const node of byId.values()) {
    if (node.parent === null) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(node.parent);
    if (parent === undefined) {
      throw new GraflumeError('INVALID_DATA', `Unknown hierarchy parent "${node.parent}".`, {
        path: '$.data',
      });
    }
    parent.children.push(node);
  }
  if (roots.length === 0) {
    throw new GraflumeError('INVALID_DATA', 'Hierarchy must contain at least one root.');
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const aggregate = (node: MutableHierarchyNode, depth: number): number => {
    if (visiting.has(node.id)) {
      throw new GraflumeError('INVALID_DATA', `Hierarchy cycle detected at "${node.id}".`);
    }
    if (visited.has(node.id)) return node.aggregate;
    visiting.add(node.id);
    node.depth = depth;
    const children = node.children.reduce((sum, child) => sum + aggregate(child, depth + 1), 0);
    node.aggregate = Math.max(node.ownValue, children || node.ownValue);
    visiting.delete(node.id);
    visited.add(node.id);
    return node.aggregate;
  };
  roots.forEach((root) => aggregate(root, 0));
  if (visited.size !== data.length) {
    throw new GraflumeError('INVALID_DATA', 'Hierarchy contains an unreachable cycle.');
  }
  return { byId, roots };
}

function hierarchyBreadcrumbs(node: MutableHierarchyNode, byId: Map<string, MutableHierarchyNode>) {
  const values: string[] = [];
  let current: MutableHierarchyNode | undefined = node;
  while (current !== undefined) {
    values.push(current.id);
    current = current.parent === null ? undefined : byId.get(current.parent);
  }
  return values.reverse();
}

function visibleHierarchy(root: MutableHierarchyNode, collapsed: ReadonlySet<string>) {
  const nodes: MutableHierarchyNode[] = [];
  const visit = (node: MutableHierarchyNode): void => {
    nodes.push(node);
    if (collapsed.has(node.id)) return;
    node.children.forEach(visit);
  };
  visit(root);
  return nodes;
}

function layoutDendrogram(nodes: readonly MutableHierarchyNode[], radial: boolean): void {
  const visible = new Set(nodes.map(({ id }) => id));
  const children = new Map<string, MutableHierarchyNode[]>();
  nodes.forEach((node) => {
    if (node.parent !== null && visible.has(node.parent)) {
      const values = children.get(node.parent) ?? [];
      values.push(node);
      children.set(node.parent, values);
    }
  });
  const leaves = nodes.filter((node) => (children.get(node.id)?.length ?? 0) === 0);
  leaves.forEach((leaf, index) => {
    leaf.x = leaves.length === 1 ? 0.5 : index / (leaves.length - 1);
  });
  const byDepth = [...nodes].sort((left, right) => right.depth - left.depth);
  byDepth.forEach((node) => {
    const visibleChildren = children.get(node.id) ?? [];
    if (visibleChildren.length > 0) {
      node.x = visibleChildren.reduce((sum, child) => sum + child.x, 0) / visibleChildren.length;
    }
  });
  const rootDepth = Math.min(...nodes.map(({ depth }) => depth));
  const maximumDepth = Math.max(...nodes.map(({ depth }) => depth));
  nodes.forEach((node) => {
    const ratio =
      maximumDepth === rootDepth ? 0 : (node.depth - rootDepth) / (maximumDepth - rootDepth);
    if (radial) {
      const angle = -Math.PI / 2 + node.x * Math.PI * 2;
      const radius = ratio * 0.48;
      node.x = 0.5 + Math.cos(angle) * radius;
      node.y = 0.5 + Math.sin(angle) * radius;
    } else {
      node.y = 0.04 + ratio * 0.92;
    }
    node.radius = clamp(Math.sqrt(node.aggregate) * 0.008, 0.007, 0.035);
  });
}

function layoutCirclePack(nodes: readonly MutableHierarchyNode[], padding: number): void {
  const visible = new Set(nodes.map(({ id }) => id));
  const root = nodes[0]!;
  const maximum = Math.max(root.aggregate, Number.EPSILON);
  root.x = 0.5;
  root.y = 0.5;
  root.radius = 0.49;
  const place = (parent: MutableHierarchyNode): void => {
    const children = parent.children
      .filter(({ id }) => visible.has(id))
      .sort((left, right) => right.aggregate - left.aggregate || left.id.localeCompare(right.id));
    if (children.length === 0) return;
    const total = children.reduce((sum, child) => sum + child.aggregate, 0) || 1;
    const scale = parent.radius * 0.78;
    const placed: MutableHierarchyNode[] = [];
    children.forEach((child, index) => {
      child.radius = Math.max(
        parent.radius * 0.025,
        Math.sqrt(child.aggregate / total) * scale * 0.47,
      );
      const golden = Math.PI * (3 - Math.sqrt(5));
      let distance = index === 0 ? 0 : child.radius;
      let angle = index * golden;
      let attempts = 0;
      for (;;) {
        const candidateX = parent.x + Math.cos(angle) * distance;
        const candidateY = parent.y + Math.sin(angle) * distance;
        const inside =
          Math.hypot(candidateX - parent.x, candidateY - parent.y) + child.radius <= parent.radius;
        const free = placed.every(
          (other) =>
            Math.hypot(candidateX - other.x, candidateY - other.y) >=
            child.radius + other.radius + padding,
        );
        if (inside && free) {
          child.x = candidateX;
          child.y = candidateY;
          break;
        }
        attempts += 1;
        angle += 0.41;
        distance = Math.min(parent.radius - child.radius, distance + parent.radius * 0.004);
        if (attempts > 20_000) {
          child.radius *= 0.98;
          attempts = 0;
          distance = child.radius;
        }
      }
      placed.push(child);
      place(child);
    });
  };
  place(root);
  nodes.forEach((node) => {
    if (node.radius === 0)
      node.radius = Math.max(0.006, Math.sqrt(node.aggregate / maximum) * 0.02);
  });
}

/** Deterministic circle-pack, dendrogram, and radial-tree layout with re-root, collapse, breadcrumbs and search. */
export function layoutHierarchy(
  data: readonly HierarchyDatum[],
  options: HierarchyLayoutOptions = {},
): HierarchyLayoutResult {
  const { byId, roots } = hierarchyTree(data);
  const requested = options.root === undefined ? roots[0]! : byId.get(options.root);
  if (requested === undefined) {
    throw new GraflumeError('INVALID_SPEC', `Unknown hierarchy root "${options.root}".`, {
      path: '$.root',
    });
  }
  const collapsed = new Set(options.collapsed ?? []);
  for (const id of collapsed) {
    if (!byId.has(id)) {
      throw new GraflumeError('INVALID_SPEC', `Unknown collapsed hierarchy id "${id}".`);
    }
  }
  const visible = visibleHierarchy(requested, collapsed);
  const baseDepth = requested.depth;
  visible.forEach((node) => {
    node.depth -= baseDepth;
  });
  const mode = options.mode ?? 'circle-pack';
  if (mode === 'circle-pack') layoutCirclePack(visible, clamp(options.padding ?? 0.004, 0, 0.05));
  else layoutDendrogram(visible, mode === 'radial-tree');
  const query = options.query?.trim().toLocaleLowerCase() ?? '';
  const matches = visible
    .filter(
      ({ id, label }) => query !== '' && `${id}\u0000${label}`.toLocaleLowerCase().includes(query),
    )
    .map(({ id }) => id);
  const visibleIds = new Set(visible.map(({ id }) => id));
  return {
    mode,
    root: requested.id,
    breadcrumbs: hierarchyBreadcrumbs(requested, byId),
    matches,
    nodes: visible.map((node) => ({
      id: node.id,
      parent: node.parent,
      label: node.label,
      depth: node.depth,
      value: node.ownValue,
      aggregate: node.aggregate,
      x: node.x,
      y: node.y,
      radius: node.radius,
      leaf: node.children.every(({ id }) => !visibleIds.has(id)),
      collapsed: collapsed.has(node.id),
      matched: matches.includes(node.id),
    })),
    links: visible.flatMap((node) =>
      node.parent !== null && visibleIds.has(node.parent)
        ? [{ source: node.parent, target: node.id }]
        : [],
    ),
  };
}

export interface FlowEdge {
  readonly source: string;
  readonly target: string;
  readonly value: number;
  readonly id?: string;
}

export type FlowAlignment = 'left' | 'right' | 'center' | 'justify';
export type FlowOrder = 'input' | 'ascending' | 'descending';
export type FlowLinkSort = FlowOrder | 'authored';

export interface FlowLayoutOptions {
  /**
   * Column policy: left uses longest distance from a source, right uses longest
   * distance to a sink, center keeps non-sources at left depth while placing a
   * source immediately before its earliest target, and justify moves only sinks
   * to the final column.
   */
  readonly alignment?: FlowAlignment;
  readonly order?: FlowOrder;
  readonly linkSort?: FlowLinkSort;
  /** Complete ordered edge-id list required when linkSort is authored. */
  readonly linkOrder?: readonly string[];
  readonly iterations?: number;
  readonly cycle?: 'reject' | 'allow';
  readonly positions?: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
  readonly balanceTolerance?: number;
  /** Gap between nodes as a fraction of the available diagram height. */
  readonly nodePadding?: number;
}

export interface FlowLayoutNode {
  readonly id: string;
  readonly column: number;
  readonly order: number;
  readonly x: number;
  readonly y: number;
  readonly input: number;
  readonly output: number;
  readonly value: number;
  /** Normalized node height in its layout column. */
  readonly height: number;
  readonly balanced: boolean;
}

export interface FlowLayoutLink extends FlowEdge {
  readonly id: string;
  readonly sourceOrder: number;
  readonly targetOrder: number;
  readonly sourceLinkOrder: number;
  readonly targetLinkOrder: number;
  readonly thickness: number;
  /** Conserved band height in normalized diagram coordinates. */
  readonly height: number;
  readonly path: readonly { readonly x: number; readonly y: number }[];
}

export interface FlowLayoutResult {
  readonly nodes: readonly FlowLayoutNode[];
  readonly links: readonly FlowLayoutLink[];
  readonly cycles: readonly (readonly string[])[];
  readonly imbalances: readonly { readonly id: string; readonly difference: number }[];
}

function graphCycles(
  adjacency: ReadonlyMap<string, readonly string[]>,
): readonly (readonly string[])[] {
  const found: string[][] = [];
  const stack: string[] = [];
  const active = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string): void => {
    if (done.has(id)) return;
    if (active.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(Math.max(0, start)), id];
      const signature = cycle.slice(0, -1).sort().join('\u0000');
      if (!found.some((item) => item.slice(0, -1).sort().join('\u0000') === signature))
        found.push(cycle);
      return;
    }
    active.add(id);
    stack.push(id);
    for (const target of adjacency.get(id) ?? []) visit(target);
    stack.pop();
    active.delete(id);
    done.add(id);
  };
  for (const id of adjacency.keys()) visit(id);
  return found;
}

/** Multi-stage Sankey/alluvial graph validation and deterministic iterative layout. */
export function layoutFlow(
  edges: readonly FlowEdge[],
  options: FlowLayoutOptions = {},
): FlowLayoutResult {
  if (edges.length === 0) return { nodes: [], links: [], cycles: [], imbalances: [] };
  const ids: string[] = [];
  const seen = new Set<string>();
  const normalized = edges.map((edge, index) => {
    const source = nonEmpty(edge.source, `$.edges[${index}].source`);
    const target = nonEmpty(edge.target, `$.edges[${index}].target`);
    const value = finite(edge.value, `$.edges[${index}].value`);
    if (value < 0) throw new GraflumeError('INVALID_DATA', 'Flow values must be non-negative.');
    for (const id of [source, target]) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return { source, target, value, id: edge.id?.trim() || `flow-${index}`, inputIndex: index };
  });
  const linkIds = new Set<string>();
  normalized.forEach(({ id }) => {
    if (linkIds.has(id)) throw new GraflumeError('INVALID_DATA', `Duplicate flow edge id "${id}".`);
    linkIds.add(id);
  });
  const linkSort = options.linkSort ?? 'input';
  const linkOrder = options.linkOrder ?? [];
  let authoredLinkRanks: ReadonlyMap<string, number> = new Map();
  if (linkSort === 'authored') {
    if (
      linkOrder.length !== normalized.length ||
      new Set(linkOrder).size !== linkOrder.length ||
      linkOrder.some((id) => !linkIds.has(id))
    ) {
      throw new GraflumeError(
        'INVALID_SPEC',
        '$.linkOrder must contain every flow edge id exactly once for authored link sorting.',
      );
    }
    authoredLinkRanks = new Map(linkOrder.map((id, index) => [id, index]));
  } else if (linkOrder.length > 0) {
    throw new GraflumeError('INVALID_SPEC', '$.linkOrder requires linkSort "authored".');
  }
  const compareLinks = (left: (typeof normalized)[number], right: (typeof normalized)[number]) => {
    if (linkSort === 'ascending')
      return left.value - right.value || left.inputIndex - right.inputIndex;
    if (linkSort === 'descending')
      return right.value - left.value || left.inputIndex - right.inputIndex;
    if (linkSort === 'authored')
      return authoredLinkRanks.get(left.id)! - authoredLinkRanks.get(right.id)!;
    return left.inputIndex - right.inputIndex;
  };
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  ids.forEach((id) => {
    outgoing.set(id, []);
    incoming.set(id, []);
  });
  normalized.forEach(({ source, target }) => {
    outgoing.get(source)!.push(target);
    incoming.get(target)!.push(source);
  });
  const cycles = graphCycles(outgoing);
  if (cycles.length > 0 && (options.cycle ?? 'reject') === 'reject') {
    throw new GraflumeError('INVALID_DATA', `Flow cycle detected: ${cycles[0]!.join(' -> ')}.`);
  }
  const isCycleEdge = (source: string, target: string) =>
    source === target || cycles.some((cycle) => cycle.includes(source) && cycle.includes(target));
  const columns = new Map(ids.map((id) => [id, 0]));
  for (let iteration = 0; iteration < ids.length; iteration += 1) {
    let changed = false;
    normalized.forEach(({ source, target }) => {
      if (isCycleEdge(source, target)) return;
      const next = Math.max(columns.get(target) ?? 0, (columns.get(source) ?? 0) + 1);
      if (next !== columns.get(target)) {
        columns.set(target, next);
        changed = true;
      }
    });
    if (!changed) break;
  }
  const maximumColumn = Math.max(...columns.values(), 0);
  if (options.alignment === 'right') {
    const sinkDistances = new Map(ids.map((id) => [id, 0]));
    for (let iteration = 0; iteration < ids.length; iteration += 1) {
      let changed = false;
      normalized.forEach(({ source, target }) => {
        if (isCycleEdge(source, target)) return;
        const next = Math.max(sinkDistances.get(source) ?? 0, (sinkDistances.get(target) ?? 0) + 1);
        if (next !== sinkDistances.get(source)) {
          sinkDistances.set(source, next);
          changed = true;
        }
      });
      if (!changed) break;
    }
    ids.forEach((id) => {
      columns.set(id, Math.max(0, maximumColumn - (sinkDistances.get(id) ?? 0)));
    });
  } else if (options.alignment === 'justify') {
    ids.forEach((id) => {
      if ((outgoing.get(id)?.length ?? 0) === 0) columns.set(id, maximumColumn);
    });
  } else if (options.alignment === 'center') {
    const leftColumns = new Map(columns);
    ids.forEach((id) => {
      if ((incoming.get(id)?.length ?? 0) > 0) return;
      const targetColumns = (outgoing.get(id) ?? []).map((target) => leftColumns.get(target) ?? 0);
      if (targetColumns.length > 0) columns.set(id, Math.max(0, Math.min(...targetColumns) - 1));
    });
  }
  const sums = new Map(ids.map((id) => [id, { input: 0, output: 0 }]));
  normalized.forEach(({ source, target, value }) => {
    sums.get(source)!.output += value;
    sums.get(target)!.input += value;
    if (!Number.isFinite(sums.get(source)!.output) || !Number.isFinite(sums.get(target)!.input))
      throw new GraflumeError('INVALID_DATA', 'Flow totals must remain finite.');
  });
  const grouped = new Map<number, string[]>();
  ids.forEach((id) => {
    const column = columns.get(id) ?? 0;
    const values = grouped.get(column) ?? [];
    values.push(id);
    grouped.set(column, values);
  });
  const valueOf = (id: string) => Math.max(sums.get(id)!.input, sums.get(id)!.output);
  grouped.forEach((values) => {
    if (options.order === 'ascending')
      values.sort((a, b) => valueOf(a) - valueOf(b) || a.localeCompare(b));
    else if (options.order === 'descending')
      values.sort((a, b) => valueOf(b) - valueOf(a) || a.localeCompare(b));
  });
  const requestedIterations = Math.floor(options.iterations ?? 8);
  if (requestedIterations < 0 || requestedIterations > 128) {
    throw new GraflumeError('INVALID_SPEC', '$.iterations must be from 0 to 128.');
  }
  for (let iteration = 0; iteration < requestedIterations; iteration += 1) {
    const forward = iteration % 2 === 0;
    const columnKeys = [...grouped.keys()].sort((a, b) => (forward ? a - b : b - a));
    const positions = new Map<string, number>();
    grouped.forEach((values) => values.forEach((id, index) => positions.set(id, index)));
    columnKeys.forEach((column) => {
      const values = grouped.get(column)!;
      values.sort((a, b) => {
        const neighbors = (forward ? incoming : outgoing).get(a) ?? [];
        const otherNeighbors = (forward ? incoming : outgoing).get(b) ?? [];
        const mean = (items: readonly string[]) =>
          items.length === 0
            ? Number.POSITIVE_INFINITY
            : items.reduce((sum, id) => sum + (positions.get(id) ?? 0), 0) / items.length;
        return mean(neighbors) - mean(otherNeighbors) || a.localeCompare(b);
      });
    });
  }
  const nodes: FlowLayoutNode[] = [];
  const positionById = new Map<string, FlowLayoutNode>();
  const tolerance = Math.max(0, options.balanceTolerance ?? 1e-9);
  const requestedPadding = finite(options.nodePadding ?? 0.025, '$.nodePadding');
  if (requestedPadding < 0 || requestedPadding > 0.25)
    throw new GraflumeError('INVALID_SPEC', '$.nodePadding must be from 0 to 0.25.');
  const largestColumn = Math.max(...[...grouped.values()].map((values) => values.length));
  const padding = Math.min(requestedPadding, 0.5 / Math.max(1, largestColumn - 1));
  const valueScale = Math.min(
    ...[...grouped.values()].map((values) => {
      const sum = values.reduce((total, id) => total + valueOf(id), 0);
      if (!Number.isFinite(sum))
        throw new GraflumeError('INVALID_DATA', 'Flow column totals must remain finite.');
      return sum > 0 ? (1 - padding * (values.length - 1)) / sum : Number.POSITIVE_INFINITY;
    }),
  );
  const scale = Number.isFinite(valueScale) ? valueScale : 0;
  grouped.forEach((values, column) => {
    const totalHeight = values.reduce((sum, id) => sum + valueOf(id) * scale, 0);
    let cursor = (1 - totalHeight - padding * (values.length - 1)) / 2;
    values.forEach((id, order) => {
      const amount = valueOf(id);
      const authored = options.positions?.[id];
      if (authored !== undefined) {
        finite(authored.x, `$.positions.${id}.x`);
        finite(authored.y, `$.positions.${id}.y`);
      }
      const input = sums.get(id)!.input;
      const output = sums.get(id)!.output;
      const node: FlowLayoutNode = {
        id,
        column,
        order,
        x: authored?.x ?? (maximumColumn === 0 ? 0.5 : column / maximumColumn),
        y: authored?.y ?? cursor + (amount * scale) / 2,
        input,
        output,
        value: amount,
        height: amount * scale,
        balanced: input === 0 || output === 0 || Math.abs(input - output) <= tolerance,
      };
      cursor += amount * scale + padding;
      nodes.push(node);
      positionById.set(id, node);
    });
  });
  const maximumValue = Math.max(...normalized.map(({ value }) => value), Number.EPSILON);
  const sourceLinks = new Map<string, (typeof normalized)[number][]>();
  const targetLinks = new Map<string, (typeof normalized)[number][]>();
  normalized.forEach((edge) => {
    sourceLinks.set(edge.source, [...(sourceLinks.get(edge.source) ?? []), edge]);
    targetLinks.set(edge.target, [...(targetLinks.get(edge.target) ?? []), edge]);
  });
  sourceLinks.forEach((links) => links.sort(compareLinks));
  targetLinks.forEach((links) => links.sort(compareLinks));
  const endpoint = (
    edge: (typeof normalized)[number],
    node: FlowLayoutNode,
    links: readonly (typeof normalized)[number][],
  ) => {
    let preceding = 0;
    for (const candidate of links) {
      if (candidate.id === edge.id) break;
      preceding += candidate.value;
    }
    return (
      node.y -
      node.height / 2 +
      ((preceding + edge.value / 2) / Math.max(node.value, Number.EPSILON)) * node.height
    );
  };
  const links = [...normalized].sort(compareLinks).map((edge) => {
    const source = positionById.get(edge.source)!;
    const target = positionById.get(edge.target)!;
    const orderedSourceLinks = sourceLinks.get(edge.source)!;
    const orderedTargetLinks = targetLinks.get(edge.target)!;
    const sourceLinkOrder = orderedSourceLinks.findIndex(({ id }) => id === edge.id);
    const targetLinkOrder = orderedTargetLinks.findIndex(({ id }) => id === edge.id);
    const sourceY = endpoint(edge, source, orderedSourceLinks);
    const targetY = endpoint(edge, target, orderedTargetLinks);
    const middle = (source.x + target.x) / 2;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      value: edge.value,
      sourceOrder: source.order,
      targetOrder: target.order,
      sourceLinkOrder,
      targetLinkOrder,
      thickness: edge.value / maximumValue,
      height: edge.value * scale,
      path: [
        { x: source.x, y: sourceY },
        { x: middle, y: sourceY },
        { x: middle, y: targetY },
        { x: target.x, y: targetY },
      ],
    };
  });
  return {
    nodes: nodes.sort((a, b) => a.column - b.column || a.order - b.order),
    links,
    cycles,
    imbalances: nodes
      .filter(({ input, output, balanced }) => input > 0 && output > 0 && !balanced)
      .map(({ id, input, output }) => ({ id, difference: input - output })),
  };
}

/** Returns every upstream/downstream node and link reachable from a flow node or link. */
export function traverseFlowPath(
  result: FlowLayoutResult,
  start: string,
  direction: 'upstream' | 'downstream' | 'both' = 'both',
): { readonly nodes: readonly string[]; readonly links: readonly string[] } {
  const startLink = result.links.find(({ id }) => id === start);
  const seeds = startLink === undefined ? [start] : [startLink.source, startLink.target];
  const nodes = new Set(seeds);
  const links = new Set<string>();
  const queue = [...seeds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.links.forEach((link) => {
      const matchDownstream = direction !== 'upstream' && link.source === id;
      const matchUpstream = direction !== 'downstream' && link.target === id;
      if (!matchDownstream && !matchUpstream) return;
      links.add(link.id);
      const next = matchDownstream ? link.target : link.source;
      if (!nodes.has(next)) {
        nodes.add(next);
        queue.push(next);
      }
    });
  }
  if (startLink !== undefined) links.add(startLink.id);
  return { nodes: [...nodes], links: [...links] };
}

export interface ChordEdge {
  readonly source: string;
  readonly target: string;
  readonly value: number;
}

export interface ChordMatrixInput {
  /** Stable row/column identifiers. Their order is the matrix order. */
  readonly ids: readonly string[];
  /** Square non-negative flow matrix. Rows are sources and columns are targets. */
  readonly matrix: readonly (readonly number[])[];
}

export interface ChordOptions {
  readonly directed?: boolean;
  readonly padAngle?: number;
  readonly groupOrder?: 'input' | 'ascending' | 'descending';
  readonly subgroupOrder?: 'input' | 'ascending' | 'descending';
}

export interface ChordGroup {
  readonly id: string;
  readonly index: number;
  readonly value: number;
  readonly inbound: number;
  readonly outbound: number;
  readonly startAngle: number;
  readonly endAngle: number;
}

export interface ChordRibbon {
  readonly source: string;
  readonly target: string;
  readonly value: number;
  readonly sourceStartAngle: number;
  readonly sourceEndAngle: number;
  readonly targetStartAngle: number;
  readonly targetEndAngle: number;
  readonly sourceSubgroupOrder: number;
  readonly targetSubgroupOrder: number;
  readonly directed: boolean;
  readonly selfLoop: boolean;
}

function isChordMatrixInput(
  input: readonly ChordEdge[] | ChordMatrixInput,
): input is ChordMatrixInput {
  return !Array.isArray(input);
}

function validateChordIds(ids: readonly string[]): string[] {
  const normalized = ids.map((id, index) => nonEmpty(id, `$.ids[${index}]`));
  if (new Set(normalized).size !== normalized.length)
    throw new GraflumeError('INVALID_DATA', 'Chord matrix ids must be unique.', {
      path: '$.ids',
    });
  return normalized;
}

function validateChordMatrix(input: ChordMatrixInput): {
  readonly ids: readonly string[];
  readonly matrix: readonly (readonly number[])[];
} {
  const ids = validateChordIds(input.ids);
  if (input.matrix.length !== ids.length)
    throw new GraflumeError('INVALID_DATA', 'Chord matrix must have one row per id.', {
      path: '$.matrix',
    });
  const matrix = input.matrix.map((row, rowIndex) => {
    if (row.length !== ids.length)
      throw new GraflumeError('INVALID_DATA', 'Chord matrix must be square.', {
        path: `$.matrix[${rowIndex}]`,
      });
    return row.map((raw, columnIndex) => {
      const value = finite(raw, `$.matrix[${rowIndex}][${columnIndex}]`);
      if (value < 0)
        throw new GraflumeError('INVALID_DATA', 'Chord matrix values must be non-negative.', {
          path: `$.matrix[${rowIndex}][${columnIndex}]`,
        });
      return value;
    });
  });
  return { ids, matrix };
}

/** Converts a stable edge list to its square matrix without losing authored node order. */
export function chordEdgesToMatrix(
  edges: readonly ChordEdge[],
  options: { readonly directed?: boolean; readonly ids?: readonly string[] } = {},
): ChordMatrixInput {
  const ids = options.ids === undefined ? [] : validateChordIds(options.ids);
  const seen = new Set(ids);
  const normalized = edges.map((edge, index) => {
    const source = nonEmpty(edge.source, `$.edges[${index}].source`);
    const target = nonEmpty(edge.target, `$.edges[${index}].target`);
    const value = finite(edge.value, `$.edges[${index}].value`);
    if (value < 0) throw new GraflumeError('INVALID_DATA', 'Chord values must be non-negative.');
    for (const id of [source, target]) {
      if (options.ids !== undefined && !seen.has(id))
        throw new GraflumeError('INVALID_DATA', `Chord edge references unknown id "${id}".`, {
          path: `$.edges[${index}]`,
        });
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return { source, target, value };
  });
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const matrix = ids.map(() => ids.map(() => 0));
  normalized.forEach(({ source, target, value }) => {
    const sourceIndex = indexById.get(source)!;
    const targetIndex = indexById.get(target)!;
    matrix[sourceIndex]![targetIndex] = matrix[sourceIndex]![targetIndex]! + value;
    if (options.directed !== true && source !== target)
      matrix[targetIndex]![sourceIndex] = matrix[targetIndex]![sourceIndex]! + value;
  });
  return { ids, matrix };
}

/** Converts a square flow matrix to a stable edge list; undirected input must be symmetric. */
export function chordMatrixToEdges(
  input: ChordMatrixInput,
  options: { readonly directed?: boolean } = {},
): readonly ChordEdge[] {
  const { ids, matrix } = validateChordMatrix(input);
  const directed = options.directed === true;
  if (!directed) {
    for (let row = 0; row < matrix.length; row += 1) {
      for (let column = row + 1; column < matrix.length; column += 1) {
        if (Math.abs(matrix[row]![column]! - matrix[column]![row]!) > 1e-12)
          throw new GraflumeError(
            'INVALID_DATA',
            'Undirected chord matrices must be symmetric; use directed: true for asymmetric flow.',
            { path: `$.matrix[${row}][${column}]` },
          );
      }
    }
  }
  const edges: ChordEdge[] = [];
  for (let row = 0; row < matrix.length; row += 1) {
    const start = directed ? 0 : row;
    for (let column = start; column < matrix.length; column += 1) {
      const value = matrix[row]![column]!;
      if (value > 0) edges.push({ source: ids[row]!, target: ids[column]!, value });
    }
  }
  return edges;
}

/** Lays out either a square matrix or an edge list with explicit direction and self-loop semantics. */
export function layoutChord(
  input: readonly ChordEdge[] | ChordMatrixInput,
  options: ChordOptions = {},
): {
  readonly ids: readonly string[];
  readonly matrix: readonly (readonly number[])[];
  readonly groups: readonly ChordGroup[];
  readonly ribbons: readonly ChordRibbon[];
} {
  const matrixInput = isChordMatrixInput(input) ? validateChordMatrix(input) : null;
  const edges: readonly ChordEdge[] =
    matrixInput === null
      ? (input as readonly ChordEdge[])
      : chordMatrixToEdges(matrixInput, options);
  const ids: string[] = matrixInput === null ? [] : [...matrixInput.ids];
  const seen = new Set<string>(ids);
  const normalized = edges.map((edge, index) => {
    const source = nonEmpty(edge.source, `$.edges[${index}].source`);
    const target = nonEmpty(edge.target, `$.edges[${index}].target`);
    const value = finite(edge.value, `$.edges[${index}].value`);
    if (value < 0) throw new GraflumeError('INVALID_DATA', 'Chord values must be non-negative.');
    for (const id of [source, target])
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    return { source, target, value, inputIndex: index };
  });
  const matrix =
    matrixInput?.matrix.map((row) => [...row]) ??
    chordEdgesToMatrix(normalized, {
      ...(options.directed === undefined ? {} : { directed: options.directed }),
      ids,
    }).matrix.map((row) => [...row]);
  const totals = ids.map((id, index) => {
    const outbound = matrix[index]!.reduce((sum, value) => sum + value, 0);
    const inbound = matrix.reduce((sum, row) => sum + row[index]!, 0);
    return {
      id,
      original: index,
      outbound,
      inbound,
      value: options.directed === true ? Math.max(outbound, inbound) : outbound,
    };
  });
  if (options.groupOrder === 'ascending')
    totals.sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  if (options.groupOrder === 'descending')
    totals.sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
  const padding = clamp(options.padAngle ?? 0.02, 0, Math.PI / Math.max(1, totals.length));
  const totalValue = totals.reduce((sum, group) => sum + group.value, 0) || 1;
  const available = Math.PI * 2 - padding * totals.length;
  let angle = -Math.PI / 2;
  const groups = totals.map((group, index) => {
    const startAngle = angle;
    angle += (group.value / totalValue) * available;
    const value = { ...group, index, startAngle, endAngle: angle };
    angle += padding;
    return value;
  });
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const sortSubgroups = (values: (typeof normalized)[number][]) => {
    values.sort((left, right) => {
      if (options.subgroupOrder === 'ascending')
        return left.value - right.value || left.inputIndex - right.inputIndex;
      if (options.subgroupOrder === 'descending')
        return right.value - left.value || left.inputIndex - right.inputIndex;
      return left.inputIndex - right.inputIndex;
    });
  };
  const portions = (id: string, value: number, total: number, cursors: Map<string, number>) => {
    const group = groupById.get(id)!;
    const start = cursors.get(id)!;
    const end = total === 0 ? start : start + ((group.endAngle - group.startAngle) * value) / total;
    cursors.set(id, end);
    return [start, end] as const;
  };
  const endpointByEdge = new Map<
    string,
    { readonly interval: readonly [number, number]; readonly order: number }
  >();
  const sourceByEdge = new Map<
    number,
    { readonly interval: readonly [number, number]; readonly order: number }
  >();
  const targetByEdge = new Map<
    number,
    { readonly interval: readonly [number, number]; readonly order: number }
  >();
  if (options.directed === true) {
    const outgoing = new Map<string, (typeof normalized)[number][]>();
    const incoming = new Map<string, (typeof normalized)[number][]>();
    normalized.forEach((edge) => {
      outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
      incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
    });
    const sourceCursors = new Map(groups.map((group) => [group.id, group.startAngle]));
    const targetCursors = new Map(groups.map((group) => [group.id, group.startAngle]));
    outgoing.forEach((values, id) => {
      sortSubgroups(values);
      const total = groupById.get(id)!.outbound;
      values.forEach((edge, order) => {
        sourceByEdge.set(edge.inputIndex, {
          interval: portions(id, edge.value, total, sourceCursors),
          order,
        });
      });
    });
    incoming.forEach((values, id) => {
      sortSubgroups(values);
      const total = groupById.get(id)!.inbound;
      values.forEach((edge, order) => {
        targetByEdge.set(edge.inputIndex, {
          interval: portions(id, edge.value, total, targetCursors),
          order,
        });
      });
    });
  } else {
    const incident = new Map<string, (typeof normalized)[number][]>();
    normalized.forEach((edge) => {
      incident.set(edge.source, [...(incident.get(edge.source) ?? []), edge]);
      if (edge.target !== edge.source)
        incident.set(edge.target, [...(incident.get(edge.target) ?? []), edge]);
    });
    const cursors = new Map(groups.map((group) => [group.id, group.startAngle]));
    incident.forEach((values, id) => {
      sortSubgroups(values);
      const total = groupById.get(id)!.value;
      values.forEach((edge, order) => {
        endpointByEdge.set(`${edge.inputIndex}\u0000${id}`, {
          interval: portions(id, edge.value, total, cursors),
          order,
        });
      });
    });
  }
  const ribbons = normalized.map((edge) => {
    const source =
      options.directed === true
        ? sourceByEdge.get(edge.inputIndex)!
        : endpointByEdge.get(`${edge.inputIndex}\u0000${edge.source}`)!;
    const target =
      options.directed === true
        ? targetByEdge.get(edge.inputIndex)!
        : endpointByEdge.get(`${edge.inputIndex}\u0000${edge.target}`)!;
    return {
      source: edge.source,
      target: edge.target,
      value: edge.value,
      sourceStartAngle: source.interval[0],
      sourceEndAngle: source.interval[1],
      targetStartAngle: target.interval[0],
      targetEndAngle: target.interval[1],
      sourceSubgroupOrder: source.order,
      targetSubgroupOrder: target.order,
      directed: options.directed === true,
      selfLoop: edge.source === edge.target,
    };
  });
  return { ids, matrix, groups, ribbons };
}

export interface FunnelStageInput {
  readonly id: string;
  readonly value: number;
  readonly order?: number;
  readonly label?: string;
}

export interface FunnelOptions {
  readonly sort?: 'input' | 'value-descending' | 'order';
  readonly neckWidth?: number;
  readonly neckHeight?: number;
  readonly labelGap?: number;
}

export interface FunnelStage {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly input: number;
  readonly output: number;
  readonly conversion: number | null;
  readonly dropoff: number;
  readonly dropoffRate: number | null;
  readonly cumulative: number | null;
  readonly topWidth: number;
  readonly bottomWidth: number;
  readonly y0: number;
  readonly y1: number;
  readonly labelY: number;
}

/** Resolves funnel conversion/drop-off/cumulative semantics, neck geometry, ordering and label collisions. */
export function funnelStages(
  data: readonly FunnelStageInput[],
  options: FunnelOptions = {},
): readonly FunnelStage[] {
  const stages = data.map((stage, index) => {
    const id = nonEmpty(stage.id, `$.data[${index}].id`);
    const value = finite(stage.value, `$.data[${index}].value`);
    if (value < 0) throw new GraflumeError('INVALID_DATA', 'Funnel values must be non-negative.');
    return { ...stage, id, label: stage.label?.trim() || id, value, inputIndex: index };
  });
  if (new Set(stages.map(({ id }) => id)).size !== stages.length) {
    throw new GraflumeError('INVALID_DATA', 'Funnel stage ids must be unique.');
  }
  if (options.sort === 'value-descending')
    stages.sort((a, b) => b.value - a.value || a.inputIndex - b.inputIndex);
  if (options.sort === 'order')
    stages.sort((a, b) => (a.order ?? a.inputIndex) - (b.order ?? b.inputIndex));
  const first = stages[0]?.value ?? 0;
  const maximum = Math.max(first, ...stages.map(({ value }) => value), Number.EPSILON);
  const neckWidth = clamp(options.neckWidth ?? 0.3, 0.02, 1);
  const neckHeight = clamp(options.neckHeight ?? 0.25, 0, 1);
  const labelGap = clamp(options.labelGap ?? 0.055, 0.01, 0.25);
  const naturalLabels = stages.map((_, index) => (index + 0.5) / Math.max(1, stages.length));
  const effectiveLabelGap =
    stages.length <= 1 ? 0 : Math.min(labelGap, 1 / Math.max(1, stages.length - 1));
  const labelPositions = [...naturalLabels];
  for (let index = 1; index < labelPositions.length; index += 1)
    labelPositions[index] = Math.max(
      labelPositions[index]!,
      labelPositions[index - 1]! + effectiveLabelGap,
    );
  if (labelPositions.length > 0) {
    labelPositions[labelPositions.length - 1] = Math.min(1, labelPositions.at(-1)!);
    for (let index = labelPositions.length - 2; index >= 0; index -= 1)
      labelPositions[index] = Math.min(
        labelPositions[index]!,
        labelPositions[index + 1]! - effectiveLabelGap,
      );
  }
  return stages.map((stage, index) => {
    const previous = stages[index - 1]?.value ?? stage.value;
    const next = stages[index + 1]?.value ?? stage.value;
    const y0 = index / Math.max(1, stages.length);
    const y1 = (index + 1) / Math.max(1, stages.length);
    const width = (value: number, y: number) =>
      y >= 1 - neckHeight ? neckWidth : Math.max(neckWidth, value / maximum);
    const labelY = clamp(labelPositions[index] ?? (y0 + y1) / 2, 0, 1);
    return {
      id: stage.id,
      label: stage.label,
      value: stage.value,
      input: previous,
      output: stage.value,
      conversion: previous === 0 ? null : stage.value / previous,
      dropoff: Math.max(0, previous - stage.value),
      dropoffRate: previous === 0 ? null : Math.max(0, previous - stage.value) / previous,
      cumulative: first === 0 ? null : stage.value / first,
      topWidth: width(stage.value, y0),
      bottomWidth: width(next, y1),
      y0,
      y1,
      labelY,
    };
  });
}

export type ParallelScaleType = 'linear' | 'log' | 'ordinal';

export interface ParallelAxis {
  readonly field: string;
  readonly type?: ParallelScaleType;
  readonly domain?: readonly (number | string)[];
  readonly invert?: boolean;
  readonly missing?: 'gap' | 'top' | 'bottom' | 'middle';
}

export interface ParallelBrush {
  readonly field: string;
  readonly extents: readonly (readonly [number, number])[];
}

export interface ParallelProjection {
  readonly axes: readonly ParallelAxis[];
  readonly rows: readonly {
    readonly index: number;
    readonly values: Readonly<Record<string, number | null>>;
    readonly selected: boolean;
  }[];
}

/** Normalizes linear/log/ordinal parallel axes with missing routes, reorder/invert and linked multi-brush filtering. */
export function projectParallelRows(
  rows: readonly Readonly<Record<string, unknown>>[],
  axes: readonly ParallelAxis[],
  brushes: readonly ParallelBrush[] = [],
  combine: 'union' | 'intersection' = 'intersection',
): ParallelProjection {
  if (axes.length < 2)
    throw new GraflumeError('INVALID_SPEC', 'Parallel coordinates need at least two axes.');
  const fields = axes.map(({ field }, index) => nonEmpty(field, `$.axes[${index}].field`));
  if (new Set(fields).size !== fields.length)
    throw new GraflumeError('INVALID_SPEC', 'Parallel axis fields must be unique.');
  const descriptors = axes.map((axis, axisIndex) => {
    const field = fields[axisIndex]!;
    const type = axis.type ?? 'linear';
    const observed = rows
      .map((row) => row[field])
      .filter((value) => value !== null && value !== undefined);
    if (type === 'ordinal') {
      const domain = axis.domain?.map(String) ?? [...new Set(observed.map(String))];
      return { axis, field, type, domain } as const;
    }
    const numeric = observed.map((value) => Number(value)).filter(Number.isFinite);
    const authored = axis.domain?.map(Number).filter(Number.isFinite);
    const domain = authored?.length === 2 ? authored : [Math.min(...numeric), Math.max(...numeric)];
    if (domain.length !== 2 || !domain.every(Number.isFinite)) {
      throw new GraflumeError('INVALID_DATA', `Parallel axis "${field}" has no finite domain.`);
    }
    if (type === 'log' && domain[0]! <= 0) {
      throw new GraflumeError(
        'INVALID_DATA',
        `Parallel log axis "${field}" requires positive values.`,
      );
    }
    return { axis, field, type, domain } as const;
  });
  const project = (descriptor: (typeof descriptors)[number], raw: unknown): number | null => {
    if (raw === null || raw === undefined || raw === '') {
      const route = descriptor.axis.missing ?? 'gap';
      return route === 'gap' ? null : route === 'top' ? 1 : route === 'bottom' ? 0 : 0.5;
    }
    let ratio: number;
    if (descriptor.type === 'ordinal') {
      const index = descriptor.domain.indexOf(String(raw));
      if (index < 0) return null;
      ratio = descriptor.domain.length <= 1 ? 0.5 : index / (descriptor.domain.length - 1);
    } else {
      const value = Number(raw);
      if (!Number.isFinite(value) || (descriptor.type === 'log' && value <= 0)) return null;
      const low =
        descriptor.type === 'log'
          ? Math.log(descriptor.domain[0] as number)
          : (descriptor.domain[0] as number);
      const high =
        descriptor.type === 'log'
          ? Math.log(descriptor.domain[1] as number)
          : (descriptor.domain[1] as number);
      const current = descriptor.type === 'log' ? Math.log(value) : value;
      ratio = high === low ? 0.5 : (current - low) / (high - low);
    }
    ratio = clamp(ratio, 0, 1);
    return descriptor.axis.invert === true ? 1 - ratio : ratio;
  };
  const normalizedBrushes = brushes.map((brush, index) => {
    if (!fields.includes(brush.field))
      throw new GraflumeError('INVALID_SPEC', `Unknown brush field "${brush.field}".`);
    return {
      field: brush.field,
      extents: brush.extents.map((extent, extentIndex) => {
        const low = finite(extent[0], `$.brushes[${index}].extents[${extentIndex}][0]`);
        const high = finite(extent[1], `$.brushes[${index}].extents[${extentIndex}][1]`);
        return [Math.min(low, high), Math.max(low, high)] as const;
      }),
    };
  });
  return {
    axes,
    rows: rows.map((row, index) => {
      const values = Object.fromEntries(
        descriptors.map((descriptor) => [
          descriptor.field,
          project(descriptor, row[descriptor.field]),
        ]),
      ) as Record<string, number | null>;
      const matches = normalizedBrushes.map(({ field, extents }) => {
        const value = values[field];
        return (
          value !== null &&
          value !== undefined &&
          extents.some(([low, high]) => value >= low && value <= high)
        );
      });
      return {
        index,
        values,
        selected:
          matches.length === 0 ||
          (combine === 'intersection' ? matches.every(Boolean) : matches.some(Boolean)),
      };
    }),
  };
}

export interface SetMembershipDatum {
  readonly id: string;
  readonly sets: readonly string[];
}

/** Exact, pre-aggregated membership-region input. `sets` names the complete membership signature. */
export interface SetIntersectionDatum {
  readonly sets: readonly string[];
  readonly size: number;
  /** Optional concrete member ids retain query/tool-tip provenance when available. */
  readonly members?: readonly string[];
}

export interface SetCircle {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly size: number;
}

export interface SetAnalysisResult {
  readonly sets: readonly { readonly id: string; readonly size: number }[];
  readonly intersections: readonly {
    readonly sets: readonly string[];
    readonly size: number;
    readonly members: readonly string[];
  }[];
  readonly circles: readonly SetCircle[];
  readonly quality: {
    readonly stress: number;
    readonly maximumRelativeError: number;
    readonly regions: readonly {
      readonly sets: readonly string[];
      readonly expected: number;
      readonly actual: number;
      readonly relativeError: number;
    }[];
  };
}

function circleOverlapArea(first: SetCircle, second: SetCircle): number {
  const distance = Math.hypot(first.x - second.x, first.y - second.y);
  if (distance >= first.radius + second.radius) return 0;
  if (distance <= Math.abs(first.radius - second.radius))
    return Math.PI * Math.min(first.radius, second.radius) ** 2;
  const a = Math.acos(
    (distance * distance + first.radius ** 2 - second.radius ** 2) / (2 * distance * first.radius),
  );
  const b = Math.acos(
    (distance * distance + second.radius ** 2 - first.radius ** 2) / (2 * distance * second.radius),
  );
  const triangle =
    0.5 *
    Math.sqrt(
      Math.max(
        0,
        (-distance + first.radius + second.radius) *
          (distance + first.radius - second.radius) *
          (distance - first.radius + second.radius) *
          (distance + first.radius + second.radius),
      ),
    );
  return first.radius ** 2 * a + second.radius ** 2 * b - triangle;
}

function solveCircleDistance(firstRadius: number, secondRadius: number, target: number): number {
  let low = Math.abs(firstRadius - secondRadius);
  let high = firstRadius + secondRadius;
  for (let iteration = 0; iteration < 64; iteration += 1) {
    const distance = (low + high) / 2;
    const overlap = circleOverlapArea(
      { id: 'a', x: 0, y: 0, radius: firstRadius, size: 0 },
      { id: 'b', x: distance, y: 0, radius: secondRadius, size: 0 },
    );
    if (overlap > target) low = distance;
    else high = distance;
  }
  return (low + high) / 2;
}

function circleIntersectionPoints(first: SetCircle, second: SetCircle) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const distance = Math.hypot(dx, dy);
  if (
    distance <= 1e-14 ||
    distance > first.radius + second.radius + 1e-14 ||
    distance < Math.abs(first.radius - second.radius) - 1e-14
  )
    return [];
  const along = (first.radius ** 2 - second.radius ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, first.radius ** 2 - along ** 2));
  const baseX = first.x + (along * dx) / distance;
  const baseY = first.y + (along * dy) / distance;
  const offsetX = (-dy * height) / distance;
  const offsetY = (dx * height) / distance;
  return [
    { x: baseX + offsetX, y: baseY + offsetY },
    { x: baseX - offsetX, y: baseY - offsetY },
  ];
}

function adaptiveSimpson(
  evaluate: (value: number) => number,
  left: number,
  right: number,
  tolerance: number,
) {
  const middle = (left + right) / 2;
  const leftValue = evaluate(left);
  const middleValue = evaluate(middle);
  const rightValue = evaluate(right);
  const estimate = ((right - left) * (leftValue + 4 * middleValue + rightValue)) / 6;
  const recurse = (
    start: number,
    end: number,
    startValue: number,
    centerValue: number,
    endValue: number,
    whole: number,
    epsilon: number,
    depth: number,
  ): number => {
    const center = (start + end) / 2;
    const leftCenter = (start + center) / 2;
    const rightCenter = (center + end) / 2;
    const leftCenterValue = evaluate(leftCenter);
    const rightCenterValue = evaluate(rightCenter);
    const leftEstimate = ((center - start) * (startValue + 4 * leftCenterValue + centerValue)) / 6;
    const rightEstimate = ((end - center) * (centerValue + 4 * rightCenterValue + endValue)) / 6;
    const combined = leftEstimate + rightEstimate;
    const correction = combined - whole;
    if (depth === 0 || Math.abs(correction) <= 15 * epsilon) return combined + correction / 15;
    return (
      recurse(
        start,
        center,
        startValue,
        leftCenterValue,
        centerValue,
        leftEstimate,
        epsilon / 2,
        depth - 1,
      ) +
      recurse(
        center,
        end,
        centerValue,
        rightCenterValue,
        endValue,
        rightEstimate,
        epsilon / 2,
        depth - 1,
      )
    );
  };
  return recurse(left, right, leftValue, middleValue, rightValue, estimate, tolerance, 16);
}

function tripleCircleOverlapArea(
  circles: readonly [SetCircle, SetCircle, SetCircle],
  tolerance = 1e-9,
) {
  const insideAll = ({ x, y }: { readonly x: number; readonly y: number }) =>
    circles.every((circle) => Math.hypot(x - circle.x, y - circle.y) <= circle.radius + 1e-12);
  const candidates = [
    ...circles.map(({ x, y }) => ({ x, y })),
    ...circleIntersectionPoints(circles[0], circles[1]),
    ...circleIntersectionPoints(circles[0], circles[2]),
    ...circleIntersectionPoints(circles[1], circles[2]),
  ];
  if (!candidates.some(insideAll)) return 0;
  const left = Math.max(...circles.map((circle) => circle.x - circle.radius));
  const right = Math.min(...circles.map((circle) => circle.x + circle.radius));
  if (right <= left) return 0;
  const height = (x: number) => {
    let lower = Number.NEGATIVE_INFINITY;
    let upper = Number.POSITIVE_INFINITY;
    for (const circle of circles) {
      const horizontal = x - circle.x;
      if (Math.abs(horizontal) > circle.radius) return 0;
      const vertical = Math.sqrt(Math.max(0, circle.radius ** 2 - horizontal ** 2));
      lower = Math.max(lower, circle.y - vertical);
      upper = Math.min(upper, circle.y + vertical);
    }
    return Math.max(0, upper - lower);
  };
  const breakpoints = [
    left,
    ...circleIntersectionPoints(circles[0], circles[1]).map(({ x }) => x),
    ...circleIntersectionPoints(circles[0], circles[2]).map(({ x }) => x),
    ...circleIntersectionPoints(circles[1], circles[2]).map(({ x }) => x),
    right,
  ]
    .filter((value) => value >= left && value <= right)
    .sort((a, b) => a - b)
    .filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]!) > 1e-12);
  let area = 0;
  for (let index = 1; index < breakpoints.length; index += 1) {
    const start = breakpoints[index - 1]!;
    const end = breakpoints[index]!;
    if (end - start <= 1e-14) continue;
    area += adaptiveSimpson(height, start, end, tolerance / breakpoints.length);
  }
  return Math.max(0, area);
}

function setAtomicRegionQuality(
  circles: readonly SetCircle[],
  setIds: readonly string[],
  expectedCounts: ReadonlyMap<number, number>,
  areaScale: number,
  integrationTolerance = 1e-9,
) {
  const areas = circles.map(({ radius }) => Math.PI * radius ** 2);
  const pair = new Map<string, number>();
  for (let left = 0; left < circles.length; left += 1)
    for (let right = left + 1; right < circles.length; right += 1)
      pair.set(`${left}:${right}`, circleOverlapArea(circles[left]!, circles[right]!));
  const triple =
    circles.length === 3
      ? Math.min(
          pair.get('0:1')!,
          pair.get('0:2')!,
          pair.get('1:2')!,
          tripleCircleOverlapArea(
            circles as readonly [SetCircle, SetCircle, SetCircle],
            integrationTolerance,
          ),
        )
      : 0;
  const actualForMask = (mask: number) => {
    if (circles.length === 1) return areas[0]!;
    if (circles.length === 2) {
      const overlap = pair.get('0:1')!;
      if (mask === 1) return areas[0]! - overlap;
      if (mask === 2) return areas[1]! - overlap;
      return overlap;
    }
    const overlap01 = pair.get('0:1')!;
    const overlap02 = pair.get('0:2')!;
    const overlap12 = pair.get('1:2')!;
    if (mask === 1) return areas[0]! - overlap01 - overlap02 + triple;
    if (mask === 2) return areas[1]! - overlap01 - overlap12 + triple;
    if (mask === 3) return overlap01 - triple;
    if (mask === 4) return areas[2]! - overlap02 - overlap12 + triple;
    if (mask === 5) return overlap02 - triple;
    if (mask === 6) return overlap12 - triple;
    return triple;
  };
  const regions = Array.from({ length: 2 ** circles.length - 1 }, (_, index) => index + 1).map(
    (mask) => {
      const expected = (expectedCounts.get(mask) ?? 0) * areaScale;
      const actual = Math.max(0, actualForMask(mask));
      const relativeError = Math.abs(actual - expected) / Math.max(expected, areaScale);
      return {
        sets: setIds.filter((_, index) => (mask & (1 << index)) !== 0),
        expected,
        actual,
        relativeError,
      };
    },
  );
  return {
    stress: Math.sqrt(
      regions.reduce((sum, { relativeError }) => sum + relativeError ** 2, 0) / regions.length,
    ),
    maximumRelativeError: Math.max(0, ...regions.map(({ relativeError }) => relativeError)),
    regions,
  };
}

function optimizeThreeSetCircles(
  circles: readonly SetCircle[],
  setIds: readonly string[],
  expectedCounts: ReadonlyMap<number, number>,
  areaScale: number,
) {
  const maximumRadius = Math.max(...circles.map(({ radius }) => radius));
  const bound = maximumRadius * 2;
  const symmetric =
    circles.every(({ radius }) => Math.abs(radius - circles[0]!.radius) <= 1e-12) &&
    (expectedCounts.get(1) ?? 0) === (expectedCounts.get(2) ?? 0) &&
    (expectedCounts.get(1) ?? 0) === (expectedCounts.get(4) ?? 0) &&
    (expectedCounts.get(3) ?? 0) === (expectedCounts.get(5) ?? 0) &&
    (expectedCounts.get(3) ?? 0) === (expectedCounts.get(6) ?? 0);
  if (symmetric) {
    const evaluateDistance = (distance: number) => {
      const bounded = clamp(distance, 0, bound);
      const candidate = [
        { ...circles[0]!, x: 0, y: 0 },
        { ...circles[1]!, x: bounded, y: 0 },
        {
          ...circles[2]!,
          x: bounded / 2,
          y: (bounded * Math.sqrt(3)) / 2,
        },
      ];
      return {
        circles: candidate,
        distance: bounded,
        quality: setAtomicRegionQuality(candidate, setIds, expectedCounts, areaScale, 1e-7),
      };
    };
    const betterDistance = (
      left: ReturnType<typeof evaluateDistance>,
      right: ReturnType<typeof evaluateDistance>,
    ) =>
      left.quality.stress < right.quality.stress - 1e-12 ||
      (Math.abs(left.quality.stress - right.quality.stress) <= 1e-12 &&
        (left.quality.maximumRelativeError < right.quality.maximumRelativeError - 1e-12 ||
          (Math.abs(left.quality.maximumRelativeError - right.quality.maximumRelativeError) <=
            1e-12 &&
            left.distance < right.distance)));
    let best = evaluateDistance(0);
    for (let index = 1; index <= 128; index += 1) {
      const candidate = evaluateDistance((bound * index) / 128);
      if (betterDistance(candidate, best)) best = candidate;
    }
    let step = bound / 128;
    for (let iteration = 0; iteration < 64 && step > maximumRadius * 1e-7; iteration += 1) {
      const lower = evaluateDistance(best.distance - step);
      const upper = evaluateDistance(best.distance + step);
      if (betterDistance(lower, best)) best = lower;
      else if (betterDistance(upper, best)) best = upper;
      else step /= 2;
    }
    return best.circles;
  }
  const initial = [circles[1]!.x, circles[2]!.x, Math.max(0, circles[2]!.y)] as const;
  const starts = [0, 0.5, 0.75, 1, 1.25, 1.5].map((factor) =>
    initial.map((value) => value * factor),
  );
  starts.push([bound, 0, bound], [0, 0, 0]);
  const constrain = ([secondX, thirdX, thirdY]: readonly number[]) => [
    clamp(secondX ?? 0, 0, bound),
    clamp(thirdX ?? 0, -bound, bound),
    clamp(thirdY ?? 0, 0, bound),
  ];
  const evaluate = (position: readonly number[]) => {
    const [secondX, thirdX, thirdY] = constrain(position);
    const candidate = [
      { ...circles[0]!, x: 0, y: 0 },
      { ...circles[1]!, x: secondX!, y: 0 },
      { ...circles[2]!, x: thirdX!, y: thirdY! },
    ];
    return {
      circles: candidate,
      position: [secondX!, thirdX!, thirdY!],
      quality: setAtomicRegionQuality(candidate, setIds, expectedCounts, areaScale, 1e-7),
    };
  };
  const better = (left: ReturnType<typeof evaluate>, right: ReturnType<typeof evaluate>) =>
    left.quality.stress < right.quality.stress - 1e-12 ||
    (Math.abs(left.quality.stress - right.quality.stress) <= 1e-12 &&
      (left.quality.maximumRelativeError < right.quality.maximumRelativeError - 1e-12 ||
        (Math.abs(left.quality.maximumRelativeError - right.quality.maximumRelativeError) <=
          1e-12 &&
          left.position.join(',') < right.position.join(','))));
  let best = evaluate(initial);
  for (const start of starts) {
    let current = evaluate(start);
    let step = maximumRadius / 2;
    for (let iteration = 0; iteration < 96 && step > maximumRadius * 1e-5; iteration += 1) {
      let improved = false;
      for (let coordinate = 0; coordinate < 3; coordinate += 1) {
        for (const direction of [-1, 1]) {
          const position = [...current.position];
          position[coordinate] = position[coordinate]! + direction * step;
          const candidate = evaluate(position);
          if (better(candidate, current)) {
            current = candidate;
            improved = true;
          }
        }
      }
      if (!improved) step /= 2;
    }
    if (better(current, best)) best = current;
  }
  return best.circles;
}

/** Computes membership/intersection input plus a deterministic proportional 2/3-set Euler layout and quality metric. */
export function analyzeSets(
  data: readonly SetMembershipDatum[] | readonly SetIntersectionDatum[],
): SetAnalysisResult {
  const setIds: string[] = [];
  const seenSets = new Set<string>();
  const modes = new Set(data.map((datum) => ('size' in datum ? 'intersection' : 'membership')));
  if (modes.size > 1)
    throw new GraflumeError(
      'INVALID_DATA',
      'Set input must use either membership rows or pre-aggregated intersection rows.',
    );
  const memberIds = new Set<string>();
  const normalized = data.map((datum, index) => {
    const sets = [
      ...new Set(
        datum.sets.map((set, setIndex) => nonEmpty(set, `$.data[${index}].sets[${setIndex}]`)),
      ),
    ].sort();
    sets.forEach((set) => {
      if (!seenSets.has(set)) {
        seenSets.add(set);
        setIds.push(set);
      }
    });
    if ('size' in datum) {
      const size = finite(datum.size, `$.data[${index}].size`);
      if (size < 0)
        throw new GraflumeError('INVALID_DATA', 'Set intersection sizes must be non-negative.', {
          path: `$.data[${index}].size`,
        });
      const members = (datum.members ?? []).map((id, memberIndex) =>
        nonEmpty(id, `$.data[${index}].members[${memberIndex}]`),
      );
      members.forEach((id) => {
        if (memberIds.has(id))
          throw new GraflumeError('INVALID_DATA', `Duplicate set member id "${id}".`);
        memberIds.add(id);
      });
      if (members.length > size)
        throw new GraflumeError(
          'INVALID_DATA',
          'Set intersection members cannot exceed its aggregate size.',
          { path: `$.data[${index}].members` },
        );
      return { sets, size, members };
    }
    const id = nonEmpty(datum.id, `$.data[${index}].id`);
    if (memberIds.has(id))
      throw new GraflumeError('INVALID_DATA', 'Set member ids must be unique.');
    memberIds.add(id);
    return { sets, size: 1, members: [id] };
  });
  if (setIds.length > 3)
    throw new GraflumeError(
      'INVALID_SPEC',
      'Proportional Venn layout supports two or three sets; use intersection bars for more sets.',
    );
  const sets = setIds.map((id) => ({
    id,
    size: normalized.reduce((sum, datum) => sum + (datum.sets.includes(id) ? datum.size : 0), 0),
  }));
  const combinations = new Map<string, { size: number; members: string[] }>();
  normalized.forEach(({ size, sets, members }) => {
    const key = sets.join('\u0000');
    const previous = combinations.get(key) ?? { size: 0, members: [] };
    combinations.set(key, {
      size: previous.size + size,
      members: [...previous.members, ...members],
    });
  });
  const intersections = [...combinations.entries()].map(([key, aggregate]) => ({
    sets: key === '' ? [] : key.split('\u0000'),
    size: aggregate.size,
    members: aggregate.members,
  }));
  const areaScale = 1 / Math.max(1, ...sets.map(({ size }) => size));
  let circles: SetCircle[] = sets.map(({ id, size }, index) => ({
    id,
    x: index,
    y: 0,
    radius: Math.sqrt((size * areaScale) / Math.PI),
    size,
  }));
  const desiredOverlap = (a: string, b: string) =>
    normalized.reduce(
      (sum, datum) => sum + (datum.sets.includes(a) && datum.sets.includes(b) ? datum.size : 0),
      0,
    ) * areaScale;
  if (circles.length >= 2)
    circles[1] = {
      ...circles[1]!,
      x: solveCircleDistance(
        circles[0]!.radius,
        circles[1]!.radius,
        desiredOverlap(circles[0]!.id, circles[1]!.id),
      ),
    };
  if (circles.length === 3) {
    const d02 = solveCircleDistance(
      circles[0]!.radius,
      circles[2]!.radius,
      desiredOverlap(circles[0]!.id, circles[2]!.id),
    );
    const d12 = solveCircleDistance(
      circles[1]!.radius,
      circles[2]!.radius,
      desiredOverlap(circles[1]!.id, circles[2]!.id),
    );
    const x =
      circles[1]!.x === 0 ? 0 : (d02 ** 2 - d12 ** 2 + circles[1]!.x ** 2) / (2 * circles[1]!.x);
    const y = Math.sqrt(Math.max(0, d02 ** 2 - x ** 2));
    circles[2] = { ...circles[2]!, x, y };
  }
  const setIndex = new Map(setIds.map((id, index) => [id, index]));
  const expectedCounts = new Map<number, number>();
  normalized.forEach(({ sets, size }) => {
    const mask = sets.reduce((value, id) => value | (1 << setIndex.get(id)!), 0);
    if (mask !== 0) expectedCounts.set(mask, (expectedCounts.get(mask) ?? 0) + size);
  });
  if (circles.length === 3)
    circles = optimizeThreeSetCircles(circles, setIds, expectedCounts, areaScale);
  const quality = setAtomicRegionQuality(circles, setIds, expectedCounts, areaScale);
  return {
    sets,
    intersections: intersections.sort(
      (a, b) => b.size - a.size || a.sets.join().localeCompare(b.sets.join()),
    ),
    circles,
    quality,
  };
}

/** Exact membership query used by Venn/Euler region hit testing and linked filters. */
export function querySetRegion(
  data: readonly SetMembershipDatum[],
  included: readonly string[],
  excluded: readonly string[] = [],
): readonly string[] {
  const required = new Set(included);
  const forbidden = new Set(excluded);
  return data
    .filter(
      ({ sets }) =>
        [...required].every((set) => sets.includes(set)) &&
        [...forbidden].every((set) => !sets.includes(set)),
    )
    .map(({ id }) => id);
}

/** Returns the exact inside/outside circle signature for pointer-based region hit testing. */
export function hitSetRegion(
  circles: readonly SetCircle[],
  point: { readonly x: number; readonly y: number },
): readonly string[] {
  finite(point.x, '$.point.x');
  finite(point.y, '$.point.y');
  return circles
    .filter((circle) => Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius)
    .map(({ id }) => id);
}

export interface WordTokenOptions {
  readonly case?: 'lower' | 'upper' | 'preserve';
  readonly stopwords?: readonly string[];
  readonly ngram?: number;
  readonly stemming?: 'none' | 'simple-en';
  readonly locale?: string;
}

function stemEnglish(token: string): string {
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

/** Shared Unicode tokenizer/stopword/n-gram/stemming contract for Word tree and Word cloud. */
export function tokenizeWords(text: string, options: WordTokenOptions = {}): readonly string[] {
  const ngram = Math.floor(options.ngram ?? 1);
  if (ngram < 1 || ngram > 8)
    throw new GraflumeError('INVALID_SPEC', '$.ngram must be from 1 to 8.');
  let tokens: string[] = [...(text.normalize('NFKC').match(/[\p{L}\p{N}_'-]+/gu) ?? [])];
  if (options.case === 'upper')
    tokens = tokens.map((token) => token.toLocaleUpperCase(options.locale));
  else if (options.case !== 'preserve')
    tokens = tokens.map((token) => token.toLocaleLowerCase(options.locale));
  if (options.stemming === 'simple-en') tokens = tokens.map(stemEnglish);
  const stopwords = new Set(
    (options.stopwords ?? []).map((value) => value.toLocaleLowerCase(options.locale)),
  );
  tokens = tokens.filter((token) => !stopwords.has(token.toLocaleLowerCase(options.locale)));
  if (ngram === 1) return tokens;
  return Array.from({ length: Math.max(0, tokens.length - ngram + 1) }, (_, index) =>
    tokens.slice(index, index + ngram).join(' '),
  );
}

export interface WordTreeNode {
  readonly id: string;
  readonly token: string;
  readonly phrase: string;
  readonly count: number;
  readonly depth: number;
  readonly parent: string | null;
}

/** Builds prefix, suffix, or reverse phrase trees with deterministic aggregation and pruning. */
export function buildWordTree(
  texts: readonly string[],
  rootPhrase: string,
  options: WordTokenOptions & {
    readonly direction?: 'prefix' | 'suffix' | 'reverse';
    readonly minimumCount?: number;
    readonly maximumDepth?: number;
    readonly maximumChildren?: number;
  } = {},
): readonly WordTreeNode[] {
  const rootTokens = tokenizeWords(rootPhrase, { ...options, ngram: 1 });
  if (rootTokens.length === 0)
    throw new GraflumeError('INVALID_SPEC', '$.rootPhrase must contain a token.');
  const direction = options.direction ?? 'prefix';
  const maximumDepth = clamp(Math.floor(options.maximumDepth ?? 6), 1, 32);
  const minimumCount = clamp(Math.floor(options.minimumCount ?? 1), 1, Number.MAX_SAFE_INTEGER);
  const maximumChildren = clamp(Math.floor(options.maximumChildren ?? 12), 1, 100);
  const counts = new Map<
    string,
    {
      key: string;
      token: string;
      phrase: string;
      depth: number;
      parent: string | null;
      count: number;
    }
  >();
  const rootKey = rootTokens.join(' ');
  counts.set(rootKey, {
    key: rootKey,
    token: rootTokens.at(-1)!,
    phrase: rootKey,
    depth: 0,
    parent: null,
    count: 0,
  });
  texts.forEach((text) => {
    const tokens = [...tokenizeWords(text, { ...options, ngram: 1 })];
    const backward = direction === 'suffix' || direction === 'reverse';
    const needle = backward ? [...rootTokens].reverse() : rootTokens;
    const source = backward ? [...tokens].reverse() : tokens;
    for (let index = 0; index <= source.length - needle.length; index += 1) {
      if (!needle.every((token, offset) => source[index + offset] === token)) continue;
      counts.get(rootKey)!.count += 1;
      let parent = rootKey;
      const phrase = [...needle];
      for (let depth = 1; depth <= maximumDepth; depth += 1) {
        const token = source[index + needle.length + depth - 1];
        if (token === undefined) break;
        phrase.push(token);
        const key = phrase.join('\u0000');
        const entry = counts.get(key) ?? {
          key,
          token,
          phrase: (backward ? [...phrase].reverse() : phrase).join(' '),
          depth,
          parent,
          count: 0,
        };
        entry.count += 1;
        counts.set(key, entry);
        parent = key;
      }
    }
  });
  const kept = new Map<string, (typeof counts extends Map<string, infer V> ? V : never)[]>();
  for (const [key, value] of counts) {
    if (key === rootKey || value.count >= minimumCount) {
      const children = kept.get(value.parent ?? '') ?? [];
      children.push(value);
      kept.set(value.parent ?? '', children);
    }
  }
  const output: WordTreeNode[] = [];
  const visit = (
    entry: typeof counts extends Map<string, infer V> ? V : never,
    id: string,
    parent: string | null,
  ): void => {
    output.push({
      id,
      token: entry.token,
      phrase: entry.phrase,
      count: entry.count,
      depth: entry.depth,
      parent,
    });
    const children = [...(kept.get(entry.key) ?? [])]
      .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token))
      .slice(0, maximumChildren);
    children.forEach((child, index) =>
      visit(child, `${id}/${encodeURIComponent(child.token)}-${index}`, id),
    );
  };
  visit(counts.get(rootKey)!, rootKey, null);
  return output;
}

export interface WordCloudLayoutOptions extends WordTokenOptions {
  readonly width?: number;
  readonly height?: number;
  readonly seed?: number;
  readonly padding?: number;
  readonly rotations?: readonly number[];
  readonly minimumFrequency?: number;
  readonly maximumWords?: number;
}

export interface WordCloudPlacement {
  readonly word: string;
  readonly frequency: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly rotation: number;
}

/** Deterministic bounded spiral word-cloud layout with collision padding and allowed rotations. */
export function layoutWordCloud(
  texts: readonly string[],
  options: WordCloudLayoutOptions = {},
): readonly WordCloudPlacement[] {
  const width = finite(options.width ?? 640, '$.width');
  const height = finite(options.height ?? 360, '$.height');
  if (width <= 0 || height <= 0)
    throw new GraflumeError('INVALID_SPEC', 'Word-cloud dimensions must be positive.');
  const padding = clamp(finite(options.padding ?? 2, '$.padding'), 0, 64);
  const rotations = options.rotations ?? [0];
  if (rotations.length === 0 || rotations.some((value) => !Number.isFinite(value)))
    throw new GraflumeError('INVALID_SPEC', '$.rotations must contain finite angles.');
  const frequencies = new Map<string, number>();
  texts.forEach((text) =>
    tokenizeWords(text, options).forEach((token) =>
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1),
    ),
  );
  const minimum = clamp(Math.floor(options.minimumFrequency ?? 1), 1, Number.MAX_SAFE_INTEGER);
  const maximumWords = clamp(Math.floor(options.maximumWords ?? 200), 1, 2_000);
  const words = [...frequencies]
    .filter(([, count]) => count >= minimum)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maximumWords);
  if (words.length === 0) return [];
  const maximum = words[0]![1];
  const minimumCount = words.at(-1)![1];
  const random = seededRandom(options.seed ?? 1);
  const spiralStep = Math.max(1.2, Math.min(width, height) / 90);
  const placements: WordCloudPlacement[] = [];
  const overlaps = (candidate: WordCloudPlacement) =>
    placements.some(
      (placed) =>
        Math.abs(candidate.x - placed.x) * 2 < candidate.width + placed.width + padding * 2 &&
        Math.abs(candidate.y - placed.y) * 2 < candidate.height + placed.height + padding * 2,
    );
  words.forEach(([word, frequency], wordIndex) => {
    const ratio =
      maximum === minimumCount ? 0.6 : (frequency - minimumCount) / (maximum - minimumCount);
    let fontSize = 12 + Math.sqrt(Math.max(0, ratio)) * 42;
    const rotation = rotations[Math.floor(random() * rotations.length)]!;
    const radians = (rotation * Math.PI) / 180;
    const cosine = Math.abs(Math.cos(radians));
    const sine = Math.abs(Math.sin(radians));
    for (let shrink = 0; shrink < 8; shrink += 1) {
      const textWidth = Math.max(fontSize * 0.6, word.length * fontSize * 0.58);
      const textHeight = fontSize * 1.15;
      const boxWidth = textWidth * cosine + textHeight * sine;
      const boxHeight = textWidth * sine + textHeight * cosine;
      for (let step = 0; step < 4_000; step += 1) {
        const angle = wordIndex * 0.37 + step * 0.31;
        const radius = spiralStep * Math.sqrt(step);
        const candidate: WordCloudPlacement = {
          word,
          frequency,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius * 0.62,
          width: boxWidth,
          height: boxHeight,
          fontSize,
          rotation,
        };
        const inside =
          candidate.x - boxWidth / 2 >= 0 &&
          candidate.x + boxWidth / 2 <= width &&
          candidate.y - boxHeight / 2 >= 0 &&
          candidate.y + boxHeight / 2 <= height;
        if (inside && !overlaps(candidate)) {
          placements.push(candidate);
          return;
        }
      }
      fontSize *= 0.88;
    }
  });
  return placements;
}
