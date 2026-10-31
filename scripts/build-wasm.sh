#!/usr/bin/env bash
set -euo pipefail

# Rebuild the pinned C release, optionally with allocator statistics.
# Requires emcc/emcmake, cmake, ninja, python3 and a cardano-c checkout.
source_repo="${1:?Usage: scripts/build-wasm.sh /path/to/cardano-c}"
binding_root="$(cd "$(dirname "$0")/.." && pwd)"
build_root="$(mktemp -d)"
trap 'rm -rf "$build_root"' EXIT
mkdir -p "$build_root/source"
git -C "$source_repo" archive v2.0.0-rc.4 | tar -x -C "$build_root/source"
emcmake cmake -S "$build_root/source" -B "$build_root/build" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release -DCLANG_TIDY_EXE=CLANG_TIDY_EXE-NOTFOUND \
  -DCARDANO_WASM_ALLOCATOR_STATS="${CARDANO_WASM_ALLOCATOR_STATS:-OFF}"
cmake --build "$build_root/build" --parallel "${BUILD_JOBS:-4}"
python3 "$binding_root/scripts/prepare-wasm.py" \
  "$build_root/build/build/release/lib/cardano_c.js" "$binding_root/libcardano-c/cardano_c.js"
