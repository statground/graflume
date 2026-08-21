import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';

const bundles = [
  ['graflume.global.js', 'graflume.min.js'],
  ['graflume.complete.global.js', 'graflume.complete.min.js'],
];

for (const [inputName, outputName] of bundles) {
  const inputUrl = new URL(`../dist/${inputName}`, import.meta.url);
  const outputUrl = new URL(`../dist/${outputName}`, import.meta.url);
  const mapUrl = new URL(`../dist/${outputName}.map`, import.meta.url);
  const code = await readFile(inputUrl, 'utf8');
  const result = await minify(code, {
    compress: { passes: 2 },
    mangle: true,
    sourceMap: {
      filename: outputName,
      url: `${outputName}.map`,
    },
    format: {
      comments: /^!/,
    },
  });

  if (result.code === undefined) throw new Error(`Terser did not produce ${outputName}.`);
  await writeFile(outputUrl, result.code, 'utf8');
  if (result.map !== undefined) await writeFile(mapUrl, result.map, 'utf8');
}
