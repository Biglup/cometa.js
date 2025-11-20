/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS ********************************************************************/

import * as Cometa from '@biglup/cometa';
import { TaskResult, TerminalProgressMonitor, getBlockfrostProjectIdFromEnv, getPassword, printHeader } from './utils';

/* CONSTANTS ******************************************************************/

const EXAMPLE_CIP_25_METADATA = {
  eb7e6282971727598462d39d7627bfa6fbbbf56496cb91b76840affb: {
    BerryOnyx: {
      color: '#0F0F0F',
      image: 'ipfs://ipfs/QmS7w3Q5oVL9NE1gJnsMVPp6fcxia1e38cRT5pE5mmxawL',
      name: 'Berry Onyx'
    },
    BerryRaspberry: {
      color: '#E30B5D',
      image: 'ipfs://ipfs/QmXjegt568JqSUpAz9phxbXq5noWE3AeymZMUP43Ej2DRZ',
      name: 'Berry Raspberry'
    }
  }
};

const ALWAYS_SUCCEEDS_NATIVE_SCRIPT: Cometa.Script = {
  type: Cometa.ScriptType.Native,
  kind: Cometa.NativeScriptKind.RequireAllOf,
  scripts: [
    {
      type: Cometa.ScriptType.Native,
      kind: Cometa.NativeScriptKind.RequireTimeBefore,
      slot: 1001655683199 // Invalid after year 33658
    }
  ]
};

const MNEMONICS =
  'antenna whale clutch cushion narrow chronic matrix alarm raise much stove beach mimic daughter review build dinner twelve orbit soap decorate bachelor athlete close';

/* DEFINITIONS ****************************************************************/

const monitor = new TerminalProgressMonitor();

/**
 * Signs and submits a transaction using Cometa.
 * @param wallet Cometa.Wallet instance to sign the transaction.
 * @param provider Cometa.Provider instance to submit the transaction and confirm it.
 * @param unsignedTx The unsigned transaction in CBOR format as a string.
 */
const signAndSubmit = async (wallet: Cometa.Wallet, provider: Cometa.Provider, unsignedTx: string) => {
  monitor.logInfo('Signing transaction...');
  const witnessSet = await wallet.signTransaction(unsignedTx, true);
  const signedTx = Cometa.applyVkeyWitnessSet(unsignedTx, witnessSet);

  monitor.logInfo('Signed transaction:');
  monitor.logInfo(JSON.stringify(Cometa.inspectTx(signedTx), null, 2));

  monitor.startTask('Submitting transaction...');
  const txId = await wallet.submitTransaction(signedTx);
  monitor.endTask(`Transaction submitted successfully with ID: ${txId}`, TaskResult.Success);

  monitor.startTask('Confirming transaction...');
  const confirmed = await provider.confirmTransaction(txId, 90000);
  if (confirmed) {
    monitor.endTask('Transaction confirmed successfully.', TaskResult.Success);
  } else {
    monitor.endTask('Transaction confirmation failed.', TaskResult.Fail);
  }
};

/**
 * Mints two tokens using Cometa's transaction builder and sends them to the wallet's address.
 *
 * @param {Cometa.Wallet} wallet - The Cometa wallet instance.
 * @param {Cometa.Provider} provider - The Cometa provider instance.
 * @param assetId1 - The asset ID of the first token to mint.
 * @param assetId2 - The asset ID of the second token to mint.
 */
const mint = async (wallet: Cometa.Wallet, provider: Cometa.Provider, assetId1: string, assetId2: string) => {
  monitor.startTask('Minting tokens...');
  const builder = await wallet.createTransactionBuilder();
  const address = (await wallet.getUsedAddresses())[0];

  const unsignedTx = await builder
    .setMetadata({ metadata: EXAMPLE_CIP_25_METADATA, tag: 721 })
    .expiresIn(3600)
    .mintToken({ amount: 1, assetIdHex: assetId1 })
    .mintToken({ amount: 1, assetIdHex: assetId2 })
    .addScript(ALWAYS_SUCCEEDS_NATIVE_SCRIPT)
    .sendValue({
      address,
      value: {
        assets: {
          [assetId1]: 1n,
          [assetId2]: 1n
        },
        coins: 2000000n
      }
    })
    .build();

  monitor.endTask('Transaction built successfully.', TaskResult.Success);

  monitor.endTask('Mint transaction built successfully.', TaskResult.Success);
  await signAndSubmit(wallet, provider, unsignedTx);
};

/**
 * Burns two tokens using Cometa's transaction builder.
 *
 * @param {Cometa.Wallet} wallet - The Cometa wallet instance.
 * @param {Cometa.Provider} provider - The Cometa provider instance.
 * @param assetId1 - The asset ID of the first token to burn.
 * @param assetId2 - The asset ID of the second token to burn.
 */
const burn = async (wallet: Cometa.Wallet, provider: Cometa.Provider, assetId1: string, assetId2: string) => {
  monitor.startTask('Minting tokens...');
  const builder = await wallet.createTransactionBuilder();

  const unsignedTx = await builder
    .expiresIn(3600)
    .mintToken({ amount: -1, assetIdHex: assetId1 })
    .mintToken({ amount: -1, assetIdHex: assetId2 })
    .addScript(ALWAYS_SUCCEEDS_NATIVE_SCRIPT)
    .build();

  monitor.endTask('Transaction built successfully.', TaskResult.Success);

  monitor.endTask('Mint transaction built successfully.', TaskResult.Success);
  await signAndSubmit(wallet, provider, unsignedTx);
};

/**
 * Example of minting and burning tokens with a native script using Cometa.
 */
const example = async () => {
  await Cometa.ready();

  printHeader(
    'Mint & Burn with Native Scripts Example',
    'This example mints two CIP-025 tokens and burn one afterwards.'
  );

  const provider = new Cometa.BlockfrostProvider({
    network: Cometa.NetworkMagic.Preprod,
    projectId: getBlockfrostProjectIdFromEnv() // Reads from env variable BLOCKFROST_PROJECT_ID
  });

  monitor.logInfo('Creating wallet from mnemonics...');
  const wallet = await Cometa.SingleAddressWallet.createFromMnemonics({
    credentialsConfig: {
      account: 0,
      paymentIndex: 0,
      stakingIndex: 0
    },
    getPassword,
    mnemonics: MNEMONICS.split(' '),
    provider
  });

  const policyId = Cometa.computeScriptHash(ALWAYS_SUCCEEDS_NATIVE_SCRIPT);
  const assetId1 = `${policyId}${Cometa.utf8ToHex('BerryOnyx')}`;
  const assetId2 = `${policyId}${Cometa.utf8ToHex('BerryRaspberry')}`;

  await mint(wallet, provider, assetId1, assetId2);
  await burn(wallet, provider, assetId1, assetId2);
};

example().catch((error) => monitor.logFailure(`Error: ${error.message}`));
