import type { CompiledSpatialGeometry, SpatialPickTarget } from './types.js';

export function spatialAccessibleDescription(
  description: string | undefined,
  instructions: string,
): string {
  const custom = description?.trim();
  const guidance = instructions.trim();
  if (custom === undefined || custom === '') return guidance;
  if (guidance === '' || guidance === custom) return custom;
  return `${custom} ${guidance}`;
}

export function collectAccessibleSpatialPicks(
  geometries: readonly CompiledSpatialGeometry[],
  maximumRows: number,
): readonly SpatialPickTarget[] {
  const limit = Math.max(1, Math.min(1_000, Math.trunc(maximumRows)));
  const prioritized = [
    ...geometries.filter(({ id }) => id.endsWith(':points') || id.endsWith(':routes')),
    ...geometries.filter(({ id }) => !id.endsWith(':points') && !id.endsWith(':routes')),
  ];
  const output: SpatialPickTarget[] = [];
  outer: for (const geometry of prioritized) {
    for (const pick of geometry.picks) {
      output.push(pick);
      if (output.length >= limit) break outer;
    }
  }
  return output;
}
