import { GraflumeError } from '../core/errors.js';
import { isPlainObject } from '../utils/object.js';
import type { ChartSpec, EncodingInput, LayerSpec, MarkInput } from './types.js';

export interface SpecIssue {
  readonly path: string;
  readonly message: string;
}

const UNSAFE_FIELDS = new Set(['__proto__', 'prototype', 'constructor']);
const TOOLTIP_FORMATS = new Set(['auto', 'number', 'integer', 'percent', 'date', 'datetime']);
const TOOLTIP_KEYS = new Set(['trigger', 'axis', 'title', 'fields']);
const TOOLTIP_FIELD_KEYS = new Set([
  'field',
  'label',
  'format',
  'fractionDigits',
  'prefix',
  'suffix',
]);
const INTERACTION_KEYS = new Set([
  'hover',
  'click',
  'tooltip',
  'navigation',
  'playback',
  'controls',
  'selection',
]);
const NAVIGATION_KEYS = new Set(['minZoom', 'maxZoom', 'wheel', 'drag', 'pinch', 'keyboard']);
const NAVIGATION_WHEEL_MODES = new Set(['off', 'modifier', 'always']);
const PLAYBACK_KEYS = new Set([
  'field',
  'key',
  'layerId',
  'mode',
  'interval',
  'rate',
  'loop',
  'windowSize',
  'autoplay',
  'transition',
  'filter',
]);
const PLAYBACK_MODES = new Set(['frame', 'cumulative', 'window']);
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
  'mode',
  'toggle',
  'key',
  'clearOnBackground',
  'clearOnEscape',
  'ariaLabel',
  'highlight',
]);
const SELECTION_MODES = new Set(['single', 'multiple']);
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
  'target',
  'text',
  'detail',
  'placement',
  'offsetX',
  'offsetY',
  'connector',
  'style',
]);
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
const ENCODING_KEYS = new Set(['field', 'type', 'title', 'scale', 'axis', 'axisId']);
const FIELD_TYPES = new Set(['quantitative', 'temporal', 'ordinal', 'nominal']);
const SCALE_KEYS = new Set([
  'type',
  'domain',
  'zero',
  'nice',
  'clamp',
  'reverse',
  'paddingInner',
  'paddingOuter',
]);
const SCALE_TYPES = new Set(['linear', 'band', 'time']);
const AXIS_IDS = new Set(['x', 'x2', 'y', 'y2']);
const AXIS_KEYS = new Set([
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
const AXIS_TIME_STYLES = new Set(['short', 'medium', 'long']);
const THEME_CONTINUOUS_INTERPOLATIONS = new Set(['step', 'rgb', 'lab']);
const THEME_SERIES_COLOR_MODES = new Set(['theme', 'series']);
const THEME_PIE_DIRECTIONS = new Set(['clockwise', 'counterclockwise']);

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
  if (
    value.type !== undefined &&
    (typeof value.type !== 'string' || !SCALE_TYPES.has(value.type))
  ) {
    issues.push({ path: `${path}.type`, message: 'Scale type is not supported.' });
  }
  if (value.domain !== undefined) {
    if (!Array.isArray(value.domain) || value.domain.length < 2) {
      issues.push({
        path: `${path}.domain`,
        message: 'Scale domain must contain at least 2 values.',
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
  for (const key of ['zero', 'nice', 'clamp', 'reverse'] as const) {
    validateOptionalBoolean(value[key], `${path}.${key}`, `Scale ${key}`, issues);
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
  axisId: 'x' | 'x2' | 'y' | 'y2',
  issues: SpecIssue[],
): void {
  if (value === false) return;
  if (!isPlainObject(value)) {
    issues.push({ path, message: 'Axis must be an object or false.' });
    return;
  }
  validateUnknownKeys(value, AXIS_KEYS, path, 'axis', issues);
  validateAxisTitle(value.title, `${path}.title`, issues);
  validateOptionalBoolean(value.visible, `${path}.visible`, 'Axis visibility', issues);
  if (value.position !== undefined) {
    if (typeof value.position !== 'string' || !AXIS_POSITIONS.has(value.position)) {
      issues.push({ path: `${path}.position`, message: 'Axis position is not supported.' });
    } else if (
      ((axisId === 'x' || axisId === 'x2') && !['top', 'bottom'].includes(value.position)) ||
      ((axisId === 'y' || axisId === 'y2') && !['left', 'right'].includes(value.position))
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
  validateUnknownKeys(value, AXIS_IDS, path, 'axes', issues);
  for (const axisId of ['x', 'x2', 'y', 'y2'] as const) {
    if (value[axisId] !== undefined)
      validateAxis(value[axisId], `${path}.${axisId}`, axisId, issues);
  }
}

function validateEncoding(
  value: unknown,
  path: string,
  channel: 'x' | 'y',
  issues: SpecIssue[],
): void {
  if (typeof value === 'string') {
    if (value.trim() === '') issues.push({ path, message: 'Field name must not be empty.' });
    if (UNSAFE_FIELDS.has(value))
      issues.push({ path, message: `Unsafe field "${value}" is forbidden.` });
    return;
  }

  if (!isPlainObject(value) || typeof value.field !== 'string') {
    issues.push({ path, message: 'Encoding must be a field name or an object with a field.' });
    return;
  }

  validateUnknownKeys(value, ENCODING_KEYS, path, 'encoding', issues);

  if (value.field.trim() === '')
    issues.push({ path: `${path}.field`, message: 'Field must not be empty.' });
  if (UNSAFE_FIELDS.has(value.field)) {
    issues.push({ path: `${path}.field`, message: `Unsafe field "${value.field}" is forbidden.` });
  }
  if (
    value.type !== undefined &&
    (typeof value.type !== 'string' || !FIELD_TYPES.has(value.type))
  ) {
    issues.push({ path: `${path}.type`, message: 'Encoding type is not supported.' });
  }
  validateOptionalString(value.title, `${path}.title`, 'Encoding title', issues);
  validateScale(value.scale, `${path}.scale`, issues);

  const allowedAxisIds = channel === 'x' ? new Set(['x', 'x2']) : new Set(['y', 'y2']);
  const axisId =
    typeof value.axisId === 'string' && allowedAxisIds.has(value.axisId) ? value.axisId : channel;
  if (
    value.axisId !== undefined &&
    (typeof value.axisId !== 'string' || !allowedAxisIds.has(value.axisId))
  ) {
    issues.push({
      path: `${path}.axisId`,
      message: `${channel}-encoding axisId must be "${channel}" or "${channel}2".`,
    });
  }
  if (value.axis !== undefined) {
    validateAxis(value.axis, `${path}.axis`, axisId as 'x' | 'x2' | 'y' | 'y2', issues);
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

  if (value.options !== undefined && !isPlainObject(value.options)) {
    issues.push({ path: `${path}.options`, message: 'Mark options must be a JSON object.' });
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
      if (
        tooltip.axis !== undefined &&
        (typeof tooltip.axis !== 'string' || !AXIS_IDS.has(tooltip.axis))
      ) {
        issues.push({
          path: `${path}.tooltip.axis`,
          message: 'Tooltip axis must be "x", "x2", "y", or "y2".',
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
  validatePlayback(value.playback, `${path}.playback`, issues);
  validateControls(value.controls, `${path}.controls`, issues);
  validateSelection(value.selection, `${path}.selection`, issues);
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

  validateOptionalString(layer.name, `${path}.name`, 'Layer name', issues, false);

  validateMark(layer.mark as MarkInput, `${path}.mark`, issues);
  validateEncoding(layer.x as EncodingInput, `${path}.x`, 'x', issues);
  validateEncoding(layer.y as EncodingInput, `${path}.y`, 'y', issues);

  if (!hasParentData && layer.data === undefined) {
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
  if (
    value.axis !== undefined &&
    (typeof value.axis !== 'string' ||
      !AXIS_IDS.has(value.axis) ||
      (channel === 'x' ? !['x', 'x2'].includes(value.axis) : !['y', 'y2'].includes(value.axis)))
  ) {
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
    validateOptionalString(annotation.text, `${itemPath}.text`, 'Annotation text', issues, false);
    if (annotation.text === undefined)
      issues.push({ path: `${itemPath}.text`, message: 'Annotation text is required.' });
    validateOptionalString(annotation.detail, `${itemPath}.detail`, 'Annotation detail', issues);
    validateDecorationTarget(annotation.target, `${itemPath}.target`, issues);
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

function validateLayerReferences(input: Record<string, unknown>, issues: SpecIssue[]): void {
  const sourceLayers = Array.isArray(input.layers)
    ? input.layers
    : input.mark !== undefined || input.x !== undefined || input.y !== undefined
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
  checkUniqueIds(input.highlights, '$.highlights', 'Highlight', 'highlight');
  checkUniqueIds(input.annotations, '$.annotations', 'Annotation', 'annotation');
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

export function validateSpec(input: unknown): readonly SpecIssue[] {
  const issues: SpecIssue[] = [];
  if (!isPlainObject(input)) {
    return [{ path: '$', message: 'Chart spec must be an object.' }];
  }

  if (input.specVersion !== undefined && input.specVersion !== '0.1') {
    issues.push({ path: '$.specVersion', message: 'Only specVersion "0.1" is supported.' });
  }

  const layers = input.layers;
  const hasShorthand = input.mark !== undefined || input.x !== undefined || input.y !== undefined;

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
    validateEncoding(input.x as EncodingInput, '$.x', 'x', issues);
    validateEncoding(input.y as EncodingInput, '$.y', 'y', issues);
    if (input.data === undefined) {
      issues.push({
        path: '$.data',
        message: 'Chart-level data is required for shorthand charts.',
      });
    }
  }

  validateAxes(input.axes, '$.axes', issues);
  validateTheme(input.theme, '$.theme', issues);
  validateLegend(input.legend, '$.legend', issues);
  validateHighlights(input.highlights, '$.highlights', issues);
  validateAnnotations(input.annotations, '$.annotations', issues);
  validateInteraction(input.interaction, '$.interaction', issues);
  validateLayerReferences(input, issues);

  findFunctions(input, '$', issues, new WeakSet());
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
