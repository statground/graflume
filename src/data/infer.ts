import type { FieldType } from '../spec/types.js';
import { DataTable } from './table.js';

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}(?:T|$)/;

export function inferFieldType(table: DataTable, field: string): FieldType {
  const column = table.column(field);
  for (let index = 0; index < table.length; index += 1) {
    const value = column[index];
    if (value === null || value === undefined) continue;
    if (value instanceof Date) return 'temporal';
    if (typeof value === 'number') return 'quantitative';
    if (
      typeof value === 'string' &&
      ISO_DATE_PREFIX.test(value) &&
      Number.isFinite(Date.parse(value))
    ) {
      return 'temporal';
    }
    return 'nominal';
  }
  return 'nominal';
}
