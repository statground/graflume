import { GraflumeError } from '../core/errors.js';

function finite(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new GraflumeError('INVALID_DATA', `${path} must be a finite number.`, { path });
  }
  return value;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function text(value: string, path: string): string {
  const normalized = value.trim();
  if (normalized === '')
    throw new GraflumeError('INVALID_DATA', `${path} must be non-empty.`, { path });
  return normalized;
}

export interface HeatmapDatum {
  readonly row: string | number;
  readonly column: string | number;
  readonly value: number | null;
  readonly x0?: number;
  readonly x1?: number;
  readonly y0?: number;
  readonly y1?: number;
}

export interface HeatmapMatrixInput {
  readonly values: readonly (readonly (number | null)[])[];
  readonly rows?: readonly (string | number)[];
  readonly columns?: readonly (string | number)[];
  /** Optional data-coordinate extent for each matrix column. */
  readonly xExtents?: readonly (readonly [number, number])[];
  /** Optional data-coordinate extent for each matrix row. */
  readonly yExtents?: readonly (readonly [number, number])[];
}

export type HeatmapColorMode = 'sequential' | 'diverging' | 'log' | 'symlog' | 'quantile';

export interface HeatmapOptions {
  readonly rowOrder?: readonly (string | number)[];
  readonly columnOrder?: readonly (string | number)[];
  readonly color?: HeatmapColorMode;
  readonly midpoint?: number;
  readonly missing?: { readonly color?: string; readonly pattern?: 'cross' | 'dots' | 'stripes' };
}

export interface HeatmapCell {
  readonly row: string | number;
  readonly column: string | number;
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly value: number | null;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly colorPosition: number | null;
  readonly missingPattern: 'cross' | 'dots' | 'stripes' | null;
}

export interface HeatmapMatrix {
  readonly rows: readonly (string | number)[];
  readonly columns: readonly (string | number)[];
  readonly values: readonly (readonly (number | null)[])[];
  readonly cells: readonly HeatmapCell[];
  readonly domain: readonly [number, number];
}

function identity(value: string | number): string {
  return `${typeof value}:${String(value)}`;
}

function orderedDomain(
  observed: readonly (string | number)[],
  authored: readonly (string | number)[] | undefined,
  path: string,
): (string | number)[] {
  const unique: (string | number)[] = [];
  const seen = new Set<string>();
  observed.forEach((value) => {
    const key = identity(value);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(value);
    }
  });
  if (authored === undefined) return unique;
  const authoredKeys = authored.map(identity);
  if (new Set(authoredKeys).size !== authored.length)
    throw new GraflumeError('INVALID_SPEC', `${path} contains duplicates.`);
  const missing = unique.filter((value) => !authoredKeys.includes(identity(value)));
  if (missing.length > 0) throw new GraflumeError('INVALID_SPEC', `${path} omits observed values.`);
  return [...authored];
}

function heatmapColorPosition(
  value: number,
  domain: readonly [number, number],
  mode: HeatmapColorMode,
  midpoint: number,
): number {
  const [minimum, maximum] = domain;
  if (maximum === minimum) return 0.5;
  if (mode === 'log') {
    if (minimum <= 0 || value <= 0)
      throw new GraflumeError('INVALID_DATA', 'Log heatmap colors require positive values.');
    return (Math.log(value) - Math.log(minimum)) / (Math.log(maximum) - Math.log(minimum));
  }
  if (mode === 'symlog') {
    const transform = (current: number) => Math.sign(current) * Math.log1p(Math.abs(current));
    return (transform(value) - transform(minimum)) / (transform(maximum) - transform(minimum));
  }
  if (mode === 'diverging') {
    if (value <= midpoint)
      return (0.5 * (value - minimum)) / Math.max(Number.EPSILON, midpoint - minimum);
    return 0.5 + (0.5 * (value - midpoint)) / Math.max(Number.EPSILON, maximum - midpoint);
  }
  return (value - minimum) / (maximum - minimum);
}

function matrixHeatmapRows(input: HeatmapMatrixInput): HeatmapDatum[] {
  const height = input.values.length;
  const width = height === 0 ? (input.columns?.length ?? 0) : input.values[0]!.length;
  input.values.forEach((row, index) => {
    if (row.length !== width)
      throw new GraflumeError('INVALID_DATA', 'Heatmap matrix rows must have equal length.', {
        path: `$.values[${index}]`,
      });
  });
  const rows = input.rows ?? Array.from({ length: height }, (_, index) => index);
  const columns = input.columns ?? Array.from({ length: width }, (_, index) => index);
  if (rows.length !== height)
    throw new GraflumeError('INVALID_DATA', 'Heatmap matrix row labels must match its height.', {
      path: '$.rows',
    });
  if (columns.length !== width)
    throw new GraflumeError('INVALID_DATA', 'Heatmap matrix column labels must match its width.', {
      path: '$.columns',
    });
  if (new Set(rows.map(identity)).size !== rows.length)
    throw new GraflumeError('INVALID_DATA', 'Heatmap matrix row labels must be unique.', {
      path: '$.rows',
    });
  if (new Set(columns.map(identity)).size !== columns.length)
    throw new GraflumeError('INVALID_DATA', 'Heatmap matrix column labels must be unique.', {
      path: '$.columns',
    });
  if (input.xExtents !== undefined && input.xExtents.length !== width)
    throw new GraflumeError('INVALID_DATA', 'Heatmap xExtents must match matrix width.', {
      path: '$.xExtents',
    });
  if (input.yExtents !== undefined && input.yExtents.length !== height)
    throw new GraflumeError('INVALID_DATA', 'Heatmap yExtents must match matrix height.', {
      path: '$.yExtents',
    });
  return input.values.flatMap((values, rowIndex) =>
    values.map((rawValue, columnIndex) => {
      const value =
        rawValue === null ? null : finite(rawValue, `$.values[${rowIndex}][${columnIndex}]`);
      const xExtent = input.xExtents?.[columnIndex];
      const yExtent = input.yExtents?.[rowIndex];
      return {
        row: rows[rowIndex]!,
        column: columns[columnIndex]!,
        value,
        ...(xExtent === undefined ? {} : { x0: xExtent[0], x1: xExtent[1] }),
        ...(yExtent === undefined ? {} : { y0: yExtent[0], y1: yExtent[1] }),
      };
    }),
  );
}

function inferredHeatmapExtents(
  data: readonly HeatmapDatum[],
  axis: 'x' | 'y',
): ReadonlyMap<string, readonly [number, number]> {
  const output = new Map<string, readonly [number, number]>();
  data.forEach((datum, index) => {
    const start = axis === 'x' ? datum.x0 : datum.y0;
    const end = axis === 'x' ? datum.x1 : datum.y1;
    if (start === undefined && end === undefined) return;
    if (start === undefined || end === undefined)
      throw new GraflumeError(
        'INVALID_DATA',
        `Heatmap ${axis} extents require both ${axis}0 and ${axis}1.`,
        { path: `$.data[${index}]` },
      );
    const low = finite(start, `$.data[${index}].${axis}0`);
    const high = finite(end, `$.data[${index}].${axis}1`);
    if (high <= low)
      throw new GraflumeError('INVALID_DATA', 'Heatmap cell extents must be ascending.', {
        path: `$.data[${index}]`,
      });
    const key = identity(axis === 'x' ? datum.column : datum.row);
    const previous = output.get(key);
    if (previous !== undefined && (previous[0] !== low || previous[1] !== high))
      throw new GraflumeError(
        'INVALID_DATA',
        `Heatmap ${axis} extent must be consistent for each ${axis === 'x' ? 'column' : 'row'}.`,
        { path: `$.data[${index}]` },
      );
    output.set(key, [low, high]);
  });
  return output;
}

/** Pivots long-form heatmap rows into a matrix with irregular extents, explicit NA pattern and color contracts. */
export function buildHeatmapMatrix(
  input: readonly HeatmapDatum[] | HeatmapMatrixInput,
  options: HeatmapOptions = {},
): HeatmapMatrix {
  const data: readonly HeatmapDatum[] = Array.isArray(input)
    ? input
    : matrixHeatmapRows(input as HeatmapMatrixInput);
  const rows = orderedDomain(
    data.map(({ row }) => row),
    options.rowOrder,
    '$.rowOrder',
  );
  const columns = orderedDomain(
    data.map(({ column }) => column),
    options.columnOrder,
    '$.columnOrder',
  );
  const rowIndex = new Map(rows.map((value, index) => [identity(value), index]));
  const columnIndex = new Map(columns.map((value, index) => [identity(value), index]));
  const matrix = rows.map(() => columns.map((): number | null => null));
  const byCell = new Map<string, HeatmapDatum>();
  data.forEach((datum, index) => {
    const key = `${identity(datum.row)}\u0000${identity(datum.column)}`;
    if (byCell.has(key))
      throw new GraflumeError('INVALID_DATA', `Duplicate heatmap cell at row ${index}.`);
    if (datum.value !== null) finite(datum.value, `$.data[${index}].value`);
    byCell.set(key, datum);
    matrix[rowIndex.get(identity(datum.row))!]![columnIndex.get(identity(datum.column))!] =
      datum.value;
  });
  const numeric = data.flatMap(({ value }) => (value === null ? [] : [value]));
  const domain: readonly [number, number] =
    numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)];
  const mode = options.color ?? 'sequential';
  const midpoint = finite(options.midpoint ?? 0, '$.midpoint');
  const sorted = [...numeric].sort((a, b) => a - b);
  const columnExtents = inferredHeatmapExtents(data, 'x');
  const rowExtents = inferredHeatmapExtents(data, 'y');
  const quantilePosition = (value: number) => {
    let upper = sorted.findIndex((current) => current > value);
    if (upper < 0) upper = sorted.length;
    return sorted.length <= 1 ? 0.5 : clamp((upper - 1) / (sorted.length - 1), 0, 1);
  };
  const cells = rows.flatMap((row, r) =>
    columns.map((column, c): HeatmapCell => {
      const datum = byCell.get(`${identity(row)}\u0000${identity(column)}`);
      const value = datum?.value ?? null;
      const inferredX = columnExtents.get(identity(column));
      const inferredY = rowExtents.get(identity(row));
      const x0 =
        datum?.x0 === undefined ? (inferredX?.[0] ?? c) : finite(datum.x0, `$.data[${r}].x0`);
      const x1 =
        datum?.x1 === undefined ? (inferredX?.[1] ?? c + 1) : finite(datum.x1, `$.data[${r}].x1`);
      const y0 =
        datum?.y0 === undefined ? (inferredY?.[0] ?? r) : finite(datum.y0, `$.data[${r}].y0`);
      const y1 =
        datum?.y1 === undefined ? (inferredY?.[1] ?? r + 1) : finite(datum.y1, `$.data[${r}].y1`);
      if (x1 <= x0 || y1 <= y0)
        throw new GraflumeError('INVALID_DATA', 'Heatmap cell extents must be ascending.');
      return {
        row,
        column,
        rowIndex: r,
        columnIndex: c,
        value,
        x0,
        x1,
        y0,
        y1,
        colorPosition:
          value === null
            ? null
            : clamp(
                mode === 'quantile'
                  ? quantilePosition(value)
                  : heatmapColorPosition(value, domain, mode, midpoint),
                0,
                1,
              ),
        missingPattern: value === null ? (options.missing?.pattern ?? 'cross') : null,
      };
    }),
  );
  return { rows, columns, values: matrix, cells, domain };
}

/** Selects row, column or cell heatmap regions for linked brushes. */
export function brushHeatmap(
  matrix: HeatmapMatrix,
  brush: {
    readonly rows?: readonly (string | number)[];
    readonly columns?: readonly (string | number)[];
    readonly value?: readonly [number, number];
  },
): readonly HeatmapCell[] {
  const rowKeys = new Set(brush.rows?.map(identity));
  const columnKeys = new Set(brush.columns?.map(identity));
  const low = brush.value === undefined ? -Infinity : Math.min(brush.value[0], brush.value[1]);
  const high = brush.value === undefined ? Infinity : Math.max(brush.value[0], brush.value[1]);
  return matrix.cells.filter(
    (cell) =>
      (rowKeys.size === 0 || rowKeys.has(identity(cell.row))) &&
      (columnKeys.size === 0 || columnKeys.has(identity(cell.column))) &&
      cell.value !== null &&
      cell.value >= low &&
      cell.value <= high,
  );
}

export type ImageResampling = 'nearest' | 'bilinear' | 'bicubic';
export type ImageOrigin = 'upper' | 'lower';

export interface RasterImage {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
  readonly values: readonly number[];
  readonly extent?: readonly [number, number, number, number];
  readonly origin?: ImageOrigin;
}

export interface ImageMappingOptions {
  readonly window?: readonly [number, number];
  readonly colormap?: readonly string[];
  readonly alpha?: number;
}

function rasterDimensions(image: RasterImage): { width: number; height: number; channels: number } {
  const width = Math.floor(finite(image.width, '$.width'));
  const height = Math.floor(finite(image.height, '$.height'));
  const channels = Math.floor(finite(image.channels, '$.channels'));
  if (width < 1 || height < 1 || channels < 1 || channels > 4)
    throw new GraflumeError('INVALID_DATA', 'Raster dimensions and channel count are invalid.');
  if (image.values.length !== width * height * channels)
    throw new GraflumeError('INVALID_DATA', 'Raster values length does not match dimensions.');
  image.values.forEach((value, index) => finite(value, `$.values[${index}]`));
  return { width, height, channels };
}

function cubicWeight(value: number): number {
  const absolute = Math.abs(value);
  if (absolute <= 1) return (1.5 * absolute - 2.5) * absolute * absolute + 1;
  if (absolute < 2) return ((-0.5 * absolute + 2.5) * absolute - 4) * absolute + 2;
  return 0;
}

/** Samples raster pixels in data coordinates with upper/lower origin and nearest/bilinear/bicubic filters. */
export function sampleRaster(
  image: RasterImage,
  x: number,
  y: number,
  resampling: ImageResampling = 'nearest',
): readonly number[] {
  const { width, height, channels } = rasterDimensions(image);
  const extent = image.extent ?? [0, width, 0, height];
  extent.forEach((value, index) => finite(value, `$.extent[${index}]`));
  if (extent[1] === extent[0] || extent[3] === extent[2])
    throw new GraflumeError('INVALID_DATA', 'Raster extent must have non-zero width and height.');
  // Extents describe the outer pixel edges. Mapping the center of each output cell to
  // `index + 0.5` therefore lands exactly on an input pixel center at matching resolution.
  const px = ((finite(x, '$.x') - extent[0]) / (extent[1] - extent[0])) * width - 0.5;
  const normalizedY = ((finite(y, '$.y') - extent[2]) / (extent[3] - extent[2])) * height - 0.5;
  const py = (image.origin ?? 'upper') === 'upper' ? height - 1 - normalizedY : normalizedY;
  const valueAt = (column: number, row: number, channel: number) =>
    image.values[
      (clamp(row, 0, height - 1) * width + clamp(column, 0, width - 1)) * channels + channel
    ]!;
  if (resampling === 'nearest')
    return Array.from({ length: channels }, (_, channel) =>
      valueAt(Math.round(px), Math.round(py), channel),
    );
  if (resampling === 'bilinear') {
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const fx = px - x0;
    const fy = py - y0;
    return Array.from(
      { length: channels },
      (_, channel) =>
        valueAt(x0, y0, channel) * (1 - fx) * (1 - fy) +
        valueAt(x0 + 1, y0, channel) * fx * (1 - fy) +
        valueAt(x0, y0 + 1, channel) * (1 - fx) * fy +
        valueAt(x0 + 1, y0 + 1, channel) * fx * fy,
    );
  }
  return Array.from({ length: channels }, (_, channel) => {
    let total = 0;
    let weight = 0;
    for (let row = Math.floor(py) - 1; row <= Math.floor(py) + 2; row += 1)
      for (let column = Math.floor(px) - 1; column <= Math.floor(px) + 2; column += 1) {
        const current = cubicWeight(px - column) * cubicWeight(py - row);
        total += valueAt(column, row, channel) * current;
        weight += current;
      }
    return weight === 0 ? 0 : total / weight;
  });
}

function parseHex(color: string): readonly [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (match === null)
    throw new GraflumeError('INVALID_SPEC', `Unsupported colormap color "${color}".`);
  return [
    Number.parseInt(match[1]!.slice(0, 2), 16),
    Number.parseInt(match[1]!.slice(2, 4), 16),
    Number.parseInt(match[1]!.slice(4, 6), 16),
  ];
}

/** Applies scalar window/level, colormap, alpha and RGB/RGBA channel compositing. */
export function mapRasterColor(
  channels: readonly number[],
  options: ImageMappingOptions = {},
): readonly [number, number, number, number] {
  if (channels.length < 1 || channels.length > 4)
    throw new GraflumeError('INVALID_DATA', 'Raster samples need one to four channels.');
  channels.forEach((value, index) => finite(value, `$.channels[${index}]`));
  const alpha = clamp(finite(options.alpha ?? 1, '$.alpha'), 0, 1);
  if (channels.length >= 3)
    return [
      clamp(channels[0]!, 0, 255),
      clamp(channels[1]!, 0, 255),
      clamp(channels[2]!, 0, 255),
      alpha * (channels.length === 4 ? clamp(channels[3]!, 0, 255) / 255 : 1),
    ];
  const window = options.window ?? [0, 255];
  const windowLow = finite(window[0], '$.window[0]');
  const windowHigh = finite(window[1], '$.window[1]');
  if (windowHigh <= windowLow)
    throw new GraflumeError('INVALID_SPEC', 'Raster window must be finite and ascending.', {
      path: '$.window',
    });
  const position = clamp((channels[0]! - windowLow) / (windowHigh - windowLow), 0, 1);
  const authoredColors = options.colormap ?? ['#000000', '#ffffff'];
  if (authoredColors.length === 0)
    throw new GraflumeError('INVALID_SPEC', 'Raster colormap must contain at least one color.', {
      path: '$.colormap',
    });
  const colors = authoredColors.map(parseHex);
  if (colors.length === 1) return [...colors[0]!, alpha];
  const scaled = position * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const ratio = scaled - index;
  const first = colors[index]!;
  const second = colors[index + 1] ?? first;
  return [
    first[0] + (second[0] - first[0]) * ratio,
    first[1] + (second[1] - first[1]) * ratio,
    first[2] + (second[2] - first[2]) * ratio,
    alpha,
  ];
}

export interface TernaryDatum {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly id?: string;
}

export interface TernaryOptions {
  readonly sum?: number;
  readonly policy?: 'reject' | 'normalize';
  readonly tolerance?: number;
  readonly ticks?: number;
  readonly format?: (value: number) => string;
  readonly tickFormat?: (value: number) => string;
}

export interface TernaryPoint {
  readonly id: string;
  readonly raw: readonly [number, number, number];
  readonly normalized: readonly [number, number, number];
  readonly x: number;
  readonly y: number;
  readonly tooltip: string;
}

/** Validates or normalizes constant-sum components and resolves barycentric coordinates, ticks and dual tooltips. */
export function projectTernary(data: readonly TernaryDatum[], options: TernaryOptions = {}) {
  const target = finite(options.sum ?? 1, '$.sum');
  if (target <= 0) throw new GraflumeError('INVALID_SPEC', '$.sum must be positive.');
  const tolerance = Math.max(0, finite(options.tolerance ?? target * 1e-9, '$.tolerance'));
  const format = options.format ?? ((value: number) => String(Number(value.toPrecision(6))));
  const points = data.map((datum, index): TernaryPoint => {
    const raw = [
      finite(datum.a, `$.data[${index}].a`),
      finite(datum.b, `$.data[${index}].b`),
      finite(datum.c, `$.data[${index}].c`),
    ] as const;
    if (raw.some((value) => value < 0))
      throw new GraflumeError('INVALID_DATA', 'Ternary components must be non-negative.');
    const sum = raw[0] + raw[1] + raw[2];
    if (sum <= 0)
      throw new GraflumeError('INVALID_DATA', 'Ternary component sum must be positive.');
    if ((options.policy ?? 'reject') === 'reject' && Math.abs(sum - target) > tolerance)
      throw new GraflumeError('INVALID_DATA', `Ternary row ${index} does not sum to ${target}.`);
    const normalized = [raw[0] / sum, raw[1] / sum, raw[2] / sum] as const;
    return {
      id: datum.id?.trim() || `ternary-${index}`,
      raw,
      normalized,
      x: normalized[1] + normalized[2] * 0.5,
      y: 1 - (normalized[2] * Math.sqrt(3)) / 2,
      tooltip: `raw (${raw.map(format).join(', ')}) · normalized (${normalized.map(format).join(', ')})`,
    };
  });
  const tickCount = clamp(Math.floor(options.ticks ?? 5), 2, 20);
  const tickFormat = options.tickFormat ?? format;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => ({
    value: (target * index) / tickCount,
    label: tickFormat((target * index) / tickCount),
  }));
  return { sum: target, points, axes: { a: ticks, b: ticks, c: ticks } };
}

export type SmithInputMode = 'reflection' | 'z' | 'y' | 's';

export interface ComplexValue {
  readonly real: number;
  readonly imaginary: number;
}
export interface SmithDatum {
  readonly id?: string;
  readonly real: number;
  readonly imaginary: number;
}

export interface SmithOptions {
  readonly mode?: SmithInputMode;
  readonly referenceImpedance?: number;
  readonly grid?: 'impedance' | 'admittance' | 'combined';
}

function complexDivide(a: ComplexValue, b: ComplexValue): ComplexValue {
  const denominator = b.real * b.real + b.imaginary * b.imaginary;
  if (denominator === 0) throw new GraflumeError('INVALID_DATA', 'Complex division by zero.');
  return {
    real: (a.real * b.real + a.imaginary * b.imaginary) / denominator,
    imaginary: (a.imaginary * b.real - a.real * b.imaginary) / denominator,
  };
}

/** Converts S/reflection, Z and Y inputs to the Smith reflection plane with reference impedance and specialist labels. */
export function projectSmith(data: readonly SmithDatum[], options: SmithOptions = {}) {
  const reference = finite(options.referenceImpedance ?? 50, '$.referenceImpedance');
  if (reference <= 0)
    throw new GraflumeError('INVALID_SPEC', '$.referenceImpedance must be positive.');
  const mode = options.mode ?? 'reflection';
  const points = data.map((datum, index) => {
    const input = {
      real: finite(datum.real, `$.data[${index}].real`),
      imaginary: finite(datum.imaginary, `$.data[${index}].imaginary`),
    };
    let normalized: ComplexValue;
    let openCircuit = false;
    let reflection: ComplexValue;
    if (mode === 'reflection' || mode === 's') {
      reflection = input;
      const onePlus = { real: 1 + input.real, imaginary: input.imaginary };
      const oneMinus = { real: 1 - input.real, imaginary: -input.imaginary };
      if (oneMinus.real === 0 && oneMinus.imaginary === 0) {
        normalized = { real: 0, imaginary: 0 };
        openCircuit = true;
      } else normalized = complexDivide(onePlus, oneMinus);
    } else if (mode === 'z') {
      normalized = { real: input.real / reference, imaginary: input.imaginary / reference };
      reflection = complexDivide(
        { real: normalized.real - 1, imaginary: normalized.imaginary },
        { real: normalized.real + 1, imaginary: normalized.imaginary },
      );
    } else {
      const normalizedAdmittance = {
        real: input.real * reference,
        imaginary: input.imaginary * reference,
      };
      if (normalizedAdmittance.real === 0 && normalizedAdmittance.imaginary === 0) {
        normalized = { real: 0, imaginary: 0 };
        reflection = { real: 1, imaginary: 0 };
        openCircuit = true;
      } else {
        normalized = complexDivide({ real: 1, imaginary: 0 }, normalizedAdmittance);
        reflection = complexDivide(
          { real: normalized.real - 1, imaginary: normalized.imaginary },
          { real: normalized.real + 1, imaginary: normalized.imaginary },
        );
      }
    }
    return {
      id: datum.id?.trim() || `smith-${index}`,
      input,
      normalized: openCircuit ? null : normalized,
      openCircuit,
      reflection,
      x: reflection.real,
      y: reflection.imaginary,
      magnitude: Math.hypot(reflection.real, reflection.imaginary),
      phase: Math.atan2(reflection.imaginary, reflection.real),
      tooltip: `${mode.toUpperCase()} ${input.real}${input.imaginary < 0 ? '' : '+'}${input.imaginary}j · z ${openCircuit ? '∞' : `${normalized.real}${normalized.imaginary < 0 ? '' : '+'}${normalized.imaginary}j`} · Γ ${reflection.real}${reflection.imaginary < 0 ? '' : '+'}${reflection.imaginary}j`,
    };
  });
  const values = [0, 0.2, 0.5, 1, 2, 5];
  return {
    mode,
    grid: options.grid ?? 'impedance',
    referenceImpedance: reference,
    points,
    labels: {
      resistance: values.map((value) => ({ value, label: `r=${value}` })),
      reactance: values.slice(1).flatMap((value) => [
        { value, label: `+j${value}` },
        { value: -value, label: `-j${value}` },
      ]),
      conductance: values.map((value) => ({ value, label: `g=${value}` })),
      susceptance: values.slice(1).flatMap((value) => [
        { value, label: `+jb${value}` },
        { value: -value, label: `-jb${value}` },
      ]),
    },
  };
}

export interface CarpetGrid {
  readonly a: readonly number[];
  readonly b: readonly number[];
  readonly x: readonly (readonly number[])[];
  readonly y: readonly (readonly number[])[];
  readonly mask?: readonly (readonly boolean[])[];
}

export interface CarpetPoint {
  readonly a: number;
  readonly b: number;
  readonly id?: string;
}

function bracket(
  values: readonly number[],
  target: number,
  path: string,
): readonly [number, number, number] {
  if (
    values.length < 2 ||
    values.some(
      (value, index) => !Number.isFinite(value) || (index > 0 && value <= values[index - 1]!),
    )
  )
    throw new GraflumeError('INVALID_DATA', `${path} must be strictly ascending.`);
  if (target < values[0]! || target > values.at(-1)!)
    throw new GraflumeError('INVALID_DATA', `${path} value is outside the logical grid.`);
  let upper = values.findIndex((value) => value >= target);
  if (upper <= 0) upper = 1;
  const lower = upper - 1;
  return [lower, upper, (target - values[lower]!) / (values[upper]! - values[lower]!)] as const;
}

/** Projects irregular logical a/b carpet coordinates, honors masks and retains dual logical/projected tooltips. */
export function projectCarpet(grid: CarpetGrid, points: readonly CarpetPoint[]) {
  if (
    grid.x.length !== grid.b.length ||
    grid.y.length !== grid.b.length ||
    grid.x.some((row) => row.length !== grid.a.length) ||
    grid.y.some((row) => row.length !== grid.a.length)
  )
    throw new GraflumeError('INVALID_DATA', 'Carpet x/y grid dimensions must be b by a.');
  if (
    grid.mask !== undefined &&
    (grid.mask.length !== grid.b.length ||
      grid.mask.some(
        (row) => row.length !== grid.a.length || row.some((value) => typeof value !== 'boolean'),
      ))
  )
    throw new GraflumeError('INVALID_DATA', 'Carpet mask dimensions must be b by a booleans.');
  const projected = points.map((point, index) => {
    const a = finite(point.a, `$.points[${index}].a`);
    const b = finite(point.b, `$.points[${index}].b`);
    const [a0, a1, fa] = bracket(grid.a, a, '$.grid.a');
    const [b0, b1, fb] = bracket(grid.b, b, '$.grid.b');
    const masked = [
      grid.mask?.[b0]?.[a0],
      grid.mask?.[b0]?.[a1],
      grid.mask?.[b1]?.[a0],
      grid.mask?.[b1]?.[a1],
    ].some((value) => value === false);
    const interpolate = (values: readonly (readonly number[])[]) => {
      const top =
        finite(values[b0]![a0], '$.grid') * (1 - fa) + finite(values[b0]![a1], '$.grid') * fa;
      const bottom =
        finite(values[b1]![a0], '$.grid') * (1 - fa) + finite(values[b1]![a1], '$.grid') * fa;
      return top * (1 - fb) + bottom * fb;
    };
    const x = interpolate(grid.x);
    const y = interpolate(grid.y);
    return {
      id: point.id?.trim() || `carpet-${index}`,
      logical: { a, b },
      projected: { x, y },
      masked,
      tooltip: `a=${a}, b=${b} · x=${x}, y=${y}`,
    };
  });
  return {
    points: projected,
    ticks: {
      a: grid.a.map((value) => ({ value, label: String(value) })),
      b: grid.b.map((value) => ({ value, label: String(value) })),
    },
  };
}

export interface ItemGroup {
  readonly id: string;
  readonly value: number;
}
export interface ItemLayoutOptions {
  readonly mode?: 'waffle' | 'isotype';
  readonly unit?: number;
  readonly columns?: number;
  readonly direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  readonly partial?: 'fraction' | 'round' | 'floor' | 'ceil';
}

export interface ItemUnit {
  readonly index: number;
  readonly group: string;
  readonly amount: number;
  readonly fraction: number;
  readonly row: number;
  readonly column: number;
  readonly accessibleLabel: string;
}

/** Expands waffle/isotype counts into grouped units with partial-unit and fill-direction semantics. */
export function layoutItems(groups: readonly ItemGroup[], options: ItemLayoutOptions = {}) {
  const unit = finite(options.unit ?? 1, '$.unit');
  if (unit <= 0) throw new GraflumeError('INVALID_SPEC', '$.unit must be positive.');
  const columns = clamp(Math.floor(options.columns ?? 10), 1, 1_000);
  const expanded: Omit<ItemUnit, 'row' | 'column'>[] = [];
  groups.forEach((group, groupIndex) => {
    const id = text(group.id, `$.groups[${groupIndex}].id`);
    const value = finite(group.value, `$.groups[${groupIndex}].value`);
    if (value < 0) throw new GraflumeError('INVALID_DATA', 'Item values must be non-negative.');
    const exact = value / unit;
    const count =
      options.partial === 'floor'
        ? Math.floor(exact)
        : options.partial === 'ceil'
          ? Math.ceil(exact)
          : options.partial === 'round'
            ? Math.round(exact)
            : Math.ceil(exact);
    for (let index = 0; index < count; index += 1) {
      const fraction =
        options.partial === 'fraction' || options.partial === undefined
          ? clamp(exact - index, 0, 1)
          : 1;
      if (fraction <= 0) continue;
      const global = expanded.length;
      expanded.push({
        index: global,
        group: id,
        amount: Math.min(unit, Math.max(0, value - index * unit)),
        fraction,
        accessibleLabel: `${id}: ${Math.min(unit, Math.max(0, value - index * unit))} of ${value}`,
      });
    }
  });
  const direction = options.direction ?? 'row';
  const rows = Math.max(1, Math.ceil(expanded.length / columns));
  const output: ItemUnit[] = expanded.map((item, global) => {
    let row: number;
    let column: number;
    if (direction === 'column' || direction === 'column-reverse') {
      row = global % rows;
      column = Math.floor(global / rows);
      if (direction === 'column-reverse') row = rows - 1 - row;
    } else {
      row = Math.floor(global / columns);
      column = global % columns;
      if (direction === 'row-reverse') column = columns - 1 - column;
    }
    return { ...item, row, column };
  });
  return {
    mode: options.mode ?? 'waffle',
    unit,
    columns,
    units: output,
    summary: groups.map(({ id, value }) => `${id}: ${value}`).join('; '),
    total: groups.reduce((sum, { value }) => sum + value, 0),
  };
}

export interface ScatterMatrixOptions {
  readonly diagonal?: 'histogram' | 'kde' | 'ecdf';
  readonly upper?: 'scatter' | 'hexbin' | 'correlation' | 'none';
  readonly lower?: 'scatter' | 'hexbin' | 'correlation' | 'none';
  readonly variables?: readonly string[];
}

/** Creates an explicit upper/lower/diagonal scatter-matrix composition plan. */
export function scatterMatrixPlan(
  rows: readonly Readonly<Record<string, unknown>>[],
  options: ScatterMatrixOptions = {},
) {
  const variables =
    options.variables === undefined
      ? [
          ...new Set(
            rows.flatMap((row) =>
              Object.entries(row).flatMap(([field, value]) =>
                typeof value === 'number' && Number.isFinite(value) ? [field] : [],
              ),
            ),
          ),
        ]
      : options.variables.map((field, index) => text(field, `$.variables[${index}]`));
  if (variables.length < 2)
    throw new GraflumeError('INVALID_SPEC', 'Scatter matrix needs at least two numeric variables.');
  const cells = variables.flatMap((y, row) =>
    variables.map((x, column) => ({
      row,
      column,
      x,
      y,
      kind:
        row === column
          ? (options.diagonal ?? 'kde')
          : row < column
            ? (options.upper ?? 'scatter')
            : (options.lower ?? 'scatter'),
      linkedSelectionKey: 'scatter-matrix',
    })),
  );
  return { variables, cells };
}
