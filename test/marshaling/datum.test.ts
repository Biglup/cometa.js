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
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/
describe('Datum', () => {
  const VALID_DATUM_HASH = 'f1993466150257c329b2e2f3b92f0945ac493721e7841981a78e7a60fb523f03';

  let detector: MemoryLeakDetector;

  beforeAll(async () => {
    await Cometa.ready();
  });

  beforeEach(() => {
    detector = new MemoryLeakDetector(Cometa.getModule());
    detector.start();
  });

  // Stop the detector and check for leaks after each test
  afterEach(() => {
    detector.stop();
    detector.detect();
  });

  describe('Datum (DataHash)', () => {
    it('should correctly write and read a Datum containing a DataHash', () => {
      // Arrange: The 'type' property is now correctly included.
      const datum = { datumHash: VALID_DATUM_HASH, type: Cometa.DatumType.DataHash };

      // Act
      const ptr = Cometa.writeDatum(datum);
      expect(ptr).not.toBe(0);

      // Assert
      const readValue = Cometa.readDatum(ptr);
      expect(readValue).toEqual(datum);

      // Cleanup
      Cometa.unrefObject(ptr);
    });
  });

  describe('Datum (InlineData)', () => {
    it('should correctly write and read a Datum containing InlineData', () => {
      const datum = { inlineDatum: 42n, type: Cometa.DatumType.InlineData };

      // Act
      const ptr = Cometa.writeDatum(datum);
      expect(ptr).not.toBe(0);

      // Assert
      const readValue = Cometa.readDatum(ptr);
      expect(readValue).toEqual(datum);

      // Cleanup
      Cometa.unrefObject(ptr);
    });
  });

  describe('Edge Cases', () => {
    it('writeDatum should return 0 for a datum object without data', () => {
      const datum = { type: Cometa.DatumType.DataHash };
      const ptr = Cometa.writeDatum(datum);
      expect(ptr).toBe(0);
    });

    it('readDatum should throw an error when reading from a null pointer', () => {
      expect(() => Cometa.readDatum(0)).toThrow();
    });

    it('writeDatum should throw an error for an invalid datum hash', () => {
      const datum = { datumHash: 'invalid-hex-string', type: Cometa.DatumType.DataHash };
      expect(() => Cometa.writeDatum(datum)).toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should properly dereference a Datum pointer', () => {
      const datum = { datumHash: VALID_DATUM_HASH, type: Cometa.DatumType.DataHash };
      const ptr = Cometa.writeDatum(datum);

      // Act & Assert
      expect(() => Cometa.unrefObject(ptr)).not.toThrow();
    });
  });
});
