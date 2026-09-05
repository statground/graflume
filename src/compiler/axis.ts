import { nodeBase } from '../scene/factory.js';
import { safeDateTimeFormatter, temporalTimestamp } from '../format/temporal.js';
import type { LineNode, SceneNode, TextNode } from '../scene/types.js';
import type { Scale, Tick } from '../scale/types.js';
import type {
  AxisChannel,
  AxisId,
  AxisPosition,
  NormalizedAxisFontSpec,
  NormalizedAxisSpec,
} from '../spec/types.js';
import { axisPositionChannel, builtInAxisChannel, defaultAxisPosition } from '../spec/axes.js';
import type { ThemeTokens } from '../theme/types.js';
import { formatAxisTick, truncateAxisLabel } from './axis-format.js';
import type { PlotArea } from './types.js';

export interface AxisCompileContext {
  readonly id: AxisId;
  readonly channel?: AxisChannel;
  readonly axis: NormalizedAxisSpec | false;
  readonly scale: Scale;
  readonly plot: PlotArea;
  readonly theme: ThemeTokens;
  readonly locale?: string;
  /** Encoding title used when the axis does not declare its own title text. */
  readonly title: string;
}

type LegacyAxisContext = Omit<AxisCompileContext, 'id'>;

interface ResolvedTick extends Tick {
  readonly formattedLabel: string;
}

interface ResolvedTextStyle {
  readonly fill: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: string | number;
  readonly fontStyle?: 'italic';
}

function position(context: AxisCompileContext): AxisPosition {
  const axisChannel = channel(context);
  if (context.axis === false) return defaultAxisPosition(context.id, axisChannel);
  const requested = context.axis.position;
  if (axisChannel === 'x') {
    return requested === 'top' || requested === 'bottom'
      ? requested
      : defaultAxisPosition(context.id, axisChannel);
  }
  return requested === 'left' || requested === 'right'
    ? requested
    : defaultAxisPosition(context.id, axisChannel);
}

function channel(context: AxisCompileContext): AxisChannel {
  return (
    context.channel ??
    builtInAxisChannel(context.id) ??
    (context.axis === false ? 'x' : axisPositionChannel(context.axis.position))
  );
}

function mappedFontWeight(
  weight: NormalizedAxisFontSpec['weight'],
  fallback: number,
): string | number {
  if (typeof weight === 'number') return weight;
  switch (weight) {
    case 'normal':
      return 400;
    case 'medium':
      return 500;
    case 'semibold':
      return 600;
    case 'bold':
      return 700;
    default:
      return fallback;
  }
}

function resolveTextStyle(
  font: NormalizedAxisFontSpec,
  color: string | undefined,
  theme: ThemeTokens,
  defaultColor: string,
  defaultSize: number,
  fallbackWeight: number,
): ResolvedTextStyle {
  return {
    fill: color ?? defaultColor,
    fontFamily: font.family ?? theme.typography.fontFamily,
    fontSize: font.size ?? defaultSize,
    fontWeight: mappedFontWeight(font.weight, fallbackWeight),
    ...(font.style === 'italic' ? { fontStyle: 'italic' as const } : {}),
  };
}

function line(
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  lineWidth: number,
  zIndex: number,
  opacity: number,
  dash: readonly number[],
  lineCap: CanvasLineCap = 'round',
): LineNode {
  return {
    type: 'line',
    ...nodeBase(id, { zIndex, opacity }),
    x1,
    y1,
    x2,
    y2,
    stroke,
    lineWidth,
    ...(dash.length === 0 ? {} : { dash }),
    lineCap,
  };
}

function text(
  id: string,
  x: number,
  y: number,
  value: string,
  style: ResolvedTextStyle,
  options: Pick<TextNode, 'align' | 'baseline' | 'rotation'>,
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: 110 }),
    x,
    y,
    text: value,
    fill: style.fill,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    ...(style.fontStyle === undefined ? {} : { fontStyle: style.fontStyle }),
    align: options.align,
    baseline: options.baseline,
    rotation: options.rotation,
  };
}

function explicitTickLabel(value: number | string, scale: Scale, locale?: string): string {
  if (scale.kind === 'time' || scale.kind === 'utc') {
    const timestamp = temporalTimestamp(value, true);
    if (timestamp !== null) {
      return safeDateTimeFormatter(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...(scale.kind === 'utc' ? { timeZone: 'UTC' } : {}),
      }).format(new Date(timestamp));
    }
  }
  if (!['band', 'point', 'ordinal'].includes(scale.kind) && typeof value === 'number') {
    try {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
    } catch {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
    }
  }
  return String(value);
}

function requestedTickCount(context: AxisCompileContext): number {
  if (context.axis === false) return 0;
  const axisChannel = channel(context);
  const length = axisChannel === 'x' ? context.plot.width : context.plot.height;
  const automatic = Math.max(2, Math.floor(length / (axisChannel === 'x' ? 96 : 58)));
  const requested = context.axis.ticks.count ?? automatic;
  if (context.axis.ticks.spacing <= 0) return Math.max(1, requested);
  return Math.max(1, Math.min(requested, Math.floor(length / context.axis.ticks.spacing)));
}

function pruneTicksBySpacing(ticks: readonly Tick[], spacing: number): readonly Tick[] {
  if (spacing <= 0 || ticks.length <= 1) return ticks;
  const ordered = [...ticks].sort((left, right) => left.position - right.position);
  const kept: Tick[] = [];
  for (const tick of ordered) {
    const previous = kept.at(-1);
    if (previous === undefined || tick.position - previous.position >= spacing) kept.push(tick);
  }
  return kept;
}

function resolveTicks(context: AxisCompileContext): readonly ResolvedTick[] {
  const axis = context.axis;
  if (axis === false) return [];
  const configuredValues = axis.ticks.values;
  const rawTicks: readonly Tick[] =
    configuredValues === undefined
      ? context.scale.ticks(requestedTickCount(context), context.locale)
      : configuredValues.flatMap((value) => {
          const mapped = context.scale.map(value);
          const minimum = channel(context) === 'x' ? context.plot.x : context.plot.y;
          const maximum =
            minimum + (channel(context) === 'x' ? context.plot.width : context.plot.height);
          return Number.isFinite(mapped) && mapped >= minimum - 0.5 && mapped <= maximum + 0.5
            ? [
                {
                  value,
                  position: mapped,
                  label: explicitTickLabel(value, context.scale, context.locale),
                },
              ]
            : [];
        });
  return pruneTicksBySpacing(rawTicks, axis.ticks.spacing).map((tick) => ({
    ...tick,
    formattedLabel: truncateAxisLabel(
      axis.labels.values !== undefined && Object.hasOwn(axis.labels.values, String(tick.value))
        ? axis.labels.values[String(tick.value)]!
        : formatAxisTick(tick, axis.format, context.locale),
      axis.labels.maxLength,
    ),
  }));
}

function labelAngle(context: AxisCompileContext, ticks: readonly ResolvedTick[]): number {
  if (context.axis === false) return 0;
  if (context.axis.labels.angle !== undefined) return context.axis.labels.angle;
  switch (context.axis.labels.orientation) {
    case 'horizontal':
      return 0;
    case 'vertical-up':
      return -90;
    case 'vertical-down':
      return 90;
    case 'auto':
      return channel(context) === 'x' && context.scale.kind === 'band' && ticks.length > 10
        ? -35
        : 0;
  }
}

function explicitAlign(align: 'auto' | 'start' | 'center' | 'end'): CanvasTextAlign | null {
  return align === 'auto' ? null : align;
}

function labelAlign(
  context: AxisCompileContext,
  axisPosition: AxisPosition,
  angle: number,
): CanvasTextAlign {
  if (context.axis === false) return 'center';
  const configured = explicitAlign(context.axis.labels.align);
  if (configured !== null) return configured;
  if (channel(context) === 'x') {
    if (angle === 0) return 'center';
    const startsOutward =
      (axisPosition === 'bottom' && angle > 0) || (axisPosition === 'top' && angle < 0);
    return startsOutward ? 'left' : 'right';
  }
  if (angle !== 0) return 'center';
  return axisPosition === 'left' ? 'right' : 'left';
}

function titleAlign(context: AxisCompileContext, angle: number): CanvasTextAlign {
  if (context.axis === false) return 'center';
  const align = context.axis.title.align;
  if (channel(context) !== 'y' || angle >= 0 || align === 'center') return align;
  return align === 'start' ? 'end' : 'start';
}

function coordinateAlongAxis(
  plot: PlotArea,
  axisChannel: 'x' | 'y',
  align: 'start' | 'center' | 'end',
): number {
  if (axisChannel === 'x') {
    if (align === 'start') return plot.x;
    if (align === 'end') return plot.x + plot.width;
    return plot.x + plot.width / 2;
  }
  if (align === 'start') return plot.y;
  if (align === 'end') return plot.y + plot.height;
  return plot.y + plot.height / 2;
}

function axisCoordinate(plot: PlotArea, axisPosition: AxisPosition, offset: number): number {
  switch (axisPosition) {
    case 'top':
      return plot.y - offset;
    case 'bottom':
      return plot.y + plot.height + offset;
    case 'left':
      return plot.x - offset;
    case 'right':
      return plot.x + plot.width + offset;
  }
}

function outwardSign(axisPosition: AxisPosition): -1 | 1 {
  return axisPosition === 'top' || axisPosition === 'left' ? -1 : 1;
}

function gridIsBoundary(tick: Tick, plot: PlotArea, axisChannel: 'x' | 'y'): boolean {
  const boundary = axisChannel === 'x' ? plot.x : plot.y + plot.height;
  return Math.abs(tick.position - boundary) <= 0.5;
}

function titleText(context: AxisCompileContext): string {
  if (context.axis === false || context.axis.title.visible === false) return '';
  return context.axis.title.text ?? context.title;
}

function minorGridPositions(
  context: AxisCompileContext,
  ticks: readonly ResolvedTick[],
): readonly number[] {
  if (
    context.axis === false ||
    !context.axis.grid.visible ||
    context.theme.axis.minorGridVisible !== true ||
    (context.id !== 'x' && context.id !== 'y') ||
    ['band', 'point', 'ordinal', 'quantile', 'quantize', 'threshold'].includes(context.scale.kind)
  ) {
    return [];
  }
  const positions = [...new Set(ticks.map((tick) => tick.position))].sort(
    (left, right) => left - right,
  );
  return positions.slice(0, -1).flatMap((tickPosition, index) => {
    const next = positions[index + 1];
    if (next === undefined || next <= tickPosition) return [];
    const midpoint = tickPosition + (next - tickPosition) / 2;
    const minimum = channel(context) === 'x' ? context.plot.x : context.plot.y;
    const maximum = minimum + (channel(context) === 'x' ? context.plot.width : context.plot.height);
    return midpoint > minimum && midpoint < maximum ? [midpoint] : [];
  });
}

function resolvedTitlePadding(
  context: AxisCompileContext,
  ticks: readonly ResolvedTick[],
  titleStyle: ResolvedTextStyle,
): number {
  const axis = context.axis;
  if (axis === false || axis.title.themeGap === undefined)
    return axis === false ? 0 : axis.title.padding;
  const axisChannel = channel(context);
  const tickSize = axis.ticks.visible ? (axis.ticks.size ?? context.theme.axis.tickLength) : 0;
  let labelExtent = 0;
  if (axis.labels.visible && ticks.length > 0) {
    const style = resolveTextStyle(
      axis.labels.font,
      axis.labels.color,
      context.theme,
      context.theme.colors.mutedText,
      context.theme.typography.axisLabelSize ?? context.theme.typography.fontSize,
      context.theme.typography.axisLabelWeight ?? 500,
    );
    const angle = labelAngle(context, ticks);
    for (const tick of ticks) {
      const projected = projectedSize(
        estimatedTextWidth(tick.formattedLabel, style.fontSize),
        style.fontSize,
        angle,
      );
      labelExtent = Math.max(labelExtent, axisChannel === 'x' ? projected.height : projected.width);
    }
  }
  const labelStrip =
    labelExtent === 0
      ? tickSize
      : tickSize + (axis.labels.padding ?? context.theme.axis.labelPadding) + labelExtent;
  return labelStrip + axis.title.themeGap + (axisChannel === 'y' ? titleStyle.fontSize / 2 : 0);
}

/** Compile any primary or secondary Cartesian axis into renderer-neutral Scene primitives. */
export function compileAxis(context: AxisCompileContext): readonly SceneNode[] {
  const { axis, plot, theme } = context;
  if (axis === false || axis.visible === false) return [];

  const nodes: SceneNode[] = [];
  const axisChannel = channel(context);
  const axisPosition = position(context);
  const coordinate = axisCoordinate(plot, axisPosition, axis.offset);
  const sign = outwardSign(axisPosition);
  const prefix = `axis-${context.id}`;
  const ticks = resolveTicks(context);
  const angle = labelAngle(context, ticks);
  const tickSize = axis.ticks.visible ? (axis.ticks.size ?? theme.axis.tickLength) : 0;
  const labelPadding = axis.labels.padding ?? theme.axis.labelPadding;
  const axisLineCap = theme.axis.lineCap ?? 'round';

  if (axis.line.visible) {
    const stroke = axis.line.color ?? theme.colors.axis;
    const width = axis.line.width ?? theme.axis.lineWidth;
    nodes.push(
      axisChannel === 'x'
        ? line(
            `${prefix}:line`,
            plot.x,
            coordinate,
            plot.x + plot.width,
            coordinate,
            stroke,
            width,
            100,
            axis.line.opacity,
            axis.line.dash,
            axisLineCap,
          )
        : line(
            `${prefix}:line`,
            coordinate,
            plot.y,
            coordinate,
            plot.y + plot.height,
            stroke,
            width,
            100,
            axis.line.opacity,
            axis.line.dash,
            axisLineCap,
          ),
    );
  }

  const labelStyle = resolveTextStyle(
    axis.labels.font,
    axis.labels.color,
    theme,
    theme.colors.mutedText,
    theme.typography.axisLabelSize ?? theme.typography.fontSize,
    theme.typography.axisLabelWeight ?? 500,
  );
  const minorGridStroke = axis.grid.color ?? theme.colors.minorGrid ?? theme.colors.grid;
  const minorGridWidth =
    axis.grid.width ?? theme.axis.minorGridLineWidth ?? theme.axis.gridLineWidth / 2;
  const minorGridOpacity = Math.min(
    axis.grid.opacity,
    theme.axis.minorGridOpacity ?? axis.grid.opacity,
  );
  minorGridPositions(context, ticks).forEach((gridPosition, index) => {
    nodes.push(
      axisChannel === 'x'
        ? line(
            `${prefix}:grid-minor:${index}`,
            gridPosition,
            plot.y,
            gridPosition,
            plot.y + plot.height,
            minorGridStroke,
            minorGridWidth,
            -21,
            minorGridOpacity,
            axis.grid.dash,
            axisLineCap,
          )
        : line(
            `${prefix}:grid-minor:${index}`,
            plot.x,
            gridPosition,
            plot.x + plot.width,
            gridPosition,
            minorGridStroke,
            minorGridWidth,
            -21,
            minorGridOpacity,
            axis.grid.dash,
            axisLineCap,
          ),
    );
  });
  ticks.forEach((tick, index) => {
    const isZero = typeof tick.value === 'number' && Math.abs(tick.value) < Number.EPSILON;
    if (axis.grid.visible && !gridIsBoundary(tick, plot, axisChannel)) {
      const defaultZeroStyle = axis.grid.color === undefined && (theme.axis.emphasizeZero ?? true);
      const gridStroke =
        axis.grid.color ?? (isZero && defaultZeroStyle ? theme.colors.axis : theme.colors.grid);
      const gridWidth = axis.grid.width ?? theme.axis.gridLineWidth;
      nodes.push(
        axisChannel === 'x'
          ? line(
              `${prefix}:grid:${index}`,
              tick.position,
              plot.y,
              tick.position,
              plot.y + plot.height,
              gridStroke,
              isZero && defaultZeroStyle ? Math.max(1, gridWidth) : gridWidth,
              -20,
              isZero && defaultZeroStyle ? Math.max(0.9, axis.grid.opacity) : axis.grid.opacity,
              axis.grid.dash,
              axisLineCap,
            )
          : line(
              `${prefix}:grid:${index}`,
              plot.x,
              tick.position,
              plot.x + plot.width,
              tick.position,
              gridStroke,
              isZero && defaultZeroStyle ? Math.max(1, gridWidth) : gridWidth,
              -20,
              isZero && defaultZeroStyle ? Math.max(0.9, axis.grid.opacity) : axis.grid.opacity,
              axis.grid.dash,
              axisLineCap,
            ),
      );
    }

    if (axis.ticks.visible && tickSize > 0) {
      const stroke = axis.ticks.color ?? theme.colors.axis;
      const width = axis.ticks.width ?? theme.axis.lineWidth;
      nodes.push(
        axisChannel === 'x'
          ? line(
              `${prefix}:tick:${index}`,
              tick.position,
              coordinate,
              tick.position,
              coordinate + sign * tickSize,
              stroke,
              width,
              100,
              axis.ticks.opacity,
              axis.ticks.dash,
              axisLineCap,
            )
          : line(
              `${prefix}:tick:${index}`,
              coordinate,
              tick.position,
              coordinate + sign * tickSize,
              tick.position,
              stroke,
              width,
              100,
              axis.ticks.opacity,
              axis.ticks.dash,
              axisLineCap,
            ),
      );
    }

    if (!axis.labels.visible) return;
    if (axisChannel === 'x') {
      nodes.push(
        text(
          `${prefix}:label:${index}`,
          tick.position,
          coordinate + sign * (tickSize + labelPadding),
          tick.formattedLabel,
          labelStyle,
          {
            align: labelAlign(context, axisPosition, angle),
            baseline: axisPosition === 'top' ? 'bottom' : 'top',
            rotation: angle,
          },
        ),
      );
    } else {
      nodes.push(
        text(
          `${prefix}:label:${index}`,
          coordinate + sign * (tickSize + labelPadding),
          tick.position,
          tick.formattedLabel,
          labelStyle,
          {
            align: labelAlign(context, axisPosition, angle),
            baseline: 'middle',
            rotation: angle,
          },
        ),
      );
    }
  });

  const resolvedTitle = titleText(context);
  if (resolvedTitle !== '') {
    const titleStyle = resolveTextStyle(
      axis.title.font,
      axis.title.color,
      theme,
      theme.colors.axisTitle ?? theme.colors.mutedText,
      theme.typography.axisTitleSize ?? theme.typography.fontSize,
      theme.typography.axisTitleWeight ?? 600,
    );
    const titlePosition = coordinateAlongAxis(plot, axisChannel, axis.title.align);
    const titleAngle =
      axis.title.angle ?? (axisChannel === 'x' ? 0 : axisPosition === 'left' ? -90 : 90);
    const titleCoordinate = coordinate + sign * resolvedTitlePadding(context, ticks, titleStyle);
    if (axisChannel === 'x') {
      nodes.push(
        text(`${prefix}:title`, titlePosition, titleCoordinate, resolvedTitle, titleStyle, {
          align: titleAlign(context, titleAngle),
          baseline: axisPosition === 'top' ? 'bottom' : 'top',
          rotation: titleAngle,
        }),
      );
    } else {
      nodes.push(
        text(
          `${prefix}:title`,
          axisPosition === 'left' ? Math.max(12, titleCoordinate) : titleCoordinate,
          titlePosition,
          resolvedTitle,
          titleStyle,
          { align: titleAlign(context, titleAngle), baseline: 'middle', rotation: titleAngle },
        ),
      );
    }
  }

  return nodes;
}

function estimatedTextWidth(value: string, fontSize: number): number {
  let units = 0;
  for (const character of Array.from(value)) {
    if (/\s/u.test(character)) units += 0.33;
    else if (/[^\u0000-\u024f]/u.test(character)) units += 1;
    else units += 0.6;
  }
  return Math.max(fontSize * 0.6, units * fontSize);
}

function projectedSize(
  width: number,
  height: number,
  angle: number,
): {
  readonly width: number;
  readonly height: number;
} {
  const radians = (angle * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  return {
    width: width * cosine + height * sine,
    height: width * sine + height * cosine,
  };
}

function usesLegacyPrimaryGutter(context: AxisCompileContext): boolean {
  const axis = context.axis;
  if (axis === false || (context.id !== 'x' && context.id !== 'y')) return false;
  const expectedPosition = context.id === 'x' ? 'bottom' : 'left';
  const expectedTitlePadding = context.id === 'x' ? 32 : 46;
  return (
    axis.position === expectedPosition &&
    axis.offset === 0 &&
    axis.line.width === undefined &&
    axis.ticks.spacing === 0 &&
    axis.ticks.size === undefined &&
    axis.ticks.values === undefined &&
    axis.labels.orientation === 'auto' &&
    axis.labels.angle === undefined &&
    axis.labels.align === 'auto' &&
    axis.labels.padding === undefined &&
    axis.labels.maxLength === undefined &&
    axis.labels.font.family === undefined &&
    axis.labels.font.size === undefined &&
    axis.labels.font.weight === undefined &&
    axis.labels.font.style === 'normal' &&
    axis.title.angle === undefined &&
    axis.title.themeGap === undefined &&
    axis.title.padding === expectedTitlePadding &&
    axis.title.font.family === undefined &&
    axis.title.font.size === undefined &&
    axis.title.font.weight === undefined &&
    axis.title.font.style === 'normal' &&
    axis.format.type === 'auto' &&
    axis.format.fractionDigits === undefined &&
    axis.format.notation === 'standard' &&
    axis.format.useGrouping &&
    axis.format.currency === undefined &&
    axis.format.prefix === '' &&
    axis.format.suffix === ''
  );
}

/**
 * Deterministically estimate the outward axis gutter from the same ticks, formatting,
 * truncation, fonts and rotations used by compileAxis().
 */
export function measureAxisGutter(context: AxisCompileContext): number {
  const { axis, theme } = context;
  if (axis === false || axis.visible === false) return 0;
  const axisChannel = channel(context);
  let required = measureAxisLabelGutter(context);

  const resolvedTitle = titleText(context);
  if (resolvedTitle !== '') {
    const style = resolveTextStyle(
      axis.title.font,
      axis.title.color,
      theme,
      theme.colors.axisTitle ?? theme.colors.mutedText,
      theme.typography.axisTitleSize ?? theme.typography.fontSize,
      theme.typography.axisTitleWeight ?? 600,
    );
    const axisPosition = position(context);
    const titleAngle =
      axis.title.angle ?? (axisChannel === 'x' ? 0 : axisPosition === 'left' ? -90 : 90);
    const projected = projectedSize(
      estimatedTextWidth(resolvedTitle, style.fontSize),
      style.fontSize,
      titleAngle,
    );
    const outwardTextExtent =
      axisChannel === 'x'
        ? projected.height
        : axis.title.align === 'center'
          ? projected.width / 2
          : projected.width;
    required = Math.max(
      required,
      axis.offset + resolvedTitlePadding(context, resolveTicks(context), style) + outwardTextExtent,
    );
  }
  const measured = Math.ceil(required);
  if (!usesLegacyPrimaryGutter(context)) return measured;
  return Math.min(measured, context.id === 'x' ? 44 : 56);
}

/** Measure the interactive tick/label strip without extending it through the axis title. */
export function measureAxisLabelGutter(context: AxisCompileContext): number {
  const { axis, theme } = context;
  if (axis === false || axis.visible === false) return 0;
  const axisChannel = channel(context);
  const ticks = resolveTicks(context);
  const angle = labelAngle(context, ticks);
  const tickSize = axis.ticks.visible ? (axis.ticks.size ?? theme.axis.tickLength) : 0;
  const labelPadding = axis.labels.padding ?? theme.axis.labelPadding;
  const lineWidth = axis.line.visible ? (axis.line.width ?? theme.axis.lineWidth) : 0;
  let required = axis.offset + lineWidth / 2;

  if (axis.labels.visible && ticks.length > 0) {
    const style = resolveTextStyle(
      axis.labels.font,
      axis.labels.color,
      theme,
      theme.colors.mutedText,
      theme.typography.axisLabelSize ?? theme.typography.fontSize,
      theme.typography.axisLabelWeight ?? 500,
    );
    let labelExtent = 0;
    for (const tick of ticks) {
      const projected = projectedSize(
        estimatedTextWidth(tick.formattedLabel, style.fontSize),
        style.fontSize,
        angle,
      );
      labelExtent = Math.max(labelExtent, axisChannel === 'x' ? projected.height : projected.width);
    }
    required = Math.max(required, axis.offset + tickSize + labelPadding + labelExtent);
  } else if (axis.ticks.visible) {
    required = Math.max(required, axis.offset + tickSize);
  }
  return Math.ceil(required);
}

/** Backward-compatible primary x-axis adapter. */
export function compileXAxis(context: LegacyAxisContext): readonly SceneNode[] {
  return compileAxis({ ...context, id: 'x' });
}

/** Backward-compatible primary y-axis adapter. */
export function compileYAxis(context: LegacyAxisContext): readonly SceneNode[] {
  return compileAxis({ ...context, id: 'y' });
}
