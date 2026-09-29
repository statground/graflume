import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const packageData = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const modules = packageData.graflumeSpreadsheetBuild.modules;
const banner =
  '/*! Graflume spreadsheet v0.1.0-alpha.0 | modified components: THIRD_PARTY_NOTICES.md */';
const dependencyInventoryPath = path.resolve('.tmp/spreadsheet/rendered-dependencies.json');
const toolbarIconRegionMarker = '//#region src/components/custom-label/CustomLabel.tsx';
const deferredToolbarIconInitializer = 'const [realIcon, setRealIcon] = useState("");';
const readyToolbarIconInitializer =
  'const [realIcon, setRealIcon] = useState(typeof icon === "string" ? icon : "");';

function countOccurrences(source, value) {
  let count = 0;
  let index = source.indexOf(value);
  while (index >= 0) {
    count += 1;
    index = source.indexOf(value, index + value.length);
  }
  return count;
}

export function initializeStaticToolbarIcons(source) {
  const markerCount = countOccurrences(source, toolbarIconRegionMarker);
  if (markerCount === 0) return { code: source, matched: false, changed: false };
  if (markerCount !== 1) {
    throw new Error(
      `Static toolbar icon source region must match exactly once; found ${markerCount}.`,
    );
  }

  const regionStart = source.indexOf(toolbarIconRegionMarker);
  const regionEnd = source.indexOf('//#endregion', regionStart + toolbarIconRegionMarker.length);
  if (regionEnd < 0) throw new Error('Static toolbar icon source region is not terminated.');
  const region = source.slice(regionStart, regionEnd);
  const deferredCount = countOccurrences(region, deferredToolbarIconInitializer);
  const readyCount = countOccurrences(region, readyToolbarIconInitializer);
  if (deferredCount + readyCount !== 1) {
    throw new Error(
      `Static toolbar icon initializer must match exactly once; found ${deferredCount + readyCount}.`,
    );
  }
  if (readyCount === 1) return { code: source, matched: true, changed: false };

  const initializerStart = source.indexOf(deferredToolbarIconInitializer, regionStart);
  return {
    code: `${source.slice(0, initializerStart)}${readyToolbarIconInitializer}${source.slice(
      initializerStart + deferredToolbarIconInitializer.length,
    )}`,
    matched: true,
    changed: true,
  };
}

export function staticToolbarIconReadiness() {
  let matchedModules = 0;
  return {
    name: 'graflume-static-toolbar-icon-readiness',
    buildStart() {
      matchedModules = 0;
    },
    transform(source) {
      const result = initializeStaticToolbarIcons(source);
      if (!result.matched) return null;
      matchedModules += 1;
      return result.changed ? { code: result.code, map: null } : null;
    },
    buildEnd(error) {
      if (error) return;
      if (matchedModules !== 1) {
        this.error(
          `Static toolbar icon source region must occur in exactly one module; found ${matchedModules}.`,
        );
      }
    },
  };
}

function neutralModuleBridge() {
  const prefix = '\0graflume-grid:';
  return {
    name: 'graflume-grid-neutral-module-bridge',
    resolveId(source) {
      if (Object.hasOwn(modules, source)) return `${prefix}${source}`;
      if (source.endsWith('.css')) return `${prefix}empty-style`;
      return null;
    },
    load(id) {
      if (id === `${prefix}empty-style`) return 'export {}';
      if (!id.startsWith(prefix)) return null;
      const publicId = id.slice(prefix.length);
      const descriptor = modules[publicId];
      if (descriptor.localePackages) {
        const imports = [];
        const english = [];
        const korean = [];
        descriptor.localePackages.forEach((packageName, index) => {
          imports.push(`import en${index} from ${JSON.stringify(`${packageName}/locales/en-US`)};`);
          imports.push(`import ko${index} from ${JSON.stringify(`${packageName}/locales/ko-KR`)};`);
          english.push(`en${index}`);
          korean.push(`ko${index}`);
        });
        return `${imports.join('\n')}\nexport const gridEnglish=[${english.join(',')}];\nexport const gridKorean=[${korean.join(',')}];`;
      }
      return descriptor.sources
        .map(({ package: packageName, exports }) => {
          const names = Object.entries(exports)
            .map(([original, neutral]) => `${original} as ${neutral}`)
            .join(',');
          return `export {${names}} from ${JSON.stringify(packageName)};`;
        })
        .join('\n');
    },
  };
}

function dependencyTypescript() {
  return {
    name: 'graflume-grid-dependency-typescript',
    transform(source, id) {
      if (!id.includes('/node_modules/') || !id.endsWith('.ts')) return null;
      const result = ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          sourceMap: false,
        },
        fileName: id,
      });
      return { code: result.outputText, map: null };
    },
  };
}

function packageRootForModule(id) {
  const normalized = id.replace(/^\0/, '');
  const marker = '/node_modules/';
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex < 0) return undefined;
  const base = normalized.slice(0, markerIndex + marker.length);
  const segments = normalized.slice(markerIndex + marker.length).split('/');
  const length = segments[0]?.startsWith('@') ? 2 : 1;
  return path.join(base, ...segments.slice(0, length));
}

function dependencyInventory() {
  return {
    name: 'graflume-rendered-dependency-inventory',
    generateBundle(_options, bundle) {
      const packageModules = new Map();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const [id, moduleInfo] of Object.entries(output.modules)) {
          if (moduleInfo.renderedLength <= 0) continue;
          const packageRoot = packageRootForModule(id);
          if (packageRoot === undefined) continue;
          packageModules.set(packageRoot, (packageModules.get(packageRoot) ?? 0) + 1);
        }
      }
      const packages = [...packageModules]
        .map(([packageRoot, renderedModules]) => {
          const packagePath = path.join(packageRoot, 'package.json');
          if (!existsSync(packagePath))
            throw new Error(`Missing dependency metadata for ${packageRoot}`);
          const metadata = JSON.parse(readFileSync(packagePath, 'utf8'));
          const override = packageData.graflumeSpreadsheetBuild.licenseOverrides?.[metadata.name];
          const license = override?.license ?? metadata.license;
          if (!['Apache-2.0', 'MIT', 'ISC', 'BSD-3-Clause', '0BSD'].includes(license)) {
            throw new Error(
              `Unsupported or missing license metadata for ${metadata.name}@${metadata.version}`,
            );
          }
          const licenseFiles = readdirSync(packageRoot)
            .filter((filename) => /^(?:licen[cs]e|copying)(?:\..*)?$/i.test(filename))
            .sort()
            .map((filename) => {
              const text = readFileSync(path.join(packageRoot, filename), 'utf8');
              return {
                filename,
                sha256: createHash('sha256').update(text).digest('hex'),
                text,
              };
            });
          if (override?.licenseEvidenceFile !== undefined) {
            const filename = override.licenseEvidenceFile;
            const source = readFileSync(path.join(packageRoot, filename), 'utf8');
            const heading = /^(#{1,3})\s+licen[cs]e\s*$/im.exec(source);
            const text = heading === null ? source : source.slice(heading.index);
            licenseFiles.push({
              filename,
              sha256: createHash('sha256').update(text).digest('hex'),
              text,
            });
          }
          if (licenseFiles.length === 0 && override?.licenseSource === undefined) {
            throw new Error(
              `Missing dependency license provenance for ${metadata.name}@${metadata.version}`,
            );
          }
          const repository =
            typeof metadata.repository === 'string'
              ? metadata.repository
              : typeof metadata.repository?.url === 'string'
                ? metadata.repository.url
                : undefined;
          const author =
            typeof metadata.author === 'string'
              ? metadata.author
              : metadata.author && typeof metadata.author === 'object'
                ? [
                    metadata.author.name,
                    metadata.author.email ? `<${metadata.author.email}>` : undefined,
                    metadata.author.url ? `(${metadata.author.url})` : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ')
                : undefined;
          return {
            name: metadata.name,
            version: metadata.version,
            license,
            renderedModules,
            repository,
            ...(author === undefined ? {} : { author }),
            ...(override?.notice === undefined ? {} : { notice: override.notice }),
            ...(override?.licenseSource === undefined
              ? {}
              : { licenseSource: override.licenseSource }),
            licenseFiles,
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name));
      writeFileSync(
        dependencyInventoryPath,
        `${JSON.stringify({ schemaVersion: 1, packages }, null, 2)}\n`,
        'utf8',
      );
    },
  };
}

const compile = typescript({
  tsconfig: './tsconfig.bundle.json',
  noForceEmit: true,
  noEmitOnError: true,
});

const facade = {
  input: 'src/spreadsheet.ts',
  treeshake: { moduleSideEffects: false },
  output: [
    {
      file: 'dist/graflume.spreadsheet.js',
      format: 'es',
      sourcemap: false,
      banner,
    },
    {
      file: 'dist/graflume.spreadsheet.global.js',
      format: 'iife',
      name: 'Graflume',
      extend: true,
      exports: 'named',
      sourcemap: false,
      banner,
    },
  ],
  plugins: [compile],
};

const runtime = {
  input: 'src/spreadsheet/runtime.ts',
  treeshake: { moduleSideEffects: true },
  output: {
    file: '.tmp/spreadsheet/graflume.spreadsheet.runtime.raw.js',
    format: 'iife',
    name: 'GraflumeGridRuntime',
    sourcemap: false,
    inlineDynamicImports: true,
    banner,
  },
  plugins: [
    neutralModuleBridge(),
    nodeResolve({ browser: true, extensions: ['.mjs', '.js', '.json', '.node', '.ts'] }),
    staticToolbarIconReadiness(),
    dependencyTypescript(),
    commonjs(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    compile,
    dependencyInventory(),
  ],
};

await mkdir(new URL('./.tmp/spreadsheet/', import.meta.url), { recursive: true });

export default [facade, runtime];
