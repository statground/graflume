import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const exactPhrase = String.fromCharCode(101, 67, 104, 97, 114, 116);
const productName = String.fromCharCode(69, 67, 104, 97, 114, 116, 115);
const roots = new Set([
  '.github',
  'src',
  'tests',
  'scripts',
  'docs',
  'examples',
  'schema',
  'README.md',
  'CHANGELOG.md',
  'package.json',
  'rollup.config.mjs',
]);
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((file) => {
    const first = file.split('/')[0];
    return roots.has(first) && !file.startsWith('cdn/');
  });

const hits = [];
for (const file of files) {
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  if (source.includes(exactPhrase) || source.toLowerCase().includes(productName.toLowerCase())) {
    hits.push(file);
  }
}

if (hits.length > 0) {
  throw new Error(`Neutral naming check failed: ${hits.join(', ')}`);
}
console.log(`Verified neutral naming in ${files.length} source-controlled files.`);
