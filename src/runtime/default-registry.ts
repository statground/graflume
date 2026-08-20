import { compileAreaMark } from '../marks/area.js';
import { compileBarMark } from '../marks/bar.js';
import { compileLineMark } from '../marks/line.js';
import { compilePointMark } from '../marks/point.js';
import {
  compileAnnotationMark,
  compileBubbleMark,
  compileCandlestickMark,
  compileDiffMark,
  compileHistogramMark,
  compileIntervalMark,
  compileSteppedAreaMark,
  compileTrendlineMark,
  compileVegaMark,
  compileWaterfallMark,
} from '../marks/cartesian-extended.js';
import { compileGaugeMark, compilePieMark } from '../marks/radial.js';
import {
  compileCalendarMark,
  compileGanttMark,
  compileGeoMark,
  compileMapMark,
  compileOrgMark,
  compileSankeyMark,
  compileTableMark,
  compileTimelineMark,
  compileTreemapMark,
  compileWordTreeMark,
} from '../marks/structured.js';
import { canvasRendererFactory } from '../renderer/canvas.js';
import { RuntimeRegistry } from './registry.js';

export function createDefaultRegistry(): RuntimeRegistry {
  const registry = new RuntimeRegistry();
  registry.registerRenderer(canvasRendererFactory);
  registry.registerMark('line', compileLineMark);
  registry.registerMark('bar', compileBarMark);
  registry.registerMark('point', compilePointMark);
  registry.registerMark('area', compileAreaMark);
  registry.registerMark('annotation', compileAnnotationMark);
  registry.registerMark('bubble', compileBubbleMark);
  registry.registerMark('calendar', compileCalendarMark);
  registry.registerMark('candlestick', compileCandlestickMark);
  registry.registerMark('diff', compileDiffMark);
  registry.registerMark('gantt', compileGanttMark);
  registry.registerMark('gauge', compileGaugeMark);
  registry.registerMark('geo', compileGeoMark);
  registry.registerMark('histogram', compileHistogramMark);
  registry.registerMark('interval', compileIntervalMark);
  registry.registerMark('map', compileMapMark);
  registry.registerMark('motion', compileBubbleMark);
  registry.registerMark('org', compileOrgMark);
  registry.registerMark('pie', compilePieMark);
  registry.registerMark('sankey', compileSankeyMark);
  registry.registerMark('stepped-area', compileSteppedAreaMark);
  registry.registerMark('table', compileTableMark);
  registry.registerMark('timeline', compileTimelineMark);
  registry.registerMark('treemap', compileTreemapMark);
  registry.registerMark('trendline', compileTrendlineMark);
  registry.registerMark('vega', compileVegaMark);
  registry.registerMark('waterfall', compileWaterfallMark);
  registry.registerMark('word-tree', compileWordTreeMark);
  return registry;
}

export const defaultRegistry = createDefaultRegistry();
