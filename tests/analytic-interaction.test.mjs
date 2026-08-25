import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  AnalyticSelectionStore,
  LinkedViewStateStore,
  addAnalyticKeyboardVertex,
  analyticSelectionMatches,
  compile,
  completeAnalyticKeyboardSelection,
  createPositionScale,
  domainForAxisWindow,
  domainPointToPixel,
  domainViewIsIdentity,
  emptyDomainViewState,
  normalizeAnalyticSelectionState,
  normalizeDomainViewState,
  panDomainAxisWindow,
  pixelPointToDomain,
  pixelRectangleToSelection,
  pixelToDomain,
  selectionToPixels,
  startAnalyticKeyboardGesture,
  zoomDomainAxisWindow,
} from '../.tmp/src/index.js';
import { analyticInteractionCapability } from '../.tmp/src/catalog/runtime-capabilities.js';
import { compileWithRegistry } from '../.tmp/src/compiler/compile.js';
import { defaultRegistry } from '../.tmp/src/runtime/default-registry.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const close = (actual, expected, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);

function numericContext({ reverse = false, xType = 'linear' } = {}) {
  const plot = { x: 20, y: 10, width: 200, height: 100 };
  return Object.freeze({
    plot,
    axes: Object.freeze({
      x: createPositionScale(
        { type: xType, reverse, nice: false },
        { type: xType, domain: xType === 'log' ? [1, 100] : [0, 10], range: [20, 220] },
      ),
      y: createPositionScale(
        { type: 'linear', nice: false },
        { type: 'linear', domain: [0, 20], range: [110, 10] },
      ),
    }),
  });
}

test('analytic selection store is immutable, serializable, bounded, and deterministic', () => {
  const store = new AnalyticSelectionStore();
  const first = store.apply({
    type: 'rectangle',
    xAxis: 'x',
    yAxis: 'y',
    x: [8, 2],
    y: [3, 9],
  });
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.selections));
  assert.deepEqual(first.selections[0].x, [2, 8]);

  const union = store.apply({ type: 'axis', axis: 'x', extent: [7, 9] }, 'union');
  assert.equal(union.combine, 'union');
  assert.equal(analyticSelectionMatches(union, { x: 8, y: 20 }), true);
  assert.equal(analyticSelectionMatches(union, { x: 3, y: 4 }), true);
  assert.equal(analyticSelectionMatches(union, { x: 1, y: 20 }), false);

  const intersection = store.apply({ type: 'axis', axis: 'y', extent: [4, 6] }, 'intersection');
  assert.equal(analyticSelectionMatches(intersection, { x: 8, y: 5 }), true);
  assert.equal(analyticSelectionMatches(intersection, { x: 8, y: 8 }), false);
  const roundTrip = normalizeAnalyticSelectionState(JSON.parse(JSON.stringify(intersection)));
  assert.deepEqual(roundTrip, intersection);

  assert.throws(
    () =>
      normalizeAnalyticSelectionState({
        version: 1,
        combine: 'union',
        selections: [{ type: 'axis', axis: 'x', extent: [0, Number.NaN] }],
      }),
    /finite/,
  );
  assert.throws(
    () =>
      normalizeAnalyticSelectionState({
        version: 1,
        combine: 'union',
        selections: [
          {
            type: 'lasso',
            xAxis: 'x',
            yAxis: 'y',
            points: Array.from({ length: 513 }, (_, index) => ({ x: index, y: index })),
          },
        ],
      }),
    /512 point bound/,
  );
  assert.throws(
    () =>
      normalizeAnalyticSelectionState({
        version: 1,
        combine: 'union',
        selections: [{ type: 'axis', axis: 'x', extent: [0, 1], ignored: true }],
      }),
    /unknown key/,
  );
});

test('pixel/domain coordinates round-trip continuous, reverse, log, and categorical scales', () => {
  for (const context of [numericContext(), numericContext({ reverse: true })]) {
    const pixel = domainPointToPixel(context, { x: 3.25, y: 12 });
    const domain = pixelPointToDomain(context, pixel);
    close(domain.x, 3.25);
    close(domain.y, 12);
  }

  const log = numericContext({ xType: 'log' });
  close(pixelToDomain(log, 'x', log.axes.x.map(10)), 10, 1e-6);

  const categorical = {
    plot: { x: 0, y: 0, width: 100, height: 100 },
    axes: {
      x: createPositionScale(
        { type: 'band' },
        { type: 'band', domain: ['A', 'B', 'C'], range: [0, 100] },
      ),
      y: createPositionScale(
        { type: 'linear', nice: false },
        { type: 'linear', domain: [0, 1], range: [100, 0] },
      ),
    },
  };
  const bCenter = categorical.axes.x.map('B');
  assert.equal(pixelToDomain(categorical, 'x', bCenter), 'B');
  const brush = pixelRectangleToSelection(
    categorical,
    { x: categorical.axes.x.map('A'), y: 90 },
    { x: categorical.axes.x.map('B'), y: 10 },
  );
  assert.deepEqual(brush.x, { values: ['A', 'B'] });
  assert.deepEqual(brush.y, [0.1, 0.9]);
  const pixels = selectionToPixels(categorical, brush);
  assert.ok(pixels[0].x < categorical.axes.x.map('A'));
  assert.ok(pixels[1].x > categorical.axes.x.map('B'));
  assert.equal(
    analyticSelectionMatches(
      { version: 1, combine: 'union', selections: [brush] },
      { x: 'B', y: 0.5 },
    ),
    true,
  );

  assert.deepEqual(domainForAxisWindow(categorical.axes.x, { start: 1 / 3, end: 1 }), ['B', 'C']);

  const ordinal = {
    ...categorical,
    axes: {
      ...categorical.axes,
      x: createPositionScale(
        { type: 'ordinal' },
        { type: 'ordinal', domain: ['A', 'B', 'C'], range: [0, 50, 100] },
      ),
    },
  };
  assert.throws(
    () => pixelRectangleToSelection(ordinal, { x: 0, y: 0 }, { x: 100, y: 100 }),
    /cannot create a categorical brush extent/,
  );
  assert.throws(
    () => domainForAxisWindow(ordinal.axes.x, { start: 0.2, end: 0.8 }),
    /cannot resolve the "ordinal" scale/,
  );
});

test('keyboard geometry and linked view state remain bounded, portable, and deterministic', () => {
  const context = numericContext();
  const config = {
    kind: 'lasso',
    combine: 'union',
    mode: 'single',
    toggle: true,
    clearOnBackground: true,
    clearOnEscape: true,
    ariaLabel: 'Chart selection',
    highlight: {
      fill: 'transparent',
      stroke: '#000',
      opacity: 1,
      lineWidth: 1,
      dash: [],
      padding: 0,
      radius: 0,
    },
    xAxis: 'x',
    yAxis: 'y',
    maxSelections: 64,
    maxLassoPoints: 8,
    minPixelSpan: 1,
    keyboard: true,
    keyboardStep: 8,
    filter: false,
    linked: false,
  };
  let gesture = startAnalyticKeyboardGesture(context, 'lasso', { x: 40, y: 90 });
  gesture = { ...gesture, current: { x: 160, y: 90 } };
  gesture = addAnalyticKeyboardVertex(gesture, 8);
  gesture = { ...gesture, current: { x: 160, y: 30 } };
  gesture = addAnalyticKeyboardVertex(gesture, 8);
  const completed = completeAnalyticKeyboardSelection(context, gesture, config);
  assert.equal(completed?.type, 'lasso');
  assert.equal(completed?.points.length, 3);

  const store = new LinkedViewStateStore();
  const received = [];
  const unregisterA = store.register('a', (change) => received.push(['a', change]));
  const unregisterB = store.register('b', (change) => received.push(['b', change]));
  const selected = normalizeAnalyticSelectionState({
    version: 1,
    combine: 'union',
    selections: [{ type: 'axis', axis: 'x', extent: [2, 4] }],
  });
  store.setAnalyticSelection(selected, 'a');
  assert.deepEqual(store.get().analyticSelection, selected);
  assert.deepEqual(
    received.map(([id]) => id),
    ['b'],
  );
  assert.ok(Object.isFrozen(store.get()));
  unregisterA();
  unregisterB();

  assert.equal(analyticInteractionCapability.status, 'supported');
  assert.equal(analyticInteractionCapability.inputs.keyboardGeometryAuthoring, true);
  assert.equal(analyticInteractionCapability.coordinates.categoricalBrush, true);
  assert.equal(analyticInteractionCapability.domainNavigation.categorical, true);
  assert.equal(analyticInteractionCapability.domainNavigation.multiViewLinkedStore, true);
  assert.equal(analyticInteractionCapability.filtering.selectionDriven, true);
  assert.equal(analyticInteractionCapability.composition.coordinateViews, true);
});

test('domain windows zoom and pan within safe bounds and preserve transformed domains', () => {
  let state = emptyDomainViewState();
  state = zoomDomainAxisWindow(state, 'x', 4, 0.5, 8);
  assert.deepEqual(state.axes.x, { start: 0.375, end: 0.625 });
  state = panDomainAxisWindow(state, 'x', 2);
  assert.deepEqual(state.axes.x, { start: 0.75, end: 1 });
  state = zoomDomainAxisWindow(state, 'x', 100, 0.9, 8);
  close(state.axes.x.end - state.axes.x.start, 0.125);
  assert.equal(domainViewIsIdentity(state), false);

  const log = numericContext({ xType: 'log' }).axes.x;
  const domain = domainForAxisWindow(log, { start: 0.25, end: 0.75 });
  close(domain[0], Math.sqrt(10), 1e-6);
  close(domain[1], 10 * Math.sqrt(10), 1e-6);
  assert.throws(
    () => normalizeDomainViewState({ version: 1, axes: { x: { start: 0.8, end: 0.2 } } }),
    /start < end/,
  );
  assert.throws(
    () =>
      normalizeDomainViewState({
        version: 1,
        axes: { x: { start: 0.2, end: 0.8, ignored: true } },
      }),
    /unknown key/,
  );
});

test('compiler exposes coordinate context and recompiles domains with an analytic overlay', () => {
  const spec = {
    data: [
      { x: 1, y: 2 },
      { x: 101, y: 12 },
    ],
    mark: 'point',
    encoding: {
      x: { field: 'x', type: 'quantitative', scale: { domain: [1, 101], nice: false } },
      y: { field: 'y', type: 'quantitative', scale: { domain: [2, 12], nice: false } },
    },
    interaction: {
      domainNavigation: { axes: ['x'], drag: false },
      selection: { kind: 'rectangle', mode: 'multiple', combine: 'union' },
    },
  };
  const base = compile(spec, { width: 400, height: 260 });
  close(base.coordinates.axes.x.invert(base.coordinates.axes.x.map(51)), 51);
  const result = compileWithRegistry(
    spec,
    defaultRegistry,
    { width: 400, height: 260 },
    {
      domainView: { version: 1, axes: { x: { start: 0.25, end: 0.75 } } },
      analyticSelection: {
        version: 1,
        combine: 'union',
        selections: [{ type: 'rectangle', xAxis: 'x', yAxis: 'y', x: [40, 60], y: [4, 10] }],
      },
    },
  );
  assert.deepEqual(result.coordinates.axes.x.domain(), [26, 76]);
  const sceneNodes = flattenScene(result.scene.root);
  assert.ok(sceneNodes.some(({ id }) => id === 'analytic-selection:0'));
  assert.deepEqual(
    result.scene.root.children.find(({ id }) => id === 'analytic-selection:overlay')?.clip,
    result.coordinates.plot,
  );
});

test('selection filtering preserves full scale domains, lineage, and composed leaf state', () => {
  const selectionState = {
    version: 1,
    combine: 'union',
    selections: [
      {
        type: 'rectangle',
        xAxis: 'x',
        yAxis: 'y',
        x: { values: ['B'] },
        y: [0, 10],
      },
    ],
  };
  const unit = {
    data: [
      { category: 'A', value: 2 },
      { category: 'B', value: 5 },
      { category: 'C', value: 8 },
    ],
    mark: 'point',
    encoding: {
      x: { field: 'category', type: 'nominal' },
      y: {
        field: 'value',
        type: 'quantitative',
        scale: { domain: [0, 10], nice: false },
      },
    },
  };
  const filtered = compileWithRegistry(
    {
      ...unit,
      interaction: { selection: { kind: 'rectangle', filter: true } },
    },
    defaultRegistry,
    { width: 400, height: 260 },
    { analyticSelection: selectionState },
  );
  assert.equal(filtered.scene.metadata.rowCount, 1);
  assert.deepEqual(filtered.coordinates.axes.x.domain(), ['A', 'B', 'C']);
  assert.deepEqual(
    filtered.scene.semanticIndex.map(({ datum }) => datum.category),
    ['B'],
  );
  assert.equal(filtered.dataLineage['layer-0'].outputRows, 1);
  assert.match(
    filtered.dataLineage['layer-0'].summary,
    /Runtime analytic selection retained 1 of 3/,
  );

  const composed = compileWithRegistry(
    {
      hconcat: [
        unit,
        { ...unit, data: unit.data.map((row) => ({ ...row, value: row.value + 1 })) },
      ],
      interaction: {
        selection: { kind: 'rectangle', filter: true, linked: true },
        domainNavigation: { axes: ['y'], drag: false },
      },
      width: 800,
      height: 320,
    },
    defaultRegistry,
    { width: 800, height: 320 },
    {
      analyticSelection: selectionState,
      domainView: { version: 1, axes: { y: { start: 0.25, end: 0.75 } } },
    },
  );
  assert.deepEqual(
    composed.coordinateViews.map(({ id }) => id),
    ['hconcat-0', 'hconcat-1'],
  );
  assert.ok(
    composed.coordinateViews.every(
      ({ coordinates }) =>
        coordinates.axes.y.domain()[0] === 2.5 && coordinates.axes.y.domain()[1] === 7.5,
    ),
  );
  assert.deepEqual(
    composed.scene.semanticIndex.map(({ viewId, datum }) => [viewId, datum.category]),
    [
      ['hconcat-0', 'B'],
      ['hconcat-1', 'B'],
    ],
  );
  const overlayIds = flattenScene(composed.scene.root)
    .map(({ id }) => id)
    .filter((id) => id.endsWith('/analytic-selection:0'));
  assert.deepEqual(overlayIds, [
    'hconcat-0/analytic-selection:0',
    'hconcat-1/analytic-selection:0',
  ]);
});

test('validation rejects ambiguous gestures and unsupported analytic configuration explicitly', async () => {
  const base = {
    data: [{ x: 1, y: 2 }],
    mark: 'point',
    x: 'x',
    y: 'y',
  };
  assert.ok(
    validateSpec({
      ...base,
      interaction: { navigation: true, domainNavigation: true },
    }).some(({ message }) => /cannot be combined/.test(message)),
  );
  assert.ok(
    validateSpec({
      ...base,
      interaction: {
        domainNavigation: { drag: true },
        selection: { kind: 'lasso' },
      },
    }).some(({ message }) => /ambiguous gesture/.test(message)),
  );
  assert.ok(
    validateSpec({ ...base, interaction: { selection: { kind: 'axis' } } }).some(
      ({ path }) => path === '$.interaction.selection.axis',
    ),
  );
  assert.ok(
    validateSpec({
      ...base,
      interaction: { selection: { kind: 'rectangle', key: 'x' } },
    }).some(({ message }) => /only by point/.test(message)),
  );

  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.ok(schema.$defs.domainNavigation);
  assert.ok(schema.$defs.analyticSelectionState);
  assert.ok(schema.$defs.domainViewState);
  assert.deepEqual(schema.$defs.linkedViewState.required, [
    'version',
    'analyticSelection',
    'domainView',
  ]);
});
