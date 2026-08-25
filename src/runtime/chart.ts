import { compileWithRegistry, type CompileResult } from '../compiler/compile.js';
import { GraflumeError } from '../core/errors.js';
import { EventEmitter } from '../core/events.js';
import { DataTable } from '../data/table.js';
import {
  IncrementalDataStore,
  incrementalContractsMatch,
  type IncrementalDataState,
  type IncrementalReplay,
  type IncrementalUpdate,
} from '../data/incremental.js';
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
import { AccessibilityMirrorController } from '../interaction/accessibility.js';
import {
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
import { LegendController } from '../interaction/legend.js';
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
import { collectPlaybackFrames, playbackSpec } from '../interaction/playback.js';
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
  NormalizedChartSpec,
  NormalizedNavigationSpec,
  NormalizedDomainNavigationSpec,
  NormalizedPlaybackSpec,
  NormalizedSelectionSpec,
  PlaybackMode,
  PlaybackTransitionEasing,
} from '../spec/types.js';
import type { Scene } from '../scene/types.js';
import { toAccessibleRows, type AccessibleRow, type SemanticMark } from '../scene/semantic.js';
import type { RuntimeRegistry } from './registry.js';
import { RenderScheduler } from './scheduler.js';

export type ChartTarget = string | HTMLElement;

export interface ChartCreateOptions {
  readonly autoResize?: boolean;
  readonly width?: number;
  readonly height?: number;
  readonly pixelRatio?: number;
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
}

export type ChartPlaybackChangeReason =
  'play' | 'pause' | 'step' | 'seek' | 'rate' | 'loop' | 'spec';

export interface ChartPlaybackChangeEvent {
  readonly chart: Chart;
  readonly state: ChartPlaybackState;
  readonly reason: ChartPlaybackChangeReason;
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

export type ChartSelectionChangeReason = 'click' | 'programmatic' | 'clear' | 'spec';

export interface ChartSelectionChangeEvent {
  readonly chart: Chart;
  readonly state: ChartSelectionState;
  readonly reason: ChartSelectionChangeReason;
}

export type ChartAnalyticSelectionChangeReason = 'pointer' | 'programmatic' | 'clear' | 'spec';

export interface ChartAnalyticSelectionChangeEvent {
  readonly chart: Chart;
  readonly state: AnalyticSelectionState;
  readonly reason: ChartAnalyticSelectionChangeReason;
}

export type ChartDomainViewChangeReason = 'zoom' | 'pan' | 'reset' | 'programmatic' | 'spec';

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

export type ChartAnnotationChangeReason = 'set' | 'add' | 'update' | 'remove' | 'spec';

export interface ChartAnnotationChangeEvent {
  readonly chart: Chart;
  readonly annotations: readonly AnnotationSpec[];
  readonly reason: ChartAnnotationChangeReason;
  readonly id?: string;
}

export type ChartAnnotationVisibilityChangeReason = 'toggle' | 'programmatic' | 'spec';

export interface ChartAnnotationVisibilityChangeEvent {
  readonly chart: Chart;
  readonly visible: boolean;
  readonly reason: ChartAnnotationVisibilityChangeReason;
}

export interface ChartEventMap {
  readonly render: ChartRenderEvent;
  readonly hover: ChartPointerEvent;
  readonly click: ChartPointerEvent;
  readonly resize: ChartResizeEvent;
  readonly viewchange: ChartViewChangeEvent;
  readonly playbackchange: ChartPlaybackChangeEvent;
  readonly fullscreenchange: ChartFullscreenChangeEvent;
  readonly legendchange: ChartLegendChangeEvent;
  readonly selectionchange: ChartSelectionChangeEvent;
  readonly analyticselectionchange: ChartAnalyticSelectionChangeEvent;
  readonly domainviewchange: ChartDomainViewChangeEvent;
  readonly annotationchange: ChartAnnotationChangeEvent;
  readonly annotationvisibilitychange: ChartAnnotationVisibilityChangeEvent;
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
  readonly start: PixelPoint;
  current: PixelPoint;
  readonly points: PixelPoint[];
}

interface DomainPointerGesture {
  readonly pointerId: number;
  previous: PixelPoint;
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

function frameKey(value: DataValue): string {
  if (value instanceof Date) return `date:${value.getTime()}`;
  return `${typeof value}:${String(value)}`;
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
  readonly #activePointers = new Map<number, ActivePointer>();
  readonly #incrementalStores = new Map<string, IncrementalDataStore>();
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
  #playing = false;
  #playbackCancel: (() => void) | null = null;
  #playbackTimestamp: number | null = null;
  #sceneTransition: ActiveSceneTransition | null = null;
  #displayScene: Scene | null = null;
  #reducedMotion: MediaQueryList | null = null;
  #fullscreen = false;
  #hiddenLegendItems = new Set<string>();
  #selection: DatumTargetSpec[] = [];
  readonly #analyticSelection = new AnalyticSelectionStore();
  #domainView: DomainViewState = emptyDomainViewState();
  #analyticGesture: AnalyticPointerGesture | null = null;
  #domainGesture: DomainPointerGesture | null = null;
  #annotations: AnnotationSpec[] = [];
  #annotationsVisible = true;
  #selectionLive: HTMLDivElement | null = null;
  #selectionLiveHost: HTMLElement | null = null;
  #selectionLiveTimer: ReturnType<typeof setTimeout> | null = null;
  #selectionLiveUpdatedAt = 0;

  readonly #pointerMoveListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    const navigating = this.#handlePointerMove(event);
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
    this.#spec = spec;
    this.#registry = registry;
    this.#options = options;
    this.#manualWidth = options.width;
    this.#manualHeight = options.height;
    const normalized = normalizeSpec(spec);
    this.#annotations = normalized.annotations.map((annotation, index) => ({
      ...cloneAnnotation(annotation),
      id: annotationId(annotation, index),
    }));
    this.#configureInteraction(normalized, true);
    try {
      this.#configureEnvironmentListeners();
      this.render();
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

  domainToPixel(axis: AxisId, value: number | string | Date): number {
    this.#assertAlive();
    const result = this.#result;
    if (result === null) throw new GraflumeError('INVALID_SPEC', 'The chart is not rendered.');
    return mapDomainToPixel(result.coordinates, axis, value);
  }

  pixelToDomain(axis: AxisId, pixel: number): number | string {
    this.#assertAlive();
    const result = this.#result;
    if (result === null) throw new GraflumeError('INVALID_SPEC', 'The chart is not rendered.');
    return mapPixelToDomain(result.coordinates, axis, pixel);
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
        accessibility !== undefined && (accessibility.table !== false || accessibility.navigation),
      table: accessibility?.table ?? false,
      navigation: accessibility?.navigation ?? false,
      rowCount: this.getSemanticIndex().length,
      ...(focusedId === null ? {} : { focusedId }),
    };
  }

  getViewState(): ChartViewState {
    return { ...this.#view, enabled: this.#navigation() !== false };
  }

  getPlaybackState(): ChartPlaybackState {
    const frame = this.#playbackFrames[this.#playbackIndex];
    return {
      enabled: this.#playback !== false,
      frames: this.#playbackFrames,
      index: this.#playbackIndex,
      ...(frame === undefined ? {} : { frame }),
      playing: this.#playing,
      rate: this.#playbackRate,
      loop: this.#playbackLoop,
      mode: this.#playback === false ? 'frame' : this.#playback.mode,
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
    }
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
      }
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
    this.#annotations = resolved;
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
    this.#annotations = next;
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
    this.#annotations = next;
    this.render();
    this.#emitAnnotations('update', id);
    return this;
  }

  removeAnnotation(id: string): boolean {
    this.#assertAlive();
    const next = this.#annotations.filter((annotation) => annotation.id !== id);
    if (next.length === this.#annotations.length) return false;
    this.#annotations = next;
    this.render();
    this.#emitAnnotations('remove', id);
    return true;
  }

  setSpec(spec: ChartSpec): this {
    this.#assertAlive();
    const normalized = normalizeSpec(spec);
    this.pause();
    this.#spec = spec;
    this.#incrementalStores.clear();
    this.#annotations = normalized.annotations.map((annotation, index) => ({
      ...cloneAnnotation(annotation),
      id: annotationId(annotation, index),
    }));
    this.#selection = [];
    this.#analyticSelection.clear();
    this.#domainView = emptyDomainViewState();
    this.#annotationsVisible = true;
    this.#hiddenLegendItems.clear();
    this.#configureInteraction(normalized, true);
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

  zoomDomainBy(factor: number, anchor?: ChartViewPoint, axes?: readonly AxisId[]): this {
    this.#assertAlive();
    const navigation = this.#requireDomainNavigation();
    const result = this.#result;
    if (result === null) return this;
    const selectedAxes = this.#domainAxes(navigation, axes);
    const point = anchor ?? {
      x: result.coordinates.plot.x + result.coordinates.plot.width / 2,
      y: result.coordinates.plot.y + result.coordinates.plot.height / 2,
    };
    let next = this.#domainView;
    for (const axis of selectedAxes) {
      next = zoomDomainAtPixel(
        next,
        result.coordinates,
        axis,
        factor,
        axis === 'x' || axis === 'x2' ? point.x : point.y,
        navigation.maxZoom,
      );
    }
    return this.#setDomainView(next, 'zoom');
  }

  panDomainBy(deltaX: number, deltaY: number, axes?: readonly AxisId[]): this {
    this.#assertAlive();
    const navigation = this.#requireDomainNavigation();
    const result = this.#result;
    if (result === null) return this;
    let next = this.#domainView;
    for (const axis of this.#domainAxes(navigation, axes)) {
      next = panDomainByPixels(
        next,
        result.coordinates,
        axis,
        axis === 'x' || axis === 'x2' ? deltaX : deltaY,
      );
    }
    return this.#setDomainView(next, 'pan');
  }

  resetDomainView(): this {
    this.#assertAlive();
    this.#requireDomainNavigation();
    return this.#setDomainView(emptyDomainViewState(), 'reset');
  }

  play(): this {
    this.#assertAlive();
    if (this.#playback === false || this.#playbackFrames.length <= 1 || this.#playing) return this;
    if (typeof document !== 'undefined' && document.hidden) return this;
    if (this.#playbackIndex === this.#playbackFrames.length - 1) {
      this.#renderPlaybackIndex(0);
      this.#emitPlayback('seek');
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
    const length = this.#playbackFrames.length;
    let next = this.#playbackIndex + Math.trunc(delta);
    if (this.#playbackLoop) next = ((next % length) + length) % length;
    else next = Math.max(0, Math.min(length - 1, next));
    if (next === this.#playbackIndex) {
      if (this.#playing && !this.#playbackLoop) this.#stopPlayback(true);
      else if (this.#sceneTransition !== null) this.#finishSceneTransition();
      return this;
    }
    this.#renderPlaybackIndex(next);
    this.#emitPlayback('step');
    if (this.#playing && !this.#playbackLoop && next === length - 1) {
      this.#stopPlayback(false);
    }
    return this;
  }

  seek(index: number): this {
    this.#assertAlive();
    if (!Number.isFinite(index)) throw new RangeError('Playback index must be finite.');
    if (this.#playback === false || this.#playbackFrames.length === 0) return this;
    const next = Math.max(0, Math.min(this.#playbackFrames.length - 1, Math.trunc(index)));
    if (next === this.#playbackIndex) {
      if (this.#sceneTransition !== null) this.#finishSceneTransition();
      return this;
    }
    this.#renderPlaybackIndex(next);
    this.#emitPlayback('seek');
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
    const playbackSpecInput =
      this.#playback === false
        ? this.#spec
        : playbackSpec(this.#spec, this.#playback, this.#playbackFrames, this.#playbackIndex);
    // Fullscreen sizing is transient: it must override fixed chart dimensions
    // without mutating the caller's portable base spec.
    const effectiveSpec = this.#fullscreen
      ? { ...playbackSpecInput, width: 'container' as const, height: 'container' as const }
      : playbackSpecInput;
    const result = compileWithRegistry(effectiveSpec, this.#registry, dimensions, {
      hiddenLegendItemIds: this.#hiddenLegendItems,
      annotations: this.#annotations,
      annotationsVisible: this.#annotationsVisible,
      selection: this.#selection,
      analyticSelection: this.#analyticSelection.get(),
      domainView: this.#domainView,
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
    this.#syncControls();
    this.#syncLegend();
    this.#syncAccessibilityMirror();
    this.#syncSelectionAccessibility();
    this.#events.emit('render', { chart: this, scene: result.scene });
    return this;
  }

  #validateAnalyticCapabilities(result: CompileResult): void {
    const requireContinuous = (axis: AxisId, feature: string): void => {
      const scale = result.coordinates.axes[axis];
      if (scale === undefined) {
        throw new GraflumeError(
          'INCOMPATIBLE_SCALE',
          `${feature} requires resolved axis "${axis}".`,
          { path: `$.axes.${axis}` },
        );
      }
      if (scale.invert === undefined) {
        throw new GraflumeError(
          'INCOMPATIBLE_SCALE',
          `${feature} requires an invertible continuous axis; "${axis}" uses "${scale.kind}".`,
          { path: `$.axes.${axis}` },
        );
      }
    };
    const navigation = result.spec.interaction.domainNavigation;
    if (navigation !== false) {
      for (const axis of navigation.axes) requireContinuous(axis, 'Domain navigation');
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
    if (selection.kind === 'axis') {
      requireContinuous(selection.axis!, 'Axis selection');
    } else if (
      selection.kind === 'interval' ||
      selection.kind === 'rectangle' ||
      selection.kind === 'lasso'
    ) {
      requireContinuous(selection.xAxis, `${selection.kind} selection`);
      requireContinuous(selection.yAxis, `${selection.kind} selection`);
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
      return;
    }
    this.#playbackFrames = collectPlaybackFrames(this.#spec, this.#playback);
    this.#playbackRate = this.#playback.rate;
    this.#playbackLoop = this.#playback.loop;
    const initial = configuredFrame(this.#spec);
    const initialIndex =
      initial === undefined
        ? -1
        : this.#playbackFrames.findIndex((frame) => frameKey(frame) === frameKey(initial));
    this.#playbackIndex =
      initialIndex >= 0
        ? initialIndex
        : this.#playback.autoplay || this.#playback.mode === 'frame'
          ? 0
          : Math.max(0, this.#playbackFrames.length - 1);
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

  #emitPlayback(reason: ChartPlaybackChangeReason): void {
    this.#events.emit('playbackchange', {
      chart: this,
      state: this.getPlaybackState(),
      reason,
    });
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
      this.#reducedMotion?.matches !== true
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
          this.step(1);
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
    }
  }

  #detachEnvironmentListeners(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.#visibilityListener);
      document.removeEventListener('fullscreenchange', this.#fullscreenListener);
    }
    this.#reducedMotion?.removeEventListener?.('change', this.#reducedMotionListener);
    this.#reducedMotion = null;
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
    return Math.max(1, Math.min(3, ratio));
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
    const analyticDrag =
      selection !== undefined && selection !== false && selection.kind !== 'point';
    const inspecting = this.#view.zoom > 1 || this.#view.offsetX !== 0 || this.#view.offsetY !== 0;
    surface.style.touchAction =
      analyticDrag || (domainNavigation !== false && domainNavigation.drag)
        ? 'none'
        : navigation !== false && (navigation.drag || navigation.pinch)
          ? inspecting
            ? 'none'
            : 'pan-y'
          : (this.#surfaceTouchAction ?? '');
    surface.style.cursor = analyticDrag
      ? 'crosshair'
      : domainNavigation !== false && domainNavigation.drag
        ? 'grab'
        : navigation !== false && navigation.drag
          ? 'grab'
          : (this.#surfaceCursor ?? '');
    if (
      (navigation !== false && navigation.keyboard) ||
      (domainNavigation !== false && domainNavigation.keyboard) ||
      this.#result?.spec.accessibility.navigation === true ||
      (selection !== undefined && selection !== false && selection.clearOnEscape)
    )
      surface.tabIndex = 0;
    else if (this.#surfaceTabIndex === null) surface.removeAttribute('tabindex');
    else surface.setAttribute('tabindex', this.#surfaceTabIndex);
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
    this.#eventSurface = null;
    this.#surfaceTouchAction = null;
    this.#surfaceTabIndex = null;
    this.#surfaceCursor = null;
  }

  #cancelActiveGesture(): void {
    const surface = this.#eventSurface;
    if (surface !== null) {
      const pointerIds = new Set(this.#activePointers.keys());
      if (this.#analyticGesture !== null) pointerIds.add(this.#analyticGesture.pointerId);
      if (this.#domainGesture !== null) pointerIds.add(this.#domainGesture.pointerId);
      for (const pointerId of pointerIds) {
        if (surface.hasPointerCapture?.(pointerId)) surface.releasePointerCapture?.(pointerId);
      }
      surface.style.cursor = this.#surfaceCursor ?? '';
    }
    this.#activePointers.clear();
    this.#analyticGesture = null;
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

  #handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = this.#surfacePoint(event);
    if (point === null) return;
    const selection = this.#result?.spec.interaction.selection;
    if (
      selection !== undefined &&
      selection !== false &&
      selection.kind !== 'point' &&
      this.#analyticGesture === null
    ) {
      this.#analyticGesture = {
        pointerId: event.pointerId,
        start: point,
        current: point,
        points: [point],
      };
      this.#suppressClick = false;
      this.#dragDistance = 0;
      this.#eventSurface?.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    const domainNavigation = this.#domainNavigation();
    if (domainNavigation !== false && domainNavigation.drag && this.#domainGesture === null) {
      this.#domainGesture = { pointerId: event.pointerId, previous: point };
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
    if (this.#analyticGesture?.pointerId === event.pointerId) {
      const point = this.#surfacePoint(event);
      if (point === null) return false;
      const gesture = this.#analyticGesture;
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
      const point = this.#surfacePoint(event);
      if (point === null) return false;
      const previous = this.#domainGesture.previous;
      const deltaX = point.x - previous.x;
      const deltaY = point.y - previous.y;
      this.#dragDistance += Math.hypot(deltaX, deltaY);
      this.#domainGesture.previous = point;
      this.panDomainBy(deltaX, deltaY);
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
    if (this.#analyticGesture?.pointerId === event.pointerId) {
      const gesture = this.#analyticGesture;
      const point = this.#surfacePoint(event);
      if (point !== null) gesture.current = point;
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
    const spanX = Math.abs(gesture.current.x - gesture.start.x);
    const spanY = Math.abs(gesture.current.y - gesture.start.y);
    let resolved: AnalyticSelection;
    if (selection.kind === 'axis') {
      const span = selection.axis === 'x' || selection.axis === 'x2' ? spanX : spanY;
      if (span < selection.minPixelSpan) return;
      resolved = pixelAxisToSelection(
        result.coordinates,
        selection.axis!,
        gesture.start,
        gesture.current,
      );
    } else if (selection.kind === 'lasso') {
      const last = gesture.points.at(-1);
      if (last === undefined || pointDistance(last, gesture.current) >= 2) {
        gesture.points.push(gesture.current);
      }
      if (gesture.points.length < 3 || Math.max(spanX, spanY) < selection.minPixelSpan) {
        return;
      }
      resolved = pixelLassoToSelection(result.coordinates, gesture.points, {
        x: selection.xAxis,
        y: selection.yAxis,
      });
    } else if (selection.kind === 'interval' || selection.kind === 'rectangle') {
      if (Math.max(spanX, spanY) < selection.minPixelSpan) return;
      resolved = pixelRectangleToSelection(result.coordinates, gesture.start, gesture.current, {
        type: selection.kind,
        xAxis: selection.xAxis,
        yAxis: selection.yAxis,
      });
    } else return;

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
    this.#emitAnalyticSelection('pointer');
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

  #handleKeyDown(event: KeyboardEvent): void {
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
    if (type === 'click') this.#applyClickSelection(markLocal);
    if (type === 'hover' || result.spec.interaction.click !== false) {
      this.#events.emit(type, { chart: this, hit: markHit, sourceEvent });
    }
  }

  #applyClickSelection(hit: HitResult | null): void {
    const selection = this.#result?.spec.interaction.selection;
    if (selection === undefined || selection === false) return;
    if (selection.kind !== 'point') return;
    if (hit === null) {
      if (selection.clearOnBackground && this.#selection.length > 0) {
        this.#selection = [];
        this.#analyticSelection.clear(selection.combine);
        this.render();
        this.#emitSelection('click');
        this.#emitAnalyticSelection('pointer');
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
            layerId: hit.layerId,
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
    this.#emitSelection('click');
    this.#emitAnalyticSelection('pointer');
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
    this.#events.emit('analyticselectionchange', {
      chart: this,
      state: this.#analyticSelection.get(),
      reason,
    });
  }

  #emitAnnotations(reason: ChartAnnotationChangeReason, id?: string): void {
    this.#events.emit('annotationchange', {
      chart: this,
      annotations: this.getAnnotations(),
      reason,
      ...(id === undefined ? {} : { id }),
    });
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
      playing: playbackState.playing,
      playbackRate: playbackState.rate,
      loop: playbackState.loop,
      frameLabel:
        playbackState.frame instanceof Date
          ? playbackState.frame.toISOString()
          : String(playbackState.frame ?? ''),
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
        focus: (mark) => this.#focusSemanticMark(mark),
      },
    );
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
