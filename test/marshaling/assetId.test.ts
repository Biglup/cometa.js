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

import * as Cometa from '../../src';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('AssetId', () => {
  let detector: MemoryLeakDetector;
  const ASSET_ID_HEX = '7eae54038a9a466692e21a221b68448553258165274950a46940868854657374436f696e';

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

  describe('writeAssetId', () => {
    it('should create an AssetId from a valid hex string and be readable', () => {
      // Act
      const ptr = Cometa.writeAssetId(ASSET_ID_HEX);

      // Assert
      expect(ptr).not.toBe(0); // Ensure a valid pointer was returned

      const readValue = Cometa.readAssetId(ptr);
      expect(readValue).toEqual(ASSET_ID_HEX);

      // Cleanup
      Cometa.unrefObject(ptr);
    });

    it('should throw an error for an invalid hex string', () => {
      const invalidHex = 'this-is-not-valid-hex';
      // Act & Assert
      // The error message comes from the Rust/C++ code, forwarded by assertSuccess
      expect(() => Cometa.writeAssetId(invalidHex)).toThrow(`Failed to create asset_id from hex: ${invalidHex}`);
    });

    it('should throw an error for a hex string of incorrect length', () => {
      const shortHex = '123456';
      // Act & Assert
      expect(() => Cometa.writeAssetId(shortHex)).toThrow(`Failed to create asset_id from hex: ${shortHex}`);
    });
  });

  describe('unrefObject (for AssetId)', () => {
    it('should dereference a valid AssetId pointer without error', () => {
      const ptr = Cometa.writeAssetId(ASSET_ID_HEX);

      // Act & Assert
      expect(() => Cometa.unrefObject(ptr)).not.toThrow();
    });
  });
});
