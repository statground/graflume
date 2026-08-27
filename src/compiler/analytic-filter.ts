import { DataTable } from '../data/table.js';
import { temporalTimestamp } from '../format/temporal.js';
import type { DataLineage } from '../data/transforms.js';
import {
  analyticSelectionPredicate,
  type AnalyticDomainValue,
  type AnalyticSelectionSample,
  type AnalyticSelectionState,
} from '../interaction/analytic-selection.js';
import type { DataValue, FieldType } from '../spec/types.js';
import type { LayerData, ScaleResolution } from './domain.js';

export interface AnalyticFilterSummary {
  readonly inputRows: number;
  readonly outputRows: number;
  readonly layers: Readonly<
    Record<string, { readonly inputRows: number; readonly outputRows: number }>
  >;
}

export interface AnalyticFilterResult {
  readonly scales: ScaleResolution;
  readonly summary: AnalyticFilterSummary;
}

function analyticValue(value: DataValue, type: FieldType): AnalyticDomainValue | undefined {
  if (type === 'nominal' || type === 'ordinal') {
    if (value === null || value === undefined || Array.isArray(value)) return undefined;
    return value instanceof Date ? value.toISOString() : String(value);
  }
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : undefined;
  }
  if (type === 'temporal' && typeof value === 'string') {
    return temporalTimestamp(value, true) ?? undefined;
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function sampleFor(layer: LayerData, rowIndex: number): AnalyticSelectionSample {
  const datum = layer.table.row(rowIndex);
  const x = analyticValue(layer.table.value(rowIndex, layer.layer.x.field), layer.xType);
  const y = analyticValue(layer.table.value(rowIndex, layer.layer.y.field), layer.yType);
  return {
    ...(x === undefined ? {} : { [layer.xAxisId]: x }),
    ...(y === undefined ? {} : { [layer.yAxisId]: y }),
    layerId: layer.layer.id,
    rowIndex,
    datum,
  };
}

function filteredLineage(
  lineage: DataLineage,
  retained: readonly number[],
  inputRows: number,
): DataLineage {
  return {
    ...lineage,
    outputRows: retained.length,
    rowSources: retained.map((index) => lineage.rowSources[index] ?? []),
    summary: `${lineage.summary} Runtime analytic selection retained ${retained.length} of ${inputRows} rows.`,
  };
}

function filteredLayer(
  layer: LayerData,
  matches: (sample: AnalyticSelectionSample) => boolean,
): { readonly layer: LayerData; readonly inputRows: number; readonly outputRows: number } {
  const retained: number[] = [];
  for (let index = 0; index < layer.table.length; index += 1) {
    if (matches(sampleFor(layer, index))) retained.push(index);
  }
  const rows = retained.map((index) => layer.table.row(index));
  return {
    layer: {
      ...layer,
      table: DataTable.fromRows(rows),
      lineage: filteredLineage(layer.lineage, retained, layer.table.length),
    },
    inputRows: layer.table.length,
    outputRows: rows.length,
  };
}

/**
 * Apply a transient analytic predicate after scale resolution. Axes retain the
 * authored/full-data domains while marks, semantic rows, hit targets, labels,
 * and lineage consume only matching rows.
 */
export function filterScaleResolutionByAnalyticSelection(
  scales: ScaleResolution,
  state: AnalyticSelectionState,
): AnalyticFilterResult {
  if (state.selections.length === 0) {
    const rows = scales.layers.reduce((sum, layer) => sum + layer.table.length, 0);
    return {
      scales,
      summary: { inputRows: rows, outputRows: rows, layers: Object.freeze({}) },
    };
  }
  const matches = analyticSelectionPredicate(state);
  const filtered = scales.layers.map((layer) => filteredLayer(layer, matches));
  const layers = filtered.map((entry) => entry.layer);
  const byId = new Map(layers.map((layer) => [layer.layer.id, layer]));
  const axes = Object.fromEntries(
    Object.entries(scales.axes).map(([axis, resolved]) => [
      axis,
      resolved === undefined
        ? resolved
        : {
            ...resolved,
            layers: resolved.layers.flatMap((layer) => {
              const candidate = byId.get(layer.layer.id);
              return candidate === undefined ? [] : [candidate];
            }),
          },
    ]),
  ) as ScaleResolution['axes'];
  const summaries = Object.freeze(
    Object.fromEntries(
      filtered.map((entry) => [
        entry.layer.layer.id,
        { inputRows: entry.inputRows, outputRows: entry.outputRows },
      ]),
    ),
  );
  return {
    scales: { ...scales, layers, axes },
    summary: {
      inputRows: filtered.reduce((sum, entry) => sum + entry.inputRows, 0),
      outputRows: filtered.reduce((sum, entry) => sum + entry.outputRows, 0),
      layers: summaries,
    },
  };
}
