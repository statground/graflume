/*
 * Deterministic, browser-safe data materializers for the public demo recipe contract.
 *
 * This module deliberately has no DOM, Node, timer, locale, or ambient-randomness dependency.
 * The catalog generator imports the same implementation that Rollup includes in the public API.
 */

const commonParameterKeys = [
  'family',
  'scenario',
  'valuePolicy',
  'valueFields',
  'positiveFields',
  'nullableFields',
];

const recipeDefinitions = [
  [
    'time-signal',
    'rows',
    'Time-binned signal with trend, seasonality, and deterministic incidents.',
    'time-bin-lttb',
    'quantiles',
    ['seriesCount', 'dateCycleDays'],
  ],
  [
    'categorical-events',
    'rows',
    'Ranked category aggregates derived from a logical event stream.',
    'group-sum-top-k',
    'top-groups',
    ['categoryCount', 'explicitPerformance'],
  ],
  [
    'clustered-points',
    'rows',
    'Stratified samples from separated, labeled point clusters.',
    'stratified-cluster-sample',
    'quantiles',
    ['clusterCount', 'explicitPerformance'],
  ],
  [
    'interval-sequence',
    'rows',
    'Ordered non-negative intervals with stable identities.',
    'interval-window-sample',
    'quantiles',
    [],
  ],
  [
    'ohlcv-sequence',
    'rows',
    'Time-binned OHLCV candles that preserve price invariants.',
    'ohlcv-time-bins',
    'quantiles',
    ['explicitPerformance'],
  ],
  [
    'motion-trajectories',
    'rows',
    'Entity trajectories sampled across representative frames.',
    'entity-frame-strata',
    'trajectory-frames',
    ['entityCount', 'frameCount', 'explicitPerformance'],
  ],
  [
    'geo-events',
    'rows',
    'Weighted geographic events sampled around stable world hubs.',
    'geohash-stratified-sample',
    'spatial-slice',
    ['geometry'],
  ],
  [
    'relationship-edges',
    'rows',
    'Weighted modular graph edges with bounded degree and stable IDs.',
    'community-edge-aggregation',
    'top-groups',
    ['topology', 'nodeCount', 'categoryCount', 'explicitPerformance'],
  ],
  [
    'hierarchy-nodes',
    'rows',
    'Balanced rooted hierarchy with bounded visible depth and fanout.',
    'hierarchy-level-of-detail',
    'hierarchy-focus',
    ['topology', 'nodeCount', 'explicitPerformance'],
  ],
  [
    'text-corpus',
    'rows',
    'Aggregated multilingual term frequencies from a logical corpus.',
    'term-frequency-top-k',
    'top-groups',
    ['wordCount', 'explicitPerformance'],
  ],
  [
    'multivariate-observations',
    'rows',
    'Stratified multivariate observations with correlated dimensions.',
    'stratified-observation-sample',
    'quantiles',
    ['mode', 'dimensionCount', 'explicitPerformance'],
  ],
  [
    'grid-2d',
    'rows',
    'Downsampled two-dimensional field preserving peaks and spatial gradients.',
    'area-weighted-grid-downsample',
    'spatial-slice',
    ['rows', 'columns'],
  ],
  [
    'ternary-composition',
    'rows',
    'Stratified non-negative compositions normalized to a positive total.',
    'simplex-stratified-sample',
    'quantiles',
    [],
  ],
  [
    'smith-sweep',
    'rows',
    'Frequency sweep over non-negative resistance and signed reactance.',
    'frequency-window-sample',
    'quantiles',
    [],
  ],
  [
    'venn-membership',
    'rows',
    'Exact bounded intersections aggregated from logical memberships.',
    'set-intersection-aggregate',
    'intersection-summary',
    ['aggregateSetCount', 'preAggregate'],
  ],
  [
    'surface-grid',
    'surface-grid',
    'Multi-lobe terrain grid with an output-bounded level of detail.',
    'surface-grid-level-of-detail',
    'spatial-slice',
    ['rows', 'columns'],
  ],
  [
    'volume-grid',
    'volume-grid',
    'Multi-lobe volumetric density field with bounded voxel resolution.',
    'volume-grid-level-of-detail',
    'spatial-slice',
    ['dimensions', 'maxSamples'],
  ],
  [
    'spatial-vector',
    'rows-or-vector-set',
    'Vortex vector field represented as rows or a Spatial vector set.',
    'vector-grid-level-of-detail',
    'spatial-slice',
    ['dimensions', 'maxSamples'],
  ],
];

export const demoRecipeCatalog = Object.freeze(
  recipeDefinitions.map(
    ([id, shape, summary, reductionMethod, previewMethod, recipeParameterKeys]) =>
      Object.freeze({
        id,
        shape,
        summary,
        reductionMethod,
        previewMethod,
        parameterKeys: Object.freeze([...commonParameterKeys, ...recipeParameterKeys]),
      }),
  ),
);

const definitionById = new Map(demoRecipeCatalog.map((definition) => [definition.id, definition]));
const palette = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2'];
const segmentNames = [
  'Enterprise',
  'Growth',
  'Core',
  'Education',
  'Public',
  'Research',
  'Creator',
  'Community',
];
const capabilityNames = ['Insights', 'Dashboards', 'Reports', 'Alerts', 'Models', 'Exports'];
const acquisitionChannelNames = [
  'Organic search',
  'Direct',
  'Product referrals',
  'Community',
  'Campaigns',
  'Partner ecosystem',
];
const funnelStageNames = [
  'Visited',
  'Explored a chart',
  'Created a view',
  'Shared with a team',
  'Returned in 30 days',
];
const revenueDriverNames = [
  'Opening MRR',
  'New teams',
  'Plan upgrades',
  'Downgrades',
  'Churn',
  'Currency impact',
];
const phaseNames = ['Discover', 'Prepare', 'Model', 'Review', 'Publish', 'Monitor'];
const seriesNames = ['Dashboards', 'Reports', 'Models', 'Exports', 'Alerts', 'Catalogs'];
const relationshipNodeNames = [
  'Collection',
  'Validation',
  'Catalog',
  'Exploration',
  'Modeling',
  'Reports',
  'Alerts',
  'Exports',
  'Governance',
  'Collaboration',
  'Monitoring',
  'Publishing',
];
const relationshipCommunityNames = [
  'Data engineering',
  'Analysis',
  'Research',
  'Product',
  'Design',
  'Operations',
];
const accountNames = [
  'Aurora Labs',
  'Blue Harbor',
  'Cedar Health',
  'Delta Works',
  'Evergreen Public',
  'Fieldnote Studio',
  'Granite Research',
  'Helio Education',
  'Indigo Systems',
  'Juniper Market',
  'Keystone Civic',
  'Lumen Analytics',
];
const initiativeNames = [
  'Atlas migration',
  'Beacon catalog',
  'Compass metrics',
  'Drift monitor',
  'Ember forecast',
  'Foundry reports',
  'Harbor alerts',
  'Iris governance',
  'Junction exports',
  'Kepler models',
  'Lantern quality',
  'Meridian access',
];
const operatingRegions = ['APAC', 'EMEA', 'Americas', 'Public sector', 'Education', 'Research'];
const releaseTrainNames = ['Horizon', 'Northstar', 'Solstice', 'Waypoint'];
const regionalMetricNames = [
  'freshness monitor',
  'quality review',
  'catalog search',
  'forecast refresh',
  'dashboard session',
  'alert delivery',
];
const vennSetNames = ['Analysis', 'Engineering', 'Design', 'Operations', 'Research'];
const hubCoordinates = [
  [126.978, 37.5665, 'Seoul'],
  [-122.4194, 37.7749, 'San Francisco'],
  [-0.1276, 51.5072, 'London'],
  [2.3522, 48.8566, 'Paris'],
  [13.405, 52.52, 'Berlin'],
  [139.6917, 35.6895, 'Tokyo'],
  [151.2093, -33.8688, 'Sydney'],
  [103.8198, 1.3521, 'Singapore'],
  [-46.6333, -23.5505, 'Sao Paulo'],
  [28.0473, -26.2041, 'Johannesburg'],
];
const corpusTerms = [
  '통계',
  'data',
  'visualization',
  '분석',
  'model',
  'quality',
  'insight',
  'research',
  'forecast',
  'dashboard',
  'reproducible',
  'open-source',
  '데이터',
  '시각화',
  'evidence',
  'workflow',
  'monitoring',
  'accessibility',
];

function invariant(condition, message) {
  if (!condition) throw new TypeError(`Invalid Graflume demo recipe: ${message}`);
}

function integer(value, fallback, minimum = 1, maximum = 1_000_000) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

function numeric(value, fallback) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function stringValue(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function parameter(recipe, name, fallback) {
  const parameters = recipe.parameters;
  if (parameters === null || typeof parameters !== 'object' || Array.isArray(parameters)) {
    return fallback;
  }
  return Object.hasOwn(parameters, name) ? parameters[name] : fallback;
}

function hash32(value) {
  let result = value >>> 0;
  result ^= result >>> 16;
  result = Math.imul(result, 0x7feb352d);
  result ^= result >>> 15;
  result = Math.imul(result, 0x846ca68b);
  result ^= result >>> 16;
  return result >>> 0;
}

function unit(seed, index, stream = 0) {
  return (
    hash32((seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(stream + 1, 0x85ebca6b)) >>> 0) /
    4_294_967_296
  );
}

function signed(seed, index, stream = 0) {
  return unit(seed, index, stream) * 2 - 1;
}

function gaussian(seed, index, stream = 0) {
  const first = Math.max(Number.EPSILON, unit(seed, index, stream));
  const second = unit(seed, index, stream + 1);
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isoDate(dayOffset) {
  return new Date(Date.UTC(2024, 0, 1 + dayOffset)).toISOString().slice(0, 10);
}

function sourceRows(recipe) {
  return integer(recipe.cardinality?.sourceRows, 1);
}

function materializationLimit(recipe, preferredMaximum = Number.POSITIVE_INFINITY) {
  return Math.min(
    sourceRows(recipe),
    integer(recipe.outputBudget?.maximum, 1, 1, 4_194_304),
    preferredMaximum,
  );
}

function evidenceDigest(value, digest = 2_166_136_261) {
  if (typeof value === 'number') {
    invariant(Number.isFinite(value), 'processing evidence numbers must be finite');
    const normalized = Object.is(value, -0) ? 0 : value;
    return evidenceDigest(String(normalized), digest);
  }
  if (typeof value === 'string') {
    let output = digest;
    for (const character of value) {
      output ^= character.codePointAt(0);
      output = Math.imul(output, 16_777_619) >>> 0;
    }
    return output;
  }
  if (typeof value === 'boolean' || value === null) {
    return evidenceDigest(String(value), digest);
  }
  if (Array.isArray(value)) {
    return value.reduce((output, entry) => evidenceDigest(entry, output), digest);
  }
  invariant(
    value !== null && typeof value === 'object',
    'logical-row processing must return observable evidence',
  );
  let output = digest;
  for (const [key, entry] of Object.entries(value)) {
    output = evidenceDigest(key, output);
    output = evidenceDigest(entry, output);
  }
  return output;
}

function processed(data, processing) {
  return { ...processing, data };
}

/**
 * Visit every logical input observation exactly once. Generators use this
 * pass for their real aggregation or sampling work; sourceRows is therefore
 * measured processing evidence, not only descriptive metadata.
 */
function processLogicalRows(recipe, visitor) {
  const count = sourceRows(recipe);
  const boundaryIndices = new Set([0, Math.floor((count - 1) / 2), count - 1]);
  const boundaryRows = [];
  let generatedRows = 0;
  let processedRows = 0;
  let digest = 2_166_136_261;
  for (let index = 0; index < count; index += 1) {
    generatedRows += 1;
    const contribution = visitor(index);
    const contributionDigest = evidenceDigest(contribution);
    const prefixBeforeDigest = digest;
    digest = hash32(digest ^ contributionDigest ^ Math.imul(index + 1, 0x9e3779b1));
    processedRows += 1;
    if (boundaryIndices.has(index)) {
      boundaryRows.push({
        index,
        contributionDigest: contributionDigest.toString(16).padStart(8, '0'),
        prefixBeforeDigest: prefixBeforeDigest.toString(16).padStart(8, '0'),
        prefixDigest: digest.toString(16).padStart(8, '0'),
      });
    }
  }
  return {
    generatedRows,
    processedRows,
    processingEvidence: {
      algorithm: 'logical-row-fnv1a32-v1',
      digest: digest.toString(16).padStart(8, '0'),
      boundaryRows,
    },
  };
}

function sampledLogicalRows(recipe, maximumRows, rowForIndex) {
  const count = sourceRows(recipe);
  const selected = evenlySpacedIndices(count, Math.min(count, maximumRows));
  const rows = [];
  let selectionIndex = 0;
  const processing = processLogicalRows(recipe, (index) => {
    const row = rowForIndex(index, count);
    if (index === selected[selectionIndex]) {
      rows.push(row);
      selectionIndex += 1;
    }
    return row;
  });
  return processed(rows, processing);
}

function evenlySpacedIndices(length, count) {
  if (count >= length) return Array.from({ length }, (_, index) => index);
  if (count <= 1) return [Math.floor((length - 1) / 2)];
  return Array.from({ length: count }, (_, index) =>
    Math.round((index * (length - 1)) / (count - 1)),
  );
}

function sampledRows(rows, maximumRows, score) {
  if (rows.length <= maximumRows) return rows.map((row) => ({ ...row }));
  const indices = new Set(evenlySpacedIndices(rows.length, Math.max(2, maximumRows - 2)));
  if (score !== undefined) {
    let low = 0;
    let high = 0;
    for (let index = 1; index < rows.length; index += 1) {
      if (score(rows[index]) < score(rows[low])) low = index;
      if (score(rows[index]) > score(rows[high])) high = index;
    }
    indices.add(low);
    indices.add(high);
  }
  return [...indices]
    .sort((a, b) => a - b)
    .slice(0, maximumRows)
    .map((index) => ({ ...rows[index] }));
}

function timeSignal(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'line');
  const seriesCount = integer(
    parameter(recipe, 'seriesCount', family === 'area' ? 4 : 1),
    family === 'area' ? 4 : 1,
    1,
    8,
  );
  const preferredPoints = family === 'line' || family === 'area' ? 1_800 : 1_200;
  const points = Math.max(seriesCount, materializationLimit(recipe, preferredPoints));
  const perSeries = Math.max(1, Math.floor(points / seriesCount));
  const daySpan = integer(parameter(recipe, 'dateCycleDays', 731), 731, 2, 100_000) - 1;
  const source = sourceRows(recipe);
  const bins = Array.from({ length: seriesCount * perSeries }, () => ({
    count: 0,
    value: 0,
    target: 0,
    previous: 0,
    progress: 0,
  }));
  const processing = processLogicalRows(recipe, (sourceIndex) => {
    const series = sourceIndex % seriesCount;
    const observationIndex = Math.floor(sourceIndex / seriesCount);
    const observationsInSeries = Math.ceil((source - series) / seriesCount);
    const progress = observationsInSeries <= 1 ? 0 : observationIndex / (observationsInSeries - 1);
    const season = Math.sin(progress * Math.PI * 8 + series * 0.8) * (10 + series * 2);
    const longWave = Math.sin(progress * Math.PI * 2.2 + 0.4) * 7;
    const incident = Math.exp(-((progress - 0.72) ** 2) / 0.0028) * 22;
    const value =
      58 +
      series * 9 +
      progress * 30 +
      season +
      longWave +
      incident +
      signed(recipe.seed, sourceIndex, series) * 2.4;
    const binIndex = Math.min(perSeries - 1, Math.floor(progress * perSeries));
    const bin = bins[series * perSeries + binIndex];
    bin.count += 1;
    bin.value += value;
    bin.target += 70 + progress * 22 + series * 6;
    bin.previous += value - 4 - Math.sin(progress * 9) * 3;
    bin.progress += progress;
    return { series, binIndex, progress, value };
  });
  const rows = [];
  for (let series = 0; series < seriesCount; series += 1) {
    for (let index = 0; index < perSeries; index += 1) {
      const bin = bins[series * perSeries + index];
      if (bin.count === 0) continue;
      const progress = bin.progress / bin.count;
      const day = Math.round(progress * daySpan);
      const milestone = [
        [0.18, 'Baseline approved'],
        [0.48, 'Model launched'],
        [0.72, 'Campaign lift'],
        [0.9, 'Quarterly review'],
      ].find(([position]) => Math.abs(progress - position) < 0.5 / Math.max(1, perSeries));
      rows.push({
        date: isoDate(day),
        category: isoDate(day).slice(0, 7),
        value: round(bin.value / bin.count, 2),
        target: round(bin.target / bin.count, 2),
        previous: round(bin.previous / bin.count, 2),
        annotation: milestone?.[1] ?? '',
        series: seriesNames[series % seriesNames.length],
        angle: round(progress * 360, 3),
      });
    }
  }
  return processed(rows, processing);
}

function categoricalEvents(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'bar');
  const familyCount =
    family === 'gauge'
      ? 1
      : family === 'pie' || family === 'funnel'
        ? 5
        : ['bar', 'difference', 'item', 'waterfall'].includes(family)
          ? 6
          : 8;
  const requested = integer(parameter(recipe, 'categoryCount', familyCount), familyCount, 1, 80);
  const count = Math.min(requested, materializationLimit(recipe, 80));
  const labels =
    family === 'pie' || family === 'item'
      ? acquisitionChannelNames
      : family === 'funnel'
        ? funnelStageNames
        : family === 'waterfall'
          ? revenueDriverNames
          : capabilityNames;
  const aggregates = Array.from({ length: count }, () => ({
    count: 0,
    value: 0,
    previous: 0,
    target: 0,
    radius: 0,
  }));
  const processing = processLogicalRows(recipe, (sourceIndex) => {
    const index = sourceIndex % count;
    const base = 1_600 / (1 + index * 0.23);
    const value = Math.max(0, base * (0.84 + unit(recipe.seed, sourceIndex, 1) * 0.32));
    const aggregate = aggregates[index];
    aggregate.count += 1;
    aggregate.value += value;
    aggregate.previous += value * (0.82 + unit(recipe.seed, sourceIndex, 2) * 0.2);
    aggregate.target += value * (1.05 + unit(recipe.seed, sourceIndex, 3) * 0.12);
    aggregate.radius += 18 + unit(recipe.seed, sourceIndex, 4) * 34;
    return { categoryIndex: index, value, previous: aggregate.previous, target: aggregate.target };
  });
  const rows = aggregates.map((aggregate, index) => ({
    category: index < labels.length ? labels[index] : `Segment ${index + 1}`,
    value: round(aggregate.value / aggregate.count, 1),
    previous: round(aggregate.previous / aggregate.count, 1),
    target: round(aggregate.target / aggregate.count, 1),
    radius: round(aggregate.radius / aggregate.count, 2),
  }));
  if (family === 'funnel') rows.sort((left, right) => right.value - left.value);
  if (family === 'waterfall') {
    rows.forEach((row, index) => {
      row.value = round((index === 0 ? 1 : index % 3 === 0 ? -0.38 : 0.24) * row.value, 1);
    });
  }
  if (family === 'gauge') {
    rows[0] = {
      category: 'Reliability',
      value: round(99.82 + (rows[0].value / 1_600) * 0.12, 2),
      previous: 99.84,
      target: 99.9,
      radius: 34,
    };
  }
  if (family === 'item') {
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    let allocated = 0;
    rows.forEach((row, index) => {
      row.value =
        index === rows.length - 1 ? 100 - allocated : Math.round((row.value / total) * 100);
      allocated += row.value;
    });
  }
  return processed(rows, processing);
}

function clusteredPoints(recipe) {
  const count = materializationLimit(recipe, 4_000);
  const clusterCount = integer(parameter(recipe, 'clusterCount', 6), 6, 2, 12);
  return sampledLogicalRows(recipe, count, (index) => {
    const cluster = index % clusterCount;
    const angle = (cluster / clusterCount) * Math.PI * 2;
    const centerX = Math.cos(angle) * 44;
    const centerY = Math.sin(angle) * 31;
    const x = centerX + gaussian(recipe.seed, index, 10) * (5 + cluster * 0.35);
    const y = centerY + gaussian(recipe.seed, index, 12) * (4 + cluster * 0.28);
    return {
      x: round(x, 3),
      y: round(y, 3),
      size: round(6 + unit(recipe.seed, index, 14) * 34, 2),
      group: segmentNames[cluster % segmentNames.length],
      label: `${accountNames[index % accountNames.length]} · ${segmentNames[cluster % segmentNames.length]}`,
    };
  });
}

function intervalSequence(recipe) {
  const count = materializationLimit(recipe, 64);
  return sampledLogicalRows(recipe, count, (index, logicalCount) => {
    const lane = index % phaseNames.length;
    const startDay = Math.floor((index / Math.max(1, logicalCount - 1)) * 330) + lane;
    const duration = 2 + Math.floor(unit(recipe.seed, index, 20) * 10);
    const low = round(18 + lane * 10 + signed(recipe.seed, index, 21) * 4, 2);
    const high = round(low + 5 + unit(recipe.seed, index, 22) * 16, 2);
    const initiative = initiativeNames[index % initiativeNames.length];
    const region =
      operatingRegions[Math.floor(index / initiativeNames.length) % operatingRegions.length];
    return {
      id: `${initiative.toLowerCase().replaceAll(' ', '-')}-${phaseNames[lane].toLowerCase()}-${region.toLowerCase().replaceAll(' ', '-')}-${index + 1}`,
      category: `${phaseNames[lane]} · ${initiative} · ${region}`,
      start: isoDate(startDay),
      end: isoDate(startDay + duration),
      low,
      high,
      value: round((low + high) / 2, 2),
      progress: Math.round(unit(recipe.seed, index, 23) * 100),
    };
  });
}

function ohlcvSequence(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'candlestick');
  const preferredCount = family === 'candlestick' ? 720 : family === 'price-blocks' ? 900 : 1_000;
  const count = materializationLimit(recipe, preferredCount);
  const source = sourceRows(recipe);
  const aggregateBins = Array.from({ length: count }, () => ({
    count: 0,
    open: 0,
    high: Number.NEGATIVE_INFINITY,
    low: Number.POSITIVE_INFINITY,
    close: 0,
    volume: 0,
  }));
  let previousClose = 118 + unit(recipe.seed, 0, 30) * 8;
  const processing = processLogicalRows(recipe, (index) => {
    const open = previousClose;
    const impulse = Math.sin(index * 0.011) * 0.13 + signed(recipe.seed, index, 31) * 0.21 + 0.0035;
    const close = Math.max(1, open + impulse);
    const spread = 0.06 + unit(recipe.seed, index, 32) * 0.28;
    const low = Math.max(
      0.01,
      Math.min(open, close) - spread * (0.45 + unit(recipe.seed, index, 33)),
    );
    const high = Math.max(open, close) + spread * (0.45 + unit(recipe.seed, index, 34));
    const volume = Math.round(850 + unit(recipe.seed, index, 35) * 3_400);
    const binIndex = Math.min(count - 1, Math.floor((index * count) / source));
    const bin = aggregateBins[binIndex];
    if (bin.count === 0) bin.open = open;
    bin.count += 1;
    bin.high = Math.max(bin.high, high);
    bin.low = Math.min(bin.low, low);
    bin.close = close;
    bin.volume += volume;
    previousClose = close;
    return { binIndex, open, high, low, close, volume };
  });
  const rows = aggregateBins.flatMap((bin, index) => {
    if (bin.count === 0) return [];
    const trend = index / Math.max(1, count - 1);
    const middle = (bin.open + bin.high + bin.low + bin.close) / 4;
    return [
      {
        // Each emitted candle aggregates a contiguous portion of the logical
        // observation stream, keeping the displayed horizon readable.
        date: isoDate(index),
        open: round(bin.open, 4),
        high: round(bin.high, 4),
        low: round(bin.low, 4),
        close: round(bin.close, 4),
        value: round(bin.close, 4),
        price: round(middle, 4),
        volume: bin.volume,
        lower: round(bin.close * (0.965 - trend * 0.003), 4),
        upper: round(bin.close * (1.035 + trend * 0.003), 4),
        signal: round((bin.open + bin.close) / 2, 4),
      },
    ];
  });
  if (family === 'volume-profile') {
    const priceBins = new Map();
    for (const row of rows) {
      const price = Math.round(row.price / 2) * 2;
      const current = priceBins.get(price) ?? { date: row.date, price, volume: 0 };
      current.volume += row.volume;
      priceBins.set(price, current);
    }
    return processed(
      [...priceBins.values()].sort((left, right) => left.price - right.price),
      processing,
    );
  }
  return processed(rows, processing);
}

function motionTrajectories(recipe) {
  const desiredFrames = integer(parameter(recipe, 'frameCount', 20), 20, 2, 120);
  const desiredEntities = integer(parameter(recipe, 'entityCount', 5_000), 5_000, 1, 50_000);
  const limit = materializationLimit(recipe, 4_000);
  const frames = Math.min(desiredFrames, sourceRows(recipe));
  const logicalEntities = Math.min(
    desiredEntities,
    Math.max(1, Math.ceil(sourceRows(recipe) / frames)),
  );
  return sampledLogicalRows(recipe, limit, (index) => {
    const frame = Math.min(frames - 1, Math.floor(index / logicalEntities));
    const entity = index % logicalEntities;
    const time = frame / Math.max(1, frames - 1);
    const group = entity % 6;
    const baseAngle = (entity / Math.max(1, logicalEntities)) * Math.PI * 2;
    const radius = 25 + group * 5 + signed(recipe.seed, entity, 40) * 4;
    const angle = baseAngle + time * (0.8 + group * 0.17);
    const account = accountNames[entity % accountNames.length];
    const region =
      operatingRegions[Math.floor(entity / accountNames.length) % operatingRegions.length];
    const train =
      releaseTrainNames[
        Math.floor(entity / (accountNames.length * operatingRegions.length)) %
          releaseTrainNames.length
      ];
    return {
      id: `${account} · ${region} · ${train} · ${entity + 1}`,
      x: round(Math.cos(angle) * radius + time * 24 - 12, 3),
      y: round(Math.sin(angle) * radius + Math.sin(time * Math.PI) * 9, 3),
      size: round(8 + unit(recipe.seed, entity, 41) * 26, 2),
      group: segmentNames[group],
      time: `2026-W${String(frame + 1).padStart(2, '0')}`,
    };
  });
}

function geoEvents(recipe) {
  const count = materializationLimit(recipe, 2_400);
  return sampledLogicalRows(recipe, count, (index) => {
    const hub = hubCoordinates[index % hubCoordinates.length];
    const longitude = Math.max(
      -180,
      Math.min(180, hub[0] + gaussian(recipe.seed, index, 50) * 3.2),
    );
    const latitude = Math.max(-85, Math.min(85, hub[1] + gaussian(recipe.seed, index, 52) * 2.2));
    return {
      longitude: round(longitude, 5),
      latitude: round(latitude, 5),
      value: round(25 + unit(recipe.seed, index, 54) * 975, 2),
      category: hub[2],
      label: `${hub[2]} · ${regionalMetricNames[index % regionalMetricNames.length]}`,
    };
  });
}

function relationshipEdges(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'network');
  const limit = materializationLimit(recipe, 8_000);
  const defaultNodeCount = Math.ceil(Math.sqrt(sourceRows(recipe)));
  const requestedCategoryCount = parameter(recipe, 'categoryCount', defaultNodeCount);
  const requestedNodes = integer(
    parameter(recipe, 'nodeCount', requestedCategoryCount),
    defaultNodeCount,
    4,
    5_000,
  );
  // A dense relationship source is pre-aggregated into a readable product
  // workflow. Twelve named nodes keep labels legible at the manual's mobile
  // and desktop viewports while every retained node remains inspectable.
  const visualNodeLimit = family === 'chord' ? 12 : family === 'network' ? 12 : 64;
  const nodes = Math.min(requestedNodes, visualNodeLimit, Math.max(4, Math.floor(limit * 0.72)));
  const nodeLabel = (index) => {
    const base = relationshipNodeNames[index % relationshipNodeNames.length];
    const cohort = Math.floor(index / relationshipNodeNames.length);
    return cohort === 0 ? base : `${base} · ${operatingRegions[cohort % operatingRegions.length]}`;
  };
  const templates = [];
  for (let index = 1; index < nodes && templates.length < limit; index += 1) {
    const community = index % 12;
    const parent =
      family === 'flow' ? Math.max(0, index - 1 - (index % 3)) : Math.floor((index - 1) / 2);
    templates.push({
      id: `edge-${templates.length + 1}`,
      source: nodeLabel(parent),
      target: nodeLabel(index),
      community: relationshipCommunityNames[community % relationshipCommunityNames.length],
    });
    if (family !== 'flow' && index > 3 && templates.length < limit && index % 4 === 0) {
      templates.push({
        id: `edge-${templates.length + 1}`,
        source: nodeLabel(Math.max(0, index - 4)),
        target: nodeLabel(index),
        community: relationshipCommunityNames[community % relationshipCommunityNames.length],
      });
    }
  }
  const aggregates = templates.map(() => ({ count: 0, value: 0 }));
  const processing = processLogicalRows(recipe, (index) => {
    const templateIndex = hash32(recipe.seed ^ index) % templates.length;
    const aggregate = aggregates[templateIndex];
    aggregate.count += 1;
    const value = 2 + unit(recipe.seed, index, 60) * 48;
    aggregate.value += value;
    return { templateIndex, value };
  });
  const rows = templates.map((template, index) => ({
    ...template,
    value: round(aggregates[index].value / aggregates[index].count, 2),
  }));
  return processed(rows, processing);
}

function hierarchyNodes(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'hierarchy');
  const limit = materializationLimit(recipe, 240);
  const skeleton = [];
  for (let index = 0; index < limit; index += 1) {
    const parentIndex = index === 0 ? -1 : Math.floor((index - 1) / 5);
    const depth = index === 0 ? 0 : Math.floor(Math.log(index * 4 + 1) / Math.log(5));
    const initiative = initiativeNames[index % initiativeNames.length];
    const region =
      operatingRegions[Math.floor(index / initiativeNames.length) % operatingRegions.length];
    const train =
      releaseTrainNames[
        Math.floor(index / (initiativeNames.length * operatingRegions.length)) %
          releaseTrainNames.length
      ];
    const label =
      index === 0
        ? 'Statground'
        : `${phaseNames[depth % phaseNames.length]} · ${initiative} · ${region} · ${train}`;
    const id =
      index === 0
        ? 'statground'
        : `${train.toLowerCase()}-${region.toLowerCase().replaceAll(' ', '-')}-${initiative
            .toLowerCase()
            .replaceAll(' ', '-')}`;
    skeleton.push({ id, label, parentIndex, depth });
  }
  const aggregates = skeleton.map(() => ({ count: 0, quality: 0 }));
  const processing = processLogicalRows(recipe, (index) => {
    const target = index < limit ? index : 1 + (hash32(recipe.seed ^ index) % (limit - 1));
    const quality = 0.9 + unit(recipe.seed, index, 66) * 0.2;
    aggregates[target].count += 1;
    aggregates[target].quality += quality;
    return { target, quality };
  });
  const rows = [];
  for (let index = 0; index < skeleton.length; index += 1) {
    const item = skeleton[index];
    const aggregate = aggregates[index];
    const quality = aggregate.quality / Math.max(1, aggregate.count);
    const value = Math.max(
      1,
      Math.round((120_000 / (1 + item.depth * 3 + (index % 17))) * quality),
    );
    rows.push(
      family === 'word-tree'
        ? {
            word: item.label,
            parent: item.parentIndex < 0 ? '' : rows[item.parentIndex].word,
            weight: value,
          }
        : {
            id: item.id,
            parent: item.parentIndex < 0 ? '' : rows[item.parentIndex].id,
            value,
            label: item.label,
          },
    );
  }
  return processed(rows, processing);
}

function textCorpus(recipe) {
  const count = Math.min(
    materializationLimit(recipe, 80),
    Math.max(12, integer(parameter(recipe, 'wordCount', 80), 80, 12, 80)),
  );
  const weights = Array.from({ length: count }, () => 0);
  const processing = processLogicalRows(recipe, (index) => {
    const termIndex =
      index < count
        ? index
        : Math.min(count - 1, Math.floor(unit(recipe.seed, index, 70) ** 2 * count));
    weights[termIndex] += 1;
    return { termIndex, weight: weights[termIndex] };
  });
  const rows = weights.map((weight, index) => ({
    word:
      index < corpusTerms.length
        ? corpusTerms[index]
        : `${corpusTerms[index % corpusTerms.length]} ${regionalMetricNames[index % regionalMetricNames.length]}`,
    weight: Math.max(1, weight),
    language: index % 5 === 0 ? 'ko' : 'mixed',
  }));
  return processed(rows, processing);
}

function multivariateObservations(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'distribution');
  const preferredCount =
    family === 'parallel'
      ? 160
      : family === 'scatter-matrix'
        ? 400
        : family === 'table'
          ? 5_000
          : 2_000;
  const count = materializationLimit(recipe, preferredCount);
  return sampledLogicalRows(recipe, count, (index) => {
    const cohort = index % 5;
    const latent = gaussian(recipe.seed, index, 80);
    const speed = 64 + cohort * 5 + latent * 8 + gaussian(recipe.seed, index, 82) * 2;
    const quality = 72 + cohort * 3 + latent * 5 + gaussian(recipe.seed, index, 84) * 4;
    const cost = 96 - cohort * 7 - latent * 4 + gaussian(recipe.seed, index, 86) * 5;
    const initiative = initiativeNames[index % initiativeNames.length];
    const region =
      operatingRegions[Math.floor(index / initiativeNames.length) % operatingRegions.length];
    const train =
      releaseTrainNames[
        Math.floor(index / (initiativeNames.length * operatingRegions.length)) %
          releaseTrainNames.length
      ];
    return {
      name: `${initiative} · ${region} · ${train}`,
      category: segmentNames[cohort],
      series: index % 2 === 0 ? 'Current' : 'Previous',
      speed: round(speed, 3),
      quality: round(quality, 3),
      cost: round(Math.max(1, cost), 3),
      value: round(quality + speed * 0.25, 3),
      target: round(88 + cohort * 2, 3),
      previous: round(quality + speed * 0.25 - 4.5 - cohort * 0.4, 3),
    };
  });
}

function sourceGridDimensions(recipe) {
  const explicitRows = parameter(recipe, 'rows', recipe.cardinality?.axes?.rows);
  const explicitColumns = parameter(recipe, 'columns', recipe.cardinality?.axes?.columns);
  if (Number.isInteger(explicitRows) && Number.isInteger(explicitColumns)) {
    return [integer(explicitRows, 2, 2, 1_024), integer(explicitColumns, 2, 2, 1_024)];
  }
  const rows = Math.max(1, Math.floor(Math.sqrt(sourceRows(recipe))));
  return [rows, Math.ceil(sourceRows(recipe) / rows)];
}

function gridDimensions(recipe, maximum) {
  const [sourceGridRows, sourceColumns] = sourceGridDimensions(recipe);
  const ratio = sourceColumns / sourceGridRows;
  const minimum = sourceRows(recipe) >= 4 ? 2 : 1;
  const rows = Math.max(minimum, Math.min(sourceGridRows, Math.floor(Math.sqrt(maximum / ratio))));
  const columns = Math.max(
    minimum,
    Math.min(sourceColumns, Math.floor(maximum / Math.max(1, rows))),
  );
  return [rows, columns];
}

function fieldValue(x, y, seed, index) {
  const peakA = Math.exp(-((x + 0.42) ** 2 + (y - 0.18) ** 2) * 7.5) * 92;
  const peakB = Math.exp(-((x - 0.36) ** 2 + (y + 0.3) ** 2) * 13) * 68;
  const basin = Math.exp(-((x - 0.05) ** 2 + (y - 0.02) ** 2) * 4) * 22;
  return peakA + peakB - basin + Math.sin(x * 7 + y * 4) * 6 + signed(seed, index, 90) * 1.4;
}

function grid2d(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'heatmap');
  const preferredCells = family === 'image' ? 9_000 : family === 'contour' ? 6_400 : 3_600;
  const [rows, columns] = gridDimensions(recipe, materializationLimit(recipe, preferredCells));
  const [sourceGridRows, sourceColumns] = sourceGridDimensions(recipe);
  const aggregates = Array.from({ length: rows * columns }, () => ({ count: 0, value: 0 }));
  const processing = processLogicalRows(recipe, (index) => {
    const sourceRow = Math.floor(index / sourceColumns);
    const sourceColumn = index % sourceColumns;
    const x = sourceColumns <= 1 ? 0 : (sourceColumn / (sourceColumns - 1)) * 2 - 1;
    const y = sourceGridRows <= 1 ? 0 : (sourceRow / (sourceGridRows - 1)) * 2 - 1;
    const outputRow = Math.min(rows - 1, Math.floor((sourceRow * rows) / sourceGridRows));
    const outputColumn = Math.min(
      columns - 1,
      Math.floor((sourceColumn * columns) / sourceColumns),
    );
    const aggregate = aggregates[outputRow * columns + outputColumn];
    const value = fieldValue(x, y, recipe.seed, index);
    aggregate.count += 1;
    aggregate.value += value;
    return { sourceRow, sourceColumn, outputRow, outputColumn, value };
  });
  const output = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const x = columns <= 1 ? 0 : (column / (columns - 1)) * 2 - 1;
      const y = rows <= 1 ? 0 : (row / (rows - 1)) * 2 - 1;
      const aggregate = aggregates[index];
      if (aggregate.count === 0) continue;
      const value = aggregate.value / aggregate.count;
      const normalized = Math.max(0, Math.min(1, (value + 28) / 126));
      output.push({
        row,
        column,
        x: family === 'image' ? column : round(x, 5),
        y: family === 'image' ? row : round(y, 5),
        a: round(x, 5),
        b: round(y, 5),
        px: round(x + Math.sin(y * Math.PI) * 0.16, 5),
        py: round(y + Math.cos(x * Math.PI) * 0.12, 5),
        value: round(value, 4),
        red: Math.round(28 + normalized * 218),
        green: Math.round(45 + (1 - Math.abs(normalized - 0.55) * 1.5) * 155),
        blue: Math.round(80 + (1 - normalized) * 165),
      });
    }
  }
  return processed(output, processing);
}

function ternaryComposition(recipe) {
  const count = materializationLimit(recipe, 1_500);
  return sampledLogicalRows(recipe, count, (index) => {
    const rawA = 0.08 + unit(recipe.seed, index, 100) ** 1.4;
    const rawB = 0.08 + unit(recipe.seed, index, 101) ** 1.2;
    const rawC = 0.08 + unit(recipe.seed, index, 102) ** 1.6;
    const total = rawA + rawB + rawC;
    return {
      a: round(rawA / total, 7),
      b: round(rawB / total, 7),
      c: round(rawC / total, 7),
      series: segmentNames[index % 6],
    };
  });
}

function smithSweep(recipe) {
  const count = materializationLimit(recipe, 800);
  return sampledLogicalRows(recipe, count, (index, logicalCount) => {
    const t = logicalCount <= 1 ? 0 : index / (logicalCount - 1);
    const frequency = 0.8 + t * 5.2;
    return {
      frequency: round(frequency, 6),
      real: round(Math.max(0, 0.08 + 1.9 * t + Math.sin(t * Math.PI * 4) * 0.12), 7),
      imaginary: round(Math.sin((t - 0.5) * Math.PI * 3) * (1.3 - t * 0.45), 7),
    };
  });
}

function vennMembership(recipe) {
  const setCount = integer(parameter(recipe, 'aggregateSetCount', 5), 5, 2, 5);
  const combinations = 2 ** setCount - 1;
  const counts = Array.from({ length: combinations + 1 }, () => 0);
  const processing = processLogicalRows(recipe, (index) => {
    const membership =
      index < combinations ? index + 1 : 1 + (hash32(recipe.seed ^ index) % combinations);
    for (let mask = 1; mask <= combinations; mask += 1) {
      if ((membership & mask) === mask) counts[mask] += 1;
    }
    return { membership };
  });
  const rows = [];
  for (let mask = 1; mask <= combinations; mask += 1) {
    const names = [];
    for (let index = 0; index < setCount; index += 1) {
      if ((mask & (1 << index)) !== 0) names.push(vennSetNames[index]);
    }
    const size = counts[mask];
    rows.push({
      category: names.join('&'),
      sets: names,
      size,
      members: [`${size.toLocaleString('en-US')} logical records`],
    });
  }
  return processed(
    rows.sort((left, right) => right.size - left.size),
    processing,
  );
}

function surfaceGrid(recipe) {
  const [rows, columns] = gridDimensions(recipe, materializationLimit(recipe, 262_144));
  const [sourceGridRows, sourceColumns] = sourceGridDimensions(recipe);
  const x = Array.from({ length: columns }, (_, column) =>
    round((column / (columns - 1)) * 8 - 4, 5),
  );
  const y = Array.from({ length: rows }, (_, row) => round((row / (rows - 1)) * 6 - 3, 5));
  const aggregates = Array.from({ length: rows * columns }, () => ({ count: 0, value: 0 }));
  const processing = processLogicalRows(recipe, (index) => {
    const sourceRow = Math.floor(index / sourceColumns);
    const sourceColumn = index % sourceColumns;
    const normalizedX = sourceColumns <= 1 ? 0 : (sourceColumn / (sourceColumns - 1)) * 2 - 1;
    const normalizedY = sourceGridRows <= 1 ? 0 : (sourceRow / (sourceGridRows - 1)) * 2 - 1;
    const outputRow = Math.min(rows - 1, Math.floor((sourceRow * rows) / sourceGridRows));
    const outputColumn = Math.min(
      columns - 1,
      Math.floor((sourceColumn * columns) / sourceColumns),
    );
    const aggregate = aggregates[outputRow * columns + outputColumn];
    const value = fieldValue(normalizedX, normalizedY, recipe.seed, index) / 24;
    aggregate.count += 1;
    aggregate.value += value;
    return { sourceRow, sourceColumn, outputRow, outputColumn, value };
  });
  const z = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const aggregate = aggregates[row * columns + column];
      z.push(round(aggregate.value / Math.max(1, aggregate.count), 5));
    }
  }
  return processed({ rows, columns, x, y, z, values: [...z] }, processing);
}

function sourceVolumeDimensions(recipe) {
  const dimensions = Array.isArray(parameter(recipe, 'dimensions', undefined))
    ? parameter(recipe, 'dimensions', undefined)
    : recipe.cardinality?.axes?.dimensions;
  if (Array.isArray(dimensions) && dimensions.length === 3) {
    return dimensions.map((value) => integer(value, 2, 2, 256));
  }
  const side = Math.max(2, Math.round(Math.cbrt(sourceRows(recipe))));
  return [side, side, Math.max(2, Math.ceil(sourceRows(recipe) / (side * side)))];
}

function volumeDimensions(recipe, maximum) {
  const source = sourceVolumeDimensions(recipe);
  const scale = Math.min(1, Math.cbrt(maximum / (source[0] * source[1] * source[2])));
  let output = source.map((value) => Math.max(2, Math.floor(value * scale)));
  while (output[0] * output[1] * output[2] > maximum) {
    const largest = output.indexOf(Math.max(...output));
    output[largest] = Math.max(2, output[largest] - 1);
  }
  return output;
}

function volumeFieldValue(nx, ny, nz) {
  const lobeA = Math.exp(-((nx + 0.28) ** 2 * 5 + (ny - 0.15) ** 2 * 8 + (nz + 0.08) ** 2 * 6));
  const lobeB = Math.exp(-((nx - 0.38) ** 2 * 10 + (ny + 0.3) ** 2 * 7 + (nz - 0.24) ** 2 * 11));
  const ring = Math.exp(-((Math.hypot(nx, ny) - 0.54) ** 2) * 32 - nz * nz * 7);
  return lobeA * 0.92 + lobeB * 0.78 + ring * 0.32;
}

function volumeGrid(recipe) {
  const dimensions = volumeDimensions(recipe, materializationLimit(recipe, 262_144));
  const [width, height, depth] = dimensions;
  const [sourceWidth, sourceHeight, sourceDepth] = sourceVolumeDimensions(recipe);
  const aggregates = Array.from({ length: width * height * depth }, () => ({
    count: 0,
    value: 0,
  }));
  const processing = processLogicalRows(recipe, (index) => {
    const sourceX = index % sourceWidth;
    const sourceY = Math.floor(index / sourceWidth) % sourceHeight;
    const sourceZ = Math.floor(index / (sourceWidth * sourceHeight));
    const nx = sourceWidth <= 1 ? 0 : (sourceX / (sourceWidth - 1)) * 2 - 1;
    const ny = sourceHeight <= 1 ? 0 : (sourceY / (sourceHeight - 1)) * 2 - 1;
    const nz = sourceDepth <= 1 ? 0 : (sourceZ / (sourceDepth - 1)) * 2 - 1;
    const x = Math.min(width - 1, Math.floor((sourceX * width) / sourceWidth));
    const y = Math.min(height - 1, Math.floor((sourceY * height) / sourceHeight));
    const z = Math.min(depth - 1, Math.floor((sourceZ * depth) / sourceDepth));
    const aggregate = aggregates[z * width * height + y * width + x];
    const value = volumeFieldValue(nx, ny, nz);
    aggregate.count += 1;
    aggregate.value += value;
    return { sourceX, sourceY, sourceZ, x, y, z, value };
  });
  const values = aggregates.map((aggregate) =>
    round(aggregate.value / Math.max(1, aggregate.count), 6),
  );
  return processed(
    {
      dimensions,
      values,
      origin: [-1, -1, -1],
      spacing: [2 / (width - 1), 2 / (height - 1), 2 / (depth - 1)],
    },
    processing,
  );
}

function vectorComponents(x, y, z) {
  const attenuation = Math.exp(-(x * x + y * y + z * z) * 0.28);
  return [-y * attenuation, x * attenuation, (0.32 + Math.sin((x + y) * 1.4) * 0.18) * attenuation];
}

function spatialVector(recipe) {
  const maximum = materializationLimit(recipe, recipe.shape === 'rows' ? 625 : 3_375);
  if (recipe.shape === 'rows') {
    const sourceSide = Math.max(2, Math.ceil(Math.sqrt(sourceRows(recipe))));
    return sampledLogicalRows(recipe, maximum, (index) => {
      const xIndex = index % sourceSide;
      const yIndex = Math.floor(index / sourceSide);
      const x = (xIndex / (sourceSide - 1)) * 4 - 2;
      const y = (yIndex / (sourceSide - 1)) * 4 - 2;
      const [u, v] = vectorComponents(x, y, 0);
      const magnitude = Math.hypot(u, v);
      return {
        x: round(x, 5),
        y: round(y, 5),
        value: round(u, 6),
        high: round(v, 6),
        direction: round(((Math.atan2(v, u) * 180) / Math.PI + 360) % 360, 4),
        magnitude: round(magnitude, 6),
      };
    });
  }
  const [sourceWidth, sourceHeight, sourceDepth] = sourceVolumeDimensions(recipe);
  const sample = sampledLogicalRows(recipe, maximum, (index) => {
    const xIndex = index % sourceWidth;
    const yIndex = Math.floor(index / sourceWidth) % sourceHeight;
    const zIndex = Math.floor(index / (sourceWidth * sourceHeight));
    const x = (xIndex / (sourceWidth - 1)) * 4 - 2;
    const y = (yIndex / (sourceHeight - 1)) * 4 - 2;
    const z = (zIndex / (sourceDepth - 1)) * 3 - 1.5;
    const eastWest = x < -0.35 ? 'west' : x > 0.35 ? 'east' : 'central';
    const northSouth = y < -0.35 ? 'south' : y > 0.35 ? 'north' : 'midline';
    const altitude = z < -0.3 ? 'lower' : z > 0.3 ? 'upper' : 'middle';
    return {
      origin: [round(x, 5), round(y, 5), round(z, 5)],
      vector: vectorComponents(x, y, z).map((value) => round(value, 6)),
      label: `${altitude} ${northSouth} ${eastWest} flow`,
      color: palette[index % palette.length],
    };
  });
  return processed(
    {
      origins: sample.data.map(({ origin }) => origin),
      vectors: sample.data.map(({ vector }) => vector),
      labels: sample.data.map(({ label }) => label),
      colors: sample.data.map(({ color }) => color),
    },
    sample,
  );
}

const generators = {
  'time-signal': timeSignal,
  'categorical-events': categoricalEvents,
  'clustered-points': clusteredPoints,
  'interval-sequence': intervalSequence,
  'ohlcv-sequence': ohlcvSequence,
  'motion-trajectories': motionTrajectories,
  'geo-events': geoEvents,
  'relationship-edges': relationshipEdges,
  'hierarchy-nodes': hierarchyNodes,
  'text-corpus': textCorpus,
  'multivariate-observations': multivariateObservations,
  'grid-2d': grid2d,
  'ternary-composition': ternaryComposition,
  'smith-sweep': smithSweep,
  'venn-membership': vennMembership,
  'surface-grid': surfaceGrid,
  'volume-grid': volumeGrid,
  'spatial-vector': spatialVector,
};

function dataCardinality(data) {
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.z)) return data.z.length;
  if (Array.isArray(data.values)) return data.values.length;
  if (Array.isArray(data.origins)) return data.origins.length;
  throw new TypeError('Invalid Graflume demo materialization: unsupported output shape.');
}

function spatialPreview(data, maximumRows) {
  if (Array.isArray(data)) {
    return sampledRows(data, maximumRows, (row) =>
      numeric(row.value ?? row.magnitude ?? row.weight, 0),
    );
  }
  if (Array.isArray(data.z)) {
    const middle = Math.floor(data.rows / 2);
    return evenlySpacedIndices(data.columns, Math.min(maximumRows, data.columns)).map((column) => {
      const index = middle * data.columns + column;
      return {
        row: middle,
        column,
        x: data.x?.[column] ?? column,
        y: data.y?.[middle] ?? middle,
        z: data.z[index],
        value: data.values?.[index] ?? data.z[index],
      };
    });
  }
  if (Array.isArray(data.values)) {
    const [width, height, depth] = data.dimensions;
    const z = Math.floor(depth / 2);
    return evenlySpacedIndices(width * height, Math.min(maximumRows, width * height)).map(
      (within) => {
        const x = within % width;
        const y = Math.floor(within / width);
        return { x, y, z, value: data.values[z * width * height + within] };
      },
    );
  }
  return evenlySpacedIndices(data.origins.length, Math.min(maximumRows, data.origins.length)).map(
    (index) => {
      const [x, y, z] = data.origins[index];
      const [u, v, w] = data.vectors[index];
      return {
        x,
        y,
        z,
        u,
        v,
        w,
        magnitude: round(Math.hypot(u, v, w), 6),
        color: data.colors?.[index] ?? palette[index % palette.length],
        label: data.labels?.[index] ?? `Vector ${index + 1}`,
      };
    },
  );
}

function previewRowsFor(recipe, definition, data) {
  const maximumRows = integer(recipe.preview?.maximumRows, 12, 1, 12);
  if (definition.previewMethod === 'top-groups' && Array.isArray(data)) {
    return [...data]
      .sort(
        (left, right) =>
          numeric(right.value ?? right.weight, 0) - numeric(left.value ?? left.weight, 0),
      )
      .slice(0, maximumRows)
      .map((row) => ({ ...row }));
  }
  if (definition.previewMethod === 'hierarchy-focus' && Array.isArray(data)) {
    return data.slice(0, maximumRows).map((row) => ({ ...row }));
  }
  if (definition.previewMethod === 'intersection-summary' && Array.isArray(data)) {
    return data.slice(0, maximumRows).map((row) => ({ ...row }));
  }
  if (definition.previewMethod === 'trajectory-frames' && Array.isArray(data)) {
    const frames = [...new Set(data.map((row) => row.time))];
    const selectedFrames = new Set([
      frames[0],
      frames[Math.floor(frames.length / 2)],
      frames.at(-1),
    ]);
    return data
      .filter((row) => selectedFrames.has(row.time))
      .slice(0, maximumRows)
      .map((row) => ({ ...row }));
  }
  const preview = spatialPreview(data, maximumRows);
  if (
    recipe.parameters.family === 'annotation' &&
    Array.isArray(data) &&
    !preview.some((row) => typeof row.annotation === 'string' && row.annotation.length > 0)
  ) {
    const milestone = data.find(
      (row) => typeof row.annotation === 'string' && row.annotation.length > 0,
    );
    if (milestone !== undefined) {
      preview[preview.length - 1] = { ...milestone };
      preview.sort((left, right) => String(left.date).localeCompare(String(right.date)));
    }
  }
  return preview;
}

const recipeKeys = [
  'id',
  'version',
  'seed',
  'shape',
  'parameters',
  'cardinality',
  'reduction',
  'outputBudget',
  'preview',
  'initialView',
  'expectedInvariants',
];
const axesByRecipe = {
  'time-signal': [],
  'categorical-events': ['categoryCount'],
  'clustered-points': [],
  'interval-sequence': [],
  'ohlcv-sequence': [],
  'motion-trajectories': ['entityCount', 'frameCount'],
  'geo-events': [],
  'relationship-edges': ['nodeCount', 'categoryCount'],
  'hierarchy-nodes': ['nodeCount'],
  'text-corpus': [],
  'multivariate-observations': [],
  'grid-2d': ['rows', 'columns'],
  'ternary-composition': [],
  'smith-sweep': [],
  'venn-membership': ['aggregateSetCount'],
  'surface-grid': ['rows', 'columns'],
  'volume-grid': ['dimensions'],
  'spatial-vector': ['vectors', 'dimensions'],
};
const stageByRecipe = {
  'time-signal': 'bin',
  'categorical-events': 'pre-aggregate',
  'clustered-points': 'sample',
  'interval-sequence': 'sample',
  'ohlcv-sequence': 'bin',
  'motion-trajectories': 'sample',
  'geo-events': 'sample',
  'relationship-edges': 'pre-aggregate',
  'hierarchy-nodes': 'level-of-detail',
  'text-corpus': 'pre-aggregate',
  'multivariate-observations': 'sample',
  'grid-2d': 'level-of-detail',
  'ternary-composition': 'sample',
  'smith-sweep': 'sample',
  'venn-membership': 'pre-aggregate',
  'surface-grid': 'level-of-detail',
  'volume-grid': 'level-of-detail',
  'spatial-vector': 'level-of-detail',
};
const resourcesByRecipe = {
  'time-signal': ['marks', 'line-points', 'bar-marks', 'combined-marks'],
  'categorical-events': ['marks', 'bar-marks', 'radial-marks'],
  'clustered-points': ['marks', 'point-marks'],
  'interval-sequence': ['marks', 'bar-marks'],
  'ohlcv-sequence': ['marks', 'bar-marks', 'line-points'],
  'motion-trajectories': ['marks', 'point-marks'],
  'geo-events': ['marks', 'point-marks'],
  'relationship-edges': ['marks', 'bar-marks', 'line-points'],
  'hierarchy-nodes': ['marks', 'bar-marks'],
  'text-corpus': ['marks', 'bar-marks'],
  'multivariate-observations': [
    'marks',
    'line-points',
    'point-marks',
    'visible-rows',
    'parallel-paths',
  ],
  'grid-2d': ['marks', 'bar-marks', 'line-points'],
  'ternary-composition': ['marks', 'point-marks'],
  'smith-sweep': ['marks', 'line-points'],
  'venn-membership': ['marks', 'set-intersections'],
  'surface-grid': ['spatial-elements', 'grid-points'],
  'volume-grid': ['spatial-elements', 'sampled-voxels'],
  'spatial-vector': ['marks', 'point-marks', 'spatial-elements', 'vectors'],
};

function closedObject(value, allowedKeys, requiredKeys, label) {
  invariant(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`,
  );
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    invariant(allowed.has(key), `${label}.${key} is not allowed`);
  }
  for (const key of requiredKeys) {
    invariant(Object.hasOwn(value, key), `${label}.${key} is required`);
  }
}

function numericDomain(value, label) {
  invariant(
    Array.isArray(value) &&
      value.length === 2 &&
      value.every(Number.isFinite) &&
      value[0] <= value[1],
    `${label} must be a finite ordered pair`,
  );
}

function validateRecipe(recipe) {
  closedObject(recipe, recipeKeys, recipeKeys, 'recipe');
  invariant(recipe.version === 2, 'version must equal 2');
  invariant(definitionById.has(recipe.id), `unknown recipe id ${String(recipe.id)}`);
  const definition = definitionById.get(recipe.id);
  invariant(
    definition.shape === recipe.shape ||
      (definition.shape === 'rows-or-vector-set' && ['rows', 'vector-set'].includes(recipe.shape)),
    `shape ${String(recipe.shape)} does not match ${recipe.id}`,
  );
  invariant(
    Number.isInteger(recipe.seed) && recipe.seed >= 1 && recipe.seed <= 0xffffffff,
    'seed must be an unsigned non-zero 32-bit integer',
  );
  closedObject(
    recipe.parameters,
    definition.parameterKeys,
    commonParameterKeys,
    'recipe.parameters',
  );
  invariant(
    typeof recipe.parameters.family === 'string' &&
      recipe.parameters.family.length > 0 &&
      typeof recipe.parameters.scenario === 'string' &&
      recipe.parameters.scenario.length > 0,
    'common parameters must be non-empty',
  );
  for (const key of ['valueFields', 'positiveFields', 'nullableFields']) {
    invariant(Array.isArray(recipe.parameters[key]), `recipe.parameters.${key} must be an array`);
  }
  closedObject(
    recipe.cardinality,
    ['sourceRows', 'unit', 'axes'],
    ['sourceRows', 'unit', 'axes'],
    'recipe.cardinality',
  );
  invariant(
    Number.isInteger(recipe.cardinality.sourceRows) && recipe.cardinality.sourceRows >= 1,
    'cardinality.sourceRows must be a positive integer',
  );
  const expectedUnit =
    recipe.id === 'categorical-events' || recipe.id === 'text-corpus'
      ? 'events'
      : recipe.id === 'relationship-edges'
        ? 'edges'
        : recipe.id === 'hierarchy-nodes'
          ? 'nodes'
          : recipe.shape === 'surface-grid' || recipe.id === 'grid-2d'
            ? 'cells'
            : recipe.shape === 'volume-grid'
              ? 'voxels'
              : recipe.shape === 'vector-set'
                ? 'vectors'
                : 'rows';
  invariant(
    recipe.cardinality.unit === expectedUnit,
    `cardinality.unit must equal ${expectedUnit}`,
  );
  closedObject(recipe.cardinality.axes, axesByRecipe[recipe.id], [], 'recipe.cardinality.axes');
  for (const [key, axisValue] of Object.entries(recipe.cardinality.axes)) {
    if (key === 'vectors') continue;
    const parameterValue = parameter(recipe, key, undefined);
    invariant(
      JSON.stringify(parameterValue) === JSON.stringify(axisValue),
      `cardinality.axes.${key} must match recipe.parameters.${key}`,
    );
  }
  if (
    Number.isInteger(recipe.cardinality.axes.entityCount) &&
    Number.isInteger(recipe.cardinality.axes.frameCount)
  ) {
    invariant(
      recipe.cardinality.axes.entityCount * recipe.cardinality.axes.frameCount ===
        recipe.cardinality.sourceRows,
      'motion axes must multiply to cardinality.sourceRows',
    );
  }
  if (
    Number.isInteger(recipe.cardinality.axes.rows) &&
    Number.isInteger(recipe.cardinality.axes.columns)
  ) {
    invariant(
      recipe.cardinality.axes.rows * recipe.cardinality.axes.columns ===
        recipe.cardinality.sourceRows,
      'grid axes must multiply to cardinality.sourceRows',
    );
  }
  if (Array.isArray(recipe.cardinality.axes.dimensions)) {
    invariant(
      recipe.cardinality.axes.dimensions.length === 3 &&
        recipe.cardinality.axes.dimensions.every(
          (value) => Number.isInteger(value) && value >= 2,
        ) &&
        recipe.cardinality.axes.dimensions.reduce((total, value) => total * value, 1) ===
          recipe.cardinality.sourceRows,
      'volume dimensions must multiply to cardinality.sourceRows',
    );
  }
  if (Number.isInteger(recipe.cardinality.axes.vectors)) {
    invariant(
      recipe.cardinality.axes.vectors === recipe.cardinality.sourceRows,
      'vector axis must equal cardinality.sourceRows',
    );
  }
  closedObject(recipe.reduction, ['stage', 'method'], ['stage', 'method'], 'recipe.reduction');
  invariant(
    recipe.reduction.stage === stageByRecipe[recipe.id],
    'reduction stage does not match the recipe id',
  );
  invariant(
    recipe.reduction.method === definition.reductionMethod,
    'reduction method does not match the recipe id',
  );
  closedObject(
    recipe.outputBudget,
    ['resource', 'maximum'],
    ['resource', 'maximum'],
    'recipe.outputBudget',
  );
  invariant(
    resourcesByRecipe[recipe.id].includes(recipe.outputBudget.resource),
    `outputBudget.resource ${String(recipe.outputBudget.resource)} does not match ${recipe.id}`,
  );
  invariant(
    Number.isInteger(recipe.outputBudget.maximum) &&
      recipe.outputBudget.maximum >= 1 &&
      recipe.outputBudget.maximum <= 4_194_304,
    'outputBudget.maximum is outside the safe contract',
  );
  closedObject(
    recipe.preview,
    ['method', 'maximumRows'],
    ['method', 'maximumRows'],
    'recipe.preview',
  );
  invariant(
    recipe.preview.method === definition.previewMethod,
    'preview method does not match the recipe id',
  );
  invariant(
    Number.isInteger(recipe.preview.maximumRows) &&
      recipe.preview.maximumRows >= 1 &&
      recipe.preview.maximumRows <= 12,
    'preview.maximumRows is outside the closed range',
  );
  closedObject(
    recipe.initialView,
    ['kind', 'zoom', 'xDomain', 'yDomain', 'zDomain', 'frame', 'sliceAxis', 'sliceIndex'],
    ['kind', 'zoom'],
    'recipe.initialView',
  );
  invariant(
    ['domain', 'viewport', 'camera', 'slice'].includes(recipe.initialView.kind),
    'initialView.kind is unknown',
  );
  invariant(
    Number.isFinite(recipe.initialView.zoom) && recipe.initialView.zoom > 0,
    'initialView.zoom must be positive',
  );
  for (const key of ['xDomain', 'yDomain', 'zDomain']) {
    if (Object.hasOwn(recipe.initialView, key))
      numericDomain(recipe.initialView[key], `recipe.initialView.${key}`);
  }
  invariant(
    Array.isArray(recipe.expectedInvariants) &&
      recipe.expectedInvariants.length > 0 &&
      recipe.expectedInvariants.every((value) => typeof value === 'string' && value.length > 0) &&
      new Set(recipe.expectedInvariants).size === recipe.expectedInvariants.length,
    'expectedInvariants must be a unique non-empty string array',
  );
}

function validateProcessingEvidence(materialization, logicalRows) {
  invariant(
    materialization.generatedRows === logicalRows,
    `generated rows ${materialization.generatedRows} do not match source rows ${logicalRows}`,
  );
  invariant(
    materialization.processedRows === logicalRows,
    `processed rows ${materialization.processedRows} do not match source rows ${logicalRows}`,
  );
  const evidence = materialization.processingEvidence;
  invariant(
    evidence?.algorithm === 'logical-row-fnv1a32-v1' && /^[0-9a-f]{8}$/.test(evidence.digest),
    'processing evidence digest is invalid',
  );
  const expectedBoundaries = [...new Set([0, Math.floor((logicalRows - 1) / 2), logicalRows - 1])];
  invariant(
    Array.isArray(evidence.boundaryRows) &&
      evidence.boundaryRows.length === expectedBoundaries.length &&
      evidence.boundaryRows.every(
        (boundary, index) =>
          boundary.index === expectedBoundaries[index] &&
          /^[0-9a-f]{8}$/.test(boundary.contributionDigest) &&
          /^[0-9a-f]{8}$/.test(boundary.prefixBeforeDigest) &&
          /^[0-9a-f]{8}$/.test(boundary.prefixDigest),
      ),
    'processing evidence boundaries are invalid',
  );
  invariant(
    evidence.boundaryRows.at(-1)?.prefixDigest === evidence.digest,
    'last logical row must contribute to the final processing digest',
  );
}

/**
 * Internal audit surface used by source tests. It is intentionally not
 * re-exported by the public Graflume entry points or serialized into catalogs.
 */
export function auditDemoRecipeProcessing(recipe) {
  validateRecipe(recipe);
  const logicalRows = sourceRows(recipe);
  const materialization = generators[recipe.id](recipe);
  validateProcessingEvidence(materialization, logicalRows);
  return {
    recipeId: recipe.id,
    sourceRows: logicalRows,
    generatedRows: materialization.generatedRows,
    processedRows: materialization.processedRows,
    processingEvidence: {
      ...materialization.processingEvidence,
      boundaryRows: materialization.processingEvidence.boundaryRows.map((boundary) => ({
        ...boundary,
      })),
    },
  };
}

/**
 * Materialize a closed Graflume demo recipe into deterministic, output-bounded data.
 * The logical source cardinality remains in the plan; generated data is a semantic LOD.
 */
export function materializeDemoRecipe(recipe) {
  validateRecipe(recipe);
  const definition = definitionById.get(recipe.id);
  const materialization = generators[recipe.id](recipe);
  const data = materialization.data;
  const logicalRows = sourceRows(recipe);
  validateProcessingEvidence(materialization, logicalRows);
  const derivedRows = dataCardinality(data);
  const renderedMaximum = integer(recipe.outputBudget.maximum, 1, 1, 4_194_304);
  invariant(
    derivedRows <= renderedMaximum,
    `derived output ${derivedRows} exceeds budget ${renderedMaximum}`,
  );
  const previewRows = previewRowsFor(recipe, definition, data);
  invariant(
    previewRows.length >= 1 && previewRows.length <= 12,
    'preview must contain between 1 and 12 rows',
  );
  return {
    data,
    previewRows,
    plan: {
      recipeId: recipe.id,
      seed: recipe.seed,
      sourceRows: logicalRows,
      generatedRows: materialization.generatedRows,
      processedRows: materialization.processedRows,
      derivedRows,
      renderedRows: derivedRows,
      renderedMaximum,
      reduction: { stage: recipe.reduction.stage, method: recipe.reduction.method },
      budget: { resource: recipe.outputBudget.resource, maximum: renderedMaximum },
    },
  };
}
