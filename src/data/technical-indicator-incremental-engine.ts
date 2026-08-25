import type {
  TechnicalIndicatorCalculation,
  TechnicalIndicatorInputSeries,
} from './technical-indicators.js';

type Numeric = number | null;

interface AverageState {
  readonly queue: Numeric[];
  sum: number;
  valid: number;
  readonly seed: number[];
  previous: Numeric;
}

/**
 * JSON/structured-clone-safe execution state for the built-in indicator set.
 * Only rolling windows and cumulative checkpoints live here; historical output
 * and input rows remain in the enclosing bounded incremental snapshot.
 */
export interface TechnicalIndicatorEngineSnapshot {
  readonly version: 1;
  readonly kind: string;
  index: number;
  readonly averages: Record<string, AverageState>;
  readonly queues: Record<string, Numeric[]>;
  readonly numbers: Record<string, number>;
  readonly nullable: Record<string, Numeric>;
  readonly flags: Record<string, boolean>;
  readonly pending: Record<string, Record<string, Numeric>>;
}

export interface TechnicalIndicatorEngineRow {
  readonly value: Numeric;
  readonly open: Numeric;
  readonly high: Numeric;
  readonly low: Numeric;
  readonly close: Numeric;
  readonly volume: Numeric;
}

export interface TechnicalIndicatorEngineStep {
  readonly output: Readonly<Record<string, Numeric>>;
  /** Segment-local output replacements, used by Zigzag's live candidate. */
  readonly patches: readonly {
    readonly index: number;
    readonly role: string;
    readonly value: Numeric;
  }[];
}

function finite(value: Numeric | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function averageState(state: TechnicalIndicatorEngineSnapshot, name: string): AverageState {
  return (state.averages[name] ??= {
    queue: [],
    sum: 0,
    valid: 0,
    seed: [],
    previous: null,
  });
}

function queue(state: TechnicalIndicatorEngineSnapshot, name: string): Numeric[] {
  return (state.queues[name] ??= []);
}

function rollingSum(
  state: TechnicalIndicatorEngineSnapshot,
  name: string,
  value: Numeric,
  period: number,
): Numeric {
  const rolling = averageState(state, name);
  if (finite(value)) {
    rolling.sum += value;
    rolling.valid += 1;
  }
  rolling.queue.push(value);
  if (rolling.queue.length > period) {
    const removed = rolling.queue.shift();
    if (finite(removed)) {
      rolling.sum -= removed;
      rolling.valid -= 1;
    }
  }
  return rolling.queue.length === period && rolling.valid === period ? rolling.sum : null;
}

function simpleAverage(
  state: TechnicalIndicatorEngineSnapshot,
  name: string,
  value: Numeric,
  period: number,
): Numeric {
  const sum = rollingSum(state, name, value, period);
  return finite(sum) ? sum / period : null;
}

function exponentialAverage(
  state: TechnicalIndicatorEngineSnapshot,
  name: string,
  value: Numeric,
  period: number,
): Numeric {
  const average = averageState(state, name);
  if (!finite(value)) {
    average.seed.length = 0;
    average.previous = null;
    return null;
  }
  if (average.previous === null) {
    average.seed.push(value);
    if (average.seed.length < period) return null;
    if (average.seed.length > period) average.seed.shift();
    average.previous = average.seed.reduce((sum, item) => sum + item, 0) / period;
  } else {
    const alpha = 2 / (period + 1);
    average.previous = value * alpha + average.previous * (1 - alpha);
  }
  return average.previous;
}

function wilderAverage(
  state: TechnicalIndicatorEngineSnapshot,
  name: string,
  value: Numeric,
  period: number,
): Numeric {
  const average = averageState(state, name);
  if (!finite(value)) {
    average.seed.length = 0;
    average.previous = null;
    return null;
  }
  if (average.previous === null) {
    average.seed.push(value);
    if (average.seed.length < period) return null;
    if (average.seed.length > period) average.seed.shift();
    average.previous = average.seed.reduce((sum, item) => sum + item, 0) / period;
  } else {
    average.previous = (average.previous * (period - 1) + value) / period;
  }
  return average.previous;
}

function boundedWindow(
  state: TechnicalIndicatorEngineSnapshot,
  name: string,
  value: Numeric,
  period: number,
): readonly Numeric[] {
  const values = queue(state, name);
  values.push(value);
  if (values.length > period) values.shift();
  return values;
}

function weightedAverage(
  state: TechnicalIndicatorEngineSnapshot,
  name: string,
  value: Numeric,
  period: number,
): Numeric {
  const values = boundedWindow(state, name, value, period);
  if (values.length < period || values.some((item) => !finite(item))) return null;
  const denominator = (period * (period + 1)) / 2;
  return values.reduce<number>((sum, item, index) => sum + item! * (index + 1), 0) / denominator;
}

function rollingExtrema(
  state: TechnicalIndicatorEngineSnapshot,
  name: string,
  value: Numeric,
  period: number,
  mode: 'minimum' | 'maximum',
): Numeric {
  const values = boundedWindow(state, name, value, period);
  if (values.length < period || values.some((item) => !finite(item))) return null;
  return mode === 'minimum' ? Math.min(...(values as number[])) : Math.max(...(values as number[]));
}

function rollingDeviation(
  state: TechnicalIndicatorEngineSnapshot,
  name: string,
  value: Numeric,
  average: Numeric,
  period: number,
  squared: boolean,
): Numeric {
  const values = boundedWindow(state, name, value, period);
  if (!finite(average) || values.length < period || values.some((item) => !finite(item))) {
    return null;
  }
  const sum = values.reduce<number>((total, item) => {
    const difference = item! - average;
    return total + (squared ? difference ** 2 : Math.abs(difference));
  }, 0);
  return squared ? Math.sqrt(sum / period) : sum / period;
}

function regression(
  state: TechnicalIndicatorEngineSnapshot,
  value: Numeric,
  period: number,
): {
  readonly value: Numeric;
  readonly slope: Numeric;
  readonly intercept: Numeric;
  readonly angle: Numeric;
} {
  const values = boundedWindow(state, 'regression', value, period);
  if (values.length < period || values.some((item) => !finite(item))) {
    return { value: null, slope: null, intercept: null, angle: null };
  }
  const sumX = (period * (period - 1)) / 2;
  const sumXX = (period * (period - 1) * (2 * period - 1)) / 6;
  const denominator = period * sumXX - sumX * sumX;
  const sumY = values.reduce<number>((sum, item) => sum + item!, 0);
  const sumXY = values.reduce<number>((sum, item, x) => sum + x * item!, 0);
  const slope = denominator === 0 ? 0 : (period * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / period;
  return {
    slope,
    intercept,
    angle: (Math.atan(slope) * 180) / Math.PI,
    value: intercept + slope * (period - 1),
  };
}

function pairDifference(
  left: Numeric | undefined,
  right: Numeric | undefined,
  percent = false,
): Numeric {
  if (!finite(left) || !finite(right) || (percent && right === 0)) return null;
  return percent ? ((left - right) / right) * 100 : left - right;
}

function typical(row: TechnicalIndicatorEngineRow): Numeric {
  return finite(row.high) && finite(row.low) && finite(row.close)
    ? (row.high + row.low + row.close) / 3
    : null;
}

function trueRange(
  state: TechnicalIndicatorEngineSnapshot,
  row: TechnicalIndicatorEngineRow,
): Numeric {
  const previousClose = state.nullable.previousClose;
  state.nullable.previousClose = row.close;
  if (!finite(row.high) || !finite(row.low)) return null;
  return !finite(previousClose)
    ? row.high - row.low
    : Math.max(
        row.high - row.low,
        Math.abs(row.high - previousClose),
        Math.abs(row.low - previousClose),
      );
}

function rollingRangePosition(
  state: TechnicalIndicatorEngineSnapshot,
  prefix: string,
  row: TechnicalIndicatorEngineRow,
  period: number,
): Numeric {
  const high = rollingExtrema(state, `${prefix}:high`, row.high, period, 'maximum');
  const low = rollingExtrema(state, `${prefix}:low`, row.low, period, 'minimum');
  if (!finite(row.close) || !finite(high) || !finite(low)) return null;
  return high === low ? 0 : ((row.close - low) / (high - low)) * 100;
}

function lagDifference(
  state: TechnicalIndicatorEngineSnapshot,
  value: Numeric,
  period: number,
  percent: boolean,
): Numeric {
  const values = queue(state, 'lag');
  const previous = values.length >= period ? values[values.length - period] : undefined;
  values.push(value);
  if (values.length > period) values.shift();
  return pairDifference(value, previous, percent);
}

function relativeStrength(
  state: TechnicalIndicatorEngineSnapshot,
  value: Numeric,
  period: number,
): Numeric {
  const previous = state.nullable.rsiPrevious;
  state.nullable.rsiPrevious = value;
  if (!finite(value) || !finite(previous)) {
    queue(state, 'rsi:gains').length = 0;
    queue(state, 'rsi:losses').length = 0;
    state.nullable.rsiAverageGain = null;
    state.nullable.rsiAverageLoss = null;
    return null;
  }
  const change = value - previous;
  const gain = Math.max(0, change);
  const loss = Math.max(0, -change);
  let averageGain = state.nullable.rsiAverageGain;
  let averageLoss = state.nullable.rsiAverageLoss;
  if (!finite(averageGain) || !finite(averageLoss)) {
    const gains = queue(state, 'rsi:gains');
    const losses = queue(state, 'rsi:losses');
    gains.push(gain);
    losses.push(loss);
    if (gains.length < period) return null;
    averageGain = gains.reduce<number>((sum, item) => sum + item!, 0) / period;
    averageLoss = losses.reduce<number>((sum, item) => sum + item!, 0) / period;
  } else {
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }
  state.nullable.rsiAverageGain = averageGain;
  state.nullable.rsiAverageLoss = averageLoss;
  return averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
}

function numeric(
  parameters: Readonly<Record<string, number>>,
  name: string,
  fallback: number,
): number {
  return parameters[name] ?? fallback;
}

export function createTechnicalIndicatorEngine(
  calculation: Pick<TechnicalIndicatorCalculation, 'capability'>,
): TechnicalIndicatorEngineSnapshot {
  return {
    version: 1,
    kind: calculation.capability.kind,
    index: 0,
    averages: {},
    queues: {},
    numbers: {},
    nullable: {},
    flags: {},
    pending: {},
  };
}

function legacyStep(
  state: TechnicalIndicatorEngineSnapshot,
  row: TechnicalIndicatorEngineRow,
  parameters: Readonly<Record<string, number>>,
): TechnicalIndicatorEngineStep | null {
  const value = row.value;
  const period = numeric(parameters, 'period', 14);
  const fastPeriod = numeric(parameters, 'fastPeriod', 12);
  const slowPeriod = numeric(parameters, 'slowPeriod', 26);
  const signalPeriod = numeric(parameters, 'signalPeriod', 9);
  switch (state.kind) {
    case 'sma':
      return { output: { value: simpleAverage(state, 'sma', value, period) }, patches: [] };
    case 'ema':
      return { output: { value: exponentialAverage(state, 'ema', value, period) }, patches: [] };
    case 'wma':
      return { output: { value: weightedAverage(state, 'wma', value, period) }, patches: [] };
    case 'dema': {
      const first = exponentialAverage(state, 'dema:1', value, period);
      const second = exponentialAverage(state, 'dema:2', first, period);
      return {
        output: { value: finite(first) && finite(second) ? 2 * first - second : null },
        patches: [],
      };
    }
    case 'tema':
    case 'trix': {
      const first = exponentialAverage(state, `${state.kind}:1`, value, period);
      const second = exponentialAverage(state, `${state.kind}:2`, first, period);
      const third = exponentialAverage(state, `${state.kind}:3`, second, period);
      if (state.kind === 'tema') {
        return {
          output: {
            value:
              finite(first) && finite(second) && finite(third)
                ? 3 * first - 3 * second + third
                : null,
          },
          patches: [],
        };
      }
      const previous = state.nullable.trixPrevious;
      state.nullable.trixPrevious = third;
      return { output: { value: pairDifference(third, previous, true) }, patches: [] };
    }
    case 'momentum':
      return { output: { value: lagDifference(state, value, period, false) }, patches: [] };
    case 'roc':
      return { output: { value: lagDifference(state, value, period, true) }, patches: [] };
    case 'rsi':
      return { output: { value: relativeStrength(state, value, period) }, patches: [] };
    case 'apo':
    case 'ppo':
    case 'macd': {
      const fast = exponentialAverage(state, `${state.kind}:fast`, value, fastPeriod);
      const slow = exponentialAverage(state, `${state.kind}:slow`, value, slowPeriod);
      const primary = pairDifference(fast, slow, state.kind === 'ppo');
      if (state.kind !== 'macd') return { output: { value: primary }, patches: [] };
      const signal = exponentialAverage(state, 'macd:signal', primary, signalPeriod);
      return {
        output: { value: primary, signal, histogram: pairDifference(primary, signal) },
        patches: [],
      };
    }
    case 'disparityindex': {
      const average = simpleAverage(state, 'disparity', value, period);
      return {
        output: {
          value:
            finite(value) && finite(average) && average !== 0 ? (value / average - 1) * 100 : null,
        },
        patches: [],
      };
    }
    case 'linearregression':
    case 'linearregressionslope':
    case 'linearregressionintercept':
    case 'linearregressionangle': {
      const result = regression(state, value, period);
      const output =
        state.kind === 'linearregressionslope'
          ? result.slope
          : state.kind === 'linearregressionintercept'
            ? result.intercept
            : state.kind === 'linearregressionangle'
              ? result.angle
              : result.value;
      return { output: { value: output }, patches: [] };
    }
    default:
      return null;
  }
}

function moneyFlowVolume(row: TechnicalIndicatorEngineRow): Numeric {
  if (!finite(row.close) || !finite(row.high) || !finite(row.low) || !finite(row.volume)) {
    return null;
  }
  const multiplier =
    row.high === row.low
      ? 0
      : (row.close - row.low - (row.high - row.close)) / (row.high - row.low);
  return multiplier * row.volume;
}

function ohlcvStep(
  state: TechnicalIndicatorEngineSnapshot,
  row: TechnicalIndicatorEngineRow,
  parameters: Readonly<Record<string, number>>,
): TechnicalIndicatorEngineStep {
  const period = numeric(parameters, 'period', 14);
  switch (state.kind) {
    case 'abands': {
      const multiplier = numeric(parameters, 'multiplier', 4);
      const valid = finite(row.high) && finite(row.low) && row.high + row.low !== 0;
      const rawUpper = valid
        ? row.high! * (1 + (multiplier * (row.high! - row.low!)) / (row.high! + row.low!))
        : null;
      const rawLower = valid
        ? row.low! * (1 - (multiplier * (row.high! - row.low!)) / (row.high! + row.low!))
        : null;
      return {
        output: {
          value: simpleAverage(state, 'abands:middle', row.close, period),
          lower: simpleAverage(state, 'abands:lower', rawLower, period),
          upper: simpleAverage(state, 'abands:upper', rawUpper, period),
        },
        patches: [],
      };
    }
    case 'ao': {
      const median = finite(row.high) && finite(row.low) ? (row.high + row.low) / 2 : null;
      const fast = simpleAverage(state, 'ao:fast', median, parameters.fastPeriod!);
      const slow = simpleAverage(state, 'ao:slow', median, parameters.slowPeriod!);
      return { output: { value: pairDifference(fast, slow) }, patches: [] };
    }
    case 'aroon':
    case 'aroonoscillator': {
      const highs = boundedWindow(state, 'aroon:high', row.high, period + 1);
      const lows = boundedWindow(state, 'aroon:low', row.low, period + 1);
      let up: Numeric = null;
      let down: Numeric = null;
      if (
        highs.length === period + 1 &&
        lows.length === period + 1 &&
        highs.every(finite) &&
        lows.every(finite)
      ) {
        let highIndex = 0;
        let lowIndex = 0;
        highs.forEach((item, index) => {
          if (item! >= highs[highIndex]!) highIndex = index;
        });
        lows.forEach((item, index) => {
          if (item! <= lows[lowIndex]!) lowIndex = index;
        });
        up = (highIndex / period) * 100;
        down = (lowIndex / period) * 100;
      }
      return {
        output:
          state.kind === 'aroon' ? { value: up, up, down } : { value: pairDifference(up, down) },
        patches: [],
      };
    }
    case 'atr':
    case 'natr': {
      const range = trueRange(state, row);
      const average = wilderAverage(state, 'atr', range, period);
      return {
        output: {
          value:
            state.kind === 'natr'
              ? finite(average) && finite(row.close) && row.close !== 0
                ? (average / row.close) * 100
                : null
              : average,
        },
        patches: [],
      };
    }
    case 'bb': {
      const middle = simpleAverage(state, 'bb:average', row.value, period);
      const deviation = rollingDeviation(state, 'bb:deviation', row.value, middle, period, true);
      const multiplier = parameters.standardDeviations!;
      return {
        output: {
          value: middle,
          lower: finite(middle) && finite(deviation) ? middle - multiplier * deviation : null,
          upper: finite(middle) && finite(deviation) ? middle + multiplier * deviation : null,
        },
        patches: [],
      };
    }
    case 'cci': {
      const price = typical(row);
      const average = simpleAverage(state, 'cci:average', price, period);
      const deviation = rollingDeviation(state, 'cci:deviation', price, average, period, false);
      return {
        output: {
          value:
            finite(price) && finite(average) && finite(deviation)
              ? deviation === 0
                ? 0
                : (price - average) / (0.015 * deviation)
              : null,
        },
        patches: [],
      };
    }
    case 'chaikin': {
      const flow = moneyFlowVolume(row);
      let line: Numeric = null;
      if (finite(flow)) {
        const cumulative = (state.numbers.chaikinCumulative ?? 0) + flow;
        state.numbers.chaikinCumulative = cumulative;
        line = cumulative;
      }
      const fast = exponentialAverage(state, 'chaikin:fast', line, parameters.fastPeriod!);
      const slow = exponentialAverage(state, 'chaikin:slow', line, parameters.slowPeriod!);
      return { output: { value: pairDifference(fast, slow) }, patches: [] };
    }
    case 'cmf': {
      const flow = moneyFlowVolume(row);
      const flowSum = rollingSum(state, 'cmf:flow', flow, period);
      const volumeSum = rollingSum(state, 'cmf:volume', row.volume, period);
      return {
        output: {
          value:
            finite(flowSum) && finite(volumeSum) && volumeSum !== 0 ? flowSum / volumeSum : null,
        },
        patches: [],
      };
    }
    case 'cmo': {
      const previous = state.nullable.cmoPrevious;
      state.nullable.cmoPrevious = row.value;
      const valid = finite(row.value) && finite(previous);
      const gain = valid ? Math.max(0, row.value! - previous!) : null;
      const loss = valid ? Math.max(0, previous! - row.value!) : null;
      const gains = rollingSum(state, 'cmo:gains', gain, period);
      const losses = rollingSum(state, 'cmo:losses', loss, period);
      return {
        output: {
          value:
            finite(gains) && finite(losses)
              ? gains + losses === 0
                ? 0
                : ((gains - losses) / (gains + losses)) * 100
              : null,
        },
        patches: [],
      };
    }
    case 'dmi': {
      const previousHigh = state.nullable.dmiPreviousHigh;
      const previousLow = state.nullable.dmiPreviousLow;
      const range = trueRange(state, row);
      let positiveMovement: Numeric = null;
      let negativeMovement: Numeric = null;
      if (state.index > 0 && [row.high, row.low, previousHigh, previousLow].every(finite)) {
        const up = row.high! - previousHigh!;
        const down = previousLow! - row.low!;
        positiveMovement = up > down && up > 0 ? up : 0;
        negativeMovement = down > up && down > 0 ? down : 0;
      }
      state.nullable.dmiPreviousHigh = row.high;
      state.nullable.dmiPreviousLow = row.low;
      // The one-shot implementation applies Wilder smoothing to slice(1).
      const averageRange =
        state.index === 0 ? null : wilderAverage(state, 'dmi:range', range, period);
      const averagePlus =
        state.index === 0 ? null : wilderAverage(state, 'dmi:plus', positiveMovement, period);
      const averageMinus =
        state.index === 0 ? null : wilderAverage(state, 'dmi:minus', negativeMovement, period);
      let plus: Numeric = null;
      let minus: Numeric = null;
      let dx: Numeric = null;
      if (
        finite(averageRange) &&
        finite(averagePlus) &&
        finite(averageMinus) &&
        averageRange !== 0
      ) {
        plus = (averagePlus / averageRange) * 100;
        minus = (averageMinus / averageRange) * 100;
        const sum = plus + minus;
        dx = sum === 0 ? 0 : (Math.abs(plus - minus) / sum) * 100;
      }
      const value = wilderAverage(state, 'dmi:adx', dx, period);
      return { output: { value, plus, minus }, patches: [] };
    }
    case 'dpo': {
      const average = simpleAverage(state, 'dpo:average', row.value, period);
      const shift = Math.floor(period / 2) + 1;
      const values = queue(state, 'dpo:source');
      const source = values.length >= shift ? values[values.length - shift] : undefined;
      values.push(row.value);
      if (values.length > shift) values.shift();
      return {
        output: { value: finite(average) && finite(source) ? source - average : null },
        patches: [],
      };
    }
    case 'ikh': {
      const conversionHigh = rollingExtrema(
        state,
        'ikh:conversion:high',
        row.high,
        parameters.conversionPeriod!,
        'maximum',
      );
      const conversionLow = rollingExtrema(
        state,
        'ikh:conversion:low',
        row.low,
        parameters.conversionPeriod!,
        'minimum',
      );
      const baseHigh = rollingExtrema(
        state,
        'ikh:base:high',
        row.high,
        parameters.basePeriod!,
        'maximum',
      );
      const baseLow = rollingExtrema(
        state,
        'ikh:base:low',
        row.low,
        parameters.basePeriod!,
        'minimum',
      );
      const spanHigh = rollingExtrema(
        state,
        'ikh:span:high',
        row.high,
        parameters.spanPeriod!,
        'maximum',
      );
      const spanLow = rollingExtrema(
        state,
        'ikh:span:low',
        row.low,
        parameters.spanPeriod!,
        'minimum',
      );
      const conversion =
        finite(conversionHigh) && finite(conversionLow)
          ? (conversionHigh + conversionLow) / 2
          : null;
      const base = finite(baseHigh) && finite(baseLow) ? (baseHigh + baseLow) / 2 : null;
      const spanA = finite(conversion) && finite(base) ? (conversion + base) / 2 : null;
      const spanB = finite(spanHigh) && finite(spanLow) ? (spanHigh + spanLow) / 2 : null;
      const pending = state.pending[String(state.index)] ?? {};
      delete state.pending[String(state.index)];
      const displacement = parameters.displacement!;
      if (finite(spanA) && finite(spanB)) {
        const target = String(state.index + displacement);
        state.pending[target] = {
          value: spanA,
          lower: Math.min(spanA, spanB),
          upper: Math.max(spanA, spanB),
        };
      }
      if (displacement === 0 && finite(spanA) && finite(spanB)) {
        return {
          output: {
            value: spanA,
            lower: Math.min(spanA, spanB),
            upper: Math.max(spanA, spanB),
            conversion,
            base,
          },
          patches: [],
        };
      }
      return {
        output: {
          value: pending.value ?? null,
          lower: pending.lower ?? null,
          upper: pending.upper ?? null,
          conversion,
          base,
        },
        patches: [],
      };
    }
    case 'keltnerchannels': {
      const middle = exponentialAverage(state, 'keltner:middle', row.close, parameters.period!);
      const range = wilderAverage(
        state,
        'keltner:range',
        trueRange(state, row),
        parameters.atrPeriod!,
      );
      const multiplier = parameters.multiplier!;
      return {
        output: {
          value: middle,
          lower: finite(middle) && finite(range) ? middle - multiplier * range : null,
          upper: finite(middle) && finite(range) ? middle + multiplier * range : null,
        },
        patches: [],
      };
    }
    case 'klinger': {
      const previousHigh = state.nullable.klingerPreviousHigh;
      const previousLow = state.nullable.klingerPreviousLow;
      const previousClose = state.nullable.klingerPreviousClose;
      let force: Numeric = null;
      if (
        state.index > 0 &&
        [row.high, row.low, row.close, row.volume, previousHigh, previousLow, previousClose].every(
          finite,
        )
      ) {
        const previousTrend = state.numbers.klingerTrend ?? 0;
        const currentSum = row.high! + row.low! + row.close!;
        const previousSum = previousHigh! + previousLow! + previousClose!;
        const trend =
          currentSum > previousSum ? 1 : currentSum < previousSum ? -1 : previousTrend || 1;
        const movement = row.high! - row.low!;
        const previousMovement = state.numbers.klingerMovement ?? 0;
        const cumulativeMovement =
          trend === previousTrend
            ? (state.numbers.klingerCumulative ?? 0) + movement
            : previousMovement + movement;
        force =
          cumulativeMovement === 0
            ? 0
            : row.volume! * Math.abs(2 * (movement / cumulativeMovement - 1)) * trend * 100;
        state.numbers.klingerTrend = trend;
        state.numbers.klingerMovement = movement;
        state.numbers.klingerCumulative = cumulativeMovement;
      } else if (state.index > 0) {
        state.numbers.klingerTrend = 0;
        state.numbers.klingerMovement = 0;
        state.numbers.klingerCumulative = 0;
      }
      state.nullable.klingerPreviousHigh = row.high;
      state.nullable.klingerPreviousLow = row.low;
      state.nullable.klingerPreviousClose = row.close;
      const fast = exponentialAverage(state, 'klinger:fast', force, parameters.fastPeriod!);
      const slow = exponentialAverage(state, 'klinger:slow', force, parameters.slowPeriod!);
      const value = pairDifference(fast, slow);
      const signal = exponentialAverage(state, 'klinger:signal', value, parameters.signalPeriod!);
      return { output: { value, signal }, patches: [] };
    }
    case 'mfi': {
      const price = typical(row);
      const previous = state.nullable.mfiPrevious;
      state.nullable.mfiPrevious = price;
      const valid = finite(price) && finite(previous) && finite(row.volume);
      const flow = valid ? price! * row.volume! : null;
      const positive = valid ? (price! > previous! ? flow : 0) : null;
      const negative = valid ? (price! < previous! ? flow : 0) : null;
      const positiveSum = rollingSum(state, 'mfi:positive', positive, period);
      const negativeSum = rollingSum(state, 'mfi:negative', negative, period);
      let value: Numeric = null;
      if (finite(positiveSum) && finite(negativeSum)) {
        value =
          negativeSum === 0
            ? positiveSum === 0
              ? 50
              : 100
            : 100 - 100 / (1 + positiveSum / negativeSum);
      }
      return { output: { value }, patches: [] };
    }
    case 'obv': {
      const previous = state.nullable.obvPrevious;
      let value: Numeric = null;
      if (finite(row.close) && finite(row.volume)) {
        let balance = state.numbers.obvBalance ?? 0;
        if (state.index > 0 && finite(previous)) {
          if (row.close > previous) balance += row.volume;
          else if (row.close < previous) balance -= row.volume;
        }
        state.numbers.obvBalance = balance;
        value = balance;
      }
      state.nullable.obvPrevious = row.close;
      return { output: { value }, patches: [] };
    }
    case 'pc': {
      const upper = rollingExtrema(state, 'pc:upper', row.high, period, 'maximum');
      const lower = rollingExtrema(state, 'pc:lower', row.low, period, 'minimum');
      return {
        output: {
          value: finite(upper) && finite(lower) ? (upper + lower) / 2 : null,
          lower,
          upper,
        },
        patches: [],
      };
    }
    case 'pivotpoints': {
      const previousHigh = state.nullable.pivotPreviousHigh;
      const previousLow = state.nullable.pivotPreviousLow;
      const previousClose = state.nullable.pivotPreviousClose;
      state.nullable.pivotPreviousHigh = row.high;
      state.nullable.pivotPreviousLow = row.low;
      state.nullable.pivotPreviousClose = row.close;
      if (!finite(previousHigh) || !finite(previousLow) || !finite(previousClose)) {
        return { output: { value: null, support: null, resistance: null }, patches: [] };
      }
      const value = (previousHigh + previousLow + previousClose) / 3;
      return {
        output: {
          value,
          support: 2 * value - previousHigh,
          resistance: 2 * value - previousLow,
        },
        patches: [],
      };
    }
    case 'priceenvelopes': {
      const value = simpleAverage(state, 'envelope', row.value, period);
      const factor = parameters.envelopePercent! / 100;
      return {
        output: {
          value,
          lower: finite(value) ? value * (1 - factor) : null,
          upper: finite(value) ? value * (1 + factor) : null,
        },
        patches: [],
      };
    }
    case 'psar': {
      if (state.index === 0) {
        state.nullable.psarFirstHigh = row.high;
        state.nullable.psarFirstLow = row.low;
        return { output: { value: null }, patches: [] };
      }
      if (state.index === 1) {
        const firstHigh = state.nullable.psarFirstHigh;
        const firstLow = state.nullable.psarFirstLow;
        if (![firstHigh, firstLow, row.high, row.low].every(finite)) {
          state.flags.psarDisabled = true;
          return { output: { value: null }, patches: [] };
        }
        const rising = (row.high! + row.low!) / 2 >= (firstHigh! + firstLow!) / 2;
        state.flags.psarRising = rising;
        state.numbers.psarExtreme = rising
          ? Math.max(firstHigh!, row.high!)
          : Math.min(firstLow!, row.low!);
        state.numbers.psarValue = rising
          ? Math.min(firstLow!, row.low!)
          : Math.max(firstHigh!, row.high!);
        state.numbers.psarFactor = parameters.acceleration!;
        boundedWindow(state, 'psar:high', firstHigh!, 2);
        boundedWindow(state, 'psar:low', firstLow!, 2);
        boundedWindow(state, 'psar:high', row.high, 2);
        boundedWindow(state, 'psar:low', row.low, 2);
        return { output: { value: state.numbers.psarValue }, patches: [] };
      }
      const previousHighs = queue(state, 'psar:high');
      const previousLows = queue(state, 'psar:low');
      if (state.flags.psarDisabled || !finite(row.high) || !finite(row.low)) {
        boundedWindow(state, 'psar:high', row.high, 2);
        boundedWindow(state, 'psar:low', row.low, 2);
        return { output: { value: null }, patches: [] };
      }
      let rising = state.flags.psarRising ?? false;
      let extreme = state.numbers.psarExtreme!;
      let sar = state.numbers.psarValue!;
      let factor = state.numbers.psarFactor!;
      sar += factor * (extreme - sar);
      if (rising) {
        sar = Math.min(
          sar,
          previousLows[previousLows.length - 1] ?? sar,
          previousLows[previousLows.length - 2] ?? sar,
        );
        if (row.low < sar) {
          rising = false;
          sar = extreme;
          extreme = row.low;
          factor = parameters.acceleration!;
        } else if (row.high > extreme) {
          extreme = row.high;
          factor = Math.min(parameters.maximumAcceleration!, factor + parameters.acceleration!);
        }
      } else {
        sar = Math.max(
          sar,
          previousHighs[previousHighs.length - 1] ?? sar,
          previousHighs[previousHighs.length - 2] ?? sar,
        );
        if (row.high > sar) {
          rising = true;
          sar = extreme;
          extreme = row.high;
          factor = parameters.acceleration!;
        } else if (row.low < extreme) {
          extreme = row.low;
          factor = Math.min(parameters.maximumAcceleration!, factor + parameters.acceleration!);
        }
      }
      state.flags.psarRising = rising;
      state.numbers.psarExtreme = extreme;
      state.numbers.psarValue = sar;
      state.numbers.psarFactor = factor;
      boundedWindow(state, 'psar:high', row.high, 2);
      boundedWindow(state, 'psar:low', row.low, 2);
      return { output: { value: sar }, patches: [] };
    }
    case 'slowstochastic':
    case 'stochastic': {
      const fast = rollingRangePosition(state, 'stochastic', row, period);
      const smoothK = state.kind === 'slowstochastic' ? parameters.smoothK! : 1;
      const smoothD =
        state.kind === 'slowstochastic' ? parameters.smoothD! : parameters.signalPeriod!;
      const value = smoothK === 1 ? fast : simpleAverage(state, 'stochastic:k', fast, smoothK);
      const signal = smoothD === 1 ? value : simpleAverage(state, 'stochastic:d', value, smoothD);
      return { output: { value, signal }, patches: [] };
    }
    case 'supertrend': {
      const previousClose = state.nullable.supertrendPreviousClose;
      state.nullable.supertrendPreviousClose = row.close;
      const range = wilderAverage(
        state,
        'supertrend:atr',
        trueRange(state, row),
        parameters.atrPeriod!,
      );
      if (!finite(row.high) || !finite(row.low) || !finite(row.close) || !finite(range)) {
        return { output: { value: null, direction: null }, patches: [] };
      }
      const middle = (row.high + row.low) / 2;
      const basicUpper = middle + parameters.multiplier! * range;
      const basicLower = middle - parameters.multiplier! * range;
      let upper = state.nullable.supertrendUpper;
      let lower = state.nullable.supertrendLower;
      upper =
        !finite(upper) || !finite(previousClose) || basicUpper < upper || previousClose > upper
          ? basicUpper
          : upper;
      lower =
        !finite(lower) || !finite(previousClose) || basicLower > lower || previousClose < lower
          ? basicLower
          : lower;
      let direction = state.nullable.supertrendDirection;
      if (!finite(direction)) direction = row.close <= upper ? -1 : 1;
      else if (direction < 0 && row.close > upper) direction = 1;
      else if (direction > 0 && row.close < lower) direction = -1;
      state.nullable.supertrendUpper = upper;
      state.nullable.supertrendLower = lower;
      state.nullable.supertrendDirection = direction;
      return { output: { value: direction > 0 ? lower : upper, direction }, patches: [] };
    }
    case 'vwap': {
      const price = typical(row);
      let value: Numeric = null;
      if (finite(price) && finite(row.volume)) {
        const weighted = (state.numbers.vwapWeighted ?? 0) + price * row.volume;
        const volume = (state.numbers.vwapVolume ?? 0) + row.volume;
        state.numbers.vwapWeighted = weighted;
        state.numbers.vwapVolume = volume;
        value = volume === 0 ? null : weighted / volume;
      }
      return { output: { value }, patches: [] };
    }
    case 'williamsr': {
      const position = rollingRangePosition(state, 'williams', row, period);
      return { output: { value: finite(position) ? position - 100 : null }, patches: [] };
    }
    case 'zigzag': {
      const output: Record<string, Numeric> = { value: null };
      const patches: Array<{ index: number; role: string; value: Numeric }> = [];
      if (!finite(row.value)) return { output, patches };
      if (!state.flags.zigzagStarted) {
        state.flags.zigzagStarted = true;
        state.numbers.zigzagCandidate = row.value;
        state.numbers.zigzagCandidateIndex = state.index;
        state.numbers.zigzagDirection = 0;
        output.value = row.value;
        return { output, patches };
      }
      let candidate = state.numbers.zigzagCandidate!;
      let candidateIndex = state.numbers.zigzagCandidateIndex!;
      let direction = state.numbers.zigzagDirection!;
      const threshold = parameters.deviation! / 100;
      if (direction >= 0) {
        if (row.value >= candidate) {
          patches.push({ index: candidateIndex, role: 'value', value: null });
          candidate = row.value;
          candidateIndex = state.index;
          output.value = candidate;
        } else if (candidate !== 0 && (candidate - row.value) / Math.abs(candidate) >= threshold) {
          direction = -1;
          candidate = row.value;
          candidateIndex = state.index;
          output.value = candidate;
        }
      } else if (direction <= 0) {
        if (row.value <= candidate) {
          patches.push({ index: candidateIndex, role: 'value', value: null });
          candidate = row.value;
          candidateIndex = state.index;
          output.value = candidate;
        } else if (candidate !== 0 && (row.value - candidate) / Math.abs(candidate) >= threshold) {
          direction = 1;
          candidate = row.value;
          candidateIndex = state.index;
          output.value = candidate;
        }
      }
      state.numbers.zigzagCandidate = candidate;
      state.numbers.zigzagCandidateIndex = candidateIndex;
      state.numbers.zigzagDirection = direction;
      return { output, patches };
    }
    default:
      throw new Error(`Unsupported incremental technical indicator: ${state.kind}`);
  }
}

export function stepTechnicalIndicatorEngine(
  state: TechnicalIndicatorEngineSnapshot,
  row: TechnicalIndicatorEngineRow,
  parameters: Readonly<Record<string, number>>,
): TechnicalIndicatorEngineStep {
  const step = legacyStep(state, row, parameters) ?? ohlcvStep(state, row, parameters);
  state.index += 1;
  return step;
}

/** Incremental equivalent of the previous-completed-session pivot path. */
export function stepTechnicalIndicatorSessionPivot(
  state: TechnicalIndicatorEngineSnapshot,
  row: TechnicalIndicatorEngineRow,
  boundary: boolean,
): TechnicalIndicatorEngineStep {
  if (boundary && state.index > 0) {
    const previousHigh = state.nullable.sessionPivotHigh;
    const previousLow = state.nullable.sessionPivotLow;
    const previousClose = state.nullable.sessionPivotClose;
    if (finite(previousHigh) && finite(previousLow) && finite(previousClose)) {
      const pivot = (previousHigh + previousLow + previousClose) / 3;
      state.nullable.sessionPivotValue = pivot;
      state.nullable.sessionPivotSupport = 2 * pivot - previousHigh;
      state.nullable.sessionPivotResistance = 2 * pivot - previousLow;
    } else {
      state.nullable.sessionPivotValue = null;
      state.nullable.sessionPivotSupport = null;
      state.nullable.sessionPivotResistance = null;
    }
    state.nullable.sessionPivotHigh = null;
    state.nullable.sessionPivotLow = null;
    state.nullable.sessionPivotClose = null;
  }
  if (finite(row.high)) {
    state.nullable.sessionPivotHigh = finite(state.nullable.sessionPivotHigh)
      ? Math.max(state.nullable.sessionPivotHigh, row.high)
      : row.high;
  }
  if (finite(row.low)) {
    state.nullable.sessionPivotLow = finite(state.nullable.sessionPivotLow)
      ? Math.min(state.nullable.sessionPivotLow, row.low)
      : row.low;
  }
  state.nullable.sessionPivotClose = row.close;
  state.index += 1;
  return {
    output: {
      value: state.nullable.sessionPivotValue ?? null,
      support: state.nullable.sessionPivotSupport ?? null,
      resistance: state.nullable.sessionPivotResistance ?? null,
    },
    patches: [],
  };
}

export function technicalIndicatorInputRow(
  input: TechnicalIndicatorInputSeries,
  index: number,
): TechnicalIndicatorEngineRow {
  const clean = (value: number | null | undefined): Numeric =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  const value = clean(input.value?.[index] ?? input.close?.[index]);
  return {
    value,
    open: clean(input.open?.[index]),
    high: clean(input.high?.[index]),
    low: clean(input.low?.[index]),
    close: clean(input.close?.[index] ?? value),
    volume: clean(input.volume?.[index]),
  };
}
