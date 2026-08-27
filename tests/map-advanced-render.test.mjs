import assert from 'node:assert/strict';
import test from 'node:test';

import { compile, map as createMap, registerRenderer } from '../.tmp/src/complete.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { CanvasRenderer } from '../.tmp/src/renderer/canvas.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const geojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'dateline', value: 2 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [170, -10],
            [-170, -10],
            [-170, 10],
            [170, 10],
            [170, -10],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'route', value: 1 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [126.97, 37.56],
          [-122.42, 37.77],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { id: 'point', value: 3 },
      geometry: { type: 'Point', coordinates: [126.97, 37.56] },
    },
  ],
};

test('map compiler renders GeoJSON lifecycle with fit, rotation, clipping, graticules, and geodesics', () => {
  const { scene } = compile({
    width: 760,
    height: 460,
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      fields: { color: 'value' },
      options: {
        geojson,
        projection: 'mercator',
        rotate: [5, 0],
        clip: [-180, -80, 180, 80],
        fit: true,
        fitPadding: 24,
        graticule: true,
        graticuleStep: [45, 30],
        geodesic: true,
        geodesicSegments: 32,
        attribution: 'Example geographic source',
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  const features = nodes.filter(({ id }) => id.includes(':map-feature:'));
  assert.ok(features.length >= 3);
  assert.ok(features.some(({ datum }) => datum.tooltip.geometry === 'Polygon'));
  assert.ok(
    features.some(({ datum }) => datum.tooltip.geometry === 'LineString' && datum.tooltip.geodesic),
  );
  assert.ok(features.every(({ datum }) => datum.tooltip.projection === 'mercator'));
  assert.ok(features.every(({ datum }) => datum.tooltip.clipped === true));
  const route = features.find(({ datum }) => datum.tooltip.geometry === 'LineString');
  assert.ok([route.points, ...(route.subpaths ?? [])].flat().length >= 30);
  assert.ok(nodes.some(({ id }) => id.includes(':graticule:')));
  assert.equal(
    nodes.find(({ id }) => id.includes(':map-attribution:')).text,
    'Example geographic source',
  );
});

const pathPoints = (node) => [node.points, ...(node.subpaths ?? [])].flat();

const regionGeoJson = {
  type: 'FeatureCollection',
  features: [
    ['KR-11', 'KR', 'Seoul', 126, 36, 128, 38],
    ['KR-26', 'KR', 'Busan', 128, 34, 130, 36],
    ['JP-13', 'JP', 'Tokyo', 139, 34, 141, 36],
    ['JP-27', 'JP', 'Osaka', 134, 33, 136, 35],
  ].map(([code, country, name, west, south, east, north]) => ({
    type: 'Feature',
    id: code,
    properties: { code, country, name },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  })),
};

class QuickMapElement extends EventTarget {
  constructor(ownerDocument) {
    super();
    this.ownerDocument = ownerDocument;
    this.clientWidth = 760;
    this.clientHeight = 460;
    this.children = [];
    this.dataset = {};
    this.style = { setProperty() {} };
    this.attributes = new Map();
    this.parentElement = null;
    this.hidden = false;
    this.textContent = '';
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  remove() {
    if (this.parentElement === null) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight };
  }
}

class QuickMapDocument extends EventTarget {
  constructor() {
    super();
    this.documentElement = new QuickMapElement(this);
  }

  createElement() {
    return new QuickMapElement(this);
  }
}

class QuickMapRenderer {
  name = 'canvas';
  capabilities = {
    vector: false,
    gpu: false,
    worker: false,
    exportFormats: ['image/png'],
    inspectionViewport: true,
  };
  host = null;
  scene = null;

  mount(target) {
    this.host = target.ownerDocument.createElement('div');
    target.append(this.host);
  }

  resize() {}

  render(scene) {
    this.scene = scene;
  }

  surface() {
    return this.host;
  }

  overlayHost() {
    return this.host;
  }

  setInspectionView() {}

  destroy() {
    this.host?.remove();
  }
}

function scopedRegionSpec(data, options = {}) {
  return {
    width: 760,
    height: 460,
    data,
    mark: {
      type: 'map',
      fields: { featureKey: 'code', dataKey: 'region', color: 'score' },
      options: {
        geojson: regionGeoJson,
        mapScope: {
          level: 'region',
          property: 'code',
          values: ['kr-11', 'KR-26', 'JP-13', 'JP-27'],
          parentProperty: 'country',
          parentValues: ['KR', 'JP'],
        },
        geometryDetail: 'auto',
        geometryBudget: 1_000,
        labels: { field: 'name', collision: 'none', maximum: 10 },
        attribution: 'Example regions',
        ...options,
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  };
}

test('advanced map scopes and joins many regions across countries with auto-fit, labels, and LOD evidence', () => {
  const { scene } = compile(
    scopedRegionSpec([
      { region: 'KR-11', score: 72, longitude: 127, latitude: 37 },
      { region: 'kr-26', score: 58, longitude: 129, latitude: 35 },
      { region: 'JP-13', score: 91, longitude: 140, latitude: 35 },
      { region: 'JP-27', score: 64, longitude: 135, latitude: 34 },
    ]),
  );
  const nodes = flattenScene(scene.root);
  const features = nodes.filter(
    (node) => node.type === 'path' && node.id.includes(':map-feature:'),
  );
  assert.equal(features.length, 4);
  assert.deepEqual(
    features.map(({ datum }) => datum.rowIndex),
    [0, 1, 2, 3],
  );
  assert.ok(features.every(({ datum }) => datum.datum.scope === 'region'));
  assert.ok(features.every(({ datum }) => datum.datum.selectedFeatures === 4));
  assert.ok(features.every(({ datum }) => datum.datum.detail === 'auto'));
  assert.ok(features.every(({ datum }) => datum.tooltip.joinKey !== null));
  assert.ok(new Set(features.map(({ fill }) => fill)).size > 1, 'joined values drive color');
  assert.deepEqual(
    new Set(
      nodes
        .filter((node) => node.type === 'text' && node.id.includes(':map-label:'))
        .map(({ text }) => text),
    ),
    new Set(['Seoul', 'Busan', 'Tokyo', 'Osaka']),
  );
  const points = features.flatMap(pathPoints);
  assert.ok(Math.max(...points.map(({ x }) => x)) - Math.min(...points.map(({ x }) => x)) > 500);
  assert.equal(nodes.find((node) => node.id.includes(':map-attribution:')).text, 'Example regions');
});

test('map Quick API creates an advanced external GeoJSON view with a parentless scope', () => {
  const renderers = [];
  registerRenderer({
    name: 'canvas',
    capabilities: {
      vector: false,
      gpu: false,
      worker: false,
      exportFormats: ['image/png'],
      inspectionViewport: true,
    },
    create() {
      const renderer = new QuickMapRenderer();
      renderers.push(renderer);
      return renderer;
    },
  });
  const document = new QuickMapDocument();
  const target = new QuickMapElement(document);
  const chart = createMap(
    target,
    [
      { region: 'KR-11', score: 72, longitude: 127, latitude: 37 },
      { region: 'JP-13', score: 91, longitude: 140, latitude: 35 },
    ],
    {
      x: { field: 'longitude', type: 'quantitative' },
      y: { field: 'latitude', type: 'quantitative' },
      mark: {
        fields: { featureKey: 'code', dataKey: 'region', color: 'score' },
        options: {
          geojson: regionGeoJson,
          mapScope: {
            level: 'region',
            property: 'code',
            values: ['KR-11', 'JP-13'],
          },
        },
      },
      create: { width: 760, height: 460, autoResize: false },
    },
  );

  try {
    const normalizedScope = chart.getSpec().mark.options.mapScope;
    assert.equal(Object.hasOwn(normalizedScope, 'parentProperty'), false);
    assert.equal(Object.hasOwn(normalizedScope, 'parentValues'), false);
    assert.equal(
      flattenScene(chart.getScene().root).filter(
        (node) => node.type === 'path' && node.id.includes(':map-feature:'),
      ).length,
      2,
    );
    assert.equal(renderers[0].scene, chart.getScene());
  } finally {
    chart.destroy();
  }
});

test('advanced map join policies fail closed or explicitly hide unmatched and duplicate data', () => {
  const partial = [
    { region: 'KR-11', score: 72, longitude: 127, latitude: 37 },
    { region: 'JP-13', score: 91, longitude: 140, latitude: 35 },
  ];
  const hidden = compile(scopedRegionSpec(partial, { joinUnmatched: 'hide' }));
  assert.equal(
    flattenScene(hidden.scene.root).filter(
      (node) => node.type === 'path' && node.id.includes(':map-feature:'),
    ).length,
    2,
  );
  assert.throws(
    () => compile(scopedRegionSpec(partial, { joinUnmatched: 'error' })),
    /without data/,
  );
  assert.throws(
    () =>
      compile(
        scopedRegionSpec([
          ...partial,
          { region: 'KR-11', score: 1000, longitude: 127, latitude: 37 },
        ]),
      ),
    /duplicate key/,
  );
  const last = compile(
    scopedRegionSpec([...partial, { region: 'KR-11', score: 1000, longitude: 127, latitude: 37 }], {
      joinDuplicate: 'last',
      joinUnmatched: 'hide',
    }),
  );
  const seoul = flattenScene(last.scene.root).find(
    (node) => node.type === 'path' && node.datum?.tooltip?.joinKey === 'KR-11',
  );
  assert.equal(seoul.datum.rowIndex, 2);
  assert.equal(seoul.datum.tooltip.joinValue, 1000);
});

test('map scene performs rectangular point, line, multiline, polygon, and multipolygon clipping', () => {
  const clippingSource = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: 'clip-frame' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-20, -20],
              [20, -20],
              [20, 20],
              [-20, 20],
              [-20, -20],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { id: 'split-line' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [-20, 0],
            [0, 0],
            [20, 0],
            [0, 5],
            [-20, 5],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { id: 'multi-line' },
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [
              [-20, -5],
              [20, -5],
            ],
            [
              [-30, 30],
              [-20, 30],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { id: 'multi-polygon' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [-20, -8],
                [20, -8],
                [20, 8],
                [-20, 8],
                [-20, -8],
              ],
            ],
            [
              [
                [30, 30],
                [40, 30],
                [40, 40],
                [30, 40],
                [30, 30],
              ],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { id: 'inside-point' },
        geometry: { type: 'Point', coordinates: [0, 0] },
      },
      {
        type: 'Feature',
        properties: { id: 'clip-corners' },
        geometry: {
          type: 'MultiPoint',
          coordinates: [
            [-10, -10],
            [10, -10],
            [10, 10],
            [-10, 10],
          ],
        },
      },
      {
        type: 'Feature',
        properties: { id: 'outside-point' },
        geometry: { type: 'Point', coordinates: [15, 0] },
      },
    ],
  };
  const { scene } = compile({
    width: 720,
    height: 420,
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        geojson: clippingSource,
        projection: 'equirectangular',
        clip: [-10, -10, 10, 10],
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const features = flattenScene(scene.root).filter(({ id }) => id.includes(':map-feature:'));
  const hasProperty = (node, id) => node.datum.tooltip.properties.includes(`\"id\":\"${id}\"`);
  const byProperty = (id) => features.find((node) => hasProperty(node, id));
  const frame = byProperty('clip-frame');
  const framePoints = pathPoints(frame);
  const clipCorners = features.filter((node) => hasProperty(node, 'clip-corners'));
  assert.equal(clipCorners.length, 4);
  const minimumX = Math.min(...clipCorners.map(({ cx }) => cx));
  const maximumX = Math.max(...clipCorners.map(({ cx }) => cx));
  const minimumY = Math.min(...clipCorners.map(({ cy }) => cy));
  const maximumY = Math.max(...clipCorners.map(({ cy }) => cy));
  const insideFrame = ({ x, y }) =>
    x >= minimumX - 1e-7 && x <= maximumX + 1e-7 && y >= minimumY - 1e-7 && y <= maximumY + 1e-7;

  assert.ok(framePoints.every(insideFrame), 'every clipped polygon vertex stays in the clip');
  const splitLine = byProperty('split-line');
  assert.equal(splitLine.subpaths.length, 1, 'exit and re-entry create separate scene subpaths');
  assert.ok(pathPoints(splitLine).every(insideFrame));
  assert.ok(
    [splitLine.points, ...splitLine.subpaths].every(
      (path) => Math.abs(path[0].x - minimumX) <= 1e-7 || Math.abs(path[0].x - maximumX) <= 1e-7,
    ),
  );
  const multiLine = byProperty('multi-line');
  assert.ok(pathPoints(multiLine).every(insideFrame));
  assert.equal(
    pathPoints(multiLine).length,
    2,
    'outside-to-outside segment keeps two intersections',
  );
  assert.ok(Math.abs(pathPoints(multiLine)[0].x - minimumX) <= 1e-7);
  assert.ok(Math.abs(pathPoints(multiLine)[1].x - maximumX) <= 1e-7);
  assert.ok(pathPoints(byProperty('multi-polygon')).every(insideFrame));
  assert.ok(byProperty('inside-point'));
  assert.equal(byProperty('outside-point'), undefined);
  assert.ok(features.every(({ datum }) => datum.tooltip.clipped === true));
});

test('map polygons preserve holes as even-odd compound paths through clipping and hit testing', () => {
  const compiled = compile({
    width: 720,
    height: 420,
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        geojson: {
          type: 'Feature',
          properties: { id: 'clipped-donut' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-20, -20],
                [20, -20],
                [20, 20],
                [-20, 20],
                [-20, -20],
              ],
              [
                [-4, -4],
                [-4, 4],
                [4, 4],
                [4, -4],
                [-4, -4],
              ],
            ],
          },
        },
        projection: 'equirectangular',
        clip: [-10, -10, 10, 10],
        fit: false,
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const donut = flattenScene(compiled.scene.root).find(({ id }) => id.includes(':map-feature:'));
  assert.equal(donut.type, 'path');
  assert.equal(donut.closed, true);
  assert.equal(donut.fillRule, 'evenodd');
  assert.equal(donut.subpaths.length, 1);
  assert.equal(donut.datum.tooltip.holes, 1);
  assert.equal(donut.datum.tooltip.renderedRings, 2);

  const outerBounds = {
    minimumX: Math.min(...donut.points.map(({ x }) => x)),
    maximumX: Math.max(...donut.points.map(({ x }) => x)),
    minimumY: Math.min(...donut.points.map(({ y }) => y)),
    maximumY: Math.max(...donut.points.map(({ y }) => y)),
  };
  assert.ok(
    donut.subpaths[0].every(
      ({ x, y }) =>
        x >= outerBounds.minimumX &&
        x <= outerBounds.maximumX &&
        y >= outerBounds.minimumY &&
        y <= outerBounds.maximumY,
    ),
    'the clipped hole must remain inside the clipped outer ring',
  );
  const hole = donut.subpaths[0];
  const holeCenter = {
    x: (Math.min(...hole.map(({ x }) => x)) + Math.max(...hole.map(({ x }) => x))) / 2,
    y: (Math.min(...hole.map(({ y }) => y)) + Math.max(...hole.map(({ y }) => y))) / 2,
  };
  assert.equal(hitTestScene(compiled.scene, holeCenter.x, holeCenter.y, 0), null);
  const shellPoint = {
    x: (holeCenter.x + outerBounds.maximumX) / 2,
    y: holeCenter.y,
  };
  assert.equal(hitTestScene(compiled.scene, shellPoint.x, shellPoint.y, 0)?.nodeId, donut.id);
});

test('map MultiPolygon keeps each polygon and its holes in separate compound paths', () => {
  const { scene } = compile({
    width: 720,
    height: 420,
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        geojson: {
          type: 'Feature',
          properties: { id: 'islands' },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [-20, -10],
                  [-2, -10],
                  [-2, 10],
                  [-20, 10],
                  [-20, -10],
                ],
                [
                  [-15, -4],
                  [-15, 4],
                  [-8, 4],
                  [-8, -4],
                  [-15, -4],
                ],
              ],
              [
                [
                  [5, -8],
                  [20, -8],
                  [20, 8],
                  [5, 8],
                  [5, -8],
                ],
              ],
            ],
          },
        },
        projection: 'equirectangular',
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const polygons = flattenScene(scene.root).filter(({ id }) => id.includes(':map-feature:'));
  assert.equal(polygons.length, 2);
  assert.deepEqual(
    polygons.map(({ fillRule, datum, subpaths = [] }) => ({
      fillRule,
      holes: datum.tooltip.holes,
      subpaths: subpaths.length,
    })),
    [
      { fillRule: 'evenodd', holes: 1, subpaths: 1 },
      { fillRule: 'evenodd', holes: 0, subpaths: 0 },
    ],
  );
});

test('map fit false preserves world coordinates while fit true recenters the same feature', () => {
  const compilePoint = (fit) =>
    compile({
      width: 720,
      height: 420,
      data: [{ longitude: 0, latitude: 0 }],
      mark: {
        type: 'map',
        options: {
          geojson: { type: 'Point', coordinates: [100, 0] },
          projection: 'equirectangular',
          fit,
        },
      },
      x: { field: 'longitude', type: 'quantitative' },
      y: { field: 'latitude', type: 'quantitative' },
    });
  const authored = compilePoint(false);
  const fitted = compilePoint(true);
  const authoredPoint = flattenScene(authored.scene.root).find(({ id }) =>
    id.includes(':map-feature:'),
  );
  const fittedPoint = flattenScene(fitted.scene.root).find(({ id }) =>
    id.includes(':map-feature:'),
  );
  const authoredCenter = authored.coordinates.plot.x + authored.coordinates.plot.width / 2;
  const fittedCenter = fitted.coordinates.plot.x + fitted.coordinates.plot.width / 2;
  assert.ok(authoredPoint.cx > authoredCenter + authored.coordinates.plot.width / 4);
  assert.ok(Math.abs(fittedPoint.cx - fittedCenter) <= 1e-7);
  assert.equal(authoredPoint.datum.tooltip.fitCenter, 'none');
  assert.equal(authoredPoint.datum.tooltip.fitZoom, 0);
  assert.equal(fittedPoint.datum.tooltip.fitCenter, '100, 0');
});

test('orthographic map Scene keeps line and polygon horizon intersections', () => {
  const compiled = compile({
    width: 720,
    height: 420,
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        geojson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { id: 'horizon-line' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [-120, 0],
                  [0, 0],
                  [120, 0],
                ],
              },
            },
            {
              type: 'Feature',
              properties: { id: 'horizon-polygon' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-110, -20],
                    [0, -20],
                    [110, -20],
                    [110, 20],
                    [0, 20],
                    [-110, 20],
                    [-110, -20],
                  ],
                ],
              },
            },
          ],
        },
        projection: 'orthographic',
        fit: false,
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const features = flattenScene(compiled.scene.root).filter(({ id }) =>
    id.includes(':map-feature:'),
  );
  const line = features.find(({ datum }) => datum.tooltip.geometry === 'LineString');
  const polygon = features.find(({ datum }) => datum.tooltip.geometry === 'Polygon');
  const plot = compiled.coordinates.plot;
  assert.notEqual(line, undefined);
  assert.notEqual(polygon, undefined);
  assert.equal(line.points.length, 3);
  assert.ok(Math.abs(line.points[0].x - plot.x) <= 1e-7);
  assert.ok(Math.abs(line.points.at(-1).x - (plot.x + plot.width)) <= 1e-7);
  assert.ok(
    polygon.points.some(
      ({ x }) => Math.abs(x - (plot.x + (plot.width * (1 - Math.cos(Math.PI / 9))) / 2)) <= 1e-7,
    ),
  );
  assert.ok(
    polygon.points.some(
      ({ x }) => Math.abs(x - (plot.x + (plot.width * (1 + Math.cos(Math.PI / 9))) / 2)) <= 1e-7,
    ),
  );
  assert.ok(
    [...line.points, ...polygon.points].every(
      ({ x, y }) =>
        x >= plot.x - 1e-7 &&
        x <= plot.x + plot.width + 1e-7 &&
        y >= plot.y - 1e-7 &&
        y <= plot.y + plot.height + 1e-7,
    ),
  );
});

test('map scene splits an antimeridian geodesic without a false cross-world segment', () => {
  const compiled = compile({
    width: 800,
    height: 420,
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        geojson: {
          type: 'LineString',
          coordinates: [
            [170, 8],
            [-170, 8],
          ],
        },
        projection: 'equirectangular',
        geodesic: true,
        geodesicSegments: 64,
        fit: false,
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const route = flattenScene(compiled.scene.root).find(({ id }) => id.includes(':map-feature:'));
  const paths = [route.points, ...(route.subpaths ?? [])];
  assert.equal(paths.length, 2);
  assert.ok(paths.flat().length >= 64);
  for (const path of paths)
    for (let index = 1; index < path.length; index += 1)
      assert.ok(
        Math.abs(path[index].x - path[index - 1].x) < compiled.coordinates.plot.width / 2,
        'each rendered geodesic subpath must stay on one side of the antimeridian',
      );
  assert.equal(route.datum.tooltip.geometry, 'LineString');
  assert.equal(route.datum.tooltip.geodesic, true);
});

test('map geodesics densify every consecutive LineString and MultiLineString segment', () => {
  const { scene } = compile({
    width: 800,
    height: 420,
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        geojson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { id: 'three-point' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [0, 0],
                  [90, 45],
                  [170, 0],
                ],
              },
            },
            {
              type: 'Feature',
              properties: { id: 'multi' },
              geometry: {
                type: 'MultiLineString',
                coordinates: [
                  [
                    [-160, -20],
                    [-80, 20],
                    [0, -10],
                  ],
                  [
                    [20, -25],
                    [120, 30],
                  ],
                ],
              },
            },
          ],
        },
        projection: 'equirectangular',
        geodesic: true,
        geodesicSegments: 8,
        fit: false,
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const routes = flattenScene(scene.root).filter(({ id }) => id.includes(':map-feature:'));
  assert.equal(routes.length, 3);
  assert.ok(routes.every(({ datum }) => datum.tooltip.geodesic === true));
  const threePoint = routes.find(({ datum }) => datum.tooltip.properties.includes('three-point'));
  assert.equal(pathPoints(threePoint).length, 17, 'two 8-segment arcs share one authored vertex');
  const multi = routes.filter(({ datum }) => datum.tooltip.properties.includes('multi'));
  assert.deepEqual(
    multi.map(pathPoints).map(({ length }) => length),
    [17, 9],
  );
});

test('map scene fits the short dateline span and splits ordinary lines and polygon rings', () => {
  const compiled = compile({
    width: 820,
    height: 440,
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        geojson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { id: 'dateline-line' },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [170, 0],
                  [-170, 0],
                ],
              },
            },
            {
              type: 'Feature',
              properties: { id: 'dateline-polygon' },
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [175, -5],
                    [-175, -5],
                    [-175, 5],
                    [175, 5],
                    [175, -5],
                  ],
                ],
              },
            },
          ],
        },
        projection: 'equirectangular',
        fit: true,
        fitPadding: 24,
        labels: { field: 'id', collision: 'none' },
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const features = flattenScene(compiled.scene.root).filter(({ id }) =>
    id.includes(':map-feature:'),
  );
  const line = features.find(({ datum }) => datum.tooltip.geometry === 'LineString');
  const polygon = features.find(({ datum }) => datum.tooltip.geometry === 'Polygon');
  assert.equal(line.subpaths.length, 1);
  assert.equal(polygon.subpaths.length, 1);
  const plot = compiled.coordinates.plot;
  const allPoints = [...pathPoints(line), ...pathPoints(polygon)];
  assert.ok(allPoints.every(({ x }) => x >= plot.x && x <= plot.x + plot.width));
  assert.ok(allPoints.every(({ y }) => y >= plot.y && y <= plot.y + plot.height));
  const horizontalSpan =
    Math.max(...allPoints.map(({ x }) => x)) - Math.min(...allPoints.map(({ x }) => x));
  assert.ok(
    horizontalSpan > plot.width / 2,
    `short-span fit should use the viewport instead of fitting 358 degrees: ${horizontalSpan}`,
  );
  for (const node of [line, polygon])
    for (const path of [node.points, ...node.subpaths])
      for (let index = 1; index < path.length; index += 1)
        assert.ok(Math.abs(path[index].x - path[index - 1].x) < plot.width / 2);
  assert.equal(line.datum.tooltip.fitCenter, '-180, 0');
  assert.equal(polygon.datum.tooltip.fitCenter, '-180, 0');
  const polygonLabel = flattenScene(compiled.scene.root).find(
    (node) => node.type === 'text' && node.text === 'dateline-polygon',
  );
  assert.ok(polygonLabel.x >= plot.x && polygonLabel.x <= plot.x + plot.width);
  assert.ok(polygonLabel.y >= plot.y && polygonLabel.y <= plot.y + plot.height);
});

test('map compiler recursively renders nested GeoJSON GeometryCollection members', () => {
  const { scene } = compile({
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        geojson: {
          type: 'Feature',
          properties: { id: 'nested' },
          geometry: {
            type: 'GeometryCollection',
            geometries: [
              { type: 'Point', coordinates: [0, 0] },
              {
                type: 'GeometryCollection',
                geometries: [
                  {
                    type: 'LineString',
                    coordinates: [
                      [-5, -5],
                      [5, 5],
                    ],
                  },
                  {
                    type: 'Polygon',
                    coordinates: [
                      [
                        [-4, -4],
                        [4, -4],
                        [4, 4],
                        [-4, 4],
                        [-4, -4],
                      ],
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const features = flattenScene(scene.root).filter(({ id }) => id.includes(':map-feature:'));
  assert.equal(features.length, 3);
  assert.ok(features.every(({ datum }) => datum.tooltip.geometry === 'GeometryCollection'));
  assert.ok(features.every(({ datum }) => datum.tooltip.properties.includes('nested')));
});

test('map compiler decodes TopoJSON delta and reversed arcs into rendered features', () => {
  const topology = {
    type: 'Topology',
    transform: { scale: [1, 1], translate: [0, 0] },
    arcs: [
      [
        [0, 0],
        [10, 0],
        [0, 10],
        [-10, 0],
        [0, -10],
      ],
    ],
    objects: {
      square: {
        type: 'Polygon',
        arcs: [[0]],
        properties: { name: 'square' },
      },
    },
  };
  const { scene } = compile({
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: { topojson: topology, topologyObject: 'square', projection: 'equirectangular' },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const feature = flattenScene(scene.root).find(({ id }) => id.includes(':map-feature:'));
  assert.equal(feature.datum.tooltip.geometry, 'Polygon');
  assert.match(feature.datum.tooltip.properties, /square/);
});

test('map compiler exposes provider tile requests, subdomain selection, and required attribution', () => {
  const { scene } = compile({
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        tileSource: {
          type: 'raster',
          template: 'https://{s}.tiles.example/{z}/{x}/{y}.png',
          subdomains: ['a', 'b'],
          attribution: 'Example Tiles',
          tileSize: 256,
        },
        tiles: [
          { z: 2, x: 1, y: 1 },
          { z: 2, x: 2, y: 1 },
        ],
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  const tiles = nodes.filter(({ id }) => id.includes(':provider-tile:'));
  assert.equal(tiles.length, 2);
  assert.deepEqual(
    tiles.map(({ datum }) => datum.tooltip.url),
    ['https://a.tiles.example/2/1/1.png', 'https://b.tiles.example/2/2/1.png'],
  );
  assert.ok(tiles.every(({ datum }) => datum.tooltip.lifecycle === 'provider request'));
  assert.ok(
    tiles.every(({ providerTile }) => providerTile?.source.attribution === 'Example Tiles'),
  );
  assert.ok(tiles.every(({ datum }) => datum.tooltip.attribution === 'Example Tiles'));
  assert.equal(nodes.find(({ id }) => id.includes(':map-attribution:')).text, 'Example Tiles');
});

test('Canvas renderer fetches, decodes, draws, deduplicates, and aborts provider tiles', async (context) => {
  const compiled = compile({
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        tileSource: {
          type: 'raster',
          template: 'https://tiles.example/{z}/{x}/{y}.png',
          attribution: 'Example Tiles',
        },
        tiles: [
          { z: 2, x: 1, y: 1 },
          { z: 2, x: 1, y: 1 },
        ],
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const tiles = flattenScene(compiled.scene.root).filter(({ providerTile }) => providerTile);
  const scene = {
    ...compiled.scene,
    root: { ...compiled.scene.root, children: tiles },
  };
  const operations = [];
  const drawingContext = new Proxy(
    { globalAlpha: 1 },
    {
      get(target, property) {
        if (property in target) return target[property];
        if (property === 'drawImage')
          return (...args) => operations.push(['drawImage', ...args.slice(1)]);
        return () => {};
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    },
  );
  const canvas = {
    dataset: {},
    style: {},
    setAttribute() {},
    getContext: () => drawingContext,
    toDataURL: () => 'data:image/png;base64,',
  };
  const root = { dataset: {}, style: {}, append() {}, remove() {} };
  const originals = {
    document: globalThis.document,
    fetch: globalThis.fetch,
    createImageBitmap: globalThis.createImageBitmap,
  };
  context.after(() => {
    for (const [name, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  });
  globalThis.document = {
    createElement(tagName) {
      return tagName === 'canvas' ? canvas : root;
    },
  };
  const decoded = [];
  globalThis.createImageBitmap = async () => {
    const image = {
      closeCalled: false,
      close() {
        this.closeCalled = true;
      },
    };
    decoded.push(image);
    return image;
  };
  const signals = [];
  globalThis.fetch = async (_url, { signal }) => {
    signals.push(signal);
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'content-type': 'image/png', 'cache-control': 'max-age=60' },
    });
  };

  const renderer = new CanvasRenderer();
  renderer.mount(
    { append() {} },
    { width: scene.width, height: scene.height, pixelRatio: 1, ariaLabel: 'Provider map' },
  );
  renderer.render(scene);
  renderer.render(scene);
  assert.equal(signals.length, 1, 'duplicate visible tiles share one request');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(renderer.providerTileState(), {
    sources: 1,
    loading: 0,
    ready: 1,
    failed: 0,
  });
  assert.ok(operations.some(([operation]) => operation === 'drawImage'));

  let aborted = false;
  globalThis.fetch = (_url, { signal }) => {
    signals.push(signal);
    return new Promise((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => {
          aborted = true;
          reject(signal.reason);
        },
        { once: true },
      );
    });
  };
  const pendingTile = {
    ...tiles[0],
    id: 'map:provider-tile:2:2:1',
    providerTile: { ...tiles[0].providerTile, tile: { z: 2, x: 2, y: 1 } },
  };
  renderer.render({ ...scene, root: { ...scene.root, children: [pendingTile] } });
  assert.equal(renderer.providerTileState().loading, 1);
  renderer.destroy();
  await Promise.resolve();
  assert.equal(aborted, true);
  assert.equal(decoded[0].closeCalled, true);
  assert.deepEqual(renderer.providerTileState(), {
    sources: 0,
    loading: 0,
    ready: 0,
    failed: 0,
  });
});

test('Canvas provider scheduler bounds 129 visible tiles and aborts work that leaves the scene', async (context) => {
  const compiled = compile({
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        tileSource: {
          type: 'raster',
          template: 'https://tiles.example/{z}/{x}/{y}.png',
          attribution: 'Bounded provider',
        },
        tiles: [{ z: 8, x: 0, y: 0 }],
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const prototype = flattenScene(compiled.scene.root).find(({ providerTile }) => providerTile);
  const sceneWith = (xs) => ({
    ...compiled.scene,
    root: {
      ...compiled.scene.root,
      children: xs.map((x) => ({
        ...prototype,
        id: `map:provider-tile:8:${x}:0`,
        providerTile: { ...prototype.providerTile, tile: { z: 8, x, y: 0 } },
      })),
    },
  });
  const drawingContext = new Proxy(
    { globalAlpha: 1 },
    {
      get(target, property) {
        if (property in target) return target[property];
        return () => {};
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    },
  );
  const canvas = {
    dataset: {},
    style: {},
    setAttribute() {},
    getContext: () => drawingContext,
    toDataURL: () => 'data:image/png;base64,',
  };
  const root = { dataset: {}, style: {}, append() {}, remove() {} };
  const originals = {
    document: globalThis.document,
    fetch: globalThis.fetch,
    createImageBitmap: globalThis.createImageBitmap,
  };
  context.after(() => {
    for (const [name, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  });
  globalThis.document = {
    createElement(tagName) {
      return tagName === 'canvas' ? canvas : root;
    },
  };
  globalThis.createImageBitmap = async () => ({ close() {} });
  let active = 0;
  let maximumActive = 0;
  let calls = 0;
  let aborted = 0;
  globalThis.fetch = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      calls += 1;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      signal.addEventListener(
        'abort',
        () => {
          active -= 1;
          aborted += 1;
          reject(signal.reason);
        },
        { once: true },
      );
    });

  const renderer = new CanvasRenderer();
  renderer.mount(
    { append() {} },
    {
      width: compiled.scene.width,
      height: compiled.scene.height,
      pixelRatio: 1,
      ariaLabel: 'Bounded provider map',
    },
  );
  renderer.render(sceneWith(Array.from({ length: 129 }, (_, index) => index)));
  assert.equal(calls, 8, 'only the bounded active window reaches fetch');
  assert.equal(maximumActive, 8);
  assert.equal(
    renderer.providerTileState().loading,
    129,
    'queued and active work stays observable',
  );

  renderer.render(sceneWith([]));
  await Promise.resolve();
  assert.equal(calls, 8, 'cancelled queued tiles never start');
  assert.equal(aborted, 8, 'all active tiles abort when they leave the visible scene');
  assert.equal(active, 0);
  assert.deepEqual(renderer.providerTileState(), {
    sources: 1,
    loading: 0,
    ready: 0,
    failed: 0,
  });
  renderer.destroy();
});

test('Canvas decoded provider tiles use a 128-entry LRU and close the least-recent image', async (context) => {
  const compiled = compile({
    data: [{ longitude: 0, latitude: 0 }],
    mark: {
      type: 'map',
      options: {
        tileSource: {
          type: 'raster',
          template: 'https://tiles.example/{z}/{x}/{y}.png',
          attribution: 'LRU provider',
        },
        tiles: [{ z: 8, x: 0, y: 0 }],
      },
    },
    x: { field: 'longitude', type: 'quantitative' },
    y: { field: 'latitude', type: 'quantitative' },
  });
  const prototype = flattenScene(compiled.scene.root).find(({ providerTile }) => providerTile);
  const sceneWith = (xs) => ({
    ...compiled.scene,
    root: {
      ...compiled.scene.root,
      children: xs.map((x) => ({
        ...prototype,
        id: `map:provider-tile:8:${x}:0`,
        providerTile: { ...prototype.providerTile, tile: { z: 8, x, y: 0 } },
      })),
    },
  });
  const drawingContext = new Proxy(
    { globalAlpha: 1 },
    {
      get(target, property) {
        if (property in target) return target[property];
        return () => {};
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    },
  );
  const canvas = {
    dataset: {},
    style: {},
    setAttribute() {},
    getContext: () => drawingContext,
    toDataURL: () => 'data:image/png;base64,',
  };
  const root = { dataset: {}, style: {}, append() {}, remove() {} };
  const originals = {
    document: globalThis.document,
    fetch: globalThis.fetch,
    createImageBitmap: globalThis.createImageBitmap,
  };
  context.after(() => {
    for (const [name, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[name];
      else globalThis[name] = value;
    }
  });
  globalThis.document = {
    createElement(tagName) {
      return tagName === 'canvas' ? canvas : root;
    },
  };
  const images = new Map();
  globalThis.createImageBitmap = async (blob) => {
    const [id] = new Uint8Array(await blob.arrayBuffer());
    const image = {
      id,
      closeCalled: false,
      close() {
        this.closeCalled = true;
      },
    };
    images.set(id, image);
    return image;
  };
  globalThis.fetch = async (url) => {
    const x = Number(/\/8\/(\d+)\/0\.png$/u.exec(url)?.[1]);
    return new Response(new Uint8Array([x]), {
      headers: { 'content-type': 'image/png', 'cache-control': 'max-age=60' },
    });
  };
  const waitFor = async (predicate) => {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      if (predicate()) return;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.fail('Canvas provider tiles did not settle within the bounded test window.');
  };

  const renderer = new CanvasRenderer();
  renderer.mount(
    { append() {} },
    {
      width: compiled.scene.width,
      height: compiled.scene.height,
      pixelRatio: 1,
      ariaLabel: 'LRU provider map',
    },
  );
  renderer.render(sceneWith(Array.from({ length: 128 }, (_, index) => index)));
  await waitFor(() => renderer.providerTileState().loading === 0);
  assert.deepEqual(renderer.providerTileState(), {
    sources: 1,
    loading: 0,
    ready: 128,
    failed: 0,
  });

  renderer.render(sceneWith([0]));
  renderer.render(sceneWith([128]));
  await waitFor(() => renderer.providerTileState().loading === 0);
  assert.equal(images.size, 129);
  assert.equal(renderer.providerTileState().ready, 128);
  assert.equal(images.get(0).closeCalled, false, 'a recent cache hit is retained');
  assert.equal(images.get(1).closeCalled, true, 'the least-recent decoded image is closed');
  assert.equal(images.get(128).closeCalled, false, 'the newly decoded image is retained');

  renderer.destroy();
  assert.ok([...images.values()].every(({ closeCalled }) => closeCalled));
});
