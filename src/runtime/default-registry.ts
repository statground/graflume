import { compileAreaMark } from '../marks/area.js';
import { compileAnalyticalDistributionMark } from '../marks/analytical-p0.js';
import { compilePointMark } from '../marks/point.js';
import {
  compileAnnotationMark,
  compileBubbleMark,
  compileHistogramMark,
  compileSteppedAreaMark,
  compileTrendlineMark,
  compileVegaMark,
} from '../marks/cartesian-extended.js';
import {
  compileAdvancedGaugeMark,
  compileAdvancedPieMark,
  compileAdvancedTableMark,
  compileAdvancedTimelineMark,
} from '../marks/layout-advanced.js';
import { compileAdvancedMapMark } from '../marks/map-advanced.js';
import {
  compileAdvancedSankeyMark,
  compileAdvancedWordTreeMark,
} from '../marks/relationship-advanced.js';
import {
  compileAdvancedCalendarMark,
  compileAdvancedCandlestickMark,
  compileAdvancedDifferenceMark,
  compileAreaBubbleMark,
  compileEstimatedIntervalMark,
  compileOrderedLineMark,
  compileRankedBarMark,
  compileSemanticWaterfallMark,
} from '../marks/statistical-advanced.js';
import {
  compileGanttMark,
  compileGeoMark,
  compileOrgMark,
  compileTreemapMark,
} from '../marks/structured.js';
import { canvasRendererFactory } from '../renderer/canvas.js';
import { scatterWebGLRendererFactory } from '../renderer/scatter-webgl.js';
import { RuntimeRegistry } from './registry.js';

export function createDefaultRegistry(): RuntimeRegistry {
  const registry = new RuntimeRegistry();
  registry.registerRenderer(canvasRendererFactory);
  registry.registerRenderer(scatterWebGLRendererFactory);
  registry.registerMark('line', compileOrderedLineMark);
  registry.registerMark('bar', compileRankedBarMark);
  registry.registerMark('point', compilePointMark);
  registry.registerMark('area', compileAreaMark);
  registry.registerMark('annotation', compileAnnotationMark);
  registry.registerMark('bubble', compileAreaBubbleMark);
  registry.registerMark('calendar', compileAdvancedCalendarMark);
  registry.registerMark('candlestick', compileAdvancedCandlestickMark);
  registry.registerMark('diff', compileAdvancedDifferenceMark);
  registry.registerMark('gantt', compileGanttMark);
  registry.registerMark('gauge', compileAdvancedGaugeMark);
  registry.registerMark('geo', compileGeoMark);
  registry.registerMark('histogram', compileHistogramMark);
  registry.registerMark('distribution', compileAnalyticalDistributionMark);
  registry.registerMark('interval', compileEstimatedIntervalMark);
  registry.registerMark('map', compileAdvancedMapMark);
  registry.registerMark('motion', compileBubbleMark);
  registry.registerMark('org', compileOrgMark);
  registry.registerMark('pie', compileAdvancedPieMark);
  registry.registerMark('sankey', compileAdvancedSankeyMark);
  registry.registerMark('stepped-area', compileSteppedAreaMark);
  registry.registerMark('table', compileAdvancedTableMark);
  registry.registerMark('timeline', compileAdvancedTimelineMark);
  registry.registerMark('treemap', compileTreemapMark);
  registry.registerMark('trendline', compileTrendlineMark);
  registry.registerMark('vega', compileVegaMark);
  registry.registerMark('waterfall', compileSemanticWaterfallMark);
  registry.registerMark('word-tree', compileAdvancedWordTreeMark);
  return registry;
}

export const defaultRegistry = createDefaultRegistry();
