import { GraflumeError } from '../core/errors.js';
import type { SemanticMark } from '../scene/semantic.js';

export interface VirtualDataExplorerSpec {
  /** Number of data rows in the logical viewport. Defaults to 24. */
  readonly windowRows?: number;
  /** Rows rendered before and after the viewport. Defaults to 6. */
  readonly overscanRows?: number;
  /** Deterministic row-height estimate used for scroll windows. Defaults to 32. */
  readonly rowHeight?: number;
}

export interface NormalizedVirtualDataExplorerSpec {
  readonly windowRows: number;
  readonly overscanRows: number;
  readonly rowHeight: number;
}

export interface VirtualDataWindow {
  readonly version: 1;
  readonly totalRows: number;
  readonly viewportStart: number;
  readonly viewportEnd: number;
  readonly start: number;
  readonly end: number;
  readonly beforeRows: number;
  readonly afterRows: number;
  readonly beforePixels: number;
  readonly afterPixels: number;
  readonly activeIndex: number | null;
  readonly rows: readonly SemanticMark[];
}

export type ExplorerNavigationKey =
  'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End' | 'PageUp' | 'PageDown';

function boundedInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
  path: string,
): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > maximum) {
    throw new GraflumeError('INVALID_SPEC', `${path} must be an integer from 1 to ${maximum}.`, {
      path,
    });
  }
  return resolved;
}

export function normalizeVirtualDataExplorerSpec(
  spec: VirtualDataExplorerSpec = {},
): NormalizedVirtualDataExplorerSpec {
  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new GraflumeError('INVALID_SPEC', 'Accessibility explorer must be an object.', {
      path: '$.accessibility.explorer',
    });
  }
  const unknown = Object.keys(spec).find(
    (key) => !['windowRows', 'overscanRows', 'rowHeight'].includes(key),
  );
  if (unknown !== undefined) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `Unknown accessibility explorer property "${unknown}".`,
      { path: `$.accessibility.explorer.${unknown}` },
    );
  }
  const overscanRows = spec.overscanRows ?? 6;
  if (!Number.isInteger(overscanRows) || overscanRows < 0 || overscanRows > 100) {
    throw new GraflumeError(
      'INVALID_SPEC',
      '$.accessibility.explorer.overscanRows must be an integer from 0 to 100.',
      { path: '$.accessibility.explorer.overscanRows' },
    );
  }
  return {
    windowRows: boundedInteger(spec.windowRows, 24, 5_000, '$.accessibility.explorer.windowRows'),
    overscanRows,
    rowHeight: boundedInteger(spec.rowHeight, 32, 256, '$.accessibility.explorer.rowHeight'),
  };
}

/** Pure window model; DOM scroll and focus are injected by the caller. */
export class VirtualDataExplorer {
  readonly #spec: NormalizedVirtualDataExplorerSpec;
  #rows: readonly SemanticMark[] = [];
  #viewportStart = 0;
  #activeIndex: number | null = null;

  constructor(spec: VirtualDataExplorerSpec = {}) {
    this.#spec = normalizeVirtualDataExplorerSpec(spec);
  }

  setRows(rows: readonly SemanticMark[], preferredId?: string | null): VirtualDataWindow {
    if (rows.length > 100_000) {
      throw new GraflumeError(
        'INVALID_DATA',
        'The virtual data explorer accepts at most 100,000 bounded semantic rows.',
      );
    }
    this.#rows = rows;
    const preferred =
      preferredId === undefined || preferredId === null
        ? -1
        : rows.findIndex(({ id }) => id === preferredId);
    const previous = this.#activeIndex ?? -1;
    this.#activeIndex =
      preferred >= 0
        ? preferred
        : rows.length === 0
          ? null
          : Math.min(Math.max(0, previous), rows.length - 1);
    this.#viewportStart = this.#boundedViewportStart(this.#viewportStart);
    if (this.#activeIndex !== null) this.#ensureVisible(this.#activeIndex);
    return this.window();
  }

  setScrollOffset(offsetPixels: number): VirtualDataWindow {
    if (!Number.isFinite(offsetPixels) || offsetPixels < 0) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Explorer scroll offset must be finite and non-negative.',
      );
    }
    this.#viewportStart = this.#boundedViewportStart(
      Math.floor(offsetPixels / this.#spec.rowHeight),
    );
    if (
      this.#rows.length > 0 &&
      (this.#activeIndex === null ||
        this.#activeIndex < this.#viewportStart ||
        this.#activeIndex >= this.#viewportStart + this.#spec.windowRows)
    ) {
      this.#activeIndex = this.#viewportStart;
    }
    return this.window();
  }

  focusIndex(index: number): VirtualDataWindow {
    if (!Number.isInteger(index) || index < 0 || index >= this.#rows.length) {
      throw new GraflumeError('INVALID_DATA', 'Explorer focus index is outside semantic rows.');
    }
    this.#activeIndex = index;
    this.#ensureVisible(index);
    return this.window();
  }

  focusId(id: string): VirtualDataWindow {
    const index = this.#rows.findIndex((row) => row.id === id);
    if (index < 0) throw new GraflumeError('INVALID_DATA', `Semantic row "${id}" was not found.`);
    return this.focusIndex(index);
  }

  move(key: ExplorerNavigationKey): VirtualDataWindow {
    if (this.#rows.length === 0) return this.window();
    const current = this.#activeIndex ?? 0;
    let next = current;
    switch (key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        next = Math.max(0, current - 1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        next = Math.min(this.#rows.length - 1, current + 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = this.#rows.length - 1;
        break;
      case 'PageUp':
        next = Math.max(0, current - this.#spec.windowRows);
        break;
      case 'PageDown':
        next = Math.min(this.#rows.length - 1, current + this.#spec.windowRows);
        break;
    }
    return this.focusIndex(next);
  }

  active(): SemanticMark | null {
    return this.#activeIndex === null ? null : (this.#rows[this.#activeIndex] ?? null);
  }

  window(): VirtualDataWindow {
    const viewportEnd = Math.min(this.#rows.length, this.#viewportStart + this.#spec.windowRows);
    const start = Math.max(0, this.#viewportStart - this.#spec.overscanRows);
    const end = Math.min(this.#rows.length, viewportEnd + this.#spec.overscanRows);
    return {
      version: 1,
      totalRows: this.#rows.length,
      viewportStart: this.#viewportStart,
      viewportEnd,
      start,
      end,
      beforeRows: start,
      afterRows: this.#rows.length - end,
      beforePixels: start * this.#spec.rowHeight,
      afterPixels: (this.#rows.length - end) * this.#spec.rowHeight,
      activeIndex: this.#activeIndex,
      rows: this.#rows.slice(start, end),
    };
  }

  #boundedViewportStart(start: number): number {
    return Math.max(0, Math.min(start, Math.max(0, this.#rows.length - this.#spec.windowRows)));
  }

  #ensureVisible(index: number): void {
    if (index < this.#viewportStart) this.#viewportStart = index;
    else if (index >= this.#viewportStart + this.#spec.windowRows) {
      this.#viewportStart = index - this.#spec.windowRows + 1;
    }
    this.#viewportStart = this.#boundedViewportStart(this.#viewportStart);
  }
}

export function createVirtualDataExplorer(spec: VirtualDataExplorerSpec = {}): VirtualDataExplorer {
  return new VirtualDataExplorer(spec);
}
