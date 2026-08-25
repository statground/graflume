import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

import {
  chartTypeCatalog,
  chartVariantCatalog,
  fullCatalog,
  fullVariantCatalog,
} from '../dist/graflume.complete.js';
import { seriesSampleSpec } from './series-samples.mjs';

const chartDirectory = new URL('../docs/charts/', import.meta.url);
const assetDirectory = new URL('../docs/assets/charts/', import.meta.url);
const prettierConfig = (await resolveConfig(fileURLToPath(chartDirectory))) ?? {};
const startMarker = '<!-- FAMILY_PRESETS_START -->';
const endMarker = '<!-- FAMILY_PRESETS_END -->';
const defaultFamilyIds = new Set(chartTypeCatalog.map(({ id }) => id));
const defaultQuickApis = new Set(chartVariantCatalog.map(({ quickApi }) => quickApi));

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

const calculatedIndicators = new Set([
  'absolute-price-oscillator',
  'simple-moving-average',
  'exponential-moving-average',
  'weighted-moving-average',
  'double-exponential-average',
  'triple-exponential-average',
  'triple-exponential-oscillator',
  'disparity-index',
  'linear-regression',
  'linear-regression-angle',
  'linear-regression-intercept',
  'linear-regression-slope',
  'moving-average-convergence-divergence',
  'momentum',
  'percentage-price-oscillator',
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
  streamgraph: 'Uses the shared multi-series stack with wiggle offset and insideOut ordering.',
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
  'gauge-number': 'Presents the current value as a compact numeric indicator.',
  'gauge-delta': 'Adds a signed comparison with the supplied reference field.',
  'gauge-bullet': 'Uses a horizontal value track with an explicit target rule.',
  'solid-gauge': 'Uses concentric filled arcs without a needle.',
  geo: 'Joins named regions to the built-in 177-feature Natural Earth world basemap; the example uses choropleth mode while bubble remains the default.',
  map: 'Projects valid longitude and latitude rows over the built-in Natural Earth world basemap.',
  'flow-map': 'Adds weighted directional routes over the shared static political basemap.',
  'geo-heatmap': 'Maps geographic intensity into nested heat circles over country boundaries.',
  'map-bubble': 'Scales projected point radius by value over country boundaries.',
  'map-line': 'Draws curved geographic routes without flow weighting over the shared basemap.',
  'map-point': 'Uses fixed-size projected point markers over the shared basemap.',
  'tiled-map':
    'Retains the historical compatibility name for projected points on the built-in political basemap; it does not request or simulate web tiles.',
  histogram: 'Bins samples into counts.',
  distribution: 'Uses the canonical raw-sample histogram presentation.',
  ecdf: 'Computes the weighted empirical cumulative probability at each distinct sample.',
  ccdf: 'Computes the weighted complementary probability P(X > x) at each distinct sample.',
  kde: 'Estimates a unit-integral Gaussian density with a robust automatic bandwidth.',
  violin: 'Estimates a mirrored kernel-density shape for each group.',
  'histogram-2d': 'Bins two quantitative coordinates into rectangular heat cells.',
  'histogram-2d-contour': 'Traces density isolines over the complete bivariate bin grid.',
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
  icicle: 'Allocates hierarchy depth to stacked horizontal bands.',
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
  'funnel-area': 'Scales both stage dimensions so visible area follows value.',
  'funnel-3d': 'Adds portable depth faces to funnel stages.',
  pyramid: 'Reverses the stage emphasis into a pyramid presentation.',
  'pyramid-3d': 'Adds portable depth faces to pyramid stages.',
  heatmap: 'Uses a rectangular value matrix.',
  image: 'Renders explicit color or RGBA rows as interactive raster cells.',
  polar: 'Uses an ordered radial line as the canonical polar presentation.',
  'polar-line': 'Connects values in angular order.',
  'polar-scatter': 'Shows radial points without a connecting path.',
  'polar-bar': 'Uses angular sectors whose radius encodes value.',
  ternary: 'Normalizes three non-negative components into triangular coordinates.',
  smith: 'Transforms complex impedance onto resistance and reactance curves.',
  'scatter-matrix': 'Combines diagonal histograms with pairwise scatter cells.',
  carpet: 'Shows the curvilinear logical coordinate grid.',
  'carpet-scatter': 'Overlays interactive points on the warped grid.',
  'carpet-contour': 'Overlays actual value isolines on the warped grid.',
  'parallel-categories': 'Aggregates categorical paths into proportional ribbons.',
  'tile-map': 'Uses equal-area square, circle, diamond, or hexagonal tiles.',
  vector: 'Draws direction and magnitude as arrow shafts and heads.',
  'wind-barb': 'Converts speed and direction into meteorological barb feathers.',
  'point-and-figure': 'Quantizes price changes into X and O columns.',
  renko: 'Quantizes price movement into fixed-size rising and falling bricks.',
  'volume-by-price': 'Bins price and aggregates volume into horizontal profile bars.',
  vega: 'Translates the supported function-free embedded mark subset.',
  custom: 'Builds row-level declarative primitives without executable callbacks.',
};

const familyUseCases = {
  annotation: 'you need to place named events or notes on an ordered series',
  area: 'the magnitude and continuity of an ordered series matter more than individual points',
  bar: 'you need to compare values across discrete categories',
  bubble: 'position and an additional magnitude channel must be read together',
  calendar: 'daily values need to be scanned in calendar order',
  candlestick: 'open, high, low, and close values must remain visually distinct',
  chord: 'weighted relationships need a compact circular overview',
  combination: 'different marks must share one coordinate system',
  contour: 'a sampled surface must be read through value bands',
  difference: 'old and new values need a direct signed comparison',
  flow: 'weighted movement between stages or entities is the primary reading task',
  funnel: 'ordered stages and their decreasing or increasing magnitude must be compared',
  gauge: 'a small set of current values must be judged against a known range',
  heatmap: 'two discrete dimensions and one value should be scanned as a matrix',
  hierarchy: 'parent-child structure and relative size must be inspected together',
  distribution: 'the shape or summary of one or two quantitative distributions matters',
  interval: 'a central value and its lower and upper bounds must be compared',
  item: 'counts should be represented as repeated tangible units',
  line: 'change across an ordered domain is the main reading task',
  map: 'values or relationships must be interpreted geographically',
  motion: 'a frame-specific multivariate state must be shown from longitudinal data',
  network: 'entities and their connections are more important than a Cartesian axis',
  parallel: 'many quantitative dimensions must be compared for each row',
  pie: 'a small number of positive values form one meaningful whole',
  'price-blocks': 'price movement should be quantized rather than shown on a continuous time path',
  polar: 'angle and radius, or several normalized indicators, define the reading task',
  image: 'a bounded color matrix must preserve row-level pixel semantics',
  ternary: 'three non-negative components must be compared as relative composition',
  smith: 'normalized complex impedance must be inspected on a reflection grid',
  'scatter-matrix': 'several quantitative dimensions require pairwise comparison',
  carpet: 'logical coordinates must be read through a supplied curvilinear surface',
  scatter: 'the relationship between quantitative coordinates must be inspected',
  table: 'exact row values are more important than geometric comparison',
  'technical-indicator':
    'a derived or supplied market indicator must be aligned to an ordered series',
  timeline: 'events or intervals must be placed on a temporal axis',
  'vector-field': 'direction and magnitude must be read at each coordinate',
  venn: 'set overlap is the primary reading task',
  'volume-profile': 'aggregated volume must be compared across price bands',
  waterfall: 'a sequence of positive and negative contributions must explain a total',
  'word-cloud': 'relative word weight needs a compact overview',
  'word-tree': 'weighted terms must be read through explicit parent-child relationships',
};

function tableText(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function presetDescription(variant) {
  const description = presetDescriptions[variant.id];
  if (description !== undefined) return description;
  if (variant.familyId === 'technical-indicator') {
    const calculation = calculatedIndicators.has(variant.id)
      ? 'is registry-marked `computed` with formula provenance, a dependency DAG, and null warm-up rows'
      : 'is registry-marked `precomputed-required` and uses supplied indicator columns';
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

function assetIdFor(family, variant, assetNames) {
  if (assetNames.has(`${variant.id}.svg`)) return variant.id;
  if (assetNames.has(`${family.id}.svg`)) return family.id;
  throw new Error(`Missing compiled snapshot for ${variant.id} in ${family.id}.`);
}

function compactData(spec) {
  if (!Array.isArray(spec.data)) throw new Error('Guide examples require inline row data.');
  const fields = fieldsForSpec(spec);
  return spec.data
    .slice(0, Math.min(spec.data.length, 4))
    .map((row) =>
      Object.fromEntries(
        [...fields]
          .filter((field) => Object.hasOwn(row, field))
          .map((field) => [
            field,
            typeof row[field] === 'number' ? Number(row[field].toFixed(3)) : row[field],
          ]),
      ),
    );
}

function quickOptions(spec) {
  const { data: _data, mark, ...rest } = spec;
  if (spec.layers !== undefined) return rest;
  if (typeof mark === 'object' && mark !== null && !Array.isArray(mark)) {
    const { type: _type, ...markOptions } = mark;
    return Object.keys(markOptions).length > 0 ? { ...rest, mark: markOptions } : rest;
  }
  return rest;
}

function pointEnabledOptions(spec, options) {
  const markType =
    typeof spec.mark === 'object' && spec.mark !== null && !Array.isArray(spec.mark)
      ? spec.mark.type
      : spec.mark;
  if (markType !== 'area' && markType !== 'stepped-area') return options;
  return {
    ...options,
    mark: { ...(options.mark ?? {}), point: true },
  };
}

function quickExample(variant) {
  const entrypoint = defaultQuickApis.has(variant.quickApi) ? 'graflume' : 'graflume/complete';
  const spec = seriesSampleSpec(variant);
  const data = compactData(spec);
  const portableOptions = pointEnabledOptions(spec, quickOptions(spec));
  const options = {
    ...portableOptions,
    title: {
      text: variant.name,
      subtitle: `${variant.familyId} family · ${variant.mode} mode`,
    },
    locale: spec.locale ?? 'en-US',
    interaction: {
      ...(portableOptions.interaction ?? {}),
      tooltip: {
        title: variant.name,
        fields: tooltipFields(spec),
        ...(axisTooltipFamilies.has(variant.familyId)
          ? { trigger: 'axis', axis: axisTooltipFamilies.get(variant.familyId) }
          : { trigger: 'mark' }),
      },
    },
  };
  return `import { ${variant.quickApi} } from '${entrypoint}';

const data = ${JSON.stringify(data, null, 2)};

${variant.quickApi}('#chart', data, ${JSON.stringify(options, null, 2)});`;
}

function addField(fields, value) {
  if (typeof value === 'string' && value.length > 0) fields.add(value);
}

function fieldsFromMark(fields, mark) {
  if (typeof mark !== 'object' || mark === null || Array.isArray(mark)) return;
  for (const field of Object.values(mark.fields ?? {})) addField(fields, field);
  for (const field of mark.options?.fields ?? []) addField(fields, field);
  for (const field of mark.options?.columns ?? []) addField(fields, field);
  for (const field of mark.options?.dimensions ?? []) addField(fields, field);
}

function fieldsForSpec(spec) {
  const fields = new Set();
  addField(fields, spec.x?.field);
  addField(fields, spec.y?.field);
  fieldsFromMark(fields, spec.mark);
  for (const layer of spec.layers ?? []) {
    addField(fields, layer.x?.field);
    addField(fields, layer.y?.field);
    fieldsFromMark(fields, layer.mark);
  }
  return fields;
}

function humanizeField(field) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function encodingsForSpec(spec) {
  const encodings = [];
  if (spec.x !== undefined) encodings.push(spec.x);
  if (spec.y !== undefined) encodings.push(spec.y);
  for (const layer of spec.layers ?? []) {
    if (layer.x !== undefined) encodings.push(layer.x);
    if (layer.y !== undefined) encodings.push(layer.y);
  }
  return encodings.filter(
    (encoding) => typeof encoding === 'object' && encoding !== null && !Array.isArray(encoding),
  );
}

function tooltipField(spec, field) {
  const encoding = encodingsForSpec(spec).find((candidate) => candidate.field === field);
  const sample = Array.isArray(spec.data)
    ? spec.data.find((row) => Object.hasOwn(row, field))?.[field]
    : undefined;
  const format =
    encoding?.type === 'temporal' ||
    (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sample))
      ? 'date'
      : typeof sample === 'number'
        ? 'number'
        : 'auto';
  return {
    field,
    label: encoding?.title ?? humanizeField(field),
    format,
  };
}

function markTypesForSpec(spec) {
  const marks = [spec.mark, ...(spec.layers ?? []).map((layer) => layer.mark)];
  return new Set(
    marks
      .map((mark) =>
        typeof mark === 'object' && mark !== null && !Array.isArray(mark) ? mark.type : mark,
      )
      .filter((mark) => typeof mark === 'string'),
  );
}

function derivedTooltipFields(spec) {
  const marks = markTypesForSpec(spec);
  const markDefinitions = [spec.mark, ...(spec.layers ?? []).map((layer) => layer.mark)].filter(
    (mark) => typeof mark === 'object' && mark !== null && !Array.isArray(mark),
  );
  const distributionMark = markDefinitions.find((mark) => mark.type === 'distribution');
  const distributionMode = distributionMark?.options?.mode ?? 'histogram';
  const carpetMark = markDefinitions.find((mark) => mark.type === 'carpet');
  const carpetMode = carpetMark?.options?.mode ?? 'base';
  const fields = [];
  if (marks.has('histogram') || (marks.has('distribution') && distributionMode === 'histogram')) {
    fields.push(
      { field: 'binStart', label: 'Bin start', format: 'number' },
      { field: 'binEnd', label: 'Bin end', format: 'number' },
      { field: 'count', label: 'Count', format: 'integer' },
      { field: 'proportion', label: 'Share', format: 'percent', fractionDigits: 1 },
    );
  }
  if (marks.has('distribution') && distributionMode === 'curve') {
    fields.push(
      { field: 'mean', label: 'Mean', format: 'number' },
      { field: 'standardDeviation', label: 'Standard deviation', format: 'number' },
      { field: 'sampleCount', label: 'Sample count', format: 'integer' },
      { field: 'minimum', label: 'Minimum', format: 'number' },
      { field: 'maximum', label: 'Maximum', format: 'number' },
    );
  }
  if (marks.has('distribution') && (distributionMode === 'ecdf' || distributionMode === 'ccdf')) {
    fields.push(
      { field: 'probability', label: 'Probability', format: 'percent' },
      { field: 'weight', label: 'Weight', format: 'number' },
      { field: 'count', label: 'Tied rows', format: 'integer' },
    );
  }
  if (marks.has('distribution') && distributionMode === 'kde') {
    fields.push(
      { field: 'bandwidth', label: 'Bandwidth', format: 'number' },
      { field: 'sampleCount', label: 'Sample count', format: 'integer' },
    );
  }
  if (marks.has('distribution') && distributionMode === 'histogram-2d-contour') {
    fields.push(
      { field: 'level', label: 'Density level', format: 'number' },
      { field: 'minimumCount', label: 'Minimum count', format: 'integer' },
      { field: 'maximumCount', label: 'Maximum count', format: 'integer' },
      { field: 'binsX', label: 'X bins', format: 'integer' },
      { field: 'binsY', label: 'Y bins', format: 'integer' },
    );
  }
  if (marks.has('carpet')) {
    fields.push(
      { field: 'axis', label: 'Logical axis', format: 'auto' },
      { field: 'key', label: 'Logical key', format: 'auto' },
      { field: 'logicalCoordinate', label: 'Coordinate', format: 'auto' },
    );
    if (carpetMode === 'contour') {
      fields.push(
        { field: 'level', label: 'Contour level', format: 'number' },
        { field: 'minimumValue', label: 'Minimum value', format: 'number' },
        { field: 'maximumValue', label: 'Maximum value', format: 'number' },
        { field: 'valueField', label: 'Value field', format: 'auto' },
      );
    }
  }
  if (marks.has('volume-profile')) {
    fields.push(
      { field: 'priceStart', label: 'Price from', format: 'number' },
      { field: 'priceEnd', label: 'Price to', format: 'number' },
      { field: 'volume', label: 'Volume', format: 'number' },
      { field: 'proportion', label: 'Volume share', format: 'percent', fractionDigits: 1 },
    );
  }
  if (marks.has('renko')) {
    fields.push(
      { field: 'brickStart', label: 'Brick start', format: 'number' },
      { field: 'brickEnd', label: 'Brick end', format: 'number' },
      { field: 'brickSize', label: 'Brick size', format: 'number' },
    );
  }
  if (marks.has('graph')) {
    fields.push(
      { field: 'kind', label: 'Target', format: 'auto' },
      { field: 'node', label: 'Node', format: 'auto' },
      { field: 'degree', label: 'Connections', format: 'integer' },
      { field: 'total', label: 'Connected weight', format: 'number' },
      { field: 'source', label: 'From', format: 'auto' },
      { field: 'target', label: 'To', format: 'auto' },
      { field: 'value', label: 'Weight', format: 'number' },
    );
  }
  if (marks.has('chord')) {
    fields.push(
      { field: 'kind', label: 'Target', format: 'auto' },
      { field: 'node', label: 'Segment', format: 'auto' },
      { field: 'total', label: 'Total weight', format: 'number' },
      { field: 'source', label: 'From', format: 'auto' },
      { field: 'target', label: 'To', format: 'auto' },
      { field: 'value', label: 'Weight', format: 'number' },
    );
  }
  return fields;
}

function tooltipFields(spec) {
  const fields = new Map(derivedTooltipFields(spec).map((field) => [field.field, field]));
  for (const field of fieldsForSpec(spec)) {
    if (!fields.has(field)) fields.set(field, tooltipField(spec, field));
  }
  return [...fields.values()];
}

function requiredFields(variant) {
  return [...fieldsForSpec(seriesSampleSpec(variant))].map((field) => `\`${field}\``).join(', ');
}

function visualGallery(family, variants, assetNames) {
  const cells = variants.map((variant) => {
    const assetId = assetIdFor(family, variant, assetNames);
    return `**[${tableText(variant.name)}](#variant-${variant.id})**<br>[![Current ${tableText(variant.name)} output](../assets/charts/${assetId}.svg)](../assets/charts/${assetId}.svg)`;
  });
  if (cells.length % 2 !== 0) cells.push('');
  const rows = [];
  for (let index = 0; index < cells.length; index += 2) {
    rows.push(`| ${cells[index]} | ${cells[index + 1]} |`);
  }
  return `## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|  |  |
| --- | --- |
${rows.join('\n')}`;
}

function implementationExamples(family, variants) {
  const familyUseCase =
    familyUseCases[family.id] ?? 'this preset matches the intended reading task';
  const tooltipAxis = axisTooltipFamilies.get(family.id);
  const tooltipGuidance =
    tooltipAxis === undefined
      ? 'This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry.'
      : `This family uses \`trigger: "axis"\` with \`axis: "${tooltipAxis}"\`. An exact rendered-mark hit still has priority; otherwise Graflume selects the nearest actual datum on that axis without inventing an interpolated row.`;
  const sections = variants
    .map((variant) => {
      const fields = requiredFields(variant);
      const useCase =
        variant.id === 'parallel-categories'
          ? 'categorical stages and the frequency of each complete path must be compared'
          : familyUseCase;
      return `<a id="variant-${variant.id}"></a>

### ${variant.name}

Use this preset when ${useCase}. ${presetDescription(variant)}

- **Quick API:** \`${variant.quickApi}()\`
- **Mode:** \`${variant.mode}\`
- **Portable mark:** \`${variant.mark}\`
- **Required example fields:** ${fields || 'no row fields beyond the adapter contract'}

\`\`\`js
${quickExample(variant)}
\`\`\``;
    })
    .join('\n\n');
  return `## Type-by-type implementation

The snippets are minimal runnable examples. Change \`#chart\` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared \`locale\`. ${tooltipGuidance} Pointer tooltip triggers remain a convenience; opt into \`accessibility.table\` and \`accessibility.navigation\` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

${sections}`;
}

function familyBlock(family, variants, assetNames) {
  const entrypoint = defaultFamilyIds.has(family.id) ? '`graflume`' : '`graflume/complete`';
  const rows = variants
    .map(
      (variant) =>
        `| [${tableText(variant.name)}](#variant-${variant.id}) | \`${variant.quickApi}()\` | \`${variant.mode}\` | \`${variant.mark}\` | ${tableText(presetDescription(variant))} |`,
    )
    .join('\n');
  return `${startMarker}
## Integrated presets

This is the single manual for the \`${family.id}\` family. Its canonical Quick API is \`${family.quickApi}()\` from ${entrypoint}, and its representative portable mark is \`${family.mark}\`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name | Quick API | Mode | Portable mark | Functional difference |
| --- | --- | --- | --- | --- |
${rows}

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

${visualGallery(family, variants, assetNames)}

${implementationExamples(family, variants)}
${endMarker}`;
}

function compatibilityIndex() {
  const sections = fullCatalog
    .map((family) => {
      const variants = fullVariantCatalog.filter(({ familyId }) => familyId === family.id);
      const rows = variants
        .map(
          (variant) =>
            `| \`${variant.id}\` | [${tableText(variant.name)}](./${family.id}.md#variant-${variant.id}) | \`${variant.quickApi}()\` | \`${variant.mode}\` | \`${variant.mark}\` |`,
        )
        .join('\n');
      return `## [${family.name}](./${family.id}.md#integrated-presets)

| Identifier | Compatible name | Quick API | Mode | Portable mark |
| --- | --- | --- | --- | --- |
${rows}`;
    })
    .join('\n\n');
  return `# Compatibility preset index

Graflume exposes ${fullCatalog.length} representative chart families while preserving compatible names. This index maps the ${fullVariantCatalog.filter(({ familyId }) => familyId !== 'custom').length} family presets to the one manual that documents their data contract, functional differences, and current compiled output.

Use \`resolveSeriesType(identifier)\` from \`graflume/complete\` when an integration receives names with mixed case, spaces, hyphens, or underscores. The returned \`familyId\` selects the representative manual and \`variantId\` preserves the requested preset.

The two function-free adapter names are documented separately in [Adapters](./adapters.md).

${sections}

[Back to chart guides](./README.md)
`;
}

function adapterGuide(assetNames) {
  const adapters = fullVariantCatalog.filter(({ familyId }) => familyId === 'custom');
  const adapterFamily = { id: 'custom', name: 'Declarative adapters' };
  const rows = adapters
    .map(
      (variant) =>
        `| ${tableText(variant.name)} | \`${variant.quickApi}()\` | \`${variant.mark}\` | ${tableText(presetDescription(variant))} |`,
    )
    .join('\n');
  return `# Declarative adapters

Adapters translate a constrained external or custom declarative shape into Graflume's portable specification. They are compatibility surfaces, not additional chart families, so they do not appear in the ${fullCatalog.length}-family discovery catalog.

| Adapter | Quick API | Portable mark | Contract |
| --- | --- | --- | --- |
${rows}

Both adapters reject executable callbacks and enter the ordinary validation, Scene compilation, rendering, interaction, and accessibility pipeline. Prefer a representative family Quick API when the data meaning already matches one of the [${fullCatalog.length} chart families](./README.md#choose-a-chart).

${visualGallery(adapterFamily, adapters, assetNames)}

${implementationExamples(adapterFamily, adapters)}

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
  await format(adapterGuide(assetNames), { ...prettierConfig, parser: 'markdown' }),
  'utf8',
);

const retainedFiles = new Set([
  'README.md',
  'adapters.md',
  'axes.md',
  'boxplot.md',
  'compatibility-presets.md',
  'histogram.md',
  'interactions.md',
  'radar.md',
  'themes.md',
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
