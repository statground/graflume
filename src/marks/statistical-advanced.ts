import type { MarkCompiler, MarkCompileContext } from '../compiler/types.js';
import {
  aggregateOhlc,
  areaRadius,
  areaSizeGuide,
  calendarCells,
  calendarWeekdayLabels,
  calendarWeekStart,
  differenceSeries,
  estimateInterval,
  navigatorWindow,
  prepareOrderedSeries,
  waterfallSteps,
  type AreaRadiusOptions,
  type CalendarMode,
  type CalendarMissingPolicy,
  type DifferencePolicy,
  type DuplicatePolicy,
  type ExtendedHoursPolicy,
  type IntervalKind,
  type SortPolicy,
  type WaterfallKind,
} from '../data/family-analytics.js';
import { rankBars } from '../data/family-layouts.js';
import { BandScale } from '../scale/band.js';
import { nodeBase } from '../scene/factory.js';
import type {
  FamilyDatumInteraction,
  LineNode,
  Point,
  SceneNode,
  TextNode,
} from '../scene/types.js';
import { categoricalColor, colorWithOpacity, readableTextColor } from '../theme/color.js';
import { compileBarMark } from './bar.js';
import {
  preservesReferenceBarRatio,
  resolveBarBandLayout,
  selectBarCategoryIndices,
} from './bar-layout.js';
import {
  compileBubbleMark,
  compileCandlestickMark,
  compileDiffMark,
  compileIntervalMark,
  compileWaterfallMark,
} from './cartesian-extended.js';
import { compileLineMark } from './line.js';
import { compileCalendarMark } from './structured.js';
import { numericDataValue, scaleInput, temporalTooltipValue } from './utils.js';

function stringOption(context: MarkCompileContext, name: string): string | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'string' ? value : undefined;
}

function numberOption(context: MarkCompileContext, name: string): number | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanOption(context: MarkCompileContext, name: string): boolean | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'boolean' ? value : undefined;
}

function numberArrayOption(context: MarkCompileContext, name: string): number[] | undefined {
  const value = context.layer.mark.options[name];
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
    ? [...value]
    : undefined;
}

function stringArrayOption(context: MarkCompileContext, name: string): string[] | undefined {
  const value = context.layer.mark.options[name];
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? [...value]
    : undefined;
}

function rows(context: MarkCompileContext) {
  return Array.from({ length: context.table.length }, (_, rowIndex) => context.table.row(rowIndex));
}

function textNode(
  context: MarkCompileContext,
  id: string,
  x: number,
  y: number,
  text: string,
  options: {
    readonly align?: CanvasTextAlign;
    readonly size?: number;
    readonly fill?: string;
    readonly weight?: number;
  } = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: context.layer.zIndex + 4 }),
    x,
    y,
    text,
    fill: options.fill ?? context.theme.colors.text,
    fontFamily: context.theme.typography.fontFamily,
    fontSize: options.size ?? context.theme.typography.fontSize,
    fontWeight: options.weight ?? 600,
    align: options.align ?? 'center',
    baseline: 'middle',
    rotation: 0,
  };
}

/** Bar compiler with exact weighted counts, deterministic ranking, and rank-change provenance. */
export const compileRankedBarMark: MarkCompiler = (context) => {
  const aggregate = stringOption(context, 'aggregate');
  const ranked = booleanOption(context, 'rank') === true || aggregate !== undefined;
  if (!ranked) return compileBarMark(context);
  const categoryField = context.layer.mark.fields.category ?? context.layer.x.field;
  const valueField = context.layer.mark.fields.value ?? context.layer.y.field;
  const weightField = context.layer.mark.fields.weight ?? 'weight';
  const idField = context.layer.mark.fields.id ?? 'id';
  const sourceRowById = new Map<string, number>();
  const rawCategoryById = new Map<string, string | number | Date>();
  const previous = context.layer.mark.options.previousRanks;
  const previousRanks =
    previous !== null && typeof previous === 'object' && !Array.isArray(previous)
      ? Object.fromEntries(
          Object.entries(previous).flatMap(([key, value]) =>
            typeof value === 'number' && Number.isFinite(value) ? [[key, value]] : [],
          ),
        )
      : undefined;
  const data = Array.from({ length: context.table.length }, (_, rowIndex) => {
    const rawId = context.table.has(idField) ? context.table.value(rowIndex, idField) : undefined;
    const rawCategory = context.table.value(rowIndex, categoryField);
    const id = rawId === null || rawId === undefined ? `row-${rowIndex}` : String(rawId);
    const category =
      rawCategory === null || rawCategory === undefined ? `row-${rowIndex}` : String(rawCategory);
    if (!sourceRowById.has(id)) sourceRowById.set(id, rowIndex);
    const categoryId = category.trim() || id;
    if (
      !rawCategoryById.has(categoryId) &&
      rawCategory !== null &&
      rawCategory !== undefined &&
      typeof rawCategory !== 'boolean' &&
      (typeof rawCategory !== 'object' || rawCategory instanceof Date)
    )
      rawCategoryById.set(categoryId, rawCategory as string | number | Date);
    return {
      id,
      category,
      value: numericDataValue(context.table.value(rowIndex, valueField)) ?? 0,
      weight: context.table.has(weightField)
        ? (numericDataValue(context.table.value(rowIndex, weightField)) ?? 0)
        : 1,
    };
  });
  const direction =
    stringOption(context, 'sortDirection') === 'ascending' ? 'ascending' : 'descending';
  const rankedRows = rankBars(data, {
    aggregate:
      aggregate === 'count' || aggregate === 'weighted-count' || aggregate === 'value'
        ? aggregate
        : 'value',
    ...(previousRanks === undefined ? {} : { previousRanks }),
    direction,
  });
  const { plot, layer, theme, performance } = context;
  const maximum = Math.max(0, ...rankedRows.map(({ value }) => value));
  const minimum = Math.min(0, ...rankedRows.map(({ value }) => value));
  const span = Math.max(Number.EPSILON, maximum - minimum);
  const horizontal = layer.mark.orientation === 'horizontal';
  const categorySpan = horizontal ? plot.height : plot.width;
  // Ranking semantics select the leading rows, while the shared bar budget
  // decides how many complete bar-plus-label categories fit in the plot.
  const displayedCount = selectBarCategoryIndices({
    categoryCount: rankedRows.length,
    plotSpan: categorySpan,
    maximumMarks: performance.maxBarMarks,
    marksPerCategory: 2,
  }).length;
  const displayed = rankedRows.slice(0, displayedCount);
  const centers = displayed.map(
    (_row, index) =>
      (horizontal ? plot.y : plot.x) +
      ((index + 0.5) / Math.max(1, displayed.length)) * categorySpan,
  );
  const themedWidthRatio = theme.mark.barWidthRatio;
  const band = resolveBarBandLayout({
    scale: horizontal ? context.yScale : context.xScale,
    centers,
    plotSpan: categorySpan,
    categoryCount: rankedRows.length,
    lodSampled: displayed.length < rankedRows.length,
    maxThickness: layer.mark.maxThickness ?? 64,
    preserveAuthoredRatio: preservesReferenceBarRatio(theme.name),
    ...(themedWidthRatio === undefined ? {} : { barWidthRatio: themedWidthRatio }),
  });
  const nodes: SceneNode[] = [];
  const categoryTemporal =
    categoryField === layer.x.field
      ? context.xType === 'temporal'
      : categoryField === layer.y.field
        ? context.yType === 'temporal'
        : false;
  displayed.forEach((row, index) => {
    const color = layer.mark.fill ?? categoricalColor(theme, index, displayed.length);
    const ratio = (row.value - minimum) / span;
    const sourceRowIndex =
      row.sourceIds.flatMap((id) => {
        const candidate = sourceRowById.get(id);
        return candidate === undefined ? [] : [candidate];
      })[0] ?? index;
    const source =
      sourceRowIndex >= 0 && sourceRowIndex < context.table.length
        ? context.table.row(sourceRowIndex)
        : {};
    const rawCategory = rawCategoryById.get(row.id) ?? row.id;
    const base = nodeBase(`${layer.id}:ranked-bar:${row.id}`, {
      zIndex: layer.zIndex,
      opacity: layer.mark.opacity,
      interactive: performance.enableHitTesting,
      datum: {
        layerId: layer.id,
        rowIndex: index,
        datum: {
          ...source,
          id: row.id,
          rank: row.rank,
          previousRank: row.previousRank,
          rankChange: row.rankChange,
          value: row.value,
          sourceIds: [...row.sourceIds],
        },
        tooltip: {
          category: categoryTemporal ? temporalTooltipValue(rawCategory) : row.id,
          value: row.value,
          rank: row.rank,
          previousRank: row.previousRank,
          rankChange: row.rankChange,
          sourceIds: row.sourceIds.join(', '),
        },
      },
    });
    if (horizontal) {
      const slot = band.slot;
      const center = centers[index]!;
      const zero = plot.x + ((0 - minimum) / span) * plot.width;
      const end = plot.x + ratio * plot.width;
      nodes.push({
        type: 'rect',
        ...base,
        x: Math.min(zero, end),
        y: center - band.thickness / 2,
        width: Math.max(0.5, Math.abs(end - zero)),
        height: band.thickness,
        fill: color,
        lineWidth: 0,
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
      });
      nodes.push(
        textNode(
          context,
          `${layer.id}:rank-label:${row.id}`,
          plot.x + 4,
          center,
          `#${row.rank} ${row.id}`,
          {
            align: 'left',
            size: Math.min(12, slot * 0.36),
            fill: readableTextColor(color, '#ffffff', '#0f172a'),
          },
        ),
      );
    } else {
      const slot = band.slot;
      const center = centers[index]!;
      const zero = plot.y + plot.height - ((0 - minimum) / span) * plot.height;
      const end = plot.y + plot.height - ratio * plot.height;
      nodes.push({
        type: 'rect',
        ...base,
        x: center - band.thickness / 2,
        y: Math.min(zero, end),
        width: band.thickness,
        height: Math.max(0.5, Math.abs(end - zero)),
        fill: color,
        lineWidth: 0,
        cornerRadius: layer.mark.cornerRadius ?? theme.mark.barRadius,
      });
      nodes.push(
        textNode(
          context,
          `${layer.id}:rank-label:${row.id}`,
          center,
          Math.min(zero, end) - 8,
          `#${row.rank}`,
          {
            size: Math.min(12, slot * 0.28),
          },
        ),
      );
    }
  });
  return nodes;
};

/** Bubble compiler with absolute-area scaling, explicit zero/negative policy, and a shared size guide. */
export const compileAreaBubbleMark: MarkCompiler = (context) => {
  const sizeField = context.layer.mark.fields.size;
  if (sizeField === undefined || !context.table.has(sizeField)) return compileBubbleMark(context);
  const raw = Array.from({ length: context.table.length }, (_, rowIndex) => ({
    rowIndex,
    value: numericDataValue(context.table.value(rowIndex, sizeField)),
  })).filter((entry): entry is { rowIndex: number; value: number } => entry.value !== null);
  const negative = stringOption(context, 'negativeSize');
  const zero = stringOption(context, 'zeroSize');
  const values = raw.flatMap(({ value }) =>
    value < 0 && negative === 'hide'
      ? []
      : [value < 0 && negative === 'absolute' ? Math.abs(value) : value],
  );
  const domain: readonly [number, number] =
    values.length === 0
      ? [0, 1]
      : [Math.max(0, Math.min(...values)), Math.max(0, Math.max(...values))];
  const radiusOptions: AreaRadiusOptions = {
    minRadius: numberOption(context, 'minRadius') ?? context.layer.mark.radius ?? 3,
    maxRadius: numberOption(context, 'maxRadius') ?? 26,
    zero: zero === 'hide' || zero === 'zero' ? zero : 'minimum',
    negative: negative === 'absolute' || negative === 'hide' ? negative : 'reject',
  };
  const nodes: SceneNode[] = [];
  raw.forEach(({ rowIndex, value }) => {
    const xInput = scaleInput(context.table.value(rowIndex, context.layer.x.field));
    const yInput = scaleInput(context.table.value(rowIndex, context.layer.y.field));
    if (xInput === null || yInput === null) return;
    const radius = areaRadius(value, domain, radiusOptions);
    if (radius === null) return;
    const cx = context.xScale.map(xInput);
    const cy = context.yScale.map(yInput);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    nodes.push({
      type: 'circle',
      ...nodeBase(`${context.layer.id}:bubble:${rowIndex}`, {
        zIndex: context.layer.zIndex,
        opacity: context.layer.mark.opacity,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex,
          datum: context.table.row(rowIndex),
          tooltip: {
            ...context.table.row(rowIndex),
            sizeValue: value,
            radius,
            area: Math.PI * radius * radius,
          },
        },
      }),
      cx,
      cy,
      radius,
      fill: context.layer.mark.fill ?? colorWithOpacity(context.color, 0.72),
      stroke: context.layer.mark.stroke ?? context.color,
      lineWidth: context.layer.mark.lineWidth ?? 1.5,
    });
  });
  if (booleanOption(context, 'sizeGuide') !== false) {
    const guide = areaSizeGuide(domain, {
      ...radiusOptions,
      count: numberOption(context, 'sizeGuideCount') ?? 3,
    });
    const right = context.plot.x + context.plot.width - 8;
    let cursor = context.plot.y + 10;
    guide
      .slice()
      .reverse()
      .forEach((entry, index) => {
        cursor += entry.radius;
        nodes.push({
          type: 'circle',
          ...nodeBase(`${context.layer.id}:size-guide:${index}`, {
            zIndex: context.layer.zIndex + 3,
          }),
          cx: right - entry.radius,
          cy: cursor,
          radius: entry.radius,
          fill: colorWithOpacity(context.theme.colors.background, 0.64),
          stroke: context.theme.colors.mutedText,
          lineWidth: 1,
        });
        nodes.push(
          textNode(
            context,
            `${context.layer.id}:size-guide-label:${index}`,
            right - entry.radius * 2 - 5,
            cursor,
            String(Number(entry.value.toPrecision(4))),
            { align: 'right', size: 10 },
          ),
        );
        cursor += entry.radius + 5;
      });
  }
  return nodes;
};

/** Calendar compiler with year/month/week/day ranges, locale week starts, zones, and missing semantics. */
export const compileAdvancedCalendarMark: MarkCompiler = (context) => {
  const modeValue = stringOption(context, 'mode');
  const missingValue = stringOption(context, 'missing');
  const mode: CalendarMode =
    modeValue === 'month' || modeValue === 'week' || modeValue === 'day' ? modeValue : 'year';
  const missing: CalendarMissingPolicy =
    missingValue === 'zero' || missingValue === 'explicit' ? missingValue : 'gap';
  const dateField = context.layer.mark.fields.date ?? context.layer.x.field;
  const valueField = context.layer.mark.fields.value ?? context.layer.y.field;
  const explicitWeekStart = numberOption(context, 'weekStart');
  const timeZone = stringOption(context, 'timeZone') ?? 'UTC';
  const calendarLocale = {
    ...(context.locale === undefined ? {} : { locale: context.locale }),
    ...(explicitWeekStart === undefined ? {} : { weekStart: explicitWeekStart }),
    timeZone,
  };
  let cells: ReturnType<typeof calendarCells>;
  let weekStart: number;
  let weekdayLabels: ReturnType<typeof calendarWeekdayLabels>;
  try {
    weekStart = calendarWeekStart(calendarLocale);
    weekdayLabels = calendarWeekdayLabels(calendarLocale);
    cells = calendarCells(rows(context), {
      dateField,
      valueField,
      mode,
      ...calendarLocale,
      missing,
      ...(context.layer.mark.options.start === undefined
        ? {}
        : { start: context.layer.mark.options.start as string | number }),
      ...(context.layer.mark.options.end === undefined
        ? {}
        : { end: context.layer.mark.options.end as string | number }),
    });
  } catch (error) {
    if (
      booleanOption(context, 'strictCalendar') === true ||
      context.locale !== undefined ||
      explicitWeekStart !== undefined ||
      context.layer.mark.options.timeZone !== undefined
    ) {
      throw error;
    }
    return compileCalendarMark(context);
  }
  if (cells.length === 0) return [];
  const valueExtent = cells.flatMap(({ value }) => (value === null ? [] : [value]));
  const minimum = Math.min(...valueExtent, 0);
  const maximum = Math.max(...valueExtent, 1);
  const columns = Math.max(1, Math.max(...cells.map(({ weekIndex }) => weekIndex)) + 1);
  const labelFontSize = Math.max(
    8,
    Math.min(11, context.theme.typography.fontSize * 0.8, context.plot.height / 10),
  );
  const longestLabel = Math.max(...weekdayLabels.map(({ label }) => Array.from(label).length));
  const desiredHeaderWidth = longestLabel * labelFontSize * 0.62 + 9;
  const headerWidth = Math.min(desiredHeaderWidth, Math.max(0, context.plot.width - columns * 0.5));
  const gridX = context.plot.x + headerWidth;
  const gridWidth = Math.max(0.5, context.plot.width - headerWidth);
  const cellWidth = gridWidth / columns;
  const cellHeight = context.plot.height / 7;
  const nodes: SceneNode[] = weekdayLabels.map(({ weekday, label }, row) =>
    textNode(
      context,
      `${context.layer.id}:calendar-weekday:${weekday}`,
      context.plot.x + Math.max(4, headerWidth - 4),
      context.plot.y + (row + 0.5) * cellHeight,
      label,
      {
        align: 'right',
        size: labelFontSize,
        fill: context.theme.colors.mutedText,
        weight: 600,
      },
    ),
  );
  cells.forEach((cell, index) => {
    const row = (((cell.weekday - weekStart) % 7) + 7) % 7;
    const ratio =
      cell.value === null
        ? 0
        : (cell.value - minimum) / Math.max(Number.EPSILON, maximum - minimum);
    const fill =
      cell.value === null
        ? missing === 'explicit'
          ? colorWithOpacity(context.theme.colors.mutedText, 0.2)
          : context.theme.colors.surface
        : cell.value === 0
          ? colorWithOpacity(context.color, 0.14)
          : colorWithOpacity(context.color, 0.2 + ratio * 0.75);
    const x = gridX + cell.weekIndex * cellWidth + 0.7;
    const y = context.plot.y + row * cellHeight + 0.7;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:calendar:${cell.key}`, {
        zIndex: context.layer.zIndex,
        opacity: context.layer.mark.opacity,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: cell.sourceRows[0] ?? index,
          datum: {
            date: cell.date,
            value: cell.value,
            leapDay: cell.leapDay,
            monthBoundary: cell.monthBoundary,
            sourceRows: [...cell.sourceRows],
            locale: context.locale ?? 'en',
            timeZone,
            weekStart,
            weekday: cell.weekday,
          },
          tooltip: {
            date: cell.date,
            value: cell.value,
            mode,
            leapDay: cell.leapDay,
            monthBoundary: cell.monthBoundary,
            missing: cell.value === null,
            sourceRows: cell.sourceRows.join(', '),
            locale: context.locale ?? 'en',
            timeZone,
            weekStart,
            weekday: cell.weekday,
          },
        },
      }),
      x,
      y,
      width: Math.max(0.5, cellWidth - 1.4),
      height: Math.max(0.5, cellHeight - 1.4),
      fill,
      stroke: cell.monthBoundary ? context.theme.colors.text : context.theme.colors.background,
      lineWidth: cell.monthBoundary ? 1.6 : 0.6,
      cornerRadius: context.layer.mark.cornerRadius ?? 1.5,
    });
    if (cell.value === null && missing === 'explicit') {
      nodes.push({
        type: 'line',
        ...nodeBase(`${context.layer.id}:calendar-missing:${cell.key}`, {
          zIndex: context.layer.zIndex + 1,
        }),
        x1: x,
        y1: y,
        x2: x + Math.max(0.5, cellWidth - 1.4),
        y2: y + Math.max(0.5, cellHeight - 1.4),
        stroke: context.theme.colors.mutedText,
        lineWidth: 0.7,
      });
    }
  });
  return nodes;
};

function observedInterval(context: MarkCompileContext): number {
  const times = Array.from({ length: context.table.length }, (_, index) =>
    numericDataValue(context.table.value(index, context.layer.x.field), true),
  )
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const gaps = times
    .slice(1)
    .map((value, index) => value - times[index]!)
    .filter((value) => value > 0);
  return Math.max(1, Math.min(...gaps, 86_400_000));
}

/** OHLC compiler with aggregation, session calendar, extended-hours policy, gapless axis, and navigator. */
export const compileAdvancedCandlestickMark: MarkCompiler = (context) => {
  const hasAdvanced = [
    'aggregateIntervalMs',
    'timeZone',
    'sessionStartMinute',
    'sessionEndMinute',
    'tradingDays',
    'excludedDates',
    'includedDates',
    'extendedHours',
    'navigator',
    'navigatorStart',
    'navigatorEnd',
  ].some((name) => context.layer.mark.options[name] !== undefined);
  if (!hasAdvanced) return compileCandlestickMark(context);
  const extendedValue = stringOption(context, 'extendedHours');
  const extendedHours: ExtendedHoursPolicy =
    extendedValue === 'exclude' || extendedValue === 'separate' ? extendedValue : 'include';
  const startMinute = numberOption(context, 'sessionStartMinute') ?? 0;
  const endMinute = numberOption(context, 'sessionEndMinute') ?? 1_440;
  const buckets = aggregateOhlc(rows(context), {
    timeField: context.layer.x.field,
    openField: context.layer.mark.fields.open ?? 'open',
    highField: context.layer.mark.fields.high ?? 'high',
    lowField: context.layer.mark.fields.low ?? 'low',
    closeField: context.layer.mark.fields.close ?? context.layer.y.field,
    ...(context.layer.mark.fields.volume === undefined
      ? {}
      : { volumeField: context.layer.mark.fields.volume }),
    intervalMs: numberOption(context, 'aggregateIntervalMs') ?? observedInterval(context),
    timeZone: stringOption(context, 'timeZone') ?? 'UTC',
    session: { startMinute, endMinute },
    ...(numberArrayOption(context, 'tradingDays') === undefined
      ? {}
      : { tradingDays: numberArrayOption(context, 'tradingDays')! }),
    ...(stringArrayOption(context, 'excludedDates') === undefined
      ? {}
      : { excludedDates: stringArrayOption(context, 'excludedDates')! }),
    ...(stringArrayOption(context, 'includedDates') === undefined
      ? {}
      : { includedDates: stringArrayOption(context, 'includedDates')! }),
    extendedHours,
  });
  if (buckets.length === 0) return [];
  const [from, to] = navigatorWindow(
    buckets.length,
    numberOption(context, 'navigatorStart') ?? 0,
    numberOption(context, 'navigatorEnd') ?? buckets.length,
  );
  let visible = buckets.slice(from, to);
  if (context.xScale.bandwidth > 0) {
    const domain = context.xScale.domain();
    if (domain.length === 2 && typeof domain[0] === 'number' && typeof domain[1] === 'number') {
      const minimumTime = Math.min(domain[0], domain[1]);
      const maximumTime = Math.max(domain[0], domain[1]);
      const withinScale = visible.filter(({ time }) => time >= minimumTime && time <= maximumTime);
      if (withinScale.length > 0) visible = withinScale;
    }
  }
  if (visible.length === 0) return [];
  const minimum = Math.min(...visible.map(({ low }) => low));
  const maximum = Math.max(...visible.map(({ high }) => high));
  const span = Math.max(Number.EPSILON, maximum - minimum);
  const navigatorHeight =
    booleanOption(context, 'navigator') === false ? 0 : Math.min(28, context.plot.height * 0.13);
  const chartHeight = context.plot.height - navigatorHeight - (navigatorHeight > 0 ? 5 : 0);
  const selectedIndices = selectBarCategoryIndices({
    categoryCount: visible.length,
    plotSpan: context.plot.width,
    maximumMarks: context.performance.maxBarMarks,
    marksPerCategory: 2,
  });
  const rendered = selectedIndices.map((index) => ({
    bucket: visible[index]!,
    visibleIndex: index,
  }));
  const band = resolveBarBandLayout({
    scale: context.xScale,
    centers: rendered.map(({ bucket }) => context.xScale.map(bucket.time)),
    plotSpan: context.plot.width,
    categoryCount: visible.length,
    lodSampled: rendered.length < visible.length,
    barWidthRatio: 0.62,
    maxThickness: 64,
    preserveAuthoredRatio: preservesReferenceBarRatio(context.theme.name),
  });
  const mapY = (value: number) =>
    context.plot.y + chartHeight - ((value - minimum) / span) * chartHeight;
  const nodes: SceneNode[] = [];
  rendered.forEach(({ bucket, visibleIndex }) => {
    const x = context.xScale.map(bucket.time);
    const open = mapY(bucket.open);
    const close = mapY(bucket.close);
    const high = mapY(bucket.high);
    const low = mapY(bucket.low);
    const rising = bucket.close >= bucket.open;
    const color = rising
      ? categoricalColor(context.theme, 1, 4)
      : categoricalColor(context.theme, 3, 4);
    const opacity =
      bucket.extended && extendedHours === 'separate'
        ? context.layer.mark.opacity * 0.45
        : context.layer.mark.opacity;
    const sourceRowIndex = bucket.sourceRows.at(-1) ?? visibleIndex;
    const source =
      sourceRowIndex >= 0 && sourceRowIndex < context.table.length
        ? context.table.row(sourceRowIndex)
        : {};
    nodes.push({
      type: 'line',
      ...nodeBase(`${context.layer.id}:ohlc-wick:${bucket.tradingIndex}`, {
        zIndex: context.layer.zIndex,
        opacity,
      }),
      x1: x,
      y1: high,
      x2: x,
      y2: low,
      stroke: color,
      lineWidth: 1.3,
    });
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:ohlc:${bucket.tradingIndex}`, {
        zIndex: context.layer.zIndex + 1,
        opacity,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: sourceRowIndex,
          datum: {
            ...source,
            ...bucket,
            sourceRows: [...bucket.sourceRows],
          },
          tooltip: {
            time: temporalTooltipValue(bucket.time),
            tradingIndex: bucket.tradingIndex,
            open: bucket.open,
            high: bucket.high,
            low: bucket.low,
            close: bucket.close,
            volume: bucket.volume,
            extended: bucket.extended,
            sourceRows: bucket.sourceRows.join(', '),
          },
        },
      }),
      x: x - band.thickness / 2,
      y: Math.min(open, close),
      width: band.thickness,
      height: Math.max(1.5, Math.abs(open - close)),
      fill: context.layer.mark.fill ?? colorWithOpacity(color, 0.72),
      stroke: context.layer.mark.stroke ?? color,
      lineWidth: context.layer.mark.lineWidth ?? 1.2,
      cornerRadius: context.layer.mark.cornerRadius ?? 1,
    });
  });
  if (navigatorHeight > 0) {
    const y = context.plot.y + context.plot.height - navigatorHeight;
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:navigator-track`, { zIndex: context.layer.zIndex + 3 }),
      x: context.plot.x,
      y,
      width: context.plot.width,
      height: navigatorHeight,
      fill: context.theme.colors.surface,
      stroke: context.theme.colors.axis,
      lineWidth: 1,
      cornerRadius: 2,
    });
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:navigator-window`, {
        zIndex: context.layer.zIndex + 4,
        interactive: true,
        datum: {
          layerId: context.layer.id,
          rowIndex: from,
          datum: { start: from, end: to, total: buckets.length },
          tooltip: { start: from, end: to, total: buckets.length },
          familyInteraction: {
            kind: 'navigator-window',
            family: 'candlestick',
            minimum: 0,
            maximum: buckets.length,
            start: from,
            end: to,
            plot: {
              x: context.plot.x,
              y,
              width: context.plot.width,
              height: navigatorHeight,
            },
          } satisfies FamilyDatumInteraction,
        },
      }),
      x: context.plot.x + (from / buckets.length) * context.plot.width,
      y: y + 2,
      width: Math.max(4, ((to - from) / buckets.length) * context.plot.width),
      height: Math.max(2, navigatorHeight - 4),
      fill: colorWithOpacity(context.theme.colors.focus, 0.28),
      stroke: context.theme.colors.focus,
      lineWidth: 1.2,
      cornerRadius: 2,
    });
  }
  return nodes;
};

/** Difference compiler with aligned baselines, policy values, and exact interpolated crossings. */
export const compileAdvancedDifferenceMark: MarkCompiler = (context) => {
  const policyValue = stringOption(context, 'policy');
  const policy: DifferencePolicy =
    policyValue === 'relative' || policyValue === 'percent' ? policyValue : 'absolute';
  const baselineField =
    context.layer.mark.fields.baseline ?? context.layer.mark.fields.old ?? 'old';
  const comparisonField =
    context.layer.mark.fields.comparison ?? context.layer.mark.fields.new ?? context.layer.y.field;
  const seriesField = context.layer.mark.fields.series;
  const valueField = context.layer.mark.fields.value;
  const baselineSeries = stringOption(context, 'baselineSeries');
  const comparisonSeries = stringOption(context, 'comparisonSeries');
  const longForm =
    seriesField !== undefined &&
    valueField !== undefined &&
    baselineSeries !== undefined &&
    comparisonSeries !== undefined;
  if (!longForm && (!context.table.has(baselineField) || !context.table.has(comparisonField)))
    return compileDiffMark(context);
  const unmatchedValue = stringOption(context, 'unmatched');
  const unmatched =
    unmatchedValue === 'drop' || unmatchedValue === 'zero' ? unmatchedValue : 'error';
  const zeroBaselineValue = stringOption(context, 'zeroBaseline');
  const zeroBaseline =
    zeroBaselineValue === 'skip' || zeroBaselineValue === 'absolute' ? zeroBaselineValue : 'error';
  const points = differenceSeries(rows(context), {
    keyField: context.layer.x.field,
    ...(longForm
      ? {
          seriesField,
          valueField,
          baselineSeries,
          comparisonSeries,
          unmatched,
        }
      : { baselineField, comparisonField }),
    policy,
    zeroBaseline,
    interpolateCrossings: booleanOption(context, 'interpolateCrossings') !== false,
    keyType: context.xType,
  });
  const nodes: SceneNode[] = [];
  points.forEach((point, index) => {
    const next = points[index + 1];
    const x = context.xScale.map(scaleInput(point.key) ?? index);
    const baseline = context.yScale.map(point.baseline);
    const comparison = context.yScale.map(point.comparison);
    if (next !== undefined && next.continuousFromPrevious) {
      const nx = context.xScale.map(scaleInput(next.key) ?? index + 1);
      const nb = context.yScale.map(next.baseline);
      const nc = context.yScale.map(next.comparison);
      const positive = (point.difference + next.difference) / 2 >= 0;
      nodes.push({
        type: 'path',
        ...nodeBase(`${context.layer.id}:difference-area:${index}`, {
          zIndex: context.layer.zIndex,
          opacity: context.layer.mark.opacity,
        }),
        points: [
          { x, y: baseline },
          { x, y: comparison },
          { x: nx, y: nc },
          { x: nx, y: nb },
        ],
        closed: true,
        fill: colorWithOpacity(categoricalColor(context.theme, positive ? 1 : 3, 4), 0.45),
        lineWidth: 0,
      });
    }
    const sourceRowIndex = point.sourceRows[0] ?? index;
    const source =
      sourceRowIndex >= 0 && sourceRowIndex < context.table.length
        ? context.table.row(sourceRowIndex)
        : {};
    const tooltipKey =
      context.xType === 'temporal'
        ? temporalTooltipValue(
            point.crossing === true ? point.key : (source[context.layer.x.field] ?? point.key),
          )
        : point.key;
    nodes.push({
      type: 'circle',
      ...nodeBase(`${context.layer.id}:difference:${index}`, {
        zIndex: context.layer.zIndex + 2,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: sourceRowIndex,
          datum: {
            ...source,
            key: point.key,
            baseline: point.baseline,
            comparison: point.comparison,
            difference: point.difference,
            crossing: point.crossing ?? false,
            sourceRows: [...point.sourceRows],
          },
          tooltip: {
            key: tooltipKey,
            baseline: point.baseline,
            comparison: point.comparison,
            difference: point.difference,
            policy,
            unmatched: longForm ? unmatched : null,
            zeroBaseline,
            crossing: point.crossing ?? false,
            sourceRows: point.sourceRows.join(', '),
          },
        },
      }),
      cx: x,
      cy: comparison,
      radius: point.crossing === true ? 3.5 : 2.2,
      fill: point.crossing === true ? context.theme.colors.focus : context.color,
      stroke: context.theme.colors.background,
      lineWidth: 1,
    });
  });
  return nodes;
};

/** Raw-data interval compiler for CI/PI/SE/SD/IQR/HDI with horizontal and vertical provenance. */
export const compileEstimatedIntervalMark: MarkCompiler = (context) => {
  const rawKind = stringOption(context, 'kind');
  const estimatorEnabled = booleanOption(context, 'rawEstimator') === true || rawKind !== undefined;
  if (!estimatorEnabled) return compileIntervalMark(context);
  const kind: IntervalKind =
    rawKind === 'PI' ||
    rawKind === 'SE' ||
    rawKind === 'SD' ||
    rawKind === 'IQR' ||
    rawKind === 'HDI'
      ? rawKind
      : 'CI';
  const orientation =
    stringOption(context, 'orientation') === 'horizontal' ? 'horizontal' : 'vertical';
  const categoryField = orientation === 'vertical' ? context.layer.x.field : context.layer.y.field;
  const valueField = orientation === 'vertical' ? context.layer.y.field : context.layer.x.field;
  const categoryTemporal =
    orientation === 'vertical' ? context.xType === 'temporal' : context.yType === 'temporal';
  const groups = new Map<
    string,
    { key: string | number | Date; values: number[]; sourceRows: number[] }
  >();
  for (let rowIndex = 0; rowIndex < context.table.length; rowIndex += 1) {
    const rawKey = context.table.value(rowIndex, categoryField);
    const value = numericDataValue(context.table.value(rowIndex, valueField));
    if (
      value === null ||
      rawKey === null ||
      rawKey === undefined ||
      typeof rawKey === 'boolean' ||
      (typeof rawKey === 'object' && !(rawKey instanceof Date))
    )
      continue;
    const key = rawKey as string | number | Date;
    const id = key instanceof Date ? key.toISOString() : String(key);
    const group = groups.get(id) ?? { key, values: [], sourceRows: [] };
    group.values.push(value);
    group.sourceRows.push(rowIndex);
    groups.set(id, group);
  }
  const nodes: SceneNode[] = [];
  [...groups.values()].forEach((group, groupIndex) => {
    const interval = estimateInterval(group.values, {
      kind,
      confidence: numberOption(context, 'confidence') ?? 0.95,
      estimator: stringOption(context, 'estimator') === 'median' ? 'median' : 'mean',
      orientation,
    });
    if (interval === null) return;
    const categoryScale = orientation === 'vertical' ? context.xScale : context.yScale;
    const valueScale = orientation === 'vertical' ? context.yScale : context.xScale;
    const category = categoryScale.map(group.key);
    const low = valueScale.map(interval.low);
    const high = valueScale.map(interval.high);
    const estimate = valueScale.map(interval.estimate);
    const cap = categoryScale instanceof BandScale ? categoryScale.bandwidth * 0.25 : 7;
    const base = `${context.layer.id}:estimated-interval:${groupIndex}`;
    const common = {
      stroke: context.layer.mark.stroke ?? context.color,
      lineWidth: context.layer.mark.lineWidth ?? 2,
      lineCap: context.theme.mark.lineCap ?? 'round',
    } as const;
    const range: LineNode =
      orientation === 'vertical'
        ? {
            type: 'line',
            ...nodeBase(`${base}:range`, { zIndex: context.layer.zIndex }),
            x1: category,
            x2: category,
            y1: high,
            y2: low,
            ...common,
          }
        : {
            type: 'line',
            ...nodeBase(`${base}:range`, { zIndex: context.layer.zIndex }),
            x1: low,
            x2: high,
            y1: category,
            y2: category,
            ...common,
          };
    nodes.push(range);
    for (const [name, coordinate] of [
      ['low', low],
      ['high', high],
    ] as const) {
      nodes.push(
        orientation === 'vertical'
          ? {
              type: 'line',
              ...nodeBase(`${base}:${name}`, { zIndex: context.layer.zIndex }),
              x1: category - cap,
              x2: category + cap,
              y1: coordinate,
              y2: coordinate,
              ...common,
            }
          : {
              type: 'line',
              ...nodeBase(`${base}:${name}`, { zIndex: context.layer.zIndex }),
              x1: coordinate,
              x2: coordinate,
              y1: category - cap,
              y2: category + cap,
              ...common,
            },
      );
    }
    nodes.push({
      type: 'circle',
      ...nodeBase(`${base}:estimate`, {
        zIndex: context.layer.zIndex + 1,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: group.sourceRows[0] ?? groupIndex,
          datum: {
            ...context.table.row(group.sourceRows[0] ?? groupIndex),
            category: group.key,
            estimate: interval.estimate,
            low: interval.low,
            high: interval.high,
            kind,
            sourceRows: [...group.sourceRows],
          },
          tooltip: {
            category: categoryTemporal ? temporalTooltipValue(group.key) : group.key,
            estimate: interval.estimate,
            low: interval.low,
            high: interval.high,
            kind,
            confidence: interval.confidence,
            summary: interval.summary,
            sourceRows: group.sourceRows.join(', '),
          },
        },
      }),
      cx: orientation === 'vertical' ? category : estimate,
      cy: orientation === 'vertical' ? estimate : category,
      radius: context.layer.mark.radius ?? 4,
      fill: context.layer.mark.fill ?? context.theme.colors.background,
      stroke: context.layer.mark.stroke ?? context.color,
      lineWidth: 2,
    });
  });
  return nodes;
};

/** Line compiler with explicit duplicate aggregation and implicit-sort policy. */
export const compileOrderedLineMark: MarkCompiler = (context) => {
  const duplicateValue = stringOption(context, 'duplicates');
  const sortValue = stringOption(context, 'sortPolicy');
  if (duplicateValue === undefined && sortValue === undefined) return compileLineMark(context);
  const duplicates: DuplicatePolicy =
    duplicateValue === 'first' ||
    duplicateValue === 'last' ||
    duplicateValue === 'sum' ||
    duplicateValue === 'mean'
      ? duplicateValue
      : 'error';
  const sort: SortPolicy =
    sortValue === 'ascending' || sortValue === 'descending' || sortValue === 'error'
      ? sortValue
      : 'preserve';
  const points = prepareOrderedSeries(rows(context), {
    keyField: context.layer.x.field,
    valueField: context.layer.y.field,
    duplicates,
    sort,
    keyType: context.xType,
  });
  const scenePoints: Point[] = points.flatMap((point) => {
    const key = scaleInput(point.key);
    if (key === null) return [];
    return [{ x: context.xScale.map(key), y: context.yScale.map(point.value) }];
  });
  if (scenePoints.length < 2) return [];
  const nodes: SceneNode[] = [
    {
      type: 'path',
      ...nodeBase(`${context.layer.id}:ordered-line`, {
        zIndex: context.layer.zIndex,
        opacity: context.layer.mark.opacity,
      }),
      points: scenePoints,
      closed: false,
      stroke: context.layer.mark.stroke ?? context.color,
      lineWidth: context.layer.mark.lineWidth ?? context.theme.mark.lineWidth,
      lineCap: context.theme.mark.lineCap ?? 'round',
      lineJoin: context.theme.mark.lineJoin ?? 'round',
    },
  ];
  points.forEach((point, index) => {
    const key = scaleInput(point.key);
    if (key === null) return;
    const sourceRowIndex = point.sourceRows[0] ?? index;
    const source =
      sourceRowIndex >= 0 && sourceRowIndex < context.table.length
        ? context.table.row(sourceRowIndex)
        : {};
    const tooltipKey =
      context.xType === 'temporal'
        ? temporalTooltipValue(source[context.layer.x.field] ?? point.key)
        : point.key;
    nodes.push({
      type: 'circle',
      ...nodeBase(`${context.layer.id}:ordered-line-point:${index}`, {
        zIndex: context.layer.zIndex + 1,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: sourceRowIndex,
          datum: {
            ...source,
            key: point.key,
            value: point.value,
            sourceRows: [...point.sourceRows],
          },
          tooltip: {
            key: tooltipKey,
            value: point.value,
            duplicates,
            sort,
            sourceRows: point.sourceRows.join(', '),
          },
        },
      }),
      cx: context.xScale.map(key),
      cy: context.yScale.map(point.value),
      radius: context.layer.mark.radius ?? 3,
      fill: context.layer.mark.fill ?? context.color,
      stroke: context.theme.colors.background,
      lineWidth: 1,
    });
  });
  return nodes;
};

/** Waterfall compiler with explicit relative/absolute/subtotal/total semantics. */
export const compileSemanticWaterfallMark: MarkCompiler = (context) => {
  const kindField = context.layer.mark.fields.kind ?? 'kind';
  if (!context.table.has(kindField) && booleanOption(context, 'explicitSemantics') !== true)
    return compileWaterfallMark(context);
  const values = Array.from({ length: context.table.length }, (_, rowIndex) => {
    const rawKind = context.table.has(kindField)
      ? context.table.value(rowIndex, kindField)
      : 'relative';
    const kind: WaterfallKind =
      rawKind === 'absolute' || rawKind === 'subtotal' || rawKind === 'total'
        ? rawKind
        : 'relative';
    const rawLabel = context.table.value(rowIndex, context.layer.x.field);
    return {
      value: numericDataValue(context.table.value(rowIndex, context.layer.y.field)) ?? 0,
      kind,
      label: rawLabel === null || rawLabel === undefined ? `step-${rowIndex}` : String(rawLabel),
    };
  });
  const steps = waterfallSteps(values);
  const minimum = Math.min(0, ...steps.flatMap(({ start, end }) => [start, end]));
  const maximum = Math.max(0, ...steps.flatMap(({ start, end }) => [start, end]));
  const span = Math.max(Number.EPSILON, maximum - minimum);
  const selectedIndices = selectBarCategoryIndices({
    categoryCount: steps.length,
    plotSpan: context.plot.width,
    maximumMarks: context.performance.maxBarMarks,
    marksPerCategory: 2,
  });
  const centerFor = (index: number): number => {
    const input = scaleInput(context.table.value(index, context.layer.x.field));
    const mapped = input === null ? Number.NaN : context.xScale.map(input);
    return Number.isFinite(mapped)
      ? mapped
      : context.plot.x + ((index + 0.5) / Math.max(1, steps.length)) * context.plot.width;
  };
  const band = resolveBarBandLayout({
    scale: context.xScale,
    centers: selectedIndices.map(centerFor),
    plotSpan: context.plot.width,
    categoryCount: steps.length,
    lodSampled: selectedIndices.length < steps.length,
    barWidthRatio: 0.74,
    maxThickness: 64,
    preserveAuthoredRatio: preservesReferenceBarRatio(context.theme.name),
  });
  const mapY = (value: number) =>
    context.plot.y + context.plot.height - ((value - minimum) / span) * context.plot.height;
  const nodes: SceneNode[] = [];
  selectedIndices.forEach((index, selectedIndex) => {
    const step = steps[index]!;
    const source = context.table.row(index);
    const rawLabel = source[context.layer.x.field] ?? step.label ?? '';
    const start = mapY(step.start);
    const end = mapY(step.end);
    const x = centerFor(index);
    const color =
      step.kind === 'subtotal' || step.kind === 'total'
        ? context.theme.colors.focus
        : categoricalColor(context.theme, step.change >= 0 ? 1 : 3, 4);
    nodes.push({
      type: 'rect',
      ...nodeBase(`${context.layer.id}:semantic-waterfall:${index}`, {
        zIndex: context.layer.zIndex,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: index,
          datum: { ...source, ...step },
          tooltip: {
            label:
              context.xType === 'temporal' ? temporalTooltipValue(rawLabel) : (step.label ?? ''),
            kind: step.kind,
            value: step.value,
            start: step.start,
            end: step.end,
            change: step.change,
          },
        },
      }),
      x: x - band.thickness / 2,
      y: Math.min(start, end),
      width: band.thickness,
      height: Math.max(1, Math.abs(start - end)),
      fill: context.layer.mark.fill ?? colorWithOpacity(color, 0.78),
      stroke: context.layer.mark.stroke ?? color,
      lineWidth: context.layer.mark.lineWidth ?? 1,
      cornerRadius: context.layer.mark.cornerRadius ?? context.theme.mark.barRadius,
    });
    const nextIndex = selectedIndices[selectedIndex + 1];
    if (nextIndex === index + 1) {
      const connectorY = mapY(step.end);
      const nextX = centerFor(nextIndex);
      nodes.push({
        type: 'line',
        ...nodeBase(`${context.layer.id}:semantic-waterfall-connector:${index}`, {
          zIndex: context.layer.zIndex - 1,
        }),
        x1: x + band.thickness / 2,
        x2: nextX - band.thickness / 2,
        y1: connectorY,
        y2: connectorY,
        stroke: context.theme.colors.axis,
        lineWidth: 1,
        dash: [3, 3],
      });
    }
  });
  return nodes;
};
