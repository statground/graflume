export type SpatialVec3 = readonly [number, number, number];
export type SpatialColor =
  string | readonly [number, number, number] | readonly [number, number, number, number];

export type SpatialProjection = 'perspective' | 'orthographic';

export interface SpatialCameraSpec {
  readonly projection?: SpatialProjection;
  readonly target?: SpatialVec3;
  readonly yaw?: number;
  readonly pitch?: number;
  readonly distance?: number;
  readonly fov?: number;
  readonly near?: number;
  readonly far?: number;
}

export interface SpatialLightingSpec {
  readonly ambient?: number;
  readonly diffuse?: number;
  readonly direction?: SpatialVec3;
}

export interface SpatialAccessibilitySpec {
  readonly description?: string;
  readonly table?: boolean;
  readonly maxRows?: number;
}

export interface SpatialControlLabels {
  readonly chart?: string;
  readonly toolbar?: string;
  readonly orbit?: string;
  readonly pan?: string;
  readonly zoomIn?: string;
  readonly zoomOut?: string;
  readonly reset?: string;
  readonly projection?: string;
  readonly fullscreen?: string;
  readonly exportPng?: string;
  readonly showAnnotations?: string;
  readonly hideAnnotations?: string;
  readonly instructions?: string;
  readonly contextLost?: string;
  readonly unavailable?: string;
}

export interface SpatialControlsSpec {
  readonly annotations?: boolean;
}

export interface SpatialTooltipSpec {
  readonly title?: string;
  readonly fields?: readonly string[];
}

export interface SpatialInteractionSpec {
  readonly orbit?: boolean;
  readonly pan?: boolean;
  readonly zoom?: boolean;
  readonly wheel?: 'off' | 'modifier' | 'always';
  readonly picking?: boolean;
  readonly tooltip?: boolean | SpatialTooltipSpec;
  readonly controls?: boolean | SpatialControlsSpec;
  readonly labels?: SpatialControlLabels;
  readonly selection?: boolean | SpatialSelectionSpec;
}

export interface SpatialSelectionSpec {
  readonly mode?: 'single' | 'multiple';
  readonly toggle?: boolean;
  /** Stable scalar datum field used instead of transient datumIndex when available. */
  readonly key?: string;
  readonly clearOnBackground?: boolean;
  readonly clearOnEscape?: boolean;
  readonly ariaLabel?: string;
  readonly highlight?: HighlightStyleSpec;
}

export interface SpatialDatumTargetSpec {
  readonly type: 'datum';
  readonly layerId?: string;
  readonly datumIndex?: number | readonly number[];
  readonly field?: string;
  readonly value?: JsonPrimitive;
  readonly values?: readonly JsonPrimitive[];
}

export interface SpatialLayerTargetSpec {
  readonly type: 'layer';
  readonly layerId: string;
}

export interface SpatialPointTargetSpec {
  readonly type: 'point';
  readonly position: SpatialVec3;
}

export interface SpatialBoxTargetSpec {
  readonly type: 'box';
  readonly min: SpatialVec3;
  readonly max: SpatialVec3;
}

export type SpatialDecorationTargetSpec =
  SpatialDatumTargetSpec | SpatialLayerTargetSpec | SpatialPointTargetSpec | SpatialBoxTargetSpec;

export interface SpatialHighlightSpec extends HighlightStyleSpec {
  readonly id?: string;
  readonly target: SpatialDecorationTargetSpec;
}

export interface SpatialAnnotationSpec {
  readonly id?: string;
  readonly target: SpatialDecorationTargetSpec;
  readonly text: string;
  readonly detail?: string;
  readonly placement?: 'auto' | 'top' | 'right' | 'bottom' | 'left';
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly connector?: boolean | AnnotationConnectorSpec;
  readonly style?: AnnotationStyleSpec;
}

/** Spatial legends share the portable legend contract; category mode requires explicit items. */
export type SpatialLegendSpec = LegendSpec;

export interface SpatialSurfaceGridData {
  readonly rows: number;
  readonly columns: number;
  readonly z: readonly number[];
  readonly x?: readonly number[];
  readonly y?: readonly number[];
  readonly values?: readonly number[];
}

export interface SpatialMeshData {
  readonly positions: readonly SpatialVec3[];
  readonly triangles: readonly (readonly [number, number, number])[];
  readonly normals?: readonly SpatialVec3[];
  readonly colors?: readonly SpatialColor[];
  readonly labels?: readonly string[];
}

export interface SpatialSurfaceMark {
  readonly type: 'surface';
  readonly mode?: 'surface' | 'mesh';
  readonly color?: SpatialColor;
  readonly opacity?: number;
  readonly wireframe?: boolean;
}

export interface SpatialSurfaceLayer {
  readonly id?: string;
  readonly name?: string;
  readonly mark: SpatialSurfaceMark;
  readonly data: SpatialSurfaceGridData | SpatialMeshData;
}

export interface SpatialVolumeData {
  readonly dimensions: SpatialVec3;
  readonly values: readonly number[];
  readonly origin?: SpatialVec3;
  readonly spacing?: SpatialVec3;
}

export interface SpatialVolumeMark {
  readonly type: 'volume';
  readonly mode?: 'volume' | 'isosurface';
  readonly isoValue?: number;
  readonly opacity?: number;
  readonly pointSize?: number;
  readonly maxSamples?: number;
  readonly colorLow?: SpatialColor;
  readonly colorHigh?: SpatialColor;
}

export interface SpatialVolumeLayer {
  readonly id?: string;
  readonly name?: string;
  readonly mark: SpatialVolumeMark;
  readonly data: SpatialVolumeData;
}

export interface SpatialConeVectorData {
  readonly origins: readonly SpatialVec3[];
  readonly vectors: readonly SpatialVec3[];
  readonly labels?: readonly string[];
  readonly colors?: readonly SpatialColor[];
}

export interface SpatialStreamtubeData {
  readonly paths: readonly (readonly SpatialVec3[])[];
  readonly labels?: readonly string[];
  readonly colors?: readonly SpatialColor[];
}

export interface SpatialVectorMark {
  readonly type: 'vector';
  readonly mode?: 'cone' | 'streamtube';
  readonly color?: SpatialColor;
  readonly opacity?: number;
  readonly radius?: number;
  readonly scale?: number;
  readonly segments?: number;
}

export interface SpatialVectorLayer {
  readonly id?: string;
  readonly name?: string;
  readonly mark: SpatialVectorMark;
  readonly data: SpatialConeVectorData | SpatialStreamtubeData;
}

export interface SpatialScatterData {
  readonly positions: readonly SpatialVec3[];
  readonly values?: readonly number[];
  readonly sizes?: readonly number[];
  readonly colors?: readonly SpatialColor[];
  readonly labels?: readonly string[];
}

export interface SpatialScatterMark {
  readonly type: 'scatter';
  readonly color?: SpatialColor;
  readonly opacity?: number;
  readonly pointSize?: number;
}

export interface SpatialScatterLayer {
  readonly id?: string;
  readonly name?: string;
  readonly mark: SpatialScatterMark;
  readonly data: SpatialScatterData;
}

export interface SpatialGlobePoint {
  readonly longitude: number;
  readonly latitude: number;
  readonly value?: number;
  readonly label?: string;
  readonly color?: SpatialColor;
  readonly size?: number;
}

export interface SpatialGlobeRoute {
  readonly from: readonly [longitude: number, latitude: number];
  readonly to: readonly [longitude: number, latitude: number];
  readonly value?: number;
  readonly label?: string;
  readonly color?: SpatialColor;
}

export interface SpatialGlobeData {
  readonly points?: readonly SpatialGlobePoint[];
  readonly routes?: readonly SpatialGlobeRoute[];
}

export interface SpatialGlobeMark {
  readonly type: 'globe';
  readonly radius?: number;
  readonly landColor?: SpatialColor;
  readonly oceanColor?: SpatialColor;
  readonly borderColor?: SpatialColor;
  readonly pointColor?: SpatialColor;
  readonly routeColor?: SpatialColor;
  readonly opacity?: number;
  readonly routeSegments?: number;
}

export interface SpatialGlobeLayer {
  readonly id?: string;
  readonly name?: string;
  readonly mark: SpatialGlobeMark;
  readonly data?: SpatialGlobeData;
}

export type SpatialLayerSpec =
  | SpatialSurfaceLayer
  | SpatialVolumeLayer
  | SpatialVectorLayer
  | SpatialScatterLayer
  | SpatialGlobeLayer;

export interface SpatialChartSpec {
  readonly specVersion?: '0.1';
  readonly title?: string;
  readonly background?: SpatialColor;
  readonly ariaLabel?: string;
  readonly camera?: SpatialCameraSpec;
  readonly lighting?: SpatialLightingSpec;
  readonly interaction?: SpatialInteractionSpec;
  readonly accessibility?: SpatialAccessibilitySpec;
  readonly legend?: boolean | SpatialLegendSpec;
  readonly highlights?: readonly SpatialHighlightSpec[];
  readonly annotations?: readonly SpatialAnnotationSpec[];
  readonly layers: readonly SpatialLayerSpec[];
}

export interface SpatialCreateOptions {
  readonly autoResize?: boolean;
  readonly width?: number;
  readonly height?: number;
  readonly pixelRatio?: number;
}

export interface SpatialCameraState {
  readonly projection: SpatialProjection;
  readonly target: SpatialVec3;
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
  readonly fov: number;
  readonly near: number;
  readonly far: number;
}

export type SpatialPrimitive = 'points' | 'lines' | 'triangles';

export interface SpatialPickTarget {
  readonly layerId: string;
  readonly layerIndex: number;
  readonly datumIndex: number;
  readonly nodeId: string;
  readonly position: SpatialVec3;
  readonly datum: Readonly<Record<string, unknown>>;
  /** Projection-specific overlay occlusion policy resolved by the compiler. */
  readonly occlusion?: 'globe-front';
}

export interface CompiledSpatialGeometry {
  readonly id: string;
  readonly primitive: SpatialPrimitive;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly colors: Float32Array;
  readonly sizes: Float32Array;
  readonly indices?: Uint32Array;
  readonly picks: readonly SpatialPickTarget[];
}

export interface SpatialBounds {
  readonly min: SpatialVec3;
  readonly max: SpatialVec3;
  readonly center: SpatialVec3;
  readonly radius: number;
}

export interface CompiledSpatialScene {
  readonly geometries: readonly CompiledSpatialGeometry[];
  readonly bounds: SpatialBounds;
  readonly spec: SpatialChartSpec;
}

export interface SpatialHitResult extends SpatialPickTarget {
  readonly screen: Readonly<{ x: number; y: number; depth: number }>;
}

export interface SpatialCapabilities {
  readonly renderer: 'webgl';
  readonly gpu: true;
  readonly projections: readonly SpatialProjection[];
  readonly marks: Readonly<Record<string, readonly string[]>>;
  readonly exportFormats: readonly ['image/png'];
}
import type {
  AnnotationConnectorSpec,
  AnnotationStyleSpec,
  HighlightStyleSpec,
  JsonPrimitive,
  LegendSpec,
} from '../spec/types.js';
