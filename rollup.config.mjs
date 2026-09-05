import typescript from '@rollup/plugin-typescript';

const banner = '/*! Graflume v0.1.0-alpha.0 | https://github.com/statground/graflume */';

const entryBoundaries = Object.freeze({
  cartesian: [
    /\/src\/(?:index|complete|spatial)\.ts$/,
    /\/src\/runtime\/default-registry\.ts$/,
    /\/src\/(?:spatial|catalog)\//,
    /\/src\/marks\/(?:field-advanced|finance-advanced|layout-advanced)\.ts$/,
  ],
  default: [
    /\/src\/complete\.ts$/,
    /\/src\/spatial(?:\.ts|\/)/,
    /\/src\/catalog\/(?:additional|series)-chart-types\.ts$/,
    /\/src\/marks\/(?:field-advanced|finance-advanced)\.ts$/,
  ],
  complete: [/\/src\/spatial(?:\.ts|\/)/],
  spatial: [
    /\/src\/(?:index|complete)\.ts$/,
    /\/src\/(?:api|compiler|marks|runtime)\//,
    /\/src\/renderer\/canvas\.ts$/,
  ],
});

/**
 * Fails the build when an entry point starts importing another entry's implementation.
 *
 * This checks the Rollup module graph, not exported symbol names. Public helpers can remain
 * tree-shakeable while complete-only Canvas compilers and the independent Spatial runtime stay
 * physically absent from smaller bundles.
 */
function entryBoundaryGuard(boundary) {
  const forbidden = entryBoundaries[boundary];
  return {
    name: `graflume-${boundary}-entry-boundary`,
    generateBundle(_outputOptions, bundle) {
      const renderedModules = Object.values(bundle)
        .filter((output) => output.type === 'chunk')
        .flatMap((chunk) =>
          Object.entries(chunk.modules)
            .filter(([, module]) => module.renderedLength > 0)
            .map(([id]) => id.replaceAll('\\', '/')),
        );
      const violations = renderedModules
        .filter((id) => forbidden.some((pattern) => pattern.test(id)))
        .map((id) => id.replace(`${process.cwd().replaceAll('\\', '/')}/`, ''))
        .sort();
      if (violations.length > 0) {
        this.error(
          `${boundary} entry point crossed its implementation boundary:\n${violations
            .map((id) => `- ${id}`)
            .join('\n')}`,
        );
      }
    },
  };
}

function config(input, files, globalName = 'Graflume', boundary = 'default') {
  return {
    input,
    // Keep the build contract aligned with package.json's `sideEffects: false`. All runtime
    // installation is explicit through exported registry factories, so unreachable entry-specific
    // modules can be discarded instead of retained for hypothetical import-time effects.
    treeshake: { moduleSideEffects: false },
    output: [
      {
        file: files.module,
        format: 'es',
        sourcemap: true,
        banner,
      },
      {
        file: files.global,
        format: 'iife',
        name: globalName,
        exports: 'named',
        sourcemap: true,
        banner,
      },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.bundle.json',
        noForceEmit: true,
        noEmitOnError: true,
      }),
      entryBoundaryGuard(boundary),
    ],
  };
}

export default [
  config(
    'src/cartesian.ts',
    { module: 'dist/graflume.cartesian.js', global: 'dist/graflume.cartesian.global.js' },
    'Graflume',
    'cartesian',
  ),
  config('src/index.ts', {
    module: 'dist/graflume.js',
    global: 'dist/graflume.global.js',
  }),
  config(
    'src/complete.ts',
    {
      module: 'dist/graflume.complete.js',
      global: 'dist/graflume.complete.global.js',
    },
    'Graflume',
    'complete',
  ),
  config(
    'src/spatial.ts',
    {
      module: 'dist/graflume.spatial.js',
      global: 'dist/graflume.spatial.global.js',
    },
    'GraflumeSpatial',
    'spatial',
  ),
];
