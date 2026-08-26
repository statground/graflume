const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const monthlyActiveTeams = [48, 53, 51, 59, 66, 70, 76, 82, 80, 89, 96, 104];
const trend = monthlyActiveTeams.map((value, index) => {
  const target = 50 + index * 4.6;
  const spread = 4 + (index % 3);
  const previous = index === 0 ? 44 : monthlyActiveTeams[index - 1];
  return {
    date: `2026-${String(index + 1).padStart(2, '0')}-01`,
    category: monthNames[index],
    value,
    low: value - spread,
    high: value + spread + 2,
    lower: value - spread - 1,
    upper: value + spread + 3,
    target: Number(target.toFixed(1)),
    width: 2.8 + (index % 4) * 0.9,
    radius: 10 + value * 0.22,
    z: 8 + index * 1.4,
    direction: (28 + index * 31) % 360,
    magnitude: 7 + (index % 5) * 2.4,
    speed: 18 + index * 2.7,
    signal: Number((value * 0.9 + target * 0.1).toFixed(2)),
    secondary: Number((36 + index * 3.1 + Math.sin(index * 0.8) * 4).toFixed(2)),
    up: 54 + index * 2.4,
    down: 78 - index * 1.7,
    plus: 24 + index * 1.6,
    minus: 39 - index * 1.1,
    conversion: Number((18 + index * 1.15 + Math.sin(index * 0.6) * 2).toFixed(2)),
    base: Number((value * 0.78).toFixed(2)),
    support: value - 8,
    resistance: value + 9,
    volume: 1_250 + index * 145 + ((index * 83) % 210),
    price: Number((72 + index * 1.35 + Math.sin(index * 0.7) * 3.2).toFixed(2)),
    title: index === 2 ? 'Spring release' : index === 8 ? 'Team plan launch' : '',
    open: previous,
    close: value,
    previous,
    series: index < 6 ? 'Before launch' : 'After launch',
  };
});

const relation = [
  { source: 'Collected', target: 'Validated', value: 86 },
  { source: 'Collected', target: 'Review queue', value: 14 },
  { source: 'Validated', target: 'Aggregated', value: 58 },
  { source: 'Validated', target: 'Exploration', value: 28 },
  { source: 'Aggregated', target: 'Reports', value: 36 },
  { source: 'Aggregated', target: 'Alerts', value: 22 },
  { source: 'Exploration', target: 'Models', value: 18 },
  { source: 'Exploration', target: 'Exports', value: 10 },
];

const hierarchy = [
  { id: 'Statground', parent: '', value: 100 },
  { id: 'Visualization', parent: 'Statground', value: 46 },
  { id: 'Data products', parent: 'Statground', value: 34 },
  { id: 'Documentation', parent: 'Statground', value: 20 },
  { id: 'Canvas charts', parent: 'Visualization', value: 28 },
  { id: 'Spatial charts', parent: 'Visualization', value: 18 },
  { id: 'Catalog', parent: 'Data products', value: 14 },
  { id: 'Workbench', parent: 'Data products', value: 12 },
  { id: 'Pipelines', parent: 'Data products', value: 8 },
  { id: 'Guides', parent: 'Documentation', value: 12 },
  { id: 'Examples', parent: 'Documentation', value: 8 },
];

const geo = [
  {
    name: 'Seoul',
    longitude: 126.98,
    latitude: 37.57,
    longitude2: 139.69,
    latitude2: 35.68,
    value: 92,
  },
  {
    name: 'Tokyo',
    longitude: 139.69,
    latitude: 35.68,
    longitude2: 103.82,
    latitude2: 1.35,
    value: 78,
  },
  {
    name: 'Singapore',
    longitude: 103.82,
    latitude: 1.35,
    longitude2: 77.21,
    latitude2: 28.61,
    value: 64,
  },
  {
    name: 'Delhi',
    longitude: 77.21,
    latitude: 28.61,
    longitude2: 2.35,
    latitude2: 48.86,
    value: 58,
  },
  { name: 'Paris', longitude: 2.35, latitude: 48.86, longitude2: -74, latitude2: 40.71, value: 73 },
  {
    name: 'New York',
    longitude: -74,
    latitude: 40.71,
    longitude2: -122.42,
    latitude2: 37.77,
    value: 88,
  },
  {
    name: 'San Francisco',
    longitude: -122.42,
    latitude: 37.77,
    longitude2: -99.13,
    latitude2: 19.43,
    value: 69,
  },
  {
    name: 'Sydney',
    longitude: 151.21,
    latitude: -33.87,
    longitude2: 126.98,
    latitude2: 37.57,
    value: 51,
  },
];

const grid = Array.from({ length: 96 }, (_, index) => {
  const x = index % 12;
  const y = Math.floor(index / 12);
  const primary = 78 * Math.exp(-((x - 3.6) ** 2 + (y - 2.7) ** 2) / 8.5);
  const secondary = 52 * Math.exp(-((x - 8.8) ** 2 + (y - 5.3) ** 2) / 5.2);
  const ridge = 12 * Math.exp(-((y - 0.45 * x - 0.7) ** 2) / 1.8);
  return { x, y, value: Number((primary + secondary + ridge + 3).toFixed(3)) };
});

const points = [
  { name: 'Atlas Lab', x: 14, y: 38, size: 28, group: 'Starter', z: 7 },
  { name: 'Beacon Co', x: 20, y: 45, size: 34, group: 'Starter', z: 10 },
  { name: 'Civic Data', x: 25, y: 41, size: 31, group: 'Starter', z: 12 },
  { name: 'Delta Ops', x: 38, y: 57, size: 64, group: 'Growth', z: 15 },
  { name: 'Ember Labs', x: 45, y: 63, size: 78, group: 'Growth', z: 18 },
  { name: 'Foundry BI', x: 50, y: 55, size: 70, group: 'Growth', z: 21 },
  { name: 'Harbor AI', x: 64, y: 72, size: 112, group: 'Scale', z: 25 },
  { name: 'Lattice Co', x: 72, y: 79, size: 128, group: 'Scale', z: 28 },
  { name: 'Meridian', x: 78, y: 70, size: 118, group: 'Scale', z: 31 },
  { name: 'Northstar', x: 61, y: 88, size: 52, group: 'Opportunity', z: 34 },
];

const timeline = [
  { id: 'research', task: 'Research', start: '2026-01-01', end: '2026-01-09', progress: 100 },
  { id: 'data', task: 'Data design', start: '2026-01-05', end: '2026-01-16', progress: 100 },
  { id: 'prototype', task: 'Prototype', start: '2026-01-12', end: '2026-01-25', progress: 86 },
  {
    id: 'accessibility',
    task: 'Accessibility',
    start: '2026-01-19',
    end: '2026-02-02',
    progress: 72,
  },
  { id: 'validation', task: 'Validation', start: '2026-01-27', end: '2026-02-10', progress: 48 },
  { id: 'release', task: 'Release', start: '2026-02-09', end: '2026-02-14', progress: 20 },
];

const composition = [
  { category: 'Organic search', value: 38, radius: 34 },
  { category: 'Direct', value: 27, radius: 28 },
  { category: 'Product referrals', value: 18, radius: 23 },
  { category: 'Community', value: 11, radius: 18 },
  { category: 'Campaigns', value: 6, radius: 13 },
];

const productMetrics = [
  { category: 'Insights', value: 86, previous: 74, target: 88, low: 81, high: 91, width: 24 },
  { category: 'Dashboards', value: 78, previous: 69, target: 82, low: 72, high: 84, width: 21 },
  { category: 'Reports', value: 69, previous: 65, target: 74, low: 63, high: 76, width: 18 },
  { category: 'Alerts', value: 61, previous: 48, target: 66, low: 55, high: 68, width: 15 },
  { category: 'Models', value: 48, previous: 41, target: 55, low: 42, high: 56, width: 12 },
  { category: 'Exports', value: 37, previous: 34, target: 44, low: 31, high: 45, width: 10 },
];

const serviceIndicators = [
  { category: 'Reliability', value: 99.93, previous: 99.84, target: 99.9 },
  { category: 'Fast responses', value: 94, previous: 89, target: 92 },
  { category: 'Accessible flows', value: 91, previous: 82, target: 95 },
  { category: 'Successful exports', value: 97, previous: 94, target: 98 },
];

const effectEstimates = [
  { category: 'Guided setup', value: 8.4, previous: 4.1, low: 5.9, high: 10.8 },
  { category: 'Saved views', value: 6.7, previous: 2.8, low: 4.8, high: 8.6 },
  { category: 'Smart alerts', value: 5.1, previous: 1.7, low: 2.6, high: 7.5 },
  { category: 'Team sharing', value: 3.9, previous: 1.5, low: 1.4, high: 6.3 },
  { category: 'CSV onboarding', value: 2.3, previous: 0.8, low: -0.3, high: 4.8 },
];

const funnelStages = [
  { category: 'Visited', value: 12_000 },
  { category: 'Explored a chart', value: 8_450 },
  { category: 'Created a view', value: 5_120 },
  { category: 'Shared with a team', value: 2_940 },
  { category: 'Returned in 30 days', value: 1_860 },
];

const waterfallDrivers = [
  { category: 'Opening MRR', value: 420 },
  { category: 'New teams', value: 86 },
  { category: 'Plan upgrades', value: 34 },
  { category: 'Reactivations', value: 12 },
  { category: 'Downgrades', value: -18 },
  { category: 'Churn', value: -41 },
  { category: 'Currency impact', value: -5 },
];

const calendarActivity = Array.from({ length: 365 }, (_, index) => {
  const date = new Date(Date.UTC(2025, 0, index + 1));
  const weekday = date.getUTCDay();
  const seasonal = Math.sin(index * 0.075) * 13 + Math.cos(index * 0.021) * 7;
  const releaseLift = index >= 238 ? 18 : 0;
  const weekendAdjustment = weekday === 0 || weekday === 6 ? -17 : 0;
  return {
    date: date.toISOString().slice(0, 10),
    value: Math.max(5, Math.round(52 + seasonal + releaseLift + weekendAdjustment)),
  };
});

const regionPerformance = [
  { region: 'KR', value: 92 },
  { region: 'JPN', value: 84 },
  { region: 'SGP', value: 79 },
  { region: 'USA', value: 88 },
  { region: 'BRA', value: 63 },
  { region: 'FRA', value: 76 },
  { region: 'ZAF', value: 58 },
  { region: 'AUS', value: 72 },
];

const vennIntersections = [
  { sets: ['Analysis'], size: 34, members: ['Cohort explorer', 'Forecast review'] },
  { sets: ['Engineering'], size: 28, members: ['Runtime profiler', 'Schema audit'] },
  { sets: ['Design'], size: 22, members: ['Theme studio', 'Layout review'] },
  { sets: ['Analysis', 'Engineering'], size: 15, members: ['Metric debugger'] },
  { sets: ['Analysis', 'Design'], size: 12, members: ['Story dashboard'] },
  { sets: ['Engineering', 'Design'], size: 9, members: ['Component lab'] },
  { sets: ['Analysis', 'Engineering', 'Design'], size: 7, members: ['Graflume manual'] },
];

const radar = [
  { indicator: 'Speed', series: 'Current', value: 82 },
  { indicator: 'Clarity', series: 'Current', value: 74 },
  { indicator: 'Coverage', series: 'Current', value: 91 },
  { indicator: 'Accessibility', series: 'Current', value: 79 },
  { indicator: 'Efficiency', series: 'Current', value: 76 },
  { indicator: 'Speed', series: 'Previous', value: 68 },
  { indicator: 'Clarity', series: 'Previous', value: 66 },
  { indicator: 'Coverage', series: 'Previous', value: 73 },
  { indicator: 'Accessibility', series: 'Previous', value: 61 },
  { indicator: 'Efficiency', series: 'Previous', value: 64 },
];

const boxSummary = [
  { category: 'Starter', low: 12, q1: 19, median: 27, q3: 34, high: 43 },
  { category: 'Team', low: 17, q1: 25, median: 33, q3: 41, high: 51 },
  { category: 'Business', low: 21, q1: 31, median: 40, q3: 49, high: 60 },
  { category: 'Enterprise', low: 28, q1: 39, median: 48, q3: 58, high: 71 },
];

const words = [
  { word: 'Visualization', weight: 100, parent: '' },
  { word: 'Statistics', weight: 88, parent: 'Visualization' },
  { word: 'Interaction', weight: 81, parent: 'Visualization' },
  { word: 'Accessibility', weight: 76, parent: 'Visualization' },
  { word: 'Canvas', weight: 70, parent: 'Interaction' },
  { word: 'Spatial', weight: 65, parent: 'Interaction' },
  { word: 'Scales', weight: 61, parent: 'Statistics' },
  { word: 'Uncertainty', weight: 56, parent: 'Statistics' },
  { word: 'Keyboard', weight: 51, parent: 'Accessibility' },
  { word: 'Contrast', weight: 47, parent: 'Accessibility' },
  { word: 'Themes', weight: 43, parent: 'Canvas' },
  { word: 'Tooltips', weight: 39, parent: 'Canvas' },
];

const observations = Array.from({ length: 72 }, (_, index) => {
  const cohort = index < 36 ? 'Before launch' : 'After launch';
  const local = index % 36;
  const region = ['Seoul', 'Tokyo', 'Singapore', 'Paris', 'New York', 'Sydney'][local % 6];
  const waveNumber = Math.floor(local / 6) + 1;
  const movement = Math.sin(local * 0.58) * 5.4 + Math.cos(local * 0.19) * 2.8;
  const value = 42 + (cohort === 'After launch' ? 11 : 0) + movement + (local % 7) * 0.9;
  return {
    sample: `${region} · ${cohort === 'Before launch' ? 'baseline' : 'post-launch'} · W${waveNumber}`,
    series: cohort,
    value: Number(value.toFixed(3)),
    weight: 1 + (index % 4) * 0.25,
  };
});

const vectorField = Array.from({ length: 63 }, (_, index) => {
  const column = index % 9;
  const row = Math.floor(index / 9);
  const x = column - 4;
  const y = row - 3;
  const dx = -y * 0.48 + Math.sin(column * 0.7) * 0.22;
  const dy = x * 0.48 + Math.cos(row * 0.6) * 0.22;
  const magnitude = Math.hypot(dx, dy);
  return {
    x,
    y,
    direction: Number(((Math.atan2(dy, dx) * 180) / Math.PI + 360).toFixed(3)) % 360,
    magnitude: Number(magnitude.toFixed(3)),
    value: Number(dx.toFixed(3)),
    high: Number(dy.toFixed(3)),
  };
});

function deterministicOhlcvRows(length = 128) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10);
    const baseline = 92 + index * 0.18 + Math.sin(index * 0.31) * 4 + Math.cos(index * 0.09) * 2;
    const open = baseline + Math.sin(index * 0.47) * 0.9;
    const close = baseline + Math.cos(index * 0.37) * 1.1;
    const high = Math.max(open, close) + 1.2 + (index % 5) * 0.08;
    const low = Math.min(open, close) - 1.1 - (index % 4) * 0.09;
    const number = (value) => Number(value.toFixed(4));
    return {
      date,
      value: number(close),
      open: number(open),
      high: number(high),
      low: number(low),
      close: number(close),
      volume: 950 + ((index * 47) % 613) + Math.round((Math.sin(index * 0.23) + 1) * 120),
    };
  });
}

const familyStories = {
  annotation: {
    subtitle: 'Monthly active teams with the releases that changed adoption',
    xTitle: 'Month',
    yTitle: 'Active teams',
  },
  area: {
    subtitle: 'A year of steady team adoption with visible seasonal movement',
    xTitle: 'Month',
    yTitle: 'Active teams',
  },
  bar: {
    subtitle: 'Feature adoption, ordered so the leading capability is immediately clear',
    xTitle: 'Capability',
    yTitle: 'Adoption (%)',
  },
  bubble: {
    subtitle: 'Customer segments compared by engagement, satisfaction, and team size',
    xTitle: 'Engagement score',
    yTitle: 'Satisfaction score',
  },
  calendar: {
    subtitle: 'A complete year of daily activity with weekday rhythm and a release lift',
    xTitle: 'Date',
    yTitle: 'Daily sessions',
  },
  candlestick: {
    subtitle: 'A coherent daily market path with open, high, low, close, and volume',
    xTitle: 'Trading day',
    yTitle: 'Price',
  },
  combination: {
    subtitle: 'Monthly active teams compared with the operating target',
    xTitle: 'Month',
    yTitle: 'Active teams',
  },
  difference: {
    subtitle: 'Current feature adoption compared with the previous release',
    xTitle: 'Capability',
    yTitle: 'Adoption (%)',
  },
  pie: {
    subtitle: 'Acquisition channels shown as a restrained five-part composition',
    xTitle: 'Channel',
    yTitle: 'Share (%)',
  },
  timeline: {
    subtitle: 'A release plan with overlapping work, progress, and a clear finish',
    xTitle: 'Schedule',
    yTitle: 'Workstream',
  },
  gauge: {
    subtitle: 'Service reliability compared with its target and previous value',
    xTitle: 'Service metric',
    yTitle: 'Percent',
  },
  map: {
    subtitle: 'Regional adoption and routes connecting Statground teams around the world',
    xTitle: 'Longitude',
    yTitle: 'Latitude',
  },
  distribution: {
    subtitle: 'Before-and-after cohorts reveal the shift, spread, and remaining overlap',
    xTitle: 'Outcome score',
    yTitle: 'Frequency',
  },
  interval: {
    subtitle: 'Estimated onboarding lift with uncertainty kept visible for every change',
    xTitle: 'Experiment',
    yTitle: 'Lift (points)',
  },
  line: {
    subtitle: 'Monthly active teams make the trend and two release moments easy to read',
    xTitle: 'Month',
    yTitle: 'Active teams',
  },
  motion: {
    subtitle: 'Customer segments move from the 2025 baseline to their 2026 position',
    xTitle: 'Engagement score',
    yTitle: 'Satisfaction score',
  },
  hierarchy: {
    subtitle: 'The Statground portfolio from platform areas down to concrete products',
    xTitle: 'Portfolio node',
    yTitle: 'Relative investment',
  },
  flow: {
    subtitle: 'Validated data branches into reports, alerts, models, and exports',
    xTitle: 'Pipeline stage',
    yTitle: 'Records',
  },
  scatter: {
    subtitle: 'Customer segments expose a clear trade-off and one efficient opportunity',
    xTitle: 'Engagement score',
    yTitle: 'Satisfaction score',
  },
  table: {
    subtitle: 'A compact operational scorecard with current, target, and previous values',
    xTitle: 'Capability',
    yTitle: 'Current value',
  },
  waterfall: {
    subtitle: 'Opening monthly revenue reconciled through growth, contraction, and churn',
    xTitle: 'Revenue driver',
    yTitle: 'MRR change (kUSD)',
  },
  'word-tree': {
    subtitle: 'A readable concept tree linking statistics, interaction, and accessibility',
    xTitle: 'Concept',
    yTitle: 'Mentions',
  },
  polar: {
    subtitle: 'A full-day usage cycle highlights recurring peaks without excess categories',
    xTitle: 'Angle',
    yTitle: 'Activity index',
  },
  network: {
    subtitle: 'Product workflows reveal the strongest paths and the bridge between teams',
    xTitle: 'Workflow node',
    yTitle: 'Interactions',
  },
  chord: {
    subtitle: 'Cross-team hand-offs make reciprocal movement and concentration visible',
    xTitle: 'Team',
    yTitle: 'Hand-offs',
  },
  funnel: {
    subtitle: 'A realistic product journey exposes the largest conversion loss',
    xTitle: 'Journey stage',
    yTitle: 'Teams',
  },
  parallel: {
    subtitle: 'Release candidates balance speed, quality, and operating cost',
    xTitle: 'Candidate',
    yTitle: 'Score',
  },
  heatmap: {
    subtitle: 'Two hotspots and a diagonal ridge form a purposeful density landscape',
    xTitle: 'Horizontal bin',
    yTitle: 'Vertical bin',
  },
  image: {
    subtitle: 'A smooth calibration raster demonstrates color and pixel inspection',
    xTitle: 'Column',
    yTitle: 'Row',
  },
  ternary: {
    subtitle: 'Balanced blends move across a composition whose three parts always sum to 100',
    xTitle: 'Component A (%)',
    yTitle: 'Component B (%)',
  },
  smith: {
    subtitle: 'A monotonic frequency sweep passes through a visible resonance',
    xTitle: 'Normalized resistance',
    yTitle: 'Normalized reactance',
  },
  'scatter-matrix': {
    subtitle: 'Named release candidates expose correlations among speed, quality, and cost',
    xTitle: 'Release metric',
    yTitle: 'Release metric',
  },
  carpet: {
    subtitle: 'A warped coordinate surface retains two peaks and its underlying topology',
    xTitle: 'Carpet axis A',
    yTitle: 'Carpet axis B',
  },
  contour: {
    subtitle: 'Smooth peaks, a ridge, and a basin produce interpretable contour structure',
    xTitle: 'Horizontal bin',
    yTitle: 'Vertical bin',
  },
  item: {
    subtitle: 'One hundred marks translate acquisition share into an immediate countable view',
    xTitle: 'Channel',
    yTitle: 'Share (%)',
  },
  'vector-field': {
    subtitle: 'A balanced vortex keeps direction, magnitude, and the calm center visible',
    xTitle: 'Horizontal position',
    yTitle: 'Vertical position',
  },
  venn: {
    subtitle: 'Analysis, engineering, and design overlap in seven valid set regions',
    xTitle: 'Sets',
    yTitle: 'Items',
  },
  'word-cloud': {
    subtitle: 'Visualization topics are ranked with stable, meaningful vocabulary',
    xTitle: 'Topic',
    yTitle: 'Mentions',
  },
  'price-blocks': {
    subtitle: 'A coherent price path reveals regimes without fabricated independent bars',
    xTitle: 'Trading day',
    yTitle: 'Price',
  },
  'volume-profile': {
    subtitle: 'Trading activity reveals the price levels where liquidity accumulated',
    xTitle: 'Trading day',
    yTitle: 'Price',
  },
  'technical-indicator': {
    subtitle: 'Every indicator is calculated from the same coherent OHLCV market history',
    xTitle: 'Trading day',
    yTitle: 'Indicator value',
  },
  vega: {
    subtitle: 'Monthly active teams rendered through a portable declarative adapter',
    xTitle: 'Month',
    yTitle: 'Active teams',
  },
  custom: {
    subtitle: 'Named customer teams rendered as circles and diamonds with direct labels',
    xTitle: 'Engagement score',
    yTitle: 'Satisfaction score',
  },
};

const axislessFamilies = [
  'calendar',
  'pie',
  'gauge',
  'map',
  'hierarchy',
  'flow',
  'word-tree',
  'polar',
  'network',
  'chord',
  'funnel',
  'parallel',
  'ternary',
  'smith',
  'scatter-matrix',
  'carpet',
  'item',
  'venn',
  'word-cloud',
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
      'sets',
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
      trend.map(({ date, value, title }) => ({
        date,
        value,
        annotation: title || null,
      })),
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
    spec = base(
      {
        type: mark,
        orientation: id === 'bar' ? 'horizontal' : 'vertical',
        cornerRadius: 6,
      },
      productMetrics,
    );
  } else if (mark === 'boxplot') {
    spec = base(
      { type: mark, fields: { low: 'low', q1: 'q1', median: 'median', q3: 'q3', high: 'high' } },
      boxSummary,
    );
  } else if (mark === 'bubble' || mark === 'effect-scatter') {
    spec = base({ type: mark, fields: { size: 'size', color: 'group' } }, points, 'x', 'y');
  } else if (mark === 'calendar') {
    spec = base(mark, calendarActivity, 'date', 'value');
  } else if (mark === 'candlestick') {
    spec = base(
      { type: mark, fields: { open: 'open', high: 'high', low: 'low', close: 'close' } },
      deterministicOhlcvRows(64),
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
    spec = base({ type: mark, fields: { old: 'previous', new: 'value' } }, productMetrics);
  } else if (mark === 'funnel') {
    spec = base(
      { type: mark, options: { mode: entry.mode === 'area' ? 'area' : 'default' } },
      funnelStages,
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
      serviceIndicators.slice(0, 1),
    );
  } else if (mark === 'geo') {
    spec = base(
      { type: mark, options: { mode: 'choropleth' } },
      regionPerformance,
      'region',
      'value',
    );
  } else if (mark === 'heatmap') {
    spec = base(mark, grid, 'x', 'y');
  } else if (mark === 'histogram') {
    spec = base({ type: mark, options: { bins: 12 } }, observations, 'value', 'value');
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
            { region: 'Asia', channel: 'Organic', outcome: 'Expanded', value: 1 },
            { region: 'Asia', channel: 'Community', outcome: 'Expanded', value: 1 },
            { region: 'Europe', channel: 'Organic', outcome: 'Renewed', value: 1 },
            { region: 'Europe', channel: 'Partner', outcome: 'Expanded', value: 1 },
            { region: 'Americas', channel: 'Partner', outcome: 'Renewed', value: 1 },
            { region: 'Americas', channel: 'Community', outcome: 'Evaluating', value: 1 },
          ]
        : [
            { name: 'Balanced', speed: 82, quality: 84, cost: 63 },
            { name: 'Fast', speed: 94, quality: 72, cost: 76 },
            { name: 'Precise', speed: 69, quality: 95, cost: 71 },
            { name: 'Efficient', speed: 78, quality: 86, cost: 49 },
            { name: 'Baseline', speed: 62, quality: 68, cost: 58 },
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
      Array.from({ length: 12 }, (_, index) => ({
        angle: index * 30,
        series: 'Daily cycle',
        value: Number(
          (63 + Math.sin(index * 0.86 - 0.7) * 19 + Math.cos(index * 0.31) * 7).toFixed(2),
        ),
      })),
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
    spec = base(
      { type: mark, options: { columns: ['category', 'value', 'target', 'previous'] } },
      productMetrics,
    );
  } else if (mark === 'waterfall') {
    spec = base(mark, waterfallDrivers);
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
        label: point.name,
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
    spec = base(
      {
        type: mark,
        fields: { low: 'low', high: 'high' },
        options: { mode, smooth: id.includes('spline') },
      },
      effectEstimates,
    );
  } else if (mark === 'smooth') {
    spec = base({ type: mark, point: true, options: { area: id.includes('area') } });
  } else if (mark === 'distribution') {
    const mode = entry.mode === 'default' ? 'histogram' : entry.mode;
    if (mode === 'histogram-2d' || mode === 'histogram-2d-contour') {
      spec = base(
        { type: mark, options: { mode, binsX: 6, binsY: 5, levels: 4 } },
        grid.flatMap((row) =>
          Array.from({ length: Math.max(1, Math.round(row.value / 12)) }, (_, sampleIndex) => ({
            x: row.x + ((sampleIndex % 3) - 1) * 0.08,
            y: row.y + ((Math.floor(sampleIndex / 3) % 3) - 1) * 0.08,
          })),
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
        observations,
        violinMode ? 'series' : 'value',
        'value',
      );
    }
  } else if (mark === 'image') {
    spec = base(
      { type: mark, fields: { red: 'red', green: 'green', blue: 'blue' } },
      Array.from({ length: 96 }, (_, index) => ({
        x: index % 12,
        y: Math.floor(index / 12),
        red: 32 + Math.round((index % 12) * 16.8),
        green: 52 + Math.round(Math.floor(index / 12) * 24.5),
        blue: 224 - Math.round(((index % 12) + Math.floor(index / 12)) * 8.4),
      })),
      'x',
      'y',
    );
  } else if (mark === 'ternary') {
    spec = base(
      { type: mark, fields: { c: 'c', series: 'series' }, options: { mode: 'line' } },
      Array.from({ length: 12 }, (_, index) => {
        const a = 70 - index * 4.5;
        const b = 18 + Math.sin(index * 0.72) * 9 + index * 1.6;
        return {
          a: Number(a.toFixed(2)),
          b: Number(b.toFixed(2)),
          c: Number((100 - a - b).toFixed(2)),
          series: 'Balanced blend',
        };
      }),
      'a',
      'b',
    );
  } else if (mark === 'smith') {
    spec = base(
      { type: mark, options: { mode: 'line' } },
      Array.from({ length: 15 }, (_, index) => ({
        real: Number((0.12 + index * 0.19).toFixed(3)),
        imaginary: Number((1.45 * Math.sin(-1.25 + index * 0.19)).toFixed(3)),
      })),
      'real',
      'imaginary',
    );
  } else if (mark === 'scatter-matrix') {
    const releaseTrains = ['Aurora', 'Beacon', 'Cinder', 'Delta', 'Ember', 'Fjord'];
    const releaseRegions = ['Seoul', 'Paris', 'Austin'];
    spec = base(
      { type: mark, options: { dimensions: ['speed', 'quality', 'cost'] } },
      Array.from({ length: 18 }, (_, index) => ({
        name: `${releaseTrains[Math.floor(index / releaseRegions.length)]} · ${releaseRegions[index % releaseRegions.length]}`,
        train: releaseTrains[Math.floor(index / releaseRegions.length)],
        region: releaseRegions[index % releaseRegions.length],
        speed: Number((61 + index * 1.5 + Math.sin(index * 0.7) * 8).toFixed(2)),
        quality: Number((68 + index * 1.1 + Math.cos(index * 0.55) * 7).toFixed(2)),
        cost: Number((82 - index * 1.25 + Math.sin(index * 0.42) * 5).toFixed(2)),
      })),
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
      Array.from({ length: 63 }, (_, index) => {
        const a = index % 9;
        const b = Math.floor(index / 9);
        return {
          a,
          b,
          px: Number((a + b * 0.18 + Math.sin(b * 0.8) * 0.08).toFixed(3)),
          py: Number((b + a * 0.075 + Math.sin(a * 0.72) * 0.13).toFixed(3)),
          value: Number(
            (
              12 +
              58 * Math.exp(-((a - 3.1) ** 2 + (b - 2.4) ** 2) / 7) +
              34 * Math.exp(-((a - 7.2) ** 2 + (b - 5.3) ** 2) / 4.5)
            ).toFixed(3),
          ),
        };
      }),
      'a',
      'b',
    );
  } else if (mark === 'bullet') {
    spec = base({ type: mark, fields: { target: 'target' } }, serviceIndicators);
  } else if (mark === 'contour') {
    spec = base({ type: mark, fields: { value: 'value' } }, grid, 'x', 'y');
  } else if (['cylinder', 'lollipop', 'pareto'].includes(mark)) {
    spec = base(mark, productMetrics);
  } else if (mark === 'packed-bubble') {
    spec = base(mark, composition);
  } else if (mark === 'item') {
    spec = base(mark, composition);
  } else if (mark === 'interval') {
    spec = base({ type: mark, fields: { low: 'low', high: 'high' } }, effectEstimates);
  } else if (mark === 'pictorial-bar') {
    spec = base({ type: mark, options: { symbol: 'diamond' } }, productMetrics);
  } else if (mark === 'polygon') {
    spec = base(
      { type: mark, fields: { series: 'series' } },
      [
        { x: 1, y: 2, series: 'Current' },
        { x: 2.4, y: 6.8, series: 'Current' },
        { x: 5.2, y: 7.5, series: 'Current' },
        { x: 7.4, y: 3.4, series: 'Current' },
        { x: 4.1, y: 1.1, series: 'Current' },
        { x: 2.2, y: 2.8, series: 'Previous' },
        { x: 3.1, y: 5.7, series: 'Previous' },
        { x: 5.1, y: 6.2, series: 'Previous' },
        { x: 6.3, y: 3.6, series: 'Previous' },
        { x: 4.2, y: 2.2, series: 'Previous' },
      ],
      'x',
      'y',
    );
  } else if (mark === 'pyramid') {
    spec = base(
      {
        type: mark,
        options: { variant: id.includes('3d') ? `${id.replace('-3d', '')}-3d` : id },
      },
      familyId === 'funnel' ? funnelStages : productMetrics,
    );
  } else if (mark === 'scatter-3d') {
    spec = base({ type: mark, fields: { z: 'z', color: 'group', size: 'size' } }, points, 'x', 'y');
  } else if (mark === 'solid-gauge') {
    spec = base({ type: mark, options: { min: 0, max: 100 } }, serviceIndicators.slice(0, 1));
  } else if (mark === 'theme-river') {
    spec = base(
      { type: mark, fields: { category: 'series' } },
      ['Dashboards', 'Reports', 'Models', 'Exports'].flatMap((series, seriesIndex) =>
        trend.map(({ date }, index) => ({
          date,
          series,
          value: Number(
            (
              8 +
              seriesIndex * 3.5 +
              Math.sin(index * 0.62 + seriesIndex * 1.1) * 4 +
              index * (0.55 + seriesIndex * 0.11)
            ).toFixed(2),
          ),
        })),
      ),
      'date',
      'value',
    );
  } else if (mark === 'tilemap') {
    spec = base({ type: mark, fields: { value: 'value' } }, grid, 'x', 'y');
  } else if (mark === 'variable-pie') {
    spec = base({ type: mark, fields: { radius: 'radius' } }, composition);
  } else if (mark === 'variwide') {
    spec = base({ type: mark, fields: { width: 'width' } }, productMetrics);
  } else if (mark === 'vector') {
    spec = base(
      { type: mark, fields: { direction: 'direction', magnitude: 'magnitude' } },
      vectorField,
      'x',
      'y',
    );
  } else if (mark === 'venn') {
    spec = base(
      { type: mark, fields: { sets: 'sets', size: 'size', members: 'members' } },
      vennIntersections,
      'sets',
      'size',
    );
  } else if (mark === 'wind-barb') {
    spec = base(
      { type: mark, fields: { speed: 'speed', direction: 'direction' } },
      vectorField.map((row) => ({ ...row, speed: row.magnitude * 8 })),
      'x',
      'y',
    );
  } else if (mark === 'word-cloud') {
    spec = base(mark, words, 'word', 'weight');
  } else if (mark === 'timeline') {
    spec = base(
      { type: mark, fields: { end: 'end' } },
      timeline.map(({ start, end, task }) => ({ start, end, category: task })),
      'start',
      'category',
    );
  } else if (mark === 'indicator') {
    const capability = entry.technicalIndicatorCapability;
    const calculated = familyId === 'technical-indicator' && capability !== undefined;
    const calculatedFields = calculated
      ? {
          value: 'value',
          middle: 'value',
          open: 'open',
          high: 'high',
          low: 'low',
          close: 'close',
          volume: 'volume',
          ...Object.fromEntries(
            capability.outputs.filter((role) => role !== 'value').map((role) => [role, role]),
          ),
        }
      : undefined;
    spec = base(
      {
        type: mark,
        fields: calculated ? calculatedFields : { lower: 'lower', upper: 'upper' },
        options: calculated
          ? { kind: capability.kind, calculate: true, fields: [...capability.outputs] }
          : { kind: id === 'technical-indicator' ? 'sma' : id, fields: ['value', 'signal'] },
      },
      calculated ? deterministicOhlcvRows() : trend,
      'date',
      'value',
    );
  } else if (mark === 'flags') {
    spec = base(
      { type: mark, fields: { title: 'title' } },
      trend.filter(({ title }) => title !== ''),
      'date',
      'value',
    );
  } else if (mark === 'financial') {
    spec = base(
      {
        type: mark,
        fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        options: { kind: id },
      },
      deterministicOhlcvRows(64),
      'date',
      'close',
    );
  } else if (mark === 'point-figure' || mark === 'renko') {
    spec = base(mark, deterministicOhlcvRows(96), 'date', 'close');
  } else if (mark === 'volume-profile') {
    spec = base(
      { type: mark, fields: { price: 'price', volume: 'volume' } },
      deterministicOhlcvRows(128).map((row) => ({
        ...row,
        price: row.close,
      })),
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

  const story =
    familyId === 'parallel' && entry.mode === 'categories'
      ? {
          subtitle: 'Regional journeys connect acquisition channels to renewal outcomes',
          xTitle: 'Region',
          yTitle: 'Path frequency',
        }
      : (familyStories[familyId] ?? {
          subtitle: `A focused, executable ${name.toLowerCase()} example`,
          xTitle: spec.x?.title ?? spec.x?.field ?? 'Category',
          yTitle: spec.y?.title ?? spec.y?.field ?? 'Value',
        });
  const presentedLayers = spec.layers?.map((layer) => ({
    ...layer,
    ...(layer.x === undefined ? {} : { x: { ...layer.x, title: story.xTitle } }),
    ...(layer.y === undefined ? {} : { y: { ...layer.y, title: story.yTitle } }),
  }));
  const hideAxes =
    axislessFamilies.includes(familyId) || ['map', 'radial', 'relationship'].includes(category);
  return {
    ...spec,
    ...(spec.x === undefined ? {} : { x: { ...spec.x, title: story.xTitle } }),
    ...(spec.y === undefined ? {} : { y: { ...spec.y, title: story.yTitle } }),
    ...(presentedLayers === undefined ? {} : { layers: presentedLayers }),
    title: { text: name, subtitle: story.subtitle },
    accessibility: {
      label: `${name}: ${story.subtitle}`,
      description: `${story.subtitle}. The example uses curated, deterministic data and exposes its exact values in a semantic table.`,
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
    `const productMetrics = ${JSON.stringify(productMetrics)};`,
    `const serviceIndicators = ${JSON.stringify(serviceIndicators)};`,
    `const effectEstimates = ${JSON.stringify(effectEstimates)};`,
    `const funnelStages = ${JSON.stringify(funnelStages)};`,
    `const waterfallDrivers = ${JSON.stringify(waterfallDrivers)};`,
    `const calendarActivity = ${JSON.stringify(calendarActivity)};`,
    `const regionPerformance = ${JSON.stringify(regionPerformance)};`,
    `const vennIntersections = ${JSON.stringify(vennIntersections)};`,
    `const radar = ${JSON.stringify(radar)};`,
    `const boxSummary = ${JSON.stringify(boxSummary)};`,
    `const words = ${JSON.stringify(words)};`,
    `const observations = ${JSON.stringify(observations)};`,
    `const vectorField = ${JSON.stringify(vectorField)};`,
    `const familyStories = ${JSON.stringify(familyStories)};`,
    `const axislessFamilies = ${JSON.stringify(axislessFamilies)};`,
    deterministicOhlcvRows.toString(),
    fieldType.toString(),
    base.toString(),
    seriesSampleSpec.toString(),
  ].join('\n');
}
