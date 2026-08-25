import { sceneNodeBounds } from '../scene/bounds.js';
import { group, nodeBase } from '../scene/factory.js';
import type { Rect, SceneNode, TextNode } from '../scene/types.js';
import type {
  AnnotationSpec,
  DatumTargetSpec,
  DecorationTargetSpec,
  HighlightSpec,
  HighlightStyleSpec,
  JsonPrimitive,
  NormalizedChartSpec,
} from '../spec/types.js';
import type { ThemeTokens } from '../theme/types.js';
import type { ScaleResolution } from './domain.js';
import type { PlotArea } from './types.js';
import { isAxislessLayer } from './coordinate.js';
import { placeCallout, type CalloutRect } from '../interaction/callout-placement.js';

export interface DecorationRuntimeState {
  readonly annotations?: readonly AnnotationSpec[];
  readonly annotationsVisible?: boolean;
  readonly selection?: readonly DatumTargetSpec[];
}

interface TargetResolution {
  readonly bounds: Rect;
  readonly found: boolean;
}

interface AnnotationNodesResult {
  readonly nodes: readonly SceneNode[];
  readonly bounds: Rect | null;
}

function union(left: Rect | null, right: Rect | null): Rect | null {
  if (left === null) return right;
  if (right === null) return left;
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const endX = Math.max(left.x + left.width, right.x + right.width);
  const endY = Math.max(left.y + left.height, right.y + right.height);
  return { x, y, width: endX - x, height: endY - y };
}

function scalarEqual(left: unknown, right: JsonPrimitive): boolean {
  if (left instanceof Date) {
    return typeof right === 'string'
      ? left.toISOString() === right || left.toISOString().slice(0, 10) === right
      : typeof right === 'number' && left.getTime() === right;
  }
  return left === right;
}

function datumMatches(target: DatumTargetSpec, node: SceneNode): boolean {
  const reference = node.datum;
  if (reference === undefined) return false;
  if (target.layerId !== undefined && reference.layerId !== target.layerId) return false;
  if (target.rowIndex !== undefined) {
    const rows = Array.isArray(target.rowIndex) ? target.rowIndex : [target.rowIndex];
    if (!rows.includes(reference.rowIndex)) return false;
  }
  if (target.field !== undefined) {
    const sources = [reference.tooltip, reference.datum].filter(
      (source): source is NonNullable<typeof source> => source !== undefined,
    );
    const matches = (source: Readonly<Record<string, unknown>>) => {
      const candidate = source[target.field!];
      if (target.values !== undefined)
        return target.values.some((value) => scalarEqual(candidate, value));
      return scalarEqual(candidate, target.value ?? null);
    };
    if (!sources.some(matches)) return false;
  }
  return true;
}

function descendants(node: SceneNode, ancestorVisible = true): readonly SceneNode[] {
  const effectivelyVisible = ancestorVisible && node.visible && node.opacity > 0;
  if (!effectivelyVisible) return [];
  if (node.type !== 'group') return [node];
  return node.children.flatMap((child) => descendants(child, effectivelyVisible));
}

function nodesForTarget(target: DecorationTargetSpec, layerGroups: readonly SceneNode[]) {
  if (target.type === 'layer') {
    const groupNode = layerGroups.find((node) => node.id === `${target.layerId}:group`);
    return groupNode === undefined ? [] : descendants(groupNode);
  }
  if (target.type !== 'datum') return [];
  return layerGroups
    .flatMap((node) => descendants(node))
    .filter((node) => datumMatches(target, node));
}

function fallbackDatumBounds(
  target: DatumTargetSpec,
  scales: ScaleResolution,
  datumVisible?: (
    layerId: string,
    rowIndex: number,
    datum: Readonly<Record<string, unknown>>,
  ) => boolean,
): Rect | null {
  let bounds: Rect | null = null;
  for (const layerData of scales.layers) {
    if (target.layerId !== undefined && target.layerId !== layerData.layer.id) continue;
    if (isAxislessLayer(layerData.layer)) continue;
    for (let rowIndex = 0; rowIndex < layerData.table.length; rowIndex += 1) {
      const datum = layerData.table.row(rowIndex);
      if (datumVisible?.(layerData.layer.id, rowIndex, datum) === false) continue;
      const synthetic: SceneNode = {
        type: 'circle',
        id: 'decoration:synthetic',
        zIndex: 0,
        opacity: 1,
        visible: true,
        interactive: true,
        datum: {
          layerId: layerData.layer.id,
          rowIndex,
          datum,
        },
        cx: 0,
        cy: 0,
        radius: 1,
        lineWidth: 0,
      };
      if (!datumMatches(target, synthetic)) continue;
      const xValue = layerData.table.value(rowIndex, layerData.layer.x.field);
      const yValue = layerData.table.value(rowIndex, layerData.layer.y.field);
      if (
        xValue === undefined ||
        xValue === null ||
        (typeof xValue === 'object' && !(xValue instanceof Date)) ||
        typeof xValue === 'boolean' ||
        yValue === undefined ||
        yValue === null ||
        (typeof yValue === 'object' && !(yValue instanceof Date)) ||
        typeof yValue === 'boolean'
      )
        continue;
      const x = layerData.xScale.map(xValue);
      const y = layerData.yScale.map(yValue);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      bounds = union(bounds, { x, y, width: 0, height: 0 });
    }
  }
  return bounds;
}

function rangeBounds(
  target: Extract<DecorationTargetSpec, { type: 'range' }>,
  scales: ScaleResolution,
  plot: PlotArea,
): Rect | null {
  let x1 = plot.x;
  let x2 = plot.x + plot.width;
  let y1 = plot.y;
  let y2 = plot.y + plot.height;
  if (target.x !== undefined) {
    const resolved = scales.axes[target.x.axis ?? 'x'];
    if (resolved === undefined) return null;
    const mappedFrom = resolved.scale.map(target.x.from);
    const mappedTo = resolved.scale.map(target.x.to);
    const padding = resolved.scale.bandwidth / 2;
    x1 = Math.min(mappedFrom, mappedTo) - padding;
    x2 = Math.max(mappedFrom, mappedTo) + padding;
  }
  if (target.y !== undefined) {
    const resolved = scales.axes[target.y.axis ?? 'y'];
    if (resolved === undefined) return null;
    const mappedFrom = resolved.scale.map(target.y.from);
    const mappedTo = resolved.scale.map(target.y.to);
    const padding = resolved.scale.bandwidth / 2;
    y1 = Math.min(mappedFrom, mappedTo) - padding;
    y2 = Math.max(mappedFrom, mappedTo) + padding;
  }
  if (![x1, x2, y1, y2].every(Number.isFinite)) return null;
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function targetBounds(
  target: DecorationTargetSpec,
  layerGroups: readonly SceneNode[],
  scales: ScaleResolution,
  plot: PlotArea,
  datumVisible?: (
    layerId: string,
    rowIndex: number,
    datum: Readonly<Record<string, unknown>>,
  ) => boolean,
): TargetResolution {
  if (target.type === 'range') {
    const bounds = rangeBounds(target, scales, plot);
    return { bounds: bounds ?? { x: 0, y: 0, width: 0, height: 0 }, found: bounds !== null };
  }
  if (target.type === 'plot') {
    return {
      bounds: {
        x: plot.x + plot.width * target.x,
        y: plot.y + plot.height * target.y,
        width: plot.width * (target.width ?? 0),
        height: plot.height * (target.height ?? 0),
      },
      found: true,
    };
  }
  let bounds: Rect | null = null;
  for (const node of nodesForTarget(target, layerGroups))
    bounds = union(bounds, sceneNodeBounds(node));
  if (bounds === null && target.type === 'datum')
    bounds = fallbackDatumBounds(target, scales, datumVisible);
  return { bounds: bounds ?? { x: 0, y: 0, width: 0, height: 0 }, found: bounds !== null };
}

function highlightNodes(
  highlight: HighlightSpec,
  index: number,
  resolution: TargetResolution,
  theme: ThemeTokens,
  zIndex: number,
): readonly SceneNode[] {
  if (!resolution.found) return [];
  const padding = highlight.padding ?? 5;
  const bounds = resolution.bounds;
  const stroke = highlight.stroke ?? theme.colors.focus;
  const fill = highlight.fill ?? 'rgba(79,70,229,0.12)';
  const lineWidth = highlight.lineWidth ?? 2;
  const opacity = highlight.opacity ?? 1;
  const dash = [...(highlight.dash ?? [])];
  const id = highlight.id ?? `highlight-${index}`;
  if (bounds.width <= 2 && bounds.height <= 2) {
    return [
      {
        type: 'circle',
        ...nodeBase(`decoration:${id}`, { zIndex, opacity }),
        cx: bounds.x + bounds.width / 2,
        cy: bounds.y + bounds.height / 2,
        radius: highlight.radius ?? Math.max(7, padding + 3),
        fill,
        stroke,
        lineWidth,
      },
    ];
  }
  return [
    {
      type: 'rect',
      ...nodeBase(`decoration:${id}`, { zIndex, opacity }),
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: Math.max(1, bounds.width + padding * 2),
      height: Math.max(1, bounds.height + padding * 2),
      fill,
      stroke,
      lineWidth,
      cornerRadius: highlight.radius ?? 7,
      ...(dash.length === 0 ? {} : { dash }),
    },
  ];
}

function graphemes(text: string): readonly string[] {
  try {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(
      ({ segment }) => segment,
    );
  } catch {
    return Array.from(text);
  }
}

function graphemeWidth(value: string, fontSize: number): number {
  // Canvas cannot measure text during compilation, and a consumer may provide
  // a wider custom face than the built-in theme. Keep the estimates
  // deliberately conservative so wrapping happens before a glyph reaches the
  // content edge. The extra factor also covers bold title text and bearings.
  const customFontSafety = 1.08;
  if (/^\s+$/u.test(value)) return fontSize * 0.42 * customFontSafety;
  if (/\p{Extended_Pictographic}/u.test(value)) return fontSize * 1.25 * customFontSafety;
  if (/^[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]$/u.test(value))
    return fontSize * 1.08 * customFontSafety;
  if (/^[\p{Script=Arabic}\p{Script=Hebrew}]$/u.test(value))
    return fontSize * 0.92 * customFontSafety;
  if (/^[WM]$/u.test(value)) return fontSize * 1.05 * customFontSafety;
  if (/^[mw]$/u.test(value)) return fontSize * 0.94 * customFontSafety;
  if (/^[ilI1|!.,:;'`]$/u.test(value)) return fontSize * 0.48 * customFontSafety;
  if (/^[A-Z0-9]$/u.test(value)) return fontSize * 0.82 * customFontSafety;
  if (/^[a-z]$/u.test(value)) return fontSize * 0.72 * customFontSafety;
  return fontSize * customFontSafety;
}

function textWidth(text: string, fontSize: number): number {
  return graphemes(text).reduce((sum, value) => sum + graphemeWidth(value, fontSize), 0);
}

function ellipsizeLine(text: string, maxWidth: number, fontSize: number): string {
  const suffix = '…';
  if (textWidth(suffix, fontSize) > maxWidth) return '';
  const output = [...graphemes(text)];
  while (output.length > 0 && textWidth(`${output.join('')}${suffix}`, fontSize) > maxWidth)
    output.pop();
  return `${output.join('')}${suffix}`;
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines = 6,
): Readonly<{ lines: readonly string[]; truncated: boolean }> {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  let truncated = false;
  const pushLine = (): boolean => {
    if (line === '') return true;
    if (lines.length >= maxLines) {
      truncated = true;
      return false;
    }
    lines.push(line);
    line = '';
    return true;
  };
  outer: for (const word of words) {
    const combined = line === '' ? word : `${line} ${word}`;
    if (textWidth(combined, fontSize) <= maxWidth) {
      line = combined;
      continue;
    }
    if (!pushLine()) break;
    let chunk = '';
    for (const value of graphemes(word)) {
      if (chunk !== '' && textWidth(`${chunk}${value}`, fontSize) > maxWidth) {
        line = chunk;
        if (!pushLine()) break outer;
        chunk = '';
      }
      if (chunk === '' && graphemeWidth(value, fontSize) > maxWidth) {
        line = value;
        if (!pushLine()) break outer;
      } else {
        chunk += value;
      }
    }
    line = chunk;
  }
  if (line !== '') {
    if (lines.length < maxLines) lines.push(line);
    else truncated = true;
  }
  if (truncated && lines.length > 0)
    lines[lines.length - 1] = ellipsizeLine(lines[lines.length - 1]!, maxWidth, fontSize);
  return { lines, truncated };
}

function clippedBounds(bounds: Rect, clip: Rect): Rect | null {
  const x = Math.max(bounds.x, clip.x);
  const y = Math.max(bounds.y, clip.y);
  const endX = Math.min(bounds.x + bounds.width, clip.x + clip.width);
  const endY = Math.min(bounds.y + bounds.height, clip.y + clip.height);
  if (endX < x || endY < y) return null;
  return { x, y, width: Math.max(2, endX - x), height: Math.max(2, endY - y) };
}

function segmentObstacleBounds(
  start: Readonly<{ x: number; y: number }>,
  end: Readonly<{ x: number; y: number }>,
  lineWidth: number,
  plot: PlotArea,
): readonly Rect[] {
  const cellWidth = Math.max(1, plot.width / 12);
  const cellHeight = Math.max(1, plot.height / 8);
  const horizontalSpan = Math.abs(end.x - start.x) / cellWidth;
  const verticalSpan = Math.abs(end.y - start.y) / cellHeight;
  const stepCount = Math.max(
    1,
    Math.min(32, Math.ceil(Math.max(horizontalSpan, verticalSpan) * 2)),
  );
  const padding = Math.max(2, lineWidth / 2 + 1.25);
  const pieces: Rect[] = [];
  for (let step = 0; step < stepCount; step += 1) {
    const fromRatio = step / stepCount;
    const toRatio = (step + 1) / stepCount;
    const fromX = start.x + (end.x - start.x) * fromRatio;
    const fromY = start.y + (end.y - start.y) * fromRatio;
    const toX = start.x + (end.x - start.x) * toRatio;
    const toY = start.y + (end.y - start.y) * toRatio;
    pieces.push({
      x: Math.min(fromX, toX) - padding,
      y: Math.min(fromY, toY) - padding,
      width: Math.abs(toX - fromX) + padding * 2,
      height: Math.abs(toY - fromY) + padding * 2,
    });
  }
  return pieces;
}

function localObstacleBounds(node: SceneNode, plot: PlotArea): readonly Rect[] {
  if (node.type === 'line') {
    return segmentObstacleBounds(
      { x: node.x1, y: node.y1 },
      { x: node.x2, y: node.y2 },
      node.lineWidth,
      plot,
    );
  }
  if (node.type !== 'path') {
    const bounds = sceneNodeBounds(node);
    return bounds === null ? [] : [bounds];
  }
  const pieces: Rect[] = [];
  for (const points of [node.points, ...(node.subpaths ?? [])]) {
    if (points.length === 1) {
      const point = points[0]!;
      const radius = Math.max(2, node.lineWidth / 2 + 1.25);
      pieces.push({
        x: point.x - radius,
        y: point.y - radius,
        width: radius * 2,
        height: radius * 2,
      });
      continue;
    }
    for (let index = 1; index < points.length; index += 1) {
      pieces.push(
        ...segmentObstacleBounds(points[index - 1]!, points[index]!, node.lineWidth, plot),
      );
    }
    if (node.closed && points.length > 2)
      pieces.push(...segmentObstacleBounds(points.at(-1)!, points[0]!, node.lineWidth, plot));
  }
  return pieces;
}

function dataObstacleBounds(layerGroups: readonly SceneNode[], plot: PlotArea): readonly Rect[] {
  const columns = 12;
  const rows = 8;
  const buckets = new Map<number, { bounds: Rect; count: number }>();
  for (const node of layerGroups.flatMap((layer) => descendants(layer))) {
    for (const bounds of localObstacleBounds(node, plot)) {
      const clipped = clippedBounds(bounds, plot);
      if (clipped === null) continue;
      const centerX = clipped.x + clipped.width / 2;
      const centerY = clipped.y + clipped.height / 2;
      const column = Math.max(
        0,
        Math.min(columns - 1, Math.floor(((centerX - plot.x) / Math.max(1, plot.width)) * columns)),
      );
      const row = Math.max(
        0,
        Math.min(rows - 1, Math.floor(((centerY - plot.y) / Math.max(1, plot.height)) * rows)),
      );
      const key = row * columns + column;
      const prior = buckets.get(key);
      buckets.set(key, {
        bounds: union(prior?.bounds ?? null, clipped) ?? clipped,
        count: (prior?.count ?? 0) + 1,
      });
    }
  }
  return [...buckets.values()].flatMap(({ bounds, count }) =>
    Array.from({ length: Math.min(8, Math.max(1, Math.ceil(Math.log2(count + 1)))) }, () => bounds),
  );
}

function controlStripBounds(spec: NormalizedChartSpec, width: number): Rect | null {
  const controls = spec.interaction.controls;
  if (controls === false) return null;
  const buttonSize = width <= 560 ? 44 : 28;
  const height = width <= 560 ? 44 : 30;
  const buttonCount =
    (controls.zoom ? 2 : 0) +
    (controls.reset ? 1 : 0) +
    (controls.fullscreen ? 1 : 0) +
    (controls.export ? 1 : 0) +
    (controls.annotations ? 1 : 0) +
    (controls.playback ? 4 : 0);
  if (buttonCount === 0) return null;
  const navigationGroup = controls.zoom || controls.reset;
  const utilityGroup = controls.fullscreen || controls.export || controls.annotations;
  const separators =
    (navigationGroup && (utilityGroup || controls.playback) ? 1 : 0) +
    (utilityGroup && controls.playback ? 1 : 0);
  const stripWidth = Math.min(
    Math.max(1, width - 12),
    buttonCount * buttonSize + separators * 5 + 2,
  );
  return { x: Math.max(0, width - stripWidth - 6), y: 6, width: stripWidth, height };
}

function annotationNodes(
  annotation: AnnotationSpec,
  index: number,
  resolution: TargetResolution,
  plot: PlotArea,
  theme: ThemeTokens,
  locale: string | undefined,
  dataObstacles: readonly CalloutRect[],
  protectedObstacles: readonly CalloutRect[],
  occupiedCallouts: readonly CalloutRect[],
): AnnotationNodesResult {
  if (!resolution.found) return { nodes: [], bounds: null };
  const style = annotation.style ?? {};
  const availableWidth = Math.max(1, plot.width);
  const availableHeight = Math.max(1, plot.height);
  const maxWidth = Math.min(style.maxWidth ?? 220, availableWidth);
  const padding = Math.min(
    style.padding ?? 10,
    Math.max(0, Math.min(maxWidth / 5, availableHeight / 6)),
  );
  const fontSize = Math.min(
    style.fontSize ?? 12,
    Math.max(1, Math.min(maxWidth / 3, availableHeight / 3)),
  );
  const detailFontSize = Math.max(1, fontSize - 1);
  const maximumContentWidth = Math.max(1, maxWidth - padding * 2);
  const glyphGuard = Math.min(maximumContentWidth / 4, Math.max(0.75, fontSize * 0.12));
  const wrappingWidth = Math.max(1, maximumContentWidth - glyphGuard * 2);
  const wrappedTitle = wrapText(annotation.text, wrappingWidth, fontSize);
  const wrappedDetail =
    annotation.detail === undefined
      ? { lines: [], truncated: false }
      : wrapText(annotation.detail, wrappingWidth, detailFontSize);
  let titleLines = wrappedTitle.lines;
  let detailLines = wrappedDetail.lines;
  const lineHeight = fontSize * 1.35;
  const detailLineHeight = detailFontSize * 1.35;
  const lineBudget = Math.max(1, Math.floor((availableHeight - padding * 2) / detailLineHeight));
  titleLines = titleLines.slice(0, Math.max(1, Math.min(titleLines.length, lineBudget)));
  detailLines = detailLines.slice(0, Math.max(0, lineBudget - titleLines.length));
  const ellipsizeLast = (
    lines: readonly string[],
    truncated: boolean,
    lineFontSize: number,
  ): readonly string[] => {
    if (!truncated || lines.length === 0) return lines;
    const last = lines[lines.length - 1]!;
    return [
      ...lines.slice(0, -1),
      last.endsWith('…') ? last : ellipsizeLine(last, wrappingWidth, lineFontSize),
    ];
  };
  titleLines = ellipsizeLast(
    titleLines,
    wrappedTitle.truncated || titleLines.length < wrappedTitle.lines.length,
    fontSize,
  );
  detailLines = ellipsizeLast(
    detailLines,
    wrappedDetail.truncated || detailLines.length < wrappedDetail.lines.length,
    detailFontSize,
  );
  const longestWidth = Math.max(
    fontSize * 4,
    ...titleLines.map((line) => textWidth(line, fontSize)),
    ...detailLines.map((line) => textWidth(line, detailFontSize)),
  );
  const width = Math.min(
    maxWidth,
    Math.max(Math.min(96, maxWidth), longestWidth + padding * 2 + glyphGuard * 2),
  );
  const height = Math.min(
    availableHeight,
    padding * 2 +
      titleLines.length * lineHeight +
      detailLines.length * detailLineHeight +
      (detailLines.length > 0 ? 4 : 0),
  );
  const target = resolution.bounds;
  const anchor = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const placed = placeCallout({
    target,
    width,
    height,
    boundary: plot,
    placement: annotation.placement ?? 'auto',
    offsetX: annotation.offsetX ?? 0,
    offsetY: annotation.offsetY ?? 0,
    dataObstacles,
    protectedObstacles,
    occupiedCallouts,
  });
  const { x, y } = placed;
  const id = annotation.id ?? `annotation-${index}`;
  const bubbleCenter = { x: x + width / 2, y: y + height / 2 };
  const connector = typeof annotation.connector === 'object' ? annotation.connector : {};
  const connectorVisible =
    typeof annotation.connector === 'boolean' ? annotation.connector : (connector.visible ?? true);
  const nodes: SceneNode[] = [];
  const textNodes: SceneNode[] = [];
  const rtl = locale !== undefined && /^(ar|fa|he|ur)(?:-|$)/i.test(locale);
  const logicalAlign = style.align ?? 'start';
  const textAlign: CanvasTextAlign =
    logicalAlign === 'center'
      ? 'center'
      : logicalAlign === 'start'
        ? rtl
          ? 'right'
          : 'left'
        : rtl
          ? 'left'
          : 'right';
  const textX =
    logicalAlign === 'center'
      ? x + width / 2
      : textAlign === 'right'
        ? x + width - padding - glyphGuard
        : x + padding + glyphGuard;
  if (connectorVisible) {
    nodes.push({
      type: 'line',
      ...nodeBase(`annotation:${id}:connector`, { zIndex: 700 }),
      x1: anchor.x,
      y1: anchor.y,
      x2: bubbleCenter.x,
      y2: bubbleCenter.y,
      stroke: connector.color ?? style.border ?? theme.colors.focus,
      lineWidth: connector.width ?? 1.5,
      dash: [...(connector.dash ?? [])],
      lineCap: 'round',
    });
  }
  nodes.push({
    type: 'rect',
    ...nodeBase(`annotation:${id}:bubble`, { zIndex: 701, opacity: style.opacity ?? 0.97 }),
    x,
    y,
    width,
    height,
    fill: style.background ?? theme.colors.surface,
    stroke: style.border ?? theme.colors.focus,
    lineWidth: 1.25,
    cornerRadius: 9,
  });
  let textY = y + padding;
  for (const [lineIndex, text] of titleLines.entries()) {
    const node: TextNode = {
      type: 'text',
      ...nodeBase(`annotation:${id}:title:${lineIndex}`, { zIndex: 702 }),
      x: textX,
      y: textY,
      text,
      fill: style.color ?? theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize,
      fontWeight: 700,
      align: textAlign,
      baseline: 'top',
      rotation: 0,
    };
    textNodes.push(node);
    textY += lineHeight;
  }
  if (detailLines.length > 0) textY += 4;
  for (const [lineIndex, text] of detailLines.entries()) {
    textNodes.push({
      type: 'text',
      ...nodeBase(`annotation:${id}:detail:${lineIndex}`, { zIndex: 702 }),
      x: textX,
      y: textY,
      text,
      fill: style.color ?? theme.colors.mutedText,
      fontFamily: theme.typography.fontFamily,
      fontSize: detailFontSize,
      fontWeight: 400,
      align: textAlign,
      baseline: 'top',
      rotation: 0,
    });
    textY += detailLineHeight;
  }
  if (textNodes.length > 0)
    nodes.push(
      group(`annotation:${id}:content`, textNodes, {
        zIndex: 702,
        clip: {
          x: x + padding,
          y: y + padding,
          width: Math.max(0, width - padding * 2),
          height: Math.max(0, height - padding * 2),
        },
      }),
    );
  return { nodes, bounds: placed.bounds };
}

export function compileDecorations(options: {
  readonly spec: NormalizedChartSpec;
  readonly layerGroups: readonly SceneNode[];
  readonly scales: ScaleResolution;
  readonly plot: PlotArea;
  readonly theme: ThemeTokens;
  readonly width: number;
  readonly legendBounds?: Rect;
  readonly runtime?: DecorationRuntimeState;
  readonly datumVisible?: (
    layerId: string,
    rowIndex: number,
    datum: Readonly<Record<string, unknown>>,
  ) => boolean;
}): { readonly underlay: readonly SceneNode[]; readonly overlay: readonly SceneNode[] } {
  const underlay: SceneNode[] = [];
  const overlay: SceneNode[] = [];
  options.spec.highlights.forEach((highlight, index) => {
    const resolution = targetBounds(
      highlight.target,
      options.layerGroups,
      options.scales,
      options.plot,
      options.datumVisible,
    );
    const nodes = highlightNodes(
      highlight,
      index,
      resolution,
      options.theme,
      highlight.target.type === 'range' || highlight.target.type === 'plot' ? -200 : 600,
    );
    if (highlight.target.type === 'range' || highlight.target.type === 'plot')
      underlay.push(...nodes);
    else overlay.push(...nodes);
  });
  if (options.spec.interaction.selection !== false) {
    const selectionStyle: HighlightStyleSpec = options.spec.interaction.selection.highlight;
    for (const [index, target] of (options.runtime?.selection ?? []).entries()) {
      const resolution = targetBounds(
        target,
        options.layerGroups,
        options.scales,
        options.plot,
        options.datumVisible,
      );
      overlay.push(
        ...highlightNodes(
          { id: `selection-${index}`, target, ...selectionStyle },
          index,
          resolution,
          options.theme,
          650,
        ),
      );
    }
  }
  const annotations = options.runtime?.annotations ?? options.spec.annotations;
  if (options.runtime?.annotationsVisible === false)
    return {
      underlay:
        underlay.length === 0
          ? []
          : [group('decorations:underlay', underlay, { zIndex: -200, clip: options.plot })],
      overlay: overlay.length === 0 ? [] : [group('decorations:overlay', overlay, { zIndex: 600 })],
    };
  const dataObstacles = dataObstacleBounds(options.layerGroups, options.plot);
  const protectedObstacles = [
    options.legendBounds,
    controlStripBounds(options.spec, options.width),
  ].filter((bounds): bounds is Rect => bounds !== undefined && bounds !== null);
  const occupiedCallouts: Rect[] = [];
  annotations.forEach((annotation, index) => {
    const resolution = targetBounds(
      annotation.target,
      options.layerGroups,
      options.scales,
      options.plot,
      options.datumVisible,
    );
    const compiled = annotationNodes(
      annotation,
      index,
      resolution,
      options.plot,
      options.theme,
      options.spec.locale,
      dataObstacles,
      protectedObstacles,
      occupiedCallouts,
    );
    overlay.push(...compiled.nodes);
    if (compiled.bounds !== null) occupiedCallouts.push(compiled.bounds);
  });
  return {
    underlay:
      underlay.length === 0
        ? []
        : [group('decorations:underlay', underlay, { zIndex: -200, clip: options.plot })],
    overlay: overlay.length === 0 ? [] : [group('decorations:overlay', overlay, { zIndex: 600 })],
  };
}
