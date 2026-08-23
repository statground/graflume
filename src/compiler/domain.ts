import { GraflumeError } from '../core/errors.js';
import { inferFieldType } from '../data/infer.js';
import { DataTable } from '../data/table.js';
import { BandScale } from '../scale/band.js';
import { LinearScale } from '../scale/linear.js';
import type { Scale } from '../scale/types.js';
import type { AxisId, FieldType, NormalizedChartSpec, NormalizedLayerSpec } from '../spec/types.js';
import type { PlotArea } from './types.js';

export interface LayerData {
  readonly layer: NormalizedLayerSpec;
  readonly table: DataTable;
  readonly xType: FieldType;
  readonly yType: FieldType;
  readonly xAxisId: 'x' | 'x2';
  readonly yAxisId: 'y' | 'y2';
  readonly xScale: Scale;
  readonly yScale: Scale;
}

export interface ResolvedAxisScale {
  readonly id: AxisId;
  readonly channel: 'x' | 'y';
  readonly fieldType: FieldType;
  readonly scale: Scale;
  readonly layers: readonly LayerData[];
}

export interface ScaleResolution {
  readonly layers: readonly LayerData[];
  readonly axes: Readonly<Partial<Record<AxisId, ResolvedAxisScale>>>;
  /** Primary-axis compatibility aliases. Prefer `axes` and layer-local scales. */
  readonly xType: FieldType;
  readonly yType: FieldType;
  readonly xScale: Scale;
  readonly yScale: Scale;
}

interface PreparedLayerData {
  readonly layer: NormalizedLayerSpec;
  readonly table: DataTable;
  readonly xType: FieldType;
  readonly yType: FieldType;
  readonly xAxisId: 'x' | 'x2';
  readonly yAxisId: 'y' | 'y2';
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
  layers: readonly PreparedLayerData[],
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
  layers: readonly PreparedLayerData[],
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
    const fields =
      axis === 'y' && (layer.mark.type === 'histogram' || layer.mark.type === 'theme-river')
        ? []
        : [encoding.field];
    if (axis === 'x' && (layer.mark.type === 'timeline' || layer.mark.type === 'gantt')) {
      fields.push(layer.mark.fields.end ?? 'end');
    }
    if (axis === 'x' && (layer.mark.type === 'lines' || layer.mark.type === 'custom')) {
      const x2 = layer.mark.fields.x2;
      if (x2 !== undefined) fields.push(x2);
    }
    if (axis === 'y' && layer.mark.type === 'candlestick') {
      fields.push(
        layer.mark.fields.open ?? 'open',
        layer.mark.fields.high ?? 'high',
        layer.mark.fields.low ?? 'low',
        layer.mark.fields.close ?? encoding.field,
      );
    }
    if (
      axis === 'y' &&
      (layer.mark.type === 'financial' ||
        layer.mark.type === 'range' ||
        layer.mark.type === 'bullet' ||
        layer.mark.type === 'indicator' ||
        layer.mark.type === 'volume-profile')
    ) {
      fields.push(...Object.values(layer.mark.fields));
      const optionFields = layer.mark.options.fields;
      if (Array.isArray(optionFields)) {
        fields.push(
          ...optionFields.filter(
            (field): field is string => typeof field === 'string' && field.trim() !== '',
          ),
        );
      }
    }
    if (axis === 'y' && layer.mark.type === 'boxplot') {
      fields.push(
        layer.mark.fields.min ?? 'min',
        layer.mark.fields.q1 ?? 'q1',
        layer.mark.fields.median ?? encoding.field,
        layer.mark.fields.q3 ?? 'q3',
        layer.mark.fields.max ?? 'max',
      );
    }
    if (axis === 'y' && (layer.mark.type === 'lines' || layer.mark.type === 'custom')) {
      const y2 = layer.mark.fields.y2;
      if (y2 !== undefined) fields.push(y2);
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
    if (axis === 'y' && layer.mark.type === 'theme-river') {
      const totals = new Map<string, number>();
      for (let index = 0; index < table.length; index += 1) {
        const key = String(table.value(index, layer.x.field) ?? '');
        const value = table.numericValue(index, layer.y.field);
        if (value === null) continue;
        totals.set(key, (totals.get(key) ?? 0) + Math.max(0, value));
      }
      const maximumTotal = Math.max(1, ...totals.values());
      min = Math.min(min, -maximumTotal / 2);
      max = Math.max(max, maximumTotal / 2);
    }
    if (
      encoding.scale.zero === true ||
      (axis === 'y' &&
        (layer.mark.type === 'bar' ||
          layer.mark.type === 'area' ||
          layer.mark.type === 'bullet' ||
          layer.mark.type === 'cylinder' ||
          layer.mark.type === 'histogram' ||
          layer.mark.type === 'item' ||
          layer.mark.type === 'lollipop' ||
          layer.mark.type === 'packed-bubble' ||
          layer.mark.type === 'pareto' ||
          layer.mark.type === 'pictorial-bar' ||
          layer.mark.type === 'pyramid' ||
          layer.mark.type === 'solid-gauge' ||
          layer.mark.type === 'theme-river' ||
          layer.mark.type === 'variable-pie' ||
          layer.mark.type === 'variwide' ||
          layer.mark.type === 'volume-profile' ||
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

function categoricalDomain(
  layers: readonly PreparedLayerData[],
  axis: 'x' | 'y',
): readonly string[] {
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

function xAxisId(layer: NormalizedLayerSpec): 'x' | 'x2' {
  if (layer.x.axisId === 'x' || layer.x.axisId === 'x2') return layer.x.axisId;
  throw new GraflumeError('INVALID_SPEC', 'The x encoding axisId must be "x" or "x2".', {
    path: `$.layers[${layer.id}].x.axisId`,
  });
}

function yAxisId(layer: NormalizedLayerSpec): 'y' | 'y2' {
  if (layer.y.axisId === 'y' || layer.y.axisId === 'y2') return layer.y.axisId;
  throw new GraflumeError('INVALID_SPEC', 'The y encoding axisId must be "y" or "y2".', {
    path: `$.layers[${layer.id}].y.axisId`,
  });
}

function resolveAxisScale(
  id: AxisId,
  layers: readonly PreparedLayerData[],
  plot: PlotArea,
): Omit<ResolvedAxisScale, 'layers'> {
  const channel = id === 'x' || id === 'x2' ? 'x' : 'y';
  const fieldType = resolveCommonType(
    layers.map((layer) => (channel === 'x' ? layer.xType : layer.yType)),
    channel,
  );
  const firstEncoding = layers[0]?.layer[channel];
  const requestedScaleTypes = new Set(
    layers
      .map((layer) => layer.layer[channel].scale.type)
      .filter((type): type is 'linear' | 'band' | 'time' => type !== undefined),
  );
  if (requestedScaleTypes.size > 1) {
    throw new GraflumeError(
      'INCOMPATIBLE_SCALE',
      `Layers bound to ${id} request incompatible scale types: ${[...requestedScaleTypes].join(
        ', ',
      )}.`,
      { path: `$.layers[].${channel}.scale.type` },
    );
  }
  const requestedScaleType = [...requestedScaleTypes][0];
  const family = typeFamily(fieldType);
  if (
    (requestedScaleType === 'band' && family !== 'categorical') ||
    (requestedScaleType === 'linear' && family !== 'numeric') ||
    (requestedScaleType === 'time' && family !== 'temporal')
  ) {
    throw new GraflumeError(
      'INCOMPATIBLE_SCALE',
      `Scale type "${requestedScaleType}" is incompatible with the ${id} field type "${fieldType}".`,
      { path: `$.layers[].${channel}.scale.type` },
    );
  }
  const reverse = firstEncoding?.scale.reverse === true;
  const categorical = requestedScaleType === 'band' || family === 'categorical';

  let scale: Scale;
  if (categorical) {
    const domain = categoricalDomain(layers, channel);
    scale = new BandScale({
      domain: reverse ? [...domain].reverse() : domain,
      range: channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y, plot.y + plot.height],
      ...(firstEncoding?.scale.paddingInner === undefined
        ? {}
        : { paddingInner: firstEncoding.scale.paddingInner }),
      ...(firstEncoding?.scale.paddingOuter === undefined
        ? {}
        : { paddingOuter: firstEncoding.scale.paddingOuter }),
    });
  } else {
    const normalRange: readonly [number, number] =
      channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
    const range: readonly [number, number] = reverse
      ? [normalRange[1], normalRange[0]]
      : normalRange;
    scale = new LinearScale({
      domain: numericDomain(layers, channel, fieldType),
      range,
      kind: requestedScaleType === 'time' || fieldType === 'temporal' ? 'time' : 'linear',
      ...(firstEncoding?.scale.nice === undefined ? {} : { nice: firstEncoding.scale.nice }),
      ...(firstEncoding?.scale.clamp === undefined ? {} : { clamp: firstEncoding.scale.clamp }),
    });
  }

  return { id, channel, fieldType, scale };
}

export function resolveScales(spec: NormalizedChartSpec, plot: PlotArea): ScaleResolution {
  const preparedLayers: PreparedLayerData[] = spec.layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      const table = DataTable.from(layer.data);
      return {
        layer,
        table,
        xType: layer.x.type ?? inferFieldType(table, layer.x.field),
        yType: layer.y.type ?? inferFieldType(table, layer.y.field),
        xAxisId: xAxisId(layer),
        yAxisId: yAxisId(layer),
      };
    });

  if (preparedLayers.length === 0) {
    throw new GraflumeError('INVALID_SPEC', 'At least one visible layer is required.', {
      path: '$.layers',
    });
  }

  const grouped = new Map<AxisId, PreparedLayerData[]>();
  for (const layer of preparedLayers) {
    for (const id of [layer.xAxisId, layer.yAxisId] as const) {
      const entries = grouped.get(id) ?? [];
      entries.push(layer);
      grouped.set(id, entries);
    }
  }

  const partialAxes: Partial<Record<AxisId, Omit<ResolvedAxisScale, 'layers'>>> = {};
  for (const id of ['x', 'x2', 'y', 'y2'] as const) {
    const entries = grouped.get(id);
    if (entries === undefined || entries.length === 0) continue;
    partialAxes[id] = resolveAxisScale(id, entries, plot);
  }

  const layers: LayerData[] = preparedLayers.map((layer) => {
    const xResolved = partialAxes[layer.xAxisId];
    const yResolved = partialAxes[layer.yAxisId];
    if (xResolved === undefined || yResolved === undefined) {
      throw new GraflumeError('INVALID_SPEC', 'Unable to resolve layer axis scales.', {
        path: `$.layers[${layer.layer.id}]`,
      });
    }
    return {
      ...layer,
      xScale: xResolved.scale,
      yScale: yResolved.scale,
    };
  });

  const axes: Partial<Record<AxisId, ResolvedAxisScale>> = {};
  for (const id of ['x', 'x2', 'y', 'y2'] as const) {
    const resolved = partialAxes[id];
    if (resolved === undefined) continue;
    axes[id] = {
      ...resolved,
      layers: layers.filter((layer) =>
        resolved.channel === 'x' ? layer.xAxisId === id : layer.yAxisId === id,
      ),
    };
  }

  const resolvedX = axes.x ?? axes.x2;
  const resolvedY = axes.y ?? axes.y2;
  if (resolvedX === undefined || resolvedY === undefined) {
    throw new GraflumeError('INVALID_SPEC', 'Both x and y scales are required.', {
      path: '$.layers',
    });
  }

  return {
    layers,
    axes,
    xType: resolvedX.fieldType,
    yType: resolvedY.fieldType,
    xScale: resolvedX.scale,
    yScale: resolvedY.scale,
  };
}
