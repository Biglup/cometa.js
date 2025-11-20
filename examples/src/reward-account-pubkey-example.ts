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
 * Registers a stake key and delegates to a pool.
 * @param wallet Cometa.Wallet instance to register the stake key and delegate stake.
 * @param provider Cometa.Provider instance to submit the transaction and confirm it.
 * @param poolId The ID of the pool to delegate stake to.
 */
const registerAndDelegateStakeKey = async (wallet: Cometa.Wallet, provider: Cometa.Provider, poolId: string) => {
  monitor.startTask('Registering and delegating stake to pool...');
  const builder = await wallet.createTransactionBuilder();

  const rewardAddress = (await wallet.getRewardAddresses())[0];
  const unsignedTx = await builder
    .registerStakeAddress({ rewardAddress })
    .delegateStake({ poolId, rewardAddress })
    .build();

  monitor.endTask('Register and delegating transaction built successfully.', TaskResult.Success);
  await signAndSubmit(wallet, provider, unsignedTx);
};

/**
 * Deregisters the stake key and withdraws rewards.
 * @param wallet Cometa.Wallet instance to deregister the stake key and withdraw rewards.
 * @param provider Cometa.Provider instance to submit the transaction and confirm it.
 */
const deregisterAndWithdrawRewards = async (wallet: Cometa.Wallet, provider: Cometa.Provider) => {
  monitor.startTask('Deregister stake key and withdrawing rewards...');
  const builder = await wallet.createTransactionBuilder();

  const rewardAddress = (await wallet.getRewardAddresses())[0];

  const unsignedTx = await builder.deregisterStakeAddress({ rewardAddress }).build();

  monitor.endTask('Deregister and withdraw rewards transaction built successfully.', TaskResult.Success);
  await signAndSubmit(wallet, provider, unsignedTx);
};

/**
 * Example of registering a stake key, delegating it to a pool, and withdrawing rewards.
 */
const example = async () => {
  await Cometa.ready();

  printHeader(
    'Delegate and Withdraw Example (Pubkey Hash)',
    'This example registers and delegates a stake key to a pool, and finally withdraws and deregisters it.'
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

  const poolId = 'pool1pzdqdxrv0k74p4q33y98f2u7vzaz95et7mjeedjcfy0jcgk754f'; // SMAUG Pool

  await registerAndDelegateStakeKey(wallet, provider, poolId);
  await deregisterAndWithdrawRewards(wallet, provider);
};

example().catch((error) => monitor.logFailure(`Error: ${error.message}`));
