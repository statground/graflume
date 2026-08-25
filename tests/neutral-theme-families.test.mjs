import assert from 'node:assert/strict';
import test from 'node:test';

import { builtInThemeCatalog, compile, createRegistry } from '../.tmp/src/index.js';

const neutralThemeIds = [
  'editorial',
  'scientific-classic',
  'statistical-minimal',
  'dashboard-dense',
  'finance-terminal',
  'observability',
  'geospatial',
  'spatial-lab',
  'presentation',
  'pictorial',
  'dark-technical',
  'high-contrast',
];

const neutralThemes = builtInThemeCatalog.slice(5);

test('registers the twelve neutral theme families after the established built-ins', () => {
  assert.deepEqual(
    builtInThemeCatalog.slice(0, 5).map(({ id }) => id),
    ['graflume-light', 'graflume-dark', 'ggplot', 'r-base', 'matplotlib'],
  );
  assert.deepEqual(
    neutralThemes.map(({ id }) => id),
    neutralThemeIds,
  );
  assert.deepEqual(
    neutralThemes.map(({ tokens }) => tokens.name),
    neutralThemeIds,
  );
  assert.ok(neutralThemes.every(({ snapshot }) => snapshot));
  assert.ok(neutralThemes.every(({ sourceBaseline }) => sourceBaseline === undefined));

  const registered = new Set(createRegistry().capabilities().themes);
  for (const id of neutralThemeIds) assert.ok(registered.has(id), `${id} must be registered`);
});

test('neutral themes are distinct complete visual contracts rather than aliases', () => {
  const fingerprints = new Set(neutralThemes.map(({ tokens }) => JSON.stringify(tokens)));
  assert.equal(fingerprints.size, neutralThemeIds.length);

  for (const { id, tokens } of neutralThemes) {
    assert.equal(tokens.name, id);
    assert.ok(tokens.colors.palette.length >= 6, `${id} categorical palette`);
    assert.ok(tokens.colors.sequential.length >= 5, `${id} sequential palette`);
    assert.ok(tokens.colors.diverging.length >= 5, `${id} diverging palette`);
    assert.ok(tokens.typography.fontSize > 0, `${id} typography`);
    assert.ok(tokens.axis.lineWidth > 0, `${id} axis`);
    assert.ok(tokens.mark.lineWidth > 0, `${id} mark`);
    assert.ok(tokens.legend !== undefined, `${id} legend`);
  }
});

test('each neutral profile carries its intended visual signature', () => {
  const themes = Object.fromEntries(neutralThemes.map(({ id, tokens }) => [id, tokens]));

  assert.match(themes.editorial.typography.fontFamily, /Georgia/);
  assert.equal(themes['scientific-classic'].axis.boxVisible, true);
  assert.equal(themes['statistical-minimal'].axis.lineVisible, false);
  assert.equal(themes['dashboard-dense'].typography.fontSize, 11);
  assert.match(themes['finance-terminal'].typography.fontFamily, /Mono|monospace/);
  assert.equal(themes.observability.colors.background, '#11131a');
  assert.deepEqual(themes.geospatial.colors.sequential, [
    '#e0f2fe',
    '#7dd3fc',
    '#34d399',
    '#a3a341',
    '#7c5c3b',
  ]);
  assert.equal(themes['spatial-lab'].colors.focus, '#00e5ff');
  assert.equal(themes.presentation.typography.titleSize, 26);
  assert.equal(themes.pictorial.mark.barRadius, 8);
  assert.equal(themes['dark-technical'].axis.lineCap, 'square');
  assert.equal(themes['high-contrast'].axis.lineWidth, 2);
  assert.equal(themes['high-contrast'].motion.duration, 0);
});

test('all neutral profiles compile through the same family-independent theme path', () => {
  const data = [
    { category: 'A', value: 2 },
    { category: 'B', value: 4 },
  ];

  for (const { id, tokens } of neutralThemes) {
    const { scene } = compile({
      data,
      mark: 'bar',
      x: { field: 'category', type: 'ordinal' },
      y: { field: 'value', type: 'quantitative' },
      theme: id,
    });
    assert.equal(scene.background, tokens.colors.background, `${id} background`);
  }
});
