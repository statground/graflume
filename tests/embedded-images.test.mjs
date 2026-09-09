import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import {
  embeddedImageInfo,
  validateImageNode,
  imageNodeBounds,
  embeddedImageLimits,
} from '../.tmp/src/scene/image.js';
import { EmbeddedImages, sceneImages } from '../.tmp/src/renderer/embedded-images.js';
import { compile, sceneToSVG, snapshotFromScene } from '../.tmp/src/complete.js';
import { restoreChartSnapshot } from '../.tmp/src/runtime/snapshot.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';

function png(width = 2, height = 2, extra = []) {
  const chunk = (name, bytes) => {
    const size = Buffer.alloc(4);
    size.writeUInt32BE(bytes.length);
    return Buffer.concat([size, Buffer.from(name), bytes, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return (
    'data:image/png;base64,' +
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      ...extra.map((n) => (Array.isArray(n) ? chunk(n[0], n[1]) : chunk(n, Buffer.alloc(0)))),
      chunk(
        'IDAT',
        deflateSync(
          Buffer.from([0, 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 255, 255, 255, 255, 0, 255]),
        ),
      ),
      chunk('IEND', Buffer.alloc(0)),
    ]).toString('base64')
  );
}
const node = (extra = {}) => ({
  id: 'raster',
  type: 'image',
  visible: true,
  opacity: 1,
  zIndex: 1,
  x: 10,
  y: 20,
  width: 100,
  height: 60,
  transform: [1, 0, 0, 1, 0, 0],
  preserveAspectRatio: 'none',
  dataURI: png(),
  ...extra,
});
const root = (nodes) => ({
  id: 'root',
  type: 'group',
  visible: true,
  opacity: 1,
  zIndex: 0,
  children: nodes,
});

test('embedded binary headers, dimensions, animation and finite geometry are bounded before decoding', () => {
  assert.deepEqual(embeddedImageInfo(png()), {
    mime: 'image/png',
    width: 2,
    height: 2,
    bytes: embeddedImageInfo(png()).bytes,
  });
  for (const uri of [
    'https://example.invalid/map.png',
    'data:image/svg+xml;base64,PHN2Zy8+',
    'data:image/png;base64,AAAA',
    png(9000, 1),
    png(4000, 4000),
    png(0, 1),
    png(2, 2, ['acTL']),
    png(2, 2, ['zTXt']),
    png(2, 2, ['iCCP']),
    png().replace('png', 'jpeg'),
  ])
    assert.throws(() => embeddedImageInfo(uri));
  for (const extra of [
    { width: -1 },
    { transform: [1, 0, 0, 1, Infinity, 0] },
    { transform: [1e12, 0, 0, 1, 0, 0] },
    { preserveAspectRatio: 'xMidYMid meet onload=alert(1)' },
  ])
    assert.throws(() => validateImageNode(node(extra)));
  assert.deepEqual(imageNodeBounds(node({ transform: [-1, 0, 0, 1, 120, 0] })), {
    x: 10,
    y: 20,
    width: 100,
    height: 60,
  });
});

test('scene limits count repeated nodes but share bounded repeated image resources', () => {
  assert.equal(sceneImages(root(Array.from({ length: 64 }, () => node()))).size, 1);
  assert.throws(() => sceneImages(root(Array.from({ length: 65 }, () => node()))), /too many/);
  assert.throws(
    () =>
      sceneImages(
        root([
          node({ dataURI: png(2000, 4000) }),
          node({ dataURI: png(4000, 2000) }),
          node({ dataURI: png(4000, 1999) }),
        ]),
      ),
    /budget/,
  );
  const large = png(2, 2, [['tEXt', Buffer.alloc(3 * 1024 * 1024)]]);
  assert.throws(
    () => sceneImages(root(Array.from({ length: 3 }, () => node({ dataURI: large })))),
    /byte budget/,
  );
  assert.equal(embeddedImageLimits.bytes, 4 * 1024 * 1024);
});

test('image snapshots preserve literal pixels, affine geometry, clips and selection with no Cartesian inference', () => {
  const image = node({
    transform: [1, 1, -1, 1, 150, 0],
    interactive: true,
    datum: { datum: { id: 'map' }, tooltip: { kind: 'image' } },
  });
  const scene = {
    ...compile({
      data: [{ x: 0, y: 0 }],
      mark: 'point',
      x: 'x',
      y: 'y',
      axes: { x: false, y: false },
      width: 400,
      height: 300,
    }).scene,
    root: root([image]),
  };
  const saved = snapshotFromScene(scene);
  const restored = restoreChartSnapshot(JSON.parse(JSON.stringify(saved)));
  assert.equal(saved.importedScene, true);
  assert.equal(sceneToSVG(restored.result.scene), saved.svg);
  assert.match(saved.svg, /<image/);
  assert.match(saved.svg, /data:image\/png;base64/);
  assert.match(saved.svg, /matrix\(1 1 -1 1 150 0\)/);
  assert.equal(hitTestScene(scene, 160, 110)?.datum.id, 'map');
  assert.equal(
    hitTestScene(scene, 91, 31),
    null,
    'outside rotated quadrilateral, inside its bounding box',
  );
  const corrupt = structuredClone(saved);
  corrupt.scene.root.children[0].dataURI = 'https://example.invalid/a.png';
  assert.throws(() => restoreChartSnapshot(corrupt));
});

test('decode store deduplicates resources, awaits updated scenes and disposes stale bitmap work', async () => {
  const old = globalThis.createImageBitmap;
  const pending = [];
  let closed = 0;
  globalThis.createImageBitmap = () =>
    new Promise((resolve) =>
      pending.push(() =>
        resolve({
          width: 2,
          height: 2,
          close() {
            closed++;
          },
        }),
      ),
    );
  try {
    const images = new EmbeddedImages();
    images.reconcile(root([node(), node()]));
    assert.throws(() => images.assertReady(), /still decoding/);
    await Promise.resolve();
    assert.equal(pending.length, 1);
    let done = false;
    const ready = images.whenReady().then(() => {
      done = true;
    });
    const second = png(2, 2, ['tEXt']);
    images.reconcile(root([node(), node({ dataURI: second })]));
    await Promise.resolve();
    assert.equal(pending.length, 2);
    pending[0]();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(done, false);
    pending[1]();
    await ready;
    images.assertReady();
    assert.ok(images.get(second));
    images.reconcile(root([node({ dataURI: second })]));
    assert.equal(closed, 1);
    images.destroy();
    assert.equal(closed, 2);
    const cancelled = new EmbeddedImages();
    cancelled.reconcile(root([node()]));
    await Promise.resolve();
    cancelled.destroy();
    pending[2]();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(closed, 3);
  } finally {
    globalThis.createImageBitmap = old;
  }
});

test('decoder errors reject readiness and never silently export missing pixels', async () => {
  const old = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => {
    throw new Error('corrupt pixel stream');
  };
  try {
    const images = new EmbeddedImages();
    images.reconcile(root([node()]));
    await assert.rejects(images.whenReady(), /corrupt pixel/);
    assert.throws(() => images.assertReady(), /corrupt pixel/);
    images.destroy();
  } finally {
    globalThis.createImageBitmap = old;
  }
});

test('readiness ignores a failed decode removed by a newer scene', async () => {
  const old = globalThis.createImageBitmap;
  let reject;
  globalThis.createImageBitmap = () =>
    new Promise((resolve, fail) => {
      reject = fail;
    });
  try {
    const images = new EmbeddedImages();
    images.reconcile(root([node()]));
    const ready = images.whenReady();
    await Promise.resolve();
    images.reconcile(root([]));
    reject(new Error('obsolete decode'));
    await ready;
    images.assertReady();
    images.destroy();
  } finally {
    globalThis.createImageBitmap = old;
  }
});
