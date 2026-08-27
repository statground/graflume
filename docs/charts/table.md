# Table charts

<!-- FAMILY_PRESETS_START -->

## Integrated presets

This is the single manual for the `table` family. Its canonical Quick API is `table()` from `graflume`, and its representative portable mark is `table`. The compatible names below remain callable, but they are modes or data-meaning presets rather than separate chart families.

| Compatible name               | Quick API | Mode      | Portable mark | Functional difference                            |
| ----------------------------- | --------- | --------- | ------------- | ------------------------------------------------ |
| [Table chart](#variant-table) | `table()` | `default` | `table`       | Uses the canonical presentation for this family. |

All presets reuse the same validation, normalization, scale, compiler, renderer-neutral Scene, interaction, accessibility, and serialization contracts. Direction, curve, layout, glyph, depth, financial-body, and indicator choices stay in function-free fields or options instead of selecting a second rendering engine. The remaining manually maintained sections describe the canonical/default presentation unless a preset row above states a different behavior.

## Visual gallery

Every image below is generated from the current compiled Scene rather than drawn by hand. Select a name to jump to its data fields and implementation.

|                                                                                                                              |     |
| ---------------------------------------------------------------------------------------------------------------------------- | --- |
| **[Table chart](#variant-table)**<br>[![Current Table chart output](../assets/charts/table.svg)](../assets/charts/table.svg) |     |

## Type-by-type implementation

The snippets are minimal runnable examples. Change `#chart` to the target element and expand the inline rows with your data. Each example opts into Graflume's safe text-only tooltip with a chart-specific title and ordered fields; number and date formatting follows the declared `locale`. This family keeps `trigger: "mark"`, so the pointer must hit rendered datum geometry. Pointer tooltip triggers remain a convenience; opt into `accessibility.table` and `accessibility.navigation` for the bounded native table and keyboard mark traversal, or provide a larger domain-specific table. The Quick API applies the preset defaults while keeping the resulting specification function-free and serializable.

Every family can opt into the Canvas [inspection viewport, fullscreen, reset, and PNG controls](./interactions.md). Inspection magnifies and translates the complete already-rendered chart, including its title and axes; it is not data-domain or GIS zoom. Generated examples intentionally leave playback off. Add discrete playback only after selecting a meaningful frame field and reviewing the family-specific capability table.

Every family also accepts the shared portable [legend, highlight, selection, and callout contract](./interactions.md#legends-highlights-selection-and-callouts). Automatic legend semantics follow the compiled mark and palette where they are unambiguous; use explicit function-free items for a domain-specific series or category legend. Static datum/layer/range highlights and text-only top-level callouts remain available even when a family has no Cartesian point geometry.

<a id="variant-table"></a>

### Table chart

Use this preset when exact row values are more important than geometric comparison. Uses the canonical presentation for this family.

- **Quick API:** `table()`
- **Mode:** `default`
- **Portable mark:** `table`
- **Required example fields:** `category`, `value`, `target`, `previous`

```js
import { table } from 'graflume';

const data = [
  {
    category: 'Insights',
    value: 86,
    target: 88,
    previous: 74,
  },
  {
    category: 'Dashboards',
    value: 78,
    target: 82,
    previous: 69,
  },
  {
    category: 'Reports',
    value: 69,
    target: 74,
    previous: 65,
  },
  {
    category: 'Alerts',
    value: 61,
    target: 66,
    previous: 48,
  },
];

table('#chart', data, {
  x: {
    field: 'category',
    type: 'ordinal',
    title: 'Capability',
  },
  y: {
    field: 'value',
    type: 'quantitative',
    title: 'Current value',
  },
  title: {
    text: 'Table chart',
    subtitle: 'table family · default mode',
  },
  accessibility: {
    label: 'Table chart: A compact operational scorecard with current, target, and previous values',
    description:
      'A compact operational scorecard with current, target, and previous values. The example uses curated, deterministic data and exposes its exact values in a semantic table.',
  },
  mark: {
    options: {
      columns: ['category', 'value', 'target', 'previous'],
    },
  },
  locale: 'en-US',
  interaction: {
    tooltip: {
      title: 'Table chart',
      fields: [
        {
          field: 'category',
          label: 'Capability',
          format: 'auto',
        },
        {
          field: 'value',
          label: 'Current value',
          format: 'number',
        },
        {
          field: 'target',
          label: 'Target',
          format: 'number',
        },
        {
          field: 'previous',
          label: 'Previous',
          format: 'number',
        },
      ],
      trigger: 'mark',
    },
  },
});
```

<!-- FAMILY_PRESETS_END -->

Use the table chart when exact values matter more than shape.

## Implemented appearance

This image is generated from the current Graflume `compile()` Scene, not a hand-drawn mockup.

![Current Graflume table charts output](../assets/charts/table.svg)

## Quick API

`Graflume.table()` creates the portable `table` mark (or documented alias mapping) and accepts the common target, data, and options arguments.

```ts
Graflume.table('#chart', data, {
  x: { field: 'name', type: 'nominal' },
  y: { field: 'value', type: 'quantitative' },
  mark: { options: { columns: ['name', 'value', 'status'], rowHeight: 28 } },
});
```

## Portable ChartSpec mapping

Without `mark.options.columns`, the table keeps every source field in first-seen order. A string array remains supported, and each entry can now be a closed object definition:

```js
mark: {
  type: 'table',
  options: {
    headerHeight: 38,
    rowHeight: 34,
    cellPadding: 10,
    grid: { rows: true, columns: true, color: '#cbd5e1', width: 1 },
    columns: [
      { field: 'team', header: 'Team', width: 180, align: 'left' },
      {
        field: 'revenue',
        header: 'Revenue',
        width: 140,
        minWidth: 96,
        maxWidth: 220,
        align: 'right',
        formatter: 'number',
        editable: true,
        editor: { type: 'number' },
        validation: { required: true, min: 0 },
        style: { fontWeight: 700 },
        visual: { type: 'data-bar', min: 0, color: '#4f46e5' },
      },
      { field: 'internalId', visible: false },
    ],
  },
}
```

The column order is authoritative. `visible: false` removes a column from the compiled table without modifying its source row. Target widths are normalized to the current plot width, while `minWidth` and `maxWidth` bound each column before the responsive fit. `headerHeight` accepts 20–160, `rowHeight` 18–160, and `cellPadding` 0–32 pixels.

The same result can be created with `Graflume.create()` and `mark: { type: 'table' }`. Named `mark.fields` and `mark.options` values are function-free and JSON-serializable, so they remain portable across JavaScript, future Python/R/Java builders, and stored specs.

## Data, ordering, and missing values

Theme-tinted headers, alternating row surfaces, subtle grid cells, and stronger type hierarchy are compiled to Scene primitives. The compiler derives a safe visible-row limit from `headerHeight`, `rowHeight`, and the plot height; an authored `windowLimit` is still honored up to that physical limit. Large tables therefore retain bounded Scene output.

Rows keep source order unless filter, group, pivot, or sort options transform them. Every cell retains the complete source row in its datum and tooltip payload, including fields that are not visible as columns. Grouped and pivoted cells retain the complete derived row. Cell metadata that could conflict with a source name is also available through `tableRow`, `tableColumn`, `tableField`, `cellValue`, and `cellFormatted`.

Unsafe field names are rejected, callbacks are forbidden in portable specs, and invalid or unmappable values are skipped rather than evaluated.

## Styling and themes

Default colors, text, grid, focus, and palettes come from the active design-token theme and switch at runtime. Table styles use this closed declaration:

```js
{
  fill: '#ffffff',
  textColor: '#0f172a',
  stroke: '#cbd5e1',
  lineWidth: 1,
  fontWeight: 700, // or 'normal' / 'bold'
  fontStyle: 'italic', // or 'normal'
  opacity: 1,
  align: 'right', // left / center / right
}
```

Apply it at increasingly specific levels with `style`, a column definition's `style`, `columnStyles`, `rowStyles`, `cellStyles`, and `conditionalFormats`. Later, more specific declarations win:

```js
mark: {
  type: 'table',
  options: {
    style: { textColor: '#334155' },
    headerStyle: { fill: '#0f172a', textColor: '#ffffff', fontWeight: 700 },
    columnStyles: {
      revenue: { fill: '#eef2ff', align: 'right' },
    },
    rowStyles: [
      { row: 0, style: { fill: '#f8fafc' } },
    ],
    cellStyles: [
      { row: 2, field: 'status', style: { fill: '#fff7ed' } },
    ],
    conditionalFormats: [
      {
        target: 'cell',
        field: 'variance',
        when: { operator: 'less', value: 0 },
        style: { fill: '#ffe4e6', textColor: '#9f1239', fontWeight: 700 },
      },
      {
        target: 'row',
        when: { field: 'status', operator: 'equals', value: 'Risk' },
        style: { stroke: '#fb7185', lineWidth: 1.5 },
      },
    ],
  },
}
```

Conditions are data-only and bounded. Supported operators are `equals`, `not-equals`, `contains`, `starts-with`, `ends-with`, `greater`, `greater-or-equal`, `less`, `less-or-equal`, `between`, `in`, `is-null`, and `not-null`. Numeric operators require finite numbers, `between` requires exactly two finite numbers, and `in` accepts 1–128 scalar values. No expression strings, regular expressions, callbacks, raw CSS, or HTML are evaluated.

`grid` can be `true`, `false`, or `{ rows, columns, color, width }`. A cell's explicit `stroke`/`lineWidth` and the focus ring take precedence over the grid token.

## Cell visualizations

Each object column can add one compact, renderer-neutral `visual`. Values remain available as text, so the visual does not replace exact-value or accessible output.

| Type         | Declaration                                                | Behavior                                                                           |
| ------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Data bar     | `{ type: 'data-bar', min?, max?, color?, negativeColor? }` | Draws a signed in-cell bar from the zero baseline.                                 |
| Heatmap      | `{ type: 'heatmap', min?, max?, lowColor?, highColor? }`   | Interpolates a cell background across the column extent.                           |
| Progress     | `{ type: 'progress', min?, max?, color?, trackColor? }`    | Adds a compact progress track while keeping the formatted value visible.           |
| Sparkline    | `{ type: 'sparkline', color?, fill? }`                     | Draws a line from an array of at least two finite numbers.                         |
| Status badge | `{ type: 'status-badge', colors, defaultColor? }`          | Maps up to 64 scalar status labels to safe colors and chooses readable badge text. |

When `min` or `max` is omitted, numeric visuals use the transformed column extent. Equal-valued columns receive deterministic padding instead of dividing by zero. Explicit cell fill has precedence over a heatmap background.

## Merged cells

Use `merges` for deliberate rectangular regions and `mergeRepeats` for consecutive equal labels:

```js
mark: {
  type: 'table',
  options: {
    columns: ['region', 'metric', 'value'],
    mergeRepeats: ['region'],
    merges: [
      { row: 8, column: 'region', columnSpan: 2 },
      { row: 10, column: 0, rowSpan: 2, columnSpan: 2 },
    ],
  },
}
```

Merge coordinates are zero-based absolute positions after filter → group/pivot → sort, before virtual slicing. `column` accepts either an absolute visible-column index or a field name. `mergeRepeats` also accepts `{ field, includeNull }`; nulls are not merged unless explicitly enabled.

The compiler rejects one-cell regions, out-of-bounds spans, overlaps, duplicate repeat rules, spans larger than 256 cells, more than 2,048 resolved regions, and any merge crossing a frozen row or column boundary. A virtual window expands just enough to include the complete merge that it intersects, ensuring a covered cell is never rendered without its anchor. Only the anchor emits geometry and carries `anchorRow`, `anchorColumn`, `rowSpan`, and `columnSpan` metadata.

## Locale, date, and time formatting

Built-in formatter ids are `string`, `number`, `integer`, `percent`, `date`, `time`, `datetime`, and `json`. They honor the chart `locale`. Temporal columns accept `Date`, ISO date/datetime strings, and numeric Unix epoch milliseconds directly; numeric values are never converted through `String(number)`.

```js
columns: [
  {
    field: 'observedAt',
    header: 'Observed (Seoul)',
    formatter: 'datetime',
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  },
  {
    field: 'marketOpen',
    formatter: 'time',
    timeStyle: 'medium',
    timeZone: 'America/New_York',
  },
];
```

`dateStyle` and `timeStyle` accept `short`, `medium`, `long`, or `full`. An invalid locale or time-zone identifier falls back safely and deterministically instead of stopping chart compilation. Hosts compiling with a `RuntimeRegistry` can add a formatter with `registry.registerTableFormatter(id, formatter)` and reference that id from a column's `formatter` or legacy `mark.options.formatters` map. An unknown id is rejected.

## Interaction and accessibility

Rendered datum shapes carry layer id, row index, and the original row for hover/click hit testing in the standard profile. Supply a concise `accessibility.label`, a useful `description`, and an adjacent text or table fallback. Canvas ARIA metadata does not replace keyboard-readable page content.

The inspection viewport can magnify the rendered Scene table, but it is not sorting, paging, frozen-column navigation, or browser text zoom. Playback filtering is normally inappropriate for an exact-value reference because rows disappear by frame. Keep the adjacent semantic HTML table available to assistive technology and ordinary browser search; see [Common chart interactions](./interactions.md).

Table headers are live sort controls (click cycles ascending, descending, and input order; Shift-click builds a bounded multi-column sort). Cells use WAI-ARIA-grid arrow, Home/End, and PageUp/PageDown traversal. Runtime filter/group/pivot state is function-free, bounded, JSON-serializable, and emits `tablechange` after the Scene is recompiled:

`mark.options.frozenRows` and `frozenColumns` are anchored to the transformed table, not to either virtual slice. `windowOffset`/`windowLimit` move the row window and `columnOffset`/`columnLimit` move the column window while authored leading regions stay visible. Programmatic focus and keyboard traversal move only the necessary row or column window; entering a frozen cell does not reset either scroll position.

```ts
chart.setTableFilters('layer-0', [{ field: 'amount', operator: 'greater-or-equal', value: 10 }]);
chart.setTableGroup('layer-0', {
  fields: ['region'],
  aggregates: [{ field: 'amount', op: 'sum', as: 'total' }],
});
chart.setTablePivot('layer-0', {
  row: 'region',
  column: 'quarter',
  value: 'amount',
  op: 'sum',
});
chart.setTableRuntimeState('layer-0', {
  windowOffset: 1_000,
  windowLimit: 100,
  columnOffset: 40,
  columnLimit: 12,
});
chart.on('tablechange', ({ state, reason }) => console.log(state, reason));
```

## Editing, history, and export

Editing is opt-in per column. `editing` can disable the feature globally or declare a stable key and commit policy. Group and pivot results remain read-only because one derived cell can represent multiple source rows.

```js
mark: {
  type: 'table',
  options: {
    editing: { enabled: true, key: 'id', commit: 'enter-or-blur' },
    columns: [
      { field: 'id', editable: false },
      {
        field: 'score',
        editable: true,
        editor: { type: 'integer' },
        validation: { required: true, min: 0, max: 100 },
      },
      {
        field: 'status',
        editable: true,
        editor: { type: 'select', options: ['Ready', 'Review', 'Blocked'] },
        validation: { values: ['Ready', 'Review', 'Blocked'] },
      },
    ],
  },
}
```

Editors are `text`, `number`, `integer`, `date`, `datetime`, `boolean`, or `select`. A `date` edit accepts only a real `YYYY-MM-DD` calendar date. A `datetime` edit accepts `Date` values or strict ISO datetimes; an ISO datetime without an offset is interpreted as UTC, while a date-only string remains date-only. Locale-dependent strings such as `May 1, 2026` are never passed to `Date.parse`.

Validation supports `required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, and a bounded scalar `values` allowlist. `pattern` is a Unicode regular expression of at most 256 characters. The safe subset rejects invalid expressions, controls, backreferences, groups, alternation, unbounded quantifiers, nested/repeated quantifiers, excessive quantifier counts, and repetitions above 10,000. Pattern inputs are capped at 4,096 characters before matching. This keeps validation portable and fail-closed; use anchored patterns such as `^[A-Z]{2}-\d{4}$` for identifiers. Double-click or press Enter on an editable cell to open the overlay editor. Esc cancels; `commit` chooses Enter, blur, or both. Invalid edits do not mutate source data and emit a `tableeditchange` reason.

```js
chart.setTableCellValue('layer-0', { key: 'team-a' }, 'score', 91);
chart.undoTableEdit('layer-0');
chart.redoTableEdit('layer-0');
chart.resetTableData('layer-0');

const currentView = chart.getTableData('layer-0', 'view');
const sourceRows = chart.getTableData('layer-0', 'source');
const csv = chart.exportTableCSV('layer-0', 'view');
const json = chart.exportTableJSON('layer-0', 'source');

chart.on('tableeditchange', ({ row, field, newValue, valid, reason }) => {
  console.log({ row, field, newValue, valid, reason });
});
```

Numeric edit targets are indices in the current filtered/sorted view. A `{ key }` target addresses the unique authored source row even when a runtime filter currently hides it; duplicate keys, group/pivot output, filtered-out rows from authored transforms, and one-to-many or many-to-one lineage fail closed. For an invisible key target, `tableeditchange.row` is the stable source index because no current view index exists.

Compiled source cells expose `sourceRowIndex`, `editEnabled`, editor/validation metadata, and merged-anchor spans for hit testing and semantic integration. The runtime uses immutable source replacement with baseline/current copies and a bounded history of cell patches, rather than retaining a full row snapshot for every edit. Getters and exported rows are defensive copies.

## Performance profiles

The same `standard`, `large`, `ultra`, and `auto` profiles apply. Row and column virtualization, merge-aware window expansion, frozen regions, and bounded style/visual rules keep Scene size deterministic. Prefer a transformed view, grouping, filtering, or aggregation when the source contains more rows than a person can productively inspect at once; editing and export can still address the source/view distinction explicitly.

## Runnable example and regression coverage

- [default-family CDN gallery](../../examples/cdn/complete-chart-types.html)
- [Chart catalog compile tests](../../tests/extended-chart-types.test.mjs)
- [Generated visual asset](../assets/charts/table.svg)

[Back to chart guides](./README.md)
