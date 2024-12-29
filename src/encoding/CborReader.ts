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

import { finalizationRegistry } from '../garbageCollection/finalizationRegistry';
import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

// TODO
export class CborReader {
  public ptr: number;

  constructor(data: Uint8Array) {
    const dataPtr = getModule()._malloc(data.length);
    try {
      getModule().HEAPU8.set(data, dataPtr);
      this.ptr = getModule().cbor_reader_new(dataPtr, data.length);
      if (!this.ptr) {
        throw new Error('Failed to create CborReader.');
      }
    } finally {
      getModule()._free(dataPtr);
    }

    finalizationRegistry.register(this, {
      freeFunc: getModule().cbor_reader_unref,
      ptr: this.ptr
    });
  }

  unref(): void {
    if (this.ptr !== 0) {
      const ptrPtr = getModule()._malloc(4);

      getModule().setValue(ptrPtr, this.ptr, 'i32');
      getModule().cbor_reader_unref(ptrPtr);

      this.ptr = getModule().HEAP32[ptrPtr >> 2];
      getModule()._free(ptrPtr);
    }
  }

  finalize(): void {
    this.unref();
  }
}
