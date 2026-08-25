import assert from 'node:assert/strict';
import test from 'node:test';

import {
  brushHeatmap,
  buildHeatmapMatrix,
  layoutItems,
  mapRasterColor,
  projectCarpet,
  projectSmith,
  projectTernary,
  sampleRaster,
  scatterMatrixPlan,
} from '../.tmp/src/data/specialized-coordinate-analytics.js';

const close = (actual, expected, tolerance = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);

test('heatmap pivots long form, retains irregular extents, patterns missing values and maps five color modes', () => {
  const data = [
    { row: 'A', column: 1, value: -10, x0: 0, x1: 2, y0: 0, y1: 1 },
    { row: 'A', column: 2, value: null, x0: 2, x1: 5, y0: 0, y1: 1 },
    { row: 'B', column: 1, value: 1, x0: 0, x1: 2, y0: 1, y1: 3 },
    { row: 'B', column: 2, value: 10, x0: 2, x1: 5, y0: 1, y1: 3 },
  ];
  for (const color of ['sequential', 'diverging', 'symlog', 'quantile']) {
    const matrix = buildHeatmapMatrix(data, { color, midpoint: 0, missing: { pattern: 'dots' } });
    assert.deepEqual(matrix.rows, ['A', 'B']);
    assert.deepEqual(matrix.columns, [1, 2]);
    assert.deepEqual(matrix.values, [
      [-10, null],
      [1, 10],
    ]);
    assert.equal(matrix.cells[1].missingPattern, 'dots');
    assert.deepEqual(
      [matrix.cells[0].x0, matrix.cells[0].x1, matrix.cells[2].y0, matrix.cells[2].y1],
      [0, 2, 1, 3],
    );
    assert.ok(
      matrix.cells
        .filter(({ value }) => value !== null)
        .every(({ colorPosition }) => colorPosition >= 0 && colorPosition <= 1),
    );
  }
  const log = buildHeatmapMatrix(
    [
      { row: 'A', column: 'x', value: 1 },
      { row: 'A', column: 'y', value: 100 },
    ],
    { color: 'log' },
  );
  close(log.cells[0].colorPosition, 0);
  close(log.cells[1].colorPosition, 1);
  assert.deepEqual(
    brushHeatmap(buildHeatmapMatrix(data), { rows: ['B'], value: [0, 5] }).map(
      ({ column }) => column,
    ),
    [1],
  );
});

test('heatmap accepts direct matrices and infers absent irregular cells from row and column extents', () => {
  const direct = buildHeatmapMatrix(
    {
      rows: ['A', 'B'],
      columns: ['x', 'y', 'z'],
      values: [
        [1, null, 3],
        [4, 5, 6],
      ],
      xExtents: [
        [0, 2],
        [2, 5],
        [5, 9],
      ],
      yExtents: [
        [0, 1],
        [1, 4],
      ],
    },
    { rowOrder: ['B', 'A'], columnOrder: ['z', 'x', 'y'], missing: { pattern: 'cross' } },
  );
  assert.deepEqual(direct.rows, ['B', 'A']);
  assert.deepEqual(direct.columns, ['z', 'x', 'y']);
  assert.deepEqual(direct.values, [
    [6, 4, 5],
    [3, 1, null],
  ]);
  assert.deepEqual(
    direct.cells.find(({ row, column }) => row === 'A' && column === 'y'),
    {
      row: 'A',
      column: 'y',
      rowIndex: 1,
      columnIndex: 2,
      value: null,
      x0: 2,
      x1: 5,
      y0: 0,
      y1: 1,
      colorPosition: null,
      missingPattern: 'cross',
    },
  );

  const pivoted = buildHeatmapMatrix(
    [
      { row: 'A', column: 'x', value: 1, x0: 0, x1: 2, y0: 0, y1: 1 },
      { row: 'B', column: 'x', value: 2, x0: 0, x1: 2, y0: 1, y1: 3 },
      { row: 'B', column: 'y', value: 3, x0: 2, x1: 5, y0: 1, y1: 3 },
    ],
    { missing: { pattern: 'dots' } },
  );
  const absent = pivoted.cells.find(({ row, column }) => row === 'A' && column === 'y');
  assert.deepEqual(
    [absent.value, absent.x0, absent.x1, absent.y0, absent.y1, absent.missingPattern],
    [null, 2, 5, 0, 1, 'dots'],
  );
  assert.throws(
    () =>
      buildHeatmapMatrix([
        { row: 'A', column: 'x', value: 1, x0: 0, x1: 2 },
        { row: 'B', column: 'x', value: 2, x0: 0, x1: 3 },
      ]),
    /extent must be consistent/u,
  );
});

test('raster image supports extent/origin and nearest, bilinear, bicubic sampling', () => {
  const image = {
    width: 2,
    height: 2,
    channels: 1,
    values: [0, 10, 20, 30],
    extent: [10, 20, 100, 200],
    origin: 'lower',
  };
  assert.deepEqual(sampleRaster(image, 10, 100, 'nearest'), [0]);
  assert.deepEqual(sampleRaster(image, 20, 200, 'nearest'), [30]);
  close(sampleRaster(image, 15, 150, 'bilinear')[0], 15);
  close(sampleRaster(image, 15, 150, 'bicubic')[0], 15);

  const upper = { ...image, origin: 'upper' };
  assert.deepEqual(sampleRaster(upper, 10, 100, 'nearest'), [20]);

  const centers = [
    [12.5, 125],
    [17.5, 125],
    [12.5, 175],
    [17.5, 175],
  ];
  for (const method of ['nearest', 'bilinear', 'bicubic']) {
    assert.deepEqual(
      centers.map(([x, y]) => sampleRaster(image, x, y, method)[0]),
      [0, 10, 20, 30],
      `${method} must preserve a same-resolution raster at pixel centers`,
    );
  }
});

test('raster color mapping applies window, colormap, alpha and channel compositing', () => {
  assert.deepEqual(
    mapRasterColor([50], { window: [0, 100], colormap: ['#000000', '#ffffff'], alpha: 0.5 }),
    [127.5, 127.5, 127.5, 0.5],
  );
  assert.deepEqual(mapRasterColor([10, 20, 30, 128], { alpha: 0.5 }), [
    10,
    20,
    30,
    0.5 * (128 / 255),
  ]);
  assert.deepEqual(
    mapRasterColor([50], { window: [0, 100], colormap: ['#ff0000'] }),
    [255, 0, 0, 1],
  );
  assert.throws(() => mapRasterColor([50], { colormap: [] }), /at least one color/u);
  assert.throws(() => mapRasterColor([50], { window: [100, 0] }), /finite and ascending/u);
  assert.throws(() => mapRasterColor([50], { window: [50, 50] }), /finite and ascending/u);
});

test('ternary projection validates constant sums, normalizes explicitly and exposes component ticks and dual tooltip', () => {
  const exact = projectTernary([{ id: 'x', a: 0.2, b: 0.3, c: 0.5 }], { ticks: 4 });
  assert.deepEqual(exact.points[0].normalized, [0.2, 0.3, 0.5]);
  close(exact.points[0].x, 0.55);
  assert.match(exact.points[0].tooltip, /raw .*normalized/);
  assert.equal(exact.axes.a.length, 5);
  assert.throws(() => projectTernary([{ a: 2, b: 3, c: 5 }]), /does not sum/);
  assert.deepEqual(
    projectTernary([{ a: 2, b: 3, c: 5 }], { policy: 'normalize' }).points[0].normalized,
    [0.2, 0.3, 0.5],
  );
});

test('Smith projection supports reflection/S, Z, Y and combined specialist labels at an explicit reference impedance', () => {
  const matched = projectSmith([{ real: 50, imaginary: 0 }], {
    mode: 'z',
    referenceImpedance: 50,
    grid: 'combined',
  });
  close(matched.points[0].x, 0);
  close(matched.points[0].y, 0);
  assert.equal(matched.grid, 'combined');
  assert.match(matched.points[0].tooltip, /Z .*Γ/);

  const reflection = projectSmith([{ real: 0.5, imaginary: 0.25 }], { mode: 's' });
  assert.deepEqual(reflection.points[0].reflection, { real: 0.5, imaginary: 0.25 });
  const admittance = projectSmith([{ real: 0.02, imaginary: 0 }], {
    mode: 'y',
    referenceImpedance: 50,
  });
  close(admittance.points[0].x, 0);
  assert.ok(matched.labels.resistance.length > 0 && matched.labels.reactance.length > 0);

  const openReflection = projectSmith([{ real: 1, imaginary: 0 }], { mode: 's' }).points[0];
  assert.deepEqual(openReflection.reflection, { real: 1, imaginary: 0 });
  assert.equal(openReflection.normalized, null);
  assert.equal(openReflection.openCircuit, true);
  assert.match(openReflection.tooltip, /z ∞/u);
  const openAdmittance = projectSmith([{ real: 0, imaginary: 0 }], { mode: 'y' }).points[0];
  assert.deepEqual(openAdmittance.reflection, { real: 1, imaginary: 0 });
  assert.equal(openAdmittance.normalized, null);
});

test('carpet projection handles irregular logical axes, masks, ticks and dual projected tooltips', () => {
  const grid = {
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
  };
  const result = projectCarpet(grid, [
    { id: 'middle', a: 0.5, b: 1 },
    { id: 'right', a: 2, b: 1 },
  ]);
  close(result.points[0].projected.x, 1);
  close(result.points[0].projected.y, 1.25);
  assert.equal(result.points[0].masked, true);
  assert.match(result.points[0].tooltip, /a=0.5.*x=1/);
  assert.deepEqual(
    result.ticks.a.map(({ value }) => value),
    [0, 1, 3],
  );
  assert.throws(
    () => projectCarpet({ ...grid, mask: [[true], [true, false, true]] }, []),
    /mask dimensions must be b by a booleans/u,
  );
});

test('item layout provides waffle/isotype units, partial amounts, direction, grouping and accessible counts', () => {
  const result = layoutItems(
    [
      { id: 'A', value: 2.5 },
      { id: 'B', value: 1 },
    ],
    { mode: 'isotype', unit: 1, columns: 3, direction: 'row-reverse', partial: 'fraction' },
  );
  assert.equal(result.mode, 'isotype');
  assert.deepEqual(
    result.units.map(({ group, fraction, column }) => [group, fraction, column]),
    [
      ['A', 1, 2],
      ['A', 1, 1],
      ['A', 0.5, 0],
      ['B', 1, 2],
    ],
  );
  assert.equal(result.total, 3.5);
  assert.match(result.units[2].accessibleLabel, /0.5 of 2.5/);

  const column = layoutItems([{ id: 'A', value: 10 }], {
    columns: 3,
    direction: 'column',
  });
  assert.equal(Math.max(...column.units.map(({ column }) => column)), 2);
  assert.deepEqual(
    column.units.slice(0, 5).map(({ row, column }) => [row, column]),
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [0, 1],
    ],
  );
  const reverse = layoutItems([{ id: 'A', value: 10 }], {
    columns: 3,
    direction: 'column-reverse',
  });
  assert.deepEqual(
    reverse.units.slice(0, 5).map(({ row, column }) => [row, column]),
    [
      [3, 0],
      [2, 0],
      [1, 0],
      [0, 0],
      [3, 1],
    ],
  );
});

test('scatter-matrix plan selects diagonal KDE/ECDF and independent upper/lower marks with one linked brush key', () => {
  const plan = scatterMatrixPlan(
    [
      { a: 1, b: 2, c: 3, label: 'x' },
      { a: 2, b: 3, c: 4, label: 'y' },
    ],
    { variables: ['c', 'a', 'b'], diagonal: 'ecdf', upper: 'correlation', lower: 'hexbin' },
  );
  assert.deepEqual(plan.variables, ['c', 'a', 'b']);
  assert.equal(
    plan.cells.filter(({ row, column, kind }) => row === column && kind === 'ecdf').length,
    3,
  );
  assert.equal(plan.cells.find(({ row, column }) => row === 0 && column === 1).kind, 'correlation');
  assert.equal(plan.cells.find(({ row, column }) => row === 1 && column === 0).kind, 'hexbin');
  assert.ok(plan.cells.every(({ linkedSelectionKey }) => linkedSelectionKey === 'scatter-matrix'));
});
