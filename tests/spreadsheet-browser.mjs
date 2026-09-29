import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserCandidates = [
  process.env.GRAFLUME_CHROMIUM_PATH,
  '/home/lv999/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
  chromium.executablePath(),
].filter(Boolean);
const executablePath = browserCandidates.find((candidate) => existsSync(candidate));

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
]);

async function serveRepository(cors = false) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(`${root}${path.sep}`) || !existsSync(filename)) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader(
      'content-type',
      mimeTypes.get(path.extname(filename)) ?? 'application/octet-stream',
    );
    if (cors) response.setHeader('access-control-allow-origin', '*');
    createReadStream(filename).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Test server has no port.');
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

test(
  'optional spreadsheet runs in an isolated real browser',
  { timeout: 90_000 },
  async (context) => {
    assert.ok(executablePath, 'A Chromium executable is required for the browser contract test.');
    const { server, origin } = await serveRepository();
    context.after(() => new Promise((resolve) => server.close(resolve)));
    const { server: assetServer, origin: assetOrigin } = await serveRepository(true);
    context.after(() => new Promise((resolve) => assetServer.close(resolve)));
    const browser = await chromium.launch({ executablePath, headless: true });
    context.after(() => browser.close());
    const browserContext = await browser.newContext({ viewport: { width: 1100, height: 760 } });
    await browserContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    const page = await browserContext.newPage();
    const externalRequests = [];
    const allRequests = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        pageErrors.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('request', (request) => {
      allRequests.push(request.url());
      if (!request.url().startsWith(origin) && request.url() !== 'about:blank') {
        externalRequests.push(request.url());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(`${origin}/tests/browser/spreadsheet.html`, { waitUntil: 'domcontentloaded' });
    try {
      await page.evaluate(() => window.spreadsheetReady);
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\n${pageErrors.join('\n')}`,
      );
    }
    await page.waitForFunction(
      () => document.querySelector('iframe')?.dataset.graflumeSpreadsheetReady === 'true',
    );

    const initial = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      return {
        style: getComputedStyle(document.querySelector('#host-proof')).color,
        selection: await handle.getSelection(),
        snapshot: await handle.save(),
        iframeNodes: handle.element.contentDocument.querySelectorAll('*').length,
      };
    });
    assert.equal(initial.style, 'rgb(12, 34, 56)');
    assert.ok(initial.iframeNodes > 20, 'the isolated engine should render a real workbook');
    assert.equal(initial.snapshot.data.rows[0].values.value, 2);
    assert.equal(initial.snapshot.workbook.sheets['graflume-sheet'].cellData[0][0].v, 'Name');
    assert.equal(initial.snapshot.workbook.sheets['graflume-sheet'].columnData[3].hd, 1);
    const childFrame = page.frames().find((frame) => frame.parentFrame() === page.mainFrame());
    assert.ok(childFrame, 'the isolated spreadsheet frame should exist');
    const sheetCanvas = childFrame.locator('canvas[id^="gfs-sheet-main-canvas_"]').first();
    assert.equal(await sheetCanvas.count(), 1, 'the real spreadsheet canvas should render');
    const nameBox = childFrame.locator(
      '[data-u-comp="formula-bar"] [data-u-comp="defined-name"] input',
    );
    assert.equal(await nameBox.count(), 1, 'the real spreadsheet name box should render');

    const selectAddress = async (address) => {
      await nameBox.fill(address);
      await nameBox.press('Enter');
      assert.equal(await nameBox.inputValue(), address);
    };
    const expectBoundaryStop = async (address, key) => {
      await selectAddress(address);
      await sheetCanvas.focus();
      await page.keyboard.press(key);
      assert.equal(await nameBox.inputValue(), address, `${address} + ${key} must not wrap`);
    };
    await expectBoundaryStop('A1', 'ArrowLeft');
    await expectBoundaryStop('A1', 'ArrowUp');
    await expectBoundaryStop('Z100', 'ArrowRight');
    await expectBoundaryStop('Z100', 'ArrowDown');

    await selectAddress('A1');
    await sheetCanvas.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await nameBox.inputValue(), 'B1');
    await selectAddress('A1');
    await sheetCanvas.focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await nameBox.inputValue(), 'A2');

    await selectAddress('B2');
    await sheetCanvas.focus();
    await page.keyboard.press('Shift+ArrowRight');
    assert.deepEqual(await page.evaluate(() => window.spreadsheetHandle.getSelection()), {
      start: { rowId: 'row-a', columnId: 'value' },
      end: { rowId: 'row-a', columnId: 'result' },
    });
    await selectAddress('A1');
    await sheetCanvas.focus();

    const menuStructure = await page.evaluate(() => {
      const handle = window.spreadsheetHandle;
      const child = handle.element.contentDocument;
      const panel = document.querySelector('.graflume-spreadsheet-panel');
      const dataTools = child.querySelector('[data-graflume-menu-id="data-tools"]');
      const memberImport = child.querySelector('[data-graflume-menu-id="member-import"]');
      const proxy = child.querySelector('[data-graflume-menu-panel=""]');
      return {
        shellContainsFrame:
          handle.element.parentElement?.classList.contains('graflume-spreadsheet-shell') ?? false,
        tablistRole: dataTools?.parentElement?.getAttribute('role'),
        tabRole: dataTools?.getAttribute('role'),
        controls: dataTools?.getAttribute('aria-controls'),
        proxyId: proxy?.id,
        proxyRole: proxy?.getAttribute('role'),
        panelRole: panel?.getAttribute('role'),
        panelHidden: panel?.hidden,
        disabled: memberImport?.matches(':disabled'),
        firstTab: child.querySelector('[role="tablist"] > [role="tab"]')?.textContent?.trim(),
        activeId: handle.activeTopLevelMenuId,
      };
    });
    assert.deepEqual(menuStructure, {
      shellContainsFrame: true,
      tablistRole: 'tablist',
      tabRole: 'tab',
      controls: menuStructure.proxyId,
      proxyId: menuStructure.proxyId,
      proxyRole: 'tabpanel',
      panelRole: 'tabpanel',
      panelHidden: true,
      disabled: true,
      firstTab: 'Data tools',
      activeId: null,
    });
    assert.ok(menuStructure.proxyId);

    const menuSnapshotBefore = await page.evaluate(async () =>
      JSON.stringify(await window.spreadsheetHandle.save()),
    );
    await childFrame.locator('[data-graflume-menu-id="data-tools"]').click();
    await page.waitForFunction(
      () =>
        window.spreadsheetHandle.activeTopLevelMenuId === 'data-tools' &&
        !document.querySelector('.graflume-spreadsheet-panel')?.hidden,
    );
    const openedMenu = await page.evaluate(() => {
      const handle = window.spreadsheetHandle;
      const panel = document.querySelector('.graflume-spreadsheet-panel');
      const sheet = handle.element.contentDocument.querySelector('[data-range-selector]');
      const proxy = handle.element.contentDocument.querySelector(
        '[data-graflume-menu-panel="data-tools"]',
      );
      return {
        activeId: handle.activeTopLevelMenuId,
        ownerDocumentIsHost: window.menuLifecycle.ownerDocumentIsHost,
        mounts: window.menuLifecycle.mounts,
        actions: window.spreadsheetMenuActions.map((event) => event.menuId),
        panelLabel: panel?.getAttribute('aria-label'),
        panelTop: Number.parseFloat(panel?.style.top ?? ''),
        panelHeight: Number.parseFloat(panel?.style.height ?? ''),
        contentTop: sheet?.getBoundingClientRect().top,
        contentHeight: sheet?.getBoundingClientRect().height,
        sheetInert: sheet?.inert,
        proxyVisible: proxy?.hidden === false,
      };
    });
    assert.equal(openedMenu.activeId, 'data-tools');
    assert.equal(openedMenu.ownerDocumentIsHost, true);
    assert.equal(openedMenu.mounts, 1);
    assert.deepEqual(openedMenu.actions, ['data-tools']);
    assert.equal(openedMenu.panelLabel, 'Data tools');
    assert.ok(openedMenu.panelTop >= openedMenu.contentTop - 1);
    assert.ok(Math.abs(openedMenu.panelHeight - openedMenu.contentHeight) < 1);
    assert.equal(openedMenu.sheetInert, true);
    assert.equal(openedMenu.proxyVisible, true);
    assert.equal(await page.locator('.graflume-spreadsheet-panel .host-menu-content').count(), 1);

    await page.locator('.graflume-spreadsheet-panel input').focus();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.spreadsheetHandle.activeTopLevelMenuId === null);
    await page.waitForFunction(
      () =>
        window.spreadsheetHandle.element.contentDocument.activeElement?.dataset?.graflumeMenuId ===
        'data-tools',
    );
    const closedMenu = await page.evaluate(async () => ({
      unmounts: window.menuLifecycle.unmounts,
      hidden: document.querySelector('.graflume-spreadsheet-panel')?.hidden,
      focusedId:
        window.spreadsheetHandle.element.contentDocument.activeElement?.dataset?.graflumeMenuId ??
        null,
      snapshot: JSON.stringify(await window.spreadsheetHandle.save()),
    }));
    assert.equal(closedMenu.unmounts, 1);
    assert.equal(closedMenu.hidden, true);
    assert.equal(closedMenu.focusedId, 'data-tools');
    assert.equal(closedMenu.snapshot, menuSnapshotBefore);

    await childFrame.locator('[data-graflume-menu-id="data-tools"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(
      await childFrame.evaluate(
        () => document.activeElement?.getAttribute('data-graflume-menu-id') ?? 'built-in',
      ),
      'built-in',
    );
    await page.keyboard.press('End');
    assert.equal(
      await childFrame.evaluate(
        () => document.activeElement?.getAttribute('data-graflume-menu-id') ?? 'built-in',
      ),
      'built-in',
    );
    await page.keyboard.press('Home');
    assert.equal(
      await childFrame.evaluate(
        () => document.activeElement?.getAttribute('data-graflume-menu-id') ?? 'built-in',
      ),
      'data-tools',
    );

    const dynamicMenu = await page.evaluate(async () => {
      const handle = window.spreadsheetHandle;
      const control = await handle.addTopLevelMenu({
        id: 'dynamic-tools',
        label: 'Dynamic tools',
        mount(container) {
          const button = document.createElement('button');
          button.textContent = 'Dynamic content';
          container.append(button);
        },
        unmount() {
          throw new Error('menu unmount failed');
        },
      });
      window.dynamicMenuControl = control;
      const opened = control.open();
      control.update({ label: 'Updated tools' });
      control.update({ disabled: true });
      const reopenedWhileDisabled = control.open();
      control.update({ disabled: false, active: true });
      return {
        opened,
        reopenedWhileDisabled,
        active: control.active,
        disabled: control.disabled,
        activeId: handle.activeTopLevelMenuId,
      };
    });
    assert.deepEqual(dynamicMenu, {
      opened: true,
      reopenedWhileDisabled: false,
      active: true,
      disabled: false,
      activeId: 'dynamic-tools',
    });
    assert.equal(
      await childFrame.locator('[data-graflume-menu-id="dynamic-tools"]').textContent(),
      'Updated tools',
    );
    await page.evaluate(() => {
      window.dynamicMenuControl.dispose();
    });
    const disposedMenu = await page.evaluate(() => {
      const messages = [];
      for (const operation of [
        () => window.dynamicMenuControl.open(),
        () => window.dynamicMenuControl.update({ label: 'No longer available' }),
      ]) {
        try {
          operation();
        } catch (error) {
          messages.push(error.message);
        }
      }
      return {
        messages,
        activeId: window.spreadsheetHandle.activeTopLevelMenuId,
        error: (() => {
          const event = window.spreadsheetErrorEvents.at(-1);
          return {
            message: event?.error.message,
            menuId: event?.menuId,
            phase: event?.phase,
          };
        })(),
        hidden: window.spreadsheetHandle.element.contentDocument.querySelector(
          '[data-graflume-menu-id="dynamic-tools"]',
        )?.hidden,
      };
    });
    assert.equal(disposedMenu.messages.length, 2);
    assert.equal(disposedMenu.activeId, null);
    assert.equal(disposedMenu.hidden, true);
    assert.deepEqual(disposedMenu.error, {
      message: 'menu unmount failed',
      menuId: 'dynamic-tools',
      phase: 'unmount',
    });

    const isolatedMenuError = await page.evaluate(async () => {
      const handle = window.spreadsheetHandle;
      const control = await handle.addTopLevelMenu({
        id: 'broken-tools',
        label: 'Broken tools',
        mount() {
          throw new Error('menu mount failed');
        },
      });
      const opened = control.open();
      const saved = await handle.save();
      const event = window.spreadsheetErrorEvents.at(-1);
      return {
        opened,
        value: saved.data.rows[0].values.value,
        error: {
          message: event?.error.message,
          menuId: event?.menuId,
          phase: event?.phase,
        },
      };
    });
    assert.equal(isolatedMenuError.opened, false);
    assert.equal(isolatedMenuError.value, 2);
    assert.equal(isolatedMenuError.error.message, 'menu mount failed');
    assert.equal(isolatedMenuError.error.menuId, 'broken-tools');
    assert.equal(isolatedMenuError.error.phase, 'mount');

    const requestCountBeforeRibbonSwitch = allRequests.length;
    const iconReadiness = await childFrame.evaluate(async () => {
      const state = () => {
        const toolbar = document.querySelector('[data-u-comp="ribbon-toolbar"]');
        const controls = [...(toolbar?.querySelectorAll('[data-u-command]') ?? [])];
        const textControl = controls.find(
          (control) => control.getAttribute('data-u-command') === 'sheet.toolbar.text-to-number',
        );
        return {
          label: toolbar?.getAttribute('aria-label'),
          controlCount: controls.length,
          svgCount: controls.filter((control) => control.querySelector('svg') !== null).length,
          missingIconControls: controls
            .filter((control) => control !== textControl && control.querySelector('svg') === null)
            .map((control) => control.getAttribute('data-u-command')),
          textControl:
            textControl === undefined
              ? null
              : {
                  label: textControl.textContent?.trim(),
                  width: textControl.getBoundingClientRect().width,
                  visible: textControl.getClientRects().length > 0,
                  hasSvg: textControl.querySelector('svg') !== null,
                },
        };
      };
      const tab = (label) =>
        [...document.querySelectorAll('[role="tab"]')].find(
          (candidate) => candidate.textContent?.trim() === label,
        );
      tab('Data')?.click();
      const dataSameTask = state();
      await Promise.resolve();
      const dataFirstMicrotask = state();
      tab('Start')?.click();
      const startSameTask = state();
      await Promise.resolve();
      const startFirstMicrotask = state();
      return { dataSameTask, dataFirstMicrotask, startSameTask, startFirstMicrotask };
    });
    assert.ok(iconReadiness.dataSameTask.controlCount > 0);
    assert.ok(iconReadiness.dataSameTask.svgCount > 0);
    assert.deepEqual(iconReadiness.dataSameTask.missingIconControls, []);
    assert.equal(iconReadiness.dataSameTask.textControl, null);
    assert.ok(iconReadiness.dataFirstMicrotask.controlCount > 0);
    assert.ok(iconReadiness.dataFirstMicrotask.svgCount > 0);
    assert.equal(iconReadiness.dataFirstMicrotask.label, 'Data');
    assert.deepEqual(iconReadiness.dataFirstMicrotask.missingIconControls, []);
    assert.deepEqual(iconReadiness.dataFirstMicrotask.textControl?.label, 'Text to Number');
    assert.ok(iconReadiness.dataFirstMicrotask.textControl?.width > 40);
    assert.equal(iconReadiness.dataFirstMicrotask.textControl?.visible, true);
    assert.equal(iconReadiness.dataFirstMicrotask.textControl?.hasSvg, false);
    assert.ok(iconReadiness.startSameTask.controlCount > 0);
    assert.ok(iconReadiness.startSameTask.svgCount > 0);
    assert.equal(iconReadiness.startSameTask.label, 'Data');
    assert.deepEqual(iconReadiness.startSameTask.missingIconControls, []);
    assert.deepEqual(iconReadiness.startSameTask.textControl?.label, 'Text to Number');
    assert.ok(iconReadiness.startSameTask.textControl?.width > 40);
    assert.equal(iconReadiness.startSameTask.textControl?.visible, true);
    assert.equal(iconReadiness.startSameTask.textControl?.hasSvg, false);
    assert.ok(iconReadiness.startFirstMicrotask.controlCount > 0);
    assert.ok(iconReadiness.startFirstMicrotask.svgCount > 0);
    assert.equal(iconReadiness.startFirstMicrotask.label, 'Start');
    assert.deepEqual(iconReadiness.startFirstMicrotask.missingIconControls, []);
    assert.equal(iconReadiness.startFirstMicrotask.textControl, null);
    await page.waitForTimeout(50);
    assert.equal(allRequests.length, requestCountBeforeRibbonSwitch);

    const crossRuntimePath = path.join(root, 'dist/graflume.spreadsheet.runtime.js');
    const crossStylePath = path.join(root, 'dist/graflume.spreadsheet.css');
    const crossRuntimeIntegrity = `sha384-${createHash('sha384')
      .update(await readFile(crossRuntimePath))
      .digest('base64')}`;
    const crossStyleIntegrity = `sha384-${createHash('sha384')
      .update(await readFile(crossStylePath))
      .digest('base64')}`;
    const crossOrigin = await page.evaluate(
      async ({ assetOrigin, runtimeIntegrity, styleIntegrity }) => {
        const invalidMessages = [];
        for (const invalid of [{ profile: 'bogus' }, { locale: 'fr-FR' }]) {
          const invalidContainer = document.createElement('div');
          document.body.append(invalidContainer);
          try {
            await Graflume.createSpreadsheet({
              container: invalidContainer,
              runtimeUrl: '/dist/graflume.spreadsheet.runtime.js',
              styleUrl: '/dist/graflume.spreadsheet.css',
              ...invalid,
            });
          } catch (error) {
            invalidMessages.push(error.message);
          }
          invalidContainer.remove();
        }
        const blockedContainer = document.createElement('div');
        document.body.append(blockedContainer);
        let blockedMessage = '';
        try {
          await Graflume.createSpreadsheet({
            container: blockedContainer,
            runtimeUrl: `${assetOrigin}/dist/graflume.spreadsheet.runtime.js`,
            styleUrl: `${assetOrigin}/dist/graflume.spreadsheet.css`,
          });
        } catch (error) {
          blockedMessage = error.message;
        }
        blockedContainer.remove();

        const paddedContainer = document.createElement('div');
        document.body.append(paddedContainer);
        let paddedMessage = '';
        try {
          await Graflume.createSpreadsheet({
            container: paddedContainer,
            runtimeUrl: `${assetOrigin}/dist/graflume.spreadsheet.runtime.js`,
            runtimeIntegrity: `${runtimeIntegrity}=`,
            styleUrl: `${assetOrigin}/dist/graflume.spreadsheet.css`,
            styleIntegrity,
          });
        } catch (error) {
          paddedMessage = error.message;
        }
        paddedContainer.remove();

        const container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '300px';
        document.body.append(container);
        const handle = await Graflume.createSpreadsheet({
          container,
          runtimeUrl: `${assetOrigin}/dist/graflume.spreadsheet.runtime.js`,
          runtimeIntegrity,
          styleUrl: `${assetOrigin}/dist/graflume.spreadsheet.css`,
          styleIntegrity,
          profile: 'data-frame',
          locale: 'en-US',
          data: {
            columns: [{ id: 'value', label: 'Value' }],
            rows: [{ id: 'row', values: { value: 1 } }],
          },
          topLevelMenus: [
            {
              id: 'initial-tools',
              label: 'Initial tools',
              active: true,
              mount(panel) {
                panel.textContent = 'Initial panel';
                window.initialMenuOwnedByHost = panel.ownerDocument === document;
              },
            },
          ],
        });
        const saved = await handle.save();
        const activeMenuId = handle.activeTopLevelMenuId;
        const initialMenuOwnedByHost = window.initialMenuOwnedByHost;
        await handle.destroy();
        container.remove();
        return {
          invalidMessages,
          blockedMessage,
          paddedMessage,
          value: saved.data.rows[0].values.value,
          activeMenuId,
          initialMenuOwnedByHost,
        };
      },
      { assetOrigin, runtimeIntegrity: crossRuntimeIntegrity, styleIntegrity: crossStyleIntegrity },
    );
    assert.match(crossOrigin.invalidMessages[0], /profile must be data-frame or workbook/);
    assert.match(crossOrigin.invalidMessages[1], /locale must be ko-KR or en-US/);
    assert.match(crossOrigin.blockedMessage, /runtimeIntegrity.*SHA-384/);
    assert.match(crossOrigin.paddedMessage, /runtimeIntegrity.*SHA-384/);
    assert.equal(crossOrigin.value, 1);
    assert.equal(crossOrigin.activeMenuId, 'initial-tools');
    assert.equal(crossOrigin.initialMenuOwnedByHost, true);

    const invalidPatch = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      const before = await handle.save();
      const messages = [];
      for (const patch of [
        [
          { rowId: 'row-a', columnId: 'value', value: 41 },
          { rowId: 'row-a', columnId: 'value', value: 43 },
        ],
        [{ rowId: 'row-a', columnId: 'value', value: Number.NaN }],
        [{ rowId: 'row-a', columnId: 'name', value: 'changed' }],
      ]) {
        try {
          await handle.applyPatch(patch);
        } catch (error) {
          messages.push(error.message);
        }
      }
      return { before, after: await handle.save(), messages };
    });
    assert.match(invalidPatch.messages[0], /duplicate cell address/);
    assert.match(invalidPatch.messages[1], /supported cell value/);
    assert.match(invalidPatch.messages[2], /read-only/);
    assert.deepEqual(invalidPatch.after.data, invalidPatch.before.data);

    const renameStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    const renameChange = await page.evaluate(() =>
      window.spreadsheetHandle.renameColumn('value', ' Score '),
    );
    await page.waitForFunction(
      ({ id, events, batches }) =>
        window.spreadsheetEvents.slice(events).some((change) => change.id === id) &&
        window.spreadsheetBatches.slice(batches).some((change) => change.id === id),
      { id: renameChange.id, ...renameStart },
    );
    const renamed = await page.evaluate(async () => {
      const snapshot = await window.spreadsheetHandle.save();
      const tableResource = snapshot.workbook.resources.find(
        (resource) => resource.name === 'SHEET_TABLE_PLUGIN',
      );
      const table = JSON.parse(tableResource.data)['graflume-sheet'].tables[0];
      return {
        snapshot,
        tableLabels: table.columns.map((column) => column.displayName),
        header: window.spreadsheetHandle.element.contentDocument.querySelector('canvas') !== null,
      };
    });
    assert.equal(renameChange.source, 'rename-column');
    assert.deepEqual(renameChange.edits, []);
    assert.deepEqual(renameChange.columnRenames, [
      { columnId: 'value', before: 'Value', after: 'Score' },
    ]);
    assert.equal(renamed.snapshot.data.columns[1].id, 'value');
    assert.equal(renamed.snapshot.data.columns[1].label, 'Score');
    assert.equal(renamed.snapshot.workbook.sheets['graflume-sheet'].cellData[0][1].v, 'Score');
    assert.deepEqual(renamed.tableLabels.slice(0, 3), ['Name', 'Score', 'Result']);
    assert.equal(renamed.header, true);

    const invalidRenames = await page.evaluate(async () => {
      const before = await window.spreadsheetHandle.save();
      const messages = [];
      for (const [columnId, label] of [
        ['result', ' Score '],
        ['result', '   '],
        ['missing', 'Available'],
      ]) {
        try {
          await window.spreadsheetHandle.renameColumn(columnId, label);
        } catch (error) {
          messages.push(error.message);
        }
      }
      return { before, after: await window.spreadsheetHandle.save(), messages };
    });
    assert.match(invalidRenames.messages[0], /Duplicate column label: Score/);
    assert.match(invalidRenames.messages[1], /non-empty string/);
    assert.match(invalidRenames.messages[2], /unknown column id/);
    assert.deepEqual(invalidRenames.after, invalidRenames.before);

    const directRenameStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    await sheetCanvas.focus();
    await page.keyboard.press('Control+Home');
    await page.keyboard.type('Participant');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents[events]?.source === 'rename-column' &&
        window.spreadsheetBatches[batches]?.source === 'rename-column',
      directRenameStart,
    );
    const directRename = await page.evaluate(
      async ({ events }) => ({
        change: window.spreadsheetEvents[events],
        snapshot: await window.spreadsheetHandle.save(),
      }),
      directRenameStart,
    );
    assert.deepEqual(directRename.change.columnRenames, [
      { columnId: 'name', before: 'Name', after: 'Participant' },
    ]);
    assert.equal(directRename.snapshot.data.columns[0].id, 'name');
    assert.equal(directRename.snapshot.data.columns[0].label, 'Participant');

    const duplicateHeaderStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
      errors: window.spreadsheetErrors.length,
    }));
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('Score');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      ({ errors }) => window.spreadsheetErrors.length >= errors + 1,
      duplicateHeaderStart,
    );
    const duplicateHeader = await page.evaluate(async () => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
      error: window.spreadsheetErrors.at(-1),
      snapshot: await window.spreadsheetHandle.save(),
    }));
    assert.equal(duplicateHeader.events, duplicateHeaderStart.events);
    assert.equal(duplicateHeader.batches, duplicateHeaderStart.batches);
    assert.equal(duplicateHeader.error, 'Column names cannot be blank or duplicated.');
    assert.equal(duplicateHeader.snapshot.data.columns[0].label, 'Participant');

    await page.waitForTimeout(120);
    const blankHeaderStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
      errors: window.spreadsheetErrors.length,
    }));
    await page.keyboard.press('Delete');
    await page.waitForFunction(
      ({ errors }) => window.spreadsheetErrors.length >= errors + 1,
      blankHeaderStart,
    );
    const blankHeader = await page.evaluate(async () => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
      error: window.spreadsheetErrors.at(-1),
      snapshot: await window.spreadsheetHandle.save(),
    }));
    assert.equal(blankHeader.events, blankHeaderStart.events);
    assert.equal(blankHeader.batches, blankHeaderStart.batches);
    assert.equal(blankHeader.error, 'Column names cannot be blank or duplicated.');
    assert.equal(blankHeader.snapshot.data.columns[0].label, 'Participant');

    const rejectedRenameStart = await page.evaluate(() => ({
      batches: window.spreadsheetBatches.length,
      errors: window.spreadsheetErrors.length,
    }));
    const rejectedRenameChange = await page.evaluate(async () => {
      window.rejectNextCommit = true;
      return window.spreadsheetHandle.renameColumn('value', 'Rejected score');
    });
    await page.waitForFunction(
      ({ batches, errors }) =>
        window.spreadsheetBatches[batches]?.source === 'rollback' &&
        window.spreadsheetErrors.length >= errors + 1,
      rejectedRenameStart,
    );
    const rejectedRename = await page.evaluate(
      async ({ batches }) => ({
        snapshot: await window.spreadsheetHandle.save(),
        rollback: window.spreadsheetBatches[batches],
      }),
      rejectedRenameStart,
    );
    assert.equal(rejectedRenameChange.source, 'rename-column');
    assert.equal(rejectedRename.snapshot.data.columns[1].label, 'Score');
    assert.deepEqual(rejectedRename.rollback.columnRenames, [
      { columnId: 'value', before: 'Rejected score', after: 'Score' },
    ]);

    const selection = {
      start: { rowId: 'row-b', columnId: 'value' },
      end: { rowId: 'row-c', columnId: 'result' },
    };
    assert.deepEqual(
      await page.evaluate(async (value) => {
        const handle = await window.spreadsheetReady;
        await handle.setSelection(value);
        return handle.getSelection();
      }, selection),
      selection,
    );

    const realEditStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      await handle.setSelection({
        start: { rowId: 'row-b', columnId: 'value' },
        end: { rowId: 'row-b', columnId: 'value' },
      });
    });
    await sheetCanvas.focus();
    await page.keyboard.type('23');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents.length >= events + 1 &&
        window.spreadsheetBatches.length >= batches + 1,
      realEditStart,
    );
    const realEdit = await page.evaluate(async ({ events, batches }) => {
      return {
        event: window.spreadsheetEvents[events],
        batch: window.spreadsheetBatches[batches],
        snapshot: await window.spreadsheetHandle.save(),
      };
    }, realEditStart);
    assert.equal(realEdit.event.source, 'edit');
    assert.deepEqual(realEdit.event.edits, [
      { rowId: 'row-b', columnId: 'value', before: 5, after: 23 },
    ]);
    assert.deepEqual(realEdit.batch, realEdit.event);
    assert.equal(realEdit.snapshot.data.rows[1].values.value, 23);

    const patchStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    const patchChange = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      return handle.applyPatch([
        { rowId: 'row-a', columnId: 'value', value: 17 },
        { rowId: 'row-b', columnId: 'result', value: 19 },
      ]);
    });
    await page.waitForFunction(
      ({ id, events, batches }) =>
        window.spreadsheetEvents.slice(events).some((change) => change.id === id) &&
        window.spreadsheetBatches.slice(batches).some((change) => change.id === id),
      { id: patchChange.id, ...patchStart },
    );
    const patch = await page.evaluate(
      async (start) => ({
        commits: window.spreadsheetEvents.length - start.events,
        batches: window.spreadsheetBatches.slice(start.batches),
        snapshot: await window.spreadsheetHandle.save(),
      }),
      patchStart,
    );
    assert.equal(patchChange.edits.length, 2);
    assert.equal(patch.commits, 1);
    assert.equal(patch.batches.length, 1);
    assert.equal(patch.snapshot.data.rows[0].values.value, 17);
    assert.equal(patch.snapshot.data.rows[1].values.result, 19);

    const formulaChange = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      return handle.applyPatch([
        { rowId: 'row-a', columnId: 'result', value: { formula: '=B2*10' } },
      ]);
    });
    const formula = await page.evaluate(async (id) => {
      const deadline = performance.now() + 10_000;
      let consecutive = 0;
      while (performance.now() < deadline) {
        const snapshot = await window.spreadsheetHandle.save();
        if (
          window.spreadsheetBatches.some((change) => change.id === id) &&
          snapshot.data.rows[0].values.result?.result === 170
        ) {
          consecutive += 1;
          if (consecutive === 3) return snapshot;
        } else {
          consecutive = 0;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error('Formula result did not stabilize.');
    }, formulaChange.id);
    assert.deepEqual(formula.data.rows[0].values.result, { formula: '=B2*10', result: 170 });

    const historyStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    const undone = await page.evaluate(() => window.spreadsheetHandle.undo());
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents[events]?.source === 'undo' &&
        window.spreadsheetBatches[batches]?.source === 'undo',
      historyStart,
    );
    const afterUndo = await page.evaluate(() => window.spreadsheetHandle.save());
    const redone = await page.evaluate(() => window.spreadsheetHandle.redo());
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents[events + 1]?.source === 'redo' &&
        window.spreadsheetBatches[batches + 1]?.source === 'redo',
      historyStart,
    );
    const afterRedo = await page.evaluate(async () => {
      const deadline = performance.now() + 10_000;
      while (performance.now() < deadline) {
        const snapshot = await window.spreadsheetHandle.save();
        if (snapshot.data.rows[0].values.result?.result === 170) return snapshot;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error('Redo formula result did not stabilize.');
    });
    const history = await page.evaluate(
      async ({ events }) => ({
        events: window.spreadsheetEvents.slice(events),
      }),
      historyStart,
    );
    assert.equal(undone, true);
    assert.equal(redone, true);
    assert.equal(afterUndo.data.rows[0].values.result, 3);
    assert.deepEqual(afterRedo.data.rows[0].values.result, {
      formula: '=B2*10',
      result: 170,
    });
    assert.deepEqual(
      history.events.map(({ source }) => source),
      ['undo', 'redo'],
    );

    const singlePasteStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      await handle.setSelection({
        start: { rowId: 'row-a', columnId: 'value' },
        end: { rowId: 'row-a', columnId: 'value' },
      });
      await navigator.clipboard.writeText('19');
    });
    await sheetCanvas.focus();
    await page.keyboard.press('Control+V');
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents[events]?.source === 'paste' &&
        window.spreadsheetBatches[batches]?.source === 'paste',
      singlePasteStart,
    );
    const singlePaste = await page.evaluate(
      async ({ events }) => ({
        change: window.spreadsheetEvents[events],
        snapshot: await window.spreadsheetHandle.save(),
      }),
      singlePasteStart,
    );
    assert.equal(singlePaste.change.source, 'paste');
    assert.equal(singlePaste.change.edits.length, 1);
    assert.equal(singlePaste.snapshot.data.rows[0].values.value, 19);

    const noOpPasteStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    await page.evaluate(async () => navigator.clipboard.writeText('19'));
    await sheetCanvas.focus();
    await page.keyboard.press('Control+V');
    await page.waitForTimeout(100);
    const afterNoOpPaste = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    assert.deepEqual(afterNoOpPaste, noOpPasteStart);
    await page.keyboard.type('23');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents[events]?.source === 'edit' &&
        window.spreadsheetBatches[batches]?.source === 'edit',
      noOpPasteStart,
    );
    const afterNoOpOrdinaryEdit = await page.evaluate(async () => window.spreadsheetHandle.save());
    assert.equal(afterNoOpOrdinaryEdit.data.rows[0].values.value, 23);

    const pasteStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      await handle.setSelection({
        start: { rowId: 'row-b', columnId: 'value' },
        end: { rowId: 'row-b', columnId: 'value' },
      });
      await navigator.clipboard.writeText('41\t43\n47\t53');
    });
    await sheetCanvas.focus();
    await page.keyboard.press('Control+V');
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents[events]?.source === 'paste' &&
        window.spreadsheetBatches[batches]?.source === 'paste',
      pasteStart,
    );
    const pasted = await page.evaluate(
      async ({ events, batches }) => ({
        events: window.spreadsheetEvents.slice(events),
        batches: window.spreadsheetBatches.slice(batches),
        snapshot: await window.spreadsheetHandle.save(),
      }),
      pasteStart,
    );
    assert.equal(pasted.events.length, 1);
    assert.equal(pasted.batches.length, 1);
    assert.equal(pasted.events[0].source, 'paste');
    assert.equal(pasted.events[0].edits.length, 4);
    assert.deepEqual(pasted.batches[0], pasted.events[0]);
    assert.equal(pasted.snapshot.data.rows[1].values.value, 41);
    assert.equal(pasted.snapshot.data.rows[1].values.result, 43);
    assert.equal(pasted.snapshot.data.rows[2].values.value, 47);
    assert.equal(pasted.snapshot.data.rows[2].values.result, 53);

    const roundTrip = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      const saved = await handle.save();
      await handle.load(saved);
      return handle.save();
    });
    assert.deepEqual(roundTrip.data, pasted.snapshot.data);

    const sortStart = await page.evaluate(() => ({
      events: window.spreadsheetEvents.length,
      batches: window.spreadsheetBatches.length,
    }));
    await sheetCanvas.click({ position: { x: 210, y: 68 } });
    const descending = childFrame.getByText('Descending', { exact: true });
    await descending.waitFor({ state: 'visible' });
    await descending.click();
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents[events]?.source === 'sort' &&
        window.spreadsheetBatches[batches]?.source === 'sort',
      sortStart,
    );
    const sortEvents = await page.evaluate(
      ({ events }) => window.spreadsheetEvents.slice(events),
      sortStart,
    );
    assert.equal(sortEvents.length, 1);
    assert.equal(sortEvents[0].source, 'sort');
    assert.equal(sortEvents[0].edits[0].rowId, 'row-a');
    assert.equal(sortEvents[0].edits[0].columnId, 'result');
    assert.equal(sortEvents[0].edits[0].after.formula, '=B4*10');
    const sortedMapping = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      const selection = {
        start: { rowId: 'row-a', columnId: 'result' },
        end: { rowId: 'row-a', columnId: 'result' },
      };
      await handle.setSelection(selection);
      const selected = await handle.getSelection();
      const change = await handle.applyPatch([{ rowId: 'row-c', columnId: 'result', value: 59 }]);
      while (
        window.spreadsheetBatches.length < 1 ||
        window.spreadsheetBatches.at(-1).id !== change.id
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return { selected, change, snapshot: await handle.save() };
    });
    assert.deepEqual(sortedMapping.selected, {
      start: { rowId: 'row-a', columnId: 'result' },
      end: { rowId: 'row-a', columnId: 'result' },
    });
    assert.equal(sortedMapping.change.edits[0].rowId, 'row-c');
    assert.equal(sortedMapping.snapshot.data.rows[2].values.result, 59);

    const readOnlyEventCount = await page.evaluate(() => window.spreadsheetEvents.length);
    await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      await handle.setSelection({
        start: { rowId: 'row-b', columnId: 'name' },
        end: { rowId: 'row-b', columnId: 'name' },
      });
    });
    await sheetCanvas.focus();
    await page.keyboard.type('Changed');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const readOnlyResult = await page.evaluate(async () => ({
      eventCount: window.spreadsheetEvents.length,
      snapshot: await window.spreadsheetHandle.save(),
    }));
    assert.equal(readOnlyResult.eventCount, readOnlyEventCount);
    assert.equal(readOnlyResult.snapshot.data.rows[1].values.name, 'Beta');

    const pendingStart = await page.evaluate(() => {
      window.commitDelay = 150;
      return {
        events: window.spreadsheetEvents.length,
        batches: window.spreadsheetBatches.length,
      };
    });
    await page.evaluate(async () => {
      await window.spreadsheetHandle.setSelection({
        start: { rowId: 'row-c', columnId: 'value' },
        end: { rowId: 'row-c', columnId: 'value' },
      });
    });
    await sheetCanvas.focus();
    await page.keyboard.type('61');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.commitPending === true);
    const pendingError = await page.evaluate(async () => {
      try {
        await window.spreadsheetHandle.applyPatch([
          { rowId: 'row-b', columnId: 'value', value: 99 },
        ]);
        return '';
      } catch (error) {
        return error.message;
      }
    });
    assert.match(pendingError, /commit is still pending/);
    await page.waitForFunction(
      ({ events, batches }) =>
        window.spreadsheetEvents.length >= events + 1 &&
        window.spreadsheetBatches.length >= batches + 1,
      pendingStart,
    );
    const pendingSnapshot = await page.evaluate(() => window.spreadsheetHandle.save());
    assert.equal(pendingSnapshot.data.rows[1].values.value, 41);
    assert.equal(pendingSnapshot.data.rows[2].values.value, 61);

    const rejectedStart = await page.evaluate(() => ({
      batches: window.spreadsheetBatches.length,
      errors: window.spreadsheetErrors.length,
    }));
    await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      window.rejectNextCommit = true;
      await handle.applyPatch([{ rowId: 'row-c', columnId: 'value', value: 999 }]);
    });
    await page.waitForFunction(
      ({ batches, errors }) =>
        window.spreadsheetBatches[batches]?.source === 'rollback' &&
        window.spreadsheetErrors.length >= errors + 1,
      rejectedStart,
    );
    const rejected = await page.evaluate(
      async ({ batches }) => ({
        snapshot: await window.spreadsheetHandle.save(),
        batches: window.spreadsheetBatches.slice(batches),
        errors: window.spreadsheetErrors.slice(),
      }),
      rejectedStart,
    );
    assert.equal(rejected.snapshot.data.rows[2].values.value, 61);
    assert.equal(rejected.batches[0].source, 'rollback');
    assert.match(rejected.errors.at(-1), /commit rejected by test/);

    const rejectedHistory = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      const eventCount = window.spreadsheetEvents.length;
      const undone = await handle.undo();
      const afterUndo = await handle.save();
      const redone = await handle.redo();
      const afterRedo = await handle.save();
      return {
        undone,
        redone,
        afterUndo,
        afterRedo,
        events: window.spreadsheetEvents.slice(eventCount),
      };
    });
    assert.equal(rejectedHistory.undone, false);
    assert.equal(rejectedHistory.redone, false);
    assert.equal(rejectedHistory.afterUndo.data.rows[2].values.value, 61);
    assert.equal(rejectedHistory.afterRedo.data.rows[2].values.value, 61);
    assert.equal(
      rejectedHistory.events.some((change) => change.edits.some((edit) => edit.after === 999)),
      false,
    );

    const mutationIsolation = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      const start = window.spreadsheetBatches.length;
      window.mutateNextCommit = true;
      const first = await handle.applyPatch([{ rowId: 'row-a', columnId: 'value', value: 71 }]);
      while (window.spreadsheetBatches.length < start + 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      const accepted = window.spreadsheetBatches.at(-1);
      const second = await handle.applyPatch([{ rowId: 'row-a', columnId: 'value', value: 73 }]);
      while (window.spreadsheetBatches.length < start + 2) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return {
        first,
        second,
        accepted,
        frozen: window.commitChangeWasFrozen,
        snapshot: await handle.save(),
      };
    });
    assert.equal(mutationIsolation.frozen, true);
    assert.equal(mutationIsolation.accepted.id, mutationIsolation.first.id);
    assert.equal(mutationIsolation.accepted.edits[0].rowId, 'row-a');
    assert.equal(mutationIsolation.second.edits[0].before, 71);
    assert.equal(mutationIsolation.snapshot.data.rows[0].values.value, 73);

    const listenerIsolation = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      const start = window.spreadsheetBatches.length;
      const offBatch = handle.on('batchchange', () => {
        throw new Error('throwing batch listener');
      });
      const offError = handle.on('error', () => {
        throw new Error('throwing error listener');
      });
      const first = await handle.applyPatch([{ rowId: 'row-b', columnId: 'result', value: 67 }]);
      while (window.spreadsheetBatches.length < start + 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      offBatch();
      offError();
      const second = await handle.applyPatch([{ rowId: 'row-b', columnId: 'result', value: 69 }]);
      while (window.spreadsheetBatches.length < start + 2) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return {
        first,
        second,
        errors: window.spreadsheetErrors.slice(),
        snapshot: await handle.save(),
      };
    });
    assert.match(listenerIsolation.errors.at(-1), /throwing batch listener/);
    assert.equal(listenerIsolation.second.edits[0].before, 67);
    assert.equal(listenerIsolation.snapshot.data.rows[1].values.result, 69);

    const emptyFrameRename = await page.evaluate(async () => {
      const container = document.createElement('div');
      container.style.width = '600px';
      container.style.height = '400px';
      document.body.append(container);
      const handle = await Graflume.createSpreadsheet({
        container,
        runtimeUrl: '../../dist/graflume.spreadsheet.runtime.js',
        styleUrl: '../../dist/graflume.spreadsheet.css',
        profile: 'data-frame',
        locale: 'en-US',
        data: {
          columns: [
            { id: 'empty-name', label: 'Empty name' },
            { id: 'empty-value', label: 'Empty value' },
          ],
          rows: [],
        },
      });
      const change = await handle.renameColumn('empty-value', ' Renamed empty value ');
      const snapshot = await handle.save();
      await handle.destroy();
      container.remove();
      return { change, snapshot };
    });
    assert.deepEqual(emptyFrameRename.change.columnRenames, [
      { columnId: 'empty-value', before: 'Empty value', after: 'Renamed empty value' },
    ]);
    assert.equal(emptyFrameRename.snapshot.data.rows.length, 0);
    assert.equal(emptyFrameRename.snapshot.data.columns[1].id, 'empty-value');
    assert.equal(emptyFrameRename.snapshot.data.columns[1].label, 'Renamed empty value');
    assert.equal(
      emptyFrameRename.snapshot.workbook.sheets['graflume-sheet'].cellData[0][1].v,
      'Renamed empty value',
    );

    const hostAfter = await page.evaluate(
      () => getComputedStyle(document.querySelector('#host-proof')).color,
    );
    assert.equal(hostAfter, 'rgb(12, 34, 56)');
    const forbiddenDomText = await page.evaluate(async () => {
      const handle = await window.spreadsheetReady;
      return `${document.documentElement.outerHTML}\n${handle.element.contentDocument.documentElement.outerHTML}`;
    });
    const token = String.fromCodePoint(117, 110, 105, 118, 101, 114);
    const tokenPatterns = [
      new RegExp(`@${token}js`, 'i'),
      new RegExp(`${token}-`, 'i'),
      new RegExp(`(?:^|[^a-z])${token}(?:$|[^a-z])`, 'i'),
      new RegExp(`${token}(?=[A-Z])`),
      new RegExp(`${token[0].toUpperCase()}${token.slice(1)}(?=[A-Z]|$|[^a-z])`),
    ];
    for (const pattern of tokenPatterns) assert.doesNotMatch(forbiddenDomText, pattern);
    assert.deepEqual(externalRequests.sort(), [
      `${assetOrigin}/dist/graflume.spreadsheet.css`,
      `${assetOrigin}/dist/graflume.spreadsheet.runtime.js`,
    ]);
    assert.deepEqual(pageErrors, []);

    assert.equal(
      await page.evaluate(async () => {
        const handle = await window.spreadsheetReady;
        await handle.destroy();
        return document.querySelectorAll('iframe').length;
      }),
      0,
    );
  },
);
