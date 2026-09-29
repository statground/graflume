import {
  GridDirection,
  GridFacade,
  GridKernel,
  GridUndoHistoryToken,
  type GridApi,
  type GridRange,
  type GridWorkbook,
  type GridWorksheet,
} from '#grid-kernel';
import { gridEnglish, gridKorean } from '#grid-locales';
import { gridFormattingPreset } from '#grid-preset-formatting';
import { gridCorePreset, type GridPreset } from '#grid-preset-core';
import { gridValidationPreset } from '#grid-preset-validation';
import { gridFilterPreset } from '#grid-preset-filter';
import { gridFindPreset } from '#grid-preset-find';
import { gridLinkPreset } from '#grid-preset-link';
import { gridNotePreset } from '#grid-preset-note';
import { gridSortPreset } from '#grid-preset-sort';
import { GridTableManager, gridTablePreset } from '#grid-preset-table';
import {
  cloneAndValidateDataFrame,
  resolveSpreadsheetLimits,
  validateSpreadsheetSnapshot,
} from './data-frame.js';
import { isSpreadsheetPasteCommand } from './change-source.js';
import {
  isSpreadsheetMessage,
  spreadsheetProtocol,
  type SpreadsheetEventMessage,
  type SpreadsheetRequestMessage,
  type SpreadsheetResponseMessage,
  type SpreadsheetRuntimeInit,
  type SpreadsheetRuntimeRequest,
} from './protocol.js';
import type { SpreadsheetTopLevelMenuDescriptor } from './menu.js';
import type {
  SpreadsheetBatchChange,
  SpreadsheetBatchEdit,
  SpreadsheetBatchSource,
  SpreadsheetCellContent,
  SpreadsheetCellPatch,
  SpreadsheetColumn,
  SpreadsheetColumnRename,
  SpreadsheetDataFrame,
  SpreadsheetLimits,
  SpreadsheetSelection,
  SpreadsheetSnapshot,
  SpreadsheetTopLevelMenuActionEvent,
} from './types.js';

type GridSnapshot = Record<string, unknown>;

class ColumnLabelEditError extends Error {}

const rootId = 'graflume-spreadsheet-root';
const workbookId = 'graflume-workbook';
const sheetId = 'graflume-sheet';
const identityHeader = '__graflume_row_identity__';
const moveSelectionCommand = 'sheet.command.move-selection';
const hostOrigin = (() => {
  try {
    const origin = window.parent.location.origin;
    return /^https?:\/\//.test(origin) ? origin : undefined;
  } catch {
    return undefined;
  }
})();
const structuralCommand =
  /(?:insert-(?:multi-)?(?:row|rows|col|cols|range|sheet)|remove-(?:row|col|sheet)|delete-(?:range|table)|append-row|move-(?:rows|cols|range)|copy-sheet|split-text-to-columns|set-(?:col-data|col-hidden|col-visible|col-visible-on-cols|selected-cols-visible|table-config|worksheet-(?:row-count|column-count|order))|(?:add|remove)-worksheet-merge|add-table|table-(?:insert|remove))/;
const menuIdPattern = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const maximumMenus = 32;

function mergeObjects(
  values: readonly Readonly<Record<string, unknown>>[],
): Record<string, unknown> {
  const target: Record<string, unknown> = {};
  for (const value of values) {
    for (const [key, child] of Object.entries(value)) {
      if (
        typeof child === 'object' &&
        child !== null &&
        !Array.isArray(child) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        target[key] = mergeObjects([
          target[key] as Readonly<Record<string, unknown>>,
          child as Readonly<Record<string, unknown>>,
        ]);
      } else {
        target[key] = child;
      }
    }
  }
  return target;
}

function cellToGrid(value: SpreadsheetCellContent): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) return { f: value.formula };
  return { v: value };
}

function dataToGridSnapshot(data: SpreadsheetDataFrame, locale: 'ko-KR' | 'en-US'): GridSnapshot {
  const cellData: Record<number, Record<number, Record<string, unknown>>> = {};
  const identityColumn = data.columns.length;
  const header: Record<number, Record<string, unknown>> = {
    [identityColumn]: { v: identityHeader },
  };
  for (let column = 0; column < data.columns.length; column += 1) {
    const item = data.columns[column];
    if (item !== undefined) header[column] = { v: item.label };
  }
  cellData[0] = header;
  for (let row = 0; row < data.rows.length; row += 1) {
    const item = data.rows[row];
    if (item === undefined) continue;
    const rowData: Record<number, Record<string, unknown>> = {
      [identityColumn]: { v: item.id },
    };
    for (let column = 0; column < data.columns.length; column += 1) {
      const columnItem = data.columns[column];
      if (columnItem === undefined) continue;
      rowData[column] = cellToGrid(item.values[columnItem.id] ?? null);
    }
    cellData[row + 1] = rowData;
  }
  return {
    id: workbookId,
    name: locale === 'ko-KR' ? '데이터' : 'Data',
    locale: locale === 'ko-KR' ? 'koKR' : 'enUS',
    sheetOrder: [sheetId],
    styles: {},
    sheets: {
      [sheetId]: {
        id: sheetId,
        name: locale === 'ko-KR' ? '표 1' : 'Table 1',
        rowCount: Math.max(100, data.rows.length + 20),
        columnCount: Math.max(26, data.columns.length + 6),
        cellData,
        columnData: { [identityColumn]: { w: 0, hd: 1 } },
        rowHeader: { width: 46, hidden: 0 },
        columnHeader: { height: 24, hidden: 0 },
        showGridlines: 1,
      },
    },
  };
}

function normalizeContent(value: unknown, formula: string | undefined): SpreadsheetCellContent {
  const scalar =
    value === undefined || value === null
      ? null
      : typeof value === 'string' || typeof value === 'boolean'
        ? value
        : typeof value === 'number' && Number.isFinite(value)
          ? value
          : String(value);
  if (typeof formula === 'string' && formula.startsWith('=')) {
    return Object.freeze({ formula, result: scalar });
  }
  return scalar;
}

function contentEqual(left: SpreadsheetCellContent, right: SpreadsheetCellContent): boolean {
  if (typeof left === 'object' && left !== null && typeof right === 'object' && right !== null) {
    return left.formula === right.formula;
  }
  return Object.is(left, right);
}

function diffData(
  before: SpreadsheetDataFrame,
  after: SpreadsheetDataFrame,
): readonly SpreadsheetBatchEdit[] {
  const beforeRows = new Map(before.rows.map((row) => [row.id, row]));
  const afterRows = new Map(after.rows.map((row) => [row.id, row]));
  const columnIds = new Set([
    ...before.columns.map((column) => column.id),
    ...after.columns.map((column) => column.id),
  ]);
  const rowIds = new Set([...beforeRows.keys(), ...afterRows.keys()]);
  const edits: SpreadsheetBatchEdit[] = [];
  for (const rowId of rowIds) {
    for (const columnId of columnIds) {
      const oldValue = beforeRows.get(rowId)?.values[columnId] ?? null;
      const newValue = afterRows.get(rowId)?.values[columnId] ?? null;
      if (!contentEqual(oldValue, newValue)) {
        edits.push(Object.freeze({ rowId, columnId, before: oldValue, after: newValue }));
      }
    }
  }
  return Object.freeze(edits);
}

function diffColumnLabels(
  before: SpreadsheetDataFrame,
  after: SpreadsheetDataFrame,
): readonly SpreadsheetColumnRename[] {
  const afterById = new Map(after.columns.map((column) => [column.id, column]));
  return Object.freeze(
    before.columns.flatMap((column) => {
      const next = afterById.get(column.id);
      return next === undefined || next.label === column.label
        ? []
        : [
            Object.freeze({
              columnId: column.id,
              before: column.label,
              after: next.label,
            }),
          ];
    }),
  );
}

function createBatch(
  source: SpreadsheetBatchSource,
  edits: readonly SpreadsheetBatchEdit[],
  columnRenames: readonly SpreadsheetColumnRename[] = [],
): SpreadsheetBatchChange {
  return Object.freeze({
    id: `gfs-change-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    source,
    edits: Object.freeze([...edits]),
    columnRenames: Object.freeze([...columnRenames]),
    timestamp: Date.now(),
  });
}

class SpreadsheetRuntime {
  readonly #kernel: InstanceType<typeof GridKernel>;
  readonly #api: GridApi;
  readonly #instanceId: string;
  #workbook: GridWorkbook | null = null;
  #data: SpreadsheetDataFrame;
  #limits: SpreadsheetLimits;
  #profile: 'data-frame' | 'workbook';
  #locale: 'ko-KR' | 'en-US';
  #suppressEvents = 0;
  #eventTimer: number | undefined;
  #pendingSource: SpreadsheetBatchSource = 'edit';
  #changeListener: { dispose(): void } | undefined;
  #editChangeListener: { dispose(): void } | undefined;
  #editGuard: { dispose(): void } | undefined;
  #commandGuard: { dispose(): void } | undefined;
  #commandListener: { dispose(): void } | undefined;
  readonly #rollbackStates = new Map<string, SpreadsheetSnapshot>();
  readonly #rollbackBytes = new Map<string, number>();
  #pendingCommitId: string | undefined;
  #lastColumnLabelErrorAt = 0;
  #pendingHeaderEdit: { readonly column: number; readonly label: string } | undefined;
  #acceptedWorkbook: unknown;
  readonly #createTable: boolean;
  readonly #menuIds = new Set<string>();
  readonly #keyGuard = (event: KeyboardEvent): void => {
    if (
      this.#suppressEvents > 0 ||
      this.#profile !== 'data-frame' ||
      !['Backspace', 'Delete'].includes(event.key)
    ) {
      return;
    }
    const range = this.#sheet().getSelection()?.getActiveRange();
    if (range !== null && range !== undefined && range.getRow() === 0) {
      this.#reportColumnLabelError();
    }
  };

  constructor(instanceId: string, init: SpreadsheetRuntimeInit) {
    this.#instanceId = instanceId;
    this.#limits = resolveSpreadsheetLimits(init.limits);
    if (init.profile !== 'data-frame' && init.profile !== 'workbook') {
      throw new TypeError('profile must be data-frame or workbook.');
    }
    if (init.locale !== 'ko-KR' && init.locale !== 'en-US') {
      throw new TypeError('locale must be ko-KR or en-US.');
    }
    const checkedSnapshot =
      init.snapshot === undefined
        ? undefined
        : validateSpreadsheetSnapshot(init.snapshot, this.#limits);
    if (checkedSnapshot !== undefined && checkedSnapshot.profile !== init.profile) {
      throw new TypeError('profile must match snapshot.profile.');
    }
    this.#profile = checkedSnapshot?.profile ?? init.profile;
    this.#locale = init.locale;
    this.#data = cloneAndValidateDataFrame(checkedSnapshot?.data ?? init.data, this.#limits);
    this.#createTable = checkedSnapshot === undefined && this.#profile === 'data-frame';
    const packs = init.locale === 'ko-KR' ? gridKorean : gridEnglish;
    const localeKey = init.locale === 'ko-KR' ? 'koKR' : 'enUS';
    this.#kernel = new GridKernel({
      locale: localeKey,
      locales: { [localeKey]: mergeObjects(packs) },
    });
    const presets: readonly GridPreset[] = [
      gridCorePreset({
        container: rootId,
        header: true,
        toolbar: true,
        formulaBar: true,
        footer: true,
        disableAutoFocus: false,
      }),
      gridFilterPreset(),
      gridSortPreset(),
      gridValidationPreset(),
      gridFormattingPreset(),
      gridFindPreset(),
      gridNotePreset(),
      gridLinkPreset(),
      gridTablePreset(),
    ];
    for (const preset of presets) {
      const plugins = preset.plugins
        .filter((plugin): plugin is unknown | readonly [unknown, unknown?] => plugin !== null)
        .map((plugin) => (Array.isArray(plugin) ? plugin : [plugin]));
      this.#kernel.registerPlugins(plugins);
    }
    this.#api = GridFacade.newAPI(this.#kernel);
    this.#replaceWorkbook(checkedSnapshot?.workbook ?? dataToGridSnapshot(this.#data, init.locale));
    if (checkedSnapshot !== undefined) this.#assertSnapshotCoherence(checkedSnapshot);
    this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
    this.#commandGuard = this.#api.addEvent('BeforeCommandExecute', (value) => {
      if (this.#suppressEvents > 0) return;
      if (typeof value !== 'object' || value === null) return;
      const event = value as {
        id?: unknown;
        cancel?: boolean;
        params?: Record<string, unknown>;
      };
      if (typeof event.id !== 'string') return;
      if (this.#pendingCommitId !== undefined) {
        event.cancel = true;
        return;
      }
      const params = event.params;
      if (
        event.id === moveSelectionCommand &&
        params?.jumpOver === undefined &&
        params?.extra === undefined &&
        this.#wouldWrapSelection(params?.direction)
      ) {
        event.cancel = true;
        return;
      }
      if (this.#profile !== 'data-frame') return;
      if (isSpreadsheetPasteCommand(event.id)) this.#pendingSource = 'paste';
      if (event.id === 'sheet.command.sort-range' && params !== undefined) {
        this.#pendingSource = 'sort';
        const range = params.range;
        if (typeof range !== 'object' || range === null) {
          event.cancel = true;
          return;
        }
        params.range = {
          ...(range as Record<string, unknown>),
          startRow: 0,
          endRow: this.#data.rows.length,
          startColumn: 0,
          endColumn: this.#data.columns.length,
        };
        params.hasTitle = true;
        return;
      }
      if (event.id === 'sheet.command.reorder-range') {
        const range = params?.range as Record<string, unknown> | undefined;
        const safe =
          range?.startRow === 0 &&
          range.endRow === this.#data.rows.length &&
          range.startColumn === 0 &&
          range.endColumn === this.#data.columns.length;
        if (!safe) event.cancel = true;
        return;
      }
      if (structuralCommand.test(event.id)) event.cancel = true;
    });
    this.#commandListener = this.#api.addEvent('CommandExecuted', () => {
      if (this.#suppressEvents > 0 || this.#pendingCommitId !== undefined) return;
      window.setTimeout(() => {
        if (
          this.#suppressEvents > 0 ||
          this.#pendingCommitId !== undefined ||
          this.#eventTimer !== undefined
        ) {
          return;
        }
        try {
          this.#assertProtectedFrame();
          this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
        } catch {
          this.#replaceWorkbook(this.#acceptedWorkbook);
        } finally {
          this.#pendingSource = 'edit';
        }
      }, 0);
    });
  }

  async ready(): Promise<void> {
    const started = Date.now();
    while (this.#api.getCurrentLifecycleStage() < 3) {
      if (Date.now() - started > 15_000)
        throw new Error('Spreadsheet rendering did not become ready.');
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    if (
      this.#createTable ||
      (this.#profile === 'data-frame' &&
        this.#workbook?.getTableInfo('graflume-data-frame') === undefined)
    ) {
      await this.#setupDataFrameTable();
    }
    this.#syncTableColumnLabels(this.#data.columns);
    this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
    this.#changeListener = this.#api.addEvent('SheetValueChanged', () =>
      this.#scheduleGridChange(),
    );
    this.#editChangeListener = this.#api.addEvent('SheetEditChanging', (value) => {
      if (this.#suppressEvents > 0 || this.#profile !== 'data-frame') return;
      if (typeof value !== 'object' || value === null) return;
      const edit = value as {
        readonly row?: unknown;
        readonly column?: unknown;
        readonly value?: { toPlainText?: () => string };
      };
      if (
        edit.row !== 0 ||
        typeof edit.column !== 'number' ||
        edit.column < 0 ||
        edit.column >= this.#data.columns.length ||
        typeof edit.value?.toPlainText !== 'function'
      ) {
        return;
      }
      this.#pendingHeaderEdit = {
        column: edit.column,
        label: edit.value.toPlainText().trim(),
      };
    });
    this.#editGuard = this.#api.addEvent('BeforeSheetEditEnd', (value) => {
      if (this.#suppressEvents > 0 || this.#profile !== 'data-frame') return;
      if (typeof value !== 'object' || value === null) return;
      const edit = value as {
        readonly row?: unknown;
        readonly column?: unknown;
        readonly isConfirm?: unknown;
        readonly value?: { toPlainText?: () => string };
      };
      if (
        edit.row !== 0 ||
        typeof edit.column !== 'number' ||
        edit.column < 0 ||
        edit.column >= this.#data.columns.length ||
        typeof edit.value?.toPlainText !== 'function'
      ) {
        return;
      }
      const pending = this.#pendingHeaderEdit;
      this.#pendingHeaderEdit = undefined;
      if (edit.isConfirm !== true) return;
      const label =
        pending?.column === edit.column ? pending.label : edit.value.toPlainText().trim();
      if (this.#isInvalidColumnLabel(edit.column, label)) {
        this.#reportColumnLabelError();
      }
    });
    window.addEventListener('keydown', this.#keyGuard, true);
  }

  addTopLevelMenu(value: SpreadsheetTopLevelMenuDescriptor): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Top-level menu descriptor must be an object.');
    }
    if (typeof value.id !== 'string' || !menuIdPattern.test(value.id)) {
      throw new TypeError('Top-level menu descriptor has an invalid id.');
    }
    if (
      typeof value.label !== 'string' ||
      value.label.trim().length === 0 ||
      value.label.trim().length > 120
    ) {
      throw new TypeError('Top-level menu descriptor has an invalid label.');
    }
    if (
      value.order !== undefined &&
      (typeof value.order !== 'number' || !Number.isFinite(value.order))
    ) {
      throw new TypeError('Top-level menu descriptor has an invalid order.');
    }
    if (this.#menuIds.has(value.id)) {
      throw new TypeError(`Duplicate top-level menu id: ${value.id}.`);
    }
    if (this.#menuIds.size >= maximumMenus) {
      throw new RangeError(`A spreadsheet cannot register more than ${maximumMenus} menus.`);
    }
    const slot = this.#menuIds.size;
    const internalId = `graflume-host-menu-${slot}`;
    const openLabel = this.#locale === 'ko-KR' ? '패널 열기' : 'Open panel';
    const action = this.#api.createMenu({
      id: `${internalId}-open`,
      title: openLabel,
      tooltip: openLabel,
      order: 0,
      action: () => this.#emitMenuAction(value.id),
    });
    this.#api
      .createSubmenu({
        id: internalId,
        title: value.label.trim(),
        tooltip: value.label.trim(),
        order: value.order ?? 10_000 + slot,
      })
      .addSubmenu(action)
      .appendTo('ribbon');
    this.#menuIds.add(value.id);
  }

  async #setupDataFrameTable(): Promise<void> {
    if (
      this.#profile !== 'data-frame' ||
      this.#data.columns.length === 0 ||
      this.#data.rows.length === 0
    ) {
      return;
    }
    if (this.#workbook?.getTableInfo('graflume-data-frame') !== undefined) return;
    const range = this.#sheet().getRange(
      0,
      0,
      this.#data.rows.length + 1,
      this.#data.columns.length + 1,
    );
    this.#suppressEvents += 1;
    let added: boolean;
    try {
      added = await this.#sheet().addTable('GraflumeData', range.getRange(), 'graflume-data-frame');
    } finally {
      this.#suppressEvents -= 1;
    }
    if (!added) throw new Error('The data-frame table could not be created.');
    this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
  }

  #replaceWorkbook(snapshot: unknown): void {
    this.#suppressEvents += 1;
    try {
      if (this.#workbook !== null) this.#api.disposeUnit(this.#workbook.getId());
      this.#workbook = this.#api.createWorkbook(snapshot);
    } finally {
      this.#suppressEvents -= 1;
    }
  }

  #sheet(): GridWorksheet {
    if (this.#workbook === null) throw new Error('Spreadsheet workbook is unavailable.');
    return this.#workbook.getActiveSheet();
  }

  #wouldWrapSelection(direction: unknown): boolean {
    const sheet = this.#sheet();
    const range = sheet.getSelection()?.getActiveRange();
    if (range === null || range === undefined) return false;
    switch (direction) {
      case GridDirection.UP:
        return range.getRow() === 0;
      case GridDirection.RIGHT:
        return range.getLastColumn() === sheet.getMaxColumns() - 1;
      case GridDirection.DOWN:
        return range.getLastRow() === sheet.getMaxRows() - 1;
      case GridDirection.LEFT:
        return range.getColumn() === 0;
      default:
        return false;
    }
  }

  #readData(columns: readonly SpreadsheetColumn[] = this.#data.columns): SpreadsheetDataFrame {
    if (this.#data.columns.length === 0 || this.#data.rows.length === 0) {
      return cloneAndValidateDataFrame({ columns, rows: this.#data.rows }, this.#limits);
    }
    const range = this.#sheet().getRange(
      1,
      0,
      this.#data.rows.length,
      this.#data.columns.length + 1,
    );
    const values = range.getValues();
    const formulas = range.getFormulas();
    const expectedIds = new Set(this.#data.rows.map((row) => row.id));
    const identityColumn = this.#data.columns.length;
    const actualIds = values.map((row) => row?.[identityColumn]);
    if (
      actualIds.some((id) => typeof id !== 'string') ||
      new Set(actualIds as string[]).size !== expectedIds.size ||
      !(actualIds as string[]).every((id) => expectedIds.has(id))
    ) {
      throw new Error('Protected data-frame row identities were changed.');
    }
    const rowsById = new Map<string, Record<string, SpreadsheetCellContent>>();
    values.forEach((valueRow, rowIndex) => {
      const rowId = valueRow?.[identityColumn] as string;
      const rowValues: Record<string, SpreadsheetCellContent> = {};
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
        const column = columns[columnIndex];
        if (column !== undefined) {
          rowValues[column.id] = normalizeContent(
            values[rowIndex]?.[columnIndex],
            formulas[rowIndex]?.[columnIndex],
          );
        }
      }
      rowsById.set(rowId, rowValues);
    });
    return cloneAndValidateDataFrame(
      {
        columns,
        rows: this.#data.rows.map((row) => ({ id: row.id, values: rowsById.get(row.id) ?? {} })),
      },
      this.#limits,
    );
  }

  #scheduleGridChange(): void {
    if (this.#suppressEvents > 0 || this.#eventTimer !== undefined) return;
    this.#eventTimer = window.setTimeout(async () => {
      this.#eventTimer = undefined;
      const before = this.#data;
      let after: SpreadsheetDataFrame;
      try {
        this.#assertProtectedFrame(null);
        const columns = this.#readEditedColumns();
        await this.#writeColumnLabels(columns);
        after = this.#readData(columns);
        this.#assertProtectedFrame(columns);
      } catch (error) {
        this.#pendingSource = 'edit';
        this.#replaceWorkbook(this.#acceptedWorkbook);
        if (error instanceof ColumnLabelEditError) this.#reportColumnLabelError();
        else this.#emitError(error);
        return;
      }
      let edits = diffData(before, after);
      const columnRenames = diffColumnLabels(before, after);
      if (this.#profile === 'data-frame') {
        edits = edits.filter((edit) => {
          const column = before.columns.find((candidate) => candidate.id === edit.columnId);
          return column?.readOnly !== true;
        });
      }
      const rejected = diffData(before, after).filter(
        (edit) =>
          !edits.some(
            (accepted) => accepted.rowId === edit.rowId && accepted.columnId === edit.columnId,
          ),
      );
      if (rejected.length > 0) {
        this.#writeEdits(
          rejected.map((edit) => ({ ...edit, after: edit.before })),
          true,
        );
      }
      if (edits.length === 0 && columnRenames.length === 0) {
        this.#pendingSource = 'edit';
        this.#data = this.#readData();
        this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
        return;
      }
      const acceptedData = this.#readData(after.columns);
      const source =
        this.#pendingSource === 'paste' && edits.length > 0
          ? 'paste'
          : columnRenames.length > 0
            ? 'rename-column'
            : this.#pendingSource;
      this.#pendingSource = 'edit';
      const change = createBatch(source, edits, columnRenames);
      this.#storeRollback(change.id, this.#snapshot(before, this.#acceptedWorkbook));
      this.#data = acceptedData;
      this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
      this.#emit(change);
    }, 0);
  }

  #assertProtectedFrame(
    expectedColumns: readonly SpreadsheetColumn[] | null = this.#data.columns,
  ): void {
    if (this.#profile !== 'data-frame') return;
    const header = this.#sheet()
      .getRange(0, 0, 1, this.#data.columns.length + 1)
      .getValues()[0];
    const snapshot = this.#workbook?.save() as
      { sheets?: Record<string, { columnData?: Record<number, { hd?: number }> }> } | undefined;
    const sheet = snapshot?.sheets?.[sheetId];
    const identityColumn = this.#data.columns.length;
    if (
      header?.[identityColumn] !== identityHeader ||
      (expectedColumns !== null &&
        expectedColumns.some((column, index) => header?.[index] !== column.label)) ||
      this.#sheet().getLastRow() > this.#data.rows.length ||
      this.#sheet().getLastColumn() > this.#data.columns.length ||
      sheet?.columnData?.[identityColumn]?.hd !== 1
    ) {
      throw new Error('Protected data-frame structure was changed.');
    }
  }

  #readEditedColumns(): readonly SpreadsheetColumn[] {
    if (this.#profile !== 'data-frame') return this.#data.columns;
    const range = this.#sheet().getRange(0, 0, 1, this.#data.columns.length);
    const values = range.getValues()[0] ?? [];
    const formulas = range.getFormulas()[0] ?? [];
    const labels = new Set<string>();
    const columns = this.#data.columns.map((column, index) => {
      if (typeof formulas[index] === 'string' && formulas[index]?.startsWith('=')) {
        throw new ColumnLabelEditError(this.#columnLabelEditMessage());
      }
      const value = values[index];
      if (
        value !== null &&
        value !== undefined &&
        typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean'
      ) {
        throw new ColumnLabelEditError(this.#columnLabelEditMessage());
      }
      const label = (value === null || value === undefined ? '' : String(value)).trim();
      if (label.length === 0 || labels.has(label)) {
        throw new ColumnLabelEditError(this.#columnLabelEditMessage());
      }
      labels.add(label);
      return { ...column, label };
    });
    return cloneAndValidateDataFrame({ columns, rows: this.#data.rows }, this.#limits).columns;
  }

  #columnLabelEditMessage(): string {
    return this.#locale === 'ko-KR'
      ? '변수 이름은 비어 있거나 중복될 수 없습니다.'
      : 'Column names cannot be blank or duplicated.';
  }

  #isInvalidColumnLabel(index: number, label: string): boolean {
    return (
      label.length === 0 ||
      label.startsWith('=') ||
      this.#data.columns.some(
        (column, candidateIndex) => candidateIndex !== index && column.label === label,
      )
    );
  }

  #reportColumnLabelError(): void {
    const now = Date.now();
    if (now - this.#lastColumnLabelErrorAt < 100) return;
    this.#lastColumnLabelErrorAt = now;
    this.#emitError(new ColumnLabelEditError(this.#columnLabelEditMessage()));
  }

  #syncTableColumnLabels(columns: readonly SpreadsheetColumn[]): void {
    if (this.#profile !== 'data-frame' || this.#workbook === null || columns.length === 0) return;
    const manager = this.#kernel.__getInjector().get(GridTableManager);
    const table = manager.getTableById(this.#workbook.getId(), 'graflume-data-frame');
    if (table === undefined) return;
    let changed = false;
    for (let index = 0; index < columns.length; index += 1) {
      const tableColumn = table.getTableColumnByIndex(index);
      const label = columns[index]?.label;
      if (tableColumn === undefined || label === undefined) {
        throw new Error('Spreadsheet table columns are inconsistent with the data frame.');
      }
      if (tableColumn.displayName !== label) {
        tableColumn.displayName = label;
        changed = true;
      }
    }
    if (!changed) return;
    this.#suppressEvents += 1;
    try {
      manager.updateTableRange(this.#workbook.getId(), table.getId(), {
        newRange: table.getRange(),
      });
    } finally {
      this.#suppressEvents -= 1;
    }
  }

  async #writeColumnLabels(columns: readonly SpreadsheetColumn[]): Promise<void> {
    if (this.#profile !== 'data-frame' || columns.length === 0) return;
    const range = this.#sheet().getRange(0, 0, 1, columns.length);
    const current = range.getValues()[0] ?? [];
    const formulas = range.getFormulas()[0] ?? [];
    if (
      columns.every(
        (column, index) =>
          current[index] === column.label &&
          !(typeof formulas[index] === 'string' && formulas[index]?.startsWith('=')),
      )
    ) {
      this.#syncTableColumnLabels(columns);
      return;
    }
    const indexes = columns.flatMap((column, index) =>
      current[index] === column.label &&
      !(typeof formulas[index] === 'string' && formulas[index]?.startsWith('='))
        ? []
        : [index],
    );
    this.#suppressEvents += 1;
    try {
      for (const index of indexes) {
        const updated = await this.#api.executeCommand('sheet.command.set-range-values', {
          unitId: this.#workbook?.getId(),
          subUnitId: this.#sheet().getSheetId(),
          range: {
            startRow: 0,
            endRow: 0,
            startColumn: index,
            endColumn: index,
          },
          value: cellToGrid(columns[index]?.label ?? ''),
        });
        if (!updated) throw new Error('Spreadsheet column label could not be updated.');
      }
    } finally {
      this.#suppressEvents -= 1;
    }
    this.#syncTableColumnLabels(columns);
  }

  #writeEdits(
    edits: readonly { rowId: string; columnId: string; after: SpreadsheetCellContent }[],
    allowReadOnly = false,
  ): void {
    if (edits.length === 0) return;
    const visualRowIds = this.#visualRowIds();
    const coordinates = edits.map((edit) => ({
      edit,
      row: visualRowIds.indexOf(edit.rowId),
      column: this.#data.columns.findIndex((candidate) => candidate.id === edit.columnId),
    }));
    if (coordinates.some(({ row, column }) => row < 0 || column < 0)) {
      throw new RangeError('Patch contains an unknown row or column id.');
    }
    if (
      !allowReadOnly &&
      this.#profile === 'data-frame' &&
      coordinates.some(({ column }) => this.#data.columns[column]?.readOnly === true)
    ) {
      throw new TypeError('Patch targets a read-only data-frame column.');
    }
    const startRow = Math.min(...coordinates.map(({ row }) => row));
    const endRow = Math.max(...coordinates.map(({ row }) => row));
    const startColumn = Math.min(...coordinates.map(({ column }) => column));
    const endColumn = Math.max(...coordinates.map(({ column }) => column));
    const range = this.#sheet().getRange(
      startRow + 1,
      startColumn,
      endRow - startRow + 1,
      endColumn - startColumn + 1,
    );
    const currentValues = range.getValues();
    const currentFormulas = range.getFormulas();
    const matrix = currentValues.map((row, rowOffset) =>
      row.map((value, columnOffset) =>
        cellToGrid(normalizeContent(value, currentFormulas[rowOffset]?.[columnOffset])),
      ),
    );
    for (const { edit, row, column } of coordinates) {
      const matrixRow = matrix[row - startRow];
      if (matrixRow !== undefined) matrixRow[column - startColumn] = cellToGrid(edit.after);
    }
    this.#suppressEvents += 1;
    try {
      range.setValues(matrix);
    } finally {
      this.#suppressEvents -= 1;
    }
  }

  #snapshot(data = this.#data, workbook = this.#workbook?.save()): SpreadsheetSnapshot {
    if (this.#workbook === null) throw new Error('Spreadsheet workbook is unavailable.');
    return Object.freeze({
      format: 'graflume-spreadsheet-v1',
      profile: this.#profile,
      data,
      workbook: structuredClone(workbook),
    });
  }

  #storeRollback(id: string, snapshot: SpreadsheetSnapshot): void {
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength;
    this.#rollbackStates.set(id, snapshot);
    this.#rollbackBytes.set(id, bytes);
    const retainedBytes = () =>
      [...this.#rollbackBytes.values()].reduce((total, value) => total + value, 0);
    while (this.#rollbackStates.size > 4 || retainedBytes() > this.#limits.maxBytes * 2) {
      const oldest = this.#rollbackStates.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.#rollbackStates.delete(oldest);
      this.#rollbackBytes.delete(oldest);
    }
  }

  acknowledge(id: string): void {
    if (this.#pendingCommitId === id) this.#pendingCommitId = undefined;
    this.#rollbackStates.delete(id);
    this.#rollbackBytes.delete(id);
  }

  #emit(change: SpreadsheetBatchChange): void {
    if (change.source !== 'rollback') this.#pendingCommitId = change.id;
    const message: SpreadsheetEventMessage = {
      protocol: spreadsheetProtocol,
      instanceId: this.#instanceId,
      event: 'batchchange',
      value: change,
    };
    if (hostOrigin !== undefined) window.parent.postMessage(message, hostOrigin);
  }

  #emitMenuAction(menuId: string): void {
    const message: SpreadsheetEventMessage = {
      protocol: spreadsheetProtocol,
      instanceId: this.#instanceId,
      event: 'menuaction',
      value: Object.freeze({ menuId }) as SpreadsheetTopLevelMenuActionEvent,
    };
    if (hostOrigin !== undefined) window.parent.postMessage(message, hostOrigin);
  }

  #emitError(error: unknown): void {
    const message: SpreadsheetEventMessage = {
      protocol: spreadsheetProtocol,
      instanceId: this.#instanceId,
      event: 'error',
      value: Object.freeze({ message: error instanceof Error ? error.message : String(error) }),
    };
    if (hostOrigin !== undefined) window.parent.postMessage(message, hostOrigin);
  }

  save(): SpreadsheetSnapshot {
    this.#assertProtectedFrame();
    this.#data = this.#readData();
    return this.#snapshot();
  }

  async load(snapshot: SpreadsheetSnapshot): Promise<void> {
    this.#assertNoPendingCommit();
    const checked = validateSpreadsheetSnapshot(snapshot, this.#limits);
    const before = this.#snapshot(this.#data, this.#acceptedWorkbook);
    this.#profile = checked.profile;
    this.#data = checked.data;
    this.#replaceWorkbook(checked.workbook);
    try {
      this.#assertSnapshotCoherence(checked);
    } catch (error) {
      this.#profile = before.profile;
      this.#data = before.data;
      this.#replaceWorkbook(before.workbook);
      throw error;
    }
    await this.#setupDataFrameTable();
    this.#syncTableColumnLabels(this.#data.columns);
    this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
    const change = createBatch(
      'load',
      diffData(before.data, checked.data),
      diffColumnLabels(before.data, checked.data),
    );
    this.#storeRollback(change.id, before);
    if (change.edits.length > 0 || change.columnRenames.length > 0) this.#emit(change);
  }

  getSelection(): SpreadsheetSelection | null {
    const range = this.#sheet().getSelection()?.getActiveRange();
    if (range === null || range === undefined) return null;
    return this.#rangeToSelection(range);
  }

  #rangeToSelection(range: GridRange): SpreadsheetSelection | null {
    const startRow = Math.max(0, range.getRow() - 1);
    const endRow = Math.max(0, range.getLastRow() - 1);
    const visualRowIds = this.#visualRowIds();
    const startRowId = visualRowIds[startRow];
    const endRowId = visualRowIds[endRow];
    const startColumn = this.#data.columns[range.getColumn()];
    const endColumn = this.#data.columns[range.getLastColumn()];
    if (
      startRowId === undefined ||
      endRowId === undefined ||
      startColumn === undefined ||
      endColumn === undefined
    ) {
      return null;
    }
    return Object.freeze({
      start: Object.freeze({ rowId: startRowId, columnId: startColumn.id }),
      end: Object.freeze({ rowId: endRowId, columnId: endColumn.id }),
    });
  }

  #visualRowIds(): string[] {
    if (this.#data.rows.length === 0) return [];
    return this.#sheet()
      .getRange(1, this.#data.columns.length, this.#data.rows.length, 1)
      .getValues()
      .map((row) => row[0])
      .filter((value): value is string => typeof value === 'string');
  }

  async setSelection(selection: SpreadsheetSelection | null): Promise<void> {
    this.#assertNoPendingCommit();
    if (selection === null) {
      const cleared = await this.#api.executeCommand('sheet.operation.set-selections', {
        unitId: this.#workbook?.getId(),
        subUnitId: this.#sheet().getSheetId(),
        selections: [],
      });
      if (!cleared) throw new Error('Spreadsheet selection could not be cleared.');
      return;
    }
    const visualRowIds = this.#visualRowIds();
    const startRow = visualRowIds.indexOf(selection.start.rowId);
    const endRow = visualRowIds.indexOf(selection.end.rowId);
    const startColumn = this.#data.columns.findIndex(
      (column) => column.id === selection.start.columnId,
    );
    const endColumn = this.#data.columns.findIndex(
      (column) => column.id === selection.end.columnId,
    );
    if ([startRow, endRow, startColumn, endColumn].some((index) => index < 0)) {
      throw new RangeError('Selection contains an unknown row or column id.');
    }
    this.#sheet()
      .getRange(
        Math.min(startRow, endRow) + 1,
        Math.min(startColumn, endColumn),
        Math.abs(endRow - startRow) + 1,
        Math.abs(endColumn - startColumn) + 1,
      )
      .activate();
  }

  applyPatch(patch: readonly SpreadsheetCellPatch[]): SpreadsheetBatchChange {
    this.#assertNoPendingCommit();
    if (!Array.isArray(patch) || patch.length === 0)
      throw new TypeError('patch must not be empty.');
    const before = this.#data;
    const seen = new Set<string>();
    const candidateRows = before.rows.map((row) => ({ id: row.id, values: { ...row.values } }));
    for (const item of patch as readonly unknown[]) {
      if (typeof item !== 'object' || item === null)
        throw new TypeError('Patch items must be objects.');
      const candidate = item as SpreadsheetCellPatch;
      const key = `${candidate.rowId}\u0000${candidate.columnId}`;
      if (seen.has(key)) throw new TypeError('Patch contains a duplicate cell address.');
      seen.add(key);
      const row = candidateRows.find((entry) => entry.id === candidate.rowId);
      if (row === undefined || !before.columns.some((column) => column.id === candidate.columnId)) {
        throw new RangeError('Patch contains an unknown row or column id.');
      }
      row.values[candidate.columnId] = candidate.value;
    }
    const checkedNext = cloneAndValidateDataFrame(
      { columns: before.columns, rows: candidateRows },
      this.#limits,
    );
    const edits: SpreadsheetBatchEdit[] = patch.map((item) => {
      const row = before.rows.find((candidate) => candidate.id === item.rowId);
      const nextRow = checkedNext.rows.find((candidate) => candidate.id === item.rowId);
      if (row === undefined || nextRow === undefined)
        throw new RangeError('Patch row is unavailable.');
      return Object.freeze({
        rowId: item.rowId,
        columnId: item.columnId,
        before: row.values[item.columnId] ?? null,
        after: nextRow.values[item.columnId] ?? null,
      });
    });
    const effective = edits.filter((edit) => !contentEqual(edit.before, edit.after));
    this.#writeEdits(effective);
    this.#data = this.#readData();
    const change = createBatch('patch', effective);
    this.#storeRollback(change.id, this.#snapshot(before, this.#acceptedWorkbook));
    this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
    if (effective.length > 0) this.#emit(change);
    return change;
  }

  async renameColumn(columnId: string, label: string): Promise<SpreadsheetBatchChange> {
    this.#assertNoPendingCommit();
    if (this.#profile !== 'data-frame') {
      throw new TypeError('renameColumn is available only for the data-frame profile.');
    }
    if (typeof columnId !== 'string' || columnId.length === 0) {
      throw new TypeError('columnId must be a non-empty string.');
    }
    if (typeof label !== 'string') throw new TypeError('label must be a string.');
    const before = this.#data;
    if (!before.columns.some((column) => column.id === columnId)) {
      throw new RangeError('renameColumn targets an unknown column id.');
    }
    const next = cloneAndValidateDataFrame(
      {
        columns: before.columns.map((column) =>
          column.id === columnId ? { ...column, label } : column,
        ),
        rows: before.rows,
      },
      this.#limits,
    );
    const columnRenames = diffColumnLabels(before, next);
    const change = createBatch('rename-column', [], columnRenames);
    if (columnRenames.length === 0) return change;
    try {
      await this.#writeColumnLabels(next.columns);
      this.#assertProtectedFrame(next.columns);
    } catch (error) {
      this.#replaceWorkbook(this.#acceptedWorkbook);
      throw error;
    }
    this.#storeRollback(change.id, this.#snapshot(before, this.#acceptedWorkbook));
    this.#data = next;
    this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
    this.#emit(change);
    return change;
  }

  async replaceData(value: SpreadsheetDataFrame): Promise<SpreadsheetBatchChange> {
    this.#assertNoPendingCommit();
    const data = cloneAndValidateDataFrame(value, this.#limits);
    const before = this.#snapshot(this.#data, this.#acceptedWorkbook);
    this.#data = data;
    this.#replaceWorkbook(dataToGridSnapshot(data, this.#locale));
    await this.#setupDataFrameTable();
    this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
    const change = createBatch(
      'replace',
      diffData(before.data, data),
      diffColumnLabels(before.data, data),
    );
    this.#storeRollback(change.id, before);
    if (change.edits.length > 0 || change.columnRenames.length > 0) this.#emit(change);
    return change;
  }

  async undo(): Promise<boolean> {
    this.#assertNoPendingCommit();
    this.#pendingSource = 'undo';
    return this.#api.undo();
  }

  async redo(): Promise<boolean> {
    this.#assertNoPendingCommit();
    this.#pendingSource = 'redo';
    return this.#api.redo();
  }

  rollback(change: SpreadsheetBatchChange): SpreadsheetBatchChange {
    const state = this.#rollbackStates.get(change.id);
    if (state === undefined) throw new Error('Rollback state is no longer available.');
    const current = this.#data;
    this.#profile = state.profile;
    this.#data = state.data;
    this.#replaceWorkbook(state.workbook);
    if (this.#workbook !== null) {
      this.#kernel.__getInjector().get(GridUndoHistoryToken).clearUndoRedo(this.#workbook.getId());
    }
    this.#acceptedWorkbook = structuredClone(this.#workbook?.save());
    this.#rollbackStates.delete(change.id);
    this.#rollbackBytes.delete(change.id);
    if (this.#pendingCommitId === change.id) this.#pendingCommitId = undefined;
    const rollback = createBatch(
      'rollback',
      diffData(current, state.data),
      diffColumnLabels(current, state.data),
    );
    return rollback;
  }

  destroy(): void {
    if (this.#eventTimer !== undefined) window.clearTimeout(this.#eventTimer);
    this.#changeListener?.dispose();
    this.#editChangeListener?.dispose();
    this.#editGuard?.dispose();
    this.#commandGuard?.dispose();
    this.#commandListener?.dispose();
    window.removeEventListener('keydown', this.#keyGuard, true);
    this.#kernel.dispose();
    this.#rollbackStates.clear();
    this.#rollbackBytes.clear();
    this.#menuIds.clear();
  }

  #assertNoPendingCommit(): void {
    if (this.#pendingCommitId !== undefined) {
      throw new Error('A spreadsheet commit is still pending.');
    }
  }

  #assertSnapshotCoherence(snapshot: SpreadsheetSnapshot): void {
    this.#assertProtectedFrame();
    const current = this.#readData();
    if (
      diffData(snapshot.data, current).length > 0 ||
      diffColumnLabels(snapshot.data, current).length > 0
    ) {
      throw new Error('Spreadsheet snapshot data does not match its workbook state.');
    }
  }
}

let runtime: SpreadsheetRuntime | undefined;

async function invoke(instanceId: string, request: SpreadsheetRuntimeRequest): Promise<unknown> {
  if (request.method === 'init') {
    if (runtime !== undefined) throw new Error('Spreadsheet runtime is already initialized.');
    runtime = new SpreadsheetRuntime(instanceId, request.value);
    await runtime.ready();
    return undefined;
  }
  if (runtime === undefined) throw new Error('Spreadsheet runtime has not been initialized.');
  switch (request.method) {
    case 'save':
      return runtime.save();
    case 'load':
      return runtime.load(request.value);
    case 'getSelection':
      return runtime.getSelection();
    case 'setSelection':
      return runtime.setSelection(request.value);
    case 'applyPatch':
      return runtime.applyPatch(request.value);
    case 'renameColumn':
      return runtime.renameColumn(request.value.columnId, request.value.label);
    case 'replaceData':
      return runtime.replaceData(request.value);
    case 'undo':
      return runtime.undo();
    case 'redo':
      return runtime.redo();
    case 'addTopLevelMenu':
      return runtime.addTopLevelMenu(request.value);
    case 'rollback':
      return runtime.rollback(request.value);
    case 'ack':
      return runtime.acknowledge(request.value);
    case 'destroy':
      runtime.destroy();
      runtime = undefined;
      return undefined;
  }
}

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (hostOrigin === undefined || event.source !== window.parent || event.origin !== hostOrigin)
    return;
  if (!isSpreadsheetMessage(event.data)) return;
  const message = event.data as SpreadsheetRequestMessage;
  void invoke(message.instanceId, message.request).then(
    (value) => {
      const response: SpreadsheetResponseMessage = {
        protocol: spreadsheetProtocol,
        instanceId: message.instanceId,
        requestId: message.requestId,
        ok: true,
        value,
      };
      window.parent.postMessage(response, hostOrigin);
    },
    (error: unknown) => {
      const response: SpreadsheetResponseMessage = {
        protocol: spreadsheetProtocol,
        instanceId: message.instanceId,
        requestId: message.requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      window.parent.postMessage(response, hostOrigin);
    },
  );
});
