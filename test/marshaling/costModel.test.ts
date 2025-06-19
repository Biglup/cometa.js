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

describe('CostModel', () => {
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

  describe('Cometa.writeCostModel', () => {
    it('should write a cost model to WASM memory', () => {
      const costModel: Cometa.CostModel = {
        costs: [1, 2, 3, 4, 5],
        language: 'PlutusV1'
      };

      const ptr = Cometa.writeCostModel(costModel);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      Cometa.derefCostModel(ptr);
    });

    it('should throw an error for invalid language', () => {
      const costModel: Cometa.CostModel = {
        costs: [1, 2, 3],
        language: 'InvalidLanguage'
      };

      expect(() => Cometa.writeCostModel(costModel)).toThrow('Invalid language: InvalidLanguage');
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readCostModel(0)).toThrow('Pointer is null');
    });
  });

  describe('Cometa.readCostModel', () => {
    it('should read a cost model from WASM memory', () => {
      const costModel: Cometa.CostModel = {
        costs: [10, 20, 30, 40, 50],
        language: 'PlutusV2'
      };

      const ptr = Cometa.writeCostModel(costModel);
      try {
        const readModel = Cometa.readCostModel(ptr);
        expect(readModel).toEqual(costModel);
      } finally {
        Cometa.derefCostModel(ptr);
      }
    });

    it('should handle empty cost array', () => {
      const costModel: Cometa.CostModel = {
        costs: [],
        language: 'PlutusV3'
      };

      const ptr = Cometa.writeCostModel(costModel);
      try {
        const readModel = Cometa.readCostModel(ptr);
        expect(readModel).toEqual(costModel);
      } finally {
        Cometa.derefCostModel(ptr);
      }
    });

    it('should handle large cost values', () => {
      const costModel: Cometa.CostModel = {
        costs: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
        language: 'PlutusV1'
      };

      const ptr = Cometa.writeCostModel(costModel);
      try {
        const readModel = Cometa.readCostModel(ptr);
        expect(readModel).toEqual(costModel);
      } finally {
        Cometa.derefCostModel(ptr);
      }
    });
  });
});
