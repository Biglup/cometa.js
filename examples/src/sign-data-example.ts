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
import { TerminalProgressMonitor, getBlockfrostProjectIdFromEnv, getPassword, printHeader } from './utils';

/* CONSTANTS ******************************************************************/

const MNEMONICS =
  'antenna whale clutch cushion narrow chronic matrix alarm raise much stove beach mimic daughter review build dinner twelve orbit soap decorate bachelor athlete close';

/* DEFINITIONS ****************************************************************/

const monitor = new TerminalProgressMonitor();

/**
 * Sign data with CIP-008 using Cometa.
 */
const messageSigningExample = async () => {
  await Cometa.ready();

  printHeader('Sign data Example', 'This example will sign some data with CIP-008 standard.');

  const provider = new Cometa.BlockfrostProvider({
    network: Cometa.NetworkMagic.Preprod,
    projectId: ''
  });

  monitor.logInfo('Creating wallet from mnemonics...');
  const wallet = await Cometa.SingleAddressWallet.createFromMnemonics({
    credentialsConfig: {
      account: 0,
      paymentIndex: 0,
      stakingIndex: 0
    },
    getPassword: () => Promise.resolve(new Uint8Array([0x00])),
    mnemonics: MNEMONICS.split(' '),
    provider
  });

  const address = (await wallet.getRewardAddresses())[0];
  monitor.logInfo(`Signing data with ${address.toBech32()}`);
  const { key, signature } = await wallet.signData(address.toAddress(), Cometa.utf8ToHex('Hello, Cometa!'));
  monitor.logInfo('Data signed successfully!');

  monitor.logInfo(`Cose Key: ${key}`);
  monitor.logInfo(`Cose Sign1: ${signature}`);
};

messageSigningExample().catch((error) => monitor.logFailure(`Error: ${error.message}`));
