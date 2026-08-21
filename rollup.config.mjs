import typescript from '@rollup/plugin-typescript';

const banner = '/*! Graflume v0.1.0-alpha.0 | https://github.com/statground/graflume */';

function config(input, files) {
  return {
    input,
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
        name: 'Graflume',
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
    ],
  };
}

export default [
  config('src/index.ts', {
    module: 'dist/graflume.js',
    global: 'dist/graflume.global.js',
  }),
  config('src/complete.ts', {
    module: 'dist/graflume.complete.js',
    global: 'dist/graflume.complete.global.js',
  }),
];
