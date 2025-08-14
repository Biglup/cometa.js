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

/* IMPORTS *******************************************************************/

import * as Cometa from '../../src';

/* TESTS *********************************************************************/

describe('64-bit Integer Utilities', () => {
  describe('splitToLowHigh64bit', () => {
    it('should split zero correctly', () => {
      expect(Cometa.splitToLowHigh64bit(0n)).toEqual({ high: 0, low: 0 });
    });

    it('should split a small positive number', () => {
      expect(Cometa.splitToLowHigh64bit(12345n)).toEqual({ high: 0, low: 12345 });
    });

    it('should split the max 32-bit unsigned integer', () => {
      const value = 0xffffffffn;
      expect(Cometa.splitToLowHigh64bit(value)).toEqual({ high: 0, low: 4294967295 });
    });

    it('should split a number just over the 32-bit boundary', () => {
      const value = 0x100000000n; // 2**32
      expect(Cometa.splitToLowHigh64bit(value)).toEqual({ high: 1, low: 0 });
    });

    it('should split the max signed 64-bit integer', () => {
      const { high, low } = Cometa.splitToLowHigh64bit(Cometa.MAX_SIGNED_64BIT);
      const reconstructed = (BigInt(high) << 32n) | BigInt(low);
      expect(reconstructed).toBe(Cometa.MAX_SIGNED_64BIT);
    });

    it('should split the max unsigned 64-bit integer', () => {
      const { high, low } = Cometa.splitToLowHigh64bit(Cometa.MAX_UNSIGNED_64BIT);
      const reconstructed = (BigInt(high) << 32n) | (BigInt(low) & 0xffffffffn);
      expect(reconstructed).toBe(Cometa.MAX_UNSIGNED_64BIT);
    });

    it("should split -1 correctly (two's complement)", () => {
      expect(Cometa.splitToLowHigh64bit(-1n)).toEqual({ high: -1, low: 4294967295 });
    });

    it('should split the min signed 64-bit integer', () => {
      const { high, low } = Cometa.splitToLowHigh64bit(Cometa.MIN_SIGNED_64BIT);
      const reconstructed = (BigInt(high) << 32n) | BigInt(low);
      expect(reconstructed).toBe(Cometa.MIN_SIGNED_64BIT);
    });

    it('should throw a RangeError for values greater than the max unsigned 64-bit', () => {
      const value = Cometa.MAX_UNSIGNED_64BIT + 1n;
      expect(() => Cometa.splitToLowHigh64bit(value)).toThrow(RangeError);
    });

    it('should throw a RangeError for values less than the min signed 64-bit', () => {
      const value = Cometa.MIN_SIGNED_64BIT - 1n;
      expect(() => Cometa.splitToLowHigh64bit(value)).toThrow(RangeError);
    });
  });

  describe('writeI64 / readI64', () => {
    let bufferPtr: number;

    beforeAll(async () => {
      await Cometa.ready();
    });

    beforeEach(() => {
      bufferPtr = Cometa.getModule()._malloc(8);
    });

    afterEach(() => {
      Cometa.getModule()._free(bufferPtr);
    });

    describe('Signed Integers', () => {
      const testCases: (number | bigint)[] = [
        0,
        1,
        -1,
        1234567,
        -1234567,
        Cometa.MAX_SIGNED_64BIT,
        Cometa.MIN_SIGNED_64BIT
      ];

      for (const value of testCases) {
        // eslint-disable-next-line no-loop-func
        it(`should correctly write and read the signed value: ${value}`, () => {
          const bigIntValue = BigInt(value);
          Cometa.writeI64(bufferPtr, bigIntValue, true);
          const readValue = Cometa.readI64(bufferPtr, true);
          expect(readValue).toBe(bigIntValue);
        });
      }
    });

    describe('Unsigned Integers', () => {
      const testCases: (number | bigint)[] = [0, 1, 1234567, Cometa.MAX_SIGNED_64BIT, Cometa.MAX_UNSIGNED_64BIT];

      for (const value of testCases) {
        // eslint-disable-next-line no-loop-func
        it(`should correctly write and read the unsigned value: ${value}`, () => {
          const bigIntValue = BigInt(value);
          Cometa.writeI64(bufferPtr, bigIntValue);
          const readValue = Cometa.readI64(bufferPtr, false);
          expect(readValue).toBe(bigIntValue);
        });
      }

      it('should correctly interpret a signed -1 as the max unsigned value', () => {
        Cometa.writeI64(bufferPtr, -1n, true);
        const readValue = Cometa.readI64(bufferPtr, false);
        expect(readValue).toBe(Cometa.MAX_UNSIGNED_64BIT);
      });
    });
  });
});
