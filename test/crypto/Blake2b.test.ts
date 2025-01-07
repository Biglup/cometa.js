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

/* TESTS **********************************************************************/

const testVectors = [
  // 224-bit vectors
  {
    dataHex: '00',
    expectedHex: '0d94e174732ef9aae73f395ab44507bfa983d65023c11a951f0c32e4',
    hashSize: 28
  },
  {
    dataHex: '0001',
    expectedHex: '9430be1d5e37ea654ddb63370a3d04a8a0a171abb5c3710a9bc372f8',
    hashSize: 28
  },
  {
    dataHex: '000102',
    expectedHex: '495734948024c1ac1cc6dce8d3ab2aad5b8c4194203aaaa460af9437',
    hashSize: 28
  },
  {
    dataHex: '000102030405060708090a0b0c',
    expectedHex: '7b71eb4635c7fe17ef96c86ddd6230faa408657e79fb7451a47981ca',
    hashSize: 28
  },

  // 256-bit vectors
  {
    dataHex: '00',
    expectedHex: '03170a2e7597b7b7e3d84c05391d139a62b157e78786d8c082f29dcf4c111314',
    hashSize: 32
  },
  {
    dataHex: '0001',
    expectedHex: '01cf79da4945c370c68b265ef70641aaa65eaa8f5953e3900d97724c2c5aa095',
    hashSize: 32
  },
  {
    dataHex: '000102',
    expectedHex: '3d8c3d594928271f44aad7a04b177154806867bcf918e1549c0bc16f9da2b09b',
    hashSize: 32
  },
  {
    dataHex: '000102030405060708090a0b0c',
    expectedHex: '695e93b723e0a08e8dd8dd4656389363519564daf4cde5fe95a6a0ca71d3705e',
    hashSize: 32
  },

  // 512-bit vectors
  {
    dataHex: '00',
    expectedHex:
      '2fa3f686df876995167e7c2e5d74c4c7b6e48f8068fe0e44208344d480f7904c36963e44115fe3eb2a3ac8694c28bcb4f5a0f3276f2e79487d8219057a506e4b',
    hashSize: 64
  },
  {
    dataHex: '0001',
    expectedHex:
      '1c08798dc641aba9dee435e22519a4729a09b2bfe0ff00ef2dcd8ed6f8a07d15eaf4aee52bbf18ab5608a6190f70b90486c8a7d4873710b1115d3debbb4327b5',
    hashSize: 64
  },
  {
    dataHex: '000102',
    expectedHex:
      '40a374727302d9a4769c17b5f409ff32f58aa24ff122d7603e4fda1509e919d4107a52c57570a6d94e50967aea573b11f86f473f537565c66f7039830a85d186',
    hashSize: 64
  },
  {
    dataHex: '000102030405060708090a0b0c',
    expectedHex:
      'dea9101cac62b8f6a3c650f90eea5bfae2653a4eafd63a6d1f0f132db9e4f2b1b662432ec85b17bcac41e775637881f6aab38dd66dcbd080f0990a7a6e9854fe',
    hashSize: 64
  }
];

describe('Blake2b', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  for (const { dataHex, expectedHex, hashSize } of testVectors) {
    it(`computes Blake2b-${hashSize * 8} correctly for input: "${dataHex}"`, () => {
      const dataBytes = Cometa.hexToUint8Array(dataHex);

      const resultBytes = Cometa.Blake2b.computeHash(dataBytes, hashSize);

      const resultHex = Cometa.uint8ArrayToHex(resultBytes);

      expect(resultHex).toBe(expectedHex);
    });
  }
});
