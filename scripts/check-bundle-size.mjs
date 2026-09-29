import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const budgets = [
  // 2026-09-09 measured after renderer-neutral Table ranges and atomic TSV paste:
  // 1,256,919 / 1,455,319 / 397,648 raw minified bytes.
  // Each ceiling is the next whole KiB, leaving less than one KiB of headroom.
  // See docs/development/bundle-boundaries.md for the import-graph audit.
  ['graflume.min.js', 1_228 * 1024],
  ['graflume.complete.min.js', 1_422 * 1024],
  ['graflume.spatial.min.js', 389 * 1024],
  // 2026-09-11 measured optional, lazy-only spreadsheet assets after host-defined
  // top-level panels and direct column renaming. These ceilings are independent
  // of the core entrypoints and leave less than one KiB.
  ['graflume.spreadsheet.min.js', 29 * 1024],
  ['graflume.spreadsheet.runtime.min.js', 11_285 * 1024],
  ['graflume.spreadsheet.min.css', 99 * 1024],
];

for (const [name, budgetBytes] of budgets) {
  const file = new URL(`../dist/${name}`, import.meta.url);
  const { size } = await stat(file);
  if (size > budgetBytes) {
    throw new Error(
      `${name} is ${(size / 1024).toFixed(1)} KiB; budget is ${budgetBytes / 1024} KiB.`,
    );
  }
  console.log(
    `${name}: ${size.toLocaleString('en-US')} bytes (${(size / 1024).toFixed(1)} KiB) / ${budgetBytes / 1024} KiB budget; ${budgetBytes - size} bytes headroom`,
  );
}

const optionalGzipBudgets = [
  ['graflume.spreadsheet.min.js', 9 * 1024],
  ['graflume.spreadsheet.runtime.min.js', 2_779 * 1024],
  ['graflume.spreadsheet.min.css', 15 * 1024],
];

for (const [name, budgetBytes] of optionalGzipBudgets) {
  const bytes = gzipSync(await readFile(new URL(`../dist/${name}`, import.meta.url)), { level: 9 });
  if (bytes.byteLength > budgetBytes) {
    throw new Error(
      `${name} gzip is ${(bytes.byteLength / 1024).toFixed(1)} KiB; budget is ${budgetBytes / 1024} KiB.`,
    );
  }
  console.log(
    `${name} gzip: ${bytes.byteLength.toLocaleString('en-US')} bytes / ${budgetBytes / 1024} KiB budget`,
  );
}
