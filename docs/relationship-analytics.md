# Structure and relationship analytics

Graflume's hierarchy, flow, network, chord, funnel, parallel, Venn, word-tree,
and word-cloud compilers can consume function-free `mark.fields` and
`mark.options`. The advanced contracts compile to the ordinary renderer-neutral
Scene, so Canvas, SVG, hit testing, semantic indexing, export, and stored specs
share the same geometry and provenance.

Existing simple specs keep their previous renderer. An advanced compiler is
selected only when its documented fields or options are present.

## Hierarchy (`tree`)

Fields are `id`, `parent`, `label`, and `value`. Portable options are:

- `layout`: `circle-pack`, `dendrogram`, or `radial-tree`;
- `root` or `zoomTo`: re-root and zoom to a node;
- `collapsed`: node ids whose descendants are hidden;
- `query`: case-insensitive id/label search;
- `padding` and `breadcrumbs`.

Node tooltips expose depth, own and aggregate values, leaf/collapse/search
state, the active root, breadcrumbs, and source-row lineage. Search matches use
the theme focus color. The public `layoutHierarchy()` helper returns the same
deterministic layout used by the compiler.

## Multi-stage flow (`sankey`)

Use `fields.source`, `fields.target`, `fields.value`, and optional `fields.id`.
The source and value fall back to `x` and `y`. Options are `alignment`
(`left`, `right`, `center`, `justify`), `order`, bounded `iterations`, `cycle`
(`reject` or `allow`), `balanceTolerance`, and serializable `positions` keyed by
node id.

Alignment has four deterministic column policies. `left` uses each node's
longest distance from a source. `right` uses longest distance to a sink, so an
entire short branch finishes flush with the final column. `center` retains the
left depth of non-source nodes and moves a source immediately before its
earliest target. `justify` retains left depth while moving only sinks to the
final column.

`pathStart` plus `pathDirection` (`upstream`, `downstream`, or `both`) highlights
a complete connected path. Node and link tooltips expose stages, order,
input/output balance, cycles, imbalances, path state, drag capability, and
source rows. `layoutFlow()` and `traverseFlowPath()` are public for host-side
editing and linked views.

## Network (`graph`)

Edges use `source`, `target`, optional `edgeId`, `weight`, `directed`,
`sourcePort`, and `targetPort`. Node rows use `node`/`nodeId`, `label`, `parent`,
`group`, `radius`, `nodeX`, `nodeY`, `pinned`, `ports`, and `portAngle`.

Options cover all four deterministic layouts (`force`, `radial`, `grid`,
`dag`), `routing` (`straight`, `quadratic`, `orthogonal`), directed edges,
multiedges, self-loops, compound collapse, bounded force iterations/seed/node
spacing, authored drag/pin `positions`, `pinned` ids, and normalized `lasso`
points. The Scene includes routed edges, arrowheads, ports, collapse state,
selected nodes, cycle/topological metadata, and lineage.

Hosts can use public `moveNetworkNode()` to persist drag/pin changes and
`selectNetworkNodes()` for polygon selection before updating the portable spec.

## Chord

Use `source`, `target`, and `value`. `directed`, `padAngle`, `groupOrder`, and
`subgroupOrder` control matrix construction and angular allocation. The
compiler renders matrix-backed group sectors, directed arrow treatment, and
self-loop ribbons. Tooltips expose inbound/outbound totals, matrix rows,
sorting, padding, direction, self-loop state, and source lineage. The same
calculation is exported as `layoutChord()`.

## Funnel

Use `stage`/`id`, `value`, optional `label`, and `order`. Options are `sort`
(`input`, `value-descending`, `order`), `neckWidth`, `neckHeight`, `labelGap`,
`outsideLabels`, and the descriptive `semantics` value. Every stage exposes
input, output, conversion, drop-off, drop-off rate, cumulative conversion, neck
geometry, and source lineage. Outside labels use separate collision-spaced
anchors and leader rules. `funnelStages()` is public.

## Parallel coordinates

`options.axes` is an ordered array of `{ field, type, domain, invert, missing }`.
Types are `linear`, `log`, and `ordinal`; missing routes are `gap`, `top`,
`bottom`, and `middle`. Reordering the array reorders the axes. `brushes` holds
per-axis normalized extent arrays, while `combine` is `intersection` or
`union`.

The compiler draws the authored axis order, log/inverted labels, missing-value
segments, brush extents, and selected/dimmed polylines. Tooltip metadata makes
axis reorder, inversion, and brush actions available to host controls and
preserves the source row. `projectParallelRows()` exposes the identical
projection and filtering contract.

## Venn/Euler memberships

Use an item `id` and a `sets`/`memberships` field containing a string array or a
comma, pipe, or semicolon-separated string. The proportional solver accepts two
or three sets and reports stress and maximum relative error. Exact membership
regions expose their members and source rows.

`options.query` accepts `included` and `excluded` set-id arrays. Query members,
region signatures, and quality are compiled into hit-test tooltips. Public
`analyzeSets()`, `querySetRegion()`, and `hitSetRegion()` support linked tables
and host pointer interactions. The legacy value-circle Venn mode remains
available when no membership field is supplied.

## Word tree

Set `fields.text` and `options.rootPhrase` to enable text analysis. Options are
`direction` (`prefix`, `suffix`, `reverse`), `case`, `stopwords`, `stemming`,
`locale`, `minimumCount`, `maximumDepth`, and `maximumChildren`. The compiler
tokenizes every source text, aggregates repeated continuations, prunes the tree,
and emits count-sized nodes with source-row lineage. `tokenizeWords()` and
`buildWordTree()` are public. The original pre-structured word/parent/weight
mode remains the fallback.

## Word cloud

Set `fields.text` or a tokenizer option to enable raw-text layout. `case`,
`stopwords`, `stemming`, `locale`, and `ngram` define tokens; `seed`, `padding`,
`rotations`, `minimumFrequency`, and `maximumWords` define the deterministic,
bounded layout. Placements expose token frequency, rotation, tokenizer state,
and all contributing rows. `layoutWordCloud()` is public. The original
precomputed word/weight mode remains the fallback.

## Interaction and provenance contract

Derived shapes provide `sourceRowIndices` in their tooltip data. Graflume's
semantic index consumes that field to retain aggregate lineage instead of
pretending every derived node came from only its representative row. Drag,
pin, collapse, re-root, path, lasso, brush, region-query, and region-hit
capabilities are also emitted as function-free tooltip metadata. A host persists
an edit by updating the corresponding fields/options and calling `setSpec()`;
no callback is embedded in a portable ChartSpec.

## Verification

- Compiler/Scene coverage: [`tests/relationship-advanced.test.mjs`](../tests/relationship-advanced.test.mjs)
- Deterministic analytics: [`tests/structured-analytics.test.mjs`](../tests/structured-analytics.test.mjs)
- Network model and editing helpers: [`tests/network-analytics.test.mjs`](../tests/network-analytics.test.mjs)
