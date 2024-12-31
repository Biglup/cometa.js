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
  {
    binary: new Uint8Array([
      0x82, 0xd8, 0x18, 0x58, 0x21, 0x83, 0x58, 0x1c, 0xba, 0x97, 0x0a, 0xd3, 0x66, 0x54, 0xd8, 0xdd, 0x8f, 0x74, 0x27,
      0x4b, 0x73, 0x34, 0x52, 0xdd, 0xea, 0xb9, 0xa6, 0x2a, 0x39, 0x77, 0x46, 0xbe, 0x3c, 0x42, 0xcc, 0xdd, 0xa0, 0x00,
      0x1a, 0x90, 0x26, 0xda, 0x5b
    ]),
    encoded: 'Ae2tdPwUPEZFRbyhz3cpfC2CumGzNkFBN2L42rcUc2yjQpEkxDbkPodpMAi',
    hex: '82d818582183581cba970ad36654d8dd8f74274b733452ddeab9a62a397746be3c42ccdda0001a9026da5b',
    name: 'Byron Mainnet Yoroi'
  },
  {
    binary: new Uint8Array([
      0x82, 0xd8, 0x18, 0x58, 0x49, 0x83, 0x58, 0x1c, 0x9c, 0x70, 0x85, 0x38, 0xa7, 0x63, 0xff, 0x27, 0x16, 0x99, 0x87,
      0xa4, 0x89, 0xe3, 0x50, 0x57, 0xef, 0x3c, 0xd3, 0x77, 0x8c, 0x05, 0xe9, 0x6f, 0x7b, 0xa9, 0x45, 0x0e, 0xa2, 0x01,
      0x58, 0x1e, 0x58, 0x1c, 0x9c, 0x17, 0x22, 0xf7, 0xe4, 0x46, 0x68, 0x92, 0x56, 0xe1, 0xa3, 0x02, 0x60, 0xf3, 0x51,
      0x0d, 0x55, 0x8d, 0x99, 0xd0, 0xc3, 0x91, 0xf2, 0xba, 0x89, 0xcb, 0x69, 0x77, 0x02, 0x45, 0x1a, 0x41, 0x70, 0xcb,
      0x17, 0x00, 0x1a, 0x69, 0x79, 0x12, 0x6c
    ]),
    encoded:
      '37btjrVyb4KEB2STADSsj3MYSAdj52X5FrFWpw2r7Wmj2GDzXjFRsHWuZqrw7zSkwopv8Ci3VWeg6bisU9dgJxW5hb2MZYeduNKbQJrqz3zVBsu9nT',
    hex: '82d818584983581c9c708538a763ff27169987a489e35057ef3cd3778c05e96f7ba9450ea201581e581c9c1722f7e446689256e1a30260f3510d558d99d0c391f2ba89cb697702451a4170cb17001a6979126c',
    name: 'Byron Testnet Daedalus'
  },
  {
    binary: new Uint8Array([
      0xff, 0x5a, 0x1f, 0xc5, 0xdd, 0x9e, 0x6f, 0x03, 0x81, 0x9f, 0xca, 0x94, 0xa2, 0xd8, 0x96, 0x69, 0x46, 0x96, 0x67,
      0xf9, 0xa0, 0xc0, 0xd6, 0x8d, 0xec
    ]),
    encoded: '2mkQLxaN3Y4CwN5E9rdMWNgsXX7VS6UnfeT',
    hex: 'ff5a1fc5dd9e6f03819fca94a2d89669469667f9a0c0d68dec',
    name: 'High Base58 Value'
  },
  {
    binary: new Uint8Array([
      0x00, 0x5a, 0x1f, 0xc5, 0xdd, 0x9e, 0x6f, 0x03, 0x81, 0x9f, 0xca, 0x94, 0xa2, 0xd8, 0x96, 0x69, 0x46, 0x96, 0x67,
      0xf9, 0xa0, 0x74, 0x65, 0x59, 0x46
    ]),
    encoded: '19DXstMaV43WpYg4ceREiiTv2UntmoiA9j',
    hex: '005a1fc5dd9e6f03819fca94a2d89669469667f9a074655946',
    name: 'Leading Zero'
  }
];

describe('Base58', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  for (const { name, encoded, binary, hex } of testVectors) {
    test(`encodes binary correctly: ${name}`, () => {
      const result = Cometa.Base58.encode(binary);
      expect(result).toBe(encoded);
    });

    test(`decodes binary correctly: ${name}`, () => {
      const result = Cometa.Base58.decode(encoded);
      expect(result).toEqual(binary);
    });

    test(`encodes hex correctly: ${name}`, () => {
      const result = Cometa.Base58.encodeFromHex(hex);
      expect(result).toBe(encoded);
    });

    test(`decodes hex correctly: ${name}`, () => {
      const result = Cometa.Base58.decodeFromHex(encoded);
      expect(result).toBe(hex);
    });
  }
});
