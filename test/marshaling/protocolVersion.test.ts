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

describe('ProtocolVersion', () => {
  let detector: MemoryLeakDetector;

  beforeEach(() => {
    detector = new MemoryLeakDetector(Cometa.getModule());
    detector.start();
  });

  afterEach(() => {
    detector.stop();
    detector.detect();
  });

  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('readProtocolVersion', () => {
    it('should read a valid ProtocolVersion value', () => {
      const ptr = Cometa.writeProtocolVersion(1, 0);
      const version = Cometa.readProtocolVersion(ptr);
      expect(version).toEqual({ major: 1, minor: 0 });
      Cometa.derefProtocolVersion(ptr);
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readProtocolVersion(0)).toThrow('Pointer is null');
    });
  });

  describe('writeProtocolVersion', () => {
    it('should create a ProtocolVersion from valid values', () => {
      const ptr = Cometa.writeProtocolVersion(2, 1);
      expect(ptr).not.toBe(0);
      const version = Cometa.readProtocolVersion(ptr);
      expect(version).toEqual({ major: 2, minor: 1 });
      Cometa.derefProtocolVersion(ptr);
    });

    it('should throw an error for negative major version', () => {
      expect(() => Cometa.writeProtocolVersion(-1, 0)).toThrow(
        'Invalid ProtocolVersion values. Major and minor must be non-negative numbers.'
      );
    });

    it('should throw an error for negative minor version', () => {
      expect(() => Cometa.writeProtocolVersion(1, -1)).toThrow(
        'Invalid ProtocolVersion values. Major and minor must be non-negative numbers.'
      );
    });
  });

  describe('derefProtocolVersion', () => {
    it('should dereference a valid ProtocolVersion pointer', () => {
      const ptr = Cometa.writeProtocolVersion(1, 0);
      expect(() => Cometa.derefProtocolVersion(ptr)).not.toThrow();
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.derefProtocolVersion(0)).toThrow('Pointer is null');
    });

    it('should allow reading after dereferencing if ref count > 1', () => {
      const ptr = Cometa.writeProtocolVersion(1, 0);
      const module = Cometa.getModule();

      // Increment ref count
      module.protocol_version_ref(ptr);

      // First deref
      Cometa.derefProtocolVersion(ptr);

      // Should still be able to read
      const version = Cometa.readProtocolVersion(ptr);
      expect(version).toEqual({ major: 1, minor: 0 });

      // Final deref
      Cometa.derefProtocolVersion(ptr);
    });
  });
});
