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

describe('Credential', () => {
  const VALID_CREDENTIAL = {
    hash: '80b6212a51c97a51c45209f303276335ce5084931f6b5522ff0e68d0',
    type: 0
  };

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

  describe('writeCredential and readCredential', () => {
    it('should correctly write and read back a valid credential', () => {
      const ptr = Cometa.writeCredential(VALID_CREDENTIAL);
      expect(ptr).not.toBe(0);

      const readValue = Cometa.readCredential(ptr);
      expect(readValue).toEqual(VALID_CREDENTIAL);
      Cometa.unrefObject(ptr);
    });
  });

  describe('writeCredential', () => {
    it('should throw an error for a hash with invalid hex characters', () => {
      const invalidCred = { ...VALID_CREDENTIAL, hash: 'this-is-not-valid-hex-and-is-the-wrong-length' };

      expect(() => Cometa.writeCredential(invalidCred)).toThrow();
    });

    it('should throw an error for a hash of an invalid byte length', () => {
      const invalidCred = { ...VALID_CREDENTIAL, hash: '1234567890' };

      expect(() => Cometa.writeCredential(invalidCred)).toThrow('Failed to create credential from hash bytes.');
    });
  });

  describe('unrefObject (for Credential)', () => {
    it('should dereference a valid credential pointer without error', () => {
      const ptr = Cometa.writeCredential(VALID_CREDENTIAL);

      expect(() => Cometa.unrefObject(ptr)).not.toThrow();
    });
  });
});
