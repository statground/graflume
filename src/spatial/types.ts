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
  readonly instructions?: string;
  readonly contextLost?: string;
  readonly unavailable?: string;
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
  readonly controls?: boolean;
  readonly labels?: SpatialControlLabels;
}

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
