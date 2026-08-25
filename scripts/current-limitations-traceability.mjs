import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const source = (path, token) => ({ path, token });
const testCase = (path, name) => ({ path, name });
const trace = (capability, sourcePath, token, testPath, name) => ({
  capability,
  sources: [source(sourcePath, token)],
  tests: [testCase(testPath, name)],
});
const compositeTrace = (capability, sources, tests) => ({ capability, sources, tests });

/**
 * Curated one-capability-at-a-time traceability for the immutable 161-item boundary.
 * Keep labels and ordering exact. Tokens and test names are verified against live files.
 */
export const capabilityTraceability = {
  annotation: [
    trace(
      'data-coordinate primitive registry',
      'src/annotation/primitives.ts',
      'annotationPrimitiveRegistry',
      'tests/annotation-authoring.test.mjs',
      'annotation primitive registry is closed and target-aware',
    ),
    trace(
      'keyboard authoring',
      'src/interaction/annotation-authoring.ts',
      'editAnnotationByKeyboard',
      'tests/annotation-authoring.test.mjs',
      'keyboard authoring and bounded undo/redo preserve portable state',
    ),
    trace(
      'drag and resize handles',
      'src/interaction/annotation-authoring.ts',
      'editAnnotationByPointer',
      'tests/annotation-authoring.test.mjs',
      'pointer handles move and resize portable annotation state',
    ),
    trace(
      'undo and redo',
      'src/interaction/annotation-authoring.ts',
      'AnnotationAuthoringHistory',
      'tests/annotation-authoring.test.mjs',
      'keyboard authoring and bounded undo/redo preserve portable state',
    ),
  ],
  area: [
    trace(
      'named and branched transform DAG reuse',
      'src/data/dataflow.ts',
      'TransformDataflow',
      'tests/foundation-dataflow-encoding.test.mjs',
      'named transform sources and branches reuse one memoized DAG ancestor',
    ),
    trace(
      'worker-bounded incremental stack updates',
      'src/data/worker-runtime.ts',
      'WorkerIncrementalStackOperation',
      'tests/foundation-runtime.test.mjs',
      'Worker v2 runs portable affected-group stacks and bounded bar virtualization transitions',
    ),
    trace(
      'automatic series labels',
      'src/compiler/mark-labels.ts',
      'seriesAutomaticGeometry',
      'tests/mark-label-authoring.test.mjs',
      'stacked Bar totals and segments and Area series endpoints use calculated semantics',
    ),
    trace(
      'data-domain navigation',
      'src/interaction/domain-navigation.ts',
      'zoomDomainAtPixel',
      'tests/chart-interaction-runtime.test.mjs',
      'data-domain navigation supports wheel, pointer drag, keyboard reset, and coordinate round-trip',
    ),
  ],
  bar: [
    trace(
      'weighted count',
      'src/data/family-analytics.ts',
      'weightedCount',
      'tests/statistical-advanced.test.mjs',
      'bar compiler aggregates weighted counts and exposes deterministic rank changes',
    ),
    trace(
      'interactive sort and rank',
      'src/data/family-layouts.ts',
      'rankBars',
      'tests/family-layouts.test.mjs',
      'bar ranking supports weighted count, stable sorting and rank-change metadata',
    ),
    trace(
      'automatic total and segment labels',
      'src/compiler/mark-labels.ts',
      'compileMarkLabels',
      'tests/mark-label-authoring.test.mjs',
      'stacked Bar totals and segments and Area series endpoints use calculated semantics',
    ),
    trace(
      'worker-bounded virtualization',
      'src/data/worker-runtime.ts',
      'WorkerBarVirtualizationOperation',
      'tests/foundation-runtime.test.mjs',
      'Worker v2 runs portable affected-group stacks and bounded bar virtualization transitions',
    ),
  ],
  bubble: [
    trace(
      'absolute-area scale contract',
      'src/data/family-analytics.ts',
      'areaRadius',
      'tests/family-analytics.test.mjs',
      'weighted count and absolute-area bubble sizing expose explicit policies and guide values',
    ),
    trace(
      'zero and negative policy',
      'src/data/family-analytics.ts',
      'BubbleNegativePolicy',
      'tests/statistical-advanced.test.mjs',
      'bubble compiler uses proportional area, explicit negative/zero policies, and a truthful size guide',
    ),
    trace(
      'explicit size guide',
      'src/data/family-analytics.ts',
      'areaSizeGuide',
      'tests/family-analytics.test.mjs',
      'weighted count and absolute-area bubble sizing expose explicit policies and guide values',
    ),
  ],
  calendar: [
    trace(
      'year/month/week/day modes',
      'src/data/family-analytics.ts',
      'CalendarMode',
      'tests/statistical-advanced.test.mjs',
      'calendar compiler renders every range mode with week-start, timezone, leap, zero, missing, and month-boundary metadata',
    ),
    trace(
      'locale week start and timezone',
      'src/data/family-analytics.ts',
      'calendarWeekStart',
      'tests/statistical-advanced.test.mjs',
      'calendar compiler renders locale and timezone semantics into weekday headers and civil-date cells',
    ),
    trace(
      'leap/no-data/zero policy',
      'src/data/family-analytics.ts',
      'CalendarMissingPolicy',
      'tests/family-analytics.test.mjs',
      'calendar cells support mode, week start, time zone, leap, missing, zero, and month boundaries',
    ),
    trace(
      'month boundaries',
      'src/data/family-analytics.ts',
      'monthBoundary',
      'tests/family-analytics.test.mjs',
      'calendar cells support mode, week start, time zone, leap, missing, zero, and month boundaries',
    ),
  ],
  candlestick: [
    trace(
      'OHLC aggregation',
      'src/data/family-analytics.ts',
      'aggregateOhlc',
      'tests/family-analytics.test.mjs',
      'OHLC aggregation applies session policy, produces a gapless axis, and exposes a navigator window',
    ),
    trace(
      'session and timezone calendar',
      'src/data/family-analytics.ts',
      'localTradingTime',
      'tests/family-analytics.test.mjs',
      'OHLC aggregation applies session policy, produces a gapless axis, and exposes a navigator window',
    ),
    trace(
      'gapless trading axis',
      'src/compiler/domain.ts',
      'tradingScale',
      'tests/statistical-advanced.test.mjs',
      'candlestick compiler aggregates OHLCV, separates sessions, uses a gapless trading axis, and renders a navigator',
    ),
    trace(
      'extended-hours policy',
      'src/data/family-analytics.ts',
      'ExtendedHoursPolicy',
      'tests/statistical-advanced.test.mjs',
      'candlestick compiler aggregates OHLCV, separates sessions, uses a gapless trading axis, and renders a navigator',
    ),
    trace(
      'navigator',
      'src/interaction/advanced-family-runtime.ts',
      'translateNavigatorWindow',
      'tests/chart-interaction-runtime.test.mjs',
      'advanced family pointer gestures recompile navigator, hierarchy, and parallel scenes',
    ),
  ],
  combination: [
    trace(
      'named axes',
      'src/compiler/domain.ts',
      'resolveScales',
      'tests/named-axes-layer-clip.test.mjs',
      'three named x and y axes resolve independent channels, render positions, and filter axis tooltips',
    ),
    trace(
      'shared multi-view axes/legends/colorbars',
      'src/compiler/composition.ts',
      'harmonizeSharedScales',
      'tests/composition.test.mjs',
      'shared concat scales use a deterministic union domain in every child',
    ),
    trace(
      'linked view state',
      'src/compiler/composition.ts',
      'runtimeForView',
      'tests/composition.test.mjs',
      'composition container owns analytic selection and data-domain navigation for every leaf',
    ),
    trace(
      'layer transforms',
      'src/compiler/composition.ts',
      'flattenLayerComposition',
      'tests/composition.test.mjs',
      'new layer composition uses the flat shared compiler while legacy layers stay unchanged',
    ),
    trace(
      'layer clipping',
      'src/compiler/compile.ts',
      'resolveLayerClip',
      'tests/named-axes-layer-clip.test.mjs',
      'layer clip supports default, opt-out, plot-relative, and data-domain scene contracts',
    ),
  ],
  difference: [
    trace(
      'series alignment',
      'src/data/family-analytics.ts',
      'differenceSeries',
      'tests/family-analytics.test.mjs',
      'difference policies align values and interpolate numeric crossings',
    ),
    trace(
      'baseline comparison',
      'src/marks/statistical-advanced.ts',
      'compileAdvancedDifferenceMark',
      'tests/statistical-advanced.test.mjs',
      'difference compiler aligns baseline/comparison, applies percentage policy, and inserts exact crossings',
    ),
    trace(
      'absolute/relative/percent policy',
      'src/data/family-analytics.ts',
      'DifferencePolicy',
      'tests/family-analytics.test.mjs',
      'difference policies align values and interpolate numeric crossings',
    ),
    trace(
      'crossing interpolation',
      'src/data/family-analytics.ts',
      'DifferencePoint',
      'tests/statistical-advanced.test.mjs',
      'difference compiler aligns baseline/comparison, applies percentage policy, and inserts exact crossings',
    ),
  ],
  pie: [
    trace(
      'dense label solver',
      'src/marks/layout-advanced.ts',
      'compileAdvancedPieMark',
      'tests/layout-advanced.test.mjs',
      'pie compiler resolves negative/zero/minimum/sort/pad policy and dense roving labels',
    ),
    trace(
      'zero and negative policy',
      'src/data/family-layouts.ts',
      'PieOptions',
      'tests/family-layouts.test.mjs',
      'pie semantics cover zero/negative policies, minimum slices, sorting, padding and roving traversal',
    ),
    trace(
      'minimum slice, sorting and padding',
      'src/data/family-layouts.ts',
      'layoutPie',
      'tests/family-layouts.test.mjs',
      'pie semantics cover zero/negative policies, minimum slices, sorting, padding and roving traversal',
    ),
    trace(
      'keyboard slice traversal',
      'src/data/family-layouts.ts',
      'nextPieSlice',
      'tests/chart-interaction-runtime.test.mjs',
      'pie and table family keyboard controls update focus, selection, transforms, and events',
    ),
  ],
  timeline: [
    trace(
      'lane packing and grouping',
      'src/data/family-layouts.ts',
      'layoutTimeline',
      'tests/family-layouts.test.mjs',
      'timeline packs grouped overlap lanes, milestones, dependencies, clipping, duration and navigator',
    ),
    trace(
      'milestones',
      'src/data/family-layouts.ts',
      'TimelineDatum',
      'tests/layout-advanced.test.mjs',
      'timeline compiler packs groups/lanes, renders milestones/dependencies/clipping/duration and navigator',
    ),
    trace(
      'clipping and duration',
      'src/data/family-layouts.ts',
      'TimelineItem',
      'tests/family-layouts.test.mjs',
      'timeline packs grouped overlap lanes, milestones, dependencies, clipping, duration and navigator',
    ),
    trace(
      'navigator',
      'src/interaction/advanced-family-runtime.ts',
      'ChartNavigatorRuntimeState',
      'tests/advanced-family-runtime.test.mjs',
      'navigator state translates, clamps, and becomes family compiler options',
    ),
  ],
  gauge: [
    trace(
      'threshold bands',
      'src/data/family-layouts.ts',
      'GaugeBand',
      'tests/family-layouts.test.mjs',
      'gauge model exposes radial/linear bands, thresholds, targets, custom ticks and exact accessible summary',
    ),
    trace(
      'custom ticks',
      'src/data/family-layouts.ts',
      'GaugeOptions',
      'tests/layout-advanced.test.mjs',
      'radial and linear gauge render bands, custom ticks, targets, and exact accessible summaries',
    ),
    trace(
      'exact accessible value summary',
      'src/data/family-layouts.ts',
      'accessibleSummary',
      'tests/family-layouts.test.mjs',
      'gauge model exposes radial/linear bands, thresholds, targets, custom ticks and exact accessible summary',
    ),
  ],
  map: [
    trace(
      'source/layer/projection lifecycle',
      'src/geography/map-lifecycle.ts',
      'MapRuntime',
      'tests/map-lifecycle.test.mjs',
      'persistent map runtime owns a closed projection lifecycle and projects through current state',
    ),
    compositeTrace(
      'GeoJSON and TopoJSON',
      [
        source('src/geography/map-lifecycle.ts', 'normalizeGeoJson'),
        source('src/geography/map-lifecycle.ts', 'topologyToGeoJson'),
      ],
      [
        testCase(
          'tests/map-lifecycle.test.mjs',
          'GeoJSON validation normalizes geometry, feature, and collection inputs',
        ),
        testCase(
          'tests/map-advanced-render.test.mjs',
          'map compiler decodes TopoJSON delta and reversed arcs into rendered features',
        ),
      ],
    ),
    trace(
      'general fit and clip policy',
      'src/geography/map-lifecycle.ts',
      'fitMapBounds',
      'tests/map-advanced-render.test.mjs',
      'map scene performs rectangular point, line, multiline, polygon, and multipolygon clipping',
    ),
    trace(
      'flat geodesics',
      'src/geography/map-lifecycle.ts',
      'geodesicPath',
      'tests/map-lifecycle.test.mjs',
      'geodesics follow a great circle and graticules are ordinary line features',
    ),
    compositeTrace(
      'provider-backed tile lifecycle, cache and attribution',
      [
        source('src/geography/map-lifecycle.ts', 'MapTileManager'),
        source('src/renderer/canvas.ts', 'maximumProviderTileRequests'),
        source('src/renderer/canvas.ts', 'maximumDecodedProviderTiles'),
      ],
      [
        testCase(
          'tests/map-lifecycle.test.mjs',
          'provider tile lifecycle wraps x, chooses subdomains, deduplicates, aborts and bounds an LRU cache',
        ),
        testCase(
          'tests/map-advanced-render.test.mjs',
          'Canvas provider scheduler bounds 129 visible tiles and aborts work that leaves the scene',
        ),
        testCase(
          'tests/map-advanced-render.test.mjs',
          'Canvas decoded provider tiles use a 128-entry LRU and close the least-recent image',
        ),
      ],
    ),
  ],
  distribution: [
    trace(
      'shared bins',
      'src/data/family-analytics.ts',
      'sharedHistogramBins',
      'tests/family-analytics.test.mjs',
      'shared bins, weighted notches, and seeded rug or strip layouts are deterministic',
    ),
    trace(
      'notched and weighted box summaries',
      'src/data/family-analytics.ts',
      'weightedBoxSummary',
      'tests/family-analytics.test.mjs',
      'shared bins, weighted notches, and seeded rug or strip layouts are deterministic',
    ),
    trace(
      'rug and strip',
      'src/data/family-analytics.ts',
      'rugStrip',
      'tests/family-analytics.test.mjs',
      'shared bins, weighted notches, and seeded rug or strip layouts are deterministic',
    ),
  ],
  interval: [
    trace(
      'raw estimator',
      'src/data/family-analytics.ts',
      'estimateInterval',
      'tests/family-analytics.test.mjs',
      'raw interval estimation covers CI, PI, SE, SD, IQR, and HDI with orientation and provenance',
    ),
    trace(
      'CI/PI/SE/SD/IQR/HDI',
      'src/data/family-analytics.ts',
      'IntervalKind',
      'tests/statistical-advanced.test.mjs',
      'interval compiler estimates all six interval kinds and horizontal provenance from raw rows',
    ),
    trace(
      'horizontal errors',
      'src/marks/statistical-advanced.ts',
      'compileEstimatedIntervalMark',
      'tests/statistical-advanced.test.mjs',
      'interval compiler estimates all six interval kinds and horizontal provenance from raw rows',
    ),
    trace(
      'provenance',
      'src/data/family-analytics.ts',
      'EstimatedInterval',
      'tests/family-analytics.test.mjs',
      'raw interval estimation covers CI, PI, SE, SD, IQR, and HDI with orientation and provenance',
    ),
  ],
  line: [
    trace(
      'duplicate and implicit sort policy',
      'src/data/family-analytics.ts',
      'prepareOrderedSeries',
      'tests/statistical-advanced.test.mjs',
      'line compiler enforces duplicate and implicit sort policy while retaining source rows',
    ),
    trace(
      'data-domain navigation',
      'src/interaction/domain-navigation.ts',
      'panDomainByPixels',
      'tests/chart-interaction-runtime.test.mjs',
      'data-domain navigation supports wheel, pointer drag, keyboard reset, and coordinate round-trip',
    ),
    trace(
      'named transform DAG reuse',
      'src/data/dataflow.ts',
      'executeTransformDataflow',
      'tests/foundation-dataflow-encoding.test.mjs',
      'named dataflow compiles through reusable composition branches with source provenance',
    ),
    trace(
      'worker-bounded streaming retention',
      'src/data/worker-runtime.ts',
      'WorkerStreamRetentionOperation',
      'tests/worker-stream-retention.test.mjs',
      'Worker-owned retention matches main-thread append/upsert/replaceLast and event-time policy',
    ),
  ],
  motion: [
    trace(
      'reverse playback',
      'src/interaction/playback.ts',
      'playbackSpec',
      'tests/chart-interaction-runtime.test.mjs',
      'reverse playback composes named seeks with inclusive loop ranges on SVG surfaces',
    ),
    trace(
      'loop subranges',
      'src/interaction/playback.ts',
      'resolvePlaybackTimeline',
      'tests/chart-interaction-runtime.test.mjs',
      'reverse playback composes named seeks with inclusive loop ranges on SVG surfaces',
    ),
    trace(
      'named frames',
      'src/interaction/playback.ts',
      'ResolvedPlaybackNamedFrame',
      'tests/chart-interaction-runtime.test.mjs',
      'reduced motion blocks autoplay and an existing motion frame selects the initial index',
    ),
  ],
  hierarchy: [
    trace(
      'circle pack',
      'src/data/structured-analytics.ts',
      'layoutCirclePack',
      'tests/structured-analytics.test.mjs',
      'hierarchy layouts implement circle pack, dendrogram, radial tree, collapse, reroot, breadcrumbs, and search',
    ),
    trace(
      'dendrogram and radial tree',
      'src/data/structured-analytics.ts',
      'layoutDendrogram',
      'tests/relationship-advanced.test.mjs',
      'hierarchy compiler renders circle-pack, dendrogram, and radial layouts with navigation state',
    ),
    trace(
      'collapse/re-root/zoom',
      'src/interaction/advanced-family-runtime.ts',
      'hierarchyRuntimeOptions',
      'tests/chart-interaction-runtime.test.mjs',
      'advanced family pointer gestures recompile navigator, hierarchy, and parallel scenes',
    ),
    trace(
      'breadcrumbs and search',
      'src/data/structured-analytics.ts',
      'hierarchyBreadcrumbs',
      'tests/structured-analytics.test.mjs',
      'hierarchy layouts implement circle pack, dendrogram, radial tree, collapse, reroot, breadcrumbs, and search',
    ),
  ],
  flow: [
    trace(
      'multi-stage graph model',
      'src/data/structured-analytics.ts',
      'layoutFlow',
      'tests/relationship-advanced.test.mjs',
      'flow compiler supports multi-stage layout, cycle/balance metadata, authored positions and path traversal',
    ),
    trace(
      'alignment/order/sort/iterations',
      'src/data/structured-analytics.ts',
      'FlowLinkSort',
      'tests/structured-analytics.test.mjs',
      'flow link sorting deterministically changes per-node stacking and authored order',
    ),
    trace(
      'cycles and balance validation',
      'src/data/structured-analytics.ts',
      'graphCycles',
      'tests/structured-analytics.test.mjs',
      'flow layout validates balance and cycles, supports order/alignment/iterations/drag, and traverses paths',
    ),
    trace(
      'node drag and path traversal',
      'src/data/structured-analytics.ts',
      'traverseFlowPath',
      'tests/chart-interaction-runtime.test.mjs',
      'flow node pointer drag recompiles authored positions and emits a bounded runtime event',
    ),
  ],
  scatter: [
    trace(
      'color/radius/shape/opacity encodings',
      'src/encoding/resolve.ts',
      'EncodingResolver',
      'tests/scatter-p0.test.mjs',
      'scatter resolves portable color, radius, shape, and opacity encodings',
    ),
    trace(
      'brush/lasso/polygon selection',
      'src/interaction/analytic-selection.ts',
      'AnalyticSelectionStore',
      'tests/chart-interaction-runtime.test.mjs',
      'rectangle, lasso, and axis pointer selections use bounded serializable domain state',
    ),
    trace(
      'data-domain navigation',
      'src/interaction/domain-navigation.ts',
      'domainForAxisWindow',
      'tests/analytic-interaction.test.mjs',
      'domain windows zoom and pan within safe bounds and preserve transformed domains',
    ),
    compositeTrace(
      'spatial index and WebGL dispatch',
      [
        source('src/interaction/spatial-index.ts', 'UniformSpatialIndex'),
        source('src/api/scatter-dispatch.ts', 'resolveScatterRendererDispatch'),
      ],
      [
        testCase(
          'tests/scatter-p0.test.mjs',
          'scatter hit testing uses a bounded screen-space spatial index',
        ),
        testCase(
          'tests/scatter-p0.test.mjs',
          'ordinary Chart scatter selects its registered WebGL renderer by threshold or explicit choice',
        ),
      ],
    ),
  ],
  table: [
    trace(
      'interactive sort/filter/group/pivot controls',
      'src/interaction/family-runtime.ts',
      'normalizeTableRuntimeState',
      'tests/layout-advanced.test.mjs',
      'table compiler applies filter/group/sort, virtual window, frozen cells, keyboard metadata, and formatters',
    ),
    trace(
      'virtualization and frozen regions',
      'src/data/family-layouts.ts',
      'buildTableModel',
      'tests/chart-interaction-runtime.test.mjs',
      'table runtime preserves frozen regions while API and keyboard move the virtual window',
    ),
    trace(
      'cell-level keyboard grid navigation',
      'src/data/family-layouts.ts',
      'moveTableCell',
      'tests/family-layouts.test.mjs',
      'table formatter registry and keyboard grid navigation are closed and bounded',
    ),
    trace(
      'formatter registry',
      'src/data/family-layouts.ts',
      'TableFormatterRegistry',
      'tests/layout-advanced.test.mjs',
      'table compiler uses locale-aware built-ins, host formatters, and rejects unknown ids',
    ),
  ],
  waterfall: [
    trace(
      'explicit relative/absolute/subtotal/total semantics',
      'src/data/family-analytics.ts',
      'waterfallSteps',
      'tests/statistical-advanced.test.mjs',
      'waterfall compiler honors explicit relative, absolute, subtotal, and total rows',
    ),
  ],
  'word-tree': [
    trace(
      'tokenization/case/stopword/stemming',
      'src/data/structured-analytics.ts',
      'tokenizeWords',
      'tests/structured-analytics.test.mjs',
      'shared text transform and word tree cover case, stopwords, stemming, n-grams, prefix/suffix/reverse and pruning',
    ),
    trace(
      'prefix/suffix/reverse',
      'src/data/structured-analytics.ts',
      'buildWordTree',
      'tests/relationship-advanced.test.mjs',
      'word-tree compiler tokenizes and aggregates prefix/suffix/reverse trees with pruning',
    ),
    trace(
      'phrase aggregation and pruning',
      'src/data/structured-analytics.ts',
      'WordTreeNode',
      'tests/structured-analytics.test.mjs',
      'shared text transform and word tree cover case, stopwords, stemming, n-grams, prefix/suffix/reverse and pruning',
    ),
  ],
  polar: [
    trace(
      'configurable zero/direction/wrap',
      'src/data/family-layouts.ts',
      'layoutPolar',
      'tests/family-layouts.test.mjs',
      'polar layout implements zero/direction/wrap, log/sqrt radius, angular bins and stacked normalized radial bars',
    ),
    trace(
      'log/sqrt radius',
      'src/data/family-layouts.ts',
      'radiusScale',
      'tests/layout-advanced.test.mjs',
      'polar compiler supports zero/direction/wrap, nonlinear radius, bins, stack, and normalization',
    ),
    trace(
      'angular bins',
      'src/data/family-layouts.ts',
      'binWidth',
      'tests/family-layouts.test.mjs',
      'polar layout implements zero/direction/wrap, log/sqrt radius, angular bins and stacked normalized radial bars',
    ),
    trace(
      'stacked and normalized radial bars',
      'src/data/family-layouts.ts',
      'segments',
      'tests/layout-advanced.test.mjs',
      'polar compiler supports zero/direction/wrap, nonlinear radius, bins, stack, and normalization',
    ),
  ],
  network: [
    trace(
      'directed/multiedge/self-loop/compound/port model',
      'src/data/network-analytics.ts',
      'NetworkEdgeInput',
      'tests/network-analytics.test.mjs',
      'network model supports directed multiedges, self-loops, compound nodes and explicit ports',
    ),
    trace(
      'force/radial/grid/DAG layouts',
      'src/data/network-analytics.ts',
      'layoutNetwork',
      'tests/network-analytics.test.mjs',
      'network layout registry covers deterministic force, radial, grid and DAG modes',
    ),
    trace(
      'drag/pin/collapse/lasso',
      'src/data/network-analytics.ts',
      'selectNetworkNodes',
      'tests/chart-interaction-runtime.test.mjs',
      'network pointer controls drag, pin, collapse, and lasso through transient runtime state',
    ),
    trace(
      'edge routing',
      'src/data/network-analytics.ts',
      'NetworkEdgeRouting',
      'tests/network-analytics.test.mjs',
      'network orthogonal routing, drag/pin and polygon lasso are serializable',
    ),
  ],
  chord: [
    trace(
      'matrix transform',
      'src/data/structured-analytics.ts',
      'layoutChord',
      'tests/structured-analytics.test.mjs',
      'chord transform exposes matrix, sorting, padding, directed asymmetry, subgroups and self-loop semantics',
    ),
    trace(
      'subgroups and sorting',
      'src/data/structured-analytics.ts',
      'ChordGroup',
      'tests/relationship-advanced.test.mjs',
      'chord compiler exposes matrix/subgroup sorting and directed self-loop ribbons',
    ),
    trace(
      'padding',
      'src/data/structured-analytics.ts',
      'ChordOptions',
      'tests/structured-analytics.test.mjs',
      'chord transform exposes matrix, sorting, padding, directed asymmetry, subgroups and self-loop semantics',
    ),
    trace(
      'directed asymmetry and self-loop semantics',
      'src/data/structured-analytics.ts',
      'ChordRibbon',
      'tests/relationship-advanced.test.mjs',
      'chord compiler exposes matrix/subgroup sorting and directed self-loop ribbons',
    ),
  ],
  funnel: [
    trace(
      'conversion/dropoff/cumulative semantics',
      'src/data/structured-analytics.ts',
      'funnelStages',
      'tests/structured-analytics.test.mjs',
      'funnel stages expose input/output/conversion/dropoff/cumulative meaning, neck geometry and non-overlapping outside labels',
    ),
    trace(
      'neck configuration',
      'src/data/structured-analytics.ts',
      'FunnelOptions',
      'tests/relationship-advanced.test.mjs',
      'funnel compiler renders neck geometry, exact stage semantics and collision-safe outside labels',
    ),
    trace(
      'outside label solver',
      'src/marks/relationship-advanced.ts',
      'compileAdvancedFunnelMark',
      'tests/relationship-advanced.test.mjs',
      'funnel compiler renders neck geometry, exact stage semantics and collision-safe outside labels',
    ),
  ],
  parallel: [
    trace(
      'log scale',
      'src/data/structured-analytics.ts',
      'ParallelScaleType',
      'tests/structured-analytics.test.mjs',
      'parallel projection implements linear/log/ordinal axes, missing routes, invert/reorder and linked multi-brush filters',
    ),
    trace(
      'missing routing',
      'src/data/structured-analytics.ts',
      'projectParallelRows',
      'tests/relationship-advanced.test.mjs',
      'parallel compiler applies reordered log/inverted/missing axes and per-axis multi-brush selection',
    ),
    compositeTrace(
      'axis reorder/invert',
      [
        source('src/interaction/advanced-family-runtime.ts', 'reorderParallelAxis'),
        source('src/interaction/advanced-family-runtime.ts', 'invertParallelAxis'),
      ],
      [
        testCase(
          'tests/advanced-family-runtime.test.mjs',
          'parallel runtime reorders, inverts and replaces a per-axis multi-brush',
        ),
      ],
    ),
    trace(
      'per-axis brush and linked filter',
      'src/interaction/advanced-family-runtime.ts',
      'setParallelBrushExtents',
      'tests/chart-interaction-runtime.test.mjs',
      'advanced family pointer gestures recompile navigator, hierarchy, and parallel scenes',
    ),
  ],
  heatmap: [
    trace(
      'pivot/matrix input',
      'src/data/specialized-coordinate-analytics.ts',
      'buildHeatmapMatrix',
      'tests/specialized-coordinate-analytics.test.mjs',
      'heatmap pivots long form, retains irregular extents, patterns missing values and maps five color modes',
    ),
    trace(
      'irregular extents',
      'src/data/specialized-coordinate-analytics.ts',
      'HeatmapCell',
      'tests/analytical-p0-compiler.test.mjs',
      'heatmap compiler pivots irregular cells, renders missing patterns, and exposes linked brush state',
    ),
    trace(
      'explicit missing-value pattern',
      'src/marks/analytical-p0.ts',
      'heatmapPattern',
      'tests/analytical-p0-compiler.test.mjs',
      'heatmap compiler pivots irregular cells, renders missing patterns, and exposes linked brush state',
    ),
    trace(
      'diverging/log/symlog/quantile color',
      'src/data/specialized-coordinate-analytics.ts',
      'heatmapColorPosition',
      'tests/specialized-coordinate-analytics.test.mjs',
      'heatmap pivots long form, retains irregular extents, patterns missing values and maps five color modes',
    ),
    trace(
      'brush',
      'src/data/specialized-coordinate-analytics.ts',
      'brushHeatmap',
      'tests/chart-interaction-runtime.test.mjs',
      'heatmap and scatter-matrix pointer brushes update linked runtime scenes',
    ),
  ],
  image: [
    trace(
      'extent and origin',
      'src/data/specialized-coordinate-analytics.ts',
      'RasterImage',
      'tests/specialized-coordinate-analytics.test.mjs',
      'raster image supports extent/origin and nearest, bilinear, bicubic sampling',
    ),
    trace(
      'resampling',
      'src/data/specialized-coordinate-analytics.ts',
      'sampleRaster',
      'tests/specialized-coordinate-analytics.test.mjs',
      'raster image supports extent/origin and nearest, bilinear, bicubic sampling',
    ),
    trace(
      'colormap and window mapping',
      'src/data/specialized-coordinate-analytics.ts',
      'mapRasterColor',
      'tests/specialized-coordinate-analytics.test.mjs',
      'raster color mapping applies window, colormap, alpha and channel compositing',
    ),
  ],
  ternary: [
    trace(
      'constant-sum validation policy',
      'src/data/specialized-coordinate-analytics.ts',
      'projectTernary',
      'tests/specialized-coordinate-analytics.test.mjs',
      'ternary projection validates constant sums, normalizes explicitly and exposes component ticks and dual tooltip',
    ),
    trace(
      'raw and normalized tooltip',
      'src/data/specialized-coordinate-analytics.ts',
      'TernaryPoint',
      'tests/analytical-p0-compiler.test.mjs',
      'ternary and Smith compilers expose normalized and specialist projected coordinates',
    ),
    trace(
      'component ticks and formatting',
      'src/marks/analytical-p0.ts',
      'ternaryTickFormatter',
      'tests/specialized-coordinate-analytics.test.mjs',
      'ternary projection validates constant sums, normalizes explicitly and exposes component ticks and dual tooltip',
    ),
  ],
  smith: [
    trace(
      'impedance/admittance/combined modes',
      'src/data/specialized-coordinate-analytics.ts',
      'SmithInputMode',
      'tests/specialized-coordinate-analytics.test.mjs',
      'Smith projection supports reflection/S, Z, Y and combined specialist labels at an explicit reference impedance',
    ),
    trace(
      'reference impedance',
      'src/data/specialized-coordinate-analytics.ts',
      'SmithOptions',
      'tests/specialized-coordinate-analytics.test.mjs',
      'Smith projection supports reflection/S, Z, Y and combined specialist labels at an explicit reference impedance',
    ),
    trace(
      'S/Z/Y/reflection inputs',
      'src/data/specialized-coordinate-analytics.ts',
      'projectSmith',
      'tests/analytical-p0-compiler.test.mjs',
      'ternary and Smith compilers expose normalized and specialist projected coordinates',
    ),
    trace(
      'specialized labels and tooltip',
      'src/marks/analytical-p0.ts',
      'compileAnalyticalSmithMark',
      'tests/specialized-coordinate-analytics.test.mjs',
      'Smith projection supports reflection/S, Z, Y and combined specialist labels at an explicit reference impedance',
    ),
  ],
  'scatter-matrix': [
    trace(
      'selectable diagonal KDE/ECDF',
      'src/data/specialized-coordinate-analytics.ts',
      'scatterMatrixPlan',
      'tests/specialized-coordinate-analytics.test.mjs',
      'scatter-matrix plan selects diagonal KDE/ECDF and independent upper/lower marks with one linked brush key',
    ),
    trace(
      'upper/lower mark selection',
      'src/marks/analytical-p0.ts',
      'compileAnalyticalScatterMatrixMark',
      'tests/analytical-p0-compiler.test.mjs',
      'scatter-matrix compiler renders independent cell kinds with one linked selection contract',
    ),
    trace(
      'linked brush',
      'src/interaction/advanced-family-runtime.ts',
      'scatterMatrixPointerBrush',
      'tests/scatter-matrix-runtime.test.mjs',
      'one scatter-matrix cell brush highlights the same source rows across every cell',
    ),
  ],
  carpet: [
    trace(
      'logical axis ticks and labels',
      'src/data/specialized-coordinate-analytics.ts',
      'projectCarpet',
      'tests/specialized-coordinate-analytics.test.mjs',
      'carpet projection handles irregular logical axes, masks, ticks and dual projected tooltips',
    ),
    trace(
      'mask policy',
      'src/marks/analytical-p0.ts',
      'maskMatrix',
      'tests/analytical-p0-compiler.test.mjs',
      'carpet and item compilers surface masks, dual coordinates, partial units, and fill direction',
    ),
    trace(
      'dual projected tooltip',
      'src/data/specialized-coordinate-analytics.ts',
      'CarpetPoint',
      'tests/specialized-coordinate-analytics.test.mjs',
      'carpet projection handles irregular logical axes, masks, ticks and dual projected tooltips',
    ),
  ],
  contour: [
    trace(
      'filled and banded contours with polygon-hole topology',
      'src/data/field-analytics.ts',
      'contourField',
      'tests/field-analytics.test.mjs',
      'regular contour fields support explicit and quantile thresholds, isolines, and filled bands',
    ),
    trace(
      'triangulated irregular samples',
      'src/data/field-analytics.ts',
      'irregularTriangles',
      'tests/field-analytics.test.mjs',
      'triangulated irregular samples preserve topology, provenance, and deterministic smoothing',
    ),
    trace(
      'smoothing',
      'src/data/field-analytics.ts',
      'smoothRing',
      'tests/field-analytics.test.mjs',
      'triangulated irregular samples preserve topology, provenance, and deterministic smoothing',
    ),
  ],
  item: [
    trace(
      'explicit waffle/isotype contract',
      'src/data/specialized-coordinate-analytics.ts',
      'layoutItems',
      'tests/specialized-coordinate-analytics.test.mjs',
      'item layout provides waffle/isotype units, partial amounts, direction, grouping and accessible counts',
    ),
    trace(
      'partial units',
      'src/data/specialized-coordinate-analytics.ts',
      'ItemUnit',
      'tests/analytical-p0-compiler.test.mjs',
      'carpet and item compilers surface masks, dual coordinates, partial units, and fill direction',
    ),
    trace(
      'fill direction and grouping',
      'src/data/specialized-coordinate-analytics.ts',
      'ItemLayoutOptions',
      'tests/specialized-coordinate-analytics.test.mjs',
      'item layout provides waffle/isotype units, partial amounts, direction, grouping and accessible counts',
    ),
    trace(
      'accessible counts',
      'src/marks/analytical-p0.ts',
      'compileAnalyticalItemMark',
      'tests/specialized-coordinate-analytics.test.mjs',
      'item layout provides waffle/isotype units, partial amounts, direction, grouping and accessible counts',
    ),
  ],
  'vector-field': [
    trace(
      'vector-to-magnitude transform',
      'src/data/field-analytics.ts',
      'analyzeVectorField',
      'tests/field-analytics.test.mjs',
      'vector fields expose magnitude, direction, normalization, and bounded grid sampling',
    ),
    trace(
      'normalization and sampled grid',
      'src/data/field-analytics.ts',
      'Vector2FieldOptions',
      'tests/field-analytics.test.mjs',
      'complete compiler renders normalized sampled vectors and seeded adaptive streamlines',
    ),
    trace(
      'streamline seeding/integration',
      'src/data/field-analytics.ts',
      'integrateVector',
      'tests/field-analytics.test.mjs',
      'adaptive vector integration is seeded, deterministic, directional, and step bounded',
    ),
  ],
  venn: [
    trace(
      'membership and intersection input',
      'src/data/structured-analytics.ts',
      'analyzeSets',
      'tests/structured-analytics.test.mjs',
      'set analysis computes membership intersections, proportional circles, quality, queries and region hits',
    ),
    trace(
      'proportional two/three-set solve',
      'src/data/structured-analytics.ts',
      'solveCircleDistance',
      'tests/structured-analytics.test.mjs',
      'set solver preserves proportional areas and reports exact versus constrained quality',
    ),
    trace(
      'quality metric and queries',
      'src/data/structured-analytics.ts',
      'querySetRegion',
      'tests/relationship-advanced.test.mjs',
      'Venn compiler derives memberships, proportional quality, exact query and hit metadata',
    ),
    trace(
      'region hit',
      'src/data/structured-analytics.ts',
      'hitSetRegion',
      'tests/venn-runtime-hit.test.mjs',
      'Venn hit testing resolves the actual overlap interior instead of its label marker',
    ),
  ],
  'word-cloud': [
    trace(
      'tokenizer/stopword/n-gram',
      'src/data/structured-analytics.ts',
      'tokenizeWords',
      'tests/structured-analytics.test.mjs',
      'word cloud is seeded, padded, rotation-bounded and collision-free',
    ),
    trace(
      'deterministic seed',
      'src/data/structured-analytics.ts',
      'layoutWordCloud',
      'tests/relationship-advanced.test.mjs',
      'word-cloud compiler has deterministic tokenizer/ngram/seed/padding/rotation Scene output',
    ),
    trace(
      'padding and allowed-rotation API',
      'src/data/structured-analytics.ts',
      'WordCloudLayoutOptions',
      'tests/structured-analytics.test.mjs',
      'word cloud is seeded, padded, rotation-bounded and collision-free',
    ),
  ],
  'price-blocks': [
    trace(
      'Kagi',
      'src/data/finance-analytics.ts',
      'buildKagi',
      'tests/finance-analytics.test.mjs',
      'Kagi applies reversal thresholds and yin-yang thickness changes',
    ),
    trace(
      'three-line break',
      'src/data/finance-analytics.ts',
      'buildLineBreak',
      'tests/finance-analytics.test.mjs',
      'three-line break only emits closes outside the previous line envelope',
    ),
    trace(
      'range bars',
      'src/data/finance-analytics.ts',
      'buildRangeBars',
      'tests/finance-analytics.test.mjs',
      'range bars consume deterministic intrabar paths and preserve exact range',
    ),
    trace(
      'percent/ATR/log sizing',
      'src/data/finance-analytics.ts',
      'sizingResolver',
      'tests/finance-analytics.test.mjs',
      'price blocks support percent, logarithmic, and ATR sizing plus session resets',
    ),
    trace(
      'OHLC-source provenance',
      'src/data/finance-analytics.ts',
      'provenance',
      'tests/finance-analytics.test.mjs',
      'complete compiler renders every advanced price-block mode with portable options and provenance tooltips',
    ),
  ],
  'volume-profile': [
    trace(
      'fixed/visible/session/periodic scope',
      'src/data/finance-analytics.ts',
      'VolumeProfileScope',
      'tests/finance-analytics.test.mjs',
      'session and periodic profiles produce one ordered profile per scope partition',
    ),
    trace(
      'row size',
      'src/data/finance-analytics.ts',
      'resolveRowSize',
      'tests/finance-analytics.test.mjs',
      'fixed and visible volume profiles resolve row size, POC, VAH/VAL, placement, and provenance',
    ),
    trace(
      'POC/VAH/VAL',
      'src/data/finance-analytics.ts',
      'valueArea',
      'tests/finance-analytics.test.mjs',
      'fixed and visible volume profiles resolve row size, POC, VAH/VAL, placement, and provenance',
    ),
    trace(
      'left placement',
      'src/marks/finance-advanced.ts',
      'compileAdvancedVolumeProfileMark',
      'tests/finance-analytics.test.mjs',
      'complete compiler renders left-side session profiles and explicit POC/VAH/VAL guides',
    ),
  ],
  'technical-indicator': [
    trace(
      'calculation coverage for the 28 precomputed-only presets',
      'src/data/technical-indicators.ts',
      'technicalIndicatorCapabilities',
      'tests/technical-indicator-p0.test.mjs',
      'the 28 former supplied-column presets calculate every declared output deterministically',
    ),
    trace(
      'session-aware warm-up policy',
      'src/data/technical-indicators.ts',
      'resolveSessionState',
      'tests/technical-indicator-p0.test.mjs',
      'hard sessions reset warm-up and cumulative state while carry sessions retain it',
    ),
    trace(
      'indicator panes and synchronized crosshair',
      'src/compiler/technical-indicator-panels.ts',
      'materializeTechnicalIndicatorPanes',
      'tests/chart-interaction-runtime.test.mjs',
      'technical indicator pointer crosshair synchronizes every pane and clears on leave',
    ),
    trace(
      'worker-bounded incremental calculation',
      'src/data/technical-indicator-incremental.ts',
      'calculateTechnicalIndicatorIncremental',
      'tests/technical-indicator-p0.test.mjs',
      'all 45 presets advance only the appended suffix and retain one-shot parity',
    ),
  ],
  surface: [
    trace(
      'flat/smooth normal mode',
      'src/spatial/surface-analysis.ts',
      'computeSurfaceNormalGeometry',
      'tests/spatial-p0.test.mjs',
      'surface CPU references preserve smooth topology and exact flat face normals',
    ),
    trace(
      'filled plus wire overlay',
      'src/spatial/compile.ts',
      'compileSurfaceGeometry',
      'tests/spatial-p0.test.mjs',
      'surface P0 compiles flat shading, filled wire overlay and bounded contour projections',
    ),
    trace(
      'contour projection',
      'src/spatial/surface-analysis.ts',
      'extractSurfaceContourSegments',
      'tests/spatial-p0.test.mjs',
      'surface P0 compiles flat shading, filled wire overlay and bounded contour projections',
    ),
  ],
  volume: [
    trace(
      'transfer functions',
      'src/spatial/volume-rendering.ts',
      'evaluateVolumeTransfer',
      'tests/spatial-p0.test.mjs',
      'volume CPU reference executes raycast, MIP, minIP, average, window-level and slices',
    ),
    trace(
      'raycast/MIP/minIP/average',
      'src/spatial/volume-rendering.ts',
      'projectVolumeRays',
      'tests/spatial-p0.test.mjs',
      'volume CPU reference executes raycast, MIP, minIP, average, window-level and slices',
    ),
    trace(
      'orthogonal and oblique slices',
      'src/spatial/volume-rendering.ts',
      'sampleVolumeSlice',
      'tests/spatial-p0.test.mjs',
      'volume P0 emits actual WebGL triangle geometry for projection, caps and arbitrary slices',
    ),
    compositeTrace(
      'caps and window-level',
      [
        source('src/spatial/volume-rendering.ts', 'normalizeVolumeValue'),
        source('src/spatial/compile.ts', 'geometryFromVolumeSlice'),
      ],
      [
        testCase(
          'tests/spatial-p0.test.mjs',
          'volume CPU reference executes raycast, MIP, minIP, average, window-level and slices',
        ),
        testCase(
          'tests/spatial-p0.test.mjs',
          'volume P0 emits actual WebGL triangle geometry for projection, caps and arbitrary slices',
        ),
      ],
    ),
  ],
  'spatial-vector': [
    trace(
      'seeded adaptive field integration',
      'src/spatial/vector-field-integration.ts',
      'integrateVectorField',
      'tests/spatial-p0.test.mjs',
      'seeded adaptive 3D field integration is deterministic, bounded and provenance-rich',
    ),
  ],
};

const sourcePathPattern = /^src\/.+\.ts$/u;
const testPathPattern = /^tests\/.+\.test\.mjs$/u;
const tokenPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;

function assertSafePath(value, pattern, label, rootDir) {
  assert.equal(typeof value, 'string', `${label} path must be a string`);
  assert.match(value, pattern, `${label} path`);
  const resolved = path.resolve(rootDir, value);
  assert.ok(resolved.startsWith(`${path.resolve(rootDir)}${path.sep}`), `${label} path traversal`);
  return resolved;
}

function nodeTestBindings(sourceFile) {
  const bindings = new Set();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== 'node:test' ||
      statement.importClause === undefined
    )
      continue;
    if (statement.importClause.name !== undefined) bindings.add(statement.importClause.name.text);
    const named = statement.importClause.namedBindings;
    if (named !== undefined && ts.isNamedImports(named)) {
      for (const element of named.elements) {
        if ((element.propertyName?.text ?? element.name.text) === 'test')
          bindings.add(element.name.text);
      }
    }
  }
  return bindings;
}

/** Extracts static, runnable, top-level node:test names without executing the test module. */
export function extractNodeTestNames(sourceText) {
  const sourceFile = ts.createSourceFile(
    'traceability.test.mjs',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const bindings = nodeTestBindings(sourceFile);
  assert.ok(bindings.size > 0, 'test file must import test from node:test');
  const names = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression))
      continue;
    const call = statement.expression;
    if (!ts.isIdentifier(call.expression) || !bindings.has(call.expression.text)) continue;
    const first = call.arguments[0];
    assert.ok(
      first !== undefined &&
        (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)),
      'node:test evidence names must be static string literals',
    );
    assert.ok(first.text.trim().length > 0, 'node:test name must not be empty');
    names.push(first.text);
  }
  assert.ok(names.length > 0, 'test file must declare at least one static node:test');
  assert.equal(new Set(names).size, names.length, 'node:test names must be unique per file');
  return names;
}

function sourceHasIdentifier(sourceText, token) {
  const sourceFile = ts.createSourceFile(
    'traceability.ts',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found = false;
  const visit = (node) => {
    if (found) return;
    if (ts.isIdentifier(node) && node.text === token) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/** Fail-closed structural and on-disk validation used by generation and negative tests. */
export async function validateCapabilityTraceability(
  families,
  { rootDir = repositoryRoot, expectedTotal = 161 } = {},
) {
  assert.ok(
    Array.isArray(families) && families.length > 0,
    'traceability families must not be empty',
  );
  const familyIds = new Set();
  const textCache = new Map();
  const read = async (relativePath) => {
    if (!textCache.has(relativePath))
      textCache.set(relativePath, await readFile(path.resolve(rootDir, relativePath), 'utf8'));
    return textCache.get(relativePath);
  };
  let total = 0;
  for (const family of families) {
    assert.equal(typeof family?.id, 'string', 'family id must be a string');
    assert.ok(family.id.trim().length > 0, 'family id must not be empty');
    assert.ok(!familyIds.has(family.id), `duplicate family ${family.id}`);
    familyIds.add(family.id);
    assert.ok(
      Array.isArray(family.capabilities) && family.capabilities.length > 0,
      `${family.id} capabilities must not be empty`,
    );
    assert.ok(Array.isArray(family.traces), `${family.id} traces must be an array`);
    assert.equal(
      family.traces.length,
      family.capabilities.length,
      `${family.id} missing capability trace`,
    );
    assert.equal(
      new Set(family.capabilities).size,
      family.capabilities.length,
      `${family.id} duplicate capability`,
    );
    const traceSignatures = new Set();
    for (let index = 0; index < family.capabilities.length; index += 1) {
      const capability = family.capabilities[index];
      const entry = family.traces[index];
      assert.equal(typeof capability, 'string', `${family.id} capability must be a string`);
      assert.ok(capability.trim().length > 0, `${family.id} capability must not be empty`);
      assert.equal(entry?.capability, capability, `${family.id} capability trace order`);
      assert.ok(
        entry && Array.isArray(entry.sources) && entry.sources.length > 0,
        `${family.id}: ${capability} source evidence must not be empty`,
      );
      assert.ok(
        entry && Array.isArray(entry.tests) && entry.tests.length > 0,
        `${family.id}: ${capability} test evidence must not be empty`,
      );
      const sourceSignatures = new Set();
      for (const evidence of entry.sources) {
        const filename = assertSafePath(evidence?.path, sourcePathPattern, 'source', rootDir);
        assert.equal(typeof evidence?.token, 'string', 'source token must be a string');
        assert.match(evidence.token, tokenPattern, `${family.id}: ${capability} source token`);
        const signature = `${evidence.path}\0${evidence.token}`;
        assert.ok(
          !sourceSignatures.has(signature),
          `${family.id}: ${capability} duplicate source evidence`,
        );
        sourceSignatures.add(signature);
        const sourceText = await read(evidence.path);
        assert.ok(
          sourceHasIdentifier(sourceText, evidence.token),
          `${family.id}: ${capability} missing source token ${evidence.token} in ${path.relative(rootDir, filename)}`,
        );
      }
      const testSignatures = new Set();
      for (const evidence of entry.tests) {
        assertSafePath(evidence?.path, testPathPattern, 'test', rootDir);
        assert.equal(typeof evidence?.name, 'string', 'test name must be a string');
        assert.ok(
          evidence.name.trim().length > 0,
          `${family.id}: ${capability} test name must not be empty`,
        );
        const signature = `${evidence.path}\0${evidence.name}`;
        assert.ok(
          !testSignatures.has(signature),
          `${family.id}: ${capability} duplicate test evidence`,
        );
        testSignatures.add(signature);
        const names = extractNodeTestNames(await read(evidence.path));
        assert.ok(
          names.includes(evidence.name),
          `${family.id}: ${capability} missing node:test name "${evidence.name}" in ${evidence.path}`,
        );
      }
      const traceSignature = JSON.stringify({ sources: entry.sources, tests: entry.tests });
      assert.ok(
        !traceSignatures.has(traceSignature),
        `${family.id}: duplicate capability evidence`,
      );
      traceSignatures.add(traceSignature);
      total += 1;
    }
  }
  assert.equal(
    total,
    expectedTotal,
    `traceability must cover exactly ${expectedTotal} capabilities`,
  );
  return { families: families.length, capabilities: total };
}

export function evidenceFamiliesFromTraceability(traceability = capabilityTraceability) {
  return Object.entries(traceability).map(([id, traces]) => ({
    id,
    capabilities: traces.map(({ capability }) => capability),
    traces,
  }));
}
