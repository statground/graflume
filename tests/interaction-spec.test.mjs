import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  constrainInspectionView,
  inverseInspectionPoint,
  panInspectionView,
  zoomInspectionView,
} from '../.tmp/src/interaction/inspection-view.js';
import { collectPlaybackFrames, playbackSpec } from '../.tmp/src/interaction/playback.js';
import { normalizeSpec } from '../.tmp/src/spec/normalize.js';
import { validateSpec } from '../.tmp/src/spec/validate.js';

const data = [
  { period: '2026-Q1', category: 'A', value: 10 },
  { period: '2026-Q2', category: 'A', value: 14 },
  { period: '2026-Q1', category: 'B', value: 8 },
  { period: '2026-Q3', category: 'A', value: 18 },
];

function baseSpec(interaction) {
  return {
    data,
    mark: 'line',
    x: 'category',
    y: 'value',
    ...(interaction === undefined ? {} : { interaction }),
  };
}

test('interaction features are default-off and normalize portable defaults', () => {
  const disabled = normalizeSpec(baseSpec()).interaction;
  assert.equal(disabled.navigation, false);
  assert.equal(disabled.playback, false);
  assert.equal(disabled.controls, false);

  const normalized = normalizeSpec(
    baseSpec({
      navigation: true,
      playback: { field: 'period' },
      controls: {
        zoom: true,
        annotations: true,
        playback: true,
        labels: {
          controls: '차트 도구',
          showAnnotations: '주석 보기',
          hideAnnotations: '주석 숨기기',
          loop: '반복',
        },
      },
    }),
  ).interaction;

  assert.deepEqual(normalized.navigation, {
    minZoom: 1,
    maxZoom: 6,
    wheel: 'modifier',
    drag: true,
    pinch: true,
    keyboard: true,
  });
  assert.deepEqual(normalized.playback, {
    field: 'period',
    mode: 'frame',
    interval: 1000,
    rate: 1,
    loop: false,
    windowSize: 1,
    autoplay: false,
    transition: false,
    filter: false,
  });
  assert.equal(normalized.controls.zoom, true);
  assert.equal(normalized.controls.reset, false);
  assert.equal(normalized.controls.annotations, true);
  assert.equal(normalized.controls.labels.controls, '차트 도구');
  assert.equal(normalized.controls.labels.loop, '반복');
  assert.equal(normalized.controls.labels.exportPng, 'Download PNG');
  assert.equal(normalized.controls.labels.showAnnotations, '주석 보기');
  assert.equal(normalized.controls.labels.hideAnnotations, '주석 숨기기');

  const allControls = normalizeSpec(baseSpec({ controls: true })).interaction.controls;
  assert.equal(allControls.zoom, true);
  assert.equal(allControls.reset, true);
  assert.equal(allControls.fullscreen, true);
  assert.equal(allControls.export, true);
  assert.equal(allControls.annotations, true);
  assert.equal(allControls.playback, true);
  assert.equal(allControls.labels.controls, 'Chart controls');
});

test('runtime validation closes and bounds the interaction contract', () => {
  const issues = validateSpec(
    baseSpec({
      unknown: true,
      navigation: {
        minZoom: 4,
        maxZoom: 2,
        wheel: 'trackpad',
        pinch: 'yes',
      },
      playback: {
        field: '__proto__',
        key: 'constructor',
        mode: 'smooth',
        interval: 50,
        rate: 20,
        windowSize: 0,
        filter: 'yes',
        transition: { duration: 20, easing: 'spring', html: '<b>unsafe</b>' },
      },
      controls: {
        zoom: 'yes',
        annotations: 'yes',
        labels: {
          controls: '',
          showAnnotations: '',
          hideAnnotations: () => 'unsafe',
          loop: () => 'unsafe',
          html: '<b>unsafe</b>',
        },
      },
    }),
  );
  const paths = new Set(issues.map(({ path }) => path));
  for (const path of [
    '$.interaction.unknown',
    '$.interaction.navigation.maxZoom',
    '$.interaction.navigation.wheel',
    '$.interaction.navigation.pinch',
    '$.interaction.playback.field',
    '$.interaction.playback.key',
    '$.interaction.playback.mode',
    '$.interaction.playback.interval',
    '$.interaction.playback.rate',
    '$.interaction.playback.windowSize',
    '$.interaction.playback.filter',
    '$.interaction.playback.transition.duration',
    '$.interaction.playback.transition.easing',
    '$.interaction.playback.transition.html',
    '$.interaction.controls.zoom',
    '$.interaction.controls.annotations',
    '$.interaction.controls.labels.controls',
    '$.interaction.controls.labels.showAnnotations',
    '$.interaction.controls.labels.hideAnnotations',
    '$.interaction.controls.labels.loop',
    '$.interaction.controls.labels.html',
  ]) {
    assert.ok(paths.has(path), `missing issue for ${path}`);
  }
  assert.ok(issues.some(({ message }) => message.includes('Functions are not allowed')));

  const truePlayback = validateSpec(baseSpec({ playback: true }));
  assert.ok(truePlayback.some(({ path }) => path === '$.interaction.playback.field'));
});

test('JSON Schema matches navigation, required playback field, and localized controls', async () => {
  const schema = JSON.parse(
    await readFile(new URL('../schema/graflume.schema.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(schema.$defs.navigation.properties.wheel.enum, ['off', 'modifier', 'always']);
  assert.equal(schema.$defs.navigation.properties.pinch.type, 'boolean');
  assert.deepEqual(schema.$defs.playback.required, ['field']);
  assert.equal(schema.$defs.playback.properties.interval.minimum, 100);
  assert.equal(schema.$defs.playback.properties.rate.maximum, 16);
  assert.equal(schema.$defs.playbackTransition.properties.duration.minimum, 50);
  assert.deepEqual(schema.$defs.playbackTransition.properties.easing.enum, [
    'linear',
    'ease-in-out',
  ]);
  assert.equal(schema.$defs.controlLabels.properties.controls.minLength, 1);
  assert.equal(schema.$defs.controlLabels.properties.showAnnotations.minLength, 1);
  assert.equal(schema.$defs.controlLabels.properties.hideAnnotations.minLength, 1);
  assert.equal(schema.$defs.controls.properties.annotations.type, 'boolean');
  assert.equal(schema.$defs.controlLabels.properties.loop.minLength, 1);
  assert.deepEqual(schema.properties.interaction.properties.playback.oneOf[0], { const: false });
});

test('inspection viewport math preserves its anchor, clamps panning, and inverts pointers', () => {
  const bounds = { width: 200, height: 100, minZoom: 1, maxZoom: 6 };
  const anchor = { x: 80, y: 40 };
  const zoomed = zoomInspectionView({ zoom: 1, offsetX: 0, offsetY: 0 }, 2, anchor, bounds);
  assert.deepEqual(zoomed, { zoom: 2, offsetX: -80, offsetY: -40 });
  assert.deepEqual(inverseInspectionPoint(zoomed, anchor), anchor);

  assert.deepEqual(panInspectionView(zoomed, 500, -500, bounds), {
    zoom: 2,
    offsetX: 0,
    offsetY: -100,
  });
  assert.deepEqual(constrainInspectionView({ zoom: 99, offsetX: -9999, offsetY: 9999 }, bounds), {
    zoom: 6,
    offsetX: -1000,
    offsetY: 0,
  });
  assert.throws(() => zoomInspectionView(zoomed, 0, anchor, bounds), RangeError);
  assert.throws(() => panInspectionView(zoomed, Number.NaN, 0, bounds), RangeError);
});

test('playback uses stable first-seen frames and only filters generic data when opted in', () => {
  const base = baseSpec();
  const normalized = normalizeSpec(
    baseSpec({ playback: { field: 'period', mode: 'cumulative', filter: true } }),
  ).interaction.playback;
  assert.notEqual(normalized, false);
  const frames = collectPlaybackFrames(base, normalized);
  assert.deepEqual(frames, ['2026-Q1', '2026-Q2', '2026-Q3']);

  const cumulative = playbackSpec(base, normalized, frames, 1);
  assert.deepEqual(
    cumulative.data.map(({ period }) => period),
    ['2026-Q1', '2026-Q2', '2026-Q1'],
  );

  const unfiltered = normalizeSpec(
    baseSpec({ playback: { field: 'period', mode: 'window', windowSize: 1 } }),
  ).interaction.playback;
  assert.notEqual(unfiltered, false);
  const unchanged = playbackSpec(base, unfiltered, frames, 2);
  assert.equal(unchanged.data, base.data);
});

test('playback leaves field-less reference layers unchanged', () => {
  const timedLayer = {
    id: 'timed',
    data: [
      { period: 'Q1', category: 'A', value: 10 },
      { period: 'Q2', category: 'A', value: 14 },
    ],
    mark: 'line',
    x: 'category',
    y: 'value',
  };
  const referenceLayer = {
    id: 'reference',
    data: [{ category: 'A', target: 12 }],
    mark: 'line',
    x: 'category',
    y: 'target',
  };
  const base = {
    layers: [timedLayer, referenceLayer],
    interaction: {
      playback: { field: 'period', mode: 'frame', filter: true },
    },
  };
  const playback = normalizeSpec(base).interaction.playback;
  assert.notEqual(playback, false);
  const frames = collectPlaybackFrames(base, playback);
  const transient = playbackSpec(base, playback, frames, 0);

  assert.deepEqual(frames, ['Q1', 'Q2']);
  assert.deepEqual(transient.layers[0].data, [{ period: 'Q1', category: 'A', value: 10 }]);
  assert.equal(transient.layers[1], referenceLayer);
  assert.equal(transient.layers[1].data, referenceLayer.data);
});

test('motion frame playback is transient and preserves the base data and declared domains', () => {
  const base = {
    data,
    mark: {
      type: 'motion',
      fields: { size: 'value' },
      options: { frame: '2026-Q2', color: '#4f46e5' },
    },
    x: { field: 'category', scale: { domain: ['A', 'B'] } },
    y: { field: 'value', scale: { domain: [0, 20] } },
  };
  const snapshot = JSON.stringify(base);
  const playback = normalizeSpec({
    ...base,
    interaction: { playback: { field: 'period' } },
  }).interaction.playback;
  assert.notEqual(playback, false);
  const frames = collectPlaybackFrames(base, playback);
  const transient = playbackSpec(base, playback, frames, 2);

  assert.equal(transient.data, base.data);
  assert.equal(transient.mark.options.frame, '2026-Q3');
  assert.equal(transient.mark.options.color, '#4f46e5');
  assert.equal(transient.mark.fields.time, 'period');
  assert.equal(transient.x, base.x);
  assert.equal(transient.y, base.y);
  assert.equal(JSON.stringify(base), snapshot);
});

test('motion playback retains Date frame identity for the existing mark compiler', () => {
  const first = new Date('2026-01-01T00:00:00.000Z');
  const second = new Date('2026-02-01T00:00:00.000Z');
  const base = {
    data: [
      { period: first, category: 'A', value: 10 },
      { period: second, category: 'A', value: 12 },
    ],
    mark: 'motion',
    x: 'category',
    y: 'value',
  };
  const playback = normalizeSpec({
    ...base,
    interaction: { playback: { field: 'period' } },
  }).interaction.playback;
  assert.notEqual(playback, false);
  const frames = collectPlaybackFrames(base, playback);
  const transient = playbackSpec(base, playback, frames, 1);
  assert.equal(transient.mark.options.frame, second);
  assert.equal(transient.data, base.data);
});
