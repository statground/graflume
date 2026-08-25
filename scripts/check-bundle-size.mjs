import { stat } from 'node:fs/promises';

const budgets = [
  // 2026-08-26 measured raw minified bytes after the final 161-item behavior audit:
  // 1,062,342 / 1,258,519 / 343,846. Each ceiling is the next whole KiB, leaving less than
  // one KiB of headroom. See docs/development/bundle-boundaries.md for the import-graph audit.
  ['graflume.min.js', 1_038 * 1024],
  ['graflume.complete.min.js', 1_230 * 1024],
  ['graflume.spatial.min.js', 336 * 1024],
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
