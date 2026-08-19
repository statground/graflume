import type { DataValue } from '../spec/types.js';

export function scaleInput(value: DataValue): number | string | Date | null {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  return value;
}

export function numericDataValue(value: DataValue, temporal = false): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (temporal && typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  return null;
}
