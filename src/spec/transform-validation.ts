import { isPlainObject } from '../utils/object.js';
import type { SpecIssue } from './validate.js';

const unsafeFields = new Set(['__proto__', 'prototype', 'constructor']);
const types = new Set([
  'filter',
  'sort',
  'calculate',
  'aggregate',
  'joinaggregate',
  'bin',
  'bin2d',
  'density1d',
  'density2d',
  'stack',
  'window',
  'regression',
  'fold',
  'flatten',
  'pivot',
  'impute',
  'lookup',
  'quantile',
  'sample',
  'resample',
  'timeUnit',
]);
const expressionOps = new Set([
  'literal',
  'field',
  'not',
  'negate',
  'isValid',
  'toNumber',
  'toString',
  'add',
  'subtract',
  'multiply',
  'divide',
  'modulo',
  'equal',
  'notEqual',
  'lessThan',
  'lessThanOrEqual',
  'greaterThan',
  'greaterThanOrEqual',
  'and',
  'or',
  'if',
  'coalesce',
]);

function issue(issues: SpecIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function field(value: unknown, path: string, issues: SpecIssue[]): boolean {
  if (typeof value !== 'string' || value.trim() === '' || unsafeFields.has(value)) {
    issue(issues, path, 'Transform field must be a non-empty safe string.');
    return false;
  }
  return true;
}

function fields(value: unknown, path: string, issues: SpecIssue[], allowEmpty = false): boolean {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > 256) {
    issue(
      issues,
      path,
      `Transform fields must be ${allowEmpty ? 'an' : 'a non-empty'} array of at most 256 fields.`,
    );
    return false;
  }
  value.forEach((item, index) => field(item, `${path}[${index}]`, issues));
  return true;
}

function tuple(value: unknown, length: number, path: string, issues: SpecIssue[]): void {
  if (!Array.isArray(value) || value.length !== length) {
    issue(issues, path, `Transform output must contain exactly ${length} field names.`);
    return;
  }
  value.forEach((item, index) => field(item, `${path}[${index}]`, issues));
}

function expression(value: unknown, path: string, issues: SpecIssue[], depth = 0): void {
  if (
    depth > 32 ||
    !isPlainObject(value) ||
    typeof value.op !== 'string' ||
    !expressionOps.has(value.op)
  ) {
    issue(
      issues,
      path,
      depth > 32
        ? 'Transform expression exceeds 32 levels.'
        : 'Invalid closed transform expression.',
    );
    return;
  }
  const op = value.op;
  const allowed =
    op === 'literal'
      ? ['op', 'value']
      : op === 'field'
        ? ['op', 'field']
        : ['not', 'negate', 'isValid', 'toNumber', 'toString'].includes(op)
          ? ['op', 'value']
          : op === 'if'
            ? ['op', 'condition', 'then', 'else']
            : op === 'coalesce'
              ? ['op', 'values']
              : ['op', 'left', 'right'];
  Object.keys(value).forEach((key) => {
    if (!allowed.includes(key))
      issue(issues, `${path}.${key}`, `Unknown ${op} expression property "${key}".`);
  });
  if (op === 'literal') {
    const literal = value.value;
    if (literal !== null && !['string', 'number', 'boolean'].includes(typeof literal))
      issue(issues, `${path}.value`, 'Literal must be a JSON scalar.');
    if (typeof literal === 'number' && !Number.isFinite(literal))
      issue(issues, `${path}.value`, 'Literal number must be finite.');
  } else if (op === 'field') field(value.field, `${path}.field`, issues);
  else if (['not', 'negate', 'isValid', 'toNumber', 'toString'].includes(op))
    expression(value.value, `${path}.value`, issues, depth + 1);
  else if (op === 'if') {
    expression(value.condition, `${path}.condition`, issues, depth + 1);
    expression(value.then, `${path}.then`, issues, depth + 1);
    expression(value.else, `${path}.else`, issues, depth + 1);
  } else if (op === 'coalesce') {
    if (!Array.isArray(value.values) || value.values.length === 0 || value.values.length > 32)
      issue(issues, `${path}.values`, 'Coalesce requires 1..32 expressions.');
    else
      value.values.forEach((item, index) =>
        expression(item, `${path}.values[${index}]`, issues, depth + 1),
      );
  } else {
    expression(value.left, `${path}.left`, issues, depth + 1);
    expression(value.right, `${path}.right`, issues, depth + 1);
  }
}

export function validateTransformExpression(
  value: unknown,
  path: string,
  issues: SpecIssue[],
): void {
  expression(value, path, issues);
}

function positive(value: unknown, path: string, issues: SpecIssue[], integer = false): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    (integer && !Number.isInteger(value))
  )
    issue(issues, path, `Value must be a positive${integer ? ' integer' : ''}.`);
}

function groupby(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value !== undefined) fields(value, path, issues, true);
}

function sort(value: unknown, path: string, issues: SpecIssue[]): void {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) {
    issue(issues, path, 'Sort must contain 1..32 field declarations.');
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isPlainObject(item)) {
      issue(issues, itemPath, 'Sort field must be an object.');
      return;
    }
    Object.keys(item).forEach((key) => {
      if (!['field', 'order'].includes(key))
        issue(issues, `${itemPath}.${key}`, `Unknown sort property "${key}".`);
    });
    field(item.field, `${itemPath}.field`, issues);
    if (item.order !== undefined && item.order !== 'ascending' && item.order !== 'descending')
      issue(issues, `${itemPath}.order`, 'Sort order must be ascending or descending.');
  });
}

const keys: Readonly<Record<string, readonly string[]>> = {
  filter: ['type', 'expr'],
  sort: ['type', 'by'],
  calculate: ['type', 'as', 'expr'],
  aggregate: ['type', 'groupby', 'fields'],
  joinaggregate: ['type', 'groupby', 'fields'],
  bin: ['type', 'field', 'as', 'maxbins', 'step', 'extent'],
  bin2d: ['type', 'x', 'y', 'as', 'maxbins'],
  density1d: ['type', 'field', 'as', 'groupby', 'points', 'bandwidth'],
  density2d: ['type', 'x', 'y', 'as', 'bins', 'bandwidth'],
  stack: ['type', 'field', 'groupby', 'series', 'sort', 'as', 'offset', 'order'],
  window: ['type', 'fields', 'groupby', 'sort', 'frame'],
  regression: ['type', 'x', 'y', 'as', 'groupby'],
  fold: ['type', 'fields', 'as'],
  flatten: ['type', 'fields', 'as'],
  pivot: ['type', 'field', 'value', 'groupby', 'op'],
  impute: ['type', 'field', 'key', 'groupby', 'method', 'value'],
  lookup: ['type', 'field', 'from', 'key', 'values', 'as', 'default'],
  quantile: ['type', 'field', 'probs', 'as', 'groupby'],
  sample: ['type', 'size', 'seed'],
  resample: ['type', 'field', 'interval', 'groupby', 'method'],
  timeUnit: ['type', 'field', 'unit', 'as', 'utc'],
};

export function validateTransforms(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 128) {
    issue(issues, path, 'Transforms must be an ordered array of at most 128 entries.');
    return;
  }
  value.forEach((transform, index) => {
    const itemPath = `${path}[${index}]`;
    if (
      !isPlainObject(transform) ||
      typeof transform.type !== 'string' ||
      !types.has(transform.type)
    ) {
      issue(issues, itemPath, 'Transform type is not supported.');
      return;
    }
    const t = transform.type as string;
    Object.keys(transform).forEach((key) => {
      if (!keys[t]!.includes(key))
        issue(issues, `${itemPath}.${key}`, `Unknown ${t} transform property "${key}".`);
    });
    if (t === 'filter' || t === 'calculate') expression(transform.expr, `${itemPath}.expr`, issues);
    if (t === 'calculate') field(transform.as, `${itemPath}.as`, issues);
    if (t === 'sort') sort(transform.by, `${itemPath}.by`, issues);
    if (['aggregate', 'joinaggregate'].includes(t)) {
      groupby(transform.groupby, `${itemPath}.groupby`, issues);
      if (
        !Array.isArray(transform.fields) ||
        transform.fields.length === 0 ||
        transform.fields.length > 128
      )
        issue(issues, `${itemPath}.fields`, 'Aggregate fields must contain 1..128 entries.');
      else
        transform.fields.forEach((entry, entryIndex) => {
          const entryPath = `${itemPath}.fields[${entryIndex}]`;
          if (!isPlainObject(entry)) {
            issue(issues, entryPath, 'Aggregate field must be an object.');
            return;
          }
          Object.keys(entry).forEach((key) => {
            if (!['op', 'field', 'weight', 'as'].includes(key))
              issue(issues, `${entryPath}.${key}`, `Unknown aggregate field property "${key}".`);
          });
          if (
            ![
              'count',
              'valid',
              'missing',
              'sum',
              'mean',
              'weightedMean',
              'min',
              'max',
              'median',
              'variance',
              'stdev',
            ].includes(String(entry.op))
          )
            issue(issues, `${entryPath}.op`, 'Aggregate operation is not supported.');
          field(entry.as, `${entryPath}.as`, issues);
          if (entry.field !== undefined) field(entry.field, `${entryPath}.field`, issues);
          if (entry.weight !== undefined) field(entry.weight, `${entryPath}.weight`, issues);
          if (
            entry.op === 'weightedMean' &&
            (entry.field === undefined || entry.weight === undefined)
          )
            issue(issues, entryPath, 'weightedMean requires field and weight.');
          if (!['count'].includes(String(entry.op)) && entry.field === undefined)
            issue(issues, `${entryPath}.field`, `${String(entry.op)} requires a field.`);
        });
    }
    for (const name of ['field', 'x', 'y', 'key', 'value'] as const)
      if (transform[name] !== undefined && !(['impute'].includes(t) && name === 'value'))
        field(transform[name], `${itemPath}.${name}`, issues);
    groupby(transform.groupby, `${itemPath}.groupby`, issues);
    if (transform.series !== undefined)
      fields(transform.series, `${itemPath}.series`, issues, true);
    if (transform.sort !== undefined) sort(transform.sort, `${itemPath}.sort`, issues);
    if (t === 'bin') tuple(transform.as, 2, `${itemPath}.as`, issues);
    if (t === 'bin2d') tuple(transform.as, 5, `${itemPath}.as`, issues);
    if (t === 'density1d' || t === 'regression' || t === 'fold' || t === 'quantile')
      tuple(transform.as, 2, `${itemPath}.as`, issues);
    if (t === 'density2d') tuple(transform.as, 3, `${itemPath}.as`, issues);
    if (t === 'stack') tuple(transform.as, 2, `${itemPath}.as`, issues);
    if (t === 'flatten' && transform.as !== undefined)
      fields(transform.as, `${itemPath}.as`, issues);
    if (t === 'fold' || t === 'flatten') fields(transform.fields, `${itemPath}.fields`, issues);
    if (t === 'lookup') {
      fields(transform.values, `${itemPath}.values`, issues);
      if (transform.as !== undefined) fields(transform.as, `${itemPath}.as`, issues);
      if (
        !Array.isArray(transform.as) ||
        !Array.isArray(transform.values) ||
        transform.as.length !== transform.values.length
      ) {
        if (transform.as !== undefined)
          issue(issues, `${itemPath}.as`, 'Lookup as must match values length.');
      }
      if (!Array.isArray(transform.from) && !isPlainObject(transform.from))
        issue(issues, `${itemPath}.from`, 'Lookup from must be inline data.');
    }
    if (t === 'window') {
      if (!Array.isArray(transform.fields) || transform.fields.length === 0)
        issue(issues, `${itemPath}.fields`, 'Window fields are required.');
      else
        transform.fields.forEach((entry, entryIndex) => {
          const entryPath = `${itemPath}.fields[${entryIndex}]`;
          if (!isPlainObject(entry)) {
            issue(issues, entryPath, 'Window field must be an object.');
            return;
          }
          Object.keys(entry).forEach((key) => {
            if (!['op', 'field', 'as', 'offset'].includes(key))
              issue(issues, `${entryPath}.${key}`, `Unknown window field property "${key}".`);
          });
          const op = String(entry.op);
          if (
            ![
              'rowNumber',
              'rank',
              'denseRank',
              'lag',
              'lead',
              'sum',
              'mean',
              'min',
              'max',
              'count',
              'cumulativeSum',
              'movingAverage',
            ].includes(op)
          )
            issue(issues, `${entryPath}.op`, 'Window operation is not supported.');
          field(entry.as, `${entryPath}.as`, issues);
          if (entry.field !== undefined) field(entry.field, `${entryPath}.field`, issues);
          if (
            !['rowNumber', 'rank', 'denseRank', 'count'].includes(op) &&
            entry.field === undefined
          )
            issue(issues, `${entryPath}.field`, `${op} requires a field.`);
          if (
            entry.offset !== undefined &&
            (typeof entry.offset !== 'number' ||
              !Number.isInteger(entry.offset) ||
              entry.offset < 0)
          )
            issue(issues, `${entryPath}.offset`, 'Window offset must be a non-negative integer.');
        });
    }
    for (const name of ['maxbins', 'points', 'bandwidth', 'size', 'interval'] as const) {
      const current = transform[name];
      if (current !== undefined && typeof current === 'number') {
        positive(
          current,
          `${itemPath}.${name}`,
          issues,
          ['maxbins', 'points', 'size'].includes(name),
        );
        if (name === 'points' && current > 512)
          issue(issues, `${itemPath}.${name}`, 'density1d points must not exceed 512.');
      }
    }
    if (t === 'quantile' && transform.probs !== undefined) {
      if (
        !Array.isArray(transform.probs) ||
        transform.probs.length === 0 ||
        transform.probs.length > 512
      )
        issue(issues, `${itemPath}.probs`, 'Quantile probabilities must contain 1..512 values.');
      else
        transform.probs.forEach((probability, probabilityIndex) => {
          if (typeof probability !== 'number' || probability < 0 || probability > 1)
            issue(
              issues,
              `${itemPath}.probs[${probabilityIndex}]`,
              'Probability must be between 0 and 1.',
            );
        });
    }
    if (t === 'stack') {
      if (
        transform.offset !== undefined &&
        !['zero', 'normalize', 'expand', 'center', 'silhouette', 'wiggle'].includes(
          String(transform.offset),
        )
      )
        issue(issues, `${itemPath}.offset`, 'Stack offset is not supported.');
      if (
        transform.order !== undefined &&
        ![
          'input',
          'ascending',
          'descending',
          'sumAscending',
          'sumDescending',
          'insideOut',
        ].includes(String(transform.order))
      )
        issue(issues, `${itemPath}.order`, 'Stack order is not supported.');
    }
    if (
      t === 'pivot' &&
      transform.op !== undefined &&
      !['sum', 'mean', 'min', 'max', 'count', 'first'].includes(String(transform.op))
    )
      issue(issues, `${itemPath}.op`, 'Pivot operation is not supported.');
    if (
      t === 'impute' &&
      transform.method !== undefined &&
      !['value', 'mean', 'median', 'min', 'max'].includes(String(transform.method))
    )
      issue(issues, `${itemPath}.method`, 'Impute method is not supported.');
    if (
      t === 'resample' &&
      transform.method !== undefined &&
      !['linear', 'previous', 'next'].includes(String(transform.method))
    )
      issue(issues, `${itemPath}.method`, 'Resample method is not supported.');
    if (t === 'timeUnit') {
      if (
        ![
          'year',
          'quarter',
          'month',
          'week',
          'date',
          'day',
          'hours',
          'minutes',
          'seconds',
        ].includes(String(transform.unit))
      )
        issue(issues, `${itemPath}.unit`, 'Time unit is not supported.');
      if (transform.utc !== undefined && typeof transform.utc !== 'boolean')
        issue(issues, `${itemPath}.utc`, 'Time unit utc must be boolean.');
    }
    if (
      t === 'bin' &&
      transform.extent !== undefined &&
      (!Array.isArray(transform.extent) ||
        transform.extent.length !== 2 ||
        transform.extent.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry)))
    )
      issue(issues, `${itemPath}.extent`, 'Bin extent must contain two finite numbers.');
    for (const name of ['maxbins', 'bins', 'bandwidth', 'frame'] as const) {
      const current = transform[name];
      if (Array.isArray(current)) {
        if (current.length !== 2)
          issue(issues, `${itemPath}.${name}`, `${name} must contain exactly two values.`);
        else if (name === 'frame')
          current.forEach((entry, entryIndex) => {
            if (entry !== null && !Number.isInteger(entry))
              issue(
                issues,
                `${itemPath}.${name}[${entryIndex}]`,
                'Window frame values must be integers or null.',
              );
          });
        else
          current.forEach((entry, entryIndex) => {
            if (
              typeof entry !== 'number' ||
              !Number.isFinite(entry) ||
              entry <= 0 ||
              (['maxbins', 'bins'].includes(name) && (!Number.isInteger(entry) || entry > 128))
            )
              issue(
                issues,
                `${itemPath}.${name}[${entryIndex}]`,
                `${name} values must be positive${['maxbins', 'bins'].includes(name) ? ' integers up to 128' : ''}.`,
              );
          });
      }
    }
    if (
      transform.seed !== undefined &&
      (typeof transform.seed !== 'number' || !Number.isFinite(transform.seed))
    )
      issue(issues, `${itemPath}.seed`, 'Sample seed must be finite.');
  });
}
