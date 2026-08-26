export interface DemoRecipeEngineDefinition {
  readonly id: string;
  readonly shape: string;
  readonly summary: string;
  readonly reductionMethod: string;
  readonly previewMethod: string;
  readonly parameterKeys: readonly string[];
}

export const demoRecipeCatalog: readonly DemoRecipeEngineDefinition[];
export function materializeDemoRecipe(recipe: unknown): unknown;
