import { seriesStackModes } from '../data/series-stack.js';
import { technicalIndicatorCapabilities } from '../data/technical-indicators.js';

/** Executable long-form series layout shared by Area, Bar, and Theme river. */
export const seriesStackCapability = {
  id: 'series-stack',
  status: 'supported',
  marks: ['area', 'bar', 'theme-river'],
  seriesField: 'mark.fields.series',
  option: 'mark.options.stack',
  modes: seriesStackModes,
  offsets: ['zero', 'normalize', 'expand', 'center', 'silhouette', 'wiggle'],
  orders: ['input', 'ascending', 'descending', 'sumAscending', 'sumDescending', 'insideOut'],
  signedBaseline: true,
  totals: ['absolute', 'positive', 'negative', 'net'],
  tooltipLineage: true,
  datumHitTargets: true,
  encoding: {
    bar: ['color', 'fill', 'stroke', 'opacity', 'strokeWidth', 'strokeDash', 'order', 'tooltip'],
    areaAndThemeRiver: [
      'color',
      'fill',
      'stroke',
      'opacity',
      'strokeWidth',
      'strokeDash',
      'order',
      'detail',
    ],
    areaPointOnly: ['size', 'radius', 'tooltip'],
    positionalConflicts: {
      bar: ['x2', 'y2'],
      area: ['y2'],
      themeRiver: ['y2'],
    },
  },
} as const;

/**
 * Runtime truth for the historical tiled-map compatibility name. Graflume has
 * no provider-backed tile lifecycle, network loader, cache, or attribution API.
 */
export const tiledMapCapability = {
  id: 'tiled-map',
  status: 'deprecated',
  behavior: 'embedded-basemap-alias',
  preferredFamily: 'map',
  basemap: 'natural-earth-embedded',
  tileLifecycle: false,
  networkRequests: false,
} as const;

/** Executable Canvas boundary for serializable analytic interaction state. */
export const analyticInteractionCapability = {
  id: 'analytic-interaction',
  status: 'supported',
  stateVersion: 1,
  selections: ['point', 'interval', 'rectangle', 'axis', 'lasso'],
  combine: ['union', 'intersection'],
  inputs: {
    pointer: true,
    touch: true,
    keyboardEscapeClear: true,
    keyboardGeometryAuthoring: true,
  },
  coordinates: {
    domainPixelRoundTrip: true,
    continuous: true,
    pointNearest: true,
    bandNearest: true,
    categoricalBrush: true,
    nonInvertibleGeometry: false,
  },
  domainNavigation: {
    cartesianContinuous: true,
    wheel: true,
    pointerDrag: true,
    keyboard: true,
    categorical: true,
    spatial: false,
    multiViewLinkedStore: true,
  },
  filtering: {
    selectionDriven: true,
    retainsScaleDomains: true,
    lineage: true,
  },
  composition: {
    coordinateViews: true,
    selectionShared: true,
    domainViewShared: true,
    viewAddressable: true,
  },
} as const;

/** The two canonical surfaces are separate from the 45 named preset functions. */
export const technicalIndicatorCanonicalSurfaces = [
  {
    id: 'technicalIndicator',
    kind: 'quick-api',
    entryPoint: 'graflume/complete',
  },
  {
    id: 'indicator',
    kind: 'portable-mark',
    entryPoint: 'ChartSpec',
  },
] as const;

/** 45 named presets plus two canonical surfaces: 47 public entry points. */
export const technicalIndicatorPublicEntryPointCount = {
  canonicalSurfaces: technicalIndicatorCanonicalSurfaces.length,
  namedPresets: technicalIndicatorCapabilities.length,
  total: technicalIndicatorCanonicalSurfaces.length + technicalIndicatorCapabilities.length,
} as const;

const computedTechnicalIndicatorCount = technicalIndicatorCapabilities.filter(
  ({ support }) => support === 'computed',
).length;

/** Machine-readable calculation boundary; never infers support from a public name. */
export const technicalIndicatorRuntimeCapability = {
  id: 'technical-indicator',
  status: 'supported',
  publicEntryPoints: {
    canonical: technicalIndicatorCanonicalSurfaces,
    ...technicalIndicatorPublicEntryPointCount,
  },
  calculations: {
    computed: computedTechnicalIndicatorCount,
    precomputedRequired: technicalIndicatorCapabilities.length - computedTechnicalIndicatorCount,
    warmUpPolicy: 'null',
    sessionReset: ['hard', 'carry'],
    incremental: { bounded: true, workerProtocol: 2 },
    synchronizedCrosshair: { axis: 'x', sharedDomain: true },
  },
  presets: technicalIndicatorCapabilities,
} as const;

/** Exact public runtime claims embedded in the generated integration catalog. */
export const runtimeCapabilities = {
  analyticInteraction: analyticInteractionCapability,
  seriesStack: seriesStackCapability,
  technicalIndicators: technicalIndicatorRuntimeCapability,
  tiledMap: tiledMapCapability,
} as const;
