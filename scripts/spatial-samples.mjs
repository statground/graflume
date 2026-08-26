const coolToWarm = ['#075985', '#0284c7', '#06b6d4', '#34d399', '#facc15', '#f97316', '#be123c'];

const violetFlow = [
  '#1d4ed8',
  '#2563eb',
  '#0891b2',
  '#0f766e',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
  '#db2777',
  '#7c3aed',
];

const compassDirections = [
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
  'south',
  'south-east',
];

function compassDirection(x, z) {
  if (Math.hypot(x, z) < 1e-9) return 'central';
  const amount = ((Math.atan2(z, x) / (Math.PI * 2)) * compassDirections.length + 8) % 8;
  return compassDirections[Math.round(amount) % compassDirections.length];
}

function paletteColor(palette, amount) {
  const index = Math.max(
    0,
    Math.min(palette.length - 1, Math.round(amount * (palette.length - 1))),
  );
  return palette[index];
}

function multiPeakSurface(rows = 35, columns = 35) {
  const x = Array.from({ length: columns }, (_, index) => -3 + (index / (columns - 1)) * 6);
  const y = Array.from({ length: rows }, (_, index) => -3 + (index / (rows - 1)) * 6);
  const z = [];
  const values = [];
  for (const depth of y) {
    for (const horizontal of x) {
      const westernPeak =
        1.8 * Math.exp(-((horizontal + 1.15) ** 2 * 1.05 + (depth + 0.6) ** 2 * 0.8));
      const easternPeak =
        1.35 * Math.exp(-((horizontal - 1.25) ** 2 * 0.72 + (depth - 0.85) ** 2 * 1.15));
      const basin = -0.72 * Math.exp(-((horizontal - 0.1) ** 2 + (depth + 0.15) ** 2) * 2.6);
      const ridge = 0.26 * Math.sin(horizontal * 2.15) * Math.cos(depth * 1.75);
      const height = westernPeak + easternPeak + basin + ridge;
      z.push(height);
      values.push(height + Math.hypot(horizontal, depth) * 0.06);
    }
  }
  return { rows, columns, x, y, z, values };
}

function shellMesh(rows = 25, columns = 36) {
  const positions = [];
  const triangles = [];
  const colors = [];
  const labels = [];
  const verticalBands = ['lower rim', 'lower shell', 'equatorial shell', 'upper shell', 'crown'];
  for (let row = 0; row < rows; row += 1) {
    const vertical = row / (rows - 1);
    const height = -1.8 + vertical * 3.6;
    for (let column = 0; column < columns; column += 1) {
      const angle = (column / columns) * Math.PI * 2;
      const taper = 0.72 + Math.sin(vertical * Math.PI) * 0.78;
      const ripple = 1 + Math.cos(angle * 5 + vertical * Math.PI * 2) * 0.13;
      const radius = taper * ripple;
      positions.push([
        Math.cos(angle) * radius,
        height + Math.sin(angle * 3) * 0.12 * Math.sin(vertical * Math.PI),
        Math.sin(angle) * radius,
      ]);
      colors.push(paletteColor(coolToWarm, vertical * 0.82 + (Math.sin(angle * 2) + 1) * 0.045));
      const band = verticalBands[Math.min(verticalBands.length - 1, Math.floor(vertical * 5))];
      labels.push(`${band} · ${compassDirection(Math.cos(angle), Math.sin(angle))} facet`);
    }
  }
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const nextColumn = (column + 1) % columns;
      const a = row * columns + column;
      const b = row * columns + nextColumn;
      const c = (row + 1) * columns + column;
      const d = (row + 1) * columns + nextColumn;
      triangles.push([a, c, b], [b, c, d]);
    }
  }
  return { positions, triangles, colors, labels };
}

function multiLobeVolume(size = 19) {
  const values = [];
  for (let z = 0; z < size; z += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const px = (x / (size - 1)) * 3 - 1.5;
        const py = (y / (size - 1)) * 3 - 1.5;
        const pz = (z / (size - 1)) * 3 - 1.5;
        const first = Math.exp(
          -(((px + 0.58) / 0.62) ** 2 + ((py - 0.12) / 0.82) ** 2 + ((pz + 0.18) / 0.58) ** 2),
        );
        const second =
          0.92 *
          Math.exp(
            -(((px - 0.63) / 0.72) ** 2 + ((py + 0.25) / 0.52) ** 2 + ((pz - 0.35) / 0.76) ** 2),
          );
        const ringRadius = Math.hypot(px, pz);
        const ring = 0.62 * Math.exp(-(((ringRadius - 0.92) / 0.22) ** 2 + (py / 0.28) ** 2));
        const saddle = 0.08 * Math.cos(px * 3.2) * Math.sin(pz * 3.1) * Math.exp(-py * py);
        values.push(first + second + ring + saddle);
      }
    }
  }
  return {
    dimensions: [size, size, size],
    origin: [-1.5, -1.5, -1.5],
    spacing: [3 / (size - 1), 3 / (size - 1), 3 / (size - 1)],
    values,
  };
}

function cycloneVectors(side = 11) {
  const origins = [];
  const vectors = [];
  const colors = [];
  const labels = [];
  for (let depthIndex = 0; depthIndex < side; depthIndex += 1) {
    for (let horizontalIndex = 0; horizontalIndex < side; horizontalIndex += 1) {
      const x = -2.5 + (horizontalIndex / (side - 1)) * 5;
      const z = -2.5 + (depthIndex / (side - 1)) * 5;
      const radius = Math.hypot(x, z);
      const swirl = 0.34 + 1.28 * Math.exp(-radius * 0.48);
      const divisor = Math.max(0.36, radius);
      origins.push([x, -0.82 + 0.06 * Math.sin(x + z), z]);
      vectors.push([
        (-z / divisor) * swirl,
        0.28 + 0.92 * Math.exp(-radius * radius * 0.34),
        (x / divisor) * swirl,
      ]);
      colors.push(paletteColor(coolToWarm, 1 - Math.min(1, radius / 3.6)));
      const band =
        radius < 0.65
          ? 'eye'
          : radius < 1.45
            ? 'inner eyewall'
            : radius < 2.4
              ? 'outer rainband'
              : 'peripheral flow';
      labels.push(`${band} · ${compassDirection(x, z)} updraft`);
    }
  }
  return { origins, vectors, colors, labels };
}

function helicalStreamPaths(pathCount = 9, pointCount = 58) {
  const paths = [];
  for (let pathIndex = 0; pathIndex < pathCount; pathIndex += 1) {
    const phase = (pathIndex / pathCount) * Math.PI * 2;
    paths.push(
      Array.from({ length: pointCount }, (_, pointIndex) => {
        const amount = pointIndex / (pointCount - 1);
        const angle = phase + amount * Math.PI * 4.4;
        const radius = 0.42 + amount * 1.08 + Math.sin(amount * Math.PI * 3 + phase) * 0.055;
        return [
          Math.cos(angle) * radius,
          -1.8 + amount * 3.6 + Math.sin(phase * 2) * 0.1,
          Math.sin(angle) * radius,
        ];
      }),
    );
  }
  return paths;
}

function deterministicNoise(index, salt) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function galaxyScatter(arms = 3, pointsPerArm = 160, centerPoints = 96) {
  const positions = [];
  const values = [];
  const sizes = [];
  const colors = [];
  const labels = [];
  const armNames = ['Aurora cohort', 'Beacon cohort', 'Cinder cohort'];
  for (let arm = 0; arm < arms; arm += 1) {
    for (let index = 0; index < pointsPerArm; index += 1) {
      const amount = index / (pointsPerArm - 1);
      const radius = 0.22 + amount * 2.85;
      const jitter =
        (deterministicNoise(index + arm * pointsPerArm, 1) - 0.5) * (0.1 + amount * 0.22);
      const angle = (arm / arms) * Math.PI * 2 + radius * 2.05 + jitter;
      const verticalNoise = deterministicNoise(index + arm * pointsPerArm, 2) - 0.5;
      positions.push([
        Math.cos(angle) * (radius + jitter),
        verticalNoise * (0.42 - amount * 0.25),
        Math.sin(angle) * (radius + jitter),
      ]);
      values.push(amount);
      sizes.push(3 + (1 - amount) * 4 + deterministicNoise(index, arm + 4) * 2);
      colors.push(paletteColor(violetFlow, amount * 0.8 + arm * 0.06));
      const band =
        amount < 0.34 ? 'inner population' : amount < 0.68 ? 'mid population' : 'outer population';
      labels.push(`${armNames[arm % armNames.length]} · ${band}`);
    }
  }
  for (let index = 0; index < centerPoints; index += 1) {
    const longitude = deterministicNoise(index, 6) * Math.PI * 2;
    const latitude = (deterministicNoise(index, 7) - 0.5) * Math.PI;
    const radius = Math.cbrt(deterministicNoise(index, 8)) * 0.52;
    positions.push([
      Math.cos(longitude) * Math.cos(latitude) * radius,
      Math.sin(latitude) * radius * 0.58,
      Math.sin(longitude) * Math.cos(latitude) * radius,
    ]);
    values.push(1);
    sizes.push(5 + deterministicNoise(index, 9) * 5);
    colors.push(index % 3 === 0 ? '#fef3c7' : '#fbbf24');
    const coreBand = radius < 0.2 ? 'dense nucleus' : radius < 0.38 ? 'inner core' : 'outer core';
    labels.push(`Core cohort · ${coreBand}`);
  }
  return { positions, values, sizes, colors, labels };
}

const camera = (yaw, pitch, distance, fov = 42) => ({ yaw, pitch, distance, fov });
const lighting = (direction = [-0.45, 0.9, 0.55]) => ({
  ambient: 0.36,
  diffuse: 0.92,
  direction,
});
const interaction = { tooltip: true, controls: true, wheel: 'modifier' };
const volumeData = multiLobeVolume();
const cyclone = cycloneVectors();
const streams = helicalStreamPaths();
const galaxy = galaxyScatter();
const helicalFlowNames = [
  'Aurora spiral',
  'Beacon spiral',
  'Cobalt spiral',
  'Delta spiral',
  'Ember spiral',
  'Fjord spiral',
  'Harbor spiral',
  'Indigo spiral',
  'Juniper spiral',
];

export const spatialSampleSpecs = Object.freeze({
  surface: {
    specVersion: '0.1',
    title: 'Terrain risk landscape',
    background: '#f8fafc',
    camera: camera(0.3, 0.5, 9.6),
    lighting: lighting(),
    interaction,
    layers: [
      {
        id: 'surface',
        mark: { type: 'surface', mode: 'surface', color: '#be123c', opacity: 1 },
        data: multiPeakSurface(),
      },
    ],
  },
  mesh: {
    specVersion: '0.1',
    title: 'Faceted material shell',
    background: '#07111f',
    camera: camera(0.72, 0.4, 7.8, 40),
    lighting: lighting([-0.65, 0.72, 0.48]),
    interaction,
    layers: [
      {
        id: 'mesh',
        mark: { type: 'surface', mode: 'mesh', opacity: 1 },
        data: shellMesh(),
      },
    ],
  },
  volume: {
    specVersion: '0.1',
    title: 'Dual-lobe density volume',
    background: '#050b18',
    camera: camera(0.68, 0.4, 9, 40),
    interaction,
    lighting: { ambient: 0.52, diffuse: 0.76, direction: [-0.38, 0.82, 0.62] },
    layers: [
      {
        id: 'volume',
        mark: {
          type: 'volume',
          mode: 'volume',
          maxSamples: 5_200,
          pointSize: 4.6,
          opacity: 1,
          colorLow: 'rgba(14, 165, 233, 0.01)',
          colorHigh: 'rgba(251, 113, 133, 0.82)',
        },
        data: volumeData,
      },
    ],
  },
  isosurface: {
    specVersion: '0.1',
    title: 'Density threshold isosurface',
    background: '#f8fafc',
    camera: camera(0, 0.45, 3.6, 40),
    lighting: lighting([-0.55, 0.88, 0.42]),
    interaction,
    layers: [
      {
        id: 'isosurface',
        mark: {
          type: 'volume',
          mode: 'isosurface',
          isoValue: 0.43,
          colorHigh: '#7c3aed',
          opacity: 1,
        },
        data: volumeData,
      },
    ],
  },
  'vector-cone': {
    specVersion: '0.1',
    title: 'Cyclone updraft vectors',
    background: '#f8fafc',
    camera: camera(0.72, 0.5, 8.6, 44),
    lighting: lighting(),
    interaction,
    layers: [
      {
        id: 'vectors',
        mark: { type: 'vector', mode: 'cone', scale: 0.52, radius: 0.085, segments: 10 },
        data: cyclone,
      },
    ],
  },
  streamtube: {
    specVersion: '0.1',
    title: 'Rising helical flow paths',
    background: '#07111f',
    camera: camera(0.68, 0.4, 7.3, 40),
    lighting: lighting([-0.35, 0.9, 0.5]),
    interaction,
    layers: [
      {
        id: 'streams',
        mark: { type: 'vector', mode: 'streamtube', radius: 0.045, segments: 8 },
        data: {
          paths: streams,
          labels: streams.map((_, index) => helicalFlowNames[index % helicalFlowNames.length]),
          colors: violetFlow,
        },
      },
    ],
  },
  'spatial-scatter': {
    specVersion: '0.1',
    title: 'Three-segment spatial population',
    background: '#050b18',
    camera: camera(-0.58, 0.5, 7.5, 42),
    lighting: { ambient: 0.58, diffuse: 0.72, direction: [-0.4, 0.78, 0.66] },
    interaction,
    layers: [
      {
        id: 'observations',
        mark: { type: 'scatter', pointSize: 6 },
        data: galaxy,
      },
    ],
  },
  globe: {
    specVersion: '0.1',
    title: 'Global team activity routes',
    background: '#050b18',
    camera: camera(0.35, 0.38, 4.8, 40),
    interaction,
    lighting: { ambient: 0.48, diffuse: 0.86, direction: [-0.45, 0.82, 0.62] },
    layers: [
      {
        id: 'world',
        mark: {
          type: 'globe',
          oceanColor: '#0b2a4a',
          landColor: '#79a78d',
          borderColor: '#d7e3d5',
          pointColor: '#fb7185',
          routeColor: '#fbbf24',
        },
        data: {
          points: [
            { longitude: 126.978, latitude: 37.5665, label: 'Seoul', value: 96, size: 10 },
            { longitude: -74.006, latitude: 40.7128, label: 'New York', value: 88, size: 9 },
            { longitude: 151.2093, latitude: -33.8688, label: 'Sydney', value: 74, size: 8 },
            { longitude: 2.3522, latitude: 48.8566, label: 'Paris', value: 82, size: 8 },
            { longitude: 18.4241, latitude: -33.9249, label: 'Cape Town', value: 69, size: 7 },
            { longitude: -46.6333, latitude: -23.5505, label: 'São Paulo', value: 77, size: 8 },
          ],
          routes: [
            { from: [126.978, 37.5665], to: [-74.006, 40.7128], label: 'Seoul–New York' },
            { from: [126.978, 37.5665], to: [151.2093, -33.8688], label: 'Seoul–Sydney' },
            { from: [-74.006, 40.7128], to: [2.3522, 48.8566], label: 'New York–Paris' },
            { from: [2.3522, 48.8566], to: [18.4241, -33.9249], label: 'Paris–Cape Town' },
            {
              from: [-46.6333, -23.5505],
              to: [18.4241, -33.9249],
              label: 'São Paulo–Cape Town',
            },
          ],
        },
      },
    ],
  },
});
