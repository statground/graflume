import { copyFile, mkdir } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
await mkdir(dist, { recursive: true });
await copyFile(
  new URL('../schema/graflume.schema.json', import.meta.url),
  new URL('graflume.schema.json', dist),
);
await copyFile(
  new URL('../schema/graflume.spatial.schema.json', import.meta.url),
  new URL('graflume.spatial.schema.json', dist),
);
await copyFile(
  new URL('../schema/graflume.map-boundary-manifest.schema.json', import.meta.url),
  new URL('graflume.map-boundary-manifest.schema.json', dist),
);
