import typescript from '@rollup/plugin-typescript';

const banner = '/*! Graflume v0.1.0-alpha.0 | https://github.com/statground/graflume */';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/graflume.js',
      format: 'es',
      sourcemap: true,
      banner,
    },
    {
      file: 'dist/graflume.global.js',
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
