import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';

const inputUrl = new URL('../dist/graflume.global.js', import.meta.url);
const outputUrl = new URL('../dist/graflume.min.js', import.meta.url);
const mapUrl = new URL('../dist/graflume.min.js.map', import.meta.url);
const code = await readFile(inputUrl, 'utf8');
const result = await minify(code, {
  compress: { passes: 2 },
  mangle: true,
  sourceMap: {
    filename: 'graflume.min.js',
    url: 'graflume.min.js.map',
  },
  format: {
    comments: /^!/,
  },
});

if (result.code === undefined) throw new Error('Terser did not produce code.');
await writeFile(outputUrl, result.code, 'utf8');
if (result.map !== undefined) await writeFile(mapUrl, result.map, 'utf8');
