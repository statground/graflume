import type { MarkCompileContext } from '../compiler/types.js';
import { GraflumeError } from '../core/errors.js';
import { interpolateCurve } from '../curve/registry.js';
import { exactStrideSampleIndices, strideSampleIndices } from '../data/sample.js';
import {
  preparedSeriesStackFields,
  resolveSeriesStackSpec,
  type SeriesStackFields,
} from '../data/series-stack.js';
import { createEncodingResolver, type EncodingResolver } from '../encoding/resolve.js';
import { nodeBase } from '../scene/factory.js';
import type { CircleNode, PathNode, RectNode, SceneNode } from '../scene/types.js';
import type { DataRow } from '../spec/types.js';
import { categoricalColor, colorWithOpacity } from '../theme/color.js';
import { buildAreaTopology, orderAreaByX, pairedAreaSampleIndices } from './area-topology.js';
import { curveNameForMark, curveOptionsForMark } from './curve-series.js';
import { preservesReferenceBarRatio, resolveBarBandLayout } from './bar-layout.js';
import {
  numericDataValue,
  scaleInput,
  temporalTooltipValue,
  themedAreaFill,
  themedAreaStroke,
  themedPointFill,
  themedPointStroke,
} from './utils.js';

interface SeriesEntry {
  readonly rowIndex: number;
  readonly series: string;
  readonly seriesKey: string;
  readonly seriesIndex: number;
  readonly category: number | string | Date;
  readonly categoryKey: string;
  readonly categoryTemporal: boolean;
  readonly source: number;
  readonly start: number;
  readonly end: number;
  readonly absoluteTotal: number;
  readonly positiveTotal: number;
  readonly negativeTotal: number;
  readonly netTotal: number;
}

function identityKey(value: number | string | Date): string {
  if (value instanceof Date) return `date:${value.toISOString()}`;
  return `${typeof value}:${String(value)}`;
}

function finiteRowValue(
  context: MarkCompileContext,
  rowIndex: number,
  field: string,
): number | null {
  return numericDataValue(context.table.value(rowIndex, field));
}

function cleanRow(row: DataRow): Record<string, DataRow[string]> {
  return Object.fromEntries(
    Object.entries(row).filter(([field]) => !field.startsWith('__graflume_')),
  );
}

function tooltipRow(
  context: MarkCompileContext,
  entry: SeriesEntry,
  encoding: EncodingResolver,
): DataRow {
  const encoded = encoding.tooltip(entry.rowIndex);
  return {
    ...cleanRow(context.table.row(entry.rowIndex)),
    stackSeries: entry.series,
    stackCategory: entry.categoryTemporal ? temporalTooltipValue(entry.category) : entry.category,
    stackValue: entry.source,
    stackStart: entry.start,
    stackEnd: entry.end,
    stackTotal: entry.absoluteTotal,
    stackPositiveTotal: entry.positiveTotal,
    stackNegativeTotal: entry.negativeTotal,
    stackNetTotal: entry.netTotal,
    stackPercent: entry.absoluteTotal === 0 ? 0 : entry.source / entry.absoluteTotal,
    ...(encoded ?? {}),
  };
}

function datum(context: MarkCompileContext, entry: SeriesEntry, encoding: EncodingResolver) {
  const row = context.table.row(entry.rowIndex);
  return {
    layerId: context.layer.id,
    rowIndex: entry.rowIndex,
    datum: cleanRow(row),
    tooltip: tooltipRow(context, entry, encoding),
  } as const;
}

function seriesEntries(
  context: MarkCompileContext,
  fields: SeriesStackFields,
): readonly SeriesEntry[] {
  const stack = resolveSeriesStackSpec(context.layer);
  if (stack === null) return [];
  const categoryTemporal =
    fields.category === context.layer.x.field
      ? context.xType === 'temporal'
      : fields.category === context.layer.y.field
        ? context.yType === 'temporal'
        : false;
  const groupedTotals = new Map<
    string,
    { absolute: number; positive: number; negative: number; net: number }
  >();
  if (stack.offset === null) {
    for (let rowIndex = 0; rowIndex < context.table.length; rowIndex += 1) {
      const category = scaleInput(context.table.value(rowIndex, fields.category));
      const source = finiteRowValue(context, rowIndex, stack.valueField);
      if (category === null || source === null) continue;
      const key = identityKey(category);
      const total = groupedTotals.get(key) ?? { absolute: 0, positive: 0, negative: 0, net: 0 };
      total.absolute += Math.abs(source);
      total.positive += Math.max(0, source);
      total.negative += Math.max(0, -source);
      total.net += source;
      groupedTotals.set(key, total);
    }
  }
  const names: string[] = [];
  const indexes = new Map<string, number>();
  const combinations = new Set<string>();
  const entries: SeriesEntry[] = [];
  for (let rowIndex = 0; rowIndex < context.table.length; rowIndex += 1) {
    const category = scaleInput(context.table.value(rowIndex, fields.category));
    const rawSeries = context.table.value(rowIndex, fields.series);
    const series =
      rawSeries === null || rawSeries === undefined
        ? ''
        : rawSeries instanceof Date
          ? rawSeries.toISOString()
          : String(rawSeries);
    const seriesKey =
      rawSeries === null || rawSeries === undefined
        ? ''
        : rawSeries instanceof Date
          ? `date:${rawSeries.toISOString()}`
          : `${typeof rawSeries}:${String(rawSeries)}`;
    const source = finiteRowValue(
      context,
      rowIndex,
      stack.offset === null ? stack.valueField : fields.source,
    );
    if (category === null || series === '' || source === null) continue;
    const categoryKey = identityKey(category);
    const combination = `${categoryKey}\u0000${seriesKey}`;
    if (combinations.has(combination)) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Series layouts require one row per category-series pair; aggregate duplicate pairs explicitly.',
        { path: '$.data' },
      );
    }
    combinations.add(combination);
    let seriesIndex = indexes.get(seriesKey);
    if (seriesIndex === undefined) {
      seriesIndex = names.length;
      names.push(seriesKey);
      indexes.set(seriesKey, seriesIndex);
    }
    const grouped = groupedTotals.get(categoryKey);
    const start =
      stack.offset === null ? 0 : (finiteRowValue(context, rowIndex, fields.start) ?? 0);
    const end =
      stack.offset === null ? source : (finiteRowValue(context, rowIndex, fields.end) ?? start);
    entries.push({
      rowIndex,
      series,
      seriesKey,
      seriesIndex,
      category,
      categoryKey,
      categoryTemporal,
      source,
      start,
      end,
      absoluteTotal:
        grouped?.absolute ?? finiteRowValue(context, rowIndex, fields.absoluteTotal) ?? 0,
      positiveTotal:
        grouped?.positive ?? finiteRowValue(context, rowIndex, fields.positiveTotal) ?? 0,
      negativeTotal:
        grouped?.negative ?? finiteRowValue(context, rowIndex, fields.negativeTotal) ?? 0,
      netTotal: grouped?.net ?? finiteRowValue(context, rowIndex, fields.netTotal) ?? 0,
    });
  }
  return entries;
}

function seriesColor(context: MarkCompileContext, index: number, count: number): string {
  return context.layer.mark.fill ?? categoricalColor(context.theme, index, count);
}

export function compileSeriesBarMark(context: MarkCompileContext): readonly SceneNode[] | null {
  const fields = preparedSeriesStackFields(context.layer);
  if (fields === null) return null;
  const entries = seriesEntries(context, fields);
  if (entries.length === 0) return [];
  const { layer, xScale, yScale, plot, theme, performance, barGroup } = context;
  const encoding = createEncodingResolver(context);
  const seriesCount = Math.max(1, new Set(entries.map(({ seriesKey }) => seriesKey)).size);
  const grouped = resolveSeriesStackSpec(layer)?.offset === null;
  const externalCount = layer.mark.position === 'group' ? Math.max(1, barGroup.count) : 1;
  const externalIndex = layer.mark.position === 'group' ? barGroup.index : 0;
  const subgroupCount = grouped ? seriesCount * externalCount : externalCount;
  const categoryCount = Math.max(1, new Set(entries.map(({ categoryKey }) => categoryKey)).size);
  const themedWidthRatio = theme.mark.barWidthRatio;
  const nodes: RectNode[] = [];
  const entryByRow = new Map(entries.map((entry) => [entry.rowIndex, entry]));
  const horizontal = layer.mark.orientation === 'horizontal';
  const categorySpan = horizontal ? plot.height : plot.width;
  const entriesByCategory = new Map<string, SeriesEntry[]>();
  for (const entry of entries) {
    const category = entriesByCategory.get(entry.categoryKey) ?? [];
    category.push(entry);
    entriesByCategory.set(entry.categoryKey, category);
  }
  const categoryGroups = [...entriesByCategory.values()];
  const largestCategory = Math.max(1, ...categoryGroups.map(({ length }) => length));
  const minimumClusterStride = Math.max(2, subgroupCount * 1.5);
  const categoryBudget = Math.max(
    1,
    Math.min(
      Math.floor(performance.maxBarMarks / largestCategory),
      Math.floor(categorySpan / minimumClusterStride),
    ),
  );
  const selectedCategories = new Set(
    exactStrideSampleIndices(categoryGroups.length, categoryBudget).flatMap((index) =>
      categoryGroups[index] === undefined ? [] : [categoryGroups[index]![0]!.categoryKey],
    ),
  );
  const visibleEntries = encoding
    .orderedIndices(
      entries.flatMap((entry) =>
        selectedCategories.has(entry.categoryKey) ? [entry.rowIndex] : [],
      ),
    )
    .flatMap((rowIndex) => {
      const entry = entryByRow.get(rowIndex);
      return entry === undefined ? [] : [entry];
    });
  const categoryScale = horizontal ? yScale : xScale;
  const preserveReferenceWidth = preservesReferenceBarRatio(theme.name);
  const categoryCenters = visibleEntries
    .map(({ category }) => categoryScale.map(category))
    .filter(Number.isFinite);
  const band = resolveBarBandLayout({
    scale: categoryScale,
    centers: categoryCenters,
    plotSpan: horizontal ? plot.height : plot.width,
    categoryCount,
    groupCount: subgroupCount,
    lodSampled: selectedCategories.size < categoryGroups.length,
    maxThickness: layer.mark.maxThickness ?? (subgroupCount > 1 ? 52 : 64),
    ...(externalCount < 2 || barGroup.maxThickness === undefined
      ? {}
      : { groupMaxThickness: barGroup.maxThickness }),
    ...(barGroup.preserveSlots === true ? { preserveGroupSlots: true } : {}),
    preserveAuthoredRatio: preserveReferenceWidth,
    ...(themedWidthRatio === undefined ? {} : { barWidthRatio: themedWidthRatio }),
  });

  visibleEntries.forEach((entry, drawIndex) => {
    const subgroupIndex = grouped ? externalIndex * seriesCount + entry.seriesIndex : externalIndex;
    const baseColor = seriesColor(context, entry.seriesIndex, seriesCount);
    const encodedColor = encoding.color('color', entry.rowIndex, baseColor);
    const fill = encoding.color(
      'fill',
      entry.rowIndex,
      encoding.has('color') ? encodedColor : baseColor,
    );
    const fallbackStroke = layer.mark.stroke ?? theme.mark.barStroke;
    const stroke = encoding.color('stroke', entry.rowIndex, fallbackStroke ?? encodedColor);
    const hasStroke = encoding.has('stroke') || fallbackStroke !== undefined;
    const lineWidth = encoding.number(
      'strokeWidth',
      entry.rowIndex,
      layer.mark.lineWidth ?? (hasStroke ? (theme.mark.barStrokeWidth ?? theme.mark.lineWidth) : 0),
    );
    const dash = encoding.dash(entry.rowIndex);
    if (layer.mark.orientation === 'horizontal') {
      const center = yScale.map(entry.category);
      const start = xScale.map(entry.start);
      const end = xScale.map(entry.end);
      if (![center, start, end].every(Number.isFinite)) return;
      const slot = band.slot;
      const size = band.thickness;
      const offset = (subgroupIndex - (subgroupCount - 1) / 2) * slot;
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:series-bar:${entry.rowIndex}`, {
          zIndex:
            layer.zIndex +
            (encoding.has('order')
              ? drawIndex / Math.max(100, visibleEntries.length * 10)
              : entry.seriesIndex / 100),
          opacity: encoding.number('opacity', entry.rowIndex, layer.mark.opacity),
          interactive: performance.enableHitTesting,
          datum: datum(context, entry, encoding),
        }),
        x: Math.min(start, end),
        y: center + offset - size / 2,
        width: Math.max(0.5, Math.abs(end - start)),
        height: size,
        fill,
        ...(hasStroke ? { stroke } : {}),
        lineWidth,
        ...(dash.length === 0 ? {} : { dash }),
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
      });
      return;
    }

    const center = xScale.map(entry.category);
    const start = yScale.map(entry.start);
    const end = yScale.map(entry.end);
    if (![center, start, end].every(Number.isFinite)) return;
    const slot = band.slot;
    const size = band.thickness;
    const offset = (subgroupIndex - (subgroupCount - 1) / 2) * slot;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${layer.id}:series-bar:${entry.rowIndex}`, {
        zIndex:
          layer.zIndex +
          (encoding.has('order')
            ? drawIndex / Math.max(100, visibleEntries.length * 10)
            : entry.seriesIndex / 100),
        opacity: encoding.number('opacity', entry.rowIndex, layer.mark.opacity),
        interactive: performance.enableHitTesting,
        datum: datum(context, entry, encoding),
      }),
      x: center + offset - size / 2,
      y: Math.min(start, end),
      width: size,
      height: Math.max(0.5, Math.abs(end - start)),
      fill,
      ...(hasStroke ? { stroke } : {}),
      lineWidth,
      ...(dash.length === 0 ? {} : { dash }),
      cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
    });
  });
  return nodes;
}

function sampledEntries(entries: readonly SeriesEntry[], budget: number): readonly SeriesEntry[] {
  if (entries.length <= budget) return entries;
  const indices = pairedAreaSampleIndices(
    entries.map(({ end }) => end),
    entries.map(({ start }) => start),
    Math.max(1, Math.floor(budget)),
  );
  return indices.flatMap((index) => (entries[index] === undefined ? [] : [entries[index]!]));
}

export function compileSeriesAreaMark(context: MarkCompileContext): readonly SceneNode[] | null {
  const fields = preparedSeriesStackFields(context.layer);
  if (fields === null) return null;
  const entries = seriesEntries(context, fields);
  if (entries.length === 0) return [];
  const { layer, xScale, yScale, theme, performance } = context;
  const encoding = createEncodingResolver(context);
  const series = [...new Set(entries.map(({ seriesKey }) => seriesKey))];
  const groups = new Map<
    string,
    { readonly series: string; readonly seriesIndex: number; entries: SeriesEntry[] }
  >();
  for (const entry of entries) {
    const key = `${entry.seriesKey}\u0000${encoding.groupKey(entry.rowIndex)}`;
    const group = groups.get(key) ?? {
      series: entry.series,
      seriesIndex: entry.seriesIndex,
      entries: [],
    };
    group.entries.push(entry);
    groups.set(key, group);
  }
  const allRenderGroups = [...groups.values()];
  const maximumGroups = Math.max(1, Math.floor(performance.maxLinePoints / 2));
  const renderGroups = exactStrideSampleIndices(allRenderGroups.length, maximumGroups).flatMap(
    (index) => (allRenderGroups[index] === undefined ? [] : [allRenderGroups[index]!]),
  );
  const curve = curveNameForMark(layer.mark.options, 'straight');
  const curveOptions = curveOptionsForMark(layer.mark.options);
  const nodes: SceneNode[] = [];
  renderGroups.forEach((group, groupIndex) => {
    const entryByRow = new Map(group.entries.map((entry) => [entry.rowIndex, entry]));
    const authored = encoding.has('order')
      ? encoding
          .orderedIndices(group.entries.map(({ rowIndex }) => rowIndex))
          .flatMap((rowIndex) => {
            const entry = entryByRow.get(rowIndex);
            return entry === undefined ? [] : [entry];
          })
      : group.entries;
    const ordered = orderAreaByX(authored, (entry) => xScale.map(entry.category));
    const pathBudget = Math.max(
      2,
      Math.floor(performance.maxLinePoints / Math.max(1, renderGroups.length)),
    );
    const boundaryBudget = Math.max(1, Math.floor(pathBudget / 2));
    const source = sampledEntries(ordered, boundaryBudget);
    if (source.length === 0) return;
    const upperSource = source.map((entry) => ({
      x: xScale.map(entry.category),
      y: yScale.map(entry.end),
    }));
    const lowerSource = source.map((entry) => ({
      x: xScale.map(entry.category),
      y: yScale.map(entry.start),
    }));
    if (
      [...upperSource, ...lowerSource].some(
        ({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y),
      )
    ) {
      return;
    }
    const interpolatedUpper = interpolateCurve(upperSource, curve, curveOptions);
    const interpolatedLower = interpolateCurve(lowerSource, curve, curveOptions);
    const commonLength = Math.min(interpolatedUpper.length, interpolatedLower.length);
    const boundaryIndices = pairedAreaSampleIndices(
      interpolatedUpper.slice(0, commonLength).map(({ y }) => y),
      interpolatedLower.slice(0, commonLength).map(({ y }) => y),
      boundaryBudget,
    );
    const upper = boundaryIndices.map((index) => interpolatedUpper[index]!);
    const lower = boundaryIndices.map((index) => interpolatedLower[index]!);
    const topology = buildAreaTopology(upper, lower);
    const representative = source[0]!.rowIndex;
    const baseColor = seriesColor(context, group.seriesIndex, series.length);
    const color = encoding.color('color', representative, baseColor);
    const themeRiver = layer.mark.type === 'theme-river';
    const fillColor = themeRiver
      ? encoding.color(
          'fill',
          representative,
          encoding.has('color')
            ? color
            : colorWithOpacity(color, theme.mode === 'dark' ? 0.72 : 0.62),
        )
      : encoding.color(
          'fill',
          representative,
          encoding.has('color')
            ? color
            : (layer.mark.fill ??
                themedAreaFill(
                  theme,
                  color,
                  colorWithOpacity(color, theme.mode === 'dark' ? 0.28 : 0.2),
                )),
        );
    const strokeColor = encoding.color(
      'stroke',
      representative,
      encoding.has('color')
        ? color
        : (layer.mark.stroke ??
            (themeRiver
              ? color
              : themedAreaStroke(
                  theme,
                  color,
                  theme.mark.lineColor ?? theme.mark.defaultColor ?? color,
                ))),
    );
    const lineWidth = encoding.number(
      'strokeWidth',
      representative,
      layer.mark.lineWidth ?? (themeRiver ? 1.2 : theme.mark.lineWidth),
    );
    const dash = encoding.dash(representative);
    const stem = themeRiver ? 'river' : 'series-area';
    const fill: PathNode = {
      type: 'path',
      ...nodeBase(`${layer.id}:${stem}:${groupIndex}`, {
        zIndex: layer.zIndex + groupIndex / Math.max(100, renderGroups.length * 10),
        opacity: encoding.number('opacity', representative, layer.mark.opacity),
      }),
      points: topology.polygon,
      closed: true,
      fill: fillColor,
      stroke: strokeColor,
      lineWidth,
      lineJoin: theme.mark.lineJoin ?? 'round',
      ...(dash.length === 0 ? {} : { dash }),
    };
    nodes.push(fill);
    source.forEach((entry, index) => {
      if (!performance.enableHitTesting) return;
      const upperPoint = upperSource[index];
      const lowerPoint = lowerSource[index];
      if (upperPoint === undefined || lowerPoint === undefined) return;
      const pointColor = encoding.color('color', entry.rowIndex, baseColor);
      const encodedSize = encoding.number('size', entry.rowIndex, Number.NaN);
      const radius = layer.mark.point
        ? encoding.number(
            'radius',
            entry.rowIndex,
            Number.isFinite(encodedSize)
              ? Math.sqrt(Math.max(0, encodedSize) / Math.PI)
              : (layer.mark.radius ?? theme.mark.pointRadius),
          )
        : Math.max(6, Math.min(16, Math.abs(upperPoint.y - lowerPoint.y) / 2));
      const pointFill = encoding.color(
        'fill',
        entry.rowIndex,
        encoding.has('color')
          ? pointColor
          : (layer.mark.fill ?? themedPointFill(theme, pointColor, theme.colors.background)),
      );
      const pointStroke = encoding.color(
        'stroke',
        entry.rowIndex,
        encoding.has('color')
          ? pointColor
          : (layer.mark.stroke ??
              themedPointStroke(
                theme,
                pointColor,
                themedAreaStroke(theme, pointColor, theme.mark.lineColor ?? pointColor),
              )),
      );
      const pointDash = encoding.dash(entry.rowIndex);
      const target: CircleNode = {
        type: 'circle',
        ...nodeBase(`${layer.id}:${stem}-target:${entry.rowIndex}`, {
          zIndex: layer.zIndex + groupIndex / Math.max(100, renderGroups.length * 10) + 0.01,
          opacity: layer.mark.point
            ? encoding.number('opacity', entry.rowIndex, layer.mark.opacity)
            : 0.001,
          interactive: true,
          datum: datum(context, entry, encoding),
        }),
        cx: upperPoint.x,
        cy: (upperPoint.y + lowerPoint.y) / 2,
        radius,
        fill: layer.mark.point ? pointFill : pointColor,
        ...(layer.mark.point ? { stroke: pointStroke } : {}),
        lineWidth: layer.mark.point
          ? encoding.number(
              'strokeWidth',
              entry.rowIndex,
              layer.mark.lineWidth === undefined
                ? (theme.mark.pointStrokeWidth ?? Math.max(1.5, theme.mark.lineWidth * 0.68))
                : Math.max(1.5, layer.mark.lineWidth * 0.68),
            )
          : 0,
        ...(layer.mark.point && pointDash.length > 0 ? { dash: pointDash } : {}),
      };
      nodes.push(target);
    });
  });
  return nodes;
}
