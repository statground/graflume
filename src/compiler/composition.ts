import { GraflumeError } from '../core/errors.js';
import { DataTable } from '../data/table.js';
import { executeTransformsWithNamedLineage } from '../data/dataflow.js';
import type { DataLineage } from '../data/transforms.js';
import type { CartesianCoordinateContext } from '../interaction/cartesian-coordinates.js';
import { group, nodeBase } from '../scene/factory.js';
import type { SemanticMark } from '../scene/semantic.js';
import type { Rect, Scene, SceneNode, TextNode } from '../scene/types.js';
import { countSceneNodes } from '../scene/walk.js';
import {
  compositionKind,
  isCompositionSpec,
  maximumCompositionLayers,
  maximumCompositionViews,
  resolveComposition,
  type CompositionKind,
  type ResolvedCompositionResolve,
} from '../spec/composition.js';
import { normalizeSpec } from '../spec/normalize.js';
import { assertValidSpec } from '../spec/validate.js';
import { axisChannel, builtInAxisIds, defaultAxisPosition } from '../spec/axes.js';
import type {
  AxisId,
  AxisSpec,
  ChartSpec,
  ChannelEncodingInput,
  DataInput,
  DataRow,
  DataValue,
  EncodingInput,
  FacetFieldInput,
  LayerSpec,
  NormalizedChartSpec,
  NormalizedLegendItemSpec,
  NormalizedLayerSpec,
  RepeatItemSpec,
  ScaleSpec,
} from '../spec/types.js';
import { defaultThemeId } from '../theme/defaults.js';
import type { ThemeTokens } from '../theme/types.js';
import type { RuntimeRegistry } from '../runtime/registry.js';
import { resolveScales } from './domain.js';
import type { CompileOptions, CompileResult, CompileRuntimeState } from './compile.js';
import {
  compileLegend,
  legendExternalInsets,
  legendItemToggleable,
  registerLegendLayout,
  resolveLegendModel,
  type LegendModel,
} from './legend.js';

interface CompositionCompiler {
  readonly compile: (
    spec: ChartSpec,
    registry: RuntimeRegistry,
    options?: CompileOptions,
    runtime?: CompileRuntimeState,
  ) => CompileResult;
  readonly compileUnit: (
    spec: ChartSpec,
    registry: RuntimeRegistry,
    options?: CompileOptions,
    runtime?: CompileRuntimeState,
  ) => CompileResult;
}

interface SourceMap {
  readonly rows: readonly (readonly number[])[];
  readonly sourceRows: number;
  readonly lineage: DataLineage;
}

interface ViewDefinition {
  readonly id: string;
  readonly label: string;
  readonly spec: ChartSpec;
  readonly row: number;
  readonly column: number;
  readonly sourceMap?: SourceMap;
}

interface ViewLayout extends ViewDefinition {
  readonly bounds: Rect;
  readonly chartBounds: Rect;
}

interface GridDefinition {
  readonly views: readonly ViewDefinition[];
  readonly rows: number;
  readonly columns: number;
  readonly showLabels: boolean;
}

const compositionProperties = [
  'layer',
  'facet',
  'repeat',
  'hconcat',
  'vconcat',
  'concat',
  'inset',
  'spec',
  'columns',
  'spacing',
  'resolve',
] as const;
const minimumCellWidth = 80;
const minimumCellHeight = 80;
const facetHeaderHeight = 24;

function fail(message: string, path = '$'): never {
  throw new GraflumeError('INVALID_SPEC', message, { path });
}

function mutableSpec(input: ChartSpec): Record<string, unknown> {
  return { ...input } as Record<string, unknown>;
}

function withoutComposition(input: ChartSpec): ChartSpec {
  const output = mutableSpec(input);
  for (const key of compositionProperties) delete output[key];
  return output as ChartSpec;
}

function withoutDimensions(input: ChartSpec): ChartSpec {
  const output = mutableSpec(input);
  delete output.width;
  delete output.height;
  return output as ChartSpec;
}

function safeToken(value: string): string {
  const token = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return token === '' ? 'view' : token;
}

function inheritedChild(
  child: ChartSpec,
  parent: ChartSpec,
  options: { readonly transformed?: boolean } = {},
): ChartSpec {
  const ownsData = child.data !== undefined;
  const parentTransforms = options.transformed === true || ownsData ? [] : (parent.transform ?? []);
  return {
    ...withoutDimensions(child),
    ...(child.data === undefined && parent.data !== undefined ? { data: parent.data } : {}),
    transform: [...parentTransforms, ...(child.transform ?? [])],
    theme: child.theme ?? parent.theme ?? defaultThemeId,
    ...(child.locale === undefined && parent.locale !== undefined ? { locale: parent.locale } : {}),
    renderer: child.renderer ?? parent.renderer ?? 'canvas',
    performance: child.performance ?? parent.performance ?? 'auto',
    ...(child.accessibility?.maxRows === undefined && parent.accessibility?.maxRows !== undefined
      ? {
          accessibility: {
            ...child.accessibility,
            maxRows: parent.accessibility.maxRows,
          },
        }
      : {}),
    width: 'container',
    height: 'container',
  };
}

function localSelection(
  runtime: CompileRuntimeState,
  viewId: string,
): CompileRuntimeState['selection'] {
  return runtime.selection?.flatMap((target) => {
    if (target.layerId === undefined) return [target];
    const prefix = `${viewId}/`;
    return target.layerId.startsWith(prefix)
      ? [{ ...target, layerId: target.layerId.slice(prefix.length) }]
      : [];
  });
}

function runtimeForView(runtime: CompileRuntimeState, viewId: string): CompileRuntimeState {
  const selection = localSelection(runtime, viewId);
  const analyticSelection = runtime.analyticSelection;
  const localAnalyticSelection =
    analyticSelection === undefined
      ? undefined
      : {
          ...analyticSelection,
          selections: analyticSelection.selections.flatMap((candidate) => {
            if (candidate.type !== 'point' || candidate.target?.layerId === undefined) {
              return [candidate];
            }
            const prefix = `${viewId}/`;
            return candidate.target.layerId.startsWith(prefix)
              ? [
                  {
                    ...candidate,
                    target: {
                      ...candidate.target,
                      layerId: candidate.target.layerId.slice(prefix.length),
                    },
                  },
                ]
              : [];
          }),
        };
  return {
    ...(runtime.annotationsVisible === undefined
      ? {}
      : { annotationsVisible: runtime.annotationsVisible }),
    ...(selection === undefined ? {} : { selection }),
    ...(localAnalyticSelection === undefined ? {} : { analyticSelection: localAnalyticSelection }),
    ...(runtime.domainView === undefined ? {} : { domainView: runtime.domainView }),
    ...(runtime.analyticSelectionDraft === undefined
      ? {}
      : { analyticSelectionDraft: runtime.analyticSelectionDraft }),
  };
}

function interactionForView(child: ChartSpec, parent: ChartSpec): ChartSpec {
  const interaction = parent.interaction;
  return {
    ...child,
    interaction: {
      ...child.interaction,
      ...(interaction?.hover === undefined ? {} : { hover: interaction.hover }),
      ...(interaction?.click === undefined ? {} : { click: interaction.click }),
      tooltip: false,
      navigation: false,
      ...(interaction?.domainNavigation === undefined
        ? {}
        : { domainNavigation: interaction.domainNavigation }),
      playback: false,
      controls: false,
      ...(interaction?.selection === undefined ? {} : { selection: interaction.selection }),
    },
  };
}

function layerFromShorthand(child: ChartSpec, childIndex: number): LayerSpec {
  if (child.mark === undefined)
    fail('Layer composition child is missing mark.', `$.layer[${childIndex}].mark`);
  return {
    id: `layer-${childIndex}`,
    ...(child.title === undefined
      ? {}
      : { name: typeof child.title === 'string' ? child.title : child.title.text }),
    ...(child.data === undefined ? {} : { data: child.data }),
    ...(child.transform === undefined ? {} : { transform: child.transform }),
    mark: child.mark,
    ...(child.encoding === undefined ? { x: child.x!, y: child.y! } : { encoding: child.encoding }),
  };
}

function flattenLayerComposition(input: ChartSpec): ChartSpec {
  const children = input.layer ?? [];
  const layers = children.flatMap((child, childIndex): readonly LayerSpec[] => {
    if (isCompositionSpec(child)) {
      fail('Layer composition children must be unit charts.', `$.layer[${childIndex}]`);
    }
    if (child.layers === undefined) return [layerFromShorthand(child, childIndex)];
    return child.layers.map((layer, layerIndex) => ({
      ...layer,
      id: `layer-${childIndex}-${safeToken(layer.id ?? String(layerIndex))}`,
      ...(layer.data === undefined && child.data !== undefined ? { data: child.data } : {}),
      transform: [...(child.transform ?? []), ...(layer.transform ?? [])],
    }));
  });
  if (layers.length > maximumCompositionLayers) {
    fail(`Layer composition exceeds ${maximumCompositionLayers} compiled layers.`, '$.layer');
  }
  const output = mutableSpec(withoutComposition(input));
  delete output.mark;
  delete output.x;
  delete output.y;
  delete output.encoding;
  output.layers = layers;
  return output as ChartSpec;
}

function fieldName(input: FacetFieldInput): string {
  return typeof input === 'string' ? input : input.field;
}

function fieldTitle(input: FacetFieldInput): string {
  return typeof input === 'string' ? input : (input.title ?? input.field);
}

function facetSort(input: FacetFieldInput): 'input' | 'ascending' | 'descending' {
  return typeof input === 'string' ? 'input' : (input.sort ?? 'input');
}

function valueKey(value: DataValue): string {
  if (value instanceof Date) return `date:${value.toISOString()}`;
  if (value === undefined) return 'undefined:';
  if (value === null) return 'null:';
  if (Array.isArray(value)) fail('Facet fields must contain scalar values.', '$.facet');
  return `${typeof value}:${String(value)}`;
}

function valueLabel(value: DataValue): string {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return '\u2014';
  if (Array.isArray(value)) fail('Facet fields must contain scalar values.', '$.facet');
  return String(value);
}

function compareFacetValue(left: DataValue, right: DataValue): number {
  if (Object.is(left, right)) return 0;
  const numeric = (value: DataValue): number | null =>
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number' && Number.isFinite(value)
        ? value
        : null;
  const a = numeric(left);
  const b = numeric(right);
  if (a !== null && b !== null) return a - b;
  return valueLabel(left).localeCompare(valueLabel(right), 'en');
}

function uniqueValues(
  rows: readonly DataRow[],
  field: FacetFieldInput,
  maximum = maximumCompositionViews,
): DataValue[] {
  const name = fieldName(field);
  const seen = new Set<string>();
  const values: DataValue[] = [];
  for (const row of rows) {
    const value = row[name];
    const key = valueKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
    if (values.length > maximum) {
      fail(`Facet view count exceeds ${maximumCompositionViews}.`, '$.facet');
    }
  }
  const sort = facetSort(field);
  return sort === 'input'
    ? values
    : values.sort((left, right) =>
        sort === 'descending' ? -compareFacetValue(left, right) : compareFacetValue(left, right),
      );
}

function materializeFacet(input: ChartSpec): GridDefinition {
  if (input.data === undefined || input.facet === undefined || input.spec === undefined) {
    fail('Facet composition requires data, facet, and spec.', '$.facet');
  }
  const transformed = executeTransformsWithNamedLineage(
    input.data,
    input.transform ?? [],
    'composition:facet',
  );
  const rows = transformed.data;
  const facet = input.facet;
  const views: ViewDefinition[] = [];
  if (facet.wrap !== undefined) {
    const values = uniqueValues(rows, facet.wrap);
    const columns = Math.min(facet.columns ?? Math.max(1, Math.ceil(Math.sqrt(values.length))), 16);
    const valueIndices = new Map(values.map((value, index) => [valueKey(value), index]));
    const matches = values.map((): { row: DataRow; rowIndex: number }[] => []);
    rows.forEach((row, rowIndex) => {
      const index = valueIndices.get(valueKey(row[fieldName(facet.wrap!)]));
      if (index !== undefined) matches[index]!.push({ row, rowIndex });
    });
    values.forEach((value, index) => {
      const matched = matches[index]!;
      const label = `${fieldTitle(facet.wrap!)} = ${valueLabel(value)}`;
      views.push({
        id: `facet-${index}-${safeToken(valueLabel(value))}`,
        label,
        row: Math.floor(index / columns),
        column: index % columns,
        spec: inheritedChild({ ...input.spec!, data: matched.map(({ row }) => row) }, input, {
          transformed: true,
        }),
        sourceMap: {
          rows: matched.map(({ rowIndex }) => transformed.lineage.rowSources[rowIndex] ?? []),
          sourceRows: transformed.lineage.sourceRows,
          lineage: transformed.lineage,
        },
      });
    });
    return {
      views,
      rows: Math.max(1, Math.ceil(views.length / columns)),
      columns,
      showLabels: true,
    };
  }

  const rowField = facet.row;
  const columnField = facet.column;
  const rowValues = rowField === undefined ? [undefined] : uniqueValues(rows, rowField);
  const columnValues = columnField === undefined ? [undefined] : uniqueValues(rows, columnField);
  const rowIndices = new Map(rowValues.map((value, index) => [valueKey(value), index]));
  const columnIndices = new Map(columnValues.map((value, index) => [valueKey(value), index]));
  const grouped = new Map<
    string,
    {
      readonly rowIndex: number;
      readonly columnIndex: number;
      readonly matched: { row: DataRow; sourceIndex: number }[];
    }
  >();
  rows.forEach((row, sourceIndex) => {
    const rowIndex = rowIndices.get(
      valueKey(rowField === undefined ? undefined : row[fieldName(rowField)]),
    );
    const columnIndex = columnIndices.get(
      valueKey(columnField === undefined ? undefined : row[fieldName(columnField)]),
    );
    if (rowIndex === undefined || columnIndex === undefined) return;
    const key = `${rowIndex}:${columnIndex}`;
    let group = grouped.get(key);
    if (group === undefined) {
      if (grouped.size >= maximumCompositionViews) {
        fail(`Facet view count exceeds ${maximumCompositionViews}.`, '$.facet');
      }
      group = { rowIndex, columnIndex, matched: [] };
      grouped.set(key, group);
    }
    group.matched.push({ row, sourceIndex });
  });
  const observed = [...grouped.values()].sort(
    (left, right) => left.rowIndex - right.rowIndex || left.columnIndex - right.columnIndex,
  );
  for (const { rowIndex, columnIndex, matched } of observed) {
    const rowValue = rowValues[rowIndex];
    const columnValue = columnValues[columnIndex];
    const labels = [
      ...(rowField === undefined ? [] : [`${fieldTitle(rowField)} = ${valueLabel(rowValue)}`]),
      ...(columnField === undefined
        ? []
        : [`${fieldTitle(columnField)} = ${valueLabel(columnValue)}`]),
    ];
    const label = labels.join(' \u00b7 ');
    views.push({
      id: `facet-${rowIndex}-${columnIndex}`,
      label,
      row: rowIndex,
      column: columnIndex,
      spec: inheritedChild({ ...input.spec, data: matched.map(({ row }) => row) }, input, {
        transformed: true,
      }),
      sourceMap: {
        rows: matched.map(({ sourceIndex }) => transformed.lineage.rowSources[sourceIndex] ?? []),
        sourceRows: transformed.lineage.sourceRows,
        lineage: transformed.lineage,
      },
    });
  }
  return {
    views,
    rows: Math.max(1, rowValues.length),
    columns: Math.max(1, columnValues.length),
    showLabels: true,
  };
}

function positionWithField(
  input: EncodingInput | undefined,
  field: string | undefined,
): EncodingInput | undefined {
  if (field === undefined) return input;
  if (typeof input === 'string' || input === undefined) return { field };
  return { ...input, field };
}

function channelWithField(
  input: ChannelEncodingInput | undefined,
  field: string | undefined,
): ChannelEncodingInput | undefined {
  if (field === undefined) return input;
  if (typeof input === 'string' || input === undefined) return { field };
  const { value: _value, ...rest } = input;
  return { ...rest, field };
}

function repeatFields(input: ChartSpec, item: RepeatItemSpec): ChartSpec {
  if (isCompositionSpec(input)) fail('Repeat templates must currently be unit charts.', '$.spec');
  const rewriteLayer = (layer: LayerSpec): LayerSpec =>
    layer.encoding === undefined
      ? {
          ...layer,
          x: positionWithField(layer.x, item.x)!,
          y: positionWithField(layer.y, item.y)!,
        }
      : {
          ...layer,
          encoding: {
            ...layer.encoding,
            x: channelWithField(layer.encoding.x, item.x)!,
            y: channelWithField(layer.encoding.y, item.y)!,
          },
        };
  if (input.layers !== undefined) {
    return { ...input, layers: input.layers.map(rewriteLayer) };
  }
  return input.encoding === undefined
    ? {
        ...input,
        x: positionWithField(input.x, item.x)!,
        y: positionWithField(input.y, item.y)!,
      }
    : {
        ...input,
        encoding: {
          ...input.encoding,
          x: channelWithField(input.encoding.x, item.x)!,
          y: channelWithField(input.encoding.y, item.y)!,
        },
      };
}

function materializeRepeat(input: ChartSpec): GridDefinition {
  if (input.repeat === undefined || input.spec === undefined) {
    fail('Repeat composition requires repeat and spec.', '$.repeat');
  }
  const columns = Math.min(
    input.repeat.columns ?? Math.max(1, Math.ceil(Math.sqrt(input.repeat.items.length))),
    16,
  );
  const views = input.repeat.items.map((item, index) => ({
    id: `repeat-${index}-${safeToken(item.id)}`,
    label: item.label ?? item.id,
    row: Math.floor(index / columns),
    column: index % columns,
    spec: inheritedChild(repeatFields(input.spec!, item), input),
  }));
  return {
    views,
    rows: Math.max(1, Math.ceil(views.length / columns)),
    columns,
    showLabels: true,
  };
}

function materializeConcat(
  input: ChartSpec,
  kind: 'hconcat' | 'vconcat' | 'concat',
): GridDefinition {
  const children = input[kind] ?? [];
  const columns =
    kind === 'hconcat'
      ? children.length
      : kind === 'vconcat'
        ? 1
        : Math.min(input.columns ?? Math.max(1, Math.ceil(Math.sqrt(children.length))), 16);
  return {
    views: children.map((child, index) => ({
      id: `${kind}-${index}`,
      label: `${kind} ${index + 1}`,
      row: Math.floor(index / columns),
      column: index % columns,
      spec: inheritedChild(child, input),
    })),
    rows: Math.max(1, Math.ceil(children.length / columns)),
    columns: Math.max(1, columns),
    showLabels: false,
  };
}

function materializeInset(input: ChartSpec): GridDefinition {
  if (input.inset === undefined) fail('Inset composition requires inset.', '$.inset');
  return {
    views: [
      {
        id: 'inset-base',
        label: 'Base view',
        row: 0,
        column: 0,
        spec: inheritedChild(input.inset.base, input),
      },
      {
        id: 'inset-view',
        label: input.inset.label ?? 'Inset view',
        row: 0,
        column: 0,
        spec: inheritedChild(input.inset.view, input),
      },
    ],
    rows: 1,
    columns: 1,
    showLabels: false,
  };
}

function forcePositionDomain(
  input: EncodingInput | undefined,
  domain: readonly (number | string)[],
): EncodingInput | undefined {
  if (input === undefined) return input;
  if (typeof input === 'string') return { field: input, scale: { domain } };
  return { ...input, scale: { ...input.scale, domain } };
}

function forceChannelDomain(
  input: ChannelEncodingInput | undefined,
  domain: readonly (number | string)[],
): ChannelEncodingInput | undefined {
  if (input === undefined) return input;
  if (typeof input === 'string') return { field: input, scale: { domain } };
  return { ...input, scale: { ...input.scale, domain } };
}

type SharedAxisDomains = Readonly<Partial<Record<AxisId, readonly (number | string)[]>>>;

function positionAxisId(
  channel: 'x' | 'y',
  input: EncodingInput | ChannelEncodingInput | undefined,
): AxisId {
  return typeof input === 'object' && input.axisId !== undefined ? input.axisId : channel;
}

function forceSharedDomains(input: ChartSpec, domains: SharedAxisDomains): ChartSpec {
  const rewrittenPosition = (
    value: EncodingInput | undefined,
    channel: 'x' | 'y',
  ): EncodingInput | undefined => {
    const domain = domains[positionAxisId(channel, value)];
    return domain === undefined ? value : forcePositionDomain(value, domain);
  };
  const rewrittenChannel = (
    value: ChannelEncodingInput | undefined,
    channel: 'x' | 'y',
  ): ChannelEncodingInput | undefined => {
    const domain = domains[positionAxisId(channel, value)];
    return domain === undefined ? value : forceChannelDomain(value, domain);
  };
  const rewrite = (layer: LayerSpec): LayerSpec => {
    if (layer.encoding === undefined) {
      const x = rewrittenPosition(layer.x, 'x');
      const y = rewrittenPosition(layer.y, 'y');
      return {
        ...layer,
        ...(x === undefined ? {} : { x }),
        ...(y === undefined ? {} : { y }),
      };
    }
    const x = rewrittenChannel(layer.encoding.x, 'x');
    const y = rewrittenChannel(layer.encoding.y, 'y');
    return {
      ...layer,
      encoding: {
        ...layer.encoding,
        ...(x === undefined ? {} : { x }),
        ...(y === undefined ? {} : { y }),
      },
    };
  };
  if (input.layers !== undefined) return { ...input, layers: input.layers.map(rewrite) };
  if (input.encoding === undefined) {
    const x = rewrittenPosition(input.x, 'x');
    const y = rewrittenPosition(input.y, 'y');
    return {
      ...input,
      ...(x === undefined ? {} : { x }),
      ...(y === undefined ? {} : { y }),
    };
  }
  const x = rewrittenChannel(input.encoding.x, 'x');
  const y = rewrittenChannel(input.encoding.y, 'y');
  return {
    ...input,
    encoding: {
      ...input.encoding,
      ...(x === undefined ? {} : { x }),
      ...(y === undefined ? {} : { y }),
    },
  };
}

function unionDomains(
  domains: readonly (readonly (number | string)[])[],
  axis: AxisId,
  scaleType: ReturnType<typeof resolveScales>['xScale']['descriptor']['type'],
): readonly (number | string)[] {
  const values = domains.flat();
  const allNumbers = values.every((value) => typeof value === 'number');
  const allStrings = values.every((value) => typeof value === 'string');
  if (scaleType === 'band' || scaleType === 'point') {
    if (!allNumbers && !allStrings) {
      throw new GraflumeError(
        'INCOMPATIBLE_SCALE',
        `Shared ${axis} categorical scale domains cannot mix number and string identities.`,
        { path: '$.resolve.scale' },
      );
    }
    const seen = new Set<string>();
    return values.filter((value) => {
      const key = `${typeof value}:${String(value)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (allNumbers) {
    return [Math.min(...(values as readonly number[])), Math.max(...(values as readonly number[]))];
  }
  if (allStrings) return [...new Set(values as readonly string[])];
  throw new GraflumeError(
    'INCOMPATIBLE_SCALE',
    `Shared ${axis} scale domains cannot mix numeric and categorical values.`,
    { path: '$.resolve.scale' },
  );
}

function scaleParameterSignature(
  scale: ScaleSpec,
  descriptor: ReturnType<typeof resolveScales>['xScale']['descriptor'],
): string {
  const type = descriptor.type;
  return JSON.stringify({
    type,
    reverse: descriptor.reverse,
    outOfBounds: descriptor.outOfBounds,
    ...(type === 'log' ? { base: scale.base ?? 10 } : {}),
    ...(type === 'pow' ? { exponent: scale.exponent ?? 1 } : {}),
    ...(type === 'symlog' || type === 'asinh' ? { constant: scale.constant ?? 1 } : {}),
    ...(type === 'linear' || type === 'time' || type === 'utc' ? { nice: scale.nice ?? true } : {}),
    ...(type === 'band'
      ? { paddingInner: scale.paddingInner ?? 0.1, paddingOuter: scale.paddingOuter ?? 0.05 }
      : {}),
    ...(type === 'point' ? { paddingOuter: scale.paddingOuter ?? 0.5 } : {}),
  });
}

function harmonizeSharedScales(
  views: readonly ViewDefinition[],
  registry: RuntimeRegistry,
): readonly ViewDefinition[] {
  const resolved = views.map((view) => {
    if (isCompositionSpec(view.spec)) {
      fail('Shared position scales currently require unit child views.', '$.resolve.scale');
    }
    const theme = registry.themes.resolve(view.spec.theme ?? defaultThemeId);
    const spec = normalizeSpec(view.spec, theme);
    const scales = resolveScales(spec, { x: 0, y: 0, width: 100, height: 100 });
    const axisScale = (axisId: AxisId): ScaleSpec => {
      const channel = scales.axes[axisId]?.channel;
      if (channel === undefined) return {};
      return spec.layers.find((layer) => layer[channel].axisId === axisId)?.[channel].scale ?? {};
    };
    return {
      view,
      scales,
      signatures: Object.fromEntries(
        Object.values(scales.axes).flatMap((resolvedAxis) =>
          resolvedAxis === undefined
            ? []
            : [
                [
                  resolvedAxis.id,
                  scaleParameterSignature(
                    axisScale(resolvedAxis.id),
                    resolvedAxis.scale.descriptor,
                  ),
                ],
              ],
        ),
      ) as Readonly<Partial<Record<AxisId, string>>>,
    };
  });
  const domains: Partial<Record<AxisId, readonly (number | string)[]>> = {};
  const axisIds = new Set(
    resolved.flatMap(({ scales }) =>
      Object.values(scales.axes).flatMap((axis) => (axis === undefined ? [] : [axis.id])),
    ),
  );
  for (const axis of axisIds) {
    const participants = resolved.filter(({ scales }) => scales.axes[axis] !== undefined);
    if (participants.length === 0) continue;
    const signatures = participants.map(({ signatures }) => signatures[axis]);
    const first = signatures[0];
    if (first === undefined || signatures.some((signature) => signature !== first)) {
      throw new GraflumeError(
        'INCOMPATIBLE_SCALE',
        `Shared ${axis} scales require the same mathematical parameters, scale type, reverse direction, and out-of-bounds policy.`,
        { path: '$.resolve.scale' },
      );
    }
    const channel = participants[0]!.scales.axes[axis]!.channel;
    if (participants.some(({ scales }) => scales.axes[axis]!.channel !== channel)) {
      throw new GraflumeError(
        'INCOMPATIBLE_SCALE',
        `Shared axis "${axis}" cannot bind both x and y channels.`,
        { path: '$.resolve.scale' },
      );
    }
    domains[axis] = unionDomains(
      participants.map(({ scales }) => scales.axes[axis]!.scale.domain()),
      axis,
      participants[0]!.scales.axes[axis]!.scale.descriptor.type,
    );
  }
  return resolved.map(({ view }) => ({
    ...view,
    spec: forceSharedDomains(view.spec, domains),
  }));
}

function interiorAxis(input: AxisSpec | false | undefined): AxisSpec | false {
  if (input === false) return false;
  return {
    ...input,
    line: false,
    ticks: false,
    labels: false,
    title: false,
  };
}

function boundaryAxisInput(
  input: EncodingInput | ChannelEncodingInput | undefined,
  channel: 'x' | 'y',
  boundary: ReadonlySet<AxisId>,
): EncodingInput | ChannelEncodingInput | undefined {
  if (input === undefined || boundary.has(positionAxisId(channel, input))) return input;
  return typeof input === 'string'
    ? { field: input, axis: interiorAxis(undefined) }
    : { ...input, axis: interiorAxis(input.axis) };
}

function sharedAxisViewSpec(
  input: ChartSpec,
  parentAxes: ChartSpec['axes'],
  boundary: ReadonlySet<AxisId>,
): ChartSpec {
  const axes = { ...input.axes, ...parentAxes };
  for (const id of new Set([...builtInAxisIds, ...Object.keys(axes)])) {
    if (!boundary.has(id)) axes[id] = interiorAxis(axes[id]);
  }
  const rewriteLayer = (layer: LayerSpec): LayerSpec =>
    layer.encoding === undefined
      ? {
          ...layer,
          x: boundaryAxisInput(layer.x, 'x', boundary) as EncodingInput,
          y: boundaryAxisInput(layer.y, 'y', boundary) as EncodingInput,
        }
      : {
          ...layer,
          encoding: {
            ...layer.encoding,
            x: boundaryAxisInput(layer.encoding.x, 'x', boundary) as ChannelEncodingInput,
            y: boundaryAxisInput(layer.encoding.y, 'y', boundary) as ChannelEncodingInput,
          },
        };
  const output: ChartSpec = {
    ...input,
    axes,
    ...(input.layers === undefined ? {} : { layers: input.layers.map(rewriteLayer) }),
  };
  if (input.layers !== undefined) return output;
  return input.encoding === undefined
    ? {
        ...output,
        x: boundaryAxisInput(input.x, 'x', boundary) as EncodingInput,
        y: boundaryAxisInput(input.y, 'y', boundary) as EncodingInput,
      }
    : {
        ...output,
        encoding: {
          ...input.encoding,
          x: boundaryAxisInput(input.encoding.x, 'x', boundary) as ChannelEncodingInput,
          y: boundaryAxisInput(input.encoding.y, 'y', boundary) as ChannelEncodingInput,
        },
      };
}

function sharedAxisViews(
  input: ChartSpec,
  views: readonly ViewDefinition[],
): readonly ViewDefinition[] {
  const topByColumn = new Map<number, number>();
  const bottomByColumn = new Map<number, number>();
  const leftByRow = new Map<number, number>();
  const rightByRow = new Map<number, number>();
  for (const view of views) {
    topByColumn.set(view.column, Math.min(topByColumn.get(view.column) ?? view.row, view.row));
    bottomByColumn.set(
      view.column,
      Math.max(bottomByColumn.get(view.column) ?? view.row, view.row),
    );
    leftByRow.set(view.row, Math.min(leftByRow.get(view.row) ?? view.column, view.column));
    rightByRow.set(view.row, Math.max(rightByRow.get(view.row) ?? view.column, view.column));
  }
  return views.map((view) => {
    const boundary = new Set<AxisId>();
    const axes = { ...view.spec.axes, ...input.axes };
    for (const id of new Set([...builtInAxisIds, ...Object.keys(axes)])) {
      const channel = axisChannel(id, axes);
      if (channel === undefined) continue;
      const authored = axes[id];
      const position =
        authored === false
          ? defaultAxisPosition(id, channel)
          : (authored?.position ?? defaultAxisPosition(id, channel));
      if (
        (position === 'bottom' && bottomByColumn.get(view.column) === view.row) ||
        (position === 'top' && topByColumn.get(view.column) === view.row) ||
        (position === 'left' && leftByRow.get(view.row) === view.column) ||
        (position === 'right' && rightByRow.get(view.row) === view.column)
      ) {
        boundary.add(id);
      }
    }
    return { ...view, spec: sharedAxisViewSpec(view.spec, input.axes, boundary) };
  });
}

const visualColorChannels = ['color', 'fill', 'stroke'] as const;

function channelField(input: ChannelEncodingInput | undefined): string | undefined {
  return typeof input === 'string' ? input : input?.field;
}

function forceVisualDomain(
  input: ChartSpec,
  field: string,
  domain: readonly (number | string)[],
): ChartSpec {
  const rewriteEncoding = (encoding: NonNullable<LayerSpec['encoding']>) => {
    const output = { ...encoding };
    for (const channel of visualColorChannels) {
      const value = encoding[channel];
      if (channelField(value) === field) output[channel] = forceChannelDomain(value, domain)!;
    }
    return output;
  };
  const rewriteLayer = (layer: LayerSpec): LayerSpec =>
    layer.encoding === undefined ? layer : { ...layer, encoding: rewriteEncoding(layer.encoding) };
  if (input.layers !== undefined) return { ...input, layers: input.layers.map(rewriteLayer) };
  return input.encoding === undefined
    ? input
    : { ...input, encoding: rewriteEncoding(input.encoding) };
}

function withCompositionLegend(input: ChartSpec, parent: ChartSpec): ChartSpec {
  return parent.legend === undefined ? input : { ...input, legend: parent.legend };
}

function visualFieldValues(
  spec: NormalizedChartSpec,
  field: string,
): { readonly values: DataValue[]; readonly matchedLayers: number } {
  const values: DataValue[] = [];
  let matchedLayers = 0;
  for (const layer of spec.layers) {
    const matches = visualColorChannels.some((channel) => layer.encoding[channel]?.field === field);
    if (!matches) continue;
    matchedLayers += 1;
    const table = DataTable.from(layer.data);
    for (let index = 0; index < table.length; index += 1) values.push(table.value(index, field));
  }
  return { values, matchedLayers };
}

function harmonizeSharedLegendDomains(
  parent: ChartSpec,
  views: readonly ViewDefinition[],
  registry: RuntimeRegistry,
  shareLegend: boolean,
  shareColorbar: boolean,
): readonly ViewDefinition[] {
  const normalized = views.map((view) => {
    const spec = withCompositionLegend(view.spec, parent);
    const theme = registry.themes.resolve(spec.theme ?? defaultThemeId);
    const value = normalizeSpec(spec, theme);
    return { view, spec, normalized: value, model: resolveLegendModel(value, theme) };
  });
  const models = normalized.flatMap(({ model }) => (model === null ? [] : [model]));
  if (models.length === 0 || models.every(({ mode }) => mode === 'layers')) {
    return normalized.map(({ view, spec }) => ({ ...view, spec }));
  }
  const mode = models[0]!.mode;
  if (models.some((model) => model.mode !== mode)) {
    fail(
      'Shared legends require every participating view to use the same legend mode.',
      '$.resolve',
    );
  }
  if ((mode === 'continuous' && !shareColorbar) || (mode !== 'continuous' && !shareLegend)) {
    return normalized.map(({ view, spec }) => ({ ...view, spec }));
  }
  const field = models[0]!.field;
  if (field === undefined || models.some((model) => model.field !== field)) {
    fail('Shared category legends and colorbars require one common field.', '$.legend.field');
  }
  const explicitColors = models.every(
    (model) =>
      model.spec.items.length > 0 && model.spec.items.every((item) => item.color !== undefined),
  );
  const collected = normalized.map(({ normalized: spec }) => visualFieldValues(spec, field));
  if (!explicitColors && collected.some(({ matchedLayers }) => matchedLayers === 0)) {
    fail(
      'Shared category legends and colorbars require a portable color, fill, or stroke encoding for their field, or explicit colored legend items.',
      '$.legend.field',
    );
  }
  if (explicitColors) return normalized.map(({ view, spec }) => ({ ...view, spec }));
  const values = collected.flatMap(({ values: entries }) => entries);
  const domain: readonly (number | string)[] =
    mode === 'continuous'
      ? (() => {
          const numbers = values.flatMap((value) =>
            typeof value === 'number' && Number.isFinite(value)
              ? [value]
              : value instanceof Date
                ? [value.getTime()]
                : [],
          );
          if (numbers.length === 0) {
            fail(
              'Shared colorbar field must contain finite numeric or temporal values.',
              '$.legend.field',
            );
          }
          const minimum = Math.min(...numbers);
          const maximum = Math.max(...numbers);
          return minimum === maximum ? [minimum - 1, maximum + 1] : [minimum, maximum];
        })()
      : (() => {
          const seen = new Set<string>();
          const categories: Array<number | string> = [];
          for (const value of values) {
            const normalizedValue = value instanceof Date ? value.toISOString() : value;
            if (typeof normalizedValue !== 'number' && typeof normalizedValue !== 'string')
              continue;
            const key = `${typeof normalizedValue}:${String(normalizedValue)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            categories.push(normalizedValue);
          }
          if (categories.length === 0) {
            fail(
              'Shared category legend field must contain string or number values.',
              '$.legend.field',
            );
          }
          return categories;
        })();
  return normalized.map(({ view, spec }) => ({
    ...view,
    spec: forceVisualDomain(spec, field, domain),
  }));
}

function scopedLegendLayer(layer: NormalizedLayerSpec, view: ViewDefinition): NormalizedLayerSpec {
  return {
    ...layer,
    id: `${view.id}/${layer.id}`,
    name: view.label === '' ? layer.name : `${view.label}: ${layer.name}`,
  };
}

function sharedLegendItemId(viewId: string, id: string): string {
  // Legend item ids are already normalized, and inferred category ids carry a
  // full canonical hex token. Keep that suffix intact so values with a common
  // prefix cannot collapse to the same interactive id.
  return `shared-${safeToken(viewId)}-${id}`;
}

function mergeSharedLegendItems(
  models: readonly { readonly view: ViewDefinition; readonly model: LegendModel }[],
  mode: LegendModel['mode'],
  locale: string | undefined,
): readonly NormalizedLegendItemSpec[] {
  if (mode === 'layers') {
    return models.flatMap(({ view, model }) =>
      model.items.map((item) => ({
        ...item,
        id: sharedLegendItemId(view.id, item.id),
        label: view.label === '' ? item.label : `${view.label}: ${item.label}`,
        ...(item.layerId === undefined ? {} : { layerId: `${view.id}/${item.layerId}` }),
      })),
    );
  }
  if (mode === 'categories') {
    const seen = new Set<string>();
    return models.flatMap(({ model }) =>
      model.items.flatMap((item) => {
        const key = valueKey(item.value);
        if (seen.has(key)) return [];
        seen.add(key);
        const { layerId: _layerId, ...unscoped } = item;
        return [{ ...unscoped, id: `shared-${item.id}` }];
      }),
    );
  }
  const numericItems = models
    .flatMap(({ model }) => model.items)
    .filter(
      (item): item is NormalizedLegendItemSpec & { readonly value: number } =>
        typeof item.value === 'number' && Number.isFinite(item.value),
    );
  if (numericItems.length === 0) return models[0]?.model.items ?? [];
  const minimum = numericItems.reduce((left, right) => (left.value <= right.value ? left : right));
  const maximum = numericItems.reduce((left, right) => (left.value >= right.value ? left : right));
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  } catch {
    formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 });
  }
  return [
    { ...minimum, id: 'shared-continuous-min', label: formatter.format(minimum.value) },
    { ...maximum, id: 'shared-continuous-max', label: formatter.format(maximum.value) },
  ];
}

function resolveSharedLegend(
  parent: ChartSpec,
  views: readonly ViewDefinition[],
  registry: RuntimeRegistry,
  width: number,
  height: number,
  shareLegend: boolean,
  shareColorbar: boolean,
): LegendModel | null {
  const resolved = views.flatMap((view) => {
    const spec = withCompositionLegend(view.spec, parent);
    const theme = registry.themes.resolve(spec.theme ?? defaultThemeId);
    const normalized = normalizeSpec(spec, theme);
    const model = resolveLegendModel(normalized, theme, width, height);
    return model === null ? [] : [{ view, normalized, model }];
  });
  if (resolved.length === 0) return null;
  const mode = resolved[0]!.model.mode;
  if (resolved.some(({ model }) => model.mode !== mode)) {
    fail(
      'Shared legends require every participating view to use the same legend mode.',
      '$.resolve',
    );
  }
  if ((mode === 'continuous' && !shareColorbar) || (mode !== 'continuous' && !shareLegend)) {
    return null;
  }
  const first = resolved[0]!;
  const items = mergeSharedLegendItems(resolved, mode, first.normalized.locale);
  const { layerId: _layerId, items: _items, mode: _mode, ...legendRest } = first.model.spec;
  const combined: NormalizedChartSpec = {
    ...first.normalized,
    layers: resolved.flatMap(({ view, normalized }) =>
      normalized.layers.map((layer) => scopedLegendLayer(layer, view)),
    ),
    legend: { ...legendRest, mode, items },
  };
  const theme = registry.themes.resolve(parent.theme ?? defaultThemeId);
  return resolveLegendModel(combined, theme, width, height);
}

function insetContent(content: Rect, insets: ReturnType<typeof legendExternalInsets>): Rect {
  return {
    x: content.x + insets.left,
    y: content.y + insets.top,
    width: Math.max(1, content.width - insets.left - insets.right),
    height: Math.max(1, content.height - insets.top - insets.bottom),
  };
}

function sharedLegendVisibility(
  node: SceneNode,
  model: LegendModel,
  hidden: ReadonlySet<string>,
): SceneNode {
  const hiddenLayers = new Set(
    model.items.flatMap((item) =>
      hidden.has(item.id) &&
      legendItemToggleable(model, item) &&
      item.layerId !== undefined &&
      (model.mode === 'layers' || item.value === undefined)
        ? [item.layerId]
        : [],
    ),
  );
  const hiddenValues = model.items.flatMap((item) =>
    hidden.has(item.id) && legendItemToggleable(model, item) && item.value !== undefined
      ? [item.value]
      : [],
  );
  const visit = (candidate: SceneNode): SceneNode => {
    if (candidate.type === 'group') {
      const layerId = candidate.id.endsWith(':group')
        ? candidate.id.slice(0, -':group'.length)
        : null;
      return {
        ...candidate,
        ...(layerId !== null && hiddenLayers.has(layerId) ? { visible: false } : {}),
        children: candidate.children.map(visit),
      };
    }
    if (model.mode !== 'categories' || model.field === undefined || hiddenValues.length === 0) {
      return candidate;
    }
    const sources: Readonly<Record<string, unknown>>[] = [];
    if (candidate.datum?.tooltip !== undefined) sources.push(candidate.datum.tooltip);
    if (candidate.datum?.datum !== undefined) sources.push(candidate.datum.datum);
    const concealed = sources.some((source) =>
      hiddenValues.some((value) => valueKey(source[model.field!] as DataValue) === valueKey(value)),
    );
    return concealed ? { ...candidate, visible: false } : candidate;
  };
  return visit(node);
}

function compositionContentBounds(spec: NormalizedChartSpec, width: number, height: number): Rect {
  const titleHeight = spec.title === undefined ? 0 : spec.title.subtitle === undefined ? 36 : 56;
  return {
    x: spec.padding.left,
    y: spec.padding.top + titleHeight,
    width: Math.max(0, width - spec.padding.left - spec.padding.right),
    height: Math.max(0, height - spec.padding.top - spec.padding.bottom - titleHeight),
  };
}

function layoutViews(
  input: ChartSpec,
  grid: GridDefinition,
  content: Rect,
  spacing: number,
): readonly ViewLayout[] {
  if (input.inset !== undefined) {
    const base = grid.views[0]!;
    const inset = grid.views[1]!;
    const insetBounds = {
      x: content.x + content.width * input.inset.x,
      y: content.y + content.height * input.inset.y,
      width: content.width * input.inset.width,
      height: content.height * input.inset.height,
    };
    return [
      { ...base, bounds: content, chartBounds: content },
      { ...inset, bounds: insetBounds, chartBounds: insetBounds },
    ];
  }
  const cellWidth = (content.width - spacing * Math.max(0, grid.columns - 1)) / grid.columns;
  const cellHeight = (content.height - spacing * Math.max(0, grid.rows - 1)) / grid.rows;
  const header = grid.showLabels ? facetHeaderHeight : 0;
  if (cellWidth < minimumCellWidth || cellHeight - header < minimumCellHeight) {
    fail(
      `Composition cells require at least ${minimumCellWidth}x${minimumCellHeight}px after spacing and labels.`,
      '$.width',
    );
  }
  return grid.views.map((view) => {
    const bounds = {
      x: content.x + view.column * (cellWidth + spacing),
      y: content.y + view.row * (cellHeight + spacing),
      width: cellWidth,
      height: cellHeight,
    };
    return {
      ...view,
      bounds,
      chartBounds: { ...bounds, y: bounds.y + header, height: bounds.height - header },
    };
  });
}

function translatedRect(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

function scopeNode(node: SceneNode, viewId: string, dx: number, dy: number): SceneNode {
  const scoped = {
    id: `${viewId}/${node.id}`,
    ...(node.datum === undefined
      ? {}
      : { datum: { ...node.datum, layerId: `${viewId}/${node.datum.layerId}` } }),
  };
  switch (node.type) {
    case 'group':
      return {
        ...node,
        ...scoped,
        children: node.children.map((child) => scopeNode(child, viewId, dx, dy)),
        ...(node.clip === undefined ? {} : { clip: translatedRect(node.clip, dx, dy) }),
      };
    case 'line':
      return {
        ...node,
        ...scoped,
        x1: node.x1 + dx,
        y1: node.y1 + dy,
        x2: node.x2 + dx,
        y2: node.y2 + dy,
      };
    case 'path':
      return {
        ...node,
        ...scoped,
        points: node.points.map(({ x, y }) => ({ x: x + dx, y: y + dy })),
        ...(node.subpaths === undefined
          ? {}
          : {
              subpaths: node.subpaths.map((path) =>
                path.map(({ x, y }) => ({ x: x + dx, y: y + dy })),
              ),
            }),
      };
    case 'rect':
      return { ...node, ...scoped, x: node.x + dx, y: node.y + dy };
    case 'circle':
      return { ...node, ...scoped, cx: node.cx + dx, cy: node.cy + dy };
    case 'text':
      return { ...node, ...scoped, x: node.x + dx, y: node.y + dy };
  }
}

function sourceIndices(indices: readonly number[], sourceMap: SourceMap | undefined): number[] {
  if (sourceMap === undefined) return [...indices];
  return [...new Set(indices.flatMap((index) => sourceMap.rows[index] ?? []))].sort(
    (left, right) => left - right,
  );
}

function scopedLineage(
  lineage: DataLineage,
  viewId: string,
  sourceMap: SourceMap | undefined,
): DataLineage {
  const inheritedTransforms = sourceMap?.lineage.transforms ?? [];
  const transforms = [
    ...inheritedTransforms,
    ...lineage.transforms.map((step) => ({
      ...step,
      index: step.index + inheritedTransforms.length,
    })),
  ];
  const sourceId = sourceMap?.lineage.sourceId ?? lineage.sourceId;
  const sourceRows = sourceMap?.sourceRows ?? lineage.sourceRows;
  return {
    ...lineage,
    sourceId: `${viewId}/${sourceId}`,
    sourceRows,
    transforms,
    rowSources: lineage.rowSources.map((indices) => sourceIndices(indices, sourceMap)),
    summary: `[${viewId}] ${sourceRows} source rows, ${transforms.length} ordered transforms, ${lineage.outputRows} output rows.`,
  };
}

function scopedSemantic(mark: SemanticMark, view: ViewLayout): SemanticMark {
  const dx = view.chartBounds.x;
  const dy = view.chartBounds.y;
  const remapped = sourceIndices(mark.lineage.sourceRowIndices, view.sourceMap);
  const semanticViewId = mark.viewId === 'plot' ? view.id : `${view.id}/${mark.viewId}`;
  return {
    ...mark,
    id: `${view.id}/${mark.id}`,
    viewId: semanticViewId,
    layerId: `${view.id}/${mark.layerId}`,
    bounds: translatedRect(mark.bounds, dx, dy),
    label: view.label === '' ? mark.label : `${view.label}. ${mark.label}`,
    lineage: {
      ...mark.lineage,
      sourceId: `${view.id}/${view.sourceMap?.lineage.sourceId ?? mark.lineage.sourceId}`,
      sourceRowIndices: remapped,
      truncated: mark.lineage.truncated || remapped.length > mark.lineage.sourceRowIndices.length,
    },
  };
}

function scopedLayer(layer: NormalizedLayerSpec, view: ViewLayout): NormalizedLayerSpec {
  return {
    ...layer,
    id: `${view.id}/${layer.id}`,
    name: view.label === '' ? layer.name : `${view.label}: ${layer.name}`,
  };
}

function titleNodes(spec: NormalizedChartSpec, theme: ThemeTokens, width: number): SceneNode[] {
  if (spec.title === undefined) return [];
  const align = spec.title.align ?? 'left';
  const x =
    align === 'left'
      ? spec.padding.left
      : align === 'right'
        ? width - spec.padding.right
        : width / 2;
  const nodes: TextNode[] = [
    {
      type: 'text',
      ...nodeBase('composition:title', { zIndex: 1000 }),
      x,
      y: spec.padding.top,
      text: spec.title.text,
      fill: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.titleSize,
      fontWeight: theme.typography.titleWeight ?? 700,
      align,
      baseline: 'top',
      rotation: 0,
    },
  ];
  if (spec.title.subtitle !== undefined) {
    nodes.push({
      type: 'text',
      ...nodeBase('composition:subtitle', { zIndex: 1000 }),
      x,
      y: spec.padding.top + theme.typography.titleSize + 6,
      text: spec.title.subtitle,
      fill: theme.colors.subtitle ?? theme.colors.mutedText,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.subtitleSize,
      fontWeight: theme.typography.subtitleWeight ?? 400,
      align,
      baseline: 'top',
      rotation: 0,
    });
  }
  return nodes;
}

function labelNode(view: ViewLayout, theme: ThemeTokens): SceneNode[] {
  if (view.chartBounds.y === view.bounds.y || view.label === '') return [];
  return [
    {
      type: 'text',
      ...nodeBase(`composition:label:${view.id}`, { zIndex: 900 }),
      x: view.bounds.x + 4,
      y: view.bounds.y + 3,
      text: view.label,
      fill: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.fontSize,
      fontWeight: 700,
      align: 'left',
      baseline: 'top',
      rotation: 0,
    },
  ];
}

function performanceProfile(results: readonly CompileResult[]): 'standard' | 'large' | 'ultra' {
  const order = { standard: 0, large: 1, ultra: 2 } as const;
  return results.reduce<'standard' | 'large' | 'ultra'>(
    (profile, result) =>
      order[result.scene.metadata.performanceProfile] > order[profile]
        ? result.scene.metadata.performanceProfile
        : profile,
    'standard',
  );
}

function accessibilityDescription(
  spec: NormalizedChartSpec,
  layouts: readonly ViewLayout[],
  results: readonly CompileResult[],
): string | undefined {
  const children = results.slice(0, 16).flatMap((result, index) => {
    const label = layouts[index]?.label ?? `View ${index + 1}`;
    const description = result.scene.accessibility.description;
    return description === undefined ? [label] : [`${label}: ${description}`];
  });
  if (results.length > 16) children.push(`${results.length - 16} additional views.`);
  const description = [spec.description, spec.accessibility.summary, ...children]
    .filter((value): value is string => value !== undefined && value !== '')
    .join(' ');
  return description === '' ? undefined : description;
}

function gridFor(input: ChartSpec, kind: Exclude<CompositionKind, 'layer'>): GridDefinition {
  switch (kind) {
    case 'facet':
      return materializeFacet(input);
    case 'repeat':
      return materializeRepeat(input);
    case 'hconcat':
    case 'vconcat':
    case 'concat':
      return materializeConcat(input, kind);
    case 'inset':
      return materializeInset(input);
  }
}

/** Compile a validated composition into one renderer-neutral Canvas scene. */
export function compileCompositionWithRegistry(
  input: ChartSpec,
  registry: RuntimeRegistry,
  options: CompileOptions,
  runtime: CompileRuntimeState,
  compiler: CompositionCompiler,
): CompileResult {
  assertValidSpec(input);
  const kind = compositionKind(input);
  if (kind === null) fail('Exactly one composition operator is required.');
  const resolve = resolveComposition(input.resolve, kind);
  if (kind === 'layer') {
    const result = compiler.compileUnit(flattenLayerComposition(input), registry, options, runtime);
    return {
      ...result,
      scene: {
        ...result.scene,
        metadata: {
          ...result.scene.metadata,
          composition: {
            kind,
            viewCount: 1,
            viewIds: ['plot'],
            resolve,
          },
        },
      },
    };
  }

  const theme = registry.themes.resolve(input.theme ?? defaultThemeId);
  const spec = normalizeSpec(input, theme);
  const width = Math.max(1, spec.width === 'container' ? (options.width ?? 640) : spec.width);
  const height = Math.max(1, spec.height === 'container' ? (options.height ?? 400) : spec.height);
  const baseContent = compositionContentBounds(spec, width, height);
  const spacing = input.spacing ?? 16;
  const grid = gridFor(input, kind);
  if (grid.views.length === 0) fail('Composition produced no views.', `$.${kind}`);
  if (grid.views.length > maximumCompositionViews) {
    fail(`Composition exceeds ${maximumCompositionViews} materialized views.`, `$.${kind}`);
  }
  let views = resolve.scale === 'shared' ? harmonizeSharedScales(grid.views, registry) : grid.views;
  const shareLegend = resolve.legend === 'shared';
  const shareColorbar = resolve.colorbar === 'shared';
  if (shareLegend || shareColorbar) {
    views = harmonizeSharedLegendDomains(input, views, registry, shareLegend, shareColorbar);
  }
  if (resolve.axis === 'shared') views = sharedAxisViews(input, views);
  const sharedLegendModel = resolveSharedLegend(
    input,
    views,
    registry,
    width,
    height,
    shareLegend,
    shareColorbar,
  );
  const content = insetContent(baseContent, legendExternalInsets(sharedLegendModel));
  const layouts = layoutViews(input, { ...grid, views }, content, spacing);
  const results = layouts.map((view) => {
    const child = interactionForView(
      sharedLegendModel === null ? view.spec : { ...view.spec, legend: false },
      input,
    );
    return compiler.compile(
      child,
      registry,
      { width: view.chartBounds.width, height: view.chartBounds.height },
      runtimeForView(runtime, view.id),
    );
  });
  const layers = layouts.flatMap((view, index) =>
    results[index]!.spec.layers.map((layer) => scopedLayer(layer, view)),
  );
  if (layers.length > maximumCompositionLayers) {
    fail(`Composition exceeds ${maximumCompositionLayers} compiled layers.`, `$.${kind}`);
  }
  const dataLineage: Record<string, DataLineage> = {};
  layouts.forEach((view, index) => {
    for (const [layerId, lineage] of Object.entries(results[index]!.dataLineage)) {
      dataLineage[`${view.id}/${layerId}`] = scopedLineage(lineage, view.id, view.sourceMap);
    }
  });
  const hiddenLegendItems = runtime.hiddenLegendItemIds ?? new Set<string>();
  const scopedChildren = layouts.map((view, index) =>
    results[index]!.scene.root.children.map((node) => {
      const scoped = scopeNode(node, view.id, view.chartBounds.x, view.chartBounds.y);
      return sharedLegendModel === null
        ? scoped
        : sharedLegendVisibility(scoped, sharedLegendModel, hiddenLegendItems);
    }),
  );
  const viewGroups = layouts.map((view, index) => {
    const result = results[index]!;
    const children = [...labelNode(view, theme), ...scopedChildren[index]!];
    return group(`composition:view:${view.id}`, children, {
      zIndex: kind === 'inset' ? index * 1000 : index,
      clip: view.bounds,
    });
  });
  const scopedLayerGroups = scopedChildren.flatMap((children) =>
    children.filter((node) => node.type === 'group' && node.id.endsWith(':group')),
  );
  const sharedLegend = compileLegend(
    sharedLegendModel,
    scopedLayerGroups,
    content,
    width,
    height,
    theme,
    hiddenLegendItems,
  );
  const scopedTechnicalIndicators = layouts.flatMap((view, index) =>
    (results[index]!.scene.metadata.technicalIndicators ?? []).map((indicator) => ({
      ...indicator,
      layerId: `${view.id}/${indicator.layerId}`,
    })),
  );
  const technicalIndicatorPanels =
    scopedTechnicalIndicators.length === 0
      ? []
      : layouts.flatMap((view, index) => {
          const result = results[index]!;
          const coordinateView = result.coordinateViews[0];
          if (coordinateView === undefined) return [];
          const declared = result.scene.metadata.technicalIndicatorPanels?.[0];
          const id = declared?.id ?? (index === 0 ? 'price' : view.id);
          return [
            {
              id,
              bounds: translatedRect(coordinateView.bounds, view.chartBounds.x, view.chartBounds.y),
              layerIds: result.spec.layers.map(({ id: layerId }) => `${view.id}/${layerId}`),
              placement: declared?.placement ?? (index === 0 ? 'price' : 'indicator'),
            } as const,
          ];
        });
  const technicalCrosshairPositions =
    runtime.technicalCrosshairValue === undefined
      ? []
      : layouts.flatMap((view, index) => {
          const result = results[index]!;
          const coordinateView = result.coordinateViews[0];
          const panel = technicalIndicatorPanels[index];
          const xScale = coordinateView?.coordinates.axes.x;
          if (coordinateView === undefined || panel === undefined || xScale === undefined)
            return [];
          const localX = xScale.map(runtime.technicalCrosshairValue!);
          const x = localX + view.chartBounds.x;
          if (!Number.isFinite(x) || x < panel.bounds.x || x > panel.bounds.x + panel.bounds.width)
            return [];
          return [{ panelId: panel.id, x, bounds: panel.bounds }];
        });
  const technicalCrosshairNodes: SceneNode[] = technicalCrosshairPositions.map(
    ({ panelId, x, bounds }) => ({
      type: 'line',
      ...nodeBase(`technical-crosshair:${panelId}`, { zIndex: 1_800, opacity: 0.72 }),
      x1: x,
      y1: bounds.y,
      x2: x,
      y2: bounds.y + bounds.height,
      stroke: theme.colors.text,
      lineWidth: 1,
      dash: [4, 3],
    }),
  );
  const root = group('scene:root', [
    ...titleNodes(spec, theme, width),
    ...viewGroups,
    ...technicalCrosshairNodes,
    ...sharedLegend.nodes,
  ]);
  const semanticIndex = layouts
    .flatMap((view, index) =>
      results[index]!.scene.semanticIndex.map((mark) => scopedSemantic(mark, view)),
    )
    .slice(0, spec.accessibility.maxRows);
  const totalRows = results.reduce((sum, result) => sum + result.scene.metadata.rowCount, 0);
  const description = accessibilityDescription(spec, layouts, results);
  const scene: Scene = {
    width,
    height,
    background: theme.colors.background,
    root,
    accessibility: {
      label:
        spec.accessibility.label ??
        `${spec.title?.text ?? 'Graflume composition'}. ${layouts.length} views.`,
      ...(description === undefined ? {} : { description }),
    },
    semanticIndex,
    metadata: {
      rowCount: totalRows,
      renderedNodeCount: countSceneNodes(root),
      performanceProfile: performanceProfile(results),
      hitTestingEnabled: results.every((result) => result.scene.metadata.hitTestingEnabled),
      dataLineage: Object.values(dataLineage).map(({ summary }) => summary),
      ...(scopedTechnicalIndicators.length === 0
        ? {}
        : {
            technicalIndicators: scopedTechnicalIndicators,
            technicalIndicatorPanels,
            ...(runtime.technicalCrosshairValue === undefined
              ? {}
              : {
                  technicalIndicatorCrosshair: {
                    value: runtime.technicalCrosshairValue,
                    panelIds: technicalCrosshairPositions.map(({ panelId }) => panelId),
                    positions: technicalCrosshairPositions.map(({ panelId, x }) => ({
                      panelId,
                      x,
                    })),
                  },
                }),
          }),
      composition: {
        kind,
        viewCount: layouts.length,
        viewIds: layouts.map(({ id }) => id),
        resolve,
      },
    },
  };
  const normalized: NormalizedChartSpec = {
    ...spec,
    layers,
    legend: sharedLegendModel?.spec ?? false,
    highlights: [],
    annotations: [],
  };
  const coordinates: CartesianCoordinateContext = Object.freeze({
    plot: Object.freeze({ ...content }),
    axes: Object.freeze({}),
  });
  registerLegendLayout(scene, sharedLegend.layout);
  const coordinateViews = layouts.flatMap((view, index) =>
    results[index]!.coordinateViews.map((coordinateView) => ({
      ...coordinateView,
      id: coordinateView.id === 'plot' ? view.id : `${view.id}/${coordinateView.id}`,
      label:
        coordinateView.label === ''
          ? view.label
          : view.label === ''
            ? coordinateView.label
            : `${view.label}: ${coordinateView.label}`,
      bounds: translatedRect(coordinateView.bounds, view.chartBounds.x, view.chartBounds.y),
      offsetX: coordinateView.offsetX + view.chartBounds.x,
      offsetY: coordinateView.offsetY + view.chartBounds.y,
    })),
  );
  return {
    scene,
    spec: normalized,
    theme,
    dataLineage,
    // Keep the historical aggregate coordinate surface axis-free. Runtime
    // interaction resolves the explicit leaf contexts in coordinateViews.
    coordinates,
    coordinateViews,
  };
}
