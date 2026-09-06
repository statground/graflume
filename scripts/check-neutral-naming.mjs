import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

import { hasRestrictedPublicName } from './lib/neutral-names.mjs';

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
  // The generated feature matrix deliberately ends with the audited external
  // ecosystem and URL provenance from the research intake. Those names are
  // evidence, not public identifiers; keep checking the runtime/current-state
  // portion above this explicit boundary.
  const checkedSource =
    file === 'docs/development/verified-feature-matrix.md'
      ? source.split('\n## Ecosystem inputs\n', 1)[0]
      : source;
  if (hasRestrictedPublicName(checkedSource)) {
    hits.push(file);
  }
}

if (hits.length > 0) {
  throw new Error(`Neutral naming check failed: ${hits.join(', ')}`);
}
console.log(`Verified neutral naming in ${files.length} source-controlled files.`);
