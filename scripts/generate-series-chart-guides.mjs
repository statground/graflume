import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { seriesChartTypeCatalog, seriesChartVariantCatalog } from '../dist/graflume.complete.js';
import { seriesSampleSpec } from './series-samples.mjs';

const outputDirectory = new URL('../docs/charts/', import.meta.url);

function dataContract(entry) {
  const contracts = {
    cartesian:
      'The primary `x` and `y` encodings locate rows. Additional quantitative channels are named in `mark.fields`, and rows with missing required coordinates are skipped.',
    distribution:
      'The primary encodings provide samples or ordered values. Distribution-specific value, band, or category fields are declared in `mark.fields`.',
    flow: 'Rows identify a source, target, and optional non-negative weight. Category order follows first appearance unless an explicit scale domain is supplied.',
    financial:
      'Time or ordered categories use `x`. Price, volume, event, and open/high/low/close channels use `y` plus the named `mark.fields` shown in the example.',
    indicator:
      'The portable chart renders precomputed indicator columns. The primary line uses `y`; optional lower, upper, signal, and secondary fields are declared in `mark.fields` or `mark.options.fields`.',
    map: 'Longitude and latitude are quantitative `x` and `y` fields. Routes add destination coordinates, and intensity or size uses a named value field.',
    radial:
      'Categories use `x`, non-negative magnitude uses `y`, and optional radius or target channels are declared in `mark.fields`.',
    relationship:
      'Node, parent, source, target, set, or weight fields are declared explicitly. Input order is stable and becomes the deterministic layout order.',
  };
  return contracts[entry.category];
}

function behavior(entry) {
  const descriptions = {
    'arc-diagram': 'Places nodes on one baseline and samples weighted quadratic arcs between them.',
    range:
      'Compiles low/high values into a band, column range, or endpoint comparison while keeping one datum reference per row.',
    smooth:
      'Samples a renderer-neutral smooth path and optionally closes it to a zero baseline for an area.',
    distribution:
      'Derives mean and sample deviation, then renders a sampled density curve and fill.',
    bullet:
      'Layers qualitative ranges, the observed bar, and a target rule on the same quantitative scale.',
    contour:
      'Colors a scalar grid and adds deterministic isoline approximations at configured levels.',
    cylinder:
      'Builds a column body with sampled top and bottom ellipses to preserve the cylindrical reading in portable primitives.',
    item: 'Allocates a bounded grid of repeated symbols in proportion to category values.',
    lollipop: 'Draws a baseline stem and emphasized endpoint for every valid row.',
    'packed-bubble':
      'Uses deterministic spiral placement with value-scaled circles and compact labels.',
    pareto:
      'Combines descending-value columns with a cumulative percentage path in one compiled Scene.',
    polygon: 'Groups ordered coordinate rows into closed, filled paths with interactive vertices.',
    pyramid: 'Builds centered trapezoid stages and optional renderer-neutral depth faces.',
    'scatter-3d':
      'Projects the third quantitative channel into position, size, depth order, and shading.',
    'solid-gauge':
      'Maps values into concentric annular sectors between configured minimum and maximum angles.',
    tilemap: 'Maps scalar rows into equal-area square, circle, diamond, or hexagonal tiles.',
    'variable-pie': 'Uses one field for sector angle and another for outer radius.',
    variwide:
      'Allocates horizontal bandwidth by a width field and vertical extent by the primary value.',
    vector:
      'Converts direction and magnitude fields into arrow shafts and heads at each coordinate.',
    venn: 'Places up to six translucent value-scaled set circles in a deterministic overlap layout.',
    'wind-barb':
      'Converts speed and direction into a shaft plus a bounded number of feather marks.',
    'word-cloud': 'Maps weight into type size and places words on a deterministic spiral.',
    indicator:
      'Renders portable precomputed indicator lines, bands, points, and oscillator columns using one canonical compiler.',
    flags: 'Anchors compact labeled flags to quantitative or temporal points.',
    financial:
      'Draws open/high/low/close ticks or bodies and supports derived Heikin-Ashi and hollow-body presentation.',
    'point-figure': 'Quantizes changes into X and O columns using a configurable box size.',
    renko: 'Quantizes price movement into fixed-size rising and falling bricks.',
    'volume-profile':
      'Bins price and aggregates volume into horizontal bars aligned to the price range.',
    'geo-flow': 'Projects route endpoints, samples curved paths, and adds directional arrowheads.',
    'geo-heatmap':
      'Projects coordinates and maps intensity into nested heat circles over a neutral geographic grid.',
    'geo-line': 'Projects route endpoints into renderer-neutral curved geographic paths.',
    map: 'Reuses the canonical geographic point compiler, including optional value-scaled bubbles.',
    'tiled-map': 'Draws a deterministic portable tile surface and projects point rows on top.',
    chord: 'Reuses the canonical weighted circular relationship compiler.',
    graph: 'Reuses the canonical deterministic network compiler.',
    org: 'Reuses the canonical parent-child organization compiler.',
    interval: 'Reuses the canonical low/high interval and central-value compiler.',
    'pictorial-bar': 'Reuses the canonical repeated-symbol bar compiler.',
    'theme-river': 'Reuses the canonical centered stacked stream compiler.',
    tree: 'Reuses the canonical parent-child tree compiler.',
    timeline: 'Reuses the canonical start/end horizontal interval compiler.',
  };
  return (
    descriptions[entry.mark] ?? 'Compiles the declared data into renderer-neutral Scene primitives.'
  );
}

function limitation(entry) {
  if (entry.mark === 'indicator') {
    return 'Indicator values are precomputed by default. `calculate: true` currently derives SMA, EMA, WMA, DEMA, TEMA, momentum, rate of change, and relative strength; the remaining named indicators deliberately render supplied columns until the transform DAG is introduced.';
  }
  if (entry.mark === 'scatter-3d' || entry.id.includes('3d') || entry.mark === 'cylinder') {
    return 'Depth is compiled into portable 2D Scene geometry. A camera, occlusion engine, lighting model, and GPU picking are not part of ChartSpec 0.1.';
  }
  if (entry.mark === 'tiled-map') {
    return 'Portable specs do not fetch arbitrary external tiles. The built-in compiler renders a deterministic tile surface; authenticated or remote tile providers belong in an explicit map plugin.';
  }
  if (entry.mark === 'venn') {
    return 'The current deterministic layout supports up to six visible set circles and does not solve exact intersection areas from overlap equations.';
  }
  if (entry.mark === 'word-cloud') {
    return 'The deterministic spiral is bounded for portability; it does not run an iterative collision solver or rotate text arbitrarily.';
  }
  if (entry.mark === 'packed-bubble') {
    return 'Packing is deterministic and bounded rather than force-simulated. Very dense datasets should use aggregation or a dedicated GPU package.';
  }
  return 'This alpha implementation covers the documented data meaning and Scene output. Domain-specific editing tools, animation choreography, and very-large-data GPU paths remain separate follow-up work.';
}

function guide(entry) {
  const variants = seriesChartVariantCatalog.filter(({ familyId }) => familyId === entry.id);
  const spec = seriesSampleSpec(entry);
  const sampleData = Array.isArray(spec.data) ? spec.data.slice(0, 5) : spec.data;
  const portable = { ...spec, data: sampleData };
  const quickOptions = {
    x: spec.x,
    y: spec.y,
    ...(typeof spec.mark === 'object'
      ? {
          mark: Object.fromEntries(Object.entries(spec.mark).filter(([key]) => key !== 'type')),
        }
      : {}),
    title: spec.title,
    accessibility: spec.accessibility,
  };
  return `# ${entry.name}

![Current ${entry.name} output](../assets/charts/${entry.id}.svg)

This page documents the currently implemented **${entry.name}** family in Graflume \`0.1.0-alpha.0\`. The image above is generated from the same compiled Scene used by the Canvas renderer.

## When to use it

Use this ${entry.category} chart when the visual relationship represented by **${entry.name.toLowerCase()}** is more informative than a plain line, bar, or table. Prefer a simpler chart when the extra geometry does not add analytical meaning.

## Quick API

Import the Quick API from the opt-in complete entrypoint:

\`\`\`ts
import { ${entry.quickApi} } from 'graflume/complete';

const data = ${JSON.stringify(sampleData, null, 2)};

${entry.quickApi}('#chart', data, ${JSON.stringify(quickOptions, null, 2)});
\`\`\`

## Portable ChartSpec

\`\`\`json
${JSON.stringify(portable, null, 2)}
\`\`\`

## Canonical mapping

- User-facing family: \`${entry.id}\`
- Quick API: \`${entry.quickApi}()\`
- Portable mark: \`${entry.mark}\`
- Canonical family: \`${entry.id}\`
- Category: \`${entry.category}\`

The family API and every compatible preset enter the same normalize, validate, scale, compiler, Scene, renderer, interaction, and accessibility path. No parallel rendering engine is created.

## Integrated presets

| Compatible name | Quick API | Mode | Portable mark |
| --- | --- | --- | --- |
${variants.map((variant) => `| ${variant.name} | \`${variant.quickApi}()\` | \`${variant.mode}\` | \`${variant.mark}\` |`).join('\n')}

## Data, ordering, and missing values

${dataContract(entry)} Input order is preserved unless the mark explicitly documents a deterministic sort. Missing required values skip only the affected row; invalid specs still fail validation before compilation.

## Implemented rendering behavior

${behavior(entry)} The output uses only groups, paths, lines, rectangles, circles, and text, so Canvas, snapshots, export adapters, and future renderers share the same geometry contract.

## Styling

Common \`fill\`, \`stroke\`, \`opacity\`, \`lineWidth\`, \`radius\`, and \`cornerRadius\` properties override theme defaults when the geometry supports them. Mark-specific function-free values live under \`mark.options\`. Themes remain responsible for background, text, grid, focus, categorical, sequential, and diverging tokens.

## Interaction and hit testing

Rendered datum shapes keep \`layerId\`, \`rowIndex\`, and the source row. Standard mode enables hit testing; large and ultra profiles may disable per-mark hit testing. Decorative grid, shadow, depth, label, and arrowhead nodes do not create duplicate datum targets.

## Accessibility

Provide a concise \`accessibility.label\` and a description of the main pattern. Canvas output should be paired with the runtime data-table fallback. Do not encode a required distinction only with color, depth, angle, or area.

## Performance

Scene cost is linear in rows for ordinary cases. Relationship crossings, repeated symbols, sampled curves, dense labels, and multi-line indicators can produce more than one node per row. Use \`auto\`, \`large\`, or \`ultra\` with aggregation when row counts grow beyond the analytical value of individual marks.

## Current limitations

${limitation(entry)}

## Runnable references

- Snapshot generator: [\`scripts/render-series-chart-snapshots.mjs\`](../../scripts/render-series-chart-snapshots.mjs)
- Catalog test: [\`tests/series-chart-types.test.mjs\`](../../tests/series-chart-types.test.mjs)
- Complete CDN gallery: [\`examples/cdn/series-chart-types.html\`](../../examples/cdn/series-chart-types.html)
`;
}

await mkdir(outputDirectory, { recursive: true });
for (const entry of seriesChartTypeCatalog) {
  await writeFile(new URL(`${entry.id}.md`, outputDirectory), guide(entry), 'utf8');
}

const indexUrl = new URL('../docs/charts/README.md', import.meta.url);
const index = await readFile(indexUrl, 'utf8');
const start = '<!-- SERIES_CATALOG_START -->';
const end = '<!-- SERIES_CATALOG_END -->';
if (!index.includes(start) || !index.includes(end)) {
  throw new Error('Chart guide index is missing the unified series catalog markers.');
}

const categories = new Map();
for (const entry of seriesChartTypeCatalog) {
  const rows = categories.get(entry.category) ?? [];
  rows.push(entry);
  categories.set(entry.category, rows);
}
const sections = [...categories.entries()]
  .map(
    ([category, entries]) => `### ${category[0].toUpperCase()}${category.slice(1)} series

| Chart | Quick API | Portable mark | Canonical family |
| --- | --- | --- | --- |
${entries.map((entry) => `| [${entry.name}](./${entry.id}.md) | \`${entry.quickApi}()\` | \`${entry.mark}\` | \`${entry.id}\` |`).join('\n')}`,
  )
  .join('\n\n');

const before = index.slice(0, index.indexOf(start) + start.length);
const after = index.slice(index.indexOf(end));
await writeFile(indexUrl, `${before}\n\n${sections}\n\n${after}`, 'utf8');

console.log(`Generated ${seriesChartTypeCatalog.length} chart guides and refreshed the index.`);
