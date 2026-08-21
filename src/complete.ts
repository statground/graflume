import {
  quickChart,
  quickCombo,
  type QuickChartOptions,
  type QuickComboOptions,
} from './api/quick.js';
import {
  additionalChartTypeCatalog,
  additionalChartVariantCatalog,
} from './catalog/additional-chart-types.js';
import { chartTypeCatalog, chartVariantCatalog } from './catalog/chart-types.js';
import {
  resolveSeriesType,
  seriesChartTypeCatalog,
  seriesChartVariantCatalog,
  seriesCompatibilityCatalog,
  seriesCompatibilityIds,
} from './catalog/series-chart-types.js';
import {
  compileWithRegistry,
  type CompileOptions,
  type CompileResult,
} from './compiler/compile.js';
import type { MarkCompiler } from './compiler/types.js';
import type { GraflumePlugin } from './core/plugin.js';
import {
  compileBoxplotMark,
  compileChordMark,
  compileCustomMark,
  compileEffectScatterMark,
  compileFunnelMark,
  compileGraphMark,
  compileHeatmapMark,
  compileLinesMark,
  compileParallelMark,
  compilePictorialBarMark,
  compileRadarMark,
  compileSunburstMark,
  compileThemeRiverMark,
  compileTreeMark,
} from './marks/advanced.js';
import {
  compileArcDiagramMark,
  compileBulletMark,
  compileContourMark,
  compileCylinderMark,
  compileDistributionMark,
  compileFinancialMark,
  compileFlagsMark,
  compileGeoFlowMark,
  compileGeoHeatmapMark,
  compileGeoLineMark,
  compileIndicatorMark,
  compileItemMark,
  compileLollipopMark,
  compilePackedBubbleMark,
  compileParetoMark,
  compilePointFigureMark,
  compilePolygonMark,
  compilePyramidMark,
  compileRangeMark,
  compileRenkoMark,
  compileScatter3dMark,
  compileSmoothMark,
  compileSolidGaugeMark,
  compileTiledMapMark,
  compileTilemapMark,
  compileVariablePieMark,
  compileVariwideMark,
  compileVectorMark,
  compileVennMark,
  compileVolumeProfileMark,
  compileWindBarbMark,
  compileWordCloudMark,
} from './marks/series.js';
import type { RendererFactory } from './renderer/types.js';
import { Chart, type ChartCreateOptions, type ChartTarget } from './runtime/chart.js';
import { createDefaultRegistry } from './runtime/default-registry.js';
import type { RuntimeRegistry } from './runtime/registry.js';
import type { ChartSpec, DataInput, MarkType } from './spec/types.js';
import type { ThemeTokens } from './theme/types.js';

const additionalMarkCompilers: readonly (readonly [MarkType, MarkCompiler])[] = [
  ['radar', compileRadarMark],
  ['tree', compileTreeMark],
  ['graph', compileGraphMark],
  ['chord', compileChordMark],
  ['funnel', compileFunnelMark],
  ['parallel', compileParallelMark],
  ['boxplot', compileBoxplotMark],
  ['effect-scatter', compileEffectScatterMark],
  ['lines', compileLinesMark],
  ['heatmap', compileHeatmapMark],
  ['pictorial-bar', compilePictorialBarMark],
  ['theme-river', compileThemeRiverMark],
  ['sunburst', compileSunburstMark],
  ['custom', compileCustomMark],
  ['arc-diagram', compileArcDiagramMark],
  ['range', compileRangeMark],
  ['smooth', compileSmoothMark],
  ['distribution', compileDistributionMark],
  ['bullet', compileBulletMark],
  ['contour', compileContourMark],
  ['cylinder', compileCylinderMark],
  ['item', compileItemMark],
  ['lollipop', compileLollipopMark],
  ['packed-bubble', compilePackedBubbleMark],
  ['pareto', compileParetoMark],
  ['polygon', compilePolygonMark],
  ['pyramid', compilePyramidMark],
  ['scatter-3d', compileScatter3dMark],
  ['solid-gauge', compileSolidGaugeMark],
  ['tilemap', compileTilemapMark],
  ['variable-pie', compileVariablePieMark],
  ['variwide', compileVariwideMark],
  ['vector', compileVectorMark],
  ['venn', compileVennMark],
  ['wind-barb', compileWindBarbMark],
  ['word-cloud', compileWordCloudMark],
  ['indicator', compileIndicatorMark],
  ['flags', compileFlagsMark],
  ['financial', compileFinancialMark],
  ['point-figure', compilePointFigureMark],
  ['renko', compileRenkoMark],
  ['volume-profile', compileVolumeProfileMark],
  ['geo-flow', compileGeoFlowMark],
  ['geo-heatmap', compileGeoHeatmapMark],
  ['geo-line', compileGeoLineMark],
  ['tiled-map', compileTiledMapMark],
];

function installAdditionalMarks(registry: RuntimeRegistry): void {
  for (const [type, compiler] of additionalMarkCompilers) registry.registerMark(type, compiler);
}

export function createCompleteRegistry(): RuntimeRegistry {
  const registry = createDefaultRegistry();
  installAdditionalMarks(registry);
  return registry;
}

const completeRegistry = createCompleteRegistry();

export function registerAdditionalMarks(registry: RuntimeRegistry = completeRegistry): void {
  installAdditionalMarks(registry);
}

export function create(target: ChartTarget, spec: ChartSpec, options?: ChartCreateOptions): Chart {
  return new Chart(target, spec, completeRegistry, options);
}

export function compile(spec: ChartSpec, options?: CompileOptions): CompileResult {
  return compileWithRegistry(spec, completeRegistry, options);
}

export function registerTheme(theme: ThemeTokens): void {
  completeRegistry.registerTheme(theme);
}

export function registerRenderer(factory: RendererFactory): void {
  completeRegistry.registerRenderer(factory);
}

export function registerMark(type: string, compiler: MarkCompiler): void {
  completeRegistry.registerMark(type, compiler);
}

export function use(plugin: GraflumePlugin): void {
  completeRegistry.use(plugin);
}

export function capabilities(): ReturnType<RuntimeRegistry['capabilities']> {
  return completeRegistry.capabilities();
}

export const createRegistry = createCompleteRegistry;

export function line(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'line', target, data, options);
}

export function bar(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'bar', target, data, options);
}

export function point(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'point', target, data, options);
}

export function scatter(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return point(target, data, options);
}

export function area(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'area', target, data, options);
}

function specialized(
  type: MarkType,
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
  markDefaults: NonNullable<QuickChartOptions['mark']> = {},
): Chart {
  return quickChart(create, type, target, data, {
    ...options,
    mark: { ...markDefaults, ...options.mark },
  });
}

export function annotation(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('annotation', target, data, options, { point: true });
}

export function annotatedTimeline(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return annotation(target, data, options);
}

export function horizontalBar(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('bar', target, data, options, { orientation: 'horizontal' });
}

export function column(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('bar', target, data, options, { orientation: 'vertical' });
}

export function bubble(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('bubble', target, data, options);
}

export function calendar(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('calendar', target, data, options);
}

export function candlestick(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('candlestick', target, data, options);
}

export function combo(target: ChartTarget, data: DataInput, options: QuickComboOptions): Chart {
  return quickCombo(create, target, data, options);
}

export function diff(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('diff', target, data, options);
}

export function pie(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('pie', target, data, options);
}

export function donut(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('pie', target, data, options, { options: { innerRadius: 0.56 } });
}

export function gantt(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('gantt', target, data, options);
}

export function gauge(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('gauge', target, data, options);
}

export function geo(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('geo', target, data, options);
}

export function histogram(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('histogram', target, data, options);
}

export function intervals(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('interval', target, data, options);
}

export const interval = intervals;

export function map(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('map', target, data, options);
}

export function motion(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('motion', target, data, options);
}

export function org(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('org', target, data, options);
}

export function sankey(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('sankey', target, data, options);
}

export function steppedArea(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('stepped-area', target, data, options);
}

export function table(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('table', target, data, options);
}

export function timeline(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('timeline', target, data, options);
}

export function treemap(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('treemap', target, data, options);
}

export function trendline(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('trendline', target, data, options);
}

export function vegaChart(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('vega', target, data, options);
}

export function waterfall(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('waterfall', target, data, options);
}

export function wordTree(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('word-tree', target, data, options);
}

function additional(
  type: MarkType,
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return quickChart(create, type, target, data, options);
}

export function radar(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('radar', target, data, options);
}

export function tree(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('tree', target, data, options);
}

export function graph(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('graph', target, data, options);
}

function selectedMode(options: QuickChartOptions): string | undefined {
  const mode = options.mark?.options?.mode;
  return typeof mode === 'string' ? mode : undefined;
}

/** One family API for node-link, arc, and connection-line layouts. */
export function network(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  const mode = selectedMode(options);
  if (mode === 'arc') return arcDiagram(target, data, options);
  if (mode === 'connections') return lines(target, data, options);
  return graph(target, data, options);
}

export function chord(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('chord', target, data, options);
}

export function funnel(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('funnel', target, data, options);
}

export function parallel(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('parallel', target, data, options);
}

export function boxplot(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('boxplot', target, data, options);
}

export function effectScatter(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return additional('effect-scatter', target, data, options);
}

export function lines(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('lines', target, data, options);
}

export function heatmap(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('heatmap', target, data, options);
}

export function pictorialBar(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return additional('pictorial-bar', target, data, options);
}

export function themeRiver(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return additional('theme-river', target, data, options);
}

export function sunburst(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('sunburst', target, data, options);
}

export function custom(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return additional('custom', target, data, options);
}

type MarkDefaults = NonNullable<QuickChartOptions['mark']>;

function mergeDefaults(defaults: MarkDefaults, options: QuickChartOptions): QuickChartOptions {
  return {
    ...options,
    mark: {
      ...defaults,
      ...options.mark,
      fields: { ...defaults.fields, ...options.mark?.fields },
      options: { ...defaults.options, ...options.mark?.options },
    },
  };
}

function makeSeriesQuick(type: MarkType, defaults: MarkDefaults = {}) {
  return (target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart =>
    additional(type, target, data, mergeDefaults(defaults, options));
}

function makeIndicatorQuick(kind: string, defaults: MarkDefaults = {}) {
  return makeSeriesQuick('indicator', {
    ...defaults,
    options: { kind, ...defaults.options },
  });
}

export const arcDiagram = makeSeriesQuick('arc-diagram', {
  fields: { target: 'target', value: 'value' },
});
export const areaRange = makeSeriesQuick('range', {
  fields: { low: 'low', high: 'high' },
  options: { mode: 'area' },
});
export const areaSpline = makeSeriesQuick('smooth', { options: { area: true } });
export const areaSplineRange = makeSeriesQuick('range', {
  fields: { low: 'low', high: 'high' },
  options: { mode: 'area', smooth: true },
});
export const bellCurve = makeSeriesQuick('distribution');
export const bullet = makeSeriesQuick('bullet', { fields: { target: 'target' } });
export const columnPyramid = makeSeriesQuick('pyramid', { options: { variant: 'column' } });
export const columnRange = makeSeriesQuick('range', {
  fields: { low: 'low', high: 'high' },
  options: { mode: 'column' },
});
export const contour = makeSeriesQuick('contour', { fields: { value: 'value' } });
export const cylinder = makeSeriesQuick('cylinder');
export const dependencyWheel = chord;
export const dumbbell = makeSeriesQuick('range', {
  fields: { low: 'low', high: 'high' },
  options: { mode: 'dumbbell' },
});
export const errorBar = intervals;
export const funnel3d = makeSeriesQuick('pyramid', { options: { variant: 'funnel-3d' } });
export const itemChart = makeSeriesQuick('item');
export const lollipop = makeSeriesQuick('lollipop');
export const networkGraph = graph;
export const organizationNetwork = org;
export const packedBubble = makeSeriesQuick('packed-bubble');
export const pareto = makeSeriesQuick('pareto');
export const pictorialColumn = pictorialBar;
export const polygon = makeSeriesQuick('polygon');
export const pyramid = makeSeriesQuick('pyramid', { options: { variant: 'pyramid' } });
export const pyramid3d = makeSeriesQuick('pyramid', { options: { variant: 'pyramid-3d' } });
export const scatter3d = makeSeriesQuick('scatter-3d', { fields: { z: 'z' } });
export const solidGauge = makeSeriesQuick('solid-gauge');
export const spline = makeSeriesQuick('smooth');
export const streamgraph = themeRiver;
export const tileMap = makeSeriesQuick('tilemap', { fields: { value: 'value' } });
export const treeGraph = tree;
export const variablePie = makeSeriesQuick('variable-pie', { fields: { radius: 'radius' } });
export const variableWidth = makeSeriesQuick('variwide', { fields: { width: 'width' } });
export const vector = makeSeriesQuick('vector', {
  fields: { direction: 'direction', magnitude: 'magnitude' },
});
export const venn = makeSeriesQuick('venn');
export const windBarb = makeSeriesQuick('wind-barb', {
  fields: { speed: 'speed', direction: 'direction' },
});
export const wordCloud = makeSeriesQuick('word-cloud');
export const xRange = timeline;

/** One family API for arrow and wind-barb vector glyphs. */
export function vectorField(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return selectedMode(options) === 'wind-barb'
    ? windBarb(target, data, options)
    : vector(target, data, options);
}

export const accelerationBands = makeIndicatorQuick('abands', {
  fields: { lower: 'lower', middle: 'value', upper: 'upper' },
});
export const awesomeOscillator = makeIndicatorQuick('ao');
export const absolutePriceOscillator = makeIndicatorQuick('apo');
export const aroon = makeIndicatorQuick('aroon', {
  options: { fields: ['up', 'down'] },
});
export const aroonOscillator = makeIndicatorQuick('aroonoscillator');
export const averageTrueRange = makeIndicatorQuick('atr');
export const volatilityBands = makeIndicatorQuick('bb', {
  fields: { lower: 'lower', middle: 'value', upper: 'upper' },
});
export const commodityChannelIndex = makeIndicatorQuick('cci');
export const chaikinOscillator = makeIndicatorQuick('chaikin');
export const chaikinMoneyFlow = makeIndicatorQuick('cmf');
export const chandeMomentumOscillator = makeIndicatorQuick('cmo');
export const doubleExponentialMovingAverage = makeIndicatorQuick('dema');
export const disparityIndex = makeIndicatorQuick('disparityindex');
export const directionalMovementIndex = makeIndicatorQuick('dmi', {
  options: { fields: ['plus', 'minus', 'value'] },
});
export const detrendedPriceOscillator = makeIndicatorQuick('dpo');
export const exponentialMovingAverage = makeIndicatorQuick('ema');
export const eventFlags = makeSeriesQuick('flags', { fields: { title: 'title' } });
export const heikinAshi = makeSeriesQuick('financial', {
  fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
  options: { kind: 'heikin-ashi' },
});
export const highLowClose = makeSeriesQuick('financial', {
  fields: { high: 'high', low: 'low', close: 'close' },
  options: { kind: 'hlc' },
});
export const hollowCandlestick = makeSeriesQuick('financial', {
  fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
  options: { kind: 'hollow-candlestick' },
});
export const ichimokuCloud = makeIndicatorQuick('ikh', {
  fields: { lower: 'lower', middle: 'value', upper: 'upper' },
  options: { fields: ['conversion', 'base', 'value'] },
});
export const keltnerChannels = makeIndicatorQuick('keltnerchannels', {
  fields: { lower: 'lower', middle: 'value', upper: 'upper' },
});
export const klingerOscillator = makeIndicatorQuick('klinger', {
  options: { fields: ['value', 'signal'] },
});
export const linearRegression = makeIndicatorQuick('linearregression');
export const linearRegressionAngle = makeIndicatorQuick('linearregressionangle');
export const linearRegressionIntercept = makeIndicatorQuick('linearregressionintercept');
export const linearRegressionSlope = makeIndicatorQuick('linearregressionslope');
export const movingAverageConvergenceDivergence = makeIndicatorQuick('macd', {
  options: { fields: ['value', 'signal'] },
});
export const moneyFlowIndex = makeIndicatorQuick('mfi');
export const momentumIndicator = makeIndicatorQuick('momentum');
export const normalizedAverageTrueRange = makeIndicatorQuick('natr');
export const onBalanceVolume = makeIndicatorQuick('obv');
export const openHighLowClose = makeSeriesQuick('financial', {
  fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
  options: { kind: 'ohlc' },
});
export const priceChannel = makeIndicatorQuick('pc', {
  fields: { lower: 'lower', middle: 'value', upper: 'upper' },
});
export const pivotPoints = makeIndicatorQuick('pivotpoints', {
  options: { fields: ['support', 'value', 'resistance'] },
});
export const pointAndFigure = makeSeriesQuick('point-figure');
export const percentagePriceOscillator = makeIndicatorQuick('ppo');
export const priceEnvelopes = makeIndicatorQuick('priceenvelopes', {
  fields: { lower: 'lower', middle: 'value', upper: 'upper' },
});
export const parabolicStopAndReverse = makeIndicatorQuick('psar');
export const renko = makeSeriesQuick('renko');
export const rateOfChange = makeIndicatorQuick('roc');
export const relativeStrengthIndex = makeIndicatorQuick('rsi');
export const slowStochastic = makeIndicatorQuick('slowstochastic', {
  options: { fields: ['value', 'signal'] },
});
export const simpleMovingAverage = makeIndicatorQuick('sma');
export const stochastic = makeIndicatorQuick('stochastic', {
  options: { fields: ['value', 'signal'] },
});
export const supertrend = makeIndicatorQuick('supertrend');
export const tripleExponentialMovingAverage = makeIndicatorQuick('tema');
export const tripleExponentialAverageOscillator = makeIndicatorQuick('trix');
export const volumeByPrice = makeSeriesQuick('volume-profile', {
  fields: { price: 'price', volume: 'volume' },
});
export const volumeWeightedAveragePrice = makeIndicatorQuick('vwap');
export const williamsRange = makeIndicatorQuick('williamsr');
export const weightedMovingAverage = makeIndicatorQuick('wma');
export const zigzag = makeIndicatorQuick('zigzag');

/** One family API for all indicator presets; select one with mark.options.kind. */
export const technicalIndicator = makeSeriesQuick('indicator', {
  options: { kind: 'sma' },
});

/** One family API for discrete price-block layouts. */
export function priceBlocks(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return selectedMode(options) === 'point-and-figure'
    ? pointAndFigure(target, data, options)
    : renko(target, data, options);
}

/** Canonical name for the volume-by-price preset. */
export const volumeProfile = volumeByPrice;

export const flowMap = makeSeriesQuick('geo-flow', {
  fields: { longitude2: 'longitude2', latitude2: 'latitude2', value: 'value' },
});
export const geoHeatmap = makeSeriesQuick('geo-heatmap', { fields: { value: 'value' } });
export const mapBubble = map;
export const mapLine = makeSeriesQuick('geo-line', {
  fields: { longitude2: 'longitude2', latitude2: 'latitude2', value: 'value' },
});
export const mapPoint = map;
export const tiledMap = makeSeriesQuick('tiled-map');

export const fullCatalog = [
  ...chartTypeCatalog,
  ...additionalChartTypeCatalog,
  ...seriesChartTypeCatalog,
] as const;

/** All historical names as presets mapped onto the consolidated family catalog. */
export const fullVariantCatalog = [
  ...chartVariantCatalog,
  ...additionalChartVariantCatalog,
  ...seriesChartVariantCatalog,
] as const;

export {
  additionalChartTypeCatalog,
  additionalChartVariantCatalog,
  resolveSeriesType,
  seriesChartTypeCatalog,
  seriesChartVariantCatalog,
  seriesCompatibilityCatalog,
  seriesCompatibilityIds,
};
export * from './index.js';
export type {
  AdditionalChartTypeId,
  AdditionalChartVariantId,
} from './catalog/additional-chart-types.js';
export type {
  SeriesChartTypeId,
  SeriesChartVariantId,
  SeriesCompatibilityEntry,
} from './catalog/series-chart-types.js';
