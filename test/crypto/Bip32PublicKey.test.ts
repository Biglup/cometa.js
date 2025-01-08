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
import {
  bip32TestVectorMessageOneLength,
  bip32TestVectorMessageShaOfAbcUnhardened,
  extendedVectors
} from './Ed25519TestVectors';

/* TESTS **********************************************************************/

describe('Bip32PublicKey', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('can create an instance from a valid normal BIP-32 public key hex representation', () => {
    const publicKey = Cometa.Bip32PublicKey.fromHex(bip32TestVectorMessageOneLength.publicKey);
    expect(publicKey.toHex()).toEqual(bip32TestVectorMessageOneLength.publicKey);
  });

  it('can create an instance from a valid normal BIP-32 public key raw binary representation', () => {
    const bytes = Cometa.hexToUint8Array(bip32TestVectorMessageOneLength.publicKey);
    const publicKey = Cometa.Bip32PublicKey.fromBytes(bytes);

    expect(publicKey.toBytes()).toEqual(bytes);
  });

  it('throws if a BIP-32 public key of invalid size is given.', () => {
    expect(() => Cometa.Bip32PublicKey.fromHex('1f')).toThrow(Error);
    expect(() => Cometa.Bip32PublicKey.fromHex(`${bip32TestVectorMessageOneLength.publicKey}1f2f3f`)).toThrow(Error);
  });

  it('can derive the correct child BIP-32 public key given a derivation path.', () => {
    const rootKey = Cometa.Bip32PublicKey.fromHex(bip32TestVectorMessageShaOfAbcUnhardened.publicKey);
    const childKey = rootKey.derive(bip32TestVectorMessageShaOfAbcUnhardened.derivationPath);

    expect(childKey.toHex()).toEqual(bip32TestVectorMessageShaOfAbcUnhardened.childPublicKey);
  });

  it('can compute the correct ED25519e raw public key.', () => {
    expect.assertions(extendedVectors.length);

    for (const vector of extendedVectors) {
      const rootKey = Cometa.Bip32PublicKey.fromHex(vector.publicKey);
      const rawKey = rootKey.toEd25519Key();

      expect(rawKey.toHex()).toEqual(vector.ed25519eVector.publicKey);
    }
  });

  it('can compute Blake2b hash of a bip32 public key', () => {
    const publicKey = Cometa.Bip32PublicKey.fromHex(extendedVectors[0].publicKey);
    const hash = publicKey.toHashHex();
    expect(typeof hash).toEqual('string');
  });
});
