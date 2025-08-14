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

describe('ExUnits', () => {
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

  describe('writeExUnits', () => {
    it('should write execution units to WASM memory', () => {
      const units: Cometa.ExUnits = {
        memory: 1000,
        steps: 5000
      };

      const ptr = Cometa.writeExUnits(units);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      Cometa.derefExUnits(ptr);
    });

    it('should handle large values', () => {
      const units: Cometa.ExUnits = {
        memory: Number.MAX_SAFE_INTEGER,
        steps: Number.MAX_SAFE_INTEGER
      };

      const ptr = Cometa.writeExUnits(units);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      Cometa.derefExUnits(ptr);
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readExUnits(0)).toThrow('Pointer is null');
    });

    it('should throw an error for negative values', () => {
      const units: Cometa.ExUnits = {
        memory: -1000,
        steps: -5000
      };

      expect(() => Cometa.writeExUnits(units)).toThrow();
    });
  });

  describe('readExUnits', () => {
    it('should read execution units from WASM memory', () => {
      const units: Cometa.ExUnits = {
        memory: 1000,
        steps: 5000
      };

      const ptr = Cometa.writeExUnits(units);
      try {
        const readUnits = Cometa.readExUnits(ptr);
        expect(readUnits).toEqual(units);
      } finally {
        Cometa.derefExUnits(ptr);
      }
    });

    it('should handle large values', () => {
      const units: Cometa.ExUnits = {
        memory: Number.MAX_SAFE_INTEGER,
        steps: Number.MAX_SAFE_INTEGER
      };

      const ptr = Cometa.writeExUnits(units);
      try {
        const readUnits = Cometa.readExUnits(ptr);
        expect(readUnits).toEqual(units);
      } finally {
        Cometa.derefExUnits(ptr);
      }
    });
  });

  describe('derefExUnits', () => {
    it('should throw an error for null pointer', () => {
      expect(() => Cometa.derefExUnits(0)).toThrow('Pointer is null');
    });
  });
});
