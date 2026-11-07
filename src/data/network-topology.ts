import { GraflumeError } from '../core/errors.js';
import type { DataRow, MarkSpec } from '../spec/types.js';
import type { NetworkEdgeInput, NetworkNodeInput } from './network-analytics.js';

export type NetworkTopology =
  | 'collapse'
  | 'line'
  | 'star'
  | 'pseudo-loop'
  | 'diamond'
  | 'rhombus'
  | 'ring'
  | 'wheel'
  | 'balanced-tree'
  | 'grid'
  | 'complete'
  | 'bipartite'
  | 'small-world'
  | 'random';

export type NetworkTopologyRole = 'source' | 'relay' | 'sink' | 'isolated';

export interface NetworkTopologyDescriptor {
  readonly id: NetworkTopology;
  readonly label: string;
  readonly minNodes: number;
  readonly maxNodes: number;
  readonly description: string;
  readonly directed: boolean;
}

/** Synthetic graph structures, independent of the network rendering/layout modes. */
export const networkTopologyCatalog: readonly NetworkTopologyDescriptor[] = Object.freeze(
  (
    [
      ['collapse', 'Collapse', 3, 200, 'Peripheral sources converge on one sink.', true],
      ['line', 'Line', 3, 200, 'A single open path arranged on three sides of a rectangle.', true],
      ['star', 'Star', 3, 200, 'One central source fans out to peripheral sinks.', true],
      [
        'pseudo-loop',
        'Pseudo Loop',
        3,
        200,
        'An open rectangular path and a direct source-to-sink shortcut.',
        true,
      ],
      [
        'diamond',
        'Diamond',
        4,
        200,
        'Source and sink surround a linked belt of relay nodes.',
        true,
      ],
      [
        'rhombus',
        'Rhombus',
        4,
        200,
        'Independent parallel relay paths join a source and sink.',
        true,
      ],
      ['ring', 'Ring', 3, 200, 'A closed cycle arranged on a circle.', false],
      ['wheel', 'Wheel', 4, 200, 'A circular rim with one hub connected to every rim node.', false],
      [
        'balanced-tree',
        'Balanced tree',
        3,
        200,
        'A breadth-first binary tree with layered positions.',
        true,
      ],
      [
        'grid',
        'Grid',
        3,
        200,
        'A near-square lattice with horizontal and vertical neighbors.',
        false,
      ],
      [
        'complete',
        'Complete',
        3,
        64,
        'Every pair is connected once; directed edges follow node order.',
        false,
      ],
      [
        'bipartite',
        'Bipartite',
        3,
        128,
        'Every node in the left partition connects to every node on the right.',
        true,
      ],
      ['small-world', 'Small world', 5, 200, 'A ring lattice with seeded shortcut edges.', false],
      [
        'random',
        'Random',
        3,
        90,
        'A seeded independent-edge graph; isolated nodes are retained.',
        false,
      ],
    ] as const
  ).map(([id, label, minNodes, maxNodes, description, directed]) =>
    Object.freeze({ id, label, minNodes, maxNodes, description, directed }),
  ),
);

export interface NetworkTopologyOptions {
  readonly topology: NetworkTopology;
  readonly nodeCount?: number;
  /** Defaults to the topology catalog value. Each pair still has only one edge. */
  readonly directed?: boolean;
  /** Unsigned 32-bit integer; used only by random and small-world. Defaults to 1. */
  readonly seed?: number;
  /** Independent edge/shortcut probability in [0, 1]. Defaults to 0.2. */
  readonly edgeProbability?: number;
}

export interface NetworkTopologyNode extends NetworkNodeInput {
  readonly label: string;
  readonly role: NetworkTopologyRole;
  readonly x: number;
  readonly y: number;
  readonly pinned: true;
}

export interface NetworkTopologyResult {
  readonly topology: NetworkTopology;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly nodes: readonly NetworkTopologyNode[];
  readonly edges: readonly NetworkEdgeInput[];
  /** Mixed explicit node and edge rows, including isolated nodes. */
  readonly data: readonly DataRow[];
  /** Pass to network() with data to preserve the preset geometry and roles. */
  readonly mark: MarkSpec;
}

function invalid(message: string): never {
  throw new GraflumeError('INVALID_DATA', message);
}

/** Generate bounded, deterministic, JSON-portable synthetic network data. */
export function generateNetworkTopology(options: NetworkTopologyOptions): NetworkTopologyResult {
  if (options === null || typeof options !== 'object') invalid('Topology options are required.');
  const descriptor = networkTopologyCatalog.find(({ id }) => id === options.topology);
  if (descriptor === undefined) invalid(`Unknown network topology "${String(options.topology)}".`);
  const count =
    options.nodeCount === undefined ? Math.max(8, descriptor.minNodes) : options.nodeCount;
  if (!Number.isInteger(count) || count < descriptor.minNodes || count > descriptor.maxNodes) {
    invalid(
      `${descriptor.label} nodeCount must be an integer in [${descriptor.minNodes}, ${descriptor.maxNodes}].`,
    );
  }
  if (options.directed !== undefined && typeof options.directed !== 'boolean') {
    invalid('Topology directed must be a boolean.');
  }
  const directed = options.directed ?? descriptor.directed;
  const seed = options.seed === undefined ? 1 : options.seed;
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
    invalid('Topology seed must be an unsigned 32-bit integer.');
  }
  const probability = options.edgeProbability === undefined ? 0.2 : options.edgeProbability;
  if (
    typeof probability !== 'number' ||
    !Number.isFinite(probability) ||
    probability < 0 ||
    probability > 1
  ) {
    invalid('Topology edgeProbability must be in [0, 1].');
  }
  let state = seed >>> 0;
  const random = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
  const positions = Array.from({ length: count }, () => ({ x: 0.5, y: 0.5 }));
  const pairs: [number, number][] = [];
  const pairSet = new Set<string>();
  const connect = (source: number, target: number): void => {
    const key = `${Math.min(source, target)}:${Math.max(source, target)}`;
    if (source === target || pairSet.has(key)) return;
    pairSet.add(key);
    pairs.push([source, target]);
  };
  const spread = (index: number, size: number): number =>
    size <= 1 ? 0.5 : 0.12 + (index / (size - 1)) * 0.76;
  const circle = (start: number): void => {
    const size = count - start;
    for (let index = start; index < count; index += 1) {
      const angle = ((index - start) / size) * Math.PI * 2 - Math.PI / 2;
      positions[index] = { x: 0.5 + Math.cos(angle) * 0.38, y: 0.5 + Math.sin(angle) * 0.38 };
    }
  };
  const rectanglePath = (): void => {
    // Keep each elbow as an actual node so path edges cannot cut across the motif.
    const segments = [0, 0, 0];
    for (let index = 0; index < count - 1; index += 1) segments[index % 3]! += 1;
    positions[0] = { x: 0.18, y: 0.12 };
    let node = 1;
    for (let side = 0; side < 3; side += 1) {
      for (let step = 1; step <= segments[side]!; step += 1) {
        const t = step / segments[side]!;
        positions[node++] =
          side === 0
            ? { x: 0.18, y: 0.12 + t * 0.76 }
            : side === 1
              ? { x: 0.18 + t * 0.64, y: 0.88 }
              : { x: 0.82, y: 0.88 - t * 0.76 };
      }
    }
  };

  switch (options.topology) {
    case 'collapse':
    case 'star': {
      if (count <= 4) {
        const corners =
          options.topology === 'collapse'
            ? [
                { x: 0.8, y: 0.8 },
                { x: 0.2, y: 0.2 },
                { x: 0.2, y: 0.8 },
                { x: 0.8, y: 0.2 },
              ]
            : [
                { x: 0.2, y: 0.2 },
                { x: 0.2, y: 0.8 },
                { x: 0.8, y: 0.8 },
                { x: 0.8, y: 0.2 },
              ];
        corners.slice(0, count).forEach((point, index) => {
          positions[index] = point;
        });
        for (let index = 1; index < count; index += 1) {
          if (options.topology === 'collapse') connect(index, 0);
          else connect(0, index);
        }
        break;
      }
      const leftCount = Math.ceil((count - 1) / 2);
      for (let index = 1; index < count; index += 1) {
        const left = index <= leftCount;
        positions[index] = {
          x: left ? 0.12 : 0.88,
          y: spread(
            left ? index - 1 : index - leftCount - 1,
            left ? leftCount : count - leftCount - 1,
          ),
        };
        if (options.topology === 'collapse') connect(index, 0);
        else connect(0, index);
      }
      break;
    }
    case 'line':
    case 'pseudo-loop':
      rectanglePath();
      for (let index = 1; index < count; index += 1) connect(index - 1, index);
      if (options.topology === 'pseudo-loop') connect(0, count - 1);
      break;
    case 'diamond':
    case 'rhombus':
      positions[0] = { x: 0.5, y: 0.1 };
      positions[count - 1] = { x: 0.5, y: 0.9 };
      for (let index = 1; index < count - 1; index += 1) {
        positions[index] = { x: spread(index - 1, count - 2), y: 0.5 };
        connect(0, index);
        connect(index, count - 1);
        if (options.topology === 'diamond' && index > 1) connect(index - 1, index);
      }
      break;
    case 'ring':
    case 'wheel':
    case 'small-world': {
      const start = options.topology === 'wheel' ? 1 : 0;
      circle(start);
      for (let index = start; index < count; index += 1) {
        connect(index, index + 1 < count ? index + 1 : start);
        if (start === 1) connect(0, index);
        if (options.topology === 'small-world') connect(index, (index + 2) % count);
      }
      if (options.topology === 'small-world') {
        for (let source = 0; source < count; source += 1) {
          if (random() < probability) connect(source, Math.floor(random() * count));
        }
      }
      break;
    }
    case 'balanced-tree': {
      const depth = Math.floor(Math.log2(count));
      for (let index = 0; index < count; index += 1) {
        const level = Math.floor(Math.log2(index + 1));
        const first = 2 ** level - 1;
        const width = 2 ** level;
        positions[index] = {
          x: 0.12 + ((index - first + 0.5) / width) * 0.76,
          y: 0.12 + (level / depth) * 0.76,
        };
        if (index > 0) connect(Math.floor((index - 1) / 2), index);
      }
      break;
    }
    case 'grid': {
      const columns = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / columns);
      for (let index = 0; index < count; index += 1) {
        const column = index % columns;
        positions[index] = {
          x: spread(column, columns),
          y: spread(Math.floor(index / columns), rows),
        };
        if (column > 0) connect(index - 1, index);
        if (index >= columns) connect(index - columns, index);
      }
      break;
    }
    case 'bipartite': {
      const leftCount = Math.ceil(count / 2);
      for (let index = 0; index < count; index += 1) {
        const left = index < leftCount;
        positions[index] = {
          x: left ? 0.15 : 0.85,
          y: spread(left ? index : index - leftCount, left ? leftCount : count - leftCount),
        };
      }
      for (let source = 0; source < leftCount; source += 1) {
        for (let target = leftCount; target < count; target += 1) connect(source, target);
      }
      break;
    }
    case 'complete':
    case 'random':
      circle(0);
      for (let source = 0; source < count; source += 1) {
        for (let target = source + 1; target < count; target += 1) {
          if (options.topology === 'complete' || random() < probability) connect(source, target);
        }
      }
      break;
  }

  const incoming = new Uint32Array(count);
  const outgoing = new Uint32Array(count);
  const edges = pairs.map(([source, target], index): NetworkEdgeInput => {
    outgoing[source]! += 1;
    incoming[target]! += 1;
    if (!directed) {
      incoming[source]! += 1;
      outgoing[target]! += 1;
    }
    return {
      id: `e${index + 1}`,
      source: `n${source + 1}`,
      target: `n${target + 1}`,
      weight: 1,
      directed,
    };
  });
  const nodes = positions.map(({ x, y }, index): NetworkTopologyNode => {
    const role: NetworkTopologyRole =
      incoming[index] === 0 && outgoing[index] === 0
        ? 'isolated'
        : incoming[index] === 0
          ? 'source'
          : outgoing[index] === 0
            ? 'sink'
            : 'relay';
    return { id: `n${index + 1}`, label: `N${index + 1}`, role, group: role, x, y, pinned: true };
  });
  const data: DataRow[] = [
    ...nodes.map((node) => ({
      node: node.id,
      source: null,
      target: null,
      label: node.label,
      role: node.role,
      nodeX: node.x,
      nodeY: node.y,
      pinned: true,
      value: 1,
      topology: options.topology,
      synthetic: true,
    })),
    ...edges.map((edge) => ({
      id: edge.id!,
      source: edge.source,
      target: edge.target,
      value: edge.weight!,
      directed,
      topology: options.topology,
      synthetic: true,
    })),
  ];
  return {
    topology: options.topology,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    data,
    mark: {
      type: 'graph',
      fields: {
        source: 'source',
        target: 'target',
        node: 'node',
        label: 'label',
        group: 'role',
        nodeX: 'nodeX',
        nodeY: 'nodeY',
        pinned: 'pinned',
        edgeId: 'id',
        weight: 'value',
        directed: 'directed',
      },
      options: { layout: 'force', routing: 'straight', directed },
    },
  };
}
