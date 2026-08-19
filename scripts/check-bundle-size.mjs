import { stat } from 'node:fs/promises';

const budgetBytes = 80 * 1024;
const file = new URL('../dist/graflume.min.js', import.meta.url);
const { size } = await stat(file);
if (size > budgetBytes) {
  throw new Error(
    `CDN bundle is ${(size / 1024).toFixed(1)} KiB; budget is ${budgetBytes / 1024} KiB.`,
  );
}
console.log(`CDN bundle: ${(size / 1024).toFixed(1)} KiB / ${budgetBytes / 1024} KiB budget`);
