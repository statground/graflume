import assert from 'node:assert/strict';
import test from 'node:test';

import * as Graflume from '../.tmp/src/index.js';

import {
  clipMapLine,
  clipMapPolygonRing,
  fitMapBounds,
  geodesicPath,
  mapBounds,
  mapGraticule,
  MapLayerRegistry,
  MapRuntime,
  MapTileManager,
  createMapTileManager,
  createMapRuntime,
  fetchMapTile,
  normalizeGeoJson,
  projectMapPosition,
  tileUrl,
  topologyToGeoJson,
  wrapLongitude,
} from '../.tmp/src/geography/map-lifecycle.js';

const close = (actual, expected, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);

test('map lifecycle and provider manager are part of the public Canvas entry point', () => {
  assert.equal(Graflume.MapLayerRegistry, MapLayerRegistry);
  assert.equal(Graflume.MapTileManager, MapTileManager);
  assert.equal(Graflume.MapRuntime, MapRuntime);
  assert.equal(Graflume.createMapTileManager, createMapTileManager);
  assert.equal(Graflume.createMapRuntime, createMapRuntime);
  assert.equal(Graflume.fetchMapTile, fetchMapTile);
});

test('GeoJSON validation normalizes geometry, feature, and collection inputs', () => {
  const geometry = normalizeGeoJson({ type: 'Point', coordinates: [127, 37.5] });
  assert.equal(geometry.features.length, 1);
  assert.deepEqual(geometry.features[0].geometry.coordinates, [127, 37.5]);

  const collection = normalizeGeoJson({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'route',
        properties: { name: 'Dateline route' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [179, 10],
            [-179, 12],
          ],
        },
      },
    ],
  });
  assert.equal(collection.features[0].id, 'route');
  assert.throws(() => normalizeGeoJson({ type: 'Point', coordinates: [0, 100] }), /-90 to 90/);
});

test('GeoJSON GeometryCollection normalization is recursive and rejects malformed descendants', () => {
  const collection = normalizeGeoJson({
    type: 'GeometryCollection',
    geometries: [
      { type: 'Point', coordinates: [127, 37.5] },
      {
        type: 'GeometryCollection',
        geometries: [
          {
            type: 'LineString',
            coordinates: [
              [126, 37],
              [128, 38],
            ],
          },
        ],
      },
    ],
  });
  assert.equal(collection.features[0].geometry.type, 'GeometryCollection');
  assert.equal(collection.features[0].geometry.geometries[1].type, 'GeometryCollection');
  assert.throws(
    () => normalizeGeoJson({ type: 'GeometryCollection', geometries: [{ type: 'Point' }] }),
    /coordinates/,
  );
});

test('TopoJSON decoder handles delta transform, joined arcs, reversed arcs and object selection', () => {
  const topology = {
    type: 'Topology',
    transform: { scale: [1, 1], translate: [0, 0] },
    arcs: [
      [
        [0, 0],
        [10, 0],
        [0, 10],
      ],
      [
        [10, 10],
        [-10, 0],
        [0, -10],
      ],
    ],
    objects: {
      region: {
        type: 'Polygon',
        arcs: [[0, 1]],
        properties: { code: 'R' },
      },
      reverseLine: { type: 'LineString', arcs: [-1] },
      collection: {
        type: 'GeometryCollection',
        geometries: [
          { type: 'Point', coordinates: [5, 5], properties: { kind: 'point' } },
          { type: 'LineString', arcs: [0], properties: { kind: 'line' } },
        ],
      },
    },
  };
  const polygon = topologyToGeoJson(topology, 'region');
  assert.equal(polygon.features[0].geometry.type, 'Polygon');
  assert.deepEqual(polygon.features[0].geometry.coordinates[0], [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ]);
  const reverse = topologyToGeoJson(topology, 'reverseLine');
  assert.deepEqual(reverse.features[0].geometry.coordinates, [
    [10, 10],
    [10, 0],
    [0, 0],
  ]);
  const collection = topologyToGeoJson(topology, 'collection');
  assert.deepEqual(
    collection.features.map(({ geometry }) => geometry.type),
    ['Point', 'LineString'],
  );
});

test('projection registry covers equirectangular, Mercator, orthographic, rotation, clip and wrap', () => {
  close(wrapLongitude(181), -179);
  assert.deepEqual(projectMapPosition([0, 0], { name: 'equirectangular' }), {
    x: 0.5,
    y: 0.5,
    visible: true,
  });
  const mercator = projectMapPosition([0, 0], { name: 'mercator' });
  close(mercator.x, 0.5);
  close(mercator.y, 0.5);
  assert.equal(projectMapPosition([170, 0], { name: 'orthographic' }).visible, false);
  assert.equal(
    projectMapPosition([20, 20], { clip: [-10, -10, 10, 10], rotate: [-20, -20] }).visible,
    true,
  );
});

test('geographic line and polygon clipping keeps intersections, splits runs, and applies rotation first', () => {
  const options = { rotate: [5, 0], clip: [-10, -10, 10, 10] };
  const lines = clipMapLine(
    [
      [-20, 0],
      [0, 0],
      [20, 0],
      [0, 5],
      [-20, 5],
    ],
    options,
  );
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], [
    [-10, 0],
    [5, 0],
    [10, 0],
  ]);
  assert.deepEqual(lines[1], [
    [10, 3.75],
    [5, 5],
    [-10, 5],
  ]);

  const rings = clipMapPolygonRing(
    [
      [-20, -20],
      [20, -20],
      [20, 20],
      [-20, 20],
      [-20, -20],
    ],
    options,
  );
  assert.equal(rings.length, 1);
  assert.equal(Math.min(...rings[0].map(([lon]) => lon)), -10);
  assert.equal(Math.max(...rings[0].map(([lon]) => lon)), 10);
  assert.equal(Math.min(...rings[0].map(([, lat]) => lat)), -10);
  assert.equal(Math.max(...rings[0].map(([, lat]) => lat)), 10);
});

test('antimeridian line splitting creates independent short wrapped paths', () => {
  const paths = clipMapLine([
    [170, 5],
    [-170, 5],
  ]);
  assert.equal(paths.length, 2);
  assert.deepEqual(paths[0][0], [170, 5]);
  close(paths[0].at(-1)[0], 180, 1e-8);
  assert.deepEqual(paths[1][0], [-180, 5]);
  assert.deepEqual(paths[1].at(-1), [-170, 5]);
});

test('orthographic clipping retains exact line and polygon intersections at the horizon', () => {
  const line = clipMapLine(
    [
      [-120, 0],
      [0, 0],
      [120, 0],
    ],
    { name: 'orthographic' },
  );
  assert.deepEqual(line, [
    [
      [-90, 0],
      [0, 0],
      [90, 0],
    ],
  ]);
  assert.ok(line[0].every((point) => projectMapPosition(point, { name: 'orthographic' }).visible));

  const rings = clipMapPolygonRing(
    [
      [-100, -20],
      [0, -20],
      [100, -20],
      [100, 20],
      [0, 20],
      [-100, 20],
      [-100, -20],
    ],
    { name: 'orthographic' },
  );
  assert.equal(rings.length, 1);
  assert.equal(Math.min(...rings[0].map(([lon]) => lon)), -90);
  assert.equal(Math.max(...rings[0].map(([lon]) => lon)), 90);
  assert.ok(rings[0].every((point) => projectMapPosition(point, { name: 'orthographic' }).visible));
});

test('map bounds and fit choose the short dateline span and return a finite camera', () => {
  const collection = normalizeGeoJson({
    type: 'LineString',
    coordinates: [
      [179, 10],
      [-179, 20],
    ],
  });
  const bounds = mapBounds(collection);
  assert.equal(bounds.west, 179);
  assert.equal(bounds.east, 181);
  const fit = fitMapBounds(bounds, { width: 800, height: 400 }, 32, 'mercator');
  const equivalent = fitMapBounds(
    { west: -1, south: 10, east: 1, north: 20 },
    { width: 800, height: 400 },
    32,
    'mercator',
  );
  assert.deepEqual(fit.center, [-180, 15]);
  assert.ok(Number.isFinite(fit.zoom));
  close(fit.zoom, equivalent.zoom);
  assert.ok(fit.zoom > 4, `expected a short 2-degree fit, received zoom ${fit.zoom}`);
});

test('geodesics follow a great circle and graticules are ordinary line features', () => {
  const route = geodesicPath([170, 0], [-170, 0], 10);
  assert.deepEqual(route[0], [170, 0]);
  close(route.at(-1)[0], -170);
  assert.ok(route.every(([lon, lat]) => lon >= -180 && lon < 180 && lat >= -90 && lat <= 90));
  const graticule = mapGraticule([90, 45]);
  assert.ok(graticule.features.length > 0);
  assert.ok(graticule.features.every(({ geometry }) => geometry.type === 'LineString'));
});

test('source and layer lifecycle enforces ordering, visibility, attribution and safe removal', () => {
  const registry = new MapLayerRegistry();
  registry.addSource('inline', normalizeGeoJson({ type: 'Point', coordinates: [0, 0] }));
  registry.addSource('tiles', {
    type: 'raster',
    template: 'https://tiles.example/{z}/{x}/{y}.png',
    attribution: 'Example maps',
  });
  registry.addLayer({ id: 'base', source: 'tiles', type: 'raster', attribution: 'Example maps' });
  registry.addLayer({ id: 'points', source: 'inline', type: 'circle' }, 'base');
  registry.setVisibility('points', false);
  const snapshot = registry.snapshot();
  assert.deepEqual(
    snapshot.layers.map(({ id }) => id),
    ['points', 'base'],
  );
  assert.equal(snapshot.layers[0].visible, false);
  assert.deepEqual(snapshot.attributions, ['Example maps']);
  assert.throws(() => registry.removeSource('inline'), /still used/);
  registry.removeLayer('points');
  registry.removeSource('inline');
  assert.deepEqual(registry.snapshot().sources, ['tiles']);
});

test('provider tile lifecycle wraps x, chooses subdomains, deduplicates, aborts and bounds an LRU cache', async () => {
  const source = {
    type: 'vector',
    template: 'https://{s}.tiles.example/{z}/{x}/{y}.mvt',
    attribution: 'Example vector tiles',
    subdomains: ['a', 'b'],
  };
  assert.equal(tileUrl(source, { z: 2, x: -1, y: 1 }), 'https://a.tiles.example/2/3/1.mvt');

  const calls = [];
  const manager = new MapTileManager(
    source,
    async (url, signal) => {
      calls.push({ url, signal });
      await Promise.resolve();
      if (signal.aborted) throw signal.reason;
      return { bytes: new Uint8Array([1, 2, 3]), mimeType: 'application/vnd.mapbox-vector-tile' };
    },
    2,
  );
  const first = manager.load({ z: 2, x: 1, y: 1 });
  const duplicate = manager.load({ z: 2, x: 1, y: 1 });
  assert.deepEqual(await first, await duplicate);
  assert.equal(calls.length, 1);
  await manager.load({ z: 2, x: 2, y: 1 });
  await manager.load({ z: 2, x: 3, y: 1 });
  assert.equal(manager.state().cached, 2);
  assert.equal(manager.attribution, 'Example vector tiles');

  const controller = new AbortController();
  controller.abort(new Error('cancelled'));
  await assert.rejects(manager.load({ z: 2, x: 0, y: 1 }, controller.signal), /cancelled/);
  assert.equal(manager.state().pending, 0);
});

test('provider tile batches preserve order, enforce concurrency and abort all work on destroy', async () => {
  const source = {
    type: 'raster',
    template: 'https://tiles.example/{z}/{x}/{y}.png',
    attribution: 'Example raster tiles',
  };
  let active = 0;
  let maximumActive = 0;
  const releases = [];
  const manager = createMapTileManager(source, {
    maximumEntries: 2,
    maximumConcurrent: 2,
    fetcher: async (url, signal) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        await new Promise((resolve, reject) => {
          const release = () => resolve();
          releases.push(release);
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
        return {
          bytes: new Uint8Array([Number(url.match(/\/(\d+)\.png$/)?.[1] ?? 0)]),
          mimeType: 'image/png',
        };
      } finally {
        active -= 1;
      }
    },
  });

  const batch = manager.loadMany([
    { z: 2, x: 0, y: 0 },
    { z: 2, x: 1, y: 1 },
    { z: 2, x: 2, y: 2 },
  ]);
  await Promise.resolve();
  assert.equal(manager.state().pending, 2);
  assert.equal(maximumActive, 2);
  releases.splice(0).forEach((release) => release());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releases.length, 1);
  releases.splice(0).forEach((release) => release());
  assert.deepEqual(
    (await batch).map(({ bytes }) => bytes[0]),
    [0, 1, 2],
  );

  const pending = manager.load({ z: 2, x: 3, y: 3 });
  await Promise.resolve();
  manager.destroy(new Error('chart destroyed'));
  await assert.rejects(pending, /chart destroyed/);
  assert.deepEqual(manager.state(), {
    cached: 0,
    pending: 0,
    maximumEntries: 2,
    maximumConcurrent: 2,
    destroyed: true,
  });
  await assert.rejects(manager.load({ z: 2, x: 0, y: 0 }), /destroyed/);
});

test('persistent map runtime binds ordered layer visibility to provider loading and teardown', async () => {
  const requests = [];
  const runtime = createMapRuntime({
    maximumEntries: 4,
    fetcher: async (url, signal) => {
      requests.push({ url, signal });
      return { bytes: new Uint8Array([1]), mimeType: 'image/png' };
    },
  });
  runtime
    .addSource('provider', {
      type: 'raster',
      template: 'https://tiles.example/{z}/{x}/{y}.png',
      attribution: 'Persistent provider',
    })
    .addLayer({
      id: 'background',
      source: 'provider',
      type: 'raster',
      attribution: 'Persistent provider',
    });
  assert.equal(runtime.snapshot().registry.revision, 2);
  const responses = await runtime.loadLayerTiles('background', [
    { z: 1, x: 0, y: 0 },
    { z: 1, x: 1, y: 0 },
  ]);
  assert.equal(responses.length, 2);
  assert.equal(requests.length, 2);
  assert.equal(runtime.snapshot().providers.provider.cached, 2);
  runtime.setVisibility('background', false);
  assert.deepEqual(await runtime.loadLayerTiles('background', [{ z: 1, x: 0, y: 1 }]), []);
  assert.equal(requests.length, 2, 'hidden layers do not issue provider requests');
  runtime.removeLayer('background').removeSource('provider');
  assert.deepEqual(runtime.snapshot().registry.sources, []);
  runtime.destroy();
  assert.deepEqual(runtime.snapshot(), {
    destroyed: true,
    revision: 5,
    projection: { name: 'equirectangular' },
    registry: {
      revision: 5,
      sources: [],
      layers: [],
      attributions: [],
    },
    providers: {},
  });
  assert.throws(
    () => runtime.addSource('late', normalizeGeoJson({ type: 'Point', coordinates: [0, 0] })),
    /destroyed/,
  );
});

test('persistent map runtime owns a closed projection lifecycle and projects through current state', () => {
  const runtime = createMapRuntime({
    projection: { name: 'equirectangular', rotate: [0, 0] },
  });
  assert.deepEqual(runtime.getProjection(), {
    name: 'equirectangular',
    rotate: [0, 0],
  });
  assert.deepEqual(runtime.project([0, 0]), { x: 0.5, y: 0.5, visible: true });
  const initialRevision = runtime.snapshot().revision;

  runtime.setProjection({
    name: 'orthographic',
    rotate: [-20, -10],
    clip: [-40, -30, 40, 30],
  });
  assert.equal(runtime.snapshot().revision, initialRevision + 1);
  assert.deepEqual(runtime.snapshot().projection, {
    name: 'orthographic',
    rotate: [-20, -10],
    clip: [-40, -30, 40, 30],
  });
  assert.equal(runtime.project([20, 10]).visible, true);
  assert.equal(runtime.project([120, 10]).visible, false);

  runtime.setProjection(runtime.getProjection());
  assert.equal(runtime.snapshot().revision, initialRevision + 1, 'equivalent state is a no-op');
  assert.throws(() => runtime.setProjection({ name: 'unknown' }), /unsupported/);
  assert.throws(() => runtime.setProjection({ clip: [10, 20, -10, -20] }), /ordered/);
  assert.throws(
    () => runtime.setProjection({ rotate: [0, 0], executable: true }),
    /Unknown map projection property/,
  );
});

test('default tile fetch adapter validates HTTP responses and derives provider expiry', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (_url, { signal }) => {
    assert.equal(signal.aborted, false);
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      status: 200,
      headers: {
        'content-type': 'image/png; charset=binary',
        'cache-control': 'public, max-age=60',
      },
    });
  };
  const before = Date.now();
  const response = await fetchMapTile(
    'https://tiles.example/0/0/0.png',
    new AbortController().signal,
  );
  assert.equal(response.mimeType, 'image/png');
  assert.deepEqual([...response.bytes], [137, 80, 78, 71]);
  assert.ok(response.expiresAt >= before + 60_000);

  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(
    fetchMapTile('https://tiles.example/0/0/0.png', new AbortController().signal),
    /HTTP 503/,
  );
});
