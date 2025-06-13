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

import { CostModel } from '../common';
import { assertSuccess } from './object';
import { derefCostModel, readCostModel, writeCostModel } from './costModel';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Writes a CostModels object to WASM memory.
 *
 * @param costModels - The CostModels object to write.
 * @returns A pointer to the created cost models map in WASM memory.
 * @throws {Error} If the cost models are invalid or creation fails.
 */
export const writeCostModels = (costModels: CostModel[]): number => {
  const module = getModule();
  const costmdlsPtrPtr = module._malloc(4);
  try {
    const result = module.costmdls_new(costmdlsPtrPtr);
    assertSuccess(result, 'Failed to create cost models map');
    const costmdlsPtr = module.getValue(costmdlsPtrPtr, 'i32');

    for (const [language, costModel] of Object.entries(costModels)) {
      const costModelPtr = writeCostModel(costModel);
      try {
        const insertResult = module.costmdls_insert(costmdlsPtr, costModelPtr);
        assertSuccess(insertResult, `Failed to insert cost model for language ${language}`);
      } finally {
        derefCostModel(costModelPtr);
      }
    }

    return costmdlsPtr;
  } finally {
    module._free(costmdlsPtrPtr);
  }
};

/**
 * Reads a CostModels map from a pointer in WASM memory.
 *
 * @param ptr - The pointer to the cost models map in WASM memory.
 * @returns The CostModels object.
 * @throws {Error} If the pointer is null or reading fails.
 */
export const readCostModels = (ptr: number): CostModel[] => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const costModels = [];

  for (let i = 0; i < 3; i++) {
    if (module.costmdls_has(ptr, i)) {
      const costModelPtrPtr = module._malloc(4);
      try {
        const getResult = module.costmdls_get(ptr, i, costModelPtrPtr);
        assertSuccess(getResult, `Failed to read cost model for language ${i}`);
        const costModelPtr = module.getValue(costModelPtrPtr, 'i32');
        costModels[i] = readCostModel(costModelPtr);
        derefCostModel(costModelPtr);
      } finally {
        module._free(costModelPtrPtr);
      }
    }
  }

  return costModels;
};

/**
 * Dereferences a cost models map pointer, freeing its memory.
 *
 * @param ptr - The pointer to the cost models map in WASM memory.
 * @throws {Error} If the pointer is null or dereferencing fails.
 */
export const derefCostModels = (ptr: number): void => {
  if (ptr === 0) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, '*');
    module.costmdls_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};
