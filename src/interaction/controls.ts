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
  readonly annotationsAvailable: boolean;
  readonly annotationsVisible: boolean;
  readonly playbackEnabled: boolean;
  readonly playbackIndex: number;
  readonly playbackLength: number;
  readonly playbackRangeStart: number;
  readonly playbackRangeEnd: number;
  readonly playing: boolean;
  readonly playbackRate: number;
  readonly loop: boolean;
  readonly frameLabel: string;
  readonly frameNamed: boolean;
}

export interface ControlsActions {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly reset: () => void;
  readonly toggleFullscreen: () => void;
  readonly exportPng: () => void;
  readonly toggleAnnotations: () => void;
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
  readonly annotations?: HTMLButtonElement;
  readonly previousFrame?: HTMLButtonElement;
  readonly play?: HTMLButtonElement;
  readonly nextFrame?: HTMLButtonElement;
  readonly playbackOptions?: HTMLButtonElement;
  readonly playbackPanel?: HTMLDivElement;
  readonly seek?: HTMLInputElement;
  readonly speed?: HTMLSelectElement;
  readonly loop?: HTMLButtonElement;
  readonly frameOutput?: HTMLOutputElement;
  readonly status: HTMLSpanElement;
}

type IconName =
  | 'zoom-in'
  | 'zoom-out'
  | 'reset'
  | 'fullscreen'
  | 'exit-fullscreen'
  | 'export'
  | 'annotations'
  | 'annotations-hidden'
  | 'previous'
  | 'play'
  | 'pause'
  | 'next'
  | 'playback-options'
  | 'loop';

const ICON_PATHS: Readonly<Record<IconName, string>> = {
  'zoom-in': 'M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM10.5 8v5M8 10.5h5M15 15l4.5 4.5',
  'zoom-out': 'M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM8 10.5h5M15 15l4.5 4.5',
  reset: 'M5 5v5h5M6.4 8.2A7 7 0 1 1 5.8 16',
  fullscreen: 'M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15',
  'exit-fullscreen': 'M9 4.5V9H4.5M19.5 9H15V4.5M15 19.5V15h4.5M4.5 15H9v4.5',
  export:
    'M4.5 8h3l1.4-2h6.2l1.4 2h3v10.5h-15V8ZM12 10a3.25 3.25 0 1 0 0 6.5A3.25 3.25 0 0 0 12 10Z',
  annotations: 'M4.5 5.5h15v10h-9l-4 3v-3h-2v-10Z',
  'annotations-hidden': 'M4.5 5.5h15v10h-5M10.5 15.5l-4 3v-3h-2v-10h2M4 4l16 16',
  previous: 'M6 5v14M18 6.5 9.5 12l8.5 5.5Z',
  play: 'M8 5.5 18 12 8 18.5Z',
  pause: 'M8.5 6v12M15.5 6v12',
  next: 'M18 5v14M6 6.5l8.5 5.5L6 17.5Z',
  'playback-options': 'M4 7h16M4 12h16M4 17h16M8 5v4M15 10v4M11 15v4',
  loop: 'M17.5 7.5H8a4 4 0 0 0-4 4M16 4l3.5 3.5L16 11M6.5 16.5H16a4 4 0 0 0 4-4M8 20l-3.5-3.5L8 13',
};

const CONTROL_STYLES = `
.graflume-controls{position:absolute;z-index:30;top:6px;right:6px;display:block;max-width:calc(100% - 12px);color:#334155;font:600 12px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;direction:ltr;opacity:.78;transition:opacity 120ms ease;pointer-events:auto;user-select:none;-webkit-user-select:none}
.graflume-controls:hover,.graflume-controls:focus-within{opacity:1}
.graflume-controls__strip{box-sizing:border-box;display:flex;align-items:center;gap:0;width:max-content;max-width:100%;height:30px;padding:0;border:1px solid rgba(100,116,139,.3);border-radius:5px;background:rgba(248,250,252,.9);box-shadow:0 2px 8px rgba(15,23,42,.12);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);overflow-x:auto;overflow-y:hidden;overscroll-behavior:contain;scrollbar-width:none}
.graflume-controls__strip::-webkit-scrollbar{display:none}
.graflume-controls__button{box-sizing:border-box;display:inline-grid;place-items:center;flex:0 0 28px;width:28px;height:28px;margin:0;padding:0;border:0;border-radius:3px;background:transparent;color:#475569;appearance:none;-webkit-appearance:none;cursor:pointer;touch-action:manipulation;transition:background-color 100ms ease,color 100ms ease,opacity 100ms ease}
.graflume-controls__button svg{display:block;width:16px;height:16px;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
.graflume-controls__button:hover:not(:disabled){background:rgba(226,232,240,.9);color:#0f172a}
.graflume-controls__button:focus-visible,.graflume-controls__select:focus-visible,.graflume-controls__seek:focus-visible{outline:2px solid #2563eb;outline-offset:-2px}
.graflume-controls__button[aria-pressed="true"],.graflume-controls__button[aria-expanded="true"]{background:rgba(219,234,254,.92);color:#1d4ed8}
.graflume-controls__button:disabled{opacity:.28;cursor:default}
.graflume-controls__separator{display:block;flex:0 0 1px;width:1px;height:16px;margin:0 2px;background:rgba(100,116,139,.25)}
.graflume-controls__panel{position:absolute;z-index:1;top:calc(100% + 4px);right:0;box-sizing:border-box;display:grid;grid-template-columns:minmax(112px,1fr) auto;align-items:center;gap:7px;width:196px;padding:7px;border:1px solid rgba(100,116,139,.28);border-radius:6px;background:rgba(248,250,252,.96);box-shadow:0 5px 16px rgba(15,23,42,.16);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.graflume-controls__panel[hidden]{display:none}
.graflume-controls__frame{grid-column:1/-1;display:block;min-width:0;overflow:hidden;color:#475569;font-size:11px;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}
.graflume-controls__seek{box-sizing:border-box;width:100%;height:20px;margin:0;accent-color:#2563eb;cursor:pointer}
.graflume-controls__select{box-sizing:border-box;height:28px;margin:0;padding:0 4px;border:1px solid rgba(100,116,139,.35);border-radius:4px;background:#fff;color:#334155;font:600 11px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
.graflume-controls__panel .graflume-controls__button{border:1px solid rgba(100,116,139,.24);background:#fff}
.graflume-controls__visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
[data-graflume-adaptive-viewport="micro"] .graflume-controls,[data-graflume-adaptive-viewport="narrow"] .graflume-controls{top:2px;right:2px;max-width:calc(100% - 4px);opacity:1}
[data-graflume-adaptive-viewport="micro"] .graflume-controls__strip,[data-graflume-adaptive-viewport="narrow"] .graflume-controls__strip{height:var(--graflume-control-target,44px);border:1px solid currentColor;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
[data-graflume-adaptive-viewport="micro"] .graflume-controls__button,[data-graflume-adaptive-viewport="narrow"] .graflume-controls__button{flex-basis:var(--graflume-control-target,44px);width:var(--graflume-control-target,44px);height:var(--graflume-control-target,44px)}
[data-graflume-adaptive-display="e-ink"] .graflume-controls,[data-graflume-adaptive-display="monochrome"] .graflume-controls,[data-graflume-adaptive-display="grid"] .graflume-controls,[data-graflume-adaptive-display="high-contrast"] .graflume-controls{color:#000;transition:none}
[data-graflume-adaptive-display="e-ink"] .graflume-controls__strip,[data-graflume-adaptive-display="monochrome"] .graflume-controls__strip,[data-graflume-adaptive-display="grid"] .graflume-controls__strip,[data-graflume-adaptive-display="high-contrast"] .graflume-controls__strip{border:2px solid #000;background:#fff;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
[data-graflume-adaptive-motion="reduced"] .graflume-controls,[data-graflume-adaptive-motion="reduced"] .graflume-controls__button,[data-graflume-adaptive-motion="static"] .graflume-controls,[data-graflume-adaptive-motion="static"] .graflume-controls__button{transition:none}
@media (pointer:coarse),(max-width:560px){.graflume-controls{top:2px;right:2px;max-width:calc(100% - 4px);opacity:.9}.graflume-controls__strip{height:44px;border:0;box-shadow:0 0 0 1px rgba(100,116,139,.3),0 2px 8px rgba(15,23,42,.12)}.graflume-controls__button{flex-basis:44px;width:44px;height:44px}.graflume-controls__button svg{width:17px;height:17px}.graflume-controls__separator{height:20px;margin:0 1px}.graflume-controls__panel{width:min(236px,calc(100vw - 8px));padding:8px;gap:8px}.graflume-controls__panel .graflume-controls__button{width:44px;height:44px}.graflume-controls__select{height:44px;min-width:58px}}
@media (prefers-reduced-motion:reduce){.graflume-controls,.graflume-controls__button{transition:none}}
`;

let panelSequence = 0;
const styleRegistry = new WeakMap<
  Document,
  { readonly element: HTMLStyleElement; references: number }
>();

function acquireStyles(document: Document): () => void {
  let entry = styleRegistry.get(document);
  if (entry === undefined) {
    const element = document.createElement('style');
    element.dataset.graflumeControlStyles = 'compact';
    element.textContent = CONTROL_STYLES;
    (document.head ?? document.documentElement).append(element);
    entry = { element, references: 0 };
    styleRegistry.set(document, entry);
  }
  entry.references += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = styleRegistry.get(document);
    if (current === undefined) return;
    current.references -= 1;
    if (current.references > 0) return;
    current.element.remove();
    styleRegistry.delete(document);
  };
}

function icon(document: Document, name: IconName): SVGSVGElement {
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  element.setAttribute('viewBox', '0 0 24 24');
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('focusable', 'false');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ICON_PATHS[name]);
  element.append(path);
  return element;
}

function setIcon(element: HTMLButtonElement, name: IconName): void {
  if (element.dataset.graflumeIcon === name) return;
  element.replaceChildren(icon(element.ownerDocument, name));
  element.dataset.graflumeIcon = name;
}

function button(
  document: Document,
  control: string,
  iconName: IconName,
  label: string,
  action: () => void,
): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'graflume-controls__button';
  element.dataset.graflumeControl = control;
  setIcon(element, iconName);
  element.title = label;
  element.setAttribute('aria-label', label);
  element.addEventListener('click', action);
  return element;
}

function updateLabel(element: HTMLElement, label: string): void {
  element.title = label;
  element.setAttribute('aria-label', label);
}

function separator(document: Document): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'graflume-controls__separator';
  element.setAttribute('aria-hidden', 'true');
  return element;
}

export class ControlsController {
  #elements: Elements | null = null;
  #signature = '';
  #panelDocument: Document | null = null;
  #releaseStyles: (() => void) | null = null;

  readonly #handleDocumentPointerDown = (event: Event): void => {
    const root = this.#elements?.root;
    if (root === undefined || event.composedPath().includes(root)) return;
    this.#setPlaybackOptionsOpen(false);
  };

  readonly #handleDocumentKeyDown = (event: Event): void => {
    if (!('key' in event) || event.key !== 'Escape') return;
    const toggle = this.#elements?.playbackOptions;
    if (toggle?.getAttribute('aria-expanded') !== 'true') return;
    this.#setPlaybackOptionsOpen(false);
    toggle.focus();
  };

  sync(host: HTMLElement, state: ControlsState, actions: ControlsActions): void {
    const signature = JSON.stringify({
      zoom: state.spec.zoom,
      reset: state.spec.reset,
      fullscreen: state.spec.fullscreen,
      export: state.spec.export,
      annotations: state.spec.annotations,
      annotationsAvailable: state.annotationsAvailable,
      playback: state.spec.playback,
      labels: state.spec.labels,
    });
    if (this.#elements === null || this.#signature !== signature) {
      this.destroy();
      this.#elements = this.#create(host.ownerDocument, state, actions);
      this.#signature = signature;
    }
    const elements = this.#elements;
    if (elements.root.parentElement !== host) host.append(elements.root);
    this.#update(elements, state);
  }

  destroy(): void {
    this.#detachPanelListeners();
    this.#elements?.root.remove();
    this.#releaseStyles?.();
    this.#releaseStyles = null;
    this.#elements = null;
    this.#signature = '';
  }

  #create(document: Document, state: ControlsState, actions: ControlsActions): Elements {
    const spec = state.spec;
    const root = document.createElement('div');
    root.className = 'graflume-controls';
    root.dataset.graflumeControls = 'true';
    root.dataset.graflumeControlsDensity = 'compact';
    root.dataset.graflumeControlsPlacement = 'top-right';
    root.dataset.graflumeControlsOpen = 'false';
    root.setAttribute('role', 'toolbar');
    root.setAttribute('aria-label', spec.labels.controls);
    root.setAttribute('dir', 'ltr');
    root.addEventListener('pointerdown', (event) => event.stopPropagation());

    const strip = document.createElement('div');
    strip.className = 'graflume-controls__strip';
    strip.dataset.graflumeControlsStrip = 'true';
    root.append(strip);

    const elements: {
      root: HTMLDivElement;
      zoomIn?: HTMLButtonElement;
      zoomOut?: HTMLButtonElement;
      reset?: HTMLButtonElement;
      fullscreen?: HTMLButtonElement;
      exportPng?: HTMLButtonElement;
      annotations?: HTMLButtonElement;
      previousFrame?: HTMLButtonElement;
      play?: HTMLButtonElement;
      nextFrame?: HTMLButtonElement;
      playbackOptions?: HTMLButtonElement;
      playbackPanel?: HTMLDivElement;
      seek?: HTMLInputElement;
      speed?: HTMLSelectElement;
      loop?: HTMLButtonElement;
      frameOutput?: HTMLOutputElement;
      status?: HTMLSpanElement;
    } = { root };
    const labels = spec.labels;
    const showAnnotations = spec.annotations && state.annotationsAvailable;

    if (spec.zoom) {
      elements.zoomOut = button(document, 'zoom-out', 'zoom-out', labels.zoomOut, actions.zoomOut);
      elements.zoomIn = button(document, 'zoom-in', 'zoom-in', labels.zoomIn, actions.zoomIn);
      strip.append(elements.zoomOut, elements.zoomIn);
    }
    if (spec.reset) {
      elements.reset = button(document, 'reset', 'reset', labels.reset, actions.reset);
      strip.append(elements.reset);
    }
    if (
      (spec.zoom || spec.reset) &&
      (spec.fullscreen || spec.export || showAnnotations || spec.playback)
    ) {
      strip.append(separator(document));
    }
    if (spec.fullscreen) {
      elements.fullscreen = button(
        document,
        'fullscreen',
        'fullscreen',
        labels.enterFullscreen,
        actions.toggleFullscreen,
      );
      strip.append(elements.fullscreen);
    }
    if (spec.export) {
      elements.exportPng = button(
        document,
        'export-png',
        'export',
        labels.exportPng,
        actions.exportPng,
      );
      strip.append(elements.exportPng);
    }
    if (showAnnotations) {
      elements.annotations = button(
        document,
        'annotations',
        'annotations',
        labels.hideAnnotations,
        actions.toggleAnnotations,
      );
      strip.append(elements.annotations);
    }
    if ((spec.fullscreen || spec.export || showAnnotations) && spec.playback)
      strip.append(separator(document));
    if (spec.playback) {
      const playbackOptionsLabel = `${labels.seek} · ${labels.speed} · ${labels.loop}`;
      elements.previousFrame = button(
        document,
        'previous-frame',
        'previous',
        labels.previousFrame,
        actions.previousFrame,
      );
      elements.play = button(document, 'playback', 'play', labels.play, actions.togglePlayback);
      elements.nextFrame = button(
        document,
        'next-frame',
        'next',
        labels.nextFrame,
        actions.nextFrame,
      );
      elements.playbackOptions = button(
        document,
        'playback-options',
        'playback-options',
        playbackOptionsLabel,
        () => this.#togglePlaybackOptions(),
      );
      const panelId = `graflume-playback-options-${++panelSequence}`;
      elements.playbackOptions.setAttribute('aria-controls', panelId);
      elements.playbackOptions.setAttribute('aria-expanded', 'false');
      elements.playbackOptions.setAttribute('aria-haspopup', 'dialog');
      strip.append(
        elements.previousFrame,
        elements.play,
        elements.nextFrame,
        elements.playbackOptions,
      );

      const panel = document.createElement('div');
      panel.id = panelId;
      panel.className = 'graflume-controls__panel';
      panel.dataset.graflumePlaybackPanel = 'true';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', playbackOptionsLabel);
      panel.hidden = true;
      elements.playbackPanel = panel;

      const frameOutput = document.createElement('output');
      frameOutput.className = 'graflume-controls__frame';
      frameOutput.title = labels.seek;
      frameOutput.setAttribute('aria-label', labels.seek);
      elements.frameOutput = frameOutput;

      const seek = document.createElement('input');
      seek.type = 'range';
      seek.min = '0';
      seek.step = '1';
      seek.className = 'graflume-controls__seek';
      seek.dataset.graflumeControl = 'playback-seek';
      seek.title = labels.seek;
      seek.setAttribute('aria-label', labels.seek);
      seek.addEventListener('input', () => actions.seek(Number(seek.value)));
      elements.seek = seek;

      const speed = document.createElement('select');
      speed.className = 'graflume-controls__select';
      speed.dataset.graflumeControl = 'playback-rate';
      speed.title = labels.speed;
      speed.setAttribute('aria-label', labels.speed);
      for (const rate of [0.25, 0.5, 1, 2, 4]) {
        const option = document.createElement('option');
        option.value = String(rate);
        option.textContent = `${rate}×`;
        speed.append(option);
      }
      speed.addEventListener('change', () => actions.setRate(Number(speed.value)));
      elements.speed = speed;
      elements.loop = button(document, 'playback-loop', 'loop', labels.loop, () =>
        actions.setLoop(elements.loop?.getAttribute('aria-pressed') !== 'true'),
      );
      panel.append(frameOutput, seek, speed, elements.loop);
      root.append(panel);
    }
    const status = document.createElement('span');
    status.className = 'graflume-controls__visually-hidden';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    root.append(status);
    elements.status = status;
    this.#releaseStyles = acquireStyles(document);
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
      setIcon(elements.fullscreen, state.fullscreen ? 'exit-fullscreen' : 'fullscreen');
      elements.fullscreen.setAttribute('aria-pressed', String(state.fullscreen));
    }
    if (elements.exportPng !== undefined) elements.exportPng.disabled = !state.exportAvailable;
    if (elements.annotations !== undefined) {
      elements.annotations.disabled = !state.annotationsAvailable;
      updateLabel(
        elements.annotations,
        state.annotationsVisible ? labels.hideAnnotations : labels.showAnnotations,
      );
      setIcon(
        elements.annotations,
        state.annotationsVisible ? 'annotations' : 'annotations-hidden',
      );
      elements.annotations.setAttribute('aria-pressed', String(state.annotationsVisible));
    }

    const playbackDisabled =
      !state.playbackEnabled || state.playbackRangeEnd - state.playbackRangeStart < 1;
    if (elements.previousFrame !== undefined) elements.previousFrame.disabled = playbackDisabled;
    if (elements.nextFrame !== undefined) elements.nextFrame.disabled = playbackDisabled;
    if (elements.play !== undefined) {
      elements.play.disabled = playbackDisabled;
      setIcon(elements.play, state.playing ? 'pause' : 'play');
      updateLabel(elements.play, state.playing ? labels.pause : labels.play);
      elements.play.setAttribute('aria-pressed', String(state.playing));
    }
    if (elements.playbackOptions !== undefined) {
      elements.playbackOptions.disabled = !state.playbackEnabled;
      if (!state.playbackEnabled) this.#setPlaybackOptionsOpen(false);
    }
    if (elements.seek !== undefined) {
      elements.seek.disabled = !state.playbackEnabled || state.playbackLength === 0;
      elements.seek.min = String(state.playbackRangeStart);
      elements.seek.max = String(Math.max(state.playbackRangeStart, state.playbackRangeEnd));
      elements.seek.value = String(Math.max(0, state.playbackIndex));
      elements.seek.setAttribute('aria-valuetext', state.frameLabel);
    }
    if (elements.frameOutput !== undefined) {
      elements.frameOutput.textContent = state.frameLabel;
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
    if (!state.playing || state.frameNamed) {
      elements.status.textContent = state.playbackEnabled
        ? `${Math.round(state.zoom * 100)}%. ${state.frameLabel}`
        : `${Math.round(state.zoom * 100)}%`;
    }
  }

  #togglePlaybackOptions(): void {
    const expanded = this.#elements?.playbackOptions?.getAttribute('aria-expanded') === 'true';
    this.#setPlaybackOptionsOpen(!expanded);
  }

  #setPlaybackOptionsOpen(open: boolean): void {
    const elements = this.#elements;
    if (elements?.playbackOptions === undefined || elements.playbackPanel === undefined) return;
    elements.playbackOptions.setAttribute('aria-expanded', String(open));
    elements.playbackPanel.hidden = !open;
    elements.root.dataset.graflumeControlsOpen = String(open);
    this.#detachPanelListeners();
    if (!open) return;
    this.#panelDocument = elements.root.ownerDocument;
    this.#panelDocument.addEventListener('pointerdown', this.#handleDocumentPointerDown, true);
    this.#panelDocument.addEventListener('keydown', this.#handleDocumentKeyDown, true);
    elements.seek?.focus();
  }

  #detachPanelListeners(): void {
    this.#panelDocument?.removeEventListener('pointerdown', this.#handleDocumentPointerDown, true);
    this.#panelDocument?.removeEventListener('keydown', this.#handleDocumentKeyDown, true);
    this.#panelDocument = null;
  }
}
