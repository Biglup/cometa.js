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

import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * Writes a UTF-8 encoded string to a specified memory location in the WASM heap.
 *
 * @param str - The string to encode and write. A null terminator (`\0`) is appended automatically.
 * @returns The pointer (address) to the start of the allocated memory containing the encoded string.
 * @throws {Error} Throws an error if memory allocation fails.
 */
export const writeStringToMemory = (str: string): number => {
  const module = getModule();
  const encoder = new TextEncoder();
  const encoded = encoder.encode(`${str}\0`);

  const ptr = module._malloc(encoded.length);
  if (!ptr) {
    throw new Error('Memory allocation failed.');
  }

  try {
    module.HEAPU8.set(encoded, ptr);
  } catch (error) {
    module._free(ptr);
    throw new Error(`Failed to write string to memory: ${error}`);
  }

  return ptr;
};

/**
 * Writes a byte array to a specified memory location in the WASM heap.
 *
 * @param bytes - The byte array to write.
 * @returns The pointer (address) to the start of the allocated memory containing the byte array.
 * @throws {Error} Throws an error if memory allocation fails or if writing fails.
 */
export const writeBytesToMemory = (bytes: Uint8Array): number => {
  const module = getModule();
  const ptr = module._malloc(bytes.length);
  if (!ptr) {
    throw new Error('Memory allocation failed.');
  }

  try {
    module.HEAPU8.set(bytes, ptr);
  } catch (error) {
    module._free(ptr);
    throw new Error(`Failed to write bytes to memory: ${error}`);
  }

  return ptr;
};

/**
 * Calculates the number of bytes required to store a UTF-8-encoded copy of
 * the given string **including** a trailing NUL (`\0`) terminator.
 *
 * @param str - The JavaScript string to measure.
 * @returns The byte length (`Uint8`) that must be allocated in the WASM heap
 *          before calling {@link writeStringToMemory} or a similar routine.
 *          Always `≥ 1` because the terminating NUL is counted even for the
 *          empty string.
 */
export const utf8ByteLen = (str: string): number => new TextEncoder().encode(str).length + 1;

/**
 * Retrieves the human-readable string representation of a given error code.
 *
 * This function uses the WASM module to convert an error code into a descriptive string.
 * If the error code is invalid or no associated string is found, it returns a default message (`'Unknown error'`).
 *
 * @param error - The numeric error code to be converted into a string.
 * @returns {string} A human-readable string describing the error, or `'Unknown error'` if the conversion fails.
 */
export const getErrorString = (error: number): string => {
  const module = getModule();
  const errorPtr = module.error_to_string(error);
  return errorPtr ? module.UTF8ToString(errorPtr) : 'Unknown error';
};
