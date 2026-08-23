import type { NormalizedControlLabelsSpec, NormalizedControlsSpec } from '../spec/types.js';

export interface ControlsState {
  readonly spec: NormalizedControlsSpec;
  readonly navigationEnabled: boolean;
  readonly viewDirty: boolean;
  readonly zoom: number;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly fullscreenAvailable: boolean;
  readonly fullscreen: boolean;
  readonly exportAvailable: boolean;
  readonly playbackEnabled: boolean;
  readonly playbackIndex: number;
  readonly playbackLength: number;
  readonly playing: boolean;
  readonly playbackRate: number;
  readonly loop: boolean;
  readonly frameLabel: string;
}

export interface ControlsActions {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly reset: () => void;
  readonly toggleFullscreen: () => void;
  readonly exportPng: () => void;
  readonly previousFrame: () => void;
  readonly togglePlayback: () => void;
  readonly nextFrame: () => void;
  readonly seek: (index: number) => void;
  readonly setRate: (rate: number) => void;
  readonly setLoop: (loop: boolean) => void;
}

interface Elements {
  readonly root: HTMLDivElement;
  readonly zoomIn?: HTMLButtonElement;
  readonly zoomOut?: HTMLButtonElement;
  readonly reset?: HTMLButtonElement;
  readonly fullscreen?: HTMLButtonElement;
  readonly exportPng?: HTMLButtonElement;
  readonly previousFrame?: HTMLButtonElement;
  readonly play?: HTMLButtonElement;
  readonly nextFrame?: HTMLButtonElement;
  readonly seek?: HTMLInputElement;
  readonly speed?: HTMLSelectElement;
  readonly loop?: HTMLButtonElement;
  readonly status: HTMLSpanElement;
}

const buttonStyle =
  'display:inline-grid;place-items:center;min-width:30px;height:30px;padding:0 8px;border:1px solid rgba(148,163,184,.5);border-radius:8px;background:rgba(255,255,255,.94);color:#0f172a;font:600 13px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer';

function button(glyph: string, label: string, action: () => void): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = glyph;
  element.title = label;
  element.setAttribute('aria-label', label);
  element.style.cssText = buttonStyle;
  element.addEventListener('click', action);
  return element;
}

function updateLabel(element: HTMLElement, label: string): void {
  element.title = label;
  element.setAttribute('aria-label', label);
}

function separator(): HTMLSpanElement {
  const element = document.createElement('span');
  element.setAttribute('aria-hidden', 'true');
  element.style.cssText = 'width:1px;height:20px;background:rgba(148,163,184,.45)';
  return element;
}

export class ControlsController {
  #elements: Elements | null = null;
  #signature = '';

  sync(host: HTMLElement, state: ControlsState, actions: ControlsActions): void {
    const signature = JSON.stringify({
      zoom: state.spec.zoom,
      reset: state.spec.reset,
      fullscreen: state.spec.fullscreen,
      export: state.spec.export,
      playback: state.spec.playback,
      labels: state.spec.labels,
    });
    if (this.#elements === null || this.#signature !== signature) {
      this.destroy();
      this.#elements = this.#create(state.spec, actions);
      this.#signature = signature;
    }
    const elements = this.#elements;
    if (elements.root.parentElement !== host) host.append(elements.root);
    this.#update(elements, state);
  }

  destroy(): void {
    this.#elements?.root.remove();
    this.#elements = null;
    this.#signature = '';
  }

  #create(spec: NormalizedControlsSpec, actions: ControlsActions): Elements {
    const root = document.createElement('div');
    root.dataset.graflumeControls = 'true';
    root.setAttribute('role', 'toolbar');
    root.setAttribute('aria-label', spec.labels.controls);
    root.style.cssText =
      'position:absolute;z-index:30;top:8px;right:8px;display:flex;align-items:center;gap:4px;max-width:calc(100% - 16px);padding:4px;border:1px solid rgba(148,163,184,.35);border-radius:10px;background:rgba(248,250,252,.9);box-shadow:0 4px 16px rgba(15,23,42,.12);backdrop-filter:blur(6px);overflow-x:auto;overscroll-behavior:contain';
    root.addEventListener('pointerdown', (event) => event.stopPropagation());

    const elements: {
      root: HTMLDivElement;
      zoomIn?: HTMLButtonElement;
      zoomOut?: HTMLButtonElement;
      reset?: HTMLButtonElement;
      fullscreen?: HTMLButtonElement;
      exportPng?: HTMLButtonElement;
      previousFrame?: HTMLButtonElement;
      play?: HTMLButtonElement;
      nextFrame?: HTMLButtonElement;
      seek?: HTMLInputElement;
      speed?: HTMLSelectElement;
      loop?: HTMLButtonElement;
      status?: HTMLSpanElement;
    } = { root };
    const labels = spec.labels;

    if (spec.zoom) {
      elements.zoomOut = button('−', labels.zoomOut, actions.zoomOut);
      elements.zoomIn = button('+', labels.zoomIn, actions.zoomIn);
      root.append(elements.zoomOut, elements.zoomIn);
    }
    if (spec.reset) {
      elements.reset = button('↺', labels.reset, actions.reset);
      root.append(elements.reset);
    }
    if ((spec.zoom || spec.reset) && (spec.fullscreen || spec.export || spec.playback)) {
      root.append(separator());
    }
    if (spec.fullscreen) {
      elements.fullscreen = button('⛶', labels.enterFullscreen, actions.toggleFullscreen);
      root.append(elements.fullscreen);
    }
    if (spec.export) {
      elements.exportPng = button('⇩', labels.exportPng, actions.exportPng);
      root.append(elements.exportPng);
    }
    if ((spec.fullscreen || spec.export) && spec.playback) root.append(separator());
    if (spec.playback) {
      elements.previousFrame = button('◀', labels.previousFrame, actions.previousFrame);
      elements.play = button('▶', labels.play, actions.togglePlayback);
      elements.nextFrame = button('▶|', labels.nextFrame, actions.nextFrame);
      const seek = document.createElement('input');
      seek.type = 'range';
      seek.min = '0';
      seek.step = '1';
      seek.title = labels.seek;
      seek.setAttribute('aria-label', labels.seek);
      seek.style.cssText = 'width:clamp(72px,14vw,128px);accent-color:#4f46e5';
      seek.addEventListener('input', () => actions.seek(Number(seek.value)));
      elements.seek = seek;
      const speed = document.createElement('select');
      speed.title = labels.speed;
      speed.setAttribute('aria-label', labels.speed);
      speed.style.cssText =
        'height:30px;border:1px solid rgba(148,163,184,.5);border-radius:8px;background:#fff;color:#0f172a;font:600 12px/1 ui-sans-serif,system-ui;padding:0 4px';
      for (const rate of [0.25, 0.5, 1, 2, 4]) {
        const option = document.createElement('option');
        option.value = String(rate);
        option.textContent = `${rate}×`;
        speed.append(option);
      }
      speed.addEventListener('change', () => actions.setRate(Number(speed.value)));
      elements.speed = speed;
      elements.loop = button('↻', labels.loop, () =>
        actions.setLoop(elements.loop?.getAttribute('aria-pressed') !== 'true'),
      );
      root.append(
        elements.previousFrame,
        elements.play,
        elements.nextFrame,
        seek,
        speed,
        elements.loop,
      );
    }
    const status = document.createElement('span');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    status.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
    root.append(status);
    elements.status = status;
    return elements as Elements;
  }

  #update(elements: Elements, state: ControlsState): void {
    const labels: NormalizedControlLabelsSpec = state.spec.labels;
    if (elements.zoomIn !== undefined) {
      elements.zoomIn.disabled = !state.navigationEnabled || state.zoom >= state.maxZoom;
    }
    if (elements.zoomOut !== undefined) {
      elements.zoomOut.disabled = !state.navigationEnabled || state.zoom <= state.minZoom;
    }
    if (elements.reset !== undefined) {
      elements.reset.disabled = !state.navigationEnabled || !state.viewDirty;
    }
    if (elements.fullscreen !== undefined) {
      elements.fullscreen.disabled = !state.fullscreenAvailable;
      updateLabel(
        elements.fullscreen,
        state.fullscreen ? labels.exitFullscreen : labels.enterFullscreen,
      );
      elements.fullscreen.setAttribute('aria-pressed', String(state.fullscreen));
    }
    if (elements.exportPng !== undefined) elements.exportPng.disabled = !state.exportAvailable;

    const playbackDisabled = !state.playbackEnabled || state.playbackLength <= 1;
    if (elements.previousFrame !== undefined) elements.previousFrame.disabled = playbackDisabled;
    if (elements.nextFrame !== undefined) elements.nextFrame.disabled = playbackDisabled;
    if (elements.play !== undefined) {
      elements.play.disabled = playbackDisabled;
      elements.play.textContent = state.playing ? '❚❚' : '▶';
      updateLabel(elements.play, state.playing ? labels.pause : labels.play);
      elements.play.setAttribute('aria-pressed', String(state.playing));
    }
    if (elements.seek !== undefined) {
      elements.seek.disabled = !state.playbackEnabled || state.playbackLength === 0;
      elements.seek.max = String(Math.max(0, state.playbackLength - 1));
      elements.seek.value = String(Math.max(0, state.playbackIndex));
      elements.seek.setAttribute('aria-valuetext', state.frameLabel);
    }
    if (elements.speed !== undefined) {
      elements.speed.disabled = !state.playbackEnabled;
      const rate = String(state.playbackRate);
      if (![...elements.speed.options].some((option) => option.value === rate)) {
        const option = document.createElement('option');
        option.value = rate;
        option.textContent = `${rate}×`;
        elements.speed.append(option);
      }
      elements.speed.value = rate;
    }
    if (elements.loop !== undefined) {
      elements.loop.disabled = !state.playbackEnabled;
      elements.loop.setAttribute('aria-pressed', String(state.loop));
    }
    for (const element of [
      elements.zoomIn,
      elements.zoomOut,
      elements.reset,
      elements.fullscreen,
      elements.exportPng,
      elements.previousFrame,
      elements.play,
      elements.nextFrame,
      elements.loop,
    ]) {
      if (element === undefined) continue;
      element.style.opacity = element.disabled ? '0.48' : '1';
      element.style.cursor = element.disabled ? 'not-allowed' : 'pointer';
    }
    if (!state.playing) {
      elements.status.textContent = state.playbackEnabled
        ? `${Math.round(state.zoom * 100)}%. ${state.frameLabel}`
        : `${Math.round(state.zoom * 100)}%`;
    }
  }
}
