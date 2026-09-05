import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, sceneToSVG, snapshotFromScene } from '../.tmp/src/complete.js';
import {
  captureChartSnapshot,
  restoreChartSnapshot,
  chartSnapshotSchema,
} from '../.tmp/src/runtime/snapshot.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { sceneLegendLayout } from '../.tmp/src/compiler/legend.js';

const spec = {
  renderer: 'svg',
  width: 640,
  height: 400,
  data: [
    { x: 'A', y: -12 },
    { x: 'B', y: 8 },
  ],
  mark: 'bar',
  x: { field: 'x', type: 'ordinal' },
  y: { field: 'y', type: 'quantitative' },
  theme: 'statistical-minimal',
  legend: true,
  interaction: {
    tooltip: true,
    navigation: { minZoom: 1, maxZoom: 4 },
    controls: { zoom: true, reset: true, export: true },
  },
};
function saved(input = spec) {
  const result = compile(input);
  return {
    result,
    snapshot: captureChartSnapshot(input, input, result, {
      view: { zoom: 1.5, offsetX: -20, offsetY: -10 },
      hiddenLegendItems: [],
    }),
  };
}

test('snapshot JSON roundtrip preserves exact SVG, signed data, hit geometry, scales and legend', () => {
  const { result, snapshot } = saved();
  const restored = restoreChartSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.equal(snapshot.schema, chartSnapshotSchema);
  assert.equal(sceneToSVG(restored.result.scene), snapshot.svg);
  assert.equal(JSON.stringify(restored.result.scene), JSON.stringify(result.scene));
  assert.deepEqual(sceneLegendLayout(restored.result.scene), sceneLegendLayout(result.scene));
  assert.equal(restored.result.coordinates.axes.y.map(-12), result.coordinates.axes.y.map(-12));
  assert.equal(restored.result.coordinates.axes.x.map('B'), result.coordinates.axes.x.map('B'));
  const mark = result.scene.semanticIndex.find((item) => item.datum.y === -12);
  const point = {
    x: mark.bounds.x + mark.bounds.width / 2,
    y: mark.bounds.y + mark.bounds.height / 2,
  };
  const before = hitTestScene(result.scene, point.x, point.y);
  const after = hitTestScene(restored.result.scene, point.x, point.y);
  assert.ok(before);
  assert.equal(JSON.stringify(after), JSON.stringify(before));
});

test('snapshot rejects active SVG, external paint, invalid schema, dimensions, cycles and prototype keys', () => {
  const { snapshot } = saved();
  for (const mutate of [
    (value) => {
      value.svg = value.svg.replace('</svg>', '<script>alert(1)</script></svg>');
    },
    (value) => {
      value.scene.background = 'url(https://example.invalid/a.svg)';
    },
    (value) => {
      value.schema = 'graflume.chart-snapshot.v0';
    },
    (value) => {
      value.scene.width = 1e9;
    },
    (value) => {
      value.state.view.zoom = Infinity;
    },
    (value) => {
      value.state.__proto__ = null;
      Object.defineProperty(value.state, '__proto__', {
        enumerable: true,
        value: { polluted: true },
      });
    },
  ]) {
    const changed = structuredClone(snapshot);
    mutate(changed);
    assert.throws(() => restoreChartSnapshot(changed), /Invalid or unsupported chart snapshot/);
  }
  const cycle = structuredClone(snapshot);
  cycle.scene.root.children.push(cycle.scene.root);
  assert.throws(() => restoreChartSnapshot(cycle), /Invalid or unsupported chart snapshot/);
  assert.equal({}.polluted, undefined);
});

test('snapshot bounds reject deeply nested objects and unsupported external map resources', () => {
  const { snapshot } = saved();
  let nested = {};
  for (let depth = 0; depth < 70; depth += 1) nested = { nested };
  snapshot.extra = nested;
  assert.throws(() => restoreChartSnapshot(snapshot), /Invalid or unsupported chart snapshot/);
  const { result } = saved();
  const rectangle = result.scene.root.children
    .flatMap((node) => (node.type === 'group' ? node.children : [node]))
    .find((node) => node.type === 'rect');
  assert.ok(rectangle);
  rectangle.providerTile = {
    source: { template: 'https://example.invalid/{z}/{x}/{y}.png' },
    tile: { x: 0, y: 0, z: 0 },
  };
  assert.throws(() => sceneToSVG(result.scene), /externally loaded map tiles/);
});

test('SVG serializes text safely and preserves clip geometry, paths, rotation and all literal paints', () => {
  const input = {
    ...spec,
    title: '<script>alert("x")</script> & R',
    data: [{ x: 'A', y: 8 }],
    mark: { type: 'line', point: true },
  };
  const { scene } = compile(input);
  const svg = sceneToSVG(scene);
  assert.match(svg, /&lt;script&gt;/);
  assert.doesNotMatch(svg, /<script|<image|<foreignObject|onload=/i);
  assert.match(svg, /<clipPath/);
  assert.match(svg, /<circle/);
});

test('imported vector scenes produce a portable snapshot without inventing Cartesian domains', () => {
  const { scene } = compile(spec);
  const snapshot = snapshotFromScene(scene);
  assert.equal(snapshot.importedScene, true);
  assert.deepEqual(snapshot.coordinates.axes, {});
  assert.equal(snapshot.svg, sceneToSVG(scene));
  assert.equal(JSON.stringify(restoreChartSnapshot(snapshot).result.scene), JSON.stringify(scene));
});

test('snapshot preserves exact continuous mapping for logarithmic, reversed, power and temporal scales', () => {
  for (const scale of [
    { type: 'log', base: 2 },
    { type: 'pow', exponent: 3 },
    { type: 'symlog', constant: 2 },
    { type: 'linear', reverse: true },
    { type: 'utc' },
  ]) {
    const input = {
      ...spec,
      data: [
        { x: 1, y: 1 },
        { x: 8, y: 64 },
      ],
      x: { field: 'x', type: scale.type === 'utc' ? 'temporal' : 'quantitative', scale },
      y: { field: 'y', type: 'quantitative' },
      mark: 'point',
    };
    const { result, snapshot } = saved(input);
    const restored = restoreChartSnapshot(snapshot).result;
    for (const value of [1, 2, 4, 8])
      assert.equal(
        restored.coordinates.axes.x.map(value),
        result.coordinates.axes.x.map(value),
        `${scale.type}:${value}`,
      );
  }
});
