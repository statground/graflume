import { EventEmitter } from '../core/events.js';
import { collectAccessibleSpatialPicks, spatialAccessibleDescription } from './accessibility.js';
import { compileSpatial, spatialColor } from './compile.js';
import { resolveSpatialSize } from './layout.js';
import { add3, cameraBasis, clamp, normalizedCamera, scale3 } from './math.js';
import { assertFiniteSpatialNumber, resolveSpatialCameraPatch } from './programmatic.js';
import { SpatialOverlayController, type SpatialLegendOverlayState } from './overlay.js';
import { assertValidSpatialSpec } from './validate.js';
import type { HighlightStyleSpec, JsonPrimitive } from '../spec/types.js';
import type {
  CompiledSpatialScene,
  SpatialAnnotationSpec,
  SpatialCameraState,
  SpatialChartSpec,
  SpatialControlLabels,
  SpatialCreateOptions,
  SpatialHitResult,
  SpatialDatumTargetSpec,
  SpatialDecorationTargetSpec,
  SpatialLayerSpec,
  SpatialProjection,
  SpatialVec3,
  SpatialVolumeData,
  SpatialSurfaceGridData,
  SpatialScatterData,
} from './types.js';
import { isGlobePickFrontFacing, SpatialWebGLRenderer } from './webgl-renderer.js';

export type SpatialChartTarget = string | HTMLElement;
export type SpatialCameraChangeReason = 'orbit' | 'pan' | 'zoom' | 'projection' | 'reset' | 'spec';

export interface SpatialRenderEvent {
  readonly chart: SpatialChart;
  readonly scene: CompiledSpatialScene;
}

export interface SpatialPointerEvent {
  readonly chart: SpatialChart;
  readonly hit: SpatialHitResult | null;
  readonly sourceEvent: PointerEvent;
}

export interface SpatialResizeEvent {
  readonly chart: SpatialChart;
  readonly width: number;
  readonly height: number;
}

export interface SpatialCameraChangeEvent {
  readonly chart: SpatialChart;
  readonly camera: SpatialCameraState;
  readonly reason: SpatialCameraChangeReason;
}

export interface SpatialFullscreenChangeEvent {
  readonly chart: SpatialChart;
  readonly active: boolean;
}

export interface SpatialLegendItemState {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly visible: boolean;
  readonly toggleable: boolean;
  readonly symbol: 'line' | 'point' | 'rect';
  readonly layerId?: string;
  readonly value?: JsonPrimitive;
}

export interface SpatialLegendState {
  readonly enabled: boolean;
  readonly items: readonly SpatialLegendItemState[];
}

export type SpatialLegendChangeReason = 'toggle' | 'programmatic' | 'reset' | 'spec';

export interface SpatialLegendChangeEvent {
  readonly chart: SpatialChart;
  readonly state: SpatialLegendState;
  readonly reason: SpatialLegendChangeReason;
}

export interface SpatialSelectionState {
  readonly enabled: boolean;
  readonly items: readonly SpatialDatumTargetSpec[];
}

export type SpatialSelectionChangeReason = 'click' | 'programmatic' | 'clear' | 'spec';

export interface SpatialSelectionChangeEvent {
  readonly chart: SpatialChart;
  readonly state: SpatialSelectionState;
  readonly reason: SpatialSelectionChangeReason;
}

export type SpatialAnnotationChangeReason = 'set' | 'add' | 'update' | 'remove' | 'spec';

export interface SpatialAnnotationChangeEvent {
  readonly chart: SpatialChart;
  readonly annotations: readonly SpatialAnnotationSpec[];
  readonly reason: SpatialAnnotationChangeReason;
  readonly id?: string;
}

export interface SpatialErrorEvent {
  readonly chart: SpatialChart;
  readonly error: unknown;
}

export type SpatialAvailabilityStatus =
  'initializing' | 'ready' | 'unavailable' | 'context-lost' | 'destroyed';

export interface SpatialAvailabilityState {
  readonly status: SpatialAvailabilityStatus;
  readonly available: boolean;
  readonly message?: string;
}

export interface SpatialAvailabilityChangeEvent {
  readonly chart: SpatialChart;
  readonly state: SpatialAvailabilityState;
  readonly previous: SpatialAvailabilityState;
}

export interface SpatialChartEventMap {
  readonly render: SpatialRenderEvent;
  readonly hover: SpatialPointerEvent;
  readonly click: SpatialPointerEvent;
  readonly resize: SpatialResizeEvent;
  readonly camerachange: SpatialCameraChangeEvent;
  readonly fullscreenchange: SpatialFullscreenChangeEvent;
  readonly legendchange: SpatialLegendChangeEvent;
  readonly selectionchange: SpatialSelectionChangeEvent;
  readonly annotationchange: SpatialAnnotationChangeEvent;
  readonly contextloss: Readonly<{ chart: SpatialChart }>;
  readonly contextrestore: Readonly<{ chart: SpatialChart }>;
  readonly availabilitychange: SpatialAvailabilityChangeEvent;
  readonly error: SpatialErrorEvent;
}

interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

interface SpatialPlotViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function spatialPlotViewport(
  spec: SpatialChartSpec,
  width: number,
  height: number,
): SpatialPlotViewport {
  const input = spec.legend;
  if (
    input === undefined ||
    input === false ||
    (typeof input === 'object' && input.visible === false)
  )
    return { x: 0, y: 0, width, height };
  const position = typeof input === 'object' ? (input.position ?? 'right') : 'right';
  if (position.startsWith('inside-')) return { x: 0, y: 0, width, height };
  if (position === 'top' || position === 'bottom') {
    const rail = Math.min(Math.max(0, height - 1), Math.max(32, Math.min(72, height * 0.2)));
    return {
      x: 0,
      y: position === 'top' ? rail : 0,
      width,
      height: Math.max(1, height - rail),
    };
  }
  const rail = Math.min(Math.max(0, width - 1), Math.max(88, Math.min(176, width * 0.3)));
  return {
    x: position === 'left' ? rail : 0,
    y: 0,
    width: Math.max(1, width - rail),
    height,
  };
}

interface PinchState {
  readonly distance: number;
  readonly center: PointerPosition;
  readonly camera: SpatialCameraState;
}

type ResolvedSpatialLabels = Required<SpatialControlLabels>;

const defaultLabels: ResolvedSpatialLabels = {
  chart: 'Interactive three-dimensional chart',
  toolbar: 'Three-dimensional chart controls',
  orbit: 'Orbit camera',
  pan: 'Pan camera',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  reset: 'Reset camera',
  projection: 'Switch projection',
  fullscreen: 'Toggle fullscreen',
  exportPng: 'Download PNG',
  instructions:
    'Drag to orbit. Use Pan mode, Shift-drag, or the secondary pointer button to pan. Use Control or Command with the wheel, pinch, or plus and minus keys to zoom. Arrow keys move the camera; zero resets it.',
  contextLost: 'The 3D rendering context was lost. Restoring…',
  unavailable:
    'Hardware-accelerated 3D rendering is unavailable. The data table remains available.',
} as const;

const svgNamespace = 'http://www.w3.org/2000/svg';

function resolveTarget(target: SpatialChartTarget): HTMLElement {
  if (typeof target !== 'string') return target;
  const element = document.querySelector<HTMLElement>(target);
  if (element === null) throw new Error(`Spatial chart target "${target}" was not found.`);
  return element;
}

function eventPoint(event: PointerEvent, element: HTMLElement): PointerPosition {
  const bounds = element.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function center(left: PointerPosition, right: PointerPosition): PointerPosition {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function distance(left: PointerPosition, right: PointerPosition): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function icon(
  paths: readonly string[],
  circles: readonly (readonly [number, number, number])[] = [],
): SVGSVGElement {
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.pointerEvents = 'none';
  for (const value of paths) {
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', value);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
  }
  for (const [cx, cy, radius] of circles) {
    const circle = document.createElementNS(svgNamespace, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'currentColor');
    circle.setAttribute('stroke-width', '1.8');
    svg.append(circle);
  }
  return svg;
}

function safeText(value: unknown, limit = 160): string {
  const text = value === null || value === undefined ? '—' : String(value);
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function scalarEntries(
  datum: Readonly<Record<string, unknown>>,
  fields?: readonly string[],
): readonly [string, string][] {
  const selected = fields ?? Object.keys(datum);
  const output: [string, string][] = [];
  for (const field of selected) {
    const value = datum[field];
    if (
      value !== null &&
      value !== undefined &&
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    )
      continue;
    output.push([field, safeText(value)]);
    if (output.length >= 8) break;
  }
  return output;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function colorCss(value: Parameters<typeof spatialColor>[0]): string {
  const color = spatialColor(value);
  return `rgba(${Math.round(color[0] * 255)},${Math.round(color[1] * 255)},${Math.round(color[2] * 255)},${color[3]})`;
}

function layerColor(layer: SpatialLayerSpec, endpoint: 'low' | 'high' = 'low'): string {
  if (layer.mark.type === 'volume')
    return colorCss(
      endpoint === 'low' ? (layer.mark.colorLow ?? '#0ea5e9') : (layer.mark.colorHigh ?? '#7c3aed'),
    );
  if (layer.mark.type === 'surface')
    return colorCss(endpoint === 'low' ? '#0ea5e9' : (layer.mark.color ?? '#7c3aed'));
  if (layer.mark.type === 'scatter')
    return colorCss(endpoint === 'low' ? '#06b6d4' : (layer.mark.color ?? '#7c3aed'));
  if (layer.mark.type === 'vector')
    return colorCss(endpoint === 'low' ? '#99f6e4' : (layer.mark.color ?? '#0f9f8a'));
  if (layer.mark.type === 'globe') return colorCss(layer.mark.pointColor ?? layer.mark.landColor);
  return '#4f46e5';
}

function layerLegendSymbol(layer: SpatialLayerSpec | undefined): 'line' | 'point' | 'rect' {
  if (layer?.mark.type === 'scatter') return 'point';
  if (layer?.mark.type === 'vector' && layer.mark.mode === 'streamtube') return 'line';
  if (layer?.mark.type === 'globe') return 'point';
  return 'rect';
}

function cloneSpatialTarget(target: SpatialDecorationTargetSpec): SpatialDecorationTargetSpec {
  if (target.type === 'datum') {
    return {
      ...target,
      ...(Array.isArray(target.datumIndex) ? { datumIndex: [...target.datumIndex] } : {}),
      ...(target.values === undefined ? {} : { values: [...target.values] }),
    };
  }
  if (target.type === 'point')
    return { type: 'point', position: [...target.position] as SpatialVec3 };
  if (target.type === 'box') {
    return {
      type: 'box',
      min: [...target.min] as SpatialVec3,
      max: [...target.max] as SpatialVec3,
    };
  }
  return { ...target };
}

function cloneSpatialDatumTarget(target: SpatialDatumTargetSpec): SpatialDatumTargetSpec {
  return cloneSpatialTarget(target) as SpatialDatumTargetSpec;
}

function cloneSpatialAnnotation(annotation: SpatialAnnotationSpec): SpatialAnnotationSpec {
  return {
    ...annotation,
    target: cloneSpatialTarget(annotation.target),
    ...(typeof annotation.connector === 'object'
      ? { connector: { ...annotation.connector, dash: [...(annotation.connector.dash ?? [])] } }
      : {}),
    ...(annotation.style === undefined ? {} : { style: { ...annotation.style } }),
  };
}

function spatialSelectionKey(target: SpatialDatumTargetSpec): string {
  const values =
    target.field === undefined
      ? null
      : [...(target.values ?? [target.value ?? null])].sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        );
  const indices =
    target.datumIndex === undefined
      ? null
      : (Array.isArray(target.datumIndex) ? [...target.datumIndex] : [target.datumIndex]).sort(
          (left, right) => left - right,
        );
  return JSON.stringify([target.layerId ?? null, indices, target.field ?? null, values]);
}

export class SpatialChart {
  readonly #target: HTMLElement;
  readonly #wrapper: HTMLDivElement;
  readonly #renderer: SpatialWebGLRenderer;
  readonly #overlays = new SpatialOverlayController();
  readonly #events = new EventEmitter<SpatialChartEventMap>();
  readonly #options: SpatialCreateOptions;
  readonly #activePointers = new Map<number, PointerPosition>();
  readonly #controlButtons = new Map<string, HTMLButtonElement>();
  #spec: SpatialChartSpec;
  #scene: CompiledSpatialScene;
  #camera: SpatialCameraState;
  #initialCamera: SpatialCameraState;
  #mode: 'orbit' | 'pan' = 'orbit';
  #previousPointer: PointerPosition | null = null;
  #pinch: PinchState | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #windowResizeListener: (() => void) | null = null;
  #tooltip: HTMLDivElement | null = null;
  #fallback: HTMLDivElement | null = null;
  #accessibility: HTMLDivElement | null = null;
  #instructions: HTMLParagraphElement | null = null;
  #controls: HTMLDivElement | null = null;
  #destroyed = false;
  #availability: SpatialAvailabilityState = { status: 'initializing', available: false };
  #width = 1;
  #height = 1;
  #plotViewport: SpatialPlotViewport = { x: 0, y: 0, width: 1, height: 1 };
  #gestureActive = false;
  #hiddenLegendItems = new Set<string>();
  #selection: SpatialDatumTargetSpec[] = [];
  #annotations: SpatialAnnotationSpec[] = [];
  #annotationSequence = 0;

  constructor(
    target: SpatialChartTarget,
    spec: SpatialChartSpec,
    options: SpatialCreateOptions = {},
  ) {
    if (typeof document === 'undefined')
      throw new Error('A DOM environment is required for a spatial chart.');
    this.#target = resolveTarget(target);
    this.#spec = spec;
    this.#options = options;
    this.#scene = compileSpatial(spec);
    this.#annotations = (spec.annotations ?? []).map((annotation, index) => ({
      ...cloneSpatialAnnotation(annotation),
      id: annotation.id ?? `annotation-${index}`,
    }));
    this.#camera = this.#cameraForScene(this.#scene);
    this.#initialCamera = this.#camera;
    this.#wrapper = document.createElement('div');
    this.#wrapper.dataset.graflumeSpatial = 'true';
    this.#wrapper.style.position = 'relative';
    this.#wrapper.style.overflow = 'hidden';
    this.#wrapper.style.width = '100%';
    this.#wrapper.style.height =
      options.height === undefined ? '100%' : `${Math.max(1, options.height)}px`;
    this.#wrapper.style.minHeight = options.height === undefined ? '280px' : '0';
    this.#wrapper.style.background =
      typeof spec.background === 'string' ? spec.background : '#ffffff';
    this.#renderer = new SpatialWebGLRenderer({
      contextLost: () => {
        this.#showFallback('context-lost');
        this.#events.emit('contextloss', { chart: this });
      },
      contextRestored: () => {
        this.#hideFallback();
        this.#setAvailability('ready');
        this.#events.emit('contextrestore', { chart: this });
        this.render();
      },
      unavailable: () => this.#showFallback('unavailable'),
      error: (error) => this.#events.emit('error', { chart: this, error }),
    });
    try {
      this.#installScopedStyles();
      this.#target.append(this.#wrapper);
      const labels = { ...defaultLabels, ...spec.interaction?.labels };
      const accessibleDescription = spatialAccessibleDescription(
        spec.accessibility?.description,
        labels.instructions,
      );
      const mounted = this.#renderer.mount(
        this.#wrapper,
        this.#chartLabel(labels),
        accessibleDescription,
      );
      if (mounted) this.#setAvailability('ready');
      this.#renderer.setScene(this.#scene);
      this.#renderer.setCamera(this.#camera);
      this.#syncAccessibilityDom();
      this.#renderAccessibilityTable();
      this.#syncControlStructure();
      this.#syncAvailabilityCopy();
      this.#attachInteraction();
      this.#configureResize();
      this.resize(options.width, options.height);
      this.render();
    } catch (error) {
      try {
        this.destroy();
      } catch {
        // Preserve the original constructor failure after best-effort cleanup.
      }
      throw error;
    }
  }

  getSpec(): SpatialChartSpec {
    return this.#spec;
  }

  setSpec(spec: SpatialChartSpec): void {
    this.#assertAlive();
    const scene = compileSpatial(spec);
    this.#spec = spec;
    this.#scene = scene;
    this.#hiddenLegendItems.clear();
    this.#selection = [];
    this.#annotations = (spec.annotations ?? []).map((annotation, index) => ({
      ...cloneSpatialAnnotation(annotation),
      id: annotation.id ?? `annotation-${index}`,
    }));
    this.#camera = this.#cameraForScene(scene);
    this.#initialCamera = this.#camera;
    this.#renderer.setScene(scene);
    this.#renderer.setCamera(this.#camera);
    this.#wrapper.style.background =
      typeof spec.background === 'string' ? spec.background : '#ffffff';
    this.#hideTooltip();
    this.#syncAccessibilityDom();
    this.#renderAccessibilityTable();
    this.#syncControlStructure();
    this.#syncAvailabilityCopy();
    this.#resizeRendererViewport();
    this.#emitCamera('spec');
    this.render();
    this.#events.emit('legendchange', {
      chart: this,
      state: this.getLegendState(),
      reason: 'spec',
    });
    this.#emitSelection('spec');
    this.#emitAnnotations('spec');
  }

  getLegendState(): SpatialLegendState {
    const resolved = this.#legendOverlayState();
    return {
      enabled: resolved !== null,
      items:
        resolved?.items.map((item) => ({
          id: item.id,
          label: item.label,
          color: item.color,
          visible: item.visible,
          toggleable: item.toggleable,
          symbol: item.symbol,
          ...(item.layerId === undefined ? {} : { layerId: item.layerId }),
          ...(item.value === undefined ? {} : { value: item.value }),
        })) ?? [],
    };
  }

  setLegendItemVisible(id: string, visible: boolean): void {
    this.#setLegendItemVisible(id, visible, 'programmatic');
  }

  resetLegend(): void {
    this.#assertAlive();
    if (this.#hiddenLegendItems.size === 0) return;
    this.#hiddenLegendItems.clear();
    this.#installEffectiveScene();
    this.render();
    this.#events.emit('legendchange', {
      chart: this,
      state: this.getLegendState(),
      reason: 'reset',
    });
  }

  getSelection(): SpatialSelectionState {
    return {
      enabled: this.#selectionConfig() !== false,
      items: this.#selection.map(cloneSpatialDatumTarget),
    };
  }

  setSelection(items: readonly SpatialDatumTargetSpec[]): void {
    this.#assertAlive();
    if (this.#selectionConfig() === false)
      throw new TypeError('Enable interaction.selection before setting selection state.');
    assertValidSpatialSpec({
      ...this.#spec,
      // Replace authored highlights while validating selection targets so
      // their count and IDs cannot interfere with transient selection state.
      highlights: items.map((target) => ({ target })),
    });
    const selection = this.#selectionConfig();
    if (selection !== false && selection.mode === 'single' && items.length > 1)
      throw new TypeError('Single selection mode accepts at most one target.');
    const next = items.map(cloneSpatialDatumTarget);
    const keys = next.map(spatialSelectionKey);
    if (new Set(keys).size !== keys.length)
      throw new TypeError('Selection targets must be unique.');
    if (
      next.length === this.#selection.length &&
      next.every(
        (target, index) =>
          spatialSelectionKey(target) === spatialSelectionKey(this.#selection[index]!),
      )
    )
      return;
    this.#selection = next;
    this.render();
    this.#emitSelection('programmatic');
  }

  clearSelection(): void {
    this.#assertAlive();
    if (this.#selection.length === 0) return;
    this.#selection = [];
    this.render();
    this.#emitSelection('clear');
  }

  getAnnotations(): readonly SpatialAnnotationSpec[] {
    return this.#annotations.map(cloneSpatialAnnotation);
  }

  setAnnotations(annotations: readonly SpatialAnnotationSpec[]): void {
    this.#assertAlive();
    const resolved = annotations.map((annotation, index) => ({
      ...cloneSpatialAnnotation(annotation),
      id: annotation.id ?? `annotation-${index}`,
    }));
    assertValidSpatialSpec({ ...this.#spec, annotations: resolved });
    this.#annotations = resolved;
    this.render();
    this.#emitAnnotations('set');
  }

  addAnnotation(annotation: SpatialAnnotationSpec): string {
    this.#assertAlive();
    this.#annotationSequence += 1;
    const id = annotation.id ?? `annotation-runtime-${this.#annotationSequence}`;
    if (this.#annotations.some((candidate) => candidate.id === id))
      throw new TypeError(`Spatial annotation "${id}" already exists.`);
    const next = [...this.#annotations, { ...cloneSpatialAnnotation(annotation), id }];
    assertValidSpatialSpec({ ...this.#spec, annotations: next });
    this.#annotations = next;
    this.render();
    this.#emitAnnotations('add', id);
    return id;
  }

  updateAnnotation(id: string, patch: Partial<Omit<SpatialAnnotationSpec, 'id'>>): void {
    this.#assertAlive();
    const index = this.#annotations.findIndex((annotation) => annotation.id === id);
    if (index < 0) throw new TypeError(`Spatial annotation "${id}" was not found.`);
    const updated = cloneSpatialAnnotation({
      ...this.#annotations[index]!,
      ...patch,
      id,
    } as SpatialAnnotationSpec);
    const next = this.#annotations.map((annotation, candidate) =>
      candidate === index ? updated : annotation,
    );
    assertValidSpatialSpec({ ...this.#spec, annotations: next });
    this.#annotations = next;
    this.render();
    this.#emitAnnotations('update', id);
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

  getCamera(): SpatialCameraState {
    return { ...this.#camera, target: [...this.#camera.target] as [number, number, number] };
  }

  getAvailability(): SpatialAvailabilityState {
    return { ...this.#availability };
  }

  setCamera(camera: Readonly<Partial<SpatialCameraState>>): void {
    this.#assertAlive();
    this.#camera = resolveSpatialCameraPatch(
      this.#spec,
      this.#camera,
      camera,
      this.#scene.bounds.radius,
    );
    this.#renderer.setCamera(this.#camera);
    this.#emitCamera('spec');
    this.render();
  }

  orbitBy(deltaYaw: number, deltaPitch: number): void {
    this.#assertFiniteInteraction('orbit deltaYaw', deltaYaw);
    this.#assertFiniteInteraction('orbit deltaPitch', deltaPitch);
    if (this.#spec.interaction?.orbit === false) return;
    this.#camera = {
      ...this.#camera,
      yaw: this.#camera.yaw + deltaYaw,
      pitch: clamp(this.#camera.pitch + deltaPitch, -Math.PI * 0.49, Math.PI * 0.49),
    };
    this.#renderer.setCamera(this.#camera);
    this.#emitCamera('orbit');
    this.render();
  }

  panBy(deltaX: number, deltaY: number): void {
    this.#assertFiniteInteraction('pan deltaX', deltaX);
    this.#assertFiniteInteraction('pan deltaY', deltaY);
    if (this.#spec.interaction?.pan === false) return;
    const basis = cameraBasis(this.#camera);
    const scale = this.#camera.distance / Math.max(120, this.#plotViewport.height);
    const movement = add3(scale3(basis.right, -deltaX * scale), scale3(basis.up, deltaY * scale));
    this.#camera = { ...this.#camera, target: add3(this.#camera.target, movement) };
    this.#renderer.setCamera(this.#camera);
    this.#emitCamera('pan');
    this.render();
  }

  zoomBy(factor: number): void {
    this.#assertFiniteInteraction('zoom factor', factor);
    if (factor <= 0) throw new RangeError('Spatial zoom factor must be greater than zero.');
    if (this.#spec.interaction?.zoom === false) return;
    const minimum = Math.max(0.001, this.#scene.bounds.radius * 0.08);
    const maximum = Math.max(100, this.#scene.bounds.radius * 100);
    this.#camera = {
      ...this.#camera,
      distance: clamp(this.#camera.distance / factor, minimum, maximum),
    };
    this.#renderer.setCamera(this.#camera);
    this.#emitCamera('zoom');
    this.render();
  }

  resetCamera(): void {
    this.#camera = {
      ...this.#initialCamera,
      target: [...this.#initialCamera.target] as [number, number, number],
    };
    this.#renderer.setCamera(this.#camera);
    this.#emitCamera('reset');
    this.render();
  }

  setProjection(projection: SpatialProjection): void {
    if (projection !== 'perspective' && projection !== 'orthographic') return;
    this.#camera = { ...this.#camera, projection };
    this.#renderer.setCamera(this.#camera);
    this.#syncControls();
    this.#emitCamera('projection');
    this.render();
  }

  resize(width?: number, height?: number): void {
    this.#assertAlive();
    const fullscreen = document.fullscreenElement === this.#wrapper;
    const bounds = fullscreen
      ? this.#wrapper.getBoundingClientRect()
      : this.#target.getBoundingClientRect();
    const { width: resolvedWidth, height: resolvedHeight } = resolveSpatialSize({
      fullscreen,
      measuredWidth: bounds.width,
      measuredHeight: bounds.height,
      ...(width === undefined ? {} : { requestedWidth: width }),
      ...(height === undefined ? {} : { requestedHeight: height }),
      ...(this.#options.width === undefined ? {} : { configuredWidth: this.#options.width }),
      ...(this.#options.height === undefined ? {} : { configuredHeight: this.#options.height }),
    });
    this.#width = resolvedWidth;
    this.#height = resolvedHeight;
    this.#wrapper.style.height = `${resolvedHeight}px`;
    this.#resizeRendererViewport();
    this.#syncOverlays();
    this.#events.emit('resize', { chart: this, width: resolvedWidth, height: resolvedHeight });
  }

  render(): void {
    this.#assertAlive();
    this.#renderer.setCamera(this.#camera);
    this.#renderer.render();
    this.#syncAccessibilityDom();
    this.#syncOverlays();
    this.#events.emit('render', { chart: this, scene: this.#scene });
  }

  toDataURL(): string {
    this.#assertAlive();
    if (this.#renderer.available()) return this.#renderer.toDataURL();
    const fallback = document.createElement('canvas');
    fallback.width = Math.max(1, Math.round(this.#width));
    fallback.height = Math.max(1, Math.round(this.#height));
    const context = fallback.getContext('2d');
    if (context === null) return 'data:image/png;base64,';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, fallback.width, fallback.height);
    context.fillStyle = '#0f172a';
    context.font = '600 18px sans-serif';
    context.fillText(this.#spec.title ?? this.#chartLabel(), 24, 38);
    context.fillStyle = '#64748b';
    context.font = '14px sans-serif';
    context.fillText(this.#labels().unavailable, 24, 68, Math.max(20, fallback.width - 48));
    return fallback.toDataURL('image/png');
  }

  async toggleFullscreen(): Promise<boolean> {
    this.#assertAlive();
    if (document.fullscreenElement === this.#wrapper) {
      await document.exitFullscreen();
      return false;
    }
    if (this.#wrapper.requestFullscreen === undefined) return false;
    await this.#wrapper.requestFullscreen();
    return true;
  }

  on<K extends keyof SpatialChartEventMap>(
    type: K,
    listener: (event: SpatialChartEventMap[K]) => void,
  ): () => void {
    return this.#events.on(type, listener);
  }

  off<K extends keyof SpatialChartEventMap>(
    type: K,
    listener: (event: SpatialChartEventMap[K]) => void,
  ): void {
    this.#events.off(type, listener);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#setAvailability('destroyed');
    this.#resizeObserver?.disconnect();
    if (this.#windowResizeListener !== null)
      window.removeEventListener('resize', this.#windowResizeListener);
    document.removeEventListener('fullscreenchange', this.#fullscreenListener);
    this.#detachInteraction();
    this.#overlays.destroy();
    this.#renderer.destroy();
    this.#tooltip?.remove();
    this.#fallback?.remove();
    this.#accessibility?.remove();
    this.#wrapper.remove();
    this.#events.clear();
  }

  readonly #pointerDownListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    const surface = this.#renderer.surface();
    const point = eventPoint(event, surface);
    this.#activePointers.set(event.pointerId, point);
    this.#previousPointer = point;
    if (event.pointerType !== 'touch') this.#beginGesture(surface);
    if (this.#activePointers.size === 2) {
      this.#beginGesture(surface);
      const [left, right] = [...this.#activePointers.values()];
      if (left !== undefined && right !== undefined)
        this.#pinch = {
          distance: distance(left, right),
          center: center(left, right),
          camera: this.#camera,
        };
    }
  };

  readonly #pointerMoveListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    const surface = this.#renderer.surface();
    const point = eventPoint(event, surface);
    if (this.#activePointers.has(event.pointerId)) {
      this.#activePointers.set(event.pointerId, point);
      if (this.#activePointers.size >= 2 && this.#pinch !== null) {
        const [left, right] = [...this.#activePointers.values()];
        if (left !== undefined && right !== undefined) {
          const currentDistance = Math.max(1, distance(left, right));
          const currentCenter = center(left, right);
          this.#camera = this.#pinch.camera;
          this.zoomBy(currentDistance / Math.max(1, this.#pinch.distance));
          this.#camera = { ...this.#camera, distance: this.#camera.distance };
          this.panBy(
            currentCenter.x - this.#pinch.center.x,
            currentCenter.y - this.#pinch.center.y,
          );
        }
        event.preventDefault();
        return;
      }
      if (this.#previousPointer !== null) {
        const deltaX = point.x - this.#previousPointer.x;
        const deltaY = point.y - this.#previousPointer.y;
        if (!this.#gestureActive && event.pointerType === 'touch') {
          if (Math.hypot(deltaX, deltaY) < 5) return;
          if (Math.abs(deltaY) >= Math.abs(deltaX)) return;
          this.#beginGesture(surface);
        }
        const panMode =
          this.#mode === 'pan' || event.shiftKey || event.button === 2 || event.buttons === 2;
        if (panMode) this.panBy(deltaX, deltaY);
        else this.orbitBy(-deltaX * 0.008, -deltaY * 0.008);
      }
      this.#previousPointer = point;
      event.preventDefault();
      return;
    }
    if (this.#spec.interaction?.picking === false) return;
    const hit = this.#renderer.hitTest(point.x, point.y);
    this.#showTooltip(hit, event);
    this.#events.emit('hover', { chart: this, hit, sourceEvent: event });
  };

  readonly #pointerEndListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    this.#activePointers.delete(event.pointerId);
    this.#pinch = null;
    this.#previousPointer = this.#activePointers.values().next().value ?? null;
    if (this.#activePointers.size === 0) this.#endGesture();
  };

  readonly #pointerLeaveListener = (event: Event): void => {
    if (!(event instanceof PointerEvent) || this.#activePointers.size > 0) return;
    this.#hideTooltip();
    this.#events.emit('hover', { chart: this, hit: null, sourceEvent: event });
  };

  readonly #clickListener = (event: Event): void => {
    if (!(event instanceof PointerEvent) || this.#spec.interaction?.picking === false) return;
    const point = eventPoint(event, this.#renderer.surface());
    const hit = this.#renderer.hitTest(point.x, point.y);
    this.#applyClickSelection(hit);
    this.#events.emit('click', { chart: this, hit, sourceEvent: event });
  };

  readonly #wheelListener = (event: Event): void => {
    if (!(event instanceof WheelEvent) || this.#spec.interaction?.zoom === false) return;
    const wheel = this.#spec.interaction?.wheel ?? 'modifier';
    if (wheel === 'off' || (wheel === 'modifier' && !event.ctrlKey && !event.metaKey)) return;
    this.zoomBy(Math.exp(-event.deltaY * 0.0012));
    event.preventDefault();
  };

  readonly #contextMenuListener = (event: Event): void => event.preventDefault();

  readonly #keyDownListener = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    const selection = this.#selectionConfig();
    if (
      event.key === 'Escape' &&
      selection !== false &&
      selection.clearOnEscape &&
      this.#selection.length > 0
    ) {
      this.clearSelection();
      event.preventDefault();
      return;
    }
    const pan = event.shiftKey || this.#mode === 'pan';
    let handled = true;
    const navigationAllowed = pan
      ? this.#spec.interaction?.pan !== false
      : this.#spec.interaction?.orbit !== false;
    if (event.key === 'ArrowLeft' && navigationAllowed)
      pan ? this.panBy(-12, 0) : this.orbitBy(0.08, 0);
    else if (event.key === 'ArrowRight' && navigationAllowed)
      pan ? this.panBy(12, 0) : this.orbitBy(-0.08, 0);
    else if (event.key === 'ArrowUp' && navigationAllowed)
      pan ? this.panBy(0, -12) : this.orbitBy(0, 0.08);
    else if (event.key === 'ArrowDown' && navigationAllowed)
      pan ? this.panBy(0, 12) : this.orbitBy(0, -0.08);
    else if ((event.key === '+' || event.key === '=') && this.#spec.interaction?.zoom !== false)
      this.zoomBy(1.16);
    else if ((event.key === '-' || event.key === '_') && this.#spec.interaction?.zoom !== false)
      this.zoomBy(1 / 1.16);
    else if (event.key === '0' || event.key === 'Home') this.resetCamera();
    else handled = false;
    if (handled) event.preventDefault();
  };

  readonly #fullscreenListener = (): void => {
    const active = document.fullscreenElement === this.#wrapper;
    this.#wrapper.style.width = active ? '100vw' : '100%';
    this.#wrapper.style.height = active
      ? '100vh'
      : this.#options.height === undefined
        ? '100%'
        : `${Math.max(1, this.#options.height)}px`;
    this.#wrapper.style.minHeight = active
      ? '0'
      : this.#options.height === undefined
        ? '280px'
        : '0';
    this.resize();
    this.#events.emit('fullscreenchange', { chart: this, active });
  };

  #selectionConfig():
    | false
    | Readonly<{
        mode: 'single' | 'multiple';
        toggle: boolean;
        key?: string;
        clearOnBackground: boolean;
        clearOnEscape: boolean;
        ariaLabel: string;
        highlight: HighlightStyleSpec;
      }> {
    const input = this.#spec.interaction?.selection;
    if (input === undefined || input === false) return false;
    const value = typeof input === 'object' ? input : {};
    return {
      mode: value.mode ?? 'single',
      toggle: value.toggle ?? true,
      ...(value.key === undefined ? {} : { key: value.key }),
      clearOnBackground: value.clearOnBackground ?? true,
      clearOnEscape: value.clearOnEscape ?? true,
      ariaLabel: value.ariaLabel ?? 'Spatial chart selection',
      highlight: { ...value.highlight },
    };
  }

  #legendOverlayState(): SpatialLegendOverlayState | null {
    const input = this.#spec.legend;
    if (input === undefined || input === false) return null;
    const legend = typeof input === 'object' ? input : {};
    if (legend.visible === false) return null;
    const selectedLayer =
      this.#spec.layers.find((layer) => layer.id === legend.layerId) ?? this.#spec.layers[0];
    const autoMode =
      this.#spec.layers.length === 1 &&
      (selectedLayer?.mark.type === 'surface' || selectedLayer?.mark.type === 'volume')
        ? 'continuous'
        : 'layers';
    const mode = legend.mode === undefined || legend.mode === 'auto' ? autoMode : legend.mode;
    let items: SpatialLegendOverlayState['items'];
    if (legend.items !== undefined && legend.items.length > 0) {
      const configuredItems = legend.items.slice(0, legend.maxItems ?? 24);
      items = configuredItems.map((item, index) => {
        const id = item.id ?? `item-${index}`;
        const owner = this.#spec.layers.find((layer) => layer.id === item.layerId);
        return {
          id,
          label: item.label,
          color: item.color ?? (owner === undefined ? '#4f46e5' : layerColor(owner)),
          visible: !this.#hiddenLegendItems.has(id),
          toggleable:
            (legend.interactive ?? false) && mode === 'layers' && item.layerId !== undefined,
          symbol:
            item.symbol === undefined || item.symbol === 'auto'
              ? layerLegendSymbol(owner)
              : item.symbol,
          ...(item.layerId === undefined ? {} : { layerId: item.layerId }),
          ...(item.value === undefined ? {} : { value: item.value }),
        };
      });
    } else if (mode === 'continuous' && selectedLayer !== undefined) {
      let values: readonly number[] = [];
      let configuredColors: readonly Parameters<typeof spatialColor>[0][] | undefined;
      const selectedData = selectedLayer.data;
      const selectedLayerId =
        selectedLayer.id ?? `spatial-layer-${this.#spec.layers.indexOf(selectedLayer)}`;
      const inferredField =
        legend.field ??
        (selectedLayer.mark.type === 'vector' && selectedLayer.mark.mode !== 'streamtube'
          ? 'magnitude'
          : selectedLayer.mark.type === 'surface' &&
              selectedData !== undefined &&
              'positions' in selectedData
            ? 'y'
            : 'value');
      const compiledValues = this.#scene.geometries
        .flatMap((geometry) => geometry.picks)
        .filter((pick) => pick.layerId === selectedLayerId)
        .map((pick) => pick.datum[inferredField])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      if (legend.field !== undefined) {
        values = compiledValues;
      } else if (
        selectedLayer.mark.type === 'vector' &&
        selectedData !== undefined &&
        'vectors' in selectedData
      ) {
        values = selectedData.vectors.map((vector) => Math.hypot(...vector));
        configuredColors = selectedData.colors;
      } else if (selectedLayer.mark.type === 'volume')
        values = (selectedLayer.data as SpatialVolumeData).values;
      else if (selectedLayer.mark.type === 'surface') {
        if (selectedData !== undefined && 'positions' in selectedData) {
          values = selectedData.positions.map((position) => position[1]);
          configuredColors = selectedData.colors;
        } else {
          const data = selectedLayer.data as SpatialSurfaceGridData;
          values = data.values ?? data.z ?? [];
        }
      } else if (selectedLayer.mark.type === 'scatter') {
        const data = selectedLayer.data as SpatialScatterData;
        values = data.values ?? [];
        configuredColors = data.colors;
      }
      if (values.length === 0) values = compiledValues;
      const finite = values.filter(Number.isFinite);
      const minimum = finite.length === 0 ? 0 : Math.min(...finite);
      const maximum = finite.length === 0 ? 1 : Math.max(...finite);
      const minimumIndex = values.findIndex((value) => value === minimum);
      const maximumIndex = values.findIndex((value) => value === maximum);
      const lowColor =
        minimumIndex >= 0 && configuredColors?.[minimumIndex] !== undefined
          ? colorCss(configuredColors[minimumIndex])
          : layerColor(selectedLayer, 'low');
      const highColor =
        maximumIndex >= 0 && configuredColors?.[maximumIndex] !== undefined
          ? colorCss(configuredColors[maximumIndex])
          : layerColor(selectedLayer, 'high');
      let formatter: Intl.NumberFormat;
      try {
        formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 });
      } catch {
        formatter = new Intl.NumberFormat();
      }
      items = [
        {
          id: 'continuous-min',
          label: formatter.format(minimum),
          color: lowColor,
          visible: true,
          toggleable: false,
          symbol: 'rect',
          layerId: selectedLayer.id ?? 'spatial-layer-0',
          value: minimum,
        },
        {
          id: 'continuous-max',
          label: formatter.format(maximum),
          color: highColor,
          visible: true,
          toggleable: false,
          symbol: 'rect',
          layerId: selectedLayer.id ?? 'spatial-layer-0',
          value: maximum,
        },
      ];
    } else {
      items = this.#spec.layers.slice(0, legend.maxItems ?? 24).map((layer, index) => {
        const layerId = layer.id ?? `spatial-layer-${index}`;
        const id = `layer-${safeId(layerId)}-${index}`;
        return {
          id,
          label: layer.name ?? layer.id ?? `Series ${index + 1}`,
          color: layerColor(layer),
          visible: !this.#hiddenLegendItems.has(id),
          toggleable: (legend.interactive ?? false) && mode === 'layers',
          symbol: layerLegendSymbol(layer),
          layerId,
        };
      });
    }
    const position = legend.position ?? 'right';
    return {
      visible: true,
      ...(legend.title === undefined ? {} : { title: legend.title }),
      position,
      orientation:
        legend.orientation === undefined || legend.orientation === 'auto'
          ? position === 'top' || position === 'bottom'
            ? 'horizontal'
            : 'vertical'
          : legend.orientation,
      mode,
      showLabel: legend.labels?.show ?? 'Show',
      hideLabel: legend.labels?.hide ?? 'Hide',
      items,
    };
  }

  #hiddenLayerIds(): ReadonlySet<string> {
    const hidden = new Set<string>();
    for (const item of this.#legendOverlayState()?.items ?? []) {
      if (!item.visible && item.layerId !== undefined) hidden.add(item.layerId);
    }
    return hidden;
  }

  #installEffectiveScene(): void {
    const hidden = this.#hiddenLayerIds();
    if (hidden.size === 0) {
      this.#renderer.setScene(this.#scene);
      return;
    }
    this.#renderer.setScene({
      ...this.#scene,
      geometries: this.#scene.geometries.map((geometry) => {
        const layerId = geometry.picks[0]?.layerId;
        const hiddenGeometry =
          (layerId !== undefined && hidden.has(layerId)) ||
          [...hidden].some(
            (candidate) => geometry.id === candidate || geometry.id.startsWith(`${candidate}:`),
          );
        if (!hiddenGeometry) return geometry;
        const colors = new Float32Array(geometry.colors);
        for (let index = 3; index < colors.length; index += 4) colors[index] = 0;
        return { ...geometry, colors };
      }),
    });
  }

  #setLegendItemVisible(id: string, visible: boolean, reason: SpatialLegendChangeReason): void {
    this.#assertAlive();
    const item = this.getLegendState().items.find((candidate) => candidate.id === id);
    if (item === undefined) throw new TypeError(`Spatial legend item "${id}" was not found.`);
    if (!item.toggleable) throw new TypeError(`Spatial legend item "${id}" is not toggleable.`);
    if (item.visible === visible) return;
    if (visible) this.#hiddenLegendItems.delete(id);
    else this.#hiddenLegendItems.add(id);
    this.#installEffectiveScene();
    this.render();
    this.#events.emit('legendchange', {
      chart: this,
      state: this.getLegendState(),
      reason,
    });
  }

  #applyClickSelection(hit: SpatialHitResult | null): void {
    const selection = this.#selectionConfig();
    if (selection === false) return;
    if (hit === null) {
      if (selection.clearOnBackground && this.#selection.length > 0) {
        this.#selection = [];
        this.render();
        this.#emitSelection('click');
      }
      return;
    }
    const keyValue = selection.key === undefined ? undefined : hit.datum[selection.key];
    const portable =
      keyValue === null ||
      typeof keyValue === 'string' ||
      typeof keyValue === 'boolean' ||
      (typeof keyValue === 'number' && Number.isFinite(keyValue))
        ? keyValue
        : undefined;
    const target: SpatialDatumTargetSpec =
      selection.key !== undefined && portable !== undefined
        ? {
            type: 'datum',
            layerId: hit.layerId,
            field: selection.key,
            value: portable,
          }
        : { type: 'datum', layerId: hit.layerId, datumIndex: hit.datumIndex };
    const key = spatialSelectionKey(target);
    const existing = this.#selection.findIndex(
      (candidate) => spatialSelectionKey(candidate) === key,
    );
    const before = this.#selection.map(spatialSelectionKey).join('|');
    if (selection.mode === 'single') {
      this.#selection = existing >= 0 && selection.toggle ? [] : [target];
    } else if (existing >= 0 && selection.toggle) {
      this.#selection = this.#selection.filter((_, index) => index !== existing);
    } else if (existing < 0) {
      this.#selection = [...this.#selection, target];
    }
    if (before === this.#selection.map(spatialSelectionKey).join('|')) return;
    this.render();
    this.#emitSelection('click');
  }

  #emitSelection(reason: SpatialSelectionChangeReason): void {
    this.#events.emit('selectionchange', {
      chart: this,
      state: this.getSelection(),
      reason,
    });
  }

  #emitAnnotations(reason: SpatialAnnotationChangeReason, id?: string): void {
    this.#events.emit('annotationchange', {
      chart: this,
      annotations: this.getAnnotations(),
      reason,
      ...(id === undefined ? {} : { id }),
    });
  }

  #syncOverlays(): void {
    const selection = this.#selectionConfig();
    this.#overlays.sync(
      this.#wrapper,
      {
        scene: this.#scene,
        width: this.#width,
        height: this.#height,
        plotBounds: this.#plotViewport,
        hiddenLayerIds: this.#hiddenLayerIds(),
        legend: this.#legendOverlayState(),
        highlights: this.#spec.highlights ?? [],
        selection: selection === false ? [] : this.#selection,
        selectionEnabled: selection !== false,
        selectionHighlight: selection === false ? {} : selection.highlight,
        annotations: this.#annotations,
        selectionLabel: selection === false ? 'Spatial chart selection' : selection.ariaLabel,
      },
      {
        project: (position, pick) => {
          if (pick !== undefined && !isGlobePickFrontFacing(pick, this.#camera)) return null;
          const projected = this.#renderer.project(position);
          if (projected === null) return null;
          return {
            ...projected,
            x: projected.x + this.#plotViewport.x,
            y: projected.y + this.#plotViewport.y,
          };
        },
        setLegendVisible: (id, visible) => this.#setLegendItemVisible(id, visible, 'toggle'),
      },
    );
  }

  #attachInteraction(): void {
    const surface = this.#renderer.surface();
    surface.addEventListener('pointerdown', this.#pointerDownListener);
    surface.addEventListener('pointermove', this.#pointerMoveListener);
    surface.addEventListener('pointerup', this.#pointerEndListener);
    surface.addEventListener('pointercancel', this.#pointerEndListener);
    surface.addEventListener('pointerleave', this.#pointerLeaveListener);
    surface.addEventListener('click', this.#clickListener);
    surface.addEventListener('wheel', this.#wheelListener, { passive: false });
    surface.addEventListener('contextmenu', this.#contextMenuListener);
    surface.addEventListener('keydown', this.#keyDownListener);
    document.addEventListener('fullscreenchange', this.#fullscreenListener);
  }

  #detachInteraction(): void {
    const surface = this.#renderer.surface();
    surface.removeEventListener('pointerdown', this.#pointerDownListener);
    surface.removeEventListener('pointermove', this.#pointerMoveListener);
    surface.removeEventListener('pointerup', this.#pointerEndListener);
    surface.removeEventListener('pointercancel', this.#pointerEndListener);
    surface.removeEventListener('pointerleave', this.#pointerLeaveListener);
    surface.removeEventListener('click', this.#clickListener);
    surface.removeEventListener('wheel', this.#wheelListener);
    surface.removeEventListener('contextmenu', this.#contextMenuListener);
    surface.removeEventListener('keydown', this.#keyDownListener);
  }

  #beginGesture(surface: HTMLCanvasElement): void {
    this.#gestureActive = true;
    surface.style.touchAction = 'none';
    for (const pointerId of this.#activePointers.keys()) {
      try {
        surface.setPointerCapture?.(pointerId);
      } catch {
        // A browser may already have handed a vertical touch to page scrolling.
      }
    }
  }

  #endGesture(): void {
    this.#gestureActive = false;
    this.#renderer.surface().style.touchAction = 'pan-y';
  }

  #configureResize(): void {
    this.#windowResizeListener = () => {
      const fullscreen = document.fullscreenElement === this.#wrapper;
      const embeddedFallback =
        typeof ResizeObserver === 'undefined' &&
        this.#options.autoResize !== false &&
        this.#options.width === undefined;
      if (fullscreen || embeddedFallback) this.resize();
    };
    window.addEventListener('resize', this.#windowResizeListener);
    if (this.#options.autoResize === false || this.#options.width !== undefined) return;
    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(() => this.resize());
      this.#resizeObserver.observe(this.#target);
      return;
    }
  }

  #cameraForScene(scene: CompiledSpatialScene): SpatialCameraState {
    const input = scene.spec.camera ?? {};
    return normalizedCamera(
      input.projection ?? 'perspective',
      input.target ?? scene.bounds.center,
      scene.bounds.radius,
      {
        ...(input.projection === undefined ? {} : { projection: input.projection }),
        ...(input.target === undefined ? {} : { target: input.target }),
        ...(input.yaw === undefined ? {} : { yaw: input.yaw }),
        ...(input.pitch === undefined ? {} : { pitch: input.pitch }),
        ...(input.distance === undefined ? {} : { distance: input.distance }),
        ...(input.fov === undefined ? {} : { fov: input.fov }),
        ...(input.near === undefined ? {} : { near: input.near }),
        ...(input.far === undefined ? {} : { far: input.far }),
      },
    );
  }

  #syncAccessibilityDom(): void {
    const labels = this.#labels();
    const surface = this.#renderer.surface();
    const annotationDescription = this.#annotations
      .map((annotation) =>
        annotation.detail === undefined
          ? annotation.text
          : `${annotation.text}: ${annotation.detail}`,
      )
      .join('. ');
    const legend = this.#legendOverlayState();
    const legendDescription =
      legend === null
        ? ''
        : `${legend.title ?? 'Legend'}: ${legend.items
            .slice(0, 12)
            .map((item) => item.label)
            .join(', ')}`;
    const authoredDescription = [
      this.#spec.accessibility?.description,
      annotationDescription,
      legendDescription,
    ]
      .filter(Boolean)
      .join('. ');
    const description = spatialAccessibleDescription(
      authoredDescription === '' ? undefined : authoredDescription,
      labels.instructions,
    );
    surface.setAttribute('aria-label', this.#chartLabel(labels));
    surface.setAttribute('aria-description', description);
    if (this.#instructions === null) {
      this.#instructions = document.createElement('p');
      this.#instructions.id = `graflume-spatial-instructions-${Math.random().toString(36).slice(2)}`;
      this.#instructions.style.position = 'absolute';
      this.#instructions.style.width = '1px';
      this.#instructions.style.height = '1px';
      this.#instructions.style.overflow = 'hidden';
      this.#instructions.style.clipPath = 'inset(50%)';
      this.#wrapper.append(this.#instructions);
    }
    this.#instructions.textContent = description;
    surface.setAttribute('aria-describedby', this.#instructions.id);
  }

  #installScopedStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
[data-graflume-spatial="true"] canvas:focus-visible,
[data-graflume-spatial="true"] [data-graflume-spatial-control]:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
[data-graflume-spatial="true"] [data-graflume-spatial-controls="true"] {
  max-inline-size: calc(100% - 12px);
  overflow-x: auto;
  scrollbar-width: thin;
}
@media (pointer: coarse), (max-width: 560px) {
  [data-graflume-spatial="true"] [data-graflume-spatial-control] {
    inline-size: 44px !important;
    block-size: 44px !important;
    min-inline-size: 44px;
  }
}`;
    this.#wrapper.append(style);
  }

  #createControls(): void {
    const labels = this.#labels();
    const toolbar = document.createElement('div');
    toolbar.dataset.graflumeSpatialControls = 'true';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', labels.toolbar);
    toolbar.style.position = 'absolute';
    toolbar.style.insetBlockStart = '6px';
    toolbar.style.insetInlineEnd = '6px';
    toolbar.style.zIndex = '4';
    toolbar.style.display = 'flex';
    toolbar.style.gap = '1px';
    toolbar.style.padding = '1px';
    toolbar.style.border = '1px solid rgba(148, 163, 184, 0.55)';
    toolbar.style.borderRadius = '6px';
    toolbar.style.background = 'rgba(255, 255, 255, 0.82)';
    toolbar.style.backdropFilter = 'blur(5px)';
    toolbar.style.direction = 'ltr';
    const definitions = [
      [
        'orbit',
        labels.orbit,
        icon(['M5 7c3-4 11-4 14 0', 'M19 17c-3 4-11 4-14 0', 'M18 3l1 4-4-1', 'M6 21l-1-4 4 1']),
      ],
      [
        'pan',
        labels.pan,
        icon([
          'M12 3v18M3 12h18M12 3l-3 3m3-3 3 3M3 12l3-3m-3 3 3 3m15-3-3-3m3 3-3 3m-6 6-3-3m3 3 3-3',
        ]),
      ],
      ['zoom-in', labels.zoomIn, icon(['M8 11h6M11 8v6M16 16l4 4'], [[11, 11, 6]])],
      ['zoom-out', labels.zoomOut, icon(['M8 11h6M16 16l4 4'], [[11, 11, 6]])],
      ['reset', labels.reset, icon(['M4 10a8 8 0 1 1 2 8', 'M4 4v6h6'])],
      [
        'projection',
        labels.projection,
        icon(['M12 3l8 4-8 4-8-4 8-4', 'M4 7v9l8 5 8-5V7', 'M12 11v10']),
      ],
      ['fullscreen', labels.fullscreen, icon(['M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5'])],
      ['png', labels.exportPng, icon(['M4 5h4l2-2h4l2 2h4v15H4V5'], [[12, 12, 4]])],
    ] as const;
    for (const [id, label, graphic] of definitions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.graflumeSpatialControl = id;
      button.title = label;
      button.setAttribute('aria-label', label);
      button.style.boxSizing = 'border-box';
      button.style.width = '28px';
      button.style.height = '28px';
      button.style.display = 'grid';
      button.style.placeItems = 'center';
      button.style.padding = '0';
      button.style.border = '0';
      button.style.borderRadius = '4px';
      button.style.color = '#1e293b';
      button.style.background = 'transparent';
      button.style.cursor = 'pointer';
      button.append(graphic);
      button.addEventListener('click', () => this.#activateControl(id));
      toolbar.append(button);
      this.#controlButtons.set(id, button);
    }
    this.#wrapper.append(toolbar);
    this.#controls = toolbar;
    this.#syncControlLayout();
    this.#syncControls();
  }

  #resizeRendererViewport(): void {
    this.#plotViewport = spatialPlotViewport(this.#spec, this.#width, this.#height);
    const surface = this.#renderer.surface();
    surface.style.position = 'absolute';
    surface.style.left = `${this.#plotViewport.x}px`;
    surface.style.top = `${this.#plotViewport.y}px`;
    const ratio = this.#options.pixelRatio ?? window.devicePixelRatio ?? 1;
    this.#renderer.resize(this.#plotViewport.width, this.#plotViewport.height, ratio);
    this.#syncControlLayout();
  }

  #syncControlLayout(): void {
    if (this.#controls === null) return;
    this.#controls.style.insetBlockStart = 'auto';
    this.#controls.style.insetInlineEnd = 'auto';
    this.#controls.style.top = `${this.#plotViewport.y + 6}px`;
    this.#controls.style.right = `${Math.max(
      6,
      this.#width - this.#plotViewport.x - this.#plotViewport.width + 6,
    )}px`;
  }

  #syncControlStructure(): void {
    const controlsEnabled = this.#spec.interaction?.controls !== false;
    if (!controlsEnabled) {
      this.#controls?.remove();
      this.#controls = null;
      this.#controlButtons.clear();
      return;
    }
    if (this.#controls === null) this.#createControls();
    const labels = this.#labels();
    this.#controls?.setAttribute('aria-label', labels.toolbar);
    const byId: Readonly<Record<string, string>> = {
      orbit: labels.orbit,
      pan: labels.pan,
      'zoom-in': labels.zoomIn,
      'zoom-out': labels.zoomOut,
      reset: labels.reset,
      projection: labels.projection,
      fullscreen: labels.fullscreen,
      png: labels.exportPng,
    };
    for (const [id, button] of this.#controlButtons) {
      const label = byId[id];
      if (label !== undefined) {
        button.title = label;
        button.setAttribute('aria-label', label);
      }
      button.disabled =
        (id === 'orbit' && this.#spec.interaction?.orbit === false) ||
        (id === 'pan' && this.#spec.interaction?.pan === false) ||
        ((id === 'zoom-in' || id === 'zoom-out') && this.#spec.interaction?.zoom === false);
    }
    if (this.#mode === 'orbit' && this.#spec.interaction?.orbit === false) this.#mode = 'pan';
    if (this.#mode === 'pan' && this.#spec.interaction?.pan === false) this.#mode = 'orbit';
    this.#syncControls();
  }

  #activateControl(id: string): void {
    if (id === 'orbit' || id === 'pan') this.#mode = id;
    else if (id === 'zoom-in') this.zoomBy(1.2);
    else if (id === 'zoom-out') this.zoomBy(1 / 1.2);
    else if (id === 'reset') this.resetCamera();
    else if (id === 'projection')
      this.setProjection(
        this.#camera.projection === 'perspective' ? 'orthographic' : 'perspective',
      );
    else if (id === 'fullscreen') void this.toggleFullscreen();
    else if (id === 'png') this.#downloadPng();
    this.#syncControls();
  }

  #syncControls(): void {
    for (const mode of ['orbit', 'pan'] as const) {
      const button = this.#controlButtons.get(mode);
      button?.setAttribute('aria-pressed', String(this.#mode === mode));
      if (button !== undefined)
        button.style.background = this.#mode === mode ? '#e0e7ff' : 'transparent';
    }
    this.#controlButtons
      .get('projection')
      ?.setAttribute('aria-pressed', String(this.#camera.projection === 'orthographic'));
  }

  #downloadPng(): void {
    const anchor = document.createElement('a');
    anchor.download = 'graflume-spatial.png';
    anchor.href = this.toDataURL();
    anchor.click();
  }

  #showTooltip(hit: SpatialHitResult | null, event: PointerEvent): void {
    if (hit === null || this.#spec.interaction?.tooltip === false) {
      this.#hideTooltip();
      return;
    }
    if (this.#tooltip === null) {
      this.#tooltip = document.createElement('div');
      this.#tooltip.dataset.graflumeSpatialTooltip = 'true';
      this.#tooltip.setAttribute('role', 'tooltip');
      this.#tooltip.style.position = 'absolute';
      this.#tooltip.style.zIndex = '5';
      this.#tooltip.style.pointerEvents = 'none';
      this.#tooltip.style.maxWidth = '260px';
      this.#tooltip.style.padding = '8px 10px';
      this.#tooltip.style.border = '1px solid rgba(148, 163, 184, 0.6)';
      this.#tooltip.style.borderRadius = '7px';
      this.#tooltip.style.background = 'rgba(15, 23, 42, 0.94)';
      this.#tooltip.style.color = '#f8fafc';
      this.#tooltip.style.font = '12px/1.45 ui-sans-serif, system-ui, sans-serif';
      this.#wrapper.append(this.#tooltip);
    }
    this.#tooltip.replaceChildren();
    const configured =
      typeof this.#spec.interaction?.tooltip === 'object' ? this.#spec.interaction.tooltip : {};
    const heading = document.createElement('strong');
    heading.textContent =
      configured.title ?? safeText(hit.datum.label ?? this.#spec.title ?? hit.layerId, 90);
    heading.style.display = 'block';
    heading.style.marginBlockEnd = '4px';
    this.#tooltip.append(heading);
    for (const [field, value] of scalarEntries(hit.datum, configured.fields)) {
      const row = document.createElement('div');
      row.textContent = `${field}: ${value}`;
      this.#tooltip.append(row);
    }
    const bounds = this.#wrapper.getBoundingClientRect();
    const left = clamp(event.clientX - bounds.left + 12, 4, Math.max(4, this.#width - 264));
    const top = clamp(event.clientY - bounds.top + 12, 4, Math.max(4, this.#height - 120));
    this.#tooltip.style.left = `${left}px`;
    this.#tooltip.style.top = `${top}px`;
    this.#tooltip.hidden = false;
  }

  #hideTooltip(): void {
    if (this.#tooltip !== null) this.#tooltip.hidden = true;
  }

  #showFallback(status: 'context-lost' | 'unavailable'): void {
    if (this.#fallback === null) {
      this.#fallback = document.createElement('div');
      this.#fallback.dataset.graflumeSpatialFallback = 'true';
      this.#fallback.setAttribute('role', 'status');
      this.#fallback.style.position = 'absolute';
      this.#fallback.style.inset = '0';
      this.#fallback.style.display = 'grid';
      this.#fallback.style.placeItems = 'center';
      this.#fallback.style.padding = '24px';
      this.#fallback.style.textAlign = 'center';
      this.#fallback.style.color = '#475569';
      this.#fallback.style.background = '#f8fafc';
      this.#fallback.style.font = '14px/1.5 ui-sans-serif, system-ui, sans-serif';
      this.#wrapper.append(this.#fallback);
    }
    const labels = this.#labels();
    const message = status === 'context-lost' ? labels.contextLost : labels.unavailable;
    this.#fallback.textContent = message;
    this.#fallback.style.display = 'grid';
    this.#fallback.hidden = false;
    this.#setAvailability(status, message);
  }

  #hideFallback(): void {
    if (this.#fallback !== null) {
      this.#fallback.hidden = true;
      this.#fallback.style.display = 'none';
    }
  }

  #renderAccessibilityTable(): void {
    this.#accessibility?.remove();
    if (this.#spec.accessibility?.table === false) return;
    const host = document.createElement('div');
    host.dataset.graflumeSpatialData = 'true';
    host.style.position = 'absolute';
    host.style.width = '1px';
    host.style.height = '1px';
    host.style.overflow = 'hidden';
    host.style.clipPath = 'inset(50%)';
    const table = document.createElement('table');
    const caption = document.createElement('caption');
    caption.textContent =
      this.#spec.accessibility?.description ?? this.#spec.title ?? this.#chartLabel(this.#labels());
    table.append(caption);
    const picks = collectAccessibleSpatialPicks(
      this.#scene.geometries,
      this.#spec.accessibility?.maxRows ?? 100,
    );
    const fields = [
      ...new Set(picks.flatMap(({ datum }) => scalarEntries(datum).map(([field]) => field))),
    ].slice(0, 8);
    if (fields.length > 0) {
      const head = document.createElement('thead');
      const headRow = document.createElement('tr');
      for (const field of fields) {
        const cell = document.createElement('th');
        cell.scope = 'col';
        cell.textContent = field;
        headRow.append(cell);
      }
      head.append(headRow);
      table.append(head);
      const body = document.createElement('tbody');
      for (const pick of picks) {
        const row = document.createElement('tr');
        for (const field of fields) {
          const cell = document.createElement('td');
          cell.textContent = safeText(pick.datum[field]);
          row.append(cell);
        }
        body.append(row);
      }
      table.append(body);
    }
    host.append(table);
    this.#wrapper.append(host);
    this.#accessibility = host;
  }

  #emitCamera(reason: SpatialCameraChangeReason): void {
    this.#events.emit('camerachange', { chart: this, camera: this.getCamera(), reason });
  }

  #labels(): ResolvedSpatialLabels {
    return { ...defaultLabels, ...this.#spec.interaction?.labels };
  }

  #chartLabel(labels = this.#labels()): string {
    return this.#spec.ariaLabel ?? this.#spec.title ?? labels.chart;
  }

  #syncAvailabilityCopy(): void {
    if (this.#availability.status === 'context-lost') this.#showFallback('context-lost');
    else if (this.#availability.status === 'unavailable') this.#showFallback('unavailable');
  }

  #setAvailability(status: SpatialAvailabilityStatus, message?: string): void {
    const previous = this.#availability;
    const next: SpatialAvailabilityState = {
      status,
      available: status === 'ready',
      ...(message === undefined ? {} : { message }),
    };
    if (
      previous.status === next.status &&
      previous.available === next.available &&
      previous.message === next.message
    )
      return;
    this.#availability = next;
    this.#events.emit('availabilitychange', {
      chart: this,
      state: this.getAvailability(),
      previous: { ...previous },
    });
  }

  #assertAlive(): void {
    if (this.#destroyed) throw new Error('Spatial chart has been destroyed.');
  }

  #assertFiniteInteraction(label: string, value: number): void {
    assertFiniteSpatialNumber(label, value);
  }
}
