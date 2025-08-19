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

describe('ExUnitPrices', () => {
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

  describe('writeExUnitPrices', () => {
    it('should write execution unit prices to WASM memory', () => {
      const prices: Cometa.ExUnitsPrices = {
        memory: {
          denominator: 10000,
          numerator: 577
        },
        steps: {
          denominator: 10000000,
          numerator: 721
        }
      };

      const ptr = Cometa.writeExUnitPrices(prices);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      Cometa.derefExUnitPrices(ptr);
    });

    it('should handle large price values', () => {
      const prices: Cometa.ExUnitsPrices = {
        memory: {
          denominator: 1000000,
          numerator: 999999
        },
        steps: {
          denominator: 1000000,
          numerator: 1
        }
      };

      const ptr = Cometa.writeExUnitPrices(prices);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      Cometa.derefExUnitPrices(ptr);
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readExUnitPrices(0)).toThrow('Pointer is null');
    });
  });

  describe('readExUnitPrices', () => {
    it('should read execution unit prices from WASM memory', () => {
      const prices: Cometa.ExUnitsPrices = {
        memory: {
          denominator: 10000,
          numerator: 577
        },
        steps: {
          denominator: 10000000,
          numerator: 721
        }
      };

      const ptr = Cometa.writeExUnitPrices(prices);
      try {
        const readPrices = Cometa.readExUnitPrices(ptr);
        expect(readPrices).toEqual(prices);
      } finally {
        Cometa.derefExUnitPrices(ptr);
      }
    });

    it('should handle large price values', () => {
      const prices: Cometa.ExUnitsPrices = {
        memory: {
          denominator: 1000000,
          numerator: 999999
        },
        steps: {
          denominator: 1000000,
          numerator: 1
        }
      };

      const ptr = Cometa.writeExUnitPrices(prices);
      try {
        const readPrices = Cometa.readExUnitPrices(ptr);
        expect(readPrices).toEqual(prices);
      } finally {
        Cometa.derefExUnitPrices(ptr);
      }
    });
  });

  describe('derefExUnitPrices', () => {
    it('should free the execution unit prices memory', () => {
      const prices: Cometa.ExUnitsPrices = {
        memory: {
          denominator: 10000,
          numerator: 577
        },
        steps: {
          denominator: 10000000,
          numerator: 721
        }
      };

      const ptr = Cometa.writeExUnitPrices(prices);
      Cometa.derefExUnitPrices(ptr);

      // The pointer should be invalid after deref
      expect(() => Cometa.readExUnitPrices(ptr)).toThrow();
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.derefExUnitPrices(0)).toThrow('Pointer is null');
    });
  });
});
