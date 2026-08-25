import type { DataRow, DatumTargetSpec } from '../spec/types.js';
import type { TileCoordinate, TileSourceDefinition } from '../geography/map-lifecycle.js';
import type { SemanticMark } from './semantic.js';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface DatumReference {
  readonly layerId: string;
  readonly rowIndex: number;
  readonly datum: DataRow;
  /** Optional mark-derived values that replace a representative row in native tooltips. */
  readonly tooltip?: DataRow;
  /** Optional renderer-neutral contract consumed by live family-specific controls. */
  readonly familyInteraction?: FamilyDatumInteraction;
}

export type FamilyDatumInteraction =
  | {
      readonly kind: 'pie-slice';
      readonly id: string;
      readonly index: number;
      readonly count: number;
    }
  | {
      readonly kind: 'table-header';
      readonly field: string;
      readonly column: number;
      readonly columns: number;
    }
  | {
      readonly kind: 'table-cell';
      readonly field: string;
      readonly row: number;
      readonly column: number;
      readonly rows: number;
      readonly columns: number;
      readonly windowOffset: number;
      readonly windowLimit: number;
      readonly columnOffset: number;
      readonly columnLimit: number;
    }
  | {
      readonly kind: 'network-node';
      readonly id: string;
      readonly position: Point;
      readonly plot: Rect;
      readonly pinned: boolean;
      readonly compound: boolean;
      readonly collapsed: boolean;
    }
  | {
      readonly kind: 'flow-node';
      readonly id: string;
      readonly position: Point;
      readonly plot: Rect;
    }
  | {
      readonly kind: 'navigator-window';
      readonly family: 'candlestick' | 'timeline';
      readonly minimum: number;
      readonly maximum: number;
      readonly start: number;
      readonly end: number;
      readonly plot: Rect;
    }
  | {
      readonly kind: 'hierarchy-node';
      readonly id: string;
      readonly parent: string | null;
      readonly root: string;
      readonly leaf: boolean;
      readonly collapsed: boolean;
    }
  | {
      readonly kind: 'parallel-axis';
      readonly field: string;
      readonly index: number;
      readonly count: number;
      readonly invert: boolean;
      readonly plot: Rect;
    }
  | {
      readonly kind: 'heatmap-cell';
      readonly row: string | number;
      readonly column: string | number;
      readonly rowIndex: number;
      readonly columnIndex: number;
      readonly rowCount: number;
      readonly columnCount: number;
      readonly value: number | null;
    }
  | {
      readonly kind: 'scatter-matrix-cell';
      readonly xField: string;
      readonly yField: string;
      readonly row: number;
      readonly column: number;
      readonly plot: Rect;
      readonly xDomain: readonly [number, number];
      readonly yDomain: readonly [number, number];
    };

export interface BaseNode {
  readonly id: string;
  readonly zIndex: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly interactive?: boolean;
  readonly datum?: DatumReference;
}

export interface GroupNode extends BaseNode {
  readonly type: 'group';
  readonly children: readonly SceneNode[];
  readonly clip?: Rect;
}

export interface LineNode extends BaseNode {
  readonly type: 'line';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly stroke: string;
  readonly lineWidth: number;
  readonly dash?: readonly number[];
  readonly lineCap?: CanvasLineCap;
}

export interface PathNode extends BaseNode {
  readonly type: 'path';
  readonly points: readonly Point[];
  readonly subpaths?: readonly (readonly Point[])[];
  readonly closed: boolean;
  readonly stroke?: string;
  readonly fill?: string;
  readonly fillRule?: CanvasFillRule;
  readonly lineWidth: number;
  readonly dash?: readonly number[];
  readonly lineCap?: CanvasLineCap;
  readonly lineJoin?: CanvasLineJoin;
}

export interface RectNode extends BaseNode {
  readonly type: 'rect';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly lineWidth: number;
  readonly dash?: readonly number[];
  readonly cornerRadius: number;
  /** Optional provider tile loaded inside this rectangle by a tile-aware renderer. */
  readonly providerTile?: {
    readonly source: TileSourceDefinition;
    readonly tile: TileCoordinate;
  };
}

export interface CircleNode extends BaseNode {
  readonly type: 'circle';
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly lineWidth: number;
  readonly dash?: readonly number[];
}

export interface TextNode extends BaseNode {
  readonly type: 'text';
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly fill: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: string | number;
  readonly fontStyle?: 'normal' | 'italic';
  readonly align: CanvasTextAlign;
  readonly baseline: CanvasTextBaseline;
  readonly rotation: number;
}

export type SceneNode = GroupNode | LineNode | PathNode | RectNode | CircleNode | TextNode;

/** Renderer-neutral label geometry used by pointer, keyboard, and host authoring APIs. */
export interface MarkLabelSceneEntry {
  readonly id: string;
  readonly target: DatumTargetSpec;
  readonly text: string;
  readonly anchor: Point;
  readonly baseCenter: Point;
  readonly bounds: Rect;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly editable: boolean;
}

export interface MarkLabelSceneMetadata {
  readonly entries: readonly MarkLabelSceneEntry[];
  readonly plot: Rect;
  readonly activeId?: string;
}

export interface AnnotationSceneEntry {
  readonly id: string;
  readonly primitive: 'callout' | 'label' | 'point' | 'rule' | 'band';
  readonly bounds: Rect;
  readonly targetBounds: Rect;
  readonly resizable: boolean;
}

export interface AnnotationSceneMetadata {
  readonly entries: readonly AnnotationSceneEntry[];
  readonly activeId?: string;
}

export interface TechnicalIndicatorSceneMetadata {
  readonly layerId: string;
  readonly id: string;
  readonly kind: string;
  readonly requiredInputs: readonly string[];
  readonly outputFields: readonly string[];
  readonly warmUpRows: number;
  readonly parameters: Readonly<Record<string, number>>;
  readonly provenance: string;
  readonly session: {
    readonly mode: 'none' | 'field' | 'utc-day' | 'gap';
    readonly reset: 'hard' | 'carry';
    readonly boundaries: readonly number[];
  };
  readonly presentation: {
    readonly placement: 'overlay' | 'panel';
    readonly panelId: string;
    readonly synchronizedCrosshair: {
      readonly axis: 'x';
      readonly sharedDomain: true;
      readonly fields: readonly string[];
    };
  };
}

export interface TechnicalIndicatorPanelSceneMetadata {
  readonly id: string;
  readonly bounds: Rect;
  readonly layerIds: readonly string[];
  readonly placement: 'price' | 'indicator';
}

export interface TechnicalIndicatorCrosshairSceneMetadata {
  readonly value: number | string;
  readonly positions: readonly { readonly panelId: string; readonly x: number }[];
  readonly panelIds: readonly string[];
}

export interface AnalyticalFamilySceneMetadata {
  readonly layerId: string;
  readonly family:
    | 'distribution'
    | 'heatmap'
    | 'image'
    | 'ternary'
    | 'smith'
    | 'scatter-matrix'
    | 'carpet'
    | 'item';
  readonly mode: string;
  readonly contracts: readonly string[];
  readonly interaction: {
    readonly hitTesting: 'datum';
    readonly selectionKey: string;
    readonly linked: boolean;
  };
}

export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly root: GroupNode;
  readonly accessibility: {
    readonly label: string;
    readonly description?: string;
  };
  /** Bounded renderer-neutral mark descriptions used by accessible and host UIs. */
  readonly semanticIndex: readonly SemanticMark[];
  readonly metadata: {
    readonly rowCount: number;
    readonly renderedNodeCount: number;
    readonly performanceProfile: 'standard' | 'large' | 'ultra';
    readonly hitTestingEnabled: boolean;
    readonly dataLineage?: readonly string[];
    readonly annotations?: AnnotationSceneMetadata;
    readonly markLabels?: MarkLabelSceneMetadata;
    readonly technicalIndicators?: readonly TechnicalIndicatorSceneMetadata[];
    readonly technicalIndicatorPanels?: readonly TechnicalIndicatorPanelSceneMetadata[];
    readonly technicalIndicatorCrosshair?: TechnicalIndicatorCrosshairSceneMetadata;
    readonly analyticalFamilies?: readonly AnalyticalFamilySceneMetadata[];
    readonly composition?: {
      readonly kind: 'layer' | 'facet' | 'repeat' | 'hconcat' | 'vconcat' | 'concat' | 'inset';
      readonly viewCount: number;
      readonly viewIds: readonly string[];
      readonly resolve: {
        readonly scale: 'shared' | 'independent';
        readonly axis: 'shared' | 'independent';
        readonly legend: 'shared' | 'independent';
      };
    };
  };
}
