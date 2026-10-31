V2.0.0-rc.1
---------------------

- Bundle cardano-c 2.0.0-rc.2. Publish this candidate under the npm `next` tag; the stable 1.2 release remains on `latest`.
- Add custom coin-selector inputs `outputsToCover`, `changeAddress` and `coinsPerUtxoByte`, and optional `changeOutputs` results. Existing selectors may omit change outputs to let the native library generate them.
- Transaction builders now default to native Plutus evaluation and Round-Robin Random-Improve coin selection. Explicit evaluator and selector overrides still take precedence; wallet helpers retain their provider evaluator.
- **Behavior changes inherited from cardano-c:** negative CBOR bignums use `-1 - n`, transaction bodies must contain inputs, outputs and fee, and key-hash CIP-8 signatures use the `address` protected header. Serialized bytes and hashes affected by these fixes can differ from 1.2.
- Dedicated Dijkstra transaction APIs are not yet exposed by this binding.

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