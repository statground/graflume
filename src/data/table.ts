import { GraflumeError } from '../core/errors.js';
import { temporalTimestamp } from '../format/temporal.js';
import type { ColumnarData, ColumnLike, DataInput, DataRow, DataValue } from '../spec/types.js';
import { assertSafeKey, finiteNumber, ownValue } from '../utils/object.js';

function isColumnarData(input: DataInput): input is ColumnarData {
  return !Array.isArray(input);
}

function inferColumnarLength(input: ColumnarData): number {
  const entries = Object.entries(input.columns);
  if (entries.length === 0) return input.length ?? 0;
  const inferred = input.length ?? entries[0]?.[1].length ?? 0;
  for (const [name, column] of entries) {
    assertSafeKey(name, `data.columns.${name}`);
    if (column.length !== inferred) {
      throw new GraflumeError(
        'INVALID_DATA',
        `Column "${name}" has length ${column.length}; expected ${inferred}.`,
        { path: `data.columns.${name}` },
      );
    }
  }
  return inferred;
}

export class DataTable {
  readonly #columns = new Map<string, ColumnLike>();
  #length = 0;

  static from(input: DataInput): DataTable {
    return isColumnarData(input) ? DataTable.fromColumns(input) : DataTable.fromRows(input);
  }

  static fromRows(rows: readonly DataRow[]): DataTable {
    const table = new DataTable();
    const fieldOrder: string[] = [];
    const fields = new Set<string>();

    for (const row of rows) {
      for (const key of Object.keys(row)) {
        assertSafeKey(key, `data.${key}`);
        if (!fields.has(key)) {
          fields.add(key);
          fieldOrder.push(key);
        }
      }
    }

    for (const field of fieldOrder) {
      const column = rows.map((row) => ownValue(row, field) as DataValue);
      table.#columns.set(field, column);
    }
    table.#length = rows.length;
    return table;
  }

  static fromColumns(input: ColumnarData): DataTable {
    const table = new DataTable();
    table.#length = inferColumnarLength(input);
    for (const [name, column] of Object.entries(input.columns)) {
      assertSafeKey(name, `data.columns.${name}`);
      table.#columns.set(name, column);
    }
    return table;
  }

  get length(): number {
    return this.#length;
  }

  fields(): readonly string[] {
    return [...this.#columns.keys()];
  }

  has(field: string): boolean {
    assertSafeKey(field, `data.${field}`);
    return this.#columns.has(field);
  }

  column(field: string): ColumnLike {
    assertSafeKey(field, `data.${field}`);
    const column = this.#columns.get(field);
    if (column === undefined) {
      throw new GraflumeError('INVALID_DATA', `Data field "${field}" does not exist.`, {
        path: `data.${field}`,
        details: { availableFields: this.fields() },
      });
    }
    return column;
  }

  value(rowIndex: number, field: string): DataValue {
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= this.#length) {
      throw new GraflumeError('INVALID_DATA', `Row index ${rowIndex} is out of bounds.`, {
        path: `data[${rowIndex}]`,
      });
    }
    return this.column(field)[rowIndex];
  }

  numericValue(rowIndex: number, field: string): number | null {
    const value = this.value(rowIndex, field);
    if (typeof value === 'string') return temporalTimestamp(value, true);
    return finiteNumber(value);
  }

  extent(field: string, asTemporal = false): readonly [number, number] | null {
    const column = this.column(field);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < this.#length; index += 1) {
      const raw = column[index];
      let value: number | null;
      if (asTemporal && typeof raw === 'string') {
        value = temporalTimestamp(raw, true);
      } else {
        value = finiteNumber(raw);
      }
      if (value === null) continue;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : null;
  }

  unique(field: string): readonly string[] {
    const column = this.column(field);
    const values = new Set<string>();
    for (let index = 0; index < this.#length; index += 1) {
      const value = column[index];
      if (value === null || value === undefined) continue;
      values.add(value instanceof Date ? value.toISOString() : String(value));
    }
    return [...values];
  }

  row(index: number): DataRow {
    if (!Number.isInteger(index) || index < 0 || index >= this.#length) {
      throw new GraflumeError('INVALID_DATA', `Row index ${index} is out of bounds.`);
    }
    const row: Record<string, DataValue> = Object.create(null) as Record<string, DataValue>;
    for (const [field, column] of this.#columns) row[field] = column[index];
    return row;
  }

  append(rows: readonly DataRow[]): void {
    if (rows.length === 0) return;

    const allFields = new Set(this.fields());
    for (const row of rows) {
      for (const field of Object.keys(row)) {
        assertSafeKey(field, `data.${field}`);
        allFields.add(field);
      }
    }

    for (const field of allFields) {
      const existing = this.#columns.get(field);
      const mutable: DataValue[] =
        existing === undefined ? Array(this.#length).fill(null) : Array.from(existing);
      for (const row of rows) mutable.push(ownValue(row, field) as DataValue);
      this.#columns.set(field, mutable);
    }
    this.#length += rows.length;
  }
}
