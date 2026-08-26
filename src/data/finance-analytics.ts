import { GraflumeError } from '../core/errors.js';

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite number.`, { path });
  }
  return value;
}

function positive(value: unknown, path: string): number {
  const result = finite(value, path);
  if (result <= 0)
    throw new GraflumeError('INVALID_DATA', `${path} must be greater than zero.`, { path });
  return result;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

interface PriceExtentInput {
  readonly low: number;
  readonly high: number;
}

function priceExtent(values: readonly PriceExtentInput[]): {
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

export interface FinancialBarInput {
  readonly id?: string;
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume?: number;
  readonly session?: string;
}

export interface FinancialBar {
  readonly id: string;
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly session: string;
  readonly sourceIndex: number;
}

export interface FinancialProvenance {
  readonly sourceIndexes: readonly number[];
  readonly sourceIds: readonly string[];
  readonly timeStart: number;
  readonly timeEnd: number;
  readonly sourceOpen: number;
  readonly sourceHigh: number;
  readonly sourceLow: number;
  readonly sourceClose: number;
  readonly sourceVolume: number;
}

export type PriceBlockSizing =
  | { readonly mode: 'fixed'; readonly value: number }
  | { readonly mode: 'percent'; readonly value: number }
  | { readonly mode: 'atr'; readonly period?: number; readonly multiplier?: number }
  | { readonly mode: 'log'; readonly value: number };

export type PriceBlockMode = 'renko' | 'kagi' | 'three-line-break' | 'range-bars';

export interface PriceBlockOptions {
  readonly mode?: PriceBlockMode;
  readonly sizing?: PriceBlockSizing;
  readonly reversal?: number;
  readonly lineBreaks?: number;
  readonly intrabarPath?: 'auto' | 'high-low' | 'low-high' | 'close-only';
  readonly resetBySession?: boolean;
}

export interface PriceBlock {
  readonly id: string;
  readonly mode: PriceBlockMode;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly direction: 'up' | 'down';
  readonly size: number;
  readonly session: string;
  readonly thick?: boolean;
  readonly reversal?: boolean;
  readonly provenance: FinancialProvenance;
}

function normalizeBars(input: readonly FinancialBarInput[]): FinancialBar[] {
  return input
    .map((bar, sourceIndex): FinancialBar => {
      const open = finite(bar.open, `$.data[${sourceIndex}].open`);
      const high = finite(bar.high, `$.data[${sourceIndex}].high`);
      const low = finite(bar.low, `$.data[${sourceIndex}].low`);
      const close = finite(bar.close, `$.data[${sourceIndex}].close`);
      if (low > Math.min(open, close) || high < Math.max(open, close) || high < low) {
        throw new GraflumeError(
          'INVALID_DATA',
          `$.data[${sourceIndex}] has inconsistent OHLC bounds.`,
        );
      }
      return {
        id: bar.id?.trim() || `bar-${sourceIndex}`,
        time: finite(bar.time, `$.data[${sourceIndex}].time`),
        open,
        high,
        low,
        close,
        volume: Math.max(0, finite(bar.volume ?? 0, `$.data[${sourceIndex}].volume`)),
        session: bar.session?.trim() || 'default',
        sourceIndex,
      };
    })
    .sort((left, right) => left.time - right.time || left.sourceIndex - right.sourceIndex);
}

function provenance(bars: readonly FinancialBar[]): FinancialProvenance {
  const first = bars[0]!;
  const last = bars.at(-1)!;
  const { minimum: sourceLow, maximum: sourceHigh } = priceExtent(bars);
  return {
    sourceIndexes: bars.map(({ sourceIndex }) => sourceIndex),
    sourceIds: bars.map(({ id }) => id),
    timeStart: first.time,
    timeEnd: last.time,
    sourceOpen: first.open,
    sourceHigh,
    sourceLow,
    sourceClose: last.close,
    sourceVolume: bars.reduce((sum, { volume }) => sum + volume, 0),
  };
}

function trueRanges(bars: readonly FinancialBar[]): number[] {
  return bars.map((bar, index) => {
    const previous = bars[index - 1]?.close ?? bar.open;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - previous),
      Math.abs(bar.low - previous),
    );
  });
}

function atrSeries(bars: readonly FinancialBar[], period: number): number[] {
  const ranges = trueRanges(bars);
  let average =
    ranges.slice(0, period).reduce((sum, value) => sum + value, 0) /
    Math.min(period, ranges.length);
  return ranges.map((range, index) => {
    if (index === 0) average = range;
    else if (index < period) average = (average * index + range) / (index + 1);
    else average = (average * (period - 1) + range) / period;
    return average;
  });
}

function sizingResolver(
  bars: readonly FinancialBar[],
  sizing: PriceBlockSizing,
): (index: number, anchor: number, direction?: 1 | -1) => number {
  if (sizing.mode === 'fixed') {
    const size = positive(sizing.value, '$.sizing.value');
    return () => size;
  }
  if (sizing.mode === 'percent') {
    const ratio = positive(sizing.value, '$.sizing.value') / 100;
    return (_index, anchor) => Math.max(Number.EPSILON, Math.abs(anchor) * ratio);
  }
  if (sizing.mode === 'log') {
    const logStep = Math.log1p(positive(sizing.value, '$.sizing.value') / 100);
    return (_index, anchor, direction = 1) =>
      Math.max(
        Number.EPSILON,
        anchor * (direction > 0 ? Math.expm1(logStep) : 1 - Math.exp(-logStep)),
      );
  }
  const period = clamp(Math.floor(sizing.period ?? 14), 1, 10_000);
  const multiplier = positive(sizing.multiplier ?? 1, '$.sizing.multiplier');
  const atr = atrSeries(bars, period);
  return (index) => Math.max(Number.EPSILON, atr[index]! * multiplier);
}

function defaultSizing(bars: readonly FinancialBar[]): PriceBlockSizing {
  const { minimum, maximum } = priceExtent(bars);
  return { mode: 'fixed', value: Math.max(Number.EPSILON, (maximum - minimum) / 12 || 1) };
}

function sourceSlice(
  bars: readonly FinancialBar[],
  start: number,
  end: number,
): readonly FinancialBar[] {
  return bars.slice(Math.min(start, end), Math.max(start, end) + 1);
}

function sourcePosition(
  bars: readonly FinancialBar[],
  sourceIndex: number | undefined,
  fallback = 0,
) {
  if (sourceIndex === undefined) return fallback;
  const position = bars.findIndex((bar) => bar.sourceIndex === sourceIndex);
  return position < 0 ? fallback : position;
}

function buildRenko(bars: readonly FinancialBar[], options: PriceBlockOptions): PriceBlock[] {
  const sizeAt = sizingResolver(bars, options.sizing ?? defaultSizing(bars));
  const output: PriceBlock[] = [];
  let anchor = bars[0]!.close;
  let sourceStart = 0;
  for (let index = 1; index < bars.length; index += 1) {
    if (options.resetBySession === true && bars[index]!.session !== bars[index - 1]!.session) {
      anchor = bars[index]!.open;
      sourceStart = index;
    }
    const close = bars[index]!.close;
    for (let guard = 0; guard < 100_000; guard += 1) {
      const direction = close > anchor ? 1 : -1;
      const size = sizeAt(index, anchor, direction);
      if (Math.abs(close - anchor) + Number.EPSILON < size) break;
      const next = anchor + direction * size;
      const sources = sourceSlice(bars, sourceStart, index);
      output.push({
        id: `renko-${output.length}`,
        mode: 'renko',
        open: anchor,
        high: Math.max(anchor, next),
        low: Math.min(anchor, next),
        close: next,
        direction: direction > 0 ? 'up' : 'down',
        size,
        session: bars[index]!.session,
        provenance: provenance(sources),
      });
      anchor = next;
      sourceStart = index;
    }
  }
  return output;
}

function buildKagi(bars: readonly FinancialBar[], options: PriceBlockOptions): PriceBlock[] {
  const sizeAt = sizingResolver(bars, options.sizing ?? defaultSizing(bars));
  const reversal = positive(options.reversal ?? 1, '$.reversal');
  const output: PriceBlock[] = [];
  let pivot = bars[0]!.close;
  let extreme = pivot;
  let direction: 1 | -1 | 0 = 0;
  let thick = false;
  let shoulder = pivot;
  let waist = pivot;
  let sourceStart = 0;
  const append = (index: number, close: number, nextDirection: 1 | -1, reversed: boolean) => {
    if (nextDirection > 0 && close > shoulder) thick = true;
    if (nextDirection < 0 && close < waist) thick = false;
    const sources = sourceSlice(bars, sourceStart, index);
    output.push({
      id: `kagi-${output.length}`,
      mode: 'kagi',
      open: pivot,
      high: Math.max(pivot, close),
      low: Math.min(pivot, close),
      close,
      direction: nextDirection > 0 ? 'up' : 'down',
      size: Math.abs(close - pivot),
      session: bars[index]!.session,
      thick,
      reversal: reversed,
      provenance: provenance(sources),
    });
    pivot = close;
    sourceStart = index;
  };
  for (let index = 1; index < bars.length; index += 1) {
    if (options.resetBySession === true && bars[index]!.session !== bars[index - 1]!.session) {
      pivot = extreme = bars[index]!.open;
      direction = 0;
      sourceStart = index;
    }
    const close = bars[index]!.close;
    const thresholdDirection: 1 | -1 =
      direction === 0 ? (close >= pivot ? 1 : -1) : direction > 0 ? -1 : 1;
    const amount = sizeAt(index, extreme, thresholdDirection) * reversal;
    if (direction === 0) {
      if (Math.abs(close - pivot) < amount) continue;
      direction = close > pivot ? 1 : -1;
      extreme = close;
      append(index, extreme, direction, false);
      continue;
    }
    if ((direction > 0 && close >= extreme) || (direction < 0 && close <= extreme)) {
      extreme = close;
      const previous = output.pop();
      if (previous !== undefined) {
        pivot = previous.open;
        sourceStart = sourcePosition(bars, previous.provenance.sourceIndexes[0]);
      }
      append(index, extreme, direction, false);
      continue;
    }
    if (Math.abs(close - extreme) < amount) continue;
    if (direction > 0) shoulder = extreme;
    else waist = extreme;
    pivot = extreme;
    direction = direction > 0 ? -1 : 1;
    extreme = close;
    append(index, extreme, direction, true);
  }
  return output;
}

function buildLineBreak(bars: readonly FinancialBar[], options: PriceBlockOptions): PriceBlock[] {
  const lineCount = clamp(Math.floor(options.lineBreaks ?? 3), 1, 100);
  const output: PriceBlock[] = [];
  for (let index = 1; index < bars.length; index += 1) {
    const close = bars[index]!.close;
    const recent = output.slice(-lineCount);
    const previousClose = output.at(-1)?.close ?? bars[index - 1]!.close;
    let upper = previousClose;
    let lower = previousClose;
    for (const line of recent) {
      upper = Math.max(upper, line.open, line.close);
      lower = Math.min(lower, line.open, line.close);
    }
    if (close <= upper && close >= lower) continue;
    const direction = close > upper ? 'up' : 'down';
    const open = previousClose;
    output.push({
      id: `three-line-break-${output.length}`,
      mode: 'three-line-break',
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      direction,
      size: Math.abs(close - open),
      session: bars[index]!.session,
      reversal: output.length > 0 && direction !== output.at(-1)!.direction,
      provenance: provenance(
        sourceSlice(
          bars,
          sourcePosition(bars, output.at(-1)?.provenance.sourceIndexes.at(-1)),
          index,
        ),
      ),
    });
  }
  return output;
}

function intrabarPrices(
  bar: FinancialBar,
  path: PriceBlockOptions['intrabarPath'],
): readonly number[] {
  if (path === 'close-only') return [bar.close];
  const resolved = path === 'auto' ? (bar.close >= bar.open ? 'low-high' : 'high-low') : path;
  return resolved === 'high-low'
    ? [bar.open, bar.high, bar.low, bar.close]
    : [bar.open, bar.low, bar.high, bar.close];
}

function buildRangeBars(bars: readonly FinancialBar[], options: PriceBlockOptions): PriceBlock[] {
  const sizeAt = sizingResolver(bars, options.sizing ?? defaultSizing(bars));
  const output: PriceBlock[] = [];
  let open = bars[0]!.open;
  let high = open;
  let low = open;
  let sourceStart = 0;
  for (let index = 0; index < bars.length; index += 1) {
    for (const price of intrabarPrices(bars[index]!, options.intrabarPath)) {
      high = Math.max(high, price);
      low = Math.min(low, price);
      for (let guard = 0; guard < 100_000; guard += 1) {
        const upSize = sizeAt(index, open, 1);
        const downSize = sizeAt(index, open, -1);
        const up = high - open >= upSize;
        const down = open - low >= downSize;
        if (!up && !down) break;
        const direction = up && down ? (price >= open ? 1 : -1) : up ? 1 : -1;
        const size = direction > 0 ? upSize : downSize;
        const close = open + direction * size;
        output.push({
          id: `range-bar-${output.length}`,
          mode: 'range-bars',
          open,
          high: Math.max(open, close),
          low: Math.min(open, close),
          close,
          direction: direction > 0 ? 'up' : 'down',
          size,
          session: bars[index]!.session,
          provenance: provenance(sourceSlice(bars, sourceStart, index)),
        });
        open = close;
        sourceStart = index;
        high = Math.max(open, price);
        low = Math.min(open, price);
      }
    }
  }
  return output;
}

/** Builds path-dependent financial blocks with complete OHLCV source provenance. */
export function buildPriceBlocks(
  input: readonly FinancialBarInput[],
  options: PriceBlockOptions = {},
): readonly PriceBlock[] {
  const bars = normalizeBars(input);
  if (bars.length < 2) return [];
  if (
    options.sizing?.mode === 'log' &&
    bars.some(({ open, high, low, close }) => open <= 0 || high <= 0 || low <= 0 || close <= 0)
  )
    throw new GraflumeError('INVALID_DATA', 'Log price blocks require positive OHLC values.');
  const mode = options.mode ?? 'renko';
  if (mode === 'kagi') return buildKagi(bars, options);
  if (mode === 'three-line-break') return buildLineBreak(bars, options);
  if (mode === 'range-bars') return buildRangeBars(bars, options);
  return buildRenko(bars, options);
}

export type VolumeProfileScope =
  | { readonly mode: 'fixed' }
  | { readonly mode: 'visible'; readonly time: readonly [number, number] }
  | { readonly mode: 'session' }
  | {
      readonly mode: 'periodic';
      readonly period: 'day' | 'week' | 'month';
      readonly timezoneOffsetMinutes?: number;
    };

export type VolumeProfileRows =
  | { readonly mode: 'count'; readonly count: number }
  | { readonly mode: 'size'; readonly size: number }
  | { readonly mode: 'tick'; readonly tick: number; readonly ticksPerRow?: number };

export interface VolumeProfileOptions {
  readonly scope?: VolumeProfileScope;
  readonly rows?: VolumeProfileRows;
  readonly allocation?: 'close' | 'typical' | 'uniform-range';
  readonly valueArea?: number;
  readonly placement?: 'left' | 'right';
}

export interface VolumeProfileRow {
  readonly index: number;
  readonly priceLow: number;
  readonly priceHigh: number;
  readonly volume: number;
  readonly proportion: number;
  readonly sourceIndexes: readonly number[];
  readonly pointOfControl: boolean;
  readonly inValueArea: boolean;
}

export interface VolumeProfile {
  readonly id: string;
  readonly scope: VolumeProfileScope['mode'];
  readonly timeStart: number;
  readonly timeEnd: number;
  readonly priceLow: number;
  readonly priceHigh: number;
  readonly rowSize: number;
  readonly rows: readonly VolumeProfileRow[];
  readonly totalVolume: number;
  readonly poc: number;
  readonly vah: number;
  readonly val: number;
  readonly placement: 'left' | 'right';
  readonly sourceIndexes: readonly number[];
}

function periodKey(time: number, period: 'day' | 'week' | 'month', offsetMinutes: number): string {
  const shifted = new Date(time + offsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  if (period === 'month') return `${year}-${String(month + 1).padStart(2, '0')}`;
  const day = Math.floor(Date.UTC(year, month, shifted.getUTCDate()) / 86_400_000);
  if (period === 'week') return `week-${Math.floor((day + 3) / 7)}`;
  return `day-${day}`;
}

function groupProfileBars(
  bars: readonly FinancialBar[],
  scope: VolumeProfileScope,
): Array<{ id: string; bars: FinancialBar[] }> {
  if (scope.mode === 'fixed') return [{ id: 'fixed', bars: [...bars] }];
  if (scope.mode === 'visible') {
    const [start, end] = scope.time;
    const low = finite(Math.min(start, end), '$.scope.time[0]');
    const high = finite(Math.max(start, end), '$.scope.time[1]');
    return [{ id: 'visible', bars: bars.filter(({ time }) => time >= low && time <= high) }];
  }
  const groups = new Map<string, FinancialBar[]>();
  bars.forEach((bar) => {
    const key =
      scope.mode === 'session'
        ? bar.session
        : periodKey(bar.time, scope.period, scope.timezoneOffsetMinutes ?? 0);
    const group = groups.get(key) ?? [];
    group.push(bar);
    groups.set(key, group);
  });
  return [...groups].map(([id, grouped]) => ({ id, bars: grouped }));
}

function resolveRowSize(
  extent: { readonly minimum: number; readonly maximum: number },
  rows: VolumeProfileRows,
): number {
  if (rows.mode === 'size') return positive(rows.size, '$.rows.size');
  if (rows.mode === 'tick') {
    return (
      positive(rows.tick, '$.rows.tick') * clamp(Math.floor(rows.ticksPerRow ?? 1), 1, 100_000)
    );
  }
  const count = clamp(Math.floor(rows.count), 1, 10_000);
  return Math.max(Number.EPSILON, (extent.maximum - extent.minimum) / count || 1);
}

function valueArea(
  rows: readonly { volume: number }[],
  target: number,
): { low: number; high: number; poc: number } {
  let poc = 0;
  for (let index = 1; index < rows.length; index += 1)
    if (rows[index]!.volume > rows[poc]!.volume) poc = index;
  const total = rows.reduce((sum, row) => sum + row.volume, 0);
  const required = total * clamp(target, 0, 1);
  let cumulative = rows[poc]?.volume ?? 0;
  let low = poc;
  let high = poc;
  while (cumulative < required && (low > 0 || high < rows.length - 1)) {
    const below = low > 0 ? rows[low - 1]!.volume : -1;
    const above = high < rows.length - 1 ? rows[high + 1]!.volume : -1;
    if (above > below) {
      high += 1;
      cumulative += rows[high]!.volume;
    } else {
      low -= 1;
      cumulative += rows[low]!.volume;
    }
  }
  return { low, high, poc };
}

function oneVolumeProfile(
  id: string,
  bars: readonly FinancialBar[],
  options: VolumeProfileOptions,
): VolumeProfile | null {
  if (bars.length === 0) return null;
  const extent = priceExtent(bars);
  const rowSize = resolveRowSize(extent, options.rows ?? { mode: 'count', count: 24 });
  const minimum = Math.floor(extent.minimum / rowSize) * rowSize;
  const maximum = extent.maximum;
  const count = clamp(Math.ceil((maximum - minimum) / rowSize) || 1, 1, 10_000);
  const volumes = Array.from({ length: count }, () => 0);
  const sources = Array.from({ length: count }, () => new Set<number>());
  const allocation = options.allocation ?? 'uniform-range';
  bars.forEach((bar) => {
    const add = (index: number, volume: number) => {
      const bounded = clamp(index, 0, count - 1);
      volumes[bounded] = (volumes[bounded] ?? 0) + volume;
      sources[bounded]!.add(bar.sourceIndex);
    };
    if (allocation !== 'uniform-range') {
      const price = allocation === 'close' ? bar.close : (bar.high + bar.low + bar.close) / 3;
      add(Math.floor((price - minimum) / rowSize), bar.volume);
      return;
    }
    const first = clamp(Math.floor((bar.low - minimum) / rowSize), 0, count - 1);
    const last = clamp(Math.floor((bar.high - minimum) / rowSize), 0, count - 1);
    const touched = last - first + 1;
    for (let index = first; index <= last; index += 1) add(index, bar.volume / touched);
  });
  const totalVolume = volumes.reduce((sum, volume) => sum + volume, 0);
  const area = valueArea(
    volumes.map((volume) => ({ volume })),
    options.valueArea ?? 0.7,
  );
  const rows = volumes.map((volume, index): VolumeProfileRow => ({
    index,
    priceLow: minimum + index * rowSize,
    priceHigh: minimum + (index + 1) * rowSize,
    volume,
    proportion: totalVolume === 0 ? 0 : volume / totalVolume,
    sourceIndexes: [...sources[index]!].sort((left, right) => left - right),
    pointOfControl: index === area.poc,
    inValueArea: index >= area.low && index <= area.high,
  }));
  return {
    id,
    scope: options.scope?.mode ?? 'fixed',
    timeStart: bars[0]!.time,
    timeEnd: bars.at(-1)!.time,
    priceLow: minimum,
    priceHigh: minimum + count * rowSize,
    rowSize,
    rows,
    totalVolume,
    poc: rows[area.poc]!.priceLow + rowSize / 2,
    vah: rows[area.high]!.priceHigh,
    val: rows[area.low]!.priceLow,
    placement: options.placement ?? 'right',
    sourceIndexes: bars.map(({ sourceIndex }) => sourceIndex),
  };
}

/** Aggregates fixed, visible, session, or periodic volume-at-price profiles with POC/VAH/VAL. */
export function buildVolumeProfiles(
  input: readonly FinancialBarInput[],
  options: VolumeProfileOptions = {},
): readonly VolumeProfile[] {
  const bars = normalizeBars(input);
  if (bars.length === 0) return [];
  const scope = options.scope ?? { mode: 'fixed' };
  return groupProfileBars(bars, scope).flatMap(({ id, bars: group }) => {
    const profile = oneVolumeProfile(id, group, { ...options, scope });
    return profile === null ? [] : [profile];
  });
}
