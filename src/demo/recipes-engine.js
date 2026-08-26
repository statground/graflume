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
  const rows = [];
  for (let series = 0; series < seriesCount; series += 1) {
    for (let index = 0; index < perSeries; index += 1) {
      const progress = perSeries <= 1 ? 0 : index / (perSeries - 1);
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
        signed(recipe.seed, index, series) * 2.4;
      const day = Math.round(progress * daySpan);
      rows.push({
        date: isoDate(day),
        category: isoDate(day).slice(0, 7),
        value: round(value, 2),
        target: round(70 + progress * 22 + series * 6, 2),
        previous: round(value - 4 - Math.sin(progress * 9) * 3, 2),
        annotation: Math.abs(progress - 0.72) < 1 / Math.max(1, perSeries) ? 'Campaign lift' : '',
        series: seriesNames[series % seriesNames.length],
        angle: round(progress * 360, 3),
      });
    }
  }
  return rows;
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
  const rows = Array.from({ length: count }, (_, index) => {
    const base = 1_600 / (1 + index * 0.23);
    const value = Math.max(0, base * (0.84 + unit(recipe.seed, index, 1) * 0.32));
    return {
      category: index < labels.length ? labels[index] : `Segment ${index + 1}`,
      value: round(value, 1),
      previous: round(value * (0.82 + unit(recipe.seed, index, 2) * 0.2), 1),
      target: round(value * (1.05 + unit(recipe.seed, index, 3) * 0.12), 1),
      radius: round(18 + unit(recipe.seed, index, 4) * 34, 2),
    };
  });
  if (family === 'funnel') rows.sort((left, right) => right.value - left.value);
  if (family === 'waterfall') {
    rows.forEach((row, index) => {
      row.value = round((index === 0 ? 1 : index % 3 === 0 ? -0.38 : 0.24) * row.value, 1);
    });
  }
  if (family === 'gauge') {
    rows[0] = { category: 'Reliability', value: 99.93, previous: 99.84, target: 99.9, radius: 34 };
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
  return rows;
}

function clusteredPoints(recipe) {
  const count = materializationLimit(recipe, 4_000);
  const clusterCount = integer(parameter(recipe, 'clusterCount', 6), 6, 2, 12);
  return Array.from({ length: count }, (_, index) => {
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
      label: `Observation ${index + 1}`,
    };
  });
}

function intervalSequence(recipe) {
  const count = materializationLimit(recipe, 64);
  const rows = Array.from({ length: count }, (_, index) => {
    const lane = index % phaseNames.length;
    const startDay = Math.floor(index / phaseNames.length) * 2 + lane;
    const duration = 2 + Math.floor(unit(recipe.seed, index, 20) * 10);
    const low = round(18 + lane * 10 + signed(recipe.seed, index, 21) * 4, 2);
    const high = round(low + 5 + unit(recipe.seed, index, 22) * 16, 2);
    return {
      id: `interval-${index + 1}`,
      category: `${phaseNames[lane]} ${Math.floor(index / phaseNames.length) + 1}`,
      start: isoDate(startDay),
      end: isoDate(startDay + duration),
      low,
      high,
      value: round((low + high) / 2, 2),
      progress: Math.round(unit(recipe.seed, index, 23) * 100),
    };
  });
  return rows;
}

function ohlcvSequence(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'candlestick');
  const preferredCount = family === 'candlestick' ? 720 : family === 'price-blocks' ? 900 : 1_000;
  const count = materializationLimit(recipe, preferredCount);
  const source = sourceRows(recipe);
  const binSize = Math.max(1, source / count);
  const rows = [];
  let previousClose = 118 + unit(recipe.seed, 0, 30) * 8;
  for (let index = 0; index < count; index += 1) {
    const trend = index / Math.max(1, count - 1);
    const open = previousClose;
    const impulse = Math.sin(index * 0.11) * 1.3 + signed(recipe.seed, index, 31) * 2.1 + 0.035;
    const close = Math.max(1, open + impulse);
    const spread = 0.6 + unit(recipe.seed, index, 32) * 2.8;
    const low = Math.max(
      0.01,
      Math.min(open, close) - spread * (0.45 + unit(recipe.seed, index, 33)),
    );
    const high = Math.max(open, close) + spread * (0.45 + unit(recipe.seed, index, 34));
    const volume = Math.round((85_000 + unit(recipe.seed, index, 35) * 340_000) * binSize);
    const middle = (open + high + low + close) / 4;
    rows.push({
      // Source rows represent intraday observations; each emitted row is one
      // aggregate candle. Keep the displayed horizon realistic instead of
      // stretching the logical event count across centuries.
      date: isoDate(index),
      open: round(open, 4),
      high: round(high, 4),
      low: round(low, 4),
      close: round(close, 4),
      value: round(close, 4),
      price: round(middle, 4),
      volume,
      lower: round(close * (0.965 - trend * 0.003), 4),
      upper: round(close * (1.035 + trend * 0.003), 4),
      signal: round((open + close) / 2, 4),
    });
    previousClose = close;
  }
  if (family === 'volume-profile') {
    const bins = new Map();
    for (const row of rows) {
      const price = Math.round(row.price / 2) * 2;
      const current = bins.get(price) ?? { date: row.date, price, volume: 0 };
      current.volume += row.volume;
      bins.set(price, current);
    }
    return [...bins.values()].sort((left, right) => left.price - right.price);
  }
  return rows;
}

function motionTrajectories(recipe) {
  const desiredFrames = integer(parameter(recipe, 'frameCount', 20), 20, 2, 120);
  const desiredEntities = integer(parameter(recipe, 'entityCount', 5_000), 5_000, 1, 50_000);
  const limit = materializationLimit(recipe, 4_000);
  const frames = Math.min(desiredFrames, Math.max(2, Math.floor(Math.sqrt(limit))));
  const entities = Math.min(desiredEntities, Math.max(1, Math.floor(limit / frames)));
  const rows = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame / Math.max(1, frames - 1);
    for (let entity = 0; entity < entities; entity += 1) {
      const group = entity % 6;
      const baseAngle = (entity / Math.max(1, entities)) * Math.PI * 2;
      const radius = 25 + group * 5 + signed(recipe.seed, entity, 40) * 4;
      const angle = baseAngle + time * (0.8 + group * 0.17);
      rows.push({
        id: `entity-${entity + 1}`,
        x: round(Math.cos(angle) * radius + time * 24 - 12, 3),
        y: round(Math.sin(angle) * radius + Math.sin(time * Math.PI) * 9, 3),
        size: round(8 + unit(recipe.seed, entity, 41) * 26, 2),
        group: segmentNames[group],
        time: `Frame ${String(frame + 1).padStart(2, '0')}`,
      });
    }
  }
  return rows;
}

function geoEvents(recipe) {
  const count = materializationLimit(recipe, 2_400);
  return Array.from({ length: count }, (_, index) => {
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
      label: `${hub[2]} event ${index + 1}`,
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
    return cohort === 0 ? base : `${base} ${cohort + 1}`;
  };
  const rows = [];
  for (let index = 1; index < nodes && rows.length < limit; index += 1) {
    const community = index % 12;
    const parent =
      family === 'flow' ? Math.max(0, index - 1 - (index % 3)) : Math.floor((index - 1) / 2);
    rows.push({
      id: `edge-${rows.length + 1}`,
      source: nodeLabel(parent),
      target: nodeLabel(index),
      value: round(2 + unit(recipe.seed, index, 60) * 48, 2),
      community: relationshipCommunityNames[community % relationshipCommunityNames.length],
    });
    if (family !== 'flow' && index > 3 && rows.length < limit && index % 4 === 0) {
      rows.push({
        id: `edge-${rows.length + 1}`,
        source: nodeLabel(Math.max(0, index - 4)),
        target: nodeLabel(index),
        value: round(1 + unit(recipe.seed, index, 61) * 20, 2),
        community: relationshipCommunityNames[community % relationshipCommunityNames.length],
      });
    }
  }
  return rows;
}

function hierarchyNodes(recipe) {
  const family = stringValue(parameter(recipe, 'family', ''), 'hierarchy');
  const limit = materializationLimit(recipe, 240);
  const rows = [];
  for (let index = 0; index < limit; index += 1) {
    const parentIndex = index === 0 ? -1 : Math.floor((index - 1) / 5);
    const depth = index === 0 ? 0 : Math.floor(Math.log(index * 4 + 1) / Math.log(5));
    const label = index === 0 ? 'Statground' : `${phaseNames[depth % phaseNames.length]} ${index}`;
    const value = Math.max(1, Math.round(120_000 / (1 + depth * 3 + (index % 17))));
    rows.push(
      family === 'word-tree'
        ? { word: label, parent: parentIndex < 0 ? '' : rows[parentIndex].word, weight: value }
        : {
            id: `node-${index + 1}`,
            parent: parentIndex < 0 ? '' : `node-${parentIndex + 1}`,
            value,
            label,
          },
    );
  }
  return rows;
}

function textCorpus(recipe) {
  const count = Math.min(
    materializationLimit(recipe, 80),
    Math.max(12, integer(parameter(recipe, 'wordCount', 80), 80, 12, 80)),
  );
  return Array.from({ length: count }, (_, index) => ({
    word: index < corpusTerms.length ? corpusTerms[index] : `term-${index + 1}`,
    weight: Math.max(
      1,
      Math.round((30_000 / (index + 8) ** 0.72) * (0.9 + unit(recipe.seed, index, 70) * 0.2)),
    ),
    language: index % 5 === 0 ? 'ko' : 'mixed',
  }));
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
  return Array.from({ length: count }, (_, index) => {
    const cohort = index % 5;
    const latent = gaussian(recipe.seed, index, 80);
    const speed = 64 + cohort * 5 + latent * 8 + gaussian(recipe.seed, index, 82) * 2;
    const quality = 72 + cohort * 3 + latent * 5 + gaussian(recipe.seed, index, 84) * 4;
    const cost = 96 - cohort * 7 - latent * 4 + gaussian(recipe.seed, index, 86) * 5;
    return {
      name: `Build ${index + 1}`,
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

function gridDimensions(recipe, maximum) {
  const sourceGridRows = integer(
    parameter(recipe, 'rows', recipe.cardinality?.axes?.rows ?? 256),
    256,
    2,
    1_024,
  );
  const sourceColumns = integer(
    parameter(recipe, 'columns', recipe.cardinality?.axes?.columns ?? 256),
    256,
    2,
    1_024,
  );
  const ratio = sourceColumns / sourceGridRows;
  const rows = Math.max(2, Math.min(sourceGridRows, Math.floor(Math.sqrt(maximum / ratio))));
  const columns = Math.max(2, Math.min(sourceColumns, Math.floor(maximum / rows)));
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
  const output = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const x = columns <= 1 ? 0 : (column / (columns - 1)) * 2 - 1;
      const y = rows <= 1 ? 0 : (row / (rows - 1)) * 2 - 1;
      const value = fieldValue(x, y, recipe.seed, index);
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
  return output;
}

function ternaryComposition(recipe) {
  const count = materializationLimit(recipe, 1_500);
  return Array.from({ length: count }, (_, index) => {
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
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0 : index / (count - 1);
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
  const rows = [];
  const combinations = 2 ** setCount - 1;
  for (let mask = 1; mask <= combinations; mask += 1) {
    const names = [];
    let cardinality = sourceRows(recipe);
    for (let index = 0; index < setCount; index += 1) {
      if ((mask & (1 << index)) !== 0) {
        names.push(String.fromCharCode(65 + index));
        cardinality *= 0.36 + unit(recipe.seed, index, 110) * 0.1;
      }
    }
    const size = Math.max(
      0,
      Math.floor(cardinality * (0.82 + unit(recipe.seed, mask, 111) * 0.16)),
    );
    rows.push({
      category: names.join('&'),
      sets: names,
      size,
      members: [`${size.toLocaleString('en-US')} logical records`],
    });
  }
  return rows.sort((left, right) => right.size - left.size);
}

function surfaceGrid(recipe) {
  const [rows, columns] = gridDimensions(recipe, materializationLimit(recipe, 262_144));
  const x = Array.from({ length: columns }, (_, column) =>
    round((column / (columns - 1)) * 8 - 4, 5),
  );
  const y = Array.from({ length: rows }, (_, row) => round((row / (rows - 1)) * 6 - 3, 5));
  const z = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const normalizedX = x[column] / 4;
      const normalizedY = y[row] / 3;
      z.push(
        round(fieldValue(normalizedX, normalizedY, recipe.seed, row * columns + column) / 24, 5),
      );
    }
  }
  return { rows, columns, x, y, z, values: [...z] };
}

function volumeDimensions(recipe, maximum) {
  const dimensions = Array.isArray(parameter(recipe, 'dimensions', undefined))
    ? parameter(recipe, 'dimensions', undefined)
    : recipe.cardinality?.axes?.dimensions;
  const source =
    Array.isArray(dimensions) && dimensions.length === 3
      ? dimensions.map((value) => integer(value, 64, 2, 256))
      : [64, 64, 64];
  const scale = Math.min(1, Math.cbrt(maximum / (source[0] * source[1] * source[2])));
  let output = source.map((value) => Math.max(2, Math.floor(value * scale)));
  while (output[0] * output[1] * output[2] > maximum) {
    const largest = output.indexOf(Math.max(...output));
    output[largest] = Math.max(2, output[largest] - 1);
  }
  return output;
}

function volumeGrid(recipe) {
  const dimensions = volumeDimensions(recipe, materializationLimit(recipe, 262_144));
  const values = [];
  const [width, height, depth] = dimensions;
  for (let z = 0; z < depth; z += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const nx = (x / (width - 1)) * 2 - 1;
        const ny = (y / (height - 1)) * 2 - 1;
        const nz = (z / (depth - 1)) * 2 - 1;
        const lobeA = Math.exp(
          -((nx + 0.28) ** 2 * 5 + (ny - 0.15) ** 2 * 8 + (nz + 0.08) ** 2 * 6),
        );
        const lobeB = Math.exp(
          -((nx - 0.38) ** 2 * 10 + (ny + 0.3) ** 2 * 7 + (nz - 0.24) ** 2 * 11),
        );
        const ring = Math.exp(-((Math.hypot(nx, ny) - 0.54) ** 2) * 32 - nz * nz * 7);
        values.push(round(lobeA * 0.92 + lobeB * 0.78 + ring * 0.32, 6));
      }
    }
  }
  return {
    dimensions,
    values,
    origin: [-1, -1, -1],
    spacing: [2 / (width - 1), 2 / (height - 1), 2 / (depth - 1)],
  };
}

function vectorComponents(x, y, z) {
  const attenuation = Math.exp(-(x * x + y * y + z * z) * 0.28);
  return [-y * attenuation, x * attenuation, (0.32 + Math.sin((x + y) * 1.4) * 0.18) * attenuation];
}

function spatialVector(recipe) {
  const maximum = materializationLimit(recipe, recipe.shape === 'rows' ? 625 : 3_375);
  const side = Math.max(2, Math.floor(Math.cbrt(maximum)));
  const count = Math.min(maximum, side ** 3);
  if (recipe.shape === 'rows') {
    const rows = [];
    const twoDimensionalSide = Math.max(2, Math.floor(Math.sqrt(maximum)));
    for (let yIndex = 0; yIndex < twoDimensionalSide; yIndex += 1) {
      for (let xIndex = 0; xIndex < twoDimensionalSide; xIndex += 1) {
        if (rows.length >= maximum) break;
        const x = (xIndex / (twoDimensionalSide - 1)) * 4 - 2;
        const y = (yIndex / (twoDimensionalSide - 1)) * 4 - 2;
        const [u, v] = vectorComponents(x, y, 0);
        const magnitude = Math.hypot(u, v);
        rows.push({
          x: round(x, 5),
          y: round(y, 5),
          value: round(u, 6),
          high: round(v, 6),
          direction: round(((Math.atan2(v, u) * 180) / Math.PI + 360) % 360, 4),
          magnitude: round(magnitude, 6),
        });
      }
    }
    return rows;
  }
  const origins = [];
  const vectors = [];
  const labels = [];
  const colors = [];
  for (let index = 0; index < count; index += 1) {
    const xIndex = index % side;
    const yIndex = Math.floor(index / side) % side;
    const zIndex = Math.floor(index / (side * side));
    const x = (xIndex / (side - 1)) * 4 - 2;
    const y = (yIndex / (side - 1)) * 4 - 2;
    const z = (zIndex / (side - 1)) * 3 - 1.5;
    origins.push([round(x, 5), round(y, 5), round(z, 5)]);
    vectors.push(vectorComponents(x, y, z).map((value) => round(value, 6)));
    labels.push(`Flow sample ${index + 1}`);
    colors.push(palette[index % palette.length]);
  }
  return { origins, vectors, labels, colors };
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
  return spatialPreview(data, maximumRows);
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

/**
 * Materialize a closed Graflume demo recipe into deterministic, output-bounded data.
 * The logical source cardinality remains in the plan; generated data is a semantic LOD.
 */
export function materializeDemoRecipe(recipe) {
  validateRecipe(recipe);
  const definition = definitionById.get(recipe.id);
  const data = generators[recipe.id](recipe);
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
      sourceRows: sourceRows(recipe),
      derivedRows,
      renderedRows: derivedRows,
      renderedMaximum,
      reduction: { stage: recipe.reduction.stage, method: recipe.reduction.method },
      budget: { resource: recipe.outputBudget.resource, maximum: renderedMaximum },
    },
  };
}
