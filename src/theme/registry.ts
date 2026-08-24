import { GraflumeError } from '../core/errors.js';
import type { ChartSpec } from '../spec/types.js';
import { deepMerge, type DeepPartial } from '../utils/object.js';
import { graflumeDark, graflumeGgplot, graflumeLight } from './defaults.js';
import type { ThemeTokens } from './types.js';

export class ThemeRegistry {
  readonly #themes = new Map<string, ThemeTokens>();

  constructor() {
    this.register(graflumeLight);
    this.register(graflumeDark);
    this.register(graflumeGgplot);
  }

  register(theme: ThemeTokens): void {
    if (theme.name.trim() === '') {
      throw new GraflumeError('INVALID_SPEC', 'Theme name must not be empty.', {
        path: '$.theme.name',
      });
    }
    this.#themes.set(theme.name, theme);
  }

  has(name: string): boolean {
    return this.#themes.has(name);
  }

  get(name: string): ThemeTokens {
    const theme = this.#themes.get(name);
    if (theme === undefined) {
      throw new GraflumeError('INVALID_SPEC', `Unknown theme "${name}".`, {
        path: '$.theme',
        details: { availableThemes: this.names() },
      });
    }
    return theme;
  }

  names(): readonly string[] {
    return [...this.#themes.keys()].sort();
  }

  resolve(input: NonNullable<ChartSpec['theme']>): ThemeTokens {
    if (typeof input === 'string') return this.get(input);

    const baseName = input.extends ?? 'graflume-light';
    const { extends: _extends, ...overrides } = input;
    const merged = deepMerge(this.get(baseName), overrides as DeepPartial<ThemeTokens>);
    return {
      ...merged,
      name: merged.name || `custom:${baseName}`,
    };
  }
}
