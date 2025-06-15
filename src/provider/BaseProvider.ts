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

import { ProtocolParameters, Redeemer, TransactionInput, UTxO } from '../common';
import { assertSuccess, unrefObject, utf8ByteLen, writeStringToMemory } from '../marshaling';
import { finalizationRegistry } from '../garbageCollection';
import { getModule } from '../module';
import { registerInstance, unregisterInstance } from '../instanceRegistry';

let nextId = 0;

const createEmscriptenProvider = (networkMagic: number, name: string, objectId: number): number => {
  const m = getModule();
  const namePtr = writeStringToMemory(name);
  const nameSize = utf8ByteLen(name);

  const providerPtrPtr = m._malloc(4);

  try {
    const rc = m._create_emscripten_provider(networkMagic, namePtr, nameSize, objectId, providerPtrPtr);

    assertSuccess(rc, 'create_emscripten_provider failed');

    return m.getValue(providerPtrPtr, 'i32');
  } finally {
    m._free(namePtr);
    m._free(providerPtrPtr);
  }
};

/* --------------- Abstract base provider -------------------- */
export abstract class BaseProvider {
  readonly objectId: number;
  readonly providerPtr: number;

  protected constructor(networkMagic: number, humanName: string) {
    this.objectId = nextId++;

    registerInstance(this.objectId, this);
    this.providerPtr = createEmscriptenProvider(networkMagic, humanName, this.objectId);

    if (!this.providerPtr) throw new Error('create_emscripten_provider failed');

    finalizationRegistry.register(this, {
      freeFunc: ({ objectId, ptr }: { objectId: number; ptr: number }) => {
        if (ptr) {
          unrefObject(ptr);
        }
        unregisterInstance(objectId);
      },
      ptr: { objectId: this.objectId, ptr: this.providerPtr }
    });
  }

  /* ------- methods subclasses should override -------------- */
  abstract getParameters(): Promise<ProtocolParameters>;
  abstract getUnspentOutputs(address: string): Promise<UTxO[]>;
  abstract getUnspentOutputsWithAsset(address: string, assetId: string): Promise<UTxO[]>;
  abstract getUnspentOutputByNFT(assetId: string): Promise<UTxO>;
  abstract resolveUnspentOutputs(txIns: TransactionInput[]): Promise<UTxO[]>;
  abstract resolveDatum(datumHash: string): Promise<string>;
  abstract awaitTransactionConfirmation(txId: string, timeout?: number): Promise<boolean>;
  abstract postTransactionToChain(tx: string): Promise<string>;
  abstract evaluateTransaction(tx: string, additionalUtxos?: UTxO[]): Promise<Redeemer[]>;
}
