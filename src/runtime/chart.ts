import {
  compileWithRegistry,
  type CompileCoordinateView,
  type CompileResult,
} from '../compiler/compile.js';
import {
  adaptChartSpec,
  adaptiveMediaQueries,
  adaptiveStateSignature,
  applyAdaptiveSurface,
  detectBrowserAdaptiveEnvironment,
  estimateSpecRowCount,
  normalizeAdaptiveOptions,
  resolveAdaptiveProfile,
  type AdaptiveOptions,
  type AdaptiveState,
  type NormalizedAdaptiveOptions,
} from '../adaptive/capabilities.js';
import { GraflumeError } from '../core/errors.js';
import { EventEmitter } from '../core/events.js';
import { DataTable } from '../data/table.js';
import { moveTableCell, nextPieSlice } from '../data/family-layouts.js';
import {
  IncrementalDataStore,
  incrementalContractsMatch,
  type IncrementalDataState,
  type IncrementalReplay,
  type IncrementalUpdate,
} from '../data/incremental.js';
import {
  IncrementalStreamRuntime,
  type IncrementalStreamRuntimeState,
  type StreamEnqueueOptions,
  type StreamFrameScheduler,
  type StreamHistoryPage,
} from '../data/stream-runtime.js';
import { AutomaticWorkerRuntime, type WorkerRuntimeFactory } from '../data/worker-runtime.js';
import { hitTestAxisTooltip } from '../interaction/axis-hit-test.js';
import {
  AnalyticSelectionStore,
  analyticSelectionVersion,
  emptyAnalyticSelectionState,
  normalizeAnalyticSelectionState,
  type AnalyticSelection,
  type AnalyticSelectionState,
  type AnalyticSelectionUpdate,
} from '../interaction/analytic-selection.js';
import {
  addAnalyticKeyboardVertex,
  completeAnalyticKeyboardSelection,
  moveAnalyticKeyboardGesture,
  previewAnalyticKeyboardSelection,
  startAnalyticKeyboardGesture,
  type AnalyticKeyboardGesture,
} from '../interaction/analytic-keyboard.js';
import { AccessibilityMirrorController } from '../interaction/accessibility.js';
import {
  defaultSemanticFocusStore,
  type SemanticFocusChange,
  type SemanticFocusStore,
} from '../interaction/semantic-focus-store.js';
import {
  cartesianAxisChannel,
  domainToPixel as mapDomainToPixel,
  pixelToDomain as mapPixelToDomain,
  pixelAxisToSelection,
  pixelLassoToSelection,
  pixelPointToDomain,
  pixelRectangleToSelection,
  type PixelPoint,
} from '../interaction/cartesian-coordinates.js';
import { sceneLegendLayout } from '../compiler/legend.js';
import {
  ControlsController,
  type ControlsActions,
  type ControlsState,
} from '../interaction/controls.js';
import { hitTestScene, type HitResult } from '../interaction/hit-test.js';
import {
  flowRuntimeOptions,
  networkRuntimeOptions,
  normalizeFlowRuntimeState,
  normalizeNetworkRuntimeState,
  normalizeTableRuntimeState,
  tableRuntimeOptions,
  type ChartFlowRuntimeState,
  type ChartNetworkRuntimeState,
  type ChartRuntimeNodePosition,
  type ChartTableFilter,
  type ChartTableGroup,
  type ChartTablePivot,
  type ChartTableRuntimeState,
  type ChartTableSort,
} from '../interaction/family-runtime.js';
import {
  heatmapRuntimeOptions,
  hierarchyRuntimeOptions,
  invertParallelAxis as invertParallelAxisState,
  navigatorRuntimeOptions,
  normalizeHeatmapRuntimeState,
  normalizeHierarchyRuntimeState,
  normalizeNavigatorRuntimeState,
  normalizeParallelRuntimeState,
  normalizeScatterMatrixRuntimeState,
  parallelRuntimeOptions,
  reorderParallelAxis as reorderParallelAxisState,
  scatterMatrixPointerBrush,
  scatterMatrixRuntimeOptions,
  selectScatterMatrixRows,
  setParallelBrushExtents,
  translateNavigatorWindow,
  type ChartHeatmapRuntimeState,
  type ChartHierarchyRuntimeState,
  type ChartNavigatorFamily,
  type ChartNavigatorRuntimeState,
  type ChartParallelAxisRuntimeState,
  type ChartParallelRuntimeState,
  type ChartScatterMatrixRuntimeState,
  type HeatmapCellInteraction,
  type NavigatorWindowInteraction,
  type ScatterMatrixCellInteraction,
} from '../interaction/advanced-family-runtime.js';
import { LegendController } from '../interaction/legend.js';
import {
  AnnotationAuthoringHistory,
  editAnnotationByKeyboard,
  editAnnotationByPointer,
  hitTestAnnotationHandle,
  type AnnotationResizeHandle,
} from '../interaction/annotation-authoring.js';
import {
  MarkLabelHistory,
  cloneMarkLabelPositions,
  hitTestMarkLabel,
  setMarkLabelOffset,
  snapMarkLabelOffset,
} from '../interaction/mark-label-authoring.js';
import {
  constrainInspectionView,
  identityInspectionView,
  inverseInspectionPoint,
  panInspectionView,
  zoomInspectionView,
  type InspectionViewPoint,
  type InspectionViewState,
} from '../interaction/inspection-view.js';
import {
  domainAxisWindow,
  domainViewIsIdentity,
  emptyDomainViewState,
  normalizeDomainViewState,
  panDomainByPixels,
  zoomDomainAtPixel,
  type DomainViewState,
} from '../interaction/domain-navigation.js';
import type {
  LinkedViewStateChange,
  LinkedViewStateStore,
} from '../interaction/linked-view-store.js';
import {
  collectPlaybackFrames,
  playbackFrameKey,
  playbackSpec,
  resolvePlaybackTimeline,
  type ResolvedPlaybackNamedFrame,
  type ResolvedPlaybackRange,
} from '../interaction/playback.js';
import { resolveTooltipContent, TooltipController } from '../interaction/tooltip.js';
import type { Renderer } from '../renderer/types.js';
import { easeSceneProgress, interpolateScene } from '../scene/interpolate.js';
import { normalizeSpec } from '../spec/normalize.js';
import type {
  ChartSpec,
  AnnotationSpec,
  AxisId,
  DataInput,
  DataRow,
  DataValue,
  DatumTargetSpec,
  DecorationTargetSpec,
  MarkLabelPositionSpec,
  MarkInput,
  NormalizedChartSpec,
  NormalizedNavigationSpec,
  NormalizedDomainNavigationSpec,
  NormalizedMarkLabelAuthoringSpec,
  NormalizedPlaybackSpec,
  NormalizedSelectionSpec,
  PlaybackDirection,
  PlaybackFrameReference,
  PlaybackMode,
  PlaybackRangeSpec,
  PlaybackTransitionEasing,
  TransformSpec,
} from '../spec/types.js';
import type {
  AnnotationSceneEntry,
  DatumReference,
  FamilyDatumInteraction,
  MarkLabelSceneEntry,
  Point,
  Rect,
  Scene,
  SceneNode,
} from '../scene/types.js';
import { toAccessibleRows, type AccessibleRow, type SemanticMark } from '../scene/semantic.js';
import type { RuntimeRegistry } from './registry.js';
import { RenderScheduler } from './scheduler.js';

export type ChartTarget = string | HTMLElement;

export interface ChartCreateOptions {
  readonly autoResize?: boolean;
  readonly width?: number;
  readonly height?: number;
  readonly pixelRatio?: number;
  /** Capability-driven responsive/display/input adaptation; enabled by default. */
  readonly adaptive?: boolean | AdaptiveOptions;
  /** Runtime-only focus store; authored linkedFocus remains function-free. */
  readonly focusStore?: SemanticFocusStore;
  /** Injectable frame scheduler for deterministic streaming tests or host coordination. */
  readonly streamScheduler?: StreamFrameScheduler;
  /** Injectable Worker construction boundary; omitted in ordinary browsers. */
  readonly workerFactory?: WorkerRuntimeFactory;
  /** Runtime-only shared analytic selection and domain state. */
  readonly linkedViewStore?: LinkedViewStateStore;
}

export interface ChartRenderEvent {
  readonly chart: Chart;
  readonly scene: Scene;
}

export interface ChartPointerEvent {
  readonly chart: Chart;
  readonly hit: HitResult | null;
  readonly sourceEvent: PointerEvent;
}

export interface ChartResizeEvent {
  readonly chart: Chart;
  readonly width: number;
  readonly height: number;
}

export interface ChartAdaptiveChangeEvent {
  readonly chart: Chart;
  readonly state: AdaptiveState;
  readonly previous: AdaptiveState;
}

export interface ChartErrorEvent {
  readonly chart: Chart;
  readonly error: unknown;
}

/** State for inspection-only magnification of the complete rendered chart. */
export interface ChartViewState extends InspectionViewState {
  readonly enabled: boolean;
}

export interface ChartViewPoint extends InspectionViewPoint {}

export type ChartViewChangeReason = 'zoom' | 'pan' | 'reset' | 'resize';

export interface ChartViewChangeEvent {
  readonly chart: Chart;
  readonly view: ChartViewState;
  readonly reason: ChartViewChangeReason;
}

export interface ChartPlaybackState {
  readonly enabled: boolean;
  readonly frames: readonly DataValue[];
  readonly index: number;
  readonly frame?: DataValue;
  readonly playing: boolean;
  readonly rate: number;
  readonly loop: boolean;
  readonly mode: PlaybackMode;
  readonly direction: PlaybackDirection;
  readonly range?: ChartPlaybackRangeState;
  readonly namedFrames: readonly ChartPlaybackNamedFrameState[];
  readonly name?: string;
  /** Human-facing named-frame label, falling back to the formatted frame value. */
  readonly label: string;
}

export type ChartPlaybackChangeReason =
  'play' | 'pause' | 'step' | 'seek' | 'rate' | 'loop' | 'direction' | 'range' | 'spec';

export interface ChartPlaybackNamedFrameState {
  readonly name: string;
  readonly value: string | number | boolean;
  readonly index: number;
}

export interface ChartPlaybackRangeState {
  readonly start: number;
  readonly end: number;
  readonly startFrame: DataValue;
  readonly endFrame: DataValue;
}

export interface ChartPlaybackChangeEvent {
  readonly chart: Chart;
  readonly state: ChartPlaybackState;
  readonly reason: ChartPlaybackChangeReason;
}

/** Renderer-neutral frame landmark event suitable for host accessibility announcements. */
export interface ChartPlaybackFrameChangeEvent {
  readonly chart: Chart;
  readonly state: ChartPlaybackState;
  readonly reason: 'step' | 'seek' | 'range' | 'spec';
  readonly previousIndex?: number;
  readonly label: string;
}

export interface ChartFullscreenChangeEvent {
  readonly chart: Chart;
  readonly active: boolean;
}

export interface ChartLegendItemState {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly visible: boolean;
  readonly toggleable: boolean;
  readonly layerId?: string;
  readonly value?: import('../spec/types.js').JsonPrimitive;
}

export interface ChartLegendState {
  readonly enabled: boolean;
  readonly items: readonly ChartLegendItemState[];
}

export type ChartLegendChangeReason = 'toggle' | 'programmatic' | 'reset' | 'spec';

export interface ChartLegendChangeEvent {
  readonly chart: Chart;
  readonly state: ChartLegendState;
  readonly reason: ChartLegendChangeReason;
}

export interface ChartSelectionState {
  readonly enabled: boolean;
  readonly items: readonly DatumTargetSpec[];
}

export type ChartSelectionChangeReason = 'click' | 'keyboard' | 'programmatic' | 'clear' | 'spec';

export interface ChartSelectionChangeEvent {
  readonly chart: Chart;
  readonly state: ChartSelectionState;
  readonly reason: ChartSelectionChangeReason;
}

export type ChartAnalyticSelectionChangeReason =
  'pointer' | 'keyboard' | 'linked' | 'programmatic' | 'clear' | 'spec';

export interface ChartAnalyticSelectionChangeEvent {
  readonly chart: Chart;
  readonly state: AnalyticSelectionState;
  readonly reason: ChartAnalyticSelectionChangeReason;
}

export type ChartDomainViewChangeReason =
  'zoom' | 'pan' | 'reset' | 'linked' | 'programmatic' | 'spec';

export interface ChartDomainViewChangeEvent {
  readonly chart: Chart;
  readonly state: DomainViewState;
  readonly reason: ChartDomainViewChangeReason;
}

export interface ChartAccessibilityState {
  readonly enabled: boolean;
  readonly table: false | 'hidden' | 'visible';
  readonly navigation: boolean;
  readonly rowCount: number;
  readonly focusedId?: string;
}

export type ChartAnnotationChangeReason =
  | 'set'
  | 'add'
  | 'update'
  | 'remove'
  | 'pointer'
  | 'keyboard'
  | 'undo'
  | 'redo'
  | 'select'
  | 'spec';

export interface ChartAnnotationChangeEvent {
  readonly chart: Chart;
  readonly annotations: readonly AnnotationSpec[];
  readonly reason: ChartAnnotationChangeReason;
  readonly id?: string;
}

export interface ChartAnnotationAuthoringState {
  readonly annotations: readonly AnnotationSpec[];
  readonly handles: readonly AnnotationSceneEntry[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly activeId?: string;
}

export type ChartAnnotationVisibilityChangeReason = 'toggle' | 'programmatic' | 'spec';

export interface ChartAnnotationVisibilityChangeEvent {
  readonly chart: Chart;
  readonly visible: boolean;
  readonly reason: ChartAnnotationVisibilityChangeReason;
}

export interface ChartMarkLabelState {
  readonly enabled: boolean;
  readonly authoring: boolean;
  readonly labels: readonly MarkLabelSceneEntry[];
  readonly positions: readonly MarkLabelPositionSpec[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly activeId?: string;
}

export type ChartMarkLabelChangeReason =
  'set' | 'programmatic' | 'pointer' | 'keyboard' | 'undo' | 'redo' | 'reset' | 'select' | 'spec';

export interface ChartMarkLabelChangeEvent {
  readonly chart: Chart;
  readonly state: ChartMarkLabelState;
  readonly reason: ChartMarkLabelChangeReason;
  readonly id?: string;
}

export type ChartFamilyFocusState =
  | { readonly kind: 'pie-slice'; readonly layerId: string; readonly id: string }
  | {
      readonly kind: 'table-cell';
      readonly layerId: string;
      readonly row: number;
      readonly column: number;
      readonly field: string;
    };

export interface ChartFamilyFocusChangeEvent {
  readonly chart: Chart;
  readonly state: ChartFamilyFocusState | null;
  readonly reason: 'pointer' | 'keyboard' | 'programmatic' | 'clear' | 'spec';
}

export interface ChartTableChangeEvent {
  readonly chart: Chart;
  readonly layerId: string;
  readonly state: ChartTableRuntimeState;
  readonly reason: 'pointer' | 'keyboard' | 'programmatic' | 'reset' | 'spec';
}

export interface ChartNetworkChangeEvent {
  readonly chart: Chart;
  readonly layerId: string;
  readonly state: ChartNetworkRuntimeState;
  readonly reason: 'pointer' | 'programmatic' | 'reset' | 'spec';
}

export interface ChartFlowChangeEvent {
  readonly chart: Chart;
  readonly layerId: string;
  readonly state: ChartFlowRuntimeState;
  readonly reason: 'pointer' | 'programmatic' | 'reset' | 'spec';
}

export interface ChartNavigatorChangeEvent {
  readonly chart: Chart;
  readonly layerId: string;
  readonly family: ChartNavigatorFamily;
  readonly state: ChartNavigatorRuntimeState;
  readonly reason: 'pointer' | 'programmatic' | 'reset' | 'spec';
}

export interface ChartHierarchyChangeEvent {
  readonly chart: Chart;
  readonly layerId: string;
  readonly state: ChartHierarchyRuntimeState;
  readonly reason: 'pointer' | 'programmatic' | 'reset' | 'spec';
}

export interface ChartParallelChangeEvent {
  readonly chart: Chart;
  readonly layerId: string;
  readonly state: ChartParallelRuntimeState;
  readonly reason: 'pointer' | 'programmatic' | 'reset' | 'spec';
}

export interface ChartHeatmapChangeEvent {
  readonly chart: Chart;
  readonly layerId: string;
  readonly state: ChartHeatmapRuntimeState;
  readonly reason: 'pointer' | 'programmatic' | 'reset' | 'spec';
}

export interface ChartScatterMatrixChangeEvent {
  readonly chart: Chart;
  readonly layerId: string;
  readonly state: ChartScatterMatrixRuntimeState;
  readonly reason: 'pointer' | 'programmatic' | 'reset' | 'spec';
}

export interface ChartEventMap {
  readonly render: ChartRenderEvent;
  readonly hover: ChartPointerEvent;
  readonly click: ChartPointerEvent;
  readonly resize: ChartResizeEvent;
  readonly adaptivechange: ChartAdaptiveChangeEvent;
  readonly viewchange: ChartViewChangeEvent;
  readonly playbackchange: ChartPlaybackChangeEvent;
  readonly playbackframechange: ChartPlaybackFrameChangeEvent;
  readonly fullscreenchange: ChartFullscreenChangeEvent;
  readonly legendchange: ChartLegendChangeEvent;
  readonly selectionchange: ChartSelectionChangeEvent;
  readonly analyticselectionchange: ChartAnalyticSelectionChangeEvent;
  readonly domainviewchange: ChartDomainViewChangeEvent;
  readonly annotationchange: ChartAnnotationChangeEvent;
  readonly annotationvisibilitychange: ChartAnnotationVisibilityChangeEvent;
  readonly marklabelchange: ChartMarkLabelChangeEvent;
  readonly familyfocuschange: ChartFamilyFocusChangeEvent;
  readonly tablechange: ChartTableChangeEvent;
  readonly networkchange: ChartNetworkChangeEvent;
  readonly flowchange: ChartFlowChangeEvent;
  readonly navigatorchange: ChartNavigatorChangeEvent;
  readonly hierarchychange: ChartHierarchyChangeEvent;
  readonly parallelchange: ChartParallelChangeEvent;
  readonly heatmapchange: ChartHeatmapChangeEvent;
  readonly scattermatrixchange: ChartScatterMatrixChangeEvent;
  readonly error: ChartErrorEvent;
}

interface ActivePointer extends InspectionViewPoint {
  readonly pointerType: string;
}

interface PinchStart {
  readonly distance: number;
  readonly center: InspectionViewPoint;
  readonly view: InspectionViewState;
}

interface AnalyticPointerGesture {
  readonly pointerId: number;
  readonly viewId: string;
  readonly start: PixelPoint;
  current: PixelPoint;
  readonly points: PixelPoint[];
}

interface DomainPointerGesture {
  readonly pointerId: number;
  readonly viewId: string;
  previous: PixelPoint;
}

interface ActiveAnalyticKeyboardGesture {
  readonly viewId: string;
  readonly gesture: AnalyticKeyboardGesture;
}

interface MarkLabelPointerGesture {
  readonly pointerId: number;
  readonly id: string;
  readonly target: MarkLabelPositionSpec['target'];
  readonly start: PixelPoint;
  readonly startOffsetX: number;
  readonly startOffsetY: number;
  readonly entry: MarkLabelSceneEntry;
  readonly entries: readonly MarkLabelSceneEntry[];
  readonly plot: import('../scene/types.js').Rect;
  readonly previous: readonly MarkLabelPositionSpec[];
}

interface AnnotationPointerGesture {
  readonly pointerId: number;
  readonly id: string;
  readonly handle: AnnotationResizeHandle;
  readonly start: PixelPoint;
  readonly bounds: import('../scene/types.js').Rect;
  readonly annotation: AnnotationSpec;
  readonly previous: readonly AnnotationSpec[];
}

interface FamilyNodePointerGesture {
  readonly kind: 'network-node' | 'flow-node';
  readonly pointerId: number;
  readonly layerId: string;
  readonly id: string;
  readonly plot: Rect;
  readonly start: Point;
  readonly previousNetwork?: ChartNetworkRuntimeState;
  readonly previousFlow?: ChartFlowRuntimeState;
}

interface FamilyNetworkLassoGesture {
  readonly kind: 'network-lasso';
  readonly pointerId: number;
  readonly layerId: string;
  readonly plot: Rect;
  readonly points: Point[];
  readonly previous: ChartNetworkRuntimeState;
}

interface FamilyNavigatorGesture {
  readonly kind: 'navigator-window';
  readonly pointerId: number;
  readonly layerId: string;
  readonly interaction: NavigatorWindowInteraction;
  readonly start: Point;
  readonly previous: ChartNavigatorRuntimeState;
}

interface FamilyParallelBrushGesture {
  readonly kind: 'parallel-brush';
  readonly pointerId: number;
  readonly layerId: string;
  readonly field: string;
  readonly plot: Rect;
  readonly start: Point;
  readonly previous: ChartParallelRuntimeState;
}

interface FamilyHeatmapBrushGesture {
  readonly kind: 'heatmap-brush';
  readonly pointerId: number;
  readonly layerId: string;
  readonly start: HeatmapCellInteraction;
  readonly previous: ChartHeatmapRuntimeState;
}

interface FamilyScatterMatrixBrushGesture {
  readonly kind: 'scatter-matrix-brush';
  readonly pointerId: number;
  readonly layerId: string;
  readonly interaction: ScatterMatrixCellInteraction;
  readonly start: Point;
  readonly previous: ChartScatterMatrixRuntimeState | null;
}

type FamilyPointerGesture =
  | FamilyNodePointerGesture
  | FamilyNetworkLassoGesture
  | FamilyNavigatorGesture
  | FamilyParallelBrushGesture
  | FamilyHeatmapBrushGesture
  | FamilyScatterMatrixBrushGesture;

interface FamilySceneEntry extends DatumReference {
  readonly nodeId: string;
  readonly familyInteraction: FamilyDatumInteraction;
}

interface ActiveSceneTransition {
  readonly from: Scene;
  readonly to: Scene;
  readonly duration: number;
  readonly easing: PlaybackTransitionEasing;
  readonly keyField: string | undefined;
  elapsed: number;
  previousTimestamp: number | null;
}

const PLAYBACK_TRANSITION_INTERVAL_GAP = 1;
let canvasSemanticViewSequence = 0;

function effectivePlaybackTransitionDuration(playback: NormalizedPlaybackSpec): number {
  if (playback.transition === false) return 0;
  // Keep every automatic frame boundary authoritative. A long requested tween
  // is shortened just below the frame interval so it cannot become the input
  // Scene for the following automatic transition.
  return Math.min(
    playback.transition.duration,
    Math.max(1, playback.interval - PLAYBACK_TRANSITION_INTERVAL_GAP),
  );
}

function resolveTarget(target: ChartTarget): HTMLElement {
  if (typeof target !== 'string') return target;
  if (typeof document === 'undefined') {
    throw new GraflumeError('MISSING_TARGET', 'A DOM target is required to create a chart.');
  }
  const element = document.querySelector<HTMLElement>(target);
  if (element === null) {
    throw new GraflumeError('MISSING_TARGET', `Chart target "${target}" was not found.`);
  }
  return element;
}

function dataRows(input: DataInput): readonly DataRow[] {
  if (Array.isArray(input)) return input;
  const table = DataTable.from(input);
  return Array.from({ length: table.length }, (_, index) => table.row(index));
}

function appendInput(input: DataInput, rows: readonly DataRow[]): DataInput {
  return [...dataRows(input), ...rows];
}

function sameView(left: InspectionViewState, right: InspectionViewState): boolean {
  return (
    Math.abs(left.zoom - right.zoom) < 1e-9 &&
    Math.abs(left.offsetX - right.offsetX) < 1e-6 &&
    Math.abs(left.offsetY - right.offsetY) < 1e-6
  );
}

function sameDomainView(left: DomainViewState, right: DomainViewState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pointDistance(left: InspectionViewPoint, right: InspectionViewPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function pointCenter(left: InspectionViewPoint, right: InspectionViewPoint): InspectionViewPoint {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function formatPlaybackFrame(value: DataValue): string {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(String).join(', ');
  return String(value ?? '');
}

function configuredFrame(spec: ChartSpec): DataValue | undefined {
  const markFrame = (mark: ChartSpec['mark']): DataValue | undefined => {
    if (typeof mark !== 'object' || mark === null) return undefined;
    const value = mark.options?.frame;
    return typeof value === 'string' || typeof value === 'number' || value === null
      ? value
      : undefined;
  };
  const shorthand = markFrame(spec.mark);
  if (shorthand !== undefined) return shorthand;
  for (const layer of spec.layers ?? []) {
    const frame = markFrame(layer.mark);
    if (frame !== undefined) return frame;
  }
  return undefined;
}

function cloneDatumTarget(target: DatumTargetSpec): DatumTargetSpec {
  return {
    ...target,
    ...(Array.isArray(target.rowIndex) ? { rowIndex: [...target.rowIndex] } : {}),
    ...(target.values === undefined ? {} : { values: [...target.values] }),
  };
}

function cloneDecorationTarget(target: DecorationTargetSpec): DecorationTargetSpec {
  switch (target.type) {
    case 'datum':
      return cloneDatumTarget(target);
    case 'range':
      return {
        type: 'range',
        ...(target.x === undefined ? {} : { x: { ...target.x } }),
        ...(target.y === undefined ? {} : { y: { ...target.y } }),
      };
    case 'layer':
    case 'plot':
      return { ...target };
  }
}

function cloneAnnotation(annotation: AnnotationSpec): AnnotationSpec {
  return {
    ...annotation,
    target: cloneDecorationTarget(annotation.target),
    ...(typeof annotation.connector === 'object'
      ? { connector: { ...annotation.connector, dash: [...(annotation.connector.dash ?? [])] } }
      : {}),
    ...(annotation.style === undefined ? {} : { style: { ...annotation.style } }),
  };
}

function markWithOptions(
  mark: MarkInput,
  options: Readonly<Record<string, import('../spec/types.js').JsonValue>>,
): MarkInput {
  return typeof mark === 'string'
    ? { type: mark, options }
    : { ...mark, options: { ...mark.options, ...options } };
}

function cloneTableRuntimeState(state: ChartTableRuntimeState): ChartTableRuntimeState {
  return {
    filters: state.filters.map((filter) => ({ ...filter })),
    sort: state.sort.map((sort) => ({ ...sort })),
    group:
      state.group === null
        ? null
        : {
            fields: [...state.group.fields],
            aggregates: state.group.aggregates.map((aggregate) => ({ ...aggregate })),
          },
    pivot: state.pivot === null ? null : { ...state.pivot },
    windowOffset: state.windowOffset,
    windowLimit: state.windowLimit,
    columnOffset: state.columnOffset,
    columnLimit: state.columnLimit,
  };
}

function cloneNetworkRuntimeState(state: ChartNetworkRuntimeState): ChartNetworkRuntimeState {
  return {
    positions: Object.fromEntries(
      Object.entries(state.positions).map(([id, position]) => [id, { ...position }]),
    ),
    collapsed: [...state.collapsed],
    lasso: state.lasso.map((point) => ({ ...point })),
  };
}

function cloneFlowRuntimeState(state: ChartFlowRuntimeState): ChartFlowRuntimeState {
  return {
    positions: Object.fromEntries(
      Object.entries(state.positions).map(([id, position]) => [id, { ...position }]),
    ),
  };
}

function cloneNavigatorRuntimeState(state: ChartNavigatorRuntimeState): ChartNavigatorRuntimeState {
  return { ...state };
}

function cloneHierarchyRuntimeState(state: ChartHierarchyRuntimeState): ChartHierarchyRuntimeState {
  return { ...state, collapsed: [...state.collapsed] };
}

function cloneParallelRuntimeState(state: ChartParallelRuntimeState): ChartParallelRuntimeState {
  return {
    axes: state.axes.map((axis) => ({
      ...axis,
      ...(axis.domain === undefined ? {} : { domain: [...axis.domain] }),
    })),
    brushes: state.brushes.map((brush) => ({
      field: brush.field,
      extents: brush.extents.map((extent) => [...extent] as const),
    })),
    combine: state.combine,
  };
}

function cloneHeatmapRuntimeState(state: ChartHeatmapRuntimeState): ChartHeatmapRuntimeState {
  return {
    rows: [...state.rows],
    columns: [...state.columns],
    ...(state.value === undefined ? {} : { value: [...state.value] as const }),
  };
}

function cloneScatterMatrixRuntimeState(
  state: ChartScatterMatrixRuntimeState,
): ChartScatterMatrixRuntimeState {
  return {
    ...state,
    x: [...state.x] as const,
    y: [...state.y] as const,
    selectedRows: [...state.selectedRows],
  };
}

function familySceneEntries(root: SceneNode): readonly FamilySceneEntry[] {
  const entries: FamilySceneEntry[] = [];
  const visit = (node: SceneNode): void => {
    if (node.type === 'group') {
      node.children.forEach(visit);
      return;
    }
    if (node.datum?.familyInteraction !== undefined) {
      entries.push({
        ...node.datum,
        nodeId: node.id,
        familyInteraction: node.datum.familyInteraction,
      });
    }
  };
  visit(root);
  return entries;
}

function normalizedPoint(point: Point, plot: Rect): Point {
  return {
    x: Math.max(0, Math.min(1, (point.x - plot.x) / Math.max(1, plot.width))),
    y: Math.max(0, Math.min(1, (point.y - plot.y) / Math.max(1, plot.height))),
  };
}

function annotationId(annotation: AnnotationSpec, index: number): string {
  return annotation.id ?? `annotation-${index}`;
}

function selectionKey(target: DatumTargetSpec): string {
  const values =
    target.field === undefined
      ? null
      : [...(target.values ?? (target.value === undefined ? [] : [target.value]))].sort(
          (left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)),
        );
  const rows =
    target.rowIndex === undefined
      ? null
      : (Array.isArray(target.rowIndex) ? [...target.rowIndex] : [target.rowIndex]).sort(
          (left, right) => left - right,
        );
  return JSON.stringify([target.layerId ?? null, rows, target.field ?? null, values]);
}

export class Chart {
  readonly #target: HTMLElement;
  readonly #registry: RuntimeRegistry;
  readonly #events = new EventEmitter<ChartEventMap>();
  readonly #scheduler = new RenderScheduler();
  readonly #tooltip = new TooltipController();
  readonly #controls = new ControlsController();
  readonly #legend = new LegendController();
  readonly #accessibility = new AccessibilityMirrorController();
  readonly #options: ChartCreateOptions;
  readonly #adaptiveOptions: NormalizedAdaptiveOptions;
  readonly #activePointers = new Map<number, ActivePointer>();
  readonly #incrementalStores = new Map<string, IncrementalDataStore>();
  readonly #streamRuntimes = new Map<string, IncrementalStreamRuntime>();
  readonly #semanticViewId: string;
  #spec: ChartSpec;
  #renderer: Renderer | null = null;
  #rendererName: string | null = null;
  #result: CompileResult | null = null;
  #destroyed = false;
  #resizeObserver: ResizeObserver | null = null;
  #windowResizeListener: (() => void) | null = null;
  #manualWidth: number | undefined;
  #manualHeight: number | undefined;
  #eventSurface: HTMLElement | null = null;
  #surfaceTouchAction: string | null = null;
  #surfaceTabIndex: string | null = null;
  #surfaceCursor: string | null = null;
  #surfaceAriaKeyShortcuts: string | null = null;
  #view: InspectionViewState = identityInspectionView;
  #dragPrevious: InspectionViewPoint | null = null;
  #pinchStart: PinchStart | null = null;
  #dragDistance = 0;
  #suppressClick = false;
  #playback: false | NormalizedPlaybackSpec = false;
  #playbackFrames: readonly DataValue[] = [];
  #playbackIndex = 0;
  #playbackRate = 1;
  #playbackLoop = false;
  #playbackDirection: PlaybackDirection = 'forward';
  #playbackRange: ResolvedPlaybackRange = { start: 0, end: -1 };
  #playbackNamedFrames: readonly ResolvedPlaybackNamedFrame[] = [];
  #playing = false;
  #playbackCancel: (() => void) | null = null;
  #playbackTimestamp: number | null = null;
  #sceneTransition: ActiveSceneTransition | null = null;
  #displayScene: Scene | null = null;
  #reducedMotion: MediaQueryList | null = null;
  #adaptiveMediaLists: readonly MediaQueryList[] = [];
  #adaptiveState: AdaptiveState;
  #fullscreen = false;
  #hiddenLegendItems = new Set<string>();
  #selection: DatumTargetSpec[] = [];
  readonly #analyticSelection = new AnalyticSelectionStore();
  #domainView: DomainViewState = emptyDomainViewState();
  #analyticGesture: AnalyticPointerGesture | null = null;
  #analyticKeyboardGesture: ActiveAnalyticKeyboardGesture | null = null;
  #domainGesture: DomainPointerGesture | null = null;
  #annotations: AnnotationSpec[] = [];
  #annotationsVisible = true;
  readonly #annotationHistory = new AnnotationAuthoringHistory();
  #activeAnnotationId: string | null = null;
  #annotationGesture: AnnotationPointerGesture | null = null;
  readonly #markLabels = new MarkLabelHistory();
  #activeMarkLabelId: string | null = null;
  #markLabelGesture: MarkLabelPointerGesture | null = null;
  readonly #tableRuntime = new Map<string, ChartTableRuntimeState>();
  readonly #networkRuntime = new Map<string, ChartNetworkRuntimeState>();
  readonly #flowRuntime = new Map<string, ChartFlowRuntimeState>();
  readonly #navigatorRuntime = new Map<
    string,
    { readonly family: ChartNavigatorFamily; readonly state: ChartNavigatorRuntimeState }
  >();
  readonly #hierarchyRuntime = new Map<string, ChartHierarchyRuntimeState>();
  readonly #parallelRuntime = new Map<string, ChartParallelRuntimeState>();
  readonly #heatmapRuntime = new Map<string, ChartHeatmapRuntimeState>();
  readonly #scatterMatrixRuntime = new Map<string, ChartScatterMatrixRuntimeState>();
  #familyFocus: ChartFamilyFocusState | null = null;
  #familyGesture: FamilyPointerGesture | null = null;
  #technicalCrosshairValue: number | string | null = null;
  #markLabelLive: HTMLDivElement | null = null;
  #markLabelLiveHost: HTMLElement | null = null;
  #selectionLive: HTMLDivElement | null = null;
  #selectionLiveHost: HTMLElement | null = null;
  #selectionLiveTimer: ReturnType<typeof setTimeout> | null = null;
  #selectionLiveUpdatedAt = 0;
  #linkedFocusUnregister: (() => void) | null = null;
  #linkedFocusUnsubscribe: (() => void) | null = null;
  #applyingLinkedFocus = false;
  #linkedViewUnregister: (() => void) | null = null;
  #applyingLinkedViewState = false;
  #lastPublishedSemanticId: string | null = null;
  #preserveStreamRuntimes = false;
  #workerRuntime: AutomaticWorkerRuntime | null = null;

  readonly #pointerMoveListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    const crosshairChanged = this.#updateTechnicalCrosshair(event, false);
    const navigating = this.#handlePointerMove(event);
    if (crosshairChanged && !navigating) this.render();
    if (!navigating && this.#result?.spec.interaction.hover !== false) {
      this.#emitPointer('hover', event);
    }
  };

  readonly #pointerDownListener = (event: Event): void => {
    if (event instanceof PointerEvent) this.#handlePointerDown(event);
  };

  readonly #pointerUpListener = (event: Event): void => {
    if (event instanceof PointerEvent) this.#handlePointerEnd(event);
  };

  readonly #pointerCancelListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    this.#handlePointerEnd(event, true);
    this.#clearTechnicalCrosshair();
    this.#tooltip.hide();
    if (this.#result?.spec.interaction.hover !== false) {
      this.#events.emit('hover', { chart: this, hit: null, sourceEvent: event });
    }
  };

  readonly #clickListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    if (this.#suppressClick) {
      this.#suppressClick = false;
      return;
    }
    const interaction = this.#result?.spec.interaction;
    if (interaction?.click !== false || interaction?.selection !== false) {
      this.#emitPointer('click', event);
    }
  };

  readonly #pointerLeaveListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    this.#clearTechnicalCrosshair();
    this.#tooltip.hide();
    if (this.#result?.spec.interaction.hover !== false) {
      this.#events.emit('hover', { chart: this, hit: null, sourceEvent: event });
    }
  };

  readonly #wheelListener = (event: Event): void => {
    if (event instanceof WheelEvent) this.#handleWheel(event);
  };

  readonly #keyDownListener = (event: Event): void => {
    if (event instanceof KeyboardEvent) this.#handleKeyDown(event);
  };

  readonly #visibilityListener = (): void => {
    if (typeof document !== 'undefined' && document.hidden) this.pause();
  };

  readonly #reducedMotionListener = (event: MediaQueryListEvent): void => {
    if (event.matches) this.pause();
  };

  readonly #adaptiveMediaListener = (): void => {
    if (this.#destroyed) return;
    this.scheduleRender();
  };

  readonly #fullscreenListener = (): void => {
    const active = this.#isOwnFullscreen();
    if (active === this.#fullscreen) return;
    this.#fullscreen = active;
    try {
      this.render();
      const scene = this.#result?.scene;
      if (scene !== undefined) {
        this.#events.emit('resize', { chart: this, width: scene.width, height: scene.height });
      }
    } catch (error) {
      this.#events.emit('error', { chart: this, error });
    }
    this.#events.emit('fullscreenchange', { chart: this, active });
  };

  constructor(
    target: ChartTarget,
    spec: ChartSpec,
    registry: RuntimeRegistry,
    options: ChartCreateOptions = {},
  ) {
    this.#target = resolveTarget(target);
    canvasSemanticViewSequence += 1;
    this.#semanticViewId = `canvas-view-${canvasSemanticViewSequence}`;
    this.#spec = spec;
    this.#registry = registry;
    this.#options = options;
    this.#adaptiveOptions = normalizeAdaptiveOptions(options.adaptive);
    this.#manualWidth = options.width;
    this.#manualHeight = options.height;
    this.#adaptiveState = resolveAdaptiveProfile(
      {
        width: options.width ?? (this.#target.clientWidth || 640),
        height: options.height ?? (this.#target.clientHeight || 400),
        rowCount: estimateSpecRowCount(spec),
      },
      this.#adaptiveOptions,
    );
    const normalized = normalizeSpec(spec);
    this.#annotations = normalized.annotations.map((annotation, index) => ({
      ...cloneAnnotation(annotation),
      id: annotationId(annotation, index),
    }));
    this.#annotationHistory.reset(this.#annotations);
    this.#resetMarkLabels(normalized);
    this.#configureInteraction(normalized, true);
    const linkedState = options.linkedViewStore?.get();
    if (linkedState !== undefined) {
      this.#analyticSelection.set(linkedState.analyticSelection);
      this.#domainView = linkedState.domainView;
      if (
        normalized.interaction.selection !== false &&
        normalized.interaction.selection.kind === 'point'
      ) {
        this.#selection = linkedState.analyticSelection.selections.flatMap((candidate) =>
          candidate.type === 'point' && candidate.target !== undefined
            ? [cloneDatumTarget(candidate.target)]
            : [],
        );
      }
    }
    try {
      this.#configureEnvironmentListeners();
      this.render();
      this.#linkedViewUnregister =
        options.linkedViewStore?.register(this.#semanticViewId, (change) =>
          this.#applyLinkedViewState(change),
        ) ?? null;
      this.#configureResizeObserver();
      this.#startAutoplay();
    } catch (error) {
      try {
        this.destroy();
      } catch {
        // Preserve the original constructor failure after best-effort cleanup.
      }
      throw error;
    }
  }

  on<K extends keyof ChartEventMap>(
    type: K,
    listener: (event: ChartEventMap[K]) => void,
  ): () => void {
    this.#assertAlive();
    return this.#events.on(type, listener);
  }

  off<K extends keyof ChartEventMap>(type: K, listener: (event: ChartEventMap[K]) => void): void {
    this.#events.off(type, listener);
  }

  getSpec(): ChartSpec {
    return this.#spec;
  }

  getScene(): Scene | null {
    return this.#result?.scene ?? null;
  }

  domainToPixel(axis: AxisId, value: number | string | Date, viewId?: string): number {
    this.#assertAlive();
    const view = this.#coordinateView(viewId);
    const pixel = mapDomainToPixel(view.coordinates, axis, value);
    return (
      pixel + (cartesianAxisChannel(view.coordinates, axis) === 'x' ? view.offsetX : view.offsetY)
    );
  }

  pixelToDomain(axis: AxisId, pixel: number, viewId?: string): number | string {
    this.#assertAlive();
    const view = this.#coordinateView(viewId);
    const local =
      pixel - (cartesianAxisChannel(view.coordinates, axis) === 'x' ? view.offsetX : view.offsetY);
    return mapPixelToDomain(view.coordinates, axis, local);
  }

  getCoordinateViewIds(): readonly string[] {
    this.#assertAlive();
    return this.#result?.coordinateViews.map(({ id }) => id) ?? [];
  }

  #coordinateView(viewId?: string): CompileCoordinateView {
    const result = this.#result;
    if (result === null) throw new GraflumeError('INVALID_SPEC', 'The chart is not rendered.');
    const view =
      viewId === undefined
        ? result.coordinateViews[0]
        : result.coordinateViews.find(({ id }) => id === viewId);
    if (view === undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        viewId === undefined
          ? 'The chart has no Cartesian coordinate view.'
          : `Coordinate view "${viewId}" was not found.`,
      );
    }
    return view;
  }

  #coordinateAt(
    point: PixelPoint,
  ): { readonly view: CompileCoordinateView; readonly point: PixelPoint } | null {
    const view = this.#result?.coordinateViews.find(
      ({ bounds }) =>
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height,
    );
    return view === undefined
      ? null
      : {
          view,
          point: { x: point.x - view.offsetX, y: point.y - view.offsetY },
        };
  }

  #localPoint(viewId: string, point: PixelPoint): PixelPoint {
    const view = this.#coordinateView(viewId);
    return { x: point.x - view.offsetX, y: point.y - view.offsetY };
  }

  getSemanticIndex(): readonly SemanticMark[] {
    return this.#result?.scene.semanticIndex ?? [];
  }

  toAccessibleRows(maxRows?: number): readonly AccessibleRow[] {
    return toAccessibleRows(
      this.getSemanticIndex(),
      maxRows ?? this.#result?.spec.accessibility.maxRows ?? 0,
    );
  }

  getAccessibilityState(): ChartAccessibilityState {
    const accessibility = this.#result?.spec.accessibility;
    const focusedId = this.#accessibility.getFocusedId();
    return {
      enabled:
        accessibility !== undefined &&
        (accessibility.table !== false ||
          accessibility.navigation ||
          accessibility.linkedFocus !== false),
      table: accessibility?.table ?? false,
      navigation: accessibility?.navigation ?? false,
      rowCount: this.getSemanticIndex().length,
      ...(focusedId === null ? {} : { focusedId }),
    };
  }

  getFamilyFocus(): ChartFamilyFocusState | null {
    this.#assertAlive();
    return this.#familyFocus === null ? null : { ...this.#familyFocus };
  }

  focusPieSlice(layerId: string, id: string): this {
    this.#assertAlive();
    const entry = this.#familyEntries('pie-slice').find(
      (candidate) => candidate.layerId === layerId && candidate.familyInteraction.id === id,
    );
    if (entry === undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Pie slice "${id}" was not found in layer "${layerId}".`,
      );
    }
    return this.#setFamilyFocus({ kind: 'pie-slice', layerId, id }, 'programmatic');
  }

  focusTableCell(layerId: string, row: number, column: number): this {
    this.#assertAlive();
    if (!Number.isInteger(row) || row < 0 || !Number.isInteger(column) || column < 0) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Table cell row and column must be non-negative integers.',
      );
    }
    const entries = this.#familyEntries('table-cell').filter(
      (candidate) => candidate.layerId === layerId,
    );
    const first = entries[0]?.familyInteraction;
    if (
      first === undefined ||
      first.kind !== 'table-cell' ||
      row >= first.rows ||
      column >= first.columns
    ) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Table cell (${row}, ${column}) is outside layer "${layerId}".`,
      );
    }
    let state = this.getTableRuntimeState(layerId);
    const frozenRows = this.#tableFrozenRows(layerId);
    const frozenColumns = this.#tableFrozenColumns(layerId);
    let nextState = state;
    if (
      row >= frozenRows &&
      (row < state.windowOffset || row >= state.windowOffset + state.windowLimit)
    ) {
      const offset = Math.max(0, row - Math.max(0, state.windowLimit - 1));
      nextState = normalizeTableRuntimeState({ windowOffset: offset }, nextState);
    }
    if (
      column >= frozenColumns &&
      (column < state.columnOffset || column >= state.columnOffset + state.columnLimit)
    ) {
      const offset = Math.max(0, column - Math.max(0, state.columnLimit - 1));
      nextState = normalizeTableRuntimeState({ columnOffset: offset }, nextState);
    }
    if (nextState !== state) {
      this.#setTableRuntimeState(layerId, nextState, 'programmatic', false);
      state = nextState;
    }
    const field = this.#familyEntries('table-cell').find(
      (candidate) =>
        candidate.layerId === layerId &&
        candidate.familyInteraction.row === row &&
        candidate.familyInteraction.column === column,
    )?.familyInteraction;
    if (field === undefined || field.kind !== 'table-cell') {
      throw new GraflumeError('INVALID_SPEC', `Table column ${column} was not found.`);
    }
    return this.#setFamilyFocus(
      { kind: 'table-cell', layerId, row, column, field: field.field },
      'programmatic',
    );
  }

  clearFamilyFocus(): this {
    this.#assertAlive();
    if (this.#familyFocus === null) return this;
    this.#familyFocus = null;
    this.render();
    this.#events.emit('familyfocuschange', { chart: this, state: null, reason: 'clear' });
    return this;
  }

  getTableRuntimeState(layerId: string): ChartTableRuntimeState {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['table']);
    const stored = this.#tableRuntime.get(layerId);
    if (stored !== undefined) return cloneTableRuntimeState(stored);
    const options = this.#layerOptions(layerId);
    return normalizeTableRuntimeState({
      filters: Array.isArray(options.filters)
        ? (options.filters as unknown as readonly ChartTableFilter[])
        : [],
      sort: Array.isArray(options.sort)
        ? (options.sort as unknown as readonly ChartTableSort[])
        : [],
      group:
        options.group !== undefined ? (options.group as unknown as ChartTableGroup | null) : null,
      pivot:
        options.pivot !== undefined ? (options.pivot as unknown as ChartTablePivot | null) : null,
      windowOffset: typeof options.windowOffset === 'number' ? options.windowOffset : 0,
      windowLimit: typeof options.windowLimit === 'number' ? options.windowLimit : 100,
      columnOffset: typeof options.columnOffset === 'number' ? options.columnOffset : 0,
      columnLimit: typeof options.columnLimit === 'number' ? options.columnLimit : 100,
    });
  }

  setTableRuntimeState(layerId: string, state: Partial<ChartTableRuntimeState>): this {
    const current = this.getTableRuntimeState(layerId);
    return this.#setTableRuntimeState(
      layerId,
      normalizeTableRuntimeState(state, current),
      'programmatic',
    );
  }

  setTableFilters(layerId: string, filters: readonly ChartTableFilter[]): this {
    return this.setTableRuntimeState(layerId, { filters, windowOffset: 0 });
  }

  setTableSort(layerId: string, sort: readonly ChartTableSort[]): this {
    return this.setTableRuntimeState(layerId, { sort, windowOffset: 0 });
  }

  setTableGroup(layerId: string, group: ChartTableGroup | null): this {
    return this.setTableRuntimeState(layerId, {
      group,
      ...(group === null ? {} : { pivot: null }),
      windowOffset: 0,
    });
  }

  setTablePivot(layerId: string, pivot: ChartTablePivot | null): this {
    return this.setTableRuntimeState(layerId, {
      pivot,
      ...(pivot === null ? {} : { group: null }),
      windowOffset: 0,
    });
  }

  resetTableRuntime(layerId: string): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['table']);
    if (!this.#tableRuntime.delete(layerId)) return this;
    this.render();
    this.#events.emit('tablechange', {
      chart: this,
      layerId,
      state: this.getTableRuntimeState(layerId),
      reason: 'reset',
    });
    return this;
  }

  getNetworkRuntimeState(layerId: string): ChartNetworkRuntimeState {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['graph']);
    const stored = this.#networkRuntime.get(layerId);
    if (stored !== undefined) return cloneNetworkRuntimeState(stored);
    const options = this.#layerOptions(layerId);
    return normalizeNetworkRuntimeState({
      positions:
        options.positions !== null &&
        typeof options.positions === 'object' &&
        !Array.isArray(options.positions)
          ? (options.positions as unknown as Readonly<Record<string, ChartRuntimeNodePosition>>)
          : {},
      collapsed: Array.isArray(options.collapsed)
        ? (options.collapsed as unknown as readonly string[])
        : [],
      lasso: Array.isArray(options.lasso) ? (options.lasso as unknown as readonly Point[]) : [],
    });
  }

  moveNetworkNode(layerId: string, id: string, position: Point, pin = true): this {
    const current = this.getNetworkRuntimeState(layerId);
    this.#requireFamilyNode(layerId, id, 'network-node');
    return this.#setNetworkRuntimeState(
      layerId,
      normalizeNetworkRuntimeState(
        { positions: { ...current.positions, [id]: { ...position, pinned: pin } } },
        current,
      ),
      'programmatic',
    );
  }

  setNetworkNodePinned(layerId: string, id: string, pinned: boolean): this {
    const current = this.getNetworkRuntimeState(layerId);
    const entry = this.#requireFamilyNode(layerId, id, 'network-node').familyInteraction;
    if (entry.kind !== 'network-node') return this;
    const position = current.positions[id] ?? entry.position;
    return this.#setNetworkRuntimeState(
      layerId,
      normalizeNetworkRuntimeState(
        { positions: { ...current.positions, [id]: { ...position, pinned } } },
        current,
      ),
      'programmatic',
    );
  }

  setNetworkNodeCollapsed(layerId: string, id: string, collapsed: boolean): this {
    const current = this.getNetworkRuntimeState(layerId);
    const entry = this.#requireFamilyNode(layerId, id, 'network-node').familyInteraction;
    if (entry.kind !== 'network-node' || (!entry.compound && collapsed)) {
      throw new GraflumeError('INVALID_SPEC', `Network node "${id}" is not collapsible.`);
    }
    const values = new Set(current.collapsed);
    if (collapsed) values.add(id);
    else values.delete(id);
    return this.#setNetworkRuntimeState(
      layerId,
      normalizeNetworkRuntimeState({ collapsed: [...values] }, current),
      'programmatic',
    );
  }

  setNetworkLasso(layerId: string, lasso: readonly Point[]): this {
    const current = this.getNetworkRuntimeState(layerId);
    return this.#setNetworkRuntimeState(
      layerId,
      normalizeNetworkRuntimeState({ lasso }, current),
      'programmatic',
    );
  }

  resetNetworkRuntime(layerId: string): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['graph']);
    if (!this.#networkRuntime.delete(layerId)) return this;
    this.render();
    this.#events.emit('networkchange', {
      chart: this,
      layerId,
      state: this.getNetworkRuntimeState(layerId),
      reason: 'reset',
    });
    return this;
  }

  getFlowRuntimeState(layerId: string): ChartFlowRuntimeState {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['sankey']);
    const stored = this.#flowRuntime.get(layerId);
    if (stored !== undefined) return cloneFlowRuntimeState(stored);
    const options = this.#layerOptions(layerId);
    return normalizeFlowRuntimeState({
      positions:
        options.positions !== null &&
        typeof options.positions === 'object' &&
        !Array.isArray(options.positions)
          ? (options.positions as unknown as Readonly<Record<string, ChartRuntimeNodePosition>>)
          : {},
    });
  }

  moveFlowNode(layerId: string, id: string, position: Point): this {
    const current = this.getFlowRuntimeState(layerId);
    this.#requireFamilyNode(layerId, id, 'flow-node');
    return this.#setFlowRuntimeState(
      layerId,
      normalizeFlowRuntimeState(
        { positions: { ...current.positions, [id]: { ...position } } },
        current,
      ),
      'programmatic',
    );
  }

  resetFlowRuntime(layerId: string): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['sankey']);
    if (!this.#flowRuntime.delete(layerId)) return this;
    this.render();
    this.#events.emit('flowchange', {
      chart: this,
      layerId,
      state: this.getFlowRuntimeState(layerId),
      reason: 'reset',
    });
    return this;
  }

  getNavigatorWindow(layerId: string): ChartNavigatorRuntimeState {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['candlestick', 'timeline']);
    const stored = this.#navigatorRuntime.get(layerId);
    if (stored !== undefined) return cloneNavigatorRuntimeState(stored.state);
    const interaction = this.#navigatorInteraction(layerId);
    return { start: interaction.start, end: interaction.end };
  }

  setNavigatorWindow(layerId: string, state: Partial<ChartNavigatorRuntimeState>): this {
    const interaction = this.#navigatorInteraction(layerId);
    const current = this.getNavigatorWindow(layerId);
    return this.#setNavigatorRuntimeState(
      layerId,
      interaction.family,
      normalizeNavigatorRuntimeState(state, current, {
        minimum: interaction.minimum,
        maximum: interaction.maximum,
      }),
      'programmatic',
    );
  }

  resetNavigatorWindow(layerId: string): this {
    this.#assertAlive();
    const layer = this.#requireFamilyLayer(layerId, ['candlestick', 'timeline']);
    if (!this.#navigatorRuntime.delete(layerId)) return this;
    this.render();
    this.#events.emit('navigatorchange', {
      chart: this,
      layerId,
      family: layer.mark.type as ChartNavigatorFamily,
      state: this.getNavigatorWindow(layerId),
      reason: 'reset',
    });
    return this;
  }

  getHierarchyRuntimeState(layerId: string): ChartHierarchyRuntimeState {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['tree']);
    const stored = this.#hierarchyRuntime.get(layerId);
    if (stored !== undefined) return cloneHierarchyRuntimeState(stored);
    const options = this.#layerOptions(layerId);
    return normalizeHierarchyRuntimeState({
      root: typeof options.root === 'string' ? options.root : null,
      zoomTo: typeof options.zoomTo === 'string' ? options.zoomTo : null,
      collapsed: Array.isArray(options.collapsed)
        ? (options.collapsed as unknown as readonly string[])
        : [],
      query: typeof options.query === 'string' ? options.query : '',
    });
  }

  setHierarchyRuntimeState(layerId: string, state: Partial<ChartHierarchyRuntimeState>): this {
    const current = this.getHierarchyRuntimeState(layerId);
    return this.#setHierarchyRuntimeState(
      layerId,
      normalizeHierarchyRuntimeState(state, current),
      'programmatic',
    );
  }

  setHierarchyNodeCollapsed(layerId: string, id: string, collapsed: boolean): this {
    const current = this.getHierarchyRuntimeState(layerId);
    const values = new Set(current.collapsed);
    if (collapsed) values.add(id);
    else values.delete(id);
    return this.#setHierarchyRuntimeState(
      layerId,
      normalizeHierarchyRuntimeState({ collapsed: [...values] }, current),
      'programmatic',
    );
  }

  rerootHierarchy(layerId: string, id: string | null): this {
    return this.setHierarchyRuntimeState(layerId, { root: id, zoomTo: null });
  }

  zoomHierarchy(layerId: string, id: string | null): this {
    return this.setHierarchyRuntimeState(layerId, { zoomTo: id });
  }

  setHierarchyQuery(layerId: string, query: string): this {
    return this.setHierarchyRuntimeState(layerId, { query });
  }

  resetHierarchyRuntime(layerId: string): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['tree']);
    if (!this.#hierarchyRuntime.delete(layerId)) return this;
    this.render();
    this.#events.emit('hierarchychange', {
      chart: this,
      layerId,
      state: this.getHierarchyRuntimeState(layerId),
      reason: 'reset',
    });
    return this;
  }

  getParallelRuntimeState(layerId: string): ChartParallelRuntimeState {
    this.#assertAlive();
    const layer = this.#requireFamilyLayer(layerId, ['parallel']);
    const stored = this.#parallelRuntime.get(layerId);
    if (stored !== undefined) return cloneParallelRuntimeState(stored);
    const options = layer.mark.options;
    const rawAxes = Array.isArray(options.axes)
      ? options.axes
      : Array.isArray(options.dimensions)
        ? options.dimensions.map((field) => ({ field }))
        : [{ field: layer.x.field }, { field: layer.y.field }];
    const axes: ChartParallelAxisRuntimeState[] = rawAxes.flatMap((raw) => {
      if (typeof raw === 'string') {
        return [{ field: raw, type: 'linear', invert: false, missing: 'gap' as const }];
      }
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return [];
      const axis = raw as Readonly<Record<string, unknown>>;
      if (typeof axis.field !== 'string') return [];
      const type = axis.type === 'log' || axis.type === 'ordinal' ? axis.type : 'linear';
      const missing =
        axis.missing === 'top' || axis.missing === 'bottom' || axis.missing === 'middle'
          ? axis.missing
          : 'gap';
      return [
        {
          field: axis.field,
          type,
          invert: axis.invert === true,
          missing,
          ...(Array.isArray(axis.domain)
            ? { domain: axis.domain as readonly (number | string)[] }
            : {}),
        },
      ];
    });
    return normalizeParallelRuntimeState(
      {
        axes,
        brushes: Array.isArray(options.brushes)
          ? (options.brushes as unknown as ChartParallelRuntimeState['brushes'])
          : [],
        combine: options.combine === 'union' ? 'union' : 'intersection',
      },
      { axes, brushes: [], combine: 'intersection' },
    );
  }

  setParallelRuntimeState(layerId: string, state: Partial<ChartParallelRuntimeState>): this {
    const current = this.getParallelRuntimeState(layerId);
    return this.#setParallelRuntimeState(
      layerId,
      normalizeParallelRuntimeState(state, current),
      'programmatic',
    );
  }

  reorderParallelAxis(layerId: string, field: string, index: number): this {
    return this.#setParallelRuntimeState(
      layerId,
      reorderParallelAxisState(this.getParallelRuntimeState(layerId), field, index),
      'programmatic',
    );
  }

  invertParallelAxis(layerId: string, field: string, invert?: boolean): this {
    return this.#setParallelRuntimeState(
      layerId,
      invertParallelAxisState(this.getParallelRuntimeState(layerId), field, invert),
      'programmatic',
    );
  }

  setParallelBrush(
    layerId: string,
    field: string,
    extents: readonly (readonly [number, number])[],
  ): this {
    return this.#setParallelRuntimeState(
      layerId,
      setParallelBrushExtents(this.getParallelRuntimeState(layerId), field, extents),
      'programmatic',
    );
  }

  resetParallelRuntime(layerId: string): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['parallel']);
    if (!this.#parallelRuntime.delete(layerId)) return this;
    this.render();
    this.#events.emit('parallelchange', {
      chart: this,
      layerId,
      state: this.getParallelRuntimeState(layerId),
      reason: 'reset',
    });
    return this;
  }

  getHeatmapBrush(layerId: string): ChartHeatmapRuntimeState {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['heatmap']);
    const stored = this.#heatmapRuntime.get(layerId);
    if (stored !== undefined) return cloneHeatmapRuntimeState(stored);
    const brush = this.#layerOptions(layerId).brush;
    return normalizeHeatmapRuntimeState(
      brush !== null && typeof brush === 'object' && !Array.isArray(brush)
        ? (brush as unknown as Partial<ChartHeatmapRuntimeState>)
        : {},
    );
  }

  setHeatmapBrush(layerId: string, state: Partial<ChartHeatmapRuntimeState>): this {
    const current = this.getHeatmapBrush(layerId);
    return this.#setHeatmapRuntimeState(
      layerId,
      normalizeHeatmapRuntimeState(state, current),
      'programmatic',
    );
  }

  resetHeatmapBrush(layerId: string): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['heatmap']);
    if (!this.#heatmapRuntime.delete(layerId)) return this;
    this.render();
    this.#events.emit('heatmapchange', {
      chart: this,
      layerId,
      state: this.getHeatmapBrush(layerId),
      reason: 'reset',
    });
    return this;
  }

  getScatterMatrixBrush(layerId: string): ChartScatterMatrixRuntimeState | null {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['scatter-matrix']);
    const stored = this.#scatterMatrixRuntime.get(layerId);
    if (stored !== undefined) return cloneScatterMatrixRuntimeState(stored);
    const cell = this.#familyEntries('scatter-matrix-cell').find(
      (entry) => entry.layerId === layerId,
    )?.familyInteraction;
    if (cell === undefined) return null;
    const fallback: ChartScatterMatrixRuntimeState = {
      xField: cell.xField,
      yField: cell.yField,
      x: [...cell.xDomain],
      y: [...cell.yDomain],
      selectedRows: [],
    };
    const linkedBrush = this.#layerOptions(layerId).linkedBrush;
    return normalizeScatterMatrixRuntimeState(
      linkedBrush !== null && typeof linkedBrush === 'object' && !Array.isArray(linkedBrush)
        ? (linkedBrush as unknown as Partial<ChartScatterMatrixRuntimeState>)
        : {},
      fallback,
    );
  }

  setScatterMatrixBrush(layerId: string, state: Partial<ChartScatterMatrixRuntimeState>): this {
    const current = this.getScatterMatrixBrush(layerId);
    if (current === null) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Layer "${layerId}" has no interactive scatter-matrix cell.`,
      );
    }
    const normalized = normalizeScatterMatrixRuntimeState(state, current);
    const selectedRows =
      state.selectedRows === undefined &&
      (state.x !== undefined ||
        state.y !== undefined ||
        state.xField !== undefined ||
        state.yField !== undefined)
        ? selectScatterMatrixRows(this.#familyLayerRows(layerId), normalized)
        : normalized.selectedRows;
    return this.#setScatterMatrixRuntimeState(
      layerId,
      { ...normalized, selectedRows },
      'programmatic',
    );
  }

  resetScatterMatrixBrush(layerId: string): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['scatter-matrix']);
    if (!this.#scatterMatrixRuntime.delete(layerId)) return this;
    this.render();
    this.#events.emit('scattermatrixchange', {
      chart: this,
      layerId,
      state: this.getScatterMatrixBrush(layerId)!,
      reason: 'reset',
    });
    return this;
  }

  #familyEntries<K extends FamilyDatumInteraction['kind']>(
    kind: K,
  ): readonly (FamilySceneEntry & {
    readonly familyInteraction: Extract<FamilyDatumInteraction, { readonly kind: K }>;
  })[] {
    const scene = this.#result?.scene;
    if (scene === undefined) return [];
    return familySceneEntries(scene.root).filter(
      (
        entry,
      ): entry is FamilySceneEntry & {
        readonly familyInteraction: Extract<FamilyDatumInteraction, { readonly kind: K }>;
      } => entry.familyInteraction.kind === kind,
    );
  }

  #navigatorInteraction(layerId: string): NavigatorWindowInteraction {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['candlestick', 'timeline']);
    const interaction = this.#familyEntries('navigator-window').find(
      (entry) => entry.layerId === layerId,
    )?.familyInteraction;
    if (interaction === undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Layer "${layerId}" does not have an enabled navigator window.`,
      );
    }
    return interaction;
  }

  #familyLayerRows(layerId: string): readonly DataRow[] {
    const layer = this.#result?.spec.layers.find((candidate) => candidate.id === layerId);
    if (layer === undefined) {
      throw new GraflumeError('INVALID_SPEC', `Layer "${layerId}" was not found.`);
    }
    return dataRows(layer.data);
  }

  #requireFamilyLayer(layerId: string, types: readonly string[]) {
    const layer = this.#result?.spec.layers.find((candidate) => candidate.id === layerId);
    if (layer === undefined || !types.includes(layer.mark.type)) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Layer "${layerId}" is not an interactive ${types.join('/')} layer.`,
      );
    }
    return layer;
  }

  #layerOptions(layerId: string) {
    const layer = this.#result?.spec.layers.find((candidate) => candidate.id === layerId);
    if (layer === undefined) {
      throw new GraflumeError('INVALID_SPEC', `Layer "${layerId}" was not found.`);
    }
    return layer.mark.options;
  }

  #tableFrozenRows(layerId: string): number {
    const value = this.#layerOptions(layerId).frozenRows;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  #tableFrozenColumns(layerId: string): number {
    const value = this.#layerOptions(layerId).frozenColumns;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  #requireFamilyNode(
    layerId: string,
    id: string,
    kind: 'network-node' | 'flow-node',
  ): FamilySceneEntry {
    const root = this.#result?.scene.root;
    const entry =
      root === undefined
        ? undefined
        : familySceneEntries(root).find(
            (candidate) =>
              candidate.layerId === layerId &&
              candidate.familyInteraction.kind === kind &&
              candidate.familyInteraction.id === id,
          );
    if (entry === undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `${kind === 'network-node' ? 'Network' : 'Flow'} node "${id}" was not found in layer "${layerId}".`,
      );
    }
    return entry;
  }

  #setFamilyFocus(
    state: ChartFamilyFocusState,
    reason: ChartFamilyFocusChangeEvent['reason'],
  ): this {
    if (JSON.stringify(this.#familyFocus) === JSON.stringify(state)) return this;
    const previous = this.#familyFocus;
    this.#familyFocus = { ...state };
    try {
      this.render();
    } catch (error) {
      this.#familyFocus = previous;
      throw error;
    }
    this.#events.emit('familyfocuschange', {
      chart: this,
      state: { ...state },
      reason,
    });
    return this;
  }

  #setTableRuntimeState(
    layerId: string,
    state: ChartTableRuntimeState,
    reason: ChartTableChangeEvent['reason'],
    emit = true,
  ): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['table']);
    const previous = this.#tableRuntime.get(layerId);
    this.#tableRuntime.set(layerId, cloneTableRuntimeState(state));
    try {
      this.render();
    } catch (error) {
      if (previous === undefined) this.#tableRuntime.delete(layerId);
      else this.#tableRuntime.set(layerId, previous);
      throw error;
    }
    if (emit) {
      this.#events.emit('tablechange', {
        chart: this,
        layerId,
        state: cloneTableRuntimeState(state),
        reason,
      });
    }
    return this;
  }

  #setNetworkRuntimeState(
    layerId: string,
    state: ChartNetworkRuntimeState,
    reason: ChartNetworkChangeEvent['reason'],
    emit = true,
  ): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['graph']);
    const previous = this.#networkRuntime.get(layerId);
    this.#networkRuntime.set(layerId, cloneNetworkRuntimeState(state));
    try {
      this.render();
    } catch (error) {
      if (previous === undefined) this.#networkRuntime.delete(layerId);
      else this.#networkRuntime.set(layerId, previous);
      throw error;
    }
    if (emit) {
      this.#events.emit('networkchange', {
        chart: this,
        layerId,
        state: cloneNetworkRuntimeState(state),
        reason,
      });
    }
    return this;
  }

  #setFlowRuntimeState(
    layerId: string,
    state: ChartFlowRuntimeState,
    reason: ChartFlowChangeEvent['reason'],
    emit = true,
  ): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['sankey']);
    const previous = this.#flowRuntime.get(layerId);
    this.#flowRuntime.set(layerId, cloneFlowRuntimeState(state));
    try {
      this.render();
    } catch (error) {
      if (previous === undefined) this.#flowRuntime.delete(layerId);
      else this.#flowRuntime.set(layerId, previous);
      throw error;
    }
    if (emit) {
      this.#events.emit('flowchange', {
        chart: this,
        layerId,
        state: cloneFlowRuntimeState(state),
        reason,
      });
    }
    return this;
  }

  #setNavigatorRuntimeState(
    layerId: string,
    family: ChartNavigatorFamily,
    state: ChartNavigatorRuntimeState,
    reason: ChartNavigatorChangeEvent['reason'],
    emit = true,
  ): this {
    this.#assertAlive();
    const interaction = this.#navigatorInteraction(layerId);
    if (interaction.family !== family) {
      throw new GraflumeError('INVALID_SPEC', `Navigator family mismatch for layer "${layerId}".`);
    }
    const previous = this.#navigatorRuntime.get(layerId);
    this.#navigatorRuntime.set(layerId, { family, state: cloneNavigatorRuntimeState(state) });
    try {
      this.render();
    } catch (error) {
      if (previous === undefined) this.#navigatorRuntime.delete(layerId);
      else this.#navigatorRuntime.set(layerId, previous);
      throw error;
    }
    if (emit) {
      this.#events.emit('navigatorchange', {
        chart: this,
        layerId,
        family,
        state: cloneNavigatorRuntimeState(state),
        reason,
      });
    }
    return this;
  }

  #setHierarchyRuntimeState(
    layerId: string,
    state: ChartHierarchyRuntimeState,
    reason: ChartHierarchyChangeEvent['reason'],
    emit = true,
  ): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['tree']);
    const previous = this.#hierarchyRuntime.get(layerId);
    this.#hierarchyRuntime.set(layerId, cloneHierarchyRuntimeState(state));
    try {
      this.render();
    } catch (error) {
      if (previous === undefined) this.#hierarchyRuntime.delete(layerId);
      else this.#hierarchyRuntime.set(layerId, previous);
      throw error;
    }
    if (emit) {
      this.#events.emit('hierarchychange', {
        chart: this,
        layerId,
        state: cloneHierarchyRuntimeState(state),
        reason,
      });
    }
    return this;
  }

  #setParallelRuntimeState(
    layerId: string,
    state: ChartParallelRuntimeState,
    reason: ChartParallelChangeEvent['reason'],
    emit = true,
  ): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['parallel']);
    const previous = this.#parallelRuntime.get(layerId);
    this.#parallelRuntime.set(layerId, cloneParallelRuntimeState(state));
    try {
      this.render();
    } catch (error) {
      if (previous === undefined) this.#parallelRuntime.delete(layerId);
      else this.#parallelRuntime.set(layerId, previous);
      throw error;
    }
    if (emit) {
      this.#events.emit('parallelchange', {
        chart: this,
        layerId,
        state: cloneParallelRuntimeState(state),
        reason,
      });
    }
    return this;
  }

  #setHeatmapRuntimeState(
    layerId: string,
    state: ChartHeatmapRuntimeState,
    reason: ChartHeatmapChangeEvent['reason'],
    emit = true,
  ): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['heatmap']);
    const previous = this.#heatmapRuntime.get(layerId);
    this.#heatmapRuntime.set(layerId, cloneHeatmapRuntimeState(state));
    try {
      this.render();
    } catch (error) {
      if (previous === undefined) this.#heatmapRuntime.delete(layerId);
      else this.#heatmapRuntime.set(layerId, previous);
      throw error;
    }
    if (emit) {
      this.#events.emit('heatmapchange', {
        chart: this,
        layerId,
        state: cloneHeatmapRuntimeState(state),
        reason,
      });
    }
    return this;
  }

  #setScatterMatrixRuntimeState(
    layerId: string,
    state: ChartScatterMatrixRuntimeState,
    reason: ChartScatterMatrixChangeEvent['reason'],
    emit = true,
  ): this {
    this.#assertAlive();
    this.#requireFamilyLayer(layerId, ['scatter-matrix']);
    const previous = this.#scatterMatrixRuntime.get(layerId);
    this.#scatterMatrixRuntime.set(layerId, cloneScatterMatrixRuntimeState(state));
    try {
      this.render();
    } catch (error) {
      if (previous === undefined) this.#scatterMatrixRuntime.delete(layerId);
      else this.#scatterMatrixRuntime.set(layerId, previous);
      throw error;
    }
    if (emit) {
      this.#events.emit('scattermatrixchange', {
        chart: this,
        layerId,
        state: cloneScatterMatrixRuntimeState(state),
        reason,
      });
    }
    return this;
  }

  #familyOptions(layerId: string): Readonly<Record<string, import('../spec/types.js').JsonValue>> {
    const options: Record<string, import('../spec/types.js').JsonValue> = {};
    const table = this.#tableRuntime.get(layerId);
    if (table !== undefined) Object.assign(options, tableRuntimeOptions(table));
    const network = this.#networkRuntime.get(layerId);
    if (network !== undefined) Object.assign(options, networkRuntimeOptions(network));
    const flow = this.#flowRuntime.get(layerId);
    if (flow !== undefined) Object.assign(options, flowRuntimeOptions(flow));
    const navigator = this.#navigatorRuntime.get(layerId);
    if (navigator !== undefined) {
      Object.assign(options, navigatorRuntimeOptions(navigator.family, navigator.state));
    }
    const hierarchy = this.#hierarchyRuntime.get(layerId);
    if (hierarchy !== undefined) Object.assign(options, hierarchyRuntimeOptions(hierarchy));
    const parallel = this.#parallelRuntime.get(layerId);
    if (parallel !== undefined) Object.assign(options, parallelRuntimeOptions(parallel));
    const heatmap = this.#heatmapRuntime.get(layerId);
    if (heatmap !== undefined) Object.assign(options, heatmapRuntimeOptions(heatmap));
    const scatterMatrix = this.#scatterMatrixRuntime.get(layerId);
    if (scatterMatrix !== undefined) {
      Object.assign(options, scatterMatrixRuntimeOptions(scatterMatrix));
    }
    if (this.#familyFocus?.layerId === layerId) {
      if (this.#familyFocus.kind === 'pie-slice') {
        options.runtimeFocusedSlice = this.#familyFocus.id;
      } else {
        options.runtimeFocusedCell = {
          row: this.#familyFocus.row,
          column: this.#familyFocus.column,
        };
      }
    }
    return options;
  }

  #familyRuntimeSpec(spec: ChartSpec): ChartSpec {
    const topOptions = this.#familyOptions('layer-0');
    const layers = spec.layers?.map((layer, index) => {
      const layerId = layer.id ?? `layer-${index}`;
      const options = this.#familyOptions(layerId);
      return Object.keys(options).length === 0
        ? layer
        : { ...layer, mark: markWithOptions(layer.mark, options) };
    });
    return {
      ...spec,
      ...(spec.mark === undefined || Object.keys(topOptions).length === 0
        ? {}
        : { mark: markWithOptions(spec.mark, topOptions) }),
      ...(layers === undefined ? {} : { layers }),
    };
  }

  getViewState(): ChartViewState {
    return { ...this.#view, enabled: this.#navigation() !== false };
  }

  getAdaptiveState(): AdaptiveState {
    this.#assertAlive();
    return this.#adaptiveState;
  }

  getPlaybackState(): ChartPlaybackState {
    const frame = this.#playbackFrames[this.#playbackIndex];
    const name = this.#playbackNamedFrames.find(
      (namedFrame) => namedFrame.index === this.#playbackIndex,
    )?.name;
    const hasRange = this.#playbackRange.end >= this.#playbackRange.start;
    return {
      enabled: this.#playback !== false,
      frames: this.#playbackFrames,
      index: this.#playbackIndex,
      ...(frame === undefined ? {} : { frame }),
      playing: this.#playing,
      rate: this.#playbackRate,
      loop: this.#playbackLoop,
      mode: this.#playback === false ? 'frame' : this.#playback.mode,
      direction: this.#playbackDirection,
      ...(hasRange
        ? {
            range: {
              start: this.#playbackRange.start,
              end: this.#playbackRange.end,
              startFrame: this.#playbackFrames[this.#playbackRange.start],
              endFrame: this.#playbackFrames[this.#playbackRange.end],
            },
          }
        : {}),
      namedFrames: this.#playbackNamedFrames,
      ...(name === undefined ? {} : { name }),
      label: name ?? formatPlaybackFrame(frame),
    };
  }

  getLegendState(): ChartLegendState {
    const layout = this.#result === null ? null : sceneLegendLayout(this.#result.scene);
    return {
      enabled: layout !== null,
      items:
        layout?.entries.map((entry) => ({
          id: entry.id,
          label: entry.label,
          color: entry.color,
          visible: entry.visible,
          toggleable: entry.toggleable,
          ...(entry.layerId === undefined ? {} : { layerId: entry.layerId }),
          ...(entry.value === undefined ? {} : { value: entry.value }),
        })) ?? [],
    };
  }

  setLegendItemVisible(id: string, visible: boolean): this {
    return this.#setLegendItemVisible(id, visible, 'programmatic');
  }

  #setLegendItemVisible(id: string, visible: boolean, reason: ChartLegendChangeReason): this {
    this.#assertAlive();
    const item = this.getLegendState().items.find((candidate) => candidate.id === id);
    if (item === undefined) {
      throw new GraflumeError('INVALID_SPEC', `Legend item "${id}" was not found.`);
    }
    if (!item.toggleable) {
      throw new GraflumeError('INVALID_SPEC', `Legend item "${id}" is not toggleable.`);
    }
    if (item.visible === visible) return this;
    if (visible) this.#hiddenLegendItems.delete(id);
    else this.#hiddenLegendItems.add(id);
    this.render();
    this.#events.emit('legendchange', {
      chart: this,
      state: this.getLegendState(),
      reason,
    });
    return this;
  }

  resetLegend(): this {
    this.#assertAlive();
    if (this.#hiddenLegendItems.size === 0) return this;
    this.#hiddenLegendItems.clear();
    this.render();
    this.#events.emit('legendchange', {
      chart: this,
      state: this.getLegendState(),
      reason: 'reset',
    });
    return this;
  }

  getSelection(): ChartSelectionState {
    return {
      enabled: this.#result !== null && this.#result.spec.interaction.selection !== false,
      items: this.#selection.map(cloneDatumTarget),
    };
  }

  setSelection(items: readonly DatumTargetSpec[]): this {
    this.#assertAlive();
    const configuredSelection = this.#result?.spec.interaction.selection;
    if (configuredSelection === false) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Enable interaction.selection before setting selection state.',
      );
    }
    if (configuredSelection !== undefined && configuredSelection.kind !== 'point') {
      throw new GraflumeError(
        'INVALID_SPEC',
        'setSelection() is the point/datum facade; use setAnalyticSelection() for domain geometry.',
      );
    }
    normalizeSpec({
      ...this.#spec,
      // Replace authored highlights while validating selection targets so
      // their count and IDs cannot interfere with transient selection state.
      highlights: items.map((target) => ({ target })),
    });
    const selection = this.#result?.spec.interaction.selection;
    if (
      selection !== undefined &&
      selection !== false &&
      selection.mode === 'single' &&
      items.length > 1
    )
      throw new GraflumeError('INVALID_SPEC', 'Single selection mode accepts at most one target.');
    const next = items.map(cloneDatumTarget);
    const keys = next.map(selectionKey);
    if (new Set(keys).size !== keys.length)
      throw new GraflumeError('INVALID_SPEC', 'Selection targets must be unique.');
    if (
      next.length === this.#selection.length &&
      next.every((target, index) => selectionKey(target) === selectionKey(this.#selection[index]!))
    )
      return this;
    this.#selection = next;
    this.#syncAnalyticPointTargets();
    this.render();
    this.#emitSelection('programmatic');
    this.#emitAnalyticSelection('programmatic');
    return this;
  }

  clearSelection(): this {
    this.#assertAlive();
    if (this.#selection.length === 0) return this;
    this.#selection = [];
    if (this.#result?.spec.interaction.selection !== false) this.#analyticSelection.clear();
    this.render();
    this.#emitSelection('clear');
    this.#emitAnalyticSelection('clear');
    return this;
  }

  getAnalyticSelection(): AnalyticSelectionState {
    this.#assertAlive();
    return this.#analyticSelection.get();
  }

  setAnalyticSelection(state: AnalyticSelectionState): this {
    this.#assertAlive();
    const selection = this.#requireAnalyticSelection();
    const next = normalizeAnalyticSelectionState(state);
    this.#validateAnalyticStateForConfig(next, selection);
    const previous = this.#analyticSelection.get();
    const previousPointSelection = this.#selection;
    this.#analyticSelection.set(next);
    if (selection.kind === 'point') {
      this.#selection = next.selections.flatMap((candidate) =>
        candidate.type === 'point' && candidate.target !== undefined
          ? [cloneDatumTarget(candidate.target)]
          : [],
      );
    } else this.#selection = [];
    try {
      this.render();
    } catch (error) {
      this.#analyticSelection.set(previous);
      this.#selection = previousPointSelection;
      throw error;
    }
    this.#emitAnalyticSelection('programmatic');
    if (selection.kind === 'point') this.#emitSelection('programmatic');
    return this;
  }

  applyAnalyticSelection(
    selection: AnalyticSelection,
    update: AnalyticSelectionUpdate = 'replace',
  ): this {
    this.#assertAlive();
    const config = this.#requireAnalyticSelection();
    const previous = this.#analyticSelection.get();
    const previousPointSelection = this.#selection;
    const next = this.#analyticSelection.apply(selection, update);
    try {
      this.#validateAnalyticStateForConfig(next, config);
      if (config.kind === 'point') {
        this.#selection = next.selections.flatMap((candidate) =>
          candidate.type === 'point' && candidate.target !== undefined
            ? [cloneDatumTarget(candidate.target)]
            : [],
        );
      } else this.#selection = [];
      this.render();
    } catch (error) {
      this.#analyticSelection.set(previous);
      this.#selection = previousPointSelection;
      throw error;
    }
    this.#emitAnalyticSelection('programmatic');
    if (config.kind === 'point') this.#emitSelection('programmatic');
    return this;
  }

  clearAnalyticSelection(): this {
    this.#assertAlive();
    if (this.#analyticSelection.get().selections.length === 0) return this;
    this.#analyticSelection.clear();
    const selection = this.#result?.spec.interaction.selection;
    const pointSelection =
      selection !== undefined && selection !== false && selection.kind === 'point';
    if (pointSelection) {
      this.#selection = [];
    }
    this.render();
    this.#emitAnalyticSelection('clear');
    if (pointSelection) this.#emitSelection('clear');
    return this;
  }

  getAnnotations(): readonly AnnotationSpec[] {
    return this.#annotations.map(cloneAnnotation);
  }

  getAnnotationsVisible(): boolean {
    this.#assertAlive();
    return this.#annotationsVisible;
  }

  setAnnotationsVisible(visible: boolean): this {
    return this.#setAnnotationsVisible(visible, 'programmatic');
  }

  toggleAnnotations(): this {
    this.#assertAlive();
    return this.#setAnnotationsVisible(!this.#annotationsVisible, 'toggle');
  }

  setAnnotations(annotations: readonly AnnotationSpec[]): this {
    this.#assertAlive();
    const resolved = annotations.map((annotation, index) => ({
      ...cloneAnnotation(annotation),
      id: annotationId(annotation, index),
    }));
    normalizeSpec({ ...this.#spec, annotations: resolved });
    this.#annotationHistory.replace(resolved);
    this.#annotations = [...this.#annotationHistory.annotations()];
    this.render();
    this.#emitAnnotations('set');
    return this;
  }

  addAnnotation(annotation: AnnotationSpec): string {
    this.#assertAlive();
    const id = annotation.id ?? `annotation-runtime-${Date.now()}-${this.#annotations.length}`;
    if (this.#annotations.some((candidate) => candidate.id === id)) {
      throw new GraflumeError('INVALID_SPEC', `Annotation "${id}" already exists.`);
    }
    const next = [...this.#annotations, { ...cloneAnnotation(annotation), id }];
    normalizeSpec({ ...this.#spec, annotations: next });
    this.#annotationHistory.replace(next);
    this.#annotations = [...this.#annotationHistory.annotations()];
    this.render();
    this.#emitAnnotations('add', id);
    return id;
  }

  updateAnnotation(id: string, patch: Partial<Omit<AnnotationSpec, 'id'>>): this {
    this.#assertAlive();
    const index = this.#annotations.findIndex((annotation) => annotation.id === id);
    if (index < 0) throw new GraflumeError('INVALID_SPEC', `Annotation "${id}" was not found.`);
    const current = this.#annotations[index]!;
    const updated = cloneAnnotation({ ...current, ...patch, id } as AnnotationSpec);
    const next = this.#annotations.map((annotation, candidate) =>
      candidate === index ? updated : annotation,
    );
    normalizeSpec({ ...this.#spec, annotations: next });
    this.#annotationHistory.replace(next);
    this.#annotations = [...this.#annotationHistory.annotations()];
    this.render();
    this.#emitAnnotations('update', id);
    return this;
  }

  removeAnnotation(id: string): boolean {
    this.#assertAlive();
    const next = this.#annotations.filter((annotation) => annotation.id !== id);
    if (next.length === this.#annotations.length) return false;
    this.#annotationHistory.replace(next);
    this.#annotations = [...this.#annotationHistory.annotations()];
    if (this.#activeAnnotationId === id) this.#activeAnnotationId = null;
    this.render();
    this.#emitAnnotations('remove', id);
    return true;
  }

  getAnnotationAuthoringState(): ChartAnnotationAuthoringState {
    this.#assertAlive();
    return {
      annotations: this.getAnnotations(),
      handles:
        this.#result?.scene.metadata.annotations?.entries.map((entry) => ({
          ...entry,
          bounds: { ...entry.bounds },
          targetBounds: { ...entry.targetBounds },
        })) ?? [],
      canUndo: this.#annotationHistory.canUndo(),
      canRedo: this.#annotationHistory.canRedo(),
      ...(this.#activeAnnotationId === null ? {} : { activeId: this.#activeAnnotationId }),
    };
  }

  selectAnnotation(id: string | null): this {
    this.#assertAlive();
    if (id !== null && !this.#annotations.some((annotation) => annotation.id === id)) {
      throw new GraflumeError('INVALID_SPEC', `Annotation "${id}" was not found.`);
    }
    if (id === this.#activeAnnotationId) return this;
    this.#activeAnnotationId = id;
    this.render();
    this.#emitAnnotations('select', id ?? undefined);
    return this;
  }

  editAnnotationWithKeyboard(
    id: string,
    key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
    options: { readonly step?: number; readonly coarse?: boolean; readonly resize?: boolean } = {},
  ): this {
    this.#assertAlive();
    const annotation = this.#annotations.find((candidate) => candidate.id === id);
    if (annotation === undefined) {
      throw new GraflumeError('INVALID_SPEC', `Annotation "${id}" was not found.`);
    }
    const nextAnnotation = editAnnotationByKeyboard({ annotation, key, ...options });
    const next = this.#annotations.map((candidate) =>
      candidate.id === id ? nextAnnotation : candidate,
    );
    normalizeSpec({ ...this.#spec, annotations: next });
    if (!this.#annotationHistory.replace(next)) return this;
    this.#annotations = [...this.#annotationHistory.annotations()];
    this.#activeAnnotationId = id;
    this.render();
    this.#emitAnnotations('keyboard', id);
    return this;
  }

  undoAnnotationEdit(): boolean {
    this.#assertAlive();
    if (!this.#annotationHistory.undo()) return false;
    this.#annotations = [...this.#annotationHistory.annotations()];
    this.render();
    this.#emitAnnotations('undo', this.#activeAnnotationId ?? undefined);
    return true;
  }

  redoAnnotationEdit(): boolean {
    this.#assertAlive();
    if (!this.#annotationHistory.redo()) return false;
    this.#annotations = [...this.#annotationHistory.annotations()];
    this.render();
    this.#emitAnnotations('redo', this.#activeAnnotationId ?? undefined);
    return true;
  }

  getMarkLabelState(): ChartMarkLabelState {
    this.#assertAlive();
    const metadata = this.#result?.scene.metadata.markLabels;
    const labels =
      metadata?.entries.map((entry) => ({
        ...entry,
        target: cloneDatumTarget(entry.target),
        anchor: { ...entry.anchor },
        baseCenter: { ...entry.baseCenter },
        bounds: { ...entry.bounds },
      })) ?? [];
    return {
      enabled: metadata !== undefined,
      authoring: this.#markLabelAuthoring() !== false,
      labels,
      positions: this.#markLabels.positions(),
      canUndo: this.#markLabels.canUndo(),
      canRedo: this.#markLabels.canRedo(),
      ...(this.#activeMarkLabelId === null ? {} : { activeId: this.#activeMarkLabelId }),
    };
  }

  getMarkLabelPositions(): readonly MarkLabelPositionSpec[] {
    this.#assertAlive();
    return this.#markLabels.positions();
  }

  setMarkLabelPositions(positions: readonly MarkLabelPositionSpec[]): this {
    this.#assertAlive();
    normalizeSpec(this.#specWithMarkLabelPositions(positions));
    if (!this.#markLabels.replace(positions)) return this;
    this.render();
    this.#emitMarkLabels('set');
    return this;
  }

  setMarkLabelPosition(id: string, offsetX: number, offsetY: number): this {
    this.#assertAlive();
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
      throw new RangeError('Mark label offsets must be finite.');
    }
    if (Math.abs(offsetX) > 10_000 || Math.abs(offsetY) > 10_000) {
      throw new RangeError('Mark label offsets must stay within -10000..10000 pixels.');
    }
    const entry = this.#requireMarkLabel(id);
    const next = setMarkLabelOffset(this.#markLabels.positions(), entry.target, offsetX, offsetY);
    if (!this.#markLabels.replace(next)) return this;
    this.#activeMarkLabelId = id;
    this.render();
    this.#emitMarkLabels('programmatic', id);
    return this;
  }

  selectMarkLabel(id: string | null): this {
    this.#assertAlive();
    if (id !== null) this.#requireMarkLabel(id);
    if (id === this.#activeMarkLabelId) return this;
    this.#activeMarkLabelId = id;
    this.render();
    this.#emitMarkLabels('select', id ?? undefined);
    return this;
  }

  resetMarkLabelPositions(): this {
    this.#assertAlive();
    const configured = normalizeSpec(this.#spec).markLabels;
    const positions = configured === false ? [] : configured.positions;
    if (!this.#markLabels.replace(positions)) return this;
    this.render();
    this.#emitMarkLabels('reset');
    return this;
  }

  undoMarkLabelEdit(): boolean {
    this.#assertAlive();
    if (!this.#markLabels.undo()) return false;
    this.render();
    this.#emitMarkLabels('undo', this.#activeMarkLabelId ?? undefined);
    return true;
  }

  redoMarkLabelEdit(): boolean {
    this.#assertAlive();
    if (!this.#markLabels.redo()) return false;
    this.render();
    this.#emitMarkLabels('redo', this.#activeMarkLabelId ?? undefined);
    return true;
  }

  setSpec(spec: ChartSpec): this {
    this.#assertAlive();
    const normalized = normalizeSpec(spec);
    this.pause();
    this.#spec = spec;
    this.#incrementalStores.clear();
    if (!this.#preserveStreamRuntimes) {
      for (const runtime of this.#streamRuntimes.values()) runtime.destroy();
      this.#streamRuntimes.clear();
      this.#workerRuntime?.close();
      this.#workerRuntime = null;
    }
    this.#annotations = normalized.annotations.map((annotation, index) => ({
      ...cloneAnnotation(annotation),
      id: annotationId(annotation, index),
    }));
    this.#annotationHistory.reset(this.#annotations);
    this.#activeAnnotationId = null;
    this.#selection = [];
    this.#analyticSelection.clear();
    this.#tableRuntime.clear();
    this.#networkRuntime.clear();
    this.#flowRuntime.clear();
    this.#navigatorRuntime.clear();
    this.#hierarchyRuntime.clear();
    this.#parallelRuntime.clear();
    this.#heatmapRuntime.clear();
    this.#scatterMatrixRuntime.clear();
    this.#familyFocus = null;
    this.#familyGesture = null;
    this.#technicalCrosshairValue = null;
    this.#domainView = emptyDomainViewState();
    this.#annotationsVisible = true;
    this.#hiddenLegendItems.clear();
    this.#configureInteraction(normalized, true);
    this.#resetMarkLabels(normalized);
    this.render();
    this.#configureResizeObserver();
    this.#emitPlayback('spec');
    this.#events.emit('legendchange', {
      chart: this,
      state: this.getLegendState(),
      reason: 'spec',
    });
    this.#emitSelection('spec');
    this.#emitAnalyticSelection('spec');
    this.#emitDomainView('spec');
    this.#emitAnnotations('spec');
    this.#emitAnnotationVisibility('spec');
    this.#emitMarkLabels('spec');
    this.#events.emit('familyfocuschange', { chart: this, state: null, reason: 'spec' });
    for (const layerId of new Set(
      this.#familyEntries('table-cell').map(({ layerId }) => layerId),
    )) {
      this.#events.emit('tablechange', {
        chart: this,
        layerId,
        state: this.getTableRuntimeState(layerId),
        reason: 'spec',
      });
    }
    for (const layerId of new Set(
      this.#familyEntries('network-node').map(({ layerId }) => layerId),
    )) {
      this.#events.emit('networkchange', {
        chart: this,
        layerId,
        state: this.getNetworkRuntimeState(layerId),
        reason: 'spec',
      });
    }
    for (const layerId of new Set(this.#familyEntries('flow-node').map(({ layerId }) => layerId))) {
      this.#events.emit('flowchange', {
        chart: this,
        layerId,
        state: this.getFlowRuntimeState(layerId),
        reason: 'spec',
      });
    }
    for (const layerId of new Set(
      this.#familyEntries('navigator-window').map(({ layerId }) => layerId),
    )) {
      const interaction = this.#navigatorInteraction(layerId);
      this.#events.emit('navigatorchange', {
        chart: this,
        layerId,
        family: interaction.family,
        state: this.getNavigatorWindow(layerId),
        reason: 'spec',
      });
    }
    for (const layerId of new Set(
      this.#familyEntries('hierarchy-node').map(({ layerId }) => layerId),
    )) {
      this.#events.emit('hierarchychange', {
        chart: this,
        layerId,
        state: this.getHierarchyRuntimeState(layerId),
        reason: 'spec',
      });
    }
    for (const layerId of new Set(
      this.#familyEntries('parallel-axis').map(({ layerId }) => layerId),
    )) {
      this.#events.emit('parallelchange', {
        chart: this,
        layerId,
        state: this.getParallelRuntimeState(layerId),
        reason: 'spec',
      });
    }
    for (const layerId of new Set(
      this.#familyEntries('heatmap-cell').map(({ layerId }) => layerId),
    )) {
      this.#events.emit('heatmapchange', {
        chart: this,
        layerId,
        state: this.getHeatmapBrush(layerId),
        reason: 'spec',
      });
    }
    for (const layerId of new Set(
      this.#familyEntries('scatter-matrix-cell').map(({ layerId }) => layerId),
    )) {
      const state = this.getScatterMatrixBrush(layerId);
      if (state !== null) {
        this.#events.emit('scattermatrixchange', {
          chart: this,
          layerId,
          state,
          reason: 'spec',
        });
      }
    }
    this.#startAutoplay();
    return this;
  }

  setData(data: DataInput, layerId?: string): this {
    this.#assertAlive();
    if (layerId === undefined) {
      if (this.#spec.data !== undefined || this.#spec.layers === undefined) {
        return this.setSpec({ ...this.#spec, data });
      }
      if (this.#spec.layers.length === 1) {
        const onlyLayer = this.#spec.layers[0];
        if (onlyLayer !== undefined) {
          return this.setSpec({ ...this.#spec, layers: [{ ...onlyLayer, data }] });
        }
      }
      throw new GraflumeError(
        'INVALID_DATA',
        'Specify layerId when replacing data in a multi-layer chart.',
      );
    }

    let matched = false;
    const layers = this.#spec.layers?.map((layer, index) => {
      if ((layer.id ?? `layer-${index}`) !== layerId) return layer;
      matched = true;
      return { ...layer, data };
    });
    if (!matched || layers === undefined) {
      throw new GraflumeError('INVALID_DATA', `Layer "${layerId}" was not found.`);
    }
    return this.setSpec({ ...this.#spec, layers });
  }

  appendData(rows: readonly DataRow[], layerId?: string): this {
    this.#assertAlive();
    if (rows.length === 0) return this;
    if (this.#spec.streaming !== undefined) {
      return this.updateData({ mode: 'append', rows }, layerId);
    }
    if (layerId === undefined && this.#spec.data !== undefined) {
      return this.setSpec({ ...this.#spec, data: appendInput(this.#spec.data, rows) });
    }
    if (this.#spec.layers === undefined) {
      throw new GraflumeError('INVALID_DATA', 'The chart has no layer data to append to.');
    }
    const targetLayerId =
      layerId ??
      (this.#spec.layers.length === 1 ? (this.#spec.layers[0]?.id ?? 'layer-0') : undefined);
    if (targetLayerId === undefined) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Specify layerId when appending to a multi-layer chart.',
      );
    }
    let matched = false;
    const layers = this.#spec.layers.map((layer, index) => {
      if ((layer.id ?? `layer-${index}`) !== targetLayerId) return layer;
      const source = layer.data ?? this.#spec.data;
      if (source === undefined) {
        throw new GraflumeError('INVALID_DATA', `Layer "${targetLayerId}" has no data source.`);
      }
      matched = true;
      return { ...layer, data: appendInput(source, rows) };
    });
    if (!matched)
      throw new GraflumeError('INVALID_DATA', `Layer "${targetLayerId}" was not found.`);
    return this.setSpec({ ...this.#spec, layers });
  }

  /** Apply a bounded stable-key mutation configured by ChartSpec.streaming. */
  updateData(update: IncrementalUpdate, layerId?: string): this {
    this.#assertAlive();
    const streaming = this.#spec.streaming;
    if (streaming === undefined) {
      throw new GraflumeError(
        'INVALID_DATA',
        'updateData requires an explicit ChartSpec.streaming contract.',
      );
    }
    const target = this.#streamingTarget(layerId);
    const store =
      this.#incrementalStores.get(target.id) ?? new IncrementalDataStore(target.source, streaming);
    const result = store.apply(update);
    this.setData(result.rows, target.layerId);
    this.#incrementalStores.set(target.id, store);
    return this;
  }

  upsertData(rows: readonly DataRow[], layerId?: string, watermark?: number): this {
    return this.updateData(
      { mode: 'upsert', rows, ...(watermark === undefined ? {} : { watermark }) },
      layerId,
    );
  }

  replaceLastData(rows: readonly DataRow[], layerId?: string, watermark?: number): this {
    return this.updateData(
      { mode: 'replaceLast', rows, ...(watermark === undefined ? {} : { watermark }) },
      layerId,
    );
  }

  /** Queue an authored streaming mutation through the bounded frame runtime. */
  async enqueueData(
    update: IncrementalUpdate,
    layerId?: string,
    options: StreamEnqueueOptions = {},
  ): Promise<this> {
    this.#assertAlive();
    const runtime = this.#streamRuntime(layerId);
    const result = await runtime.enqueue(update, options);
    this.#assertAlive();
    const visible = runtime.visible();
    if (visible !== null && visible.state.sequence === result.state.sequence) {
      this.#applyStreamingRows(visible.rows, layerId);
    }
    return this;
  }

  pauseStreaming(layerId?: string): this {
    this.#assertAlive();
    this.#streamRuntime(layerId).pause();
    return this;
  }

  resumeStreaming(layerId?: string): this {
    this.#assertAlive();
    this.#streamRuntime(layerId).resume();
    return this;
  }

  setStreamingFollowLive(follow: boolean, layerId?: string): this {
    this.#assertAlive();
    if (typeof follow !== 'boolean') {
      throw new GraflumeError('INVALID_DATA', 'Streaming follow-live state must be boolean.');
    }
    const runtime = this.#streamRuntime(layerId);
    runtime.setFollowLive(follow);
    const visible = runtime.visible();
    if (follow && visible !== null) this.#applyStreamingRows(visible.rows, layerId);
    return this;
  }

  getStreamRuntimeState(layerId?: string): IncrementalStreamRuntimeState | null {
    this.#assertAlive();
    const target = this.#streamingTarget(layerId, false);
    return target === null ? null : (this.#streamRuntimes.get(target.id)?.state() ?? null);
  }

  getStreamingHistoryPage(cursor = 0, layerId?: string): StreamHistoryPage {
    this.#assertAlive();
    return this.#streamRuntime(layerId).historyPage(cursor);
  }

  /** Lazily constructs the module Worker declared by ChartSpec.streaming.worker. */
  getWorkerRuntime(): AutomaticWorkerRuntime {
    this.#assertAlive();
    const spec = this.#spec.streaming?.worker;
    if (spec === undefined) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'getWorkerRuntime requires ChartSpec.streaming.worker.',
      );
    }
    this.#workerRuntime ??= new AutomaticWorkerRuntime(spec, this.#options.workerFactory);
    return this.#workerRuntime;
  }

  getStreamingState(layerId?: string): IncrementalDataState | null {
    this.#assertAlive();
    const target = this.#streamingTarget(layerId, false);
    return target === null ? null : (this.#incrementalStores.get(target.id)?.state() ?? null);
  }

  exportStreamingReplay(layerId?: string): IncrementalReplay {
    this.#assertAlive();
    const target = this.#streamingTarget(layerId);
    const store = this.#incrementalStores.get(target.id);
    if (store === undefined) {
      throw new GraflumeError('INVALID_DATA', 'No incremental updates are available to replay.');
    }
    return store.exportReplay();
  }

  replayData(replay: IncrementalReplay, layerId?: string): this {
    this.#assertAlive();
    const target = this.#streamingTarget(layerId);
    const streaming = this.#spec.streaming;
    if (streaming === undefined || !incrementalContractsMatch(replay.options, streaming)) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Replay options do not match the current ChartSpec.streaming contract.',
      );
    }
    const store = IncrementalDataStore.replay(replay);
    this.setData(store.rows(), target.layerId);
    this.#incrementalStores.set(target.id, store);
    return this;
  }

  resize(width?: number, height?: number): this {
    this.#assertAlive();
    this.#manualWidth = width;
    this.#manualHeight = height;
    this.render();
    const scene = this.#result?.scene;
    if (scene !== undefined) {
      this.#events.emit('resize', { chart: this, width: scene.width, height: scene.height });
      this.#emitView('resize');
    }
    return this;
  }

  zoomBy(factor: number, anchor?: ChartViewPoint): this {
    this.#assertAlive();
    const navigation = this.#requireNavigation();
    const scene = this.#result?.scene;
    if (scene === undefined) return this;
    this.#setView(
      zoomInspectionView(
        this.#view,
        factor,
        anchor ?? { x: scene.width / 2, y: scene.height / 2 },
        {
          width: scene.width,
          height: scene.height,
          minZoom: navigation.minZoom,
          maxZoom: navigation.maxZoom,
        },
      ),
      'zoom',
    );
    return this;
  }

  panBy(deltaX: number, deltaY: number): this {
    this.#assertAlive();
    const navigation = this.#requireNavigation();
    const scene = this.#result?.scene;
    if (scene === undefined) return this;
    this.#setView(
      panInspectionView(this.#view, deltaX, deltaY, {
        width: scene.width,
        height: scene.height,
        minZoom: navigation.minZoom,
        maxZoom: navigation.maxZoom,
      }),
      'pan',
    );
    return this;
  }

  resetView(): this {
    this.#assertAlive();
    const navigation = this.#requireNavigation();
    const scene = this.#result?.scene;
    if (scene === undefined) return this;
    this.#setView(
      constrainInspectionView(identityInspectionView, {
        width: scene.width,
        height: scene.height,
        minZoom: navigation.minZoom,
        maxZoom: navigation.maxZoom,
      }),
      'reset',
    );
    return this;
  }

  getDomainViewState(): DomainViewState {
    this.#assertAlive();
    return this.#domainView;
  }

  setDomainViewState(state: DomainViewState): this {
    this.#assertAlive();
    const navigation = this.#requireDomainNavigation();
    const next = normalizeDomainViewState(state);
    for (const axis of Object.keys(next.axes) as AxisId[]) {
      if (!navigation.axes.includes(axis)) {
        throw new GraflumeError(
          'INVALID_SPEC',
          `Axis "${axis}" is not enabled by interaction.domainNavigation.axes.`,
        );
      }
    }
    return this.#setDomainView(next, 'programmatic');
  }

  zoomDomainBy(
    factor: number,
    anchor?: ChartViewPoint,
    axes?: readonly AxisId[],
    viewId?: string,
  ): this {
    this.#assertAlive();
    const navigation = this.#requireDomainNavigation();
    const result = this.#result;
    if (result === null) return this;
    const located =
      anchor === undefined || viewId !== undefined ? null : this.#coordinateAt(anchor);
    const view = this.#coordinateView(viewId ?? located?.view.id);
    const selectedAxes = this.#domainAxes(navigation, axes);
    const point =
      anchor === undefined
        ? {
            x: view.coordinates.plot.x + view.coordinates.plot.width / 2,
            y: view.coordinates.plot.y + view.coordinates.plot.height / 2,
          }
        : (located?.point ?? this.#localPoint(view.id, anchor));
    let next = this.#domainView;
    for (const axis of selectedAxes) {
      next = zoomDomainAtPixel(
        next,
        view.coordinates,
        axis,
        factor,
        cartesianAxisChannel(view.coordinates, axis) === 'x' ? point.x : point.y,
        navigation.maxZoom,
      );
    }
    return this.#setDomainView(next, 'zoom');
  }

  panDomainBy(deltaX: number, deltaY: number, axes?: readonly AxisId[], viewId?: string): this {
    this.#assertAlive();
    const navigation = this.#requireDomainNavigation();
    const result = this.#result;
    if (result === null) return this;
    const view = this.#coordinateView(viewId);
    let next = this.#domainView;
    for (const axis of this.#domainAxes(navigation, axes)) {
      next = panDomainByPixels(
        next,
        view.coordinates,
        axis,
        cartesianAxisChannel(view.coordinates, axis) === 'x' ? deltaX : deltaY,
      );
    }
    return this.#setDomainView(next, 'pan');
  }

  resetDomainView(): this {
    this.#assertAlive();
    this.#requireDomainNavigation();
    return this.#setDomainView(emptyDomainViewState(), 'reset');
  }

  #resolvePlaybackReference(
    reference: PlaybackFrameReference | undefined,
    fallback: number,
    bound: 'start' | 'end' | 'target',
  ): number {
    if (reference === undefined) return fallback;
    if (typeof reference === 'string') {
      const named = this.#playbackNamedFrames.find((frame) => frame.name === reference);
      if (named === undefined) {
        throw new GraflumeError('INVALID_SPEC', `Unknown playback frame name "${reference}".`, {
          path:
            bound === 'target'
              ? '$.interaction.playback.namedFrames'
              : `$.interaction.playback.range.${bound}`,
        });
      }
      return named.index;
    }
    if (!Number.isFinite(reference) || !Number.isInteger(reference)) {
      throw new RangeError('Playback frame index must be a finite integer.');
    }
    return reference;
  }

  play(from?: PlaybackFrameReference): this {
    this.#assertAlive();
    if (this.#playback === false || this.#playbackFrames.length === 0) return this;
    if (from !== undefined) this.seek(from);
    const rangeLength = this.#playbackRange.end - this.#playbackRange.start + 1;
    if (rangeLength <= 1 || this.#playing) return this;
    if (typeof document !== 'undefined' && document.hidden) return this;
    const terminal =
      this.#playbackDirection === 'forward' ? this.#playbackRange.end : this.#playbackRange.start;
    if (from === undefined && this.#playbackIndex === terminal) {
      const previousIndex = this.#playbackIndex;
      const restart =
        this.#playbackDirection === 'forward' ? this.#playbackRange.start : this.#playbackRange.end;
      this.#renderPlaybackIndex(restart);
      this.#emitPlayback('seek', previousIndex);
    }
    this.#playing = true;
    this.#playbackTimestamp = null;
    this.#schedulePlaybackFrame();
    this.#emitPlayback('play');
    this.#syncControls();
    return this;
  }

  pause(): this {
    if (this.#destroyed || (!this.#playing && this.#sceneTransition === null)) return this;
    this.#stopPlayback(true);
    return this;
  }

  step(delta = 1): this {
    this.#assertAlive();
    if (!Number.isFinite(delta)) throw new RangeError('Playback step must be finite.');
    if (this.#playback === false || this.#playbackFrames.length === 0) return this;
    const start = this.#playbackRange.start;
    const end = this.#playbackRange.end;
    const length = end - start + 1;
    let next = this.#playbackIndex + Math.trunc(delta);
    if (this.#playbackLoop) next = start + ((((next - start) % length) + length) % length);
    else next = Math.max(start, Math.min(end, next));
    if (next === this.#playbackIndex) {
      if (this.#playing && !this.#playbackLoop) this.#stopPlayback(true);
      else if (this.#sceneTransition !== null) this.#finishSceneTransition();
      return this;
    }
    const previousIndex = this.#playbackIndex;
    this.#renderPlaybackIndex(next);
    this.#emitPlayback('step', previousIndex);
    const terminal = this.#playbackDirection === 'forward' ? end : start;
    if (this.#playing && !this.#playbackLoop && next === terminal) {
      this.#stopPlayback(false);
    }
    return this;
  }

  seek(target: PlaybackFrameReference): this {
    this.#assertAlive();
    if (this.#playback === false || this.#playbackFrames.length === 0) return this;
    const resolved = this.#resolvePlaybackReference(target, this.#playbackRange.start, 'target');
    const named = typeof target === 'string';
    if (named && (resolved < this.#playbackRange.start || resolved > this.#playbackRange.end)) {
      throw new RangeError(`Named playback frame "${target}" is outside the active range.`);
    }
    const next = Math.max(
      this.#playbackRange.start,
      Math.min(this.#playbackRange.end, Math.trunc(resolved)),
    );
    if (next === this.#playbackIndex) {
      if (this.#sceneTransition !== null) this.#finishSceneTransition();
      return this;
    }
    const previousIndex = this.#playbackIndex;
    this.#renderPlaybackIndex(next);
    this.#emitPlayback('seek', previousIndex);
    return this;
  }

  setPlaybackDirection(direction: PlaybackDirection): this {
    this.#assertAlive();
    if (direction !== 'forward' && direction !== 'reverse') {
      throw new TypeError('Playback direction must be "forward" or "reverse".');
    }
    if (this.#playback === false || this.#playbackDirection === direction) return this;
    this.#playbackDirection = direction;
    this.#playbackTimestamp = null;
    this.#emitPlayback('direction');
    this.#syncControls();
    return this;
  }

  setPlaybackRange(range?: PlaybackRangeSpec): this {
    this.#assertAlive();
    if (this.#playback === false) return this;
    if (
      range !== undefined &&
      (typeof range !== 'object' || range === null || Array.isArray(range))
    ) {
      throw new TypeError('Playback range must be an object.');
    }
    if (this.#playbackFrames.length === 0) {
      if (range !== undefined) {
        throw new RangeError('Playback range cannot be set without available frames.');
      }
      return this;
    }
    const start = this.#resolvePlaybackReference(range?.start, 0, 'start');
    const end = this.#resolvePlaybackReference(range?.end, this.#playbackFrames.length - 1, 'end');
    if (
      start < 0 ||
      start >= this.#playbackFrames.length ||
      end < 0 ||
      end >= this.#playbackFrames.length
    ) {
      throw new RangeError('Playback range must stay within the available frame indices.');
    }
    if (start > end) throw new RangeError('Playback range start must not exceed its end.');
    if (start === this.#playbackRange.start && end === this.#playbackRange.end) return this;
    const previousIndex = this.#playbackIndex;
    this.#playbackRange = { start, end };
    this.#playbackTimestamp = null;
    this.#renderPlaybackIndex(Math.max(start, Math.min(end, previousIndex)));
    this.#emitPlayback('range', previousIndex);
    return this;
  }

  setPlaybackRate(rate: number): this {
    this.#assertAlive();
    if (!Number.isFinite(rate) || rate < 0.1 || rate > 16) {
      throw new RangeError('Playback rate must be from 0.1 to 16.');
    }
    if (this.#playback === false || this.#playbackRate === rate) return this;
    this.#playbackRate = rate;
    this.#emitPlayback('rate');
    this.#syncControls();
    return this;
  }

  setPlaybackLoop(loop: boolean): this {
    this.#assertAlive();
    if (typeof loop !== 'boolean') throw new TypeError('Playback loop must be a boolean.');
    if (this.#playback === false || this.#playbackLoop === loop) return this;
    this.#playbackLoop = loop;
    this.#emitPlayback('loop');
    this.#syncControls();
    return this;
  }

  async toggleFullscreen(): Promise<void> {
    this.#assertAlive();
    const host = this.#renderer?.overlayHost?.();
    if (
      host === null ||
      host === undefined ||
      typeof document === 'undefined' ||
      typeof host.requestFullscreen !== 'function' ||
      typeof document.exitFullscreen !== 'function'
    ) {
      throw new GraflumeError(
        'UNSUPPORTED_RENDERER',
        'Fullscreen is unavailable for the active chart surface.',
      );
    }
    try {
      if (document.fullscreenElement === host) await document.exitFullscreen();
      else {
        if (document.fullscreenElement !== null) await document.exitFullscreen();
        await host.requestFullscreen();
      }
    } catch (error) {
      this.#events.emit('error', { chart: this, error });
      throw error;
    }
  }

  scheduleRender(): void {
    this.#assertAlive();
    this.#scheduler.schedule(() => {
      try {
        this.render();
      } catch (error) {
        this.#events.emit('error', { chart: this, error });
      }
    });
  }

  render(): this {
    this.#assertAlive();
    this.#cancelSceneTransition();
    return this.#renderEndpoint();
  }

  #renderEndpoint(): this {
    const dimensions = this.#measure();
    const previousAdaptiveState = this.#adaptiveState;
    this.#adaptiveState = resolveAdaptiveProfile(
      detectBrowserAdaptiveEnvironment(
        {
          ...dimensions,
          rowCount: estimateSpecRowCount(this.#spec),
          direction:
            this.#target.closest?.('[dir="rtl"]') != null ||
            this.#target.ownerDocument?.documentElement?.getAttribute('dir') === 'rtl'
              ? 'rtl'
              : 'ltr',
        },
        this.#adaptiveOptions.environment,
      ),
      this.#adaptiveOptions,
    );
    if (this.#adaptiveState.motion !== 'full' && this.#playing) this.pause();
    const familyRuntimeSpec = this.#familyRuntimeSpec(this.#spec);
    const playbackSpecInput =
      this.#playback === false
        ? familyRuntimeSpec
        : playbackSpec(
            familyRuntimeSpec,
            this.#playback,
            this.#playbackFrames,
            this.#playbackIndex,
            this.#playbackRange.start,
          );
    // Fullscreen sizing is transient: it must override fixed chart dimensions
    // without mutating the caller's portable base spec.
    const dimensionSpec = this.#fullscreen
      ? { ...playbackSpecInput, width: 'container' as const, height: 'container' as const }
      : playbackSpecInput;
    const effectiveSpec = adaptChartSpec(dimensionSpec, this.#adaptiveState);
    const analyticSelectionDraft = this.#analyticSelectionDraft();
    const result = compileWithRegistry(effectiveSpec, this.#registry, dimensions, {
      hiddenLegendItemIds: this.#hiddenLegendItems,
      annotations: this.#annotations,
      annotationsVisible: this.#annotationsVisible,
      ...(this.#activeAnnotationId === null
        ? {}
        : { activeAnnotationId: this.#activeAnnotationId }),
      markLabelPositions: this.#markLabels.positions(),
      ...(this.#activeMarkLabelId === null ? {} : { activeMarkLabelId: this.#activeMarkLabelId }),
      selection: this.#selection,
      analyticSelection: this.#analyticSelection.get(),
      ...(analyticSelectionDraft === undefined ? {} : { analyticSelectionDraft }),
      domainView: this.#domainView,
      ...(this.#technicalCrosshairValue === null
        ? {}
        : { technicalCrosshairValue: this.#technicalCrosshairValue }),
    });
    this.#validateAnalyticCapabilities(result);
    const factory = this.#registry.resolveRenderer(result.spec.renderer);
    const pixelRatio = this.#pixelRatio();
    const rendererChanged = this.#renderer === null || this.#rendererName !== factory.name;

    if (rendererChanged) {
      this.#detachSurfaceEvents();
      this.#controls.destroy();
      this.#legend.destroy();
      this.#accessibility.destroy();
      this.#destroyMarkLabelLive();
      this.#destroySelectionLive();
      this.#renderer?.destroy();
      this.#renderer = factory.create();
      this.#rendererName = factory.name;
      this.#renderer.mount(this.#target, {
        width: result.scene.width,
        height: result.scene.height,
        pixelRatio,
        ariaLabel: result.scene.accessibility.label,
        ...(result.scene.accessibility.description === undefined
          ? {}
          : { ariaDescription: result.scene.accessibility.description }),
      });
    } else {
      const renderer = this.#renderer;
      if (renderer === null) {
        throw new GraflumeError('UNSUPPORTED_RENDERER', 'The active renderer is unavailable.');
      }
      renderer.resize(result.scene.width, result.scene.height, pixelRatio);
      const surface = renderer.surface();
      surface?.setAttribute('aria-label', result.scene.accessibility.label);
      if (result.scene.accessibility.description === undefined) {
        surface?.removeAttribute('aria-description');
      } else {
        surface?.setAttribute('aria-description', result.scene.accessibility.description);
      }
    }

    this.#result = result;
    this.#constrainViewToScene();
    const renderer = this.#renderer;
    if (renderer === null) {
      throw new GraflumeError('UNSUPPORTED_RENDERER', 'The active renderer is unavailable.');
    }
    renderer.setInspectionView?.(this.#view);
    renderer.render(result.scene);
    this.#displayScene = result.scene;
    this.#syncSurfaceEvents();
    const adaptiveHost = renderer.overlayHost?.();
    if (adaptiveHost !== null && adaptiveHost !== undefined) {
      applyAdaptiveSurface(adaptiveHost, renderer.surface(), this.#adaptiveState);
    }
    this.#syncControls();
    this.#syncLegend();
    this.#syncAccessibilityMirror();
    this.#syncMarkLabelAccessibility();
    this.#syncSelectionAccessibility();
    this.#events.emit('render', { chart: this, scene: result.scene });
    if (
      adaptiveStateSignature(previousAdaptiveState) !== adaptiveStateSignature(this.#adaptiveState)
    ) {
      this.#events.emit('adaptivechange', {
        chart: this,
        state: this.#adaptiveState,
        previous: previousAdaptiveState,
      });
    }
    return this;
  }

  #validateAnalyticCapabilities(result: CompileResult): void {
    const requireAxis = (
      view: CompileCoordinateView,
      axis: AxisId,
      feature: string,
      continuous: boolean,
    ): void => {
      const scale = view.coordinates.axes[axis];
      const viewLabel = view.label === '' ? view.id : `${view.id} (${view.label})`;
      if (scale === undefined) {
        throw new GraflumeError(
          'INCOMPATIBLE_SCALE',
          `${feature} requires resolved axis "${axis}" in coordinate view "${viewLabel}".`,
          { path: `$.axes.${axis}` },
        );
      }
      if (
        scale.invert === undefined &&
        (continuous || (scale.kind !== 'band' && scale.kind !== 'point'))
      ) {
        throw new GraflumeError(
          'INCOMPATIBLE_SCALE',
          continuous
            ? `${feature} requires an invertible continuous axis; "${axis}" in coordinate view "${viewLabel}" uses "${scale.kind}".`
            : `${feature} requires an invertible continuous, band, or point axis; "${axis}" in coordinate view "${viewLabel}" uses "${scale.kind}".`,
          { path: `$.axes.${axis}` },
        );
      }
    };
    const navigation = result.spec.interaction.domainNavigation;
    if (navigation !== false) {
      for (const view of result.coordinateViews) {
        for (const axis of navigation.axes) requireAxis(view, axis, 'Domain navigation', false);
      }
    }
    const selection = result.spec.interaction.selection;
    if (selection === false) {
      if (this.#analyticSelection.get().selections.length > 0) {
        throw new GraflumeError(
          'INVALID_SPEC',
          'Analytic selection state requires interaction.selection.',
        );
      }
      return;
    }
    this.#validateAnalyticStateForConfig(this.#analyticSelection.get(), selection);
    for (const view of result.coordinateViews) {
      if (selection.kind === 'axis') {
        requireAxis(view, selection.axis!, 'Axis selection', false);
      } else if (
        selection.kind === 'interval' ||
        selection.kind === 'rectangle' ||
        selection.kind === 'lasso'
      ) {
        const continuous = selection.kind === 'lasso';
        requireAxis(view, selection.xAxis, `${selection.kind} selection`, continuous);
        requireAxis(view, selection.yAxis, `${selection.kind} selection`, continuous);
      }
    }
  }

  toDataURL(type?: string, quality?: number): string {
    this.#assertAlive();
    if (this.#renderer?.toDataURL === undefined) {
      throw new GraflumeError(
        'UNSUPPORTED_RENDERER',
        'The active renderer cannot export a data URL.',
      );
    }
    return this.#renderer.toDataURL(type, quality);
  }

  destroy(): void {
    if (this.#destroyed) return;
    const exitFullscreen = this.#isOwnFullscreen();
    this.#playing = false;
    this.#sceneTransition = null;
    this.#cancelPlaybackFrame();
    this.#scheduler.cancel();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (this.#windowResizeListener !== null && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.#windowResizeListener);
    }
    this.#windowResizeListener = null;
    this.#detachEnvironmentListeners();
    if (
      exitFullscreen &&
      typeof document !== 'undefined' &&
      typeof document.exitFullscreen === 'function'
    ) {
      void document.exitFullscreen().catch(() => undefined);
    }
    this.#fullscreen = false;
    this.#detachSurfaceEvents();
    this.#controls.destroy();
    this.#legend.destroy();
    this.#accessibility.destroy();
    this.#linkedFocusUnregister?.();
    this.#linkedFocusUnsubscribe?.();
    this.#linkedViewUnregister?.();
    this.#linkedFocusUnregister = null;
    this.#linkedFocusUnsubscribe = null;
    this.#linkedViewUnregister = null;
    for (const runtime of this.#streamRuntimes.values()) runtime.destroy();
    this.#streamRuntimes.clear();
    this.#workerRuntime?.close({ terminate: true });
    this.#workerRuntime = null;
    this.#destroyMarkLabelLive();
    this.#destroySelectionLive();
    this.#tooltip.destroy();
    this.#renderer?.destroy();
    this.#renderer = null;
    this.#result = null;
    this.#displayScene = null;
    this.#events.clear();
    this.#destroyed = true;
  }

  #configureInteraction(spec: NormalizedChartSpec, reset: boolean): void {
    this.#cancelActiveGesture();
    const navigation = spec.interaction.navigation;
    if (navigation === false) this.#view = identityInspectionView;
    else if (reset) this.#view = { zoom: navigation.minZoom, offsetX: 0, offsetY: 0 };
    if (reset) this.#domainView = emptyDomainViewState();

    this.#playback = spec.interaction.playback;
    if (this.#playback === false) {
      this.#playbackFrames = [];
      this.#playbackIndex = 0;
      this.#playbackRate = 1;
      this.#playbackLoop = false;
      this.#playbackDirection = 'forward';
      this.#playbackRange = { start: 0, end: -1 };
      this.#playbackNamedFrames = [];
      return;
    }
    this.#playbackFrames = collectPlaybackFrames(this.#spec, this.#playback);
    const timeline = resolvePlaybackTimeline(this.#playbackFrames, this.#playback);
    this.#playbackRate = this.#playback.rate;
    this.#playbackLoop = this.#playback.loop;
    this.#playbackDirection = this.#playback.direction;
    this.#playbackRange = timeline.range;
    this.#playbackNamedFrames = timeline.namedFrames;
    const initial = configuredFrame(this.#spec);
    const initialIndex =
      initial === undefined
        ? -1
        : this.#playbackFrames.findIndex(
            (frame) => playbackFrameKey(frame) === playbackFrameKey(initial),
          );
    const initialInRange =
      initialIndex >= this.#playbackRange.start && initialIndex <= this.#playbackRange.end;
    const directionalStart =
      this.#playbackDirection === 'forward' ? this.#playbackRange.start : this.#playbackRange.end;
    this.#playbackIndex = initialInRange
      ? initialIndex
      : this.#playback.autoplay || this.#playback.mode === 'frame'
        ? Math.max(0, directionalStart)
        : Math.max(0, this.#playbackRange.end);
  }

  #navigation(): false | NormalizedNavigationSpec {
    return this.#result?.spec.interaction.navigation ?? false;
  }

  #domainNavigation(): false | NormalizedDomainNavigationSpec {
    return this.#result?.spec.interaction.domainNavigation ?? false;
  }

  #requireDomainNavigation(): NormalizedDomainNavigationSpec {
    const navigation = this.#domainNavigation();
    if (navigation === false) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Enable interaction.domainNavigation before changing data domains.',
      );
    }
    return navigation;
  }

  #domainAxes(
    navigation: NormalizedDomainNavigationSpec,
    requested?: readonly AxisId[],
  ): readonly AxisId[] {
    const axes = requested ?? navigation.axes;
    if (axes.length === 0 || new Set(axes).size !== axes.length) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Domain navigation axes must be non-empty and unique.',
      );
    }
    for (const axis of axes) {
      if (!navigation.axes.includes(axis)) {
        throw new GraflumeError(
          'INVALID_SPEC',
          `Axis "${axis}" is not enabled by interaction.domainNavigation.axes.`,
        );
      }
    }
    return axes;
  }

  #setDomainView(state: DomainViewState, reason: ChartDomainViewChangeReason): this {
    const next = normalizeDomainViewState(state);
    if (sameDomainView(next, this.#domainView)) return this;
    const previous = this.#domainView;
    this.#domainView = next;
    this.#tooltip.hide();
    try {
      this.render();
    } catch (error) {
      this.#domainView = previous;
      throw error;
    }
    this.#emitDomainView(reason);
    return this;
  }

  #emitDomainView(reason: ChartDomainViewChangeReason): void {
    this.#events.emit('domainviewchange', { chart: this, state: this.#domainView, reason });
    if (!this.#applyingLinkedViewState) {
      this.#options.linkedViewStore?.setDomainView(this.#domainView, this.#semanticViewId);
    }
  }

  #requireNavigation(): NormalizedNavigationSpec {
    const navigation = this.#navigation();
    if (navigation === false) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Enable interaction.navigation before changing the inspection viewport.',
      );
    }
    if (
      this.#renderer?.capabilities.inspectionViewport !== true ||
      this.#renderer.setInspectionView === undefined
    ) {
      throw new GraflumeError(
        'UNSUPPORTED_RENDERER',
        'The active renderer does not support inspection viewport navigation.',
      );
    }
    return navigation;
  }

  #viewBounds(navigation: NormalizedNavigationSpec) {
    const scene = this.#result?.scene;
    return scene === undefined
      ? null
      : {
          width: scene.width,
          height: scene.height,
          minZoom: navigation.minZoom,
          maxZoom: navigation.maxZoom,
        };
  }

  #constrainViewToScene(): void {
    const navigation = this.#navigation();
    if (navigation === false) {
      this.#view = identityInspectionView;
      return;
    }
    const bounds = this.#viewBounds(navigation);
    if (bounds !== null) this.#view = constrainInspectionView(this.#view, bounds);
  }

  #setView(view: InspectionViewState, reason: ChartViewChangeReason): void {
    if (sameView(this.#view, view)) return;
    this.#view = view;
    this.#tooltip.hide();
    const scene = this.#displayScene ?? this.#result?.scene;
    if (scene !== undefined) {
      this.#renderer?.setInspectionView?.(this.#view);
      this.#renderer?.render(scene);
    }
    this.#syncSurfaceConfiguration();
    this.#syncControls();
    this.#syncLegend();
    this.#syncAccessibilityMirror();
    this.#emitView(reason);
  }

  #emitView(reason: ChartViewChangeReason): void {
    this.#events.emit('viewchange', { chart: this, view: this.getViewState(), reason });
  }

  #emitPlayback(reason: ChartPlaybackChangeReason, previousIndex?: number): void {
    const state = this.getPlaybackState();
    this.#events.emit('playbackchange', {
      chart: this,
      state,
      reason,
    });
    if (
      reason === 'spec' ||
      (previousIndex !== undefined && previousIndex !== this.#playbackIndex)
    ) {
      this.#events.emit('playbackframechange', {
        chart: this,
        state,
        reason:
          reason === 'step' || reason === 'seek' || reason === 'range' ? reason : ('spec' as const),
        ...(previousIndex === undefined ? {} : { previousIndex }),
        label: state.label,
      });
    }
  }

  #renderPlaybackIndex(index: number): void {
    const from = this.#displayScene ?? this.#result?.scene ?? null;
    const previousRenderer = this.#renderer;
    this.#cancelSceneTransition();
    this.#playbackIndex = index;
    this.#renderEndpoint();

    const playback = this.#playback;
    const to = this.#result?.scene;
    const renderer = this.#renderer;
    if (
      playback === false ||
      playback.transition === false ||
      this.#reducedMotion?.matches === true ||
      this.#adaptiveState.motion !== 'full' ||
      from === null ||
      to === undefined ||
      renderer === null ||
      renderer !== previousRenderer ||
      from.width !== to.width ||
      from.height !== to.height
    ) {
      return;
    }

    this.#sceneTransition = {
      from,
      to,
      duration: effectivePlaybackTransitionDuration(playback),
      easing: playback.transition.easing,
      keyField: playback.key,
      elapsed: 0,
      previousTimestamp:
        this.#playing && this.#playbackTimestamp !== null ? this.#playbackTimestamp : null,
    };
    this.#displayScene = from;
    this.#tooltip.hide();
    renderer.render(from);
    this.#schedulePlaybackFrame();
  }

  #advanceSceneTransition(timestamp: number): void {
    const transition = this.#sceneTransition;
    if (transition === null) return;
    if (transition.previousTimestamp === null) {
      transition.previousTimestamp = timestamp;
      return;
    }
    transition.elapsed +=
      Math.max(0, timestamp - transition.previousTimestamp) * this.#playbackRate;
    transition.previousTimestamp = timestamp;
    const progress = transition.elapsed / transition.duration;
    if (progress >= 1) {
      this.#finishSceneTransition();
      return;
    }
    const scene = interpolateScene(
      transition.from,
      transition.to,
      easeSceneProgress(progress, transition.easing),
      transition.keyField === undefined ? {} : { keyField: transition.keyField },
    );
    this.#renderer?.render(scene);
    this.#displayScene = scene;
  }

  #cancelSceneTransition(): void {
    if (this.#sceneTransition === null) return;
    this.#sceneTransition = null;
    this.#tooltip.hide();
    if (!this.#playing) this.#cancelScheduledPlaybackFrame();
  }

  #finishSceneTransition(): void {
    const transition = this.#sceneTransition;
    if (transition === null) return;
    this.#sceneTransition = null;
    this.#renderer?.render(transition.to);
    this.#displayScene = transition.to;
    this.#tooltip.hide();
    if (!this.#playing) this.#cancelScheduledPlaybackFrame();
  }

  #stopPlayback(settleTransition: boolean): void {
    const wasPlaying = this.#playing;
    this.#playing = false;
    this.#playbackTimestamp = null;
    if (settleTransition) this.#finishSceneTransition();
    if (this.#sceneTransition === null) this.#cancelScheduledPlaybackFrame();
    else this.#schedulePlaybackFrame();
    if (!wasPlaying) return;
    this.#emitPlayback('pause');
    this.#syncControls();
  }

  #startAutoplay(): void {
    if (
      this.#playback !== false &&
      this.#playback.autoplay &&
      this.#reducedMotion?.matches !== true &&
      this.#adaptiveState.motion === 'full'
    ) {
      this.play();
    }
  }

  #schedulePlaybackFrame(): void {
    if (this.#playbackCancel !== null || (!this.#playing && this.#sceneTransition === null)) {
      return;
    }
    const run = (timestamp: number): void => {
      this.#playbackCancel = null;
      if (this.#destroyed) return;
      this.#advanceSceneTransition(timestamp);
      if (this.#playing && this.#playback !== false) {
        if (this.#playbackTimestamp === null) this.#playbackTimestamp = timestamp;
        const duration = this.#playback.interval / this.#playbackRate;
        if (timestamp - this.#playbackTimestamp >= duration) {
          this.#playbackTimestamp = timestamp;
          // Sparse RAF delivery can skip past the effective tween duration.
          // Settle before advancing so transient crossfade/exit nodes never
          // accumulate as inputs to the next automatic frame.
          this.#finishSceneTransition();
          this.step(this.#playbackDirection === 'forward' ? 1 : -1);
        }
      }
      if (this.#playing || this.#sceneTransition !== null) this.#schedulePlaybackFrame();
    };
    if (typeof requestAnimationFrame === 'function') {
      const handle = requestAnimationFrame(run);
      this.#playbackCancel = () => cancelAnimationFrame(handle);
    } else {
      const handle = setTimeout(
        () => run(typeof performance === 'undefined' ? Date.now() : performance.now()),
        16,
      );
      this.#playbackCancel = () => clearTimeout(handle);
    }
  }

  #cancelPlaybackFrame(): void {
    this.#cancelScheduledPlaybackFrame();
    this.#playbackTimestamp = null;
  }

  #cancelScheduledPlaybackFrame(): void {
    this.#playbackCancel?.();
    this.#playbackCancel = null;
  }

  #configureEnvironmentListeners(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.#visibilityListener);
      document.addEventListener('fullscreenchange', this.#fullscreenListener);
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.#reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.#reducedMotion.addEventListener?.('change', this.#reducedMotionListener);
      if (this.#adaptiveOptions.enabled) {
        this.#adaptiveMediaLists = [
          ...new Set(
            adaptiveMediaQueries.map((query) => {
              try {
                return window.matchMedia(query);
              } catch {
                return null;
              }
            }),
          ),
        ].filter((query): query is MediaQueryList => query !== null);
        for (const query of this.#adaptiveMediaLists)
          query.addEventListener?.('change', this.#adaptiveMediaListener);
      }
    }
  }

  #detachEnvironmentListeners(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.#visibilityListener);
      document.removeEventListener('fullscreenchange', this.#fullscreenListener);
    }
    this.#reducedMotion?.removeEventListener?.('change', this.#reducedMotionListener);
    this.#reducedMotion = null;
    for (const query of this.#adaptiveMediaLists)
      query.removeEventListener?.('change', this.#adaptiveMediaListener);
    this.#adaptiveMediaLists = [];
  }

  #measure(): { width: number; height: number } {
    const fullscreenHost = this.#renderer?.overlayHost?.();
    if (this.#fullscreen && fullscreenHost !== null && fullscreenHost !== undefined) {
      const bounds = fullscreenHost.getBoundingClientRect();
      const width = bounds.width || (typeof window === 'undefined' ? 640 : window.innerWidth);
      const height = bounds.height || (typeof window === 'undefined' ? 400 : window.innerHeight);
      return { width: Math.max(1, width), height: Math.max(1, height) };
    }
    const width =
      this.#manualWidth ??
      (typeof this.#spec.width === 'number' ? this.#spec.width : this.#target.clientWidth || 640);
    const height =
      this.#manualHeight ??
      (typeof this.#spec.height === 'number'
        ? this.#spec.height
        : this.#target.clientHeight || 400);
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }

  #pixelRatio(): number {
    const ratio =
      this.#options.pixelRatio ??
      (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
    return Math.max(1, Math.min(this.#adaptiveState.rendering.pixelRatioCap, ratio));
  }

  #configureResizeObserver(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (this.#windowResizeListener !== null && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.#windowResizeListener);
      this.#windowResizeListener = null;
    }
    if (this.#options.autoResize === false) return;
    const responsive = this.#spec.width !== undefined ? this.#spec.width === 'container' : true;
    if (!responsive) return;
    if (typeof ResizeObserver === 'function') {
      let previousWidth = this.#target.clientWidth;
      let previousHeight = this.#target.clientHeight;
      this.#resizeObserver = new ResizeObserver(() => {
        const width = this.#target.clientWidth;
        const height = this.#target.clientHeight;
        if (width === previousWidth && height === previousHeight) return;
        previousWidth = width;
        previousHeight = height;
        this.scheduleRender();
      });
      this.#resizeObserver.observe(this.#target);
    } else if (typeof window !== 'undefined') {
      this.#windowResizeListener = () => this.scheduleRender();
      window.addEventListener('resize', this.#windowResizeListener, { passive: true });
    }
  }

  #syncSurfaceEvents(): void {
    const surface = this.#renderer?.surface() ?? null;
    if (surface !== this.#eventSurface) {
      this.#detachSurfaceEvents();
      if (surface === null) return;
      this.#eventSurface = surface;
      this.#surfaceTouchAction = surface.style.touchAction;
      this.#surfaceTabIndex = surface.getAttribute('tabindex');
      this.#surfaceCursor = surface.style.cursor;
      this.#surfaceAriaKeyShortcuts = surface.getAttribute('aria-keyshortcuts');
      surface.addEventListener('pointermove', this.#pointerMoveListener, { passive: false });
      surface.addEventListener('pointerdown', this.#pointerDownListener, { passive: false });
      surface.addEventListener('pointerup', this.#pointerUpListener, { passive: false });
      surface.addEventListener('pointercancel', this.#pointerCancelListener, { passive: false });
      surface.addEventListener('pointerleave', this.#pointerLeaveListener, { passive: true });
      surface.addEventListener('click', this.#clickListener, { passive: true });
      surface.addEventListener('wheel', this.#wheelListener, { passive: false });
      surface.addEventListener('keydown', this.#keyDownListener);
    }
    this.#syncSurfaceConfiguration();
  }

  #syncSurfaceConfiguration(): void {
    const surface = this.#eventSurface;
    if (surface === null) return;
    const navigation = this.#navigation();
    const domainNavigation = this.#domainNavigation();
    const selection = this.#result?.spec.interaction.selection;
    const markLabelAuthoring = this.#markLabelAuthoring();
    const annotationAuthoring = (this.#result?.scene.metadata.annotations?.entries.length ?? 0) > 0;
    const familyKeyboard =
      this.#familyEntries('pie-slice').length > 0 || this.#familyEntries('table-cell').length > 0;
    const familyPointer =
      this.#familyEntries('network-node').length > 0 ||
      this.#familyEntries('flow-node').length > 0 ||
      this.#familyEntries('navigator-window').length > 0 ||
      this.#familyEntries('hierarchy-node').length > 0 ||
      this.#familyEntries('parallel-axis').length > 0 ||
      this.#familyEntries('heatmap-cell').length > 0 ||
      this.#familyEntries('scatter-matrix-cell').length > 0;
    const analyticDrag =
      selection !== undefined && selection !== false && selection.kind !== 'point';
    const analyticKeyboard = analyticDrag && selection.keyboard;
    const inspecting = this.#view.zoom > 1 || this.#view.offsetX !== 0 || this.#view.offsetY !== 0;
    surface.style.touchAction =
      annotationAuthoring ||
      familyPointer ||
      (markLabelAuthoring !== false && markLabelAuthoring.pointer) ||
      analyticDrag ||
      (domainNavigation !== false && domainNavigation.drag)
        ? 'none'
        : navigation !== false && (navigation.drag || navigation.pinch)
          ? inspecting
            ? 'none'
            : 'pan-y'
          : (this.#surfaceTouchAction ?? '');
    surface.style.cursor =
      annotationAuthoring && this.#activeAnnotationId !== null
        ? 'move'
        : markLabelAuthoring !== false && markLabelAuthoring.pointer
          ? 'move'
          : familyPointer
            ? 'grab'
            : analyticDrag
              ? 'crosshair'
              : domainNavigation !== false && domainNavigation.drag
                ? 'grab'
                : navigation !== false && navigation.drag
                  ? 'grab'
                  : (this.#surfaceCursor ?? '');
    if (
      (navigation !== false && navigation.keyboard) ||
      (domainNavigation !== false && domainNavigation.keyboard) ||
      annotationAuthoring ||
      (markLabelAuthoring !== false && markLabelAuthoring.keyboard) ||
      analyticKeyboard ||
      familyKeyboard ||
      this.#result?.spec.accessibility.navigation === true ||
      (selection !== undefined && selection !== false && selection.clearOnEscape)
    )
      surface.tabIndex = 0;
    else if (this.#surfaceTabIndex === null) surface.removeAttribute('tabindex');
    else surface.setAttribute('tabindex', this.#surfaceTabIndex);
    if (
      annotationAuthoring ||
      (markLabelAuthoring !== false && markLabelAuthoring.keyboard) ||
      analyticKeyboard ||
      familyKeyboard
    ) {
      const shortcuts = [
        'Enter',
        'Shift+Enter',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Escape',
      ];
      if (annotationAuthoring || (markLabelAuthoring !== false && markLabelAuthoring.keyboard)) {
        shortcuts.push(
          'Alt+ArrowLeft',
          'Alt+ArrowRight',
          'Control+Z',
          'Control+Y',
          'Meta+Z',
          'Meta+Y',
        );
      }
      if (analyticKeyboard) shortcuts.push('S', 'Space');
      if (familyKeyboard) shortcuts.push('Home', 'End', 'PageUp', 'PageDown', 'Space');
      surface.setAttribute('aria-keyshortcuts', [...new Set(shortcuts)].join(' '));
    } else if (this.#surfaceAriaKeyShortcuts === null) surface.removeAttribute('aria-keyshortcuts');
    else surface.setAttribute('aria-keyshortcuts', this.#surfaceAriaKeyShortcuts);
  }

  #detachSurfaceEvents(): void {
    const surface = this.#eventSurface;
    if (surface === null) return;
    this.#cancelActiveGesture();
    this.#tooltip.hide();
    surface.removeEventListener('pointermove', this.#pointerMoveListener);
    surface.removeEventListener('pointerdown', this.#pointerDownListener);
    surface.removeEventListener('pointerup', this.#pointerUpListener);
    surface.removeEventListener('pointercancel', this.#pointerCancelListener);
    surface.removeEventListener('pointerleave', this.#pointerLeaveListener);
    surface.removeEventListener('click', this.#clickListener);
    surface.removeEventListener('wheel', this.#wheelListener);
    surface.removeEventListener('keydown', this.#keyDownListener);
    surface.style.touchAction = this.#surfaceTouchAction ?? '';
    surface.style.cursor = this.#surfaceCursor ?? '';
    if (this.#surfaceTabIndex === null) surface.removeAttribute('tabindex');
    else surface.setAttribute('tabindex', this.#surfaceTabIndex);
    if (this.#surfaceAriaKeyShortcuts === null) surface.removeAttribute('aria-keyshortcuts');
    else surface.setAttribute('aria-keyshortcuts', this.#surfaceAriaKeyShortcuts);
    this.#eventSurface = null;
    this.#surfaceTouchAction = null;
    this.#surfaceTabIndex = null;
    this.#surfaceCursor = null;
    this.#surfaceAriaKeyShortcuts = null;
  }

  #cancelActiveGesture(): void {
    const surface = this.#eventSurface;
    if (surface !== null) {
      const pointerIds = new Set(this.#activePointers.keys());
      if (this.#analyticGesture !== null) pointerIds.add(this.#analyticGesture.pointerId);
      if (this.#domainGesture !== null) pointerIds.add(this.#domainGesture.pointerId);
      if (this.#annotationGesture !== null) pointerIds.add(this.#annotationGesture.pointerId);
      if (this.#markLabelGesture !== null) pointerIds.add(this.#markLabelGesture.pointerId);
      if (this.#familyGesture !== null) pointerIds.add(this.#familyGesture.pointerId);
      for (const pointerId of pointerIds) {
        if (surface.hasPointerCapture?.(pointerId)) surface.releasePointerCapture?.(pointerId);
      }
      surface.style.cursor = this.#surfaceCursor ?? '';
    }
    this.#activePointers.clear();
    if (this.#annotationGesture !== null) {
      this.#annotationHistory.restore(this.#annotationGesture.previous);
      this.#annotations = [...this.#annotationHistory.annotations()];
    }
    this.#annotationGesture = null;
    if (this.#markLabelGesture !== null) this.#markLabels.restore(this.#markLabelGesture.previous);
    this.#markLabelGesture = null;
    if (this.#familyGesture?.kind === 'network-lasso') {
      this.#networkRuntime.set(
        this.#familyGesture.layerId,
        cloneNetworkRuntimeState(this.#familyGesture.previous),
      );
    } else if (
      this.#familyGesture?.kind === 'network-node' &&
      this.#familyGesture.previousNetwork !== undefined
    ) {
      this.#networkRuntime.set(
        this.#familyGesture.layerId,
        cloneNetworkRuntimeState(this.#familyGesture.previousNetwork),
      );
    } else if (
      this.#familyGesture?.kind === 'flow-node' &&
      this.#familyGesture.previousFlow !== undefined
    ) {
      this.#flowRuntime.set(
        this.#familyGesture.layerId,
        cloneFlowRuntimeState(this.#familyGesture.previousFlow),
      );
    } else if (this.#familyGesture?.kind === 'navigator-window') {
      this.#navigatorRuntime.set(this.#familyGesture.layerId, {
        family: this.#familyGesture.interaction.family,
        state: cloneNavigatorRuntimeState(this.#familyGesture.previous),
      });
    } else if (this.#familyGesture?.kind === 'parallel-brush') {
      this.#parallelRuntime.set(
        this.#familyGesture.layerId,
        cloneParallelRuntimeState(this.#familyGesture.previous),
      );
    } else if (this.#familyGesture?.kind === 'heatmap-brush') {
      this.#heatmapRuntime.set(
        this.#familyGesture.layerId,
        cloneHeatmapRuntimeState(this.#familyGesture.previous),
      );
    } else if (this.#familyGesture?.kind === 'scatter-matrix-brush') {
      if (this.#familyGesture.previous === null) {
        this.#scatterMatrixRuntime.delete(this.#familyGesture.layerId);
      } else {
        this.#scatterMatrixRuntime.set(
          this.#familyGesture.layerId,
          cloneScatterMatrixRuntimeState(this.#familyGesture.previous),
        );
      }
    }
    this.#familyGesture = null;
    this.#analyticGesture = null;
    this.#analyticKeyboardGesture = null;
    this.#domainGesture = null;
    this.#dragPrevious = null;
    this.#pinchStart = null;
    this.#dragDistance = 0;
    this.#suppressClick = false;
  }

  #surfacePoint(event: MouseEvent): InspectionViewPoint | null {
    const surface = this.#eventSurface;
    const scene = this.#result?.scene;
    if (surface === null || scene === undefined) return null;
    const bounds = surface.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * scene.width,
      y: ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * scene.height,
    };
  }

  #updateTechnicalCrosshair(event: PointerEvent, render = true): boolean {
    const scene = this.#result?.scene;
    const surfacePoint = this.#surfacePoint(event);
    if (scene === undefined || surfacePoint === null) return false;
    const scenePoint = inverseInspectionPoint(this.#view, surfacePoint);
    const panel = scene.metadata.technicalIndicatorPanels?.find(
      ({ bounds }) =>
        scenePoint.x >= bounds.x &&
        scenePoint.x <= bounds.x + bounds.width &&
        scenePoint.y >= bounds.y &&
        scenePoint.y <= bounds.y + bounds.height,
    );
    if (panel === undefined) return this.#clearTechnicalCrosshair(render);
    const coordinate = this.#coordinateAt(scenePoint);
    if (coordinate === null) return this.#clearTechnicalCrosshair(render);
    let value: number | string;
    try {
      value = mapPixelToDomain(coordinate.view.coordinates, 'x', coordinate.point.x);
    } catch {
      return this.#clearTechnicalCrosshair(render);
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return this.#clearTechnicalCrosshair(render);
    }
    if (this.#technicalCrosshairValue === value) return false;
    this.#technicalCrosshairValue = value;
    if (render) this.render();
    return true;
  }

  #clearTechnicalCrosshair(render = true): boolean {
    if (this.#technicalCrosshairValue === null) return false;
    this.#technicalCrosshairValue = null;
    if (render) this.render();
    return true;
  }

  #handleWheel(event: WheelEvent): void {
    const domainNavigation = this.#domainNavigation();
    if (
      domainNavigation !== false &&
      domainNavigation.wheel !== 'off' &&
      (domainNavigation.wheel !== 'modifier' || event.ctrlKey || event.metaKey)
    ) {
      const point = this.#surfacePoint(event);
      if (point === null) return;
      event.preventDefault();
      this.zoomDomainBy(Math.exp(-event.deltaY * 0.002), point);
      return;
    }
    const navigation = this.#navigation();
    if (
      navigation === false ||
      navigation.wheel === 'off' ||
      (navigation.wheel === 'modifier' && !event.ctrlKey && !event.metaKey)
    ) {
      return;
    }
    const point = this.#surfacePoint(event);
    if (point === null) return;
    event.preventDefault();
    this.zoomBy(Math.exp(-event.deltaY * 0.002), point);
  }

  #familyHit(point: Point): HitResult | null {
    const scene = this.#result?.scene;
    if (scene === undefined) return null;
    const local = inverseInspectionPoint(this.#view, point);
    const hit = hitTestScene(scene, local.x, local.y, 8 / this.#view.zoom);
    return hit?.familyInteraction === undefined ? null : hit;
  }

  #nearestFamilyNode(
    scenePoint: Point,
    maximumDistance = 24,
  ): { readonly entry: FamilySceneEntry; readonly distance: number } | null {
    const root = this.#result?.scene.root;
    if (root === undefined) return null;
    return (
      familySceneEntries(root)
        .flatMap((entry) => {
          const interaction = entry.familyInteraction;
          if (interaction.kind !== 'network-node' && interaction.kind !== 'flow-node') return [];
          const center = {
            x: interaction.plot.x + interaction.position.x * interaction.plot.width,
            y: interaction.plot.y + interaction.position.y * interaction.plot.height,
          };
          return [{ entry, distance: pointDistance(center, scenePoint) }];
        })
        .filter(({ distance }) => distance <= maximumDistance)
        .sort((left, right) => left.distance - right.distance)[0] ?? null
    );
  }

  #familyRegionAt(scenePoint: Point): FamilySceneEntry | null {
    const root = this.#result?.scene.root;
    if (root === undefined) return null;
    const entries = familySceneEntries(root);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry === undefined) continue;
      const interaction = entry.familyInteraction;
      if (
        interaction.kind !== 'navigator-window' &&
        interaction.kind !== 'parallel-axis' &&
        interaction.kind !== 'scatter-matrix-cell'
      ) {
        continue;
      }
      const { plot } = interaction;
      if (interaction.kind === 'parallel-axis') {
        const axisX =
          plot.x + (interaction.index / Math.max(1, interaction.count - 1)) * plot.width;
        if (
          Math.abs(scenePoint.x - axisX) <= 9 &&
          scenePoint.y >= plot.y &&
          scenePoint.y <= plot.y + plot.height
        ) {
          return entry;
        }
        continue;
      }
      if (interaction.kind === 'navigator-window') {
        const span = Math.max(Number.EPSILON, interaction.maximum - interaction.minimum);
        const x = plot.x + ((interaction.start - interaction.minimum) / span) * plot.width;
        const width = ((interaction.end - interaction.start) / span) * plot.width;
        if (
          scenePoint.x >= x &&
          scenePoint.x <= x + width &&
          scenePoint.y >= plot.y &&
          scenePoint.y <= plot.y + plot.height
        ) {
          return entry;
        }
        continue;
      }
      if (
        scenePoint.x >= plot.x &&
        scenePoint.x <= plot.x + plot.width &&
        scenePoint.y >= plot.y &&
        scenePoint.y <= plot.y + plot.height
      ) {
        return entry;
      }
    }
    return null;
  }

  #handleFamilyPointerDown(event: PointerEvent, point: Point): boolean {
    const scenePoint = inverseInspectionPoint(this.#view, point);
    const hit = this.#familyHit(point);
    const directTarget = hit ?? this.#familyRegionAt(scenePoint);
    const directInteraction = directTarget?.familyInteraction;
    if (directTarget !== null && directInteraction?.kind === 'navigator-window') {
      this.#familyGesture = {
        kind: 'navigator-window',
        pointerId: event.pointerId,
        layerId: directTarget.layerId,
        interaction: { ...directInteraction, plot: { ...directInteraction.plot } },
        start: { ...scenePoint },
        previous: this.getNavigatorWindow(directTarget.layerId),
      };
    } else if (
      directTarget !== null &&
      directInteraction?.kind === 'parallel-axis' &&
      event.shiftKey
    ) {
      this.#familyGesture = {
        kind: 'parallel-brush',
        pointerId: event.pointerId,
        layerId: directTarget.layerId,
        field: directInteraction.field,
        plot: { ...directInteraction.plot },
        start: { ...scenePoint },
        previous: this.getParallelRuntimeState(directTarget.layerId),
      };
    } else if (directTarget !== null && directInteraction?.kind === 'heatmap-cell') {
      this.#familyGesture = {
        kind: 'heatmap-brush',
        pointerId: event.pointerId,
        layerId: directTarget.layerId,
        start: { ...directInteraction },
        previous: this.getHeatmapBrush(directTarget.layerId),
      };
    } else if (directTarget !== null && directInteraction?.kind === 'scatter-matrix-cell') {
      this.#familyGesture = {
        kind: 'scatter-matrix-brush',
        pointerId: event.pointerId,
        layerId: directTarget.layerId,
        interaction: {
          ...directInteraction,
          plot: { ...directInteraction.plot },
          xDomain: [...directInteraction.xDomain],
          yDomain: [...directInteraction.yDomain],
        },
        start: { ...scenePoint },
        previous: this.getScatterMatrixBrush(directTarget.layerId),
      };
    }
    if (this.#familyGesture !== null) {
      this.#dragDistance = 0;
      this.#suppressClick = false;
      this.#eventSurface?.setPointerCapture?.(event.pointerId);
      this.#eventSurface?.style.setProperty(
        'cursor',
        this.#familyGesture.kind === 'navigator-window' ? 'grabbing' : 'crosshair',
      );
      event.preventDefault();
      return true;
    }
    if (event.shiftKey) {
      const network = this.#familyEntries('network-node').find(({ familyInteraction }) => {
        const { plot } = familyInteraction;
        return (
          scenePoint.x >= plot.x &&
          scenePoint.x <= plot.x + plot.width &&
          scenePoint.y >= plot.y &&
          scenePoint.y <= plot.y + plot.height
        );
      });
      if (network !== undefined) {
        const previous = this.getNetworkRuntimeState(network.layerId);
        this.#familyGesture = {
          kind: 'network-lasso',
          pointerId: event.pointerId,
          layerId: network.layerId,
          plot: { ...network.familyInteraction.plot },
          points: [{ ...scenePoint }],
          previous,
        };
        this.#dragDistance = 0;
        this.#suppressClick = false;
        this.#eventSurface?.setPointerCapture?.(event.pointerId);
        this.#eventSurface?.style.setProperty('cursor', 'crosshair');
        event.preventDefault();
        return true;
      }
    }
    const fallback = this.#nearestFamilyNode(scenePoint)?.entry;
    const target =
      directInteraction?.kind === 'network-node' || directInteraction?.kind === 'flow-node'
        ? hit
        : (fallback ?? null);
    const interaction = target?.familyInteraction;
    if (
      target === null ||
      interaction === undefined ||
      (interaction.kind !== 'network-node' && interaction.kind !== 'flow-node')
    ) {
      return false;
    }
    this.#familyGesture = {
      kind: interaction.kind,
      pointerId: event.pointerId,
      layerId: target.layerId,
      id: interaction.id,
      plot: { ...interaction.plot },
      start: { ...scenePoint },
      ...(interaction.kind === 'network-node'
        ? { previousNetwork: this.getNetworkRuntimeState(target.layerId) }
        : { previousFlow: this.getFlowRuntimeState(target.layerId) }),
    };
    this.#dragDistance = 0;
    this.#suppressClick = false;
    this.#eventSurface?.setPointerCapture?.(event.pointerId);
    this.#eventSurface?.style.setProperty('cursor', 'grabbing');
    event.preventDefault();
    return true;
  }

  #handleFamilyPointerMove(event: PointerEvent): boolean {
    const gesture = this.#familyGesture;
    if (gesture === null || gesture.pointerId !== event.pointerId) return false;
    const surfacePoint = this.#surfacePoint(event);
    if (surfacePoint === null) return false;
    const scenePoint = inverseInspectionPoint(this.#view, surfacePoint);
    if (gesture.kind === 'network-lasso') {
      const previous = gesture.points.at(-1);
      if (previous === undefined || pointDistance(previous, scenePoint) >= 2) {
        if (gesture.points.length < 256) gesture.points.push({ ...scenePoint });
      }
      this.#dragDistance = pointDistance(gesture.points[0] ?? scenePoint, scenePoint);
      if (gesture.points.length >= 3) {
        const lasso = gesture.points.map((point) => normalizedPoint(point, gesture.plot));
        const current = this.getNetworkRuntimeState(gesture.layerId);
        this.#setNetworkRuntimeState(
          gesture.layerId,
          normalizeNetworkRuntimeState({ lasso }, current),
          'pointer',
          false,
        );
      }
    } else if (gesture.kind === 'network-node' || gesture.kind === 'flow-node') {
      const position = normalizedPoint(scenePoint, gesture.plot);
      this.#dragDistance = pointDistance(gesture.start, scenePoint);
      if (gesture.kind === 'network-node') {
        const current = this.getNetworkRuntimeState(gesture.layerId);
        this.#setNetworkRuntimeState(
          gesture.layerId,
          normalizeNetworkRuntimeState(
            {
              positions: {
                ...current.positions,
                [gesture.id]: { ...position, pinned: true },
              },
            },
            current,
          ),
          'pointer',
          false,
        );
      } else {
        const current = this.getFlowRuntimeState(gesture.layerId);
        this.#setFlowRuntimeState(
          gesture.layerId,
          normalizeFlowRuntimeState(
            { positions: { ...current.positions, [gesture.id]: position } },
            current,
          ),
          'pointer',
          false,
        );
      }
    } else if (gesture.kind === 'navigator-window') {
      this.#dragDistance = pointDistance(gesture.start, scenePoint);
      const state = translateNavigatorWindow(gesture.interaction, scenePoint.x - gesture.start.x);
      this.#setNavigatorRuntimeState(
        gesture.layerId,
        gesture.interaction.family,
        state,
        'pointer',
        false,
      );
    } else if (gesture.kind === 'parallel-brush') {
      this.#dragDistance = pointDistance(gesture.start, scenePoint);
      const normalizeY = (value: number) =>
        1 - Math.max(0, Math.min(1, (value - gesture.plot.y) / Math.max(1, gesture.plot.height)));
      const extent = [normalizeY(gesture.start.y), normalizeY(scenePoint.y)].sort(
        (left, right) => left - right,
      ) as [number, number];
      this.#setParallelRuntimeState(
        gesture.layerId,
        setParallelBrushExtents(gesture.previous, gesture.field, [extent]),
        'pointer',
        false,
      );
    } else if (gesture.kind === 'heatmap-brush') {
      this.#dragDistance = Math.max(this.#dragDistance, 3);
      const current = this.#familyHit(surfacePoint)?.familyInteraction;
      const end = current?.kind === 'heatmap-cell' ? current : gesture.start;
      const rowMinimum = Math.min(gesture.start.rowIndex, end.rowIndex);
      const rowMaximum = Math.max(gesture.start.rowIndex, end.rowIndex);
      const columnMinimum = Math.min(gesture.start.columnIndex, end.columnIndex);
      const columnMaximum = Math.max(gesture.start.columnIndex, end.columnIndex);
      const entries = this.#familyEntries('heatmap-cell').filter(
        (entry) => entry.layerId === gesture.layerId,
      );
      const rows = [
        ...new Map(
          entries
            .filter(
              ({ familyInteraction }) =>
                familyInteraction.rowIndex >= rowMinimum &&
                familyInteraction.rowIndex <= rowMaximum,
            )
            .map(({ familyInteraction }) => [familyInteraction.rowIndex, familyInteraction.row]),
        ).entries(),
      ]
        .sort(([left], [right]) => left - right)
        .map(([, value]) => value);
      const columns = [
        ...new Map(
          entries
            .filter(
              ({ familyInteraction }) =>
                familyInteraction.columnIndex >= columnMinimum &&
                familyInteraction.columnIndex <= columnMaximum,
            )
            .map(({ familyInteraction }) => [
              familyInteraction.columnIndex,
              familyInteraction.column,
            ]),
        ).entries(),
      ]
        .sort(([left], [right]) => left - right)
        .map(([, value]) => value);
      this.#setHeatmapRuntimeState(
        gesture.layerId,
        normalizeHeatmapRuntimeState({ rows, columns }, gesture.previous),
        'pointer',
        false,
      );
    } else if (gesture.kind === 'scatter-matrix-brush') {
      this.#dragDistance = pointDistance(gesture.start, scenePoint);
      const brush = scatterMatrixPointerBrush(gesture.interaction, gesture.start, scenePoint);
      const selectedRows = selectScatterMatrixRows(this.#familyLayerRows(gesture.layerId), brush);
      const state = normalizeScatterMatrixRuntimeState(
        { ...brush, selectedRows },
        gesture.previous ?? { ...brush, selectedRows: [] },
      );
      this.#setScatterMatrixRuntimeState(gesture.layerId, state, 'pointer', false);
    }
    if (this.#dragDistance > 2) this.#suppressClick = true;
    event.preventDefault();
    return true;
  }

  #handleFamilyPointerEnd(event: PointerEvent, cancelled: boolean): boolean {
    const gesture = this.#familyGesture;
    if (gesture === null || gesture.pointerId !== event.pointerId) return false;
    this.#familyGesture = null;
    if (this.#eventSurface?.hasPointerCapture?.(event.pointerId)) {
      this.#eventSurface.releasePointerCapture?.(event.pointerId);
    }
    this.#eventSurface?.style.setProperty('cursor', this.#surfaceCursor ?? '');
    if (cancelled) {
      if (gesture.kind === 'network-lasso') {
        this.#networkRuntime.set(gesture.layerId, cloneNetworkRuntimeState(gesture.previous));
      } else if (gesture.kind === 'network-node' && gesture.previousNetwork !== undefined) {
        this.#networkRuntime.set(
          gesture.layerId,
          cloneNetworkRuntimeState(gesture.previousNetwork),
        );
      } else if (gesture.kind === 'flow-node' && gesture.previousFlow !== undefined) {
        this.#flowRuntime.set(gesture.layerId, cloneFlowRuntimeState(gesture.previousFlow));
      } else if (gesture.kind === 'navigator-window') {
        this.#navigatorRuntime.set(gesture.layerId, {
          family: gesture.interaction.family,
          state: cloneNavigatorRuntimeState(gesture.previous),
        });
      } else if (gesture.kind === 'parallel-brush') {
        this.#parallelRuntime.set(gesture.layerId, cloneParallelRuntimeState(gesture.previous));
      } else if (gesture.kind === 'heatmap-brush') {
        this.#heatmapRuntime.set(gesture.layerId, cloneHeatmapRuntimeState(gesture.previous));
      } else if (gesture.kind === 'scatter-matrix-brush') {
        if (gesture.previous === null) this.#scatterMatrixRuntime.delete(gesture.layerId);
        else {
          this.#scatterMatrixRuntime.set(
            gesture.layerId,
            cloneScatterMatrixRuntimeState(gesture.previous),
          );
        }
      }
      this.render();
      return true;
    }
    if (gesture.kind === 'network-lasso' || gesture.kind === 'network-node') {
      const state = this.getNetworkRuntimeState(gesture.layerId);
      this.#events.emit('networkchange', {
        chart: this,
        layerId: gesture.layerId,
        state,
        reason: 'pointer',
      });
    } else if (gesture.kind === 'flow-node') {
      const state = this.getFlowRuntimeState(gesture.layerId);
      this.#events.emit('flowchange', {
        chart: this,
        layerId: gesture.layerId,
        state,
        reason: 'pointer',
      });
    } else if (gesture.kind === 'navigator-window') {
      this.#events.emit('navigatorchange', {
        chart: this,
        layerId: gesture.layerId,
        family: gesture.interaction.family,
        state: this.getNavigatorWindow(gesture.layerId),
        reason: 'pointer',
      });
    } else if (gesture.kind === 'parallel-brush') {
      this.#events.emit('parallelchange', {
        chart: this,
        layerId: gesture.layerId,
        state: this.getParallelRuntimeState(gesture.layerId),
        reason: 'pointer',
      });
    } else if (gesture.kind === 'heatmap-brush') {
      this.#events.emit('heatmapchange', {
        chart: this,
        layerId: gesture.layerId,
        state: this.getHeatmapBrush(gesture.layerId),
        reason: 'pointer',
      });
    } else {
      const state = this.getScatterMatrixBrush(gesture.layerId);
      if (state !== null) {
        this.#events.emit('scattermatrixchange', {
          chart: this,
          layerId: gesture.layerId,
          state,
          reason: 'pointer',
        });
      }
    }
    this.#suppressClick =
      this.#suppressClick || gesture.kind === 'network-lasso' || this.#dragDistance > 2;
    return true;
  }

  #handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = this.#surfacePoint(event);
    if (point === null) return;
    const annotationMetadata = this.#result?.scene.metadata.annotations;
    if (this.#annotationsVisible && annotationMetadata !== undefined) {
      const scenePoint = inverseInspectionPoint(this.#view, point);
      const candidates = [...annotationMetadata.entries].reverse();
      const entry = candidates.find(({ bounds }) =>
        hitTestAnnotationHandle(bounds, scenePoint.x, scenePoint.y, 7),
      );
      if (entry !== undefined) {
        const annotation = this.#annotations.find(({ id }) => id === entry.id);
        const tested = hitTestAnnotationHandle(entry.bounds, scenePoint.x, scenePoint.y, 7);
        const handle = tested !== null && (entry.resizable || tested === 'move') ? tested : 'move';
        if (annotation !== undefined) {
          this.#activeAnnotationId = entry.id;
          this.#annotationGesture = {
            pointerId: event.pointerId,
            id: entry.id,
            handle,
            start: scenePoint,
            bounds: { ...entry.bounds },
            annotation: cloneAnnotation(annotation),
            previous: this.#annotationHistory.annotations(),
          };
          this.#suppressClick = false;
          this.#dragDistance = 0;
          this.#eventSurface?.setPointerCapture?.(event.pointerId);
          this.render();
          this.#eventSurface?.style.setProperty(
            'cursor',
            handle === 'move' ? 'grabbing' : 'nwse-resize',
          );
          event.preventDefault();
          return;
        }
      }
    }
    const authoring = this.#markLabelAuthoring();
    const labelMetadata = this.#result?.scene.metadata.markLabels;
    if (authoring !== false && authoring.pointer && labelMetadata !== undefined) {
      const scenePoint = inverseInspectionPoint(this.#view, point);
      const entry = hitTestMarkLabel(
        labelMetadata.entries,
        scenePoint.x,
        scenePoint.y,
        6,
        this.#activeMarkLabelId ?? undefined,
      );
      if (entry !== null && entry.editable) {
        const previous = this.#markLabels.positions();
        this.#activeMarkLabelId = entry.id;
        this.#markLabelGesture = {
          pointerId: event.pointerId,
          id: entry.id,
          target: cloneDatumTarget(entry.target),
          start: scenePoint,
          startOffsetX: entry.offsetX,
          startOffsetY: entry.offsetY,
          entry: {
            ...entry,
            target: cloneDatumTarget(entry.target),
            anchor: { ...entry.anchor },
            baseCenter: { ...entry.baseCenter },
            bounds: { ...entry.bounds },
          },
          entries: labelMetadata.entries,
          plot: { ...labelMetadata.plot },
          previous,
        };
        this.#suppressClick = false;
        this.#dragDistance = 0;
        this.#eventSurface?.setPointerCapture?.(event.pointerId);
        this.render();
        this.#eventSurface?.style.setProperty('cursor', 'grabbing');
        event.preventDefault();
        return;
      }
    }
    if (this.#handleFamilyPointerDown(event, point)) return;
    const selection = this.#result?.spec.interaction.selection;
    if (
      selection !== undefined &&
      selection !== false &&
      selection.kind !== 'point' &&
      this.#analyticGesture === null
    ) {
      const coordinate = this.#coordinateAt(point);
      if (coordinate === null) return;
      this.#analyticGesture = {
        pointerId: event.pointerId,
        viewId: coordinate.view.id,
        start: coordinate.point,
        current: coordinate.point,
        points: [coordinate.point],
      };
      this.#suppressClick = false;
      this.#dragDistance = 0;
      this.#eventSurface?.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    const domainNavigation = this.#domainNavigation();
    if (domainNavigation !== false && domainNavigation.drag && this.#domainGesture === null) {
      const coordinate = this.#coordinateAt(point);
      if (coordinate === null) return;
      this.#domainGesture = {
        pointerId: event.pointerId,
        viewId: coordinate.view.id,
        previous: coordinate.point,
      };
      this.#suppressClick = false;
      this.#dragDistance = 0;
      this.#eventSurface?.setPointerCapture?.(event.pointerId);
      this.#eventSurface?.style.setProperty('cursor', 'grabbing');
      event.preventDefault();
      return;
    }
    const navigation = this.#navigation();
    if (navigation === false) return;
    if (!navigation.drag && !(navigation.pinch && event.pointerType === 'touch')) return;
    if (this.#activePointers.size === 0) {
      this.#suppressClick = false;
      this.#dragDistance = 0;
    }
    this.#activePointers.set(event.pointerId, { ...point, pointerType: event.pointerType });
    this.#eventSurface?.setPointerCapture?.(event.pointerId);
    this.#dragPrevious = point;
    this.#pinchStart = this.#pinchSnapshot(navigation);
    if (navigation.drag) this.#eventSurface?.style.setProperty('cursor', 'grabbing');
    event.preventDefault();
  }

  #handlePointerMove(event: PointerEvent): boolean {
    if (this.#annotationGesture?.pointerId === event.pointerId) {
      const point = this.#surfacePoint(event);
      if (point === null) return false;
      const scenePoint = inverseInspectionPoint(this.#view, point);
      const gesture = this.#annotationGesture;
      const edited = editAnnotationByPointer({
        annotation: gesture.annotation,
        handle: gesture.handle,
        deltaX: scenePoint.x - gesture.start.x,
        deltaY: scenePoint.y - gesture.start.y,
        bounds: gesture.bounds,
        grid: event.shiftKey ? 10 : false,
      });
      const next = this.#annotations.map((annotation) =>
        annotation.id === gesture.id ? edited : annotation,
      );
      this.#dragDistance = Math.hypot(
        scenePoint.x - gesture.start.x,
        scenePoint.y - gesture.start.y,
      );
      if (this.#annotationHistory.preview(next)) {
        this.#annotations = [...this.#annotationHistory.annotations()];
        this.render();
      }
      if (this.#dragDistance > 2) this.#suppressClick = true;
      event.preventDefault();
      return true;
    }
    if (this.#markLabelGesture?.pointerId === event.pointerId) {
      const point = this.#surfacePoint(event);
      const authoring = this.#markLabelAuthoring();
      if (point === null || authoring === false) return false;
      const scenePoint = inverseInspectionPoint(this.#view, point);
      const gesture = this.#markLabelGesture;
      const desired = snapMarkLabelOffset({
        entry: gesture.entry,
        entries: gesture.entries,
        plot: gesture.plot,
        offsetX: gesture.startOffsetX + scenePoint.x - gesture.start.x,
        offsetY: gesture.startOffsetY + scenePoint.y - gesture.start.y,
        snap: authoring.snap,
      });
      const next = setMarkLabelOffset(
        this.#markLabels.positions(),
        gesture.target,
        desired.offsetX,
        desired.offsetY,
      );
      this.#dragDistance = Math.hypot(
        scenePoint.x - gesture.start.x,
        scenePoint.y - gesture.start.y,
      );
      if (this.#markLabels.preview(next)) this.render();
      if (this.#dragDistance > 2) this.#suppressClick = true;
      event.preventDefault();
      return true;
    }
    if (this.#handleFamilyPointerMove(event)) return true;
    if (this.#analyticGesture?.pointerId === event.pointerId) {
      const gesture = this.#analyticGesture;
      const surfacePoint = this.#surfacePoint(event);
      if (surfacePoint === null) return false;
      const point = this.#localPoint(gesture.viewId, surfacePoint);
      this.#dragDistance += pointDistance(gesture.current, point);
      gesture.current = point;
      const selection = this.#result?.spec.interaction.selection;
      if (selection !== undefined && selection !== false && selection.kind === 'lasso') {
        const last = gesture.points.at(-1);
        if (
          gesture.points.length < selection.maxLassoPoints &&
          (last === undefined || pointDistance(last, point) >= 2)
        ) {
          gesture.points.push(point);
        }
      }
      if (this.#dragDistance > 4) this.#suppressClick = true;
      event.preventDefault();
      return true;
    }
    if (this.#domainGesture?.pointerId === event.pointerId) {
      const gesture = this.#domainGesture;
      const surfacePoint = this.#surfacePoint(event);
      if (surfacePoint === null) return false;
      const point = this.#localPoint(gesture.viewId, surfacePoint);
      const previous = gesture.previous;
      const deltaX = point.x - previous.x;
      const deltaY = point.y - previous.y;
      this.#dragDistance += Math.hypot(deltaX, deltaY);
      gesture.previous = point;
      this.panDomainBy(deltaX, deltaY, undefined, gesture.viewId);
      if (this.#dragDistance > 4) this.#suppressClick = true;
      event.preventDefault();
      return true;
    }
    const navigation = this.#navigation();
    if (navigation === false || !this.#activePointers.has(event.pointerId)) return false;
    const point = this.#surfacePoint(event);
    if (point === null) return false;
    const previous = this.#activePointers.get(event.pointerId);
    this.#activePointers.set(event.pointerId, { ...point, pointerType: event.pointerType });

    if (navigation.pinch && this.#activePointers.size >= 2) {
      if (this.#pinchStart === null) this.#pinchStart = this.#pinchSnapshot(navigation);
      const [first, second] = [...this.#activePointers.values()];
      const start = this.#pinchStart;
      if (first !== undefined && second !== undefined && start !== null && start.distance > 0) {
        const center = pointCenter(first, second);
        const distance = pointDistance(first, second);
        const scene = this.#result?.scene;
        if (scene !== undefined) {
          const zoom = Math.max(
            navigation.minZoom,
            Math.min(navigation.maxZoom, start.view.zoom * (distance / start.distance)),
          );
          const local = inverseInspectionPoint(start.view, start.center);
          this.#setView(
            constrainInspectionView(
              {
                zoom,
                offsetX: center.x - local.x * zoom,
                offsetY: center.y - local.y * zoom,
              },
              {
                width: scene.width,
                height: scene.height,
                minZoom: navigation.minZoom,
                maxZoom: navigation.maxZoom,
              },
            ),
            'zoom',
          );
        }
      }
    } else if (navigation.drag && this.#dragPrevious !== null) {
      const deltaX = point.x - this.#dragPrevious.x;
      const deltaY = point.y - this.#dragPrevious.y;
      this.#dragDistance += Math.hypot(deltaX, deltaY);
      this.panBy(deltaX, deltaY);
      this.#dragPrevious = point;
    } else if (previous !== undefined) this.#dragDistance += pointDistance(previous, point);
    if (this.#dragDistance > 4 || this.#activePointers.size > 1) this.#suppressClick = true;
    event.preventDefault();
    return true;
  }

  #handlePointerEnd(event: PointerEvent, cancelled = false): void {
    if (this.#handleFamilyPointerEnd(event, cancelled)) return;
    if (this.#annotationGesture?.pointerId === event.pointerId) {
      const gesture = this.#annotationGesture;
      this.#annotationGesture = null;
      if (this.#eventSurface?.hasPointerCapture?.(event.pointerId)) {
        this.#eventSurface.releasePointerCapture?.(event.pointerId);
      }
      this.#eventSurface?.style.setProperty('cursor', 'move');
      if (cancelled) {
        this.#annotationHistory.restore(gesture.previous);
        this.#annotations = [...this.#annotationHistory.annotations()];
        this.render();
      } else if (this.#annotationHistory.commit(gesture.previous)) {
        this.#suppressClick = true;
        this.#emitAnnotations('pointer', gesture.id);
      } else this.#emitAnnotations('select', gesture.id);
      return;
    }
    if (this.#markLabelGesture?.pointerId === event.pointerId) {
      const gesture = this.#markLabelGesture;
      this.#markLabelGesture = null;
      if (this.#eventSurface?.hasPointerCapture?.(event.pointerId)) {
        this.#eventSurface.releasePointerCapture?.(event.pointerId);
      }
      this.#eventSurface?.style.setProperty('cursor', 'move');
      if (cancelled) {
        this.#markLabels.restore(gesture.previous);
        this.render();
      } else if (this.#markLabels.commit(gesture.previous)) {
        this.#suppressClick = true;
        this.#emitMarkLabels('pointer', gesture.id);
      } else this.#emitMarkLabels('select', gesture.id);
      return;
    }
    if (this.#analyticGesture?.pointerId === event.pointerId) {
      const gesture = this.#analyticGesture;
      const point = this.#surfacePoint(event);
      if (point !== null) gesture.current = this.#localPoint(gesture.viewId, point);
      this.#analyticGesture = null;
      if (this.#eventSurface?.hasPointerCapture?.(event.pointerId)) {
        this.#eventSurface.releasePointerCapture?.(event.pointerId);
      }
      this.#suppressClick = true;
      if (!cancelled) {
        try {
          this.#completeAnalyticGesture(gesture);
        } catch (error) {
          this.#events.emit('error', { chart: this, error });
        }
      }
      return;
    }
    if (this.#domainGesture?.pointerId === event.pointerId) {
      this.#domainGesture = null;
      if (this.#eventSurface?.hasPointerCapture?.(event.pointerId)) {
        this.#eventSurface.releasePointerCapture?.(event.pointerId);
      }
      this.#eventSurface?.style.setProperty(
        'cursor',
        this.#domainNavigation() !== false ? 'grab' : (this.#surfaceCursor ?? ''),
      );
      return;
    }
    if (!this.#activePointers.has(event.pointerId)) return;
    this.#activePointers.delete(event.pointerId);
    if (this.#eventSurface?.hasPointerCapture?.(event.pointerId)) {
      this.#eventSurface.releasePointerCapture?.(event.pointerId);
    }
    const remaining = [...this.#activePointers.values()];
    this.#dragPrevious = remaining[0] ?? null;
    this.#pinchStart = null;
    const navigation = this.#navigation();
    if (remaining.length >= 2 && navigation !== false)
      this.#pinchStart = this.#pinchSnapshot(navigation);
    if (remaining.length === 0) {
      this.#eventSurface?.style.setProperty(
        'cursor',
        navigation !== false && navigation.drag ? 'grab' : (this.#surfaceCursor ?? ''),
      );
    }
  }

  #completeAnalyticGesture(gesture: AnalyticPointerGesture): void {
    const result = this.#result;
    const selection = result?.spec.interaction.selection;
    if (result === null || result === undefined || selection === undefined || selection === false)
      return;
    const coordinates = this.#coordinateView(gesture.viewId).coordinates;
    const spanX = Math.abs(gesture.current.x - gesture.start.x);
    const spanY = Math.abs(gesture.current.y - gesture.start.y);
    let resolved: AnalyticSelection;
    if (selection.kind === 'axis') {
      const span = cartesianAxisChannel(coordinates, selection.axis!) === 'x' ? spanX : spanY;
      if (span < selection.minPixelSpan) return;
      resolved = pixelAxisToSelection(coordinates, selection.axis!, gesture.start, gesture.current);
    } else if (selection.kind === 'lasso') {
      const last = gesture.points.at(-1);
      if (last === undefined || pointDistance(last, gesture.current) >= 2) {
        gesture.points.push(gesture.current);
      }
      if (gesture.points.length < 3 || Math.max(spanX, spanY) < selection.minPixelSpan) {
        return;
      }
      resolved = pixelLassoToSelection(coordinates, gesture.points, {
        x: selection.xAxis,
        y: selection.yAxis,
      });
    } else if (selection.kind === 'interval' || selection.kind === 'rectangle') {
      if (Math.max(spanX, spanY) < selection.minPixelSpan) return;
      resolved = pixelRectangleToSelection(coordinates, gesture.start, gesture.current, {
        type: selection.kind,
        xAxis: selection.xAxis,
        yAxis: selection.yAxis,
      });
    } else return;

    this.#applyAnalyticSelection(resolved, selection, 'pointer');
  }

  #applyAnalyticSelection(
    resolved: AnalyticSelection,
    selection: NormalizedSelectionSpec,
    reason: ChartAnalyticSelectionChangeReason,
  ): void {
    const previous = this.#analyticSelection.get();
    if (selection.mode === 'single') {
      this.#analyticSelection.set({
        version: analyticSelectionVersion,
        combine: selection.combine,
        selections: [resolved],
      });
    } else this.#analyticSelection.apply(resolved, selection.combine);
    try {
      this.#validateAnalyticStateForConfig(this.#analyticSelection.get(), selection);
      this.render();
    } catch (error) {
      this.#analyticSelection.set(previous);
      throw error;
    }
    this.#emitAnalyticSelection(reason);
  }

  #pinchSnapshot(navigation: NormalizedNavigationSpec): PinchStart | null {
    if (!navigation.pinch || this.#activePointers.size < 2) return null;
    const [first, second] = [...this.#activePointers.values()];
    if (first === undefined || second === undefined) return null;
    return {
      distance: pointDistance(first, second),
      center: pointCenter(first, second),
      view: this.#view,
    };
  }

  #analyticSelectionDraft(): AnalyticSelection | undefined {
    const active = this.#analyticKeyboardGesture;
    const selection = this.#result?.spec.interaction.selection;
    if (active === null || selection === undefined || selection === false) return undefined;
    return previewAnalyticKeyboardSelection(
      this.#coordinateView(active.viewId).coordinates,
      active.gesture,
      selection,
    );
  }

  #handleAnalyticSelectionKeyDown(event: KeyboardEvent): boolean {
    const result = this.#result;
    const selection = result?.spec.interaction.selection;
    if (
      result === null ||
      result === undefined ||
      selection === undefined ||
      selection === false ||
      selection.kind === 'point' ||
      !selection.keyboard
    ) {
      return false;
    }
    const active = this.#analyticKeyboardGesture;
    if (active === null) {
      if (event.key.toLowerCase() !== 's' || event.ctrlKey || event.metaKey || event.altKey) {
        return false;
      }
      const focusedId = this.#accessibility.getFocusedId();
      const focused =
        focusedId === null
          ? undefined
          : result.scene.semanticIndex.find(({ id }) => id === focusedId);
      const view =
        (focused === undefined
          ? undefined
          : result.coordinateViews.find(({ id }) => id === focused.viewId)) ??
        result.coordinateViews[0];
      if (view === undefined) return false;
      const origin =
        focused === undefined || focused.viewId !== view.id
          ? undefined
          : {
              x: focused.bounds.x + focused.bounds.width / 2 - view.offsetX,
              y: focused.bounds.y + focused.bounds.height / 2 - view.offsetY,
            };
      this.#analyticKeyboardGesture = {
        viewId: view.id,
        gesture: startAnalyticKeyboardGesture(view.coordinates, selection.kind, origin),
      };
      this.render();
      event.preventDefault();
      return true;
    }

    if (event.key === 'Escape') {
      this.#analyticKeyboardGesture = null;
      this.render();
      event.preventDefault();
      return true;
    }

    const view = this.#coordinateView(active.viewId);
    const direction =
      event.key === 'ArrowLeft'
        ? 'left'
        : event.key === 'ArrowRight'
          ? 'right'
          : event.key === 'ArrowUp'
            ? 'up'
            : event.key === 'ArrowDown'
              ? 'down'
              : null;
    if (direction !== null) {
      this.#analyticKeyboardGesture = {
        viewId: active.viewId,
        gesture: moveAnalyticKeyboardGesture(
          view.coordinates,
          active.gesture,
          direction,
          selection.keyboardStep * (event.shiftKey ? 10 : 1),
        ),
      };
      this.render();
      event.preventDefault();
      return true;
    }

    if ((event.key === ' ' || event.key === 'Spacebar') && selection.kind === 'lasso') {
      this.#analyticKeyboardGesture = {
        viewId: active.viewId,
        gesture: addAnalyticKeyboardVertex(active.gesture, selection.maxLassoPoints),
      };
      this.render();
      event.preventDefault();
      return true;
    }

    if (event.key === 'Enter') {
      const resolved = completeAnalyticKeyboardSelection(
        view.coordinates,
        active.gesture,
        selection,
      );
      if (resolved !== null) {
        this.#analyticKeyboardGesture = null;
        this.#applyAnalyticSelection(resolved, selection, 'keyboard');
      }
      event.preventDefault();
      return true;
    }
    return false;
  }

  #handleFamilyKeyDown(event: KeyboardEvent): boolean {
    const navigationKeys = new Set([
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]);
    if (event.key === 'Escape' && this.#familyFocus !== null) {
      this.clearFamilyFocus();
      event.preventDefault();
      return true;
    }
    const pieEntries = this.#familyEntries('pie-slice');
    const tableEntries = this.#familyEntries('table-cell');
    if (pieEntries.length === 0 && tableEntries.length === 0) return false;

    let focus = this.#familyFocus;
    if (focus?.kind === 'pie-slice') {
      const activeFocus = focus;
      if (
        !pieEntries.some(
          (entry) =>
            entry.layerId === activeFocus.layerId && entry.familyInteraction.id === activeFocus.id,
        )
      ) {
        focus = null;
      }
    } else if (focus?.kind === 'table-cell') {
      if (!tableEntries.some((entry) => entry.layerId === focus?.layerId)) focus = null;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      if (focus === null) return false;
      const entry =
        focus.kind === 'pie-slice'
          ? pieEntries.find(
              (candidate) =>
                candidate.layerId === focus.layerId && candidate.familyInteraction.id === focus.id,
            )
          : tableEntries.find(
              (candidate) =>
                candidate.layerId === focus.layerId &&
                candidate.familyInteraction.row === focus.row &&
                candidate.familyInteraction.column === focus.column,
            );
      if (entry !== undefined) {
        this.#applyClickSelection({ ...entry, x: 0, y: 0, distance: 0 }, 'keyboard', 'keyboard');
      }
      event.preventDefault();
      return true;
    }
    if (!navigationKeys.has(event.key)) return false;

    if (focus === null) {
      const firstPie = pieEntries[0];
      const firstTable = [...tableEntries].sort(
        (left, right) =>
          left.familyInteraction.row - right.familyInteraction.row ||
          left.familyInteraction.column - right.familyInteraction.column,
      )[0];
      if (firstPie !== undefined) {
        this.#setFamilyFocus(
          {
            kind: 'pie-slice',
            layerId: firstPie.layerId,
            id: firstPie.familyInteraction.id,
          },
          'keyboard',
        );
      } else if (firstTable !== undefined) {
        this.#setFamilyFocus(
          {
            kind: 'table-cell',
            layerId: firstTable.layerId,
            row: firstTable.familyInteraction.row,
            column: firstTable.familyInteraction.column,
            field: firstTable.familyInteraction.field,
          },
          'keyboard',
        );
      }
      event.preventDefault();
      return true;
    }

    if (focus.kind === 'pie-slice') {
      const entries = pieEntries
        .filter(({ layerId }) => layerId === focus?.layerId)
        .sort((left, right) => left.familyInteraction.index - right.familyInteraction.index);
      const direction =
        event.key === 'Home'
          ? 'first'
          : event.key === 'End'
            ? 'last'
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp'
              ? 'previous'
              : 'next';
      const id = nextPieSlice(
        entries.map(({ familyInteraction }) => ({ id: familyInteraction.id })),
        focus.id,
        direction,
      );
      if (id !== null) {
        this.#setFamilyFocus({ kind: 'pie-slice', layerId: focus.layerId, id }, 'keyboard');
      }
      event.preventDefault();
      return true;
    }

    const layerEntries = tableEntries.filter(({ layerId }) => layerId === focus?.layerId);
    const first = layerEntries[0]?.familyInteraction;
    if (first === undefined || first.kind !== 'table-cell') return false;
    const next = moveTableCell(
      { row: focus.row, column: focus.column },
      event.key as Parameters<typeof moveTableCell>[1],
      { rows: first.rows, columns: first.columns, pageSize: Math.max(1, first.windowLimit) },
    );
    let state = this.getTableRuntimeState(focus.layerId);
    const frozenRows = this.#tableFrozenRows(focus.layerId);
    const frozenColumns = this.#tableFrozenColumns(focus.layerId);
    let stateChanged = false;
    if (
      next.row >= frozenRows &&
      (next.row < state.windowOffset || next.row >= state.windowOffset + state.windowLimit)
    ) {
      const windowOffset =
        next.row < state.windowOffset
          ? next.row
          : Math.max(0, next.row - Math.max(0, state.windowLimit - 1));
      state = normalizeTableRuntimeState({ windowOffset }, state);
      stateChanged = true;
    }
    if (
      next.column >= frozenColumns &&
      (next.column < state.columnOffset || next.column >= state.columnOffset + state.columnLimit)
    ) {
      const columnOffset =
        next.column < state.columnOffset
          ? next.column
          : Math.max(0, next.column - Math.max(0, state.columnLimit - 1));
      state = normalizeTableRuntimeState({ columnOffset }, state);
      stateChanged = true;
    }
    if (stateChanged) this.#setTableRuntimeState(focus.layerId, state, 'keyboard');
    const refreshed = this.#familyEntries('table-cell').find(
      (entry) =>
        entry.layerId === focus.layerId &&
        entry.familyInteraction.row === next.row &&
        entry.familyInteraction.column === next.column,
    );
    const field = refreshed?.familyInteraction.field ?? focus.field;
    this.#setFamilyFocus(
      { kind: 'table-cell', layerId: focus.layerId, row: next.row, column: next.column, field },
      'keyboard',
    );
    event.preventDefault();
    return true;
  }

  #handleKeyDown(event: KeyboardEvent): void {
    if (this.#handleAnalyticSelectionKeyDown(event)) return;
    if (this.#handleAnnotationKeyDown(event)) return;
    if (this.#handleMarkLabelKeyDown(event)) return;
    if (this.#handleFamilyKeyDown(event)) return;
    const selection = this.#result?.spec.interaction.selection;
    if (
      event.key === 'Escape' &&
      selection !== undefined &&
      selection !== false &&
      selection.clearOnEscape &&
      (this.#selection.length > 0 || this.#analyticSelection.get().selections.length > 0)
    ) {
      if (selection.kind === 'point') this.clearSelection();
      else this.clearAnalyticSelection();
      event.preventDefault();
      return;
    }
    const domainNavigation = this.#domainNavigation();
    if (domainNavigation !== false && domainNavigation.keyboard) {
      const before = this.#domainView;
      let handled = true;
      switch (event.key) {
        case '+':
        case '=':
          this.zoomDomainBy(1.25);
          break;
        case '-':
        case '_':
          this.zoomDomainBy(0.8);
          break;
        case 'ArrowLeft':
          this.panDomainBy(24, 0);
          break;
        case 'ArrowRight':
          this.panDomainBy(-24, 0);
          break;
        case 'ArrowUp':
          this.panDomainBy(0, 24);
          break;
        case 'ArrowDown':
          this.panDomainBy(0, -24);
          break;
        case '0':
        case 'Home':
          this.resetDomainView();
          break;
        default:
          handled = false;
      }
      if (handled && !sameDomainView(before, this.#domainView)) event.preventDefault();
      if (handled) return;
    }
    const navigation = this.#navigation();
    if (navigation === false || !navigation.keyboard) return;
    const before = this.#view;
    let handled = true;
    switch (event.key) {
      case '+':
      case '=':
        this.zoomBy(1.25);
        break;
      case '-':
      case '_':
        this.zoomBy(0.8);
        break;
      case 'ArrowLeft':
        this.panBy(24, 0);
        break;
      case 'ArrowRight':
        this.panBy(-24, 0);
        break;
      case 'ArrowUp':
        this.panBy(0, 24);
        break;
      case 'ArrowDown':
        this.panBy(0, -24);
        break;
      case '0':
      case 'Home':
        this.resetView();
        break;
      default:
        handled = false;
    }
    if (handled && !sameView(before, this.#view)) event.preventDefault();
  }

  #handleAnnotationKeyDown(event: KeyboardEvent): boolean {
    const entries = this.#result?.scene.metadata.annotations?.entries ?? [];
    if (entries.length === 0) return false;
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (this.#activeAnnotationId !== null && command && key === 'z') {
      const changed = event.shiftKey ? this.redoAnnotationEdit() : this.undoAnnotationEdit();
      if (changed) event.preventDefault();
      return changed;
    }
    if (this.#activeAnnotationId !== null && command && key === 'y') {
      const changed = this.redoAnnotationEdit();
      if (changed) event.preventDefault();
      return changed;
    }
    if (event.key === 'Enter') {
      const current = entries.findIndex(({ id }) => id === this.#activeAnnotationId);
      const direction = event.shiftKey ? -1 : 1;
      const index =
        current < 0
          ? event.shiftKey
            ? entries.length - 1
            : 0
          : (current + direction + entries.length) % entries.length;
      const entry = entries[index];
      if (entry !== undefined) {
        this.selectAnnotation(entry.id);
        event.preventDefault();
        return true;
      }
    }
    if (event.key === 'Escape' && this.#activeAnnotationId !== null) {
      this.selectAnnotation(null);
      event.preventDefault();
      return true;
    }
    if (
      this.#activeAnnotationId !== null &&
      (event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown')
    ) {
      this.editAnnotationWithKeyboard(this.#activeAnnotationId, event.key, {
        step: 1,
        coarse: event.shiftKey,
        resize: event.altKey,
      });
      event.preventDefault();
      return true;
    }
    return false;
  }

  #handleMarkLabelKeyDown(event: KeyboardEvent): boolean {
    const authoring = this.#markLabelAuthoring();
    const metadata = this.#result?.scene.metadata.markLabels;
    if (authoring === false || !authoring.keyboard || metadata === undefined) return false;
    const command = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (command && key === 'z') {
      const changed = event.shiftKey ? this.redoMarkLabelEdit() : this.undoMarkLabelEdit();
      if (changed) event.preventDefault();
      return changed;
    }
    if (command && key === 'y') {
      const changed = this.redoMarkLabelEdit();
      if (changed) event.preventDefault();
      return changed;
    }
    if (event.key === 'Enter' && metadata.entries.length > 0) {
      const current = metadata.entries.findIndex(({ id }) => id === this.#activeMarkLabelId);
      const direction = event.shiftKey ? -1 : 1;
      const index =
        current < 0
          ? event.shiftKey
            ? metadata.entries.length - 1
            : 0
          : (current + direction + metadata.entries.length) % metadata.entries.length;
      const entry = metadata.entries[index];
      if (entry !== undefined) {
        this.#activeMarkLabelId = entry.id;
        this.render();
        this.#emitMarkLabels('select', entry.id);
        event.preventDefault();
        return true;
      }
    }
    if (event.key === 'Escape' && this.#activeMarkLabelId !== null) {
      const previous = this.#activeMarkLabelId;
      this.#activeMarkLabelId = null;
      this.render();
      this.#emitMarkLabels('select', previous);
      event.preventDefault();
      return true;
    }
    const entry = metadata.entries.find(({ id }) => id === this.#activeMarkLabelId);
    if (entry === undefined) return false;
    const step = authoring.step * (event.shiftKey ? 10 : 1);
    let deltaX = 0;
    let deltaY = 0;
    switch (event.key) {
      case 'ArrowLeft':
        deltaX = -step;
        break;
      case 'ArrowRight':
        deltaX = step;
        break;
      case 'ArrowUp':
        deltaY = -step;
        break;
      case 'ArrowDown':
        deltaY = step;
        break;
      default:
        return false;
    }
    const snapped = snapMarkLabelOffset({
      entry,
      entries: metadata.entries,
      plot: metadata.plot,
      offsetX: entry.offsetX + deltaX,
      offsetY: entry.offsetY + deltaY,
      snap: authoring.snap,
    });
    const next = setMarkLabelOffset(
      this.#markLabels.positions(),
      entry.target,
      snapped.offsetX,
      snapped.offsetY,
    );
    if (this.#markLabels.replace(next)) {
      this.render();
      this.#emitMarkLabels('keyboard', entry.id);
    }
    event.preventDefault();
    return true;
  }

  #emitPointer(type: 'hover' | 'click', sourceEvent: PointerEvent): void {
    const result = this.#result;
    if (this.#sceneTransition !== null) {
      this.#tooltip.hide();
      if (type === 'hover' || result?.spec.interaction.click !== false) {
        this.#events.emit(type, { chart: this, hit: null, sourceEvent });
      }
      return;
    }
    const screen = this.#surfacePoint(sourceEvent);
    const surface = this.#renderer?.surface();
    if (result === null || screen === null || surface === null || surface === undefined) return;
    const scene = result.scene;
    const local = inverseInspectionPoint(this.#view, screen);
    const markLocal = scene.metadata.hitTestingEnabled
      ? hitTestScene(scene, local.x, local.y, 8 / this.#view.zoom)
      : null;
    const regionFamily =
      markLocal?.familyInteraction === undefined ? this.#familyRegionAt(local) : null;
    const nearestFamily =
      markLocal?.familyInteraction === undefined && regionFamily === null
        ? this.#nearestFamilyNode(local)
        : null;
    const familyLocal: HitResult | null =
      markLocal?.familyInteraction !== undefined
        ? markLocal
        : regionFamily !== null
          ? { ...regionFamily, x: local.x, y: local.y, distance: 0 }
          : nearestFamily === null
            ? null
            : {
                ...nearestFamily.entry,
                x: local.x,
                y: local.y,
                distance: nearestFamily.distance,
              };
    const tooltipSpec = result.spec.interaction.tooltip;
    const tooltipLocal =
      type === 'hover' &&
      tooltipSpec !== false &&
      tooltipSpec.trigger === 'axis' &&
      markLocal === null
        ? hitTestAxisTooltip(scene, local.x, local.y)
        : markLocal;
    const screenHit = (hit: HitResult | null): HitResult | null =>
      hit === null
        ? null
        : { ...hit, x: screen.x, y: screen.y, distance: hit.distance * this.#view.zoom };
    const markHit = screenHit(markLocal);
    const tooltipHit = screenHit(tooltipLocal);
    if (type === 'hover' && tooltipSpec !== false) {
      if (tooltipHit === null) this.#tooltip.hide();
      else
        this.#tooltip.show(
          resolveTooltipContent(tooltipHit, result.spec),
          tooltipHit,
          sourceEvent,
          surface,
          this.#renderer?.overlayHost?.() ?? surface.parentElement ?? surface,
        );
    }
    if (type === 'click' && !this.#handleFamilyClick(familyLocal, sourceEvent)) {
      this.#applyClickSelection(markLocal);
    }
    if (type === 'hover' || result.spec.interaction.click !== false) {
      this.#events.emit(type, { chart: this, hit: markHit, sourceEvent });
    }
  }

  #handleFamilyClick(hit: HitResult | null, event: PointerEvent): boolean {
    const interaction = hit?.familyInteraction;
    if (hit === null || interaction === undefined) return false;
    if (interaction.kind === 'pie-slice') {
      this.#setFamilyFocus(
        { kind: 'pie-slice', layerId: hit.layerId, id: interaction.id },
        'pointer',
      );
      return false;
    }
    if (interaction.kind === 'table-cell') {
      this.#setFamilyFocus(
        {
          kind: 'table-cell',
          layerId: hit.layerId,
          row: interaction.row,
          column: interaction.column,
          field: interaction.field,
        },
        'pointer',
      );
      return false;
    }
    if (interaction.kind === 'table-header') {
      const current = this.getTableRuntimeState(hit.layerId);
      const existing = current.sort.find(({ field }) => field === interaction.field);
      const nextDirection =
        existing === undefined
          ? 'ascending'
          : existing.direction === 'ascending'
            ? 'descending'
            : null;
      const retained = event.shiftKey
        ? current.sort.filter(({ field }) => field !== interaction.field)
        : [];
      const sort: ChartTableSort[] =
        nextDirection === null
          ? retained
          : [...retained, { field: interaction.field, direction: nextDirection }];
      this.#setTableRuntimeState(
        hit.layerId,
        normalizeTableRuntimeState({ sort, windowOffset: 0 }, current),
        'pointer',
      );
      return true;
    }
    if (interaction.kind === 'network-node') {
      const toggleCollapse = (event.altKey || event.detail >= 2) && interaction.compound;
      const togglePin = event.ctrlKey || event.metaKey;
      if (!toggleCollapse && !togglePin) return false;
      const current = this.getNetworkRuntimeState(hit.layerId);
      let next = current;
      if (toggleCollapse) {
        const collapsed = new Set(current.collapsed);
        if (collapsed.has(interaction.id)) collapsed.delete(interaction.id);
        else collapsed.add(interaction.id);
        next = normalizeNetworkRuntimeState({ collapsed: [...collapsed] }, next);
      }
      if (togglePin) {
        const position = next.positions[interaction.id] ?? interaction.position;
        next = normalizeNetworkRuntimeState(
          {
            positions: {
              ...next.positions,
              [interaction.id]: { ...position, pinned: !interaction.pinned },
            },
          },
          next,
        );
      }
      this.#setNetworkRuntimeState(hit.layerId, next, 'pointer');
      return true;
    }
    if (interaction.kind === 'hierarchy-node') {
      const current = this.getHierarchyRuntimeState(hit.layerId);
      if (event.shiftKey) {
        this.#setHierarchyRuntimeState(
          hit.layerId,
          normalizeHierarchyRuntimeState({ root: interaction.id, zoomTo: null }, current),
          'pointer',
        );
      } else if (event.altKey) {
        this.#setHierarchyRuntimeState(
          hit.layerId,
          normalizeHierarchyRuntimeState({ zoomTo: interaction.id }, current),
          'pointer',
        );
      } else if (!interaction.leaf || current.collapsed.includes(interaction.id)) {
        const collapsed = new Set(current.collapsed);
        if (collapsed.has(interaction.id)) collapsed.delete(interaction.id);
        else collapsed.add(interaction.id);
        this.#setHierarchyRuntimeState(
          hit.layerId,
          normalizeHierarchyRuntimeState({ collapsed: [...collapsed] }, current),
          'pointer',
        );
      } else return false;
      return true;
    }
    if (interaction.kind === 'parallel-axis' && (event.altKey || event.detail >= 2)) {
      this.#setParallelRuntimeState(
        hit.layerId,
        invertParallelAxisState(this.getParallelRuntimeState(hit.layerId), interaction.field),
        'pointer',
      );
      return true;
    }
    return false;
  }

  #applyClickSelection(
    hit: HitResult | null,
    reason: ChartSelectionChangeReason = 'click',
    analyticReason: ChartAnalyticSelectionChangeReason = 'pointer',
  ): void {
    const selection = this.#result?.spec.interaction.selection;
    if (selection === undefined || selection === false) return;
    if (selection.kind !== 'point') return;
    if (hit === null) {
      if (selection.clearOnBackground && this.#selection.length > 0) {
        this.#selection = [];
        this.#analyticSelection.clear(selection.combine);
        this.render();
        this.#emitSelection(reason);
        this.#emitAnalyticSelection(analyticReason);
      }
      return;
    }
    const keyValue =
      selection.key === undefined
        ? undefined
        : (hit.tooltip?.[selection.key] ?? hit.datum[selection.key]);
    const portableKey =
      keyValue === null ||
      typeof keyValue === 'string' ||
      typeof keyValue === 'boolean' ||
      (typeof keyValue === 'number' && Number.isFinite(keyValue))
        ? keyValue
        : undefined;
    const target: DatumTargetSpec =
      selection.key !== undefined && portableKey !== undefined
        ? {
            type: 'datum',
            ...(selection.linked ? {} : { layerId: hit.layerId }),
            field: selection.key,
            value: portableKey,
          }
        : { type: 'datum', layerId: hit.layerId, rowIndex: hit.rowIndex };
    const key = selectionKey(target);
    const existing = this.#selection.findIndex((candidate) => selectionKey(candidate) === key);
    const before = this.#selection.map(selectionKey).join('|');
    if (selection.mode === 'single') {
      this.#selection = existing >= 0 && selection.toggle ? [] : [target];
    } else if (existing >= 0 && selection.toggle) {
      this.#selection = this.#selection.filter((_, index) => index !== existing);
    } else if (existing < 0) {
      this.#selection = [...this.#selection, target];
    }
    if (before === this.#selection.map(selectionKey).join('|')) return;
    this.#syncAnalyticPointTargets();
    this.render();
    this.#emitSelection(reason);
    this.#emitAnalyticSelection(analyticReason);
  }

  #emitSelection(reason: ChartSelectionChangeReason): void {
    this.#syncSelectionAccessibility();
    this.#events.emit('selectionchange', { chart: this, state: this.getSelection(), reason });
  }

  #requireAnalyticSelection(): NormalizedSelectionSpec {
    const selection = this.#result?.spec.interaction.selection;
    if (selection === undefined || selection === false) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Enable interaction.selection before changing analytic selection state.',
      );
    }
    return selection;
  }

  #validateAnalyticStateForConfig(
    state: AnalyticSelectionState,
    config: NormalizedSelectionSpec,
  ): void {
    if (state.selections.length > config.maxSelections) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Analytic selection exceeds the configured ${config.maxSelections} selection bound.`,
      );
    }
    if (config.mode === 'single' && state.selections.length > 1) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Single selection mode accepts at most one selection.',
      );
    }
    for (const selection of state.selections) {
      if (selection.type !== config.kind) {
        throw new GraflumeError(
          'INVALID_SPEC',
          `Selection type "${selection.type}" does not match configured kind "${config.kind}".`,
        );
      }
      if (selection.type === 'lasso' && selection.points.length > config.maxLassoPoints) {
        throw new GraflumeError(
          'INVALID_SPEC',
          `Lasso selection exceeds the configured ${config.maxLassoPoints} point bound.`,
        );
      }
    }
  }

  #syncAnalyticPointTargets(): void {
    const config = this.#result?.spec.interaction.selection;
    if (config === undefined || config === false || config.kind !== 'point') return;
    this.#analyticSelection.set({
      version: analyticSelectionVersion,
      combine: config.combine,
      selections: this.#selection.map((target) => ({ type: 'point', target })),
    });
  }

  #emitAnalyticSelection(reason: ChartAnalyticSelectionChangeReason): void {
    this.#syncSelectionAccessibility();
    const state = this.#analyticSelection.get();
    this.#events.emit('analyticselectionchange', {
      chart: this,
      state,
      reason,
    });
    if (!this.#applyingLinkedViewState) {
      this.#options.linkedViewStore?.setAnalyticSelection(state, this.#semanticViewId);
    }
  }

  #applyLinkedViewState(change: LinkedViewStateChange): void {
    if (this.#applyingLinkedViewState || change.sourceViewId === this.#semanticViewId) return;
    const previousSelection = this.#analyticSelection.get();
    const previousTargets = this.#selection;
    const previousDomain = this.#domainView;
    this.#applyingLinkedViewState = true;
    try {
      if (change.changed === 'analytic-selection' || change.changed === 'both') {
        const config = this.#result?.spec.interaction.selection;
        if (config === undefined || config === false) {
          if (change.state.analyticSelection.selections.length > 0) {
            throw new GraflumeError(
              'INVALID_SPEC',
              'Linked analytic selection requires interaction.selection in every view.',
            );
          }
        } else {
          this.#validateAnalyticStateForConfig(change.state.analyticSelection, config);
          this.#analyticSelection.set(change.state.analyticSelection);
          if (config.kind === 'point') {
            this.#selection = change.state.analyticSelection.selections.flatMap((candidate) =>
              candidate.type === 'point' && candidate.target !== undefined
                ? [cloneDatumTarget(candidate.target)]
                : [],
            );
          } else this.#selection = [];
        }
      }
      if (change.changed === 'domain-view' || change.changed === 'both') {
        const navigation = this.#domainNavigation();
        const next = normalizeDomainViewState(change.state.domainView);
        if (navigation === false && Object.keys(next.axes).length > 0) {
          throw new GraflumeError(
            'INVALID_SPEC',
            'Linked domain state requires interaction.domainNavigation in every view.',
          );
        }
        if (navigation !== false) {
          for (const axis of Object.keys(next.axes) as AxisId[]) {
            if (!navigation.axes.includes(axis)) {
              throw new GraflumeError(
                'INVALID_SPEC',
                `Linked domain axis "${axis}" is not enabled in this view.`,
              );
            }
          }
        }
        this.#domainView = next;
      }
      this.render();
      if (change.changed === 'analytic-selection' || change.changed === 'both') {
        this.#emitAnalyticSelection('linked');
        const selection = this.#result?.spec.interaction.selection;
        if (selection !== undefined && selection !== false && selection.kind === 'point') {
          this.#emitSelection('programmatic');
        }
      }
      if (change.changed === 'domain-view' || change.changed === 'both') {
        this.#emitDomainView('linked');
      }
    } catch (error) {
      this.#analyticSelection.set(previousSelection);
      this.#selection = previousTargets;
      this.#domainView = previousDomain;
      this.#events.emit('error', { chart: this, error });
    } finally {
      this.#applyingLinkedViewState = false;
    }
  }

  #emitAnnotations(reason: ChartAnnotationChangeReason, id?: string): void {
    this.#events.emit('annotationchange', {
      chart: this,
      annotations: this.getAnnotations(),
      reason,
      ...(id === undefined ? {} : { id }),
    });
  }

  #markLabelAuthoring(): false | NormalizedMarkLabelAuthoringSpec {
    const labels = this.#result?.spec.markLabels;
    return labels === undefined || labels === false ? false : labels.authoring;
  }

  #resetMarkLabels(spec: NormalizedChartSpec): void {
    const labels = spec.markLabels;
    const historyLimit =
      labels === false || labels.authoring === false ? 50 : labels.authoring.historyLimit;
    this.#markLabels.reset(labels === false ? [] : labels.positions, historyLimit);
    this.#activeMarkLabelId = null;
    this.#markLabelGesture = null;
  }

  #specWithMarkLabelPositions(positions: readonly MarkLabelPositionSpec[]): ChartSpec {
    const labels = this.#spec.markLabels;
    if (labels === undefined || labels === false) {
      throw new GraflumeError(
        'INVALID_SPEC',
        'Enable markLabels before setting authored label positions.',
      );
    }
    return {
      ...this.#spec,
      markLabels: {
        ...(labels === true ? {} : labels),
        positions: cloneMarkLabelPositions(positions),
      },
    };
  }

  #requireMarkLabel(id: string): MarkLabelSceneEntry {
    const entry = this.#result?.scene.metadata.markLabels?.entries.find(
      (candidate) => candidate.id === id,
    );
    if (entry === undefined) {
      throw new GraflumeError('INVALID_SPEC', `Mark label "${id}" was not found.`);
    }
    return entry;
  }

  #emitMarkLabels(reason: ChartMarkLabelChangeReason, id?: string): void {
    const state = this.getMarkLabelState();
    this.#events.emit('marklabelchange', {
      chart: this,
      state,
      reason,
      ...(id === undefined ? {} : { id }),
    });
    const entry =
      id === undefined ? undefined : state.labels.find((candidate) => candidate.id === id);
    const status =
      reason === 'undo'
        ? 'Label movement undone.'
        : reason === 'redo'
          ? 'Label movement redone.'
          : reason === 'reset'
            ? 'Label positions reset.'
            : entry === undefined
              ? `Label authoring ${reason}.`
              : `${entry.text}: horizontal offset ${entry.offsetX}, vertical offset ${entry.offsetY}.`;
    if (this.#markLabelLive !== null) this.#markLabelLive.textContent = status;
  }

  #syncMarkLabelAccessibility(): void {
    const host = this.#renderer?.overlayHost?.();
    const authoring = this.#markLabelAuthoring();
    if (host === null || host === undefined || authoring === false) {
      this.#destroyMarkLabelLive();
      return;
    }
    if (this.#markLabelLiveHost === host && this.#markLabelLive !== null) return;
    this.#destroyMarkLabelLive();
    const live = host.ownerDocument.createElement('div');
    live.dataset.graflumeMarkLabelStatus = 'true';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.style.position = 'absolute';
    live.style.width = '1px';
    live.style.height = '1px';
    live.style.overflow = 'hidden';
    live.style.clipPath = 'inset(50%)';
    host.append(live);
    this.#markLabelLive = live;
    this.#markLabelLiveHost = host;
  }

  #destroyMarkLabelLive(): void {
    this.#markLabelLive?.remove();
    this.#markLabelLive = null;
    this.#markLabelLiveHost = null;
  }

  #setAnnotationsVisible(visible: boolean, reason: ChartAnnotationVisibilityChangeReason): this {
    this.#assertAlive();
    if (typeof visible !== 'boolean')
      throw new TypeError('Annotation visibility must be a boolean.');
    if (visible === this.#annotationsVisible) return this;
    this.#annotationsVisible = visible;
    this.render();
    this.#emitAnnotationVisibility(reason);
    return this;
  }

  #emitAnnotationVisibility(reason: ChartAnnotationVisibilityChangeReason): void {
    this.#events.emit('annotationvisibilitychange', {
      chart: this,
      visible: this.#annotationsVisible,
      reason,
    });
  }

  #isOwnFullscreen(): boolean {
    if (typeof document === 'undefined') return false;
    const host = this.#renderer?.overlayHost?.();
    return host !== null && host !== undefined && document.fullscreenElement === host;
  }

  #fullscreenAvailable(): boolean {
    const host = this.#renderer?.overlayHost?.();
    return (
      host !== null &&
      host !== undefined &&
      typeof document !== 'undefined' &&
      typeof host.requestFullscreen === 'function' &&
      typeof document.exitFullscreen === 'function'
    );
  }

  #syncControls(): void {
    const controls = this.#result?.spec.interaction.controls;
    const host = this.#renderer?.overlayHost?.();
    if (controls === false || controls === undefined || host === null || host === undefined) {
      this.#controls.destroy();
      return;
    }
    const navigation = this.#navigation();
    const domainNavigation = this.#domainNavigation();
    const domainZoom =
      domainNavigation === false
        ? 1
        : Math.max(
            ...domainNavigation.axes.map((axis) => {
              const window = domainAxisWindow(this.#domainView, axis);
              return 1 / (window.end - window.start);
            }),
          );
    const playbackState = this.getPlaybackState();
    const state: ControlsState = {
      spec: controls,
      navigationEnabled:
        domainNavigation !== false ||
        (navigation !== false &&
          this.#renderer?.capabilities.inspectionViewport === true &&
          this.#renderer.setInspectionView !== undefined),
      viewDirty:
        domainNavigation !== false
          ? !domainViewIsIdentity(this.#domainView)
          : navigation !== false &&
            !sameView(this.#view, { zoom: navigation.minZoom, offsetX: 0, offsetY: 0 }),
      zoom: domainNavigation === false ? this.#view.zoom : domainZoom,
      minZoom: domainNavigation === false ? (navigation === false ? 1 : navigation.minZoom) : 1,
      maxZoom:
        domainNavigation === false
          ? navigation === false
            ? 1
            : navigation.maxZoom
          : domainNavigation.maxZoom,
      fullscreenAvailable: this.#fullscreenAvailable(),
      fullscreen: this.#fullscreen,
      exportAvailable:
        this.#renderer?.toDataURL !== undefined &&
        this.#renderer.capabilities.exportFormats.includes('image/png'),
      annotationsAvailable: this.#annotations.length > 0,
      annotationsVisible: this.#annotationsVisible,
      playbackEnabled: playbackState.enabled,
      playbackIndex: playbackState.index,
      playbackLength: playbackState.frames.length,
      playbackRangeStart: playbackState.range?.start ?? 0,
      playbackRangeEnd: playbackState.range?.end ?? -1,
      playing: playbackState.playing,
      playbackRate: playbackState.rate,
      loop: playbackState.loop,
      frameLabel: playbackState.label,
      frameNamed: playbackState.name !== undefined,
    };
    const actions: ControlsActions = {
      zoomIn: () => (domainNavigation === false ? this.zoomBy(1.25) : this.zoomDomainBy(1.25)),
      zoomOut: () => (domainNavigation === false ? this.zoomBy(0.8) : this.zoomDomainBy(0.8)),
      reset: () => (domainNavigation === false ? this.resetView() : this.resetDomainView()),
      toggleFullscreen: () => void this.toggleFullscreen().catch(() => undefined),
      exportPng: () => this.#exportPng(),
      toggleAnnotations: () => this.toggleAnnotations(),
      previousFrame: () => this.step(-1),
      togglePlayback: () => (this.#playing ? this.pause() : this.play()),
      nextFrame: () => this.step(1),
      seek: (index) => this.seek(index),
      setRate: (rate) => this.setPlaybackRate(rate),
      setLoop: (loop) => this.setPlaybackLoop(loop),
    };
    this.#controls.sync(host, state, actions);
  }

  #syncLegend(): void {
    const result = this.#result;
    const host = this.#renderer?.overlayHost?.();
    if (result === null || host === null || host === undefined) {
      this.#legend.destroy();
      return;
    }
    this.#legend.sync(host, sceneLegendLayout(result.scene), result.spec.legend, this.#view, {
      setVisible: (id, visible) => this.#setLegendItemVisible(id, visible, 'toggle'),
    });
  }

  #semanticSelected(mark: SemanticMark, target: DatumTargetSpec): boolean {
    if (target.layerId !== undefined && target.layerId !== mark.layerId) return false;
    if (target.rowIndex !== undefined) {
      const rows = Array.isArray(target.rowIndex) ? target.rowIndex : [target.rowIndex];
      if (!rows.includes(mark.rowIndex)) return false;
    }
    if (target.field !== undefined) {
      const value = mark.datum[target.field];
      const values = target.values ?? (target.value === undefined ? [] : [target.value]);
      if (!values.some((candidate) => Object.is(candidate, value))) return false;
    }
    return target.rowIndex !== undefined || target.field !== undefined;
  }

  #semanticSelectionTarget(mark: SemanticMark): DatumTargetSpec {
    const selection = this.#result?.spec.interaction.selection;
    if (selection !== undefined && selection !== false && selection.key !== undefined) {
      const value = mark.datum[selection.key];
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        return { type: 'datum', layerId: mark.layerId, field: selection.key, value };
      }
    }
    return { type: 'datum', layerId: mark.layerId, rowIndex: mark.rowIndex };
  }

  #toggleSemanticSelection(mark: SemanticMark): void {
    const selection = this.#result?.spec.interaction.selection;
    if (selection === undefined || selection === false) return;
    if (selection.kind !== 'point') return;
    const target = this.#semanticSelectionTarget(mark);
    const key = selectionKey(target);
    const existing = this.#selection.findIndex((candidate) => selectionKey(candidate) === key);
    if (selection.mode === 'single') {
      this.setSelection(existing >= 0 && selection.toggle ? [] : [target]);
      return;
    }
    if (existing >= 0 && selection.toggle) {
      this.setSelection(this.#selection.filter((_, index) => index !== existing));
    } else if (existing < 0) this.setSelection([...this.#selection, target]);
  }

  #focusSemanticMark(mark: SemanticMark | null): void {
    if (mark === null) {
      this.#tooltip.hide();
      return;
    }
    const result = this.#result;
    const surface = this.#renderer?.surface();
    const host = this.#renderer?.overlayHost?.();
    if (
      result === null ||
      result.spec.interaction.tooltip === false ||
      surface === null ||
      surface === undefined ||
      host === null ||
      host === undefined
    )
      return;
    const x = (mark.bounds.x + mark.bounds.width / 2) * this.#view.zoom + this.#view.offsetX;
    const y = (mark.bounds.y + mark.bounds.height / 2) * this.#view.zoom + this.#view.offsetY;
    const hostBounds = host.getBoundingClientRect();
    const hit: HitResult = {
      layerId: mark.layerId,
      rowIndex: mark.rowIndex,
      datum: mark.datum,
      nodeId: mark.id,
      x,
      y,
      distance: 0,
    };
    this.#tooltip.showAt(
      resolveTooltipContent(hit, result.spec),
      hit,
      hostBounds.left + x,
      hostBounds.top + y,
      surface,
      host,
    );
  }

  #syncAccessibilityMirror(): void {
    const result = this.#result;
    const surface = this.#renderer?.surface();
    const host = this.#renderer?.overlayHost?.();
    if (
      result === null ||
      surface === null ||
      surface === undefined ||
      host === null ||
      host === undefined
    ) {
      this.#accessibility.destroy();
      this.#linkedFocusUnregister?.();
      this.#linkedFocusUnsubscribe?.();
      this.#linkedFocusUnregister = null;
      this.#linkedFocusUnsubscribe = null;
      return;
    }
    const selectedIds = new Set(
      result.scene.semanticIndex
        .filter((mark) => this.#selection.some((target) => this.#semanticSelected(mark, target)))
        .map(({ id }) => id),
    );
    this.#accessibility.sync(
      this.#target,
      host,
      surface,
      result.scene.semanticIndex,
      result.spec.accessibility,
      this.#view,
      selectedIds,
      {
        toggle: (mark) => this.#toggleSemanticSelection(mark),
        clear: () => this.clearSelection(),
        focus: (mark) => {
          this.#focusSemanticMark(mark);
          this.#publishLinkedFocus(mark);
        },
      },
    );
    this.#syncLinkedFocus();
  }

  #focusStore(): SemanticFocusStore {
    return this.#options.focusStore ?? defaultSemanticFocusStore;
  }

  #syncLinkedFocus(): void {
    this.#linkedFocusUnregister?.();
    this.#linkedFocusUnsubscribe?.();
    this.#linkedFocusUnregister = null;
    this.#linkedFocusUnsubscribe = null;
    this.#lastPublishedSemanticId = null;
    const result = this.#result;
    const linked = result?.spec.accessibility.linkedFocus;
    if (result === null || result === undefined || linked === undefined || linked === false) return;
    const index = result.scene.semanticIndex.filter(({ datum }) => {
      const value = datum[linked.key];
      return (
        (typeof value === 'string' && value !== '') ||
        typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value)) ||
        (value instanceof Date && Number.isFinite(value.getTime()))
      );
    });
    const store = this.#focusStore();
    this.#linkedFocusUnregister = store.registerView(this.#semanticViewId, linked, index);
    this.#linkedFocusUnsubscribe = store.subscribe((change) => this.#applyLinkedFocus(change));
    this.#applyLinkedFocus({ state: store.state(), reason: 'index' });
  }

  #applyLinkedFocus(change: SemanticFocusChange): void {
    const linked = this.#result?.spec.accessibility.linkedFocus;
    if (linked === undefined || linked === false || change.state.focused?.group !== linked.group)
      return;
    const match = change.state.matches.find(({ viewId }) => viewId === this.#semanticViewId);
    if (match === undefined || this.#accessibility.getFocusedId() === match.semanticId) return;
    this.#applyingLinkedFocus = true;
    try {
      this.#accessibility.focusSemanticId(match.semanticId);
    } finally {
      this.#applyingLinkedFocus = false;
    }
  }

  #publishLinkedFocus(mark: SemanticMark | null): void {
    const linked = this.#result?.spec.accessibility.linkedFocus;
    if (linked === undefined || linked === false || this.#applyingLinkedFocus) return;
    const store = this.#focusStore();
    if (mark === null) {
      if (store.state().focused?.sourceViewId === this.#semanticViewId) store.clear();
      this.#lastPublishedSemanticId = null;
      return;
    }
    if (this.#lastPublishedSemanticId === mark.id) return;
    const value = mark.datum[linked.key];
    if (!(
      (typeof value === 'string' && value !== '') ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      (value instanceof Date && Number.isFinite(value.getTime()))
    ))
      return;
    this.#lastPublishedSemanticId = mark.id;
    store.focus(this.#semanticViewId, mark);
  }

  #syncSelectionAccessibility(): void {
    const host = this.#renderer?.overlayHost?.();
    const selection = this.#result?.spec.interaction.selection;
    const live = this.#result?.spec.accessibility.live;
    if (
      host === null ||
      host === undefined ||
      selection === undefined ||
      selection === false ||
      live === undefined ||
      live === false
    ) {
      this.#destroySelectionLive();
      return;
    }
    if (this.#selectionLiveHost !== host) {
      this.#destroySelectionLive();
      const live = host.ownerDocument.createElement('div');
      live.dataset.graflumeSelectionStatus = 'true';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.style.position = 'absolute';
      live.style.width = '1px';
      live.style.height = '1px';
      live.style.overflow = 'hidden';
      live.style.clipPath = 'inset(50%)';
      host.append(live);
      this.#selectionLive = live;
      this.#selectionLiveHost = host;
    }
    if (this.#selectionLive !== null) {
      const selectedCount =
        selection.kind === 'point'
          ? this.#selection.length
          : this.#analyticSelection.get().selections.length;
      const summary = `${selection.ariaLabel}: ${selectedCount}`;
      if (this.#selectionLive.textContent === summary) return;
      const throttleMs = live.throttleMs;
      const elapsed = Date.now() - this.#selectionLiveUpdatedAt;
      const update = (): void => {
        if (this.#selectionLive !== null) this.#selectionLive.textContent = summary;
        this.#selectionLiveUpdatedAt = Date.now();
        this.#selectionLiveTimer = null;
      };
      if (this.#selectionLiveUpdatedAt === 0 || elapsed >= throttleMs) update();
      else {
        if (this.#selectionLiveTimer !== null) clearTimeout(this.#selectionLiveTimer);
        this.#selectionLiveTimer = setTimeout(update, throttleMs - elapsed);
      }
    }
  }

  #destroySelectionLive(): void {
    if (this.#selectionLiveTimer !== null) clearTimeout(this.#selectionLiveTimer);
    this.#selectionLiveTimer = null;
    this.#selectionLiveUpdatedAt = 0;
    this.#selectionLive?.remove();
    this.#selectionLive = null;
    this.#selectionLiveHost = null;
  }

  #exportPng(): void {
    if (typeof document === 'undefined') return;
    try {
      const link = document.createElement('a');
      link.href = this.toDataURL('image/png');
      link.download = 'graflume-chart.png';
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
    } catch (error) {
      this.#events.emit('error', { chart: this, error });
    }
  }

  #streamRuntime(layerId: string | undefined): IncrementalStreamRuntime {
    const streaming = this.#spec.streaming;
    if (streaming === undefined) {
      throw new GraflumeError(
        'INVALID_DATA',
        'A streaming runtime requires an explicit ChartSpec.streaming contract.',
      );
    }
    const target = this.#streamingTarget(layerId);
    const existing = this.#streamRuntimes.get(target.id);
    if (existing !== undefined) return existing;
    const layerTransforms =
      target.layerId === undefined
        ? []
        : (this.#spec.layers?.find(
            (layer, index) => (layer.id ?? `layer-${index}`) === target.layerId,
          )?.transform ?? []);
    const transforms: readonly TransformSpec[] = [
      ...(this.#spec.transform ?? []),
      ...layerTransforms,
    ];
    const runtime = new IncrementalStreamRuntime(
      target.source,
      transforms,
      streaming,
      streaming.runtime,
      this.#options.streamScheduler,
    );
    this.#streamRuntimes.set(target.id, runtime);
    return runtime;
  }

  #applyStreamingRows(rows: readonly DataRow[], layerId: string | undefined): void {
    this.#preserveStreamRuntimes = true;
    try {
      this.setData(rows, layerId);
    } finally {
      this.#preserveStreamRuntimes = false;
    }
  }

  #streamingTarget(layerId: string | undefined): {
    readonly id: string;
    readonly source: DataInput;
    readonly layerId?: string;
  };
  #streamingTarget(
    layerId: string | undefined,
    required: false,
  ): { readonly id: string; readonly source: DataInput; readonly layerId?: string } | null;
  #streamingTarget(
    layerId: string | undefined,
    required = true,
  ): { readonly id: string; readonly source: DataInput; readonly layerId?: string } | null {
    if (this.#spec.streaming === undefined) {
      if (!required) return null;
      throw new GraflumeError(
        'INVALID_DATA',
        'An explicit ChartSpec.streaming contract is required.',
      );
    }
    if (layerId === undefined && this.#spec.data !== undefined) {
      return { id: '$chart', source: this.#spec.data };
    }
    const layers = this.#spec.layers;
    if (layers === undefined) {
      if (!required) return null;
      throw new GraflumeError('INVALID_DATA', 'The chart has no layer data to update.');
    }
    const targetLayerId =
      layerId ?? (layers.length === 1 ? (layers[0]?.id ?? 'layer-0') : undefined);
    if (targetLayerId === undefined) {
      throw new GraflumeError('INVALID_DATA', 'Specify layerId when updating a multi-layer chart.');
    }
    const index = layers.findIndex(
      (layer, candidate) => (layer.id ?? `layer-${candidate}`) === targetLayerId,
    );
    const layer = layers[index];
    const source = layer?.data ?? this.#spec.data;
    if (layer === undefined || source === undefined) {
      if (!required) return null;
      throw new GraflumeError('INVALID_DATA', `Layer "${targetLayerId}" has no data source.`);
    }
    return { id: `layer:${targetLayerId}`, source, layerId: targetLayerId };
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new GraflumeError('DESTROYED_CHART', 'This chart instance has been destroyed.');
    }
  }
}
