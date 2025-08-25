<div align="center">
  <a href="" target="_blank">
    <img align="center" width="300" src="assets/cometa_js.png">
  </a>
</div>

<br>

<div align="center">

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Post-Integration](https://github.com/Biglup/cometa.js/actions/workflows/unit-test.yml/badge.svg)
![node-current](https://img.shields.io/node/v/@biglup/cometa)
[![Documentation Status](https://app.readthedocs.org/projects/cometajs/badge/?version=latest)](https://cometajs.readthedocs.io/en/latest/?badge=latest)
[![Twitter Follow](https://img.shields.io/twitter/follow/BiglupLabs?style=social)](https://x.com/BiglupLabs)

</div>

<hr>

- [Official Website](https://cometa.dev/)
- [Installation](#installation)
- [Documentation](https://cometajs.readthedocs.io/en/latest/?badge=latest)

<hr>

Cometa.js is a lightweight, high-performance JavaScript library binding for the [libcardano-c](https://github.com/Biglup/cardano-c) library, designed to simplify blockchain development on Cardano.

Cometa.js packages [libcardano-c](https://github.com/Biglup/cardano-c), compiling, compressing and inlining it into a single JavaScript module, it works consistently in Node.js and browser environments. The result is an extremely compact, single-file distribution of about **~350kb**.

Furthermore, this package comes with three module variants: CommonJS, ESM, and a browser-ready IIFE build for direct CDN use. On top of this, the library provides a fully documented high-level, developer-friendly API with TypeScript support.

This package works in all JavaScript environments and with all modern bundlers and ecosystems, including Rollup, Webpack, and Node.js projects.

Example:

```typescript
const builder = await wallet.createTransactionBuilder();

const unsignedTx = await builder
  .sendLovelace({ address: 'addr....', amount: 12000000n })
  .expiresIn(3600) // in seconds
  .build();
```
<hr>

## **Conway Era Support**

Cometa.js supports all features up to the Conway era, which is the current era of the Cardano blockchain. Conway era
brought to Cardano decentralized governance. You can see some of the governance related examples in the [examples](examples/) directory:

- [Register as DRep (PubKey)](examples/src/drep-pubkey-example.ts)
- [Register as DRep (Script)](examples/src/drep-script-example.ts)
- [Submit governance action proposal (Withdrawing from treasury)](examples/src/propose-treasury-withdrawal-example.ts)
- [Vote for proposal (PubKey DRep)](examples/src/vote-for-proposal-drep-pubkey-example.ts)
- [Vote for proposal (Script DRep)](examples/src/vote-for-proposal-drep-script-example.ts)

These are some of the examples illustrated in the [examples](examples/) directory. However, you should
be able to build any valid transaction for the current era. See the [Documentation](https://cometajs.readthedocs.io/) for more information.

<hr>

## **Installation**

### Node.js or Bundlers (npm/yarn)
You can add Cometa.js to your project using either npm or Yarn:

```bash
# Using npm
npm install @biglup/cometa

# Using Yarn
yarn add @biglup/cometa
```

Once installed, you can import it into your application:

**ESM (import)**

```javascript
import * as Cometa from '@biglup/cometa';

await Cometa.ready();
const version = Cometa.getLibCardanoCVersion();
```
**CommonJS (require)**

```javascript
const Cometa = require('@biglup/cometa');

Cometa.ready().then(() => {
  const version = Cometa.getLibCardanoCVersion();
});
```

### Browser (via CDN \<script\> Tag)

For use directly in an HTML file without a build step, you can include the library from a CDN like UNPKG. This is ideal for simple tests, online playgrounds, or quick integrations.

```html
<script src="https://unpkg.com/@biglup/cometa@1.1.10/dist/iife/index.global.js"></script>
```

The library will then be available on the global Cometa object.

```html
<script>
  // The Cometa object is now available on the window
  Cometa.ready().then(() => {
    console.log('Cometa is ready!');
    const version = Cometa.getLibCardanoCVersion();
    console.log('Library version:', version);
  });
</script>
```

> [!IMPORTANT]
> Is recommended that you pin the version of the library you are using in your HTML file. For example, use `@1.1.901` instead of `@latest`.

<hr>

## **Getting Started**

The primary component for creating transactions is the [TransactionBuilder](https://cometajs.readthedocs.io/en/latest/classes/TransactionBuilder.html). It provides a fluent (chainable) API that simplifies the complex process of assembling inputs, outputs, and calculating fees.

Before using any part of the library, you must initialize its underlying WebAssembly module. This is done by calling and awaiting [Cometa.ready()](https://cometajs.readthedocs.io/en/latest/functions/ready.html).

```javascript
import * as Cometa from '@biglup/cometa';

await Cometa.ready();
```

First, establish a connection to the Cardano network using a Provider:

```typescript
const provider = new Cometa.BlockfrostProvider({
  network: Cometa.NetworkMagic.Preprod,
  projectId: 'YOUR_BLOCKFROST_PROJECT_ID'
});
```

> [!TIP]
>You can create your own providers by implementing the [Cometa.Provider interface](https://cometajs.readthedocs.io/en/latest/interfaces/Provider.html). 

Cometa comes with two types of wallets depending on your environment.

**Programmatic Wallet (for Node.js)**

This method creates a software wallet from a mnemonic phrase and is ideal for scripting or backend applications.

```typescript
const wallet = await Cometa.SingleAddressWallet.createFromMnemonics({
  mnemonics: ['zoo', 'zoo', 'zoo' ...],
  getPassword,
  provider,
  credentialsConfig: {
    account: 0,
    paymentIndex: 0,
    stakingIndex: 0 // Optional, if not provided the wallet will generate an enterprise address
  },
});
```
**Connect to a Browser Wallet (for dApps)**

This method connects to a user's existing browser extension wallet (like Lace, Eternl, etc.) using the [CIP-30](https://cips.cardano.org/cip/CIP-0030) API. You can also request specific CIP extensions.

```typescript
// In a browser environment:
const WALLET_NAME = 'lace';

// Request access, enabling the CIP-95 (governance) extension
const cip30Api = await window.cardano[WALLET_NAME].enable({
  extensions: [{ cip: 95 }]
});

// Create a Cometa wallet instance from the CIP-30 API
const wallet = new Cometa.BrowserExtensionWallet(cip30Api, provider);
```

The easiest way to start building a transaction is to use the [wallet.createTransactionBuilder()](https://cometajs.readthedocs.io/en/latest/interfaces/Wallet.html#createtransactionbuilder) helper. This automatically configures the builder with your wallet's current UTxOs, sets up collateral (following [CIP-0040](https://cips.cardano.org/cip/CIP-0040)), a change address, and the correct network parameters.

```typescript
const builder = await wallet.createTransactionBuilder();
```

Chain methods on the builder to define the transaction's contents. The final [.build()](https://cometajs.readthedocs.io/en/latest/classes/TransactionBuilder.html#build) call performs coin selection, calculates the fee, and assembles the unsigned transaction.

```typescript
const unsignedTx = await builder
  .sendLovelace({ address: 'addr_test1...', amount: 2000000n }) // Send 2 ADA
  .expiresIn(7200) // Set TTL for 2 hours
  .build();
```

The unsigned transaction must be signed by the wallet's private keys.

```typescript
const witnessSet = await wallet.signTransaction(unsignedTx, false);
```

Cometa comes with an utility function that correctly applies the VKEY witness set to the transaction without altering the original transaction CBOR:

```typescript
const signedTx = Cometa.applyVkeyWitnessSet(unsignedTx, witnessSet);
```

Finally, submit the signed transaction to the blockchain and wait for confirmation.

```typescript
const txId = await wallet.submitTransaction(signedTx);
console.log(`Transaction submitted successfully! TxID: ${txId}`);

const confirmed = await provider.confirmTransaction(txId, 120000 /* in ms */);
if (confirmed) {
  console.log('Transaction confirmed!');
}
```

You can see the full capabilities of the transaction builder here: [TransactionBuilder API](https://cometajs.readthedocs.io/en/latest/classes/TransactionBuilder.html). You can also refer to the library general documentation at [Cometa.js Documentation](https://cometajs.readthedocs.io/en/latest/), and make sure you check out the examples in the [examples](examples/) directory for practical use cases.
<hr>

## **Extending the Transaction Builder**

WebAssembly is fundamentally synchronous, while many JavaScript operations, like fetching data in a custom provider or evaluator, are asynchronous (async/await).

Cometa.js bridges this gap using Asyncify. This allows the synchronous Wasm code to "pause," hand control back to the JavaScript event loop to wait for your Promise to resolve, and then "resume" the Wasm execution exactly where it left off with the result.

This means you can simply write your select and evaluate methods with standard async/await syntax, and Cometa.js will handle the complex underlying state management for you.

The [TransactionBuilder API](https://cometajs.readthedocs.io/en/latest/classes/TransactionBuilder.html) allows you to override its core logic for coin selection and transaction evaluation. If these custom implementations are not provided, the builder uses the following defaults:

- Coin Selection: A "Largest First" strategy.
- Transaction Evaluation: A remote service via the configured Provider (e.g., Blockfrost)

### Implementing a Custom CoinSelector

The coin selector is responsible for choosing which UTxOs to spend to cover the value required by the transaction's outputs. You can provide your own strategy by implementing the CoinSelector interface.

```typescript
/**
 * Defines the contract for a coin selection strategy.
 */
export interface CoinSelector {
  /**
   * Gets the human-readable name of the coin selection strategy.
   * @returns {string} The name of the selector.
   */
  getName(): string;

  /**
   * Performs the coin selection algorithm.
   *
   * @param {CoinSelectorParams} params - The input parameters for the selection.
   * @returns {Promise<CoinSelectorResult>} A promise that resolves to the result of the selection.
   */
  select(params: CoinSelectorParams): Promise<CoinSelectorResult>;
}
```

Once you have your custom implementation, attach it to the builder using the [setCoinSelector](https://cometajs.readthedocs.io/en/latest/classes/TransactionBuilder.html#setcoinselector) method
  
```typescript
const myCustomSelector = new MyCoinSelector();
const builder = await wallet.createTransactionBuilder();

builder.setCoinSelector(myCustomSelector);
```

### Implementing a Custom TxEvaluator

The transaction evaluator is responsible for calculating the execution units (ExUnits) for any Plutus scripts in a transaction. By default, this is done by a remote service. For local evaluation or to use a different service, you can provide a custom implementation of the TxEvaluator interface.

```typescript
/**
 * Interface for transaction evaluation strategies. This will compute the required
 * execution units for each redeemer in a transaction.
 */
export interface TxEvaluator {
  /**
   * Gets the human-readable name of the transaction evaluator.
   * @returns {string} The name of the evaluator.
   */
  getName(): string;

  /**
   * Runs transaction evaluation to obtain script execution units.
   *
   * @param tx - The transaction payload to evaluate (hex-encoded CBOR).
   * @param additionalUtxos - Optional extra UTxOs for the evaluator to consider.
   * @returns A promise that resolves to a list of redeemers with their calculated costs.
   */
  evaluate(tx: string, additionalUtxos?: UTxO[]): Promise<Redeemer[]>;
}
```

Attach your custom evaluator to the builder using the setTxEvaluator method.

```typescript
const myCustomEvaluator = new MyLocalTxEvaluator();
const builder = await wallet.createTransactionBuilder();

builder.setTxEvaluator(myCustomEvaluator);
```

<hr>

## **Building and Testing**

While the underlying [libcardano-c](https://github.com/Biglup/cardano-c) library has its own comprehensive test suite, Cometa.js maintains a separate, dedicated suite of tests. These binding-level tests verify the correctness of the JavaScript-to-Wasm interface, check for potential memory leaks, and ensure the high-level API functions as expected.

To build and run the tests, use the following commands:

```bash
yarn install
yarn build
yarn test
```

<hr>

## **License**

Cometa.js is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for more information.
