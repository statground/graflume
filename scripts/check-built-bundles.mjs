import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const additionalApis = [
  'polar',
  'polarLine',
  'polarScatter',
  'polarBar',
  'radar',
  'tree',
  'graph',
  'chord',
  'funnel',
  'funnelArea',
  'parallel',
  'parallelCategories',
  'boxplot',
  'effectScatter',
  'lines',
  'heatmap',
  'image',
  'ternary',
  'smith',
  'scatterMatrix',
  'carpet',
  'carpetScatter',
  'carpetContour',
  'pictorialBar',
  'themeRiver',
  'sunburst',
  'custom',
];

const defaultModule = await import(new URL('../dist/graflume.js', import.meta.url));
const completeModule = await import(new URL('../dist/graflume.complete.js', import.meta.url));
const spatialModule = await import(new URL('../dist/graflume.spatial.js', import.meta.url));

assert.equal(defaultModule.chartTypeCatalog.length, 22);
assert.equal(defaultModule.chartVariantCatalog.length, 39);
assert.equal(completeModule.fullCatalog.length, 41);
assert.equal(completeModule.fullVariantCatalog.length, 162);
assert.equal(completeModule.additionalChartTypeCatalog.length, 11);
assert.equal(completeModule.additionalChartVariantCatalog.length, 27);
assert.equal(completeModule.seriesChartTypeCatalog.length, 8);
assert.equal(completeModule.seriesChartVariantCatalog.length, 96);
assert.equal(completeModule.seriesCompatibilityCatalog.length, 117);
assert.equal(completeModule.seriesCompatibilityIds.length, 117);
assert.equal(completeModule.resolveSeriesType('area-spline-range').familyId, 'interval');
assert.equal(completeModule.resolveSeriesType('area-spline-range').variantId, 'area-spline-range');
assert.equal(completeModule.capabilities().marks.length, 79);
for (const api of additionalApis) assert.equal(typeof completeModule[api], 'function', api);
for (const entry of completeModule.seriesChartTypeCatalog) {
  assert.equal(typeof completeModule[entry.quickApi], 'function', entry.quickApi);
}
assert.equal(spatialModule.spatialSpecVersion, '0.1');
assert.equal(spatialModule.spatialChartFamilies.length, 3);
assert.equal(spatialModule.spatialCatalogBoundary.totalCanonicalFamilies, 44);
assert.equal(spatialModule.spatialCatalogBoundary.spatialVariants, 7);
assert.equal(spatialModule.spatialCompatibilityModes[0].canonicalFamilyId, 'map');
for (const api of [
  'createSpatial',
  'surface',
  'mesh',
  'volume',
  'isosurface',
  'vectorCone',
  'streamtube',
  'spatialScatter',
  'globe',
]) {
  assert.equal(typeof spatialModule[api], 'function', api);
}

async function loadBrowserGlobal(filename, globalName = 'Graflume') {
  const code = await readFile(new URL(`../dist/${filename}`, import.meta.url), 'utf8');
  const context = vm.createContext({
    console,
    clearTimeout,
    setTimeout,
  });
  vm.runInContext(code, context, { filename });
  return context[globalName];
}

const defaultGlobal = await loadBrowserGlobal('graflume.global.js');
const completeGlobal = await loadBrowserGlobal('graflume.complete.global.js');
const spatialGlobal = await loadBrowserGlobal('graflume.spatial.global.js', 'GraflumeSpatial');

assert.ok(defaultGlobal);
assert.ok(completeGlobal);
assert.ok(spatialGlobal);
assert.equal(defaultGlobal.chartTypeCatalog.length, 22);
assert.equal(defaultGlobal.chartVariantCatalog.length, 39);
assert.equal(completeGlobal.fullCatalog.length, 41);
assert.equal(completeGlobal.fullVariantCatalog.length, 162);
assert.equal(completeGlobal.seriesChartTypeCatalog.length, 8);
assert.equal(completeGlobal.seriesChartVariantCatalog.length, 96);
assert.equal(completeGlobal.seriesCompatibilityCatalog.length, 117);
assert.equal(completeGlobal.seriesCompatibilityIds.length, 117);
assert.equal(completeGlobal.resolveSeriesType('area-spline-range').familyId, 'interval');
assert.equal(completeGlobal.resolveSeriesType('area-spline-range').variantId, 'area-spline-range');
for (const api of additionalApis) assert.equal(typeof completeGlobal[api], 'function', api);
for (const entry of completeGlobal.seriesChartTypeCatalog) {
  assert.equal(typeof completeGlobal[entry.quickApi], 'function', entry.quickApi);
}
assert.equal(spatialGlobal.spatialSpecVersion, '0.1');
assert.equal(spatialGlobal.spatialChartFamilies.length, 3);
assert.equal(spatialGlobal.spatialCatalogBoundary.totalCanonicalFamilies, 44);
assert.equal(spatialGlobal.spatialCompatibilityModes[0].canonicalFamilyId, 'map');
assert.equal(typeof spatialGlobal.compileSpatial, 'function');
assert.equal(typeof spatialGlobal.globe, 'function');

console.log('Verified default, complete, and spatial ESM/browser bundles.');
