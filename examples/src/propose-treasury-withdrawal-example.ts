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

const HOUR_IN_SECONDS = 3600;
const MNEMONICS =
  'antenna whale clutch cushion narrow chronic matrix alarm raise much stove beach mimic daughter review build dinner twelve orbit soap decorate bachelor athlete close';

const ANCHOR = {
  dataHash: '93106d082a93e94df5aff74f678438bae3a647dac63465fbfcde6a3058f41a1e',
  url: 'https://raw.githubusercontent.com/IntersectMBO/governance-actions/refs/heads/main/mainnet/2024-11-19-infohf/metadata.jsonld'
};
const CONSTITUTION_SCRIPT_HASH = 'fa24fb305126805cf2164c161d852a0e7330cf988f1fe558cf7d4a64';
const WITHDRAWAL_AMOUNT = 1000000000000n;

/* DEFINITIONS ****************************************************************/

const monitor = new TerminalProgressMonitor();

/**
 * Proposes a treasury withdrawal transaction using Cometa.
 */
const example = async () => {
  await Cometa.ready();

  printHeader(
    'Propose withdrawal Example',
    `This example will issue a withdrawal proposal to withdraw from treasury ${WITHDRAWAL_AMOUNT}.`
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

  monitor.startTask('Building transaction...');
  /**
   * While a TransactionBuilder can be instantiated manually, the wallet provides
   * this factory method to simplify the process. It automatically pre-populates
   * the new builder instance with the necessary context from the wallet's state,
   * including protocol parameters, UTxOs, and a change address (bot for regular inputs and collateral).
   */
  const builder = await wallet.createTransactionBuilder();

  const rewardAddress = (await wallet.getRewardAddresses())[0];

  // We also need to provider the constitution script, either by including it directly
  // in the witness set or by including a reference input with contains it. Currently (as of epoch 163), the
  // script is deployed at UTXO: 9aabbac24d1e39cb3e677981c84998a4210bae8d56b0f60908eedb9f59efffc8#0
  const referenceInput = (
    await provider.resolveUnspentOutputs([
      {
        index: 0,
        txId: '9aabbac24d1e39cb3e677981c84998a4210bae8d56b0f60908eedb9f59efffc8'
      }
    ])
  )[0];

  const unsignedTx = await builder
    .addReferenceInput(referenceInput)
    .proposeTreasuryWithdrawals({
      anchor: ANCHOR,
      policyHash: CONSTITUTION_SCRIPT_HASH,
      rewardAddress,
      withdrawals: {
        [rewardAddress.toBech32()]: WITHDRAWAL_AMOUNT
      }
    })
    .expiresIn(HOUR_IN_SECONDS * 2)
    .build();

  monitor.endTask('Transaction built successfully.', TaskResult.Success);

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

example().catch((error) => monitor.logFailure(`Error: ${error.message}`));
