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

const ANCHOR = {
  dataHash: '26ce09df4e6f64fe5cf248968ab78f4b8a0092580c234d78f68c079c0fce34f0',
  url: 'https://storage.googleapis.com/biglup/Angel_Castillo.jsonld'
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
 * Registers a DRep using Cometa.
 *
 * @param {Cometa.Wallet} wallet - The Cometa wallet instance.
 * @param {Cometa.Provider} provider - The Cometa provider instance.
 * @param {string} drepId - The ID of the DRep to register.
 */
const registerDRep = async (wallet: Cometa.Wallet, provider: Cometa.Provider, drepId: string) => {
  monitor.startTask('Registering DRep...');
  const builder = await wallet.createTransactionBuilder();

  const unsignedTx = await builder.registerDRep({ anchor: ANCHOR, drepId }).build();

  monitor.endTask('Register DRep transaction built successfully.', TaskResult.Success);
  await signAndSubmit(wallet, provider, unsignedTx);
};

/**
 * Deregisters a DRep using Cometa.
 *
 * @param {Cometa.Wallet} wallet - The Cometa wallet instance.
 * @param {Cometa.Provider} provider - The Cometa provider instance.
 * @param {string} drepId - The ID of the DRep to register.
 */
const deregisterDRep = async (wallet: Cometa.Wallet, provider: Cometa.Provider, drepId: string) => {
  monitor.startTask('Deregistering DRep...');
  const builder = await wallet.createTransactionBuilder();

  const unsignedTx = await builder.deregisterDRep({ drepId }).build();

  monitor.endTask('Deregistering DRep transaction built successfully.', TaskResult.Success);
  await signAndSubmit(wallet, provider, unsignedTx);
};

/**
 * Cast a vote for the given proposal as dRep.
 *
 * @param {Cometa.Wallet} wallet - The Cometa wallet instance.
 * @param {Cometa.Provider} provider - The Cometa provider instance.
 * @param actionId - The ID of the governance action to vote on.
 * @param voter - The voter object containing the credential and type.
 * @param votingProcedure - The voting procedure object containing the anchor and vote.
 */
const voteAsDrep = async (
  wallet: Cometa.Wallet,
  provider: Cometa.Provider,
  actionId: Cometa.GovernanceActionId | string,
  voter: Cometa.Voter,
  votingProcedure: Cometa.VotingProcedure
) => {
  monitor.startTask('Voting as DRep...');
  const builder = await wallet.createTransactionBuilder();

  const unsignedTx = await builder
    .vote({
      actionId,
      voter,
      votingProcedure
    })
    .build();

  monitor.endTask('Voting transaction built successfully.', TaskResult.Success);
  await signAndSubmit(wallet, provider, unsignedTx);
};

/**
 * Example of registering a DRep, voting, and deregistering the DRep.
 */
const example = async () => {
  await Cometa.ready();

  printHeader('Vote for proposal as a DRep (Pubkey Hash)', 'This example votes for a proposal as a Pubkey Hash DRep.');

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

  const drepId = Cometa.cip129DRepFromPublicKey(await wallet.getPubDRepKey());
  monitor.logInfo(`DRep ID: ${drepId}`);

  // Created by https://preprod.cardanoscan.io/transaction/e1d1d4a310b4b500310e0433eeb70fb96b13ee91a7d05f605861a6b8618ef269?tab=govActions
  const govActionId = 'gov_action1u8gafgcskj6sqvgwqse7adc0h9438m535lg97czcvxntscvw7f5sqgf2n7j';
  const voter = {
    credential: Cometa.dRepToCredential(drepId),
    type: Cometa.VoterType.DRepKeyHash
  };
  const votingProcedure = {
    anchor: ANCHOR,
    vote: Cometa.Vote.Yes
  };

  await registerDRep(wallet, provider, drepId);
  await voteAsDrep(wallet, provider, govActionId, voter, votingProcedure);
  await deregisterDRep(wallet, provider, drepId);
};

example().catch((error) => monitor.logFailure(`Error in example: ${error.message}`));
