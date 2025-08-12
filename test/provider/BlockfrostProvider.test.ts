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
    const params = await provi.evaluateTransaction(
      '84a900d901028282582019fe2a8817d1860cbbd714df6fce2f163b3a249f9592517bd08a4ee80eb73a580082582019fe2a8817d1860cbbd714df6fce2f163b3a249f9592517bd08a4ee80eb73a58010182a200583900dc435fc2638f6684bd1f9f6f917d80c92ae642a4a33a412e516479e64245236ab8056760efceebbff57e8cab220182be3e36439e520a6454011a000f4240a200583900dc435fc2638f6684bd1f9f6f917d80c92ae642a4a33a412e516479e64245236ab8056760efceebbff57e8cab220182be3e36439e520a645401821b000000021c812110a2581cd1f8737aebb2c1da4255e4d28cf0bd5c109b15a55755f63bebaaa856a154506c75747573426572727952617370626572727901581ceb7e6282971727598462d39d7627bfa6fbbbf56496cb91b76840affba14e426572727952617370626572727901021a00046097031a05eb3f830b582000000000000000000000000000000000000000000000000000000000000000000dd901028182582019fe2a8817d1860cbbd714df6fce2f163b3a249f9592517bd08a4ee80eb73a580110a200583900dc435fc2638f6684bd1f9f6f917d80c92ae642a4a33a412e516479e64245236ab8056760efceebbff57e8cab220182be3e36439e520a645401821b000000021c6fae84a2581cd1f8737aebb2c1da4255e4d28cf0bd5c109b15a55755f63bebaaa856a154506c75747573426572727952617370626572727901581ceb7e6282971727598462d39d7627bfa6fbbbf56496cb91b76840affba14e426572727952617370626572727901111a000690e312d901028182582077c33469c6f21be375880f294da85fec13df50821f6c6591eab9eff723e68e6600a105a182000082d87980821a0008e8821a08c07b1bf5f6'
    , []);

    console.log('Resolved UTxOs:', params);
    expect(stringifyWithBigIntsAndBytes(Cometa.readRedeemerList(params))).toEqual('');
  });
});
