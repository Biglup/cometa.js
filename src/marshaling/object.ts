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

/* IMPORTS ********************************************************************/

import { getErrorString, writeStringToMemory } from './string';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Decrements the reference count of a Cardano object and releases it if the reference count reaches zero.
 *
 * This function is used to manage the lifecycle of objects allocated in the Cardano WASM runtime.
 * It decrements the reference count of the specified object. When the reference count reaches zero,
 * the object is released, and its memory is freed. This helps prevent memory leaks by ensuring
 * that objects are properly unreferenced when no longer needed.
 *
 * @param {number} ptr The pointer to the object to be unreferenced. This must be a valid pointer
 * allocated and managed by the Cardano WASM runtime.
 */
export const unrefObject = (ptr: number): void => {
  const ptrPtr = getModule()._malloc(4);
  try {
    getModule().setValue(ptrPtr, ptr, 'i32');
    getModule().object_unref(ptrPtr);
  } finally {
    getModule()._free(ptrPtr);
  }
};

/**
 * @hidden
 * Asserts that a given operation was successful.
 *
 * This function checks the result code of an operation performed in the Cardano WASM runtime.
 * If the operation fails (i.e., the result is non-zero), it throws an error with the provided
 * last error message for debugging purposes.
 *
 * @param {number} result The result code of the operation. A value of `0` indicates success,
 * while any non-zero value indicates an error.
 * @param {string} lastError The last error message returned by the runtime. This string
 * provides additional details about the error if the result code is non-zero.
 *
 * @throws {Error} If the `result` code is non-zero. The thrown error includes the `lastError`
 * string to aid in diagnosing the issue.
 */
export const assertSuccess = (result: number, lastError?: string): void => {
  if (result !== 0) {
    if (!lastError || lastError === '') {
      throw new Error(`${result}`);
    }

    const errorMsg = `${getErrorString(result)}. ${lastError}`;
    throw new Error(errorMsg);
  }
};

/**
 * @hidden
 * Reads data from a buffer pointer and converts it into a `Uint8Array`.
 *
 * This function retrieves the size and data pointer of a buffer in the WASM runtime, then constructs
 * a `Uint8Array` representing the data. It ensures proper memory handling by utilizing the pointer
 * and size information provided by the WASM module.
 *
 * @param {number} bufferPtr A pointer to the buffer object in the WASM runtime.
 *                           The buffer must be a valid object containing size and data pointer properties.
 *
 * @returns {Uint8Array} A `Uint8Array` containing the data from the buffer.
 *
 * @throws {Error} If the buffer pointer is null or invalid.
 */
export const readBufferData = (bufferPtr: number): Uint8Array => {
  const module = getModule();
  const bufferSize = module.buffer_get_size(bufferPtr);
  const dataPtr = module.buffer_get_data(bufferPtr);

  try {
    return new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + bufferSize));
  } finally {
    unrefObject(bufferPtr);
  }
};

/**
 * @hidden
 * Converts a hexadecimal string into a buffer object in the WASM runtime.
 *
 * @param hex - A hexadecimal string to be converted into a buffer object.
 */
export const hexToBufferObject = (hex: string): number => {
  const module = getModule();
  const string = writeStringToMemory(hex);
  const bufferPtr = module.buffer_from_hex(string, hex.length);

  module._free(string);
  if (!bufferPtr) {
    throw new Error('Failed to create buffer object from hex string');
  }

  return bufferPtr;
};
