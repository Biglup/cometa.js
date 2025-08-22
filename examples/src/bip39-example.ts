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
import { TerminalProgressMonitor, getPassword, printHeader } from './utils';

/* CONSTANTS ******************************************************************/

const MNEMONICS =
  'antenna whale clutch cushion narrow chronic matrix alarm raise much stove beach mimic daughter review build dinner twelve orbit soap decorate bachelor athlete close';

/* DEFINITIONS ****************************************************************/

const monitor = new TerminalProgressMonitor();

/**
 * Example of creating a software secure key handler from a mnemonic phrase.
 */
const example = async () => {
  await Cometa.ready();

  printHeader(
    'Cardano BIP-039 Example',
    'This example demonstrates how to create a software secure key handler from a mnemonic phrase.'
  );

  monitor.logInfo('Converting mnemonic words to entropy...');
  const entropy = Cometa.mnemonicToEntropy(MNEMONICS.split(' '));

  monitor.logInfo('Create secure key handler');
  const password = await getPassword();
  const secureKeyHander = Cometa.SoftwareBip32SecureKeyHandler.fromEntropy(entropy, password, getPassword);

  monitor.logInfo('Get account public key');
  const extendedPublicKey = await secureKeyHander.getAccountPublicKey({
    account: Cometa.harden(0),
    coinType: Cometa.harden(Cometa.CoinType.Cardano),
    purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard)
  });

  monitor.logInfo("Deriving address at: m / 1852' / 1815' / 0' / 0 / 0 ...");

  const paymentKey = extendedPublicKey.derive([Cometa.KeyDerivationRole.External, 0]);
  const stakingKey = extendedPublicKey.derive([Cometa.KeyDerivationRole.Staking, 0]);
  const baseAddress = Cometa.BaseAddress.fromCredentials(
    Cometa.NetworkId.Testnet,
    {
      hash: paymentKey.toEd25519Key().toHashHex(),
      type: Cometa.CredentialType.KeyHash
    },
    {
      hash: stakingKey.toEd25519Key().toHashHex(),
      type: Cometa.CredentialType.KeyHash
    }
  );

  monitor.logInfo(`Base address: ${baseAddress.toBech32()}`);
};

example().catch((error) => monitor.logFailure(`Error in bip39: ${error.message}`));
