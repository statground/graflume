import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const additionalApis = [
  'radar',
  'tree',
  'graph',
  'chord',
  'funnel',
  'parallel',
  'boxplot',
  'effectScatter',
  'lines',
  'heatmap',
  'pictorialBar',
  'themeRiver',
  'sunburst',
  'custom',
];

const defaultModule = await import(new URL('../dist/graflume.js', import.meta.url));
const completeModule = await import(new URL('../dist/graflume.complete.js', import.meta.url));

assert.equal(defaultModule.chartTypeCatalog.length, 31);
assert.equal(completeModule.fullCatalog.length, 45);
assert.equal(completeModule.additionalChartTypeCatalog.length, 14);
assert.equal(completeModule.capabilities().marks.length, 41);
for (const api of additionalApis) assert.equal(typeof completeModule[api], 'function', api);

async function loadBrowserGlobal(filename) {
  const code = await readFile(new URL(`../dist/${filename}`, import.meta.url), 'utf8');
  const context = vm.createContext({
    console,
    clearTimeout,
    setTimeout,
  });
  vm.runInContext(code, context, { filename });
  return context.Graflume;
}

const defaultGlobal = await loadBrowserGlobal('graflume.global.js');
const completeGlobal = await loadBrowserGlobal('graflume.complete.global.js');

assert.ok(defaultGlobal);
assert.ok(completeGlobal);
assert.equal(defaultGlobal.chartTypeCatalog.length, 31);
assert.equal(completeGlobal.fullCatalog.length, 45);
for (const api of additionalApis) assert.equal(typeof completeGlobal[api], 'function', api);

console.log('Verified default and complete ESM/browser bundles.');
