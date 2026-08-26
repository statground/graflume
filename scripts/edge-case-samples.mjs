import assert from 'node:assert/strict';

export const edgeCaseProfiles = Object.freeze([
  Object.freeze({
    id: 'range',
    order: 0,
    name: 'Extreme ranges',
    summary:
      'Exercises family-safe minimums, maximums, zeros, and signed values without violating the chart semantics.',
  }),
  Object.freeze({
    id: 'structure',
    order: 1,
    name: 'Irregular structure',
    summary:
      'Exercises only the missing, sparse, duplicate, or out-of-order cases that have a defined meaning for the family.',
  }),
  Object.freeze({
    id: 'volume',
    order: 2,
    name: 'High volume',
    summary:
      'Uses a deterministic compact recipe and an explicit output budget instead of embedding a large generated payload.',
  }),
]);

export const edgeCaseRecipeCatalog = Object.freeze([
  Object.freeze({
    id: 'row-sequence-v1',
    shape: 'rows',
    summary: 'Deterministic scalar, categorical, and temporal rows.',
  }),
  Object.freeze({
    id: 'interval-sequence-v1',
    shape: 'rows',
    summary: 'Ordered low/high or start/end rows with closed interval invariants.',
  }),
  Object.freeze({
    id: 'ohlcv-sequence-v1',
    shape: 'rows',
    summary: 'Deterministic OHLCV rows that preserve candle and volume invariants.',
  }),
  Object.freeze({
    id: 'relationship-edges-v1',
    shape: 'rows',
    summary: 'Deterministic positive-weight relationship edges with stable identities.',
  }),
  Object.freeze({
    id: 'hierarchy-nodes-v1',
    shape: 'rows',
    summary: 'Deterministic rooted hierarchy nodes with stable parent identities.',
  }),
  Object.freeze({
    id: 'grid-2d-v1',
    shape: 'rows',
    summary: 'Deterministic two-dimensional grid or raster rows.',
  }),
  Object.freeze({
    id: 'ternary-composition-v1',
    shape: 'rows',
    summary: 'Non-negative three-part compositions with a strictly positive total.',
  }),
  Object.freeze({
    id: 'venn-membership-v1',
    shape: 'rows',
    summary: 'Consistent set cardinalities derived from bounded aggregate membership rows.',
  }),
  Object.freeze({
    id: 'surface-grid-v1',
    shape: 'surface-grid',
    summary: 'Deterministic finite surface grid arrays.',
  }),
  Object.freeze({
    id: 'volume-grid-v1',
    shape: 'volume-grid',
    summary: 'Deterministic finite voxel values and dimensions.',
  }),
  Object.freeze({
    id: 'spatial-vector-v1',
    shape: 'vector-set',
    summary: 'Deterministic finite vector origins and components.',
  }),
]);

const policies = {
  annotation: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['annotation'],
    structure: ['sparse', 'duplicate-key', 'out-of-order', 'null'],
    handling: ['stable-sort-before-render', 'duplicate-events-retained', 'null-label-omitted'],
    invariants: ['valid-temporal-key'],
    volume: volume(60_000, 'large', 'line-points', 30_000),
  }),
  area: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['sparse', 'duplicate-key', 'out-of-order', 'null'],
    handling: ['gap-policy-explicit', 'stable-sort-before-render', 'duplicate-x-aggregated'],
    invariants: ['series-key-preserved'],
    volume: volume(60_000, 'large', 'line-points', 30_000, { seriesCount: 4 }),
  }),
  bar: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['duplicate-key', 'null'],
    handling: ['duplicate-category-aggregated', 'null-value-omitted'],
    invariants: ['category-order-preserved'],
    volume: volume(60_000, 'large', 'bar-marks', 12_000),
  }),
  bubble: policy({
    recipe: 'row-sequence-v1',
    range: 'signed-size',
    valueFields: ['x', 'y'],
    positiveFields: ['size'],
    nullableFields: ['x'],
    structure: ['duplicate-point', 'null'],
    handling: ['coincident-points-retained', 'null-position-omitted'],
    invariants: ['size-nonnegative'],
    volume: volume(60_000, 'large', 'point-marks', 20_000),
  }),
  calendar: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['sparse', 'duplicate-key', 'out-of-order', 'null'],
    handling: ['missing-date-left-empty', 'stable-date-sort', 'duplicate-date-aggregated'],
    invariants: ['valid-calendar-date'],
    volume: volume(60_000, 'large', 'bar-marks', 12_000),
  }),
  candlestick: policy({
    recipe: 'ohlcv-sequence-v1',
    range: 'ohlcv',
    valueFields: ['value', 'open', 'high', 'low', 'close'],
    positiveFields: ['volume'],
    structure: ['sparse', 'out-of-order'],
    handling: ['missing-session-left-empty', 'stable-date-sort', 'duplicate-session-consolidated'],
    invariants: ['ohlcv-low-order', 'ohlcv-high-order', 'volume-nonnegative'],
    volume: volume(60_000, 'large', 'bar-marks', 12_000),
  }),
  combination: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value', 'target'],
    nullableFields: ['value'],
    structure: ['sparse', 'duplicate-key', 'null'],
    handling: ['layer-null-independent', 'duplicate-x-aggregated', 'secondary-axis-preserved'],
    invariants: ['layer-axis-identity-preserved'],
    volume: volume(60_000, 'large', 'combined-marks', 30_000),
  }),
  difference: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value', 'previous'],
    nullableFields: ['value'],
    structure: ['zero-baseline', 'null'],
    handling: ['zero-baseline-policy-explicit', 'null-pair-omitted'],
    invariants: ['old-new-pair-preserved'],
    volume: volume(60_000, 'large', 'bar-marks', 12_000),
  }),
  pie: policy({
    recipe: 'row-sequence-v1',
    range: 'nonnegative',
    valueFields: ['value'],
    positiveFields: ['radius'],
    nullableFields: ['value'],
    structure: ['duplicate-key', 'null', 'high-cardinality'],
    handling: ['duplicate-category-aggregated', 'zero-and-null-slice-omitted', 'labels-budgeted'],
    invariants: ['slice-value-nonnegative'],
    volume: volume(30_000, 'large', 'radial-marks', 20_000),
  }),
  timeline: policy({
    recipe: 'interval-sequence-v1',
    range: 'temporal-bounds',
    valueFields: [],
    structure: ['sparse', 'out-of-order', 'overlap'],
    handling: ['source-order-independent', 'overlap-retained', 'missing-interval-left-empty'],
    invariants: ['stable-interval-id', 'start-not-after-end', 'progress-closed-0-100'],
    volume: volume(20_000, 'standard', 'bar-marks', 20_000),
  }),
  gauge: policy({
    recipe: 'row-sequence-v1',
    range: 'bounded-domain',
    valueFields: ['value', 'previous', 'target'],
    structure: ['zero-baseline', 'domain-boundary'],
    handling: ['explicit-min-max-domain', 'reference-and-target-preserved'],
    invariants: ['value-inside-explicit-domain'],
    volume: volume(6_000, 'ultra', 'bar-marks', 5_000, { explicitPerformance: true }),
  }),
  map: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['duplicate-key', 'null', 'antimeridian', 'polar-coordinate'],
    handling: ['duplicate-region-aggregated', 'unknown-region-omitted', 'route-wrap-explicit'],
    invariants: ['longitude-closed-minus180-180', 'latitude-closed-minus90-90'],
    volume: volume(60_000, 'large', 'point-marks', 20_000, { geometry: 'projected-points' }),
  }),
  distribution: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['duplicate-value', 'null', 'outlier', 'ties'],
    handling: ['null-observation-omitted', 'ties-retained', 'outlier-retained'],
    invariants: ['finite-observation-or-null'],
    volume: volume(100_000, 'large', 'line-points', 30_000),
  }),
  interval: policy({
    recipe: 'interval-sequence-v1',
    range: 'interval',
    valueFields: ['value', 'low', 'high'],
    nullableFields: ['low'],
    structure: ['zero-width', 'out-of-order', 'null'],
    handling: ['zero-width-retained', 'null-interval-omitted', 'source-category-order-preserved'],
    invariants: ['low-not-above-high'],
    volume: volume(60_000, 'large', 'bar-marks', 12_000),
  }),
  line: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['sparse', 'duplicate-key', 'out-of-order', 'null'],
    handling: ['gap-policy-explicit', 'stable-sort-before-render', 'duplicate-x-aggregated'],
    invariants: ['series-key-preserved'],
    volume: volume(60_000, 'large', 'line-points', 30_000),
  }),
  motion: policy({
    recipe: 'row-sequence-v1',
    range: 'signed-size',
    valueFields: ['x', 'y'],
    positiveFields: ['size'],
    structure: ['sparse', 'out-of-order', 'enter-exit'],
    handling: [
      'frame-order-explicit',
      'entity-enter-exit-retained',
      'duplicate-frame-key-forbidden',
    ],
    invariants: ['unique-key-per-frame', 'size-nonnegative'],
    volume: volume(100_000, 'ultra', 'point-marks', 8_000, {
      entityCount: 5_000,
      frameCount: 20,
      explicitPerformance: true,
    }),
  }),
  hierarchy: policy({
    recipe: 'hierarchy-nodes-v1',
    range: 'descending-nonnegative',
    valueFields: ['value'],
    structure: ['sparse', 'out-of-order', 'deep-hierarchy'],
    handling: [
      'child-before-parent-resolved',
      'uneven-branches-retained',
      'cycle-and-duplicate-id-forbidden',
    ],
    invariants: ['stable-unique-node-id', 'single-rooted-forest', 'weight-nonnegative'],
    volume: volume(100_000, 'ultra', 'bar-marks', 5_000, {
      topology: 'wide-star',
      explicitPerformance: true,
    }),
  }),
  flow: policy({
    recipe: 'relationship-edges-v1',
    range: 'nonnegative',
    valueFields: ['value'],
    structure: ['duplicate-edge', 'out-of-order', 'disconnected'],
    handling: [
      'parallel-edge-aggregated',
      'disconnected-component-retained',
      'negative-edge-forbidden',
    ],
    invariants: ['edge-weight-nonnegative', 'acyclic-flow'],
    volume: volume(10_000, 'ultra', 'bar-marks', 5_000, {
      topology: 'directed-acyclic',
      explicitPerformance: true,
    }),
  }),
  scatter: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['x', 'y'],
    nullableFields: ['x'],
    structure: ['duplicate-point', 'out-of-order', 'null'],
    handling: ['coincident-points-retained', 'source-order-independent', 'null-position-omitted'],
    invariants: ['finite-coordinate-or-null'],
    volume: volume(60_000, 'large', 'point-marks', 20_000),
  }),
  table: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value', 'target'],
    nullableFields: ['value'],
    structure: ['duplicate-row', 'out-of-order', 'null', 'long-label'],
    handling: ['row-order-preserved', 'duplicate-row-retained', 'null-cell-explicit'],
    invariants: ['virtual-window-bounded'],
    volume: volume(100_000, 'ultra', 'visible-rows', 5_000, { explicitPerformance: true }),
  }),
  waterfall: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['value'],
    structure: ['duplicate-label', 'zero-baseline', 'cancellation'],
    handling: [
      'sequential-source-order-preserved',
      'duplicate-label-retained',
      'zero-step-retained',
    ],
    invariants: ['running-total-finite'],
    volume: volume(60_000, 'large', 'bar-marks', 12_000),
  }),
  'word-tree': policy({
    recipe: 'hierarchy-nodes-v1',
    range: 'descending-nonnegative',
    valueFields: ['weight'],
    structure: ['sparse', 'out-of-order', 'deep-hierarchy'],
    handling: [
      'child-before-parent-resolved',
      'uneven-branches-retained',
      'duplicate-node-id-forbidden',
    ],
    invariants: ['stable-unique-node-id', 'weight-nonnegative'],
    volume: volume(10_000, 'ultra', 'bar-marks', 5_000, { explicitPerformance: true }),
  }),
  polar: policy({
    recipe: 'row-sequence-v1',
    range: 'nonnegative',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['duplicate-angle', 'angle-wrap', 'null'],
    handling: ['angle-normalized-modulo-360', 'coincident-angle-retained', 'null-radius-omitted'],
    invariants: ['radial-value-nonnegative'],
    volume: volume(60_000, 'large', 'line-points', 30_000),
  }),
  network: policy({
    recipe: 'relationship-edges-v1',
    range: 'nonnegative',
    valueFields: ['value'],
    structure: ['duplicate-edge', 'out-of-order', 'self-loop', 'disconnected'],
    handling: ['stable-edge-id-preserved', 'directed-multiedge-retained', 'self-loop-retained'],
    invariants: ['edge-weight-nonnegative', 'stable-edge-identity'],
    volume: volume(20_000, 'ultra', 'line-points', 8_000, {
      nodeCount: 5_000,
      explicitPerformance: true,
    }),
  }),
  chord: policy({
    recipe: 'relationship-edges-v1',
    range: 'nonnegative',
    valueFields: ['value'],
    structure: ['duplicate-edge', 'self-loop', 'sparse'],
    handling: ['duplicate-pair-aggregated', 'asymmetric-flow-retained', 'zero-edge-omitted'],
    invariants: ['edge-weight-nonnegative'],
    volume: volume(20_000, 'ultra', 'line-points', 8_000, {
      categoryCount: 500,
      explicitPerformance: true,
    }),
  }),
  funnel: policy({
    recipe: 'row-sequence-v1',
    range: 'descending-nonnegative',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['ties', 'null', 'zero-baseline'],
    handling: ['stage-order-preserved', 'null-stage-omitted', 'ties-retained'],
    invariants: ['stage-value-nonnegative', 'stage-value-nonincreasing'],
    volume: volume(130_000, 'ultra', 'bar-marks', 5_000, { explicitPerformance: true }),
  }),
  parallel: policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['speed', 'quality', 'cost'],
    nullableFields: ['quality'],
    structure: ['duplicate-path', 'null', 'constant-dimension'],
    handling: [
      'dimension-domain-independent',
      'null-row-omitted',
      'categorical-path-count-aggregated',
    ],
    invariants: ['dimension-order-preserved'],
    volume: volume(6_000, 'ultra', 'parallel-paths', 500, {
      mode: 'categories',
      explicitPerformance: true,
    }),
  }),
  heatmap: policy({
    recipe: 'grid-2d-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['sparse', 'duplicate-cell', 'out-of-order', 'null'],
    handling: ['null-cell-explicit', 'duplicate-cell-aggregated', 'coordinate-order-independent'],
    invariants: ['stable-grid-coordinate'],
    volume: volume(65_536, 'large', 'bar-marks', 12_000, { rows: 256, columns: 256 }),
  }),
  image: policy({
    recipe: 'grid-2d-v1',
    range: 'color-channel',
    valueFields: ['red', 'green', 'blue'],
    nullableFields: ['red'],
    structure: ['sparse', 'duplicate-cell', 'out-of-order', 'null'],
    handling: [
      'channel-domain-closed-0-255',
      'missing-pixel-transparent',
      'duplicate-pixel-resolved',
    ],
    invariants: ['rgb-channel-closed-0-255'],
    volume: volume(262_144, 'large', 'bar-marks', 12_000, { rows: 512, columns: 512 }),
  }),
  ternary: policy({
    recipe: 'ternary-composition-v1',
    range: 'ternary',
    valueFields: ['a', 'b', 'c'],
    structure: ['duplicate-point', 'out-of-order', 'zero-component'],
    handling: [
      'components-normalized-by-total',
      'coincident-composition-retained',
      'all-zero-row-forbidden',
    ],
    invariants: ['component-nonnegative', 'component-total-positive'],
    volume: volume(60_000, 'large', 'point-marks', 20_000),
  }),
  smith: policy({
    recipe: 'row-sequence-v1',
    range: 'smith',
    valueFields: ['imaginary'],
    positiveFields: ['real'],
    structure: ['duplicate-point', 'zero-baseline', 'out-of-order'],
    handling: [
      'coincident-points-retained',
      'resonance-crossing-retained',
      'path-source-order-preserved',
    ],
    invariants: ['resistance-nonnegative'],
    volume: volume(60_000, 'large', 'line-points', 30_000),
  }),
  'scatter-matrix': policy({
    recipe: 'row-sequence-v1',
    range: 'signed',
    valueFields: ['speed', 'quality', 'cost'],
    nullableFields: ['quality'],
    structure: ['duplicate-row', 'null', 'constant-dimension', 'collinear'],
    handling: ['constant-domain-centered', 'null-row-omitted', 'coincident-point-retained'],
    invariants: ['dimension-order-preserved'],
    volume: volume(5_000, 'ultra', 'point-marks', 8_000, {
      dimensionCount: 8,
      explicitPerformance: true,
    }),
  }),
  carpet: policy({
    recipe: 'grid-2d-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['sparse', 'duplicate-cell', 'out-of-order', 'null'],
    handling: ['warped-coordinate-preserved', 'duplicate-cell-aggregated', 'null-cell-left-empty'],
    invariants: ['finite-carpet-coordinate'],
    volume: volume(16_384, 'standard', 'bar-marks', 16_384, { rows: 128, columns: 128 }),
  }),
  contour: policy({
    recipe: 'grid-2d-v1',
    range: 'signed',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['sparse', 'duplicate-cell', 'out-of-order', 'null', 'saddle'],
    handling: ['null-hole-preserved', 'duplicate-cell-aggregated', 'saddle-decision-deterministic'],
    invariants: ['finite-threshold', 'bounded-contour-segments'],
    volume: volume(65_536, 'large', 'line-points', 30_000, {
      rows: 256,
      columns: 256,
    }),
  }),
  item: policy({
    recipe: 'row-sequence-v1',
    range: 'nonnegative-integer',
    valueFields: ['value'],
    nullableFields: ['value'],
    structure: ['duplicate-key', 'null', 'zero-baseline'],
    handling: ['duplicate-category-aggregated', 'null-value-omitted', 'icon-count-budgeted'],
    invariants: ['item-count-nonnegative-integer'],
    volume: volume(60_000, 'large', 'bar-marks', 12_000),
  }),
  'vector-field': policy({
    recipe: 'row-sequence-v1',
    range: 'vector',
    valueFields: ['value', 'high'],
    positiveFields: ['magnitude'],
    structure: ['sparse', 'duplicate-point', 'angle-wrap', 'zero-vector'],
    handling: [
      'duplicate-position-vector-aggregated',
      'angle-normalized-modulo-360',
      'zero-vector-retained',
    ],
    invariants: ['magnitude-nonnegative'],
    volume: volume(60_000, 'large', 'point-marks', 20_000),
  }),
  venn: policy({
    recipe: 'venn-membership-v1',
    range: 'venn',
    valueFields: ['value'],
    structure: ['sparse', 'zero-baseline', 'nested-overlap'],
    handling: [
      'raw-membership-preaggregated',
      'inconsistent-intersection-forbidden',
      'set-count-bounded',
    ],
    invariants: ['set-cardinality-nonnegative', 'intersection-not-above-set-cardinality'],
    volume: volume(100_000, 'standard', 'aggregate-sets', 5, {
      aggregateSetCount: 5,
      preAggregate: true,
    }),
  }),
  'word-cloud': policy({
    recipe: 'row-sequence-v1',
    range: 'nonnegative',
    valueFields: ['weight'],
    nullableFields: ['weight'],
    structure: ['duplicate-key', 'null', 'long-label', 'multilingual'],
    handling: [
      'duplicate-word-aggregated',
      'zero-and-null-weight-omitted',
      'label-layout-budgeted',
    ],
    invariants: ['word-weight-nonnegative'],
    volume: volume(10_000, 'ultra', 'bar-marks', 5_000, { explicitPerformance: true }),
  }),
  'price-blocks': policy({
    recipe: 'ohlcv-sequence-v1',
    range: 'positive-price',
    valueFields: ['close'],
    structure: ['sparse', 'out-of-order', 'flat-run'],
    handling: ['stable-date-sort', 'duplicate-session-consolidated', 'tick-size-explicit'],
    invariants: ['price-positive'],
    volume: volume(100_000, 'ultra', 'line-points', 8_000, { explicitPerformance: true }),
  }),
  'volume-profile': policy({
    recipe: 'ohlcv-sequence-v1',
    range: 'price-volume',
    valueFields: ['price'],
    positiveFields: ['volume'],
    structure: ['duplicate-key', 'out-of-order', 'zero-baseline'],
    handling: ['trade-order-independent', 'duplicate-price-bin-aggregated', 'zero-volume-retained'],
    invariants: ['price-positive', 'volume-nonnegative'],
    volume: volume(100_000, 'ultra', 'bar-marks', 5_000, { explicitPerformance: true }),
  }),
  'technical-indicator': policy({
    recipe: 'ohlcv-sequence-v1',
    range: 'ohlcv',
    valueFields: ['value', 'open', 'high', 'low', 'close'],
    positiveFields: ['volume'],
    nullableFields: ['value'],
    structure: ['sparse', 'out-of-order', 'null', 'flat-run'],
    handling: ['stable-date-sort', 'missing-input-propagates-null', 'warm-up-output-null'],
    invariants: ['ohlcv-low-order', 'ohlcv-high-order', 'volume-nonnegative'],
    volume: volume(100_000, 'ultra', 'line-points', 8_000, { explicitPerformance: true }),
  }),
  surface: policy({
    recipe: 'surface-grid-v1',
    shape: 'surface-grid',
    range: 'spatial-signed',
    valueFields: ['z', 'value'],
    structure: ['near-flat', 'isolated-spike', 'nonuniform-grid'],
    handling: ['finite-grid-required', 'flat-domain-centered', 'nonuniform-axis-preserved'],
    invariants: ['surface-array-length-match', 'surface-value-finite'],
    volume: volume(66_049, 'spatial-bounded', 'grid-points', 66_049, {
      rows: 257,
      columns: 257,
    }),
  }),
  volume: policy({
    recipe: 'volume-grid-v1',
    shape: 'volume-grid',
    range: 'spatial-signed',
    valueFields: ['value'],
    structure: ['near-flat', 'isolated-spike', 'isolated-trough'],
    handling: ['finite-voxel-required', 'window-level-explicit', 'null-voxel-forbidden'],
    invariants: ['volume-dimension-product-match', 'volume-value-finite'],
    volume: volume(262_144, 'spatial-bounded', 'sampled-voxels', 80_000, {
      dimensions: [64, 64, 64],
      maxSamples: 80_000,
    }),
  }),
  'spatial-vector': policy({
    recipe: 'spatial-vector-v1',
    shape: 'vector-set',
    range: 'spatial-vector',
    valueFields: ['u', 'v', 'w'],
    positiveFields: ['magnitude'],
    structure: ['sparse', 'zero-vector', 'unequal-path-length'],
    handling: ['finite-vector-required', 'zero-vector-retained', 'malformed-tuple-forbidden'],
    invariants: ['origin-vector-count-match', 'magnitude-nonnegative'],
    volume: volume(50_000, 'spatial-bounded', 'vectors', 50_000),
  }),
};

function policy(input) {
  return {
    shape: 'rows',
    positiveFields: [],
    nullableFields: [],
    ...input,
  };
}

function volume(rowCount, performanceProfile, resource, maximum, parameters = {}) {
  return { rowCount, performanceProfile, resource, maximum, parameters };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seedFor(familyId, profileId) {
  let hash = 2_166_136_261;
  for (const character of `${familyId}:${profileId}`) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash || 1;
}

function rowsForPreview(example, definition, count = 6) {
  assert.ok(Array.isArray(example.tableData) && example.tableData.length > 0);
  const sourceRows = Array.isArray(example.data) ? example.data : [];
  return example.tableData.slice(0, count).map((source, index) => {
    const row = clone(source);
    const runtimeRow = sourceRows[index];
    for (const field of [
      ...definition.valueFields,
      ...definition.positiveFields,
      ...definition.nullableFields,
    ]) {
      if (!Object.hasOwn(row, field) && runtimeRow && Object.hasOwn(runtimeRow, field)) {
        row[field] = clone(runtimeRow[field]);
      }
    }
    return row;
  });
}

const signedRange = [-1e12, -1e-9, 0, 1e12, 1e-9, 1e6];
const positiveRange = [1e-9, 0, 1e12, 1, 1e6, 1e-6];
const boundedRange = [0, 1e-9, 25, 50, 99.999999999, 100];

function setFields(rows, fields, values) {
  for (const [index, row] of rows.entries()) {
    for (const [fieldIndex, field] of fields.entries()) {
      row[field] = values[(index + fieldIndex) % values.length];
    }
  }
}

function ohlcvPreview(rows) {
  const bases = [5e-10, 1e-6, 1, 1e3, 1e6, 2e9];
  const volumes = [0, 1, 1e3, 1e6, 1e9, 1e12];
  rows.forEach((row, index) => {
    const base = bases[index];
    const open = base * 1.01;
    const close = base * (index % 2 === 0 ? 1.03 : 0.99);
    row.date = `2026-${String(index + 1).padStart(2, '0')}-01`;
    row.open = open;
    row.close = close;
    row.low = Math.min(open, close) * 0.98;
    row.high = Math.max(open, close) * 1.02;
    row.value = close;
    if (Object.hasOwn(row, 'price')) row.price = close;
    if (Object.hasOwn(row, 'volume')) row.volume = volumes[index];
  });
  return rows;
}

function intervalPreview(rows) {
  const pairs = [
    [-1e12, -1e9],
    [-1e-9, 1e-9],
    [0, 0],
    [-1, 1],
    [1e9, 1e12],
    [1e-6, 1e-3],
  ];
  rows.forEach((row, index) => {
    const [low, high] = pairs[index];
    if (Object.hasOwn(row, 'low')) row.low = low;
    if (Object.hasOwn(row, 'high')) row.high = high;
    if (Object.hasOwn(row, 'value')) row.value = (low + high) / 2;
    if (Object.hasOwn(row, 'progress')) row.progress = boundedRange[index];
  });
  return rows;
}

function ternaryPreview(rows) {
  const values = [
    [1e12, 1, 1],
    [1e-9, 1e-9, 1e-9],
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [1e6, 2e6, 3e6],
  ];
  rows.forEach((row, index) => {
    [row.a, row.b, row.c] = values[index];
  });
  return rows;
}

function spatialVectorPreview(rows) {
  const vectors = [
    [0, 0, 0],
    [1e-9, 0, 0],
    [-1e6, 1e6, 0],
    [1e12, -1e12, 1],
    [-1e-9, 1e-9, -1e-9],
    [1e3, 1e2, -1e2],
  ];
  rows.forEach((row, index) => {
    const [u, v, w] = vectors[index];
    row.u = u;
    row.v = v;
    row.w = w;
    row.magnitude = Math.hypot(u, v, w);
  });
  return rows;
}

function rangePreview(familyId, example, definition) {
  const rows = rowsForPreview(example, definition);
  if (familyId === 'timeline') {
    rows[0].start = '1900-01-01';
    rows[0].end = '1900-01-01';
    if (rows[1]) {
      rows[1].start = '2099-12-01';
      rows[1].end = '2100-01-01';
    }
    return rows;
  }
  switch (definition.range) {
    case 'ohlcv':
    case 'positive-price':
    case 'price-volume':
      return ohlcvPreview(rows);
    case 'interval':
    case 'temporal-bounds':
      return intervalPreview(rows);
    case 'ternary':
      return ternaryPreview(rows);
    case 'spatial-vector':
      return spatialVectorPreview(rows);
    case 'color-channel':
      setFields(rows, definition.valueFields, [0, 1, 127, 254, 255, 0]);
      return rows;
    case 'bounded-domain':
      setFields(rows, definition.valueFields, [0, 1e-9, 1e12, 1, 1e6, 1e12]);
      return rows;
    case 'descending-nonnegative':
      setFields(rows, definition.valueFields, [1e12, 1, 1e-9, 0, 0, 0]);
      return rows;
    case 'nonnegative-integer':
      setFields(rows, definition.valueFields, [0, 1, 2, 5_000, 1_000_000, 12]);
      return rows;
    case 'smith':
      setFields(rows, definition.valueFields, signedRange);
      setFields(rows, definition.positiveFields, positiveRange);
      return rows;
    case 'vector':
      setFields(rows, definition.valueFields, signedRange);
      setFields(rows, definition.positiveFields, positiveRange);
      rows.forEach((row, index) => {
        if (Object.hasOwn(row, 'direction')) row.direction = [-360, 0, 360, 720, 90, 270][index];
      });
      return rows;
    case 'spatial-signed':
      setFields(rows, definition.valueFields, signedRange);
      return rows;
    case 'venn':
      setFields(rows, definition.valueFields, [0, 1e-9, 1e12, 3, 1e6, 2]);
      return rows;
    default:
      setFields(
        rows,
        definition.valueFields,
        definition.range === 'nonnegative' || definition.range === 'signed-size'
          ? definition.range === 'nonnegative'
            ? positiveRange
            : signedRange
          : signedRange,
      );
      setFields(rows, definition.positiveFields, positiveRange);
      return rows;
  }
}

function structurePreview(familyId, example, definition) {
  let rows = rowsForPreview(example, definition);
  if (definition.structure.includes('out-of-order')) {
    rows = rows.length < 3 ? [...rows].reverse() : [rows[2], rows[0], ...rows.slice(3), rows[1]];
  }
  const duplicate = definition.structure.some((item) => item.startsWith('duplicate'));
  if (duplicate) rows.splice(2, 0, clone(rows[0]));
  if (definition.structure.includes('null') && definition.nullableFields.length > 0) {
    const field = definition.nullableFields.find((candidate) => Object.hasOwn(rows[1], candidate));
    if (field) rows[1][field] = null;
  }
  if (familyId === 'timeline') {
    rows[0].start = '2026-01-10';
    rows[0].end = '2026-01-10';
    rows[1].start = '2026-01-01';
    rows[1].end = '2026-01-20';
  }
  if (familyId === 'motion') {
    rows.forEach((row, index) => {
      row.time = ['2027', '2025', '2026'][index % 3];
    });
  }
  if (familyId === 'polar') {
    rows.forEach((row, index) => {
      row.angle = [-360, 0, 360, 720, 90, 270][index % 6];
    });
    if (rows.length > 2) rows[2] = clone(rows[0]);
  }
  if (familyId === 'technical-indicator') {
    rows[1].value = null;
    rows[1].close = null;
  }
  return rows.slice(0, 12);
}

function volumePreview(familyId, example, definition) {
  const rows = rangePreview(familyId, example, definition).slice(0, 8);
  rows.forEach((row, index) => {
    if (Object.hasOwn(row, 'category')) row.category = `sample-${index + 1}`;
    if (Object.hasOwn(row, 'date')) row.date = `2026-${String(index + 1).padStart(2, '0')}-01`;
    if (Object.hasOwn(row, 'id')) {
      row.id = `sample-${index + 1}`;
      if (Object.hasOwn(row, 'parent')) row.parent = index === 0 ? '' : 'sample-1';
    }
    if (familyId === 'word-tree' && Object.hasOwn(row, 'word')) {
      row.word = `sample-${index + 1}`;
      row.parent = index === 0 ? '' : 'sample-1';
    }
  });
  return rows;
}

function rangeDemonstrates(definition) {
  if (definition.range === 'ohlcv' || definition.range === 'positive-price') {
    return ['extreme-range', 'extreme-small', 'extreme-large', 'positive-domain'];
  }
  if (definition.range === 'price-volume') {
    return ['extreme-range', 'extreme-small', 'extreme-large', 'zero', 'positive-domain'];
  }
  if (definition.range === 'temporal-bounds') {
    return ['extreme-range', 'temporal-span', 'zero-duration', 'domain-boundary'];
  }
  if (definition.range === 'color-channel') {
    return ['extreme-range', 'color-channel-boundary', 'zero', 'domain-boundary'];
  }
  if (definition.range === 'nonnegative-integer') {
    return ['extreme-range', 'integer-boundary', 'extreme-large', 'zero'];
  }
  const values = ['extreme-range', 'extreme-small', 'extreme-large', 'zero'];
  if (
    [
      'signed',
      'signed-size',
      'interval',
      'smith',
      'vector',
      'spatial-signed',
      'spatial-vector',
    ].includes(definition.range)
  ) {
    values.push('mixed-sign');
  }
  if (
    ['bounded-domain', 'temporal-bounds', 'color-channel', 'ternary', 'venn'].includes(
      definition.range,
    )
  ) {
    values.push('domain-boundary');
  }
  return values;
}

function optionsFor(example, familyId, profileId, definition) {
  const options = clone(example.options);
  const title = options.title;
  if (title && typeof title === 'object' && typeof title.text === 'string') {
    title.subtitle = `edge case · ${profileId}`;
  } else if (typeof title === 'string') {
    options.title = `${title} · ${profileId}`;
  }
  if (
    profileId === 'range' &&
    [
      'annotation',
      'area',
      'bar',
      'combination',
      'difference',
      'distribution',
      'interval',
      'line',
      'scatter',
      'table',
      'waterfall',
      'parallel',
      'heatmap',
      'carpet',
      'contour',
    ].includes(familyId) &&
    options.y &&
    typeof options.y === 'object'
  ) {
    options.y.scale = { type: 'symlog', constant: 1 };
  }
  if (familyId === 'gauge' && profileId === 'range') {
    if (options.mark && typeof options.mark === 'object') {
      options.mark.options = { ...(options.mark.options ?? {}), min: 0, max: 1e12 };
    }
  }
  if (profileId === 'volume' && example.runtime === 'core') {
    options.performance = definition.volume.parameters.explicitPerformance
      ? definition.volume.performanceProfile
      : 'auto';
  }
  return options;
}

function recipeFor(familyId, profileId, definition, previewRowCount) {
  const profileRowCount = profileId === 'volume' ? definition.volume.rowCount : previewRowCount;
  const parameters = {
    family: familyId,
    scenario: profileId,
    valuePolicy: definition.range,
    valueFields: definition.valueFields,
    positiveFields: definition.positiveFields,
    nullableFields: definition.nullableFields,
    ...(profileId === 'volume' ? definition.volume.parameters : {}),
  };
  return {
    id: definition.recipe,
    version: 1,
    seed: seedFor(familyId, profileId),
    shape: definition.shape,
    rowCount: profileRowCount,
    parameters,
  };
}

function expectationsFor(profileId, definition, tableData) {
  const isVolume = profileId === 'volume';
  return {
    inputRows: isVolume ? definition.volume.rowCount : tableData.length,
    tablePreviewRows: tableData.length,
    performanceProfile: isVolume
      ? definition.volume.performanceProfile
      : definition.shape === 'rows'
        ? 'standard'
        : 'spatial-bounded',
    bounded: true,
    outputBudget: isVolume
      ? { resource: definition.volume.resource, maximum: definition.volume.maximum }
      : { resource: definition.shape === 'rows' ? 'marks' : 'spatial-elements', maximum: 25_000 },
    invariants: ['finite-json', ...definition.invariants],
    handling:
      profileId === 'structure'
        ? definition.handling
        : profileId === 'volume'
          ? ['deterministic-seed', 'bounded-output', 'compact-recipe-not-expanded-data']
          : ['family-safe-domain', 'explicit-scale-policy'],
  };
}

function fieldsForEdgeExample(example, definition) {
  const fields = clone(example.fields);
  const known = new Set(fields.map(({ name }) => name));
  for (const name of [
    ...definition.valueFields,
    ...definition.positiveFields,
    ...definition.nullableFields,
  ]) {
    if (!known.has(name)) {
      fields.push({ name, type: 'quantitative' });
      known.add(name);
    }
  }
  return fields;
}

export function buildEdgeCaseCatalog(publicCatalog) {
  assert.equal(publicCatalog.schemaVersion, 2, 'edge cases require public catalog schema v2');
  assert.equal(publicCatalog.families.length, 44, 'edge cases require exactly 44 families');
  assert.deepEqual(
    Object.keys(policies).sort(),
    publicCatalog.families.map(({ id }) => id).sort(),
    'edge-case policy registry must cover the exact canonical family set',
  );

  const manualById = new Map(publicCatalog.manualExamples.map((example) => [example.id, example]));
  const representativeByFamily = new Map(
    publicCatalog.samples.map((sample) => [sample.familyId, sample.modeId]),
  );
  const examples = [];
  for (const family of publicCatalog.families) {
    const representativeId = representativeByFamily.get(family.id);
    const manualExample = manualById.get(representativeId);
    assert.ok(manualExample, `${family.id} representative manual example`);
    const definition = policies[family.id];
    for (const profile of edgeCaseProfiles) {
      const tableData =
        profile.id === 'range'
          ? rangePreview(family.id, manualExample, definition)
          : profile.id === 'structure'
            ? structurePreview(family.id, manualExample, definition)
            : volumePreview(family.id, manualExample, definition);
      const demonstrates =
        profile.id === 'range'
          ? rangeDemonstrates(definition)
          : profile.id === 'structure'
            ? ['irregular-structure', ...definition.structure]
            : ['high-volume', 'deterministic-generation', 'bounded-rendering'];
      examples.push({
        id: `${family.id}-${profile.id}`,
        familyId: family.id,
        profileId: profile.id,
        runtime: manualExample.runtime,
        entryPoint: manualExample.entryPoint,
        renderer: manualExample.renderer,
        quickApi: family.quickApi,
        portableMark: family.mark,
        recipe: recipeFor(family.id, profile.id, definition, tableData.length),
        tableData,
        fields: fieldsForEdgeExample(manualExample, definition),
        options: optionsFor(manualExample, family.id, profile.id, definition),
        summary: `${family.name}: ${profile.summary}`,
        demonstrates,
        expectations: expectationsFor(profile.id, definition, tableData),
        sourceRef: `scripts/edge-case-samples.mjs#family-${family.id}`,
      });
    }
  }

  return {
    $schema: '../schema/graflume.edge-cases.schema.json',
    schemaVersion: 1,
    verifiedAt: publicCatalog.verifiedAt,
    sourceCatalog: { path: 'catalog/graflume.catalog.json', schemaVersion: 2 },
    totals: {
      canonicalFamilies: publicCatalog.families.length,
      profiles: edgeCaseProfiles.length,
      examples: examples.length,
      tablePreviewRowLimit: 12,
    },
    profiles: edgeCaseProfiles,
    recipeCatalog: edgeCaseRecipeCatalog,
    examples,
  };
}

export const edgeCaseFamilyPolicies = Object.freeze(policies);
