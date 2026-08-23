import { EventEmitter } from '../core/events.js';
import { collectAccessibleSpatialPicks, spatialAccessibleDescription } from './accessibility.js';
import { compileSpatial } from './compile.js';
import { resolveSpatialSize } from './layout.js';
import { add3, cameraBasis, clamp, normalizedCamera, scale3 } from './math.js';
import { assertFiniteSpatialNumber, resolveSpatialCameraPatch } from './programmatic.js';
import type {
  CompiledSpatialScene,
  SpatialCameraState,
  SpatialChartSpec,
  SpatialCreateOptions,
  SpatialHitResult,
  SpatialProjection,
} from './types.js';
import { SpatialWebGLRenderer } from './webgl-renderer.js';

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

export interface SpatialErrorEvent {
  readonly chart: SpatialChart;
  readonly error: unknown;
}

export interface SpatialChartEventMap {
  readonly render: SpatialRenderEvent;
  readonly hover: SpatialPointerEvent;
  readonly click: SpatialPointerEvent;
  readonly resize: SpatialResizeEvent;
  readonly camerachange: SpatialCameraChangeEvent;
  readonly fullscreenchange: SpatialFullscreenChangeEvent;
  readonly contextloss: Readonly<{ chart: SpatialChart }>;
  readonly contextrestore: Readonly<{ chart: SpatialChart }>;
  readonly error: SpatialErrorEvent;
}

interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

interface PinchState {
  readonly distance: number;
  readonly center: PointerPosition;
  readonly camera: SpatialCameraState;
}

const defaultLabels = {
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

export class SpatialChart {
  readonly #target: HTMLElement;
  readonly #wrapper: HTMLDivElement;
  readonly #renderer: SpatialWebGLRenderer;
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
  #available = false;
  #width = 1;
  #height = 1;
  #gestureActive = false;

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
    this.#installScopedStyles();
    this.#target.append(this.#wrapper);
    this.#renderer = new SpatialWebGLRenderer({
      contextLost: () => {
        this.#showFallback('The 3D rendering context was lost. Restoring…');
        this.#events.emit('contextloss', { chart: this });
      },
      contextRestored: () => {
        this.#hideFallback();
        this.#events.emit('contextrestore', { chart: this });
        this.render();
      },
      unavailable: (message) => this.#showFallback(message),
      error: (error) => this.#events.emit('error', { chart: this, error }),
    });
    const labels = { ...defaultLabels, ...spec.interaction?.labels };
    const accessibleDescription = spatialAccessibleDescription(
      spec.accessibility?.description,
      labels.instructions,
    );
    this.#available = this.#renderer.mount(
      this.#wrapper,
      spec.ariaLabel ?? spec.title ?? 'Interactive three-dimensional chart',
      accessibleDescription,
    );
    this.#renderer.setScene(this.#scene);
    this.#renderer.setCamera(this.#camera);
    this.#syncAccessibilityDom();
    this.#renderAccessibilityTable();
    this.#syncControlStructure();
    this.#attachInteraction();
    this.#configureResize();
    this.resize(options.width, options.height);
    this.render();
  }

  getSpec(): SpatialChartSpec {
    return this.#spec;
  }

  setSpec(spec: SpatialChartSpec): void {
    this.#assertAlive();
    const scene = compileSpatial(spec);
    this.#spec = spec;
    this.#scene = scene;
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
    this.#emitCamera('spec');
    this.render();
  }

  getCamera(): SpatialCameraState {
    return { ...this.#camera, target: [...this.#camera.target] as [number, number, number] };
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
    const scale = this.#camera.distance / Math.max(120, this.#height);
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
    const ratio = this.#options.pixelRatio ?? window.devicePixelRatio ?? 1;
    this.#renderer.resize(resolvedWidth, resolvedHeight, ratio);
    this.#events.emit('resize', { chart: this, width: resolvedWidth, height: resolvedHeight });
  }

  render(): void {
    this.#assertAlive();
    this.#renderer.setCamera(this.#camera);
    this.#renderer.render();
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
    context.fillText(this.#spec.title ?? 'Three-dimensional chart', 24, 38);
    context.fillStyle = '#64748b';
    context.font = '14px sans-serif';
    context.fillText(defaultLabels.unavailable, 24, 68, Math.max(20, fallback.width - 48));
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
    this.#resizeObserver?.disconnect();
    if (this.#windowResizeListener !== null)
      window.removeEventListener('resize', this.#windowResizeListener);
    document.removeEventListener('fullscreenchange', this.#fullscreenListener);
    this.#detachInteraction();
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
    const labels = { ...defaultLabels, ...this.#spec.interaction?.labels };
    const surface = this.#renderer.surface();
    surface.setAttribute(
      'aria-label',
      this.#spec.ariaLabel ?? this.#spec.title ?? 'Interactive three-dimensional chart',
    );
    surface.setAttribute(
      'aria-description',
      spatialAccessibleDescription(this.#spec.accessibility?.description, labels.instructions),
    );
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
    this.#instructions.textContent = spatialAccessibleDescription(
      this.#spec.accessibility?.description,
      labels.instructions,
    );
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
    const labels = { ...defaultLabels, ...this.#spec.interaction?.labels };
    const toolbar = document.createElement('div');
    toolbar.dataset.graflumeSpatialControls = 'true';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Three-dimensional chart controls');
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
    this.#syncControls();
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
    const labels = { ...defaultLabels, ...this.#spec.interaction?.labels };
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

  #showFallback(message: string): void {
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
    this.#fallback.textContent =
      message || this.#spec.interaction?.labels?.unavailable || defaultLabels.unavailable;
    this.#fallback.style.display = 'grid';
    this.#fallback.hidden = false;
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
      this.#spec.accessibility?.description ?? this.#spec.title ?? 'Three-dimensional chart data';
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

  #assertAlive(): void {
    if (this.#destroyed) throw new Error('Spatial chart has been destroyed.');
  }

  #assertFiniteInteraction(label: string, value: number): void {
    assertFiniteSpatialNumber(label, value);
  }
}
