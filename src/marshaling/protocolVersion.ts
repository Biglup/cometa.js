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

import { ProtocolVersion } from '../common';
import { assertSuccess } from './object';
import { getModule } from '../module';
import { splitToLowHigh64bit } from './number';

/* DEFINITIONS ****************************************************************/

/**
 * Reads a ProtocolVersion value from a pointer in WASM memory.
 *
 * This function reads a ProtocolVersion value from a pointer in WASM memory and returns it as an object
 * containing major and minor version numbers.
 *
 * @param ptr - The pointer to the ProtocolVersion in WASM memory.
 * @returns The ProtocolVersion value as an object with major and minor numbers.
 * @throws {Error} If the pointer is null or if reading fails.
 */
export const readProtocolVersion = (ptr: number): ProtocolVersion => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const major = module.protocol_version_get_major(ptr);
  const minor = module.protocol_version_get_minor(ptr);

  if (major === undefined || minor === undefined) {
    throw new Error('Failed to read ProtocolVersion value');
  }

  // Convert the 64-bit integers to JavaScript numbers
  const majorNum = Number(major);
  const minorNum = Number(minor);

  return { major: majorNum, minor: minorNum };
};

/**
 * Creates a ProtocolVersion value from major and minor version numbers.
 *
 * This function creates a ProtocolVersion value from major and minor version numbers.
 *
 * @param major - The major version number.
 * @param minor - The minor version number.
 * @returns A pointer to the created ProtocolVersion in WASM memory.
 * @throws {Error} If the values are invalid or if creation fails.
 */
export const writeProtocolVersion = (major: number, minor: number): number => {
  if (major < 0 || minor < 0) {
    throw new Error('Invalid ProtocolVersion values. Major and minor must be non-negative numbers.');
  }

  const module = getModule();
  const protocolVersionPtrPtr = module._malloc(4);

  try {
    const majorParts = splitToLowHigh64bit(major);
    const minorParts = splitToLowHigh64bit(minor);

    const result = module.protocol_version_new(
      majorParts.low,
      majorParts.high,
      minorParts.low,
      minorParts.high,
      protocolVersionPtrPtr
    );
    assertSuccess(result, 'Failed to create ProtocolVersion from values');

    return module.getValue(protocolVersionPtrPtr, 'i32');
  } finally {
    module._free(protocolVersionPtrPtr);
  }
};

/**
 * Dereferences a ProtocolVersion pointer, freeing its memory.
 *
 * This function decrements the reference count of a ProtocolVersion object and frees its memory
 * if the reference count reaches zero. It should be called when a ProtocolVersion pointer is no
 * longer needed to prevent memory leaks.
 *
 * @param ptr - The pointer to the ProtocolVersion in WASM memory.
 * @throws {Error} If the pointer is null or if dereferencing fails.
 */
export const derefProtocolVersion = (ptr: number): void => {
  if (ptr === 0) {
    throw new Error('Pointer is null');
  }

  const module = getModule();
  const ptrPtr = module._malloc(4);
  try {
    module.setValue(ptrPtr, ptr, '*');
    module.protocol_version_unref(ptrPtr);
  } finally {
    module._free(ptrPtr);
  }
};
