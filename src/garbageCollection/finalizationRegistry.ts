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

import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/**
 * A FinalizationRegistry instance for managing the cleanup of native WASM resources.
 *
 * This registry automatically invokes the provided `freeFunc` to release native resources
 * associated with a given `ptr` when the corresponding JavaScript object is garbage collected.
 *
 * It ensures that the memory allocated in the WASM module is properly released to prevent memory leaks.
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const finalizationRegistry = new FinalizationRegistry(({ ptr, freeFunc }: { ptr: any; freeFunc: any }) => {
  const module = getModule();
  if (ptr && freeFunc) {
    const ptrPtr = module._malloc(4);
    module.setValue(ptrPtr, ptr, 'i32');
    freeFunc(ptrPtr);
    module._free(ptrPtr);
  }
});

export { finalizationRegistry };
