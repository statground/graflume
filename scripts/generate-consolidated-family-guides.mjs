import { writeFile } from 'node:fs/promises';

import { fullCatalog, fullVariantCatalog } from '../dist/graflume.complete.js';

const guideDefinitions = {
  difference: {
    use: 'Compare an old and a new quantitative value at the same category and make the signed change visible.',
    data: 'Declare the comparison columns with `mark.fields.old` and `mark.fields.new`. Categories stay on `x`; the new value normally remains on `y` for axes and tooltips.',
    example: `{ x: { field: 'month', type: 'ordinal' }, y: { field: 'newValue', type: 'quantitative' }, mark: { fields: { old: 'oldValue', new: 'newValue' } } }`,
  },
  interval: {
    use: 'Show uncertainty, a low/high band, a column range, or a two-endpoint comparison without presenting those layouts as unrelated chart families.',
    data: 'Declare `low` and `high` in `mark.fields`. Choose area, column, dumbbell, or error presentation through the listed preset API and its function-free mark options.',
    example: `{ x: { field: 'month', type: 'ordinal' }, y: { field: 'value', type: 'quantitative' }, mark: { fields: { low: 'low', high: 'high' }, options: { mode: 'area' } } }`,
  },
  hierarchy: {
    use: 'Explore parent-child structure. Tree, organization, nested rectangles, and radial partitions are layouts of the same hierarchy meaning.',
    data: 'Supply a node id plus a parent field. Root rows use an empty parent; an optional quantitative value controls area or angular extent.',
    example: `{ x: { field: 'id', type: 'nominal' }, y: { field: 'value', type: 'quantitative' }, mark: { fields: { parent: 'parent' } } }`,
  },
  flow: {
    use: 'Explain weighted movement between categorical sources and targets.',
    data: 'Use the `x` field as source, declare `mark.fields.target`, and place the non-negative weight on `y` or `mark.fields.value`.',
    example: `{ x: { field: 'source', type: 'nominal' }, y: { field: 'value', type: 'quantitative' }, mark: { fields: { target: 'target' } } }`,
  },
  network: {
    use: 'Show relationships among nodes while choosing node-link, arc, or direct connection geometry as a layout mode.',
    data: 'Declare source and target fields and an optional weight. `network()` accepts `mark.options.mode` values `node-link`, `arc`, and `connections`.',
    example: `{ x: { field: 'source', type: 'nominal' }, y: { field: 'value', type: 'quantitative' }, mark: { fields: { target: 'target' }, options: { mode: 'arc' } } }`,
  },
};

for (const [id, details] of Object.entries(guideDefinitions)) {
  const family = fullCatalog.find((entry) => entry.id === id);
  if (!family) throw new Error(`Missing consolidated family ${id}`);
  const variants = fullVariantCatalog.filter((entry) => entry.familyId === id);
  const rows = variants
    .map(
      ({ name, quickApi, mode, mark }) =>
        `| ${name} | \`${quickApi}()\` | \`${mode}\` | \`${mark}\` |`,
    )
    .join('\n');
  const markdown = `# ${family.name}

![Current ${family.name} output](../assets/charts/${id}.svg)

This guide documents the consolidated **${family.name}** family. The image is generated from the actual compiled Scene used by the runtime renderer.

## When to use it

${details.use}

## Canonical Quick API

\`\`\`ts
import { ${family.quickApi} } from 'graflume${id === 'network' ? '/complete' : ''}';

${family.quickApi}('#chart', data, ${details.example});
\`\`\`

## Integrated presets

These names remain source-compatible, but discovery surfaces count them as modes of this family.

| Preset | Quick API | Mode | Portable mark |
| --- | --- | --- | --- |
${rows}

## Data contract

${details.data} Missing required values skip only the affected row. Input order remains stable unless the selected layout documents a deterministic sort.

## Rendering and portability

Every preset normalizes into the same ChartSpec, validation, scale, compiler, renderer-neutral Scene, interaction, and accessibility pipeline. Mode differences use function-free \`mark.fields\` and \`mark.options\`; they do not create a second engine or a second top-level family.

## Styling and interaction

Use theme tokens or common \`fill\`, \`stroke\`, \`opacity\`, \`lineWidth\`, \`radius\`, and \`cornerRadius\` properties where the selected geometry supports them. Interactive datum shapes retain their source row and layer metadata; decorative labels, grids, and depth faces do not create duplicate targets.

## Accessibility and performance

Provide a concise \`accessibility.label\`, describe the principal comparison or structure, and pair Canvas output with the data-table fallback. Dense labels, relationship crossings, and multi-part interval geometry can produce several Scene nodes per row, so aggregate when individual marks stop adding analytical value.

## Verification

- Snapshot: [\`docs/assets/charts/${id}.svg\`](../assets/charts/${id}.svg)
- Runtime catalogs: [\`src/catalog\`](../../src/catalog)
- Catalog tests: [\`tests\`](../../tests)
`;
  await writeFile(new URL(`../docs/charts/${id}.md`, import.meta.url), markdown, 'utf8');
}

console.log(`Generated ${Object.keys(guideDefinitions).length} consolidated family guides.`);
