import {
  quickChart,
  quickCombo,
  type QuickChartOptions,
  type QuickComboOptions,
} from './api/quick.js';
import { quickScatter } from './api/scatter-dispatch.js';
import {
  compileWithRegistry,
  type CompileOptions,
  type CompileResult,
} from './compiler/compile.js';
import type { MarkCompiler } from './compiler/types.js';
import type { GraflumePlugin } from './core/plugin.js';
import type { RendererFactory } from './renderer/types.js';
import { Chart, type ChartCreateOptions, type ChartTarget } from './runtime/chart.js';
import { createDefaultRegistry, defaultRegistry } from './runtime/default-registry.js';
import type { RuntimeRegistry } from './runtime/registry.js';
import type { ChartSpec, DataInput } from './spec/types.js';
import type { ThemeTokens } from './theme/types.js';
import { specVersion, version } from './version.js';
import { chartTypeCatalog, chartVariantCatalog } from './catalog/chart-types.js';
import { curveNames, curveRegistry, interpolateCurve } from './curve/registry.js';
import {
  colorScaleTypes,
  createColorScale,
  createPositionScale,
  positionScaleTypes,
} from './scale/registry.js';
export { executeTransforms, evaluateTransformExpression } from './data/transforms.js';
export {
  automaticScatterWebGLThreshold,
  dataInputRowCount,
  quickScatter,
  resolveScatterRendererDispatch,
} from './api/scatter-dispatch.js';
export type {
  ScatterRendererDispatch,
  ScatterRendererDispatchReason,
} from './api/scatter-dispatch.js';
export { ScatterWebGLRenderer, scatterWebGLRendererFactory } from './renderer/scatter-webgl.js';
export type { ScatterWebGLDispatchState } from './renderer/scatter-webgl.js';
export type { DataLineage, TransformResult, TransformStepLineage } from './data/transforms.js';
export * from './data/family-analytics.js';
export * from './data/family-layouts.js';
export * from './data/specialized-coordinate-analytics.js';
export {
  analyzeSets,
  buildWordTree,
  chordEdgesToMatrix,
  chordMatrixToEdges,
  funnelStages,
  hitSetRegion,
  layoutChord,
  layoutFlow,
  layoutHierarchy,
  layoutWordCloud,
  projectParallelRows,
  querySetRegion,
  tokenizeWords,
  traverseFlowPath,
} from './data/structured-analytics.js';
export type {
  ChordEdge,
  ChordGroup,
  ChordMatrixInput,
  ChordOptions,
  ChordRibbon,
  FlowAlignment,
  FlowEdge,
  FlowLayoutLink,
  FlowLayoutNode,
  FlowLayoutOptions,
  FlowLayoutResult,
  FlowLinkSort,
  FlowOrder,
  FunnelOptions,
  FunnelStage,
  FunnelStageInput,
  HierarchyDatum,
  HierarchyLayoutMode,
  HierarchyLayoutNode,
  HierarchyLayoutOptions,
  HierarchyLayoutResult,
  ParallelAxis,
  ParallelBrush,
  ParallelProjection,
  ParallelScaleType,
  SetAnalysisResult,
  SetCircle,
  SetIntersectionDatum,
  SetMembershipDatum,
  WordCloudLayoutOptions,
  WordCloudPlacement,
  WordTokenOptions,
  WordTreeNode,
} from './data/structured-analytics.js';
export { layoutNetwork, moveNetworkNode, selectNetworkNodes } from './data/network-analytics.js';
export type {
  NetworkEdgeInput,
  NetworkEdgeRouting,
  NetworkLayoutEdge,
  NetworkLayoutMode,
  NetworkLayoutNode,
  NetworkLayoutOptions,
  NetworkLayoutResult,
  NetworkNodeInput,
  NetworkPort,
} from './data/network-analytics.js';
export {
  MapLayerRegistry,
  MapRuntime,
  MapTileManager,
  createMapRuntime,
  createMapTileManager,
  fetchMapTile,
  fitMapBounds,
  geodesicPath,
  mapBounds,
  mapGraticule,
  normalizeGeoJson,
  projectMapPosition,
  tileUrl,
  topologyToGeoJson,
  wrapLongitude,
} from './geography/map-lifecycle.js';
export type {
  GeoJsonCoordinateGeometry,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonGeometry,
  GeoJsonGeometryCollection,
  GeographicPosition,
  MapBounds,
  MapFit,
  MapLayerDefinition,
  MapProjectionName,
  MapProjectionOptions,
  MapRuntimeOptions,
  MapTileManagerOptions,
  ProjectedPosition,
  TileCoordinate,
  TileFetcher,
  TileResponse,
  TileSourceDefinition,
  Topology,
  TopologyObject,
  TopologyTransform,
} from './geography/map-lifecycle.js';
export {
  DEFAULT_TECHNICAL_INDICATOR_MAX_ROWS,
  MAX_TECHNICAL_INDICATOR_ROWS,
  TechnicalIndicatorIncrementalCalculator,
  calculateTechnicalIndicatorIncremental,
} from './data/technical-indicator-incremental.js';
export type {
  PortableTechnicalIndicatorInput,
  TechnicalIndicatorIncrementalDiagnostics,
  TechnicalIndicatorIncrementalRequest,
  TechnicalIndicatorIncrementalResult,
  TechnicalIndicatorIncrementalRuntimeSnapshot,
  TechnicalIndicatorIncrementalSnapshot,
  TechnicalIndicatorIncrementalSpec,
} from './data/technical-indicator-incremental.js';
export {
  TransformDataflow,
  createTransformDataflow,
  executeTransformBranch,
  executeTransformDataflow,
  executeTransformsWithNamedLineage,
  isNamedDataReference,
  materializeSpecDataflow,
  namedDataLineage,
} from './data/dataflow.js';
export type { TransformDataflowExecution, TransformDataflowState } from './data/dataflow.js';
export {
  IncrementalDataStore,
  createIncrementalDataStore,
  replayIncrementalData,
} from './data/incremental.js';
export type {
  IncrementalDataState,
  IncrementalProvenanceStep,
  IncrementalReplay,
  IncrementalUpdate,
  IncrementalUpdateResult,
} from './data/incremental.js';
export { BoundedRingBuffer, createBoundedRingBuffer } from './data/ring-buffer.js';
export {
  IncrementalTransformPipeline,
  IncrementalStackPipeline,
  createIncrementalTransformPipeline,
  createIncrementalStackPipeline,
  executePortableIncrementalStack,
} from './data/incremental-transform.js';
export type {
  IncrementalStackGroupSnapshot,
  IncrementalStackOptions,
  IncrementalStackReason,
  IncrementalStackSnapshot,
  IncrementalStackState,
  IncrementalStackStep,
  IncrementalStackUpdateResult,
  IncrementalTransformOptions,
  IncrementalTransformState,
  IncrementalTransformStep,
  IncrementalTransformUpdateResult,
  PortableIncrementalStackRequest,
  PortableIncrementalStackResult,
  StackTransformSpec,
} from './data/incremental-transform.js';
export {
  BarVirtualizationController,
  createBarVirtualizationController,
  executePortableBarVirtualization,
} from './data/bar-virtualization.js';
export type {
  BarAggregate,
  BarRankChange,
  BarSortDirection,
  BarVirtualNavigation,
  BarVirtualWindow,
  BarVirtualizationAction,
  BarVirtualizationOptions,
  BarVirtualizationResult,
  BarVirtualizationSnapshot,
  BarVirtualizationState,
  BarVirtualizationStep,
  NormalizedBarVirtualizationOptions,
  PortableBarVirtualizationRequest,
  VirtualRankedBarRow,
} from './data/bar-virtualization.js';
export {
  IncrementalStreamRuntime,
  WorkerStreamRetentionRuntime,
  createIncrementalStreamRuntime,
  createWorkerStreamRetentionRuntime,
  restoreWorkerStreamRetentionRuntime,
} from './data/stream-runtime.js';
export type {
  IncrementalStreamRuntimeState,
  StreamEnqueueOptions,
  StreamFrameScheduler,
  StreamHistoryEntry,
  StreamHistoryPage,
  StreamOverflowPolicy,
  StreamRuntimeSpec,
  WorkerStreamRetentionRuntimeOptions,
} from './data/stream-runtime.js';
export {
  AutomaticWorkerRuntime,
  createAutomaticWorkerRuntime,
  installWorkerRuntime,
  workerRuntimeProtocolVersion,
} from './data/worker-runtime.js';
export type {
  PortableWorkerData,
  WorkerBinaryAdapter,
  WorkerOwnedRenderer,
  WorkerRenderOperation,
  WorkerRenderResult,
  WorkerRuntimeCancelRequest,
  WorkerRuntimeExecuteOptions,
  WorkerRuntimeExecuteRequest,
  WorkerRuntimeFactory,
  WorkerRuntimeFailure,
  WorkerRuntimeInstallOptions,
  WorkerRuntimeOperation,
  WorkerRuntimeOverflowPolicy,
  WorkerRuntimePort,
  WorkerRuntimeRequest,
  WorkerRuntimeResponse,
  WorkerRuntimeResult,
  WorkerRuntimeScope,
  WorkerRuntimeState,
  WorkerRuntimeSuccess,
  WorkerStreamRetentionAction,
  WorkerStreamRetentionOperation,
  WorkerStreamRetentionRequest,
  WorkerStreamRetentionResult,
  WorkerStreamRetentionSnapshot,
  WorkerTransformEngine,
  WorkerTransformOperation,
  WorkerTechnicalIndicatorOperation,
  WorkerWasmTransformAdapter,
} from './data/worker-runtime.js';
export {
  TransformWorkerAdapter,
  createTransformWorkerAdapter,
  installTransformWorker,
  transformWorkerProtocolVersion,
} from './data/worker-protocol.js';
export type {
  TransformWorkerAdapterOptions,
  TransformWorkerExecuteOptions,
  TransformWorkerFailure,
  TransformWorkerPort,
  TransformWorkerRequest,
  TransformWorkerResponse,
  TransformWorkerScope,
  TransformWorkerState,
  TransformWorkerSuccess,
} from './data/worker-protocol.js';

export function create(target: ChartTarget, spec: ChartSpec, options?: ChartCreateOptions): Chart {
  return new Chart(target, spec, defaultRegistry, options);
}

export { curveNames, curveRegistry, interpolateCurve };
export { colorScaleTypes, createColorScale, createPositionScale, positionScaleTypes };
export { seriesStackModes } from './data/series-stack.js';
export {
  compositionOperators,
  maximumCompositionDepth,
  maximumCompositionLayers,
  maximumCompositionViews,
  maximumLayerCompositionChildren,
} from './spec/composition.js';
export type { CompositionKind, ResolvedCompositionResolve } from './spec/composition.js';

export function compile(spec: ChartSpec, options?: CompileOptions): CompileResult {
  return compileWithRegistry(spec, defaultRegistry, options);
}

export function line(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'line', target, data, options);
}

export function bar(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'bar', target, data, options);
}

export function point(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'point', target, data, options);
}

/**
 * Creates a scatter chart. This is the chart-oriented alias of `point()`;
 * both APIs compile to the portable `point` mark in ChartSpec 0.1.
 */
export function scatter(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickScatter(create, target, data, options);
}

export function area(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return quickChart(create, 'area', target, data, options);
}

function specialized(
  type: Parameters<typeof quickChart>[1],
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
  markDefaults: NonNullable<QuickChartOptions['mark']> = {},
): Chart {
  return quickChart(create, type, target, data, {
    ...options,
    mark: {
      ...markDefaults,
      ...options.mark,
      fields: { ...markDefaults.fields, ...options.mark?.fields },
      options: { ...markDefaults.options, ...options.mark?.options },
    },
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

export function gaugeNumber(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('gauge', target, data, options, { options: { mode: 'number' } });
}

export function gaugeDelta(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('gauge', target, data, options, {
    fields: { reference: 'reference' },
    options: { mode: 'delta' },
  });
}

export function gaugeBullet(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('gauge', target, data, options, {
    fields: { target: 'target' },
    options: { mode: 'bullet' },
  });
}

export function geo(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('geo', target, data, options);
}

export function histogram(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('histogram', target, data, options);
}

/** Canonical API for histogram, empirical, KDE, box, violin, curve, and bivariate modes. */
export function distribution(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('distribution', target, data, options, { options: { mode: 'histogram' } });
}

export function violin(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('distribution', target, data, options, { options: { mode: 'violin' } });
}

export function ecdf(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('distribution', target, data, options, { options: { mode: 'ecdf' } });
}

export function ccdf(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('distribution', target, data, options, { options: { mode: 'ccdf' } });
}

export function kde(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('distribution', target, data, options, { options: { mode: 'kde' } });
}

export function histogram2d(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('distribution', target, data, options, {
    options: { mode: 'histogram-2d' },
  });
}

export function histogram2dContour(
  target: ChartTarget,
  data: DataInput,
  options: QuickChartOptions,
): Chart {
  return specialized('distribution', target, data, options, {
    options: { mode: 'histogram-2d-contour' },
  });
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

export function icicle(target: ChartTarget, data: DataInput, options: QuickChartOptions): Chart {
  return specialized('treemap', target, data, options, {
    fields: { parent: 'parent' },
    options: { mode: 'icicle' },
  });
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

export function registerTheme(theme: ThemeTokens): void {
  defaultRegistry.registerTheme(theme);
}

export function registerRenderer(factory: RendererFactory): void {
  defaultRegistry.registerRenderer(factory);
}

export function registerMark(type: string, compiler: MarkCompiler): void {
  defaultRegistry.registerMark(type, compiler);
}

export function use(plugin: GraflumePlugin): void {
  defaultRegistry.use(plugin);
}

export function capabilities(): ReturnType<RuntimeRegistry['capabilities']> {
  return defaultRegistry.capabilities();
}

export const createRegistry = createDefaultRegistry;
export { chartTypeCatalog, chartVariantCatalog };

export { Chart, specVersion, version };
export {
  adaptChartSpec,
  adaptiveCapabilityCatalog,
  adaptiveContractVersion,
  adaptiveMediaQueries,
  adaptiveProfileCatalog,
  adaptiveStateSignature,
  adaptiveTheme,
  applyAdaptiveSurface,
  createAdaptiveEnvironment,
  detectBrowserAdaptiveEnvironment,
  estimateSpecRowCount,
  normalizeAdaptiveOptions,
  resolveAdaptiveProfile,
} from './adaptive/capabilities.js';
export * from './demo/recipes.js';
export { assertValidSpec, validateSpec } from './spec/validate.js';
export { normalizeSpec } from './spec/normalize.js';
export { DataTable } from './data/table.js';
export { RuntimeRegistry } from './runtime/registry.js';
export { CanvasRenderer, canvasRendererFactory } from './renderer/canvas.js';
export {
  builtInThemeCatalog,
  defaultThemeId,
  graflumeDark,
  graflumeGgplot,
  graflumeLight,
  graflumeMatplotlib,
  graflumeRBase,
} from './theme/defaults.js';
export { pluginApiVersion } from './core/plugin.js';
export { GraflumeError } from './core/errors.js';
export { hitTestScene } from './interaction/hit-test.js';
export {
  MarkLabelHistory,
  cloneMarkLabelPosition,
  cloneMarkLabelPositions,
  hitTestMarkLabel,
  setMarkLabelOffset,
  snapMarkLabelOffset,
} from './interaction/mark-label-authoring.js';
export {
  AnalyticSelectionStore,
  analyticSelectionKey,
  analyticSelectionMatches,
  analyticSelectionPredicate,
  analyticSelectionVersion,
  emptyAnalyticSelectionState,
  maximumAnalyticSelections,
  maximumCategoricalSelectionValues,
  maximumLassoPoints,
  normalizeAnalyticSelectionState,
} from './interaction/analytic-selection.js';
export {
  addAnalyticKeyboardVertex,
  completeAnalyticKeyboardSelection,
  moveAnalyticKeyboardGesture,
  previewAnalyticKeyboardSelection,
  startAnalyticKeyboardGesture,
} from './interaction/analytic-keyboard.js';
export {
  LinkedViewStateStore,
  emptyLinkedViewState,
  linkedViewStateVersion,
  maximumLinkedAnalyticViews,
  normalizeLinkedViewState,
} from './interaction/linked-view-store.js';
export * from './interaction/advanced-family-runtime.js';
export {
  SemanticFocusStore,
  createSemanticFocusStore,
  defaultSemanticFocusStore,
} from './interaction/semantic-focus-store.js';
export type {
  LinkedFocusSpec,
  SemanticFocusChange,
  SemanticFocusMatch,
  SemanticFocusState,
  SemanticFocusStoreOptions,
  SemanticFocusTarget,
} from './interaction/semantic-focus-store.js';
export {
  VirtualDataExplorer,
  createVirtualDataExplorer,
  normalizeVirtualDataExplorerSpec,
} from './interaction/virtual-data-explorer.js';
export type {
  ExplorerNavigationKey,
  NormalizedVirtualDataExplorerSpec,
  VirtualDataExplorerSpec,
  VirtualDataWindow,
} from './interaction/virtual-data-explorer.js';
export {
  cartesianAxisChannel,
  clampPixelToPlot,
  domainPointToPixel,
  domainToPixel,
  pixelAxisToSelection,
  pixelLassoToSelection,
  pixelPointToDomain,
  pixelRectangleToSelection,
  pixelToDomain,
  selectionToPixels,
} from './interaction/cartesian-coordinates.js';
export {
  domainAxisWindow,
  domainForAxisWindow,
  domainViewIsIdentity,
  domainViewVersion,
  emptyDomainViewState,
  normalizeDomainViewState,
  panDomainAxisWindow,
  panDomainByPixels,
  zoomDomainAtPixel,
  zoomDomainAxisWindow,
} from './interaction/domain-navigation.js';
export {
  flowRuntimeOptions,
  networkRuntimeOptions,
  normalizeFlowRuntimeState,
  normalizeNetworkRuntimeState,
  normalizeTableRuntimeState,
  tableRuntimeOptions,
} from './interaction/family-runtime.js';

export type { QuickChartOptions, QuickComboOptions } from './api/quick.js';
export type {
  ChartFamilyEntry,
  ChartTypeId,
  ChartVariantEntry,
  ChartVariantId,
} from './catalog/chart-types.js';
export type {
  ChartAdaptiveChangeEvent,
  ChartAccessibilityState,
  ChartCreateOptions,
  ChartErrorEvent,
  ChartEventMap,
  ChartFamilyFocusChangeEvent,
  ChartFamilyFocusState,
  ChartFlowChangeEvent,
  ChartHeatmapChangeEvent,
  ChartHierarchyChangeEvent,
  ChartFullscreenChangeEvent,
  ChartLegendChangeEvent,
  ChartLegendChangeReason,
  ChartLegendItemState,
  ChartLegendState,
  ChartSelectionChangeEvent,
  ChartSelectionChangeReason,
  ChartSelectionState,
  ChartScatterMatrixChangeEvent,
  ChartTableChangeEvent,
  ChartTableEditChangeEvent,
  ChartAnalyticSelectionChangeEvent,
  ChartAnalyticSelectionChangeReason,
  ChartDomainViewChangeEvent,
  ChartDomainViewChangeReason,
  ChartAnnotationChangeEvent,
  ChartAnnotationChangeReason,
  ChartAnnotationVisibilityChangeEvent,
  ChartAnnotationVisibilityChangeReason,
  ChartMarkLabelChangeEvent,
  ChartMarkLabelChangeReason,
  ChartMarkLabelState,
  ChartNetworkChangeEvent,
  ChartNavigatorChangeEvent,
  ChartParallelChangeEvent,
  ChartPlaybackChangeEvent,
  ChartPlaybackChangeReason,
  ChartPlaybackFrameChangeEvent,
  ChartPlaybackNamedFrameState,
  ChartPlaybackRangeState,
  ChartPlaybackState,
  ChartPointerEvent,
  ChartRenderEvent,
  ChartResizeEvent,
  ChartTarget,
  ChartViewChangeEvent,
  ChartViewChangeReason,
  ChartViewPoint,
  ChartViewState,
} from './runtime/chart.js';
export type {
  TableCellTarget,
  TableDataMode,
  TableEditChangeReason,
  TableEditCommit,
  TableEditorType,
} from './runtime/table-edit.js';
export type {
  AdaptiveCapabilityCategory,
  AdaptiveCapabilityDefinition,
  AdaptiveCapabilityId,
  AdaptiveDisplayClass,
  AdaptiveEnvironment,
  AdaptiveEnvironmentInput,
  AdaptiveInputClass,
  AdaptiveMotionClass,
  AdaptiveOptions,
  AdaptiveProfileDefinition,
  AdaptiveProfileId,
  AdaptiveResourceClass,
  AdaptiveSafeAreaInsets,
  AdaptiveState,
  AdaptiveViewportClass,
  NormalizedAdaptiveOptions,
} from './adaptive/capabilities.js';
export type {
  ChartFlowRuntimeState,
  ChartNetworkRuntimeState,
  ChartRuntimeNodePosition,
  ChartTableFilter,
  ChartTableGroup,
  ChartTablePivot,
  ChartTableRuntimeState,
  ChartTableSort,
} from './interaction/family-runtime.js';
export type { GraflumePlugin, PluginContext } from './core/plugin.js';
export type { MarkCompileContext, MarkCompiler, PlotArea } from './compiler/types.js';
export type { CompileCoordinateView, CompileOptions, CompileResult } from './compiler/compile.js';
export type {
  InspectionViewTransform,
  Renderer,
  RendererCapabilities,
  RendererFactory,
} from './renderer/types.js';
export type {
  Scene,
  SceneNode,
  AnalyticalFamilySceneMetadata,
  DatumReference,
  FamilyDatumInteraction,
  MarkLabelSceneEntry,
  MarkLabelSceneMetadata,
  TechnicalIndicatorSceneMetadata,
  TechnicalIndicatorPanelSceneMetadata,
  TechnicalIndicatorCrosshairSceneMetadata,
} from './scene/types.js';
export { toAccessibleRows } from './scene/semantic.js';
export type {
  AccessibleRow,
  SemanticChannel,
  SemanticLineage,
  SemanticMark,
} from './scene/semantic.js';
export type {
  AccessibilitySpec,
  AccessibilityLiveSpec,
  AnnotationConnectorSpec,
  AnnotationSpec,
  AnnotationStyleSpec,
  AxisRangeTargetSpec,
  AxisFontSpec,
  AxisFormatInput,
  AxisFormatSpec,
  AxisChannel,
  AxisId,
  AxisLabelOrientation,
  AxisLabelSpec,
  AxisPosition,
  AxisSpec,
  AxisStrokeSpec,
  AxisTickSpec,
  AxisTitleSpec,
  AxisValueFormat,
  ChartSpec,
  ColumnarData,
  CompositionResolveMode,
  CompositionResolveSpec,
  ControlLabelsSpec,
  ControlsSpec,
  DomainNavigationSpec,
  DataInput,
  DataRow,
  DataValue,
  DatumTargetSpec,
  DecorationTargetSpec,
  EncodingInput,
  EncodingChannel,
  EncodingConditionSpec,
  EncodingMap,
  EncodingSpec,
  ChannelEncodingInput,
  ChannelEncodingSpec,
  FacetCompositionSpec,
  FacetFieldInput,
  FacetFieldSpec,
  FieldType,
  InteractionSpec,
  InsetCompositionSpec,
  HighlightSpec,
  HighlightStyleSpec,
  JsonPrimitive,
  JsonValue,
  LayerSpec,
  LayerClipSpec,
  LayerDomainClipSpec,
  LayerPlotClipSpec,
  LayerTargetSpec,
  LegendItemSpec,
  LegendLabelsSpec,
  LegendMode,
  LegendPosition,
  LegendSpec,
  MarkInput,
  MarkLabelAuthoringSpec,
  MarkLabelCollision,
  MarkLabelConnectorSpec,
  MarkLabelPlacement,
  MarkLabelPositionSpec,
  MarkLabelSnapSpec,
  MarkLabelSpec,
  MarkLabelStyleSpec,
  MarkSpec,
  MarkType,
  NamedDataReference,
  NavigationSpec,
  NavigationWheelMode,
  NormalizedChartSpec,
  NormalizedControlLabelsSpec,
  NormalizedControlsSpec,
  NormalizedDomainNavigationSpec,
  NormalizedLegendItemSpec,
  NormalizedLegendSpec,
  NormalizedMarkLabelAuthoringSpec,
  NormalizedMarkLabelSnapSpec,
  NormalizedMarkLabelSpec,
  NormalizedNavigationSpec,
  NormalizedPlaybackSpec,
  NormalizedSelectionSpec,
  PerformanceProfile,
  PlaybackDirection,
  PlaybackFrameReference,
  PlaybackMode,
  PlaybackNamedFrameSpec,
  PlaybackRangeSpec,
  PlaybackSpec,
  PlaybackTransitionEasing,
  PlaybackTransitionSpec,
  PlotTargetSpec,
  RangeTargetSpec,
  RendererPreference,
  RepeatCompositionSpec,
  RepeatItemSpec,
  ScaleSpec,
  ScaleOutOfBounds,
  ScaleType,
  SelectionSpec,
  StreamingMode,
  StreamingOverflowPolicy,
  StreamingRuntimeSpec,
  StreamingSpec,
  WorkerRuntimeSpec,
  TitleSpec,
  TooltipFieldInput,
  TooltipFieldSpec,
  TooltipSpec,
  TooltipAxis,
  TooltipTrigger,
  TooltipValueFormat,
  AggregateFieldSpec,
  AggregateOperation,
  TransformExpression,
  TransformDataflowNodeSpec,
  TransformDataflowSpec,
  TransformSortField,
  TransformSpec,
  WindowFieldSpec,
} from './spec/types.js';
export type {
  AnalyticAxisSelection,
  AnalyticCategoricalExtent,
  AnalyticDomainPoint,
  AnalyticDomainValue,
  AnalyticIntervalSelection,
  AnalyticLassoSelection,
  AnalyticPointSelection,
  AnalyticRectangleSelection,
  AnalyticSelection,
  AnalyticSelectionCombine,
  AnalyticSelectionExtent,
  AnalyticSelectionSample,
  AnalyticSelectionState,
  AnalyticSelectionUpdate,
} from './interaction/analytic-selection.js';
export type { AnalyticKeyboardGesture } from './interaction/analytic-keyboard.js';
export type {
  LinkedViewState,
  LinkedViewStateChange,
  LinkedViewStateListener,
} from './interaction/linked-view-store.js';
export type {
  CartesianCoordinateContext,
  PixelPoint,
} from './interaction/cartesian-coordinates.js';
export type { DomainAxisWindow, DomainViewState } from './interaction/domain-navigation.js';
export type {
  ColorScale,
  ColorScaleDescriptor,
  ColorScaleType,
  PositionScaleDescriptor,
  PositionScaleType,
  Scale,
  ScaleOutOfBounds as RuntimeScaleOutOfBounds,
  Tick,
} from './scale/types.js';
export type { ThemeTokens } from './theme/types.js';
export type { DeepPartial } from './utils/object.js';
export type {
  CurveInterpolator,
  CurveName,
  CurveOptions,
  MissingValuePolicy,
} from './curve/registry.js';
export type {
  ResolvedSeriesStackSpec,
  SeriesStackMode,
  SeriesStackOffset,
  SeriesStackOrder,
  SeriesStackSpec,
} from './data/series-stack.js';
