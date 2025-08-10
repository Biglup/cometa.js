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
const stringifyWithBigIntsAndBytes = (value: any): string => {
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
    const params = await provi.resolveUnspentOutputs([
      {
        index: 0,
        txId: '77c33469c6f21be375880f294da85fec13df50821f6c6591eab9eff723e68e66'
      }
    ]);

    console.log('Resolved UTxOs:', params);
    expect(stringifyWithBigIntsAndBytes(Cometa.readUtxoList(params))).toEqual('');
  });
});
