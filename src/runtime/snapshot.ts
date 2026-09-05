import type { CompileResult, CompileCoordinateView } from '../compiler/compile.js';
import { registerLegendLayout, sceneLegendLayout, type LegendLayout } from '../compiler/legend.js';
import { GraflumeError } from '../core/errors.js';
import type { CartesianCoordinateContext } from '../interaction/cartesian-coordinates.js';
import type { InspectionViewTransform } from '../renderer/types.js';
import { sceneToSVG } from '../renderer/svg.js';
import { createPositionScale } from '../scale/registry.js';
import type { Scale, PositionScaleDescriptor } from '../scale/types.js';
import type { Scene } from '../scene/types.js';
import { normalizeSpec } from '../spec/normalize.js';
import type { ChartSpec, NormalizedChartSpec, ScaleSpec, AxisId } from '../spec/types.js';
import { ThemeRegistry } from '../theme/registry.js';
import {
  normalizeDomainViewState,
  type DomainViewState,
} from '../interaction/domain-navigation.js';
import {
  normalizeAnalyticSelectionState,
  type AnalyticSelectionState,
} from '../interaction/analytic-selection.js';
import type { AnnotationSpec, DatumTargetSpec, MarkLabelPositionSpec } from '../spec/types.js';

export const chartSnapshotSchema = 'graflume.chart-snapshot.v1' as const;
export const chartSnapshotLimits = Object.freeze({
  bytes: 32 * 1024 * 1024,
  values: 2_000_000,
  depth: 64,
  nodes: 100_000,
  dimension: 32_768,
});

interface SnapshotScale {
  readonly descriptor: PositionScaleDescriptor;
  readonly options: ScaleSpec;
  readonly bandwidth: number;
  readonly positions?: readonly number[];
}
interface SnapshotCoordinates extends Omit<CartesianCoordinateContext, 'axes'> {
  readonly axes: Readonly<Partial<Record<AxisId, SnapshotScale>>>;
}
export interface ChartSnapshot {
  readonly schema: typeof chartSnapshotSchema;
  readonly spec: ChartSpec;
  readonly renderSpec: ChartSpec;
  readonly scene: Scene;
  readonly svg: string;
  readonly theme: CompileResult['theme'];
  readonly dataLineage: CompileResult['dataLineage'];
  readonly coordinates: SnapshotCoordinates;
  readonly coordinateViews: readonly (Omit<CompileCoordinateView, 'coordinates'> & {
    readonly coordinates: SnapshotCoordinates;
  })[];
  readonly legend: LegendLayout | null;
  /** Imported vector scenes have no inferred data model to recompile on resize. */
  readonly importedScene?: boolean;
  readonly state: {
    readonly view: InspectionViewTransform;
    readonly hiddenLegendItems: readonly string[];
    readonly domainView?: DomainViewState;
    readonly analyticSelection?: AnalyticSelectionState;
    readonly selection?: readonly DatumTargetSpec[];
    readonly annotations?: readonly AnnotationSpec[];
    readonly annotationsVisible?: boolean;
    readonly markLabelPositions?: readonly MarkLabelPositionSpec[];
  };
}

/** Deep copy a bounded function-free payload before accepting any persisted runtime data. */
export function snapshotJSONCopy<T>(input: T): T {
  let values = 0;
  let bytes = 0;
  const budget = (text: string) => {
    bytes += new TextEncoder().encode(text).byteLength;
    if (bytes > chartSnapshotLimits.bytes)
      throw new GraflumeError('INVALID_SPEC', 'Chart snapshot exceeds its byte budget.');
  };
  const ancestors = new Set<object>();
  const copy = (value: unknown, depth: number): unknown => {
    if (++values > chartSnapshotLimits.values || depth > chartSnapshotLimits.depth)
      throw new GraflumeError('INVALID_SPEC', 'Chart snapshot exceeds its value or depth budget.');
    if (value === null || typeof value === 'boolean') {
      budget(String(value));
      return value;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value))
        throw new GraflumeError('INVALID_SPEC', 'Chart snapshot numbers must be finite.');
      budget(String(value));
      return value;
    }
    if (typeof value === 'string') {
      if (value.length > chartSnapshotLimits.bytes)
        throw new GraflumeError('INVALID_SPEC', 'Chart snapshot string is too large.');
      budget(JSON.stringify(value));
      return value;
    }
    if (value === undefined) return undefined;
    if (value instanceof Date) return copy(Date.prototype.toISOString.call(value), depth + 1);
    if (typeof value !== 'object')
      throw new GraflumeError('INVALID_SPEC', 'Chart snapshots must be function-free JSON.');
    if (ancestors.has(value))
      throw new GraflumeError('INVALID_SPEC', 'Chart snapshots must not contain cycles.');
    ancestors.add(value);
    budget('[]');
    let output: unknown;
    if (Array.isArray(value) || (ArrayBuffer.isView(value) && !(value instanceof DataView)))
      output = Array.from(value as ArrayLike<unknown>, (v) => copy(v, depth + 1) ?? null);
    else {
      if (
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      )
        throw new GraflumeError('INVALID_SPEC', 'Chart snapshots require plain objects.');
      const record: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        budget(JSON.stringify(key) + ':,');
        if (key === '__proto__' || key === 'constructor' || key === 'prototype')
          throw new GraflumeError('INVALID_SPEC', 'Unsafe chart snapshot key.');
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor?.get || descriptor?.set)
          throw new GraflumeError('INVALID_SPEC', 'Chart snapshot accessors are not supported.');
        const child = copy((value as Record<string, unknown>)[key], depth + 1);
        if (child !== undefined) record[key] = child;
      }
      output = record;
    }
    ancestors.delete(value);
    return output;
  };
  const result = copy(input, 0) as T;
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength > chartSnapshotLimits.bytes)
    throw new GraflumeError('INVALID_SPEC', 'Chart snapshot exceeds its byte budget.');
  return result;
}

function captureCoordinates(
  context: CartesianCoordinateContext,
  spec: NormalizedChartSpec,
): SnapshotCoordinates {
  const axes: Partial<Record<AxisId, SnapshotScale>> = {};
  for (const [id, scale] of Object.entries(context.axes)) {
    if (scale === undefined) continue;
    const encoding = spec.layers
      .flatMap((layer) => [layer.x, layer.y])
      .find((channel) => channel.axisId === id);
    const categorical = scale.kind === 'band' || scale.kind === 'point' || scale.kind === 'ordinal';
    axes[id] = {
      descriptor: scale.descriptor,
      options: encoding?.scale ?? {},
      bandwidth: scale.bandwidth,
      ...(categorical ? { positions: scale.domain().map((value) => scale.map(value)) } : {}),
    };
  }
  return { ...context, axes };
}

function restoreCoordinates(context: SnapshotCoordinates): CartesianCoordinateContext {
  const axes: Partial<Record<AxisId, Scale>> = {};
  for (const [id, saved] of Object.entries(context.axes)) {
    if (saved === undefined) continue;
    const { descriptor } = saved;
    const scale = createPositionScale(
      {
        ...saved.options,
        type: descriptor.type,
        domain: descriptor.domain,
        range: descriptor.range,
        reverse: false,
        nice: false,
        outOfBounds: descriptor.outOfBounds,
      },
      { domain: descriptor.domain, range: descriptor.range },
    );
    if (saved.positions !== undefined) {
      if (
        saved.positions.length !== descriptor.domain.length ||
        saved.positions.some((value) => !Number.isFinite(value))
      )
        throw new GraflumeError('INVALID_SPEC', 'Invalid snapshot categorical positions.');
      const positions = saved.positions;
      axes[id] = {
        kind: scale.kind,
        descriptor,
        bandwidth: saved.bandwidth,
        domain: () => descriptor.domain,
        range: () => descriptor.range,
        map: (value) => {
          const key = value instanceof Date ? value.toISOString() : String(value);
          const index = descriptor.domain.findIndex((candidate) => String(candidate) === key);
          return index < 0 ? Number.NaN : positions[index]!;
        },
        ticks: (count, locale) =>
          scale.ticks(count, locale).map((tick) => ({
            ...tick,
            position:
              positions[descriptor.domain.findIndex((value) => value === tick.value)] ??
              tick.position,
          })),
      };
    } else axes[id] = scale;
  }
  return { ...context, axes };
}

export function captureChartSnapshot(
  spec: ChartSpec,
  renderSpec: ChartSpec,
  result: CompileResult,
  state: ChartSnapshot['state'],
): ChartSnapshot {
  const snapshot = snapshotJSONCopy({
    schema: chartSnapshotSchema,
    spec,
    renderSpec,
    scene: result.scene,
    svg: sceneToSVG(result.scene),
    theme: result.theme,
    dataLineage: result.dataLineage,
    coordinates: captureCoordinates(result.coordinates, result.spec),
    coordinateViews: result.coordinateViews.map((view) => ({
      ...view,
      coordinates: captureCoordinates(view.coordinates, result.spec),
    })),
    legend: sceneLegendLayout(result.scene),
    state,
  });
  return snapshot;
}

/** Import real vector primitives; callers supply truthful datum/semantic metadata, never bitmap substitutes. */
export function snapshotFromScene(
  scene: Scene,
  options: { readonly spec?: ChartSpec } = {},
): ChartSnapshot {
  const spec: ChartSpec = options.spec ?? {
    data: [],
    mark: 'point',
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
    axes: { x: false, y: false },
    renderer: 'svg',
    theme: 'statistical-minimal',
    interaction: {
      tooltip: { title: scene.accessibility.label },
      navigation: { minZoom: 1, maxZoom: 6 },
      controls: { zoom: true, reset: true, fullscreen: true, export: true },
    },
  };
  const normalized = normalizeSpec(spec);
  if (
    normalized.interaction.domainNavigation !== false ||
    normalized.interaction.selection !== false ||
    normalized.interaction.playback !== false
  )
    throw new GraflumeError(
      'INVALID_SPEC',
      'Imported scenes support inspection navigation; data-domain navigation, selection, and playback require a compiled data model.',
    );
  const coordinates = { plot: { x: 0, y: 0, width: scene.width, height: scene.height }, axes: {} };
  const result: CompileResult = {
    scene,
    spec: normalized,
    theme: new ThemeRegistry().resolve(normalized.theme),
    dataLineage: {},
    coordinates,
    coordinateViews: [
      {
        id: 'plot',
        label: scene.accessibility.label,
        bounds: coordinates.plot,
        offsetX: 0,
        offsetY: 0,
        coordinates,
      },
    ],
  };
  const snapshot = {
    ...captureChartSnapshot(spec, spec, result, {
      view: { zoom: 1, offsetX: 0, offsetY: 0 },
      hiddenLegendItems: [],
    }),
    importedScene: true,
  };
  return restoreChartSnapshot(snapshot).snapshot;
}

/** Validates before mounting DOM; never compiles marks, runs transforms, or lays out a chart. */
export function restoreChartSnapshot(input: unknown): {
  snapshot: ChartSnapshot;
  result: CompileResult;
} {
  try {
    const snapshot = snapshotJSONCopy(input) as ChartSnapshot;
    if (snapshot?.schema !== chartSnapshotSchema) throw new Error('Unsupported snapshot schema.');
    normalizeSpec(snapshot.spec);
    const spec = normalizeSpec(snapshot.renderSpec);
    for (const dimension of [snapshot.scene.width, snapshot.scene.height])
      if (!Number.isFinite(dimension) || dimension < 1 || dimension > chartSnapshotLimits.dimension)
        throw new Error('Snapshot dimensions are out of range.');
    if (
      !Array.isArray(snapshot.scene.semanticIndex) ||
      !Array.isArray(snapshot.coordinateViews) ||
      snapshot.coordinateViews.length > 64 ||
      !Array.isArray(snapshot.state.hiddenLegendItems) ||
      snapshot.state.hiddenLegendItems.some((id) => typeof id !== 'string')
    )
      throw new Error('Invalid snapshot metadata.');
    const view = snapshot.state.view;
    if (
      !Number.isFinite(view.zoom) ||
      view.zoom < 1 ||
      view.zoom > 6 ||
      !Number.isFinite(view.offsetX) ||
      !Number.isFinite(view.offsetY)
    )
      throw new Error('Invalid snapshot inspection view.');
    if (snapshot.state.domainView !== undefined)
      normalizeDomainViewState(snapshot.state.domainView);
    if (snapshot.state.analyticSelection !== undefined)
      normalizeAnalyticSelectionState(snapshot.state.analyticSelection);
    if (snapshot.state.annotations !== undefined)
      normalizeSpec({ ...snapshot.spec, annotations: snapshot.state.annotations });
    // Equality with a literal-only, escaped serializer prevents stored SVG injection.
    if (typeof snapshot.svg !== 'string' || snapshot.svg !== sceneToSVG(snapshot.scene))
      throw new Error('Snapshot SVG does not match its vector scene.');
    const result: CompileResult = {
      scene: snapshot.scene,
      spec,
      theme: snapshot.theme,
      dataLineage: snapshot.dataLineage,
      coordinates: restoreCoordinates(snapshot.coordinates),
      coordinateViews: snapshot.coordinateViews.map((view) => ({
        ...view,
        coordinates: restoreCoordinates(view.coordinates),
      })),
    };
    registerLegendLayout(result.scene, snapshot.legend);
    return { snapshot, result };
  } catch {
    throw new GraflumeError('INVALID_SPEC', 'Invalid or unsupported chart snapshot.');
  }
}
