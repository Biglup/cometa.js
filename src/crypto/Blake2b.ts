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

import { assertSuccess, readBlake2bHashData } from '../marshaling';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * A utility class for computing BLAKE2b cryptographic hashes.
 *
 * BLAKE2b is a fast, secure cryptographic hash function optimized for performance
 * and security. It is used widely in blockchain applications and cryptographic
 * systems for hashing arbitrary data.
 */
export class Blake2b {
  /**
   * Private constructor to prevent instantiation.
   *
   * This class is designed to be used statically, with all methods being static.
   * The constructor is private to enforce this design pattern.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Computes a BLAKE2b hash of the given data with the specified hash length.
   *
   * This method takes arbitrary binary data and computes its BLAKE2b hash with
   * the specified output length. BLAKE2b supports output lengths from 1 to 64 bytes.
   *
   * @param {Uint8Array} data - The input data to be hashed.
   *                            This is a binary array representing the data.
   * @param {number} hashLength - The desired length of the resulting hash in bytes.
   *                              Valid values are 1 to 64 bytes.
   * @returns {Uint8Array} - The computed BLAKE2b hash as a binary array.
   * @throws {Error} - Throws an error if the hashing operation fails.
   *
   * @example
   * const data = new TextEncoder().encode("Hello, World!");
   * const hashLength = 32; // 256-bit hash
   * const hash = Blake2b.computeHash(data, hashLength);
   * console.log("BLAKE2b Hash:", hash);
   */
  public static computeHash(data: Uint8Array, hashLength: number): Uint8Array {
    const module = getModule();
    const dataPtr = module._malloc(data.length);
    const hashPtrPtr = module._malloc(4);

    try {
      module.HEAPU8.set(data, dataPtr);

      const result = module.blake2b_compute_hash(dataPtr, data.length, hashLength, hashPtrPtr);

      assertSuccess(result, 'blake2b compute hash failed');

      const hashPtr = module.getValue(hashPtrPtr, 'i32');

      return readBlake2bHashData(hashPtr);
    } finally {
      module._free(dataPtr);
      module._free(hashPtrPtr);
    }
  }
}
