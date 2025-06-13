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
import { ExUnitPrices, writeExUnitPrices, readExUnitPrices, derefExUnitPrices } from '../../src/marshaling/exUnitPrices';

/* TESTS *********************************************************************/

describe('ExUnitPrices', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('writeExUnitPrices', () => {
    it('should write execution unit prices to WASM memory', () => {
      const prices: ExUnitPrices = {
        memPrice: 0.0577,
        stepPrice: 0.0000721
      };

      const ptr = writeExUnitPrices(prices);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      derefExUnitPrices(ptr);
    });

    it('should handle large price values', () => {
      const prices: ExUnitPrices = {
        memPrice: 0.999999,
        stepPrice: 0.000001
      };

      const ptr = writeExUnitPrices(prices);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      derefExUnitPrices(ptr);
    });

    it('should throw an error for null pointer', () => {
      expect(() => readExUnitPrices(0)).toThrow('Pointer is null');
    });

    it('should throw an error for invalid price values', () => {
      const prices: ExUnitPrices = {
        memPrice: 1.5, // Invalid: greater than 1
        stepPrice: -0.1 // Invalid: less than 0
      };

      expect(() => writeExUnitPrices(prices)).toThrow('Invalid UnitInterval value');
    });
  });

  describe('readExUnitPrices', () => {
    it('should read execution unit prices from WASM memory', () => {
      const prices: ExUnitPrices = {
        memPrice: 0.0577,
        stepPrice: 0.0000721
      };

      const ptr = writeExUnitPrices(prices);
      try {
        const readPrices = readExUnitPrices(ptr);
        expect(readPrices).toEqual(prices);
      } finally {
        derefExUnitPrices(ptr);
      }
    });

    it('should handle large price values', () => {
      const prices: ExUnitPrices = {
        memPrice: 0.999999,
        stepPrice: 0.000001
      };

      const ptr = writeExUnitPrices(prices);
      try {
        const readPrices = readExUnitPrices(ptr);
        expect(readPrices).toEqual(prices);
      } finally {
        derefExUnitPrices(ptr);
      }
    });
  });

  describe('derefExUnitPrices', () => {
    it('should free the execution unit prices memory', () => {
      const prices: ExUnitPrices = {
        memPrice: 0.0577,
        stepPrice: 0.0000721
      };

      const ptr = writeExUnitPrices(prices);
      derefExUnitPrices(ptr);

      // The pointer should be invalid after deref
      expect(() => readExUnitPrices(ptr)).toThrow();
    });

    it('should throw an error for null pointer', () => {
      expect(() => derefExUnitPrices(0)).toThrow('Pointer is null');
    });
  });
}); 