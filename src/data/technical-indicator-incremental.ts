import { GraflumeError } from '../core/errors.js';
import { temporalTimestamp } from '../format/temporal.js';
import type { JsonValue } from '../spec/types.js';
import {
  calculateTechnicalIndicator,
  resolveTechnicalIndicatorCapability,
  type TechnicalIndicatorCalculation,
  type TechnicalIndicatorInputSeries,
} from './technical-indicators.js';
import {
  createTechnicalIndicatorEngine,
  stepTechnicalIndicatorEngine,
  stepTechnicalIndicatorSessionPivot,
  technicalIndicatorInputRow,
  type TechnicalIndicatorEngineSnapshot,
  type TechnicalIndicatorEngineStep,
} from './technical-indicator-incremental-engine.js';

export const DEFAULT_TECHNICAL_INDICATOR_MAX_ROWS = 4_096;
export const MAX_TECHNICAL_INDICATOR_ROWS = 100_000;

export interface TechnicalIndicatorIncrementalSpec {
  readonly identifier: string;
  readonly options?: Readonly<Record<string, JsonValue>>;
  readonly maxRows?: number;
}

export interface PortableTechnicalIndicatorInput {
  readonly value?: readonly (number | null)[];
  readonly open?: readonly (number | null)[];
  readonly high?: readonly (number | null)[];
  readonly low?: readonly (number | null)[];
  readonly close?: readonly (number | null)[];
  readonly volume?: readonly (number | null)[];
  readonly session?: readonly JsonValue[];
  readonly time?: readonly (number | string | null)[];
}

export interface TechnicalIndicatorIncrementalSnapshot {
  readonly version: 1;
  readonly spec: {
    readonly identifier: string;
    readonly options: Readonly<Record<string, JsonValue>>;
    readonly maxRows: number;
  };
  readonly input: PortableTechnicalIndicatorInput;
  readonly length: number;
  /**
   * Optional so snapshots emitted before the incremental engine remain
   * restorable. New snapshots carry cached outputs plus bounded rolling and
   * cumulative checkpoints, so subsequent appends never replay the prefix.
   */
  readonly runtime?: TechnicalIndicatorIncrementalRuntimeSnapshot;
}

export interface TechnicalIndicatorIncrementalRuntimeSnapshot {
  readonly version: 1;
  readonly calculation: TechnicalIndicatorCalculation;
  readonly engine: TechnicalIndicatorEngineSnapshot;
  readonly segmentStart: number;
  readonly totalEvaluatedRows: number;
}

export interface TechnicalIndicatorIncrementalRequest {
  readonly spec: TechnicalIndicatorIncrementalSpec;
  readonly previous?: TechnicalIndicatorIncrementalSnapshot;
  readonly append: TechnicalIndicatorInputSeries;
}

export interface TechnicalIndicatorIncrementalResult {
  readonly snapshot: TechnicalIndicatorIncrementalSnapshot;
  readonly calculation: TechnicalIndicatorCalculation;
  readonly diagnostics: TechnicalIndicatorIncrementalDiagnostics;
}

export interface TechnicalIndicatorIncrementalDiagnostics {
  readonly strategy: 'bootstrap' | 'incremental' | 'legacy-restore';
  /** Rows advanced through the state machine for this request. */
  readonly evaluatedRows: number;
  /** Previously returned rows replayed because an old snapshot lacked runtime state. */
  readonly recomputedPrefixRows: number;
  /** Existing output cells intentionally revised (currently Zigzag candidates only). */
  readonly patchedPrefixRows: number;
}

type NumericRole = 'value' | 'open' | 'high' | 'low' | 'close' | 'volume';
const numericRoles: readonly NumericRole[] = ['value', 'open', 'high', 'low', 'close', 'volume'];

function resolveMaxRows(value: number | undefined): number {
  const resolved = value ?? DEFAULT_TECHNICAL_INDICATOR_MAX_ROWS;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > MAX_TECHNICAL_INDICATOR_ROWS) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `maxRows must be an integer between 1 and ${MAX_TECHNICAL_INDICATOR_ROWS}.`,
      { path: '$.maxRows' },
    );
  }
  return resolved;
}

function batchLength(batch: TechnicalIndicatorInputSeries): number {
  const lengths = [
    ...numericRoles.map((role) => batch[role]?.length),
    batch.session?.length,
    batch.time?.length,
  ].filter((length): length is number => length !== undefined);
  const length = lengths[0] ?? 0;
  if (lengths.some((candidate) => candidate !== length)) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Every technical-indicator append channel must have the same batch length.',
      { path: '$.append' },
    );
  }
  return length;
}

function portableTime(
  values: readonly (number | string | Date | null)[] | undefined,
): readonly (number | string | null)[] | undefined {
  return values?.map((value) => (value instanceof Date ? value.toISOString() : value));
}

function appendChannel<T>(
  previous: readonly T[] | undefined,
  next: readonly T[] | undefined,
  previousLength: number,
  appendLength: number,
  missing: T,
): readonly T[] | undefined {
  if (previous === undefined && next === undefined) return undefined;
  return [
    ...(previous ?? Array.from<T>({ length: previousLength }).fill(missing)),
    ...(next ?? Array.from<T>({ length: appendLength }).fill(missing)),
  ];
}

function appendInput(
  previous: PortableTechnicalIndicatorInput,
  next: TechnicalIndicatorInputSeries,
  previousLength: number,
  appendLength: number,
): PortableTechnicalIndicatorInput {
  const output: {
    value?: readonly (number | null)[];
    open?: readonly (number | null)[];
    high?: readonly (number | null)[];
    low?: readonly (number | null)[];
    close?: readonly (number | null)[];
    volume?: readonly (number | null)[];
    session?: readonly JsonValue[];
    time?: readonly (number | string | null)[];
  } = {};
  numericRoles.forEach((role) => {
    const combined = appendChannel(previous[role], next[role], previousLength, appendLength, null);
    if (combined !== undefined) output[role] = combined;
  });
  const session = appendChannel(previous.session, next.session, previousLength, appendLength, null);
  if (session !== undefined) output.session = session;
  const time = appendChannel(
    previous.time,
    portableTime(next.time),
    previousLength,
    appendLength,
    null,
  );
  if (time !== undefined) output.time = time;
  return output;
}

function assertMatchingSnapshot(
  spec: TechnicalIndicatorIncrementalSpec,
  snapshot: TechnicalIndicatorIncrementalSnapshot,
  maxRows: number,
): void {
  if (
    snapshot.version !== 1 ||
    snapshot.spec.identifier !== spec.identifier ||
    snapshot.spec.maxRows !== maxRows ||
    JSON.stringify(snapshot.spec.options) !== JSON.stringify(spec.options ?? {})
  ) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'The incremental snapshot does not match the requested indicator specification.',
      { path: '$.previous.spec' },
    );
  }
  if (snapshot.length > maxRows) {
    throw new GraflumeError('INVALID_SPEC', 'The incremental snapshot exceeds maxRows.', {
      path: '$.previous.length',
    });
  }
  if (!Number.isInteger(snapshot.length) || snapshot.length < 0) {
    throw new GraflumeError('INVALID_SPEC', 'The incremental snapshot length is invalid.', {
      path: '$.previous.length',
    });
  }
  const channelLengths = [
    ...numericRoles.map((role) => snapshot.input[role]?.length),
    snapshot.input.session?.length,
    snapshot.input.time?.length,
  ].filter((length): length is number => length !== undefined);
  if (channelLengths.some((length) => length !== snapshot.length)) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Every incremental snapshot channel must match snapshot.length.',
      { path: '$.previous.input' },
    );
  }
  if (snapshot.runtime !== undefined) {
    const runtime = snapshot.runtime;
    if (
      runtime.version !== 1 ||
      runtime.engine.version !== 1 ||
      runtime.engine.kind !== runtime.calculation.capability.kind ||
      !Number.isInteger(runtime.segmentStart) ||
      runtime.segmentStart < 0 ||
      runtime.segmentStart > snapshot.length ||
      !Number.isInteger(runtime.totalEvaluatedRows) ||
      runtime.totalEvaluatedRows < snapshot.length
    ) {
      throw new GraflumeError('INVALID_SPEC', 'The incremental runtime snapshot is invalid.', {
        path: '$.previous.runtime',
      });
    }
    if (
      runtime.calculation.capability.id !== resolveTechnicalIndicatorCapability(spec.identifier)?.id
    ) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'The incremental runtime capability does not match the requested indicator.',
        { path: '$.previous.runtime.calculation.capability' },
      );
    }
    if (
      Object.values(runtime.calculation.outputs).some((series) => series.length !== snapshot.length)
    ) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Every cached indicator output must match snapshot.length.',
        { path: '$.previous.runtime.calculation.outputs' },
      );
    }
  }
}

interface IncrementalSessionConfig {
  readonly mode: 'none' | 'field' | 'utc-day' | 'gap';
  readonly reset: 'hard' | 'carry';
  readonly gapMs: number;
}

function sessionConfig(
  calculation: TechnicalIndicatorCalculation,
  options: Readonly<Record<string, JsonValue>>,
): IncrementalSessionConfig {
  const supplied = options.session;
  const record =
    supplied !== null && typeof supplied === 'object' && !Array.isArray(supplied)
      ? (supplied as Readonly<Record<string, JsonValue>>)
      : {};
  return {
    mode: calculation.session.mode,
    reset: calculation.session.reset,
    gapMs: typeof record.gapMs === 'number' ? record.gapMs : 0,
  };
}

function sessionTimestamp(value: number | string | null | undefined, index: number): number {
  const resolved = temporalTimestamp(value ?? null, true) ?? Number.NaN;
  if (!Number.isFinite(resolved)) {
    throw new GraflumeError('INVALID_SPEC', `Invalid session timestamp at row ${index}.`, {
      path: '$.mark.options.session.timeField',
    });
  }
  return resolved;
}

function sameSessionValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

function isSessionBoundary(
  input: PortableTechnicalIndicatorInput,
  index: number,
  config: IncrementalSessionConfig,
): boolean {
  if (config.mode === 'none') return false;
  if (index === 0) return true;
  if (config.mode === 'field') {
    return !sameSessionValue(input.session?.[index - 1], input.session?.[index]);
  }
  const previous = sessionTimestamp(input.time?.[index - 1], index - 1);
  const current = sessionTimestamp(input.time?.[index], index);
  if (current < previous) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Session timestamps must be ordered from earliest to latest.',
      { path: '$.mark.options.session.timeField' },
    );
  }
  return config.mode === 'utc-day'
    ? Math.floor(current / 86_400_000) !== Math.floor(previous / 86_400_000)
    : current - previous > config.gapMs;
}

interface MutableRuntime {
  engine: TechnicalIndicatorEngineSnapshot;
  segmentStart: number;
}

function stepRuntime(
  runtime: MutableRuntime,
  calculation: TechnicalIndicatorCalculation,
  input: PortableTechnicalIndicatorInput,
  index: number,
  boundary: boolean,
): TechnicalIndicatorEngineStep {
  const hard = calculation.session.reset === 'hard' && calculation.session.mode !== 'none';
  const sessionPivot = calculation.capability.kind === 'pivotpoints' && hard;
  if (hard && boundary && index > 0 && !sessionPivot) {
    runtime.engine = createTechnicalIndicatorEngine(calculation);
    runtime.segmentStart = index;
  }
  const row = technicalIndicatorInputRow(input, index);
  return sessionPivot
    ? stepTechnicalIndicatorSessionPivot(runtime.engine, row, boundary)
    : stepTechnicalIndicatorEngine(runtime.engine, row, calculation.parameters);
}

function replayRuntime(
  calculation: TechnicalIndicatorCalculation,
  input: PortableTechnicalIndicatorInput,
  length: number,
  options: Readonly<Record<string, JsonValue>>,
): MutableRuntime {
  const runtime: MutableRuntime = {
    engine: createTechnicalIndicatorEngine(calculation),
    segmentStart: 0,
  };
  const config = sessionConfig(calculation, options);
  for (let index = 0; index < length; index += 1) {
    stepRuntime(runtime, calculation, input, index, isSessionBoundary(input, index, config));
  }
  return runtime;
}

function appendOutputSlots(
  calculation: TechnicalIndicatorCalculation,
  added: number,
): Record<string, Array<number | null>> {
  const output: Record<string, Array<number | null>> = {};
  calculation.capability.outputs.forEach((role) => {
    output[role] = [
      ...(calculation.outputs[role] ?? []),
      ...Array<number | null>(added).fill(null),
    ];
  });
  Object.entries(calculation.outputs).forEach(([role, values]) => {
    output[role] ??= [...values, ...Array<number | null>(added).fill(null)];
  });
  return output;
}

function appendIncrementally(
  previous: TechnicalIndicatorIncrementalRuntimeSnapshot,
  input: PortableTechnicalIndicatorInput,
  start: number,
  added: number,
  options: Readonly<Record<string, JsonValue>>,
): {
  readonly runtime: TechnicalIndicatorIncrementalRuntimeSnapshot;
  readonly patchedPrefixRows: number;
} {
  const base = structuredClone(previous);
  const mutable: MutableRuntime = {
    engine: base.engine,
    segmentStart: base.segmentStart,
  };
  const output = appendOutputSlots(base.calculation, added);
  const boundaries = [...base.calculation.session.boundaries];
  const config = sessionConfig(base.calculation, options);
  const patched = new Set<number>();
  for (let index = start; index < start + added; index += 1) {
    const boundary = isSessionBoundary(input, index, config);
    if (boundary && !boundaries.includes(index)) boundaries.push(index);
    const step = stepRuntime(mutable, base.calculation, input, index, boundary);
    Object.entries(step.output).forEach(([role, value]) => {
      const series =
        output[role] ?? (output[role] = Array<number | null>(start + added).fill(null));
      series[index] = value;
    });
    step.patches.forEach((patch) => {
      const target = mutable.segmentStart + patch.index;
      const series = output[patch.role];
      if (series === undefined || target < 0 || target >= index) return;
      series[target] = patch.value;
      patched.add(target);
    });
  }
  const calculation: TechnicalIndicatorCalculation = {
    ...base.calculation,
    outputs: output,
    warmUpRows:
      base.calculation.capability.kind === 'pivotpoints' && boundaries.length > 0
        ? (boundaries[1] ?? start + added)
        : base.calculation.warmUpRows,
    session: { ...base.calculation.session, boundaries },
  };
  return {
    runtime: {
      version: 1,
      calculation,
      engine: mutable.engine,
      segmentStart: mutable.segmentStart,
      totalEvaluatedRows: base.totalEvaluatedRows + added,
    },
    patchedPrefixRows: patched.size,
  };
}

/**
 * Pure, function-free incremental request suitable for structured cloning and
 * worker execution. State is explicit and bounded by maxRows.
 */
export function calculateTechnicalIndicatorIncremental(
  request: TechnicalIndicatorIncrementalRequest,
): TechnicalIndicatorIncrementalResult {
  const maxRows = resolveMaxRows(request.spec.maxRows);
  const options = structuredClone(request.spec.options ?? {}) as Readonly<
    Record<string, JsonValue>
  >;
  const previous = request.previous;
  if (previous !== undefined) assertMatchingSnapshot(request.spec, previous, maxRows);
  const previousLength = previous?.length ?? 0;
  const added = batchLength(request.append);
  const capability = resolveTechnicalIndicatorCapability(request.spec.identifier);
  if (added > 0 && capability !== null) {
    for (const role of capability.requiredInputs) {
      if (request.append[role] === undefined) {
        throw new GraflumeError(
          'INVALID_SPEC',
          `${capability.id} append requires the ${role} input channel.`,
          { path: `$.append.${role}` },
        );
      }
    }
  }
  if (previousLength + added > maxRows) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `Technical-indicator state would exceed the configured maxRows (${maxRows}).`,
      { path: '$.append' },
    );
  }
  const input = appendInput(previous?.input ?? {}, request.append, previousLength, added);
  let runtime: TechnicalIndicatorIncrementalRuntimeSnapshot;
  let diagnostics: TechnicalIndicatorIncrementalDiagnostics;
  if (previous?.runtime !== undefined) {
    const appended = appendIncrementally(previous.runtime, input, previousLength, added, options);
    runtime = appended.runtime;
    diagnostics = {
      strategy: 'incremental',
      evaluatedRows: added,
      recomputedPrefixRows: 0,
      patchedPrefixRows: appended.patchedPrefixRows,
    };
  } else {
    // Initial requests and legacy snapshots take one linear bootstrap pass.
    // Every subsequent append resumes from the rolling/cumulative checkpoints.
    const calculation = calculateTechnicalIndicator(request.spec.identifier, input, options);
    const replayed = replayRuntime(calculation, input, previousLength + added, options);
    runtime = {
      version: 1,
      calculation,
      engine: replayed.engine,
      segmentStart: replayed.segmentStart,
      totalEvaluatedRows: previousLength + added,
    };
    diagnostics = {
      strategy: previous === undefined ? 'bootstrap' : 'legacy-restore',
      evaluatedRows: previousLength + added,
      recomputedPrefixRows: previousLength,
      patchedPrefixRows: 0,
    };
  }
  const snapshot: TechnicalIndicatorIncrementalSnapshot = {
    version: 1,
    spec: { identifier: request.spec.identifier, options, maxRows },
    input,
    length: previousLength + added,
    runtime,
  };
  return { snapshot, calculation: runtime.calculation, diagnostics };
}

export class TechnicalIndicatorIncrementalCalculator {
  readonly #spec: TechnicalIndicatorIncrementalSpec;
  #snapshot: TechnicalIndicatorIncrementalSnapshot | undefined;
  #calculation: TechnicalIndicatorCalculation | null = null;

  constructor(
    spec: TechnicalIndicatorIncrementalSpec,
    snapshot?: TechnicalIndicatorIncrementalSnapshot,
  ) {
    const maxRows = resolveMaxRows(spec.maxRows);
    this.#spec = {
      identifier: spec.identifier,
      options: structuredClone(spec.options ?? {}) as Readonly<Record<string, JsonValue>>,
      maxRows,
    };
    if (snapshot !== undefined) {
      assertMatchingSnapshot(this.#spec, snapshot, maxRows);
      if (snapshot.runtime !== undefined) {
        this.#snapshot = structuredClone(snapshot);
        this.#calculation = this.#snapshot.runtime!.calculation;
      } else {
        const upgraded = calculateTechnicalIndicatorIncremental({
          spec: this.#spec,
          previous: snapshot,
          append: {},
        });
        this.#snapshot = upgraded.snapshot;
        this.#calculation = upgraded.calculation;
      }
    }
  }

  append(batch: TechnicalIndicatorInputSeries): TechnicalIndicatorCalculation {
    const result = calculateTechnicalIndicatorIncremental({
      spec: this.#spec,
      ...(this.#snapshot === undefined ? {} : { previous: this.#snapshot }),
      append: batch,
    });
    this.#snapshot = result.snapshot;
    this.#calculation = result.calculation;
    return result.calculation;
  }

  reset(): void {
    this.#snapshot = undefined;
    this.#calculation = null;
  }

  snapshot(): TechnicalIndicatorIncrementalSnapshot | null {
    return this.#snapshot === undefined ? null : structuredClone(this.#snapshot);
  }

  result(): TechnicalIndicatorCalculation | null {
    return this.#calculation;
  }
}
