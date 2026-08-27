import type { MarkCompiler, MarkCompileContext } from '../compiler/types.js';
import { GraflumeError } from '../core/errors.js';
import { temporalTimestamp } from '../format/temporal.js';
import {
  buildPriceBlocks,
  buildVolumeProfiles,
  type FinancialBarInput,
  type PriceBlockOptions,
  type PriceBlockSizing,
  type VolumeProfileOptions,
  type VolumeProfileRows,
  type VolumeProfileScope,
} from '../data/finance-analytics.js';
import { nodeBase } from '../scene/factory.js';
import type { SceneNode } from '../scene/types.js';
import { colorWithOpacity } from '../theme/color.js';
import {
  preservesReferenceBarRatio,
  resolveBarBandLayout,
  selectBarCategoryIndices,
} from './bar-layout.js';
import { compileVolumeProfileMark } from './series.js';
import { numericDataValue, temporalTooltipValue } from './utils.js';

function optionString(context: MarkCompileContext, name: string): string | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'string' ? value : undefined;
}

function optionNumber(context: MarkCompileContext, name: string): number | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionBoolean(context: MarkCompileContext, name: string): boolean | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'boolean' ? value : undefined;
}

function field(context: MarkCompileContext, name: string, fallback: string): string {
  return context.layer.mark.fields[name] ?? fallback;
}

function timeValue(value: unknown, fallback: number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = temporalTimestamp(value, true);
    if (parsed !== null) return parsed;
  }
  return fallback;
}

function priceExtent(values: readonly { readonly low: number; readonly high: number }[]): {
  readonly minimum: number;
  readonly maximum: number;
} {
  const first = values[0]!;
  let minimum = first.low;
  let maximum = first.high;
  for (let index = 1; index < values.length; index += 1) {
    minimum = Math.min(minimum, values[index]!.low);
    maximum = Math.max(maximum, values[index]!.high);
  }
  return { minimum, maximum };
}

function numericExtent(values: readonly number[]): {
  readonly minimum: number;
  readonly maximum: number;
} {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return { minimum, maximum };
}

function financialRows(context: MarkCompileContext): FinancialBarInput[] {
  const { table, layer } = context;
  const openField = field(context, 'open', 'open');
  const highField = field(context, 'high', 'high');
  const lowField = field(context, 'low', 'low');
  const closeField = field(context, 'close', layer.y.field);
  const volumeField = field(context, 'volume', 'volume');
  const sessionField = field(context, 'session', 'session');
  const idField = field(context, 'id', 'id');
  const output: FinancialBarInput[] = [];
  let previousClose: number | null = null;
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const close = numericDataValue(table.value(rowIndex, closeField));
    if (close === null) continue;
    const open = table.has(openField)
      ? (numericDataValue(table.value(rowIndex, openField)) ?? previousClose ?? close)
      : (previousClose ?? close);
    const sourceHigh = table.has(highField)
      ? (numericDataValue(table.value(rowIndex, highField)) ?? Math.max(open, close))
      : Math.max(open, close);
    const sourceLow = table.has(lowField)
      ? (numericDataValue(table.value(rowIndex, lowField)) ?? Math.min(open, close))
      : Math.min(open, close);
    const rawId = table.has(idField) ? table.value(rowIndex, idField) : undefined;
    const rawSession = table.has(sessionField) ? table.value(rowIndex, sessionField) : undefined;
    output.push({
      id: rawId === null || rawId === undefined ? `row-${rowIndex}` : String(rawId),
      time: timeValue(table.value(rowIndex, layer.x.field), rowIndex),
      open,
      high: Math.max(sourceHigh, open, close),
      low: Math.min(sourceLow, open, close),
      close,
      volume: table.has(volumeField)
        ? (numericDataValue(table.value(rowIndex, volumeField)) ?? 0)
        : 0,
      session:
        rawSession === null || rawSession === undefined || String(rawSession).trim() === ''
          ? 'default'
          : String(rawSession),
    });
    previousClose = close;
  }
  return output;
}

function priceBlockSizing(context: MarkCompileContext): PriceBlockSizing | undefined {
  const mode = optionString(context, 'sizing') ?? optionString(context, 'sizeMode');
  if (mode === 'fixed') {
    const value = optionNumber(context, 'brickSize') ?? optionNumber(context, 'size');
    return value === undefined ? undefined : { mode, value };
  }
  if (mode === 'percent' || mode === 'log') {
    const value = optionNumber(context, 'percent') ?? optionNumber(context, 'size');
    return value === undefined ? undefined : { mode, value };
  }
  if (mode === 'atr') {
    const period = optionNumber(context, 'atrPeriod');
    const multiplier = optionNumber(context, 'atrMultiplier');
    return {
      mode,
      ...(period === undefined ? {} : { period }),
      ...(multiplier === undefined ? {} : { multiplier }),
    };
  }
  const legacy = optionNumber(context, 'brickSize');
  return legacy === undefined ? undefined : { mode: 'fixed', value: legacy };
}

/** Price-block mark compiler for Renko, Kagi, three-line break, and range bars. */
export const compilePriceBlocksMark: MarkCompiler = (context) => {
  const modeValue = optionString(context, 'mode') ?? optionString(context, 'kind') ?? 'renko';
  const mode =
    modeValue === 'kagi' || modeValue === 'three-line-break' || modeValue === 'range-bars'
      ? modeValue
      : 'renko';
  const sizing = priceBlockSizing(context);
  const reversal = optionNumber(context, 'reversal');
  const lineBreaks = optionNumber(context, 'lineBreaks');
  const resetBySession = optionBoolean(context, 'resetBySession');
  const options: PriceBlockOptions = {
    mode,
    ...(sizing === undefined ? {} : { sizing }),
    ...(reversal === undefined ? {} : { reversal }),
    ...(lineBreaks === undefined ? {} : { lineBreaks }),
    ...(optionString(context, 'intrabarPath') === undefined
      ? {}
      : {
          intrabarPath: optionString(context, 'intrabarPath') as
            'auto' | 'high-low' | 'low-high' | 'close-only',
        }),
    ...(resetBySession === undefined ? {} : { resetBySession }),
  };
  const blocks = buildPriceBlocks(financialRows(context), options);
  if (blocks.length === 0) return [];
  const { layer, plot, theme, performance } = context;
  const { minimum, maximum } = priceExtent(blocks);
  const span = Math.max(Number.EPSILON, maximum - minimum);
  const nativeStride = plot.width / Math.max(1, blocks.length);
  const selectedIndices = selectBarCategoryIndices({
    categoryCount: blocks.length,
    plotSpan: plot.width,
    maximumMarks: performance.maxBarMarks,
  });
  const centers = selectedIndices.map((index) => plot.x + index * nativeStride + nativeStride / 2);
  const band = resolveBarBandLayout({
    scale: context.xScale,
    centers,
    plotSpan: plot.width,
    categoryCount: blocks.length,
    lodSampled: selectedIndices.length < blocks.length,
    barWidthRatio: 0.74,
    maxThickness: 64,
    preserveAuthoredRatio: preservesReferenceBarRatio(theme.name),
  });
  const mapY = (value: number) => plot.y + plot.height - ((value - minimum) / span) * plot.height;
  const risingColor = theme.colors.palette[1] ?? context.color;
  const fallingColor = theme.colors.palette[3] ?? context.color;
  const nodes: SceneNode[] = [];
  selectedIndices.forEach((index) => {
    const block = blocks[index]!;
    const sourceRowIndex = block.provenance.sourceIndexes.at(-1) ?? index;
    const source =
      sourceRowIndex >= 0 && sourceRowIndex < context.table.length
        ? context.table.row(sourceRowIndex)
        : {};
    const sourceStartIndex = block.provenance.sourceIndexes[0];
    const sourceStart =
      sourceStartIndex === undefined
        ? block.provenance.timeStart
        : (context.table.value(sourceStartIndex, context.layer.x.field) ??
          block.provenance.timeStart);
    const sourceEnd =
      sourceRowIndex >= 0 && sourceRowIndex < context.table.length
        ? (context.table.value(sourceRowIndex, context.layer.x.field) ?? block.provenance.timeEnd)
        : block.provenance.timeEnd;
    const color = block.direction === 'up' ? risingColor : fallingColor;
    const base = nodeBase(`${layer.id}:${block.mode}:${index}`, {
      zIndex: layer.zIndex,
      opacity: layer.mark.opacity,
      interactive: performance.enableHitTesting,
      datum: {
        layerId: layer.id,
        rowIndex: sourceRowIndex,
        datum: {
          ...source,
          id: block.id,
          mode: block.mode,
          open: block.open,
          high: block.high,
          low: block.low,
          close: block.close,
          direction: block.direction,
          size: block.size,
          session: block.session,
          sourceIndexes: [...block.provenance.sourceIndexes],
          sourceIds: [...block.provenance.sourceIds],
        },
        tooltip: {
          mode: block.mode,
          open: block.open,
          high: block.high,
          low: block.low,
          close: block.close,
          size: block.size,
          direction: block.direction,
          session: block.session,
          sourceOpen: block.provenance.sourceOpen,
          sourceHigh: block.provenance.sourceHigh,
          sourceLow: block.provenance.sourceLow,
          sourceClose: block.provenance.sourceClose,
          sourceVolume: block.provenance.sourceVolume,
          timeStart:
            context.xType === 'temporal'
              ? temporalTooltipValue(sourceStart)
              : block.provenance.timeStart,
          timeEnd:
            context.xType === 'temporal'
              ? temporalTooltipValue(sourceEnd)
              : block.provenance.timeEnd,
          sourceIds: block.provenance.sourceIds.join(', '),
        },
      },
    });
    const x = plot.x + index * nativeStride + nativeStride / 2;
    const open = mapY(block.open);
    const close = mapY(block.close);
    if (block.mode === 'kagi') {
      nodes.push({
        type: 'path',
        ...base,
        points: [
          { x: x - Math.min(nativeStride, band.categoryStride) / 2, y: open },
          { x, y: open },
          { x, y: close },
          { x: x + Math.min(nativeStride, band.categoryStride) / 2, y: close },
        ],
        closed: false,
        stroke: layer.mark.stroke ?? color,
        lineWidth: block.thick
          ? Math.max(3, layer.mark.lineWidth ?? 3.6)
          : (layer.mark.lineWidth ?? 1.5),
        lineCap: theme.mark.lineCap ?? 'round',
        lineJoin: theme.mark.lineJoin ?? 'round',
      });
      return;
    }
    nodes.push({
      type: 'rect',
      ...base,
      x: x - band.thickness / 2,
      y: Math.min(open, close),
      width: band.thickness,
      height: Math.max(1.5, Math.abs(open - close)),
      fill: layer.mark.fill ?? colorWithOpacity(color, 0.74),
      stroke: layer.mark.stroke ?? color,
      lineWidth: layer.mark.lineWidth ?? 1.4,
      cornerRadius: layer.mark.cornerRadius ?? 1,
    });
  });
  return nodes;
};

function volumeScope(context: MarkCompileContext): VolumeProfileScope {
  const mode = optionString(context, 'scope') ?? 'fixed';
  if (mode === 'visible') {
    const domain = context.xScale
      .domain()
      .map((value) => numericDataValue(value, context.layer.x.type === 'temporal'))
      .filter((value): value is number => value !== null);
    const extent = numericExtent(domain);
    const start = optionNumber(context, 'visibleStart') ?? extent.minimum;
    const end = optionNumber(context, 'visibleEnd') ?? extent.maximum;
    if (!Number.isFinite(start) || !Number.isFinite(end))
      throw new GraflumeError(
        'INVALID_SPEC',
        'Visible volume profile scope requires a finite active x-domain or visibleStart/visibleEnd.',
      );
    return { mode, time: [start, end] };
  }
  if (mode === 'session') return { mode };
  if (mode === 'periodic') {
    const raw = optionString(context, 'period');
    const timezoneOffsetMinutes = optionNumber(context, 'timezoneOffsetMinutes');
    return {
      mode,
      period: raw === 'week' || raw === 'month' ? raw : 'day',
      ...(timezoneOffsetMinutes === undefined ? {} : { timezoneOffsetMinutes }),
    };
  }
  return { mode: 'fixed' };
}

function volumeRows(context: MarkCompileContext): VolumeProfileRows {
  const mode = optionString(context, 'rowMode') ?? 'count';
  if (mode === 'size') return { mode, size: optionNumber(context, 'rowSize') ?? 1 };
  if (mode === 'tick') {
    return {
      mode,
      tick: optionNumber(context, 'tickSize') ?? 1,
      ticksPerRow: optionNumber(context, 'ticksPerRow') ?? 1,
    };
  }
  return { mode: 'count', count: optionNumber(context, 'bins') ?? 24 };
}

/** Volume-at-price compiler with fixed/visible/session/periodic profiles and POC/VAH/VAL. */
export const compileAdvancedVolumeProfileMark: MarkCompiler = (context) => {
  const advancedOptionNames = [
    'scope',
    'rowMode',
    'rowSize',
    'tickSize',
    'ticksPerRow',
    'allocation',
    'valueArea',
    'placement',
    'visibleStart',
    'visibleEnd',
    'period',
    'timezoneOffsetMinutes',
  ];
  const hasOhlcInput = ['open', 'high', 'low', 'close'].some((name) => {
    const configured = context.layer.mark.fields[name];
    return configured !== undefined ? context.table.has(configured) : context.table.has(name);
  });
  if (
    !hasOhlcInput &&
    !advancedOptionNames.some((name) => Object.hasOwn(context.layer.mark.options, name))
  ) {
    return compileVolumeProfileMark(context);
  }
  const options: VolumeProfileOptions = {
    scope: volumeScope(context),
    rows: volumeRows(context),
    allocation:
      optionString(context, 'allocation') === 'close' ||
      optionString(context, 'allocation') === 'typical'
        ? (optionString(context, 'allocation') as 'close' | 'typical')
        : 'uniform-range',
    valueArea: optionNumber(context, 'valueArea') ?? 0.7,
    placement: optionString(context, 'placement') === 'left' ? 'left' : 'right',
  };
  const profiles = buildVolumeProfiles(financialRows(context), options);
  if (profiles.length === 0) return [];
  const { layer, plot, theme, performance } = context;
  const slotWidth = plot.width / profiles.length;
  const nodes: SceneNode[] = [];
  profiles.forEach((profile, profileIndex) => {
    const sourceStartIndex = profile.sourceIndexes[0];
    const sourceEndIndex = profile.sourceIndexes.at(-1);
    const authoredTimeStart =
      sourceStartIndex === undefined
        ? profile.timeStart
        : (context.table.value(sourceStartIndex, context.layer.x.field) ?? profile.timeStart);
    const authoredTimeEnd =
      sourceEndIndex === undefined
        ? profile.timeEnd
        : (context.table.value(sourceEndIndex, context.layer.x.field) ?? profile.timeEnd);
    let maximum = 1;
    for (const row of profile.rows) maximum = Math.max(maximum, row.volume);
    const priceSpan = Math.max(Number.EPSILON, profile.priceHigh - profile.priceLow);
    const mapY = (value: number) =>
      plot.y + plot.height - ((value - profile.priceLow) / priceSpan) * plot.height;
    profile.rows.forEach((row) => {
      const sourceRowIndex = row.sourceIndexes.at(-1) ?? row.index;
      const source =
        sourceRowIndex >= 0 && sourceRowIndex < context.table.length
          ? context.table.row(sourceRowIndex)
          : {};
      const width = (row.volume / maximum) * slotWidth * 0.88;
      const left = plot.x + profileIndex * slotWidth;
      const x = profile.placement === 'left' ? left : left + slotWidth - width;
      const y0 = mapY(row.priceLow);
      const y1 = mapY(row.priceHigh);
      const fill = row.pointOfControl
        ? (theme.colors.focus ?? context.color)
        : row.inValueArea
          ? colorWithOpacity(context.color, 0.78)
          : colorWithOpacity(context.color, 0.38);
      nodes.push({
        type: 'rect',
        ...nodeBase(`${layer.id}:profile:${profile.id}:${row.index}`, {
          zIndex: layer.zIndex,
          opacity: layer.mark.opacity,
          interactive: performance.enableHitTesting,
          datum: {
            layerId: layer.id,
            rowIndex: sourceRowIndex,
            datum: { ...source, ...row },
            tooltip: {
              profile: profile.id,
              timeStart:
                context.xType === 'temporal'
                  ? temporalTooltipValue(authoredTimeStart)
                  : profile.timeStart,
              timeEnd:
                context.xType === 'temporal'
                  ? temporalTooltipValue(authoredTimeEnd)
                  : profile.timeEnd,
              priceLow: row.priceLow,
              priceHigh: row.priceHigh,
              volume: row.volume,
              proportion: row.proportion,
              pointOfControl: row.pointOfControl,
              inValueArea: row.inValueArea,
              POC: profile.poc,
              VAH: profile.vah,
              VAL: profile.val,
              sourceRows: row.sourceIndexes.join(', '),
            },
          },
        }),
        x,
        y: Math.min(y0, y1) + 0.5,
        width: Math.max(0.5, width),
        height: Math.max(0.5, Math.abs(y0 - y1) - 1),
        fill: layer.mark.fill ?? fill,
        stroke: layer.mark.stroke ?? theme.colors.background,
        lineWidth: layer.mark.lineWidth ?? 0.8,
        cornerRadius: layer.mark.cornerRadius ?? 1,
      });
    });
    for (const [name, value] of [
      ['poc', profile.poc],
      ['vah', profile.vah],
      ['val', profile.val],
    ] as const) {
      nodes.push({
        type: 'line',
        ...nodeBase(`${layer.id}:profile:${profile.id}:${name}`, {
          zIndex: layer.zIndex + 1,
        }),
        x1: plot.x + profileIndex * slotWidth,
        x2: plot.x + (profileIndex + 1) * slotWidth,
        y1: mapY(value),
        y2: mapY(value),
        stroke: name === 'poc' ? theme.colors.focus : theme.colors.mutedText,
        lineWidth: name === 'poc' ? 1.8 : 1,
        dash: name === 'poc' ? [] : [4, 3],
      });
    }
  });
  return nodes;
};
