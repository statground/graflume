import type { InspectionViewTransform } from '../renderer/types.js';
import type { SemanticMark, SemanticTableCell } from '../scene/semantic.js';
import type { DataValue, NormalizedAccessibilitySpec } from '../spec/types.js';
import { formatTemporalValue, inferTemporalDisplayFormat } from '../format/temporal.js';
import { VirtualDataExplorer, type ExplorerNavigationKey } from './virtual-data-explorer.js';

export interface AccessibilityMirrorActions {
  toggle(mark: SemanticMark): void;
  clear(): void;
  focus(mark: SemanticMark | null): void;
}

function visuallyHidden(element: HTMLElement): void {
  element.style.position = 'absolute';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.padding = '0';
  element.style.margin = '-1px';
  element.style.overflow = 'hidden';
  element.style.clipPath = 'inset(50%)';
  element.style.whiteSpace = 'nowrap';
  element.style.border = '0';
}

function selected(mark: SemanticMark, selectedKeys: ReadonlySet<string>): boolean {
  return selectedKeys.has(mark.id);
}

function rowFields(index: readonly SemanticMark[]): readonly string[] {
  const fields: string[] = [];
  for (const mark of index) {
    for (const field of Object.keys(mark.datum)) {
      if (!fields.includes(field)) fields.push(field);
      if (fields.length >= 12) return fields;
    }
  }
  return fields;
}

function nativeTableRows(index: readonly SemanticMark[]): readonly SemanticMark[] | null {
  const visible = index.filter(({ visible: markVisible }) => markVisible);
  if (visible.length === 0 || visible.some(({ tableRow }) => tableRow === undefined)) return null;
  if (new Set(visible.map(({ layerId }) => layerId)).size !== 1) return null;
  return [...visible].sort((left, right) => left.tableRow!.row - right.tableRow!.row);
}

interface WindowedTableCell {
  readonly cell: SemanticTableCell;
  readonly rowSpan: number;
}

function lowerBound(values: readonly number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (values[middle]! < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function windowedTableCellMap(
  allRows: readonly SemanticMark[],
  renderedRows: readonly SemanticMark[],
): ReadonlyMap<number, readonly WindowedTableCell[]> {
  const renderedTableRows = renderedRows.flatMap((row) =>
    row.tableRow === undefined ? [] : [row.tableRow.row],
  );
  const anchors = allRows.flatMap((row) => row.tableRow?.cells ?? []);
  const cellsByRow = new Map<number, WindowedTableCell[]>();
  for (const cell of anchors) {
    const start = lowerBound(renderedTableRows, cell.row);
    const end = lowerBound(renderedTableRows, cell.row + cell.rowSpan);
    if (start >= end) continue;
    const row = renderedTableRows[start]!;
    const cells = cellsByRow.get(row) ?? [];
    cells.push({ cell, rowSpan: end - start });
    cellsByRow.set(row, cells);
  }
  for (const cells of cellsByRow.values()) {
    cells.sort((left, right) => left.cell.column - right.cell.column);
  }
  return cellsByRow;
}

function valueText(mark: SemanticMark, field: string, value: DataValue, locale?: string): string {
  if (value === null || value === undefined) return '\u2014';
  const tableFormatted = mark.tableRow?.formattedValues[field];
  if (tableFormatted !== undefined) return tableFormatted;
  const semanticChannel = Object.values(mark.channels).find((channel) => channel?.field === field);
  const temporal = semanticChannel?.type === 'temporal';
  if (temporal && semanticChannel.displayValue !== undefined) return semanticChannel.displayValue;
  if (temporal || value instanceof Date) {
    const type = inferTemporalDisplayFormat(value) ?? 'datetime';
    const formatted = formatTemporalValue(
      value,
      { type, dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' },
      locale,
    );
    if (formatted !== null) return formatted;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}

export class AccessibilityMirrorController {
  #explorer: VirtualDataExplorer | null = null;
  #explorerSignature = '';
  #host: HTMLElement | null = null;
  #surface: HTMLElement | null = null;
  #mirror: HTMLDivElement | null = null;
  #ring: HTMLDivElement | null = null;
  #focusedId: string | null = null;
  #focusById: ((id: string) => boolean) | null = null;
  #scrollHandler: (() => void) | null = null;

  getFocusedId(): string | null {
    return this.#focusedId;
  }

  focusSemanticId(id: string): boolean {
    return this.#focusById?.(id) ?? false;
  }

  sync(
    container: HTMLElement,
    overlayHost: HTMLElement,
    surface: HTMLElement,
    index: readonly SemanticMark[],
    spec: NormalizedAccessibilitySpec,
    view: InspectionViewTransform,
    selectedKeys: ReadonlySet<string>,
    actions: AccessibilityMirrorActions,
    locale?: string,
  ): void {
    if (spec.table === false && !spec.navigation && spec.linkedFocus === false) {
      this.destroy();
      return;
    }
    const host = spec.table === 'visible' ? container : overlayHost;
    const ownerDocument = host.ownerDocument;
    const focusedId =
      (ownerDocument.activeElement as HTMLElement | null)?.dataset?.graflumeSemanticId ??
      this.#focusedId;
    if (this.#host !== host || this.#surface !== surface) {
      this.destroy();
      this.#host = host;
      this.#surface = surface;
      const mirror = ownerDocument.createElement('div');
      mirror.dataset.graflumeAccessibilityMirror = spec.table === 'visible' ? 'visible' : 'hidden';
      mirror.setAttribute('dir', 'auto');
      host.append(mirror);
      this.#mirror = mirror;
      const ring = overlayHost.ownerDocument.createElement('div');
      ring.dataset.graflumeSemanticFocus = 'true';
      ring.setAttribute('aria-hidden', 'true');
      ring.style.position = 'absolute';
      ring.style.zIndex = '19';
      ring.style.pointerEvents = 'none';
      ring.style.border = '3px solid #2563eb';
      ring.style.borderRadius = '5px';
      ring.style.boxShadow = '0 0 0 2px rgba(255,255,255,.9)';
      ring.hidden = true;
      overlayHost.append(ring);
      this.#ring = ring;
    }
    const mirror = this.#mirror;
    if (mirror === null) return;
    if (this.#scrollHandler !== null) {
      mirror.removeEventListener('scroll', this.#scrollHandler);
      this.#scrollHandler = null;
    }
    mirror.dataset.graflumeAccessibilityMirror = spec.table === 'visible' ? 'visible' : 'hidden';
    mirror.removeAttribute('style');
    if (spec.table !== 'visible') visuallyHidden(mirror);
    else {
      mirror.style.boxSizing = 'border-box';
      mirror.style.width = '100%';
      mirror.style.maxHeight = 'min(360px,50vh)';
      mirror.style.overflow = 'auto';
      mirror.style.marginTop = '12px';
      mirror.style.font =
        '13px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      mirror.style.color = '#111827';
      mirror.style.background = '#fff';
    }

    const summary = ownerDocument.createElement('p');
    summary.dataset.graflumeAccessibilitySummary = 'true';
    summary.textContent = spec.summary ?? `${index.length} chart marks`;
    if (spec.table === 'visible') summary.style.margin = '0 0 8px';

    const table = ownerDocument.createElement('table');
    table.dataset.graflumeAccessibilityTable = 'true';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    const caption = ownerDocument.createElement('caption');
    caption.textContent = spec.summary ?? 'Chart data';
    visuallyHidden(caption);
    table.append(caption);
    const head = ownerDocument.createElement('thead');
    const headRow = ownerDocument.createElement('tr');
    const tableRows = nativeTableRows(index);
    const tableColumns = tableRows?.[0]?.tableRow?.columns ?? [];
    const fields = tableRows === null ? rowFields(index) : tableColumns.map(({ field }) => field);
    const columnLabels = tableRows === null ? fields : tableColumns.map(({ header }) => header);
    for (const label of ['Layer', ...columnLabels]) {
      const cell = ownerDocument.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      cell.setAttribute('dir', 'auto');
      cell.style.textAlign = 'start';
      cell.style.padding = spec.table === 'visible' ? '6px 8px' : '0';
      headRow.append(cell);
    }
    head.append(headRow);
    table.append(head);
    const body = ownerDocument.createElement('tbody');
    table.setAttribute('role', 'grid');
    const navigableMarks = tableRows ?? index.filter(({ visible }) => visible);
    const logicalTableRows = tableRows?.[0]?.tableRow?.totalRows ?? navigableMarks.length;
    table.setAttribute('aria-rowcount', String(logicalTableRows + 1));
    table.setAttribute('aria-colcount', String(fields.length + 1));
    const explorerSpec =
      spec.explorer === false
        ? { windowRows: Math.max(1, navigableMarks.length), overscanRows: 0, rowHeight: 32 }
        : spec.explorer;
    const explorerSignature = JSON.stringify(explorerSpec);
    if (this.#explorer === null || explorerSignature !== this.#explorerSignature) {
      this.#explorer = new VirtualDataExplorer(explorerSpec);
      this.#explorerSignature = explorerSignature;
    }
    const explorer = this.#explorer;
    let dataWindow = explorer.setRows(navigableMarks, focusedId);
    const navigationKeys = new Set<ExplorerNavigationKey>([
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]);
    let renderedRows: HTMLTableRowElement[] = [];
    const spacer = (pixels: number, position: 'before' | 'after'): HTMLTableRowElement => {
      const row = ownerDocument.createElement('tr');
      row.dataset.graflumeVirtualSpacer = position;
      row.setAttribute('aria-hidden', 'true');
      const cell = ownerDocument.createElement('td');
      cell.colSpan = fields.length + 1;
      cell.style.height = `${pixels}px`;
      cell.style.padding = '0';
      cell.style.border = '0';
      row.append(cell);
      return row;
    };
    const renderWindow = (focusActive: boolean): void => {
      const rows: HTMLTableRowElement[] = [];
      const tableCells =
        tableRows === null ? null : windowedTableCellMap(navigableMarks, dataWindow.rows);
      if (dataWindow.beforePixels > 0) rows.push(spacer(dataWindow.beforePixels, 'before'));
      dataWindow.rows.forEach((mark, windowIndex) => {
        const absoluteIndex = dataWindow.start + windowIndex;
        const row = ownerDocument.createElement('tr');
        row.dataset.graflumeSemanticId = mark.id;
        row.dataset.graflumeSemanticIndex = String(absoluteIndex);
        if (mark.tableRow !== undefined) {
          row.dataset.graflumeTableRow = String(mark.tableRow.row);
        }
        row.setAttribute('aria-rowindex', String((mark.tableRow?.row ?? absoluteIndex) + 2));
        row.setAttribute('aria-label', mark.label);
        row.setAttribute('aria-selected', String(selected(mark, selectedKeys)));
        row.tabIndex = spec.navigation && dataWindow.activeIndex === absoluteIndex ? 0 : -1;
        const layerCell = ownerDocument.createElement('th');
        layerCell.scope = 'row';
        layerCell.textContent = mark.layerId;
        layerCell.setAttribute('dir', 'auto');
        layerCell.style.textAlign = 'start';
        layerCell.style.padding = spec.table === 'visible' ? '6px 8px' : '0';
        row.append(layerCell);
        if (tableRows === null) {
          for (const field of fields) {
            const cell = ownerDocument.createElement('td');
            cell.textContent = valueText(mark, field, mark.datum[field], locale);
            cell.setAttribute('dir', 'auto');
            cell.style.padding = spec.table === 'visible' ? '6px 8px' : '0';
            row.append(cell);
          }
        } else {
          for (const { cell: tableCell, rowSpan } of tableCells?.get(mark.tableRow!.row) ?? []) {
            const cell = ownerDocument.createElement('td');
            cell.dataset.graflumeTableRow = String(tableCell.row);
            cell.dataset.graflumeTableColumn = String(tableCell.column);
            cell.dataset.graflumeTableField = tableCell.field;
            cell.textContent = tableCell.formatted;
            cell.rowSpan = rowSpan;
            cell.colSpan = tableCell.columnSpan;
            cell.setAttribute('dir', 'auto');
            const header = tableColumns.find(({ column }) => column === tableCell.column)?.header;
            if (header !== undefined)
              cell.setAttribute('aria-label', `${header}: ${tableCell.formatted}`);
            cell.style.padding = spec.table === 'visible' ? '6px 8px' : '0';
            row.append(cell);
          }
        }
        row.addEventListener('focus', () => {
          this.#focusedId = mark.id;
          dataWindow = explorer.focusIndex(absoluteIndex);
          for (const candidate of renderedRows) {
            candidate.tabIndex = spec.navigation && candidate === row ? 0 : -1;
          }
          this.#positionRing(mark, view);
          actions.focus(mark);
        });
        row.addEventListener('blur', () => {
          queueMicrotask(() => {
            const activeId = (ownerDocument.activeElement as HTMLElement | null)?.dataset
              ?.graflumeSemanticId;
            if (activeId === undefined) {
              if (this.#ring !== null) this.#ring.hidden = true;
              actions.focus(null);
            }
          });
        });
        row.addEventListener('keydown', (event) => {
          if (!spec.navigation) return;
          if (!('key' in event)) return;
          if (event.key === 'Enter' || event.key === ' ') {
            actions.toggle(mark);
            event.preventDefault();
            return;
          }
          if (event.key === 'Escape') {
            actions.clear();
            surface.focus();
            if (this.#ring !== null) this.#ring.hidden = true;
            actions.focus(null);
            event.preventDefault();
            return;
          }
          if (!navigationKeys.has(event.key as ExplorerNavigationKey)) return;
          dataWindow = explorer.move(event.key as ExplorerNavigationKey);
          renderWindow(true);
          event.preventDefault();
        });
        rows.push(row);
      });
      if (dataWindow.afterPixels > 0) rows.push(spacer(dataWindow.afterPixels, 'after'));
      body.replaceChildren(...rows);
      renderedRows = rows.filter(({ dataset }) => dataset.graflumeSemanticId !== undefined);
      if (focusActive && dataWindow.activeIndex !== null) {
        const target = renderedRows.find(
          ({ dataset }) => dataset.graflumeSemanticIndex === String(dataWindow.activeIndex),
        );
        target?.focus();
      }
    };
    table.append(body);
    mirror.replaceChildren(summary, table);
    mirror.dataset.graflumeVirtualRows = String(navigableMarks.length);
    renderWindow(false);
    this.#focusById = (id): boolean => {
      if (!navigableMarks.some((mark) => mark.id === id)) return false;
      dataWindow = explorer.focusId(id);
      renderWindow(true);
      return true;
    };
    if (focusedId !== null && focusedId !== undefined) {
      const restored = renderedRows.find(({ dataset }) => dataset.graflumeSemanticId === focusedId);
      restored?.focus();
    }
    if (spec.table === 'visible') {
      this.#scrollHandler = () => {
        dataWindow = explorer.setScrollOffset(mirror.scrollTop);
        renderWindow(false);
      };
      mirror.addEventListener('scroll', this.#scrollHandler);
    }
  }

  destroy(): void {
    if (this.#scrollHandler !== null) {
      this.#mirror?.removeEventListener('scroll', this.#scrollHandler);
      this.#scrollHandler = null;
    }
    this.#mirror?.remove();
    this.#ring?.remove();
    this.#mirror = null;
    this.#ring = null;
    this.#host = null;
    this.#surface = null;
    this.#focusedId = null;
    this.#focusById = null;
    this.#explorer = null;
    this.#explorerSignature = '';
  }

  #positionRing(mark: SemanticMark, view: InspectionViewTransform): void {
    const ring = this.#ring;
    if (ring === null) return;
    const left = mark.bounds.x * view.zoom + view.offsetX;
    const top = mark.bounds.y * view.zoom + view.offsetY;
    ring.style.left = `${left}px`;
    ring.style.top = `${top}px`;
    ring.style.width = `${Math.max(8, mark.bounds.width * view.zoom)}px`;
    ring.style.height = `${Math.max(8, mark.bounds.height * view.zoom)}px`;
    ring.hidden = !mark.visible;
  }
}
