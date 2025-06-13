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

/* TESTS *********************************************************************/

describe('CostModels', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('Cometa.writeCostModels', () => {
    it('should write cost models to WASM memory', () => {
      const costModels = [
        {
          costs: [1, 2, 3],
          language: 'PlutusV1'
        },
        {
          costs: [4, 5, 6],
          language: 'PlutusV2'
        }
      ];

      const ptr = Cometa.writeCostModels(costModels);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      Cometa.derefCostModels(ptr);
    });

    it('should handle empty cost models map', () => {
      const costModels = new Array<Cometa.CostModel>();

      const ptr = Cometa.writeCostModels(costModels);
      expect(ptr).toBeGreaterThan(0);

      // Clean up
      Cometa.derefCostModels(ptr);
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readCostModels(0)).toThrow('Pointer is null');
    });
  });

  describe('Cometa.readCostModels', () => {
    it('should read cost models from WASM memory', () => {
      const costModels = [
        {
          costs: [10, 20, 30],
          language: 'PlutusV1'
        },
        {
          costs: [40, 50, 60],
          language: 'PlutusV2'
        },
        {
          costs: [70, 80, 90],
          language: 'PlutusV3'
        }
      ];

      const ptr = Cometa.writeCostModels(costModels);
      try {
        const readModels = Cometa.readCostModels(ptr);
        expect(readModels).toEqual(costModels);
      } finally {
        Cometa.derefCostModels(ptr);
      }
    });

    it('should handle cost models with empty cost arrays', () => {
      const costModels = [
        {
          costs: [],
          language: 'PlutusV1'
        },
        {
          costs: [],
          language: 'PlutusV2'
        }
      ];

      const ptr = Cometa.writeCostModels(costModels);
      try {
        const readModels = Cometa.readCostModels(ptr);
        expect(readModels).toEqual(costModels);
      } finally {
        Cometa.derefCostModels(ptr);
      }
    });

    it('should handle cost models with large cost values', () => {
      const costModels = [
        {
          costs: [Number.MAX_SAFE_INTEGER],
          language: 'PlutusV1'
        },
        {
          costs: [Number.MIN_SAFE_INTEGER],
          language: 'PlutusV2'
        }
      ];

      const ptr = Cometa.writeCostModels(costModels);
      try {
        const readModels = Cometa.readCostModels(ptr);
        expect(readModels).toEqual(costModels);
      } finally {
        Cometa.derefCostModels(ptr);
      }
    });
  });
});
