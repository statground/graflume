import { GraflumeError } from '../core/errors.js';
import type { DataLineage, TransformResult, TransformStepLineage } from './transforms.js';
import type { DataRow, JsonValue, NormalizedLayerSpec } from '../spec/types.js';

export const technicalIndicatorPresetIds = [
  'acceleration-bands',
  'awesome-oscillator',
  'absolute-price-oscillator',
  'aroon',
  'aroon-oscillator',
  'average-true-range',
  'volatility-bands',
  'commodity-channel-index',
  'chaikin-oscillator',
  'chaikin-money-flow',
  'chande-momentum-oscillator',
  'double-exponential-average',
  'disparity-index',
  'directional-movement-index',
  'detrended-price-oscillator',
  'exponential-moving-average',
  'ichimoku-cloud',
  'keltner-channels',
  'klinger-oscillator',
  'linear-regression',
  'linear-regression-angle',
  'linear-regression-intercept',
  'linear-regression-slope',
  'moving-average-convergence-divergence',
  'money-flow-index',
  'momentum',
  'normalized-average-true-range',
  'on-balance-volume',
  'price-channel',
  'pivot-points',
  'percentage-price-oscillator',
  'price-envelopes',
  'parabolic-stop-and-reverse',
  'rate-of-change',
  'relative-strength-index',
  'slow-stochastic',
  'simple-moving-average',
  'stochastic',
  'supertrend',
  'triple-exponential-average',
  'triple-exponential-oscillator',
  'volume-weighted-average-price',
  'williams-range',
  'weighted-moving-average',
  'zigzag',
] as const;

export type TechnicalIndicatorPresetId = (typeof technicalIndicatorPresetIds)[number];
export type TechnicalIndicatorSupport = 'computed' | 'precomputed-required';

export interface IndicatorParameterCapability {
  readonly name: 'period' | 'fastPeriod' | 'slowPeriod' | 'signalPeriod';
  readonly type: 'integer';
  readonly minimum: number;
  readonly maximum: number;
  readonly default: number;
}

export interface IndicatorDependencyNode {
  readonly id: string;
  readonly operation: string;
  readonly inputs: readonly string[];
  readonly parameters: readonly string[];
}

export interface TechnicalIndicatorCapability {
  readonly id: TechnicalIndicatorPresetId;
  readonly kind: string;
  readonly quickApi: string;
  readonly support: TechnicalIndicatorSupport;
  readonly requiredInputs: readonly string[];
  readonly outputs: readonly string[];
  readonly parameters: readonly IndicatorParameterCapability[];
  readonly dependencyDag: readonly IndicatorDependencyNode[];
  readonly warmUp: {
    readonly policy: 'null';
    readonly rows: string;
  };
  readonly provenance: string;
}

export interface TechnicalIndicatorCalculation {
  readonly capability: TechnicalIndicatorCapability;
  readonly outputs: Readonly<Record<string, readonly (number | null)[]>>;
  readonly warmUpRows: number;
  readonly parameters: Readonly<Record<string, number>>;
  readonly provenance: string;
}

interface IndicatorDefinition {
  readonly id: TechnicalIndicatorPresetId;
  readonly kind: string;
  readonly quickApi: string;
}

const definitions: readonly IndicatorDefinition[] = [
  { id: 'acceleration-bands', kind: 'abands', quickApi: 'accelerationBands' },
  { id: 'awesome-oscillator', kind: 'ao', quickApi: 'awesomeOscillator' },
  { id: 'absolute-price-oscillator', kind: 'apo', quickApi: 'absolutePriceOscillator' },
  { id: 'aroon', kind: 'aroon', quickApi: 'aroon' },
  { id: 'aroon-oscillator', kind: 'aroonoscillator', quickApi: 'aroonOscillator' },
  { id: 'average-true-range', kind: 'atr', quickApi: 'averageTrueRange' },
  { id: 'volatility-bands', kind: 'bb', quickApi: 'volatilityBands' },
  { id: 'commodity-channel-index', kind: 'cci', quickApi: 'commodityChannelIndex' },
  { id: 'chaikin-oscillator', kind: 'chaikin', quickApi: 'chaikinOscillator' },
  { id: 'chaikin-money-flow', kind: 'cmf', quickApi: 'chaikinMoneyFlow' },
  { id: 'chande-momentum-oscillator', kind: 'cmo', quickApi: 'chandeMomentumOscillator' },
  {
    id: 'double-exponential-average',
    kind: 'dema',
    quickApi: 'doubleExponentialMovingAverage',
  },
  { id: 'disparity-index', kind: 'disparityindex', quickApi: 'disparityIndex' },
  { id: 'directional-movement-index', kind: 'dmi', quickApi: 'directionalMovementIndex' },
  { id: 'detrended-price-oscillator', kind: 'dpo', quickApi: 'detrendedPriceOscillator' },
  {
    id: 'exponential-moving-average',
    kind: 'ema',
    quickApi: 'exponentialMovingAverage',
  },
  { id: 'ichimoku-cloud', kind: 'ikh', quickApi: 'ichimokuCloud' },
  { id: 'keltner-channels', kind: 'keltnerchannels', quickApi: 'keltnerChannels' },
  { id: 'klinger-oscillator', kind: 'klinger', quickApi: 'klingerOscillator' },
  { id: 'linear-regression', kind: 'linearregression', quickApi: 'linearRegression' },
  {
    id: 'linear-regression-angle',
    kind: 'linearregressionangle',
    quickApi: 'linearRegressionAngle',
  },
  {
    id: 'linear-regression-intercept',
    kind: 'linearregressionintercept',
    quickApi: 'linearRegressionIntercept',
  },
  {
    id: 'linear-regression-slope',
    kind: 'linearregressionslope',
    quickApi: 'linearRegressionSlope',
  },
  {
    id: 'moving-average-convergence-divergence',
    kind: 'macd',
    quickApi: 'movingAverageConvergenceDivergence',
  },
  { id: 'money-flow-index', kind: 'mfi', quickApi: 'moneyFlowIndex' },
  { id: 'momentum', kind: 'momentum', quickApi: 'momentumIndicator' },
  { id: 'normalized-average-true-range', kind: 'natr', quickApi: 'normalizedAverageTrueRange' },
  { id: 'on-balance-volume', kind: 'obv', quickApi: 'onBalanceVolume' },
  { id: 'price-channel', kind: 'pc', quickApi: 'priceChannel' },
  { id: 'pivot-points', kind: 'pivotpoints', quickApi: 'pivotPoints' },
  { id: 'percentage-price-oscillator', kind: 'ppo', quickApi: 'percentagePriceOscillator' },
  { id: 'price-envelopes', kind: 'priceenvelopes', quickApi: 'priceEnvelopes' },
  { id: 'parabolic-stop-and-reverse', kind: 'psar', quickApi: 'parabolicStopAndReverse' },
  { id: 'rate-of-change', kind: 'roc', quickApi: 'rateOfChange' },
  { id: 'relative-strength-index', kind: 'rsi', quickApi: 'relativeStrengthIndex' },
  { id: 'slow-stochastic', kind: 'slowstochastic', quickApi: 'slowStochastic' },
  { id: 'simple-moving-average', kind: 'sma', quickApi: 'simpleMovingAverage' },
  { id: 'stochastic', kind: 'stochastic', quickApi: 'stochastic' },
  { id: 'supertrend', kind: 'supertrend', quickApi: 'supertrend' },
  {
    id: 'triple-exponential-average',
    kind: 'tema',
    quickApi: 'tripleExponentialMovingAverage',
  },
  {
    id: 'triple-exponential-oscillator',
    kind: 'trix',
    quickApi: 'tripleExponentialAverageOscillator',
  },
  {
    id: 'volume-weighted-average-price',
    kind: 'vwap',
    quickApi: 'volumeWeightedAveragePrice',
  },
  { id: 'williams-range', kind: 'williamsr', quickApi: 'williamsRange' },
  { id: 'weighted-moving-average', kind: 'wma', quickApi: 'weightedMovingAverage' },
  { id: 'zigzag', kind: 'zigzag', quickApi: 'zigzag' },
] as const;

const periodParameter: IndicatorParameterCapability = {
  name: 'period',
  type: 'integer',
  minimum: 2,
  maximum: 200,
  default: 14,
};
const fastPeriodParameter: IndicatorParameterCapability = {
  name: 'fastPeriod',
  type: 'integer',
  minimum: 2,
  maximum: 200,
  default: 12,
};
const slowPeriodParameter: IndicatorParameterCapability = {
  name: 'slowPeriod',
  type: 'integer',
  minimum: 2,
  maximum: 200,
  default: 26,
};
const signalPeriodParameter: IndicatorParameterCapability = {
  name: 'signalPeriod',
  type: 'integer',
  minimum: 2,
  maximum: 200,
  default: 9,
};

const computedKinds = new Set([
  'apo',
  'dema',
  'disparityindex',
  'ema',
  'linearregression',
  'linearregressionangle',
  'linearregressionintercept',
  'linearregressionslope',
  'macd',
  'momentum',
  'ppo',
  'roc',
  'rsi',
  'sma',
  'tema',
  'trix',
  'wma',
]);

function capabilityParameters(kind: string): readonly IndicatorParameterCapability[] {
  if (kind === 'apo' || kind === 'ppo') return [fastPeriodParameter, slowPeriodParameter];
  if (kind === 'macd') return [fastPeriodParameter, slowPeriodParameter, signalPeriodParameter];
  return computedKinds.has(kind) ? [periodParameter] : [];
}

function capabilityOutputs(kind: string): readonly string[] {
  return kind === 'macd' ? ['value', 'signal', 'histogram'] : ['value'];
}

function warmUpDescription(kind: string): string {
  if (kind === 'dema') return '2 * (period - 1)';
  if (kind === 'tema' || kind === 'trix') return '3 * (period - 1)';
  if (kind === 'apo' || kind === 'ppo') return 'slowPeriod - 1';
  if (kind === 'macd') return 'slowPeriod + signalPeriod - 2';
  if (kind === 'momentum' || kind === 'roc' || kind === 'rsi') return 'period';
  return 'period - 1';
}

function dependencyDag(kind: string): readonly IndicatorDependencyNode[] {
  const input = { id: 'source', operation: 'input', inputs: [], parameters: [] } as const;
  if (kind === 'dema') {
    return [
      input,
      { id: 'ema1', operation: 'ema', inputs: ['source'], parameters: ['period'] },
      { id: 'ema2', operation: 'ema', inputs: ['ema1'], parameters: ['period'] },
      { id: 'value', operation: '2*ema1-ema2', inputs: ['ema1', 'ema2'], parameters: [] },
    ];
  }
  if (kind === 'tema' || kind === 'trix') {
    return [
      input,
      { id: 'ema1', operation: 'ema', inputs: ['source'], parameters: ['period'] },
      { id: 'ema2', operation: 'ema', inputs: ['ema1'], parameters: ['period'] },
      { id: 'ema3', operation: 'ema', inputs: ['ema2'], parameters: ['period'] },
      {
        id: 'value',
        operation: kind === 'trix' ? 'rate-of-change' : '3*ema1-3*ema2+ema3',
        inputs: kind === 'trix' ? ['ema3'] : ['ema1', 'ema2', 'ema3'],
        parameters: kind === 'trix' ? ['1'] : [],
      },
    ];
  }
  if (kind === 'apo' || kind === 'ppo' || kind === 'macd') {
    return [
      input,
      { id: 'fast', operation: 'ema', inputs: ['source'], parameters: ['fastPeriod'] },
      { id: 'slow', operation: 'ema', inputs: ['source'], parameters: ['slowPeriod'] },
      {
        id: 'value',
        operation: kind === 'ppo' ? 'percent-difference' : 'difference',
        inputs: ['fast', 'slow'],
        parameters: [],
      },
      ...(kind === 'macd'
        ? [
            {
              id: 'signal',
              operation: 'ema',
              inputs: ['value'],
              parameters: ['signalPeriod'],
            },
            {
              id: 'histogram',
              operation: 'difference',
              inputs: ['value', 'signal'],
              parameters: [],
            },
          ]
        : []),
    ];
  }
  return [
    input,
    {
      id: 'value',
      operation: kind,
      inputs: ['source'],
      parameters: capabilityParameters(kind).map(({ name }) => name),
    },
  ];
}

function computedProvenance(kind: string): string {
  const descriptions: Readonly<Record<string, string>> = {
    sma: 'Arithmetic rolling mean over period values.',
    ema: 'EMA seeded by the first complete period mean, then alpha = 2 / (period + 1).',
    wma: 'Linearly weighted rolling mean with weights 1 through period.',
    dema: 'DEMA = 2 * EMA(source) - EMA(EMA(source)).',
    tema: 'TEMA = 3 * EMA1 - 3 * EMA2 + EMA3.',
    momentum: 'Momentum = value - value[period].',
    roc: 'Rate of change = 100 * (value - value[period]) / value[period].',
    rsi: 'Wilder RSI with an arithmetic seed and Wilder-smoothed gains and losses.',
    apo: 'Absolute price oscillator = fast EMA - slow EMA.',
    ppo: 'Percentage price oscillator = 100 * (fast EMA - slow EMA) / slow EMA.',
    macd: 'MACD = fast EMA - slow EMA; signal is an EMA of MACD; histogram is their difference.',
    disparityindex: 'Disparity index = 100 * (value / SMA(period) - 1).',
    linearregression: 'Rolling least-squares value at the final index in each period window.',
    linearregressionintercept: 'Rolling least-squares intercept over index 0 through period - 1.',
    linearregressionslope: 'Rolling least-squares slope over index 0 through period - 1.',
    linearregressionangle: 'Arctangent of the rolling least-squares slope, in degrees.',
    trix: 'One-period percentage rate of change of a triple EMA.',
  };
  return descriptions[kind] ?? 'Deterministic Graflume built-in calculation.';
}

export const technicalIndicatorCapabilities: readonly TechnicalIndicatorCapability[] =
  definitions.map((definition) => {
    const computed = computedKinds.has(definition.kind);
    return {
      ...definition,
      support: computed ? 'computed' : 'precomputed-required',
      requiredInputs: ['value'],
      outputs: capabilityOutputs(definition.kind),
      parameters: capabilityParameters(definition.kind),
      dependencyDag: computed ? dependencyDag(definition.kind) : [],
      warmUp: {
        policy: 'null',
        rows: computed ? warmUpDescription(definition.kind) : 'not applicable to supplied columns',
      },
      provenance: computed
        ? computedProvenance(definition.kind)
        : 'Graflume renders supplied indicator columns and does not calculate this named indicator.',
    };
  });

const capabilityByIdentifier = new Map<string, TechnicalIndicatorCapability>();
technicalIndicatorCapabilities.forEach((capability) => {
  for (const identifier of [capability.id, capability.kind, capability.quickApi]) {
    capabilityByIdentifier.set(identifier.toLowerCase(), capability);
  }
});

export function resolveTechnicalIndicatorCapability(
  identifier: string,
): TechnicalIndicatorCapability | null {
  return capabilityByIdentifier.get(identifier.trim().toLowerCase()) ?? null;
}

function parameter(
  options: Readonly<Record<string, JsonValue>>,
  name: IndicatorParameterCapability['name'],
  fallback: number,
): number {
  const value = options[name];
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(2, Math.min(200, Math.floor(value)))
    : fallback;
}

function movingAverage(values: readonly (number | null)[], period: number): Array<number | null> {
  const output = Array.from<number | null>({ length: values.length }).fill(null);
  let sum = 0;
  let valid = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value !== null && value !== undefined) {
      sum += value;
      valid += 1;
    }
    const removed = values[index - period];
    if (removed !== null && removed !== undefined) {
      sum -= removed;
      valid -= 1;
    }
    if (index + 1 >= period && valid === period) output[index] = sum / period;
  }
  return output;
}

function exponentialAverage(
  values: readonly (number | null)[],
  period: number,
): Array<number | null> {
  const output = Array.from<number | null>({ length: values.length }).fill(null);
  const alpha = 2 / (period + 1);
  let seed: number[] = [];
  let previous: number | null = null;
  values.forEach((value, index) => {
    if (value === null) {
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

function weightedAverage(values: readonly (number | null)[], period: number): Array<number | null> {
  const denominator = (period * (period + 1)) / 2;
  return values.map((_, index) => {
    if (index + 1 < period) return null;
    const window = values.slice(index + 1 - period, index + 1);
    if (window.some((value) => value === null)) return null;
    return (
      window.reduce<number>((sum, value, offset) => sum + value! * (offset + 1), 0) / denominator
    );
  });
}

function difference(
  left: readonly (number | null)[],
  right: readonly (number | null)[],
  percent = false,
): Array<number | null> {
  return left.map((value, index) => {
    const baseline = right[index];
    if (value === null || baseline === null || baseline === undefined) return null;
    if (percent && baseline === 0) return null;
    return percent ? ((value - baseline) / baseline) * 100 : value - baseline;
  });
}

function lagDifference(
  values: readonly (number | null)[],
  period: number,
  percent: boolean,
): Array<number | null> {
  return values.map((value, index) => {
    const previous = values[index - period];
    if (value === null || previous === null || previous === undefined) return null;
    if (percent && previous === 0) return null;
    return percent ? ((value - previous) / previous) * 100 : value - previous;
  });
}

function relativeStrength(
  values: readonly (number | null)[],
  period: number,
): Array<number | null> {
  const output = Array.from<number | null>({ length: values.length }).fill(null);
  let gains: number[] = [];
  let losses: number[] = [];
  let averageGain: number | null = null;
  let averageLoss: number | null = null;
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    const previous = values[index - 1];
    if (value === null || previous === null || value === undefined || previous === undefined) {
      gains = [];
      losses = [];
      averageGain = null;
      averageLoss = null;
      continue;
    }
    const change = value - previous;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);
    if (averageGain === null || averageLoss === null) {
      gains.push(gain);
      losses.push(loss);
      if (gains.length < period) continue;
      averageGain = gains.reduce((sum, item) => sum + item, 0) / period;
      averageLoss = losses.reduce((sum, item) => sum + item, 0) / period;
    } else {
      averageGain = (averageGain * (period - 1) + gain) / period;
      averageLoss = (averageLoss * (period - 1) + loss) / period;
    }
    output[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }
  return output;
}

function rollingRegression(
  values: readonly (number | null)[],
  period: number,
): {
  readonly value: Array<number | null>;
  readonly slope: Array<number | null>;
  readonly intercept: Array<number | null>;
  readonly angle: Array<number | null>;
} {
  const value = Array.from<number | null>({ length: values.length }).fill(null);
  const slope = [...value];
  const intercept = [...value];
  const angle = [...value];
  const sumX = (period * (period - 1)) / 2;
  const sumXX = (period * (period - 1) * (2 * period - 1)) / 6;
  const denominator = period * sumXX - sumX * sumX;
  for (let index = period - 1; index < values.length; index += 1) {
    const window = values.slice(index + 1 - period, index + 1);
    if (window.some((item) => item === null)) continue;
    const sumY = window.reduce<number>((sum, item) => sum + item!, 0);
    const sumXY = window.reduce<number>((sum, item, x) => sum + x * item!, 0);
    const resolvedSlope = denominator === 0 ? 0 : (period * sumXY - sumX * sumY) / denominator;
    const resolvedIntercept = (sumY - resolvedSlope * sumX) / period;
    slope[index] = resolvedSlope;
    intercept[index] = resolvedIntercept;
    angle[index] = (Math.atan(resolvedSlope) * 180) / Math.PI;
    value[index] = resolvedIntercept + resolvedSlope * (period - 1);
  }
  return { value, slope, intercept, angle };
}

function warmUpRows(kind: string, period: number, slow: number, signal: number): number {
  if (kind === 'dema') return 2 * (period - 1);
  if (kind === 'tema' || kind === 'trix') return 3 * (period - 1);
  if (kind === 'apo' || kind === 'ppo') return slow - 1;
  if (kind === 'macd') return slow + signal - 2;
  if (kind === 'momentum' || kind === 'roc' || kind === 'rsi') return period;
  return period - 1;
}

export function calculateTechnicalIndicator(
  identifier: string,
  values: readonly (number | null)[],
  options: Readonly<Record<string, JsonValue>> = {},
): TechnicalIndicatorCalculation {
  const capability = resolveTechnicalIndicatorCapability(identifier);
  if (capability === null) {
    throw new GraflumeError('INVALID_SPEC', `Unknown technical indicator "${identifier}".`, {
      path: '$.mark.options.kind',
    });
  }
  if (capability.support !== 'computed') {
    throw new GraflumeError(
      'INVALID_SPEC',
      `${capability.id} is precomputed-required; remove calculate: true and supply its indicator columns.`,
      { path: '$.mark.options.calculate' },
    );
  }
  const period = parameter(options, 'period', 14);
  const fastPeriod = parameter(options, 'fastPeriod', 12);
  const slowPeriod = parameter(options, 'slowPeriod', 26);
  const signalPeriod = parameter(options, 'signalPeriod', 9);
  if (fastPeriod >= slowPeriod && ['apo', 'ppo', 'macd'].includes(capability.kind)) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'fastPeriod must be smaller than slowPeriod for APO, PPO, and MACD.',
      { path: '$.mark.options.fastPeriod' },
    );
  }
  let outputs: Readonly<Record<string, readonly (number | null)[]>>;
  switch (capability.kind) {
    case 'sma':
      outputs = { value: movingAverage(values, period) };
      break;
    case 'ema':
      outputs = { value: exponentialAverage(values, period) };
      break;
    case 'wma':
      outputs = { value: weightedAverage(values, period) };
      break;
    case 'dema': {
      const first = exponentialAverage(values, period);
      const second = exponentialAverage(first, period);
      outputs = {
        value: first.map((item, index) =>
          item === null || second[index] === null ? null : 2 * item - second[index]!,
        ),
      };
      break;
    }
    case 'tema': {
      const first = exponentialAverage(values, period);
      const second = exponentialAverage(first, period);
      const third = exponentialAverage(second, period);
      outputs = {
        value: first.map((item, index) =>
          item === null || second[index] === null || third[index] === null
            ? null
            : 3 * item - 3 * second[index]! + third[index]!,
        ),
      };
      break;
    }
    case 'momentum':
      outputs = { value: lagDifference(values, period, false) };
      break;
    case 'roc':
      outputs = { value: lagDifference(values, period, true) };
      break;
    case 'rsi':
      outputs = { value: relativeStrength(values, period) };
      break;
    case 'apo':
    case 'ppo':
    case 'macd': {
      const fast = exponentialAverage(values, fastPeriod);
      const slow = exponentialAverage(values, slowPeriod);
      const primary = difference(fast, slow, capability.kind === 'ppo');
      if (capability.kind !== 'macd') {
        outputs = { value: primary };
        break;
      }
      const signal = exponentialAverage(primary, signalPeriod);
      outputs = { value: primary, signal, histogram: difference(primary, signal) };
      break;
    }
    case 'disparityindex': {
      const average = movingAverage(values, period);
      outputs = {
        value: values.map((item, index) => {
          const baseline = average[index];
          return item === null || baseline === null || baseline === undefined || baseline === 0
            ? null
            : (item / baseline - 1) * 100;
        }),
      };
      break;
    }
    case 'linearregression':
    case 'linearregressionslope':
    case 'linearregressionintercept':
    case 'linearregressionangle': {
      const regression = rollingRegression(values, period);
      const key =
        capability.kind === 'linearregressionslope'
          ? 'slope'
          : capability.kind === 'linearregressionintercept'
            ? 'intercept'
            : capability.kind === 'linearregressionangle'
              ? 'angle'
              : 'value';
      outputs = { value: regression[key] };
      break;
    }
    case 'trix': {
      const first = exponentialAverage(values, period);
      const second = exponentialAverage(first, period);
      const third = exponentialAverage(second, period);
      outputs = { value: lagDifference(third, 1, true) };
      break;
    }
    default:
      throw new GraflumeError('INVALID_SPEC', `${capability.id} has no built-in calculation.`, {
        path: '$.mark.options.calculate',
      });
  }
  return {
    capability,
    outputs,
    warmUpRows: warmUpRows(capability.kind, period, slowPeriod, signalPeriod),
    parameters: { period, fastPeriod, slowPeriod, signalPeriod },
    provenance: capability.provenance,
  };
}

export interface PreparedTechnicalIndicator {
  readonly layer: NormalizedLayerSpec;
  readonly result: TransformResult;
  readonly calculation: TechnicalIndicatorCalculation | null;
}

function indicatorSourceField(layer: NormalizedLayerSpec): string {
  let hash = 0;
  for (const character of `${layer.id}\u0000${layer.y.field}`) {
    hash = (Math.imul(hash, 31) + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  return `__graflume_indicator_source_${hash.toString(36)}`;
}

/** Materialize a supported calculation before scale-domain resolution and rendering. */
export function prepareTechnicalIndicator(
  layer: NormalizedLayerSpec,
  transformed: TransformResult,
): PreparedTechnicalIndicator {
  if (layer.mark.type !== 'indicator' || layer.mark.options.calculate !== true) {
    return { layer, result: transformed, calculation: null };
  }
  const kind =
    typeof layer.mark.options.kind === 'string' && layer.mark.options.kind.trim() !== ''
      ? layer.mark.options.kind
      : 'sma';
  const sourceField = indicatorSourceField(layer);
  const values = transformed.data.map((row) => {
    const value = row[layer.y.field];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });
  const calculation = calculateTechnicalIndicator(kind, values, layer.mark.options);
  const data = transformed.data.map((row, index) => {
    const output: Record<string, DataRow[string]> = {
      ...row,
      [sourceField]: row[layer.y.field],
      [layer.y.field]: calculation.outputs.value?.[index] ?? null,
    };
    const fields = layer.mark.options.fields;
    if (Array.isArray(fields)) {
      fields.forEach((field) => {
        if (typeof field !== 'string' || calculation.outputs[field] === undefined) return;
        output[field] = calculation.outputs[field]?.[index] ?? null;
      });
    }
    for (const [role, field] of Object.entries(layer.mark.fields)) {
      const series = calculation.outputs[role];
      if (series !== undefined) output[field] = series[index] ?? null;
    }
    return output;
  });
  const step: TransformStepLineage = {
    index: transformed.lineage.transforms.length,
    type: 'calculate',
    inputRows: transformed.data.length,
    outputRows: data.length,
    parameters: {
      operation: 'technical-indicator',
      id: calculation.capability.id,
      kind: calculation.capability.kind,
      support: calculation.capability.support,
      warmUpPolicy: 'null',
      warmUpRows: calculation.warmUpRows,
      parameters: calculation.parameters,
      dependencyDag: calculation.capability.dependencyDag.map((node) => ({
        id: node.id,
        operation: node.operation,
        inputs: [...node.inputs],
        parameters: [...node.parameters],
      })),
      provenance: calculation.provenance,
    },
    detail: `${calculation.capability.id} uses a parameterized dependency DAG and null warm-up rows.`,
  };
  const lineage: DataLineage = {
    ...transformed.lineage,
    transforms: [...transformed.lineage.transforms, step],
    summary: `${transformed.lineage.summary} ${step.detail}`,
  };
  return {
    layer: {
      ...layer,
      mark: {
        ...layer.mark,
        fields: {
          ...layer.mark.fields,
          __indicatorSource: sourceField,
        },
      },
    },
    result: { data, lineage },
    calculation,
  };
}
