#!/usr/bin/env bash
set -euo pipefail

# Rebuild the pinned C release with the runtime APIs used by the JS binding.
# Requires emcc/emcmake, cmake, ninja, wasm-opt, python3 and a cardano-c checkout.
source_repo="${1:?Usage: scripts/build-wasm.sh /path/to/cardano-c}"
binding_root="$(cd "$(dirname "$0")/.." && pwd)"
build_root="$(mktemp -d)"
trap 'rm -rf "$build_root"' EXIT
mkdir -p "$build_root/source"
git -C "$source_repo" archive v2.0.0-rc.2 | tar -x -C "$build_root/source"
# -g3 keeps glue readable and avoids the old Emscripten JS minifier. Debug
# sections are stripped below; the normal JS build performs final minification.
emcmake cmake -S "$build_root/source" -B "$build_root/build" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release -DCLANG_TIDY_EXE=CLANG_TIDY_EXE-NOTFOUND \
  '-DCMAKE_EXE_LINKER_FLAGS=-g3 -sALLOW_TABLE_GROWTH=1 -sEXPORTED_RUNTIME_METHODS=addFunction,removeFunction,getTempRet0,getValue,setValue,UTF8ToString,stringToUTF8,lengthBytesUTF8,Asyncify -sEXPORTED_FUNCTIONS=_malloc,_free,_mallinfo'
cmake --build "$build_root/build" --parallel "${BUILD_JOBS:-4}"
python3 "$binding_root/scripts/prepare-wasm.py" \
  "$build_root/build/build/release/lib/cardano_c.js" "$binding_root/libcardano-c/cardano_c.js"
