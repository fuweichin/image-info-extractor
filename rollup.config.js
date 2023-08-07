import terser from '@rollup/plugin-terser';
export default {
  input: 'src/extractor.js',
  treeshake: false,
  plugins: [
    terser({
      ecma: 2020,
      module: true,
      maxWorkers: 4,
    }),
  ],
  output: {
    file: 'dist/extractor.min.js',
    format: 'es',
    sourcemap: true,
    sourcemapFile: 'dist/extractor.min.js.map',
  },
};
