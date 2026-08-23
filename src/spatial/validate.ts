import type { SpatialChartSpec, SpatialColor, SpatialVec3 } from './types.js';
import { estimateSpatialOutput, spatialOutputBudgetViolations } from './budget.js';

export interface SpatialSpecIssue {
  readonly path: string;
  readonly message: string;
}

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const ROOT_KEYS = new Set([
  'specVersion',
  'title',
  'background',
  'ariaLabel',
  'camera',
  'lighting',
  'interaction',
  'accessibility',
  'legend',
  'highlights',
  'annotations',
  'layers',
]);
const CAMERA_KEYS = new Set([
  'projection',
  'target',
  'yaw',
  'pitch',
  'distance',
  'fov',
  'near',
  'far',
]);
const LIGHTING_KEYS = new Set(['ambient', 'diffuse', 'direction']);
const INTERACTION_KEYS = new Set([
  'orbit',
  'pan',
  'zoom',
  'wheel',
  'picking',
  'tooltip',
  'controls',
  'labels',
  'selection',
]);
const TOOLTIP_KEYS = new Set(['title', 'fields']);
const CONTROL_LABEL_KEYS = new Set([
  'chart',
  'toolbar',
  'orbit',
  'pan',
  'zoomIn',
  'zoomOut',
  'reset',
  'projection',
  'fullscreen',
  'exportPng',
  'showAnnotations',
  'hideAnnotations',
  'instructions',
  'contextLost',
  'unavailable',
]);
const CONTROLS_KEYS = new Set(['annotations']);
const ACCESSIBILITY_KEYS = new Set(['description', 'table', 'maxRows']);
const LAYER_KEYS = new Set(['id', 'name', 'mark', 'data']);
const SELECTION_KEYS = new Set([
  'mode',
  'toggle',
  'key',
  'clearOnBackground',
  'clearOnEscape',
  'ariaLabel',
  'highlight',
]);
const LEGEND_KEYS = new Set([
  'visible',
  'mode',
  'position',
  'orientation',
  'title',
  'field',
  'layerId',
  'items',
  'maxItems',
  'interactive',
  'labels',
]);
const LEGEND_ITEM_KEYS = new Set(['id', 'label', 'color', 'layerId', 'value', 'symbol']);
const LEGEND_LABEL_KEYS = new Set(['show', 'hide']);
const HIGHLIGHT_KEYS = new Set([
  'id',
  'target',
  'fill',
  'stroke',
  'opacity',
  'lineWidth',
  'dash',
  'padding',
  'radius',
]);
const ANNOTATION_KEYS = new Set([
  'id',
  'target',
  'text',
  'detail',
  'placement',
  'offsetX',
  'offsetY',
  'connector',
  'style',
]);
const CONNECTOR_KEYS = new Set(['visible', 'color', 'width', 'dash']);
const ANNOTATION_STYLE_KEYS = new Set([
  'background',
  'border',
  'color',
  'opacity',
  'fontSize',
  'maxWidth',
  'padding',
  'align',
]);
const SURFACE_MARK_KEYS = new Set(['type', 'mode', 'color', 'opacity', 'wireframe']);
const VOLUME_MARK_KEYS = new Set([
  'type',
  'mode',
  'isoValue',
  'opacity',
  'pointSize',
  'maxSamples',
  'colorLow',
  'colorHigh',
]);
const VECTOR_MARK_KEYS = new Set([
  'type',
  'mode',
  'color',
  'opacity',
  'radius',
  'scale',
  'segments',
]);
const SCATTER_MARK_KEYS = new Set(['type', 'color', 'opacity', 'pointSize']);
const GLOBE_MARK_KEYS = new Set([
  'type',
  'radius',
  'landColor',
  'oceanColor',
  'borderColor',
  'pointColor',
  'routeColor',
  'opacity',
  'routeSegments',
]);
const SURFACE_GRID_KEYS = new Set(['rows', 'columns', 'z', 'x', 'y', 'values']);
const MESH_KEYS = new Set(['positions', 'triangles', 'normals', 'colors', 'labels']);
const VOLUME_DATA_KEYS = new Set(['dimensions', 'values', 'origin', 'spacing']);
const CONE_DATA_KEYS = new Set(['origins', 'vectors', 'labels', 'colors']);
const STREAM_DATA_KEYS = new Set(['paths', 'labels', 'colors']);
const SCATTER_DATA_KEYS = new Set(['positions', 'values', 'sizes', 'colors', 'labels']);
const GLOBE_DATA_KEYS = new Set(['points', 'routes']);
const GLOBE_POINT_KEYS = new Set(['longitude', 'latitude', 'value', 'label', 'color', 'size']);
const GLOBE_ROUTE_KEYS = new Set(['from', 'to', 'value', 'label', 'color']);

const MAX_LAYERS = 64;
const MAX_POINTS = 1_000_000;
const MAX_TRIANGLES = 2_000_000;
const MAX_VOLUME_CELLS = 4_194_304;
const MAX_VECTOR_COUNT = 250_000;
const MAX_PATHS = 4_096;
const MAX_GLOBE_ITEMS = 100_000;
const MAX_PORTABLE_NODES = 6_000_000;
const MAX_PORTABLE_DEPTH = 48;
const MAX_STRING_LENGTH = 8_192;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null || prototype === Object.prototype) return true;
  const constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor')?.value;
  return (
    Object.getPrototypeOf(prototype) === null &&
    typeof constructor === 'function' &&
    constructor.name === 'Object'
  );
}

function issue(issues: SpatialSpecIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function objectValue(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
): RecordValue | undefined {
  if (!isRecord(value)) {
    issue(issues, path, 'Must be an object.');
    return undefined;
  }
  return value;
}

function closedObject(
  value: unknown,
  path: string,
  keys: ReadonlySet<string>,
  issues: SpatialSpecIssue[],
): RecordValue | undefined {
  const record = objectValue(value, path, issues);
  if (record === undefined) return undefined;
  for (const key of Object.keys(record)) {
    if (!keys.has(key)) issue(issues, `${path}.${key}`, `Unknown property "${key}".`);
  }
  return record;
}

function finiteNumber(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
  minimum = -Number.MAX_VALUE,
  maximum = Number.MAX_VALUE,
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issue(issues, path, 'Must be a finite number.');
    return undefined;
  }
  if (value < minimum || value > maximum) {
    issue(issues, path, `Must be between ${minimum} and ${maximum}.`);
    return undefined;
  }
  return value;
}

function integer(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
  minimum: number,
  maximum: number,
): number | undefined {
  const parsed = finiteNumber(value, path, issues, minimum, maximum);
  if (parsed !== undefined && !Number.isInteger(parsed)) {
    issue(issues, path, 'Must be an integer.');
    return undefined;
  }
  return parsed;
}

function optionalString(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
  maximum = MAX_STRING_LENGTH,
): void {
  if (value === undefined) return;
  if (typeof value !== 'string') {
    issue(issues, path, 'Must be a string.');
    return;
  }
  if (value.length > maximum) issue(issues, path, `Must contain at most ${maximum} characters.`);
}

function optionalNonEmptyString(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
  maximum = MAX_STRING_LENGTH,
): void {
  optionalString(value, path, issues, maximum);
  if (typeof value === 'string' && value.trim() === '')
    issue(issues, path, 'Must contain at least one non-whitespace character.');
}

function optionalIdentifier(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
  maximum = 128,
): void {
  optionalNonEmptyString(value, path, issues, maximum);
  if (typeof value === 'string' && value.trim() !== value)
    issue(issues, path, 'Must not contain leading or trailing whitespace.');
}

function optionalBoolean(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value !== undefined && typeof value !== 'boolean') issue(issues, path, 'Must be a boolean.');
}

function optionalEnum(
  value: unknown,
  path: string,
  values: ReadonlySet<string>,
  issues: SpatialSpecIssue[],
): void {
  if (value !== undefined && (typeof value !== 'string' || !values.has(value))) {
    issue(issues, path, `Must be one of: ${[...values].join(', ')}.`);
  }
}

function numberArray(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
  maximum: number,
  exactLength?: number,
): readonly number[] | undefined {
  if (!Array.isArray(value)) {
    issue(issues, path, 'Must be an array.');
    return undefined;
  }
  if (value.length > maximum) issue(issues, path, `Must contain at most ${maximum} values.`);
  if (exactLength !== undefined && value.length !== exactLength) {
    issue(issues, path, `Must contain exactly ${exactLength} values.`);
  }
  for (let index = 0; index < Math.min(value.length, maximum + 1); index += 1) {
    finiteNumber(value[index], `${path}[${index}]`, issues);
  }
  return value as readonly number[];
}

function vec3(value: unknown, path: string, issues: SpatialSpecIssue[]): value is SpatialVec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    issue(issues, path, 'Must be a three-number tuple.');
    return false;
  }
  return value.every(
    (entry, index) => finiteNumber(entry, `${path}[${index}]`, issues) !== undefined,
  );
}

function lonLat(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (!Array.isArray(value) || value.length !== 2) {
    issue(issues, path, 'Must be a longitude/latitude tuple.');
    return;
  }
  finiteNumber(value[0], `${path}[0]`, issues, -180, 180);
  finiteNumber(value[1], `${path}[1]`, issues, -90, 90);
}

function color(value: unknown, path: string, issues: SpatialSpecIssue[]): value is SpatialColor {
  if (typeof value === 'string') {
    if (value.length === 0 || value.length > 128)
      issue(issues, path, 'Color strings must contain 1 to 128 characters.');
    return true;
  }
  if (!Array.isArray(value) || (value.length !== 3 && value.length !== 4)) {
    issue(issues, path, 'Must be a color string or a three/four-number tuple.');
    return false;
  }
  value.forEach((entry, index) => finiteNumber(entry, `${path}[${index}]`, issues, 0, 255));
  return true;
}

function optionalColor(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value !== undefined) color(value, path, issues);
}

function jsonScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function validateDash(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 16) {
    issue(issues, path, 'Must be an array with at most 16 values.');
    return;
  }
  value.forEach((entry, index) => finiteNumber(entry, `${path}[${index}]`, issues, 0, 256));
}

function validateHighlightStyle(
  value: RecordValue,
  path: string,
  issues: SpatialSpecIssue[],
): void {
  optionalNonEmptyString(value.fill, `${path}.fill`, issues, 128);
  optionalNonEmptyString(value.stroke, `${path}.stroke`, issues, 128);
  if (value.opacity !== undefined) finiteNumber(value.opacity, `${path}.opacity`, issues, 0, 1);
  if (value.lineWidth !== undefined)
    finiteNumber(value.lineWidth, `${path}.lineWidth`, issues, 0, 64);
  if (value.padding !== undefined) finiteNumber(value.padding, `${path}.padding`, issues, 0, 256);
  if (value.radius !== undefined) finiteNumber(value.radius, `${path}.radius`, issues, 0, 256);
  validateDash(value.dash, `${path}.dash`, issues);
}

function validateSpatialTarget(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  const target = objectValue(value, path, issues);
  if (target === undefined || typeof target.type !== 'string') {
    if (target !== undefined) issue(issues, `${path}.type`, 'Target type is required.');
    return;
  }
  if (target.type === 'datum') {
    const datum = closedObject(
      target,
      path,
      new Set(['type', 'layerId', 'datumIndex', 'field', 'value', 'values']),
      issues,
    );
    if (datum === undefined) return;
    optionalIdentifier(datum.layerId, `${path}.layerId`, issues);
    if (datum.datumIndex !== undefined) {
      const indices = Array.isArray(datum.datumIndex) ? datum.datumIndex : [datum.datumIndex];
      if (indices.length === 0 || indices.length > 1000)
        issue(issues, `${path}.datumIndex`, 'Must select between 1 and 1000 datum indices.');
      indices.forEach((entry, index) =>
        integer(
          entry,
          Array.isArray(datum.datumIndex) ? `${path}.datumIndex[${index}]` : `${path}.datumIndex`,
          issues,
          0,
          Number.MAX_SAFE_INTEGER,
        ),
      );
      if (new Set(indices).size !== indices.length)
        issue(issues, `${path}.datumIndex`, 'Datum indices must be unique.');
    }
    optionalNonEmptyString(datum.field, `${path}.field`, issues, 128);
    if (typeof datum.field === 'string' && UNSAFE_KEYS.has(datum.field))
      issue(issues, `${path}.field`, 'Unsafe datum field is forbidden.');
    const hasValue = Object.prototype.hasOwnProperty.call(datum, 'value');
    const hasValues = Object.prototype.hasOwnProperty.call(datum, 'values');
    if (hasValue && !jsonScalar(datum.value))
      issue(issues, `${path}.value`, 'Must be a JSON scalar.');
    if (hasValues) {
      if (!Array.isArray(datum.values) || datum.values.length === 0 || datum.values.length > 200)
        issue(issues, `${path}.values`, 'Must contain between 1 and 200 JSON scalars.');
      else
        datum.values.forEach((entry, index) => {
          if (!jsonScalar(entry))
            issue(issues, `${path}.values[${index}]`, 'Must be a JSON scalar.');
        });
      if (
        Array.isArray(datum.values) &&
        new Set(datum.values.map((entry) => JSON.stringify(entry))).size !== datum.values.length
      )
        issue(issues, `${path}.values`, 'Datum values must be unique.');
    }
    if (datum.field === undefined && (hasValue || hasValues))
      issue(issues, `${path}.field`, 'Field is required for value matching.');
    if (datum.field !== undefined && hasValue === hasValues)
      issue(issues, path, 'Field matching requires exactly one of value or values.');
    if (datum.datumIndex === undefined && datum.field === undefined)
      issue(issues, path, 'Datum target requires datumIndex or field matching.');
    return;
  }
  if (target.type === 'layer') {
    const layer = closedObject(target, path, new Set(['type', 'layerId']), issues);
    if (layer !== undefined) {
      optionalIdentifier(layer.layerId, `${path}.layerId`, issues);
      if (layer.layerId === undefined) issue(issues, `${path}.layerId`, 'Layer id is required.');
    }
    return;
  }
  if (target.type === 'point') {
    const point = closedObject(target, path, new Set(['type', 'position']), issues);
    if (point !== undefined) vec3(point.position, `${path}.position`, issues);
    return;
  }
  if (target.type === 'box') {
    const box = closedObject(target, path, new Set(['type', 'min', 'max']), issues);
    if (box !== undefined) {
      const minValid = vec3(box.min, `${path}.min`, issues);
      const maxValid = vec3(box.max, `${path}.max`, issues);
      if (
        minValid &&
        maxValid &&
        (box.min as SpatialVec3).some(
          (entry: number, index: number) => entry > (box.max as SpatialVec3)[index]!,
        )
      )
        issue(issues, path, 'Box min values must not exceed max values.');
    }
    return;
  }
  issue(issues, `${path}.type`, 'Unsupported spatial decoration target.');
}

function validateSelection(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  const selection = closedObject(value, path, SELECTION_KEYS, issues);
  if (selection === undefined) return;
  optionalEnum(selection.mode, `${path}.mode`, new Set(['single', 'multiple']), issues);
  optionalBoolean(selection.toggle, `${path}.toggle`, issues);
  optionalNonEmptyString(selection.key, `${path}.key`, issues, 128);
  if (typeof selection.key === 'string' && UNSAFE_KEYS.has(selection.key))
    issue(issues, `${path}.key`, 'Unsafe selection key is forbidden.');
  optionalBoolean(selection.clearOnBackground, `${path}.clearOnBackground`, issues);
  optionalBoolean(selection.clearOnEscape, `${path}.clearOnEscape`, issues);
  optionalNonEmptyString(selection.ariaLabel, `${path}.ariaLabel`, issues, 256);
  if (selection.highlight !== undefined) {
    const highlight = closedObject(
      selection.highlight,
      `${path}.highlight`,
      new Set(['fill', 'stroke', 'opacity', 'lineWidth', 'dash', 'padding', 'radius']),
      issues,
    );
    if (highlight !== undefined) validateHighlightStyle(highlight, `${path}.highlight`, issues);
  }
}

function validateLegend(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  const legend = closedObject(value, path, LEGEND_KEYS, issues);
  if (legend === undefined) return;
  optionalBoolean(legend.visible, `${path}.visible`, issues);
  optionalBoolean(legend.interactive, `${path}.interactive`, issues);
  optionalEnum(
    legend.mode,
    `${path}.mode`,
    new Set(['auto', 'layers', 'categories', 'continuous']),
    issues,
  );
  optionalEnum(
    legend.position,
    `${path}.position`,
    new Set([
      'top',
      'right',
      'bottom',
      'left',
      'inside-top-left',
      'inside-top-right',
      'inside-bottom-left',
      'inside-bottom-right',
    ]),
    issues,
  );
  optionalEnum(
    legend.orientation,
    `${path}.orientation`,
    new Set(['auto', 'horizontal', 'vertical']),
    issues,
  );
  optionalNonEmptyString(legend.title, `${path}.title`, issues, 256);
  optionalNonEmptyString(legend.field, `${path}.field`, issues, 128);
  if (typeof legend.field === 'string' && UNSAFE_KEYS.has(legend.field))
    issue(issues, `${path}.field`, 'Unsafe legend field is forbidden.');
  optionalIdentifier(legend.layerId, `${path}.layerId`, issues);
  if (legend.maxItems !== undefined) integer(legend.maxItems, `${path}.maxItems`, issues, 1, 200);
  if (legend.items !== undefined) {
    if (!Array.isArray(legend.items) || legend.items.length === 0 || legend.items.length > 200) {
      issue(issues, `${path}.items`, 'Must contain between 1 and 200 legend items.');
    } else {
      legend.items.forEach((entry, index) => {
        const itemPath = `${path}.items[${index}]`;
        const item = closedObject(entry, itemPath, LEGEND_ITEM_KEYS, issues);
        if (item === undefined) return;
        optionalNonEmptyString(item.id, `${itemPath}.id`, issues, 128);
        optionalNonEmptyString(item.label, `${itemPath}.label`, issues, 256);
        if (item.label === undefined) issue(issues, `${itemPath}.label`, 'Label is required.');
        optionalNonEmptyString(item.color, `${itemPath}.color`, issues, 128);
        optionalIdentifier(item.layerId, `${itemPath}.layerId`, issues);
        if (item.value !== undefined && !jsonScalar(item.value))
          issue(issues, `${itemPath}.value`, 'Must be a JSON scalar.');
        optionalEnum(
          item.symbol,
          `${itemPath}.symbol`,
          new Set(['auto', 'line', 'point', 'rect']),
          issues,
        );
      });
    }
  }
  if (legend.mode === 'categories' && legend.items === undefined)
    issue(issues, `${path}.items`, 'Spatial category legends require explicit items.');
  if (legend.labels !== undefined) {
    const labels = closedObject(legend.labels, `${path}.labels`, LEGEND_LABEL_KEYS, issues);
    if (labels !== undefined)
      for (const key of LEGEND_LABEL_KEYS)
        optionalNonEmptyString(labels[key], `${path}.labels.${key}`, issues, 128);
  }
}

function validateHighlights(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 256) {
    issue(issues, path, 'Must be an array with at most 256 highlights.');
    return;
  }
  value.forEach((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const highlight = closedObject(entry, itemPath, HIGHLIGHT_KEYS, issues);
    if (highlight === undefined) return;
    optionalNonEmptyString(highlight.id, `${itemPath}.id`, issues, 128);
    validateSpatialTarget(highlight.target, `${itemPath}.target`, issues);
    validateHighlightStyle(highlight, itemPath, issues);
  });
}

function validateAnnotations(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 256) {
    issue(issues, path, 'Must be an array with at most 256 annotations.');
    return;
  }
  value.forEach((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const annotation = closedObject(entry, itemPath, ANNOTATION_KEYS, issues);
    if (annotation === undefined) return;
    optionalNonEmptyString(annotation.id, `${itemPath}.id`, issues, 128);
    optionalNonEmptyString(annotation.text, `${itemPath}.text`, issues, 2_000);
    if (annotation.text === undefined) issue(issues, `${itemPath}.text`, 'Text is required.');
    optionalString(annotation.detail, `${itemPath}.detail`, issues, 4_000);
    validateSpatialTarget(annotation.target, `${itemPath}.target`, issues);
    optionalEnum(
      annotation.placement,
      `${itemPath}.placement`,
      new Set(['auto', 'top', 'right', 'bottom', 'left']),
      issues,
    );
    for (const key of ['offsetX', 'offsetY'] as const)
      if (annotation[key] !== undefined)
        finiteNumber(annotation[key], `${itemPath}.${key}`, issues, -10_000, 10_000);
    if (annotation.connector !== undefined && typeof annotation.connector !== 'boolean') {
      const connector = closedObject(
        annotation.connector,
        `${itemPath}.connector`,
        CONNECTOR_KEYS,
        issues,
      );
      if (connector !== undefined) {
        optionalBoolean(connector.visible, `${itemPath}.connector.visible`, issues);
        optionalNonEmptyString(connector.color, `${itemPath}.connector.color`, issues, 128);
        if (connector.width !== undefined)
          finiteNumber(connector.width, `${itemPath}.connector.width`, issues, 0, 64);
        validateDash(connector.dash, `${itemPath}.connector.dash`, issues);
      }
    }
    if (annotation.style !== undefined) {
      const style = closedObject(
        annotation.style,
        `${itemPath}.style`,
        ANNOTATION_STYLE_KEYS,
        issues,
      );
      if (style !== undefined) {
        for (const key of ['background', 'border', 'color'] as const)
          optionalString(style[key], `${itemPath}.style.${key}`, issues, 128);
        if (style.opacity !== undefined)
          finiteNumber(style.opacity, `${itemPath}.style.opacity`, issues, 0, 1);
        for (const key of ['fontSize', 'maxWidth', 'padding'] as const)
          if (style[key] !== undefined)
            finiteNumber(style[key], `${itemPath}.style.${key}`, issues, 1, 2000);
        optionalEnum(
          style.align,
          `${itemPath}.style.align`,
          new Set(['start', 'center', 'end']),
          issues,
        );
      }
    }
  });
}

function validateLayerReferences(spec: RecordValue, issues: SpatialSpecIssue[]): void {
  const layerIds = new Set<string>();
  if (Array.isArray(spec.layers)) {
    spec.layers.forEach((value, index) => {
      if (!isRecord(value)) return;
      const layerId = value.id === undefined ? `spatial-layer-${index}` : value.id;
      if (typeof layerId !== 'string' || layerId.trim() === '') return;
      if (layerIds.has(layerId)) {
        issue(issues, `$.layers[${index}].id`, `Layer id "${layerId}" must be unique.`);
        return;
      }
      layerIds.add(layerId);
    });
  }

  const check = (value: unknown, path: string): void => {
    if (!isRecord(value) || typeof value.layerId !== 'string') return;
    if (!layerIds.has(value.layerId)) {
      issue(issues, `${path}.layerId`, `Layer id "${value.layerId}" does not exist.`);
    }
  };
  const checkUniqueIds = (
    value: unknown,
    path: string,
    label: string,
    defaultPrefix: string,
  ): void => {
    if (!Array.isArray(value)) return;
    const ids = new Set<string>();
    value.forEach((entry, index) => {
      if (!isRecord(entry)) return;
      const id =
        typeof entry.id === 'string' && entry.id.trim() !== ''
          ? entry.id
          : `${defaultPrefix}-${index}`;
      if (ids.has(id)) {
        issue(
          issues,
          `${path}[${index}].id`,
          `${label} id "${id}" must be unique after defaults are resolved.`,
        );
        return;
      }
      ids.add(id);
    });
  };

  if (isRecord(spec.legend)) {
    const legend = spec.legend;
    check(legend, '$.legend');
    if (Array.isArray(legend.items)) {
      legend.items.forEach((item, index) => check(item, `$.legend.items[${index}]`));
    }
    checkUniqueIds(legend.items, '$.legend.items', 'Legend item', 'item');
    if (Array.isArray(legend.items)) {
      const semanticOwners = new Set<string>();
      legend.items.forEach((item, index) => {
        if (!isRecord(item) || typeof item.layerId !== 'string') return;
        const owner =
          legend.mode === 'categories' && Object.prototype.hasOwnProperty.call(item, 'value')
            ? JSON.stringify(['category', item.layerId, item.value])
            : legend.mode === 'layers'
              ? JSON.stringify(['layer', item.layerId])
              : null;
        if (owner === null) return;
        if (semanticOwners.has(owner))
          issue(
            issues,
            `$.legend.items[${index}]`,
            'Interactive legend items must not control the same semantic owner.',
          );
        else semanticOwners.add(owner);
      });
    }
  }
  if (Array.isArray(spec.highlights)) {
    spec.highlights.forEach((highlight, index) => {
      if (isRecord(highlight)) check(highlight.target, `$.highlights[${index}].target`);
    });
  }
  if (Array.isArray(spec.annotations)) {
    spec.annotations.forEach((annotation, index) => {
      if (isRecord(annotation)) check(annotation.target, `$.annotations[${index}].target`);
    });
  }
  checkUniqueIds(spec.highlights, '$.highlights', 'Highlight', 'highlight');
  checkUniqueIds(spec.annotations, '$.annotations', 'Annotation', 'annotation');
}

function vec3Array(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
  maximum: number,
): readonly SpatialVec3[] | undefined {
  if (!Array.isArray(value)) {
    issue(issues, path, 'Must be an array.');
    return undefined;
  }
  if (value.length > maximum) issue(issues, path, `Must contain at most ${maximum} points.`);
  for (let index = 0; index < Math.min(value.length, maximum + 1); index += 1) {
    vec3(value[index], `${path}[${index}]`, issues);
  }
  return value as readonly SpatialVec3[];
}

function parallelArray(
  value: unknown,
  path: string,
  expectedLength: number,
  issues: SpatialSpecIssue[],
  validateEntry: (entry: unknown, path: string, issues: SpatialSpecIssue[]) => void,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issue(issues, path, 'Must be an array.');
    return;
  }
  if (value.length !== expectedLength)
    issue(issues, path, `Must contain exactly ${expectedLength} values.`);
  for (let index = 0; index < Math.min(value.length, MAX_POINTS + 1); index += 1) {
    validateEntry(value[index], `${path}[${index}]`, issues);
  }
}

function validateCamera(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined) return;
  const camera = closedObject(value, path, CAMERA_KEYS, issues);
  if (camera === undefined) return;
  optionalEnum(
    camera.projection,
    `${path}.projection`,
    new Set(['perspective', 'orthographic']),
    issues,
  );
  if (camera.target !== undefined) vec3(camera.target, `${path}.target`, issues);
  if (camera.yaw !== undefined)
    finiteNumber(camera.yaw, `${path}.yaw`, issues, -1_000_000, 1_000_000);
  if (camera.pitch !== undefined)
    finiteNumber(camera.pitch, `${path}.pitch`, issues, -Math.PI / 2, Math.PI / 2);
  if (camera.distance !== undefined)
    finiteNumber(camera.distance, `${path}.distance`, issues, 0.0001, 1_000_000_000);
  if (camera.fov !== undefined) finiteNumber(camera.fov, `${path}.fov`, issues, 10, 120);
  const near =
    camera.near === undefined
      ? undefined
      : finiteNumber(camera.near, `${path}.near`, issues, 0.000001, 1_000_000);
  const far =
    camera.far === undefined
      ? undefined
      : finiteNumber(camera.far, `${path}.far`, issues, 0.00001, 1_000_000_000_000);
  if (near !== undefined && far !== undefined && far <= near)
    issue(issues, `${path}.far`, 'Must be greater than camera.near.');
}

function validateLighting(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined) return;
  const lighting = closedObject(value, path, LIGHTING_KEYS, issues);
  if (lighting === undefined) return;
  if (lighting.ambient !== undefined)
    finiteNumber(lighting.ambient, `${path}.ambient`, issues, 0, 4);
  if (lighting.diffuse !== undefined)
    finiteNumber(lighting.diffuse, `${path}.diffuse`, issues, 0, 4);
  if (lighting.direction !== undefined) vec3(lighting.direction, `${path}.direction`, issues);
}

function validateInteraction(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined) return;
  const interaction = closedObject(value, path, INTERACTION_KEYS, issues);
  if (interaction === undefined) return;
  for (const key of ['orbit', 'pan', 'zoom', 'picking'] as const) {
    optionalBoolean(interaction[key], `${path}.${key}`, issues);
  }
  if (interaction.controls !== undefined && typeof interaction.controls !== 'boolean') {
    const controls = closedObject(interaction.controls, `${path}.controls`, CONTROLS_KEYS, issues);
    if (controls !== undefined)
      optionalBoolean(controls.annotations, `${path}.controls.annotations`, issues);
  }
  optionalEnum(interaction.wheel, `${path}.wheel`, new Set(['off', 'modifier', 'always']), issues);
  if (interaction.tooltip !== undefined && typeof interaction.tooltip !== 'boolean') {
    const tooltip = closedObject(interaction.tooltip, `${path}.tooltip`, TOOLTIP_KEYS, issues);
    if (tooltip !== undefined) {
      optionalString(tooltip.title, `${path}.tooltip.title`, issues, 256);
      if (tooltip.fields !== undefined) {
        if (!Array.isArray(tooltip.fields) || tooltip.fields.length > 64) {
          issue(issues, `${path}.tooltip.fields`, 'Must be an array with at most 64 fields.');
        } else {
          tooltip.fields.forEach((field, index) =>
            optionalString(field, `${path}.tooltip.fields[${index}]`, issues, 128),
          );
        }
      }
    }
  }
  if (interaction.labels !== undefined) {
    const labels = closedObject(interaction.labels, `${path}.labels`, CONTROL_LABEL_KEYS, issues);
    if (labels !== undefined) {
      for (const key of CONTROL_LABEL_KEYS)
        optionalString(labels[key], `${path}.labels.${key}`, issues, 256);
    }
  }
  validateSelection(interaction.selection, `${path}.selection`, issues);
}

function validateAccessibility(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined) return;
  const accessibility = closedObject(value, path, ACCESSIBILITY_KEYS, issues);
  if (accessibility === undefined) return;
  optionalString(accessibility.description, `${path}.description`, issues, 4_096);
  optionalBoolean(accessibility.table, `${path}.table`, issues);
  if (accessibility.maxRows !== undefined)
    integer(accessibility.maxRows, `${path}.maxRows`, issues, 1, 1_000);
}

function validateSurfaceData(
  value: unknown,
  path: string,
  mode: unknown,
  issues: SpatialSpecIssue[],
): void {
  const data = objectValue(value, path, issues);
  if (data === undefined) return;
  const meshMode = mode === 'mesh' || (mode === undefined && 'positions' in data);
  const keys = meshMode ? MESH_KEYS : SURFACE_GRID_KEYS;
  for (const key of Object.keys(data))
    if (!keys.has(key)) issue(issues, `${path}.${key}`, `Unknown property "${key}".`);
  if (meshMode) {
    const positions = vec3Array(data.positions, `${path}.positions`, issues, MAX_POINTS);
    if (positions !== undefined && positions.length === 0)
      issue(issues, `${path}.positions`, 'Must not be empty.');
    if (!Array.isArray(data.triangles)) {
      issue(issues, `${path}.triangles`, 'Must be an array.');
    } else {
      if (data.triangles.length > MAX_TRIANGLES)
        issue(issues, `${path}.triangles`, `Must contain at most ${MAX_TRIANGLES} triangles.`);
      data.triangles.slice(0, MAX_TRIANGLES + 1).forEach((triangle, index) => {
        if (!Array.isArray(triangle) || triangle.length !== 3) {
          issue(issues, `${path}.triangles[${index}]`, 'Must be a three-index tuple.');
          return;
        }
        triangle.forEach((entry, entryIndex) => {
          const maximum = Math.max(0, (positions?.length ?? 1) - 1);
          integer(entry, `${path}.triangles[${index}][${entryIndex}]`, issues, 0, maximum);
        });
      });
    }
    parallelArray(
      data.normals,
      `${path}.normals`,
      positions?.length ?? 0,
      issues,
      (entry, entryPath, target) => {
        vec3(entry, entryPath, target);
      },
    );
    parallelArray(
      data.colors,
      `${path}.colors`,
      positions?.length ?? 0,
      issues,
      (entry, entryPath, target) => {
        color(entry, entryPath, target);
      },
    );
    parallelArray(
      data.labels,
      `${path}.labels`,
      positions?.length ?? 0,
      issues,
      (entry, entryPath, target) => {
        optionalString(entry, entryPath, target, 1_024);
      },
    );
    return;
  }
  const rows = integer(data.rows, `${path}.rows`, issues, 2, 2_048);
  const columns = integer(data.columns, `${path}.columns`, issues, 2, 2_048);
  const count = rows === undefined || columns === undefined ? undefined : rows * columns;
  if (count !== undefined && count > MAX_POINTS)
    issue(issues, path, `Grid may contain at most ${MAX_POINTS} points.`);
  numberArray(data.z, `${path}.z`, issues, MAX_POINTS, count);
  if (data.x !== undefined) numberArray(data.x, `${path}.x`, issues, 2_048, columns);
  if (data.y !== undefined) numberArray(data.y, `${path}.y`, issues, 2_048, rows);
  if (data.values !== undefined)
    numberArray(data.values, `${path}.values`, issues, MAX_POINTS, count);
}

function validateVolumeData(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  const data = closedObject(value, path, VOLUME_DATA_KEYS, issues);
  if (data === undefined) return;
  let dimensions: readonly number[] | undefined;
  if (vec3(data.dimensions, `${path}.dimensions`, issues)) {
    dimensions = data.dimensions;
    dimensions.forEach((entry, index) =>
      integer(entry, `${path}.dimensions[${index}]`, issues, 2, 256),
    );
  }
  const count = dimensions?.reduce((total, entry) => total * entry, 1);
  if (count !== undefined && count > MAX_VOLUME_CELLS)
    issue(issues, `${path}.dimensions`, `Volume may contain at most ${MAX_VOLUME_CELLS} cells.`);
  numberArray(data.values, `${path}.values`, issues, MAX_VOLUME_CELLS, count);
  if (data.origin !== undefined) vec3(data.origin, `${path}.origin`, issues);
  if (data.spacing !== undefined && vec3(data.spacing, `${path}.spacing`, issues)) {
    data.spacing.forEach((entry, index) =>
      finiteNumber(entry, `${path}.spacing[${index}]`, issues, 0.000001, 1_000_000_000),
    );
  }
}

function validateVectorData(
  value: unknown,
  path: string,
  mode: unknown,
  issues: SpatialSpecIssue[],
): void {
  const candidate = objectValue(value, path, issues);
  if (candidate === undefined) return;
  const streamMode = mode === 'streamtube' || (mode === undefined && 'paths' in candidate);
  const data = closedObject(
    candidate,
    path,
    streamMode ? STREAM_DATA_KEYS : CONE_DATA_KEYS,
    issues,
  );
  if (data === undefined) return;
  if (streamMode) {
    if (!Array.isArray(data.paths)) {
      issue(issues, `${path}.paths`, 'Must be an array.');
      return;
    }
    if (data.paths.length === 0 || data.paths.length > MAX_PATHS)
      issue(issues, `${path}.paths`, `Must contain 1 to ${MAX_PATHS} paths.`);
    let total = 0;
    data.paths.slice(0, MAX_PATHS + 1).forEach((entry, index) => {
      const points = vec3Array(entry, `${path}.paths[${index}]`, issues, MAX_POINTS);
      total += points?.length ?? 0;
      if (points !== undefined && points.length < 2)
        issue(issues, `${path}.paths[${index}]`, 'Must contain at least two points.');
    });
    if (total > MAX_POINTS)
      issue(
        issues,
        `${path}.paths`,
        `All paths together may contain at most ${MAX_POINTS} points.`,
      );
    parallelArray(
      data.labels,
      `${path}.labels`,
      data.paths.length,
      issues,
      (entry, entryPath, target) => optionalString(entry, entryPath, target, 1_024),
    );
    parallelArray(
      data.colors,
      `${path}.colors`,
      data.paths.length,
      issues,
      (entry, entryPath, target) => {
        color(entry, entryPath, target);
      },
    );
    return;
  }
  const origins = vec3Array(data.origins, `${path}.origins`, issues, MAX_VECTOR_COUNT);
  const vectors = vec3Array(data.vectors, `${path}.vectors`, issues, MAX_VECTOR_COUNT);
  const count = origins?.length ?? 0;
  if (count === 0) issue(issues, `${path}.origins`, 'Must not be empty.');
  if (origins !== undefined && vectors !== undefined && vectors.length !== origins.length)
    issue(issues, `${path}.vectors`, `Must contain exactly ${origins.length} vectors.`);
  parallelArray(data.labels, `${path}.labels`, count, issues, (entry, entryPath, target) =>
    optionalString(entry, entryPath, target, 1_024),
  );
  parallelArray(data.colors, `${path}.colors`, count, issues, (entry, entryPath, target) => {
    color(entry, entryPath, target);
  });
}

function validateScatterData(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  const data = closedObject(value, path, SCATTER_DATA_KEYS, issues);
  if (data === undefined) return;
  const positions = vec3Array(data.positions, `${path}.positions`, issues, MAX_POINTS);
  const count = positions?.length ?? 0;
  if (count === 0) issue(issues, `${path}.positions`, 'Must not be empty.');
  parallelArray(data.values, `${path}.values`, count, issues, (entry, entryPath, target) => {
    finiteNumber(entry, entryPath, target);
  });
  parallelArray(data.sizes, `${path}.sizes`, count, issues, (entry, entryPath, target) => {
    finiteNumber(entry, entryPath, target, 0, 1_000);
  });
  parallelArray(data.colors, `${path}.colors`, count, issues, (entry, entryPath, target) => {
    color(entry, entryPath, target);
  });
  parallelArray(data.labels, `${path}.labels`, count, issues, (entry, entryPath, target) =>
    optionalString(entry, entryPath, target, 1_024),
  );
}

function validateGlobeData(value: unknown, path: string, issues: SpatialSpecIssue[]): void {
  if (value === undefined) return;
  const data = closedObject(value, path, GLOBE_DATA_KEYS, issues);
  if (data === undefined) return;
  if (data.points !== undefined) {
    if (!Array.isArray(data.points) || data.points.length > MAX_GLOBE_ITEMS) {
      issue(issues, `${path}.points`, `Must be an array with at most ${MAX_GLOBE_ITEMS} points.`);
    } else {
      data.points.forEach((value, index) => {
        const point = closedObject(value, `${path}.points[${index}]`, GLOBE_POINT_KEYS, issues);
        if (point === undefined) return;
        finiteNumber(point.longitude, `${path}.points[${index}].longitude`, issues, -180, 180);
        finiteNumber(point.latitude, `${path}.points[${index}].latitude`, issues, -90, 90);
        if (point.value !== undefined)
          finiteNumber(point.value, `${path}.points[${index}].value`, issues);
        optionalString(point.label, `${path}.points[${index}].label`, issues, 1_024);
        optionalColor(point.color, `${path}.points[${index}].color`, issues);
        if (point.size !== undefined)
          finiteNumber(point.size, `${path}.points[${index}].size`, issues, 0, 1_000);
      });
    }
  }
  if (data.routes !== undefined) {
    if (!Array.isArray(data.routes) || data.routes.length > MAX_GLOBE_ITEMS) {
      issue(issues, `${path}.routes`, `Must be an array with at most ${MAX_GLOBE_ITEMS} routes.`);
    } else {
      data.routes.forEach((value, index) => {
        const route = closedObject(value, `${path}.routes[${index}]`, GLOBE_ROUTE_KEYS, issues);
        if (route === undefined) return;
        lonLat(route.from, `${path}.routes[${index}].from`, issues);
        lonLat(route.to, `${path}.routes[${index}].to`, issues);
        if (route.value !== undefined)
          finiteNumber(route.value, `${path}.routes[${index}].value`, issues);
        optionalString(route.label, `${path}.routes[${index}].label`, issues, 1_024);
        optionalColor(route.color, `${path}.routes[${index}].color`, issues);
      });
    }
  }
}

function validateMarkAndData(
  value: unknown,
  data: unknown,
  path: string,
  issues: SpatialSpecIssue[],
): void {
  const mark = objectValue(value, `${path}.mark`, issues);
  if (mark === undefined) return;
  const type = mark.type;
  if (
    typeof type !== 'string' ||
    !new Set(['surface', 'volume', 'vector', 'scatter', 'globe']).has(type)
  ) {
    issue(issues, `${path}.mark.type`, 'Must be one of: surface, volume, vector, scatter, globe.');
    return;
  }
  const markKeys = {
    surface: SURFACE_MARK_KEYS,
    volume: VOLUME_MARK_KEYS,
    vector: VECTOR_MARK_KEYS,
    scatter: SCATTER_MARK_KEYS,
    globe: GLOBE_MARK_KEYS,
  }[type]!;
  for (const key of Object.keys(mark))
    if (!markKeys.has(key)) issue(issues, `${path}.mark.${key}`, `Unknown property "${key}".`);
  if (type === 'surface') {
    optionalEnum(mark.mode, `${path}.mark.mode`, new Set(['surface', 'mesh']), issues);
    optionalColor(mark.color, `${path}.mark.color`, issues);
    if (mark.opacity !== undefined)
      finiteNumber(mark.opacity, `${path}.mark.opacity`, issues, 0, 1);
    optionalBoolean(mark.wireframe, `${path}.mark.wireframe`, issues);
    validateSurfaceData(data, `${path}.data`, mark.mode, issues);
  } else if (type === 'volume') {
    optionalEnum(mark.mode, `${path}.mark.mode`, new Set(['volume', 'isosurface']), issues);
    if (mark.isoValue !== undefined) finiteNumber(mark.isoValue, `${path}.mark.isoValue`, issues);
    if (mark.opacity !== undefined)
      finiteNumber(mark.opacity, `${path}.mark.opacity`, issues, 0, 1);
    if (mark.pointSize !== undefined)
      finiteNumber(mark.pointSize, `${path}.mark.pointSize`, issues, 0.1, 256);
    if (mark.maxSamples !== undefined)
      integer(mark.maxSamples, `${path}.mark.maxSamples`, issues, 1, 250_000);
    optionalColor(mark.colorLow, `${path}.mark.colorLow`, issues);
    optionalColor(mark.colorHigh, `${path}.mark.colorHigh`, issues);
    validateVolumeData(data, `${path}.data`, issues);
  } else if (type === 'vector') {
    optionalEnum(mark.mode, `${path}.mark.mode`, new Set(['cone', 'streamtube']), issues);
    optionalColor(mark.color, `${path}.mark.color`, issues);
    if (mark.opacity !== undefined)
      finiteNumber(mark.opacity, `${path}.mark.opacity`, issues, 0, 1);
    if (mark.radius !== undefined)
      finiteNumber(mark.radius, `${path}.mark.radius`, issues, 0.000001, 1_000_000);
    if (mark.scale !== undefined)
      finiteNumber(mark.scale, `${path}.mark.scale`, issues, 0.000001, 1_000_000);
    if (mark.segments !== undefined) integer(mark.segments, `${path}.mark.segments`, issues, 5, 48);
    validateVectorData(data, `${path}.data`, mark.mode, issues);
  } else if (type === 'scatter') {
    optionalColor(mark.color, `${path}.mark.color`, issues);
    if (mark.opacity !== undefined)
      finiteNumber(mark.opacity, `${path}.mark.opacity`, issues, 0, 1);
    if (mark.pointSize !== undefined)
      finiteNumber(mark.pointSize, `${path}.mark.pointSize`, issues, 0.1, 256);
    validateScatterData(data, `${path}.data`, issues);
  } else {
    if (data !== undefined) validateGlobeData(data, `${path}.data`, issues);
    for (const key of [
      'landColor',
      'oceanColor',
      'borderColor',
      'pointColor',
      'routeColor',
    ] as const) {
      optionalColor(mark[key], `${path}.mark.${key}`, issues);
    }
    if (mark.radius !== undefined)
      finiteNumber(mark.radius, `${path}.mark.radius`, issues, 0.000001, 1_000_000);
    if (mark.opacity !== undefined)
      finiteNumber(mark.opacity, `${path}.mark.opacity`, issues, 0, 1);
    if (mark.routeSegments !== undefined)
      integer(mark.routeSegments, `${path}.mark.routeSegments`, issues, 8, 128);
  }
}

function scanPortable(
  value: unknown,
  path: string,
  issues: SpatialSpecIssue[],
  ancestors: WeakSet<object>,
  state: { nodes: number },
  depth: number,
): void {
  state.nodes += 1;
  if (state.nodes > MAX_PORTABLE_NODES) {
    if (state.nodes === MAX_PORTABLE_NODES + 1)
      issue(issues, path, `Specification exceeds ${MAX_PORTABLE_NODES} JSON values.`);
    return;
  }
  if (depth > MAX_PORTABLE_DEPTH) {
    issue(issues, path, `Specification nesting exceeds ${MAX_PORTABLE_DEPTH} levels.`);
    return;
  }
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    issue(issues, path, 'Must contain only JSON-serializable values.');
    return;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    issue(issues, path, 'Numbers must be finite.');
    return;
  }
  if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
    issue(issues, path, `Strings may contain at most ${MAX_STRING_LENGTH} characters.`);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (ancestors.has(value)) {
    issue(issues, path, 'Circular references are forbidden.');
    return;
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length && state.nodes <= MAX_PORTABLE_NODES; index += 1) {
      scanPortable(value[index], `${path}[${index}]`, issues, ancestors, state, depth + 1);
    }
  } else if (!isRecord(value)) {
    issue(issues, path, 'Only plain JSON objects are allowed.');
  } else {
    for (const [key, entry] of Object.entries(value)) {
      if (UNSAFE_KEYS.has(key))
        issue(issues, `${path}.${key}`, `Unsafe key "${key}" is forbidden.`);
      else scanPortable(entry, `${path}.${key}`, issues, ancestors, state, depth + 1);
    }
  }
  ancestors.delete(value);
}

export function validateSpatialSpec(input: unknown): readonly SpatialSpecIssue[] {
  const issues: SpatialSpecIssue[] = [];
  scanPortable(input, '$', issues, new WeakSet(), { nodes: 0 }, 0);
  const spec = closedObject(input, '$', ROOT_KEYS, issues);
  if (spec === undefined) return issues;
  if (spec.specVersion !== undefined && spec.specVersion !== '0.1')
    issue(issues, '$.specVersion', 'Only SpatialSpec version "0.1" is supported.');
  optionalString(spec.title, '$.title', issues, 512);
  optionalString(spec.ariaLabel, '$.ariaLabel', issues, 1_024);
  optionalColor(spec.background, '$.background', issues);
  validateCamera(spec.camera, '$.camera', issues);
  validateLighting(spec.lighting, '$.lighting', issues);
  validateInteraction(spec.interaction, '$.interaction', issues);
  validateAccessibility(spec.accessibility, '$.accessibility', issues);
  validateLegend(spec.legend, '$.legend', issues);
  validateHighlights(spec.highlights, '$.highlights', issues);
  validateAnnotations(spec.annotations, '$.annotations', issues);
  if (!Array.isArray(spec.layers) || spec.layers.length === 0 || spec.layers.length > MAX_LAYERS) {
    issue(issues, '$.layers', `Must be an array with 1 to ${MAX_LAYERS} layers.`);
  } else {
    spec.layers.forEach((value, index) => {
      const layerPath = `$.layers[${index}]`;
      const layer = closedObject(value, layerPath, LAYER_KEYS, issues);
      if (layer === undefined) return;
      optionalIdentifier(layer.id, `${layerPath}.id`, issues);
      optionalString(layer.name, `${layerPath}.name`, issues, 256);
      validateMarkAndData(layer.mark, layer.data, layerPath, issues);
    });
  }
  validateLayerReferences(spec, issues);
  if (issues.length === 0) {
    for (const violation of spatialOutputBudgetViolations(
      estimateSpatialOutput(spec as unknown as SpatialChartSpec),
    )) {
      issue(
        issues,
        '$.layers',
        `Derived output ${violation.resource} (${violation.actual}) exceeds the safe limit (${violation.maximum}).`,
      );
    }
  }
  return issues;
}

export function assertValidSpatialSpec(input: unknown): asserts input is SpatialChartSpec {
  const issues = validateSpatialSpec(input);
  if (issues.length === 0) return;
  const first = issues[0];
  const error = new TypeError(
    `Invalid SpatialSpec at ${first?.path ?? '$'}: ${first?.message ?? 'Unknown validation error.'}`,
  );
  Object.assign(error, { code: 'INVALID_SPATIAL_SPEC', issues });
  throw error;
}
