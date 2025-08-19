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
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Maps string language keys to the corresponding enum values.
 */
const LANGUAGE_MAP: Record<string, number> = {
  PlutusV1: 0, // CARDANO_PLUTUS_LANGUAGE_VERSION_V1
  PlutusV2: 1, // CARDANO_PLUTUS_LANGUAGE_VERSION_V2
  PlutusV3: 2 // CARDANO_PLUTUS_LANGUAGE_VERSION_V3
};

/**
 * @hidden
 * Maps enum values back to string language keys.
 */
const LANGUAGE_MAP_REVERSE: Record<number, string> = {
  0: 'PlutusV1',
  1: 'PlutusV2',
  2: 'PlutusV3'
};

/**
 * @hidden
 * Writes a CostModel object to WASM memory.
 *
 * @param costModel - The CostModel object to write.
 * @returns A pointer to the created cost model in WASM memory.
 * @throws {Error} If the cost model is invalid or creation fails.
 */
export const writeCostModel = (costModel: CostModel): number => {
  const module = getModule();
  const language = LANGUAGE_MAP[costModel.language];
  if (language === undefined) {
    throw new Error(`Invalid language: ${costModel.language}`);
  }

  const costArrayPtr = module._malloc(costModel.costs.length * 8);
  try {
    for (let i = 0; i < costModel.costs.length; i++) {
      const { high, low } = splitToLowHigh64bit(costModel.costs[i]);
      module.setValue(costArrayPtr + i * 8, low, 'i32');
      module.setValue(costArrayPtr + i * 8 + 4, high, 'i32');
    }

    const costModelPtrPtr = module._malloc(4);
    try {
      const result = module.cost_model_new(language, costArrayPtr, costModel.costs.length, costModelPtrPtr);
      assertSuccess(result, 'Failed to create cost model');
      return module.getValue(costModelPtrPtr, 'i32');
    } finally {
      module._free(costModelPtrPtr);
    }
  } finally {
    module._free(costArrayPtr);
  }
};

/**
 * @hidden
 * Reads a CostModel from a pointer in WASM memory.
 *
 * @param ptr - The pointer to the cost model in WASM memory.
 * @returns The CostModel object.
 * @throws {Error} If the pointer is null or reading fails.
 */
export const readCostModel = (ptr: number): CostModel => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const languagePtr = module._malloc(4);
  try {
    const result = module.cost_model_get_language(ptr, languagePtr);
    assertSuccess(result, 'Failed to read cost model language');
    const language = module.getValue(languagePtr, 'i32');
    const languageStr = LANGUAGE_MAP_REVERSE[language];
    if (!languageStr) {
      throw new Error(`Unknown language enum: ${language}`);
    }

    const costsSize = module.cost_model_get_costs_size(ptr);
    const costs: number[] = [];
    for (let i = 0; i < costsSize; i++) {
      const costPtr = module._malloc(8);
      try {
        const getResult = module.cost_model_get_cost(ptr, i, costPtr);
        assertSuccess(getResult, `Failed to read cost at index ${i}`);
        const low = module.getValue(costPtr, 'i32');
        const high = module.getValue(costPtr + 4, 'i32');
        const cost = Number((BigInt(high) << 32n) | BigInt(low >>> 0));
        costs.push(cost);
      } finally {
        module._free(costPtr);
      }
    }

    return { costs, language: languageStr };
  } finally {
    module._free(languagePtr);
  }
};

/**
 * @hidden
 * Dereferences a cost model pointer, freeing its memory.
 *
 * @param ptr - The pointer to the cost model in WASM memory.
 * @throws {Error} If the pointer is null or dereferencing fails.
 */
export const derefCostModel = (ptr: number): void => {
  if (ptr === 0) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, '*');
    module.cost_model_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};
