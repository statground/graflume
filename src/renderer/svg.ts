import { GraflumeError } from '../core/errors.js';
import type { Scene, SceneNode } from '../scene/types.js';
import { CanvasRenderer } from './canvas.js';
import type {
  Renderer,
  RendererFactory,
  RendererMountOptions,
  InspectionViewTransform,
} from './types.js';

const svgCapabilities = {
  vector: true,
  gpu: false,
  worker: false,
  exportFormats: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'],
  inspectionViewport: true,
} as const;

function xml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
function number(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) > 1e12)
    throw new GraflumeError('INVALID_SPEC', 'SVG geometry must be finite and bounded.');
  return String(value);
}
function paint(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  // Paints never resolve URLs, CSS variables, external resources, or active content.
  if (
    typeof value !== 'string' ||
    value.length > 256 ||
    !/^(?:#[\da-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([\d\s.,%+\-/]*\))$/i.test(
      value.trim(),
    )
  ) {
    throw new GraflumeError('INVALID_SPEC', 'SVG paint must be a literal color.');
  }
  return value;
}
function attributes(values: Record<string, unknown>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${xml(value)}"`)
    .join('');
}

/** Deterministic, resource-free SVG from actual compiled vector primitives. */
export function sceneToSVG(scene: Scene): string {
  let hash = 2166136261;
  for (const char of JSON.stringify(scene.root))
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const prefix = `graflume-${(hash >>> 0).toString(36)}`;
  const defs: string[] = [];
  let count = 0;
  const visit = (node: SceneNode, depth: number): string => {
    if (++count > 100_000 || depth > 64)
      throw new GraflumeError('INVALID_SPEC', 'SVG scene exceeds its node or depth budget.');
    if (!node.visible || node.opacity <= 0) return '';
    const common = { 'data-scene-node': node.id, opacity: number(node.opacity) };
    if (node.type === 'group') {
      let clip: string | undefined;
      if (node.clip !== undefined) {
        const id = `${prefix}-clip-${count}`;
        defs.push(
          `<clipPath id="${id}"><rect${attributes({ x: number(node.clip.x), y: number(node.clip.y), width: number(node.clip.width), height: number(node.clip.height) })}/></clipPath>`,
        );
        clip = `url(#${id})`;
      }
      return `<g${attributes({ ...common, 'clip-path': clip })}>${[...node.children]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((child) => visit(child, depth + 1))
        .join('')}</g>`;
    }
    if (node.type === 'text') {
      const anchor =
        node.align === 'center'
          ? 'middle'
          : node.align === 'right' || node.align === 'end'
            ? 'end'
            : 'start';
      const baseline =
        node.baseline === 'top' || node.baseline === 'hanging'
          ? 'text-before-edge'
          : node.baseline === 'middle'
            ? 'central'
            : node.baseline === 'bottom' || node.baseline === 'ideographic'
              ? 'text-after-edge'
              : 'alphabetic';
      return `<text${attributes({ ...common, x: number(node.x), y: number(node.y), fill: paint(node.fill), 'font-family': node.fontFamily, 'font-size': number(node.fontSize), 'font-weight': node.fontWeight, 'font-style': node.fontStyle, 'text-anchor': anchor, 'dominant-baseline': baseline, transform: node.rotation === 0 ? undefined : `rotate(${number(node.rotation)} ${number(node.x)} ${number(node.y)})` })}>${xml(node.text)}</text>`;
    }
    const styles = {
      ...common,
      fill: node.type === 'line' ? 'none' : (paint(node.fill) ?? 'none'),
      stroke: paint(node.stroke),
      'stroke-width': number(node.lineWidth),
      'stroke-dasharray': node.dash?.map(number).join(' '),
    };
    if (node.type === 'line')
      return `<line${attributes({ ...styles, x1: number(node.x1), y1: number(node.y1), x2: number(node.x2), y2: number(node.y2), 'stroke-linecap': node.lineCap })}/>`;
    if (node.type === 'circle')
      return `<circle${attributes({ ...styles, cx: number(node.cx), cy: number(node.cy), r: number(node.radius) })}/>`;
    if (node.type === 'rect') {
      if (node.providerTile !== undefined)
        throw new GraflumeError(
          'UNSUPPORTED_RENDERER',
          'SVG snapshots do not capture externally loaded map tiles.',
        );
      return `<rect${attributes({ ...styles, x: number(node.x), y: number(node.y), width: number(node.width), height: number(node.height), rx: number(Math.max(0, Math.min(node.cornerRadius, Math.abs(node.width) / 2, Math.abs(node.height) / 2))) })}/>`;
    }
    if (node.type !== 'path') throw new GraflumeError('INVALID_SPEC', 'Unknown SVG scene node.');
    const d = [node.points, ...(node.subpaths ?? [])]
      .filter((points) => points.length > 0)
      .map(
        (points) =>
          points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${number(p.x)} ${number(p.y)}`).join(' ') +
          (node.closed ? ' Z' : ''),
      )
      .join(' ');
    return `<path${attributes({ ...styles, d, 'fill-rule': node.fillRule, 'stroke-linecap': node.lineCap, 'stroke-linejoin': node.lineJoin })}/>`;
  };
  const body = visit(scene.root, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${number(scene.width)}" height="${number(scene.height)}" viewBox="0 0 ${number(scene.width)} ${number(scene.height)}" role="img" aria-label="${xml(scene.accessibility.label)}"><title>${xml(scene.accessibility.label)}</title><desc>${xml(scene.accessibility.description ?? '')}</desc><defs>${defs.join('')}</defs><rect width="100%" height="100%" fill="${xml(paint(scene.background))}"/>${body}</svg>`;
}

/** Native SVG surface; PNG conversion is lazy and happens only when explicitly exported. */
export class SVGRenderer implements Renderer {
  readonly name = 'svg';
  readonly capabilities = svgCapabilities;
  #host: HTMLElement | null = null;
  #surface: HTMLElement | null = null;
  #scene: Scene | null = null;
  #svg = '';
  #view: InspectionViewTransform = { zoom: 1, offsetX: 0, offsetY: 0 };
  #pixelRatio = 1;
  #width = 1;
  #height = 1;
  mount(target: HTMLElement, options: RendererMountOptions): void {
    this.#host = target.ownerDocument.createElement('div');
    this.#host.style.cssText = 'position:relative;max-width:100%;overflow:hidden;';
    this.#surface = target.ownerDocument.createElement('div');
    this.#surface.setAttribute('role', 'img');
    this.#surface.setAttribute('aria-label', options.ariaLabel);
    if (options.ariaDescription !== undefined)
      this.#surface.setAttribute('aria-description', options.ariaDescription);
    this.#surface.style.cssText = 'position:relative;overflow:hidden;touch-action:pan-y;';
    this.#host.append(this.#surface);
    target.append(this.#host);
    this.resize(options.width, options.height, options.pixelRatio);
  }
  resize(width: number, height: number, pixelRatio: number): void {
    this.#width = width;
    this.#height = height;
    this.#pixelRatio = pixelRatio;
    if (this.#host) {
      this.#host.style.width = `${width}px`;
      this.#host.style.height = `${height}px`;
    }
    if (this.#surface) {
      this.#surface.style.width = `${width}px`;
      this.#surface.style.height = `${height}px`;
    }
    this.setInspectionView(this.#view);
  }
  render(scene: Scene): void {
    this.restore(scene, sceneToSVG(scene));
  }
  /** Called only after snapshot canonical-SVG verification. */
  restore(scene: Scene, svg: string): void {
    if (svg !== sceneToSVG(scene))
      throw new GraflumeError('INVALID_SPEC', 'SVG must match its literal vector scene.');
    this.#scene = scene;
    this.#svg = svg;
    if (this.#surface) this.#surface.innerHTML = svg;
    this.setInspectionView(this.#view);
  }
  surface(): HTMLElement | null {
    return this.#surface;
  }
  overlayHost(): HTMLElement | null {
    return this.#host;
  }
  setInspectionView(view: InspectionViewTransform): void {
    this.#view = { ...view };
    const svg = this.#surface?.firstElementChild as SVGElement | undefined;
    if (svg) {
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.transformOrigin = '0 0';
      svg.style.transform = `translate(${(view.offsetX * this.#width) / (this.#scene?.width ?? this.#width)}px,${(view.offsetY * this.#height) / (this.#scene?.height ?? this.#height)}px) scale(${view.zoom})`;
    }
  }
  toDataURL(type = 'image/svg+xml', quality?: number): string {
    if (type === 'image/svg+xml')
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(this.#svg)}`;
    if (this.#scene === null || this.#host === null)
      throw new GraflumeError('UNSUPPORTED_RENDERER', 'SVG surface has no rendered scene.');
    const renderer = new CanvasRenderer();
    try {
      renderer.mount(this.#host.ownerDocument.createElement('div'), {
        width: this.#scene.width,
        height: this.#scene.height,
        pixelRatio: this.#pixelRatio,
        ariaLabel: this.#scene.accessibility.label,
      });
      renderer.setInspectionView(this.#view);
      renderer.render(this.#scene);
      return renderer.toDataURL(type, quality);
    } finally {
      renderer.destroy();
    }
  }
  destroy(): void {
    this.#host?.remove();
    this.#host = null;
    this.#surface = null;
    this.#scene = null;
    this.#svg = '';
  }
}

export const svgRendererFactory: RendererFactory = {
  name: 'svg',
  capabilities: svgCapabilities,
  create: () => new SVGRenderer(),
};
