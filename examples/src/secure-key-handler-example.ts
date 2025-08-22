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

const SERIALIZED_BIP32_KEY_HANDLER =
  '0a0a0a0a01010000005c97db5e09b3a4919ec75ed1126056241a1e5278731c2e0b01bea0a5f42c22db4131e0a4bbe75633677eb0e60e2ecd3520178f85c7e0d4be77a449087fe9674ee52f946b07c1b56d228c496ec0d36dd44212ba8af0f6eed1a82194dd69f479c603';
const TX_CBOR =
  '84a40081825820f6dd880fb30480aa43117c73bfd09442ba30de5644c3ec1a91d9232fbe715aab000182a20058390071213dc119131f48f54d62e339053388d9d84faedecba9d8722ad2cad9debf34071615fc6452dfc743a4963f6bec68e488001c7384942c13011b0000000253c8e4f6a300581d702ed2631dbb277c84334453c5c437b86325d371f0835a28b910a91a6e011a001e848002820058209d7fee57d1dbb9b000b2a133256af0f2c83ffe638df523b2d1c13d405356d8ae021a0002fb050b582088e4779d217d10398a705530f9fb2af53ffac20aef6e75e85c26e93a00877556a10481d8799fd8799f40ffd8799fa1d8799fd8799fd87980d8799fd8799f581c71213dc119131f48f54d62e339053388d9d84faedecba9d8722ad2caffd8799fd8799fd8799f581cd9debf34071615fc6452dfc743a4963f6bec68e488001c7384942c13ffffffffffd8799f4040ffff1a001e8480a0a000ffd87c9f9fd8799fd8799fd8799fd87980d8799fd8799f581caa47de0ab3b7f0b1d8d196406b6af1b0d88cd46168c49ca0557b4f70ffd8799fd8799fd8799f581cd4b8fc88aec1d1c2f43ca5587898d88da20ef73964b8cf6f8f08ddfbffffffffffd8799fd87980d8799fd8799f581caa47de0ab3b7f0b1d8d196406b6af1b0d88cd46168c49ca0557b4f70ffd8799fd8799fd8799f581cd4b8fc88aec1d1c2f43ca5587898d88da20ef73964b8cf6f8f08ddfbffffffffffd8799f4040ffd87a9f1a00989680ffffd87c9f9fd8799fd87a9fd8799f4752656c65617365d8799fd87980d8799fd8799f581caa47de0ab3b7f0b1d8d196406b6af1b0d88cd46168c49ca0557b4f70ffd8799fd8799fd8799f581cd4b8fc88aec1d1c2f43ca5587898d88da20ef73964b8cf6f8f08ddfbffffffffffff9fd8799f0101ffffffd87c9f9fd8799fd87b9fd9050280ffd87980ffff1b000001884e1fb1c0d87980ffffff1b000001884e1fb1c0d87980ffffff1b000001884e1fb1c0d87980fffff5f6';

/* DEFINITIONS ****************************************************************/

const monitor = new TerminalProgressMonitor();

/**
 * Example of using a secure key handler to manage Cardano keys securely.
 */
const example = async () => {
  await Cometa.ready();

  printHeader(
    'Cardano secure key handler Example',
    'This example demonstrates how to create a software secure key handler'
  );

  // The SoftwareBip32SecureKeyHandler keeps the root private key encrypted, and only decrypts it when needed for a short time
  // it will then wipe from memory the decrypted private key and the given password. The SoftwareBip32SecureKeyHandler can be created
  // from a serialized version, which is useful for storing it in a database or a file or directly from BIP-39 mnemonics or entropy.
  // You can then securely store it for future use with SoftwareBip32SecureKeyHandler.serialize().
  const secureKeyHandler = Cometa.SoftwareBip32SecureKeyHandler.deserialize(
    Cometa.hexToUint8Array(SERIALIZED_BIP32_KEY_HANDLER),
    getPassword // Async callback function that provides the password to the secure key handler. It will always wipe the password from memory after use.
  );

  monitor.logInfo("Use passphrase: 'password'");
  monitor.logInfo('Requesting extended account public key...');

  const rootAccountPunKey = await secureKeyHandler.getAccountPublicKey({
    account: Cometa.harden(0),
    coinType: Cometa.harden(Cometa.CoinType.Cardano),
    purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard)
  });

  monitor.logInfo(`Extended account public key: ${rootAccountPunKey.toHashHex()}`);

  // The secure key handler can be used to sign transaction with more than one key at a time.
  const witness = await secureKeyHandler.signTransaction(TX_CBOR, [
    {
      account: Cometa.harden(0),
      coinType: Cometa.harden(Cometa.CoinType.Cardano),
      index: 0,
      purpose: Cometa.harden(Cometa.KeyDerivationPurpose.Standard),
      role: Cometa.KeyDerivationRole.External
    }
  ]);

  monitor.logInfo('Transaction signed successfully.');
  monitor.logInfo(`Witness: ${JSON.stringify(witness, null, 2)}`);
};

example().catch((error) => monitor.logFailure(`Error: ${error.message}`));
