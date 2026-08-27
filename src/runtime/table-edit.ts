import { buildTableModel } from '../data/family-layouts.js';
import { parseTemporalValue } from '../format/temporal.js';
import type { ChartTableRuntimeState } from '../interaction/family-runtime.js';
import type { DataRow, DataValue, JsonValue } from '../spec/types.js';
import { assertSafeKey, isPlainObject } from '../utils/object.js';

export type TableDataMode = 'view' | 'source';
export type TableCellTarget = number | { readonly key: DataValue };
export type TableEditCommit = 'enter' | 'blur' | 'enter-or-blur';
export type TableEditorType =
  'text' | 'number' | 'integer' | 'date' | 'datetime' | 'boolean' | 'select';

export type TableEditChangeReason =
  | 'programmatic'
  | 'overlay'
  | 'undo'
  | 'redo'
  | 'reset'
  | 'editing-disabled'
  | 'derived-view-read-only'
  | 'row-not-found'
  | 'duplicate-key'
  | 'field-not-editable'
  | 'source-row-unavailable'
  | 'required'
  | 'invalid-type'
  | 'minimum'
  | 'maximum'
  | 'minimum-length'
  | 'maximum-length'
  | 'pattern'
  | 'not-allowed';

export interface TableEditorConfig {
  readonly type: TableEditorType;
  readonly options: readonly DataValue[];
}

export interface TableColumnValidation {
  readonly required: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly values: readonly DataValue[];
}

export interface TableColumnEditing {
  readonly field: string;
  readonly visible: boolean;
  readonly editable: boolean;
  readonly editorAuthored: boolean;
  readonly editor: TableEditorConfig;
  readonly validation: TableColumnValidation;
}

export interface TableEditingConfig {
  readonly enabled: boolean;
  readonly key?: string;
  readonly commit: TableEditCommit;
  readonly columns: ReadonlyMap<string, TableColumnEditing>;
  readonly visibleFields?: readonly string[];
}

export interface TableViewData {
  readonly rows: readonly DataRow[];
  readonly sourceIndices: readonly (number | null)[];
  /** Source rows that retain exactly one editable lineage before runtime filtering. */
  readonly editableSourceIndices: readonly number[];
  readonly fields: readonly string[];
  readonly derived: boolean;
}

export interface TableEditValidationResult {
  readonly valid: boolean;
  readonly reason: TableEditChangeReason;
}

export interface TableDataTransition {
  readonly previous: readonly DataRow[];
  readonly rows: readonly DataRow[];
}

interface TableCellPatch {
  readonly row: number;
  readonly field: string;
  readonly previous: DataValue;
  readonly next: DataValue;
  readonly previousPresent: boolean;
  readonly nextPresent: boolean;
}

interface TableDataPatch {
  readonly cells: readonly TableCellPatch[];
}

const editorTypes = new Set<TableEditorType>([
  'text',
  'number',
  'integer',
  'date',
  'datetime',
  'boolean',
  'select',
]);

const maximumTablePatternLength = 256;
const maximumTablePatternQuantifiers = 24;
const maximumTablePatternRepeat = 10_000;

/**
 * Validate the bounded regular-expression subset accepted by table cells.
 *
 * Native regular expressions stay data-only, Unicode-aware, and useful for
 * anchored business identifiers. Backreferences, groups, alternation,
 * unbounded quantifiers, nested/repeated quantifiers, excessive repetition,
 * and controls are rejected before any authored pattern can reach RegExp.test().
 */
export function isSafeTableValidationPattern(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maximumTablePatternLength ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return false;
  }
  try {
    new RegExp(value, 'u');
  } catch {
    return false;
  }

  let escaped = false;
  let inClass = false;
  let previousQuantifiable = false;
  let previousClosedGroup = false;
  let previousQuantifier = false;
  let quantifiers = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (escaped) {
      if (!inClass && (/[1-9]/u.test(character) || character === 'k')) return false;
      escaped = false;
      previousQuantifiable = true;
      previousClosedGroup = false;
      previousQuantifier = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (inClass) {
      if (character === ']') {
        inClass = false;
        previousQuantifiable = true;
        previousClosedGroup = false;
        previousQuantifier = false;
      }
      continue;
    }
    if (character === '[') {
      inClass = true;
      previousQuantifiable = false;
      previousClosedGroup = false;
      previousQuantifier = false;
      continue;
    }
    if (
      character === '(' ||
      character === ')' ||
      character === '|' ||
      character === '*' ||
      character === '+'
    ) {
      return false;
    }

    let quantifierEnd = index;
    let maximumRepeat: number | undefined;
    if (character === '{') {
      const match = /^\{(\d+)(?:,(\d*))?\}/u.exec(value.slice(index));
      if (match !== null) {
        quantifierEnd = index + match[0].length - 1;
        maximumRepeat =
          match[2] === '' ? maximumTablePatternRepeat + 1 : Number(match[2] ?? match[1]);
      }
    }
    const quantifier = character === '?' || quantifierEnd > index;
    if (quantifier) {
      quantifiers += 1;
      if (
        !previousQuantifiable ||
        previousClosedGroup ||
        previousQuantifier ||
        quantifiers > maximumTablePatternQuantifiers ||
        (maximumRepeat !== undefined && maximumRepeat > maximumTablePatternRepeat)
      ) {
        return false;
      }
      previousQuantifiable = false;
      previousClosedGroup = false;
      previousQuantifier = true;
      index = quantifierEnd;
      continue;
    }
    previousQuantifiable = character !== '^' && character !== '$' && character !== '|';
    previousClosedGroup = false;
    previousQuantifier = false;
  }
  return !escaped && !inClass;
}

function dataValue(value: unknown): value is DataValue {
  return (
    value === undefined ||
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (value instanceof Date && Number.isFinite(value.getTime())) ||
    (Array.isArray(value) &&
      value.every(
        (entry) =>
          entry === null ||
          typeof entry === 'string' ||
          typeof entry === 'boolean' ||
          (typeof entry === 'number' && Number.isFinite(entry)),
      ))
  );
}

function finiteOption(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function integerOption(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

export function cloneTableDataValue(value: DataValue): DataValue {
  if (value instanceof Date) return new Date(value.getTime());
  return Array.isArray(value) ? [...value] : value;
}

export function cloneTableRows(rows: readonly DataRow[]): readonly DataRow[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([field, value]) => {
        assertSafeKey(field, `data.${field}`);
        return [field, cloneTableDataValue(value)];
      }),
    ),
  );
}

export function tableDataValuesEqual(left: DataValue, right: DataValue): boolean {
  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => Object.is(entry, right[index]))
    );
  }
  return Object.is(left, right);
}

function tableDataPatch(
  previous: readonly DataRow[],
  next: readonly DataRow[],
): TableDataPatch | null {
  if (previous.length !== next.length) return null;
  const cells: TableCellPatch[] = [];
  for (let row = 0; row < previous.length; row += 1) {
    const before = previous[row]!;
    const after = next[row]!;
    const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const field of fields) {
      const previousPresent = Object.prototype.hasOwnProperty.call(before, field);
      const nextPresent = Object.prototype.hasOwnProperty.call(after, field);
      if (previousPresent === nextPresent && tableDataValuesEqual(before[field], after[field])) {
        continue;
      }
      cells.push({
        row,
        field,
        previous: cloneTableDataValue(before[field]),
        next: cloneTableDataValue(after[field]),
        previousPresent,
        nextPresent,
      });
    }
  }
  return { cells };
}

function applyTableDataPatch(
  rows: readonly DataRow[],
  patch: TableDataPatch,
  direction: 'undo' | 'redo',
): readonly DataRow[] {
  const output = cloneTableRows(rows) as Record<string, DataValue>[];
  for (const cell of patch.cells) {
    const row = output[cell.row];
    if (row === undefined) continue;
    const present = direction === 'undo' ? cell.previousPresent : cell.nextPresent;
    const value = direction === 'undo' ? cell.previous : cell.next;
    if (present) row[cell.field] = cloneTableDataValue(value);
    else delete row[cell.field];
  }
  return output;
}

/** Bounded immutable cell-patch history; large source arrays are not retained per edit. */
export class TableDataHistory {
  readonly #limit: number;
  readonly #baseline: readonly DataRow[];
  #current: readonly DataRow[];
  #past: TableDataPatch[] = [];
  #future: TableDataPatch[] = [];

  constructor(rows: readonly DataRow[], limit = 100) {
    this.#limit = Math.max(1, Math.min(1_000, Math.floor(limit)));
    this.#baseline = cloneTableRows(rows);
    this.#current = cloneTableRows(rows);
  }

  rows(): readonly DataRow[] {
    return cloneTableRows(this.#current);
  }

  replace(rows: readonly DataRow[]): boolean {
    const next = cloneTableRows(rows);
    const patch = tableDataPatch(this.#current, next);
    if (patch === null) {
      throw new RangeError('Table edit history cannot change the source row count.');
    }
    if (patch.cells.length === 0) return false;
    this.#past.push(patch);
    if (this.#past.length > this.#limit) this.#past.shift();
    this.#current = next;
    this.#future = [];
    return true;
  }

  reset(): TableDataTransition | null {
    const previous = cloneTableRows(this.#current);
    if (!this.replace(this.#baseline)) return null;
    return { previous, rows: this.rows() };
  }

  undo(): TableDataTransition | null {
    const patch = this.#past.pop();
    if (patch === undefined) return null;
    const previous = cloneTableRows(this.#current);
    this.#future.push(patch);
    this.#current = applyTableDataPatch(this.#current, patch, 'undo');
    return { previous: cloneTableRows(previous), rows: this.rows() };
  }

  redo(): TableDataTransition | null {
    const patch = this.#future.pop();
    if (patch === undefined) return null;
    const previous = cloneTableRows(this.#current);
    this.#past.push(patch);
    this.#current = applyTableDataPatch(this.#current, patch, 'redo');
    return { previous: cloneTableRows(previous), rows: this.rows() };
  }
}

function editorConfig(value: unknown): TableEditorConfig {
  const object = isPlainObject(value) ? value : undefined;
  const type =
    object !== undefined &&
    typeof object.type === 'string' &&
    editorTypes.has(object.type as TableEditorType)
      ? (object.type as TableEditorType)
      : 'text';
  const options =
    object !== undefined && Array.isArray(object.options)
      ? object.options.filter(dataValue).map(cloneTableDataValue)
      : [];
  return { type, options };
}

function validationConfig(value: unknown): TableColumnValidation {
  const object = isPlainObject(value) ? value : {};
  const min = finiteOption(object.min);
  const max = finiteOption(object.max);
  const minLength = integerOption(object.minLength);
  const maxLength = integerOption(object.maxLength);
  if (object.pattern !== undefined && !isSafeTableValidationPattern(object.pattern)) {
    throw new RangeError('Table validation pattern is invalid or outside the safe subset.');
  }
  return {
    required: object.required === true,
    ...(min === undefined ? {} : { min }),
    ...(max === undefined ? {} : { max }),
    ...(minLength === undefined ? {} : { minLength }),
    ...(maxLength === undefined ? {} : { maxLength }),
    ...(object.pattern === undefined ? {} : { pattern: object.pattern as string }),
    values: Array.isArray(object.values)
      ? object.values.filter(dataValue).map(cloneTableDataValue)
      : [],
  };
}

/** Read the closed portable editing contract without trusting unvalidated JSON. */
export function tableEditingConfig(
  options: Readonly<Record<string, JsonValue>>,
): TableEditingConfig {
  const editingValue = options.editing;
  const editing = isPlainObject(editingValue) ? editingValue : undefined;
  const enabled = editingValue !== false && editing?.enabled !== false;
  const key =
    editing !== undefined && typeof editing.key === 'string' && editing.key.trim() !== ''
      ? editing.key
      : undefined;
  if (key !== undefined) assertSafeKey(key, '$.mark.options.editing.key');
  const commit: TableEditCommit =
    editing?.commit === 'enter' || editing?.commit === 'blur' ? editing.commit : 'enter-or-blur';
  const columns = new Map<string, TableColumnEditing>();
  const visibleFields: string[] = [];
  if (Array.isArray(options.columns)) {
    for (const entry of options.columns) {
      const object = isPlainObject(entry) ? entry : undefined;
      const field = typeof entry === 'string' ? entry : object?.field;
      if (typeof field !== 'string' || field === '' || columns.has(field)) continue;
      assertSafeKey(field, '$.mark.options.columns[].field');
      const visible = object?.visible !== false;
      const editor = editorConfig(object?.editor);
      const validation = validationConfig(object?.validation);
      const column = {
        field,
        visible,
        editable: object?.editable === true,
        editorAuthored: object?.editor !== undefined,
        editor,
        validation: {
          ...validation,
          values: validation.values.length > 0 ? validation.values : editor.options,
        },
      } satisfies TableColumnEditing;
      columns.set(field, column);
      if (visible) visibleFields.push(field);
    }
  }
  return {
    enabled,
    ...(key === undefined ? {} : { key }),
    commit,
    columns,
    ...(Array.isArray(options.columns) ? { visibleFields } : {}),
  };
}

export function tableColumnEditingForValue(
  column: TableColumnEditing,
  value: DataValue,
): TableColumnEditing {
  if (column.editorAuthored) return column;
  const type: TableEditorType =
    typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text';
  return { ...column, editor: { ...column.editor, type } };
}

function projectRow(row: Readonly<Record<string, unknown>>, fields: readonly string[]): DataRow {
  const output: Record<string, DataValue> = Object.create(null) as Record<string, DataValue>;
  for (const field of fields) {
    const value = row[field];
    if (dataValue(value)) output[field] = cloneTableDataValue(value);
  }
  return output;
}

/** Materialize the full current table view; virtual windows are intentionally not export boundaries. */
export function tableViewData(
  rows: readonly DataRow[],
  state: ChartTableRuntimeState,
  visibleFields?: readonly string[],
): TableViewData {
  const model = buildTableModel(rows, {
    filters: state.filters,
    sort: state.sort,
    ...(state.group === null ? {} : { group: state.group }),
    ...(state.pivot === null ? {} : { pivot: state.pivot }),
    ...(visibleFields === undefined ? {} : { columns: visibleFields }),
  });
  return {
    rows: model.allRows.map((row) => projectRow(row, model.columns)),
    sourceIndices: model.allRows.map((row) =>
      typeof row.__sourceIndex === 'number' && Number.isInteger(row.__sourceIndex)
        ? row.__sourceIndex
        : null,
    ),
    editableSourceIndices: rows.map((_, index) => index),
    fields: [...model.columns],
    derived: state.group !== null || state.pivot !== null,
  };
}

function comparable(value: DataValue, type: TableEditorType): number | null {
  if ((type === 'number' || type === 'integer') && typeof value === 'number') return value;
  if (type === 'date' || type === 'datetime') {
    const parsed = parseTemporalValue(value);
    return parsed === null ? null : parsed.value.getTime();
  }
  return null;
}

/** Validate already-typed programmatic values. UI string coercion happens at the overlay boundary. */
export function validateTableCellValue(
  column: TableColumnEditing,
  value: DataValue,
): TableEditValidationResult {
  const empty = value === null || value === undefined || value === '';
  if (column.validation.required && empty) return { valid: false, reason: 'required' };
  if (empty && !column.validation.required) return { valid: true, reason: 'programmatic' };

  const type = column.editor.type;
  const typed =
    type === 'text'
      ? typeof value === 'string'
      : type === 'number'
        ? typeof value === 'number' && Number.isFinite(value)
        : type === 'integer'
          ? typeof value === 'number' && Number.isSafeInteger(value)
          : type === 'boolean'
            ? typeof value === 'boolean'
            : type === 'date'
              ? typeof value === 'string' && parseTemporalValue(value)?.dateOnly === true
              : type === 'datetime'
                ? ((value instanceof Date && Number.isFinite(value.getTime())) ||
                    typeof value === 'string') &&
                  parseTemporalValue(value)?.dateOnly === false
                : column.editor.options.some((candidate) => tableDataValuesEqual(candidate, value));
  if (!typed) return { valid: false, reason: 'invalid-type' };

  const allowed = column.validation.values;
  if (allowed.length > 0 && !allowed.some((candidate) => tableDataValuesEqual(candidate, value))) {
    return { valid: false, reason: 'not-allowed' };
  }
  const numeric = comparable(value, type);
  if (column.validation.min !== undefined && numeric !== null && numeric < column.validation.min) {
    return { valid: false, reason: 'minimum' };
  }
  if (column.validation.max !== undefined && numeric !== null && numeric > column.validation.max) {
    return { valid: false, reason: 'maximum' };
  }
  if (typeof value === 'string') {
    if (column.validation.minLength !== undefined && value.length < column.validation.minLength) {
      return { valid: false, reason: 'minimum-length' };
    }
    if (column.validation.maxLength !== undefined && value.length > column.validation.maxLength) {
      return { valid: false, reason: 'maximum-length' };
    }
  }
  if (
    column.validation.pattern !== undefined &&
    (typeof value !== 'string' ||
      !isSafeTableValidationPattern(column.validation.pattern) ||
      value.length > 4_096 ||
      !new RegExp(column.validation.pattern, 'u').test(value))
  ) {
    return { valid: false, reason: 'pattern' };
  }
  return { valid: true, reason: 'programmatic' };
}

export function parseTableEditorValue(
  column: TableColumnEditing,
  value: string,
  checked = false,
  selectedIndex = -1,
): DataValue {
  switch (column.editor.type) {
    case 'number':
    case 'integer':
      return value.trim() === '' ? null : Number(value);
    case 'boolean':
      return checked;
    case 'select':
      return selectedIndex >= 0 ? cloneTableDataValue(column.editor.options[selectedIndex]) : null;
    default:
      return value;
  }
}

function portableValue(
  value: DataValue,
): string | number | boolean | null | readonly (string | number | boolean | null)[] {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function tableJSON(rows: readonly DataRow[]): string {
  return JSON.stringify(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([field, value]) => [field, portableValue(value)]),
      ),
    ),
  );
}

function csvText(value: DataValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

function csvCell(value: DataValue): string {
  let text = csvText(value);
  // Keep exports inert when opened by spreadsheet software.
  if (typeof value === 'string' && /^[\t\r\n ]*[=+\-@]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function tableCSV(rows: readonly DataRow[], fields?: readonly string[]): string {
  const columns = fields ?? [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [columns.map((field) => csvCell(field)).join(',')];
  for (const row of rows) lines.push(columns.map((field) => csvCell(row[field])).join(','));
  return lines.join('\r\n');
}
