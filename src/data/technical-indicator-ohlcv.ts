export type IndicatorNumericSeries = readonly (number | null)[];

export interface ResolvedTechnicalIndicatorInputs {
  readonly value: IndicatorNumericSeries;
  readonly open: IndicatorNumericSeries;
  readonly high: IndicatorNumericSeries;
  readonly low: IndicatorNumericSeries;
  readonly close: IndicatorNumericSeries;
  readonly volume: IndicatorNumericSeries;
}

export interface OhlcvIndicatorResult {
  readonly outputs: Readonly<Record<string, IndicatorNumericSeries>>;
  readonly warmUpRows: number;
}

type Parameters = Readonly<Record<string, number>>;

function empty(length: number): Array<number | null> {
  return Array.from<number | null>({ length }).fill(null);
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function simpleAverage(values: IndicatorNumericSeries, period: number): Array<number | null> {
  const output = empty(values.length);
  let sum = 0;
  let valid = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (finite(value)) {
      sum += value;
      valid += 1;
    }
    const removed = values[index - period];
    if (finite(removed)) {
      sum -= removed;
      valid -= 1;
    }
    if (index + 1 >= period && valid === period) output[index] = sum / period;
  }
  return output;
}

function exponentialAverage(values: IndicatorNumericSeries, period: number): Array<number | null> {
  const output = empty(values.length);
  const alpha = 2 / (period + 1);
  let seed: number[] = [];
  let previous: number | null = null;
  values.forEach((value, index) => {
    if (!finite(value)) {
      seed = [];
      previous = null;
      return;
    }
    if (previous === null) {
      seed.push(value);
      if (seed.length < period) return;
      if (seed.length > period) seed.shift();
      previous = seed.reduce((sum, item) => sum + item, 0) / period;
    } else {
      previous = value * alpha + previous * (1 - alpha);
    }
    output[index] = previous;
  });
  return output;
}

function rollingSum(values: IndicatorNumericSeries, period: number): Array<number | null> {
  const output = empty(values.length);
  let sum = 0;
  let valid = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (finite(value)) {
      sum += value;
      valid += 1;
    }
    const removed = values[index - period];
    if (finite(removed)) {
      sum -= removed;
      valid -= 1;
    }
    if (index + 1 >= period && valid === period) output[index] = sum;
  }
  return output;
}

function rollingDeviation(
  values: IndicatorNumericSeries,
  averages: IndicatorNumericSeries,
  period: number,
): Array<number | null> {
  return values.map((_, index) => {
    const average = averages[index];
    if (!finite(average) || index + 1 < period) return null;
    let sum = 0;
    for (let offset = index + 1 - period; offset <= index; offset += 1) {
      const value = values[offset];
      if (!finite(value)) return null;
      sum += Math.abs(value - average);
    }
    return sum / period;
  });
}

function rollingStandardDeviation(
  values: IndicatorNumericSeries,
  averages: IndicatorNumericSeries,
  period: number,
): Array<number | null> {
  return values.map((_, index) => {
    const average = averages[index];
    if (!finite(average) || index + 1 < period) return null;
    let sum = 0;
    for (let offset = index + 1 - period; offset <= index; offset += 1) {
      const value = values[offset];
      if (!finite(value)) return null;
      sum += (value - average) ** 2;
    }
    return Math.sqrt(sum / period);
  });
}

function rollingExtrema(
  values: IndicatorNumericSeries,
  period: number,
  mode: 'minimum' | 'maximum',
): Array<number | null> {
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    let result = mode === 'minimum' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    for (let offset = index + 1 - period; offset <= index; offset += 1) {
      const value = values[offset];
      if (!finite(value)) return null;
      result = mode === 'minimum' ? Math.min(result, value) : Math.max(result, value);
    }
    return result;
  });
}

function rollingRangePosition(
  high: IndicatorNumericSeries,
  low: IndicatorNumericSeries,
  close: IndicatorNumericSeries,
  period: number,
): Array<number | null> {
  const highest = rollingExtrema(high, period, 'maximum');
  const lowest = rollingExtrema(low, period, 'minimum');
  return close.map((value, index) => {
    const upper = highest[index];
    const lower = lowest[index];
    if (!finite(value) || !finite(upper) || !finite(lower)) return null;
    return upper === lower ? 0 : ((value - lower) / (upper - lower)) * 100;
  });
}

function wilderAverage(values: IndicatorNumericSeries, period: number): Array<number | null> {
  const output = empty(values.length);
  let seed: number[] = [];
  let previous: number | null = null;
  values.forEach((value, index) => {
    if (!finite(value)) {
      seed = [];
      previous = null;
      return;
    }
    if (previous === null) {
      seed.push(value);
      if (seed.length < period) return;
      if (seed.length > period) seed.shift();
      previous = seed.reduce((sum, item) => sum + item, 0) / period;
    } else {
      previous = (previous * (period - 1) + value) / period;
    }
    output[index] = previous;
  });
  return output;
}

function trueRange(
  high: IndicatorNumericSeries,
  low: IndicatorNumericSeries,
  close: IndicatorNumericSeries,
): Array<number | null> {
  return high.map((highValue, index) => {
    const lowValue = low[index];
    if (!finite(highValue) || !finite(lowValue)) return null;
    const previousClose = close[index - 1];
    return !finite(previousClose)
      ? highValue - lowValue
      : Math.max(
          highValue - lowValue,
          Math.abs(highValue - previousClose),
          Math.abs(lowValue - previousClose),
        );
  });
}

function typicalPrice(
  high: IndicatorNumericSeries,
  low: IndicatorNumericSeries,
  close: IndicatorNumericSeries,
): Array<number | null> {
  return high.map((highValue, index) => {
    const lowValue = low[index];
    const closeValue = close[index];
    return finite(highValue) && finite(lowValue) && finite(closeValue)
      ? (highValue + lowValue + closeValue) / 3
      : null;
  });
}

function medianPrice(
  high: IndicatorNumericSeries,
  low: IndicatorNumericSeries,
): Array<number | null> {
  return high.map((highValue, index) => {
    const lowValue = low[index];
    return finite(highValue) && finite(lowValue) ? (highValue + lowValue) / 2 : null;
  });
}

function pairDifference(
  left: IndicatorNumericSeries,
  right: IndicatorNumericSeries,
): Array<number | null> {
  return left.map((value, index) => {
    const baseline = right[index];
    return finite(value) && finite(baseline) ? value - baseline : null;
  });
}

function accelerationBands(
  inputs: ResolvedTechnicalIndicatorInputs,
  period: number,
  multiplier: number,
): OhlcvIndicatorResult {
  const rawUpper = inputs.high.map((high, index) => {
    const low = inputs.low[index];
    if (!finite(high) || !finite(low) || high + low === 0) return null;
    return high * (1 + (multiplier * (high - low)) / (high + low));
  });
  const rawLower = inputs.low.map((low, index) => {
    const high = inputs.high[index];
    if (!finite(high) || !finite(low) || high + low === 0) return null;
    return low * (1 - (multiplier * (high - low)) / (high + low));
  });
  return {
    outputs: {
      value: simpleAverage(inputs.close, period),
      lower: simpleAverage(rawLower, period),
      upper: simpleAverage(rawUpper, period),
    },
    warmUpRows: period - 1,
  };
}

function aroon(
  inputs: ResolvedTechnicalIndicatorInputs,
  period: number,
): { readonly up: Array<number | null>; readonly down: Array<number | null> } {
  const up = empty(inputs.high.length);
  const down = empty(inputs.high.length);
  for (let index = period; index < inputs.high.length; index += 1) {
    let highIndex = -1;
    let lowIndex = -1;
    let highest = Number.NEGATIVE_INFINITY;
    let lowest = Number.POSITIVE_INFINITY;
    for (let cursor = index - period; cursor <= index; cursor += 1) {
      const high = inputs.high[cursor];
      const low = inputs.low[cursor];
      if (!finite(high) || !finite(low)) {
        highIndex = -1;
        break;
      }
      if (high >= highest) {
        highest = high;
        highIndex = cursor;
      }
      if (low <= lowest) {
        lowest = low;
        lowIndex = cursor;
      }
    }
    if (highIndex < 0 || lowIndex < 0) continue;
    up[index] = ((period - (index - highIndex)) / period) * 100;
    down[index] = ((period - (index - lowIndex)) / period) * 100;
  }
  return { up, down };
}

function bollinger(
  values: IndicatorNumericSeries,
  period: number,
  deviations: number,
): OhlcvIndicatorResult {
  const value = simpleAverage(values, period);
  const deviation = rollingStandardDeviation(values, value, period);
  return {
    outputs: {
      value,
      lower: value.map((middle, index) =>
        finite(middle) && finite(deviation[index]) ? middle - deviations * deviation[index]! : null,
      ),
      upper: value.map((middle, index) =>
        finite(middle) && finite(deviation[index]) ? middle + deviations * deviation[index]! : null,
      ),
    },
    warmUpRows: period - 1,
  };
}

function accumulationDistribution(inputs: ResolvedTechnicalIndicatorInputs): Array<number | null> {
  const output = empty(inputs.close.length);
  let cumulative = 0;
  inputs.close.forEach((close, index) => {
    const high = inputs.high[index];
    const low = inputs.low[index];
    const volume = inputs.volume[index];
    if (!finite(close) || !finite(high) || !finite(low) || !finite(volume)) return;
    const multiplier = high === low ? 0 : (close - low - (high - close)) / (high - low);
    cumulative += multiplier * volume;
    output[index] = cumulative;
  });
  return output;
}

function commodityChannelIndex(
  inputs: ResolvedTechnicalIndicatorInputs,
  period: number,
): OhlcvIndicatorResult {
  const typical = typicalPrice(inputs.high, inputs.low, inputs.close);
  const average = simpleAverage(typical, period);
  const deviation = rollingDeviation(typical, average, period);
  return {
    outputs: {
      value: typical.map((item, index) => {
        const baseline = average[index];
        const meanDeviation = deviation[index];
        if (!finite(item) || !finite(baseline) || !finite(meanDeviation)) return null;
        return meanDeviation === 0 ? 0 : (item - baseline) / (0.015 * meanDeviation);
      }),
    },
    warmUpRows: period - 1,
  };
}

function chaikinMoneyFlow(
  inputs: ResolvedTechnicalIndicatorInputs,
  period: number,
): OhlcvIndicatorResult {
  const flow = inputs.close.map((close, index) => {
    const high = inputs.high[index];
    const low = inputs.low[index];
    const volume = inputs.volume[index];
    if (!finite(close) || !finite(high) || !finite(low) || !finite(volume)) return null;
    return (high === low ? 0 : (close - low - (high - close)) / (high - low)) * volume;
  });
  const flowSum = rollingSum(flow, period);
  const volumeSum = rollingSum(inputs.volume, period);
  return {
    outputs: {
      value: flowSum.map((value, index) => {
        const volume = volumeSum[index];
        return finite(value) && finite(volume) && volume !== 0 ? value / volume : null;
      }),
    },
    warmUpRows: period - 1,
  };
}

function chandeMomentum(values: IndicatorNumericSeries, period: number): OhlcvIndicatorResult {
  const gains = empty(values.length);
  const losses = empty(values.length);
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    const previous = values[index - 1];
    if (!finite(value) || !finite(previous)) continue;
    gains[index] = Math.max(0, value - previous);
    losses[index] = Math.max(0, previous - value);
  }
  const gainSum = rollingSum(gains, period);
  const lossSum = rollingSum(losses, period);
  return {
    outputs: {
      value: gainSum.map((gain, index) => {
        const loss = lossSum[index];
        if (!finite(gain) || !finite(loss)) return null;
        return gain + loss === 0 ? 0 : ((gain - loss) / (gain + loss)) * 100;
      }),
    },
    warmUpRows: period,
  };
}

function directionalMovement(
  inputs: ResolvedTechnicalIndicatorInputs,
  period: number,
): OhlcvIndicatorResult {
  const ranges = trueRange(inputs.high, inputs.low, inputs.close);
  const plusMovement = empty(inputs.high.length);
  const minusMovement = empty(inputs.high.length);
  for (let index = 1; index < inputs.high.length; index += 1) {
    const high = inputs.high[index];
    const low = inputs.low[index];
    const previousHigh = inputs.high[index - 1];
    const previousLow = inputs.low[index - 1];
    if (![high, low, previousHigh, previousLow].every(finite)) continue;
    const up = high! - previousHigh!;
    const down = previousLow! - low!;
    plusMovement[index] = up > down && up > 0 ? up : 0;
    minusMovement[index] = down > up && down > 0 ? down : 0;
  }
  const averageRange = wilderAverage(ranges.slice(1), period);
  const averagePlus = wilderAverage(plusMovement.slice(1), period);
  const averageMinus = wilderAverage(minusMovement.slice(1), period);
  const plus = empty(inputs.high.length);
  const minus = empty(inputs.high.length);
  const dx = empty(inputs.high.length);
  for (let index = 1; index < inputs.high.length; index += 1) {
    const range = averageRange[index - 1];
    const positive = averagePlus[index - 1];
    const negative = averageMinus[index - 1];
    if (!finite(range) || !finite(positive) || !finite(negative) || range === 0) continue;
    plus[index] = (positive / range) * 100;
    minus[index] = (negative / range) * 100;
    const sum = plus[index]! + minus[index]!;
    dx[index] = sum === 0 ? 0 : (Math.abs(plus[index]! - minus[index]!) / sum) * 100;
  }
  const value = wilderAverage(dx, period);
  return { outputs: { value, plus, minus }, warmUpRows: 2 * period - 1 };
}

function ichimoku(
  inputs: ResolvedTechnicalIndicatorInputs,
  parameters: Parameters,
): OhlcvIndicatorResult {
  const conversionPeriod = parameters.conversionPeriod!;
  const basePeriod = parameters.basePeriod!;
  const spanPeriod = parameters.spanPeriod!;
  const displacement = parameters.displacement!;
  const midpoint = (period: number): Array<number | null> => {
    const high = rollingExtrema(inputs.high, period, 'maximum');
    const low = rollingExtrema(inputs.low, period, 'minimum');
    return high.map((value, index) =>
      finite(value) && finite(low[index]) ? (value + low[index]!) / 2 : null,
    );
  };
  const conversion = midpoint(conversionPeriod);
  const base = midpoint(basePeriod);
  const spanA = conversion.map((value, index) =>
    finite(value) && finite(base[index]) ? (value + base[index]!) / 2 : null,
  );
  const spanB = midpoint(spanPeriod);
  const value = empty(inputs.high.length);
  const lower = empty(inputs.high.length);
  const upper = empty(inputs.high.length);
  spanA.forEach((leadingA, index) => {
    const leadingB = spanB[index];
    const target = index + displacement;
    if (target >= value.length || !finite(leadingA) || !finite(leadingB)) return;
    value[target] = leadingA;
    lower[target] = Math.min(leadingA, leadingB);
    upper[target] = Math.max(leadingA, leadingB);
  });
  return {
    outputs: { value, lower, upper, conversion, base },
    warmUpRows: spanPeriod - 1 + displacement,
  };
}

function keltner(
  inputs: ResolvedTechnicalIndicatorInputs,
  parameters: Parameters,
): OhlcvIndicatorResult {
  const period = parameters.period!;
  const atrPeriod = parameters.atrPeriod!;
  const multiplier = parameters.multiplier!;
  const value = exponentialAverage(inputs.close, period);
  const atr = wilderAverage(trueRange(inputs.high, inputs.low, inputs.close), atrPeriod);
  return {
    outputs: {
      value,
      lower: value.map((middle, index) =>
        finite(middle) && finite(atr[index]) ? middle - multiplier * atr[index]! : null,
      ),
      upper: value.map((middle, index) =>
        finite(middle) && finite(atr[index]) ? middle + multiplier * atr[index]! : null,
      ),
    },
    warmUpRows: Math.max(period, atrPeriod) - 1,
  };
}

function klinger(
  inputs: ResolvedTechnicalIndicatorInputs,
  parameters: Parameters,
): OhlcvIndicatorResult {
  const force = empty(inputs.close.length);
  let previousTrend = 0;
  let previousMovement = 0;
  let cumulativeMovement = 0;
  for (let index = 1; index < inputs.close.length; index += 1) {
    const current = [
      inputs.high[index],
      inputs.low[index],
      inputs.close[index],
      inputs.volume[index],
    ];
    const previous = [inputs.high[index - 1], inputs.low[index - 1], inputs.close[index - 1]];
    if (![...current, ...previous].every(finite)) {
      previousTrend = 0;
      previousMovement = 0;
      cumulativeMovement = 0;
      continue;
    }
    const currentSum = current[0]! + current[1]! + current[2]!;
    const previousSum = previous[0]! + previous[1]! + previous[2]!;
    const trend = currentSum > previousSum ? 1 : currentSum < previousSum ? -1 : previousTrend || 1;
    const movement = current[0]! - current[1]!;
    cumulativeMovement =
      trend === previousTrend ? cumulativeMovement + movement : previousMovement + movement;
    force[index] =
      cumulativeMovement === 0
        ? 0
        : current[3]! * Math.abs(2 * (movement / cumulativeMovement - 1)) * trend * 100;
    previousTrend = trend;
    previousMovement = movement;
  }
  const fast = exponentialAverage(force, parameters.fastPeriod!);
  const slow = exponentialAverage(force, parameters.slowPeriod!);
  const value = pairDifference(fast, slow);
  const signal = exponentialAverage(value, parameters.signalPeriod!);
  return {
    outputs: { value, signal },
    warmUpRows: parameters.slowPeriod! + parameters.signalPeriod! - 1,
  };
}

function moneyFlow(inputs: ResolvedTechnicalIndicatorInputs, period: number): OhlcvIndicatorResult {
  const typical = typicalPrice(inputs.high, inputs.low, inputs.close);
  const positive = empty(inputs.close.length);
  const negative = empty(inputs.close.length);
  for (let index = 1; index < inputs.close.length; index += 1) {
    const price = typical[index];
    const previous = typical[index - 1];
    const volume = inputs.volume[index];
    if (!finite(price) || !finite(previous) || !finite(volume)) continue;
    const flow = price * volume;
    positive[index] = price > previous ? flow : 0;
    negative[index] = price < previous ? flow : 0;
  }
  const positiveSum = rollingSum(positive, period);
  const negativeSum = rollingSum(negative, period);
  return {
    outputs: {
      value: positiveSum.map((gain, index) => {
        const loss = negativeSum[index];
        if (!finite(gain) || !finite(loss)) return null;
        if (loss === 0) return gain === 0 ? 50 : 100;
        return 100 - 100 / (1 + gain / loss);
      }),
    },
    warmUpRows: period,
  };
}

function onBalanceVolume(inputs: ResolvedTechnicalIndicatorInputs): OhlcvIndicatorResult {
  const value = empty(inputs.close.length);
  let balance = 0;
  inputs.close.forEach((close, index) => {
    const volume = inputs.volume[index];
    if (!finite(close) || !finite(volume)) return;
    const previous = inputs.close[index - 1];
    if (index > 0 && finite(previous)) {
      if (close > previous) balance += volume;
      else if (close < previous) balance -= volume;
    }
    value[index] = balance;
  });
  return { outputs: { value }, warmUpRows: 0 };
}

function pivotPoints(inputs: ResolvedTechnicalIndicatorInputs): OhlcvIndicatorResult {
  const value = empty(inputs.close.length);
  const support = empty(inputs.close.length);
  const resistance = empty(inputs.close.length);
  for (let index = 1; index < inputs.close.length; index += 1) {
    const high = inputs.high[index - 1];
    const low = inputs.low[index - 1];
    const close = inputs.close[index - 1];
    if (!finite(high) || !finite(low) || !finite(close)) continue;
    const pivot = (high + low + close) / 3;
    value[index] = pivot;
    support[index] = 2 * pivot - high;
    resistance[index] = 2 * pivot - low;
  }
  return { outputs: { value, support, resistance }, warmUpRows: 1 };
}

function parabolicSar(
  inputs: ResolvedTechnicalIndicatorInputs,
  acceleration: number,
  maximumAcceleration: number,
): OhlcvIndicatorResult {
  const value = empty(inputs.high.length);
  if (inputs.high.length < 2) return { outputs: { value }, warmUpRows: 1 };
  const firstHigh = inputs.high[0];
  const firstLow = inputs.low[0];
  const secondHigh = inputs.high[1];
  const secondLow = inputs.low[1];
  if (![firstHigh, firstLow, secondHigh, secondLow].every(finite)) {
    return { outputs: { value }, warmUpRows: 1 };
  }
  let rising = (secondHigh! + secondLow!) / 2 >= (firstHigh! + firstLow!) / 2;
  let extreme = rising ? Math.max(firstHigh!, secondHigh!) : Math.min(firstLow!, secondLow!);
  let sar = rising ? Math.min(firstLow!, secondLow!) : Math.max(firstHigh!, secondHigh!);
  let factor = acceleration;
  value[1] = sar;
  for (let index = 2; index < inputs.high.length; index += 1) {
    const high = inputs.high[index];
    const low = inputs.low[index];
    if (!finite(high) || !finite(low)) continue;
    sar += factor * (extreme - sar);
    if (rising) {
      sar = Math.min(sar, inputs.low[index - 1] ?? sar, inputs.low[index - 2] ?? sar);
      if (low < sar) {
        rising = false;
        sar = extreme;
        extreme = low;
        factor = acceleration;
      } else if (high > extreme) {
        extreme = high;
        factor = Math.min(maximumAcceleration, factor + acceleration);
      }
    } else {
      sar = Math.max(sar, inputs.high[index - 1] ?? sar, inputs.high[index - 2] ?? sar);
      if (high > sar) {
        rising = true;
        sar = extreme;
        extreme = high;
        factor = acceleration;
      } else if (low < extreme) {
        extreme = low;
        factor = Math.min(maximumAcceleration, factor + acceleration);
      }
    }
    value[index] = sar;
  }
  return { outputs: { value }, warmUpRows: 1 };
}

function stochastic(
  inputs: ResolvedTechnicalIndicatorInputs,
  period: number,
  smoothK: number,
  smoothD: number,
): OhlcvIndicatorResult {
  const fast = rollingRangePosition(inputs.high, inputs.low, inputs.close, period);
  const value = smoothK === 1 ? fast : simpleAverage(fast, smoothK);
  const signal = smoothD === 1 ? [...value] : simpleAverage(value, smoothD);
  return {
    outputs: { value, signal },
    warmUpRows: period - 1 + (smoothK - 1) + (smoothD - 1),
  };
}

function supertrend(
  inputs: ResolvedTechnicalIndicatorInputs,
  parameters: Parameters,
): OhlcvIndicatorResult {
  const atr = wilderAverage(
    trueRange(inputs.high, inputs.low, inputs.close),
    parameters.atrPeriod!,
  );
  const value = empty(inputs.close.length);
  const direction = empty(inputs.close.length);
  let finalUpper: number | null = null;
  let finalLower: number | null = null;
  let previousTrend: number | null = null;
  for (let index = 0; index < inputs.close.length; index += 1) {
    const high = inputs.high[index];
    const low = inputs.low[index];
    const close = inputs.close[index];
    const range = atr[index];
    if (!finite(high) || !finite(low) || !finite(close) || !finite(range)) continue;
    const middle = (high + low) / 2;
    const basicUpper = middle + parameters.multiplier! * range;
    const basicLower = middle - parameters.multiplier! * range;
    const previousClose = inputs.close[index - 1];
    finalUpper =
      finalUpper === null ||
      !finite(previousClose) ||
      basicUpper < finalUpper ||
      previousClose > finalUpper
        ? basicUpper
        : finalUpper;
    finalLower =
      finalLower === null ||
      !finite(previousClose) ||
      basicLower > finalLower ||
      previousClose < finalLower
        ? basicLower
        : finalLower;
    if (previousTrend === null) previousTrend = close <= finalUpper ? -1 : 1;
    else if (previousTrend < 0 && close > finalUpper) previousTrend = 1;
    else if (previousTrend > 0 && close < finalLower) previousTrend = -1;
    direction[index] = previousTrend;
    value[index] = previousTrend > 0 ? finalLower : finalUpper;
  }
  return { outputs: { value, direction }, warmUpRows: parameters.atrPeriod! - 1 };
}

function volumeWeightedAveragePrice(
  inputs: ResolvedTechnicalIndicatorInputs,
): OhlcvIndicatorResult {
  const typical = typicalPrice(inputs.high, inputs.low, inputs.close);
  const value = empty(inputs.close.length);
  let weighted = 0;
  let volumeTotal = 0;
  typical.forEach((price, index) => {
    const volume = inputs.volume[index];
    if (!finite(price) || !finite(volume)) return;
    weighted += price * volume;
    volumeTotal += volume;
    value[index] = volumeTotal === 0 ? null : weighted / volumeTotal;
  });
  return { outputs: { value }, warmUpRows: 0 };
}

function zigzag(values: IndicatorNumericSeries, deviation: number): OhlcvIndicatorResult {
  const output = empty(values.length);
  const threshold = deviation / 100;
  const firstIndex = values.findIndex(finite);
  if (firstIndex < 0) return { outputs: { value: output }, warmUpRows: 1 };
  let candidateIndex = firstIndex;
  let candidate = values[firstIndex]!;
  let direction: -1 | 0 | 1 = 0;
  output[firstIndex] = candidate;
  for (let index = firstIndex + 1; index < values.length; index += 1) {
    const value = values[index];
    if (!finite(value)) continue;
    if (direction >= 0) {
      if (value >= candidate) {
        output[candidateIndex] = null;
        candidate = value;
        candidateIndex = index;
        output[candidateIndex] = candidate;
      } else if (candidate !== 0 && (candidate - value) / Math.abs(candidate) >= threshold) {
        direction = -1;
        candidate = value;
        candidateIndex = index;
        output[candidateIndex] = candidate;
      }
    } else if (direction <= 0) {
      if (value <= candidate) {
        output[candidateIndex] = null;
        candidate = value;
        candidateIndex = index;
        output[candidateIndex] = candidate;
      } else if (candidate !== 0 && (value - candidate) / Math.abs(candidate) >= threshold) {
        direction = 1;
        candidate = value;
        candidateIndex = index;
        output[candidateIndex] = candidate;
      }
    }
  }
  output[candidateIndex] = candidate;
  return { outputs: { value: output }, warmUpRows: 1 };
}

/**
 * Calculations that historically required supplied columns. The caller owns
 * identifier/parameter/input validation and session segmentation.
 */
export function calculateOhlcvTechnicalIndicator(
  kind: string,
  inputs: ResolvedTechnicalIndicatorInputs,
  parameters: Parameters,
): OhlcvIndicatorResult {
  switch (kind) {
    case 'abands':
      return accelerationBands(inputs, parameters.period!, parameters.multiplier!);
    case 'ao': {
      const median = medianPrice(inputs.high, inputs.low);
      return {
        outputs: {
          value: pairDifference(
            simpleAverage(median, parameters.fastPeriod!),
            simpleAverage(median, parameters.slowPeriod!),
          ),
        },
        warmUpRows: parameters.slowPeriod! - 1,
      };
    }
    case 'aroon': {
      const output = aroon(inputs, parameters.period!);
      return { outputs: { value: output.up, ...output }, warmUpRows: parameters.period! };
    }
    case 'aroonoscillator': {
      const output = aroon(inputs, parameters.period!);
      return {
        outputs: { value: pairDifference(output.up, output.down) },
        warmUpRows: parameters.period!,
      };
    }
    case 'atr':
      return {
        outputs: {
          value: wilderAverage(
            trueRange(inputs.high, inputs.low, inputs.close),
            parameters.period!,
          ),
        },
        warmUpRows: parameters.period! - 1,
      };
    case 'bb':
      return bollinger(inputs.value, parameters.period!, parameters.standardDeviations!);
    case 'cci':
      return commodityChannelIndex(inputs, parameters.period!);
    case 'chaikin': {
      const line = accumulationDistribution(inputs);
      return {
        outputs: {
          value: pairDifference(
            exponentialAverage(line, parameters.fastPeriod!),
            exponentialAverage(line, parameters.slowPeriod!),
          ),
        },
        warmUpRows: parameters.slowPeriod! - 1,
      };
    }
    case 'cmf':
      return chaikinMoneyFlow(inputs, parameters.period!);
    case 'cmo':
      return chandeMomentum(inputs.value, parameters.period!);
    case 'dmi':
      return directionalMovement(inputs, parameters.period!);
    case 'dpo': {
      const average = simpleAverage(inputs.value, parameters.period!);
      const shift = Math.floor(parameters.period! / 2) + 1;
      return {
        outputs: {
          value: average.map((baseline, index) => {
            const source = inputs.value[index - shift];
            return finite(baseline) && finite(source) ? source - baseline : null;
          }),
        },
        warmUpRows: parameters.period! - 1,
      };
    }
    case 'ikh':
      return ichimoku(inputs, parameters);
    case 'keltnerchannels':
      return keltner(inputs, parameters);
    case 'klinger':
      return klinger(inputs, parameters);
    case 'mfi':
      return moneyFlow(inputs, parameters.period!);
    case 'natr': {
      const atr = wilderAverage(
        trueRange(inputs.high, inputs.low, inputs.close),
        parameters.period!,
      );
      return {
        outputs: {
          value: atr.map((range, index) => {
            const close = inputs.close[index];
            return finite(range) && finite(close) && close !== 0 ? (range / close) * 100 : null;
          }),
        },
        warmUpRows: parameters.period! - 1,
      };
    }
    case 'obv':
      return onBalanceVolume(inputs);
    case 'pc': {
      const upper = rollingExtrema(inputs.high, parameters.period!, 'maximum');
      const lower = rollingExtrema(inputs.low, parameters.period!, 'minimum');
      return {
        outputs: {
          value: upper.map((high, index) =>
            finite(high) && finite(lower[index]) ? (high + lower[index]!) / 2 : null,
          ),
          lower,
          upper,
        },
        warmUpRows: parameters.period! - 1,
      };
    }
    case 'pivotpoints':
      return pivotPoints(inputs);
    case 'priceenvelopes': {
      const value = simpleAverage(inputs.value, parameters.period!);
      const factor = parameters.envelopePercent! / 100;
      return {
        outputs: {
          value,
          lower: value.map((item) => (finite(item) ? item * (1 - factor) : null)),
          upper: value.map((item) => (finite(item) ? item * (1 + factor) : null)),
        },
        warmUpRows: parameters.period! - 1,
      };
    }
    case 'psar':
      return parabolicSar(inputs, parameters.acceleration!, parameters.maximumAcceleration!);
    case 'slowstochastic':
      return stochastic(inputs, parameters.period!, parameters.smoothK!, parameters.smoothD!);
    case 'stochastic':
      return stochastic(inputs, parameters.period!, 1, parameters.signalPeriod!);
    case 'supertrend':
      return supertrend(inputs, parameters);
    case 'vwap':
      return volumeWeightedAveragePrice(inputs);
    case 'williamsr': {
      const position = rollingRangePosition(
        inputs.high,
        inputs.low,
        inputs.close,
        parameters.period!,
      );
      return {
        outputs: { value: position.map((item) => (finite(item) ? item - 100 : null)) },
        warmUpRows: parameters.period! - 1,
      };
    }
    case 'zigzag':
      return zigzag(inputs.value, parameters.deviation!);
    default:
      throw new Error(`Unsupported OHLCV technical indicator: ${kind}`);
  }
}
