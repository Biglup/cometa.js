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

import { assertSuccess } from './object';
import { derefUnitInterval, readUnitIntervalAsDouble, writeUnitIntervalAsDouble } from './unitInterval';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Interface representing execution unit prices with memory and step prices.
 */
export interface ExUnitPrices {
  memPrice: number; // Memory price in lovelace per byte (between 0 and 1)
  stepPrice: number; // Step price in lovelace per step (between 0 and 1)
}

/**
 * Writes an ExUnitPrices object to WASM memory.
 *
 * @param prices - The ExUnitPrices object to write.
 * @returns A pointer to the created execution unit prices in WASM memory.
 * @throws {Error} If the prices are invalid or creation fails.
 */
export const writeExUnitPrices = (prices: ExUnitPrices): number => {
  const module = getModule();
  const pricesPtrPtr = module._malloc(4);
  const memPricePtr = writeUnitIntervalAsDouble(prices.memPrice);
  const stepPricePtr = writeUnitIntervalAsDouble(prices.stepPrice);

  try {
    const result = module.ex_unit_prices_new(memPricePtr, stepPricePtr, pricesPtrPtr);
    assertSuccess(result, 'Failed to create execution unit prices');

    return module.getValue(pricesPtrPtr, 'i32');
  } finally {
    module._free(pricesPtrPtr);
    derefUnitInterval(memPricePtr);
    derefUnitInterval(stepPricePtr);
  }
};

/**
 * Reads an ExUnitPrices object from a pointer in WASM memory.
 *
 * @param ptr - The pointer to the execution unit prices in WASM memory.
 * @returns The ExUnitPrices object.
 * @throws {Error} If the pointer is null or reading fails.
 */
export const readExUnitPrices = (ptr: number): ExUnitPrices => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const memPricePtrPtr = module._malloc(4);
  const stepPricePtrPtr = module._malloc(4);

  try {
    // Read memory price
    const memResult = module.ex_unit_prices_get_memory_prices(ptr, memPricePtrPtr);
    assertSuccess(memResult, 'Failed to read memory price');
    const memPricePtr = module.getValue(memPricePtrPtr, 'i32');
    const memPrice = readUnitIntervalAsDouble(memPricePtr);

    // Read step price
    const stepResult = module.ex_unit_prices_get_steps_prices(ptr, stepPricePtrPtr);
    assertSuccess(stepResult, 'Failed to read step price');
    const stepPricePtr = module.getValue(stepPricePtrPtr, 'i32');
    const stepPrice = readUnitIntervalAsDouble(stepPricePtr);

    return { memPrice, stepPrice };
  } finally {
    module._free(memPricePtrPtr);
    module._free(stepPricePtrPtr);
  }
};

/**
 * Dereferences an execution unit prices pointer, freeing its memory.
 *
 * @param ptr - The pointer to the execution unit prices in WASM memory.
 * @throws {Error} If the pointer is null or dereferencing fails.
 */
export const derefExUnitPrices = (ptr: number): void => {
  if (ptr === 0) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, '*');
    module.ex_unit_prices_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};
