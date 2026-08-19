import { rm } from 'node:fs/promises';

await rm(new URL('../.tmp', import.meta.url), { recursive: true, force: true });
