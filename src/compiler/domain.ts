import { GraflumeError } from '../core/errors.js';
import { inferFieldType } from '../data/infer.js';
import { DataTable } from '../data/table.js';
import { BandScale } from '../scale/band.js';
import { LinearScale } from '../scale/linear.js';
import type { Scale } from '../scale/types.js';
import type { FieldType, NormalizedChartSpec, NormalizedLayerSpec } from '../spec/types.js';
import type { PlotArea } from './types.js';

export interface LayerData {
  readonly layer: NormalizedLayerSpec;
  readonly table: DataTable;
  readonly xType: FieldType;
  readonly yType: FieldType;
}

export interface ScaleResolution {
  readonly layers: readonly LayerData[];
  readonly xType: FieldType;
  readonly yType: FieldType;
  readonly xScale: Scale;
  readonly yScale: Scale;
}

function typeFamily(type: FieldType): 'categorical' | 'numeric' | 'temporal' {
  if (type === 'nominal' || type === 'ordinal') return 'categorical';
  return type === 'temporal' ? 'temporal' : 'numeric';
}

function resolveCommonType(types: readonly FieldType[], axis: 'x' | 'y'): FieldType {
  const families = new Set(types.map(typeFamily));
  if (families.size > 1) {
    throw new GraflumeError(
      'INCOMPATIBLE_SCALE',
      `Layers use incompatible ${axis}-axis field types: ${[...families].join(', ')}.`,
      { path: `$.layers[].${axis}.type` },
    );
  }
  const first = types[0] ?? 'nominal';
  if (families.has('categorical')) return first === 'ordinal' ? 'ordinal' : 'nominal';
  return first;
}

function explicitNumericDomain(
  layers: readonly LayerData[],
  axis: 'x' | 'y',
): readonly [number, number] | null {
  for (const { layer } of layers) {
    const domain = layer[axis].scale.domain;
    if (domain?.length === 2 && typeof domain[0] === 'number' && typeof domain[1] === 'number') {
      return [domain[0], domain[1]];
    }
  }
  return null;
}

function numericDomain(
  layers: readonly LayerData[],
  axis: 'x' | 'y',
  fieldType: FieldType,
): readonly [number, number] {
  const explicit = explicitNumericDomain(layers, axis);
  if (explicit !== null) return explicit;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let includeZero = false;

  for (const { layer, table } of layers) {
    const encoding = layer[axis];
    const fields = axis === 'y' && layer.mark.type === 'histogram' ? [] : [encoding.field];
    if (axis === 'x' && (layer.mark.type === 'timeline' || layer.mark.type === 'gantt')) {
      fields.push(layer.mark.fields.end ?? 'end');
    }
    if (axis === 'y' && layer.mark.type === 'candlestick') {
      fields.push(
        layer.mark.fields.open ?? 'open',
        layer.mark.fields.high ?? 'high',
        layer.mark.fields.low ?? 'low',
        layer.mark.fields.close ?? encoding.field,
      );
    }
    if (axis === 'y' && layer.mark.type === 'interval') {
      fields.push(layer.mark.fields.low ?? 'low', layer.mark.fields.high ?? 'high');
    }
    if (axis === 'y' && layer.mark.type === 'diff') {
      fields.push(layer.mark.fields.old ?? 'old', layer.mark.fields.new ?? encoding.field);
    }

    for (const field of new Set(fields)) {
      if (!table.has(field)) continue;
      const extent = table.extent(field, fieldType === 'temporal');
      if (extent !== null) {
        min = Math.min(min, extent[0]);
        max = Math.max(max, extent[1]);
      }
    }

    if (axis === 'y' && layer.mark.type === 'histogram') {
      const binCount = Math.max(
        1,
        Math.min(
          100,
          Math.floor(typeof layer.mark.options.bins === 'number' ? layer.mark.options.bins : 10),
        ),
      );
      const sourceExtent = table.extent(layer.x.field, layer.x.type === 'temporal');
      if (sourceExtent !== null) {
        const counts = Array.from({ length: binCount }, () => 0);
        const span = sourceExtent[1] - sourceExtent[0] || 1;
        for (let index = 0; index < table.length; index += 1) {
          const value = table.numericValue(index, layer.x.field);
          if (value === null) continue;
          const bin = Math.min(
            binCount - 1,
            Math.max(0, Math.floor(((value - sourceExtent[0]) / span) * binCount)),
          );
          counts[bin] = (counts[bin] ?? 0) + 1;
        }
        min = Math.min(min, 0);
        max = Math.max(max, ...counts);
      }
    }

    if (axis === 'y' && layer.mark.type === 'waterfall') {
      let total = 0;
      min = Math.min(min, 0);
      max = Math.max(max, 0);
      for (let index = 0; index < table.length; index += 1) {
        const value = table.numericValue(index, layer.y.field);
        if (value === null) continue;
        const previous = total;
        total += value;
        min = Math.min(min, previous, total);
        max = Math.max(max, previous, total);
      }
    }
    if (
      encoding.scale.zero === true ||
      (axis === 'y' &&
        (layer.mark.type === 'bar' ||
          layer.mark.type === 'area' ||
          layer.mark.type === 'histogram' ||
          layer.mark.type === 'waterfall')) ||
      (axis === 'x' && layer.mark.type === 'bar' && layer.mark.orientation === 'horizontal')
    ) {
      includeZero = true;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new GraflumeError(
      'INVALID_DATA',
      `No numeric values are available for the ${axis}-axis.`,
      {
        path: `$.layers[].${axis}.field`,
      },
    );
  }

  if (includeZero && fieldType !== 'temporal') {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  if (min === max) {
    const delta = min === 0 ? 1 : Math.abs(min) * 0.05;
    min -= delta;
    max += delta;
  }
  return [min, max];
}

function categoricalDomain(layers: readonly LayerData[], axis: 'x' | 'y'): readonly string[] {
  const seen = new Set<string>();
  const domain: string[] = [];
  for (const { layer, table } of layers) {
    const explicit = layer[axis].scale.domain;
    const values = explicit?.map(String) ?? table.unique(layer[axis].field);
    for (const value of values) {
      if (seen.has(value)) continue;
      seen.add(value);
      domain.push(value);
    }
  }
  return domain;
}

export function resolveScales(spec: NormalizedChartSpec, plot: PlotArea): ScaleResolution {
  const layers: LayerData[] = spec.layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      const table = DataTable.from(layer.data);
      return {
        layer,
        table,
        xType: layer.x.type ?? inferFieldType(table, layer.x.field),
        yType: layer.y.type ?? inferFieldType(table, layer.y.field),
      };
    });

  if (layers.length === 0) {
    throw new GraflumeError('INVALID_SPEC', 'At least one visible layer is required.', {
      path: '$.layers',
    });
  }

  const xType = resolveCommonType(
    layers.map((layer) => layer.xType),
    'x',
  );
  const yType = resolveCommonType(
    layers.map((layer) => layer.yType),
    'y',
  );

  const xScale: Scale =
    typeFamily(xType) === 'categorical'
      ? new BandScale({
          domain: categoricalDomain(layers, 'x'),
          range: [plot.x, plot.x + plot.width],
          ...(layers[0]?.layer.x.scale.paddingInner === undefined
            ? {}
            : { paddingInner: layers[0].layer.x.scale.paddingInner }),
          ...(layers[0]?.layer.x.scale.paddingOuter === undefined
            ? {}
            : { paddingOuter: layers[0].layer.x.scale.paddingOuter }),
        })
      : new LinearScale({
          domain: numericDomain(layers, 'x', xType),
          range: [plot.x, plot.x + plot.width],
          kind: xType === 'temporal' ? 'time' : 'linear',
          ...(layers[0]?.layer.x.scale.nice === undefined
            ? {}
            : { nice: layers[0].layer.x.scale.nice }),
          ...(layers[0]?.layer.x.scale.clamp === undefined
            ? {}
            : { clamp: layers[0].layer.x.scale.clamp }),
        });

  const yScale: Scale =
    typeFamily(yType) === 'categorical'
      ? new BandScale({
          domain: categoricalDomain(layers, 'y'),
          range: [plot.y, plot.y + plot.height],
          ...(layers[0]?.layer.y.scale.paddingInner === undefined
            ? {}
            : { paddingInner: layers[0].layer.y.scale.paddingInner }),
          ...(layers[0]?.layer.y.scale.paddingOuter === undefined
            ? {}
            : { paddingOuter: layers[0].layer.y.scale.paddingOuter }),
        })
      : new LinearScale({
          domain: numericDomain(layers, 'y', yType),
          range: [plot.y + plot.height, plot.y],
          kind: yType === 'temporal' ? 'time' : 'linear',
          ...(layers[0]?.layer.y.scale.nice === undefined
            ? {}
            : { nice: layers[0].layer.y.scale.nice }),
          ...(layers[0]?.layer.y.scale.clamp === undefined
            ? {}
            : { clamp: layers[0].layer.y.scale.clamp }),
        });

  return { layers, xType, yType, xScale, yScale };
}
