export type SpatialCanonicalFamilyId = 'surface' | 'volume' | 'spatial-vector';

export interface SpatialVariantCatalogEntry {
  readonly id: string;
  readonly mode: string;
  readonly mark: 'surface' | 'volume' | 'vector' | 'scatter';
  readonly quickApi: string;
  readonly description: string;
}

export interface SpatialFamilyCatalogEntry {
  readonly familyId: SpatialCanonicalFamilyId;
  readonly renderer: 'webgl';
  readonly entryPoint: 'graflume/spatial';
  readonly variants: readonly SpatialVariantCatalogEntry[];
}

export const spatialChartFamilies = Object.freeze([
  {
    familyId: 'surface',
    renderer: 'webgl',
    entryPoint: 'graflume/spatial',
    variants: [
      {
        id: 'surface',
        mode: 'surface',
        mark: 'surface',
        quickApi: 'surface',
        description: 'Regular x/y grid rendered as a lit height surface.',
      },
      {
        id: 'mesh',
        mode: 'mesh',
        mark: 'surface',
        quickApi: 'mesh',
        description: 'Indexed arbitrary triangle mesh with optional normals and vertex colors.',
      },
    ],
  },
  {
    familyId: 'volume',
    renderer: 'webgl',
    entryPoint: 'graflume/spatial',
    variants: [
      {
        id: 'volume',
        mode: 'volume',
        mark: 'volume',
        quickApi: 'volume',
        description: 'Bounded scalar-volume sampling rendered as depth-aware points.',
      },
      {
        id: 'isosurface',
        mode: 'isosurface',
        mark: 'volume',
        quickApi: 'isosurface',
        description: 'Constant-value boundary extracted into lit triangle geometry.',
      },
    ],
  },
  {
    familyId: 'spatial-vector',
    renderer: 'webgl',
    entryPoint: 'graflume/spatial',
    variants: [
      {
        id: 'vector-cone',
        mode: 'cone',
        mark: 'vector',
        quickApi: 'vectorCone',
        description: 'Oriented cone glyphs for magnitude and direction vectors.',
      },
      {
        id: 'streamtube',
        mode: 'streamtube',
        mark: 'vector',
        quickApi: 'streamtube',
        description: 'Tube geometry following ordered three-dimensional paths.',
      },
      {
        id: 'spatial-scatter',
        mode: 'scatter',
        mark: 'scatter',
        quickApi: 'spatialScatter',
        description: 'Depth-tested point observations with sizes, colors, labels, and picking.',
      },
    ],
  },
] as const satisfies readonly SpatialFamilyCatalogEntry[]);

export const spatialCompatibilityModes = Object.freeze([
  {
    id: 'globe',
    canonicalFamilyId: 'map',
    mode: 'globe',
    mark: 'globe',
    quickApi: 'globe',
    renderer: 'webgl',
    entryPoint: 'graflume/spatial',
    integration: 'existing-family-spatial-mode',
    description: 'Natural Earth land and borders on a sphere with optional points and routes.',
  },
] as const);

export const spatialCatalogBoundary = Object.freeze({
  coreAndCompleteCanonicalFamilies: 41,
  coreAndCompletePresets: 165,
  spatialCanonicalFamilies: spatialChartFamilies.length,
  totalCanonicalFamilies: 44,
  spatialVariants: spatialChartFamilies.reduce(
    (total, family) => total + family.variants.length,
    0,
  ),
  integratedExistingFamilyModes: spatialCompatibilityModes.length,
  totalPresetsAndModes: 173,
});
