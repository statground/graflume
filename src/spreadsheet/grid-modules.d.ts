declare module '#grid-kernel' {
  export enum GridDirection {
    UP = 0,
    RIGHT = 1,
    DOWN = 2,
    LEFT = 3,
  }
  export const GridKernel: new (config?: unknown) => {
    registerPlugins(plugins: readonly unknown[]): void;
    __getInjector(): {
      get(token: typeof GridUndoHistoryToken): { clearUndoRedo(unitId: string): void };
      get<T>(token: new (...args: never[]) => T): T;
    };
    dispose(): void;
  };
  export const GridUndoHistoryToken: unique symbol;
  export const GridFacade: {
    newAPI(kernel: unknown): GridApi;
  };
  export interface GridApi {
    readonly Event: Readonly<Record<string, string>>;
    createWorkbook(data: unknown): GridWorkbook;
    getActiveWorkbook(): GridWorkbook | null;
    disposeUnit(id: string): boolean;
    addEvent(event: string, listener: (value: unknown) => void): { dispose(): void };
    executeCommand(id: string, params?: Record<string, unknown>): Promise<boolean>;
    undo(): Promise<boolean>;
    redo(): Promise<boolean>;
    getCurrentLifecycleStage(): number;
    createMenu(item: {
      readonly id: string;
      readonly title: string;
      readonly tooltip?: string;
      readonly order?: number;
      readonly action: () => void;
    }): GridMenu;
    createSubmenu(item: {
      readonly id: string;
      readonly title: string;
      readonly tooltip?: string;
      readonly order?: number;
    }): GridSubmenu;
  }
  export interface GridMenu {
    appendTo(location: string): void;
  }
  export interface GridSubmenu {
    addSubmenu(menu: GridMenu | GridSubmenu): GridSubmenu;
    addSeparator(): GridSubmenu;
    appendTo(location: string): void;
  }
  export interface GridWorkbook {
    getId(): string;
    save(): unknown;
    getActiveSheet(): GridWorksheet;
    getTableInfo(id: string): unknown;
  }
  export interface GridWorksheet {
    getSheetId(): string;
    getRange(row: number, column: number, rows?: number, columns?: number): GridRange;
    getSelection(): { getActiveRange(): GridRange | null } | null;
    getMaxRows(): number;
    getMaxColumns(): number;
    getLastRow(): number;
    getLastColumn(): number;
    addTable(
      name: string,
      range: unknown,
      id?: string,
      options?: unknown,
    ): boolean | Promise<boolean>;
  }
  export interface GridRange {
    activate(): GridRange;
    getRow(): number;
    getLastRow(): number;
    getColumn(): number;
    getLastColumn(): number;
    getValues(): unknown[][];
    getFormulas(): string[][];
    setValues(values: unknown[][]): GridRange;
    getRange(): unknown;
  }
}

declare module '#grid-preset-core' {
  export function gridCorePreset(config?: unknown): GridPreset;
  export interface GridPreset {
    readonly plugins: readonly (unknown | readonly [unknown, unknown?] | null)[];
    readonly locales?: Readonly<Record<string, unknown>>;
  }
}

declare module '#grid-preset-filter' {
  export function gridFilterPreset(config?: unknown): import('#grid-preset-core').GridPreset;
}

declare module '#grid-preset-sort' {
  export function gridSortPreset(config?: unknown): import('#grid-preset-core').GridPreset;
}

declare module '#grid-preset-validation' {
  export function gridValidationPreset(config?: unknown): import('#grid-preset-core').GridPreset;
}

declare module '#grid-preset-formatting' {
  export function gridFormattingPreset(config?: unknown): import('#grid-preset-core').GridPreset;
}

declare module '#grid-preset-find' {
  export function gridFindPreset(config?: unknown): import('#grid-preset-core').GridPreset;
}

declare module '#grid-preset-note' {
  export function gridNotePreset(config?: unknown): import('#grid-preset-core').GridPreset;
}

declare module '#grid-preset-link' {
  export function gridLinkPreset(config?: unknown): import('#grid-preset-core').GridPreset;
}

declare module '#grid-preset-table' {
  export const GridTableManager: new () => {
    getTableById(
      unitId: string,
      tableId: string,
    ):
      | {
          getId(): string;
          getRange(): {
            startRow: number;
            startColumn: number;
            endRow: number;
            endColumn: number;
          };
          getTableColumnByIndex(index: number):
            | {
                displayName: string;
              }
            | undefined;
        }
      | undefined;
    updateTableRange(
      unitId: string,
      tableId: string,
      config: {
        newRange: {
          startRow: number;
          startColumn: number;
          endRow: number;
          endColumn: number;
        };
      },
    ): void;
  };
  export function gridTablePreset(config?: unknown): import('#grid-preset-core').GridPreset;
}

declare module '#grid-locales' {
  export const gridEnglish: readonly Readonly<Record<string, unknown>>[];
  export const gridKorean: readonly Readonly<Record<string, unknown>>[];
}
