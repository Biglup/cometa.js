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

const emip3TestVectors = [
  {
    encrypted:
      '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000009ce1d7784a05efd109ad89c29fea0775bf085ac03988089b3a93',
    hex_data: '00010203040506070809',
    password: 'password'
  },
  {
    encrypted:
      '0430bb0e1941fd9ec98909e766447883b4af77242a81c7ef2ba8d339f0deeae383227e257c0d6f28ad372a1bc9b87a30e3544258b21a2b576746f5fb83746c7a8e1fa37e2ca3',
    hex_data: '00010203040506070809',
    password: null
  },
  {
    encrypted:
      '8daaa90b5e998ac815d0ad9675c5bf328fcf48d12a49aabf01f99d1fc8e4512da687709825ae705bfdbdc7d8b0c662add2bccadbadb9a519d03f9205484f8ba0d66f3d66cd2864c26e8d563fd01a23a066c42b7a94db41e71d70171722012119bc90c51c9ca3a2f1d5041474a544',
    hex_data: '0001020304050607080900010203040506070809000102030405060708090001020304050607080900010203040506070809',
    password: 'password'
  },
  {
    encrypted:
      'ae02db6264aeb86d3dfb8fa33af204ac8189b116d38b7e701c37922034b359c1beaa734fc7fa80d4ab9271e3082aa69bd7e0b355315c986eb740369264',
    hex_data: '00',
    password: 'password2222'
  },
  {
    encrypted:
      'a8de4eedfe023ee4e00986099c293d6e61ddbb3fbe3c449085820fc42316c52af99236a7387280198214149d6342506bf0e36c3c9244f9af6e3e6ba62821dd984c13e49b7513d96abe529fa1375511c9baab72cc13ed20e4b19cbe09b5e13245da1a9552ff2e35c90e815973c0a77dc401cbef86850cb16cb50b2bda4c7f00c687fcc7409c8f0f08f8af2e66115da8c992daebd42ae3faa563bcc53bb9d1a9b4a96b',
    hex_data:
      'a5010102583900d73b4d5548f4d00a1947e9284ccdcdc565dd4b85b36e88533c54ed9bfa2e192363674c755f5efe81c620f18bddf8cf63f181d1366fffef34032720062158203fe822fca223192577130a288b766fcac5b2b8972d89fc229bbc00af60aeaf67',
    password: 'password'
  }
];

describe('emip003', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  for (const { hex_data, password, encrypted } of emip3TestVectors) {
    test(`Encrypts correctly for data: "${hex_data}" and password: "${password || '(none)'}"`, () => {
      const data = Cometa.hexToUint8Array(hex_data);
      const passphrase = password ? new TextEncoder().encode(password) : new Uint8Array();
      const result = Cometa.Emip003.encrypt(data, passphrase);
      const decrypted = Cometa.Emip003.decrypt(result, passphrase);

      expect(hex_data).toEqual(Cometa.uint8ArrayToHex(decrypted));
    });

    test(`Decrypts correctly for data: "${encrypted}" and password: "${password || '(none)'}"`, () => {
      const encryptedData = Cometa.hexToUint8Array(encrypted);
      const passphrase = password ? new TextEncoder().encode(password) : new Uint8Array();
      const result = Cometa.Emip003.decrypt(encryptedData, passphrase);

      expect(result).toEqual(Cometa.hexToUint8Array(hex_data));
    });
  }
});
