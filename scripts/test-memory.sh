#!/usr/bin/env bash
set -euo pipefail

source_repo="${1:?Usage: scripts/test-memory.sh /path/to/cardano-c}"
shift
binding_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$binding_root"
backup_root="$(mktemp -d)"
cp libcardano-c/cardano_c.js "$backup_root/cardano_c.js"
restore_release() {
  cp "$backup_root/cardano_c.js" libcardano-c/cardano_c.js
  rm -rf "$backup_root"
  yarn build
}
trap restore_release EXIT
CARDANO_WASM_ALLOCATOR_STATS=ON ./scripts/build-wasm.sh "$source_repo"
COMETA_CHECK_LEAKS=1 yarn test --runInBand "$@"
