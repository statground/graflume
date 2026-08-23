const trend = Array.from({ length: 10 }, (_, index) => ({
  date: `2026-${String(index + 1).padStart(2, '0')}-01`,
  category: `P${index + 1}`,
  value: 24 + Math.sin(index * 0.72) * 7 + index * 1.3,
  low: 14 + index * 0.8,
  high: 33 + index * 1.1,
  lower: 16 + index * 0.8,
  upper: 31 + index,
  target: 29 + index,
  width: 3 + (index % 4),
  radius: 9 + index * 2,
  z: 5 + index,
  direction: (index * 37) % 360,
  magnitude: 5 + (index % 6) * 3,
  speed: 10 + index * 3,
  signal: 20 + index * 1.2,
  secondary: 18 + index,
  up: 42 + index * 2,
  down: 66 - index * 2,
  plus: 25 + index,
  minus: 34 - index * 0.6,
  conversion: 21 + index,
  base: 19 + index * 0.9,
  support: 14 + index * 0.8,
  resistance: 34 + index,
  volume: 120 + index * 31,
  price: 24 + index * 1.2,
  title: String.fromCharCode(65 + index),
  open: 22 + index,
  close: 23 + index + (index % 2 === 0 ? 2 : -2),
  previous: 20 + index * 0.8,
  series: index % 2 === 0 ? 'Alpha' : 'Beta',
}));

const relation = [
  { source: 'Input', target: 'Compiler', value: 9 },
  { source: 'Compiler', target: 'Scene', value: 8 },
  { source: 'Scene', target: 'Canvas', value: 6 },
  { source: 'Scene', target: 'Vector', value: 4 },
];

const hierarchy = [
  { id: 'All', parent: '', value: 12 },
  { id: 'Data', parent: 'All', value: 8 },
  { id: 'Design', parent: 'All', value: 7 },
  { id: 'Runtime', parent: 'Data', value: 5 },
];

const geo = [
  { longitude: 126.98, latitude: 37.57, longitude2: 37.62, latitude2: 55.75, value: 72 },
  { longitude: -74, latitude: 40.71, longitude2: 2.35, latitude2: 48.86, value: 55 },
  { longitude: 139.69, latitude: 35.68, longitude2: 151.21, latitude2: -33.87, value: 43 },
];

const grid = Array.from({ length: 30 }, (_, index) => {
  const x = index % 6;
  const y = Math.floor(index / 6);
  const primary = 72 * Math.exp(-((x - 2.2) ** 2 + (y - 1.7) ** 2) / 3.2);
  const secondary = 34 * Math.exp(-((x - 4.7) ** 2 + (y - 3.3) ** 2) / 1.8);
  return { x, y, value: primary + secondary + 4 };
});

const points = [
  { x: 12, y: 42, size: 20, group: 'A', z: 8 },
  { x: 24, y: 55, size: 85, group: 'B', z: 14 },
  { x: 38, y: 33, size: 55, group: 'A', z: 21 },
  { x: 51, y: 68, size: 120, group: 'C', z: 17 },
];

const timeline = [
  { id: 'research', task: 'Research', start: '2026-01-01', end: '2026-01-07', progress: 100 },
  { id: 'design', task: 'Design', start: '2026-01-06', end: '2026-01-14', progress: 80 },
  { id: 'build', task: 'Build', start: '2026-01-13', end: '2026-01-27', progress: 45 },
];

const composition = [
  { category: 'Search', value: 46, radius: 32 },
  { category: 'Direct', value: 28, radius: 24 },
  { category: 'Social', value: 17, radius: 18 },
  { category: 'Other', value: 9, radius: 12 },
];

const radar = [
  { indicator: 'Speed', series: 'Alpha', value: 82 },
  { indicator: 'Quality', series: 'Alpha', value: 74 },
  { indicator: 'Reach', series: 'Alpha', value: 91 },
  { indicator: 'Speed', series: 'Beta', value: 66 },
  { indicator: 'Quality', series: 'Beta', value: 88 },
  { indicator: 'Reach', series: 'Beta', value: 69 },
];

const boxSummary = [
  { category: 'Alpha', low: 12, q1: 19, median: 27, q3: 34, high: 43 },
  { category: 'Beta', low: 17, q1: 24, median: 31, q3: 39, high: 48 },
  { category: 'Gamma', low: 9, q1: 16, median: 22, q3: 29, high: 38 },
];

const words = [
  { word: 'Analytics', weight: 92, parent: '' },
  { word: 'Canvas', weight: 76, parent: 'Analytics' },
  { word: 'Portable', weight: 69, parent: 'Analytics' },
  { word: 'Scene', weight: 61, parent: 'Canvas' },
  { word: 'Scale', weight: 53, parent: 'Canvas' },
  { word: 'Theme', weight: 47, parent: 'Portable' },
];

function fieldType(field) {
  if (field === 'date' || field === 'start') return 'temporal';
  if (
    [
      'category',
      'source',
      'id',
      'parent',
      'word',
      'task',
      'region',
      'indicator',
      'name',
      'series',
    ].includes(field)
  )
    return 'ordinal';
  return 'quantitative';
}

function base(mark, data = trend, x = 'category', y = 'value') {
  return {
    data,
    mark,
    x: { field: x, type: fieldType(x), title: x },
    y: { field: y, type: fieldType(y), title: y },
  };
}

export function seriesSampleSpec(entry) {
  const { id, mark, name } = entry;
  const familyId = entry.familyId ?? id;
  const category = entry.category ?? 'general';
  let spec;
  if (mark === 'annotation') {
    spec = base(
      { type: mark, fields: { annotation: 'annotation' }, point: true },
      [
        { date: '2026-01-01', value: 22, annotation: 'Launch' },
        { date: '2026-02-01', value: 31, annotation: null },
        { date: '2026-03-01', value: 27, annotation: 'Campaign' },
        { date: '2026-04-01', value: 43, annotation: null },
      ],
      'date',
      'value',
    );
  } else if (
    mark === 'area' ||
    mark === 'stepped-area' ||
    mark === 'line' ||
    mark === 'trendline'
  ) {
    spec = base({ type: mark, point: mark === 'line' || mark === 'trendline' });
  } else if (mark === 'bar') {
    spec = base({
      type: mark,
      orientation: id === 'bar' ? 'horizontal' : 'vertical',
      cornerRadius: 6,
    });
  } else if (mark === 'boxplot') {
    spec = base(
      { type: mark, fields: { low: 'low', q1: 'q1', median: 'median', q3: 'q3', high: 'high' } },
      boxSummary,
    );
  } else if (mark === 'bubble' || mark === 'effect-scatter') {
    spec = base({ type: mark, fields: { size: 'size', color: 'group' } }, points, 'x', 'y');
  } else if (mark === 'calendar') {
    spec = base(
      mark,
      Array.from({ length: 28 }, (_, index) => ({
        date: `2026-01-${String(index + 1).padStart(2, '0')}`,
        value: (index * 13) % 47,
      })),
      'date',
      'value',
    );
  } else if (mark === 'candlestick') {
    spec = base(
      { type: mark, fields: { open: 'open', high: 'high', low: 'low', close: 'close' } },
      trend,
      'date',
      'close',
    );
  } else if (mark === 'multiple') {
    spec = {
      data: trend,
      layers: [
        {
          id: 'volume',
          mark: { type: 'bar', fill: '#cbd5e1', opacity: 0.72 },
          x: { field: 'category', type: 'ordinal' },
          y: { field: 'target', type: 'quantitative' },
        },
        {
          id: 'actual',
          mark: { type: 'line', point: true, stroke: '#e05260' },
          x: { field: 'category', type: 'ordinal' },
          y: { field: 'value', type: 'quantitative' },
        },
      ],
    };
  } else if (mark === 'diff') {
    spec = base({ type: mark, fields: { old: 'previous', new: 'value' } });
  } else if (mark === 'funnel') {
    spec = base(
      { type: mark, options: { mode: entry.mode === 'area' ? 'area' : 'default' } },
      composition,
    );
  } else if (mark === 'gantt') {
    spec = base(
      { type: mark, fields: { id: 'id', end: 'end', progress: 'progress' } },
      timeline,
      'start',
      'task',
    );
  } else if (mark === 'gauge') {
    spec = base(
      {
        type: mark,
        fields: { reference: 'previous', target: 'target' },
        options: { min: 0, max: 100, mode: entry.mode === 'default' ? 'angular' : entry.mode },
      },
      trend.slice(0, 3),
    );
  } else if (mark === 'geo') {
    spec = base(
      { type: mark, options: { mode: 'choropleth' } },
      [
        { region: 'KR', value: 72 },
        { region: 'United States', value: 88 },
        { region: 'Brazil', value: 41 },
        { region: 'RUS', value: 63 },
      ],
      'region',
      'value',
    );
  } else if (mark === 'heatmap') {
    spec = base(mark, grid, 'x', 'y');
  } else if (mark === 'histogram') {
    spec = base({ type: mark, options: { bins: 8 } }, trend, 'value', 'value');
  } else if (mark === 'motion') {
    spec = base(
      {
        type: mark,
        fields: { size: 'size', color: 'group', time: 'time' },
        options: { frame: '2026' },
      },
      points.flatMap((point, index) => [
        { ...point, time: '2025' },
        { ...point, x: point.x + 7 + index, y: point.y + 4, time: '2026' },
      ]),
      'x',
      'y',
    );
  } else if (mark === 'parallel') {
    const categorical = entry.mode === 'categories';
    spec = base(
      {
        type: mark,
        options: {
          mode: categorical ? 'categories' : 'coordinates',
          dimensions: categorical ? ['region', 'channel', 'outcome'] : ['speed', 'quality', 'cost'],
        },
      },
      categorical
        ? [
            { region: 'East', channel: 'Web', outcome: 'Won', value: 1 },
            { region: 'East', channel: 'Web', outcome: 'Won', value: 1 },
            { region: 'East', channel: 'Store', outcome: 'Lost', value: 1 },
            { region: 'West', channel: 'Web', outcome: 'Won', value: 1 },
            { region: 'West', channel: 'Store', outcome: 'Lost', value: 1 },
          ]
        : [
            { name: 'Alpha', speed: 82, quality: 74, cost: 61 },
            { name: 'Beta', speed: 66, quality: 88, cost: 73 },
            { name: 'Gamma', speed: 91, quality: 69, cost: 54 },
          ],
      categorical ? 'region' : 'name',
      categorical ? 'value' : 'speed',
    );
  } else if (mark === 'pie') {
    spec = base(
      { type: mark, options: id === 'donut' ? { innerRadius: 0.56 } : undefined },
      composition,
    );
  } else if (mark === 'point') {
    spec = base(mark, points, 'x', 'y');
  } else if (mark === 'radar') {
    spec = base({ type: mark, fields: { series: 'series' } }, radar, 'indicator', 'value');
  } else if (mark === 'polar') {
    spec = base(
      {
        type: mark,
        fields: { series: 'series' },
        options: { mode: entry.mode === 'default' ? 'line' : entry.mode, closed: true },
      },
      [
        { angle: 0, series: 'Alpha', value: 56 },
        { angle: 60, series: 'Alpha', value: 82 },
        { angle: 120, series: 'Alpha', value: 67 },
        { angle: 180, series: 'Alpha', value: 91 },
        { angle: 240, series: 'Alpha', value: 72 },
        { angle: 300, series: 'Alpha', value: 63 },
      ],
      'angle',
      'value',
    );
  } else if (mark === 'sankey' || mark === 'lines') {
    spec = base({ type: mark, fields: { target: 'target' } }, relation, 'source', 'value');
  } else if (mark === 'sunburst' || mark === 'treemap') {
    spec = base(
      {
        type: mark,
        fields: { parent: 'parent' },
        options: mark === 'treemap' && entry.mode === 'icicle' ? { mode: 'icicle' } : {},
      },
      hierarchy,
      'id',
      'value',
    );
  } else if (mark === 'table') {
    spec = base({ type: mark, options: { columns: ['category', 'value', 'target'] } });
  } else if (mark === 'waterfall') {
    spec = base(mark, [
      { category: 'Start', value: 40 },
      { category: 'Sales', value: 22 },
      { category: 'Returns', value: -8 },
      { category: 'Costs', value: -19 },
    ]);
  } else if (mark === 'word-tree') {
    spec = base({ type: mark, fields: { parent: 'parent' } }, words, 'word', 'weight');
  } else if (mark === 'vega') {
    spec = base({ type: mark, options: { mark: 'line' }, point: true });
  } else if (mark === 'custom') {
    spec = base(
      { type: mark, fields: { shape: 'shape', size: 'size', label: 'label' } },
      points.map((point, index) => ({
        ...point,
        shape: index % 2 === 0 ? 'circle' : 'diamond',
        label: `P${index + 1}`,
      })),
      'x',
      'y',
    );
  } else if (mark === 'arc-diagram' || mark === 'chord' || mark === 'graph') {
    spec = base({ type: mark, fields: { target: 'target', value: 'value' } }, relation, 'source');
  } else if (mark === 'org' || mark === 'tree') {
    spec = base({ type: mark, fields: { parent: 'parent' } }, hierarchy, 'id', 'value');
  } else if (mark === 'range') {
    const mode = id.includes('column') ? 'column' : id === 'dumbbell' ? 'dumbbell' : 'area';
    spec = base({
      type: mark,
      fields: { low: 'low', high: 'high' },
      options: { mode, smooth: id.includes('spline') },
    });
  } else if (mark === 'smooth') {
    spec = base({ type: mark, point: true, options: { area: id.includes('area') } });
  } else if (mark === 'distribution') {
    const mode = entry.mode === 'default' ? 'histogram' : entry.mode;
    if (mode === 'histogram-2d' || mode === 'histogram-2d-contour') {
      spec = base(
        { type: mark, options: { mode, binsX: 6, binsY: 5, levels: 4 } },
        grid.flatMap((row, index) =>
          Array.from({ length: 1 + (index % 5) }, () => ({ x: row.x, y: row.y })),
        ),
        'x',
        'y',
      );
    } else {
      const violinMode = mode === 'violin';
      spec = base(
        {
          type: mark,
          fields: { group: 'series', value: 'value' },
          options: { mode: mode === 'bell-curve' ? 'curve' : mode },
        },
        trend,
        violinMode ? 'series' : 'value',
        'value',
      );
    }
  } else if (mark === 'image') {
    spec = base(
      { type: mark, fields: { red: 'red', green: 'green', blue: 'blue' } },
      Array.from({ length: 30 }, (_, index) => ({
        x: index % 6,
        y: Math.floor(index / 6),
        red: 38 + (index % 6) * 35,
        green: 72 + Math.floor(index / 6) * 32,
        blue: 210 - (index % 5) * 24,
      })),
      'x',
      'y',
    );
  } else if (mark === 'ternary') {
    spec = base(
      { type: mark, fields: { c: 'c', series: 'series' }, options: { mode: 'line' } },
      [
        { a: 65, b: 25, c: 10, series: 'Mix' },
        { a: 42, b: 38, c: 20, series: 'Mix' },
        { a: 24, b: 31, c: 45, series: 'Mix' },
        { a: 12, b: 58, c: 30, series: 'Mix' },
      ],
      'a',
      'b',
    );
  } else if (mark === 'smith') {
    spec = base(
      { type: mark, options: { mode: 'line' } },
      [
        { real: 0.15, imaginary: -1.4 },
        { real: 0.35, imaginary: -0.6 },
        { real: 0.8, imaginary: 0 },
        { real: 1.5, imaginary: 0.7 },
        { real: 2.6, imaginary: 1.4 },
      ],
      'real',
      'imaginary',
    );
  } else if (mark === 'scatter-matrix') {
    spec = base(
      { type: mark, options: { dimensions: ['speed', 'quality', 'cost'] } },
      [
        { speed: 82, quality: 74, cost: 61 },
        { speed: 66, quality: 88, cost: 73 },
        { speed: 91, quality: 69, cost: 54 },
        { speed: 75, quality: 81, cost: 67 },
      ],
      'speed',
      'quality',
    );
  } else if (mark === 'carpet') {
    spec = base(
      {
        type: mark,
        fields: { x: 'px', y: 'py', value: 'value' },
        options: { mode: entry.mode === 'default' ? 'grid' : entry.mode, levels: 4 },
      },
      Array.from({ length: 20 }, (_, index) => {
        const a = index % 5;
        const b = Math.floor(index / 5);
        return {
          a,
          b,
          px: a + b * 0.2,
          py: b + a * 0.08 + Math.sin(a * 0.8) * 0.12,
          value: 8 + ((a * 7 + b * 11) % 29),
        };
      }),
      'a',
      'b',
    );
  } else if (mark === 'bullet') {
    spec = base({ type: mark, fields: { target: 'target' } });
  } else if (mark === 'contour') {
    spec = base({ type: mark, fields: { value: 'value' } }, grid, 'x', 'y');
  } else if (['cylinder', 'item', 'lollipop', 'packed-bubble', 'pareto'].includes(mark)) {
    spec = base(mark);
  } else if (mark === 'interval') {
    spec = base({ type: mark, fields: { low: 'low', high: 'high' } });
  } else if (mark === 'pictorial-bar') {
    spec = base({ type: mark, options: { symbol: 'diamond' } });
  } else if (mark === 'polygon') {
    spec = base(
      { type: mark, fields: { series: 'series' } },
      [
        { x: 1, y: 2, series: 'A' },
        { x: 3, y: 7, series: 'A' },
        { x: 6, y: 3, series: 'A' },
        { x: 2, y: 3, series: 'B' },
        { x: 4, y: 8, series: 'B' },
        { x: 7, y: 4, series: 'B' },
      ],
      'x',
      'y',
    );
  } else if (mark === 'pyramid') {
    spec = base({
      type: mark,
      options: { variant: id.includes('3d') ? `${id.replace('-3d', '')}-3d` : id },
    });
  } else if (mark === 'scatter-3d') {
    spec = base({ type: mark, fields: { z: 'z' } }, trend, 'value', 'high');
  } else if (mark === 'solid-gauge') {
    spec = base({ type: mark, options: { min: 0, max: 100 } });
  } else if (mark === 'theme-river') {
    spec = base(
      { type: mark, fields: { category: 'series' } },
      [
        { date: '2026-01-01', series: 'A', value: 12 },
        { date: '2026-01-01', series: 'B', value: 8 },
        { date: '2026-02-01', series: 'A', value: 18 },
        { date: '2026-02-01', series: 'B', value: 11 },
        { date: '2026-03-01', series: 'A', value: 14 },
        { date: '2026-03-01', series: 'B', value: 16 },
      ],
      'date',
      'value',
    );
  } else if (mark === 'tilemap') {
    spec = base({ type: mark, fields: { value: 'value' } }, grid, 'x', 'y');
  } else if (mark === 'variable-pie') {
    spec = base({ type: mark, fields: { radius: 'radius' } });
  } else if (mark === 'variwide') {
    spec = base({ type: mark, fields: { width: 'width' } });
  } else if (mark === 'vector') {
    spec = base(
      { type: mark, fields: { direction: 'direction', magnitude: 'magnitude' } },
      trend,
      'value',
      'high',
    );
  } else if (mark === 'venn') {
    spec = base(mark, trend.slice(0, 3));
  } else if (mark === 'wind-barb') {
    spec = base(
      { type: mark, fields: { speed: 'speed', direction: 'direction' } },
      trend,
      'value',
      'high',
    );
  } else if (mark === 'word-cloud') {
    spec = base(mark, words, 'word', 'weight');
  } else if (mark === 'timeline') {
    spec = base(
      { type: mark, fields: { end: 'end' } },
      [
        { start: '2026-01-01', end: '2026-01-08', category: 'A' },
        { start: '2026-01-05', end: '2026-01-15', category: 'B' },
      ],
      'start',
      'category',
    );
  } else if (mark === 'indicator') {
    spec = base(
      {
        type: mark,
        fields: { lower: 'lower', upper: 'upper' },
        options: { kind: id === 'technical-indicator' ? 'sma' : id, fields: ['value', 'signal'] },
      },
      trend,
      'date',
      'value',
    );
  } else if (mark === 'flags') {
    spec = base({ type: mark, fields: { title: 'title' } }, trend.slice(0, 5), 'date', 'value');
  } else if (mark === 'financial') {
    spec = base(
      {
        type: mark,
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        options: { kind: id },
      },
      trend,
      'date',
      'close',
    );
  } else if (mark === 'point-figure' || mark === 'renko') {
    spec = base(mark, trend, 'date', 'close');
  } else if (mark === 'volume-profile') {
    spec = base(
      { type: mark, fields: { price: 'price', volume: 'volume' } },
      trend,
      'date',
      'price',
    );
  } else if (mark === 'geo-flow' || mark === 'geo-line') {
    spec = base(
      {
        type: mark,
        fields: { longitude2: 'longitude2', latitude2: 'latitude2', value: 'value' },
      },
      geo,
      'longitude',
      'latitude',
    );
  } else if (mark === 'geo-heatmap') {
    spec = base({ type: mark, fields: { value: 'value' } }, geo, 'longitude', 'latitude');
  } else if (mark === 'map') {
    spec = base({ type: mark, fields: { size: 'value' } }, geo, 'longitude', 'latitude');
  } else if (mark === 'tiled-map') {
    spec = base({ type: mark, options: { graticule: true } }, geo, 'longitude', 'latitude');
  } else {
    throw new Error(`Missing sample for ${id} (${mark})`);
  }

  const hideAxes = ['map', 'radial', 'relationship'].includes(category);
  return {
    ...spec,
    title: { text: name, subtitle: `${category} · ${familyId}` },
    accessibility: {
      label: `${name} example`,
      description: `A compiled ${name.toLowerCase()} example using the ${familyId} family.`,
    },
    ...(hideAxes ? { axes: { x: false, y: false } } : {}),
  };
}

export function seriesSampleRuntimeSource() {
  return [
    `const trend = ${JSON.stringify(trend)};`,
    `const relation = ${JSON.stringify(relation)};`,
    `const hierarchy = ${JSON.stringify(hierarchy)};`,
    `const geo = ${JSON.stringify(geo)};`,
    `const grid = ${JSON.stringify(grid)};`,
    `const points = ${JSON.stringify(points)};`,
    `const timeline = ${JSON.stringify(timeline)};`,
    `const composition = ${JSON.stringify(composition)};`,
    `const radar = ${JSON.stringify(radar)};`,
    `const boxSummary = ${JSON.stringify(boxSummary)};`,
    `const words = ${JSON.stringify(words)};`,
    fieldType.toString(),
    base.toString(),
    seriesSampleSpec.toString(),
  ].join('\n');
}
