import type { ChartSpec, CompositionResolveMode, CompositionResolveSpec } from './types.js';

export type CompositionKind =
  'layer' | 'facet' | 'repeat' | 'hconcat' | 'vconcat' | 'concat' | 'inset';

export const compositionOperators = [
  'layer',
  'facet',
  'repeat',
  'hconcat',
  'vconcat',
  'concat',
  'inset',
] as const satisfies readonly CompositionKind[];

export const maximumCompositionDepth = 4;
export const maximumCompositionViews = 64;
export const maximumCompositionLayers = 128;
export const maximumLayerCompositionChildren = 16;

export interface ResolvedCompositionResolve {
  readonly scale: CompositionResolveMode;
  readonly axis: CompositionResolveMode;
  readonly legend: CompositionResolveMode;
}

export function presentCompositionOperators(
  input: Readonly<Record<string, unknown>>,
): CompositionKind[] {
  return compositionOperators.filter((key) => input[key] !== undefined);
}

export function compositionKind(input: ChartSpec): CompositionKind | null {
  const operators = presentCompositionOperators(input as Readonly<Record<string, unknown>>);
  return operators.length === 1 ? operators[0]! : null;
}

export function isCompositionSpec(input: ChartSpec): boolean {
  return presentCompositionOperators(input as Readonly<Record<string, unknown>>).length > 0;
}

export function resolveComposition(
  input: CompositionResolveSpec | undefined,
  kind: CompositionKind,
): ResolvedCompositionResolve {
  const defaultMode: CompositionResolveMode = kind === 'layer' ? 'shared' : 'independent';
  return {
    scale: input?.scale ?? defaultMode,
    axis: input?.axis ?? defaultMode,
    legend: input?.legend ?? defaultMode,
  };
}
