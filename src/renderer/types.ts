import type { Scene } from '../scene/types.js';

export interface RendererCapabilities {
  readonly vector: boolean;
  readonly gpu: boolean;
  readonly worker: boolean;
  readonly exportFormats: readonly string[];
}

export interface RendererMountOptions {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly ariaLabel: string;
  readonly ariaDescription?: string;
}

export interface Renderer {
  readonly name: string;
  readonly capabilities: RendererCapabilities;
  mount(target: HTMLElement, options: RendererMountOptions): void;
  resize(width: number, height: number, pixelRatio: number): void;
  render(scene: Scene): void;
  surface(): HTMLElement | null;
  toDataURL?(type?: string, quality?: number): string;
  destroy(): void;
}

export interface RendererFactory {
  readonly name: string;
  readonly capabilities: RendererCapabilities;
  create(): Renderer;
}
