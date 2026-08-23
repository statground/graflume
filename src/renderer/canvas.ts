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
import type {
  Renderer,
  RendererCapabilities,
  RendererFactory,
  RendererMountOptions,
} from './types.js';

const capabilities: RendererCapabilities = {
  vector: false,
  gpu: false,
  worker: false,
  exportFormats: ['image/png', 'image/jpeg', 'image/webp'],
};

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

  mount(target: HTMLElement, options: RendererMountOptions): void {
    if (this.#root !== null) this.destroy();

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
    context.save();
    context.setTransform(this.#pixelRatio, 0, 0, this.#pixelRatio, 0, 0);
    context.clearRect(0, 0, this.#width, this.#height);
    context.fillStyle = scene.background;
    context.fillRect(0, 0, scene.width, scene.height);
    this.#drawNode(context, scene.root);
    context.restore();
  }

  surface(): HTMLElement | null {
    return this.#canvas;
  }

  overlayHost(): HTMLElement | null {
    return this.#root;
  }

  toDataURL(type = 'image/png', quality?: number): string {
    if (this.#canvas === null) throw new Error('Renderer is not mounted.');
    return this.#canvas.toDataURL(type, quality);
  }

  destroy(): void {
    this.#root?.remove();
    this.#root = null;
    this.#canvas = null;
    this.#context = null;
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
    const first = node.points[0];
    if (first === undefined) return;
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let index = 1; index < node.points.length; index += 1) {
      const point = node.points[index];
      if (point !== undefined) context.lineTo(point.x, point.y);
    }
    if (node.closed) context.closePath();
    context.setLineDash(node.dash === undefined ? [] : [...node.dash]);
    context.lineCap = node.lineCap ?? 'round';
    context.lineJoin = node.lineJoin ?? 'round';
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

  #drawRect(context: CanvasRenderingContext2D, node: RectNode): void {
    context.beginPath();
    roundedRectPath(context, node.x, node.y, node.width, node.height, node.cornerRadius);
    context.closePath();
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

  #drawCircle(context: CanvasRenderingContext2D, node: CircleNode): void {
    context.beginPath();
    context.arc(node.cx, node.cy, node.radius, 0, Math.PI * 2);
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
