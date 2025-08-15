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

/* IMPORTS ********************************************************************/

import { InstanceType, registerInstance, unregisterInstance } from '../../instanceRegistry';
import { Redeemer, UTxO } from '../../common';
import { TxEvaluator } from './TxEvaluator';
import { assertSuccess, unrefObject, utf8ByteLen, writeStringToMemory } from '../../marshaling';
import { asyncifyStateTracker } from '../../cometa';
import { getModule } from '../../module';

/* DEFINITIONS ****************************************************************/

/**
 * A global counter for assigning unique IDs to TxEvaluator instances.
 * @private
 */
let nextId = 0;

/**
 * A FinalizationRegistry to clean up TxEvaluator instances when they are no longer needed.
 * @private
 */
const finalizationRegistry = new FinalizationRegistry(({ ptr, objectId }: { ptr: any; objectId: number }) => {
  unregisterInstance(InstanceType.TxEvaluator, objectId);
  if (ptr) {
    unrefObject(ptr);
  }
});

/**
 * Creates an Emscripten TxEvaluator proxy instance in WASM memory. This native
 * object holds the objectId, allowing the C-layer to call back into the correct
 * JavaScript instance.
 * @private
 *
 * @param name the human-readable name of the txEvaluator.
 * @param {number} objectId A unique identifier for the TxEvaluator JS instance.
 * @returns {number} A pointer to the native proxy object.
 */
const createEmscriptenTxEvaluator = (name: string, objectId: number): number => {
  const m = getModule();
  const txEvaluatorPtrPtr = m._malloc(4);
  const namePtr = writeStringToMemory(name);
  const nameSize = utf8ByteLen(name);

  try {
    const rc = m._create_emscripten_tx_evaluator(namePtr, nameSize, objectId, txEvaluatorPtrPtr);
    assertSuccess(rc, 'create_emscripten_tx_evaluator failed');
    return m.getValue(txEvaluatorPtrPtr, 'i32');
  } finally {
    m._free(txEvaluatorPtrPtr);
  }
};

/**
 * An adapter class that makes a JavaScript TxEvaluator implementation callable
 * from the WASM C-layer. It creates and manages the lifecycle of a native
 * proxy object that forwards calls to this JavaScript instance.
 */
export class EmscriptenTxEvaluator implements TxEvaluator {
  readonly objectId: number;
  readonly txEvaluatorPtr: number;
  private readonly txEvaluator: TxEvaluator;

  /**
   * Wraps a JavaScript TxEvaluator to make it usable by the WASM module.
   *
   * @param {TxEvaluator} txEvaluator The JavaScript TxEvaluator implementation to wrap.
   */
  public constructor(txEvaluator: TxEvaluator) {
    this.objectId = nextId++;
    this.txEvaluator = txEvaluator;

    registerInstance(InstanceType.TxEvaluator, this.objectId, this);
    this.txEvaluatorPtr = createEmscriptenTxEvaluator(txEvaluator.getName(), this.objectId);

    if (!this.txEvaluatorPtr) {
      throw new Error('create_emscripten_tx_evaluator failed');
    }

    finalizationRegistry.register(this, {
      objectId: this.objectId,
      ptr: this.txEvaluatorPtr
    });
  }

  /**
   * Gets the human-readable name of the transaction selector strategy.
   * @returns {string} The name of the selector.
   */
  getName(): string {
    return this.txEvaluator.getName();
  }

  /**
   * Runs transaction evaluation to obtain script execution units.
   * This method delegates the call to the wrapped JavaScript TxEvaluator instance.
   *
   * @param {string} tx - Transaction payload to evaluate (hex-encoded CBOR).
   * @param {UTxO[]} [additionalUtxos] - Optional extra UTxOs for the evaluator to consider.
   * @returns {Promise<Redeemer[]>} A promise that resolves to a list of redeemers with execution units.
   */
  public async evaluate(tx: string, additionalUtxos?: UTxO[]): Promise<Redeemer[]> {
    asyncifyStateTracker.isAsyncActive = true;

    try {
      return await this.txEvaluator.evaluate(tx, additionalUtxos);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }
}
