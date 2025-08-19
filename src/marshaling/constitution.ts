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

import { Constitution } from '../common';
import { assertSuccess, unrefObject } from './object';
import { blake2bHashFromHex, readBlake2bHashData } from './blake2b';
import { getModule } from '../module';
import { readAnchor, writeAnchor } from './anchor';
import { uint8ArrayToHex } from '../cometa';

/* DEFINITIONS ****************************************************************/

/**
 * @hidden
 * Deserializes a native C `cardano_constitution_t` object into a JavaScript `Constitution` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_constitution_t` object.
 * @returns {Constitution} The deserialized JavaScript `Constitution` object.
 * @throws {Error} If a marshalling error occurs.
 */
export const readConstitution = (ptr: number): Constitution => {
  const module = getModule();
  let anchorPtr = 0;
  let scriptHashPtr = 0;

  try {
    anchorPtr = module.constitution_get_anchor(ptr);
    if (!anchorPtr) {
      throw new Error('Failed to get anchor from constitution');
    }

    scriptHashPtr = module.constitution_get_script_hash(ptr);

    const constitution: Constitution = {
      anchor: readAnchor(anchorPtr)
    };

    if (scriptHashPtr) {
      constitution.scriptHash = uint8ArrayToHex(readBlake2bHashData(scriptHashPtr, false));
    }

    return constitution;
  } finally {
    if (anchorPtr) {
      unrefObject(anchorPtr);
    }
    if (scriptHashPtr) {
      unrefObject(scriptHashPtr);
    }
  }
};

/**
 * @hidden
 * Serializes a JavaScript `Constitution` object into a native C `cardano_constitution_t`.
 *
 * @param {Constitution} constitution - The `Constitution` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_constitution_t` object. The caller is responsible for freeing this memory.
 * @throws {Error} If a marshalling error occurs.
 */
export const writeConstitution = (constitution: Constitution): number => {
  const module = getModule();
  const constitutionPtrPtr = module._malloc(4);
  let anchorPtr = 0;
  let scriptHashPtr = 0;

  try {
    anchorPtr = writeAnchor(constitution.anchor);

    if (constitution.scriptHash) {
      scriptHashPtr = blake2bHashFromHex(constitution.scriptHash);
    }

    assertSuccess(
      module.constitution_new(anchorPtr, scriptHashPtr, constitutionPtrPtr),
      'Failed to create new Constitution object'
    );

    return module.getValue(constitutionPtrPtr, 'i32');
  } finally {
    if (anchorPtr) {
      unrefObject(anchorPtr);
    }
    if (scriptHashPtr) {
      unrefObject(scriptHashPtr);
    }

    module._free(constitutionPtrPtr);
  }
};
