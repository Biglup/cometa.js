/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS *******************************************************************/

import { Anchor } from '../';
import { assertSuccess } from './object';
import { getModule } from '../module';
import { writeStringToMemory } from './string';

/* DEFINITIONS ****************************************************************/

/**
 * Deserializes a native `cardano_anchor_t` object into a JavaScript `Anchor` object.
 *
 * @param {number} ptr - A pointer to the native `cardano_anchor_t` object.
 * @returns {Anchor} The deserialized `Anchor` object.
 * @throws {Error} If the pointer is null.
 */
export const readAnchor = (ptr: number): Anchor => {
  if (!ptr) {
    throw new Error('Pointer is null');
  }

  const module = getModule();

  const urlCStringPtr = module.anchor_get_url(ptr);
  const dataHashCStringPtr = module.anchor_get_hash_hex(ptr);

  const url = module.UTF8ToString(urlCStringPtr);
  const dataHash = module.UTF8ToString(dataHashCStringPtr);

  return { dataHash, url };
};

/**
 * Serializes a JavaScript `Anchor` object into a native `cardano_anchor_t` object.
 *
 * @param {Anchor} anchor - The `Anchor` object to serialize.
 * @returns {number} A pointer to the newly created native `cardano_anchor_t` object.
 */
export const writeAnchor = (anchor: Anchor): number => {
  const module = getModule();
  const urlPtr = writeStringToMemory(anchor.url);
  const hashPtr = writeStringToMemory(anchor.dataHash);
  const anchorPtrPtr = module._malloc(4);

  try {
    const result = module.anchor_from_hash_hex(
      urlPtr,
      anchor.url.length,
      hashPtr,
      anchor.dataHash.length,
      anchorPtrPtr
    );

    assertSuccess(result, 'Failed to create anchor from hash hex');

    return module.getValue(anchorPtrPtr, 'i32');
  } finally {
    module._free(urlPtr);
    module._free(hashPtr);
    module._free(anchorPtrPtr);
  }
};
