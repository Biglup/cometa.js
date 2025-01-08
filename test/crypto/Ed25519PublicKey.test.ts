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
import { InvalidSignature, testVectorMessageZeroLength, vectors } from './Ed25519TestVectors';

/* TESTS **********************************************************************/

describe('Ed25519PublicKey', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('can create an instance from a valid Ed25519 public key hex representation', () => {
    const publicKey = Cometa.Ed25519PublicKey.fromHex(testVectorMessageZeroLength.publicKey);

    expect(publicKey.toHex()).toEqual(testVectorMessageZeroLength.publicKey);
  });

  it('can create an instance from a valid Ed25519 public key raw binary representation', () => {
    const sigBytes = Cometa.hexToUint8Array(testVectorMessageZeroLength.publicKey);
    const publicKey = Cometa.Ed25519PublicKey.fromBytes(sigBytes);

    expect(publicKey.toBytes()).toEqual(sigBytes);
  });

  it('throws if a Ed25519 public key of invalid size is given.', () => {
    expect(() => Cometa.Ed25519PublicKey.fromHex('1f')).toThrow(Error);
    expect(() => Cometa.Ed25519PublicKey.fromHex(`${testVectorMessageZeroLength.publicKey}1f2f3f`)).toThrow(Error);
  });

  it('can compute the right Blake2b hash of an Ed25519 public key', async () => {
    expect.assertions(vectors.length);

    for (const vector of vectors) {
      const publicKey = Cometa.Ed25519PublicKey.fromHex(vector.publicKey);
      const hash = publicKey.toHashHex();

      expect(hash).toEqual(vector.publicKeyHash);
    }
  });

  it('can verify a Ed25519 digital signature given the right public key and original message', async () => {
    expect.assertions(vectors.length);

    for (const vector of vectors) {
      const publicKey = Cometa.Ed25519PublicKey.fromHex(vector.publicKey);
      const signature = Cometa.Ed25519Signature.fromHex(vector.signature);
      const message = Cometa.hexToUint8Array(vector.message);

      const isValid = publicKey.verify(signature, message);

      expect(isValid).toBeTruthy();
    }
  });

  it('can not verify a Ed25519 digital invalid signature given a public key and a message', async () => {
    const publicKey = Cometa.Ed25519PublicKey.fromHex(testVectorMessageZeroLength.publicKey);
    const signature = Cometa.Ed25519Signature.fromHex(InvalidSignature);
    const message = new TextEncoder().encode(testVectorMessageZeroLength.message);

    const isValid = publicKey.verify(signature, message);

    expect(isValid).toBeFalsy();
  });
});
