import type { LayerData } from '../compiler/domain.js';
import {
  formatTemporalValue,
  inferTemporalDisplayFormat,
  parseTemporalValue,
  temporalISOText,
} from '../format/temporal.js';
import type { DataRow, DataValue, FieldType, NormalizedAxisFormatSpec } from '../spec/types.js';
import type { Rect, SceneNode } from './types.js';

export interface SemanticChannel {
  readonly field: string;
  readonly value: DataValue;
  readonly type?: FieldType;
  /** Locale-aware display text using the authored temporal axis format when available. */
  readonly displayValue?: string;
}

export interface SemanticLineage {
  readonly sourceId: string;
  readonly sourceRowIndices: readonly number[];
  readonly truncated: boolean;
}

/** One authored Table column as exposed by the compiler's visible column window. */
export interface SemanticTableColumn {
  readonly column: number;
  readonly field: string;
  readonly header: string;
}

/** One visible Table merge anchor. Covered cells are deliberately not repeated. */
export interface SemanticTableCell {
  readonly row: number;
  readonly column: number;
  readonly field: string;
  readonly value: DataValue;
  readonly formatted: string;
  readonly rowSpan: number;
  readonly columnSpan: number;
}

/** Row-oriented Table metadata used by the native accessibility mirror. */
export interface SemanticTableRow {
  readonly row: number;
  readonly totalRows: number;
  readonly columns: readonly SemanticTableColumn[];
  readonly cells: readonly SemanticTableCell[];
  readonly formattedValues: Readonly<Record<string, string>>;
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
  /** Present only for the Table family; one semantic mark represents one visible logical row. */
  readonly tableRow?: SemanticTableRow;
}

export interface AccessibleRow {
  readonly id: string;
  readonly layerId: string;
  readonly role: string;
  readonly label: string;
  readonly values: DataRow;
  /** Stable display text for native tables; values retains the source/derived data contract. */
  readonly displayValues?: Readonly<Record<string, string>>;
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

function formatValue(
  value: DataValue,
  locale?: string,
  type?: FieldType,
  axisFormat?: NormalizedAxisFormatSpec,
): string {
  if (value === null || value === undefined) return '\u2014';
  if (type === 'temporal' || value instanceof Date) {
    const authoredType = axisFormat?.type;
    const temporalType =
      authoredType === 'date' || authoredType === 'time' || authoredType === 'datetime'
        ? authoredType
        : (inferTemporalDisplayFormat(value) ?? 'datetime');
    const formatted = formatTemporalValue(
      value,
      {
        type: temporalType,
        dateStyle: axisFormat?.dateStyle ?? 'medium',
        timeStyle: axisFormat?.timeStyle ?? 'short',
        timeZone: axisFormat?.timeZone ?? 'UTC',
      },
      locale,
    );
    if (formatted !== null) {
      return `${axisFormat?.prefix ?? ''}${formatted}${axisFormat?.suffix ?? ''}`;
    }
  }
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

function boundedInteger(value: DataValue, fallback: number, minimum = 0): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum
    ? value
    : fallback;
}

function tableNodeDatum(item: NodeDatumBounds): DataRow {
  return publicDatum({ ...item.datum, ...(item.tooltip ?? {}) });
}

function tableColumn(item: NodeDatumBounds): SemanticTableColumn | null {
  const datum = tableNodeDatum(item);
  if (datum.kind !== 'table-header') return null;
  if (typeof datum.field !== 'string' || typeof datum.header !== 'string') return null;
  const column = boundedInteger(datum.column, -1);
  if (column < 0) return null;
  return {
    column,
    field: boundedText(datum.field, 120),
    header: boundedText(datum.header, 240),
  };
}

function tableCell(item: NodeDatumBounds): SemanticTableCell | null {
  const datum = tableNodeDatum(item);
  if (typeof datum.tableField !== 'string') return null;
  const row = boundedInteger(datum.tableRow, -1);
  const column = boundedInteger(datum.tableColumn, -1);
  if (row < 0 || column < 0) return null;
  const value = datum.cellValue;
  const formatted =
    typeof datum.cellFormatted === 'string'
      ? datum.cellFormatted
      : typeof datum.formatted === 'string'
        ? datum.formatted
        : boundedText(value, 512);
  return {
    row,
    column,
    field: boundedText(datum.tableField, 120),
    value,
    formatted: boundedText(formatted, 512),
    rowSpan: boundedInteger(datum.rowSpan, 1, 1),
    columnSpan: boundedInteger(datum.columnSpan, 1, 1),
  };
}

function tableCellBounds(item: NodeDatumBounds, cell: SemanticTableCell, tableRow: number): Rect {
  if (cell.rowSpan <= 1) return item.bounds;
  const height = item.bounds.height / cell.rowSpan;
  return {
    x: item.bounds.x,
    y: item.bounds.y + (tableRow - cell.row) * height,
    width: item.bounds.width,
    height,
  };
}

function tableSemanticRows(
  layer: LayerData,
  layerNodes: readonly NodeDatumBounds[],
  maxRows: number,
  locale?: string,
): readonly SemanticMark[] | null {
  const columns = layerNodes
    .map(tableColumn)
    .filter((column): column is SemanticTableColumn => column !== null)
    .sort((left, right) => left.column - right.column);
  const cells = layerNodes
    .map((item) => ({ item, cell: tableCell(item) }))
    .filter(
      (entry): entry is { readonly item: NodeDatumBounds; readonly cell: SemanticTableCell } =>
        entry.cell !== null,
    )
    .sort((left, right) => left.cell.row - right.cell.row || left.cell.column - right.cell.column);
  if (cells.length === 0) return null;

  let totalRows = 0;
  const visibleRowSet = new Set<number>();
  for (const { item, cell } of cells) {
    totalRows = Math.max(
      totalRows,
      cell.row + cell.rowSpan,
      boundedInteger(tableNodeDatum(item).totalRows, cell.row + cell.rowSpan, 1),
    );
    const end = Math.min(cell.row + cell.rowSpan, cell.row + maxRows);
    for (let row = cell.row; row < end && visibleRowSet.size < maxRows; row += 1) {
      visibleRowSet.add(row);
    }
  }
  const visibleRows = [...visibleRowSet].sort((left, right) => left - right);
  const anchorsByRow = new Map<
    number,
    { readonly item: NodeDatumBounds; readonly cell: SemanticTableCell }[]
  >();
  const coveringByRow = new Map<
    number,
    { readonly item: NodeDatumBounds; readonly cell: SemanticTableCell }[]
  >();
  const finalVisibleRow = visibleRows[visibleRows.length - 1] ?? -1;
  for (const entry of cells) {
    if (visibleRowSet.has(entry.cell.row)) {
      const anchors = anchorsByRow.get(entry.cell.row) ?? [];
      anchors.push(entry);
      anchorsByRow.set(entry.cell.row, anchors);
    }
    const end = Math.min(entry.cell.row + entry.cell.rowSpan, finalVisibleRow + 1);
    for (let row = entry.cell.row; row < end; row += 1) {
      if (!visibleRowSet.has(row)) continue;
      const covering = coveringByRow.get(row) ?? [];
      covering.push(entry);
      coveringByRow.set(row, covering);
    }
  }

  return visibleRows.map((tableRow) => {
    const anchors = anchorsByRow.get(tableRow) ?? [];
    const covering = coveringByRow.get(tableRow) ?? [];
    const representative = anchors[0] ?? covering[0]!;
    const datum: DataRow = Object.fromEntries(covering.map(({ cell }) => [cell.field, cell.value]));
    const formattedValues = Object.fromEntries(
      covering.map(({ cell }) => [cell.field, cell.formatted]),
    );
    const bounds = covering
      .map(({ item, cell }) => tableCellBounds(item, cell, tableRow))
      .reduce(unionBounds, tableCellBounds(representative.item, representative.cell, tableRow));
    const visible = covering.some(({ item }) => item.visible);
    const label = boundedText(
      `${layer.layer.name}. Row ${tableRow + 1}. ${columns
        .flatMap(({ field, header }) => {
          const formatted = formattedValues[field];
          return formatted === undefined ? [] : [`${header}: ${formatted}`];
        })
        .join('. ')}.`,
    );
    return {
      id: `${layer.layer.id}:table-row:${tableRow}`,
      viewId: 'plot',
      layerId: layer.layer.id,
      rowIndex: representative.item.rowIndex,
      role: 'table',
      channels: channels(layer, datum, locale),
      datum,
      lineage: lineageFor(layer, representative.item.rowIndex, false, representative.item.tooltip),
      bounds,
      visible: layer.layer.visible && visible,
      label,
      tableRow: {
        row: tableRow,
        totalRows,
        columns,
        cells: anchors.map(({ cell }) => cell),
        formattedValues,
      },
    };
  });
}

function derivedSemanticDatum(layer: LayerData, datum: DataRow, tooltip: DataRow): DataRow {
  const row = publicDatum({ ...datum, ...tooltip });
  if (layer.layer.mark.type !== 'timeline' || layer.xType !== 'temporal') return row;

  // Timeline keeps numeric start/end values in its public scene datum for API
  // compatibility and authored date-only strings in its tooltip. The semantic
  // sidecar is display-facing, so expose both derived bounds as real instants
  // without changing either public contract.
  return Object.fromEntries(
    Object.entries(row).map(([field, value]) => {
      if (field !== 'start' && field !== 'end') return [field, value];
      return [field, parseTemporalValue(value)?.value ?? value];
    }),
  );
}

function channels(layer: LayerData, row: DataRow, locale?: string): SemanticMark['channels'] {
  const xValue = row[layer.layer.x.field];
  const yValue = row[layer.layer.y.field];
  const xFormat = layer.layer.x.axis === false ? undefined : layer.layer.x.axis.format;
  const yFormat = layer.layer.y.axis === false ? undefined : layer.layer.y.axis.format;
  return {
    x: {
      field: layer.layer.x.field,
      value: xValue,
      type: layer.xType,
      displayValue: formatValue(xValue, locale, layer.xType, xFormat),
    },
    y: {
      field: layer.layer.y.field,
      value: yValue,
      type: layer.yType,
      displayValue: formatValue(yValue, locale, layer.yType, yFormat),
    },
  };
}

function semanticLabel(layer: LayerData, row: DataRow, locale?: string): string {
  const x = channels(layer, row, locale).x!;
  const y = channels(layer, row, locale).y!;
  return boundedText(
    `${layer.layer.name}. ${layer.layer.x.title}: ${x.displayValue ?? formatValue(x.value, locale, x.type)}. ${layer.layer.y.title}: ${y.displayValue ?? formatValue(y.value, locale, y.type)}.`,
  );
}

function accessibleValue(mark: SemanticMark, field: string, value: DataValue): DataValue {
  const tableFormatted = mark.tableRow?.formattedValues[field];
  if (tableFormatted !== undefined) return tableFormatted;
  const temporal = Object.values(mark.channels).some(
    (channel) => channel?.field === field && channel.type === 'temporal',
  );
  const channelDisplay = Object.values(mark.channels).find(
    (channel) => channel?.field === field,
  )?.displayValue;
  if (temporal && channelDisplay !== undefined) return channelDisplay;
  if (!temporal && !(value instanceof Date)) return value;
  return temporalISOText(value) ?? value;
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
    if (layer.layer.mark.type === 'table') {
      const tableRows = tableSemanticRows(layer, layerNodes, maxRows, locale);
      if (tableRows !== null) return tableRows;
    }
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
        channels: channels(layer, row, locale),
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
      // Preserve source fields for accessible navigation while letting truthful
      // compiler-derived values replace fields with the same name.
      const row = derivedSemanticDatum(layer, item.datum, item.tooltip);
      records.push({
        id: `${item.nodeId}:derived`,
        viewId: 'plot',
        layerId: layer.layer.id,
        rowIndex: item.rowIndex,
        role: `${layer.layer.mark.type}-aggregate`,
        channels: channels(layer, row, locale),
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
    displayValues: Object.fromEntries(
      Object.entries(mark.datum)
        .slice(0, tableColumnLimit)
        .map(([field, value]) => {
          const display = accessibleValue(mark, field, value);
          return [
            field,
            display instanceof Date ? display.toISOString() : String(display ?? '\u2014'),
          ];
        }),
    ),
    visible: mark.visible,
  }));
}
