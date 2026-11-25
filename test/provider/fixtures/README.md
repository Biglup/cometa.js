These public preprod responses were fetched on 2026-11-25 from Koios v1:

- `ogmios-parameters.json`: `POST /api/v1/ogmios`, method `queryLedgerState/protocolParameters`.
- `koios-utxos.json`: `POST /api/v1/address_utxos` with `_extended: true`, for the public cardano-c test wallet address contained in the response.

No credentials, seed material, or signatures are included. The UTxO fixture exercises native JSON and Plutus V2/V3 reference scripts. Quantities, script hashes and protocol prices are verified by the tests.

Implementation contracts were reviewed against:

- [Blaze](https://github.com/ButaneProtocol/blaze-cardano/tree/9936de18a1c2a6999ae8a341703b1b0e32c5865d/packages/blaze-query/src): Maestro CBOR output decoding, Kupmios query/evaluation workflows.
- [Mesh providers](https://github.com/MeshJS/providers/tree/dd418fb07e2eb45f57309661c7ddc91c89bf6be4/src): Koios extended output and Ogmios evaluation formats.
- [Maestro Haskell SDK](https://github.com/maestro-org/haskell-sdk/tree/59a5ee72ecf4ba4f1979fe462a69a33da69a6ef7): explicit network/client configuration, cursor pagination, rational protocol parameters, rewards and transaction identities.
- [Koios OpenAPI](https://api.koios.rest/koiosapi.yaml): v1 endpoint bodies and response schemas.
- [Ogmios v6.14 schema](https://github.com/CardanoSolutions/ogmios/tree/master/docs/static/api/v6.14): JSON-RPC correlation, rewards, protocol parameters and evaluation budgets.
- [Kupo v2.12 schema](https://github.com/CardanoSolutions/kupo/blob/1c7346789188d7a1a05343e7888ad8f08854cbca/docs/api/v2.12.0.yaml): match patterns, dotted asset IDs, datum/script encodings and creation points.

Cometa validates complete evaluation results, preserves exact quantities, follows pagination, and propagates HTTP failures. Historical outputs are not treated as proof of current spendability. Kupmios uses stateless HTTP JSON-RPC rather than a persistent WebSocket connection.

Hydra fixtures: cardano-scaling/hydra commit f2dec914ec3d7cee030c68ad9ee67ffa8cc8f954 (Apache-2.0). `hydra-parameters.json` is `hydra-cluster/config/protocol-parameters.json`. `hydra-utxos.json` combines the first sample UTxO from `hydra-node/golden/ServerOutput/TxInvalid.json` and the first sample chainState.spendableUTxO from `hydra-node/golden/StateChanged/HeadClosed.json`, retaining original rows. These are synthetic upstream golden values, not live transactions.
