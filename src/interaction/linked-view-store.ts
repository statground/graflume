import { GraflumeError } from '../core/errors.js';
import {
  emptyAnalyticSelectionState,
  normalizeAnalyticSelectionState,
  type AnalyticSelectionState,
} from './analytic-selection.js';
import {
  emptyDomainViewState,
  normalizeDomainViewState,
  type DomainViewState,
} from './domain-navigation.js';

export const linkedViewStateVersion = 1 as const;
export const maximumLinkedAnalyticViews = 128;

export interface LinkedViewState {
  readonly version: typeof linkedViewStateVersion;
  readonly analyticSelection: AnalyticSelectionState;
  readonly domainView: DomainViewState;
}

export interface LinkedViewStateChange {
  readonly state: LinkedViewState;
  readonly sourceViewId: string;
  readonly changed: 'analytic-selection' | 'domain-view' | 'both';
}

export type LinkedViewStateListener = (change: LinkedViewStateChange) => void;

function invalid(message: string): never {
  throw new GraflumeError('INVALID_SPEC', message, { path: '$.linkedViewStore' });
}

function viewId(value: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 4096 ||
    value === '__proto__' ||
    value === 'prototype' ||
    value === 'constructor'
  ) {
    invalid('Linked analytic view IDs must be safe non-empty bounded strings.');
  }
  return value;
}

export function normalizeLinkedViewState(input: LinkedViewState): LinkedViewState {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    invalid('Linked view state must be an object.');
  }
  const unknown = Object.keys(input).filter(
    (key) => key !== 'version' && key !== 'analyticSelection' && key !== 'domainView',
  );
  if (unknown.length > 0) invalid(`Linked view state contains unknown key "${unknown[0]}".`);
  if (input.version !== linkedViewStateVersion) {
    invalid(`Linked view state.version must be ${linkedViewStateVersion}.`);
  }
  return Object.freeze({
    version: linkedViewStateVersion,
    analyticSelection: normalizeAnalyticSelectionState(input.analyticSelection),
    domainView: normalizeDomainViewState(input.domainView),
  });
}

export function emptyLinkedViewState(): LinkedViewState {
  return normalizeLinkedViewState({
    version: linkedViewStateVersion,
    analyticSelection: emptyAnalyticSelectionState(),
    domainView: emptyDomainViewState(),
  });
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Runtime-only bounded state bus for independently created Canvas views. A
 * composed chart already shares one internal state; injecting this store adds
 * the same deterministic selection/domain link across Chart instances.
 */
export class LinkedViewStateStore {
  #state: LinkedViewState;
  readonly #listeners = new Map<string, LinkedViewStateListener>();

  constructor(initial: LinkedViewState = emptyLinkedViewState()) {
    this.#state = normalizeLinkedViewState(initial);
  }

  get(): LinkedViewState {
    return this.#state;
  }

  register(view: string, listener: LinkedViewStateListener): () => void {
    const id = viewId(view);
    if (typeof listener !== 'function') invalid('Linked view listener must be a function.');
    if (!this.#listeners.has(id) && this.#listeners.size >= maximumLinkedAnalyticViews) {
      invalid(`Linked view store exceeds the ${maximumLinkedAnalyticViews} view bound.`);
    }
    this.#listeners.set(id, listener);
    return () => {
      if (this.#listeners.get(id) === listener) this.#listeners.delete(id);
    };
  }

  set(
    state: LinkedViewState,
    sourceViewId: string,
    changed: LinkedViewStateChange['changed'] = 'both',
  ): LinkedViewState {
    const source = viewId(sourceViewId);
    const next = normalizeLinkedViewState(state);
    if (same(next, this.#state)) return this.#state;
    this.#state = next;
    const change = Object.freeze({ state: next, sourceViewId: source, changed });
    for (const [id, listener] of [...this.#listeners]) {
      if (id !== source) listener(change);
    }
    return next;
  }

  setAnalyticSelection(
    analyticSelection: AnalyticSelectionState,
    sourceViewId: string,
  ): LinkedViewState {
    return this.set({ ...this.#state, analyticSelection }, sourceViewId, 'analytic-selection');
  }

  setDomainView(domainView: DomainViewState, sourceViewId: string): LinkedViewState {
    return this.set({ ...this.#state, domainView }, sourceViewId, 'domain-view');
  }
}
