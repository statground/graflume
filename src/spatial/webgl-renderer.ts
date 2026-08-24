import { spatialColor } from './compile.js';
import {
  cameraEye,
  dot3,
  normalize3,
  projectPoint,
  subtract3,
  viewProjectionMat4,
} from './math.js';
import type {
  CompiledSpatialGeometry,
  CompiledSpatialScene,
  SpatialCameraState,
  SpatialHitResult,
  SpatialLightingSpec,
  SpatialPickTarget,
} from './types.js';

type WebGLContext = WebGLRenderingContext | WebGL2RenderingContext;

interface GpuGeometry {
  readonly source: CompiledSpatialGeometry;
  readonly alphaClass: SpatialGeometryAlphaClass;
  readonly center: readonly [number, number, number];
  readonly position: WebGLBuffer;
  readonly normal: WebGLBuffer;
  readonly color: WebGLBuffer;
  readonly size: WebGLBuffer;
  readonly index?: WebGLBuffer;
  readonly indexType?: number;
  readonly indexCount?: number;
}

export type SpatialGeometryAlphaClass = 'hidden' | 'opaque' | 'transparent';

export function spatialGeometryAlphaClass(
  geometry: Pick<CompiledSpatialGeometry, 'colors'>,
): SpatialGeometryAlphaClass {
  let minimum = 1;
  let maximum = 0;
  for (let index = 3; index < geometry.colors.length; index += 4) {
    const alpha = geometry.colors[index] ?? 0;
    minimum = Math.min(minimum, alpha);
    maximum = Math.max(maximum, alpha);
  }
  if (maximum <= 0) return 'hidden';
  return minimum >= 1 ? 'opaque' : 'transparent';
}

function geometryCenter(positions: Float32Array): readonly [number, number, number] {
  if (positions.length < 3) return [0, 0, 0];
  let x = 0;
  let y = 0;
  let z = 0;
  const count = Math.floor(positions.length / 3);
  for (let index = 0; index < count; index += 1) {
    x += positions[index * 3] ?? 0;
    y += positions[index * 3 + 1] ?? 0;
    z += positions[index * 3 + 2] ?? 0;
  }
  return [x / count, y / count, z / count];
}

function squaredDistance(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  return (left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2 + (left[2] - right[2]) ** 2;
}

interface ProgramState {
  readonly program: WebGLProgram;
  readonly position: number;
  readonly normal: number;
  readonly color: number;
  readonly size: number;
  readonly mvp: WebGLUniformLocation;
  readonly lightDirection: WebGLUniformLocation;
  readonly ambient: WebGLUniformLocation;
  readonly diffuse: WebGLUniformLocation;
  readonly pixelRatio: WebGLUniformLocation;
  readonly pointMode: WebGLUniformLocation;
}

interface PickProgramState {
  readonly program: WebGLProgram;
  readonly position: number;
  readonly color: number;
  readonly mvp: WebGLUniformLocation;
  readonly pointDiameter: WebGLUniformLocation;
}

interface GpuPickState {
  readonly position: WebGLBuffer;
  readonly color: WebGLBuffer;
  readonly count: number;
}

export interface SpatialRendererCallbacks {
  readonly contextLost: () => void;
  readonly contextRestored: () => void;
  readonly unavailable: (message: string) => void;
  readonly error: (error: unknown) => void;
}

const vertexShaderSource = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_color;
attribute float a_size;
uniform mat4 u_mvp;
uniform float u_pixelRatio;
varying vec3 v_normal;
varying vec4 v_color;
void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
  gl_PointSize = max(1.0, a_size * u_pixelRatio);
  v_normal = a_normal;
  v_color = a_color;
}
`;

const fragmentShaderSource = `
precision highp float;
uniform vec3 u_lightDirection;
uniform float u_ambient;
uniform float u_diffuse;
uniform float u_pointMode;
varying vec3 v_normal;
varying vec4 v_color;
void main() {
  float edgeAlpha = 1.0;
  vec3 normal = normalize(v_normal);
  if (u_pointMode > 0.5) {
    vec2 centered = gl_PointCoord * 2.0 - 1.0;
    float radiusSquared = dot(centered, centered);
    if (radiusSquared > 1.0) discard;
    normal = normalize(vec3(centered.x, -centered.y, sqrt(max(0.0, 1.0 - radiusSquared))));
    float coverage = 1.0 - smoothstep(0.82, 1.0, sqrt(radiusSquared));
    if (coverage < 0.04) discard;
    edgeAlpha = v_color.a >= 0.999 ? 1.0 : coverage;
  } else if (!gl_FrontFacing) {
    normal = -normal;
  }
  float lambert = max(dot(normal, normalize(-u_lightDirection)), 0.0);
  float light = clamp(u_ambient + u_diffuse * lambert, 0.0, 1.5);
  if (u_pointMode > 0.5) {
    float centerLight = 0.5 + normal.z * 0.5;
    light = clamp(u_ambient + u_diffuse * (lambert * 0.45 + centerLight * 0.55), 0.0, 1.5);
  }
  gl_FragColor = vec4(v_color.rgb * light, v_color.a * edgeAlpha);
}
`;

const pickVertexShaderSource = `
attribute vec3 a_position;
attribute vec4 a_pickColor;
uniform mat4 u_mvp;
uniform float u_pointDiameter;
varying vec4 v_pickColor;
void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
  gl_PointSize = u_pointDiameter;
  v_pickColor = a_pickColor;
}
`;

const pickFragmentShaderSource = `
precision highp float;
varying vec4 v_pickColor;
void main() {
  vec2 centered = gl_PointCoord * 2.0 - 1.0;
  if (dot(centered, centered) > 1.0) discard;
  gl_FragColor = v_pickColor;
}
`;

function createShader(gl: WebGLContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('Unable to allocate a GPU shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader compilation error.';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function requiredLocation(
  gl: WebGLContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`GPU uniform ${name} was optimized away.`);
  return location;
}

function createProgram(gl: WebGLContext): ProgramState {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (program === null) throw new Error('Unable to allocate a GPU program.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown GPU program link error.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  const position = gl.getAttribLocation(program, 'a_position');
  const normal = gl.getAttribLocation(program, 'a_normal');
  const color = gl.getAttribLocation(program, 'a_color');
  const size = gl.getAttribLocation(program, 'a_size');
  if (position < 0 || normal < 0 || color < 0 || size < 0)
    throw new Error('GPU program is missing a required vertex attribute.');
  return {
    program,
    position,
    normal,
    color,
    size,
    mvp: requiredLocation(gl, program, 'u_mvp'),
    lightDirection: requiredLocation(gl, program, 'u_lightDirection'),
    ambient: requiredLocation(gl, program, 'u_ambient'),
    diffuse: requiredLocation(gl, program, 'u_diffuse'),
    pixelRatio: requiredLocation(gl, program, 'u_pixelRatio'),
    pointMode: requiredLocation(gl, program, 'u_pointMode'),
  };
}

function createPickProgram(gl: WebGLContext): PickProgramState {
  const vertex = createShader(gl, gl.VERTEX_SHADER, pickVertexShaderSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, pickFragmentShaderSource);
  const program = gl.createProgram();
  if (program === null) throw new Error('Unable to allocate a GPU picking program.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'Unknown GPU picking program link error.';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  const position = gl.getAttribLocation(program, 'a_position');
  const color = gl.getAttribLocation(program, 'a_pickColor');
  if (position < 0 || color < 0)
    throw new Error('GPU picking program is missing a required vertex attribute.');
  return {
    program,
    position,
    color,
    mvp: requiredLocation(gl, program, 'u_mvp'),
    pointDiameter: requiredLocation(gl, program, 'u_pointDiameter'),
  };
}

function encodedPickColor(identifier: number): readonly [number, number, number, number] {
  return [
    (identifier & 0xff) / 255,
    ((identifier >>> 8) & 0xff) / 255,
    ((identifier >>> 16) & 0xff) / 255,
    1,
  ];
}

function decodedPickIdentifier(pixel: Uint8Array): number {
  return (pixel[0] ?? 0) | ((pixel[1] ?? 0) << 8) | ((pixel[2] ?? 0) << 16);
}

export function isGlobePickFrontFacing(
  pick: SpatialPickTarget,
  camera: SpatialCameraState,
): boolean {
  if (pick.occlusion !== 'globe-front') return true;
  const outward = normalize3(pick.position);
  return dot3(outward, subtract3(cameraEye(camera), pick.position)) > 0;
}

function createArrayBuffer(gl: WebGLContext, data: Float32Array): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (buffer === null) throw new Error('Unable to allocate a GPU buffer.');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return buffer;
}

function maximumIndex(indices: Uint32Array): number {
  let maximum = 0;
  for (const index of indices) maximum = Math.max(maximum, index);
  return maximum;
}

function createIndexBuffer(
  gl: WebGLContext,
  indices: Uint32Array,
): { readonly buffer: WebGLBuffer; readonly type: number } {
  const buffer = gl.createBuffer();
  if (buffer === null) throw new Error('Unable to allocate a GPU index buffer.');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  if (maximumIndex(indices) <= 65_535) {
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    return { buffer, type: gl.UNSIGNED_SHORT };
  }
  const isWebGL2 =
    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (!isWebGL2 && gl.getExtension('OES_element_index_uint') === null)
    throw new Error('This GPU cannot address a spatial mesh with more than 65,535 vertices.');
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  return { buffer, type: gl.UNSIGNED_INT };
}

function primitiveMode(gl: WebGLContext, geometry: CompiledSpatialGeometry): number {
  if (geometry.primitive === 'points') return gl.POINTS;
  if (geometry.primitive === 'lines') return gl.LINES;
  return gl.TRIANGLES;
}

function bindAttribute(
  gl: WebGLContext,
  location: number,
  buffer: WebGLBuffer,
  size: number,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

export class SpatialWebGLRenderer {
  readonly #callbacks: SpatialRendererCallbacks;
  readonly #canvas: HTMLCanvasElement;
  #gl: WebGLContext | null = null;
  #program: ProgramState | null = null;
  #pickProgram: PickProgramState | null = null;
  #scene: CompiledSpatialScene | null = null;
  #camera: SpatialCameraState | null = null;
  #geometries: GpuGeometry[] = [];
  #pickGpu: GpuPickState | null = null;
  #pickTargets: SpatialPickTarget[] = [];
  #pickFramebuffer: WebGLFramebuffer | null = null;
  #pickTexture: WebGLTexture | null = null;
  #pickDepth: WebGLRenderbuffer | null = null;
  #pickDirty = true;
  #pickRadius = -1;
  #width = 1;
  #height = 1;
  #pixelRatio = 1;
  #lost = false;
  #destroyed = false;

  readonly #contextLostListener = (event: Event): void => {
    event.preventDefault();
    this.#lost = true;
    this.#geometries = [];
    this.#program = null;
    this.#pickProgram = null;
    this.#pickGpu = null;
    this.#pickFramebuffer = null;
    this.#pickTexture = null;
    this.#pickDepth = null;
    this.#pickDirty = true;
    this.#callbacks.contextLost();
  };

  readonly #contextRestoredListener = (): void => {
    this.#lost = false;
    try {
      this.#initializeContext();
      this.#uploadScene();
      this.render();
      this.#callbacks.contextRestored();
    } catch (error) {
      this.#lost = true;
      this.#callbacks.unavailable(error instanceof Error ? error.message : String(error));
      this.#callbacks.error(error);
    }
  };

  constructor(callbacks: SpatialRendererCallbacks) {
    this.#callbacks = callbacks;
    this.#canvas = document.createElement('canvas');
    this.#canvas.dataset.graflumeSpatialSurface = 'true';
    this.#canvas.setAttribute('role', 'img');
    this.#canvas.tabIndex = 0;
    this.#canvas.style.display = 'block';
    this.#canvas.style.width = '100%';
    this.#canvas.style.height = '100%';
    this.#canvas.style.touchAction = 'pan-y';
    this.#canvas.addEventListener('webglcontextlost', this.#contextLostListener);
    this.#canvas.addEventListener('webglcontextrestored', this.#contextRestoredListener);
  }

  mount(target: HTMLElement, ariaLabel: string, ariaDescription?: string): boolean {
    this.#canvas.setAttribute('aria-label', ariaLabel);
    if (ariaDescription !== undefined)
      this.#canvas.setAttribute('aria-description', ariaDescription);
    target.append(this.#canvas);
    try {
      this.#initializeContext();
      return true;
    } catch (error) {
      this.#canvas.hidden = true;
      this.#callbacks.unavailable(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  surface(): HTMLCanvasElement {
    return this.#canvas;
  }

  available(): boolean {
    return this.#gl !== null && this.#program !== null && !this.#lost && !this.#destroyed;
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.#width = Math.max(1, width);
    this.#height = Math.max(1, height);
    this.#pixelRatio = Math.max(0.25, Math.min(4, pixelRatio));
    const physicalWidth = Math.max(1, Math.round(this.#width * this.#pixelRatio));
    const physicalHeight = Math.max(1, Math.round(this.#height * this.#pixelRatio));
    const physicalSizeChanged =
      this.#canvas.width !== physicalWidth || this.#canvas.height !== physicalHeight;
    if (this.#canvas.width !== physicalWidth) this.#canvas.width = physicalWidth;
    if (this.#canvas.height !== physicalHeight) this.#canvas.height = physicalHeight;
    if (physicalSizeChanged) this.#deletePickingFramebuffer();
    this.#canvas.style.width = `${this.#width}px`;
    this.#canvas.style.height = `${this.#height}px`;
    this.#pickDirty = true;
    this.render();
  }

  setScene(scene: CompiledSpatialScene): void {
    this.#scene = scene;
    this.#pickDirty = true;
    this.#uploadScene();
  }

  setCamera(camera: SpatialCameraState): void {
    this.#camera = camera;
    this.#pickDirty = true;
  }

  render(): void {
    const gl = this.#gl;
    const program = this.#program;
    const scene = this.#scene;
    const camera = this.#camera;
    if (gl === null || program === null || scene === null || camera === null || this.#lost) return;
    gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
    const background = spatialColor(
      scene.spec.background ?? scene.theme.colors.panel ?? scene.theme.colors.surface,
    );
    gl.clearColor(background[0], background[1], background[2], background[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program.program);
    const matrix = viewProjectionMat4(camera, this.#width, this.#height);
    gl.uniformMatrix4fv(program.mvp, false, matrix);
    const lighting: SpatialLightingSpec = scene.spec.lighting ?? {};
    const direction = lighting.direction ?? [0.4, 0.8, 0.7];
    gl.uniform3f(program.lightDirection, direction[0], direction[1], direction[2]);
    gl.uniform1f(program.ambient, Math.max(0, lighting.ambient ?? 0.42));
    gl.uniform1f(program.diffuse, Math.max(0, lighting.diffuse ?? 0.72));
    gl.uniform1f(program.pixelRatio, this.#pixelRatio);
    const opaque = this.#geometries.filter(({ alphaClass }) => alphaClass === 'opaque');
    const eye = cameraEye(camera);
    const transparent = this.#geometries
      .filter(({ alphaClass }) => alphaClass === 'transparent')
      .sort(
        (left, right) => squaredDistance(right.center, eye) - squaredDistance(left.center, eye),
      );
    gl.depthMask(true);
    this.#drawGeometries(gl, program, opaque);
    gl.depthMask(false);
    this.#drawGeometries(gl, program, transparent);
    gl.depthMask(true);
  }

  hitTest(x: number, y: number, radius = 14): SpatialHitResult | null {
    const scene = this.#scene;
    const camera = this.#camera;
    if (scene === null || camera === null) return null;
    const gpuPick = this.#gpuHitTest(x, y, radius);
    if (gpuPick !== undefined) return gpuPick;
    const matrix = viewProjectionMat4(camera, this.#width, this.#height);
    let best: SpatialHitResult | null = null;
    let bestDistance = radius;
    for (const geometry of scene.geometries) {
      if (spatialGeometryAlphaClass(geometry) === 'hidden') continue;
      for (const pick of geometry.picks) {
        if (!isGlobePickFrontFacing(pick, camera)) continue;
        const projected = projectPoint(matrix, pick.position, this.#width, this.#height);
        if (!projected.visible) continue;
        const distance = Math.hypot(projected.x - x, projected.y - y);
        if (
          distance > bestDistance ||
          (Math.abs(distance - bestDistance) < 0.01 &&
            best !== null &&
            projected.depth >= best.screen.depth)
        )
          continue;
        bestDistance = distance;
        best = { ...pick, screen: { x: projected.x, y: projected.y, depth: projected.depth } };
      }
    }
    return best;
  }

  project(position: readonly [number, number, number]): Readonly<{
    x: number;
    y: number;
    depth: number;
    visible: boolean;
  }> | null {
    const camera = this.#camera;
    if (camera === null) return null;
    return projectPoint(
      viewProjectionMat4(camera, this.#width, this.#height),
      position,
      this.#width,
      this.#height,
    );
  }

  toDataURL(): string {
    this.render();
    return this.#canvas.toDataURL('image/png');
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#deleteGpuResources();
    this.#canvas.removeEventListener('webglcontextlost', this.#contextLostListener);
    this.#canvas.removeEventListener('webglcontextrestored', this.#contextRestoredListener);
    this.#canvas.remove();
    this.#gl = null;
    this.#program = null;
    this.#scene = null;
  }

  #initializeContext(): void {
    if (this.#destroyed) throw new Error('Spatial renderer has been destroyed.');
    const attributes: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      depth: true,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    };
    const gl =
      this.#canvas.getContext('webgl2', attributes) ?? this.#canvas.getContext('webgl', attributes);
    if (gl === null) throw new Error('Hardware-accelerated 3D rendering is unavailable.');
    this.#gl = gl;
    this.#program = createProgram(gl);
    this.#pickProgram = createPickProgram(gl);
    this.#pickDirty = true;
  }

  #uploadScene(): void {
    const gl = this.#gl;
    const scene = this.#scene;
    if (gl === null || scene === null || this.#lost) return;
    this.#deleteGeometryBuffers();
    this.#geometries = scene.geometries
      .filter((source) => spatialGeometryAlphaClass(source) !== 'hidden')
      .map((source) => {
        const base = {
          source,
          alphaClass: spatialGeometryAlphaClass(source),
          center: geometryCenter(source.positions),
          position: createArrayBuffer(gl, source.positions),
          normal: createArrayBuffer(gl, source.normals),
          color: createArrayBuffer(gl, source.colors),
          size: createArrayBuffer(gl, source.sizes),
        };
        if (source.indices === undefined) return base;
        const index = createIndexBuffer(gl, source.indices);
        return {
          ...base,
          index: index.buffer,
          indexType: index.type,
          indexCount: source.indices.length,
        };
      });
    this.#uploadPickTargets();
    this.#pickDirty = true;
  }

  #uploadPickTargets(): void {
    const gl = this.#gl;
    const scene = this.#scene;
    if (gl === null || scene === null) return;
    for (const geometry of this.#geometries)
      for (const pick of geometry.source.picks) this.#pickTargets.push(pick);
    if (this.#pickTargets.length === 0) return;
    if (this.#pickTargets.length > 0xff_ff_ff)
      throw new RangeError('The GPU picking pass supports at most 16,777,215 targets.');
    const positions = new Float32Array(this.#pickTargets.length * 3);
    const colors = new Float32Array(this.#pickTargets.length * 4);
    for (const [index, pick] of this.#pickTargets.entries()) {
      positions.set(pick.position, index * 3);
      colors.set(encodedPickColor(index + 1), index * 4);
    }
    this.#pickGpu = {
      position: createArrayBuffer(gl, positions),
      color: createArrayBuffer(gl, colors),
      count: this.#pickTargets.length,
    };
  }

  #drawGeometries(
    gl: WebGLContext,
    program: ProgramState,
    geometries: readonly GpuGeometry[] = this.#geometries,
  ): void {
    for (const geometry of geometries) {
      bindAttribute(gl, program.position, geometry.position, 3);
      bindAttribute(gl, program.normal, geometry.normal, 3);
      bindAttribute(gl, program.color, geometry.color, 4);
      bindAttribute(gl, program.size, geometry.size, 1);
      gl.uniform1f(program.pointMode, geometry.source.primitive === 'points' ? 1 : 0);
      const mode = primitiveMode(gl, geometry.source);
      if (
        geometry.index !== undefined &&
        geometry.indexType !== undefined &&
        geometry.indexCount !== undefined
      ) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.index);
        gl.drawElements(mode, geometry.indexCount, geometry.indexType, 0);
      } else {
        gl.drawArrays(mode, 0, geometry.source.positions.length / 3);
      }
    }
  }

  #prepareSceneProgram(
    gl: WebGLContext,
    program: ProgramState,
    scene: CompiledSpatialScene,
    camera: SpatialCameraState,
  ): void {
    const matrix = viewProjectionMat4(camera, this.#width, this.#height);
    gl.useProgram(program.program);
    gl.uniformMatrix4fv(program.mvp, false, matrix);
    const lighting: SpatialLightingSpec = scene.spec.lighting ?? {};
    const direction = lighting.direction ?? [0.4, 0.8, 0.7];
    gl.uniform3f(program.lightDirection, direction[0], direction[1], direction[2]);
    gl.uniform1f(program.ambient, Math.max(0, lighting.ambient ?? 0.42));
    gl.uniform1f(program.diffuse, Math.max(0, lighting.diffuse ?? 0.72));
    gl.uniform1f(program.pixelRatio, this.#pixelRatio);
  }

  #ensurePickingFramebuffer(): void {
    const gl = this.#gl;
    if (gl === null || this.#pickFramebuffer !== null) return;
    const framebuffer = gl.createFramebuffer();
    const texture = gl.createTexture();
    const depth = gl.createRenderbuffer();
    if (framebuffer === null || texture === null || depth === null) {
      if (framebuffer !== null) gl.deleteFramebuffer(framebuffer);
      if (texture !== null) gl.deleteTexture(texture);
      if (depth !== null) gl.deleteRenderbuffer(depth);
      throw new Error('Unable to allocate the depth-aware picking target.');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.#canvas.width,
      this.#canvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16,
      this.#canvas.width,
      this.#canvas.height,
    );
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    if (!complete) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      gl.deleteRenderbuffer(depth);
      throw new Error('The depth-aware picking target is incomplete.');
    }
    this.#pickFramebuffer = framebuffer;
    this.#pickTexture = texture;
    this.#pickDepth = depth;
  }

  #renderPickingBuffer(radius: number): boolean {
    const gl = this.#gl;
    const program = this.#program;
    const pickProgram = this.#pickProgram;
    const scene = this.#scene;
    const camera = this.#camera;
    const pickGpu = this.#pickGpu;
    if (
      gl === null ||
      program === null ||
      pickProgram === null ||
      scene === null ||
      camera === null ||
      pickGpu === null ||
      this.#lost
    )
      return false;
    this.#ensurePickingFramebuffer();
    if (this.#pickFramebuffer === null) return false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#pickFramebuffer);
    gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
    gl.colorMask(true, true, true, true);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    this.#prepareSceneProgram(gl, program, scene, camera);
    gl.colorMask(false, false, false, false);
    this.#drawGeometries(
      gl,
      program,
      this.#geometries.filter(({ alphaClass }) => alphaClass === 'opaque'),
    );
    gl.colorMask(true, true, true, true);
    gl.useProgram(pickProgram.program);
    gl.uniformMatrix4fv(
      pickProgram.mvp,
      false,
      viewProjectionMat4(camera, this.#width, this.#height),
    );
    gl.uniform1f(pickProgram.pointDiameter, Math.max(2, radius * 2 * this.#pixelRatio));
    bindAttribute(gl, pickProgram.position, pickGpu.position, 3);
    bindAttribute(gl, pickProgram.color, pickGpu.color, 4);
    gl.drawArrays(gl.POINTS, 0, pickGpu.count);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.#pickDirty = false;
    this.#pickRadius = radius;
    return true;
  }

  #gpuHitTest(x: number, y: number, radius: number): SpatialHitResult | null | undefined {
    const gl = this.#gl;
    const camera = this.#camera;
    if (gl === null || camera === null || this.#lost) return undefined;
    if (this.#pickTargets.length === 0) return null;
    try {
      if (this.#pickDirty || this.#pickRadius !== radius) {
        if (!this.#renderPickingBuffer(radius)) return null;
      }
      if (this.#pickFramebuffer === null) return null;
      const physicalX = Math.max(
        0,
        Math.min(this.#canvas.width - 1, Math.floor(x * this.#pixelRatio)),
      );
      const physicalY = Math.max(
        0,
        Math.min(
          this.#canvas.height - 1,
          this.#canvas.height - 1 - Math.floor(y * this.#pixelRatio),
        ),
      );
      const pixel = new Uint8Array(4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.#pickFramebuffer);
      gl.readPixels(physicalX, physicalY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const identifier = decodedPickIdentifier(pixel);
      if (identifier === 0) return null;
      const pick = this.#pickTargets[identifier - 1];
      if (pick === undefined) return null;
      const projected = projectPoint(
        viewProjectionMat4(camera, this.#width, this.#height),
        pick.position,
        this.#width,
        this.#height,
      );
      if (!projected.visible) return null;
      return { ...pick, screen: { x: projected.x, y: projected.y, depth: projected.depth } };
    } catch (error) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.colorMask(true, true, true, true);
      gl.depthMask(true);
      this.#callbacks.error(error);
      return null;
    }
  }

  #deletePickingFramebuffer(): void {
    const gl = this.#gl;
    if (gl !== null) {
      if (this.#pickFramebuffer !== null) gl.deleteFramebuffer(this.#pickFramebuffer);
      if (this.#pickTexture !== null) gl.deleteTexture(this.#pickTexture);
      if (this.#pickDepth !== null) gl.deleteRenderbuffer(this.#pickDepth);
    }
    this.#pickFramebuffer = null;
    this.#pickTexture = null;
    this.#pickDepth = null;
    this.#pickDirty = true;
  }

  #deleteGeometryBuffers(): void {
    const gl = this.#gl;
    if (gl === null) return;
    for (const geometry of this.#geometries) {
      gl.deleteBuffer(geometry.position);
      gl.deleteBuffer(geometry.normal);
      gl.deleteBuffer(geometry.color);
      gl.deleteBuffer(geometry.size);
      if (geometry.index !== undefined) gl.deleteBuffer(geometry.index);
    }
    this.#geometries = [];
    if (this.#pickGpu !== null) {
      gl.deleteBuffer(this.#pickGpu.position);
      gl.deleteBuffer(this.#pickGpu.color);
      this.#pickGpu = null;
    }
    this.#pickTargets = [];
  }

  #deleteGpuResources(): void {
    const gl = this.#gl;
    if (gl === null) return;
    this.#deleteGeometryBuffers();
    if (this.#program !== null) gl.deleteProgram(this.#program.program);
    if (this.#pickProgram !== null) gl.deleteProgram(this.#pickProgram.program);
    this.#deletePickingFramebuffer();
  }
}
