import type {
  CompiledSpatialScene,
  SpatialAnnotationSpec,
  SpatialDatumTargetSpec,
  SpatialDecorationTargetSpec,
  SpatialHighlightSpec,
  SpatialVec3,
} from './types.js';
import type { HighlightStyleSpec } from '../spec/types.js';
import { placeCallout, type CalloutRect } from '../interaction/callout-placement.js';
import { colorWithOpacity } from '../theme/color.js';
import type { ThemeTokens } from '../theme/types.js';

export interface SpatialLegendOverlayItem {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly visible: boolean;
  readonly toggleable: boolean;
  readonly symbol: 'line' | 'point' | 'rect';
  readonly layerId?: string;
  readonly value?: import('../spec/types.js').JsonPrimitive;
}

export interface SpatialLegendOverlayState {
  readonly visible: boolean;
  readonly title?: string;
  readonly position:
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'inside-top-left'
    | 'inside-top-right'
    | 'inside-bottom-left'
    | 'inside-bottom-right';
  readonly orientation: 'horizontal' | 'vertical';
  readonly mode: 'layers' | 'categories' | 'continuous';
  readonly showLabel: string;
  readonly hideLabel: string;
  readonly items: readonly SpatialLegendOverlayItem[];
  readonly continuousColors?: readonly string[];
}

export interface SpatialOverlayState {
  readonly scene: CompiledSpatialScene;
  readonly width: number;
  readonly height: number;
  readonly plotBounds: ScreenBounds;
  readonly controlBounds?: ScreenBounds;
  readonly hiddenLayerIds: ReadonlySet<string>;
  readonly legend: SpatialLegendOverlayState | null;
  readonly highlights: readonly SpatialHighlightSpec[];
  readonly selection: readonly SpatialDatumTargetSpec[];
  readonly selectionEnabled: boolean;
  readonly selectionHighlight: HighlightStyleSpec;
  readonly annotations: readonly SpatialAnnotationSpec[];
  readonly annotationsVisible: boolean;
  readonly selectionLabel: string;
}

export interface SpatialOverlayActions {
  readonly project: (
    position: SpatialVec3,
    pick?: CompiledSpatialScene['geometries'][number]['picks'][number],
  ) => Readonly<{ x: number; y: number; depth: number; visible: boolean }> | null;
  readonly setLegendVisible: (id: string, visible: boolean) => void;
}

export interface ScreenBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function scalarEqual(left: unknown, right: unknown): boolean {
  return left === right;
}

function datumMatches(
  target: SpatialDatumTargetSpec,
  pick: CompiledSpatialScene['geometries'][number]['picks'][number],
): boolean {
  if (target.layerId !== undefined && target.layerId !== pick.layerId) return false;
  if (target.datumIndex !== undefined) {
    const indices = Array.isArray(target.datumIndex) ? target.datumIndex : [target.datumIndex];
    if (!indices.includes(pick.datumIndex)) return false;
  }
  if (target.field !== undefined) {
    const candidate = pick.datum[target.field];
    if (target.values !== undefined)
      return target.values.some((value) => scalarEqual(candidate, value));
    return scalarEqual(candidate, target.value);
  }
  return true;
}

function boxCorners(min: SpatialVec3, max: SpatialVec3): readonly SpatialVec3[] {
  return [
    [min[0], min[1], min[2]],
    [min[0], min[1], max[2]],
    [min[0], max[1], min[2]],
    [min[0], max[1], max[2]],
    [max[0], min[1], min[2]],
    [max[0], min[1], max[2]],
    [max[0], max[1], min[2]],
    [max[0], max[1], max[2]],
  ];
}

interface TargetPosition {
  readonly position: SpatialVec3;
  readonly pick?: CompiledSpatialScene['geometries'][number]['picks'][number];
}

function targetPositions(
  target: SpatialDecorationTargetSpec,
  state: SpatialOverlayState,
): readonly TargetPosition[] {
  if (target.type === 'point') return [{ position: target.position }];
  if (target.type === 'box')
    return boxCorners(target.min, target.max).map((position) => ({ position }));
  const picks = state.scene.geometries.flatMap((geometry) => geometry.picks);
  if (target.type === 'layer') {
    if (state.hiddenLayerIds.has(target.layerId)) return [];
    return picks
      .filter((pick) => pick.layerId === target.layerId)
      .map((pick) => ({ position: pick.position, pick }));
  }
  return picks
    .filter((pick) => !state.hiddenLayerIds.has(pick.layerId) && datumMatches(target, pick))
    .map((pick) => ({ position: pick.position, pick }));
}

function targetBounds(
  target: SpatialDecorationTargetSpec,
  state: SpatialOverlayState,
  actions: SpatialOverlayActions,
): ScreenBounds | null {
  const points = targetPositions(target, state)
    .map(({ position, pick }) => actions.project(position, pick))
    .filter(
      (point): point is NonNullable<ReturnType<SpatialOverlayActions['project']>> =>
        point !== null && point.visible,
    );
  if (points.length === 0) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(0, Math.max(...xs) - x),
    height: Math.max(0, Math.max(...ys) - y),
  };
}

function projectedDataObstacles(
  state: SpatialOverlayState,
  actions: SpatialOverlayActions,
): readonly ScreenBounds[] {
  const geometries = state.scene.geometries.filter((geometry) => geometry.picks.length > 0);
  const budgetPerGeometry = Math.max(1, Math.floor(384 / Math.max(1, geometries.length)));
  const columns = 12;
  const rows = 8;
  const buckets = new Map<number, ScreenBounds>();
  for (const geometry of geometries) {
    const stride = Math.max(1, Math.ceil(geometry.picks.length / budgetPerGeometry));
    for (let index = 0; index < geometry.picks.length; index += stride) {
      const pick = geometry.picks[index]!;
      if (state.hiddenLayerIds.has(pick.layerId)) continue;
      const point = actions.project(pick.position, pick);
      if (point === null || !point.visible) continue;
      const bounds = { x: point.x - 4, y: point.y - 4, width: 8, height: 8 };
      const column = Math.max(
        0,
        Math.min(
          columns - 1,
          Math.floor(
            ((point.x - state.plotBounds.x) / Math.max(1, state.plotBounds.width)) * columns,
          ),
        ),
      );
      const row = Math.max(
        0,
        Math.min(
          rows - 1,
          Math.floor(
            ((point.y - state.plotBounds.y) / Math.max(1, state.plotBounds.height)) * rows,
          ),
        ),
      );
      const key = row * columns + column;
      const prior = buckets.get(key);
      if (prior === undefined) {
        buckets.set(key, bounds);
        continue;
      }
      const x = Math.min(prior.x, bounds.x);
      const y = Math.min(prior.y, bounds.y);
      const endX = Math.max(prior.x + prior.width, bounds.x + bounds.width);
      const endY = Math.max(prior.y + prior.height, bounds.y + bounds.height);
      buckets.set(key, { x, y, width: endX - x, height: endY - y });
    }
  }
  return [...buckets.values()];
}

function applyHighlightStyle(
  element: HTMLDivElement,
  highlight: SpatialHighlightSpec,
  bounds: ScreenBounds,
  theme: ThemeTokens,
): void {
  const padding = highlight.padding ?? 5;
  const point = bounds.width <= 2 && bounds.height <= 2;
  const radius = point ? (highlight.radius ?? Math.max(7, padding + 3)) : 0;
  element.style.position = 'absolute';
  element.style.left = `${bounds.x - (point ? radius : padding)}px`;
  element.style.top = `${bounds.y - (point ? radius : padding)}px`;
  element.style.width = `${Math.max(1, point ? radius * 2 : bounds.width + padding * 2)}px`;
  element.style.height = `${Math.max(1, point ? radius * 2 : bounds.height + padding * 2)}px`;
  element.style.boxSizing = 'border-box';
  element.style.border = `${highlight.lineWidth ?? 2}px ${highlight.dash?.length ? 'dashed' : 'solid'} ${highlight.stroke ?? theme.colors.focus}`;
  element.style.borderRadius = point ? '999px' : `${highlight.radius ?? 7}px`;
  element.style.background = highlight.fill ?? colorWithOpacity(theme.colors.focus, 0.12);
  element.style.opacity = String(highlight.opacity ?? 1);
}

function connector(
  from: Readonly<{ x: number; y: number }>,
  to: Readonly<{ x: number; y: number }>,
  annotation: SpatialAnnotationSpec,
  theme: ThemeTokens,
): HTMLDivElement | null {
  const configured = typeof annotation.connector === 'object' ? annotation.connector : {};
  const visible =
    typeof annotation.connector === 'boolean' ? annotation.connector : (configured.visible ?? true);
  if (!visible) return null;
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const line = document.createElement('div');
  line.dataset.graflumeSpatialAnnotationConnector = annotation.id ?? 'true';
  line.style.position = 'absolute';
  line.style.left = `${from.x}px`;
  line.style.top = `${from.y}px`;
  line.style.width = `${length}px`;
  line.style.height = '0';
  line.style.borderTop = `${configured.width ?? 1.5}px ${configured.dash?.length ? 'dashed' : 'solid'} ${configured.color ?? annotation.style?.border ?? theme.colors.focus}`;
  line.style.transformOrigin = '0 0';
  line.style.transform = `rotate(${Math.atan2(to.y - from.y, to.x - from.x)}rad)`;
  return line;
}

interface PreparedAnnotation {
  readonly annotation: SpatialAnnotationSpec;
  readonly bounds: ScreenBounds;
  readonly bubble: HTMLDivElement;
  readonly title: HTMLDivElement;
  readonly detail?: HTMLDivElement;
  readonly fontSize: number;
  readonly padding: number;
  readonly availableWidth: number;
  readonly availableHeight: number;
  readonly fallbackWidth: number;
  readonly fallbackHeight: number;
  readonly measurementKey: string;
}

function prepareAnnotation(
  annotation: SpatialAnnotationSpec,
  bounds: ScreenBounds,
  state: SpatialOverlayState,
): PreparedAnnotation {
  const style = annotation.style ?? {};
  const availableWidth = Math.max(1, state.plotBounds.width - 8);
  const availableHeight = Math.max(1, state.plotBounds.height - 8);
  const maxWidth = Math.min(style.maxWidth ?? 220, availableWidth);
  const padding = Math.min(
    style.padding ?? 10,
    Math.max(0, Math.min(maxWidth / 5, availableHeight / 6)),
  );
  const fontSize = Math.min(
    style.fontSize ?? state.scene.theme.typography.fontSize,
    Math.max(1, Math.min(maxWidth / 3, availableHeight / 3)),
  );
  const bubble = document.createElement('div');
  bubble.dataset.graflumeSpatialAnnotation = annotation.id ?? 'true';
  bubble.setAttribute('role', 'note');
  bubble.setAttribute(
    'aria-label',
    annotation.detail === undefined ? annotation.text : `${annotation.text}: ${annotation.detail}`,
  );
  bubble.dir = 'auto';
  bubble.style.position = 'absolute';
  bubble.style.zIndex = '3';
  bubble.style.maxWidth = `${maxWidth}px`;
  bubble.style.maxHeight = `${availableHeight}px`;
  bubble.style.padding = `${padding}px`;
  bubble.style.boxSizing = 'border-box';
  bubble.style.border = `1.25px solid ${style.border ?? state.scene.theme.colors.focus}`;
  bubble.style.borderRadius = '9px';
  bubble.style.background = style.background ?? state.scene.theme.colors.background;
  bubble.style.color = style.color ?? state.scene.theme.colors.text;
  bubble.style.opacity = String(style.opacity ?? 0.97);
  bubble.style.font = `700 ${fontSize}px/1.35 ${state.scene.theme.typography.fontFamily}`;
  bubble.style.textAlign = style.align ?? 'start';
  bubble.style.overflowWrap = 'anywhere';
  bubble.style.wordBreak = 'break-word';
  bubble.style.hyphens = 'auto';
  bubble.style.pointerEvents = 'none';
  const title = document.createElement('div');
  title.textContent = annotation.text;
  title.style.overflowWrap = 'anywhere';
  title.style.wordBreak = 'break-word';
  bubble.append(title);
  let detail: HTMLDivElement | undefined;
  if (annotation.detail !== undefined) {
    detail = document.createElement('div');
    detail.textContent = annotation.detail;
    detail.style.marginBlockStart = '4px';
    detail.style.fontWeight = '400';
    detail.style.color = style.color ?? state.scene.theme.colors.mutedText;
    detail.style.overflowWrap = 'anywhere';
    detail.style.wordBreak = 'break-word';
    bubble.append(detail);
  }
  const longestText = Math.max(annotation.text.length, annotation.detail?.length ?? 0, 8);
  const fallbackWidth = Math.min(
    maxWidth,
    Math.max(Math.min(72, maxWidth), longestText * fontSize * 0.58 + padding * 2),
  );
  bubble.style.width = `${fallbackWidth}px`;
  bubble.style.visibility = 'hidden';
  bubble.style.left = '0';
  bubble.style.top = '0';
  const fallbackLines = Math.max(
    1,
    Math.ceil(
      (annotation.text.length + (annotation.detail?.length ?? 0)) /
        Math.max(8, Math.floor(fallbackWidth / (fontSize * 0.58))),
    ),
  );
  const fallbackHeight =
    padding * 2 + fallbackLines * fontSize * 1.35 + (annotation.detail === undefined ? 0 : 4);
  return {
    annotation,
    bounds,
    bubble,
    title,
    ...(detail === undefined ? {} : { detail }),
    fontSize,
    padding,
    availableWidth,
    availableHeight,
    fallbackWidth,
    fallbackHeight,
    measurementKey: JSON.stringify([
      annotation.text,
      annotation.detail ?? null,
      annotation.style ?? null,
      state.width,
      state.height,
      state.plotBounds.x,
      state.plotBounds.y,
      state.plotBounds.width,
      state.plotBounds.height,
    ]),
  };
}

function placeAnnotation(
  prepared: PreparedAnnotation,
  state: SpatialOverlayState,
  measured: Readonly<{ width: number; height: number }>,
  dataObstacles: readonly CalloutRect[],
  protectedObstacles: readonly CalloutRect[],
  occupiedCallouts: readonly CalloutRect[],
): Readonly<{ elements: readonly HTMLElement[]; bounds: ScreenBounds }> {
  const { annotation, bounds, bubble } = prepared;
  const estimatedWidth = Math.min(
    prepared.availableWidth,
    measured.width > 0 ? measured.width : prepared.fallbackWidth,
  );
  const estimatedHeight = Math.min(
    prepared.availableHeight,
    measured.height > 0 ? measured.height : prepared.fallbackHeight,
  );
  bubble.style.visibility = 'visible';
  bubble.style.overflow = 'hidden';
  bubble.style.maxHeight = `${estimatedHeight}px`;
  bubble.style.maxBlockSize = `${estimatedHeight}px`;
  const detailGap = prepared.detail === undefined ? 0 : 4;
  const lineHeight = prepared.fontSize * 1.35;
  const lineBudget = Math.max(
    1,
    Math.floor((estimatedHeight - prepared.padding * 2 - detailGap) / Math.max(1, lineHeight)),
  );
  const titleLines =
    prepared.detail === undefined || lineBudget < 2
      ? lineBudget
      : Math.max(1, Math.min(2, lineBudget - 1));
  const clampLines = (element: HTMLDivElement, lines: number): void => {
    element.style.display = '-webkit-box';
    element.style.webkitBoxOrient = 'vertical';
    element.style.webkitLineClamp = String(Math.max(1, lines));
    element.style.overflow = 'hidden';
    element.style.overflowWrap = 'anywhere';
    element.style.wordBreak = 'break-word';
  };
  clampLines(prepared.title, titleLines);
  if (prepared.detail !== undefined) {
    if (lineBudget < 2) prepared.detail.style.display = 'none';
    else clampLines(prepared.detail, Math.max(1, lineBudget - titleLines));
  }
  const anchor = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const marginX = Math.min(4, Math.max(0, (state.plotBounds.width - estimatedWidth) / 2));
  const marginY = Math.min(4, Math.max(0, (state.plotBounds.height - estimatedHeight) / 2));
  const placed = placeCallout({
    target: bounds,
    width: estimatedWidth,
    height: estimatedHeight,
    boundary: {
      x: state.plotBounds.x + marginX,
      y: state.plotBounds.y + marginY,
      width: Math.max(1, state.plotBounds.width - marginX * 2),
      height: Math.max(1, state.plotBounds.height - marginY * 2),
    },
    placement: annotation.placement ?? 'auto',
    offsetX: annotation.offsetX ?? 0,
    offsetY: annotation.offsetY ?? 0,
    dataObstacles,
    protectedObstacles,
    occupiedCallouts,
  });
  const { x, y } = placed;
  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;
  const line = connector(
    anchor,
    { x: x + estimatedWidth / 2, y: y + estimatedHeight / 2 },
    annotation,
    state.scene.theme,
  );
  return {
    elements: line === null ? [bubble] : [line, bubble],
    bounds: placed.bounds,
  };
}

function externalLegendBounds(
  position: 'top' | 'right' | 'bottom' | 'left',
  state: SpatialOverlayState,
): ScreenBounds {
  const plot = state.plotBounds;
  if (position === 'top') return { x: 0, y: 0, width: state.width, height: plot.y };
  if (position === 'bottom') {
    const y = plot.y + plot.height;
    return { x: 0, y, width: state.width, height: Math.max(0, state.height - y) };
  }
  if (position === 'left') return { x: 0, y: 0, width: plot.x, height: state.height };
  const x = plot.x + plot.width;
  return { x, y: 0, width: Math.max(0, state.width - x), height: state.height };
}

function insideLegendBounds(state: SpatialOverlayState): ScreenBounds | null {
  const legend = state.legend;
  if (legend === null || !legend.visible || !legend.position.startsWith('inside-')) return null;
  const plot = state.plotBounds;
  const inset = 8;
  const titleHeight = legend.title === undefined ? 0 : 24;
  const itemWidths = legend.items.map((item) => Math.max(64, item.label.length * 7 + 30));
  let width: number;
  let height: number;
  if (legend.orientation === 'horizontal') {
    width = Math.min(
      Math.max(1, plot.width - inset * 2),
      Math.max(150, itemWidths.reduce((a, b) => a + b, 0) + 20),
    );
    const availableRowWidth = Math.max(1, width - 20);
    let rows = 1;
    let rowWidth = 0;
    for (const itemWidth of itemWidths) {
      if (rowWidth > 0 && rowWidth + itemWidth > availableRowWidth) {
        rows += 1;
        rowWidth = 0;
      }
      rowWidth += itemWidth;
    }
    height = Math.min(Math.max(1, plot.height - inset * 2), titleHeight + rows * 24 + 16);
  } else {
    width = Math.min(
      Math.max(1, plot.width - inset * 2),
      Math.min(220, Math.max(96, ...itemWidths) + 20),
    );
    height = Math.min(
      Math.max(1, plot.height - inset * 2),
      titleHeight + Math.max(1, legend.items.length) * 24 + 16,
    );
  }
  const right = legend.position.endsWith('right');
  const bottom = legend.position.includes('bottom');
  return {
    x: right ? plot.x + plot.width - width - inset : plot.x + inset,
    y: bottom ? plot.y + plot.height - height - inset : plot.y + inset,
    width,
    height,
  };
}

function legendPosition(
  element: HTMLDivElement,
  legend: SpatialLegendOverlayState,
  state: SpatialOverlayState,
): void {
  const external = !legend.position.startsWith('inside-');
  const bounds = external
    ? externalLegendBounds(legend.position as 'top' | 'right' | 'bottom' | 'left', state)
    : state.plotBounds;
  const inset = Math.min(8, bounds.width / 4, bounds.height / 4);
  const width = Math.max(1, bounds.width - inset * 2);
  const height = Math.max(1, bounds.height - inset * 2);
  element.style.maxWidth = `${width}px`;
  element.style.maxHeight = `${height}px`;
  if (external || legend.position.endsWith('left')) element.style.left = `${bounds.x + inset}px`;
  else element.style.right = `${state.width - bounds.x - bounds.width + inset}px`;
  if (external || legend.position.includes('top')) element.style.top = `${bounds.y + inset}px`;
  else element.style.bottom = `${state.height - bounds.y - bounds.height + inset}px`;
  if (external && (legend.position === 'top' || legend.position === 'bottom'))
    element.style.width = `${width}px`;
}

function createLegend(
  legend: SpatialLegendOverlayState,
  state: SpatialOverlayState,
  actions: SpatialOverlayActions,
  focusedItemId?: string,
): Readonly<{ element: HTMLDivElement; focusTarget: HTMLButtonElement | null }> {
  const element = document.createElement('div');
  let focusTarget: HTMLButtonElement | null = null;
  element.dataset.graflumeSpatialLegend = 'true';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', legend.title ?? 'Chart legend');
  element.style.position = 'absolute';
  element.style.zIndex = '4';
  element.style.display = 'flex';
  element.style.flexDirection = legend.orientation === 'horizontal' ? 'row' : 'column';
  element.style.flexWrap = 'wrap';
  element.style.gap = '6px 10px';
  element.style.overflow = 'auto';
  element.style.padding = '8px 10px';
  element.style.boxSizing = 'border-box';
  element.style.border = `${state.scene.theme.legend?.borderWidth ?? 1}px solid ${state.scene.theme.legend?.borderColor ?? state.scene.theme.colors.axis}`;
  element.style.borderRadius = `${state.scene.theme.legend?.cornerRadius ?? 8}px`;
  const surfaceOpacity = state.scene.theme.legend?.surfaceOpacity ?? 0.9;
  element.style.background =
    surfaceOpacity >= 1
      ? state.scene.theme.colors.background
      : colorWithOpacity(state.scene.theme.colors.background, surfaceOpacity);
  element.style.color = state.scene.theme.colors.text;
  element.style.fontFamily = state.scene.theme.typography.fontFamily;
  element.style.backdropFilter = 'blur(5px)';
  element.style.pointerEvents = 'auto';
  legendPosition(element, legend, state);
  if (legend.title !== undefined) {
    const title = document.createElement('strong');
    title.textContent = legend.title;
    title.style.inlineSize = legend.orientation === 'horizontal' ? '100%' : 'auto';
    title.style.fontSize = `${state.scene.theme.typography.legendTitleSize ?? state.scene.theme.typography.fontSize}px`;
    title.style.fontWeight = String(state.scene.theme.typography.legendTitleWeight ?? 600);
    element.append(title);
  }
  if (legend.mode === 'continuous' && legend.items.length >= 2) {
    const scale = document.createElement('div');
    scale.style.display = 'grid';
    scale.style.gridTemplateColumns = '1fr 1fr';
    scale.style.minWidth = '150px';
    const gradient = document.createElement('div');
    gradient.style.gridColumn = '1 / -1';
    gradient.style.height = '10px';
    gradient.style.borderRadius = '3px';
    const colors = legend.continuousColors ?? legend.items.map(({ color }) => color);
    gradient.style.background = `linear-gradient(90deg, ${colors
      .map((color, index) => `${color} ${(index / Math.max(1, colors.length - 1)) * 100}%`)
      .join(', ')})`;
    scale.append(gradient);
    [legend.items[0]!, legend.items[legend.items.length - 1]!].forEach((item, index) => {
      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.font = `${state.scene.theme.typography.legendLabelWeight ?? 500} ${state.scene.theme.typography.legendLabelSize ?? state.scene.theme.typography.fontSize}px/1.4 ${state.scene.theme.typography.fontFamily}`;
      label.style.textAlign = index === 0 ? 'start' : 'end';
      scale.append(label);
    });
    element.append(scale);
    return { element, focusTarget };
  }
  for (const item of legend.items) {
    const row = document.createElement(item.toggleable ? 'button' : 'div');
    row.dataset.graflumeSpatialLegendItem = item.id;
    if (item.toggleable) {
      const button = row as HTMLButtonElement;
      button.type = 'button';
      button.setAttribute('aria-pressed', String(item.visible));
      const action = item.visible ? legend.hideLabel : legend.showLabel;
      button.setAttribute('aria-label', `${action} ${item.label}`);
      button.addEventListener('click', () => actions.setLegendVisible(item.id, !item.visible));
      if (item.id === focusedItemId) focusTarget = button;
    }
    row.style.display = 'inline-flex';
    row.style.alignItems = 'center';
    row.style.gap = '6px';
    row.style.padding = '2px';
    row.style.border = '0';
    row.style.background = 'transparent';
    row.style.color = state.scene.theme.colors.text;
    row.style.font = `${state.scene.theme.typography.legendLabelWeight ?? 500} ${state.scene.theme.typography.legendLabelSize ?? state.scene.theme.typography.fontSize}px/1.35 ${state.scene.theme.typography.fontFamily}`;
    row.style.cursor = item.toggleable ? 'pointer' : 'default';
    row.style.opacity = item.visible ? '1' : '.42';
    const swatch = document.createElement('span');
    swatch.setAttribute('aria-hidden', 'true');
    swatch.style.width = item.symbol === 'line' ? '14px' : '10px';
    swatch.style.height = item.symbol === 'line' ? '2px' : '10px';
    swatch.style.borderRadius =
      item.symbol === 'point'
        ? '999px'
        : item.symbol === 'line' && state.scene.theme.legend?.lineCap === 'butt'
          ? '0'
          : `${state.scene.theme.legend?.swatchRadius ?? 3}px`;
    swatch.style.background = item.color;
    const label = document.createElement('span');
    label.textContent = item.label;
    row.append(swatch, label);
    element.append(row);
  }
  return { element, focusTarget };
}

export class SpatialOverlayController {
  #host: HTMLElement | null = null;
  #root: HTMLDivElement | null = null;
  #content: HTMLDivElement | null = null;
  #live: HTMLDivElement | null = null;
  readonly #annotationMeasurements = new Map<string, Readonly<{ width: number; height: number }>>();

  sync(host: HTMLElement, state: SpatialOverlayState, actions: SpatialOverlayActions): void {
    if (this.#host !== host) {
      this.destroy();
      this.#host = host;
      const root = document.createElement('div');
      root.dataset.graflumeSpatialOverlays = 'true';
      root.style.position = 'absolute';
      root.style.inset = '0';
      root.style.zIndex = '3';
      root.style.pointerEvents = 'none';
      root.style.overflow = 'hidden';
      const content = document.createElement('div');
      content.style.position = 'absolute';
      content.style.inset = '0';
      content.style.pointerEvents = 'none';
      content.style.overflow = 'hidden';
      root.append(content);
      host.append(root);
      this.#root = root;
      this.#content = content;
    }
    const content = this.#content;
    if (content === null) return;
    if (state.selectionEnabled && this.#live === null) {
      const live = document.createElement('div');
      live.dataset.graflumeSpatialSelectionStatus = 'true';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.style.position = 'absolute';
      live.style.width = '1px';
      live.style.height = '1px';
      live.style.overflow = 'hidden';
      live.style.clipPath = 'inset(50%)';
      this.#root?.append(live);
      this.#live = live;
    } else if (!state.selectionEnabled && this.#live !== null) {
      this.#live.remove();
      this.#live = null;
    }
    const focusedItemId = (document.activeElement as HTMLElement | null)?.dataset
      ?.graflumeSpatialLegendItem;
    content.replaceChildren();
    for (const [index, highlight] of state.highlights.entries()) {
      const bounds = targetBounds(highlight.target, state, actions);
      if (bounds === null) continue;
      const element = document.createElement('div');
      element.dataset.graflumeSpatialHighlight = highlight.id ?? `highlight-${index}`;
      applyHighlightStyle(element, highlight, bounds, state.scene.theme);
      content.append(element);
    }
    for (const [index, target] of state.selection.entries()) {
      const bounds = targetBounds(target, state, actions);
      if (bounds === null) continue;
      const element = document.createElement('div');
      element.dataset.graflumeSpatialSelection = String(index);
      applyHighlightStyle(
        element,
        {
          id: `selection-${index}`,
          target,
          fill:
            state.selectionHighlight.fill ?? colorWithOpacity(state.scene.theme.colors.focus, 0.16),
          stroke: state.selectionHighlight.stroke ?? state.scene.theme.colors.focus,
          lineWidth: state.selectionHighlight.lineWidth ?? 2.5,
          padding: state.selectionHighlight.padding ?? 5,
          radius: state.selectionHighlight.radius ?? 8,
          ...(state.selectionHighlight.opacity === undefined
            ? {}
            : { opacity: state.selectionHighlight.opacity }),
          ...(state.selectionHighlight.dash === undefined
            ? {}
            : { dash: state.selectionHighlight.dash }),
        },
        bounds,
        state.scene.theme,
      );
      content.append(element);
    }
    const preparedAnnotations: PreparedAnnotation[] = [];
    for (const annotation of state.annotationsVisible ? state.annotations : []) {
      const bounds = targetBounds(annotation.target, state, actions);
      if (bounds === null) continue;
      const prepared = prepareAnnotation(annotation, bounds, state);
      preparedAnnotations.push(prepared);
      if (!this.#annotationMeasurements.has(prepared.measurementKey))
        content.append(prepared.bubble);
    }
    const activeMeasurementKeys = new Set(
      preparedAnnotations.map(({ measurementKey }) => measurementKey),
    );
    for (const key of this.#annotationMeasurements.keys()) {
      if (!activeMeasurementKeys.has(key)) this.#annotationMeasurements.delete(key);
    }
    // All writes happen before the read phase, so even a full 256-callout
    // scene incurs one layout pass. Camera-only renders reuse the cached size.
    for (const prepared of preparedAnnotations) {
      if (this.#annotationMeasurements.has(prepared.measurementKey)) continue;
      const bounds = prepared.bubble.getBoundingClientRect();
      this.#annotationMeasurements.set(prepared.measurementKey, {
        width: bounds.width,
        height: bounds.height,
      });
    }
    const dataObstacles =
      preparedAnnotations.length === 0 ? [] : projectedDataObstacles(state, actions);
    const protectedObstacles = [insideLegendBounds(state), state.controlBounds].filter(
      (bounds): bounds is ScreenBounds => bounds !== null && bounds !== undefined,
    );
    const occupiedCallouts: ScreenBounds[] = [];
    for (const prepared of preparedAnnotations) {
      prepared.bubble.remove();
      const measured = this.#annotationMeasurements.get(prepared.measurementKey) ?? {
        width: prepared.fallbackWidth,
        height: prepared.fallbackHeight,
      };
      const placed = placeAnnotation(
        prepared,
        state,
        measured,
        dataObstacles,
        protectedObstacles,
        occupiedCallouts,
      );
      content.append(...placed.elements);
      occupiedCallouts.push(placed.bounds);
    }
    let focusTarget: HTMLButtonElement | null = null;
    if (state.legend !== null && state.legend.visible) {
      const legend = createLegend(state.legend, state, actions, focusedItemId);
      content.append(legend.element);
      focusTarget = legend.focusTarget;
    }
    const summary = `${state.selectionLabel}: ${state.selection.length}`;
    if (this.#live !== null && this.#live.textContent !== summary) this.#live.textContent = summary;
    focusTarget?.focus();
  }

  destroy(): void {
    this.#root?.remove();
    this.#root = null;
    this.#content = null;
    this.#live = null;
    this.#host = null;
    this.#annotationMeasurements.clear();
  }
}
