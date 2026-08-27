import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../geography/natural-earth-10m/', import.meta.url);
const EXPECTED_SOURCE_COMMIT = 'f1890d9f152c896d250a77557a5751a93d494776';
const EXPECTED_COUNTRIES = 263;
const EXPECTED_ISO_COUNTRIES = 249;
const EXPECTED_SOURCE_FEATURES = 4596;
const EXPECTED_REGIONS = 4501;
const EXPECTED_SOURCES = 248;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeRelativePath(value) {
  assert.equal(typeof value, 'string');
  assert.match(value, /^(?:countries\.geojson|regions\/[A-Z0-9-]+\.geojson)$/u);
  assert.equal(value.includes('..'), false);
  return value;
}

function validatePosition(value, path) {
  assert.ok(Array.isArray(value) && value.length >= 2, `${path} must be a coordinate pair`);
  assert.ok(Number.isFinite(value[0]) && value[0] >= -180 && value[0] <= 180, `${path}[0]`);
  assert.ok(Number.isFinite(value[1]) && value[1] >= -90 && value[1] <= 90, `${path}[1]`);
}

function validateRing(value, path) {
  assert.ok(Array.isArray(value) && value.length >= 4, `${path} must be a closed polygon ring`);
  value.forEach((position, index) => validatePosition(position, `${path}[${index}]`));
  assert.deepEqual(value.at(-1), value[0], `${path} must close exactly`);
}

function validateGeometry(value, path) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${path} geometry`);
  if (value.type === 'Polygon') {
    assert.ok(
      Array.isArray(value.coordinates) && value.coordinates.length > 0,
      `${path}.coordinates`,
    );
    value.coordinates.forEach((ring, index) => validateRing(ring, `${path}.coordinates[${index}]`));
    return;
  }
  assert.equal(value.type, 'MultiPolygon', `${path}.type`);
  assert.ok(
    Array.isArray(value.coordinates) && value.coordinates.length > 0,
    `${path}.coordinates`,
  );
  value.coordinates.forEach((polygon, polygonIndex) => {
    assert.ok(Array.isArray(polygon) && polygon.length > 0, `${path}.coordinates[${polygonIndex}]`);
    polygon.forEach((ring, ringIndex) =>
      validateRing(ring, `${path}.coordinates[${polygonIndex}][${ringIndex}]`),
    );
  });
}

function validateCollection(collection, source) {
  assert.equal(collection.type, 'FeatureCollection', `${source.id} type`);
  assert.ok(Array.isArray(collection.features) && collection.features.length > 0, source.id);
  const ids = new Set();
  for (const [index, feature] of collection.features.entries()) {
    assert.equal(feature.type, 'Feature', `${source.id} feature ${index}`);
    assert.equal(typeof feature.id, 'string', `${source.id} feature id`);
    assert.equal(ids.has(feature.id), false, `${source.id} duplicate ${feature.id}`);
    ids.add(feature.id);
    assert.equal(feature.properties?.id, feature.id, `${source.id} property id`);
    assert.equal(typeof feature.properties?.countryCode, 'string', `${source.id} country code`);
    assert.equal(typeof feature.properties?.name, 'string', `${source.id} name`);
    validateGeometry(feature.geometry, `${source.id}.features[${index}].geometry`);
  }
  return ids;
}

const manifestText = await readFile(new URL('./manifest.json', ROOT), 'utf8');
const catalogText = await readFile(new URL('./catalog.json', ROOT), 'utf8');
const manifest = JSON.parse(manifestText);
const catalog = JSON.parse(catalogText);

assert.equal(manifest.schemaVersion, '1');
assert.equal(manifest.id, 'natural-earth-admin-0-admin-1-10m');
assert.equal(manifest.revision, EXPECTED_SOURCE_COMMIT);
assert.match(manifest.attribution, /Natural Earth/u);
assert.ok(Array.isArray(manifest.sources));
assert.equal(manifest.sources.length, EXPECTED_SOURCES);
assert.equal(catalog.schemaVersion, '1');
assert.equal(catalog.sourceCommit, EXPECTED_SOURCE_COMMIT);
assert.equal(catalog.license, 'public-domain');
assert.equal(catalog.countryCount, EXPECTED_COUNTRIES);
assert.equal(catalog.isoCountryCount, EXPECTED_ISO_COUNTRIES);
assert.equal(catalog.sourceAdmin1FeatureCount, EXPECTED_SOURCE_FEATURES);
assert.equal(catalog.regionCount, EXPECTED_REGIONS);
assert.equal(catalog.detail.quantizationDegrees, 0.001);
assert.match(catalog.boundaryPolicy, /not legal authority/u);

const sourceIds = new Set();
const sourcePaths = new Set();
const featureIds = new Set();
const regionIds = new Set();
const countriesById = new Map(catalog.countries.map((country) => [country.id, country]));
assert.equal(countriesById.size, EXPECTED_COUNTRIES);
assert.equal(countriesById.has('XK'), true, 'Kosovo user-assigned code must be represented');
for (const code of ['KR', 'US', 'JP', 'CN', 'IN', 'BR', 'FR', 'GB', 'AQ', 'UM'])
  assert.equal(countriesById.has(code), true, `${code} country coverage`);

let countryFeatureCount = 0;
let regionFeatureCount = 0;
let totalSourceBytes = 0;
for (const source of manifest.sources) {
  assert.equal(sourceIds.has(source.id), false, `duplicate source ${source.id}`);
  sourceIds.add(source.id);
  assert.ok(source.level === 'country' || source.level === 'region', `${source.id} level`);
  assert.equal(source.format, 'geojson', `${source.id} format`);
  assert.match(source.sha256, /^[a-f0-9]{64}$/u, `${source.id} sha256`);
  assert.ok(Number.isSafeInteger(source.byteLength) && source.byteLength > 0, `${source.id} bytes`);
  assert.ok(
    Array.isArray(source.countries) && source.countries.length > 0,
    `${source.id} countries`,
  );
  const relativePath = safeRelativePath(source.url);
  assert.equal(sourcePaths.has(relativePath), false, `duplicate source path ${relativePath}`);
  sourcePaths.add(relativePath);
  const body = await readFile(new URL(relativePath, ROOT));
  assert.equal(body.byteLength, source.byteLength, `${source.id} byteLength`);
  assert.equal(sha256(body), source.sha256, `${source.id} sha256`);
  totalSourceBytes += body.byteLength;
  const ids = validateCollection(JSON.parse(body.toString('utf8')), source);
  if (source.level === 'country') {
    assert.equal(source.id, 'natural-earth-10m-countries');
    countryFeatureCount += ids.size;
    for (const id of ids) {
      assert.equal(featureIds.has(id), false, `duplicate country feature ${id}`);
      featureIds.add(id);
    }
  } else {
    assert.equal(source.countries.length, 1, `${source.id} must be one lazy country shard`);
    assert.equal(countriesById.has(source.countries[0]), true, `${source.id} catalog country`);
    regionFeatureCount += ids.size;
    for (const id of ids) {
      assert.equal(regionIds.has(id), false, `duplicate region feature ${id}`);
      regionIds.add(id);
    }
  }
}

assert.equal(countryFeatureCount, EXPECTED_COUNTRIES);
assert.equal(regionFeatureCount, EXPECTED_REGIONS);
assert.equal(featureIds.size, EXPECTED_COUNTRIES);
assert.equal(regionIds.size, EXPECTED_REGIONS);
assert.equal(
  totalSourceBytes,
  manifest.sources.reduce((sum, source) => sum + source.byteLength, 0),
);

let catalogRegionCount = 0;
for (const country of catalog.countries) {
  assert.equal(typeof country.id, 'string');
  assert.equal(typeof country.name, 'string');
  assert.ok(Array.isArray(country.bounds) && country.bounds.length === 4, `${country.id} bounds`);
  assert.equal(Array.isArray(country.regions), true, `${country.id} regions`);
  assert.equal(country.regionCount, country.regions.length, `${country.id} region count`);
  const localIds = new Set();
  for (const region of country.regions) {
    assert.equal(localIds.has(region.id), false, `${country.id} duplicate catalog region`);
    localIds.add(region.id);
    assert.equal(regionIds.has(region.id), true, `${country.id} missing geometry ${region.id}`);
    assert.equal(typeof region.name, 'string');
    assert.ok(Array.isArray(region.bounds) && region.bounds.length === 4, `${region.id} bounds`);
  }
  catalogRegionCount += country.regions.length;
}
assert.equal(catalogRegionCount, EXPECTED_REGIONS);
for (const [country, expected] of [
  ['KR', 17],
  ['US', 52],
  ['JP', 47],
  ['DE', 16],
  ['IN', 36],
  ['BR', 27],
])
  assert.equal(countriesById.get(country)?.regionCount, expected, `${country} principal regions`);
for (const region of ['KR-11', 'US-CA', 'JP-13', 'DE-BY', 'IN-DL', 'BR-SP'])
  assert.equal(regionIds.has(region), true, `${region} coverage`);

console.log(
  `Natural Earth boundary assets: ${countryFeatureCount} countries/entities, ${regionFeatureCount} principal regions, ${manifest.sources.length} lazy sources, ${totalSourceBytes} bytes.`,
);
