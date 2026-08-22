import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

import { chartTypeCatalog, fullCatalog, fullVariantCatalog } from '../dist/graflume.complete.js';

const chartDirectory = new URL('../docs/charts/', import.meta.url);
const assetDirectory = new URL('../docs/assets/charts/', import.meta.url);
const prettierConfig = (await resolveConfig(fileURLToPath(chartDirectory))) ?? {};
const startMarker = '<!-- FAMILY_PRESETS_START -->';
const endMarker = '<!-- FAMILY_PRESETS_END -->';
const defaultFamilyIds = new Set(chartTypeCatalog.map(({ id }) => id));

const calculatedIndicators = new Set([
  'simple-moving-average',
  'exponential-moving-average',
  'weighted-moving-average',
  'double-exponential-average',
  'triple-exponential-average',
  'momentum',
  'rate-of-change',
  'relative-strength-index',
]);

const presetDescriptions = {
  annotation: 'The canonical annotated trend presentation.',
  'annotated-timeline': 'Uses the annotation family with the timeline compatibility name.',
  'event-flags': 'Replaces long annotation pills with compact labels anchored to events.',
  area: 'Fills an ordered series to its baseline.',
  'stepped-area': 'Uses horizontal and vertical steps instead of direct segments.',
  'theme-river': 'Centers stacked category bands around a shared baseline.',
  'area-spline': 'Uses a sampled smooth upper path with an area fill.',
  polygon: 'Closes ordered coordinates into a filled polygon.',
  streamgraph: 'Uses the centered multi-series stream presentation.',
  bar: 'Uses the canonical horizontal comparison orientation.',
  column: 'Rotates the shared bar geometry into vertical columns.',
  'pictorial-bar': 'Repeats symbols inside the shared categorical bar layout.',
  bullet: 'Adds qualitative ranges and a target rule around the observed bar.',
  'column-pyramid': 'Uses tapered vertical column bodies.',
  cylinder: 'Adds portable elliptical caps to a column body.',
  lollipop: 'Uses a baseline stem and emphasized endpoint.',
  'pictorial-column': 'Uses repeated symbols in the vertical column orientation.',
  'variable-width': 'Allocates category width from an additional quantitative field.',
  bubble: 'Positions magnitude-scaled circles on coordinates.',
  'packed-bubble': 'Uses deterministic collision-aware packing instead of axes.',
  candlestick: 'Uses conventional open-high-low-close bodies and wicks.',
  'heikin-ashi': 'Uses derived Heikin-Ashi open and close values.',
  'high-low-close': 'Shows high-low stems plus the close tick without an open tick.',
  'hollow-candlestick': 'Uses hollow and filled bodies to distinguish direction.',
  'open-high-low-close': 'Shows open and close ticks on a high-low stem.',
  combo: 'Layers compatible marks on shared scales.',
  pareto: 'Combines descending columns with a cumulative percentage path.',
  diff: 'Overlays old and new values with a signed connector.',
  donut: 'Adds an inner radius and center summary to the pie geometry.',
  pie: 'Uses equal-radius sectors for part-to-whole comparison.',
  'variable-pie': 'Uses a second value to vary each sector radius.',
  gantt: 'Adds task intervals, progress, and dependency fields.',
  timeline: 'Uses dated events or intervals on an ordered time axis.',
  'x-range': 'Uses horizontal start/end intervals per category.',
  gauge: 'Uses a dial, reference ticks, and needle.',
  'solid-gauge': 'Uses concentric filled arcs without a needle.',
  geo: 'Maps named regions through the built-in geographic reference data.',
  map: 'Projects longitude and latitude point rows.',
  'flow-map': 'Adds weighted directional routes between map coordinates.',
  'geo-heatmap': 'Maps geographic intensity into nested heat circles.',
  'map-bubble': 'Scales projected point radius by value.',
  'map-line': 'Draws curved geographic routes without flow weighting.',
  'map-point': 'Uses fixed-size projected point markers.',
  'tiled-map': 'Adds a deterministic local tile surface under projected rows.',
  histogram: 'Bins samples into counts.',
  'bell-curve': 'Derives and overlays a sampled normal-density curve.',
  intervals: 'Uses a central point with low/high stems and caps.',
  'area-range': 'Fills the band between low and high values.',
  'area-spline-range': 'Smooths both edges of a low/high band.',
  'column-range': 'Uses one floating vertical column per low/high pair.',
  dumbbell: 'Connects two endpoints and emphasizes both values.',
  'error-bar': 'Uses a low/high stem and compact caps around an estimate.',
  line: 'Uses direct ordered line segments.',
  trendline: 'Derives a regression trend from the coordinate rows.',
  spline: 'Uses a sampled smooth path.',
  org: 'Uses a compact organization-card layout.',
  treemap: 'Allocates nested rectangles by hierarchy value.',
  tree: 'Uses a parent-child node-link tree layout.',
  sunburst: 'Uses radial hierarchy partitions.',
  'organization-network': 'Uses organization semantics with relationship styling.',
  'tree-graph': 'Uses the hierarchy data contract with graph-like connectors.',
  sankey: 'Uses proportional nodes and weighted flow bands.',
  scatter: 'Uses ordinary coordinate points.',
  'effect-scatter': 'Adds a portable emphasis halo to selected points.',
  'scatter-3d': 'Projects a third channel into portable 2D depth cues.',
  graph: 'Uses the deterministic node-link layout.',
  lines: 'Shows direct source-to-target connection paths.',
  'arc-diagram': 'Places nodes on one baseline and draws arcs between them.',
  'network-graph': 'Keeps the legacy network graph name for node-link mode.',
  chord: 'Uses circular weighted relationship bands.',
  'dependency-wheel': 'Uses chord geometry with dependency-oriented naming.',
  funnel: 'Uses decreasing centered stages.',
  'funnel-3d': 'Adds portable depth faces to funnel stages.',
  pyramid: 'Reverses the stage emphasis into a pyramid presentation.',
  'pyramid-3d': 'Adds portable depth faces to pyramid stages.',
  heatmap: 'Uses a rectangular value matrix.',
  'tile-map': 'Uses equal-area square, circle, diamond, or hexagonal tiles.',
  vector: 'Draws direction and magnitude as arrow shafts and heads.',
  'wind-barb': 'Converts speed and direction into meteorological barb feathers.',
  'point-and-figure': 'Quantizes price changes into X and O columns.',
  renko: 'Quantizes price movement into fixed-size rising and falling bricks.',
  'volume-by-price': 'Bins price and aggregates volume into horizontal profile bars.',
  vega: 'Translates the supported function-free embedded mark subset.',
  custom: 'Builds row-level declarative primitives without executable callbacks.',
};

function tableText(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function presetDescription(variant) {
  const description = presetDescriptions[variant.id];
  if (description !== undefined) return description;
  if (variant.familyId === 'technical-indicator') {
    const calculation = calculatedIndicators.has(variant.id)
      ? 'supports supplied values and the current `calculate: true` transform'
      : 'uses supplied indicator columns in the current release';
    return `Selects ${variant.name.toLowerCase()} semantics and ${calculation}.`;
  }
  if (variant.mode === 'default') return 'Uses the canonical presentation for this family.';
  return `Selects the \`${variant.mode}\` presentation through the shared family pipeline.`;
}

function removeGeneratedBlock(source) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start !== -1 && end !== -1 && end > start) {
    return `${source.slice(0, start)}${source.slice(end + endMarker.length)}`;
  }
  return source;
}

function removeLegacyPresetSection(source) {
  return source.replace(/\n## Integrated presets\n[\s\S]*?(?=\n## |\s*$)/, '\n');
}

function insertAfterTitle(source, block) {
  const titleEnd = source.indexOf('\n');
  if (titleEnd === -1 || !source.startsWith('# ')) {
    throw new Error('Canonical chart guide must start with one level-one heading.');
  }
  return `${source.slice(0, titleEnd + 1)}\n${block}\n${source.slice(titleEnd + 1).trimStart()}`;
}

function gallery(family, variants, assetNames) {
  const available = variants
    .map((variant) => ({
      ...variant,
      assetId: assetNames.has(`${variant.id}.svg`)
        ? variant.id
        : assetNames.has(`${family.id}.svg`)
          ? family.id
          : undefined,
    }))
    .filter(({ assetId }) => assetId !== undefined);
  if (available.length === 0) return '';
  const rows = available
    .map(
      (variant) =>
        `| ${tableText(variant.name)} | [![Current ${tableText(variant.name)} output](../assets/charts/${variant.assetId}.svg)](../assets/charts/${variant.assetId}.svg) |`,
    )
    .join('\n');
  return `

<details>
<summary>Open ${available.length} compiled preset snapshot${available.length === 1 ? '' : 's'}</summary>

| Preset | Current compiled output |
| --- | --- |
${rows}

</details>`;
}

function familyBlock(family, variants, assetNames) {
  const entrypoint = defaultFamilyIds.has(family.id) ? '`graflume`' : '`graflume/complete`';
  const rows = variants
    .map(
      (variant) =>
        `| ${tableText(variant.name)} | \`${variant.quickApi}()\` | \`${variant.mode}\` | \`${variant.mark}\` | ${tableText(presetDescription(variant))} |`,
    )
    .join('\n');
  return `${startMarker}
## Integrated presets

This is the single manual for the \`${family.id}\` family. Its canonical Quick API is \`${family.quickApi}()\` from ${entrypoint}, and its representative portable mark is \`${family.mark}\`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name | Quick API | Mode | Portable mark | Functional difference |
| --- | --- | --- | --- | --- |
${rows}

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining sections describe the canonical/default presentation unless a preset row above states a different behavior.${gallery(family, variants, assetNames)}
${endMarker}`;
}

function compatibilityIndex() {
  const sections = fullCatalog
    .map((family) => {
      const variants = fullVariantCatalog.filter(({ familyId }) => familyId === family.id);
      const rows = variants
        .map(
          (variant) =>
            `| \`${variant.id}\` | ${tableText(variant.name)} | \`${variant.quickApi}()\` | \`${variant.mode}\` | \`${variant.mark}\` |`,
        )
        .join('\n');
      return `## [${family.name}](./${family.id}.md#integrated-presets)

| Identifier | Compatible name | Quick API | Mode | Portable mark |
| --- | --- | --- | --- | --- |
${rows}`;
    })
    .join('\n\n');
  return `# Compatibility preset index

Graflume exposes 37 representative chart families while preserving all historical names. This index maps the ${fullVariantCatalog.filter(({ familyId }) => familyId !== 'custom').length} family presets to the one manual that documents their data contract, functional differences, and current compiled output.

Use \`resolveSeriesType(identifier)\` from \`graflume/complete\` when an integration receives names with mixed case, spaces, hyphens, or underscores. The returned \`familyId\` selects the representative manual and \`variantId\` preserves the requested preset.

The two function-free adapter names are documented separately in [Adapters](./adapters.md).

${sections}

[Back to chart guides](./README.md)
`;
}

function adapterGuide() {
  const adapters = fullVariantCatalog.filter(({ familyId }) => familyId === 'custom');
  const rows = adapters
    .map(
      (variant) =>
        `| ${tableText(variant.name)} | \`${variant.quickApi}()\` | \`${variant.mark}\` | ${tableText(presetDescription(variant))} |`,
    )
    .join('\n');
  return `# Declarative adapters

Adapters translate a constrained external or custom declarative shape into Graflume's portable specification. They are compatibility surfaces, not additional chart families, so they do not appear in the 37-family discovery catalog.

| Adapter | Quick API | Portable mark | Contract |
| --- | --- | --- | --- |
${rows}

Both adapters reject executable callbacks and enter the ordinary validation, Scene compilation, rendering, interaction, and accessibility pipeline. Prefer a representative family Quick API when the data meaning already matches one of the [37 chart families](./README.md#choose-a-chart).

## Embedded mark adapter

\`vegaChart()\` accepts the documented safe mark subset under \`mark.options.mark\`. It is intended for migration of function-free line, area, bar, or point declarations; arbitrary transforms, expressions, signals, and remote loading are outside the portable contract.

## Declarative primitive adapter

\`custom()\` maps row fields such as shape, size, and label to built-in portable primitives. It does not execute a per-row rendering function or permit raw HTML.

## Verification

- Compiled snapshots: [embedded mark](../assets/charts/vega.svg) and [declarative primitives](../assets/charts/custom.svg)
- Runtime catalog: [\`src/catalog\`](../../src/catalog)
- Catalog tests: [\`tests\`](../../tests)

[Back to chart guides](./README.md)
`;
}

const assetNames = new Set(await readdir(assetDirectory));
for (const family of fullCatalog) {
  const url = new URL(`${family.id}.md`, chartDirectory);
  let source = await readFile(url, 'utf8');
  source = removeLegacyPresetSection(removeGeneratedBlock(source));
  source = source
    .replaceAll('[31-type standalone CDN gallery]', '[default-family CDN gallery]')
    .replaceAll('[31-type complete chart gallery]', '[default-family chart gallery]');
  const variants = fullVariantCatalog.filter(({ familyId }) => family.id === familyId);
  source = insertAfterTitle(source, familyBlock(family, variants, assetNames));
  await writeFile(url, await format(source, { ...prettierConfig, parser: 'markdown' }), 'utf8');
}

await writeFile(
  new URL('compatibility-presets.md', chartDirectory),
  await format(compatibilityIndex(), { ...prettierConfig, parser: 'markdown' }),
  'utf8',
);
await writeFile(
  new URL('adapters.md', chartDirectory),
  await format(adapterGuide(), { ...prettierConfig, parser: 'markdown' }),
  'utf8',
);

const retainedFiles = new Set([
  'README.md',
  'adapters.md',
  'compatibility-presets.md',
  ...fullCatalog.map(({ id }) => `${id}.md`),
]);
const chartFiles = await readdir(chartDirectory);
const removedFiles = [];
for (const filename of chartFiles) {
  if (!filename.endsWith('.md') || retainedFiles.has(filename)) continue;
  await unlink(new URL(filename, chartDirectory));
  removedFiles.push(filename);
}

console.log(
  `Consolidated ${fullVariantCatalog.length} compatible names into ${fullCatalog.length} family manuals and removed ${removedFiles.length} legacy manuals.`,
);
