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

import { ExUnits } from '../common';
import { assertSuccess } from './object';
import { getModule } from '../module';
import { readI64, splitToLowHigh64bit } from './number';

/* DEFINITIONS ****************************************************************/

/**
 * Writes an ExUnits object to WASM memory.
 *
 * @param units - The ExUnits object to write.
 * @returns A pointer to the created execution units in WASM memory.
 * @throws {Error} If the units are invalid or creation fails.
 */
export const writeExUnits = (units: ExUnits): number => {
  if (units.memory < 0 || units.steps < 0) {
    throw new Error('Memory and steps values must be non-negative');
  }

  const module = getModule();
  const unitsPtrPtr = module._malloc(4);

  try {
    const { high: memHigh, low: memLow } = splitToLowHigh64bit(units.memory);
    const { high: stepsHigh, low: stepsLow } = splitToLowHigh64bit(units.steps);

    const result = module.ex_units_new(memLow, memHigh, stepsLow, stepsHigh, unitsPtrPtr);
    assertSuccess(result, 'Failed to create execution units');

    return module.getValue(unitsPtrPtr, 'i32');
  } finally {
    module._free(unitsPtrPtr);
  }
};

/**
 * Reads an ExUnits object from a pointer in WASM memory.
 *
 * @param ptr - The pointer to the execution units in WASM memory.
 * @returns The ExUnits object.
 * @throws {Error} If the pointer is null or reading fails.
 */
export const readExUnits = (ptr: number): ExUnits => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const valuePtr = module._malloc(8);

  try {
    let rc = module.ex_units_get_memory_ex(ptr, valuePtr);
    assertSuccess(rc, 'ex_units_get_memory_ex failed');

    const memory = Number(readI64(valuePtr));

    rc = module.ex_units_get_cpu_steps_ex(ptr, valuePtr);
    assertSuccess(rc, 'ex_units_get_cpu_steps_ex failed');

    const steps = Number(readI64(valuePtr));

    return {
      memory,
      steps
    };
  } finally {
    module._free(valuePtr);
  }
};

/**
 * Dereferences an execution units pointer, freeing its memory.
 *
 * Note: After calling this, the pointer is dangling. Reading from it will likely return zero or garbage, not throw.
 *
 * @param ptr - The pointer to the execution units in WASM memory.
 * @throws {Error} If the pointer is null or dereferencing fails.
 */
export const derefExUnits = (ptr: number): void => {
  if (ptr === 0) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, '*');
    module.ex_units_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};
