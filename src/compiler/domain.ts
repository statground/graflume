import { GraflumeError } from '../core/errors.js';
import { summarizeNormalDistribution } from '../data/distribution.js';
import {
  kernelDensity1d,
  weightedHistogram,
  type HistogramNormalization,
  type WeightedObservation,
} from '../data/statistics.js';
import { inferFieldType } from '../data/infer.js';
import { DataTable } from '../data/table.js';
import { prepareSeriesStackLayer, preparedSeriesStackFields } from '../data/series-stack.js';
import { prepareTechnicalIndicator } from '../data/technical-indicators.js';
import { executeTransforms, type DataLineage } from '../data/transforms.js';
import { createPositionScale } from '../scale/registry.js';
import type { Scale } from '../scale/types.js';
import { domainForAxisWindow, type DomainAxisWindow } from '../interaction/domain-navigation.js';
import type {
  AxisId,
  FieldType,
  NormalizedChartSpec,
  NormalizedLayerSpec,
  ScaleType,
} from '../spec/types.js';
import { resolveDistributionMode } from '../spec/distribution.js';
import type { PlotArea } from './types.js';

export interface LayerData {
  readonly layer: NormalizedLayerSpec;
  readonly table: DataTable;
  readonly lineage: DataLineage;
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
  readonly lineage: DataLineage;
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
    const distributionMode =
      layer.mark.type === 'distribution' ? resolveDistributionMode(layer.mark.options.mode) : null;
    const densitySummary =
      distributionMode === 'curve'
        ? summarizeNormalDistribution(
            Array.from({ length: table.length }, (_, index) => {
              const value = table.value(index, layer.mark.fields.value ?? layer.y.field);
              return value instanceof Date ? value.getTime() : value;
            }).filter((value): value is number => typeof value === 'number'),
          )
        : null;
    const distributionObservations: WeightedObservation[] =
      distributionMode === 'kde' ||
      distributionMode === 'ecdf' ||
      distributionMode === 'ccdf' ||
      distributionMode === 'histogram'
        ? Array.from({ length: table.length }, (_, rowIndex) => {
            const field = layer.mark.fields.value ?? layer.x.field;
            const value = table.numericValue(rowIndex, field);
            const optionWeightField = layer.mark.options.weightField;
            const weightField =
              layer.mark.fields.weight ??
              (typeof optionWeightField === 'string' ? optionWeightField : undefined);
            const weight =
              weightField === undefined ? 1 : table.numericValue(rowIndex, weightField);
            return value === null || weight === null || weight < 0
              ? null
              : { value, weight, rowIndex };
          }).filter((value): value is WeightedObservation => value !== null)
        : [];
    const kde =
      distributionMode === 'kde'
        ? kernelDensity1d(distributionObservations, {
            points:
              typeof layer.mark.options.samples === 'number' ? layer.mark.options.samples : 96,
            ...(typeof layer.mark.options.bandwidth === 'number' && layer.mark.options.bandwidth > 0
              ? { bandwidth: layer.mark.options.bandwidth }
              : {}),
          })
        : null;
    const fields =
      densitySummary !== null ||
      (axis === 'y' &&
        (layer.mark.type === 'histogram' ||
          layer.mark.type === 'theme-river' ||
          distributionMode === 'histogram' ||
          distributionMode === 'kde' ||
          distributionMode === 'ecdf' ||
          distributionMode === 'ccdf'))
        ? []
        : [encoding.field];
    const rangeEncoding = axis === 'x' ? layer.encoding.x2 : layer.encoding.y2;
    if (rangeEncoding?.field !== undefined) fields.push(rangeEncoding.field);
    const stackFields = preparedSeriesStackFields(layer);
    const stackAxis =
      layer.mark.type === 'bar' && layer.mark.orientation === 'horizontal' ? 'x' : 'y';
    if (
      stackFields !== null &&
      axis === stackAxis &&
      table.has(stackFields.start) &&
      table.has(stackFields.end)
    ) {
      fields.splice(0, fields.length, stackFields.start, stackFields.end);
    }
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
      fields.push(
        ...Object.entries(layer.mark.fields).flatMap(([role, field]) =>
          role.startsWith('__') ? [] : [field],
        ),
      );
      const optionFields = layer.mark.options.fields;
      if (Array.isArray(optionFields)) {
        fields.push(
          ...optionFields.filter(
            (field): field is string => typeof field === 'string' && field.trim() !== '',
          ),
        );
      }
    }
    if (axis === 'y' && (layer.mark.type === 'boxplot' || distributionMode === 'boxplot')) {
      const rawValueField = layer.mark.fields.value;
      if (rawValueField !== undefined) fields.push(rawValueField);
      fields.push(
        layer.mark.fields.min ?? layer.mark.fields.low ?? 'min',
        layer.mark.fields.q1 ?? 'q1',
        layer.mark.fields.median ?? encoding.field,
        layer.mark.fields.q3 ?? 'q3',
        layer.mark.fields.max ?? layer.mark.fields.high ?? 'max',
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

    if (densitySummary !== null) {
      if (axis === 'x') {
        min = Math.min(min, densitySummary.domainMinimum);
        max = Math.max(max, densitySummary.domainMaximum);
      } else {
        min = Math.min(min, 0);
        max = Math.max(max, densitySummary.maximumDensity);
      }
    }

    if (kde !== null && kde.points.length > 0) {
      if (axis === 'x') {
        min = Math.min(min, kde.points[0]!.value);
        max = Math.max(max, kde.points.at(-1)!.value);
      } else {
        min = Math.min(min, 0);
        max = Math.max(max, ...kde.points.map(({ density }) => density));
      }
    }

    if (axis === 'y' && (distributionMode === 'ecdf' || distributionMode === 'ccdf')) {
      min = Math.min(min, 0);
      max = Math.max(max, 1);
    }

    if (axis === 'y' && (layer.mark.type === 'histogram' || distributionMode === 'histogram')) {
      const binCount = Math.max(
        1,
        Math.min(
          100,
          Math.floor(typeof layer.mark.options.bins === 'number' ? layer.mark.options.bins : 10),
        ),
      );
      const sourceExtent = table.extent(layer.x.field, layer.x.type === 'temporal');
      if (sourceExtent !== null) {
        const optionWeightField = layer.mark.options.weightField;
        const weightField =
          layer.mark.fields.weight ??
          (typeof optionWeightField === 'string' ? optionWeightField : undefined);
        const observations = Array.from({ length: table.length }, (_, rowIndex) => {
          const value = table.numericValue(rowIndex, layer.x.field);
          const weight = weightField === undefined ? 1 : table.numericValue(rowIndex, weightField);
          return value === null || weight === null || weight < 0
            ? null
            : { value, weight, rowIndex };
        }).filter((value): value is WeightedObservation => value !== null);
        const normalizationOption = layer.mark.options.normalization;
        const normalization: HistogramNormalization =
          normalizationOption === 'probability' ||
          normalizationOption === 'normalized' ||
          layer.mark.options.normalized === true
            ? 'probability'
            : normalizationOption === 'density'
              ? 'density'
              : 'count';
        const counts = weightedHistogram(observations, {
          bins: binCount,
          extent: sourceExtent,
          normalization,
          cumulative: layer.mark.options.cumulative === true,
        }).map(({ value }) => value);
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
    if (axis === 'y' && layer.mark.type === 'theme-river' && stackFields === null) {
      const totals = new Map<string, number>();
      for (let index = 0; index < table.length; index += 1) {
        const rawKey = table.value(index, layer.x.field);
        const key =
          rawKey instanceof Date
            ? `date:${rawKey.toISOString()}`
            : `${typeof rawKey}:${String(rawKey ?? '')}`;
        const value = table.numericValue(index, layer.y.field);
        if (value === null) continue;
        totals.set(key, (totals.get(key) ?? 0) + Math.max(0, value));
      }
      let maximumTotal = 1;
      for (const total of totals.values()) maximumTotal = Math.max(maximumTotal, total);
      min = Math.min(min, -maximumTotal / 2);
      max = Math.max(max, maximumTotal / 2);
    }
    const zeroCompatible = !['log', 'logit', 'probit'].includes(encoding.scale.type ?? '');
    if (
      zeroCompatible &&
      (encoding.scale.zero === true ||
        (axis === 'y' && layer.mark.options.missing === 'zero') ||
        (axis === 'y' &&
          (layer.mark.type === 'bar' ||
            layer.mark.type === 'area' ||
            layer.mark.type === 'bullet' ||
            layer.mark.type === 'cylinder' ||
            layer.mark.type === 'histogram' ||
            distributionMode === 'histogram' ||
            layer.mark.type === 'item' ||
            layer.mark.type === 'lollipop' ||
            layer.mark.type === 'packed-bubble' ||
            layer.mark.type === 'pareto' ||
            layer.mark.type === 'pictorial-bar' ||
            layer.mark.type === 'pyramid' ||
            layer.mark.type === 'solid-gauge' ||
            layer.mark.type === 'stepped-area' ||
            layer.mark.type === 'theme-river' ||
            layer.mark.type === 'variable-pie' ||
            layer.mark.type === 'variwide' ||
            layer.mark.type === 'volume-profile' ||
            layer.mark.type === 'waterfall')) ||
        (axis === 'x' && layer.mark.type === 'bar' && layer.mark.orientation === 'horizontal'))
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
    const rangeEncoding = axis === 'x' ? layer.encoding.x2 : layer.encoding.y2;
    const values = explicit?.map(String) ?? [
      ...table.unique(layer[axis].field),
      ...(rangeEncoding?.field === undefined ? [] : table.unique(rangeEncoding.field)),
    ];
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
  domainWindow?: DomainAxisWindow,
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
      .filter((type): type is ScaleType => type !== undefined),
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
  const continuousAxisTypes = new Set<ScaleType>([
    'linear',
    'log',
    'symlog',
    'asinh',
    'pow',
    'sqrt',
    'time',
    'utc',
    'probability',
    'logit',
    'probit',
  ]);
  if (
    (requestedScaleType !== undefined &&
      !continuousAxisTypes.has(requestedScaleType) &&
      requestedScaleType !== 'band' &&
      requestedScaleType !== 'point') ||
    ((requestedScaleType === 'band' || requestedScaleType === 'point') &&
      family !== 'categorical') ||
    (requestedScaleType !== undefined &&
      continuousAxisTypes.has(requestedScaleType) &&
      requestedScaleType !== 'time' &&
      requestedScaleType !== 'utc' &&
      family !== 'numeric') ||
    ((requestedScaleType === 'time' || requestedScaleType === 'utc') && family !== 'temporal')
  ) {
    throw new GraflumeError(
      'INCOMPATIBLE_SCALE',
      `Scale type "${requestedScaleType}" is incompatible with the ${id} field type "${fieldType}".`,
      { path: `$.layers[].${channel}.scale.type` },
    );
  }
  const categorical =
    requestedScaleType === 'band' || requestedScaleType === 'point' || family === 'categorical';

  let scale: Scale;
  if (categorical) {
    const domain = categoricalDomain(layers, channel);
    scale = createPositionScale(firstEncoding?.scale ?? {}, {
      type: requestedScaleType === 'point' ? 'point' : 'band',
      domain,
      range: channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y, plot.y + plot.height],
    });
  } else {
    const normalRange: readonly [number, number] =
      channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
    const type = requestedScaleType ?? (fieldType === 'temporal' ? 'time' : 'linear');
    if (!continuousAxisTypes.has(type)) {
      throw new GraflumeError(
        'INCOMPATIBLE_SCALE',
        `Scale type "${type}" cannot be used as a Cartesian position scale.`,
        { path: `$.layers[].${channel}.scale.type` },
      );
    }
    scale = createPositionScale(firstEncoding?.scale ?? {}, {
      type: type as import('../scale/types.js').PositionScaleType,
      domain: numericDomain(layers, channel, fieldType),
      range: normalRange,
    });
  }

  if (domainWindow !== undefined) {
    const domain = domainForAxisWindow(scale, domainWindow);
    const range: readonly [number, number] =
      channel === 'x' ? [plot.x, plot.x + plot.width] : [plot.y + plot.height, plot.y];
    scale = createPositionScale(
      { ...(firstEncoding?.scale ?? {}), domain },
      { type: scale.kind, domain, range },
    );
  }

  return { id, channel, fieldType, scale };
}

export function resolveScales(
  spec: NormalizedChartSpec,
  plot: PlotArea,
  domainWindows: Readonly<Partial<Record<AxisId, DomainAxisWindow>>> = {},
): ScaleResolution {
  const preparedLayers: PreparedLayerData[] = spec.layers
    .filter((layer) => layer.visible)
    .map((layer) => {
      const stacked = prepareSeriesStackLayer(layer);
      const preparedLayer = stacked?.layer ?? layer;
      const transformed = executeTransforms(preparedLayer.data, preparedLayer.transform, {
        sourceId: `layer:${layer.id}`,
      });
      const indicator = prepareTechnicalIndicator(preparedLayer, transformed);
      const resolvedLayer = indicator.layer;
      const table = DataTable.from(indicator.result.data);
      return {
        layer: resolvedLayer,
        table,
        lineage: indicator.result.lineage,
        xType: resolvedLayer.x.type ?? inferFieldType(table, resolvedLayer.x.field),
        yType: resolvedLayer.y.type ?? inferFieldType(table, resolvedLayer.y.field),
        xAxisId: xAxisId(resolvedLayer),
        yAxisId: yAxisId(resolvedLayer),
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
    partialAxes[id] = resolveAxisScale(id, entries, plot, domainWindows[id]);
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
