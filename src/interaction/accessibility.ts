import type { InspectionViewTransform } from '../renderer/types.js';
import type { SemanticMark } from '../scene/semantic.js';
import type { NormalizedAccessibilitySpec } from '../spec/types.js';

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

function valueText(value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
  return value instanceof Date ? value.toISOString() : String(value);
}

export class AccessibilityMirrorController {
  #host: HTMLElement | null = null;
  #surface: HTMLElement | null = null;
  #mirror: HTMLDivElement | null = null;
  #ring: HTMLDivElement | null = null;
  #focusedId: string | null = null;

  getFocusedId(): string | null {
    return this.#focusedId;
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
  ): void {
    if (spec.table === false && !spec.navigation) {
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
    const fields = rowFields(index);
    for (const label of ['Layer', ...fields]) {
      const cell = ownerDocument.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      cell.style.textAlign = 'start';
      cell.style.padding = spec.table === 'visible' ? '6px 8px' : '0';
      headRow.append(cell);
    }
    head.append(headRow);
    table.append(head);
    const body = ownerDocument.createElement('tbody');
    const navigable: HTMLTableRowElement[] = [];
    const navigableMarks: SemanticMark[] = [];
    index.forEach((mark) => {
      const row = ownerDocument.createElement('tr');
      row.dataset.graflumeSemanticId = mark.id;
      row.setAttribute('aria-label', mark.label);
      row.setAttribute('aria-selected', String(selected(mark, selectedKeys)));
      row.setAttribute('aria-disabled', String(!mark.visible));
      row.tabIndex = -1;
      const layerCell = ownerDocument.createElement('th');
      layerCell.scope = 'row';
      layerCell.textContent = mark.layerId;
      layerCell.style.textAlign = 'start';
      layerCell.style.padding = spec.table === 'visible' ? '6px 8px' : '0';
      row.append(layerCell);
      for (const field of fields) {
        const cell = ownerDocument.createElement('td');
        cell.textContent = valueText(mark.datum[field]);
        cell.style.padding = spec.table === 'visible' ? '6px 8px' : '0';
        row.append(cell);
      }
      if (mark.visible) {
        navigable.push(row);
        navigableMarks.push(mark);
      }
      row.addEventListener('focus', () => {
        this.#focusedId = mark.id;
        for (const candidate of navigable) candidate.tabIndex = candidate === row ? 0 : -1;
        this.#positionRing(mark, view);
        actions.focus(mark);
      });
      row.addEventListener('blur', () => {
        const activeId = (ownerDocument.activeElement as HTMLElement | null)?.dataset
          ?.graflumeSemanticId;
        if (activeId === undefined) {
          if (this.#ring !== null) this.#ring.hidden = true;
          actions.focus(null);
        }
      });
      row.addEventListener('keydown', (event) => {
        if (!('key' in event)) return;
        const current = navigable.indexOf(row);
        let next = current;
        switch (event.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            next = Math.max(0, current - 1);
            break;
          case 'ArrowRight':
          case 'ArrowDown':
            next = Math.min(navigable.length - 1, current + 1);
            break;
          case 'Home':
            next = 0;
            break;
          case 'End':
            next = navigable.length - 1;
            break;
          case 'PageUp':
            next = Math.max(0, current - 10);
            break;
          case 'PageDown':
            next = Math.min(navigable.length - 1, current + 10);
            break;
          case 'Enter':
          case ' ':
            actions.toggle(mark);
            event.preventDefault();
            return;
          case 'Escape':
            actions.clear();
            surface.focus();
            if (this.#ring !== null) this.#ring.hidden = true;
            actions.focus(null);
            event.preventDefault();
            return;
          default:
            return;
        }
        const target = navigable[next];
        const targetMark = navigableMarks[next];
        if (target !== undefined && targetMark !== undefined) {
          row.tabIndex = -1;
          target.tabIndex = 0;
          target.focus();
          this.#positionRing(targetMark, view);
        }
        event.preventDefault();
      });
      body.append(row);
    });
    table.append(body);
    mirror.replaceChildren(summary, table);
    const first = navigable[0];
    const restored = navigable.find(({ dataset }) => dataset.graflumeSemanticId === focusedId);
    if (restored !== undefined) {
      restored.tabIndex = 0;
      restored.focus();
    } else if (first !== undefined) first.tabIndex = 0;
  }

  destroy(): void {
    this.#mirror?.remove();
    this.#ring?.remove();
    this.#mirror = null;
    this.#ring = null;
    this.#host = null;
    this.#surface = null;
    this.#focusedId = null;
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
