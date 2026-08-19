import type { DataTable } from '../data/table.js';
import type { PerformanceSettings } from '../data/performance.js';
import type { Scale } from '../scale/types.js';
import type { NormalizedLayerSpec, FieldType } from '../spec/types.js';
import type { SceneNode, Rect } from '../scene/types.js';
import type { ThemeTokens } from '../theme/types.js';

export interface PlotArea extends Rect {}

export interface BarGroupContext {
  readonly count: number;
  readonly index: number;
}

export interface MarkCompileContext {
  readonly layer: NormalizedLayerSpec;
  readonly table: DataTable;
  readonly xScale: Scale;
  readonly yScale: Scale;
  readonly xType: FieldType;
  readonly yType: FieldType;
  readonly plot: PlotArea;
  readonly theme: ThemeTokens;
  readonly color: string;
  readonly performance: PerformanceSettings;
  readonly barGroup: BarGroupContext;
}

export type MarkCompiler = (context: MarkCompileContext) => readonly SceneNode[];
