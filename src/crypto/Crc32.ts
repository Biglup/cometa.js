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

import { getModule } from '../module';
import { hexToUint8Array } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * The Crc32 class is a utility designed to compute CRC32 checksums for various types of input data.
 * CRC32 (Cyclic Redundancy Check) is a common error-detection code used in network communications,
 * file storage, and other applications where data integrity verification is essential.
 */
export class Crc32 {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Computes the CRC32 checksum of the given binary data.
   *
   * @param {Uint8Array} data - The binary data for which the checksum will be computed.
   * @returns {number} The computed CRC32 checksum as a 32-bit integer.
   *
   * @example
   * const binaryData = new Uint8Array([0x01, 0x02, 0x03]);
   * const checksum = Crc32.compute(binaryData);
   * console.log(checksum); // Outputs the checksum as a number
   */
  public static compute(data: Uint8Array): number {
    const module = getModule();
    const dataPtr = module._malloc(data.length);

    try {
      module.HEAPU8.set(data, dataPtr);
      return module.checksum_crc32(dataPtr, data.length) >>> 0; // Normalize to unsigned 32-bit
    } finally {
      module._free(dataPtr);
    }
  }

  /**
   * Computes the CRC32 checksum of a hexadecimal string.
   *
   * The method converts the hexadecimal string into binary data before computing the checksum.
   *
   * @param {string} hexString - The hexadecimal string to process.
   * @returns {number} The computed CRC32 checksum as a 32-bit integer.
   *
   * @example
   * const hexString = "010203";
   * const checksum = Crc32.computeFromHex(hexString);
   * console.log(checksum); // Outputs the checksum as a number
   */
  public static computeFromHex(hexString: string): number {
    const binaryData = hexToUint8Array(hexString);
    return Crc32.compute(binaryData);
  }

  /**
   * Computes the CRC32 checksum of a UTF-8 encoded string.
   *
   * The method first encodes the string as UTF-8 binary data and then computes the checksum.
   *
   * @param {string} data - The UTF-8 string to process.
   * @returns {number} The computed CRC32 checksum as a 32-bit integer.
   *
   * @example
   * const utf8String = "Hello, World!";
   * const checksum = Crc32.computeFromUtf8(utf8String);
   * console.log(checksum); // Outputs the checksum as a number
   */
  public static computeFromUtf8(data: string): number {
    const binaryData = new TextEncoder().encode(data);
    return Crc32.compute(binaryData);
  }
}
