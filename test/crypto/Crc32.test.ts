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
    crc32: 0,
    message: ''
  },
  {
    crc32: 0x414fa339,
    message: 'The quick brown fox jumps over the lazy dog'
  },
  {
    crc32: 0x9bd366ae,
    message: 'various CRC algorithms input data'
  },
  {
    crc32: 0x0c877f61,
    message: 'Test vector from febooti.com'
  }
];

describe('Crc32', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  for (const { message, crc32 } of testVectors) {
    test(`computes correctly from string: ${message}`, () => {
      const result = Cometa.Crc32.computeFromUtf8(message);
      expect(result).toBe(crc32);
    });

    test(`computes correctly from bytes: ${message}`, () => {
      const result = Cometa.Crc32.compute(Cometa.utf8ToUint8Array(message));
      expect(result).toBe(crc32);
    });

    test(`computes correctly from hex: ${message}`, () => {
      const result = Cometa.Crc32.computeFromHex(Cometa.uint8ArrayToHex(Cometa.utf8ToUint8Array(message)));
      expect(result).toBe(crc32);
    });
  }
});
