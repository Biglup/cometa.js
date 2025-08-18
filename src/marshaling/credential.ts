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

import { Credential } from '../address';
import { assertSuccess } from './object';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Reads a credential object from WASM memory and converts it into a JavaScript object.
 *
 * This function takes a pointer to a native Credential object, extracts its
 * hash (as a hex string) and type, and returns them in a structured object.
 *
 * @param {number} credentialPtr - A pointer to the credential object in WASM memory.
 * @returns {Credential} An object containing the credential's hash and type.
 * @throws {Error} Throws an error if the input pointer is null or if reading the credential's data fails.
 */
export const readCredential = (credentialPtr: number): Credential => {
  const module = getModule();

  if (!credentialPtr) {
    throw new Error('Failed to get credential. Pointer is null.');
  }

  const typePtr = module._malloc(4);
  const size = module.credential_get_hash_hex_size(credentialPtr);

  try {
    const typeResult = module.credential_get_type(credentialPtr, typePtr);
    assertSuccess(typeResult, 'Failed to get credential type.');

    const hexPtr = module.credential_get_hash_hex(credentialPtr);
    if (!hexPtr) {
      throw new Error('Failed to get credential hash hex.');
    }

    return {
      hash: module.UTF8ToString(hexPtr, size),
      type: module.getValue(typePtr, 'i32')
    };
  } finally {
    module._free(typePtr);
  }
};

/**
 * @hidden
 * Creates a credential object in WASM memory from a JavaScript object.
 *
 * This function takes a JavaScript object representing a credential, converts its
 * hex hash to bytes, and allocates memory to create a corresponding native object
 * in the WASM heap. It returns a pointer to this new object for use in other WASM operations.
 *
 * @param {Credential} credential - The JavaScript credential object.
 * @param {string} credential.hash - The hex-encoded hash of the credential.
 * @param {number} credential.type - The numerical type of the credential.
 * @returns {number} A pointer to the created credential object in WASM memory.
 * @throws {Error} Throws an error if creating the native credential object fails.
 */
export const writeCredential = (credential: Credential): number => {
  const module = getModule();
  const credentialPtrPtr = module._malloc(4);
  const hashBytes = new Uint8Array(Buffer.from(credential.hash, 'hex'));
  const hashPtr = module._malloc(hashBytes.length);

  try {
    module.HEAPU8.set(hashBytes, hashPtr);

    const result = module.credential_from_hash_bytes(hashPtr, hashBytes.length, credential.type, credentialPtrPtr);
    assertSuccess(result, 'Failed to create credential from hash bytes.');

    return module.getValue(credentialPtrPtr, 'i32');
  } finally {
    module._free(credentialPtrPtr);
    module._free(hashPtr);
  }
};
