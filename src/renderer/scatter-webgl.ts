import type {
  CircleNode,
  GroupNode,
  PathNode,
  RectNode,
  Scene,
  SceneNode,
} from '../scene/types.js';
import { CanvasRenderer } from './canvas.js';
import type {
  InspectionViewTransform,
  Renderer,
  RendererCapabilities,
  RendererFactory,
  RendererMountOptions,
} from './types.js';

const capabilities: RendererCapabilities = {
  vector: false,
  gpu: true,
  worker: false,
  exportFormats: ['image/png', 'image/jpeg', 'image/webp'],
  inspectionViewport: true,
};

interface ScatterPoint {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly shape: 0 | 1 | 2 | 3 | 4;
  readonly fill: string;
  readonly opacity: number;
}

export interface ScatterWebGLDispatchState {
  readonly renderer: 'canvas' | 'webgl';
  readonly pointCount: number;
  readonly reason: 'gpu' | 'unavailable' | 'empty' | 'destroyed';
}

function pointGeometry(
  node: CircleNode | RectNode | PathNode,
  opacity: number,
): ScatterPoint | null {
  if (node.fill === undefined) return null;
  if (node.type === 'circle') {
    return { x: node.cx, y: node.cy, radius: node.radius, shape: 0, fill: node.fill, opacity };
  }
  if (node.type === 'rect') {
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2,
      radius: Math.max(node.width, node.height) / 2,
      shape: 1,
      fill: node.fill,
      opacity,
    };
  }
  if (node.points.length < 3) return null;
  const minimumX = Math.min(...node.points.map(({ x }) => x));
  const maximumX = Math.max(...node.points.map(({ x }) => x));
  const minimumY = Math.min(...node.points.map(({ y }) => y));
  const maximumY = Math.max(...node.points.map(({ y }) => y));
  return {
    x: (minimumX + maximumX) / 2,
    y: (minimumY + maximumY) / 2,
    radius: Math.max(maximumX - minimumX, maximumY - minimumY) / 2,
    shape: node.points.length === 3 ? 2 : node.points.length === 12 ? 4 : 3,
    fill: node.fill,
    opacity,
  };
}

function isScatterPointNode(node: SceneNode): node is CircleNode | RectNode | PathNode {
  return (
    /(^|:)point:\d+$/.test(node.id) &&
    (node.type === 'circle' || node.type === 'rect' || node.type === 'path')
  );
}

function scatterPoints(root: SceneNode): readonly ScatterPoint[] {
  const points: ScatterPoint[] = [];
  const visit = (node: SceneNode, parentOpacity: number): void => {
    if (!node.visible || node.opacity <= 0) return;
    const opacity = parentOpacity * node.opacity;
    if (node.type === 'group') {
      node.children.forEach((child) => visit(child, opacity));
      return;
    }
    if (!isScatterPointNode(node)) return;
    const geometry = pointGeometry(node, opacity);
    if (geometry !== null) points.push(geometry);
  };
  visit(root, 1);
  return points;
}

function suppressScatterPoints(node: SceneNode): SceneNode {
  if (node.type === 'group') {
    return { ...node, children: node.children.map(suppressScatterPoints) };
  }
  return isScatterPointNode(node) ? { ...node, visible: false } : node;
}

function sceneWithoutScatterPoints(scene: Scene): Scene {
  return { ...scene, root: suppressScatterPoints(scene.root) as GroupNode };
}

function colorChannels(color: string): readonly [number, number, number, number] | null {
  const hex = color.trim().match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex !== undefined) {
    const expanded =
      hex.length === 3 || hex.length === 4
        ? [...hex].map((channel) => `${channel}${channel}`).join('')
        : hex;
    if (expanded.length === 6 || expanded.length === 8) {
      return [
        Number.parseInt(expanded.slice(0, 2), 16) / 255,
        Number.parseInt(expanded.slice(2, 4), 16) / 255,
        Number.parseInt(expanded.slice(4, 6), 16) / 255,
        expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
      ];
    }
  }
  const rgb = color
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgb !== null) {
    return [
      Math.max(0, Math.min(255, Number(rgb[1]))) / 255,
      Math.max(0, Math.min(255, Number(rgb[2]))) / 255,
      Math.max(0, Math.min(255, Number(rgb[3]))) / 255,
      Math.max(0, Math.min(1, rgb[4] === undefined ? 1 : Number(rgb[4]))),
    ];
  }
  return null;
}

function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (shader === null) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext | WebGL2RenderingContext): WebGLProgram | null {
  const vertex = compileShader(
    gl,
    gl.VERTEX_SHADER,
    `
attribute vec2 a_position;
attribute vec4 a_color;
attribute float a_size;
attribute float a_shape;
uniform vec2 u_resolution;
varying vec4 v_color;
varying float v_shape;
void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = a_size;
  v_color = a_color;
  v_shape = a_shape;
}`,
  );
  const fragment = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
precision mediump float;
varying vec4 v_color;
varying float v_shape;
void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  if (v_shape < 0.5 && dot(centered, centered) > 0.25) discard;
  if (v_shape > 1.5 && v_shape < 2.5) {
    float top = gl_PointCoord.y;
    float halfWidth = min(top, 1.0 - top * 0.5);
    if (abs(centered.x) > halfWidth) discard;
  }
  if (v_shape > 2.5 && v_shape < 3.5 && abs(centered.x) + abs(centered.y) > 0.5) discard;
  if (v_shape > 3.5 && abs(centered.x) > 0.17 && abs(centered.y) > 0.17) discard;
  gl_FragColor = v_color;
}`,
  );
  if (vertex === null || fragment === null) return null;
  const program = gl.createProgram();
  if (program === null) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** Hybrid renderer: axes/labels remain Canvas 2D while scatter points are actual WebGL points. */
export class ScatterWebGLRenderer implements Renderer {
  readonly name = 'webgl';
  readonly capabilities = capabilities;
  readonly #canvas = new CanvasRenderer();
  #surface: HTMLCanvasElement | null = null;
  #gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  #program: WebGLProgram | null = null;
  #width = 1;
  #height = 1;
  #pixelRatio = 1;
  #view: InspectionViewTransform = { zoom: 1, offsetX: 0, offsetY: 0 };
  #lastScene: Scene | null = null;
  #state: ScatterWebGLDispatchState = {
    renderer: 'canvas',
    pointCount: 0,
    reason: 'empty',
  };

  mount(target: HTMLElement, options: RendererMountOptions): void {
    if (this.#surface !== null || this.#gl !== null) this.destroy();
    this.#canvas.mount(target, options);
    const host = this.#canvas.overlayHost();
    if (host === null) return;
    const surface = host.ownerDocument.createElement('canvas');
    surface.dataset.graflumeScatterSurface = 'webgl';
    surface.setAttribute('aria-hidden', 'true');
    surface.style.position = 'absolute';
    surface.style.inset = '0';
    surface.style.pointerEvents = 'none';
    surface.style.width = `${options.width}px`;
    surface.style.height = `${options.height}px`;
    host.append(surface);
    const context =
      surface.getContext('webgl2', {
        alpha: true,
        antialias: true,
        depth: true,
        premultipliedAlpha: true,
      }) ??
      surface.getContext('webgl', {
        alpha: true,
        antialias: true,
        depth: true,
        premultipliedAlpha: true,
      });
    this.#surface = surface;
    this.#gl = context;
    this.#program = context === null ? null : createProgram(context);
    this.resize(options.width, options.height, options.pixelRatio);
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.#width = Math.max(1, width);
    this.#height = Math.max(1, height);
    this.#pixelRatio = Math.max(1, pixelRatio);
    this.#canvas.resize(this.#width, this.#height, this.#pixelRatio);
    if (this.#surface !== null) {
      this.#surface.width = Math.round(this.#width * this.#pixelRatio);
      this.#surface.height = Math.round(this.#height * this.#pixelRatio);
      this.#surface.style.width = `${this.#width}px`;
      this.#surface.style.height = `${this.#height}px`;
    }
  }

  render(scene: Scene): void {
    this.#lastScene = scene;
    const points = scatterPoints(scene.root);
    const rendered = points.length > 0 && this.#drawPoints(points);
    if (!rendered) this.#clearPoints();
    this.#canvas.render(rendered ? sceneWithoutScatterPoints(scene) : scene);
    this.#state = {
      renderer: rendered ? 'webgl' : 'canvas',
      pointCount: points.length,
      reason: rendered ? 'gpu' : points.length === 0 ? 'empty' : 'unavailable',
    };
  }

  surface(): HTMLElement | null {
    return this.#canvas.surface();
  }

  overlayHost(): HTMLElement | null {
    return this.#canvas.overlayHost();
  }

  setInspectionView(transform: InspectionViewTransform): void {
    this.#view = { ...transform };
    this.#canvas.setInspectionView(transform);
    if (this.#lastScene !== null) this.render(this.#lastScene);
  }

  toDataURL(type = 'image/png', quality?: number): string {
    const base = this.#canvas.surface() as HTMLCanvasElement | null;
    const overlay = this.#surface;
    if (base === null || overlay === null || typeof base.getContext !== 'function') {
      return this.#canvas.toDataURL(type, quality);
    }
    const composed = base.ownerDocument.createElement('canvas');
    composed.width = base.width;
    composed.height = base.height;
    const context = composed.getContext('2d');
    if (context === null) return this.#canvas.toDataURL(type, quality);
    context.drawImage(base, 0, 0);
    context.drawImage(overlay, 0, 0);
    return composed.toDataURL(type, quality);
  }

  dispatchState(): ScatterWebGLDispatchState {
    return Object.freeze({ ...this.#state });
  }

  destroy(): void {
    const gl = this.#gl;
    if (gl !== null && this.#program !== null) gl.deleteProgram(this.#program);
    this.#program = null;
    this.#gl = null;
    this.#surface?.remove();
    this.#surface = null;
    this.#canvas.destroy();
    this.#lastScene = null;
    this.#state = { renderer: 'canvas', pointCount: 0, reason: 'destroyed' };
  }

  #drawPoints(points: readonly ScatterPoint[]): boolean {
    const gl = this.#gl;
    const program = this.#program;
    if (gl === null || program === null || this.#surface === null) return false;
    const colorValues = points.map(({ fill }) => colorChannels(fill));
    if (colorValues.some((color) => color === null)) return false;
    const positions = new Float32Array(points.length * 2);
    const colors = new Float32Array(points.length * 4);
    const sizes = new Float32Array(points.length);
    const shapes = new Float32Array(points.length);
    points.forEach((point, index) => {
      positions[index * 2] = point.x * this.#view.zoom + this.#view.offsetX;
      positions[index * 2 + 1] = point.y * this.#view.zoom + this.#view.offsetY;
      const color = colorValues[index]!;
      colors.set([color[0], color[1], color[2], color[3] * point.opacity], index * 4);
      sizes[index] = Math.max(1, point.radius * 2 * this.#view.zoom * this.#pixelRatio);
      shapes[index] = point.shape;
    });
    const bind = (name: string, values: Float32Array, size: number): WebGLBuffer | null => {
      const location = gl.getAttribLocation(program, name);
      if (location < 0) return null;
      const buffer = gl.createBuffer();
      if (buffer === null) return null;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      return buffer;
    };
    gl.viewport(0, 0, this.#surface.width, this.#surface.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    const position = bind('a_position', positions, 2);
    const color = bind('a_color', colors, 4);
    const size = bind('a_size', sizes, 1);
    const shape = bind('a_shape', shapes, 1);
    if (position === null || color === null || size === null || shape === null) {
      for (const buffer of [position, color, size, shape])
        if (buffer !== null) gl.deleteBuffer(buffer);
      return false;
    }
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    gl.uniform2f(resolution, this.#width, this.#height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.drawArrays(gl.POINTS, 0, points.length);
    for (const buffer of [position, color, size, shape]) gl.deleteBuffer(buffer);
    return true;
  }

  #clearPoints(): void {
    const gl = this.#gl;
    if (gl === null || this.#surface === null) return;
    gl.viewport(0, 0, this.#surface.width, this.#surface.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
}

export const scatterWebGLRendererFactory: RendererFactory = {
  name: 'webgl',
  capabilities,
  create: () => new ScatterWebGLRenderer(),
};
