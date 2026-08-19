import { compileWithRegistry, type CompileResult } from '../compiler/compile.js';
import { GraflumeError } from '../core/errors.js';
import { EventEmitter } from '../core/events.js';
import { DataTable } from '../data/table.js';
import { hitTestScene, type HitResult } from '../interaction/hit-test.js';
import type { Renderer } from '../renderer/types.js';
import type { ChartSpec, DataInput, DataRow } from '../spec/types.js';
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

export interface ChartEventMap {
  readonly render: ChartRenderEvent;
  readonly hover: ChartPointerEvent;
  readonly click: ChartPointerEvent;
  readonly resize: ChartResizeEvent;
  readonly error: ChartErrorEvent;
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

export class Chart {
  readonly #target: HTMLElement;
  readonly #registry: RuntimeRegistry;
  readonly #events = new EventEmitter<ChartEventMap>();
  readonly #scheduler = new RenderScheduler();
  readonly #options: ChartCreateOptions;
  #spec: ChartSpec;
  #renderer: Renderer | null = null;
  #rendererName: string | null = null;
  #result: CompileResult | null = null;
  #destroyed = false;
  #resizeObserver: ResizeObserver | null = null;
  #windowResizeListener: (() => void) | null = null;
  #manualWidth: number | undefined;
  #manualHeight: number | undefined;

  readonly #pointerMoveListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    this.#emitPointer('hover', event);
  };

  readonly #clickListener = (event: Event): void => {
    if (!(event instanceof PointerEvent)) return;
    this.#emitPointer('click', event);
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
    this.render();
    this.#configureResizeObserver();
  }

  on<K extends keyof ChartEventMap>(type: K, listener: (event: ChartEventMap[K]) => void): () => void {
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

  setSpec(spec: ChartSpec): this {
    this.#assertAlive();
    this.#spec = spec;
    this.render();
    this.#configureResizeObserver();
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
      throw new GraflumeError('INVALID_DATA', 'Specify layerId when replacing data in a multi-layer chart.');
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

    const targetLayerId = layerId ?? (this.#spec.layers.length === 1 ? this.#spec.layers[0]?.id ?? 'layer-0' : undefined);
    if (targetLayerId === undefined) {
      throw new GraflumeError('INVALID_DATA', 'Specify layerId when appending to a multi-layer chart.');
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
    if (!matched) throw new GraflumeError('INVALID_DATA', `Layer "${targetLayerId}" was not found.`);
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
    }
    return this;
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
    const result = compileWithRegistry(this.#spec, this.#registry, dimensions);
    const factory = this.#registry.resolveRenderer(result.spec.renderer);
    const pixelRatio = this.#pixelRatio();

    this.#detachSurfaceEvents();
    if (this.#renderer === null || this.#rendererName !== factory.name) {
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
      this.#renderer.resize(result.scene.width, result.scene.height, pixelRatio);
      const surface = this.#renderer.surface();
      surface?.setAttribute('aria-label', result.scene.accessibility.label);
      if (result.scene.accessibility.description === undefined) {
        surface?.removeAttribute('aria-description');
      } else {
        surface?.setAttribute('aria-description', result.scene.accessibility.description);
      }
    }

    this.#renderer.render(result.scene);
    this.#attachSurfaceEvents();
    this.#result = result;
    this.#events.emit('render', { chart: this, scene: result.scene });
    return this;
  }

  toDataURL(type?: string, quality?: number): string {
    this.#assertAlive();
    if (this.#renderer?.toDataURL === undefined) {
      throw new GraflumeError('UNSUPPORTED_RENDERER', 'The active renderer cannot export a data URL.');
    }
    return this.#renderer.toDataURL(type, quality);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#scheduler.cancel();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (this.#windowResizeListener !== null && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.#windowResizeListener);
    }
    this.#windowResizeListener = null;
    this.#detachSurfaceEvents();
    this.#renderer?.destroy();
    this.#renderer = null;
    this.#result = null;
    this.#events.clear();
    this.#destroyed = true;
  }

  #measure(): { width: number; height: number } {
    const width =
      this.#manualWidth ??
      (typeof this.#spec.width === 'number' ? this.#spec.width : this.#target.clientWidth || 640);
    const height =
      this.#manualHeight ??
      (typeof this.#spec.height === 'number' ? this.#spec.height : this.#target.clientHeight || 400);
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }

  #pixelRatio(): number {
    const ratio = this.#options.pixelRatio ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
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

  #attachSurfaceEvents(): void {
    const surface = this.#renderer?.surface();
    if (surface === null || surface === undefined) return;
    if (this.#spec.interaction?.hover !== false) {
      surface.addEventListener('pointermove', this.#pointerMoveListener, { passive: true });
    }
    if (this.#spec.interaction?.click !== false) {
      surface.addEventListener('click', this.#clickListener, { passive: true });
    }
  }

  #detachSurfaceEvents(): void {
    const surface = this.#renderer?.surface();
    surface?.removeEventListener('pointermove', this.#pointerMoveListener);
    surface?.removeEventListener('click', this.#clickListener);
  }

  #emitPointer(type: 'hover' | 'click', sourceEvent: PointerEvent): void {
    const scene = this.#result?.scene;
    const surface = this.#renderer?.surface();
    if (scene === undefined || surface === null || surface === undefined) return;
    const bounds = surface.getBoundingClientRect();
    const x = ((sourceEvent.clientX - bounds.left) / Math.max(1, bounds.width)) * scene.width;
    const y = ((sourceEvent.clientY - bounds.top) / Math.max(1, bounds.height)) * scene.height;
    const hit = scene.metadata.performanceProfile === 'ultra' ? null : hitTestScene(scene, x, y);
    this.#events.emit(type, { chart: this, hit, sourceEvent });
  }

  #assertAlive(): void {
    if (this.#destroyed) {
      throw new GraflumeError('DESTROYED_CHART', 'This chart instance has been destroyed.');
    }
  }
}
