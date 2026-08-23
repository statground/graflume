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

export interface DecorationRuntimeState {
  readonly annotations?: readonly AnnotationSpec[];
  readonly selection?: readonly DatumTargetSpec[];
}

interface TargetResolution {
  readonly bounds: Rect;
  readonly found: boolean;
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
        typeof xValue === 'boolean' ||
        yValue === undefined ||
        yValue === null ||
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

function wrapText(text: string, maxWidth: number, fontSize: number): readonly string[] {
  const maxCharacters = Math.max(1, Math.floor(maxWidth / Math.max(1, fontSize * 0.58)));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line === '' ? word : `${line} ${word}`;
    if (next.length <= maxCharacters) line = next;
    else {
      if (line !== '') lines.push(line);
      const graphemes = (() => {
        try {
          return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)].map(
            ({ segment }) => segment,
          );
        } catch {
          return Array.from(word);
        }
      })();
      line =
        graphemes.length <= maxCharacters
          ? word
          : maxCharacters === 1
            ? '…'
            : `${graphemes.slice(0, maxCharacters - 1).join('')}…`;
    }
    if (lines.length >= 5) break;
  }
  if (line !== '' && lines.length < 6) lines.push(line);
  return lines;
}

function annotationNodes(
  annotation: AnnotationSpec,
  index: number,
  resolution: TargetResolution,
  plot: PlotArea,
  theme: ThemeTokens,
  locale: string | undefined,
): readonly SceneNode[] {
  if (!resolution.found) return [];
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
  let titleLines = wrapText(annotation.text, maxWidth - padding * 2, fontSize);
  let detailLines =
    annotation.detail === undefined
      ? []
      : wrapText(annotation.detail, maxWidth - padding * 2, detailFontSize);
  const lineHeight = fontSize * 1.35;
  const detailLineHeight = detailFontSize * 1.35;
  const lineBudget = Math.max(1, Math.floor((availableHeight - padding * 2) / detailLineHeight));
  titleLines = titleLines.slice(0, Math.max(1, Math.min(titleLines.length, lineBudget)));
  detailLines = detailLines.slice(0, Math.max(0, lineBudget - titleLines.length));
  const ellipsizeLast = (lines: readonly string[], truncated: boolean): readonly string[] => {
    if (!truncated || lines.length === 0) return lines;
    const last = lines[lines.length - 1]!;
    return [...lines.slice(0, -1), last.endsWith('…') ? last : `${last}…`];
  };
  titleLines = ellipsizeLast(titleLines, titleLines.join(' ').length < annotation.text.length);
  detailLines = ellipsizeLast(
    detailLines,
    annotation.detail !== undefined && detailLines.join(' ').length < annotation.detail.length,
  );
  const longest = Math.max(8, ...[...titleLines, ...detailLines].map((line) => line.length));
  const width = Math.min(
    maxWidth,
    Math.max(Math.min(96, maxWidth), longest * fontSize * 0.58 + padding * 2),
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
  const placement =
    annotation.placement === undefined || annotation.placement === 'auto'
      ? anchor.x < plot.x + plot.width / 2
        ? 'right'
        : 'left'
      : annotation.placement;
  const gap = 18;
  let x = anchor.x - width / 2;
  let y = anchor.y - height / 2;
  if (placement === 'top') y = target.y - height - gap;
  if (placement === 'bottom') y = target.y + target.height + gap;
  if (placement === 'left') x = target.x - width - gap;
  if (placement === 'right') x = target.x + target.width + gap;
  x += annotation.offsetX ?? 0;
  y += annotation.offsetY ?? 0;
  x = Math.max(plot.x, Math.min(plot.x + plot.width - width, x));
  y = Math.max(plot.y, Math.min(plot.y + plot.height - height, y));
  const id = annotation.id ?? `annotation-${index}`;
  const bubbleCenter = { x: x + width / 2, y: y + height / 2 };
  const connector = typeof annotation.connector === 'object' ? annotation.connector : {};
  const connectorVisible =
    typeof annotation.connector === 'boolean' ? annotation.connector : (connector.visible ?? true);
  const nodes: SceneNode[] = [];
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
        ? x + width - padding
        : x + padding;
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
    nodes.push(node);
    textY += lineHeight;
  }
  if (detailLines.length > 0) textY += 4;
  for (const [lineIndex, text] of detailLines.entries()) {
    nodes.push({
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
  return nodes;
}

export function compileDecorations(options: {
  readonly spec: NormalizedChartSpec;
  readonly layerGroups: readonly SceneNode[];
  readonly scales: ScaleResolution;
  readonly plot: PlotArea;
  readonly theme: ThemeTokens;
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
  annotations.forEach((annotation, index) => {
    const resolution = targetBounds(
      annotation.target,
      options.layerGroups,
      options.scales,
      options.plot,
      options.datumVisible,
    );
    overlay.push(
      ...annotationNodes(
        annotation,
        index,
        resolution,
        options.plot,
        options.theme,
        options.spec.locale,
      ),
    );
  });
  return {
    underlay:
      underlay.length === 0
        ? []
        : [group('decorations:underlay', underlay, { zIndex: -200, clip: options.plot })],
    overlay: overlay.length === 0 ? [] : [group('decorations:overlay', overlay, { zIndex: 600 })],
  };
}
