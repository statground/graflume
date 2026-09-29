export type SpreadsheetProfile = 'data-frame' | 'workbook';

export type SpreadsheetLocale = 'ko-KR' | 'en-US';

export type SpreadsheetScalar = string | number | boolean | null;

export interface SpreadsheetFormula {
  readonly formula: string;
  readonly result?: SpreadsheetScalar;
}

export type SpreadsheetCellContent = SpreadsheetScalar | SpreadsheetFormula;

export type SpreadsheetColumnKind = 'string' | 'number' | 'boolean' | 'date' | 'mixed';

export interface SpreadsheetColumn {
  readonly id: string;
  readonly label: string;
  readonly kind?: SpreadsheetColumnKind;
  readonly readOnly?: boolean;
}

export interface SpreadsheetRow {
  readonly id: string;
  readonly values: Readonly<Record<string, SpreadsheetCellContent>>;
}

export interface SpreadsheetDataFrame {
  readonly columns: readonly SpreadsheetColumn[];
  readonly rows: readonly SpreadsheetRow[];
}

export interface SpreadsheetCellAddress {
  readonly rowId: string;
  readonly columnId: string;
}

export interface SpreadsheetSelection {
  readonly start: SpreadsheetCellAddress;
  readonly end: SpreadsheetCellAddress;
}

export interface SpreadsheetCellPatch extends SpreadsheetCellAddress {
  readonly value: SpreadsheetCellContent;
}

export interface SpreadsheetBatchEdit extends SpreadsheetCellAddress {
  readonly before: SpreadsheetCellContent;
  readonly after: SpreadsheetCellContent;
}

export interface SpreadsheetColumnRename {
  readonly columnId: string;
  readonly before: string;
  readonly after: string;
}

export type SpreadsheetBatchSource =
  | 'edit'
  | 'paste'
  | 'patch'
  | 'replace'
  | 'load'
  | 'undo'
  | 'redo'
  | 'sort'
  | 'rename-column'
  | 'rollback';

export interface SpreadsheetBatchChange {
  readonly id: string;
  readonly source: SpreadsheetBatchSource;
  readonly edits: readonly SpreadsheetBatchEdit[];
  readonly columnRenames: readonly SpreadsheetColumnRename[];
  readonly timestamp: number;
}

export interface SpreadsheetSnapshot {
  readonly format: 'graflume-spreadsheet-v1';
  readonly profile: SpreadsheetProfile;
  readonly data: SpreadsheetDataFrame;
  /** Opaque JSON needed to preserve formulas, formatting, filters, and workbook metadata. */
  readonly workbook: unknown;
}

export interface SpreadsheetLimits {
  readonly maxRows: number;
  readonly maxColumns: number;
  readonly maxCells: number;
  readonly maxBytes: number;
}

export interface SpreadsheetCreateOptions {
  readonly container: HTMLElement;
  /** Exact URL of the isolated spreadsheet runtime asset. */
  readonly runtimeUrl: string;
  /** SHA-384 integrity required when runtimeUrl is cross-origin. */
  readonly runtimeIntegrity?: string;
  /** Exact URL of the isolated spreadsheet stylesheet. */
  readonly styleUrl: string;
  /** SHA-384 integrity required when styleUrl is cross-origin. */
  readonly styleIntegrity?: string;
  readonly profile?: SpreadsheetProfile;
  readonly locale?: SpreadsheetLocale;
  readonly title?: string;
  readonly data?: SpreadsheetDataFrame;
  readonly snapshot?: SpreadsheetSnapshot;
  readonly limits?: Partial<SpreadsheetLimits>;
  readonly onCommit?: (change: SpreadsheetBatchChange) => void | Promise<void>;
  /** Host-owned panels exposed as top-level items in the spreadsheet ribbon. */
  readonly topLevelMenus?: readonly SpreadsheetTopLevelMenu[];
}

export interface SpreadsheetErrorEvent {
  readonly error: Error;
  readonly change?: SpreadsheetBatchChange;
  readonly menuId?: string;
  readonly phase?: 'mount' | 'unmount';
}

export interface SpreadsheetTopLevelMenuContext {
  readonly id: string;
  readonly signal: AbortSignal;
  readonly spreadsheet: SpreadsheetHandle;
  close(): void;
}

export interface SpreadsheetTopLevelMenu {
  readonly id: string;
  readonly label: string;
  /** Finite ribbon sort order. Lower values appear before higher values. */
  readonly order?: number;
  readonly disabled?: boolean;
  readonly active?: boolean;
  mount(container: HTMLElement, context: SpreadsheetTopLevelMenuContext): void | Promise<void>;
  unmount?(container: HTMLElement, context: SpreadsheetTopLevelMenuContext): void | Promise<void>;
}

export interface SpreadsheetTopLevelMenuUpdate {
  readonly label?: string;
  readonly disabled?: boolean;
  readonly active?: boolean;
}

export interface SpreadsheetTopLevelMenuHandle {
  readonly id: string;
  readonly active: boolean;
  readonly disabled: boolean;
  open(): boolean;
  update(update: SpreadsheetTopLevelMenuUpdate): void;
  dispose(): void;
}

export interface SpreadsheetTopLevelMenuActionEvent {
  readonly menuId: string;
}

export interface SpreadsheetEventMap {
  readonly batchchange: SpreadsheetBatchChange;
  readonly error: SpreadsheetErrorEvent;
  readonly menuaction: SpreadsheetTopLevelMenuActionEvent;
}

export interface SpreadsheetHandle {
  readonly element: HTMLIFrameElement;
  readonly activeTopLevelMenuId: string | null;
  destroy(): Promise<void>;
  save(): Promise<SpreadsheetSnapshot>;
  load(snapshot: SpreadsheetSnapshot): Promise<void>;
  getSelection(): Promise<SpreadsheetSelection | null>;
  setSelection(selection: SpreadsheetSelection | null): Promise<void>;
  applyPatch(patch: readonly SpreadsheetCellPatch[]): Promise<SpreadsheetBatchChange>;
  renameColumn(columnId: string, label: string): Promise<SpreadsheetBatchChange>;
  replaceData(data: SpreadsheetDataFrame): Promise<SpreadsheetBatchChange>;
  undo(): Promise<boolean>;
  redo(): Promise<boolean>;
  addTopLevelMenu(menu: SpreadsheetTopLevelMenu): Promise<SpreadsheetTopLevelMenuHandle>;
  closeTopLevelMenu(): void;
  on<K extends keyof SpreadsheetEventMap>(
    type: K,
    listener: (event: SpreadsheetEventMap[K]) => void,
  ): () => void;
}
