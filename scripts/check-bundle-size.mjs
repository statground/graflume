import { stat } from 'node:fs/promises';

const budgets = [
  // 2026-09-05 native shared tooltips, bar grouping and domain controls.
  // Raw minified bytes: default 1,227,387; complete 1,425,381; spatial 397,648;
  // focused Cartesian 718,890. Each ceiling is the next whole KiB.
  // See docs/development/bundle-boundaries.md for the import-graph audit.
  ['graflume.min.js', 1_199 * 1024],
  ['graflume.complete.min.js', 1_392 * 1024],
  ['graflume.spatial.min.js', 389 * 1024],
  ['graflume.cartesian.min.js', 703 * 1024],
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
