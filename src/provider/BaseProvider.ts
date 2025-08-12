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

import { ProtocolParameters, Redeemer, TxIn, UTxO } from '../common';
import { assertSuccess, unrefObject, utf8ByteLen, writeStringToMemory } from '../marshaling';
import { getModule } from '../module';
import { registerInstance, unregisterInstance } from '../instanceRegistry';

/* DEFINITIONS ****************************************************************/

/**
 * A global counter for assigning unique IDs to provider instances.
 */
let nextId = 0;

/**
 * A FinalizationRegistry to clean up provider instances when they are no longer needed.
 */
const finalizationRegistry = new FinalizationRegistry(({ ptr, objectId }: { ptr: any; objectId: number }) => {
  unregisterInstance(objectId);
  if (ptr) {
    unrefObject(ptr);
  }
});

/**
 * Creates an Emscripten provider instance.
 *
 * @param networkMagic the network magic number.
 * @param name the human-readable name of the provider.
 * @param objectId a unique identifier for the provider instance.
 */
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

/**
 * Base class for all provider implementations. This class provides the
 * required integration with the WASM module and manages the lifecycle of
 * provider instances.
 */
export abstract class BaseProvider {
  readonly objectId: number;
  readonly providerPtr: number;

  /**
   * Creates a new BaseProvider instance.
   * @param networkMagic the network magic number.
   * @param humanName the human-readable name of the provider.
   * @protected
   */
  protected constructor(networkMagic: number, humanName: string) {
    this.objectId = nextId++;

    registerInstance(this.objectId, this);
    this.providerPtr = createEmscriptenProvider(networkMagic, humanName, this.objectId);

    if (!this.providerPtr) throw new Error('create_emscripten_provider failed');

    finalizationRegistry.register(this, {
      objectId: this.objectId,
      ptr: this.providerPtr
    });
  }

  /**
   * Get the current staking rewards balance for a reward account.
   *
   * @param rewardAccount - Stake/reward account identifier.
   * @returns Promise that resolves to the balance in lovelace as a bigint.
   */
  abstract getRewardsBalance(rewardAccount: string): Promise<bigint>;

  /**
   * Fetch the current protocol parameters the node/network.
   *
   * @returns Promise that resolves to the network ProtocolParameters.
   */
  abstract getParameters(): Promise<ProtocolParameters>;

  /**
   * List all unspent transaction outputs (UTxOs) controlled by an address.
   *
   * @param address - Payment address.
   * @returns Promise that resolves to an array of UTxOs for the address (empty if none).
   */
  abstract getUnspentOutputs(address: string): Promise<UTxO[]>;

  /**
   * List all unspent transaction outputs (UTxOs) for an address that contain a specific asset.
   *
   * @param address - Payment address.
   * @param assetId - Asset identifier (policyId + asset name in hex).
   * @returns Promise that resolves to matching UTxOs (empty if none).
   */
  abstract getUnspentOutputsWithAsset(address: string, assetId: string): Promise<UTxO[]>;

  /**
   * Find the (single) UTxO that holds a given NFT.
   *
   * @param assetId - NFT asset identifier (policyId + asset name in hex).
   * @returns Promise that resolves to the UTxO containing the NFT.
   */
  abstract getUnspentOutputByNft(assetId: string): Promise<UTxO>;

  /**
   * Resolve concrete UTxOs referenced by a list of transaction inputs.
   *
   * @param txIns - Inputs (transaction id and index) to resolve.
   * @returns Promise that resolves to an array of UTxOs.
   */
  abstract resolveUnspentOutputs(txIns: TxIn[]): Promise<UTxO[]>;

  /**
   * Fetch an on-chain datum by its hash.
   *
   * @param datumHash - Hash of the datum to resolve.
   * @returns Promise that resolves to the datum payload as a string (encoding in hex-encoded CBOR).
   */
  abstract resolveDatum(datumHash: string): Promise<string>;

  /**
   * Wait until a transaction is observed on-chain or a timeout elapses.
   *
   * @param txId - Transaction id (hash) to confirm.
   * @param timeout - Optional timeout in milliseconds. If omitted, an implementation default is used.
   * @returns Promise that resolves to `true` if confirmed before timeout, otherwise `false`.
   */
  abstract confirmTransaction(txId: string, timeout?: number): Promise<boolean>;

  /**
   * Submit a signed transaction to the network.
   *
   * @param tx - Transaction payload as a string (hex-encoded CBOR).
   * @returns Promise that resolves to the submitted transaction id (hash).
   */
  abstract submitTransaction(tx: string): Promise<string>;

  /**
   * Run transaction evaluation to obtain script redeemers / execution units.
   *
   * @param tx - Transaction payload to evaluate (commonly hex-encoded CBOR).
   * @param additionalUtxos - Optional extra UTxOs the evaluator may consider for inputs/collateral.
   * @returns Promise that resolves to a list of redeemers (with costs/ex-units) for the transaction.
   */
  abstract evaluateTransaction(tx: string, additionalUtxos?: UTxO[]): Promise<Redeemer[]>;
}
