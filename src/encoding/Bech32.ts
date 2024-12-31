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
 * Represents the result of decoding a Bech32 string.
 *
 * @typedef {Object} Bech32DecodeResult
 * @property {string} hrp - The human-readable prefix (HRP) extracted from the Bech32 string.
 * @property {Uint8Array} data - The binary data decoded from the Bech32 string.
 * @property {string} hex - The hexadecimal string representation of the decoded binary data.
 */
export type Bech32DecodeResult = {
  hrp: string;
  data: Uint8Array;
  hex: string;
};

/**
 * A utility class for encoding and decoding data using the Bech32 encoding format.
 *
 * This class provides methods for encoding binary data with a human-readable prefix (HRP) into a Bech32 string
 * and for decoding Bech32 strings back into their HRP and binary data components.
 */
export class Bech32 {
  /**
   * Encodes binary data into a Bech32 string with a specified human-readable prefix (HRP).
   *
   * The HRP provides context about the encoded data (e.g., address type). The binary data
   * is converted into a Bech32-compliant string, which includes the HRP and checksum.
   *
   * @param {string} hrp - The human-readable prefix for the Bech32 string (e.g., 'addr').
   * @param {Uint8Array} data - The binary data to encode.
   * @returns {string} - The Bech32-encoded string.
   * @throws {Error} - If the encoding fails due to invalid inputs or insufficient memory.
   */
  public static encode(hrp: string, data: Uint8Array): string {
    const module = getModule();
    const hrpPtr = writeStringToMemory(hrp);
    const dataPtr = module._malloc(data.length);
    const encodedLength = this.getEncodedLength(hrp, data);
    const outputPtr = module._malloc(encodedLength);

    try {
      module.HEAPU8.set(data, dataPtr);

      const result = module.encoding_bech32_encode(hrpPtr, hrp.length, dataPtr, data.length, outputPtr, encodedLength);

      assertSuccess(result, 'Bech32 encoding failed');

      return module.UTF8ToString(outputPtr);
    } finally {
      module._free(hrpPtr);
      module._free(dataPtr);
      module._free(outputPtr);
    }
  }

  /**
   * Encodes a hexadecimal string into a Bech32 string with a specified HRP.
   *
   * Converts the hexadecimal string into binary data, then encodes it using the Bech32 format.
   *
   * @param {string} hrp - The human-readable prefix for the Bech32 string.
   * @param {string} data - The hexadecimal string to encode.
   * @returns {string} - The Bech32-encoded string.
   * @throws {Error} - If the input is not a valid hexadecimal string or the encoding fails.
   */
  public static encodeFromHex(hrp: string, data: string): string {
    return this.encode(hrp, hexToUint8Array(data));
  }

  /**
   * Decodes a Bech32 string into its human-readable prefix (HRP) and binary data.
   *
   * Extracts the HRP and binary data from the Bech32 string. Additionally, it converts the binary
   * data into a hexadecimal string for convenience.
   *
   * @param {string} encodedString - The Bech32-encoded string to decode.
   * @returns {Bech32DecodeResult} - An object containing:
   *   - `hrp`: The decoded human-readable prefix.
   *   - `data`: The decoded binary data as a `Uint8Array`.
   *   - `hex`: The hexadecimal string representation of the binary data.
   * @throws {Error} - If the decoding fails due to an invalid Bech32 string.
   */
  public static decode(encodedString: string): Bech32DecodeResult {
    const module = getModule();
    const inputPtr = writeStringToMemory(encodedString);
    const hrpLength = 1024;
    const hrpPtr = module._malloc(hrpLength);
    const decodedLength = this.getDecodedLength(encodedString);
    const dataPtr = module._malloc(decodedLength);
    const dataLengthPtr = module._malloc(4);

    module.setValue(dataLengthPtr, decodedLength, 'i32');

    try {
      const result = module.encoding_bech32_decode(
        inputPtr,
        encodedString.length,
        hrpPtr,
        hrpLength,
        dataPtr,
        dataLengthPtr
      );

      assertSuccess(result, 'Bech32 decoding failed');

      const hrp = module.UTF8ToString(hrpPtr);
      const actualDataLength = module.getValue(dataLengthPtr, 'i32');
      const data = new Uint8Array(module.HEAPU8.subarray(dataPtr, dataPtr + actualDataLength));

      return { data, hex: uint8ArrayToHex(data), hrp };
    } finally {
      module._free(inputPtr);
      module._free(hrpPtr);
      module._free(dataPtr);
      module._free(dataLengthPtr);
    }
  }

  /**
   * Calculates the length of a Bech32-encoded string for the given HRP and binary data.
   *
   * The computed length includes the HRP, the data, the separator, and the checksum.
   *
   * @param {string} hrp - The human-readable prefix for the Bech32 string.
   * @param {Uint8Array} data - The binary data to encode.
   * @returns {number} - The length of the resulting Bech32-encoded string, including the null terminator.
   * @private
   */
  private static getEncodedLength(hrp: string, data: Uint8Array): number {
    const module = getModule();
    const hrpPtr = writeStringToMemory(hrp);
    const dataPtr = module._malloc(data.length);

    try {
      module.HEAPU8.set(data, dataPtr);
      return module.encoding_bech32_get_encoded_length(hrpPtr, hrp.length, dataPtr, data.length);
    } finally {
      module._free(hrpPtr);
      module._free(dataPtr);
    }
  }

  /**
   * Calculates the lengths of the HRP and binary data decoded from a Bech32 string.
   *
   * Determines the size of the decoded data and HRP without performing the full decoding operation.
   *
   * @param {string} encodedString - The Bech32-encoded string.
   * @returns {number} - The length of the decoded binary data.
   * @private
   */
  private static getDecodedLength(encodedString: string): number {
    const module = getModule();
    const inputPtr = writeStringToMemory(encodedString);
    const hrpLengthPtr = module._malloc(8);

    try {
      return module.encoding_bech32_get_decoded_length(inputPtr, encodedString.length, hrpLengthPtr);
    } finally {
      module._free(inputPtr);
      module._free(hrpLengthPtr);
    }
  }
}
