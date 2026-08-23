import { compileWithRegistry, type CompileResult } from '../compiler/compile.js';
import { GraflumeError } from '../core/errors.js';
import { EventEmitter } from '../core/events.js';
import { DataTable } from '../data/table.js';
import { hitTestAxisTooltip } from '../interaction/axis-hit-test.js';
import {
  ControlsController,
  type ControlsActions,
  type ControlsState,
} from '../interaction/controls.js';
import { hitTestScene, type HitResult } from '../interaction/hit-test.js';
import {
  constrainInspectionView,
  identityInspectionView,
  inverseInspectionPoint,
  panInspectionView,
  zoomInspectionView,
  type InspectionViewPoint,
  type InspectionViewState,
} from '../interaction/inspection-view.js';
import { collectPlaybackFrames, playbackSpec } from '../interaction/playback.js';
import { resolveTooltipContent, TooltipController } from '../interaction/tooltip.js';
import type { Renderer } from '../renderer/types.js';
import { normalizeSpec } from '../spec/normalize.js';
import type {
  ChartSpec,
  DataInput,
  DataRow,
  DataValue,
  NormalizedChartSpec,
  NormalizedNavigationSpec,
  NormalizedPlaybackSpec,
  PlaybackMode,
} from '../spec/types.js';
import type { Scene } from '../scene/types.js';
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

export interface ChartEventMap {
  readonly render: ChartRenderEvent;
  readonly hover: ChartPointerEvent;
  readonly click: ChartPointerEvent;
  readonly resize: ChartResizeEvent;
  readonly viewchange: ChartViewChangeEvent;
  readonly playbackchange: ChartPlaybackChangeEvent;
  readonly fullscreenchange: ChartFullscreenChangeEvent;
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

export class Chart {
  readonly #target: HTMLElement;
  readonly #registry: RuntimeRegistry;
  readonly #events = new EventEmitter<ChartEventMap>();
  readonly #scheduler = new RenderScheduler();
  readonly #tooltip = new TooltipController();
  readonly #controls = new ControlsController();
  readonly #options: ChartCreateOptions;
  readonly #activePointers = new Map<number, ActivePointer>();
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
  #reducedMotion: MediaQueryList | null = null;
  #fullscreen = false;

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
    this.#handlePointerEnd(event);
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
    if (this.#result?.spec.interaction.click !== false) this.#emitPointer('click', event);
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

  setSpec(spec: ChartSpec): this {
    this.#assertAlive();
    const normalized = normalizeSpec(spec);
    this.pause();
    this.#spec = spec;
    this.#configureInteraction(normalized, true);
    this.render();
    this.#configureResizeObserver();
    this.#emitPlayback('spec');
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

  play(): this {
    this.#assertAlive();
    if (this.#playback === false || this.#playbackFrames.length <= 1 || this.#playing) return this;
    if (typeof document !== 'undefined' && document.hidden) return this;
    if (this.#playbackIndex === this.#playbackFrames.length - 1) {
      this.#playbackIndex = 0;
      this.render();
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
    if (this.#destroyed || !this.#playing) return this;
    this.#playing = false;
    this.#cancelPlaybackFrame();
    this.#emitPlayback('pause');
    this.#syncControls();
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
      if (this.#playing && !this.#playbackLoop) this.pause();
      return this;
    }
    this.#playbackIndex = next;
    this.render();
    this.#emitPlayback('step');
    if (this.#playing && !this.#playbackLoop && next === length - 1) this.pause();
    return this;
  }

  seek(index: number): this {
    this.#assertAlive();
    if (!Number.isFinite(index)) throw new RangeError('Playback index must be finite.');
    if (this.#playback === false || this.#playbackFrames.length === 0) return this;
    const next = Math.max(0, Math.min(this.#playbackFrames.length - 1, Math.trunc(index)));
    if (next === this.#playbackIndex) return this;
    this.#playbackIndex = next;
    this.render();
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
    const result = compileWithRegistry(effectiveSpec, this.#registry, dimensions);
    const factory = this.#registry.resolveRenderer(result.spec.renderer);
    const pixelRatio = this.#pixelRatio();
    const rendererChanged = this.#renderer === null || this.#rendererName !== factory.name;

    if (rendererChanged) {
      this.#detachSurfaceEvents();
      this.#controls.destroy();
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
    this.#syncSurfaceEvents();
    this.#syncControls();
    this.#events.emit('render', { chart: this, scene: result.scene });
    return this;
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
    this.#tooltip.destroy();
    this.#renderer?.destroy();
    this.#renderer = null;
    this.#result = null;
    this.#events.clear();
    this.#destroyed = true;
  }

  #configureInteraction(spec: NormalizedChartSpec, reset: boolean): void {
    this.#cancelActiveGesture();
    const navigation = spec.interaction.navigation;
    if (navigation === false) this.#view = identityInspectionView;
    else if (reset) this.#view = { zoom: navigation.minZoom, offsetX: 0, offsetY: 0 };

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
    const scene = this.#result?.scene;
    if (scene !== undefined) {
      this.#renderer?.setInspectionView?.(this.#view);
      this.#renderer?.render(scene);
    }
    this.#syncSurfaceConfiguration();
    this.#syncControls();
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
    this.#cancelScheduledPlaybackFrame();
    const run = (timestamp: number): void => {
      this.#playbackCancel = null;
      if (!this.#playing || this.#playback === false) return;
      if (this.#playbackTimestamp === null) this.#playbackTimestamp = timestamp;
      const duration = this.#playback.interval / this.#playbackRate;
      if (timestamp - this.#playbackTimestamp >= duration) {
        this.#playbackTimestamp = timestamp;
        this.step(1);
      }
      if (this.#playing) this.#schedulePlaybackFrame();
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
    const inspecting = this.#view.zoom > 1 || this.#view.offsetX !== 0 || this.#view.offsetY !== 0;
    surface.style.touchAction =
      navigation !== false && (navigation.drag || navigation.pinch)
        ? inspecting
          ? 'none'
          : 'pan-y'
        : (this.#surfaceTouchAction ?? '');
    surface.style.cursor =
      navigation !== false && navigation.drag ? 'grab' : (this.#surfaceCursor ?? '');
    if (navigation !== false && navigation.keyboard) surface.tabIndex = 0;
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
      for (const pointerId of this.#activePointers.keys()) {
        if (surface.hasPointerCapture?.(pointerId)) surface.releasePointerCapture?.(pointerId);
      }
      surface.style.cursor = this.#surfaceCursor ?? '';
    }
    this.#activePointers.clear();
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
    const navigation = this.#navigation();
    if (navigation === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (!navigation.drag && !(navigation.pinch && event.pointerType === 'touch')) return;
    const point = this.#surfacePoint(event);
    if (point === null) return;
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

  #handlePointerEnd(event: PointerEvent): void {
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
    this.#events.emit(type, { chart: this, hit: markHit, sourceEvent });
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
    const playbackState = this.getPlaybackState();
    const state: ControlsState = {
      spec: controls,
      navigationEnabled:
        navigation !== false &&
        this.#renderer?.capabilities.inspectionViewport === true &&
        this.#renderer.setInspectionView !== undefined,
      viewDirty:
        navigation !== false &&
        !sameView(this.#view, { zoom: navigation.minZoom, offsetX: 0, offsetY: 0 }),
      zoom: this.#view.zoom,
      minZoom: navigation === false ? 1 : navigation.minZoom,
      maxZoom: navigation === false ? 1 : navigation.maxZoom,
      fullscreenAvailable: this.#fullscreenAvailable(),
      fullscreen: this.#fullscreen,
      exportAvailable:
        this.#renderer?.toDataURL !== undefined &&
        this.#renderer.capabilities.exportFormats.includes('image/png'),
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
      zoomIn: () => this.zoomBy(1.25),
      zoomOut: () => this.zoomBy(0.8),
      reset: () => this.resetView(),
      toggleFullscreen: () => void this.toggleFullscreen().catch(() => undefined),
      exportPng: () => this.#exportPng(),
      previousFrame: () => this.step(-1),
      togglePlayback: () => (this.#playing ? this.pause() : this.play()),
      nextFrame: () => this.step(1),
      seek: (index) => this.seek(index),
      setRate: (rate) => this.setPlaybackRate(rate),
      setLoop: (loop) => this.setPlaybackLoop(loop),
    };
    this.#controls.sync(host, state, actions);
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

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new GraflumeError('DESTROYED_CHART', 'This chart instance has been destroyed.');
    }
  }
}
