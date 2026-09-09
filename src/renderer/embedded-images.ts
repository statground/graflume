import { GraflumeError } from '../core/errors.js';
import { embeddedImageLimits, validateImageNode, type EmbeddedImageInfo } from '../scene/image.js';
import type { SceneNode } from '../scene/types.js';

export function sceneImages(root: SceneNode): Map<string, EmbeddedImageInfo> {
  const result = new Map<string, EmbeddedImageInfo>();
  let count = 0,
    pixels = 0,
    bytes = 0,
    nodes = 0;
  const visit = (node: SceneNode, depth: number): void => {
    if (++nodes > 100_000 || depth > 64)
      throw new GraflumeError('INVALID_SPEC', 'Image scene exceeds its node budget.');
    if (node.type === 'group') {
      node.children.forEach((child) => visit(child, depth + 1));
      return;
    }
    if (node.type !== 'image') return;
    if (++count > embeddedImageLimits.sceneImages)
      throw new GraflumeError('INVALID_SPEC', 'Scene contains too many embedded images.');
    const info = validateImageNode(node);
    // SVG and snapshot JSON contain each occurrence, even when decoded pixels are shared.
    bytes += info.bytes;
    if (bytes > embeddedImageLimits.sceneBytes)
      throw new GraflumeError('INVALID_SPEC', 'Scene exceeds its embedded image byte budget.');
    if (result.has(node.dataURI)) return;
    pixels += info.width * info.height;
    if (pixels > embeddedImageLimits.scenePixels || bytes > embeddedImageLimits.sceneBytes)
      throw new GraflumeError('INVALID_SPEC', 'Scene exceeds its embedded image budget.');
    result.set(node.dataURI, info);
  };
  visit(root, 0);
  return result;
}

interface ImageState {
  readonly promise: Promise<void>;
  readonly info: EmbeddedImageInfo;
  image?: CanvasImageSource;
  dispose?: () => void;
  error?: Error;
}

/** Per-renderer decoded resources, shared only with that renderer's export surface. */
export class EmbeddedImages {
  readonly #states = new Map<string, ImageState>();
  readonly #listeners = new Set<() => void>();

  subscribe(callback: () => void): () => void {
    this.#listeners.add(callback);
    return () => this.#listeners.delete(callback);
  }

  reconcile(root: SceneNode): void {
    const images = sceneImages(root);
    for (const [uri, state] of this.#states)
      if (!images.has(uri)) {
        state.dispose?.();
        this.#states.delete(uri);
      }
    for (const [uri, info] of images) {
      if (this.#states.has(uri)) continue;
      const state: ImageState = {
        info,
        promise: Promise.resolve()
          .then(async () => {
            let image: CanvasImageSource, dispose: () => void;
            if (typeof createImageBitmap === 'function') {
              const binary = atob(uri.slice(uri.indexOf(',') + 1));
              const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
              const bitmap = await createImageBitmap(new Blob([bytes], { type: info.mime }));
              image = bitmap;
              dispose = () => bitmap.close();
              if (bitmap.width !== info.width || bitmap.height !== info.height) {
                dispose();
                throw new Error('Embedded image dimensions do not match its header.');
              }
            } else {
              if (typeof Image === 'undefined')
                throw new Error('Embedded image decoding is unavailable.');
              const element = new Image();
              element.src = uri;
              await element.decode();
              image = element;
              dispose = () => element.removeAttribute('src');
              if (element.naturalWidth !== info.width || element.naturalHeight !== info.height) {
                dispose();
                throw new Error('Embedded image dimensions do not match its header.');
              }
            }
            if (this.#states.get(uri) !== state) {
              dispose();
              return;
            }
            state.image = image;
            state.dispose = dispose;
            this.#listeners.forEach((callback) => callback());
          })
          .catch((error: unknown) => {
            if (this.#states.get(uri) === state)
              state.error =
                error instanceof Error ? error : new Error('Embedded image decode failed.');
            throw error;
          }),
      };
      this.#states.set(uri, state);
      void state.promise.catch(() => {});
    }
  }

  get(uri: string): CanvasImageSource | undefined {
    return this.#states.get(uri)?.image;
  }

  info(uri: string): EmbeddedImageInfo | undefined {
    return this.#states.get(uri)?.info;
  }

  async whenReady(): Promise<void> {
    for (;;) {
      const states = [...this.#states.values()];
      await Promise.all(
        states.map((state) =>
          state.promise.catch((error) => {
            if ([...this.#states.values()].includes(state)) throw error;
          }),
        ),
      );
      if ([...this.#states.values()].every((state) => states.includes(state))) return;
    }
  }

  assertReady(): void {
    for (const state of this.#states.values()) {
      if (state.error) throw state.error;
      if (!state.image)
        throw new GraflumeError(
          'UNSUPPORTED_RENDERER',
          'Embedded images are still decoding; await chart.whenReady() or toDataURLAsync().',
        );
    }
  }

  destroy(): void {
    this.#states.forEach((state) => state.dispose?.());
    this.#states.clear();
    this.#listeners.clear();
  }
}
