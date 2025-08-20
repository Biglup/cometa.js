/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'tsup';

export default defineConfig({
  bundle: true,
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  esbuildOptions(options) {
    options.platform = 'neutral';
    options.target = ['es2021'];
    options.resolveExtensions = ['.js', '.ts', '.wasm'];
    options.external = ['fs', 'path', 'crypto'];
    options.logOverride = {
      'direct-eval': 'silent'
    };
  },
  format: ['cjs', 'esm', 'iife'],
  globalName: 'Cometa',
  legacyOutput: false,
  minify: true,
  noExternal: [/(.*)/],
  outDir: 'dist',
  silent: false,
  skipNodeModulesBundle: false,
  sourcemap: true,
  splitting: false
});
