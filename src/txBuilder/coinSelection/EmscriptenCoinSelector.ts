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

/* IMPORTS ********************************************************************/

import { CoinSelector, CoinSelectorParams, CoinSelectorResult } from './CoinSelector';
import { InstanceType, registerInstance, unregisterInstance } from '../../instanceRegistry';
import { assertSuccess, unrefObject, utf8ByteLen, writeStringToMemory } from '../../marshaling';
import { asyncifyStateTracker } from '../../cometa';
import { getModule } from '../../module';

/* DEFINITIONS ****************************************************************/

/**
 * A global counter for assigning unique IDs to coinSelector instances.
 */
let nextId = 0;

/**
 * A FinalizationRegistry to clean up coinSelector instances when they are no longer needed.
 */
const finalizationRegistry = new FinalizationRegistry(({ ptr, objectId }: { ptr: any; objectId: number }) => {
  unregisterInstance(InstanceType.CoinSelector, objectId);
  if (ptr) {
    unrefObject(ptr);
  }
});

/**
 * Creates an Emscripten coinSelector instance.
 *
 * @param name the human-readable name of the coinSelector.
 * @param objectId a unique identifier for the coinSelector instance.
 */
const createEmscriptenCoinSelector = (name: string, objectId: number): number => {
  const m = getModule();
  const namePtr = writeStringToMemory(name);
  const nameSize = utf8ByteLen(name);

  const coinSelectorPtrPtr = m._malloc(4);

  try {
    const rc = m._create_emscripten_coin_selector(namePtr, nameSize, objectId, coinSelectorPtrPtr);

    assertSuccess(rc, 'create_emscripten_coin_selector failed');

    return m.getValue(coinSelectorPtrPtr, 'i32');
  } finally {
    m._free(namePtr);
    m._free(coinSelectorPtrPtr);
  }
};

/**
 * An adapter class that makes a JavaScript CoinSelector implementation callable
 * from the WASM C-layer. It creates and manages the lifecycle of a native
 * proxy object.
 */
export class EmscriptenCoinSelector implements CoinSelector {
  readonly objectId: number;
  readonly coinSelectorPtr: number;
  readonly coinSelector: CoinSelector;

  /**
   * Wraps a JavaScript CoinSelector to make it usable by the WASM module.
   * @param coinSelector The JavaScript coin selector implementation to wrap.
   */
  public constructor(coinSelector: CoinSelector) {
    this.objectId = nextId++;
    this.coinSelector = coinSelector;

    registerInstance(InstanceType.CoinSelector, this.objectId, this);
    this.coinSelectorPtr = createEmscriptenCoinSelector(coinSelector.getName(), this.objectId);

    if (!this.coinSelectorPtr) throw new Error('create_emscripten_coinSelector failed');

    finalizationRegistry.register(this, {
      objectId: this.objectId,
      ptr: this.coinSelectorPtr
    });
  }

  /**
   * Gets the human-readable name of the coin selection strategy.
   * @returns {string} The name of the selector.
   */
  getName(): string {
    return this.coinSelector.getName();
  }

  /**
   * Performs the coin selection algorithm.
   *
   * @param {CoinSelectorParams} params - The input parameters for the selection.
   * @returns {Promise<CoinSelectorResult>} A promise that resolves to the result of the selection.
   */
  async select(params: CoinSelectorParams): Promise<CoinSelectorResult> {
    asyncifyStateTracker.isAsyncActive = true;

    try {
      return await this.coinSelector.select(params);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }
}
