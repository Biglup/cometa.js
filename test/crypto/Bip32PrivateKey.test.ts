/**
 * Copyright 2024 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS ********************************************************************/

import * as Cometa from '../../dist/cjs';
import { bip32TestVectorMessageOneLength, extendedVectors } from './Ed25519TestVectors';

/* TESTS **********************************************************************/
describe('Bip32PrivateKey', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('can create an instance from a valid normal BIP-32 private key hex representation', () => {
    const privateKey = Cometa.Bip32PrivateKey.fromHex(bip32TestVectorMessageOneLength.rootKey);
    expect(privateKey.toHex()).toEqual(bip32TestVectorMessageOneLength.rootKey);
  });

  it('can create an instance from a valid normal BIP-32 private key raw binary representation', () => {
    const bytes = Cometa.hexToUint8Array(bip32TestVectorMessageOneLength.rootKey);
    const privateKey = Cometa.Bip32PrivateKey.fromBytes(bytes);

    expect(privateKey.toBytes()).toEqual(bytes);
  });

  it('throws if a BIP-32 private key of invalid size is given.', () => {
    expect(() => Cometa.Bip32PrivateKey.fromHex('1f')).toThrow(Error);
    expect(() => Cometa.Bip32PrivateKey.fromHex(`${bip32TestVectorMessageOneLength.rootKey}1f2f3f`)).toThrow(Error);
  });

  it('can create the correct BIP-32 key given the right bip39 entropy and password.', () => {
    expect.assertions(extendedVectors.length);

    for (const vector of extendedVectors) {
      const bip32Key = Cometa.Bip32PrivateKey.fromBip39Entropy(
        Cometa.utf8ToUint8Array(vector.password),
        Cometa.hexToUint8Array(vector.bip39Entropy)
      );

      expect(bip32Key.toHex()).toEqual(vector.rootKey);
    }
  });

  it('can derive the correct child BIP-32 private key given a derivation path.', () => {
    expect.assertions(extendedVectors.length);

    for (const vector of extendedVectors) {
      const rootKey = Cometa.Bip32PrivateKey.fromHex(vector.rootKey);
      const childKey = rootKey.derive(vector.derivationPath);

      expect(childKey.toHex()).toEqual(vector.childPrivateKey);
    }
  });

  it('can compute the matching BIP-32 public key.', () => {
    expect.assertions(extendedVectors.length);

    for (const vector of extendedVectors) {
      const rootKey = Cometa.Bip32PrivateKey.fromHex(vector.rootKey);
      const publicKey = rootKey.getPublicKey();

      expect(publicKey.toHex()).toEqual(vector.publicKey);
    }
  });

  it('can compute the correct ED25519e raw private key.', () => {
    expect.assertions(extendedVectors.length);

    for (const vector of extendedVectors) {
      const rootKey = Cometa.Bip32PrivateKey.fromHex(vector.rootKey);
      const rawKey = rootKey.toEd25519Key();

      expect(rawKey.toHex()).toEqual(vector.ed25519eVector.secretKey);
    }
  });
});
