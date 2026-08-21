import { mkdir, writeFile } from 'node:fs/promises';
const format = await import('prettier')
  .then((module) => module.format)
  .catch(() => async (source) => source);

const directory = new URL('../docs/charts/', import.meta.url);

const guides = [
  {
    id: 'radar',
    title: 'Radar charts',
    api: 'radar',
    mark: 'radar',
    use: 'Use a radar chart to compare several normalized indicators across a small number of series.',
    contract:
      '`x` names the indicator, `y` supplies its numeric value, and `mark.fields.series` identifies the series. At least three distinct indicators are required.',
    fields:
      '`series` groups rows into polygons. The primary `x` and `y` encodings supply indicator and value.',
    options:
      '`max` fixes the radial maximum and `rings` controls 1–8 reference polygons. Without `max`, the compiler derives a positive maximum from the data.',
    behavior:
      'The compiler creates renderer-neutral polygon grids, radial axes, labels, translucent series areas, outlines, and interactive data points. Each series follows the first-seen indicator order.',
    example: `import { radar } from 'graflume/complete';

radar('#chart', data, {
  x: { field: 'indicator', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { series: 'series' }, options: { max: 100, rings: 5 } },
});`,
    access:
      'Each visible point carries its original row for hover and click hit testing. Provide an accessibility label and a textual table fallback when exact multi-axis comparison matters.',
    performance:
      'Scene size grows with indicators × series. Keep the number of axes and polygons modest; dense radar overlays become difficult to read before rendering cost becomes the main constraint.',
    limits:
      'Axis-specific maxima, negative radial domains, built-in legends, polygon-label collision solving, and drag editing are not implemented yet.',
  },
  {
    id: 'tree',
    title: 'Tree charts',
    api: 'tree',
    mark: 'tree',
    use: 'Use a tree chart for an explicit parent-child hierarchy such as components, ownership, or taxonomy.',
    contract:
      '`x` supplies the node id. `mark.fields.parent` names the parent id, while optional `id`, `label`, and `value` fields override the defaults.',
    fields:
      '`id` defaults to `x`; `parent` defaults to `y`; `label` defaults to the node id; and `value` may supply a numeric weight.',
    options:
      '`orientation` accepts `vertical` or `horizontal`. Layout is deterministic and preserves first-seen node order within each depth.',
    behavior:
      'The compiler resolves hierarchy depths, positions every level, draws elbow connectors, and renders theme-aware interactive node cards. Cycles are safely treated as roots instead of recursing indefinitely.',
    example: `import { tree } from 'graflume/complete';

tree('#chart', data, {
  x: { field: 'id', type: 'nominal' },
  y: { field: 'weight', type: 'quantitative' },
  mark: { fields: { parent: 'parent', label: 'name' }, options: { orientation: 'vertical' } },
});`,
    access:
      'Node cards retain row-level interaction metadata. Add a description that explains the root and major branches, and expose the source rows as a nested list or table for keyboard and screen-reader use.',
    performance:
      'The alpha layout is intended for tens to low hundreds of nodes. Large/deep trees should use progressive disclosure or a dedicated hierarchy package.',
    limits:
      'Tidy-tree optimization, collapsed branches, zoom, edge routing around cards, subtree ordering, and editable hierarchy interactions remain planned.',
  },
  {
    id: 'graph',
    title: 'Graph charts',
    api: 'graph',
    mark: 'graph',
    use: 'Use a graph chart for a general network of nodes and directed weighted relationships.',
    contract:
      '`x` defaults to the source id. `mark.fields.target` identifies the target id; optional `source`, `id`, `label`, and `value` fields refine the network contract.',
    fields:
      '`source` and `target` define edges. `value` controls edge weight and contributes to node size. Explicit node rows may use `id` and `label`.',
    options:
      'The current circular layout is deterministic and has no required options. Mark stroke, fill, opacity, line width, and radius participate in normal style resolution.',
    behavior:
      'Unique source and target ids become nodes arranged around a circle. Weighted paths connect them, and interactive circles carry representative source rows.',
    example: `import { graph } from 'graflume/complete';

graph('#chart', links, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { target: 'target', value: 'value' } },
});`,
    access:
      'Visual nodes are interactive, but network structure should also be summarized as an adjacency table or edge list. A concise description should identify the most connected nodes.',
    performance:
      'The current scene and circular placement are suitable for small networks. Dense edge sets grow quadratically in visual clutter and should move to a WebGL-backed graph package later.',
    limits:
      'Force simulation, clustering, curved parallel edges, arrowheads, pan/zoom, selection propagation, and large-network spatial indexing are not implemented yet.',
  },
  {
    id: 'chord',
    title: 'Chord diagrams',
    api: 'chord',
    mark: 'chord',
    use: 'Use a chord diagram for weighted flows among a limited set of categories when circular symmetry is useful.',
    contract:
      '`x` defaults to source, `mark.fields.target` names the target, and `y` or `mark.fields.value` supplies a non-negative weight.',
    fields:
      '`source`, `target`, and `value` form the flow table. Category order follows first appearance.',
    options:
      'The current layout derives group arc lengths from incident totals. Standard mark colors, stroke, opacity, and line width remain available.',
    behavior:
      'The compiler aggregates category totals, allocates annular group sectors, labels them, and draws renderer-neutral weighted connection bands between source and target midpoints.',
    example: `import { chord } from 'graflume/complete';

chord('#chart', flows, {
  x: { field: 'source', type: 'nominal' },
  y: { field: 'amount', type: 'quantitative' },
  mark: { fields: { target: 'target', value: 'amount' } },
});`,
    access:
      'Group sectors and connection bands preserve datum metadata where available. Include an ordered flow table because thickness and crossings are not sufficient for precise non-visual reading.',
    performance:
      'Keep category counts small. This alpha compiler favors deterministic scene portability over iterative crossing minimization.',
    limits:
      'Subgroup arc allocation, directed arrow treatment, crossing minimization, ribbon tooltips, selection dimming, and label collision solving remain planned.',
  },
  {
    id: 'funnel',
    title: 'Funnel charts',
    api: 'funnel',
    mark: 'funnel',
    use: 'Use a funnel chart to show ordered stage attrition such as visits, trials, purchases, and renewals.',
    contract:
      '`x` supplies the stage label and `y` supplies a non-negative value. Rows are sorted descending by default.',
    fields: 'No additional fields are required; the primary encodings define each stage.',
    options:
      '`sort: false` preserves input order. Normal mark fill, stroke, opacity, and line width options apply to the stage polygons.',
    behavior:
      'Each row becomes a centered trapezoid whose width is proportional to the largest value. Labels and rounded values are drawn inside sufficiently wide stages.',
    example: `import { funnel } from 'graflume/complete';

funnel('#chart', stages, {
  x: { field: 'stage', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { sort: true } },
});`,
    access:
      'Every stage polygon retains its source row. Include stage values and conversion rates in a table or description rather than relying only on width.',
    performance:
      'Funnel charts are cheap to render and intended for a small ordered sequence. Long stage lists should use bars instead.',
    limits:
      'Automatic conversion percentages, two-sided funnels, compare mode, label overflow handling, and editable stage order are not implemented yet.',
  },
  {
    id: 'parallel',
    title: 'Parallel coordinates',
    api: 'parallel',
    mark: 'parallel',
    use: 'Use parallel coordinates to inspect multivariate profiles across several quantitative dimensions.',
    contract:
      '`mark.options.dimensions` is an array of two or more numeric field names. `x` normally identifies the row or series, while `y` may repeat the first numeric dimension.',
    fields:
      '`mark.fields.color` or `group` may provide a categorical palette key. Dimensions are declared in `mark.options.dimensions` because their count is dynamic.',
    options:
      '`dimensions` controls axis order. Each dimension receives an independent finite min/max domain derived from its column.',
    behavior:
      'The compiler draws one vertical axis per dimension with min/max labels, then maps every valid row to an interactive polyline crossing those axes.',
    example: `import { parallel } from 'graflume/complete';

parallel('#chart', products, {
  x: { field: 'product', type: 'nominal' },
  y: { field: 'speed', type: 'quantitative' },
  mark: { options: { dimensions: ['speed', 'quality', 'cost', 'reach'] } },
});`,
    access:
      'Each polyline carries a source row. Provide a data table and a description of the strongest trade-offs; exact values are hard to recover visually.',
    performance:
      'Polyline count equals row count. Large data should use sampling, opacity reduction, density aggregation, or a future GPU renderer.',
    limits:
      'Axis brushing, reordering, inversion, categorical dimensions, bundled polylines, density mode, and built-in legends are not implemented yet.',
  },
  {
    id: 'boxplot',
    title: 'Boxplots',
    api: 'boxplot',
    mark: 'boxplot',
    use: 'Use a boxplot to compare five-number summaries across categories.',
    contract:
      '`x` supplies category and the named fields supply `min`, `q1`, `median`, `q3`, and `max`. `y` normally points to the median.',
    fields:
      '`min`, `q1`, `median`, `q3`, and `max` default to fields with those names except median, which defaults to `y`.',
    options:
      'Standard mark style properties control the box, whisker, median line, and category palette.',
    behavior:
      'The y domain includes all five summary fields. Each valid row becomes whiskers, caps, an interactive quartile box, and a contrasting median line.',
    example: `import { boxplot } from 'graflume/complete';

boxplot('#chart', summaries, {
  x: { field: 'group', type: 'nominal' },
  y: { field: 'median', type: 'quantitative' },
  mark: { fields: { min: 'min', q1: 'q1', median: 'median', q3: 'q3', max: 'max' } },
});`,
    access:
      'The quartile box carries the complete source row. Make all five statistics available in a table and mention the median and spread in the chart description.',
    performance:
      'Scene cost is linear in categories. Hundreds of boxes remain feasible, but labels and category bandwidth become the practical limit.',
    limits:
      'Raw-sample quartile calculation, notches, variable widths, outlier points, violin overlays, and horizontal orientation remain planned.',
  },
  {
    id: 'effect-scatter',
    title: 'Effect scatter charts',
    api: 'effectScatter',
    mark: 'effect-scatter',
    use: 'Use an effect scatter chart to emphasize a few quantitative observations with quiet concentric rings.',
    contract:
      '`x` and `y` are quantitative positions. Optional `mark.fields.size` scales the primary circle and emphasis rings.',
    fields: '`size` supplies a numeric magnitude. Without it, the standard mark radius is used.',
    options:
      '`rings` controls 1–4 emphasis rings. Standard point fill, stroke, opacity, radius, and line width options apply.',
    behavior:
      'Every valid row becomes an interactive foreground circle plus non-interactive translucent rings. The output is static and respects reduced-motion expectations.',
    example: `import { effectScatter } from 'graflume/complete';

effectScatter('#chart', data, {
  x: { field: 'reach', type: 'quantitative' },
  y: { field: 'impact', type: 'quantitative' },
  mark: { fields: { size: 'priority' }, options: { rings: 2 } },
});`,
    access:
      'Only the foreground point is a hit target, so decorative rings do not create duplicate focus targets. Include the highlighted reason in labels or supporting text.',
    performance:
      'Each row creates one point plus several rings. Limit this style to noteworthy observations rather than using it for very large scatter data.',
    limits:
      'Animated ripple propagation is intentionally absent from the portable scene. Label placement, clustering, and collision handling remain planned.',
  },
  {
    id: 'lines',
    title: 'Connection lines',
    api: 'lines',
    mark: 'lines',
    use: 'Use connection lines to draw explicit paths from one quantitative coordinate pair to another.',
    contract:
      '`x`/`y` define the start point and `mark.fields.x2`/`y2` define the end point. Optional `value` controls visual weight.',
    fields:
      '`x2` and `y2` default to fields with those names. `value` may provide a numeric weight for line width.',
    options:
      '`curvature` ranges from -1 to 1 and bends the sampled path around its midpoint. Standard stroke, opacity, and line width options apply.',
    behavior:
      'The domain includes both endpoints. Each row compiles to a sampled renderer-neutral path plus a destination marker, retaining the original row for hit testing.',
    example: `import { lines } from 'graflume/complete';

lines('#chart', routes, {
  x: { field: 'x1', type: 'quantitative' },
  y: { field: 'y1', type: 'quantitative' },
  mark: { fields: { x2: 'x2', y2: 'y2', value: 'volume' }, options: { curvature: 0.2 } },
});`,
    access:
      'Paths and endpoint markers should be accompanied by a route table. Avoid encoding direction solely through geometry because arrowheads are not yet part of this mark.',
    performance:
      'Curved paths are sampled into scene points. Large route sets should use aggregation, bundling, or a future GPU path renderer.',
    limits:
      'Geographic projection, arrowheads, progressive animation, edge bundling, obstacle routing, and path labels are not implemented yet.',
  },
  {
    id: 'heatmap',
    title: 'Heatmaps',
    api: 'heatmap',
    mark: 'heatmap',
    use: 'Use a heatmap to show intensity across two categorical dimensions.',
    contract:
      '`x` and `y` identify categorical cells. `mark.fields.value` or the primary `y` field supplies the numeric intensity; using a distinct value field is recommended.',
    fields:
      '`value` defaults to a field named `value`. The first-seen x and y categories determine cell order.',
    options:
      '`labels: false` hides in-cell values. Sequential colors are interpolated from the active theme and text contrast is chosen automatically.',
    behavior:
      'The compiler creates a band cell for each valid row, normalizes values across the observed extent, and emits interactive rounded rectangles with optional labels.',
    example: `import { heatmap } from 'graflume/complete';

heatmap('#chart', cells, {
  x: { field: 'day', type: 'ordinal' },
  y: { field: 'period', type: 'ordinal' },
  mark: { fields: { value: 'activity' }, options: { labels: true } },
});`,
    access:
      'Each cell retains its source row and has contrast-aware text when large enough. Provide a table fallback and describe the scale direction and strongest cells.',
    performance:
      'Scene cost is linear in populated cells. Very dense matrices should use tiled aggregation and a WebGL renderer package.',
    limits:
      'Missing-cell patterns, continuous axes, clustered ordering, dendrograms, color legends, and tile-level LOD are not implemented yet.',
  },
  {
    id: 'pictorial-bar',
    title: 'Pictorial bar charts',
    api: 'pictorialBar',
    mark: 'pictorial-bar',
    use: 'Use a pictorial bar when repeated simple symbols communicate count more effectively than a solid rectangle.',
    contract:
      '`x` supplies category and `y` supplies a quantitative value. Values are converted into repeated symbols from a zero baseline.',
    fields: 'No additional fields are required.',
    options:
      '`symbol` accepts the supported renderer-neutral symbol names, `unit` controls value per symbol, and `maxSymbols` clamps the repeated count to 2–40.',
    behavior:
      'The compiler derives a portable symbol grid for each category. Symbols are interactive and preserve the category row without using image assets or external fonts.',
    example: `import { pictorialBar } from 'graflume/complete';

pictorialBar('#chart', data, {
  x: { field: 'category', type: 'ordinal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { symbol: 'diamond', unit: 5, maxSymbols: 12 } },
});`,
    access:
      'Repeated symbols are decorative instances of one datum. A text table should provide the exact value and unit so users do not need to count glyphs.',
    performance:
      'The explicit symbol cap prevents unbounded scene growth. Solid bars are preferable when categories or values are numerous.',
    limits:
      'Arbitrary SVG paths, image symbols, partial-symbol clipping, horizontal orientation, stacks, and animation are not implemented yet.',
  },
  {
    id: 'theme-river',
    title: 'Theme river charts',
    api: 'themeRiver',
    mark: 'theme-river',
    use: 'Use a theme river chart to compare how several non-negative series expand and contract over time.',
    contract:
      '`x` is temporal or ordered, `y` is a non-negative magnitude, and `mark.fields.series` or `category` identifies the stream.',
    fields: '`series` is preferred; `category` is accepted as a compatibility alias.',
    options: 'Standard fill, stroke, opacity, and line width options apply to each stream.',
    behavior:
      'Rows are grouped by x and series, totals are centered around zero at each x position, and each series becomes a closed renderer-neutral stream polygon.',
    example: `import { themeRiver } from 'graflume/complete';

themeRiver('#chart', data, {
  x: { field: 'date', type: 'temporal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { series: 'channel' } },
});`,
    access:
      'Each stream carries a representative source row. Add a time-by-series table and describe major changes because stacked thickness is difficult to compare precisely.',
    performance:
      'Scene size grows with series × time positions. Pre-aggregate long time series and limit series count to preserve readability.',
    limits:
      'Smooth spline interpolation, negative values, missing-series interpolation, ordering optimization, label placement, and built-in legends remain planned.',
  },
  {
    id: 'sunburst',
    title: 'Sunburst charts',
    api: 'sunburst',
    mark: 'sunburst',
    use: 'Use a sunburst chart for a weighted hierarchy where ring depth and angular share should be visible together.',
    contract:
      '`x` supplies node id, `mark.fields.parent` supplies parent id, and `y` or `mark.fields.value` supplies non-negative weight.',
    fields:
      '`id`, `parent`, `label`, and `value` follow the same hierarchy contract as the tree mark. Child totals are reconciled safely with explicit parent values.',
    options:
      '`innerRadius` controls the central hole from 0 to 0.7 of the outer radius. Standard mark styling remains available.',
    behavior:
      'The compiler builds a safe hierarchy, allocates annular sectors recursively by weight, varies color by node, and labels sectors when angular and radial space are sufficient.',
    example: `import { sunburst } from 'graflume/complete';

sunburst('#chart', nodes, {
  x: { field: 'id', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { fields: { parent: 'parent', label: 'name' }, options: { innerRadius: 0.12 } },
});`,
    access:
      'Every sector retains its source row. A nested-list or table fallback is essential because ring position alone does not expose the complete hierarchy to assistive technology.',
    performance:
      'Scene cost is linear in nodes, but labels and tiny sectors become unreadable before rendering becomes expensive. Aggregate small leaves when possible.',
    limits:
      'Interactive drill-down, re-rooting, minimum-angle aggregation, breadcrumb navigation, label collision solving, and depth-specific style tokens remain planned.',
  },
  {
    id: 'custom',
    title: 'Declarative custom charts',
    api: 'custom',
    mark: 'custom',
    use: 'Use a declarative custom chart for a small escape hatch that can still be serialized, validated, and rendered without runtime code execution.',
    contract:
      '`x` and `y` position each row. `mark.options.primitive` selects `circle`, `rect`, `line`, or `text`; named fields supply primitive dimensions and labels.',
    fields:
      '`x2`/`y2` define line endpoints; `width`/`height` define rectangles; `radius` defines circles; and `label` defines text.',
    options:
      '`primitive`, numeric `width`, `height`, `radius`, `fontSize`, and string `label` are portable options. Functions, callbacks, raw HTML, shaders, and runtime evaluation are rejected by the portable-spec boundary.',
    behavior:
      'Each row compiles directly to an existing Scene primitive and keeps row-level interaction metadata. The renderer never executes user-provided code.',
    example: `import { custom } from 'graflume/complete';

custom('#chart', rows, {
  x: { field: 'x', type: 'quantitative' },
  y: { field: 'y', type: 'quantitative' },
  mark: {
    fields: { width: 'width', height: 'height', label: 'label' },
    options: { primitive: 'rect' },
  },
});`,
    access:
      'Primitive rows retain normal hit-test metadata. Authors remain responsible for a meaningful chart label, description, and table fallback because custom geometry has no automatic semantic summary yet.',
    performance:
      'The declarative path is lightweight and linear in rows. Complex scenes or shaders belong in a separately versioned plugin rather than a portable chart specification.',
    limits:
      'Arbitrary paths, nested groups, custom shaders, callbacks, layout code, HTML, and renderer-specific objects are deliberately outside this portable alpha contract.',
  },
];

function guideMarkdown(guide) {
  return `# ${guide.title}

[Back to the chart guide index](./README.md)

![Current Graflume ${guide.title.toLowerCase()} output](../assets/charts/${guide.id}.svg)

> This image is generated from the actual renderer-neutral \`compile()\` Scene and checked for staleness in CI.

## When to use it

${guide.use}

## Data contract

${guide.contract}

### Named fields

${guide.fields}

### Portable options

${guide.options}

## Quick API

The additional families are opt-in so the default browser and module entrypoints remain small.

\`\`\`js
${guide.example}
\`\`\`

The same chart can be represented as a function-free portable specification with \`mark.type: '${guide.mark}'\`.

## Rendering behavior

${guide.behavior}

All output is compiled into the same renderer-neutral Scene used by Canvas and the checked SVG documentation snapshots. No second rendering engine is embedded.

## Interaction and accessibility

${guide.access}

## Performance

${guide.performance}

## Current limitations

${guide.limits}
`;
}

await mkdir(directory, { recursive: true });
for (const guide of guides) {
  const source = guideMarkdown(guide);
  const markdown = await format(source, { parser: 'markdown', printWidth: 100 });
  await writeFile(new URL(`${guide.id}.md`, directory), markdown, 'utf8');
}

console.log(`Generated ${guides.length} additional chart guides.`);
