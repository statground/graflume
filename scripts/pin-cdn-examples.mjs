import { readFile, writeFile } from 'node:fs/promises';

const [commit, defaultIntegrity, completeIntegrity] = process.argv.slice(2);

if (!/^[0-9a-f]{40}$/.test(commit ?? '')) {
  throw new Error('Expected a full lowercase Git commit SHA.');
}
for (const [name, integrity] of [
  ['default', defaultIntegrity],
  ['complete', completeIntegrity],
]) {
  if (!/^sha384-[A-Za-z0-9+/]+={0,2}$/.test(integrity ?? '')) {
    throw new Error(`Expected a valid ${name} SHA-384 Subresource Integrity value.`);
  }
}

const targets = [
  {
    paths: [
      'examples/cdn/bar-chart.html',
      'examples/cdn/chart-types.html',
      'examples/cdn/complete-chart-types.html',
    ],
    bundle: 'graflume.global.js',
    placeholder: '__GRAFLUME_CDN_SRI__',
    integrity: defaultIntegrity,
  },
  {
    paths: ['examples/cdn/additional-chart-types.html'],
    bundle: 'graflume.complete.global.js',
    placeholder: '__GRAFLUME_COMPLETE_CDN_SRI__',
    integrity: completeIntegrity,
  },
];

for (const target of targets) {
  const escapedBundle = target.bundle.replaceAll('.', '\\.');
  const cdnUrlPattern = new RegExp(
    `https:\\/\\/cdn\\.jsdelivr\\.net\\/gh\\/statground\\/graflume@(?:__GRAFLUME_CDN_COMMIT__|[0-9a-f]{40})\\/cdn\\/${escapedBundle}`,
    'g',
  );
  const integrityPattern = new RegExp(
    `integrity="(?:${target.placeholder}|sha384-[A-Za-z0-9+/]+={0,2})"`,
    'g',
  );

  for (const path of target.paths) {
    const before = await readFile(path, 'utf8');
    const after = before
      .replace(
        cdnUrlPattern,
        `https://cdn.jsdelivr.net/gh/statground/graflume@${commit}/cdn/${target.bundle}`,
      )
      .replace(integrityPattern, `integrity="${target.integrity}"`);

    if (after === before && !before.includes(commit)) {
      throw new Error(`No CDN placeholders or previous pin were found in ${path}.`);
    }
    await writeFile(path, after, 'utf8');
  }
}
