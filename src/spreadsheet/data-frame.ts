import type {
  SpreadsheetCellContent,
  SpreadsheetDataFrame,
  SpreadsheetLimits,
  SpreadsheetScalar,
  SpreadsheetSnapshot,
} from './types.js';

export const defaultSpreadsheetLimits: SpreadsheetLimits = Object.freeze({
  maxRows: 10_000,
  maxColumns: 256,
  maxCells: 200_000,
  maxBytes: 8 * 1024 * 1024,
});

const spreadsheetColumnKinds = new Set(['string', 'number', 'boolean', 'date', 'mixed']);
const unsafeRecordKeys = new Set(Object.getOwnPropertyNames(Object.prototype));
const snapshotKeys = new Set(['format', 'profile', 'data', 'workbook']);

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clonePlainJson(
  value: unknown,
  label: string,
  seen = new WeakSet<object>(),
  depth = 0,
): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains a non-finite number.`);
    return value;
  }
  if (typeof value !== 'object') throw new TypeError(`${label} must contain only JSON values.`);
  if (depth > 100) throw new RangeError(`${label} is nested too deeply.`);
  if (seen.has(value)) throw new TypeError(`${label} must not contain cycles.`);
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item, index) =>
      clonePlainJson(item, `${label}[${index}]`, seen, depth + 1),
    );
    seen.delete(value);
    return result;
  }
  if (!isPlainRecord(value)) throw new TypeError(`${label} must contain only plain JSON objects.`);
  const result: { [key: string]: JsonValue } = {};
  for (const [key, child] of Object.entries(value)) {
    if (unsafeRecordKeys.has(key)) throw new TypeError(`${label}.${key} is not a safe object key.`);
    result[key] = clonePlainJson(child, `${label}.${key}`, seen, depth + 1);
  }
  seen.delete(value);
  return result;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
}

export function resolveSpreadsheetLimits(
  supplied: Partial<SpreadsheetLimits> | undefined,
): SpreadsheetLimits {
  const limits = { ...defaultSpreadsheetLimits, ...supplied };
  assertPositiveInteger(limits.maxRows, 'limits.maxRows');
  assertPositiveInteger(limits.maxColumns, 'limits.maxColumns');
  assertPositiveInteger(limits.maxCells, 'limits.maxCells');
  assertPositiveInteger(limits.maxBytes, 'limits.maxBytes');
  return Object.freeze(limits);
}

function assertIdentifier(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

export function isSpreadsheetFormula(value: unknown): value is {
  readonly formula: string;
  readonly result?: SpreadsheetScalar;
} {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { formula?: unknown; result?: unknown };
  const keys = Object.keys(value);
  if (
    !keys.every((key) => key === 'formula' || key === 'result') ||
    typeof candidate.formula !== 'string' ||
    !candidate.formula.startsWith('=')
  ) {
    return false;
  }
  return (
    candidate.result === undefined ||
    candidate.result === null ||
    typeof candidate.result === 'string' ||
    typeof candidate.result === 'boolean' ||
    (typeof candidate.result === 'number' && Number.isFinite(candidate.result))
  );
}

function assertCellContent(value: unknown, label: string): asserts value is SpreadsheetCellContent {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    isSpreadsheetFormula(value)
  ) {
    return;
  }
  throw new TypeError(`${label} is not a supported cell value.`);
}

export function cloneAndValidateDataFrame(
  input: SpreadsheetDataFrame,
  limits: SpreadsheetLimits,
): SpreadsheetDataFrame {
  if (typeof input !== 'object' || input === null) throw new TypeError('data must be an object.');
  if (!Array.isArray(input.columns) || !Array.isArray(input.rows)) {
    throw new TypeError('data.columns and data.rows must be arrays.');
  }
  if (input.columns.length > limits.maxColumns) {
    throw new RangeError(`data has more than ${limits.maxColumns} columns.`);
  }
  if (input.rows.length > limits.maxRows) {
    throw new RangeError(`data has more than ${limits.maxRows} rows.`);
  }
  if (input.columns.length * input.rows.length > limits.maxCells) {
    throw new RangeError(`data has more than ${limits.maxCells} cells.`);
  }

  const columnIds = new Set<string>();
  const columnLabels = new Set<string>();
  const columns = input.columns.map((column, index) => {
    assertIdentifier(column.id, `columns[${index}].id`);
    if (unsafeRecordKeys.has(column.id)) {
      throw new TypeError(`columns[${index}].id conflicts with an object property.`);
    }
    if (columnIds.has(column.id)) throw new TypeError(`Duplicate column id: ${column.id}.`);
    columnIds.add(column.id);
    assertIdentifier(column.label, `columns[${index}].label`);
    const label = column.label.trim();
    if (columnLabels.has(label)) throw new TypeError(`Duplicate column label: ${label}.`);
    columnLabels.add(label);
    if (column.kind !== undefined && !spreadsheetColumnKinds.has(column.kind)) {
      throw new TypeError(`columns[${index}].kind is not supported.`);
    }
    if (column.readOnly !== undefined && typeof column.readOnly !== 'boolean') {
      throw new TypeError(`columns[${index}].readOnly must be a boolean.`);
    }
    return Object.freeze({
      id: column.id,
      label,
      ...(column.kind === undefined ? {} : { kind: column.kind }),
      ...(column.readOnly === undefined ? {} : { readOnly: column.readOnly }),
    });
  });

  const rowIds = new Set<string>();
  const rows = input.rows.map((row, rowIndex) => {
    assertIdentifier(row.id, `rows[${rowIndex}].id`);
    if (rowIds.has(row.id)) throw new TypeError(`Duplicate row id: ${row.id}.`);
    rowIds.add(row.id);
    if (typeof row.values !== 'object' || row.values === null || Array.isArray(row.values)) {
      throw new TypeError(`rows[${rowIndex}].values must be an object.`);
    }
    const values: Record<string, SpreadsheetCellContent> = {};
    for (const [columnId, value] of Object.entries(row.values)) {
      if (!columnIds.has(columnId)) throw new TypeError(`Unknown column id: ${columnId}.`);
      assertCellContent(value, `rows[${rowIndex}].values.${columnId}`);
      values[columnId] = isSpreadsheetFormula(value)
        ? Object.freeze({
            formula: value.formula,
            ...(value.result === undefined ? {} : { result: value.result }),
          })
        : value;
    }
    return Object.freeze({ id: row.id, values: Object.freeze(values) });
  });

  const data = Object.freeze({ columns: Object.freeze(columns), rows: Object.freeze(rows) });
  const encodedBytes = new TextEncoder().encode(JSON.stringify(data)).byteLength;
  if (encodedBytes > limits.maxBytes) {
    throw new RangeError(`data exceeds the ${limits.maxBytes}-byte limit.`);
  }
  return data;
}

export function validateSpreadsheetSnapshot(
  snapshot: SpreadsheetSnapshot,
  limits: SpreadsheetLimits,
): SpreadsheetSnapshot {
  if (!isPlainRecord(snapshot)) throw new TypeError('Spreadsheet snapshot must be a plain object.');
  if (!Object.keys(snapshot).every((key) => snapshotKeys.has(key))) {
    throw new TypeError('Spreadsheet snapshot contains an unsupported property.');
  }
  if (snapshot?.format !== 'graflume-spreadsheet-v1') {
    throw new TypeError('Unsupported spreadsheet snapshot format.');
  }
  if (snapshot.profile !== 'data-frame' && snapshot.profile !== 'workbook') {
    throw new TypeError('Unsupported spreadsheet snapshot profile.');
  }
  const data = cloneAndValidateDataFrame(snapshot.data, limits);
  const workbook = clonePlainJson(snapshot.workbook, 'snapshot.workbook');
  const checked = { format: snapshot.format, profile: snapshot.profile, data, workbook } as const;
  const encoded = JSON.stringify(checked);
  if (new TextEncoder().encode(encoded).byteLength > limits.maxBytes) {
    throw new RangeError(`snapshot exceeds the ${limits.maxBytes}-byte limit.`);
  }
  assertWorkbookBounds(workbook, limits);
  return Object.freeze(checked);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isPlainRecord(value) ? value : null;
}

function assertWorkbookBounds(workbook: unknown, limits: SpreadsheetLimits): void {
  const root = asRecord(workbook);
  const sheets = asRecord(root?.sheets);
  if (root === null || sheets === null) {
    throw new TypeError('snapshot.workbook must contain a sheet collection.');
  }
  const entries = Object.values(sheets);
  if (entries.length === 0 || entries.length > 16) {
    throw new RangeError('snapshot.workbook must contain between 1 and 16 sheets.');
  }
  let populatedCells = 0;
  for (const [index, value] of entries.entries()) {
    const sheet = asRecord(value);
    if (sheet === null) throw new TypeError(`snapshot workbook sheet ${index} is invalid.`);
    const rowCount = sheet.rowCount;
    const columnCount = sheet.columnCount;
    if (
      typeof rowCount !== 'number' ||
      !Number.isSafeInteger(rowCount) ||
      rowCount <= 0 ||
      rowCount > Math.max(100, limits.maxRows + 20)
    ) {
      throw new RangeError(`snapshot workbook sheet ${index} has an invalid row count.`);
    }
    if (
      typeof columnCount !== 'number' ||
      !Number.isSafeInteger(columnCount) ||
      columnCount <= 0 ||
      columnCount > Math.max(26, limits.maxColumns + 5)
    ) {
      throw new RangeError(`snapshot workbook sheet ${index} has an invalid column count.`);
    }
    const cellData = asRecord(sheet.cellData);
    if (cellData === null) continue;
    for (const [rowKey, row] of Object.entries(cellData)) {
      const rowIndex = Number(rowKey);
      if (!Number.isSafeInteger(rowIndex) || rowIndex < 0 || rowIndex >= rowCount) {
        throw new RangeError(`snapshot workbook sheet ${index} has an out-of-bounds cell row.`);
      }
      const rowData = asRecord(row);
      if (rowData === null) {
        throw new TypeError(`snapshot workbook sheet ${index} has invalid cell data.`);
      }
      for (const columnKey of Object.keys(rowData)) {
        const columnIndex = Number(columnKey);
        if (!Number.isSafeInteger(columnIndex) || columnIndex < 0 || columnIndex >= columnCount) {
          throw new RangeError(
            `snapshot workbook sheet ${index} has an out-of-bounds cell column.`,
          );
        }
      }
      populatedCells += Object.keys(rowData).length;
      if (populatedCells > limits.maxCells + limits.maxRows + limits.maxColumns + 1) {
        throw new RangeError('snapshot workbook contains too many populated cells.');
      }
    }
  }
}

export function emptySpreadsheetData(): SpreadsheetDataFrame {
  return Object.freeze({ columns: Object.freeze([]), rows: Object.freeze([]) });
}
