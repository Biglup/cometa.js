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

import { assertSuccess, writeStringToMemory } from '../marshaling';
import { getModule } from '../module';
import { hexToUint8Array, uint8ArrayToHex } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * A utility class for encoding and decoding data using Base58 encoding.
 *
 * Base58 encoding is commonly used in blockchain systems to encode binary data
 * into a human-readable and compact format. This class provides methods to calculate
 * the required buffer sizes for encoding/decoding and to perform the actual encoding/decoding.
 */
export class Base58 {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Encodes binary data into a Base58 string.
   *
   * @param {Uint8Array} data The binary data to encode.
   * @returns {string} The Base58-encoded string.
   * @throws {Error} If the encoding fails.
   */
  public static encode(data: Uint8Array): string {
    const module = getModule();
    const encodedLength = this.getEncodedLength(data);
    const dataPtr = module._malloc(data.length);
    const outputPtr = module._malloc(encodedLength);

    try {
      module.HEAPU8.set(data, dataPtr);
      const result = module.encoding_base58_encode(dataPtr, data.length, outputPtr, encodedLength);

      assertSuccess(result, 'Base58 encoding failed');
      return module.UTF8ToString(outputPtr);
    } finally {
      module._free(dataPtr);
      module._free(outputPtr);
    }
  }

  /**
   * Decodes a Base58-encoded string into binary data.
   *
   * @param {string} encodedString The Base58-encoded string to decode.
   * @returns {Uint8Array} The decoded binary data.
   * @throws {Error} If the decoding fails.
   */
  public static decode(encodedString: string): Uint8Array {
    const module = getModule();
    const decodedLength = this.getDecodedLength(encodedString);
    module._malloc(encodedString.length + 1);
    const outputPtr = module._malloc(decodedLength);
    const inputPtr = writeStringToMemory(encodedString);

    try {
      const result = module.encoding_base58_decode(inputPtr, encodedString.length, outputPtr, decodedLength);

      assertSuccess(result, 'Base58 decoding failed');
      return new Uint8Array(module.HEAPU8.subarray(outputPtr, outputPtr + decodedLength));
    } finally {
      module._free(inputPtr);
      module._free(outputPtr);
    }
  }

  /**
   * Encodes a hexadecimal string into a Base58 string.
   *
   * This method converts the input hexadecimal string into binary data
   * (a `Uint8Array`), which is then encoded into a Base58 string.
   *
   * @param {string} hexString The input hexadecimal string to encode. This should be
   *                           a valid hexadecimal representation (e.g., "a1b2c3").
   * @returns {string} The Base58-encoded string.
   * @throws {Error} If the input is not a valid hex string or the encoding fails.
   */
  public static encodeFromHex(hexString: string): string {
    const binaryData = hexToUint8Array(hexString);
    return Base58.encode(binaryData);
  }

  /**
   * Decodes a Base58 string into a hexadecimal string.
   *
   * This method converts the input Base58-encoded string into binary data
   * (a `Uint8Array`), which is then transformed into its hexadecimal representation.
   *
   * @param {string} base58String The Base58-encoded string to decode. This should be
   *                              a valid Base58 string (e.g., "19DXstMaV...").
   * @returns {string} The decoded hexadecimal string.
   * @throws {Error} If the input is not a valid Base58 string or the decoding fails.
   */
  public static decodeFromHex(base58String: string): string {
    const binaryData = Base58.decode(base58String);
    return uint8ArrayToHex(binaryData);
  }

  /**
   * Calculates the length of a Base58-encoded string for the given input data.
   *
   * @param {Uint8Array} data The binary data to be Base58 encoded.
   * @returns {number} The length of the resulting Base58-encoded string, including the null terminator.
   * @private
   */
  private static getEncodedLength(data: Uint8Array): number {
    const module = getModule();
    const dataPtr = module._malloc(data.length);

    try {
      module.HEAPU8.set(data, dataPtr);
      return module.encoding_base58_get_encoded_length(dataPtr, data.length);
    } finally {
      module._free(dataPtr);
    }
  }

  /**
   * Calculates the length of the binary data decoded from a Base58 string.
   *
   * @param {string} encodedString The Base58-encoded string.
   * @returns {number} The length of the resulting decoded binary data.
   * @private
   */
  private static getDecodedLength(encodedString: string): number {
    const module = getModule();
    const inputPtr = writeStringToMemory(encodedString);

    try {
      return module.encoding_base58_get_decoded_length(inputPtr, encodedString.length);
    } finally {
      module._free(inputPtr);
    }
  }
}
