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

import { InstanceType, registerInstance, unregisterInstance } from '../instanceRegistry';
import { NetworkMagic, ProtocolParameters, Redeemer, TxIn, UTxO } from '../common';
import { Provider } from './Provider';
import { assertSuccess, unrefObject, utf8ByteLen, writeStringToMemory } from '../marshaling';
import { asyncifyStateTracker } from '../cometa';
import { getModule } from '../module';
import { Address, RewardAddress } from '../address';

/* DEFINITIONS ****************************************************************/

/**
 * A global counter for assigning unique IDs to provider instances.
 * @private
 */
let nextId = 0;

/**
 * A FinalizationRegistry to clean up provider instances when they are no longer needed.
 * @private
 */
const finalizationRegistry = new FinalizationRegistry(({ ptr, objectId }: { ptr: any; objectId: number }) => {
  unregisterInstance(InstanceType.Provider, objectId);
  if (ptr) {
    unrefObject(ptr);
  }
});

/**
 * Creates an Emscripten provider proxy instance in WASM memory. This native
 * object holds the objectId, allowing the C-layer to call back into the correct
 * JavaScript instance.
 * @private
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
 * An adapter class that makes a JavaScript Provider implementation callable
 * from the WASM C-layer. It creates and manages the lifecycle of a native
 * proxy object that forwards calls to the wrapped JavaScript instance.
 */
export class EmscriptenProvider implements Provider {
  readonly objectId: number;
  readonly providerPtr: number;
  private readonly provider: Provider;

  /**
   * Wraps a JavaScript Provider to make it usable by the WASM module.
   *
   * @param {Provider} provider The JavaScript Provider implementation to wrap.
   */
  public constructor(provider: Provider) {
    this.objectId = nextId++;
    this.provider = provider;

    registerInstance(InstanceType.Provider, this.objectId, this);
    this.providerPtr = createEmscriptenProvider(provider.getNetworkMagic(), provider.getName(), this.objectId);

    if (!this.providerPtr) {
      throw new Error('create_emscripten_provider failed');
    }

    finalizationRegistry.register(this, {
      objectId: this.objectId,
      ptr: this.providerPtr
    });
  }

  /**
   * Gets the human-readable name of the provider (e.g., "Blockfrost").
   * @returns {string} The name of the provider.
   */
  public getName(): string {
    return this.provider.getName();
  }

  /**
   * Gets the network magic/ID for the provider.
   * @returns {NetworkMagic} The network identifier.
   */
  public getNetworkMagic(): NetworkMagic {
    return this.provider.getNetworkMagic();
  }

  /**
   * Get the current staking rewards balance for a reward account.
   *
   * @param {RewardAddress | string} rewardAccount - Reward account address or bech32 string.
   * @returns {Promise<bigint>} A promise that resolves to the balance in lovelace.
   */
  public async getRewardsBalance(rewardAccount: RewardAddress | string): Promise<bigint> {
    try {
      return this.provider.getRewardsBalance(rewardAccount);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * Fetch the current protocol parameters for the network.
   *
   * @returns {Promise<ProtocolParameters>} A promise that resolves to the protocol parameters.
   */
  public async getParameters(): Promise<ProtocolParameters> {
    try {
      return this.provider.getParameters();
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * List all unspent transaction outputs (UTxOs) controlled by an address.
   *
   * @param {Address | string} address - Payment address. Address object or bech32 string.
   * @returns {Promise<UTxO[]>} A promise that resolves to an array of UTxOs.
   */
  public async getUnspentOutputs(address: Address | string): Promise<UTxO[]> {
    try {
      return this.provider.getUnspentOutputs(address);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * List all UTxOs for an address that contain a specific asset.
   *
   * @param {Address | string} address - Payment address. Address object or bech32 string.
   * @param {string} assetId - Asset identifier (policyId + asset name hex).
   * @returns {Promise<UTxO[]>} A promise that resolves to matching UTxOs.
   */
  public async getUnspentOutputsWithAsset(address: Address | string, assetId: string): Promise<UTxO[]> {
    try {
      return this.provider.getUnspentOutputsWithAsset(address, assetId);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * Find the single UTxO that holds a given NFT.
   *
   * @param {string} assetId - NFT asset identifier.
   * @returns {Promise<UTxO>} A promise that resolves to the UTxO containing the NFT.
   */
  public async getUnspentOutputByNft(assetId: string): Promise<UTxO> {
    try {
      return await this.provider.getUnspentOutputByNft(assetId);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * Resolve concrete UTxOs for a list of transaction inputs.
   *
   * @param {TxIn[]} txIns - Inputs to resolve.
   * @returns {Promise<UTxO[]>} A promise that resolves to an array of UTxOs.
   */
  public async resolveUnspentOutputs(txIns: TxIn[]): Promise<UTxO[]> {
    asyncifyStateTracker.isAsyncActive = true;

    try {
      return await this.provider.resolveUnspentOutputs(txIns);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * Fetch an on-chain datum by its hash.
   *
   * @param {string} datumHash - Hash of the datum.
   * @returns {Promise<string>} A promise that resolves to the datum payload (hex-encoded CBOR).
   */
  public async resolveDatum(datumHash: string): Promise<string> {
    asyncifyStateTracker.isAsyncActive = true;

    try {
      return await this.provider.resolveDatum(datumHash);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * Wait for a transaction to be confirmed on-chain.
   *
   * @param {string} txId - Transaction id to confirm.
   * @param {number} [timeout] - Optional timeout in milliseconds.
   * @returns {Promise<boolean>} A promise that resolves to true if confirmed, otherwise false.
   */
  public async confirmTransaction(txId: string, timeout?: number): Promise<boolean> {
    asyncifyStateTracker.isAsyncActive = true;

    try {
      return await this.provider.confirmTransaction(txId, timeout);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * Submit a signed transaction to the network.
   *
   * @param {string} tx - Transaction payload (hex-encoded CBOR).
   * @returns {Promise<string>} A promise that resolves to the submitted transaction id.
   */
  public async submitTransaction(tx: string): Promise<string> {
    asyncifyStateTracker.isAsyncActive = true;

    try {
      return await this.provider.submitTransaction(tx);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }

  /**
   * Evaluate a transaction to get its execution costs.
   *
   * @param {string} tx - Transaction payload to evaluate.
   * @param {UTxO[]} [additionalUtxos] - Optional extra UTxOs to consider.
   * @returns {Promise<Redeemer[]>} A promise that resolves to a list of redeemers with execution units.
   */
  public async evaluateTransaction(tx: string, additionalUtxos?: UTxO[]): Promise<Redeemer[]> {
    asyncifyStateTracker.isAsyncActive = true;

    try {
      return await this.provider.evaluateTransaction(tx, additionalUtxos);
    } finally {
      asyncifyStateTracker.isAsyncActive = false;
    }
  }
}
