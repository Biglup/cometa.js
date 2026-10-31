# Bundled cardano-c

This candidate uses the official WASM artifact from [cardano-c v2.0.0-rc.4](https://github.com/Biglup/cardano-c/releases/tag/v2.0.0-rc.4), at commit `07c61176c4f856f8560c566c668e43ecb9eaec9c`.

Release archive SHA-256: `c4a86bc29e4edc74b35c89f67bf337fb183124c680f314a82fd7692f66ef80ed`.

After extracting `libcardano-c-2.0.0-rc.4-wasm-emscripten.tar.gz`, prepare the glue for bundling:

```sh
python3 scripts/prepare-wasm.py /path/to/cardano_c.js libcardano-c/cardano_c.js
yarn build
```

Preparation handles ESM directory lookup, supplies Node modules through factory options, and compacts the generated glue. The embedded WASM bytes are preserved. `yarn build` removes unused JavaScript export wrappers, retains runtime exports needed by Asyncify, gzip-compresses the embedded WASM, and builds CJS, ESM and IIFE distributions. Export pruning does not remove WASM functions.

## Allocation tests

`yarn test` checks the shipped artifact. Live native allocation checks additionally need the optional `mallinfo` export, which is absent from release packages. To run those checks, install Emscripten 3.1.49, CMake, Ninja and Python 3, and provide a C checkout containing the release tag:

```sh
yarn test:memory /path/to/cardano-c
```

This rebuilds the pinned tag with `CARDANO_WASM_ALLOCATOR_STATS=ON`, runs the suite with allocation checks required, then restores the release glue and rebuilds the distributions, including when tests fail. No C source changes or custom linker exports are applied. `scripts/build-wasm.sh` also supports standalone rebuilds, with allocator statistics off by default.
