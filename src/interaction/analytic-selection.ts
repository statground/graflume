import { GraflumeError } from '../core/errors.js';
import type { AxisId, DatumTargetSpec, JsonPrimitive } from '../spec/types.js';
import { isSafeAxisId } from '../spec/axes.js';

export const analyticSelectionVersion = 1 as const;
export const maximumAnalyticSelections = 64;
export const maximumLassoPoints = 512;
export const maximumCategoricalSelectionValues = 512;

export type AnalyticSelectionCombine = 'union' | 'intersection';
export type AnalyticSelectionUpdate = 'replace' | AnalyticSelectionCombine;
export type AnalyticDomainValue = number | string;

/**
 * Numeric geometry keeps its ordered continuous extent. Categorical brush
 * geometry snapshots the exact bounded domain identities traversed by the
 * gesture so matching remains deterministic without an executable scale.
 */
export interface AnalyticCategoricalExtent {
  readonly values: readonly AnalyticDomainValue[];
}

export type AnalyticSelectionExtent = readonly [number, number] | AnalyticCategoricalExtent;

export interface AnalyticDomainPoint {
  readonly x: number;
  readonly y: number;
}

export interface AnalyticPointSelection {
  readonly type: 'point';
  readonly xAxis?: AxisId;
  readonly yAxis?: AxisId;
  readonly x?: AnalyticDomainValue;
  readonly y?: AnalyticDomainValue;
  /** Optional portable identity for mark-owned and axis-free point selections. */
  readonly target?: DatumTargetSpec;
}

export interface AnalyticIntervalSelection {
  readonly type: 'interval';
  readonly xAxis: AxisId;
  readonly yAxis: AxisId;
  readonly x: AnalyticSelectionExtent;
  readonly y: AnalyticSelectionExtent;
}

/** An explicit rectangle alias retained in serialized state. */
export interface AnalyticRectangleSelection {
  readonly type: 'rectangle';
  readonly xAxis: AxisId;
  readonly yAxis: AxisId;
  readonly x: AnalyticSelectionExtent;
  readonly y: AnalyticSelectionExtent;
}

export interface AnalyticAxisSelection {
  readonly type: 'axis';
  readonly axis: AxisId;
  readonly extent: AnalyticSelectionExtent;
}

export interface AnalyticLassoSelection {
  readonly type: 'lasso';
  readonly xAxis: AxisId;
  readonly yAxis: AxisId;
  readonly points: readonly AnalyticDomainPoint[];
}

export type AnalyticSelection =
  | AnalyticPointSelection
  | AnalyticIntervalSelection
  | AnalyticRectangleSelection
  | AnalyticAxisSelection
  | AnalyticLassoSelection;

export interface AnalyticSelectionState {
  readonly version: typeof analyticSelectionVersion;
  readonly combine: AnalyticSelectionCombine;
  readonly selections: readonly AnalyticSelection[];
}

export interface AnalyticSelectionSample {
  readonly [axisOrMetadata: string]: unknown;
  readonly x?: AnalyticDomainValue;
  readonly y?: AnalyticDomainValue;
  readonly x2?: AnalyticDomainValue;
  readonly y2?: AnalyticDomainValue;
  readonly layerId?: string;
  readonly rowIndex?: number;
  readonly datum?: Readonly<Record<string, unknown>>;
}

function invalid(message: string): never {
  throw new GraflumeError('INVALID_SPEC', message, { path: '$.analyticSelection' });
}

function assertPlainObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(`${label} must be an object.`);
  }
}

function assertClosedKeys(value: object, allowed: readonly string[], label: string): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknown.length > 0) invalid(`${label} contains unknown key "${unknown[0]}".`);
}

function canonicalNumber(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function canonicalPrimitive(value: JsonPrimitive): JsonPrimitive {
  return typeof value === 'number' ? canonicalNumber(value) : value;
}

function domainValue(value: unknown, label: string): asserts value is AnalyticDomainValue {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalid(`${label} must be finite.`);
    return;
  }
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096) {
    invalid(`${label} must be a finite number or a non-empty bounded string.`);
  }
}

function orderedExtent(value: readonly [number, number]): readonly [number, number] {
  const start = canonicalNumber(value[0]);
  const end = canonicalNumber(value[1]);
  return Object.freeze(start <= end ? [start, end] : [end, start]);
}

function normalizeExtent(value: unknown, label: string): AnalyticSelectionExtent {
  if (Array.isArray(value)) {
    if (
      value.length !== 2 ||
      value.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry))
    ) {
      invalid(`${label} must contain exactly two finite numbers.`);
    }
    return orderedExtent(value as unknown as readonly [number, number]);
  }
  assertPlainObject(value, label);
  assertClosedKeys(value, ['values'], label);
  if (
    !Array.isArray(value.values) ||
    value.values.length === 0 ||
    value.values.length > maximumCategoricalSelectionValues
  ) {
    invalid(
      `${label}.values must contain between 1 and ${maximumCategoricalSelectionValues} categorical identities.`,
    );
  }
  const values = value.values.map((entry, index) => {
    domainValue(entry, `${label}.values[${index}]`);
    return typeof entry === 'number' ? canonicalNumber(entry) : entry;
  });
  if (new Set(values.map((entry) => `${typeof entry}:${String(entry)}`)).size !== values.length) {
    invalid(`${label}.values must be unique.`);
  }
  return Object.freeze({ values: Object.freeze(values) });
}

function cloneTarget(target: DatumTargetSpec): DatumTargetSpec {
  const rows =
    target.rowIndex === undefined
      ? undefined
      : Array.isArray(target.rowIndex)
        ? [...target.rowIndex].sort((left, right) => left - right)
        : target.rowIndex;
  const values =
    target.values === undefined
      ? undefined
      : [...target.values]
          .map(canonicalPrimitive)
          .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return Object.freeze({
    type: 'datum',
    ...(target.layerId === undefined ? {} : { layerId: target.layerId }),
    ...(rows === undefined ? {} : { rowIndex: Array.isArray(rows) ? Object.freeze(rows) : rows }),
    ...(target.field === undefined ? {} : { field: target.field }),
    ...(Object.prototype.hasOwnProperty.call(target, 'value')
      ? { value: canonicalPrimitive(target.value!) }
      : {}),
    ...(values === undefined ? {} : { values: Object.freeze(values) }),
  });
}

function validateTarget(target: unknown): asserts target is DatumTargetSpec {
  assertPlainObject(target, 'Point target');
  assertClosedKeys(
    target,
    ['type', 'layerId', 'rowIndex', 'field', 'value', 'values'],
    'Point target',
  );
  const candidate = target as Partial<DatumTargetSpec>;
  if (candidate.type !== 'datum') invalid('Point target.type must be "datum".');
  if (
    candidate.layerId !== undefined &&
    (typeof candidate.layerId !== 'string' ||
      candidate.layerId.length === 0 ||
      candidate.layerId.length > 4096)
  ) {
    invalid('Point target.layerId must be a non-empty bounded string.');
  }
  if (candidate.rowIndex !== undefined) {
    const rows = Array.isArray(candidate.rowIndex) ? candidate.rowIndex : [candidate.rowIndex];
    if (
      rows.length === 0 ||
      rows.length > 1000 ||
      rows.some((row) => !Number.isInteger(row) || row < 0)
    ) {
      invalid('Point target.rowIndex must contain bounded non-negative integers.');
    }
    if (new Set(rows).size !== rows.length) invalid('Point target.rowIndex must be unique.');
  }
  if (
    candidate.field !== undefined &&
    (typeof candidate.field !== 'string' ||
      candidate.field.length === 0 ||
      candidate.field.length > 4096 ||
      candidate.field === '__proto__' ||
      candidate.field === 'prototype' ||
      candidate.field === 'constructor')
  ) {
    invalid('Point target.field must be a safe non-empty bounded string.');
  }
  const hasValue = Object.prototype.hasOwnProperty.call(candidate, 'value');
  const hasValues = Object.prototype.hasOwnProperty.call(candidate, 'values');
  if (candidate.field === undefined && (hasValue || hasValues)) {
    invalid('Point target.field is required for value matching.');
  }
  if (candidate.field !== undefined && hasValue === hasValues) {
    invalid('Point target field matching requires exactly one of value or values.');
  }
  if (hasValues && (!Array.isArray(candidate.values) || candidate.values.length === 0)) {
    invalid('Point target values must be a non-empty array.');
  }
  const values = hasValues ? candidate.values! : hasValue ? [candidate.value] : [];
  if (values.length > 200) invalid('Point target values exceed the 200 item bound.');
  for (const value of values) {
    if (
      value !== null &&
      typeof value !== 'string' &&
      typeof value !== 'boolean' &&
      !(typeof value === 'number' && Number.isFinite(value))
    ) {
      invalid('Point target values must be JSON primitives with finite numbers.');
    }
  }
  if (
    new Set(values.map((value) => JSON.stringify(canonicalPrimitive(value!)))).size !==
    values.length
  ) {
    invalid('Point target values must be unique.');
  }
  if (candidate.rowIndex === undefined && candidate.field === undefined) {
    invalid('Point target requires rowIndex or field/value identity.');
  }
}

function axisId(value: unknown, _orientation?: 'x' | 'y'): asserts value is AxisId {
  if (!isSafeAxisId(value)) invalid('Selection axis must use the safe named-axis grammar.');
}

function normalizeSelection(selection: AnalyticSelection): AnalyticSelection {
  assertPlainObject(selection, 'Selection');
  if (selection.type === 'point') {
    assertClosedKeys(selection, ['type', 'xAxis', 'yAxis', 'x', 'y', 'target'], 'Point selection');
    if (selection.x === undefined && selection.y === undefined && selection.target === undefined) {
      invalid('Point selection requires x, y, or target identity.');
    }
    if (selection.x !== undefined) domainValue(selection.x, 'Point x');
    if (selection.y !== undefined) domainValue(selection.y, 'Point y');
    if (selection.xAxis !== undefined) axisId(selection.xAxis, 'x');
    if (selection.yAxis !== undefined) axisId(selection.yAxis, 'y');
    if (selection.target !== undefined) validateTarget(selection.target);
    return Object.freeze({
      type: 'point',
      ...(selection.xAxis === undefined ? {} : { xAxis: selection.xAxis }),
      ...(selection.yAxis === undefined ? {} : { yAxis: selection.yAxis }),
      ...(selection.x === undefined
        ? {}
        : { x: typeof selection.x === 'number' ? canonicalNumber(selection.x) : selection.x }),
      ...(selection.y === undefined
        ? {}
        : { y: typeof selection.y === 'number' ? canonicalNumber(selection.y) : selection.y }),
      ...(selection.target === undefined ? {} : { target: cloneTarget(selection.target) }),
    });
  }
  if (selection.type === 'interval' || selection.type === 'rectangle') {
    assertClosedKeys(
      selection,
      ['type', 'xAxis', 'yAxis', 'x', 'y'],
      `${selection.type} selection`,
    );
    axisId(selection.xAxis, 'x');
    axisId(selection.yAxis, 'y');
    return Object.freeze({
      type: selection.type,
      xAxis: selection.xAxis,
      yAxis: selection.yAxis,
      x: normalizeExtent(selection.x, 'Selection x extent'),
      y: normalizeExtent(selection.y, 'Selection y extent'),
    });
  }
  if (selection.type === 'axis') {
    assertClosedKeys(selection, ['type', 'axis', 'extent'], 'Axis selection');
    axisId(selection.axis);
    return Object.freeze({
      type: 'axis',
      axis: selection.axis,
      extent: normalizeExtent(selection.extent, 'Axis selection extent'),
    });
  }
  if (selection.type === 'lasso') {
    assertClosedKeys(selection, ['type', 'xAxis', 'yAxis', 'points'], 'Lasso selection');
    axisId(selection.xAxis, 'x');
    axisId(selection.yAxis, 'y');
    if (!Array.isArray(selection.points) || selection.points.length < 3) {
      invalid('Lasso selection requires at least three points.');
    }
    if (selection.points.length > maximumLassoPoints) {
      invalid(`Lasso selection exceeds the ${maximumLassoPoints} point bound.`);
    }
    const points = selection.points.map((point, index) => {
      assertPlainObject(point, `Lasso point ${index}`);
      assertClosedKeys(point, ['x', 'y'], `Lasso point ${index}`);
      if (
        typeof point.x !== 'number' ||
        typeof point.y !== 'number' ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y)
      ) {
        invalid(`Lasso point ${index} must contain finite x and y values.`);
      }
      return Object.freeze({ x: canonicalNumber(point.x), y: canonicalNumber(point.y) });
    });
    return Object.freeze({
      type: 'lasso',
      xAxis: selection.xAxis,
      yAxis: selection.yAxis,
      points: Object.freeze(points),
    });
  }
  invalid(
    `Unsupported analytic selection type: ${String((selection as { type?: unknown }).type)}.`,
  );
}

function stableTarget(target: DatumTargetSpec | undefined): unknown {
  if (target === undefined) return null;
  const rows =
    target.rowIndex === undefined
      ? null
      : Array.isArray(target.rowIndex)
        ? [...target.rowIndex].sort((a, b) => a - b)
        : [target.rowIndex];
  const values = target.values ?? (target.value === undefined ? [] : [target.value]);
  return [
    target.layerId ?? null,
    rows,
    target.field ?? null,
    [...values].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  ];
}

export function analyticSelectionKey(selection: AnalyticSelection): string {
  switch (selection.type) {
    case 'point':
      return JSON.stringify([
        'point',
        selection.xAxis ?? null,
        selection.x ?? null,
        selection.yAxis ?? null,
        selection.y ?? null,
        stableTarget(selection.target),
      ]);
    case 'interval':
    case 'rectangle':
      return JSON.stringify([
        selection.type,
        selection.xAxis,
        selection.x,
        selection.yAxis,
        selection.y,
      ]);
    case 'axis':
      return JSON.stringify(['axis', selection.axis, selection.extent]);
    case 'lasso':
      return JSON.stringify(['lasso', selection.xAxis, selection.yAxis, selection.points]);
  }
}

export function normalizeAnalyticSelectionState(
  input: AnalyticSelectionState,
): AnalyticSelectionState {
  assertPlainObject(input, 'Analytic selection state');
  assertClosedKeys(input, ['version', 'combine', 'selections'], 'Analytic selection state');
  if (input.version !== analyticSelectionVersion) {
    invalid(`Analytic selection state.version must be ${analyticSelectionVersion}.`);
  }
  if (input.combine !== 'union' && input.combine !== 'intersection') {
    invalid('Analytic selection state.combine must be "union" or "intersection".');
  }
  if (!Array.isArray(input.selections) || input.selections.length > maximumAnalyticSelections) {
    invalid(
      `Analytic selection state must contain at most ${maximumAnalyticSelections} selections.`,
    );
  }
  const selections = input.selections.map(normalizeSelection);
  const keys = selections.map(analyticSelectionKey);
  if (new Set(keys).size !== keys.length) invalid('Analytic selections must be unique.');
  return Object.freeze({
    version: analyticSelectionVersion,
    combine: input.combine,
    selections: Object.freeze(selections),
  });
}

export function emptyAnalyticSelectionState(
  combine: AnalyticSelectionCombine = 'union',
): AnalyticSelectionState {
  return normalizeAnalyticSelectionState({
    version: analyticSelectionVersion,
    combine,
    selections: [],
  });
}

function primitiveEqual(left: unknown, right: JsonPrimitive): boolean {
  return typeof left === 'number' && typeof right === 'number'
    ? Number.isFinite(left) && Object.is(left, right)
    : Object.is(left, right);
}

function targetMatches(target: DatumTargetSpec, sample: AnalyticSelectionSample): boolean {
  if (target.layerId !== undefined && target.layerId !== sample.layerId) return false;
  if (target.rowIndex !== undefined) {
    const rows = Array.isArray(target.rowIndex) ? target.rowIndex : [target.rowIndex];
    if (sample.rowIndex === undefined || !rows.includes(sample.rowIndex)) return false;
  }
  if (target.field !== undefined) {
    const values = target.values ?? (target.value === undefined ? [] : [target.value]);
    const actual = sample.datum?.[target.field];
    if (!values.some((value) => primitiveEqual(actual, value))) return false;
  }
  return target.rowIndex !== undefined || target.field !== undefined;
}

function inExtent(value: unknown, extent: AnalyticSelectionExtent): boolean {
  if (Array.isArray(extent)) {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= extent[0] &&
      value <= extent[1]
    );
  }
  return (extent as AnalyticCategoricalExtent).values.some((candidate) =>
    Object.is(candidate, value),
  );
}

function pointInPolygon(
  point: AnalyticDomainPoint,
  polygon: readonly AnalyticDomainPoint[],
): boolean {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current++
  ) {
    const a = polygon[current]!;
    const b = polygon[previous]!;
    const crosses = a.y > point.y !== b.y > point.y;
    const edgeX = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x;
    if (crosses && point.x < edgeX) inside = !inside;
  }
  return inside;
}

function normalizedSelectionMatches(
  normalized: AnalyticSelectionState,
  sample: AnalyticSelectionSample,
): boolean {
  if (normalized.selections.length === 0) return false;
  const matches = (selection: AnalyticSelection): boolean => {
    switch (selection.type) {
      case 'point': {
        if (selection.target !== undefined && !targetMatches(selection.target, sample))
          return false;
        if (selection.x !== undefined && !Object.is(sample[selection.xAxis ?? 'x'], selection.x))
          return false;
        if (selection.y !== undefined && !Object.is(sample[selection.yAxis ?? 'y'], selection.y))
          return false;
        return true;
      }
      case 'interval':
      case 'rectangle':
        return (
          inExtent(sample[selection.xAxis], selection.x) &&
          inExtent(sample[selection.yAxis], selection.y)
        );
      case 'axis':
        return inExtent(sample[selection.axis], selection.extent);
      case 'lasso': {
        const x = sample[selection.xAxis];
        const y = sample[selection.yAxis];
        return (
          typeof x === 'number' &&
          typeof y === 'number' &&
          pointInPolygon({ x, y }, selection.points)
        );
      }
    }
  };
  return normalized.combine === 'union'
    ? normalized.selections.some(matches)
    : normalized.selections.every(matches);
}

export function analyticSelectionPredicate(
  state: AnalyticSelectionState,
): (sample: AnalyticSelectionSample) => boolean {
  const normalized = normalizeAnalyticSelectionState(state);
  return (sample) => normalizedSelectionMatches(normalized, sample);
}

export function analyticSelectionMatches(
  state: AnalyticSelectionState,
  sample: AnalyticSelectionSample,
): boolean {
  return normalizedSelectionMatches(normalizeAnalyticSelectionState(state), sample);
}

export class AnalyticSelectionStore {
  #state: AnalyticSelectionState;

  constructor(initial: AnalyticSelectionState = emptyAnalyticSelectionState()) {
    this.#state = normalizeAnalyticSelectionState(initial);
  }

  get(): AnalyticSelectionState {
    return this.#state;
  }

  set(state: AnalyticSelectionState): AnalyticSelectionState {
    this.#state = normalizeAnalyticSelectionState(state);
    return this.#state;
  }

  clear(combine: AnalyticSelectionCombine = this.#state.combine): AnalyticSelectionState {
    this.#state = emptyAnalyticSelectionState(combine);
    return this.#state;
  }

  apply(
    selection: AnalyticSelection,
    update: AnalyticSelectionUpdate = 'replace',
  ): AnalyticSelectionState {
    const normalized = normalizeSelection(selection);
    if (update === 'replace') {
      return this.set({
        version: analyticSelectionVersion,
        combine: this.#state.combine,
        selections: [normalized],
      });
    }
    const existing = this.#state.selections.filter(
      (candidate) => analyticSelectionKey(candidate) !== analyticSelectionKey(normalized),
    );
    return this.set({
      version: analyticSelectionVersion,
      combine: update,
      selections: [...existing, normalized],
    });
  }
}
