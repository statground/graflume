import type { MarkCompiler, MarkCompileContext } from '../compiler/types.js';
import {
  analyzeVectorField,
  contourField,
  type ContourFieldOptions,
  type IrregularScalarField,
  type RegularScalarField,
  type Vector2FieldOptions,
} from '../data/field-analytics.js';
import { nodeBase } from '../scene/factory.js';
import type { Point, SceneNode } from '../scene/types.js';
import { categoricalColor, colorWithOpacity } from '../theme/color.js';
import { numericDataValue } from './utils.js';

function stringOption(context: MarkCompileContext, name: string): string | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'string' ? value : undefined;
}

function numberOption(context: MarkCompileContext, name: string): number | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanOption(context: MarkCompileContext, name: string): boolean | undefined {
  const value = context.layer.mark.options[name];
  return typeof value === 'boolean' ? value : undefined;
}

function numberArrayOption(context: MarkCompileContext, name: string): number[] | undefined {
  const value = context.layer.mark.options[name];
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  )
    return undefined;
  return [...value];
}

function triangleOption(
  context: MarkCompileContext,
): Array<readonly [number, number, number]> | undefined {
  const value = context.layer.mark.options.triangles;
  if (
    !Array.isArray(value) ||
    !value.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 3 &&
        entry.every((index) => typeof index === 'number' && Number.isInteger(index)),
    )
  )
    return undefined;
  return value.map((entry) => [entry[0] as number, entry[1] as number, entry[2] as number]);
}

function scalarField(
  context: MarkCompileContext,
): RegularScalarField | IrregularScalarField | null {
  const { table, layer } = context;
  const valueField = layer.mark.fields.value ?? 'value';
  const rows: Array<{ x: number; y: number; value: number | null; rowIndex: number }> = [];
  for (let rowIndex = 0; rowIndex < table.length; rowIndex += 1) {
    const x = numericDataValue(table.value(rowIndex, layer.x.field));
    const y = numericDataValue(table.value(rowIndex, layer.y.field));
    const value = numericDataValue(table.value(rowIndex, valueField));
    if (x !== null && y !== null) rows.push({ x, y, value, rowIndex });
  }
  if (rows.length < 3) return null;
  const triangles = triangleOption(context);
  if (triangles !== undefined) {
    return {
      points: rows.flatMap(({ x, y, value, rowIndex }) =>
        value === null ? [] : [{ x, y, value, source: rowIndex }],
      ),
      triangles,
    };
  }
  const xs = [...new Set(rows.map(({ x }) => x))].sort((left, right) => left - right);
  const ys = [...new Set(rows.map(({ y }) => y))].sort((left, right) => left - right);
  if (xs.length * ys.length !== rows.length || xs.length < 2 || ys.length < 2) return null;
  const byPosition = new Map(rows.map((row) => [`${row.x}:${row.y}`, row]));
  return {
    width: xs.length,
    height: ys.length,
    x: xs,
    y: ys,
    values: ys.flatMap((y) => xs.map((x) => byPosition.get(`${x}:${y}`)?.value ?? null)),
    mask: ys.flatMap((y) => xs.map((x) => byPosition.get(`${x}:${y}`)?.value !== null)),
  };
}

function scalarExtent(
  field: RegularScalarField | IrregularScalarField,
): readonly [number, number, number, number] {
  if ('points' in field) {
    return [
      Math.min(...field.points.map(({ x }) => x)),
      Math.min(...field.points.map(({ y }) => y)),
      Math.max(...field.points.map(({ x }) => x)),
      Math.max(...field.points.map(({ y }) => y)),
    ];
  }
  return [
    Math.min(...(field.x ?? Array.from({ length: field.width }, (_, index) => index))),
    Math.min(...(field.y ?? Array.from({ length: field.height }, (_, index) => index))),
    Math.max(...(field.x ?? Array.from({ length: field.width }, (_, index) => index))),
    Math.max(...(field.y ?? Array.from({ length: field.height }, (_, index) => index))),
  ];
}

/** Regular/irregular contour compiler with filled bands, masks, holes, smoothing, and saddle policy. */
export const compileAdvancedContourMark: MarkCompiler = (context) => {
  const field = scalarField(context);
  if (field === null) return [];
  const thresholds = numberArrayOption(context, 'thresholds');
  const method = stringOption(context, 'thresholdMethod');
  const saddle = stringOption(context, 'saddle');
  const levels = numberOption(context, 'levels');
  const filled = booleanOption(context, 'filled');
  const smoothing = numberOption(context, 'smoothing');
  const options: ContourFieldOptions = {
    ...(thresholds === undefined ? {} : { thresholds }),
    ...(levels === undefined ? {} : { levels }),
    ...(method === 'quantile' ? { method } : method === 'linear' ? { method } : {}),
    ...(filled === undefined ? {} : { filled }),
    ...(smoothing === undefined ? {} : { smoothing }),
    ...(saddle === 'high' || saddle === 'low' || saddle === 'asymptotic' ? { saddle } : {}),
  };
  const result = contourField(field, options);
  const bounds = scalarExtent(field);
  const spanX = Math.max(Number.EPSILON, bounds[2] - bounds[0]);
  const spanY = Math.max(Number.EPSILON, bounds[3] - bounds[1]);
  const map = (point: { readonly x: number; readonly y: number }): Point => ({
    x: context.plot.x + ((point.x - bounds[0]) / spanX) * context.plot.width,
    y: context.plot.y + context.plot.height - ((point.y - bounds[1]) / spanY) * context.plot.height,
  });
  const nodes: SceneNode[] = [];
  const regularSourceRows =
    'points' in field
      ? undefined
      : Array.from({ length: context.table.length }, (_, index) => index);
  result.bands.forEach((band, index) => {
    const ratio = index / Math.max(1, result.bands.length - 1);
    const color = categoricalColor(context.theme, index, Math.max(2, result.bands.length));
    nodes.push({
      type: 'path',
      ...nodeBase(`${context.layer.id}:contour-band:${index}`, {
        zIndex: context.layer.zIndex,
        opacity: context.layer.mark.opacity,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: band.sourceTriangles[0] ?? index,
          datum: {
            low: band.low,
            high: band.high,
            sourceTriangles: [...band.sourceTriangles],
          },
          tooltip: {
            low: band.low,
            high: band.high,
            input: result.input,
            holes: band.holes.length,
            sourceTriangles: band.sourceTriangles.join(', '),
          },
        },
      }),
      points: band.outer.map(map),
      subpaths: band.holes.map((hole) => hole.map(map)),
      closed: true,
      fill: context.layer.mark.fill ?? colorWithOpacity(color, 0.3 + ratio * 0.5),
      fillRule: 'evenodd',
      stroke: context.layer.mark.stroke ?? color,
      lineWidth: Math.max(0.4, context.layer.mark.lineWidth ?? 0.8),
      lineJoin: 'round',
    });
  });
  result.isolines.forEach((line, index) => {
    const sourceRowIndices =
      line.sourceRows.length > 0 ? [...line.sourceRows] : (regularSourceRows ?? []);
    const color =
      context.layer.mark.stroke ?? categoricalColor(context.theme, index, result.isolines.length);
    nodes.push({
      type: 'path',
      ...nodeBase(`${context.layer.id}:contour-line:${line.levelIndex}:${index}`, {
        zIndex: context.layer.zIndex + 1,
        opacity: context.layer.mark.opacity,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: line.sourceRows[0] ?? index,
          datum: { level: line.level, sourceRows: sourceRowIndices },
          tooltip: {
            kind: 'scalar-isoline',
            level: line.level,
            closed: line.closed,
            input: result.input,
            sourceRows: sourceRowIndices.join(', '),
            sourceRowIndices,
          },
        },
      }),
      points: line.points.map(map),
      closed: line.closed,
      stroke: color,
      lineWidth: context.layer.mark.lineWidth ?? 1.6,
      lineCap: context.theme.mark.lineCap ?? 'round',
      lineJoin: context.theme.mark.lineJoin ?? 'round',
    });
  });
  return nodes;
};

function vectorData(context: MarkCompileContext) {
  const { table, layer } = context;
  const uField = layer.mark.fields.u ?? 'u';
  const vField = layer.mark.fields.v ?? 'v';
  const magnitudeField = layer.mark.fields.magnitude ?? 'magnitude';
  const directionField = layer.mark.fields.direction ?? 'direction';
  const idField = layer.mark.fields.id ?? 'id';
  return Array.from({ length: table.length }, (_, rowIndex) => {
    const x = numericDataValue(table.value(rowIndex, layer.x.field));
    const y = numericDataValue(table.value(rowIndex, layer.y.field));
    if (x === null || y === null) return null;
    let u = table.has(uField) ? numericDataValue(table.value(rowIndex, uField)) : null;
    let v = table.has(vField) ? numericDataValue(table.value(rowIndex, vField)) : null;
    if (u === null || v === null) {
      const magnitude = table.has(magnitudeField)
        ? (numericDataValue(table.value(rowIndex, magnitudeField)) ?? 1)
        : 1;
      const degrees = table.has(directionField)
        ? (numericDataValue(table.value(rowIndex, directionField)) ?? 0)
        : 0;
      const radians = (degrees * Math.PI) / 180;
      u = Math.sin(radians) * magnitude;
      v = Math.cos(radians) * magnitude;
    }
    const rawId = table.has(idField) ? table.value(rowIndex, idField) : undefined;
    return {
      x,
      y,
      u,
      v,
      id: rawId === null || rawId === undefined ? `row-${rowIndex}` : String(rawId),
    };
  }).filter((datum): datum is NonNullable<typeof datum> => datum !== null);
}

function seedOption(context: MarkCompileContext): Array<readonly [number, number]> | undefined {
  const value = context.layer.mark.options.seeds;
  if (!Array.isArray(value)) return undefined;
  const seeds = value.flatMap((entry) =>
    Array.isArray(entry) &&
    entry.length === 2 &&
    entry.every((part) => typeof part === 'number' && Number.isFinite(part))
      ? [[entry[0] as number, entry[1] as number] as const]
      : [],
  );
  return seeds.length === value.length ? seeds : undefined;
}

/** Vector compiler with transform-derived magnitude/direction, normalized sampling, and adaptive streamlines. */
export const compileAdvancedVectorMark: MarkCompiler = (context) => {
  const data = vectorData(context);
  if (data.length === 0) return [];
  const normalize = stringOption(context, 'normalize');
  const direction = stringOption(context, 'streamlineDirection');
  const seeds = seedOption(context);
  const columns = numberOption(context, 'sampleColumns');
  const rows = numberOption(context, 'sampleRows');
  const step = numberOption(context, 'streamlineStep');
  const tolerance = numberOption(context, 'streamlineTolerance');
  const maximumSteps = numberOption(context, 'streamlineMaximumSteps');
  const minimumMagnitude = numberOption(context, 'minimumMagnitude');
  const options: Vector2FieldOptions = {
    ...(normalize === 'unit' || normalize === 'maximum' || normalize === 'none'
      ? { normalize }
      : {}),
    ...(columns === undefined && rows === undefined
      ? {}
      : {
          sample: {
            ...(columns === undefined ? {} : { columns }),
            ...(rows === undefined ? {} : { rows }),
          },
        }),
    ...(seeds === undefined ? {} : { seeds }),
    ...(direction === 'forward' || direction === 'backward' || direction === 'both'
      ? { direction }
      : {}),
    ...(step === undefined ? {} : { step }),
    ...(tolerance === undefined ? {} : { tolerance }),
    ...(maximumSteps === undefined ? {} : { maximumSteps }),
    ...(minimumMagnitude === undefined ? {} : { minimumMagnitude }),
  };
  const result = analyzeVectorField(data, options);
  const spanX = Math.max(Number.EPSILON, result.bounds[2] - result.bounds[0]);
  const spanY = Math.max(Number.EPSILON, result.bounds[3] - result.bounds[1]);
  const map = (x: number, y: number): Point => ({
    x: context.plot.x + ((x - result.bounds[0]) / spanX) * context.plot.width,
    y:
      context.plot.y + context.plot.height - ((y - result.bounds[1]) / spanY) * context.plot.height,
  });
  const nodes: SceneNode[] = [];
  result.streamlines.forEach((streamline, index) => {
    nodes.push({
      type: 'path',
      ...nodeBase(`${context.layer.id}:streamline:${index}`, {
        zIndex: context.layer.zIndex,
        opacity: context.layer.mark.opacity,
        interactive: context.performance.enableHitTesting,
        datum: {
          layerId: context.layer.id,
          rowIndex: index,
          datum: { id: streamline.id, seed: [...streamline.seed] },
          tooltip: {
            id: streamline.id,
            seedX: streamline.seed[0],
            seedY: streamline.seed[1],
            steps: streamline.points.length,
          },
        },
      }),
      points: streamline.points.map(({ x, y }) => map(x, y)),
      closed: false,
      stroke: context.layer.mark.stroke ?? colorWithOpacity(context.color, 0.62),
      lineWidth: context.layer.mark.lineWidth ?? 1.2,
      lineCap: context.theme.mark.lineCap ?? 'round',
      lineJoin: context.theme.mark.lineJoin ?? 'round',
    });
  });
  result.vectors.forEach((vector, index) => {
    const start = map(vector.x, vector.y);
    const normalizedMagnitude = Math.hypot(vector.u, vector.v);
    const ratio =
      options.normalize === 'unit'
        ? normalizedMagnitude === 0
          ? 0
          : 1
        : options.normalize === 'maximum'
          ? normalizedMagnitude
          : normalizedMagnitude / (1 + normalizedMagnitude);
    const length = 8 + Math.max(0, Math.min(1, ratio)) * 24;
    const denominator = normalizedMagnitude || 1;
    const dx = (vector.u / denominator) * length;
    const dy = (-vector.v / denominator) * length;
    const end = { x: start.x + dx, y: start.y + dy };
    const color = context.layer.mark.stroke ?? context.color;
    const angle = Math.atan2(dy, dx);
    const head = 5;
    const datum = {
      layerId: context.layer.id,
      rowIndex: index,
      datum: {
        id: vector.id,
        x: vector.x,
        y: vector.y,
        u: vector.u,
        v: vector.v,
        magnitude: vector.magnitude,
        normalizedMagnitude,
        normalization: options.normalize ?? 'none',
        direction: vector.direction,
      },
      tooltip: {
        id: vector.id,
        x: vector.x,
        y: vector.y,
        u: vector.u,
        v: vector.v,
        magnitude: vector.magnitude,
        normalizedMagnitude,
        normalization: options.normalize ?? 'none',
        directionRadians: vector.direction,
      },
    };
    nodes.push({
      type: 'line',
      ...nodeBase(`${context.layer.id}:vector:${vector.id}`, {
        zIndex: context.layer.zIndex + 1,
        opacity: context.layer.mark.opacity,
        interactive: context.performance.enableHitTesting,
        datum,
      }),
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      stroke: color,
      lineWidth: (context.layer.mark.lineWidth ?? 1.3) + ratio * 1.6,
      lineCap: context.theme.mark.lineCap ?? 'round',
    });
    nodes.push({
      type: 'path',
      ...nodeBase(`${context.layer.id}:vector-head:${vector.id}`, {
        zIndex: context.layer.zIndex + 2,
        opacity: context.layer.mark.opacity,
      }),
      points: [
        end,
        {
          x: end.x - Math.cos(angle - Math.PI / 5) * head,
          y: end.y - Math.sin(angle - Math.PI / 5) * head,
        },
        {
          x: end.x - Math.cos(angle + Math.PI / 5) * head,
          y: end.y - Math.sin(angle + Math.PI / 5) * head,
        },
      ],
      closed: true,
      fill: color,
      lineWidth: 0,
    });
  });
  return nodes;
};
