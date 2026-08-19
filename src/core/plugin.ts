import type { MarkCompiler } from '../compiler/types.js';
import type { RendererFactory } from '../renderer/types.js';
import type { ThemeTokens } from '../theme/types.js';

export const pluginApiVersion = '0.1' as const;

export interface PluginContext {
  readonly apiVersion: typeof pluginApiVersion;
  registerMark(type: string, compiler: MarkCompiler): void;
  registerRenderer(factory: RendererFactory): void;
  registerTheme(theme: ThemeTokens): void;
}

export interface GraflumePlugin {
  readonly name: string;
  readonly version?: string;
  readonly apiVersion?: typeof pluginApiVersion;
  install(context: PluginContext): void;
}
