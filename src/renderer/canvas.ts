import type {
  CircleNode,
  GroupNode,
  LineNode,
  PathNode,
  RectNode,
  Scene,
  SceneNode,
  TextNode,
} from '../scene/types.js';
import {
  fetchMapTile,
  MapTileManager,
  tileUrl,
  type TileCoordinate,
  type TileResponse,
  type TileSourceDefinition,
} from '../geography/map-lifecycle.js';
import type {
  Renderer,
  RendererCapabilities,
  RendererFactory,
  InspectionViewTransform,
  RendererMountOptions,
} from './types.js';

const capabilities: RendererCapabilities = {
  vector: false,
  gpu: false,
  worker: false,
  exportFormats: ['image/png', 'image/jpeg', 'image/webp'],
  inspectionViewport: true,
};

interface ProviderTileRequest {
  readonly source: TileSourceDefinition;
  readonly tile: TileCoordinate;
}

type ProviderTileImageState =
  | {
      readonly status: 'queued' | 'loading';
      readonly request: ProviderTileRequest;
      readonly controller: AbortController;
    }
  | {
      readonly status: 'ready';
      readonly image?: CanvasImageSource;
      readonly dispose?: () => void;
    }
  | { readonly status: 'failed' };

const maximumProviderTileRequests = 8;
const maximumDecodedProviderTiles = 128;

export interface CanvasProviderTileState {
  readonly sources: number;
  readonly loading: number;
  readonly ready: number;
  readonly failed: number;
}

function tileSourceKey(source: TileSourceDefinition): string {
  return JSON.stringify([
    source.type,
    source.template,
    source.attribution,
    source.minimumZoom ?? null,
    source.maximumZoom ?? null,
    source.tileSize ?? null,
    source.subdomains ?? [],
  ]);
}

function providerTileKey(source: TileSourceDefinition, tile: TileCoordinate): string {
  return `${tileSourceKey(source)}\u0000${tileUrl(source, tile)}`;
}

function collectVisibleProviderTiles(
  node: SceneNode,
  output: Map<string, ProviderTileRequest>,
): void {
  if (!node.visible || node.opacity <= 0) return;
  if (node.type === 'rect' && node.providerTile !== undefined) {
    const request = node.providerTile;
    output.set(providerTileKey(request.source, request.tile), request);
  }
  if (node.type === 'group') {
    for (const child of node.children) collectVisibleProviderTiles(child, output);
  }
}

async function decodeProviderTile(
  response: TileResponse,
): Promise<{ readonly image?: CanvasImageSource; readonly dispose?: () => void }> {
  if (!response.mimeType.toLowerCase().startsWith('image/')) return {};
  const blob = new Blob([Uint8Array.from(response.bytes).buffer], { type: response.mimeType });
  if (typeof createImageBitmap === 'function') {
    const image = await createImageBitmap(blob);
    return { image, dispose: () => image.close() };
  }
  if (
    typeof Image === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  )
    throw new Error('Provider raster tiles require createImageBitmap or Image support.');
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener(
        'error',
        () => reject(new Error('Provider raster tile decode failed.')),
        {
          once: true,
        },
      );
      image.src = objectUrl;
    });
    return { image, dispose: () => URL.revokeObjectURL(objectUrl) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const resolvedRadius = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
  context.moveTo(x + resolvedRadius, y);
  context.lineTo(x + width - resolvedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius);
  context.lineTo(x + width, y + height - resolvedRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - resolvedRadius, y + height);
  context.lineTo(x + resolvedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius);
  context.lineTo(x, y + resolvedRadius);
  context.quadraticCurveTo(x, y, x + resolvedRadius, y);
}

export class CanvasRenderer implements Renderer {
  readonly name = 'canvas';
  readonly capabilities = capabilities;
  #root: HTMLDivElement | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #context: CanvasRenderingContext2D | null = null;
  #width = 0;
  #height = 0;
  #pixelRatio = 1;
  #inspectionView: InspectionViewTransform = { zoom: 1, offsetX: 0, offsetY: 0 };
  readonly #tileManagers = new Map<string, MapTileManager>();
  readonly #tileImages = new Map<string, ProviderTileImageState>();
  #tileQueue: string[] = [];
  #activeTileRequests = 0;
  #tileGeneration = 0;
  #visibleTileKeys = new Set<string>();
  #lastScene: Scene | null = null;
  #destroyed = false;

  mount(target: HTMLElement, options: RendererMountOptions): void {
    if (this.#root !== null) this.destroy();

    this.#destroyed = false;
    const root = document.createElement('div');
    root.dataset.graflumeRoot = 'true';
    root.style.position = 'relative';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.overflow = 'hidden';

    const canvas = document.createElement('canvas');
    canvas.dataset.graflumeSurface = 'canvas';
    canvas.style.display = 'block';
    canvas.style.width = `${options.width}px`;
    canvas.style.height = `${options.height}px`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', options.ariaLabel);
    if (options.ariaDescription !== undefined) {
      canvas.setAttribute('aria-description', options.ariaDescription);
    }

    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D context is unavailable.');

    root.append(canvas);
    target.append(root);
    this.#root = root;
    this.#canvas = canvas;
    this.#context = context;
    this.resize(options.width, options.height, options.pixelRatio);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (this.#canvas === null || this.#context === null) return;
    this.#width = Math.max(1, width);
    this.#height = Math.max(1, height);
    this.#pixelRatio = Math.max(1, pixelRatio);
    this.#canvas.width = Math.round(this.#width * this.#pixelRatio);
    this.#canvas.height = Math.round(this.#height * this.#pixelRatio);
    this.#canvas.style.width = `${this.#width}px`;
    this.#canvas.style.height = `${this.#height}px`;
    this.#context.setTransform(this.#pixelRatio, 0, 0, this.#pixelRatio, 0, 0);
  }

  render(scene: Scene): void {
    const context = this.#context;
    if (context === null) return;
    this.#lastScene = scene;
    this.#reconcileProviderTiles(scene.root);
    this.#paint(scene);
  }

  #paint(scene: Scene): void {
    const context = this.#context;
    if (context === null) return;
    context.save();
    context.setTransform(this.#pixelRatio, 0, 0, this.#pixelRatio, 0, 0);
    context.clearRect(0, 0, this.#width, this.#height);
    context.fillStyle = scene.background;
    context.fillRect(0, 0, scene.width, scene.height);
    if (
      this.#inspectionView.zoom !== 1 ||
      this.#inspectionView.offsetX !== 0 ||
      this.#inspectionView.offsetY !== 0
    ) {
      context.translate(this.#inspectionView.offsetX, this.#inspectionView.offsetY);
      context.scale(this.#inspectionView.zoom, this.#inspectionView.zoom);
    }
    this.#drawNode(context, scene.root);
    context.restore();
  }

  surface(): HTMLElement | null {
    return this.#canvas;
  }

  overlayHost(): HTMLElement | null {
    return this.#root;
  }

  setInspectionView(transform: InspectionViewTransform): void {
    this.#inspectionView = transform;
  }

  toDataURL(type = 'image/png', quality?: number): string {
    if (this.#canvas === null) throw new Error('Renderer is not mounted.');
    return this.#canvas.toDataURL(type, quality);
  }

  /** Observable provider state for diagnostics and deterministic host readiness checks. */
  providerTileState(): CanvasProviderTileState {
    const states = [...this.#tileImages.values()];
    return Object.freeze({
      sources: this.#tileManagers.size,
      loading: states.filter(({ status }) => status === 'queued' || status === 'loading').length,
      ready: states.filter(({ status }) => status === 'ready').length,
      failed: states.filter(({ status }) => status === 'failed').length,
    });
  }

  destroy(): void {
    this.#destroyed = true;
    this.#tileGeneration += 1;
    for (const state of this.#tileImages.values()) {
      if (state.status === 'queued' || state.status === 'loading') {
        state.controller.abort(new DOMException('Canvas provider tile destroyed.', 'AbortError'));
      }
    }
    for (const manager of this.#tileManagers.values()) manager.destroy();
    this.#tileManagers.clear();
    for (const state of this.#tileImages.values()) {
      if (state.status === 'ready') state.dispose?.();
    }
    this.#tileImages.clear();
    this.#tileQueue = [];
    this.#activeTileRequests = 0;
    this.#visibleTileKeys.clear();
    this.#lastScene = null;
    this.#root?.remove();
    this.#root = null;
    this.#canvas = null;
    this.#context = null;
    this.#inspectionView = { zoom: 1, offsetX: 0, offsetY: 0 };
  }

  #drawNode(context: CanvasRenderingContext2D, node: SceneNode): void {
    if (!node.visible || node.opacity <= 0) return;
    context.save();
    context.globalAlpha *= node.opacity;

    switch (node.type) {
      case 'group':
        this.#drawGroup(context, node);
        break;
      case 'line':
        this.#drawLine(context, node);
        break;
      case 'path':
        this.#drawPath(context, node);
        break;
      case 'rect':
        this.#drawRect(context, node);
        break;
      case 'circle':
        this.#drawCircle(context, node);
        break;
      case 'text':
        this.#drawText(context, node);
        break;
    }

    context.restore();
  }

  #drawGroup(context: CanvasRenderingContext2D, node: GroupNode): void {
    if (node.clip !== undefined) {
      context.beginPath();
      context.rect(node.clip.x, node.clip.y, node.clip.width, node.clip.height);
      context.clip();
    }
    const children = [...node.children].sort((left, right) => left.zIndex - right.zIndex);
    for (const child of children) this.#drawNode(context, child);
  }

  #drawLine(context: CanvasRenderingContext2D, node: LineNode): void {
    context.beginPath();
    context.moveTo(node.x1, node.y1);
    context.lineTo(node.x2, node.y2);
    context.strokeStyle = node.stroke;
    context.lineWidth = node.lineWidth;
    context.lineCap = node.lineCap ?? 'butt';
    context.setLineDash(node.dash === undefined ? [] : [...node.dash]);
    context.stroke();
  }

  #drawPath(context: CanvasRenderingContext2D, node: PathNode): void {
    const paths = [node.points, ...(node.subpaths ?? [])].filter((points) => points.length > 0);
    if (paths.length === 0) return;
    context.beginPath();
    for (const points of paths) {
      const first = points[0];
      if (first === undefined) continue;
      context.moveTo(first.x, first.y);
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index];
        if (point !== undefined) context.lineTo(point.x, point.y);
      }
      if (node.closed) context.closePath();
    }
    context.setLineDash(node.dash === undefined ? [] : [...node.dash]);
    context.lineCap = node.lineCap ?? 'round';
    context.lineJoin = node.lineJoin ?? 'round';
    if (node.fill !== undefined) {
      context.fillStyle = node.fill;
      context.fill(node.fillRule ?? 'nonzero');
    }
    if (node.stroke !== undefined && node.lineWidth > 0) {
      context.strokeStyle = node.stroke;
      context.lineWidth = node.lineWidth;
      context.stroke();
    }
  }

  #drawRect(context: CanvasRenderingContext2D, node: RectNode): void {
    context.beginPath();
    roundedRectPath(context, node.x, node.y, node.width, node.height, node.cornerRadius);
    context.closePath();
    context.setLineDash(node.dash === undefined ? [] : [...node.dash]);
    if (node.fill !== undefined) {
      context.fillStyle = node.fill;
      context.fill();
    }
    if (node.providerTile !== undefined) {
      const image = this.#providerTileImage(node.providerTile.source, node.providerTile.tile);
      if (image !== undefined) context.drawImage(image, node.x, node.y, node.width, node.height);
    }
    if (node.stroke !== undefined && node.lineWidth > 0) {
      context.strokeStyle = node.stroke;
      context.lineWidth = node.lineWidth;
      context.stroke();
    }
  }

  #providerTileImage(
    source: TileSourceDefinition,
    tile: Readonly<{ z: number; x: number; y: number }>,
  ): CanvasImageSource | undefined {
    const key = providerTileKey(source, tile);
    const current = this.#tileImages.get(key);
    if (current?.status === 'ready') {
      this.#tileImages.delete(key);
      this.#tileImages.set(key, current);
      return current.image;
    }
    return undefined;
  }

  #reconcileProviderTiles(root: SceneNode): void {
    const visible = new Map<string, ProviderTileRequest>();
    collectVisibleProviderTiles(root, visible);
    this.#visibleTileKeys = new Set(visible.keys());
    for (const [key, state] of this.#tileImages) {
      if (visible.has(key)) continue;
      if (state.status === 'queued' || state.status === 'loading') {
        state.controller.abort(
          new DOMException('Canvas provider tile left the visible scene.', 'AbortError'),
        );
        this.#tileImages.delete(key);
      } else if (state.status === 'failed') {
        this.#tileImages.delete(key);
      }
    }
    this.#tileQueue = this.#tileQueue.filter((key) => {
      const state = this.#tileImages.get(key);
      return visible.has(key) && state?.status === 'queued';
    });
    for (const [key, request] of visible) {
      const current = this.#tileImages.get(key);
      if (current?.status === 'ready') {
        this.#tileImages.delete(key);
        this.#tileImages.set(key, current);
      } else if (current === undefined) {
        const controller = new AbortController();
        this.#tileImages.set(key, { status: 'queued', request, controller });
        this.#tileQueue.push(key);
      }
    }
    this.#drainProviderTileQueue();
  }

  #drainProviderTileQueue(): void {
    while (
      !this.#destroyed &&
      this.#activeTileRequests < maximumProviderTileRequests &&
      this.#tileQueue.length > 0
    ) {
      const key = this.#tileQueue.shift()!;
      const queued = this.#tileImages.get(key);
      if (
        queued?.status !== 'queued' ||
        queued.controller.signal.aborted ||
        !this.#visibleTileKeys.has(key)
      ) {
        if (queued?.status === 'queued') this.#tileImages.delete(key);
        continue;
      }
      const sourceKey = tileSourceKey(queued.request.source);
      let manager = this.#tileManagers.get(sourceKey);
      if (manager === undefined) {
        manager = new MapTileManager(queued.request.source, fetchMapTile);
        this.#tileManagers.set(sourceKey, manager);
      }
      const generation = this.#tileGeneration;
      const controller = queued.controller;
      const request = queued.request;
      this.#tileImages.set(key, { ...queued, status: 'loading' });
      this.#activeTileRequests += 1;
      void manager
        .load(request.tile, controller.signal)
        .then(decodeProviderTile)
        .then((decoded) => {
          const current = this.#tileImages.get(key);
          if (
            this.#destroyed ||
            generation !== this.#tileGeneration ||
            controller.signal.aborted ||
            !this.#visibleTileKeys.has(key) ||
            current?.status !== 'loading' ||
            current.controller !== controller
          ) {
            decoded.dispose?.();
            return;
          }
          this.#tileImages.delete(key);
          this.#tileImages.set(key, { status: 'ready', ...decoded });
          this.#evictDecodedProviderTiles();
          if (this.#lastScene !== null) this.#paint(this.#lastScene);
        })
        .catch(() => {
          const current = this.#tileImages.get(key);
          if (
            !this.#destroyed &&
            generation === this.#tileGeneration &&
            current?.status === 'loading' &&
            current.controller === controller
          ) {
            if (controller.signal.aborted || !this.#visibleTileKeys.has(key))
              this.#tileImages.delete(key);
            else this.#tileImages.set(key, { status: 'failed' });
          }
        })
        .finally(() => {
          if (generation !== this.#tileGeneration) return;
          this.#activeTileRequests = Math.max(0, this.#activeTileRequests - 1);
          this.#drainProviderTileQueue();
        });
    }
  }

  #evictDecodedProviderTiles(): void {
    let ready = [...this.#tileImages.values()].filter(({ status }) => status === 'ready').length;
    if (ready <= maximumDecodedProviderTiles) return;
    for (const [key, state] of this.#tileImages) {
      if (ready <= maximumDecodedProviderTiles) break;
      if (state.status !== 'ready') continue;
      this.#tileImages.delete(key);
      state.dispose?.();
      ready -= 1;
    }
  }

  #drawCircle(context: CanvasRenderingContext2D, node: CircleNode): void {
    context.beginPath();
    context.arc(node.cx, node.cy, node.radius, 0, Math.PI * 2);
    context.setLineDash(node.dash === undefined ? [] : [...node.dash]);
    if (node.fill !== undefined) {
      context.fillStyle = node.fill;
      context.fill();
    }
    if (node.stroke !== undefined && node.lineWidth > 0) {
      context.strokeStyle = node.stroke;
      context.lineWidth = node.lineWidth;
      context.stroke();
    }
  }

  #drawText(context: CanvasRenderingContext2D, node: TextNode): void {
    context.translate(node.x, node.y);
    context.rotate((node.rotation * Math.PI) / 180);
    context.fillStyle = node.fill;
    const fontStyle = node.fontStyle === undefined ? '' : `${node.fontStyle} `;
    context.font = `${fontStyle}${node.fontWeight} ${node.fontSize}px ${node.fontFamily}`;
    context.textAlign = node.align;
    context.textBaseline = node.baseline;
    context.fillText(node.text, 0, 0);
  }
}

export const canvasRendererFactory: RendererFactory = {
  name: 'canvas',
  capabilities,
  create: () => new CanvasRenderer(),
};
