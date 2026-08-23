import type { DataRow } from '../spec/types.js';

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
}

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
  readonly closed: boolean;
  readonly stroke?: string;
  readonly fill?: string;
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
  readonly cornerRadius: number;
}

export interface CircleNode extends BaseNode {
  readonly type: 'circle';
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly lineWidth: number;
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

export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly root: GroupNode;
  readonly accessibility: {
    readonly label: string;
    readonly description?: string;
  };
  readonly metadata: {
    readonly rowCount: number;
    readonly renderedNodeCount: number;
    readonly performanceProfile: 'standard' | 'large' | 'ultra';
    readonly hitTestingEnabled: boolean;
  };
}
