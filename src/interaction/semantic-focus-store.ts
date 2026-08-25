import { GraflumeError } from '../core/errors.js';
import type { SemanticMark } from '../scene/semantic.js';
import type { DataValue } from '../spec/types.js';
import { assertSafeKey, ownValue } from '../utils/object.js';

export interface LinkedFocusSpec {
  /** Shared, portable group identity used by independently-created charts. */
  readonly group: string;
  /** Scalar datum field used to match marks across views. */
  readonly key: string;
}

export interface SemanticFocusTarget {
  readonly group: string;
  readonly key: string;
  readonly sourceViewId: string;
  readonly semanticId: string;
}

export interface SemanticFocusMatch {
  readonly viewId: string;
  readonly semanticId: string;
  readonly layerId: string;
  readonly rowIndex: number;
}

export interface SemanticFocusState {
  readonly version: 1;
  readonly revision: number;
  readonly focused: SemanticFocusTarget | null;
  readonly matches: readonly SemanticFocusMatch[];
  readonly registeredViews: number;
}

export interface SemanticFocusChange {
  readonly state: SemanticFocusState;
  readonly reason: 'focus' | 'clear' | 'index';
}

export interface SemanticFocusStoreOptions {
  readonly maxViews?: number;
  readonly maxRowsPerView?: number;
  readonly maxListeners?: number;
}

interface RegisteredView {
  readonly viewId: string;
  readonly spec: LinkedFocusSpec;
  readonly marksByKey: ReadonlyMap<string, SemanticMark>;
}

const groupPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/;

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

function safeIdentity(value: string, path: string): string {
  if (!groupPattern.test(value)) {
    throw new GraflumeError(
      'INVALID_SPEC',
      `${path} must contain 1 to 96 portable identity characters.`,
      { path },
    );
  }
  return value;
}

function focusKey(value: DataValue, path: string): string {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return `date:${value.toISOString()}`;
  if (typeof value === 'string' && value !== '') return `string:${value}`;
  if (typeof value === 'number' && Number.isFinite(value)) return `number:${value}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  throw new GraflumeError(
    'INVALID_DATA',
    'Linked focus keys must be non-empty strings, finite numbers, booleans, or valid Dates.',
    { path },
  );
}

function cloneTarget(target: SemanticFocusTarget): SemanticFocusTarget {
  return { ...target };
}

/**
 * Bounded shared focus state for linked Canvas and GPU views.
 *
 * Specs and emitted state contain data only. Runtime listeners are registered
 * separately, so chart specifications remain JSON-serializable.
 */
export class SemanticFocusStore {
  readonly #maxViews: number;
  readonly #maxRowsPerView: number;
  readonly #maxListeners: number;
  readonly #views = new Map<string, RegisteredView>();
  readonly #listeners = new Set<(change: SemanticFocusChange) => void>();
  #focused: SemanticFocusTarget | null = null;
  #matches: readonly SemanticFocusMatch[] = [];
  #revision = 0;

  constructor(options: SemanticFocusStoreOptions = {}) {
    this.#maxViews = boundedInteger(options.maxViews, 64, 1_024, '$.focus.maxViews');
    this.#maxRowsPerView = boundedInteger(
      options.maxRowsPerView,
      5_000,
      100_000,
      '$.focus.maxRowsPerView',
    );
    this.#maxListeners = boundedInteger(options.maxListeners, 128, 4_096, '$.focus.maxListeners');
  }

  registerView(viewId: string, spec: LinkedFocusSpec, index: readonly SemanticMark[]): () => void {
    safeIdentity(viewId, '$.focus.viewId');
    safeIdentity(spec.group, '$.accessibility.linkedFocus.group');
    if (typeof spec.key !== 'string' || spec.key.trim() === '') {
      throw new GraflumeError(
        'INVALID_SPEC',
        '$.accessibility.linkedFocus.key must be a non-empty field.',
        { path: '$.accessibility.linkedFocus.key' },
      );
    }
    assertSafeKey(spec.key, '$.accessibility.linkedFocus.key');
    if (!this.#views.has(viewId) && this.#views.size >= this.#maxViews) {
      throw new GraflumeError('INVALID_DATA', 'Linked focus view limit reached.');
    }
    if (index.length > this.#maxRowsPerView) {
      throw new GraflumeError(
        'INVALID_DATA',
        `Linked focus index has ${index.length} rows; the deterministic limit is ${this.#maxRowsPerView}.`,
      );
    }
    const marksByKey = new Map<string, SemanticMark>();
    index.forEach((mark, rowIndex) => {
      const value = ownValue(mark.datum, spec.key) as DataValue;
      const key = focusKey(value, `$.semanticIndex[${rowIndex}].datum.${spec.key}`);
      // A single deterministic target per view prevents an ambiguous focus ring.
      if (!marksByKey.has(key) || (!marksByKey.get(key)!.visible && mark.visible)) {
        marksByKey.set(key, mark);
      }
    });
    this.#views.set(viewId, { viewId, spec: { ...spec }, marksByKey });
    this.#reconcile('index');
    return () => {
      if (!this.#views.delete(viewId)) return;
      this.#reconcile('index');
    };
  }

  focus(viewId: string, mark: SemanticMark): void {
    const view = this.#views.get(viewId);
    if (view === undefined) {
      throw new GraflumeError('INVALID_DATA', `Linked focus view "${viewId}" is not registered.`);
    }
    const key = focusKey(
      ownValue(mark.datum, view.spec.key) as DataValue,
      `$.semanticIndex.datum.${view.spec.key}`,
    );
    this.#focused = {
      group: view.spec.group,
      key,
      sourceViewId: viewId,
      semanticId: mark.id,
    };
    this.#reconcile('focus');
  }

  focusTarget(target: SemanticFocusTarget): void {
    safeIdentity(target.group, '$.focus.group');
    safeIdentity(target.sourceViewId, '$.focus.sourceViewId');
    if (target.key.length === 0 || target.key.length > 512) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Linked focus key is empty or exceeds 512 characters.',
      );
    }
    if (target.semanticId.length === 0 || target.semanticId.length > 512) {
      throw new GraflumeError(
        'INVALID_DATA',
        'Linked focus semantic identity is empty or exceeds 512 characters.',
      );
    }
    this.#focused = cloneTarget(target);
    this.#reconcile('focus');
  }

  clear(): void {
    if (this.#focused === null && this.#matches.length === 0) return;
    this.#focused = null;
    this.#matches = [];
    this.#revision += 1;
    this.#emit('clear');
  }

  state(): SemanticFocusState {
    return {
      version: 1,
      revision: this.#revision,
      focused: this.#focused === null ? null : cloneTarget(this.#focused),
      matches: this.#matches.map((match) => ({ ...match })),
      registeredViews: this.#views.size,
    };
  }

  subscribe(listener: (change: SemanticFocusChange) => void): () => void {
    if (this.#listeners.size >= this.#maxListeners) {
      throw new GraflumeError('INVALID_DATA', 'Linked focus listener limit reached.');
    }
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #reconcile(reason: SemanticFocusChange['reason']): void {
    const focused = this.#focused;
    this.#matches =
      focused === null
        ? []
        : [...this.#views.values()]
            .filter(({ spec }) => spec.group === focused.group)
            .flatMap(({ viewId, marksByKey }) => {
              const mark = marksByKey.get(focused.key);
              return mark === undefined
                ? []
                : [
                    {
                      viewId,
                      semanticId: mark.id,
                      layerId: mark.layerId,
                      rowIndex: mark.rowIndex,
                    },
                  ];
            })
            .sort((left, right) => left.viewId.localeCompare(right.viewId, 'en'));
    this.#revision += 1;
    this.#emit(reason);
  }

  #emit(reason: SemanticFocusChange['reason']): void {
    const change = { state: this.state(), reason } as const;
    for (const listener of [...this.#listeners]) listener(change);
  }
}

export function createSemanticFocusStore(
  options: SemanticFocusStoreOptions = {},
): SemanticFocusStore {
  return new SemanticFocusStore(options);
}

/** Shared-by-default store used when linkedFocus is authored without an injected store. */
export const defaultSemanticFocusStore = new SemanticFocusStore();
