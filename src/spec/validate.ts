import { GraflumeError } from '../core/errors.js';
import { temporalTimestamp } from '../format/temporal.js';
import { curveNames } from '../curve/registry.js';
import { seriesStackModes } from '../data/series-stack.js';
import {
  resolveTechnicalIndicatorCapability,
  technicalIndicatorCapabilities,
} from '../data/technical-indicators.js';
import { materializeSpecDataflow } from '../data/dataflow.js';
import { isPlainObject } from '../utils/object.js';
import {
  maximumCompositionDepth,
  maximumCompositionViews,
  maximumLayerCompositionChildren,
  presentCompositionOperators,
  resolveComposition,
  type CompositionKind,
} from './composition.js';
import type {
  ChannelEncodingInput,
  ChartSpec,
  EncodingChannel,
  EncodingInput,
  LayerSpec,
  MarkInput,
} from './types.js';
import { axisChannel, axisPositionChannel, builtInAxisChannel, isSafeAxisId } from './axes.js';
import { validateTransformExpression, validateTransforms } from './transform-validation.js';

export interface SpecIssue {
  readonly path: string;
  readonly message: string;
}

const UNSAFE_FIELDS = new Set(['__proto__', 'prototype', 'constructor']);
const TOOLTIP_FORMATS = new Set([
  'auto',
  'number',
  'integer',
  'percent',
  'date',
  'time',
  'datetime',
]);
const TOOLTIP_KEYS = new Set([
  'trigger',
  'axis',
  'title',
  'titleField',
  'shared',
  'pointer',
  'fields',
]);
const TOOLTIP_FIELD_KEYS = new Set([
  'field',
  'label',
  'format',
  'fractionDigits',
  'dateStyle',
  'timeStyle',
  'timeZone',
  'prefix',
  'suffix',
]);
const INTERACTION_KEYS = new Set([
  'hover',
  'click',
  'tooltip',
  'navigation',
  'domainNavigation',
  'playback',
  'controls',
  'selection',
]);
const NAVIGATION_KEYS = new Set(['minZoom', 'maxZoom', 'wheel', 'drag', 'pinch', 'keyboard']);
const NAVIGATION_WHEEL_MODES = new Set(['off', 'modifier', 'always']);
const DOMAIN_NAVIGATION_KEYS = new Set(['axes', 'maxZoom', 'wheel', 'drag', 'keyboard']);
const PLAYBACK_KEYS = new Set([
  'field',
  'key',
  'layerId',
  'mode',
  'interval',
  'rate',
  'loop',
  'direction',
  'range',
  'namedFrames',
  'windowSize',
  'autoplay',
  'transition',
  'filter',
]);
const PLAYBACK_MODES = new Set(['frame', 'cumulative', 'window']);
const PLAYBACK_DIRECTIONS = new Set(['forward', 'reverse']);
const PLAYBACK_RANGE_KEYS = new Set(['start', 'end']);
const PLAYBACK_NAMED_FRAME_KEYS = new Set(['name', 'value']);
const PLAYBACK_TRANSITION_KEYS = new Set(['duration', 'easing']);
const PLAYBACK_TRANSITION_EASINGS = new Set(['linear', 'ease-in-out']);
const CONTROLS_KEYS = new Set([
  'zoom',
  'reset',
  'fullscreen',
  'export',
  'annotations',
  'playback',
  'labels',
]);
const CONTROL_LABEL_KEYS = new Set([
  'controls',
  'zoomIn',
  'zoomOut',
  'reset',
  'enterFullscreen',
  'exitFullscreen',
  'exportPng',
  'showAnnotations',
  'hideAnnotations',
  'previousFrame',
  'play',
  'pause',
  'nextFrame',
  'seek',
  'speed',
  'loop',
]);
const SELECTION_KEYS = new Set([
  'kind',
  'combine',
  'mode',
  'toggle',
  'key',
  'clearOnBackground',
  'clearOnEscape',
  'ariaLabel',
  'highlight',
  'axis',
  'xAxis',
  'yAxis',
  'maxSelections',
  'maxLassoPoints',
  'minPixelSpan',
  'keyboard',
  'keyboardStep',
  'filter',
  'linked',
]);
const SELECTION_MODES = new Set(['single', 'multiple']);
const SELECTION_KINDS = new Set(['point', 'interval', 'rectangle', 'axis', 'lasso']);
const SELECTION_COMBINE = new Set(['union', 'intersection']);
const ACCESSIBILITY_KEYS = new Set([
  'label',
  'description',
  'table',
  'maxRows',
  'navigation',
  'explorer',
  'linkedFocus',
  'summary',
  'live',
]);
const ACCESSIBILITY_LIVE_KEYS = new Set(['enabled', 'throttleMs']);
const ACCESSIBILITY_EXPLORER_KEYS = new Set(['windowRows', 'overscanRows', 'rowHeight']);
const ACCESSIBILITY_LINKED_FOCUS_KEYS = new Set(['group', 'key']);
const ACCESSIBILITY_TABLE_MODES = new Set(['hidden', 'visible']);
const LEGEND_KEYS = new Set([
  'align',
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
const LEGEND_ITEM_SYMBOLS = new Set(['auto', 'line', 'point', 'rect']);
const LEGEND_LABEL_KEYS = new Set(['show', 'hide']);
const LEGEND_MODES = new Set(['auto', 'layers', 'categories', 'continuous']);
const LEGEND_POSITIONS = new Set([
  'top',
  'right',
  'bottom',
  'left',
  'inside-top-left',
  'inside-top-right',
  'inside-bottom-left',
  'inside-bottom-right',
]);
const LEGEND_ORIENTATIONS = new Set(['auto', 'horizontal', 'vertical']);
const DECORATION_TARGET_KEYS = new Set([
  'type',
  'layerId',
  'rowIndex',
  'field',
  'value',
  'values',
  'x',
  'y',
  'width',
  'height',
]);
const AXIS_RANGE_KEYS = new Set(['axis', 'from', 'to']);
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
  'primitive',
  'target',
  'text',
  'detail',
  'placement',
  'offsetX',
  'offsetY',
  'connector',
  'style',
]);
const ANNOTATION_PRIMITIVES = new Set(['callout', 'label', 'point', 'rule', 'band']);
const ANNOTATION_PLACEMENTS = new Set(['auto', 'top', 'right', 'bottom', 'left']);
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
const ANNOTATION_TEXT_ALIGNS = new Set(['start', 'center', 'end']);
const MARK_LABEL_KEYS = new Set([
  'visible',
  'field',
  'key',
  'layerIds',
  'placement',
  'offset',
  'collision',
  'connector',
  'maxLabels',
  'positions',
  'style',
  'authoring',
]);
const MARK_LABEL_PLACEMENTS = new Set(['auto', 'top', 'right', 'bottom', 'left', 'center']);
const MARK_LABEL_COLLISIONS = new Set(['avoid', 'hide', 'none']);
const MARK_LABEL_POSITION_KEYS = new Set(['target', 'offsetX', 'offsetY', 'hidden']);
const MARK_LABEL_STYLE_KEYS = new Set([
  'color',
  'background',
  'border',
  'opacity',
  'fontSize',
  'fontWeight',
  'maxWidth',
  'padding',
  'radius',
]);
const MARK_LABEL_AUTHORING_KEYS = new Set(['pointer', 'keyboard', 'step', 'historyLimit', 'snap']);
const MARK_LABEL_SNAP_KEYS = new Set(['grid', 'marks', 'plot', 'distance']);
const ENCODING_KEYS = new Set([
  'field',
  'value',
  'type',
  'title',
  'scale',
  'axis',
  'axisId',
  'condition',
]);
const ENCODING_CONDITION_KEYS = new Set(['test', 'field', 'value']);
const ENCODING_CHANNELS = new Set<EncodingChannel>([
  'x',
  'x2',
  'y',
  'y2',
  'color',
  'fill',
  'stroke',
  'size',
  'radius',
  'shape',
  'symbol',
  'icon',
  'opacity',
  'strokeWidth',
  'strokeDash',
  'text',
  'angle',
  'theta',
  'longitude',
  'latitude',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'order',
  'detail',
  'tooltip',
]);
const FIELD_TYPES = new Set(['quantitative', 'temporal', 'ordinal', 'nominal']);
const SCALE_KEYS = new Set([
  'type',
  'domain',
  'range',
  'zero',
  'nice',
  'clamp',
  'reverse',
  'outOfBounds',
  'base',
  'exponent',
  'constant',
  'paddingInner',
  'paddingOuter',
]);
const SCALE_TYPES = new Set([
  'linear',
  'log',
  'symlog',
  'asinh',
  'pow',
  'sqrt',
  'time',
  'utc',
  'band',
  'point',
  'ordinal',
  'quantile',
  'quantize',
  'threshold',
  'sequential',
  'diverging',
  'cyclic',
  'probability',
  'logit',
  'probit',
]);
const SCALE_OUT_OF_BOUNDS = new Set(['extrapolate', 'clamp', 'error', 'unknown']);
const POINT_SHAPES = new Set(['circle', 'square', 'diamond', 'triangle', 'cross']);
const RAW_ONLY_ENCODING_CHANNELS = new Set([
  'shape',
  'symbol',
  'icon',
  'strokeDash',
  'text',
  'angle',
  'theta',
  'longitude',
  'latitude',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'order',
  'detail',
  'tooltip',
]);
const FIELD_ONLY_SEMANTIC_CHANNELS = new Set<EncodingChannel>([
  'angle',
  'theta',
  'longitude',
  'latitude',
  'open',
  'high',
  'low',
  'close',
  'volume',
]);
const GEOGRAPHIC_POSITION_MARKS = new Set([
  'map',
  'geo-flow',
  'geo-line',
  'geo-heatmap',
  'tiled-map',
  'tilemap',
]);
const TRADING_CHANNEL_MARKS = new Set(['candlestick', 'financial']);
const AXIS_KEYS = new Set([
  'channel',
  'title',
  'visible',
  'position',
  'offset',
  'line',
  'grid',
  'ticks',
  'labels',
  'tickCount',
  'format',
  'labelAngle',
]);
const AXIS_STROKE_KEYS = new Set(['visible', 'color', 'width', 'opacity', 'dash']);
const AXIS_TICK_KEYS = new Set([...AXIS_STROKE_KEYS, 'count', 'spacing', 'size', 'values']);
const AXIS_LABEL_KEYS = new Set([
  'visible',
  'orientation',
  'angle',
  'align',
  'padding',
  'maxLength',
  'color',
  'font',
]);
const AXIS_TITLE_KEYS = new Set(['text', 'visible', 'align', 'angle', 'padding', 'color', 'font']);
const AXIS_FONT_KEYS = new Set(['family', 'size', 'weight', 'style']);
const AXIS_FORMAT_KEYS = new Set([
  'type',
  'fractionDigits',
  'notation',
  'useGrouping',
  'currency',
  'currencyDisplay',
  'dateStyle',
  'timeStyle',
  'timeZone',
  'prefix',
  'suffix',
]);
const AXIS_FORMAT_TYPES = new Set([
  'auto',
  'number',
  'integer',
  'percent',
  'compact',
  'scientific',
  'currency',
  'date',
  'time',
  'datetime',
]);
const AXIS_POSITIONS = new Set(['top', 'bottom', 'left', 'right']);
const AXIS_LABEL_ORIENTATIONS = new Set(['auto', 'horizontal', 'vertical-up', 'vertical-down']);
const AXIS_TEXT_ALIGNS = new Set(['auto', 'start', 'center', 'end']);
const AXIS_TITLE_ALIGNS = new Set(['start', 'center', 'end']);
const AXIS_FONT_WEIGHTS = new Set(['normal', 'medium', 'semibold', 'bold']);
const AXIS_FONT_STYLES = new Set(['normal', 'italic']);
const AXIS_NOTATIONS = new Set(['standard', 'compact', 'scientific', 'engineering']);
const AXIS_CURRENCY_DISPLAYS = new Set(['symbol', 'narrowSymbol', 'code', 'name']);
const AXIS_DATE_STYLES = new Set(['short', 'medium', 'long', 'full']);
const AXIS_TIME_STYLES = new Set(['short', 'medium', 'long', 'full']);
const THEME_CONTINUOUS_INTERPOLATIONS = new Set(['step', 'rgb', 'lab']);
const THEME_SERIES_COLOR_MODES = new Set(['theme', 'series']);
const THEME_PIE_DIRECTIONS = new Set(['clockwise', 'counterclockwise']);
const LAYER_KEYS = new Set([
  'id',
  'name',
  'data',
  'source',
  'transform',
  'mark',
  'x',
  'y',
  'encoding',
  'clip',
  'visible',
  'zIndex',
]);
const COMPOSITION_RESOLVE_KEYS = new Set(['scale', 'axis', 'legend', 'colorbar']);
const FACET_KEYS = new Set(['row', 'column', 'wrap', 'columns']);
const FACET_FIELD_KEYS = new Set(['field', 'title', 'sort']);
const FACET_SORTS = new Set(['input', 'ascending', 'descending']);
const REPEAT_KEYS = new Set(['items', 'columns']);
const REPEAT_ITEM_KEYS = new Set(['id', 'label', 'x', 'y']);
const INSET_KEYS = new Set(['base', 'view', 'x', 'y', 'width', 'height', 'label']);
const LAYER_COMPOSITION_CHILD_KEYS = new Set([
  '$schema',
  'specVersion',
  'data',
  'source',
  'dataflow',
  'transform',
  'mark',
  'x',
  'y',
  'encoding',
  'layers',
  'markLabels',
]);
const COMPOSITION_KEYS = new Set([
  '$schema',
  'specVersion',
  'data',
  'source',
  'dataflow',
  'transform',
  'mark',
  'x',
  'y',
  'encoding',
  'layers',
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
  'width',
  'height',
  'padding',
  'title',
  'description',
  'renderer',
  'performance',
  'theme',
  'locale',
  'axes',
  'legend',
  'highlights',
  'annotations',
  'interaction',
  'accessibility',
  'streaming',
]);
const CURVE_NAMES = new Set<string>(curveNames);
const MISSING_VALUE_POLICIES = new Set(['gap', 'zero', 'connect']);
const CURVE_MARKS = new Set(['line', 'area', 'smooth', 'stepped-area', 'theme-river']);
const SERIES_STACK_MARKS = new Set(['area', 'bar', 'theme-river']);
const SERIES_STACK_OFFSETS = new Set([
  'zero',
  'normalize',
  'expand',
  'center',
  'silhouette',
  'wiggle',
]);
const SERIES_STACK_ORDERS = new Set([
  'input',
  'ascending',
  'descending',
  'sumAscending',
  'sumDescending',
  'insideOut',
]);
const STREAMING_KEYS = new Set([
  'key',
  'mode',
  'maxBatchRows',
  'retention',
  'eventTime',
  'queue',
  'replay',
  'runtime',
  'worker',
]);
const STREAMING_RETENTION_KEYS = new Set(['maxRows', 'time']);
const STREAMING_TIME_KEYS = new Set(['field', 'durationMs']);
const STREAMING_EVENT_TIME_KEYS = new Set(['field', 'allowedLatenessMs', 'lateData']);
const STREAMING_QUEUE_KEYS = new Set(['maxBatches', 'maxRows', 'overflow']);
const STREAMING_REPLAY_KEYS = new Set(['maxBatches', 'maxRows']);
const STREAMING_RUNTIME_KEYS = new Set([
  'schedule',
  'maxBatchesPerFrame',
  'overflow',
  'paused',
  'followLive',
  'history',
]);
const STREAMING_HISTORY_KEYS = new Set(['maxBatches', 'pageRows']);
const STREAMING_WORKER_KEYS = new Set([
  'moduleURL',
  'name',
  'maxQueueBatches',
  'maxQueueRows',
  'maxInputRows',
  'maxBinaryBytes',
  'maxTransforms',
  'overflow',
  'engine',
]);
const STREAMING_WORKER_ENGINE_KEYS = new Set(['type', 'adapter']);
const STREAMING_OVERFLOW_POLICIES = new Set(['reject', 'drop-oldest', 'coalesce']);

function validateUnknownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  kind: string,
  issues: SpecIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push({ path: `${path}.${key}`, message: `Unknown ${kind} property "${key}".` });
    }
  }
}

function validateFiniteNumber(
  value: unknown,
  path: string,
  label: string,
  issues: SpecIssue[],
  options: { readonly min?: number; readonly max?: number; readonly integer?: boolean } = {},
): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (options.integer === true && !Number.isInteger(value)) ||
    (options.min !== undefined && value < options.min) ||
    (options.max !== undefined && value > options.max)
  ) {
    const integer = options.integer === true ? ' integer' : '';
    const range =
      options.min === undefined && options.max === undefined
        ? ''
        : ` from ${options.min ?? '-infinity'} to ${options.max ?? 'infinity'}`;
    issues.push({ path, message: `${label} must be a finite${integer} number${range}.` });
  }
}

function validateOptionalBoolean(
  value: unknown,
  path: string,
  label: string,
  issues: SpecIssue[],
): void {
  if (value !== undefined && typeof value !== 'boolean') {
    issues.push({ path, message: `${label} must be a boolean.` });
  }
}

function validateOptionalString(
  value: unknown,
  path: string,
  label: string,
  issues: SpecIssue[],
  allowEmpty = true,
): void {
  if (value !== undefined && (typeof value !== 'string' || (!allowEmpty && value.trim() === ''))) {
    issues.push({ path, message: `${label} must be a${allowEmpty ? '' : ' non-empty'} string.` });
  }
}

function validateTheme(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (typeof value === 'string') {
    if (value.trim() === '') issues.push({ path, message: 'Theme name must be non-empty.' });
    return;
  }
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Theme must be a name or an object.' });
    return;
  }
  validateOptionalString(value.extends, `${path}.extends`, 'Theme base name', issues, false);

  if (value.colors !== undefined) {
    if (!isPlainObject(value.colors)) {
      issues.push({ path: `${path}.colors`, message: 'Theme colors must be an object.' });
    } else if (
      value.colors.continuousInterpolation !== undefined &&
      (typeof value.colors.continuousInterpolation !== 'string' ||
        !THEME_CONTINUOUS_INTERPOLATIONS.has(value.colors.continuousInterpolation))
    ) {
      issues.push({
        path: `${path}.colors.continuousInterpolation`,
        message: 'Theme continuous interpolation is not supported.',
      });
    }
  }

  if (value.spacing !== undefined) {
    if (!isPlainObject(value.spacing)) {
      issues.push({ path: `${path}.spacing`, message: 'Theme spacing must be an object.' });
    } else if (value.spacing.minimumTitleBlock !== undefined) {
      validateFiniteNumber(
        value.spacing.minimumTitleBlock,
        `${path}.spacing.minimumTitleBlock`,
        'Theme minimum title block',
        issues,
        { min: 0, max: 2_000 },
      );
    }
  }

  if (value.mark !== undefined) {
    if (!isPlainObject(value.mark)) {
      issues.push({ path: `${path}.mark`, message: 'Theme mark must be an object.' });
    } else {
      for (const key of ['pointColorMode', 'areaColorMode'] as const) {
        if (
          value.mark[key] !== undefined &&
          (typeof value.mark[key] !== 'string' || !THEME_SERIES_COLOR_MODES.has(value.mark[key]))
        ) {
          issues.push({
            path: `${path}.mark.${key}`,
            message: 'Theme series color mode is not supported.',
          });
        }
      }
      if (
        value.mark.pieDirection !== undefined &&
        (typeof value.mark.pieDirection !== 'string' ||
          !THEME_PIE_DIRECTIONS.has(value.mark.pieDirection))
      ) {
        issues.push({
          path: `${path}.mark.pieDirection`,
          message: 'Theme pie direction is not supported.',
        });
      }
      if (value.mark.pieStartAngle !== undefined) {
        validateFiniteNumber(
          value.mark.pieStartAngle,
          `${path}.mark.pieStartAngle`,
          'Theme pie start angle',
          issues,
          { min: -1_000_000, max: 1_000_000 },
        );
      }
      if (value.mark.histogramGap !== undefined) {
        validateFiniteNumber(
          value.mark.histogramGap,
          `${path}.mark.histogramGap`,
          'Theme histogram gap',
          issues,
          { min: 0, max: 2_000 },
        );
      }
      validateOptionalString(
        value.mark.boxplotMedianStroke,
        `${path}.mark.boxplotMedianStroke`,
        'Theme boxplot median stroke',
        issues,
        false,
      );
    }
  }

  if (value.legend !== undefined) {
    if (!isPlainObject(value.legend)) {
      issues.push({ path: `${path}.legend`, message: 'Theme legend must be an object.' });
    } else {
      validateOptionalString(
        value.legend.borderColor,
        `${path}.legend.borderColor`,
        'Theme legend border color',
        issues,
        false,
      );
      if (value.legend.continuousSamples !== undefined) {
        validateFiniteNumber(
          value.legend.continuousSamples,
          `${path}.legend.continuousSamples`,
          'Theme continuous legend samples',
          issues,
          { min: 1, max: 256, integer: true },
        );
      }
    }
  }
}

function validateScale(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Scale must be an object.' });
    return;
  }
  validateUnknownKeys(value, SCALE_KEYS, path, 'scale', issues);
  const type = typeof value.type === 'string' ? value.type : undefined;
  if (
    value.type !== undefined &&
    (typeof value.type !== 'string' || !SCALE_TYPES.has(value.type))
  ) {
    issues.push({ path: `${path}.type`, message: 'Scale type is not supported.' });
  }
  if (value.domain !== undefined) {
    if (!Array.isArray(value.domain) || value.domain.length < 1) {
      issues.push({
        path: `${path}.domain`,
        message: 'Scale domain must contain at least 1 value.',
      });
    } else {
      value.domain.forEach((entry, index) => {
        if (
          (typeof entry !== 'number' && typeof entry !== 'string') ||
          (typeof entry === 'number' && !Number.isFinite(entry))
        ) {
          issues.push({
            path: `${path}.domain[${index}]`,
            message: 'Scale domain values must be finite numbers or strings.',
          });
        }
      });
    }
  }
  if (value.range !== undefined) {
    if (!Array.isArray(value.range) || value.range.length === 0) {
      issues.push({
        path: `${path}.range`,
        message: 'Scale range must contain at least one value.',
      });
    } else {
      value.range.forEach((entry, index) => {
        if (
          (typeof entry !== 'number' && typeof entry !== 'string') ||
          (typeof entry === 'number' && !Number.isFinite(entry))
        ) {
          issues.push({
            path: `${path}.range[${index}]`,
            message: 'Scale range values must be finite numbers or strings.',
          });
        }
      });
    }
  }
  for (const key of ['zero', 'nice', 'clamp', 'reverse'] as const) {
    validateOptionalBoolean(value[key], `${path}.${key}`, `Scale ${key}`, issues);
  }
  if (
    value.outOfBounds !== undefined &&
    (typeof value.outOfBounds !== 'string' || !SCALE_OUT_OF_BOUNDS.has(value.outOfBounds))
  ) {
    issues.push({
      path: `${path}.outOfBounds`,
      message: 'Scale outOfBounds policy is not supported.',
    });
  }
  if (value.clamp !== undefined && value.outOfBounds !== undefined) {
    issues.push({
      path: `${path}.clamp`,
      message: 'Scale clamp is a compatibility alias; do not combine it with outOfBounds.',
    });
  }
  for (const key of ['base', 'exponent', 'constant'] as const) {
    if (value[key] !== undefined) {
      validateFiniteNumber(value[key], `${path}.${key}`, `Scale ${key}`, issues, {
        min: Number.MIN_VALUE,
      });
    }
  }
  if (value.base === 1) {
    issues.push({ path: `${path}.base`, message: 'Log scale base must not equal 1.' });
  }
  if (value.paddingInner !== undefined) {
    validateFiniteNumber(value.paddingInner, `${path}.paddingInner`, 'Scale paddingInner', issues, {
      min: 0,
      max: 1,
    });
  }
  if (value.paddingOuter !== undefined) {
    validateFiniteNumber(value.paddingOuter, `${path}.paddingOuter`, 'Scale paddingOuter', issues, {
      min: 0,
    });
  }

  if (Array.isArray(value.range) && type !== undefined) {
    const numericRangeTypes = new Set([
      'linear',
      'log',
      'symlog',
      'asinh',
      'pow',
      'sqrt',
      'time',
      'utc',
      'band',
      'point',
      'quantile',
      'quantize',
      'threshold',
      'probability',
      'logit',
      'probit',
    ]);
    if (numericRangeTypes.has(type) && value.range.some((entry) => typeof entry !== 'number')) {
      issues.push({
        path: `${path}.range`,
        message: `${type} position scale range must contain finite numbers.`,
      });
    }
    if (
      [
        'linear',
        'log',
        'symlog',
        'asinh',
        'pow',
        'sqrt',
        'time',
        'utc',
        'band',
        'point',
        'probability',
        'logit',
        'probit',
      ].includes(type) &&
      value.range.length !== 2
    ) {
      issues.push({
        path: `${path}.range`,
        message: `${type} position scale range must contain exactly 2 values.`,
      });
    }
    if (
      (type === 'sequential' || type === 'diverging' || type === 'cyclic') &&
      value.range.some((entry) => typeof entry !== 'string')
    ) {
      issues.push({
        path: `${path}.range`,
        message: `${type} color scale range must contain strings.`,
      });
    }
    const minimumColorStops =
      type === 'diverging' ? 3 : type === 'sequential' || type === 'cyclic' ? 2 : 0;
    if (minimumColorStops > 0 && value.range.length < minimumColorStops) {
      issues.push({
        path: `${path}.range`,
        message: `${type} color scale requires at least ${minimumColorStops} colors.`,
      });
    }
  }
  if (value.base !== undefined && type !== 'log') {
    issues.push({ path: `${path}.base`, message: 'Scale base is only valid for log scales.' });
  }
  if (value.exponent !== undefined && type !== 'pow') {
    issues.push({
      path: `${path}.exponent`,
      message: 'Scale exponent is only valid for pow scales.',
    });
  }
  if (value.constant !== undefined && type !== 'symlog' && type !== 'asinh') {
    issues.push({
      path: `${path}.constant`,
      message: 'Scale constant is only valid for symlog or asinh scales.',
    });
  }
  if (
    (value.paddingInner !== undefined || value.paddingOuter !== undefined) &&
    type !== 'band' &&
    type !== 'point'
  ) {
    issues.push({ path, message: 'Scale padding is only valid for band or point scales.' });
  }
  if (value.nice !== undefined && type !== undefined && !['linear', 'time', 'utc'].includes(type)) {
    issues.push({
      path: `${path}.nice`,
      message: 'Scale nice is currently implemented only for linear, time, and utc scales.',
    });
  }
  if (value.zero === true && (type === 'log' || type === 'logit' || type === 'probit')) {
    issues.push({ path: `${path}.zero`, message: `${type} scale cannot include zero.` });
  }
  if (
    (type === 'band' || type === 'point' || type === 'ordinal') &&
    (value.outOfBounds === 'clamp' || value.outOfBounds === 'extrapolate' || value.clamp === true)
  ) {
    issues.push({
      path: `${path}.outOfBounds`,
      message: `${type} scale supports only error or unknown for unseen categories.`,
    });
  }
  if (type === 'quantize' && value.outOfBounds === 'extrapolate') {
    issues.push({
      path: `${path}.outOfBounds`,
      message: 'Quantize scales cannot extrapolate discrete range values.',
    });
  }
  if (
    (type === 'quantile' || type === 'threshold') &&
    (value.outOfBounds !== undefined || value.clamp !== undefined)
  ) {
    issues.push({
      path: `${path}.outOfBounds`,
      message: `${type} scale bin semantics do not accept outOfBounds.`,
    });
  }
  if (type === 'cyclic' && (value.outOfBounds !== undefined || value.clamp !== undefined)) {
    issues.push({
      path: `${path}.outOfBounds`,
      message: 'Cyclic scales always wrap and do not accept outOfBounds.',
    });
  }
  if (Array.isArray(value.domain)) {
    const numbers = value.domain.filter((entry): entry is number => typeof entry === 'number');
    if ((type === 'band' || type === 'point') && numbers.length > 0) {
      issues.push({
        path: `${path}.domain`,
        message: `${type} scale domain must contain strings.`,
      });
    }
    if (
      type !== undefined &&
      [
        'linear',
        'log',
        'symlog',
        'asinh',
        'pow',
        'sqrt',
        'quantile',
        'quantize',
        'threshold',
        'sequential',
        'diverging',
        'cyclic',
        'probability',
        'logit',
        'probit',
      ].includes(type) &&
      numbers.length !== value.domain.length
    ) {
      issues.push({ path: `${path}.domain`, message: `${type} scale domain must be numeric.` });
    }
    if (type === 'quantile' && value.domain.length < 2) {
      issues.push({
        path: `${path}.domain`,
        message: 'Quantile scale domain must contain at least 2 numeric samples.',
      });
    }
    if (
      (type === 'time' || type === 'utc') &&
      value.domain.some(
        (entry) =>
          typeof entry !== 'number' &&
          (typeof entry !== 'string' || temporalTimestamp(entry, true) === null),
      )
    ) {
      issues.push({
        path: `${path}.domain`,
        message: `${type} scale domain values must be finite epochs or parseable date strings.`,
      });
    }
    if (type === 'log' && numbers.some((entry) => entry <= 0)) {
      issues.push({
        path: `${path}.domain`,
        message: 'Log scale domain values must be greater than 0.',
      });
    }
    if (type === 'probability' && numbers.some((entry) => entry < 0 || entry > 1)) {
      issues.push({
        path: `${path}.domain`,
        message: 'Probability scale domain values must be between 0 and 1.',
      });
    }
    if (
      (type === 'logit' || type === 'probit') &&
      numbers.some((entry) => entry <= 0 || entry >= 1)
    ) {
      issues.push({
        path: `${path}.domain`,
        message: `${type} scale domain values must be strictly between 0 and 1.`,
      });
    }
    const requiredLength =
      type === 'diverging'
        ? 3
        : [
              'linear',
              'log',
              'symlog',
              'asinh',
              'pow',
              'sqrt',
              'time',
              'utc',
              'quantize',
              'sequential',
              'cyclic',
              'probability',
              'logit',
              'probit',
            ].includes(type ?? '')
          ? 2
          : undefined;
    if (requiredLength !== undefined && value.domain.length !== requiredLength) {
      issues.push({
        path: `${path}.domain`,
        message: `${type} scale domain must contain exactly ${requiredLength} values.`,
      });
    }
    if (
      type !== undefined &&
      [
        'linear',
        'log',
        'symlog',
        'asinh',
        'pow',
        'sqrt',
        'quantize',
        'sequential',
        'cyclic',
        'probability',
        'logit',
        'probit',
      ].includes(type) &&
      numbers.length === 2 &&
      numbers[0] === numbers[1]
    ) {
      issues.push({
        path: `${path}.domain`,
        message: `${type} scale domain endpoints must differ.`,
      });
    }
    if (
      (type === 'time' || type === 'utc') &&
      value.domain.length === 2 &&
      value.domain
        .map((entry) => temporalTimestamp(entry as number | string, true) ?? Number.NaN)
        .every(Number.isFinite) &&
      temporalTimestamp(value.domain[0] as number | string, true) ===
        temporalTimestamp(value.domain[1] as number | string, true)
    ) {
      issues.push({
        path: `${path}.domain`,
        message: `${type} scale domain endpoints must differ.`,
      });
    }
    if (
      type === 'diverging' &&
      numbers.length === 3 &&
      !(numbers[0]! < numbers[1]! && numbers[1]! < numbers[2]!)
    ) {
      issues.push({
        path: `${path}.domain`,
        message: 'Diverging scale domain must be strictly ascending.',
      });
    }
    if (
      type === 'threshold' &&
      numbers.length === value.domain.length &&
      numbers.some((entry, index) => index > 0 && entry <= numbers[index - 1]!)
    ) {
      issues.push({
        path: `${path}.domain`,
        message: 'Threshold scale domain must be strictly ascending.',
      });
    }
  }
  if (
    type === 'threshold' &&
    Array.isArray(value.domain) &&
    Array.isArray(value.range) &&
    value.range.length !== value.domain.length + 1
  ) {
    issues.push({
      path: `${path}.range`,
      message: 'Threshold scale range length must equal domain length + 1.',
    });
  }
}

function validateAxisFont(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axis font must be an object.' });
    return;
  }
  validateUnknownKeys(value, AXIS_FONT_KEYS, path, 'axis font', issues);
  validateOptionalString(value.family, `${path}.family`, 'Axis font family', issues, false);
  if (value.size !== undefined) {
    validateFiniteNumber(value.size, `${path}.size`, 'Axis font size', issues, {
      min: 1,
      max: 256,
    });
  }
  if (
    value.weight !== undefined &&
    !(
      (typeof value.weight === 'number' &&
        Number.isInteger(value.weight) &&
        value.weight >= 100 &&
        value.weight <= 900) ||
      (typeof value.weight === 'string' && AXIS_FONT_WEIGHTS.has(value.weight))
    )
  ) {
    issues.push({
      path: `${path}.weight`,
      message: 'Axis font weight must be 100..900 or a supported named weight.',
    });
  }
  if (
    value.style !== undefined &&
    (typeof value.style !== 'string' || !AXIS_FONT_STYLES.has(value.style))
  ) {
    issues.push({ path: `${path}.style`, message: 'Axis font style is not supported.' });
  }
}

function validateAxisStroke(
  value: unknown,
  path: string,
  issues: SpecIssue[],
  allowedKeys: ReadonlySet<string> = AXIS_STROKE_KEYS,
): value is Record<string, unknown> {
  if (typeof value === 'boolean') return false;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axis stroke must be a boolean or an object.' });
    return false;
  }
  validateUnknownKeys(value, allowedKeys, path, 'axis stroke', issues);
  validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis stroke visibility', issues);
  validateOptionalString(value.color, `${path}.color`, 'Axis stroke color', issues, false);
  if (value.width !== undefined) {
    validateFiniteNumber(value.width, `${path}.width`, 'Axis stroke width', issues, {
      min: 0,
      max: 32,
    });
  }
  if (value.opacity !== undefined) {
    validateFiniteNumber(value.opacity, `${path}.opacity`, 'Axis stroke opacity', issues, {
      min: 0,
      max: 1,
    });
  }
  if (value.dash !== undefined) {
    if (!Array.isArray(value.dash) || value.dash.length > 16) {
      issues.push({
        path: `${path}.dash`,
        message: 'Axis stroke dash must be an array of at most 16 numbers.',
      });
    } else {
      value.dash.forEach((entry, index) =>
        validateFiniteNumber(entry, `${path}.dash[${index}]`, 'Axis stroke dash value', issues, {
          min: 0,
          max: 256,
        }),
      );
    }
  }
  return true;
}

function validateAxisTicks(value: unknown, path: string, issues: SpecIssue[]): void {
  if (typeof value === 'boolean') return;
  if (!validateAxisStroke(value, path, issues, AXIS_TICK_KEYS)) return;
  if (value.count !== undefined) {
    validateFiniteNumber(value.count, `${path}.count`, 'Axis tick count', issues, {
      integer: true,
      min: 1,
      max: 200,
    });
  }
  for (const key of ['spacing', 'size'] as const) {
    if (value[key] !== undefined) {
      validateFiniteNumber(value[key], `${path}.${key}`, `Axis tick ${key}`, issues, {
        min: 0,
        max: 256,
      });
    }
  }
  if (value.values !== undefined) {
    if (!Array.isArray(value.values) || value.values.length === 0 || value.values.length > 200) {
      issues.push({
        path: `${path}.values`,
        message: 'Axis tick values must contain between 1 and 200 entries.',
      });
    } else {
      value.values.forEach((entry, index) => {
        if (
          (typeof entry !== 'number' && typeof entry !== 'string') ||
          (typeof entry === 'number' && !Number.isFinite(entry))
        ) {
          issues.push({
            path: `${path}.values[${index}]`,
            message: 'Axis tick values must be finite numbers or strings.',
          });
        }
      });
    }
  }
}

function validateAxisLabels(value: unknown, path: string, issues: SpecIssue[]): void {
  if (typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axis labels must be a boolean or an object.' });
    return;
  }
  validateUnknownKeys(value, AXIS_LABEL_KEYS, path, 'axis label', issues);
  validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis label visibility', issues);
  if (
    value.orientation !== undefined &&
    (typeof value.orientation !== 'string' || !AXIS_LABEL_ORIENTATIONS.has(value.orientation))
  ) {
    issues.push({
      path: `${path}.orientation`,
      message: 'Axis label orientation is not supported.',
    });
  }
  if (value.angle !== undefined) {
    validateFiniteNumber(value.angle, `${path}.angle`, 'Axis label angle', issues, {
      min: -360,
      max: 360,
    });
  }
  if (
    value.align !== undefined &&
    (typeof value.align !== 'string' || !AXIS_TEXT_ALIGNS.has(value.align))
  ) {
    issues.push({ path: `${path}.align`, message: 'Axis label alignment is not supported.' });
  }
  if (value.padding !== undefined) {
    validateFiniteNumber(value.padding, `${path}.padding`, 'Axis label padding', issues, {
      min: 0,
      max: 256,
    });
  }
  if (value.maxLength !== undefined) {
    validateFiniteNumber(value.maxLength, `${path}.maxLength`, 'Axis label maxLength', issues, {
      integer: true,
      min: 1,
      max: 1000,
    });
  }
  validateOptionalString(value.color, `${path}.color`, 'Axis label color', issues, false);
  validateAxisFont(value.font, `${path}.font`, issues);
}

function validateAxisTitle(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (typeof value === 'string' || value === false) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axis title must be a string, false, or an object.' });
    return;
  }
  validateUnknownKeys(value, AXIS_TITLE_KEYS, path, 'axis title', issues);
  validateOptionalString(value.text, `${path}.text`, 'Axis title text', issues);
  validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis title visibility', issues);
  if (
    value.align !== undefined &&
    (typeof value.align !== 'string' || !AXIS_TITLE_ALIGNS.has(value.align))
  ) {
    issues.push({ path: `${path}.align`, message: 'Axis title alignment is not supported.' });
  }
  if (value.angle !== undefined) {
    validateFiniteNumber(value.angle, `${path}.angle`, 'Axis title angle', issues, {
      min: -360,
      max: 360,
    });
  }
  if (value.padding !== undefined) {
    validateFiniteNumber(value.padding, `${path}.padding`, 'Axis title padding', issues, {
      min: 0,
      max: 256,
    });
  }
  validateOptionalString(value.color, `${path}.color`, 'Axis title color', issues, false);
  validateAxisFont(value.font, `${path}.font`, issues);
}

function validateAxisFormat(value: unknown, path: string, issues: SpecIssue[]): void {
  if (typeof value === 'string') {
    if (!AXIS_FORMAT_TYPES.has(value)) {
      issues.push({ path, message: 'Axis format is not supported.' });
    }
    return;
  }
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axis format must be a supported name or an object.' });
    return;
  }
  validateUnknownKeys(value, AXIS_FORMAT_KEYS, path, 'axis format', issues);
  if (
    value.type !== undefined &&
    (typeof value.type !== 'string' || !AXIS_FORMAT_TYPES.has(value.type))
  ) {
    issues.push({ path: `${path}.type`, message: 'Axis format type is not supported.' });
  }
  if (value.fractionDigits !== undefined) {
    validateFiniteNumber(
      value.fractionDigits,
      `${path}.fractionDigits`,
      'Axis format fractionDigits',
      issues,
      { integer: true, min: 0, max: 20 },
    );
  }
  if (
    value.notation !== undefined &&
    (typeof value.notation !== 'string' || !AXIS_NOTATIONS.has(value.notation))
  ) {
    issues.push({ path: `${path}.notation`, message: 'Axis number notation is not supported.' });
  }
  validateOptionalBoolean(
    value.useGrouping,
    `${path}.useGrouping`,
    'Axis format useGrouping',
    issues,
  );
  if (value.currency !== undefined) {
    if (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)) {
      issues.push({
        path: `${path}.currency`,
        message: 'Axis currency must be an uppercase three-letter code.',
      });
    }
    if (value.type !== undefined && value.type !== 'currency') {
      issues.push({
        path: `${path}.currency`,
        message: 'Axis currency is only valid for the currency format.',
      });
    }
  }
  if (
    value.currencyDisplay !== undefined &&
    (typeof value.currencyDisplay !== 'string' ||
      !AXIS_CURRENCY_DISPLAYS.has(value.currencyDisplay))
  ) {
    issues.push({
      path: `${path}.currencyDisplay`,
      message: 'Axis currency display is not supported.',
    });
  }
  if (
    value.dateStyle !== undefined &&
    (typeof value.dateStyle !== 'string' || !AXIS_DATE_STYLES.has(value.dateStyle))
  ) {
    issues.push({ path: `${path}.dateStyle`, message: 'Axis date style is not supported.' });
  }
  if (
    value.timeStyle !== undefined &&
    (typeof value.timeStyle !== 'string' || !AXIS_TIME_STYLES.has(value.timeStyle))
  ) {
    issues.push({ path: `${path}.timeStyle`, message: 'Axis time style is not supported.' });
  }
  validateOptionalString(value.timeZone, `${path}.timeZone`, 'Axis timeZone', issues, false);
  validateOptionalString(value.prefix, `${path}.prefix`, 'Axis format prefix', issues);
  validateOptionalString(value.suffix, `${path}.suffix`, 'Axis format suffix', issues);
}

function validateAxis(
  value: unknown,
  path: string,
  axisId: string,
  expectedChannel: 'x' | 'y' | undefined,
  issues: SpecIssue[],
): void {
  if (value === false) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axis must be an object or false.' });
    return;
  }
  validateUnknownKeys(value, AXIS_KEYS, path, 'axis', issues);
  if (
    value.channel !== undefined &&
    (typeof value.channel !== 'string' || !['x', 'y'].includes(value.channel))
  ) {
    issues.push({ path: `${path}.channel`, message: 'Axis channel must be x or y.' });
  }
  const channel =
    expectedChannel ??
    builtInAxisChannel(axisId) ??
    (value.channel === 'x' || value.channel === 'y' ? value.channel : undefined);
  if (
    expectedChannel !== undefined &&
    value.channel !== undefined &&
    value.channel !== expectedChannel
  ) {
    issues.push({
      path: `${path}.channel`,
      message: `Axis channel must be "${expectedChannel}" in this context.`,
    });
  }
  validateAxisTitle(value.title, `${path}.title`, issues);
  validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis visibility', issues);
  if (value.position !== undefined) {
    if (typeof value.position !== 'string' || !AXIS_POSITIONS.has(value.position)) {
      issues.push({ path: `${path}.position`, message: 'Axis position is not supported.' });
    } else if (
      channel !== undefined &&
      axisPositionChannel(value.position as import('./types.js').AxisPosition) !== channel
    ) {
      issues.push({
        path: `${path}.position`,
        message: `${axisId}-axis position is incompatible with its channel.`,
      });
    }
  }
  if (value.offset !== undefined) {
    validateFiniteNumber(value.offset, `${path}.offset`, 'Axis offset', issues, {
      min: 0,
      max: 256,
    });
  }
  for (const key of ['line', 'grid'] as const) {
    if (value[key] !== undefined) validateAxisStroke(value[key], `${path}.${key}`, issues);
  }
  if (value.ticks !== undefined) validateAxisTicks(value.ticks, `${path}.ticks`, issues);
  if (value.labels !== undefined) validateAxisLabels(value.labels, `${path}.labels`, issues);
  if (value.tickCount !== undefined) {
    validateFiniteNumber(value.tickCount, `${path}.tickCount`, 'Axis tickCount', issues, {
      integer: true,
      min: 1,
      max: 200,
    });
  }
  if (value.format !== undefined) validateAxisFormat(value.format, `${path}.format`, issues);
  if (value.labelAngle !== undefined) {
    validateFiniteNumber(value.labelAngle, `${path}.labelAngle`, 'Axis labelAngle', issues, {
      min: -360,
      max: 360,
    });
  }
}

function validateAxes(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axes must be an object.' });
    return;
  }
  for (const [axisId, axis] of Object.entries(value)) {
    if (!isSafeAxisId(axisId)) {
      issues.push({
        path: `${path}.${axisId}`,
        message:
          'Axis id must start with an ASCII letter and contain at most 64 letters, digits, underscores, or hyphens.',
      });
      continue;
    }
    const builtInChannel = builtInAxisChannel(axisId);
    if (builtInChannel === undefined) {
      if (!isPlainObject(axis)) {
        issues.push({
          path: `${path}.${axisId}`,
          message: 'Named axis must be an object with explicit channel and position.',
        });
        continue;
      }
      if (axis.channel !== 'x' && axis.channel !== 'y') {
        issues.push({
          path: `${path}.${axisId}.channel`,
          message: 'Named axis requires an explicit x or y channel.',
        });
      }
      if (axis.position === undefined) {
        issues.push({
          path: `${path}.${axisId}.position`,
          message: 'Named axis requires an explicit top, bottom, left, or right position.',
        });
      }
    }
    validateAxis(axis, `${path}.${axisId}`, axisId, builtInChannel, issues);
  }
}

function validateEncodingCondition(
  value: unknown,
  path: string,
  channel: EncodingChannel,
  issues: SpecIssue[],
): void {
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Encoding condition must be an object.' });
    return;
  }
  validateUnknownKeys(value, ENCODING_CONDITION_KEYS, path, 'encoding condition', issues);
  validateTransformExpression(value.test, `${path}.test`, issues);
  const hasField = value.field !== undefined;
  const hasValue = value.value !== undefined;
  if (hasField === hasValue) {
    issues.push({ path, message: 'Encoding condition requires exactly one of field or value.' });
  }
  if (hasField) {
    if (
      typeof value.field !== 'string' ||
      value.field.trim() === '' ||
      UNSAFE_FIELDS.has(value.field)
    ) {
      issues.push({
        path: `${path}.field`,
        message: 'Conditional field must be a non-empty safe string.',
      });
    }
  }
  if (hasValue) validateChannelValue(value.value, `${path}.value`, channel, issues);
}

function validateChannelValue(
  value: unknown,
  path: string,
  channel: EncodingChannel,
  issues: SpecIssue[],
): void {
  if (channel === 'strokeDash') {
    if (
      !Array.isArray(value) ||
      value.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0)
    ) {
      issues.push({
        path,
        message: 'strokeDash value must be an array of non-negative finite numbers.',
      });
    }
    return;
  }
  if (
    Array.isArray(value) ||
    value === undefined ||
    (value !== null && !['string', 'number', 'boolean'].includes(typeof value))
  ) {
    issues.push({ path, message: 'Encoding value must be a JSON scalar.' });
    return;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    issues.push({ path, message: 'Encoding number must be finite.' });
  }
  if (
    ['size', 'radius', 'strokeWidth'].includes(channel) &&
    (typeof value !== 'number' || value < 0)
  ) {
    issues.push({ path, message: `${channel} value must be a non-negative number.` });
  }
  if (channel === 'opacity' && (typeof value !== 'number' || value < 0 || value > 1)) {
    issues.push({ path, message: 'Opacity value must be a number between 0 and 1.' });
  }
  if (
    (channel === 'shape' || channel === 'symbol') &&
    (typeof value !== 'string' || !POINT_SHAPES.has(value))
  ) {
    issues.push({
      path,
      message: `${channel} value must be circle, square, diamond, triangle, or cross.`,
    });
  }
  if (
    channel === 'icon' &&
    (typeof value !== 'string' ||
      value.trim() === '' ||
      value.length > 32 ||
      /[\u0000-\u001f\u007f]/u.test(value))
  ) {
    issues.push({
      path,
      message: 'Icon value must be a safe non-empty string up to 32 characters.',
    });
  }
}

function validateEncoding(
  value: unknown,
  path: string,
  channel: EncodingChannel,
  issues: SpecIssue[],
): void {
  if (typeof value === 'string') {
    if (value.trim() === '') issues.push({ path, message: 'Field name must not be empty.' });
    if (UNSAFE_FIELDS.has(value))
      issues.push({ path, message: `Unsafe field "${value}" is forbidden.` });
    return;
  }

  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Encoding must be a field name or a closed encoding object.' });
    return;
  }

  validateUnknownKeys(value, ENCODING_KEYS, path, 'encoding', issues);

  const hasField = value.field !== undefined;
  const hasValue = value.value !== undefined;
  if (hasField === hasValue) {
    issues.push({ path, message: 'Encoding requires exactly one of field or value.' });
  }
  if (FIELD_ONLY_SEMANTIC_CHANNELS.has(channel) && !hasField) {
    issues.push({ path: `${path}.field`, message: `${channel} requires a field encoding.` });
  }
  if ((channel === 'x' || channel === 'y') && !hasField) {
    issues.push({ path: `${path}.field`, message: `${channel} encoding requires a field.` });
  }
  if (hasField) {
    if (typeof value.field !== 'string' || value.field.trim() === '')
      issues.push({ path: `${path}.field`, message: 'Field must not be empty.' });
    if (typeof value.field === 'string' && UNSAFE_FIELDS.has(value.field)) {
      issues.push({
        path: `${path}.field`,
        message: `Unsafe field "${value.field}" is forbidden.`,
      });
    }
  }
  if (hasValue) validateChannelValue(value.value, `${path}.value`, channel, issues);
  if (
    value.type !== undefined &&
    (typeof value.type !== 'string' || !FIELD_TYPES.has(value.type))
  ) {
    issues.push({ path: `${path}.type`, message: 'Encoding type is not supported.' });
  }
  validateOptionalString(value.title, `${path}.title`, 'Encoding title', issues);
  validateScale(value.scale, `${path}.scale`, issues);

  if (value.scale !== undefined && RAW_ONLY_ENCODING_CHANNELS.has(channel)) {
    issues.push({
      path: `${path}.scale`,
      message: `${channel} uses its raw or closed built-in channel registry and does not accept a scale.`,
    });
  }

  const conditions =
    value.condition === undefined
      ? []
      : Array.isArray(value.condition)
        ? value.condition
        : [value.condition];
  if (
    hasValue &&
    value.scale !== undefined &&
    !conditions.some((condition) => isPlainObject(condition) && condition.field !== undefined)
  ) {
    issues.push({
      path: `${path}.scale`,
      message: 'A literal value bypasses scales; remove scale or add a conditional field.',
    });
  }

  if (
    isPlainObject(value.scale) &&
    value.scale.range !== undefined &&
    (channel === 'x' || channel === 'x2' || channel === 'y' || channel === 'y2')
  ) {
    issues.push({
      path: `${path}.scale.range`,
      message:
        'Cartesian position ranges are owned by chart layout; use the standalone scale registry for explicit ranges.',
    });
  }
  if (
    isPlainObject(value.scale) &&
    value.scale.type === 'threshold' &&
    value.scale.domain === undefined &&
    !['x', 'x2', 'y', 'y2'].includes(channel)
  ) {
    issues.push({
      path: `${path}.scale.domain`,
      message: 'Threshold channel scales require explicit thresholds in domain.',
    });
  }
  if (
    isPlainObject(value.scale) &&
    value.scale.type === undefined &&
    Array.isArray(value.scale.domain) &&
    (value.type === 'quantitative' || value.type === 'temporal') &&
    value.scale.domain.length !== 2
  ) {
    issues.push({
      path: `${path}.scale.domain`,
      message: `An inferred ${value.type} scale domain must contain exactly 2 values.`,
    });
  }
  if (
    isPlainObject(value.scale) &&
    (value.type === 'nominal' || value.type === 'ordinal') &&
    typeof value.scale.type === 'string' &&
    !(channel === 'x' || channel === 'y'
      ? ['band', 'point'].includes(value.scale.type)
      : value.scale.type === 'ordinal')
  ) {
    issues.push({
      path: `${path}.scale.type`,
      message:
        channel === 'x' || channel === 'y'
          ? `${value.type} Cartesian encodings require band or point scales.`
          : `${value.type} visual encodings require an ordinal scale.`,
    });
  }
  if (
    isPlainObject(value.scale) &&
    (value.type === 'quantitative' || value.type === 'temporal') &&
    typeof value.scale.type === 'string' &&
    ['band', 'point', 'ordinal'].includes(value.scale.type)
  ) {
    issues.push({
      path: `${path}.scale.type`,
      message: `${value.type} encodings cannot use a categorical scale.`,
    });
  }
  if (
    isPlainObject(value.scale) &&
    (channel === 'x' || channel === 'y') &&
    typeof value.scale.type === 'string' &&
    ![
      'linear',
      'log',
      'symlog',
      'asinh',
      'pow',
      'sqrt',
      'time',
      'utc',
      'band',
      'point',
      'probability',
      'logit',
      'probit',
    ].includes(value.scale.type)
  ) {
    issues.push({
      path: `${path}.scale.type`,
      message: `${value.scale.type} is not implemented as a Cartesian axis scale.`,
    });
  }
  if (
    isPlainObject(value.scale) &&
    ['color', 'fill', 'stroke'].includes(channel) &&
    (value.scale.type === 'band' || value.scale.type === 'point')
  ) {
    issues.push({
      path: `${path}.scale.type`,
      message: `${value.scale.type} is a Cartesian categorical scale; color channels use ordinal.`,
    });
  }
  if (
    isPlainObject(value.scale) &&
    ['color', 'fill', 'stroke'].includes(channel) &&
    value.scale.outOfBounds === 'extrapolate' &&
    value.scale.type !== 'cyclic'
  ) {
    issues.push({
      path: `${path}.scale.outOfBounds`,
      message: 'Color scales do not extrapolate colors; use clamp, error, or unknown.',
    });
  }
  if (isPlainObject(value.scale) && Array.isArray(value.scale.range)) {
    if (
      ['color', 'fill', 'stroke'].includes(channel) &&
      value.scale.range.some((entry) => typeof entry !== 'string')
    ) {
      issues.push({
        path: `${path}.scale.range`,
        message: 'Color scale range must contain strings.',
      });
    }
    if (
      ['size', 'radius', 'opacity', 'strokeWidth'].includes(channel) &&
      value.scale.range.some((entry) => typeof entry !== 'number')
    ) {
      issues.push({
        path: `${path}.scale.range`,
        message: `${channel} scale range must contain numbers.`,
      });
    }
    if (['color', 'fill', 'stroke'].includes(channel) && typeof value.scale.type !== 'string') {
      issues.push({
        path: `${path}.scale.type`,
        message: 'An explicit color range requires an explicit color scale type.',
      });
    }
    if (
      ['color', 'fill', 'stroke'].includes(channel) &&
      typeof value.scale.type === 'string' &&
      !['ordinal', 'sequential', 'diverging', 'cyclic'].includes(value.scale.type)
    ) {
      issues.push({
        path: `${path}.scale.range`,
        message:
          'Transformed numeric color scales use the active theme palette; explicit color ranges require sequential, diverging, cyclic, or ordinal.',
      });
    }
    if (
      ['size', 'radius', 'opacity', 'strokeWidth'].includes(channel) &&
      (value.scale.type === undefined ||
        (typeof value.scale.type === 'string' &&
          !['ordinal', 'quantile', 'quantize', 'threshold'].includes(value.scale.type))) &&
      (value.type === 'quantitative' || value.type === 'temporal') &&
      value.scale.range.length !== 2
    ) {
      issues.push({
        path: `${path}.scale.range`,
        message: `${channel} continuous scale range must contain exactly 2 numbers.`,
      });
    }
  }
  if (isPlainObject(value.scale) && (channel === 'x2' || channel === 'y2')) {
    issues.push({
      path: `${path}.scale`,
      message: `${channel} shares the primary position scale and cannot declare a separate scale.`,
    });
  }
  if (
    isPlainObject(value.scale) &&
    typeof value.scale.type === 'string' &&
    ['sequential', 'diverging', 'cyclic'].includes(value.scale.type) &&
    !['color', 'fill', 'stroke'].includes(channel)
  ) {
    issues.push({
      path: `${path}.scale.type`,
      message: `${value.scale.type} is a color-only scale.`,
    });
  }

  const axisId =
    typeof value.axisId === 'string' && isSafeAxisId(value.axisId)
      ? value.axisId
      : channel === 'x' || channel === 'y'
        ? channel
        : undefined;
  if (
    value.axisId !== undefined &&
    ((channel !== 'x' && channel !== 'y') ||
      typeof value.axisId !== 'string' ||
      !isSafeAxisId(value.axisId))
  ) {
    issues.push({
      path: `${path}.axisId`,
      message:
        channel === 'x' || channel === 'y'
          ? `${channel}-encoding axisId must use the safe named-axis grammar.`
          : `axisId is not valid for the ${channel} channel.`,
    });
  }
  if (value.axis !== undefined) {
    if ((channel === 'x' || channel === 'y') && axisId !== undefined) {
      validateAxis(value.axis, `${path}.axis`, axisId, channel, issues);
    } else {
      issues.push({
        path: `${path}.axis`,
        message: `Axis is not valid for the ${channel} channel.`,
      });
    }
  }
  if (value.condition !== undefined) {
    if (channel === 'x' || channel === 'y' || channel === 'x2' || channel === 'y2') {
      issues.push({
        path: `${path}.condition`,
        message:
          'Conditional Cartesian positions are not implemented; precompute the position field with calculate instead.',
      });
    }
    if (conditions.length === 0 || conditions.length > 32) {
      issues.push({
        path: `${path}.condition`,
        message: 'Encoding condition requires 1..32 entries.',
      });
    } else {
      conditions.forEach((condition, index) =>
        validateEncodingCondition(condition, `${path}.condition[${index}]`, channel, issues),
      );
    }
  }
}

function markType(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return isPlainObject(value) && typeof value.type === 'string' ? value.type : undefined;
}

function validateMarkEncodingCompatibility(
  mark: unknown,
  encoding: unknown,
  path: string,
  issues: SpecIssue[],
): void {
  if (!isPlainObject(encoding)) return;
  const type = markType(mark);
  const markObject = isPlainObject(mark) ? mark : null;
  const markOptions =
    markObject !== null && isPlainObject(markObject.options) ? markObject.options : null;
  const seriesLayout = type === 'theme-river' || markOptions?.stack !== undefined;
  const shared = new Set(['x', 'y']);
  const allowed = new Set(shared);
  if (type === 'point' || type === 'circle') {
    for (const channel of [
      'color',
      'fill',
      'stroke',
      'size',
      'radius',
      'shape',
      'symbol',
      'icon',
      'opacity',
      'strokeWidth',
      'strokeDash',
      'text',
      'order',
      'tooltip',
    ])
      allowed.add(channel);
  } else if (type === 'bar') {
    for (const channel of [
      'x2',
      'y2',
      'color',
      'fill',
      'stroke',
      'opacity',
      'strokeWidth',
      'strokeDash',
      'order',
      'tooltip',
    ])
      allowed.add(channel);
  } else if (type === 'line') {
    for (const channel of [
      'color',
      'stroke',
      'opacity',
      'strokeWidth',
      'strokeDash',
      'order',
      'detail',
    ])
      allowed.add(channel);
    if (isPlainObject(mark) && mark.point === true) {
      for (const channel of ['fill', 'size', 'radius', 'tooltip']) allowed.add(channel);
    }
  } else if (type === 'area' || type === 'stepped-area' || type === 'theme-river') {
    for (const channel of [
      'y2',
      'color',
      'fill',
      'stroke',
      'opacity',
      'strokeWidth',
      'strokeDash',
      'order',
      'detail',
    ])
      allowed.add(channel);
    if (isPlainObject(mark) && mark.point === true) {
      for (const channel of ['size', 'radius', 'tooltip']) allowed.add(channel);
    }
  } else if (type === 'heatmap') {
    for (const channel of [
      'x2',
      'y2',
      'color',
      'fill',
      'stroke',
      'opacity',
      'strokeWidth',
      'strokeDash',
      'text',
      'order',
      'tooltip',
    ])
      allowed.add(channel);
  } else if (type !== undefined && GEOGRAPHIC_POSITION_MARKS.has(type)) {
    allowed.add('longitude');
    allowed.add('latitude');
  } else if (type !== undefined && TRADING_CHANNEL_MARKS.has(type)) {
    for (const channel of ['open', 'high', 'low', 'close', 'volume']) allowed.add(channel);
  } else if (type === 'polar') {
    for (const channel of ['angle', 'theta', 'radius']) allowed.add(channel);
  } else if (type === 'pie' || type === 'variable-pie') {
    for (const channel of ['angle', 'theta']) allowed.add(channel);
  } else if (type === 'indicator') {
    for (const channel of ['open', 'high', 'low', 'close', 'volume']) allowed.add(channel);
  } else if (type === 'renko' || type === 'point-figure') {
    allowed.add('close');
  } else if (type === 'volume-profile') {
    allowed.add('volume');
  }

  const aliases: readonly (readonly [string, string])[] = [
    ...(type !== undefined && GEOGRAPHIC_POSITION_MARKS.has(type)
      ? ([
          ['x', 'longitude'],
          ['y', 'latitude'],
        ] as const)
      : []),
    ...(type === 'polar'
      ? ([
          ['x', 'theta'],
          ['x', 'angle'],
          ['y', 'radius'],
        ] as const)
      : []),
    ...(type === 'pie' || type === 'variable-pie'
      ? ([
          ['y', 'theta'],
          ['y', 'angle'],
        ] as const)
      : []),
    ...(type !== undefined &&
    (TRADING_CHANNEL_MARKS.has(type) || ['renko', 'point-figure', 'indicator'].includes(type))
      ? ([['y', 'close']] as const)
      : []),
  ];
  for (const [position, semantic] of aliases) {
    if (encoding[position] !== undefined && encoding[semantic] !== undefined) {
      issues.push({
        path: `${path}.${semantic}`,
        message: `Use either ${position} or its ${semantic} semantic alias, not both.`,
      });
    }
  }
  if (encoding.theta !== undefined && encoding.angle !== undefined) {
    issues.push({ path: `${path}.angle`, message: 'Use either theta or angle, not both.' });
  }
  if (type === 'point' || type === 'circle') {
    const glyphs = ['shape', 'symbol', 'icon'].filter((channel) => encoding[channel] !== undefined);
    if (glyphs.length > 1) {
      issues.push({
        path,
        message: `Use one point glyph channel; received ${glyphs.join(', ')}.`,
      });
    }
  }
  for (const channel of Object.keys(encoding)) {
    if (
      seriesLayout &&
      ((type === 'bar' && (channel === 'x2' || channel === 'y2')) ||
        ((type === 'area' || type === 'theme-river') && channel === 'y2'))
    ) {
      issues.push({
        path: `${path}.${channel}`,
        message: `The ${channel} range channel conflicts with series-stack boundaries; remove the range channel or the stack layout.`,
      });
      continue;
    }
    if (!allowed.has(channel)) {
      issues.push({
        path: `${path}.${channel}`,
        message: `The ${channel} channel is not implemented for mark "${type ?? 'unknown'}".`,
      });
    }
  }
}

function validateEncodingMap(
  value: unknown,
  path: string,
  issues: SpecIssue[],
  mark?: unknown,
): void {
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Encoding map must be an object.' });
    return;
  }
  validateUnknownKeys(value, ENCODING_CHANNELS, path, 'encoding channel', issues);
  const type = markType(mark);
  const derivedX =
    type !== undefined && GEOGRAPHIC_POSITION_MARKS.has(type)
      ? value.longitude
      : type === 'polar'
        ? (value.theta ?? value.angle)
        : undefined;
  const derivedY =
    type !== undefined && GEOGRAPHIC_POSITION_MARKS.has(type)
      ? value.latitude
      : type === 'polar'
        ? value.radius
        : type === 'pie' || type === 'variable-pie'
          ? (value.theta ?? value.angle)
          : type !== undefined &&
              (TRADING_CHANNEL_MARKS.has(type) ||
                ['renko', 'point-figure', 'indicator'].includes(type))
            ? value.close
            : undefined;
  if (value.x === undefined && derivedX === undefined)
    issues.push({ path: `${path}.x`, message: 'Encoding map requires x.' });
  if (value.y === undefined && derivedY === undefined)
    issues.push({ path: `${path}.y`, message: 'Encoding map requires y.' });
  for (const channel of ENCODING_CHANNELS) {
    if (value[channel] !== undefined) {
      validateEncoding(
        value[channel] as ChannelEncodingInput,
        `${path}.${channel}`,
        channel,
        issues,
      );
    }
  }
}

function validateLayerClip(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Layer clip must be a boolean or clip object.' });
    return;
  }
  if (value.type === 'plot') {
    validateUnknownKeys(
      value,
      new Set(['type', 'x', 'y', 'width', 'height']),
      path,
      'plot clip',
      issues,
    );
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      if (value[key] === undefined) {
        issues.push({ path: `${path}.${key}`, message: `Plot clip requires ${key}.` });
      } else {
        validateFiniteNumber(value[key], `${path}.${key}`, `Plot clip ${key}`, issues, {
          min: 0,
          max: 1,
        });
      }
    }
    if (
      typeof value.x === 'number' &&
      typeof value.width === 'number' &&
      value.x + value.width > 1
    ) {
      issues.push({ path, message: 'Plot clip x + width must not exceed 1.' });
    }
    if (
      typeof value.y === 'number' &&
      typeof value.height === 'number' &&
      value.y + value.height > 1
    ) {
      issues.push({ path, message: 'Plot clip y + height must not exceed 1.' });
    }
    return;
  }
  if (value.type === 'domain') {
    validateUnknownKeys(value, new Set(['type', 'x', 'y']), path, 'domain clip', issues);
    if (value.x === undefined && value.y === undefined) {
      issues.push({ path, message: 'Domain clip requires x, y, or both ranges.' });
    }
    for (const channel of ['x', 'y'] as const) {
      const range = value[channel];
      if (range === undefined) continue;
      if (!isPlainObject(range)) {
        issues.push({
          path: `${path}.${channel}`,
          message: 'Domain clip range must be an object.',
        });
        continue;
      }
      validateUnknownKeys(
        range,
        new Set(['axis', 'from', 'to']),
        `${path}.${channel}`,
        'domain clip range',
        issues,
      );
      if (range.axis !== undefined && !isSafeAxisId(range.axis)) {
        issues.push({
          path: `${path}.${channel}.axis`,
          message: 'Domain clip axis must use the safe named-axis grammar.',
        });
      }
      for (const key of ['from', 'to'] as const) {
        if (
          (typeof range[key] !== 'number' || !Number.isFinite(range[key])) &&
          typeof range[key] !== 'string'
        ) {
          issues.push({
            path: `${path}.${channel}.${key}`,
            message: `Domain clip ${key} must be a finite number or string.`,
          });
        }
      }
    }
    return;
  }
  issues.push({ path: `${path}.type`, message: 'Layer clip type must be plot or domain.' });
}

function validateSeriesStack(
  markType: string,
  markFields: unknown,
  value: unknown,
  path: string,
  issues: SpecIssue[],
): void {
  if (value === undefined) return;
  if (!SERIES_STACK_MARKS.has(markType)) {
    issues.push({
      path,
      message: 'Series stack layout is supported only by area, bar, and theme-river.',
    });
    return;
  }
  const object = isPlainObject(value) ? value : null;
  const mode = typeof value === 'string' ? value : (object?.mode ?? 'stacked');
  if (typeof mode !== 'string' || !(seriesStackModes as readonly string[]).includes(mode)) {
    issues.push({
      path: object === null ? path : `${path}.mode`,
      message: `Series stack mode must be one of: ${seriesStackModes.join(', ')}.`,
    });
  }
  if (object === null) {
    if (typeof value !== 'string') {
      issues.push({ path, message: 'Series stack must be a supported mode string or an object.' });
    }
  } else {
    validateUnknownKeys(
      object,
      new Set(['mode', 'offset', 'order', 'sort']),
      path,
      'series stack',
      issues,
    );
    if (
      object.offset !== undefined &&
      (typeof object.offset !== 'string' || !SERIES_STACK_OFFSETS.has(object.offset))
    ) {
      issues.push({ path: `${path}.offset`, message: 'Series stack offset is not supported.' });
    }
    if (
      object.order !== undefined &&
      (typeof object.order !== 'string' || !SERIES_STACK_ORDERS.has(object.order))
    ) {
      issues.push({ path: `${path}.order`, message: 'Series stack order is not supported.' });
    }
    if (object.sort !== undefined) {
      if (!Array.isArray(object.sort) || object.sort.length === 0 || object.sort.length > 16) {
        issues.push({ path: `${path}.sort`, message: 'Series stack sort requires 1..16 fields.' });
      } else {
        object.sort.forEach((entry, index) => {
          const entryPath = `${path}.sort[${index}]`;
          if (!isPlainObject(entry)) {
            issues.push({ path: entryPath, message: 'Series stack sort entry must be an object.' });
            return;
          }
          validateUnknownKeys(
            entry,
            new Set(['field', 'order']),
            entryPath,
            'series stack sort',
            issues,
          );
          if (
            typeof entry.field !== 'string' ||
            entry.field.trim() === '' ||
            UNSAFE_FIELDS.has(entry.field)
          ) {
            issues.push({
              path: `${entryPath}.field`,
              message: 'Series stack sort field must be safe and non-empty.',
            });
          }
          if (
            entry.order !== undefined &&
            entry.order !== 'ascending' &&
            entry.order !== 'descending'
          ) {
            issues.push({
              path: `${entryPath}.order`,
              message: 'Sort order must be ascending or descending.',
            });
          }
        });
      }
    }
    if (mode === 'grouped' && object.offset !== undefined) {
      issues.push({ path: `${path}.offset`, message: 'Grouped series do not use a stack offset.' });
    }
    if (
      mode === '100-percent' &&
      object.offset !== undefined &&
      !['normalize', 'expand'].includes(String(object.offset))
    ) {
      issues.push({
        path: `${path}.offset`,
        message: '100-percent series require normalize or expand offset.',
      });
    }
    if (mode === 'diverging' && object.offset === 'wiggle') {
      issues.push({
        path: `${path}.offset`,
        message: 'Diverging series cannot use the non-negative wiggle offset.',
      });
    }
    if (
      mode === 'streamgraph' &&
      object.offset !== undefined &&
      !['wiggle', 'center', 'silhouette'].includes(String(object.offset))
    ) {
      issues.push({
        path: `${path}.offset`,
        message: 'Streamgraph offset must be wiggle, center, or silhouette.',
      });
    }
  }
  const hasSeries =
    isPlainObject(markFields) &&
    (typeof markFields.series === 'string' ||
      (markType === 'theme-river' && typeof markFields.category === 'string'));
  if (!hasSeries) {
    issues.push({
      path: `${path.replace(/\.options\.stack$/, '.fields')}.series`,
      message: 'Series layout requires mark.fields.series.',
    });
  }
}

function validateIndicatorCalculation(
  options: Readonly<Record<string, unknown>>,
  path: string,
  issues: SpecIssue[],
): void {
  if (options.calculate !== undefined && typeof options.calculate !== 'boolean') {
    issues.push({ path: `${path}.calculate`, message: 'Indicator calculate must be boolean.' });
  }
  if (
    options.kind !== undefined &&
    (typeof options.kind !== 'string' || options.kind.trim() === '')
  ) {
    issues.push({ path: `${path}.kind`, message: 'Indicator kind must be a non-empty string.' });
  }
  const kind = typeof options.kind === 'string' ? options.kind : 'sma';
  const capability = resolveTechnicalIndicatorCapability(kind);
  if (options.calculate === true && capability === null) {
    issues.push({ path: `${path}.kind`, message: `Unknown calculated indicator "${kind}".` });
  }
  if (capability !== null && options.calculate === true) {
    const allParameters = new Set(
      technicalIndicatorCapabilities.flatMap(({ parameters }) =>
        parameters.map(({ name }) => name),
      ),
    );
    for (const name of allParameters) {
      if (options[name] === undefined) continue;
      const parameter = capability.parameters.find((candidate) => candidate.name === name);
      if (parameter === undefined) {
        issues.push({
          path: `${path}.${name}`,
          message: `${name} is not a parameter of ${capability.id}.`,
        });
        continue;
      }
      validateFiniteNumber(options[name], `${path}.${name}`, `Indicator ${name}`, issues, {
        integer: parameter.type === 'integer',
        min: parameter.minimum,
        max: parameter.maximum,
      });
    }
    const numeric = (name: string): number | undefined => {
      if (typeof options[name] === 'number') return options[name];
      return capability.parameters.find((parameter) => parameter.name === name)?.default;
    };
    if (
      numeric('fastPeriod') !== undefined &&
      numeric('slowPeriod') !== undefined &&
      numeric('fastPeriod')! >= numeric('slowPeriod')!
    ) {
      issues.push({
        path: `${path}.fastPeriod`,
        message: 'Indicator fastPeriod must be smaller than slowPeriod.',
      });
    }
    if (
      numeric('conversionPeriod') !== undefined &&
      numeric('basePeriod') !== undefined &&
      numeric('spanPeriod') !== undefined &&
      (numeric('conversionPeriod')! > numeric('basePeriod')! ||
        numeric('basePeriod')! > numeric('spanPeriod')!)
    ) {
      issues.push({
        path: `${path}.conversionPeriod`,
        message: 'Ichimoku periods must satisfy conversionPeriod <= basePeriod <= spanPeriod.',
      });
    }
    if (
      numeric('acceleration') !== undefined &&
      numeric('maximumAcceleration') !== undefined &&
      numeric('acceleration')! > numeric('maximumAcceleration')!
    ) {
      issues.push({
        path: `${path}.acceleration`,
        message: 'Indicator acceleration must be no greater than maximumAcceleration.',
      });
    }
  }
  if (options.session !== undefined) {
    if (!isPlainObject(options.session)) {
      issues.push({ path: `${path}.session`, message: 'Indicator session must be an object.' });
    } else {
      validateUnknownKeys(
        options.session,
        new Set(['mode', 'field', 'timeField', 'gapMs', 'reset']),
        `${path}.session`,
        'indicator session',
        issues,
      );
      const mode = options.session.mode ?? 'none';
      if (!['none', 'field', 'utc-day', 'gap'].includes(String(mode))) {
        issues.push({
          path: `${path}.session.mode`,
          message: 'Indicator session mode must be none, field, utc-day, or gap.',
        });
      }
      if (
        options.session.reset !== undefined &&
        !['hard', 'carry'].includes(String(options.session.reset))
      ) {
        issues.push({
          path: `${path}.session.reset`,
          message: 'Indicator session reset must be hard or carry.',
        });
      }
      if (mode === 'field') {
        validateOptionalString(
          options.session.field,
          `${path}.session.field`,
          'Indicator session field',
          issues,
          false,
        );
        if (options.session.field === undefined) {
          issues.push({
            path: `${path}.session.field`,
            message: 'Indicator field session mode requires field.',
          });
        }
        if (typeof options.session.field === 'string' && UNSAFE_FIELDS.has(options.session.field)) {
          issues.push({
            path: `${path}.session.field`,
            message: 'Indicator session field is unsafe.',
          });
        }
      }
      if (options.session.timeField !== undefined) {
        validateOptionalString(
          options.session.timeField,
          `${path}.session.timeField`,
          'Indicator session time field',
          issues,
          false,
        );
        if (
          typeof options.session.timeField === 'string' &&
          UNSAFE_FIELDS.has(options.session.timeField)
        ) {
          issues.push({
            path: `${path}.session.timeField`,
            message: 'Indicator session time field is unsafe.',
          });
        }
      }
      if (mode === 'gap') {
        validateFiniteNumber(
          options.session.gapMs,
          `${path}.session.gapMs`,
          'Indicator session gap',
          issues,
          { min: Number.MIN_VALUE },
        );
      }
    }
  }
}

function validateMark(value: unknown, path: string, issues: SpecIssue[]): void {
  if (typeof value === 'string') {
    if (value.trim() === '') issues.push({ path, message: 'Mark type must not be empty.' });
    return;
  }
  if (!isPlainObject(value) || typeof value.type !== 'string' || value.type.trim() === '') {
    issues.push({ path, message: 'Mark must be a type string or an object with a type.' });
    return;
  }

  if (value.maxThickness !== undefined) {
    if (
      typeof value.maxThickness !== 'number' ||
      !Number.isFinite(value.maxThickness) ||
      value.maxThickness <= 0
    ) {
      issues.push({
        path: `${path}.maxThickness`,
        message: 'Maximum bar thickness must be a finite positive number.',
      });
    }
    if (value.type !== 'bar') {
      issues.push({
        path: `${path}.maxThickness`,
        message: 'Maximum thickness is only supported by bar marks.',
      });
    }
  }
  if (value.fields !== undefined) {
    if (!isPlainObject(value.fields)) {
      issues.push({ path: `${path}.fields`, message: 'Mark fields must be an object.' });
    } else {
      for (const [name, field] of Object.entries(value.fields)) {
        if (UNSAFE_FIELDS.has(name)) {
          issues.push({
            path: `${path}.fields.${name}`,
            message: `Unsafe key "${name}" is forbidden.`,
          });
        }
        if (typeof field !== 'string' || field.trim() === '') {
          issues.push({
            path: `${path}.fields.${name}`,
            message: 'Named mark fields must be non-empty strings.',
          });
        } else if (UNSAFE_FIELDS.has(field)) {
          issues.push({
            path: `${path}.fields.${name}`,
            message: `Unsafe field "${field}" is forbidden.`,
          });
        }
      }
    }
  }

  if (value.options !== undefined) {
    if (!isPlainObject(value.options)) {
      issues.push({ path: `${path}.options`, message: 'Mark options must be a JSON object.' });
    } else {
      validateSeriesStack(
        value.type,
        value.fields,
        value.options.stack,
        `${path}.options.stack`,
        issues,
      );
      if (value.type === 'indicator') {
        validateIndicatorCalculation(value.options, `${path}.options`, issues);
      }
    }
    if (isPlainObject(value.options) && CURVE_MARKS.has(value.type)) {
      if (
        value.options.curve !== undefined &&
        (typeof value.options.curve !== 'string' || !CURVE_NAMES.has(value.options.curve))
      ) {
        issues.push({
          path: `${path}.options.curve`,
          message: `Curve must be one of: ${curveNames.join(', ')}.`,
        });
      }
      if (
        value.options.missing !== undefined &&
        (typeof value.options.missing !== 'string' ||
          !MISSING_VALUE_POLICIES.has(value.options.missing))
      ) {
        issues.push({
          path: `${path}.options.missing`,
          message: 'Missing-value policy must be "gap", "zero", or "connect".',
        });
      }
      if (value.options.tension !== undefined) {
        validateFiniteNumber(
          value.options.tension,
          `${path}.options.tension`,
          'Cardinal curve tension',
          issues,
          { min: 0, max: 1 },
        );
      }
      if (value.options.curveSamples !== undefined) {
        validateFiniteNumber(
          value.options.curveSamples,
          `${path}.options.curveSamples`,
          'Curve samples',
          issues,
          { integer: true, min: 1, max: 64 },
        );
      }
    }
  }
}

function validateTooltipField(value: unknown, path: string, issues: SpecIssue[]): void {
  if (typeof value === 'string') {
    if (value.trim() === '') issues.push({ path, message: 'Tooltip field must not be empty.' });
    if (UNSAFE_FIELDS.has(value)) {
      issues.push({ path, message: `Unsafe field "${value}" is forbidden.` });
    }
    return;
  }
  if (!isPlainObject(value) || typeof value.field !== 'string' || value.field.trim() === '') {
    issues.push({ path, message: 'Tooltip field must be a field name or an object with a field.' });
    return;
  }
  for (const key of Object.keys(value)) {
    if (!TOOLTIP_FIELD_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, message: `Unknown tooltip field property "${key}".` });
    }
  }
  if (UNSAFE_FIELDS.has(value.field)) {
    issues.push({ path: `${path}.field`, message: `Unsafe field "${value.field}" is forbidden.` });
  }
  if (value.label !== undefined && typeof value.label !== 'string') {
    issues.push({ path: `${path}.label`, message: 'Tooltip label must be a string.' });
  }
  if (
    value.format !== undefined &&
    (typeof value.format !== 'string' || !TOOLTIP_FORMATS.has(value.format))
  ) {
    issues.push({ path: `${path}.format`, message: 'Tooltip format is not supported.' });
  }
  if (
    value.fractionDigits !== undefined &&
    (typeof value.fractionDigits !== 'number' ||
      !Number.isInteger(value.fractionDigits) ||
      value.fractionDigits < 0 ||
      value.fractionDigits > 6)
  ) {
    issues.push({
      path: `${path}.fractionDigits`,
      message: 'Tooltip fractionDigits must be an integer from 0 to 6.',
    });
  }
  if (
    value.dateStyle !== undefined &&
    (typeof value.dateStyle !== 'string' ||
      !['short', 'medium', 'long', 'full'].includes(value.dateStyle))
  ) {
    issues.push({
      path: `${path}.dateStyle`,
      message: 'Tooltip dateStyle must be "short", "medium", "long", or "full".',
    });
  }
  if (
    value.timeStyle !== undefined &&
    (typeof value.timeStyle !== 'string' ||
      !['short', 'medium', 'long', 'full'].includes(value.timeStyle))
  ) {
    issues.push({
      path: `${path}.timeStyle`,
      message: 'Tooltip timeStyle must be "short", "medium", "long", or "full".',
    });
  }
  if (
    value.timeZone !== undefined &&
    (typeof value.timeZone !== 'string' || value.timeZone.trim() === '')
  ) {
    issues.push({
      path: `${path}.timeZone`,
      message: 'Tooltip timeZone must be a non-empty string.',
    });
  }
  for (const key of ['prefix', 'suffix'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      issues.push({ path: `${path}.${key}`, message: `Tooltip ${key} must be a string.` });
    }
  }
}

function validateInteraction(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Interaction must be an object.' });
    return;
  }
  validateUnknownKeys(value, INTERACTION_KEYS, path, 'interaction', issues);
  for (const key of ['hover', 'click'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') {
      issues.push({ path: `${path}.${key}`, message: `Interaction ${key} must be a boolean.` });
    }
  }
  const tooltip = value.tooltip;
  if (tooltip !== undefined && typeof tooltip !== 'boolean') {
    if (!isPlainObject(tooltip)) {
      issues.push({ path: `${path}.tooltip`, message: 'Tooltip must be a boolean or an object.' });
    } else {
      for (const key of Object.keys(tooltip)) {
        if (!TOOLTIP_KEYS.has(key)) {
          issues.push({
            path: `${path}.tooltip.${key}`,
            message: `Unknown tooltip property "${key}".`,
          });
        }
      }
      if (
        tooltip.trigger !== undefined &&
        (typeof tooltip.trigger !== 'string' || !['mark', 'axis'].includes(tooltip.trigger))
      ) {
        issues.push({
          path: `${path}.tooltip.trigger`,
          message: 'Tooltip trigger must be "mark" or "axis".',
        });
      }
      if (tooltip.axis !== undefined && !isSafeAxisId(tooltip.axis)) {
        issues.push({
          path: `${path}.tooltip.axis`,
          message: 'Tooltip axis must use the safe named-axis grammar.',
        });
      }
      const trigger = tooltip.trigger ?? 'mark';
      if (trigger === 'axis' && tooltip.axis === undefined) {
        issues.push({
          path: `${path}.tooltip.axis`,
          message: 'Tooltip axis is required when trigger is "axis".',
        });
      }
      if (trigger !== 'axis' && tooltip.axis !== undefined) {
        issues.push({
          path: `${path}.tooltip.axis`,
          message: 'Tooltip axis is only valid when trigger is "axis".',
        });
      }
      if (tooltip.title !== undefined && typeof tooltip.title !== 'string') {
        issues.push({ path: `${path}.tooltip.title`, message: 'Tooltip title must be a string.' });
      }
      if (
        tooltip.titleField !== undefined &&
        (typeof tooltip.titleField !== 'string' ||
          tooltip.titleField.trim() === '' ||
          UNSAFE_FIELDS.has(tooltip.titleField))
      ) {
        issues.push({
          path: `${path}.tooltip.titleField`,
          message: 'Tooltip title field must be a safe non-empty field name.',
        });
      }
      if (tooltip.shared !== undefined && typeof tooltip.shared !== 'boolean') {
        issues.push({
          path: `${path}.tooltip.shared`,
          message: 'Shared tooltip must be a boolean.',
        });
      }
      if (
        tooltip.pointer !== undefined &&
        tooltip.pointer !== 'none' &&
        tooltip.pointer !== 'shadow'
      ) {
        issues.push({
          path: `${path}.tooltip.pointer`,
          message: 'Tooltip pointer must be "none" or "shadow".',
        });
      }
      if (trigger !== 'axis') {
        if (tooltip.shared === true)
          issues.push({
            path: `${path}.tooltip.shared`,
            message: 'Shared tooltips require an axis trigger.',
          });
        if (tooltip.pointer === 'shadow')
          issues.push({
            path: `${path}.tooltip.pointer`,
            message: 'Shadow pointers require an axis trigger.',
          });
      }
      if (tooltip.fields !== undefined) {
        if (
          !Array.isArray(tooltip.fields) ||
          tooltip.fields.length === 0 ||
          tooltip.fields.length > 12
        ) {
          issues.push({
            path: `${path}.tooltip.fields`,
            message: 'Tooltip fields must contain between 1 and 12 entries.',
          });
        } else {
          tooltip.fields.forEach((field, index) =>
            validateTooltipField(field, `${path}.tooltip.fields[${index}]`, issues),
          );
        }
      }
    }
  }

  validateNavigation(value.navigation, `${path}.navigation`, issues);
  validateDomainNavigation(value.domainNavigation, `${path}.domainNavigation`, issues);
  validatePlayback(value.playback, `${path}.playback`, issues);
  validateControls(value.controls, `${path}.controls`, issues);
  validateSelection(value.selection, `${path}.selection`, issues);

  const inspectionEnabled = value.navigation !== undefined && value.navigation !== false;
  const domainEnabled = value.domainNavigation !== undefined && value.domainNavigation !== false;
  if (inspectionEnabled && domainEnabled) {
    issues.push({
      path: `${path}.domainNavigation`,
      message:
        'Domain navigation cannot be combined with inspection navigation; choose one coordinate model.',
    });
  }
  const selection = isPlainObject(value.selection) ? value.selection : undefined;
  const kind = selection?.kind ?? 'point';
  const inspectionGesture =
    value.navigation === true ||
    (isPlainObject(value.navigation) &&
      (value.navigation.drag !== false || value.navigation.pinch !== false));
  const domainDrag =
    value.domainNavigation === true ||
    (isPlainObject(value.domainNavigation) && value.domainNavigation.drag !== false);
  if (kind !== 'point' && (inspectionGesture || domainDrag)) {
    issues.push({
      path: `${path}.selection.kind`,
      message:
        'Interval, rectangle, axis, and lasso pointer gestures require navigation.drag=false, navigation.pinch=false, and domainNavigation.drag=false to avoid an ambiguous gesture.',
    });
  }
}

function validateAccessibility(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Accessibility must be an object.' });
    return;
  }
  validateUnknownKeys(value, ACCESSIBILITY_KEYS, path, 'accessibility', issues);
  validateOptionalString(value.label, `${path}.label`, 'Accessibility label', issues, false);
  validateOptionalString(
    value.description,
    `${path}.description`,
    'Accessibility description',
    issues,
    false,
  );
  validateOptionalString(value.summary, `${path}.summary`, 'Accessibility summary', issues, false);
  validateOptionalBoolean(
    value.navigation,
    `${path}.navigation`,
    'Accessibility navigation',
    issues,
  );
  if (value.explorer !== undefined && typeof value.explorer !== 'boolean') {
    if (!isPlainObject(value.explorer)) {
      issues.push({
        path: `${path}.explorer`,
        message: 'Accessibility explorer must be a boolean or object.',
      });
    } else {
      validateUnknownKeys(
        value.explorer,
        ACCESSIBILITY_EXPLORER_KEYS,
        `${path}.explorer`,
        'accessibility explorer',
        issues,
      );
      if (value.explorer.windowRows !== undefined) {
        validateFiniteNumber(
          value.explorer.windowRows,
          `${path}.explorer.windowRows`,
          'Explorer windowRows',
          issues,
          { integer: true, min: 1, max: 5_000 },
        );
      }
      if (value.explorer.overscanRows !== undefined) {
        validateFiniteNumber(
          value.explorer.overscanRows,
          `${path}.explorer.overscanRows`,
          'Explorer overscanRows',
          issues,
          { integer: true, min: 0, max: 100 },
        );
      }
      if (value.explorer.rowHeight !== undefined) {
        validateFiniteNumber(
          value.explorer.rowHeight,
          `${path}.explorer.rowHeight`,
          'Explorer rowHeight',
          issues,
          { integer: true, min: 1, max: 256 },
        );
      }
    }
  }
  if (value.linkedFocus !== undefined) {
    if (!isPlainObject(value.linkedFocus)) {
      issues.push({
        path: `${path}.linkedFocus`,
        message: 'Accessibility linkedFocus must be an object.',
      });
    } else {
      validateUnknownKeys(
        value.linkedFocus,
        ACCESSIBILITY_LINKED_FOCUS_KEYS,
        `${path}.linkedFocus`,
        'accessibility linkedFocus',
        issues,
      );
      if (value.linkedFocus.group === undefined) {
        issues.push({
          path: `${path}.linkedFocus.group`,
          message: 'Linked focus group is required.',
        });
      } else {
        validateOptionalString(
          value.linkedFocus.group,
          `${path}.linkedFocus.group`,
          'Linked focus group',
          issues,
          false,
        );
        if (
          typeof value.linkedFocus.group === 'string' &&
          !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(value.linkedFocus.group)
        ) {
          issues.push({
            path: `${path}.linkedFocus.group`,
            message: 'Linked focus group must contain 1 to 96 portable identity characters.',
          });
        }
      }
      if (value.linkedFocus.key === undefined) {
        issues.push({
          path: `${path}.linkedFocus.key`,
          message: 'Linked focus key is required.',
        });
      } else {
        validateOptionalString(
          value.linkedFocus.key,
          `${path}.linkedFocus.key`,
          'Linked focus key',
          issues,
          false,
        );
        if (
          typeof value.linkedFocus.key === 'string' &&
          (value.linkedFocus.key.length > 128 || UNSAFE_FIELDS.has(value.linkedFocus.key))
        ) {
          issues.push({
            path: `${path}.linkedFocus.key`,
            message: 'Linked focus key must be safe and no longer than 128 characters.',
          });
        }
      }
    }
  }
  if (
    value.table !== undefined &&
    typeof value.table !== 'boolean' &&
    (typeof value.table !== 'string' || !ACCESSIBILITY_TABLE_MODES.has(value.table))
  ) {
    issues.push({
      path: `${path}.table`,
      message: 'Accessibility table must be a boolean, "hidden", or "visible".',
    });
  }
  if (value.maxRows !== undefined) {
    validateFiniteNumber(value.maxRows, `${path}.maxRows`, 'Accessibility maxRows', issues, {
      integer: true,
      min: 1,
      max: 5_000,
    });
  }
  if (value.live !== undefined && typeof value.live !== 'boolean') {
    if (!isPlainObject(value.live)) {
      issues.push({
        path: `${path}.live`,
        message: 'Accessibility live must be a boolean or object.',
      });
    } else {
      validateUnknownKeys(
        value.live,
        ACCESSIBILITY_LIVE_KEYS,
        `${path}.live`,
        'accessibility live',
        issues,
      );
      validateOptionalBoolean(
        value.live.enabled,
        `${path}.live.enabled`,
        'Live announcements',
        issues,
      );
      if (value.live.throttleMs !== undefined) {
        validateFiniteNumber(
          value.live.throttleMs,
          `${path}.live.throttleMs`,
          'Live announcement throttle',
          issues,
          { integer: true, min: 0, max: 10_000 },
        );
      }
    }
  }
}

function validateHighlightStyle(value: Record<string, unknown>, path: string, issues: SpecIssue[]) {
  for (const key of ['fill', 'stroke'] as const) {
    validateOptionalString(value[key], `${path}.${key}`, `Highlight ${key}`, issues, false);
  }
  if (value.opacity !== undefined)
    validateFiniteNumber(value.opacity, `${path}.opacity`, 'Highlight opacity', issues, {
      min: 0,
      max: 1,
    });
  if (value.lineWidth !== undefined)
    validateFiniteNumber(value.lineWidth, `${path}.lineWidth`, 'Highlight lineWidth', issues, {
      min: 0,
      max: 64,
    });
  if (value.padding !== undefined)
    validateFiniteNumber(value.padding, `${path}.padding`, 'Highlight padding', issues, {
      min: 0,
      max: 256,
    });
  if (value.radius !== undefined)
    validateFiniteNumber(value.radius, `${path}.radius`, 'Highlight radius', issues, {
      min: 0,
      max: 256,
    });
  if (value.dash !== undefined) {
    if (!Array.isArray(value.dash) || value.dash.length > 16) {
      issues.push({
        path: `${path}.dash`,
        message: 'Highlight dash must contain at most 16 values.',
      });
    } else {
      value.dash.forEach((entry, index) =>
        validateFiniteNumber(entry, `${path}.dash[${index}]`, 'Highlight dash value', issues, {
          min: 0,
          max: 256,
        }),
      );
    }
  }
}

function validateSelection(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Selection must be a boolean or an object.' });
    return;
  }
  validateUnknownKeys(value, SELECTION_KEYS, path, 'selection', issues);
  if (
    value.kind !== undefined &&
    (typeof value.kind !== 'string' || !SELECTION_KINDS.has(value.kind))
  ) {
    issues.push({
      path: `${path}.kind`,
      message: 'Selection kind must be "point", "interval", "rectangle", "axis", or "lasso".',
    });
  }
  if (
    value.combine !== undefined &&
    (typeof value.combine !== 'string' || !SELECTION_COMBINE.has(value.combine))
  ) {
    issues.push({
      path: `${path}.combine`,
      message: 'Selection combine must be "union" or "intersection".',
    });
  }
  const kind =
    typeof value.kind === 'string' && SELECTION_KINDS.has(value.kind) ? value.kind : 'point';
  if (
    value.mode !== undefined &&
    (typeof value.mode !== 'string' || !SELECTION_MODES.has(value.mode))
  ) {
    issues.push({
      path: `${path}.mode`,
      message: 'Selection mode must be "single" or "multiple".',
    });
  }
  validateOptionalBoolean(value.toggle, `${path}.toggle`, 'Selection toggle', issues);
  validateOptionalString(value.key, `${path}.key`, 'Selection key', issues, false);
  if (typeof value.key === 'string' && UNSAFE_FIELDS.has(value.key)) {
    issues.push({ path: `${path}.key`, message: `Unsafe field "${value.key}" is forbidden.` });
  }
  validateOptionalBoolean(
    value.clearOnBackground,
    `${path}.clearOnBackground`,
    'Selection clearOnBackground',
    issues,
  );
  validateOptionalBoolean(
    value.clearOnEscape,
    `${path}.clearOnEscape`,
    'Selection clearOnEscape',
    issues,
  );
  validateOptionalString(
    value.ariaLabel,
    `${path}.ariaLabel`,
    'Selection ariaLabel',
    issues,
    false,
  );
  if (value.axis !== undefined && !isSafeAxisId(value.axis)) {
    issues.push({
      path: `${path}.axis`,
      message: 'Selection axis must use the safe named-axis grammar.',
    });
  }
  if (kind === 'axis' && value.axis === undefined) {
    issues.push({ path: `${path}.axis`, message: 'Axis selection requires an explicit axis.' });
  }
  if (kind !== 'axis' && value.axis !== undefined) {
    issues.push({ path: `${path}.axis`, message: 'Selection axis is only valid for kind "axis".' });
  }
  if (value.xAxis !== undefined && !isSafeAxisId(value.xAxis)) {
    issues.push({
      path: `${path}.xAxis`,
      message: 'Selection xAxis must use the safe named-axis grammar.',
    });
  }
  if (value.yAxis !== undefined && !isSafeAxisId(value.yAxis)) {
    issues.push({
      path: `${path}.yAxis`,
      message: 'Selection yAxis must use the safe named-axis grammar.',
    });
  }
  if (kind === 'axis' && (value.xAxis !== undefined || value.yAxis !== undefined)) {
    issues.push({
      path,
      message: 'Axis selection uses axis; xAxis and yAxis are not accepted for this kind.',
    });
  }
  if (kind !== 'point' && (value.toggle !== undefined || value.key !== undefined)) {
    issues.push({
      path,
      message: 'Selection toggle and key are supported only by point/datum selection.',
    });
  }
  if (value.maxSelections !== undefined)
    validateFiniteNumber(
      value.maxSelections,
      `${path}.maxSelections`,
      'Selection maxSelections',
      issues,
      { integer: true, min: 1, max: 64 },
    );
  if (value.maxLassoPoints !== undefined)
    validateFiniteNumber(
      value.maxLassoPoints,
      `${path}.maxLassoPoints`,
      'Selection maxLassoPoints',
      issues,
      { integer: true, min: 3, max: 512 },
    );
  if (kind !== 'lasso' && value.maxLassoPoints !== undefined) {
    issues.push({
      path: `${path}.maxLassoPoints`,
      message: 'Selection maxLassoPoints is only valid for kind "lasso".',
    });
  }
  if (value.minPixelSpan !== undefined)
    validateFiniteNumber(
      value.minPixelSpan,
      `${path}.minPixelSpan`,
      'Selection minPixelSpan',
      issues,
      { min: 0, max: 64 },
    );
  validateOptionalBoolean(value.keyboard, `${path}.keyboard`, 'Selection keyboard', issues);
  if (value.keyboardStep !== undefined)
    validateFiniteNumber(
      value.keyboardStep,
      `${path}.keyboardStep`,
      'Selection keyboardStep',
      issues,
      { min: 1, max: 64 },
    );
  validateOptionalBoolean(value.filter, `${path}.filter`, 'Selection filter', issues);
  validateOptionalBoolean(value.linked, `${path}.linked`, 'Selection linked', issues);
  if (kind === 'point' && value.filter === true && value.key === undefined) {
    issues.push({
      path: `${path}.key`,
      message: 'Selection-driven point filtering requires a stable selection key.',
    });
  }
  if (kind === 'point' && value.linked === true && value.key === undefined) {
    issues.push({
      path: `${path}.key`,
      message: 'Linked point selection requires a stable selection key.',
    });
  }
  if (value.highlight !== undefined) {
    if (!isPlainObject(value.highlight)) {
      issues.push({ path: `${path}.highlight`, message: 'Selection highlight must be an object.' });
    } else {
      validateUnknownKeys(
        value.highlight,
        new Set(['fill', 'stroke', 'opacity', 'lineWidth', 'dash', 'padding', 'radius']),
        `${path}.highlight`,
        'selection highlight',
        issues,
      );
      validateHighlightStyle(value.highlight, `${path}.highlight`, issues);
    }
  }
}

function validateNavigation(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Navigation must be a boolean or an object.' });
    return;
  }
  validateUnknownKeys(value, NAVIGATION_KEYS, path, 'navigation', issues);
  if (value.minZoom !== undefined)
    validateFiniteNumber(value.minZoom, `${path}.minZoom`, 'Navigation minZoom', issues, {
      min: 1,
      max: 6,
    });
  if (value.maxZoom !== undefined)
    validateFiniteNumber(value.maxZoom, `${path}.maxZoom`, 'Navigation maxZoom', issues, {
      min: 1,
      max: 6,
    });
  if (
    typeof value.minZoom === 'number' &&
    typeof value.maxZoom === 'number' &&
    value.minZoom > value.maxZoom
  ) {
    issues.push({ path: `${path}.maxZoom`, message: 'Navigation maxZoom must be >= minZoom.' });
  }
  if (
    value.wheel !== undefined &&
    (typeof value.wheel !== 'string' || !NAVIGATION_WHEEL_MODES.has(value.wheel))
  ) {
    issues.push({
      path: `${path}.wheel`,
      message: 'Navigation wheel must be "off", "modifier", or "always".',
    });
  }
  validateOptionalBoolean(value.drag, `${path}.drag`, 'Navigation drag', issues);
  validateOptionalBoolean(value.pinch, `${path}.pinch`, 'Navigation pinch', issues);
  validateOptionalBoolean(value.keyboard, `${path}.keyboard`, 'Navigation keyboard', issues);
}

function validateDomainNavigation(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Domain navigation must be a boolean or an object.' });
    return;
  }
  validateUnknownKeys(value, DOMAIN_NAVIGATION_KEYS, path, 'domain navigation', issues);
  if (value.axes !== undefined) {
    if (!Array.isArray(value.axes) || value.axes.length === 0 || value.axes.length > 64) {
      issues.push({
        path: `${path}.axes`,
        message: 'Domain navigation axes must contain 1 to 64 axis IDs.',
      });
    } else {
      const axes = value.axes.filter((axis): axis is string => typeof axis === 'string');
      value.axes.forEach((axis, index) => {
        if (!isSafeAxisId(axis)) {
          issues.push({
            path: `${path}.axes[${index}]`,
            message: 'Domain navigation axis must use the safe named-axis grammar.',
          });
        }
      });
      if (new Set(axes).size !== axes.length) {
        issues.push({ path: `${path}.axes`, message: 'Domain navigation axes must be unique.' });
      }
    }
  }
  if (value.maxZoom !== undefined)
    validateFiniteNumber(value.maxZoom, `${path}.maxZoom`, 'Domain navigation maxZoom', issues, {
      min: 1,
      max: 64,
    });
  if (
    value.wheel !== undefined &&
    (typeof value.wheel !== 'string' || !NAVIGATION_WHEEL_MODES.has(value.wheel))
  ) {
    issues.push({
      path: `${path}.wheel`,
      message: 'Domain navigation wheel must be "off", "modifier", or "always".',
    });
  }
  validateOptionalBoolean(value.drag, `${path}.drag`, 'Domain navigation drag', issues);
  validateOptionalBoolean(value.keyboard, `${path}.keyboard`, 'Domain navigation keyboard', issues);
}

function validatePlayback(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined || value === false) return;
  if (value === true) {
    issues.push({ path: `${path}.field`, message: 'Playback field is required.' });
    return;
  }
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Playback must be false or an object.' });
    return;
  }
  validateUnknownKeys(value, PLAYBACK_KEYS, path, 'playback', issues);
  validateOptionalString(value.field, `${path}.field`, 'Playback field', issues, false);
  if (value.field === undefined) {
    issues.push({ path: `${path}.field`, message: 'Playback field is required.' });
  } else if (typeof value.field === 'string' && UNSAFE_FIELDS.has(value.field)) {
    issues.push({ path: `${path}.field`, message: `Unsafe field "${value.field}" is forbidden.` });
  }
  validateOptionalString(value.key, `${path}.key`, 'Playback key', issues, false);
  if (typeof value.key === 'string' && UNSAFE_FIELDS.has(value.key)) {
    issues.push({ path: `${path}.key`, message: `Unsafe field "${value.key}" is forbidden.` });
  }
  validateOptionalString(value.layerId, `${path}.layerId`, 'Playback layerId', issues, false);
  if (
    value.mode !== undefined &&
    (typeof value.mode !== 'string' || !PLAYBACK_MODES.has(value.mode))
  ) {
    issues.push({ path: `${path}.mode`, message: 'Playback mode is not supported.' });
  }
  if (value.interval !== undefined)
    validateFiniteNumber(value.interval, `${path}.interval`, 'Playback interval', issues, {
      min: 100,
      max: 60_000,
    });
  if (value.rate !== undefined)
    validateFiniteNumber(value.rate, `${path}.rate`, 'Playback rate', issues, {
      min: 0.1,
      max: 16,
    });
  if (value.windowSize !== undefined)
    validateFiniteNumber(value.windowSize, `${path}.windowSize`, 'Playback windowSize', issues, {
      min: 1,
      max: 10_000,
      integer: true,
    });
  validateOptionalBoolean(value.loop, `${path}.loop`, 'Playback loop', issues);
  if (
    value.direction !== undefined &&
    (typeof value.direction !== 'string' || !PLAYBACK_DIRECTIONS.has(value.direction))
  ) {
    issues.push({
      path: `${path}.direction`,
      message: 'Playback direction must be "forward" or "reverse".',
    });
  }
  const namedFrameNames = new Set<string>();
  if (value.namedFrames !== undefined) {
    if (!Array.isArray(value.namedFrames) || value.namedFrames.length > 10_000) {
      issues.push({
        path: `${path}.namedFrames`,
        message: 'Playback namedFrames must be an array with at most 10000 entries.',
      });
    } else {
      value.namedFrames.forEach((frame, index) => {
        const framePath = `${path}.namedFrames[${index}]`;
        if (!isPlainObject(frame)) {
          issues.push({ path: framePath, message: 'Playback named frame must be an object.' });
          return;
        }
        validateUnknownKeys(
          frame,
          PLAYBACK_NAMED_FRAME_KEYS,
          framePath,
          'playback named frame',
          issues,
        );
        validateOptionalString(
          frame.name,
          `${framePath}.name`,
          'Playback frame name',
          issues,
          false,
        );
        if (frame.name === undefined) {
          issues.push({ path: `${framePath}.name`, message: 'Playback frame name is required.' });
        } else if (typeof frame.name === 'string') {
          if (namedFrameNames.has(frame.name)) {
            issues.push({
              path: `${framePath}.name`,
              message: 'Playback frame names must be unique.',
            });
          }
          namedFrameNames.add(frame.name);
        }
        if (frame.value === undefined) {
          issues.push({ path: `${framePath}.value`, message: 'Playback frame value is required.' });
        } else if (
          typeof frame.value !== 'string' &&
          typeof frame.value !== 'boolean' &&
          (typeof frame.value !== 'number' || !Number.isFinite(frame.value))
        ) {
          issues.push({
            path: `${framePath}.value`,
            message: 'Playback frame value must be a finite number, string, or boolean.',
          });
        }
      });
    }
  }
  if (value.range !== undefined) {
    if (!isPlainObject(value.range)) {
      issues.push({ path: `${path}.range`, message: 'Playback range must be an object.' });
    } else {
      validateUnknownKeys(
        value.range,
        PLAYBACK_RANGE_KEYS,
        `${path}.range`,
        'playback range',
        issues,
      );
      for (const bound of ['start', 'end'] as const) {
        const reference = value.range[bound];
        if (reference === undefined) continue;
        if (typeof reference === 'number') {
          validateFiniteNumber(
            reference,
            `${path}.range.${bound}`,
            `Playback range ${bound}`,
            issues,
            { min: 0, integer: true },
          );
        } else if (typeof reference !== 'string' || reference.length === 0) {
          issues.push({
            path: `${path}.range.${bound}`,
            message: 'Playback range bound must be a zero-based index or non-empty frame name.',
          });
        } else if (!namedFrameNames.has(reference)) {
          issues.push({
            path: `${path}.range.${bound}`,
            message: `Playback range references undeclared named frame "${reference}".`,
          });
        }
      }
      if (
        typeof value.range.start === 'number' &&
        Number.isInteger(value.range.start) &&
        typeof value.range.end === 'number' &&
        Number.isInteger(value.range.end) &&
        value.range.start > value.range.end
      ) {
        issues.push({
          path: `${path}.range`,
          message: 'Playback range start must not be greater than its end.',
        });
      }
    }
  }
  validateOptionalBoolean(value.autoplay, `${path}.autoplay`, 'Playback autoplay', issues);
  if (value.transition !== undefined && value.transition !== false) {
    if (!isPlainObject(value.transition)) {
      issues.push({
        path: `${path}.transition`,
        message: 'Playback transition must be false or an object.',
      });
    } else {
      validateUnknownKeys(
        value.transition,
        PLAYBACK_TRANSITION_KEYS,
        `${path}.transition`,
        'playback transition',
        issues,
      );
      if (value.transition.duration !== undefined) {
        validateFiniteNumber(
          value.transition.duration,
          `${path}.transition.duration`,
          'Playback transition duration',
          issues,
          { min: 50, max: 60_000 },
        );
      }
      if (
        value.transition.easing !== undefined &&
        (typeof value.transition.easing !== 'string' ||
          !PLAYBACK_TRANSITION_EASINGS.has(value.transition.easing))
      ) {
        issues.push({
          path: `${path}.transition.easing`,
          message: 'Playback transition easing must be "linear" or "ease-in-out".',
        });
      }
    }
  }
  validateOptionalBoolean(value.filter, `${path}.filter`, 'Playback filter', issues);
}

function validateControls(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Controls must be a boolean or an object.' });
    return;
  }
  validateUnknownKeys(value, CONTROLS_KEYS, path, 'controls', issues);
  for (const key of ['zoom', 'reset', 'fullscreen', 'export', 'annotations', 'playback'] as const) {
    validateOptionalBoolean(value[key], `${path}.${key}`, `Controls ${key}`, issues);
  }
  if (value.labels !== undefined) {
    if (!isPlainObject(value.labels)) {
      issues.push({ path: `${path}.labels`, message: 'Control labels must be an object.' });
    } else {
      validateUnknownKeys(
        value.labels,
        CONTROL_LABEL_KEYS,
        `${path}.labels`,
        'control label',
        issues,
      );
      for (const [key, label] of Object.entries(value.labels)) {
        validateOptionalString(label, `${path}.labels.${key}`, 'Control label', issues, false);
      }
    }
  }
}

function validateLayer(
  layer: unknown,
  path: string,
  hasParentData: boolean,
  issues: SpecIssue[],
): void {
  if (!isPlainObject(layer)) {
    issues.push({ path, message: 'Layer must be an object.' });
    return;
  }

  validateUnknownKeys(layer, LAYER_KEYS, path, 'layer', issues);

  validateOptionalString(layer.name, `${path}.name`, 'Layer name', issues, false);
  validateTransforms(layer.transform, `${path}.transform`, issues);
  if (layer.source !== undefined) {
    validateOptionalString(layer.source, `${path}.source`, 'Named data source', issues, false);
    issues.push({
      path: `${path}.source`,
      message: 'Named layer sources require an enclosing dataflow.',
    });
  }

  validateMark(layer.mark as MarkInput, `${path}.mark`, issues);
  validateLayerClip(layer.clip, `${path}.clip`, issues);
  if (layer.encoding !== undefined && (layer.x !== undefined || layer.y !== undefined)) {
    issues.push({
      path,
      message: 'Use either the legacy x/y facade or the canonical encoding map, not both.',
    });
  }
  if (layer.encoding !== undefined) {
    validateEncodingMap(layer.encoding, `${path}.encoding`, issues, layer.mark);
    validateMarkEncodingCompatibility(layer.mark, layer.encoding, `${path}.encoding`, issues);
  } else {
    validateEncoding(layer.x as EncodingInput, `${path}.x`, 'x', issues);
    validateEncoding(layer.y as EncodingInput, `${path}.y`, 'y', issues);
  }

  if (!hasParentData && layer.data === undefined && layer.source === undefined) {
    issues.push({
      path: `${path}.data`,
      message: 'Layer data is required when chart-level data is absent.',
    });
  }
}

function validateLegend(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Legend must be a boolean or an object.' });
    return;
  }
  validateUnknownKeys(value, LEGEND_KEYS, path, 'legend', issues);
  if (value.align !== undefined && !['start', 'center', 'end'].includes(value.align as string)) {
    issues.push({
      path: `${path}.align`,
      message: 'Legend alignment must be start, center, or end.',
    });
  }
  validateOptionalBoolean(value.visible, `${path}.visible`, 'Legend visibility', issues);
  validateOptionalBoolean(value.interactive, `${path}.interactive`, 'Legend interactive', issues);
  if (
    value.mode !== undefined &&
    (typeof value.mode !== 'string' || !LEGEND_MODES.has(value.mode))
  ) {
    issues.push({ path: `${path}.mode`, message: 'Legend mode is not supported.' });
  }
  if (
    value.position !== undefined &&
    (typeof value.position !== 'string' || !LEGEND_POSITIONS.has(value.position))
  ) {
    issues.push({ path: `${path}.position`, message: 'Legend position is not supported.' });
  }
  if (
    value.orientation !== undefined &&
    (typeof value.orientation !== 'string' || !LEGEND_ORIENTATIONS.has(value.orientation))
  ) {
    issues.push({ path: `${path}.orientation`, message: 'Legend orientation is not supported.' });
  }
  for (const key of ['title', 'field', 'layerId'] as const) {
    validateOptionalString(value[key], `${path}.${key}`, `Legend ${key}`, issues, false);
  }
  if (typeof value.field === 'string' && UNSAFE_FIELDS.has(value.field)) {
    issues.push({ path: `${path}.field`, message: `Unsafe field "${value.field}" is forbidden.` });
  }
  if (value.maxItems !== undefined)
    validateFiniteNumber(value.maxItems, `${path}.maxItems`, 'Legend maxItems', issues, {
      integer: true,
      min: 1,
      max: 200,
    });
  if (value.items !== undefined) {
    if (!Array.isArray(value.items) || value.items.length === 0 || value.items.length > 200) {
      issues.push({
        path: `${path}.items`,
        message: 'Legend items must contain between 1 and 200 entries.',
      });
    } else {
      value.items.forEach((item, index) => {
        const itemPath = `${path}.items[${index}]`;
        if (!isPlainObject(item)) {
          issues.push({ path: itemPath, message: 'Legend item must be an object.' });
          return;
        }
        validateUnknownKeys(item, LEGEND_ITEM_KEYS, itemPath, 'legend item', issues);
        validateOptionalString(item.id, `${itemPath}.id`, 'Legend item id', issues, false);
        validateOptionalString(item.label, `${itemPath}.label`, 'Legend item label', issues, false);
        if (item.label === undefined) {
          issues.push({ path: `${itemPath}.label`, message: 'Legend item label is required.' });
        }
        validateOptionalString(item.color, `${itemPath}.color`, 'Legend item color', issues, false);
        validateOptionalString(
          item.layerId,
          `${itemPath}.layerId`,
          'Legend item layerId',
          issues,
          false,
        );
        if (
          item.symbol !== undefined &&
          (typeof item.symbol !== 'string' || !LEGEND_ITEM_SYMBOLS.has(item.symbol))
        ) {
          issues.push({
            path: `${itemPath}.symbol`,
            message: 'Legend item symbol is not supported.',
          });
        }
        if (
          item.value !== undefined &&
          item.value !== null &&
          (!['string', 'number', 'boolean'].includes(typeof item.value) ||
            (typeof item.value === 'number' && !Number.isFinite(item.value)))
        ) {
          issues.push({
            path: `${itemPath}.value`,
            message: 'Legend item value must be JSON scalar.',
          });
        }
      });
    }
  }
  if (value.labels !== undefined) {
    if (!isPlainObject(value.labels)) {
      issues.push({ path: `${path}.labels`, message: 'Legend labels must be an object.' });
    } else {
      validateUnknownKeys(
        value.labels,
        LEGEND_LABEL_KEYS,
        `${path}.labels`,
        'legend label',
        issues,
      );
      for (const [key, label] of Object.entries(value.labels)) {
        validateOptionalString(label, `${path}.labels.${key}`, 'Legend label', issues, false);
      }
    }
  }
}

function validateAxisRange(
  value: unknown,
  path: string,
  channel: 'x' | 'y',
  issues: SpecIssue[],
): void {
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axis range target must be an object.' });
    return;
  }
  validateUnknownKeys(value, AXIS_RANGE_KEYS, path, 'axis range target', issues);
  if (
    value.from === undefined ||
    !['number', 'string'].includes(typeof value.from) ||
    (typeof value.from === 'number' && !Number.isFinite(value.from))
  ) {
    issues.push({ path: `${path}.from`, message: 'Axis range from must be a number or string.' });
  }
  if (
    value.to === undefined ||
    !['number', 'string'].includes(typeof value.to) ||
    (typeof value.to === 'number' && !Number.isFinite(value.to))
  ) {
    issues.push({ path: `${path}.to`, message: 'Axis range to must be a number or string.' });
  }
  if (value.axis !== undefined && !isSafeAxisId(value.axis)) {
    issues.push({ path: `${path}.axis`, message: `Range ${channel} axis is not compatible.` });
  }
}

function validateDecorationTarget(value: unknown, path: string, issues: SpecIssue[]): void {
  if (!isPlainObject(value) || typeof value.type !== 'string') {
    issues.push({ path, message: 'Decoration target must be an object with a type.' });
    return;
  }
  validateUnknownKeys(value, DECORATION_TARGET_KEYS, path, 'decoration target', issues);
  if (value.type === 'datum') {
    validateUnknownKeys(
      value,
      new Set(['type', 'layerId', 'rowIndex', 'field', 'value', 'values']),
      path,
      'datum target',
      issues,
    );
    validateOptionalString(value.layerId, `${path}.layerId`, 'Datum target layerId', issues, false);
    if (value.rowIndex !== undefined) {
      const rows = Array.isArray(value.rowIndex) ? value.rowIndex : [value.rowIndex];
      if (rows.length === 0 || rows.length > 1000) {
        issues.push({
          path: `${path}.rowIndex`,
          message: 'Datum rowIndex must select 1..1000 rows.',
        });
      }
      rows.forEach((row, index) =>
        validateFiniteNumber(
          row,
          Array.isArray(value.rowIndex) ? `${path}.rowIndex[${index}]` : `${path}.rowIndex`,
          'Datum rowIndex',
          issues,
          { integer: true, min: 0 },
        ),
      );
      if (new Set(rows).size !== rows.length) {
        issues.push({ path: `${path}.rowIndex`, message: 'Datum rowIndex values must be unique.' });
      }
    }
    validateOptionalString(value.field, `${path}.field`, 'Datum target field', issues, false);
    if (typeof value.field === 'string' && UNSAFE_FIELDS.has(value.field)) {
      issues.push({
        path: `${path}.field`,
        message: `Unsafe field "${value.field}" is forbidden.`,
      });
    }
    const hasValue = Object.prototype.hasOwnProperty.call(value, 'value');
    const hasValues = Object.prototype.hasOwnProperty.call(value, 'values');
    if (hasValue) {
      const valid =
        value.value === null ||
        typeof value.value === 'string' ||
        typeof value.value === 'boolean' ||
        (typeof value.value === 'number' && Number.isFinite(value.value));
      if (!valid)
        issues.push({
          path: `${path}.value`,
          message: 'Datum target value must be a JSON scalar.',
        });
    }
    if (hasValues) {
      if (!Array.isArray(value.values) || value.values.length === 0 || value.values.length > 200) {
        issues.push({
          path: `${path}.values`,
          message: 'Datum target values must contain 1..200 JSON scalars.',
        });
      } else {
        value.values.forEach((entry, index) => {
          const valid =
            entry === null ||
            typeof entry === 'string' ||
            typeof entry === 'boolean' ||
            (typeof entry === 'number' && Number.isFinite(entry));
          if (!valid)
            issues.push({
              path: `${path}.values[${index}]`,
              message: 'Datum target values must be JSON scalars.',
            });
        });
        if (
          new Set(value.values.map((entry) => JSON.stringify(entry))).size !== value.values.length
        )
          issues.push({ path: `${path}.values`, message: 'Datum target values must be unique.' });
      }
    }
    if (value.field === undefined && (value.value !== undefined || value.values !== undefined)) {
      issues.push({ path: `${path}.field`, message: 'Datum target field is required for values.' });
    }
    if (value.field !== undefined && hasValue === hasValues) {
      issues.push({
        path,
        message: 'Datum target field matching requires exactly one of value or values.',
      });
    }
    if (value.rowIndex === undefined && value.field === undefined) {
      issues.push({ path, message: 'Datum target requires rowIndex or field matching.' });
    }
    return;
  }
  if (value.type === 'layer') {
    validateUnknownKeys(value, new Set(['type', 'layerId']), path, 'layer target', issues);
    validateOptionalString(value.layerId, `${path}.layerId`, 'Layer target layerId', issues, false);
    if (value.layerId === undefined)
      issues.push({ path: `${path}.layerId`, message: 'Layer target layerId is required.' });
    return;
  }
  if (value.type === 'range') {
    validateUnknownKeys(value, new Set(['type', 'x', 'y']), path, 'range target', issues);
    if (value.x === undefined && value.y === undefined) {
      issues.push({ path, message: 'Range target requires x or y.' });
    }
    if (value.x !== undefined) validateAxisRange(value.x, `${path}.x`, 'x', issues);
    if (value.y !== undefined) validateAxisRange(value.y, `${path}.y`, 'y', issues);
    return;
  }
  if (value.type === 'plot') {
    validateUnknownKeys(
      value,
      new Set(['type', 'x', 'y', 'width', 'height']),
      path,
      'plot target',
      issues,
    );
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      if ((key === 'x' || key === 'y') && value[key] === undefined) {
        issues.push({ path: `${path}.${key}`, message: `Plot target ${key} is required.` });
      } else if (value[key] !== undefined) {
        validateFiniteNumber(value[key], `${path}.${key}`, `Plot target ${key}`, issues, {
          min: 0,
          max: 1,
        });
      }
    }
    return;
  }
  issues.push({ path: `${path}.type`, message: 'Decoration target type is not supported.' });
}

function validateHighlights(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 256) {
    issues.push({ path, message: 'Highlights must be an array of at most 256 entries.' });
    return;
  }
  value.forEach((highlight, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isPlainObject(highlight)) {
      issues.push({ path: itemPath, message: 'Highlight must be an object.' });
      return;
    }
    validateUnknownKeys(highlight, HIGHLIGHT_KEYS, itemPath, 'highlight', issues);
    validateOptionalString(highlight.id, `${itemPath}.id`, 'Highlight id', issues, false);
    validateDecorationTarget(highlight.target, `${itemPath}.target`, issues);
    validateHighlightStyle(highlight, itemPath, issues);
  });
}

function validateAnnotations(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length > 256) {
    issues.push({ path, message: 'Annotations must be an array of at most 256 entries.' });
    return;
  }
  value.forEach((annotation, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isPlainObject(annotation)) {
      issues.push({ path: itemPath, message: 'Annotation must be an object.' });
      return;
    }
    validateUnknownKeys(annotation, ANNOTATION_KEYS, itemPath, 'annotation', issues);
    validateOptionalString(annotation.id, `${itemPath}.id`, 'Annotation id', issues, false);
    if (
      annotation.primitive !== undefined &&
      (typeof annotation.primitive !== 'string' || !ANNOTATION_PRIMITIVES.has(annotation.primitive))
    ) {
      issues.push({
        path: `${itemPath}.primitive`,
        message: 'Annotation primitive is not supported.',
      });
    }
    validateOptionalString(annotation.text, `${itemPath}.text`, 'Annotation text', issues, false);
    if (annotation.text === undefined)
      issues.push({ path: `${itemPath}.text`, message: 'Annotation text is required.' });
    validateOptionalString(annotation.detail, `${itemPath}.detail`, 'Annotation detail', issues);
    validateDecorationTarget(annotation.target, `${itemPath}.target`, issues);
    if (isPlainObject(annotation.target) && typeof annotation.target.type === 'string') {
      const targetType = annotation.target.type;
      const primitive = annotation.primitive ?? 'callout';
      const supported =
        primitive === 'point'
          ? targetType === 'datum' || targetType === 'plot'
          : primitive === 'band'
            ? targetType === 'layer' || targetType === 'range' || targetType === 'plot'
            : targetType === 'datum' ||
              targetType === 'layer' ||
              targetType === 'range' ||
              targetType === 'plot';
      if (!supported) {
        issues.push({
          path: `${itemPath}.target`,
          message: `Annotation primitive "${String(primitive)}" does not support a "${targetType}" target.`,
        });
      }
    }
    if (
      annotation.placement !== undefined &&
      (typeof annotation.placement !== 'string' || !ANNOTATION_PLACEMENTS.has(annotation.placement))
    ) {
      issues.push({
        path: `${itemPath}.placement`,
        message: 'Annotation placement is not supported.',
      });
    }
    for (const key of ['offsetX', 'offsetY'] as const) {
      if (annotation[key] !== undefined)
        validateFiniteNumber(annotation[key], `${itemPath}.${key}`, `Annotation ${key}`, issues, {
          min: -10_000,
          max: 10_000,
        });
    }
    if (annotation.connector !== undefined && typeof annotation.connector !== 'boolean') {
      if (!isPlainObject(annotation.connector)) {
        issues.push({ path: `${itemPath}.connector`, message: 'Annotation connector is invalid.' });
      } else {
        validateUnknownKeys(
          annotation.connector,
          CONNECTOR_KEYS,
          `${itemPath}.connector`,
          'annotation connector',
          issues,
        );
        validateOptionalBoolean(
          annotation.connector.visible,
          `${itemPath}.connector.visible`,
          'Annotation connector visibility',
          issues,
        );
        validateOptionalString(
          annotation.connector.color,
          `${itemPath}.connector.color`,
          'Annotation connector color',
          issues,
          false,
        );
        validateHighlightStyle(
          {
            lineWidth: annotation.connector.width,
            dash: annotation.connector.dash,
          },
          `${itemPath}.connector`,
          issues,
        );
      }
    }
    if (annotation.style !== undefined) {
      if (!isPlainObject(annotation.style)) {
        issues.push({ path: `${itemPath}.style`, message: 'Annotation style must be an object.' });
      } else {
        validateUnknownKeys(
          annotation.style,
          ANNOTATION_STYLE_KEYS,
          `${itemPath}.style`,
          'annotation style',
          issues,
        );
        for (const key of ['background', 'border', 'color'] as const) {
          validateOptionalString(
            annotation.style[key],
            `${itemPath}.style.${key}`,
            `Annotation style ${key}`,
            issues,
            false,
          );
        }
        if (annotation.style.opacity !== undefined)
          validateFiniteNumber(
            annotation.style.opacity,
            `${itemPath}.style.opacity`,
            'Annotation style opacity',
            issues,
            { min: 0, max: 1 },
          );
        for (const key of ['fontSize', 'maxWidth', 'padding'] as const) {
          if (annotation.style[key] !== undefined)
            validateFiniteNumber(
              annotation.style[key],
              `${itemPath}.style.${key}`,
              `Annotation style ${key}`,
              issues,
              { min: 1, max: 2000 },
            );
        }
        if (
          annotation.style.align !== undefined &&
          (typeof annotation.style.align !== 'string' ||
            !ANNOTATION_TEXT_ALIGNS.has(annotation.style.align))
        ) {
          issues.push({
            path: `${itemPath}.style.align`,
            message: 'Annotation text alignment is not supported.',
          });
        }
      }
    }
  });
}

function validateMarkLabels(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined || typeof value === 'boolean') return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Mark labels must be a boolean or an object.' });
    return;
  }
  validateUnknownKeys(value, MARK_LABEL_KEYS, path, 'mark label', issues);
  validateOptionalBoolean(value.visible, `${path}.visible`, 'Mark label visibility', issues);
  for (const field of ['field', 'key'] as const) {
    validateOptionalString(value[field], `${path}.${field}`, `Mark label ${field}`, issues, false);
    if (typeof value[field] === 'string' && UNSAFE_FIELDS.has(value[field])) {
      issues.push({
        path: `${path}.${field}`,
        message: `Unsafe field "${value[field]}" is forbidden.`,
      });
    }
  }
  if (value.layerIds !== undefined) {
    if (!Array.isArray(value.layerIds) || value.layerIds.length > 64) {
      issues.push({
        path: `${path}.layerIds`,
        message: 'Mark label layerIds must contain at most 64 entries.',
      });
    } else {
      value.layerIds.forEach((layerId, index) =>
        validateOptionalString(
          layerId,
          `${path}.layerIds[${index}]`,
          'Mark label layerId',
          issues,
          false,
        ),
      );
      if (new Set(value.layerIds).size !== value.layerIds.length) {
        issues.push({ path: `${path}.layerIds`, message: 'Mark label layerIds must be unique.' });
      }
    }
  }
  if (
    value.placement !== undefined &&
    (typeof value.placement !== 'string' || !MARK_LABEL_PLACEMENTS.has(value.placement))
  ) {
    issues.push({ path: `${path}.placement`, message: 'Mark label placement is not supported.' });
  }
  if (
    value.collision !== undefined &&
    (typeof value.collision !== 'string' || !MARK_LABEL_COLLISIONS.has(value.collision))
  ) {
    issues.push({
      path: `${path}.collision`,
      message: 'Mark label collision policy is not supported.',
    });
  }
  if (value.offset !== undefined) {
    validateFiniteNumber(value.offset, `${path}.offset`, 'Mark label offset', issues, {
      min: 0,
      max: 256,
    });
  }
  if (value.maxLabels !== undefined) {
    validateFiniteNumber(value.maxLabels, `${path}.maxLabels`, 'Mark label limit', issues, {
      min: 1,
      max: 1000,
      integer: true,
    });
  }
  if (value.connector !== undefined && typeof value.connector !== 'boolean') {
    if (!isPlainObject(value.connector)) {
      issues.push({ path: `${path}.connector`, message: 'Mark label connector is invalid.' });
    } else {
      validateUnknownKeys(
        value.connector,
        CONNECTOR_KEYS,
        `${path}.connector`,
        'mark label connector',
        issues,
      );
      validateOptionalBoolean(
        value.connector.visible,
        `${path}.connector.visible`,
        'Mark label connector visibility',
        issues,
      );
      validateOptionalString(
        value.connector.color,
        `${path}.connector.color`,
        'Mark label connector color',
        issues,
        false,
      );
      validateHighlightStyle(
        { lineWidth: value.connector.width, dash: value.connector.dash },
        `${path}.connector`,
        issues,
      );
    }
  }
  if (value.positions !== undefined) {
    if (!Array.isArray(value.positions) || value.positions.length > 1000) {
      issues.push({
        path: `${path}.positions`,
        message: 'Mark label positions must be an array of at most 1000 entries.',
      });
    } else {
      const targets = new Set<string>();
      value.positions.forEach((position, index) => {
        const itemPath = `${path}.positions[${index}]`;
        if (!isPlainObject(position)) {
          issues.push({ path: itemPath, message: 'Mark label position must be an object.' });
          return;
        }
        validateUnknownKeys(
          position,
          MARK_LABEL_POSITION_KEYS,
          itemPath,
          'mark label position',
          issues,
        );
        validateDecorationTarget(position.target, `${itemPath}.target`, issues);
        if (isPlainObject(position.target) && position.target.type !== 'datum') {
          issues.push({
            path: `${itemPath}.target.type`,
            message: 'Mark label positions require datum targets.',
          });
        }
        for (const offset of ['offsetX', 'offsetY'] as const) {
          if (position[offset] !== undefined) {
            validateFiniteNumber(
              position[offset],
              `${itemPath}.${offset}`,
              `Mark label ${offset}`,
              issues,
              {
                min: -10_000,
                max: 10_000,
              },
            );
          }
        }
        validateOptionalBoolean(
          position.hidden,
          `${itemPath}.hidden`,
          'Mark label hidden state',
          issues,
        );
        if (isPlainObject(position.target)) {
          const key = JSON.stringify(position.target);
          if (targets.has(key)) {
            issues.push({
              path: `${itemPath}.target`,
              message: 'Mark label position targets must be unique.',
            });
          }
          targets.add(key);
        }
      });
    }
  }
  if (value.style !== undefined) {
    if (!isPlainObject(value.style)) {
      issues.push({ path: `${path}.style`, message: 'Mark label style must be an object.' });
    } else {
      validateUnknownKeys(
        value.style,
        MARK_LABEL_STYLE_KEYS,
        `${path}.style`,
        'mark label style',
        issues,
      );
      for (const key of ['color', 'background', 'border'] as const) {
        validateOptionalString(
          value.style[key],
          `${path}.style.${key}`,
          `Mark label style ${key}`,
          issues,
          false,
        );
      }
      if (value.style.opacity !== undefined) {
        validateFiniteNumber(
          value.style.opacity,
          `${path}.style.opacity`,
          'Mark label opacity',
          issues,
          { min: 0, max: 1 },
        );
      }
      for (const [key, minimum, maximum] of [
        ['fontSize', 1, 256],
        ['fontWeight', 1, 1000],
        ['maxWidth', 8, 2000],
        ['padding', 0, 256],
        ['radius', 0, 256],
      ] as const) {
        if (value.style[key] !== undefined) {
          validateFiniteNumber(
            value.style[key],
            `${path}.style.${key}`,
            `Mark label style ${key}`,
            issues,
            {
              min: minimum,
              max: maximum,
            },
          );
        }
      }
    }
  }
  if (value.authoring !== undefined && typeof value.authoring !== 'boolean') {
    if (!isPlainObject(value.authoring)) {
      issues.push({
        path: `${path}.authoring`,
        message: 'Mark label authoring must be a boolean or an object.',
      });
    } else {
      validateUnknownKeys(
        value.authoring,
        MARK_LABEL_AUTHORING_KEYS,
        `${path}.authoring`,
        'mark label authoring',
        issues,
      );
      for (const key of ['pointer', 'keyboard'] as const) {
        validateOptionalBoolean(
          value.authoring[key],
          `${path}.authoring.${key}`,
          `Mark label authoring ${key}`,
          issues,
        );
      }
      if (value.authoring.step !== undefined) {
        validateFiniteNumber(
          value.authoring.step,
          `${path}.authoring.step`,
          'Mark label keyboard step',
          issues,
          {
            min: 0.1,
            max: 256,
          },
        );
      }
      if (value.authoring.historyLimit !== undefined) {
        validateFiniteNumber(
          value.authoring.historyLimit,
          `${path}.authoring.historyLimit`,
          'Mark label history limit',
          issues,
          { min: 1, max: 500, integer: true },
        );
      }
      const snap = value.authoring.snap;
      if (snap !== undefined && snap !== false) {
        if (!isPlainObject(snap)) {
          issues.push({
            path: `${path}.authoring.snap`,
            message: 'Mark label snapping must be false or an object.',
          });
        } else {
          validateUnknownKeys(
            snap,
            MARK_LABEL_SNAP_KEYS,
            `${path}.authoring.snap`,
            'mark label snapping',
            issues,
          );
          if (snap.grid !== undefined && snap.grid !== false) {
            validateFiniteNumber(
              snap.grid,
              `${path}.authoring.snap.grid`,
              'Mark label snap grid',
              issues,
              {
                min: 1,
                max: 256,
              },
            );
          }
          for (const key of ['marks', 'plot'] as const) {
            validateOptionalBoolean(
              snap[key],
              `${path}.authoring.snap.${key}`,
              `Mark label snap ${key}`,
              issues,
            );
          }
          if (snap.distance !== undefined) {
            validateFiniteNumber(
              snap.distance,
              `${path}.authoring.snap.distance`,
              'Mark label snap distance',
              issues,
              {
                min: 0,
                max: 128,
              },
            );
          }
        }
      }
    }
  }
}

function validateLayerReferences(input: Record<string, unknown>, issues: SpecIssue[]): void {
  const sourceLayers = Array.isArray(input.layers)
    ? input.layers
    : input.mark !== undefined ||
        input.x !== undefined ||
        input.y !== undefined ||
        input.encoding !== undefined
      ? [input]
      : [];
  const layerIds = new Set<string>();
  sourceLayers.forEach((layer, index) => {
    if (!isPlainObject(layer)) return;
    const layerId = layer.id === undefined ? `layer-${index}` : layer.id;
    if (typeof layerId !== 'string' || layerId.trim() === '') return;
    if (layerIds.has(layerId)) {
      issues.push({
        path: Array.isArray(input.layers) ? `$.layers[${index}].id` : '$.id',
        message: `Layer id "${layerId}" must be unique.`,
      });
      return;
    }
    layerIds.add(layerId);
  });

  const check = (value: unknown, path: string): void => {
    if (!isPlainObject(value) || typeof value.layerId !== 'string') return;
    if (!layerIds.has(value.layerId)) {
      issues.push({
        path: `${path}.layerId`,
        message: `Layer id "${value.layerId}" does not exist.`,
      });
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
      if (!isPlainObject(entry)) return;
      const id =
        typeof entry.id === 'string' && entry.id.trim() !== ''
          ? entry.id
          : `${defaultPrefix}-${index}`;
      if (ids.has(id)) {
        issues.push({
          path: `${path}[${index}].id`,
          message: `${label} id "${id}" must be unique after defaults are resolved.`,
        });
        return;
      }
      ids.add(id);
    });
  };

  if (isPlainObject(input.legend)) {
    const legend = input.legend;
    check(legend, '$.legend');
    if (Array.isArray(legend.items)) {
      legend.items.forEach((item, index) => check(item, `$.legend.items[${index}]`));
    }
    checkUniqueIds(legend.items, '$.legend.items', 'Legend item', 'item');
    if (Array.isArray(legend.items)) {
      const semanticOwners = new Set<string>();
      legend.items.forEach((item, index) => {
        if (!isPlainObject(item) || typeof item.layerId !== 'string') return;
        const owner =
          legend.mode === 'categories' && Object.prototype.hasOwnProperty.call(item, 'value')
            ? JSON.stringify(['category', item.layerId, item.value])
            : legend.mode === 'layers'
              ? JSON.stringify(['layer', item.layerId])
              : null;
        if (owner === null) return;
        if (semanticOwners.has(owner)) {
          issues.push({
            path: `$.legend.items[${index}]`,
            message: 'Interactive legend items must not control the same semantic owner.',
          });
        } else semanticOwners.add(owner);
      });
    }
  }
  if (Array.isArray(input.highlights)) {
    input.highlights.forEach((highlight, index) => {
      if (isPlainObject(highlight)) check(highlight.target, `$.highlights[${index}].target`);
    });
  }
  if (Array.isArray(input.annotations)) {
    input.annotations.forEach((annotation, index) => {
      if (isPlainObject(annotation)) check(annotation.target, `$.annotations[${index}].target`);
    });
  }
  if (isPlainObject(input.markLabels)) {
    if (Array.isArray(input.markLabels.layerIds)) {
      input.markLabels.layerIds.forEach((layerId, index) =>
        check({ layerId }, `$.markLabels.layerIds[${index}]`),
      );
    }
    if (Array.isArray(input.markLabels.positions)) {
      input.markLabels.positions.forEach((position, index) => {
        if (isPlainObject(position))
          check(position.target, `$.markLabels.positions[${index}].target`);
      });
    }
  }
  checkUniqueIds(input.highlights, '$.highlights', 'Highlight', 'highlight');
  checkUniqueIds(input.annotations, '$.annotations', 'Annotation', 'annotation');
}

function validateStreaming(value: unknown, path: string, issues: SpecIssue[]): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Streaming must be an object.' });
    return;
  }
  validateUnknownKeys(value, STREAMING_KEYS, path, 'streaming', issues);
  if (value.key === undefined) {
    issues.push({ path: `${path}.key`, message: 'Streaming stable key is required.' });
  } else {
    validateOptionalString(value.key, `${path}.key`, 'Streaming stable key', issues, false);
  }
  if (typeof value.key === 'string' && UNSAFE_FIELDS.has(value.key)) {
    issues.push({ path: `${path}.key`, message: 'Streaming stable key is unsafe.' });
  }
  if (
    value.mode !== undefined &&
    !['append', 'upsert', 'replaceLast'].includes(String(value.mode))
  ) {
    issues.push({ path: `${path}.mode`, message: 'Streaming mode is not supported.' });
  }
  if (value.maxBatchRows !== undefined) {
    validateFiniteNumber(
      value.maxBatchRows,
      `${path}.maxBatchRows`,
      'Streaming batch limit',
      issues,
      {
        min: 1,
        max: 1_000_000,
        integer: true,
      },
    );
  }
  if (value.retention !== undefined) {
    if (!isPlainObject(value.retention)) {
      issues.push({ path: `${path}.retention`, message: 'Streaming retention must be an object.' });
    } else {
      validateUnknownKeys(
        value.retention,
        STREAMING_RETENTION_KEYS,
        `${path}.retention`,
        'streaming retention',
        issues,
      );
      if (value.retention.maxRows !== undefined) {
        validateFiniteNumber(
          value.retention.maxRows,
          `${path}.retention.maxRows`,
          'Streaming retention row limit',
          issues,
          { min: 1, max: 1_000_000, integer: true },
        );
      }
      if (value.retention.time !== undefined) {
        if (!isPlainObject(value.retention.time)) {
          issues.push({
            path: `${path}.retention.time`,
            message: 'Time retention must be an object.',
          });
        } else {
          validateUnknownKeys(
            value.retention.time,
            STREAMING_TIME_KEYS,
            `${path}.retention.time`,
            'time retention',
            issues,
          );
          if (value.retention.time.field === undefined) {
            issues.push({
              path: `${path}.retention.time.field`,
              message: 'Time retention field is required.',
            });
          } else {
            validateOptionalString(
              value.retention.time.field,
              `${path}.retention.time.field`,
              'Time retention field',
              issues,
              false,
            );
          }
          if (
            typeof value.retention.time.field === 'string' &&
            UNSAFE_FIELDS.has(value.retention.time.field)
          ) {
            issues.push({
              path: `${path}.retention.time.field`,
              message: 'Time retention field is unsafe.',
            });
          }
          validateFiniteNumber(
            value.retention.time.durationMs,
            `${path}.retention.time.durationMs`,
            'Time retention duration',
            issues,
            { min: 0 },
          );
          if (value.eventTime === undefined) {
            issues.push({
              path: `${path}.retention.time`,
              message: 'Time retention requires an eventTime watermark contract.',
            });
          }
        }
      }
    }
  }
  if (value.eventTime !== undefined) {
    if (!isPlainObject(value.eventTime)) {
      issues.push({ path: `${path}.eventTime`, message: 'Event time must be an object.' });
    } else {
      validateUnknownKeys(
        value.eventTime,
        STREAMING_EVENT_TIME_KEYS,
        `${path}.eventTime`,
        'event-time',
        issues,
      );
      if (value.eventTime.field === undefined) {
        issues.push({ path: `${path}.eventTime.field`, message: 'Event-time field is required.' });
      } else {
        validateOptionalString(
          value.eventTime.field,
          `${path}.eventTime.field`,
          'Event-time field',
          issues,
          false,
        );
      }
      if (typeof value.eventTime.field === 'string' && UNSAFE_FIELDS.has(value.eventTime.field)) {
        issues.push({ path: `${path}.eventTime.field`, message: 'Event-time field is unsafe.' });
      }
      if (value.eventTime.allowedLatenessMs !== undefined) {
        validateFiniteNumber(
          value.eventTime.allowedLatenessMs,
          `${path}.eventTime.allowedLatenessMs`,
          'Allowed lateness',
          issues,
          { min: 0 },
        );
      }
      if (
        value.eventTime.lateData !== undefined &&
        !['reject', 'drop', 'accept'].includes(String(value.eventTime.lateData))
      ) {
        issues.push({
          path: `${path}.eventTime.lateData`,
          message: 'Late-data policy is unsupported.',
        });
      }
    }
  }
  for (const [name, keys, maximumBatches] of [
    ['queue', STREAMING_QUEUE_KEYS, 1_024],
    ['replay', STREAMING_REPLAY_KEYS, 4_096],
  ] as const) {
    const object = value[name];
    if (object === undefined) continue;
    if (!isPlainObject(object)) {
      issues.push({ path: `${path}.${name}`, message: `Streaming ${name} must be an object.` });
      continue;
    }
    validateUnknownKeys(object, keys, `${path}.${name}`, `streaming ${name}`, issues);
    for (const field of ['maxBatches', 'maxRows'] as const) {
      if (object[field] !== undefined) {
        validateFiniteNumber(
          object[field],
          `${path}.${name}.${field}`,
          `Streaming ${name} ${field}`,
          issues,
          {
            min: 1,
            max: field === 'maxBatches' ? maximumBatches : 1_000_000,
            integer: true,
          },
        );
      }
    }
    if (
      name === 'queue' &&
      object.overflow !== undefined &&
      !STREAMING_OVERFLOW_POLICIES.has(String(object.overflow))
    ) {
      issues.push({
        path: `${path}.queue.overflow`,
        message: 'Streaming queue overflow policy is unsupported.',
      });
    }
  }
  if (value.runtime !== undefined) {
    if (!isPlainObject(value.runtime)) {
      issues.push({ path: `${path}.runtime`, message: 'Streaming runtime must be an object.' });
    } else {
      validateUnknownKeys(
        value.runtime,
        STREAMING_RUNTIME_KEYS,
        `${path}.runtime`,
        'streaming runtime',
        issues,
      );
      if (
        value.runtime.schedule !== undefined &&
        !['animation-frame', 'microtask'].includes(String(value.runtime.schedule))
      ) {
        issues.push({
          path: `${path}.runtime.schedule`,
          message: 'Streaming runtime schedule is unsupported.',
        });
      }
      if (value.runtime.maxBatchesPerFrame !== undefined) {
        validateFiniteNumber(
          value.runtime.maxBatchesPerFrame,
          `${path}.runtime.maxBatchesPerFrame`,
          'Streaming frame batch limit',
          issues,
          { integer: true, min: 1, max: 1_024 },
        );
      }
      if (
        value.runtime.overflow !== undefined &&
        !STREAMING_OVERFLOW_POLICIES.has(String(value.runtime.overflow))
      ) {
        issues.push({
          path: `${path}.runtime.overflow`,
          message: 'Streaming runtime overflow policy is unsupported.',
        });
      }
      validateOptionalBoolean(
        value.runtime.paused,
        `${path}.runtime.paused`,
        'Streaming paused state',
        issues,
      );
      validateOptionalBoolean(
        value.runtime.followLive,
        `${path}.runtime.followLive`,
        'Streaming follow-live state',
        issues,
      );
      if (value.runtime.history !== undefined) {
        if (!isPlainObject(value.runtime.history)) {
          issues.push({
            path: `${path}.runtime.history`,
            message: 'Streaming runtime history must be an object.',
          });
        } else {
          validateUnknownKeys(
            value.runtime.history,
            STREAMING_HISTORY_KEYS,
            `${path}.runtime.history`,
            'streaming history',
            issues,
          );
          if (value.runtime.history.maxBatches !== undefined) {
            validateFiniteNumber(
              value.runtime.history.maxBatches,
              `${path}.runtime.history.maxBatches`,
              'Streaming history batch limit',
              issues,
              { integer: true, min: 1, max: 4_096 },
            );
          }
          if (value.runtime.history.pageRows !== undefined) {
            validateFiniteNumber(
              value.runtime.history.pageRows,
              `${path}.runtime.history.pageRows`,
              'Streaming history page size',
              issues,
              { integer: true, min: 1, max: 100_000 },
            );
          }
        }
      }
    }
  }
  if (value.worker !== undefined) {
    if (!isPlainObject(value.worker)) {
      issues.push({ path: `${path}.worker`, message: 'Streaming Worker must be an object.' });
    } else {
      validateUnknownKeys(
        value.worker,
        STREAMING_WORKER_KEYS,
        `${path}.worker`,
        'streaming Worker',
        issues,
      );
      if (
        typeof value.worker.moduleURL !== 'string' ||
        value.worker.moduleURL.trim() === '' ||
        value.worker.moduleURL.length > 2_048
      ) {
        issues.push({
          path: `${path}.worker.moduleURL`,
          message:
            'Streaming Worker moduleURL must be a non-empty string of at most 2048 characters.',
        });
      }
      if (
        value.worker.name !== undefined &&
        (typeof value.worker.name !== 'string' ||
          !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(value.worker.name))
      ) {
        issues.push({
          path: `${path}.worker.name`,
          message: 'Streaming Worker name must contain 1 to 96 portable identity characters.',
        });
      }
      for (const [field, maximum] of [
        ['maxQueueBatches', 1_024],
        ['maxQueueRows', 1_000_000],
        ['maxInputRows', 1_000_000],
        ['maxBinaryBytes', 256 * 1024 * 1024],
        ['maxTransforms', 128],
      ] as const) {
        if (value.worker[field] !== undefined) {
          validateFiniteNumber(
            value.worker[field],
            `${path}.worker.${field}`,
            `Streaming Worker ${field}`,
            issues,
            { integer: true, min: 1, max: maximum },
          );
        }
      }
      if (
        value.worker.overflow !== undefined &&
        !STREAMING_OVERFLOW_POLICIES.has(String(value.worker.overflow))
      ) {
        issues.push({
          path: `${path}.worker.overflow`,
          message: 'Streaming Worker overflow policy is unsupported.',
        });
      }
      if (value.worker.engine !== undefined) {
        if (!isPlainObject(value.worker.engine)) {
          issues.push({
            path: `${path}.worker.engine`,
            message: 'Streaming Worker engine must be an object.',
          });
        } else {
          validateUnknownKeys(
            value.worker.engine,
            STREAMING_WORKER_ENGINE_KEYS,
            `${path}.worker.engine`,
            'streaming Worker engine',
            issues,
          );
          if (!['javascript', 'wasm'].includes(String(value.worker.engine.type))) {
            issues.push({
              path: `${path}.worker.engine.type`,
              message: 'Streaming Worker engine type must be "javascript" or "wasm".',
            });
          }
          if (value.worker.engine.type === 'wasm') {
            if (
              typeof value.worker.engine.adapter !== 'string' ||
              !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(value.worker.engine.adapter)
            ) {
              issues.push({
                path: `${path}.worker.engine.adapter`,
                message: 'WASM engine requires a portable adapter identifier.',
              });
            }
          } else if (value.worker.engine.adapter !== undefined) {
            issues.push({
              path: `${path}.worker.engine.adapter`,
              message: 'JavaScript engine does not accept an adapter.',
            });
          }
        }
      }
    }
  }
}

function findFunctions(
  value: unknown,
  path: string,
  issues: SpecIssue[],
  seen: WeakSet<object>,
): void {
  if (typeof value === 'function') {
    issues.push({ path, message: 'Functions are not allowed in the portable chart spec.' });
    return;
  }
  if (value === null || typeof value !== 'object' || value instanceof Date) return;
  if (ArrayBuffer.isView(value)) return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => findFunctions(item, `${path}[${index}]`, issues, seen));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (UNSAFE_FIELDS.has(key)) {
      issues.push({ path: `${path}.${key}`, message: `Unsafe key "${key}" is forbidden.` });
      continue;
    }
    findFunctions(child, `${path}.${key}`, issues, seen);
  }
}

function validateAxisBindings(input: Record<string, unknown>, issues: SpecIssue[]): void {
  const axes = isPlainObject(input.axes)
    ? (input.axes as Readonly<Record<string, import('./types.js').AxisSpec | false | undefined>>)
    : {};
  const declared = (id: string): boolean =>
    builtInAxisChannel(id) !== undefined || Object.prototype.hasOwnProperty.call(axes, id);
  const reference = (id: unknown, channel: 'x' | 'y' | undefined, path: string): void => {
    if (!isSafeAxisId(id)) return;
    if (!declared(id)) {
      issues.push({
        path,
        message: `Named axis "${id}" must be declared in $.axes with channel and position.`,
      });
      return;
    }
    const resolvedChannel = axisChannel(id, axes);
    if (channel !== undefined && resolvedChannel !== undefined && resolvedChannel !== channel) {
      issues.push({
        path,
        message: `Axis "${id}" belongs to the ${resolvedChannel} channel, not ${channel}.`,
      });
    }
  };
  const encoding = (value: unknown, channel: 'x' | 'y', path: string): void => {
    const id = isPlainObject(value) && value.axisId !== undefined ? value.axisId : channel;
    reference(id, channel, `${path}.axisId`);
  };
  const layer = (value: unknown, path: string): void => {
    if (!isPlainObject(value)) return;
    if (isPlainObject(value.encoding)) {
      encoding(value.encoding.x, 'x', `${path}.encoding.x`);
      encoding(value.encoding.y, 'y', `${path}.encoding.y`);
    } else {
      encoding(value.x, 'x', `${path}.x`);
      encoding(value.y, 'y', `${path}.y`);
    }
    if (isPlainObject(value.clip) && value.clip.type === 'domain') {
      for (const channel of ['x', 'y'] as const) {
        const range = value.clip[channel];
        if (isPlainObject(range) && range.axis !== undefined) {
          reference(range.axis, channel, `${path}.clip.${channel}.axis`);
        }
      }
    }
  };

  if (Array.isArray(input.layers))
    input.layers.forEach((value, index) => layer(value, `$.layers[${index}]`));
  if (
    input.mark !== undefined ||
    input.x !== undefined ||
    input.y !== undefined ||
    input.encoding !== undefined
  ) {
    layer(input, '$');
  }
  const interaction = isPlainObject(input.interaction) ? input.interaction : undefined;
  const tooltip = isPlainObject(interaction?.tooltip) ? interaction.tooltip : undefined;
  if (tooltip?.axis !== undefined) reference(tooltip.axis, undefined, '$.interaction.tooltip.axis');
  const navigation = isPlainObject(interaction?.domainNavigation)
    ? interaction.domainNavigation
    : undefined;
  if (Array.isArray(navigation?.axes)) {
    navigation.axes.forEach((id, index) =>
      reference(id, undefined, `$.interaction.domainNavigation.axes[${index}]`),
    );
  }
  const selection = isPlainObject(interaction?.selection) ? interaction.selection : undefined;
  if (selection?.axis !== undefined)
    reference(selection.axis, undefined, '$.interaction.selection.axis');
  if (selection?.xAxis !== undefined)
    reference(selection.xAxis, 'x', '$.interaction.selection.xAxis');
  if (selection?.yAxis !== undefined)
    reference(selection.yAxis, 'y', '$.interaction.selection.yAxis');

  for (const collection of ['highlights', 'annotations'] as const) {
    const values = input[collection];
    if (!Array.isArray(values)) continue;
    values.forEach((entry, index) => {
      if (!isPlainObject(entry) || !isPlainObject(entry.target) || entry.target.type !== 'range')
        return;
      for (const channel of ['x', 'y'] as const) {
        const range = entry.target[channel];
        if (isPlainObject(range) && range.axis !== undefined) {
          reference(range.axis, channel, `$.${collection}[${index}].target.${channel}.axis`);
        }
      }
    });
  }
}

function validateUnitSpec(input: unknown): readonly SpecIssue[] {
  const issues: SpecIssue[] = [];
  if (!isPlainObject(input)) {
    return [{ path: '$', message: 'Chart spec must be an object.' }];
  }

  if (input.specVersion !== undefined && input.specVersion !== '0.1') {
    issues.push({ path: '$.specVersion', message: 'Only specVersion "0.1" is supported.' });
  }

  const layers = input.layers;
  const hasShorthand =
    input.mark !== undefined ||
    input.x !== undefined ||
    input.y !== undefined ||
    input.encoding !== undefined;

  if (layers === undefined && !hasShorthand) {
    issues.push({ path: '$', message: 'Provide layers or the mark/x/y shorthand.' });
  }

  if (layers !== undefined) {
    if (!Array.isArray(layers) || layers.length === 0) {
      issues.push({ path: '$.layers', message: 'Layers must be a non-empty array.' });
    } else {
      layers.forEach((layer, index) =>
        validateLayer(layer, `$.layers[${index}]`, input.data !== undefined, issues),
      );
    }
  }

  if (hasShorthand) {
    validateMark(input.mark as MarkInput, '$.mark', issues);
    if (input.encoding !== undefined && (input.x !== undefined || input.y !== undefined)) {
      issues.push({
        path: '$',
        message: 'Use either the legacy x/y facade or the canonical encoding map, not both.',
      });
    }
    if (input.encoding !== undefined) {
      validateEncodingMap(input.encoding, '$.encoding', issues, input.mark);
      validateMarkEncodingCompatibility(input.mark, input.encoding, '$.encoding', issues);
    } else {
      validateEncoding(input.x as EncodingInput, '$.x', 'x', issues);
      validateEncoding(input.y as EncodingInput, '$.y', 'y', issues);
    }
    if (input.source !== undefined) {
      validateOptionalString(input.source, '$.source', 'Named data source', issues, false);
      issues.push({
        path: '$.source',
        message: 'Named chart sources require an enclosing dataflow.',
      });
    }
    if (input.data === undefined && input.source === undefined) {
      issues.push({
        path: '$.data',
        message: 'Chart-level data is required for shorthand charts.',
      });
    }
  }

  validateAxes(input.axes, '$.axes', issues);
  validateAxisBindings(input, issues);
  validateTheme(input.theme, '$.theme', issues);
  validateLegend(input.legend, '$.legend', issues);
  validateHighlights(input.highlights, '$.highlights', issues);
  validateAnnotations(input.annotations, '$.annotations', issues);
  validateMarkLabels(input.markLabels, '$.markLabels', issues);
  validateInteraction(input.interaction, '$.interaction', issues);
  validateAccessibility(input.accessibility, '$.accessibility', issues);
  validateStreaming(input.streaming, '$.streaming', issues);
  validateTransforms(input.transform, '$.transform', issues);
  validateLayerReferences(input, issues);

  findFunctions(input, '$', issues, new WeakSet());
  return issues;
}

interface CompositionValidationState {
  readonly ancestors: WeakSet<object>;
  views: number;
}

function prefixedIssue(issue: SpecIssue, path: string): SpecIssue {
  return {
    path: issue.path === '$' ? path : `${path}${issue.path.slice(1)}`,
    message: issue.message,
  };
}

function validateFacetField(value: unknown, path: string, issues: SpecIssue[]): void {
  if (typeof value === 'string') {
    validateOptionalString(value, path, 'Facet field', issues, false);
    if (UNSAFE_FIELDS.has(value)) issues.push({ path, message: `Unsafe facet field "${value}".` });
    return;
  }
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Facet field must be a field name or an object.' });
    return;
  }
  validateUnknownKeys(value, FACET_FIELD_KEYS, path, 'facet field', issues);
  validateOptionalString(value.field, `${path}.field`, 'Facet field', issues, false);
  if (typeof value.field === 'string' && UNSAFE_FIELDS.has(value.field)) {
    issues.push({ path: `${path}.field`, message: `Unsafe facet field "${value.field}".` });
  }
  validateOptionalString(value.title, `${path}.title`, 'Facet title', issues);
  if (
    value.sort !== undefined &&
    (typeof value.sort !== 'string' || !FACET_SORTS.has(value.sort))
  ) {
    issues.push({ path: `${path}.sort`, message: 'Facet sort is not supported.' });
  }
}

function validateCompositionResolve(
  value: unknown,
  path: string,
  kind: CompositionKind,
  issues: SpecIssue[],
): void {
  if (value !== undefined && !isPlainObject(value)) {
    issues.push({ path, message: 'Composition resolve must be an object.' });
    return;
  }
  if (isPlainObject(value)) {
    validateUnknownKeys(value, COMPOSITION_RESOLVE_KEYS, path, 'composition resolve', issues);
    for (const key of COMPOSITION_RESOLVE_KEYS) {
      const mode = value[key];
      if (mode !== undefined && mode !== 'shared' && mode !== 'independent') {
        issues.push({
          path: `${path}.${key}`,
          message: 'Resolve mode must be shared or independent.',
        });
      }
    }
  }
  const resolved = resolveComposition(
    isPlainObject(value) ? (value as ChartSpec['resolve']) : undefined,
    kind,
  );
  if (kind === 'layer' && Object.values(resolved).some((mode) => mode !== 'shared')) {
    issues.push({
      path,
      message: 'Layer composition requires shared scale, axis, legend, and colorbar resolve.',
    });
  }
  if (kind === 'inset' && Object.values(resolved).some((mode) => mode !== 'independent')) {
    issues.push({
      path,
      message: 'Inset composition requires independent scale, axis, legend, and colorbar resolve.',
    });
  }
  if (resolved.axis === 'shared' && resolved.scale !== 'shared') {
    issues.push({
      path: `${path}.axis`,
      message: 'A shared axis requires a shared position scale.',
    });
  }
}

function validateCompositionInteraction(
  value: unknown,
  path: string,
  kind: CompositionKind,
  issues: SpecIssue[],
): void {
  validateInteraction(value, path, issues);
  if (!isPlainObject(value)) return;
  if (value.playback !== undefined && value.playback !== false) {
    issues.push({
      path: `${path}.playback`,
      message: 'Composition playback is not supported until frame state can be resolved per view.',
    });
  }
  if (kind !== 'layer' && isPlainObject(value.tooltip) && value.tooltip.trigger === 'axis') {
    issues.push({
      path: `${path}.tooltip`,
      message: 'Axis-nearest tooltip is not supported across independent composition views.',
    });
  }
  if (kind !== 'layer' && isPlainObject(value.controls)) {
    if (value.controls.playback === true) {
      issues.push({
        path: `${path}.controls.playback`,
        message: 'Composition playback controls are not supported.',
      });
    }
    if (value.controls.annotations === true) {
      issues.push({
        path: `${path}.controls.annotations`,
        message: 'Composition-level runtime annotations are not supported.',
      });
    }
  }
}

function validateCompositionChild(
  value: unknown,
  path: string,
  depth: number,
  inheritedData: boolean,
  issues: SpecIssue[],
  state: CompositionValidationState,
): void {
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Composition child must be a chart spec object.' });
    return;
  }
  if (value.width !== undefined || value.height !== undefined) {
    issues.push({
      path,
      message:
        'Composition cell dimensions are owned by the parent; child width/height are unsupported.',
    });
  }
  if (value.interaction !== undefined) {
    issues.push({
      path: `${path}.interaction`,
      message: 'Declare interaction once on the composition container.',
    });
  }
  if (value.streaming !== undefined) {
    issues.push({
      path: `${path}.streaming`,
      message: 'Streaming composition children are unsupported until updates target a view id.',
    });
  }
  if (isPlainObject(value.legend) && value.legend.interactive === true) {
    issues.push({
      path: `${path}.legend.interactive`,
      message: 'Independent composition legends are visual-only and cannot be interactive.',
    });
  }
  validateCompositionNode(value, path, depth, inheritedData, issues, state);
}

function validateCompositionArray(
  value: unknown,
  path: string,
  depth: number,
  inheritedData: boolean,
  limit: number,
  issues: SpecIssue[],
  state: CompositionValidationState,
): void {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ path, message: 'Composition children must be a non-empty array.' });
    return;
  }
  if (value.length > limit) {
    issues.push({
      path,
      message: `Composition child count exceeds the deterministic limit ${limit}.`,
    });
  }
  value.forEach((child, index) =>
    validateCompositionChild(child, `${path}[${index}]`, depth + 1, inheritedData, issues, state),
  );
}

function validateCompositionNode(
  input: Record<string, unknown>,
  path: string,
  depth: number,
  inheritedData: boolean,
  issues: SpecIssue[],
  state: CompositionValidationState,
): void {
  if (state.ancestors.has(input)) {
    issues.push({ path, message: 'Composition specs must not contain cycles.' });
    return;
  }
  const operators = presentCompositionOperators(input);
  if (operators.length === 0) {
    state.views += 1;
    if (state.views > maximumCompositionViews) {
      issues.push({ path, message: `Composition view count exceeds ${maximumCompositionViews}.` });
    }
    const unit = inheritedData && input.data === undefined ? { ...input, data: [] } : input;
    issues.push(...validateUnitSpec(unit).map((issue) => prefixedIssue(issue, path)));
    if (input.renderer !== undefined && input.renderer !== 'auto' && input.renderer !== 'canvas') {
      issues.push({
        path: `${path}.renderer`,
        message: 'Composition currently accepts only auto or canvas child renderers.',
      });
    }
    return;
  }
  if (operators.length !== 1) {
    issues.push({
      path,
      message: `Use exactly one composition operator; received ${operators.join(', ')}.`,
    });
    return;
  }
  if (depth >= maximumCompositionDepth) {
    issues.push({ path, message: `Composition nesting exceeds depth ${maximumCompositionDepth}.` });
    return;
  }
  const kind = operators[0]!;
  state.ancestors.add(input);
  validateUnknownKeys(input, COMPOSITION_KEYS, path, 'composition', issues);
  const ownsData = input.data !== undefined || inheritedData;
  const unitFields = ['mark', 'x', 'y', 'encoding', 'layers'].filter(
    (key) => input[key] !== undefined,
  );
  if (unitFields.length > 0) {
    issues.push({
      path,
      message: `Composition cannot be mixed with unit fields: ${unitFields.join(', ')}.`,
    });
  }
  if (input.specVersion !== undefined && input.specVersion !== '0.1') {
    issues.push({ path: `${path}.specVersion`, message: 'Only specVersion "0.1" is supported.' });
  }
  if (input.renderer !== undefined && input.renderer !== 'auto' && input.renderer !== 'canvas') {
    issues.push({
      path: `${path}.renderer`,
      message: 'Composition currently supports only the Canvas renderer.',
    });
  }
  if (input.streaming !== undefined) {
    issues.push({
      path: `${path}.streaming`,
      message: 'Streaming composition is not supported until updates are routed to explicit views.',
    });
  }
  if (input.spacing !== undefined)
    validateFiniteNumber(input.spacing, `${path}.spacing`, 'Composition spacing', issues, {
      min: 0,
      max: 64,
    });
  validateTheme(input.theme, `${path}.theme`, issues);
  validateTransforms(input.transform, `${path}.transform`, issues);
  validateAccessibility(input.accessibility, `${path}.accessibility`, issues);
  validateCompositionInteraction(input.interaction, `${path}.interaction`, kind, issues);
  validateCompositionResolve(input.resolve, `${path}.resolve`, kind, issues);

  if (kind !== 'layer') {
    if (
      input.axes !== undefined &&
      resolveComposition(input.resolve as ChartSpec['resolve'], kind).axis !== 'shared'
    ) {
      issues.push({ path: `${path}.axes`, message: 'Container axes require shared axis resolve.' });
    } else {
      validateAxes(input.axes, `${path}.axes`, issues);
    }
    const guideResolve = resolveComposition(input.resolve as ChartSpec['resolve'], kind);
    if (
      input.legend !== undefined &&
      guideResolve.legend !== 'shared' &&
      guideResolve.colorbar !== 'shared'
    ) {
      issues.push({
        path: `${path}.legend`,
        message: 'A container legend requires shared legend or colorbar resolve.',
      });
    } else {
      validateLegend(input.legend, `${path}.legend`, issues);
    }
    if (Array.isArray(input.highlights) && input.highlights.length > 0)
      issues.push({
        path: `${path}.highlights`,
        message: 'Highlights must be declared in a child view.',
      });
    if (Array.isArray(input.annotations) && input.annotations.length > 0)
      issues.push({
        path: `${path}.annotations`,
        message: 'Annotations must be declared in a child view.',
      });
  } else {
    validateAxes(input.axes, `${path}.axes`, issues);
    validateLegend(input.legend, `${path}.legend`, issues);
    validateHighlights(input.highlights, `${path}.highlights`, issues);
    validateAnnotations(input.annotations, `${path}.annotations`, issues);
  }

  switch (kind) {
    case 'layer':
      if (input.spec !== undefined)
        issues.push({
          path: `${path}.spec`,
          message: 'Layer composition does not use a template spec.',
        });
      validateCompositionArray(
        input.layer,
        `${path}.layer`,
        depth,
        ownsData,
        maximumLayerCompositionChildren,
        issues,
        state,
      );
      if (Array.isArray(input.layer)) {
        input.layer.forEach((child, index) => {
          if (!isPlainObject(child)) return;
          validateUnknownKeys(
            child,
            LAYER_COMPOSITION_CHILD_KEYS,
            `${path}.layer[${index}]`,
            'layer composition child',
            issues,
          );
          if (presentCompositionOperators(child).length > 0) {
            issues.push({
              path: `${path}.layer[${index}]`,
              message:
                'Layer composition children must be unit charts so they can share one scale/axis/legend pipeline.',
            });
          }
          if (
            child.layers !== undefined &&
            (child.mark !== undefined ||
              child.x !== undefined ||
              child.y !== undefined ||
              child.encoding !== undefined)
          ) {
            issues.push({
              path: `${path}.layer[${index}]`,
              message:
                'Layer composition children must use either flat layers or unit shorthand, not both.',
            });
          }
        });
      }
      break;
    case 'facet': {
      if (!isPlainObject(input.facet)) {
        issues.push({ path: `${path}.facet`, message: 'Facet must be an object.' });
      } else {
        const facet = input.facet;
        validateUnknownKeys(facet, FACET_KEYS, `${path}.facet`, 'facet', issues);
        const fields = ['row', 'column', 'wrap'].filter((key) => facet[key] !== undefined);
        if (fields.length === 0)
          issues.push({ path: `${path}.facet`, message: 'Facet requires row, column, or wrap.' });
        if (facet.wrap !== undefined && fields.length > 1)
          issues.push({
            path: `${path}.facet.wrap`,
            message: 'Wrap facet cannot be mixed with row/column.',
          });
        for (const field of fields)
          validateFacetField(facet[field], `${path}.facet.${field}`, issues);
        if (facet.columns !== undefined)
          validateFiniteNumber(facet.columns, `${path}.facet.columns`, 'Facet columns', issues, {
            min: 1,
            max: 16,
            integer: true,
          });
      }
      if (input.data === undefined)
        issues.push({
          path: `${path}.data`,
          message: 'Facet composition requires chart-level data.',
        });
      if (!isPlainObject(input.spec))
        issues.push({
          path: `${path}.spec`,
          message: 'Facet composition requires a template spec.',
        });
      else {
        if (input.spec.data !== undefined)
          issues.push({
            path: `${path}.spec.data`,
            message: 'Facet template data comes from the partition.',
          });
        validateCompositionChild(input.spec, `${path}.spec`, depth + 1, true, issues, state);
      }
      break;
    }
    case 'repeat': {
      if (!isPlainObject(input.repeat)) {
        issues.push({ path: `${path}.repeat`, message: 'Repeat must be an object.' });
      } else {
        validateUnknownKeys(input.repeat, REPEAT_KEYS, `${path}.repeat`, 'repeat', issues);
        if (!Array.isArray(input.repeat.items) || input.repeat.items.length === 0) {
          issues.push({
            path: `${path}.repeat.items`,
            message: 'Repeat items must be a non-empty array.',
          });
        } else {
          if (input.repeat.items.length > maximumCompositionViews)
            issues.push({
              path: `${path}.repeat.items`,
              message: `Repeat item count exceeds ${maximumCompositionViews}.`,
            });
          const ids = new Set<string>();
          input.repeat.items.forEach((item, index) => {
            const itemPath = `${path}.repeat.items[${index}]`;
            if (!isPlainObject(item)) {
              issues.push({ path: itemPath, message: 'Repeat item must be an object.' });
              return;
            }
            validateUnknownKeys(item, REPEAT_ITEM_KEYS, itemPath, 'repeat item', issues);
            validateOptionalString(item.id, `${itemPath}.id`, 'Repeat item id', issues, false);
            validateOptionalString(item.label, `${itemPath}.label`, 'Repeat item label', issues);
            validateOptionalString(item.x, `${itemPath}.x`, 'Repeat x field', issues, false);
            validateOptionalString(item.y, `${itemPath}.y`, 'Repeat y field', issues, false);
            for (const field of ['x', 'y'] as const) {
              if (typeof item[field] === 'string' && UNSAFE_FIELDS.has(item[field])) {
                issues.push({
                  path: `${itemPath}.${field}`,
                  message: `Unsafe repeat ${field} field "${item[field]}".`,
                });
              }
            }
            if (item.x === undefined && item.y === undefined)
              issues.push({
                path: itemPath,
                message: 'Repeat item requires x or y field substitution.',
              });
            if (typeof item.id === 'string') {
              if (ids.has(item.id))
                issues.push({ path: `${itemPath}.id`, message: 'Repeat item ids must be unique.' });
              ids.add(item.id);
            }
          });
        }
        if (input.repeat.columns !== undefined)
          validateFiniteNumber(
            input.repeat.columns,
            `${path}.repeat.columns`,
            'Repeat columns',
            issues,
            { min: 1, max: 16, integer: true },
          );
      }
      if (!isPlainObject(input.spec))
        issues.push({
          path: `${path}.spec`,
          message: 'Repeat composition requires a template spec.',
        });
      else {
        if (presentCompositionOperators(input.spec).length > 0)
          issues.push({
            path: `${path}.spec`,
            message: 'Repeat templates must be unit charts for explicit x/y field substitution.',
          });
        validateCompositionChild(input.spec, `${path}.spec`, depth + 1, ownsData, issues, state);
      }
      break;
    }
    case 'hconcat':
    case 'vconcat':
    case 'concat': {
      const children = input[kind];
      validateCompositionArray(
        children,
        `${path}.${kind}`,
        depth,
        ownsData,
        maximumCompositionViews,
        issues,
        state,
      );
      if (kind === 'concat' && input.columns !== undefined)
        validateFiniteNumber(input.columns, `${path}.columns`, 'Concat columns', issues, {
          min: 1,
          max: 16,
          integer: true,
        });
      if (kind !== 'concat' && input.columns !== undefined)
        issues.push({
          path: `${path}.columns`,
          message: 'Columns is only valid for wrapped concat.',
        });
      if (input.spec !== undefined)
        issues.push({ path: `${path}.spec`, message: `${kind} does not use a template spec.` });
      break;
    }
    case 'inset':
      if (!isPlainObject(input.inset)) {
        issues.push({ path: `${path}.inset`, message: 'Inset must be an object.' });
      } else {
        validateUnknownKeys(input.inset, INSET_KEYS, `${path}.inset`, 'inset', issues);
        for (const key of ['x', 'y', 'width', 'height'] as const) {
          validateFiniteNumber(input.inset[key], `${path}.inset.${key}`, `Inset ${key}`, issues, {
            min: key === 'width' || key === 'height' ? Number.EPSILON : 0,
            max: 1,
          });
        }
        if (
          typeof input.inset.x === 'number' &&
          typeof input.inset.width === 'number' &&
          input.inset.x + input.inset.width > 1
        )
          issues.push({
            path: `${path}.inset.width`,
            message: 'Inset exceeds the horizontal plot boundary.',
          });
        if (
          typeof input.inset.y === 'number' &&
          typeof input.inset.height === 'number' &&
          input.inset.y + input.inset.height > 1
        )
          issues.push({
            path: `${path}.inset.height`,
            message: 'Inset exceeds the vertical plot boundary.',
          });
        validateOptionalString(input.inset.label, `${path}.inset.label`, 'Inset label', issues);
        validateCompositionChild(
          input.inset.base,
          `${path}.inset.base`,
          depth + 1,
          ownsData,
          issues,
          state,
        );
        validateCompositionChild(
          input.inset.view,
          `${path}.inset.view`,
          depth + 1,
          ownsData,
          issues,
          state,
        );
      }
      if (input.spec !== undefined)
        issues.push({ path: `${path}.spec`, message: 'Inset does not use a template spec.' });
      break;
  }
  state.ancestors.delete(input);
}

export function validateSpec(input: unknown): readonly SpecIssue[] {
  let materialized = input;
  if (isPlainObject(input)) {
    try {
      materialized = materializeSpecDataflow(input as unknown as ChartSpec);
    } catch (error) {
      if (error instanceof GraflumeError) {
        return [{ path: error.path ?? '$.dataflow', message: error.message }];
      }
      throw error;
    }
  }
  if (!isPlainObject(materialized)) return validateUnitSpec(materialized);
  if (presentCompositionOperators(materialized).length === 0) return validateUnitSpec(materialized);
  const issues: SpecIssue[] = [];
  validateCompositionNode(materialized, '$', 0, false, issues, {
    ancestors: new WeakSet(),
    views: 0,
  });
  findFunctions(materialized, '$', issues, new WeakSet());
  return issues;
}

export function assertValidSpec(input: unknown): asserts input is ChartSpec {
  const issues = validateSpec(input);
  if (issues.length === 0) return;
  const first = issues[0];
  throw new GraflumeError('INVALID_SPEC', first?.message ?? 'Invalid chart spec.', {
    path: first?.path ?? '$',
    details: { issues },
  });
}
