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

/* IMPORTS *******************************************************************/

import * as Cometa from '../../dist/cjs';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('Blake2bHash', () => {
  const VALID_HASH_HEX = 'e1b8b580951c6c97ac1b62e4c2787de794611ce5179261a2f447228801d93963';
  const VALID_HASH_BYTES = Cometa.hexToUint8Array(VALID_HASH_HEX);

  let detector: MemoryLeakDetector;

  beforeAll(async () => {
    await Cometa.ready();
  });

  beforeEach(() => {
    detector = new MemoryLeakDetector(Cometa.getModule());
    detector.start();
  });

  afterEach(() => {
    detector.stop();
    detector.detect();
  });

  describe('blake2bHashFromBytes', () => {
    it('should create a hash from valid bytes and be readable', () => {
      // Act
      const ptr = Cometa.blake2bHashFromBytes(VALID_HASH_BYTES);
      expect(ptr).not.toBe(0);

      const readData = Cometa.readBlake2bHashData(ptr);
      expect(readData).toEqual(VALID_HASH_BYTES);
    });
  });

  describe('blake2bHashFromHex', () => {
    it('should create a hash from a valid hex string', () => {
      const ptr = Cometa.blake2bHashFromHex(VALID_HASH_HEX);
      expect(ptr).not.toBe(0);

      const readData = Cometa.readBlake2bHashData(ptr);
      expect(readData).toEqual(VALID_HASH_BYTES);
    });

    it('should throw an error for a non-hex string', () => {
      const invalidHex = 'this is not hex';

      expect(() => Cometa.blake2bHashFromHex(invalidHex)).toThrow();
    });
  });

  describe('readBlake2bHashData', () => {
    it('should read data and free the object by default', () => {
      const ptr = Cometa.blake2bHashFromBytes(VALID_HASH_BYTES);

      const readData = Cometa.readBlake2bHashData(ptr, true); // Explicitly true

      expect(readData).toEqual(VALID_HASH_BYTES);
    });

    it('should read data without freeing the object when specified', () => {
      // Arrange
      const ptr = Cometa.blake2bHashFromBytes(VALID_HASH_BYTES);

      // Act
      const readData = Cometa.readBlake2bHashData(ptr, false);

      // Assert
      expect(readData).toEqual(VALID_HASH_BYTES);

      const secondReadData = Cometa.readBlake2bHashData(ptr, false);
      expect(secondReadData).toEqual(VALID_HASH_BYTES);

      Cometa.unrefObject(ptr);
    });
  });
});
