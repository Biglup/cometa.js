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

const LOVELACE_TO_SEND = 2000000;
const RECEIVING_ADDRESS =
  'addr_test1qpjhcqawjma79scw4d9fjudwcu0sww9kv9x8f30fer3rmpu2qn0kv3udaf5pmf94ts27ul2w7q3sepupwccez2u2lu5s7aa8rv';
const HOUR_IN_SECONDS = 3600;
const MNEMONICS =
  'antenna whale clutch cushion narrow chronic matrix alarm raise much stove beach mimic daughter review build dinner twelve orbit soap decorate bachelor athlete close';

/* DEFINITIONS ****************************************************************/

const monitor = new TerminalProgressMonitor();

/**
 * Sends a specified amount of lovelace to a receiving address using Cometa.
 */
const sendLovelaceExample = async () => {
  await Cometa.ready();

  printHeader(
    'Send lovelace Example',
    `This example will send ${LOVELACE_TO_SEND} lovelace to the receiving address: ${RECEIVING_ADDRESS}.`
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

  const unsignedTx = await builder
    .sendLovelace({ address: RECEIVING_ADDRESS, amount: 12000000n })
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

sendLovelaceExample().catch((error) => monitor.logFailure(`Error: ${error.message}`));
