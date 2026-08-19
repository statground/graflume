import { GraflumeError } from '../core/errors.js';
import { isPlainObject } from '../utils/object.js';
import type { ChartSpec, EncodingInput, LayerSpec, MarkInput } from './types.js';

export interface SpecIssue {
  readonly path: string;
  readonly message: string;
}

const UNSAFE_FIELDS = new Set(['__proto__', 'prototype', 'constructor']);

function validateEncoding(value: unknown, path: string, issues: SpecIssue[]): void {
  if (typeof value === 'string') {
    if (value.trim() === '') issues.push({ path, message: 'Field name must not be empty.' });
    if (UNSAFE_FIELDS.has(value)) issues.push({ path, message: `Unsafe field "${value}" is forbidden.` });
    return;
  }

  if (!isPlainObject(value) || typeof value.field !== 'string') {
    issues.push({ path, message: 'Encoding must be a field name or an object with a field.' });
    return;
  }

  if (value.field.trim() === '') issues.push({ path: `${path}.field`, message: 'Field must not be empty.' });
  if (UNSAFE_FIELDS.has(value.field)) {
    issues.push({ path: `${path}.field`, message: `Unsafe field "${value.field}" is forbidden.` });
  }
}

function validateMark(value: unknown, path: string, issues: SpecIssue[]): void {
  if (typeof value === 'string') {
    if (value.trim() === '') issues.push({ path, message: 'Mark type must not be empty.' });
    return;
  }
  if (!isPlainObject(value) || typeof value.type !== 'string' || value.type.trim() === '') {
    issues.push({ path, message: 'Mark must be a type string or an object with a type.' });
  }
}

function validateLayer(layer: unknown, path: string, hasParentData: boolean, issues: SpecIssue[]): void {
  if (!isPlainObject(layer)) {
    issues.push({ path, message: 'Layer must be an object.' });
    return;
  }

  validateMark(layer.mark as MarkInput, `${path}.mark`, issues);
  validateEncoding(layer.x as EncodingInput, `${path}.x`, issues);
  validateEncoding(layer.y as EncodingInput, `${path}.y`, issues);

  if (!hasParentData && layer.data === undefined) {
    issues.push({ path: `${path}.data`, message: 'Layer data is required when chart-level data is absent.' });
  }
}

function findFunctions(value: unknown, path: string, issues: SpecIssue[], seen: WeakSet<object>): void {
  if (typeof value === 'function') {
    issues.push({ path, message: 'Functions are not allowed in the portable chart spec.' });
    return;
  }
  if (value === null || typeof value !== 'object' || value instanceof Date) return;
  if (ArrayBuffer.isView(value)) return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => findFunctions(item, `${path}[${index}]`, issues, seen));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (UNSAFE_FIELDS.has(key)) {
      issues.push({ path: `${path}.${key}`, message: `Unsafe key "${key}" is forbidden.` });
      continue;
    }
    findFunctions(child, `${path}.${key}`, issues, seen);
  }
}

export function validateSpec(input: unknown): readonly SpecIssue[] {
  const issues: SpecIssue[] = [];
  if (!isPlainObject(input)) {
    return [{ path: '$', message: 'Chart spec must be an object.' }];
  }

  if (input.specVersion !== undefined && input.specVersion !== '0.1') {
    issues.push({ path: '$.specVersion', message: 'Only specVersion "0.1" is supported.' });
  }

  const layers = input.layers;
  const hasShorthand = input.mark !== undefined || input.x !== undefined || input.y !== undefined;

  if (layers === undefined && !hasShorthand) {
    issues.push({ path: '$', message: 'Provide layers or the mark/x/y shorthand.' });
  }

  if (layers !== undefined) {
    if (!Array.isArray(layers) || layers.length === 0) {
      issues.push({ path: '$.layers', message: 'Layers must be a non-empty array.' });
    } else {
      layers.forEach((layer, index) =>
        validateLayer(layer, `$.layers[${index}]`, input.data !== undefined, issues),
      );
    }
  }

  if (hasShorthand) {
    validateMark(input.mark as MarkInput, '$.mark', issues);
    validateEncoding(input.x as EncodingInput, '$.x', issues);
    validateEncoding(input.y as EncodingInput, '$.y', issues);
    if (input.data === undefined) {
      issues.push({ path: '$.data', message: 'Chart-level data is required for shorthand charts.' });
    }
  }

  findFunctions(input, '$', issues, new WeakSet());
  return issues;
}

export function assertValidSpec(input: unknown): asserts input is ChartSpec {
  const issues = validateSpec(input);
  if (issues.length === 0) return;
  const first = issues[0];
  throw new GraflumeError('INVALID_SPEC', first?.message ?? 'Invalid chart spec.', {
    path: first?.path ?? '$',
    details: { issues },
  });
}
