import type {
  SpreadsheetHandle,
  SpreadsheetTopLevelMenu,
  SpreadsheetTopLevelMenuActionEvent,
  SpreadsheetTopLevelMenuContext,
  SpreadsheetTopLevelMenuHandle,
  SpreadsheetTopLevelMenuUpdate,
} from './types.js';

export interface SpreadsheetTopLevelMenuDescriptor {
  readonly id: string;
  readonly label: string;
  readonly order?: number;
}

type NormalizedMenu = {
  readonly id: string;
  label: string;
  readonly order: number | undefined;
  disabled: boolean;
  readonly initialActive: boolean;
  readonly mount: SpreadsheetTopLevelMenu['mount'];
  readonly unmount: SpreadsheetTopLevelMenu['unmount'];
};

type MenuEntry = NormalizedMenu & {
  readonly slot: number;
  button?: HTMLButtonElement;
  disposed: boolean;
  controller?: AbortController;
  context?: SpreadsheetTopLevelMenuContext;
};

type MenuErrorPhase = 'mount' | 'unmount';

const menuIdPattern = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const maximumMenus = 32;

function normalizeLabel(value: unknown, name = 'menu.label'): string {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string.`);
  const label = value.trim();
  if (label.length === 0 || label.length > 120) {
    throw new TypeError(`${name} must contain 1 to 120 characters.`);
  }
  return label;
}

function normalizeBoolean(value: unknown, name: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean.`);
  return value;
}

function normalizeOrder(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('menu.order must be a finite number.');
  }
  return value;
}

export function normalizeTopLevelMenu(value: SpreadsheetTopLevelMenu): NormalizedMenu {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('menu must be an object.');
  }
  if (typeof value.id !== 'string' || !menuIdPattern.test(value.id)) {
    throw new TypeError(
      'menu.id must start with an ASCII letter and contain at most 64 letters, digits, dots, underscores, or hyphens.',
    );
  }
  const disabled = normalizeBoolean(value.disabled, 'menu.disabled', false);
  const initialActive = normalizeBoolean(value.active, 'menu.active', false);
  if (disabled && initialActive) throw new TypeError('A disabled menu cannot be active.');
  if (typeof value.mount !== 'function') throw new TypeError('menu.mount must be a function.');
  if (value.unmount !== undefined && typeof value.unmount !== 'function') {
    throw new TypeError('menu.unmount must be a function.');
  }
  return {
    id: value.id,
    label: normalizeLabel(value.label),
    order: normalizeOrder(value.order),
    disabled,
    initialActive,
    mount: value.mount,
    unmount: value.unmount,
  };
}

export function validateInitialTopLevelMenus(
  value: readonly SpreadsheetTopLevelMenu[] | undefined,
): readonly SpreadsheetTopLevelMenu[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError('topLevelMenus must be an array.');
  if (value.length > maximumMenus) {
    throw new RangeError(`topLevelMenus cannot contain more than ${maximumMenus} menus.`);
  }
  const ids = new Set<string>();
  let active = 0;
  for (const item of value) {
    const menu = normalizeTopLevelMenu(item);
    if (ids.has(menu.id)) throw new TypeError(`Duplicate top-level menu id: ${menu.id}.`);
    ids.add(menu.id);
    if (menu.initialActive) active += 1;
  }
  if (active > 1) throw new TypeError('Only one top-level menu can be active initially.');
  return value;
}

function elementClosestTab(target: EventTarget | null): HTMLButtonElement | null {
  if (target === null || typeof (target as Element).closest !== 'function') return null;
  const element = (target as Element).closest('[role="tab"]');
  return element?.tagName === 'BUTTON' ? (element as HTMLButtonElement) : null;
}

function isPromiseLike(value: unknown): value is PromiseLike<void> {
  return (
    ((typeof value === 'object' && value !== null) || typeof value === 'function') &&
    typeof (value as PromiseLike<void>).then === 'function'
  );
}

export class SpreadsheetTopLevelMenuSurface {
  readonly #hostDocument: Document;
  readonly #frameDocument: Document;
  readonly #shell: HTMLElement;
  readonly #frame: HTMLIFrameElement;
  readonly #sheetContent: HTMLElement;
  readonly #panel: HTMLElement;
  readonly #semanticPanel: HTMLElement;
  readonly #spreadsheet: SpreadsheetHandle;
  readonly #registerDescriptor: (descriptor: SpreadsheetTopLevelMenuDescriptor) => Promise<void>;
  readonly #emitAction: (event: SpreadsheetTopLevelMenuActionEvent) => void;
  readonly #reportError: (error: unknown, menuId: string, phase: MenuErrorPhase) => void;
  readonly #entries = new Map<string, MenuEntry>();
  readonly #slots: MenuEntry[] = [];
  readonly #frameObserver: MutationObserver;
  readonly #hostResizeObserver: ResizeObserver | undefined;
  readonly #frameResizeObserver: ResizeObserver | undefined;
  readonly #onFrameClick: (event: MouseEvent) => void;
  readonly #onKeyDown: (event: KeyboardEvent) => void;
  readonly #onResize: () => void;
  #activeId: string | null = null;
  #returnTab: HTMLButtonElement | null = null;
  #sheetAriaHidden: string | null = null;
  #sheetWasInert = false;
  #destroyed = false;

  constructor(options: {
    readonly hostDocument: Document;
    readonly frameDocument: Document;
    readonly shell: HTMLElement;
    readonly frame: HTMLIFrameElement;
    readonly root: HTMLElement;
    readonly spreadsheet: SpreadsheetHandle;
    readonly panelId: string;
    readonly registerDescriptor: (descriptor: SpreadsheetTopLevelMenuDescriptor) => Promise<void>;
    readonly emitAction: (event: SpreadsheetTopLevelMenuActionEvent) => void;
    readonly reportError: (error: unknown, menuId: string, phase: MenuErrorPhase) => void;
  }) {
    this.#hostDocument = options.hostDocument;
    this.#frameDocument = options.frameDocument;
    this.#shell = options.shell;
    this.#frame = options.frame;
    this.#spreadsheet = options.spreadsheet;
    this.#registerDescriptor = options.registerDescriptor;
    this.#emitAction = options.emitAction;
    this.#reportError = options.reportError;
    const sheetContent = options.root.querySelector<HTMLElement>('[data-range-selector]');
    if (sheetContent === null) throw new Error('Spreadsheet content area is unavailable.');
    this.#sheetContent = sheetContent;

    const panel = options.hostDocument.createElement('section');
    panel.id = options.panelId;
    panel.className = 'graflume-spreadsheet-panel';
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'tabpanel');
    panel.style.position = 'absolute';
    panel.style.zIndex = '2';
    panel.style.overflow = 'auto';
    panel.style.boxSizing = 'border-box';
    panel.style.background = 'Canvas';
    panel.style.color = 'CanvasText';
    options.shell.append(panel);
    this.#panel = panel;

    const semanticPanel = options.frameDocument.createElement('section');
    semanticPanel.id = `${options.panelId}-frame`;
    semanticPanel.className = 'graflume-spreadsheet-panel-proxy';
    semanticPanel.dataset.graflumeMenuPanel = '';
    semanticPanel.hidden = true;
    semanticPanel.setAttribute('role', 'tabpanel');
    semanticPanel.style.position = 'fixed';
    semanticPanel.style.width = '1px';
    semanticPanel.style.height = '1px';
    semanticPanel.style.overflow = 'hidden';
    semanticPanel.style.clipPath = 'inset(50%)';
    semanticPanel.style.whiteSpace = 'nowrap';
    options.frameDocument.body.append(semanticPanel);
    this.#semanticPanel = semanticPanel;

    this.#onFrameClick = (event) => this.#handleFrameClick(event);
    this.#onKeyDown = (event) => this.#handleKeyDown(event);
    this.#onResize = () => this.#positionPanel();
    options.frameDocument.addEventListener('click', this.#onFrameClick, true);
    options.frameDocument.addEventListener('keydown', this.#onKeyDown, true);
    options.hostDocument.addEventListener('keydown', this.#onKeyDown, true);
    options.frameDocument.defaultView?.addEventListener('resize', this.#onResize);
    options.hostDocument.defaultView?.addEventListener('resize', this.#onResize);

    const FrameMutationObserver = options.frameDocument.defaultView?.MutationObserver;
    if (FrameMutationObserver === undefined) {
      throw new Error('Spreadsheet menu observation is unavailable.');
    }
    this.#frameObserver = new FrameMutationObserver(() => {
      this.#reconcileTabs();
      this.#positionPanel();
    });
    this.#frameObserver.observe(options.root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const HostResizeObserver = options.hostDocument.defaultView?.ResizeObserver;
    this.#hostResizeObserver = HostResizeObserver
      ? new HostResizeObserver(() => this.#positionPanel())
      : undefined;
    this.#hostResizeObserver?.observe(options.shell);
    this.#hostResizeObserver?.observe(options.frame);
    const FrameResizeObserver = options.frameDocument.defaultView?.ResizeObserver;
    this.#frameResizeObserver = FrameResizeObserver
      ? new FrameResizeObserver(() => this.#positionPanel())
      : undefined;
    this.#frameResizeObserver?.observe(sheetContent);
    this.#positionPanel();
  }

  get activeId(): string | null {
    return this.#activeId;
  }

  async add(menu: SpreadsheetTopLevelMenu): Promise<SpreadsheetTopLevelMenuHandle> {
    this.#assertLive();
    const normalized = normalizeTopLevelMenu(menu);
    if (this.#entries.has(normalized.id)) {
      throw new TypeError(`Duplicate top-level menu id: ${normalized.id}.`);
    }
    if (this.#slots.length >= maximumMenus) {
      throw new RangeError(`A spreadsheet cannot register more than ${maximumMenus} menus.`);
    }
    const entry: MenuEntry = {
      ...normalized,
      slot: this.#slots.length,
      disposed: false,
    };
    this.#slots.push(entry);
    this.#entries.set(entry.id, entry);
    try {
      const existingTabs = new Set(
        this.#frameDocument.querySelectorAll<HTMLButtonElement>('[role="tablist"] > [role="tab"]'),
      );
      await this.#registerDescriptor(
        Object.freeze({
          id: entry.id,
          label: entry.label,
          ...(entry.order === undefined ? {} : { order: entry.order }),
        }),
      );
      await this.#waitForButton(entry, existingTabs);
    } catch (error) {
      entry.disposed = true;
      this.#entries.delete(entry.id);
      this.#reconcileTabs();
      throw error;
    }
    const surface = this;
    const handle: SpreadsheetTopLevelMenuHandle = {
      id: entry.id,
      get active() {
        return !entry.disposed && surface.#activeId === entry.id;
      },
      get disabled() {
        return entry.disabled;
      },
      open() {
        surface.#assertEntry(entry);
        return surface.#dispatchAction(entry, true);
      },
      update(update) {
        surface.#update(entry, update);
      },
      dispose() {
        surface.#disposeEntry(entry);
      },
    };
    const frozenHandle = Object.freeze(handle);
    if (entry.initialActive) this.#dispatchAction(entry, true);
    return frozenHandle;
  }

  close(): void {
    this.#assertLive();
    this.#closeActive({ restoreNative: true, focusTrigger: true });
  }

  activateFromRuntime(menuId: string): void {
    if (this.#destroyed) return;
    const entry = this.#entries.get(menuId);
    if (entry === undefined || entry.disabled || entry.disposed) return;
    this.#dispatchAction(entry, false);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#closeActive({ restoreNative: false, focusTrigger: false });
    this.#destroyed = true;
    this.#frameObserver.disconnect();
    this.#hostResizeObserver?.disconnect();
    this.#frameResizeObserver?.disconnect();
    this.#frameDocument.removeEventListener('click', this.#onFrameClick, true);
    this.#frameDocument.removeEventListener('keydown', this.#onKeyDown, true);
    this.#hostDocument.removeEventListener('keydown', this.#onKeyDown, true);
    this.#frameDocument.defaultView?.removeEventListener('resize', this.#onResize);
    this.#hostDocument.defaultView?.removeEventListener('resize', this.#onResize);
    for (const entry of this.#slots) entry.disposed = true;
    this.#entries.clear();
    this.#semanticPanel.remove();
    this.#panel.remove();
  }

  #assertLive(): void {
    if (this.#destroyed) throw new Error('Spreadsheet menus have been destroyed.');
  }

  #assertEntry(entry: MenuEntry): void {
    this.#assertLive();
    if (entry.disposed || this.#entries.get(entry.id) !== entry) {
      throw new Error(`Top-level menu ${entry.id} has been disposed.`);
    }
  }

  async #waitForButton(
    entry: MenuEntry,
    existingTabs: ReadonlySet<HTMLButtonElement>,
  ): Promise<void> {
    const view = this.#frameDocument.defaultView;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      this.#reconcileTabs();
      if (entry.button !== undefined) return;
      const owned = new Set(
        this.#slots
          .map((candidate) => candidate.button)
          .filter((button): button is HTMLButtonElement => button !== undefined),
      );
      const tabs = [
        ...this.#frameDocument.querySelectorAll<HTMLButtonElement>(
          '[role="tablist"] > [role="tab"]',
        ),
      ];
      const added = tabs.filter((button) => !existingTabs.has(button) && !owned.has(button));
      const candidate =
        added.length === 1
          ? added[0]
          : tabs.find(
              (button) =>
                !owned.has(button) &&
                button.textContent?.trim() === entry.label &&
                button.title === entry.label,
            );
      if (candidate !== undefined) {
        entry.button = candidate;
        this.#reconcileTabs();
        return;
      }
      await new Promise<void>(
        (resolve) => view?.setTimeout(resolve, 16) ?? setTimeout(resolve, 16),
      );
    }
    throw new Error(`Top-level menu ${entry.id} did not render.`);
  }

  #reconcileTabs(): void {
    if (this.#destroyed || this.#slots.length === 0) return;
    const tablist = this.#frameDocument.querySelector<HTMLElement>('[role="tablist"]');
    if (tablist === null) return;
    for (const entry of this.#slots) {
      if (entry.button !== undefined && !entry.button.isConnected) delete entry.button;
      const button =
        entry.button ??
        tablist.querySelector<HTMLButtonElement>(
          `:scope > [role="tab"][data-graflume-menu-id="${entry.id}"]`,
        );
      if (button === null || button === undefined) continue;
      entry.button = button;
      button.dataset.graflumeMenuId = entry.id;
      button.id = `${this.#semanticPanel.id}-tab-${entry.slot}`;
      button.setAttribute('aria-controls', this.#semanticPanel.id);
      button.setAttribute('aria-disabled', String(entry.disabled));
      button.disabled = entry.disabled;
      button.hidden = entry.disposed;
      if (!entry.disposed && button.textContent !== entry.label) button.textContent = entry.label;
      if (!entry.disposed && button.title !== entry.label) button.title = entry.label;
    }
    const active = this.#activeId === null ? undefined : this.#entries.get(this.#activeId);
    if (active?.button !== undefined) {
      this.#panel.dataset.graflumeMenuPanel = active.id;
      this.#semanticPanel.dataset.graflumeMenuPanel = active.id;
      this.#panel.setAttribute('aria-label', active.label);
      this.#semanticPanel.setAttribute('aria-labelledby', active.button.id);
      this.#semanticPanel.textContent = active.label;
      const toolbar = optionsElement(this.#frameDocument, '[data-u-comp="ribbon-toolbar"]');
      toolbar?.setAttribute('aria-label', active.label);
    }
  }

  #positionPanel(): void {
    if (this.#destroyed) return;
    const shellRect = this.#shell.getBoundingClientRect();
    const frameRect = this.#frame.getBoundingClientRect();
    const contentRect = this.#sheetContent.getBoundingClientRect();
    this.#panel.style.left = `${frameRect.left - shellRect.left + contentRect.left}px`;
    this.#panel.style.top = `${frameRect.top - shellRect.top + contentRect.top}px`;
    this.#panel.style.width = `${contentRect.width}px`;
    this.#panel.style.height = `${contentRect.height}px`;
  }

  #handleFrameClick(event: MouseEvent): void {
    const tab = elementClosestTab(event.target);
    if (tab === null) return;
    const id = tab.dataset.graflumeMenuId;
    if (id === undefined) {
      if (this.#activeId !== null) {
        this.#closeActive({ restoreNative: false, focusTrigger: false });
      }
      return;
    }
    const entry = this.#entries.get(id);
    if (entry === undefined || entry.disposed || entry.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.#frameDocument.defaultView?.queueMicrotask(() => this.#dispatchAction(entry, false));
  }

  #handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.#activeId !== null) {
      event.preventDefault();
      event.stopPropagation();
      this.#closeActive({ restoreNative: true, focusTrigger: true });
      return;
    }
    const tab = elementClosestTab(event.target);
    if (tab === null || tab.closest('[role="tablist"]') === null) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tablist = tab.closest('[role="tablist"]');
    if (tablist === null) return;
    const tabs = [...tablist.querySelectorAll<HTMLButtonElement>(':scope > [role="tab"]')].filter(
      (candidate) => !candidate.disabled && !candidate.hidden,
    );
    if (tabs.length === 0) return;
    const current = Math.max(0, tabs.indexOf(tab));
    const target =
      event.key === 'Home'
        ? tabs[0]
        : event.key === 'End'
          ? tabs.at(-1)
          : event.key === 'ArrowRight'
            ? tabs[(current + 1) % tabs.length]
            : tabs[(current - 1 + tabs.length) % tabs.length];
    if (target === undefined) return;
    event.preventDefault();
    target.focus();
  }

  #dispatchAction(entry: MenuEntry, selectNative = false): boolean {
    if (entry.disposed || entry.disabled) return false;
    const wasActive = this.#activeId === entry.id;
    const opened = this.#open(entry, selectNative);
    if (opened && !wasActive) {
      this.#emitAction(Object.freeze({ menuId: entry.id }));
    }
    return opened;
  }

  #open(entry: MenuEntry, selectNative: boolean): boolean {
    this.#assertEntry(entry);
    if (entry.disabled) return false;
    this.#reconcileTabs();
    if (entry.button === undefined) return false;
    if (this.#activeId === entry.id) return true;
    if (this.#activeId === null) {
      const selected = this.#frameDocument.querySelector<HTMLButtonElement>(
        '[role="tablist"] > [role="tab"][aria-selected="true"]',
      );
      if (selected?.dataset.graflumeMenuId === undefined) this.#returnTab = selected ?? null;
    } else {
      this.#closeActive({ restoreNative: false, focusTrigger: false, preserveReturnTab: true });
    }
    if (selectNative) entry.button.click();
    this.#activeId = entry.id;
    this.#sheetAriaHidden = this.#sheetContent.getAttribute('aria-hidden');
    this.#sheetWasInert = this.#sheetContent.inert;
    this.#sheetContent.inert = true;
    this.#sheetContent.setAttribute('aria-hidden', 'true');
    this.#panel.hidden = false;
    this.#semanticPanel.hidden = false;
    this.#panel.replaceChildren();
    const controller = new AbortController();
    const context: SpreadsheetTopLevelMenuContext = Object.freeze({
      id: entry.id,
      signal: controller.signal,
      spreadsheet: this.#spreadsheet,
      close: () => {
        if (this.#activeId === entry.id) {
          this.#closeActive({ restoreNative: true, focusTrigger: true });
        }
      },
    });
    entry.controller = controller;
    entry.context = context;
    this.#reconcileTabs();
    this.#positionPanel();
    try {
      const mounted = entry.mount(this.#panel, context);
      if (isPromiseLike(mounted)) {
        void Promise.resolve(mounted).catch((error: unknown) => {
          this.#reportError(error, entry.id, 'mount');
          if (this.#activeId === entry.id) {
            this.#closeActive({ restoreNative: true, focusTrigger: true });
          }
        });
      }
    } catch (error) {
      this.#reportError(error, entry.id, 'mount');
      this.#closeActive({ restoreNative: true, focusTrigger: true });
      return false;
    }
    return this.#activeId === entry.id;
  }

  #closeActive(options: {
    readonly restoreNative: boolean;
    readonly focusTrigger: boolean;
    readonly preserveReturnTab?: boolean;
  }): void {
    if (this.#activeId === null) return;
    const entry = this.#entries.get(this.#activeId);
    const trigger = entry?.button;
    const context = entry?.context;
    entry?.controller?.abort();
    if (entry !== undefined && context !== undefined && entry.unmount !== undefined) {
      try {
        const unmounted = entry.unmount(this.#panel, context);
        if (isPromiseLike(unmounted)) {
          void Promise.resolve(unmounted).catch((error: unknown) =>
            this.#reportError(error, entry.id, 'unmount'),
          );
        }
      } catch (error) {
        this.#reportError(error, entry.id, 'unmount');
      }
    }
    if (entry !== undefined) {
      delete entry.controller;
      delete entry.context;
    }
    this.#activeId = null;
    this.#panel.replaceChildren();
    this.#panel.hidden = true;
    this.#panel.removeAttribute('aria-label');
    delete this.#panel.dataset.graflumeMenuPanel;
    this.#semanticPanel.hidden = true;
    this.#semanticPanel.removeAttribute('aria-labelledby');
    this.#semanticPanel.dataset.graflumeMenuPanel = '';
    this.#semanticPanel.replaceChildren();
    this.#sheetContent.inert = this.#sheetWasInert;
    if (this.#sheetAriaHidden === null) this.#sheetContent.removeAttribute('aria-hidden');
    else this.#sheetContent.setAttribute('aria-hidden', this.#sheetAriaHidden);
    const returnTab = this.#returnTab;
    if (options.restoreNative && returnTab !== null && returnTab.isConnected) returnTab.click();
    if (options.focusTrigger && entry !== undefined) {
      let attempts = 0;
      const focus = () => {
        this.#reconcileTabs();
        const currentTrigger = this.#entries.get(entry.id)?.button ?? trigger;
        if (currentTrigger?.isConnected && !currentTrigger.hidden) {
          currentTrigger.focus();
          if (this.#frameDocument.activeElement === currentTrigger) return;
        }
        attempts += 1;
        if (attempts < 12) this.#frameDocument.defaultView?.requestAnimationFrame(focus);
      };
      this.#frameDocument.defaultView?.requestAnimationFrame(focus);
    }
    if (!options.preserveReturnTab) this.#returnTab = null;
  }

  #update(entry: MenuEntry, value: SpreadsheetTopLevelMenuUpdate): void {
    this.#assertEntry(entry);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('menu update must be an object.');
    }
    const allowed = new Set(['label', 'disabled', 'active']);
    if (Object.keys(value).some((key) => !allowed.has(key))) {
      throw new TypeError('menu update contains an unsupported property.');
    }
    const label =
      value.label === undefined ? entry.label : normalizeLabel(value.label, 'update.label');
    const disabled = normalizeBoolean(value.disabled, 'update.disabled', entry.disabled);
    const active = normalizeBoolean(
      value.active,
      'update.active',
      disabled ? false : this.#activeId === entry.id,
    );
    if (disabled && active) throw new TypeError('A disabled menu cannot be active.');
    entry.label = label;
    entry.disabled = disabled;
    this.#reconcileTabs();
    if (!active && this.#activeId === entry.id) {
      this.#closeActive({ restoreNative: true, focusTrigger: true });
    } else if (active && this.#activeId !== entry.id) {
      this.#dispatchAction(entry, true);
    }
  }

  #disposeEntry(entry: MenuEntry): void {
    if (entry.disposed) return;
    this.#assertLive();
    if (this.#activeId === entry.id) {
      this.#closeActive({ restoreNative: true, focusTrigger: false });
    }
    entry.disposed = true;
    this.#entries.delete(entry.id);
    this.#reconcileTabs();
    const focused = this.#hostDocument.activeElement;
    if (focused !== null && this.#panel.contains(focused)) this.#frame.focus();
  }
}

function optionsElement(document: Document, selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(selector);
}
