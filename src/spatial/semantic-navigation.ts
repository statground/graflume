import { GraflumeError } from '../core/errors.js';
import type { SpatialPickTarget } from './types.js';

export interface SpatialScreenFocus {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly visible: boolean;
}

export interface SpatialSemanticFocus {
  readonly index: number;
  readonly pick: SpatialPickTarget;
  readonly screen: SpatialScreenFocus | null;
}

export interface SpatialSemanticNavigationState {
  readonly version: 1;
  readonly rowCount: number;
  readonly activeIndex: number | null;
  readonly activeNodeId: string | null;
  readonly projected: SpatialScreenFocus | null;
}

export interface SpatialSemanticNavigationOptions {
  readonly maxRows?: number;
  readonly pageRows?: number;
  readonly wrap?: boolean;
}

export type SpatialFocusProjector = (pick: SpatialPickTarget) => SpatialScreenFocus | null;

export interface SpatialSemanticNavigationActions {
  focus(focus: SpatialSemanticFocus | null): void;
  activate?(focus: SpatialSemanticFocus): void;
}

export type SpatialNavigationKey =
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

function checkedProjection(value: SpatialScreenFocus | null): SpatialScreenFocus | null {
  if (value === null) return null;
  if (![value.x, value.y, value.depth].every(Number.isFinite)) {
    throw new GraflumeError('INVALID_DATA', 'Spatial focus projection must be finite.');
  }
  return { ...value };
}

/**
 * Renderer-neutral roving traversal for GPU pick targets.
 *
 * Camera projection and DOM focus-ring updates are injected, keeping tests
 * deterministic and keeping the authored spatial specification function-free.
 */
export class SpatialSemanticNavigator {
  readonly #maxRows: number;
  readonly #pageRows: number;
  readonly #wrap: boolean;
  readonly #actions: SpatialSemanticNavigationActions;
  #targets: readonly SpatialPickTarget[] = [];
  #activeIndex: number | null = null;
  #projector: SpatialFocusProjector | null = null;
  #screen: SpatialScreenFocus | null = null;

  constructor(
    actions: SpatialSemanticNavigationActions,
    options: SpatialSemanticNavigationOptions = {},
  ) {
    this.#actions = actions;
    this.#maxRows = boundedInteger(options.maxRows, 1_000, 100_000, '$.spatial.navigation.maxRows');
    this.#pageRows = boundedInteger(options.pageRows, 10, 1_000, '$.spatial.navigation.pageRows');
    if (options.wrap !== undefined && typeof options.wrap !== 'boolean') {
      throw new GraflumeError('INVALID_SPEC', '$.spatial.navigation.wrap must be boolean.');
    }
    this.#wrap = options.wrap ?? false;
  }

  setTargets(
    targets: readonly SpatialPickTarget[],
    preferredNodeId?: string | null,
  ): SpatialSemanticNavigationState {
    if (targets.length > this.#maxRows) {
      throw new GraflumeError(
        'INVALID_DATA',
        `Spatial semantic navigation has ${targets.length} targets; the deterministic limit is ${this.#maxRows}.`,
      );
    }
    this.#targets = [...targets];
    const preferred =
      preferredNodeId === undefined || preferredNodeId === null
        ? -1
        : targets.findIndex(({ nodeId }) => nodeId === preferredNodeId);
    const previous = this.#activeIndex ?? -1;
    this.#activeIndex =
      preferred >= 0
        ? preferred
        : targets.length === 0
          ? null
          : Math.min(Math.max(0, previous), targets.length - 1);
    this.#synchronize(false);
    return this.state();
  }

  setProjector(projector: SpatialFocusProjector | null): SpatialSemanticNavigationState {
    this.#projector = projector;
    this.#synchronize(false);
    return this.state();
  }

  reproject(): SpatialSemanticNavigationState {
    this.#synchronize(true);
    return this.state();
  }

  focusIndex(index: number): SpatialSemanticNavigationState {
    if (!Number.isInteger(index) || index < 0 || index >= this.#targets.length) {
      throw new GraflumeError('INVALID_DATA', 'Spatial focus index is outside semantic targets.');
    }
    this.#activeIndex = index;
    this.#synchronize(true);
    return this.state();
  }

  focusNode(nodeId: string): SpatialSemanticNavigationState {
    const index = this.#targets.findIndex((target) => target.nodeId === nodeId);
    if (index < 0)
      throw new GraflumeError('INVALID_DATA', `Spatial target "${nodeId}" was not found.`);
    return this.focusIndex(index);
  }

  move(key: SpatialNavigationKey): SpatialSemanticNavigationState {
    const length = this.#targets.length;
    if (length === 0) return this.state();
    const current = this.#activeIndex ?? 0;
    let next = current;
    switch (key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        next = current + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = length - 1;
        break;
      case 'PageUp':
        next = current - this.#pageRows;
        break;
      case 'PageDown':
        next = current + this.#pageRows;
        break;
    }
    if (this.#wrap && (next < 0 || next >= length)) next = (next + length) % length;
    return this.focusIndex(Math.max(0, Math.min(length - 1, next)));
  }

  activate(): void {
    const focus = this.focus();
    if (focus !== null) this.#actions.activate?.(focus);
  }

  clear(): void {
    this.#activeIndex = null;
    this.#screen = null;
    this.#actions.focus(null);
  }

  focus(): SpatialSemanticFocus | null {
    const pick = this.#activeIndex === null ? undefined : this.#targets[this.#activeIndex];
    return pick === undefined
      ? null
      : {
          index: this.#activeIndex!,
          pick,
          screen: this.#screen === null ? null : { ...this.#screen },
        };
  }

  state(): SpatialSemanticNavigationState {
    const active = this.#activeIndex === null ? undefined : this.#targets[this.#activeIndex];
    return {
      version: 1,
      rowCount: this.#targets.length,
      activeIndex: active === undefined ? null : this.#activeIndex,
      activeNodeId: active?.nodeId ?? null,
      projected: this.#screen === null ? null : { ...this.#screen },
    };
  }

  #synchronize(announce: boolean): void {
    const focus = this.focus();
    if (focus === null) {
      this.#screen = null;
      if (announce) this.#actions.focus(null);
      return;
    }
    this.#screen = checkedProjection(this.#projector?.(focus.pick) ?? null);
    if (announce) this.#actions.focus({ ...focus, screen: this.#screen });
  }
}

export function createSpatialSemanticNavigator(
  actions: SpatialSemanticNavigationActions,
  options: SpatialSemanticNavigationOptions = {},
): SpatialSemanticNavigator {
  return new SpatialSemanticNavigator(actions, options);
}
