import {
  cloneAndValidateDataFrame,
  emptySpreadsheetData,
  resolveSpreadsheetLimits,
  validateSpreadsheetSnapshot,
} from './spreadsheet/data-frame.js';
import {
  SpreadsheetTopLevelMenuSurface,
  validateInitialTopLevelMenus,
} from './spreadsheet/menu.js';
import {
  isSpreadsheetMessage,
  spreadsheetProtocol,
  type SpreadsheetEventMessage,
  type SpreadsheetRequestMessage,
  type SpreadsheetResponseMessage,
  type SpreadsheetRuntimeRequest,
} from './spreadsheet/protocol.js';
import type {
  SpreadsheetBatchChange,
  SpreadsheetCellPatch,
  SpreadsheetColumnRename,
  SpreadsheetCreateOptions,
  SpreadsheetDataFrame,
  SpreadsheetErrorEvent,
  SpreadsheetEventMap,
  SpreadsheetHandle,
  SpreadsheetSelection,
  SpreadsheetSnapshot,
  SpreadsheetTopLevelMenu,
  SpreadsheetTopLevelMenuActionEvent,
  SpreadsheetTopLevelMenuHandle,
} from './spreadsheet/types.js';

export type {
  SpreadsheetBatchChange,
  SpreadsheetBatchEdit,
  SpreadsheetBatchSource,
  SpreadsheetCellAddress,
  SpreadsheetCellContent,
  SpreadsheetCellPatch,
  SpreadsheetColumn,
  SpreadsheetColumnKind,
  SpreadsheetColumnRename,
  SpreadsheetCreateOptions,
  SpreadsheetDataFrame,
  SpreadsheetErrorEvent,
  SpreadsheetEventMap,
  SpreadsheetFormula,
  SpreadsheetHandle,
  SpreadsheetLimits,
  SpreadsheetLocale,
  SpreadsheetProfile,
  SpreadsheetRow,
  SpreadsheetScalar,
  SpreadsheetSelection,
  SpreadsheetSnapshot,
  SpreadsheetTopLevelMenu,
  SpreadsheetTopLevelMenuActionEvent,
  SpreadsheetTopLevelMenuContext,
  SpreadsheetTopLevelMenuHandle,
  SpreadsheetTopLevelMenuUpdate,
} from './spreadsheet/types.js';

type PendingRequest = {
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
  readonly timer: number;
};

const loadTimeoutMilliseconds = 20_000;

function randomInstanceId(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  return `gfs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function resolveAsset(value: string, label: string): URL {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty URL.`);
  }
  const url = new URL(value, document.baseURI);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError(`${label} must use HTTP or HTTPS.`);
  }
  return url;
}

function resolveAssetIntegrity(
  url: URL,
  value: string | undefined,
  label: string,
): string | undefined {
  if (value === undefined && url.origin === window.location.origin) return undefined;
  if (typeof value !== 'string' || !/^sha384-[A-Za-z0-9+/]{64}$/.test(value)) {
    throw new TypeError(
      `${label} must be a single SHA-384 integrity value for cross-origin assets.`,
    );
  }
  return value;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

const spreadsheetBatchSources = new Set([
  'edit',
  'paste',
  'patch',
  'replace',
  'load',
  'undo',
  'redo',
  'sort',
  'rename-column',
  'rollback',
]);

function cloneBatchContent(
  value: unknown,
  label: string,
): SpreadsheetBatchChange['edits'][number]['after'] {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} is not a supported spreadsheet value.`);
  }
  const formula = value as { formula?: unknown; result?: unknown };
  if (
    !Object.keys(value).every((key) => key === 'formula' || key === 'result') ||
    typeof formula.formula !== 'string' ||
    !formula.formula.startsWith('=')
  ) {
    throw new TypeError(`${label} is not a supported spreadsheet formula.`);
  }
  const result =
    formula.result === undefined ? undefined : cloneBatchContent(formula.result, `${label}.result`);
  if (typeof result === 'object' && result !== null) {
    throw new TypeError(`${label}.result must be a scalar value.`);
  }
  return Object.freeze({
    formula: formula.formula,
    ...(result === undefined ? {} : { result }),
  });
}

function cloneBatchChange(value: unknown): SpreadsheetBatchChange {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Spreadsheet batch change must be an object.');
  }
  const change = value as Partial<SpreadsheetBatchChange>;
  if (
    typeof change.id !== 'string' ||
    change.id.length === 0 ||
    typeof change.source !== 'string' ||
    !spreadsheetBatchSources.has(change.source) ||
    typeof change.timestamp !== 'number' ||
    !Number.isFinite(change.timestamp) ||
    !Array.isArray(change.edits) ||
    !Array.isArray(change.columnRenames)
  ) {
    throw new TypeError('Spreadsheet batch change is malformed.');
  }
  const edits = change.edits.map((value, index) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(`Spreadsheet batch edit ${index} must be an object.`);
    }
    const edit = value as Partial<SpreadsheetBatchChange['edits'][number]>;
    if (
      typeof edit.rowId !== 'string' ||
      edit.rowId.length === 0 ||
      typeof edit.columnId !== 'string' ||
      edit.columnId.length === 0
    ) {
      throw new TypeError(`Spreadsheet batch edit ${index} has an invalid address.`);
    }
    return Object.freeze({
      rowId: edit.rowId,
      columnId: edit.columnId,
      before: cloneBatchContent(edit.before, `Spreadsheet batch edit ${index}.before`),
      after: cloneBatchContent(edit.after, `Spreadsheet batch edit ${index}.after`),
    });
  });
  const renamedColumnIds = new Set<string>();
  const columnRenames = change.columnRenames.map((value, index) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(`Spreadsheet column rename ${index} must be an object.`);
    }
    const rename = value as Partial<SpreadsheetColumnRename>;
    if (
      typeof rename.columnId !== 'string' ||
      rename.columnId.length === 0 ||
      typeof rename.before !== 'string' ||
      rename.before.trim().length === 0 ||
      typeof rename.after !== 'string' ||
      rename.after.trim().length === 0 ||
      rename.before !== rename.before.trim() ||
      rename.after !== rename.after.trim()
    ) {
      throw new TypeError(`Spreadsheet column rename ${index} is malformed.`);
    }
    if (renamedColumnIds.has(rename.columnId)) {
      throw new TypeError('Spreadsheet column renames contain a duplicate column id.');
    }
    renamedColumnIds.add(rename.columnId);
    return Object.freeze({
      columnId: rename.columnId,
      before: rename.before,
      after: rename.after,
    });
  });
  return Object.freeze({
    id: change.id,
    source: change.source as SpreadsheetBatchChange['source'],
    edits: Object.freeze(edits),
    columnRenames: Object.freeze(columnRenames),
    timestamp: change.timestamp,
  });
}

class IframeSpreadsheetHandle implements SpreadsheetHandle {
  readonly element: HTMLIFrameElement;
  readonly #instanceId = randomInstanceId();
  readonly #pending = new Map<number, PendingRequest>();
  readonly #listeners: { [K in keyof SpreadsheetEventMap]: Set<(value: never) => void> } = {
    batchchange: new Set(),
    error: new Set(),
    menuaction: new Set(),
  };
  readonly #shell: HTMLElement;
  readonly #onCommit: SpreadsheetCreateOptions['onCommit'];
  readonly #messageListener: (event: MessageEvent<unknown>) => void;
  #requestId = 0;
  #destroyed = false;
  #commitQueue = Promise.resolve();
  #menuSurface: SpreadsheetTopLevelMenuSurface | undefined;

  constructor(
    frame: HTMLIFrameElement,
    shell: HTMLElement,
    onCommit: SpreadsheetCreateOptions['onCommit'],
  ) {
    this.element = frame;
    this.#shell = shell;
    this.#onCommit = onCommit;
    this.#messageListener = (event) => this.#receive(event);
    window.addEventListener('message', this.#messageListener);
  }

  request(request: SpreadsheetRuntimeRequest): Promise<unknown> {
    if (this.#destroyed) return Promise.reject(new Error('Spreadsheet has been destroyed.'));
    const target = this.element.contentWindow;
    if (target === null) return Promise.reject(new Error('Spreadsheet frame is unavailable.'));
    const requestId = ++this.#requestId;
    const message: SpreadsheetRequestMessage = {
      protocol: spreadsheetProtocol,
      instanceId: this.#instanceId,
      requestId,
      request,
    };
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (!this.#pending.delete(requestId)) return;
        reject(new Error(`Spreadsheet request timed out: ${request.method}.`));
      }, loadTimeoutMilliseconds);
      this.#pending.set(requestId, { resolve, reject, timer });
      target.postMessage(message, window.location.origin);
    });
  }

  async initialize(
    value: Extract<SpreadsheetRuntimeRequest, { method: 'init' }>['value'],
  ): Promise<void> {
    await this.request({ method: 'init', value });
  }

  attachMenuSurface(hostDocument: Document, frameDocument: Document, root: HTMLElement): void {
    if (this.#menuSurface !== undefined) throw new Error('Spreadsheet menus are already attached.');
    this.#menuSurface = new SpreadsheetTopLevelMenuSurface({
      hostDocument,
      frameDocument,
      shell: this.#shell,
      frame: this.element,
      root,
      spreadsheet: this,
      panelId: `${this.#instanceId}-panel`,
      registerDescriptor: async (value) => {
        await this.request({ method: 'addTopLevelMenu', value });
      },
      emitAction: (value) => this.#emit('menuaction', value),
      reportError: (error, menuId, phase) =>
        this.#emit('error', Object.freeze({ error: normalizeError(error), menuId, phase })),
    });
  }

  #receive(event: MessageEvent<unknown>): void {
    if (event.source !== this.element.contentWindow || event.origin !== window.location.origin)
      return;
    if (!isSpreadsheetMessage(event.data) || event.data.instanceId !== this.#instanceId) return;
    const message = event.data as SpreadsheetResponseMessage | SpreadsheetEventMessage;
    if ('event' in message) {
      if (message.event === 'batchchange') {
        try {
          this.#enqueueCommit(cloneBatchChange(message.value));
        } catch (error) {
          this.#emit('error', Object.freeze({ error: normalizeError(error) }));
        }
      } else if (message.event === 'error') {
        if (
          typeof message.value === 'object' &&
          message.value !== null &&
          !Array.isArray(message.value) &&
          typeof message.value.message === 'string'
        ) {
          this.#emit('error', Object.freeze({ error: new Error(message.value.message) }));
        } else {
          this.#emit(
            'error',
            Object.freeze({ error: new Error('Spreadsheet runtime error is malformed.') }),
          );
        }
      } else if (
        typeof message.value === 'object' &&
        message.value !== null &&
        !Array.isArray(message.value) &&
        typeof message.value.menuId === 'string'
      ) {
        this.#menuSurface?.activateFromRuntime(message.value.menuId);
      } else {
        this.#emit(
          'error',
          Object.freeze({ error: new Error('Spreadsheet menu action is malformed.') }),
        );
      }
      return;
    }
    const pending = this.#pending.get(message.requestId);
    if (pending === undefined) return;
    this.#pending.delete(message.requestId);
    window.clearTimeout(pending.timer);
    if (message.ok) pending.resolve(message.value);
    else pending.reject(new Error(message.error ?? 'Spreadsheet runtime request failed.'));
  }

  #enqueueCommit(change: SpreadsheetBatchChange): void {
    const changeId = change.id;
    this.#commitQueue = this.#commitQueue
      .catch((error: unknown) => {
        this.#emit('error', Object.freeze({ error: normalizeError(error) }));
      })
      .then(async () => {
        try {
          if (change.source !== 'rollback') await this.#onCommit?.(change);
          await this.request({ method: 'ack', value: changeId });
        } catch (cause) {
          const error = normalizeError(cause);
          try {
            const rollback = cloneBatchChange(
              await this.request({ method: 'rollback', value: change }),
            );
            this.#emit('batchchange', rollback);
          } catch (rollbackCause) {
            this.#emit('error', Object.freeze({ error: normalizeError(rollbackCause), change }));
          }
          this.#emit('error', Object.freeze({ error, change }));
          return;
        }
        this.#emit('batchchange', change);
      });
  }

  #emit<K extends keyof SpreadsheetEventMap>(type: K, value: SpreadsheetEventMap[K]): void {
    const failures: Error[] = [];
    for (const listener of this.#listeners[type]) {
      try {
        (listener as (event: SpreadsheetEventMap[K]) => void)(value);
      } catch (error) {
        failures.push(normalizeError(error));
      }
    }
    if (type === 'batchchange') {
      for (const error of failures) {
        this.#emit(
          'error',
          Object.freeze({
            error,
            change: value as SpreadsheetBatchChange,
          }),
        );
      }
    }
  }

  async destroy(): Promise<void> {
    if (this.#destroyed) return;
    this.#menuSurface?.destroy();
    this.#menuSurface = undefined;
    await Promise.race([
      this.request({ method: 'destroy' }).catch(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1_000)),
    ]);
    this.#destroyed = true;
    window.removeEventListener('message', this.#messageListener);
    this.#shell.remove();
    const error = new Error('Spreadsheet was destroyed before the request completed.');
    for (const pending of this.#pending.values()) {
      window.clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
    this.#listeners.batchchange.clear();
    this.#listeners.error.clear();
    this.#listeners.menuaction.clear();
  }

  get activeTopLevelMenuId(): string | null {
    return this.#menuSurface?.activeId ?? null;
  }

  async save(): Promise<SpreadsheetSnapshot> {
    return (await this.request({ method: 'save' })) as SpreadsheetSnapshot;
  }

  async load(snapshot: SpreadsheetSnapshot): Promise<void> {
    await this.request({ method: 'load', value: snapshot });
  }

  async getSelection(): Promise<SpreadsheetSelection | null> {
    return (await this.request({ method: 'getSelection' })) as SpreadsheetSelection | null;
  }

  async setSelection(selection: SpreadsheetSelection | null): Promise<void> {
    await this.request({ method: 'setSelection', value: selection });
  }

  async applyPatch(patch: readonly SpreadsheetCellPatch[]): Promise<SpreadsheetBatchChange> {
    return cloneBatchChange(await this.request({ method: 'applyPatch', value: patch }));
  }

  async renameColumn(columnId: string, label: string): Promise<SpreadsheetBatchChange> {
    return cloneBatchChange(
      await this.request({ method: 'renameColumn', value: { columnId, label } }),
    );
  }

  async replaceData(data: SpreadsheetDataFrame): Promise<SpreadsheetBatchChange> {
    return cloneBatchChange(await this.request({ method: 'replaceData', value: data }));
  }

  async undo(): Promise<boolean> {
    return (await this.request({ method: 'undo' })) as boolean;
  }

  async redo(): Promise<boolean> {
    return (await this.request({ method: 'redo' })) as boolean;
  }

  async addTopLevelMenu(menu: SpreadsheetTopLevelMenu): Promise<SpreadsheetTopLevelMenuHandle> {
    if (this.#destroyed) throw new Error('Spreadsheet has been destroyed.');
    if (this.#menuSurface === undefined) throw new Error('Spreadsheet menus are unavailable.');
    return this.#menuSurface.add(menu);
  }

  closeTopLevelMenu(): void {
    if (this.#destroyed) throw new Error('Spreadsheet has been destroyed.');
    if (this.#menuSurface === undefined) throw new Error('Spreadsheet menus are unavailable.');
    this.#menuSurface.close();
  }

  on<K extends keyof SpreadsheetEventMap>(
    type: K,
    listener: (event: SpreadsheetEventMap[K]) => void,
  ): () => void {
    const listeners = this.#listeners[type] as Set<(value: SpreadsheetEventMap[K]) => void>;
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
}

function waitForFrame(frame: HTMLIFrameElement): Promise<Document> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('Spreadsheet frame did not become ready in time.')),
      loadTimeoutMilliseconds,
    );
    frame.addEventListener(
      'load',
      () => {
        window.clearTimeout(timer);
        const document = frame.contentDocument;
        if (document === null) reject(new Error('Spreadsheet frame is not same-origin.'));
        else resolve(document);
      },
      { once: true },
    );
  });
}

function loadAsset<T extends HTMLElement>(element: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('Spreadsheet asset did not load in time.')),
      loadTimeoutMilliseconds,
    );
    element.addEventListener(
      'load',
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    element.addEventListener(
      'error',
      () => {
        window.clearTimeout(timer);
        reject(new Error('Spreadsheet asset failed to load.'));
      },
      { once: true },
    );
  });
}

export async function createSpreadsheet(
  options: SpreadsheetCreateOptions,
): Promise<SpreadsheetHandle> {
  if (!(options.container instanceof HTMLElement)) {
    throw new TypeError('container must be an HTMLElement.');
  }
  if (options.data !== undefined && options.snapshot !== undefined) {
    throw new TypeError('Provide data or snapshot, not both.');
  }
  const topLevelMenus = validateInitialTopLevelMenus(options.topLevelMenus);
  const limits = resolveSpreadsheetLimits(options.limits);
  const snapshot =
    options.snapshot === undefined
      ? undefined
      : validateSpreadsheetSnapshot(options.snapshot, limits);
  const profile = options.profile ?? snapshot?.profile ?? 'data-frame';
  if (profile !== 'data-frame' && profile !== 'workbook') {
    throw new TypeError('profile must be data-frame or workbook.');
  }
  if (
    snapshot !== undefined &&
    options.profile !== undefined &&
    options.profile !== snapshot.profile
  ) {
    throw new TypeError('profile must match snapshot.profile.');
  }
  const locale = options.locale ?? 'ko-KR';
  if (locale !== 'ko-KR' && locale !== 'en-US') {
    throw new TypeError('locale must be ko-KR or en-US.');
  }
  const data = cloneAndValidateDataFrame(
    options.data ?? snapshot?.data ?? emptySpreadsheetData(),
    limits,
  );
  const runtimeUrl = resolveAsset(options.runtimeUrl, 'runtimeUrl');
  const styleUrl = resolveAsset(options.styleUrl, 'styleUrl');
  const runtimeIntegrity = resolveAssetIntegrity(
    runtimeUrl,
    options.runtimeIntegrity,
    'runtimeIntegrity',
  );
  const styleIntegrity = resolveAssetIntegrity(styleUrl, options.styleIntegrity, 'styleIntegrity');

  const shell = document.createElement('div');
  shell.className = 'graflume-spreadsheet-shell';
  shell.style.position = 'relative';
  shell.style.width = '100%';
  shell.style.height = '100%';
  shell.style.overflow = 'hidden';
  const frame = document.createElement('iframe');
  frame.className = 'graflume-spreadsheet-frame';
  frame.title = options.title ?? (locale === 'ko-KR' ? '데이터 표 편집기' : 'Data table editor');
  frame.setAttribute('loading', 'eager');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.setAttribute('allow', 'clipboard-read; clipboard-write');
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';
  shell.append(frame);
  const handle = new IframeSpreadsheetHandle(frame, shell, options.onCommit);
  try {
    const frameReady = waitForFrame(frame);
    frame.src = 'about:blank';
    options.container.replaceChildren(shell);
    const childDocument = await frameReady;
    const meta = childDocument.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    const runtimeSource =
      runtimeUrl.origin === window.location.origin ? '' : ` ${runtimeUrl.origin}`;
    const styleSource = styleUrl.origin === window.location.origin ? '' : ` ${styleUrl.origin}`;
    meta.content = `default-src 'none'; script-src 'self'${runtimeSource}; style-src 'self' 'unsafe-inline'${styleSource}; img-src data: blob:; font-src data:; connect-src 'none'; worker-src 'none'`;
    childDocument.head.append(meta);

    const root = childDocument.createElement('div');
    root.id = 'graflume-spreadsheet-root';
    root.style.width = '100vw';
    root.style.height = '100vh';
    childDocument.body.style.margin = '0';
    childDocument.body.append(root);

    const style = childDocument.createElement('link');
    style.rel = 'stylesheet';
    style.href = styleUrl.href;
    if (styleIntegrity !== undefined) {
      style.integrity = styleIntegrity;
      style.crossOrigin = 'anonymous';
    }
    const styleReady = loadAsset(style);
    childDocument.head.append(style);

    const runtime = childDocument.createElement('script');
    runtime.src = runtimeUrl.href;
    runtime.defer = true;
    if (runtimeIntegrity !== undefined) {
      runtime.integrity = runtimeIntegrity;
      runtime.crossOrigin = 'anonymous';
    }
    const runtimeReady = loadAsset(runtime);
    childDocument.head.append(runtime);
    await Promise.all([styleReady, runtimeReady]);
    await handle.initialize({
      profile,
      locale,
      data,
      ...(snapshot === undefined ? {} : { snapshot }),
      limits,
    });
    handle.attachMenuSurface(document, childDocument, root);
    for (const menu of topLevelMenus) await handle.addTopLevelMenu(menu);
    frame.dataset.graflumeSpreadsheetReady = 'true';
    return handle;
  } catch (error) {
    await handle.destroy();
    throw error;
  }
}
