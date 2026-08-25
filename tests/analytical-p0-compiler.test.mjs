import assert from 'node:assert/strict';
import test from 'node:test';

import { compile } from '../.tmp/src/complete.js';
import { hitTestScene } from '../.tmp/src/interaction/hit-test.js';
import { flattenScene } from '../.tmp/src/scene/walk.js';

const analyticalMetadata = (scene, family) =>
  scene.metadata.analyticalFamilies.find((entry) => entry.family === family);

test('distribution compiler renders shared bins, weighted notches, and deterministic strip geometry', () => {
  const histogram = compile({
    width: 640,
    height: 400,
    data: [
      { series: 'A', value: 0, weight: 2 },
      { series: 'A', value: 2, weight: 1 },
      { series: 'B', value: 1, weight: 3 },
      { series: 'B', value: 2, weight: 4 },
    ],
    mark: {
      type: 'distribution',
      fields: { value: 'value', series: 'series', weight: 'weight' },
      options: { mode: 'histogram', bins: 2 },
    },
    x: { field: 'value', type: 'quantitative' },
    y: { field: 'weight', type: 'quantitative' },
  });
  const bins = flattenScene(histogram.scene.root).filter(({ id }) => id.includes(':shared-bin:'));
  assert.equal(bins.length, 3);
  assert.deepEqual(
    [...new Set(bins.map(({ datum }) => `${datum.tooltip.binStart}:${datum.tooltip.binEnd}`))],
    ['0:1', '1:2'],
  );
  assert.ok(bins.every(({ datum }) => datum.tooltip.analyticsMode === 'shared-histogram'));
  assert.deepEqual(analyticalMetadata(histogram.scene, 'distribution').contracts, [
    'shared-bins',
    'weighted-notched-box',
    'deterministic-rug-strip',
  ]);

  const box = compile({
    data: [
      { category: 'A', value: 1, weight: 1 },
      { category: 'A', value: 2, weight: 2 },
      { category: 'A', value: 8, weight: 1 },
    ],
    mark: {
      type: 'distribution',
      fields: { value: 'value', weight: 'weight' },
      options: { mode: 'boxplot', notched: true },
    },
    x: { field: 'category', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const notch = flattenScene(box.scene.root).find(({ id }) => id.includes(':weighted-notch:'));
  assert.equal(notch.type, 'path');
  assert.equal(notch.points.length, 10);
  assert.equal(notch.datum.tooltip.median, 2);
  assert.ok(notch.datum.tooltip.effectiveSampleSize > 0);

  const stripSpec = {
    data: [{ value: 1 }, { value: 2 }, { value: 3 }],
    mark: {
      type: 'distribution',
      fields: { value: 'value' },
      options: { mode: 'strip', seed: 17, spread: 20 },
    },
    x: { field: 'value', type: 'quantitative' },
    y: { field: 'value', type: 'quantitative' },
  };
  const first = flattenScene(compile(stripSpec).scene.root).filter(({ id }) =>
    id.includes(':strip:'),
  );
  const second = flattenScene(compile(stripSpec).scene.root).filter(({ id }) =>
    id.includes(':strip:'),
  );
  assert.deepEqual(
    first.map(({ cx, cy }) => [cx, cy]),
    second.map(({ cx, cy }) => [cx, cy]),
  );
  assert.ok(first.every(({ datum }) => datum.tooltip.seed === 17));
});

test('heatmap compiler pivots irregular cells, renders missing patterns, and exposes linked brush state', () => {
  const { scene } = compile({
    width: 680,
    height: 420,
    data: [
      { row: 'A', column: 'x', value: -10, x0: 0, x1: 2, y0: 0, y1: 1 },
      { row: 'A', column: 'y', value: null, x0: 2, x1: 5, y0: 0, y1: 1 },
      { row: 'B', column: 'x', value: 1, x0: 0, x1: 2, y0: 1, y1: 3 },
      { row: 'B', column: 'y', value: 10, x0: 2, x1: 5, y0: 1, y1: 3 },
    ],
    mark: {
      type: 'heatmap',
      fields: { value: 'value', x0: 'x0', x1: 'x1', y0: 'y0', y1: 'y1' },
      options: {
        colorMode: 'diverging',
        midpoint: 0,
        missing: { pattern: 'dots', color: '#e5e7eb' },
        brush: { rows: ['B'], value: [0, 5] },
      },
    },
    x: { field: 'column', type: 'nominal' },
    y: { field: 'row', type: 'nominal' },
  });
  const nodes = flattenScene(scene.root);
  const cells = nodes.filter(({ id }) => id.includes(':analytic-heatmap:'));
  assert.equal(cells.length, 4);
  assert.notEqual(cells[0].width, cells[1].width);
  assert.ok(nodes.some(({ id }) => id.includes(':heatmap-missing:') && id.endsWith(':dot')));
  const brushed = cells.find(({ datum }) => datum?.tooltip?.value === 1);
  assert.equal(brushed.datum.tooltip.brushed, true);
  assert.equal(
    hitTestScene(scene, brushed.x + brushed.width / 2, brushed.y + brushed.height / 2)?.rowIndex,
    brushed.datum.rowIndex,
  );
  assert.ok(cells.every(({ datum }) => datum.tooltip.selectionKey.startsWith('heatmap:')));
  const metadata = analyticalMetadata(scene, 'heatmap');
  assert.equal(metadata.interaction.linked, true);
  assert.ok(metadata.contracts.includes('irregular-extents'));
});

test('heatmap compiler consumes a portable direct matrix with labels, order, and irregular extents', () => {
  const { scene } = compile({
    width: 680,
    height: 420,
    data: [{ column: 'placeholder', row: 'placeholder', value: 0 }],
    mark: {
      type: 'heatmap',
      options: {
        matrix: {
          rows: ['A', 'B'],
          columns: ['x', 'y'],
          values: [
            [1, null],
            [2, 3],
          ],
          xExtents: [
            [0, 2],
            [2, 5],
          ],
          yExtents: [
            [0, 1],
            [1, 3],
          ],
        },
        rowOrder: ['B', 'A'],
        columnOrder: ['y', 'x'],
        missing: { pattern: 'cross' },
      },
    },
    x: { field: 'column', type: 'nominal' },
    y: { field: 'row', type: 'nominal' },
  });
  const nodes = flattenScene(scene.root);
  const cells = nodes.filter(({ id }) => id.includes(':analytic-heatmap:'));
  assert.equal(cells.length, 4);
  assert.deepEqual(
    cells.map(({ datum }) => [datum.tooltip.row, datum.tooltip.column, datum.tooltip.value]),
    [
      ['B', 'y', 3],
      ['B', 'x', 2],
      ['A', 'y', null],
      ['A', 'x', 1],
    ],
  );
  assert.deepEqual(
    cells.find(({ datum }) => datum.tooltip.row === 'A' && datum.tooltip.column === 'y').datum
      .tooltip.extent,
    [2, 5, 0, 1],
  );
  assert.ok(nodes.some(({ id }) => id.includes(':heatmap-missing:') && id.includes(':cross:')));
});

test('image compiler materializes portable raster sampling, origin, extent, and color metadata', () => {
  const { scene, coordinates } = compile({
    width: 500,
    height: 360,
    data: [{ x: 0, y: 0 }],
    mark: {
      type: 'image',
      options: {
        raster: {
          width: 2,
          height: 2,
          channels: 1,
          values: [0, 10, 20, 30],
          extent: [10, 20, 100, 200],
          origin: 'lower',
        },
        outputWidth: 3,
        outputHeight: 3,
        resampling: 'bilinear',
        window: [0, 30],
        colormap: ['#000000', '#ffffff'],
        alpha: 0.5,
      },
    },
    x: { field: 'x', type: 'quantitative', scale: { domain: [0, 30] } },
    y: { field: 'y', type: 'quantitative', scale: { domain: [0, 300] } },
  });
  const pixels = flattenScene(scene.root).filter(({ id }) => id.includes(':analytic-image:'));
  assert.equal(pixels.length, 9);
  assert.equal(pixels[0].datum.tooltip.resampling, 'bilinear');
  assert.equal(pixels[0].datum.tooltip.origin, 'lower');
  assert.deepEqual(pixels[0].datum.tooltip.extent, [10, 20, 100, 200]);
  assert.ok(new Set(pixels.map(({ fill }) => fill)).size > 1);
  assert.ok(Math.min(...pixels.map(({ x }) => x)) > coordinates.plot.x);
  assert.ok(
    Math.max(...pixels.map(({ x, width }) => x + width)) <
      coordinates.plot.x + coordinates.plot.width,
  );
  const bottom = [...pixels].sort((left, right) => right.y - left.y)[0];

  const alternate = compile({
    width: 500,
    height: 360,
    data: [{ x: 0, y: 0 }],
    mark: {
      type: 'image',
      options: {
        raster: {
          width: 2,
          height: 2,
          channels: 1,
          values: [0, 10, 20, 30],
          extent: [0, 10, 0, 100],
          origin: 'upper',
        },
        outputWidth: 2,
        outputHeight: 2,
        window: [0, 30],
        colormap: ['#000000', '#ffffff'],
      },
    },
    x: { field: 'x', type: 'quantitative', scale: { domain: [0, 30] } },
    y: { field: 'y', type: 'quantitative', scale: { domain: [0, 300] } },
  });
  const alternatePixels = flattenScene(alternate.scene.root).filter(({ id }) =>
    id.includes(':analytic-image:'),
  );
  assert.equal(Math.min(...alternatePixels.map(({ x }) => x)), alternate.coordinates.plot.x);
  assert.notEqual(
    Math.max(...alternatePixels.map(({ x, width }) => x + width)),
    Math.max(...pixels.map(({ x, width }) => x + width)),
  );
  const alternateBottom = [...alternatePixels].sort((left, right) => right.y - left.y)[0];
  assert.notEqual(bottom.fill, alternateBottom.fill);

  const automatic = compile({
    width: 500,
    height: 360,
    data: [{ x: 0, y: 0 }],
    mark: {
      type: 'image',
      options: {
        raster: {
          width: 2,
          height: 2,
          channels: 1,
          values: [0, 10, 20, 30],
          extent: [10, 20, 100, 200],
          origin: 'lower',
        },
      },
    },
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  });
  const automaticPixels = flattenScene(automatic.scene.root).filter(({ id }) =>
    id.includes(':analytic-image:'),
  );
  const span = (items) =>
    Math.max(...items.map(({ x, width }) => x + width)) - Math.min(...items.map(({ x }) => x));
  assert.ok(span(automaticPixels) > span(pixels) * 2.5);
  assert.ok(
    automaticPixels.every(({ x, y, width, height }) =>
      [x, y, width, height].every(Number.isFinite),
    ),
  );
  assert.ok(analyticalMetadata(scene, 'image').contracts.includes('window-colormap-alpha'));
});

test('ternary and Smith compilers expose normalized and specialist projected coordinates', () => {
  const ternary = compile({
    data: [
      { id: 'a', a: 2, b: 3, c: 5 },
      { id: 'b', a: 4, b: 4, c: 2 },
    ],
    mark: {
      type: 'ternary',
      fields: { a: 'a', b: 'b', c: 'c', id: 'id' },
      options: {
        sum: 10,
        policy: 'normalize',
        ticks: 4,
        tickFormat: 'percent',
        tickFractionDigits: 0,
      },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  const ternaryPoints = flattenScene(ternary.scene.root).filter(({ id }) =>
    id.includes(':analytic-ternary-point:'),
  );
  assert.equal(ternaryPoints.length, 2);
  assert.ok(
    ternaryPoints.every(
      ({ datum }) =>
        Math.abs(datum.tooltip.normalized.reduce((sum, value) => sum + value, 0) - 1) < 1e-12,
    ),
  );
  assert.equal(
    hitTestScene(ternary.scene, ternaryPoints[0].cx, ternaryPoints[0].cy)?.rowIndex,
    ternaryPoints[0].datum.rowIndex,
  );
  const ternaryNodes = flattenScene(ternary.scene.root);
  assert.equal(ternaryNodes.filter(({ id }) => id.includes(':analytic-ternary-grid:')).length, 9);
  const ternaryTicks = ternaryNodes.filter(({ id }) => id.includes(':ternary-tick:'));
  assert.equal(ternaryTicks.length, 15);
  assert.deepEqual(
    [...new Set(ternaryTicks.map(({ text }) => text))],
    ['0%', '25%', '50%', '75%', '100%'],
  );
  assert.ok(analyticalMetadata(ternary.scene, 'ternary').contracts.includes('constant-sum'));
  assert.ok(
    analyticalMetadata(ternary.scene, 'ternary').contracts.includes('component-ticks-format'),
  );

  const smith = compile({
    data: [
      { id: 'matched', real: 50, imaginary: 0 },
      { id: 'load', real: 100, imaginary: 25 },
    ],
    mark: {
      type: 'smith',
      fields: { real: 'real', imaginary: 'imaginary', id: 'id' },
      options: { mode: 'z', referenceImpedance: 50, grid: 'combined' },
    },
    x: { field: 'real', type: 'quantitative' },
    y: { field: 'imaginary', type: 'quantitative' },
  });
  const smithPoints = flattenScene(smith.scene.root).filter(({ id }) =>
    id.includes(':analytic-smith-point:'),
  );
  assert.equal(smithPoints.length, 2);
  assert.deepEqual(smithPoints[0].datum.tooltip.reflection, [0, 0]);
  assert.equal(smithPoints[0].datum.tooltip.referenceImpedance, 50);
  const smithNodes = flattenScene(smith.scene.root);
  assert.ok(smithNodes.some(({ id }) => id.includes(':analytic-smith-grid:impedance:radial:')));
  assert.ok(smithNodes.some(({ id }) => id.includes(':analytic-smith-grid:impedance:curved:')));
  assert.ok(smithNodes.some(({ id }) => id.includes(':analytic-smith-grid:admittance:radial:')));
  assert.ok(smithNodes.some(({ id }) => id.includes(':analytic-smith-grid:admittance:curved:')));
  const smithLabels = smithNodes
    .filter(({ id }) => id.includes(':analytic-smith-label:'))
    .map(({ text }) => text);
  assert.ok(smithLabels.some((label) => label.startsWith('r=')));
  assert.ok(smithLabels.some((label) => label.startsWith('+j')));
  assert.ok(smithLabels.some((label) => label.startsWith('g=')));
  assert.ok(smithLabels.some((label) => label.startsWith('+jb')));
  assert.ok(analyticalMetadata(smith.scene, 'smith').contracts.includes('reflection-z-y-s'));
  assert.ok(analyticalMetadata(smith.scene, 'smith').contracts.includes('specialist-labels'));

  const smithGridKinds = (grid) =>
    flattenScene(
      compile({
        data: [{ real: 50, imaginary: 10 }],
        mark: {
          type: 'smith',
          fields: { real: 'real', imaginary: 'imaginary' },
          options: { mode: 'z', referenceImpedance: 50, grid },
        },
        x: { field: 'real', type: 'quantitative' },
        y: { field: 'imaginary', type: 'quantitative' },
      }).scene.root,
    )
      .filter(({ id }) => id.includes(':analytic-smith-grid:'))
      .map(({ id }) => id);
  const impedanceGrid = smithGridKinds('impedance');
  const admittanceGrid = smithGridKinds('admittance');
  assert.ok(impedanceGrid.length > 0 && impedanceGrid.every((id) => id.includes(':impedance:')));
  assert.ok(admittanceGrid.length > 0 && admittanceGrid.every((id) => id.includes(':admittance:')));
  assert.notDeepEqual(impedanceGrid, admittanceGrid);
});

test('scatter-matrix compiler renders independent cell kinds with one linked selection contract', () => {
  const data = Array.from({ length: 24 }, (_, index) => ({
    id: `row-${index}`,
    a: index,
    b: index * 2 + (index % 3),
    c: 24 - index + (index % 5),
  }));
  const { scene } = compile({
    width: 720,
    height: 540,
    data,
    mark: {
      type: 'scatter-matrix',
      fields: { id: 'id' },
      options: {
        variables: ['a', 'b', 'c'],
        diagonal: 'ecdf',
        upper: 'correlation',
        lower: 'hexbin',
      },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  const nodes = flattenScene(scene.root);
  assert.ok(nodes.some(({ id }) => id.includes(':analytic-scatter-matrix-ecdf:')));
  assert.ok(nodes.some(({ id }) => id.includes(':analytic-scatter-matrix-correlation:')));
  const bins = nodes.filter(({ id }) => id.includes(':analytic-scatter-matrix-hexbin:'));
  assert.ok(bins.length > 0);
  assert.ok(bins.every(({ datum }) => datum.tooltip.linkedSelectionKey === 'scatter-matrix'));
  const metadata = analyticalMetadata(scene, 'scatter-matrix');
  assert.equal(metadata.interaction.linked, true);
  assert.equal(metadata.interaction.selectionKey, 'scatter-matrix');

  const kde = flattenScene(
    compile({
      data,
      mark: {
        type: 'scatter-matrix',
        options: {
          variables: ['a', 'b'],
          diagonal: 'kde',
          upper: 'scatter',
          lower: 'none',
          bandwidth: 2,
        },
      },
      x: { field: 'a', type: 'quantitative' },
      y: { field: 'b', type: 'quantitative' },
    }).scene.root,
  ).filter(({ id }) => id.includes(':analytic-scatter-matrix-kde:'));
  assert.equal(kde.length, 2);
  assert.ok(kde.every(({ datum }) => datum.tooltip.bandwidth === 2));
});

test('carpet and item compilers surface masks, dual coordinates, partial units, and fill direction', () => {
  const carpet = compile({
    width: 640,
    height: 420,
    data: [
      { id: 'middle', a: 0.5, b: 1 },
      { id: 'right', a: 2, b: 1 },
    ],
    mark: {
      type: 'carpet',
      fields: { a: 'a', b: 'b', id: 'id' },
      options: {
        grid: {
          a: [0, 1, 3],
          b: [0, 2],
          x: [
            [0, 1, 3],
            [1, 2, 4],
          ],
          y: [
            [0, 0, 0],
            [2, 3, 4],
          ],
          mask: [
            [true, true, true],
            [true, false, true],
          ],
        },
      },
    },
    x: { field: 'a', type: 'quantitative' },
    y: { field: 'b', type: 'quantitative' },
  });
  const carpetNodes = flattenScene(carpet.scene.root);
  assert.ok(carpetNodes.some(({ id }) => id.includes(':analytic-carpet-mask:')));
  const carpetPoints = carpetNodes.filter(({ id }) => id.includes(':analytic-carpet-point:'));
  assert.equal(carpetPoints.length, 2);
  assert.equal(carpetPoints[0].datum.tooltip.masked, true);
  assert.deepEqual(carpetPoints[0].datum.tooltip.logical, [0.5, 1]);
  assert.deepEqual(carpetPoints[0].datum.tooltip.projected, [1, 1.25]);
  const carpetTickLabels = carpetNodes.filter(({ id }) =>
    id.includes(':analytic-carpet-tick-label:'),
  );
  assert.equal(carpetTickLabels.length, 5);
  assert.deepEqual([...new Set(carpetTickLabels.map(({ text }) => text))], ['0', '1', '3', '2']);
  assert.ok(analyticalMetadata(carpet.scene, 'carpet').contracts.includes('mask'));
  assert.ok(analyticalMetadata(carpet.scene, 'carpet').contracts.includes('logical-axis-ticks'));

  const item = compile({
    width: 520,
    height: 360,
    data: [
      { group: 'A', value: 2.5 },
      { group: 'B', value: 1 },
    ],
    mark: {
      type: 'item',
      options: {
        mode: 'isotype',
        unit: 1,
        columns: 3,
        direction: 'row-reverse',
        partial: 'fraction',
      },
    },
    x: { field: 'group', type: 'nominal' },
    y: { field: 'value', type: 'quantitative' },
  });
  const units = flattenScene(item.scene.root).filter(({ id }) => id.includes(':analytic-item:'));
  assert.equal(units.length, 4);
  const partial = units.find(({ datum }) => datum.tooltip.fraction === 0.5);
  assert.ok(partial.radius < Math.max(...units.map(({ radius }) => radius)));
  assert.match(partial.datum.tooltip.accessibleLabel, /0.5 of 2.5/);
  assert.equal(partial.datum.tooltip.direction, 'row-reverse');
  assert.ok(analyticalMetadata(item.scene, 'item').contracts.includes('partial-units'));
});

test('analytical family option enums fail closed instead of silently selecting another mode', () => {
  assert.throws(
    () =>
      compile({
        data: [{ row: 'A', column: 'x', value: 1 }],
        mark: {
          type: 'heatmap',
          fields: { value: 'value' },
          options: { colorMode: 'rainbow' },
        },
        x: { field: 'column', type: 'nominal' },
        y: { field: 'row', type: 'nominal' },
      }),
    /colorMode must be one of/,
  );
  assert.throws(
    () =>
      compile({
        data: [
          { a: 1, b: 2 },
          { a: 2, b: 3 },
        ],
        mark: { type: 'scatter-matrix', options: { diagonal: 'spline' } },
        x: { field: 'a', type: 'quantitative' },
        y: { field: 'b', type: 'quantitative' },
      }),
    /diagonal must be one of/,
  );
  assert.throws(
    () =>
      compile({
        data: [{ group: 'A', value: 2 }],
        mark: { type: 'item', options: { partial: 'random' } },
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
      }),
    /partial must be one of/,
  );
});

test('analytical specialist scenes obey ultra point and line budgets', () => {
  const ternaryData = Array.from({ length: 9_000 }, (_, index) => ({
    id: `ternary-${index}`,
    a: 0.2,
    b: 0.3,
    c: 0.5,
  }));
  const ternaryNodes = flattenScene(
    compile({
      data: ternaryData,
      mark: {
        type: 'ternary',
        fields: { a: 'a', b: 'b', c: 'c', id: 'id' },
        options: { sum: 1, policy: 'reject' },
      },
      x: { field: 'a', type: 'quantitative' },
      y: { field: 'b', type: 'quantitative' },
      performance: 'ultra',
    }).scene.root,
  );
  assert.equal(
    ternaryNodes.filter(({ id }) => id.includes(':analytic-ternary-point:')).length,
    8_000,
  );
  assert.ok(
    ternaryNodes
      .filter(({ id }) => id.includes(':analytic-ternary-series:'))
      .every(({ points }) => points.length <= 8_000),
  );

  const smithNodes = flattenScene(
    compile({
      data: Array.from({ length: 9_000 }, (_, index) => ({
        id: `smith-${index}`,
        real: 25 + (index % 75),
        imaginary: (index % 21) - 10,
      })),
      mark: {
        type: 'smith',
        fields: { real: 'real', imaginary: 'imaginary', id: 'id' },
        options: { mode: 'z', referenceImpedance: 50 },
      },
      x: { field: 'real', type: 'quantitative' },
      y: { field: 'imaginary', type: 'quantitative' },
      performance: 'ultra',
    }).scene.root,
  );
  assert.equal(smithNodes.filter(({ id }) => id.includes(':analytic-smith-point:')).length, 8_000);
  assert.ok(
    smithNodes
      .filter(({ id }) => id.includes(':analytic-smith-series:'))
      .every(({ points }) => points.length <= 8_000),
  );

  const carpetNodes = flattenScene(
    compile({
      data: Array.from({ length: 9_000 }, (_, index) => ({
        id: `carpet-${index}`,
        a: (index % 100) / 100,
        b: ((index * 17) % 100) / 100,
      })),
      mark: {
        type: 'carpet',
        fields: { a: 'a', b: 'b', id: 'id' },
        options: {
          grid: {
            a: [0, 1],
            b: [0, 1],
            x: [
              [0, 1],
              [0.2, 1.2],
            ],
            y: [
              [0, 0],
              [1, 1],
            ],
          },
        },
      },
      x: { field: 'a', type: 'quantitative' },
      y: { field: 'b', type: 'quantitative' },
      performance: 'ultra',
    }).scene.root,
  );
  assert.equal(
    carpetNodes.filter(({ id }) => id.includes(':analytic-carpet-point:')).length,
    8_000,
  );
});
