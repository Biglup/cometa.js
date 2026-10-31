# Bundled cardano-c

This candidate uses cardano-c `v2.0.0-rc.2` (commit `90b1328375f09c21e0413f11631ce83a3ed767fd`).

Rebuild from a local checkout containing that tag:

```sh
./scripts/build-wasm.sh /path/to/cardano-c
yarn build
```

The recorded build uses Emscripten 3.1.5 and Binaryen 105. The script archives the tagged source, enables table growth and callback registration for deferred redeemers, and exports `mallinfo` for allocation tests. It strips WASM debug sections and compacts the generated glue. No C source changes are applied.

`yarn build` removes unused JavaScript export wrappers, retains runtime exports needed by Asyncify, gzip-compresses the embedded WASM, and builds CJS, ESM and IIFE distributions. Export pruning does not remove WASM functions.
