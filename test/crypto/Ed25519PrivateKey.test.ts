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
  extendedVectors,
  testVectorMessageZeroLength,
  vectors
} from './Ed25519TestVectors';

/* TESTS **********************************************************************/

describe('Ed25519PrivateKey', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('can create an instance from a valid normal Ed25519 private key hex representation', () => {
    const privateKey = Cometa.Ed25519PrivateKey.fromNormalHex(testVectorMessageZeroLength.secretKey);

    expect(privateKey.toHex()).toEqual(testVectorMessageZeroLength.secretKey);
  });

  it('can create an instance from a valid extended Ed25519 private key hex representation', () => {
    const privateKey = Cometa.Ed25519PrivateKey.fromExtendedHex(
      bip32TestVectorMessageOneLength.ed25519eVector.secretKey
    );

    expect(privateKey.toHex()).toEqual(bip32TestVectorMessageOneLength.ed25519eVector.secretKey);
  });

  it('can create an instance from a valid normal Ed25519 private key raw binary representation', () => {
    const bytes = Cometa.hexToUint8Array(testVectorMessageZeroLength.secretKey);
    const privateKey = Cometa.Ed25519PrivateKey.fromNormalBytes(bytes);

    expect(privateKey.toBytes()).toEqual(bytes);
  });

  it('can create an instance from a valid extended Ed25519 private key raw binary representation', () => {
    const bytes = Cometa.hexToUint8Array(bip32TestVectorMessageOneLength.ed25519eVector.secretKey);
    const privateKey = Cometa.Ed25519PrivateKey.fromExtendedBytes(bytes);

    expect(privateKey.toBytes()).toEqual(bytes);
  });

  it('throws if a Ed25519 private key of invalid size is given.', () => {
    expect(() => Cometa.Ed25519PrivateKey.fromNormalHex('1f')).toThrow(Error);
    expect(() => Cometa.Ed25519PrivateKey.fromExtendedHex('1f')).toThrow(Error);
    expect(() => Cometa.Ed25519PrivateKey.fromNormalHex(`${testVectorMessageZeroLength.secretKey}1f2f3f`)).toThrow(
      Error
    );
    expect(() => Cometa.Ed25519PrivateKey.fromExtendedHex(`${testVectorMessageZeroLength.secretKey}1f2f3f`)).toThrow(
      Error
    );
  });

  it('can compute the public key from a non extended Ed25519 private key.', () => {
    expect.assertions(vectors.length);

    for (const vector of vectors) {
      const privateKey = Cometa.Ed25519PrivateKey.fromNormalHex(vector.secretKey);
      const publicKey = privateKey.getPublicKey();

      expect(publicKey.toHex()).toEqual(vector.publicKey);
    }
  });

  it('can compute the public key from an extended Ed25519 private key.', () => {
    expect.assertions(extendedVectors.length);

    for (const vector of extendedVectors) {
      const privateKey = Cometa.Ed25519PrivateKey.fromExtendedHex(vector.ed25519eVector.secretKey);
      const publicKey = privateKey.getPublicKey();

      expect(publicKey.toHex()).toEqual(vector.ed25519eVector.publicKey);
    }
  });

  it('can compute the correct signature of a message with a non extended Ed25519 private key.', () => {
    expect.assertions(vectors.length * 2);

    for (const vector of vectors) {
      const privateKey = Cometa.Ed25519PrivateKey.fromNormalHex(vector.secretKey);
      const publicKey = Cometa.Ed25519PublicKey.fromHex(vector.publicKey);
      const message = Cometa.hexToUint8Array(vector.message);
      const signature = privateKey.sign(message);

      const isSignatureValid = publicKey.verify(signature, message);
      expect(signature.toHex()).toEqual(vector.signature);
      expect(isSignatureValid).toBeTruthy();
    }
  });

  it('can compute the correct signature of a message with an extended Ed25519 private key.', () => {
    expect.assertions(extendedVectors.length * 2);

    for (const extendedVector of extendedVectors) {
      const vector = extendedVector.ed25519eVector;
      const privateKey = Cometa.Ed25519PrivateKey.fromExtendedHex(vector.secretKey);
      const publicKey = Cometa.Ed25519PublicKey.fromHex(vector.publicKey);
      const message = Cometa.hexToUint8Array(vector.message);
      const signature = privateKey.sign(message);

      const isSignatureValid = publicKey.verify(signature, message);
      expect(signature.toHex()).toEqual(vector.signature);
      expect(isSignatureValid).toBeTruthy();
    }
  });
});
