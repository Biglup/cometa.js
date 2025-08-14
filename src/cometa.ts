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

import { getModule } from './module';

/* DEFINITIONS ****************************************************************/

/**
 * Retrieves the version of the underlying libcardano-c library.
 *
 * This function calls the WASM module's `get_lib_version` method to fetch the library version
 * as a UTF-8 encoded string. The version string can be used for debugging, compatibility checks,
 * or informational purposes.
 *
 * @returns {string} The version string of the libcardano-c library.
 */
export const getLibCardanoCVersion = (): string => getModule().UTF8ToString(getModule().get_lib_version());

/**
 * Converts a hexadecimal string to a Uint8Array.
 *
 * @param {string} hexString The hexadecimal string to convert.
 * @returns {Uint8Array} The binary data as a Uint8Array.
 * @throws {Error} If the input string is not a valid hex string.
 */
export const hexToUint8Array = (hexString: string): Uint8Array => {
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string: length must be even.');
  }

  // eslint-disable-next-line wrap-regex
  if (hexString.length > 0 && !/^[\da-f]+$/i.test(hexString)) {
    throw new TypeError('Invalid hex string: contains non-hexadecimal characters.');
  }

  const byteArray = new Uint8Array(hexString.length / 2);

  for (let i = 0; i < hexString.length; i += 2) {
    byteArray[i / 2] = Number.parseInt(hexString.slice(i, i + 2), 16);
  }

  return byteArray;
};

/**
 * Converts a Uint8Array to a hexadecimal string.
 *
 * @param {Uint8Array} byteArray The binary data to convert.
 * @returns {string} The hexadecimal string representation of the data.
 */
export const uint8ArrayToHex = (byteArray: Uint8Array): string =>
  [...byteArray].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Converts a UTF-8 string to a Uint8Array.
 *
 * @param {string} str - The UTF-8 string to convert.
 * @returns {Uint8Array} The converted Uint8Array.
 */
export const utf8ToUint8Array = (str: string): Uint8Array => new TextEncoder().encode(str);

/**
 * Converts a Uint8Array to a UTF-8 string.
 *
 * @param {Uint8Array} uint8Array - The Uint8Array to convert.
 * @returns {string} The converted UTF-8 string.
 */
export const uint8ArrayToUtf8 = (uint8Array: Uint8Array): string => new TextDecoder().decode(uint8Array);

/**
 * A simple state tracker to manually signal when an async operation,
 * callable from WASM, has been initiated.
 */
export const asyncifyStateTracker = {
  isAsyncActive: false
};
