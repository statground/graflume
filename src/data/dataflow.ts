import { GraflumeError } from '../core/errors.js';
import type {
  ChartSpec,
  DataInput,
  DataRow,
  NamedDataReference,
  TransformDataflowNodeSpec,
  TransformDataflowSpec,
  TransformSpec,
} from '../spec/types.js';
import type { SpecIssue } from '../spec/validate.js';
import { isPlainObject } from '../utils/object.js';
import { validateTransforms } from '../spec/transform-validation.js';
import {
  executeTransforms,
  type DataLineage,
  type TransformResult,
  type TransformStepLineage,
} from './transforms.js';

export type { NamedDataReference, TransformDataflowNodeSpec, TransformDataflowSpec };

export interface TransformDataflowState {
  readonly sourceCount: number;
  readonly nodeCount: number;
  readonly cachedOutputs: readonly string[];
  readonly executionOrder: readonly string[];
  readonly cacheHits: number;
}

export interface TransformDataflowExecution {
  readonly outputs: Readonly<Record<string, TransformResult>>;
  readonly state: TransformDataflowState;
}

const maximumNamedSources = 128;
const maximumDataflowNodes = 256;
const unsafeNames = new Set(['__proto__', 'prototype', 'constructor']);
const lineageByOutput = new WeakMap<object, DataLineage>();

function fail(message: string, path: string): never {
  throw new GraflumeError('INVALID_SPEC', message, { path });
}

function safeName(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    value.trim() === '' ||
    value.length > 128 ||
    unsafeNames.has(value)
  ) {
    fail('Dataflow names must be non-empty safe strings no longer than 128 characters.', path);
  }
  return value;
}

function cloneRows(input: readonly DataRow[]): readonly DataRow[] {
  return input.map((row) => ({ ...row }));
}

function remapLineage(upstream: DataLineage, branch: DataLineage, nodeId: string): DataLineage {
  const offset = upstream.transforms.length;
  const branchSteps: readonly TransformStepLineage[] = branch.transforms.map((step) => ({
    ...step,
    index: step.index + offset,
  }));
  const rowSources = branch.rowSources.map((indices) =>
    [...new Set(indices.flatMap((index) => upstream.rowSources[index] ?? []))].sort(
      (left, right) => left - right,
    ),
  );
  const transforms = [...upstream.transforms, ...branchSteps];
  return {
    sourceId: upstream.sourceId,
    sourceRows: upstream.sourceRows,
    outputRows: branch.outputRows,
    transforms,
    rowSources,
    summary: `${upstream.sourceId} -> ${nodeId}: ${upstream.sourceRows} source rows, ${transforms.length} ordered transforms, ${branch.outputRows} output rows.`,
  };
}

/** Preserve upstream source-row identity while applying a branch-local transform list. */
export function executeTransformBranch(
  upstream: TransformResult,
  transforms: readonly TransformSpec[],
  nodeId: string,
): TransformResult {
  const branch = executeTransforms(upstream.data, transforms, { sourceId: nodeId });
  const result = {
    data: cloneRows(branch.data),
    lineage: remapLineage(upstream.lineage, branch.lineage, nodeId),
  } as const;
  lineageByOutput.set(result.data as object, result.lineage);
  return result;
}

/** Execute a layer-local branch without discarding named-DAG provenance. */
export function executeTransformsWithNamedLineage(
  input: DataInput,
  transforms: readonly TransformSpec[],
  sourceId: string,
): TransformResult {
  const upstream = namedDataLineage(input);
  return upstream === undefined
    ? executeTransforms(input, transforms, { sourceId })
    : executeTransformBranch(
        { data: input as readonly DataRow[], lineage: upstream },
        transforms,
        sourceId,
      );
}

/** Return named-DAG lineage attached to a materialized data array, when present. */
export function namedDataLineage(input: DataInput): DataLineage | undefined {
  return lineageByOutput.get(input as object);
}

/** Execute one closed named transform graph with dependency memoization. */
export class TransformDataflow {
  readonly #sources: Readonly<Record<string, DataInput>>;
  readonly #nodes: ReadonlyMap<string, TransformDataflowNodeSpec>;
  readonly #cache = new Map<string, TransformResult>();
  readonly #executionOrder: string[] = [];
  #cacheHits = 0;

  constructor(spec: TransformDataflowSpec) {
    if (!isPlainObject(spec)) fail('Dataflow must be an object.', '$.dataflow');
    if (Object.keys(spec).some((key) => !['sources', 'nodes'].includes(key))) {
      fail('Unknown dataflow property.', '$.dataflow');
    }
    if (!isPlainObject(spec.sources)) {
      fail('Dataflow sources must be an object.', '$.dataflow.sources');
    }
    const sourceNames = Object.keys(spec.sources);
    if (sourceNames.length === 0 || sourceNames.length > maximumNamedSources) {
      fail(`Dataflow requires 1 to ${maximumNamedSources} named sources.`, '$.dataflow.sources');
    }
    for (const name of sourceNames) safeName(name, `$.dataflow.sources.${name}`);
    const nodes = spec.nodes ?? [];
    if (!Array.isArray(nodes) || nodes.length > maximumDataflowNodes) {
      fail(`Dataflow supports at most ${maximumDataflowNodes} nodes.`, '$.dataflow.nodes');
    }
    const byId = new Map<string, TransformDataflowNodeSpec>();
    nodes.forEach((node, index) => {
      if (!isPlainObject(node))
        fail('Dataflow node must be an object.', `$.dataflow.nodes[${index}]`);
      const id = safeName(node.id, `$.dataflow.nodes[${index}].id`);
      safeName(node.source, `$.dataflow.nodes[${index}].source`);
      if (Object.keys(node).some((key) => !['id', 'source', 'transform'].includes(key))) {
        fail('Unknown dataflow node property.', `$.dataflow.nodes[${index}]`);
      }
      if (!Array.isArray(node.transform)) {
        fail('Dataflow node transform must be an array.', `$.dataflow.nodes[${index}].transform`);
      }
      if (Object.hasOwn(spec.sources, id) || byId.has(id)) {
        fail(`Duplicate dataflow name "${id}".`, `$.dataflow.nodes[${index}].id`);
      }
      // Reuse the established transform validator and fail before any graph result is cached.
      const transformIssues: SpecIssue[] = [];
      validateTransforms(node.transform, `$.dataflow.nodes[${index}].transform`, transformIssues);
      if (transformIssues.length > 0) {
        const first = transformIssues[0]!;
        throw new GraflumeError('INVALID_SPEC', first.message, {
          path: first.path,
          details: { issues: transformIssues },
        });
      }
      byId.set(id, node as unknown as TransformDataflowNodeSpec);
    });
    this.#sources = spec.sources;
    this.#nodes = byId;
    this.#assertAcyclicAndClosed();
  }

  #assertAcyclicAndClosed(): void {
    const visited = new Set<string>();
    const active = new Set<string>();
    const visit = (name: string): void => {
      if (Object.hasOwn(this.#sources, name) || visited.has(name)) return;
      const node = this.#nodes.get(name);
      if (node === undefined)
        fail(`Unknown dataflow source or node "${name}".`, '$.dataflow.nodes');
      if (active.has(name)) fail(`Dataflow contains a cycle at "${name}".`, '$.dataflow.nodes');
      active.add(name);
      visit(node.source);
      active.delete(name);
      visited.add(name);
    };
    for (const name of this.#nodes.keys()) visit(name);
  }

  resolve(name: string): TransformResult {
    safeName(name, '$.data.source');
    const cached = this.#cache.get(name);
    if (cached !== undefined) {
      this.#cacheHits += 1;
      return cached;
    }
    let result: TransformResult;
    if (Object.hasOwn(this.#sources, name)) {
      result = executeTransforms(this.#sources[name]!, [], { sourceId: `source:${name}` });
      result = { data: cloneRows(result.data), lineage: result.lineage };
    } else {
      const node = this.#nodes.get(name);
      if (node === undefined) fail(`Unknown dataflow source or node "${name}".`, '$.data.source');
      result = executeTransformBranch(this.resolve(node.source), node.transform, `node:${node.id}`);
    }
    this.#cache.set(name, result);
    this.#executionOrder.push(name);
    lineageByOutput.set(result.data as object, result.lineage);
    return result;
  }

  execute(targets: readonly string[] = [...this.#nodes.keys()]): TransformDataflowExecution {
    const requested = targets.length === 0 ? Object.keys(this.#sources) : targets;
    const outputs = Object.fromEntries(requested.map((name) => [name, this.resolve(name)]));
    return { outputs, state: this.state() };
  }

  state(): TransformDataflowState {
    return {
      sourceCount: Object.keys(this.#sources).length,
      nodeCount: this.#nodes.size,
      cachedOutputs: [...this.#cache.keys()],
      executionOrder: [...this.#executionOrder],
      cacheHits: this.#cacheHits,
    };
  }

  clearCache(): void {
    this.#cache.clear();
    this.#executionOrder.length = 0;
    this.#cacheHits = 0;
  }
}

export function createTransformDataflow(spec: TransformDataflowSpec): TransformDataflow {
  return new TransformDataflow(spec);
}

export function executeTransformDataflow(
  spec: TransformDataflowSpec,
  targets?: readonly string[],
): TransformDataflowExecution {
  return createTransformDataflow(spec).execute(targets);
}

export function isNamedDataReference(value: unknown): value is NamedDataReference {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === 1 &&
    typeof value.source === 'string' &&
    value.source.trim() !== ''
  );
}

/**
 * Resolve all named data references before ordinary ChartSpec normalization.
 * One graph instance is shared by every branch in the chart tree, so common
 * ancestors execute once even when several layers or views consume them.
 */
export function materializeSpecDataflow(input: ChartSpec): ChartSpec {
  const containsDataflow = (spec: ChartSpec): boolean => {
    if (!isPlainObject(spec)) return false;
    const chart = spec as unknown as ChartSpec;
    return (
      (chart as ChartSpec & { readonly dataflow?: TransformDataflowSpec }).dataflow !== undefined ||
      ['layer', 'hconcat', 'vconcat', 'concat'].some((key) =>
        (
          (chart as unknown as Record<string, unknown>)[key] as readonly ChartSpec[] | undefined
        )?.some(containsDataflow),
      ) ||
      (chart.spec !== undefined && containsDataflow(chart.spec)) ||
      (chart.inset !== undefined &&
        (containsDataflow(chart.inset.base) || containsDataflow(chart.inset.view)))
    );
  };
  if (!containsDataflow(input)) return input;
  const visit = (spec: ChartSpec, inherited?: TransformDataflow): ChartSpec => {
    const localSpec = (spec as ChartSpec & { readonly dataflow?: TransformDataflowSpec }).dataflow;
    const graph = localSpec === undefined ? inherited : createTransformDataflow(localSpec);
    const resolveData = (value: unknown): DataInput | undefined => {
      if (value === undefined) return undefined;
      if (!isNamedDataReference(value)) return value as DataInput;
      if (graph === undefined) {
        fail(`Named data reference "${value.source}" has no enclosing dataflow.`, '$.data.source');
      }
      return graph.resolve(value.source).data;
    };
    const output = { ...spec } as Record<string, unknown>;
    delete output.dataflow;
    delete output.source;
    if (spec.source !== undefined) {
      if (spec.data !== undefined)
        fail('Use either inline data or a named source, not both.', '$.source');
      if (graph === undefined)
        fail(`Named source "${spec.source}" has no enclosing dataflow.`, '$.source');
      output.data = graph.resolve(spec.source).data;
    } else if (spec.data !== undefined) output.data = resolveData(spec.data);
    if (spec.layers !== undefined) {
      output.layers = spec.layers.map((layer) => {
        const materialized = { ...layer } as Record<string, unknown>;
        delete materialized.source;
        if (layer.source !== undefined) {
          if (layer.data !== undefined) {
            fail('Use either inline layer data or a named source, not both.', '$.layers[].source');
          }
          if (graph === undefined) {
            fail(`Named source "${layer.source}" has no enclosing dataflow.`, '$.layers[].source');
          }
          materialized.data = graph.resolve(layer.source).data;
        } else if (layer.data !== undefined) materialized.data = resolveData(layer.data);
        return materialized;
      });
    }
    for (const key of ['layer', 'hconcat', 'vconcat', 'concat'] as const) {
      const children = spec[key];
      if (children !== undefined) output[key] = children.map((child) => visit(child, graph));
    }
    if (spec.spec !== undefined) output.spec = visit(spec.spec, graph);
    if (spec.inset !== undefined) {
      output.inset = {
        ...spec.inset,
        base: visit(spec.inset.base, graph),
        view: visit(spec.inset.view, graph),
      };
    }
    return output as ChartSpec;
  };
  return visit(input);
}
