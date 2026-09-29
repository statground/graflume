import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { minify } from 'terser';

import {
  hasSpreadsheetExternalIdentityToken,
  hasSpreadsheetProductToken,
  neutralizeSpreadsheetAsset,
} from './lib/spreadsheet-neutralize.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const packageData = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const build = packageData.graflumeSpreadsheetBuild;
const legalBanner =
  '/*! Graflume spreadsheet v0.1.0-alpha.0 | modified components: THIRD_PARTY_NOTICES.md */';
const dist = path.join(root, 'dist');
const cdn = path.join(root, 'cdn');
const licenses = path.join(root, 'licenses');
const temporary = path.join(root, '.tmp', 'spreadsheet');
await mkdir(dist, { recursive: true });
await mkdir(cdn, { recursive: true });
await mkdir(licenses, { recursive: true });

function sri(value) {
  return `sha384-${createHash('sha384').update(value).digest('base64')}`;
}

function asset(pathname, mediaType, value) {
  return Object.freeze({
    path: `cdn/${pathname}`,
    mediaType,
    bytes: Buffer.byteLength(value),
    integrity: sri(value),
  });
}

function assertNeutralAsset(label, value) {
  if (hasSpreadsheetProductToken(value) || hasSpreadsheetExternalIdentityToken(value)) {
    throw new Error(`Spreadsheet neutral boundary failed for generated ${label}.`);
  }
}

function markdown(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
}

const dependencyInventory = JSON.parse(
  await readFile(path.join(temporary, 'rendered-dependencies.json'), 'utf8'),
);
const packageLock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const lockedPackages = new Set(
  Object.entries(packageLock.packages)
    .filter(([, entry]) => entry?.version)
    .map(([pathname, entry]) => {
      const tail = pathname.includes('/node_modules/')
        ? pathname.split('/node_modules/').at(-1)
        : pathname.replace(/^node_modules\//, '');
      const segments = tail?.split('/') ?? [];
      const name =
        entry.name ?? (segments[0]?.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]);
      return `${name}@${entry.version}`;
    }),
);
for (const dependency of dependencyInventory.packages) {
  if (!lockedPackages.has(`${dependency.name}@${dependency.version}`)) {
    throw new Error(`Rendered dependency is not pinned in package-lock: ${dependency.name}`);
  }
}

const licenseAssets = {
  'APACHE-2.0.txt': 'node_modules/rxjs/LICENSE.txt',
  'MIT.txt': 'node_modules/react/LICENSE',
  'ISC.txt': 'node_modules/kdbush/LICENSE',
  'BSD-3-CLAUSE.txt': 'node_modules/react-transition-group/LICENSE',
  '0BSD.txt': 'node_modules/tslib/LICENSE.txt',
};
await Promise.all(
  Object.entries(licenseAssets).map(async ([target, source]) =>
    writeFile(path.join(licenses, target), await readFile(path.join(root, source), 'utf8'), 'utf8'),
  ),
);

const evidenceByHash = new Map();
for (const dependency of dependencyInventory.packages) {
  for (const evidence of dependency.licenseFiles) {
    const entry = evidenceByHash.get(evidence.sha256) ?? {
      text: evidence.text,
      sources: [],
      packages: [],
    };
    entry.sources.push(`${dependency.name}/${evidence.filename}`);
    entry.packages.push(`${dependency.name}@${dependency.version}`);
    evidenceByHash.set(evidence.sha256, entry);
  }
}

const counts = Object.fromEntries(
  ['Apache-2.0', 'MIT', 'ISC', 'BSD-3-Clause', '0BSD'].map((license) => [
    license,
    dependencyInventory.packages.filter((dependency) => dependency.license === license).length,
  ]),
);
const inventoryRows = dependencyInventory.packages.map(
  (dependency) =>
    `| ${markdown(dependency.name)} | ${markdown(dependency.version)} | ${markdown(dependency.license)} | ${dependency.renderedModules} | ${markdown(dependency.author)} | ${markdown(dependency.notice)} | ${markdown(dependency.repository)} | ${markdown(dependency.licenseSource ?? dependency.licenseFiles.map((file) => `${file.filename} sha256:${file.sha256}`).join('; '))} |`,
);
const evidenceSections = [...evidenceByHash.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(
    ([sha256, evidence]) => `### License evidence ${sha256.slice(0, 12)}

Packages: ${[...new Set(evidence.packages)]
      .sort()
      .map((value) => `\`${value}\``)
      .join(', ')}

Files: ${[...new Set(evidence.sources)]
      .sort()
      .map((value) => `\`${value}\``)
      .join(', ')}

SHA-256: \`${sha256}\`

\`\`\`\`text
${evidence.text.trimEnd()}
\`\`\`\`
`,
  );
const legalSection = `<!-- graflume-spreadsheet-dependencies:start -->
## Optional spreadsheet runtime

The optional, separately loaded spreadsheet runtime is a modified binary distribution assembled from the exact packages below. Graflume bundles and minifies these sources, adapts generated identifiers and CSS namespaces for isolation, and adds a Graflume iframe/RPC/data-frame adapter. No upstream trademark or product identity is exposed as Graflume's public API.

The generated inventory is derived from ${dependencyInventory.packages.reduce((sum, dependency) => sum + dependency.renderedModules, 0).toLocaleString('en-US')} rendered Rollup modules in ${dependencyInventory.packages.length} packages and checked against \`package-lock.json\`. SPDX counts: Apache-2.0 ${counts['Apache-2.0']}, MIT ${counts.MIT}, ISC ${counts.ISC}, BSD-3-Clause ${counts['BSD-3-Clause']}, 0BSD ${counts['0BSD']}. Reference copies for every represented license family are shipped in \`licenses/APACHE-2.0.txt\`, \`licenses/MIT.txt\`, \`licenses/ISC.txt\`, \`licenses/BSD-3-CLAUSE.txt\`, and \`licenses/0BSD.txt\`; exact package-specific notices and distinct shipped license texts are preserved below. No rendered Apache-2.0 package supplied a separate NOTICE file.

### Rendered dependency SBOM

| Package | Version | SPDX | Modules | Author | Additional notice | Repository | License evidence |
| --- | --- | --- | ---: | --- | --- | --- | --- |
${inventoryRows.join('\n')}

### Bundled license evidence

The following distinct license files or package README license sections are preserved verbatim and keyed by SHA-256. Packages without a shipped top-level license file use the authoritative source identified in the SBOM and the corresponding complete standard license text shipped under \`licenses/\`.

${evidenceSections.join('\n')}
<!-- graflume-spreadsheet-dependencies:end -->`;
const noticesPath = path.join(root, 'THIRD_PARTY_NOTICES.md');
const notices = await readFile(noticesPath, 'utf8');
const legalPattern =
  /<!-- graflume-spreadsheet-dependencies:start -->[\s\S]*?<!-- graflume-spreadsheet-dependencies:end -->[\t ]*(?:\r?\n)*$/;
const noticePreamble = legalPattern.test(notices) ? notices.replace(legalPattern, '') : notices;
await writeFile(noticesPath, `${noticePreamble.trimEnd()}\n\n${legalSection}\n`, 'utf8');

const rawRuntime = await readFile(
  path.join(temporary, 'graflume.spreadsheet.runtime.raw.js'),
  'utf8',
);
const runtime = neutralizeSpreadsheetAsset(rawRuntime);
assertNeutralAsset('runtime', runtime);
await writeFile(path.join(dist, 'graflume.spreadsheet.runtime.js'), runtime, 'utf8');

const runtimeMinified = await minify(runtime, {
  compress: { passes: 2 },
  mangle: true,
  format: { comments: /^!/ },
});
if (runtimeMinified.code === undefined) throw new Error('Spreadsheet runtime minification failed.');
assertNeutralAsset('minified runtime', runtimeMinified.code);
await writeFile(
  path.join(dist, 'graflume.spreadsheet.runtime.min.js'),
  runtimeMinified.code,
  'utf8',
);

const globalFacade = await readFile(path.join(dist, 'graflume.spreadsheet.global.js'), 'utf8');
const facadeMinified = await minify(globalFacade, {
  compress: { passes: 2 },
  mangle: true,
  format: { comments: /^!/ },
});
if (facadeMinified.code === undefined) throw new Error('Spreadsheet facade minification failed.');
assertNeutralAsset('minified facade', facadeMinified.code);
await writeFile(path.join(dist, 'graflume.spreadsheet.min.js'), facadeMinified.code, 'utf8');

const cssParts = [
  'html,body,#graflume-spreadsheet-root{width:100%;height:100%;margin:0;overflow:hidden}',
];
for (const relative of build.styles) {
  cssParts.push(await readFile(path.join(root, 'node_modules', relative), 'utf8'));
}
const css = neutralizeSpreadsheetAsset(cssParts.join('\n'));
assertNeutralAsset('stylesheet', css);
await writeFile(path.join(dist, 'graflume.spreadsheet.css'), css, 'utf8');
const minifiedCssBody = css
  .replaceAll(/\/\*[\s\S]*?\*\//g, '')
  .replaceAll(/\s+/g, ' ')
  .replaceAll(/\s*([{}:;,>])\s*/g, '$1')
  .trim();
const minifiedCss = `${legalBanner}${minifiedCssBody}`;
assertNeutralAsset('minified stylesheet', minifiedCss);
await writeFile(path.join(dist, 'graflume.spreadsheet.min.css'), minifiedCss, 'utf8');

const publishedAssets = {
  spreadsheet: asset('graflume.spreadsheet.global.js', 'text/javascript', facadeMinified.code),
  spreadsheetRuntime: asset(
    'graflume.spreadsheet.runtime.js',
    'text/javascript',
    runtimeMinified.code,
  ),
  spreadsheetStyle: asset('graflume.spreadsheet.css', 'text/css', minifiedCss),
};
await Promise.all([
  writeFile(path.join(cdn, 'graflume.spreadsheet.global.js'), facadeMinified.code, 'utf8'),
  writeFile(path.join(cdn, 'graflume.spreadsheet.runtime.js'), runtimeMinified.code, 'utf8'),
  writeFile(path.join(cdn, 'graflume.spreadsheet.css'), minifiedCss, 'utf8'),
  writeFile(
    path.join(cdn, 'graflume.spreadsheet.manifest.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        package: packageData.name,
        version: packageData.version,
        entries: publishedAssets,
      },
      null,
      2,
    )}\n`,
    'utf8',
  ),
]);
await rm(temporary, { recursive: true, force: true });
