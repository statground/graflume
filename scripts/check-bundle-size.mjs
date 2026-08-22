import { stat } from 'node:fs/promises';

const budgets = [
  ['graflume.min.js', 92 * 1024],
  ['graflume.complete.min.js', 176 * 1024],
];

for (const [name, budgetBytes] of budgets) {
  const file = new URL(`../dist/${name}`, import.meta.url);
  const { size } = await stat(file);
  if (size > budgetBytes) {
    throw new Error(
      `${name} is ${(size / 1024).toFixed(1)} KiB; budget is ${budgetBytes / 1024} KiB.`,
    );
  }
  console.log(`${name}: ${(size / 1024).toFixed(1)} KiB / ${budgetBytes / 1024} KiB budget`);
}
