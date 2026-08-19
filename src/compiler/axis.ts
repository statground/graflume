import { nodeBase } from '../scene/factory.js';
import type { LineNode, SceneNode, TextNode } from '../scene/types.js';
import type { Scale } from '../scale/types.js';
import type { AxisSpec } from '../spec/types.js';
import type { ThemeTokens } from '../theme/types.js';
import type { PlotArea } from './types.js';

interface AxisContext {
  readonly axis: AxisSpec | false;
  readonly scale: Scale;
  readonly plot: PlotArea;
  readonly theme: ThemeTokens;
  readonly locale?: string;
  readonly title: string;
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
): LineNode {
  return {
    type: 'line',
    ...nodeBase(id, { zIndex }),
    x1,
    y1,
    x2,
    y2,
    stroke,
    lineWidth,
  };
}

function text(
  id: string,
  x: number,
  y: number,
  value: string,
  theme: ThemeTokens,
  options: Partial<Pick<TextNode, 'align' | 'baseline' | 'rotation' | 'fontWeight' | 'fontSize'>> = {},
): TextNode {
  return {
    type: 'text',
    ...nodeBase(id, { zIndex: 110 }),
    x,
    y,
    text: value,
    fill: theme.colors.mutedText,
    fontFamily: theme.typography.fontFamily,
    fontSize: options.fontSize ?? theme.typography.fontSize,
    fontWeight: options.fontWeight ?? 400,
    align: options.align ?? 'center',
    baseline: options.baseline ?? 'top',
    rotation: options.rotation ?? 0,
  };
}

export function compileXAxis(context: AxisContext): readonly SceneNode[] {
  const { axis, scale, plot, theme, locale, title } = context;
  if (axis === false || axis.visible === false) return [];
  const nodes: SceneNode[] = [];
  const axisY = plot.y + plot.height;
  const ticks = scale.ticks(axis.tickCount ?? Math.max(2, Math.floor(plot.width / 90)), locale);
  const angle = axis.labelAngle ?? (scale.kind === 'band' && ticks.length > 10 ? -35 : 0);

  nodes.push(
    line(
      'axis-x:line',
      plot.x,
      axisY,
      plot.x + plot.width,
      axisY,
      theme.colors.axis,
      theme.axis.lineWidth,
      100,
    ),
  );

  ticks.forEach((tick, index) => {
    if (axis.grid !== false) {
      nodes.push(
        line(
          `axis-x:grid:${index}`,
          tick.position,
          plot.y,
          tick.position,
          axisY,
          theme.colors.grid,
          theme.axis.gridLineWidth,
          -20,
        ),
      );
    }
    nodes.push(
      line(
        `axis-x:tick:${index}`,
        tick.position,
        axisY,
        tick.position,
        axisY + theme.axis.tickLength,
        theme.colors.axis,
        theme.axis.lineWidth,
        100,
      ),
    );
    nodes.push(
      text(
        `axis-x:label:${index}`,
        tick.position,
        axisY + theme.axis.tickLength + theme.axis.labelPadding,
        tick.label,
        theme,
        {
          align: angle === 0 ? 'center' : 'right',
          baseline: 'top',
          rotation: angle,
        },
      ),
    );
  });

  if (axis.title !== '' && title !== '') {
    nodes.push(
      text('axis-x:title', plot.x + plot.width / 2, axisY + 34, axis.title ?? title, theme, {
        align: 'center',
        baseline: 'top',
        fontWeight: 600,
      }),
    );
  }
  return nodes;
}

export function compileYAxis(context: AxisContext): readonly SceneNode[] {
  const { axis, scale, plot, theme, locale, title } = context;
  if (axis === false || axis.visible === false) return [];
  const nodes: SceneNode[] = [];
  const axisX = plot.x;
  const ticks = scale.ticks(axis.tickCount ?? Math.max(2, Math.floor(plot.height / 60)), locale);

  nodes.push(
    line(
      'axis-y:line',
      axisX,
      plot.y,
      axisX,
      plot.y + plot.height,
      theme.colors.axis,
      theme.axis.lineWidth,
      100,
    ),
  );

  ticks.forEach((tick, index) => {
    if (axis.grid !== false) {
      nodes.push(
        line(
          `axis-y:grid:${index}`,
          axisX,
          tick.position,
          plot.x + plot.width,
          tick.position,
          theme.colors.grid,
          theme.axis.gridLineWidth,
          -20,
        ),
      );
    }
    nodes.push(
      line(
        `axis-y:tick:${index}`,
        axisX - theme.axis.tickLength,
        tick.position,
        axisX,
        tick.position,
        theme.colors.axis,
        theme.axis.lineWidth,
        100,
      ),
    );
    nodes.push(
      text(
        `axis-y:label:${index}`,
        axisX - theme.axis.tickLength - theme.axis.labelPadding,
        tick.position,
        tick.label,
        theme,
        { align: 'right', baseline: 'middle' },
      ),
    );
  });

  if (axis.title !== '' && title !== '') {
    nodes.push(
      text('axis-y:title', Math.max(12, axisX - 46), plot.y + plot.height / 2, axis.title ?? title, theme, {
        align: 'center',
        baseline: 'middle',
        rotation: -90,
        fontWeight: 600,
      }),
    );
  }
  return nodes;
}
