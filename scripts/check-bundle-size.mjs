import { stat } from 'node:fs/promises';

const budgets = [
  // 2026-09-05 compact capped groups and font-aware legend spacing.
  // Raw minified bytes: default 1,228,766; complete 1,426,760; spatial 397,648;
  // focused Cartesian 720,269. Each ceiling is the next whole KiB.
  // See docs/development/bundle-boundaries.md for the import-graph audit.
  ['graflume.min.js', 1_200 * 1024],
  ['graflume.complete.min.js', 1_394 * 1024],
  ['graflume.spatial.min.js', 389 * 1024],
  ['graflume.cartesian.min.js', 704 * 1024],
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
