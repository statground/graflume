import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { compile } from '../dist/graflume.js';
import {
  applySnapshotTheme,
  assertAllRequestedSnapshotsRendered,
  checkOnly,
  includeSnapshot,
  snapshotOutputDirectory,
  snapshotTheme,
  snapshotThemeLabel,
} from './snapshot-theme-options.mjs';

const outputDirectory = snapshotOutputDirectory(import.meta.url, 'charts');

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function number(value) {
  return Number(value.toFixed(3));
}

function attributes(values) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${escapeXml(value)}"`)
    .join('');
}

function opacity(node) {
  return node.opacity === 1 ? undefined : number(node.opacity);
}

function dash(node) {
  return node.dash === undefined || node.dash.length === 0 ? undefined : node.dash.join(' ');
}

function textAnchor(align) {
  if (align === 'center') return 'middle';
  if (align === 'right' || align === 'end') return 'end';
  return 'start';
}

function dominantBaseline(baseline) {
  if (baseline === 'top' || baseline === 'hanging') return 'text-before-edge';
  if (baseline === 'middle') return 'central';
  if (baseline === 'bottom' || baseline === 'ideographic') return 'text-after-edge';
  return 'alphabetic';
}

function renderScene(scene) {
  const clipDefinitions = [];
  let clipIndex = 0;

  function renderNode(node) {
    if (!node.visible || node.opacity <= 0) return '';

    const common = {
      'data-scene-node': node.id,
      opacity: opacity(node),
    };

    if (node.type === 'group') {
      const children = [...node.children]
        .sort((left, right) => left.zIndex - right.zIndex)
        .map(renderNode)
        .join('');
      let clipPath;
      if (node.clip !== undefined) {
        clipIndex += 1;
        const id = `clip-${clipIndex}`;
        clipDefinitions.push(
          `<clipPath id="${id}"><rect${attributes({
            x: number(node.clip.x),
            y: number(node.clip.y),
            width: number(node.clip.width),
            height: number(node.clip.height),
          })}/></clipPath>`,
        );
        clipPath = `url(#${id})`;
      }
      return `<g${attributes({ ...common, 'clip-path': clipPath })}>${children}</g>`;
    }

    if (node.type === 'line') {
      return `<line${attributes({
        ...common,
        x1: number(node.x1),
        y1: number(node.y1),
        x2: number(node.x2),
        y2: number(node.y2),
        fill: 'none',
        stroke: node.stroke,
        'stroke-width': number(node.lineWidth),
        'stroke-dasharray': dash(node),
        'stroke-linecap': node.lineCap,
      })}/>`;
    }

    if (node.type === 'path') {
      const commands = [node.points, ...(node.subpaths ?? [])]
        .filter((points) => points.length > 0)
        .map(([first, ...remaining]) =>
          [
            `M ${number(first.x)} ${number(first.y)}`,
            ...remaining.map((point) => `L ${number(point.x)} ${number(point.y)}`),
            ...(node.closed ? ['Z'] : []),
          ].join(' '),
        )
        .join(' ');
      if (commands.length === 0) return '';
      return `<path${attributes({
        ...common,
        d: commands,
        fill: node.fill ?? 'none',
        'fill-rule': node.fillRule,
        stroke: node.stroke,
        'stroke-width': node.stroke === undefined ? undefined : number(node.lineWidth),
        'stroke-dasharray': dash(node),
        'stroke-linecap': node.lineCap,
        'stroke-linejoin': node.lineJoin,
      })}/>`;
    }

    if (node.type === 'rect') {
      const radius = Math.max(
        0,
        Math.min(node.cornerRadius, Math.abs(node.width) / 2, Math.abs(node.height) / 2),
      );
      return `<rect${attributes({
        ...common,
        x: number(node.x),
        y: number(node.y),
        width: number(node.width),
        height: number(node.height),
        rx: number(radius),
        fill: node.fill ?? 'none',
        stroke: node.stroke,
        'stroke-width': node.stroke === undefined ? undefined : number(node.lineWidth),
        'stroke-dasharray': dash(node),
      })}/>`;
    }

    if (node.type === 'circle') {
      return `<circle${attributes({
        ...common,
        cx: number(node.cx),
        cy: number(node.cy),
        r: number(node.radius),
        fill: node.fill ?? 'none',
        stroke: node.stroke,
        'stroke-width': node.stroke === undefined ? undefined : number(node.lineWidth),
      })}/>`;
    }

    const transform =
      node.rotation === 0
        ? undefined
        : `rotate(${number(node.rotation)} ${number(node.x)} ${number(node.y)})`;
    return `<text${attributes({
      ...common,
      x: number(node.x),
      y: number(node.y),
      fill: node.fill,
      'font-family': node.fontFamily,
      'font-size': number(node.fontSize),
      'font-weight': node.fontWeight,
      'font-style': node.fontStyle,
      'text-anchor': textAnchor(node.align),
      'dominant-baseline': dominantBaseline(node.baseline),
      transform,
    })}>${escapeXml(node.text)}</text>`;
  }

  const body = renderNode(scene.root);
  const description = scene.accessibility.description ?? scene.accessibility.label;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-labelledby="title description">`,
    `<title id="title">${escapeXml(scene.accessibility.label)}</title>`,
    `<desc id="description">${escapeXml(description)}</desc>`,
    '<metadata>Generated from the Graflume compile() Scene using Canvas-equivalent primitives.</metadata>',
    `<defs>${clipDefinitions.join('')}</defs>`,
    `<rect width="100%" height="100%" fill="${escapeXml(scene.background)}"/>`,
    body,
    '</svg>',
    '',
  ].join('\n');
}

function countSceneTypes(root) {
  const counts = new Map();
  const visit = (node) => {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    if (node.type === 'group') node.children.forEach(visit);
  };
  visit(root);
  return counts;
}

function encoding(field, type, title, grid = true) {
  return {
    field,
    type,
    title,
    axis: { grid, tickCount: 5 },
  };
}

const monthly = [
  { month: 'Jan', actual: 42, target: 38, visitors: 21 },
  { month: 'Feb', actual: 51, target: 47, visitors: 29 },
  { month: 'Mar', actual: 49, target: 52, visitors: 27 },
  { month: 'Apr', actual: 63, target: 58, visitors: 38 },
  { month: 'May', actual: 71, target: 65, visitors: 46 },
  { month: 'Jun', actual: 68, target: 70, visitors: 51 },
];

const study = [
  { hours: 1, score: 52 },
  { hours: 1.7, score: 58 },
  { hours: 2.4, score: 61 },
  { hours: 3.2, score: 70 },
  { hours: 4.1, score: 76 },
  { hours: 4.8, score: 83 },
  { hours: 5.9, score: 88 },
  { hours: 6.8, score: 92 },
];

const snapshots = [
  {
    filename: 'ggplot-theme.svg',
    width: 680,
    expected: { path: 1, circle: 6 },
    spec: {
      data: monthly,
      title: { text: 'Monthly sales trend', subtitle: 'Graflume ggplot theme' },
      theme: 'ggplot',
      mark: { type: 'line', point: true },
      x: { field: 'month', type: 'ordinal', title: 'Month' },
      y: {
        field: 'actual',
        type: 'quantitative',
        title: 'Sales',
        scale: { zero: false, nice: true },
      },
      accessibility: {
        label: 'Monthly sales rendered with the Graflume ggplot theme',
        description: 'A line and points appear on the ggplot2 grey panel with white grid lines.',
      },
    },
  },
  {
    filename: 'bar.svg',
    width: 680,
    expected: { rect: 6 },
    spec: {
      data: monthly,
      title: { text: 'Monthly sales by category', subtitle: 'Horizontal bar chart' },
      mark: {
        type: 'bar',
        orientation: 'horizontal',
        fill: '#4f46e5',
        cornerRadius: 7,
        opacity: 0.94,
      },
      x: {
        ...encoding('actual', 'quantitative', 'Sales'),
        scale: { zero: true, nice: true },
      },
      y: encoding('month', 'ordinal', 'Month', false),
      accessibility: {
        label: 'Monthly sales bar chart',
        description: 'Six horizontal bars compare sales from January through June.',
      },
    },
  },
  {
    filename: 'line.svg',
    width: 680,
    expected: { path: 1, circle: 6 },
    spec: {
      data: monthly,
      title: { text: 'Monthly sales trend', subtitle: 'Line chart with points' },
      mark: {
        type: 'line',
        stroke: '#ea580c',
        fill: '#ffffff',
        lineWidth: 3,
        radius: 5,
        point: true,
      },
      x: encoding('month', 'ordinal', 'Month', false),
      y: {
        ...encoding('actual', 'quantitative', 'Sales'),
        scale: { zero: false, nice: true },
      },
      accessibility: {
        label: 'Monthly sales line chart',
        description: 'A connected line shows the sales trend from January through June.',
      },
    },
  },
  {
    filename: 'customization.svg',
    width: 680,
    expected: {},
    spec: {
      title: {
        text: 'Campaign performance',
        subtitle: 'Legend, reference band, highlight, and portable callout',
      },
      layers: [
        {
          id: 'actual',
          name: 'Actual',
          data: monthly,
          mark: { type: 'line', point: true, stroke: '#2563eb', lineWidth: 3 },
          x: encoding('month', 'ordinal', 'Month', false),
          y: encoding('actual', 'quantitative', 'Sales'),
        },
        {
          id: 'target',
          name: 'Target',
          data: monthly,
          mark: { type: 'line', point: true, stroke: '#f97316', lineWidth: 2 },
          x: encoding('month', 'ordinal', 'Month', false),
          y: encoding('target', 'quantitative', 'Sales'),
        },
      ],
      legend: { mode: 'layers', position: 'top', title: 'Series' },
      highlights: [
        {
          id: 'campaign-window',
          target: { type: 'range', x: { from: 'Mar', to: 'May' } },
          fill: '#818cf8',
          stroke: '#4f46e5',
          opacity: 0.12,
          dash: [6, 4],
        },
        {
          id: 'peak',
          target: { type: 'datum', layerId: 'actual', field: 'month', value: 'May' },
          fill: '#fef3c7',
          stroke: '#d97706',
          radius: 10,
        },
      ],
      annotations: [
        {
          id: 'launch-note',
          target: { type: 'datum', layerId: 'actual', field: 'month', value: 'Apr' },
          text: 'Campaign launched',
          detail: 'Runtime callouts use the same portable target.',
          placement: 'top',
          connector: true,
        },
      ],
      interaction: { selection: true },
      accessibility: {
        label: 'Campaign chart with legend, highlights, and callout',
      },
    },
  },
  {
    filename: 'area.svg',
    width: 680,
    expected: { path: 2 },
    spec: {
      data: monthly,
      title: { text: 'Monthly visitors', subtitle: 'Area filled to the zero baseline' },
      mark: {
        type: 'area',
        fill: '#ccfbf1',
        stroke: '#0f766e',
        lineWidth: 2.5,
        opacity: 0.9,
      },
      x: encoding('month', 'ordinal', 'Month', false),
      y: {
        ...encoding('visitors', 'quantitative', 'Visitors (thousands)'),
        scale: { zero: true, nice: true },
      },
      accessibility: {
        label: 'Monthly visitors area chart',
        description: 'The filled area shows visitor growth from January through June.',
      },
    },
  },
  {
    filename: 'scatter.svg',
    width: 680,
    expected: { circle: 8 },
    spec: {
      data: study,
      title: { text: 'Study time and score', subtitle: '8 observations' },
      mark: {
        type: 'point',
        fill: '#7c3aed',
        stroke: '#ffffff',
        lineWidth: 2,
        radius: 7,
        opacity: 0.88,
      },
      x: {
        ...encoding('hours', 'quantitative', 'Study time (hours)'),
        scale: { zero: true, nice: true },
      },
      y: {
        ...encoding('score', 'quantitative', 'Score'),
        scale: { zero: false, nice: true },
      },
      accessibility: {
        label: 'Study time and score scatter chart',
        description: 'Eight points show higher scores as study time increases.',
      },
    },
  },
  {
    filename: 'combination.svg',
    width: 960,
    expected: { rect: 6, path: 1, circle: 6 },
    spec: {
      data: monthly,
      title: {
        text: 'Target and actual sales',
        subtitle: 'bar + line + point shared-scale composition',
      },
      layers: [
        {
          id: 'target',
          mark: { type: 'bar', fill: '#cbd5e1', cornerRadius: 7, opacity: 0.72 },
          x: encoding('month', 'ordinal', 'Month', false),
          y: {
            ...encoding('target', 'quantitative', 'Sales'),
            scale: { zero: true, nice: true },
          },
        },
        {
          id: 'actual',
          mark: {
            type: 'line',
            point: true,
            stroke: '#e05260',
            fill: '#ffffff',
            lineWidth: 3,
            radius: 5,
          },
          x: encoding('month', 'ordinal', 'Month', false),
          y: {
            ...encoding('actual', 'quantitative', 'Sales'),
            scale: { zero: true, nice: true },
          },
        },
      ],
      accessibility: {
        label: 'Monthly target and actual sales combination chart',
        description: 'Target bars are overlaid with an actual-sales line and points.',
      },
    },
  },
  {
    filename: 'annotation.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { date: '2026-01-01', value: 22, annotation: 'Launch' },
        { date: '2026-02-01', value: 31, annotation: null },
        { date: '2026-03-01', value: 27, annotation: 'Campaign' },
        { date: '2026-04-01', value: 43, annotation: null },
      ],
      title: { text: 'Annotated revenue', subtitle: 'Events attached to a time series' },
      mark: {
        type: 'annotation',
        fields: { annotation: 'annotation' },
        point: true,
        stroke: '#4f46e5',
      },
      x: encoding('date', 'temporal', 'Date', false),
      y: encoding('value', 'quantitative', 'Revenue'),
      accessibility: { label: 'Annotated revenue chart' },
    },
  },
  {
    filename: 'annotated-timeline.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { date: '2026-01-01', value: 18, note: 'Start' },
        { date: '2026-02-01', value: 25, note: null },
        { date: '2026-03-01', value: 39, note: 'Milestone' },
        { date: '2026-04-01', value: 34, note: null },
      ],
      title: { text: 'Annotated timeline', subtitle: 'Compatibility form of the annotation mark' },
      mark: { type: 'annotation', fields: { annotation: 'note' }, stroke: '#7c3aed' },
      x: encoding('date', 'temporal', 'Date', false),
      y: encoding('value', 'quantitative', 'Value'),
      accessibility: { label: 'Annotated timeline chart' },
    },
  },
  {
    filename: 'bubble.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { x: 12, y: 42, size: 20, group: 'A' },
        { x: 24, y: 55, size: 85, group: 'B' },
        { x: 38, y: 33, size: 55, group: 'A' },
        { x: 51, y: 68, size: 120, group: 'C' },
      ],
      title: { text: 'Portfolio opportunity', subtitle: 'Position, group, and magnitude' },
      mark: {
        type: 'bubble',
        fields: { size: 'size', color: 'group' },
        options: { minRadius: 7, maxRadius: 27 },
      },
      x: encoding('x', 'quantitative', 'Reach'),
      y: encoding('y', 'quantitative', 'Impact'),
      accessibility: { label: 'Portfolio bubble chart' },
    },
  },
  {
    filename: 'calendar.svg',
    width: 680,
    expected: {},
    spec: {
      data: Array.from({ length: 56 }, (_, index) => ({
        date: new Date(Date.UTC(2026, 0, index + 1)),
        value: (index * 13) % 47,
      })),
      title: { text: 'Daily activity', subtitle: 'Eight weeks of calendar cells' },
      mark: 'calendar',
      x: { field: 'date', type: 'temporal' },
      y: { field: 'value', type: 'quantitative' },
      accessibility: { label: 'Daily activity calendar chart' },
    },
  },
  {
    filename: 'candlestick.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { day: 'Mon', open: 42, high: 51, low: 39, close: 48 },
        { day: 'Tue', open: 48, high: 53, low: 43, close: 45 },
        { day: 'Wed', open: 45, high: 57, low: 44, close: 54 },
        { day: 'Thu', open: 54, high: 56, low: 47, close: 49 },
        { day: 'Fri', open: 49, high: 61, low: 48, close: 58 },
      ],
      title: { text: 'Weekly OHLC', subtitle: 'Open, high, low, and close' },
      mark: {
        type: 'candlestick',
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
      },
      x: encoding('day', 'ordinal', 'Day', false),
      y: encoding('close', 'quantitative', 'Price'),
      accessibility: { label: 'Weekly candlestick chart' },
    },
  },
  {
    filename: 'column.svg',
    width: 680,
    expected: { rect: 6 },
    spec: {
      data: monthly,
      title: { text: 'Monthly sales', subtitle: 'Vertical column chart' },
      mark: { type: 'bar', orientation: 'vertical', fill: '#4f46e5', cornerRadius: 7 },
      x: encoding('month', 'ordinal', 'Month', false),
      y: { ...encoding('actual', 'quantitative', 'Sales'), scale: { zero: true, nice: true } },
      accessibility: { label: 'Monthly sales column chart' },
    },
  },
  {
    filename: 'diff.svg',
    width: 680,
    expected: {},
    spec: {
      data: monthly.map((row) => ({
        ...row,
        previous: row.actual - (row.month === 'Mar' ? -5 : 7),
      })),
      title: { text: 'Before and after', subtitle: 'Current bars over previous values' },
      mark: { type: 'diff', fields: { old: 'previous', new: 'actual' } },
      x: encoding('month', 'ordinal', 'Month', false),
      y: encoding('actual', 'quantitative', 'Sales'),
      accessibility: { label: 'Before and after diff chart' },
    },
  },
  {
    filename: 'donut.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { channel: 'Search', value: 46 },
        { channel: 'Direct', value: 28 },
        { channel: 'Social', value: 17 },
        { channel: 'Other', value: 9 },
      ],
      title: { text: 'Traffic share', subtitle: 'Donut chart' },
      mark: { type: 'pie', options: { innerRadius: 0.56 } },
      x: { field: 'channel', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      accessibility: { label: 'Traffic share donut chart' },
    },
  },
  {
    filename: 'gantt.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        {
          id: 'research',
          task: 'Research',
          start: '2026-01-01',
          end: '2026-01-07',
          progress: 100,
          dependencies: '',
        },
        {
          id: 'design',
          task: 'Design',
          start: '2026-01-06',
          end: '2026-01-14',
          progress: 80,
          dependencies: 'research',
        },
        {
          id: 'build',
          task: 'Build',
          start: '2026-01-13',
          end: '2026-01-27',
          progress: 45,
          dependencies: 'design',
        },
        {
          id: 'ship',
          task: 'Ship',
          start: '2026-01-27',
          end: '2026-01-30',
          progress: 0,
          dependencies: 'build',
        },
      ],
      title: { text: 'Release plan', subtitle: 'Tasks, progress, and dependencies' },
      mark: {
        type: 'gantt',
        fields: { id: 'id', end: 'end', progress: 'progress', dependencies: 'dependencies' },
      },
      x: encoding('start', 'temporal', 'Date'),
      y: encoding('task', 'ordinal', 'Task', false),
      accessibility: { label: 'Release plan Gantt chart' },
    },
  },
  {
    filename: 'gauge.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { metric: 'CPU', value: 68 },
        { metric: 'Memory', value: 44 },
        { metric: 'SLA', value: 91 },
      ],
      title: { text: 'Service health', subtitle: 'Three semicircular gauges' },
      mark: { type: 'gauge', options: { min: 0, max: 100 } },
      x: { field: 'metric', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      accessibility: { label: 'Service health gauge chart' },
    },
  },
  {
    filename: 'geo.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { region: 'KR', value: 72 },
        { region: 'US', value: 88 },
        { region: 'BR', value: 41 },
        { region: 'RU', value: 63 },
        { region: 'AU', value: 35 },
      ],
      title: {
        text: 'Regional activity',
        subtitle: 'Known region centroids on the built-in world outline',
      },
      mark: 'geo',
      x: { field: 'region', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      accessibility: { label: 'Regional activity geo chart' },
    },
  },
  {
    filename: 'histogram.svg',
    width: 680,
    expected: {},
    spec: {
      data: Array.from({ length: 80 }, (_, index) => ({
        score: 42 + ((index * 17) % 49) + Math.sin(index) * 5,
      })),
      title: { text: 'Score distribution', subtitle: 'Ten computed bins' },
      mark: { type: 'histogram', options: { bins: 10 } },
      x: encoding('score', 'quantitative', 'Score'),
      y: encoding('score', 'quantitative', 'Count'),
      accessibility: { label: 'Score distribution histogram' },
    },
  },
  {
    filename: 'intervals.svg',
    width: 680,
    expected: {},
    spec: {
      data: monthly.map((row) => ({ ...row, low: row.actual - 7, high: row.actual + 8 })),
      title: { text: 'Estimate with intervals', subtitle: 'Low, central, and high values' },
      mark: {
        type: 'interval',
        fields: { low: 'low', high: 'high' },
        fill: '#ffffff',
        stroke: '#7c3aed',
      },
      x: encoding('month', 'ordinal', 'Month', false),
      y: encoding('actual', 'quantitative', 'Estimate'),
      accessibility: { label: 'Estimate interval chart' },
    },
  },
  {
    filename: 'map.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { city: 'Seoul', longitude: 126.98, latitude: 37.57, size: 88 },
        { city: 'Moscow', longitude: 37.62, latitude: 55.75, size: 74 },
        { city: 'Singapore', longitude: 103.82, latitude: 1.35, size: 52 },
        { city: 'San Francisco', longitude: -122.42, latitude: 37.77, size: 68 },
      ],
      title: { text: 'City locations', subtitle: 'Longitude and latitude markers' },
      mark: { type: 'map', fields: { size: 'size' } },
      x: { field: 'longitude', type: 'quantitative' },
      y: { field: 'latitude', type: 'quantitative' },
      accessibility: { label: 'City marker map' },
    },
  },
  {
    filename: 'motion.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { name: 'A', x: 12, y: 30, size: 40, time: '2025' },
        { name: 'B', x: 28, y: 48, size: 75, time: '2025' },
        { name: 'A', x: 23, y: 42, size: 58, time: '2026' },
        { name: 'B', x: 41, y: 62, size: 100, time: '2026' },
      ],
      title: { text: 'Motion frame: 2026', subtitle: 'Frame-filtered bubble scene' },
      mark: {
        type: 'motion',
        fields: { size: 'size', color: 'name', time: 'time' },
        options: { frame: '2026' },
      },
      x: encoding('x', 'quantitative', 'Reach'),
      y: encoding('y', 'quantitative', 'Impact'),
      accessibility: { label: 'Motion chart frame for 2026' },
    },
  },
  {
    filename: 'org.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { person: 'CEO', manager: '' },
        { person: 'Data', manager: 'CEO' },
        { person: 'Product', manager: 'CEO' },
        { person: 'Platform', manager: 'Data' },
        { person: 'Analytics', manager: 'Data' },
      ],
      title: { text: 'Organization', subtitle: 'Parent-child hierarchy' },
      mark: { type: 'org', fields: { parent: 'manager' } },
      x: { field: 'person', type: 'nominal' },
      y: { field: 'manager', type: 'nominal' },
      accessibility: { label: 'Organization chart' },
    },
  },
  {
    filename: 'pie.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { channel: 'Search', value: 46 },
        { channel: 'Direct', value: 28 },
        { channel: 'Social', value: 17 },
        { channel: 'Other', value: 9 },
      ],
      title: { text: 'Traffic share', subtitle: 'Pie chart' },
      mark: 'pie',
      x: { field: 'channel', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      accessibility: { label: 'Traffic share pie chart' },
    },
  },
  {
    filename: 'sankey.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { source: 'Visits', target: 'Signup', value: 70 },
        { source: 'Visits', target: 'Leave', value: 30 },
        { source: 'Ads', target: 'Signup', value: 35 },
        { source: 'Ads', target: 'Leave', value: 15 },
      ],
      title: { text: 'Acquisition flow', subtitle: 'Source, target, and weighted links' },
      mark: { type: 'sankey', fields: { target: 'target' } },
      x: { field: 'source', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      accessibility: { label: 'Acquisition Sankey diagram' },
    },
  },
  {
    filename: 'stepped-area.svg',
    width: 680,
    expected: {},
    spec: {
      data: monthly,
      title: { text: 'Inventory level', subtitle: 'Step-after area transitions' },
      mark: { type: 'stepped-area', fill: '#dbeafe', stroke: '#4f46e5', opacity: 0.9 },
      x: encoding('month', 'ordinal', 'Month', false),
      y: { ...encoding('actual', 'quantitative', 'Units'), scale: { zero: true } },
      accessibility: { label: 'Inventory stepped area chart' },
    },
  },
  {
    filename: 'table.svg',
    width: 680,
    expected: {},
    spec: {
      data: monthly,
      title: { text: 'Monthly detail', subtitle: 'Canvas-rendered table rows' },
      mark: { type: 'table', options: { columns: ['month', 'actual', 'target', 'visitors'] } },
      x: { field: 'month', type: 'ordinal' },
      y: { field: 'actual', type: 'quantitative' },
      accessibility: { label: 'Monthly detail table chart' },
    },
  },
  {
    filename: 'timeline.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { row: 'Team A', start: '2026-01-01', end: '2026-01-08' },
        { row: 'Team B', start: '2026-01-04', end: '2026-01-15' },
        { row: 'Team C', start: '2026-01-11', end: '2026-01-22' },
      ],
      title: { text: 'Resource timeline', subtitle: 'Start and end intervals by row' },
      mark: { type: 'timeline', fields: { end: 'end' } },
      x: encoding('start', 'temporal', 'Date'),
      y: encoding('row', 'ordinal', 'Team', false),
      accessibility: { label: 'Resource timeline chart' },
    },
  },
  {
    filename: 'treemap.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { product: 'Core', value: 44 },
        { product: 'Cloud', value: 28 },
        { product: 'Mobile', value: 18 },
        { product: 'Other', value: 10 },
      ],
      title: { text: 'Product mix', subtitle: 'Area proportional to value' },
      mark: 'treemap',
      x: { field: 'product', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      accessibility: { label: 'Product mix treemap' },
    },
  },
  {
    filename: 'trendline.svg',
    width: 680,
    expected: {},
    spec: {
      data: study,
      title: { text: 'Study score regression', subtitle: 'Points with a linear trendline' },
      mark: { type: 'trendline', fill: '#7c3aed', stroke: '#e05260', radius: 6 },
      x: encoding('hours', 'quantitative', 'Hours'),
      y: encoding('score', 'quantitative', 'Score'),
      accessibility: { label: 'Study score trendline chart' },
    },
  },
  {
    filename: 'vega.svg',
    width: 680,
    expected: {},
    spec: {
      data: monthly,
      title: { text: 'VegaChart adapter', subtitle: 'Safe embedded mark subset: line' },
      mark: { type: 'vega', options: { mark: 'line' }, point: true, stroke: '#0f766e' },
      x: encoding('month', 'ordinal', 'Month', false),
      y: encoding('actual', 'quantitative', 'Sales'),
      accessibility: { label: 'VegaChart adapter line chart' },
    },
  },
  {
    filename: 'waterfall.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { step: 'Start', delta: 40 },
        { step: 'Sales', delta: 22 },
        { step: 'Returns', delta: -8 },
        { step: 'Costs', delta: -19 },
        { step: 'Growth', delta: 14 },
      ],
      title: { text: 'Profit bridge', subtitle: 'Cumulative positive and negative changes' },
      mark: 'waterfall',
      x: encoding('step', 'ordinal', 'Step', false),
      y: encoding('delta', 'quantitative', 'Change'),
      accessibility: { label: 'Profit waterfall chart' },
    },
  },
  {
    filename: 'word-tree.svg',
    width: 680,
    expected: {},
    spec: {
      data: [
        { word: 'Data', parent: '', weight: 14 },
        { word: 'Charts', parent: 'Data', weight: 10 },
        { word: 'Stories', parent: 'Data', weight: 8 },
        { word: 'Reveal', parent: 'Charts', weight: 6 },
        { word: 'Explain', parent: 'Stories', weight: 5 },
      ],
      title: { text: 'Word relationships', subtitle: 'Explicit weighted word tree' },
      mark: { type: 'word-tree', fields: { parent: 'parent' } },
      x: { field: 'word', type: 'nominal' },
      y: { field: 'weight', type: 'quantitative' },
      accessibility: { label: 'Weighted word tree' },
    },
  },
];

for (const [source, filename] of [
  ['diff.svg', 'difference.svg'],
  ['intervals.svg', 'interval.svg'],
  ['treemap.svg', 'hierarchy.svg'],
  ['sankey.svg', 'flow.svg'],
]) {
  const representative = snapshots.find((snapshot) => snapshot.filename === source);
  assert.ok(representative, `${source} representative exists`);
  snapshots.push({ ...representative, filename });
}

await mkdir(outputDirectory, { recursive: true });
const selectedSnapshots = snapshots.filter((snapshot) => includeSnapshot(snapshot.filename));
assertAllRequestedSnapshotsRendered(selectedSnapshots.map((snapshot) => snapshot.filename));
for (const snapshot of selectedSnapshots) {
  const { scene } = compile(applySnapshotTheme(snapshot.spec), {
    width: snapshot.width,
    height: 400,
  });
  const counts = countSceneTypes(scene.root);
  for (const [type, expectedCount] of Object.entries(snapshot.expected)) {
    if (snapshotTheme === null) {
      assert.equal(
        counts.get(type),
        expectedCount,
        `${snapshot.filename}: unexpected ${type} count`,
      );
    } else {
      assert.ok(
        (counts.get(type) ?? 0) >= expectedCount,
        `${snapshot.filename}: expected at least ${expectedCount} ${type} nodes`,
      );
    }
  }
  const markup = renderScene(scene);
  assert.doesNotMatch(markup, /(?:NaN|undefined)/, `${snapshot.filename}: invalid SVG value`);
  const destination = new URL(snapshot.filename, outputDirectory);
  if (checkOnly) {
    const current = await readFile(destination, 'utf8').catch(() => '');
    assert.equal(
      current,
      markup,
      `${snapshot.filename} is stale; run npm run docs:snapshots and commit the result`,
    );
  } else {
    await writeFile(destination, markup, 'utf8');
  }
}

console.log(
  `${checkOnly ? 'Verified' : 'Rendered'} ${selectedSnapshots.length} chart guide snapshots${snapshotThemeLabel()} from Graflume Scenes.`,
);
