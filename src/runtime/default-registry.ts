import { compileAreaMark } from '../marks/area.js';
import { compileBarMark } from '../marks/bar.js';
import { compileLineMark } from '../marks/line.js';
import { compilePointMark } from '../marks/point.js';
import { canvasRendererFactory } from '../renderer/canvas.js';
import { RuntimeRegistry } from './registry.js';

export function createDefaultRegistry(): RuntimeRegistry {
  const registry = new RuntimeRegistry();
  registry.registerRenderer(canvasRendererFactory);
  registry.registerMark('line', compileLineMark);
  registry.registerMark('bar', compileBarMark);
  registry.registerMark('point', compilePointMark);
  registry.registerMark('area', compileAreaMark);
  return registry;
}

export const defaultRegistry = createDefaultRegistry();
