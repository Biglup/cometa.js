Unreleased
---------------------

- Add Dijkstra transaction examples to the README.
- Fix reward withdrawals using Bech32 string addresses in both transaction builders, preserving all 64 amount bits.

V2.0.0-rc.1
---------------------

- Bundle cardano-c 2.0.0-rc.4. Publish this candidate under the npm `next` tag; the stable 1.2 release remains on `latest`.
- Add custom coin-selector inputs `outputsToCover`, `changeAddress` and `coinsPerUtxoByte`, and optional `changeOutputs` results. Existing selectors may omit change outputs to let the native library generate them.
- Transaction builders now default to native Plutus evaluation and Round-Robin Random-Improve coin selection. Explicit evaluator and selector overrides still take precedence; wallet helpers retain their provider evaluator.
- **Behavior changes inherited from cardano-c:** negative CBOR bignums use `-1 - n`, transaction bodies must contain inputs, outputs and fee, and key-hash CIP-8 signatures use the `address` protected header. Serialized bytes and hashes affected by these fixes can differ from 1.2.
- Add Plutus V4 scripts and cost models, native guard scripts and guard redeemers, direct deposits, account-balance constraints, and new protocol parameters.
- Add `SubTransactionBuilder`, batch inclusion, sub-transaction identifiers and witness application, and software key-handler signing.
- Add deferred redeemers for spending, minting, withdrawals, certificates and votes, plus native `applyParamsToScript`.
- Add deterministic builder disposal and reject overlapping builds and disposal while a build is active.
- Fix `updateDRep` calling deregistration, preserve zero-valued redeemers, and read 64-bit protocol parameters without truncating their high word.
- Fix certificate wrapping and ownership, native-script hash ownership and slot buffers, pool-relay ownership, mnemonic entropy cleanup, evaluator name allocation, and allocation cleanup on invalid inputs.
- Fix ESM loading and secure-random initialization, concurrent module initialization, and callback-registry retention. Leak tests now measure live WASM allocations after finalizers run.
- Use the official C release WASM artifact with callback registration exports. Allocation checks run separately with `yarn test:memory /path/to/cardano-c`; the instrumented payload is restored to the release payload afterward. Unused JS export wrappers are removed before compression and bundling.

Next (V1.0.8)
---------------------

V1.0.7001
---------------------

This version CIP-30 and sing address wallet integration

V1.0.7
---------------------

This version includes bindings to the transaction builder from libcardano-c library.

V1.0.3
---------------------

This version includes bindings to the address parsing libcardano-c library. The following functions are included:

- Add Binding to Address
- Add Binding to BaseAddress
- Add Binding to ByronAddress
- Add Binding to EnterpriseAddress
- Add Binding to PointerAddress
- Add Binding to RewardAddress

V1.0.2
---------------------

This version includes bindings to the cryptographic functions of the libcardano-c library. The following functions are included:

- Add Binding to Crc32
- Add Binding to Bip32PrivateKey
- Add Binding to Bip32PublicKey
- Add Binding to Ed25519Signature
- Add Binding to Ed25519PublicKey
- Add Binding to Ed25519PrivateKey
- Add Binding to [EMIP003](https://github.com/Emurgo/EmIPs/blob/master/specs/emip-003.md) encryption scheme
- Add Binding to Pbkdf2HmacSha512
- Add Binding to Blake2b

V1.0.0
---------------------
- Add Binding to CborReader
- Add Binding to CborWriter
- Add Binding to Base58
- Add Binding to Bech32