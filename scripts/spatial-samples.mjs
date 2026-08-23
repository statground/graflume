function gridSurface(rows = 17, columns = 17) {
  const x = Array.from({ length: columns }, (_, index) => -2.4 + (index / (columns - 1)) * 4.8);
  const y = Array.from({ length: rows }, (_, index) => -2.4 + (index / (rows - 1)) * 4.8);
  const z = y.flatMap((depth) =>
    x.map((horizontal) => Math.sin(horizontal * 1.5) * Math.cos(depth * 1.25) * 0.72),
  );
  return { rows, columns, x, y, z };
}

function scalarVolume(size = 10) {
  const values = [];
  for (let z = 0; z < size; z += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = (x / (size - 1)) * 2 - 1;
        const dy = (y / (size - 1)) * 2 - 1;
        const dz = (z / (size - 1)) * 2 - 1;
        values.push(1 - Math.hypot(dx, dy, dz));
      }
    }
  }
  return {
    dimensions: [size, size, size],
    origin: [-1, -1, -1],
    spacing: [2 / (size - 1), 2 / (size - 1), 2 / (size - 1)],
    values,
  };
}

function streamPaths() {
  return [-0.7, 0, 0.7].map((offset) =>
    Array.from({ length: 24 }, (_, index) => {
      const amount = index / 23;
      const angle = amount * Math.PI * 2.6 + offset;
      return [(amount - 0.5) * 4, Math.sin(angle) * 0.65 + offset, Math.cos(angle) * 0.65];
    }),
  );
}

function scatterPoints() {
  return Array.from({ length: 72 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radius = 0.35 + (index % 12) * 0.12;
    return [Math.cos(angle) * radius, ((index % 9) - 4) * 0.22, Math.sin(angle) * radius];
  });
}

const volumeData = scalarVolume();
const scatterPositions = scatterPoints();

export const spatialSampleSpecs = Object.freeze({
  surface: {
    specVersion: '0.1',
    title: 'Surface',
    background: '#f8fafc',
    interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    layers: [
      {
        id: 'surface',
        mark: { type: 'surface', mode: 'surface', color: '#6d28d9' },
        data: gridSurface(),
      },
    ],
  },
  mesh: {
    specVersion: '0.1',
    title: 'Mesh',
    background: '#f8fafc',
    interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    layers: [
      {
        id: 'mesh',
        mark: { type: 'surface', mode: 'mesh' },
        data: {
          positions: [
            [-1.4, -0.8, -1.2],
            [1.4, -0.8, -1.2],
            [1.4, -0.8, 1.2],
            [-1.4, -0.8, 1.2],
            [0, 1.5, 0],
          ],
          triangles: [
            [0, 1, 4],
            [1, 2, 4],
            [2, 3, 4],
            [3, 0, 4],
            [0, 3, 2],
            [0, 2, 1],
          ],
          colors: ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0f766e'],
          labels: ['west', 'south', 'east', 'north', 'peak'],
        },
      },
    ],
  },
  volume: {
    specVersion: '0.1',
    title: 'Volume',
    background: '#07111f',
    interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    lighting: { ambient: 0.58, diffuse: 0.6 },
    layers: [
      {
        id: 'volume',
        mark: {
          type: 'volume',
          mode: 'volume',
          maxSamples: 1_000,
          pointSize: 5,
          opacity: 0.42,
          colorLow: '#38bdf8',
          colorHigh: '#fb7185',
        },
        data: volumeData,
      },
    ],
  },
  isosurface: {
    specVersion: '0.1',
    title: 'Isosurface',
    background: '#f8fafc',
    interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    layers: [
      {
        id: 'isosurface',
        mark: { type: 'volume', mode: 'isosurface', isoValue: 0.22, colorHigh: '#7c3aed' },
        data: volumeData,
      },
    ],
  },
  'vector-cone': {
    specVersion: '0.1',
    title: 'Vector cone',
    background: '#f8fafc',
    interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    layers: [
      {
        id: 'vectors',
        mark: { type: 'vector', mode: 'cone', scale: 0.58, radius: 0.14, color: '#0f766e' },
        data: {
          origins: [-1, 0, 1].flatMap((z) => [-1, 0, 1].map((x) => [x, -0.5, z])),
          vectors: [-1, 0, 1].flatMap((z) => [-1, 0, 1].map((x) => [-z * 0.8, 1.2, x * 0.8])),
          labels: Array.from({ length: 9 }, (_, index) => `vector ${index + 1}`),
        },
      },
    ],
  },
  streamtube: {
    specVersion: '0.1',
    title: 'Streamtube',
    background: '#f8fafc',
    interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    layers: [
      {
        id: 'streams',
        mark: { type: 'vector', mode: 'streamtube', radius: 0.055, segments: 8 },
        data: {
          paths: streamPaths(),
          labels: ['lower flow', 'middle flow', 'upper flow'],
          colors: ['#2563eb', '#7c3aed', '#db2777'],
        },
      },
    ],
  },
  'spatial-scatter': {
    specVersion: '0.1',
    title: 'Spatial scatter',
    background: '#f8fafc',
    interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    layers: [
      {
        id: 'observations',
        mark: { type: 'scatter', pointSize: 7 },
        data: {
          positions: scatterPositions,
          values: scatterPositions.map(([, y]) => y),
          sizes: scatterPositions.map((_, index) => 4 + (index % 5)),
          labels: scatterPositions.map((_, index) => `observation ${index + 1}`),
        },
      },
    ],
  },
  globe: {
    specVersion: '0.1',
    title: 'Globe',
    background: '#07111f',
    camera: { yaw: 0.35, pitch: 0.28 },
    interaction: { tooltip: true, controls: true, wheel: 'modifier' },
    lighting: { ambient: 0.52, diffuse: 0.76, direction: [0.4, 0.8, 0.6] },
    layers: [
      {
        id: 'world',
        mark: {
          type: 'globe',
          oceanColor: '#0f2f57',
          landColor: '#84a98c',
          borderColor: '#d7e3d5',
          pointColor: '#fb7185',
          routeColor: '#fbbf24',
        },
        data: {
          points: [
            { longitude: 126.978, latitude: 37.5665, label: 'Seoul', value: 96 },
            { longitude: -74.006, latitude: 40.7128, label: 'New York', value: 88 },
            { longitude: 151.2093, latitude: -33.8688, label: 'Sydney', value: 74 },
          ],
          routes: [
            { from: [126.978, 37.5665], to: [-74.006, 40.7128], label: 'Seoul–New York' },
            { from: [126.978, 37.5665], to: [151.2093, -33.8688], label: 'Seoul–Sydney' },
          ],
        },
      },
    ],
  },
});
