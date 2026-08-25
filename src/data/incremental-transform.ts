import { GraflumeError } from '../core/errors.js';
import type {
  DataInput,
  DataRow,
  DataValue,
  JsonValue,
  StreamingSpec,
  TransformSpec,
} from '../spec/types.js';
import { isPlainObject, ownValue } from '../utils/object.js';
import {
  IncrementalDataStore,
  type IncrementalUpdate,
  type IncrementalUpdateResult,
} from './incremental.js';
import { executeTransforms, type DataLineage, type TransformResult } from './transforms.js';

export interface IncrementalTransformOptions {
  readonly streaming: StreamingSpec;
  readonly maxTransforms?: number;
}

export interface IncrementalTransformStep {
  readonly sequence: number;
  readonly mode: 'incremental' | 'full';
  readonly inputRows: number;
  readonly outputRows: number;
  readonly recomputedRows: number;
  readonly reusedRows: number;
  readonly removedRows: number;
  readonly reason: 'row-local' | 'global-transform' | 'transform-change' | 'initial';
}

export interface IncrementalTransformState {
  readonly version: 1;
  readonly sequence: number;
  readonly rowLocal: boolean;
  readonly inputRows: number;
  readonly outputRows: number;
  readonly recomputedRows: number;
  readonly reusedRows: number;
  readonly fullRecomputations: number;
  readonly incrementalRecomputations: number;
  readonly last: IncrementalTransformStep;
}

export interface IncrementalTransformUpdateResult extends IncrementalUpdateResult {
  readonly transformed: TransformResult;
  readonly transformState: IncrementalTransformState;
}

interface RowCacheEntry {
  readonly fingerprint: string;
  readonly rows: readonly DataRow[];
}

const localTransformTypes = new Set<TransformSpec['type']>(['filter', 'calculate']);

function boundedTransforms(value: number | undefined): number {
  const resolved = value ?? 128;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > 128) {
    throw new GraflumeError(
      'INVALID_SPEC',
      '$.incrementalTransform.maxTransforms must be an integer from 1 to 128.',
    );
  }
  return resolved;
}

function portableTransforms(
  transforms: readonly TransformSpec[],
  maximum: number,
): readonly TransformSpec[] {
  if (transforms.length > maximum) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `Incremental transform pipeline has ${transforms.length} stages; the deterministic limit is ${maximum}.`,
    );
  }
  try {
    return structuredClone(transforms) as readonly TransformSpec[];
  } catch (error) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Incremental transforms must be structured-clone portable; functions are unsupported.',
      { cause: error },
    );
  }
}

function stableKey(value: DataValue, path: string): string {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return `date:${value.toISOString()}`;
  if (typeof value === 'number' && Number.isFinite(value)) return `number:${value}`;
  if (typeof value === 'string' && value !== '') return `string:${value}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  throw new GraflumeError(
    'INVALID_DATA',
    'Incremental transform keys must be non-empty strings, finite numbers, booleans, or valid Dates.',
    { path },
  );
}

function canonical(value: unknown): string {
  if (value instanceof Date) return `{"$date":${JSON.stringify(value.toISOString())}}`;
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function cloneRows(rows: readonly DataRow[]): readonly DataRow[] {
  return structuredClone(rows) as readonly DataRow[];
}

function portableParameters(transform: TransformSpec): JsonValue {
  return structuredClone(transform) as unknown as JsonValue;
}

function rowLocalLineage(
  inputRows: number,
  rows: readonly DataRow[],
  rowSources: readonly (readonly number[])[],
  transforms: readonly TransformSpec[],
  step: IncrementalTransformStep,
): DataLineage {
  return {
    sourceId: 'incremental-stream',
    sourceRows: inputRows,
    outputRows: rows.length,
    transforms: transforms.map((transform, index) => ({
      index,
      type: transform.type,
      inputRows,
      outputRows: rows.length,
      parameters: portableParameters(transform),
      detail: `Incremental cache: ${step.recomputedRows} recomputed, ${step.reusedRows} reused.`,
    })),
    rowSources,
    summary: `Incremental row-local transform cache recomputed ${step.recomputedRows} of ${inputRows} retained rows.`,
  };
}

/**
 * Stable-key transform cache.
 *
 * Function-free `filter`/`calculate` pipelines only recompute changed rows.
 * Order-dependent or aggregate stages use an explicit bounded full fallback,
 * preserving exact `executeTransforms` semantics.
 */
export class IncrementalTransformPipeline {
  readonly #store: IncrementalDataStore;
  readonly #key: string;
  readonly #maxTransforms: number;
  #transforms: readonly TransformSpec[];
  #transformFingerprint: string;
  #cache = new Map<string, RowCacheEntry>();
  #result: TransformResult;
  #sequence = 0;
  #recomputedRows = 0;
  #reusedRows = 0;
  #fullRecomputations = 0;
  #incrementalRecomputations = 0;
  #last: IncrementalTransformStep;

  constructor(
    input: DataInput,
    transforms: readonly TransformSpec[],
    options: IncrementalTransformOptions,
  ) {
    this.#maxTransforms = boundedTransforms(options.maxTransforms);
    this.#transforms = portableTransforms(transforms, this.#maxTransforms);
    this.#transformFingerprint = canonical(this.#transforms);
    this.#key = options.streaming.key;
    this.#store = new IncrementalDataStore(input, options.streaming);
    const initialRows = this.#store.rows();
    this.#result = executeTransforms(initialRows, this.#transforms);
    this.#fullRecomputations = 1;
    this.#recomputedRows = initialRows.length;
    this.#last = {
      sequence: 0,
      mode: 'full',
      inputRows: initialRows.length,
      outputRows: this.#result.data.length,
      recomputedRows: initialRows.length,
      reusedRows: 0,
      removedRows: 0,
      reason: 'initial',
    };
    if (this.#isRowLocal()) this.#rebuildLocalCache(initialRows);
  }

  apply(update: IncrementalUpdate): IncrementalTransformUpdateResult {
    const previousKeys = new Set(this.#cache.keys());
    const applied = this.#store.apply(update);
    const nextRows = applied.rows;
    const changed: { readonly key: string; readonly row: DataRow; readonly sourceIndex: number }[] =
      [];
    let reusedRows = 0;
    if (this.#isRowLocal()) {
      nextRows.forEach((row, sourceIndex) => {
        const key = this.#rowKey(row, `$.data[${sourceIndex}].${this.#key}`);
        previousKeys.delete(key);
        const fingerprint = canonical(row);
        if (this.#cache.get(key)?.fingerprint === fingerprint) reusedRows += 1;
        else changed.push({ key, row, sourceIndex });
      });
      for (const removed of previousKeys) this.#cache.delete(removed);
      if (changed.length > 0) {
        const transformed = executeTransforms(
          changed.map(({ row }) => row),
          this.#transforms,
        );
        const byChangedIndex = new Map<number, DataRow[]>();
        transformed.data.forEach((row, outputIndex) => {
          for (const changedIndex of transformed.lineage.rowSources[outputIndex] ?? []) {
            const list = byChangedIndex.get(changedIndex) ?? [];
            list.push(row);
            byChangedIndex.set(changedIndex, list);
          }
        });
        changed.forEach((entry, changedIndex) => {
          this.#cache.set(entry.key, {
            fingerprint: canonical(entry.row),
            rows: cloneRows(byChangedIndex.get(changedIndex) ?? []),
          });
        });
      }
      const output: DataRow[] = [];
      const sources: number[][] = [];
      nextRows.forEach((row, sourceIndex) => {
        const entry = this.#cache.get(this.#rowKey(row, `$.data[${sourceIndex}].${this.#key}`));
        for (const transformed of entry?.rows ?? []) {
          output.push(structuredClone(transformed) as DataRow);
          sources.push([sourceIndex]);
        }
      });
      this.#sequence += 1;
      const step: IncrementalTransformStep = {
        sequence: this.#sequence,
        mode: 'incremental',
        inputRows: nextRows.length,
        outputRows: output.length,
        recomputedRows: changed.length,
        reusedRows,
        removedRows: previousKeys.size,
        reason: 'row-local',
      };
      this.#result = {
        data: output,
        lineage: rowLocalLineage(nextRows.length, output, sources, this.#transforms, step),
      };
      this.#incrementalRecomputations += 1;
      this.#recomputedRows += changed.length;
      this.#reusedRows += reusedRows;
      this.#last = step;
    } else {
      this.#full(nextRows, 'global-transform');
    }
    return {
      ...applied,
      transformed: this.result(),
      transformState: this.state(),
    };
  }

  setTransforms(transforms: readonly TransformSpec[]): TransformResult {
    const next = portableTransforms(transforms, this.#maxTransforms);
    const fingerprint = canonical(next);
    if (fingerprint === this.#transformFingerprint) return this.result();
    this.#transforms = next;
    this.#transformFingerprint = fingerprint;
    this.#cache.clear();
    this.#full(this.#store.rows(), 'transform-change');
    if (this.#isRowLocal()) this.#rebuildLocalCache(this.#store.rows());
    return this.result();
  }

  rows(): readonly DataRow[] {
    return this.#store.rows();
  }

  result(): TransformResult {
    return {
      data: cloneRows(this.#result.data),
      lineage: structuredClone(this.#result.lineage) as DataLineage,
    };
  }

  state(): IncrementalTransformState {
    return {
      version: 1,
      sequence: this.#sequence,
      rowLocal: this.#isRowLocal(),
      inputRows: this.#last.inputRows,
      outputRows: this.#last.outputRows,
      recomputedRows: this.#recomputedRows,
      reusedRows: this.#reusedRows,
      fullRecomputations: this.#fullRecomputations,
      incrementalRecomputations: this.#incrementalRecomputations,
      last: { ...this.#last },
    };
  }

  #full(rows: readonly DataRow[], reason: IncrementalTransformStep['reason']): void {
    this.#result = executeTransforms(rows, this.#transforms);
    this.#sequence += 1;
    this.#fullRecomputations += 1;
    this.#recomputedRows += rows.length;
    this.#last = {
      sequence: this.#sequence,
      mode: 'full',
      inputRows: rows.length,
      outputRows: this.#result.data.length,
      recomputedRows: rows.length,
      reusedRows: 0,
      removedRows: 0,
      reason,
    };
  }

  #rebuildLocalCache(rows: readonly DataRow[]): void {
    this.#cache.clear();
    rows.forEach((row, index) => {
      const result = executeTransforms([row], this.#transforms);
      this.#cache.set(this.#rowKey(row, `$.data[${index}].${this.#key}`), {
        fingerprint: canonical(row),
        rows: cloneRows(result.data),
      });
    });
  }

  #rowKey(row: DataRow, path: string): string {
    return stableKey(ownValue(row, this.#key) as DataValue, path);
  }

  #isRowLocal(): boolean {
    return this.#transforms.every(({ type }) => localTransformTypes.has(type));
  }
}

export function createIncrementalTransformPipeline(
  input: DataInput,
  transforms: readonly TransformSpec[],
  options: IncrementalTransformOptions,
): IncrementalTransformPipeline {
  return new IncrementalTransformPipeline(input, transforms, options);
}

export type StackTransformSpec = Extract<TransformSpec, { readonly type: 'stack' }>;

export type IncrementalStackReason =
  | 'initial'
  | 'affected-groups'
  | 'unchanged'
  | 'global-order'
  | 'global-wiggle'
  | 'series-order-change'
  | 'transform-change';

export interface IncrementalStackStep {
  readonly sequence: number;
  readonly mode: 'incremental' | 'full';
  readonly reason: IncrementalStackReason;
  readonly inputRows: number;
  readonly outputRows: number;
  readonly changedRows: number;
  readonly removedRows: number;
  readonly recomputedRows: number;
  readonly reusedRows: number;
  readonly recomputedGroups: readonly string[];
  readonly reusedGroups: readonly string[];
  readonly changedKeys: readonly string[];
}

export interface IncrementalStackState {
  readonly version: 1;
  readonly portable: true;
  readonly sequence: number;
  readonly inputRows: number;
  readonly outputRows: number;
  readonly groupCount: number;
  readonly fullRecomputations: number;
  readonly incrementalRecomputations: number;
  readonly recomputedRows: number;
  readonly reusedRows: number;
  readonly last: IncrementalStackStep;
}

export interface IncrementalStackGroupSnapshot {
  readonly key: string;
  readonly output: readonly DataRow[];
  /** Stable input identities for each output row's exact lineage. */
  readonly outputSourceKeys: readonly (readonly string[])[];
}

/**
 * Structured-cloneable state passed between the main thread and protocol-v2
 * Workers. The retained input is bounded by `maxRows`; no closures or Maps are
 * serialized.
 */
export interface IncrementalStackSnapshot {
  readonly version: 1;
  readonly key: string;
  readonly maxRows: number;
  readonly transform: StackTransformSpec;
  readonly transformFingerprint: string;
  readonly seriesOrder: readonly string[];
  readonly input: readonly DataRow[];
  readonly groups: readonly IncrementalStackGroupSnapshot[];
  readonly state: IncrementalStackState;
}

export interface PortableIncrementalStackRequest {
  readonly key: string;
  readonly maxRows?: number;
  readonly input: readonly DataRow[];
  readonly transform: StackTransformSpec;
  readonly previous?: IncrementalStackSnapshot;
}

export interface PortableIncrementalStackResult {
  readonly transformed: TransformResult;
  readonly snapshot: IncrementalStackSnapshot;
  readonly state: IncrementalStackState;
}

export interface IncrementalStackOptions extends IncrementalTransformOptions {
  /** Worker and synchronous retained-input ceiling. Defaults to retention.maxRows or 100,000. */
  readonly maxRows?: number;
}

export interface IncrementalStackUpdateResult extends IncrementalUpdateResult {
  readonly transformed: TransformResult;
  readonly stackSnapshot: IncrementalStackSnapshot;
  readonly stackState: IncrementalStackState;
}

interface StackInputGroup {
  readonly key: string;
  readonly rows: readonly DataRow[];
  readonly sourceKeys: readonly string[];
}

const incrementalStackMaximumRows = 1_000_000;

function boundedStackRows(value: number | undefined): number {
  const resolved = value ?? 100_000;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > incrementalStackMaximumRows) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `Incremental stack maxRows must be an integer from 1 to ${incrementalStackMaximumRows}.`,
      { path: '$.incrementalStack.maxRows' },
    );
  }
  return resolved;
}

function portableStackTransform(transform: StackTransformSpec): StackTransformSpec {
  if (!isPlainObject(transform) || transform.type !== 'stack') {
    throw new GraflumeError('INVALID_SPEC', 'Incremental stack requires one stack transform.');
  }
  let portable: StackTransformSpec;
  try {
    portable = structuredClone(transform) as StackTransformSpec;
  } catch (error) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Incremental stack transforms must be structured-clone portable.',
      { cause: error },
    );
  }
  // The shared closed transform validator remains the source of truth. Empty
  // input validates structure without performing data-dependent work.
  executeTransforms([], [portable]);
  return portable;
}

function validateIncrementalStackRequest(
  request: PortableIncrementalStackRequest,
  maxRows: number,
): void {
  if (!Array.isArray(request.input)) {
    throw new GraflumeError('INVALID_DATA', '$.incrementalStack.input must be a row array.');
  }
  if (typeof request.key !== 'string' || request.key.trim() === '') {
    throw new GraflumeError(
      'INVALID_SPEC',
      '$.incrementalStack.key must be a non-empty field name.',
    );
  }
  ownValue(Object.create(null) as DataRow, request.key);
  const previous = request.previous;
  if (previous === undefined) return;
  if (
    previous.version !== 1 ||
    previous.state.version !== 1 ||
    previous.state.portable !== true ||
    !Array.isArray(previous.input) ||
    !Array.isArray(previous.groups) ||
    !Array.isArray(previous.seriesOrder)
  ) {
    throw new GraflumeError('INVALID_DATA', 'Incremental stack snapshot is malformed.');
  }
  const previousMaximum = boundedStackRows(previous.maxRows);
  if (previous.input.length > previousMaximum || previous.input.length > maxRows) {
    throw new GraflumeError('INVALID_DATA', 'Incremental stack snapshot exceeds maxRows.');
  }
  if (canonical(previous.transform) !== previous.transformFingerprint) {
    throw new GraflumeError(
      'INVALID_DATA',
      'Incremental stack snapshot transform fingerprint is invalid.',
    );
  }
}

function stackValueKey(row: DataRow, fields: readonly string[]): string {
  return canonical(
    fields.map((field) => {
      const value = ownValue(row, field);
      return value === undefined ? null : value;
    }),
  );
}

function stableInputRows(
  rows: readonly DataRow[],
  key: string,
  maxRows: number,
): {
  readonly rows: readonly DataRow[];
  readonly byKey: ReadonlyMap<string, DataRow>;
} {
  if (rows.length > maxRows) {
    throw new GraflumeError(
      'INVALID_DATA',
      `Incremental stack input has ${rows.length} rows; the deterministic limit is ${maxRows}.`,
      { path: '$.incrementalStack.input' },
    );
  }
  const cloned = cloneRows(rows);
  const byKey = new Map<string, DataRow>();
  cloned.forEach((row, index) => {
    const id = stableKey(
      ownValue(row, key) as DataValue,
      `$.incrementalStack.input[${index}].${key}`,
    );
    if (byKey.has(id)) {
      throw new GraflumeError('INVALID_DATA', 'Incremental stack input keys must be unique.', {
        path: `$.incrementalStack.input[${index}].${key}`,
      });
    }
    byKey.set(id, row);
  });
  return { rows: cloned, byKey };
}

function stackGroups(
  rows: readonly DataRow[],
  keyField: string,
  transform: StackTransformSpec,
  seriesOrder: readonly string[],
): readonly StackInputGroup[] {
  const grouped = new Map<string, { rows: DataRow[]; sourceKeys: string[] }>();
  rows.forEach((row, index) => {
    const groupKey = stackValueKey(row, transform.groupby);
    const group = grouped.get(groupKey) ?? { rows: [], sourceKeys: [] };
    group.rows.push(row);
    group.sourceKeys.push(
      stableKey(
        ownValue(row, keyField) as DataValue,
        `$.incrementalStack.input[${index}].${keyField}`,
      ),
    );
    grouped.set(groupKey, group);
  });
  if ((transform.series ?? []).length === 0) {
    return [...grouped].map(([key, group]) => ({ key, ...group }));
  }
  const seriesRank = new Map(seriesOrder.map((key, index) => [key, index]));
  return [...grouped].map(([key, group]) => {
    const ordered = group.rows
      .map((row, index) => ({ row, sourceKey: group.sourceKeys[index]!, index }))
      .sort(
        (left, right) =>
          (seriesRank.get(stackValueKey(left.row, transform.series ?? [])) ??
            Number.MAX_SAFE_INTEGER) -
            (seriesRank.get(stackValueKey(right.row, transform.series ?? [])) ??
              Number.MAX_SAFE_INTEGER) || left.index - right.index,
      );
    return {
      key,
      rows: ordered.map(({ row }) => row),
      sourceKeys: ordered.map(({ sourceKey }) => sourceKey),
    };
  });
}

function observedSeriesOrder(
  rows: readonly DataRow[],
  transform: StackTransformSpec,
): readonly string[] {
  const fields = transform.series ?? [];
  if (fields.length === 0) return [];
  return [...new Set(rows.map((row) => stackValueKey(row, fields)))];
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stackGroupSnapshot(
  group: StackInputGroup,
  transform: StackTransformSpec,
): IncrementalStackGroupSnapshot {
  const result = executeTransforms(group.rows, [transform], {
    sourceId: 'incremental-stack-group',
  });
  return {
    key: group.key,
    output: cloneRows(result.data),
    outputSourceKeys: result.lineage.rowSources.map((sources) =>
      sources.flatMap((sourceIndex) => group.sourceKeys[sourceIndex] ?? []),
    ),
  };
}

function incrementalStackLineage(
  inputRows: number,
  output: readonly DataRow[],
  rowSources: readonly (readonly number[])[],
  transform: StackTransformSpec,
  step: IncrementalStackStep,
): DataLineage {
  return {
    sourceId: 'incremental-stack',
    sourceRows: inputRows,
    outputRows: output.length,
    transforms: [
      {
        index: 0,
        type: 'stack',
        inputRows,
        outputRows: output.length,
        parameters: portableParameters(transform),
        aggregationCount: step.recomputedGroups.length + step.reusedGroups.length,
        detail: `Incremental stack: ${step.recomputedGroups.length} groups recomputed, ${step.reusedGroups.length} groups reused (${step.reason}).`,
      },
    ],
    rowSources,
    summary: `Incremental stack recomputed ${step.recomputedRows} of ${inputRows} retained rows across ${step.recomputedGroups.length} affected groups; ${step.reusedRows} rows were reused.`,
  };
}

function stateAfterStackStep(
  previous: IncrementalStackSnapshot | undefined,
  step: IncrementalStackStep,
  groupCount: number,
): IncrementalStackState {
  return {
    version: 1,
    portable: true,
    sequence: step.sequence,
    inputRows: step.inputRows,
    outputRows: step.outputRows,
    groupCount,
    fullRecomputations: (previous?.state.fullRecomputations ?? 0) + (step.mode === 'full' ? 1 : 0),
    incrementalRecomputations:
      (previous?.state.incrementalRecomputations ?? 0) + (step.mode === 'incremental' ? 1 : 0),
    recomputedRows: (previous?.state.recomputedRows ?? 0) + step.recomputedRows,
    reusedRows: (previous?.state.reusedRows ?? 0) + step.reusedRows,
    last: step,
  };
}

/**
 * Execute one stateless, structured-cloneable incremental stack transition.
 *
 * Zero/normalize/center stacks can be recomputed per affected `groupby`
 * bucket. Global series ordering and wiggle baselines deliberately fall back
 * to the exact full transform because a local update can move every bucket.
 */
export function executePortableIncrementalStack(
  request: PortableIncrementalStackRequest,
): PortableIncrementalStackResult {
  const maxRows = boundedStackRows(request.maxRows ?? request.previous?.maxRows);
  validateIncrementalStackRequest(request, maxRows);
  const transform = portableStackTransform(request.transform);
  const fingerprint = canonical(transform);
  const { rows: input, byKey } = stableInputRows(request.input, request.key, maxRows);
  const previous = request.previous;
  const previousCompatible =
    previous !== undefined &&
    previous.version === 1 &&
    previous.key === request.key &&
    previous.maxRows === maxRows &&
    previous.transformFingerprint === fingerprint;
  const previousByKey = new Map<string, DataRow>();
  if (previousCompatible) {
    previous.input.forEach((row, index) => {
      previousByKey.set(
        stableKey(
          ownValue(row, request.key) as DataValue,
          `$.incrementalStack.previous.input[${index}].${request.key}`,
        ),
        row,
      );
    });
  }
  const changedKeys = new Set<string>();
  let removedRows = 0;
  for (const [key, row] of byKey) {
    if (canonical(previousByKey.get(key)) !== canonical(row)) changedKeys.add(key);
  }
  for (const key of previousByKey.keys()) {
    if (!byKey.has(key)) {
      changedKeys.add(key);
      removedRows += 1;
    }
  }
  const seriesOrder = observedSeriesOrder(input, transform);
  const groups = stackGroups(input, request.key, transform, seriesOrder);
  const groupKeys = groups.map(({ key }) => key);
  const affected = new Set<string>();
  const groupForRow = (row: DataRow): string => stackValueKey(row, transform.groupby);
  for (const key of changedKeys) {
    const before = previousByKey.get(key);
    const after = byKey.get(key);
    if (before !== undefined) affected.add(groupForRow(before));
    if (after !== undefined) affected.add(groupForRow(after));
  }
  let reason: IncrementalStackReason = previousCompatible ? 'affected-groups' : 'initial';
  let full = !previousCompatible;
  if (previous !== undefined && !previousCompatible) reason = 'transform-change';
  if (!full && changedKeys.size === 0) reason = 'unchanged';
  if (!full && changedKeys.size > 0 && (transform.offset ?? 'zero') === 'wiggle') {
    full = true;
    reason = 'global-wiggle';
  } else if (
    !full &&
    changedKeys.size > 0 &&
    transform.order !== undefined &&
    transform.order !== 'input'
  ) {
    full = true;
    reason = 'global-order';
  } else if (!full && changedKeys.size > 0 && !sameStrings(previous!.seriesOrder, seriesOrder)) {
    full = true;
    reason = 'series-order-change';
  }

  const previousGroups = new Map((previous?.groups ?? []).map((group) => [group.key, group]));
  let nextGroups: IncrementalStackGroupSnapshot[] = [];
  const recomputedGroups: string[] = [];
  const reusedGroups: string[] = [];
  let exactFull: TransformResult | undefined;
  if (full) {
    exactFull = executeTransforms(input, [transform], { sourceId: 'incremental-stack' });
    const fullGroups = new Map<
      string,
      { output: DataRow[]; outputSourceKeys: (readonly string[])[] }
    >();
    exactFull.data.forEach((row, outputIndex) => {
      const groupKey = stackValueKey(row, transform.groupby);
      const group = fullGroups.get(groupKey) ?? { output: [], outputSourceKeys: [] };
      group.output.push(row);
      group.outputSourceKeys.push(
        (exactFull!.lineage.rowSources[outputIndex] ?? []).flatMap((sourceIndex) => {
          const source = input[sourceIndex];
          return source === undefined
            ? []
            : [
                stableKey(
                  ownValue(source, request.key) as DataValue,
                  `$.incrementalStack.input[${sourceIndex}].${request.key}`,
                ),
              ];
        }),
      );
      fullGroups.set(groupKey, group);
    });
    nextGroups = groupKeys.map((key) => {
      const group = fullGroups.get(key) ?? { output: [], outputSourceKeys: [] };
      return { key, output: cloneRows(group.output), outputSourceKeys: group.outputSourceKeys };
    });
    recomputedGroups.push(...groupKeys);
  } else {
    for (const group of groups) {
      const cached = previousGroups.get(group.key);
      if (!affected.has(group.key) && cached !== undefined) {
        nextGroups.push(structuredClone(cached) as IncrementalStackGroupSnapshot);
        reusedGroups.push(group.key);
      } else {
        nextGroups.push(stackGroupSnapshot(group, transform));
        recomputedGroups.push(group.key);
      }
    }
  }
  const inputIndex = new Map([...byKey.keys()].map((key, index) => [key, index]));
  const output = exactFull?.data ?? nextGroups.flatMap(({ output: rows }) => cloneRows(rows));
  const rowSources =
    exactFull?.lineage.rowSources ??
    nextGroups.flatMap(({ outputSourceKeys }) =>
      outputSourceKeys.map((keys) =>
        keys.flatMap((key) => inputIndex.get(key) ?? []).sort((left, right) => left - right),
      ),
    );
  const recomputedRows = full
    ? input.length
    : groups
        .filter(({ key }) => affected.has(key))
        .reduce((count, group) => count + group.rows.length, 0);
  const step: IncrementalStackStep = {
    sequence: (previous?.state.sequence ?? -1) + 1,
    mode: full ? 'full' : 'incremental',
    reason,
    inputRows: input.length,
    outputRows: output.length,
    changedRows: changedKeys.size,
    removedRows,
    recomputedRows,
    reusedRows: input.length - recomputedRows,
    recomputedGroups,
    reusedGroups,
    changedKeys: [...changedKeys],
  };
  const state = stateAfterStackStep(previous, step, groupKeys.length);
  const transformed: TransformResult = {
    data: output,
    lineage: incrementalStackLineage(input.length, output, rowSources, transform, step),
  };
  const snapshot: IncrementalStackSnapshot = {
    version: 1,
    key: request.key,
    maxRows,
    transform,
    transformFingerprint: fingerprint,
    seriesOrder,
    input,
    groups: nextGroups,
    state,
  };
  // This is the same boundary used by the Worker protocol. Verify it before
  // exposing state so a non-portable datum can never silently enter replay.
  try {
    structuredClone(snapshot);
  } catch (error) {
    throw new GraflumeError('INVALID_DATA', 'Incremental stack state is not Worker-portable.', {
      cause: error,
    });
  }
  return { transformed, snapshot, state };
}

export class IncrementalStackPipeline {
  readonly #store: IncrementalDataStore;
  readonly #key: string;
  readonly #maxRows: number;
  #transform: StackTransformSpec;
  #current: PortableIncrementalStackResult;

  constructor(input: DataInput, transform: StackTransformSpec, options: IncrementalStackOptions) {
    this.#store = new IncrementalDataStore(input, options.streaming);
    this.#key = options.streaming.key;
    this.#maxRows = boundedStackRows(options.maxRows ?? options.streaming.retention?.maxRows);
    this.#transform = portableStackTransform(transform);
    this.#current = executePortableIncrementalStack({
      key: this.#key,
      maxRows: this.#maxRows,
      input: this.#store.rows(),
      transform: this.#transform,
    });
  }

  apply(update: IncrementalUpdate): IncrementalStackUpdateResult {
    const applied = this.#store.apply(update);
    this.#current = executePortableIncrementalStack({
      key: this.#key,
      maxRows: this.#maxRows,
      input: applied.rows,
      transform: this.#transform,
      previous: this.#current.snapshot,
    });
    return {
      ...applied,
      transformed: this.result(),
      stackSnapshot: this.snapshot(),
      stackState: this.state(),
    };
  }

  setTransform(transform: StackTransformSpec): TransformResult {
    this.#transform = portableStackTransform(transform);
    this.#current = executePortableIncrementalStack({
      key: this.#key,
      maxRows: this.#maxRows,
      input: this.#store.rows(),
      transform: this.#transform,
      previous: this.#current.snapshot,
    });
    return this.result();
  }

  result(): TransformResult {
    return structuredClone(this.#current.transformed) as TransformResult;
  }

  snapshot(): IncrementalStackSnapshot {
    return structuredClone(this.#current.snapshot) as IncrementalStackSnapshot;
  }

  state(): IncrementalStackState {
    return structuredClone(this.#current.state) as IncrementalStackState;
  }
}

export function createIncrementalStackPipeline(
  input: DataInput,
  transform: StackTransformSpec,
  options: IncrementalStackOptions,
): IncrementalStackPipeline {
  return new IncrementalStackPipeline(input, transform, options);
}
