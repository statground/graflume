# Structure and relationship analytics

Graflume's hierarchy, flow, network, chord, funnel, parallel, Venn, word-tree,
and word-cloud compilers can consume function-free `mark.fields` and
`mark.options`. The advanced contracts compile to the ordinary renderer-neutral
Scene, so Canvas, SVG, hit testing, semantic indexing, export, and stored specs
share the same geometry and provenance.

Existing simple specs keep their previous renderer. An advanced compiler is
selected when its documented fields or options are present, or when a flow node
appears as both a source and a target.

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
node id. `nodePadding` is a fraction of diagram height from 0 through 0.25
(default 0.025); crowded columns reduce the gap to reserve at least half the
height for actual flow.

Shared source/target IDs represent one node and select multi-stage layout automatically.
Every stage uses one common value-to-height scale: equal link values have equal ribbon
heights at both ends, and node height is the larger of its incoming and outgoing totals.
Different totals retain explicit imbalance metadata; the layout does not invent or normalize
missing transitions. Cycles are rejected unless `cycle: 'allow'` is authored; allowed backward
links retain feedback metadata and curved return ribbons. Public `layoutFlow()` links expose
`height` in normalized diagram coordinates alongside the legacy relative `thickness`.

Use this family only for measured relationships in consistent units. Independent activity
counts, mixed person/event totals, or values sorted by size do not establish transitions;
show these as separate metrics, a table, or a clearly labeled comparison instead.

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

### Dense co-occurrence networks

Use `mark.options.layout: 'force'` to opt into the force engine; a legacy graph
with no layout options retains its simple circular presentation. A typical portable
configuration is `{ layout: 'force', routing: 'straight', iterations: 240, seed: 1,
nodeSpacing: 0.08 }`, with `fields.source`, `fields.target`, and `fields.weight`
(or `fields.value`) mapped to the actual co-occurrence count. Layout attraction
uses relative weights, so converting the count unit does not change geometry.
Cooling, centering, and bounded collision relaxation prevent unpinned nodes from
collapsing onto the same boundary point. Deliberately overlapping pinned positions
remain authored choices; an overfull viewport still needs a smaller selected graph.

Include separate node rows with `fields.node`, `fields.label`, and optional
`fields.radius` to keep isolated terms without inventing edges. A blank label can
reduce text density while retaining the node and its full tooltip. Groups and
compound parents are explicit source fields, not inferred community meanings.
Cycle diagnostics in each node tooltip include at most eight examples plus
`cycleCount` and `cyclesTruncated`; `layoutNetwork()` retains the complete cycle
result. This avoids repeating a large dense graph diagnostic in every saved node.
The existing tooltip, drag/pin/lasso, inspection zoom, and saved SVG/runtime state
remain available. Hover does not automatically filter a node's neighbors; a host
can add that domain-specific interaction through chart events and its original data.

## Word cloud

Precomputed `x: word, y: frequency` rows preserve phrases and original weights.
`seed`, `padding`, `rotations`, `minimumFrequency`, `maximumWords`, and
`fontSizeRange` are layout options; they do **not** enable tokenization. Set
`fields.text` or an actual tokenizer option (`tokenize`, `case`, `stopwords`,
`stemming`, `locale`, `ngram`) to count tokens from raw documents instead.

Both modes pack every selected word using deterministic non-overlapping rectangles.
The preferred `fontSizeRange` defaults to `[10, 64]`; when the complete selection
needs more room, one common scale shrinks all fonts together. This preserves the
relative font sizes and does not silently omit words that fail an initial layout.
Dimensions with impossible padding raise an error instead of returning a partial
cloud. Font-independent bounds include wide Unicode and wide Latin glyphs.

`maximumWords` explicitly selects the highest weights. The default is 200 (or a
lower automatic mark budget); an explicit integer from 1 to 2,000 overrides that
automatic selection budget. Values above 2,000 raise an error. For larger corpora,
select or paginate vocabulary in the host and show the selected range and full
frequency table; never label a partial cloud as the complete corpus. A narrow
viewport can require small type: increase chart height, reduce the selected count,
or use inspection zoom and the accessible data table.

`layoutWeightedWordCloud([{ word, frequency }], options)` is the public precomputed
helper; `layoutWordCloud(texts, options)` tokenizes raw documents before using the
same fitter. Tokenized placements expose frequency, rotation, tokenizer state,
and all contributing rows. Precomputed placements retain each original source row.
Saved SVG snapshots preserve exact geometry and inspection without redoing the fit.

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
