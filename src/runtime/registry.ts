import type { MarkCompiler } from '../compiler/types.js';
import { GraflumeError } from '../core/errors.js';
import { pluginApiVersion, type GraflumePlugin, type PluginContext } from '../core/plugin.js';
import type { RendererFactory } from '../renderer/types.js';
import type { ChartSpec } from '../spec/types.js';
import { ThemeRegistry } from '../theme/registry.js';
import type { ThemeTokens } from '../theme/types.js';

export class RuntimeRegistry {
  readonly themes = new ThemeRegistry();
  readonly #marks = new Map<string, MarkCompiler>();
  readonly #renderers = new Map<string, RendererFactory>();
  readonly #plugins = new Map<string, string | undefined>();

  registerMark(type: string, compiler: MarkCompiler): void {
    const normalized = type.trim().toLowerCase();
    if (normalized === '') throw new Error('Mark type must not be empty.');
    this.#marks.set(normalized, compiler);
  }

  mark(type: string): MarkCompiler {
    const compiler = this.#marks.get(type.trim().toLowerCase());
    if (compiler === undefined) {
      throw new GraflumeError('UNSUPPORTED_MARK', `Unsupported mark type "${type}".`, {
        path: '$.layers[].mark.type',
        details: { availableMarks: this.markNames() },
      });
    }
    return compiler;
  }

  markNames(): readonly string[] {
    return [...this.#marks.keys()].sort();
  }

  registerRenderer(factory: RendererFactory): void {
    this.#renderers.set(factory.name, factory);
  }

  renderer(name: string): RendererFactory {
    const factory = this.#renderers.get(name);
    if (factory === undefined) {
      throw new GraflumeError('UNSUPPORTED_RENDERER', `Unsupported renderer "${name}".`, {
        path: '$.renderer',
        details: { availableRenderers: this.rendererNames() },
      });
    }
    return factory;
  }

  resolveRenderer(preference: NonNullable<ChartSpec['renderer']>): RendererFactory {
    if (preference === 'auto') return this.renderer('canvas');
    return this.renderer(preference);
  }

  rendererNames(): readonly string[] {
    return [...this.#renderers.keys()].sort();
  }

  registerTheme(theme: ThemeTokens): void {
    this.themes.register(theme);
  }

  use(plugin: GraflumePlugin): void {
    if (this.#plugins.has(plugin.name)) return;
    if (plugin.apiVersion !== undefined && plugin.apiVersion !== pluginApiVersion) {
      throw new GraflumeError(
        'INVALID_SPEC',
        `Plugin "${plugin.name}" requires API ${plugin.apiVersion}; runtime is ${pluginApiVersion}.`,
      );
    }

    const context: PluginContext = {
      apiVersion: pluginApiVersion,
      registerMark: (type, compiler) => this.registerMark(type, compiler),
      registerRenderer: (factory) => this.registerRenderer(factory),
      registerTheme: (theme) => this.registerTheme(theme),
    };
    plugin.install(context);
    this.#plugins.set(plugin.name, plugin.version);
  }

  capabilities(): {
    readonly marks: readonly string[];
    readonly renderers: readonly string[];
    readonly themes: readonly string[];
    readonly plugins: readonly string[];
  } {
    return {
      marks: this.markNames(),
      renderers: this.rendererNames(),
      themes: this.themes.names(),
      plugins: [...this.#plugins.keys()].sort(),
    };
  }
}
