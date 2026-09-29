# Optional spreadsheet surface

`graflume/spreadsheet` is a lazy, isolated editing surface for applications that need richer
grid interaction than the renderer-neutral [Table chart](charts/table.md). It does not change the
default, complete, or Spatial dependency graphs. The small facade owns a same-origin
`about:blank` iframe; the large runtime and stylesheet are loaded only inside that frame, so
portals, theme variables, and component styles do not enter the host document.

Use the Table chart when a chart layer, bounded TSV editing, and renderer-neutral output are
enough. Use this optional surface for a formula bar, cell formatting, table sort/filter controls,
find/replace, notes, links, validation, conditional formatting, or workbook snapshots.

## Assets and loading

The browser build publishes three independent files:

| Catalog key          | Tracked CDN asset                     | npm asset                                  |
| -------------------- | ------------------------------------- | ------------------------------------------ |
| `spreadsheet`        | `cdn/graflume.spreadsheet.global.js`  | `dist/graflume.spreadsheet.min.js`         |
| `spreadsheetRuntime` | `cdn/graflume.spreadsheet.runtime.js` | `dist/graflume.spreadsheet.runtime.min.js` |
| `spreadsheetStyle`   | `cdn/graflume.spreadsheet.css`        | `dist/graflume.spreadsheet.min.css`        |

Load the facade only when the user opens the editor. It adds
`Graflume.createSpreadsheet`; it does not load the runtime by itself. Read exact asset paths and
SHA-384 values from `catalog/graflume.catalog.json`, then pass the runtime and style URLs to the
factory. Cross-origin assets are rejected unless their matching, single SHA-384 values are
supplied. Same-origin URLs may omit integrity, although an exact immutable URL remains
recommended.

```js
const { bundles, bundleIntegrity } = catalog.package;

await loadScript(exactCommitUrl(bundles.spreadsheet), {
  integrity: bundleIntegrity.spreadsheet,
  crossOrigin: 'anonymous',
});

const handle = await Graflume.createSpreadsheet({
  container: document.querySelector('#editor'),
  runtimeUrl: exactCommitUrl(bundles.spreadsheetRuntime),
  runtimeIntegrity: bundleIntegrity.spreadsheetRuntime,
  styleUrl: exactCommitUrl(bundles.spreadsheetStyle),
  styleIntegrity: bundleIntegrity.spreadsheetStyle,
  profile: 'data-frame',
  locale: 'ko-KR',
  data: {
    columns: [
      { id: 'subject', label: '대상', readOnly: true },
      { id: 'value', label: '값', kind: 'number' },
    ],
    rows: [
      { id: 'row-1', values: { subject: 'A군', value: 12 } },
      { id: 'row-2', values: { subject: 'B군', value: 15 } },
    ],
  },
  async onCommit(change) {
    for (const rename of change.columnRenames) {
      await renameStoredColumn(rename.columnId, rename.after);
    }
    await saveOneAtomicChange(change);
  },
});
```

The ESM facade is available as `import { createSpreadsheet } from 'graflume/spreadsheet'`.
Runtime objects are intentionally not exposed through either entry point.

## Data-frame profile

`data-frame` is the safe host-synchronization profile. Every row and column needs a stable,
non-empty `id`. Column labels are trimmed and must also be non-empty and unique; comparison is
exact after trimming, so case remains meaningful. A column can declare `kind` as `string`,
`number`, `boolean`, `date`, or `mixed`, and can be `readOnly`. Cell content is a string, finite
number, boolean, `null`, or `{ formula: '=B2*10', result?: 20 }`.

Edit a visible header cell to rename that column. The logical column `id` remains stable, so cells,
selection, sorting, and host synchronization continue to address the same variable. Blank,
formula, or trim-duplicate names are restored to the last accepted header and emit a localized
`error`; `handle.renameColumn(columnId, label)` applies the same invariant for an accessible form
or other programmatic control and rejects invalid input before changing the workbook.

The sheet shape, hidden trailing row-identity column, and row/column membership remain protected.
Sorting moves the hidden identity with its row; selection and patch APIs continue to address
logical IDs rather than visual positions. Structural edits and writes to read-only columns fail
closed. JavaScript callers receive the same validation as TypeScript callers: duplicate addresses
or labels, unsafe object-property IDs, invalid kinds, non-finite values, and unknown IDs are
rejected before any cell is changed.

Default limits are 10,000 rows, 256 columns, 200,000 data cells, and 8 MiB for data or a complete
snapshot. Supplied limits must be positive safe integers. Snapshots accept only finite, acyclic,
plain JSON and also bound sheet count, declared dimensions, populated coordinates, nesting, and
bytes.

## Host-defined top-level menu panels

Applications can place their own workflow beside the built-in ribbon tabs without sending
callbacks or application state into the isolated runtime. Supply menus at creation time so they
exist before `createSpreadsheet()` resolves, or register one later with
`await handle.addTopLevelMenu(menu)`:

```js
const handle = await Graflume.createSpreadsheet({
  // runtime, style, profile, and data options omitted
  topLevelMenus: [
    {
      id: 'data-tools',
      label: '데이터 도구',
      order: 10,
      mount(container, context) {
        const tools = document.querySelector('#data-tools-template').content.cloneNode(true);
        tools.querySelector('[data-close]').addEventListener('click', context.close);
        container.append(tools);
      },
      unmount(container, context) {
        stopPendingWork(context.signal);
      },
    },
    {
      id: 'member-import',
      label: '내 파일',
      order: -100,
      disabled: !currentMember.canImport,
      mount(container) {
        container.append(buildImportForm());
      },
    },
  ],
});

const reports = await handle.addTopLevelMenu({
  id: 'reports',
  label: '보고서',
  mount(container, context) {
    container.append(buildReports(context.spreadsheet));
  },
});

reports.update({ label: '분석 결과', active: true });
reports.update({ disabled: true }); // closes it if open
reports.dispose();
```

The visible panel is a sibling of the iframe inside `.graflume-spreadsheet-shell`, not a node
adopted into the frame. Its `ownerDocument` is therefore the host document: existing application
CSS, localization observers, event delegation, and component runtimes continue to work. Graflume
positions the panel over the sheet viewport below the ribbon and formula bar, leaving the native
ribbon available. The sheet is inert and hidden from assistive technology while a panel is open.

Menu IDs start with an ASCII letter and contain at most 64 letters, digits, dots, underscores, or
hyphens. Labels contain 1–120 characters, IDs are unique for the spreadsheet lifetime, and at most
32 menus can be registered. Optional finite `order` uses the native ribbon sort order; lower values
appear earlier, while omitted values keep host menus after the built-in tabs in registration order.
`active: true` opens one initial menu; an active menu cannot also be disabled. The returned control
exposes immutable `id`, live `active` and `disabled` properties, plus `open()`, `update()`, and
idempotent `dispose()`. `handle.activeTopLevelMenuId` reports the open menu and
`handle.closeTopLevelMenu()` closes it.

The native ribbon remains a `tablist`; each menu is a `tab` with an iframe-local semantic
`tabpanel` proxy, while the host panel is also labelled as a `tabpanel`. Left/Right wrap through
enabled visible tabs, Home/End move to the ends, and Escape closes the panel and restores focus to
its trigger. Opening another menu unmounts the first. `context.signal` aborts before `unmount`
runs, and destroying the spreadsheet unmounts the active panel before removing its shell.

Mount and unmount exceptions are isolated and emitted through `error` with `menuId` and a
`mount`/`unmount` phase. A successful selection emits `menuaction` with only the menu ID. Menu
descriptors, callbacks, DOM, disabled state, and active state never enter `save()` output; opening,
updating, or disposing panels cannot change the data frame or workbook snapshot.

## Commit and event contract

One user edit or rectangular TSV paste produces one immutable `SpreadsheetBatchChange`:

```ts
type SpreadsheetBatchChange = {
  readonly id: string;
  readonly source:
    | 'edit'
    | 'paste'
    | 'patch'
    | 'replace'
    | 'load'
    | 'undo'
    | 'redo'
    | 'sort'
    | 'rename-column'
    | 'rollback';
  readonly edits: readonly {
    readonly rowId: string;
    readonly columnId: string;
    readonly before: SpreadsheetCellContent;
    readonly after: SpreadsheetCellContent;
  }[];
  readonly columnRenames: readonly {
    readonly columnId: string;
    readonly before: string;
    readonly after: string;
  }[];
  readonly timestamp: number;
};
```

Cell-only changes have an empty `columnRenames`; a direct header edit has source `rename-column`
and normally has an empty `edits`. The facade calls `onCommit(change)` once and serializes later
commits behind it. Persist cell edits and column renames as one host transaction. While that promise
is pending, mutating and view commands are frozen. Resolution acknowledges the change and then
emits `batchchange`. Rejection restores the accepted pre-change workbook, emits one `rollback`
batch with reversed cell edits and column renames plus `error`, and removes the rejected value from
undo/redo history. Reconstructing the workbook also clears the local engine history; a host that
needs history across a rejected commit should own that history above `onCommit`.

Subscribe with `handle.on('batchchange', listener)` and `handle.on('error', listener)`. Use
`onCommit` as the only external write boundary; do not repeat the same mutation from the later
accepted `batchchange` notification.

## Handle API

- `save()` and `load(snapshot)` round-trip bounded formula, format, filter, and workbook state.
- `getSelection()` and `setSelection(range)` use stable row and column IDs; passing `null` clears
  the active selection.
- `applyPatch(edits)` validates the complete patch atomically and returns its batch.
- `renameColumn(columnId, label)` trims and validates one logical column label without changing its
  stable ID.
- `replaceData(data)` rebuilds the protected frame and table.
- `undo()` and `redo()` use local history while no commit is pending.
- `addTopLevelMenu()`, `closeTopLevelMenu()`, and `activeTopLevelMenuId` manage host-owned panels
  without changing workbook state.
- `destroy()` waits briefly for child cleanup, removes message listeners and the iframe, and is
  idempotent.

Native keyboard editing, copy, and paste stay inside the iframe. A clipboard paste, including a
single-cell or multi-cell TSV paste, is reported as one `source: 'paste'` batch. The facade never
lets an unmodified arrow key wrap from one physical worksheet edge to the opposite edge; it stops
on the current boundary cell instead. Empty padding cells remain navigable, and Shift/Ctrl arrow,
Enter/Tab, and in-cell text navigation retain their native behavior. The facade never requests
arbitrary network access: its iframe policy
allows only the supplied script/style origins, inline component styles, and embedded image/font
data; connections and workers are disabled.

## Workbook profile and fallback

`workbook` keeps the general toolbar and workbook snapshot surface without data-frame structure
guards. `save()`/`load()` are the authoritative persistence boundary. Stable data-frame batch
mapping is guaranteed only while the original logical row/column frame remains intact; use
`data-frame` whenever a host mirrors edits into another data system.

The iframe has a localized accessible title and retains the grid's keyboard UI. Hosts should still
provide a plain table, download, or form fallback when scripts, the optional assets, a required
browser capability, or an async commit is unavailable. Destroy the handle before replacing the
container or navigating a single-page view.
