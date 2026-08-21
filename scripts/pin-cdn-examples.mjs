import { readFile, writeFile } from 'node:fs/promises';

const [commit, integrity] = process.argv.slice(2);

if (!/^[0-9a-f]{40}$/.test(commit ?? '')) {
  throw new Error('Expected a full lowercase Git commit SHA.');
}
if (!/^sha384-[A-Za-z0-9+/]+={0,2}$/.test(integrity ?? '')) {
  throw new Error('Expected a valid SHA-384 Subresource Integrity value.');
}

const paths = [
  'examples/cdn/bar-chart.html',
  'examples/cdn/chart-types.html',
  'examples/cdn/complete-chart-types.html',
];
const cdnUrlPattern =
  /https:\/\/cdn\.jsdelivr\.net\/gh\/statground\/graflume@(?:__GRAFLUME_CDN_COMMIT__|[0-9a-f]{40})\/cdn\/graflume\.global\.js/g;
const integrityPattern = /integrity="(?:__GRAFLUME_CDN_SRI__|sha384-[A-Za-z0-9+/]+={0,2})"/g;

for (const path of paths) {
  const before = await readFile(path, 'utf8');
  const after = before
    .replace(
      cdnUrlPattern,
      `https://cdn.jsdelivr.net/gh/statground/graflume@${commit}/cdn/graflume.global.js`,
    )
    .replace(integrityPattern, `integrity="${integrity}"`);

  if (after === before && !before.includes(commit)) {
    throw new Error(`No CDN placeholders or previous pin were found in ${path}.`);
  }
  await writeFile(path, after, 'utf8');
}
