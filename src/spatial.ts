import { SpatialChart, type SpatialChartTarget } from './spatial/chart.js';
import { compileSpatial } from './spatial/compile.js';
import type {
  CompiledSpatialScene,
  SpatialAccessibilitySpec,
  SpatialCameraSpec,
  SpatialChartSpec,
  SpatialColor,
  SpatialConeVectorData,
  SpatialCreateOptions,
  SpatialGlobeData,
  SpatialHighlightSpec,
  SpatialAnnotationSpec,
  SpatialLegendSpec,
  SpatialInteractionSpec,
  SpatialLightingSpec,
  SpatialMeshData,
  SpatialScatterData,
  SpatialStreamtubeData,
  SpatialSurfaceGridData,
  SpatialVec3,
  SpatialVolumeData,
} from './spatial/types.js';
import type { ChartSpec } from './spec/types.js';
export { assertValidSpatialSpec, validateSpatialSpec } from './spatial/validate.js';
export type { SpatialSpecIssue } from './spatial/validate.js';
export { spatialOutputLimits } from './spatial/budget.js';
export {
  spatialCatalogBoundary,
  spatialChartFamilies,
  spatialCompatibilityModes,
} from './spatial/catalog.js';
export type {
  SpatialCanonicalFamilyId,
  SpatialFamilyCatalogEntry,
  SpatialVariantCatalogEntry,
} from './spatial/catalog.js';

export const spatialSpecVersion = '0.1' as const;

export interface SpatialQuickOptions {
  readonly id?: string;
  readonly title?: string;
  readonly theme?: ChartSpec['theme'];
  readonly background?: SpatialColor;
  readonly ariaLabel?: string;
  readonly camera?: SpatialCameraSpec;
  readonly lighting?: SpatialLightingSpec;
  readonly interaction?: SpatialInteractionSpec;
  readonly accessibility?: SpatialAccessibilitySpec;
  readonly legend?: boolean | SpatialLegendSpec;
  readonly highlights?: readonly SpatialHighlightSpec[];
  readonly annotations?: readonly SpatialAnnotationSpec[];
  readonly create?: SpatialCreateOptions;
}

export interface SurfaceQuickOptions extends SpatialQuickOptions {
  readonly color?: SpatialColor;
  readonly opacity?: number;
  readonly wireframe?: boolean;
}

export interface VolumeQuickOptions extends SpatialQuickOptions {
  readonly isoValue?: number;
  readonly opacity?: number;
  readonly pointSize?: number;
  readonly maxSamples?: number;
  readonly colorLow?: SpatialColor;
  readonly colorHigh?: SpatialColor;
}

export interface VectorQuickOptions extends SpatialQuickOptions {
  readonly color?: SpatialColor;
  readonly opacity?: number;
  readonly radius?: number;
  readonly scale?: number;
  readonly segments?: number;
}

export interface ScatterQuickOptions extends SpatialQuickOptions {
  readonly color?: SpatialColor;
  readonly opacity?: number;
  readonly pointSize?: number;
}

export interface GlobeQuickOptions extends SpatialQuickOptions {
  readonly radius?: number;
  readonly landColor?: SpatialColor;
  readonly oceanColor?: SpatialColor;
  readonly borderColor?: SpatialColor;
  readonly pointColor?: SpatialColor;
  readonly routeColor?: SpatialColor;
  readonly opacity?: number;
  readonly routeSegments?: number;
}

function specBase(options: SpatialQuickOptions): Omit<SpatialChartSpec, 'layers'> {
  return {
    specVersion: spatialSpecVersion,
    ...(options.title === undefined ? {} : { title: options.title }),
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(options.background === undefined ? {} : { background: options.background }),
    ...(options.ariaLabel === undefined ? {} : { ariaLabel: options.ariaLabel }),
    ...(options.camera === undefined ? {} : { camera: options.camera }),
    ...(options.lighting === undefined ? {} : { lighting: options.lighting }),
    ...(options.interaction === undefined ? {} : { interaction: options.interaction }),
    ...(options.accessibility === undefined ? {} : { accessibility: options.accessibility }),
    ...(options.legend === undefined ? {} : { legend: options.legend }),
    ...(options.highlights === undefined ? {} : { highlights: options.highlights }),
    ...(options.annotations === undefined ? {} : { annotations: options.annotations }),
  };
}

export function createSpatial(
  target: SpatialChartTarget,
  spec: SpatialChartSpec,
  options?: SpatialCreateOptions,
): SpatialChart {
  return new SpatialChart(target, spec, options);
}

export function surface(
  target: SpatialChartTarget,
  data: SpatialSurfaceGridData,
  options: SurfaceQuickOptions = {},
): SpatialChart {
  return createSpatial(
    target,
    {
      ...specBase(options),
      layers: [
        {
          ...(options.id === undefined ? {} : { id: options.id }),
          mark: {
            type: 'surface',
            mode: 'surface',
            ...(options.color === undefined ? {} : { color: options.color }),
            ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
            ...(options.wireframe === undefined ? {} : { wireframe: options.wireframe }),
          },
          data,
        },
      ],
    },
    options.create,
  );
}

export function mesh(
  target: SpatialChartTarget,
  data: SpatialMeshData,
  options: SurfaceQuickOptions = {},
): SpatialChart {
  return createSpatial(
    target,
    {
      ...specBase(options),
      layers: [
        {
          ...(options.id === undefined ? {} : { id: options.id }),
          mark: {
            type: 'surface',
            mode: 'mesh',
            ...(options.color === undefined ? {} : { color: options.color }),
            ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
            ...(options.wireframe === undefined ? {} : { wireframe: options.wireframe }),
          },
          data,
        },
      ],
    },
    options.create,
  );
}

function volumeQuick(
  target: SpatialChartTarget,
  data: SpatialVolumeData,
  mode: 'volume' | 'isosurface',
  options: VolumeQuickOptions,
): SpatialChart {
  return createSpatial(
    target,
    {
      ...specBase(options),
      layers: [
        {
          ...(options.id === undefined ? {} : { id: options.id }),
          mark: {
            type: 'volume',
            mode,
            ...(options.isoValue === undefined ? {} : { isoValue: options.isoValue }),
            ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
            ...(options.pointSize === undefined ? {} : { pointSize: options.pointSize }),
            ...(options.maxSamples === undefined ? {} : { maxSamples: options.maxSamples }),
            ...(options.colorLow === undefined ? {} : { colorLow: options.colorLow }),
            ...(options.colorHigh === undefined ? {} : { colorHigh: options.colorHigh }),
          },
          data,
        },
      ],
    },
    options.create,
  );
}

export function volume(
  target: SpatialChartTarget,
  data: SpatialVolumeData,
  options: VolumeQuickOptions = {},
): SpatialChart {
  return volumeQuick(target, data, 'volume', options);
}

export function isosurface(
  target: SpatialChartTarget,
  data: SpatialVolumeData,
  options: VolumeQuickOptions = {},
): SpatialChart {
  return volumeQuick(target, data, 'isosurface', options);
}

function vectorChart(
  target: SpatialChartTarget,
  data: SpatialConeVectorData | SpatialStreamtubeData,
  mode: 'cone' | 'streamtube',
  options: VectorQuickOptions,
): SpatialChart {
  return createSpatial(
    target,
    {
      ...specBase(options),
      layers: [
        {
          ...(options.id === undefined ? {} : { id: options.id }),
          mark: {
            type: 'vector',
            mode,
            ...(options.color === undefined ? {} : { color: options.color }),
            ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
            ...(options.radius === undefined ? {} : { radius: options.radius }),
            ...(options.scale === undefined ? {} : { scale: options.scale }),
            ...(options.segments === undefined ? {} : { segments: options.segments }),
          },
          data,
        },
      ],
    } as SpatialChartSpec,
    options.create,
  );
}

export function vectorCone(
  target: SpatialChartTarget,
  data: SpatialConeVectorData,
  options: VectorQuickOptions = {},
): SpatialChart {
  return vectorChart(target, data, 'cone', options);
}

export function streamtube(
  target: SpatialChartTarget,
  data: SpatialStreamtubeData,
  options: VectorQuickOptions = {},
): SpatialChart {
  return vectorChart(target, data, 'streamtube', options);
}

export function spatialScatter(
  target: SpatialChartTarget,
  data: SpatialScatterData,
  options: ScatterQuickOptions = {},
): SpatialChart {
  return createSpatial(
    target,
    {
      ...specBase(options),
      layers: [
        {
          ...(options.id === undefined ? {} : { id: options.id }),
          mark: {
            type: 'scatter',
            ...(options.color === undefined ? {} : { color: options.color }),
            ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
            ...(options.pointSize === undefined ? {} : { pointSize: options.pointSize }),
          },
          data,
        },
      ],
    },
    options.create,
  );
}

export const scatter = spatialScatter;

export function globe(
  target: SpatialChartTarget,
  data: SpatialGlobeData = {},
  options: GlobeQuickOptions = {},
): SpatialChart {
  return createSpatial(
    target,
    {
      ...specBase(options),
      layers: [
        {
          ...(options.id === undefined ? {} : { id: options.id }),
          mark: {
            type: 'globe',
            ...(options.radius === undefined ? {} : { radius: options.radius }),
            ...(options.landColor === undefined ? {} : { landColor: options.landColor }),
            ...(options.oceanColor === undefined ? {} : { oceanColor: options.oceanColor }),
            ...(options.borderColor === undefined ? {} : { borderColor: options.borderColor }),
            ...(options.pointColor === undefined ? {} : { pointColor: options.pointColor }),
            ...(options.routeColor === undefined ? {} : { routeColor: options.routeColor }),
            ...(options.opacity === undefined ? {} : { opacity: options.opacity }),
            ...(options.routeSegments === undefined
              ? {}
              : { routeSegments: options.routeSegments }),
          },
          data,
        },
      ],
    },
    options.create,
  );
}

export function spatialCapabilities() {
  return {
    renderer: 'webgl',
    gpu: true,
    projections: ['perspective', 'orthographic'],
    marks: {
      surface: ['surface', 'mesh'],
      volume: ['volume', 'isosurface'],
      vector: ['cone', 'streamtube'],
      scatter: ['scatter'],
      globe: ['globe', 'point', 'route'],
    },
    exportFormats: ['image/png'],
  } as const;
}

export const webglSpatialRenderer = Object.freeze({
  name: 'webgl',
  gpu: true,
  projections: ['perspective', 'orthographic'] as const,
});

export { SpatialChart, compileSpatial, type CompiledSpatialScene, type SpatialChartTarget };
export * from './spatial/types.js';
export type {
  SpatialAvailabilityChangeEvent,
  SpatialAvailabilityState,
  SpatialAvailabilityStatus,
  SpatialCameraChangeEvent,
  SpatialCameraChangeReason,
  SpatialLegendChangeEvent,
  SpatialLegendChangeReason,
  SpatialLegendItemState,
  SpatialLegendState,
  SpatialSelectionChangeEvent,
  SpatialSelectionChangeReason,
  SpatialSelectionState,
  SpatialAnnotationChangeEvent,
  SpatialAnnotationChangeReason,
  SpatialAnnotationVisibilityChangeEvent,
  SpatialAnnotationVisibilityChangeReason,
  SpatialChartEventMap,
  SpatialErrorEvent,
  SpatialFullscreenChangeEvent,
  SpatialPointerEvent,
  SpatialRenderEvent,
  SpatialResizeEvent,
} from './spatial/chart.js';
