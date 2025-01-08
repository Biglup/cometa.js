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
import { testVectorMessageZeroLength } from './Ed25519TestVectors';

/* TESTS **********************************************************************/

describe('Ed25519Signature', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('can create an instance from a valid Ed25519 signature hex representation', () => {
    const signature = Cometa.Ed25519Signature.fromHex(testVectorMessageZeroLength.signature);
    expect(signature.toHex()).toEqual(testVectorMessageZeroLength.signature);
  });

  test('can create an instance from a valid Ed25519 signature raw binary representation', () => {
    const sigBytes = Cometa.hexToUint8Array(testVectorMessageZeroLength.signature);
    const signature = Cometa.Ed25519Signature.fromBytes(sigBytes);
    expect(signature.toBytes()).toEqual(sigBytes);
  });

  test('throws if a signature of invalid size is given.', () => {
    expect(() => Cometa.Ed25519Signature.fromHex('1f')).toThrow(Error);
    expect(() => Cometa.Ed25519Signature.fromHex(`${testVectorMessageZeroLength.signature}1f2f3f`)).toThrow(Error);
  });
});
