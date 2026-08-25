import type { LayerData } from '../compiler/domain.js';
import type { DataRow, DataValue } from '../spec/types.js';
import type { Rect, SceneNode } from './types.js';

export interface SemanticChannel {
  readonly field: string;
  readonly value: DataValue;
}

export interface SemanticLineage {
  readonly sourceId: string;
  readonly sourceRowIndices: readonly number[];
  readonly truncated: boolean;
}

/** Renderer-neutral, bounded description of one visible or addressable chart mark. */
export interface SemanticMark {
  readonly id: string;
  /** Stable composition view identity; flat charts use `plot`. */
  readonly viewId: string;
  readonly layerId: string;
  readonly rowIndex: number;
  readonly role: string;
  readonly channels: Readonly<Partial<Record<'x' | 'y', SemanticChannel>>>;
  readonly datum: DataRow;
  readonly lineage: SemanticLineage;
  readonly bounds: Rect;
  readonly visible: boolean;
  readonly label: string;
}

export interface AccessibleRow {
  readonly id: string;
  readonly layerId: string;
  readonly role: string;
  readonly label: string;
  readonly values: DataRow;
  readonly visible: boolean;
}

interface NodeDatumBounds {
  readonly nodeId: string;
  readonly layerId: string;
  readonly rowIndex: number;
  readonly datum: DataRow;
  readonly tooltip?: DataRow;
  readonly bounds: Rect;
  readonly visible: boolean;
}

const provenanceLimit = 1_024;
const tableColumnLimit = 24;

function boundedText(value: unknown, limit = 240): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '');
  const characters = Array.from(text);
  return characters.length <= limit
    ? text
    : `${characters.slice(0, Math.max(1, limit - 1)).join('')}\u2026`;
}

function formatValue(value: DataValue, locale?: string): string {
  if (value === null || value === undefined) return '\u2014';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value)) {
    try {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
    } catch {
      return String(value);
    }
  }
  return boundedText(value, 80);
}

function unionBounds(left: Rect, right: Rect): Rect {
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const rightEdge = Math.max(left.x + left.width, right.x + right.width);
  const bottomEdge = Math.max(left.y + left.height, right.y + right.height);
  return { x, y, width: rightEdge - x, height: bottomEdge - y };
}

function intersectBounds(bounds: Rect, clip: Rect): Rect {
  const x = Math.max(bounds.x, clip.x);
  const y = Math.max(bounds.y, clip.y);
  const right = Math.min(bounds.x + bounds.width, clip.x + clip.width);
  const bottom = Math.min(bounds.y + bounds.height, clip.y + clip.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

function nodeBounds(node: Exclude<SceneNode, { readonly type: 'group' }>): Rect {
  switch (node.type) {
    case 'circle':
      return {
        x: node.cx - node.radius - node.lineWidth / 2,
        y: node.cy - node.radius - node.lineWidth / 2,
        width: node.radius * 2 + node.lineWidth,
        height: node.radius * 2 + node.lineWidth,
      };
    case 'rect': {
      const inset = node.lineWidth / 2;
      return {
        x: Math.min(node.x, node.x + node.width) - inset,
        y: Math.min(node.y, node.y + node.height) - inset,
        width: Math.abs(node.width) + inset * 2,
        height: Math.abs(node.height) + inset * 2,
      };
    }
    case 'line': {
      const inset = node.lineWidth / 2;
      return {
        x: Math.min(node.x1, node.x2) - inset,
        y: Math.min(node.y1, node.y2) - inset,
        width: Math.abs(node.x2 - node.x1) + inset * 2,
        height: Math.abs(node.y2 - node.y1) + inset * 2,
      };
    }
    case 'path': {
      const points = [node.points, ...(node.subpaths ?? [])].flat();
      if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
      const inset = node.lineWidth / 2;
      const xs = points.map(({ x }) => x);
      const ys = points.map(({ y }) => y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return {
        x: x - inset,
        y: y - inset,
        width: Math.max(...xs) - x + inset * 2,
        height: Math.max(...ys) - y + inset * 2,
      };
    }
    case 'text': {
      const width = Math.max(
        node.fontSize * 0.6,
        Array.from(node.text).length * node.fontSize * 0.6,
      );
      const height = Math.max(1, node.fontSize * 1.2);
      const x =
        node.align === 'center'
          ? node.x - width / 2
          : node.align === 'right' || node.align === 'end'
            ? node.x - width
            : node.x;
      const y =
        node.baseline === 'middle'
          ? node.y - height / 2
          : node.baseline === 'bottom' || node.baseline === 'ideographic'
            ? node.y - height
            : node.baseline === 'alphabetic'
              ? node.y - height * 0.8
              : node.y;
      // Rotation is represented by its safe axis-aligned envelope.
      const radians = (Math.abs(node.rotation) * Math.PI) / 180;
      const rotatedWidth =
        Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
      const rotatedHeight =
        Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
      return {
        x: x - Math.max(0, rotatedWidth - width) / 2,
        y: y - Math.max(0, rotatedHeight - height) / 2,
        width: rotatedWidth,
        height: rotatedHeight,
      };
    }
  }
}

function collectNodeDatumBounds(root: SceneNode): readonly NodeDatumBounds[] {
  const output: NodeDatumBounds[] = [];
  const visit = (
    node: SceneNode,
    parentVisible: boolean,
    parentOpacity: number,
    clips: readonly Rect[],
  ): void => {
    const visible = parentVisible && node.visible && parentOpacity * node.opacity > 0;
    if (node.type === 'group') {
      const nextClips = node.clip === undefined ? clips : [...clips, node.clip];
      for (const child of node.children)
        visit(child, visible, parentOpacity * node.opacity, nextClips);
      return;
    }
    if (node.datum === undefined) return;
    const bounds = clips.reduce(intersectBounds, nodeBounds(node));
    output.push({
      nodeId: node.id,
      layerId: node.datum.layerId,
      rowIndex: node.datum.rowIndex,
      datum: node.datum.datum,
      ...(node.datum.tooltip === undefined ? {} : { tooltip: node.datum.tooltip }),
      bounds,
      visible: visible && bounds.width >= 0 && bounds.height >= 0,
    });
  };
  visit(root, true, 1, []);
  return output;
}

function valuesDiffer(left: DataRow, right: DataRow): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].some((key) => !Object.is(left[key], right[key]));
}

function publicDatum(row: DataRow): DataRow {
  return Object.fromEntries(
    Object.entries(row).filter(([field]) => !field.startsWith('__graflume_')),
  );
}

function channels(layer: LayerData, row: DataRow): SemanticMark['channels'] {
  return {
    x: { field: layer.layer.x.field, value: row[layer.layer.x.field] },
    y: { field: layer.layer.y.field, value: row[layer.layer.y.field] },
  };
}

function semanticLabel(layer: LayerData, row: DataRow, locale?: string): string {
  const x = channels(layer, row).x!;
  const y = channels(layer, row).y!;
  return boundedText(
    `${layer.layer.name}. ${layer.layer.x.title}: ${formatValue(x.value, locale)}. ${layer.layer.y.title}: ${formatValue(y.value, locale)}.`,
  );
}

function lineageFor(
  layer: LayerData,
  rowIndex: number,
  aggregate: boolean,
  tooltip?: DataRow,
): SemanticLineage {
  const explicit = tooltip?.sourceRowIndices;
  const explicitRows = Array.isArray(explicit)
    ? explicit.filter(
        (value): value is number =>
          typeof value === 'number' && Number.isInteger(value) && value >= 0,
      )
    : undefined;
  const sourceRows =
    explicitRows !== undefined
      ? explicitRows
      : aggregate
        ? layer.lineage.rowSources.flat()
        : (layer.lineage.rowSources[rowIndex] ?? []);
  const unique = [...new Set(sourceRows)].sort((left, right) => left - right);
  const authoredCount = tooltip?.sourceRowCount;
  const sourceCount =
    typeof authoredCount === 'number' && Number.isInteger(authoredCount) && authoredCount >= 0
      ? authoredCount
      : unique.length;
  return {
    sourceId: layer.lineage.sourceId,
    sourceRowIndices: unique.slice(0, provenanceLimit),
    truncated: sourceCount > unique.length || unique.length > provenanceLimit,
  };
}

function mappedObservationBounds(layer: LayerData, row: DataRow): Rect {
  const xValue = row[layer.layer.x.field];
  const yValue = row[layer.layer.y.field];
  const scalar = (value: DataValue): string | number | Date | null =>
    typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : null;
  const xInput = scalar(xValue);
  const yInput = scalar(yValue);
  if (xInput === null || yInput === null) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const x = layer.xScale.map(xInput);
  const y = layer.yScale.map(yInput);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: x - 4, y: y - 4, width: 8, height: 8 };
}

/** Build the semantic sidecar without depending on any renderer implementation. */
export function buildSemanticIndex(
  root: SceneNode,
  layers: readonly LayerData[],
  maxRows: number,
  locale?: string,
): readonly SemanticMark[] {
  const nodeData = collectNodeDatumBounds(root);
  const candidates = layers.map((layer) => {
    const layerNodes = nodeData.filter(({ layerId }) => layerId === layer.layer.id);
    const rowBounds = new Map<number, { bounds: Rect; visible: boolean }>();
    for (const item of layerNodes) {
      const current = rowBounds.get(item.rowIndex);
      rowBounds.set(item.rowIndex, {
        bounds: current === undefined ? item.bounds : unionBounds(current.bounds, item.bounds),
        visible: (current?.visible ?? false) || item.visible,
      });
    }
    const records: SemanticMark[] = [];
    const retainedRows = Math.min(layer.table.length, maxRows);
    for (let rowIndex = 0; rowIndex < retainedRows; rowIndex += 1) {
      const row = layer.table.row(rowIndex);
      const datum = publicDatum(row);
      const measured = rowBounds.get(rowIndex);
      records.push({
        id: `${layer.layer.id}:observation:${rowIndex}`,
        viewId: 'plot',
        layerId: layer.layer.id,
        rowIndex,
        role: layer.layer.mark.type,
        channels: channels(layer, row),
        datum,
        lineage: lineageFor(layer, rowIndex, false),
        bounds: measured?.bounds ?? mappedObservationBounds(layer, row),
        visible: layer.layer.visible && (measured?.visible ?? true),
        label: semanticLabel(layer, row, locale),
      });
    }
    for (const item of layerNodes) {
      if (records.length >= maxRows) break;
      if (item.tooltip === undefined || !valuesDiffer(item.datum, item.tooltip)) continue;
      const row = item.tooltip;
      records.push({
        id: `${item.nodeId}:derived`,
        viewId: 'plot',
        layerId: layer.layer.id,
        rowIndex: item.rowIndex,
        role: `${layer.layer.mark.type}-aggregate`,
        channels: channels(layer, row),
        datum: row,
        lineage: lineageFor(layer, item.rowIndex, true, item.tooltip),
        bounds: item.bounds,
        visible: layer.layer.visible && item.visible,
        label: semanticLabel(layer, row, locale),
      });
    }
    return records;
  });

  const bounded: SemanticMark[] = [];
  for (let index = 0; bounded.length < maxRows; index += 1) {
    let appended = false;
    for (const layer of candidates) {
      const record = layer[index];
      if (record === undefined) continue;
      bounded.push(record);
      appended = true;
      if (bounded.length >= maxRows) break;
    }
    if (!appended) break;
  }
  return bounded;
}

/** Convert semantic marks into bounded, renderer-independent native-table rows. */
export function toAccessibleRows(
  semanticIndex: readonly SemanticMark[],
  maxRows = semanticIndex.length,
): readonly AccessibleRow[] {
  return semanticIndex.slice(0, Math.max(0, maxRows)).map((mark) => ({
    id: mark.id,
    layerId: mark.layerId,
    role: mark.role,
    label: mark.label,
    values: Object.fromEntries(Object.entries(mark.datum).slice(0, tableColumnLimit)),
    visible: mark.visible,
  }));
}
