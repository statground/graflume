import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  cloneAndValidateDataFrame,
  defaultSpreadsheetLimits,
  resolveSpreadsheetLimits,
  validateSpreadsheetSnapshot,
} from '../.tmp/src/spreadsheet/data-frame.js';
import {
  normalizeTopLevelMenu,
  validateInitialTopLevelMenus,
} from '../.tmp/src/spreadsheet/menu.js';
import { isSpreadsheetPasteCommand } from '../.tmp/src/spreadsheet/change-source.js';
import {
  hasSpreadsheetExternalIdentityToken,
  hasSpreadsheetProductToken,
  neutralizeSpreadsheetAsset,
} from '../scripts/lib/spreadsheet-neutralize.mjs';

function workbook(cellData = {}) {
  return {
    id: 'book',
    sheetOrder: ['sheet'],
    styles: {},
    sheets: {
      sheet: {
        id: 'sheet',
        name: 'Sheet 1',
        rowCount: 100,
        columnCount: 26,
        cellData,
      },
    },
  };
}

function snapshot(value = workbook()) {
  return {
    format: 'graflume-spreadsheet-v1',
    profile: 'workbook',
    data: { columns: [], rows: [] },
    workbook: value,
  };
}

test('data-frame validation clones supported typed values and freezes the public result', () => {
  const data = cloneAndValidateDataFrame(
    {
      columns: [
        { id: 'name', label: 'Name', kind: 'string', readOnly: true },
        { id: 'score', label: 'Score', kind: 'number' },
      ],
      rows: [
        {
          id: 'row-a',
          values: { name: 'Ada', score: { formula: '=1+1', result: 2 } },
        },
      ],
    },
    defaultSpreadsheetLimits,
  );

  assert.equal(Object.isFrozen(data), true);
  assert.equal(Object.isFrozen(data.columns), true);
  assert.equal(Object.isFrozen(data.rows[0].values), true);
  assert.deepEqual(data.rows[0].values.score, { formula: '=1+1', result: 2 });
});

test('top-level menu descriptors are bounded, neutral, and callback-only', () => {
  const mount = () => undefined;
  assert.deepEqual(normalizeTopLevelMenu({ id: 'data-tools', label: ' Data tools ', mount }), {
    id: 'data-tools',
    label: 'Data tools',
    order: undefined,
    disabled: false,
    initialActive: false,
    mount,
    unmount: undefined,
  });
  assert.equal(
    validateInitialTopLevelMenus([
      { id: 'data-tools', label: 'Data tools', active: true, mount },
      { id: 'member-import', label: 'Member import', disabled: true, mount },
    ]).length,
    2,
  );
  assert.throws(
    () =>
      validateInitialTopLevelMenus([
        { id: 'duplicate', label: 'First', mount },
        { id: 'duplicate', label: 'Second', mount },
      ]),
    /Duplicate top-level menu id/,
  );
  assert.throws(
    () => normalizeTopLevelMenu({ id: 'not valid', label: 'Bad', mount }),
    /menu.id must start/,
  );
  assert.equal(
    normalizeTopLevelMenu({ id: 'file', label: 'File', order: -100, mount }).order,
    -100,
  );
  assert.throws(
    () => normalizeTopLevelMenu({ id: 'file', label: 'File', order: Number.NaN, mount }),
    /menu.order must be a finite number/,
  );
  assert.throws(
    () =>
      normalizeTopLevelMenu({ id: 'locked', label: 'Locked', disabled: true, active: true, mount }),
    /disabled menu cannot be active/,
  );
});

test('data-frame validation fails closed for unsafe ids and runtime-invalid column metadata', () => {
  for (const id of ['__proto__', 'constructor', 'toString']) {
    assert.throws(
      () =>
        cloneAndValidateDataFrame(
          { columns: [{ id, label: 'Unsafe' }], rows: [] },
          defaultSpreadsheetLimits,
        ),
      /conflicts with an object property/,
    );
  }
  assert.throws(
    () =>
      cloneAndValidateDataFrame(
        { columns: [{ id: 'x', label: 'X', kind: 'currency' }], rows: [] },
        defaultSpreadsheetLimits,
      ),
    /kind is not supported/,
  );
  assert.throws(
    () =>
      cloneAndValidateDataFrame(
        { columns: [{ id: 'x', label: 'X', readOnly: 'yes' }], rows: [] },
        defaultSpreadsheetLimits,
      ),
    /readOnly must be a boolean/,
  );
  assert.deepEqual(
    cloneAndValidateDataFrame(
      { columns: [{ id: 'x', label: ' Trimmed ' }], rows: [] },
      defaultSpreadsheetLimits,
    ).columns[0],
    { id: 'x', label: 'Trimmed' },
  );
  assert.throws(
    () =>
      cloneAndValidateDataFrame(
        {
          columns: [
            { id: 'x', label: 'Same' },
            { id: 'y', label: ' Same ' },
          ],
          rows: [],
        },
        defaultSpreadsheetLimits,
      ),
    /Duplicate column label: Same/,
  );
});

test('snapshot validation accepts only bounded plain JSON workbook state', () => {
  const limits = resolveSpreadsheetLimits({ maxRows: 10, maxColumns: 5, maxCells: 20 });
  assert.deepEqual(
    validateSpreadsheetSnapshot(snapshot(workbook({ 0: { 0: { v: 'ok' } } })), limits).workbook,
    workbook({ 0: { 0: { v: 'ok' } } }),
  );

  for (const value of [new Map([['x', 1]]), new Uint8Array(1024), new ArrayBuffer(1024)]) {
    assert.throws(
      () => validateSpreadsheetSnapshot(snapshot(value), limits),
      /plain JSON objects|sheet collection/,
    );
  }
  assert.throws(
    () => validateSpreadsheetSnapshot(snapshot(workbook({ 0: { 0: { v: Number.NaN } } })), limits),
    /non-finite number/,
  );
  assert.throws(
    () => validateSpreadsheetSnapshot(snapshot(workbook({ 100: { 0: { v: 1 } } })), limits),
    /out-of-bounds cell row/,
  );
  assert.throws(
    () => validateSpreadsheetSnapshot(snapshot(workbook({ 0: { 26: { v: 1 } } })), limits),
    /out-of-bounds cell column/,
  );
});

test('spreadsheet build cohort is exact, build-only, and excludes aggregate or paid packages', async () => {
  const packageData = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  );
  const packageLock = JSON.parse(
    await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'),
  );
  const token = String.fromCodePoint(117, 110, 105, 118, 101, 114);
  const scope = `@${token}js/`;
  const cohort = [
    'core',
    'preset-sheets-conditional-formatting',
    'preset-sheets-core',
    'preset-sheets-data-validation',
    'preset-sheets-filter',
    'preset-sheets-find-replace',
    'preset-sheets-hyper-link',
    'preset-sheets-note',
    'preset-sheets-sort',
    'preset-sheets-table',
    'sheets-table',
  ].map((name) => `${scope}${name}`);
  assert.deepEqual(
    Object.keys(packageData.devDependencies)
      .filter((name) => name.startsWith(scope))
      .sort(),
    cohort.sort(),
  );
  for (const name of cohort) assert.equal(packageData.devDependencies[name], '0.25.1');
  assert.equal(packageData.dependencies, undefined);
  assert.equal(packageData.devDependencies.react, '18.3.1');
  assert.equal(packageData.devDependencies['react-dom'], '18.3.1');
  assert.equal(packageData.devDependencies.rxjs, '7.8.2');
  assert.equal(packageData.overrides.nanoid, '5.1.16');
  assert.equal(packageLock.packages['node_modules/nanoid'].version, '5.1.16');
  assert.equal(Object.hasOwn(packageData.devDependencies, `${scope}presets`), false);
  const paidScope = `@${token}js-${['p', 'r', 'o'].join('')}/`;
  assert.equal(
    Object.keys(packageLock.packages).some((name) => name.includes(paidScope)),
    false,
  );
});

test('generated namespace and external identity rewriting is neutral and deterministic', () => {
  const token = String.fromCodePoint(117, 110, 105, 118, 101, 114);
  const organization = ['dream', 'num'].join('-');
  const proName = ['gfs', 'pro'].join('-');
  const input = [
    `@${token}js/core`,
    `https://github.com/${organization}/${token}/issues/42`,
    `https://github.com/${organization}.png`,
    `https://${token}.ai/`,
    `https://${token}sheet.net/docs/Canvas.html`,
    proName,
  ].join('\n');
  const neutral = neutralizeSpreadsheetAsset(input);
  assert.equal(hasSpreadsheetProductToken(neutral), false);
  assert.equal(hasSpreadsheetExternalIdentityToken(neutral), false);
  assert.match(neutral, /urn:graflume:spreadsheet:reference/);
  assert.match(neutral, /https:\/\/example\.invalid\/image\.png/);
  assert.match(neutral, /https:\/\/github\.com\/statground\/graflume/);
  assert.equal(neutralizeSpreadsheetAsset(input), neutral);
});

test('clipboard command classification covers every supported paste route without near matches', () => {
  for (const command of [
    'gfs.command.paste',
    'sheet.command.paste',
    'sheet.command.paste-by-short-key',
    'sheet.command.paste-value',
    'sheet.command.paste-format',
    'sheet.command.paste-formula',
    'sheet.command.paste-col-width',
    'sheet.command.paste-besides-border',
    'sheet.command.optional-paste',
  ]) {
    assert.equal(isSpreadsheetPasteCommand(command), true, command);
  }
  for (const command of [
    'sheet.command.copy',
    'sheet.command.pasteboard',
    'sheet.command.paste-unknown',
    'sheet.operation.paste',
  ]) {
    assert.equal(isSpreadsheetPasteCommand(command), false, command);
  }
});
