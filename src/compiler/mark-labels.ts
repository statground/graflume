import { sceneNodeBounds } from '../scene/bounds.js';
import { group, nodeBase } from '../scene/factory.js';
import { buildSemanticIndex } from '../scene/semantic.js';
import type { MarkLabelSceneEntry, Point, Rect, SceneNode, TextNode } from '../scene/types.js';
import type {
  DataRow,
  DatumTargetSpec,
  JsonPrimitive,
  MarkLabelPositionSpec,
  MarkLabelPlacement,
  NormalizedChartSpec,
  NormalizedLayerSpec,
} from '../spec/types.js';
import type { ThemeTokens } from '../theme/types.js';
import type { ScaleResolution } from './domain.js';
import type { PlotArea } from './types.js';

export interface MarkLabelRuntimeState {
  readonly markLabelPositions?: readonly MarkLabelPositionSpec[];
  readonly activeMarkLabelId?: string;
}

export interface CompiledMarkLabels {
  readonly nodes: readonly SceneNode[];
  readonly entries: readonly MarkLabelSceneEntry[];
}

interface DatumGeometry {
  readonly layerId: string;
  readonly rowIndex: number;
  readonly datum: DataRow;
  readonly bounds: Rect;
}

const automaticLabelValue = '__graflumeAutomaticLabelValue';
const automaticLabelId = '__graflumeAutomaticLabelId';

interface LabelSize {
  readonly text: string;
  readonly width: number;
  readonly height: number;
  readonly textWidth: number;
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

function descendants(node: SceneNode, ancestorVisible = true): readonly SceneNode[] {
  const visible = ancestorVisible && node.visible && node.opacity > 0;
  if (!visible) return [];
  if (node.type !== 'group') return [node];
  return node.children.flatMap((child) => descendants(child, visible));
}

function collectDatumGeometry(
  layerGroups: readonly SceneNode[],
  scales: ScaleResolution,
  maximum: number,
  locale: string | undefined,
): readonly DatumGeometry[] {
  const semantic = buildSemanticIndex(
    group('mark-labels:semantic-source', layerGroups),
    scales.layers,
    maximum,
    locale,
  );
  if (semantic.length > 0) {
    return semantic.map((mark) => ({
      layerId: mark.layerId,
      rowIndex: mark.rowIndex,
      datum: mark.datum,
      bounds: mark.bounds,
    }));
  }
  const byDatum = new Map<
    string,
    { layerId: string; rowIndex: number; datum: DataRow; bounds: Rect | null }
  >();
  for (const node of layerGroups.flatMap((candidate) => descendants(candidate))) {
    const reference = node.datum;
    if (reference === undefined) continue;
    const bounds = sceneNodeBounds(node);
    if (bounds === null) continue;
    const key = JSON.stringify([reference.layerId, reference.rowIndex]);
    const current = byDatum.get(key);
    const datum = { ...reference.datum, ...reference.tooltip };
    if (current === undefined) {
      byDatum.set(key, {
        layerId: reference.layerId,
        rowIndex: reference.rowIndex,
        datum,
        bounds,
      });
    } else current.bounds = union(current.bounds, bounds);
  }
  return [...byDatum.values()].flatMap((entry) =>
    entry.bounds === null ? [] : [{ ...entry, bounds: entry.bounds }],
  );
}

function jsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function scalarEqual(left: unknown, right: JsonPrimitive): boolean {
  if (left instanceof Date) {
    return typeof right === 'string'
      ? left.toISOString() === right || left.toISOString().slice(0, 10) === right
      : typeof right === 'number' && left.getTime() === right;
  }
  return Object.is(left, right);
}

export function markLabelTargetMatches(
  target: DatumTargetSpec,
  candidate: Pick<DatumGeometry, 'layerId' | 'rowIndex' | 'datum'>,
): boolean {
  if (target.layerId !== undefined && target.layerId !== candidate.layerId) return false;
  if (target.rowIndex !== undefined) {
    const rows = Array.isArray(target.rowIndex) ? target.rowIndex : [target.rowIndex];
    if (!rows.includes(candidate.rowIndex)) return false;
  }
  if (target.field !== undefined) {
    const value = candidate.datum[target.field];
    const values = target.values ?? (target.value === undefined ? [] : [target.value]);
    if (!values.some((entry) => scalarEqual(value, entry))) return false;
  }
  return target.rowIndex !== undefined || target.field !== undefined;
}

function targetForDatum(geometry: DatumGeometry, keyField: string | undefined): DatumTargetSpec {
  const automaticId = geometry.datum[automaticLabelId];
  if (jsonPrimitive(automaticId)) {
    return {
      type: 'datum',
      layerId: geometry.layerId,
      field: automaticLabelId,
      value: automaticId,
    };
  }
  const value = keyField === undefined ? undefined : geometry.datum[keyField];
  return keyField !== undefined && jsonPrimitive(value)
    ? { type: 'datum', layerId: geometry.layerId, field: keyField, value }
    : { type: 'datum', layerId: geometry.layerId, rowIndex: geometry.rowIndex };
}

function seriesAutomaticGeometry(
  input: readonly DatumGeometry[],
  spec: NormalizedChartSpec,
): readonly DatumGeometry[] {
  const output: DatumGeometry[] = [];
  for (const layer of spec.layers) {
    const layerRows = input.filter(({ layerId }) => layerId === layer.id);
    const seriesField = layer.mark.fields.series;
    if (seriesField === undefined || (layer.mark.type !== 'area' && layer.mark.type !== 'bar')) {
      output.push(...layerRows);
      continue;
    }
    const derived = layerRows.filter(
      ({ datum }) =>
        typeof datum.stackSeries === 'string' &&
        typeof datum.stackValue === 'number' &&
        Number.isFinite(datum.stackValue),
    );
    if (derived.length === 0) {
      output.push(...layerRows);
      continue;
    }
    if (layer.mark.type === 'area') {
      const endpoints = new Map<string, DatumGeometry>();
      for (const row of derived) {
        const series = String(row.datum.stackSeries);
        const current = endpoints.get(series);
        if (
          current === undefined ||
          row.bounds.x + row.bounds.width > current.bounds.x + current.bounds.width
        ) {
          endpoints.set(series, row);
        }
      }
      for (const [series, row] of endpoints) {
        output.push({
          ...row,
          datum: {
            ...row.datum,
            [automaticLabelValue]: series,
            [automaticLabelId]: `series:${series}`,
          },
        });
      }
      continue;
    }

    // Stacked/grouped bars expose one label per segment plus one net total per
    // category. Both values come from the compiler's calculated stack
    // semantics, rather than re-reading an arbitrary authored y field.
    for (const row of derived) {
      output.push({
        ...row,
        datum: {
          ...row.datum,
          [automaticLabelValue]: row.datum.stackValue,
          [automaticLabelId]: `segment:${String(row.datum.stackCategory)}:${String(row.datum.stackSeries)}`,
        },
      });
    }
    const categories = new Map<string, DatumGeometry[]>();
    for (const row of derived) {
      const key = `${typeof row.datum.stackCategory}:${String(row.datum.stackCategory)}`;
      const rows = categories.get(key) ?? [];
      rows.push(row);
      categories.set(key, rows);
    }
    for (const [key, rows] of categories) {
      const bounds = rows.reduce<Rect | null>((current, row) => union(current, row.bounds), null);
      const representative = rows[0];
      if (bounds === null || representative === undefined) continue;
      const total = representative.datum.stackNetTotal;
      if (typeof total !== 'number' || !Number.isFinite(total)) continue;
      output.push({
        ...representative,
        bounds,
        datum: {
          ...representative.datum,
          [automaticLabelValue]: total,
          [automaticLabelId]: `total:${key}`,
        },
      });
    }
  }
  return output;
}

function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
}

function targetId(target: DatumTargetSpec): string {
  return `mark-label:${target.layerId ?? 'layer'}:${hash(JSON.stringify(target))}`;
}

function formattedValue(value: unknown, locale: string | undefined): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
        value,
      );
    } catch {
      return value.toISOString();
    }
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    try {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
    } catch {
      return String(value);
    }
  }
  if (typeof value === 'string' || typeof value === 'boolean') return String(value);
  return '';
}

function truncateLabel(text: string, maximumWidth: number, fontSize: number): string {
  const characters = Array.from(text);
  const maximumCharacters = Math.max(1, Math.floor(maximumWidth / Math.max(1, fontSize * 0.6)));
  if (characters.length <= maximumCharacters) return text;
  if (maximumCharacters === 1) return '…';
  return `${characters.slice(0, maximumCharacters - 1).join('')}…`;
}

function labelSize(
  text: string,
  fontSize: number,
  padding: number,
  maximumWidth: number,
): LabelSize {
  const resolvedText = truncateLabel(text, maximumWidth, fontSize);
  const textWidth = Math.min(
    maximumWidth,
    Math.max(fontSize * 0.6, Array.from(resolvedText).length * fontSize * 0.6),
  );
  return {
    text: resolvedText,
    width: textWidth + padding * 2,
    height: fontSize * 1.2 + padding * 2,
    textWidth,
  };
}

function overlaps(left: Rect, right: Rect, padding = 1): boolean {
  return !(
    left.x + left.width + padding <= right.x ||
    right.x + right.width + padding <= left.x ||
    left.y + left.height + padding <= right.y ||
    right.y + right.height + padding <= left.y
  );
}

function inside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function centerForPlacement(
  mark: Rect,
  size: LabelSize,
  placement: Exclude<MarkLabelPlacement, 'auto'>,
  offset: number,
): Point {
  const markCenter = { x: mark.x + mark.width / 2, y: mark.y + mark.height / 2 };
  switch (placement) {
    case 'top':
      return { x: markCenter.x, y: mark.y - offset - size.height / 2 };
    case 'right':
      return {
        x: mark.x + mark.width + offset + size.width / 2,
        y: markCenter.y,
      };
    case 'bottom':
      return {
        x: markCenter.x,
        y: mark.y + mark.height + offset + size.height / 2,
      };
    case 'left':
      return { x: mark.x - offset - size.width / 2, y: markCenter.y };
    case 'center':
      return markCenter;
  }
}

function rectAt(center: Point, size: LabelSize, offsetX = 0, offsetY = 0): Rect {
  return {
    x: center.x + offsetX - size.width / 2,
    y: center.y + offsetY - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

function placementCandidates(
  placement: MarkLabelPlacement,
): readonly Exclude<MarkLabelPlacement, 'auto'>[] {
  if (placement !== 'auto') return [placement];
  return ['top', 'right', 'bottom', 'left', 'center'];
}

function shiftCandidates(placement: Exclude<MarkLabelPlacement, 'auto'>): readonly Point[] {
  if (placement === 'center') return [{ x: 0, y: 0 }];
  const distances = [0, -12, 12, -24, 24, -36, 36, -48, 48];
  return distances.map((distance) =>
    placement === 'top' || placement === 'bottom' ? { x: distance, y: 0 } : { x: 0, y: distance },
  );
}

function nearestPoint(rect: Rect, point: Point): Point {
  return {
    x: Math.max(rect.x, Math.min(rect.x + rect.width, point.x)),
    y: Math.max(rect.y, Math.min(rect.y + rect.height, point.y)),
  };
}

function layerForId(spec: NormalizedChartSpec, layerId: string): NormalizedLayerSpec | undefined {
  return spec.layers.find((layer) => layer.id === layerId);
}

function positionForDatum(
  positions: readonly MarkLabelPositionSpec[],
  geometry: DatumGeometry,
): MarkLabelPositionSpec | undefined {
  return positions.find((position) => markLabelTargetMatches(position.target, geometry));
}

function labelNodes(options: {
  readonly id: string;
  readonly text: string;
  readonly size: LabelSize;
  readonly bounds: Rect;
  readonly anchor: Point;
  readonly active: boolean;
  readonly connector: NormalizedChartSpec['markLabels'] extends false ? never : boolean;
  readonly connectorColor: string;
  readonly connectorWidth: number;
  readonly connectorDash: readonly number[];
  readonly color: string;
  readonly background?: string;
  readonly border?: string;
  readonly opacity: number;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly padding: number;
  readonly radius: number;
  readonly focus: string;
}): readonly SceneNode[] {
  const nodes: SceneNode[] = [];
  const edge = nearestPoint(options.bounds, options.anchor);
  if (
    options.connector &&
    (Math.abs(edge.x - options.anchor.x) > 0.5 || Math.abs(edge.y - options.anchor.y) > 0.5)
  ) {
    nodes.push({
      type: 'line',
      ...nodeBase(`${options.id}:connector`, { zIndex: 540, opacity: options.opacity }),
      x1: options.anchor.x,
      y1: options.anchor.y,
      x2: edge.x,
      y2: edge.y,
      stroke: options.connectorColor,
      lineWidth: options.connectorWidth,
      dash: options.connectorDash,
      lineCap: 'round',
    });
  }
  if (options.background !== undefined || options.border !== undefined || options.active) {
    nodes.push({
      type: 'rect',
      ...nodeBase(`${options.id}:body`, {
        zIndex: 550,
        opacity: options.opacity,
        interactive: true,
      }),
      ...options.bounds,
      ...(options.background === undefined ? {} : { fill: options.background }),
      ...(options.border === undefined ? {} : { stroke: options.border }),
      lineWidth: options.border === undefined ? 0 : 1,
      cornerRadius: options.radius,
    });
  }
  const text: TextNode = {
    type: 'text',
    ...nodeBase(`${options.id}:text`, {
      zIndex: 551,
      opacity: options.opacity,
      interactive: true,
    }),
    x: options.bounds.x + options.bounds.width / 2,
    y: options.bounds.y + options.bounds.height / 2,
    text: options.text,
    fill: options.color,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fontWeight: options.fontWeight,
    align: 'center',
    baseline: 'middle',
    rotation: 0,
  };
  nodes.push(text);
  if (options.active) {
    nodes.push({
      type: 'rect',
      ...nodeBase(`${options.id}:selection`, { zIndex: 558 }),
      x: options.bounds.x - 2,
      y: options.bounds.y - 2,
      width: options.bounds.width + 4,
      height: options.bounds.height + 4,
      stroke: options.focus,
      lineWidth: 1.5,
      dash: [4, 3],
      cornerRadius: options.radius + 2,
    });
    const corners: readonly Point[] = [
      { x: options.bounds.x, y: options.bounds.y },
      { x: options.bounds.x + options.bounds.width, y: options.bounds.y },
      { x: options.bounds.x + options.bounds.width, y: options.bounds.y + options.bounds.height },
      { x: options.bounds.x, y: options.bounds.y + options.bounds.height },
    ];
    corners.forEach((corner, index) => {
      nodes.push({
        type: 'circle',
        ...nodeBase(`${options.id}:handle:${index}`, { zIndex: 559, interactive: true }),
        cx: corner.x,
        cy: corner.y,
        radius: 4,
        fill: options.background ?? '#ffffff',
        stroke: options.focus,
        lineWidth: 1.5,
      });
    });
  }
  return nodes;
}

/** Compile portable automatic labels for every data-bearing Canvas mark family. */
export function compileMarkLabels(options: {
  readonly spec: NormalizedChartSpec;
  readonly layerGroups: readonly SceneNode[];
  readonly scales: ScaleResolution;
  readonly plot: PlotArea;
  readonly theme: ThemeTokens;
  readonly runtime?: MarkLabelRuntimeState;
}): CompiledMarkLabels {
  const labels = options.spec.markLabels;
  if (labels === false || !labels.visible) return { nodes: [], entries: [] };
  const positions = options.runtime?.markLabelPositions ?? labels.positions;
  const layerIds = new Set(labels.layerIds);
  const collected = collectDatumGeometry(
    options.layerGroups,
    options.scales,
    labels.maxLabels,
    options.spec.locale,
  ).filter((entry) => layerIds.size === 0 || layerIds.has(entry.layerId));
  const geometry = (
    labels.field === undefined ? seriesAutomaticGeometry(collected, options.spec) : collected
  ).slice(0, labels.maxLabels);
  const occupied: Rect[] = [];
  const nodes: SceneNode[] = [];
  const entries: MarkLabelSceneEntry[] = [];
  const fontSize = labels.style.fontSize ?? options.theme.typography.fontSize;
  const fontWeight = labels.style.fontWeight ?? options.theme.typography.fontWeight ?? 400;
  const padding = labels.style.padding ?? 3;
  const maximumWidth = labels.style.maxWidth ?? 160;
  const opacity = labels.style.opacity ?? 1;
  const connector = labels.connector !== false && (labels.connector.visible ?? true);
  const connectorColor =
    labels.connector === false
      ? options.theme.colors.mutedText
      : (labels.connector.color ?? options.theme.colors.mutedText);
  const connectorWidth = labels.connector === false ? 1 : (labels.connector.width ?? 1);
  const connectorDash = labels.connector === false ? [] : (labels.connector.dash ?? []);
  const markObstacles = geometry.map(({ bounds }) => bounds);

  geometry.forEach((datum, datumIndex) => {
    const layer = layerForId(options.spec, datum.layerId);
    if (layer === undefined) return;
    const field = labels.field ?? layer.encoding.text?.field ?? layer.y.field;
    const sourceValue = datum.datum[automaticLabelValue] ?? datum.datum[field];
    const value = formattedValue(sourceValue, options.spec.locale);
    if (value === '') return;
    const size = labelSize(value, fontSize, padding, maximumWidth);
    const target = targetForDatum(datum, labels.key);
    const id = targetId(target);
    const authored = positionForDatum(positions, datum);
    if (authored?.hidden === true) return;
    const authoredOffsetX = authored?.offsetX ?? 0;
    const authoredOffsetY = authored?.offsetY ?? 0;
    const candidates = placementCandidates(labels.placement);
    let selected:
      | {
          readonly baseCenter: Point;
          readonly bounds: Rect;
        }
      | undefined;

    candidateLoop: for (const placement of candidates) {
      const baseCenter = centerForPlacement(datum.bounds, size, placement, labels.offset);
      const shifts = labels.collision === 'avoid' ? shiftCandidates(placement) : [{ x: 0, y: 0 }];
      for (const shift of shifts) {
        const bounds = rectAt(baseCenter, size, shift.x, shift.y);
        const collidesWithLabel = occupied.some((candidate) => overlaps(bounds, candidate));
        const collidesWithMark = markObstacles.some(
          (candidate, index) => index !== datumIndex && overlaps(bounds, candidate, 0),
        );
        const collision = collidesWithLabel || collidesWithMark;
        if (!inside(bounds, options.plot)) continue;
        if (labels.collision !== 'none' && collision) continue;
        selected = {
          baseCenter: { x: baseCenter.x + shift.x, y: baseCenter.y + shift.y },
          bounds,
        };
        break candidateLoop;
      }
      if (labels.collision === 'hide') break;
    }
    if (selected === undefined) return;
    if (authored !== undefined) {
      selected = {
        baseCenter: selected.baseCenter,
        bounds: rectAt(selected.baseCenter, size, authoredOffsetX, authoredOffsetY),
      };
    }
    occupied.push(selected.bounds);
    const anchor = {
      x: datum.bounds.x + datum.bounds.width / 2,
      y: datum.bounds.y + datum.bounds.height / 2,
    };
    const active = options.runtime?.activeMarkLabelId === id && labels.authoring !== false;
    nodes.push(
      ...labelNodes({
        id,
        text: size.text,
        size,
        bounds: selected.bounds,
        anchor,
        active,
        connector,
        connectorColor,
        connectorWidth,
        connectorDash,
        color: labels.style.color ?? options.theme.colors.text,
        ...(labels.style.background === undefined ? {} : { background: labels.style.background }),
        ...(labels.style.border === undefined ? {} : { border: labels.style.border }),
        opacity,
        fontFamily: options.theme.typography.fontFamily,
        fontSize,
        fontWeight,
        padding,
        radius: labels.style.radius ?? 2,
        focus: options.theme.colors.focus,
      }),
    );
    entries.push({
      id,
      target,
      text: size.text,
      anchor,
      baseCenter: selected.baseCenter,
      bounds: selected.bounds,
      offsetX: authoredOffsetX,
      offsetY: authoredOffsetY,
      editable: labels.authoring !== false,
    });
  });

  return {
    nodes: nodes.length === 0 ? [] : [group('mark-labels:overlay', nodes, { zIndex: 540 })],
    entries,
  };
}
