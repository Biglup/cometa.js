/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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

describe('Anchor', () => {
  const VALID_URL = 'https://example.com/metadata.json';
  const VALID_DATA_HASH = 'f1993466150257c329b2e2f3b92f0945ac493721e7841981a78e7a60fb523f03';
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

  describe('writeAnchor & readAnchor', () => {
    it('should correctly write and read a valid Anchor object', () => {
      // Arrange
      const anchor: Cometa.Anchor = {
        dataHash: VALID_DATA_HASH,
        url: VALID_URL
      };

      // Act
      const ptr = Cometa.writeAnchor(anchor);
      expect(ptr).not.toBe(0);

      // Assert
      const readValue = Cometa.readAnchor(ptr);
      expect(readValue).toEqual(anchor);

      // Cleanup
      Cometa.unrefObject(ptr);
    });
  });

  describe('Edge Cases', () => {
    it('readAnchor should throw an error when reading from a null pointer', () => {
      expect(() => Cometa.readAnchor(0)).toThrow('Pointer is null');
    });

    it('writeAnchor should throw an error for an invalid data hash', () => {
      // Arrange
      const invalidAnchor: Cometa.Anchor = {
        dataHash: 'this-is-not-a-valid-hex-hash',
        url: VALID_URL
      };

      // Act & Assert
      expect(() => Cometa.writeAnchor(invalidAnchor)).toThrow();
    });
  });

  describe('Memory Management', () => {
    it('should properly dereference an Anchor pointer', () => {
      // Arrange
      const anchor: Cometa.Anchor = {
        dataHash: VALID_DATA_HASH,
        url: VALID_URL
      };
      const ptr = Cometa.writeAnchor(anchor);

      // Act & Assert
      expect(() => Cometa.unrefObject(ptr)).not.toThrow();
    });
  });
});
