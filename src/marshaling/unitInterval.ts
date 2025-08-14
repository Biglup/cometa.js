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

import { UnitInterval } from '../common';
import { assertSuccess } from './object';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';

/* DEFINITIONS ****************************************************************/

/**
 * Reads a UnitInterval value from a pointer in WASM memory.
 *
 * This function reads a UnitInterval value from a pointer in WASM memory and returns it as a number
 * between 0 and 1.
 *
 * @param ptr - The pointer to the UnitInterval in WASM memory.
 * @returns The UnitInterval value as a number between 0 and 1.
 * @throws {Error} If the pointer is null or if reading fails.
 */
export const readUnitIntervalAsDouble = (ptr: number): number => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const value = module.unit_interval_to_double(ptr);

  if (value === undefined || value === null) {
    throw new Error('Failed to read UnitInterval value');
  }

  return value;
};

/**
 * Creates a UnitInterval value from a string or number representation.
 *
 * This function creates a UnitInterval value from either a string or number representation
 * of a value between 0 and 1. The string should be in decimal format (e.g., "0.25").
 *
 * @param value - The string or number representation of the UnitInterval value (must be between 0 and 1).
 * @returns A pointer to the created UnitInterval in WASM memory.
 * @throws {Error} If the value is invalid or if creation fails.
 */
export const writeUnitIntervalAsDouble = (value: string | number): number => {
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : value;

  if (Number.isNaN(numValue) || numValue < 0) {
    throw new Error('Invalid UnitInterval value. Must be a number between 0 and 1.');
  }

  const module = getModule();
  const unitIntervalPtrPtr = module._malloc(4);

  try {
    const result = module.unit_interval_from_double(numValue, unitIntervalPtrPtr);
    assertSuccess(result, 'Failed to create UnitInterval from value');

    return module.getValue(unitIntervalPtrPtr, 'i32');
  } finally {
    module._free(unitIntervalPtrPtr);
  }
};

export const writeUnitInterval = (value: UnitInterval): number => {
  const module = getModule();
  const unitIntervalPtrPtr = module._malloc(4);

  try {
    const numerator = splitToLowHigh64bit(value.numerator);
    const denominator = splitToLowHigh64bit(value.denominator);

    const result = module.unit_interval_new(
      numerator.low,
      numerator.high,
      denominator.low,
      denominator.high,
      unitIntervalPtrPtr
    );
    assertSuccess(result, 'Failed to create UnitInterval from value');

    return module.getValue(unitIntervalPtrPtr, 'i32');
  } finally {
    module._free(unitIntervalPtrPtr);
  }
};

/**
 * Dereferences a UnitInterval pointer, freeing its memory.
 *
 * This function decrements the reference count of a UnitInterval object and frees its memory
 * if the reference count reaches zero. It should be called when a UnitInterval pointer is no
 * longer needed to prevent memory leaks.
 *
 * @param ptr - The pointer to the UnitInterval in WASM memory.
 * @throws {Error} If the pointer is null or if dereferencing fails.
 */
export const derefUnitInterval = (ptr: number): void => {
  if (ptr === 0) {
    return;
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, 'i32');
    module.unit_interval_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};

/**
 * Reads the numerator and denominator of a UnitInterval from a pointer in WASM memory.
 * @param ptr - The pointer to the UnitInterval in WASM memory.
 * @returns An object containing the numerator and denominator of the UnitInterval.
 */
export const readIntervalComponents = (ptr: number): UnitInterval => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();

  const numerator = module.unit_interval_get_numerator(ptr);
  const denominator = module.unit_interval_get_denominator(ptr);

  return {
    denominator: Number(denominator),
    numerator: Number(numerator)
  };
};

/**
 * Converts a string or number to a UnitInterval object.
 * @param value - The string or number representation of the UnitInterval value (must be between 0 and 1).
 */
export const toUnitInterval = (value: string | number): UnitInterval => {
  let ptr = 0;
  try {
    ptr = writeUnitIntervalAsDouble(value);
    return readIntervalComponents(ptr);
  } finally {
    if (ptr !== 0) {
      derefUnitInterval(ptr);
    }
  }
};
