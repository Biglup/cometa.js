/**
 * Copyright 2025 Biglup Labs.
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

/* TESTS **********************************************************************/

/**
 * A wrapper around JSON.stringify that handles BigInt values.
 *
 * @param {any} value The value to convert to a JSON string.
 * @returns {string} A JSON string representing the value.
 */
export const stringifyWithBigIntsAndBytes = (value: any): string => {
  const replacer = (_key: string, val: any) => {
    // If the value is a BigInt, convert it to a string
    if (typeof val === 'bigint') {
      return val.toString();
    }
    // If the value is a Uint8Array, convert it to a hex string
    if (val instanceof Uint8Array) {
      return Buffer.from(val).toString('hex');
    }
    // Otherwise, return the value unchanged
    return val;
  };

  return JSON.stringify(value, replacer, 2);
};

describe('BlockfrostProvider', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('should create an instance', async () => {
    const provider = new Cometa.BlockfrostProvider({
      network: Cometa.NetworkMagic.PREPROD,
      projectId: 'preprodeMB9jfka6qXsluxEhPLhKczRdaC5QKab'
    });

    // 77c33469c6f21be375880f294da85fec13df50821f6c6591eab9eff723e68e66
    const provi = Cometa.Provider.fromPtr(provider.providerPtr);
    const txId = await provi.submitTransaction(
      '84a400d901028182582019fe2a8817d1860cbbd714df6fce2f163b3a249f9592517bd08a4ee80eb73a58010182a300581d70d1f8737aebb2c1da4255e4d28cf0bd5c109b15a55755f63bebaaa856011a001e8480028201d81843d87980a200583900dc435fc2638f6684bd1f9f6f917d80c92ae642a4a33a412e516479e64245236ab8056760efceebbff57e8cab220182be3e36439e520a645401821b000000021c55199aa2581cd1f8737aebb2c1da4255e4d28cf0bd5c109b15a55755f63bebaaa856a154506c75747573426572727952617370626572727901581ceb7e6282971727598462d39d7627bfa6fbbbf56496cb91b76840affba14e426572727952617370626572727901021a0002a14d031a05eb4c7da100d901028182582007473467683e6a30a13d471a68641f311a14e2b37a38ea592e5d6efc2b446bce5840e9b4d1e37743b967f483db51f4e7f150c097a26f1cd2fcd25d13a28ef81a6242b1ac5567315e28e0baf5432aef5ee258de4becb5f0075b990c58a1fba52be30bf5f6'
    );

    console.log('txId:', txId);
    const confirmed = await provi.confirmTransaction(txId);
    console.log('confirmed:', confirmed);
    expect(confirmed).toBe(true);
  });
});
