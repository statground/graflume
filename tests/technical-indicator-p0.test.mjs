import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateTechnicalIndicator,
  resolveTechnicalIndicatorPresentation,
  technicalIndicatorCapabilities,
} from '../.tmp/src/data/technical-indicators.js';
import {
  calculateTechnicalIndicatorIncremental,
  TechnicalIndicatorIncrementalCalculator,
} from '../.tmp/src/data/technical-indicator-incremental.js';
import {
  createAutomaticWorkerRuntime,
  installWorkerRuntime,
} from '../.tmp/src/data/worker-runtime.js';
import { compile, createCompleteRegistry, validateSpec } from '../.tmp/src/complete.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const formerPrecomputedKinds = [
  'abands',
  'ao',
  'aroon',
  'aroonoscillator',
  'atr',
  'bb',
  'cci',
  'chaikin',
  'cmf',
  'cmo',
  'dmi',
  'dpo',
  'ikh',
  'keltnerchannels',
  'klinger',
  'mfi',
  'natr',
  'obv',
  'pc',
  'pivotpoints',
  'priceenvelopes',
  'psar',
  'slowstochastic',
  'stochastic',
  'supertrend',
  'vwap',
  'williamsr',
  'zigzag',
];

function marketInput(length = 180) {
  const close = Array.from({ length }, (_, index) => 100 + index * 0.25 + Math.sin(index / 4) * 3);
  return {
    value: close,
    open: close.map((item, index) => item - Math.cos(index / 3) * 0.4),
    high: close.map((item, index) => item + 1.5 + (index % 3) * 0.1),
    low: close.map((item, index) => item - 1.4 - (index % 2) * 0.1),
    close,
    volume: close.map((_, index) => 1_000 + (index % 11) * 37),
  };
}

test('all 45 presets expose calculated input, parameter, DAG, warm-up, provenance, and presentation contracts', () => {
  assert.equal(technicalIndicatorCapabilities.length, 45);
  assert.deepEqual(
    technicalIndicatorCapabilities
      .filter(({ kind }) => formerPrecomputedKinds.includes(kind))
      .map(({ kind }) => kind),
    formerPrecomputedKinds,
  );
  technicalIndicatorCapabilities.forEach((capability) => {
    assert.equal(capability.support, 'computed', capability.id);
    assert.ok(capability.requiredInputs.length > 0, `${capability.id}: inputs`);
    assert.ok(capability.outputs.length > 0, `${capability.id}: outputs`);
    assert.ok(capability.dependencyDag.length > 1, `${capability.id}: DAG`);
    assert.equal(capability.warmUp.policy, 'null');
    assert.ok(capability.provenance.length > 20, `${capability.id}: provenance`);
    const presentation = resolveTechnicalIndicatorPresentation(capability.id);
    assert.ok(presentation);
    assert.equal(presentation.synchronizedCrosshair.axis, 'x');
    assert.equal(presentation.synchronizedCrosshair.sharedDomain, true);
    assert.deepEqual(presentation.synchronizedCrosshair.fields, capability.outputs);

    const available = new Set();
    const parameterNames = new Set(capability.parameters.map(({ name }) => name));
    capability.dependencyDag.forEach((node) => {
      assert.equal(
        available.has(node.id),
        false,
        `${capability.id}: duplicate DAG node ${node.id}`,
      );
      node.inputs.forEach((input) => {
        assert.equal(
          available.has(input),
          true,
          `${capability.id}: DAG dependency ${input} must precede ${node.id}`,
        );
      });
      node.parameters.forEach((parameter) => {
        assert.equal(
          parameterNames.has(parameter) || /^\d+$/.test(parameter),
          true,
          `${capability.id}: unknown DAG parameter ${parameter}`,
        );
      });
      available.add(node.id);
    });
    capability.outputs.forEach((output) => {
      assert.equal(available.has(output), true, `${capability.id}: missing DAG output ${output}`);
    });
  });
});

test('the 28 former supplied-column presets calculate every declared output deterministically', () => {
  const input = marketInput();
  formerPrecomputedKinds.forEach((kind) => {
    const first = calculateTechnicalIndicator(kind, input);
    const second = calculateTechnicalIndicator(kind, input);
    assert.deepEqual(second.outputs, first.outputs, `${kind}: deterministic`);
    first.capability.outputs.forEach((role) => {
      const output = first.outputs[role];
      assert.equal(output?.length, input.close.length, `${kind}.${role}: length`);
      assert.ok(output.some(Number.isFinite), `${kind}.${role}: at least one calculated value`);
    });
    assert.ok(first.warmUpRows >= 0, `${kind}: warm-up`);
  });
});

test('OHLCV formulas cover true range, bands, volume flow, range position, and input validation', () => {
  const input = {
    value: [10, 11, 12, 13],
    high: [11, 13, 13, 15],
    low: [9, 10, 11, 12],
    close: [10, 12, 12, 14],
    volume: [100, 200, 300, 400],
  };
  assert.deepEqual(calculateTechnicalIndicator('atr', input, { period: 2 }).outputs.value, [
    null,
    2.5,
    2.25,
    2.625,
  ]);
  const bands = calculateTechnicalIndicator('bb', input, {
    period: 2,
    standardDeviations: 2,
  }).outputs;
  assert.deepEqual(bands.value, [null, 10.5, 11.5, 12.5]);
  assert.deepEqual(bands.lower, [null, 9.5, 10.5, 11.5]);
  assert.deepEqual(bands.upper, [null, 11.5, 12.5, 13.5]);
  assert.deepEqual(calculateTechnicalIndicator('obv', input).outputs.value, [0, 200, 200, 600]);
  assert.deepEqual(calculateTechnicalIndicator('williamsr', input, { period: 2 }).outputs.value, [
    null,
    -25,
    -33.33333333333334,
    -25,
  ]);
  assert.throws(
    () =>
      calculateTechnicalIndicator('mfi', { high: input.high, low: input.low, close: input.close }),
    /requires the volume input series/,
  );
  assert.throws(
    () =>
      calculateTechnicalIndicator('psar', input, { acceleration: 0.3, maximumAcceleration: 0.2 }),
    /no greater/,
  );
});

test('hard sessions reset warm-up and cumulative state while carry sessions retain it', () => {
  const value = [1, 2, 3, 4, 5, 6];
  const session = ['A', 'A', 'A', 'B', 'B', 'B'];
  const hard = calculateTechnicalIndicator(
    'sma',
    { value, session },
    { period: 2, session: { mode: 'field', field: 'session', reset: 'hard' } },
  );
  assert.deepEqual(hard.outputs.value, [null, 1.5, 2.5, null, 4.5, 5.5]);
  assert.deepEqual(hard.session.boundaries, [0, 3]);
  const carry = calculateTechnicalIndicator(
    'sma',
    { value, session },
    { period: 2, session: { mode: 'field', field: 'session', reset: 'carry' } },
  );
  assert.deepEqual(carry.outputs.value, [null, 1.5, 2.5, 3.5, 4.5, 5.5]);

  const vwap = calculateTechnicalIndicator(
    'vwap',
    {
      high: value,
      low: value,
      close: value,
      volume: value.map(() => 1),
      session,
    },
    { session: { mode: 'field', field: 'session', reset: 'hard' } },
  );
  assert.deepEqual(vwap.outputs.value, [1, 1.5, 2, 4, 4.5, 5]);
});

test('classic pivots use the previous completed hard session and share the x crosshair', () => {
  const calculation = calculateTechnicalIndicator(
    'pivotpoints',
    {
      high: [12, 15, 14, 22, 24],
      low: [8, 9, 10, 18, 17],
      close: [10, 13, 12, 20, 21],
      session: ['A', 'A', 'A', 'B', 'B'],
    },
    { session: { mode: 'field', field: 'session', reset: 'hard' } },
  );
  const pivot = 35 / 3;
  assert.deepEqual(calculation.outputs.value, [null, null, null, pivot, pivot]);
  assert.deepEqual(calculation.outputs.support, [null, null, null, 2 * pivot - 15, 2 * pivot - 15]);
  assert.deepEqual(calculation.outputs.resistance, [
    null,
    null,
    null,
    2 * pivot - 8,
    2 * pivot - 8,
  ]);
  assert.equal(calculation.warmUpRows, 3);
  assert.equal(calculation.presentation.placement, 'overlay');
  assert.equal(calculation.presentation.panelId, 'price');
});

test('portable incremental calculation is exact, restorable, bounded, and atomic on overflow', () => {
  const spec = { identifier: 'atr', options: { period: 3 }, maxRows: 8 };
  const first = calculateTechnicalIndicatorIncremental({
    spec,
    append: {
      high: [2, 3, 4, 5],
      low: [0, 1, 2, 3],
      close: [1, 2, 3, 4],
    },
  });
  const second = calculateTechnicalIndicatorIncremental({
    spec,
    previous: first.snapshot,
    append: { high: [6, 7], low: [4, 5], close: [5, 6] },
  });
  const oneShot = calculateTechnicalIndicator(
    'atr',
    { high: [2, 3, 4, 5, 6, 7], low: [0, 1, 2, 3, 4, 5], close: [1, 2, 3, 4, 5, 6] },
    { period: 3 },
  );
  assert.deepEqual(second.calculation.outputs, oneShot.outputs);
  assert.equal(second.snapshot.length, 6);
  assert.doesNotThrow(() => structuredClone(second.snapshot));
  assert.throws(
    () =>
      calculateTechnicalIndicatorIncremental({
        spec,
        previous: first.snapshot,
        append: { close: [5] },
      }),
    /append requires the high input channel/,
  );

  const calculator = new TechnicalIndicatorIncrementalCalculator(spec, second.snapshot);
  const before = calculator.snapshot();
  assert.throws(
    () =>
      calculator.append({
        high: [8, 9, 10],
        low: [6, 7, 8],
        close: [7, 8, 9],
      }),
    /exceed the configured maxRows/,
  );
  assert.deepEqual(calculator.snapshot(), before);
  calculator.reset();
  assert.equal(calculator.snapshot(), null);
  assert.equal(calculator.result(), null);
});

function indicatorInput(capability, input, start = 0, end = input.close.length) {
  return Object.fromEntries(
    capability.requiredInputs.map((role) => [role, input[role].slice(start, end)]),
  );
}

test('all 45 presets advance only the appended suffix and retain one-shot parity', () => {
  const input = marketInput(96);
  technicalIndicatorCapabilities.forEach((capability) => {
    const complete = indicatorInput(capability, input);
    const oneShot = calculateTechnicalIndicator(capability.id, complete);
    const first = calculateTechnicalIndicatorIncremental({
      spec: { identifier: capability.id, maxRows: 96 },
      append: indicatorInput(capability, input, 0, 17),
    });
    const second = calculateTechnicalIndicatorIncremental({
      spec: { identifier: capability.id, maxRows: 96 },
      previous: structuredClone(first.snapshot),
      append: indicatorInput(capability, input, 17, 41),
    });
    const third = calculateTechnicalIndicatorIncremental({
      spec: { identifier: capability.id, maxRows: 96 },
      previous: structuredClone(second.snapshot),
      append: indicatorInput(capability, input, 41, 96),
    });

    assert.deepEqual(third.calculation.outputs, oneShot.outputs, capability.id);
    assert.deepEqual(
      [second.diagnostics.evaluatedRows, third.diagnostics.evaluatedRows],
      [24, 55],
      `${capability.id}: only suffix rows are evaluated`,
    );
    assert.equal(second.diagnostics.recomputedPrefixRows, 0, capability.id);
    assert.equal(third.diagnostics.recomputedPrefixRows, 0, capability.id);
    assert.equal(third.snapshot.runtime.totalEvaluatedRows, 96, capability.id);
    assert.equal(third.snapshot.runtime.engine.index > 0, true, capability.id);
  });
});

test('incremental checkpoints preserve hard-session parity and migrate legacy snapshots once', () => {
  const input = marketInput(84);
  const session = Array.from({ length: 84 }, (_, index) => `session-${Math.floor(index / 21)}`);
  const options = { session: { mode: 'field', field: 'session', reset: 'hard' } };
  technicalIndicatorCapabilities.forEach((capability) => {
    const complete = { ...indicatorInput(capability, input), session };
    const expected = calculateTechnicalIndicator(capability.id, complete, options);
    const first = calculateTechnicalIndicatorIncremental({
      spec: { identifier: capability.id, options, maxRows: 84 },
      append: {
        ...indicatorInput(capability, input, 0, 25),
        session: session.slice(0, 25),
      },
    });
    const second = calculateTechnicalIndicatorIncremental({
      spec: { identifier: capability.id, options, maxRows: 84 },
      previous: first.snapshot,
      append: {
        ...indicatorInput(capability, input, 25, 84),
        session: session.slice(25),
      },
    });
    assert.deepEqual(second.calculation.outputs, expected.outputs, capability.id);
    assert.deepEqual(second.calculation.session, expected.session, capability.id);
  });

  const first = calculateTechnicalIndicatorIncremental({
    spec: { identifier: 'ema', options: { period: 4 }, maxRows: 12 },
    append: { value: [1, 2, 3, 4, 5] },
  });
  const { runtime: _discardedRuntime, ...legacy } = first.snapshot;
  const migrated = calculateTechnicalIndicatorIncremental({
    spec: { identifier: 'ema', options: { period: 4 }, maxRows: 12 },
    previous: legacy,
    append: { value: [6] },
  });
  assert.equal(migrated.diagnostics.strategy, 'legacy-restore');
  assert.equal(migrated.diagnostics.recomputedPrefixRows, 5);
  const resumed = calculateTechnicalIndicatorIncremental({
    spec: { identifier: 'ema', options: { period: 4 }, maxRows: 12 },
    previous: migrated.snapshot,
    append: { value: [7, 8] },
  });
  assert.deepEqual(resumed.diagnostics, {
    strategy: 'incremental',
    evaluatedRows: 2,
    recomputedPrefixRows: 0,
    patchedPrefixRows: 0,
  });
  assert.equal(resumed.snapshot.runtime.totalEvaluatedRows, 8);
  assert.deepEqual(
    resumed.calculation.outputs,
    calculateTechnicalIndicator('ema', [1, 2, 3, 4, 5, 6, 7, 8], { period: 4 }).outputs,
  );
});

class LinkedPort extends EventTarget {
  peer = null;

  postMessage(message) {
    queueMicrotask(() => {
      const event = new Event('message');
      Object.defineProperty(event, 'data', { value: structuredClone(message) });
      this.peer?.dispatchEvent(event);
    });
  }
}

test('Worker protocol executes bounded incremental indicators through the same calculation engine', async () => {
  const client = new LinkedPort();
  const worker = new LinkedPort();
  client.peer = worker;
  worker.peer = client;
  const uninstall = installWorkerRuntime(worker, { maxInputRows: 6 });
  const runtime = createAutomaticWorkerRuntime(
    { moduleURL: '/indicator-worker.js', maxInputRows: 6 },
    { create: () => client },
  );
  const spec = { identifier: 'vwap', maxRows: 6 };
  const first = await runtime.technicalIndicator({
    spec,
    append: {
      high: [1, 2, 3],
      low: [1, 2, 3],
      close: [1, 2, 3],
      volume: [1, 1, 1],
    },
  });
  const second = await runtime.technicalIndicator({
    spec,
    previous: first.snapshot,
    append: { high: [4], low: [4], close: [4], volume: [1] },
  });
  assert.deepEqual(second.calculation.outputs.value, [1, 1.5, 2, 2.5]);
  await assert.rejects(
    runtime.technicalIndicator({
      spec,
      previous: second.snapshot,
      append: { high: [5, 6, 7], low: [5, 6, 7], close: [5, 6, 7], volume: [1, 1, 1] },
    }),
    /limit|exceed/,
  );
  await assert.rejects(
    runtime.technicalIndicator({
      spec,
      previous: { ...second.snapshot, length: 0 },
      append: { high: [5], low: [5], close: [5], volume: [1] },
    }),
    /snapshot channel must match snapshot.length/,
  );
  runtime.close({ terminate: true });
  uninstall();
});

test('runtime preparation wires OHLCV fields, session lineage, panel metadata, and validation', () => {
  const rows = marketInput(12).close.map((close, index) => ({
    x: index,
    high: close + 2,
    low: close - 2,
    close,
    session: index < 6 ? 'A' : 'B',
  }));
  const result = compile({
    data: rows,
    mark: {
      type: 'indicator',
      fields: { high: 'high', low: 'low', close: 'close' },
      options: {
        kind: 'atr',
        calculate: true,
        period: 3,
        session: { mode: 'field', field: 'session', reset: 'hard' },
      },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'close', type: 'quantitative' },
  });
  const metadata = result.scene.metadata.technicalIndicators;
  assert.equal(metadata.length, 1);
  assert.equal(metadata[0].kind, 'atr');
  assert.deepEqual(metadata[0].requiredInputs, ['high', 'low', 'close']);
  assert.deepEqual(metadata[0].session.boundaries, [0, 6]);
  assert.equal(metadata[0].presentation.placement, 'panel');
  assert.equal(metadata[0].presentation.synchronizedCrosshair.sharedDomain, true);
  assert.deepEqual(metadata[0].outputFields, ['close']);
  assert.deepEqual(metadata[0].presentation.synchronizedCrosshair.fields, ['close']);
  assert.ok(
    Math.max(...result.coordinates.axes.y.domain().map(Number)) < 10,
    'panel domains must use calculated outputs rather than source OHLC prices',
  );
  assert.match(result.dataLineage['layer-0'].summary, /hard session state/);

  assert.equal(
    validateSpec({
      data: rows,
      mark: {
        type: 'indicator',
        options: { kind: 'bb', calculate: true, period: 20, standardDeviations: 2 },
      },
      x: 'x',
      y: 'close',
    }).length,
    0,
  );
  assert.ok(
    validateSpec({
      data: rows,
      mark: { type: 'indicator', options: { kind: 'obv', calculate: true, period: 20 } },
      x: 'x',
      y: 'close',
    }).some(({ path }) => path.endsWith('.period')),
  );
  assert.ok(
    validateSpec({
      data: rows,
      mark: {
        type: 'indicator',
        options: {
          kind: 'vwap',
          calculate: true,
          session: { mode: 'gap', gapMs: 0 },
        },
      },
      x: 'x',
      y: 'close',
    }).some(({ path }) => path.endsWith('.gapMs')),
  );
});

test('all 45 calculated presets traverse runtime preparation before domain and Scene compilation', () => {
  const input = marketInput();
  const rows = input.close.map((close, index) => ({
    x: index,
    value: input.value[index],
    open: input.open[index],
    high: input.high[index],
    low: input.low[index],
    close,
    volume: input.volume[index],
  }));
  technicalIndicatorCapabilities.forEach((capability) => {
    const result = compile({
      data: rows,
      mark: {
        type: 'indicator',
        fields: {
          value: 'value',
          middle: 'value',
          open: 'open',
          high: 'high',
          low: 'low',
          close: 'close',
          volume: 'volume',
          lower: 'lower',
          upper: 'upper',
          signal: 'signal',
          histogram: 'histogram',
          up: 'up',
          down: 'down',
          plus: 'plus',
          minus: 'minus',
          conversion: 'conversion',
          base: 'base',
          support: 'support',
          resistance: 'resistance',
          direction: 'direction',
        },
        options: {
          kind: capability.kind,
          calculate: true,
          fields: capability.outputs,
        },
      },
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'value', type: 'quantitative' },
    });
    assert.equal(result.scene.metadata.technicalIndicators?.[0]?.id, capability.id, capability.id);
    assert.equal(
      result.dataLineage['layer-0'].transforms.at(-1).parameters.operation,
      'technical-indicator',
      capability.id,
    );
  });
});

test('price overlays and oscillator indicators materialize separate panes with a synchronized domain crosshair', () => {
  const rows = marketInput(36).close.map((close, index) => ({
    x: index,
    open: close - 0.5,
    high: close + 1.5,
    low: close - 1.5,
    close,
  }));
  const indicatorLayer = (id, kind) => ({
    id,
    data: rows,
    mark: {
      type: 'indicator',
      fields: { high: 'high', low: 'low', close: 'close' },
      options: { kind, calculate: true, period: 5 },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'close', type: 'quantitative' },
  });
  const spec = {
    data: rows,
    width: 720,
    height: 620,
    layers: [
      {
        id: 'price',
        mark: {
          type: 'candlestick',
          fields: { open: 'open', high: 'high', low: 'low', close: 'close' },
        },
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'close', type: 'quantitative' },
      },
      indicatorLayer('average', 'sma'),
      indicatorLayer('oscillator', 'atr'),
    ],
  };
  const result = compileWithRegistry(
    spec,
    createCompleteRegistry(),
    {},
    {
      technicalCrosshairValue: 18,
    },
  );
  assert.equal(result.scene.metadata.composition?.kind, 'vconcat');
  assert.equal(result.scene.metadata.composition?.viewCount, 2);
  assert.deepEqual(
    result.scene.metadata.technicalIndicatorPanels?.map(({ id, placement }) => ({ id, placement })),
    [
      { id: 'price', placement: 'price' },
      { id: 'indicator:average-true-range', placement: 'indicator' },
    ],
  );
  const [pricePane, indicatorPane] = result.scene.metadata.technicalIndicatorPanels;
  assert.ok(pricePane.bounds.y + pricePane.bounds.height < indicatorPane.bounds.y);
  assert.ok(result.coordinateViews[0].coordinates.axes.y.domain()[0] > 90);
  assert.ok(result.coordinateViews[1].coordinates.axes.y.domain().at(-1) < 10);
  assert.equal(result.scene.metadata.technicalIndicatorCrosshair?.value, 18);
  assert.equal(result.scene.metadata.technicalIndicatorCrosshair?.positions.length, 2);
  const crosshairNodes = flattenScene(result.scene.root).filter(({ id }) =>
    id.startsWith('technical-crosshair:'),
  );
  assert.equal(crosshairNodes.length, 2);
  assert.deepEqual(
    crosshairNodes.map(({ y1, y2 }) => [y1, y2]),
    result.scene.metadata.technicalIndicatorPanels.map(({ bounds }) => [
      bounds.y,
      bounds.y + bounds.height,
    ]),
  );
});
