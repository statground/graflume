import test from 'node:test';
import assert from 'node:assert/strict';

import { compile } from '../.tmp/src/index.js';
import {
  NATURAL_EARTH_WORLD_110M_FEATURE_COUNT,
  naturalEarthCountries110m,
} from '../.tmp/src/geography/natural-earth-world-110m.generated.js';
import {
  geographicViewport,
  isGeographicPosition,
  naturalEarthCountry,
  projectGeographicPosition,
} from '../.tmp/src/marks/geographic.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const dimensions = { width: 680, height: 400 };

function mapSpec(mark, data, x = 'longitude', y = 'latitude') {
  return {
    data,
    mark,
    x: { field: x, type: x === 'region' ? 'nominal' : 'quantitative' },
    y: { field: y, type: 'quantitative' },
  };
}

function countryId(node, kind = 'country') {
  return node.id.match(new RegExp(`:natural-earth:${kind}:([^:]+):`))?.[1];
}

test('the generated Natural Earth dataset is bounded, deterministic, and addressable by aliases', () => {
  const countries = naturalEarthCountries110m();
  assert.equal(NATURAL_EARTH_WORLD_110M_FEATURE_COUNT, 177);
  assert.equal(countries.length, 177);
  assert.equal(new Set(countries.map((country) => country[0])).size, 177);

  let positions = 0;
  for (const country of countries) {
    assert.ok(isGeographicPosition(country[5], country[6]), `${country[0]} label position`);
    assert.ok(country[8].length > 0, `${country[0]} polygons`);
    for (const polygon of country[8]) {
      assert.ok(polygon.length > 0, `${country[0]} polygon rings`);
      for (const ring of polygon) {
        assert.ok(ring.length >= 3, `${country[0]} ring vertices`);
        for (const [longitude, latitude] of ring) {
          positions += 1;
          assert.ok(isGeographicPosition(longitude, latitude), `${country[0]} coordinate bounds`);
        }
      }
    }
  }
  assert.ok(positions > 5_000);

  assert.equal(naturalEarthCountry('KR')?.[2], 'KOR');
  assert.equal(naturalEarthCountry('South Korea')?.[2], 'KOR');
  assert.equal(naturalEarthCountry('대한민국')?.[2], 'KOR');
  assert.equal(naturalEarthCountry('United States')?.[2], 'USA');
  assert.equal(naturalEarthCountry('UK')?.[2], 'GBR');
  assert.equal(naturalEarthCountry('not-a-country'), undefined);
});

test('the geographic viewport preserves a centered 2:1 projection and validates bounds', () => {
  const plot = { x: 10, y: 20, width: 640, height: 400 };
  const viewport = geographicViewport(plot);
  assert.deepEqual(viewport, { x: 18, y: 64, width: 624, height: 312 });
  assert.deepEqual(projectGeographicPosition(plot, -180, 90), { x: 18, y: 64 });
  assert.deepEqual(projectGeographicPosition(plot, 0, 0), { x: 330, y: 220 });
  assert.deepEqual(projectGeographicPosition(plot, 180, -90), { x: 642, y: 376 });

  assert.equal(isGeographicPosition(-180, -90), true);
  assert.equal(isGeographicPosition(180, 90), true);
  assert.equal(isGeographicPosition(-180.01, 0), false);
  assert.equal(isGeographicPosition(0, 90.01), false);
});

test('map basemap options control graticule, attribution, and political-map styling', () => {
  const { scene } = compile(
    mapSpec(
      {
        type: 'map',
        options: {
          basemap: 'natural-earth',
          graticule: true,
          attribution: false,
          oceanFill: '#001122',
          landFill: '#334455',
          countryStroke: '#abcdef',
          countryLineWidth: 1.25,
        },
      },
      [{ longitude: 126.98, latitude: 37.57 }],
    ),
    dimensions,
  );
  const nodes = flattenScene(scene.root);
  const countries = nodes.filter(
    (node) => node.type === 'path' && node.id.includes(':natural-earth:country:'),
  );
  const surface = nodes.find((node) => node.id.includes(':natural-earth:surface'));

  assert.equal(new Set(countries.map((node) => countryId(node))).size, 177);
  assert.equal(surface?.fill, '#001122');
  assert.ok(countries.every((node) => node.fill === '#334455'));
  assert.ok(countries.every((node) => node.stroke === '#abcdef'));
  assert.ok(countries.every((node) => node.lineWidth === 1.25));
  assert.equal(nodes.filter((node) => node.id.includes(':natural-earth:longitude:')).length, 5);
  assert.equal(nodes.filter((node) => node.id.includes(':natural-earth:latitude:')).length, 5);
  assert.ok(!nodes.some((node) => node.id.includes(':natural-earth:attribution')));
});

test('basemap none preserves valid point data and drops invalid geographic coordinates', () => {
  const { scene } = compile(
    mapSpec({ type: 'map', options: { basemap: 'none' } }, [
      { longitude: -180, latitude: -90 },
      { longitude: 180, latitude: 90 },
      { longitude: 180.01, latitude: 0 },
      { longitude: 0, latitude: -90.01 },
      { longitude: '126.98', latitude: 37.57 },
    ]),
    dimensions,
  );
  const nodes = flattenScene(scene.root);
  const points = nodes.filter((node) => node.id.includes(':map-point:'));

  assert.equal(points.length, 2);
  assert.ok(!nodes.some((node) => node.id.includes(':natural-earth:')));
});

test('geo keeps bubble compatibility and adds interactive compound choropleth countries', () => {
  const data = [
    { region: '대한민국', value: 40 },
    { region: 'United States', value: 90 },
    { region: 'South Africa', value: 60 },
    { region: 'not-a-country', value: 10_000 },
  ];
  const bubble = compile(
    mapSpec({ type: 'geo', options: { basemap: 'none' } }, data, 'region', 'value'),
    dimensions,
  );
  const bubbleNodes = flattenScene(bubble.scene.root);
  assert.equal(bubbleNodes.filter((node) => node.id.includes(':region:')).length, 3);
  assert.ok(!bubbleNodes.some((node) => node.id.includes(':natural-earth:region:')));

  const choropleth = compile(
    mapSpec(
      { type: 'geo', options: { basemap: 'none', mode: 'choropleth' } },
      data,
      'region',
      'value',
    ),
    dimensions,
  );
  const regionPaths = flattenScene(choropleth.scene.root).filter(
    (node) => node.type === 'path' && node.id.includes(':natural-earth:region:'),
  );
  assert.deepEqual(
    new Set(regionPaths.map((node) => countryId(node, 'region'))),
    new Set(['KOR', 'USA', 'ZAF']),
  );
  assert.ok(regionPaths.every((node) => node.interactive));
  assert.ok(regionPaths.every((node) => node.fillRule === 'evenodd'));
  assert.ok(
    regionPaths.every(
      (node) =>
        node.datum?.rowIndex === 0 || node.datum?.rowIndex === 1 || node.datum?.rowIndex === 2,
    ),
  );
  assert.ok(regionPaths.some((node) => (node.subpaths?.length ?? 0) > 0));
});
