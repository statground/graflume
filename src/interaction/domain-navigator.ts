import { GraflumeError } from '../core/errors.js';
import type { Chart } from '../runtime/chart.js';
import type { Rect } from '../scene/types.js';
import type { AxisId } from '../spec/types.js';
import {
  domainAxisWindow,
  normalizeDomainViewState,
  type DomainAxisWindow,
  type DomainViewState,
} from './domain-navigation.js';

export interface DomainNavigatorLabels {
  readonly controls?: string;
  readonly boxZoom?: string;
  readonly back?: string;
  readonly reset?: string;
  readonly exportPng?: string;
  readonly range?: string;
  readonly rangeStart?: string;
  readonly rangeEnd?: string;
}

export interface DomainNavigatorOptions {
  readonly target: HTMLElement;
  /** Horizontal Cartesian axis; the optional view identifies a composition leaf. */
  readonly axis?: AxisId;
  readonly viewId?: string;
  readonly initialWindow?: DomainAxisWindow;
  readonly slider?: boolean;
  readonly controls?: {
    readonly boxZoom?: boolean;
    readonly back?: boolean;
    readonly reset?: boolean;
    readonly export?: boolean;
  };
  readonly labels?: DomainNavigatorLabels;
  readonly filename?: string;
}

export interface DomainNavigator {
  destroy(): void;
  reset(): void;
  zoomBack(): void;
  setBoxZoom(active: boolean): void;
  getState(): {
    readonly window: DomainAxisWindow;
    readonly boxZoom: boolean;
    readonly historyLength: number;
  };
}

const mounted = new WeakMap<Chart, DomainNavigator>();
const defaults: Required<DomainNavigatorLabels> = {
  controls: 'Chart navigation',
  boxZoom: 'Select horizontal zoom area',
  back: 'Undo area zoom',
  reset: 'Restore chart',
  exportPng: 'Download PNG',
  range: 'Visible data range',
  rangeStart: 'Range start',
  rangeEnd: 'Range end',
};
const icons = {
  'box-zoom': 'M3 3h6M3 3v6M21 3h-6M21 3v6M3 21h6M3 21v-6M21 21h-6M21 21v-6M8 8h8v8H8Z',
  back: 'M10 5 3 12l7 7M3 12h11a6 6 0 0 1 6 6',
  reset: 'M4 4v7h7M5 9a8 8 0 1 1 0 7',
  export: 'M12 3v12M7 10l5 5 5-5M4 15v6h16v-6',
} as const;

const css = `
[data-graflume-domain-navigator]{position:absolute;inset:0;pointer-events:none;z-index:25;font:12px system-ui,sans-serif;color:#475569}
[data-graflume-navigation-toolbar]{position:absolute;right:10px;top:20px;display:flex;gap:3px;pointer-events:auto}
[data-graflume-navigation-control]{display:grid;place-items:center;width:28px;height:28px;padding:4px;border:1px solid transparent;border-radius:4px;color:inherit;background:rgba(255,255,255,.92);cursor:pointer}
[data-graflume-navigation-control] svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
[data-graflume-navigation-control]:hover,[data-graflume-navigation-control][aria-pressed=true]{color:#4f46e5;border-color:#a5b4fc}
[data-graflume-navigation-control]:disabled{opacity:.35;cursor:default}
[data-graflume-navigation-control]:focus-visible,[data-graflume-range]:focus-visible{outline:2px solid #6366f1;outline-offset:2px}
[data-graflume-domain-slider]{position:absolute;height:28px;bottom:18px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:3px;pointer-events:auto;touch-action:none}
[data-graflume-range-window]{position:absolute;top:0;height:100%;box-sizing:border-box;border:1px solid #818cf8;background:rgba(99,102,241,.2);cursor:grab;touch-action:none}
[data-graflume-range]{position:absolute;inset:0;margin:0;width:100%;height:28px;appearance:none;-webkit-appearance:none;background:transparent;pointer-events:none;outline:0}
[data-graflume-range]::-webkit-slider-runnable-track{height:28px;background:transparent}
[data-graflume-range]::-moz-range-track{height:28px;background:transparent}
[data-graflume-range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:10px;height:28px;border:1px solid #6366f1;border-radius:2px;background:white;pointer-events:auto;cursor:ew-resize}
[data-graflume-range]::-moz-range-thumb{width:8px;height:26px;border:1px solid #6366f1;border-radius:2px;background:white;pointer-events:auto;cursor:ew-resize}
[data-graflume-range-label]{position:absolute;top:5px;left:12px;max-width:44%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;font-size:10px;visibility:hidden}
[data-graflume-range-label=end]{left:auto;right:12px;text-align:right}
[data-graflume-domain-slider]:hover [data-graflume-range-label],[data-graflume-domain-slider]:focus-within [data-graflume-range-label]{visibility:visible}
[data-graflume-zoom-draft]{position:absolute;background:rgba(99,102,241,.16);border:1px solid #6366f1;box-sizing:border-box;pointer-events:none}
@media(pointer:coarse){[data-graflume-navigation-control]{width:36px;height:36px}}
`;

function invalid(message: string): never {
  throw new GraflumeError('INVALID_SPEC', message, { path: '$.domainNavigator' });
}

/** Add a bounded range slider and area-zoom history to native Cartesian domain navigation. */
export function attachDomainNavigator(
  chart: Chart,
  options: DomainNavigatorOptions,
): DomainNavigator {
  const host = options.target;
  if (!host?.ownerDocument || typeof host.append !== 'function')
    invalid('A DOM target is required.');
  const axis = options.axis ?? 'x';
  const spec = chart.getSpec();
  const authoredNavigation = spec.interaction?.domainNavigation;
  if (!authoredNavigation)
    invalid('Enable interaction.domainNavigation before attaching a navigator.');
  const navigation = typeof authoredNavigation === 'object' ? authoredNavigation : {};
  if (!(navigation.axes ?? ['x', 'y']).includes(axis))
    invalid('The navigator axis is not enabled.');
  const authoredAxis = spec.axes?.[axis];
  if (axis === 'y' || axis === 'y2' || (authoredAxis && authoredAxis.channel === 'y')) {
    invalid('The navigator requires a horizontal Cartesian axis.');
  }
  const initialWindow = options.initialWindow ?? domainAxisWindow(chart.getDomainViewState(), axis);
  const initial = normalizeDomainViewState({
    ...chart.getDomainViewState(),
    axes: { ...chart.getDomainViewState().axes, [axis]: initialWindow },
  });
  const maxZoom = navigation.maxZoom ?? 64;
  const minimum = 1 / maxZoom;
  if (initialWindow.end - initialWindow.start + 1e-12 < minimum) {
    invalid('The initial range must respect domainNavigation.maxZoom.');
  }
  chart.getCoordinateViewBounds(options.viewId);
  if (options.viewId === undefined && chart.getCoordinateViewIds().length > 1) {
    invalid('Choose viewId for a composed chart navigator.');
  }
  const labels = { ...defaults, ...options.labels };
  if (Object.values(labels).some((value) => typeof value !== 'string' || !value.trim())) {
    invalid('Navigator labels must be non-empty strings.');
  }
  if (options.filename !== undefined && !options.filename.trim())
    invalid('Export filename must be non-empty.');
  mounted.get(chart)?.destroy();
  chart.setDomainViewState(initial);
  const document = host.ownerDocument;
  const originalPosition = host.style.position;
  const position = document.defaultView?.getComputedStyle(host).position ?? originalPosition;
  const changedPosition = position === 'static' || position === '';
  if (changedPosition) {
    host.style.position = 'relative';
  }
  const root = document.createElement('div');
  root.dataset.graflumeDomainNavigator = '';
  const style = document.createElement('style');
  style.textContent = css;
  root.append(style);
  const toolbar = document.createElement('div');
  toolbar.dataset.graflumeNavigationToolbar = '';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', labels.controls);
  root.append(toolbar);
  const settings = options.controls ?? { boxZoom: true, back: true, reset: true, export: true };
  const buttons: Partial<Record<keyof typeof icons, HTMLButtonElement>> = {};
  let destroyed = false;
  let boxZoom = false;
  const history: DomainViewState[] = [];
  const dispose: Array<() => void> = [];
  let gesture: {
    kind: 'box' | 'pan';
    pointer: number;
    start: number;
    current: number;
    window: DomainAxisWindow;
  } | null = null;
  const draft = document.createElement('div');
  draft.dataset.graflumeZoomDraft = '';
  draft.hidden = true;
  root.append(draft);

  function listen(
    target: EventTarget,
    type: string,
    callback: (event: Event) => void,
    capture = false,
  ): void {
    target.addEventListener(type, callback, capture);
    dispose.push(() => target.removeEventListener(type, callback, capture));
  }
  function addButton(key: keyof typeof icons, label: string, action: () => void): void {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.graflumeNavigationControl = key;
    button.title = label;
    button.setAttribute('aria-label', label);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', icons[key]);
    svg.append(path);
    button.append(svg);
    listen(button, 'click', action);
    buttons[key] = button;
    toolbar.append(button);
  }
  if (settings.boxZoom)
    addButton('box-zoom', labels.boxZoom, () => controller.setBoxZoom(!boxZoom));
  if (settings.back) addButton('back', labels.back, () => controller.zoomBack());
  if (settings.reset) addButton('reset', labels.reset, () => controller.reset());
  if (settings.export)
    addButton('export', labels.exportPng, () => {
      const link = document.createElement('a');
      link.download = options.filename ?? 'graflume-chart.png';
      link.href = chart.toDataURL('image/png');
      link.click();
    });

  const slider = document.createElement('div');
  slider.dataset.graflumeDomainSlider = '';
  slider.setAttribute('role', 'group');
  slider.setAttribute('aria-label', labels.range);
  const band = document.createElement('div');
  band.dataset.graflumeRangeWindow = '';
  slider.append(band);
  const inputs = {} as Record<'start' | 'end', HTMLInputElement>;
  const outputs = {} as Record<'start' | 'end', HTMLOutputElement>;
  for (const key of ['start', 'end'] as const) {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '1000';
    input.step = '1';
    input.dataset.graflumeRange = key;
    input.setAttribute('aria-label', key === 'start' ? labels.rangeStart : labels.rangeEnd);
    listen(input, 'input', () => {
      const previous = domainAxisWindow(chart.getDomainViewState(), axis);
      const value = Number(input.value) / 1000;
      apply(
        key === 'start'
          ? { start: Math.min(value, previous.end - minimum), end: previous.end }
          : { start: previous.start, end: Math.max(value, previous.start + minimum) },
      );
    });
    inputs[key] = input;
    const output = document.createElement('output');
    output.dataset.graflumeRangeLabel = key;
    outputs[key] = output;
    slider.append(input, output);
  }
  if (options.slider !== false) root.append(slider);
  if (Object.keys(buttons).length === 0) toolbar.remove();
  host.append(root);

  function canvasBounds(): {
    plot: Rect;
    scaleX: number;
    scaleY: number;
    left: number;
    top: number;
  } {
    const scene = chart.getScene();
    if (!scene) invalid('The chart must be rendered.');
    const surface = host.querySelector('canvas') ?? host;
    const bounds = surface.getBoundingClientRect();
    const parent = host.getBoundingClientRect();
    return {
      plot: chart.getCoordinateViewBounds(options.viewId),
      scaleX: bounds.width / scene.width,
      scaleY: bounds.height / scene.height,
      left: bounds.left - parent.left,
      top: bounds.top - parent.top,
    };
  }
  function pointerRatio(event: PointerEvent): number {
    const { plot, scaleX, left } = canvasBounds();
    return Math.max(
      0,
      Math.min(
        1,
        (event.clientX - host.getBoundingClientRect().left - left - plot.x * scaleX) /
          Math.max(1, plot.width * scaleX),
      ),
    );
  }
  function apply(window: DomainAxisWindow): void {
    const width = Math.max(minimum, Math.min(1, window.end - window.start));
    const start = Math.max(0, Math.min(1 - width, window.start));
    const current = chart.getDomainViewState();
    chart.setDomainViewState({
      ...current,
      axes: { ...current.axes, [axis]: { start, end: start + width } },
    });
  }
  function cancelGesture(): void {
    const pointer = gesture?.pointer;
    gesture = null;
    draft.hidden = true;
    if (pointer !== undefined && host.hasPointerCapture?.(pointer))
      host.releasePointerCapture(pointer);
  }
  function consume(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function refresh(): void {
    if (destroyed) return;
    if (root.parentElement !== host) host.append(root);
    const window = domainAxisWindow(chart.getDomainViewState(), axis);
    root.dataset.domainStart = String(window.start);
    root.dataset.domainEnd = String(window.end);
    root.dataset.boxZoom = String(boxZoom);
    if (buttons['box-zoom']) buttons['box-zoom'].setAttribute('aria-pressed', String(boxZoom));
    if (buttons.back) buttons.back.disabled = history.length === 0;
    inputs.start.value = String(Math.round(window.start * 1000));
    inputs.end.value = String(Math.round(window.end * 1000));
    band.style.left = `${window.start * 100}%`;
    band.style.width = `${(window.end - window.start) * 100}%`;
    const { plot, scaleX, left } = canvasBounds();
    slider.style.left = `${left + plot.x * scaleX}px`;
    slider.style.width = `${Math.max(0, plot.width * scaleX)}px`;
    for (const key of ['start', 'end'] as const) {
      let label: string;
      try {
        const value = chart.pixelToDomain(
          axis,
          plot.x + (key === 'start' ? 0 : plot.width),
          options.viewId,
        );
        label = String(value);
      } catch {
        label = `${Math.round(window[key] * 100)}%`;
      }
      outputs[key].textContent = label;
      inputs[key].setAttribute('aria-valuetext', label);
    }
  }

  listen(
    host,
    'pointerdown',
    (raw) => {
      const event = raw as PointerEvent;
      if (event.button !== 0 || gesture !== null) return;
      if (event.target === band) {
        gesture = {
          kind: 'pan',
          pointer: event.pointerId,
          start: event.clientX,
          current: event.clientX,
          window: domainAxisWindow(chart.getDomainViewState(), axis),
        };
      } else {
        if (!boxZoom || root.contains(event.target as Node)) return;
        const { plot, scaleX, scaleY, left, top } = canvasBounds();
        const parent = host.getBoundingClientRect();
        const x = event.clientX - parent.left - left;
        const y = event.clientY - parent.top - top;
        if (
          x < plot.x * scaleX ||
          x > (plot.x + plot.width) * scaleX ||
          y < plot.y * scaleY ||
          y > (plot.y + plot.height) * scaleY
        )
          return;
        const ratio = pointerRatio(event);
        gesture = {
          kind: 'box',
          pointer: event.pointerId,
          start: ratio,
          current: ratio,
          window: domainAxisWindow(chart.getDomainViewState(), axis),
        };
        draft.style.top = `${top + plot.y * scaleY}px`;
        draft.style.height = `${plot.height * scaleY}px`;
        draft.style.width = '0px';
        draft.hidden = false;
      }
      host.setPointerCapture?.(event.pointerId);
      consume(event);
    },
    true,
  );
  listen(
    host,
    'pointermove',
    (raw) => {
      const event = raw as PointerEvent;
      if (gesture === null || event.pointerId !== gesture.pointer) return;
      consume(event);
      if (gesture.kind === 'pan') {
        const width = slider.getBoundingClientRect().width;
        if (width <= 0) return;
        const delta = (event.clientX - gesture.start) / width;
        apply({ start: gesture.window.start + delta, end: gesture.window.end + delta });
        return;
      }
      gesture.current = pointerRatio(event);
      const { plot, scaleX, left } = canvasBounds();
      draft.style.left = `${left + (plot.x + Math.min(gesture.start, gesture.current) * plot.width) * scaleX}px`;
      draft.style.width = `${Math.abs(gesture.current - gesture.start) * plot.width * scaleX}px`;
    },
    true,
  );
  listen(
    host,
    'pointerup',
    (raw) => {
      const event = raw as PointerEvent;
      const current = gesture;
      if (current === null || event.pointerId !== current.pointer) return;
      consume(event);
      cancelGesture();
      if (current.kind !== 'box') return;
      const end = pointerRatio(event);
      const { plot, scaleX } = canvasBounds();
      if (Math.abs(end - current.start) * plot.width * scaleX < 4) return;
      history.push(chart.getDomainViewState());
      if (history.length > 64) history.shift();
      const span = current.window.end - current.window.start;
      apply({
        start: current.window.start + Math.min(current.start, end) * span,
        end: current.window.start + Math.max(current.start, end) * span,
      });
      refresh();
    },
    true,
  );
  listen(host, 'pointercancel', () => cancelGesture(), true);
  listen(host, 'lostpointercapture', () => cancelGesture(), true);
  listen(
    host,
    'keydown',
    (raw) => {
      const event = raw as KeyboardEvent;
      if (event.key === 'Escape' && (boxZoom || gesture)) {
        consume(event);
        controller.setBoxZoom(false);
      }
    },
    true,
  );

  const controller: DomainNavigator = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelGesture();
      for (const callback of dispose.splice(0)) callback();
      root.remove();
      if (changedPosition && host.style.position === 'relative')
        host.style.position = originalPosition;
      if (mounted.get(chart) === controller) mounted.delete(chart);
    },
    reset() {
      if (destroyed) return;
      cancelGesture();
      history.length = 0;
      boxZoom = false;
      chart.setSpec(spec);
      chart.setDomainViewState(initial);
      refresh();
    },
    zoomBack() {
      if (destroyed) return;
      cancelGesture();
      const previous = history.pop();
      if (previous) chart.setDomainViewState(previous);
      refresh();
    },
    setBoxZoom(active) {
      if (destroyed) return;
      cancelGesture();
      boxZoom = Boolean(active);
      refresh();
    },
    getState() {
      return {
        window: domainAxisWindow(chart.getDomainViewState(), axis),
        boxZoom,
        historyLength: history.length,
      };
    },
  };
  dispose.push(
    chart.on('render', refresh),
    chart.on('domainviewchange', refresh),
    chart.on('resize', refresh),
    chart.on('destroy', () => controller.destroy()),
  );
  mounted.set(chart, controller);
  refresh();
  return controller;
}
