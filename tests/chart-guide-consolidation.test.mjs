import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';

import { compile, fullCatalog, fullVariantCatalog } from '../.tmp/src/complete.js';
import { seriesSampleSpec } from '../scripts/series-samples.mjs';

const chartDirectory = new URL('../docs/charts/', import.meta.url);
const assetDirectory = new URL('../docs/assets/charts/', import.meta.url);
const startMarker = '<!-- FAMILY_PRESETS_START -->';
const endMarker = '<!-- FAMILY_PRESETS_END -->';
const compatibilityGuideStubs = {
  'boxplot.md': './distribution.md#variant-boxplot',
  'histogram.md': './distribution.md#variant-histogram',
  'radar.md': './polar.md#variant-radar',
};
const axisTooltipFamilies = new Map([
  ['annotation', 'x'],
  ['area', 'x'],
  ['bar', 'x'],
  ['candlestick', 'x'],
  ['combination', 'x'],
  ['difference', 'x'],
  ['distribution', 'x'],
  ['interval', 'x'],
  ['line', 'x'],
  ['technical-indicator', 'x'],
  ['timeline', 'y'],
  ['volume-profile', 'y'],
  ['waterfall', 'x'],
]);

function generatedBlock(source) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  assert.notEqual(start, -1, 'family guide has a generated preset start marker');
  assert.ok(end > start, 'family guide has an ordered preset end marker');
  assert.equal(source.indexOf(startMarker, start + 1), -1, 'family guide has one preset block');
  return source.slice(start, end + endMarker.length);
}

test('chart documentation contains one manual per representative family', async () => {
  const expected = [
    'README.md',
    'adapters.md',
    'axes.md',
    'compatibility-presets.md',
    'interactions.md',
    'themes.md',
    ...Object.keys(compatibilityGuideStubs),
    ...fullCatalog.map(({ id }) => `${id}.md`),
  ].sort();
  const actual = (await readdir(chartDirectory)).filter((name) => name.endsWith('.md')).sort();

  assert.equal(fullCatalog.length, 41);
  assert.equal(fullVariantCatalog.length, 162);
  assert.deepEqual(actual, expected);
});

test('legacy family URLs remain as compatibility stubs linked to canonical manuals', async () => {
  for (const [filename, target] of Object.entries(compatibilityGuideStubs)) {
    const source = await readFile(new URL(filename, chartDirectory), 'utf8');
    assert.ok(source.includes(`](${target})`), `${filename} links to ${target}`);
  }
});

test('every compatible preset is integrated into its family manual', async () => {
  const assetNames = new Set(await readdir(assetDirectory));
  for (const family of fullCatalog) {
    const source = await readFile(new URL(`${family.id}.md`, chartDirectory), 'utf8');
    const block = generatedBlock(source);
    const variants = fullVariantCatalog.filter(({ familyId }) => familyId === family.id);

    assert.match(block, /## Integrated presets/);
    assert.match(block, /## Visual gallery/);
    assert.match(block, /## Type-by-type implementation/);
    assert.ok(
      block.includes(
        '[inspection viewport, fullscreen, reset, and PNG controls](./interactions.md)',
      ),
      `${family.id} links the common interaction contract`,
    );
    assert.doesNotMatch(block, /<details>/, 'compiled outputs remain visible without expansion');
    assert.ok(block.includes(`canonical Quick API is \`${family.quickApi}()\``));
    for (const variant of variants) {
      const assetId = assetNames.has(`${variant.id}.svg`) ? variant.id : family.id;
      assert.ok(
        block.includes(`\`${variant.quickApi}()\``),
        `${variant.id} Quick API is documented`,
      );
      assert.ok(block.includes(`\`${variant.mode}\``), `${variant.id} mode is documented`);
      assert.ok(block.includes(`\`${variant.mark}\``), `${variant.id} mark is documented`);
      assert.ok(
        block.includes(`../assets/charts/${assetId}.svg`),
        `${variant.id} compiled output is embedded`,
      );
      assert.ok(
        block.includes(`<a id="variant-${variant.id}"></a>`),
        `${variant.id} has a stable implementation anchor`,
      );
      assert.ok(
        block.includes(`${variant.quickApi}('#chart', data,`),
        `${variant.id} has a runnable Quick API example`,
      );
      assert.ok(
        block.includes('**Required example fields:**'),
        `${variant.id} documents its example fields`,
      );
      await access(new URL(`${assetId}.svg`, assetDirectory));
    }
    assert.equal(
      block.match(/\btooltip: \{/g)?.length ?? 0,
      variants.length,
      `${family.id} gives every Quick API example an explicit tooltip`,
    );
    assert.equal(
      block.match(/\blocale: 'en-US'/g)?.length ?? 0,
      variants.length,
      `${family.id} gives every tooltip a deterministic formatting locale`,
    );
    const tooltipAxis = axisTooltipFamilies.get(family.id);
    assert.equal(
      block.match(new RegExp(`\\btrigger: '${tooltipAxis === undefined ? 'mark' : 'axis'}'`, 'g'))
        ?.length ?? 0,
      variants.length,
      `${family.id} uses its approved tooltip trigger`,
    );
    const axisTooltipDeclarations =
      block.match(/\btrigger: 'axis',\n\s+axis: '[xy]'/g)?.length ?? 0;
    assert.equal(
      axisTooltipDeclarations,
      tooltipAxis === undefined ? 0 : variants.length,
      `${family.id} only declares an axis for axis-triggered tooltips`,
    );
    if (tooltipAxis !== undefined) {
      assert.equal(
        block.match(new RegExp(`\\btrigger: 'axis',\\n\\s+axis: '${tooltipAxis}'`, 'g'))?.length ??
          0,
        variants.length,
        `${family.id} uses its approved ${tooltipAxis}-axis`,
      );
    }
  }
});

test('parallel categories guide keeps every categorical dimension in its runnable rows', async () => {
  const source = await readFile(new URL('parallel.md', chartDirectory), 'utf8');
  const block = generatedBlock(source);
  const section = block.slice(block.indexOf('<a id="variant-parallel-categories"></a>'));

  assert.match(section, /\*\*Required example fields:\*\* `region`, `value`, `channel`, `outcome`/);
  assert.match(section, /channel: 'Web'/);
  assert.match(section, /outcome: 'Won'/);
  assert.match(
    section,
    /categorical stages and the frequency of each complete path must be compared/,
  );
});

test('common interaction guide covers the complete family catalog and semantic playback limits', async () => {
  const source = await readFile(new URL('interactions.md', chartDirectory), 'utf8');

  for (const family of fullCatalog) {
    assert.ok(source.includes(`](./${family.id}.md)`), `${family.id} has a capability row`);
  }
  for (const term of [
    'inspection viewport, not data zoom',
    '`frame`, `cumulative`, `window`',
    'first occurrence',
    'stable scalar entity',
    'safe crossfade',
    'hover/click hits report `null`',
    'Do not generic-filter for time flow',
    'Renko and Point & Figure are path-dependent',
    'Removing rows recomputes price bins and volume totals',
    'calculated indicators need full warm-up history',
  ]) {
    assert.ok(
      source.toLowerCase().includes(term.toLowerCase()),
      `interaction guide covers ${term}`,
    );
  }
});

test('compatibility index maps all names and keeps adapters separate', async () => {
  const index = await readFile(new URL('compatibility-presets.md', chartDirectory), 'utf8');
  const adapters = await readFile(new URL('adapters.md', chartDirectory), 'utf8');

  for (const variant of fullVariantCatalog) {
    if (variant.familyId === 'custom') {
      assert.ok(adapters.includes(`\`${variant.quickApi}()\``));
      assert.ok(adapters.includes(`<a id="variant-${variant.id}"></a>`));
      assert.ok(adapters.includes(`${variant.quickApi}('#chart', data,`));
      assert.ok(adapters.includes(`../assets/charts/${variant.id}.svg`));
      assert.ok(!index.includes(`| \`${variant.id}\` |`));
      continue;
    }
    assert.ok(index.includes(`\`${variant.id}\``), `${variant.id} is in the compatibility index`);
    assert.ok(
      index.includes(`./${variant.familyId}.md#integrated-presets`),
      `${variant.id} points to its family manual`,
    );
    assert.ok(
      index.includes(`./${variant.familyId}.md#variant-${variant.id}`),
      `${variant.id} points directly to its implementation example`,
    );
  }
});

test('aggregate and relationship examples document their derived hover semantics', async () => {
  const expectations = {
    'distribution.md': ['binStart', 'binEnd', 'count', 'proportion'],
    'volume-profile.md': ['priceStart', 'priceEnd', 'volume', 'proportion'],
    'price-blocks.md': ['brickStart', 'brickEnd', 'brickSize'],
    'network.md': ['node', 'degree', 'total', 'source', 'target', 'value'],
    'chord.md': ['node', 'total', 'source', 'target', 'value'],
  };

  for (const [filename, fields] of Object.entries(expectations)) {
    const source = await readFile(new URL(filename, chartDirectory), 'utf8');
    for (const field of fields) {
      assert.ok(source.includes(`field: '${field}'`), `${filename} documents ${field}`);
    }
  }
});

test('every documented type example compiles through the shared Scene pipeline', () => {
  for (const variant of fullVariantCatalog) {
    const { scene } = compile(seriesSampleSpec(variant), { width: 640, height: 400 });
    assert.ok(scene.metadata.renderedNodeCount > 3, `${variant.id} example renders Scene nodes`);
  }
});

test('the ggplot theme compiles every documented Canvas preset', () => {
  for (const variant of fullVariantCatalog) {
    const { scene, theme } = compile(
      { ...seriesSampleSpec(variant), theme: 'ggplot' },
      { width: 640, height: 400 },
    );
    assert.equal(theme.name, 'ggplot', `${variant.id} resolves the built-in theme`);
    assert.ok(scene.metadata.renderedNodeCount > 3, `${variant.id} renders themed Scene nodes`);
    assert.equal(
      scene.background.toLowerCase(),
      '#ffffff',
      `${variant.id} keeps the ggplot plot background`,
    );
  }
});
