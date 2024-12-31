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

import * as Cometa from '../dist/cjs';

/* TESTS **********************************************************************/

describe('Cometa', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  it('getLibCardanoCVersion', () => {
    expect(Cometa.getLibCardanoCVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  describe('hexToUint8Array', () => {
    test('converts a valid hex string to Uint8Array', () => {
      const hexString = 'deadbeef';
      const expected = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      expect(Cometa.hexToUint8Array(hexString)).toEqual(expected);
    });

    test('throws an error for hex strings with an odd length', () => {
      const hexString = 'deadbee';
      expect(() => Cometa.hexToUint8Array(hexString)).toThrowError(
        'Invalid hex string: length must be even.'
      );
    });

    test('throws an error for hex strings with invalid characters', () => {
      const hexString = 'deadbgee';
      expect(() => Cometa.hexToUint8Array(hexString)).toThrowError(
        'Invalid hex string: contains non-hexadecimal characters.'
      );
    });

    test('converts an empty hex string to an empty Uint8Array', () => {
      const hexString = '';
      const expected = new Uint8Array([]);
      expect(Cometa.hexToUint8Array(hexString)).toEqual(expected);
    });
  });

  describe('uint8ArrayToHex', () => {
    test('converts a Uint8Array to a valid hex string', () => {
      const byteArray = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const expected = 'deadbeef';
      expect(Cometa.uint8ArrayToHex(byteArray)).toBe(expected);
    });

    test('handles an empty Uint8Array correctly', () => {
      const byteArray = new Uint8Array([]);
      const expected = '';
      expect(Cometa.uint8ArrayToHex(byteArray)).toBe(expected);
    });

    test('converts a Uint8Array with single byte correctly', () => {
      const byteArray = new Uint8Array([0x0f]);
      const expected = '0f';
      expect(Cometa.uint8ArrayToHex(byteArray)).toBe(expected);
    });

    test('pads single-digit hex values correctly', () => {
      const byteArray = new Uint8Array([0x0a, 0x01]);
      const expected = '0a01';
      expect(Cometa.uint8ArrayToHex(byteArray)).toBe(expected);
    });
  });
});
