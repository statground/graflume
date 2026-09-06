import { stat } from 'node:fs/promises';

const budgets = [
  // 2026-09-06 measured after complete weighted word clouds and collision-safe force networks:
  // 1,238,374 / 1,436,640 / 397,648 raw minified bytes.
  // Each ceiling is the next whole KiB, leaving less than one KiB of headroom.
  // See docs/development/bundle-boundaries.md for the import-graph audit.
  ['graflume.min.js', 1_210 * 1024],
  ['graflume.complete.min.js', 1_403 * 1024],
  ['graflume.spatial.min.js', 389 * 1024],
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
