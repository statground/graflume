import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const roots = ['README.md', 'docs'];

async function markdownFiles(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => null);
  if (entries === null) return path.endsWith('.md') ? [path] : [];
  const nested = await Promise.all(
    entries.map((entry) => markdownFiles(resolve(path, entry.name))),
  );
  return nested.flat();
}

const files = (await Promise.all(roots.map(markdownFiles))).flat();
const failures = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const links = source.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g);
  for (const match of links) {
    const raw = match[1]?.trim();
    if (raw === undefined || /^(?:https?:|mailto:|#)/.test(raw)) continue;
    const path = raw.split('#', 1)[0];
    if (path === undefined || path === '') continue;
    const target = resolve(dirname(file), decodeURIComponent(path));
    try {
      await access(target);
    } catch {
      failures.push(`${file}: ${raw}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`Broken local documentation links:\n${failures.join('\n')}`);
}

console.log(`Verified local links in ${files.length} Markdown files.`);
