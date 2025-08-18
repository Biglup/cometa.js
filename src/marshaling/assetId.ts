/**
 * Copyright 2025 Biglup Labs.
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

import { assertSuccess, unrefObject } from './object';
import { getModule } from '../module';
import { writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Creates an asset ID from a byte array.
 *
 * This function converts a byte array representation of an asset ID into a
 * pointer to an asset ID object in WASM memory.
 *
 * @param {Uint8Array} assetIdHex - The raw bytes of the asset ID.
 * @returns {number} - A pointer to the created asset ID object in WASM memory.
 * @throws {Error} - Throws an error if the operation fails.
 */
export const writeAssetId = (assetIdHex: string): number => {
  const module = getModule();
  const assetIdPtrPtr = module._malloc(4);
  let assetIdPtr = 0;

  const hexStrPtr = writeStringToMemory(assetIdHex);

  try {
    const result = module.asset_id_from_hex(hexStrPtr, assetIdHex.length, assetIdPtrPtr);
    assertSuccess(result, `Failed to create asset_id from hex: ${assetIdHex}`);
    assetIdPtr = module.getValue(assetIdPtrPtr, 'i32');

    const finalPtr = assetIdPtr;
    assetIdPtr = 0; // Transfer ownership to caller
    return finalPtr;
  } catch (error) {
    if (assetIdPtr !== 0) unrefObject(assetIdPtr);
    throw error;
  } finally {
    module._free(hexStrPtr);
    module._free(assetIdPtrPtr);
  }
};

/**
 * @hidden
 * Reads an asset ID from WASM memory and returns it as a hex string.
 *
 * @param {number} assetIdPtr - A pointer to the asset ID object in WASM memory.
 * @returns {string} - The hex string representation of the asset ID.
 * @throws {Error} - Throws an error if the operation fails.
 */
export const readAssetId = (assetIdPtr: number): string => {
  const hexStringPtr = getModule().asset_id_get_hex(assetIdPtr);
  return getModule().UTF8ToString(hexStringPtr);
};
