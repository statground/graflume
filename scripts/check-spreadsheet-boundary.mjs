import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

import {
  hasSpreadsheetExternalIdentityToken,
  hasSpreadsheetProductToken,
} from './lib/spreadsheet-neutralize.mjs';

const allowed = new Set(['package.json', 'package-lock.json', 'THIRD_PARTY_NOTICES.md']);
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((file) => !allowed.has(file) && !file.startsWith('node_modules/'));
const distributable = execFileSync('find', ['dist', '-maxdepth', '1', '-type', 'f'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((file) => /spreadsheet.*\.(?:js|css)$/.test(file));

const hits = [];
for (const file of [...tracked, ...distributable]) {
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  if (hasSpreadsheetProductToken(source) || hasSpreadsheetExternalIdentityToken(source)) {
    hits.push(file);
  }
}
if (hits.length > 0) {
  throw new Error(`Spreadsheet neutral boundary failed: ${hits.join(', ')}`);
}
console.log(
  `Verified spreadsheet neutral boundary in ${tracked.length + distributable.length} files.`,
);
