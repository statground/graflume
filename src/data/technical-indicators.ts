import { GraflumeError } from '../core/errors.js';
import type { DataLineage, TransformResult, TransformStepLineage } from './transforms.js';
import type { DataRow, JsonValue, NormalizedLayerSpec } from '../spec/types.js';
import {
  calculateOhlcvTechnicalIndicator,
  type IndicatorNumericSeries,
  type ResolvedTechnicalIndicatorInputs,
} from './technical-indicator-ohlcv.js';

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
export type TechnicalIndicatorInputName = 'value' | 'open' | 'high' | 'low' | 'close' | 'volume';
export type TechnicalIndicatorPlacement = 'overlay' | 'panel';

export interface IndicatorParameterCapability {
  readonly name:
    | 'period'
    | 'fastPeriod'
    | 'slowPeriod'
    | 'signalPeriod'
    | 'multiplier'
    | 'standardDeviations'
    | 'atrPeriod'
    | 'conversionPeriod'
    | 'basePeriod'
    | 'spanPeriod'
    | 'displacement'
    | 'smoothK'
    | 'smoothD'
    | 'envelopePercent'
    | 'acceleration'
    | 'maximumAcceleration'
    | 'deviation';
  readonly type: 'integer' | 'number';
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
  readonly requiredInputs: readonly TechnicalIndicatorInputName[];
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
  readonly session: TechnicalIndicatorSessionState;
  readonly presentation: TechnicalIndicatorPresentation;
}

export interface TechnicalIndicatorInputSeries {
  readonly value?: IndicatorNumericSeries;
  readonly open?: IndicatorNumericSeries;
  readonly high?: IndicatorNumericSeries;
  readonly low?: IndicatorNumericSeries;
  readonly close?: IndicatorNumericSeries;
  readonly volume?: IndicatorNumericSeries;
  readonly session?: readonly JsonValue[];
  readonly time?: readonly (number | string | Date | null)[];
}

export interface TechnicalIndicatorSessionSpec {
  readonly mode?: 'none' | 'field' | 'utc-day' | 'gap';
  readonly field?: string;
  readonly timeField?: string;
  readonly gapMs?: number;
  readonly reset?: 'hard' | 'carry';
}

export interface TechnicalIndicatorSessionState {
  readonly mode: 'none' | 'field' | 'utc-day' | 'gap';
  readonly reset: 'hard' | 'carry';
  readonly boundaries: readonly number[];
}

export interface TechnicalIndicatorPresentation {
  readonly placement: TechnicalIndicatorPlacement;
  readonly panelId: string;
  readonly synchronizedCrosshair: {
    readonly axis: 'x';
    readonly sharedDomain: true;
    readonly fields: readonly string[];
  };
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

function indicatorParameter(
  name: IndicatorParameterCapability['name'],
  defaultValue: number,
  minimum: number,
  maximum: number,
  type: IndicatorParameterCapability['type'] = 'integer',
): IndicatorParameterCapability {
  return { name, type, minimum, maximum, default: defaultValue };
}

const period14 = indicatorParameter('period', 14, 2, 200);
const period20 = indicatorParameter('period', 20, 2, 200);
const fast12 = indicatorParameter('fastPeriod', 12, 2, 200);
const slow26 = indicatorParameter('slowPeriod', 26, 2, 200);
const signal9 = indicatorParameter('signalPeriod', 9, 2, 200);

const legacyComputedKinds = new Set([
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

const computedKinds = new Set(definitions.map(({ kind }) => kind));

function capabilityParameters(kind: string): readonly IndicatorParameterCapability[] {
  switch (kind) {
    case 'abands':
      return [period20, indicatorParameter('multiplier', 4, 0, 20, 'number')];
    case 'ao':
      return [
        indicatorParameter('fastPeriod', 5, 2, 200),
        indicatorParameter('slowPeriod', 34, 2, 200),
      ];
    case 'apo':
    case 'ppo':
      return [fast12, slow26];
    case 'macd':
      return [fast12, slow26, signal9];
    case 'bb':
      return [period20, indicatorParameter('standardDeviations', 2, 0, 10, 'number')];
    case 'chaikin':
      return [
        indicatorParameter('fastPeriod', 3, 2, 200),
        indicatorParameter('slowPeriod', 10, 2, 200),
      ];
    case 'cmf':
      return [period20];
    case 'cci':
    case 'dpo':
    case 'pc':
      return [period20];
    case 'ikh':
      return [
        indicatorParameter('conversionPeriod', 9, 2, 200),
        indicatorParameter('basePeriod', 26, 2, 200),
        indicatorParameter('spanPeriod', 52, 2, 400),
        indicatorParameter('displacement', 26, 0, 200),
      ];
    case 'keltnerchannels':
      return [
        period20,
        indicatorParameter('atrPeriod', 10, 2, 200),
        indicatorParameter('multiplier', 2, 0, 20, 'number'),
      ];
    case 'klinger':
      return [
        indicatorParameter('fastPeriod', 34, 2, 200),
        indicatorParameter('slowPeriod', 55, 2, 200),
        indicatorParameter('signalPeriod', 13, 2, 200),
      ];
    case 'pivotpoints':
    case 'obv':
    case 'vwap':
      return [];
    case 'priceenvelopes':
      return [period20, indicatorParameter('envelopePercent', 2.5, 0, 100, 'number')];
    case 'psar':
      return [
        indicatorParameter('acceleration', 0.02, 0.001, 1, 'number'),
        indicatorParameter('maximumAcceleration', 0.2, 0.001, 1, 'number'),
      ];
    case 'slowstochastic':
      return [
        period14,
        indicatorParameter('smoothK', 3, 1, 200),
        indicatorParameter('smoothD', 3, 1, 200),
      ];
    case 'stochastic':
      return [period14, indicatorParameter('signalPeriod', 3, 1, 200)];
    case 'supertrend':
      return [
        indicatorParameter('atrPeriod', 10, 2, 200),
        indicatorParameter('multiplier', 3, 0, 20, 'number'),
      ];
    case 'zigzag':
      return [indicatorParameter('deviation', 5, 0.01, 100, 'number')];
    default:
      return computedKinds.has(kind) ? [period14] : [];
  }
}

function capabilityInputs(kind: string): readonly TechnicalIndicatorInputName[] {
  if (['abands', 'atr', 'cci', 'dmi', 'keltnerchannels', 'natr', 'supertrend'].includes(kind)) {
    return ['high', 'low', 'close'];
  }
  if (['ao', 'aroon', 'aroonoscillator', 'ikh', 'pc', 'psar'].includes(kind)) {
    return ['high', 'low'];
  }
  if (['chaikin', 'cmf', 'klinger', 'mfi', 'vwap'].includes(kind)) {
    return ['high', 'low', 'close', 'volume'];
  }
  if (kind === 'obv') return ['close', 'volume'];
  if (kind === 'pivotpoints') return ['high', 'low', 'close'];
  if (['slowstochastic', 'stochastic', 'williamsr'].includes(kind)) {
    return ['high', 'low', 'close'];
  }
  return ['value'];
}

function capabilityOutputs(kind: string): readonly string[] {
  if (kind === 'macd') return ['value', 'signal', 'histogram'];
  if (['abands', 'bb', 'keltnerchannels', 'pc', 'priceenvelopes'].includes(kind)) {
    return ['value', 'lower', 'upper'];
  }
  if (kind === 'aroon') return ['value', 'up', 'down'];
  if (kind === 'dmi') return ['value', 'plus', 'minus'];
  if (kind === 'ikh') return ['value', 'lower', 'upper', 'conversion', 'base'];
  if (['klinger', 'slowstochastic', 'stochastic'].includes(kind)) return ['value', 'signal'];
  if (kind === 'pivotpoints') return ['value', 'support', 'resistance'];
  if (kind === 'supertrend') return ['value', 'direction'];
  return ['value'];
}

function warmUpDescription(kind: string): string {
  if (kind === 'dema') return '2 * (period - 1)';
  if (kind === 'tema' || kind === 'trix') return '3 * (period - 1)';
  if (['apo', 'ppo', 'ao', 'chaikin'].includes(kind)) return 'slowPeriod - 1';
  if (kind === 'macd') return 'slowPeriod + signalPeriod - 2';
  if (kind === 'klinger') return 'slowPeriod + signalPeriod - 1';
  if (['momentum', 'roc', 'rsi', 'aroon', 'aroonoscillator', 'cmo', 'mfi'].includes(kind)) {
    return 'period';
  }
  if (kind === 'dmi') return '2 * period - 1';
  if (kind === 'ikh') return 'spanPeriod - 1 + displacement';
  if (kind === 'keltnerchannels') return 'max(period, atrPeriod) - 1';
  if (kind === 'slowstochastic') return 'period + smoothK + smoothD - 3';
  if (kind === 'stochastic') return 'period + signalPeriod - 2';
  if (kind === 'supertrend') return 'atrPeriod - 1';
  if (['obv', 'vwap'].includes(kind)) return '0';
  if (kind === 'pivotpoints') return '1 row, or one complete configured session';
  if (['psar', 'zigzag'].includes(kind)) return '1';
  return 'period - 1';
}

function dependencyDag(kind: string): readonly IndicatorDependencyNode[] {
  const inputs = capabilityInputs(kind).map((name): IndicatorDependencyNode => ({
    id: name === 'value' ? 'source' : name,
    operation: `input:${name}`,
    inputs: [],
    parameters: [],
  }));
  const input = inputs[0] ?? {
    id: 'source',
    operation: 'input:value',
    inputs: [],
    parameters: [],
  };
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
  const parameterNames = capabilityParameters(kind).map(({ name }) => name);
  const nodes = (
    ...entries: readonly IndicatorDependencyNode[]
  ): readonly IndicatorDependencyNode[] => [...inputs, ...entries];
  if (kind === 'abands') {
    return nodes(
      {
        id: 'raw-bands',
        operation: 'acceleration-envelope',
        inputs: ['high', 'low'],
        parameters: ['multiplier'],
      },
      { id: 'value', operation: 'sma', inputs: ['close'], parameters: ['period'] },
      { id: 'lower', operation: 'sma', inputs: ['raw-bands'], parameters: ['period'] },
      { id: 'upper', operation: 'sma', inputs: ['raw-bands'], parameters: ['period'] },
    );
  }
  if (kind === 'ao') {
    return nodes(
      { id: 'median', operation: 'median-price', inputs: ['high', 'low'], parameters: [] },
      { id: 'fast', operation: 'sma', inputs: ['median'], parameters: ['fastPeriod'] },
      { id: 'slow', operation: 'sma', inputs: ['median'], parameters: ['slowPeriod'] },
      { id: 'value', operation: 'difference', inputs: ['fast', 'slow'], parameters: [] },
    );
  }
  if (kind === 'aroon' || kind === 'aroonoscillator') {
    return nodes(
      {
        id: 'extrema-age',
        operation: 'rolling-extrema-age',
        inputs: ['high', 'low'],
        parameters: ['period'],
      },
      { id: 'up', operation: 'aroon-up', inputs: ['extrema-age'], parameters: ['period'] },
      { id: 'down', operation: 'aroon-down', inputs: ['extrema-age'], parameters: ['period'] },
      {
        id: 'value',
        operation: kind === 'aroon' ? 'alias-up' : 'difference',
        inputs: kind === 'aroon' ? ['up'] : ['up', 'down'],
        parameters: [],
      },
    );
  }
  if (kind === 'atr' || kind === 'natr') {
    return nodes(
      {
        id: 'true-range',
        operation: 'true-range',
        inputs: ['high', 'low', 'close'],
        parameters: [],
      },
      { id: 'atr', operation: 'wilder-average', inputs: ['true-range'], parameters: ['period'] },
      {
        id: 'value',
        operation: kind === 'natr' ? 'normalize-by-close-percent' : 'alias',
        inputs: kind === 'natr' ? ['atr', 'close'] : ['atr'],
        parameters: [],
      },
    );
  }
  if (kind === 'bb') {
    return nodes(
      { id: 'value', operation: 'sma', inputs: ['source'], parameters: ['period'] },
      {
        id: 'deviation',
        operation: 'population-standard-deviation',
        inputs: ['source', 'value'],
        parameters: ['period'],
      },
      {
        id: 'lower',
        operation: 'subtract-scaled',
        inputs: ['value', 'deviation'],
        parameters: ['standardDeviations'],
      },
      {
        id: 'upper',
        operation: 'add-scaled',
        inputs: ['value', 'deviation'],
        parameters: ['standardDeviations'],
      },
    );
  }
  if (kind === 'cci') {
    return nodes(
      {
        id: 'typical',
        operation: 'typical-price',
        inputs: ['high', 'low', 'close'],
        parameters: [],
      },
      { id: 'average', operation: 'sma', inputs: ['typical'], parameters: ['period'] },
      {
        id: 'deviation',
        operation: 'mean-absolute-deviation',
        inputs: ['typical', 'average'],
        parameters: ['period'],
      },
      {
        id: 'value',
        operation: 'commodity-channel-index',
        inputs: ['typical', 'average', 'deviation'],
        parameters: [],
      },
    );
  }
  if (kind === 'chaikin' || kind === 'cmf') {
    return nodes(
      {
        id: 'money-flow',
        operation: 'money-flow-volume',
        inputs: ['high', 'low', 'close', 'volume'],
        parameters: [],
      },
      ...(kind === 'chaikin'
        ? [
            { id: 'adl', operation: 'cumulative-sum', inputs: ['money-flow'], parameters: [] },
            { id: 'fast', operation: 'ema', inputs: ['adl'], parameters: ['fastPeriod'] },
            { id: 'slow', operation: 'ema', inputs: ['adl'], parameters: ['slowPeriod'] },
            { id: 'value', operation: 'difference', inputs: ['fast', 'slow'], parameters: [] },
          ]
        : [
            {
              id: 'flow-sum',
              operation: 'rolling-sum',
              inputs: ['money-flow'],
              parameters: ['period'],
            },
            {
              id: 'volume-sum',
              operation: 'rolling-sum',
              inputs: ['volume'],
              parameters: ['period'],
            },
            { id: 'value', operation: 'ratio', inputs: ['flow-sum', 'volume-sum'], parameters: [] },
          ]),
    );
  }
  if (kind === 'cmo') {
    return nodes(
      { id: 'changes', operation: 'signed-change', inputs: ['source'], parameters: [] },
      {
        id: 'gain-loss-sums',
        operation: 'rolling-gain-loss',
        inputs: ['changes'],
        parameters: ['period'],
      },
      {
        id: 'value',
        operation: 'chande-ratio-percent',
        inputs: ['gain-loss-sums'],
        parameters: [],
      },
    );
  }
  if (kind === 'dmi') {
    return nodes(
      {
        id: 'true-range',
        operation: 'true-range',
        inputs: ['high', 'low', 'close'],
        parameters: [],
      },
      {
        id: 'movement',
        operation: 'directional-movement',
        inputs: ['high', 'low'],
        parameters: [],
      },
      {
        id: 'plus-minus',
        operation: 'wilder-directional-index',
        inputs: ['true-range', 'movement'],
        parameters: ['period'],
      },
      {
        id: 'plus',
        operation: 'positive-directional-index',
        inputs: ['plus-minus'],
        parameters: [],
      },
      {
        id: 'minus',
        operation: 'negative-directional-index',
        inputs: ['plus-minus'],
        parameters: [],
      },
      { id: 'value', operation: 'wilder-adx', inputs: ['plus', 'minus'], parameters: ['period'] },
    );
  }
  if (kind === 'dpo') {
    return nodes(
      { id: 'average', operation: 'sma', inputs: ['source'], parameters: ['period'] },
      {
        id: 'value',
        operation: 'detrended-shift-difference',
        inputs: ['source', 'average'],
        parameters: ['period'],
      },
    );
  }
  if (kind === 'ikh') {
    return nodes(
      {
        id: 'conversion',
        operation: 'midprice',
        inputs: ['high', 'low'],
        parameters: ['conversionPeriod'],
      },
      { id: 'base', operation: 'midprice', inputs: ['high', 'low'], parameters: ['basePeriod'] },
      { id: 'span-a', operation: 'average', inputs: ['conversion', 'base'], parameters: [] },
      { id: 'span-b', operation: 'midprice', inputs: ['high', 'low'], parameters: ['spanPeriod'] },
      {
        id: 'value',
        operation: 'forward-displacement',
        inputs: ['span-a'],
        parameters: ['displacement'],
      },
      {
        id: 'lower',
        operation: 'minimum',
        inputs: ['span-a', 'span-b'],
        parameters: ['displacement'],
      },
      {
        id: 'upper',
        operation: 'maximum',
        inputs: ['span-a', 'span-b'],
        parameters: ['displacement'],
      },
    );
  }
  if (kind === 'keltnerchannels') {
    return nodes(
      { id: 'value', operation: 'ema', inputs: ['close'], parameters: ['period'] },
      {
        id: 'true-range',
        operation: 'true-range',
        inputs: ['high', 'low', 'close'],
        parameters: [],
      },
      { id: 'atr', operation: 'wilder-average', inputs: ['true-range'], parameters: ['atrPeriod'] },
      {
        id: 'lower',
        operation: 'subtract-scaled',
        inputs: ['value', 'atr'],
        parameters: ['multiplier'],
      },
      {
        id: 'upper',
        operation: 'add-scaled',
        inputs: ['value', 'atr'],
        parameters: ['multiplier'],
      },
    );
  }
  if (kind === 'klinger') {
    return nodes(
      {
        id: 'force',
        operation: 'klinger-volume-force',
        inputs: ['high', 'low', 'close', 'volume'],
        parameters: [],
      },
      { id: 'fast', operation: 'ema', inputs: ['force'], parameters: ['fastPeriod'] },
      { id: 'slow', operation: 'ema', inputs: ['force'], parameters: ['slowPeriod'] },
      { id: 'value', operation: 'difference', inputs: ['fast', 'slow'], parameters: [] },
      { id: 'signal', operation: 'ema', inputs: ['value'], parameters: ['signalPeriod'] },
    );
  }
  if (kind === 'mfi') {
    return nodes(
      {
        id: 'typical',
        operation: 'typical-price',
        inputs: ['high', 'low', 'close'],
        parameters: [],
      },
      { id: 'raw-flow', operation: 'multiply', inputs: ['typical', 'volume'], parameters: [] },
      {
        id: 'signed-flow',
        operation: 'price-direction-split',
        inputs: ['typical', 'raw-flow'],
        parameters: [],
      },
      {
        id: 'value',
        operation: 'rolling-money-flow-index',
        inputs: ['signed-flow'],
        parameters: ['period'],
      },
    );
  }
  if (kind === 'obv') {
    return nodes({
      id: 'value',
      operation: 'on-balance-volume',
      inputs: ['close', 'volume'],
      parameters: [],
    });
  }
  if (kind === 'pc') {
    return nodes(
      { id: 'upper', operation: 'rolling-maximum', inputs: ['high'], parameters: ['period'] },
      { id: 'lower', operation: 'rolling-minimum', inputs: ['low'], parameters: ['period'] },
      { id: 'value', operation: 'midpoint', inputs: ['upper', 'lower'], parameters: [] },
    );
  }
  if (kind === 'pivotpoints') {
    return nodes(
      {
        id: 'previous-session',
        operation: 'previous-session-hlc',
        inputs: ['high', 'low', 'close'],
        parameters: [],
      },
      { id: 'value', operation: 'classic-pivot', inputs: ['previous-session'], parameters: [] },
      {
        id: 'support',
        operation: 'classic-support-1',
        inputs: ['value', 'previous-session'],
        parameters: [],
      },
      {
        id: 'resistance',
        operation: 'classic-resistance-1',
        inputs: ['value', 'previous-session'],
        parameters: [],
      },
    );
  }
  if (kind === 'priceenvelopes') {
    return nodes(
      { id: 'value', operation: 'sma', inputs: ['source'], parameters: ['period'] },
      {
        id: 'lower',
        operation: 'percent-envelope-lower',
        inputs: ['value'],
        parameters: ['envelopePercent'],
      },
      {
        id: 'upper',
        operation: 'percent-envelope-upper',
        inputs: ['value'],
        parameters: ['envelopePercent'],
      },
    );
  }
  if (kind === 'psar') {
    return nodes({
      id: 'value',
      operation: 'parabolic-sar-state-machine',
      inputs: ['high', 'low'],
      parameters: ['acceleration', 'maximumAcceleration'],
    });
  }
  if (kind === 'stochastic' || kind === 'slowstochastic') {
    return nodes(
      {
        id: 'fast-k',
        operation: 'rolling-range-position',
        inputs: ['high', 'low', 'close'],
        parameters: ['period'],
      },
      ...(kind === 'slowstochastic'
        ? [
            { id: 'value', operation: 'sma', inputs: ['fast-k'], parameters: ['smoothK'] },
            { id: 'signal', operation: 'sma', inputs: ['value'], parameters: ['smoothD'] },
          ]
        : [
            { id: 'value', operation: 'alias', inputs: ['fast-k'], parameters: [] },
            { id: 'signal', operation: 'sma', inputs: ['value'], parameters: ['signalPeriod'] },
          ]),
    );
  }
  if (kind === 'supertrend') {
    return nodes(
      {
        id: 'true-range',
        operation: 'true-range',
        inputs: ['high', 'low', 'close'],
        parameters: [],
      },
      { id: 'atr', operation: 'wilder-average', inputs: ['true-range'], parameters: ['atrPeriod'] },
      {
        id: 'bands',
        operation: 'recursive-final-bands',
        inputs: ['high', 'low', 'close', 'atr'],
        parameters: ['multiplier'],
      },
      {
        id: 'state',
        operation: 'supertrend-state-machine',
        inputs: ['close', 'bands'],
        parameters: [],
      },
      { id: 'value', operation: 'supertrend-line', inputs: ['state'], parameters: [] },
      { id: 'direction', operation: 'supertrend-direction', inputs: ['state'], parameters: [] },
    );
  }
  if (kind === 'vwap') {
    return nodes(
      {
        id: 'typical',
        operation: 'typical-price',
        inputs: ['high', 'low', 'close'],
        parameters: [],
      },
      {
        id: 'value',
        operation: 'cumulative-volume-weighted-average',
        inputs: ['typical', 'volume'],
        parameters: [],
      },
    );
  }
  if (kind === 'williamsr') {
    return nodes(
      {
        id: 'range',
        operation: 'rolling-high-low',
        inputs: ['high', 'low'],
        parameters: ['period'],
      },
      {
        id: 'value',
        operation: 'williams-percent-range',
        inputs: ['range', 'close'],
        parameters: [],
      },
    );
  }
  if (kind === 'zigzag') {
    return nodes({
      id: 'value',
      operation: 'confirmed-threshold-pivots',
      inputs: ['source'],
      parameters: ['deviation'],
    });
  }
  return [
    ...inputs,
    {
      id: 'value',
      operation: kind,
      inputs: ['source'],
      parameters: parameterNames,
    },
  ];
}

function computedProvenance(kind: string): string {
  const descriptions: Readonly<Record<string, string>> = {
    abands:
      'Acceleration bands smooth high/low envelopes expanded by relative intrabar range; the middle line is the close SMA.',
    ao: 'Awesome oscillator = fast SMA(median price) - slow SMA(median price).',
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
    aroon:
      'Aroon up/down measure the age of the most recent high and low over period + 1 observations.',
    aroonoscillator: 'Aroon oscillator = Aroon up - Aroon down.',
    atr: 'Average true range uses Wilder smoothing of max(high-low, abs(high-prevClose), abs(low-prevClose)).',
    bb: 'Volatility bands are a rolling mean plus/minus a configurable population standard deviation multiple.',
    cci: 'CCI = (typical price - its SMA) / (0.015 * mean absolute deviation).',
    chaikin: 'Chaikin oscillator = fast EMA(ADL) - slow EMA(ADL), using money-flow volume.',
    cmf: 'Chaikin money flow = rolling money-flow volume / rolling volume.',
    cmo: 'CMO = 100 * (rolling gains - rolling losses) / (rolling gains + rolling losses).',
    dmi: 'Directional movement exposes +DI, -DI, and Wilder-smoothed ADX derived from true range.',
    dpo: 'DPO subtracts the current period SMA from the source shifted back floor(period / 2) + 1 rows.',
    ikh: 'Ichimoku derives conversion/base midprices and forward-displaced span A/B cloud bounds.',
    keltnerchannels:
      'Keltner channels use an EMA center and Wilder ATR multiplied above and below it.',
    klinger:
      'Klinger oscillator is the fast/slow EMA difference of trend-sensitive volume force plus a signal EMA.',
    mfi: 'Money flow index applies an RSI-style ratio to signed typical-price volume flows.',
    natr: 'Normalized ATR = 100 * Wilder ATR / close.',
    obv: 'On-balance volume cumulatively adds or subtracts volume according to close direction.',
    pc: 'Price channel uses rolling high/low extrema and their midpoint.',
    pivotpoints:
      'Classic pivot, support 1, and resistance 1 derive from the previous row or previous configured session HLC.',
    priceenvelopes: 'Price envelopes are a rolling mean shifted by a configurable percentage.',
    psar: 'Parabolic SAR is a bounded acceleration-factor trend state machine over high and low.',
    slowstochastic: 'Slow stochastic smooths range-position %K and then smooths its %D signal.',
    stochastic: 'Stochastic uses close position in the rolling high-low range and a signal SMA.',
    supertrend:
      'Supertrend uses recursive ATR bands and close crossings to maintain trend direction.',
    vwap: 'VWAP is cumulative typical-price times volume divided by cumulative volume within calculation state.',
    williamsr: 'Williams %R = close position in the rolling high-low range minus 100.',
    zigzag: 'Zigzag retains confirmed extrema after a configurable percentage reversal threshold.',
  };
  return descriptions[kind] ?? 'Deterministic Graflume built-in calculation.';
}

export const technicalIndicatorCapabilities: readonly TechnicalIndicatorCapability[] =
  definitions.map((definition) => {
    return {
      ...definition,
      support: 'computed',
      requiredInputs: capabilityInputs(definition.kind),
      outputs: capabilityOutputs(definition.kind),
      parameters: capabilityParameters(definition.kind),
      dependencyDag: dependencyDag(definition.kind),
      warmUp: {
        policy: 'null',
        rows: warmUpDescription(definition.kind),
      },
      provenance: computedProvenance(definition.kind),
    };
  });

const capabilityByIdentifier = new Map<string, TechnicalIndicatorCapability>();
technicalIndicatorCapabilities.forEach((capability) => {
  for (const identifier of [capability.id, capability.kind, capability.quickApi]) {
    capabilityByIdentifier.set(identifier.toLowerCase(), capability);
  }
});

const indicatorParameterNames = new Set(
  technicalIndicatorCapabilities.flatMap(({ parameters }) => parameters.map(({ name }) => name)),
);

export function resolveTechnicalIndicatorCapability(
  identifier: string,
): TechnicalIndicatorCapability | null {
  return capabilityByIdentifier.get(identifier.trim().toLowerCase()) ?? null;
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

function calculateLegacyTechnicalIndicator(
  capability: TechnicalIndicatorCapability,
  values: readonly (number | null)[],
  parameters: Readonly<Record<string, number>>,
): Omit<
  TechnicalIndicatorCalculation,
  'capability' | 'parameters' | 'provenance' | 'session' | 'presentation'
> {
  const period = parameters.period ?? 14;
  const fastPeriod = parameters.fastPeriod ?? 12;
  const slowPeriod = parameters.slowPeriod ?? 26;
  const signalPeriod = parameters.signalPeriod ?? 9;
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
  return { outputs, warmUpRows: warmUpRows(capability.kind, period, slowPeriod, signalPeriod) };
}

const overlayIndicatorKinds = new Set([
  'abands',
  'bb',
  'dema',
  'ema',
  'ikh',
  'keltnerchannels',
  'linearregression',
  'pc',
  'pivotpoints',
  'priceenvelopes',
  'psar',
  'sma',
  'supertrend',
  'tema',
  'vwap',
  'wma',
  'zigzag',
]);

export function resolveTechnicalIndicatorPresentation(
  identifier: string,
): TechnicalIndicatorPresentation | null {
  const capability = resolveTechnicalIndicatorCapability(identifier);
  if (capability === null) return null;
  const placement: TechnicalIndicatorPlacement = overlayIndicatorKinds.has(capability.kind)
    ? 'overlay'
    : 'panel';
  return {
    placement,
    panelId: placement === 'overlay' ? 'price' : `indicator:${capability.id}`,
    synchronizedCrosshair: {
      axis: 'x',
      sharedDomain: true,
      fields: capability.outputs,
    },
  };
}

function jsonRecord(value: JsonValue | undefined): Readonly<Record<string, JsonValue>> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Readonly<Record<string, JsonValue>>)
    : null;
}

function resolveIndicatorParameters(
  capability: TechnicalIndicatorCapability,
  options: Readonly<Record<string, JsonValue>>,
): Readonly<Record<string, number>> {
  const parameters: Record<string, number> = {};
  const accepted = new Set(capability.parameters.map(({ name }) => name));
  for (const name of indicatorParameterNames) {
    if (options[name] !== undefined && !accepted.has(name)) {
      throw new GraflumeError('INVALID_SPEC', `${name} is not a parameter of ${capability.id}.`, {
        path: `$.mark.options.${name}`,
      });
    }
  }
  capability.parameters.forEach((parameterCapability) => {
    const supplied = options[parameterCapability.name];
    const value = supplied === undefined ? parameterCapability.default : supplied;
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      (parameterCapability.type === 'integer' && !Number.isInteger(value)) ||
      value < parameterCapability.minimum ||
      value > parameterCapability.maximum
    ) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `${parameterCapability.name} for ${capability.id} must be a ${parameterCapability.type} between ${parameterCapability.minimum} and ${parameterCapability.maximum}.`,
        { path: `$.mark.options.${parameterCapability.name}` },
      );
    }
    parameters[parameterCapability.name] = value;
  });
  const fast = parameters.fastPeriod;
  const slow = parameters.slowPeriod;
  if (fast !== undefined && slow !== undefined && fast >= slow) {
    throw new GraflumeError('INVALID_SPEC', 'fastPeriod must be smaller than slowPeriod.', {
      path: '$.mark.options.fastPeriod',
    });
  }
  const conversion = parameters.conversionPeriod;
  const base = parameters.basePeriod;
  const span = parameters.spanPeriod;
  if (
    conversion !== undefined &&
    base !== undefined &&
    span !== undefined &&
    (conversion > base || base > span)
  ) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'Ichimoku periods must satisfy conversionPeriod <= basePeriod <= spanPeriod.',
      { path: '$.mark.options.conversionPeriod' },
    );
  }
  if (
    parameters.acceleration !== undefined &&
    parameters.maximumAcceleration !== undefined &&
    parameters.acceleration > parameters.maximumAcceleration
  ) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'acceleration must be no greater than maximumAcceleration.',
      { path: '$.mark.options.acceleration' },
    );
  }
  return parameters;
}

function resolveSessionSpec(
  options: Readonly<Record<string, JsonValue>>,
): Required<Pick<TechnicalIndicatorSessionSpec, 'mode' | 'reset'>> &
  Pick<TechnicalIndicatorSessionSpec, 'field' | 'timeField' | 'gapMs'> {
  const supplied = options.session;
  if (supplied === undefined) return { mode: 'none', reset: 'carry' };
  const session = jsonRecord(supplied);
  if (session === null) {
    throw new GraflumeError('INVALID_SPEC', 'session must be an object.', {
      path: '$.mark.options.session',
    });
  }
  const allowed = new Set(['mode', 'field', 'timeField', 'gapMs', 'reset']);
  const unknown = Object.keys(session).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    throw new GraflumeError('INVALID_SPEC', `Unknown indicator session property "${unknown}".`, {
      path: `$.mark.options.session.${unknown}`,
    });
  }
  const mode = session.mode ?? 'none';
  if (!['none', 'field', 'utc-day', 'gap'].includes(String(mode))) {
    throw new GraflumeError('INVALID_SPEC', 'session.mode must be none, field, utc-day, or gap.', {
      path: '$.mark.options.session.mode',
    });
  }
  const reset = session.reset ?? (mode === 'none' ? 'carry' : 'hard');
  if (reset !== 'hard' && reset !== 'carry') {
    throw new GraflumeError('INVALID_SPEC', 'session.reset must be hard or carry.', {
      path: '$.mark.options.session.reset',
    });
  }
  const field = session.field;
  const timeField = session.timeField;
  const gapMs = session.gapMs;
  if (field !== undefined && typeof field !== 'string') {
    throw new GraflumeError('INVALID_SPEC', 'session.field must be a field name.', {
      path: '$.mark.options.session.field',
    });
  }
  if (field === '__proto__' || field === 'prototype' || field === 'constructor') {
    throw new GraflumeError('INVALID_SPEC', 'session.field is unsafe.', {
      path: '$.mark.options.session.field',
    });
  }
  if (timeField !== undefined && typeof timeField !== 'string') {
    throw new GraflumeError('INVALID_SPEC', 'session.timeField must be a field name.', {
      path: '$.mark.options.session.timeField',
    });
  }
  if (timeField === '__proto__' || timeField === 'prototype' || timeField === 'constructor') {
    throw new GraflumeError('INVALID_SPEC', 'session.timeField is unsafe.', {
      path: '$.mark.options.session.timeField',
    });
  }
  if (mode === 'gap' && (typeof gapMs !== 'number' || !Number.isFinite(gapMs) || gapMs <= 0)) {
    throw new GraflumeError(
      'INVALID_SPEC',
      'session.gapMs must be a positive number in gap mode.',
      {
        path: '$.mark.options.session.gapMs',
      },
    );
  }
  return {
    mode: mode as TechnicalIndicatorSessionState['mode'],
    reset,
    ...(typeof field === 'string' ? { field } : {}),
    ...(typeof timeField === 'string' ? { timeField } : {}),
    ...(typeof gapMs === 'number' ? { gapMs } : {}),
  };
}

function timestamp(value: number | string | Date | null | undefined, index: number): number {
  const resolved =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : Date.parse(value ?? '');
  if (!Number.isFinite(resolved)) {
    throw new GraflumeError('INVALID_SPEC', `Invalid session timestamp at row ${index}.`, {
      path: '$.mark.options.session.timeField',
    });
  }
  return resolved;
}

function sameSessionValue(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  if (Object.is(left, right)) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveSessionState(
  spec: ReturnType<typeof resolveSessionSpec>,
  input: TechnicalIndicatorInputSeries,
  length: number,
): TechnicalIndicatorSessionState {
  if (spec.mode === 'none' || length === 0) {
    return { mode: spec.mode, reset: spec.reset, boundaries: [] };
  }
  const boundaries = [0];
  if (spec.mode === 'field') {
    if (input.session === undefined || input.session.length !== length) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'field session mode requires one session value per input row.',
        { path: '$.mark.options.session.field' },
      );
    }
    for (let index = 1; index < length; index += 1) {
      if (!sameSessionValue(input.session[index - 1], input.session[index])) boundaries.push(index);
    }
  } else {
    if (input.time === undefined || input.time.length !== length) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `${spec.mode} session mode requires one timestamp per input row.`,
        { path: '$.mark.options.session.timeField' },
      );
    }
    let previous = timestamp(input.time[0], 0);
    for (let index = 1; index < length; index += 1) {
      const current = timestamp(input.time[index], index);
      if (current < previous) {
        throw new GraflumeError(
          'INVALID_SPEC',
          'Session timestamps must be ordered from earliest to latest.',
          { path: '$.mark.options.session.timeField' },
        );
      }
      const changed =
        spec.mode === 'utc-day'
          ? Math.floor(current / 86_400_000) !== Math.floor(previous / 86_400_000)
          : current - previous > spec.gapMs!;
      if (changed) boundaries.push(index);
      previous = current;
    }
  }
  return { mode: spec.mode, reset: spec.reset, boundaries };
}

function normalizeIndicatorInputs(
  capability: TechnicalIndicatorCapability,
  supplied: IndicatorNumericSeries | TechnicalIndicatorInputSeries,
): {
  readonly inputs: ResolvedTechnicalIndicatorInputs;
  readonly raw: TechnicalIndicatorInputSeries;
  readonly length: number;
} {
  const original: TechnicalIndicatorInputSeries = Array.isArray(supplied)
    ? { value: supplied as IndicatorNumericSeries }
    : (supplied as TechnicalIndicatorInputSeries);
  const clean = (series: IndicatorNumericSeries | undefined): IndicatorNumericSeries | undefined =>
    series?.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
  const cleanedValue = clean(original.value);
  const cleanedOpen = clean(original.open);
  const cleanedHigh = clean(original.high);
  const cleanedLow = clean(original.low);
  const cleanedClose = clean(original.close);
  const cleanedVolume = clean(original.volume);
  const raw: TechnicalIndicatorInputSeries = {
    ...(cleanedValue === undefined ? {} : { value: cleanedValue }),
    ...(cleanedOpen === undefined ? {} : { open: cleanedOpen }),
    ...(cleanedHigh === undefined ? {} : { high: cleanedHigh }),
    ...(cleanedLow === undefined ? {} : { low: cleanedLow }),
    ...(cleanedClose === undefined ? {} : { close: cleanedClose }),
    ...(cleanedVolume === undefined ? {} : { volume: cleanedVolume }),
    ...(original.session === undefined ? {} : { session: original.session }),
    ...(original.time === undefined ? {} : { time: original.time }),
  };
  const allSeries = [raw.value, raw.open, raw.high, raw.low, raw.close, raw.volume].filter(
    (series): series is IndicatorNumericSeries => series !== undefined,
  );
  const length = allSeries[0]?.length ?? raw.session?.length ?? raw.time?.length ?? 0;
  allSeries.forEach((series) => {
    if (series.length !== length) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Technical indicator input series must have equal lengths.',
        {
          path: '$.mark.fields',
        },
      );
    }
  });
  capability.requiredInputs.forEach((role) => {
    if (raw[role as TechnicalIndicatorInputName] === undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `${capability.id} requires the ${role} input series.`,
        {
          path: `$.mark.fields.${role}`,
        },
      );
    }
  });
  const blank = (): Array<number | null> => Array.from<number | null>({ length }).fill(null);
  const value = raw.value ?? raw.close ?? blank();
  return {
    raw,
    length,
    inputs: {
      value,
      open: raw.open ?? blank(),
      high: raw.high ?? blank(),
      low: raw.low ?? blank(),
      close: raw.close ?? raw.value ?? blank(),
      volume: raw.volume ?? blank(),
    },
  };
}

function sliceInputs(
  inputs: ResolvedTechnicalIndicatorInputs,
  start: number,
  end: number,
): ResolvedTechnicalIndicatorInputs {
  return {
    value: inputs.value.slice(start, end),
    open: inputs.open.slice(start, end),
    high: inputs.high.slice(start, end),
    low: inputs.low.slice(start, end),
    close: inputs.close.slice(start, end),
    volume: inputs.volume.slice(start, end),
  };
}

function calculateIndicatorCore(
  capability: TechnicalIndicatorCapability,
  inputs: ResolvedTechnicalIndicatorInputs,
  parameters: Readonly<Record<string, number>>,
): {
  readonly outputs: Readonly<Record<string, IndicatorNumericSeries>>;
  readonly warmUpRows: number;
} {
  return legacyComputedKinds.has(capability.kind)
    ? calculateLegacyTechnicalIndicator(capability, inputs.value, parameters)
    : calculateOhlcvTechnicalIndicator(capability.kind, inputs, parameters);
}

function calculateSessionPivotPoints(
  inputs: ResolvedTechnicalIndicatorInputs,
  boundaries: readonly number[],
): Readonly<Record<string, IndicatorNumericSeries>> {
  const value = Array.from<number | null>({ length: inputs.close.length }).fill(null);
  const support = [...value];
  const resistance = [...value];
  for (let sessionIndex = 1; sessionIndex < boundaries.length; sessionIndex += 1) {
    const previousStart = boundaries[sessionIndex - 1]!;
    const currentStart = boundaries[sessionIndex]!;
    const currentEnd = boundaries[sessionIndex + 1] ?? inputs.close.length;
    const highs = inputs.high
      .slice(previousStart, currentStart)
      .filter((item): item is number => item !== null);
    const lows = inputs.low
      .slice(previousStart, currentStart)
      .filter((item): item is number => item !== null);
    const previousClose = inputs.close[currentStart - 1];
    if (
      highs.length === 0 ||
      lows.length === 0 ||
      previousClose === null ||
      previousClose === undefined
    )
      continue;
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const pivot = (high + low + previousClose) / 3;
    for (let index = currentStart; index < currentEnd; index += 1) {
      value[index] = pivot;
      support[index] = 2 * pivot - high;
      resistance[index] = 2 * pivot - low;
    }
  }
  return { value, support, resistance };
}

export function calculateTechnicalIndicator(
  identifier: string,
  supplied: IndicatorNumericSeries | TechnicalIndicatorInputSeries,
  options: Readonly<Record<string, JsonValue>> = {},
): TechnicalIndicatorCalculation {
  const capability = resolveTechnicalIndicatorCapability(identifier);
  if (capability === null) {
    throw new GraflumeError('INVALID_SPEC', `Unknown technical indicator "${identifier}".`, {
      path: '$.mark.options.kind',
    });
  }
  const parameters = resolveIndicatorParameters(capability, options);
  const { inputs, raw, length } = normalizeIndicatorInputs(capability, supplied);
  const sessionSpec = resolveSessionSpec(options);
  const session = resolveSessionState(sessionSpec, raw, length);
  let calculated = calculateIndicatorCore(capability, inputs, parameters);
  if (capability.kind === 'pivotpoints' && session.boundaries.length > 0) {
    calculated = {
      outputs: calculateSessionPivotPoints(inputs, session.boundaries),
      warmUpRows: session.boundaries[1] ?? length,
    };
  } else if (session.reset === 'hard' && session.boundaries.length > 0) {
    const output: Record<string, Array<number | null>> = Object.fromEntries(
      capability.outputs.map((role) => [role, Array.from<number | null>({ length }).fill(null)]),
    );
    session.boundaries.forEach((start, boundaryIndex) => {
      const end = session.boundaries[boundaryIndex + 1] ?? length;
      const segment = calculateIndicatorCore(
        capability,
        sliceInputs(inputs, start, end),
        parameters,
      );
      Object.entries(segment.outputs).forEach(([role, values]) => {
        const target =
          output[role] ?? (output[role] = Array.from<number | null>({ length }).fill(null));
        values.forEach((value, index) => {
          target[start + index] = value;
        });
      });
    });
    calculated = { outputs: output, warmUpRows: calculated.warmUpRows };
  }
  return {
    capability,
    outputs: calculated.outputs,
    warmUpRows: calculated.warmUpRows,
    parameters,
    provenance: capability.provenance,
    session,
    presentation: resolveTechnicalIndicatorPresentation(identifier)!,
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

function numericFieldSeries(data: readonly DataRow[], field: string): Array<number | null> {
  return data.map((row) => {
    const value = row[field];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });
}

function indicatorInputFields(
  layer: NormalizedLayerSpec,
  capability: TechnicalIndicatorCapability,
): Readonly<Partial<Record<TechnicalIndicatorInputName, string>>> {
  const fields: Partial<Record<TechnicalIndicatorInputName, string>> = {
    value: layer.y.field,
    close: layer.mark.fields.close ?? layer.y.field,
  };
  for (const role of ['open', 'high', 'low', 'volume'] as const) {
    const field = layer.mark.fields[role];
    if (field !== undefined) fields[role] = field;
  }
  capability.requiredInputs.forEach((role) => {
    if (fields[role as TechnicalIndicatorInputName] === undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `${capability.id} requires an encoding or mark.fields mapping for ${role}.`,
        { path: `$.mark.fields.${role}` },
      );
    }
  });
  return fields;
}

function sessionFieldValues(data: readonly DataRow[], field: string): readonly JsonValue[] {
  return data.map((row) => {
    const value = row[field];
    if (value instanceof Date) return value.toISOString();
    if (value === undefined) return null;
    return value as JsonValue;
  });
}

function sessionTimeValues(
  data: readonly DataRow[],
  field: string,
): readonly (number | string | Date | null)[] {
  return data.map((row) => {
    const value = row[field];
    return typeof value === 'number' || typeof value === 'string' || value instanceof Date
      ? value
      : null;
  });
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
  const capability = resolveTechnicalIndicatorCapability(kind);
  if (capability === null) {
    throw new GraflumeError('INVALID_SPEC', `Unknown technical indicator "${kind}".`, {
      path: '$.mark.options.kind',
    });
  }
  const sourceField = indicatorSourceField(layer);
  const inputFields = indicatorInputFields(layer, capability);
  const inputs: {
    value?: IndicatorNumericSeries;
    open?: IndicatorNumericSeries;
    high?: IndicatorNumericSeries;
    low?: IndicatorNumericSeries;
    close?: IndicatorNumericSeries;
    volume?: IndicatorNumericSeries;
    session?: readonly JsonValue[];
    time?: readonly (number | string | Date | null)[];
  } = {};
  Object.entries(inputFields).forEach(([role, field]) => {
    inputs[role as TechnicalIndicatorInputName] = numericFieldSeries(transformed.data, field);
  });
  const sessionSpec = resolveSessionSpec(layer.mark.options);
  if (sessionSpec.mode === 'field') {
    if (sessionSpec.field === undefined) {
      throw new GraflumeError('INVALID_SPEC', 'field session mode requires session.field.', {
        path: '$.mark.options.session.field',
      });
    }
    inputs.session = sessionFieldValues(transformed.data, sessionSpec.field);
  }
  if (sessionSpec.mode === 'utc-day' || sessionSpec.mode === 'gap') {
    const timeField = sessionSpec.timeField ?? layer.x.field;
    inputs.time = sessionTimeValues(transformed.data, timeField);
  }
  const calculation = calculateTechnicalIndicator(kind, inputs, layer.mark.options);
  const data = transformed.data.map((row, index) => {
    const output: Record<string, DataRow[string]> = {
      ...row,
      [sourceField]: row[layer.y.field],
      [layer.y.field]: calculation.outputs.value?.[index] ?? null,
    };
    Object.entries(calculation.outputs).forEach(([role, series]) => {
      const field = role === 'value' ? layer.y.field : (layer.mark.fields[role] ?? role);
      output[field] = series[index] ?? null;
    });
    const fields = layer.mark.options.fields;
    if (Array.isArray(fields)) {
      fields.forEach((field) => {
        if (typeof field !== 'string' || calculation.outputs[field] === undefined) return;
        output[field] = calculation.outputs[field]?.[index] ?? null;
      });
    }
    for (const [role, field] of Object.entries(layer.mark.fields)) {
      const series = calculation.outputs[role === 'middle' ? 'value' : role];
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
      requiredInputs: calculation.capability.requiredInputs.map((role) => ({
        role,
        field: inputFields[role as TechnicalIndicatorInputName]!,
      })),
      outputFields: calculation.capability.outputs.map((role) => ({
        role,
        field: role === 'value' ? layer.y.field : (layer.mark.fields[role] ?? role),
      })),
      session: {
        mode: calculation.session.mode,
        reset: calculation.session.reset,
        boundaries: [...calculation.session.boundaries],
      },
      presentation: {
        placement: calculation.presentation.placement,
        panelId: calculation.presentation.panelId,
        synchronizedCrosshair: {
          axis: calculation.presentation.synchronizedCrosshair.axis,
          sharedDomain: calculation.presentation.synchronizedCrosshair.sharedDomain,
          fields: calculation.presentation.synchronizedCrosshair.fields.map((role) =>
            role === 'value' ? layer.y.field : (layer.mark.fields[role] ?? role),
          ),
        },
      },
      dependencyDag: calculation.capability.dependencyDag.map((node) => ({
        id: node.id,
        operation: node.operation,
        inputs: [...node.inputs],
        parameters: [...node.parameters],
      })),
      provenance: calculation.provenance,
    },
    detail: `${calculation.capability.id} uses a parameterized dependency DAG, ${calculation.session.reset} session state, null warm-up rows, and ${calculation.presentation.placement} presentation.`,
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
